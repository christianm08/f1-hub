/* ============================================================================
 * OpenF1 smart refresh — provider seam + useRaceCenterSession hook.
 * ----------------------------------------------------------------------------
 * ARCHITECTURE
 *   The UI never touches the raw OpenF1 client directly. It talks to a
 *   LiveDataProvider through this hook:
 *
 *     UI -> useRaceCenterSession -> LiveDataProvider -> openf1.ts -> api.openf1.org
 *
 *   LiveDataProvider is an interface. RestPollingProvider (below) implements
 *   it with REST polling and works on the FREE plan for REPLAY of completed
 *   sessions (2023+). A future MqttProvider (paid plan realtime) can be
 *   plugged in without touching the UI or this hook.
 *
 * LIVE HONESTY (free plan)
 *   The free plan serves NO data inside the live window
 *   [start - 30min, end + 30min]. When a session is live and polls keep
 *   returning 404/empty, the provider is marked liveCapable = false and the
 *   hook enters the `needsSubscription` state — the UI must show the honest
 *   message, never simulated data. LIVE_REQUIRES_PAID documents this.
 *
 * CHANNEL PLAN (per-minute request budget, hard cap 25/min via token bucket)
 *   Standard live profile:
 *     position 8s (7.5) + intervals 12s (5) + race_control 20s (3) +
 *     pits 30s (2) + stints 30s (2) + weather 120s (0.5) +
 *     session_result 120s (0.5) + team_radio 120s (0.5) + laps 60s (1) +
 *     overtakes 120s (0.5)  = ~22.5 req/min
 *   Map profile (enableLocation): location 12s (5); tower cadences trimmed
 *     (position 12s, intervals 20s, race_control 30s, pits/stints 60s,
 *     weather/session_result/team_radio/overtakes 180s, laps 120s) = ~19/min.
 *   Telemetry profile (enableTelemetry): car_data 3s (20) + position 20s (3)
 *     + race_control 60s (1) = 24/min; other channels paused.
 *   Live position/intervals/race_control/location/car_data polls use
 *   date>= delta windows so each poll downloads only new rows (intervals
 *   produce ~793 rows/driver/race; position is event-driven and sparse).
 *   Replay (completed sessions): one full load + at most 2 revalidation
 *   passes at 60 s (catches late backfills), then polling stops.
 *
 * BEHAVIOUR
 *   - Differential updates: rows are merged by (driver_number, date); the
 *     timing tower is rebuilt per cycle but setState only fires when a row
 *     actually changed (shallow per-row compare).
 *   - Obsolete requests are aborted every cycle (AbortController).
 *   - Errors back off 5s -> 10s -> 20s -> max 60s; after 5 consecutive
 *     errors the hook enters `error` with the last good data kept and
 *     flagged `stale`; refresh() retries manually.
 *   - Tab hidden (visibilitychange) pauses all polling; resume re-polls.
 * ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type FetchOpts } from "./client";
import {
  findSessionByName,
  openf1,
  sessionState,
  type OFCarData,
  type OFDriver,
  type OFInterval,
  type OFLap,
  type OFLocation,
  type OFOvertake,
  type OFPit,
  type OFPosition,
  type OFRaceControl,
  type OFSession,
  type OFSessionResult,
  type OFStartingGrid,
  type OFStint,
  type OFTeamRadio,
  type OFWeather,
} from "./openf1";
import {
  buildDataQuality,
  buildDriverEntries,
  buildLapEntries,
  buildPitsView,
  buildRaceControlTimeline,
  buildStintsView,
  buildTimingRows,
  deriveTrackStatus,
  toCarDataPoints,
  toLocationPoints,
  toOvertakeEvents,
  toSessionInfo,
  toSessionResultRows,
  toStartingGridRows,
  toTeamRadioItems,
  toWeatherPoints,
  type DataQuality,
  type DriverAliasMap,
  type DriverEntry,
  type LapEntry,
  type LocationPoint,
  type OvertakeEvent,
  type PitView,
  type RaceControlEvent,
  type SessionInfo,
  type SessionResultRow,
  type StartingGridRow,
  type StintView,
  type TeamRadioItem,
  type TimingRow,
  type TrackStatus,
  type WeatherPoint,
} from "./openf1model";

/* ------------------------------------------------------------ constants --- */

/** The free plan has no live timing: live data requires the paid plan. */
export const LIVE_REQUIRES_PAID = true;
export const LIVE_SUBSCRIPTION_MESSAGE_IT =
  "I dati live OpenF1 richiedono l'abbonamento ($11.58/mese). Puoi rigiocare qualsiasi sessione completata dal 2023.";
export const LIVE_SUBSCRIPTION_MESSAGE_EN =
  "OpenF1 live data requires a subscription ($11.58/mo). You can replay any completed session from 2023 onward.";

/* ------------------------------------------------------------- provider --- */

export interface SessionBundle {
  session: OFSession;
  drivers: OFDriver[];
  positions: OFPosition[];
  intervals: OFInterval[];
  laps: OFLap[];
  stints: OFStint[];
  pits: OFPit[];
  raceControl: OFRaceControl[];
  weather: OFWeather[];
  teamRadio: OFTeamRadio[];
  location: OFLocation[];
  sessionResult: OFSessionResult[];
  startingGrid: OFStartingGrid[];
  carData: OFCarData[];
  overtakes: OFOvertake[];
}

export type ChannelName =
  | "position"
  | "intervals"
  | "raceControl"
  | "pits"
  | "stints"
  | "weather"
  | "sessionResult"
  | "teamRadio"
  | "laps"
  | "location"
  | "carData"
  | "overtakes";

/**
 * Seam for live data. RestPollingProvider = free-plan REST polling (replay +
 * best-effort live). A future paid-plan MqttProvider implements this same
 * interface — the hook and UI stay untouched.
 */
export interface LiveDataProvider {
  readonly name: string;
  /** Set false at runtime when live data is repeatedly unavailable. */
  liveCapable: boolean;
  /** Full load for replay / completed sessions. */
  loadReplayBundle(sessionKey: number, signal?: AbortSignal): Promise<SessionBundle>;
  /** Lightweight initial load when a session is (maybe) live. */
  loadLiveInitial(sessionKey: number, signal?: AbortSignal): Promise<Partial<SessionBundle>>;
  /** Delta poll of the due channels; `sinceIso` bounds date>= windows. */
  pollChannels(
    sessionKey: number,
    channels: ChannelName[],
    sinceIso: string,
    signal?: AbortSignal,
  ): Promise<Partial<SessionBundle>>;
}

const has = (channels: ChannelName[], name: ChannelName) => channels.includes(name);

export class RestPollingProvider implements LiveDataProvider {
  readonly name = "rest-polling";
  liveCapable = true;
  /**
   * Minutes of per-driver location to load for completed sessions (0 = off).
   * The location endpoint rejects unbounded multi-driver queries
   * ("Failed to retrieve information… too much data"), so replay location
   * is always fetched per-driver inside a bounded window near session end.
   * Set from UseRaceCenterOptions.locationWindowMin by the hook.
   */
  locationWindowMin = 0;

  private async resolveStartingGrid(session: OFSession, o?: FetchOpts): Promise<OFStartingGrid[]> {
    const quali = await findSessionByName(session.meeting_key, "Qualifying", o).catch(() => null);
    if (!quali) return [];
    return openf1.startingGrid(quali.session_key, o);
  }

  /** Per-driver location inside [end-32min, end-8min]: cars are on track there
   * (date_end is the scheduled end; the real finish is often earlier, so we
   * avoid the parked-cars tail while staying inside the action). */
  private async loadLocationWindow(
    sessionKey: number,
    session: OFSession,
    drivers: OFDriver[],
    o?: FetchOpts,
  ): Promise<OFLocation[]> {
    const w = this.locationWindowMin;
    if (!w || w <= 0 || drivers.length === 0) return [];
    const endMs = Date.parse(session.date_end);
    if (!Number.isFinite(endMs)) return [];
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 19);
    const from = fmt(endMs - (w + 8) * 60 * 1000);
    const to = fmt(endMs - 8 * 60 * 1000);
    const out: OFLocation[] = [];
    const CONCURRENCY = 4; // stay well under the 25 req/min self-imposed budget
    const nums = drivers.map((d) => d.driver_number);
    for (let i = 0; i < nums.length; i += CONCURRENCY) {
      if (o?.signal?.aborted) break;
      const batch = nums.slice(i, i + CONCURRENCY);
      const res = await Promise.all(
        batch.map((n) =>
          openf1
            .location(sessionKey, { driver_number: n, "date>": from, "date<": to }, o)
            .catch(() => [] as OFLocation[]),
        ),
      );
      for (const r of res) out.push(...r);
    }
    return out;
  }

  async loadReplayBundle(sessionKey: number, signal?: AbortSignal): Promise<SessionBundle> {
    const o: FetchOpts = { signal };
    const sessions = await openf1.sessions({ session_key: sessionKey }, o);
    if (!sessions.length) throw new ApiError("http_404", 404);
    const session = sessions[0];
    const [
      drivers,
      positions,
      intervalsMap,
      laps,
      stints,
      pits,
      raceControl,
      weather,
      teamRadio,
      sessionResult,
      overtakes,
      startingGrid,
    ] = await Promise.all([
      openf1.drivers(sessionKey, o),
      openf1.latestPositions(sessionKey, o),
      openf1.latestIntervals(sessionKey, { ...o, expectHistorical: true }),
      openf1.laps(sessionKey, {}, o),
      openf1.stints(sessionKey, o),
      openf1.pits(sessionKey, o),
      openf1.raceControl(sessionKey, {}, o),
      openf1.weather(sessionKey, o),
      openf1.teamRadio(sessionKey, undefined, o),
      openf1.sessionResult(sessionKey, o),
      openf1.overtakes(sessionKey, {}, o),
      this.resolveStartingGrid(session, o),
    ]);
    // Windowed per-driver location (the unbounded query is rejected by the API).
    const location = await this.loadLocationWindow(sessionKey, session, drivers, o);
    return {
      session,
      drivers,
      positions,
      intervals: [...intervalsMap.values()],
      laps,
      stints,
      pits,
      raceControl,
      weather,
      teamRadio,
      location,
      sessionResult,
      startingGrid,
      carData: [],
      overtakes,
    };
  }

  async loadLiveInitial(sessionKey: number, signal?: AbortSignal): Promise<Partial<SessionBundle>> {
    const o: FetchOpts = { signal };
    const sessions = await openf1.sessions({ session_key: sessionKey }, o);
    if (!sessions.length) throw new ApiError("http_404", 404);
    const session = sessions[0];
    const [drivers, positions, intervalsMap, laps, stints, pits, raceControl, weather, sessionResult, startingGrid] =
      await Promise.all([
        openf1.drivers(sessionKey, o),
        openf1.latestPositions(sessionKey, o),
        openf1.latestIntervals(sessionKey, o),
        openf1.laps(sessionKey, {}, o),
        openf1.stints(sessionKey, o),
        openf1.pits(sessionKey, o),
        openf1.raceControl(sessionKey, {}, o),
        openf1.weather(sessionKey, o),
        openf1.sessionResult(sessionKey, o),
        this.resolveStartingGrid(session, o),
      ]);
    return {
      session,
      drivers,
      positions,
      intervals: [...intervalsMap.values()],
      laps,
      stints,
      pits,
      raceControl,
      weather,
      sessionResult,
      startingGrid,
      teamRadio: [],
      location: [],
      carData: [],
      overtakes: [],
    };
  }

  async pollChannels(
    sessionKey: number,
    channels: ChannelName[],
    sinceIso: string,
    signal?: AbortSignal,
  ): Promise<Partial<SessionBundle>> {
    const live: FetchOpts = { signal, persist: false, fresh: true };
    const cached: FetchOpts = { signal };
    const out: Partial<SessionBundle> = {};
    const jobs: Promise<void>[] = [];
    // Delta-window channels (fresh, unpersisted — URLs are unique per poll).
    if (has(channels, "position"))
      jobs.push(openf1.positions(sessionKey, { "date>": sinceIso }, live).then((r) => void (out.positions = r)));
    if (has(channels, "intervals"))
      jobs.push(openf1.intervals(sessionKey, { "date>": sinceIso }, live).then((r) => void (out.intervals = r)));
    if (has(channels, "raceControl"))
      jobs.push(openf1.raceControl(sessionKey, { "date>": sinceIso }, live).then((r) => void (out.raceControl = r)));
    if (has(channels, "location"))
      jobs.push(openf1.location(sessionKey, { "date>": sinceIso }, live).then((r) => void (out.location = r)));
    if (has(channels, "carData"))
      jobs.push(openf1.carData(sessionKey, { "date>": sinceIso }, live).then((r) => void (out.carData = r)));
    // Small, cache-backed channels (repeated polls within TTL are free).
    if (has(channels, "pits")) jobs.push(openf1.pits(sessionKey, cached).then((r) => void (out.pits = r)));
    if (has(channels, "stints")) jobs.push(openf1.stints(sessionKey, cached).then((r) => void (out.stints = r)));
    if (has(channels, "weather")) jobs.push(openf1.weather(sessionKey, cached).then((r) => void (out.weather = r)));
    if (has(channels, "sessionResult"))
      jobs.push(openf1.sessionResult(sessionKey, cached).then((r) => void (out.sessionResult = r)));
    if (has(channels, "teamRadio"))
      jobs.push(openf1.teamRadio(sessionKey, undefined, cached).then((r) => void (out.teamRadio = r)));
    if (has(channels, "laps")) jobs.push(openf1.laps(sessionKey, {}, cached).then((r) => void (out.laps = r)));
    if (has(channels, "overtakes"))
      jobs.push(openf1.overtakes(sessionKey, {}, cached).then((r) => void (out.overtakes = r)));
    await Promise.all(jobs);
    return out;
  }
}

/* ----------------------------------------------------------------- hook --- */

export type RaceCenterState = "idle" | "loading" | "live" | "ready" | "needsSubscription" | "error";

export interface UseRaceCenterOptions {
  /** Poll car_data ~3.2 Hz (live only; pauses slower channels, see budget). */
  enableTelemetry?: boolean;
  /** Poll location for the track map (live only). */
  enableLocation?: boolean;
  /**
   * Completed sessions: load per-driver location for an N-minute window near
   * the end ([end-(N+8)min, end-8min]). The location endpoint rejects
   * unbounded multi-driver queries, so replay maps are always windowed.
   * 0 = off (default).
   */
  locationWindowMin?: number;
  /** Optional Jolpica-side driver name/acronym overrides. */
  driverAliases?: DriverAliasMap;
}

export interface RaceCenterData {
  info: SessionInfo | null;
  state: RaceCenterState;
  timing: TimingRow[];
  drivers: DriverEntry[];
  raceControl: RaceControlEvent[];
  trackStatus: TrackStatus | null;
  weather: { latest: WeatherPoint | null; series: WeatherPoint[] };
  pits: PitView[];
  stints: StintView[];
  laps: Map<number, LapEntry[]>;
  location: LocationPoint[];
  teamRadio: TeamRadioItem[];
  sessionResult: SessionResultRow[];
  overtakes: OvertakeEvent[];
  startingGrid: StartingGridRow[] | null;
  telemetry: ReturnType<typeof toCarDataPoints>;
  telemetryAvailable: boolean;
  liveCapable: boolean;
  /** true when live data needs the paid plan (state === "needsSubscription") */
  requiresPaid: boolean;
  dataQuality: DataQuality;
  stale: boolean;
  lastUpdated: number | null;
  error: ApiError | null;
  refresh: () => void;
}

interface ChannelDef {
  name: ChannelName;
  intervalMs: number;
  lastRun: number;
}

function channelPlan(enableTelemetry: boolean, enableLocation: boolean): ChannelDef[] {
  const mk = (name: ChannelName, intervalMs: number): ChannelDef => ({ name, intervalMs, lastRun: 0 });
  if (enableTelemetry) {
    // Telemetry profile: car_data dominates the budget; pause the rest.
    return [mk("carData", 3000), mk("position", 20000), mk("raceControl", 60000)];
  }
  const plan = [
    mk("position", 8000),
    mk("intervals", 12000),
    mk("raceControl", 20000),
    mk("pits", 30000),
    mk("stints", 30000),
    mk("weather", 120000),
    mk("sessionResult", 120000),
    mk("teamRadio", 120000),
    mk("laps", 60000),
    mk("overtakes", 120000),
  ];
  if (enableLocation) {
    plan.push(mk("location", 12000));
    // Trim tower cadences to stay under the 25 req/min cap.
    for (const c of plan) {
      if (c.name === "position") c.intervalMs = 12000;
      if (c.name === "intervals") c.intervalMs = 20000;
      if (c.name === "raceControl") c.intervalMs = 30000;
      if (c.name === "pits" || c.name === "stints") c.intervalMs = 60000;
      if (c.name === "weather" || c.name === "sessionResult" || c.name === "teamRadio" || c.name === "overtakes")
        c.intervalMs = 180000;
      if (c.name === "laps") c.intervalMs = 120000;
    }
  }
  return plan;
}

const TICK_MS = 5000;
const MAX_ERRORS = 5;
const EMPTY_STREAK_LIMIT = 5;
const LIVE_GRACE_MS = 2 * 60 * 1000;
const COMPLETED_REVALIDATIONS = 2;
const REVALIDATE_MS = 60 * 1000;
const UPCOMING_RECHECK_MS = 60 * 1000;
const LOCATION_TRIM_MS = 5 * 60 * 1000;

function emptyBundle(session: OFSession): SessionBundle {
  return {
    session,
    drivers: [],
    positions: [],
    intervals: [],
    laps: [],
    stints: [],
    pits: [],
    raceControl: [],
    weather: [],
    teamRadio: [],
    location: [],
    sessionResult: [],
    startingGrid: [],
    carData: [],
    overtakes: [],
  };
}

function emptyDataQuality(): DataQuality {
  return { hasLaps: false, hasLocation: false, hasTelemetry: false, hasWeather: false, hasRadio: false };
}

function maxDate(rows: { date: string }[]): string | null {
  let m: string | null = null;
  for (const r of rows) if (!m || r.date > m) m = r.date;
  return m;
}

function isAbort(e: unknown): boolean {
  return e instanceof ApiError && e.message === "aborted";
}

function timingRowsEqual(a: TimingRow[], b: TimingRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.number !== y.number ||
      x.position !== y.position ||
      x.prevPosition !== y.prevPosition ||
      x.gapToLeader !== y.gapToLeader ||
      x.interval !== y.interval ||
      x.lastLap !== y.lastLap ||
      x.bestLap !== y.bestLap ||
      x.status !== y.status ||
      x.pitCount !== y.pitCount ||
      x.compound !== y.compound ||
      x.tyreAge !== y.tyreAge ||
      x.drsOpen !== y.drsOpen ||
      JSON.stringify(x.sectors) !== JSON.stringify(y.sectors)
    )
      return false;
  }
  return true;
}

/**
 * Race-center data for one OpenF1 session. Replay of completed sessions is
 * fully supported; live polling is best-effort and honest about the paid
 * plan requirement (see `needsSubscription` state).
 */
export function useRaceCenterSession(sessionKey: number | null, options: UseRaceCenterOptions = {}): RaceCenterData {
  const { enableTelemetry = false, enableLocation = false, locationWindowMin = 0, driverAliases } = options;

  const providerRef = useRef<LiveDataProvider | null>(null);
  if (providerRef.current === null) providerRef.current = new RestPollingProvider();
  if (providerRef.current instanceof RestPollingProvider) {
    providerRef.current.locationWindowMin = locationWindowMin;
  }

  const [data, setData] = useState<RaceCenterData>(() => initialData());
  const [nonce, setNonce] = useState(0);

  const bundleRef = useRef<SessionBundle | null>(null);
  const prevTimingRef = useRef<TimingRow[]>([]);
  const channelsRef = useRef<ChannelDef[]>([]);
  const sinceRef = useRef<string>("");
  const errRef = useRef(0);
  const emptyStreakRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const tickTimerRef = useRef<number | null>(null);
  const cycleCtrlRef = useRef<AbortController | null>(null);
  const aliasesRef = useRef(driverAliases);
  aliasesRef.current = driverAliases;

  function initialData(): RaceCenterData {
    return {
      info: null,
      state: sessionKey == null ? "idle" : "loading",
      timing: [],
      drivers: [],
      raceControl: [],
      trackStatus: null,
      weather: { latest: null, series: [] },
      pits: [],
      stints: [],
      laps: new Map(),
      location: [],
      teamRadio: [],
      sessionResult: [],
      overtakes: [],
      startingGrid: null,
      telemetry: [],
      telemetryAvailable: false,
      liveCapable: true,
      requiresPaid: false,
      dataQuality: emptyDataQuality(),
      stale: false,
      lastUpdated: null,
      error: null,
      refresh: () => setNonce((n) => n + 1),
    };
  }

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (sessionKey == null) {
      setData({ ...initialData(), refresh });
      return;
    }
    const provider = providerRef.current!;
    let cancelled = false;
    const ctrl = new AbortController();
    const timers: number[] = [];
    timersRef.current = timers;
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    bundleRef.current = null;
    prevTimingRef.current = [];
    errRef.current = 0;
    emptyStreakRef.current = 0;
    pauseUntilRef.current = 0;
    provider.liveCapable = true;
    setData({ ...initialData(), refresh });

    const clearTickers = () => {
      if (tickTimerRef.current !== null) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      cycleCtrlRef.current?.abort();
      cycleCtrlRef.current = null;
    };

    /** Rebuild the view model from the merged bundle; publish only on change. */
    const publish = () => {
      const bundle = bundleRef.current;
      if (!bundle || cancelled) return;
      const info = toSessionInfo(bundle.session);
      const intervals = new Map<number, OFInterval>();
      for (const r of bundle.intervals) {
        const cur = intervals.get(r.driver_number);
        if (!cur || r.date > cur.date) intervals.set(r.driver_number, r);
      }
      const drsByDriver = new Map<number, boolean>();
      const carByDriver = new Map<number, OFCarData>();
      for (const c of bundle.carData) {
        const cur = carByDriver.get(c.driver_number);
        if (!cur || c.date > cur.date) carByDriver.set(c.driver_number, c);
      }
      for (const [num, c] of carByDriver) drsByDriver.set(num, c.drs >= 10);
      const prevPositions = new Map(prevTimingRef.current.map((t) => [t.number, t.position]));
      const timing = buildTimingRows({
        drivers: bundle.drivers,
        positions: bundle.positions,
        intervals,
        laps: bundle.laps,
        stints: bundle.stints,
        pits: bundle.pits,
        sessionResults: bundle.sessionResult,
        state: info.state,
        prevPositions,
        drsByDriver,
      });
      const changed = !timingRowsEqual(prevTimingRef.current, timing);
      if (changed) prevTimingRef.current = timing;

      const weatherSeries = toWeatherPoints(bundle.weather);
      const location = toLocationPoints(bundle.location);
      const telemetry = toCarDataPoints(bundle.carData);
      const raceControl = buildRaceControlTimeline(bundle.raceControl);
      setData((d) => ({
        ...d,
        info,
        timing: changed ? timing : d.timing,
        drivers: buildDriverEntries(bundle.drivers, aliasesRef.current),
        raceControl,
        trackStatus: deriveTrackStatus(bundle.raceControl),
        weather: { latest: weatherSeries.length ? weatherSeries[weatherSeries.length - 1] : null, series: weatherSeries },
        pits: buildPitsView(bundle.pits, bundle.stints),
        stints: buildStintsView(bundle.stints),
        laps: buildLapEntries(bundle.laps),
        location,
        teamRadio: toTeamRadioItems(bundle.teamRadio),
        sessionResult: toSessionResultRows(bundle.sessionResult),
        overtakes: toOvertakeEvents(bundle.overtakes),
        startingGrid: bundle.startingGrid.length ? toStartingGridRows(bundle.startingGrid) : null,
        telemetry,
        telemetryAvailable: telemetry.length > 0 && info.isLive,
        liveCapable: provider.liveCapable,
        dataQuality: buildDataQuality({
          laps: bundle.laps,
          location: bundle.location,
          carData: bundle.carData,
          weather: bundle.weather,
          teamRadio: bundle.teamRadio,
        }),
        stale: d.stale,
        lastUpdated: Date.now(),
        error: null,
      }));
    };

    /** Merge a partial poll into the bundle; returns new-row counts. */
    const merge = (partial: Partial<SessionBundle>): { newPositions: number; newIntervals: number } => {
      const b = bundleRef.current!;
      let newPositions = 0;
      let newIntervals = 0;
      const mergeLatest = <T extends { date: string; driver_number: number }>(base: T[], incoming: T[]): T[] => {
        const map = new Map<number, T>();
        for (const r of base) map.set(r.driver_number, r);
        for (const r of incoming) {
          const cur = map.get(r.driver_number);
          if (!cur || r.date > cur.date) map.set(r.driver_number, r);
        }
        return [...map.values()];
      };
      const appendNew = <T>(base: T[], incoming: T[], key: (r: T) => string): T[] => {
        const seen = new Set(base.map(key));
        const freshRows = incoming.filter((r) => {
          const k = key(r);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return [...base, ...freshRows];
      };
      if (partial.positions) {
        const before = new Map(b.positions.map((p) => [p.driver_number, p.date]));
        b.positions = mergeLatest(b.positions, partial.positions);
        newPositions = partial.positions.filter((p) => (before.get(p.driver_number) ?? "") < p.date).length;
      }
      if (partial.intervals) {
        const before = new Map(b.intervals.map((p) => [p.driver_number, p.date]));
        b.intervals = mergeLatest(b.intervals, partial.intervals);
        newIntervals = partial.intervals.filter((p) => (before.get(p.driver_number) ?? "") < p.date).length;
      }
      if (partial.raceControl)
        b.raceControl = appendNew(b.raceControl, partial.raceControl, (r) => `${r.driver_number ?? "-"}|${r.date}`);
      if (partial.weather) b.weather = appendNew(b.weather, partial.weather, (r) => r.date);
      if (partial.teamRadio)
        b.teamRadio = appendNew(b.teamRadio, partial.teamRadio, (r) => `${r.driver_number}|${r.date}`);
      if (partial.laps)
        b.laps = appendNew(b.laps, partial.laps, (r) => `${r.driver_number}|${r.lap_number}|${r.date_start}`);
      if (partial.location) {
        b.location = appendNew(b.location, partial.location, (r) => `${r.driver_number}|${r.date}`);
        const cutoff = new Date(Date.now() - LOCATION_TRIM_MS).toISOString();
        b.location = b.location.filter((l) => l.date >= cutoff);
      }
      if (partial.carData) {
        b.carData = appendNew(b.carData, partial.carData, (r) => `${r.driver_number}|${r.date}`);
        const cutoff = new Date(Date.now() - LOCATION_TRIM_MS).toISOString();
        b.carData = b.carData.filter((c) => c.date >= cutoff);
      }
      if (partial.pits) b.pits = partial.pits;
      if (partial.stints) b.stints = partial.stints;
      if (partial.sessionResult) b.sessionResult = partial.sessionResult;
      if (partial.overtakes) b.overtakes = partial.overtakes;
      // Advance the delta window to the newest row seen on any live channel.
      const newest = maxDate([
        ...b.positions,
        ...b.intervals,
        ...b.raceControl,
        ...b.location,
        ...b.carData,
      ]);
      if (newest && newest > sinceRef.current) sinceRef.current = newest;
      return { newPositions, newIntervals };
    };

    const markError = (e: unknown) => {
      if (cancelled || isAbort(e)) return;
      errRef.current += 1;
      if (errRef.current >= MAX_ERRORS) {
        clearTickers();
        setData((d) => ({
          ...d,
          state: "error",
          stale: true,
          error: e instanceof ApiError ? e : new ApiError(String(e)),
        }));
        return;
      }
      // Exponential backoff: 5s -> 10s -> 20s -> max 60s, then keep polling.
      pauseUntilRef.current = Date.now() + Math.min(5000 * 2 ** (errRef.current - 1), 60000);
      setData((d) => ({ ...d, stale: true }));
    };

    const doTick = async () => {
      if (cancelled || document.hidden) return;
      if (Date.now() < pauseUntilRef.current) return;
      const key = sessionKey;
      const due = channelsRef.current.filter((c) => Date.now() - c.lastRun >= c.intervalMs);
      if (!due.length) return;
      cycleCtrlRef.current?.abort(); // previous cycle's requests are obsolete
      const cycleCtrl = new AbortController();
      cycleCtrlRef.current = cycleCtrl;
      const names = due.map((d) => d.name);
      try {
        const partial = await provider.pollChannels(key, names, sinceRef.current, cycleCtrl.signal);
        if (cancelled) return;
        const now = Date.now();
        for (const d of due) d.lastRun = now;
        errRef.current = 0;
        const { newPositions, newIntervals } = merge(partial);
        const polledTower = names.includes("position") || names.includes("intervals");
        if (polledTower && newPositions === 0 && newIntervals === 0) {
          emptyStreakRef.current += 1;
        } else {
          emptyStreakRef.current = 0;
        }
        // Live honesty: repeated empty polls inside the live window mean the
        // free plan is not serving this session -> needsSubscription.
        const start = new Date(bundleRef.current!.session.date_start).getTime();
        if (emptyStreakRef.current >= EMPTY_STREAK_LIMIT && Date.now() > start + LIVE_GRACE_MS) {
          provider.liveCapable = false;
          clearTickers();
          setData((d) => ({ ...d, state: "needsSubscription", requiresPaid: true, liveCapable: false }));
          publish();
          return;
        }
        publish();
        setData((d) => ({ ...d, state: "live", stale: false }));
      } catch (e) {
        if (!isAbort(e)) markError(e);
      }
    };

    const startTicker = () => {
      if (tickTimerRef.current !== null || cancelled) return;
      tickTimerRef.current = window.setInterval(() => void doTick(), TICK_MS);
      void doTick();
    };

    const beginLive = async () => {
      channelsRef.current = channelPlan(enableTelemetry, enableLocation);
      try {
        const initial = await provider.loadLiveInitial(sessionKey, ctrl.signal);
        if (cancelled || !initial.session) return;
        bundleRef.current = { ...emptyBundle(initial.session), ...initial } as SessionBundle;
        sinceRef.current = initial.session.date_start;
        merge({}); // advance sinceRef to newest row
        publish();
        setData((d) => ({ ...d, state: "live", stale: false }));
        startTicker();
      } catch (e) {
        if (!isAbort(e)) markError(e);
      }
    };

    const beginReplay = async () => {
      try {
        const bundle = await provider.loadReplayBundle(sessionKey, ctrl.signal);
        if (cancelled) return;
        bundleRef.current = bundle;
        publish();
        setData((d) => ({ ...d, state: "ready", stale: false }));
        // Bounded revalidation: static data, catch late backfills, then stop.
        let left = COMPLETED_REVALIDATIONS;
        const revalidate = async () => {
          if (cancelled || left <= 0) return;
          left -= 1;
          try {
            const fresh = await provider.loadReplayBundle(sessionKey, ctrl.signal);
            if (cancelled) return;
            bundleRef.current = fresh;
            publish();
          } catch {
            /* keep last good data */
          }
          if (left > 0) later(REVALIDATE_MS, () => void revalidate());
        };
        later(REVALIDATE_MS, () => void revalidate());
      } catch (e) {
        if (cancelled || isAbort(e)) return;
        setData((d) => ({
          ...d,
          state: "error",
          error: e instanceof ApiError ? e : new ApiError(String(e)),
        }));
      }
    };

    const init = async () => {
      try {
        const sessions = await openf1.sessions({ session_key: sessionKey }, { signal: ctrl.signal });
        if (cancelled) return;
        const session = sessions[0];
        if (!session) {
          setData((d) => ({ ...d, state: "error", error: new ApiError("http_404", 404) }));
          return;
        }
        const lifecycle = sessionState(session);
        if (lifecycle === "live") {
          await beginLive();
        } else if (lifecycle === "completed") {
          await beginReplay();
        } else {
          // upcoming / scheduled: show session info, re-check periodically.
          bundleRef.current = emptyBundle(session);
          const [drivers] = await Promise.all([openf1.drivers(sessionKey, { signal: ctrl.signal }).catch(() => [])]);
          if (cancelled) return;
          bundleRef.current.drivers = drivers;
          publish();
          setData((d) => ({ ...d, state: "ready" }));
          const recheck = () => {
            if (cancelled) return;
            if (sessionState(session) === "live") {
              void beginLive();
            } else {
              later(UPCOMING_RECHECK_MS, recheck);
            }
          };
          later(UPCOMING_RECHECK_MS, recheck);
        }
      } catch (e) {
        if (cancelled || isAbort(e)) return;
        setData((d) => ({
          ...d,
          state: "error",
          error: e instanceof ApiError ? e : new ApiError(String(e)),
        }));
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (tickTimerRef.current !== null) {
          window.clearInterval(tickTimerRef.current);
          tickTimerRef.current = null;
        }
        cycleCtrlRef.current?.abort();
      } else if (!cancelled && bundleRef.current && toSessionInfo(bundleRef.current.session).isLive && provider.liveCapable) {
        // Resume: force channels due so the next tick re-polls immediately.
        for (const c of channelsRef.current) c.lastRun = 0;
        errRef.current = 0;
        pauseUntilRef.current = 0;
        startTicker();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    void init();

    return () => {
      cancelled = true;
      ctrl.abort();
      clearTickers();
      document.removeEventListener("visibilitychange", onVisibility);
      for (const t of timers) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, enableTelemetry, enableLocation, nonce]);

  return { ...data, refresh };
}

/* ============================================================================
 * OpenF1 normalized model — the ONLY contract the UI talks to.
 * ----------------------------------------------------------------------------
 * Raw OpenF1 rows (OF* types in ./openf1) are converted here into stable,
 * UI-friendly view models via PURE builder functions (no fetch, no side
 * effects, fully unit-testable). Missing data is ALWAYS represented as null
 * — never estimated, never simulated.
 *
 * HONESTY RULES
 *   - Fields the API doesn't provide -> null (UI shows "n/d").
 *   - Tyre age for the current stint = tyre_age_at_start + laps done on it.
 *   - Pit in/out status is a heuristic (pit lap >= last completed lap);
 *     documented as such, not presented as ground truth.
 *   - trackStatus comes from deriveTrackStatus() in ./openf1 (message-based
 *     SC/VSC detection — there is no boolean SC field in the API).
 *   - Team radio audio lives on the official F1 CDN; attribution
 *     "Audio: Formula 1 / OpenF1" must be shown by the UI.
 * ========================================================================== */

import {
  deriveTrackStatus,
  normalizeQualiScalar,
  normalizeSessionName,
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
  type SessionLifecycle,
  type TrackStatus,
} from "./openf1";

export type { SessionLifecycle, TrackStatus };
export { deriveTrackStatus };

/* ------------------------------------------------------------------ types */

export interface SessionInfo {
  key: number;
  /** raw session_name from the API */
  name: string;
  /** normalized label: FP1/FP2/FP3/Sprint Quali/Sprint/Qualifying/Race */
  normalizedName: string;
  type: string;
  state: SessionLifecycle;
  meetingName: string;
  circuitName: string;
  countryCode: string;
  year: number;
  startUtc: string;
  endUtc: string;
  isLive: boolean;
}

export interface DriverEntry {
  number: number;
  acronym: string;
  fullName: string;
  teamName: string;
  /** hex WITH leading "#" */
  teamColour: string;
  countryCode: string | null;
  headshotUrl: string | null;
}

/** Optional Jolpica-side overrides merged into driver entries (never required). */
export type DriverAliasMap = Map<number, { fullName?: string; acronym?: string }>;

export type TimingStatus = "running" | "retired" | "finished" | "inpit" | "out";

export interface TimingRow {
  number: number;
  position: number;
  prevPosition: number | null;
  /** gap to leader as returned ("+1.234" | "1 LAP" | null); null for leader */
  gapToLeader: string | null;
  /** gap to the car ahead */
  interval: string | null;
  lastLap: number | null;
  bestLap: number | null;
  sectors: [number | null, number | null, number | null] | null;
  status: TimingStatus;
  pitCount: number;
  compound: string | null;
  tyreAge: number | null;
  /** live only, from car_data (drs >= 10) */
  drsOpen?: boolean;
}

export interface LapEntry {
  lap: number;
  duration: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  isPitOut: boolean;
  isPersonalBest: boolean;
  isSessionBest: boolean;
  /** mini-sector colour codes per sector, when provided by the API */
  segments?: number[][];
}

export interface StintInfo {
  compound: string;
  lapStart: number;
  lapEnd: number | null;
  age: number;
  stintNumber: number;
}

export interface StintView {
  driver: number;
  stints: StintInfo[];
}

export interface PitView {
  driver: number;
  lap: number;
  duration: number | null;
  time: string;
  /** compound before the stop, from the adjacent stint (heuristic) */
  prevCompound: string | null;
  /** compound after the stop, from the adjacent stint (heuristic) */
  newCompound: string | null;
}

export type RcSeverity = "info" | "flag" | "sc" | "penalty" | "incident";

export interface RaceControlEvent {
  time: string;
  category: string;
  flag: string | null;
  message: string;
  driverNumber: number | null;
  severity: RcSeverity;
}

export interface WeatherPoint {
  time: string;
  air: number | null;
  track: number | null;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  windDir: number | null;
  rain: boolean;
}

export interface LocationPoint {
  time: string;
  driver: number;
  x: number;
  y: number;
}

/** Attribution the UI must display next to team radio playback. */
export const TEAM_RADIO_ATTRIBUTION = "Audio: Formula 1 / OpenF1";

export interface TeamRadioItem {
  time: string;
  driver: number;
  url: string;
}

export interface CarDataPoint {
  time: string;
  driver: number;
  speed: number | null;
  rpm: number | null;
  throttle: number | null;
  brake: number | null;
  gear: string | null;
  /** true when the DRS flap is open (raw drs value >= 10) */
  drsOpen: boolean;
}

export interface SessionResultRow {
  position: number | null;
  driverNumber: number;
  numberOfLaps: number;
  /** normalized scalar (qualifying [Q1,Q2,Q3] -> last non-null) */
  gapToLeader: string | number | null;
  /** normalized scalar (qualifying [Q1,Q2,Q3] -> last non-null) */
  duration: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  points: number | null;
}

export interface StartingGridRow {
  position: number;
  driverNumber: number;
  lapTime: number | null;
  interval: string | null;
}

export interface OvertakeEvent {
  time: string;
  lap: number;
  overtakingDriver: number;
  overtakenDriver: number;
  position: number;
}

export interface DataQuality {
  hasLaps: boolean;
  hasLocation: boolean;
  /** true only while live car_data rows are actually flowing */
  hasTelemetry: boolean;
  hasWeather: boolean;
  hasRadio: boolean;
}

/* ---------------------------------------------------------------- builders */

export function toSessionInfo(s: OFSession, now: Date = new Date()): SessionInfo {
  const state = sessionState(s, now);
  return {
    key: s.session_key,
    name: s.session_name,
    normalizedName: normalizeSessionName(s.session_name),
    type: s.session_type,
    state,
    meetingName: s.location,
    circuitName: s.circuit_short_name,
    countryCode: s.country_code,
    year: s.year,
    startUtc: s.date_start,
    endUtc: s.date_end,
    isLive: state === "live",
  };
}

export function buildDriverEntries(drivers: OFDriver[], aliases?: DriverAliasMap): DriverEntry[] {
  return drivers.map((d) => {
    const alias = aliases?.get(d.driver_number);
    const colour = (d.team_colour ?? "").replace(/^#/, "");
    return {
      number: d.driver_number,
      acronym: alias?.acronym ?? d.name_acronym,
      fullName: alias?.fullName ?? d.full_name,
      teamName: d.team_name,
      teamColour: colour ? `#${colour}` : "#8892a3",
      countryCode: d.country_code,
      headshotUrl: d.headshot_url,
    };
  });
}

export interface TimingInput {
  drivers: OFDriver[];
  positions: OFPosition[];
  intervals: Map<number, OFInterval>;
  laps: OFLap[];
  stints: OFStint[];
  pits: OFPit[];
  sessionResults: OFSessionResult[];
  state: SessionLifecycle;
  /** previous cycle's positions, for prevPosition deltas */
  prevPositions?: Map<number, number>;
  /** live only: latest drs-open flag per driver */
  drsByDriver?: Map<number, boolean>;
}

export function buildTimingRows(input: TimingInput): TimingRow[] {
  const { positions, intervals, laps, stints, pits, sessionResults, state, prevPositions, drsByDriver } = input;
  const lapEntries = buildLapEntries(laps);
  const pitCount = new Map<number, number>();
  const lastPitLap = new Map<number, number>();
  for (const p of pits) {
    pitCount.set(p.driver_number, (pitCount.get(p.driver_number) ?? 0) + 1);
    const cur = lastPitLap.get(p.driver_number) ?? -1;
    if (p.lap_number > cur) lastPitLap.set(p.driver_number, p.lap_number);
  }
  const stintByDriver = new Map<number, OFStint[]>();
  for (const s of stints) {
    const arr = stintByDriver.get(s.driver_number) ?? [];
    arr.push(s);
    stintByDriver.set(s.driver_number, arr);
  }
  const resultsByDriver = new Map(sessionResults.map((r) => [r.driver_number, r]));

  return [...positions]
    .sort((a, b) => a.position - b.position)
    .map((p) => {
      const num = p.driver_number;
      const iv = intervals.get(num);
      const driverLaps = lapEntries.get(num) ?? [];
      const timed = driverLaps.filter((l) => l.duration != null && !l.isPitOut);
      const best = timed.length ? timed.reduce((a, b) => (a.duration! < b.duration! ? a : b)) : null;
      const lastTimed = [...driverLaps].reverse().find((l) => l.duration != null) ?? null;
      const result = resultsByDriver.get(num);
      const stintList = stintByDriver.get(num) ?? [];
      const currentStint =
        stintList.find((s) => s.lap_end == null) ??
        stintList.reduce<OFStint | null>((a, b) => (!a || b.lap_start > a.lap_start ? b : a), null);
      const lastLapNum = driverLaps.length ? Math.max(...driverLaps.map((l) => l.lap)) : 0;

      let status: TimingStatus = "running";
      if (result && (result.dnf || result.dsq || result.dns)) status = "retired";
      else if (state === "completed") status = "finished";
      else if ((lastPitLap.get(num) ?? -1) >= lastLapNum && lastLapNum > 0) status = "inpit";
      else if (lastTimed?.isPitOut) status = "out";

      return {
        number: num,
        position: p.position,
        prevPosition: prevPositions?.get(num) ?? null,
        gapToLeader: p.position === 1 ? null : (iv?.gap_to_leader ?? null),
        interval: iv?.interval ?? null,
        lastLap: lastTimed?.duration ?? null,
        bestLap: best?.duration ?? null,
        sectors: lastTimed ? [lastTimed.s1, lastTimed.s2, lastTimed.s3] : null,
        status,
        pitCount: pitCount.get(num) ?? 0,
        compound: currentStint?.compound ?? null,
        tyreAge:
          currentStint != null && lastLapNum >= currentStint.lap_start
            ? currentStint.tyre_age_at_start + (lastLapNum - currentStint.lap_start)
            : (currentStint?.tyre_age_at_start ?? null),
        ...(drsByDriver?.has(num) ? { drsOpen: drsByDriver.get(num) } : {}),
      };
    });
}

/** Group laps per driver (sorted), flagging personal and session bests. */
export function buildLapEntries(laps: OFLap[]): Map<number, LapEntry[]> {
  const byDriver = new Map<number, OFLap[]>();
  for (const l of laps) {
    const arr = byDriver.get(l.driver_number) ?? [];
    arr.push(l);
    byDriver.set(l.driver_number, arr);
  }
  let sessionBest = Infinity;
  const personalBest = new Map<number, number>();
  for (const [num, arr] of byDriver) {
    let pb = Infinity;
    for (const l of arr) {
      if (l.lap_duration == null || l.is_pit_out_lap) continue;
      if (l.lap_duration < pb) pb = l.lap_duration;
    }
    if (pb < Infinity) {
      personalBest.set(num, pb);
      if (pb < sessionBest) sessionBest = pb;
    }
  }
  const out = new Map<number, LapEntry[]>();
  for (const [num, arr] of byDriver) {
    const pb = personalBest.get(num);
    out.set(
      num,
      [...arr]
        .sort((a, b) => a.lap_number - b.lap_number)
        .map((l) => ({
          lap: l.lap_number,
          duration: l.lap_duration,
          s1: l.duration_sector_1,
          s2: l.duration_sector_2,
          s3: l.duration_sector_3,
          isPitOut: l.is_pit_out_lap,
          isPersonalBest: l.lap_duration != null && !l.is_pit_out_lap && pb != null && l.lap_duration === pb,
          isSessionBest: l.lap_duration != null && !l.is_pit_out_lap && l.lap_duration === sessionBest,
          ...(l.segments_sector_1 || l.segments_sector_2 || l.segments_sector_3
            ? { segments: [l.segments_sector_1 ?? [], l.segments_sector_2 ?? [], l.segments_sector_3 ?? []] }
            : {}),
        })),
    );
  }
  return out;
}

export function buildStintsView(stints: OFStint[]): StintView[] {
  const byDriver = new Map<number, StintInfo[]>();
  for (const s of stints) {
    const arr = byDriver.get(s.driver_number) ?? [];
    arr.push({
      compound: s.compound,
      lapStart: s.lap_start,
      lapEnd: s.lap_end,
      age: s.tyre_age_at_start,
      stintNumber: s.stint_number,
    });
    byDriver.set(s.driver_number, arr);
  }
  return [...byDriver.entries()]
    .map(([driver, list]) => ({
      driver,
      stints: list.sort((a, b) => a.stintNumber - b.stintNumber),
    }))
    .sort((a, b) => a.driver - b.driver);
}

export function buildPitsView(pits: OFPit[], stints: OFStint[]): PitView[] {
  const stintsByDriver = new Map<number, OFStint[]>();
  for (const s of stints) {
    const arr = stintsByDriver.get(s.driver_number) ?? [];
    arr.push(s);
    stintsByDriver.set(s.driver_number, arr);
  }
  for (const arr of stintsByDriver.values()) arr.sort((a, b) => a.stint_number - b.stint_number);

  return [...pits]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((p) => {
      const list = stintsByDriver.get(p.driver_number) ?? [];
      // Heuristic: the stint in progress at the pit lap is the previous
      // compound, the following stint is the new one.
      let prev: OFStint | null = null;
      for (const s of list) {
        if (s.lap_start <= p.lap_number && (!prev || s.lap_start > prev.lap_start)) prev = s;
      }
      const next = prev ? (list.find((s) => s.stint_number > prev!.stint_number) ?? null) : null;
      return {
        driver: p.driver_number,
        lap: p.lap_number,
        // lane_duration is the canonical field; pit_duration is its deprecated alias.
        duration: p.lane_duration ?? p.pit_duration,
        time: p.date,
        prevCompound: prev?.compound ?? null,
        newCompound: next?.compound ?? null,
      };
    });
}

function classifySeverity(e: OFRaceControl): RcSeverity {
  const msg = (e.message ?? "").toUpperCase();
  if (/SAFETY CAR/.test(msg)) return "sc";
  if (e.flag && e.flag !== "CLEAR" && e.flag !== "GREEN") return "flag";
  if (/PENALTY|INFRING|DELETED|BLACK AND WHITE|REPRIMAND/.test(msg)) return "penalty";
  if (/INCIDENT|CONTACT|CRASH|COLLISION|DEBRIS|STOPPED|SPUN/.test(msg)) return "incident";
  return "info";
}

export function buildRaceControlTimeline(events: OFRaceControl[]): RaceControlEvent[] {
  return [...events]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => ({
      time: e.date,
      category: e.category,
      flag: e.flag,
      message: e.message,
      driverNumber: e.driver_number,
      severity: classifySeverity(e),
    }));
}

export function toWeatherPoints(rows: OFWeather[]): WeatherPoint[] {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((w) => ({
      time: w.date,
      air: w.air_temperature,
      track: w.track_temperature,
      humidity: w.humidity,
      pressure: w.pressure,
      windSpeed: w.wind_speed,
      windDir: w.wind_direction,
      rain: w.rainfall === 1,
    }));
}

export function toLocationPoints(rows: OFLocation[]): LocationPoint[] {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((l) => ({ time: l.date, driver: l.driver_number, x: l.x, y: l.y }));
}

export interface NormalizedLocations {
  points: (LocationPoint & { nx: number; ny: number })[];
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Normalize track coordinates to 0..1 on the session bounding box.
 * Units are NOT meters and the origin is arbitrary — the fit is purely
 * relative, so the UI just scales nx/ny onto its SVG viewport.
 */
export function normalizeLocations(points: LocationPoint[]): NormalizedLocations {
  if (!points.length) return { points: [], bbox: { minX: 0, maxX: 1, minY: 0, maxY: 1 } };
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  return {
    points: points.map((p) => ({ ...p, nx: (p.x - minX) / w, ny: (p.y - minY) / h })),
    bbox: { minX, maxX, minY, maxY },
  };
}

export function toTeamRadioItems(rows: OFTeamRadio[]): TeamRadioItem[] {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => ({ time: r.date, driver: r.driver_number, url: r.recording_url }));
}

export function toCarDataPoints(rows: OFCarData[]): CarDataPoint[] {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((c) => ({
      time: c.date,
      driver: c.driver_number,
      speed: c.speed,
      rpm: c.rpm,
      throttle: c.throttle,
      brake: c.brake,
      gear: c.gear,
      drsOpen: c.drs >= 10,
    }));
}

function toNumber(v: number | string | null): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function toSessionResultRows(rows: OFSessionResult[]): SessionResultRow[] {
  return [...rows]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((r) => {
      const gap = normalizeQualiScalar(r.gap_to_leader);
      const dur = normalizeQualiScalar(r.duration);
      return {
        position: r.position,
        driverNumber: r.driver_number,
        numberOfLaps: r.number_of_laps,
        gapToLeader: typeof gap === "number" ? gap : (gap ?? null),
        duration: toNumber(typeof dur === "string" ? dur : dur),
        dnf: r.dnf,
        dns: r.dns,
        dsq: r.dsq,
        points: r.points,
      };
    });
}

export function toStartingGridRows(rows: OFStartingGrid[]): StartingGridRow[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      position: r.position,
      driverNumber: r.driver_number,
      lapTime: r.lap_time,
      interval: r.interval,
    }));
}

export function toOvertakeEvents(rows: OFOvertake[]): OvertakeEvent[] {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((o) => ({
      time: o.date,
      lap: o.lap_number,
      overtakingDriver: o.overtaking_driver_number,
      overtakenDriver: o.overtaken_driver_number,
      position: o.position,
    }));
}

export function buildDataQuality(input: {
  laps: OFLap[];
  location: OFLocation[];
  carData: OFCarData[];
  weather: OFWeather[];
  teamRadio: OFTeamRadio[];
}): DataQuality {
  return {
    hasLaps: input.laps.length > 0,
    hasLocation: input.location.length > 0,
    hasTelemetry: input.carData.length > 0,
    hasWeather: input.weather.length > 0,
    hasRadio: input.teamRadio.length > 0,
  };
}

/* ============================================================================
 * OpenF1 API client — https://api.openf1.org/v1
 * ----------------------------------------------------------------------------
 * TRANSPORT
 *   Keyless REST. Official rate limits (verified against OpenF1 docs, Phase 0):
 *     FREE plan : 3 req/s, 30 req/min, no live timing.
 *     PAID plan : $11.58/mo, 6 req/s, 60 req/min, realtime during sessions.
 *   This client enforces a SHARED token bucket of 25 req/min + 3 req/s across
 *   every OpenF1 call, so the app can never exceed the free quota no matter
 *   how many components poll at once. Identical in-flight requests are
 *   deduplicated. Every request: 15 s timeout, exponential-backoff retry
 *   (max 3 attempts), Retry-After respected on 429 (once inside fetchJSON,
 *   then backoff here).
 *
 * COVERAGE
 *   Historical data starts at 2023: `meetings?year=2022` returns 404.
 *   For seasons before 2023 use Jolpica (src/api/jolpica.ts) only.
 *
 * FILTER OPERATORS — CRITICAL QUIRK (curl-verified 2026-10-06)
 *   The docs write `date>=2023-01-01`, but the server splits the query on the
 *   FIRST `=`: the filter key must be `date>` (single char), NOT `date>=`.
 *   Sending `date%3E%3D=value` (key = "date>=") silently returns
 *   {"detail":"No results found."}; sending `date%3E=value` (key = "date>")
 *   works. ALWAYS use the single-char keys "date>" / "date<" in code —
 *   never "date>=" / "date<=".
 *
 * LIVE vs REPLAY
 *   The free plan does NOT serve data inside the live window
 *   [session_start - 30min, session_end + 30min] — that window is reserved for
 *   the paid plan. Without a subscription OpenF1 only serves completed
 *   sessions (2023+). This client never simulates live data: when live calls
 *   keep returning 404/empty inside the live window, the live layer reports
 *   `liveCapable = false` and the UI must show the honest `needsSubscription`
 *   state (see src/api/openf1live.ts). REPLAY of completed sessions is the
 *   primary, fully-supported mode.
 *
 * ENDPOINT INVENTORY (all curl-verified unless marked [docs])
 *   sessions?year=&session_key=&session_name=&meeting_key=
 *     -> session_key, session_name (VARIANT names! e.g. "Practice 1" in 2023,
 *        "FP1" in 2026 — always normalize with normalizeSessionName()),
 *        session_type ("Practice"/"Qualifying"/"Race"), date_start/date_end
 *        UTC ISO, location, circuit_short_name, country_code, year,
 *        meeting_key. Also accepts session_key=latest.
 *   meetings?year=&meeting_name=&meeting_key=
 *     -> meeting_key, meeting_name, circuit_short_name, country_code,
 *        gmt_offset. 2023+ only.
 *   drivers?session_key=
 *     -> driver_number, full_name, name_acronym, team_name,
 *        team_colour (hex WITHOUT "#"), country_code, headshot_url.
 *   position?session_key=&date=&date>=&date<=
 *     -> date, driver_number, position. EVENT-DRIVEN and rare (the Monaco
 *        winner produced ~9 rows for the whole race): always select the max
 *        `date` per driver client-side (latestPositions()).
 *   intervals?session_key=&interval_key=latest&date>=
 *     -> date, driver_number, gap_to_leader ("+1.234" | "1 LAP" | null),
 *        interval (gap to the car ahead). RACES ONLY — on practice/quali it
 *        404s (treated as empty). QUIRK: interval_key=latest ONLY
 *        works on the single most recent session overall; on any completed
 *        session it returns 404 {"detail":"No results found."}. This client
 *        tries interval_key=latest first and falls back to a full fetch +
 *        client-side max-date per driver. ~793 rows/driver/race, so live
 *        polls MUST use date>= windows.
 *   laps?session_key=&driver_number=&lap_number=
 *     -> date_start, driver_number, lap_number, lap_duration (float seconds,
 *        null for pit/in-out laps), duration_sector_1/2/3 (null when missing),
 *        is_pit_out_lap, i1_speed/i2_speed/st_speed (km/h),
 *        segments_sector_1/2/3 (mini-sector colour codes: 2048 yellow,
 *        2049 green, 2051 purple, 2064 pitlane).
 *   stints?session_key=
 *     -> driver_number, compound (SOFT/MEDIUM/HARD/INTERMEDIATE/WET/UNKNOWN),
 *        tyre_age_at_start, lap_start, lap_end (null = current stint),
 *        stint_number.
 *   pit?session_key=
 *     -> date, driver_number, pit_duration (float seconds, deprecated alias of
 *        lane_duration), lane_duration, stop_duration (stationary seconds;
 *        only from USA GP 2024 on), lap_number.
 *   meetings note: meeting_name is not fully trustworthy (observed: meeting
 *   1308 "Bahrain Grand Prix" with location "Kuala Lumpur").
 *   weather?session_key=&date=
 *     -> date, air_temperature, track_temperature, humidity, pressure,
 *        rainfall (0/1), wind_speed, wind_direction (0-359 deg). NO forecasts.
 *   race_control?session_key=&date=
 *     -> date, category (Flag/SafetyCar/Drs/Sector/Other), flag
 *        (GREEN/YELLOW/RED/CLEAR/FINISH or null), scope, sector, message,
 *        driver_number. There is NO boolean SC field: SC/VSC must be derived
 *        from message text (match "VIRTUAL SAFETY CAR" before "SAFETY CAR",
 *        case-insensitive) — see deriveTrackStatus().
 *   team_radio?session_key=&driver_number=
 *     -> date, driver_number, recording_url (MP3 on livetiming.formula1.com,
 *        the official F1 CDN — embeddable in <audio>), path. OpenF1 does not
 *        own this audio: personal/educational use is OK; always show the
 *        attribution "Audio: Formula 1 / OpenF1".
 *   location?session_key=&driver_number=&date>=&date<=
 *     -> date, driver_number, x, y, z (always 0). Sampled ~3.7 s. QUIRK: units
 *        are NOT meters and the origin is arbitrary (Monaco spans roughly
 *        +/-7500) — any map fit must be purely relative to the session bbox
 *        (see normalizeLocations() in openf1model.ts).
 *   session_result?session_key=
 *     -> position, driver_number, number_of_laps, gap_to_leader, dnf, dns,
 *        dsq, duration, meeting_key, session_key, points (undocumented).
 *        NOTE: in QUALIFYING, `duration` and `gap_to_leader` are ARRAYS
 *        [Q1, Q2, Q3]; elsewhere they are scalars. gap_to_leader may also be
 *        the number 0. Always normalize with normalizeQualiScalar()
 *        (takes the last non-null element). There are NO fastest_lap /
 *        fastest_lap_speed / number_of_pit_stops fields.
 *   starting_grid?session_key=
 *     -> position, driver_number, lap_number, lap_time, interval. QUIRK: it
 *        requires the QUALIFYING session_key — the race session_key returns
 *        404. Use getStartingGrid(qualiKey) or findSessionByName().
 *   car_data?session_key=&driver_number=&date>=&date<=
 *     -> date, driver_number, speed, rpm, throttle (0-100), brake (0/100),
 *        gear ("1".."8"/"N"), drs (0/1/2/3/8/9/10/12/14 — OPEN when >= 10),
 *        n_gear (0-8). Sampled ~3.2 Hz. LIVE ONLY (+ short post-session
 *        buffer): historical sessions return []. Expose telemetryAvailable
 *        honestly — it will almost always be false on the free plan.
 *   overtakes?session_key=
 *     -> date, lap_number, overtaking_driver_number, overtaken_driver_number,
 *        position. Races only; MAY BE INCOMPLETE and includes position changes
 *        from pit stops and penalties (not just on-track passes).
 *
 *   Filters: any scalar attribute is filterable, operators = < <= > >=,
 *   repeated params = OR, `csv=true` for CSV output.
 *
 * 404 POLICY
 *   OpenF1 returns 404 {"detail":"No results found."} for empty result sets
 *   (e.g. intervals on an FP1, starting_grid with a race session_key).
 *   That is treated as an EMPTY LIST everywhere, never as an error.
 *
 * REQUEST BUDGET (free plan, cap 25 req/min enforced by the bucket)
 *   Standard live profile per minute: position 7.5 + intervals 5 +
 *   race_control 3 + pits 2 + stints 2 + weather 0.5 + session_result 0.5 +
 *   team_radio 0.5 + laps 1 = ~22 req/min.
 *   With map: location 5, tower cadences trimmed -> ~22.5 req/min.
 *   Telemetry profile: car_data 20 + position 3 + race_control 1 = 24/min.
 *   Replay (completed sessions): one full load, then at most 2 revalidation
 *   passes — no continuous polling. See src/api/openf1live.ts for the exact
 *   channel table.
 * ========================================================================== */

import { ApiError, fetchJSON, type FetchOpts } from "./client";

const BASE = "https://api.openf1.org/v1";

/* ------------------------------------------------------------------ types */

export interface OFSession {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  meeting_key: number;
  year: number;
  is_cancelled?: boolean;
  gmt_offset?: string;
}

export interface OFMeeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  gmt_offset: string;
  year: number;
}

export interface OFDriver {
  driver_number: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  broadcast_name?: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  /** deprecated by OpenF1 (removal announced for end of 2026) */
  country_code: string | null;
  headshot_url: string | null;
  session_key: number;
}

export interface OFPosition {
  date: string;
  driver_number: number;
  position: number;
  session_key: number;
}

export interface OFInterval {
  date: string;
  driver_number: number;
  gap_to_leader: string | null;
  interval: string | null;
  session_key: number;
}

export interface OFLap {
  date_start: string;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  segments_sector_1: number[] | null;
  segments_sector_2: number[] | null;
  segments_sector_3: number[] | null;
  session_key: number;
}

export interface OFStint {
  driver_number: number;
  compound: string;
  tyre_age_at_start: number;
  lap_start: number;
  lap_end: number | null;
  stint_number: number;
  session_key: number;
}

export interface OFPit {
  date: string;
  driver_number: number;
  /** deprecated alias of lane_duration */
  pit_duration: number;
  lane_duration: number | null;
  /** stationary seconds; only from USA GP 2024 on */
  stop_duration: number | null;
  lap_number: number;
  session_key: number;
}

export interface OFWeather {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: number;
  session_key: number;
}

export interface OFRaceControl {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  message: string;
  driver_number: number | null;
  session_key: number;
}

export interface OFTeamRadio {
  date: string;
  driver_number: number;
  recording_url: string;
  path: string;
  session_key: number;
}

export interface OFLocation {
  date: string;
  driver_number: number;
  x: number;
  y: number;
  z: number;
  session_key: number;
}

export interface OFSessionResult {
  position: number | null;
  driver_number: number;
  number_of_laps: number;
  /** scalar normally; number 0 for the leader; ARRAY [Q1,Q2,Q3] in qualifying */
  gap_to_leader: string | number | (string | number | null)[] | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** scalar normally; ARRAY [Q1,Q2,Q3] in qualifying */
  duration: number | (number | null)[] | null;
  /** undocumented field present in the API */
  points: number | null;
  meeting_key: number;
  session_key: number;
}

export interface OFStartingGrid {
  position: number;
  driver_number: number;
  lap_number: number;
  lap_time: number | null;
  interval: string | null;
  session_key: number;
}

export interface OFCarData {
  date: string;
  driver_number: number;
  speed: number;
  rpm: number;
  throttle: number;
  brake: number;
  gear: string;
  /** 0/1/2/3/8/9/10/12/14 — DRS flap open when >= 10 */
  drs: number;
  n_gear: number;
  session_key: number;
}

export interface OFOvertake {
  date: string;
  lap_number: number;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
  session_key: number;
}

/* ------------------------------------------------------- rate limiting ---- */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Leaky token bucket. Refills continuously; acquire() waits when empty. */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillPerMs: number;
  constructor(capacity: number, refillPerMs: number) {
    this.capacity = capacity;
    this.refillPerMs = refillPerMs;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  private refill(): void {
    const now = Date.now();
    const add = (now - this.lastRefill) * this.refillPerMs;
    if (add > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + add);
      this.lastRefill = now;
    }
  }
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillPerMs);
    await sleep(waitMs);
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }
}

/** Shared by every OpenF1 call in the app: 25 req/min + 3 req/s. */
const minuteBucket = new TokenBucket(25, 25 / 60_000);
const secondBucket = new TokenBucket(3, 3 / 1_000);

/** Dedup identical in-flight requests (only when no external signal is given,
    so a caller that wants abort semantics gets its own request). */
const inflight = new Map<string, Promise<unknown>>();

/** Internal sentinel: OpenF1 404 {"detail":"No results found."} = empty set. */
class OFEmpty extends Error {
  constructor() {
    super("openf1_empty");
    this.name = "OFEmpty";
  }
}

function sleepAbortable(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return sleep(ms);
  if (signal.aborted) return Promise.reject(new ApiError("aborted"));
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new ApiError("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * fetchJSON wrapped with: shared rate limiter, in-flight dedup, 15 s timeout
 * (inside fetchJSON), exponential-backoff retry (max 3 attempts), 429
 * Retry-After handling, external AbortSignal support, and 404-as-empty.
 */
async function ofFetchJSON<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const dedupKey = url;
  const useDedup = !opts.signal;
  if (useDedup) {
    const pending = inflight.get(dedupKey);
    if (pending) return pending as Promise<T>;
  }
  const run = (async (): Promise<T> => {
    let attempt = 0;
    let backoffMs = 1000;
    for (;;) {
      await minuteBucket.acquire();
      await secondBucket.acquire();
      try {
        return await fetchJSON<T>(url, opts);
      } catch (e) {
        if (opts.signal?.aborted || (e instanceof ApiError && e.message === "aborted")) {
          throw new ApiError("aborted");
        }
        const status = e instanceof ApiError ? e.status : undefined;
        // 404 {"detail":"No results found."} is an empty result set, not an error.
        if (status === 404) throw new OFEmpty();
        attempt += 1;
        if (attempt >= 3) throw e;
        // 429: fetchJSON already honored Retry-After once; back off further.
        await sleepAbortable(backoffMs, opts.signal);
        backoffMs *= 2;
      }
    }
  })();
  if (useDedup) {
    inflight.set(dedupKey, run);
    run.then(
      () => inflight.delete(dedupKey),
      () => inflight.delete(dedupKey),
    );
  }
  return run;
}

/** Fetch a list endpoint; 404/detail responses become []. */
async function fetchList<T>(url: string, opts: FetchOpts = {}): Promise<T[]> {
  try {
    const data = await ofFetchJSON<unknown>(url, opts);
    if (Array.isArray(data)) return data as T[];
    // 200 with {"detail":"No results found."} body
    if (data !== null && typeof data === "object" && "detail" in data) return [];
    return [];
  } catch (e) {
    if (e instanceof OFEmpty) return [];
    throw e;
  }
}

type Params = Record<string, string | number | undefined>;

const q = (params: Params): string =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

/* ------------------------------------------------------------- client ----- */

export const openf1 = {
  sessions: (params: Params = {}, o?: FetchOpts) =>
    fetchList<OFSession>(`${BASE}/sessions?${q(params)}`, { ttl: 30 * 60 * 1000, ...o }),

  meetings: (params: Params = {}, o?: FetchOpts) =>
    fetchList<OFMeeting>(`${BASE}/meetings?${q(params)}`, { ttl: 60 * 60 * 1000, ...o }),

  drivers: (sessionKey: number, o?: FetchOpts) =>
    fetchList<OFDriver>(`${BASE}/drivers?${q({ session_key: sessionKey })}`, { ttl: 60 * 60 * 1000, ...o }),

  /** Raw position rows (event-driven, sparse). Supports date>= / date<=. */
  positions: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFPosition>(`${BASE}/position?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 10 * 1000,
      persist: false,
      ...o,
    }),

  /** Latest position row per driver (client-side max date). */
  latestPositions: async (sessionKey: number, o?: FetchOpts): Promise<OFPosition[]> => {
    const rows = await openf1.positions(sessionKey, {}, o);
    return latestBy(rows, (r) => r.driver_number);
  },

  /** Raw interval rows. Supports date>= / date<=. */
  intervals: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFInterval>(`${BASE}/intervals?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 10 * 1000,
      persist: false,
      ...o,
    }),

  /**
   * Latest interval row per driver. QUIRK: interval_key=latest only works on
   * the single most recent session overall — on completed sessions it 404s,
   * so we fall back to a full fetch + client-side max-date per driver.
   * Pass { expectHistorical: true } to skip the (doomed) latest attempt.
   */
  latestIntervals: async (
    sessionKey: number,
    o?: FetchOpts & { expectHistorical?: boolean },
  ): Promise<Map<number, OFInterval>> => {
    let rows: OFInterval[] = [];
    if (!o?.expectHistorical) {
      rows = await openf1.intervals(sessionKey, { interval_key: "latest" }, o);
    }
    if (rows.length === 0) {
      rows = await openf1.intervals(sessionKey, {}, o);
    }
    const m = new Map<number, OFInterval>();
    for (const r of latestBy(rows, (r) => r.driver_number)) m.set(r.driver_number, r);
    return m;
  },

  laps: (sessionKey: number, params: Params = {}, o?: FetchOpts) =>
    fetchList<OFLap>(`${BASE}/laps?${q({ session_key: sessionKey, ...params })}`, { ttl: 10 * 60 * 1000, ...o }),

  stints: (sessionKey: number, o?: FetchOpts) =>
    fetchList<OFStint>(`${BASE}/stints?${q({ session_key: sessionKey })}`, { ttl: 60 * 1000, ...o }),

  pits: (sessionKey: number, o?: FetchOpts) =>
    fetchList<OFPit>(`${BASE}/pit?${q({ session_key: sessionKey })}`, { ttl: 30 * 1000, ...o }),

  weather: (sessionKey: number, o?: FetchOpts) =>
    fetchList<OFWeather>(`${BASE}/weather?${q({ session_key: sessionKey })}`, { ttl: 60 * 1000, ...o }),

  weatherLatest: async (sessionKey: number, o?: FetchOpts): Promise<OFWeather | null> => {
    const rows = await openf1.weather(sessionKey, o);
    if (!rows.length) return null;
    return rows.reduce((a, b) => (a.date > b.date ? a : b));
  },

  raceControl: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFRaceControl>(`${BASE}/race_control?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 15 * 1000,
      persist: false,
      ...o,
    }),

  teamRadio: (sessionKey: number, driverNumber?: number, o?: FetchOpts) =>
    fetchList<OFTeamRadio>(
      `${BASE}/team_radio?${q({ session_key: sessionKey, driver_number: driverNumber })}`,
      { ttl: 5 * 60 * 1000, ...o },
    ),

  location: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFLocation>(`${BASE}/location?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 30 * 1000,
      persist: false,
      ...o,
    }),

  sessionResult: (sessionKey: number, o?: FetchOpts) =>
    fetchList<OFSessionResult>(`${BASE}/session_result?${q({ session_key: sessionKey })}`, { ttl: 5 * 60 * 1000, ...o }),

  /**
   * Starting grid. REQUIRES the qualifying session_key — the race key 404s.
   * Use findSessionByName(meetingKey, "Qualifying") to resolve it.
   */
  startingGrid: (qualiSessionKey: number, o?: FetchOpts) =>
    fetchList<OFStartingGrid>(`${BASE}/starting_grid?${q({ session_key: qualiSessionKey })}`, {
      ttl: 30 * 60 * 1000,
      ...o,
    }),

  /**
   * Car telemetry ~3.2 Hz. LIVE ONLY (+ short post-session buffer);
   * historical sessions return []. Supports date>= / date<= windows.
   */
  carData: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFCarData>(`${BASE}/car_data?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 3 * 1000,
      persist: false,
      ...o,
    }),

  overtakes: (sessionKey: number, extra: Params = {}, o?: FetchOpts) =>
    fetchList<OFOvertake>(`${BASE}/overtakes?${q({ session_key: sessionKey, ...extra })}`, {
      ttl: 5 * 60 * 1000,
      ...o,
    }),

  /** Best lap per driver for a session (practice classification). */
  bestLaps: async (
    sessionKey: number,
    o?: FetchOpts,
  ): Promise<{ driver_number: number; lap_number: number; lap_duration: number }[]> => {
    const rows = await openf1.laps(sessionKey, {}, o);
    const best = new Map<number, { driver_number: number; lap_number: number; lap_duration: number }>();
    for (const r of rows) {
      if (r.lap_duration == null || r.is_pit_out_lap) continue;
      const cur = best.get(r.driver_number);
      if (!cur || r.lap_duration < cur.lap_duration) {
        best.set(r.driver_number, { driver_number: r.driver_number, lap_number: r.lap_number, lap_duration: r.lap_duration });
      }
    }
    return [...best.values()].sort((a, b) => a.lap_duration - b.lap_duration);
  },
};

function latestBy<T extends { date: string }>(rows: T[], key: (r: T) => number): T[] {
  const byKey = new Map<number, T>();
  for (const r of rows) {
    const cur = byKey.get(key(r));
    if (!cur || r.date > cur.date) byKey.set(key(r), r);
  }
  return [...byKey.values()];
}

/* ------------------------------------------------- session name/scheduling */

export type SessionLifecycle = "live" | "upcoming" | "completed" | "scheduled";

/**
 * OpenF1 session names are NOT stable across years: 2023 uses "Practice 1",
 * 2026 uses "FP1". Normalize case-insensitively to canonical labels.
 */
export function normalizeSessionName(raw: string): string {
  const n = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const has = (s: string) => n.includes(s);
  if (has("practice 1") || n === "fp1" || has("free practice 1")) return "FP1";
  if (has("practice 2") || n === "fp2" || has("free practice 2")) return "FP2";
  if (has("practice 3") || n === "fp3" || has("free practice 3")) return "FP3";
  if (has("sprint qualifying") || has("sprint shootout")) return "Sprint Quali";
  if (has("sprint")) return "Sprint";
  if (has("qualifying")) return "Qualifying";
  if (has("race")) return "Race";
  return raw.trim();
}

/**
 * Lifecycle of a session at `now`. "live" covers [start, end + 30min] (the
 * 30 min tolerance absorbs overruns and the paid-plan live window);
 * "upcoming" is within 24 h before the start.
 */
export function sessionState(s: OFSession, now: Date = new Date()): SessionLifecycle {
  const t = now.getTime();
  const start = new Date(s.date_start).getTime();
  const end = new Date(s.date_end).getTime() + 30 * 60 * 1000;
  if (t >= start && t <= end) return "live";
  if (t < start) return start - t <= 24 * 3600 * 1000 ? "upcoming" : "scheduled";
  return "completed";
}

export interface LiveSearch {
  live: OFSession | null;
  /** next session starting within 24 h (may be null) */
  upcoming: OFSession | null;
}

/** Find the session in progress (30 min post-end tolerance) + next <24 h. */
export async function findLiveSession(now: Date = new Date(), o?: FetchOpts): Promise<LiveSearch> {
  const sessions = await openf1.sessions({ year: now.getUTCFullYear() }, o);
  let live: OFSession | null = null;
  let upcoming: OFSession | null = null;
  for (const s of sessions) {
    const st = sessionState(s, now);
    if (st === "live" && !live) live = s;
    if (st === "upcoming" && (!upcoming || s.date_start < upcoming.date_start)) upcoming = s;
  }
  return { live, upcoming };
}

/** Latest session with data, via the special session_key=latest filter. */
export async function latestSessionKey(o?: FetchOpts): Promise<number | null> {
  const rows = await openf1.sessions({ session_key: "latest" }, o);
  return rows.length ? rows[0].session_key : null;
}

/**
 * Fuzzy-match a Grand Prix name (e.g. Jolpica "Italian Grand Prix") to an
 * OpenF1 meeting of the same year, scoring on meeting_name/circuit_short_name.
 */
export async function findMeeting(year: number, meetingName: string, o?: FetchOpts): Promise<OFMeeting | null> {
  const meetings = await openf1.meetings({ year }, o);
  if (!meetings.length) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/grand prix|\bgp\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const target = norm(meetingName);
  const targetTokens = new Set(target.split(" ").filter((t) => t.length > 2));
  let best: OFMeeting | null = null;
  let bestScore = 0;
  for (const m of meetings) {
    const mn = norm(m.meeting_name);
    const cs = norm(m.circuit_short_name);
    let score = 0;
    if (mn === target) score = 4;
    else if (cs && target.includes(cs)) score = 3;
    else if (mn.includes(target) || target.includes(mn)) score = 3;
    else {
      let overlap = 0;
      for (const t of targetTokens) if (mn.includes(t)) overlap++;
      if (overlap >= 2) score = 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/**
 * Find a session of a meeting by normalized name ("Qualifying", "Race",
 * "FP1"…) — used e.g. to resolve the quali key for starting_grid.
 */
export async function findSessionByName(
  meetingKey: number,
  normalizedName: string,
  o?: FetchOpts,
): Promise<OFSession | null> {
  const sessions = await openf1.sessions({ meeting_key: meetingKey }, o);
  const want = normalizedName.toLowerCase();
  return sessions.find((s) => normalizeSessionName(s.session_name).toLowerCase() === want) ?? null;
}

/* ------------------------------------------------------------- parsing ---- */

/**
 * Normalize qualifying's [Q1, Q2, Q3] arrays (and the leader's numeric 0)
 * to a single scalar: the last non-null element. Scalars pass through.
 */
export function normalizeQualiScalar(v: number | string | (number | string | null)[] | null | undefined): number | string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    for (let i = v.length - 1; i >= 0; i--) {
      const x = v[i];
      if (x != null) return x;
    }
    return null;
  }
  return v;
}

export interface TrackStatus {
  status: "green" | "yellow" | "sc" | "vsc" | "red" | "finished";
  since: string | null;
  message: string | null;
}

/**
 * Pure parser: derive the current track status from race_control messages.
 * There is no boolean SC field in the API — SC/VSC are detected from message
 * text ("VIRTUAL SAFETY CAR" is matched BEFORE "SAFETY CAR").
 */
export function deriveTrackStatus(events: OFRaceControl[]): TrackStatus {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let cur: TrackStatus = { status: "green", since: null, message: null };
  for (const e of sorted) {
    const msg = (e.message ?? "").toUpperCase();
    const flag = (e.flag ?? "").toUpperCase();
    const scEnding = /ENDING|IN THIS LAP|WITHDRAWN/.test(msg);
    if (flag === "RED" || /(^|\W)RED FLAG(\W|$)/.test(msg)) {
      cur = { status: "red", since: e.date, message: e.message };
    } else if (msg.includes("VIRTUAL SAFETY CAR")) {
      cur = scEnding
        ? { status: "green", since: e.date, message: e.message }
        : { status: "vsc", since: e.date, message: e.message };
    } else if (msg.includes("SAFETY CAR")) {
      cur = scEnding
        ? { status: "green", since: e.date, message: e.message }
        : { status: "sc", since: e.date, message: e.message };
    } else if (flag === "YELLOW" || flag === "DOUBLE YELLOW") {
      cur = { status: "yellow", since: e.date, message: e.message };
    } else if (flag === "GREEN" || flag === "CLEAR") {
      cur = { status: "green", since: e.date, message: e.message };
    } else if (flag === "FINISH" || msg.includes("CHEQUERED")) {
      cur = { status: "finished", since: e.date, message: e.message };
    }
  }
  return cur;
}

/* ------------------------------------------------------------ formatting -- */

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

/** Format an interval/gap value: "+1.234", "1 LAP", number seconds, or null. */
export function formatGap(gap: string | number | null | undefined): string {
  if (gap == null) return "—";
  if (typeof gap === "number") return `+${gap.toFixed(3)}`;
  const g = gap.trim();
  if (g === "") return "—";
  if (/lap/i.test(g)) return g;
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(g)) return g.startsWith("+") || g.startsWith("-") ? g : `+${g}`;
  return g;
}

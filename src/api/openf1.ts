/* OpenF1 API — keyless live timing. https://api.openf1.org
   All timestamps are UTC ISO strings. */
import { fetchJSON, type FetchOpts } from "./client";

const BASE = "https://api.openf1.org/v1";

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
  year: number;
}

export interface OFDriver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
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

export interface OFPit {
  date: string;
  driver_number: number;
  pit_duration: number;
  lap_number: number;
  session_key: number;
}

export interface OFStint {
  driver_number: number;
  compound: string;
  tyre_age_at_start: number;
  lap_start: number;
  lap_end: number | null;
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

export interface OFSessionResult {
  position: number | null;
  driver_number: number;
  number_of_laps: number;
  gap_to_leader: string | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  session_key: number;
}

const q = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export const openf1 = {
  sessions: (params: Record<string, string | number> = {}, o?: FetchOpts) =>
    fetchJSON<OFSession[]>(`${BASE}/sessions?${q(params)}`, { ttl: 5 * 60 * 1000, ...o }),

  drivers: (sessionKey: number, o?: FetchOpts) =>
    fetchJSON<OFDriver[]>(`${BASE}/drivers?${q({ session_key: sessionKey })}`, { ttl: 30 * 60 * 1000, ...o }),

  latestPositions: async (sessionKey: number, o?: FetchOpts): Promise<OFPosition[]> => {
    const rows = await fetchJSON<OFPosition[]>(`${BASE}/position?${q({ session_key: sessionKey })}`, { ttl: 20 * 1000, ...o });
    const byDriver = new Map<number, OFPosition>();
    for (const r of rows) {
      const cur = byDriver.get(r.driver_number);
      if (!cur || r.date > cur.date) byDriver.set(r.driver_number, r);
    }
    return [...byDriver.values()].sort((a, b) => a.position - b.position);
  },

  latestIntervals: async (sessionKey: number, o?: FetchOpts): Promise<Map<number, OFInterval>> => {
    const rows = await fetchJSON<OFInterval[]>(`${BASE}/intervals?${q({ session_key: sessionKey, interval_key: "latest" })}`, {
      ttl: 20 * 1000,
      ...o,
    });
    const m = new Map<number, OFInterval>();
    for (const r of rows) {
      const cur = m.get(r.driver_number);
      if (!cur || r.date > cur.date) m.set(r.driver_number, r);
    }
    return m;
  },

  raceControl: (sessionKey: number, o?: FetchOpts) =>
    fetchJSON<OFRaceControl[]>(`${BASE}/race_control?${q({ session_key: sessionKey })}`, { ttl: 20 * 1000, ...o }),

  pits: (sessionKey: number, o?: FetchOpts) =>
    fetchJSON<OFPit[]>(`${BASE}/pit?${q({ session_key: sessionKey })}`, { ttl: 60 * 1000, ...o }),

  stints: (sessionKey: number, o?: FetchOpts) =>
    fetchJSON<OFStint[]>(`${BASE}/stints?${q({ session_key: sessionKey })}`, { ttl: 60 * 1000, ...o }),

  weather: async (sessionKey: number, o?: FetchOpts): Promise<OFWeather | null> => {
    const rows = await fetchJSON<OFWeather[]>(`${BASE}/weather?${q({ session_key: sessionKey })}`, { ttl: 60 * 1000, ...o });
    if (!rows.length) return null;
    return rows.reduce((a, b) => (a.date > b.date ? a : b));
  },

  sessionResult: (sessionKey: number, o?: FetchOpts) =>
    fetchJSON<OFSessionResult[]>(`${BASE}/session_result?${q({ session_key: sessionKey })}`, { ttl: 10 * 60 * 1000, ...o }),

  /** Best lap per driver for a session (practice classification). Computed from /laps. */
  bestLaps: async (
    sessionKey: number,
    o?: FetchOpts
  ): Promise<{ driver_number: number; lap_number: number; lap_duration: number }[]> => {
    const rows = await fetchJSON<
      { driver_number: number; lap_number: number; lap_duration: number | null; is_pit_out_lap: boolean }[]
    >(`${BASE}/laps?${q({ session_key: sessionKey })}`, { ttl: 10 * 60 * 1000, ...o });
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

/** Find a session currently in progress (with a small tolerance), or null. */
export async function findLiveSession(now: Date = new Date()): Promise<OFSession | null> {
  const year = now.getUTCFullYear();
  const sessions = await openf1.sessions({ year });
  const t = now.getTime();
  const live = sessions.find((s) => {
    const start = new Date(s.date_start).getTime();
    const end = new Date(s.date_end).getTime() + 30 * 60 * 1000; // tolerance for overruns
    return t >= start && t <= end;
  });
  return live ?? null;
}

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

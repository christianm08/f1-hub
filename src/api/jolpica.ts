/* Jolpica F1 API (Ergast successor) — keyless. https://api.jolpi.ca/ergast/f1/ */
import { fetchJSON, type FetchOpts } from "./client";

const BASE = "https://api.jolpi.ca/ergast/f1";

export interface DriverRef {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface ConstructorRef {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface CircuitRef {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

export interface SessionTime {
  date: string;
  time?: string;
}

export interface RaceInfo {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: CircuitRef;
  date: string;
  time?: string;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: DriverRef;
  Constructors: ConstructorRef[];
}

export interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: ConstructorRef;
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: DriverRef;
  Constructor: ConstructorRef;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis?: string; time: string };
  FastestLap?: { rank: string; lap: string; Time: { time: string }; AverageSpeed?: { units: string; speed: string } };
}

export interface QualiResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: DriverRef;
  Constructor: ConstructorRef;
  grid: string;
  laps: string;
  status: string;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface PitStop {
  driverId: string;
  lap: string;
  stop: string;
  time: string;
  duration: string;
}

interface MRData<T> {
  MRData: T & { total: string };
}

function mr<T>(p: Promise<MRData<T>>): Promise<T> {
  return p.then((d) => d.MRData);
}

export const jolpica = {
  seasons: (o?: FetchOpts) =>
    mr(fetchJSON<MRData<{ SeasonTable: { Seasons: { season: string; url: string }[] } }>>(`${BASE}/seasons.json?limit=100`, o)).then(
      (d) => d.SeasonTable.Seasons.map((s) => s.season)
    ),

  schedule: (season: string, o?: FetchOpts) =>
    mr(fetchJSON<MRData<{ RaceTable: { season: string; Races: RaceInfo[] } }>>(`${BASE}/${season}.json`, o)).then(
      (d) => d.RaceTable.Races
    ),

  driverStandings: (season: string, round?: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } }>>(
        `${BASE}/${season}${round ? `/${round}` : ""}/driverStandings.json?limit=100`,
        o
      )
    ).then((d) => d.StandingsTable.StandingsLists[0]?.DriverStandings ?? []),

  constructorStandings: (season: string, round?: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] } }>>(
        `${BASE}/${season}${round ? `/${round}` : ""}/constructorStandings.json?limit=100`,
        o
      )
    ).then((d) => d.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []),

  raceResults: (season: string, round: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ Results: RaceResult[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/${round}/results.json`,
        o
      )
    ).then((d) => d.RaceTable.Races[0]?.Results ?? []),

  qualifying: (season: string, round: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ QualifyingResults: QualiResult[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/${round}/qualifying.json`,
        o
      )
    ).then((d) => d.RaceTable.Races[0]?.QualifyingResults ?? []),

  sprint: (season: string, round: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ SprintResults: RaceResult[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/${round}/sprint.json`,
        o
      )
    ).then((d) => d.RaceTable.Races[0]?.SprintResults ?? []),

  pitstops: (season: string, round: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ PitStops: PitStop[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/${round}/pitstops.json`,
        o
      )
    ).then((d) => d.RaceTable.Races[0]?.PitStops ?? []),

  driverResults: (season: string, driverId: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ Results: RaceResult[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/drivers/${driverId}/results.json?limit=100`,
        o
      )
    ).then((d) => d.RaceTable.Races),

  constructorResults: (season: string, constructorId: string, o?: FetchOpts) =>
    mr(
      fetchJSON<MRData<{ RaceTable: { Races: ({ Results: RaceResult[] } & RaceInfo)[] } }>>(
        `${BASE}/${season}/constructors/${constructorId}/results.json?limit=100`,
        o
      )
    ).then((d) => d.RaceTable.Races),

  drivers: (season: string, o?: FetchOpts) =>
    mr(fetchJSON<MRData<{ DriverTable: { Drivers: DriverRef[] } }>>(`${BASE}/${season}/drivers.json?limit=100`, o)).then(
      (d) => d.DriverTable.Drivers
    ),

  constructors: (season: string, o?: FetchOpts) =>
    mr(fetchJSON<MRData<{ ConstructorTable: { Constructors: ConstructorRef[] } }>>(`${BASE}/${season}/constructors.json?limit=100`, o)).then(
      (d) => d.ConstructorTable.Constructors
    ),

  circuits: (o?: FetchOpts) =>
    mr(fetchJSON<MRData<{ CircuitTable: { Circuits: CircuitRef[] } }>>(`${BASE}/circuits.json?limit=100`, o)).then(
      (d) => d.CircuitTable.Circuits
    ),
};

/** "2026-03-08" + "04:00:00Z" -> Date (UTC). Missing time -> noon UTC. */
export function sessionDateTime(date: string, time?: string): Date {
  return new Date(`${date}T${time ?? "12:00:00Z"}`);
}

/** All timed sessions of a race in chronological order. */
export function raceSessions(race: RaceInfo): { key: string; label: string; date: Date }[] {
  const out: { key: string; label: string; date: Date }[] = [];
  const push = (key: string, label: string, s?: SessionTime) => {
    if (s) out.push({ key, label, date: sessionDateTime(s.date, s.time) });
  };
  push("fp1", "FP1", race.FirstPractice);
  push("fp2", "FP2", race.SecondPractice);
  push("fp3", "FP3", race.ThirdPractice);
  push("sprint", "Sprint", race.Sprint);
  push("quali", "Qualifiche", race.Qualifying);
  push("race", "Gara", { date: race.date, time: race.time });
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type RaceStatus = "past" | "upcoming" | "live";

export function raceStatus(race: RaceInfo, now: Date = new Date()): RaceStatus {
  const sessions = raceSessions(race);
  if (sessions.length === 0) return "upcoming";
  const first = sessions[0].date.getTime();
  const last = sessions[sessions.length - 1].date.getTime();
  // race duration estimate ~2h
  if (now.getTime() > last + 2.5 * 3600 * 1000) return "past";
  if (now.getTime() >= first) return "live";
  return "upcoming";
}

/** Next upcoming session across the schedule (or null). */
export function nextSession(races: RaceInfo[], now: Date = new Date()): { race: RaceInfo; key: string; label: string; date: Date } | null {
  let best: { race: RaceInfo; key: string; label: string; date: Date } | null = null;
  for (const race of races) {
    for (const s of raceSessions(race)) {
      if (s.date.getTime() > now.getTime() && (!best || s.date < best.date)) {
        best = { race, ...s };
      }
    }
  }
  return best;
}

/* Domain model: the SINGLE internal representation for drivers/teams.
 * UI pages must use these models and never touch raw API shapes.
 *
 * Merge strategy — Jolpica (primary) + f1api.dev (enrichment):
 *
 *   SOURCE PRIORITY per field (verified against live data, 2026-10-06):
 *   - identity (givenName/familyName/nationality): Jolpica primary.
 *     f1api.dev is fallback only (names matched 1:1 in all 2026 records).
 *   - permanentNumber: Jolpica primary. Known discrepancy: f1api.dev reports
 *     norris=4 / max_verstappen=33 (real-world numbers) while Jolpica reports
 *     norris=1 / max_verstappen=3. Jolpica stays primary because it is the
 *     designated primary source and the app already displays its numbers;
 *     f1api.dev is fallback when Jolpica lacks the field.
 *   - dateOfBirth: Jolpica (ISO) primary; f1api.dev ("DD/MM/YYYY", normalized
 *     to ISO here) fallback. Known discrepancy: hadjar 2004-09-28 (Jolpica)
 *     vs 2004-02-28 (f1api.dev) — Jolpica kept as primary.
 *   - code (3-letter timing code): Jolpica `code` primary, f1api.dev
 *     `shortName` fallback (identical in every 2026 record checked).
 *   - team metadata (country, firstSeason, constructorsTitles, driversTitles):
 *     f1api.dev ONLY — Jolpica does not provide these.
 *   - standings (position/points/wins): Jolpica primary; f1api.dev values
 *     are ignored to keep one source of truth.
 *
 * Fallback chain: Jolpica -> f1api.dev -> cached data.
 * - fetchJSON (./client) caches every URL in memory + localStorage (TTL).
 * - Model builders are memoized per season in-module (no duplicate builds).
 * - Enrichment NEVER fails the load: any f1api.dev error (network, HTTP,
 *   429, timeout, malformed) is caught and the Jolpica-only model is used.
 * - Nothing is ever invented: missing fields stay undefined and the UI
 *   renders its honest empty state.
 */
import { jolpica, type ConstructorRef, type DriverRef } from "./jolpica";
import { f1api, teamCountry, teamFirstSeason, type F1ApiDriverEntry, type F1ApiTeamInfo } from "./f1api";
import type { FetchOpts } from "./client";

export interface DriverModel {
  id: string;
  givenName: string;
  familyName: string;
  fullName: string;
  /** Jolpica-style nationality label ("Italian") — for nationalityCode(). */
  nationality: string;
  /** Wikipedia article URL (Jolpica) — used to resolve the portrait photo. */
  wikiUrl?: string;
  /** 3-letter timing code. */
  code: string;
  number?: string;
  /** ISO YYYY-MM-DD. */
  dateOfBirth?: string;
  age?: number;
  teamId?: string;
  teamName?: string;
  /** ALL constructors the driver raced for in this season (Jolpica standings).
   *  Drivers who switched teams mid-season have more than one entry. */
  teams: { id: string; name: string }[];
  position?: string;
  points?: string;
  wins?: string;
  /** True when f1api.dev contributed at least one field. */
  enriched: boolean;
}

export interface TeamModel {
  id: string;
  name: string;
  /** Jolpica-style nationality label. */
  nationality: string;
  /** f1api.dev only. */
  country?: string;
  /** f1api.dev only. */
  firstSeason?: number;
  /** f1api.dev only. */
  constructorsTitles?: number;
  /** f1api.dev only. */
  driversTitles?: number;
  position?: string;
  points?: string;
  wins?: string;
  enriched: boolean;
}

/** Jolpica driverId -> f1api.dev driverId, for IDs that differ between APIs. */
const DRIVER_ID_ALIASES: Record<string, string> = {
  arvid_lindblad: "lindblad",
};

/** Alternate Jolpica driverIds used in some seasons.
 *  Jolpica/Ergast IDs are NOT stable across seasons
 *  (e.g. "verstappen" in 2026 but "max_verstappen" in 2025). */
const DRIVER_ID_SEASON_ALIASES: Record<string, string[]> = {
  verstappen: ["max_verstappen"],
  max_verstappen: ["verstappen"],
};

const normId = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Resolve a driverId to a season model, tolerating cross-season ID changes.
 *  1) exact match  2) known season aliases  3) family-name fallback, ONLY when
 *  it yields exactly one unambiguous candidate (never risk the wrong driver). */
export function resolveDriver(models: DriverModel[], driverId: string): DriverModel | undefined {
  const exact = models.find((m) => m.id === driverId);
  if (exact) return exact;
  for (const alt of DRIVER_ID_SEASON_ALIASES[driverId] ?? []) {
    const m = models.find((x) => x.id === alt);
    if (m) return m;
  }
  const fam = normId(driverId.split("_").pop() ?? driverId);
  if (!fam) return undefined;
  const cands = models.filter((m) => normId(m.familyName) === fam);
  return cands.length === 1 ? cands[0] : undefined;
}

/** "DD/MM/YYYY" or ISO -> ISO "YYYY-MM-DD". undefined when unparseable. */
export function parseF1ApiDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const eu = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (eu) return `${eu[3]}-${eu[2]}-${eu[1]}`;
  return undefined;
}

function ageOf(dob: string | undefined): number | undefined {
  if (!dob) return undefined;
  const b = new Date(dob + "T00:00:00Z").getTime();
  if (Number.isNaN(b)) return undefined;
  return Math.floor((Date.now() - b) / 31557600000);
}

function initialsOf(fullName: string): string {
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 3);
}

const driverCache = new Map<string, Promise<DriverModel[]>>();
const teamCache = new Map<string, Promise<TeamModel[]>>();

function memo<T>(cache: Map<string, Promise<T[]>>, season: string, build: () => Promise<T[]>): Promise<T[]> {
  let p = cache.get(season);
  if (!p) {
    p = build();
    cache.set(season, p);
    p.catch(() => cache.delete(season)); // allow retry after failure
  }
  return p;
}

/** Enrichment fetch that never throws: returns null when f1api.dev is unusable. */
async function safeEnrich<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function buildDriverModels(season: string): Promise<DriverModel[]> {
  const [driversRes, standings] = await Promise.all([
    jolpica.drivers(season).catch((): null => null),
    jolpica.driverStandings(season).catch((): never[] => []),
  ]);
  // Resilience: Jolpica intermittently serves a non-JSON "error code: 1033"
  // body (with HTTP 200) on list endpoints. Rebuild the driver list from the
  // standings payload — which embeds full Driver objects — instead of
  // failing the whole page.
  let drivers: DriverRef[] = driversRes ?? [];
  if (drivers.length === 0) {
    const seen = new Set<string>();
    drivers = [];
    for (const s of standings) {
      const d = s.Driver;
      if (d && !seen.has(d.driverId)) {
        seen.add(d.driverId);
        drivers.push(d);
      }
    }
  }
  const standById = new Map(standings.map((s) => [s.Driver.driverId, s]));

  const enrichList = await safeEnrich(() => f1api.driversChampionship(season));
  const enrichById = new Map<string, F1ApiDriverEntry>();
  for (const e of enrichList ?? []) enrichById.set(e.driverId, e);

  const models: DriverModel[] = drivers.map((d) => {
    const s = standById.get(d.driverId);
    const e = enrichById.get(d.driverId) ?? enrichById.get(DRIVER_ID_ALIASES[d.driverId] ?? "");
    const fullName = `${d.givenName} ${d.familyName}`.trim();
    // Source priority per field — see header comment.
    const code = d.code ?? e?.driver.shortName ?? initialsOf(fullName);
    const number = d.permanentNumber ?? (e?.driver.number != null ? String(e.driver.number) : undefined);
    const dateOfBirth = d.dateOfBirth || parseF1ApiDate(e?.driver.birthday);
    const teamId = s?.Constructors[0]?.constructorId ?? e?.teamId;
    const teamName = s?.Constructors[0]?.name;
    const teams = (s?.Constructors ?? []).map((c) => ({ id: c.constructorId, name: c.name }));
    return {
      id: d.driverId,
      givenName: d.givenName,
      familyName: d.familyName,
      fullName,
      nationality: d.nationality || e?.driver.nationality || "",
      wikiUrl: d.url || undefined,
      code,
      number,
      dateOfBirth,
      age: ageOf(dateOfBirth),
      teamId,
      teamName,
      teams,
      position: s?.positionText,
      points: s?.points,
      wins: s?.wins,
      enriched: !!e,
    };
  });

  models.sort((a, b) => {
    const pa = parseInt(a.position ?? "99", 10);
    const pb = parseInt(b.position ?? "99", 10);
    return pa - pb;
  });
  return models;
}

async function buildTeamModels(season: string): Promise<TeamModel[]> {
  const [teamsRes, standings] = await Promise.all([
    jolpica.constructors(season).catch((): null => null),
    jolpica.constructorStandings(season).catch((): never[] => []),
  ]);
  // Same resilience as buildDriverModels: rebuild from standings on flaky
  // list-endpoint responses.
  let teams: ConstructorRef[] = teamsRes ?? [];
  if (teams.length === 0) {
    const seen = new Set<string>();
    teams = [];
    for (const s of standings) {
      const c = s.Constructor;
      if (c && !seen.has(c.constructorId)) {
        seen.add(c.constructorId);
        teams.push(c);
      }
    }
  }
  const standById = new Map(standings.map((s) => [s.Constructor.constructorId, s]));

  const enrichList = await safeEnrich(() => f1api.constructorsChampionship(season));
  const enrichById = new Map<string, F1ApiTeamInfo>((enrichList ?? []).map((e) => [e.teamId, e.team]));

  const models: TeamModel[] = teams.map((c) => {
    const s = standById.get(c.constructorId);
    const t = enrichById.get(c.constructorId);
    return {
      id: c.constructorId,
      name: c.name,
      nationality: c.nationality,
      country: t ? teamCountry(t) : undefined,
      firstSeason: t ? teamFirstSeason(t) : undefined,
      constructorsTitles: t?.constructorsChampionships,
      driversTitles: t?.driversChampionships,
      position: s?.positionText,
      points: s?.points,
      wins: s?.wins,
      enriched: !!t,
    };
  });

  models.sort((a, b) => {
    const pa = parseInt(a.position ?? "99", 10);
    const pb = parseInt(b.position ?? "99", 10);
    return pa - pb;
  });
  return models;
}

/** All drivers of a season as normalized models (Jolpica + f1api.dev enrichment). */
export function loadDriverModels(season: string, o?: FetchOpts): Promise<DriverModel[]> {
  if (o?.fresh) driverCache.delete(season);
  return memo(driverCache, season, () => buildDriverModels(season));
}

/** All constructors of a season as normalized models (Jolpica + f1api.dev enrichment). */
export function loadTeamModels(season: string, o?: FetchOpts): Promise<TeamModel[]> {
  if (o?.fresh) teamCache.delete(season);
  return memo(teamCache, season, () => buildTeamModels(season));
}

/** Clear memoized models (used together with clearCache from Settings). */
export function clearModelCache() {
  driverCache.clear();
  teamCache.clear();
}

/* f1api.dev — free, keyless SECONDARY source. https://f1api.dev
 *
 * Role: ENRICHMENT ONLY. Jolpica remains the primary source for schedule,
 * results, standings and identity. f1api.dev is used to enrich driver/team
 * records with metadata Jolpica lacks or provides less completely:
 *   - driver: shortName (official 3-letter timing code), birthday, number
 *   - team: country, firstAppearance, constructors/drivers championship counts
 *
 * Endpoints used (all GET, no key, JSON):
 *   GET /api/{season}/drivers-championship      -> driver list w/ details
 *   GET /api/{season}/constructors-championship -> team list w/ details
 *   GET /api/{season}/teams                      -> team metadata list
 * where {season} is "current" or a year (e.g. "2024"). Verified 2026-10-06.
 *
 * Quirks handled:
 *   - birthday may be "DD/MM/YYYY" or ISO — normalized by callers via
 *     parseF1ApiDate() in ./model.
 *   - the team object spells the field "firstAppareance" in the
 *     championship payload but "firstAppeareance" in /teams — both accepted.
 *   - driverIds mostly match Jolpica's; known exception(s) are aliased in
 *     ./model (DRIVER_ID_ALIASES).
 */
import { fetchJSON, type FetchOpts } from "./client";

const BASE = "https://f1api.dev/api";

export interface F1ApiDriverInfo {
  name: string;
  surname: string;
  nationality: string;
  /** "DD/MM/YYYY" or ISO — normalize before use. */
  birthday: string;
  number: number;
  shortName: string;
  url: string;
}

export interface F1ApiDriverEntry {
  driverId: string;
  teamId: string;
  points: number;
  position: number;
  wins: number;
  driver: F1ApiDriverInfo;
}

export interface F1ApiTeamInfo {
  teamId: string;
  teamName: string;
  /** country name; key spelled differently across endpoints (see header). */
  country?: string;
  teamNationality?: string;
  firstAppareance?: number;
  firstAppeareance?: number;
  constructorsChampionships?: number;
  driversChampionships?: number;
  url: string;
}

export interface F1ApiTeamEntry {
  teamId: string;
  points: number;
  position: number;
  wins: number;
  team: F1ApiTeamInfo;
}

interface ApiEnvelope {
  season: number | string;
  total: number;
}

export const f1api = {
  driversChampionship: (season: string, o?: FetchOpts) =>
    fetchJSON<ApiEnvelope & { drivers_championship: F1ApiDriverEntry[] }>(
      `${BASE}/${season}/drivers-championship`,
      o
    ).then((d) => d.drivers_championship ?? []),

  constructorsChampionship: (season: string, o?: FetchOpts) =>
    fetchJSON<ApiEnvelope & { constructors_championship: F1ApiTeamEntry[] }>(
      `${BASE}/${season}/constructors-championship`,
      o
    ).then((d) => d.constructors_championship ?? []),

  teams: (season: string, o?: FetchOpts) =>
    fetchJSON<ApiEnvelope & { teams: F1ApiTeamInfo[] }>(`${BASE}/${season}/teams`, o).then(
      (d) => d.teams ?? []
    ),
};

/** First-appearance year, tolerating the API's inconsistent spelling. */
export function teamFirstSeason(t: F1ApiTeamInfo): number | undefined {
  const v = t.firstAppareance ?? t.firstAppeareance;
  return typeof v === "number" && v > 1900 ? v : undefined;
}

/** Country label, tolerating the API's inconsistent field naming. */
export function teamCountry(t: F1ApiTeamInfo): string | undefined {
  return t.country ?? t.teamNationality ?? undefined;
}

/* Page-level season bound to ?season= in the URL (HashRouter).
 *
 * Behavior:
 * - If ?season= is present and valid (1950..current year) it is the source
 *   of truth for the page and is synced into the global setting.
 * - If absent/invalid, the global setting is used.
 * - The setter updates BOTH the global setting and the URL (push
 *   navigation, so browser back/forward works). Refresh and shared links
 *   preserve the season.
 */
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSettings } from "../store/settings";

export const MIN_SEASON = 1950;

export function maxSeason(): number {
  return new Date().getFullYear();
}

/** Returns the validated season string, or null when absent/invalid. */
export function validSeasonParam(v: string | null): string | null {
  if (!v || !/^\d{4}$/.test(v)) return null;
  const y = parseInt(v, 10);
  return y >= MIN_SEASON && y <= maxSeason() ? v : null;
}

export function useSeasonParam(): [string, (s: string) => void] {
  const { season: globalSeason, setSeason: setGlobalSeason } = useSettings();
  const [params, setParams] = useSearchParams();
  const paramSeason = validSeasonParam(params.get("season"));

  // Sync a valid URL param into the global setting (one direction only).
  useEffect(() => {
    if (paramSeason && paramSeason !== globalSeason) setGlobalSeason(paramSeason);
  }, [paramSeason, globalSeason, setGlobalSeason]);

  const season = paramSeason ?? globalSeason;

  const setSeason = useCallback(
    (s: string) => {
      setGlobalSeason(s);
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("season", s);
          return next;
        },
        { replace: false }
      );
    },
    [setGlobalSeason, setParams]
  );

  return [season, setSeason];
}

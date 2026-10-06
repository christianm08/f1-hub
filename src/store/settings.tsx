/* Global settings: theme, language, season, units, favorites, notifications prefs.
   Persisted in localStorage. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Lang } from "../i18n/dict";

export type Theme = "dark" | "light";
export type Units = "metric" | "imperial";

export interface FavItem {
  kind: "driver" | "team" | "circuit";
  id: string;
  label: string;
}

interface Settings {
  theme: Theme;
  lang: Lang;
  season: string;
  units: Units;
  favorites: FavItem[];
  favDriverId: string;
  favTeamId: string;
  autoRefresh: boolean;
  notifPrefs: Record<string, boolean>;
  t: (k: DictKey) => string;
  setTheme: (v: Theme) => void;
  setLang: (v: Lang) => void;
  setSeason: (v: string) => void;
  setUnits: (v: Units) => void;
  toggleFav: (item: FavItem) => boolean;
  isFav: (kind: FavItem["kind"], id: string) => boolean;
  setFavDriverId: (v: string) => void;
  setFavTeamId: (v: string) => void;
  setAutoRefresh: (v: boolean) => void;
  setNotifPref: (k: string, v: boolean) => void;
}

const Ctx = createContext<Settings | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem("f1hub:" + key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem("f1hub:" + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => load("theme", "dark"));
  const [lang, setLangState] = useState<Lang>(() => load("lang", "it"));
  const [season, setSeasonState] = useState<string>(() => load("season", new Date().getFullYear().toString()));
  const [units, setUnitsState] = useState<Units>(() => load("units", "metric"));
  const [favorites, setFavorites] = useState<FavItem[]>(() => load("favorites", []));
  const [favDriverId, setFavDriverIdState] = useState<string>(() => load("favDriver", ""));
  const [favTeamId, setFavTeamIdState] = useState<string>(() => load("favTeam", ""));
  const [autoRefresh, setAutoRefreshState] = useState<boolean>(() => load("autoRefresh", true));
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => load("notifs", {}));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0e14" : "#f4f6fa");
    save("theme", theme);
  }, [theme]);

  const setTheme = useCallback((v: Theme) => setThemeState(v), []);
  const setLang = useCallback((v: Lang) => { setLangState(v); save("lang", v); }, []);
  const setSeason = useCallback((v: string) => { setSeasonState(v); save("season", v); }, []);
  const setUnits = useCallback((v: Units) => { setUnitsState(v); save("units", v); }, []);
  const setFavDriverId = useCallback((v: string) => { setFavDriverIdState(v); save("favDriver", v); }, []);
  const setFavTeamId = useCallback((v: string) => { setFavTeamIdState(v); save("favTeam", v); }, []);
  const setAutoRefresh = useCallback((v: boolean) => { setAutoRefreshState(v); save("autoRefresh", v); }, []);
  const setNotifPref = useCallback((k: string, v: boolean) => {
    setNotifPrefs((p) => { const n = { ...p, [k]: v }; save("notifs", n); return n; });
  }, []);

  const toggleFav = useCallback((item: FavItem): boolean => {
    let added = false;
    setFavorites((favs) => {
      const exists = favs.some((f) => f.kind === item.kind && f.id === item.id);
      added = !exists;
      const next = exists ? favs.filter((f) => !(f.kind === item.kind && f.id === item.id)) : [...favs, item];
      save("favorites", next);
      return next;
    });
    return added;
  }, []);

  const isFav = useCallback(
    (kind: FavItem["kind"], id: string) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites]
  );

  const t = useCallback((k: DictKey) => dict[lang][k] ?? k, [lang]);

  const value = useMemo<Settings>(
    () => ({
      theme, lang, season, units, favorites, favDriverId, favTeamId, autoRefresh, notifPrefs,
      t, setTheme, setLang, setSeason, setUnits, toggleFav, isFav,
      setFavDriverId, setFavTeamId, setAutoRefresh, setNotifPref,
    }),
    [theme, lang, season, units, favorites, favDriverId, favTeamId, autoRefresh, notifPrefs, t,
      setTheme, setLang, setSeason, setUnits, toggleFav, isFav, setFavDriverId, setFavTeamId, setAutoRefresh, setNotifPref]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings outside provider");
  return ctx;
}

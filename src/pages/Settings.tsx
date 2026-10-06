/* Settings: theme, language, default season, units, favourites, refresh, notifications (UI only). */
import { useEffect, useState } from "react";
import { jolpica, type ConstructorRef, type DriverRef } from "../api/jolpica";
import { clearCache } from "../api/client";
import { useSettings } from "../store/settings";
import { Badge, PageHeader } from "../components/ui";

const MIN_SEASON = "2014";

const NOTIF_KEYS = ["notif_quali", "notif_race", "notif_results", "notif_news", "notif_driver", "notif_team"] as const;

export default function Settings() {
  const {
    t, lang, setLang, theme, setTheme, season, setSeason, units, setUnits,
    favorites, toggleFav, favDriverId, setFavDriverId, favTeamId, setFavTeamId,
    autoRefresh, setAutoRefresh, notifPrefs, setNotifPref,
  } = useSettings();
  const [seasons, setSeasons] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<DriverRef[]>([]);
  const [teams, setTeams] = useState<ConstructorRef[]>([]);
  const [cacheMsg, setCacheMsg] = useState("");

  useEffect(() => {
    jolpica.seasons().then((all) => setSeasons(all.filter((s) => s >= MIN_SEASON).reverse())).catch(() => setSeasons([]));
  }, []);

  useEffect(() => {
    Promise.all([jolpica.drivers(season).catch(() => []), jolpica.constructors(season).catch(() => [])])
      .then(([d, c]) => { setDrivers(d); setTeams(c); });
  }, [season]);

  const onClearCache = () => {
    clearCache();
    setCacheMsg(t("cache_cleared"));
    setTimeout(() => setCacheMsg(""), 2500);
  };

  return (
    <div>
      <PageHeader title={t("nav_settings")} />

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("settings_theme")} / {t("settings_language")}</h3>
          <div className="field">
            <label htmlFor="s-theme">{t("settings_theme")}</label>
            <select id="s-theme" value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light")}>
              <option value="dark">{t("theme_dark")}</option>
              <option value="light">{t("theme_light")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-lang">{t("settings_language")}</label>
            <select id="s-lang" value={lang} onChange={(e) => setLang(e.target.value as "it" | "en")}>
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-units">{t("settings_units")}</label>
            <select id="s-units" value={units} onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}>
              <option value="metric">{t("units_metric")}</option>
              <option value="imperial">{t("units_imperial")}</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("settings_season")}</h3>
          <div className="field">
            <label htmlFor="s-season">{t("settings_season")}</label>
            <select id="s-season" value={season} onChange={(e) => setSeason(e.target.value)}>
              {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-favd">{t("settings_fav_driver")}</label>
            <select id="s-favd" value={favDriverId} onChange={(e) => setFavDriverId(e.target.value)}>
              <option value="">—</option>
              {drivers.map((d) => (
                <option key={d.driverId} value={d.driverId}>{d.givenName} {d.familyName}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-favt">{t("settings_fav_team")}</label>
            <select id="s-favt" value={favTeamId} onChange={(e) => setFavTeamId(e.target.value)}>
              <option value="">—</option>
              {teams.map((c) => (
                <option key={c.constructorId} value={c.constructorId}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("settings_notifications")}</h3>
          <p className="small muted">{t("settings_notifications_sub")}</p>
          {NOTIF_KEYS.map((key) => (
            <label key={key} className="switch-row">
              <span>{t(key)}</span>
              <input
                type="checkbox"
                checked={!!notifPrefs[key]}
                onChange={(e) => setNotifPref(key, e.target.checked)}
                aria-label={t(key)}
              />
            </label>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>⭐ {t("favorites")}</h3>
          {favorites.length === 0 ? (
            <p className="muted small">{t("no_favorites")}</p>
          ) : (
            favorites.map((f) => (
              <div key={`${f.kind}-${f.id}`} className="spread" style={{ padding: "6px 0" }}>
                <span><Badge>{f.kind}</Badge> {f.label}</span>
                <button className="btn ghost small" onClick={() => toggleFav(f)} aria-label={t("removed_fav")}>✕</button>
              </div>
            ))
          )}
          <div className="mt">
            <label className="switch-row">
              <span>{t("settings_autorefresh")}<br /><span className="small muted">{t("settings_autorefresh_sub")}</span></span>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} aria-label={t("settings_autorefresh")} />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("settings_cache")}</h3>
          <button className="btn" onClick={onClearCache}>{t("clear_cache")}</button>
          {cacheMsg && <p className="small" style={{ color: "var(--ok)", margin: "8px 0 0" }}>{cacheMsg}</p>}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("settings_about")}</h3>
          <p className="small muted" style={{ marginBottom: 0 }}>{t("about_text")}</p>
        </div>
      </div>
    </div>
  );
}

/* Settings: theme, language, default season, units, favourites, refresh, notifications (UI only). */
import { useEffect, useState } from "react";
import { Bell, CalendarDays, Database, Heart, Info, Palette, RefreshCw, X } from "lucide-react";
import { jolpica, type ConstructorRef, type DriverRef } from "../api/jolpica";
import { clearCache } from "../api/client";
import { clearModelCache } from "../api/model";
import { useSettings } from "../store/settings";
import { Badge, PageHeader } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";

const NOTIF_KEYS = ["notif_quali", "notif_race", "notif_results", "notif_news", "notif_driver", "notif_team"] as const;

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="card-title">
      <span className="settings-ico" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </h3>
  );
}

export default function Settings() {
  const {
    t, lang, setLang, theme, setTheme, season, setSeason, units, setUnits,
    favorites, toggleFav, favDriverId, setFavDriverId, favTeamId, setFavTeamId,
    autoRefresh, setAutoRefresh, notifPrefs, setNotifPref,
  } = useSettings();
  const [drivers, setDrivers] = useState<DriverRef[]>([]);
  const [teams, setTeams] = useState<ConstructorRef[]>([]);
  const [cacheMsg, setCacheMsg] = useState("");

  useEffect(() => {
    Promise.all([jolpica.drivers(season).catch(() => []), jolpica.constructors(season).catch(() => [])])
      .then(([d, c]) => { setDrivers(d); setTeams(c); });
  }, [season]);

  const onClearCache = () => {
    clearCache();
    clearModelCache();
    setCacheMsg(t("cache_cleared"));
    setTimeout(() => setCacheMsg(""), 2500);
  };

  return (
    <div>
      <PageHeader title={t("nav_settings")} />

      <div className="grid grid-2">
        <div className="card">
          <CardTitle icon={<Palette />}>{t("settings_theme")} / {t("settings_language")}</CardTitle>
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
          <CardTitle icon={<CalendarDays />}>{t("settings_season")}</CardTitle>
          <div className="field">
            <label htmlFor="s-season">{t("settings_season")}</label>
            <SeasonSelect id="s-season" value={season} onChange={setSeason} />
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
          <CardTitle icon={<Bell />}>{t("settings_notifications")}</CardTitle>
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
          <CardTitle icon={<Heart />}>{t("favorites")}</CardTitle>
          {favorites.length === 0 ? (
            <p className="muted small">{t("no_favorites")}</p>
          ) : (
            favorites.map((f) => (
              <div key={`${f.kind}-${f.id}`} className="spread" style={{ padding: "6px 0" }}>
                <span className="row"><Badge>{f.kind}</Badge><span>{f.label}</span></span>
                <button className="btn ghost small danger-ghost" onClick={() => toggleFav(f)} aria-label={t("removed_fav")}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))
          )}
          <div className="mt">
            <label className="switch-row">
              <span className="row">
                <span className="settings-ico neutral" aria-hidden="true"><RefreshCw /></span>
                <span>{t("settings_autorefresh")}<br /><span className="small muted">{t("settings_autorefresh_sub")}</span></span>
              </span>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} aria-label={t("settings_autorefresh")} />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <CardTitle icon={<Database />}>{t("settings_cache")}</CardTitle>
          <button className="btn" onClick={onClearCache}>{t("clear_cache")}</button>
          {cacheMsg && <p className="small" style={{ color: "var(--live)", margin: "8px 0 0" }}>{cacheMsg}</p>}
        </div>
        <div className="card">
          <CardTitle icon={<Info />}>{t("settings_about")}</CardTitle>
          <p className="small muted" style={{ marginBottom: 0 }}>{t("about_text")}</p>
        </div>
      </div>
    </div>
  );
}

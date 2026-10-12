/* Settings: theme, language, default season, units, favourites, refresh, notifications (UI only). */
import { useEffect, useState } from "react";
import { jolpica, type ConstructorRef, type DriverRef } from "../api/jolpica";
import { clearCache } from "../api/client";
import { clearModelCache } from "../api/model";
import { useSettings } from "../store/settings";
import { Badge, PageHeader } from "../components/ui";
import { MButton, MCard, MIcon, MIconButton, MList, MListItem, MSelect, type MIconName } from "../design";
import { SeasonSelect } from "../components/SeasonSelect";

const NOTIF_KEYS = ["notif_quali", "notif_race", "notif_results", "notif_news", "notif_driver", "notif_team"] as const;

function CardTitle({ icon, children }: { icon: MIconName; children: React.ReactNode }) {
  return (
    <h3 className="m3-card-title">
      <MIcon name={icon} />
      <span>{children}</span>
    </h3>
  );
}

/** M3 switch (the design library has no switch component). */
function MSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="m3-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="m3-switch__thumb" aria-hidden="true" />
    </button>
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

      <div className="m3-grid m3-grid--2">
        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="palette">{t("settings_theme")} / {t("settings_language")}</CardTitle>
          <div className="m3-setting-field">
            <span id="s-theme-lbl">{t("settings_theme")}</span>
            <MSelect
              label={t("settings_theme")}
              value={theme}
              onChange={(v) => setTheme(v as "dark" | "light")}
              leadingIcon={theme === "dark" ? "dark_mode" : "light_mode"}
              options={[
                { value: "dark", label: t("theme_dark") },
                { value: "light", label: t("theme_light") },
              ]}
            />
          </div>
          <div className="m3-setting-field">
            <span>{t("settings_language")}</span>
            <MSelect
              label={t("settings_language")}
              value={lang}
              onChange={(v) => setLang(v as "it" | "en")}
              leadingIcon="language"
              options={[
                { value: "it", label: "Italiano" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div className="m3-setting-field" style={{ marginBottom: 0 }}>
            <span>{t("settings_units")}</span>
            <MSelect
              label={t("settings_units")}
              value={units}
              onChange={(v) => setUnits(v as "metric" | "imperial")}
              leadingIcon="speed"
              options={[
                { value: "metric", label: t("units_metric") },
                { value: "imperial", label: t("units_imperial") },
              ]}
            />
          </div>
        </MCard>

        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="calendar_month">{t("settings_season")}</CardTitle>
          <div className="m3-setting-field">
            <span>{t("settings_season")}</span>
            <div><SeasonSelect id="s-season" value={season} onChange={setSeason} /></div>
          </div>
          <div className="m3-setting-field">
            <span>{t("settings_fav_driver")}</span>
            <MSelect
              label={t("settings_fav_driver")}
              value={favDriverId}
              onChange={setFavDriverId}
              leadingIcon="person"
              options={[
                { value: "", label: "—" },
                ...drivers.map((d) => ({ value: d.driverId, label: `${d.givenName} ${d.familyName}` })),
              ]}
            />
          </div>
          <div className="m3-setting-field" style={{ marginBottom: 0 }}>
            <span>{t("settings_fav_team")}</span>
            <MSelect
              label={t("settings_fav_team")}
              value={favTeamId}
              onChange={setFavTeamId}
              leadingIcon="corporate_fare"
              options={[
                { value: "", label: "—" },
                ...teams.map((c) => ({ value: c.constructorId, label: c.name })),
              ]}
            />
          </div>
        </MCard>

        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="notifications">{t("settings_notifications")}</CardTitle>
          <p className="m3-muted" style={{ fontSize: "0.88rem", marginTop: 0 }}>{t("settings_notifications_sub")}</p>
          {NOTIF_KEYS.map((key) => (
            <div key={key} className="m3-switch-row">
              <span style={{ fontSize: "0.95rem" }}>{t(key)}</span>
              <MSwitch checked={!!notifPrefs[key]} onChange={(v) => setNotifPref(key, v)} label={t(key)} />
            </div>
          ))}
        </MCard>

        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="favorite">{t("favorites")}</CardTitle>
          {favorites.length === 0 ? (
            <p className="m3-muted" style={{ fontSize: "0.88rem" }}>{t("no_favorites")}</p>
          ) : (
            <MList ariaLabel={t("favorites")}>
              {favorites.map((f) => (
                <MListItem
                  key={`${f.kind}-${f.id}`}
                  headline={f.label}
                  leading={<Badge>{f.kind}</Badge>}
                  trailing={
                    <MIconButton icon="close" label={t("removed_fav")} onClick={() => toggleFav(f)} />
                  }
                />
              ))}
            </MList>
          )}
          <div style={{ marginTop: 8 }}>
            <div className="m3-switch-row">
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <MIcon name="refresh" />
                <span>
                  {t("settings_autorefresh")}
                  <br />
                  <span className="m3-muted" style={{ fontSize: "0.82rem" }}>{t("settings_autorefresh_sub")}</span>
                </span>
              </span>
              <MSwitch checked={autoRefresh} onChange={setAutoRefresh} label={t("settings_autorefresh")} />
            </div>
          </div>
        </MCard>
      </div>

      <div className="m3-grid m3-grid--2" style={{ marginTop: 16 }}>
        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="database">{t("settings_cache")}</CardTitle>
          <MButton variant="outlined" onClick={onClearCache}>{t("clear_cache")}</MButton>
          {cacheMsg && <p style={{ color: "var(--md-sys-color-primary)", margin: "8px 0 0", fontSize: "0.88rem" }}>{cacheMsg}</p>}
        </MCard>
        <MCard variant="outlined" className="m3-float-panel">
          <CardTitle icon="info">{t("settings_about")}</CardTitle>
          <p className="m3-muted" style={{ marginBottom: 0, fontSize: "0.9rem" }}>{t("about_text")}</p>
        </MCard>
      </div>
    </div>
  );
}

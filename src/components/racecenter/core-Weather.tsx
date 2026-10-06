/* Race Center core — weather panel: current conditions + session evolution
   sparklines. Honest "n/d" when data is missing. Owned by the race-center
   core agent. */
import { CloudRain, Droplets, Gauge, Navigation, Thermometer, Wind } from "lucide-react";
import type { WeatherPoint } from "../../api/openf1model";
import { useSettings } from "../../store/settings";
import { Sparkline } from "../charts";
import { fmtTime } from "./core-shared";
import "./core.css";

const COMPASS_IT = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const COMPASS_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function compass(deg: number | null, lang: string): string {
  if (deg == null) return "n/d";
  const dirs = lang === "it" ? COMPASS_IT : COMPASS_EN;
  return dirs[Math.round(deg / 45) % 8];
}

interface Props {
  latest: WeatherPoint | null;
  series: WeatherPoint[];
  hasWeather: boolean;
}

export function WeatherPanel({ latest, series, hasWeather }: Props) {
  const { t, lang, units } = useSettings();
  const imp = units === "imperial";
  const temp = (c: number | null) => (c == null ? "n/d" : imp ? `${((c * 9) / 5 + 32).toFixed(1)}°F` : `${c.toFixed(1)}°C`);
  const wind = (ms: number | null) =>
    ms == null ? "n/d" : imp ? `${(ms * 2.237).toFixed(1)} mph` : `${(ms * 3.6).toFixed(1)} km/h`;

  const airSeries = series.map((p) => p.air).filter((v): v is number => v != null);
  const trackSeries = series.map((p) => p.track).filter((v): v is number => v != null);

  return (
    <section className="rc-panel" aria-label={t("weather")}>
      <div className="rc-panel-head">
        <h3><Thermometer aria-hidden="true" />{t("rc_weather_now")}</h3>
      </div>
      <div className="rc-panel-body">
        {!hasWeather || !latest ? (
          <p className="rc-nd" style={{ margin: 0 }}>{t("not_available")}</p>
        ) : (
          <>
            <div className="rc-wx-grid">
              <div className="rc-wx-cell">
                <div className="lbl"><Thermometer aria-hidden="true" />{t("air")}</div>
                <div className="val">{temp(latest.air)}</div>
              </div>
              <div className="rc-wx-cell">
                <div className="lbl"><Gauge aria-hidden="true" />{t("track")}</div>
                <div className="val">{temp(latest.track)}</div>
              </div>
              <div className="rc-wx-cell">
                <div className="lbl"><Droplets aria-hidden="true" />{t("humidity")}</div>
                <div className="val">{latest.humidity != null ? <>{latest.humidity.toFixed(0)}<small>%</small></> : "n/d"}</div>
              </div>
              <div className="rc-wx-cell">
                <div className="lbl"><Gauge aria-hidden="true" />{t("rc_pressure")}</div>
                <div className="val">{latest.pressure != null ? <>{latest.pressure.toFixed(0)}<small>hPa</small></> : "n/d"}</div>
              </div>
              <div className="rc-wx-cell">
                <div className="lbl"><Wind aria-hidden="true" />{t("wind")}</div>
                <div className="val">{wind(latest.windSpeed)}</div>
              </div>
              <div className="rc-wx-cell">
                <div className="lbl"><Navigation aria-hidden="true" />{t("rc_wind_dir")}</div>
                <div className="val">
                  {latest.windDir != null ? <>{compass(latest.windDir, lang)}<small>{latest.windDir.toFixed(0)}°</small></> : "n/d"}
                </div>
              </div>
            </div>
            <p className="small" style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 0", color: latest.rain ? "var(--info)" : "var(--text-3)" }}>
              <CloudRain aria-hidden="true" size={14} />
              {latest.rain ? t("rc_rain_yes") : t("rc_rain_no")}
              <span className="rc-nd" style={{ marginLeft: "auto" }}>{fmtTime(new Date(latest.time), lang)}</span>
            </p>
            {(airSeries.length > 1 || trackSeries.length > 1) && (
              <div style={{ marginTop: 12 }}>
                <p className="rc-nd" style={{ margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
                  {t("rc_weather_evolution")}
                </p>
                {airSeries.length > 1 && (
                  <div style={{ marginBottom: 8 }}>
                    <span className="small muted">{t("air")}</span>
                    <Sparkline values={airSeries} width={300} height={52} stroke="#38bdf8" ariaLabel={t("air")} />
                  </div>
                )}
                {trackSeries.length > 1 && (
                  <div>
                    <span className="small muted">{t("track")}</span>
                    <Sparkline values={trackSeries} width={300} height={52} stroke="#f59e0b" ariaLabel={t("track")} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

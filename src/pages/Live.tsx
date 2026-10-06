/* Race Center: real OpenF1 live data when a session is in progress, honest fallback otherwise.
   Auto-refreshes the tower every 15 s when live. Styled like a professional timing screen. */
import { useEffect, useState } from "react";
import {
  Activity, CloudRain, Droplets, Flag, Gauge, RefreshCw, Satellite,
  Thermometer, Timer, Wind, Wrench,
} from "lucide-react";
import { findLiveSession, openf1, formatLapTime } from "../api/openf1";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, PageHeader, Skeleton, fmtDateTime } from "../components/ui";

interface LeaderRow {
  num: number;
  pos: number;
  acronym: string;
  fullName: string;
  team: string;
  color: string;
  gap: string | null;
  interval: string | null;
  bestLap: string | null;
  pits: number;
  tyre: string | null;
  tyreAge: number | null;
}

interface LiveData {
  sessionName: string;
  sessionType: string;
  location: string;
  dateStart: string;
  flag: string | null;
  air: number | null;
  track: number | null;
  humidity: number | null;
  rain: number | null;
  wind: number | null;
  leaders: LeaderRow[];
  control: { category: string; message: string; flag: string | null; date: string }[];
}

async function loadLive(): Promise<LiveData> {
  const session = await findLiveSession();
  if (!session) {
    const err = new Error("no_live") as Error & { code?: string };
    err.code = "NO_LIVE";
    throw err;
  }
  const key = session.session_key;
  const [drivers, positions, intervals, rc, pits, weather, bestLaps, stints] = await Promise.all([
    openf1.drivers(key).catch(() => []),
    openf1.latestPositions(key).catch(() => []),
    openf1.latestIntervals(key).catch(() => new Map()),
    openf1.raceControl(key).catch(() => []),
    openf1.pits(key).catch(() => []),
    openf1.weather(key).catch(() => null),
    openf1.bestLaps(key).catch(() => []),
    openf1.stints(key).catch(() => []),
  ]);

  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  const bestByNum = new Map(bestLaps.map((b) => [b.driver_number, b]));
  const pitCount = new Map<number, number>();
  for (const p of pits) pitCount.set(p.driver_number, (pitCount.get(p.driver_number) ?? 0) + 1);
  const stintByNum = new Map<number, { compound: string; age: number }>();
  for (const s of stints) {
    const cur = stintByNum.get(s.driver_number);
    if (!cur || s.lap_end == null || (cur && s.lap_start > cur.age)) {
      stintByNum.set(s.driver_number, { compound: s.compound, age: s.tyre_age_at_start });
    }
  }

  const flagMsg = [...rc].reverse().find((m) => m.flag && m.flag !== "CLEAR");

  return {
    sessionName: session.session_name,
    sessionType: session.session_type,
    location: session.location,
    dateStart: session.date_start,
    flag: flagMsg?.flag ?? null,
    air: weather?.air_temperature ?? null,
    track: weather?.track_temperature ?? null,
    humidity: weather?.humidity ?? null,
    rain: weather?.rainfall ?? null,
    wind: weather?.wind_speed ?? null,
    leaders: positions.map((p) => {
      const d = byNum.get(p.driver_number);
      const iv = intervals.get(p.driver_number);
      const best = bestByNum.get(p.driver_number);
      const st = stintByNum.get(p.driver_number);
      return {
        num: p.driver_number,
        pos: p.position,
        acronym: d?.name_acronym ?? `#${p.driver_number}`,
        fullName: d?.full_name ?? "",
        team: d?.team_name ?? "",
        color: d?.team_colour ? `#${d.team_colour}` : "#8892a3",
        gap: iv?.gap_to_leader ?? null,
        interval: iv?.interval ?? null,
        bestLap: best ? formatLapTime(best.lap_duration) : null,
        pits: pitCount.get(p.driver_number) ?? 0,
        tyre: st?.compound ?? null,
        tyreAge: st?.age ?? null,
      };
    }),
    control: [...rc].reverse().slice(0, 14).map((m) => ({
      category: m.category,
      message: m.message,
      flag: m.flag,
      date: m.date,
    })),
  };
}

const REFRESH_MS = 15000;

function FlagStrip({ flag, t }: { flag: string | null; t: (k: "flag_green" | "flag_yellow" | "flag_red" | "flag_chequered") => string }) {
  const f = (flag ?? "").toUpperCase();
  if (!flag || f === "GREEN" || f === "CLEAR") {
    return (
      <div className="flag-strip green" role="status">
        <Flag aria-hidden="true" /> {t("flag_green")}
      </div>
    );
  }
  if (f === "RED") {
    return (
      <div className="flag-strip red" role="status">
        <Flag aria-hidden="true" /> {t("flag_red")}
      </div>
    );
  }
  if (f.includes("YELLOW")) {
    return (
      <div className="flag-strip yellow" role="status">
        <Flag aria-hidden="true" /> {t("flag_yellow")}
      </div>
    );
  }
  if (f === "CHEQUERED" || f === "FINISH") {
    return (
      <div className="flag-strip" role="status">
        <Flag aria-hidden="true" /> {t("flag_chequered")}
      </div>
    );
  }
  return (
    <div className="flag-strip yellow" role="status">
      <Flag aria-hidden="true" /> {flag}
    </div>
  );
}

const TYRE_LETTER: Record<string, string> = { SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W" };

export default function Live() {
  const { t, lang, autoRefresh } = useSettings();
  const { status, data, retry } = useApi(loadLive, []);
  const [now, setNow] = useState(Date.now());

  const isLive = status === "ok" && !!data;

  useEffect(() => {
    if (!isLive || !autoRefresh) return;
    const id = setInterval(() => {
      setNow(Date.now());
      retry();
    }, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, autoRefresh]);

  return (
    <div>
      <PageHeader
        title={t("nav_live")}
        sub={isLive && data ? `${data.sessionName} · ${data.location} · ${fmtDateTime(new Date(data.dateStart), lang)}` : undefined}
        right={isLive ? <Badge kind="live">● LIVE</Badge> : undefined}
      />

      {status === "loading" && (
        <div className="tower" aria-busy="true">
          <div className="tower-head"><h3><Activity aria-hidden="true" />{t("live_positions")}</h3></div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} h={30} />
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <>
          <EmptyState
            icon={<Satellite aria-hidden="true" />}
            title={t("live_unavailable_title")}
            body={t("live_unavailable_body")}
          />
          <div className="mt" style={{ textAlign: "center" }}>
            <button className="btn" onClick={retry}><RefreshCw aria-hidden="true" />{t("retry")}</button>
          </div>
        </>
      )}

      {status === "ok" && data && (
        <>
          <div className="tower mb">
            <FlagStrip flag={data.flag} t={t} />
            <div className="tower-head">
              <h3><Activity aria-hidden="true" />{t("live_positions")}</h3>
              <span className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="mono">{new Date(now).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}</span>
                <button className="btn ghost small" onClick={retry} aria-label={t("refresh")}>
                  <RefreshCw aria-hidden="true" />{t("refresh")}
                </button>
              </span>
            </div>
            {data.leaders.length === 0 ? (
              <p className="muted" style={{ padding: "20px 16px" }}>{t("not_available")}</p>
            ) : (
              <div className="tower-scroll">
                <table className="tower-tbl">
                  <thead>
                    <tr>
                      <th scope="col">Pos</th>
                      <th scope="col">{t("driver")}</th>
                      <th scope="col">{t("tyre")}</th>
                      <th scope="col" className="r">{t("gap")}</th>
                      <th scope="col" className="r">Int</th>
                      <th scope="col" className="r">{t("best_lap")}</th>
                      <th scope="col" className="r">{t("pit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaders.map((l) => (
                      <tr key={l.num} className={l.pos === 1 ? "p1" : ""}>
                        <td className="tpos" style={{ borderLeftColor: l.color }}>{l.pos}</td>
                        <td className="tdriver">
                          {l.acronym}
                          <span className="tname">{l.fullName}</span>
                        </td>
                        <td>
                          {l.tyre ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <i className={`tyre ${TYRE_LETTER[l.tyre] ?? ""}`} aria-label={`${t("tyre")}: ${l.tyre}`}>
                                {TYRE_LETTER[l.tyre] ?? "?"}
                              </i>
                              <span className="mono small muted">{l.tyreAge ?? "–"}</span>
                            </span>
                          ) : (
                            <span className="muted">–</span>
                          )}
                        </td>
                        <td className="tgap r">{l.pos === 1 ? <span className="tleader">LEADER</span> : (l.gap ?? "–")}</td>
                        <td className="tint r">{l.interval ?? "–"}</td>
                        <td className="tbest r">{l.bestLap ?? "–"}</td>
                        <td className="r"><span className="pit-dot" title={t("pit")}>{l.pits}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="live-grid">
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                <Flag aria-hidden="true" />{t("live_timeline")}
              </h2>
              {data.control.length === 0 ? (
                <p className="muted">{t("not_available")}</p>
              ) : (
                <div className="timeline" aria-live="polite">
                  {data.control.map((m, i) => {
                    const f = (m.flag ?? "").toUpperCase();
                    const cls = f === "RED" ? "red" : f.includes("YELLOW") ? "flag" : f === "GREEN" || f === "CLEAR" ? "green" : m.category === "Pit" ? "pit" : "";
                    return (
                      <div className={`tl-item ${cls}`} key={i}>
                        <span className="tl-time">{new Date(m.date).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}</span>
                        <b style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.category}</b>
                        <p style={{ margin: "4px 0 0", color: "var(--text-2)" }}>{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                <Gauge aria-hidden="true" />{t("live_info")}
              </h2>
              <div className="card" style={{ marginBottom: 14 }}>
                <h3 className="card-title"><Thermometer aria-hidden="true" />{t("weather")}</h3>
                <div className="session-meta" style={{ padding: 0 }}>
                  <div className="sm"><span>{t("air")}</span><b>{data.air != null ? `${data.air.toFixed(1)}°C` : "–"}</b></div>
                  <div className="sm"><span>{t("track")}</span><b>{data.track != null ? `${data.track.toFixed(1)}°C` : "–"}</b></div>
                  <div className="sm"><span>{t("humidity")}</span><b>{data.humidity != null ? `${data.humidity.toFixed(0)}%` : "–"}</b></div>
                  <div className="sm"><span><Wind aria-hidden="true" style={{ width: 11, height: 11, verticalAlign: -1 }} /> {t("wind")}</span><b>{data.wind != null ? `${data.wind.toFixed(1)}` : "–"}</b></div>
                </div>
                {(data.rain ?? 0) > 0 && (
                  <p className="small" style={{ color: "var(--info)", display: "flex", alignItems: "center", gap: 6, margin: "10px 0 0" }}>
                    <CloudRain aria-hidden="true" />{t("rain")}
                  </p>
                )}
              </div>
              <div className="card">
                <h3 className="card-title"><Timer aria-hidden="true" />{t("session")}</h3>
                <dl className="kv">
                  <dt>{t("session")}</dt><dd>{data.sessionName}</dd>
                  <dt>{t("circuit")}</dt><dd>{data.location}</dd>
                  <dt>{t("last_updated")}</dt>
                  <dd className="mono">{new Date(now).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}</dd>
                </dl>
                <p className="live-note mt">
                  <Wrench aria-hidden="true" />
                  <span>{t("settings_autorefresh_sub")}</span>
                </p>
              </div>
            </div>
          </div>
          <p className="small muted mt" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Droplets aria-hidden="true" style={{ width: 13, height: 13 }} />
            {t("about_text")}
          </p>
        </>
      )}
    </div>
  );
}

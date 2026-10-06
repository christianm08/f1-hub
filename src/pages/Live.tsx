/* Race Center: real OpenF1 live data when a session is in progress, honest fallback otherwise.
   Auto-refreshes the tower every 15 s when live. */
import { useEffect, useState } from "react";
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
}

interface LiveData {
  sessionName: string;
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
  const [drivers, positions, intervals, rc, pits, weather, bestLaps] = await Promise.all([
    openf1.drivers(key).catch(() => []),
    openf1.latestPositions(key).catch(() => []),
    openf1.latestIntervals(key).catch(() => new Map()),
    openf1.raceControl(key).catch(() => []),
    openf1.pits(key).catch(() => []),
    openf1.weather(key).catch(() => null),
    openf1.bestLaps(key).catch(() => []),
  ]);

  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  const bestByNum = new Map(bestLaps.map((b) => [b.driver_number, b]));
  const pitCount = new Map<number, number>();
  for (const p of pits) pitCount.set(p.driver_number, (pitCount.get(p.driver_number) ?? 0) + 1);

  const flagMsg = [...rc].reverse().find((m) => m.flag && m.flag !== "CLEAR");

  return {
    sessionName: session.session_name,
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
      };
    }),
    control: [...rc].reverse().slice(0, 12).map((m) => ({
      category: m.category,
      message: m.message,
      flag: m.flag,
      date: m.date,
    })),
  };
}

const REFRESH_MS = 15000;

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

  const flagBadge = (flag: string | null) => {
    if (!flag) return <Badge kind="live">{lang === "it" ? "Bandiera verde" : "Green flag"}</Badge>;
    const f = flag.toUpperCase();
    if (f === "RED") return <span className="badge" style={{ background: "#e10600", color: "#fff" }}>{lang === "it" ? "Bandiera rossa" : "Red flag"}</span>;
    if (f.includes("YELLOW")) return <Badge kind="warn">{lang === "it" ? "Bandiera gialla" : "Yellow flag"}</Badge>;
    if (f === "CHEQUERED") return <Badge>{lang === "it" ? "Bandiera a scacchi" : "Chequered flag"}</Badge>;
    return <Badge kind="accent">{flag}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title={t("nav_live")}
        sub={isLive && data ? `${data.sessionName} · ${data.location} · ${fmtDateTime(new Date(data.dateStart), lang)}` : undefined}
        right={isLive ? <Badge kind="live">● LIVE</Badge> : undefined}
      />

      {status === "loading" && <Skeleton />}
      {status === "error" && (
        <>
          <EmptyState icon="📡" title={t("live_unavailable_title")} body={t("live_unavailable_body")} />
          <div className="mt"><button className="btn" onClick={retry}>{t("retry")}</button></div>
        </>
      )}
      {status === "ok" && data && (
        <>
          <div className="spread mb" style={{ flexWrap: "wrap", gap: 10 }}>
            {flagBadge(data.flag)}
            <span className="small muted">{t("last_updated")}: {new Date(now).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}</span>
            <button className="btn ghost small" onClick={retry}>{t("refresh")}</button>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>🌡️ {t("weather")}</h3>
              <dl className="kv">
                <dt>{t("air")}</dt><dd className="num">{data.air != null ? `${data.air}°C` : "–"}</dd>
                <dt>{t("track")}</dt><dd className="num">{data.track != null ? `${data.track}°C` : "–"}</dd>
                <dt>{t("humidity")}</dt><dd className="num">{data.humidity != null ? `${data.humidity}%` : "–"}</dd>
                <dt>{t("rain")}</dt><dd className="num">{data.rain != null ? data.rain : "–"}</dd>
                <dt>{t("wind")}</dt><dd className="num">{data.wind != null ? `${data.wind} km/h` : "–"}</dd>
              </dl>
            </div>
            <div className="card" style={{ gridColumn: "span 2" }}>
              <h3 style={{ marginTop: 0 }}>🏁 {t("live_positions")}</h3>
              {data.leaders.length === 0 ? (
                <p className="muted">{t("not_available")}</p>
              ) : (
                <div className="tbl-wrap"><table className="tbl">
                  <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("gap")}</th><th>Int.</th><th>{t("best_lap")}</th><th>{t("pit")}</th></tr></thead>
                  <tbody>
                    {data.leaders.map((l) => (
                      <tr key={l.num}>
                        <td className="pos num">{l.pos}</td>
                        <td><b>{l.acronym}</b> <span className="muted small">{l.fullName}</span></td>
                        <td><span className="team-dot" style={{ background: l.color }} />{l.team}</td>
                        <td className="num">{l.gap ?? "–"}</td>
                        <td className="num">{l.interval ?? "–"}</td>
                        <td className="num">{l.bestLap ?? "–"}</td>
                        <td className="num">{l.pits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </div>
          </div>

          <h2 className="section-title">🚩 {t("live_timeline")}</h2>
          {data.control.length === 0 ? (
            <p className="muted">{t("not_available")}</p>
          ) : (
            <div className="grid grid-2">
              {data.control.map((m, i) => (
                <div className="card small" key={i}>
                  <div className="spread">
                    <b>{m.category}</b>
                    <span className="muted small num">{new Date(m.date).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}</span>
                  </div>
                  <p style={{ margin: "6px 0 0" }}>{m.message}</p>
                </div>
              ))}
            </div>
          )}
          <p className="small muted mt">{t("about_text")}</p>
        </>
      )}
    </div>
  );
}

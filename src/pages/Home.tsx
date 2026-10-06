/* Home: next GP hero + countdown, live state, favorites, standings, last results, news. */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Car, Flag, Heart, MapPin, Newspaper, Trophy } from "lucide-react";
import { jolpica, nextSession, raceStatus, sessionDateTime, type RaceInfo } from "../api/jolpica";
import { fetchNews, type NewsItem } from "../api/news";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, CountdownCells, EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard, fmtDateTime, gapText } from "../components/ui";
import { countryCode, nationalityCode, teamColor } from "../data/meta";

interface HomeData {
  races: RaceInfo[];
  standings: Awaited<ReturnType<typeof jolpica.driverStandings>>;
  cstands: Awaited<ReturnType<typeof jolpica.constructorStandings>>;
  news: NewsItem[];
  lastResults: { race: RaceInfo; rows: Awaited<ReturnType<typeof jolpica.raceResults>> } | null;
}

async function load(season: string): Promise<HomeData> {
  const [races, standings, cstands, news] = await Promise.all([
    jolpica.schedule(season),
    jolpica.driverStandings(season).catch(() => []),
    jolpica.constructorStandings(season).catch(() => []),
    fetchNews().catch(() => [] as NewsItem[]),
  ]);
  const past = races.filter((r) => raceStatus(r) === "past");
  const last = past[past.length - 1];
  let lastResults: HomeData["lastResults"] = null;
  if (last) {
    const rows = await jolpica.raceResults(season, last.round).catch(() => []);
    lastResults = { race: last, rows };
  }
  return { races, standings, cstands, news: news.slice(0, 4), lastResults };
}

export default function Home() {
  const { t, lang, season, favorites } = useSettings();
  const { status, data, retry } = useApi(() => load(season), [season]);

  const next = useMemo(() => (data ? nextSession(data.races) : null), [data]);
  const liveRace = useMemo(() => data?.races.find((r) => raceStatus(r) === "live") ?? null, [data]);

  if (status === "loading") {
    return (
      <div>
        <PageHeader title={t("nav_home")} />
        <div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (status === "error" || !data) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <PageHeader title={t("nav_home")} sub={`${t("season")} ${season}`} />

      {liveRace ? (
        <Link to="/live" className="hero" style={{ display: "block", marginBottom: 18 }} aria-label={t("view_race_center")}>
          <Badge kind="live">{t("live_now")}</Badge>
          <h2 style={{ marginTop: 10 }}>{liveRace.raceName}</h2>
          <p className="meta">
            <MapPin aria-hidden="true" />
            <span className="nat">{countryCode(liveRace.Circuit.Location.country)}</span>
            {liveRace.Circuit.Location.locality}, {liveRace.Circuit.Location.country}
          </p>
          <span className="btn primary" style={{ marginTop: 12 }}>{t("view_race_center")} <ArrowRight size={15} aria-hidden="true" /></span>
        </Link>
      ) : next ? (
        <div className="hero" style={{ marginBottom: 18 }}>
          <div className="spread">
            <Badge kind="accent">{t("next_gp")}</Badge>
            <span className="muted small">{t("round")} {next.race.round}</span>
          </div>
          <h2 style={{ marginTop: 10 }}>{next.race.raceName}</h2>
          <p className="meta">
            <MapPin aria-hidden="true" />
            <span className="nat">{countryCode(next.race.Circuit.Location.country)}</span>
            {next.race.Circuit.Location.locality}, {next.race.Circuit.Location.country}
            {" · "}{fmtDateTime(sessionDateTime(next.race.date, next.race.time), lang)}
          </p>
          <p className="meta" style={{ marginTop: 8 }}>{t("next_session")}: <b style={{ color: "#fff" }}>{next.label}</b></p>
          <CountdownCells target={next.date} />
          <div className="row" style={{ marginTop: 4 }}>
            <Link className="btn primary small" to={`/gara/${next.race.season}/${next.race.round}`}>
              {t("view_details")} <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link className="btn small ghost" to="/calendario" style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>{t("view_calendar")}</Link>
          </div>
        </div>
      ) : null}

      {favorites.length > 0 && (
        <>
          <h2 className="section-title"><Heart aria-hidden="true" /> {t("favorites")}</h2>
          <div className="grid grid-3">
            {favorites.map((f) => (
              <Link key={`${f.kind}:${f.id}`} className="card" to={f.kind === "driver" ? `/piloti/${f.id}` : f.kind === "team" ? `/team/${f.id}` : "/circuiti"}>
                <div className="spread">
                  <b>{f.label}</b>
                  <FavButton item={f} />
                </div>
                <div className="small muted">{f.kind === "driver" ? t("nav_drivers") : f.kind === "team" ? t("nav_teams") : t("nav_circuits")}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-2">
        <div>
          <div className="section-head">
            <h2 className="section-title"><Trophy aria-hidden="true" /> {t("driver_standings")}</h2>
            <Link to="/classifiche" className="btn ghost small">{t("view_details")} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="card" style={{ padding: "6px 16px" }}>
            {data.standings.slice(0, 5).map((s, i) => (
              <Link key={s.Driver.driverId} to={`/piloti/${s.Driver.driverId}`} className="driver-row">
                <b className="num" style={{ width: 26 }}>{i + 1}</b>
                <span className="avatar-init" style={{ background: teamColor(s.Constructors[0]?.constructorId ?? "") }}>
                  {s.Driver.code ?? s.Driver.familyName.slice(0, 3).toUpperCase()}
                </span>
                <span>
                  <b style={{ display: "block", fontSize: "0.92rem" }}>
                    <span className="nat">{nationalityCode(s.Driver.nationality)}</span> {s.Driver.givenName} {s.Driver.familyName}
                  </b>
                  <span className="small muted">{s.Constructors[0]?.name}</span>
                </span>
                <b className="num" style={{ marginLeft: "auto" }}>{s.points}</b>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="section-head">
            <h2 className="section-title"><Car aria-hidden="true" /> {t("constructor_standings")}</h2>
            <Link to="/classifiche" className="btn ghost small">{t("view_details")} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="card" style={{ padding: "6px 16px" }}>
            {data.cstands.slice(0, 5).map((s, i) => (
              <Link key={s.Constructor.constructorId} to={`/team/${s.Constructor.constructorId}`} className="driver-row">
                <b className="num" style={{ width: 26 }}>{i + 1}</b>
                <span className="avatar-init" style={{ background: teamColor(s.Constructor.constructorId) }}>
                  {s.Constructor.name.slice(0, 2).toUpperCase()}
                </span>
                <b style={{ fontSize: "0.92rem" }}>{s.Constructor.name}</b>
                <b className="num" style={{ marginLeft: "auto" }}>{s.points}</b>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {data.lastResults && (
        <>
          <div className="section-head">
            <h2 className="section-title"><Flag aria-hidden="true" /> {t("latest_results")}: {data.lastResults.race.raceName}</h2>
            <Link to="/risultati" className="btn ghost small">{t("view_details")} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("time_gap")}</th><th className="num">{t("points")}</th></tr></thead>
              <tbody>
                {data.lastResults.rows.slice(0, 5).map((r) => (
                  <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : ""}>
                    <td className="pos num">{r.positionText}</td>
                    <td>
                      <Link to={`/piloti/${r.Driver.driverId}`}>
                        <span className="nat">{nationalityCode(r.Driver.nationality)}</span> <b>{r.Driver.code ?? r.Driver.familyName}</b>
                      </Link>
                    </td>
                    <td><span className="team-cell"><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} aria-hidden="true" />{r.Constructor.name}</span></td>
                    <td className="num mono">{gapText(r)}</td>
                    <td className="num"><b>{r.points}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title"><Newspaper aria-hidden="true" /> {t("latest_news")}</h2>
        <Link to="/news" className="btn ghost small">{t("view_details")} <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      {data.news.length === 0 ? (
        <EmptyState icon={<Newspaper aria-hidden="true" />} title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {data.news.map((n) => (
            <a key={n.id} className="card news-card" href={n.link} target="_blank" rel="noopener noreferrer">
              <span className="cat"><Newspaper aria-hidden="true" />{n.source}</span>
              <h3>{n.title}</h3>
              <p>{n.excerpt}</p>
              <span className="src">
                <span>{new Date(n.pubDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}</span>
                <span>{t("read_original")} <ArrowUpRight size={13} aria-hidden="true" /></span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

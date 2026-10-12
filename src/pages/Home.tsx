/* Home: next GP hero + countdown, live state, favorites, standings, last results, news.
 * M3 Expressive dashboard. */
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jolpica, nextSession, raceStatus, sessionDateTime, type RaceInfo } from "../api/jolpica";
import { fetchNews, type NewsItem } from "../api/news";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { SeasonSelect } from "../components/SeasonSelect";
import {
  Badge, CountdownCells, EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard, SkeletonHero, fmtDateTime, gapText,
} from "../components/ui";
import {
  MButton, MCard, MIcon, MList, MListItem,
} from "../design";
import { MDetails, MobileTable, MTable, ResponsiveTable, TeamDot, type MobileRow } from "../components/ResponsiveTable";
import { TrackMap } from "../components/TrackMap";
import { countryCode, nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

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
  const { t, lang, season, setSeason, favorites } = useSettings();
  const navigate = useNavigate();
  const { status, data, retry } = useApi(() => load(season), [season]);

  const next = useMemo(() => (data ? nextSession(data.races) : null), [data]);
  const liveRace = useMemo(() => data?.races.find((r) => raceStatus(r) === "live") ?? null, [data]);

  if (status === "loading") {
    return (
      <div>
        <PageHeader title={t("nav_home")} />
        <SkeletonHero />
        <div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (status === "error" || !data) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <PageHeader title={t("nav_home")} sub={`${t("season")} ${season}`} right={<SeasonSelect id="home-season" value={season} onChange={setSeason} />} />

      {liveRace ? (
        <div
          className="m3-hero m3-enter"
          role="button"
          tabIndex={0}
          aria-label={t("view_race_center")}
          onClick={() => navigate("/live")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/live"); } }}
          style={{ cursor: "pointer" }}
        >
          <Badge kind="live">{t("live_now")}</Badge>
          <h2>{liveRace.raceName}</h2>
          <p className="m3-hero-meta">
            <MIcon name="location_on" size={18} />
            <FlagIcon code={countryCode(liveRace.Circuit.Location.country)} />
            <span>{liveRace.Circuit.Location.locality}, {liveRace.Circuit.Location.country}</span>
          </p>
          <div className="m3-hero-actions">
            <MButton variant="filled" trailingIcon="arrow_forward" onClick={(e) => { e.stopPropagation(); navigate("/live"); }}>
              {t("view_race_center")}
            </MButton>
          </div>
        </div>
      ) : next ? (
        <div className="m3-hero m3-enter">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <Badge kind="accent">{t("next_gp")}</Badge>
            <span className="m3-muted">{t("round")} {next.race.round}</span>
          </div>
          <div className="m3-hero-row" style={{ marginTop: 12 }}>
            <div className="m3-hero-title"><h2>{next.race.raceName}</h2></div>
            <TrackMap
              circuitId={next.race.Circuit.circuitId}
              circuitName={next.race.Circuit.circuitName}
              className="m3-hero-track"
            />
          </div>
          <p className="m3-hero-meta">
            <MIcon name="location_on" size={18} />
            <FlagIcon code={countryCode(next.race.Circuit.Location.country)} />
            <span>
              {next.race.Circuit.Location.locality}, {next.race.Circuit.Location.country}
              {" · "}{fmtDateTime(sessionDateTime(next.race.date, next.race.time), lang)}
            </span>
          </p>
          <p className="m3-hero-meta" style={{ marginTop: 8 }}>
            <MIcon name="timer" size={18} />
            <span>{t("next_session")}: <b>{next.label}</b></span>
          </p>
          <CountdownCells target={next.date} />
          <div className="m3-hero-actions">
            <MButton variant="filled" trailingIcon="arrow_forward" onClick={() => navigate(`/gara/${next.race.season}/${next.race.round}`)}>
              {t("view_details")}
            </MButton>
            <MButton variant="outlined" onClick={() => navigate("/calendario")}>
              {t("view_calendar")}
            </MButton>
          </div>
        </div>
      ) : null}

      {favorites.length > 0 && (
        <section className="m3-enter m3-enter-1">
          <div className="m3-section-head" style={{ marginTop: 0 }}>
            <h2 className="m3-section-title"><MIcon name="favorite" /> {t("favorites")}</h2>
          </div>
          <div className="m3-grid m3-grid--3">
            {favorites.map((f) => (
              <Link
                key={`${f.kind}:${f.id}`}
                className="m3-card-link"
                to={f.kind === "driver" ? `/piloti/${f.id}?season=${f.season ?? season}` : f.kind === "team" ? `/team/${f.id}?season=${f.season ?? season}` : "/circuiti"}
              >
                <MCard variant="outlined">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <b style={{ fontSize: "1rem" }}>{f.label}</b>
                    <FavButton item={f} />
                  </div>
                  <div className="m3-muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                    {f.kind === "driver" ? t("nav_drivers") : f.kind === "team" ? t("nav_teams") : t("nav_circuits")}
                  </div>
                </MCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="m3-grid m3-grid--2 m3-enter m3-enter-2">
        <div>
          <div className="m3-section-head">
            <h2 className="m3-section-title"><MIcon name="trophy" /> {t("driver_standings")}</h2>
            <MButton variant="text" trailingIcon="arrow_forward" onClick={() => navigate("/classifiche")}>
              {t("view_details")}
            </MButton>
          </div>
          <div className="m3-standlist">
            <MList ariaLabel={t("driver_standings")}>
              {data.standings.slice(0, 5).map((s, i) => (
                <MListItem
                  key={s.Driver.driverId}
                  headline={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <FlagIcon code={nationalityCode(s.Driver.nationality)} />
                      <b>{s.Driver.givenName} {s.Driver.familyName}</b>
                    </span>
                  }
                  supportingText={s.Constructors[0]?.name}
                  leading={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                      <b className="num" style={{ width: 22 }}>{i + 1}</b>
                      <span className="m3-avatar-init" style={{ background: teamColor(s.Constructors[0]?.constructorId ?? "") }}>
                        {s.Driver.code ?? s.Driver.familyName.slice(0, 3).toUpperCase()}
                      </span>
                    </span>
                  }
                  trailing={<b className="num">{s.points}</b>}
                  onClick={() => navigate(`/piloti/${s.Driver.driverId}?season=${season}`)}
                />
              ))}
            </MList>
          </div>
        </div>
        <div>
          <div className="m3-section-head">
            <h2 className="m3-section-title"><MIcon name="directions_car" /> {t("constructor_standings")}</h2>
            <MButton variant="text" trailingIcon="arrow_forward" onClick={() => navigate("/classifiche")}>
              {t("view_details")}
            </MButton>
          </div>
          <div className="m3-standlist">
            <MList ariaLabel={t("constructor_standings")}>
              {data.cstands.slice(0, 5).map((s, i) => (
                <MListItem
                  key={s.Constructor.constructorId}
                  headline={<b>{s.Constructor.name}</b>}
                  leading={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                      <b className="num" style={{ width: 22 }}>{i + 1}</b>
                      <span className="m3-avatar-init" style={{ background: teamColor(s.Constructor.constructorId) }}>
                        {s.Constructor.name.slice(0, 2).toUpperCase()}
                      </span>
                    </span>
                  }
                  trailing={<b className="num">{s.points}</b>}
                  onClick={() => navigate(`/team/${s.Constructor.constructorId}?season=${season}`)}
                />
              ))}
            </MList>
          </div>
        </div>
      </div>

      {data.lastResults && (
        <section className="m3-enter m3-enter-2">
          <div className="m3-section-head">
            <h2 className="m3-section-title"><MIcon name="flag" /> {t("latest_results")}: {data.lastResults.race.raceName}</h2>
            <MButton variant="text" trailingIcon="arrow_forward" onClick={() => navigate("/risultati")}>
              {t("view_details")}
            </MButton>
          </div>
          <LastResultsTable rows={data.lastResults.rows.slice(0, 5)} season={season} />
        </section>
      )}

      <section className="m3-enter m3-enter-3">
      <div className="m3-section-head">
        <h2 className="m3-section-title"><MIcon name="newspaper" /> {t("latest_news")}</h2>
        <MButton variant="text" trailingIcon="arrow_forward" onClick={() => navigate("/news")}>
          {t("view_details")}
        </MButton>
      </div>
      {data.news.length === 0 ? (
        <EmptyState icon="newspaper" title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <div className="m3-grid m3-grid--2">
          {data.news.map((n) => (
            <MCard key={n.id} variant="outlined" className="m3-news-card">
              <Badge kind="accent"><MIcon name="newspaper" size={14} />{n.source}</Badge>
              <h3>
                <a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a>
              </h3>
              <p>{n.excerpt}</p>
              <div className="m3-news-src">
                <span>{new Date(n.pubDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}</span>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {t("read_original")} <MIcon name="arrow_outward" size={14} />
                </a>
              </div>
            </MCard>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}

function LastResultsTable({ rows, season }: { rows: Awaited<ReturnType<typeof jolpica.raceResults>>; season: string }) {
  const { t } = useSettings();
  return (
    <ResponsiveTable
      desktop={
        <MTable
          ariaLabel={t("latest_results")}
          head={<><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("time_gap")}</th><th className="num">{t("points")}</th></>}
        >
          {rows.map((r) => (
            <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : ""}>
              <td className="num"><b>{r.positionText}</b></td>
              <td>
                <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                  <FlagIcon code={nationalityCode(r.Driver.nationality)} /> <b>{r.Driver.code ?? r.Driver.familyName}</b>
                </Link>
              </td>
              <td><TeamDot color={teamColor(r.Constructor.constructorId)} />{r.Constructor.name}</td>
              <td className="num mono">{gapText(r)}</td>
              <td className="num"><b>{r.points}</b></td>
            </tr>
          ))}
        </MTable>
      }
      mobile={
        <MobileTable rows={rows.map((r): MobileRow => ({
          key: r.Driver.driverId,
          rowClass: r.positionText === "1" ? "leader" : undefined,
          left: <span className="mpos">{r.positionText}</span>,
          title: (
            <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
              <FlagIcon code={nationalityCode(r.Driver.nationality)} />{" "}
              <b>{r.Driver.code ?? r.Driver.familyName}</b>
            </Link>
          ),
          subtitle: r.Constructor.name,
          value: <span className="mono">{gapText(r)}</span>,
          details: (
            <MDetails items={[
              { label: t("team"), value: r.Constructor.name },
              { label: t("points"), value: r.points },
              { label: t("status"), value: r.status },
            ]} />
          ),
        }))} />
      }
    />
  );
}

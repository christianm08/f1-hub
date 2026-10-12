/* GP detail: circuit info, weekend schedule, per-session results, standings after the GP. */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jolpica, raceSessions, raceStatus, type RaceInfo, type RaceResult, type QualiResult } from "../api/jolpica";
import { openf1, findMeeting, formatLapTime, type OFDriver } from "../api/openf1";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard, fmtDateTime, gapText } from "../components/ui";
import { MButton, MCard, MIcon, MList, MListItem, MTabs, type MIconName, type MTab } from "../design";
import { MDetails, MobileTable, MTable, ResponsiveTable, TeamDot, type MobileRow } from "../components/ResponsiveTable";
import { TrackMap } from "../components/TrackMap";
import { findTrack, formatTrackLength } from "../data/circuits";
import { countryCode, nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

type Tab = "info" | "race" | "quali" | "sprint" | "practice" | "standings";

interface DetailData {
  race: RaceInfo;
  results: RaceResult[];
  quali: QualiResult[];
  sprint: RaceResult[];
  dStands: Awaited<ReturnType<typeof jolpica.driverStandings>>;
  cStands: Awaited<ReturnType<typeof jolpica.constructorStandings>>;
}

async function load(season: string, round: string): Promise<DetailData> {
  const races = await jolpica.schedule(season);
  const race = races.find((r) => r.round === round);
  if (!race) throw new Error("not_found");
  const st = raceStatus(race);
  const [results, quali, sprint, dStands, cStands] = await Promise.all([
    st === "past" ? jolpica.raceResults(season, round).catch(() => []) : Promise.resolve([] as RaceResult[]),
    jolpica.qualifying(season, round).catch(() => [] as QualiResult[]),
    race.Sprint ? jolpica.sprint(season, round).catch(() => [] as RaceResult[]) : Promise.resolve([] as RaceResult[]),
    st === "past" ? jolpica.driverStandings(season, round).catch(() => []) : Promise.resolve([]),
    st === "past" ? jolpica.constructorStandings(season, round).catch(() => []) : Promise.resolve([]),
  ]);
  return { race, results, quali, sprint, dStands, cStands };
}

const PRACTICE_NAMES = ["Practice 1", "Practice 2", "Practice 3"];

async function loadPractice(season: string, race: RaceInfo) {
  const sessions = await openf1.sessions({ year: parseInt(season, 10) });
  const targets = [race.FirstPractice, race.SecondPractice, race.ThirdPractice]
    .map((s) => (s ? new Date(s.date + "T" + (s.time ?? "12:00:00Z")).getTime() : 0));
  const out: { name: string; best: { acronym: string; team: string; lap: number; lapNo: number }[] }[] = [];
  for (let i = 0; i < 3; i++) {
    if (!targets[i]) continue;
    const sess = sessions
      .filter((s) => s.session_name === PRACTICE_NAMES[i])
      .sort((a, b) => Math.abs(new Date(a.date_start).getTime() - targets[i]) - Math.abs(new Date(b.date_start).getTime() - targets[i]))[0];
    if (!sess || Math.abs(new Date(sess.date_start).getTime() - targets[i]) > 4 * 86400000) {
      out.push({ name: PRACTICE_NAMES[i], best: [] });
      continue;
    }
    const [best, drivers] = await Promise.all([
      openf1.bestLaps(sess.session_key).catch(() => []),
      openf1.drivers(sess.session_key).catch(() => [] as OFDriver[]),
    ]);
    const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
    out.push({
      name: PRACTICE_NAMES[i],
      best: best.map((b) => ({
        acronym: byNum.get(b.driver_number)?.name_acronym ?? `#${b.driver_number}`,
        team: byNum.get(b.driver_number)?.team_name ?? "",
        lap: b.lap_duration,
        lapNo: b.lap_number,
      })),
    });
  }
  return out;
}

/** Icon for a weekend session row: fp1/fp2/fp3 -> build, quali -> timer, sprint -> bolt, race -> flag. */
function sessionIcon(key: string): MIconName {
  if (key === "sprint") return "bolt";
  if (key === "quali") return "timer";
  if (key === "race") return "flag";
  return "build";
}

/** Deep link into the Race Center for this GP's Race session (OpenF1, 2023+).
 *  Renders nothing while resolving or when no session exists — never fake. */
function RaceCenterLink({ season, raceName }: { season: string; raceName: string }) {
  const { t } = useSettings();
  const navigate = useNavigate();
  const { status, data: sessionKey } = useApi(async () => {
    const year = parseInt(season, 10);
    if (!Number.isFinite(year) || year < 2023) return null;
    const meeting = await findMeeting(year, raceName).catch(() => null);
    if (!meeting) return null;
    const sessions = await openf1.sessions({ meeting_key: meeting.meeting_key, session_name: "Race" }).catch(() => []);
    return sessions.length ? sessions[0].session_key : null;
  }, [season, raceName]);
  if (status !== "ok" || !sessionKey) return null;
  return (
    <div style={{ margin: "-8px 0 16px" }}>
      <MButton variant="outlined" small icon="flag" onClick={() => navigate(`/live?session=${sessionKey}`)}>
        {t("view_race_center")}
      </MButton>
    </div>
  );
}

export default function RaceDetail() {
  const { season = "", round = "" } = useParams();
  const { t, lang, units } = useSettings();
  const { status, data, retry } = useApi(() => load(season, round), [season, round]);
  const [tab, setTab] = useState<Tab>("info");

  const practice = useApi(
    () => (data ? loadPractice(season, data.race) : Promise.resolve([])),
    [season, data?.race.round, tab === "practice"]
  );

  const tabs: MTab[] = useMemo(() => {
    const list: MTab[] = [
      { key: "info", label: t("circuit_info"), icon: "info" },
      { key: "race", label: t("race"), icon: "flag" },
      { key: "quali", label: t("qualifying"), icon: "timer" },
    ];
    if (data?.race.Sprint) list.push({ key: "sprint", label: t("sprint"), icon: "bolt" });
    list.push({ key: "practice", label: t("practice"), icon: "build" });
    if (data && raceStatus(data.race) === "past") list.push({ key: "standings", label: t("standings_after_gp"), icon: "trophy" });
    return list;
  }, [data, t]);

  if (status === "loading") {
    return <div><PageHeader title={t("loading")} /><div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) {
    return <div><PageHeader title={t("nav_calendar")} /><ErrorState onRetry={retry} /></div>;
  }

  const { race } = data;
  const sessions = raceSessions(race);
  const st = raceStatus(race);

  return (
    <div>
      <PageHeader
        title={race.raceName}
        sub={`${t("round")} ${race.round}`}
        right={st === "live" ? <Badge kind="live">{t("live_now")}</Badge> : st === "past" ? <Badge kind="done">{t("past")}</Badge> : <Badge kind="accent">{t("upcoming")}</Badge>}
      />
      <div className="m3-muted" style={{ display: "flex", alignItems: "center", gap: 8, margin: "-6px 0 16px", fontSize: "0.9rem" }}>
        <MIcon name="location_on" size={16} />
        <FlagIcon code={countryCode(race.Circuit.Location.country)} />
        <span>{race.Circuit.Location.locality}, {race.Circuit.Location.country}</span>
      </div>
      <RaceCenterLink season={season} raceName={race.raceName} />

      <MTabs tabs={tabs} value={tab} onChange={(k) => setTab(k as Tab)} ariaLabel={race.raceName} />

      <div style={{ marginTop: 16 }}>
        {tab === "info" && (
          <div className="m3-grid m3-grid--2">
            <MCard variant="outlined" className="m3-float-panel m3-enter">
              <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>{race.Circuit.circuitName}</h3>
              <TrackMap circuitId={race.Circuit.circuitId} circuitName={race.Circuit.circuitName} />
              <dl className="m3-kv" style={{ marginTop: 12 }}>
                <dt>{t("city")}</dt><dd>{race.Circuit.Location.locality}</dd>
                <dt>{t("country")}</dt><dd>{race.Circuit.Location.country}</dd>
                <dt>{t("length")}</dt>
                <dd className="num">{(() => {
                  const track = findTrack(race.Circuit.circuitId, race.Circuit.circuitName);
                  return track ? formatTrackLength(track.lengthM, lang, units === "imperial") : t("not_available");
                })()}</dd>
                <dt>{t("lap_record")}</dt><dd>{t("not_available")}</dd>
              </dl>
              <div style={{ marginTop: 12 }}>
                <MButton variant="text" small trailingIcon="arrow_outward" onClick={() => window.open(race.Circuit.url, "_blank", "noopener,noreferrer")}>
                  Wikipedia
                </MButton>
              </div>
            </MCard>
            <MCard variant="outlined" className="m3-float-panel m3-enter m3-enter-1">
              <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>{t("weekend_schedule")}</h3>
              <MList ariaLabel={t("weekend_schedule")}>
                {sessions.map((s) => (
                  <MListItem
                    key={s.key}
                    headline={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <MIcon name={sessionIcon(s.key)} size={18} />
                        <b>{s.label}</b>
                      </span>
                    }
                    trailing={<span className="num mono m3-muted" style={{ fontSize: "0.85rem" }}>{fmtDateTime(s.date, lang)}</span>}
                  />
                ))}
              </MList>
            </MCard>
          </div>
        )}

        {tab === "race" && (
          data.results.length === 0
            ? <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />
            : <ResponsiveTable
                desktop={
                  <MTable
                    ariaLabel={t("race")}
                    head={<><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th className="num">{t("time_gap")}</th><th className="num">{t("points")}</th><th>{t("status")}</th></>}
                  >
                    {data.results.map((r) => (
                      <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : undefined}>
                        <td className="num"><b>{r.positionText}</b></td>
                        <td><Link to={`/piloti/${r.Driver.driverId}?season=${season}`}><b>{r.Driver.code ?? r.Driver.familyName}</b> <span className="m3-muted" style={{ fontSize: "0.85rem" }}>{r.Driver.givenName} {r.Driver.familyName}</span></Link></td>
                        <td><TeamDot color={teamColor(r.Constructor.constructorId)} />{r.Constructor.name}</td>
                        <td className="num mono">{gapText(r)}</td>
                        <td className="num">{r.points}</td>
                        <td className="m3-muted" style={{ fontSize: "0.85rem" }}>{r.status}</td>
                      </tr>
                    ))}
                  </MTable>
                }
                mobile={
                  <MobileTable rows={data.results.map((r): MobileRow => ({
                    key: r.Driver.driverId,
                    rowClass: r.positionText === "1" ? "leader" : undefined,
                    left: <span className="mpos">{r.positionText}</span>,
                    title: (
                      <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                        <b>{r.Driver.code ?? r.Driver.familyName}</b>{" "}
                        <span className="m3-muted">{r.Driver.givenName} {r.Driver.familyName}</span>
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
        )}

        {tab === "quali" && (
          data.quali.length === 0
            ? <EmptyState icon="timer" title={t("empty_title")} body={t("empty_body")} />
            : <ResponsiveTable
                desktop={
                  <MTable
                    ariaLabel={t("qualifying")}
                    head={<><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th className="num">Q1</th><th className="num">Q2</th><th className="num">Q3</th></>}
                  >
                    {data.quali.map((r) => (
                      <tr key={r.Driver.driverId}>
                        <td className="num"><b>{r.positionText}</b></td>
                        <td><Link to={`/piloti/${r.Driver.driverId}?season=${season}`}><b>{r.Driver.code ?? r.Driver.familyName}</b></Link></td>
                        <td><TeamDot color={teamColor(r.Constructor.constructorId)} />{r.Constructor.name}</td>
                        <td className="num mono">{r.Q1 ?? "—"}</td>
                        <td className="num mono">{r.Q2 ?? "—"}</td>
                        <td className="num mono">{r.Q3 ?? "—"}</td>
                      </tr>
                    ))}
                  </MTable>
                }
                mobile={
                  <MobileTable rows={data.quali.map((r): MobileRow => {
                    const best = r.Q3 ?? r.Q2 ?? r.Q1 ?? "—";
                    return {
                      key: r.Driver.driverId,
                      rowClass: r.positionText === "1" ? "leader" : undefined,
                      left: <span className="mpos">{r.positionText}</span>,
                      title: (
                        <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                          <b>{r.Driver.code ?? r.Driver.familyName}</b>
                        </Link>
                      ),
                      subtitle: r.Constructor.name,
                      value: <span className="mono">{best}</span>,
                      details: (
                        <MDetails items={[
                          { label: t("team"), value: r.Constructor.name },
                          { label: "Q1", value: <span className="mono">{r.Q1 ?? "—"}</span> },
                          { label: "Q2", value: <span className="mono">{r.Q2 ?? "—"}</span> },
                          { label: "Q3", value: <span className="mono">{r.Q3 ?? "—"}</span> },
                        ]} />
                      ),
                    };
                  })} />
                }
              />
        )}

        {tab === "sprint" && (
          data.sprint.length === 0
            ? <EmptyState icon="bolt" title={t("empty_title")} body={t("empty_body")} />
            : <ResponsiveTable
                desktop={
                  <MTable
                    ariaLabel={t("sprint")}
                    head={<><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th className="num">{t("time_gap")}</th><th className="num">{t("points")}</th></>}
                  >
                    {data.sprint.map((r) => (
                      <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : undefined}>
                        <td className="num"><b>{r.positionText}</b></td>
                        <td><b>{r.Driver.code ?? r.Driver.familyName}</b></td>
                        <td><TeamDot color={teamColor(r.Constructor.constructorId)} />{r.Constructor.name}</td>
                        <td className="num mono">{gapText(r)}</td>
                        <td className="num">{r.points}</td>
                      </tr>
                    ))}
                  </MTable>
                }
                mobile={
                  <MobileTable rows={data.sprint.map((r): MobileRow => ({
                    key: r.Driver.driverId,
                    rowClass: r.positionText === "1" ? "leader" : undefined,
                    left: <span className="mpos">{r.positionText}</span>,
                    title: <b>{r.Driver.code ?? r.Driver.familyName}</b>,
                    subtitle: r.Constructor.name,
                    value: <span className="mono">{gapText(r)}</span>,
                    details: (
                      <MDetails items={[
                        { label: t("team"), value: r.Constructor.name },
                        { label: t("points"), value: r.points },
                      ]} />
                    ),
                  }))} />
                }
              />
        )}

        {tab === "practice" && (
          practice.status === "loading" ? <div className="m3-grid m3-grid--3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          : practice.status === "error" ? <ErrorState onRetry={practice.retry} />
          : (
            <div className="m3-grid m3-grid--3">
              {(practice.data ?? []).map((p) => (
                <MCard variant="outlined" key={p.name}>
                  <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>{p.name}</h3>
                  {p.best.length === 0 ? (
                    <p className="m3-muted" style={{ fontSize: "0.88rem" }}>{t("not_available")}</p>
                  ) : (
                    <MList ariaLabel={p.name}>
                      {p.best.slice(0, 10).map((b, i) => (
                        <MListItem
                          key={b.acronym}
                          headline={<b>{b.acronym}</b>}
                          supportingText={<span className="ellip">{b.team}</span>}
                          leading={<b className="num" style={{ width: 24 }}>{i + 1}</b>}
                          trailing={<span className="num mono">{formatLapTime(b.lap)}</span>}
                        />
                      ))}
                    </MList>
                  )}
                </MCard>
              ))}
            </div>
          )
        )}

        {tab === "standings" && (
          <div className="m3-grid m3-grid--2">
            <div>
              <div className="m3-section-head" style={{ marginTop: 0 }}>
                <h3 className="m3-section-title"><MIcon name="trophy" /> {t("driver_standings")}</h3>
              </div>
              <ResponsiveTable
                desktop={
                  <MTable
                    ariaLabel={t("driver_standings")}
                    head={<><th>{t("position")}</th><th>{t("driver")}</th><th className="num">{t("points")}</th></>}
                  >
                    {data.dStands.map((s, i) => (
                      <tr key={s.Driver.driverId} className={i === 0 ? "leader" : ""}>
                        <td className="num"><b>{s.positionText}</b></td>
                        <td><FlagIcon code={nationalityCode(s.Driver.nationality)} /> {s.Driver.givenName} {s.Driver.familyName}</td>
                        <td className="num">{s.points}</td>
                      </tr>
                    ))}
                  </MTable>
                }
                mobile={
                  <MobileTable rows={data.dStands.map((s, i): MobileRow => ({
                    key: s.Driver.driverId,
                    rowClass: i === 0 ? "leader" : undefined,
                    left: <span className="mpos">{s.positionText}</span>,
                    title: (
                      <Link to={`/piloti/${s.Driver.driverId}?season=${season}`}>
                        <FlagIcon code={nationalityCode(s.Driver.nationality)} />
                        <b>{s.Driver.givenName} {s.Driver.familyName}</b>
                      </Link>
                    ),
                    value: s.points,
                  }))} />
                }
              />
            </div>
            <div>
              <div className="m3-section-head" style={{ marginTop: 0 }}>
                <h3 className="m3-section-title"><MIcon name="directions_car" /> {t("constructor_standings")}</h3>
              </div>
              <ResponsiveTable
                desktop={
                  <MTable
                    ariaLabel={t("constructor_standings")}
                    head={<><th>{t("position")}</th><th>{t("team")}</th><th className="num">{t("points")}</th></>}
                  >
                    {data.cStands.map((s, i) => (
                      <tr key={s.Constructor.constructorId} className={i === 0 ? "leader" : ""}>
                        <td className="num"><b>{s.positionText}</b></td>
                        <td><TeamDot color={teamColor(s.Constructor.constructorId)} />{s.Constructor.name}</td>
                        <td className="num">{s.points}</td>
                      </tr>
                    ))}
                  </MTable>
                }
                mobile={
                  <MobileTable rows={data.cStands.map((s, i): MobileRow => ({
                    key: s.Constructor.constructorId,
                    rowClass: i === 0 ? "leader" : undefined,
                    left: <span className="mpos">{s.positionText}</span>,
                    title: (
                      <Link to={`/team/${s.Constructor.constructorId}?season=${season}`}>
                        <TeamDot color={teamColor(s.Constructor.constructorId)} />
                        <b>{s.Constructor.name}</b>
                      </Link>
                    ),
                    value: s.points,
                  }))} />
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

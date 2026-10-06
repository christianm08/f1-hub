/* GP detail: circuit info, weekend schedule, per-session results, standings after the GP. */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Car, Flag, Info, MapPin, Timer, Trophy, Wrench, Zap } from "lucide-react";
import { jolpica, raceSessions, raceStatus, type RaceInfo, type RaceResult, type QualiResult } from "../api/jolpica";
import { openf1, findMeeting, formatLapTime, type OFDriver } from "../api/openf1";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard, fmtDateTime, gapText } from "../components/ui";
import { MDetails, MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
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

/** Icon for a weekend session row: fp1/fp2/fp3 -> Wrench, quali -> Timer, sprint -> Zap, race -> Flag. */
function sessionIcon(key: string) {
  if (key === "sprint") return <Zap size={14} aria-hidden="true" style={{ color: "var(--warn)" }} />;
  if (key === "quali") return <Timer size={14} aria-hidden="true" style={{ color: "var(--info)" }} />;
  if (key === "race") return <Flag size={14} aria-hidden="true" style={{ color: "var(--accent-strong)" }} />;
  return <Wrench size={14} aria-hidden="true" style={{ color: "var(--text-3)" }} />;
}

/** Deep link into the Race Center for this GP's Race session (OpenF1, 2023+).
 *  Renders nothing while resolving or when no session exists — never fake. */
function RaceCenterLink({ season, raceName }: { season: string; raceName: string }) {
  const { t } = useSettings();
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
    <div className="row" style={{ margin: "-8px 0 16px" }}>
      <Link to={`/live?session=${sessionKey}`} className="btn ghost small">
        <Flag size={14} aria-hidden="true" />{t("view_race_center")}
      </Link>
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

  const tabs = useMemo(() => {
    const list = [
      { id: "info" as Tab, label: t("circuit_info"), icon: <Info aria-hidden="true" /> },
      { id: "race" as Tab, label: t("race"), icon: <Flag aria-hidden="true" /> },
      { id: "quali" as Tab, label: t("qualifying"), icon: <Timer aria-hidden="true" /> },
    ];
    if (data?.race.Sprint) list.push({ id: "sprint" as Tab, label: t("sprint"), icon: <Zap aria-hidden="true" /> });
    list.push({ id: "practice" as Tab, label: t("practice"), icon: <Wrench aria-hidden="true" /> });
    if (data && raceStatus(data.race) === "past") list.push({ id: "standings" as Tab, label: t("standings_after_gp"), icon: <Trophy aria-hidden="true" /> });
    return list;
  }, [data, t]);

  if (status === "loading") {
    return <div><PageHeader title={t("loading")} /><div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div></div>;
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
      <div className="row small muted" style={{ margin: "-6px 0 16px" }}>
        <MapPin size={14} aria-hidden="true" style={{ color: "var(--text-3)", flex: "0 0 auto" }} />
        <FlagIcon code={countryCode(race.Circuit.Location.country)} />
        <span>{race.Circuit.Location.locality}, {race.Circuit.Location.country}</span>
      </div>
      <RaceCenterLink season={season} raceName={race.raceName} />

      <div className="tabs" role="tablist" aria-label={race.raceName}>
        {tabs.map((tb) => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} className="tab" onClick={() => setTab(tb.id)}>
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{race.Circuit.circuitName}</h3>
            <TrackMap circuitId={race.Circuit.circuitId} circuitName={race.Circuit.circuitName} />
            <dl className="kv mt">
              <dt>{t("city")}</dt><dd>{race.Circuit.Location.locality}</dd>
              <dt>{t("country")}</dt><dd>{race.Circuit.Location.country}</dd>
              <dt>{t("length")}</dt>
              <dd className="num">{(() => {
                const track = findTrack(race.Circuit.circuitId, race.Circuit.circuitName);
                return track ? formatTrackLength(track.lengthM, lang, units === "imperial") : t("not_available");
              })()}</dd>
              <dt>{t("lap_record")}</dt><dd>{t("not_available")}</dd>
            </dl>
            <a className="btn ghost small mt" href={race.Circuit.url} target="_blank" rel="noopener noreferrer">
              Wikipedia <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("weekend_schedule")}</h3>
            {sessions.map((s) => (
              <div key={s.key} className="spread" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {sessionIcon(s.key)}<b>{s.label}</b>
                </span>
                <span className="num mono small muted">{fmtDateTime(s.date, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "race" && (
        data.results.length === 0
          ? <EmptyState title={t("empty_title")} body={t("empty_body")} />
          : <ResponsiveTable
              desktop={
              <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("time_gap")}</th><th>{t("points")}</th><th>{t("status")}</th></tr></thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : undefined}>
                    <td className="pos num">{r.positionText}</td>
                    <td><Link to={`/piloti/${r.Driver.driverId}?season=${season}`}><b>{r.Driver.code ?? r.Driver.familyName}</b> <span className="muted small">{r.Driver.givenName} {r.Driver.familyName}</span></Link></td>
                    <td><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} />{r.Constructor.name}</td>
                    <td className="num mono">{gapText(r)}</td>
                    <td className="num">{r.points}</td>
                    <td className="small muted">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
              }
              mobile={
                <MobileTable rows={data.results.map((r): MobileRow => ({
                  key: r.Driver.driverId,
                  rowClass: r.positionText === "1" ? "leader" : undefined,
                  left: <span className="mpos">{r.positionText}</span>,
                  title: (
                    <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                      <b>{r.Driver.code ?? r.Driver.familyName}</b>{" "}
                      <span className="muted">{r.Driver.givenName} {r.Driver.familyName}</span>
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
          ? <EmptyState icon={<Timer aria-hidden="true" />} title={t("empty_title")} body={t("empty_body")} />
          : <ResponsiveTable
              desktop={
              <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>Q1</th><th>Q2</th><th>Q3</th></tr></thead>
              <tbody>
                {data.quali.map((r) => (
                  <tr key={r.Driver.driverId}>
                    <td className="pos num">{r.positionText}</td>
                    <td><Link to={`/piloti/${r.Driver.driverId}?season=${season}`}><b>{r.Driver.code ?? r.Driver.familyName}</b></Link></td>
                    <td><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} />{r.Constructor.name}</td>
                    <td className="num mono">{r.Q1 ?? "—"}</td>
                    <td className="num mono">{r.Q2 ?? "—"}</td>
                    <td className="num mono">{r.Q3 ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
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
          ? <EmptyState icon={<Zap aria-hidden="true" />} title={t("empty_title")} body={t("empty_body")} />
          : <ResponsiveTable
              desktop={
              <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("time_gap")}</th><th>{t("points")}</th></tr></thead>
              <tbody>
                {data.sprint.map((r) => (
                  <tr key={r.Driver.driverId} className={r.positionText === "1" ? "leader" : undefined}>
                    <td className="pos num">{r.positionText}</td>
                    <td><b>{r.Driver.code ?? r.Driver.familyName}</b></td>
                    <td><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} />{r.Constructor.name}</td>
                    <td className="num mono">{gapText(r)}</td>
                    <td className="num">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
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
        practice.status === "loading" ? <div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        : practice.status === "error" ? <ErrorState onRetry={practice.retry} />
        : (
          <div className="grid grid-3">
            {(practice.data ?? []).map((p) => (
              <div className="card" key={p.name}>
                <h3 style={{ marginTop: 0 }}>{p.name}</h3>
                {p.best.length === 0 ? (
                  <p className="muted small">{t("not_available")}</p>
                ) : (
                  p.best.slice(0, 10).map((b, i) => (
                    <div
                      key={b.acronym}
                      className="driver-row"
                      style={i === 0 ? { background: "var(--accent-soft)", borderRadius: 8, paddingLeft: 10, paddingRight: 10 } : undefined}
                    >
                      <b className="num" style={{ width: 24 }}>{i + 1}</b>
                      <b>{b.acronym}</b>
                      <span className="small muted ellip">{b.team}</span>
                      <span className="num mono" style={{ marginLeft: "auto" }}>{formatLapTime(b.lap)}</span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "standings" && (
        <div className="grid grid-2">
          <div>
            <h3 className="section-title" style={{ marginTop: 0 }}><Trophy aria-hidden="true" /> {t("driver_standings")}</h3>
            <ResponsiveTable
              desktop={
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("points")}</th></tr></thead>
              <tbody>
                {data.dStands.map((s, i) => (
                  <tr key={s.Driver.driverId} className={i === 0 ? "leader" : ""}>
                    <td className="pos num">{s.positionText}</td>
                    <td><FlagIcon code={nationalityCode(s.Driver.nationality)} /> {s.Driver.givenName} {s.Driver.familyName}</td>
                    <td className="num">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
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
            <h3 className="section-title" style={{ marginTop: 0 }}><Car aria-hidden="true" /> {t("constructor_standings")}</h3>
            <ResponsiveTable
              desktop={
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>{t("position")}</th><th>{t("team")}</th><th>{t("points")}</th></tr></thead>
              <tbody>
                {data.cStands.map((s, i) => (
                  <tr key={s.Constructor.constructorId} className={i === 0 ? "leader" : ""}>
                    <td className="pos num">{s.positionText}</td>
                    <td><span className="team-dot" style={{ background: teamColor(s.Constructor.constructorId) }} />{s.Constructor.name}</td>
                    <td className="num">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
              }
              mobile={
                <MobileTable rows={data.cStands.map((s, i): MobileRow => ({
                  key: s.Constructor.constructorId,
                  rowClass: i === 0 ? "leader" : undefined,
                  left: <span className="mpos">{s.positionText}</span>,
                  title: (
                    <Link to={`/team/${s.Constructor.constructorId}?season=${season}`}>
                      <span className="team-dot" style={{ background: teamColor(s.Constructor.constructorId) }} aria-hidden="true" />
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
  );
}

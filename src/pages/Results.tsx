/* Results: filter by season / GP / session. Sessions: race, qualifying, sprint (Jolpica)
   + practice best laps via OpenF1 (recent seasons only, honest fallback). */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Timer } from "lucide-react";
import { jolpica, raceStatus, type RaceInfo, type RaceResult, type QualiResult } from "../api/jolpica";
import { openf1, formatLapTime, type OFDriver } from "../api/openf1";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, PageHeader, SkeletonCard, gapText } from "../components/ui";
import { MDetails, MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { SeasonSelect } from "../components/SeasonSelect";
import { nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";
type SessionKind = "race" | "qualifying" | "sprint" | "practice";

type SessionData =
  | { kind: "race"; rows: RaceResult[] }
  | { kind: "sprint"; rows: RaceResult[] }
  | { kind: "qualifying"; rows: QualiResult[] }
  | { kind: "practice"; rows: { acronym: string; team: string; color: string; lap: number }[] | null };

async function loadPracticeBest(season: string, race: RaceInfo, which: 0 | 1 | 2) {
  const names = ["Practice 1", "Practice 2", "Practice 3"];
  const sessions = await openf1.sessions({ year: parseInt(season, 10) });
  const target = [race.FirstPractice, race.SecondPractice, race.ThirdPractice][which];
  if (!target) return null;
  const t0 = new Date(target.date + "T" + (target.time ?? "12:00:00Z")).getTime();
  const sess = sessions
    .filter((s) => s.session_name === names[which])
    .sort((a, b) => Math.abs(new Date(a.date_start).getTime() - t0) - Math.abs(new Date(b.date_start).getTime() - t0))[0];
  if (!sess || Math.abs(new Date(sess.date_start).getTime() - t0) > 4 * 86400000) return null;
  const [best, drivers] = await Promise.all([
    openf1.bestLaps(sess.session_key).catch(() => []),
    openf1.drivers(sess.session_key).catch(() => [] as OFDriver[]),
  ]);
  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  return best.map((b) => ({
    acronym: byNum.get(b.driver_number)?.name_acronym ?? `#${b.driver_number}`,
    team: byNum.get(b.driver_number)?.team_name ?? "",
    color: byNum.get(b.driver_number)?.team_colour ? `#${byNum.get(b.driver_number)!.team_colour}` : "#8892a3",
    lap: b.lap_duration,
  }));
}

export default function Results() {
  const { t, season: defaultSeason } = useSettings();
  const [season, setSeason] = useState(defaultSeason);
  const [round, setRound] = useState("");
  const [session, setSession] = useState<SessionKind>("race");
  const [fpIdx, setFpIdx] = useState<0 | 1 | 2>(0);

  const schedule = useApi(() => jolpica.schedule(season), [season]);
  const races: RaceInfo[] = schedule.data ?? [];

  useEffect(() => {
    const past = races.filter((r) => raceStatus(r) === "past");
    const last = past[past.length - 1];
    setRound((cur) => (cur && races.some((r) => r.round === cur) ? cur : last?.round ?? races[0]?.round ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.data]);

  const race = races.find((r) => r.round === round);
  const hasSprint = !!race?.Sprint;

  useEffect(() => {
    if (session === "sprint" && !hasSprint) setSession("race");
  }, [session, hasSprint]);

  const results = useApi<SessionData | null>(() => {
    if (!race) return Promise.resolve(null);
    if (session === "race") return jolpica.raceResults(season, race.round).then((rows) => ({ kind: "race" as const, rows }));
    if (session === "qualifying") return jolpica.qualifying(season, race.round).then((rows) => ({ kind: "qualifying" as const, rows }));
    if (session === "sprint") return jolpica.sprint(season, race.round).then((rows) => ({ kind: "sprint" as const, rows }));
    return loadPracticeBest(season, race, fpIdx).then((rows) => ({ kind: "practice" as const, rows }));
  }, [season, round, session, fpIdx, race?.round]);

  const title = useMemo(() => {
    if (!race) return t("nav_results");
    return `${race.raceName}`;
  }, [race, t]);

  return (
    <div>
      <PageHeader title={t("nav_results")} sub={title} />
      <div className="filters" role="group" aria-label="filters">
        <div className="field">
          <label htmlFor="r-season">{t("season")}</label>
          <SeasonSelect id="r-season" value={season} onChange={setSeason} />
        </div>
        <div className="field">
          <label htmlFor="r-gp">{t("gp")}</label>
          <select id="r-gp" value={round} onChange={(e) => setRound(e.target.value)}>
            {races.map((r) => (
              <option key={r.round} value={r.round}>R{r.round} · {r.raceName}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-sess">{t("session")}</label>
          <select id="r-sess" value={session} onChange={(e) => setSession(e.target.value as SessionKind)}>
            <option value="race">{t("race")}</option>
            <option value="qualifying">{t("qualifying")}</option>
            {hasSprint && <option value="sprint">{t("sprint")}</option>}
            <option value="practice">{t("practice")}</option>
          </select>
        </div>
        {session === "practice" && (
          <div className="field">
            <label htmlFor="r-fp">FP</label>
            <select id="r-fp" value={fpIdx} onChange={(e) => setFpIdx(parseInt(e.target.value, 10) as 0 | 1 | 2)}>
              <option value={0}>FP1</option>
              <option value={1}>FP2</option>
              <option value={2}>FP3</option>
            </select>
          </div>
        )}
      </div>

      {schedule.status === "loading" || results.status === "loading" ? (
        <div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div>
      ) : schedule.status === "error" ? (
        <ErrorState onRetry={schedule.retry} />
      ) : results.status === "error" ? (
        <ErrorState onRetry={results.retry} />
      ) : !results.data ? (
        <EmptyState title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <ResultsTable data={results.data} season={season} />
      )}
    </div>
  );
}

function ResultsTable({ data, season }: { data: SessionData; season: string }) {
  const { t } = useSettings();

  if (data.kind === "practice") {
    if (!data.rows || data.rows.length === 0) {
      return <EmptyState icon={<Timer aria-hidden="true" />} title={t("empty_title")} body={t("not_available")} />;
    }
    const rows: MobileRow[] = data.rows.map((r, i) => ({
      key: r.acronym,
      rowClass: i === 0 ? "leader" : undefined,
      left: <span className="mpos">{i + 1}</span>,
      title: <b>{r.acronym}</b>,
      subtitle: r.team,
      value: <span className="mono">{formatLapTime(r.lap)}</span>,
    }));
    return (
      <ResponsiveTable
        desktop={
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr>
          <th>{t("position")}</th>
          <th>{t("driver")}</th>
          <th>{t("team")}</th>
          <th className="num">{t("best_lap")}</th>
        </tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.acronym} className={i === 0 ? "leader" : ""}>
              <td className="pos num">{i + 1}</td>
              <td><b>{r.acronym}</b></td>
              <td><span className="team-cell"><span className="team-dot" style={{ background: r.color }} aria-hidden="true" />{r.team}</span></td>
              <td className="num mono">{formatLapTime(r.lap)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
        }
        mobile={<MobileTable rows={rows} />}
      />
    );
  }

  if (data.kind === "qualifying") {
    if (data.rows.length === 0) return <EmptyState title={t("empty_title")} body={t("empty_body")} />;
    const rows: MobileRow[] = data.rows.map((r, i) => {
      const best = r.Q3 ?? r.Q2 ?? r.Q1 ?? "—";
      return {
        key: r.Driver.driverId,
        rowClass: i === 0 ? "leader" : undefined,
        left: <span className="mpos">{r.positionText}</span>,
        title: (
          <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
            <FlagIcon code={nationalityCode(r.Driver.nationality)} />{" "}
            <b>{r.Driver.code ?? r.Driver.familyName}</b>{" "}
            <span className="muted">{r.Driver.givenName} {r.Driver.familyName}</span>
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
    });
    return (
      <ResponsiveTable
        desktop={
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr>
          <th>{t("position")}</th>
          <th>{t("driver")}</th>
          <th>{t("team")}</th>
          <th className="num">Q1</th>
          <th className="num">Q2</th>
          <th className="num">Q3</th>
        </tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.Driver.driverId} className={i === 0 ? "leader" : ""}>
              <td className="pos num">{r.positionText}</td>
              <td>
                <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                  <FlagIcon code={nationalityCode(r.Driver.nationality)} />{" "}
                  <b>{r.Driver.code ?? r.Driver.familyName}</b>{" "}
                  <span className="muted small">{r.Driver.givenName} {r.Driver.familyName}</span>
                </Link>
              </td>
              <td><span className="team-cell"><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} aria-hidden="true" />{r.Constructor.name}</span></td>
              <td className="num mono">{r.Q1 ?? "—"}</td>
              <td className="num mono">{r.Q2 ?? "—"}</td>
              <td className="num mono">{r.Q3 ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
        }
        mobile={<MobileTable rows={rows} />}
      />
    );
  }

  if (data.rows.length === 0) return <EmptyState title={t("empty_title")} body={t("empty_body")} />;
  const rows: MobileRow[] = data.rows.map((r, i) => ({
    key: r.Driver.driverId,
    rowClass: i === 0 ? "leader" : undefined,
    left: <span className="mpos">{r.positionText}</span>,
    title: (
      <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
        <FlagIcon code={nationalityCode(r.Driver.nationality)} />{" "}
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
  }));
  return (
    <ResponsiveTable
      desktop={
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr>
        <th>{t("position")}</th>
        <th>{t("driver")}</th>
        <th>{t("team")}</th>
        <th className="num">{t("time_gap")}</th>
        <th className="num">{t("points")}</th>
        <th>{t("status")}</th>
      </tr></thead>
      <tbody>
        {data.rows.map((r, i) => (
          <tr key={r.Driver.driverId} className={i === 0 ? "leader" : ""}>
            <td className="pos num">{r.positionText}</td>
            <td>
              <Link to={`/piloti/${r.Driver.driverId}?season=${season}`}>
                <FlagIcon code={nationalityCode(r.Driver.nationality)} />{" "}
                <b>{r.Driver.code ?? r.Driver.familyName}</b>{" "}
                <span className="muted small">{r.Driver.givenName} {r.Driver.familyName}</span>
              </Link>
            </td>
            <td><span className="team-cell"><span className="team-dot" style={{ background: teamColor(r.Constructor.constructorId) }} aria-hidden="true" />{r.Constructor.name}</span></td>
            <td className="num mono">{gapText(r)}</td>
            <td className="num"><b>{r.points}</b></td>
            <td className="small muted">{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
      }
      mobile={<MobileTable rows={rows} />}
    />
  );
}

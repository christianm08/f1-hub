/* Driver detail: season stats, race-by-race table, points progression chart. */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Database, Flag, Medal, Sigma, Timer, TrendingUp, Trophy, User } from "lucide-react";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard, gapText } from "../components/ui";
import { MDetails, MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { Sparkline } from "../components/charts";
import { countryCode, initials, nationalityCode, teamColor } from "../data/meta";

interface DetailData {
  driver: { driverId: string; givenName: string; familyName: string; nationality: string; permanentNumber?: string; dateOfBirth: string };
  teamName: string;
  teamId: string;
  races: ({ Results: RaceResult[] } & RaceInfo)[];
}

async function load(season: string, driverId: string): Promise<DetailData> {
  const [drivers, races] = await Promise.all([
    jolpica.drivers(season),
    jolpica.driverResults(season, driverId),
  ]);
  const driver = drivers.find((d) => d.driverId === driverId);
  if (!driver) throw new Error("not_found");
  const teamId = races[0]?.Results[0]?.Constructor.constructorId ?? "";
  return {
    driver: { driverId: driver.driverId, givenName: driver.givenName, familyName: driver.familyName, nationality: driver.nationality, permanentNumber: driver.permanentNumber, dateOfBirth: driver.dateOfBirth },
    teamName: races[0]?.Results[0]?.Constructor.name ?? "",
    teamId,
    races,
  };
}

function ageOf(dob: string): number {
  const b = new Date(dob).getTime();
  return Math.floor((Date.now() - b) / 31557600000);
}

export default function DriverDetail() {
  const { driverId = "" } = useParams();
  const { t, season, lang } = useSettings();
  const { status, data, retry } = useApi(() => load(season, driverId), [season, driverId]);

  const stats = useMemo(() => {
    if (!data) return null;
    let points = 0, wins = 0, podiums = 0, poles = 0, dnfs = 0;
    const progression: number[] = [];
    const rows = data.races.map((r) => {
      const res = r.Results[0];
      const pts = parseFloat(res.points);
      points += pts;
      progression.push(points);
      if (res.positionText === "1") wins++;
      if (["1", "2", "3"].includes(res.positionText)) podiums++;
      if (res.grid === "1") poles++;
      if (!/^\d+$/.test(res.positionText)) dnfs++;
      return { race: r, res };
    });
    const positions = rows.map((x) => x.res.positionText).filter((p) => /^\d+$/.test(p)).map(Number);
    const best = positions.length ? Math.min(...positions) : null;
    return { points, wins, podiums, poles, dnfs, progression, rows, best };
  }, [data]);

  if (status === "loading") {
    return <div><PageHeader title={t("loading")} /><div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data || !stats) {
    return <div><PageHeader title={t("nav_drivers")} /><ErrorState onRetry={retry} /></div>;
  }

  const color = teamColor(data.teamId);
  const name = `${data.driver.givenName} ${data.driver.familyName}`;
  const age = ageOf(data.driver.dateOfBirth);
  const progMin = stats.progression.length ? Math.min(...stats.progression) : 0;
  const progMax = stats.progression.length ? Math.max(...stats.progression) : 0;

  const kpis: { icon: React.ReactNode; label: string; value: string | number }[] = [
    { icon: <Sigma size={13} aria-hidden="true" />, label: t("points"), value: stats.points },
    { icon: <Trophy size={13} aria-hidden="true" />, label: t("wins"), value: stats.wins },
    { icon: <Medal size={13} aria-hidden="true" />, label: t("podiums"), value: stats.podiums },
    { icon: <Timer size={13} aria-hidden="true" />, label: t("poles"), value: stats.poles },
  ];

  return (
    <div>
      <PageHeader
        title={name}
        sub={`#${data.driver.permanentNumber ?? "–"} · ${data.teamName} · ${t("age")}: ${age}`}
        right={<FavButton item={{ kind: "driver", id: data.driver.driverId, label: name }} />}
      />

      <div className="grid grid-4">
        {kpis.map((k) => (
          <div className="stat" key={k.label} style={{ "--stat-accent": color } as React.CSSProperties}>
            <div className="stat-value num">{k.value}</div>
            <div className="stat-label">{k.icon}{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <h3 className="card-title"><User size={17} aria-hidden="true" />{t("driver")}</h3>
          <div className="row">
            <span className="avatar-init" style={{ background: color }}>{initials(name)}</span>
            <div>
              <b style={{ fontSize: "0.98rem" }}>{name}</b>
              <p className="muted small" style={{ margin: "2px 0 0" }}>{data.teamName}</p>
            </div>
          </div>
          <hr className="divider" />
          <dl className="kv">
            <dt>{t("team")}</dt><dd>{data.teamName}</dd>
            <dt>{t("number")}</dt><dd className="num">#{data.driver.permanentNumber ?? "–"}</dd>
            <dt>{t("nationality")}</dt><dd><span className="nat" style={{ marginRight: 0 }}>{nationalityCode(data.driver.nationality)}</span> {data.driver.nationality}</dd>
            <dt>{t("age")}</dt><dd className="num">{age}</dd>
          </dl>
        </div>
        <div className="card">
          <h3 className="card-title"><TrendingUp size={17} aria-hidden="true" />{t("points_progression")}</h3>
          <Sparkline values={stats.progression} width={420} height={140} stroke={color} ariaLabel={t("points_progression")} />
          <div className="spread small muted num" style={{ marginTop: 6 }}>
            <span>{progMin}</span>
            <span>{progMax}</span>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {t("dnfs")}: <b className="num">{stats.dnfs}</b> · {t("best_result")}: <b className="num">{stats.best ? `P${stats.best}` : "–"}</b>
          </p>
        </div>
      </div>

      <h2 className="section-title"><Flag size={18} aria-hidden="true" />{t("race_by_race")}</h2>
      {stats.rows.length === 0 ? (
        <EmptyState title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <ResponsiveTable
          desktop={
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>{t("round")}</th><th>{t("gp")}</th><th>{t("position")}</th><th>{t("time_gap")}</th><th>{t("points")}</th><th>{t("status")}</th></tr></thead>
          <tbody>
            {stats.rows.map(({ race, res }) => (
              <tr key={race.round} className={res.positionText === "1" ? "leader" : undefined}>
                <td className="num">{race.round}</td>
                <td><Link to={`/gara/${race.season}/${race.round}`}><span className="nat">{countryCode(race.Circuit.Location.country)}</span>{race.raceName}</Link></td>
                <td className="pos num">{res.positionText}</td>
                <td className="mono num">{gapText(res)}</td>
                <td className="num">{res.points}</td>
                <td className="small muted">{res.status}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
          }
          mobile={
            <MobileTable rows={stats.rows.map(({ race, res }): MobileRow => ({
              key: race.round,
              rowClass: res.positionText === "1" ? "leader" : undefined,
              left: <span className="mpos">{res.positionText}</span>,
              title: (
                <Link to={`/gara/${race.season}/${race.round}`}>
                  <span className="nat">{countryCode(race.Circuit.Location.country)}</span>
                  <b>{race.raceName}</b>
                </Link>
              ),
              subtitle: `${t("round")} ${race.round} · ${res.status}`,
              value: res.points,
              details: (
                <MDetails items={[
                  { label: t("time_gap"), value: <span className="mono">{gapText(res)}</span> },
                  { label: t("status"), value: res.status },
                ]} />
              ),
            }))} />
          }
        />
      )}
      <p className="small muted mt row">
        <Database size={14} aria-hidden="true" />
        <span>{lang === "it" ? "Dati: Jolpica F1 API" : "Data: Jolpica F1 API"}</span>
      </p>
    </div>
  );
}

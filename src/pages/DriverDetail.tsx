/* Driver detail: season stats, race-by-race table, points progression chart. */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard, gapText } from "../components/ui";
import { Sparkline } from "../components/charts";
import { countryFlag, initials, nationalityFlag, teamColor } from "../data/meta";

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

  return (
    <div>
      <PageHeader
        title={`${nationalityFlag(data.driver.nationality)} ${name}`}
        sub={`#${data.driver.permanentNumber ?? "–"} · ${data.teamName} · ${t("age")}: ${ageOf(data.driver.dateOfBirth)}`}
        right={<FavButton item={{ kind: "driver", id: data.driver.driverId, label: name }} />}
      />

      <div className="grid grid-4">
        {[
          [t("points"), stats.points],
          [t("wins"), stats.wins],
          [t("podiums"), stats.podiums],
          [t("poles"), stats.poles],
        ].map(([label, v]) => (
          <div className="card" key={label as string} style={{ textAlign: "center" }}>
            <div className="num" style={{ fontSize: "1.9rem", fontWeight: 850 }}>{v}</div>
            <div className="small muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("points_progression")}</h3>
          <Sparkline values={stats.progression} width={420} height={140} stroke={color} ariaLabel={t("points_progression")} />
          <p className="small muted" style={{ marginBottom: 0 }}>
            {t("dnfs")}: {stats.dnfs} · {t("best_result")}: {stats.best ? `P${stats.best}` : "–"}
          </p>
        </div>
        <div className="card" style={{ display: "grid", placeItems: "center" }}>
          <span className="avatar-init" style={{ background: color, width: 96, height: 96, fontSize: "1.8rem", borderRadius: 24 }}>
            {initials(name)}
          </span>
          <p className="muted small" style={{ margin: "10px 0 0" }}>{data.teamName}</p>
        </div>
      </div>

      <h2 className="section-title">🏁 {t("race_by_race")}</h2>
      {stats.rows.length === 0 ? (
        <EmptyState title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>{t("round")}</th><th>{t("gp")}</th><th>{t("position")}</th><th>{t("time_gap")}</th><th>{t("points")}</th><th>{t("status")}</th></tr></thead>
          <tbody>
            {stats.rows.map(({ race, res }) => (
              <tr key={race.round}>
                <td className="num">{race.round}</td>
                <td><Link to={`/gara/${race.season}/${race.round}`}>{countryFlag(race.Circuit.Location.country)} {race.raceName}</Link></td>
                <td className="pos num">{res.positionText}</td>
                <td className="num">{gapText(res)}</td>
                <td className="num">{res.points}</td>
                <td className="small muted">{res.status}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <p className="small muted mt">{lang === "it" ? "Dati: Jolpica F1 API" : "Data: Jolpica F1 API"}</p>
    </div>
  );
}

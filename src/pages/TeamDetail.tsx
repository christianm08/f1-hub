/* Team detail: stats, drivers, race-by-race results. */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, Flag, Medal, Sigma, Trophy, Users } from "lucide-react";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { BarList } from "../components/charts";
import { countryCode, initials, nationalityCode, teamColor } from "../data/meta";

interface DetailData {
  name: string;
  id: string;
  nationality: string;
  races: ({ Results: RaceResult[] } & RaceInfo)[];
}

async function load(season: string, constructorId: string): Promise<DetailData> {
  const [teams, races] = await Promise.all([
    jolpica.constructors(season),
    jolpica.constructorResults(season, constructorId),
  ]);
  const team = teams.find((c) => c.constructorId === constructorId);
  if (!team) throw new Error("not_found");
  return { name: team.name, id: team.constructorId, nationality: team.nationality, races };
}

export default function TeamDetail() {
  const { constructorId = "" } = useParams();
  const { t, season } = useSettings();
  const { status, data, retry } = useApi(() => load(season, constructorId), [season, constructorId]);

  const stats = useMemo(() => {
    if (!data) return null;
    let points = 0, wins = 0, podiums = 0;
    const drivers = new Map<string, { name: string; points: number; code?: string; nat: string; id: string }>();
    const perRace = data.races.map((r) => {
      let racePts = 0;
      for (const res of r.Results) {
        racePts += parseFloat(res.points);
        points += parseFloat(res.points);
        if (res.positionText === "1") wins++;
        if (["1", "2", "3"].includes(res.positionText)) podiums++;
        const key = res.Driver.driverId;
        const cur = drivers.get(key) ?? {
          name: `${res.Driver.givenName} ${res.Driver.familyName}`,
          points: 0, code: res.Driver.code, nat: res.Driver.nationality, id: res.Driver.driverId,
        };
        cur.points += parseFloat(res.points);
        drivers.set(key, cur);
      }
      return { race: r, points: racePts, results: r.Results };
    });
    return { points, wins, podiums, perRace, drivers: [...drivers.values()].sort((a, b) => b.points - a.points) };
  }, [data]);

  if (status === "loading") {
    return <div><PageHeader title={t("loading")} /><div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data || !stats) {
    return <div><PageHeader title={t("nav_teams")} /><ErrorState onRetry={retry} /></div>;
  }

  const color = teamColor(data.id);

  const kpis: { icon: React.ReactNode; label: string; value: string | number }[] = [
    { icon: <Sigma size={13} aria-hidden="true" />, label: t("points"), value: stats.points },
    { icon: <Trophy size={13} aria-hidden="true" />, label: t("wins"), value: stats.wins },
    { icon: <Medal size={13} aria-hidden="true" />, label: t("podiums"), value: stats.podiums },
    { icon: <Users size={13} aria-hidden="true" />, label: t("nav_drivers"), value: stats.drivers.length },
  ];

  return (
    <div>
      <PageHeader
        title={data.name}
        sub={`${t("season")} ${season}`}
        right={<FavButton item={{ kind: "team", id: data.id, label: data.name }} />}
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
          <h3 className="card-title"><Users size={17} aria-hidden="true" />{t("nav_drivers")}</h3>
          {stats.drivers.map((d) => (
            <Link key={d.id} to={`/piloti/${d.id}`} className="driver-row">
              <span className="avatar-init" style={{ background: color }}>{initials(d.name)}</span>
              <span>
                <b style={{ display: "flex", alignItems: "center", fontSize: "0.92rem" }}>
                  <span className="nat">{nationalityCode(d.nat)}</span>{d.name}
                </b>
                <span className="small muted">{d.code}</span>
              </span>
              <b className="num" style={{ marginLeft: "auto" }}>{d.points}</b>
            </Link>
          ))}
        </div>
        <div className="card">
          <h3 className="card-title"><BarChart3 size={17} aria-hidden="true" />{t("points")} {t("race_by_race").toLowerCase()}</h3>
          <BarList
            items={stats.perRace.map((p) => ({
              label: `R${p.race.round} ${p.race.raceName.replace(" Grand Prix", "")}`,
              value: p.points,
              color,
            }))}
          />
        </div>
      </div>

      <h2 className="section-title"><Flag size={18} aria-hidden="true" />{t("race_by_race")}</h2>
      {stats.perRace.length === 0 ? (
        <EmptyState title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <ResponsiveTable
          desktop={
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>{t("round")}</th><th>{t("gp")}</th><th>{t("driver")}</th><th>{t("position")}</th><th>{t("points")}</th></tr></thead>
          <tbody>
            {stats.perRace.flatMap((p) =>
              p.results.map((r) => (
                <tr key={`${p.race.round}-${r.Driver.driverId}`} className={r.positionText === "1" ? "leader" : undefined}>
                  <td className="num">{p.race.round}</td>
                  <td><Link to={`/gara/${p.race.season}/${p.race.round}`}><span className="nat">{countryCode(p.race.Circuit.Location.country)}</span>{p.race.raceName}</Link></td>
                  <td><b>{r.Driver.code ?? r.Driver.familyName}</b></td>
                  <td className="pos num">{r.positionText}</td>
                  <td className="num">{r.points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
          }
          mobile={
            <MobileTable rows={stats.perRace.flatMap((p) =>
              p.results.map((r): MobileRow => ({
                key: `${p.race.round}-${r.Driver.driverId}`,
                rowClass: r.positionText === "1" ? "leader" : undefined,
                left: <span className="mpos">{r.positionText}</span>,
                title: (
                  <Link to={`/gara/${p.race.season}/${p.race.round}`}>
                    <span className="nat">{countryCode(p.race.Circuit.Location.country)}</span>
                    <b>{p.race.raceName}</b>
                  </Link>
                ),
                subtitle: `${r.Driver.code ?? r.Driver.familyName} · R${p.race.round}`,
                value: r.points,
              }))
            )} />
          }
        />
      )}
    </div>
  );
}

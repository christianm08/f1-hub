/* Team detail: stats, drivers, race-by-race results.
 * Team identity: normalized TeamModel (Jolpica + f1api.dev enrichment). */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, Building2, CarFront, Flag, Medal, Sigma, Trophy, Users } from "lucide-react";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { loadTeamModels, type TeamModel } from "../api/model";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { BarList } from "../components/charts";
import { DriverPhoto } from "../components/DriverPhoto";
import { TeamLogo } from "../components/TeamLogo";
import { CarImage } from "../components/CarImage";
import type { FetchOpts } from "../api/client";
import { countryCode, nationalityCode, teamColor } from "../data/meta";

interface DetailData {
  team: TeamModel;
  races: ({ Results: RaceResult[] } & RaceInfo)[];
}

async function load(season: string, constructorId: string, o?: FetchOpts): Promise<DetailData> {
  const [models, races] = await Promise.all([
    loadTeamModels(season, o),
    jolpica.constructorResults(season, constructorId, o),
  ]);
  const team = models.find((m) => m.id === constructorId);
  if (!team) throw new Error("not_found");
  return { team, races };
}

export default function TeamDetail() {
  const { constructorId = "" } = useParams();
  const { t } = useSettings();
  // ?season= in the URL preserves the season context from the list page.
  const [season] = useSeasonParam();
  const { status, data, retry } = useApi((signal) => load(season, constructorId, { signal }), [season, constructorId]);

  const stats = useMemo(() => {
    if (!data) return null;
    let points = 0, wins = 0, podiums = 0;
    const drivers = new Map<string, { name: string; points: number; code?: string; nat: string; id: string; wikiUrl?: string }>();
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
          wikiUrl: res.Driver.url,
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

  const color = teamColor(data.team.id);

  const kpis: { icon: React.ReactNode; label: string; value: string | number }[] = [
    { icon: <Sigma size={13} aria-hidden="true" />, label: t("points"), value: stats.points },
    { icon: <Trophy size={13} aria-hidden="true" />, label: t("wins"), value: stats.wins },
    { icon: <Medal size={13} aria-hidden="true" />, label: t("podiums"), value: stats.podiums },
    { icon: <Users size={13} aria-hidden="true" />, label: t("nav_drivers"), value: stats.drivers.length },
  ];

  return (
    <div>
      <PageHeader
        title={data.team.name}
        sub={`${t("season")} ${season}`}
        right={<><span className="season-badge">{season}</span><FavButton item={{ kind: "team", id: data.team.id, label: data.team.name }} /></>}
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
          <div className="row">
            <TeamLogo constructorId={data.team.id} name={data.team.name} size={64} tint={color} />
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>{data.team.name}</h3>
              <p className="muted small" style={{ margin: "2px 0 0" }}>
                <span className="nat" style={{ marginRight: 0 }}>{nationalityCode(data.team.nationality)}</span>{" "}
                {data.team.nationality}
              </p>
            </div>
          </div>
          <hr className="divider" />
          <h3 className="card-title"><CarFront size={17} aria-hidden="true" />{t("monoposto")} · {season}</h3>
          <CarImage constructorId={data.team.id} season={season} teamName={data.team.name} tint={color} />
        </div>
        <div className="card">
          <h3 className="card-title"><Users size={17} aria-hidden="true" />{t("nav_drivers")}</h3>
          {stats.drivers.map((d) => (
            <Link key={d.id} to={`/piloti/${d.id}?season=${season}`} className="driver-row">
              <DriverPhoto driverId={d.id} wikiUrl={d.wikiUrl} name={d.name} size={44} tint={color} historic={parseInt(season, 10) < 2000} />
              <span>
                <b style={{ display: "flex", alignItems: "center", fontSize: "0.92rem" }}>
                  <span className="nat">{nationalityCode(d.nat)}</span>{d.name}
                </b>
                <span className="small muted">{d.code}</span>
              </span>
              <b className="num" style={{ marginLeft: "auto" }}>{d.points}</b>
            </Link>
          ))}
          {data.team.enriched && (
            <>
              <hr className="divider" />
              <h3 className="card-title"><Building2 size={17} aria-hidden="true" />{t("team_info")}</h3>
              <dl className="kv">
                {data.team.country && (<><dt>{t("country")}</dt><dd>{data.team.country}</dd></>)}
                {data.team.firstSeason != null && (<><dt>{t("first_season")}</dt><dd className="num">{data.team.firstSeason}</dd></>)}
                {data.team.constructorsTitles != null && (<><dt>{t("titles_constructors")}</dt><dd className="num">{data.team.constructorsTitles}</dd></>)}
                {data.team.driversTitles != null && (<><dt>{t("titles_drivers")}</dt><dd className="num">{data.team.driversTitles}</dd></>)}
              </dl>
            </>
          )}
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

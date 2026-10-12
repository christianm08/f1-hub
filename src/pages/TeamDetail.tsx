/* Team detail: stats, drivers, race-by-race results.
 * Team identity: normalized TeamModel (Jolpica + f1api.dev enrichment). */
import { useMemo, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { loadTeamModels, type TeamModel } from "../api/model";
import { ApiError } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { MButton, MCard, MDivider, MIcon, MList, MListItem, type MIconName } from "../design";
import { MobileTable, MTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { BarList } from "../components/charts";
import { DriverPhoto } from "../components/DriverPhoto";
import { TeamLogo } from "../components/TeamLogo";
import { CarImage } from "../components/CarImage";
import type { FetchOpts } from "../api/client";
import { countryCode, nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

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
  if (!team) throw new ApiError("team_not_found");
  return { team, races };
}

export default function TeamDetail() {
  const { constructorId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useSettings();
  // ?season= in the URL preserves the season context from the list page.
  const [season] = useSeasonParam();
  const { status, data, retry, error } = useApi((signal) => load(season, constructorId, { signal }), [season, constructorId]);

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
    return <div><PageHeader title={t("loading")} /><div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data || !stats) {
    if (error?.message === "team_not_found") {
      return (
        <div>
          <PageHeader title={t("nav_teams")} sub={`${t("season")} ${season}`} />
          <EmptyState
            icon="corporate_fare"
            title={t("team_not_in_season_title")}
            body={t("team_not_in_season_body")}
          />
          <p style={{ marginTop: 12 }}>
            <MButton variant="filled" onClick={() => navigate(`/team?season=${season}`)}>
              {t("back_to_teams")}
            </MButton>
          </p>
        </div>
      );
    }
    return <div><PageHeader title={t("nav_teams")} /><ErrorState onRetry={retry} /></div>;
  }

  const color = teamColor(data.team.id);

  const kpis: { icon: MIconName; label: string; value: string | number }[] = [
    { icon: "functions", label: t("points"), value: stats.points },
    { icon: "trophy", label: t("wins"), value: stats.wins },
    { icon: "military_tech", label: t("podiums"), value: stats.podiums },
    { icon: "group", label: t("nav_drivers"), value: stats.drivers.length },
  ];

  return (
    <div>
      <PageHeader
        title={data.team.name}
        sub={`${t("season")} ${season}`}
        right={<><span className="m3-pill">{season}</span><FavButton item={{ kind: "team", id: data.team.id, label: data.team.name, season }} /></>}
      />

      <div className="m3-grid m3-grid--4">
        {kpis.map((k) => (
          <MCard key={k.label} variant="filled" className="m3-kpi" style={{ "--m3-kpi-accent": color } as CSSProperties}>
            <div className="m3-kpi-value num">{k.value}</div>
            <div className="m3-kpi-label"><MIcon name={k.icon} size={18} />{k.label}</div>
          </MCard>
        ))}
      </div>

      <div className="m3-grid m3-grid--2" style={{ marginTop: 16 }}>
        <MCard variant="outlined">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <TeamLogo constructorId={data.team.id} name={data.team.name} size={64} tint={color} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{data.team.name}</h3>
              <p className="m3-muted" style={{ margin: "2px 0 0", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <FlagIcon code={nationalityCode(data.team.nationality)} />{" "}
                {data.team.nationality}
              </p>
            </div>
          </div>
          <MDivider />
          <h3 className="m3-card-title"><MIcon name="directions_car" />{t("monoposto")} · {season}</h3>
          <CarImage constructorId={data.team.id} season={season} teamName={data.team.name} tint={color} />
        </MCard>
        <MCard variant="outlined">
          <h3 className="m3-card-title"><MIcon name="group" />{t("nav_drivers")}</h3>
          <MList ariaLabel={t("nav_drivers")}>
            {stats.drivers.map((d) => (
              <MListItem
                key={d.id}
                headline={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <FlagIcon code={nationalityCode(d.nat)} />
                    <b>{d.name}</b>
                  </span>
                }
                supportingText={d.code}
                leading={<DriverPhoto driverId={d.id} wikiUrl={d.wikiUrl} name={d.name} size={44} tint={color} historic={parseInt(season, 10) < 2000} />}
                trailing={<b className="num">{d.points}</b>}
                onClick={() => navigate(`/piloti/${d.id}?season=${season}`)}
              />
            ))}
          </MList>
          {data.team.enriched && (
            <>
              <MDivider />
              <h3 className="m3-card-title"><MIcon name="corporate_fare" />{t("team_info")}</h3>
              <dl className="m3-kv">
                {data.team.country && (<><dt>{t("country")}</dt><dd>{data.team.country}</dd></>)}
                {data.team.firstSeason != null && (<><dt>{t("first_season")}</dt><dd className="num">{data.team.firstSeason}</dd></>)}
                {data.team.constructorsTitles != null && (<><dt>{t("titles_constructors")}</dt><dd className="num">{data.team.constructorsTitles}</dd></>)}
                {data.team.driversTitles != null && (<><dt>{t("titles_drivers")}</dt><dd className="num">{data.team.driversTitles}</dd></>)}
              </dl>
            </>
          )}
        </MCard>
        <MCard variant="outlined">
          <h3 className="m3-card-title"><MIcon name="bar_chart" />{t("points")} {t("race_by_race").toLowerCase()}</h3>
          <BarList
            items={stats.perRace.map((p) => ({
              label: `R${p.race.round} ${p.race.raceName.replace(" Grand Prix", "")}`,
              value: p.points,
              color,
            }))}
          />
        </MCard>
      </div>

      <div className="m3-section-head">
        <h2 className="m3-section-title"><MIcon name="flag" />{t("race_by_race")}</h2>
      </div>
      {stats.perRace.length === 0 ? (
        <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <ResponsiveTable
          desktop={
            <MTable
              ariaLabel={t("race_by_race")}
              head={<><th>{t("round")}</th><th>{t("gp")}</th><th>{t("driver")}</th><th>{t("position")}</th><th className="num">{t("points")}</th></>}
            >
              {stats.perRace.flatMap((p) =>
                p.results.map((r) => (
                  <tr key={`${p.race.round}-${r.Driver.driverId}`} className={r.positionText === "1" ? "leader" : undefined}>
                    <td className="num">{p.race.round}</td>
                    <td><Link to={`/gara/${p.race.season}/${p.race.round}`}><FlagIcon code={countryCode(p.race.Circuit.Location.country)} /> {p.race.raceName}</Link></td>
                    <td><b>{r.Driver.code ?? r.Driver.familyName}</b></td>
                    <td className="num"><b>{r.positionText}</b></td>
                    <td className="num">{r.points}</td>
                  </tr>
                ))
              )}
            </MTable>
          }
          mobile={
            <MobileTable rows={stats.perRace.flatMap((p) =>
              p.results.map((r): MobileRow => ({
                key: `${p.race.round}-${r.Driver.driverId}`,
                rowClass: r.positionText === "1" ? "leader" : undefined,
                left: <span className="mpos">{r.positionText}</span>,
                title: (
                  <Link to={`/gara/${p.race.season}/${p.race.round}`}>
                    <FlagIcon code={countryCode(p.race.Circuit.Location.country)} />
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

/* Teams list. Season-aware: ?season= in the URL is the source of truth
 * (see useSeasonParam). Shows the constructors of the selected season with
 * their drivers of that year and the season-exact car photo. Data:
 * normalized TeamModel/DriverModel (Jolpica + f1api.dev). */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { loadDriverModels, loadTeamModels } from "../api/model";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";
import { TeamLogo } from "../components/TeamLogo";
import { CarImage } from "../components/CarImage";
import { nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

export default function Teams() {
  const { t } = useSettings();
  const [season, setSeason] = useSeasonParam();
  const { status, data, retry } = useApi((signal) => loadTeamModels(season, { signal }), [season]);
  // Drivers of the same season, to list each team's lineup that year.
  const driversApi = useApi((signal) => loadDriverModels(season, { signal }), [season]);

  const driversByTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of driversApi.data ?? []) {
      for (const tm of d.teams) {
        const arr = map.get(tm.id) ?? [];
        if (!arr.includes(d.fullName)) arr.push(d.fullName);
        map.set(tm.id, arr);
      }
    }
    return map;
  }, [driversApi.data]);

  const header = (
    <PageHeader
      title={t("nav_teams")}
      sub={`${t("season")} ${season}`}
      right={<SeasonSelect value={season} onChange={setSeason} id="teams-season" />}
    />
  );

  if (status === "loading") {
    return <div>{header}<div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div>{header}<ErrorState onRetry={retry} /></div>;

  const ordered = data;
  if (ordered.length === 0) return <div>{header}<EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      {header}
      <div className="grid grid-3">
        {ordered.map((c) => {
          const color = teamColor(c.id);
          const lineup = driversByTeam.get(c.id) ?? [];
          return (
            <Link key={c.id} to={`/team/${c.id}?season=${season}`} className="card team-card">
              <div className="spread">
                <TeamLogo constructorId={c.id} name={c.name} size={52} tint={color} />
                <FavButton item={{ kind: "team", id: c.id, label: c.name, season }} />
              </div>
              <h3 className="card-title" style={{ margin: "12px 0 4px" }}>
                <FlagIcon code={nationalityCode(c.nationality)} />
                <span>{c.name}</span>
              </h3>
              {lineup.length > 0 && (
                <p className="muted small" style={{ margin: "0 0 8px" }}>{lineup.join(" · ")}</p>
              )}
              <CarImage constructorId={c.id} season={season} teamName={c.name} tint={color} />
              <div className="spread mt">
                <span className="badge">{c.position ? `P${c.position}` : "–"}</span>
                <b className="num">{c.points ? `${c.points} ${t("points").toLowerCase()}` : ""}</b>
              </div>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                {t("wins")}: <b className="num">{c.wins ?? "–"}</b>
                {c.constructorsTitles != null && (
                  <> · {t("titles")}: <b className="num">{c.constructorsTitles}</b></>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

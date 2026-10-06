/* Drivers list with standings summary. Season-aware: ?season= in the URL
 * is the source of truth (see useSeasonParam), data always refers to the
 * selected season. Data: normalized DriverModel (Jolpica + f1api.dev). */
import { Link } from "react-router-dom";
import { loadDriverModels } from "../api/model";
import { preloadDriverPhotos } from "../api/photos";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";
import { DriverPhoto } from "../components/DriverPhoto";
import { nationalityCode, teamColor } from "../data/meta";
import { useEffect } from "react";

export default function Drivers() {
  const { t } = useSettings();
  const [season, setSeason] = useSeasonParam();
  const { status, data, retry } = useApi((signal) => loadDriverModels(season, { signal }), [season]);

  useEffect(() => {
    if (data) {
      preloadDriverPhotos(data.map((d) => ({ driverId: d.id, wikiUrl: d.wikiUrl, name: d.fullName })));
    }
  }, [data]);

  const header = (
    <PageHeader
      title={t("nav_drivers")}
      sub={`${t("season")} ${season}`}
      right={<SeasonSelect value={season} onChange={setSeason} id="drivers-season" />}
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
        {ordered.map((d) => {
          const color = teamColor(d.teamId ?? "");
          return (
            <Link key={d.id} to={`/piloti/${d.id}?season=${season}`} className="card driver-card">
              <div className="spread">
                <DriverPhoto driverId={d.id} wikiUrl={d.wikiUrl} name={d.fullName} size={56} tint={color} historic={parseInt(season, 10) < 2000} />
                <FavButton item={{ kind: "driver", id: d.id, label: d.fullName, season }} />
              </div>
              <h3 className="card-title" style={{ margin: "12px 0 4px" }}>
                <span className="nat">{nationalityCode(d.nationality)}</span>
                <span>{d.fullName}</span>
              </h3>
              <p className="muted small" style={{ margin: 0 }}>#{d.number ?? "–"}</p>
              <div className="team-chips" aria-label={t("team")}>
                {d.teams.length > 0 ? d.teams.map((tm) => (
                  <span key={tm.id} className="chip" style={{ ["--chip-color" as string]: teamColor(tm.id) }}>
                    {tm.name}
                  </span>
                )) : <span className="muted small">–</span>}
              </div>
              <div className="spread mt">
                <span className="badge">{d.position ? `P${d.position}` : "–"}</span>
                <b className="num">{d.points ? `${d.points} ${t("points").toLowerCase()}` : ""}</b>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

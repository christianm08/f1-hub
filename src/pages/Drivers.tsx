/* Drivers list with standings summary. Data: normalized DriverModel (Jolpica + f1api.dev). */
import { Link } from "react-router-dom";
import { loadDriverModels } from "../api/model";
import { preloadDriverPhotos } from "../api/photos";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { DriverPhoto } from "../components/DriverPhoto";
import { nationalityCode, teamColor } from "../data/meta";
import { useEffect } from "react";

export default function Drivers() {
  const { t, season } = useSettings();
  const { status, data, retry } = useApi(() => loadDriverModels(season), [season]);

  useEffect(() => {
    if (data) {
      preloadDriverPhotos(data.map((d) => ({ wikiUrl: d.wikiUrl, name: d.fullName })));
    }
  }, [data]);

  if (status === "loading") {
    return <div><PageHeader title={t("nav_drivers")} /><div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_drivers")} /><ErrorState onRetry={retry} /></div>;

  const ordered = data;
  if (ordered.length === 0) return <div><PageHeader title={t("nav_drivers")} /><EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      <PageHeader title={t("nav_drivers")} sub={`${t("season")} ${season}`} />
      <div className="grid grid-3">
        {ordered.map((d) => {
          const color = teamColor(d.teamId ?? "");
          return (
            <Link key={d.id} to={`/piloti/${d.id}`} className="card driver-card">
              <div className="spread">
                <DriverPhoto wikiUrl={d.wikiUrl} name={d.fullName} size={56} tint={color} />
                <FavButton item={{ kind: "driver", id: d.id, label: d.fullName }} />
              </div>
              <h3 className="card-title" style={{ margin: "12px 0 4px" }}>
                <span className="nat">{nationalityCode(d.nationality)}</span>
                <span>{d.fullName}</span>
              </h3>
              <p className="muted small" style={{ margin: 0 }}>#{d.number ?? "–"} · {d.teamName ?? "–"}</p>
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

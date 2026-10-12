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
import { MCard } from "../design";
import { Badge } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";
import { DriverPhoto } from "../components/DriverPhoto";
import { nationalityCode, teamColor } from "../data/meta";
import { useEffect, type CSSProperties } from "react";
import { FlagIcon } from "../components/FlagIcon";

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
    return <div>{header}<div className="m3-grid m3-grid--3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div>{header}<ErrorState onRetry={retry} /></div>;

  const ordered = data;
  if (ordered.length === 0) return <div>{header}<EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      {header}
      <div className="m3-grid m3-grid--3">
        {ordered.map((d, i) => {
          const color = teamColor(d.teamId ?? "");
          return (
            <Link key={d.id} to={`/piloti/${d.id}?season=${season}`} className="m3-card-link">
              <MCard
                variant="outlined"
                className="m3-driver-card m3-enter"
                style={{ "--m3-card-accent": color, animationDelay: `${Math.min(i, 11) * 45}ms` } as CSSProperties}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <DriverPhoto driverId={d.id} wikiUrl={d.wikiUrl} name={d.fullName} size={76} tint={color} historic={parseInt(season, 10) < 2000} />
                  <FavButton item={{ kind: "driver", id: d.id, label: d.fullName, season }} />
                </div>
                <h3 style={{ margin: "12px 0 4px", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <FlagIcon code={nationalityCode(d.nationality)} />
                  <span>{d.fullName}</span>
                </h3>
                <p className="m3-muted num" style={{ margin: 0, fontSize: "0.88rem" }}>#{d.number ?? "–"}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }} aria-label={t("team")}>
                  {d.teams.length > 0 ? d.teams.map((tm) => (
                    <span key={tm.id} className="m3-pill">
                      <span className="m3-team-dot" style={{ background: teamColor(tm.id), marginRight: 0 }} aria-hidden="true" />
                      {tm.name}
                    </span>
                  )) : <span className="m3-muted" style={{ fontSize: "0.85rem" }}>–</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <Badge>{d.position ? `P${d.position}` : "–"}</Badge>
                  <b className="num">{d.points ? `${d.points} ${t("points").toLowerCase()}` : ""}</b>
                </div>
              </MCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

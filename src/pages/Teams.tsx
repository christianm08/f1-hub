/* Teams list. Data: normalized TeamModel (Jolpica + f1api.dev). */
import { Link } from "react-router-dom";
import { loadTeamModels } from "../api/model";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { initials, nationalityCode, teamColor } from "../data/meta";

export default function Teams() {
  const { t, season } = useSettings();
  const { status, data, retry } = useApi(() => loadTeamModels(season), [season]);

  if (status === "loading") {
    return <div><PageHeader title={t("nav_teams")} /><div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_teams")} /><ErrorState onRetry={retry} /></div>;

  const ordered = data;
  if (ordered.length === 0) return <div><PageHeader title={t("nav_teams")} /><EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      <PageHeader title={t("nav_teams")} sub={`${t("season")} ${season}`} />
      <div className="grid grid-3">
        {ordered.map((c) => {
          const color = teamColor(c.id);
          return (
            <Link key={c.id} to={`/team/${c.id}`} className="card">
              <div className="spread">
                <span className="avatar-init" style={{ background: color }}>{initials(c.name)}</span>
                <FavButton item={{ kind: "team", id: c.id, label: c.name }} />
              </div>
              <h3 className="card-title" style={{ margin: "12px 0 4px" }}>
                <span className="nat">{nationalityCode(c.nationality)}</span>
                <span>{c.name}</span>
              </h3>
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

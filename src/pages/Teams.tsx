/* Teams list. */
import { Link } from "react-router-dom";
import { jolpica } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { initials, nationalityFlag, teamColor } from "../data/meta";

export default function Teams() {
  const { t, season } = useSettings();
  const { status, data, retry } = useApi(
    () => Promise.all([jolpica.constructors(season), jolpica.constructorStandings(season).catch(() => [])]),
    [season]
  );

  if (status === "loading") {
    return <div><PageHeader title={t("nav_teams")} /><div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_teams")} /><ErrorState onRetry={retry} /></div>;

  const [teams, standings] = data;
  const standById = new Map(standings.map((s) => [s.Constructor.constructorId, s]));
  const ordered = [...teams].sort((a, b) => {
    const pa = parseInt(standById.get(a.constructorId)?.position ?? "99", 10);
    const pb = parseInt(standById.get(b.constructorId)?.position ?? "99", 10);
    return pa - pb;
  });

  if (ordered.length === 0) return <div><PageHeader title={t("nav_teams")} /><EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      <PageHeader title={t("nav_teams")} sub={`${t("season")} ${season}`} />
      <div className="grid grid-3">
        {ordered.map((c) => {
          const s = standById.get(c.constructorId);
          const color = teamColor(c.constructorId);
          return (
            <Link key={c.constructorId} to={`/team/${c.constructorId}`} className="card">
              <div className="spread">
                <span className="avatar-init" style={{ background: color }}>{initials(c.name)}</span>
                <FavButton item={{ kind: "team", id: c.constructorId, label: c.name }} />
              </div>
              <h3 style={{ margin: "10px 0 2px" }}>{nationalityFlag(c.nationality)} {c.name}</h3>
              <div className="spread mt">
                <span className="badge">{s ? `P${s.position}` : "–"}</span>
                <b className="num">{s ? `${s.points} ${t("points").toLowerCase()}` : ""}</b>
              </div>
              {s && (
                <p className="small muted" style={{ margin: "8px 0 0" }}>
                  {t("wins")}: {s.wins}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

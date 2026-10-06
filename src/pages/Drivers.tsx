/* Drivers list with standings summary. */
import { Link } from "react-router-dom";
import { jolpica } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { initials, nationalityFlag, teamColor } from "../data/meta";

export default function Drivers() {
  const { t, season } = useSettings();
  const { status, data, retry } = useApi(
    () => Promise.all([jolpica.drivers(season), jolpica.driverStandings(season).catch(() => [])]),
    [season]
  );

  if (status === "loading") {
    return <div><PageHeader title={t("nav_drivers")} /><div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_drivers")} /><ErrorState onRetry={retry} /></div>;

  const [drivers, standings] = data;
  const standById = new Map(standings.map((s) => [s.Driver.driverId, s]));
  const ordered = [...drivers].sort((a, b) => {
    const pa = parseInt(standById.get(a.driverId)?.position ?? "99", 10);
    const pb = parseInt(standById.get(b.driverId)?.position ?? "99", 10);
    return pa - pb;
  });

  if (ordered.length === 0) return <div><PageHeader title={t("nav_drivers")} /><EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      <PageHeader title={t("nav_drivers")} sub={`${t("season")} ${season}`} />
      <div className="grid grid-3">
        {ordered.map((d) => {
          const s = standById.get(d.driverId);
          const color = teamColor(s?.Constructors[0]?.constructorId ?? "");
          return (
            <Link key={d.driverId} to={`/piloti/${d.driverId}`} className="card">
              <div className="spread">
                <span className="avatar-init" style={{ background: color }}>{initials(`${d.givenName} ${d.familyName}`)}</span>
                <FavButton item={{ kind: "driver", id: d.driverId, label: `${d.givenName} ${d.familyName}` }} />
              </div>
              <h3 style={{ margin: "10px 0 2px" }}>{nationalityFlag(d.nationality)} {d.givenName} {d.familyName}</h3>
              <p className="muted small" style={{ margin: 0 }}>#{d.permanentNumber ?? "–"} · {s?.Constructors[0]?.name ?? "–"}</p>
              <div className="spread mt">
                <span className="badge">{s ? `P${s.position}` : "–"}</span>
                <b className="num">{s ? `${s.points} ${t("points").toLowerCase()}` : ""}</b>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

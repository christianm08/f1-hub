/* Standings: drivers + constructors with season selector (API-supported seasons only). */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jolpica } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";
import { nationalityFlag, teamColor } from "../data/meta";

const MIN_SEASON = "2014";

export default function Standings() {
  const { t, season: defaultSeason } = useSettings();
  const [season, setSeason] = useState(defaultSeason);
  const [seasons, setSeasons] = useState<string[]>([]);

  useEffect(() => {
    jolpica.seasons()
      .then((all) => setSeasons(all.filter((s) => s >= MIN_SEASON).reverse()))
      .catch(() => setSeasons([]));
  }, []);

  const { status, data, retry } = useApi(
    () => Promise.all([
      jolpica.driverStandings(season).catch(() => []),
      jolpica.constructorStandings(season).catch(() => []),
    ]),
    [season]
  );

  const renderBody = () => {
    if (status === "loading") {
      return <div className="grid grid-2"><SkeletonCard /><SkeletonCard /></div>;
    }
    if (status === "error" || !data) return <ErrorState onRetry={retry} />;
    const [drivers, constructors] = data;
    if (drivers.length === 0) return <EmptyState title={t("empty_title")} body={t("empty_body")} />;
    return (
      <div className="grid grid-2">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>🏆 {t("driver_standings")}</h2>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th>{t("points")}</th><th>{t("wins")}</th></tr></thead>
            <tbody>
              {drivers.map((s, i) => (
                <tr key={s.Driver.driverId} className={i === 0 ? "leader" : ""}>
                  <td className="pos num">{s.positionText}</td>
                  <td><Link to={`/piloti/${s.Driver.driverId}`}><b>{s.Driver.code ?? s.Driver.familyName}</b> <span className="muted small">{s.Driver.givenName} {s.Driver.familyName}</span></Link></td>
                  <td><span className="team-dot" style={{ background: teamColor(s.Constructors[0]?.constructorId ?? "") }} />{s.Constructors[0]?.name}</td>
                  <td className="num"><b>{s.points}</b></td>
                  <td className="num">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>🏎️ {t("constructor_standings")}</h2>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>{t("position")}</th><th>{t("team")}</th><th>{t("points")}</th><th>{t("wins")}</th></tr></thead>
            <tbody>
              {constructors.map((s, i) => (
                <tr key={s.Constructor.constructorId} className={i === 0 ? "leader" : ""}>
                  <td className="pos num">{s.positionText}</td>
                  <td><Link to={`/team/${s.Constructor.constructorId}`}><span className="team-dot" style={{ background: teamColor(s.Constructor.constructorId) }} /><b>{s.Constructor.name}</b></Link> <span className="muted small">{nationalityFlag(s.Constructor.nationality)}</span></td>
                  <td className="num"><b>{s.points}</b></td>
                  <td className="num">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t("nav_standings")}
        right={
          <div className="field" style={{ margin: 0, minWidth: 130 }}>
            <label htmlFor="st-season">{t("season")}</label>
            <select id="st-season" value={season} onChange={(e) => setSeason(e.target.value)}>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      />
      {renderBody()}
    </div>
  );
}

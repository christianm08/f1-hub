/* Standings: drivers + constructors with season selector (API-supported seasons only). */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Trophy } from "lucide-react";
import { jolpica } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";
import { DriverPhoto } from "../components/DriverPhoto";
import { TeamLogo } from "../components/TeamLogo";
import { MDetails, MobileTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { nationalityCode, teamColor } from "../data/meta";

export default function Standings() {
  const { t, season: defaultSeason } = useSettings();
  const [season, setSeason] = useState(defaultSeason);

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

    const driverRows: MobileRow[] = drivers.map((s, i) => ({
      key: s.Driver.driverId,
      rowClass: i === 0 ? "leader" : undefined,
      left: <span className="mpos">{s.positionText}</span>,
      title: (
        <span className="row" style={{ gap: 10 }}>
          <DriverPhoto
            driverId={s.Driver.driverId}
            wikiUrl={s.Driver.url}
            name={`${s.Driver.givenName} ${s.Driver.familyName}`}
            size={38}
            tint={teamColor(s.Constructors[0]?.constructorId ?? "")}
            historic={parseInt(season, 10) < 2000}
          />
          <Link to={`/piloti/${s.Driver.driverId}?season=${season}`}>
            <span className="nat">{nationalityCode(s.Driver.nationality)}</span>
            <b>{s.Driver.code ?? s.Driver.familyName}</b>{" "}
            <span className="muted">{s.Driver.givenName} {s.Driver.familyName}</span>
          </Link>
        </span>
      ),
      subtitle: s.Constructors[0]?.name,
      value: s.points,
      details: (
        <MDetails items={[
          { label: t("team"), value: s.Constructors[0]?.name ?? "–" },
          { label: t("wins"), value: s.wins },
        ]} />
      ),
    }));

    const constructorRows: MobileRow[] = constructors.map((s, i) => ({
      key: s.Constructor.constructorId,
      rowClass: i === 0 ? "leader" : undefined,
      left: <span className="mpos">{s.positionText}</span>,
      title: (
        <Link to={`/team/${s.Constructor.constructorId}?season=${season}`} className="row" style={{ gap: 10 }}>
          <TeamLogo constructorId={s.Constructor.constructorId} name={s.Constructor.name} size={34} tint={teamColor(s.Constructor.constructorId)} />
          <b>{s.Constructor.name}</b>
        </Link>
      ),
      subtitle: s.Constructor.nationality,
      value: s.points,
      details: (
        <MDetails items={[{ label: t("wins"), value: s.wins }]} />
      ),
    }));

    return (
      <div className="grid grid-2">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}><Trophy aria-hidden="true" /> {t("driver_standings")}</h2>
          <ResponsiveTable
            desktop={
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>
              <th>{t("position")}</th>
              <th>{t("driver")}</th>
              <th>{t("team")}</th>
              <th className="num">{t("points")}</th>
              <th className="num">{t("wins")}</th>
            </tr></thead>
            <tbody>
              {drivers.map((s, i) => (
                <tr key={s.Driver.driverId} className={i === 0 ? "leader" : ""}>
                  <td className="pos num">{s.positionText}</td>
                  <td>
                    <Link to={`/piloti/${s.Driver.driverId}?season=${season}`}>
                      <span className="nat">{nationalityCode(s.Driver.nationality)}</span>{" "}
                      <b>{s.Driver.code ?? s.Driver.familyName}</b>{" "}
                      <span className="muted small">{s.Driver.givenName} {s.Driver.familyName}</span>
                    </Link>
                  </td>
                  <td><span className="team-cell"><span className="team-dot" style={{ background: teamColor(s.Constructors[0]?.constructorId ?? "") }} aria-hidden="true" />{s.Constructors[0]?.name}</span></td>
                  <td className="num"><b>{s.points}</b></td>
                  <td className="num">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
            }
            mobile={<MobileTable rows={driverRows} />}
          />
        </div>
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}><Car aria-hidden="true" /> {t("constructor_standings")}</h2>
          {constructors.length === 0 ? (
            <EmptyState title={t("empty_title")} body={t("not_available_season")} />
          ) : (
          <ResponsiveTable
            desktop={
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>
              <th>{t("position")}</th>
              <th>{t("team")}</th>
              <th className="num">{t("points")}</th>
              <th className="num">{t("wins")}</th>
            </tr></thead>
            <tbody>
              {constructors.map((s, i) => (
                <tr key={s.Constructor.constructorId} className={i === 0 ? "leader" : ""}>
                  <td className="pos num">{s.positionText}</td>
                  <td>
                    <Link to={`/team/${s.Constructor.constructorId}?season=${season}`}>
                      <span className="team-dot" style={{ background: teamColor(s.Constructor.constructorId) }} aria-hidden="true" />
                      <b>{s.Constructor.name}</b>
                    </Link>{" "}
                    <span className="nat">{nationalityCode(s.Constructor.nationality)}</span>
                  </td>
                  <td className="num"><b>{s.points}</b></td>
                  <td className="num">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
            }
            mobile={<MobileTable rows={constructorRows} />}
          />
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t("nav_standings")}
        right={<SeasonSelect id="st-season" value={season} onChange={setSeason} />}
      />
      {renderBody()}
    </div>
  );
}

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
import { FlagIcon } from "../components/FlagIcon";

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
        <Link to={`/piloti/${s.Driver.driverId}?season=${season}`} className="mtitle">
          <DriverPhoto
            driverId={s.Driver.driverId}
            wikiUrl={s.Driver.url}
            name={`${s.Driver.givenName} ${s.Driver.familyName}`}
            size={52}
            tint={teamColor(s.Constructors[0]?.constructorId ?? "")}
            historic={parseInt(season, 10) < 2000}
          />
          <span className="mtitle-text">
            <span className="mtitle-line1">
              <FlagIcon code={nationalityCode(s.Driver.nationality)} />
              <span>{s.Driver.code ?? s.Driver.familyName}</span>
            </span>
            <span className="mtitle-line2">{s.Driver.givenName} {s.Driver.familyName}</span>
            <span className="mtitle-line3">{s.Constructors[0]?.name}</span>
          </span>
        </Link>
      ),
      subtitle: undefined,
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
        <Link to={`/team/${s.Constructor.constructorId}?season=${season}`} className="mtitle">
          <span className="mtitle-media">
            <TeamLogo constructorId={s.Constructor.constructorId} name={s.Constructor.name} size={46} tint={teamColor(s.Constructor.constructorId)} />
          </span>
          <span className="mtitle-text">
            <span className="mtitle-line1">
              <FlagIcon code={nationalityCode(s.Constructor.nationality)} />
              <span>{s.Constructor.name}</span>
            </span>
          </span>
        </Link>
      ),
      subtitle: undefined,
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
                      <FlagIcon code={nationalityCode(s.Driver.nationality)} />{" "}
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
                    <FlagIcon code={nationalityCode(s.Constructor.nationality)} />
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

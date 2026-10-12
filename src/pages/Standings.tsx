/* Standings: drivers + constructors with season selector (API-supported seasons only). */
import { useState } from "react";
import { Link } from "react-router-dom";
import { jolpica } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";
import { MIcon } from "../design";
import { SeasonSelect } from "../components/SeasonSelect";
import { DriverPhoto } from "../components/DriverPhoto";
import { TeamLogo } from "../components/TeamLogo";
import { MDetails, MobileTable, MTable, ResponsiveTable, TeamDot, type MobileRow } from "../components/ResponsiveTable";
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
      return <div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /></div>;
    }
    if (status === "error" || !data) return <ErrorState onRetry={retry} />;
    const [drivers, constructors] = data;
    if (drivers.length === 0) return <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />;

    const driverRows: MobileRow[] = drivers.map((s, i) => ({
      key: s.Driver.driverId,
      rowClass: i === 0 ? "leader" : undefined,
      left: <span className="mpos">{s.positionText}</span>,
      title: (
        <Link to={`/piloti/${s.Driver.driverId}?season=${season}`}>
          <DriverPhoto
            driverId={s.Driver.driverId}
            wikiUrl={s.Driver.url}
            name={`${s.Driver.givenName} ${s.Driver.familyName}`}
            size={52}
            tint={teamColor(s.Constructors[0]?.constructorId ?? "")}
            historic={parseInt(season, 10) < 2000}
          />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FlagIcon code={nationalityCode(s.Driver.nationality)} />
              <b>{s.Driver.code ?? s.Driver.familyName}</b>
            </span>
            <span className="m3-muted" style={{ fontSize: "0.82rem", fontWeight: 400 }}>{s.Driver.givenName} {s.Driver.familyName}</span>
            <span className="m3-muted" style={{ fontSize: "0.82rem", fontWeight: 400 }}>{s.Constructors[0]?.name}</span>
          </span>
        </Link>
      ),
      value: <b>{s.points}</b>,
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
        <Link to={`/team/${s.Constructor.constructorId}?season=${season}`}>
          <TeamLogo constructorId={s.Constructor.constructorId} name={s.Constructor.name} size={46} tint={teamColor(s.Constructor.constructorId)} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FlagIcon code={nationalityCode(s.Constructor.nationality)} />
            <b>{s.Constructor.name}</b>
          </span>
        </Link>
      ),
      value: <b>{s.points}</b>,
      details: (
        <MDetails items={[{ label: t("wins"), value: s.wins }]} />
      ),
    }));

    return (
      <div className="m3-grid m3-grid--2">
        <div>
          <div className="m3-section-head" style={{ marginTop: 0 }}>
            <h2 className="m3-section-title"><MIcon name="trophy" /> {t("driver_standings")}</h2>
          </div>
          <ResponsiveTable
            desktop={
              <MTable
                ariaLabel={t("driver_standings")}
                head={<><th>{t("position")}</th><th>{t("driver")}</th><th>{t("team")}</th><th className="num">{t("points")}</th><th className="num">{t("wins")}</th></>}
              >
                {drivers.map((s, i) => (
                  <tr key={s.Driver.driverId} className={i === 0 ? "leader" : ""}>
                    <td className="num"><b>{s.positionText}</b></td>
                    <td>
                      <Link to={`/piloti/${s.Driver.driverId}?season=${season}`}>
                        <FlagIcon code={nationalityCode(s.Driver.nationality)} />{" "}
                        <b>{s.Driver.code ?? s.Driver.familyName}</b>{" "}
                        <span className="m3-muted" style={{ fontSize: "0.85rem" }}>{s.Driver.givenName} {s.Driver.familyName}</span>
                      </Link>
                    </td>
                    <td><TeamDot color={teamColor(s.Constructors[0]?.constructorId ?? "")} />{s.Constructors[0]?.name}</td>
                    <td className="num"><b>{s.points}</b></td>
                    <td className="num">{s.wins}</td>
                  </tr>
                ))}
              </MTable>
            }
            mobile={<MobileTable rows={driverRows} />}
          />
        </div>
        <div>
          <div className="m3-section-head" style={{ marginTop: 0 }}>
            <h2 className="m3-section-title"><MIcon name="directions_car" /> {t("constructor_standings")}</h2>
          </div>
          {constructors.length === 0 ? (
            <EmptyState icon="search_off" title={t("empty_title")} body={t("not_available_season")} />
          ) : (
            <ResponsiveTable
              desktop={
                <MTable
                  ariaLabel={t("constructor_standings")}
                  head={<><th>{t("position")}</th><th>{t("team")}</th><th className="num">{t("points")}</th><th className="num">{t("wins")}</th></>}
                >
                  {constructors.map((s, i) => (
                    <tr key={s.Constructor.constructorId} className={i === 0 ? "leader" : ""}>
                      <td className="num"><b>{s.positionText}</b></td>
                      <td>
                        <Link to={`/team/${s.Constructor.constructorId}?season=${season}`}>
                          <TeamDot color={teamColor(s.Constructor.constructorId)} />
                          <b>{s.Constructor.name}</b>
                        </Link>{" "}
                        <FlagIcon code={nationalityCode(s.Constructor.nationality)} />
                      </td>
                      <td className="num"><b>{s.points}</b></td>
                      <td className="num">{s.wins}</td>
                    </tr>
                  ))}
                </MTable>
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

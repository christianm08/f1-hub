/* Driver detail: season stats, race-by-race table, points progression chart.
 * Driver identity: normalized DriverModel (Jolpica + f1api.dev enrichment). */
import { useMemo, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jolpica, type RaceInfo, type RaceResult } from "../api/jolpica";
import { loadDriverModels, resolveDriver, type DriverModel } from "../api/model";
import { ApiError } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard, gapText } from "../components/ui";
import { MButton, MCard, MDivider, MIcon, type MIconName } from "../design";
import { MDetails, MobileTable, MTable, ResponsiveTable, type MobileRow } from "../components/ResponsiveTable";
import { Sparkline } from "../components/charts";
import { DriverPhoto } from "../components/DriverPhoto";
import type { FetchOpts } from "../api/client";
import { countryCode, nationalityCode, teamColor } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

interface DetailData {
  driver: DriverModel;
  teamName: string;
  teamId: string;
  races: ({ Results: RaceResult[] } & RaceInfo)[];
}

async function load(season: string, driverId: string, o?: FetchOpts): Promise<DetailData> {
  // Models first: driverIds are not stable across seasons, so resolve the
  // requested id against this season's roster before fetching results.
  const models = await loadDriverModels(season, o);
  const driver = resolveDriver(models, driverId);
  // The driver is not on this season's roster (wrong/foreign-season id):
  // surface a dedicated "not in this season" state, not a generic error.
  if (!driver) throw new ApiError("driver_not_found");
  const races = await jolpica.driverResults(season, driver.id, o);
  const teamId = driver.teamId ?? races[0]?.Results[0]?.Constructor.constructorId ?? "";
  return {
    driver,
    teamName: driver.teamName ?? races[0]?.Results[0]?.Constructor.name ?? "",
    teamId,
    races,
  };
}

function fmtBirthday(iso: string | undefined, lang: "it" | "en"): string {
  if (!iso) return lang === "it" ? "n/d" : "n/a";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return lang === "it" ? "n/d" : "n/a";
  return d.toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function DriverDetail() {
  const { driverId = "" } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useSettings();
  // ?season= in the URL preserves the season context from the list page.
  const [season] = useSeasonParam();
  const { status, data, retry, error } = useApi((signal) => load(season, driverId, { signal }), [season, driverId]);

  const stats = useMemo(() => {
    if (!data) return null;
    let points = 0, wins = 0, podiums = 0, poles = 0, dnfs = 0;
    const progression: number[] = [];
    const rows = data.races.map((r) => {
      const res = r.Results[0];
      const pts = parseFloat(res.points);
      points += pts;
      progression.push(points);
      if (res.positionText === "1") wins++;
      if (["1", "2", "3"].includes(res.positionText)) podiums++;
      if (res.grid === "1") poles++;
      if (!/^\d+$/.test(res.positionText)) dnfs++;
      return { race: r, res };
    });
    const positions = rows.map((x) => x.res.positionText).filter((p) => /^\d+$/.test(p)).map(Number);
    const best = positions.length ? Math.min(...positions) : null;
    return { points, wins, podiums, poles, dnfs, progression, rows, best };
  }, [data]);

  if (status === "loading") {
    return <div><PageHeader title={t("loading")} /><div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data || !stats) {
    if (error?.message === "driver_not_found") {
      return (
        <div>
          <PageHeader title={t("nav_drivers")} sub={`${t("season")} ${season}`} />
          <EmptyState
            icon="person"
            title={t("driver_not_in_season_title")}
            body={t("driver_not_in_season_body")}
          />
          <p style={{ marginTop: 12 }}>
            <MButton variant="filled" onClick={() => navigate(`/piloti?season=${season}`)}>
              {t("back_to_drivers")}
            </MButton>
          </p>
        </div>
      );
    }
    return <div><PageHeader title={t("nav_drivers")} /><ErrorState onRetry={retry} /></div>;
  }

  const color = teamColor(data.teamId);
  const name = data.driver.fullName;
  const age = data.driver.age;
  const teamLabel = data.driver.teams.length > 1
    ? data.driver.teams.map((tm) => tm.name).join(" · ")
    : data.teamName;
  const progMin = stats.progression.length ? Math.min(...stats.progression) : 0;
  const progMax = stats.progression.length ? Math.max(...stats.progression) : 0;

  const kpis: { icon: MIconName; label: string; value: string | number }[] = [
    { icon: "functions", label: t("points"), value: stats.points },
    { icon: "trophy", label: t("wins"), value: stats.wins },
    { icon: "military_tech", label: t("podiums"), value: stats.podiums },
    { icon: "timer", label: t("poles"), value: stats.poles },
  ];

  return (
    <div>
      <PageHeader
        title={name}
        sub={`#${data.driver.number ?? "–"} · ${teamLabel}${age != null ? ` · ${t("age")}: ${age}` : ""}`}
        right={<><span className="m3-pill">{t("season")} {season}</span><FavButton item={{ kind: "driver", id: data.driver.id, label: name, season }} /></>}
      />

      <div className="m3-grid m3-grid--4 m3-enter">
        {kpis.map((k) => (
          <MCard key={k.label} variant="filled" className="m3-kpi" style={{ "--m3-kpi-accent": color } as CSSProperties}>
            <div className="m3-kpi-value num">{k.value}</div>
            <div className="m3-kpi-label"><MIcon name={k.icon} size={18} />{k.label}</div>
          </MCard>
        ))}
      </div>

      <div className="m3-grid m3-grid--2 m3-enter m3-enter-1" style={{ marginTop: 16 }}>
        <MCard variant="outlined" className="m3-float-panel">
          <h3 className="m3-card-title"><MIcon name="person" />{t("driver")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <DriverPhoto driverId={data.driver.id} wikiUrl={data.driver.wikiUrl} name={name} size={72} tint={color} historic={parseInt(season, 10) < 2000} />
            <div>
              <b style={{ fontSize: "0.98rem" }}>{name}</b>
              <p className="m3-muted" style={{ margin: "2px 0 0", fontSize: "0.88rem" }}>{teamLabel}</p>
            </div>
          </div>
          <MDivider />
          <dl className="m3-kv">
            <dt>{t("team")}</dt><dd>{teamLabel}</dd>
            <dt>{t("number")}</dt><dd className="num">#{data.driver.number ?? "–"}</dd>
            <dt>{t("code")}</dt><dd><span className="mono" style={{ fontWeight: 700 }}>{data.driver.code}</span></dd>
            <dt>{t("nationality")}</dt><dd><FlagIcon code={nationalityCode(data.driver.nationality)} /> {data.driver.nationality}</dd>
            <dt>{t("birthday")}</dt><dd className="num">{fmtBirthday(data.driver.dateOfBirth, lang)}</dd>
            <dt>{t("age")}</dt><dd className="num">{age ?? "–"}</dd>
          </dl>
        </MCard>
        <MCard variant="outlined" className="m3-float-panel">
          <h3 className="m3-card-title"><MIcon name="trending_up" />{t("points_progression")}</h3>
          <Sparkline values={stats.progression} width={420} height={140} stroke={color} ariaLabel={t("points_progression")} />
          <div className="num m3-muted" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.85rem" }}>
            <span>{progMin}</span>
            <span>{progMax}</span>
          </div>
          <p className="m3-muted" style={{ marginBottom: 0, fontSize: "0.88rem" }}>
            {t("dnfs")}: <b className="num">{stats.dnfs}</b> · {t("best_result")}: <b className="num">{stats.best ? `P${stats.best}` : "–"}</b>
          </p>
        </MCard>
      </div>

      <div className="m3-section-head m3-enter m3-enter-2">
        <h2 className="m3-section-title"><MIcon name="flag" />{t("race_by_race")}</h2>
      </div>
      {stats.rows.length === 0 ? (
        <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <ResponsiveTable
          desktop={
            <MTable
              ariaLabel={t("race_by_race")}
              head={<><th>{t("round")}</th><th>{t("gp")}</th><th>{t("position")}</th><th className="num">{t("time_gap")}</th><th className="num">{t("points")}</th><th>{t("status")}</th></>}
            >
              {stats.rows.map(({ race, res }) => (
                <tr key={race.round} className={res.positionText === "1" ? "leader" : undefined}>
                  <td className="num">{race.round}</td>
                  <td><Link to={`/gara/${race.season}/${race.round}`}><FlagIcon code={countryCode(race.Circuit.Location.country)} /> {race.raceName}</Link></td>
                  <td className="num"><b>{res.positionText}</b></td>
                  <td className="mono num">{gapText(res)}</td>
                  <td className="num">{res.points}</td>
                  <td className="m3-muted" style={{ fontSize: "0.85rem" }}>{res.status}</td>
                </tr>
              ))}
            </MTable>
          }
          mobile={
            <MobileTable rows={stats.rows.map(({ race, res }): MobileRow => ({
              key: race.round,
              rowClass: res.positionText === "1" ? "leader" : undefined,
              left: <span className="mpos">{res.positionText}</span>,
              title: (
                <Link to={`/gara/${race.season}/${race.round}`}>
                  <FlagIcon code={countryCode(race.Circuit.Location.country)} />
                  <b>{race.raceName}</b>
                </Link>
              ),
              subtitle: `${t("round")} ${race.round} · ${res.status}`,
              value: res.points,
              details: (
                <MDetails items={[
                  { label: t("time_gap"), value: <span className="mono">{gapText(res)}</span> },
                  { label: t("status"), value: res.status },
                ]} />
              ),
            }))} />
          }
        />
      )}
      <p className="m3-muted" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: "0.85rem" }}>
        <MIcon name="database" size={16} />
        <span>{lang === "it" ? "Dati: Jolpica F1 API" : "Data: Jolpica F1 API"}{data.driver.enriched ? " · f1api.dev" : ""}</span>
      </p>
    </div>
  );
}

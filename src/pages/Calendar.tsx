/* Calendar: filterable GP list (month / continent / status) with winners for past races. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard, fmtDate } from "../components/ui";
import { continentOf, countryFlag } from "../data/meta";

interface CalData {
  races: RaceInfo[];
  winners: Record<string, string>;
}

async function load(season: string): Promise<CalData> {
  const races = await jolpica.schedule(season);
  const winners: Record<string, string> = {};
  const past = races.filter((r) => raceStatus(r) === "past");
  await Promise.all(
    past.map(async (r) => {
      try {
        const rows = await jolpica.raceResults(season, r.round);
        const w = rows.find((x) => x.positionText === "1");
        if (w) winners[r.round] = `${w.Driver.givenName} ${w.Driver.familyName}`;
      } catch {
        /* keep going */
      }
    })
  );
  return { races, winners };
}

const MONTHS_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Calendar() {
  const { t, lang, season } = useSettings();
  const { status, data, retry } = useApi(() => load(season), [season]);
  const [month, setMonth] = useState("all");
  const [continent, setContinent] = useState("all");
  const [state, setState] = useState("all");

  const months = lang === "it" ? MONTHS_IT : MONTHS_EN;

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.races.filter((r) => {
      const d = new Date(r.date + "T12:00:00Z");
      if (month !== "all" && d.getUTCMonth() !== parseInt(month, 10)) return false;
      if (continent !== "all" && continentOf(r.Circuit.Location.country) !== continent) return false;
      if (state !== "all" && raceStatus(r) !== state) return false;
      return true;
    });
  }, [data, month, continent, state]);

  const continents = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.races.map((r) => continentOf(r.Circuit.Location.country)))].sort();
  }, [data]);

  if (status === "loading") {
    return (
      <div>
        <PageHeader title={t("nav_calendar")} />
        <div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_calendar")} /><ErrorState onRetry={retry} /></div>;

  const statusBadge = (r: RaceInfo) => {
    const s = raceStatus(r);
    if (s === "live") return <Badge kind="live">{t("live_now")}</Badge>;
    if (s === "past") return <Badge kind="done">{t("past")}</Badge>;
    return <Badge kind="accent">{t("upcoming")}</Badge>;
  };

  return (
    <div>
      <PageHeader title={t("nav_calendar")} sub={`${t("season")} ${season} · ${filtered.length} GP`} />

      <div className="filters" role="group" aria-label="filters">
        <div className="field">
          <label htmlFor="f-month">{t("month")}</label>
          <select id="f-month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">{t("all")}</option>
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-cont">{t("continent")}</label>
          <select id="f-cont" value={continent} onChange={(e) => setContinent(e.target.value)}>
            <option value="all">{t("all")}</option>
            {continents.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-state">{t("state")}</label>
          <select id="f-state" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">{t("all")}</option>
            <option value="past">{t("past")}</option>
            <option value="upcoming">{t("upcoming")}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <div className="grid grid-3">
          {filtered.map((r) => (
            <Link key={r.round} to={`/gara/${r.season}/${r.round}`} className="card">
              <div className="spread">
                <Badge>{t("round")} {r.round}</Badge>
                {statusBadge(r)}
              </div>
              <h3 style={{ margin: "10px 0 4px", fontSize: "1.08rem" }}>{r.raceName}</h3>
              <p className="muted small" style={{ margin: "0 0 8px" }}>
                <span className="flag" aria-hidden="true">{countryFlag(r.Circuit.Location.country)}</span>
                {r.Circuit.Location.locality}, {r.Circuit.Location.country}
              </p>
              <div className="spread small">
                <span className="muted">{fmtDate(new Date(r.date + "T12:00:00Z"), lang)}</span>
                {r.Sprint && <Badge kind="warn">Sprint</Badge>}
              </div>
              {data.winners[r.round] && (
                <p className="small" style={{ margin: "10px 0 0" }}>🏆 {t("winner")}: <b>{data.winners[r.round]}</b></p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

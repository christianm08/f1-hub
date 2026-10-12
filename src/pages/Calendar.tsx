/* Calendar: filterable GP list (month / continent / status) with winners for past races. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard, fmtDate } from "../components/ui";
import { MCard, MIcon, MSelect } from "../design";
import { SeasonSelect } from "../components/SeasonSelect";
import { TrackMap } from "../components/TrackMap";
import { continentOf, countryCode } from "../data/meta";
import { FlagIcon } from "../components/FlagIcon";

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
  const { t, lang } = useSettings();
  const [season, setSeason] = useSeasonParam();
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

  const header = (
    <PageHeader title={t("nav_calendar")} sub={`${t("season")} ${season}${data ? ` · ${filtered.length} GP` : ""}`} right={<SeasonSelect value={season} onChange={setSeason} id="calendar-season" />} />
  );

  if (status === "loading") {
    return (
      <div>
        {header}
        <div className="m3-grid m3-grid--3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (status === "error" || !data) return <div>{header}<ErrorState onRetry={retry} /></div>;

  return (
    <div>
      {header}

      <div className="m3-filters" role="group" aria-label="filters">
        <MSelect
          label={t("month")}
          value={month}
          onChange={setMonth}
          options={[
            { value: "all", label: t("all") },
            ...months.map((m, i) => ({ value: String(i), label: m })),
          ]}
        />
        <MSelect
          label={t("continent")}
          value={continent}
          onChange={setContinent}
          options={[
            { value: "all", label: t("all") },
            ...continents.map((c) => ({ value: c, label: c })),
          ]}
        />
        <MSelect
          label={t("state")}
          value={state}
          onChange={setState}
          options={[
            { value: "all", label: t("all") },
            { value: "past", label: t("past") },
            { value: "upcoming", label: t("upcoming") },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />
      ) : (
        <div className="m3-grid m3-grid--3">
          {filtered.map((r) => {
            const s = raceStatus(r);
            return (
              <Link key={r.round} to={`/gara/${r.season}/${r.round}`} className="m3-card-link">
                <MCard variant="outlined">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <Badge>{t("round")} {r.round}</Badge>
                    {s === "live" ? <Badge kind="live">{t("live_now")}</Badge>
                      : s === "past" ? <Badge kind="done">{t("past")}</Badge>
                      : <Badge kind="accent">{t("upcoming")}</Badge>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                    <h3 style={{ margin: 0, fontSize: "1.08rem", flex: "1 1 auto", minWidth: 0 }}>{r.raceName}</h3>
                    <TrackMap circuitId={r.Circuit.circuitId} circuitName={r.Circuit.circuitName} className="track-mini" />
                  </div>
                  <p className="m3-muted" style={{ margin: "8px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem" }}>
                    <FlagIcon code={countryCode(r.Circuit.Location.country)} />
                    <span>{r.Circuit.Location.locality}, {r.Circuit.Location.country}</span>
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span className="m3-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                      <MIcon name="calendar_month" size={16} />
                      {fmtDate(new Date(r.date + "T12:00:00Z"), lang)}
                    </span>
                    {r.Sprint && <Badge kind="warn"><MIcon name="bolt" size={14} /> Sprint</Badge>}
                  </div>
                  {data.winners[r.round] && (
                    <p style={{ margin: "10px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem" }}>
                      <MIcon name="trophy" size={16} className="m3-leader-mark" />
                      <span>{t("winner")}: <b>{data.winners[r.round]}</b></span>
                    </p>
                  )}
                </MCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

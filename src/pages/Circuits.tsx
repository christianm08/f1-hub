/* Circuits of the selected season's calendar only. Season-aware: ?season=
 * in the URL is the source of truth (see useSeasonParam). Winner shown is
 * the winner of THAT season's race at the circuit. Track outlines:
 * bacinger/f1-circuits (MIT). */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { MButton, MCard, MIcon } from "../design";
import { SeasonSelect } from "../components/SeasonSelect";
import { TrackMap } from "../components/TrackMap";
import { findTrack, formatTrackLength } from "../data/circuits";
import { countryCode } from "../data/meta";
import type { FetchOpts } from "../api/client";
import { FlagIcon } from "../components/FlagIcon";

interface CircuitsData {
  races: RaceInfo[];
  winners: Record<string, string>;
}

async function load(season: string, o?: FetchOpts): Promise<CircuitsData> {
  const races = await jolpica.schedule(season, o);
  const winners: Record<string, string> = {};
  const past = races.filter((r) => raceStatus(r) === "past");
  await Promise.all(
    past.map(async (r) => {
      try {
        const rows = await jolpica.raceResults(season, r.round, o);
        const w = rows.find((x) => x.positionText === "1");
        if (w) winners[r.Circuit.circuitId] = `${w.Driver.givenName} ${w.Driver.familyName}`;
      } catch {
        /* ignore */
      }
    })
  );
  return { races, winners };
}

function fmtDate(iso: string | undefined, lang: "it" | "en"): string {
  if (!iso) return lang === "it" ? "n/d" : "n/a";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return lang === "it" ? "n/d" : "n/a";
  return d.toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Circuits() {
  const { t, lang, units } = useSettings();
  const navigate = useNavigate();
  const [season, setSeason] = useSeasonParam();
  const { status, data, retry } = useApi((signal) => load(season, { signal }), [season]);

  const circuits = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, RaceInfo>();
    for (const r of data.races) {
      if (!seen.has(r.Circuit.circuitId)) seen.set(r.Circuit.circuitId, r);
    }
    return [...seen.values()];
  }, [data]);

  const header = (
    <PageHeader
      title={t("nav_circuits")}
      sub={`${t("season")} ${season}${data ? ` · ${circuits.length}` : ""}`}
      right={<SeasonSelect value={season} onChange={setSeason} id="circuits-season" />}
    />
  );

  if (status === "loading") {
    return <div>{header}<div className="m3-grid m3-grid--3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div>{header}<ErrorState onRetry={retry} /></div>;
  if (circuits.length === 0) return <div>{header}<EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      {header}
      <div className="m3-grid m3-grid--3">
        {circuits.map((r) => {
          const c = r.Circuit;
          const track = findTrack(c.circuitId, c.circuitName);
          return (
            <MCard variant="outlined" key={c.circuitId}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{c.circuitName}</h3>
                <FavButton item={{ kind: "circuit", id: c.circuitId, label: c.circuitName }} />
              </div>
              <p className="m3-muted" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem" }}>
                <FlagIcon code={countryCode(c.Location.country)} />
                <span>{c.Location.locality}, {c.Location.country}</span>
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px", fontSize: "0.88rem", flexWrap: "wrap" }}>
                <MIcon name="flag" size={14} className="m3-leader-mark" />
                <b>R{r.round}</b>
                <span className="m3-muted">·</span>
                <span>{r.raceName}</span>
                <span className="m3-muted">·</span>
                <span className="num m3-muted">{fmtDate(r.date, lang)}</span>
              </p>
              <TrackMap circuitId={c.circuitId} circuitName={c.circuitName} />
              <dl className="m3-kv" style={{ marginTop: 12 }}>
                <dt>{t("winner")} · {season}</dt>
                <dd style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <MIcon name="trophy" size={14} className="m3-leader-mark" />
                  {data.winners[c.circuitId] ?? t("not_available")}
                </dd>
                <dt>Lat/Long</dt>
                <dd className="mono num">{c.Location.lat}, {c.Location.long}</dd>
                <dt>{t("length")}</dt>
                <dd className="num">{track ? formatTrackLength(track.lengthM, lang, units === "imperial") : t("not_available")}</dd>
              </dl>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <MButton variant="outlined" small onClick={() => navigate(`/gara/${season}/${r.round}`)}>
                  {t("race")} · {season}
                </MButton>
                <MButton variant="text" small trailingIcon="arrow_outward" onClick={() => window.open(c.url, "_blank", "noopener,noreferrer")}>
                  Wikipedia
                </MButton>
              </div>
            </MCard>
          );
        })}
      </div>
      <p className="m3-muted" style={{ display: "flex", gap: 8, marginTop: 16, fontSize: "0.85rem", alignItems: "flex-start" }}>
        <MIcon name="info" size={16} style={{ flex: "0 0 auto", marginTop: 2 }} />
        <span>{t("track_attribution")}</span>
      </p>
    </div>
  );
}

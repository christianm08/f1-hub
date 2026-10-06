/* Circuits of the selected season's calendar only. Season-aware: ?season=
 * in the URL is the source of truth (see useSeasonParam). Winner shown is
 * the winner of THAT season's race at the circuit. Track outlines:
 * bacinger/f1-circuits (MIT). */
import { useMemo } from "react";
import { ArrowUpRight, Flag, Info, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSeasonParam } from "../hooks/useSeasonParam";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { SeasonSelect } from "../components/SeasonSelect";
import { TrackMap } from "../components/TrackMap";
import { findTrack, formatTrackLength } from "../data/circuits";
import { countryCode } from "../data/meta";
import type { FetchOpts } from "../api/client";

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
    return <div>{header}<div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div>{header}<ErrorState onRetry={retry} /></div>;
  if (circuits.length === 0) return <div>{header}<EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      {header}
      <div className="grid grid-3">
        {circuits.map((r) => {
          const c = r.Circuit;
          const track = findTrack(c.circuitId, c.circuitName);
          return (
            <div className="card" key={c.circuitId}>
              <div className="spread">
                <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{c.circuitName}</h3>
                <FavButton item={{ kind: "circuit", id: c.circuitId, label: c.circuitName }} />
              </div>
              <p className="muted small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="nat">{countryCode(c.Location.country)}</span>
                <span>{c.Location.locality}, {c.Location.country}</span>
              </p>
              <p className="small" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px" }}>
                <Flag size={13} aria-hidden="true" style={{ color: "var(--accent)" }} />
                <b>R{r.round}</b>
                <span className="muted">·</span>
                <span>{r.raceName}</span>
                <span className="muted">·</span>
                <span className="num muted">{fmtDate(r.date, lang)}</span>
              </p>
              <TrackMap circuitId={c.circuitId} circuitName={c.circuitName} />
              <dl className="kv mt">
                <dt>{t("winner")} · {season}</dt>
                <dd>
                  <Trophy size={14} aria-hidden="true" style={{ color: "var(--gold)", verticalAlign: "-2px", marginRight: 6 }} />
                  {data.winners[c.circuitId] ?? t("not_available")}
                </dd>
                <dt>Lat/Long</dt>
                <dd className="mono num">{c.Location.lat}, {c.Location.long}</dd>
                <dt>{t("length")}</dt>
                <dd className="num">{track ? formatTrackLength(track.lengthM, lang, units === "imperial") : t("not_available")}</dd>
              </dl>
              <div className="row mt" style={{ gap: 8 }}>
                <Link className="btn ghost small" to={`/gara/${season}/${r.round}`}>
                  {t("race")} · {season}
                </Link>
                <a className="btn ghost small" href={c.url} target="_blank" rel="noopener noreferrer">
                  Wikipedia <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="small muted mt row" style={{ alignItems: "flex-start" }}>
        <Info size={14} aria-hidden="true" style={{ color: "var(--text-3)", flex: "0 0 auto", marginTop: 2 }} />
        <span>{t("track_attribution")}</span>
      </p>
    </div>
  );
}

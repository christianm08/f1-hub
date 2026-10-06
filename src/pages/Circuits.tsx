/* Circuits: cards with vector track outlines (bacinger/f1-circuits, MIT). */
import { useMemo } from "react";
import { ArrowUpRight, Info, Trophy } from "lucide-react";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { TrackMap } from "../components/TrackMap";
import { findTrack, formatTrackLength } from "../data/circuits";
import { countryCode } from "../data/meta";

interface CircuitsData {
  races: RaceInfo[];
  winners: Record<string, string>;
}

async function load(season: string): Promise<CircuitsData> {
  const races = await jolpica.schedule(season);
  const winners: Record<string, string> = {};
  const past = races.filter((r) => raceStatus(r) === "past");
  await Promise.all(
    past.map(async (r) => {
      try {
        const rows = await jolpica.raceResults(season, r.round);
        const w = rows.find((x) => x.positionText === "1");
        if (w) winners[r.Circuit.circuitId] = `${w.Driver.givenName} ${w.Driver.familyName}`;
      } catch {
        /* ignore */
      }
    })
  );
  return { races, winners };
}

export default function Circuits() {
  const { t, season, lang, units } = useSettings();
  const { status, data, retry } = useApi(() => load(season), [season]);

  const circuits = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, RaceInfo>();
    for (const r of data.races) {
      if (!seen.has(r.Circuit.circuitId)) seen.set(r.Circuit.circuitId, r);
    }
    return [...seen.values()];
  }, [data]);

  if (status === "loading") {
    return <div><PageHeader title={t("nav_circuits")} /><div className="grid grid-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>;
  }
  if (status === "error" || !data) return <div><PageHeader title={t("nav_circuits")} /><ErrorState onRetry={retry} /></div>;
  if (circuits.length === 0) return <div><PageHeader title={t("nav_circuits")} /><EmptyState title={t("empty_title")} body={t("empty_body")} /></div>;

  return (
    <div>
      <PageHeader title={t("nav_circuits")} sub={`${t("season")} ${season} · ${circuits.length}`} />
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
              <TrackMap circuitId={c.circuitId} circuitName={c.circuitName} />
              <dl className="kv mt">
                <dt>{t("winner")} ({lang === "it" ? "recente" : "latest"})</dt>
                <dd>
                  <Trophy size={14} aria-hidden="true" style={{ color: "var(--gold)", verticalAlign: "-2px", marginRight: 6 }} />
                  {data.winners[c.circuitId] ?? t("not_available")}
                </dd>
                <dt>Lat/Long</dt>
                <dd className="mono num">{c.Location.lat}, {c.Location.long}</dd>
                <dt>{t("length")}</dt>
                <dd className="num">{track ? formatTrackLength(track.lengthM, lang, units === "imperial") : t("not_available")}</dd>
              </dl>
              <a className="btn ghost small mt" href={c.url} target="_blank" rel="noopener noreferrer">
                Wikipedia <ArrowUpRight size={13} aria-hidden="true" />
              </a>
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

/* Circuits: cards with info; layout placeholder (no licit free source for track SVGs). */
import { useMemo } from "react";
import { jolpica, raceStatus, type RaceInfo } from "../api/jolpica";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { EmptyState, ErrorState, FavButton, PageHeader, SkeletonCard } from "../components/ui";
import { countryFlag } from "../data/meta";

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
  const { t, season, lang } = useSettings();
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
          return (
            <div className="card" key={c.circuitId}>
              <div className="spread">
                <h3 style={{ margin: 0, fontSize: "1.02rem" }}>{c.circuitName}</h3>
                <FavButton item={{ kind: "circuit", id: c.circuitId, label: c.circuitName }} />
              </div>
              <p className="muted small"><span className="flag" aria-hidden="true">{countryFlag(c.Location.country)}</span>{c.Location.locality}, {c.Location.country}</p>
              <div className="circuit-ph" aria-label={t("circuit")}>🗺️<br />{t("circuit_info")}</div>
              <dl className="kv mt">
                <dt>{t("winner")} ({lang === "it" ? "recente" : "latest"})</dt>
                <dd>{data.winners[c.circuitId] ?? t("not_available")}</dd>
                <dt>Lat/Long</dt>
                <dd className="num">{c.Location.lat}, {c.Location.long}</dd>
                <dt>{t("length")}</dt>
                <dd>{t("not_available")}</dd>
              </dl>
              <a className="btn ghost small mt" href={c.url} target="_blank" rel="noopener noreferrer">Wikipedia ↗</a>
            </div>
          );
        })}
      </div>
      <p className="small muted mt">
        {lang === "it"
          ? "Lunghezza, curve e record sul giro non sono forniti dall'API: mostrati solo quando disponibili da fonte ufficiale."
          : "Length, corners and lap records aren't provided by the API: shown only when available from an official source."}
      </p>
    </div>
  );
}

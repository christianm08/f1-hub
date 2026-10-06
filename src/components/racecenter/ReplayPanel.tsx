/* ============================================================================
 * ReplayPanel — virtual clock over REAL session data (completed sessions).
 * ----------------------------------------------------------------------------
 * WHAT THE REPLAY CAN RECONSTRUCT (all from the normalized model, real data):
 *   - track map: latest location sample per driver with time <= T
 *     (fitted with the same mapFit algorithm as the live map);
 *   - event feed: race-control messages, pit stops and overtakes with
 *     time <= T, shown as a timeline up to T;
 *   - event stepping: jump T to the previous/next recorded event.
 * WHAT IT CANNOT RECONSTRUCT — shown honestly as n/d or with a badge:
 *   - the intermediate classification: lap entries carry no timestamps, so
 *     the tower at T < end cannot be derived from laps. The panel shows the
 *     FINAL classification (last known state) with a "Parziale" badge and an
 *     explanatory note — never an invented order;
 *   - telemetry: car_data exists only on live sessions.
 * CONTROLS: play/pause, 0.5x/1x/2x/4x/8x virtual speed, scrub slider over
 * [startUtc, endUtc], previous/next event buttons.
 * ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, History, Info, Pause, Play } from "lucide-react";
import { useRaceCenterSession } from "../../api/openf1live";
import type { LocationPoint } from "../../api/openf1model";
import { fitLocationsToPath, resolveTrack } from "./mapFit";
import { ErrorState, Skeleton } from "../ui";
import { useAdv } from "./advStrings";
import "./advanced.css";

interface PanelProps {
  sessionKey: number;
  onSelectDriver?: (driverNumber: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4, 8] as const;

interface FeedItem {
  t: number;
  kind: "rc" | "pit" | "ovt";
  text: string;
  sev: string;
  key: string;
}

export function ReplayPanel({ sessionKey, onSelectDriver }: PanelProps) {
  const { t, lang } = useAdv();
  const {
    info, state, location, drivers, timing, raceControl, pits, overtakes,
    dataQuality, error, refresh,
  } = useRaceCenterSession(sessionKey, {});

  const [tMs, setTMs] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const startMs = info ? Date.parse(info.startUtc) : NaN;
  const endMs = info ? Date.parse(info.endUtc) : NaN;
  const validRange = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;

  // Virtual clock. tMs stays null until the user scrubs/steps/plays; the
  // derived cursor below defaults to the end of the session in that case.
  useEffect(() => {
    if (!playing || !Number.isFinite(endMs)) return;
    const id = window.setInterval(() => {
      setTMs((cur) => Math.min(endMs, (cur ?? endMs) + 250 * speed));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, speed, endMs]);

  useEffect(() => {
    if (playing && tMs != null && Number.isFinite(endMs) && tMs >= endMs) setPlaying(false);
  }, [playing, tMs, endMs]);

  const togglePlay = () => {
    if (!playing && validRange && (tMs == null || tMs >= endMs - 1000)) {
      setTMs(startMs); // (re)start from the beginning when at the end
    }
    setPlaying((p) => !p);
  };

  const driverByNum = useMemo(() => new Map(drivers.map((d) => [d.number, d])), [drivers]);
  const posByDriver = useMemo(() => new Map(timing.map((r) => [r.number, r.position])), [timing]);

  const track = useMemo(() => {
    if (!info) return null;
    return resolveTrack(info.circuitName, info.meetingName);
  }, [info]);

  const fitOutcome = useMemo(
    () => (track ? fitLocationsToPath(location, track.path) : null),
    [track, location],
  );
  const fit = fitOutcome && fitOutcome.ok ? fitOutcome.transform : null;

  /** Per-driver time-ordered samples (hook sorts ascending). */
  const byDriver = useMemo(() => {
    const m = new Map<number, LocationPoint[]>();
    for (const p of location) {
      const arr = m.get(p.driver);
      if (arr) arr.push(p);
      else m.set(p.driver, [p]);
    }
    return m;
  }, [location]);

  /** Unified event feed, time-ordered. */
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const e of raceControl) {
      const ms = Date.parse(e.time);
      if (!Number.isFinite(ms)) continue;
      const d = e.driverNumber != null ? driverByNum.get(e.driverNumber) : undefined;
      items.push({
        t: ms,
        kind: "rc",
        text: d ? `${d.acronym}: ${e.message}` : e.message,
        sev: e.severity === "info" ? "" : e.severity,
        key: `rc-${e.time}-${e.message}`,
      });
    }
    for (const p of pits) {
      const ms = Date.parse(p.time);
      if (!Number.isFinite(ms)) continue;
      const d = driverByNum.get(p.driver);
      items.push({
        t: ms,
        kind: "pit",
        text: `${t("rcx_replay_pits")}: ${d?.acronym ?? `#${p.driver}`} — ${t("rcx_tel_lap")} ${p.lap}`,
        sev: "",
        key: `pit-${p.time}-${p.driver}`,
      });
    }
    for (const o of overtakes) {
      const ms = Date.parse(o.time);
      if (!Number.isFinite(ms)) continue;
      const a = driverByNum.get(o.overtakingDriver);
      const b = driverByNum.get(o.overtakenDriver);
      items.push({
        t: ms,
        kind: "ovt",
        text: `${t("rcx_replay_overtakes")}: ${a?.acronym ?? o.overtakingDriver} → ${b?.acronym ?? o.overtakenDriver} (P${o.position})`,
        sev: "",
        key: `ovt-${o.time}-${o.overtakingDriver}-${o.overtakenDriver}`,
      });
    }
    return items.sort((a, b) => a.t - b.t);
  }, [raceControl, pits, overtakes, driverByNum, t]);

  const eventTimes = useMemo(() => [...new Set(feed.map((f) => f.t))].sort((a, b) => a - b), [feed]);

  const cur = tMs ?? endMs;
  const atEnd = Number.isFinite(endMs) && cur >= endMs - 1000;

  const feedUpToT = useMemo(() => feed.filter((f) => f.t <= cur + 500), [feed, cur]);

  const dots = useMemo(() => {
    if (!fit || !Number.isFinite(cur)) return [];
    const out: Array<{ num: number; x: number; y: number }> = [];
    for (const [num, pts] of byDriver) {
      let last: LocationPoint | null = null;
      for (const p of pts) {
        const pt = Date.parse(p.time);
        if (Number.isFinite(pt) && pt <= cur) last = p;
        else break;
      }
      if (!last) continue;
      const s = fit.map(last.x, last.y);
      out.push({ num, x: s.x, y: s.y });
    }
    return out;
  }, [fit, byDriver, cur]);

  const fmtClock = (ms: number) =>
    new Date(ms).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const stepEvent = (dir: 1 | -1) => {
    if (!Number.isFinite(cur)) return;
    const target =
      dir === 1
        ? eventTimes.find((et) => et > cur + 1000)
        : [...eventTimes].reverse().find((et) => et < cur - 1000);
    if (target != null) {
      setPlaying(false);
      setTMs(target);
    }
  };

  const head = (
    <div className="rcx-head">
      <h2 className="rcx-title"><History aria-hidden="true" />{t("rcx_replay_title")}</h2>
      {info && <span className="badge done">{info.normalizedName} · {info.year}</span>}
    </div>
  );

  if (state === "loading" || state === "idle") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_replay_title")}>
        {head}
        <Skeleton h={200} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_replay_title")}>
        {head}
        <ErrorState onRetry={refresh} message={error ? `${t("rcx_error")}: ${error.message}` : t("rcx_error")} />
      </section>
    );
  }
  if (!info || info.state !== "completed" || !validRange) {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_replay_title")}>
        {head}
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_replay_only_completed")}</div>
      </section>
    );
  }

  return (
    <section className="card rcx-panel" aria-label={t("rcx_replay_title")}>
      {head}

      <div className="rcx-controls">
        <button
          type="button"
          className="rcx-iconbtn"
          onClick={togglePlay}
          aria-label={playing ? t("rcx_replay_pause") : t("rcx_replay_play")}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="rcx-iconbtn ghost"
          onClick={() => stepEvent(-1)}
          aria-label={t("rcx_replay_prev_event")}
          disabled={eventTimes.length === 0}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="rcx-iconbtn ghost"
          onClick={() => stepEvent(1)}
          aria-label={t("rcx_replay_next_event")}
          disabled={eventTimes.length === 0}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <div className="rcx-speeds" role="group" aria-label={t("rcx_replay_speed")}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className="rcx-speed"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
        <span className="rcx-replay-clock" aria-live="off">{fmtClock(cur)}</span>
      </div>

      <div>
        <input
          type="range"
          className="rcx-slider"
          min={startMs}
          max={endMs}
          step={1000}
          value={cur}
          onChange={(e) => {
            setPlaying(false);
            setTMs(Number(e.target.value));
          }}
          aria-label={t("rcx_replay_title")}
        />
        <div className="rcx-timerange">
          <span>{fmtClock(startMs)}</span>
          <span>{fmtClock(endMs)}</span>
        </div>
      </div>

      <div className="rcx-cmp-cols">
        <div>
          <div className="rcx-head" style={{ marginBottom: 6 }}>
            <h3 className="rcx-title" style={{ fontSize: "0.9rem" }}>{t("rcx_replay_tower")}</h3>
            <span className={`badge ${atEnd ? "done" : "warn"}`}>{atEnd ? t("rcx_replay_final") : t("rcx_replay_partial")}</span>
          </div>
          {!atEnd && (
            <div className="rcx-note" role="note" style={{ marginBottom: 8 }}>
              <Info aria-hidden="true" />{t("rcx_replay_partial_note")}
            </div>
          )}
          <div className="rcx-tower">
            {timing.map((r) => {
              const d = driverByNum.get(r.number);
              return (
                <div className="rcx-tower-row" key={r.number}>
                  <span className="rcx-tower-pos">P{r.position}</span>
                  <span className="rcx-tower-acr" style={{ borderLeftColor: d?.teamColour ?? "var(--accent)" }}>
                    {d?.acronym ?? `#${r.number}`}
                  </span>
                  <span className="rcx-tower-name">{d?.fullName ?? ""}</span>
                  <span className="rcx-tower-gap">{r.gapToLeader ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="rcx-title" style={{ fontSize: "0.9rem", marginBottom: 6 }}>
            {track ? track.name : t("rcx_map_title")}
          </h3>
          {fit ? (
            <div className="rcx-mapwrap">
              <svg viewBox="0 0 100 100" className="rcx-map" role="img" aria-label={track?.name ?? ""}>
                <path d={track!.path} fill="none" stroke="currentColor" strokeWidth={2.6}
                  strokeLinecap="round" strokeLinejoin="round" className="rcx-trackpath" />
                {dots.map(({ num, x, y }) => {
                  const d = driverByNum.get(num);
                  const pos = posByDriver.get(num);
                  return (
                    <g
                      key={num}
                      className="rcx-cardot"
                      transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
                      onClick={() => onSelectDriver?.(num)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectDriver?.(num); }
                      }}
                      aria-label={d ? `${d.acronym} — P${pos ?? "?"}` : `#${num}`}
                    >
                      <circle r={7.5} fill="transparent" />
                      <circle r={3.4} fill={d?.teamColour ?? "#8892a3"} stroke="rgba(0,0,0,0.4)" strokeWidth={0.5} />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={3.1} fontWeight={800} fill="#fff">{num}</text>
                      {pos != null && (
                        <text x={4.6} y={0.4} fontSize={2.9} fontWeight={700} fill="currentColor" opacity={0.85}>P{pos}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="rcx-note" role="note"><Info aria-hidden="true" />{(() => {
              const reason = fitOutcome && !fitOutcome.ok ? fitOutcome.reason : null;
              if (!dataQuality.hasLocation) return t("rcx_replay_no_map");
              if (reason === "degenerate-bbox") return t("rcx_map_degenerate");
              if (reason === "poor-quality") return t("rcx_map_poor_quality");
              return t("rcx_map_fit_failed");
            })()}</div>
          )}

          <h3 className="rcx-title" style={{ fontSize: "0.9rem", margin: "10px 0 6px" }}>
            {t("rcx_replay_events")} <span className="rcx-caption">({feedUpToT.length})</span>
          </h3>
          <div className="rcx-eventlist">
            {feedUpToT.length === 0 && <p className="rcx-caption">{t("rcx_replay_no_events")}</p>}
            {[...feedUpToT].reverse().slice(0, 60).map((f) => (
              <div className="rcx-event" key={f.key}>
                <time>{fmtClock(f.t)}</time>
                <span className={`sev ${f.sev}`} aria-hidden="true" />
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

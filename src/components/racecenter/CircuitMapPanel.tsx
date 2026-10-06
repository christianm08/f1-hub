/* ============================================================================
 * CircuitMapPanel — circuit map with REAL car positions.
 * ----------------------------------------------------------------------------
 * HOW IT WORKS
 *   - The SVG track outline comes from data/tracks.ts (bacinger/f1-circuits).
 *   - OpenF1 location points (arbitrary units) are fitted onto the track via
 *     fitLocationsToPath() in ./mapFit.ts (uniform-scale bbox fit + Y flip,
 *     validated offline on 5 real sessions: median point-to-path distance
 *     0.2–2.0 viewBox units — dots sit on the track outline).
 *   - SMOOTHING, NOT SIMULATION: location samples arrive every few seconds.
 *     The panel renders each car at (now - 5s) and linearly interpolates
 *     between the two real samples bracketing that instant. Nothing is ever
 *     extrapolated or invented; when a driver has no samples, no dot is
 *     drawn. The 5s trail guarantees we always interpolate between two
 *     measured points instead of jumping from sample to sample.
 * HONEST FALLBACKS
 *   - No location data for the session -> static TrackMap + honest note.
 *   - Fit fails (degenerate bbox) -> static TrackMap + honest note.
 *   - DRS badges appear only when telemetry is actually flowing.
 * ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import { Info, ListOrdered, Map as MapIcon, Pause, Play, RotateCcw } from "lucide-react";
import {
  LIVE_SUBSCRIPTION_MESSAGE_EN,
  LIVE_SUBSCRIPTION_MESSAGE_IT,
  useRaceCenterSession,
} from "../../api/openf1live";
import { TrackMap } from "../TrackMap";
import { fitLocationsToPath, resolveTrack } from "./mapFit";
import { ErrorState, Skeleton } from "../ui";
import { useAdv } from "./advStrings";
import "./advanced.css";

/** Render trail: stay this far behind real time so we interpolate, not jump. */
const TRAIL_MS = 5000;

interface PanelProps {
  sessionKey: number;
  onSelectDriver?: (driverNumber: number) => void;
}

/**
 * Position of one driver at instant t by linear interpolation between the
 * two real samples bracketing t. Holds at the first/last sample outside the
 * measured range — never extrapolates. Binary search over the time-ordered
 * samples (pre-parsed timestamps).
 */
function posAt(samples: Array<{ t: number; x: number; y: number }>, t: number): { x: number; y: number } | null {
  const n = samples.length;
  if (n === 0) return null;
  if (t <= samples[0].t) return { x: samples[0].x, y: samples[0].y };
  if (t >= samples[n - 1].t) return { x: samples[n - 1].x, y: samples[n - 1].y };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const k = (t - a.t) / Math.max(1, b.t - a.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

export function CircuitMapPanel({ sessionKey, onSelectDriver }: PanelProps) {
  const { t, lang } = useAdv();
  const {
    info,
    state,
    location,
    drivers,
    timing,
    dataQuality,
    telemetryAvailable,
    error,
    refresh,
  } = useRaceCenterSession(sessionKey, { enableLocation: true, locationWindowMin: 12 });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [showPositions, setShowPositions] = useState(true);
  const [replayPlaying, setReplayPlaying] = useState(true);
  /** Virtual cursor (ms epoch) for completed sessions; live mode trails real time. */
  const [cursorMs, setCursorMs] = useState<number | null>(null);

  // Throttled wall-clock (~10 fps is plenty for multi-second samples).
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last > 100) {
        last = ts;
        setNowMs(Date.now());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const track = useMemo(() => {
    if (!info) return null;
    return resolveTrack(info.circuitName, info.meetingName);
  }, [info]);

  const fitOutcome = useMemo(
    () => (track ? fitLocationsToPath(location, track.path) : null),
    [track, location],
  );
  const fit = fitOutcome && fitOutcome.ok ? fitOutcome.transform : null;

  /** Per-driver time-ordered samples with pre-parsed timestamps (hook sorts ascending). */
  const byDriver = useMemo(() => {
    const m = new Map<number, Array<{ t: number; x: number; y: number }>>();
    for (const p of location) {
      const t = Date.parse(p.time);
      if (!Number.isFinite(t)) continue;
      const arr = m.get(p.driver);
      const s = { t, x: p.x, y: p.y };
      if (arr) arr.push(s);
      else m.set(p.driver, [s]);
    }
    return m;
  }, [location]);

  const driverByNum = useMemo(() => new Map(drivers.map((d) => [d.number, d])), [drivers]);
  const posByDriver = useMemo(() => new Map(timing.map((r) => [r.number, r.position])), [timing]);
  const drsByDriver = useMemo(
    () => new Map(timing.map((r) => [r.number, r.drsOpen === true])),
    [timing],
  );

  const dots = useMemo(() => {
    if (!fit) return [];
    // Live: trail real time by 5s and interpolate between measured samples.
    // Replay (completed session): the virtual cursor loops through the
    // sampled window — the samples are real, only the clock is virtual.
    let tNow: number | null;
    if (info?.isLive) {
      tNow = nowMs - TRAIL_MS;
    } else {
      tNow = cursorMs;
      if (tNow == null) {
        let s0 = Infinity;
        for (const pts of byDriver.values()) {
          if (pts.length && pts[0].t < s0) s0 = pts[0].t;
        }
        tNow = Number.isFinite(s0) ? s0 : null;
      }
    }
    if (tNow == null) return [];
    const out: Array<{ num: number; x: number; y: number }> = [];
    for (const [num, pts] of byDriver) {
      const p = posAt(pts, tNow);
      if (!p) continue;
      const s = fit.map(p.x, p.y);
      out.push({ num, x: s.x, y: s.y });
    }
    return out;
  }, [fit, byDriver, nowMs, cursorMs, info?.isLive]);

  // Replay virtual clock: advance ~20x through the sampled window, looping.
  // Pause freezes the cursor where it is.
  useEffect(() => {
    if (info?.isLive || !replayPlaying) return;
    let s0 = Infinity;
    let s1 = -Infinity;
    for (const pts of byDriver.values()) {
      if (!pts.length) continue;
      if (pts[0].t < s0) s0 = pts[0].t;
      const last = pts[pts.length - 1].t;
      if (last > s1) s1 = last;
    }
    if (!(s1 > s0)) return;
    setCursorMs((cur) => (cur == null || cur < s0 || cur > s1 ? s0 : cur));
    const SPEED = 20; // 12-min window -> ~36 s per loop
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = ts - last;
      last = ts;
      setCursorMs((cur) => {
        const c = cur ?? s0;
        const next = c + dt * SPEED;
        return next > s1 ? s0 + ((next - s0) % (s1 - s0)) : next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [info?.isLive, byDriver, replayPlaying]);

  if (state === "loading" || state === "idle") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_map_title")}>
        <div className="rcx-head"><h2 className="rcx-title"><MapIcon aria-hidden="true" />{t("rcx_map_title")}</h2></div>
        <Skeleton h={280} />
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_map_title")}>
        <div className="rcx-head"><h2 className="rcx-title"><MapIcon aria-hidden="true" />{t("rcx_map_title")}</h2></div>
        <ErrorState onRetry={refresh} message={error ? `${t("rcx_error")}: ${error.message}` : t("rcx_error")} />
      </section>
    );
  }

  if (state === "needsSubscription") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_map_title")}>
        <div className="rcx-head"><h2 className="rcx-title"><MapIcon aria-hidden="true" />{t("rcx_map_title")}</h2></div>
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{lang === "it" ? LIVE_SUBSCRIPTION_MESSAGE_IT : LIVE_SUBSCRIPTION_MESSAGE_EN}</div>
      </section>
    );
  }

  const circuitLabel = info ? (info.circuitName || info.meetingName) : "";

  // Honest fallbacks: static outline, never dots placed at random.
  if (!track || !dataQuality.hasLocation || !fit) {
    const reason = fitOutcome && !fitOutcome.ok ? fitOutcome.reason : null;
    const note =
      reason === "degenerate-bbox"
        ? t("rcx_map_degenerate")
        : reason === "poor-quality"
          ? t("rcx_map_poor_quality")
          : !track || !dataQuality.hasLocation
            ? t("rcx_map_no_location")
            : t("rcx_map_fit_failed");
    return (
      <section className="card rcx-panel" aria-label={t("rcx_map_title")}>
        <div className="rcx-head"><h2 className="rcx-title"><MapIcon aria-hidden="true" />{t("rcx_map_title")}</h2></div>
        <TrackMap circuitId="" circuitName={circuitLabel || undefined} />
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{note}</div>
        <div className="rcx-mapbar">
          <span className="rcx-caption">{t("rcx_map_retry_hint")}</span>
          <button type="button" className="rcx-toggle" onClick={refresh}>
            <RotateCcw aria-hidden="true" />{t("rcx_retry")}
          </button>
        </div>
      </section>
    );
  }

  const handleSelect = (num: number) => {
    setSelected(num);
    onSelectDriver?.(num);
  };

  return (
    <section className="card rcx-panel" aria-label={t("rcx_map_title")}>
      <div className="rcx-head">
        <h2 className="rcx-title"><MapIcon aria-hidden="true" />{t("rcx_map_title")}</h2>
        <div className="rcx-head-actions">
          {info?.isLive && <span className="badge live"><span className="dot" aria-hidden="true" />LIVE</span>}
          {!info?.isLive && (
            <button
              type="button"
              className="rcx-toggle"
              aria-pressed={replayPlaying}
              onClick={() => setReplayPlaying((v) => !v)}
              aria-label={replayPlaying ? t("rcx_map_pause") : t("rcx_map_play")}
            >
              {replayPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {replayPlaying ? t("rcx_map_pause") : t("rcx_map_play")}
            </button>
          )}
          <button
            type="button"
            className="rcx-toggle"
            aria-pressed={showPositions}
            onClick={() => setShowPositions((v) => !v)}
          >
            <ListOrdered aria-hidden="true" />{t("rcx_map_toggle_positions")}
          </button>
        </div>
      </div>

      <div className="rcx-mapwrap">
        <svg viewBox="0 0 100 100" className="rcx-map" role="img" aria-label={circuitLabel}>
          <path
            d={track.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rcx-trackpath"
          />
          {dots.map(({ num, x, y }) => {
            const d = driverByNum.get(num);
            const colour = d?.teamColour ?? "#8892a3";
            const pos = posByDriver.get(num);
            const drs = telemetryAvailable && drsByDriver.get(num) === true;
            const isSel = selected === num;
            return (
              <g
                key={num}
                className="rcx-cardot"
                transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
                onClick={() => handleSelect(num)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(num); }
                }}
                tabIndex={0}
                role="button"
                aria-label={d ? `${d.acronym} — P${pos ?? "?"}` : `#${num}`}
              >
                {isSel && <circle r={5.2} fill="none" stroke="#fff" strokeWidth={0.9} opacity={0.9} className="rcx-dotring" />}
                {/* generous invisible hit area for touch */}
                <circle r={7.5} fill="transparent" />
                <circle r={3.4} fill={colour} stroke="rgba(0,0,0,0.4)" strokeWidth={0.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={3.1} fontWeight={800} fill="#fff">
                  {num}
                </text>
                {drs && (
                  <circle cx={2.7} cy={-2.7} r={1.25} fill="#22c55e" stroke="#fff" strokeWidth={0.4} className="rcx-drsdot">
                    <title>{t("rcx_map_drs_open")}</title>
                  </circle>
                )}
                {showPositions && pos != null && (
                  <text x={4.6} y={0.4} fontSize={2.9} fontWeight={700} fill="currentColor" opacity={0.85}>
                    P{pos}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rcx-mapbar">
        <span className="rcx-caption">{t("rcx_map_click_hint")}</span>
        <span className="rcx-caption">{dots.length} / {drivers.length}</span>
      </div>
      <p className="rcx-caption">{t("rcx_map_interp_note")}</p>
      {!info?.isLive && <p className="rcx-caption">{t("rcx_map_window_note")}</p>}
    </section>
  );
}

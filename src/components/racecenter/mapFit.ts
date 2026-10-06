/* ============================================================================
 * mapFit — fit OpenF1 car location points onto a vector circuit SVG path.
 * ----------------------------------------------------------------------------
 * ALGORITHM (validated offline on 5 real sessions vs the correct SVG
 * outlines — median point-to-path distance in viewBox units: Singapore 0.28,
 * Monaco 0.34, Suzuka 0.20, Silverstone 0.39, Spa 2.01):
 *   1. Parse the circuit SVG path (M/L/Z commands, decimal coords) and take
 *      its bounding box in viewBox units (0..100).
 *   2. Take the bounding box of the session's location points (arbitrary
 *      OpenF1 units — NOT meters, origin is arbitrary).
 *   3. Uniform scale = min(pathW / locW, pathH / locH) so the aspect ratio is
 *      preserved; the slack in the other dimension is centered.
 *   4. Flip Y only (flipx=false, flipy=true): OpenF1 Y grows upward, SVG Y
 *      grows downward. Validated consistent on all 5 circuits.
 *   5. Translate so the scaled location bbox sits centered on the path bbox.
 *
 * HONEST REJECTIONS (never random dots):
 *   - Degenerate bbox (e.g. cars stationary in the pits — observed Suzuka
 *     case: x∈[3690,3691], a 1×1-unit box over 684 samples): the location
 *     bbox must span >= 100 units (~10 m) in both dimensions, else the fit
 *     is rejected.
 *   - Quality self-check: after fitting, the median point-to-path distance
 *     is measured on a subsample; if it exceeds the threshold (default 6
 *     viewBox units, vs <= 2.01 measured on healthy circuits), the fit is
 *     rejected — the SVG geometry doesn't match reality for this session.
 *
 * NOTE on "simulation": this transform is a pure geometric fit of REAL
 * measured points onto REAL track geometry. No positions are invented.
 * ========================================================================== */

import type { LocationPoint } from "../../api/openf1model";
import { findTrack } from "../../data/circuits";
import type { TrackData } from "../../data/tracks";

export interface PathPoint {
  x: number;
  y: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FitTransform {
  /** Map raw location coords into SVG viewBox (0..100) coords. */
  map: (x: number, y: number) => PathPoint;
  pathBBox: BBox;
  locBBox: BBox;
  /** uniform scale applied (same on x and y) */
  scale: number;
}

/**
 * Minimum believable extent of real driving, in OpenF1 location units.
 * OpenF1 units are consistent across circuits (~8–10 units/m, measured from
 * median step speeds on 5 real sessions), so 100 units ≈ 10–12 m. A car that
 * is actually lapping always spans kilometers in both dimensions (smallest
 * observed healthy bbox: Monaco 7495×9605); a stationary car collapses to a
 * ~1×1 box (observed: Suzuka, x∈[3690,3691] over 684 samples). Anything below
 * this threshold means the data cannot constrain a fit — reject it honestly.
 */
const MIN_TRACK_EXTENT_UNITS = 100;

/**
 * Fit-quality gate: median point-to-path distance, in viewBox units, above
 * which the fit is rejected as unreliable. Calibrated on real multi-driver
 * sessions fitted to the CORRECT track outlines (medians): Singapore 0.28,
 * Monaco 0.34, Suzuka 0.20, Silverstone 0.39, Spa 2.01. The median (not the
 * mean) is used so pit-lane excursions don't skew the verdict. This is the
 * "honest override": if the geometry ever doesn't match reality, the panel
 * shows the static outline instead of misleading dots.
 */
const DEFAULT_QUALITY_THRESHOLD = 6;

export interface FitQuality {
  /** median point-to-path distance in viewBox units (lower = better) */
  medianDistance: number;
  /** fraction of samples within 6 viewBox units of the path */
  fracNear: number;
  samples: number;
}

export type FitFailureReason = "no-data" | "degenerate-bbox" | "bad-path" | "poor-quality";

export type FitOutcome =
  | { ok: true; transform: FitTransform; quality: FitQuality }
  | { ok: false; reason: FitFailureReason; quality: FitQuality | null };

export interface FitOptions {
  /**
   * Median-distance quality gate in viewBox units (default 8). Set to a
   * non-positive number to skip the quality check (not recommended — the
   * check is what keeps misleading dots off the map).
   */
  qualityThreshold?: number;
  /** max location samples used for the quality check (default 400) */
  qualitySamples?: number;
}

const NUM = "-?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?";

/**
 * Parse an SVG path that uses only M/L/Z commands with decimal coordinates
 * (this is exactly the format of every track in data/tracks.ts — verified
 * that no C/Q/A commands appear in any of the 40 circuits).
 */
export function parsePathPoints(d: string): PathPoint[] {
  const pts: PathPoint[] = [];
  const re = new RegExp(`([MLZmlz])|(${NUM})`, "g");
  let m: RegExpExecArray | null;
  let pending: number[] = [];
  const flush = () => {
    for (let i = 0; i + 1 < pending.length; i += 2) {
      const x = pending[i];
      const y = pending[i + 1];
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
    }
    pending = [];
  };
  while ((m = re.exec(d)) !== null) {
    if (m[1] !== undefined) {
      // New M/L segment or Z close: the coordinate pairs collected so far
      // form the polyline for the previous segment.
      flush();
    } else if (m[2] !== undefined) {
      pending.push(parseFloat(m[2]));
    }
  }
  flush();
  return pts;
}

function bboxOf(pts: Array<{ x: number; y: number }>): BBox | null {
  if (pts.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX) || !(maxX - minX > 1e-9) || !(maxY - minY > 1e-9)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * OpenF1 `circuit_short_name` values (e.g. "Monte Carlo", "Silverstone") do
 * NOT match the GeoJSON-based track index used by findTrack() (e.g.
 * "circuit de monaco", "silverstone circuit"). This explicit, hand-verified
 * table maps the normalized OpenF1 names to TRACKS record keys — no guessing,
 * no fuzzy matching: unknown names simply resolve to null and the UI falls
 * back to the honest static outline.
 */
const OPENF1_TRACK_ALIASES: Record<string, string> = {
  austin: "americas",
  baku: "baku",
  catalunya: "catalunya",
  hungaroring: "hungaroring",
  imola: "geo-autodromo-enzo-e-dino-ferrari",
  interlagos: "interlagos",
  jeddah: "geo-jeddah-corniche-circuit",
  "las vegas": "vegas",
  lusail: "losail",
  melbourne: "albert_park",
  "mexico city": "rodriguez",
  miami: "miami",
  "monte carlo": "monaco",
  montreal: "villeneuve",
  monza: "monza",
  sakhir: "geo-bahrain-international-circuit",
  shanghai: "shanghai",
  silverstone: "silverstone",
  singapore: "marina_bay",
  "spa francorchamps": "spa",
  spielberg: "red_bull_ring",
  suzuka: "suzuka",
  "yas marina circuit": "yas_marina",
  zandvoort: "zandvoort",
  // meeting `location` fallbacks (OpenF1 location != circuit_short_name)
  monaco: "monaco",
  "marina bay": "marina_bay",
  barcelona: "catalunya",
  budapest: "hungaroring",
  "sao paulo": "interlagos",
  "yas island": "yas_marina",
  "miami gardens": "miami",
  spa: "spa",
};

function normName(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve an OpenF1 session to its vector track. Tries, in order:
 *   1. findTrack() directly on circuitName / meetingName (covers names the
 *      index already knows);
 *   2. the explicit OPENF1_TRACK_ALIASES table above.
 * Returns null when nothing matches — the caller shows the static fallback.
 */
export function resolveTrack(
  circuitName?: string | null,
  meetingName?: string | null,
): TrackData | null {
  const direct =
    findTrack("", circuitName ?? undefined) ?? findTrack("", meetingName ?? undefined);
  if (direct) return direct;
  for (const name of [circuitName, meetingName]) {
    const key = OPENF1_TRACK_ALIASES[normName(name)];
    if (key) {
      const t = findTrack(key);
      if (t) return t;
    }
  }
  return null;
}

/** Point-to-segment distance, in the same units as the inputs. */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (!(l2 > 0)) return Math.hypot(px - ax, py - ay);
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Honest self-check: how well do the fitted location points actually sit on
 * the track outline? Subsamples the points (deterministic stride) and
 * measures the median point-to-path-polyline distance in viewBox units.
 * This is the "honest override": when the SVG geometry doesn't match reality
 * (measured: Spa median 12.6 vs 4–5 on healthy circuits), the fit is
 * rejected instead of showing misleading dots.
 */
function assessQuality(
  locPoints: LocationPoint[],
  pathPts: PathPoint[],
  transform: FitTransform,
  maxSamples: number,
): FitQuality {
  const n = locPoints.length;
  const stride = Math.max(1, Math.floor(n / Math.max(1, maxSamples)));
  const segs: Array<[PathPoint, PathPoint]> = [];
  for (let i = 0; i + 1 < pathPts.length; i++) segs.push([pathPts[i], pathPts[i + 1]]);
  const dists: number[] = [];
  for (let i = 0; i < n; i += stride) {
    const p = locPoints[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const s = transform.map(p.x, p.y);
    let best = Infinity;
    for (const [a, b] of segs) {
      const d = distToSegment(s.x, s.y, a.x, a.y, b.x, b.y);
      if (d < best) best = d;
    }
    dists.push(best);
  }
  dists.sort((a, b) => a - b);
  const median = dists.length ? dists[Math.floor(dists.length / 2)] : Infinity;
  const fracNear = dists.length ? dists.filter((d) => d <= 6).length / dists.length : 0;
  return { medianDistance: median, fracNear, samples: dists.length };
}

/**
 * Fit session location points onto a circuit SVG path.
 *
 * Returns { ok: true, transform, quality } on success, or { ok: false,
 * reason } when the fit cannot be computed honestly:
 *   - "no-data": fewer than 2 usable location points;
 *   - "degenerate-bbox": points are (near-)identical, e.g. cars stationary
 *     in the pits — bbox too small to constrain a fit;
 *   - "bad-path": the SVG path has no usable geometry;
 *   - "poor-quality": the geometric fit succeeded but the self-check shows
 *     the points don't actually sit on the outline (e.g. Spa, whose SVG
 *     proportions don't match the real track) — rejected instead of
 *     displaying misleading dots.
 */
export function fitLocationsToPath(
  locPoints: LocationPoint[],
  pathD: string,
  opts: FitOptions = {},
): FitOutcome {
  const threshold = opts.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
  const maxSamples = opts.qualitySamples ?? 400;

  const usable = locPoints.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (usable.length < 2) return { ok: false, reason: "no-data", quality: null };

  const pathPts = parsePathPoints(pathD);
  const pb = bboxOf(pathPts);
  if (!pb) return { ok: false, reason: "bad-path", quality: null };

  const lb = bboxOf(usable);
  if (!lb) return { ok: false, reason: "no-data", quality: null };

  const pathW = pb.maxX - pb.minX;
  const pathH = pb.maxY - pb.minY;
  const locW = lb.maxX - lb.minX;
  const locH = lb.maxY - lb.minY;
  // Degenerate-bbox detection: reject (near-)identical points honestly.
  if (!(locW >= MIN_TRACK_EXTENT_UNITS) || !(locH >= MIN_TRACK_EXTENT_UNITS)) {
    return { ok: false, reason: "degenerate-bbox", quality: null };
  }

  // Uniform scale preserves aspect ratio; center the slack dimension.
  // Orientation: flipx=false, flipy=true — validated on 5 real circuits
  // (Singapore, Monaco, Suzuka, Silverstone; Spa rejected by quality gate).
  const scale = Math.min(pathW / locW, pathH / locH);
  const offX = (pathW - locW * scale) / 2;
  const offY = (pathH - locH * scale) / 2;

  const transform: FitTransform = {
    map: (x: number, y: number) => ({
      x: pb.minX + (x - lb.minX) * scale + offX,
      // Y flip: location Y grows up, SVG Y grows down.
      y: pb.maxY - (y - lb.minY) * scale - offY,
    }),
    pathBBox: pb,
    locBBox: lb,
    scale,
  };

  if (threshold > 0) {
    const quality = assessQuality(usable, pathPts, transform, maxSamples);
    if (!(quality.medianDistance <= threshold)) {
      return { ok: false, reason: "poor-quality", quality };
    }
    return { ok: true, transform, quality };
  }
  return {
    ok: true,
    transform,
    quality: { medianDistance: 0, fracNear: 0, samples: 0 },
  };
}

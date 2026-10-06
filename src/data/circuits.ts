/* Circuit lookup: Jolpica circuitId/name -> vector track (tracks.ts).
 * Track geometry: MIT (c) 2019-2025 Tomislav Bacinger, bacinger/f1-circuits.
 */
import { TRACKS, TRACK_NAME_INDEX, type TrackData } from "./tracks";

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jolpica circuitName -> GeoJSON name, for cases plain normalization misses.
 *  Validated against the 2026 calendar (2026-10-06). */
const NAME_ALIASES: Record<string, string> = {
  "autodromo nazionale di monza": "autodromo nazionale monza",
  "las vegas strip street circuit": "las vegas street circuit",
  "lusail international circuit": "losail international circuit",
};

export function findTrack(circuitId: string, circuitName?: string): TrackData | null {
  if (circuitId && TRACKS[circuitId]) return TRACKS[circuitId];
  if (circuitName) {
    const n = norm(circuitName);
    const key = TRACK_NAME_INDEX[NAME_ALIASES[n] ?? n];
    if (key && TRACKS[key]) return TRACKS[key];
  }
  return null;
}

/** Track length label, honoring metric/imperial setting. "n/d" when unknown. */
export function formatTrackLength(lengthM: number, lang: "it" | "en", imperial: boolean): string {
  if (!lengthM || lengthM <= 0) return lang === "it" ? "n/d" : "n/a";
  if (imperial) {
    const mi = lengthM / 1609.344;
    return `${mi.toFixed(3)} mi`;
  }
  const km = (lengthM / 1000).toFixed(3);
  return `${lang === "it" ? km.replace(".", ",") : km} km`;
}

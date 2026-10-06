/* TrackMap: vector circuit outline (SVG) with elegant fallback.
 * Geometry: bacinger/f1-circuits, MIT (c) 2019-2025 Tomislav Bacinger.
 * Rendered with currentColor so it adapts to dark/light mode automatically.
 */
import { Route } from "lucide-react";
import { findTrack } from "../data/circuits";

interface TrackMapProps {
  circuitId: string;
  circuitName?: string;
  className?: string;
  /** stroke width in viewBox units (viewBox is 100x100) */
  strokeWidth?: number;
}

export function TrackMap({ circuitId, circuitName, className, strokeWidth = 4 }: TrackMapProps) {
  const track = findTrack(circuitId, circuitName);
  if (!track) {
    return (
      <div className={`circuit-ph ${className ?? ""}`} role="img" aria-label={circuitName ?? "circuit"}>
        <Route aria-hidden="true" />
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`trackmap ${className ?? ""}`}
      role="img"
      aria-label={track.name}
    >
      <path
        d={track.path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Driver photo with lazy loading, skeleton and professional placeholders.
 *
 * Visual system (premium uniform treatment):
 *  - fixed 1:1 aspect, same radius everywhere, object-fit: cover
 *  - object-position: center <focalY>% (per-driver focal point from the
 *    curated map; default near-top so faces are never cropped)
 *  - team-tint gradient backdrop: visible while loading, unifies the grid
 *  - historic variant: when no photo exists for a pre-modern driver, an
 *    elegant sepia "archive" placeholder clearly marks the absence
 *    (never a random modern photo, never initials, never emoji)
 *
 * Source: Wikimedia Commons / Wikipedia (free-licensed portraits).
 */
import { useEffect, useState } from "react";
import { History, UserRound } from "lucide-react";
import { getDriverPhoto } from "../api/photos";

interface Props {
  /** Stable Jolpica driverId — used for the curated verified portrait. */
  driverId?: string;
  wikiUrl?: string;
  name: string;
  /** px size of the square. */
  size?: number;
  /** team color for the placeholder/backdrop tint. */
  tint?: string;
  /** Pre-modern driver: archive-style placeholder when no photo. */
  historic?: boolean;
  className?: string;
}

export function DriverPhoto({ driverId, wikiUrl, name, size = 44, tint, historic, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [focalY, setFocalY] = useState<number | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [prevKey, setPrevKey] = useState<string | undefined>(undefined);
  const key = `${driverId ?? ""}|${wikiUrl ?? ""}|${name}`;

  // Reset on identity change during render (recommended pattern over effect setState).
  if (prevKey !== key) {
    setPrevKey(key);
    setSrc(null);
    setFocalY(undefined);
    setFailed(false);
    setDone(false);
  }

  useEffect(() => {
    let on = true;
    getDriverPhoto(driverId, wikiUrl, name).then((p) => {
      if (on) {
        setSrc(p?.thumb ?? null);
        setFocalY(p?.focalY);
        if (!p) setDone(true); // placeholder: no skeleton needed
      }
    });
    return () => {
      on = false;
    };
  }, [key, driverId, wikiUrl, name]);

  const style = { width: size, height: size } as const;
  const showImg = src && !failed;
  const backdrop = tint
    ? { background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 26%, var(--surface-2)), var(--surface-2) 72%)` }
    : undefined;

  return (
    <span
      className={`dphoto${historic ? " hist" : ""}${className ? " " + className : ""}`}
      style={{ ...style, ...backdrop }}
      role="img"
      aria-label={name}
    >
      {!done && <span className="dphoto-sk" aria-hidden />}
      {!showImg ? (
        <span
          className="dphoto-ph"
          aria-hidden
          style={tint && !historic ? { color: tint, background: "transparent" } : undefined}
        >
          {historic ? (
            <span className="dphoto-arch">
              <History size={Math.round(size * 0.42)} strokeWidth={1.6} />
              <span className="dphoto-arch-t">n/d</span>
            </span>
          ) : (
            <UserRound size={Math.round(size * 0.52)} strokeWidth={1.8} />
          )}
        </span>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setDone(true)}
          onError={() => setFailed(true)}
          style={{
            opacity: done ? 1 : 0,
            objectPosition: `center ${focalY ?? 18}%`,
          }}
        />
      )}
    </span>
  );
}

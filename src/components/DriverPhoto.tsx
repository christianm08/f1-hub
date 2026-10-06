/* Driver photo with lazy loading, skeleton and professional placeholder.
 * Source: Wikipedia/Wikimedia Commons (free-licensed portraits).
 */
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { getDriverPhoto } from "../api/photos";

interface Props {
  wikiUrl?: string;
  name: string;
  /** px size of the square. */
  size?: number;
  /** team color for the placeholder tint. */
  tint?: string;
  className?: string;
}

export function DriverPhoto({ wikiUrl, name, size = 44, tint, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [prevKey, setPrevKey] = useState<string | undefined>(undefined);
  const key = `${wikiUrl ?? ""}|${name}`;

  // Reset on identity change during render (recommended pattern over effect setState).
  if (prevKey !== key) {
    setPrevKey(key);
    setSrc(null);
    setFailed(false);
    setDone(false);
  }

  useEffect(() => {
    let on = true;
    getDriverPhoto(wikiUrl, name).then((p) => {
      if (on) {
        setSrc(p?.thumb ?? null);
        if (!p) setDone(true); // placeholder: no skeleton needed
      }
    });
    return () => {
      on = false;
    };
  }, [key, wikiUrl, name]);

  const style = { width: size, height: size } as const;
  const showImg = src && !failed;

  return (
    <span
      className={`dphoto${className ? " " + className : ""}`}
      style={style}
      role="img"
      aria-label={name}
    >
      {!done && <span className="dphoto-sk" aria-hidden />}
      {!showImg ? (
        <span
          className="dphoto-ph"
          aria-hidden
          style={tint ? { background: `color-mix(in srgb, ${tint} 22%, var(--surface-2))`, color: tint } : undefined}
        >
          <UserRound size={Math.round(size * 0.52)} strokeWidth={1.8} />
        </span>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setDone(true)}
          onError={() => setFailed(true)}
          style={{ opacity: done ? 1 : 0 }}
        />
      )}
    </span>
  );
}

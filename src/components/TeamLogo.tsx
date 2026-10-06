/* Team logo (free-licensed only, see src/data/assets.ts) or professional
 * placeholder. Logos are never stretched: object-fit contain.
 */
import { useState } from "react";
import { Shield } from "lucide-react";
import { teamLogo } from "../data/assets";

interface Props {
  constructorId?: string;
  name: string;
  /** px size of the square box. */
  size?: number;
  /** team color for the placeholder tint. */
  tint?: string;
  className?: string;
}

export function TeamLogo({ constructorId, name, size = 40, tint, className }: Props) {
  const [failed, setFailed] = useState(false);
  const asset = teamLogo(constructorId);
  const style = { width: size, height: size } as const;
  if (!asset || failed) {
    return (
      <span
        className={`tlogo tlogo-ph${className ? " " + className : ""}`}
        style={style}
        role="img"
        aria-label={name}
        title={name}
      >
        <span
          className="tlogo-ph-in"
          style={tint ? { background: `color-mix(in srgb, ${tint} 20%, var(--surface-2))`, color: tint } : undefined}
        >
          <Shield size={Math.round(size * 0.5)} strokeWidth={1.8} />
        </span>
      </span>
    );
  }
  return (
    <span
      className={`tlogo tlogo-real${className ? " " + className : ""}`}
      style={style}
      role="img"
      aria-label={name}
      title={name}
    >
      <img src={asset.url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

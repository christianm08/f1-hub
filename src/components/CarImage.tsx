/* Car photo for a constructor in an exact season (see src/data/assets.ts).
 * Never shows a car from the wrong year: undefined season match -> elegant
 * placeholder. Presented as a premium element.
 */
import { useState } from "react";
import { CarFront } from "lucide-react";
import { teamCar } from "../data/assets";

interface Props {
  constructorId?: string;
  season: number | string;
  teamName: string;
  tint?: string;
  className?: string;
}

export function CarImage({ constructorId, season, teamName, tint, className }: Props) {
  const [failed, setFailed] = useState(false);
  const asset = teamCar(constructorId, season);
  if (!asset || failed) {
    return (
      <div className={`carimg carimg-ph${className ? " " + className : ""}`} role="img" aria-label={teamName}>
        <span
          className="carimg-ph-in"
          style={tint ? { color: tint } : undefined}
        >
          <CarFront size={44} strokeWidth={1.4} />
          <small>{teamName}</small>
        </span>
      </div>
    );
  }
  return (
    <figure className={`carimg${className ? " " + className : ""}`}>
      <img src={asset.url} alt={`${asset.car} (${asset.season})`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      <figcaption>
        {asset.car} · {asset.season}
      </figcaption>
    </figure>
  );
}

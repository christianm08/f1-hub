/* Circular stylized flag icon (flag-icons library, MIT).
   Takes a 3-letter code (ITA, GBR, …); falls back to the text chip when unknown. */
import { flagIso2 } from "../data/meta";

export function FlagIcon({ code, size = 20, title }: { code: string; size?: number; title?: string }) {
  const iso2 = flagIso2(code);
  if (!iso2) {
    return (
      <span className="nat" title={title ?? code}>
        {code}
      </span>
    );
  }
  return (
    <span
      className="flag-round"
      style={{ width: size, height: size }}
      role="img"
      aria-label={title ?? code}
      title={title ?? code}
    >
      <span className={`fi fi-${iso2} fis`} />
    </span>
  );
}

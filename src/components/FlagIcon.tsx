/* Circular flag icon.
 *
 * Source: flag-icons SVGs (MIT, https://github.com/lipis/flag-icons),
 * vendored under src/assets/flags/ (1:1 variants).
 *
 * Rendered as a plain <img> with border-radius:50% + object-fit:cover
 * instead of CSS background clipping: identical look, but a reliable
 * circular crop on every browser/GPU (no bleed/offset artifacts).
 *
 * Takes a 3-letter code (ITA, GBR, …); falls back to the text chip when unknown. */
import { flagIso2 } from "../data/meta";

const flagUrls = import.meta.glob<string>("../assets/flags/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export function FlagIcon({ code, size = 20, title }: { code: string; size?: number; title?: string }) {
  const iso2 = flagIso2(code);
  const url = iso2 ? flagUrls[`../assets/flags/${iso2}.svg`] : undefined;
  if (!url) {
    return (
      <span className="nat" title={title ?? code}>
        {code}
      </span>
    );
  }
  return (
    <img
      className="flag-round"
      src={url}
      width={size}
      height={size}
      alt={title ?? code}
      title={title ?? code}
      draggable={false}
    />
  );
}

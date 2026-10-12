/* Race Center core — shared helpers. Owned by the race-center core agent. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { formatGap, formatLapTime } from "../../api/openf1";
import type { DriverEntry } from "../../api/openf1model";
import "./core.css";

export { formatGap, formatLapTime };

/** Compound -> single letter badge class (index.css `.tyre` classes, reused). */
export const TYRE_LETTER: Record<string, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
};

/** Compound -> strategy-bar colour class (defined in core.css). */
export function compoundClass(compound: string | null | undefined): string {
  const c = (compound ?? "").toUpperCase();
  if (c === "SOFT" || c === "MEDIUM" || c === "HARD" || c === "INTERMEDIATE" || c === "WET") return `cmp-${c}`;
  return "cmp-UNKNOWN";
}

export function compoundShort(compound: string | null | undefined): string {
  const c = (compound ?? "").toUpperCase();
  if (c === "INTERMEDIATE") return "INT";
  return TYRE_LETTER[c] ?? "?";
}

/** "n/d" for missing values — the golden rule: never invent data. */
export function nd(v: string | number | null | undefined): string {
  return v == null || v === "" ? "n/d" : String(v);
}

export function fmtTime(d: Date, lang: string): string {
  return d.toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function useDriverMap(drivers: DriverEntry[]): Map<number, DriverEntry> {
  const [map, setMap] = useState(() => new Map<number, DriverEntry>());
  useEffect(() => {
    setMap(new Map(drivers.map((d) => [d.number, d])));
  }, [drivers]);
  return map;
}

export function useIsMobile(breakpoint = 899): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const fn = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [breakpoint]);
  return mobile;
}

/** Acronym fallback when a driver entry is missing. */
export function acronymOf(drivers: Map<number, DriverEntry>, num: number): string {
  return drivers.get(num)?.acronym ?? `#${num}`;
}

/**
 * Numeric fade for updated values (lap times, sectors, gaps).
 * Usage: <NumFade key={String(value)} value={value} /> — the key remounts
 * the span only when the value actually changes, replaying a brief
 * opacity-only fade. inline-block + tabular numerals => no layout shift.
 */
export function NumFade({ value, className }: { value: ReactNode; className?: string }) {
  return (
    <span className={["rc-numfade", className ?? ""].filter(Boolean).join(" ")}>{value}</span>
  );
}

/**
 * FLIP animation for reordered rows (classification position changes).
 * Children carry data-rc-row="<stable key>". Before paint, the hook
 * snapshots each row's top; rows that moved get a transform-only WAAPI
 * tween from their old position. Duration/easing come from the motion
 * tokens, which collapse to ~instant under prefers-reduced-motion.
 * Never touches data or layout — pure visual continuity.
 */
export function useFlipRows<T>(ref: RefObject<HTMLElement | null>, order: T): void {
  const prev = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const root = ref.current;
    const next = new Map<string, number>();
    if (root && typeof document !== "undefined") {
      const cs = getComputedStyle(document.documentElement);
      const dur = parseFloat(cs.getPropertyValue("--motion-duration-normal")) || 0;
      const ease =
        cs.getPropertyValue("--motion-easing-emphasized").trim() || "cubic-bezier(0.2, 0, 0, 1)";
      root.querySelectorAll<HTMLElement>("[data-rc-row]").forEach((el) => {
        const k = el.dataset.rcRow;
        if (k == null) return;
        const top = el.getBoundingClientRect().top;
        const old = prev.current.get(k);
        if (old != null && Math.abs(old - top) > 1.5 && dur > 2 && typeof el.animate === "function") {
          el.animate(
            [
              { transform: `translateY(${(old - top).toFixed(1)}px)` },
              { transform: "translateY(0px)" },
            ],
            { duration: dur, easing: ease },
          );
        }
        next.set(k, top);
      });
    }
    prev.current = next;
    // `order` is the identity that changes when rows reorder/update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);
}

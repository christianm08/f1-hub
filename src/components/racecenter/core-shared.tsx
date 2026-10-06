/* Race Center core — shared helpers. Owned by the race-center core agent. */
import { useEffect, useState } from "react";
import { formatLapTime } from "../../api/openf1";
import type { DriverEntry } from "../../api/openf1model";
import "./core.css";

export { formatLapTime };

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

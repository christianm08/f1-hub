/* Race Center core — pit timeline + stint/strategy view with official
   compound colours. Owned by the race-center core agent. */
import { useMemo } from "react";
import { ArrowRight, Layers, Wrench } from "lucide-react";
import type { DriverEntry, PitView, StintView, TimingRow } from "../../api/openf1model";
import { useSettings } from "../../store/settings";
import { acronymOf, compoundClass, compoundShort, fmtTime, useDriverMap } from "./core-shared";
import "./core.css";

interface PitsProps {
  pits: PitView[];
  drivers: DriverEntry[];
}

/** Chronological pit-stop list; the 3 most recent are highlighted. */
export function PitTimeline({ pits, drivers }: PitsProps) {
  const { t, lang } = useSettings();
  const driverMap = useDriverMap(drivers);
  const ordered = useMemo(() => [...pits].reverse(), [pits]); // newest first
  return (
    <section className="rc-panel" aria-label={t("rc_pit_timeline")}>
      <div className="rc-panel-head">
        <h3><Wrench aria-hidden="true" />{t("rc_pit_timeline")}</h3>
      </div>
      <div className="rc-tl-scroll">
        {ordered.length === 0 ? (
          <p className="rc-nd" style={{ padding: "6px 14px" }}>{t("not_available")}</p>
        ) : (
          <div className="rc-tl" style={{ marginLeft: 14 }}>
            {ordered.map((p, i) => (
              <div className={`rc-tl-item sev-pit${i < 3 ? " rc-tl-recent" : ""}`} key={`${p.driver}-${p.time}-${i}`}>
                <span className="rc-tl-time">{fmtTime(new Date(p.time), lang)}</span>
                <span className="rc-tl-cat">
                  {acronymOf(driverMap, p.driver)} · {t("lap")} {p.lap}
                </span>
                <p className="rc-tl-msg">
                  {p.duration != null ? `${p.duration.toFixed(1)}s` : "n/d"}
                  {(p.prevCompound || p.newCompound) && (
                    <span style={{ marginLeft: 8, display: "inline-flex", gap: 5, verticalAlign: "middle" }}>
                      {p.prevCompound && (
                        <span className={`rc-strat-seg ${compoundClass(p.prevCompound)}`} style={{ height: 18, padding: "0 7px", borderRadius: 5 }}>
                          {compoundShort(p.prevCompound)}
                        </span>
                      )}
                      <ArrowRight size={12} aria-hidden="true" style={{ color: "var(--text-3)" }} />
                      {p.newCompound && (
                        <span className={`rc-strat-seg ${compoundClass(p.newCompound)}`} style={{ height: 18, padding: "0 7px", borderRadius: 5 }}>
                          {compoundShort(p.newCompound)}
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const LEGEND: { c: string; label: string }[] = [
  { c: "SOFT", label: "Soft" },
  { c: "MEDIUM", label: "Medium" },
  { c: "HARD", label: "Hard" },
  { c: "INTERMEDIATE", label: "Intermediate" },
  { c: "WET", label: "Wet" },
];

interface StratProps {
  stints: StintView[];
  timing: TimingRow[];
  drivers: DriverEntry[];
  totalLaps: number | null;
}

/** Per-driver strategy bars: LAP a→b COMPOUND with official compound colours. */
export function StrategyView({ stints, timing, drivers, totalLaps }: StratProps) {
  const { t } = useSettings();
  const driverMap = useDriverMap(drivers);
  const byDriver = useMemo(() => new Map(stints.map((s) => [s.driver, s.stints])), [stints]);
  const order = useMemo(
    () => (timing.length ? timing.map((r) => r.number) : [...byDriver.keys()].sort((a, b) => a - b)),
    [timing, byDriver],
  );
  const maxLap = useMemo(() => {
    let m = totalLaps ?? 0;
    for (const list of byDriver.values())
      for (const s of list) m = Math.max(m, s.lapEnd ?? s.lapStart);
    return m || null;
  }, [byDriver, totalLaps]);

  if (stints.length === 0) {
    return (
      <section className="rc-panel" aria-label={t("rc_strategy")}>
        <div className="rc-panel-head"><h3><Layers aria-hidden="true" />{t("rc_strategy")}</h3></div>
        <p className="rc-nd" style={{ padding: "6px 14px" }}>{t("not_available")}</p>
      </section>
    );
  }

  return (
    <section className="rc-panel" aria-label={t("rc_strategy")}>
      <div className="rc-panel-head">
        <h3><Layers aria-hidden="true" />{t("rc_strategy")}</h3>
      </div>
      <div className="rc-panel-body">
        <div className="rc-legend" style={{ marginBottom: 10 }}>
          {LEGEND.map((l) => (
            <span key={l.c}><i className={compoundClass(l.c)} />{l.label}</span>
          ))}
        </div>
        {order.map((num) => {
          const list = byDriver.get(num);
          if (!list?.length) return null;
          const span = maxLap ?? 1;
          return (
            <div className="rc-strat-row" key={num}>
              <span className="rc-strat-name">
                <i style={{ width: 3, height: 16, borderRadius: 2, background: driverMap.get(num)?.teamColour ?? "#8892a3", display: "inline-block" }} aria-hidden="true" />
                {acronymOf(driverMap, num)}
              </span>
              <div className="rc-strat-bar" role="img" aria-label={`${acronymOf(driverMap, num)}: ${list.map((s) => `${s.compound} ${s.lapStart}-${s.lapEnd ?? "…"}`).join(", ")}`}>
                {list.map((s, i) => {
                  const laps = (s.lapEnd ?? span) - s.lapStart + 1;
                  const w = Math.max(4, (laps / span) * 100);
                  return (
                    <span key={i} className={`rc-strat-seg ${compoundClass(s.compound)}`} style={{ width: `${w}%` }}
                      title={`${t("rc_stint")} ${s.stintNumber}: ${s.compound} · ${t("lap")} ${s.lapStart}→${s.lapEnd ?? "…"} · ${t("rc_age_laps")}: ${s.age}`}>
                      {laps >= 3 ? `${compoundShort(s.compound)}${s.lapStart}–${s.lapEnd ?? "…"}` : compoundShort(s.compound)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

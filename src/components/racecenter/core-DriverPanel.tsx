/* Race Center core — driver detail: side panel on desktop, bottom sheet
   on mobile (portaled to <body>: page wrappers use transform animations
   that trap position:fixed). Owned by the race-center core agent. */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { User, X } from "lucide-react";
import type { DriverEntry, LapEntry, PitView, StintView, TimingRow } from "../../api/openf1model";
import { useSettings } from "../../store/settings";
import { Sparkline } from "../charts";
import { TYRE_LETTER, compoundClass, compoundShort, formatGap, formatLapTime, useDriverMap } from "./core-shared";
import "./core.css";

interface Props {
  number: number | null;
  onClose: () => void;
  timing: TimingRow[];
  drivers: DriverEntry[];
  laps: Map<number, LapEntry[]>;
  stints: StintView[];
  pits: PitView[];
  inline?: boolean;
}

export function DriverPanel({ number, onClose, timing, drivers, laps, stints, pits, inline }: Props) {
  const { t, lang } = useSettings();
  const driverMap = useDriverMap(drivers);
  const row = number != null ? timing.find((r) => r.number === number) : undefined;
  const driver = number != null ? driverMap.get(number) : undefined;
  const driverLaps = number != null ? (laps.get(number) ?? []) : [];
  const driverStints = number != null ? (stints.find((s) => s.driver === number)?.stints ?? []) : [];
  const driverPits = number != null ? pits.filter((p) => p.driver === number) : [];

  const lapSeries = driverLaps
    .filter((l) => l.duration != null && !l.isPitOut)
    .slice(-30)
    .map((l) => l.duration as number);

  // Lock body scroll while the sheet is open (non-inline mode).
  useEffect(() => {
    if (inline || number == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [inline, number, onClose]);

  if (number == null) {
    return inline ? (
      <section className="rc-panel">
        <div className="rc-panel-head"><h3><User aria-hidden="true" />{t("rc_tab_driver")}</h3></div>
        <p className="rc-nd" style={{ padding: "12px 14px" }}>{t("rc_tap_driver")}</p>
      </section>
    ) : null;
  }

  const [s1, s2, s3] = row?.sectors ?? [null, null, null];
  const body = (
    <div className={inline ? "" : "rc-dp"} role="dialog" aria-modal={inline ? undefined : true} aria-label={driver?.fullName ?? `#${number}`}>
      {!inline && <div className="rc-dp-handle" aria-hidden="true" />}
      <div className="rc-dp-head">
        <span className="pos" style={{ borderLeftColor: driver?.teamColour ?? "#8892a3" }}>
          {row?.position ?? "–"}
        </span>
        <div className="who">
          <b>{driver?.fullName ?? `#${number}`}</b>
          <span>{driver ? `${driver.acronym} · #${driver.number} · ${driver.teamName}` : t("not_available")}</span>
        </div>
        {!inline && (
          <button className="btn ghost small rc-dp-close" onClick={onClose} aria-label={t("rc_close")}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="rc-dp-body">
        <div className="rc-kv">
          <div className="cell"><div className="k">{t("gap")}</div><div className="v">{formatGap(row?.gapToLeader)}</div></div>
          <div className="cell"><div className="k">{t("rc_int_short")}</div><div className="v">{row?.interval ?? "n/d"}</div></div>
          <div className="cell"><div className="k">{t("rc_last_short")}</div><div className="v">{row?.lastLap != null ? formatLapTime(row.lastLap) : "n/d"}</div></div>
          <div className="cell"><div className="k">{t("rc_best_short")}</div><div className="v">{row?.bestLap != null ? formatLapTime(row.bestLap) : "n/d"}</div></div>
          <div className="cell"><div className="k">{t("tyre")}</div><div className="v">
            {row?.compound ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i className={`tyre ${TYRE_LETTER[row.compound] ?? ""}`}>{TYRE_LETTER[row.compound] ?? "?"}</i>
                {row.tyreAge ?? "–"}
              </span>
            ) : "n/d"}
          </div></div>
          <div className="cell"><div className="k">{t("pit")}</div><div className="v">{row?.pitCount ?? 0}</div></div>
          <div className="cell"><div className="k">S1</div><div className="v">{s1 != null ? formatLapTime(s1) : "n/d"}</div></div>
          <div className="cell"><div className="k">S2</div><div className="v">{s2 != null ? formatLapTime(s2) : "n/d"}</div></div>
          <div className="cell"><div className="k">S3</div><div className="v">{s3 != null ? formatLapTime(s3) : "n/d"}</div></div>
        </div>

        {lapSeries.length > 1 && (
          <section>
            <p className="rc-nd" style={{ margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
              {t("rc_lap_timing")} · {t("rc_time")}
            </p>
            <Sparkline values={lapSeries} width={340} height={64} stroke="#e10600" ariaLabel={t("rc_lap_timing")} />
          </section>
        )}

        {driverStints.length > 0 && (
          <section>
            <p className="rc-nd" style={{ margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
              {t("rc_strategy")}
            </p>
            <div className="rc-strat-bar" style={{ height: 30 }}>
              {(() => {
                const span = Math.max(...driverStints.map((s) => s.lapEnd ?? s.lapStart));
                return driverStints.map((s, i) => {
                  const n = (s.lapEnd ?? span) - s.lapStart + 1;
                  return (
                    <span key={i} className={`rc-strat-seg ${compoundClass(s.compound)}`} style={{ width: `${(n / span) * 100}%` }}
                      title={`${s.compound} · ${t("lap")} ${s.lapStart}→${s.lapEnd ?? "…"}`}>
                      {compoundShort(s.compound)} {s.lapStart}–{s.lapEnd ?? "…"}
                    </span>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {driverPits.length > 0 && (
          <section>
            <p className="rc-nd" style={{ margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
              {t("rc_pit_timeline")}
            </p>
            {driverPits.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                <span className="rc-mono" style={{ color: "var(--text-3)", fontSize: "0.76rem" }}>
                  {new Date(p.time).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}
                </span>
                <span>{t("lap")} {p.lap}</span>
                <span className="rc-mono">{p.duration != null ? `${p.duration.toFixed(1)}s` : "n/d"}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );

  if (inline) return body;
  return createPortal(
    <>
      <div className="rc-dp-backdrop" onClick={onClose} aria-hidden="true" />
      {body}
    </>,
    document.body,
  );
}

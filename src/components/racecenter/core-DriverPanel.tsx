/* Race Center core — driver detail panel.
   Renders inline in the mobile "driver" tab, or as a Material 3 modal
   bottom sheet (portaled to <body> by the design system) on top of the
   timing tower. Owned by the race-center core agent. */
import type { DriverEntry, LapEntry, PitView, StintView, TimingRow } from "../../api/openf1model";
import { useSettings } from "../../store/settings";
import { Sparkline } from "../charts";
import { MBottomSheet, MIcon } from "../../design";
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

  if (number == null) {
    return inline ? (
      <section className="rc-panel">
        <div className="rc-panel-head"><h3><MIcon name="person" />{t("rc_tab_driver")}</h3></div>
        <p className="rc-nd" style={{ padding: "12px 14px" }}>{t("rc_tap_driver")}</p>
      </section>
    ) : null;
  }

  const [s1, s2, s3] = row?.sectors ?? [null, null, null];
  const title = (
    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="pos" style={{
        fontFamily: "var(--md-sys-typescale-mono)", fontSize: "1.5rem", fontWeight: 800,
        borderLeft: `4px solid ${driver?.teamColour ?? "#8892a3"}`, paddingLeft: 10, lineHeight: 1.1,
      }}>
        {row?.position ?? "–"}
      </span>
      <span>
        <b style={{ fontSize: "1.05rem", display: "block" }}>{driver?.fullName ?? `#${number}`}</b>
        <span style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "0.8rem", fontWeight: 400 }}>
          {driver ? `${driver.acronym} · #${driver.number} · ${driver.teamName}` : t("not_available")}
        </span>
      </span>
    </span>
  );

  const body = (
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
          <p className="rc-dp-sec">{t("rc_lap_timing")} · {t("rc_time")}</p>
          <Sparkline values={lapSeries} width={340} height={64} stroke="#e10600" ariaLabel={t("rc_lap_timing")} />
        </section>
      )}

      {driverStints.length > 0 && (
        <section>
          <p className="rc-dp-sec">{t("rc_strategy")}</p>
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
          <p className="rc-dp-sec">{t("rc_pit_timeline")}</p>
          {driverPits.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--md-sys-color-outline-variant)", fontSize: "0.85rem" }}>
              <span className="rc-mono" style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "0.76rem" }}>
                {new Date(p.time).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}
              </span>
              <span>{t("lap")} {p.lap}</span>
              <span className="rc-mono">{p.duration != null ? `${p.duration.toFixed(1)}s` : "n/d"}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );

  if (inline) {
    return (
      <section className="rc-panel" aria-label={driver?.fullName ?? `#${number}`}>
        <div className="rc-panel-head">
          <h3><MIcon name="person" />{driver?.fullName ?? `#${number}`}</h3>
        </div>
        <div className="rc-panel-body">{body}</div>
      </section>
    );
  }

  return (
    <MBottomSheet open onClose={onClose} title={title}>
      {body}
    </MBottomSheet>
  );
}

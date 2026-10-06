/* Race Center core — per-driver lap timing table with PB/session-best
   highlights and mini-sector colour bars (2048 yellow, 2049 green,
   2051 purple). Owned by the race-center core agent. */
import { useMemo } from "react";
import { Timer } from "lucide-react";
import type { DriverEntry, LapEntry, TimingRow } from "../../api/openf1model";
import { useSettings } from "../../store/settings";
import { acronymOf, formatLapTime, useDriverMap } from "./core-shared";
import "./core.css";

function segClass(code: number): string {
  if (code === 2048) return "s2048";
  if (code === 2049) return "s2049";
  if (code === 2051) return "s2051";
  return "";
}

function SegBar({ segs }: { segs?: number[] }) {
  if (!segs || segs.length === 0) return null;
  return (
    <span className="rc-segbar" aria-hidden="true">
      {segs.map((c, i) => <i key={i} className={segClass(c)} />)}
    </span>
  );
}

function SectorCell({ time, segs }: { time: number | null; segs?: number[] }) {
  return (
    <td>
      <div>{time != null ? formatLapTime(time) : "–"}</div>
      <SegBar segs={segs} />
    </td>
  );
}

interface Props {
  laps: Map<number, LapEntry[]>;
  timing: TimingRow[];
  drivers: DriverEntry[];
  selected: number | null;
  onSelect: (num: number | null) => void;
}

export function LapTiming({ laps, timing, drivers, selected, onSelect }: Props) {
  const { t } = useSettings();
  const driverMap = useDriverMap(drivers);
  const options = useMemo(
    () => (timing.length ? timing.map((r) => r.number) : [...laps.keys()].sort((a, b) => a - b)),
    [timing, laps],
  );
  const rows = selected != null ? (laps.get(selected) ?? []) : [];

  return (
    <section className="rc-panel" aria-label={t("rc_lap_timing")}>
      <div className="rc-panel-head">
        <h3><Timer aria-hidden="true" />{t("rc_lap_timing")}</h3>
      </div>
      <div style={{ padding: "12px 14px 0" }}>
        <label className="rc-nd" htmlFor="rc-lap-driver" style={{ display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
          {t("rc_select_driver")}
        </label>
        <select
          id="rc-lap-driver"
          className="rc-select"
          value={selected ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">—</option>
          {options.map((num) => (
            <option key={num} value={num}>
              {acronymOf(driverMap, num)}{driverMap.get(num)?.fullName ? ` — ${driverMap.get(num)!.fullName}` : ""}
            </option>
          ))}
        </select>
        {selected != null && (
          <p className="small muted" style={{ margin: "8px 0 0", display: "flex", gap: 12 }}>
            <span><i className="rc-segbar" style={{ marginRight: 4 }}><i className="s2051" /></i>{t("rc_personal_best")}</span>
            <span><i className="rc-segbar" style={{ marginRight: 4 }}><i className="s2049" /></i>{t("rc_session_best")}</span>
          </p>
        )}
      </div>
      {selected == null ? (
        <p className="rc-nd" style={{ padding: "12px 14px" }}>{t("rc_tap_driver")}</p>
      ) : rows.length === 0 ? (
        <p className="rc-nd" style={{ padding: "12px 14px" }}>{t("not_available")}</p>
      ) : (
        <div className="rc-tower-scroll" style={{ maxHeight: 480, overflowY: "auto", marginTop: 10 }}>
          <table className="rc-laps">
            <thead>
              <tr>
                <th scope="col">{t("lap")}</th>
                <th scope="col">S1</th>
                <th scope="col">S2</th>
                <th scope="col">S3</th>
                <th scope="col">{t("rc_time")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.lap} className={`${l.isSessionBest ? "is-sb" : l.isPersonalBest ? "is-pb" : ""}${l.isPitOut ? " is-pitout" : ""}`}>
                  <td>{l.lap}</td>
                  <SectorCell time={l.s1} segs={l.segments?.[0]} />
                  <SectorCell time={l.s2} segs={l.segments?.[1]} />
                  <SectorCell time={l.s3} segs={l.segments?.[2]} />
                  <td className="laptime">{l.duration != null ? formatLapTime(l.duration) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

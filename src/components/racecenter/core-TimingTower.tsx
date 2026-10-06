/* Race Center core — timing tower. Memoized rows, position-change flash,
   leader badge, PB (purple) / session-best (green) highlights. Owned by the
   race-center core agent. */
import { memo } from "react";
import { ChevronDown, ChevronUp, Timer } from "lucide-react";
import type { DriverEntry, TimingRow } from "../../api/openf1model";
import type { DictKey } from "../../i18n/dict";
import { useSettings } from "../../store/settings";
import { Skeleton } from "../ui";
import { TYRE_LETTER, formatLapTime, useIsMobile } from "./core-shared";
import "./core.css";

interface RowProps {
  row: TimingRow;
  driver: DriverEntry | undefined;
  sessionBest: number | null;
  selected: boolean;
  onSelect: (num: number) => void;
  t: (k: DictKey) => string;
}

function delta(row: TimingRow): { cls: "up" | "dn"; n: number } | null {
  if (row.prevPosition == null || row.prevPosition === row.position) return null;
  const d = row.prevPosition - row.position;
  return d > 0 ? { cls: "up", n: d } : { cls: "dn", n: -d };
}

function DeltaIcon({ d }: { d: { cls: "up" | "dn"; n: number } }) {
  const Icon = d.cls === "up" ? ChevronUp : ChevronDown;
  return (
    <span className={`rc-delta ${d.cls}`} aria-label={d.cls === "up" ? `+${d.n}` : `-${d.n}`}>
      <Icon size={11} strokeWidth={3} aria-hidden="true" />
      {d.n}
    </span>
  );
}

function statusBadge(row: TimingRow, t: RowProps["t"]) {
  if (row.status === "retired") return <span className="rc-status ret">{t("rc_retired")}</span>;
  if (row.status === "inpit") return <span className="rc-status pit">{t("rc_in_pit")}</span>;
  if (row.status === "out") return <span className="rc-status out">{t("rc_out_lap")}</span>;
  return null;
}

/** One desktop table row — memoized so differential updates don't re-render the whole tower. */
const TowerRow = memo(function TowerRow({ row, driver, sessionBest, selected, onSelect, t }: RowProps) {
  const d = delta(row);
  const flash = row.prevPosition == null || row.prevPosition === row.position ? "" : row.position < row.prevPosition ? "pos-gain" : "pos-loss";
  const bestCls = row.bestLap != null && sessionBest != null && row.bestLap === sessionBest ? "rc-best-sb" : row.bestLap != null ? "rc-best-pb" : "";
  const colour = driver?.teamColour ?? "#8892a3";
  const acr = driver?.acronym ?? `#${row.number}`;
  const [s1, s2, s3] = row.sectors ?? [null, null, null];
  return (
    <tr
      className={`${flash}${selected ? " sel" : ""}${row.status === "retired" ? " is-ret" : ""}`}
      onClick={() => onSelect(row.number)}
      aria-label={acr}
    >
      <td className="rc-pos" style={{ borderLeftColor: colour }}>
        {row.position}
        {d && <DeltaIcon d={d} />}
      </td>
      <td className="rc-driver">
        <span className="num">{row.number}</span>
        {acr}
        {driver?.fullName && <span className="fname">{driver.fullName}</span>}
        {statusBadge(row, t)}
      </td>
      <td className="rc-mono">{row.position === 1 ? <span className="rc-gap-leader">{t("rc_leader")}</span> : (row.gapToLeader ?? "n/d")}</td>
      <td className="rc-mono r">{row.interval ?? "n/d"}</td>
      <td className="rc-mono r">{row.lastLap != null ? formatLapTime(row.lastLap) : "n/d"}</td>
      <td className={`rc-mono r ${bestCls}`}>{row.bestLap != null ? formatLapTime(row.bestLap) : "n/d"}</td>
      <td className="rc-mono r">
        <span className="rc-sector">{s1 != null ? formatLapTime(s1) : "–"}</span>{" "}
        <span className="rc-sector">{s2 != null ? formatLapTime(s2) : "–"}</span>{" "}
        <span className="rc-sector">{s3 != null ? formatLapTime(s3) : "–"}</span>
      </td>
      <td>
        {row.compound ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className={`tyre ${TYRE_LETTER[row.compound] ?? ""}`} aria-label={`${t("tyre")}: ${row.compound}`}>
              {TYRE_LETTER[row.compound] ?? "?"}
            </i>
            <span className="rc-mono" style={{ color: "var(--text-3)", fontSize: "0.76rem" }}>
              {row.tyreAge ?? "–"}
            </span>
          </span>
        ) : (
          <span className="rc-nd">n/d</span>
        )}
      </td>
      <td className="r"><span className="rc-pitn">{row.pitCount}</span></td>
    </tr>
  );
});

/** Compact mobile row — POS | PILOTA | GAP | GOMMA. */
const MobileRow = memo(function MobileRow({ row, driver, selected, onSelect, t }: RowProps) {
  const d = delta(row);
  const flash = row.prevPosition == null || row.prevPosition === row.position ? "" : row.position < row.prevPosition ? "pos-gain" : "pos-loss";
  const colour = driver?.teamColour ?? "#8892a3";
  const acr = driver?.acronym ?? `#${row.number}`;
  return (
    <div className={`rc-mrow ${flash}${selected ? " sel" : ""}`} onClick={() => onSelect(row.number)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(row.number); }} aria-label={acr}>
      <span className="rc-pos" style={{ borderLeftColor: colour }}>{row.position}</span>
      <span className="rc-driver">
        {acr}
        {d && <DeltaIcon d={d} />}
        {statusBadge(row, t)}
      </span>
      <span className="rc-mval">
        {row.compound && (
          <i className={`tyre ${TYRE_LETTER[row.compound] ?? ""}`} aria-label={`${t("tyre")}: ${row.compound}`}>
            {TYRE_LETTER[row.compound] ?? "?"}
          </i>
        )}
        <span className="rc-mono">{row.position === 1 ? t("rc_leader") : (row.gapToLeader ?? "n/d")}</span>
      </span>
    </div>
  );
});

interface Props {
  timing: TimingRow[];
  drivers: DriverEntry[];
  selected: number | null;
  onSelect: (num: number) => void;
  loading?: boolean;
}

export function TimingTower({ timing, drivers, selected, onSelect, loading }: Props) {
  const { t } = useSettings();
  const mobile = useIsMobile();
  const byNum = new Map(drivers.map((d) => [d.number, d]));
  const sessionBest = timing.reduce<number | null>(
    (m, r) => (r.bestLap != null && (m == null || r.bestLap < m) ? r.bestLap : m),
    null,
  );

  return (
    <section className="rc-tower" aria-label={t("live_positions")}>
      <div className="rc-tower-head">
        <h3><Timer aria-hidden="true" />{t("live_positions")}</h3>
        <span className="spacer" />
        <span className="rc-nd">{t("rc_tap_driver")}</span>
      </div>
      {loading ? (
        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={30} />)}
        </div>
      ) : timing.length === 0 ? (
        <p className="rc-nd" style={{ padding: "20px 16px" }}>{t("not_available")}</p>
      ) : mobile ? (
        <div>
          {timing.map((row) => (
            <MobileRow key={row.number} row={row} driver={byNum.get(row.number)} sessionBest={sessionBest} selected={selected === row.number} onSelect={onSelect} t={t} />
          ))}
        </div>
      ) : (
        <div className="rc-tower-scroll">
          <table className="rc-tbl">
            <thead>
              <tr>
                <th scope="col">{t("rc_pos_short")}</th>
                <th scope="col">{t("driver")}</th>
                <th scope="col">{t("gap")}</th>
                <th scope="col" className="r">{t("rc_int_short")}</th>
                <th scope="col" className="r">{t("rc_last_short")}</th>
                <th scope="col" className="r">{t("rc_best_short")}</th>
                <th scope="col" className="r">{t("rc_sectors_short")}</th>
                <th scope="col">{t("tyre")}</th>
                <th scope="col" className="r">{t("rc_pit_short")}</th>
              </tr>
            </thead>
            <tbody>
              {timing.map((row) => (
                <TowerRow key={row.number} row={row} driver={byNum.get(row.number)} sessionBest={sessionBest} selected={selected === row.number} onSelect={onSelect} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* Race Center core — unified race timeline: race control + pit stops +
   overtakes + fastest laps, with kind filters. Owned by the race-center
   core agent. */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ListOrdered } from "lucide-react";
import type { DriverEntry, LapEntry, OvertakeEvent, PitView, RaceControlEvent, RcSeverity } from "../../api/openf1model";
import type { DictKey } from "../../i18n/dict";
import { useSettings } from "../../store/settings";
import { acronymOf, formatLapTime, fmtTime, useDriverMap } from "./core-shared";
import "./core.css";

type Kind = "all" | "flag" | "sc" | "incident" | "penalty" | "pit" | "over" | "best";

const FILTERS: { id: Kind; key: DictKey }[] = [
  { id: "all", key: "rc_filter_all" },
  { id: "flag", key: "rc_filter_flags" },
  { id: "sc", key: "rc_filter_sc" },
  { id: "incident", key: "rc_filter_incidents" },
  { id: "penalty", key: "rc_filter_penalties" },
  { id: "pit", key: "rc_filter_pits" },
  { id: "over", key: "rc_filter_overtakes" },
  { id: "best", key: "rc_filter_fastest" },
];

interface Item {
  time: string;
  kind: Kind;
  sev: string;
  cat: string;
  msg: ReactNode;
  key: string;
}

interface Props {
  raceControl: RaceControlEvent[];
  pits: PitView[];
  overtakes: OvertakeEvent[];
  laps: Map<number, LapEntry[]>;
  drivers: DriverEntry[];
}

function rcKind(e: RaceControlEvent): Kind {
  const s: RcSeverity = e.severity;
  if (s === "sc") return "sc";
  if (s === "flag") return "flag";
  if (s === "incident") return "incident";
  if (s === "penalty") return "penalty";
  return "all";
}

export function UnifiedTimeline({ raceControl, pits, overtakes, laps, drivers }: Props) {
  const { t, lang } = useSettings();
  const [filter, setFilter] = useState<Kind>("all");
  const driverMap = useDriverMap(drivers);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const e of raceControl) {
      const k = rcKind(e);
      out.push({
        time: e.time, kind: k, sev: `sev-${e.severity}`, key: `rc-${e.time}-${e.message.slice(0, 24)}`,
        cat: `${e.driverNumber != null ? `${acronymOf(driverMap, e.driverNumber)} · ` : ""}${e.category}`,
        msg: e.message,
      });
    }
    for (const p of pits) {
      out.push({
        time: p.time, kind: "pit", sev: "sev-pit", key: `pit-${p.driver}-${p.time}`,
        cat: `${acronymOf(driverMap, p.driver)} · ${t("rc_pit_timeline")}`,
        msg: `${t("lap")} ${p.lap} — ${p.duration != null ? `${p.duration.toFixed(1)}s` : "n/d"}`,
      });
    }
    for (const o of overtakes) {
      out.push({
        time: o.time, kind: "over", sev: "sev-over", key: `ov-${o.overtakingDriver}-${o.time}`,
        cat: `${acronymOf(driverMap, o.overtakingDriver)} · ${t("rc_overtake")}`,
        msg: `P${o.position} — ${t("lap")} ${o.lap} · ${acronymOf(driverMap, o.overtakenDriver)}`,
      });
    }
    for (const [num, list] of laps) {
      for (const l of list) {
        if (!l.isSessionBest || l.duration == null) continue;
        out.push({
          time: "", kind: "best", sev: "sev-best", key: `best-${num}-${l.lap}`,
          cat: `${acronymOf(driverMap, num)} · ${t("rc_fastest_lap")}`,
          msg: `${t("lap")} ${l.lap} — ${formatLapTime(l.duration)}`,
        });
      }
    }
    // Fastest laps carry no API timestamp: order them by lap number after
    // everything else would be wrong; keep them grouped at the end instead.
    out.sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceControl, pits, overtakes, laps, driverMap, t]);

  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <section className="rc-panel" aria-label={t("rc_unified_timeline")}>
      <div className="rc-panel-head">
        <h3><ListOrdered aria-hidden="true" />{t("rc_unified_timeline")}</h3>
      </div>
      <div style={{ padding: "10px 14px 0" }}>
        <div className="rc-chips" role="tablist" aria-label={t("rc_unified_timeline")}>
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id}
              className={`rc-chip${filter === f.id ? " on" : ""}`} onClick={() => setFilter(f.id)}>
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>
      <div className="rc-tl-scroll">
        {shown.length === 0 ? (
          <p className="rc-nd" style={{ padding: "6px 14px" }}>{t("not_available")}</p>
        ) : (
          <div className="rc-tl" style={{ marginLeft: 14 }}>
            {shown.map((i, idx) => (
              <div className={`rc-tl-item ${i.sev}`} key={`${i.key}-${idx}`}>
                {i.time && <span className="rc-tl-time">{fmtTime(new Date(i.time), lang)}</span>}
                <span className="rc-tl-cat">{i.cat}</span>
                <p className="rc-tl-msg">{i.msg}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* Race Center core — race control timeline with severity filters and
   live auto-scroll (pauses when the user scrolls up). Owned by the
   race-center core agent. */
import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import type { DriverEntry, RaceControlEvent, RcSeverity } from "../../api/openf1model";
import type { DictKey } from "../../i18n/dict";
import { useSettings } from "../../store/settings";
import { acronymOf, fmtTime, useDriverMap } from "./core-shared";
import "./core.css";

type Filter = "all" | "flag" | "sc" | "incident" | "penalty";

const FILTERS: { id: Filter; key: DictKey; sev: RcSeverity | null }[] = [
  { id: "all", key: "rc_filter_all", sev: null },
  { id: "flag", key: "rc_filter_flags", sev: "flag" },
  { id: "sc", key: "rc_filter_sc", sev: "sc" },
  { id: "incident", key: "rc_filter_incidents", sev: "incident" },
  { id: "penalty", key: "rc_filter_penalties", sev: "penalty" },
];

interface Props {
  events: RaceControlEvent[];
  drivers: DriverEntry[];
  live: boolean;
}

export function RaceControlPanel({ events, drivers, live }: Props) {
  const { t, lang } = useSettings();
  const [filter, setFilter] = useState<Filter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const driverMap = useDriverMap(drivers);

  const sev = FILTERS.find((f) => f.id === filter)?.sev ?? null;
  const shown = sev ? events.filter((e) => e.severity === sev) : events;

  // Auto-scroll to the newest event while live, unless the user scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !live || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length, live, filter]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  return (
    <section className="rc-panel" aria-label={t("rc_race_control")}>
      <div className="rc-panel-head">
        <h3><Radio aria-hidden="true" />{t("rc_race_control")}</h3>
      </div>
      <div style={{ padding: "10px 14px 0" }}>
        <div className="rc-chips" role="tablist" aria-label={t("rc_race_control")}>
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id}
              className={`rc-chip${filter === f.id ? " on" : ""}`} onClick={() => setFilter(f.id)}>
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>
      <div className="rc-tl-scroll" ref={scrollRef} onScroll={onScroll} aria-live={live ? "polite" : undefined}>
        {shown.length === 0 ? (
          <p className="rc-nd" style={{ padding: "6px 14px" }}>{t("not_available")}</p>
        ) : (
          <div className="rc-tl" style={{ marginLeft: 14 }}>
            {shown.map((e, i) => (
              <div className={`rc-tl-item sev-${e.severity}`} key={`${e.time}-${i}`}>
                <span className="rc-tl-time">{fmtTime(new Date(e.time), lang)}</span>
                <span className="rc-tl-cat">
                  {e.driverNumber != null ? `${acronymOf(driverMap, e.driverNumber)} · ` : ""}{e.category}
                </span>
                <p className="rc-tl-msg">{e.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

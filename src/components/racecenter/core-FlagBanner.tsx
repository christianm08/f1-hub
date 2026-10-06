/* Race Center core — full-width flag/status banner driven by trackStatus.
   Lucide icons only, no emoji. Owned by the race-center core agent. */
import type { ReactNode } from "react";
import { AlertTriangle, CarFront, Flag, OctagonX } from "lucide-react";
import type { TrackStatus } from "../../api/openf1model";
import type { DictKey } from "../../i18n/dict";
import { useSettings } from "../../store/settings";
import "./core.css";

export function FlagBanner({ status }: { status: TrackStatus | null }) {
  const { t, lang } = useSettings();
  if (!status) return null;
  const s = status.status;
  const cfg: Record<string, { cls: string; icon: ReactNode; label: DictKey }> = {
    green: { cls: "green", icon: <Flag aria-hidden="true" />, label: "rc_flag_green" },
    yellow: { cls: "yellow", icon: <Flag aria-hidden="true" />, label: "rc_flag_yellow" },
    sc: { cls: "sc", icon: <CarFront aria-hidden="true" />, label: "rc_flag_sc" },
    vsc: { cls: "yellow", icon: <AlertTriangle aria-hidden="true" />, label: "rc_flag_vsc" },
    red: { cls: "red", icon: <OctagonX aria-hidden="true" />, label: "rc_flag_red" },
    finished: { cls: "finished", icon: <Flag aria-hidden="true" />, label: "rc_flag_finished" },
  };
  const c = cfg[s] ?? { cls: "unknown", icon: <Flag aria-hidden="true" />, label: "rc_flag_unknown" as DictKey };
  return (
    <div className={`rc-flag ${c.cls}`} role="status" aria-live="polite">
      {c.icon}
      <span>{t(c.label)}</span>
      {status.message && <small title={status.message}>{status.message}</small>}
      {status.since && (
        <small style={{ maxWidth: "none", marginLeft: 0 }}>
          {new Date(status.since).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}
        </small>
      )}
    </div>
  );
}

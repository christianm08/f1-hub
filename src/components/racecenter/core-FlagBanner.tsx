/* Race Center core — full-width flag/status banner driven by trackStatus.
   M3 semantic colours: red flag -> error, yellow/SC/VSC -> tertiary,
   green -> --rc-ok. No emoji, MIcon only. Owned by the race-center core agent. */
import type { TrackStatus } from "../../api/openf1model";
import type { DictKey } from "../../i18n/dict";
import { useSettings } from "../../store/settings";
import { MIcon, type MIconName } from "../../design";
import "./core.css";

export function FlagBanner({ status }: { status: TrackStatus | null }) {
  const { t, lang } = useSettings();
  if (!status) return null;
  const s = status.status;
  const cfg: Record<string, { cls: string; icon: MIconName; label: DictKey }> = {
    green: { cls: "green", icon: "flag", label: "rc_flag_green" },
    yellow: { cls: "yellow", icon: "flag", label: "rc_flag_yellow" },
    sc: { cls: "sc", icon: "directions_car", label: "rc_flag_sc" },
    vsc: { cls: "yellow", icon: "warning", label: "rc_flag_vsc" },
    red: { cls: "red", icon: "dangerous", label: "rc_flag_red" },
    finished: { cls: "finished", icon: "flag", label: "rc_flag_finished" },
  };
  const c = cfg[s] ?? { cls: "unknown", icon: "flag" as MIconName, label: "rc_flag_unknown" as DictKey };
  return (
    <div className={`rc-flag ${c.cls}`} role="status" aria-live="polite">
      <MIcon name={c.icon} />
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

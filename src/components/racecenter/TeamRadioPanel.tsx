/* ============================================================================
 * TeamRadioPanel — list of team radio recordings with audio playback.
 * Audio files live on the official F1 CDN; attribution "Audio: Formula 1 /
 * OpenF1" (TEAM_RADIO_ATTRIBUTION) is always shown next to playback.
 * Empty list -> honest "none available", never placeholders.
 * ========================================================================== */

import { useMemo } from "react";
import { Info, Radio, Volume2 } from "lucide-react";
import { useRaceCenterSession } from "../../api/openf1live";
import { TEAM_RADIO_ATTRIBUTION } from "../../api/openf1model";
import { ErrorState, Skeleton } from "../ui";
import { useAdv } from "./advStrings";
import "./advanced.css";

interface PanelProps {
  sessionKey: number;
  onSelectDriver?: (driverNumber: number) => void;
}

export function TeamRadioPanel({ sessionKey, onSelectDriver }: PanelProps) {
  const { t, lang } = useAdv();
  const { state, drivers, teamRadio, error, refresh } = useRaceCenterSession(sessionKey, {});

  const driverByNum = useMemo(() => new Map(drivers.map((d) => [d.number, d])), [drivers]);

  const items = useMemo(
    () =>
      [...teamRadio]
        .filter((r) => r.url)
        .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0)),
    [teamRadio],
  );

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString(lang === "it" ? "it-IT" : "en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  const head = (
    <div className="rcx-head">
      <h2 className="rcx-title"><Radio aria-hidden="true" />{t("rcx_radio_title")}</h2>
      {items.length > 0 && <span className="badge info">{items.length}</span>}
    </div>
  );

  if (state === "loading" || state === "idle") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_radio_title")}>
        {head}
        <Skeleton h={64} /><Skeleton h={64} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_radio_title")}>
        {head}
        <ErrorState onRetry={refresh} message={error ? `${t("rcx_error")}: ${error.message}` : t("rcx_error")} />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_radio_title")}>
        {head}
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_radio_empty")}</div>
      </section>
    );
  }

  return (
    <section className="card rcx-panel" aria-label={t("rcx_radio_title")}>
      {head}
      <div className="rcx-radio-list">
        {items.map((r, i) => {
          const d = driverByNum.get(r.driver);
          return (
            <div className="rcx-radio-item" key={`${r.time}-${r.driver}-${i}`}>
              <div className="rcx-radio-meta">
                <button
                  type="button"
                  className="rcx-radio-acr"
                  style={{ background: "none", border: 0, borderLeft: `3px solid ${d?.teamColour ?? "var(--accent)"}`, cursor: "pointer", color: "inherit", font: "inherit" }}
                  onClick={() => onSelectDriver?.(r.driver)}
                  title={d?.fullName ?? `#${r.driver}`}
                >
                  {d?.acronym ?? `#${r.driver}`}
                </button>
                <span className="rcx-radio-time">{fmtTime(r.time)}</span>
              </div>
              <audio controls preload="none" src={r.url} aria-label={`${d?.acronym ?? r.driver} — ${fmtTime(r.time)}`} />
            </div>
          );
        })}
      </div>
      <div className="rcx-credit"><Volume2 aria-hidden="true" />{TEAM_RADIO_ATTRIBUTION}</div>
    </section>
  );
}

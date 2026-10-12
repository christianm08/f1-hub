/* Shared UI primitives — adapters over the M3 design system (src/design/*).
   API-compatible with the previous version: existing pages keep working
   unchanged until they migrate to the M3 components directly.
   New code should import from "../design" instead. */
import type { ReactNode } from "react";
import { useSettings, type FavItem } from "../store/settings";
import {
  MSkeleton,
  MErrorState as M3ErrorState,
  MEmptyState as M3EmptyState,
  MIconButton,
  CountdownCells as M3CountdownCells,
  useCountdown,
  ToastProvider,
  useToast,
  type MIconName,
} from "../design";

export { useCountdown, ToastProvider, useToast };

export function Skeleton({ h = 20, w }: { h?: number; w?: string | number }) {
  return <MSkeleton height={h} width={w ?? "100%"} />;
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton h={18} w="60%" />
      <div style={{ height: 10 }} />
      <Skeleton h={14} />
      <div style={{ height: 8 }} />
      <Skeleton h={14} w="80%" />
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useSettings();
  return (
    <M3ErrorState
      title={t("error_title")}
      message={message ?? t("error_body")}
      retryLabel={t("retry")}
      onRetry={onRetry}
    />
  );
}

/** Accepts either an MIcon name (new) or a legacy ReactNode icon (old pages). */
export function EmptyState({ icon, title, body }: { icon?: ReactNode | MIconName; title: string; body?: string }) {
  if (typeof icon === "string") {
    return <M3EmptyState icon={icon as MIconName} title={title} body={body} />;
  }
  // legacy path: custom icon node (e.g. lucide) — kept until pages migrate
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Badge({ kind, children }: { kind?: "live" | "accent" | "done" | "warn" | "info"; children: ReactNode }) {
  return (
    <span className={`badge${kind ? " " + kind : ""}`}>
      {kind === "live" && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="spread mb">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function CountdownCells({ target }: { target: Date }) {
  const { t, lang } = useSettings();
  return (
    <M3CountdownCells
      target={target}
      variant="hero"
      ariaLabel={t("next_session")}
      daysLabel={lang === "it" ? "giorni" : "days"}
      hoursLabel={lang === "it" ? "ore" : "hrs"}
      minutesLabel={lang === "it" ? "min" : "min"}
      secondsLabel={lang === "it" ? "sec" : "sec"}
    />
  );
}

/* ---------- favorites ---------- */
export function FavButton({ item }: { item: FavItem }) {
  const { isFav, toggleFav, t } = useSettings();
  const active = isFav(item.kind, item.id);
  const { push } = useToast();
  return (
    <span className="fav-btn">
      <MIconButton
        icon="favorite"
        label={active ? t("removed_fav") : t("added_fav")}
        selected={active}
        variant={active ? "tonal" : "standard"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const added = toggleFav(item);
          push(added ? t("added_fav") : t("removed_fav"));
        }}
      />
    </span>
  );
}

/* ---------- date formatting ---------- */
export function fmtDateTime(d: Date, lang: string): string {
  return d.toLocaleString(lang === "it" ? "it-IT" : "en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDate(d: Date, lang: string): string {
  return d.toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/** "1:23.456" -> seconds; null-safe. */
export function qualiToSeconds(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/(?:(\d+):)?(\d+)\.(\d+)/);
  if (!m) return null;
  return (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseInt(m[2], 10) + parseInt(m[3], 10) / 1000;
}

/** Gap text for race results ("+2.307", "—" for leader, status for DNF). */
export function gapText(r: { positionText: string; status: string; Time?: { time: string } }): string {
  if (r.positionText === "1") return r.Time?.time ?? "—";
  if (r.status !== "Finished" && !/^\+\d+ Lap/.test(r.status)) return r.status;
  return r.Time?.time ?? r.status;
}

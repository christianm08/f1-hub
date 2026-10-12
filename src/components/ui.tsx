/* Shared UI primitives — adapters over the M3 design system (src/design/*).
   API-compatible with the previous version: Live.tsx and racecenter/*
   keep working unchanged while pages migrate to the M3 components directly.
   New code should import from "../design" instead. */
import type { ReactNode } from "react";
import { useSettings, type FavItem } from "../store/settings";
import {
  MCard,
  MEmptyState as M3EmptyState,
  MErrorState as M3ErrorState,
  MIconButton,
  MSkeleton,
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
    <MCard variant="outlined" aria-hidden="true">
      <Skeleton h={18} w="60%" />
      <div style={{ height: 10 }} />
      <Skeleton h={14} />
      <div style={{ height: 8 }} />
      <Skeleton h={14} w="80%" />
    </MCard>
  );
}

/** Hero-shaped shimmer skeleton (home / detail headers). */
export function SkeletonHero() {
  return (
    <div className="m3-hero" aria-hidden="true" style={{ marginBottom: 24 }}>
      <Skeleton h={20} w="34%" />
      <div style={{ height: 14 }} />
      <Skeleton h={36} w="72%" />
      <div style={{ height: 12 }} />
      <Skeleton h={16} w="52%" />
      <div style={{ height: 16 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton h={52} w={64} />
        <Skeleton h={52} w={64} />
        <Skeleton h={52} w={64} />
        <Skeleton h={52} w={64} />
      </div>
    </div>
  );
}

/** Table-shaped shimmer skeleton (standings / results / detail tables). */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="m3-table-wrap" aria-hidden="true">
      <div style={{ display: "grid", gap: 12, padding: 14 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} h={22} w={i % 4 === 3 ? "64%" : "100%"} />
        ))}
      </div>
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

/** Accepts either an MIcon name (new) or a legacy ReactNode icon (e.g. Live.tsx). */
export function EmptyState({ icon, title, body }: { icon?: ReactNode | MIconName; title: string; body?: string }) {
  if (typeof icon === "string") {
    return <M3EmptyState icon={icon as MIconName} title={title} body={body} />;
  }
  // legacy path: custom icon node — rendered with M3 empty-state styling
  return (
    <div className="m3-empty-legacy" role="status">
      {icon != null && <div className="m3-empty-legacy-icon" aria-hidden="true">{icon}</div>}
      <h3 className="m3-empty-legacy-title">{title}</h3>
      {body && <p className="m3-empty-legacy-body">{body}</p>}
    </div>
  );
}

/** Status pill (live/accent/done/warn/info). M3-styled; API unchanged. */
export function Badge({ kind, children }: { kind?: "live" | "accent" | "done" | "warn" | "info"; children: ReactNode }) {
  return (
    <span className={`m3-pill${kind ? ` m3-pill--${kind}` : ""}`}>
      {kind === "live" && <span className="m3-pill-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Page header: M3 headline + optional sub + right-side actions. API unchanged. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="m3-page-head">
      <div className="m3-page-head-text">
        <h1 className="m3-page-title">{title}</h1>
        {sub && <p className="m3-page-sub">{sub}</p>}
      </div>
      {right != null && <div className="m3-page-head-right">{right}</div>}
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

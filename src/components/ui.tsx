/* Shared UI primitives: skeletons, states, countdown, badges, favorites, toasts. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettings, type FavItem } from "../store/settings";

export function Skeleton({ h = 20, w }: { h?: number; w?: string | number }) {
  return <div className="skel" style={{ height: h, width: w ?? "100%" }} aria-hidden="true" />;
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
    <div className="state" role="alert">
      <div className="big" aria-hidden="true">⚠️</div>
      <h3>{t("error_title")}</h3>
      <p>{message ?? t("error_body")}</p>
      <button className="btn primary" onClick={onRetry}>{t("retry")}</button>
    </div>
  );
}

export function EmptyState({ icon = "🏁", title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <div className="state">
      <div className="big" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Badge({ kind, children }: { kind?: "live" | "accent" | "done" | "warn"; children: ReactNode }) {
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

/** Live countdown to a target date; calls onTick each second. */
export function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
    done: diff <= 0,
  };
}

export function CountdownCells({ target }: { target: Date }) {
  const cd = useCountdown(target);
  const { t, lang } = useSettings();
  if (!cd || cd.done) return null;
  const cells: [number, string][] = [
    [cd.d, lang === "it" ? "giorni" : "days"],
    [cd.h, lang === "it" ? "ore" : "hrs"],
    [cd.m, lang === "it" ? "min" : "min"],
    [cd.s, lang === "it" ? "sec" : "sec"],
  ];
  return (
    <div className="countdown" role="timer" aria-label={t("next_session")}>
      {cells.map(([v, l]) => (
        <div className="cd-cell" key={l}>
          <b>{String(v).padStart(2, "0")}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- favorites ---------- */
export function FavButton({ item }: { item: FavItem }) {
  const { isFav, toggleFav, t } = useSettings();
  const active = isFav(item.kind, item.id);
  const { push } = useToast();
  return (
    <button
      className="icon-btn fav-btn"
      aria-pressed={active}
      aria-label={active ? t("removed_fav") : t("added_fav")}
      title={active ? t("removed_fav") : t("added_fav")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggleFav(item);
        push(added ? t("added_fav") : t("removed_fav"));
      }}
    >
      <span aria-hidden="true">{active ? "❤️" : "🤍"}</span>
    </button>
  );
}

/* ---------- toasts ---------- */
const ToastCtx = createContext<{ push: (msg: string) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, msg }]);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 2600);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((i) => (
          <div className="toast" key={i.id}>{i.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
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

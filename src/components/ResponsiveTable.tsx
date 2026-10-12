/* Responsive tables: real desktop <table> on >=900px, native mobile list below.
   Never compress a wide table into a phone — render a purpose-built variant.
   M3 Expressive styling: high-density desktop table, list-style mobile rows. */
import { useState, type ReactNode } from "react";
import { MDivider, MIcon, MIconButton } from "../design";
import { useSettings } from "../store/settings";

export interface MobileRow {
  key: string;
  /** left slot: position badge etc. */
  left?: ReactNode;
  /** main title (may contain a Link); truncated with ellipsis. */
  title: ReactNode;
  /** secondary line under the title. */
  subtitle?: ReactNode;
  /** right-aligned primary value (points, gap, time). */
  value?: ReactNode;
  /** extra info revealed by the expander (secondary columns). */
  details?: ReactNode;
  /** extra class on the row (e.g. "leader"). */
  rowClass?: string;
}

/** One expandable row list for phones. All tap targets >= 48px. */
export function MobileTable({ rows }: { rows: MobileRow[] }) {
  const { t } = useSettings();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="m3-mtable" role="list">
      {rows.map((r, i) => {
        const isOpen = open.has(r.key);
        return (
          <div key={r.key}>
            <div
              role="listitem"
              className={`m3-mtable-row${r.rowClass ? ` ${r.rowClass}` : ""}${isOpen ? " open" : ""}`}
            >
              <div className="m3-mtable-main">
                {r.left != null && <span className="m3-mtable-left">{r.left}</span>}
                <span className="m3-mtable-title">
                  <span className="m3-mtable-title-text">{r.title}</span>
                  {r.subtitle != null && <span className="m3-mtable-sub">{r.subtitle}</span>}
                </span>
                {r.value != null && <span className="m3-mtable-value num">{r.value}</span>}
                {r.details != null && (
                  <MIconButton
                    icon={isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                    label={isOpen ? t("show_less") : t("show_more")}
                    aria-expanded={isOpen}
                    onClick={() => toggle(r.key)}
                  />
                )}
              </div>
              {r.details != null && isOpen && (
                <div className="m3-mtable-details">{r.details}</div>
              )}
            </div>
            {i < rows.length - 1 && <MDivider />}
          </div>
        );
      })}
    </div>
  );
}

/** Label/value rows for the expandable area of a mobile row. */
export function MDetails({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="m3-mtable-kv">
      {items.map((it, i) => (
        <div className="m3-mtable-kv-row" key={i}>
          <dt>{it.label}</dt>
          <dd className="num">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Wrapper: renders `desktop` on >=900px, `mobile` below. */
export function ResponsiveTable({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  return (
    <>
      <div className="rt-desktop">{desktop}</div>
      <div className="rt-mobile">{mobile}</div>
    </>
  );
}

/** M3 high-density data table shell for the desktop variant. */
export function MTable({
  head,
  children,
  ariaLabel,
}: {
  head: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="m3-table-wrap">
      <table className="m3-table" aria-label={ariaLabel}>
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Team color dot used in table cells. */
export function TeamDot({ color, label }: { color: string; label?: string }) {
  return (
    <span
      className="m3-team-dot"
      style={{ background: color }}
      aria-hidden={label === undefined}
      aria-label={label}
    />
  );
}

/** Leader-position highlight icon (trophy) — decorative. */
export function LeaderMark() {
  return <MIcon name="trophy" size={16} className="m3-leader-mark" />;
}

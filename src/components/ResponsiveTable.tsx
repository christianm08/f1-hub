/* Responsive tables: real desktop <table> on >=900px, native mobile list below.
   Never compress a wide table into a phone — render a purpose-built variant. */
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
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

/** One expandable row list for phones. All tap targets >= 44px. */
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
    <div className="mtable" role="list">
      {rows.map((r) => {
        const isOpen = open.has(r.key);
        return (
          <div key={r.key} role="listitem" className={`mtable-row${r.rowClass ? ` ${r.rowClass}` : ""}${isOpen ? " open" : ""}`}>
            <div className="mtable-main">
              {r.left != null && <span className="mtable-left">{r.left}</span>}
              <span className="mtable-title">
                <span className="mtable-title-text">{r.title}</span>
                {r.subtitle != null && <span className="mtable-sub">{r.subtitle}</span>}
              </span>
              {r.value != null && <span className="mtable-value num">{r.value}</span>}
              {r.details != null && (
                <button
                  type="button"
                  className="mtable-expand"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? t("show_less") : t("show_more")}
                  onClick={() => toggle(r.key)}
                >
                  <ChevronDown aria-hidden="true" />
                </button>
              )}
            </div>
            {r.details != null && isOpen && (
              <div className="mtable-details">{r.details}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Label/value rows for the expandable area of a mobile row. */
export function MDetails({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="mtable-kv">
      {items.map((it, i) => (
        <div className="mtable-kv-row" key={i}>
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

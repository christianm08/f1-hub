/* F1 Hub — Material 3 Expressive shared component library.
   Single visual source of truth. All components:
   - consume only --md-sys-* tokens (design/tokens.css)
   - have hover / focus-visible / pressed / selected / disabled states
   - honor >=48dp touch targets and prefers-reduced-motion
   - use correct ARIA roles; overlays are portaled to document.body
   (position:fixed breaks inside transformed ancestors).
   Icons: only <MIcon> (Material Symbols) — never emoji. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { MIcon, type MIconName } from "./icons";
import "./components.css";

const canUseDOM = typeof document !== "undefined";

/* ------------------------------------------------------------------ */
/* hooks & helpers                                                     */
/* ------------------------------------------------------------------ */

/** Live countdown to a target date; ticks every second. Kept from ui.tsx. */
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

/** Lock body scroll while an overlay is open; restores on cleanup. */
function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked || !canUseDOM) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/** Close on Escape. */
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open || !canUseDOM) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/** Keep keyboard focus inside `ref` while open; restore focus on close. */
function useFocusTrap(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open || !canUseDOM) return;
    const el = ref.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => n.offsetParent !== null);
    const first = focusables()[0];
    (first ?? el).focus?.();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, ref]);
}

/* ------------------------------------------------------------------ */
/* MButton                                                             */
/* ------------------------------------------------------------------ */

export type MButtonVariant = "filled" | "tonal" | "outlined" | "text";

export interface MButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: MButtonVariant;
  icon?: MIconName;
  trailingIcon?: MIconName;
  small?: boolean;
  /** Render as a link instead of a button. */
  href?: string;
  children: ReactNode;
}

/** M3 Expressive button. 48dp min touch target, full-radius, state layers. */
export function MButton({
  variant = "filled",
  icon,
  trailingIcon,
  small = false,
  href,
  children,
  className,
  type = "button",
  ...rest
}: MButtonProps) {
  const cls = ["m3-btn", `m3-btn--${variant}`, small ? "m3-btn--sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <>
      {icon && <MIcon name={icon} size={20} aria-hidden />}
      <span className="m3-btn__label">{children}</span>
      {trailingIcon && <MIcon name={trailingIcon} size={20} aria-hidden />}
    </>
  );
  if (href !== undefined) {
    return (
      <a href={href} className={cls} {...(rest as object)}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* MIconButton                                                         */
/* ------------------------------------------------------------------ */

export type MIconButtonVariant = "standard" | "filled" | "tonal" | "outlined";

export interface MIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: MIconName;
  /** Accessible label (required for icon-only buttons). */
  label: string;
  variant?: MIconButtonVariant;
  /** Toggle behavior: `selected` controls pressed state (aria-pressed). */
  selected?: boolean;
  filledIcon?: boolean;
}

/** M3 icon button — always 48x48. Use `selected` for toggle semantics. */
export function MIconButton({
  icon,
  label,
  variant = "standard",
  selected = false,
  filledIcon,
  className,
  type = "button",
  ...rest
}: MIconButtonProps) {
  const cls = [
    "m3-icon-btn",
    `m3-icon-btn--${variant}`,
    selected ? "m3-icon-btn--selected" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      className={cls}
      aria-label={label}
      title={label}
      aria-pressed={selected || undefined}
      {...rest}
    >
      <MIcon name={icon} filled={filledIcon ?? selected} aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* MCard                                                               */
/* ------------------------------------------------------------------ */

export type MCardVariant = "elevated" | "filled" | "outlined";

export interface MCardProps {
  variant?: MCardVariant;
  /** Expressive asymmetric corners for hero/large cards. */
  expressive?: boolean;
  /** Makes the whole card clickable (keyboard accessible). */
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** M3 card. Clickable cards get a state layer + keyboard activation. */
export function MCard({
  variant = "elevated",
  expressive = false,
  onClick,
  href,
  ariaLabel,
  className,
  style,
  children,
}: MCardProps) {
  const cls = [
    "m3-card",
    `m3-card--${variant}`,
    expressive ? "m3-card--expressive" : "",
    onClick || href ? "m3-card--clickable" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  if (href !== undefined) {
    return (
      <a href={href} className={cls} style={style} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <div
        className={cls}
        style={style}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MChip                                                               */
/* ------------------------------------------------------------------ */

export type MChipVariant = "assist" | "filter" | "input" | "suggestion";

export interface MChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: MChipVariant;
  selected?: boolean;
  leadingIcon?: MIconName;
  /** input chips: shows a remove affordance. */
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
}

/** M3 chip. Filter chips expose aria-pressed; visual 40dp with 48dp hit area. */
export function MChip({
  variant = "assist",
  selected = false,
  leadingIcon,
  onRemove,
  removeLabel = "Rimuovi",
  children,
  className,
  type = "button",
  ...rest
}: MChipProps) {
  const cls = ["m3-chip", `m3-chip--${variant}`, selected ? "m3-chip--selected" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  const label = (
    <>
      {variant === "filter" && selected ? (
        <MIcon name="check" aria-hidden />
      ) : (
        leadingIcon && <MIcon name={leadingIcon} aria-hidden />
      )}
      <span>{children}</span>
    </>
  );
  if (onRemove) {
    // input chip: label button + separate remove button (never nested interactives)
    return (
      <span className={`${cls} m3-chip--with-remove`} role="group">
        <button
          type={type}
          className="m3-chip__main"
          aria-pressed={variant === "filter" ? selected : undefined}
          {...rest}
        >
          {label}
        </button>
        <button
          type="button"
          className="m3-chip__remove"
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <MIcon name="close" aria-hidden />
        </button>
      </span>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      aria-pressed={variant === "filter" ? selected : undefined}
      {...rest}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* navigation                                                          */
/* ------------------------------------------------------------------ */

export interface MNavItem {
  key: string;
  icon: MIconName;
  /** Filled icon shown when active; falls back to `icon`. */
  activeIcon?: MIconName;
  label: string;
  /** Badge content shown on the destination (count or dot). */
  badge?: string | number | boolean;
  disabled?: boolean;
}

export interface MNavProps {
  items: MNavItem[];
  /** Controlled active key. When omitted, each item uses its own onSelect. */
  value?: string;
  onChange?: (key: string) => void;
  /** Per-item select handler (uncontrolled mode). */
  onSelect?: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}

function MNavDestination({
  item,
  active,
  onSelect,
}: {
  item: MNavItem;
  active: boolean;
  onSelect?: () => void;
}) {
  const iconName = active && item.activeIcon ? item.activeIcon : item.icon;
  return (
    <button
      type="button"
      className={["m3-nav-dest", active ? "m3-nav-dest--active" : ""].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
      disabled={item.disabled}
    >
      <span className="m3-nav-dest__pill">
        <MIcon name={iconName} filled={active} aria-hidden />
        {item.badge !== undefined && item.badge !== false && (
          <span className="m3-nav-dest__badge">
            <MBadge label={typeof item.badge === "boolean" ? undefined : item.badge} dot={typeof item.badge === "boolean"} standalone />
          </span>
        )}
      </span>
      <span>{item.label}</span>
    </button>
  );
}

function navState(props: MNavProps, item: MNavItem): { active: boolean; onSelect: () => void } {
  const active = props.value !== undefined ? props.value === item.key : false;
  const onSelect = () => {
    if (props.value !== undefined) props.onChange?.(item.key);
    else props.onSelect?.(item.key);
  };
  return { active, onSelect };
}

/** M3 navigation rail (desktop/tablet). Hidden on mobile (<=600px). */
export function MNavRail({ items, ariaLabel = "Navigazione principale", className, ...rest }: MNavProps) {
  const props: MNavProps = { items, ...rest };
  return (
    <nav className={["m3-nav-rail", className ?? ""].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {items.map((item) => {
        const { active, onSelect } = navState(props, item);
        return <MNavDestination key={item.key} item={item} active={active} onSelect={onSelect} />;
      })}
    </nav>
  );
}

/** M3 navigation bar (mobile bottom). Hidden on >=601px. Fixed bottom, portaled-safe (no transform ancestors). */
export function MNavBar({ items, ariaLabel = "Navigazione principale", className, ...rest }: MNavProps) {
  const props: MNavProps = { items, ...rest };
  return (
    <nav className={["m3-nav-bar", className ?? ""].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {items.map((item) => {
        const { active, onSelect } = navState(props, item);
        return <MNavDestination key={item.key} item={item} active={active} onSelect={onSelect} />;
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* MTopAppBar                                                          */
/* ------------------------------------------------------------------ */

export interface MTopAppBarProps {
  variant?: "small" | "center-aligned";
  title: ReactNode;
  /** Leading slot (usually a nav MIconButton). */
  leading?: ReactNode;
  /** Trailing actions. */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** M3 top app bar: 64dp, sticky, surface-container. */
export function MTopAppBar({ variant = "small", title, leading, actions, className, style }: MTopAppBarProps) {
  return (
    <header
      className={["m3-top-app-bar", variant === "center-aligned" ? "m3-top-app-bar--center" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {leading}
      <h1 className="m3-top-app-bar__title">{title}</h1>
      {actions && <div className="m3-top-app-bar__actions">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* MTabs                                                               */
/* ------------------------------------------------------------------ */

export interface MTab {
  key: string;
  label: string;
  icon?: MIconName;
  disabled?: boolean;
}

export interface MTabsProps {
  tabs: MTab[];
  value: string;
  onChange: (key: string) => void;
  variant?: "primary" | "secondary";
  ariaLabel?: string;
  className?: string;
}

/** M3 tabs with animated active indicator + arrow-key navigation. */
export function MTabs({ tabs, value, onChange, variant = "primary", ariaLabel, className }: MTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = tabs.filter((t) => !t.disabled);
    const idx = enabled.findIndex((t) => t.key === value);
    const next = e.key === "ArrowRight" ? (idx + 1) % enabled.length : (idx - 1 + enabled.length) % enabled.length;
    const target = enabled[next];
    if (target) {
      onChange(target.key);
      listRef.current?.querySelector<HTMLElement>(`[data-tab="${target.key}"]`)?.focus();
    }
  };
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={["m3-tabs", variant === "secondary" ? "m3-tabs--secondary" : "", className ?? ""].filter(Boolean).join(" ")}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          data-tab={t.key}
          aria-selected={value === t.key}
          tabIndex={value === t.key ? 0 : -1}
          disabled={t.disabled}
          className={["m3-tab", value === t.key ? "m3-tab--active" : ""].filter(Boolean).join(" ")}
          onClick={() => onChange(t.key)}
        >
          {t.icon && <MIcon name={t.icon} aria-hidden />}
          <span>{t.label}</span>
          <span className="m3-tab__indicator" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MSegmentedButton                                                    */
/* ------------------------------------------------------------------ */

export interface MSegmentedOption {
  value: string;
  label: string;
  icon?: MIconName;
  disabled?: boolean;
}

export interface MSegmentedButtonProps {
  options: MSegmentedOption[];
  /** Single value, or array when `multi`. */
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  ariaLabel?: string;
  className?: string;
  density?: "default" | "compact";
}

/** M3 segmented button. Single-select uses radiogroup semantics. */
export function MSegmentedButton({
  options,
  value,
  onChange,
  multi = false,
  ariaLabel,
  className,
}: MSegmentedButtonProps) {
  const isSelected = (v: string) => (multi ? (value as string[]).includes(v) : value === v);
  const toggle = (v: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  };
  return (
    <div
      className={["m3-seg", className ?? ""].filter(Boolean).join(" ")}
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const sel = isSelected(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={["m3-seg-btn", sel ? "m3-seg-btn--selected" : ""].filter(Boolean).join(" ")}
            role={multi ? undefined : "radio"}
            aria-checked={multi ? undefined : sel}
            aria-pressed={multi ? sel : undefined}
            disabled={o.disabled}
            onClick={() => toggle(o.value)}
          >
            {sel ? <MIcon name="check" aria-hidden /> : o.icon ? <MIcon name={o.icon} aria-hidden /> : null}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MSearchBar                                                          */
/* ------------------------------------------------------------------ */

export interface MSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  label?: string;
  /** Leading icon button (default: search, decorative unless onLeadingClick). */
  leadingIcon?: MIconName;
  onLeadingClick?: () => void;
  leadingLabel?: string;
  /** Trailing slot (e.g. clear button, avatar). */
  trailing?: ReactNode;
  className?: string;
  id?: string;
}

/** M3 search bar: 56dp rounded-full field, role=search. */
export function MSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  leadingIcon = "search",
  onLeadingClick,
  leadingLabel = "Cerca",
  trailing,
  className,
  id,
}: MSearchBarProps) {
  const inputId = useId();
  return (
    <form
      role="search"
      aria-label={label ?? placeholder ?? "Ricerca"}
      className={["m3-search", className ?? ""].filter(Boolean).join(" ")}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      {onLeadingClick ? (
        <MIconButton icon={leadingIcon} label={leadingLabel} onClick={onLeadingClick} />
      ) : (
        <span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, color: "var(--md-sys-color-on-surface-variant)" }} aria-hidden>
          <MIcon name={leadingIcon} />
        </span>
      )}
      <input
        id={id ?? inputId}
        type="search"
        className="m3-search__input"
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {trailing}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* MTextField                                                          */
/* ------------------------------------------------------------------ */

export interface MTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: MIconName;
  trailingIcon?: MIconName;
  onTrailingClick?: () => void;
  trailingLabel?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  id?: string;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}

/** M3 outlined text field with floating label. */
export function MTextField({
  label,
  value,
  onChange,
  type = "text",
  error,
  helperText,
  leadingIcon,
  trailingIcon,
  onTrailingClick,
  trailingLabel,
  disabled,
  required,
  multiline,
  rows = 3,
  id,
  name,
  autoComplete,
  placeholder = " ",
  className,
}: MTextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const supportId = `${fieldId}-support`;
  const support = error ?? helperText;
  const cls = [
    "m3-field",
    error ? "m3-field--error" : "",
    value ? "m3-field--has-value" : "",
    leadingIcon ? "m3-field--with-leading" : "",
    trailingIcon || onTrailingClick ? "m3-field--with-trailing" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const shared = {
    id: fieldId,
    className: "m3-field__input",
    value,
    placeholder,
    disabled,
    required,
    name,
    autoComplete,
    "aria-describedby": support ? supportId : undefined,
    "aria-invalid": error ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  return (
    <div className={cls}>
      <div className="m3-field__wrap">
        {leadingIcon && (
          <span className="m3-field__leading" aria-hidden>
            <MIcon name={leadingIcon} />
          </span>
        )}
        {multiline ? (
          <textarea rows={rows} {...shared} />
        ) : (
          <input type={type} {...shared} />
        )}
        <label className="m3-field__label" htmlFor={fieldId}>
          {label}
          {required ? " *" : ""}
        </label>
        {(trailingIcon || onTrailingClick) && (
          <span className="m3-field__trailing">
            {onTrailingClick && trailingIcon ? (
              <MIconButton icon={trailingIcon} label={trailingLabel ?? label} onClick={onTrailingClick} />
            ) : trailingIcon ? (
              <MIcon name={trailingIcon} aria-hidden />
            ) : null}
          </span>
        )}
      </div>
      {support && (
        <span id={supportId} className="m3-field__support" role={error ? "alert" : undefined}>
          {support}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MMenu (portaled)                                                    */
/* ------------------------------------------------------------------ */

export interface MMenuItemProps {
  label: string;
  supportingText?: string;
  icon?: MIconName;
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

/** Item for <MMenu>. */
export function MMenuItem({ label, supportingText, icon, trailing, selected, disabled, onSelect }: MMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-checked={selected || undefined}
      className={["m3-menu-item", selected ? "m3-menu-item--selected" : ""].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onSelect}
    >
      {icon && <MIcon name={icon} aria-hidden />}
      <span className="m3-menu-item__text">
        {label}
        {supportingText && <span className="m3-menu-item__support">{supportingText}</span>}
      </span>
      {selected && <MIcon name="check" aria-hidden />}
      {trailing}
    </button>
  );
}

export interface MMenuProps {
  open: boolean;
  onClose: () => void;
  /** Element the menu anchors to (positioned below it, flips when needed). */
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  ariaLabel?: string;
  minWidth?: number;
}

/** M3 menu, portaled to document.body. Closes on scrim click / Escape. */
export function MMenu({ open, onClose, anchorRef, children, ariaLabel, minWidth }: MMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: minWidth ?? 280 });
  useEscape(open, onClose);
  useLayoutEffect(() => {
    if (!open || !canUseDOM) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 320;
      const w = Math.max(minWidth ?? 280, r.width);
      let left = Math.min(r.left, window.innerWidth - w - 8);
      left = Math.max(8, left);
      const below = r.bottom + 8 + menuH <= window.innerHeight - 8;
      const top = below ? r.bottom + 8 : Math.max(8, r.top - 8 - menuH);
      setPos({ top, left, width: w });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, minWidth]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>(".m3-menu-item:not([disabled])")?.focus();
  }, [open ]);

  if (!open || !canUseDOM) return null;
  return createPortal(
    <>
      <button type="button" aria-label="Chiudi menu" className="m3-menu-scrim" onClick={onClose} tabIndex={-1} />
      <div
        ref={menuRef}
        role="menu"
        aria-label={ariaLabel}
        className="m3-menu"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* MSelect                                                             */
/* ------------------------------------------------------------------ */

export interface MSelectOption {
  value: string;
  label: string;
  icon?: MIconName;
  supportingText?: string;
}

export interface MSelectProps {
  label: string;
  value: string;
  options: MSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  leadingIcon?: MIconName;
  className?: string;
}

/** M3 select: button trigger + portaled menu. */
export function MSelect({ label, value, options, onChange, disabled, leadingIcon, className }: MSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={["m3-select", className ?? ""].filter(Boolean).join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {leadingIcon && <MIcon name={leadingIcon} aria-hidden />}
        <span className="m3-select__label">{selected ? selected.label : label}</span>
        <MIcon name="keyboard_arrow_down" aria-hidden />
      </button>
      <MMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} ariaLabel={label}>
        {options.map((o) => (
          <MMenuItem
            key={o.value}
            label={o.label}
            supportingText={o.supportingText}
            icon={o.icon}
            selected={o.value === value}
            onSelect={() => {
              onChange(o.value);
              setOpen(false);
              anchorRef.current?.focus();
            }}
          />
        ))}
      </MMenu>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MDialog (portaled)                                                  */
/* ------------------------------------------------------------------ */

export interface MDialogProps {
  open: boolean;
  onClose: () => void;
  headline: ReactNode;
  icon?: MIconName;
  children?: ReactNode;
  /** Action buttons (usually MButton text variants). */
  actions?: ReactNode;
  /** Clicking the scrim dismisses. Default true. */
  dismissible?: boolean;
  className?: string;
}

/** M3 basic dialog: portaled, scrim, Escape, focus trap, focus restore. */
export function MDialog({
  open,
  onClose,
  headline,
  icon,
  children,
  actions,
  dismissible = true,
  className,
}: MDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscape(open, () => dismissible && onClose());
  useLockBody(open);
  useFocusTrap(dialogRef, open);
  if (!open || !canUseDOM) return null;
  return createPortal(
    <>
      <button
        type="button"
        className="m3-dialog-scrim"
        aria-label="Chiudi finestra di dialogo"
        tabIndex={-1}
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof headline === "string" ? headline : undefined}
        tabIndex={-1}
        className={["m3-dialog", icon ? "" : "m3-dialog--no-icon", className ?? ""].filter(Boolean).join(" ")}
      >
        {icon && (
          <div className="m3-dialog__icon" aria-hidden>
            <MIcon name={icon} />
          </div>
        )}
        <h2 className="m3-dialog__headline">{headline}</h2>
        {children && <div className="m3-dialog__body">{children}</div>}
        {actions && <div className="m3-dialog__actions">{actions}</div>}
      </div>
    </>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* MBottomSheet (portaled)                                             */
/* ------------------------------------------------------------------ */

export interface MBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Show the X close button. Default true. */
  showClose?: boolean;
  className?: string;
}

/** M3 modal bottom sheet: portaled, drag handle (drag down to dismiss), Escape. */
export function MBottomSheet({ open, onClose, title, children, showClose = true, className }: MBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; dy: number } | null>(null);
  useEscape(open, onClose);
  useLockBody(open);
  useFocusTrap(sheetRef, open);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragState.current = { startY: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st || !sheetRef.current) return;
    st.dy = Math.max(0, e.clientY - st.startY);
    sheetRef.current.style.transform = `translateY(${st.dy}px)`;
    sheetRef.current.style.transition = "none";
  };
  const endDrag = () => {
    const st = dragState.current;
    dragState.current = null;
    if (!sheetRef.current) return;
    sheetRef.current.style.transition = "";
    sheetRef.current.style.transform = "";
    if (st && st.dy > 120) onClose();
  };

  if (!open || !canUseDOM) return null;
  return createPortal(
    <>
      <button type="button" className="m3-sheet-scrim" aria-label="Chiudi pannello" tabIndex={-1} onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={["m3-sheet", className ?? ""].filter(Boolean).join(" ")}
      >
        <div
          className="m3-sheet__handle"
          role="button"
          tabIndex={0}
          aria-label="Trascina per chiudere"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") onClose();
          }}
        />
        {showClose && (
          <div className="m3-sheet__close">
            <MIconButton icon="close" label="Chiudi" onClick={onClose} />
          </div>
        )}
        {title && <h2 className="m3-sheet__title">{title}</h2>}
        <div className="m3-sheet__body">{children}</div>
      </div>
    </>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* progress indicators                                                 */
/* ------------------------------------------------------------------ */

export interface MLinearProgressProps {
  /** 0-100. Omit for indeterminate. */
  value?: number;
  label?: string;
  className?: string;
}

/** M3 linear progress indicator. */
export function MLinearProgress({ value, label, className }: MLinearProgressProps) {
  const determinate = value !== undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className={["m3-linear-progress", determinate ? "" : "m3-linear-progress--indeterminate", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="m3-linear-progress__bar" style={determinate ? { width: `${Math.min(100, Math.max(0, value))}%` } : undefined} />
      {!determinate && <div className="m3-linear-progress__bar" aria-hidden />}
    </div>
  );
}

export interface MCircularProgressProps {
  /** 0-100. Omit for indeterminate. */
  value?: number;
  size?: number;
  label?: string;
  className?: string;
}

/** M3 circular progress indicator. */
export function MCircularProgress({ value, size = 48, label, className }: MCircularProgressProps) {
  const determinate = value !== undefined;
  const r = 20;
  const c = 2 * Math.PI * r;
  const frac = determinate ? Math.min(1, Math.max(0, value! / 100)) : 0.25;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value!) : undefined}
      className={["m3-circular-progress", className ?? ""].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" aria-hidden>
        <circle className="m3-circular-progress__track" cx="24" cy="24" r={r} fill="none" strokeWidth="4" />
        <circle
          className="m3-circular-progress__arc"
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={determinate ? c * (1 - frac) : c * (1 - frac)}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* MSnackbar (portaled)                                                */
/* ------------------------------------------------------------------ */

export interface MSnackbarProps {
  open: boolean;
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  /** Auto-dismiss after ms. Default 4000; 0 disables. */
  durationMs?: number;
  closeLabel?: string;
  icon?: MIconName;
}

/** M3 snackbar: portaled bottom, inverse-surface, optional action. */
export function MSnackbar({
  open,
  message,
  actionLabel,
  onAction,
  onClose,
  durationMs = 4000,
  closeLabel = "Chiudi",
  icon,
}: MSnackbarProps) {
  useEscape(open, onClose);
  useEffect(() => {
    if (!open || !durationMs) return;
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [open, durationMs, onClose]);
  if (!open || !canUseDOM) return null;
  return createPortal(
    <div role="status" className="m3-snackbar">
      {icon && <MIcon name={icon} aria-hidden />}
      <span className="m3-snackbar__msg">{message}</span>
      {actionLabel && (
        <button type="button" className="m3-snackbar__action" onClick={() => { onAction?.(); onClose(); }}>
          {actionLabel}
        </button>
      )}
      <MIconButton icon="close" label={closeLabel} onClick={onClose} className="m3-snackbar__close" />
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* MList / MListItem / MDivider                                        */
/* ------------------------------------------------------------------ */

export interface MListProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** M3 list container. */
export function MList({ children, className, ariaLabel }: MListProps) {
  return (
    <ul className={["m3-list", className ?? ""].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {children}
    </ul>
  );
}

export interface MListItemProps {
  headline: ReactNode;
  supportingText?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Makes the row clickable (keyboard accessible). */
  onClick?: () => void;
  href?: string;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

/** M3 list item: 56dp one-line, 72dp two-line. */
export function MListItem({
  headline,
  supportingText,
  leading,
  trailing,
  onClick,
  href,
  selected = false,
  disabled = false,
  className,
}: MListItemProps) {
  const lines = supportingText ? "m3-list-item--two-line" : "";
  const cls = [
    "m3-list-item",
    lines,
    onClick || href ? "m3-list-item--clickable" : "",
    selected ? "m3-list-item--selected" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <>
      {leading && <span className="m3-list-item__leading">{leading}</span>}
      <span className="m3-list-item__body">
        <span className="m3-list-item__headline">{headline}</span>
        {supportingText && <span className="m3-list-item__support">{supportingText}</span>}
      </span>
      {trailing && <span className="m3-list-item__trailing">{trailing}</span>}
    </>
  );
  if (href !== undefined && !disabled) {
    return (
      <li>
        <a href={href} className={cls} aria-current={selected ? "page" : undefined}>
          {inner}
        </a>
      </li>
    );
  }
  if (onClick && !disabled) {
    return (
      <li>
        <button type="button" className={cls} onClick={onClick}>
          {inner}
        </button>
      </li>
    );
  }
  return <li className={cls} aria-disabled={disabled || undefined}>{inner}</li>;
}

/** M3 divider. */
export function MDivider({ inset = false, className }: { inset?: boolean; className?: string }) {
  return <hr className={["m3-divider", inset ? "m3-divider--inset" : "", className ?? ""].filter(Boolean).join(" ")} />;
}

/* ------------------------------------------------------------------ */
/* MTooltip (portaled)                                                 */
/* ------------------------------------------------------------------ */

export interface MTooltipProps {
  label: string;
  children: ReactNode;
  /** Delay before showing on hover. Default 400ms. */
  delayMs?: number;
}

/** M3 plain tooltip: portaled, shows on hover/focus, never on touch-hold. */
export function MTooltip({ label, children, delayMs = 400 }: MTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  const show = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = anchorRef.current;
      if (!el || !canUseDOM) return;
      const r = el.getBoundingClientRect();
      const top = Math.max(8, r.top - 40);
      const left = Math.min(Math.max(8, r.left + r.width / 2 - 60), window.innerWidth - 130);
      setPos({ top, left });
      setVisible(true);
    }, delayMs);
  };
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <>
      <span
        ref={anchorRef}
        className="m3-tooltip-anchor"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && canUseDOM
        ? createPortal(
            <div role="tooltip" className="m3-tooltip" style={{ top: pos.top, left: pos.left }}>
              {label}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MSkeleton / MEmptyState / MErrorState / MBadge                      */
/* ------------------------------------------------------------------ */

export interface MSkeletonProps {
  height?: number | string;
  width?: number | string;
  radius?: string | number;
  className?: string;
  style?: CSSProperties;
}

/** Shimmer placeholder (aria-hidden). */
export function MSkeleton({ height = 20, width = "100%", radius, className, style }: MSkeletonProps) {
  return (
    <div
      className={["m3-skel", className ?? ""].filter(Boolean).join(" ")}
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export interface MEmptyStateProps {
  icon?: MIconName;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

/** Centered empty state. */
export function MEmptyState({ icon = "search_off", title, body, action, className }: MEmptyStateProps) {
  return (
    <div className={["m3-empty", className ?? ""].filter(Boolean).join(" ")}>
      <div className="m3-empty__icon" aria-hidden>
        <MIcon name={icon} />
      </div>
      <h3 className="m3-empty__title">{title}</h3>
      {body && <p className="m3-empty__body">{body}</p>}
      {action}
    </div>
  );
}

export interface MErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Centered error state with retry. Defaults are Italian (app primary language). */
export function MErrorState({
  title = "Qualcosa è andato storto",
  message = "Impossibile caricare i dati. Controlla la connessione e riprova.",
  onRetry,
  retryLabel = "Riprova",
  className,
}: MErrorStateProps) {
  return (
    <div className={["m3-error", className ?? ""].filter(Boolean).join(" ")} role="alert">
      <div className="m3-error__icon" aria-hidden>
        <MIcon name="error" />
      </div>
      <h3 className="m3-error__title">{title}</h3>
      {message && <p className="m3-error__body">{message}</p>}
      {onRetry && (
        <MButton variant="filled" icon="refresh" onClick={onRetry}>
          {retryLabel}
        </MButton>
      )}
    </div>
  );
}

export interface MBadgeProps {
  /** Count or text. Shows a dot when omitted. */
  label?: string | number;
  dot?: boolean;
  max?: number;
  /** When children are provided the badge floats on them; else standalone. */
  children?: ReactNode;
  standalone?: boolean;
  className?: string;
}

/** M3 badge: notification dot/count, floating on children or standalone. */
export function MBadge({ label, dot = false, max = 99, children, standalone = false, className }: MBadgeProps) {
  const text =
    typeof label === "number" && label > max ? `${max}+` : label;
  const badge = (
    <span
      className={["m3-badge", dot || text === undefined ? "m3-badge--dot" : "", standalone || !children ? "m3-badge--standalone" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-label={typeof text === "number" || typeof text === "string" ? `${text} notifiche` : undefined}
    >
      {dot ? null : text}
    </span>
  );
  if (!children) return badge;
  return (
    <span className="m3-badge-wrap">
      {children}
      {badge}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* MFavButton                                                          */
/* ------------------------------------------------------------------ */

export interface MFavButtonProps {
  active: boolean;
  onToggle: (next: boolean) => void;
  addLabel?: string;
  removeLabel?: string;
  className?: string;
}

/** Heart toggle (favorite). Filled tonal when active. */
export function MFavButton({
  active,
  onToggle,
  addLabel = "Aggiungi ai preferiti",
  removeLabel = "Rimuovi dai preferiti",
  className,
}: MFavButtonProps) {
  return (
    <MIconButton
      icon="favorite"
      label={active ? removeLabel : addLabel}
      variant={active ? "tonal" : "standard"}
      selected={active}
      onClick={() => onToggle(!active)}
      className={className}
    />
  );
}

/* ------------------------------------------------------------------ */
/* CountdownCells                                                      */
/* ------------------------------------------------------------------ */

export interface CountdownCellsProps {
  target: Date;
  /** Hero variant: dark translucent cells for over-image/hero usage. */
  variant?: "default" | "hero";
  ariaLabel?: string;
  daysLabel?: string;
  hoursLabel?: string;
  minutesLabel?: string;
  secondsLabel?: string;
}

/** Countdown cells (days/hours/min/sec). Renders nothing when done. */
export function CountdownCells({
  target,
  variant = "default",
  ariaLabel = "Conto alla rovescia",
  daysLabel = "giorni",
  hoursLabel = "ore",
  minutesLabel = "min",
  secondsLabel = "sec",
}: CountdownCellsProps) {
  const cd = useCountdown(target);
  if (!cd || cd.done) return null;
  const cells: [number, string][] = [
    [cd.d, daysLabel],
    [cd.h, hoursLabel],
    [cd.m, minutesLabel],
    [cd.s, secondsLabel],
  ];
  return (
    <div
      className={["m3-countdown", variant === "hero" ? "m3-countdown--hero" : ""].filter(Boolean).join(" ")}
      role="timer"
      aria-label={ariaLabel}
    >
      {cells.map(([v, l]) => (
        <div className="m3-countdown__cell" key={l}>
          <b>{String(v).padStart(2, "0")}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast (legacy-compatible API, M3 visuals, portaled)                */
/* ------------------------------------------------------------------ */

interface ToastItem {
  id: number;
  msg: string;
}

const ToastCtx = createContext<{ push: (msg: string) => void }>({ push: () => {} });

/** Provides `useToast().push(msg)`; renders M3-styled toasts portaled to body. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, msg }]);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 2600);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      {canUseDOM
        ? createPortal(
            <div className="m3-toast-stack" aria-live="polite">
              {items.map((i) => (
                <div className="m3-toast" key={i.id}>
                  <MIcon name="check_circle" aria-hidden />
                  {i.msg}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastCtx.Provider>
  );
}

/** Push transient toast messages. Same API as the legacy ui.tsx provider. */
export function useToast() {
  return useContext(ToastCtx);
}

/* Season selector: searchable, grouped by decade, mobile-friendly.
 * Seasons come from Jolpica (1950..current). Used everywhere a season
 * can be picked (Standings, Results, Settings, ...).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Search } from "lucide-react";
import { jolpica } from "../api/jolpica";
import { useSettings } from "../store/settings";

interface Props {
  value: string;
  onChange: (season: string) => void;
  id?: string;
}

let seasonsCache: Promise<string[]> | null = null;
function loadSeasons(): Promise<string[]> {
  if (!seasonsCache) {
    seasonsCache = jolpica.seasons().then((s) => [...s].reverse());
    seasonsCache.catch(() => { seasonsCache = null; });
  }
  return seasonsCache;
}

export function SeasonSelect({ value, onChange, id }: Props) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSeasons().then(setSeasons).catch(() => setSeasons([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    // focus the search input when opened
    setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const decades = useMemo(() => {
    const q = query.trim();
    const list = q ? seasons.filter((s) => s.includes(q)) : seasons;
    const groups = new Map<string, string[]>();
    for (const s of list) {
      const d = `${s.slice(0, 3)}0`;
      const arr = groups.get(d) ?? [];
      arr.push(s);
      groups.set(d, arr);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [seasons, query]);

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  return (
    <div className="sselect" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="sselect-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
      >
        <CalendarDays size={16} aria-hidden />
        <span>{value}</span>
        <ChevronDown size={16} aria-hidden className={open ? "rot" : undefined} />
      </button>
      {open && (
        <div className="sselect-pop" role="listbox" aria-label={t("season")}>
          <div className="sselect-search">
            <Search size={15} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              inputMode="numeric"
              placeholder="1994…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("season")}
            />
          </div>
          <div className="sselect-list">
            {decades.length === 0 && <p className="muted small sselect-empty">—</p>}
            {decades.map(([dec, list]) => (
              <div key={dec} className="sselect-decade">
                <p className="sselect-decade-t">{dec}s</p>
                <div className="sselect-years">
                  {list.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="option"
                      aria-selected={s === value}
                      className={`sselect-year${s === value ? " sel" : ""}`}
                      onClick={() => pick(s)}
                    >
                      {s === value && <Check size={13} aria-hidden />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

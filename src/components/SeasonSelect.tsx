/* Season selector: searchable, grouped by decade.
 * Seasons come from Jolpica (1950..current). Used everywhere a season
 * can be picked (Standings, Results, Settings, ...).
 * Semantics unchanged: controlled value/onChange; callers sync it with
 * ?season= in the URL via useSeasonParam.
 * M3 Expressive look: outlined trigger button; on mobile (<=600px) the
 * panel is a portaled MBottomSheet, on desktop a portaled MMenu anchored
 * to the trigger (never trapped by transformed ancestors). */
import { useEffect, useMemo, useRef, useState } from "react";
import { MBottomSheet, MButton, MIcon, MMenu, MSearchBar } from "../design";
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

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return isMobile;
}

export function SeasonSelect({ value, onChange, id }: Props) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLSpanElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadSeasons().then(setSeasons).catch(() => setSeasons([]));
  }, []);

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

  const panel = (
    <div className="m3-season-panel">
      <div className="m3-season-search">
        <MSearchBar
          value={query}
          onChange={setQuery}
          placeholder="1994…"
          label={t("season")}
          leadingIcon="search"
        />
      </div>
      <div className="m3-season-list" role="listbox" aria-label={t("season")}>
        {decades.length === 0 && <p className="m3-season-empty">—</p>}
        {decades.map(([dec, list]) => (
          <div key={dec} className="m3-season-decade">
            <p className="m3-season-decade-t">{dec}s</p>
            <div className="m3-season-years">
              {list.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={s === value}
                  className={`m3-season-year${s === value ? " sel" : ""}`}
                  onClick={() => pick(s)}
                >
                  {s === value && <MIcon name="check" size={14} />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} className="m3-season-anchor">
        <MButton
          variant="outlined"
          icon="calendar_month"
          trailingIcon="keyboard_arrow_down"
          onClick={() => {
            setQuery("");
            setOpen((o) => !o);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span id={id}>{value}</span>
        </MButton>
      </span>
      {isMobile ? (
        <MBottomSheet open={open} onClose={() => setOpen(false)} title={t("season")}>
          {panel}
        </MBottomSheet>
      ) : (
        <MMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} ariaLabel={t("season")} minWidth={340}>
          {panel}
        </MMenu>
      )}
    </>
  );
}

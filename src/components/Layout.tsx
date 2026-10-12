/* App shell: M3 top app bar, desktop nav rail, mobile bottom nav bar,
 * global search (dialog) and "more" menu (bottom sheet on mobile).
 * Routes are unchanged (see App.tsx). */
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MBottomSheet,
  MDialog,
  MIcon,
  MIconButton,
  MList,
  MListItem,
  MNavBar,
  MNavRail,
  MSearchBar,
  MTopAppBar,
  type MIconName,
} from "../design";
import { useSettings } from "../store/settings";
import { jolpica, type DriverRef, type ConstructorRef, type RaceInfo, type CircuitRef } from "../api/jolpica";
import { fetchNews, type NewsItem } from "../api/news";
import type { DictKey } from "../i18n/dict";

interface NavItem {
  to: string;
  key: DictKey;
  icon: MIconName;
}

const NAV: NavItem[] = [
  { to: "/", key: "nav_home", icon: "home" },
  { to: "/calendario", key: "nav_calendar", icon: "calendar_month" },
  { to: "/live", key: "nav_live", icon: "radio" },
  { to: "/classifiche", key: "nav_standings", icon: "trophy" },
  { to: "/risultati", key: "nav_results", icon: "flag" },
  { to: "/piloti", key: "nav_drivers", icon: "group" },
  { to: "/team", key: "nav_teams", icon: "corporate_fare" },
  { to: "/circuiti", key: "nav_circuits", icon: "route" },
  { to: "/news", key: "nav_news", icon: "newspaper" },
  { to: "/impostazioni", key: "nav_settings", icon: "settings" },
];

/** Destinations shown directly in the mobile bottom bar; the rest live in "Altro". */
const MOBILE_PRIMARY = ["/", "/calendario", "/live", "/classifiche"];

export function Layout() {
  const { t, theme, setTheme } = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const activeKey = useMemo(() => {
    const p = location.pathname;
    const found = NAV.find((n) => (n.to === "/" ? p === "/" : p === n.to || p.startsWith(n.to + "/")));
    return found?.to ?? "/";
  }, [location.pathname]);

  const railItems = NAV.map((n) => ({ key: n.to, icon: n.icon, label: t(n.key) }));
  const barItems = [
    ...NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map((n) => ({ key: n.to, icon: n.icon, label: t(n.key) })),
    { key: "__more", icon: "menu" as MIconName, label: t("nav_more") },
  ];
  const moreItems = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to));

  const go = (key: string) => {
    if (key === "__more") {
      setMoreOpen(true);
      return;
    }
    navigate(key);
  };

  return (
    <div className="app-shell">
      <MNavRail items={railItems} value={activeKey} onChange={go} ariaLabel={t("nav_home")} />

      <div className="app-body">
        <MTopAppBar
          title={
            <Link to="/" className="brand" aria-label="F1 Hub home">
              <span className="brand-mark" aria-hidden="true">F1</span>
              <span className="brand-name">F1&nbsp;Hub</span>
            </Link>
          }
          actions={
            <>
              <MIconButton icon="search" label={t("search_placeholder")} onClick={() => setSearchOpen(true)} />
              <MIconButton
                icon={theme === "dark" ? "light_mode" : "dark_mode"}
                label={theme === "dark" ? t("theme_light") : t("theme_dark")}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </>
          }
        />

        <main className="app-main" id="main">
          <Outlet />
          <footer className="app-footer">
            <span className="fbrand"><MIcon name="flag" size={18} /> F1 Hub</span>
            <span>{t("about_text")}</span>
            <span>{t("img_credit_wiki")}</span>
          </footer>
        </main>
      </div>

      <MNavBar items={barItems} value={MOBILE_PRIMARY.includes(activeKey) ? activeKey : "__more"} onChange={go} ariaLabel={t("nav_home")} />

      <MBottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t("nav_more")}>
        <MList ariaLabel={t("nav_more")}>
          {moreItems.map((n) => (
            <MListItem
              key={n.to}
              headline={t(n.key)}
              leading={<MIcon name={n.icon} />}
              selected={activeKey === n.to}
              onClick={() => {
                setMoreOpen(false);
                navigate(n.to);
              }}
            />
          ))}
        </MList>
      </MBottomSheet>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/* ---------------- global search ---------------- */

interface Hit { kind: string; label: string; sub: string; to: string; icon: MIconName }

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { t, season } = useSettings();
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ drivers: DriverRef[]; teams: ConstructorRef[]; races: RaceInfo[]; circuits: CircuitRef[]; news: NewsItem[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jolpica.drivers(season).catch(() => [] as DriverRef[]),
      jolpica.constructors(season).catch(() => [] as ConstructorRef[]),
      jolpica.schedule(season).catch(() => [] as RaceInfo[]),
      jolpica.circuits().catch(() => [] as CircuitRef[]),
      fetchNews().catch(() => [] as NewsItem[]),
    ]).then(([drivers, teams, races, circuits, news]) => {
      if (!cancelled) setData({ drivers, teams, races, circuits, news });
    });
    return () => { cancelled = true; };
  }, [season]);

  // autofocus the search input when the dialog opens (focus trap is active)
  useEffect(() => {
    const id = window.setTimeout(() => {
      document.querySelector<HTMLElement>(".m3-search__input")?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    if (!data || query.length < 2) return [];
    const out: Hit[] = [];
    for (const d of data.drivers) {
      const label = `${d.givenName} ${d.familyName}`;
      if (label.toLowerCase().includes(query) || (d.code ?? "").toLowerCase() === query) {
        out.push({ kind: t("nav_drivers"), label, sub: d.nationality, to: `/piloti/${d.driverId}?season=${season}`, icon: "person" });
      }
    }
    for (const c of data.teams) {
      if (c.name.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_teams"), label: c.name, sub: c.nationality, to: `/team/${c.constructorId}?season=${season}`, icon: "corporate_fare" });
      }
    }
    for (const r of data.races) {
      if (r.raceName.toLowerCase().includes(query) || r.Circuit.Location.country.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_calendar"), label: r.raceName, sub: `${r.Circuit.Location.locality} · ${r.Circuit.Location.country}`, to: `/gara/${r.season}/${r.round}`, icon: "flag" });
      }
    }
    for (const c of data.circuits) {
      if (c.circuitName.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_circuits"), label: c.circuitName, sub: `${c.Location.locality} · ${c.Location.country}`, to: `/circuiti`, icon: "route" });
      }
    }
    for (const n of data.news) {
      if (n.title.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_news"), label: n.title, sub: n.source, to: `/news`, icon: "newspaper" });
      }
    }
    return out.slice(0, 24);
  }, [q, data, t, season]);

  const goFirst = () => {
    if (hits.length > 0) {
      navigate(hits[0].to);
      onClose();
    }
  };

  return (
    <MDialog open onClose={onClose} headline={t("search_placeholder")} icon="search">
      <MSearchBar
        value={q}
        onChange={setQ}
        onSubmit={goFirst}
        placeholder={t("search_placeholder")}
        label={t("search_placeholder")}
        trailing={
          q ? (
            <MIconButton icon="close" label={t("search_clear")} onClick={() => setQ("")} />
          ) : undefined
        }
      />
      <div className="m3-search-results">
        {q.trim().length >= 2 && hits.length === 0 && (
          <p className="m3-muted" style={{ padding: "18px 4px" }}>{t("no_results")}</p>
        )}
        {q.trim().length < 2 && (
          <p className="m3-muted" style={{ padding: "18px 4px", fontSize: "0.88rem" }}>{t("search_hint")}</p>
        )}
        {hits.length > 0 && (
          <MList ariaLabel={t("search_placeholder")}>
            {hits.map((h, i) => (
              <MListItem
                key={i}
                headline={h.label}
                supportingText={h.sub}
                leading={<MIcon name={h.icon} />}
                trailing={<span className="m3-search-kind">{h.kind}</span>}
                onClick={() => {
                  navigate(h.to);
                  onClose();
                }}
              />
            ))}
          </MList>
        )}
      </div>
    </MDialog>
  );
}

export { SearchDialog as SearchOverlay };
export type { Hit };

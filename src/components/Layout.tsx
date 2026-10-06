/* App shell: top bar, desktop nav, mobile bottom nav, global search overlay. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2, CalendarDays, Flag, Home, Menu, Moon, Newspaper, Radio, Route,
  Search, Settings, Sun, Trophy, Users, X,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "../store/settings";
import { jolpica, type DriverRef, type ConstructorRef, type RaceInfo, type CircuitRef } from "../api/jolpica";
import { fetchNews, type NewsItem } from "../api/news";
import type { DictKey } from "../i18n/dict";

interface NavItem {
  to: string;
  key: DictKey;
  icon: LucideIcon;
  primary?: boolean;
  menu?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", key: "nav_home", icon: Home, primary: true },
  { to: "/calendario", key: "nav_calendar", icon: CalendarDays, primary: true },
  { to: "/live", key: "nav_live", icon: Radio, primary: true },
  { to: "/classifiche", key: "nav_standings", icon: Trophy, primary: true },
  { to: "/menu", key: "nav_more", icon: Menu, primary: true, menu: true },
  { to: "/risultati", key: "nav_results", icon: Flag },
  { to: "/piloti", key: "nav_drivers", icon: Users },
  { to: "/team", key: "nav_teams", icon: Building2 },
  { to: "/circuiti", key: "nav_circuits", icon: Route },
  { to: "/news", key: "nav_news", icon: Newspaper },
  { to: "/impostazioni", key: "nav_settings", icon: Settings },
];

export function Layout() {
  const { t, theme, setTheme } = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="F1 Hub home">
            <span className="brand-mark" aria-hidden="true">F1</span>
            <span>F1&nbsp;Hub</span>
          </Link>
          <nav className="nav-desktop" aria-label="Primary">
            {NAV.filter((n) => !n.menu).map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                <n.icon aria-hidden="true" />
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label={t("search_placeholder")} title="Ctrl+K">
              <Search aria-hidden="true" />
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? t("theme_light") : t("theme_dark")}
            >
              {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main className="main" id="main">
        <Outlet />
        <footer className="footer">
          <span className="fbrand"><Flag aria-hidden="true" /> F1 Hub</span>
          <span>{t("about_text")}</span>
          <span className="fcredit">{t("img_credit_wiki")}</span>
        </footer>
      </main>

      <nav className="bottomnav" aria-label="Primary mobile">
        {NAV.filter((n) => n.primary).map((n) =>
          n.menu ? (
            <button key={n.to} className={`mnav${menuOpen ? " active" : ""}`} onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={t(n.key)}>
              {menuOpen ? <X aria-hidden="true" /> : <n.icon aria-hidden="true" />}
              {t(n.key)}
            </button>
          ) : (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              <n.icon aria-hidden="true" />
              {t(n.key)}
            </NavLink>
          )
        )}
      </nav>

      {menuOpen && (
        <div className="search-overlay" onClick={() => setMenuOpen(false)}>
          <div className="search-box" role="dialog" aria-label={t("nav_more")} onClick={(e) => e.stopPropagation()}>
            {NAV.filter((n) => !n.primary && !n.menu).map((n) => (
              <div className="search-results" key={n.to} style={{ borderTop: "none" }}>
                <Link to={n.to} onClick={() => setMenuOpen(false)}>
                  <span className="search-ico" aria-hidden="true"><n.icon /></span>
                  <b>{t(n.key)}</b>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/* ---------------- global search ---------------- */

interface Hit { kind: string; label: string; sub: string; to: string; icon: LucideIcon }

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { t, season } = useSettings();
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ drivers: DriverRef[]; teams: ConstructorRef[]; races: RaceInfo[]; circuits: CircuitRef[]; news: NewsItem[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
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

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    if (!data || query.length < 2) return [];
    const out: Hit[] = [];
    for (const d of data.drivers) {
      const label = `${d.givenName} ${d.familyName}`;
      if (label.toLowerCase().includes(query) || (d.code ?? "").toLowerCase() === query) {
        out.push({ kind: t("nav_drivers"), label, sub: d.nationality, to: `/piloti/${d.driverId}`, icon: Users });
      }
    }
    for (const c of data.teams) {
      if (c.name.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_teams"), label: c.name, sub: c.nationality, to: `/team/${c.constructorId}`, icon: Building2 });
      }
    }
    for (const r of data.races) {
      if (r.raceName.toLowerCase().includes(query) || r.Circuit.Location.country.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_calendar"), label: r.raceName, sub: `${r.Circuit.Location.locality} · ${r.Circuit.Location.country}`, to: `/gara/${r.season}/${r.round}`, icon: Flag });
      }
    }
    for (const c of data.circuits) {
      if (c.circuitName.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_circuits"), label: c.circuitName, sub: `${c.Location.locality} · ${c.Location.country}`, to: `/circuiti`, icon: Route });
      }
    }
    for (const n of data.news) {
      if (n.title.toLowerCase().includes(query)) {
        out.push({ kind: t("nav_news"), label: n.title, sub: n.source, to: `/news`, icon: Newspaper });
      }
    }
    return out.slice(0, 24);
  }, [q, data, t]);

  return (
    <div className="search-overlay" onClick={onClose} role="presentation">
      <div className="search-box" role="dialog" aria-label={t("search_placeholder")} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="search"
          placeholder={t("search_placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits.length > 0) {
              navigate(hits[0].to);
              onClose();
            }
          }}
          aria-label={t("search_placeholder")}
        />
        <div className="search-results">
          {q.trim().length >= 2 && hits.length === 0 && (
            <div style={{ padding: "18px", color: "var(--text-2)" }}>{t("no_results")}</div>
          )}
          {q.trim().length < 2 && (
            <div style={{ padding: "18px", color: "var(--text-3)", fontSize: "0.88rem" }}>{t("search_hint")}</div>
          )}
          {hits.map((h, i) => (
            <Link key={i} to={h.to} onClick={onClose}>
              <span className="search-ico" aria-hidden="true"><h.icon /></span>
              <span>
                <b style={{ display: "block", fontSize: "0.95rem" }}>{h.label}</b>
                <span className="small muted">{h.sub}</span>
              </span>
              <span className="kind" style={{ marginLeft: "auto" }}>{h.kind}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SearchOverlay };
export type { Hit };

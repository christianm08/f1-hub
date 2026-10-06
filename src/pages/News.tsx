/* News: aggregated RSS headlines via rss2json (title, excerpt, source, date, link only). */
import { useState } from "react";
import { ArrowLeftRight, ArrowUpRight, Building2, Cpu, Flag, Info, Newspaper, Scale } from "lucide-react";
import { fetchNews, type NewsItem } from "../api/news";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";

const CATS = ["latest", "races", "market", "tech", "teams", "rules"] as const;

const CAT_ICONS = {
  latest: Newspaper,
  races: Flag,
  market: ArrowLeftRight,
  tech: Cpu,
  teams: Building2,
  rules: Scale,
} as const;

export default function News() {
  const { t, lang } = useSettings();
  const [filter, setFilter] = useState<string>("all");
  const { status, data, retry } = useApi<NewsItem[]>(() => fetchNews(), []);

  const items = (data ?? []).filter((n) => filter === "all" || n.category === filter);

  const catLabel = (c: string) => {
    const key = `cat_${c}` as "cat_latest" | "cat_races" | "cat_market" | "cat_tech" | "cat_teams" | "cat_rules";
    return t(key);
  };

  const catIcon = (c: string) => CAT_ICONS[c as keyof typeof CAT_ICONS] ?? Newspaper;

  return (
    <div>
      <PageHeader
        title={t("nav_news")}
        right={
          <div className="field" style={{ margin: 0, minWidth: 140 }}>
            <label htmlFor="n-cat">{t("news_categories_all")}</label>
            <select id="n-cat" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t("news_categories_all")}</option>
              {CATS.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
          </div>
        }
      />

      <p className="small muted row" style={{ marginTop: 0 }}>
        <Info size={14} aria-hidden="true" />
        <span>{t("about_text")}</span>
      </p>

      {status === "loading" && <div className="grid grid-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}
      {status === "error" && <ErrorState onRetry={retry} />}
      {status === "ok" && items.length === 0 && <EmptyState title={t("empty_title")} body={t("empty_body")} />}
      {status === "ok" && items.length > 0 && (
        <div className="grid grid-2">
          {items.map((n) => {
            const Icon = catIcon(n.category);
            return (
              <article className="card news-card" key={n.id}>
                <div className="spread">
                  <Badge kind="accent"><Icon size={13} aria-hidden="true" />{catLabel(n.category)}</Badge>
                  <span className="small muted num">
                    {new Date(n.pubDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <h3>
                  <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                    {n.title}
                  </a>
                </h3>
                {n.excerpt && <p>{n.excerpt}</p>}
                <div className="src">
                  <span>{n.source}</span>
                  <a href={n.link} target="_blank" rel="noopener noreferrer">
                    {t("read_original")} <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

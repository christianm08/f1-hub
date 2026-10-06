/* News: aggregated RSS headlines via rss2json (title, excerpt, source, date, link only). */
import { useState } from "react";
import { fetchNews, type NewsItem } from "../api/news";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";

const CATS = ["latest", "races", "market", "tech", "teams", "rules"] as const;

export default function News() {
  const { t, lang } = useSettings();
  const [filter, setFilter] = useState<string>("all");
  const { status, data, retry } = useApi<NewsItem[]>(() => fetchNews(), []);

  const items = (data ?? []).filter((n) => filter === "all" || n.category === filter);

  const catLabel = (c: string) => {
    const key = `cat_${c}` as "cat_latest" | "cat_races" | "cat_market" | "cat_tech" | "cat_teams" | "cat_rules";
    return t(key);
  };

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

      <p className="small muted" style={{ marginTop: 0 }}>{t("about_text")}</p>

      {status === "loading" && <div className="grid grid-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}
      {status === "error" && <ErrorState onRetry={retry} />}
      {status === "ok" && items.length === 0 && <EmptyState title={t("empty_title")} body={t("empty_body")} />}
      {status === "ok" && items.length > 0 && (
        <div className="grid grid-2">
          {items.map((n) => (
            <article className="card" key={n.id}>
              <div className="spread">
                <Badge kind="accent">{n.source}</Badge>
                <span className="small muted num">
                  {new Date(n.pubDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <h3 style={{ margin: "10px 0 6px", fontSize: "1.02rem" }}>
                <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                  {n.title}
                </a>
              </h3>
              {n.excerpt && <p className="small muted" style={{ margin: "0 0 10px" }}>{n.excerpt}</p>}
              <a className="btn ghost small" href={n.link} target="_blank" rel="noopener noreferrer">
                {t("read_original")} ↗
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

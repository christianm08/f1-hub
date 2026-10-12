/* News: aggregated RSS headlines via rss2json (title, excerpt, source, date, link only). */
import { useState } from "react";
import { fetchNews, type NewsItem } from "../api/news";
import { useApi } from "../hooks/useApi";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonCard } from "../components/ui";
import { MCard, MChip, MIcon, type MIconName } from "../design";

const CATS = ["latest", "races", "market", "tech", "teams", "rules"] as const;

const CAT_ICONS: Record<string, MIconName> = {
  latest: "newspaper",
  races: "flag",
  market: "compare_arrows",
  tech: "memory",
  teams: "corporate_fare",
  rules: "verified",
};

export default function News() {
  const { t, lang } = useSettings();
  const [filter, setFilter] = useState<string>("all");
  const { status, data, retry } = useApi<NewsItem[]>(() => fetchNews(), []);

  const items = (data ?? []).filter((n) => filter === "all" || n.category === filter);

  const catLabel = (c: string) => {
    const key = `cat_${c}` as "cat_latest" | "cat_races" | "cat_market" | "cat_tech" | "cat_teams" | "cat_rules";
    return t(key);
  };

  const catIcon = (c: string): MIconName => CAT_ICONS[c] ?? "newspaper";

  return (
    <div>
      <PageHeader title={t("nav_news")} />

      <div
        className="m3-chipbar"
        role="group"
        aria-label={t("news_categories_all")}
      >
        <MChip variant="filter" selected={filter === "all"} leadingIcon="newspaper" onClick={() => setFilter("all")}>
          {t("news_categories_all")}
        </MChip>
        {CATS.map((c) => (
          <MChip key={c} variant="filter" selected={filter === c} leadingIcon={catIcon(c)} onClick={() => setFilter(c)}>
            {catLabel(c)}
          </MChip>
        ))}
      </div>

      <p className="m3-muted" style={{ display: "flex", gap: 8, marginTop: 0, fontSize: "0.85rem", alignItems: "flex-start" }}>
        <MIcon name="info" size={16} style={{ flex: "0 0 auto", marginTop: 2 }} />
        <span>{t("about_text")}</span>
      </p>

      {status === "loading" && <div className="m3-grid m3-grid--2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}
      {status === "error" && <ErrorState onRetry={retry} />}
      {status === "ok" && items.length === 0 && <EmptyState icon="search_off" title={t("empty_title")} body={t("empty_body")} />}
      {status === "ok" && items.length > 0 && (
        <div className="m3-grid m3-grid--2">
          {items.map((n, i) => (
            <MCard variant="outlined" className="m3-news-card m3-enter" key={n.id} style={{ animationDelay: `${Math.min(i, 7) * 50}ms` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Badge kind="accent"><MIcon name={catIcon(n.category)} size={14} />{catLabel(n.category)}</Badge>
                <span className="m3-muted num" style={{ fontSize: "0.82rem" }}>
                  {new Date(n.pubDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <h3>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {n.title}
                </a>
              </h3>
              {n.excerpt && <p>{n.excerpt}</p>}
              <div className="m3-news-src">
                <span>{n.source}</span>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {t("read_original")} <MIcon name="arrow_outward" size={14} />
                </a>
              </div>
            </MCard>
          ))}
        </div>
      )}
    </div>
  );
}

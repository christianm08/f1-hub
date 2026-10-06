/* News aggregation via public RSS feeds through rss2json (keyless, CORS-enabled).
   We use title + short excerpt + source + date + link to the original article only. */
import { fetchJSON } from "./client";

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  enclosure?: { link?: string };
}

interface Rss2JsonResp {
  status: string;
  items: Rss2JsonItem[];
}

const FEEDS = [
  { url: "https://it.motorsport.com/rss/f1/news/", source: "Motorsport.com Italia" },
  { url: "https://www.pittalk.it/feed/", source: "PitTalk" },
];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptOf(item: Rss2JsonItem): string {
  const text = stripHtml(item.description || item.content || "");
  if (text.length <= 170) return text;
  return text.slice(0, 167).replace(/\s+\S*$/, "") + "…";
}

function categorize(title: string, text: string): string {
  const t = (title + " " + text).toLowerCase();
  if (/(driver market|mercato piloti|contract|firma|rinnovo|seat|sedile|silly season)/.test(t)) return "market";
  if (/(technical|tecnica|aerodinamica|power unit|motore|telaio|sospensioni|drs|regolamento tecnico)/.test(t)) return "tech";
  if (/(regulation|regolamento|fia|penal|steward|sanzione)/.test(t)) return "rules";
  if (/(team|squadra|scuderia|factory|budget cap)/.test(t)) return "teams";
  if (/(qualifying|qualifiche|race|gara|gp |gran premio|sprint|practice|prove)/.test(t)) return "races";
  return "latest";
}

export async function fetchNews(): Promise<NewsItem[]> {
  const all: NewsItem[] = [];
  for (const feed of FEEDS) {
    try {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const data = await fetchJSON<Rss2JsonResp>(url, { ttl: 15 * 60 * 1000 });
      if (data.status !== "ok" || !Array.isArray(data.items)) continue;
      for (const item of data.items.slice(0, 15)) {
        all.push({
          id: `${feed.source}:${item.link}`,
          title: item.title?.trim() || "Untitled",
          excerpt: excerptOf(item),
          link: item.link,
          pubDate: item.pubDate,
          source: feed.source,
          category: categorize(item.title ?? "", item.description ?? ""),
        });
      }
    } catch {
      /* one feed failing must not kill the other */
    }
  }
  return all
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i);
}

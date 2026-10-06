/* Driver photos via Wikipedia REST summary API (free, keyless).
 * Source: the driver's Wikipedia article thumbnail (hosted on Wikimedia
 * Commons under a free license). Cached aggressively: in-memory promise
 * memo + localStorage with a long TTL. Never throws: null = use placeholder.
 * Attribution: credit line "Immagini: Wikimedia Commons / Wikipedia"
 * is shown in the app footer and documented in the README.
 */

export interface DriverPhoto {
  /** ~320px thumbnail for cards/lists. */
  thumb: string;
  /** Full-size original for the detail page. */
  full: string;
}

const LS_KEY = "f1hub:photos:v1";
const TTL_MS = 90 * 24 * 3600 * 1000; // 90 days — portraits rarely change

interface CacheEntry {
  v: DriverPhoto | null;
  exp: number;
}

const mem = new Map<string, Promise<DriverPhoto | null>>();

function lsGet(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, CacheEntry>;
    const e = all[key];
    if (!e || e.exp < Date.now()) return null;
    return e;
  } catch {
    return null;
  }
}

function lsSet(key: string, v: DriverPhoto | null) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
    all[key] = { v, exp: Date.now() + TTL_MS };
    // cap size: keep newest 400 entries
    const keys = Object.keys(all);
    if (keys.length > 400) {
      for (const k of keys.slice(0, keys.length - 400)) delete all[k];
    }
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or unavailable — memory cache still works */
  }
}

/** "https://en.wikipedia.org/wiki/Ayrton_Senna" -> "Ayrton_Senna". */
export function wikiTitleFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = /wikipedia\.org\/wiki\/([^#?]+)/i.exec(url);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).replace(/ /g, "_");
  } catch {
    return null;
  }
}

async function fetchPhoto(title: string): Promise<DriverPhoto | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      type?: string;
    };
    // skip disambiguation pages
    if (d.type === "disambiguation" || !d.thumbnail?.source) return null;
    return { thumb: d.thumbnail.source, full: d.originalimage?.source ?? d.thumbnail.source };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Resolve a driver's photo. Keyed by Wikipedia article title.
 * Dedupes in-flight requests; falls back to `name` as title when no URL.
 */
export function getDriverPhoto(wikiUrl?: string, name?: string): Promise<DriverPhoto | null> {
  const title = wikiTitleFromUrl(wikiUrl) ?? (name ? name.trim().replace(/ /g, "_") : null);
  if (!title) return Promise.resolve(null);
  const key = title.toLowerCase();
  let p = mem.get(key);
  if (!p) {
    const cached = lsGet(key);
    p = cached
      ? Promise.resolve(cached.v)
      : fetchPhoto(title).then((v) => {
          lsSet(key, v);
          return v;
        });
    mem.set(key, p);
    p.catch(() => mem.delete(key));
  }
  return p;
}

/** Preload photos for above-the-fold drivers (fire and forget). */
export function preloadDriverPhotos(items: Array<{ wikiUrl?: string; name?: string }>) {
  for (const it of items.slice(0, 6)) {
    getDriverPhoto(it.wikiUrl, it.name).catch(() => undefined);
  }
}

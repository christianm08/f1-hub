/* Cached JSON fetch layer: in-memory + localStorage, TTL per request.
   Never throws raw network errors to UI — wraps them in ApiError. */

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface CacheEntry {
  ts: number;
  data: unknown;
}

const memCache = new Map<string, CacheEntry>();
const LS_PREFIX = "f1hub:cache:";

function readLS(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeLS(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage full or unavailable — memory cache still works */
  }
}

/** Cap the in-memory cache so high-frequency polling with unique URLs
    (delta windows) can't grow it without bound. Map preserves insertion order. */
const MEM_CACHE_MAX = 600;
function memSet(key: string, entry: CacheEntry) {
  memCache.set(key, entry);
  if (memCache.size > MEM_CACHE_MAX) {
    const it = memCache.keys();
    for (let i = 0; i < 100; i++) {
      const k = it.next();
      if (k.done) break;
      memCache.delete(k.value);
    }
  }
}

export interface FetchOpts {
  /** milliseconds; default 10 min */
  ttl?: number;
  /** bypass cache */
  fresh?: boolean;
  /** AbortSignal to cancel in-flight requests (e.g. obsolete live polls). */
  signal?: AbortSignal;
  /** Persist to localStorage (default true). Set false for high-frequency live
      polling so unique delta-window URLs don't fill the quota. */
  persist?: boolean;
}

const DEFAULT_TTL = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;
/** One retry delay for transient bad bodies (Jolpica "error code: 1033"). */
const PARSE_RETRY_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOnce(url: string, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchJSON<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const ttl = opts.ttl ?? DEFAULT_TTL;
  if (!opts.fresh) {
    const mem = memCache.get(url);
    if (mem && Date.now() - mem.ts < ttl) return mem.data as T;
    const ls = readLS(url);
    if (ls && Date.now() - ls.ts < ttl) {
      memCache.set(url, ls);
      return ls.data as T;
    }
  }
  const signal = opts.signal;
  if (signal?.aborted) throw new ApiError("aborted");
  let res: Response;
  try {
    res = await fetchOnce(url, signal ?? undefined);
  } catch {
    throw new ApiError(signal?.aborted ? "aborted" : "network_error");
  }
  if (res.status === 429) {
    // Rate limited: honor Retry-After once, then give up gracefully.
    const waitS = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    await sleep(Math.min(Number.isFinite(waitS) ? waitS : 5, 30) * 1000);
    if (signal?.aborted) throw new ApiError("aborted");
    try {
      res = await fetchOnce(url, signal ?? undefined);
    } catch {
      throw new ApiError(signal?.aborted ? "aborted" : "network_error");
    }
  }
  if (!res.ok) {
    throw new ApiError(`http_${res.status}`, res.status);
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    // Transient bad body (Jolpica intermittently returns HTTP 200 with a
    // plain-text "error code: 1033" Cloudflare page): one retry, then fail.
    await sleep(PARSE_RETRY_DELAY_MS);
    if (signal?.aborted) throw new ApiError("aborted");
    try {
      const res2 = await fetchOnce(url, signal ?? undefined);
      if (!res2.ok) throw new ApiError(`http_${res2.status}`, res2.status);
      data = (await res2.json()) as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError("parse_error");
    }
  }
  const entry: CacheEntry = { ts: Date.now(), data };
  memSet(url, entry);
  if (opts.persist !== false) writeLS(url, entry);
  return data;
}

/** Clear all cached API data (used from Settings). */
export function clearCache() {
  memCache.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

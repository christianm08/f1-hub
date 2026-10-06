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

export interface FetchOpts {
  /** milliseconds; default 10 min */
  ttl?: number;
  /** bypass cache */
  fresh?: boolean;
}

const DEFAULT_TTL = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    throw new ApiError("network_error");
  }
  if (res.status === 429) {
    // Rate limited: honor Retry-After once, then give up gracefully.
    const waitS = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    await sleep(Math.min(Number.isFinite(waitS) ? waitS : 5, 30) * 1000);
    try {
      res = await fetch(url);
    } catch {
      throw new ApiError("network_error");
    }
  }
  if (!res.ok) {
    throw new ApiError(`http_${res.status}`, res.status);
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new ApiError("parse_error");
  }
  const entry: CacheEntry = { ts: Date.now(), data };
  memCache.set(url, entry);
  writeLS(url, entry);
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

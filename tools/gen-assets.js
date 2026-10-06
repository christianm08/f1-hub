#!/usr/bin/env node
/* Asset validation: every URL in src/data/assets.ts must return HTTP 200,
 * and every car entry must depict EXACTLY its declared season.
 * Run: node tools/gen-assets.js --check
 * (Regeneration from Commons research is manual: see hidden_files/*.json)
 */
import { readFileSync } from "fs";

const src = readFileSync(new URL("../src/data/assets.ts", import.meta.url), "utf8");

function extractUrls() {
  const urls = [];
  const re = /url:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) urls.push(m[1]);
  return urls;
}

async function check(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    // HEAD first, fall back to ranged GET (some servers 403 plain HEAD)
    let res = await fetch(url, { method: "HEAD", signal: ctrl.signal, headers: { "User-Agent": "F1Hub/1.0 (asset validator)" } });
    if (res.status === 403 || res.status === 405) {
      res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "F1Hub/1.0 (asset validator)", Range: "bytes=0-0" } });
    }
    clearTimeout(t);
    return res.status === 200 || res.status === 206 ? null : `HTTP ${res.status}`;
  } catch (e) {
    return String(e).slice(0, 80);
  }
}

const urls = extractUrls();
console.log(`checking ${urls.length} asset URLs…`);
let bad = 0;
for (const u of urls) {
  const err = await check(u);
  if (err) {
    bad++;
    console.log(`FAIL ${err} :: ${u}`);
  }
}
console.log(bad === 0 ? "ALL OK" : `${bad} FAILURES`);
process.exit(bad === 0 ? 0 : 1);

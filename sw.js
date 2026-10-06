/* Dropwise service worker: keeps the patient page working offline.
   Bump VERSION whenever you change any file, so phones pick up the new copy.

   Network first: pages and files always come from the server when it answers within a few seconds, so updates show
   straight away and a page never mixes old and new files. The cached copy is used when the phone is offline or the
   connection is very slow.

   Some hosts (Cloudflare Pages) redirect /about.html to /about. Browsers refuse a cached redirect as the answer to a
   page visit, so redirects are passed straight through and only plain (non-redirected) copies are stored. */
const VERSION = "dropwise-v16";
const ASSETS = ["./", "index.html", "patient.html", "about.html", "css/dropwise.css", "js/i18n.js", "js/qr.js", "js/core.js", "js/builder.js", "js/patient.js",
  "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
const SLOW_MS = 4000;

/* A copy of a response that doesn't remember it was redirected */
const plain = async res => res.redirected ? new Response(await res.blob(), {status:res.status, statusText:res.statusText, headers:res.headers}) : res;
/* The cache key ignores the query string, so ?pv=… preview reloads don't pile up */
const keyOf = url => url.origin + url.pathname;
/* Other names the same page can have: / and /index.html, /about and /about.html */
function aliases(url){
  const p = url.pathname, out = [];
  if (p.endsWith("/")) out.push(p + "index.html");
  else if (p.endsWith("/index.html")) out.push(p.slice(0, -10));
  if (p.endsWith(".html")) out.push(p.slice(0, -5));
  else if (!/\.[a-z0-9]+$/i.test(p) && !p.endsWith("/")) out.push(p + ".html");
  return out.map(x => url.origin + x);
}

self.addEventListener("install", e => {
  /* One missing file shouldn't stop the rest from being saved for offline use */
  e.waitUntil(caches.open(VERSION).then(cache => Promise.allSettled(ASSETS.map(async a => {
    const url = new URL(a, self.location.href), res = await fetch(url, {cache:"reload"});
    if (res.ok) await cache.put(keyOf(url), await plain(res));
  }))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;   // never cache patient-code lookups
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cachedCopy = async () => {
      for (const k of [keyOf(url), ...aliases(url)]){ const hit = await cache.match(k); if (hit) return hit; }
      return null;
    };
    const net = fetch(e.request).then(async res => {
      if (res.ok && res.type === "basic") await cache.put(keyOf(url), await plain(res.clone()));
      return res;                       // redirects (Cloudflare's /about.html → /about) go straight back to the browser
    });
    const cached = await cachedCopy();
    if (!cached) return net.catch(() => Response.error());
    /* Offline or very slow: use the saved copy, and let the download finish in the background for next time */
    e.waitUntil(net.catch(() => {}));
    return Promise.race([net.catch(() => cached), new Promise(r => setTimeout(() => r(cached), SLOW_MS))]);
  })());
});

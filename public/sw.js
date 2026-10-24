// অভিযোগ — সার্ভিস ওয়ার্কার (PWA অফলাইন সাপোর্ট)
// v2.1: /admin প্রিক্যাশ + নেভিগেশন-ফলব্যাকে trailing-slash সচেতন মিলান
const CACHE = "abhijog-v2.1";
const CORE = ["/", "/admin/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** নেভিগেশন-ফলব্যাক: URL → trailing-slash-ভ্যারিয়েন্ট → রুট-নির্ভর ডিফল্ট */
async function navFallback(url) {
  const path = url.pathname;
  const alts = path.endsWith("/") ? [path, path.replace(/\/$/, "")] : [path, path + "/"];
  const cache = await caches.open(CACHE);
  for (const alt of alts) {
    const hit = await cache.match(new URL(alt, url.origin).href);
    if (hit) return hit;
  }
  // অ্যাডমিন-পাথ হলে হোম-পেজ দেখানো বিভ্রান্তিকর — অ্যাডমিনের ক্যাশড পেজই দেখাক
  return await cache.match(new URL(path.startsWith("/admin") ? "/admin/" : "/", url.origin).href);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // পেজ নেভিগেশন: নেটওয়ার্ক আগে, অফলাইনে ক্যাশ (প্রতিটি রুট নিজের URL-এ ক্যাশ — / ও /admin)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => navFallback(url))
    );
    return;
  }

  // স্ট্যাটিক অ্যাসেট: ক্যাশ আগে
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});

importScripts("./data/offline-assets.bundle.js?v=9d401a9541925218", "./asset-cache.js?v=background-cache-4");
const CACHE_NAME = "lernwort-pwa-v59";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css?v=word-blaster-bonus-2",
  "./app.js?v=word-blaster-bonus-2",
  "./catch-pair.js?v=word-blaster-bonus-2",
  "./catch-pair.css?v=word-blaster-bonus-2",
  "./word-blaster.js?v=word-blaster-bonus-2",
  "./word-blaster.css?v=word-blaster-bonus-2",
  "./asset-cache.js?v=background-cache-4",
  "./data/offline-assets.bundle.js?v=9d401a9541925218",
  "./manifest.webmanifest",
  "./assets/backgrounds/calm-learning-bg.png",
  "./assets/images/bonus_games/catch-a-pair-v1.png",
  "./assets/images/bonus_games/memory-v1.png",
  "./assets/images/bonus_games/word-blaster-v1.png",
  "./assets/images/word_blaster/cannon-base-v2.png",
  "./assets/images/word_blaster/cannon-barrel-v2.png",
  "./assets/images/word_blaster/cannon-mount-v2.png",
  "./assets/images/word_blaster/muzzle-flash-v1.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-icon-512.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-00.png",
  "./assets/images/ui/mrs-honey-body-rig/head-round-no-neck-imagegen.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-left-open-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-right-open-v2.png",
  "./assets/images/set_cards/animals_01.jpg",
  "./assets/images/set_cards/food.jpg",
  "./assets/images/set_cards/colours.jpg?v=set-card-bg-2",
  "./assets/images/set_cards/school.jpg",
  "./assets/images/set_cards/home.jpg?v=home-1",
  "./assets/images/set_cards/body_parts.jpg",
  "./assets/images/set_cards/transport.jpg",
  "./assets/images/set_cards/tools.jpg?v=set-card-bg-2",
  "./assets/images/set_cards/emotions.jpg",
  "./assets/images/mode_cards/hear-competency-v2.jpg",
  "./assets/images/mode_cards/read-competency-v2.jpg",
  "./assets/images/mode_cards/speak-competency-v2.jpg",
  "./assets/images/memory_difficulty/memory-small.svg",
  "./assets/images/memory_difficulty/memory-medium.svg",
  "./assets/images/memory_difficulty/memory-large.svg",
  "./assets/audio/audio-manifest.bundle.js?v=hidden-object-1",
  "./assets/audio/ui/winning-notification.wav",
  "./assets/audio/ui/animated-small-group-applause.wav",
  "./data/minigames/colours_hidden_object.json",
  "./data/minigames/colours_hidden_object.bundle.js?v=hidden-object-hotspots-3",
  "./assets/audio/feedback_en_01/feedback_en_01.bundle.js",
  "./data/sets/animals_01.bundle.js?v=read-feedback-1",
  "./data/sets/food.bundle.js?v=scene-batches-1",
  "./data/sets/colours.bundle.js?v=scene-batches-1",
  "./data/sets/school.bundle.js?v=scene-batches-1",
  "./data/sets/home.bundle.js?v=home-1",
  "./data/sets/body_parts.bundle.js?v=body-parts-1",
  "./data/sets/transport.bundle.js?v=read-feedback-1",
  "./data/sets/tools.bundle.js?v=tools-1",
  "./data/sets/emotions.bundle.js?v=emotions-1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        const content = PRECACHE_URLS.filter((path) => self.LernwortAssets.info(path));
        await cache.addAll(PRECACHE_URLS.filter((path) => !self.LernwortAssets.info(path)));
        // Use the same versioned, verified store as gameplay, avoiding duplicate URLs.
        await self.LernwortAssets.createPreloader().warm(content);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => /^lernwort-pwa-v/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (self.LernwortAssets.info(request)) {
    event.respondWith(self.LernwortAssets.respond(request).catch(() =>
      new Response("Asset temporarily unavailable", { status: 503 })));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return (await caches.match(request)) || caches.match(fallbackUrl);
  }
}

// Only the page's menu/startup may activate an update, never a running round.
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_AT_MENU") event.waitUntil(self.skipWaiting());
});

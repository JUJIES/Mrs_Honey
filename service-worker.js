const CACHE_NAME = "lernwort-pwa-v28";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css?v=competency-2",
  "./app.js?v=competency-2",
  "./manifest.webmanifest",
  "./assets/backgrounds/calm-learning-bg.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-icon-512.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-00.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-01.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-02.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-03.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-04.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-05.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-06.png",
  "./assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-07.png",
  "./assets/images/ui/mrs-honey-body-rig/head-round-no-neck-imagegen.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-left-open-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-left-half-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-left-closed-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-right-open-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-right-half-v2.png",
  "./assets/images/ui/mrs-honey-eye-rig/eye-right-closed-v2.png",
  "./assets/images/set_cards/animals_01.jpg",
  "./assets/images/set_cards/food.jpg",
  "./assets/images/set_cards/colours.jpg",
  "./assets/images/set_cards/school.jpg",
  "./assets/images/set_cards/home.jpg",
  "./assets/images/set_cards/transport.jpg",
  "./assets/images/set_cards/tools.jpg",
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
  "./assets/images/colours_hidden_object/garden-meadow.png",
  "./assets/images/colours_hidden_object/park-road.png",
  "./assets/images/colours_hidden_object/playroom-rug.png",
  "./assets/images/colours_hidden_object/pond-picnic.png",
  "./assets/images/colours_hidden_object/beach-sand.png",
  "./assets/images/colours_hidden_object/classroom-art.png",
  "./assets/audio/feedback_en_01/feedback_en_01.bundle.js",
  "./data/sets/animals_01.bundle.js?v=read-feedback-1",
  "./data/sets/food.bundle.js?v=scene-batches-1",
  "./data/sets/colours.bundle.js?v=scene-batches-1",
  "./data/sets/school.bundle.js?v=scene-batches-1",
  "./data/sets/home.bundle.js?v=home-1",
  "./data/sets/transport.bundle.js?v=read-feedback-1",
  "./data/sets/tools.bundle.js?v=tools-1",
  "./data/sets/emotions.bundle.js?v=emotions-1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.endsWith(".mp3")) return;

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
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || caches.match(fallbackUrl);
  }
}

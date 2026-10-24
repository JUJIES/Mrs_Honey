/* Shared by the page and service worker. Content keys are immutable file hashes,
   independent of the shell release, so updates never discard usable lessons. */
(function (scope) {
  const CONTENT_CACHE = "lernwort-content-v1";
  const inventory = scope.LERNWORT_OFFLINE_ASSETS?.files || {};
  const base = scope.location.href;
  const pending = new Map();
  const audioUrls = new Map();

  function info(path) {
    const url = new URL(typeof path === "string" ? path : path.url, base);
    if (url.origin !== scope.location.origin) return null;
    const entry = inventory[url.pathname.replace(/^\//, "")];
    if (!entry) return null;
    // An older worker must not substitute its revision into a newer page.
    if (url.searchParams.has("asset") && url.searchParams.get("asset") !== entry.sha256) return null;
    url.search = "";
    url.hash = "";
    url.searchParams.set("asset", entry.sha256);
    return { key: url.href, entry };
  }

  function urlFor(path) { return info(path)?.key || path; }
  function audioUrl(path) { return audioUrls.get(info(path)?.key) || urlFor(path); }

  async function prepareAudio(record, response) {
    if (scope.document && record.entry.type.startsWith("audio/") && !audioUrls.has(record.key)) {
      // Also works while a previous service worker is waiting to hand over.
      // Blob URLs live for this page only; no decoded audio buffers are retained.
      const blob = await response.clone().blob();
      if (!audioUrls.has(record.key)) audioUrls.set(record.key, URL.createObjectURL(blob));
    }
    return response;
  }

  async function cached(path) {
    const record = info(path);
    if (!record || !scope.caches) return null;
    try { return (await scope.caches.open(CONTENT_CACHE)).match(record.key); }
    catch { return null; } // Private mode / denied storage: retain the online flow.
  }

  async function download(record) {
    const controller = new AbortController();
    const timer = scope.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await scope.fetch(record.key, { signal: controller.signal });
      if (response.status !== 200) throw new Error("Incomplete asset response");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== record.entry.bytes) throw new Error("Truncated asset");
      const digest = await scope.crypto.subtle.digest("SHA-256", bytes);
      const hash = [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
      if (hash !== record.entry.sha256) throw new Error("Asset revision mismatch");
      const full = new Response(bytes, { headers: {
        "Content-Type": record.entry.type,
        "Content-Length": String(bytes.byteLength),
        "Accept-Ranges": "bytes",
      } });
      try { await (await scope.caches.open(CONTENT_CACHE)).put(record.key, full.clone()); }
      catch { /* A full disk must not prevent online playback. */ }
      return full;
    } finally { scope.clearTimeout(timer); }
  }

  async function load(path) {
    const record = info(path);
    if (!record) return scope.fetch(path);
    const hit = await cached(path);
    if (hit) return prepareAudio(record, hit);
    if (!pending.has(record.key)) {
      pending.set(record.key, download(record).finally(() => pending.delete(record.key)));
    }
    return prepareAudio(record, (await pending.get(record.key)).clone());
  }

  async function invalidate(path) {
    const record = info(path);
    if (record && scope.caches) {
      try { await (await scope.caches.open(CONTENT_CACHE)).delete(record.key); } catch {}
    }
  }

  async function respond(request) {
    const full = await load(request.url);
    const range = request.headers.get("Range");
    if (!range) return full;
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) return full; // Ignore unsupported multi-ranges.
    const bytes = await full.arrayBuffer();
    const size = bytes.byteLength;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    const headers = new Headers(full.headers);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      headers.set("Content-Length", "0");
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(bytes.slice(start, end + 1), { status: 206, headers });
  }

  /* One background transfer leaves room for immediate round assets. A foreground
     job may use a second slot and promotes an already queued request. */
  function createPreloader() {
    const jobs = new Map();
    let active = 0;
    let backgroundActive = 0;
    let wanted = new Set();
    let backgroundOrder = new Map();
    let recoveryTimer = null;
    let retryDelay = 15000;
    const delay = (ms) => new Promise((resolve) => scope.setTimeout(resolve, ms));
    const visible = () => !scope.document || scope.document.visibilityState !== "hidden";

    function pump() {
      while (active < 2) {
        const next = [...jobs.values()].filter((job) => !job.running &&
          (job.urgent || (backgroundActive === 0 && visible())))
          .sort((a, b) => Number(b.urgent) - Number(a.urgent) ||
            (backgroundOrder.get(a.path) ?? Infinity) - (backgroundOrder.get(b.path) ?? Infinity))[0];
        if (!next) return;
        next.running = true;
        const background = !next.urgent;
        active += 1;
        if (background) backgroundActive += 1;
        void (async () => {
          let success = false;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try { const response = await load(next.path); success = response.ok; if (success) break; }
            catch { /* Retry a dropped connection without surfacing a download UI. */ }
            if (!next.urgent && !wanted.has(next.path)) break;
            if (scope.navigator?.onLine === false) break;
            if (attempt < 2) await delay(attempt === 0 ? 800 : 2400);
          }
          jobs.delete(next.path);
          active -= 1;
          if (background) backgroundActive -= 1;
          next.resolve(success);
          if (!success && wanted.has(next.path) && !recoveryTimer) {
            // Mobile networks can recover without navigator.onLine changing.
            recoveryTimer = scope.setTimeout(() => {
              recoveryTimer = null;
              retryDelay = Math.min(retryDelay * 2, 120000);
              resume();
            }, retryDelay);
          }
          pump();
        })();
      }
    }

    function enqueue(path, urgent = false) {
      if (!info(path)) return Promise.resolve(false);
      if (jobs.has(path)) {
        if (urgent) jobs.get(path).urgent = true;
        pump();
        return jobs.get(path).promise;
      }
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      jobs.set(path, { path, urgent, promise, resolve, running: false });
      pump();
      return promise;
    }

    function background(paths) {
      wanted = new Set(paths.filter(Boolean));
      backgroundOrder = new Map([...wanted].map((path, index) => [path, index]));
      for (const [path, job] of jobs) {
        if (!job.running && !job.urgent && !wanted.has(path)) {
          jobs.delete(path);
          job.resolve(false);
        }
      }
      return Promise.all([...wanted].map((path) => enqueue(path)));
    }

    function resume() {
      for (const path of wanted) void enqueue(path);
      pump();
    }
    scope.addEventListener?.("online", () => {
      scope.clearTimeout(recoveryTimer);
      recoveryTimer = null;
      retryDelay = 15000;
      resume();
    });
    scope.document?.addEventListener("visibilitychange", () => { if (visible()) resume(); });
    return { background, warm: (paths) => Promise.all([...new Set(paths.filter(Boolean))].map((path) => enqueue(path, true))) };
  }

  scope.LernwortAssets = { CONTENT_CACHE, urlFor, audioUrl, info, cached, load, invalidate, respond, createPreloader };
})(globalThis);

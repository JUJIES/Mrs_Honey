/* Catch a Pair runtime. Set content comes from app.js; no network or key required.
 * Geometry is pure/exported for collision tests. mount() owns all animation/audio
 * work and returns destroy(); app navigation must dispose before replacing DOM. */
(function (global) {
  "use strict";
  /* geometry-start */
  function laneGeometry(width, maxCount = 10, maxHeight = 700) {
    const target = Math.max(
      width >= 700 ? 64 : 48,
      Math.min(92, Math.floor((maxHeight - 56) / 6) - 16),
    );
    const count = Math.max(
      1,
      Math.min(maxCount, 10, Math.floor((width - 24) / (target + 24)) || 1),
    );
    const size = Math.min(target, Math.floor((width - 28) / count) - 20),
      r = size / 2 + 8,
      offset = 2 * r + 8,
      edge = r + 6;
    const top = r + 4 + offset,
      bottom = top + 2 * offset + 2 * r + 16;
    const x = Array.from({ length: count }, (_, i) =>
      count === 1 ? width / 2 : edge + (i * (width - 2 * edge)) / (count - 1),
    );
    return {
      width,
      count,
      size,
      r,
      offset,
      x,
      pitch: count > 1 ? x[1] - x[0] : size + 24,
      y: [top, bottom],
      height: bottom + offset + r + 4,
    };
  }
  function compactionPlan(g, live, held = null) {
    const lanes = [0, 1].map((lane) =>
      live.filter((p) => p.lane === lane).sort((a, b) => a.slot - b.slot),
    );
    const count = lanes[0].length;
    if (lanes[1].length !== count)
      throw Error("Each remaining pair must occupy opposite lanes.");
    const pitch = g.pitch || (g.x.length > 1 ? g.x[1] - g.x[0] : g.size + 20),
      center = g.x.length
        ? (g.x[0] + g.x[g.x.length - 1]) / 2
        : (g.railCenter ?? g.width / 2);
    const anchor = held && live.includes(held) ? held : null;
    const start = anchor
      ? g.x[anchor.slot] - lanes[anchor.lane].indexOf(anchor) * pitch
      : center - ((count - 1) * pitch) / 2;
    const x = Array.from({ length: count }, (_, i) => start + i * pitch),
      moves = [];
    lanes.forEach((lane) =>
      lane.forEach((p, slot) =>
        moves.push({
          p,
          slot,
          from: { x: g.x[p.slot], y: g.y[p.lane] },
          to: { x: x[slot], y: g.y[p.lane] },
        }),
      ),
    );
    return {
      geometry: {
        ...g,
        count,
        x,
        pitch,
        railCenter: count ? (x[0] + x[count - 1]) / 2 : center,
      },
      moves,
    };
  }
  function railBounds(g) {
    const center = g.railCenter ?? g.width / 2;
    return g.count ? [g.x[0] - g.r, g.x[g.count - 1] + g.r] : [center, center];
  }
  function roundedRoute(points, radius = 12) {
    points = points.filter(
      (p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y,
    );
    const out = [{ ...points[0] }];
    function line(p) {
      const last = out[out.length - 1],
        count = Math.max(
          1,
          Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 3),
        );
      for (let j = 1; j <= count; j++)
        out.push({
          x: last.x + ((p.x - last.x) * j) / count,
          y: last.y + ((p.y - last.y) * j) / count,
        });
    }
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1],
        b = points[i],
        c = points[i + 1],
        ab = Math.hypot(b.x - a.x, b.y - a.y),
        bc = Math.hypot(c.x - b.x, c.y - b.y),
        rad = Math.min(radius, ab / 3, bc / 3);
      const enter = {
          x: b.x + ((a.x - b.x) * rad) / ab,
          y: b.y + ((a.y - b.y) * rad) / ab,
        },
        exit = {
          x: b.x + ((c.x - b.x) * rad) / bc,
          y: b.y + ((c.y - b.y) * rad) / bc,
        };
      line(enter);
      for (let j = 1; j <= 16; j++) {
        const t = j / 16,
          u = 1 - t;
        out.push({
          x: u * u * enter.x + 2 * u * t * b.x + t * t * exit.x,
          y: u * u * enter.y + 2 * u * t * b.y + t * t * exit.y,
        });
      }
    }
    line(points[points.length - 1]);
    let length = 0;
    out.forEach((p, i) => {
      if (i) length += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y);
      p.distance = length;
    });
    return { points: out, length };
  }
  function routePoint(route, t) {
    const target = Math.max(0, Math.min(1, t)) * route.length,
      ps = route.points;
    let lo = 1,
      hi = ps.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ps[mid].distance < target) lo = mid + 1;
      else hi = mid;
    }
    const a = ps[lo - 1],
      b = ps[lo],
      u = (target - a.distance) / (b.distance - a.distance || 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  function swapRoutes(g, lane, a, b) {
    const y = g.y[lane],
      xa = g.x[a],
      xb = g.x[b],
      lift = Math.abs(a - b) === 1 ? g.r + 12 : g.offset;
    return [
      roundedRoute([
        { x: xa, y },
        { x: xa, y: y - lift },
        { x: xb, y: y - lift },
        { x: xb, y },
      ]),
      roundedRoute([
        { x: xb, y },
        { x: xb, y: y + lift },
        { x: xa, y: y + lift },
        { x: xa, y },
      ]),
    ];
  }
  function crossRoutes(g, a, b, reverse = false) {
    const xa = g.x[a],
      xb = g.x[b],
      high = g.y[0] + g.offset,
      low = g.y[1] - g.offset;
    const span = Math.max(Math.abs(xa - xb), 2 * g.r + 24),
      minX = g.r + 4,
      maxX = g.width - g.r - 4;
    const center = Math.max(
      minX + span / 2,
      Math.min(maxX - span / 2, (xa + xb) / 2),
    );
    const left = center - span / 2,
      right = center + span / 2;
    const first = reverse ? left : right,
      second = reverse ? right : left;
    return [
      roundedRoute([
        { x: xa, y: g.y[0] },
        { x: xa, y: high },
        { x: first, y: high },
        { x: first, y: low },
        { x: xb, y: low },
        { x: xb, y: g.y[1] },
      ]),
      roundedRoute([
        { x: xb, y: g.y[1] },
        { x: xb, y: low },
        { x: second, y: low },
        { x: second, y: high },
        { x: xa, y: high },
        { x: xa, y: g.y[0] },
      ]),
    ];
  }
  function shuffled(items, rng = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function swapCandidates(pieces) {
    const result = [];
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i],
          b = pieces[j];
        if (
          a.active !== false &&
          b.active !== false &&
          !a.gone &&
          !b.gone &&
          !a.locked &&
          !b.locked &&
          a.lane === b.lane
        )
          result.push([a, b]);
      }
    return result;
  }
  function routeClearance(g, routes, movers, obstacles, kind = "swap") {
    const movingRadius = kind === "swap" ? g.r : g.size / 2;
    for (let frame = 0; frame <= 700; frame++) {
      const positions = routes.map((route) => routePoint(route, frame / 700));
      const all = positions
        .map((p) => ({ ...p, r: movingRadius }))
        .concat(obstacles.map((p) => ({ ...p, r: g.r })));
      for (let a = 0; a < positions.length; a++)
        for (let b = a + 1; b < all.length; b++) {
          if (
            Math.abs(all[a].x - all[b].x) < all[a].r + all[b].r + 3.5 &&
            Math.abs(all[a].y - all[b].y) < all[a].r + all[b].r + 3.5
          )
            return false;
        }
    }
    return true;
  }
  /* geometry-end */
  // One state contract for the fixed dock; movement and feedback never create
  // a second selection model. Completed/inactive items cannot stain new slots.
  function socketState(piece, selected, movement) {
    if (!piece || !piece.active || piece.gone) return "idle";
    if (piece.feedback === "correct") return "correct";
    if (movement?.movers.includes(piece)) {
      return movement.phase === "announced" ? "pending" : "moving";
    }
    if (piece.feedback === "wrong") return "wrong";
    return piece === selected ? "selected" : "idle";
  }
  const markup = `
 <div class="pair-game" aria-label="Catch a Pair mit zwei festen Bahnen">
  <header><div><strong>Catch a Pair!</strong><span></span></div></header>
  <div class="pair-controls">
   <button type="button" class="pair-next" hidden>Nächste Tiere</button>
   <button type="button" class="pair-sound" aria-pressed="true">Ton an</button>
  </div>
  <div class="pair-board" aria-label="Sockel mit Bildern und Wörtern auswählen, um gegenüberliegende Paare zu fangen">
   <div class="pair-rail rail-top"><i class="pair-rail-line"></i><b class="pair-rail-end start"></b><b class="pair-rail-end end"></b></div>
   <div class="pair-rail rail-bottom"><i class="pair-rail-line"></i><b class="pair-rail-end start"></b><b class="pair-rail-end end"></b></div>
   <div class="pair-sockets"></div>
   <div class="pair-pieces" aria-hidden="true"></div>
   <div class="pair-particles" aria-hidden="true"></div>
   <div class="pair-finale" hidden><span class="pair-finale-star" aria-hidden="true">✦</span><strong>Alle Paare gefangen!</strong><button type="button" class="pair-replay ">Noch mal!</button></div>
  </div>
  <div class="pair-bottom">
   <div class="pair-progress" role="status"><span class="pair-count">0 / 0</span><span class="pair-count-label">Paare</span></div>
   <span class="pair-status" aria-live="polite"></span>
  </div>
 </div>
`;

  function mount(
    root,
    { items, title, urlFor = (path) => path, viewportReserve = 250 },
  ) {
    const ITEMS = items.map((item) => ({
      id: item.id,
      label: item.labels.en,
      image: item.image,
    }));
    if (!ITEMS.length)
      throw new Error("Catch a Pair requires a nonempty learning set.");
    root.classList.add("catch-pair-game");
    root.innerHTML = markup;
    const board = root.querySelector(".pair-board"),
      status = root.querySelector(".pair-status"),
      nextButton = root.querySelector(".pair-next"),
      soundButton = root.querySelector(".pair-sound"),
      socketLayer = root.querySelector(".pair-sockets");
    const timers = new Set();
    function setTimeout(fn, ms) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    }
    function clearTimeout(id) {
      window.clearTimeout(id);
      timers.delete(id);
    }
    const TOTAL = ITEMS.length,
      IDS = ITEMS.map((item) => item.id),
      completed = new Set();
    const pieces = ITEMS.flatMap((item) =>
      ["image", "word"].map((kind) => {
        const el = document.createElement("span");
        el.className = "pair-piece is-gone";
        el.dataset.id = item.id + "-" + kind;
        el.setAttribute("aria-hidden", "true");
        const body = document.createElement("span");
        body.className = "pair-body";
        const face = document.createElement(kind === "image" ? "img" : "span");
        face.className =
          "pair-face" + (kind === "image" ? " pair-picture" : "");
        if (kind === "image") {
          face.src = urlFor(item.image);
          face.alt = "";
          face.draggable = false;
          face.decoding = "async";
        } else {
          face.textContent = item.label;
          face.lang = "en";
        }
        body.append(face);
        el.append(body);
        root.querySelector(".pair-pieces").append(el);
        return {
          pair: item.id,
          kind,
          lane: 0,
          slot: 0,
          el,
          gone: false,
          active: false,
          locked: false,
          feedback: null,
        };
      }),
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let disposed = false,
      ready = false,
      automatic = true;
    let g,
      selection = null,
      busy = false,
      caught = 0,
      job = null,
      scheduled = 0,
      geometryVersion = 0,
      sound = true,
      audio = null,
      movement = null,
      capacity = 0,
      shrinkRequested = false,
      noiseBuffer = null;
    const feedbackTimers = new Map();
    function announce(text, visible = false) {
      status.textContent = text;
      status.classList.toggle("is-visible", visible);
    }
    function unlockAudio() {
      if (!sound) return;
      try {
        audio =
          audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume().catch(() => {});
      } catch (e) {
        announce("Sound ist in diesem Browser nicht verfügbar.");
      }
    }
    function note(freq, at, duration, level = 0.07, type = "sine", end = freq) {
      if (!audio || !sound || audio.state !== "running") return;
      const o = audio.createOscillator(),
        gain = audio.createGain(),
        t = audio.currentTime + at;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(end, t + 0.06);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(level, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(gain);
      gain.connect(audio.destination);
      o.start(t);
      o.stop(t + duration + 0.02);
    }
    function airSound(closing = false) {
      if (!audio || !sound || audio.state !== "running") return;
      if (!noiseBuffer) {
        noiseBuffer = audio.createBuffer(
          1,
          Math.ceil(audio.sampleRate * 0.6),
          audio.sampleRate,
        );
        const data = noiseBuffer.getChannelData(0);
        let seed = 7331;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          data[i] = (seed / 4294967296) * 2 - 1;
        }
      }
      const source = audio.createBufferSource(),
        filter = audio.createBiquadFilter(),
        gain = audio.createGain(),
        now = audio.currentTime,
        duration = closing ? 0.44 : 0.2;
      source.buffer = noiseBuffer;
      filter.type = "bandpass";
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(closing ? 1300 : 380, now);
      filter.frequency.exponentialRampToValueAtTime(
        closing ? 260 : 950,
        now + duration,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        closing ? 0.028 : 0.018,
        now + 0.04,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start(now);
      source.stop(now + duration + 0.02);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
    function soundFor(kind) {
      if (disposed || document.hidden || !sound) return;
      if (audio?.state === "suspended") {
        // Only the current selection may wait for its gesture unlock. Background
        // notices must never queue up and burst out after a later Safari tap.
        if (kind === "select") {
          const selection = selectedPiece();
          audio
            .resume()
            .then(() => {
              if (
                !disposed &&
                selectedPiece() === selection &&
                audio.state === "running"
              )
                soundFor(kind);
            })
            .catch(() => {});
        }
        return;
      }
      if (kind === "finale") {
        note(330, 0, 0.5, 0.035, "sine", 660);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          note(f, 0.55 + i * 0.13, 0.48, 0.045),
        );
        note(261.63, 0.94, 0.7, 0.04);
      } else if (kind === "select") {
        note(180, 0, 0.09, 0.1, "sine", 95);
        note(740, 0.045, 0.22, 0.038);
      } else if (kind === "release") {
        note(380, 0, 0.13, 0.05, "sine", 540);
      } else if (kind === "match") {
        note(190, 0, 0.09, 0.09, "sine", 100);
        [523.25, 659.25, 783.99].forEach((f, i) =>
          note(f, 0.025 + i * 0.055, 0.24, 0.045),
        );
      } else if (kind === "travel") {
        airSound(false);
        note(150, 0, 0.16, 0.027, "sine", 220);
      } else if (kind === "shrink") {
        airSound(true);
        note(440, 0, 0.42, 0.045, "sine", 190);
      } else if (kind === "shrinkEnd") {
        note(660, 0, 0.13, 0.028);
        note(880, 0.04, 0.16, 0.018);
      } else if (kind === "notice") {
        note(310, 0, 0.06, 0.024);
        note(390, 0.11, 0.07, 0.02);
      } else if (kind === "unlock") {
        note(540, 0, 0.1, 0.026);
      } else if (kind === "swap") {
        note(270, 0, 0.13, 0.022, "sine", 350);
      }
    }
    function updateSound() {
      soundButton.textContent = sound ? "Ton an" : "Ton aus";
      soundButton.setAttribute("aria-pressed", String(sound));
    }
    updateSound();
    function center(p) {
      return { x: g.x[p.slot], y: g.y[p.lane] };
    }
    const pieceLayer = root.querySelector(".pair-pieces");
    let restoreFocus = null;
    function selectedPiece() {
      return (
        selection &&
        pieces.find(
          (p) =>
            p.active &&
            !p.gone &&
            p.lane === selection.lane &&
            p.slot === selection.slot,
        )
      );
    }
    function occupant(socket) {
      return pieces.find(
        (p) =>
          p.active &&
          !p.gone &&
          p.lane === Number(socket.dataset.lane) &&
          p.slot === Number(socket.dataset.slot),
      );
    }
    function dockFor(p) {
      return socketLayer.children[p.lane * g.count + p.slot];
    }
    function place(p, point = center(p)) {
      p.el.style.transform = p.el.parentElement?.classList.contains(
        "pair-socket",
      )
        ? "translate3d(5px,5px,0)"
        : `translate3d(${point.x - g.size / 2}px,${point.y - g.size / 2}px,0)`;
    }
    function float(p) {
      pieceLayer.append(p.el);
      place(p);
    }
    function seat(p) {
      if (disposed || !p.active || p.gone) return;
      const dock = dockFor(p);
      if (!dock) return;
      dock.append(p.el);
      place(p);
    }
    function rattleDock(p, press = false) {
      const dock = dockFor(p);
      if (!dock || reduced) return;
      dock.getAnimations().forEach((a) => a.cancel());
      dock.animate(
        press
          ? [
              { translate: "0 0" },
              { translate: "0 1.5px", offset: 0.45 },
              { translate: "0 0" },
            ]
          : [
              { translate: "0 0" },
              { translate: "-1px 0", offset: 0.2 },
              { translate: "1px 0", offset: 0.45 },
              { translate: "-.6px 0", offset: 0.7 },
              { translate: "0 0" },
            ],
        { duration: press ? 180 : 220, easing: "ease-out" },
      );
    }
    function markSockets() {
      [...socketLayer.children].forEach((socket) => {
        const p = occupant(socket);
        socket.dataset.state = socketState(p, selectedPiece(), movement);
        const disabled =
          !ready || disposed || !p || (busy && !movement) || !!p?.locked;
        if (disabled && document.activeElement === socket) {
          restoreFocus = {
            lane: Number(socket.dataset.lane),
            slot: Number(socket.dataset.slot),
          };
        }
        socket.disabled = disabled;
        socket.setAttribute(
          "aria-pressed",
          String(!!p && p === selectedPiece()),
        );
        if (p) {
          socket.dataset.id = p.pair + "-" + p.kind;
          const label = ITEMS.find((item) => item.id === p.pair).label;
          socket.setAttribute(
            "aria-label",
            "Sockel: " + (p.kind === "image" ? "Bild " : "Wort ") + label,
          );
        } else {
          delete socket.dataset.id;
          socket.setAttribute("aria-label", "Leerer Sockel");
        }
      });
    }
    function feedback(p, kind, duration = 0) {
      clearTimeout(feedbackTimers.get(p));
      feedbackTimers.delete(p);
      p.feedback = kind;
      if (duration)
        feedbackTimers.set(
          p,
          setTimeout(() => {
            feedbackTimers.delete(p);
            p.feedback = null;
            if (!disposed) markSockets();
          }, duration),
        );
    }
    function clearFeedback() {
      feedbackTimers.forEach((id) => clearTimeout(id));
      feedbackTimers.clear();
      pieces.forEach((p) => {
        p.feedback = null;
      });
    }
    function paintRails(bounds = railBounds(g)) {
      const [left, right] = bounds;
      root.querySelectorAll(".pair-rail").forEach((rail) => {
        rail.querySelector(".pair-rail-line").style.transform =
          `translate3d(${left}px,0,0) scaleX(${Math.max(0, right - left) / g.width})`;
        rail.querySelector(".start").style.transform =
          `translate3d(${left}px,0,0)`;
        rail.querySelector(".end").style.transform =
          `translate3d(${right}px,0,0)`;
      });
    }
    function makeSockets() {
      const focused = document.activeElement?.closest?.(".pair-socket");
      if (focused && socketLayer.contains(focused))
        restoreFocus = {
          lane: Number(focused.dataset.lane),
          slot: Number(focused.dataset.slot),
        };
      // Keep insert nodes alive when rebuilding the dock grid on reflow.
      pieces.forEach((p) => {
        if (p.el.parentElement?.classList.contains("pair-socket"))
          pieceLayer.append(p.el);
      });
      socketLayer.replaceChildren();
      for (let lane = 0; lane < 2; lane++)
        for (let slot = 0; slot < g.count; slot++) {
          const socket = document.createElement("button");
          socket.type = "button";
          socket.className = "pair-socket";
          const d = g.size + 12;
          Object.assign(socket.style, {
            left: g.x[slot] - d / 2 + "px",
            top: g.y[lane] - d / 2 + "px",
            width: d + "px",
            height: d + "px",
          });
          socket.dataset.lane = lane;
          socket.dataset.slot = slot;
          socketLayer.append(socket);
        }
      pieces.forEach(seat);
      markSockets();
    }
    function layout() {
      if (disposed) return;
      geometryVersion++;
      if (job) job.cancel();
      clearFeedback();
      const base = currentGeometry(),
        reflow = !g || capacity !== base.count;
      release(false);
      capacity = base.count;
      g = base;
      if (reflow) randomizeStart();
      const plan = compactionPlan(
        g,
        pieces.filter((p) => p.active && !p.gone),
      );
      g = plan.geometry;
      plan.moves.forEach((m) => (m.p.slot = m.slot));
      board.style.setProperty("--chip-size", g.size + "px");
      board.style.height = g.height + "px";
      root.querySelector(".rail-top").style.top = g.y[0] + "px";
      root.querySelector(".rail-bottom").style.top = g.y[1] + "px";
      root.querySelector("header span").textContent = title;

      makeSockets();
      paintRails();
      pieces.forEach((p) => {
        p.el.style.width = p.el.style.height = g.size + "px";
        const label = ITEMS.find((item) => item.id === p.pair).label;
        p.el.style.setProperty(
          "--word-size",
          Math.max(
            g.size >= 64 ? 16 : 14,
            Math.min(24, (g.size - 12) / (label.length * 0.65)),
          ) + "px",
        );
        p.el.classList.remove(
          "is-moving",
          "is-lifting",
          "is-arriving",
          "is-compacting",
        );
        if (p.active && !p.gone) place(p);
      });
      busy = false;
      shrinkRequested = false;
      root.querySelector(".pair-count").textContent = `${caught} / ${TOTAL}`;
      setEnabled();
      // A resize can legitimately settle the last compaction immediately.
      // Completion belongs to the round state, not only to a RAF callback.
      if (ready && caught === TOTAL && g.count === 0) celebrateFinal();
    }
    function requestCompaction() {
      shrinkRequested = true;
      queueMicrotask(() => compactLanes());
    }
    function compactLanes() {
      if (
        disposed ||
        !ready ||
        !shrinkRequested ||
        busy ||
        movement ||
        pieces.some((p) => p.active && p.locked)
      )
        return Promise.resolve(false);
      shrinkRequested = false;
      const plan = compactionPlan(
        g,
        pieces.filter((p) => p.active && !p.gone),
        selectedPiece(),
      );
      if (plan.geometry.count === g.count) return Promise.resolve(false);
      const anchored = selectedPiece();
      const version = geometryVersion,
        old = g,
        fromBounds = railBounds(old),
        toBounds = railBounds(plan.geometry),
        game = root.querySelector(".pair-game");
      const keep = new Set(),
        socketMoves = plan.moves.map((m) => {
          const el = socketLayer.children[m.p.lane * old.count + m.p.slot];
          keep.add(el);
          return { el, dx: m.to.x - m.from.x };
        });
      const holeAnimations = [...socketLayer.children]
        .filter((el) => !keep.has(el))
        .map((el) =>
          el.animate(
            [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(.2)" },
            ],
            {
              duration: reduced ? 1 : 350,
              easing: "ease-in",
              fill: "forwards",
            },
          ),
        );
      busy = true;
      root.dataset.movePhase = "shrinking";
      game.classList.add("is-shrinking");
      plan.moves.forEach((m) => m.p.el.classList.add("is-compacting"));
      setEnabled();
      soundFor("shrink");
      announce("Ein Paar weniger · Die Bahnen ziehen sich zusammen.");
      return new Promise((resolve) => {
        let id,
          elapsed = 0,
          lastTick = null,
          done = false;
        function finish(ok) {
          if (done) return;
          done = true;
          cancelAnimationFrame(id);
          holeAnimations.forEach((a) => a.cancel());
          game.classList.remove("is-shrinking");
          plan.moves.forEach((m) => m.p.el.classList.remove("is-compacting"));
          if (ok) {
            g = plan.geometry;
            plan.moves.forEach((m) => {
              m.p.slot = m.slot;
              place(m.p);
            });
            if (selection && anchored)
              selection = { lane: anchored.lane, slot: anchored.slot };
            makeSockets();
            paintRails();
            if (caught === TOTAL) celebrateFinal();
            else soundFor("shrinkEnd");
            announce(
              caught === TOTAL
                ? "Alle Paare gefangen!"
                : g.count === 0
                  ? "Geschafft · Die nächsten Paare warten!"
                  : "Kleiner geworden · Weiter geht’s!",
            );
          } else shrinkRequested = true;
          busy = false;
          job = null;
          root.dataset.movePhase = "idle";
          setEnabled();
          resolve(ok);
        }
        job = { cancel: () => finish(false) };
        function frame(time) {
          if (disposed || version !== geometryVersion) return finish(false);
          if (lastTick !== null && !document.hidden)
            elapsed += Math.min(48, time - lastTick);
          lastTick = time;
          const t = Math.min(1, elapsed / (reduced ? 1 : 620)),
            u = 1 - Math.pow(1 - t, 3);
          plan.moves.forEach((m) =>
            place(m.p, { x: m.from.x + (m.to.x - m.from.x) * u, y: m.from.y }),
          );
          socketMoves.forEach((m) => {
            if (m.el) m.el.style.transform = `translate3d(${m.dx * u}px,0,0)`;
          });
          paintRails(fromBounds.map((v, i) => v + (toBounds[i] - v) * u));
          if (t < 1) id = requestAnimationFrame(frame);
          else finish(true);
        }
        id = requestAnimationFrame(frame);
      });
    }
    function setEnabled() {
      const any = pieces.some((p) => p.active && !p.gone);
      markSockets();
      if (restoreFocus && ready && !busy && !disposed) {
        const candidates = [...socketLayer.children].filter((s) => !s.disabled);
        const target =
          candidates.find(
            (s) =>
              Number(s.dataset.lane) === restoreFocus.lane &&
              Number(s.dataset.slot) === restoreFocus.slot,
          ) ||
          candidates
            .filter((s) => Number(s.dataset.lane) === restoreFocus.lane)
            .sort(
              (a, b) =>
                Math.abs(Number(a.dataset.slot) - restoreFocus.slot) -
                Math.abs(Number(b.dataset.slot) - restoreFocus.slot),
            )[0] ||
          candidates[0];
        restoreFocus = null;
        const focused = document.activeElement;
        if (
          focused === document.body ||
          focused === root ||
          (socketLayer.contains(focused) && focused.disabled)
        ) {
          target?.focus({ preventScroll: true });
        }
      }
      root.classList.toggle("is-between-waves", !any && caught < TOTAL);
      nextButton.disabled = busy || !ready;
      nextButton.hidden = any || caught === TOTAL;
      nextButton.textContent = "Nächste Paare";
    }
    function release(play = true) {
      if (!selection) return;
      selection = null;
      markSockets();
      if (play) soundFor("release");
    }
    function select(p) {
      release(false);
      feedback(p, null);
      selection = { lane: p.lane, slot: p.slot };
      markSockets();
      soundFor("select");
      rattleDock(p, true);
      announce("Sockel eingerastet · Wähle den passenden Sockel gegenüber.");
    }
    function animateRoutes(movers, routes, duration, kind) {
      const isChange = kind === "swap" || kind === "cross",
        version = geometryVersion;
      if (isChange && movers.includes(selectedPiece())) release(true);
      busy = true;
      movement = isChange ? { movers, phase: "announced" } : null;
      movers.forEach((p) => {
        feedback(p, null);
        p.locked = true;
        p.el.classList.add(isChange ? "is-cued" : "is-moving");
        rattleDock(p);
      });
      markSockets();
      setEnabled();
      if (isChange) {
        root.dataset.movePhase = "announced";
        announce("Diese zwei wechseln gleich · Die anderen bleiben fangbar.");
        soundFor("notice");
      }
      return new Promise((resolve) => {
        let id,
          timer,
          elapsed = 0,
          lastTick = null,
          done = false;
        function finish(value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          cancelAnimationFrame(id);
          movers.forEach((p) => {
            p.locked = false;
            p.el.classList.remove(
              "is-cued",
              "is-lifting",
              "is-moving",
              "is-arriving",
            );
            p.el.querySelector(".pair-body").style.rotate = "";
          });
          if (!value) movers.forEach(seat);
          if (isChange) movement = null;
          markSockets();
          root.dataset.movePhase = "idle";
          job = null;
          resolve(value);
        }
        job = { cancel: () => finish(false) };
        function landed() {
          if (!isChange) return finish(true);
          movement.phase = "arriving";
          markSockets();
          root.dataset.movePhase = "arriving";
          movers.forEach((p) => {
            p.el.querySelector(".pair-body").style.rotate = "";
            p.el.classList.remove("is-moving");
            p.el.classList.add("is-arriving");
          });
          soundFor("unlock");
          timer = setTimeout(() => finish(true), reduced ? 1 : 220);
        }
        function frame(time) {
          if (disposed || version !== geometryVersion) return finish(false);
          if (lastTick !== null && !document.hidden)
            elapsed += Math.min(48, time - lastTick);
          lastTick = time;
          const t = Math.min(1, elapsed / (reduced ? 1 : duration)),
            u = 0.5 - Math.cos(t * Math.PI) / 2;
          movers.forEach((p, i) => {
            const point = routePoint(routes[i], u);
            place(p, point);
            if (isChange && !reduced) {
              const ahead = routePoint(routes[i], Math.min(1, u + 0.012)),
                lean =
                  Math.max(-1.5, Math.min(1.5, (ahead.x - point.x) * 0.8)) *
                  Math.sin(Math.PI * t);
              p.el.querySelector(".pair-body").style.rotate = lean + "deg";
            }
          });
          if (t < 1) id = requestAnimationFrame(frame);
          else landed();
        }
        function begin() {
          if (disposed || version !== geometryVersion) return finish(false);
          if (isChange) {
            movement.phase = "moving";
            markSockets();
            root.dataset.movePhase = "moving";
            announce(
              "Unterwegs und gesperrt · Andere Paare kannst du weiter fangen.",
            );
            soundFor("travel");
          }
          movers.forEach((p) => {
            p.el.classList.remove("is-lifting");
            p.el.classList.add("is-moving");
          });
          id = requestAnimationFrame(frame);
        }
        function lift() {
          if (disposed || version !== geometryVersion) return finish(false);
          movement.phase = "lifting";
          root.dataset.movePhase = "lifting";
          markSockets();
          movers.forEach((p) => {
            dockFor(p)
              ?.getAnimations()
              .forEach((a) => a.cancel());
            float(p);
            p.el.classList.remove("is-cued");
            p.el.classList.add("is-lifting");
          });
          timer = setTimeout(begin, reduced ? 1 : 180);
        }
        timer = setTimeout(lift, reduced ? 1 : 700);
      });
    }
    async function swap(quiet = false) {
      if (disposed || !ready || document.hidden || busy || caught === TOTAL)
        return false;
      let plan = null;
      for (const [a, b] of shuffled(swapCandidates(pieces))) {
        const movers = Math.random() < 0.5 ? [b, a] : [a, b],
          routes = swapRoutes(g, a.lane, movers[0].slot, movers[1].slot),
          obstacles = pieces
            .filter((p) => p.active && !p.gone && p !== a && p !== b)
            .map(center);
        if (routeClearance(g, routes, movers, obstacles)) {
          plan = { a, b, movers, routes };
          break;
        }
      }
      if (!plan) {
        if (!quiet) announce("Momentan ist kein freier Platztausch möglich.");
        return false;
      }
      const { a, b, movers, routes } = plan;
      root.dataset.lastMove = `lane-${a.lane}:${a.slot}-${b.slot}`;
      announce(
        selectedPiece()
          ? "Die Auswahl bleibt fest · Zufällig gewählte Chips ziehen vorbei."
          : "Zufälliger Tausch · Auch direkte Nachbarn sind dabei.",
      );
      if (
        await animateRoutes(
          movers,
          routes,
          Math.max(
            650,
            Math.min(1700, Math.max(...routes.map((r) => r.length)) * 2),
          ),
          "swap",
        )
      ) {
        [a.slot, b.slot] = [b.slot, a.slot];
        seat(a);
        seat(b);
        announce(
          selectedPiece()
            ? "Weiter festgehalten · Jetzt den Partner fangen."
            : "Wieder eingerastet · Wähle einen Sockel.",
        );
      }
      if (disposed) return false;
      busy = false;
      setEnabled();
      if (shrinkRequested) requestCompaction();
      return true;
    }
    async function cross(quiet = false) {
      if (disposed || !ready || document.hidden || busy || caught === TOTAL)
        return false;
      const available = IDS.map((pair) =>
        pieces.filter((p) => p.pair === pair && p.active && !p.gone),
      ).filter((pair) => pair.length === 2 && pair.every((p) => !p.locked));
      let plan = null;
      for (const pair of shuffled(available)) {
        const a = pair.find((p) => p.lane === 0),
          b = pair.find((p) => p.lane === 1),
          obstacles = pieces
            .filter((p) => p.active && !p.gone && p !== a && p !== b)
            .map(center);
        const routes = crossRoutes(g, a.slot, b.slot, Math.random() < 0.5);
        if (routeClearance(g, routes, [a, b], obstacles)) {
          plan = { a, b, routes };
          break;
        }
      }
      if (!plan) {
        if (!quiet)
          announce("Die ausgewählte Paarung bleibt auf ihren Bahnen.");
        return false;
      }
      const { a, b, routes } = plan,
        oldA = { lane: a.lane, slot: a.slot },
        oldB = { lane: b.lane, slot: b.slot };
      root.dataset.lastMove = `cross:${a.pair}:${a.slot}-${b.slot}`;
      announce(
        "Kurzer Bahnwechsel · Beide gleiten direkt auf getrennten Bögen.",
      );
      if (
        await animateRoutes(
          [a, b],
          routes,
          Math.max(
            850,
            Math.min(1800, Math.max(...routes.map((r) => r.length)) * 1.8),
          ),
          "cross",
        )
      ) {
        a.lane = oldB.lane;
        a.slot = oldB.slot;
        b.lane = oldA.lane;
        b.slot = oldA.slot;
        seat(a);
        seat(b);
        announce(
          selectedPiece()
            ? "Die Auswahl bleibt eingerastet · Die anderen haben die Bahnen gewechselt."
            : "Beide Bahnen sind gemischt · Der Partner bleibt gegenüber.",
        );
      }
      if (disposed) return false;
      busy = false;
      markSockets();
      setEnabled();
      if (shrinkRequested) requestCompaction();
      return true;
    }
    function particles(x, y) {
      const layer = root.querySelector(".pair-particles");
      for (let i = 0; i < 12; i++) {
        const cloud = i < 8,
          e = document.createElement("span");
        e.className = cloud ? "pair-puff" : "pair-particle";
        e.style.left = x + "px";
        e.style.top = y + "px";
        layer.append(e);
        const angle = i * 2.39996,
          d = cloud ? 18 + (i % 4) * 6 : 35 + (i % 3) * 7,
          dx = Math.cos(angle) * d,
          dy = Math.sin(angle) * d;
        const frames = cloud
          ? [
              { transform: "scale(.25)", opacity: 0 },
              {
                transform: `translate(${dx * 0.35}px,${dy * 0.35}px) scale(1.1)`,
                opacity: 0.75,
                offset: 0.32,
              },
              {
                transform: `translate(${dx}px,${dy}px) scale(1.65)`,
                opacity: 0,
              },
            ]
          : [
              { transform: "scale(.3)", opacity: 0 },
              { transform: "scale(.8)", opacity: 1, offset: 0.2 },
              {
                transform: `translate(${dx}px,${dy}px) rotate(${i * 41}deg) scale(.1)`,
                opacity: 0,
              },
            ];
        e.animate(frames, {
          duration: reduced ? 1 : 420 + (i % 3) * 35,
          easing: "ease-out",
        })
          .finished.then(() => e.remove())
          .catch(() => e.remove());
      }
    }
    async function puffPair(a, b) {
      const version = geometryVersion;
      release(false);
      [a, b].forEach((p) => {
        feedback(p, "correct");
        p.locked = true;
        p.el.classList.add("is-collecting");
      });
      markSockets();
      setEnabled();
      const animations = [a, b].map((p) =>
        p.el.querySelector(".pair-body").animate(
          [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(.88,.94)", opacity: 1, offset: 0.28 },
            { transform: "scale(.98)", opacity: 0.9, offset: 0.4 },
            { transform: "scale(.55)", opacity: 0.25, offset: 0.64 },
            { transform: "scale(.12)", opacity: 0 },
          ],
          {
            duration: reduced ? 1 : 300,
            easing: "cubic-bezier(.3,0,.45,1)",
            fill: "forwards",
          },
        ),
      );
      // The puff starts as the solid chip disappears; rails stay neutral throughout.
      const puffTimer = setTimeout(
        () => {
          if (!disposed && version === geometryVersion) {
            soundFor("match");
            [a, b].forEach((p) => {
              const c = center(p);
              particles(c.x, c.y);
            });
          }
        },
        reduced ? 0 : 100,
      );
      await Promise.all(
        animations.map((animation) => animation.finished.catch(() => {})),
      );
      clearTimeout(puffTimer);
      if (disposed || version !== geometryVersion) {
        animations.forEach((animation) => animation.cancel());
        [a, b].forEach((p) => {
          p.locked = false;
          p.el.classList.remove("is-collecting");
          feedback(p, null);
        });
        markSockets();
        setEnabled();
        return false;
      }
      return true;
    }
    async function match(a, b) {
      if (movement) return catchDuringMove(a, b);
      if (busy) return;
      busy = true;
      announce("Gefangen!");
      const finished = await puffPair(a, b);
      busy = false;
      if (finished) completePair(a, b);
      else setEnabled();
    }
    function completePair(a, b) {
      if (disposed || a.gone || b.gone) return;
      [a, b].forEach((p) => {
        p.gone = true;
        p.active = false;
        p.locked = false;
        p.el.classList.add("is-gone");
        p.el.classList.remove("is-moving", "is-collecting");
      });
      completed.add(a.pair);
      caught++;
      root.querySelector(".pair-count").textContent = `${caught} / ${TOTAL}`;
      setEnabled();
      if (caught === TOTAL) {
        automatic = false;
        clearTimeout(scheduled);
        announce("Alle Paare gefangen!");
      } else announce("Ein Paar gefangen · Die Bahn wird kürzer.");
      requestCompaction();
    }
    async function catchDuringMove(a, b) {
      if (await puffPair(a, b)) completePair(a, b);
    }
    socketLayer.addEventListener("click", (event) => {
      const dock = event.target.closest(".pair-socket");
      if (!dock || !socketLayer.contains(dock) || dock.disabled) return;
      const p = occupant(dock);
      if (!p) return;
      unlockAudio();
      const current = selectedPiece();
      if (current === p) {
        release();
        announce("Sockel wieder frei.");
      } else if (
        current &&
        current.lane !== p.lane &&
        current.pair === p.pair
      ) {
        void match(current, p);
      } else if (current && current.lane !== p.lane) {
        feedback(p, "wrong", 480);
        markSockets();
        rattleDock(p);
        announce("Noch nicht der passende Sockel · Deine Auswahl bleibt fest.");
      } else select(p);
    });
    function randomizeStart() {
      const remaining = shuffled(IDS.filter((id) => !completed.has(id))),
        names = remaining.slice(0, g.count),
        orientations = shuffled(names.map((_, i) => i % 2)),
        slots = [
          shuffled(g.x.map((_, i) => i)),
          shuffled(g.x.map((_, i) => i)),
        ],
        used = [0, 0];
      pieces.forEach((p) => {
        p.active = false;
        p.el.classList.add("is-gone");
      });
      names.forEach((name, i) =>
        pieces
          .filter((p) => p.pair === name)
          .forEach((p) => {
            p.lane = p.kind === "image" ? orientations[i] : 1 - orientations[i];
            p.slot = slots[p.lane][used[p.lane]++];
            p.active = true;
            p.el.classList.remove("is-gone");
          }),
      );
    }
    function celebrateFinal() {
      const finale = root.querySelector(".pair-finale"),
        layer = root.querySelector(".pair-particles");
      const x = g.railCenter,
        y = (g.y[0] + g.y[1]) / 2,
        radius = Math.min(160, g.width * 0.39);
      if (!finale.hidden || disposed) return;
      finale.hidden = false;
      announce("Alle Paare gefangen!");
      soundFor("finale");
      // The two remaining rail dots meet first; their shared center creates one vortex.
      root.querySelectorAll(".pair-rail").forEach((rail, lane) => {
        rail.querySelector(".end").animate([{ opacity: 0 }, { opacity: 0 }], {
          duration: 1,
          fill: "forwards",
        });
        const dot = rail.querySelector(".start"),
          dy = y - g.y[lane],
          direction = lane === 0 ? 1 : -1;
        const frames = Array.from({ length: 13 }, (_, step) => {
          const t = step / 12,
            u = 0.5 - Math.cos(Math.PI * t) / 2;
          return {
            transform: `translate3d(${x + direction * Math.sin(Math.PI * t) * 26}px,${dy * u}px,0) scale(${1 + Math.sin(Math.PI * t) * 1.3})`,
            opacity: t === 1 ? 0 : 1,
          };
        });
        dot.animate(frames, {
          duration: reduced ? 1 : 600,
          fill: "forwards",
          easing: "linear",
        });
      });
      const core = document.createElement("span");
      core.className = "pair-finale-core";
      core.style.left = x + "px";
      core.style.top = y + "px";
      layer.append(core);
      core
        .animate(
          [
            { transform: "scale(.1)", opacity: 0 },
            { transform: "scale(.8)", opacity: 0.9, offset: 0.15 },
            { transform: "scale(2.6)", opacity: 0.5, offset: 0.5 },
            { transform: "scale(3.3)", opacity: 0 },
          ],
          {
            duration: reduced ? 1 : 1050,
            delay: reduced ? 0 : 520,
            fill: "both",
            easing: "ease-out",
          },
        )
        .finished.then(() => core.remove())
        .catch(() => core.remove());
      for (let i = 0; i < 56; i++) {
        const e = document.createElement("span");
        e.className = "pair-finale-spark";
        e.textContent = "✦";
        e.style.left = x + "px";
        e.style.top = y + "px";
        e.style.fontSize = (i % 7 === 0 ? 26 : 12 + (i % 4) * 3) + "px";
        layer.append(e);
        const frames = Array.from({ length: 25 }, (_, step) => {
          const t = step / 24,
            angle = i * 2.39996 + t * 7.5,
            r = (6 + Math.pow(t, 0.8) * radius) * (0.62 + (i % 5) * 0.095),
            scale =
              Math.sin(Math.PI * Math.pow(t, 0.65)) * (i % 7 === 0 ? 1.3 : 1);
          return {
            transform: `translate(${Math.cos(angle) * r}px,${Math.sin(angle) * r * 0.82}px) rotate(${t * 210}deg) scale(${scale})`,
            opacity: Math.min(1, t * 9) * (1 - Math.pow(t, 3)),
          };
        });
        e.animate(frames, {
          duration: reduced ? 1 : 1250 + (i % 4) * 65,
          delay: reduced ? 0 : 540 + (i % 3) * 18,
          fill: "both",
          easing: "linear",
        })
          .finished.then(() => e.remove())
          .catch(() => e.remove());
      }
      finale.animate(
        [
          { opacity: 0, transform: "translateY(12px) scale(.96)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: reduced ? 1 : 350,
          delay: reduced ? 0 : 1750,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "both",
        },
      );
    }
    function reset() {
      geometryVersion++;
      automatic = true;
      root.querySelector(".pair-finale").hidden = true;
      root
        .querySelector(".pair-finale")
        .getAnimations()
        .forEach((a) => a.cancel());
      root
        .querySelectorAll(".pair-rail-end")
        .forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      root.querySelector(".pair-particles").replaceChildren();
      if (job) job.cancel();
      shrinkRequested = false;
      release(false);
      completed.clear();
      caught = 0;
      pieces.forEach((p) => {
        p.gone = false;
        p.locked = false;
        p.el.classList.remove(
          "is-moving",
          "is-collecting",
          "is-cued",
          "is-arriving",
        );
        p.el
          .querySelector(".pair-body")
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .forEach((a) => a.cancel());
      });
      g = currentGeometry();
      randomizeStart();
      root.querySelector(".pair-count").textContent = `0 / ${TOTAL}`;
      layout();
      announce("Neu gemischt · Wähle einen Sockel.");
      void entrance();
      scheduleAutomatic();
    }
    function nextWave() {
      if (!ready || disposed || busy) return;
      unlockAudio();
      g = currentGeometry();
      randomizeStart();
      layout();
      const center = g.width / 2;
      root.querySelectorAll(".pair-rail").forEach((rail) => {
        const line = rail.querySelector(".pair-rail-line");
        line.animate(
          [
            { transform: `translate3d(${center}px,0,0) scaleX(0)` },
            { transform: line.style.transform },
          ],
          { duration: reduced ? 1 : 300, easing: "ease-out" },
        );
      });
      soundFor("shrinkEnd");
      announce("Fang die nächsten Paare.");
      void entrance();
    }
    async function automaticStep() {
      if (!automatic) return;
      if (!disposed && ready && !document.hidden && !busy && caught < TOTAL) {
        const action = Math.random() < 0.35 ? cross : swap,
          alternative = action === cross ? swap : cross;
        if (!(await action(true)) && automatic) await alternative(true);
      }
      scheduleAutomatic();
    }

    function currentGeometry() {
      const width = board.getBoundingClientRect().width;
      const maxHeight = Math.max(
        430,
        Math.min(700, window.innerHeight - viewportReserve),
      );
      return laneGeometry(width, TOTAL, maxHeight);
    }
    function entrance() {
      const version = geometryVersion,
        inserts = pieces.filter((p) => p.active && !p.gone);
      busy = true;
      root.dataset.movePhase = "entering";
      setEnabled();
      const animations = inserts.map((p) => {
        float(p);
        p.el.classList.add("is-moving");
        const c = center(p),
          dy = p.lane === 0 ? -g.y[0] - g.size : g.height - g.y[1] + g.size;
        return p.el.animate(
          [
            {
              transform: `translate3d(${c.x - g.size / 2}px,${c.y - g.size / 2 + dy}px,0)`,
              opacity: 0,
            },
            {
              transform: `translate3d(${c.x - g.size / 2}px,${c.y - g.size / 2}px,0)`,
              opacity: 1,
            },
          ],
          {
            duration: reduced ? 1 : 480,
            delay: reduced ? 0 : p.slot * 45,
            easing: "cubic-bezier(.2,.75,.2,1)",
            fill: "backwards",
          },
        );
      });
      return new Promise((resolve) => {
        let timer,
          done = false;
        function finish(ok) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          animations.forEach((a) => a.cancel());
          inserts.forEach((p) => {
            p.el.classList.remove("is-moving", "is-arriving");
            seat(p);
          });
          busy = false;
          job = null;
          root.dataset.movePhase = "idle";
          setEnabled();
          resolve(ok);
        }
        job = { cancel: () => finish(false) };
        Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(
          () => {
            if (done) return;
            if (disposed || version !== geometryVersion) return finish(false);
            root.dataset.movePhase = "arriving";
            inserts.forEach((p) => {
              p.el.classList.remove("is-moving");
              p.el.classList.add("is-arriving");
            });
            soundFor("unlock");
            timer = setTimeout(() => finish(true), reduced ? 1 : 220);
          },
        );
      });
    }
    function scheduleAutomatic() {
      clearTimeout(scheduled);
      if (!disposed && ready && automatic && !document.hidden)
        scheduled = setTimeout(automaticStep, 2200 + Math.random() * 1800);
    }
    function visibility() {
      root.classList.toggle("is-paused", document.hidden);
      if (document.hidden) {
        clearTimeout(scheduled);
        if (audio?.state === "running") void audio.suspend().catch(() => {});
      } else scheduleAutomatic();
    }
    root.querySelector(".pair-replay").addEventListener("click", () => {
      unlockAudio();
      reset();
    });
    nextButton.addEventListener("click", () => nextWave());
    soundButton.addEventListener("click", () => {
      sound = !sound;
      updateSound();
      if (sound) {
        unlockAudio();
        soundFor("select");
      } else if (audio?.state === "running")
        void audio.suspend().catch(() => {});
    });
    let lastSize =
      board.getBoundingClientRect().width + ":" + window.innerHeight;
    const resize = new ResizeObserver(() => {
      const size =
        board.getBoundingClientRect().width + ":" + window.innerHeight;
      if (board.getBoundingClientRect().width > 0 && size !== lastSize) {
        lastSize = size;
        layout();
      }
    });
    resize.observe(board);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", visibility);
    function onResize() {
      const size =
        board.getBoundingClientRect().width + ":" + window.innerHeight;
      if (size !== lastSize) {
        lastSize = size;
        layout();
      }
    }
    async function start() {
      layout();
      setEnabled();
      announce("Bilder laden …", true);
      try {
        await Promise.all(
          [...root.querySelectorAll(".pair-picture")].map((img) =>
            img.decode(),
          ),
        );
        if (disposed) return;
        ready = true;
        setEnabled();
        announce("Fange Bild und Wort auf gegenüberliegenden Bahnen.");
        await entrance();
        scheduleAutomatic();
      } catch {
        if (disposed) return;
        announce(
          "Bilder konnten nicht geladen werden. Bitte erneut versuchen.",
          true,
        );
        nextButton.hidden = false;
        nextButton.disabled = false;
        nextButton.textContent = "Erneut laden";
        nextButton.onclick = () => {
          nextButton.onclick = null;
          root.querySelectorAll(".pair-picture").forEach((img) => {
            if (!img.naturalWidth) {
              const url = new URL(img.src, document.baseURI);
              url.searchParams.set("retry", Date.now());
              img.src = url.href;
            }
          });
          void start();
        };
      }
    }
    void start();
    return {
      destroy() {
        if (disposed) return;
        disposed = true;
        ready = false;
        geometryVersion++;
        automatic = false;
        if (job) job.cancel();
        release(false);
        clearFeedback();
        markSockets();
        timers.forEach((id) => window.clearTimeout(id));
        timers.clear();
        resize.disconnect();
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", visibility);
        root
          .querySelectorAll("*")
          .forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
        if (audio) void audio.close().catch(() => {});
      },
    };
  }
  const api = {
    mount,
    laneGeometry,
    compactionPlan,
    railBounds,
    roundedRoute,
    routePoint,
    swapRoutes,
    crossRoutes,
    routeClearance,
    swapCandidates,
    socketState,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.LernwortCatchPair = api;
})(typeof window !== "undefined" ? window : globalThis);

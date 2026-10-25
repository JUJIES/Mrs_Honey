/* Word Blaster: fixed-step, swept laser physics + disposable Canvas controller.
 * Set items remain authoritative. No generated audio, network API or dependencies. */
(function (global) {
  "use strict";
  const EPS = 1e-6,
    STEP = 1 / 120,
    MAX_ANGLE = (75 * Math.PI) / 180;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const CANNON_ASSETS = Object.freeze({
    base: "assets/images/word_blaster/cannon-base-v2.png",
    barrel: "assets/images/word_blaster/cannon-barrel-v2.png",
    mount: "assets/images/word_blaster/cannon-mount-v2.png",
    flash: "assets/images/word_blaster/muzzle-flash-v1.png",
  });
  const CANNON = Object.freeze({
    muzzleDistance: 63.5,
    baseRect: Object.freeze([-52, -13, 104, 70.306]),
    barrelRect: Object.freeze([-21, -75, 42, 78.565]),
    mountRect: Object.freeze([-36.75, -19.2, 73.5, 46.131]),
    recoilDuration: 0.22,
    recoilTravel: 5,
    recoilOvershoot: 0.6,
    flashDuration: 0.16,
    flashCell: 192,
  });
  // The painted lens center is the shared origin for guide, pulse and flash.
  // Recoil only moves the barrel along its own axis; the pedestal never rotates.
  function cannonPose(origin, angle, remaining = 0, reduced = false) {
    const elapsed =
      CANNON.recoilDuration - clamp(remaining, 0, CANNON.recoilDuration);
    const phase = elapsed / CANNON.recoilDuration;
    const kick =
      reduced || remaining <= 0
        ? 0
        : phase < 0.7
          ? CANNON.recoilTravel * Math.sin((phase / 0.7) * Math.PI)
          : -CANNON.recoilOvershoot * Math.sin(((phase - 0.7) / 0.3) * Math.PI);
    const reach = CANNON.muzzleDistance - kick;
    return {
      kick,
      muzzle: {
        x: origin.x + Math.sin(angle) * reach,
        y: origin.y - Math.cos(angle) * reach,
      },
      flashFrame:
        remaining > 0 && elapsed < CANNON.flashDuration
          ? reduced
            ? 0
            : Math.min(3, Math.floor((elapsed / CANNON.flashDuration) * 4))
          : -1,
      flashAlpha: reduced
        ? 0.55 * Math.max(0, 1 - elapsed / CANNON.flashDuration)
        : 1,
    };
  }
  // Depth order is part of the joint: the stationary front bearing covers the
  // barrel root throughout rotation and axial recoil. Do not flatten these layers.
  function drawCannon(ctx, art, origin, angle, remaining = 0, reduced = false) {
    if (!Object.keys(CANNON_ASSETS).every((key) => art.has(key))) return;
    const pose = cannonPose(origin, angle, remaining, reduced);
    const [bx, by, bw, bh] = CANNON.baseRect;
    ctx.drawImage(art.get("base"), origin.x + bx, origin.y + by, bw, bh);
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(angle);
    ctx.translate(0, pose.kick);
    ctx.drawImage(art.get("barrel"), ...CANNON.barrelRect);
    ctx.restore();
    const [mx, my, mw, mh] = CANNON.mountRect;
    ctx.drawImage(art.get("mount"), origin.x + mx, origin.y + my, mw, mh);
    if (pose.flashFrame >= 0) {
      const cell = CANNON.flashCell,
        f = pose.flashFrame;
      ctx.save();
      ctx.translate(pose.muzzle.x, pose.muzzle.y);
      ctx.rotate(angle);
      ctx.globalAlpha = pose.flashAlpha;
      ctx.drawImage(
        art.get("flash"),
        (f % 2) * cell,
        Math.floor(f / 2) * cell,
        cell,
        cell,
        -30,
        -30,
        60,
        60,
      );
      ctx.restore();
    }
  }
  // Relative dragging preserves the current angle on contact. Returning into
  // the dead zone disarms release; gesture speed never changes shot power.
  function dragAim(start, x, width) {
    const dx = x - start.x,
      deadZone = 10;
    const travel = Math.max(0, Math.abs(dx) - deadZone);
    return {
      armed: Math.abs(dx) > deadZone,
      angle: clamp(
        start.angle +
          (Math.sign(dx) * travel * MAX_ANGLE) / clamp(width * 0.28, 80, 180),
        -MAX_ANGLE,
        MAX_ANGLE,
      ),
    };
  }
  // Pointer capture lets a finger drift just beyond the painted edge. Keep a
  // small touch-only release gutter; mouse/stylus and far-away releases stay strict.
  function dragReleaseInside(point, bounds, pointerType) {
    const side = pointerType === "touch" ? 24 : 0,
      bottom = pointerType === "touch" ? 40 : 0;
    return (
      point.x >= bounds.left - side && point.x <= bounds.right + side &&
      point.y >= bounds.top - side && point.y <= bounds.bottom + bottom
    );
  }
  function wallHit(p, bounds) {
    const tx =
      p.vx > EPS
        ? (bounds.right - p.x) / p.vx
        : p.vx < -EPS
          ? (bounds.left - p.x) / p.vx
          : Infinity;
    const ty =
      p.vy > EPS
        ? (bounds.bottom - p.y) / p.vy
        : p.vy < -EPS
          ? (bounds.top - p.y) / p.vy
          : Infinity;
    const time = Math.max(0, Math.min(tx, ty));
    return {
      time,
      flipX: Number.isFinite(tx) && Math.abs(tx - time) < EPS,
      flipY: Number.isFinite(ty) && Math.abs(ty - time) < EPS,
    };
  }
  function circleHit(p, target, maxTime) {
    const x = p.x - target.x,
      y = p.y - target.y;
    const vx = p.vx - target.vx,
      vy = p.vy - target.vy;
    const r = target.r + 3,
      c = x * x + y * y - r * r;
    if (c <= 0) return 0;
    const a = vx * vx + vy * vy,
      b = 2 * (x * vx + y * vy),
      d = b * b - 4 * a * c;
    if (a < EPS || d < 0) return Infinity;
    const t = (-b - Math.sqrt(d)) / (2 * a);
    return t >= -EPS && t <= maxTime + EPS ? Math.max(0, t) : Infinity;
  }
  // Every subsegment is tested, including the distance after a wall reflection.
  function advanceShot(shot, targets, bounds, dt) {
    const events = [];
    let remaining = dt,
      elapsed = 0;
    for (let guard = 0; remaining > EPS && !shot.dead && guard < 8; guard++) {
      const wall = wallHit(shot, bounds);
      let time = Math.min(remaining, wall.time),
        hit = null;
      for (const t of targets) {
        const moving = {
          ...t,
          x: t.x + t.vx * elapsed,
          y: t.y + t.vy * elapsed,
        };
        const contact = circleHit(shot, moving, time);
        if (contact <= time && contact !== Infinity) {
          time = contact;
          hit = moving;
        }
      }
      shot.x += shot.vx * time;
      shot.y += shot.vy * time;
      elapsed += time;
      remaining -= time;
      if (hit) {
        shot.dead = true;
        events.push({
          type: "target",
          target: hit,
          x: shot.x,
          y: shot.y,
          bounces: shot.bounces,
        });
      } else if (wall.time <= time + EPS) {
        if (shot.bounces >= 2) {
          shot.dead = true;
          events.push({ type: "expire", x: shot.x, y: shot.y });
        } else {
          if (wall.flipX) shot.vx *= -1;
          if (wall.flipY) shot.vy *= -1;
          shot.bounces++;
          events.push({ type: "wall", x: shot.x, y: shot.y });
          shot.x = clamp(shot.x, bounds.left + EPS, bounds.right - EPS);
          shot.y = clamp(shot.y, bounds.top + EPS, bounds.bottom - EPS);
        }
      } else break;
    }
    return events;
  }
  function aimPath(origin, angle, bounds) {
    const p = { ...origin, vx: Math.sin(angle), vy: -Math.cos(angle) },
      points = [{ ...origin }];
    for (let i = 0; i < 2; i++) {
      const w = wallHit(p, bounds);
      p.x += p.vx * w.time;
      p.y += p.vy * w.time;
      points.push({ x: p.x, y: p.y });
      if (w.flipX) p.vx *= -1;
      if (w.flipY) p.vy *= -1;
      p.x = clamp(p.x, bounds.left + EPS, bounds.right - EPS);
      p.y = clamp(p.y, bounds.top + EPS, bounds.bottom - EPS);
    }
    return points;
  }
  const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({
      id: "easy",
      label: "Leicht",
      description: "Große Bilder · ruhige Bewegung · volle Zielhilfe",
      scale: 1,
      speed: 0.85,
      aimSlow: 0.55,
      guide: "bounce",
      limit: 4,
    }),
    medium: Object.freeze({
      id: "medium",
      label: "Mittel",
      description: "Etwas kleiner · schneller · Zielhilfe bis zur Wand",
      scale: 0.88,
      speed: 1.35,
      aimSlow: 0.75,
      guide: "wall",
      limit: 5,
    }),
    hard: Object.freeze({
      id: "hard",
      label: "Knifflig",
      description: "Kleinere Bilder · flinke Bewegung · kurze Zielhilfe",
      scale: 0.76,
      speed: 1.85,
      aimSlow: 1,
      guide: "short",
      limit: 6,
    }),
  });
  const CHALLENGE_MS = 60000,
    SCORE_PER_HIT = 10,
    SCORE_PER_BOUNCE = 5;
  function pointsForHit(bounces = 0) {
    return Number.isInteger(bounces) && bounces >= 0 && bounces <= 2
      ? SCORE_PER_HIT + bounces * SCORE_PER_BOUNCE
      : 0;
  }
  function difficultyFor(id) {
    return Object.hasOwn(DIFFICULTIES, id)
      ? DIFFICULTIES[id]
      : DIFFICULTIES.easy;
  }
  function shuffled(items, random = Math.random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function startChallenge(round, now) {
    if (round.mode === "challenge" && !round.ended && round.deadline === null)
      round.deadline = now + CHALLENGE_MS;
  }
  function timeLeft(round, now) {
    return round.mode === "challenge"
      ? Math.max(
          0,
          Math.min(
            CHALLENGE_MS,
            round.deadline === null ? CHALLENGE_MS : round.deadline - now,
          ),
        )
      : null;
  }
  function expireChallenge(round, now) {
    if (
      round.mode !== "challenge" ||
      round.ended ||
      round.deadline === null ||
      now < round.deadline
    )
      return false;
    round.ended = true;
    round.prompt = null;
    round.shots = [];
    round.generation++;
    return true;
  }
  function safeStorage() {
    try {
      return global.localStorage || null;
    } catch {
      return null;
    }
  }
  function scoreKey(setId, level) {
    return (
      "lernwort.word-blaster.challenge.v2:" +
      encodeURIComponent(String(setId).slice(0, 80)) +
      ":" +
      difficultyFor(level).id
    );
  }
  function cleanName(value) {
    return Array.from(
      String(value)
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
      .slice(0, 20)
      .join("");
  }
  function validScore(entry) {
    return (
      entry &&
      typeof entry.name === "string" &&
      cleanName(entry.name) &&
      Number.isInteger(entry.score) &&
      entry.score >= 0 &&
      entry.score <= 4000 &&
      entry.score % SCORE_PER_BOUNCE === 0 &&
      Number.isInteger(entry.hits) &&
      entry.hits >= 0 &&
      entry.hits <= 200 &&
      entry.score >= entry.hits * SCORE_PER_HIT &&
      entry.score <= entry.hits * pointsForHit(2) &&
      Number.isSafeInteger(entry.at) &&
      entry.at >= 0
    );
  }
  function readHighscores(setId, level, storage = safeStorage()) {
    try {
      const raw = storage?.getItem(scoreKey(setId, level));
      if (!raw || raw.length > 50000) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .filter(validScore)
        .map((e) => ({
          name: cleanName(e.name),
          score: e.score,
          hits: e.hits,
          at: e.at,
        }))
        .sort((a, b) => b.score - a.score || a.at - b.at)
        .slice(0, 10);
    } catch {
      return [];
    }
  }
  function saveHighscore(setId, level, entry, storage = safeStorage()) {
    if (!storage || !validScore(entry)) return { ok: false, entries: [] };
    const fresh = {
      name: cleanName(entry.name),
      score: entry.score,
      hits: entry.hits,
      at: entry.at,
    };
    const entries = [...readHighscores(setId, level, storage), fresh]
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, 10);
    const rank = entries.indexOf(fresh);
    try {
      storage.setItem(scoreKey(setId, level), JSON.stringify(entries));
      return { ok: true, rank: rank < 0 ? null : rank + 1, entries };
    } catch {
      return { ok: false, entries: readHighscores(setId, level, storage) };
    }
  }
  function renderHighscores(root, entries) {
    root.replaceChildren();
    if (!entries.length) {
      const p = document.createElement("p");
      p.textContent = "Noch kein Highscore. Fang an!";
      root.append(p);
      return;
    }
    const list = document.createElement("ol");
    for (const entry of entries) {
      const li = document.createElement("li"),
        name = document.createElement("span"),
        score = document.createElement("strong");
      name.textContent = entry.name;
      score.textContent = entry.score + " Punkte";
      li.append(name, score);
      list.append(li);
    }
    root.append(list);
  }
  function geometry(width, height, level = "easy") {
    const profile = difficultyFor(level);
    const r = Math.max(26, Math.round((width < 500 ? 32 : 43) * profile.scale));
    const bounds = {
      left: 12,
      top: 12,
      right: width - 12,
      bottom: height - 12,
    };
    // Derive floor seating, capsule clearance and hit area from the actual art
    // envelope so a future art change cannot leave a second, stale cannon size.
    const origin = {
      x: width / 2,
      y: bounds.bottom - 1 - (CANNON.baseRect[1] + CANNON.baseRect[3]),
    };
    const [bx, by, bw, bh] = CANNON.barrelRect;
    const reach =
      Math.hypot(
        Math.max(Math.abs(bx), Math.abs(bx + bw)),
        Math.max(Math.abs(by), Math.abs(by + bh)),
      ) + CANNON.recoilOvershoot;
    const targetBounds = {
      left: 18 + r,
      top: 20 + r,
      right: width - 18 - r,
      bottom: origin.y - reach - 10 - r,
    };
    const cols = Math.max(1, Math.floor((width - 36) / (2 * r + 24)));
    const rows = Math.max(
      1,
      Math.floor((targetBounds.bottom - targetBounds.top) / (2 * r + 24)) + 1,
    );
    return {
      width,
      height,
      r,
      bounds,
      targetBounds,
      capacity: Math.min(width < 500 ? 3 : profile.limit, cols * rows),
      origin,
    };
  }
  function moveTargets(targets, g, dt) {
    const b = g.targetBounds;
    targets.forEach((t) => {
      t.x = clamp(t.x + t.vx * dt, b.left, b.right);
      t.y = clamp(t.y + t.vy * dt, b.top, b.bottom);
      if ((t.x <= b.left && t.vx < 0) || (t.x >= b.right && t.vx > 0))
        t.vx *= -1;
      if ((t.y <= b.top && t.vy < 0) || (t.y >= b.bottom && t.vy > 0))
        t.vy *= -1;
    });
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < targets.length; i++)
        for (let j = i + 1; j < targets.length; j++) {
          const a = targets[i],
            c = targets[j],
            dx = c.x - a.x,
            dy = c.y - a.y,
            d = Math.hypot(dx, dy),
            min = a.r + c.r + 8;
          if (d >= min) continue;
          const nx = d > EPS ? dx / d : 1,
            ny = d > EPS ? dy / d : 0,
            overlap = (min - d) / 2;
          a.x = clamp(a.x - nx * overlap, b.left, b.right);
          a.y = clamp(a.y - ny * overlap, b.top, b.bottom);
          c.x = clamp(c.x + nx * overlap, b.left, b.right);
          c.y = clamp(c.y + ny * overlap, b.top, b.bottom);
          const v = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (v > 0) {
            a.vx -= v * nx;
            a.vy -= v * ny;
            c.vx += v * nx;
            c.vy += v * ny;
          }
        }
  }
  function createRound(items, random = Math.random, config = {}) {
    const remaining = shuffled(items, random);
    return {
      source: items.slice(),
      random,
      mode: config.mode === "challenge" ? "challenge" : "round",
      difficulty: difficultyFor(config.difficulty).id,
      remaining,
      found: new Set(),
      generation: 0,
      prompt: remaining[0] || null,
      shots: [],
      cooldown: 0,
      hits: 0,
      score: 0,
      deadline: null,
      ended: !remaining.length,
      saved: false,
    };
  }
  function registerHit(round, id, generation, now = Date.now(), bounces = 0) {
    if (
      !pointsForHit(bounces) ||
      !round.prompt ||
      (round.mode === "challenge" && round.deadline === null) ||
      expireChallenge(round, now) ||
      round.ended ||
      generation !== round.generation ||
      id !== round.prompt?.id ||
      (round.mode !== "challenge" && round.found.has(id))
    )
      return false;
    const matched = round.prompt;
    round.found.add(id);
    round.hits++;
    round.score += pointsForHit(bounces);
    round.remaining = round.remaining.filter((item) => item.id !== id);
    if (round.mode === "challenge") {
      round.remaining.push(matched);
      if (round.hits % round.source.length === 0 && round.source.length > 1) {
        round.remaining = shuffled(round.source, round.random);
        if (round.remaining[0].id === id)
          [round.remaining[0], round.remaining[1]] = [
            round.remaining[1],
            round.remaining[0],
          ];
      }
    }
    round.generation++;
    round.shots = [];
    round.prompt = round.remaining[0] || null;
    if (!round.prompt) round.ended = true;
    return true;
  }
  function fireShot(round, origin, angle, speed) {
    if (
      round.ended ||
      (round.mode === "challenge" && round.deadline === null) ||
      !round.prompt ||
      round.cooldown > 0 ||
      round.shots.length >= 2
    )
      return null;
    const shot = {
      ...origin,
      vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed,
      generation: round.generation,
      bounces: 0,
      dead: false,
      trail: [],
    };
    round.shots.push(shot);
    round.cooldown = 0.3;
    return shot;
  }
  function mount(root, options) {
    const items = options.items || [],
      urlFor = options.urlFor || ((p) => p);
    if (!items.length) {
      root.textContent = "Dieses Set hat noch keine Wörter.";
      return { destroy() {} };
    }
    const profile = difficultyFor(options.difficulty),
      config = { difficulty: profile.id, mode: options.mode };
    const storage = Object.hasOwn(options, "storage")
      ? options.storage
      : safeStorage();
    let round = createRound(items, Math.random, config),
      clockTimer = null,
      vacancy = null,
      refillReadyAt = 0,
      g,
      targets = [],
      images = new Map(),
      artImages = new Map(),
      sprites = new Map();
    let alive = true,
      ready = false,
      started = false,
      paused = false,
      transition = 0,
      angle = 0,
      slow = 1;
    let frame = 0,
      last = 0,
      accumulator = 0,
      clock = 0,
      recoil = 0,
      muted = false,
      audio;
    let particles = [],
      rings = [],
      flashes = [],
      bonuses = [],
      gesture = null;
    const pointers = new Set(),
      keys = new Set(),
      removers = [],
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<div class="wb-game" tabindex="-1">
      <header class="wb-header"><div><h1>Word Blaster</h1><p class="wb-set"></p></div><div class="wb-tools"><button type="button" class="wb-sound" aria-label="Ton ausschalten" aria-pressed="true">Ton an</button><button type="button" class="wb-pause">Pause</button></div></header>
      <div class="wb-task"><span class="wb-instruction">Finde das Bild zu</span><strong class="wb-word" lang="en"></strong><span class="wb-count"></span><span class="wb-time" aria-label="Verbleibende Zeit" aria-live="off" hidden></span></div>
      <div class="wb-stage"><canvas aria-label="Bewegte Bildkapseln und Kanone. Ziehen zum Zielen, loslassen zum Schießen. Desktop: Pfeiltasten und Leertaste."></canvas><div class="wb-gesture" role="group" tabindex="0" aria-label="Kanone steuern: im Spielfeld nach links oder rechts ziehen, loslassen schießt. Zurück zum Startpunkt ziehen bricht ab. Mit Tastatur: Pfeiltasten zielen, Leertaste schießt." data-state="idle" aria-disabled="true"></div><div class="wb-overlay"><p class="wb-message">Bilder werden vorbereitet …</p><button class="wb-continue" type="button" hidden>Los geht’s!</button></div></div>
      <p class="wb-help"><span>Ziehen · Loslassen schießt</span><span class="wb-key-help">← → zielen · Leertaste schießen</span></p>
      <section class="wb-results" hidden aria-label="Challenge-Ergebnis">
        <h2 class="wb-result-title" tabindex="-1"></h2><p class="wb-result-copy"></p>
        <form class="wb-score-form"><label>Dein Name oder Spitzname<input name="player" type="text" maxlength="20" required autocomplete="off" /></label><button type="submit">Highscore eintragen</button></form>
        <p class="wb-save-status" role="status"></p><h3 class="wb-board-title"></h3><div class="wb-scoreboard"></div>
        <p class="wb-storage-note">Nur in diesem Browser gespeichert.</p><button class="wb-replay" type="button">Noch mal!</button>
      </section>
      <p class="wb-status" role="status" aria-live="polite"></p>
    </div>`;
    const find = (s) => root.querySelector(s),
      game = find(".wb-game"),
      canvas = find("canvas"),
      ctx = canvas.getContext("2d"),
      stage = find(".wb-stage"),
      overlay = find(".wb-overlay"),
      message = find(".wb-message"),
      resume = find(".wb-continue"),
      aimZone = find(".wb-gesture");
    find(".wb-set").textContent =
      `${options.title || ""} · ${profile.label}${round.mode === "challenge" ? " · Challenge" : ""}`;
    function on(node, event, fn, opts) {
      node.addEventListener(event, fn, opts);
      removers.push(() => node.removeEventListener(event, fn, opts));
    }
    function status(text) {
      find(".wb-status").textContent = text;
    }
    function sound(kind, bounces = 0) {
      if (muted || !audio || audio.state !== "running") return;
      const tones =
        kind === "fire"
          ? [[620, 0.08, 280]]
          : kind === "wall"
            ? [[1000, 0.07, 1200]]
            : kind === "wrong"
              ? [[220, 0.1, 180]]
              : [
                  [660, 0.12, 880],
                  [880, 0.14, 1100],
                  ...(bounces ? [[1320, 0.18, 1760]] : []),
                  ...(bounces === 2 ? [[1760, 0.2, 2200]] : []),
                ];
      tones.forEach(([freq, duration, end], i) => {
        const oscillator = audio.createOscillator(),
          gain = audio.createGain(),
          at = audio.currentTime + i * 0.08;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, at);
        oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.075, at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.02);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      });
    }
    function unlock() {
      if (muted) return;
      const Audio = global.AudioContext || global.webkitAudioContext;
      if (!audio && Audio) audio = new Audio();
      if (audio?.state === "suspended") audio.resume().catch(() => {});
    }
    function cancelAim() {
      const prior = gesture;
      gesture = null;
      aimZone.dataset.state = "idle";
      if (!prior) return;
      if (aimZone.hasPointerCapture(prior.id))
        aimZone.releasePointerCapture(prior.id);
    }
    function controlsOff() {
      keys.clear();
      cancelAim();
      pointers.clear();
    }
    function canAim() {
      return (
        alive &&
        ready &&
        !paused &&
        !transition &&
        !round.ended &&
        !!round.prompt
      );
    }
    function updateTask() {
      find(".wb-word").textContent = round.prompt?.labels.en || "Geschafft!";
      find(".wb-count").textContent =
        round.mode === "challenge"
          ? `${round.score} Punkte`
          : `${round.found.size} / ${items.length}`;
      find(".wb-time").hidden = round.mode !== "challenge";
      find(".wb-pause").disabled = !ready;
      find(".wb-pause").textContent = paused
        ? round.prompt
          ? "Weiter"
          : "Neustart"
        : "Pause";
      if (round.mode === "challenge" && !round.ended)
        find(".wb-pause").textContent = paused ? "Weiter" : "Pause";
      aimZone.setAttribute("aria-disabled", String(!canAim()));
      aimZone.tabIndex = canAim() ? 0 : -1;
    }
    function makeTargets() {
      sprites.clear();
      const b = g.targetBounds,
        count = Math.min(g.capacity, round.remaining.length);
      const maxCols = Math.max(1, Math.floor((g.width - 36) / (2 * g.r + 24)));
      const maxRows = Math.max(
        1,
        Math.floor((b.bottom - b.top) / (2 * g.r + 24)) + 1,
      );
      const cols = Math.min(
        maxCols,
        Math.max(Math.ceil(count / maxRows), Math.ceil(count / 2)),
      );
      const rows = Math.ceil(count / cols);
      targets = round.remaining
        .slice(0, count)
        .map((item, i) =>
          newTarget(
            item,
            cols === 1
              ? g.width / 2
              : b.left + ((i % cols) * (b.right - b.left)) / (cols - 1),
            rows === 1
              ? (b.top + b.bottom) / 2
              : b.top +
                  (Math.floor(i / cols) * (b.bottom - b.top)) / (rows - 1),
          ),
        );
    }
    function newTarget(item, x, y) {
      return {
        item,
        id: item.id,
        r: g.r,
        x,
        y,
        vx:
          (Math.random() < 0.5 ? -1 : 1) *
          (22 + Math.random() * 14) *
          profile.speed,
        vy:
          (Math.random() < 0.5 ? -1 : 1) *
          (13 + Math.random() * 12) *
          profile.speed,
        shield: 0,
      };
    }
    function refillTargets() {
      if (clock < refillReadyAt) return;
      refillReadyAt = clock + 0.12;
      const b = g.targetBounds;
      for (const item of round.remaining) {
        if (targets.length >= Math.min(g.capacity, round.source.length)) break;
        if (targets.some((t) => t.id === item.id)) continue;
        let best =
          vacancy &&
          targets.every(
            (t) =>
              Math.hypot(t.x - vacancy.x, t.y - vacancy.y) >= t.r + g.r + 7.9,
          )
            ? { ...vacancy, clearance: Infinity }
            : null;
        if (!best) {
          // A bounded grid search reserves true physical clearance for the new capsule.
          const cols = Math.max(1, Math.ceil((b.right - b.left) / (g.r * 0.5))),
            rows = Math.max(1, Math.ceil((b.bottom - b.top) / (g.r * 0.5)));
          for (let row = 0; row <= rows; row++)
            for (let col = 0; col <= cols; col++) {
              const x = b.left + ((b.right - b.left) * col) / cols,
                y = b.top + ((b.bottom - b.top) * row) / rows;
              const clearance = Math.min(
                ...targets.map(
                  (t) => Math.hypot(t.x - x, t.y - y) - t.r - g.r - 8,
                ),
              );
              if (clearance >= 0 && (!best || clearance > best.clearance))
                best = { x, y, clearance };
            }
        }
        if (best) {
          targets.push(newTarget(item, best.x, best.y));
          vacancy = null;
        }
      }
    }
    function syncClock() {
      if (!alive) return false;
      if (round.mode !== "challenge") return true;
      const left = timeLeft(round, Date.now());
      const timeText = `${Math.ceil(left / 1000)} s`;
      if (find(".wb-time").textContent !== timeText)
        find(".wb-time").textContent = timeText;
      find(".wb-time").classList.toggle(
        "is-urgent",
        left <= 10000 && round.deadline !== null,
      );
      expireChallenge(round, Date.now());
      if (round.ended && !stage.hidden) showChallengeResult();
      return !round.ended;
    }
    function showChallengeResult() {
      controlsOff();
      paused = true;
      round.shots = [];
      recoil = 0;
      cancelAnimationFrame(frame);
      clearInterval(clockTimer);
      clockTimer = null;
      stage.hidden = true;
      find(".wb-task").hidden = true;
      find(".wb-help").hidden = true;
      sound("correct", 2);
      find(".wb-results").hidden = false;
      find(".wb-result-title").textContent = `${round.score} Punkte!`;
      find(".wb-result-copy").textContent =
        `Zeit vorbei – ${round.hits} richtige Treffer in 60 Sekunden.`;
      find(".wb-board-title").textContent = `Top 10 · ${profile.label}`;
      renderHighscores(
        find(".wb-scoreboard"),
        readHighscores(options.setId || "preview", profile.id, storage),
      );
      find(".wb-pause").hidden = true;
      updateTask();
      status(`Challenge beendet: ${round.score} Punkte.`);
      find(".wb-result-title").focus({ preventScroll: true });
    }
    function resize() {
      if (!alive || stage.hidden) return;
      const width = Math.max(240, Math.round(stage.clientWidth));
      const below = find(".wb-help").getBoundingClientRect().height + 68;
      const height = Math.max(
        280,
        Math.min(
          620,
          Math.floor(
            global.innerHeight - stage.getBoundingClientRect().top - below,
          ),
        ),
      );
      if (g?.width === width && g?.height === height) return;
      const hadGeometry = !!g;
      g = geometry(width, height, profile.id);
      stage.style.height = `${height}px`;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      round.shots = [];
      recoil = 0;
      particles = [];
      rings = [];
      flashes = [];
      bonuses = [];
      vacancy = null;
      makeTargets();
      if (hadGeometry && ready && started)
        pause("Das Spielfeld ist neu ausgerichtet. Weiter?");
      draw();
    }
    function pause(text = "Eine kleine Pause?") {
      controlsOff();
      if (!ready || (round.ended && round.mode === "challenge")) return;
      if (!syncClock()) return;
      paused = true;
      recoil = 0;
      round.shots = [];
      last = 0;
      accumulator = 0;
      overlay.hidden = false;
      message.textContent = round.prompt
        ? text + (round.mode === "challenge" ? " Die Uhr läuft weiter." : "")
        : "Alle Wörter getroffen!";
      resume.textContent = round.prompt ? "Weiter" : "Noch mal!";
      resume.hidden = false;
      updateTask();
      cancelAnimationFrame(frame);
      draw();
      if (document.hidden) audio?.suspend().catch(() => {});
    }
    function start() {
      if (!ready || !alive || document.hidden) return;
      if (started && !round.ended && !syncClock()) return;
      if (round.ended || !round.prompt) {
        round = createRound(items, Math.random, config);
        transition = 0;
        find(".wb-score-form").reset();
        find(".wb-score-form input").disabled = false;
        find(".wb-score-form button").disabled = false;
        find(".wb-save-status").textContent = "";
        stage.hidden = false;
        find(".wb-task").hidden = false;
        find(".wb-help").hidden = false;
        find(".wb-results").hidden = true;
        find(".wb-pause").hidden = false;
        resize();
        makeTargets();
      }
      startChallenge(round, Date.now());
      started = true;
      paused = false;
      overlay.hidden = true;
      controlsOff();
      unlock();
      updateTask();
      syncClock();
      if (round.mode === "challenge" && !clockTimer)
        clockTimer = setInterval(syncClock, 100);
      last = 0;
      accumulator = 0;
      aimZone.focus({ preventScroll: true });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    }
    function shoot() {
      unlock();
      if (!syncClock() || !canAim()) return;
      const origin = cannonPose(g.origin, angle).muzzle;
      if (!fireShot(round, origin, angle, Math.max(650, g.height * 1.8)))
        return;
      recoil = CANNON.recoilDuration;
      sound("fire");
    }
    function burst(x, y, count, color, duration = 0.65) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2,
          speed = 40 + Math.random() * 110;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: duration,
          total: duration,
          color,
          size: 2 + Math.random() * 4,
        });
      }
      if (particles.length > 160) particles.splice(0, particles.length - 160);
    }
    function hit(event, shot) {
      if (!syncClock()) return;
      const target = targets.find((t) => t.id === event.target.id);
      if (!target || shot.generation !== round.generation) return;
      if (registerHit(round, target.id, shot.generation, Date.now(), event.bounces)) {
        const gold = event.bounces > 0,
          bonusText = (event.bounces === 2 ? "Doppelbande!" : "Bandenbonus!") +
            (round.mode === "challenge" ? ` +${pointsForHit(event.bounces)}` : "");
        if (gold) {
          bonuses.push({
            x: target.x,
            y: target.y,
            life: 1,
            text: bonusText,
          });
          if (bonuses.length > 4) bonuses.shift();
          rings.push({
            x: target.x, y: target.y, life: 0.65, total: 0.65,
            color: "#fff3b3", radius: target.r * 0.65,
          });
        }
        sound("correct", event.bounces);
        burst(
          target.x,
          target.y,
          reduced ? 12 : 30 + event.bounces * 12,
          gold ? "#eab84d" : "#70cbb2",
          0.8,
        );
        rings.push({
          x: target.x,
          y: target.y,
          life: 0.4,
          total: 0.4,
          color: gold ? "#e6ad35" : "#5eb49b",
          radius: target.r,
        });
        flashes.push({ target: { ...target }, life: 0.16, total: 0.16 });
        if (round.mode === "challenge") vacancy = { x: target.x, y: target.y };
        targets = targets.filter((t) => t !== target);
        transition = round.mode === "challenge" ? 0.18 : 0.6;
        controlsOff();
        status(
          round.mode === "challenge"
            ? `${round.score} Punkte.${gold ? ` ${bonusText}` : ""}`
            : `${round.found.size} von ${items.length} getroffen.${gold ? ` ${bonusText}` : ""}`,
        );
        updateTask();
      } else {
        if (round.ended) {
          syncClock();
          return;
        }
        target.shield = 0.35;
        sound("wrong");
        const dx = shot.x - target.x,
          dy = shot.y - target.y,
          length = Math.hypot(dx, dy) || 1;
        const dot = (shot.vx * dx) / length + (shot.vy * dy) / length;
        // Cosmetic reflection only: a shielded pulse cannot damage a second target.
        const duration = 0.13;
        particles.push({
          x: shot.x,
          y: shot.y,
          vx: (shot.vx - (2 * dot * dx) / length) * 0.5,
          vy: (shot.vy - (2 * dot * dy) / length) * 0.5,
          life: duration,
          total: duration,
          color: "#dd967e",
          size: 5,
        });
        status("Das Bild ist geschützt. Suche das passende Bild.");
      }
    }
    function step(dt) {
      clock += dt;
      recoil = Math.max(0, recoil - dt);
      round.cooldown = Math.max(0, round.cooldown - dt);
      const turning =
        (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
      if (turning && !transition) {
        angle = clamp(angle + turning * dt * 1.05, -MAX_ANGLE, MAX_ANGLE);
      }
      const aiming = !!turning || gesture !== null;
      slow += ((aiming ? profile.aimSlow : 1) - slow) * Math.min(1, dt * 6);
      if (transition > 0) {
        transition = Math.max(0, transition - dt);
        if (!transition) {
          if (!round.prompt) {
            pause("Alle Wörter getroffen!");
            sound("correct", 2);
          } else {
            if (round.mode === "challenge") refillTargets();
            else if (!targets.length) makeTargets();
            updateTask();
          }
        }
      } else {
        const moving = targets.map((t) => ({
          ...t,
          vx: t.vx * slow,
          vy: t.vy * slow,
        }));
        for (const shot of round.shots.slice()) {
          if (shot.generation !== round.generation) continue;
          shot.trail.push({ x: shot.x, y: shot.y });
          if (shot.trail.length > 12) shot.trail.shift();
          for (const event of advanceShot(shot, moving, g.bounds, dt)) {
            if (event.type === "wall") {
              shot.trail.push({ x: event.x, y: event.y });
              sound("wall");
              rings.push({
                ...event,
                life: 0.2,
                total: 0.2,
                color: "#72c7b2",
                radius: 2,
              });
              burst(event.x, event.y, 4, "#b1e5d4", 0.22);
            }
            if (event.type === "target") hit(event, shot);
          }
        }
        round.shots = round.shots.filter(
          (s) => !s.dead && s.generation === round.generation,
        );
        if (!transition) {
          moveTargets(targets, g, dt * slow);
          if (
            round.mode === "challenge" &&
            targets.length < Math.min(g.capacity, round.source.length)
          )
            refillTargets();
        }
      }
      targets.forEach((t) => (t.shield = Math.max(0, t.shield - dt)));
      bonuses.forEach((b) => (b.life -= dt));
      bonuses = bonuses.filter((b) => b.life > 0);
      particles.forEach((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
      });
      particles = particles.filter((p) => p.life > 0);
      rings.forEach((r) => (r.life -= dt));
      rings = rings.filter((r) => r.life > 0);
      flashes.forEach((f) => (f.life -= dt));
      flashes = flashes.filter((f) => f.life > 0);
    }
    function tick(time) {
      if (!alive || paused || !syncClock()) return;
      const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
      last = time;
      accumulator += delta;
      let steps = 0;
      while (accumulator >= STEP && steps++ < 12 && !paused) {
        step(STEP);
        accumulator -= STEP;
      }
      draw();
      if (!paused && alive) frame = requestAnimationFrame(tick);
    }
    function circle(x, y, r, fill, stroke, line = 1) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = line;
        ctx.stroke();
      }
    }
    function sprite(t) {
      if (sprites.has(t.id)) return sprites.get(t.id);
      const s = document.createElement("canvas"),
        size = t.r * 4;
      s.width = s.height = size;
      const c = s.getContext("2d");
      c.scale(2, 2);
      const r = t.r;
      c.beginPath();
      c.arc(r, r, r - 4, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = "#fffaf1";
      c.fillRect(0, 0, r * 2, r * 2);
      const image = images.get(t.id);
      if (image) c.drawImage(image, 0, 0, r * 2, r * 2);
      sprites.set(t.id, s);
      return s;
    }
    function drawTarget(t, alpha = 1, scale = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(scale, scale);
      circle(0, 4, t.r + 2, "#d7dfcd");
      circle(0, 0, t.r + 2, "#fffaf1", "#b6cabd", 2);
      ctx.drawImage(sprite(t), -t.r, -t.r, t.r * 2, t.r * 2);
      if (t.shield) {
        circle(0, 0, t.r + 5, "#e8aa8b33", "#ce7d68", 3);
        ctx.strokeStyle = "#fffaf1";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
    function draw() {
      if (!alive || !g) return;
      ctx.clearRect(0, 0, g.width, g.height);
      ctx.fillStyle = "#edf1e4";
      ctx.fillRect(0, 0, g.width, g.height);
      ctx.strokeStyle = "#b5c5ae";
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, g.width - 24, g.height - 24);
      // Fixed arena corner sockets visibly communicate reflective walls.
      for (const x of [12, g.width - 12])
        for (const y of [12, g.height - 12]) circle(x, y, 7, "#d7b76f");
      if (ready && !paused && round.prompt && !transition) {
        const origin = cannonPose(g.origin, angle, recoil, reduced).muzzle;
        let path = aimPath(origin, angle, g.bounds);
        if (profile.guide === "wall") path = path.slice(0, 2);
        if (profile.guide === "short") {
          const distance = Math.min(
            110,
            Math.hypot(path[1].x - origin.x, path[1].y - origin.y),
          );
          path = [
            origin,
            {
              x: origin.x + Math.sin(angle) * distance,
              y: origin.y - Math.cos(angle) * distance,
            },
          ];
        }
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.setLineDash([2, 10]);
        ctx.strokeStyle = "#427e6a55";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        if (profile.guide !== "short")
          circle(path[1].x, path[1].y, 4, "#8db6a0");
      }
      targets.forEach((t) => drawTarget(t));
      flashes.forEach((f) =>
        drawTarget(
          f.target,
          f.life / f.total,
          1 + (1 - f.life / f.total) * 0.14,
        ),
      );
      rings.forEach((r) => {
        ctx.globalAlpha = r.life / r.total;
        circle(
          r.x,
          r.y,
          r.radius + (1 - r.life / r.total) * 25,
          null,
          r.color,
          3,
        );
      });
      ctx.globalAlpha = 1;
      for (const shot of round.shots) {
        ctx.lineCap = "round";
        // Segmented trail keeps the bounce corner exact; no expensive frame blur.
        for (let i = 1; i < shot.trail.length; i++) {
          const a = shot.trail[i - 1],
            b = shot.trail[i];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(77,195,171,${(i / shot.trail.length) * 0.55})`;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,245,${(i / shot.trail.length) * 0.7})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        circle(shot.x, shot.y, 7, "#67d6ba88");
        circle(shot.x, shot.y, 3, "#fffef5");
      }
      particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.total;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(clock * 2);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.3, -p.size * 0.3);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(p.size * 0.3, p.size * 0.3);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.3, p.size * 0.3);
        ctx.lineTo(-p.size, 0);
        ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (gesture) {
        ctx.beginPath();
        ctx.ellipse(g.origin.x, g.origin.y + 30, 56, 22, 0, 0, Math.PI * 2);
        ctx.fillStyle = gesture.armed ? "#70cbb22b" : "#b4c8b724";
        ctx.strokeStyle = gesture.armed ? "#55a98e" : "#9fb6a4";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
      drawCannon(ctx, artImages, g.origin, angle, recoil, reduced);
      bonuses.forEach((b) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, b.life * 4);
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const width = ctx.measureText(b.text).width + 24,
          x = Math.max(g.bounds.left + width / 2 + 4,
            Math.min(g.bounds.right - width / 2 - 4, b.x)),
          y = Math.max(g.bounds.top + 20, b.y - 24 - (reduced ? 0 : (1 - b.life) * 35));
        ctx.fillStyle = "#fff4ce";
        ctx.strokeStyle = "#d6a341";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - width / 2, y - 17, width, 34, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#805318";
        ctx.fillText(b.text, x, y);
        ctx.restore();
      });
    }
    on(resume, "click", start);
    on(find(".wb-replay"), "click", start);
    on(find(".wb-score-form"), "submit", (e) => {
      e.preventDefault();
      if (round.mode !== "challenge" || !round.ended || round.saved) return;
      const input = find(".wb-score-form input"),
        name = cleanName(input.value);
      if (!name) {
        input.setCustomValidity("Bitte einen Namen oder Spitznamen eingeben.");
        input.reportValidity();
        return;
      }
      const saved = saveHighscore(
        options.setId || "preview",
        profile.id,
        { name, score: round.score, hits: round.hits, at: Date.now() },
        storage,
      );
      if (!saved.ok) {
        find(".wb-save-status").textContent =
          "Speichern gerade nicht möglich. Du kannst es erneut versuchen.";
        return;
      }
      round.saved = true;
      input.disabled = true;
      find(".wb-score-form button").disabled = true;
      find(".wb-save-status").textContent =
        saved.rank === null
          ? "Diesmal nicht in den Top 10. Versuch es noch einmal!"
          : `Gespeichert – Platz ${saved.rank}!`;
      renderHighscores(find(".wb-scoreboard"), saved.entries);
    });
    on(find(".wb-score-form input"), "input", (e) =>
      e.target.setCustomValidity(""),
    );
    on(find(".wb-pause"), "click", () => (paused ? start() : pause()));
    on(find(".wb-sound"), "click", () => {
      muted = !muted;
      const button = find(".wb-sound");
      button.textContent = muted ? "Ton aus" : "Ton an";
      button.setAttribute("aria-pressed", String(!muted));
      button.setAttribute(
        "aria-label",
        muted ? "Ton einschalten" : "Ton ausschalten",
      );
      if (muted) audio?.suspend().catch(() => {});
      else unlock();
    });
    function point(event) {
      const rect = stage.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) * g.width) / rect.width,
        y: ((event.clientY - rect.top) * g.height) / rect.height,
      };
    }
    function insideArena(p) {
      return (
        p.x >= g.bounds.left &&
        p.x <= g.bounds.right &&
        p.y >= g.bounds.top &&
        p.y <= g.bounds.bottom
      );
    }
    // Track all contacts so a second finger anywhere cancels, and neither
    // finger can accidentally become a fresh shot while still touching down.
    on(
      document,
      "pointerdown",
      (e) => {
        pointers.add(e.pointerId);
        if (gesture && pointers.size > 1) cancelAim();
      },
      true,
    );
    on(document, "pointerup", (e) => pointers.delete(e.pointerId), true);
    on(
      document,
      "pointercancel",
      (e) => {
        pointers.delete(e.pointerId);
        if (gesture?.id === e.pointerId) cancelAim();
      },
      true,
    );
    on(aimZone, "contextmenu", (e) => e.preventDefault());
    on(aimZone, "pointerdown", (e) => {
      if (
        !syncClock() ||
        !canAim() ||
        pointers.size > 1 ||
        !e.isPrimary ||
        e.button !== 0
      )
        return;
      const p = point(e);
      if (!insideArena(p)) return;
      e.preventDefault();
      keys.clear();
      gesture = {
        id: e.pointerId,
        x: p.x,
        angle,
        generation: round.generation,
        pointerType: e.pointerType,
        armed: false,
      };
      aimZone.dataset.state = "aiming";
      aimZone.focus({ preventScroll: true });
      unlock();
      try {
        aimZone.setPointerCapture(e.pointerId);
      } catch {
        cancelAim();
      }
    });
    on(aimZone, "pointermove", (e) => {
      if (gesture?.id !== e.pointerId) return;
      e.preventDefault();
      const p = point(e),
        aimed = dragAim(gesture, p.x, g.width);
      angle = aimed.angle;
      gesture.armed = aimed.armed && dragReleaseInside(p, g.bounds, gesture.pointerType);
      aimZone.dataset.state = gesture.armed ? "armed" : "aiming";
    });
    on(aimZone, "pointerup", (e) => {
      if (gesture?.id !== e.pointerId) return;
      e.preventDefault();
      const p = point(e),
        aimed = dragAim(gesture, p.x, g.width);
      const fireOnRelease =
        syncClock() &&
        canAim() &&
        pointers.size === 0 &&
        dragReleaseInside(p, g.bounds, gesture.pointerType) &&
        aimed.armed &&
        gesture.generation === round.generation;
      angle = aimed.angle;
      cancelAim();
      if (fireOnRelease) shoot();
    });
    on(aimZone, "lostpointercapture", (e) => {
      pointers.delete(e.pointerId);
      if (gesture?.id === e.pointerId) cancelAim();
    });
    on(game, "keydown", (e) => {
      // Menu buttons retain native Space/Enter behavior.
      if (e.code === "Escape") {
        cancelAim();
        pause();
        return;
      }
      if (![game, canvas, aimZone].includes(e.target)) return;
      if (!["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) return;
      e.preventDefault();
      unlock();
      if (!canAim()) return;
      cancelAim();
      if (e.code === "Space") {
        if (!e.repeat) shoot();
      } else {
        if (!e.repeat)
          angle = clamp(
            angle + (e.code === "ArrowRight" ? 0.035 : -0.035),
            -MAX_ANGLE,
            MAX_ANGLE,
          );
        keys.add(e.code);
      }
    });
    on(global, "keyup", (e) => keys.delete(e.code));
    on(global, "blur", () => pause("Bereit zum Weiterspielen?"));
    on(document, "visibilitychange", () => {
      if (document.hidden) pause("Bereit zum Weiterspielen?");
    });
    on(global, "resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    async function load() {
      ready = false;
      resume.hidden = true;
      message.textContent = "Bilder werden vorbereitet …";
      const entries = [
        ...items.map((item) => ({
          id: item.id,
          path: item.image,
          kind: "item",
        })),
        ...Object.entries(CANNON_ASSETS).map(([id, path]) => ({
          id,
          path,
          kind: "art",
        })),
      ];
      const results = await Promise.allSettled(
        entries.map(
          (entry) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve({ ...entry, image });
              image.onerror = () => reject(new Error(entry.path));
              image.src = urlFor(entry.path);
            }),
        ),
      );
      if (!alive) return;
      if (results.some((r) => r.status === "rejected")) {
        message.textContent = "Ein Bild konnte nicht geladen werden.";
        resume.textContent = "Erneut versuchen";
        resume.hidden = false;
        resume.onclick = () => {
          resume.onclick = null;
          load();
        };
        return;
      }
      const loaded = results.map((r) => r.value);
      images = new Map(
        loaded.filter((e) => e.kind === "item").map((e) => [e.id, e.image]),
      );
      artImages = new Map(
        loaded.filter((e) => e.kind === "art").map((e) => [e.id, e.image]),
      );
      sprites.clear();
      ready = true;
      paused = true;
      message.textContent =
        round.mode === "challenge"
          ? "60 Sekunden: direkt 10, eine Bande 15, zwei Banden 20 Punkte. Die Uhr läuft auch bei Pause weiter."
          : "Ziehen zum Zielen. Loslassen schießt!";
      resume.textContent = "Los geht’s!";
      resume.hidden = false;
      updateTask();
      syncClock();
      draw();
    }
    resize();
    updateTask();
    load();
    return {
      destroy() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(frame);
        clearInterval(clockTimer);
        observer.disconnect();
        removers.forEach((fn) => fn());
        controlsOff();
        pointers.clear();
        resume.onclick = null;
        audio?.close().catch(() => {});
        particles = [];
        bonuses = [];
        targets = [];
        round.shots = [];
        images.clear();
        artImages.clear();
        sprites.clear();
        root.replaceChildren();
      },
    };
  }
  const api = {
    mount,
    DIFFICULTIES,
    difficultyFor,
    pointsForHit,
    startChallenge,
    timeLeft,
    expireChallenge,
    cleanName,
    readHighscores,
    saveHighscore,
    renderHighscores,
    cannonPose,
    drawCannon,
    dragAim,
    dragReleaseInside,
    wallHit,
    circleHit,
    advanceShot,
    aimPath,
    geometry,
    moveTargets,
    createRound,
    registerHit,
    fireShot,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.LernwortWordBlaster = api;
})(typeof window !== "undefined" ? window : globalThis);

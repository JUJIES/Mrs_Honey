const { test } = require("node:test");
const assert = require("node:assert/strict");
const game = require("../word-blaster.js");
const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
function shot(x, y, vx, vy) {
  return { x, y, vx, vy, bounces: 0, dead: false };
}
function target(id, x, y, vx = 0, vy = 0, r = 5) {
  return { id, x, y, vx, vy, r };
}
const close = (a, b) => assert(Math.abs(a - b) < 1e-3, `${a} != ${b}`);
test("first-bounce aim preview and a real shot use the same reflection geometry", () => {
  for (const angle of [-1.2, -0.4, 0, 0.5, 1.2]) {
    const origin = { x: 50, y: 90 },
      path = game.aimPath(origin, angle, bounds);
    const s = shot(50, 90, Math.sin(angle) * 100, -Math.cos(angle) * 100);
    const w = game.wallHit(s, bounds),
      events = game.advanceShot(s, [], bounds, w.time + 0.00001);
    assert.equal(events[0].type, "wall");
    close(events[0].x, path[1].x);
    close(events[0].y, path[1].y);
    close(Math.hypot(s.vx, s.vy), 100);
  }
});
test("corner reflects both components once and never becomes stuck at zero time", () => {
  const s = shot(50, 50, 100, -100);
  const events = game.advanceShot(s, [], bounds, 0.75);
  assert.equal(events.length, 1);
  assert.equal(s.bounces, 1);
  close(s.x, 75);
  close(s.y, 25);
  assert.equal(s.vx, -100);
  assert.equal(s.vy, 100);
});
test("laser is absorbed on third wall contact, with at most two ricochets", () => {
  const s = shot(50, 50, 100, 0),
    events = game.advanceShot(s, [], bounds, 4);
  assert.deepEqual(
    events.map((e) => e.type),
    ["wall", "wall", "expire"],
  );
  assert(s.dead);
  assert.equal(s.bounces, 2);
});
test("swept collision catches a tiny target that a fast shot traverses between frames", () => {
  const s = shot(0, 50, 10000, 0),
    t = target("cat", 40, 50);
  const events = game.advanceShot(s, [t], bounds, 1 / 120);
  assert(s.dead);
  assert.equal(events[0].target.id, "cat");
  close(s.x, 32);
});
test("moving-circle relative velocity catches a target crossing a stationary pulse", () => {
  const p = shot(50, 50, 0, 0),
    t = target("cat", 50, 10, 0, 100);
  close(game.circleHit(p, t, 0.5), 0.32);
  assert.equal(game.circleHit(p, t, 0.2), Infinity);
});
test("earliest target wins even when the target array is reversed", () => {
  for (const ts of [
    [target("near", 30, 50), target("far", 70, 50)],
    [target("far", 70, 50), target("near", 30, 50)],
  ]) {
    const events = game.advanceShot(shot(0, 50, 100, 0), ts, bounds, 1);
    assert.equal(events[0].target.id, "near");
    assert.equal(events.length, 1);
  }
});
test("collision is tested again in the same step after a wall bounce", () => {
  const s = shot(80, 40, 100, 100),
    t = target("cat", 80, 80);
  const events = game.advanceShot(s, [t], bounds, 0.5);
  assert.deepEqual(
    events.map((e) => e.type),
    ["wall", "target"],
  );
  assert.equal(events[1].bounces, 1);
});
test("wall subdivision gives equal end positions and bounce count", () => {
  const a = shot(45, 60, 150, -82),
    b = { ...a };
  game.advanceShot(a, [], bounds, 0.8);
  for (let i = 0; i < 96; i++) game.advanceShot(b, [], bounds, 1 / 120);
  close(a.x, b.x);
  close(a.y, b.y);
  assert.equal(a.bounces, b.bounces);
  assert.equal(a.dead, b.dead);
});
test("all supported arena sizes reserve cannon space and capsule clearance", () => {
  for (const w of [240, 264, 320, 390, 754, 1000, 1140])
    for (const h of [280, 390, 620]) {
      const g = game.geometry(w, h),
        b = g.targetBounds;
      assert(g.r >= 32);
      assert(g.capacity >= 1 && g.capacity <= 6);
      assert(b.right >= b.left);
      assert(b.bottom >= b.top);
      assert(b.bottom + g.r < g.origin.y - 45);
      const cols = Math.min(
        g.capacity,
        Math.max(1, Math.floor((w - 36) / (g.r * 2 + 24))),
      );
      const rows = Math.ceil(g.capacity / cols);
      if (cols > 1) assert((b.right - b.left) / (cols - 1) >= g.r * 2 + 8);
      if (rows > 1) assert((b.bottom - b.top) / (rows - 1) >= g.r * 2 + 8);
    }
});
test("targets bounce and separate without leaving their arena or losing solid feel", () => {
  const g = game.geometry(500, 400),
    a = target("a", 130, 150, 30, 0, g.r),
    b = target("b", 210, 150, -30, 0, g.r);
  game.moveTargets([a, b], g, 1 / 120);
  assert(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 7.99);
  assert(a.vx < 0 && b.vx > 0);
  a.x = g.targetBounds.left;
  a.vx = -40;
  game.moveTargets([a], g, 0.1);
  assert(a.vx > 0);
  assert(a.x >= g.targetBounds.left);
});
test("only the current prompt is destructible; stale and duplicate shots cannot score", () => {
  const items = [{ id: "cat" }, { id: "dog" }, { id: "mouse" }],
    round = game.createRound(items, () => 0.99),
    generation = round.generation;
  assert.equal(game.registerHit(round, "dog", generation), false);
  assert.equal(round.found.size, 0);
  game.fireShot(round, { x: 20, y: 20 }, 0, 100);
  assert.equal(round.shots.length, 1);
  assert(game.registerHit(round, "cat", generation));
  assert.equal(round.shots.length, 0);
  assert.equal(round.prompt.id, "dog");
  assert.equal(game.registerHit(round, "dog", generation), false);
  assert.equal(game.registerHit(round, "cat", round.generation), false);
  assert.equal(items.length, 3);
  assert.equal(items[0].id, "cat");
});
test("full sets finish once, preserve authoritative item references, and replay resets progress", () => {
  for (const count of [1, 10, 15]) {
    const items = Array.from({ length: count }, (_, i) => ({ id: String(i) })),
      r = game.createRound(items);
    while (r.prompt) {
      assert(items.includes(r.prompt));
      assert(game.registerHit(r, r.prompt.id, r.generation));
    }
    assert.equal(r.found.size, count);
    assert.equal(r.remaining.length, 0);
    assert.equal(game.fireShot(r, { x: 0, y: 0 }, 0, 100), null);
    const replay = game.createRound(items);
    assert.equal(replay.found.size, 0);
    assert(replay.prompt);
  }
});
test("shot capacity and cooldown are enforced independently of repeated input events", () => {
  const r = game.createRound([{ id: "cat" }]);
  assert(game.fireShot(r, { x: 0, y: 0 }, 0, 100));
  assert.equal(game.fireShot(r, { x: 0, y: 0 }, 0, 100), null);
  r.cooldown = 0;
  assert(game.fireShot(r, { x: 0, y: 0 }, 0, 100));
  r.cooldown = 0;
  assert.equal(game.fireShot(r, { x: 0, y: 0 }, 0, 100), null);
});

test("painted muzzle rotates around the fixed mount and stays inside every arena", () => {
  for (const width of [240, 320, 754, 1140])
    for (const height of [280, 620]) {
      const g = game.geometry(width, height),
        origin = { ...g.origin };
      for (let degrees = -75; degrees <= 75; degrees += 5) {
        const pose = game.cannonPose(g.origin, (degrees * Math.PI) / 180);
        close(
          Math.hypot(pose.muzzle.x - origin.x, pose.muzzle.y - origin.y),
          69.5,
        );
        assert(pose.muzzle.x > g.bounds.left && pose.muzzle.x < g.bounds.right);
        assert(pose.muzzle.y > g.bounds.top && pose.muzzle.y < g.bounds.bottom);
        assert.deepEqual(g.origin, origin);
        assert.equal(pose.flashFrame, -1);
      }
      assert(
        g.targetBounds.bottom + g.r < origin.y - Math.hypot(21, 81) - 4,
        "Capsules must not drift into the larger painted barrel",
      );
    }
});
test("shot has a short four-frame flash, axial recoil and a settled return", () => {
  const origin = { x: 100, y: 200 },
    angle = 0.7;
  const frameTimes = [0, 0.041, 0.081, 0.121];
  frameTimes.forEach((elapsed, index) => {
    const pose = game.cannonPose(origin, angle, 0.22 - elapsed);
    assert.equal(pose.flashFrame, index);
    // Recoil must slide along the barrel, never sideways across the mount.
    const dx = pose.muzzle.x - origin.x,
      dy = pose.muzzle.y - origin.y;
    close(dx * Math.cos(angle) + dy * Math.sin(angle), 0);
  });
  assert(game.cannonPose(origin, angle, 0.17).kick > 4);
  assert.equal(game.cannonPose(origin, angle, 0.05).flashFrame, -1);
  assert.equal(game.cannonPose(origin, angle, 0).kick, 0);
});
test("reduced motion keeps the painted barrel still and uses a subdued fading flash", () => {
  const origin = { x: 100, y: 200 };
  for (const remaining of [0.22, 0.18, 0.12, 0.07]) {
    const pose = game.cannonPose(origin, 0, remaining, true);
    assert.equal(pose.kick, 0);
    assert.equal(pose.flashFrame, 0);
    assert(pose.flashAlpha >= 0 && pose.flashAlpha <= 0.55);
    close(pose.muzzle.y, 130.5);
  }
});

test("relative aiming keeps contact stable and disarms taps and a return to the start", () => {
  const start = { x: 120, angle: 0.4 };
  assert.deepEqual(game.dragAim(start, 120, 320), { angle: 0.4, armed: false });
  assert.equal(game.dragAim(start, 129, 320).armed, false);
  const right = game.dragAim(start, 180, 320),
    left = game.dragAim(start, 60, 320);
  assert(right.armed && right.angle > 0.4);
  assert(left.armed && left.angle < 0.4);
  assert.deepEqual(game.dragAim(start, 120, 320), { angle: 0.4, armed: false });
});
test("drag sensitivity scales with the arena and never exceeds cannon angle limits", () => {
  const start = { x: 0, angle: 0 };
  close(
    game.dragAim(start, 80, 320).angle,
    game.dragAim(start, 150, 640).angle,
  );
  for (const width of [240, 320, 714, 1140]) {
    assert.equal(game.dragAim(start, 10000, width).angle, (75 * Math.PI) / 180);
    assert.equal(
      game.dragAim(start, -10000, width).angle,
      (-75 * Math.PI) / 180,
    );
    assert(!game.dragAim(start, 0, width).armed);
  }
});

test("three profiles increase movement and reduce radius without making tiny targets", () => {
  const levels = Object.keys(game.DIFFICULTIES);
  assert.deepEqual(levels, ["easy", "medium", "hard"]);
  for (const width of [240, 320, 754, 1140])
    for (const height of [280, 620]) {
      const gs = levels.map((level) => game.geometry(width, height, level));
      assert(gs[0].r > gs[1].r && gs[1].r > gs[2].r);
      for (const g of gs) {
        assert(g.r >= 26);
        assert(g.targetBounds.bottom >= g.targetBounds.top);
        assert(g.capacity >= 1 && g.capacity <= 6);
      }
    }
  assert(game.DIFFICULTIES.easy.speed < game.DIFFICULTIES.medium.speed);
  assert(game.DIFFICULTIES.medium.speed < game.DIFFICULTIES.hard.speed);
  assert.equal(game.difficultyFor("toString").id, "easy");
});
function challenge(count = 3) {
  return game.createRound(
    Array.from({ length: count }, (_, i) => ({ id: String(i) })),
    () => 0.99,
    { mode: "challenge", difficulty: "medium" },
  );
}
test("challenge starts after loading and never resets its deadline on resume", () => {
  const r = challenge();
  assert.equal(game.timeLeft(r, 100), 60000);
  assert.equal(game.registerHit(r, r.prompt.id, r.generation, 100), false);
  assert.equal(game.fireShot(r, { x: 0, y: 0 }, 0, 100), null);
  game.startChallenge(r, 1000);
  assert.equal(r.deadline, 61000);
  game.startChallenge(r, 15000);
  assert.equal(r.deadline, 61000);
  assert.equal(game.timeLeft(r, 31000), 30000);
  assert.equal(game.timeLeft(r, 99999), 0);
});
test("strict deadline accepts the last timely hit and rejects a late shot generation", () => {
  const r = challenge(1);
  game.startChallenge(r, 1000);
  assert(game.registerHit(r, r.prompt.id, r.generation, 60999));
  assert.equal(r.score, 10);
  const generation = r.generation;
  assert.equal(game.registerHit(r, r.prompt.id, generation, 61000), false);
  assert(r.ended);
  assert.equal(r.prompt, null);
  assert.equal(r.score, 10);
  assert.equal(r.shots.length, 0);
  assert.equal(game.fireShot(r, { x: 0, y: 0 }, 0, 100), null);
  assert.equal(game.expireChallenge(r, 70000), false);
});
test("challenge recycles full set bags, keeps old shots stale, and avoids boundary repeats", () => {
  const r = challenge(10);
  game.startChallenge(r, 0);
  let previous;
  for (let bag = 0; bag < 5; bag++) {
    const ids = [];
    for (let i = 0; i < 10; i++) {
      const id = r.prompt.id,
        generation = r.generation;
      if (!i && previous !== undefined) assert.notEqual(id, previous);
      assert(game.registerHit(r, id, generation, bag * 3000 + i * 300));
      ids.push(id);
      previous = id;
      assert.equal(
        game.registerHit(r, r.prompt.id, generation, bag * 3000 + i * 300),
        false,
      );
    }
    assert.equal(new Set(ids).size, 10);
  }
  assert.equal(r.hits, 50);
  assert.equal(r.score, 500);
  assert.equal(r.remaining.length, 10);
  assert(!r.ended);
});
test("wrong targets do not score, while paused or hidden time still reaches the deadline", () => {
  const r = challenge();
  game.startChallenge(r, 1000);
  assert.equal(game.registerHit(r, "2", r.generation, 1001), false);
  assert.equal(r.score, 0);
  assert(game.expireChallenge(r, 62000));
  assert(r.ended);
  assert.equal(game.timeLeft(r, 62000), 0);
});
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
}
function record(name, score, at = 1) {
  return { name, score, hits: score / 10, at };
}
test("highscores persist separately by set and level and keep only sorted top ten", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 13; i++)
    assert(
      game.saveHighscore("animals", "easy", record("P" + i, i * 10, i), storage)
        .ok,
    );
  const entries = game.readHighscores("animals", "easy", storage);
  assert.equal(entries.length, 10);
  assert.equal(entries[0].score, 120);
  assert.equal(entries.at(-1).score, 30);
  assert.deepEqual(game.readHighscores("animals", "hard", storage), []);
  assert.deepEqual(game.readHighscores("food", "easy", storage), []);
  const lower = game.saveHighscore(
    "animals",
    "easy",
    record("Low", 0, 50),
    storage,
  );
  assert(lower.ok);
  assert.equal(lower.rank, null);
});
test("score ties preserve older entries; names are bounded text and controls removed", () => {
  const storage = memoryStorage();
  game.saveHighscore("a", "hard", record("First", 100, 1), storage);
  const saved = game.saveHighscore(
    "a",
    "hard",
    record("  Sec\u202eond   Name  ", 100, 2),
    storage,
  );
  assert.equal(saved.rank, 2);
  assert.equal(saved.entries[1].name, "Second Name");
  assert.equal(Array.from(game.cleanName("😀".repeat(30))).length, 20);
  assert.equal(game.cleanName("\n\t  "), "");
});
test("corrupt or unavailable storage does not break play or pretend to save", () => {
  const bad = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.deepEqual(game.readHighscores("a", "easy", bad), []);
  assert.equal(game.saveHighscore("a", "easy", record("A", 10), bad).ok, false);
  const storage = memoryStorage();
  storage.setItem("lernwort.word-blaster.challenge.v1:a:easy", "{broken");
  assert.deepEqual(game.readHighscores("a", "easy", storage), []);
  assert(game.saveHighscore("a", "easy", record("Fixed", 10), storage).ok);
  for (const entry of [
    record("", 10),
    record("A", 10.5),
    record("A", 2010),
    { ...record("A", 10), hits: 99 },
    { ...record("A", 10), at: NaN },
  ])
    assert.equal(game.saveHighscore("a", "easy", entry, storage).ok, false);
});

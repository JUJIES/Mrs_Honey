const { test } = require("node:test");
const assert = require("node:assert/strict");
const game = require("../catch-pair.js");

test("socket states distinguish selection, warning, travel, mistake and match", () => {
  const piece = { active: true, gone: false, feedback: null };
  assert.equal(game.socketState(piece, null, null), "idle");
  assert.equal(game.socketState(piece, piece, null), "selected");
  const movement = { movers: [piece], phase: "announced" };
  assert.equal(game.socketState(piece, piece, movement), "pending");
  movement.phase = "moving";
  assert.equal(game.socketState(piece, null, movement), "moving");
  piece.feedback = "wrong";
  assert.equal(game.socketState(piece, null, null), "wrong");
  piece.feedback = "correct";
  assert.equal(game.socketState(piece, null, null), "correct");
});

test("completed or inactive pieces never transfer feedback to a new socket", () => {
  for (const piece of [
    undefined,
    { active: false, feedback: "correct" },
    { active: true, gone: true, feedback: "wrong" },
  ]) {
    assert.equal(game.socketState(piece, piece, null), "idle");
  }
});

function board(width, height = 700, total = 10) {
  const g = game.laneGeometry(width, total, height);
  const pieces = Array.from({ length: g.count }, (_, slot) =>
    [0, 1].map((lane) => ({
      pair: String(slot),
      lane,
      slot,
      active: true,
      gone: false,
      locked: false,
    })),
  ).flat();
  return { g, pieces };
}
function at(g, p) {
  return { x: g.x[p.slot], y: g.y[p.lane] };
}

test("desktop/tablet layouts and a single remaining item have finite, touch-sized slots", () => {
  for (const width of [264, 320, 700, 754, 968, 1024, 1180])
    for (const total of [1, 2, 10, 15]) {
      const { g } = board(width, 560, total);
      assert(g.size >= 44);
      if (width >= 700) assert(g.size >= 64);
      assert(g.count >= 1 && g.count <= total);
      assert(g.x.every(Number.isFinite));
      assert(Number.isFinite(g.height));
      assert(g.x[0] - g.r >= 0);
      assert(g.x.at(-1) + g.r <= width);
    }
});

test("neighbor and long swaps have separate continuous routes with physical clearance", () => {
  for (const width of [320, 754, 968, 1180]) {
    const { g, pieces } = board(width, 560);
    for (const lane of [0, 1])
      for (let a = 0; a < g.count; a++)
        for (let b = a + 1; b < g.count; b++) {
          const movers = pieces.filter(
            (p) => p.lane === lane && (p.slot === a || p.slot === b),
          );
          const routes = game.swapRoutes(g, lane, a, b);
          const obstacles = pieces
            .filter((p) => !movers.includes(p))
            .map((p) => at(g, p));
          assert(
            game.routeClearance(g, routes, movers, obstacles),
            `unsafe swap: ${width}/${a}/${b}`,
          );
          assert.deepEqual(game.routePoint(routes[0], 0), at(g, movers[0]));
          const end = game.routePoint(routes[0], 1);
          assert(Math.abs(end.x - g.x[b]) < 0.001);
        }
  }
});

test("cross-lane choices stay local and every accepted path is clear", () => {
  for (const width of [320, 754, 968, 1180]) {
    const { g, pieces } = board(width, 560);
    let accepted = 0;
    for (let a = 0; a < g.count; a++)
      for (let b = 0; b < g.count; b++) {
        const movers = [
          pieces.find((p) => p.lane === 0 && p.slot === a),
          pieces.find((p) => p.lane === 1 && p.slot === b),
        ];
        const routes = game.crossRoutes(g, a, b);
        const obstacles = pieces
          .filter((p) => !movers.includes(p))
          .map((p) => at(g, p));
        if (game.routeClearance(g, routes, movers, obstacles)) accepted++;
        const xs = routes.flatMap((r) => r.points.map((p) => p.x));
        assert(
          Math.max(...xs) - Math.min(...xs) <=
            Math.max(Math.abs(g.x[a] - g.x[b]), 2 * g.r + 24) + 0.001,
        );
      }
    assert(accepted > 0, `no cross-lane route available at ${width}`);
  }
});

test("selected chips remain eligible; locked, gone and other-lane chips do not", () => {
  const { pieces } = board(754);
  pieces[0].selected = true;
  assert(game.swapCandidates(pieces).some((pair) => pair.includes(pieces[0])));
  pieces[0].locked = true;
  pieces[2].gone = true;
  assert(
    game
      .swapCandidates(pieces)
      .every(
        (pair) =>
          !pair.includes(pieces[0]) &&
          !pair.includes(pieces[2]) &&
          pair[0].lane === pair[1].lane,
      ),
  );
});

test("raised inserts clear seated contents, including banking and a dock nudge", () => {
  for (const width of [320, 754, 968, 1180]) {
    const { g, pieces } = board(width, 560);
    const angle = (1.5 * Math.PI) / 180;
    const flyingRadius = (g.size / 2) * (Math.cos(angle) + Math.sin(angle));
    for (let a = 0; a < g.count; a++)
      for (let b = 0; b < g.count; b++) {
        const movers = [
          pieces.find((p) => p.lane === 0 && p.slot === a),
          pieces.find((p) => p.lane === 1 && p.slot === b),
        ];
        const routes = game.crossRoutes(g, a, b);
        const obstacles = pieces
          .filter((p) => !movers.includes(p))
          .map((p) => at(g, p));
        if (!game.routeClearance(g, routes, movers, obstacles)) continue;
        for (let step = 0; step <= 240; step++) {
          const moving = routes.map((route) => {
            const point = game.routePoint(route, step / 240);
            return { x: point.x, y: point.y - 6, r: flyingRadius };
          });
          const all = moving.concat(
            obstacles.map((p) => ({ x: p.x, y: p.y + 2, r: g.size / 2 + 1.5 })),
          );
          for (let i = 0; i < 2; i++)
            for (let j = i + 1; j < all.length; j++) {
              assert(
                Math.abs(all[i].x - all[j].x) >= all[i].r + all[j].r ||
                  Math.abs(all[i].y - all[j].y) >= all[i].r + all[j].r,
                `Raised collision at ${width}/${a}/${b}/${step}`,
              );
            }
        }
      }
  }
});

test("each catch shortens both rails, preserves order and anchors an unrelated selection", () => {
  for (const width of [320, 754, 968, 1180]) {
    let { g, pieces } = board(width, 560);
    while (pieces.length) {
      const id = pieces[0].pair,
        live = pieces.filter((p) => p.pair !== id),
        held = live.at(-1);
      const oldBounds = game.railBounds(g),
        anchor = held ? at(g, held) : null;
      const plan = game.compactionPlan(g, live, held),
        newBounds = game.railBounds(plan.geometry);
      assert(newBounds[1] - newBounds[0] < oldBounds[1] - oldBounds[0]);
      for (let step = 0; step <= 40; step++) {
        const points = plan.moves.map((m) => ({
          lane: m.p.lane,
          x: m.from.x + ((m.to.x - m.from.x) * step) / 40,
        }));
        for (let a = 0; a < points.length; a++)
          for (let b = a + 1; b < points.length; b++)
            if (points[a].lane === points[b].lane)
              assert(Math.abs(points[a].x - points[b].x) >= g.size + 15);
      }
      for (const move of plan.moves) move.p.slot = move.slot;
      g = plan.geometry;
      pieces = live;
      if (held) assert.deepEqual(at(g, held), anchor);
    }
    assert.equal(g.count, 0);
    assert.equal(game.railBounds(g)[0], game.railBounds(g)[1]);
  }
});

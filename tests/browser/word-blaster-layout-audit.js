() => {
  const game = document.querySelector(".wb-game"),
    issues = [];
  if (!game) return { ok: false, issues: ["Word Blaster fehlt"] };
  for (const el of game.querySelectorAll("button")) {
    if (el.hidden || !el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5)
      issues.push(
        "Touchziel zu klein: " +
          (el.getAttribute("aria-label") || el.textContent.trim()),
      );
  }
  if (
    game.querySelector(
      'input[type="range"],.wb-controls,.wb-left,.wb-right,.wb-fire',
    )
  )
    issues.push("Alte Steuerleiste vorhanden");
  const canvas = game.querySelector("canvas"),
    c = canvas.getBoundingClientRect(),
    zone = game.querySelector(".wb-gesture"),
    z = zone.getBoundingClientRect();
  if (c.width < 239.5 || c.height < 280) issues.push("Spielfeld zu klein");
  if (c.left < 0 || c.right > innerWidth + 1)
    issues.push("Spielfeld horizontal abgeschnitten");
  if (document.documentElement.scrollWidth > innerWidth + 1)
    issues.push("Horizontaler Überlauf");
  if (z.width < c.width - 25 || z.height < c.height - 25)
    issues.push("Ziehbereich zu klein");
  if (z.left < c.left || z.right > c.right || z.bottom > c.bottom)
    issues.push("Ziehbereich außerhalb des Spielfelds");
  if (getComputedStyle(zone).touchAction !== "none")
    issues.push("Browsergeste kann Zielen übernehmen");
  if (innerHeight >= 700 && innerWidth >= 700 && z.bottom > innerHeight)
    issues.push("Steuerung unter Tablet-/Desktoprand");
  return {
    ok: !issues.length,
    issues,
    viewport: [innerWidth, innerHeight],
    canvas: [c.width, c.height],
    gesture: [z.width, z.height],
    gestureBottom: z.bottom,
  };
};

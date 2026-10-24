/* Read-only browser audit, evaluated on the mounted game after its entrance.
 * Physical iPad/Safari compositing and sound still need device verification. */
() => {
  const issues = [];
  const root = document.querySelector(".catch-pair-game");
  if (!root) return { ok: false, issues: ["Catch a Pair is not mounted"] };
  const cards = [...root.querySelectorAll(".pair-piece:not(.is-gone)")];
  for (const dock of root.querySelectorAll('.pair-socket[data-id]')) {
    if (dock.tagName !== 'BUTTON') issues.push('Dock is not a native input target');
    const bounds=dock.getBoundingClientRect();
    if(bounds.width<44||bounds.height<44)issues.push('Dock touch target below 44px');
    if(!dock.disabled && !dock.querySelector('.pair-piece'))issues.push('Idle dock does not own its insert');
  }
  const board = root.querySelector(".pair-board").getBoundingClientRect();
  const sockets = [...root.querySelectorAll('.pair-socket')].map(el => el.getBoundingClientRect());
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44)
      issues.push("Touch target below 44px: " + card.dataset.id);
    if (rect.left < board.left - 1 || rect.right > board.right + 1)
      issues.push("Card outside board: " + card.dataset.id);
    const image = card.querySelector("img");
    if (image && (!image.complete || !image.naturalWidth))
      issues.push("Missing image: " + card.dataset.id);
    if (!['entering','announced','lifting','moving','arriving','shrinking'].includes(root.dataset.movePhase)) {
      const dock = sockets.find(s => Math.abs(s.x+s.width/2-rect.x-rect.width/2)<1 && Math.abs(s.y+s.height/2-rect.y-rect.height/2)<1);
      if (!dock || Math.abs(dock.width-rect.width-12)>1) issues.push('Card does not fit its centered socket: '+card.dataset.id);
    }
    if (image) {
      const bounds = image.getBoundingClientRect();
      if (bounds.width>rect.width || bounds.height>rect.height || bounds.width<rect.width-12) issues.push('Image does not fill card cleanly: '+card.dataset.id);
    }
    const text = card.querySelector(".pair-face:not(img)");
    if (text && text.getBoundingClientRect().width > rect.width + 1)
      issues.push("Word overflows card: " + card.dataset.id);
  }
  if (document.documentElement.scrollWidth > innerWidth + 1)
    issues.push("Horizontal page overflow");
  return {
    ok: issues.length === 0,
    issues,
    viewport: { width: innerWidth, height: innerHeight },
    cards: cards.length,
    cardSize: cards[0]?.getBoundingClientRect().width,
    pageHeight: document.documentElement.scrollHeight,
  };
}

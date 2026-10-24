/* Read-only audit for tab.playwright.evaluate(source). Run after images are ready,
   in Hear/Read/Speak at phone portrait, tablet portrait/landscape and desktop.
   This checks layout/CSS, not WebKit's actual composited pixels: Safari screenshots
   while idle AND speaking remain a release gate (see docs/RENDERING.md). */
(() => {
  const issues = [];
  const metrics = {};
  const avatar = document.querySelector('.honey-listen-button.honey-companion');
  if (!avatar) return { ok: false, issues: ['No companion on this screen'], metrics };
  const parts = [avatar, ...avatar.querySelectorAll('.honey-stage,.honey-portrait-wrap,.honey-body-rig,.honey-head-rig')];
  for (const element of parts) {
    const style = getComputedStyle(element);
    const name = element.className;
    if (style.filter !== 'none') issues.push(`${name}: filtered overflow layer`);
    if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX) ||
        ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)) issues.push(`${name}: clipping layer`);
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) issues.push(`${name}: empty bounds`);
    if (Math.abs(rect.width - rect.height) > 3) issues.push(`${name}: non-square rig`);
  }
  for (const image of document.querySelectorAll('.image-card img,.speak-image-card img,.honey-head-base,.honey-eye-frame,.honey-body-frame:not(.honey-body-frame-blend)')) {
    if (!image.complete || image.naturalWidth === 0) issues.push(`${image.className}: missing decoded image`);
  }
  for (const button of document.querySelectorAll('.image-card,.screen-back-button,.honey-companion,.mic-button')) {
    const rect = button.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) issues.push(`${button.className}: touch target below 44px`);
  }
  const head = avatar.querySelector('.honey-head-rig').getBoundingClientRect();
  const center = { x: head.x + head.width / 2, y: head.y + head.height / 2 };
  if (center.x < 0 || center.x > innerWidth || center.y < 0 || center.y > innerHeight) issues.push('Head center outside viewport');
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('Horizontal page overflow');
  metrics.viewport = { width: innerWidth, height: innerHeight };
  metrics.head = { x: head.x, y: head.y, width: head.width, height: head.height };
  metrics.cards = document.querySelectorAll('.image-card').length;
  return { ok: issues.length === 0, issues, metrics };
})

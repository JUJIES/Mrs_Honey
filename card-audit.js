const setIds = [
  "animals_01",
  "body_parts",
  "colours",
  "emotions",
  "food",
  "home",
  "school",
  "tools",
  "transport",
];

const state = {
  setFilter: "all",
  modeFilter: "all",
  sets: [],
};

const setsRoot = document.querySelector("#audit-sets");
const setFilter = document.querySelector("#set-filter");
const modeFilter = document.querySelector("#mode-filter");
const auditSummary = document.querySelector("#audit-summary");

bootstrap();

async function bootstrap() {
  try {
    state.sets = (await Promise.all(setIds.map(loadSet))).filter(Boolean);
    populateSetFilter();
    render();
  } catch (error) {
    setsRoot.innerHTML = `<div class="audit-empty">Sets konnten nicht geladen werden: ${escapeHtml(String(error))}</div>`;
  }

  setFilter.addEventListener("change", () => {
    state.setFilter = setFilter.value;
    render();
  });

  modeFilter.addEventListener("change", () => {
    state.modeFilter = modeFilter.value;
    render();
  });
}

async function loadSet(setId) {
  const response = await fetch(`data/sets/${setId}.json`);
  if (!response.ok) return null;
  return response.json();
}

function populateSetFilter() {
  const options = state.sets
    .map((set) => `<option value="${set.id}">${escapeHtml(set.title?.en || set.id)}</option>`)
    .join("");
  setFilter.insertAdjacentHTML("beforeend", options);
}

function render() {
  const visibleSets = state.sets.filter((set) => state.setFilter === "all" || set.id === state.setFilter);
  if (!visibleSets.length) {
    setsRoot.innerHTML = `<div class="audit-empty">Keine Sets für diesen Filter.</div>`;
    updateSummary([]);
    return;
  }

  setsRoot.innerHTML = visibleSets.map(renderSet).join("");
  updateSummary(visibleSets);
}

function updateSummary(visibleSets) {
  const setCount = visibleSets.length;
  const cardCount = visibleSets.reduce((sum, set) => sum + (set.items?.length || 0), 0);
  const modeCount = state.modeFilter === "all" ? 3 : 1;
  const renderedCards = cardCount * modeCount;
  const setText = setCount === 1 ? "1 Set" : `${setCount} Sets`;
  const cardText = cardCount === 1 ? "1 Karte" : `${cardCount} Karten`;
  const viewText = renderedCards === 1 ? "1 Kartenansicht" : `${renderedCards} Kartenansichten`;
  auditSummary.textContent = `${setText} / ${cardText} / ${viewText}`;
}

function renderSet(set) {
  const title = set.title?.en || set.id;
  const items = set.items || [];
  const modes = [
    { key: "hear", title: "Hören", content: renderHearMode(set, items) },
    { key: "read", title: "Lesen", content: renderReadMode(set, items) },
    { key: "speak", title: "Sprechen", content: renderSpeakMode(set, items) },
  ].filter((mode) => state.modeFilter === "all" || state.modeFilter === mode.key);

  return `
    <section class="audit-set">
      <div class="audit-set-header">
        <h2>${escapeHtml(title)}</h2>
        <div class="audit-set-meta">${items.length} Karten</div>
        <div class="audit-set-meta">${escapeHtml(set.display || "cutout")}</div>
      </div>
      <div class="audit-modes">
        ${modes
          .map(
            (mode) => `
              <section class="audit-mode">
                <h3>${mode.title}</h3>
                ${mode.content}
              </section>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHearMode(set, items) {
  return `
    <div class="game-screen" data-display="${escapeHtml(set.display || "cutout")}">
      <div class="audit-hear-grid">
        ${items
          .map(
            (item) => `
              <div class="audit-card-stack">
                <button class="image-card" type="button" aria-label="${escapeHtml(item.labels?.en || item.id)}" tabindex="-1">
                  <img src="${escapeAttribute(item.image)}" alt="" draggable="false" />
                </button>
                <div class="audit-card-label">${escapeHtml(item.labels?.en || item.id)}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderReadMode(set, items) {
  return `
    <div class="game-screen" data-display="${escapeHtml(set.display || "cutout")}">
      <div class="audit-read-grid">
        ${items
          .map(
            (item) => `
              <div class="audit-card-stack">
                <div class="read-word">${escapeHtml(item.labels?.en || item.id)}</div>
                <button class="image-card" type="button" aria-label="${escapeHtml(item.labels?.en || item.id)}" tabindex="-1">
                  <img src="${escapeAttribute(item.image)}" alt="" draggable="false" />
                </button>
                <div class="audit-card-label">${escapeHtml(item.readFeedbackText?.en || "")}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSpeakMode(set, items) {
  return `
    <div class="game-screen" data-display="${escapeHtml(set.display || "cutout")}">
      <div class="audit-speak-grid">
        ${items
          .map(
            (item) => `
              <div class="audit-card-stack">
                <div class="speak-image-card" aria-label="${escapeHtml(item.labels?.en || item.id)}">
                  <img src="${escapeAttribute(item.image)}" alt="" draggable="false" />
                </div>
                <div class="audit-card-label">${escapeHtml(item.speak?.en || item.labels?.en || item.id)}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

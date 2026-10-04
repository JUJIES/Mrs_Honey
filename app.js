const app = document.querySelector("#app");
const feedbackBundlePath = "assets/audio/feedback_en_01/feedback_en_01.json";
const coloursHiddenObjectConfigPath = "data/minigames/colours_hidden_object.json";
const winningNotificationPath = "assets/audio/ui/winning-notification.wav";
const winningApplausePath = "assets/audio/ui/animated-small-group-applause.wav";
const sentencePromptTracks = [
  "assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_01.mp3",
  "assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_02.mp3",
  "assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_03.mp3",
  "assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_04.mp3",
  "assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_05.mp3",
];

const memoryDifficultyOptions = [
  {
    id: "small",
    title: "Klein",
    pairs: 2,
    gridSize: 2,
    image: "assets/images/memory_difficulty/memory-small.svg",
  },
  {
    id: "medium",
    title: "Mittel",
    pairs: 8,
    gridSize: 4,
    image: "assets/images/memory_difficulty/memory-medium.svg",
  },
  {
    id: "large",
    title: "Groß",
    pairs: 18,
    gridSize: 6,
    image: "assets/images/memory_difficulty/memory-large.svg",
  },
];

const lucideIconPaths = {
  arrowLeft: `
    <path d="m12 19-7-7 7-7"></path>
    <path d="M19 12H5"></path>
  `,
  volume2: `
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
    <path d="M16 9a5 5 0 0 1 0 6"></path>
    <path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>
  `,
  mic: `
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <path d="M12 19v3"></path>
  `,
  bookOpenText: `
    <path d="M12 7v14"></path>
    <path d="M16 12h2"></path>
    <path d="M16 8h2"></path>
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
    <path d="M6 12h2"></path>
    <path d="M6 8h2"></path>
  `,
  copyCheck: `
    <path d="m12 15 2 2 4-4"></path>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
  `,
  sparkles: `
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.064a2 2 0 0 0-1.437 1.436l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>
    <path d="M20 3v4"></path>
    <path d="M22 5h-4"></path>
    <path d="M4 17v2"></path>
    <path d="M5 18H3"></path>
  `,
  trophy: `
    <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21h10a5 5 0 0 0-2.024-3.018A2 2 0 0 1 14 16.286V14.66"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M6 2h12v7a6 6 0 0 1-12 0z"></path>
  `,
  pawPrint: `
    <circle cx="11" cy="4" r="2"></circle>
    <circle cx="18" cy="8" r="2"></circle>
    <circle cx="20" cy="16" r="2"></circle>
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"></path>
  `,
  apple: `
    <path d="M12 6.528V3a1 1 0 0 1 1-1h0"></path>
    <path d="M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21"></path>
  `,
  palette: `
    <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
  `,
  school: `
    <path d="M14 21v-3a2 2 0 0 0-4 0v3"></path>
    <path d="M18 4.933V21"></path>
    <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6"></path>
    <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"></path>
    <path d="M6 4.933V21"></path>
    <circle cx="12" cy="9" r="2"></circle>
  `,
  bus: `
    <path d="M8 6v6"></path>
    <path d="M15 6v6"></path>
    <path d="M2 12h19.6"></path>
    <path d="M18 18h3s.5-1.7.8-3.4c.1-.7.2-1.3.2-1.9 0-2.7-2.2-4.7-4.8-4.7H6.8C4.2 8 2 10 2 12.7c0 .6.1 1.2.2 1.9C2.5 16.3 3 18 3 18h3"></path>
    <circle cx="7" cy="18" r="2"></circle>
    <circle cx="17" cy="18" r="2"></circle>
  `,
  hammer: `
    <path d="m15 12-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"></path>
    <path d="m12 9 3 3"></path>
    <path d="m17 3 4 4-4 4-4-4z"></path>
    <path d="m14 6-4 4"></path>
  `,
  smile: `
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" x2="9.01" y1="9" y2="9"></line>
    <line x1="15" x2="15.01" y1="9" y2="9"></line>
  `,
};

function lucideIcon(name) {
  return `
    <svg class="lucide-icon" viewBox="0 0 24 24" aria-hidden="true">
      ${lucideIconPaths[name]}
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mrsHoneyAvatar() {
  return `
    <span class="honey-stage">
      <span class="honey-portrait-wrap">
        <span class="honey-body-rig">
          <img
            class="honey-body-frame"
            src="assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-00.png"
            alt=""
            draggable="false"
          />
          <img
            class="honey-body-frame honey-body-frame-blend"
            src="assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-01.png"
            alt=""
            draggable="false"
          />
        </span>
        <span class="honey-head-rig">
          <img
            class="honey-head-base"
            src="assets/images/ui/mrs-honey-body-rig/head-round-no-neck-imagegen.png"
            alt=""
            draggable="false"
          />
          <img
            class="honey-eye-frame honey-eye-frame-left"
            src="assets/images/ui/mrs-honey-eye-rig/eye-left-open-v2.png"
            alt=""
            draggable="false"
          />
          <img
            class="honey-eye-frame honey-eye-frame-right"
            src="assets/images/ui/mrs-honey-eye-rig/eye-right-open-v2.png"
            alt=""
            draggable="false"
          />
          <svg class="honey-mouth-shape" viewBox="0 0 100 60" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="honeyMouthFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#5b2a34" />
                <stop offset="100%" stop-color="#321821" />
              </linearGradient>
            </defs>
            <path class="honey-mouth-fill" d="" />
          </svg>
        </span>
      </span>
    </span>
  `;
}

const state = {
  language: "en",
  set: null,
  mode: null,
  items: [],
  order: [],
  currentIndex: 0,
  choices: [],
  locked: false,
  memory: {
    cards: [],
    selected: [],
    matchedIds: new Set(),
    lastMatch: null,
    difficulty: null,
    gridSize: null,
    isWinning: false,
  },
  hiddenObject: {
    config: null,
    scene: null,
    queue: [],
    currentIndex: 0,
    isWinning: false,
    selectedTargetId: null,
    selectedResult: null,
    lastSceneId: null,
  },
  speech: {
    status: "idle",
    message: "",
    transcript: "",
  },
  audioManifest: null,
  feedbackCatalog: null,
  feedbackPools: {
    positive: { order: [], index: 0, lastPath: null },
    negative: { order: [], index: 0, lastPath: null },
  },
  sentencePromptPool: { order: [], index: 0, lastPath: null },
  lipsyncCache: new Map(),
  activeAudio: null,
  activeAudioFinish: null,
  autoAudioTimer: null,
  tutorAnimationFrame: null,
  tutorBlinkTimer: null,
  tutorBlinkFrameTimers: [],
  tutorBreathCycle: null,
  tutorBodyFrameIndex: -1,
  tutorBodyBlendIndex: -1,
  tutorHeadMotion: { translateX: 0, translateY: 0, rotate: 0 },
};

const tutorBodyFrames = [
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-00.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-01.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-02.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-03.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-04.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-05.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-06.png",
  "assets/images/ui/mrs-honey-body-rig/body-head-socket-breathe-07.png",
];

const tutorEyeFrames = {
  open: {
    left: "assets/images/ui/mrs-honey-eye-rig/eye-left-open-v2.png",
    right: "assets/images/ui/mrs-honey-eye-rig/eye-right-open-v2.png",
  },
  half: {
    left: "assets/images/ui/mrs-honey-eye-rig/eye-left-half-v2.png",
    right: "assets/images/ui/mrs-honey-eye-rig/eye-right-half-v2.png",
  },
  closed: {
    left: "assets/images/ui/mrs-honey-eye-rig/eye-left-closed-v2.png",
    right: "assets/images/ui/mrs-honey-eye-rig/eye-right-closed-v2.png",
  },
};

const tutorHeadBaseTransform = "translate(-50%, -46%)";

const feedbackTiming = {
  cueToVoiceGap: 260,
  afterCorrectFeedback: 520,
  afterWrongFeedback: 360,
  nextWordDelay: 620,
  maxAudioPlayback: 2600,
  maxFeedbackSequence: 3600,
};

const audioLevels = {
  word: 1,
  feedbackVoice: 0.86,
  victory: 0.88,
  applause: 0.82,
};

const speechProtocol = window.location.protocol === "https:" ? "https:" : "http:";
const speechHost = window.location.hostname || "127.0.0.1";
const speechConfig = {
  endpoint:
    window.location.protocol === "https:"
      ? "/api/speech/check"
      : `${speechProtocol}//${speechHost}:8787/api/speech/check`,
  recordingMs: 2600,
};

const learningSets = [
  {
    id: "animals_01",
    title: { de: "Tiere", en: "Animals" },
    file: "data/sets/animals_01.json",
    cover: "assets/images/set_cards/animals_01.jpg",
    active: true,
    icon: lucideIcon("pawPrint"),
    tone: "green",
  },
  {
    id: "food",
    title: { de: "Essen", en: "Food" },
    file: "data/sets/food.json",
    cover: "assets/images/set_cards/food.jpg",
    active: true,
    icon: lucideIcon("apple"),
    tone: "rose",
  },
  {
    id: "colours",
    title: { de: "Farben", en: "Colours" },
    file: "data/sets/colours.json",
    cover: "assets/images/set_cards/colours.jpg?v=set-card-bg-2",
    active: true,
    icon: lucideIcon("palette"),
    tone: "yellow",
  },
  {
    id: "school",
    title: { de: "Schule", en: "School" },
    file: "data/sets/school.json",
    cover: "assets/images/set_cards/school.jpg",
    active: true,
    icon: lucideIcon("school"),
    tone: "blue",
  },
  {
    id: "home",
    title: { de: "Zuhause", en: "Home" },
    file: "data/sets/home.json",
    cover: "assets/images/set_cards/home.jpg?v=home-1",
    active: true,
    tone: "blue",
  },
  {
    id: "body_parts",
    title: { de: "Körper", en: "Body" },
    file: "data/sets/body_parts.json",
    cover: "assets/images/set_cards/body_parts.jpg",
    active: true,
    icon: lucideIcon("accessibility"),
    tone: "green",
  },
  {
    id: "transport",
    title: { de: "Verkehrsmittel", en: "Transport" },
    file: "data/sets/transport.json",
    cover: "assets/images/set_cards/transport.jpg",
    active: true,
    icon: lucideIcon("bus"),
    tone: "green",
  },
  {
    id: "tools",
    title: { de: "Werkzeuge", en: "Tools" },
    file: "data/sets/tools.json",
    cover: "assets/images/set_cards/tools.jpg?v=set-card-bg-2",
    active: true,
    icon: lucideIcon("hammer"),
    tone: "yellow",
  },
  {
    id: "emotions",
    title: { de: "Gefühle", en: "Emotions" },
    file: "data/sets/emotions.json",
    cover: "assets/images/set_cards/emotions.jpg",
    active: true,
    icon: lucideIcon("smile"),
    tone: "rose",
  },
];

const modes = [
  {
    id: "hear-tap",
    title: "Hören",
    description: "Hör zu und tippe auf das passende Bild.",
    cover: "assets/images/mode_cards/hear-competency-v2.jpg",
    icon: lucideIcon("volume2"),
    tone: "blue",
    active: true,
  },
  {
    id: "read-tap",
    title: "Lesen",
    description: "Lies das Wort und finde das passende Bild.",
    cover: "assets/images/mode_cards/read-competency-v2.jpg",
    icon: lucideIcon("bookOpenText"),
    tone: "green",
    active: true,
  },
  {
    id: "speak",
    title: "Sprechen",
    description: "Sag auf Englisch in einem Satz, was du siehst.",
    cover: "assets/images/mode_cards/speak-competency-v2.jpg",
    icon: lucideIcon("mic"),
    tone: "yellow",
    active: true,
  },
];

function renderLanguageScreen() {
  stopTutorIdleAnimation();
  app.innerHTML = `
    <section class="screen">
      <div class="screen-header">
        <h1>Was möchtest du lernen?</h1>
      </div>
      <div class="language-pick">
        <button class="language-button" type="button" data-id="en" aria-label="English">
          <span class="language-flag" aria-hidden="true">🇬🇧</span>
          <strong>English</strong>
        </button>
      </div>
    </section>
  `;

  app.querySelector('[data-id="en"]').addEventListener("click", () => {
    state.language = "en";
    renderSetScreen();
  });
}

function renderSetScreen() {
  stopTutorIdleAnimation();
  app.innerHTML = `
    <section class="screen">
      <button class="screen-back-button" type="button" aria-label="Zurück zur Sprachauswahl">
        ${lucideIcon("arrowLeft")}
      </button>
      <div class="screen-header">
        <h1>Was möchtest du üben?</h1>
      </div>
      <div class="choice-grid set-grid">
        ${learningSets
          .map((set) =>
            choiceCard({
              id: set.id,
              title: set.title[state.language] || set.title.en,
              backgroundImage: set.cover,
              tone: set.tone,
              active: set.active,
            }),
          )
          .join("")}
      </div>
    </section>
  `;

  app.querySelector(".screen-back-button").addEventListener("click", () => {
    renderLanguageScreen();
  });

  learningSets
    .filter((set) => set.active)
    .forEach((set) => {
      app.querySelector(`[data-id="${set.id}"]`).addEventListener("click", async () => {
        await loadSet(set);
        renderModeScreen();
      });
    });
}

function renderModeScreen() {
  stopTutorIdleAnimation();
  app.innerHTML = `
    <section class="screen mode-screen">
      <button class="screen-back-button" type="button" aria-label="Zurück zur Set-Auswahl">
        ${lucideIcon("arrowLeft")}
      </button>
      <div class="screen-header">
        <h1>Wie möchtest du üben?</h1>
      </div>
      <div class="choice-grid mode-grid">
        ${modes
          .map((mode) => `
            <button class="choice-card competency-card" type="button" data-id="${mode.id}" data-tone="${mode.tone}" ${mode.active ? "" : "disabled"}>
              <img class="competency-illustration" src="${mode.cover}" alt="" loading="eager" decoding="async" />
              <span class="competency-copy">
                <strong>${mode.title}</strong>
                <span class="competency-description">${mode.description}</span>
              </span>
            </button>
          `)
          .join("")}
      </div>
    </section>
  `;

  app.querySelector(".screen-back-button").addEventListener("click", () => {
    renderSetScreen();
  });

  modes
    .filter((mode) => mode.active)
    .forEach((mode) => {
      app.querySelector(`[data-id="${mode.id}"]`).addEventListener("click", () => {
        startGame(mode.id);
      });
    });
}

function choiceCard({ id, title, icon, tone, active, backgroundImage }) {
  const visual = backgroundImage
    ? `<img class="choice-card-bg" src="${backgroundImage}" alt="" loading="eager" decoding="async" />`
    : `<span class="icon">${icon}</span>`;
  const imageClass = backgroundImage ? "image-choice" : "";

  return `
    <button class="choice-card ${imageClass} ${active ? "active" : ""}" type="button" data-id="${id}" data-tone="${tone}" ${
      active ? "" : "disabled"
    }>
      ${visual}
      <strong>${title}</strong>
    </button>
  `;
}

async function loadSet(setMeta) {
  if (state.set?.id === setMeta.id && state.items.length > 0) return;

  const bundledSet = window.LERNWORT_BUNDLED_SETS?.[setMeta.id];
  if (bundledSet) {
    state.set = bundledSet;
    state.items = bundledSet.items;
    return;
  }

  const response = await fetch(setMeta.file);
  if (!response.ok) {
    throw new Error(`Could not load learning set: ${setMeta.file}`);
  }

  const set = await response.json();
  state.set = set;
  state.items = set.items;
}

function startGame(mode) {
  clearScheduledAudio();
  stopActiveAudio();
  state.mode = mode;
  state.order = shuffle([...state.items]);
  state.currentIndex = 0;
  state.locked = false;
  resetMemoryState();
  resetHiddenObjectState();
  resetSpeechState();
  prepareRound();
  renderGameScreen();
  void getFeedbackCatalog();

  if (mode === "hear-tap") {
    scheduleCurrentAudio(feedbackTiming.nextWordDelay);
  }
}

function prepareRound() {
  const current = getCurrentItem();
  const distractors = shuffle(state.items.filter((item) => item.id !== current.id)).slice(0, 3);
  state.choices = shuffle([current, ...distractors]);
  state.locked = false;
  resetSpeechState();
}

function renderGameScreen() {
  const current = getCurrentItem();
  const isHearMode = state.mode === "hear-tap";
  const isReadMode = state.mode === "read-tap";
  const isSpeakMode = state.mode === "speak";
  const hasHoneyCompanion = isHearMode || isReadMode;

  if (isSpeakMode) {
    renderSpeakGameScreen(current);
    return;
  }

  const promptMarkup = isHearMode
    ? ""
    : `
        <div class="word-row read-mode">
          <h1 class="target-word">${current.labels[state.language]}</h1>
        </div>
      `;
  const honeyCompanionMarkup = hasHoneyCompanion
    ? `
        <button class="sound-button honey-listen-button honey-companion" type="button" aria-label="Mrs. Honey sagt das Wort noch einmal">
          ${mrsHoneyAvatar()}
        </button>
      `
    : "";

  app.innerHTML = `
    <section class="screen game-screen ${hasHoneyCompanion ? "has-honey-companion" : ""}" data-mode="${state.mode}" data-display="${state.set.display || "cutout"}">
      <div class="topbar game-topbar">
        <button class="screen-back-button back-button" type="button" aria-label="Zurück">
          ${lucideIcon("arrowLeft")}
        </button>
        <div class="progress">${state.currentIndex + 1} / ${state.order.length}</div>
      </div>
      <div class="game-companion-layout">
        ${honeyCompanionMarkup}
        <div class="game-content">
          <div class="prompt-panel">
            ${promptMarkup}
          </div>
          <div class="cards-grid">
            ${state.choices
              .map(
                (item) => `
                  <button class="image-card" type="button" data-id="${item.id}" aria-label="${item.labels[state.language]}">
                    <img src="${item.image}" alt="" draggable="false" />
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;

  app.querySelector(".back-button").addEventListener("click", () => {
    clearScheduledAudio();
    stopActiveAudio();
    renderModeScreen();
  });
  const soundButton = app.querySelector(".sound-button");
  if (soundButton) {
    soundButton.addEventListener("click", playCurrentAudio);
  }
  if (hasHoneyCompanion) {
    startTutorIdleAnimation();
  } else {
    stopTutorIdleAnimation();
  }
  app.querySelectorAll(".image-card").forEach((card) => {
    card.addEventListener("click", () => {
      void handleAnswer(card);
    });
  });
}

function renderSpeakGameScreen(current) {
  const honeyCompanionMarkup = `
    <button class="sound-button honey-listen-button honey-companion" type="button" aria-label="Mrs. Honey sagt das Wort noch einmal">
      ${mrsHoneyAvatar()}
    </button>
  `;

  app.innerHTML = `
    <section class="screen game-screen speak-game-screen has-honey-companion" data-mode="${state.mode}" data-display="${state.set.display || "cutout"}">
      <div class="topbar game-topbar">
        <button class="screen-back-button back-button" type="button" aria-label="Zurück">
          ${lucideIcon("arrowLeft")}
        </button>
        <div class="progress">${state.currentIndex + 1} / ${state.order.length}</div>
      </div>
      <div class="game-companion-layout">
        ${honeyCompanionMarkup}
        <div class="game-content">
          <div class="speak-stage" data-status="${state.speech.status}">
            <div class="speak-image-card" aria-label="${current.labels[state.language]}">
              <img src="${current.image}" alt="" draggable="false" />
            </div>
            <button class="mic-button" type="button" aria-label="Aufnehmen">
              ${lucideIcon("mic")}
            </button>
            <div class="speech-status" aria-live="polite">${speechStatusText()}</div>
          </div>
        </div>
      </div>
    </section>
  `;

  app.querySelector(".back-button").addEventListener("click", () => {
    clearScheduledAudio();
    stopActiveAudio();
    renderModeScreen();
  });
  app.querySelector(".sound-button").addEventListener("click", playCurrentAudio);
  startTutorIdleAnimation();
  app.querySelector(".mic-button").addEventListener("click", () => {
    void handleSpeechAttempt();
  });
}

async function handleAnswer(card) {
  if (state.locked) return;

  const current = getCurrentItem();
  const isCorrect = card.dataset.id === current.id;

  if (!isCorrect) {
    state.locked = true;
    card.classList.remove("wrong");
    void card.offsetWidth;
    card.classList.add("wrong");
    await playFeedbackAudioSafely("negative");
    await wait(feedbackTiming.afterWrongFeedback);
    card.classList.remove("wrong");
    state.locked = false;
    return;
  }

  state.locked = true;
  card.classList.add("correct");
  if (state.mode === "read-tap") {
    await playReadFeedbackAudioSafely(current);
  } else {
    await playFeedbackAudioSafely("positive");
  }
  await wait(feedbackTiming.afterCorrectFeedback);
  state.currentIndex += 1;

  if (state.currentIndex >= state.order.length) {
    await startRoundEndBonus();
    return;
  }

  prepareRound();
  renderGameScreen();

  if (state.mode === "hear-tap") {
    scheduleCurrentAudio(feedbackTiming.nextWordDelay);
  }
}

async function handleSpeechAttempt() {
  if (state.locked) return;

  const current = getCurrentItem();
  if (!current) return;

  state.locked = true;
  clearScheduledAudio();
  stopActiveAudio();

  try {
    updateSpeechState("recording", "Sprich jetzt");
    const audioBlob = await recordSpeechBlob();
    updateSpeechState("checking", "Ich prüfe");
    const result = await checkSpeechAnswer(audioBlob, current);

    if (!result.available) {
      updateSpeechState("error", "Sprachdienst fehlt");
      state.locked = false;
      return;
    }

    state.speech.transcript = result.transcript || "";

    if (!result.correct) {
      updateSpeechState("retry", "Nochmal");
      if (result.reason !== "sentence_required") {
        await playFeedbackAudioSafely("negative");
      } else {
        await playSentencePromptAudioSafely();
      }
      await wait(result.reason === "sentence_required" ? 1500 : feedbackTiming.afterWrongFeedback);
      updateSpeechState("idle", "");
      state.locked = false;
      return;
    }

    updateSpeechState("good", "");
    await playFeedbackAudioSafely("positive");
    await wait(feedbackTiming.afterCorrectFeedback);
    state.currentIndex += 1;

    if (state.currentIndex >= state.order.length) {
      await startRoundEndBonus();
      return;
    }

    prepareRound();
    renderGameScreen();
  } catch (error) {
    updateSpeechState("error", microphoneErrorText(error));
    state.locked = false;
  }
}

function renderMemoryDifficultyScreen() {
  clearScheduledAudio();
  stopActiveAudio();
  stopTutorIdleAnimation();
  resetMemoryState();

  app.innerHTML = `
    <section class="screen memory-difficulty-screen">
      <div class="topbar">
        <button class="screen-back-button back-button" type="button" aria-label="Zurück">
          ${lucideIcon("arrowLeft")}
        </button>
        <div class="breadcrumb">${state.set.title[state.language]} / Memory</div>
        <div class="progress">Bonus</div>
      </div>
      <div class="screen-header">
        <h1>Memory</h1>
      </div>
      <div class="memory-difficulty-grid">
        ${memoryDifficultyOptions.map((option) => memoryDifficultyCardMarkup(option)).join("")}
      </div>
    </section>
  `;

  app.querySelector(".back-button").addEventListener("click", () => {
    clearScheduledAudio();
    stopActiveAudio();
    renderModeScreen();
  });

  app.querySelectorAll(".memory-difficulty-card").forEach((card) => {
    card.addEventListener("click", () => startMemoryGame(card.dataset.difficulty));
  });
}

function memoryDifficultyCardMarkup(option) {
  return `
    <button class="memory-difficulty-card" type="button" data-difficulty="${option.id}">
      <img class="memory-difficulty-image" src="${option.image}" alt="" draggable="false" />
      <span class="memory-difficulty-copy">
        <strong>${option.title}</strong>
        <span>${option.gridSize} x ${option.gridSize}</span>
      </span>
    </button>
  `;
}

function renderHiddenObjectScreen() {
  stopTutorIdleAnimation();
  const currentTarget = getCurrentHiddenObjectTarget();
  const totalTargets = state.hiddenObject.queue.length;
  const progressValue = state.hiddenObject.isWinning ? totalTargets : Math.min(state.hiddenObject.currentIndex + 1, totalTargets);
  const promptText = state.hiddenObject.isWinning ? "You found them all." : currentTarget?.promptText || "Listen and tap.";
  const honeyCompanionMarkup = `
    <button class="sound-button honey-listen-button honey-companion hidden-object-honey" type="button" aria-label="Mrs. Honey sagt es noch einmal">
      ${mrsHoneyAvatar()}
    </button>
  `;

  app.innerHTML = `
    <section class="screen hidden-object-screen has-honey-companion">
      <div class="topbar">
        <button class="screen-back-button back-button" type="button" aria-label="Zurueck">
          ${lucideIcon("arrowLeft")}
        </button>
        <div class="breadcrumb">${state.set.title[state.language]} / Bonus</div>
        <div class="progress">${progressValue} / ${totalTargets}</div>
      </div>
      ${state.hiddenObject.isWinning ? `<div class="memory-win-badge" aria-live="polite">${lucideIcon("sparkles")} Great job!</div>` : ""}
      <div class="hidden-object-prompt-panel">
        <div class="hidden-object-copy">
          <div class="eyebrow">Listen and tap</div>
          <h1 class="hidden-object-target">${hiddenObjectPromptMarkup(promptText)}</h1>
        </div>
      </div>
      <div class="hidden-object-stage">
        <div class="hidden-object-scene-frame">
          <img src="${state.hiddenObject.scene.image}" alt="" draggable="false" />
          <svg class="hidden-object-hitmap" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Hidden object targets">
            ${state.hiddenObject.queue.map((target) => hiddenObjectHotspotMarkup(target)).join("")}
          </svg>
        </div>
      </div>
      ${state.hiddenObject.isWinning ? "" : honeyCompanionMarkup}
    </section>
  `;

  app.querySelector(".back-button").addEventListener("click", () => {
    clearScheduledAudio();
    stopActiveAudio();
    resetHiddenObjectState();
    renderModeScreen();
  });

  const replayButton = app.querySelector(".hidden-object-honey");
  replayButton?.addEventListener("click", () => {
    void playHiddenObjectPrompt();
  });

  if (state.hiddenObject.isWinning) {
    stopTutorIdleAnimation();
  } else {
    startTutorIdleAnimation();
  }

  app.querySelectorAll(".scene-hotspot").forEach((button) => {
    button.addEventListener("click", () => {
      void handleHiddenObjectSelection(button.dataset.targetId);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void handleHiddenObjectSelection(button.dataset.targetId);
    });
  });
}

function hiddenObjectPromptMarkup(promptText) {
  return String(promptText || "")
    .split(/(\s+)/)
    .map((part) => {
      if (!part) return "";
      if (/^\s+$/.test(part)) return escapeHtml(part);
      return `<span class="hidden-object-word" data-spoken-word="${escapeHtml(normalizeSpokenWord(part))}">${escapeHtml(part)}</span>`;
    })
    .join("");
}

function hiddenObjectHotspotMarkup(target) {
  const isCurrent = getCurrentHiddenObjectTarget()?.id === target.id;
  const isSelected = state.hiddenObject.selectedTargetId === target.id;
  const resultClass = isSelected ? `is-${state.hiddenObject.selectedResult}` : "";
  const points = shapePointsForTarget(target);

  return `
    <polygon
      class="scene-hotspot ${isCurrent ? "is-current" : ""} ${resultClass}"
      data-target-id="${target.id}"
      role="button"
      tabindex="0"
      aria-label="${target.label}"
      points="${points}"
    ></polygon>
  `;
}

function shapePointsForTarget(target) {
  if (Array.isArray(target.shape) && target.shape.length >= 3) {
    return target.shape.map((point) => `${Number(point[0]) || 0},${Number(point[1]) || 0}`).join(" ");
  }

  const x = Number(target.x) || 0;
  const y = Number(target.y) || 0;
  const w = Number(target.w) || 0;
  const h = Number(target.h) || 0;
  return `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
}

async function handleHiddenObjectSelection(targetId) {
  if (state.locked || state.hiddenObject.isWinning) return;

  const currentTarget = getCurrentHiddenObjectTarget();
  if (!currentTarget) return;

  state.hiddenObject.selectedTargetId = targetId;
  state.hiddenObject.selectedResult = targetId === currentTarget.id ? "correct" : "wrong";
  renderHiddenObjectScreen();

  if (targetId !== currentTarget.id) {
    state.locked = true;
    await playFeedbackAudioSafely("negative");
    await wait(feedbackTiming.afterWrongFeedback);
    state.hiddenObject.selectedTargetId = null;
    state.hiddenObject.selectedResult = null;
    state.locked = false;
    renderHiddenObjectScreen();
    return;
  }

  state.locked = true;
  await playFeedbackAudioSafely("positive");
  await wait(280);

  state.hiddenObject.currentIndex += 1;
  state.hiddenObject.selectedTargetId = null;
  state.hiddenObject.selectedResult = null;

  if (state.hiddenObject.currentIndex >= state.hiddenObject.queue.length) {
    state.hiddenObject.isWinning = true;
    renderHiddenObjectScreen();
    await playWinningSequence();
    clearScheduledAudio();
    state.locked = false;
    return;
  }

  state.locked = false;
  renderHiddenObjectScreen();
  scheduleCurrentAudio(320, playHiddenObjectPrompt);
}

function startMemoryGame(difficulty = "easy") {
  clearScheduledAudio();
  stopActiveAudio();
  const option = getMemoryDifficultyOption(difficulty);
  const pairItems = buildMemoryPairItems(option.pairs);
  const cards = pairItems.flatMap((item, index) => [
    { id: `${item.id}-${index}-a`, pairId: `${item.id}-${index}`, matchId: item.id, item },
    { id: `${item.id}-${index}-b`, pairId: `${item.id}-${index}`, matchId: item.id, item },
  ]);

  state.memory = {
    cards: shuffle(cards),
    selected: [],
    matchedIds: new Set(),
    lastMatch: null,
    difficulty: option.id,
    gridSize: option.gridSize,
    isWinning: false,
  };
  state.locked = false;
  renderMemoryScreen();
}

function getMemoryDifficultyOption(difficulty) {
  return memoryDifficultyOptions.find((option) => option.id === difficulty) || memoryDifficultyOptions[0];
}

function buildMemoryPairItems(pairCount) {
  if (!state.items.length) return [];

  const pairItems = [];
  while (pairItems.length < pairCount) {
    pairItems.push(...shuffle([...state.items]));
  }

  return pairItems.slice(0, pairCount);
}

function resetMemoryState() {
  state.memory = {
    cards: [],
    selected: [],
    matchedIds: new Set(),
    lastMatch: null,
    difficulty: null,
    gridSize: null,
    isWinning: false,
  };
}

function resetHiddenObjectState() {
  state.hiddenObject = {
    ...state.hiddenObject,
    scene: null,
    queue: [],
    currentIndex: 0,
    isWinning: false,
    selectedTargetId: null,
    selectedResult: null,
  };
}

async function startRoundEndBonus() {
  if (state.set?.id === "colours") {
    try {
      await startColoursHiddenObjectGame();
    } catch (error) {
      console.info("Hidden object bonus fallback.", error);
      renderMemoryDifficultyScreen();
    }
    return;
  }

  renderMemoryDifficultyScreen();
}

async function getColoursHiddenObjectConfig() {
  if (state.hiddenObject.config) return state.hiddenObject.config;

  if (window.LERNWORT_BUNDLED_MINIGAMES?.colours_hidden_object) {
    state.hiddenObject.config = window.LERNWORT_BUNDLED_MINIGAMES.colours_hidden_object;
    return state.hiddenObject.config;
  }

  const response = await fetch(coloursHiddenObjectConfigPath, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Could not load hidden object config: ${coloursHiddenObjectConfigPath}`);
  }

  const config = await response.json();
  state.hiddenObject.config = config;
  return config;
}

function pickHiddenObjectScene(scenes, lastSceneId) {
  const shuffledScenes = shuffle(scenes);
  if (lastSceneId && shuffledScenes.length > 1 && shuffledScenes[0]?.id === lastSceneId) {
    shuffledScenes.push(shuffledScenes.shift());
  }
  return shuffledScenes[0] || null;
}

function getCurrentHiddenObjectTarget() {
  return state.hiddenObject.queue[state.hiddenObject.currentIndex] || null;
}

async function startColoursHiddenObjectGame() {
  clearScheduledAudio();
  stopActiveAudio();
  stopTutorIdleAnimation();
  resetMemoryState();
  resetHiddenObjectState();

  const config = await getColoursHiddenObjectConfig();
  const scene = pickHiddenObjectScene(config.scenes || [], state.hiddenObject.lastSceneId);
  if (!scene) {
    renderMemoryDifficultyScreen();
    return;
  }

  const targetCount = Math.min(config.targetsPerRound || 5, scene.targets.length);
  state.hiddenObject = {
    ...state.hiddenObject,
    scene,
    queue: shuffle(scene.targets).slice(0, targetCount),
    currentIndex: 0,
    isWinning: false,
    selectedTargetId: null,
    selectedResult: null,
    lastSceneId: scene.id,
  };

  state.locked = false;
  renderHiddenObjectScreen();
  scheduleCurrentAudio(feedbackTiming.nextWordDelay, playHiddenObjectPrompt);
}

function renderMemoryScreen() {
  stopTutorIdleAnimation();
  const totalPairs = state.memory.cards.length / 2;
  const matchedPairs = Math.floor(state.memory.matchedIds.size / 2);
  const displayWord = state.memory.lastMatch?.labels?.[state.language] || "";

  app.innerHTML = `
    <section class="screen memory-screen ${state.memory.isWinning ? "is-winning" : ""}" data-display="${
      state.set.display || "cutout"
    }" data-pairs="${totalPairs}" data-grid="${state.memory.gridSize || 4}">
      <div class="topbar">
        <button class="screen-back-button back-button" type="button" aria-label="Zurück">
          ${lucideIcon("arrowLeft")}
        </button>
        <div class="progress">${matchedPairs} / ${totalPairs}</div>
      </div>
      <div class="memory-word-panel" aria-live="polite">
        <span>${displayWord || "Memory"}</span>
      </div>
      <div class="memory-grid">
        ${state.memory.cards.map((card) => memoryCardMarkup(card)).join("")}
      </div>
    </section>
  `;

  app.querySelector(".back-button").addEventListener("click", () => {
    clearScheduledAudio();
    stopActiveAudio();
    renderModeScreen();
  });

  app.querySelectorAll(".memory-card:not([disabled])").forEach((card) => {
    card.addEventListener("click", () => {
      void handleMemoryCard(card.dataset.cardId);
    });
  });
}

function memoryCardMarkup(card) {
  const isMatched = state.memory.matchedIds.has(card.id);
  const isSelected = state.memory.selected.some((selectedCard) => selectedCard.id === card.id);
  const isOpen = isMatched || isSelected;
  const label = card.item.labels[state.language];

  return `
    <button class="memory-card ${isOpen ? "is-open" : ""} ${isMatched ? "is-matched" : ""}" type="button"
      data-card-id="${card.id}" aria-label="${isOpen ? label : "Verdeckte Memory-Karte"}" ${isMatched ? "disabled" : ""}>
      <span class="memory-card-face memory-card-back" aria-hidden="true">?</span>
      <span class="memory-card-face memory-card-front">
        <img src="${card.item.image}" alt="" draggable="false" />
        <span class="memory-card-word">${isMatched ? label : ""}</span>
      </span>
    </button>
  `;
}

async function handleMemoryCard(cardId) {
  if (state.locked) return;

  const card = state.memory.cards.find((memoryCard) => memoryCard.id === cardId);
  if (!card || state.memory.matchedIds.has(card.id)) return;
  if (state.memory.selected.some((selectedCard) => selectedCard.id === card.id)) return;

  state.memory.selected.push(card);
  renderMemoryScreen();

  if (state.memory.selected.length < 2) return;

  state.locked = true;
  const [firstCard, secondCard] = state.memory.selected;

  if (firstCard.matchId !== secondCard.matchId) {
    await wait(760);
    state.memory.selected = [];
    state.locked = false;
    renderMemoryScreen();
    return;
  }

  state.memory.matchedIds.add(firstCard.id);
  state.memory.matchedIds.add(secondCard.id);
  state.memory.lastMatch = firstCard.item;
  state.memory.selected = [];
  renderMemoryScreen();
  await playMemoryMatchFeedback(firstCard.item);
  await wait(300);

  if (state.memory.matchedIds.size >= state.memory.cards.length) {
    state.memory.isWinning = true;
    renderMemoryScreen();
    await playWinningSequence();
    clearScheduledAudio();
    state.locked = false;
    return;
  }

  state.locked = false;
}

async function playMemoryMatchFeedback(item) {
  const track = item?.readFeedback?.[state.language];

  if (track && (await audioExists(track))) {
    await playReadFeedbackAudioSafely(item);
    return;
  }

  await playFeedbackAudioSafely("positive");

  const wordAudio = item?.audio?.[state.language];
  if (wordAudio && (await audioExists(wordAudio))) {
    await playAudioFile(wordAudio, audioLevels.word);
  }
}

async function playWinningSequence() {
  try {
    await withTimeout(playWinningSound(), 8500);
  } catch {
    stopActiveAudio();
  }
}

async function playWinningSound() {
  const notificationResult = await playAudioFile(winningNotificationPath, audioLevels.victory, 3500);
  if (notificationResult === "error") {
    await playSyntheticWinningSound();
  }

  const applauseResult = await playAudioFile(winningApplausePath, audioLevels.applause, 6500);
  if (applauseResult === "error") {
    await wait(400);
  }
}

async function playSyntheticWinningSound() {
  if (window.Tone?.PolySynth && window.Tone?.Synth) {
    await playToneJsWinningSound();
    return;
  }

  await playFallbackWinningSound();
}

async function playToneJsWinningSound() {
  const Tone = window.Tone;
  await Tone.start();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle8" },
    envelope: {
      attack: 0.01,
      decay: 0.16,
      sustain: 0.34,
      release: 0.5,
    },
  }).toDestination();
  synth.volume.value = -9;

  const now = Tone.now();
  synth.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
  synth.triggerAttackRelease(["D5", "F5", "A5"], "8n", now + 0.16);
  synth.triggerAttackRelease(["E5", "G5", "B5"], "8n", now + 0.32);
  synth.triggerAttackRelease(["G5", "B5", "D6"], "4n", now + 0.52);
  synth.triggerAttackRelease(["C6", "E6"], "8n", now + 0.82);

  await wait(1350);
  synth.dispose();
}

async function playFallbackWinningSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  await context.resume().catch(() => {});
  playToneSequence(context, [
    { frequency: 523.25, start: 0, duration: 0.12, gain: 0.08 },
    { frequency: 659.25, start: 0.1, duration: 0.12, gain: 0.09 },
    { frequency: 783.99, start: 0.2, duration: 0.14, gain: 0.1 },
    { frequency: 1046.5, start: 0.36, duration: 0.28, gain: 0.11 },
    { frequency: 1318.51, start: 0.62, duration: 0.18, gain: 0.075 },
  ]);
  await wait(1050);
  if (context.close) {
    await context.close().catch(() => {});
  }
}

function getCurrentItem() {
  return state.order[state.currentIndex];
}

async function playCurrentAudio() {
  const current = getCurrentItem();
  if (!current) return;

  const audioPath = current.audio?.[state.language];
  const spokenWord = current.labels[state.language] || "";
  const canUseAudio = audioPath ? await audioExists(audioPath) : false;

  if (canUseAudio) {
    const mouthCues = await loadLipsyncCues(audioPath);

    await playAudioFile(audioPath, audioLevels.word, feedbackTiming.maxAudioPlayback, {
      onStart: (audio) => syncTutorMouthToAudio(audio, mouthCues, spokenWord),
      onFinish: () => setTutorSpeaking(false),
    });
  }
}

async function playHiddenObjectPrompt() {
  const currentTarget = getCurrentHiddenObjectTarget();
  if (!currentTarget) return;
  clearScheduledAudio();

  const audioPath = currentTarget.audio;
  if (audioPath && (await audioExists(audioPath))) {
    const promptText = currentTarget.promptText || "";
    const mouthCues = await loadLipsyncCues(audioPath);

    await playAudioFile(audioPath, audioLevels.feedbackVoice, 4200, {
      onStart: (audio) => {
        const cleanupMouth = syncTutorMouthToAudio(audio, mouthCues, promptText);
        const cleanupWords = syncHiddenObjectPromptWordsToAudio(audio, promptText);
        return () => {
          cleanupWords?.();
          cleanupMouth?.();
        };
      },
      onFinish: () => clearHiddenObjectPromptHighlight(),
    });
  }
}

function setTutorSpeaking(isSpeaking) {
  const tutorButton = app.querySelector(".honey-listen-button");
  if (!tutorButton) return;

  tutorButton.classList.toggle("is-speaking", isSpeaking);
  if (!isSpeaking) {
    setTutorMouthShape();
  }
}

const tutorMouthRest = { open: 0, width: 0.46, round: 0.1, y: 0, flat: 0.95 };
const tutorMouthPresets = {
  X: tutorMouthRest,
  A: { open: 0.04, width: 0.48, round: 0.06, y: 0.1, flat: 0.88 },
  B: { open: 0.14, width: 0.58, round: 0.18, y: 0.18, flat: 0.72 },
  C: { open: 0.5, width: 0.72, round: 0.2, y: 0.38, flat: 0.28 },
  D: { open: 0.78, width: 0.75, round: 0.18, y: 0.55, flat: 0.12 },
  E: { open: 0.45, width: 0.48, round: 0.82, y: 0.32, flat: 0.2 },
  F: { open: 0.32, width: 0.34, round: 1, y: 0.3, flat: 0.08 },
  G: { open: 0.1, width: 0.52, round: 0.1, y: 0.12, flat: 0.8 },
  H: { open: 0.58, width: 0.62, round: 0.28, y: 0.42, flat: 0.22 },
};

function setTutorMouthShape(shape = tutorMouthRest) {
  const tutorButton = app.querySelector(".honey-listen-button");
  if (!tutorButton) return;

  const mouthPath = tutorButton.querySelector(".honey-mouth-fill");
  const sourceOpen = clamp(Number(shape.open) || 0, 0, 1);
  const open = sourceOpen;
  const smile = 0.42;
  const restSmileBoost = sourceOpen < 0.02 ? smile * 0.14 : smile * 0.04;
  const width = clamp((Number(shape.width) || tutorMouthRest.width) + 0.1 + restSmileBoost, 0.25, 0.95);
  const round = clamp(Number(shape.round) || 0, 0, 1);
  const flat = clamp((Number(shape.flat) ?? 0.35) + 0.05 - open * 0.72, 0, 1);
  const y = Number(shape.y) || 0;
  const mouthHeight = 58;
  const restHeight = 3.6;
  const restSmileHeight = sourceOpen < 0.02 ? smile * 5.4 : 0;
  const visualHeight = restHeight + restSmileHeight + open * mouthHeight * (1 - flat * 0.16);
  const mouthY = y * 4.5 + open * 2.6 + (sourceOpen < 0.02 ? smile * 0.8 : 0);
  const shadowOpacity = clamp(0.1 + open * 0.18, 0.1, 0.28);
  const smileCurve = clamp(smile * (1 - open * 0.72), 0, 1);

  tutorButton.style.setProperty("--honey-mouth-opacity", "1");
  tutorButton.style.setProperty("--honey-mouth-scale-x", width.toFixed(3));
  tutorButton.style.setProperty("--honey-mouth-y", `${mouthY.toFixed(1)}px`);
  tutorButton.style.setProperty("--honey-mouth-shadow-opacity", shadowOpacity.toFixed(3));
  mouthPath?.setAttribute("d", buildTutorMouthPath({ open, round, flat, smile: smileCurve, visualHeight, mouthHeight }));
}

function buildTutorMouthPath({ open, round, flat, smile, visualHeight, mouthHeight }) {
  const height = clamp((visualHeight / Math.max(mouthHeight, 1)) * 60, 2.4, 56);
  const centerY = 30;
  const left = 6;
  const right = 94;

  if (open < 0.16) {
    const curve = 3 + smile * 18 + open * 8;
    const thickness = clamp(height * (0.72 + open * 0.8), 2.2, 14);
    const topCurve = curve - thickness;
    return [
      `M ${left} ${centerY.toFixed(2)}`,
      `C 28 ${(centerY + curve).toFixed(2)} 72 ${(centerY + curve).toFixed(2)} ${right} ${centerY.toFixed(2)}`,
      `C 72 ${(centerY + topCurve).toFixed(2)} 28 ${(centerY + topCurve).toFixed(2)} ${left} ${centerY.toFixed(2)}`,
      "Z",
    ].join(" ");
  }

  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  const sidePull = 16 + round * 9;
  const verticalPull = 0.56 + round * 0.12 - flat * 0.08;
  const smileDrop = smile * 3.5;

  return [
    `M 50 ${top.toFixed(2)}`,
    `C ${(50 + sidePull).toFixed(2)} ${top.toFixed(2)} ${right} ${(centerY - height * verticalPull * 0.5).toFixed(2)} ${right} ${(centerY + smileDrop).toFixed(2)}`,
    `C ${right} ${(centerY + height * verticalPull).toFixed(2)} ${(50 + sidePull).toFixed(2)} ${bottom.toFixed(2)} 50 ${bottom.toFixed(2)}`,
    `C ${(50 - sidePull).toFixed(2)} ${bottom.toFixed(2)} ${left} ${(centerY + height * verticalPull).toFixed(2)} ${left} ${(centerY + smileDrop).toFixed(2)}`,
    `C ${left} ${(centerY - height * verticalPull * 0.5).toFixed(2)} ${(50 - sidePull).toFixed(2)} ${top.toFixed(2)} 50 ${top.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function syncTutorMouthToAudio(audio, mouthCues, word) {
  const cues = normalizeMouthCues(mouthCues);
  const timeline = cues.length ? cues : buildFallbackMouthCues(word, audio.duration);
  const audioClock = createAudioClock(audio);
  let animationFrame = null;
  let lastFrameTime = 0;
  let cueIndex = 0;
  let visibleShape = { ...tutorMouthRest };
  let active = true;

  setTutorSpeaking(true);
  setTutorMouthShape(visibleShape);

  const tick = (frameTime) => {
    if (!active) return;

    const currentTime = audioClock.currentTime();
    const targetShape = getMouthShapeAtTime(timeline, currentTime, cueIndex);
    cueIndex = targetShape.index;

    const elapsed = lastFrameTime ? frameTime - lastFrameTime : 16;
    lastFrameTime = frameTime;
    const easing = 1 - Math.pow(0.001, Math.min(elapsed, 80) / 120);
    visibleShape = blendMouthShape(visibleShape, targetShape.shape, easing);
    setTutorMouthShape(visibleShape);
    updateTutorSpeakingHeadMotion(currentTime, targetShape.shape.open);

    animationFrame = window.requestAnimationFrame(tick);
  };

  animationFrame = window.requestAnimationFrame(tick);

  return () => {
    active = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    setTutorSpeaking(false);
    resetTutorHeadMotion();
  };
}

function syncHiddenObjectPromptWordsToAudio(audio, promptText) {
  const wordElements = [...app.querySelectorAll(".hidden-object-word")];
  if (!wordElements.length) return null;

  const timeline = buildPromptWordTimeline(promptText, audio.duration);
  const audioClock = createAudioClock(audio);
  let interval = null;
  let active = true;
  let activeIndex = -1;

  const setActiveIndex = (nextIndex) => {
    if (activeIndex === nextIndex) return;
    activeIndex = nextIndex;
    wordElements.forEach((element, index) => {
      element.classList.toggle("is-active", index === activeIndex);
      element.classList.toggle("is-spoken", index < activeIndex);
    });
  };

  const tick = () => {
    if (!active) return;

    const currentTime = audioClock.currentTime();
    const nextIndex = timeline.findIndex((word) => currentTime >= word.start && currentTime < word.end);
    setActiveIndex(nextIndex);
  };

  tick();
  interval = window.setInterval(tick, 48);

  return () => {
    active = false;
    if (interval) window.clearInterval(interval);
    clearHiddenObjectPromptHighlight();
  };
}

function createAudioClock(audio) {
  const startedAt = window.performance.now();
  let lastMediaTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  let lastMediaClock = startedAt;

  return {
    currentTime() {
      const now = window.performance.now();
      const mediaTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

      if (mediaTime > lastMediaTime + 0.006) {
        lastMediaTime = mediaTime;
        lastMediaClock = now;
        return mediaTime;
      }

      if (!audio.paused && !audio.ended && now - lastMediaClock > 140) {
        return Math.max(mediaTime, (now - startedAt) / 1000);
      }

      return mediaTime;
    },
  };
}

function clearHiddenObjectPromptHighlight() {
  app.querySelectorAll(".hidden-object-word").forEach((element) => {
    element.classList.remove("is-active", "is-spoken");
  });
}

function buildPromptWordTimeline(promptText, durationSeconds) {
  const words = String(promptText || "")
    .split(/\s+/)
    .map(normalizeSpokenWord)
    .filter(Boolean);
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0.4 ? durationSeconds : 2.2;
  const usableStart = Math.min(0.08, duration * 0.06);
  const usableEnd = Math.max(usableStart + 0.3, duration - Math.min(0.18, duration * 0.08));
  const totalWeight = words.reduce((sum, word) => sum + promptWordWeight(word), 0) || 1;
  let cursor = usableStart;

  return words.map((word, index) => {
    const weight = promptWordWeight(word);
    const end = index === words.length - 1 ? usableEnd : cursor + ((usableEnd - usableStart) * weight) / totalWeight;
    const entry = { word, start: cursor, end };
    cursor = end;
    return entry;
  });
}

function promptWordWeight(word) {
  const normalized = normalizeSpokenWord(word);
  if (!normalized) return 0;
  if (["can", "you", "on", "the", "a", "an"].includes(normalized)) return 0.72;
  if (normalized === "click") return 1.06;
  return Math.max(0.9, Math.min(1.55, normalized.length / 4.2));
}

function normalizeSpokenWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function startTutorIdleAnimation() {
  stopTutorIdleAnimation();
  preloadTutorFrames();
  state.tutorBreathCycle = createTutorBreathCycle(0);
  state.tutorBodyFrameIndex = -1;
  state.tutorBodyBlendIndex = -1;
  setTutorMouthShape(tutorMouthRest);
  resetTutorHeadMotion();
  setTutorEyeFrame("open");
  scheduleTutorBlink();

  const startedAt = window.performance.now();
  const tick = (frameTime) => {
    const seconds = (frameTime - startedAt) / 1000;
    const breath = getTutorBreathValue(seconds);
    setTutorBodyFrame(breath * (tutorBodyFrames.length - 1));
    state.tutorAnimationFrame = window.requestAnimationFrame(tick);
  };

  state.tutorAnimationFrame = window.requestAnimationFrame(tick);
}

function stopTutorIdleAnimation() {
  if (state.tutorAnimationFrame) {
    window.cancelAnimationFrame(state.tutorAnimationFrame);
    state.tutorAnimationFrame = null;
  }

  if (state.tutorBlinkTimer) {
    window.clearTimeout(state.tutorBlinkTimer);
    state.tutorBlinkTimer = null;
  }

  state.tutorBlinkFrameTimers.forEach((timer) => window.clearTimeout(timer));
  state.tutorBlinkFrameTimers = [];

  state.tutorBreathCycle = null;
  state.tutorBodyFrameIndex = -1;
  state.tutorBodyBlendIndex = -1;
  state.tutorHeadMotion = { translateX: 0, translateY: 0, rotate: 0 };
}

function preloadTutorFrames() {
  [...tutorBodyFrames, ...Object.values(tutorEyeFrames).flatMap((frame) => [frame.left, frame.right])].forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function setTutorBodyFrame(position) {
  const tutorButton = app.querySelector(".honey-listen-button");
  if (!tutorButton) return;

  const bodyFrame = tutorButton.querySelector(".honey-body-frame:not(.honey-body-frame-blend)");
  const bodyFrameBlend = tutorButton.querySelector(".honey-body-frame-blend");
  if (!bodyFrame || !bodyFrameBlend) return;

  const framePosition = clamp(Number(position) || 0, 0, tutorBodyFrames.length - 1);
  const baseIndex = Math.floor(framePosition);
  const blendIndex = Math.min(baseIndex + 1, tutorBodyFrames.length - 1);
  const blendAmount = framePosition - baseIndex;

  if (baseIndex !== state.tutorBodyFrameIndex) {
    state.tutorBodyFrameIndex = baseIndex;
    bodyFrame.setAttribute("src", tutorBodyFrames[baseIndex]);
  }

  if (blendIndex !== state.tutorBodyBlendIndex) {
    state.tutorBodyBlendIndex = blendIndex;
    bodyFrameBlend.setAttribute("src", tutorBodyFrames[blendIndex]);
  }

  bodyFrameBlend.style.opacity = blendIndex === baseIndex ? "0" : blendAmount.toFixed(3);
}

function getTutorBreathValue(seconds) {
  const cycleDuration = 60 / 9;
  let cycle = state.tutorBreathCycle || createTutorBreathCycle(0);

  if (seconds >= cycle.start + cycle.duration) {
    cycle = createTutorBreathCycle(cycle.start + cycle.duration);
    state.tutorBreathCycle = cycle;
  }

  const phase = clamp((seconds - cycle.start) / cycle.duration, 0, 1);
  const inhale = 0.43;
  const topEase = 0.02;
  const exhale = 0.48;
  const inhaleEnd = inhale;
  const topEnd = inhale + topEase;
  const exhaleEnd = topEnd + exhale;

  if (phase < inhaleEnd) {
    return easeOutCubic(phase / inhaleEnd) * cycle.depth;
  }

  if (phase < topEnd) {
    return cycle.depth * (1 - ((phase - inhaleEnd) / topEase) * 0.02);
  }

  if (phase < exhaleEnd) {
    return 0.98 * (1 - easeOutCubic((phase - topEnd) / exhale)) * cycle.depth;
  }

  return 0;
}

function createTutorBreathCycle(start) {
  const cycleDuration = 60 / 9;
  const seed = Math.floor(start / cycleDuration) + 1;
  const periodJitter = (seededNoise(seed) - 0.5) * 0.1;
  const depthJitter = (seededNoise(seed + 17) - 0.5) * 0.12;
  return {
    start,
    duration: cycleDuration * (1 + periodJitter),
    depth: clamp(0.65 + depthJitter, 0.5, 0.78),
  };
}

function scheduleTutorBlink() {
  if (state.tutorBlinkTimer) window.clearTimeout(state.tutorBlinkTimer);
  const delay = 2600 + Math.random() * 4200;
  state.tutorBlinkTimer = window.setTimeout(() => {
    triggerTutorBlink(Math.random() < 0.18);
    scheduleTutorBlink();
  }, delay);
}

function triggerTutorBlink(doubleBlink = false) {
  const sequence = [
    ["half", 42],
    ["closed", 74],
    ["half", 44],
    ["open", doubleBlink ? 96 : 0],
  ];
  if (doubleBlink) {
    sequence.push(["half", 38], ["closed", 66], ["half", 40], ["open", 0]);
  }

  let elapsed = 0;
  sequence.forEach(([frame, duration]) => {
    const timer = window.setTimeout(() => setTutorEyeFrame(frame), elapsed);
    state.tutorBlinkFrameTimers.push(timer);
    elapsed += duration;
  });
}

function setTutorEyeFrame(frameName) {
  const frame = tutorEyeFrames[frameName] || tutorEyeFrames.open;
  const tutorButton = app.querySelector(".honey-listen-button");
  if (!tutorButton) return;

  const left = tutorButton.querySelector(".honey-eye-frame-left");
  const right = tutorButton.querySelector(".honey-eye-frame-right");
  if (left) left.setAttribute("src", frame.left);
  if (right) right.setAttribute("src", frame.right);
}

function updateTutorSpeakingHeadMotion(seconds, mouthOpen) {
  const amount = 0.4;
  const open = clamp(Number(mouthOpen) || 0, 0, 1);
  const nod = Math.sin(seconds * 4.2) * 0.7 + Math.sin(seconds * 2.1 + 0.8) * 0.38;
  const sway = Math.sin(seconds * 2.5 + 1.4);
  setTutorHeadMotion(
    {
      translateX: sway * 0.32 * amount,
      translateY: (-0.8 - open * 1.4 + nod * 0.35) * amount,
      rotate: (sway * 0.45 + nod * 0.12) * amount,
    },
    186,
  );
}

function setTutorHeadMotion({ translateX = 0, translateY = 0, rotate = 0 } = {}, smoothingMs = 0) {
  const headRig = app.querySelector(".honey-head-rig");
  if (!headRig) return;

  if (smoothingMs > 0) {
    const easing = 1 - Math.pow(0.001, 16 / smoothingMs);
    state.tutorHeadMotion = {
      translateX: lerp(state.tutorHeadMotion.translateX, translateX, easing),
      translateY: lerp(state.tutorHeadMotion.translateY, translateY, easing),
      rotate: lerp(state.tutorHeadMotion.rotate, rotate, easing),
    };
  } else {
    state.tutorHeadMotion = { translateX, translateY, rotate };
  }

  headRig.style.transform = `${tutorHeadBaseTransform} translate(${state.tutorHeadMotion.translateX.toFixed(2)}%, ${state.tutorHeadMotion.translateY.toFixed(2)}%) rotate(${state.tutorHeadMotion.rotate.toFixed(2)}deg)`;
}

function resetTutorHeadMotion() {
  setTutorHeadMotion();
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function seededNoise(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function lerp(from, to, amount) {
  return from + (to - from) * clamp(amount, 0, 1);
}

function normalizeMouthCues(mouthCues) {
  if (!Array.isArray(mouthCues)) return [];

  return mouthCues
    .map((cue) => ({
      start: Math.max(0, Number(cue.start) || 0),
      end: Math.max(0, Number(cue.end) || 0),
      value: String(cue.value || "X").toUpperCase(),
    }))
    .filter((cue) => cue.end > cue.start)
    .sort((a, b) => a.start - b.start);
}

function getMouthShapeAtTime(cues, time, startIndex = 0) {
  if (!cues.length) return { shape: tutorMouthRest, index: 0 };

  let index = clamp(Math.floor(startIndex), 0, cues.length - 1);

  while (index < cues.length - 1 && time >= cues[index].end - 0.006) {
    index += 1;
  }

  while (index > 0 && time < cues[index].start) {
    index -= 1;
  }

  const cue = time >= cues[index].start && time <= cues[index].end ? cues[index] : null;
  return {
    shape: mouthShapeForCue(cue?.value || "X"),
    index,
  };
}

function mouthShapeForCue(value) {
  return tutorMouthPresets[value] || tutorMouthPresets.X;
}

function blendMouthShape(current, target, amount) {
  return {
    open: current.open + (target.open - current.open) * amount,
    width: current.width + (target.width - current.width) * amount,
    round: current.round + (target.round - current.round) * amount,
    y: current.y + ((target.y ?? 0) - (current.y ?? 0)) * amount,
    flat: current.flat + ((target.flat ?? 0.35) - (current.flat ?? 0.35)) * amount,
  };
}

function buildFallbackMouthCues(word, durationSeconds) {
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0.2 ? durationSeconds : 1.05;
  const values = fallbackCueValuesForWord(word);
  const cueCount = Math.max(values.length, 1);
  const usableStart = Math.min(0.08, duration * 0.14);
  const usableEnd = Math.max(usableStart + 0.16, duration - Math.min(0.18, duration * 0.18));
  const step = (usableEnd - usableStart) / cueCount;
  const cues = [{ start: 0, end: usableStart, value: "X" }];

  values.forEach((value, index) => {
    cues.push({
      start: usableStart + index * step,
      end: usableStart + (index + 1) * step,
      value,
    });
  });

  cues.push({ start: usableEnd, end: duration, value: "X" });
  return cues;
}

function fallbackCueValuesForWord(word) {
  const text = String(word || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/e$/, "");

  if (!text) return ["C"];

  const values = [];
  let index = 0;

  while (index < text.length) {
    const pair = text.slice(index, index + 2);
    if (["oo", "ou", "ow", "oa"].includes(pair)) {
      values.push("F");
      index += 2;
      continue;
    }

    if (["ee", "ea", "ie"].includes(pair)) {
      values.push("C");
      index += 2;
      continue;
    }

    const letter = text[index];
    if ("mbp".includes(letter)) values.push("A");
    else if ("ouwq".includes(letter)) values.push("F");
    else if ("oer".includes(letter)) values.push("E");
    else if ("a".includes(letter)) values.push("D");
    else if ("eiynl".includes(letter)) values.push("C");
    else if (!"cdgkjstxzhrfv".includes(letter)) values.push("C");
    index += 1;
  }

  const collapsed = values.filter((value, valueIndex) => valueIndex === 0 || value !== values[valueIndex - 1]);
  return collapsed.length ? collapsed : ["C"];
}

async function loadLipsyncCues(audioPath) {
  const jsonPath = lipsyncPathForAudio(audioPath);
  if (!jsonPath) return null;
  if (state.lipsyncCache.has(jsonPath)) return state.lipsyncCache.get(jsonPath);

  try {
    const response = await fetch(jsonPath, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Missing lipsync JSON: ${jsonPath}`);
    const data = await response.json();
    const cues = normalizeMouthCues(data.mouthCues);
    state.lipsyncCache.set(jsonPath, cues);
    return cues;
  } catch {
    state.lipsyncCache.set(jsonPath, null);
    return null;
  }
}

function lipsyncPathForAudio(audioPath) {
  if (!audioPath || !audioPath.startsWith("assets/audio/")) return null;
  return audioPath.replace(/^assets\/audio\//, "assets/lipsync/").replace(/\.(mp3|wav|m4a|aac)$/i, ".json");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function recordSpeechBlob() {
  return new Promise(async (resolve, reject) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      reject(new Error("Recording is not supported in this browser."));
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      reject(error);
      return;
    }

    const chunks = [];
    const mimeType = preferredRecordingMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);
    let stopTimer = null;

    const stopStream = () => {
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener(
      "stop",
      () => {
        window.clearTimeout(stopTimer);
        stopStream();
        resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
      },
      { once: true },
    );

    recorder.addEventListener(
      "error",
      (event) => {
        window.clearTimeout(stopTimer);
        stopStream();
        reject(event.error || new Error("Recording failed."));
      },
      { once: true },
    );

    recorder.start();
    stopTimer = window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, speechConfig.recordingMs);
  });
}

async function checkSpeechAnswer(audioBlob, current) {
  const formData = new FormData();
  const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";

  formData.append("audio", audioBlob, `speech.${extension}`);
  formData.append("expected", current.labels[state.language]);
  formData.append("language", state.language);
  formData.append("itemId", current.id);
  formData.append("requiresSentence", "true");
  formData.append(
    "vocabulary",
    JSON.stringify(state.items.map((item) => item.labels[state.language]).filter(Boolean)),
  );

  try {
    const response = await fetch(speechConfig.endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return { available: false, correct: false, transcript: "" };
    }

    const data = await response.json();
    return {
      available: true,
      correct: Boolean(data.correct),
      transcript: data.transcript || "",
      confidence: data.confidence ?? null,
      reason: data.reason || "",
      message: data.message || "",
    };
  } catch {
    return { available: false, correct: false, transcript: "" };
  }
}

function preferredRecordingMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
}

function resetSpeechState() {
  state.speech = {
    status: "idle",
    message: "",
    transcript: "",
  };
}

function updateSpeechState(status, message) {
  state.speech.status = status;
  state.speech.message = message;

  const stage = app.querySelector(".speak-stage");
  const statusElement = app.querySelector(".speech-status");
  const micButton = app.querySelector(".mic-button");

  if (stage) {
    stage.dataset.status = status;
  }

  if (statusElement) {
    statusElement.textContent = speechStatusText();
  }

  if (micButton) {
    micButton.disabled = status === "recording" || status === "checking";
  }
}

function speechStatusText() {
  if (state.speech.message) return state.speech.message;

  if (state.speech.status === "idle") return "Drück das Mikro";
  if (state.speech.status === "recording") return "Sprich jetzt";
  if (state.speech.status === "checking") return "Ich prüfe";
  if (state.speech.status === "retry") return "Nochmal";
  if (state.speech.status === "error") return "Mikro prüfen";
  return "";
}

function microphoneErrorText(error) {
  if (!window.isSecureContext) return "HTTPS nötig";
  if (error?.name === "NotAllowedError") return "Mikro erlauben";
  if (error?.name === "NotFoundError") return "Kein Mikro";
  if (error?.name === "NotReadableError") return "Mikro belegt";
  return "Mikro prüfen";
}

async function audioExists(path) {
  if (window.LERNWORT_AUDIO_MANIFEST instanceof Set) {
    return window.LERNWORT_AUDIO_MANIFEST.has(path);
  }

  const manifest = await getAudioManifest();
  return manifest.has(path);
}

async function getAudioManifest() {
  if (state.audioManifest) return state.audioManifest;

  if (window.LERNWORT_AUDIO_MANIFEST instanceof Set) {
    state.audioManifest = window.LERNWORT_AUDIO_MANIFEST;
    return state.audioManifest;
  }

  try {
    const response = await fetch("assets/audio/audio-manifest.json");
    const data = response.ok ? await response.json() : { files: [] };
    state.audioManifest = new Set(data.files || []);
  } catch {
    state.audioManifest = new Set();
  }

  return state.audioManifest;
}

async function getFeedbackCatalog() {
  if (state.feedbackCatalog) return state.feedbackCatalog;

  const bundledFeedback = window.LERNWORT_BUNDLED_FEEDBACK?.feedback_en_01;
  if (bundledFeedback) {
    const items = Array.isArray(bundledFeedback.items) ? bundledFeedback.items : [];
    state.feedbackCatalog = buildFeedbackCatalog(items);

    return state.feedbackCatalog;
  }

  try {
    const response = await fetch(feedbackBundlePath);
    const data = response.ok ? await response.json() : { items: [] };
    const items = Array.isArray(data.items) ? data.items : [];

    state.feedbackCatalog = buildFeedbackCatalog(items);
  } catch {
    state.feedbackCatalog = {
      positive: [],
      negative: [],
    };
  }

  return state.feedbackCatalog;
}

function buildFeedbackCatalog(items) {
  return {
    positive: buildFeedbackTracks(items, "positive", "Correct!"),
    negative: buildFeedbackTracks(items, "negative", "Try again."),
  };
}

function buildFeedbackTracks(items, kind, fallbackText) {
  return items
    .filter((item) => item.kind === kind && item.audio?.en)
    .flatMap((item) => {
      const variantPaths = Array.isArray(item.audioVariants?.en) ? item.audioVariants.en : [item.audio.en];
      const uniquePaths = [...new Set(variantPaths.filter(Boolean))];

      return uniquePaths.map((path, index) => ({
        id: index === 0 ? item.id : `${item.id}_${index + 1}`,
        text: item.text?.en || fallbackText,
        path,
      }));
    });
}

async function playFeedbackAudio(kind) {
  clearScheduledAudio();
  stopActiveAudio();

  const catalog = await getFeedbackCatalog();
  const track = nextFeedbackTrack(kind, catalog[kind] || []);

  await playFeedbackCue(kind);
  await wait(feedbackTiming.cueToVoiceGap);

  if (track?.path && (await audioExists(track.path))) {
    const result = await playAudioFile(track.path, audioLevels.feedbackVoice, feedbackTiming.maxAudioPlayback, {
      spokenText: track.text,
    });
    if (result === "ended" || result === "stopped") return;
  }
}

async function playFeedbackAudioSafely(kind) {
  try {
    await withTimeout(playFeedbackAudio(kind), feedbackTiming.maxFeedbackSequence);
  } catch {
    stopActiveAudio();
  }
}

async function playReadFeedbackAudioSafely(item) {
  try {
    await withTimeout(playReadFeedbackAudio(item), feedbackTiming.maxFeedbackSequence);
  } catch {
    stopActiveAudio();
  }
}

async function playReadFeedbackAudio(item) {
  const track = item?.readFeedback?.[state.language];

  if (!track || !(await audioExists(track))) {
    await playFeedbackAudio("positive");
    return;
  }

  clearScheduledAudio();
  stopActiveAudio();
  await playFeedbackCue("positive");
  await wait(feedbackTiming.cueToVoiceGap);
  await playAudioFile(track, audioLevels.feedbackVoice, feedbackTiming.maxAudioPlayback, {
    spokenText: item?.readFeedbackText?.[state.language] || item?.labels?.[state.language] || "",
  });
}

async function playSentencePromptAudioSafely() {
  try {
    await withTimeout(playSentencePromptAudio(), feedbackTiming.maxFeedbackSequence);
  } catch {
    stopActiveAudio();
  }
}

async function playSentencePromptAudio() {
  clearScheduledAudio();
  stopActiveAudio();

  const track = nextSentencePromptTrack();
  if (track) {
    await playAudioFile(track, audioLevels.feedbackVoice);
  }
}

function nextSentencePromptTrack() {
  const pool = state.sentencePromptPool;

  if (!pool.order.length || pool.index >= pool.order.length) {
    pool.order = shuffle([...sentencePromptTracks]);

    if (pool.lastPath && pool.order.length > 1 && pool.order[0] === pool.lastPath) {
      pool.order.push(pool.order.shift());
    }

    pool.index = 0;
  }

  const track = pool.order[pool.index++] || null;
  if (track) {
    pool.lastPath = track;
  }

  return track;
}

function nextFeedbackTrack(kind, tracks) {
  const pool = state.feedbackPools[kind];

  if (!tracks.length) return null;

  if (!pool.order.length || pool.index >= pool.order.length) {
    pool.order = shuffle([...tracks]);

    if (pool.lastPath && pool.order.length > 1 && pool.order[0].path === pool.lastPath) {
      pool.order.push(pool.order.shift());
    }

    pool.index = 0;
  }

  const track = pool.order[pool.index++] || null;
  if (track?.path) {
    pool.lastPath = track.path;
  }

  return track;
}

async function playFeedbackCue(kind) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  await context.resume().catch(() => {});

  if (kind === "positive") {
    playToneSequence(context, [
      { frequency: 659.25, start: 0, duration: 0.08, gain: 0.075 },
      { frequency: 880, start: 0.075, duration: 0.16, gain: 0.115 },
    ]);
    await wait(250);
    if (context.close) {
      await context.close().catch(() => {});
    }
    return;
  }

  playToneSequence(context, [
    { frequency: 392, start: 0, duration: 0.09, gain: 0.058 },
    { frequency: 329.63, start: 0.08, duration: 0.14, gain: 0.068 },
  ]);
  await wait(245);
  if (context.close) {
    await context.close().catch(() => {});
  }
}

function playToneSequence(context, notes) {
  const output = context.createGain();
  output.connect(context.destination);
  output.gain.setValueAtTime(1, context.currentTime);

  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + note.start;
    const endAt = startAt + note.duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startAt);
    oscillator.connect(gain);
    gain.connect(output);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(note.gain, startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  });
}

async function playAudioFile(path, volume = 1, timeoutMs = feedbackTiming.maxAudioPlayback, options = {}) {
  stopActiveAudio();

  const shouldAutoSyncTutor = !options.onStart && app.querySelector(".honey-listen-button");
  const autoMouthCues = shouldAutoSyncTutor ? await loadLipsyncCues(path) : null;
  const autoMouthText = options.spokenText || fallbackTextForAudioPath(path);

  return new Promise((resolve) => {
    const audio = new Audio(path);
    audio.volume = volume;
    state.activeAudio = audio;
    let finished = false;
    let started = false;
    let startCleanup = null;
    let timeout = null;

    const start = () => {
      if (started || finished) return;
      started = true;
      startCleanup =
        options.onStart?.(audio) ||
        (shouldAutoSyncTutor ? syncTutorMouthToAudio(audio, autoMouthCues, autoMouthText) : null);
    };

    const finish = (result) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      startCleanup?.();
      startCleanup = null;

      if (state.activeAudio === audio) {
        if (result === "timeout") {
          audio.pause();
        }

        state.activeAudio = null;
        state.activeAudioFinish = null;
      }

      options.onFinish?.(result);
      resolve(result);
    };

    state.activeAudioFinish = finish;
    timeout = window.setTimeout(() => finish("timeout"), timeoutMs);
    audio.addEventListener("playing", start, { once: true });
    audio.addEventListener("ended", () => finish("ended"), { once: true });
    audio.addEventListener("error", () => finish("error"), { once: true });

    audio.play().then(start).catch(() => finish("error"));
  });
}

function fallbackTextForAudioPath(path) {
  const filename = String(path || "").split("/").pop() || "";
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^read_feedback_/, "")
    .replace(/_v[0-9]+$/, "")
    .replace(/_/g, " ")
    .trim();
}

function stopActiveAudio() {
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio.currentTime = 0;
    state.activeAudio = null;
  }

  if (state.activeAudioFinish) {
    const finish = state.activeAudioFinish;
    state.activeAudioFinish = null;
    finish("stopped");
  }
}

function scheduleCurrentAudio(delay, action = playCurrentAudio) {
  clearScheduledAudio();
  state.autoAudioTimer = window.setTimeout(() => {
    state.autoAudioTimer = null;
    void action();
  }, delay);
}

function clearScheduledAudio() {
  if (!state.autoAudioTimer) return;

  window.clearTimeout(state.autoAudioTimer);
  state.autoAudioTimer = null;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function withTimeout(promise, milliseconds) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Timed out.")), milliseconds);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

renderLanguageScreen();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.info("Service worker registration skipped.", error);
    });
  });
}

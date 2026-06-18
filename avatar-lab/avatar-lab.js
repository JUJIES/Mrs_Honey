const samples = [
  {
    label: "Good job!",
    text: "Good job!",
    audio: "../assets/audio/feedback_en_01/en/good_job.mp3",
  },
  {
    label: "That was correct!",
    text: "That was correct!",
    audio: "../assets/audio/feedback_en_01/en/that_was_correct.mp3",
  },
  {
    label: "Let's try again.",
    text: "Let's try again.",
    audio: "../assets/audio/feedback_en_01/en/lets_try_again.mp3",
  },
  {
    label: "Not quite.",
    text: "Not quite.",
    audio: "../assets/audio/feedback_en_01/en/not_quite.mp3",
  },
  {
    label: "Say it in a sentence 01",
    text: "Say it in a sentence.",
    audio: "../assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_01.mp3",
  },
  {
    label: "Say it in a sentence 03",
    text: "Say it in a sentence.",
    audio: "../assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_03.mp3",
  },
  {
    label: "Apple",
    text: "Apple",
    audio: "../assets/audio/food/en/apple.mp3",
  },
  {
    label: "Backpack",
    text: "Backpack",
    audio: "../assets/audio/school/en/backpack.mp3",
  },
];

const avatarButton = document.querySelector("#avatarButton");
const playButton = document.querySelector("#playButton");
const stopButton = document.querySelector("#stopButton");
const sampleSelect = document.querySelector("#sampleSelect");
const cueStrip = document.querySelector("#cueStrip");
const bodyFrame = document.querySelector("#bodyFrame");
const bodyFrameBlend = document.querySelector("#bodyFrameBlend");
const headRig = document.querySelector("#headRig");
const eyeLeftFrame = document.querySelector("#eyeLeftFrame");
const eyeRightFrame = document.querySelector("#eyeRightFrame");
const mouthPath = document.querySelector("#mouthPath");
const currentTimeReadout = document.querySelector("#currentTime");
const durationReadout = document.querySelector("#duration");
const copyButton = document.querySelector("#copyButton");
const blinkButton = document.querySelector("#blinkButton");
const autoBlink = document.querySelector("#autoBlink");
const notes = document.querySelector("#notes");
const shapeButtons = [...document.querySelectorAll("[data-shape]")];
const sliderControls = {
  rigScale: document.querySelector("#rigScale"),
  mouthLeft: document.querySelector("#mouthLeft"),
  mouthTop: document.querySelector("#mouthTop"),
  mouthWidth: document.querySelector("#mouthWidth"),
  mouthHeight: document.querySelector("#mouthHeight"),
  mouthRestHeight: document.querySelector("#mouthRestHeight"),
  mouthRoundness: document.querySelector("#mouthRoundness"),
  mouthSmile: document.querySelector("#mouthSmile"),
  mouthStyle: document.querySelector("#mouthStyle"),
  smoothing: document.querySelector("#smoothing"),
  headMotion: document.querySelector("#headMotion"),
  headSize: document.querySelector("#headSize"),
  headTop: document.querySelector("#headTop"),
  bodySize: document.querySelector("#bodySize"),
  bodyTop: document.querySelector("#bodyTop"),
  breathRate: document.querySelector("#breathRate"),
  breathAmplitude: document.querySelector("#breathAmplitude"),
  eyeLeft: document.querySelector("#eyeLeft"),
  eyeTop: document.querySelector("#eyeTop"),
  eyeWidth: document.querySelector("#eyeWidth"),
  eyeGap: document.querySelector("#eyeGap"),
  blinkSpeed: document.querySelector("#blinkSpeed"),
};

const lipsyncCache = new Map();
let activeAudio = null;
let stopMouthSync = null;
let activeCueIndex = -1;
let selectedShape = "X";
let blinkTimer = null;
let isBlinking = false;
let breathingFrame = null;
let activeBodyFrameIndex = -1;
let activeBodyBlendIndex = -1;
let breathCycle = null;
let visibleHeadMotion = { translateX: 0, translateY: 0, rotate: 0 };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const baseHeadTransform = "translate(-50%, -46%)";
const bodyFrames = [
  "assets/mrs-honey-body-rig/body-head-socket-breathe-00.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-01.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-02.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-03.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-04.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-05.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-06.png",
  "assets/mrs-honey-body-rig/body-head-socket-breathe-07.png",
];
const eyeFrames = {
  open: {
    left: "assets/mrs-honey-eye-rig/generated/eye-left-open-v2.png",
    right: "assets/mrs-honey-eye-rig/generated/eye-right-open-v2.png",
  },
  half: {
    left: "assets/mrs-honey-eye-rig/generated/eye-left-half-v2.png",
    right: "assets/mrs-honey-eye-rig/generated/eye-right-half-v2.png",
  },
  closed: {
    left: "assets/mrs-honey-eye-rig/generated/eye-left-closed-v2.png",
    right: "assets/mrs-honey-eye-rig/generated/eye-right-closed-v2.png",
  },
};

const mouthRest = { open: 0, width: 0.46, round: 0.1, y: 0, flat: 0.95 };
const mouthPresets = {
  X: mouthRest,
  A: { open: 0.04, width: 0.48, round: 0.06, y: 0.1, flat: 0.88 },
  B: { open: 0.14, width: 0.58, round: 0.18, y: 0.18, flat: 0.72 },
  C: { open: 0.5, width: 0.72, round: 0.2, y: 0.38, flat: 0.28 },
  D: { open: 0.78, width: 0.75, round: 0.18, y: 0.55, flat: 0.12 },
  E: { open: 0.45, width: 0.48, round: 0.82, y: 0.32, flat: 0.2 },
  F: { open: 0.32, width: 0.34, round: 1, y: 0.3, flat: 0.08 },
  G: { open: 0.1, width: 0.52, round: 0.1, y: 0.12, flat: 0.8 },
  H: { open: 0.58, width: 0.62, round: 0.28, y: 0.42, flat: 0.22 },
};
const mouthStyleProfiles = {
  soft: { width: 1, open: 1, round: 1, restWidth: 0.1, flat: 0.05 },
  narrow: { width: 0.86, open: 0.86, round: 1.06, restWidth: -0.03, flat: 0.12 },
  round: { width: 0.78, open: 1.06, round: 1.22, restWidth: -0.08, flat: -0.08 },
};

function init() {
  samples.forEach((sample, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = sample.label;
    sampleSelect.append(option);
  });

  Object.values(sliderControls).forEach((input) => {
    input.addEventListener("input", applyTuning);
    input.addEventListener("change", applyTuning);
  });

  shapeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      stopPlayback();
      setManualShape(button.dataset.shape);
    });
  });

  avatarButton.addEventListener("click", playSelectedSample);
  playButton.addEventListener("click", playSelectedSample);
  stopButton.addEventListener("click", stopPlayback);
  sampleSelect.addEventListener("change", previewSelectedCues);
  copyButton.addEventListener("click", copyCurrentTuning);
  blinkButton.addEventListener("click", () => triggerBlink({ forced: true }));
  autoBlink.addEventListener("change", syncAutoBlink);
  reducedMotion.addEventListener("change", syncAutoBlink);

  if (reducedMotion.matches) autoBlink.checked = false;
  preloadEyeFrames();
  preloadBodyFrames();
  applyTuning();
  setManualShape("X");
  previewSelectedCues();
  syncAutoBlink();
  startBreathing();
}

async function playSelectedSample() {
  stopPlayback();
  const sample = getSelectedSample();
  const audio = new Audio(sample.audio);
  activeAudio = audio;

  const mouthCues = await loadLipsyncCues(sample.audio);
  renderCueStrip(mouthCues);

  audio.addEventListener("loadedmetadata", () => updateTimeReadout(audio), { once: true });
  audio.addEventListener("timeupdate", () => updateTimeReadout(audio));
  audio.addEventListener("ended", stopPlayback, { once: true });
  audio.addEventListener("error", () => {
    stopPlayback();
    notes.value = `Audio konnte nicht geladen werden:\n${sample.audio}`;
  }, { once: true });

  stopMouthSync = syncMouthToAudio(audio, mouthCues, sample.text);

  try {
    await audio.play();
  } catch (error) {
    if (stopMouthSync) stopMouthSync();
    activeAudio = null;
    notes.value = `Browser hat das Abspielen blockiert oder die Datei fehlt:\n${error.message}\n\nIch zeige die Lippenbewegung ohne Ton.`;
    stopMouthSync = syncMouthToClock(mouthCues, sample.text, getPreviewDuration(mouthCues, 1.1));
  }
}

function stopPlayback() {
  if (stopMouthSync) {
    stopMouthSync();
    stopMouthSync = null;
  }

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    updateTimeReadout(activeAudio);
    activeAudio = null;
  } else {
    currentTimeReadout.textContent = "0.00";
  }

  avatarButton.classList.remove("is-speaking");
  setHeadMotion();
  setManualShape("X");
  setActiveCue(-1);
}

function syncMouthToAudio(audio, mouthCues, text) {
  const cues = normalizeMouthCues(mouthCues);
  const timeline = cues.length ? cues : buildFallbackMouthCues(text, audio.duration);
  let animationFrame = null;
  let lastFrameTime = 0;
  let cueIndex = 0;
  let visibleShape = { ...mouthRest };
  let active = true;

  avatarButton.classList.add("is-speaking");
  setMouthShape(visibleShape);

  const tick = (frameTime) => {
    if (!active) return;

    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const targetShape = getMouthShapeAtTime(timeline, currentTime, cueIndex);
    cueIndex = targetShape.index;

    const elapsed = lastFrameTime ? frameTime - lastFrameTime : 16;
    lastFrameTime = frameTime;
    const smoothing = Number(sliderControls.smoothing.value) || 120;
    const easing = 1 - Math.pow(0.001, Math.min(elapsed, 80) / smoothing);
    visibleShape = blendMouthShape(visibleShape, targetShape.shape, easing);

    setMouthShape(visibleShape);
    setActiveCue(cueIndex);
    updateSpeakingHeadMotion(currentTime, targetShape.shape.open);
    updateTimeReadout(audio);

    animationFrame = window.requestAnimationFrame(tick);
  };

  animationFrame = window.requestAnimationFrame(tick);

  return () => {
    active = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    avatarButton.classList.remove("is-speaking");
    setMouthShape(mouthRest);
    resetHeadMotion();
  };
}

function syncMouthToClock(mouthCues, text, durationSeconds) {
  const cues = normalizeMouthCues(mouthCues);
  const duration = getPreviewDuration(cues, durationSeconds);
  const timeline = cues.length ? cues : buildFallbackMouthCues(text, duration);
  let animationFrame = null;
  let lastFrameTime = 0;
  let cueIndex = 0;
  let visibleShape = { ...mouthRest };
  let active = true;
  const startTime = window.performance.now();

  avatarButton.classList.add("is-speaking");
  setMouthShape(visibleShape);
  durationReadout.textContent = duration.toFixed(2);

  const tick = (frameTime) => {
    if (!active) return;

    const currentTime = Math.min((frameTime - startTime) / 1000, duration);
    const targetShape = getMouthShapeAtTime(timeline, currentTime, cueIndex);
    cueIndex = targetShape.index;

    const elapsed = lastFrameTime ? frameTime - lastFrameTime : 16;
    lastFrameTime = frameTime;
    const smoothing = Number(sliderControls.smoothing.value) || 120;
    const easing = 1 - Math.pow(0.001, Math.min(elapsed, 80) / smoothing);
    visibleShape = blendMouthShape(visibleShape, targetShape.shape, easing);

    setMouthShape(visibleShape);
    setActiveCue(cueIndex);
    updateSpeakingHeadMotion(currentTime, targetShape.shape.open);
    currentTimeReadout.textContent = currentTime.toFixed(2);

    if (currentTime >= duration) {
      stopPlayback();
      return;
    }

    animationFrame = window.requestAnimationFrame(tick);
  };

  animationFrame = window.requestAnimationFrame(tick);

  return () => {
    active = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    avatarButton.classList.remove("is-speaking");
    setMouthShape(mouthRest);
    setHeadMotion();
  };
}

function setMouthShape(shape = mouthRest) {
  const tuning = getTuning();
  const profile = mouthStyleProfiles[tuning.mouthStyle] || mouthStyleProfiles.soft;
  const sourceOpen = clamp(Number(shape.open) || 0, 0, 1);
  const open = clamp(sourceOpen * profile.open, 0, 1);
  const smile = clamp(tuning.mouthSmile || 0.42, 0, 1);
  const restSmileBoost = sourceOpen < 0.02 ? smile * 0.14 : smile * 0.04;
  const width = clamp(((Number(shape.width) || mouthRest.width) + profile.restWidth + restSmileBoost) * profile.width, 0.25, 0.95);
  const round = clamp((Number(shape.round) || 0) * profile.round, 0, 1);
  const flat = clamp((Number(shape.flat) ?? 0.35) + profile.flat - open * 0.72, 0, 1);
  const y = Number(shape.y) || 0;
  const mouthHeight = Math.max(tuning.mouthHeight || 22, 1);
  const restHeight = clamp(tuning.mouthRestHeight || 3, 1, 12);
  const roundness = clamp(tuning.mouthRoundness || 0.72, 0, 1);
  const restSmileHeight = sourceOpen < 0.02 ? smile * 5.4 : 0;
  const visualHeight = restHeight + restSmileHeight + open * mouthHeight * (1 - flat * 0.16);
  const scaleY = visualHeight / mouthHeight;
  const radiusX = 18 + roundness * 38 + round * 18;
  const radiusY = 8 + roundness * 34 + round * 24;
  const ellipseY = clamp(44 + roundness * 20 + round * 12 - flat * 18, 24, 76);
  const ellipseTop = clamp(50 - smile * 2 + open * 1.5, 43, 58);
  const mouthY = y * 4.5 + open * 2.6 + (sourceOpen < 0.02 ? smile * 0.8 : 0);
  const shadowOpacity = clamp(0.1 + open * 0.18, 0.1, 0.28);
  const smileCurve = clamp(smile * (1 - open * 0.72), 0, 1);

  avatarButton.style.setProperty("--honey-mouth-opacity", "1");
  avatarButton.style.setProperty("--honey-mouth-fill-opacity", "1");
  avatarButton.style.setProperty("--honey-mouth-scale-x", width.toFixed(3));
  avatarButton.style.setProperty("--honey-mouth-scale-y", scaleY.toFixed(3));
  avatarButton.style.setProperty("--honey-mouth-y", `${mouthY.toFixed(1)}px`);
  avatarButton.style.setProperty("--honey-mouth-radius", `${radiusX.toFixed(1)}px / ${radiusY.toFixed(1)}px`);
  avatarButton.style.setProperty("--honey-mouth-highlight", open > 0.34 ? clamp((open - 0.34) * 1.6, 0, 0.55) : 0);
  avatarButton.style.setProperty("--honey-mouth-smile", smile.toFixed(2));
  avatarButton.style.setProperty("--honey-mouth-ellipse-y", `${ellipseY.toFixed(1)}%`);
  avatarButton.style.setProperty("--honey-mouth-ellipse-top", `${ellipseTop.toFixed(1)}%`);
  avatarButton.style.setProperty("--honey-mouth-shadow-opacity", shadowOpacity.toFixed(3));
  mouthPath?.setAttribute("d", buildMouthPath({ open, round, flat, smile: smileCurve, visualHeight, mouthHeight }));
}

function buildMouthPath({ open, round, flat, smile, visualHeight, mouthHeight }) {
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

function setManualShape(shapeName) {
  selectedShape = shapeName;
  setMouthShape(mouthPresets[shapeName] || mouthRest);
  shapeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.shape === selectedShape);
  });
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
  if (!cues.length) return { shape: mouthRest, index: 0 };

  let index = clamp(Math.floor(startIndex), 0, cues.length - 1);

  while (index < cues.length - 1 && time >= cues[index].end - 0.006) {
    index += 1;
  }

  while (index > 0 && time < cues[index].start) {
    index -= 1;
  }

  const cue = time >= cues[index].start && time <= cues[index].end ? cues[index] : null;
  return {
    shape: mouthPresets[cue?.value || "X"] || mouthRest,
    index,
  };
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

function buildFallbackMouthCues(text, durationSeconds) {
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0.2 ? durationSeconds : 1.05;
  const values = fallbackCueValuesForText(text);
  const usableStart = Math.min(0.08, duration * 0.14);
  const usableEnd = Math.max(usableStart + 0.16, duration - Math.min(0.18, duration * 0.18));
  const step = (usableEnd - usableStart) / Math.max(values.length, 1);
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

function fallbackCueValuesForText(text) {
  const cleaned = String(text || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/e$/, "");

  if (!cleaned) return ["C"];

  const values = [];
  let index = 0;

  while (index < cleaned.length) {
    const pair = cleaned.slice(index, index + 2);
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

    const letter = cleaned[index];
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
  if (lipsyncCache.has(jsonPath)) return lipsyncCache.get(jsonPath);

  try {
    const response = await fetch(jsonPath, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Missing lipsync JSON: ${jsonPath}`);
    const data = await response.json();
    const cues = normalizeMouthCues(data.mouthCues);
    lipsyncCache.set(jsonPath, cues);
    return cues;
  } catch {
    lipsyncCache.set(jsonPath, null);
    return null;
  }
}

function getPreviewDuration(mouthCues, fallbackSeconds) {
  const cues = normalizeMouthCues(mouthCues);
  if (cues.length) return Math.max(...cues.map((cue) => cue.end));
  const fallback = Number.isFinite(fallbackSeconds) && fallbackSeconds > 0 ? fallbackSeconds : 1.1;
  return fallback;
}

function lipsyncPathForAudio(audioPath) {
  if (!audioPath || !audioPath.includes("/assets/audio/")) return null;
  return audioPath.replace("/assets/audio/", "/assets/lipsync/").replace(/\.(mp3|wav|m4a|aac)$/i, ".json");
}

async function previewSelectedCues() {
  stopPlayback();
  const cues = await loadLipsyncCues(getSelectedSample().audio);
  renderCueStrip(cues);
}

function renderCueStrip(cues) {
  cueStrip.textContent = "";
  const normalized = normalizeMouthCues(cues);

  if (!normalized.length) {
    const pill = document.createElement("span");
    pill.className = "cue-pill";
    pill.textContent = "auto";
    cueStrip.append(pill);
    return;
  }

  normalized.forEach((cue, index) => {
    const pill = document.createElement("span");
    pill.className = "cue-pill";
    pill.dataset.index = String(index);
    pill.textContent = cue.value;
    pill.title = `${cue.start.toFixed(2)}s - ${cue.end.toFixed(2)}s`;
    cueStrip.append(pill);
  });
}

function setActiveCue(index) {
  if (index === activeCueIndex) return;
  activeCueIndex = index;
  cueStrip.querySelectorAll(".cue-pill").forEach((pill) => {
    pill.classList.toggle("is-active", Number(pill.dataset.index) === activeCueIndex);
  });
}

function updateTimeReadout(audio) {
  const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  currentTimeReadout.textContent = currentTime.toFixed(2);
  durationReadout.textContent = duration.toFixed(2);
}

function applyTuning() {
  const values = getTuning();

  avatarButton.style.setProperty("--honey-rig-scale", values.rigScale);
  avatarButton.style.setProperty("--honey-mouth-left", `${values.mouthLeft}%`);
  avatarButton.style.setProperty("--honey-mouth-top", `${values.mouthTop}%`);
  avatarButton.style.setProperty("--honey-mouth-width", `${values.mouthWidth}px`);
  avatarButton.style.setProperty("--honey-mouth-height", `${values.mouthHeight}px`);
  avatarButton.style.setProperty("--honey-mouth-smile", values.mouthSmile);
  avatarButton.style.setProperty("--honey-head-motion", values.headMotion);
  avatarButton.style.setProperty("--honey-head-size", `${values.headSize}%`);
  avatarButton.style.setProperty("--honey-head-top", `${values.headTop}%`);
  avatarButton.style.setProperty("--honey-body-size", `${values.bodySize}%`);
  avatarButton.style.setProperty("--honey-body-top", `${values.bodyTop}%`);
  avatarButton.style.setProperty("--honey-eye-left", `${values.eyeLeft}%`);
  avatarButton.style.setProperty("--honey-eye-top", `${values.eyeTop}%`);
  avatarButton.style.setProperty("--honey-eye-width", `${values.eyeWidth}%`);
  avatarButton.style.setProperty("--honey-eye-gap", `${values.eyeGap}%`);

  setOutput(sliderControls.rigScale, `${values.rigScale.toFixed(2)}x`);
  setOutput(sliderControls.mouthLeft, `${values.mouthLeft.toFixed(1)}%`);
  setOutput(sliderControls.mouthTop, `${values.mouthTop.toFixed(1)}%`);
  setOutput(sliderControls.mouthWidth, `${values.mouthWidth.toFixed(1)}px`);
  setOutput(sliderControls.mouthHeight, `${values.mouthHeight.toFixed(1)}px`);
  setOutput(sliderControls.mouthRestHeight, `${values.mouthRestHeight.toFixed(1)}px`);
  setOutput(sliderControls.mouthRoundness, `${values.mouthRoundness.toFixed(2)}x`);
  setOutput(sliderControls.mouthSmile, `${values.mouthSmile.toFixed(2)}x`);
  setOutput(sliderControls.mouthStyle, values.mouthStyle === "soft" ? "weich" : values.mouthStyle === "narrow" ? "schmal" : "rund");
  setOutput(sliderControls.smoothing, `${Math.round(values.smoothing)}ms`);
  setOutput(sliderControls.headMotion, `${values.headMotion.toFixed(1)}x`);
  setOutput(sliderControls.headSize, `${Math.round(values.headSize)}%`);
  setOutput(sliderControls.headTop, `${values.headTop.toFixed(1)}%`);
  setOutput(sliderControls.bodySize, `${Math.round(values.bodySize)}%`);
  setOutput(sliderControls.bodyTop, `${values.bodyTop.toFixed(1)}%`);
  setOutput(sliderControls.breathRate, `${values.breathRate.toFixed(1)}/min`);
  setOutput(sliderControls.breathAmplitude, `${values.breathAmplitude.toFixed(2)}x`);
  setOutput(sliderControls.eyeLeft, `${values.eyeLeft.toFixed(1)}%`);
  setOutput(sliderControls.eyeTop, `${values.eyeTop.toFixed(1)}%`);
  setOutput(sliderControls.eyeWidth, `${values.eyeWidth.toFixed(1)}%`);
  setOutput(sliderControls.eyeGap, `${values.eyeGap.toFixed(1)}%`);
  setOutput(sliderControls.blinkSpeed, `${values.blinkSpeed.toFixed(2)}x`);
  setMouthShape(mouthPresets[selectedShape] || mouthRest);
}

function getTuning() {
  return {
    rigScale: Number(sliderControls.rigScale.value),
    mouthLeft: Number(sliderControls.mouthLeft.value),
    mouthTop: Number(sliderControls.mouthTop.value),
    mouthWidth: Number(sliderControls.mouthWidth.value),
    mouthHeight: Number(sliderControls.mouthHeight.value),
    mouthRestHeight: Number(sliderControls.mouthRestHeight.value),
    mouthRoundness: Number(sliderControls.mouthRoundness.value),
    mouthSmile: Number(sliderControls.mouthSmile.value),
    mouthStyle: sliderControls.mouthStyle.value,
    smoothing: Number(sliderControls.smoothing.value),
    headMotion: Number(sliderControls.headMotion.value),
    headSize: Number(sliderControls.headSize.value),
    headTop: Number(sliderControls.headTop.value),
    bodySize: Number(sliderControls.bodySize.value),
    bodyTop: Number(sliderControls.bodyTop.value),
    breathRate: Number(sliderControls.breathRate.value),
    breathAmplitude: Number(sliderControls.breathAmplitude.value),
    eyeLeft: Number(sliderControls.eyeLeft.value),
    eyeTop: Number(sliderControls.eyeTop.value),
    eyeWidth: Number(sliderControls.eyeWidth.value),
    eyeGap: Number(sliderControls.eyeGap.value),
    blinkSpeed: Number(sliderControls.blinkSpeed.value),
  };
}

function setOutput(input, value) {
  const output = input.parentElement.querySelector("output");
  if (output) output.textContent = value;
}

async function copyCurrentTuning() {
  const tuning = getTuning();
  const payload = {
    cssVars: {
      "--honey-rig-scale": tuning.rigScale,
      "--honey-mouth-left": `${tuning.mouthLeft}%`,
      "--honey-mouth-top": `${tuning.mouthTop}%`,
      "--honey-mouth-width": `${tuning.mouthWidth}px`,
      "--honey-mouth-height": `${tuning.mouthHeight}px`,
      "--honey-mouth-smile": tuning.mouthSmile,
      "--honey-head-motion": tuning.headMotion,
      "--honey-head-size": `${tuning.headSize}%`,
      "--honey-head-top": `${tuning.headTop}%`,
      "--honey-body-size": `${tuning.bodySize}%`,
      "--honey-body-top": `${tuning.bodyTop}%`,
      "--honey-eye-left": `${tuning.eyeLeft}%`,
      "--honey-eye-top": `${tuning.eyeTop}%`,
      "--honey-eye-width": `${tuning.eyeWidth}%`,
      "--honey-eye-gap": `${tuning.eyeGap}%`,
    },
    mouthRestHeight: tuning.mouthRestHeight,
    mouthRoundness: tuning.mouthRoundness,
    mouthSmile: tuning.mouthSmile,
    mouthStyle: tuning.mouthStyle,
    smoothingMs: tuning.smoothing,
    breathRate: tuning.breathRate,
    breathAmplitude: tuning.breathAmplitude,
    blinkSpeed: tuning.blinkSpeed,
    autoBlink: autoBlink.checked,
    eyeFrames,
    selectedSample: getSelectedSample().label,
    notes: notes.value,
  };

  const text = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Kopiert";
    window.setTimeout(() => {
      copyButton.textContent = "Tuning kopieren";
    }, 1200);
  } catch {
    notes.value = `${notes.value.trim()}\n\n${text}`.trim();
  }
}

function getSelectedSample() {
  return samples[Number(sampleSelect.value)] || samples[0];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function syncAutoBlink() {
  window.clearTimeout(blinkTimer);
  blinkTimer = null;

  if (!autoBlink.checked || reducedMotion.matches) return;
  scheduleNextBlink();
}

function scheduleNextBlink() {
  window.clearTimeout(blinkTimer);
  const delay = randomBlinkDelay();
  blinkTimer = window.setTimeout(() => {
    triggerBlink();
    scheduleNextBlink();
  }, delay);
}

function triggerBlink({ forced = false } = {}) {
  if (isBlinking) return;
  if (!forced && (!autoBlink.checked || reducedMotion.matches)) return;

  isBlinking = true;
  avatarButton.classList.add("is-blinking");
  const frameMs = 62 / Math.max(0.2, Number(sliderControls.blinkSpeed.value) || 1);
  const shouldDoubleBlink = !forced && Math.random() < 0.16;

  setEyeFrame("half");
  window.setTimeout(() => setEyeFrame("closed"), frameMs);
  window.setTimeout(() => setEyeFrame("half"), frameMs * 2);
  window.setTimeout(() => {
    setEyeFrame("open");
    if (shouldDoubleBlink) {
      window.setTimeout(() => {
        setEyeFrame("half");
        window.setTimeout(() => setEyeFrame("closed"), frameMs);
        window.setTimeout(() => setEyeFrame("half"), frameMs * 2);
        window.setTimeout(() => finishBlink(), frameMs * 3);
      }, 110 + Math.random() * 120);
      return;
    }

    finishBlink();
  }, frameMs * 3);
}

function finishBlink() {
  setEyeFrame("open");
  avatarButton.classList.remove("is-blinking");
  isBlinking = false;
}

function randomBlinkDelay() {
  // Natural blink timing clusters around a few seconds, with occasional longer pauses.
  const base = 1800 + Math.random() * 5200;
  const longPause = Math.random() < 0.14 ? 1800 + Math.random() * 3600 : 0;
  return base + longPause;
}

function setEyeFrame(name) {
  const frame = eyeFrames[name] || eyeFrames.open;
  if (eyeLeftFrame.getAttribute("src") !== frame.left) {
    eyeLeftFrame.setAttribute("src", frame.left);
  }
  if (eyeRightFrame.getAttribute("src") !== frame.right) {
    eyeRightFrame.setAttribute("src", frame.right);
  }
}

function preloadEyeFrames() {
  Object.values(eyeFrames).forEach((frame) => {
    [frame.left, frame.right].forEach((path) => {
      const image = new Image();
      image.src = path;
    });
  });
}

function preloadBodyFrames() {
  bodyFrames.forEach((path) => {
    const image = new Image();
    image.src = path;
  });
}

function startBreathing() {
  if (breathingFrame) window.cancelAnimationFrame(breathingFrame);

  const tick = (frameTime) => {
    updateBreathingFrame(frameTime);
    breathingFrame = window.requestAnimationFrame(tick);
  };

  breathingFrame = window.requestAnimationFrame(tick);
}

function updateBreathingFrame(frameTime) {
  if (!bodyFrame || !bodyFrameBlend || reducedMotion.matches) {
    setBodyFrame(0);
    breathCycle = null;
    return;
  }

  const tuning = getTuning();
  const amplitude = clamp(tuning.breathAmplitude, 0, 1);
  if (amplitude <= 0.01) {
    setBodyFrame(0);
    breathCycle = null;
    return;
  }

  const breath = getNaturalBreathValue(frameTime, tuning);
  const framePosition = breath * amplitude * (bodyFrames.length - 1);
  setBodyFrame(framePosition);
}

function getNaturalBreathValue(frameTime, tuning) {
  const breathsPerMinute = clamp(tuning.breathRate || 9, 6, 18);
  const basePeriodMs = 60000 / breathsPerMinute;

  if (!breathCycle || frameTime < breathCycle.start || frameTime - breathCycle.start > breathCycle.periodMs * 1.15) {
    breathCycle = createBreathCycle(frameTime, basePeriodMs, 0);
  }

  while (frameTime - breathCycle.start >= breathCycle.periodMs) {
    breathCycle = createBreathCycle(breathCycle.start + breathCycle.periodMs, basePeriodMs, breathCycle.index + 1);
  }

  const phase = clamp((frameTime - breathCycle.start) / breathCycle.periodMs, 0, 1);
  const value = evaluateBreathCurve(phase, breathCycle.timing);
  return clamp(value * breathCycle.depth, 0, 1);
}

function createBreathCycle(start, basePeriodMs, index) {
  const periodJitter = seededNoise(index * 2.17 + 0.4) * 0.16 - 0.08;
  const depthJitter = seededNoise(index * 3.91 + 1.1) * 0.16 - 0.06;
  const topHold = 0.012 + seededNoise(index * 5.13 + 2.2) * 0.01;
  const bottomRest = 0.04 + seededNoise(index * 7.31 + 3.4) * 0.025;
  const inhale = 0.34 + seededNoise(index * 4.73 + 4.6) * 0.04;
  const exhale = Math.max(0.38, 1 - inhale - topHold - bottomRest);

  return {
    start,
    index,
    periodMs: basePeriodMs * (1 + periodJitter),
    depth: clamp(1 + depthJitter, 0.86, 1.08),
    timing: { inhale, topHold, exhale, bottomRest },
  };
}

function evaluateBreathCurve(phase, timing) {
  const inhaleEnd = timing.inhale;
  const topHoldEnd = inhaleEnd + timing.topHold;
  const exhaleEnd = topHoldEnd + timing.exhale;

  if (phase < inhaleEnd) {
    return easeOutCubic(phase / inhaleEnd);
  }

  if (phase < topHoldEnd) {
    const transitionPhase = (phase - inhaleEnd) / timing.topHold;
    return 1 - transitionPhase * 0.02;
  }

  if (phase < exhaleEnd) {
    const exhalePhase = (phase - topHoldEnd) / timing.exhale;
    return 0.98 * (1 - easeOutCubic(exhalePhase));
  }

  return 0;
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function seededNoise(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function setBodyFrame(position) {
  const framePosition = clamp(Number(position) || 0, 0, bodyFrames.length - 1);
  const baseIndex = Math.floor(framePosition);
  const blendIndex = Math.min(baseIndex + 1, bodyFrames.length - 1);
  const blendAmount = framePosition - baseIndex;

  if (baseIndex !== activeBodyFrameIndex) {
    activeBodyFrameIndex = baseIndex;
    bodyFrame.setAttribute("src", bodyFrames[baseIndex]);
  }

  if (blendIndex !== activeBodyBlendIndex) {
    activeBodyBlendIndex = blendIndex;
    bodyFrameBlend.setAttribute("src", bodyFrames[blendIndex]);
  }

  bodyFrameBlend.style.opacity = blendIndex === baseIndex ? "0" : blendAmount.toFixed(3);
}

function updateSpeakingHeadMotion(seconds, mouthOpen) {
  const amount = clamp(Number(sliderControls.headMotion.value) || 0, 0, 1.8);
  if (amount <= 0.01) {
    resetHeadMotion();
    return;
  }

  const open = clamp(Number(mouthOpen) || 0, 0, 1);
  const nod = Math.sin(seconds * 4.2) * 0.7 + Math.sin(seconds * 2.1 + 0.8) * 0.38;
  const sway = Math.sin(seconds * 2.5 + 1.4);
  const translateY = (-0.8 - open * 1.4 + nod * 0.35) * amount;
  const translateX = sway * 0.32 * amount;
  const rotate = (sway * 0.45 + nod * 0.12) * amount;
  const smoothing = (Number(sliderControls.smoothing.value) || 120) * 1.55;
  setHeadMotion({ translateX, translateY, rotate }, smoothing);
}

function setHeadMotion({ translateX = 0, translateY = 0, rotate = 0 } = {}, smoothingMs = 0) {
  if (!headRig) return;
  if (smoothingMs > 0) {
    const easing = 1 - Math.pow(0.001, 16 / smoothingMs);
    visibleHeadMotion = {
      translateX: lerp(visibleHeadMotion.translateX, translateX, easing),
      translateY: lerp(visibleHeadMotion.translateY, translateY, easing),
      rotate: lerp(visibleHeadMotion.rotate, rotate, easing),
    };
  } else {
    visibleHeadMotion = { translateX, translateY, rotate };
  }

  headRig.style.transform = `${baseHeadTransform} translate(${visibleHeadMotion.translateX.toFixed(2)}%, ${visibleHeadMotion.translateY.toFixed(2)}%) rotate(${visibleHeadMotion.rotate.toFixed(2)}deg)`;
}

function resetHeadMotion() {
  setHeadMotion();
}

function lerp(from, to, amount) {
  return from + (to - from) * clamp(amount, 0, 1);
}

init();

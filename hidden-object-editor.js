const STORAGE_KEY = "lernwort.hiddenObjectEditor.v1";
const SOURCE_CONFIG = window.LERNWORT_BUNDLED_MINIGAMES?.colours_hidden_object;

const state = {
  config: structuredClone(SOURCE_CONFIG),
  original: structuredClone(SOURCE_CONFIG),
  sceneIndex: 0,
  targetIndex: 0,
  selectedPointIndex: 0,
  mode: "points",
  drawSessionKey: null,
  drag: null,
  history: [],
  future: [],
};

const elements = {
  sceneSelect: document.querySelector("#scene-select"),
  targetSelect: document.querySelector("#target-select"),
  targetStrip: document.querySelector("#target-strip"),
  sceneImage: document.querySelector("#scene-image"),
  stageWrap: document.querySelector("#stage-wrap"),
  overlay: document.querySelector("#overlay"),
  allPolygons: document.querySelector("#all-polygons"),
  activePolygon: document.querySelector("#active-polygon"),
  pointLayer: document.querySelector("#point-layer"),
  statusLine: document.querySelector("#status-line"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  prevTarget: document.querySelector("#prev-target"),
  nextTarget: document.querySelector("#next-target"),
  undoButton: document.querySelector("#undo-button"),
  redoButton: document.querySelector("#redo-button"),
  addPointButton: document.querySelector("#add-point-button"),
  deletePointButton: document.querySelector("#delete-point-button"),
  resetTargetButton: document.querySelector("#reset-target-button"),
  copyButton: document.querySelector("#copy-button"),
  downloadButton: document.querySelector("#download-button"),
};

if (!state.config) {
  elements.statusLine.textContent = "Daten nicht geladen";
} else {
  boot();
}

function boot() {
  loadSavedEdits();
  bindControls();
  renderAll();
}

function bindControls() {
  elements.sceneSelect.addEventListener("change", () => {
    state.sceneIndex = Number(elements.sceneSelect.value) || 0;
    state.targetIndex = 0;
    state.selectedPointIndex = 0;
    state.drawSessionKey = null;
    renderAll();
  });

  elements.targetSelect.addEventListener("change", () => {
    state.targetIndex = Number(elements.targetSelect.value) || 0;
    state.selectedPointIndex = 0;
    state.drawSessionKey = null;
    renderAll();
  });

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.drawSessionKey = null;
      state.selectedPointIndex = clampPointIndex(state.selectedPointIndex);
      renderOverlay();
    });
  });

  elements.prevTarget.addEventListener("click", () => selectRelativeTarget(-1));
  elements.nextTarget.addEventListener("click", () => selectRelativeTarget(1));
  elements.undoButton.addEventListener("click", undo);
  elements.redoButton.addEventListener("click", redo);
  elements.addPointButton.addEventListener("click", addPointAfterSelection);
  elements.deletePointButton.addEventListener("click", deleteSelectedPoint);
  elements.resetTargetButton.addEventListener("click", resetActiveTarget);
  elements.copyButton.addEventListener("click", copyConfig);
  elements.downloadButton.addEventListener("click", downloadConfig);

  elements.overlay.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("keydown", handleKeyDown);
}

function renderAll() {
  renderSceneSelect();
  renderTargetSelect();
  renderTargetStrip();
  renderScene();
  renderOverlay();
}

function renderSceneSelect() {
  elements.sceneSelect.innerHTML = state.config.scenes
    .map((scene, index) => `<option value="${index}">${escapeHtml(scene.title || scene.id)}</option>`)
    .join("");
  elements.sceneSelect.value = String(state.sceneIndex);
}

function renderTargetSelect() {
  const scene = activeScene();
  elements.targetSelect.innerHTML = scene.targets
    .map((target, index) => `<option value="${index}">${escapeHtml(target.label || target.id)}</option>`)
    .join("");
  elements.targetSelect.value = String(state.targetIndex);
}

function renderTargetStrip() {
  const scene = activeScene();
  elements.targetStrip.innerHTML = scene.targets
    .map(
      (target, index) => `
        <button class="target-card ${index === state.targetIndex ? "is-active" : ""}" type="button" data-target-index="${index}">
          <strong>${escapeHtml(target.label || target.id)}</strong>
          <span>${shapeForTarget(target).length} Punkte</span>
        </button>
      `,
    )
    .join("");

  elements.targetStrip.querySelectorAll(".target-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.targetIndex = Number(button.dataset.targetIndex) || 0;
      state.selectedPointIndex = 0;
      renderAll();
    });
  });
}

function renderScene() {
  const scene = activeScene();
  elements.sceneImage.src = scene.image;
  elements.sceneImage.alt = scene.title || scene.id;
}

function renderOverlay() {
  const scene = activeScene();
  const target = activeTarget();
  const activeShape = shapeForTarget(target);

  elements.allPolygons.innerHTML = scene.targets
    .map((otherTarget, index) => {
      if (index === state.targetIndex) return "";
      return `<polygon class="ghost-polygon" points="${pointsAttribute(shapeForTarget(otherTarget))}"></polygon>`;
    })
    .join("");

  elements.activePolygon.setAttribute("points", pointsAttribute(activeShape));
  elements.pointLayer.innerHTML = activeShape
    .map(
      ([x, y], index) => `
        <g data-point-index="${index}">
          <circle class="point-handle ${index === state.selectedPointIndex ? "is-selected" : ""}" cx="${x}" cy="${y}" r="1.9"></circle>
          <text class="point-index" x="${x}" y="${y}">${index + 1}</text>
        </g>
      `,
    )
    .join("");

  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });

  const pointCount = activeShape.length;
  elements.deletePointButton.disabled = pointCount <= 3;
  elements.undoButton.disabled = state.history.length === 0;
  elements.redoButton.disabled = state.future.length === 0;
  elements.statusLine.textContent = `${scene.title || scene.id} / ${target.label || target.id} / ${pointCount} Punkte`;
}

function handlePointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const point = clientToPercent(event.clientX, event.clientY);
  if (!point) return;

  const target = activeTarget();
  const shape = shapeForTarget(target);
  const nearest = nearestPointIndex(shape, point);

  if (state.mode === "draw") {
    pushHistory();
    const sessionKey = `${state.sceneIndex}:${state.targetIndex}`;
    if (state.drawSessionKey !== sessionKey) {
      setTargetShape(target, [point]);
      state.drawSessionKey = sessionKey;
      state.selectedPointIndex = 0;
    } else {
      setTargetShape(target, [...shape, point]);
      state.selectedPointIndex = shape.length;
    }
    persist();
    renderOverlay();
    return;
  }

  pushHistory();
  elements.overlay.setPointerCapture?.(event.pointerId);

  if (state.mode === "move") {
    state.drag = {
      type: "polygon",
      lastPoint: point,
    };
    renderOverlay();
    return;
  }

  state.selectedPointIndex = nearest.index;
  state.drag = {
    type: "point",
    pointIndex: nearest.index,
  };
  setPoint(target, nearest.index, point);
  persist();
  renderOverlay();
}

function handlePointerMove(event) {
  if (!state.drag) return;
  const point = clientToPercent(event.clientX, event.clientY);
  if (!point) return;

  const target = activeTarget();
  const shape = shapeForTarget(target);

  if (state.drag.type === "polygon") {
    const dx = point[0] - state.drag.lastPoint[0];
    const dy = point[1] - state.drag.lastPoint[1];
    state.drag.lastPoint = point;
    setTargetShape(
      target,
      shape.map(([x, y]) => [roundCoord(clamp(x + dx, 0, 100)), roundCoord(clamp(y + dy, 0, 100))]),
    );
  } else {
    setPoint(target, state.drag.pointIndex, point);
    state.selectedPointIndex = state.drag.pointIndex;
  }

  persist(false);
  renderOverlay();
}

function handlePointerUp(event) {
  if (!state.drag) return;
  elements.overlay.releasePointerCapture?.(event.pointerId);
  state.drag = null;
  persist();
  renderAll();
}

function handleKeyDown(event) {
  if (event.target?.matches("select, button")) return;
  const target = activeTarget();
  const shape = shapeForTarget(target);
  const step = event.shiftKey ? 1 : 0.25;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    pushHistory();
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    if (state.mode === "move") {
      setTargetShape(
        target,
        shape.map(([x, y]) => [roundCoord(clamp(x + dx, 0, 100)), roundCoord(clamp(y + dy, 0, 100))]),
      );
    } else {
      const index = clampPointIndex(state.selectedPointIndex);
      setPoint(target, index, [shape[index][0] + dx, shape[index][1] + dy]);
    }
    persist();
    renderAll();
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    deleteSelectedPoint();
  }
}

function addPointAfterSelection() {
  const target = activeTarget();
  const shape = shapeForTarget(target);
  const index = clampPointIndex(state.selectedPointIndex);
  const current = shape[index];
  const next = shape[(index + 1) % shape.length] || current;
  const newPoint = [roundCoord((current[0] + next[0]) / 2), roundCoord((current[1] + next[1]) / 2)];
  pushHistory();
  const updated = [...shape.slice(0, index + 1), newPoint, ...shape.slice(index + 1)];
  setTargetShape(target, updated);
  state.selectedPointIndex = index + 1;
  persist();
  renderAll();
}

function deleteSelectedPoint() {
  const target = activeTarget();
  const shape = shapeForTarget(target);
  if (shape.length <= 3) return;
  pushHistory();
  const index = clampPointIndex(state.selectedPointIndex);
  setTargetShape(target, shape.filter((_, pointIndex) => pointIndex !== index));
  state.selectedPointIndex = Math.max(0, index - 1);
  persist();
  renderAll();
}

function resetActiveTarget() {
  const originalScene = state.original.scenes[state.sceneIndex];
  const originalTarget = originalScene?.targets[state.targetIndex];
  if (!originalTarget) return;
  pushHistory();
  const target = activeTarget();
  target.shape = structuredClone(originalTarget.shape);
  target.x = originalTarget.x;
  target.y = originalTarget.y;
  target.w = originalTarget.w;
  target.h = originalTarget.h;
  state.selectedPointIndex = 0;
  persist();
  renderAll();
}

async function copyConfig() {
  const text = JSON.stringify(state.config, null, 2);
  await navigator.clipboard.writeText(text);
  elements.statusLine.textContent = "JSON kopiert";
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(state.config, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "colours_hidden_object.edited.json";
  link.click();
  URL.revokeObjectURL(url);
}

function undo() {
  if (!state.history.length) return;
  state.future.push(snapshot());
  restoreSnapshot(state.history.pop());
  persist();
  renderAll();
}

function redo() {
  if (!state.future.length) return;
  state.history.push(snapshot());
  restoreSnapshot(state.future.pop());
  persist();
  renderAll();
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 80) state.history.shift();
  state.future = [];
}

function snapshot() {
  return {
    config: structuredClone(state.config),
    sceneIndex: state.sceneIndex,
    targetIndex: state.targetIndex,
    selectedPointIndex: state.selectedPointIndex,
  };
}

function restoreSnapshot(snapshotValue) {
  state.config = structuredClone(snapshotValue.config);
  state.sceneIndex = snapshotValue.sceneIndex;
  state.targetIndex = snapshotValue.targetIndex;
  state.selectedPointIndex = snapshotValue.selectedPointIndex;
}

function persist(showStatus = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
  if (showStatus) elements.statusLine.textContent = "Gespeichert";
}

function loadSavedEdits() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (parsed?.id === state.config.id && Array.isArray(parsed.scenes)) {
      state.config = parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function selectRelativeTarget(offset) {
  const scene = activeScene();
  state.targetIndex = (state.targetIndex + offset + scene.targets.length) % scene.targets.length;
  state.selectedPointIndex = 0;
  state.drawSessionKey = null;
  renderAll();
}

function activeScene() {
  return state.config.scenes[state.sceneIndex];
}

function activeTarget() {
  return activeScene().targets[state.targetIndex];
}

function shapeForTarget(target) {
  if (Array.isArray(target.shape) && target.shape.length >= 1) {
    return target.shape.map(([x, y]) => [roundCoord(Number(x) || 0), roundCoord(Number(y) || 0)]);
  }
  const x = Number(target.x) || 0;
  const y = Number(target.y) || 0;
  const w = Number(target.w) || 0;
  const h = Number(target.h) || 0;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([px, py]) => [roundCoord(px), roundCoord(py)]);
}

function setTargetShape(target, shape) {
  const cleanShape = shape.map(([x, y]) => [roundCoord(clamp(x, 0, 100)), roundCoord(clamp(y, 0, 100))]);
  target.shape = cleanShape;
  const xs = cleanShape.map(([x]) => x);
  const ys = cleanShape.map(([, y]) => y);
  target.x = roundCoord(Math.min(...xs));
  target.y = roundCoord(Math.min(...ys));
  target.w = roundCoord(Math.max(...xs) - target.x);
  target.h = roundCoord(Math.max(...ys) - target.y);
}

function setPoint(target, index, point) {
  const shape = shapeForTarget(target);
  shape[index] = [roundCoord(clamp(point[0], 0, 100)), roundCoord(clamp(point[1], 0, 100))];
  setTargetShape(target, shape);
}

function nearestPointIndex(shape, point) {
  return shape.reduce(
    (best, candidate, index) => {
      const distance = Math.hypot(candidate[0] - point[0], candidate[1] - point[1]);
      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Infinity },
  );
}

function clientToPercent(clientX, clientY) {
  const rect = elements.stageWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return [
    roundCoord(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)),
    roundCoord(clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)),
  ];
}

function pointsAttribute(shape) {
  return shape.map(([x, y]) => `${x},${y}`).join(" ");
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function clampPointIndex(index) {
  return clamp(index, 0, Math.max(0, shapeForTarget(activeTarget()).length - 1));
}

function roundCoord(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

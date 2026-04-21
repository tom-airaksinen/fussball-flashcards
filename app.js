const card = document.getElementById("card");
const front = document.getElementById("front");
const back = document.getElementById("back");
const modeSelect = document.getElementById("mode");

const minuteEl = document.getElementById("minute");
const scoreEl = document.getElementById("score");

const STORAGE_KEY = "fussball-progress";

let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

// Separata strength-index per riktning
vocab.forEach(v => {
  if (!progress[v.id]) {
    progress[v.id] = { strength_sv: 0, strength_de: 0 };
  }
  v.strength_sv = progress[v.id].strength_sv ?? 0;
  v.strength_de = progress[v.id].strength_de ?? 0;
});

function saveProgress() {
  vocab.forEach(v => {
    progress[v.id].strength_sv = v.strength_sv;
    progress[v.id].strength_de = v.strength_de;
    // snoozedUntil lives directly on progress[id], no sync needed here
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let currentCard = null;
let showSwedish = true;
let isAnimating = false;
let isSingleLesson = false;
let knownInSession = new Set();

let minute = 1;
let goals = 0;
let misses = 0;

function updateScoreboard() {
  minuteEl.textContent = minute;
  scoreEl.textContent = `${goals}–${misses}`;
}

function goal() { goals++; }
function miss() { misses++; }

// --- Swipe-feedback ---

const feedbackEl = document.getElementById("swipe-feedback");

function showFeedback(type) {
  feedbackEl.textContent = type === "undo" ? "↩️" : type === "snooze" ? "✅✅" : type === true ? "✓" : "✗";
  feedbackEl.style.color = type === "undo" ? "white" : type === "snooze" ? "#5a9a5a" : type === true ? "#5a9a5a" : "#c0392b";
  feedbackEl.classList.remove("show");
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add("show");
}

// --- Ångra-funktion (skaka) ---

let undoState = null;

function nextSwedishMidnight() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const y = Number(parts.find(p => p.type === "year").value);
  const m = Number(parts.find(p => p.type === "month").value);
  const d = Number(parts.find(p => p.type === "day").value);
  // Midnight at start of next day in Stockholm
  const midnight = new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00`);
  midnight.setDate(midnight.getDate() + 1);
  // Adjust for Stockholm offset by computing UTC equivalent
  const stockholmOffset = getStockholmOffsetMinutes(midnight);
  return midnight.getTime() - stockholmOffset * 60000;
}

function getStockholmOffsetMinutes(date) {
  const utcStr = new Date(date).toLocaleString("en-US", { timeZone: "UTC" });
  const stStr  = new Date(date).toLocaleString("en-US", { timeZone: "Europe/Stockholm" });
  return (new Date(stStr) - new Date(utcStr)) / 60000;
}

function saveUndoState() {
  undoState = {
    card: currentCard,
    strength_sv: currentCard.strength_sv,
    strength_de: currentCard.strength_de,
    snoozedUntil: progress[currentCard.id].snoozedUntil ?? null,
    goals,
    misses,
    minute: minute - 1,
    showSwedish,
  };
}

function undoLastSwipe() {
  if (!undoState || isAnimating) return;
  isAnimating = true;

  card.classList.add("undo-out");

  setTimeout(() => {
    card.classList.remove("undo-out", "flipped");

    // Återställ state
    undoState.card.strength_sv = undoState.strength_sv;
    undoState.card.strength_de = undoState.strength_de;
    if (undoState.snoozedUntil === null) {
      delete progress[undoState.card.id].snoozedUntil;
    } else {
      progress[undoState.card.id].snoozedUntil = undoState.snoozedUntil;
    }
    goals       = undoState.goals;
    misses      = undoState.misses;
    minute      = undoState.minute;
    currentCard = undoState.card;
    showSwedish = undoState.showSwedish;
    knownInSession.delete(undoState.card.id);
    undoState   = null;

    saveProgress();
    front.textContent = showSwedish ? currentCard.sv : currentCard.de;
    back.textContent  = showSwedish ? currentCard.de : currentCard.sv;
    updateScoreboard();
    showFeedback("undo");

    card.classList.add("undo-in");
    setTimeout(() => {
      card.classList.remove("undo-in");
      isAnimating = false;
    }, 300);
  }, 200);
}

let lastShakeTime = 0;

function setupShake() {
  window.addEventListener("devicemotion", e => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const magnitude = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
    const now = Date.now();
    if (magnitude > 25 && now - lastShakeTime > 1000) {
      lastShakeTime = now;
      undoLastSwipe();
    }
  });
}

async function requestMotionPermission() {
  if (typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      if (result === "granted") setupShake();
    } catch (e) {
      // Användaren nekade – shake fungerar inte men appen fortsätter
    }
  } else {
    setupShake();
  }
}

// --- Lektionssystem ---

const lessons = [
  { id: 1, name: "1 – Grundläggande",       cards: [1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 37] },
  { id: 2, name: "2 – Regler & situationer", cards: [2, 4, 5, 8, 18, 22, 23, 24, 25, 29, 30, 31] },
  { id: 3, name: "3 – Spelet",               cards: [6, 7, 19, 20, 21, 40, 41, 42] },
  { id: 4, name: "4 – Match & resultat",     cards: [3, 26, 27, 28, 32, 33, 34, 35, 36, 38, 39] },
];

lessons.forEach(lesson => {
  const row = document.querySelector(`.lesson-row[data-lesson="${lesson.id}"]`);
  if (row) {
    row.querySelector(".lesson-label").textContent = `${lesson.name} (${lesson.cards.length})`;
  }
});

let activePool = vocab;

function getSelectedLessonIds() {
  return [...document.querySelectorAll(".lesson-row[data-lesson]")]
    .filter(r => r.dataset.lesson !== "all" && r.classList.contains("active"))
    .map(r => Number(r.dataset.lesson));
}

function buildPool(selectedLessonIds) {
  if (selectedLessonIds.length === 0) return vocab;
  const cardIds = new Set(selectedLessonIds.flatMap(lid => lessons.find(l => l.id === lid).cards));
  return vocab.filter(v => cardIds.has(v.id));
}

const lessonScreen = document.getElementById("lesson-screen");
const wordListScreen = document.getElementById("word-list-screen");
const gameEls = [
  document.getElementById("game-bar"),
  document.getElementById("scoreboard"),
  document.querySelector("main"),
  document.querySelector("footer"),
];

function showLessonScreen() {
  lessonScreen.style.display = "flex";
  wordListScreen.style.display = "none";
  document.getElementById("congrats-screen").style.display = "none";
  gameEls.forEach(el => el.style.display = "none");
}

function showCongratsScreen() {
  gameEls.forEach(el => el.style.display = "none");
  document.getElementById("congrats-screen").style.display = "flex";
}

function startSession() {
  const selectedIds = getSelectedLessonIds();
  activePool = buildPool(selectedIds);
  isSingleLesson = selectedIds.length === 1;
  knownInSession = new Set();
  currentCard = null;
  undoState = null;
  isAnimating = false;
  minute = 1; goals = 0; misses = 0;
  lessonScreen.style.display = "none";
  wordListScreen.style.display = "none";
  gameEls.forEach(el => el.style.display = "");
  updateScoreboard();
  loadCard();
  requestMotionPermission();
}

function syncAllRow() {
  const individual = [...document.querySelectorAll(".lesson-row[data-lesson]:not([data-lesson='all'])")];
  document.querySelector(".lesson-row[data-lesson='all']").classList.toggle("active", individual.every(r => r.classList.contains("active")));
}

document.querySelectorAll(".lesson-row").forEach(row => {
  row.addEventListener("click", e => {
    if (e.target.classList.contains("lesson-view")) return;
    const lessonId = row.dataset.lesson;
    if (lessonId === "all") {
      const allActive = [...document.querySelectorAll(".lesson-row")].every(r => r.classList.contains("active"));
      document.querySelectorAll(".lesson-row").forEach(r => r.classList.toggle("active", !allActive));
    } else {
      row.classList.toggle("active");
      syncAllRow();
    }
  });
});

document.querySelectorAll(".lesson-view").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    const lessonId = Number(btn.dataset.lesson);
    const lesson = lessons.find(l => l.id === lessonId);
    const words = vocab.filter(v => lesson.cards.includes(v.id));

    document.getElementById("word-list-title").textContent = `${lesson.name} (${words.length} ord)`;
    document.getElementById("word-list-body").innerHTML = words
      .map(v => `<div class="word-row"><span class="word-sv">${v.sv}</span><span class="word-de">${v.de}</span></div>`)
      .join("");

    lessonScreen.style.display = "none";
    wordListScreen.style.display = "flex";
  });
});

document.getElementById("word-list-back").addEventListener("click", showLessonScreen);
document.getElementById("start-btn").addEventListener("click", startSession);
document.getElementById("back-btn").addEventListener("click", showLessonScreen);
document.getElementById("congrats-done-btn").addEventListener("click", showLessonScreen);

showLessonScreen();

// --- Kortlogik ---

function isSnoozed(v) {
  const until = progress[v.id]?.snoozedUntil;
  return until && Date.now() < until;
}

function weightedRandomCard(showSv) {
  const base = activePool.filter(v => !isSnoozed(v));
  const pool = base.length > 0 ? base : activePool; // fallback: all cards if all snoozed
  const candidates = pool.length > 1 ? pool.filter(v => v !== currentCard) : pool;
  const weights = candidates.map(v => 1 / ((showSv ? v.strength_sv : v.strength_de) + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;

  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function loadCard() {
  const sessionDone = isSingleLesson
    ? activePool.every(v => knownInSession.has(v.id) || isSnoozed(v))
    : minute > 90;

  if (sessionDone) {
    if (isSingleLesson) {
      isAnimating = false;
      showCongratsScreen();
    } else {
      front.textContent = "⏱️ Slutresultat";
      back.textContent = `${goals}–${misses}`;
      setTimeout(showLessonScreen, 3000);
    }
    return;
  }

  card.classList.remove("flipped");

  const mode = modeSelect.value;
  showSwedish = mode === "sv-de" || (mode === "mixed" && Math.random() < 0.5);
  currentCard = weightedRandomCard(showSwedish);

  front.textContent = showSwedish ? currentCard.sv : currentCard.de;
  back.textContent  = showSwedish ? currentCard.de : currentCard.sv;

  minute++;
  updateScoreboard();
}

// Flyga ut kortet, ladda nästa och animera in det
function performSwipe(direction) {
  isAnimating = true;
  const cls = direction === "right" ? "fly-out-right" : direction === "up" ? "fly-out-up" : "fly-out-left";
  card.classList.add(cls);

  setTimeout(() => {
    card.classList.remove("fly-out-right", "fly-out-left", "fly-out-up");
    loadCard();
    card.classList.add("card-emerge");
    setTimeout(() => {
      card.classList.remove("card-emerge");
      isAnimating = false;
    }, 300);
  }, 230);
}

// --- Swipe-hantering ---

let startX = 0;
let startY = 0;
let isDragging = false;
let didSwipe = false;

const SWIPE_THRESHOLD = 80;
const ROTATION_FACTOR = 0.06; // grader per px

function setCardDrag(dx, dy) {
  const deg = dx * ROTATION_FACTOR;
  const ty = Math.min(0, dy); // only allow upward movement
  card.style.transform = `translateX(${dx}px) translateY(${ty}px) rotate(${deg}deg)`;
}

function snapBack() {
  card.classList.add("snapping");
  card.style.transform = "";
  card.addEventListener("transitionend", () => {
    card.classList.remove("snapping");
  }, { once: true });
}

card.addEventListener("click", () => {
  if (didSwipe || isAnimating) return;
  card.classList.toggle("flipped");
});

card.addEventListener("pointerdown", e => {
  if (isAnimating) return;
  startX = e.clientX;
  startY = e.clientY;
  isDragging = true;
  didSwipe = false;
  card.setPointerCapture(e.pointerId);
});

card.addEventListener("pointermove", e => {
  if (!isDragging || isAnimating) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  setCardDrag(dx, dy);
});

card.addEventListener("pointerup", e => {
  if (!isDragging || isAnimating) return;
  isDragging = false;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy > SWIPE_THRESHOLD && absDy > absDx && dy < 0) {
    // Upward swipe → snooze
    didSwipe = true;
    card.style.transform = "";
    saveUndoState();
    progress[currentCard.id].snoozedUntil = nextSwedishMidnight();
    saveProgress();
    knownInSession.add(currentCard.id);
    showFeedback("snooze");
    performSwipe("up");
  } else if (dx > SWIPE_THRESHOLD) {
    didSwipe = true;
    card.style.transform = "";
    saveUndoState();
    if (showSwedish) currentCard.strength_sv = Math.min(currentCard.strength_sv + 1, 5);
    else             currentCard.strength_de = Math.min(currentCard.strength_de + 1, 5);
    saveProgress();
    knownInSession.add(currentCard.id);
    goal();
    showFeedback(true);
    performSwipe("right");
  } else if (dx < -SWIPE_THRESHOLD) {
    didSwipe = true;
    card.style.transform = "";
    saveUndoState();
    if (showSwedish) currentCard.strength_sv = Math.max(0, currentCard.strength_sv - 1);
    else             currentCard.strength_de = Math.max(0, currentCard.strength_de - 1);
    saveProgress();
    miss();
    showFeedback(false);
    performSwipe("left");
  } else {
    snapBack();
  }
});

card.addEventListener("pointercancel", () => {
  if (!isDragging) return;
  isDragging = false;
  snapBack();
});

// --- PWA ---

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

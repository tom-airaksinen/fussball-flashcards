const card = document.getElementById("card");
const front = document.getElementById("front");
const back = document.getElementById("back");
const modeSelect = document.getElementById("mode");

const minuteEl = document.getElementById("minute");
const scoreEl = document.getElementById("score");

const STORAGE_KEY = "fussball-progress";

let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

vocab.forEach(v => {
  if (!progress[v.id]) {
    progress[v.id] = { strength: 0 };
  }
  v.strength = progress[v.id].strength;
});

function saveProgress() {
  vocab.forEach(v => {
    progress[v.id].strength = v.strength;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let currentCard = null;
let showSwedish = true;

let minute = 1;
let goals = 0;
let misses = 0;

function updateScoreboard() {
  minuteEl.textContent = minute;
  scoreEl.textContent = `${goals}–${misses}`;
}

function goal() { goals++; }
function miss() { misses++; }

// --- Lektionssystem ---

const lessons = [
  { id: 1, name: "1 – Grundläggande",       cards: [1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 37] },
  { id: 2, name: "2 – Regler & situationer", cards: [2, 4, 5, 8, 18, 22, 23, 24, 25, 29, 30, 31] },
  { id: 3, name: "3 – Spelet",               cards: [6, 7, 19, 20, 21, 40, 41, 42] },
  { id: 4, name: "4 – Match & resultat",     cards: [3, 26, 27, 28, 32, 33, 34, 35, 36, 38, 39] },
];

// Uppdatera ordantalet i lektionsraderna
lessons.forEach(lesson => {
  const row = document.querySelector(`.lesson-row[data-lesson="${lesson.id}"]`);
  if (row) {
    const label = row.querySelector(".lesson-label");
    label.textContent = `${lesson.name} (${lesson.cards.length})`;
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
  document.querySelector("header"),
  document.getElementById("scoreboard"),
  document.querySelector("main"),
  document.querySelector("footer"),
];

function showLessonScreen() {
  lessonScreen.style.display = "flex";
  wordListScreen.style.display = "none";
  gameEls.forEach(el => el.style.display = "none");
}

function startSession() {
  activePool = buildPool(getSelectedLessonIds());
  currentCard = null;
  minute = 1; goals = 0; misses = 0;
  lessonScreen.style.display = "none";
  wordListScreen.style.display = "none";
  gameEls.forEach(el => el.style.display = "");
  updateScoreboard();
  loadCard();
}

function syncAllRow() {
  const individual = [...document.querySelectorAll(".lesson-row[data-lesson]:not([data-lesson='all'])")];
  document.querySelector(".lesson-row[data-lesson='all']").classList.toggle("active", individual.every(r => r.classList.contains("active")));
}

// Toggle-logik: klick på check-rutan eller raden (ej view-knappen)
document.querySelectorAll(".lesson-row").forEach(row => {
  row.addEventListener("click", e => {
    if (e.target.classList.contains("lesson-view")) return; // hanteras separat
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

// Ordlistevy
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
document.getElementById("change-lesson-btn").addEventListener("click", showLessonScreen);

showLessonScreen();

// --- Kortlogik ---

function weightedRandomCard() {
  const candidates = activePool.length > 1 ? activePool.filter(v => v !== currentCard) : activePool;
  const weights = candidates.map(v => 1 / (v.strength + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;

  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function loadCard() {
  if (minute > 90) {
    front.textContent = "⏱️ Slutresultat";
    back.textContent = `${goals}–${misses}`;
    setTimeout(showLessonScreen, 3000);
    return;
  }

  card.classList.remove("flipped");
  currentCard = weightedRandomCard();

  const mode = modeSelect.value;
  showSwedish =
    mode === "sv-de" ||
    (mode === "mixed" && Math.random() < 0.5);

  front.textContent = showSwedish ? currentCard.sv : currentCard.de;
  back.textContent = showSwedish ? currentCard.de : currentCard.sv;

  minute++;
  updateScoreboard();
}

// --- Swipe-hantering ---

let startX = 0;
let didSwipe = false;

card.addEventListener("click", () => {
  if (didSwipe) return;
  card.classList.toggle("flipped");
});

card.addEventListener("pointerdown", e => {
  startX = e.clientX;
  didSwipe = false;
  card.setPointerCapture(e.pointerId);
});

card.addEventListener("pointerup", e => {
  const dx = e.clientX - startX;

  if (dx > 50) {
    didSwipe = true;
    currentCard.strength = Math.min(currentCard.strength + 1, 5);
    saveProgress();
    goal();
    loadCard();
  } else if (dx < -50) {
    didSwipe = true;
    currentCard.strength = Math.max(0, currentCard.strength - 1);
    saveProgress();
    miss();
    loadCard();
  }
});

// --- PWA ---

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

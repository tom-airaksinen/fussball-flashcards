const card = document.getElementById("card");
const front = document.getElementById("front");
const back = document.getElementById("back");
const modeSelect = document.getElementById("mode");

const minuteEl = document.getElementById("minute");
const scoreEl = document.getElementById("score");

const STORAGE_KEY = "fussball-progress";

let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

vocab.forEach(card => {
  if (!progress[card.id]) {
    progress[card.id] = { strength: 0 };
  }
  card.strength = progress[card.id].strength;
});

function saveProgress() {
  vocab.forEach(card => {
    progress[card.id].strength = card.strength;
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

function goal() {
  goals++;
}

function miss() {
  misses++;
}

// Fix 2: Filtrera bort nuvarande kort för att undvika upprepning
function weightedRandomCard() {
  const candidates = vocab.length > 1 ? vocab.filter(v => v !== currentCard) : vocab;
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

// Fix 1: Spåra om en swipe skett för att förhindra att click-flip triggar samtidigt
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

// Fix 3: Registrera service worker för PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

updateScoreboard();
loadCard();

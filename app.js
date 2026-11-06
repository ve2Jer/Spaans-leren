'use strict';

/* =========================================================
   Hablo — Spaans leren
   Vanilla JS PWA. Alle voortgang staat lokaal (localStorage).
   ========================================================= */

const STORE_KEY = 'hablo-v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Dates ---------- */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => dayKey();
const yesterday = () => dayKey(addDays(new Date(), -1));

/* ---------- State ---------- */
const DEFAULT_STATE = {
  name: 'Jerry',
  xp: 0,
  dailyGoal: 30,
  sound: true,
  autoplay: true,
  rate: 0.9,
  progress: {},     // unitId -> lessons voltooid
  items: {},        // es -> { s: sterkte 0-5, c: goed, w: fout, t: laatst }
  days: {},         // datum -> { xp, lessons, correct, total, perfect, reviews, bestCombo }
  streak: { count: 0, last: null },
  missions: null,   // { date, list: [{ id, n, reward, claimed }] }
  badges: {},
  totals: { lessons: 0, correct: 0, answered: 0, perfect: 0, bestCombo: 0, reviews: 0 },
};

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(raw));
  } catch (e) { /* leeg */ }
  return structuredClone(DEFAULT_STATE);
}
function deepMerge(base, add) {
  for (const k in add) {
    if (add[k] && typeof add[k] === 'object' && !Array.isArray(add[k]) && base[k] && typeof base[k] === 'object') base[k] = deepMerge(base[k], add[k]);
    else base[k] = add[k];
  }
  return base;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* vol */ } }
function todayStats() {
  const k = today();
  if (!state.days[k]) state.days[k] = { xp: 0, lessons: 0, correct: 0, total: 0, perfect: 0, reviews: 0, bestCombo: 0 };
  return state.days[k];
}
function currentStreak() {
  const s = state.streak;
  if (s.last === today() || s.last === yesterday()) return s.count;
  return 0;
}

/* ---------- Levels ---------- */
const LEVEL_NAMES = ['Principiante', 'Aprendiz', 'Explorador', 'Viajero', 'Conversador', 'Negociador', 'Experto', 'Maestro', 'Leyenda'];
function levelInfo(xp = state.xp) {
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = 100 + (lvl - 1) * 50; }
  return { level: lvl, into: xp - acc, need, pct: (xp - acc) / need, name: LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, Math.floor((lvl - 1) / 2))] };
}
function cefr() {
  const done = UNITS.filter((u) => (state.progress[u.id] || 0) >= LESSONS_PER_UNIT).length;
  if (done >= 9) return 'A2';
  if (done >= 6) return 'A1+';
  if (done >= 3) return 'A1';
  return 'A0';
}

/* ---------- Sound (Web Audio, geen bestanden nodig) ---------- */
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const sfx = {
  tap() { if (state.sound) tone(1400, 0, 0.05, 'sine', 0.05); },
  correct() { if (!state.sound) return; tone(880, 0, 0.18, 'sine', 0.16); tone(1318.5, 0.09, 0.32, 'sine', 0.16); vibrate(12); },
  wrong() { if (!state.sound) return; tone(220, 0, 0.22, 'triangle', 0.16); tone(185, 0.12, 0.3, 'triangle', 0.14); vibrate([30, 40, 30]); },
  match() { if (state.sound) tone(1046.5, 0, 0.14, 'sine', 0.12); },
  complete() { if (!state.sound) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.4, 'sine', 0.14)); tone(1567.98, 0.48, 0.6, 'sine', 0.1); },
  levelup() { if (!state.sound) return; [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.1)); },
  claim() { if (!state.sound) return; tone(1318.5, 0, 0.1, 'sine', 0.12); tone(1760, 0.07, 0.25, 'sine', 0.12); },
};
function vibrate(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* */ } }

/* ---------- Spraak ---------- */
let esVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  esVoice = voices.find((v) => v.lang === 'es-ES' && /monica|mónica|jorge|google/i.test(v.name))
    || voices.find((v) => v.lang === 'es-ES')
    || voices.find((v) => v.lang.startsWith('es')) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, slow = false) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  if (esVoice) u.voice = esVoice;
  u.rate = slow ? 0.6 : state.rate;
  speechSynthesis.speak(u);
}

/* ---------- Tekst vergelijken ---------- */
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => s.toLowerCase().replace(/[¿¡?!.,;:"]/g, '').replace(/\s+/g, ' ').trim();
const ARTICLES = /^(el|la|los|las|un|una) /;
function lev(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
// Geeft { ok, note }
function checkTyped(input, target) {
  const a = norm(input), b = norm(target);
  if (!a) return { ok: false };
  if (a === b) return { ok: true };
  if (stripAccents(a) === stripAccents(b)) return { ok: true, note: 'Let op de accenten' };
  if (!ARTICLES.test(a) && ARTICLES.test(b) && stripAccents(a) === stripAccents(b.replace(ARTICLES, ''))) return { ok: true, note: 'Vergeet het lidwoord niet' };
  if (b.length >= 6 && lev(stripAccents(a), stripAccents(b)) === 1) return { ok: true, note: 'Bijna! Let op de spelling' };
  return { ok: false };
}
const tokens = (s) => norm(s).split(' ');

/* ---------- Content helpers ---------- */
const personalize = (s) => s.replace(/Jerry/g, state.name || 'Jerry');
const P = (pair) => [personalize(pair[0]), personalize(pair[1])];
const allWords = () => UNITS.flatMap((u) => u.words);
const allPhrases = () => UNITS.flatMap((u) => u.phrases);
function unitUnlocked(i) { return i === 0 || (state.progress[UNITS[i - 1].id] || 0) >= LESSONS_PER_UNIT; }

function distractors(answer, pool, key, n = 3) {
  const seen = new Set([norm(answer)]);
  const out = [];
  for (const p of shuffle(pool)) {
    const v = p[key];
    if (!seen.has(norm(v))) { seen.add(norm(v)); out.push(v); }
    if (out.length >= n) break;
  }
  return out;
}

/* ---------- Oefening generators ---------- */
let exId = 0;
function exMC(item, pool, dir) {
  const [es, nl] = P(item);
  const answer = dir === 'es-nl' ? nl : es;
  const opts = shuffle([answer, ...distractors(answer, pool.map(P), dir === 'es-nl' ? 1 : 0)]);
  return { id: ++exId, type: 'mc', dir, item, es, nl, answer, options: opts };
}
function exListen(item, pool) {
  const [es, nl] = P(item);
  return { id: ++exId, type: 'listen', item, es, nl, answer: es, options: shuffle([es, ...distractors(es, pool.map(P), 0)]) };
}
function exBuild(item, pool, listen = false) {
  const [es, nl] = P(item);
  const correct = es.replace(/[¿¡?!.,]/g, '').split(/\s+/).filter(Boolean);
  const extra = shuffle(pool.map(P).flatMap((p) => p[0].replace(/[¿¡?!.,]/g, '').split(/\s+/)))
    .filter((w) => !correct.some((c) => c.toLowerCase() === w.toLowerCase()));
  const uniq = [...new Set(extra)].slice(0, Math.min(4, Math.max(2, 7 - correct.length)));
  return { id: ++exId, type: 'build', listen, item, es, nl, correct, bank: shuffle([...correct, ...uniq]) };
}
function exType(item) {
  const [es, nl] = P(item);
  return { id: ++exId, type: 'type', item, es, nl, answer: es };
}
function exMatch(items) {
  const pairs = items.map(P);
  return { id: ++exId, type: 'match', items, pairs, left: shuffle(pairs.map((p) => p[0])), right: shuffle(pairs.map((p) => p[1])) };
}

function buildLesson(unitIdx, lessonIdx) {
  const u = UNITS[unitIdx];
  const wordPool = allWords(), phrasePool = u.phrases.concat(allPhrases().slice(0, 30));
  const ex = [];
  if (lessonIdx === 0 || lessonIdx === 1) {
    const words = lessonIdx === 0 ? u.words.slice(0, 6) : u.words.slice(6, 12);
    words.forEach((w) => ex.push(exMC(w, u.words.concat(wordPool), 'es-nl')));
    const second = shuffle(words);
    ex.push(exListen(second[0], u.words));
    ex.push(exMC(second[1], u.words, 'nl-es'));
    ex.push(exMatch(sample(words, 5)));
    ex.push(exListen(second[2], u.words));
    ex.push(exMC(second[3], u.words, 'nl-es'));
    ex.push(exType(second[4]));
    // eerste 6 in volgorde (introductie), rest gemengd
    return ex.slice(0, 6).concat(shuffle(ex.slice(6)));
  }
  if (lessonIdx === 2) {
    const ph = u.phrases;
    ph.slice(0, 3).forEach((p) => ex.push(exMC(p, ph, 'es-nl')));
    ph.slice(3, 6).forEach((p) => ex.push(exBuild(p, phrasePool)));
    ex.push(exListen(ph[6], ph));
    ex.push(exBuild(ph[7], phrasePool));
    ex.push(exMC(ph[0], ph, 'nl-es'));
    ex.push(exBuild(ph[1], phrasePool, true));
    ex.push(exMatch(sample(u.words, 5)));
    return ex.slice(0, 3).concat(shuffle(ex.slice(3)));
  }
  // lesson 3: unittest / mix
  const ph = shuffle(u.phrases), wd = shuffle(u.words);
  ex.push(exBuild(ph[0], phrasePool));
  ex.push(exBuild(ph[1], phrasePool, true));
  ex.push(exBuild(ph[2], phrasePool));
  ex.push(exBuild(ph[3], phrasePool, true));
  ex.push(exType(wd[0]));
  ex.push(exType(wd[1]));
  ex.push(exType(wd[2]));
  ex.push(exListen(ph[4], u.phrases));
  ex.push(exMC(ph[5], u.phrases, 'nl-es'));
  ex.push(exMatch(wd.slice(3, 8)));
  ex.push(exMC(wd[8], u.words, 'nl-es'));
  ex.push(exListen(wd[9], u.words));
  return shuffle(ex);
}

function weakItems(n = 10) {
  const unlocked = UNITS.filter((u, i) => unitUnlocked(i) && (state.progress[u.id] || 0) > 0);
  const pool = unlocked.flatMap((u) => [...u.words, ...u.phrases]).filter((p) => state.items[p[0]]);
  return pool
    .map((p) => { const it = state.items[p[0]]; return { p, score: it.s * 10 - it.w * 3 + (Date.now() - (it.t || 0)) / -864e5 }; })
    .sort((a, b) => a.score - b.score)
    .slice(0, n).map((x) => x.p);
}
function buildReview() {
  const items = weakItems(10);
  if (items.length < 5) return null;
  const words = items.filter((p) => p[0].split(' ').length <= 2);
  const phrases = items.filter((p) => p[0].split(' ').length > 2);
  const pool = allWords().concat(allPhrases());
  const ex = [];
  items.forEach((p, i) => {
    const isPhrase = phrases.includes(p);
    const r = i % 4;
    if (isPhrase) ex.push(r < 2 ? exBuild(p, allPhrases(), r === 1) : exMC(p, allPhrases(), r === 2 ? 'nl-es' : 'es-nl'));
    else ex.push(r === 0 ? exType(p) : r === 1 ? exListen(p, allWords()) : exMC(p, pool.filter((x) => x[0].split(' ').length <= 2), r === 2 ? 'nl-es' : 'es-nl'));
  });
  if (words.length >= 4) ex.push(exMatch(words.slice(0, 5)));
  return shuffle(ex);
}

function markItem(pair, ok) {
  const k = pair[0];
  const it = state.items[k] || { s: 0, c: 0, w: 0, t: 0 };
  if (ok) { it.s = Math.min(5, it.s + 1); it.c++; } else { it.s = Math.max(0, it.s - 2); it.w++; }
  it.t = Date.now();
  state.items[k] = it;
}

/* ---------- Missies ---------- */
const MISSION_TYPES = {
  xp:      { ico: '⚡', text: (n) => `Verdien ${n} XP`, ns: [30, 50, 80], reward: 15, val: (d) => d.xp },
  lessons: { ico: '📚', text: (n) => `Rond ${n} lessen af`, ns: [2, 3, 4], reward: 15, val: (d) => d.lessons },
  correct: { ico: '✅', text: (n) => `Geef ${n} goede antwoorden`, ns: [20, 30, 40], reward: 10, val: (d) => d.correct },
  perfect: { ico: '💎', text: (n) => n === 1 ? 'Maak een les foutloos' : `Maak ${n} lessen foutloos`, ns: [1, 2], reward: 20, val: (d) => d.perfect },
  combo:   { ico: '🔥', text: (n) => `Haal een combo van ${n}`, ns: [8, 10, 12], reward: 15, val: (d) => d.bestCombo },
  review:  { ico: '🔁', text: (n) => `Doe ${n} herhaalsessie${n > 1 ? 's' : ''}`, ns: [1], reward: 15, val: (d) => d.reviews },
};
function seeded(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
function ensureMissions() {
  if (state.missions && state.missions.date === today()) return;
  const r = seeded(today());
  const hasReview = Object.keys(state.items).length >= 5;
  const types = Object.keys(MISSION_TYPES).filter((t) => t !== 'review' || hasReview);
  const picked = [];
  while (picked.length < 3) { const t = types[Math.floor(r() * types.length)]; if (!picked.includes(t)) picked.push(t); }
  if (!picked.includes('xp')) picked[0] = 'xp';
  const list = picked.map((id) => { const m = MISSION_TYPES[id]; const n = id === 'xp' ? Math.max(state.dailyGoal, m.ns[Math.floor(r() * m.ns.length)]) : m.ns[Math.floor(r() * m.ns.length)]; return { id, n, reward: m.reward, claimed: false }; });
  state.missions = { date: today(), list };
  save();
}
function missionProgress(m) { return Math.min(m.n, MISSION_TYPES[m.id].val(todayStats())); }

/* ---------- Badges (lange termijn) ---------- */
const BADGES = [
  { id: 'first', e: '🌱', n: 'Eerste les', test: () => state.totals.lessons >= 1 },
  { id: 'streak3', e: '🔥', n: '3 dagen streak', test: () => state.streak.count >= 3 },
  { id: 'streak7', e: '📅', n: '7 dagen streak', test: () => state.streak.count >= 7 },
  { id: 'streak30', e: '🏆', n: '30 dagen streak', test: () => state.streak.count >= 30 },
  { id: 'words50', e: '📖', n: '50 woorden', test: () => learnedCount() >= 50 },
  { id: 'words150', e: '🧠', n: '150 woorden', test: () => learnedCount() >= 150 },
  { id: 'unit1', e: '🎖️', n: 'Eerste missie', test: () => unitsDone() >= 1 },
  { id: 'unit5', e: '🥈', n: '5 missies', test: () => unitsDone() >= 5 },
  { id: 'unitAll', e: '🥇', n: 'Alle missies', test: () => unitsDone() >= UNITS.length },
  { id: 'perfect10', e: '💎', n: '10x foutloos', test: () => state.totals.perfect >= 10 },
  { id: 'combo20', e: '⚡', n: 'Combo 20', test: () => state.totals.bestCombo >= 20 },
  { id: 'level10', e: '👑', n: 'Level 10', test: () => levelInfo().level >= 10 },
];
const learnedCount = () => Object.values(state.items).filter((i) => i.s >= 1).length;
const masteredCount = () => Object.values(state.items).filter((i) => i.s >= 4).length;
const unitsDone = () => UNITS.filter((u) => (state.progress[u.id] || 0) >= LESSONS_PER_UNIT).length;
function checkBadges() {
  const fresh = [];
  for (const b of BADGES) if (!state.badges[b.id] && b.test()) { state.badges[b.id] = Date.now(); fresh.push(b); }
  return fresh;
}

/* ---------- UI helpers ---------- */
const ICON_SPEAK = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>';
const ICON_SLOW = '<svg viewBox="0 0 24 24"><path d="M12 4C7 4 3 8 3 13v2h2v-2a7 7 0 0 1 14 0v2h-3l-2 3H8a1 1 0 0 0 0 2h7a1 1 0 0 0 .8-.4L18 17h2a1 1 0 0 0 1-1v-3c0-5-4-9-9-9z"/></svg>';

let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const colors = ['#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#FFCC00'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 4000);
}
function ring(pct, label, size = 64, color) {
  const r = (size - 6) / 2, C = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - clamp(pct, 0, 1))}" ${color ? `style="stroke:${color}"` : ''}/></svg><div class="lvl">${label}</div></div>`;
}
function animateRings() { requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring .fg').forEach((c) => (c.style.strokeDashoffset = c.dataset.off)))); }
function animateBars() { requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]').forEach((b) => (b.style.width = b.dataset.w)))); }

/* ---------- Tabs ---------- */
let tab = 'learn';
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('.tab'); if (!b) return;
  sfx.tap();
  tab = b.dataset.tab;
  $$('.tab').forEach((t) => t.classList.toggle('active', t === b));
  render();
  window.scrollTo({ top: 0 });
});
function render() {
  ensureMissions();
  const v = $('#view');
  v.className = 'fade-in';
  void v.offsetWidth;
  if (tab === 'learn') v.innerHTML = viewLearn();
  if (tab === 'missions') v.innerHTML = viewMissions();
  if (tab === 'progress') v.innerHTML = viewProgress();
  if (tab === 'profile') v.innerHTML = viewProfile();
  animateRings(); animateBars();
  if (tab === 'learn') { const cur = $('.node.current'); if (cur && !render.scrolled) { render.scrolled = true; if (cur.getBoundingClientRect().bottom < innerHeight - 120) return; setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); } }
}

/* ---------- Views ---------- */
function headerChips() {
  const d = todayStats();
  const streak = currentStreak();
  return `<div class="topbar">
    <div class="chips">
      <span class="chip"><span class="ico">🔥</span>${streak}</span>
      <span class="chip"><span class="ico">⚡</span>${state.xp}</span>
    </div>
    <span class="chip"><span class="ico">🎯</span>${Math.min(d.xp, state.dailyGoal)}/${state.dailyGoal}</span>
  </div>`;
}

function viewLearn() {
  const L = levelInfo();
  const d = todayStats();
  const canReview = weakItems(10).length >= 5;
  let html = headerChips();
  html += `<h1 class="large-title">¡Hola, ${esc(state.name)}!</h1>
  <p class="subtitle">${d.xp >= state.dailyGoal ? 'Dagdoel gehaald. Lekker bezig.' : `Nog ${state.dailyGoal - d.xp} XP voor je dagdoel.`}</p>
  <div class="card level-card">
    ${ring(L.pct, L.level)}
    <div class="grow">
      <div style="font-weight:700;font-size:17px">Level ${L.level} · ${L.name}</div>
      <div class="muted small" style="margin:2px 0 8px">${L.into} / ${L.need} XP naar level ${L.level + 1} · niveau ${cefr()}</div>
      <div class="bar"><i style="width:0" data-w="${Math.round(L.pct * 100)}%"></i></div>
    </div>
  </div>`;
  if (canReview) html += `<button class="card row" data-action="review" style="width:100%;text-align:left;margin-top:12px">
      <div style="font-size:28px">🔁</div>
      <div class="grow"><div style="font-weight:600">Herhaal zwakke woorden</div><div class="muted small">Slim herhalen wat je vaak fout doet</div></div>
      <div class="muted" style="font-size:20px">›</div>
    </button>`;

  let currentFound = false;
  UNITS.forEach((u, ui) => {
    const unlocked = unitUnlocked(ui);
    const done = state.progress[u.id] || 0;
    html += `<section class="unit">
      <div class="unit-head ${unlocked ? '' : 'locked'}" style="background:${u.color}">
        <div class="uico">${u.icon}</div>
        <div class="grow"><div class="small" style="opacity:.85;font-weight:600">MISSIE ${ui + 1}</div><h3>${esc(u.title)}</h3><p>${esc(u.subtitle)}</p></div>
        <div style="font-weight:700">${Math.min(done, LESSONS_PER_UNIT)}/${LESSONS_PER_UNIT}</div>
      </div>
      <div class="path">`;
    for (let li = 0; li < LESSONS_PER_UNIT; li++) {
      const isDone = li < done;
      const avail = unlocked && li <= done;
      const isCurrent = avail && !isDone && !currentFound;
      if (isCurrent) currentFound = true;
      const offset = [0, -60, 0, 60][li % 4];
      const icons = ['⭐', '⭐', '💬', '🏁'];
      const labels = ['Woorden 1', 'Woorden 2', 'Zinnen', 'Missietest'];
      html += `<button class="node ${isDone ? 'done' : ''} ${avail ? '' : 'locked'} ${isCurrent ? 'current' : ''}" style="${avail ? `--c:${u.color};` : ''}left:${offset}px" data-action="${avail ? 'lesson' : 'locked'}" data-u="${ui}" data-l="${li}">
        ${isCurrent ? '<span class="start-pop">START</span>' : ''}${avail ? icons[li] : '🔒'}<span class="node-label">${labels[li]}</span></button>`;
    }
    html += `</div></section>`;
  });
  html += `<p class="muted small" style="text-align:center;margin-top:36px">Meer missies volgen. ¡Vamos!</p>`;
  return html;
}

function viewMissions() {
  const list = state.missions.list;
  let html = headerChips() + `<h1 class="large-title">Missies</h1><p class="subtitle">Elke dag nieuwe uitdagingen. Claim je bonus-XP.</p>`;
  html += `<div class="section-title">Vandaag</div>`;
  list.forEach((m, i) => {
    const T = MISSION_TYPES[m.id];
    const val = missionProgress(m);
    const complete = val >= m.n;
    html += `<div class="card mission ${complete ? 'complete' : ''}">
      <div class="mi">${T.ico}</div>
      <div class="grow">
        <div class="t">${T.text(m.n)}</div>
        <div class="row" style="gap:10px"><div class="bar grow"><i style="width:0" data-w="${(val / m.n) * 100}%"></i></div><span class="muted small">${val}/${m.n}</span></div>
      </div>
      ${m.claimed ? '<span class="muted small">✓ Geclaimd</span>' : complete ? `<button class="claim" data-action="claim" data-i="${i}">+${m.reward} XP</button>` : `<span class="reward">+${m.reward}</span>`}
    </div>`;
  });
  html += `<div class="section-title">Prestaties</div><div class="badge-grid">`;
  BADGES.forEach((b) => { html += `<div class="badge ${state.badges[b.id] ? '' : 'off'}"><div class="e">${b.e}</div><div class="n">${b.n}</div></div>`; });
  html += `</div>`;
  return html;
}

function viewProgress() {
  const t = state.totals;
  const acc = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
  let html = headerChips() + `<h1 class="large-title">Voortgang</h1><p class="subtitle">Meet hoe je beter wordt.</p>`;
  html += `<div class="kpis">
    <div class="kpi"><div class="v">🔥 ${currentStreak()}</div><div class="k">Dagen streak</div></div>
    <div class="kpi"><div class="v">${state.xp}</div><div class="k">Totaal XP</div></div>
    <div class="kpi"><div class="v">${learnedCount()}</div><div class="k">Woorden & zinnen geleerd</div></div>
    <div class="kpi"><div class="v">${masteredCount()}</div><div class="k">Beheerst (sterk)</div></div>
    <div class="kpi"><div class="v">${acc}%</div><div class="k">Nauwkeurigheid</div></div>
    <div class="kpi"><div class="v">${t.lessons}</div><div class="k">Lessen gedaan</div></div>
  </div>`;

  // XP grafiek laatste 7 dagen
  const days = [...Array(7)].map((_, i) => addDays(new Date(), i - 6));
  const vals = days.map((d) => (state.days[dayKey(d)] || {}).xp || 0);
  const max = Math.max(state.dailyGoal, ...vals);
  const wd = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  html += `<div class="section-title">XP afgelopen 7 dagen</div><div class="card"><div class="chart">`;
  days.forEach((d, i) => { html += `<div class="col"><span class="n">${vals[i] || ''}</span><div class="b ${i === 6 ? 'today' : ''}" style="height:${(vals[i] / max) * 100}%"></div><span class="l">${wd[d.getDay()]}</span></div>`; });
  html += `</div></div>`;

  // Nauwkeurigheid trend per dag (laatste 7 met data)
  const accDays = Object.entries(state.days).filter(([, v]) => v.total > 0).sort().slice(-7);
  if (accDays.length >= 2) {
    html += `<div class="section-title">Nauwkeurigheid per dag</div><div class="card"><div class="chart">`;
    accDays.forEach(([k, v]) => { const p = Math.round((v.correct / v.total) * 100); const d = new Date(k); html += `<div class="col"><span class="n">${p}%</span><div class="b" style="height:${p}%;background:var(--purple)"></div><span class="l">${d.getDate()}/${d.getMonth() + 1}</span></div>`; });
    html += `</div></div>`;
  }

  // Per missie
  html += `<div class="section-title">Missies</div><div class="card">`;
  UNITS.forEach((u) => {
    const items = [...u.words, ...u.phrases];
    const strength = items.reduce((s, p) => s + ((state.items[p[0]] || {}).s || 0), 0) / (items.length * 5);
    const done = state.progress[u.id] || 0;
    html += `<div class="list-row"><div class="row grow"><span style="font-size:22px">${u.icon}</span><div class="grow"><div style="font-weight:600">${esc(u.title)}</div><div class="bar" style="margin-top:6px"><i style="width:0;background:${u.color}" data-w="${Math.round(strength * 100)}%"></i></div></div></div><div class="dots">${[...Array(LESSONS_PER_UNIT)].map((_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div></div>`;
  });
  html += `</div>`;

  // Moeilijkste
  const hard = Object.entries(state.items).filter(([, v]) => v.w > 0).sort((a, b) => b[1].w - a[1].w || a[1].s - b[1].s).slice(0, 6);
  if (hard.length) {
    const lookup = Object.fromEntries([...allWords(), ...allPhrases()].map((p) => [p[0], p[1]]));
    html += `<div class="section-title">Lastigste woorden</div><div class="card">`;
    hard.forEach(([es, v]) => { html += `<button class="list-row" style="width:100%;text-align:left" data-action="say" data-text="${esc(personalize(es))}"><div class="grow"><div style="font-weight:600">${esc(personalize(es))}</div><div class="muted small">${esc(personalize(lookup[es] || ''))}</div></div><span class="muted small">${v.w}× fout</span></button>`; });
    html += `</div>`;
  }
  return html;
}

function viewProfile() {
  const L = levelInfo();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<h1 class="large-title">Profiel</h1><p class="subtitle">Level ${L.level} · ${L.name} · ${state.xp} XP</p>
  <div class="section-title">Jij</div>
  <div class="group">
    <label class="item">Naam<input type="text" id="name" value="${esc(state.name)}" maxlength="20"></label>
  </div>
  <div class="section-title">Dagdoel</div>
  <div class="group"><div class="item">XP per dag<div class="seg" id="goal">${[10, 20, 30, 50].map((g) => `<button data-g="${g}" class="${state.dailyGoal === g ? 'on' : ''}">${g}</button>`).join('')}</div></div></div>
  <div class="section-title">Geluid & spraak</div>
  <div class="group">
    <div class="item">Geluidseffecten<label class="switch"><input type="checkbox" id="sound" ${state.sound ? 'checked' : ''}><span></span></label></div>
    <div class="item">Audio automatisch afspelen<label class="switch"><input type="checkbox" id="autoplay" ${state.autoplay ? 'checked' : ''}><span></span></label></div>
    <div class="item">Spreektempo<div class="seg" id="rate">${[[0.75, 'Rustig'], [0.9, 'Normaal'], [1, 'Snel']].map(([r, n]) => `<button data-r="${r}" class="${state.rate === r ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <button class="item" data-action="say" data-text="Hola, ¿qué tal? Vamos a aprender español." style="width:100%;color:var(--accent)">Test stem</button>
  </div>
  ${!standalone ? `<div class="section-title">Installeren</div><div class="card small muted">${isIOS ? 'Tik in Safari op <b>Deel</b> en kies <b>Zet op beginscherm</b>. Daarna werkt Hablo als app, ook offline.' : 'Open het browsermenu en kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.'}</div>` : ''}
  <div class="section-title">Gegevens</div>
  <div class="group">
    <button class="item" data-action="export" style="width:100%;color:var(--accent)">Exporteer voortgang</button>
    <button class="item" data-action="import" style="width:100%;color:var(--accent)">Importeer voortgang</button>
    <button class="item danger" data-action="reset" style="width:100%">Reset alle voortgang</button>
  </div>
  <p class="muted small" style="text-align:center;margin-top:24px">Hablo · ${UNITS.length} missies · ${allWords().length + allPhrases().length} woorden & zinnen</p>`;
}

/* ---------- View events ---------- */
$('#view').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action;
  audio();
  if (a === 'lesson') { sfx.tap(); startLesson(+el.dataset.u, +el.dataset.l); }
  if (a === 'locked') { vibrate(10); toast('🔒 Rond eerst de vorige les af'); }
  if (a === 'review') { const ex = buildReview(); if (ex) { sfx.tap(); startSession({ kind: 'review', title: 'Herhaling', color: '#FF9500', exercises: ex }); } }
  if (a === 'claim') {
    const m = state.missions.list[+el.dataset.i];
    if (m.claimed || missionProgress(m) < m.n) return;
    m.claimed = true;
    const before = levelInfo().level;
    state.xp += m.reward; todayStats().xp += m.reward;
    save(); sfx.claim(); confetti(); toast(`+${m.reward} XP bonus`);
    if (levelInfo().level > before) setTimeout(() => { sfx.levelup(); toast(`🎉 Level ${levelInfo().level} bereikt!`); }, 900);
    render();
  }
  if (a === 'say') speak(el.dataset.text);
  if (a === 'reset') { if (confirm('Alle voortgang wissen? Dit kan niet ongedaan worden.')) { const name = state.name; state = structuredClone(DEFAULT_STATE); state.name = name; save(); render.scrolled = false; tab = 'learn'; $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'learn')); render(); toast('Voortgang gewist'); } }
  if (a === 'export') {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `hablo-${today()}.json`; link.click();
  }
  if (a === 'import') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => { try { const data = JSON.parse(await inp.files[0].text()); state = deepMerge(structuredClone(DEFAULT_STATE), data); save(); render(); toast('Voortgang geïmporteerd'); } catch (err) { toast('Ongeldig bestand'); } };
    inp.click();
  }
});
$('#view').addEventListener('change', (e) => {
  if (e.target.id === 'sound') { state.sound = e.target.checked; save(); sfx.tap(); }
  if (e.target.id === 'autoplay') { state.autoplay = e.target.checked; save(); }
  if (e.target.id === 'name') { state.name = e.target.value.trim() || 'Jerry'; save(); }
});
$('#view').addEventListener('click', (e) => {
  const g = e.target.closest('#goal button'); if (g) { state.dailyGoal = +g.dataset.g; state.missions = null; save(); sfx.tap(); render(); }
  const r = e.target.closest('#rate button'); if (r) { state.rate = +r.dataset.r; save(); speak('¿Qué tal?'); render(); }
});

/* =========================================================
   Les-sessie
   ========================================================= */
let S = null; // actieve sessie

function startLesson(ui, li) {
  const u = UNITS[ui];
  startSession({ kind: 'lesson', ui, li, title: u.title, color: u.color, exercises: buildLesson(ui, li) });
}

function startSession(opts) {
  S = {
    ...opts,
    queue: opts.exercises,
    initial: opts.exercises.length,
    doneIds: new Set(),
    retried: new Set(),
    i: 0,
    correct: 0, answered: 0, mistakes: 0,
    combo: 0, bestCombo: 0,
    startXP: state.xp, startLevel: levelInfo().level,
    checked: false,
    t0: Date.now(),
  };
  $('#tabbar').classList.add('hidden');
  const o = $('#overlay');
  o.innerHTML = `<div class="lesson">
    <div class="lesson-top">
      <button class="close-x" data-l="close" aria-label="Sluiten">✕</button>
      <div class="bar"><i id="lbar" style="width:0;background:${S.color}"></i></div>
      <span class="combo" id="combo"></span>
    </div>
    <div class="stage" id="stage"></div>
    <div class="footer" id="footer"><div class="inner">
      <div class="fb"><div class="fb-title" id="fbt"></div><div class="fb-sol" id="fbs"></div></div>
      <button class="btn" id="mainBtn" disabled>Controleer</button>
    </div></div>
  </div>`;
  showExercise();
}

function closeSession() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  const l = $('.lesson');
  if (l) { l.classList.add('closing'); setTimeout(() => { $('#overlay').innerHTML = ''; }, 330); }
  $('#tabbar').classList.remove('hidden');
  S = null;
  render();
}

function updateBar() {
  $('#lbar').style.width = (S.doneIds.size / S.initial) * 100 + '%';
  const c = $('#combo');
  c.textContent = S.combo >= 3 ? `🔥 ${S.combo}` : '';
  if (S.combo >= 3) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 300); }
}

function showExercise() {
  updateBar();
  if (S.i >= S.queue.length) return finishSession();
  const ex = S.queue[S.i];
  S.checked = false;
  S.answer = null;
  const f = $('#footer'); f.className = 'footer';
  const btn = $('#mainBtn'); btn.className = 'btn'; btn.textContent = 'Controleer'; btn.disabled = true;
  if (ex.type === 'match') btn.style.display = 'none'; else btn.style.display = '';
  $('#stage').innerHTML = `<div class="ex">${renderEx(ex)}</div>`;
  $('#stage').scrollTop = 0;
  // autoplay
  if (state.autoplay && (ex.type === 'listen' || (ex.type === 'mc' && ex.dir === 'es-nl') || (ex.type === 'build' && ex.listen))) setTimeout(() => speak(ex.es), 350);
  if (ex.type === 'type') setTimeout(() => $('#typed') && $('#typed').focus(), 400);
}

function speakBtns(text, slow = true, big = false) {
  return `<button class="speak ${big ? 'big' : ''}" data-say="${esc(text)}" aria-label="Afspelen">${ICON_SPEAK}</button>${slow ? `<button class="speak slow" data-say="${esc(text)}" data-slow="1" aria-label="Langzaam">🐢</button>` : ''}`;
}

function renderEx(ex) {
  if (ex.type === 'mc') {
    const isNew = ex.dir === 'es-nl' && !state.items[ex.item[0]];
    const head = ex.dir === 'es-nl'
      ? `<div class="ex-type">${isNew ? '✨ Nieuw woord' : 'Wat betekent dit?'}</div><div class="prompt">${speakBtns(ex.es, false)}<div class="bubble">${esc(ex.es)}</div></div>`
      : `<div class="ex-type">Hoe zeg je dit in het Spaans?</div><div class="prompt"><div class="bubble">${esc(ex.nl)}</div></div>`;
    return head + `<div class="options">${ex.options.map((o, i) => `<button class="opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
  }
  if (ex.type === 'listen') {
    return `<div class="ex-type">Luisteren</div><h2 class="ex-q">Wat hoor je?</h2>
      <div class="row" style="justify-content:center;gap:16px">${speakBtns(ex.es, false, true)}<button class="speak slow" data-say="${esc(ex.es)}" data-slow="1" style="align-self:center;margin-bottom:28px">🐢</button></div>
      <div class="options">${ex.options.map((o, i) => `<button class="opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
  }
  if (ex.type === 'build') {
    S.built = [];
    const head = ex.listen
      ? `<div class="ex-type">Luister en bouw</div><h2 class="ex-q">Schrijf wat je hoort</h2><div class="prompt">${speakBtns(ex.es)}</div>`
      : `<div class="ex-type">Vertaal deze zin</div><div class="prompt"><div class="bubble">${esc(ex.nl)}</div></div>`;
    return head + `<div class="answer-line" id="built"></div><div class="answer-line"></div>
      <div class="bank" id="bank">${ex.bank.map((w, i) => `<button class="tile" data-tile="${i}">${esc(w)}</button>`).join('')}</div>`;
  }
  if (ex.type === 'type') {
    return `<div class="ex-type">Typ in het Spaans</div><div class="prompt"><div class="bubble">${esc(ex.nl)}</div></div>
      <input class="type-input" id="typed" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Typ je antwoord…" enterkeyhint="done">
      <div class="accents">${['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'].map((c) => `<button data-acc="${c}">${c}</button>`).join('')}</div>`;
  }
  if (ex.type === 'match') {
    S.match = { left: null, right: null, done: 0, errors: 0, failed: new Set() };
    let cells = '';
    for (let i = 0; i < ex.left.length; i++) {
      cells += `<button class="opt" data-side="l" data-v="${esc(ex.left[i])}">${esc(ex.left[i])}</button>`;
      cells += `<button class="opt" data-side="r" data-v="${esc(ex.right[i])}">${esc(ex.right[i])}</button>`;
    }
    return `<div class="ex-type">Koppel de paren</div><h2 class="ex-q">Tik op de paren die bij elkaar horen</h2><div class="match">${cells}</div>`;
  }
  return '';
}

/* ---------- Lesson events ---------- */
$('#overlay').addEventListener('click', (e) => {
  if (!S) {
    const btn = e.target.closest('[data-l]');
    if (btn && btn.dataset.l === 'finish') closeSession();
    return;
  }
  const t = e.target;
  const ex = S.queue[S.i];

  if (t.closest('[data-l="close"]')) {
    if (S.answered === 0 || confirm('Stoppen? Je voortgang in deze les gaat verloren.')) closeSession();
    return;
  }
  if (t.closest('[data-l="finish"]')) { closeSession(); return; }
  const say = t.closest('[data-say]');
  if (say) { speak(say.dataset.say, !!say.dataset.slow); return; }
  if (t.closest('#mainBtn')) { onMain(); return; }
  if (S.checked || !ex) return;

  const opt = t.closest('[data-opt]');
  if (opt && (ex.type === 'mc' || ex.type === 'listen')) {
    sfx.tap();
    $$('.opt').forEach((o) => o.classList.remove('sel'));
    opt.classList.add('sel');
    S.answer = ex.options[+opt.dataset.opt];
    if (ex.type === 'mc' && ex.dir === 'nl-es') speak(S.answer);
    $('#mainBtn').disabled = false;
    return;
  }
  const tile = t.closest('[data-tile]');
  if (tile && ex.type === 'build') {
    sfx.tap();
    const idx = +tile.dataset.tile;
    if (tile.parentElement.id === 'bank') {
      tile.classList.add('ghost');
      S.built.push(idx);
      speak(ex.bank[idx]);
    } else {
      S.built = S.built.filter((x) => x !== idx);
      $(`#bank [data-tile="${idx}"]`).classList.remove('ghost');
    }
    $('#built').innerHTML = S.built.map((i) => `<button class="tile" data-tile="${i}">${esc(ex.bank[i])}</button>`).join('');
    $('#mainBtn').disabled = S.built.length === 0;
    return;
  }
  const acc = t.closest('[data-acc]');
  if (acc) {
    const inp = $('#typed');
    const s = inp.selectionStart ?? inp.value.length;
    inp.value = inp.value.slice(0, s) + acc.dataset.acc + inp.value.slice(inp.selectionEnd ?? s);
    inp.focus(); inp.setSelectionRange(s + 1, s + 1);
    $('#mainBtn').disabled = !inp.value.trim();
    return;
  }
  const cell = t.closest('[data-side]');
  if (cell && ex.type === 'match') onMatch(ex, cell);
});
$('#overlay').addEventListener('input', (e) => {
  if (e.target.id === 'typed') $('#mainBtn').disabled = !e.target.value.trim();
});
$('#overlay').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && S && !$('#mainBtn').disabled) { e.preventDefault(); onMain(); }
});

function onMatch(ex, cell) {
  if (cell.classList.contains('right') || cell.classList.contains('gone')) return;
  const side = cell.dataset.side;
  $$(`.match [data-side="${side}"]`).forEach((c) => c.classList.remove('sel'));
  cell.classList.add('sel');
  S.match[side === 'l' ? 'left' : 'right'] = cell;
  if (side === 'l') speak(cell.dataset.v); else sfx.tap();
  const { left, right } = S.match;
  if (!left || !right) return;
  const pair = ex.pairs.find((p) => p[0] === left.dataset.v);
  const item = ex.items[ex.pairs.indexOf(pair)];
  if (pair && pair[1] === right.dataset.v) {
    sfx.match();
    [left, right].forEach((c) => { c.classList.remove('sel'); c.classList.add('right'); setTimeout(() => c.classList.add('gone'), 350); });
    S.match.done++;
    if (!S.match.failed.has(item[0])) markItem(item, true);
  } else {
    sfx.wrong();
    S.match.errors++;
    if (pair && !S.match.failed.has(item[0])) { S.match.failed.add(item[0]); markItem(item, false); }
    [left, right].forEach((c) => { c.classList.remove('sel'); c.classList.add('wrong'); setTimeout(() => c.classList.remove('wrong'), 450); });
  }
  S.match.left = S.match.right = null;
  if (S.match.done === ex.pairs.length) {
    setTimeout(() => {
      const ok = S.match.errors === 0;
      result(ok, ex, ok ? null : `${S.match.errors} ${S.match.errors === 1 ? 'fout' : 'fouten'}, maar je hebt ze allemaal gekoppeld.`, true);
    }, 450);
  }
}

function onMain() {
  if (!S) return;
  const ex = S.queue[S.i];
  if (S.checked) { S.i++; showExercise(); return; }
  let ok = false, note = null, solution = ex.es;
  if (ex.type === 'mc' || ex.type === 'listen') {
    ok = norm(S.answer) === norm(ex.answer);
    solution = ex.answer;
    $$('.opt').forEach((o) => {
      const v = ex.options[+o.dataset.opt];
      if (norm(v) === norm(ex.answer)) o.classList.add('right');
      else if (o.classList.contains('sel')) o.classList.add('wrong');
      else o.classList.add('faded');
    });
  } else if (ex.type === 'build') {
    const got = S.built.map((i) => ex.bank[i]).join(' ');
    ok = norm(got) === norm(ex.correct.join(' '));
    if (!ok && stripAccents(norm(got)) === stripAccents(norm(ex.correct.join(' ')))) ok = true;
  } else if (ex.type === 'type') {
    const r = checkTyped($('#typed').value, ex.answer);
    ok = r.ok; note = r.note;
    $('#typed').disabled = true;
  }
  result(ok, ex, note);
}

function result(ok, ex, note, isMatch = false) {
  S.checked = true;
  S.answered++;
  const d = todayStats();
  d.total++; state.totals.answered++;
  const firstTry = !S.retried.has(ex.id);
  if (ok) {
    S.correct++; d.correct++; state.totals.correct++;
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
    S.doneIds.add(ex.id);
    sfx.correct();
  } else {
    S.mistakes++; S.combo = 0;
    if (!isMatch && firstTry) { S.retried.add(ex.id); S.queue.push({ ...ex }); }
    else S.doneIds.add(ex.id);
    sfx.wrong();
  }
  if (isMatch) S.doneIds.add(ex.id);
  if (!isMatch) markItem(ex.item, ok);
  save();
  updateBar();

  const praise = ['Goed zo!', 'Perfecto!', '¡Muy bien!', 'Top!', '¡Excelente!', 'Lekker!'];
  const f = $('#footer');
  f.className = 'footer ' + (ok ? 'right' : 'wrong');
  $('#fbt').innerHTML = ok ? `✓ ${praise[Math.floor(Math.random() * praise.length)]}` : '✕ Niet helemaal';
  let sol = '';
  if (isMatch) sol = note || '';
  else if (!ok) sol = `Juiste antwoord: <b>${esc(ex.type === 'mc' && ex.dir === 'es-nl' ? ex.nl : ex.es)}</b>${ex.type === 'mc' && ex.dir === 'es-nl' ? '' : `<br><span class="muted">${esc(ex.nl)}</span>`}`;
  else if (note) sol = `${esc(note)}: <b>${esc(ex.es)}</b>`;
  else if (ex.type === 'build' || ex.type === 'listen') sol = `<span class="muted">${esc(ex.nl)}</span>`;
  $('#fbs').innerHTML = sol;
  const btn = $('#mainBtn');
  btn.style.display = '';
  btn.disabled = false;
  btn.className = 'btn ' + (ok ? 'green' : 'red');
  btn.textContent = 'Doorgaan';
  if (!isMatch && ex.type !== 'mc' || (ex.type === 'mc' && ex.dir === 'nl-es' && !ok)) speak(ex.es);
}

function finishSession() {
  const d = todayStats();
  const perfect = S.mistakes === 0;
  const accuracy = Math.round((S.correct / Math.max(1, S.answered)) * 100);
  const firstLessonToday = d.lessons === 0;
  let xp = 10 + S.correct + (perfect ? 5 : 0) + Math.floor(S.bestCombo / 5) * 2;
  if (S.kind === 'review') xp += 5;
  state.xp += xp; d.xp += xp;
  d.lessons++; state.totals.lessons++;
  if (perfect) { d.perfect++; state.totals.perfect++; }
  d.bestCombo = Math.max(d.bestCombo, S.bestCombo);
  state.totals.bestCombo = Math.max(state.totals.bestCombo, S.bestCombo);
  if (S.kind === 'review') { d.reviews++; state.totals.reviews++; }
  if (S.kind === 'lesson') {
    const u = UNITS[S.ui];
    state.progress[u.id] = Math.max(state.progress[u.id] || 0, S.li + 1);
  }
  // streak
  if (firstLessonToday) {
    if (state.streak.last === yesterday()) state.streak.count++;
    else if (state.streak.last !== today()) state.streak.count = 1;
    state.streak.last = today();
  }
  const badges = checkBadges();
  const L = levelInfo();
  const leveled = L.level > S.startLevel;
  const unitDone = S.kind === 'lesson' && S.li === LESSONS_PER_UNIT - 1;
  save();

  const secs = Math.round((Date.now() - S.t0) / 1000);
  const time = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${secs}s`;
  const emoji = unitDone ? '🏆' : perfect ? '💎' : accuracy >= 80 ? '🎉' : '💪';
  const title = unitDone ? '¡Misión cumplida!' : perfect ? '¡Perfecto!' : accuracy >= 80 ? '¡Muy bien!' : '¡Sigue así!';
  const sub = unitDone ? `Missie "${esc(UNITS[S.ui].title)}" voltooid` : perfect ? 'Foutloos. Sterk.' : 'Elke les maakt je beter.';
  const goalHit = d.xp >= state.dailyGoal && d.xp - xp < state.dailyGoal;

  $('#combo').textContent = '';
  $('#lbar').style.width = '100%';
  $('#stage').innerHTML = `<div class="result">
    <div class="big-emoji">${emoji}</div>
    <h2>${title}</h2><p class="muted">${sub}</p>
    <div class="stats-row">
      <div class="stat"><div class="v" style="color:var(--orange)">+${xp}</div><div class="k">XP</div></div>
      <div class="stat"><div class="v" style="color:var(--green)">${accuracy}%</div><div class="k">Score</div></div>
      <div class="stat"><div class="v" style="color:var(--accent)">${time}</div><div class="k">Tijd</div></div>
    </div>
    ${leveled ? `<div class="card" style="margin-bottom:12px"><div style="font-size:15px;font-weight:700">🎖️ Level ${L.level} bereikt: ${L.name}</div></div>` : ''}
    ${goalHit ? `<div class="card" style="margin-bottom:12px"><div style="font-size:15px;font-weight:700">🎯 Dagdoel gehaald · 🔥 ${state.streak.count} ${state.streak.count === 1 ? 'dag' : 'dagen'}</div></div>` : ''}
    ${badges.map((b) => `<div class="card" style="margin-bottom:12px"><div style="font-size:15px;font-weight:700">${b.e} Nieuwe prestatie: ${b.n}</div></div>`).join('')}
    ${S.bestCombo >= 5 ? `<p class="muted small">Beste combo: 🔥 ${S.bestCombo}</p>` : ''}
  </div>`;
  const f = $('#footer'); f.className = 'footer';
  const btn = $('#mainBtn'); btn.style.display = ''; btn.disabled = false; btn.className = 'btn'; btn.textContent = 'Doorgaan';
  btn.id = 'mainBtn'; btn.dataset.l = 'finish';
  S = null;
  sfx.complete();
  confetti();
  if (leveled) setTimeout(() => sfx.levelup(), 900);
}

/* ---------- Boot ---------- */
document.addEventListener('pointerdown', () => audio(), { once: true });
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

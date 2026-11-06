'use strict';

/* =========================================================
   Hablo — Spaans leren (castellano)
   Vanilla JS PWA. Alle voortgang staat lokaal (localStorage).
   ========================================================= */

const STORE_KEY = 'hablo-v2';
const LESSONS_PER_UNIT = 3;
const LESSON_NAMES = ['Woorden', 'Zinnen', 'Test'];
const LESSON_ICONS = ['⭐', '💬', '🏁'];
const SRS_DAYS = [0, 1, 2, 4, 8, 16, 32]; // Leitner-dozen 0..6
const DAY = 864e5;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- Datums ---------- */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => dayKey();
const yesterday = () => dayKey(addDays(new Date(), -1));
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ---------- State ---------- */
const DEFAULT_STATE = {
  name: 'Jerry',
  domain: 'padel',
  level: 'A1',        // A1 = beginner, A2 = gevorderd
  dir: 'both',        // both | es-nl | nl-es
  length: 'short',    // short ≈ 5 min, normal ≈ 10 min
  xp: 0,
  dailyGoal: 30,
  sound: true,
  autoplay: true,
  rate: 0.9,
  progress: {},       // unitId -> lessen voltooid
  items: {},          // es -> { b: doos 0-6, due, c, w, t }
  custom: [],         // eigen woorden { es, nl, ex, exNl }
  days: {},
  streak: { count: 0, last: null },
  missions: null,
  badges: {},
  totals: { lessons: 0, correct: 0, answered: 0, perfect: 0, bestCombo: 0, reviews: 0 },
};

let state = load();
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(raw)); } catch (e) { /* */ }
  return structuredClone(DEFAULT_STATE);
}
function deepMerge(base, add) {
  for (const k in add) {
    if (add[k] && typeof add[k] === 'object' && !Array.isArray(add[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = deepMerge(base[k], add[k]);
    else base[k] = add[k];
  }
  return base;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* */ } }
function todayStats() {
  const k = today();
  if (!state.days[k]) state.days[k] = { xp: 0, lessons: 0, correct: 0, total: 0, perfect: 0, reviews: 0, bestCombo: 0 };
  return state.days[k];
}
function currentStreak() { const s = state.streak; return s.last === today() || s.last === yesterday() ? s.count : 0; }

/* ---------- Content ---------- */
const personalize = (s) => (s || '').replace(/Jerry/g, state.name || 'Jerry');
function customDomain() {
  const words = state.custom.map((w) => ({ ...w, kind: 'word', custom: true }));
  const units = [];
  for (let i = 0; i < words.length; i += 8) units.push({ id: `mine-${i / 8}`, domain: 'mine', title: `Set ${i / 8 + 1}`, words: words.slice(i, i + 8), phrases: [] });
  return { id: 'mine', title: 'Mijn woorden', short: 'Mijn woorden', icon: '✏️', color: '#8E8E93', units };
}
function allDomains() { return state.custom.length ? [...DOMAINS, customDomain()] : DOMAINS; }
function getDomain(id) { return allDomains().find((d) => d.id === id) || DOMAINS[0]; }
function domainItems(d) { return d.units.flatMap((u) => [...u.words, ...u.phrases]); }
const allWords = () => allDomains().flatMap((d) => d.units.flatMap((u) => u.words));
const allPhrases = () => allDomains().flatMap((d) => d.units.flatMap((u) => u.phrases));
let ITEM_INDEX = null;
function itemIndex() {
  if (!ITEM_INDEX) { ITEM_INDEX = new Map(); allDomains().forEach((d) => domainItems(d).forEach((it) => { if (!ITEM_INDEX.has(it.es)) ITEM_INDEX.set(it.es, { ...it, domain: d.id }); })); }
  return ITEM_INDEX;
}
function invalidateIndex() { ITEM_INDEX = null; }
function unitUnlocked(d, i) { return i === 0 || (state.progress[d.units[i - 1].id] || 0) >= LESSONS_PER_UNIT; }

/* ---------- Spaced repetition ---------- */
function rec(es) { return state.items[es]; }
const isLearned = (es) => (rec(es)?.b || 0) >= 1;
const isMastered = (es) => (rec(es)?.b || 0) >= 4;
function dueItems() {
  const now = Date.now();
  const idx = itemIndex();
  return Object.entries(state.items)
    .filter(([es, r]) => idx.has(es) && r.due <= now)
    .sort((a, b) => a[1].b - b[1].b || a[1].due - b[1].due)
    .map(([es]) => idx.get(es));
}
function weakestItems(n) {
  const idx = itemIndex();
  return Object.entries(state.items).filter(([es]) => idx.has(es))
    .sort((a, b) => a[1].b - b[1].b || b[1].w - a[1].w || a[1].t - b[1].t)
    .slice(0, n).map(([es]) => idx.get(es));
}
// Eén beoordeling per item per sessie: eerste goed = promotie, fout = terug naar doos 0.
function grade(item, ok) {
  const k = item.es;
  const r = state.items[k] || { b: 0, due: 0, c: 0, w: 0, t: 0 };
  const g = S && S.graded.get(k);
  if (ok) r.c++; else r.w++;
  r.t = Date.now();
  if (!ok && g !== 'bad') { r.b = 0; r.due = Date.now(); if (S) S.graded.set(k, 'bad'); }
  else if (ok && !g) { r.b = Math.min(6, r.b + 1); r.due = startOfToday() + SRS_DAYS[r.b] * DAY + 4 * 3600e3; if (S) S.graded.set(k, 'ok'); }
  state.items[k] = r;
}

/* ---------- Levels ---------- */
const LEVEL_NAMES = ['Principiante', 'Aprendiz', 'Jugador', 'Viajero', 'Conversador', 'Negociador', 'Experto', 'Maestro', 'Leyenda'];
function levelInfo(xp = state.xp) {
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = 100 + (lvl - 1) * 50; }
  return { level: lvl, into: xp - acc, need, pct: (xp - acc) / need, name: LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, Math.floor((lvl - 1) / 2))] };
}
function cefr() {
  const m = Object.keys(state.items).filter(isMastered).length;
  if (m >= 220) return 'A2';
  if (m >= 120) return 'A1+';
  if (m >= 40) return 'A1';
  return 'A0';
}

/* ---------- Geluid (Web Audio) ---------- */
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
function vibrate(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* */ } }
const sfx = {
  tap() { if (state.sound) tone(1400, 0, 0.05, 'sine', 0.05); },
  correct() { if (!state.sound) return; tone(880, 0, 0.18, 'sine', 0.16); tone(1318.5, 0.09, 0.32, 'sine', 0.16); vibrate(12); },
  wrong() { if (!state.sound) return; tone(220, 0, 0.22, 'triangle', 0.16); tone(185, 0.12, 0.3, 'triangle', 0.14); vibrate([30, 40, 30]); },
  match() { if (state.sound) tone(1046.5, 0, 0.14, 'sine', 0.12); },
  complete() { if (!state.sound) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.4, 'sine', 0.14)); tone(1567.98, 0.48, 0.6, 'sine', 0.1); },
  levelup() { if (!state.sound) return; [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.1)); },
  claim() { if (!state.sound) return; tone(1318.5, 0, 0.1, 'sine', 0.12); tone(1760, 0.07, 0.25, 'sine', 0.12); },
};

/* ---------- Spraak: Spaans uit Spanje ---------- */
let esVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const v = speechSynthesis.getVoices().filter((x) => /^es[-_]ES/i.test(x.lang));
  esVoice = v.find((x) => /mónica|monica/i.test(x.name)) || v.find((x) => /enhanced|premium|neural|natural/i.test(x.name)) || v.find((x) => /google/i.test(x.name)) || v[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, slow = false) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ''));
  u.lang = 'es-ES';
  if (esVoice) u.voice = esVoice;
  u.rate = slow ? 0.6 : state.rate;
  speechSynthesis.speak(u);
}

/* ---------- Tekst vergelijken ---------- */
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/[¿¡?!.,;:"«»]/g, '').replace(/\s+/g, ' ').trim();
const ARTICLES = /^(el|la|los|las|un|una) /;
function lev(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function checkTyped(input, target) {
  const a = norm(input), b = norm(target);
  if (!a) return { ok: false };
  if (a === b) return { ok: true };
  if (stripAccents(a) === stripAccents(b)) return { ok: true, note: 'Let op de accenten' };
  if (ARTICLES.test(b) && !ARTICLES.test(a) && stripAccents(a) === stripAccents(b.replace(ARTICLES, ''))) return { ok: true, note: 'Vergeet het lidwoord niet' };
  if (ARTICLES.test(a) && ARTICLES.test(b) && a.replace(ARTICLES, '') === b.replace(ARTICLES, '')) return { ok: false, note: 'Verkeerd lidwoord' };
  if (b.length >= 6 && lev(stripAccents(a), stripAccents(b)) === 1) return { ok: true, note: 'Bijna! Let op de spelling' };
  return { ok: false };
}
const splitWords = (s) => String(s).replace(/\(.*?\)/g, '').replace(/[¿¡?!.,;:«»]/g, '').split(/\s+/).filter(Boolean);

/* ---------- Oefening-generators ---------- */
let exId = 0;
const P = (it) => ({ ...it, es: personalize(it.es), nl: personalize(it.nl), ex: personalize(it.ex), exNl: personalize(it.exNl) });
function allowDir(d) { return state.dir === 'both' || state.dir === d; }
function fixDir(d) { return allowDir(d) ? d : (d === 'es-nl' ? 'nl-es' : 'es-nl'); }

function distractors(answer, pool, key, n = 3) {
  const seen = new Set([norm(answer)]);
  const out = [];
  for (const p of shuffle(pool)) {
    const v = personalize(p[key]);
    if (v && !seen.has(norm(v))) { seen.add(norm(v)); out.push(v); }
    if (out.length >= n) break;
  }
  return out;
}
function exMC(item, pool, dir) {
  dir = fixDir(dir);
  const it = P(item);
  const answer = dir === 'es-nl' ? it.nl : it.es;
  return { id: ++exId, type: 'mc', dir, item, it, answer, options: shuffle([answer, ...distractors(answer, pool, dir === 'es-nl' ? 'nl' : 'es')]) };
}
function exListen(item, pool) {
  const it = P(item);
  return { id: ++exId, type: 'listen', item, it, answer: it.es, options: shuffle([it.es, ...distractors(it.es, pool, 'es')]) };
}
// Zin bouwen. sentence = { es, nl }. mode: 'nl-es' (vertaal naar Spaans), 'listen' (hoor Spaans, bouw Spaans), 'es-nl' (vertaal naar Nederlands)
function exBuild(item, sentence, mode, pool) {
  if (mode === 'nl-es' && !allowDir('nl-es')) mode = 'es-nl';
  if (mode === 'es-nl' && !allowDir('es-nl')) mode = 'nl-es';
  const s = { es: personalize(sentence.es), nl: personalize(sentence.nl) };
  const targetLang = mode === 'es-nl' ? 'nl' : 'es';
  const correct = splitWords(s[targetLang]);
  const lower = new Set(correct.map((w) => w.toLowerCase()));
  const extraN = state.level === 'A2' ? 5 : Math.min(4, Math.max(2, 7 - correct.length));
  const extra = [...new Set(shuffle(pool.flatMap((p) => splitWords(personalize(p[targetLang]))))
    .filter((w) => !lower.has(w.toLowerCase())))].slice(0, extraN);
  return { id: ++exId, type: 'build', mode, item, it: P(item), s, correct, bank: shuffle([...correct, ...extra]) };
}
function exType(item) {
  if (!allowDir('nl-es')) return exMC(item, allWords(), 'es-nl');
  return { id: ++exId, type: 'type', item, it: P(item), answer: personalize(item.es) };
}
function exMatch(items) {
  const pairs = items.map((i) => [personalize(i.es), personalize(i.nl)]);
  return { id: ++exId, type: 'match', items, pairs, left: shuffle(pairs.map((p) => p[0])), right: shuffle(pairs.map((p) => p[1])) };
}
// Zinnen uit een unit: voorbeeldzinnen van woorden + losse zinnen
function sentencesOf(words, phrases) {
  return [
    ...words.filter((w) => w.ex && w.exNl).map((w) => ({ item: w, s: { es: w.ex, nl: w.exNl } })),
    ...phrases.map((p) => ({ item: p, s: { es: p.es, nl: p.nl } })),
  ];
}
const sessionSize = () => (state.length === 'short' ? 10 : 16);

function buildLesson(d, ui, li) {
  const u = d.units[ui];
  const words = u.words, phrases = u.phrases;
  const wordPool = [...words, ...allWords()];
  const sentPool = [...sentencesOf(allWords(), allPhrases()).map((x) => x.s)];
  const N = sessionSize();
  const A2 = state.level === 'A2';
  const ex = [];

  if (li === 0) {
    // Introductie van elk woord, dan oefenen
    const intro = shuffle(words).slice(0, state.length === 'short' ? 6 : 8);
    intro.forEach((w) => ex.push(exMC(w, wordPool, A2 && isLearned(w.es) ? 'nl-es' : 'es-nl')));
    const rest = [];
    if (intro.length >= 4) rest.push(exMatch(sample(intro, Math.min(5, intro.length))));
    const kinds = A2 ? ['type', 'mc', 'listen', 'type'] : ['listen', 'mc', 'type', 'mc'];
    let k = 0;
    for (const w of shuffle(intro)) {
      if (ex.length + rest.length >= N + 2) break;
      const kind = kinds[k++ % kinds.length];
      rest.push(kind === 'type' ? exType(w) : kind === 'listen' ? exListen(w, wordPool) : exMC(w, wordPool, 'nl-es'));
    }
    return ex.concat(shuffle(rest));
  }

  const sents = shuffle(sentencesOf(words, phrases));
  if (li === 1) {
    const modes = A2 ? ['nl-es', 'listen', 'nl-es', 'es-nl'] : ['nl-es', 'es-nl', 'listen', 'nl-es'];
    sents.slice(0, N - 2).forEach((x, i) => {
      if (x.item.kind === 'phrase' && i % 3 === 2) ex.push(exListen(x.item, phrases.length >= 4 ? phrases : allPhrases()));
      else ex.push(exBuild(x.item, x.s, modes[i % modes.length], sentPool));
    });
    if (phrases.length) ex.push(exMC(pick(phrases), phrases.length >= 4 ? phrases : allPhrases(), 'es-nl'));
    while (ex.length < N && words.length) ex.push(exMC(pick(words), wordPool, 'nl-es'));
    return shuffle(ex);
  }

  // Test: alles door elkaar
  const ws = shuffle(words);
  ws.slice(0, A2 ? 4 : 3).forEach((w) => ex.push(exType(w)));
  sents.slice(0, A2 ? 5 : 4).forEach((x, i) => ex.push(exBuild(x.item, x.s, i % 2 ? 'listen' : 'nl-es', sentPool)));
  if (ws.length >= 4) ex.push(exMatch(ws.slice(0, 5)));
  ws.slice(4, 6).forEach((w) => ex.push(exListen(w, wordPool)));
  while (ex.length < N && ws.length) ex.push(exMC(pick(ws), wordPool, pick(['nl-es', 'es-nl'])));
  return shuffle(ex).slice(0, N);
}

function buildReview(items) {
  const wordPool = allWords();
  const sentPool = sentencesOf(allWords(), allPhrases()).map((x) => x.s);
  const ex = items.map((item) => {
    const b = rec(item.es)?.b || 0;
    if (item.kind === 'phrase') return b >= 2 || Math.random() < 0.5 ? exBuild(item, item, pick(['nl-es', 'listen']), sentPool) : exMC(item, allPhrases(), 'es-nl');
    if (b === 0) return pick([exMC(item, wordPool, 'es-nl'), exListen(item, wordPool)]);
    if (b <= 2) return pick([exMC(item, wordPool, 'nl-es'), exListen(item, wordPool), item.ex ? exBuild(item, { es: item.ex, nl: item.exNl }, 'nl-es', sentPool) : exType(item)]);
    return pick([exType(item), item.ex ? exBuild(item, { es: item.ex, nl: item.exNl }, 'listen', sentPool) : exType(item)]);
  });
  const w = items.filter((i) => i.kind === 'word');
  if (w.length >= 4) ex.push(exMatch(w.slice(0, 5)));
  return shuffle(ex);
}

/* ---------- Missies ---------- */
const MISSION_TYPES = {
  xp:      { ico: '⚡', text: (n) => `Verdien ${n} XP`, ns: [30, 50, 80], reward: 15, val: (d) => d.xp },
  lessons: { ico: '📚', text: (n) => `Rond ${n} sessies af`, ns: [2, 3], reward: 15, val: (d) => d.lessons },
  correct: { ico: '✅', text: (n) => `Geef ${n} goede antwoorden`, ns: [20, 30], reward: 10, val: (d) => d.correct },
  perfect: { ico: '💎', text: () => 'Maak een sessie foutloos', ns: [1], reward: 20, val: (d) => d.perfect },
  combo:   { ico: '🔥', text: (n) => `Haal een combo van ${n}`, ns: [8, 10], reward: 15, val: (d) => d.bestCombo },
  review:  { ico: '🔁', text: () => 'Doe een herhaalsessie', ns: [1], reward: 15, val: (d) => d.reviews },
};
function seeded(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
function ensureMissions() {
  if (state.missions && state.missions.date === today()) return;
  const r = seeded(today());
  const hasReview = Object.keys(state.items).length >= 5;
  const types = Object.keys(MISSION_TYPES).filter((t) => t !== 'xp' && (t !== 'review' || hasReview));
  const picked = ['xp'];
  while (picked.length < 3) { const t = types[Math.floor(r() * types.length)]; if (!picked.includes(t)) picked.push(t); }
  state.missions = { date: today(), list: picked.map((id) => { const m = MISSION_TYPES[id]; let n = m.ns[Math.floor(r() * m.ns.length)]; if (id === 'xp') n = Math.max(state.dailyGoal, n); return { id, n, reward: m.reward, claimed: false }; }) };
  save();
}
const missionProgress = (m) => Math.min(m.n, MISSION_TYPES[m.id].val(todayStats()));

/* ---------- Prestaties ---------- */
const learnedCount = () => Object.keys(state.items).filter(isLearned).length;
const masteredCount = () => Object.keys(state.items).filter(isMastered).length;
const domainDone = (d) => d.units.every((u) => (state.progress[u.id] || 0) >= LESSONS_PER_UNIT);
const BADGES = [
  { id: 'first', e: '🌱', n: 'Eerste sessie', test: () => state.totals.lessons >= 1 },
  { id: 'streak3', e: '🔥', n: '3 dagen streak', test: () => state.streak.count >= 3 },
  { id: 'streak7', e: '📅', n: '7 dagen streak', test: () => state.streak.count >= 7 },
  { id: 'streak30', e: '🏆', n: '30 dagen streak', test: () => state.streak.count >= 30 },
  { id: 'padel', e: '🎾', n: 'Padel compleet', test: () => domainDone(DOMAINS[0]) },
  { id: 'business', e: '🤝', n: 'Dealmaker', test: () => domainDone(DOMAINS.find((d) => d.id === 'business')) },
  { id: 'all', e: '🥇', n: 'Alle domeinen', test: () => DOMAINS.every(domainDone) },
  { id: 'words50', e: '📖', n: '50 geleerd', test: () => learnedCount() >= 50 },
  { id: 'master100', e: '🧠', n: '100 beheerst', test: () => masteredCount() >= 100 },
  { id: 'perfect10', e: '💎', n: '10x foutloos', test: () => state.totals.perfect >= 10 },
  { id: 'combo20', e: '⚡', n: 'Combo 20', test: () => state.totals.bestCombo >= 20 },
  { id: 'level10', e: '👑', n: 'Level 10', test: () => levelInfo().level >= 10 },
];
function checkBadges() { const fresh = []; for (const b of BADGES) if (!state.badges[b.id] && b.test()) { state.badges[b.id] = Date.now(); fresh.push(b); } return fresh; }

/* ---------- UI helpers ---------- */
const ICON_SPEAK = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>';
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
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 4000);
}
function ring(pct, label, size = 64, color) {
  const r = (size - 6) / 2, C = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - clamp(pct, 0, 1))}" ${color ? `style="stroke:${color}"` : ''}/></svg><div class="lvl">${label}</div></div>`;
}
function animate() { requestAnimationFrame(() => requestAnimationFrame(() => { $$('.ring .fg').forEach((c) => (c.style.strokeDashoffset = c.dataset.off)); $$('[data-w]').forEach((b) => (b.style.width = b.dataset.w)); })); }
const boxDots = (es) => { const b = rec(es)?.b || 0; return `<span class="dots" title="Doos ${b}/6">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${i <= b ? 'on' : ''}"></i>`).join('')}</span>`; };
function domainStats(d) {
  const items = domainItems(d);
  const learned = items.filter((i) => isLearned(i.es)).length;
  const mastered = items.filter((i) => isMastered(i.es)).length;
  const lessonsDone = d.units.reduce((s, u) => s + Math.min(LESSONS_PER_UNIT, state.progress[u.id] || 0), 0);
  return { total: items.length, learned, mastered, pct: items.length ? learned / items.length : 0, lessonsDone, lessonsTotal: d.units.length * LESSONS_PER_UNIT };
}
function domainChips(selected, action) {
  return `<div class="domain-chips">${allDomains().map((d) => { const st = domainStats(d); return `<button class="dchip ${d.id === selected ? 'on' : ''}" style="--c:${d.color}" data-action="${action}" data-d="${d.id}"><span>${d.icon}</span>${esc(d.short)}<small>${Math.round(st.pct * 100)}%</small></button>`; }).join('')}</div>`;
}

/* ---------- Tabs ---------- */
let tab = 'learn';
let wordsDomain = null;
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
  v.className = 'fade-in'; void v.offsetWidth;
  v.innerHTML = { learn: viewLearn, words: viewWords, missions: viewMissions, progress: viewProgress, profile: viewProfile }[tab]();
  animate();
  const sel = $('.dchip.on'); if (sel) sel.parentElement.scrollLeft = sel.offsetLeft - sel.parentElement.clientWidth / 2 + sel.clientWidth / 2;
  if (tab === 'learn') {
    const cur = $('.node.current');
    if (cur && render.scrollTo) { render.scrollTo = false; setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); }
  }
}

/* ---------- Views ---------- */
function headerChips() {
  const d = todayStats();
  return `<div class="topbar"><div class="chips">
      <span class="chip"><span class="ico">🔥</span>${currentStreak()}</span>
      <span class="chip"><span class="ico">⚡</span>${state.xp}</span></div>
    <span class="chip"><span class="ico">🎯</span>${Math.min(d.xp, state.dailyGoal)}/${state.dailyGoal}</span></div>`;
}

function viewLearn() {
  const L = levelInfo();
  const td = todayStats();
  const d = getDomain(state.domain);
  const due = dueItems().length;
  const st = domainStats(d);
  let html = headerChips();
  html += `<h1 class="large-title">¡Hola, ${esc(state.name)}!</h1>
  <p class="subtitle">${td.xp >= state.dailyGoal ? 'Dagdoel gehaald. Lekker bezig.' : `Nog ${state.dailyGoal - td.xp} XP voor je dagdoel.`}</p>
  <div class="card level-card">
    ${ring(L.pct, L.level)}
    <div class="grow">
      <div style="font-weight:700;font-size:17px">Level ${L.level} · ${L.name}</div>
      <div class="muted small" style="margin:2px 0 8px">${L.into} / ${L.need} XP naar level ${L.level + 1} · niveau ${cefr()}</div>
      <div class="bar"><i style="width:0" data-w="${Math.round(L.pct * 100)}%"></i></div>
    </div>
  </div>`;
  if (Object.keys(state.items).length) {
    html += `<button class="card row review-card" data-action="review" style="width:100%;text-align:left;margin-top:12px">
      <div class="review-ico ${due ? 'hot' : ''}">🔁</div>
      <div class="grow"><div style="font-weight:600">${due ? `${due} ${due === 1 ? 'woord' : 'woorden'} te herhalen` : 'Alles bijgewerkt'}</div>
      <div class="muted small">${due ? 'Spaced repetition: nu is het beste moment' : 'Extra oefenen met je zwakste woorden'}</div></div>
      <div class="muted" style="font-size:22px">›</div></button>`;
  }
  html += `<div class="section-title">Domein</div>${domainChips(d.id, 'domain')}`;
  html += `<div class="card domain-head" style="--c:${d.color}">
    <div class="row"><div style="font-size:30px">${d.icon}</div><div class="grow"><div style="font-weight:700;font-size:18px">${esc(d.title)}</div>
    <div class="muted small">${st.learned}/${st.total} geleerd · ${st.mastered} beheerst · ${st.lessonsDone}/${st.lessonsTotal} lessen</div></div></div>
    <div class="bar" style="margin-top:12px"><i style="width:0;background:${d.color}" data-w="${Math.round(st.pct * 100)}%"></i></div></div>`;

  if (!d.units.length || (d.id === 'mine' && state.custom.length < 4)) {
    html += `<div class="card" style="margin-top:20px;text-align:center"><div style="font-size:40px">✏️</div><p>Voeg minstens 4 eigen woorden toe in de tab <b>Woorden</b>.</p></div>`;
    return html;
  }
  let currentFound = false;
  d.units.forEach((u, ui) => {
    const unlocked = unitUnlocked(d, ui);
    const done = state.progress[u.id] || 0;
    html += `<section class="unit">
      <div class="unit-head ${unlocked ? '' : 'locked'}" style="background:${d.color}">
        <div class="grow"><div class="small" style="opacity:.85;font-weight:600">MISSIE ${ui + 1}</div><h3>${esc(u.title)}</h3>
        <p>${u.words.slice(0, 4).map((w) => esc(personalize(w.es))).join(' · ')}…</p></div>
        <div style="font-weight:700">${Math.min(done, LESSONS_PER_UNIT)}/${LESSONS_PER_UNIT}</div>
      </div><div class="path">`;
    for (let li = 0; li < LESSONS_PER_UNIT; li++) {
      const isDone = li < done;
      const avail = unlocked && li <= done;
      const isCurrent = avail && !isDone && !currentFound;
      if (isCurrent) currentFound = true;
      const offset = [0, -56, 56][li % 3];
      html += `<button class="node ${isDone ? 'done' : ''} ${avail ? '' : 'locked'} ${isCurrent ? 'current' : ''}" style="${avail ? `--c:${d.color};` : ''}left:${offset}px" data-action="${avail ? 'lesson' : 'locked'}" data-u="${ui}" data-l="${li}">
        ${isCurrent ? '<span class="start-pop">START</span>' : ''}${avail ? LESSON_ICONS[li] : '🔒'}<span class="node-label">${LESSON_NAMES[li]}</span></button>`;
    }
    html += `</div></section>`;
  });
  return html;
}

function viewWords() {
  const d = getDomain(wordsDomain || state.domain);
  let html = `<div class="topbar"><h1 class="large-title" style="margin:0">Woorden</h1><button class="add-btn" data-action="add" aria-label="Woord toevoegen">＋</button></div>
  <p class="subtitle">Tik om te horen. Bolletjes = hoe goed je het kent.</p>${domainChips(d.id, 'wdomain')}`;
  if (!d.units.length) return html + `<div class="card" style="margin-top:16px">Nog geen eigen woorden. Tik op ＋ om er een toe te voegen.</div>`;
  d.units.forEach((u) => {
    html += `<div class="section-title">${esc(u.title)}</div><div class="card words-list">`;
    [...u.words, ...u.phrases].forEach((w) => {
      const it = P(w);
      html += `<div class="wrow"><button class="wmain" data-action="say" data-text="${esc(it.es)}">
          <div class="row" style="gap:8px"><span class="wes">${esc(it.es)}</span>${w.kind === 'phrase' ? '<span class="tag">zin</span>' : ''}</div>
          <div class="muted small">${esc(it.nl)}</div>
          ${it.ex ? `<div class="wex">${esc(it.ex)}</div>` : ''}${w.tip ? `<div class="wtip">💡 ${esc(w.tip)}</div>` : ''}
        </button>
        <div class="wside">${boxDots(w.es)}${w.custom ? `<button class="del" data-action="del" data-es="${esc(w.es)}" aria-label="Verwijderen">✕</button>` : ''}</div></div>`;
    });
    html += `</div>`;
  });
  return html;
}

function viewMissions() {
  let html = headerChips() + `<h1 class="large-title">Missies</h1><p class="subtitle">Elke dag nieuwe uitdagingen. Claim je bonus-XP.</p><div class="section-title">Vandaag</div>`;
  state.missions.list.forEach((m, i) => {
    const T = MISSION_TYPES[m.id], val = missionProgress(m), complete = val >= m.n;
    html += `<div class="card mission ${complete ? 'complete' : ''}"><div class="mi">${T.ico}</div>
      <div class="grow"><div class="t">${T.text(m.n)}</div>
        <div class="row" style="gap:10px"><div class="bar grow"><i style="width:0" data-w="${(val / m.n) * 100}%"></i></div><span class="muted small">${val}/${m.n}</span></div></div>
      ${m.claimed ? '<span class="muted small">✓ Geclaimd</span>' : complete ? `<button class="claim" data-action="claim" data-i="${i}">+${m.reward} XP</button>` : `<span class="reward">+${m.reward}</span>`}</div>`;
  });
  html += `<div class="section-title">Prestaties</div><div class="badge-grid">`;
  BADGES.forEach((b) => { html += `<div class="badge ${state.badges[b.id] ? '' : 'off'}"><div class="e">${b.e}</div><div class="n">${b.n}</div></div>`; });
  return html + `</div>`;
}

function viewProgress() {
  const t = state.totals;
  const acc = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
  let html = headerChips() + `<h1 class="large-title">Voortgang</h1><p class="subtitle">Meet hoe je beter wordt.</p>
  <div class="kpis">
    <div class="kpi"><div class="v">🔥 ${currentStreak()}</div><div class="k">Dagen streak</div></div>
    <div class="kpi"><div class="v">${state.xp}</div><div class="k">Totaal XP</div></div>
    <div class="kpi"><div class="v">${learnedCount()}</div><div class="k">Geleerd</div></div>
    <div class="kpi"><div class="v">${masteredCount()}</div><div class="k">Beheerst (doos 4+)</div></div>
    <div class="kpi"><div class="v">${acc}%</div><div class="k">Nauwkeurigheid</div></div>
    <div class="kpi"><div class="v">${dueItems().length}</div><div class="k">Nu te herhalen</div></div>
  </div>`;

  html += `<div class="section-title">Per domein</div><div class="card">`;
  allDomains().forEach((d) => {
    const st = domainStats(d);
    html += `<button class="list-row" style="width:100%;text-align:left" data-action="domain" data-d="${d.id}" data-go="1"><div class="row grow"><span style="font-size:24px">${d.icon}</span>
      <div class="grow"><div class="row" style="justify-content:space-between"><span style="font-weight:600">${esc(d.title)}</span><span class="muted small">${Math.round(st.pct * 100)}%</span></div>
      <div class="bar" style="margin-top:6px;position:relative"><i style="width:0;background:${d.color};opacity:.35;position:absolute;inset:0 auto 0 0" data-w="${Math.round(st.pct * 100)}%"></i><i style="width:0;background:${d.color};position:absolute;inset:0 auto 0 0" data-w="${st.total ? Math.round((st.mastered / st.total) * 100) : 0}%"></i></div>
      <div class="muted small" style="margin-top:4px">${st.learned}/${st.total} geleerd · ${st.mastered} beheerst · ${st.lessonsDone}/${st.lessonsTotal} lessen</div></div></div></button>`;
  });
  html += `</div>`;

  // Geheugen-dozen
  const boxes = [0, 0, 0, 0, 0, 0, 0];
  Object.keys(state.items).forEach((k) => { if (itemIndex().has(k)) boxes[state.items[k].b]++; });
  const maxB = Math.max(1, ...boxes);
  const blabels = ['nieuw', '1d', '2d', '4d', '8d', '16d', '32d'];
  html += `<div class="section-title">Geheugen (spaced repetition)</div><div class="card"><div class="chart">`;
  boxes.forEach((n, i) => { html += `<div class="col"><span class="n">${n || ''}</span><div class="b" style="height:${(n / maxB) * 100}%;background:hsl(${i * 22} 75% 50%)"></div><span class="l">${blabels[i]}</span></div>`; });
  html += `</div><p class="muted small" style="margin:10px 0 0">Elk goed antwoord schuift een woord een doos op. Fout = terug naar het begin.</p></div>`;

  const days = [...Array(7)].map((_, i) => addDays(new Date(), i - 6));
  const vals = days.map((d) => (state.days[dayKey(d)] || {}).xp || 0);
  const max = Math.max(state.dailyGoal, ...vals);
  const wd = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  html += `<div class="section-title">XP afgelopen 7 dagen</div><div class="card"><div class="chart">`;
  days.forEach((d, i) => { html += `<div class="col"><span class="n">${vals[i] || ''}</span><div class="b ${i === 6 ? 'today' : ''}" style="height:${(vals[i] / max) * 100}%"></div><span class="l">${wd[d.getDay()]}</span></div>`; });
  html += `</div></div>`;

  const accDays = Object.entries(state.days).filter(([, v]) => v.total > 0).sort().slice(-7);
  if (accDays.length >= 2) {
    html += `<div class="section-title">Nauwkeurigheid per dag</div><div class="card"><div class="chart">`;
    accDays.forEach(([k, v]) => { const p = Math.round((v.correct / v.total) * 100); const d = new Date(k); html += `<div class="col"><span class="n">${p}%</span><div class="b" style="height:${p}%;background:var(--purple)"></div><span class="l">${d.getDate()}/${d.getMonth() + 1}</span></div>`; });
    html += `</div></div>`;
  }

  const hard = Object.entries(state.items).filter(([k, v]) => v.w > 0 && itemIndex().has(k)).sort((a, b) => b[1].w - a[1].w || a[1].b - b[1].b).slice(0, 6);
  if (hard.length) {
    html += `<div class="section-title">Lastigste woorden</div><div class="card">`;
    hard.forEach(([es, v]) => { const it = P(itemIndex().get(es)); html += `<button class="list-row" style="width:100%;text-align:left" data-action="say" data-text="${esc(it.es)}"><div class="grow"><div style="font-weight:600">${esc(it.es)}</div><div class="muted small">${esc(it.nl)}</div></div><span class="muted small">${v.w}× fout</span></button>`; });
    html += `</div>`;
  }
  return html;
}

function seg(id, opts, cur) { return `<div class="seg" id="${id}">${opts.map(([v, n]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`; }
function viewProfile() {
  const L = levelInfo();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<h1 class="large-title">Profiel</h1><p class="subtitle">Level ${L.level} · ${L.name} · ${state.xp} XP · niveau ${cefr()}</p>
  <div class="section-title">Jij</div>
  <div class="group"><label class="item">Naam<input type="text" id="name" value="${esc(state.name)}" maxlength="20"></label></div>
  <div class="section-title">Leren</div>
  <div class="group">
    <div class="item">Niveau${seg('set-level', [['A1', 'Beginner'], ['A2', 'Gevorderd']], state.level)}</div>
    <div class="item">Richting${seg('set-dir', [['both', 'Beide'], ['es-nl', 'ES→NL'], ['nl-es', 'NL→ES']], state.dir)}</div>
    <div class="item">Sessie${seg('set-length', [['short', '5 min'], ['normal', '10 min']], state.length)}</div>
    <div class="item">Dagdoel (XP)${seg('set-goal', [[10, '10'], [20, '20'], [30, '30'], [50, '50']], state.dailyGoal)}</div>
  </div>
  <div class="section-title">Geluid & spraak</div>
  <div class="group">
    <div class="item">Geluidseffecten<label class="switch"><input type="checkbox" id="sound" ${state.sound ? 'checked' : ''}><span></span></label></div>
    <div class="item">Audio automatisch<label class="switch"><input type="checkbox" id="autoplay" ${state.autoplay ? 'checked' : ''}><span></span></label></div>
    <div class="item">Spreektempo${seg('set-rate', [[0.75, 'Rustig'], [0.9, 'Normaal'], [1, 'Snel']], state.rate)}</div>
    <button class="item" data-action="say" data-text="Hola, ¿qué tal? ¿Jugamos un partido de pádel?" style="width:100%;color:var(--accent)">Test stem<span class="muted small">${esVoice ? esc(esVoice.name) + ' (es-ES)' : 'Geen Spaanse (Spanje) stem gevonden'}</span></button>
  </div>
  ${!esVoice ? `<p class="muted small" style="margin:8px 4px">Tip: installeer op iPhone een Spaanse stem via Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Spaans (Spanje), bijv. Mónica.</p>` : ''}
  ${!standalone ? `<div class="section-title">Installeren</div><div class="card small muted">${isIOS ? 'Tik in Safari op <b>Deel</b> en kies <b>Zet op beginscherm</b>. Daarna werkt Hablo als app, ook offline.' : 'Open het browsermenu en kies <b>App installeren</b>.'}</div>` : ''}
  <div class="section-title">Gegevens</div>
  <div class="group">
    <button class="item" data-action="export" style="width:100%;color:var(--accent)">Exporteer voortgang</button>
    <button class="item" data-action="import" style="width:100%;color:var(--accent)">Importeer voortgang</button>
    <button class="item danger" data-action="reset" style="width:100%">Reset alle voortgang</button>
  </div>
  <p class="muted small" style="text-align:center;margin-top:24px">Hablo · ${DOMAINS.length} domeinen · ${itemIndex().size} woorden & zinnen · castellano</p>`;
}

/* ---------- Toevoegen-sheet ---------- */
function openAddSheet() {
  const o = $('#overlay');
  o.innerHTML = `<div class="sheet-bg" data-sheet="close"></div><div class="sheet">
    <div class="sheet-grip"></div>
    <h2 style="margin:4px 0 4px">Woord toevoegen</h2><p class="muted small" style="margin:0 0 16px">Komt in het domein <b>Mijn woorden</b> en in je herhaling.</p>
    <div class="group form">
      <input id="f-es" placeholder="Spaans, met lidwoord (bijv. la pista)" autocomplete="off" autocapitalize="off">
      <input id="f-nl" placeholder="Nederlands" autocomplete="off">
      <input id="f-ex" placeholder="Voorbeeldzin in het Spaans (optioneel)" autocomplete="off">
      <input id="f-exnl" placeholder="Vertaling voorbeeldzin (optioneel)" autocomplete="off">
    </div>
    <button class="btn" data-sheet="save" style="margin-top:16px">Opslaan</button>
    <button class="btn ghost" data-sheet="close">Annuleren</button></div>`;
  setTimeout(() => $('#f-es').focus(), 300);
}
function closeSheet() { const s = $('.sheet'); if (!s) return; s.classList.add('closing'); $('.sheet-bg').classList.add('closing'); setTimeout(() => { $('#overlay').innerHTML = ''; }, 280); }

/* ---------- View events ---------- */
$('#view').addEventListener('click', (e) => {
  const sg = e.target.closest('.seg button');
  if (sg) {
    const id = sg.parentElement.id, v = sg.dataset.v;
    if (id === 'set-level') state.level = v;
    if (id === 'set-dir') state.dir = v;
    if (id === 'set-length') state.length = v;
    if (id === 'set-goal') { state.dailyGoal = +v; state.missions = null; }
    if (id === 'set-rate') { state.rate = +v; speak('¿Qué tal?'); }
    save(); sfx.tap(); render(); return;
  }
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action;
  audio();
  if (a === 'lesson') { sfx.tap(); startLesson(+el.dataset.u, +el.dataset.l); }
  if (a === 'locked') { vibrate(10); toast('🔒 Rond eerst de vorige les af'); }
  if (a === 'domain') {
    sfx.tap(); state.domain = el.dataset.d; save(); render.scrollTo = true;
    if (el.dataset.go) { tab = 'learn'; $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'learn')); window.scrollTo({ top: 0 }); }
    render();
  }
  if (a === 'wdomain') { sfx.tap(); wordsDomain = el.dataset.d; render(); }
  if (a === 'review') {
    let items = dueItems().slice(0, sessionSize());
    let title = 'Herhaling';
    if (items.length < 4) { items = weakestItems(Math.min(sessionSize(), 8)); title = 'Extra oefenen'; }
    if (items.length < 3) { toast('Leer eerst een paar woorden'); return; }
    sfx.tap(); startSession({ kind: 'review', title, color: '#FF9500', exercises: buildReview(items) });
  }
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
  if (a === 'add') { sfx.tap(); openAddSheet(); }
  if (a === 'del') {
    if (!confirm(`"${el.dataset.es}" verwijderen?`)) return;
    state.custom = state.custom.filter((w) => w.es !== el.dataset.es);
    delete state.items[el.dataset.es];
    if (!state.custom.length && state.domain === 'mine') state.domain = 'padel';
    if (!state.custom.length) wordsDomain = null;
    invalidateIndex(); save(); render();
  }
  if (a === 'reset') {
    if (!confirm('Alle voortgang wissen? Eigen woorden blijven bewaard.')) return;
    const keep = { name: state.name, custom: state.custom, level: state.level, dir: state.dir, length: state.length };
    state = Object.assign(structuredClone(DEFAULT_STATE), keep); save(); render(); toast('Voortgang gewist');
  }
  if (a === 'export') {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `hablo-${today()}.json`; link.click();
  }
  if (a === 'import') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => { try { state = deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(await inp.files[0].text())); invalidateIndex(); save(); render(); toast('Voortgang geïmporteerd'); } catch (err) { toast('Ongeldig bestand'); } };
    inp.click();
  }
});
$('#view').addEventListener('change', (e) => {
  if (e.target.id === 'sound') { state.sound = e.target.checked; save(); sfx.tap(); }
  if (e.target.id === 'autoplay') { state.autoplay = e.target.checked; save(); }
  if (e.target.id === 'name') { state.name = e.target.value.trim() || 'Jerry'; save(); }
});

/* =========================================================
   Sessie
   ========================================================= */
let S = null;

function startLesson(ui, li) {
  const d = getDomain(state.domain);
  startSession({ kind: 'lesson', domain: d.id, ui, li, title: d.units[ui].title, color: d.color, exercises: buildLesson(d, ui, li) });
}
function startSession(opts) {
  S = { ...opts, queue: opts.exercises, initial: opts.exercises.length, doneIds: new Set(), retried: new Set(), graded: new Map(),
    i: 0, correct: 0, answered: 0, mistakes: 0, combo: 0, bestCombo: 0, startLevel: levelInfo().level, checked: false, t0: Date.now() };
  $('#tabbar').classList.add('hidden');
  $('#overlay').innerHTML = `<div class="lesson">
    <div class="lesson-top">
      <button class="close-x" data-l="close" aria-label="Sluiten">✕</button>
      <div class="bar"><i id="lbar" style="width:0;background:${S.color}"></i></div>
      <span class="combo" id="combo"></span>
    </div>
    <div class="stage" id="stage"></div>
    <div class="footer" id="footer"><div class="inner">
      <div class="fb"><div class="fb-title" id="fbt"></div><div class="fb-sol" id="fbs"></div></div>
      <button class="btn" id="mainBtn" disabled>Controleer</button>
    </div></div></div>`;
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
  if (S.combo >= 3) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}
function showExercise() {
  updateBar();
  if (S.i >= S.queue.length) return finishSession();
  const ex = S.queue[S.i];
  S.checked = false; S.answer = null;
  $('#footer').className = 'footer';
  const btn = $('#mainBtn'); btn.className = 'btn'; btn.textContent = 'Controleer'; btn.disabled = true;
  btn.style.display = ex.type === 'match' ? 'none' : '';
  $('#stage').innerHTML = `<div class="ex">${renderEx(ex)}</div>`;
  $('#stage').scrollTop = 0;
  if (state.autoplay) {
    const say = ex.type === 'listen' || (ex.type === 'mc' && ex.dir === 'es-nl') ? ex.it.es : ex.type === 'build' && ex.mode !== 'nl-es' ? ex.s.es : null;
    if (say) setTimeout(() => speak(say), 350);
  }
  if (ex.type === 'type') setTimeout(() => $('#typed') && $('#typed').focus(), 400);
}
function speakBtns(text, slow = true, big = false) {
  return `<button class="speak ${big ? 'big' : ''}" data-say="${esc(text)}" aria-label="Afspelen">${ICON_SPEAK}</button>${slow ? `<button class="speak slow" data-say="${esc(text)}" data-slow="1" aria-label="Langzaam">🐢</button>` : ''}`;
}
const optionsHTML = (ex) => `<div class="options">${ex.options.map((o, i) => `<button class="opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
function renderEx(ex) {
  const it = ex.it;
  if (ex.type === 'mc') {
    if (ex.dir === 'es-nl') {
      const isNew = !rec(ex.item.es);
      return `<div class="ex-type">${isNew ? '✨ Nieuw' : 'Wat betekent dit?'}</div>
        <div class="prompt">${speakBtns(it.es, false)}<div class="bubble">${esc(it.es)}</div></div>
        ${isNew && it.ex ? `<div class="context">“${esc(it.ex)}” <button class="mini-say" data-say="${esc(it.ex)}">🔊</button></div>` : ''}${optionsHTML(ex)}`;
    }
    return `<div class="ex-type">Hoe zeg je dit in het Spaans?</div><div class="prompt"><div class="bubble">${esc(it.nl)}</div></div>${optionsHTML(ex)}`;
  }
  if (ex.type === 'listen') {
    return `<div class="ex-type">Luisteren</div><h2 class="ex-q">Wat hoor je?</h2>
      <div class="row" style="justify-content:center;gap:16px">${speakBtns(it.es, false, true)}<button class="speak slow" data-say="${esc(it.es)}" data-slow="1" style="margin-bottom:28px">🐢</button></div>${optionsHTML(ex)}`;
  }
  if (ex.type === 'build') {
    S.built = [];
    const head = ex.mode === 'listen'
      ? `<div class="ex-type">Luister en bouw</div><h2 class="ex-q">Schrijf wat je hoort</h2><div class="prompt">${speakBtns(ex.s.es)}</div>`
      : ex.mode === 'es-nl'
        ? `<div class="ex-type">Vertaal naar het Nederlands</div><div class="prompt">${speakBtns(ex.s.es, false)}<div class="bubble">${esc(ex.s.es)}</div></div>`
        : `<div class="ex-type">Vertaal naar het Spaans</div><div class="prompt"><div class="bubble">${esc(ex.s.nl)}</div></div>`;
    return head + `<div class="answer-line" id="built"></div><div class="answer-line"></div>
      <div class="bank" id="bank">${ex.bank.map((w, i) => `<button class="tile" data-tile="${i}">${esc(w)}</button>`).join('')}</div>`;
  }
  if (ex.type === 'type') {
    return `<div class="ex-type">Typ in het Spaans</div><div class="prompt"><div class="bubble">${esc(it.nl)}</div></div>
      <input class="type-input" id="typed" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Met lidwoord, bijv. la pista" enterkeyhint="done">
      <div class="accents">${['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'].map((c) => `<button data-acc="${c}">${c}</button>`).join('')}</div>`;
  }
  if (ex.type === 'match') {
    S.match = { left: null, right: null, done: 0, errors: 0 };
    let cells = '';
    for (let i = 0; i < ex.left.length; i++) cells += `<button class="opt" data-side="l" data-v="${esc(ex.left[i])}">${esc(ex.left[i])}</button><button class="opt" data-side="r" data-v="${esc(ex.right[i])}">${esc(ex.right[i])}</button>`;
    return `<div class="ex-type">Koppel de paren</div><h2 class="ex-q">Tik op wat bij elkaar hoort</h2><div class="match">${cells}</div>`;
  }
  return '';
}

/* ---------- Overlay events ---------- */
$('#overlay').addEventListener('click', (e) => {
  const t = e.target;
  // Sheet
  const sh = t.closest('[data-sheet]');
  if (sh) {
    if (sh.dataset.sheet === 'close') closeSheet();
    if (sh.dataset.sheet === 'save') {
      const es = $('#f-es').value.trim(), nl = $('#f-nl').value.trim();
      if (!es || !nl) { toast('Vul Spaans en Nederlands in'); return; }
      if (itemIndex().has(es)) { toast('Dit woord bestaat al'); return; }
      state.custom.push({ es, nl, ex: $('#f-ex').value.trim(), exNl: $('#f-exnl').value.trim() });
      invalidateIndex(); save(); sfx.claim(); closeSheet(); wordsDomain = 'mine'; render(); toast(`“${es}” toegevoegd`);
    }
    return;
  }
  if (!S) { if (t.closest('[data-l="finish"]')) closeSession(); return; }
  const ex = S.queue[S.i];
  if (t.closest('[data-l="close"]')) { if (S.answered === 0 || confirm('Stoppen? Je voortgang in deze sessie gaat verloren.')) closeSession(); return; }
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
    if (tile.parentElement.id === 'bank') { tile.classList.add('ghost'); S.built.push(idx); if (ex.mode !== 'es-nl') speak(ex.bank[idx]); }
    else { S.built = S.built.filter((x) => x !== idx); $(`#bank [data-tile="${idx}"]`).classList.remove('ghost'); }
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
$('#overlay').addEventListener('input', (e) => { if (e.target.id === 'typed') $('#mainBtn').disabled = !e.target.value.trim(); });
$('#overlay').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (S && $('#mainBtn') && !$('#mainBtn').disabled) { e.preventDefault(); onMain(); }
  else if (!S && $('.sheet')) { e.preventDefault(); $('[data-sheet="save"]').click(); }
});

function onMatch(ex, cell) {
  if (cell.classList.contains('right')) return;
  const side = cell.dataset.side;
  $$(`.match [data-side="${side}"]`).forEach((c) => c.classList.remove('sel'));
  cell.classList.add('sel');
  S.match[side === 'l' ? 'left' : 'right'] = cell;
  if (side === 'l') speak(cell.dataset.v); else sfx.tap();
  const { left, right } = S.match;
  if (!left || !right) return;
  const pi = ex.pairs.findIndex((p) => p[0] === left.dataset.v);
  const item = ex.items[pi];
  if (pi >= 0 && ex.pairs[pi][1] === right.dataset.v) {
    sfx.match();
    [left, right].forEach((c) => { c.classList.remove('sel'); c.classList.add('right'); setTimeout(() => c.classList.add('gone'), 350); });
    S.match.done++;
    grade(item, true);
  } else {
    sfx.wrong(); S.match.errors++;
    if (item) grade(item, false);
    [left, right].forEach((c) => { c.classList.remove('sel'); c.classList.add('wrong'); setTimeout(() => c.classList.remove('wrong'), 450); });
  }
  S.match.left = S.match.right = null;
  if (S.match.done === ex.pairs.length) setTimeout(() => result(S.match.errors === 0, ex, S.match.errors ? `${S.match.errors} ${S.match.errors === 1 ? 'fout' : 'fouten'}, maar alles gekoppeld.` : null, true), 450);
}

function onMain() {
  if (!S) return;
  const ex = S.queue[S.i];
  if (S.checked) { S.i++; showExercise(); return; }
  let ok = false, note = null;
  if (ex.type === 'mc' || ex.type === 'listen') {
    ok = norm(S.answer) === norm(ex.answer);
    $$('.opt').forEach((o) => {
      const v = ex.options[+o.dataset.opt];
      if (norm(v) === norm(ex.answer)) o.classList.add('right');
      else if (o.classList.contains('sel')) o.classList.add('wrong');
      else o.classList.add('faded');
    });
  } else if (ex.type === 'build') {
    const got = stripAccents(norm(S.built.map((i) => ex.bank[i]).join(' ')));
    ok = got === stripAccents(norm(ex.correct.join(' ')));
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
  if (ok) { S.correct++; d.correct++; state.totals.correct++; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); S.doneIds.add(ex.id); sfx.correct(); }
  else {
    S.mistakes++; S.combo = 0;
    if (!isMatch && !S.retried.has(ex.id)) { S.retried.add(ex.id); S.queue.push({ ...ex }); } else S.doneIds.add(ex.id);
    sfx.wrong();
  }
  if (isMatch) S.doneIds.add(ex.id); else grade(ex.item, ok);
  save(); updateBar();

  const it = ex.it || {};
  const praise = ['Goed zo!', '¡Perfecto!', '¡Muy bien!', 'Top!', '¡Genial!', '¡Eso es!'];
  $('#footer').className = 'footer ' + (ok ? 'right' : 'wrong');
  $('#fbt').innerHTML = ok ? `✓ ${pick(praise)}` : '✕ Niet helemaal';
  let sol = '';
  if (isMatch) sol = note ? esc(note) : '';
  else {
    if (ex.type === 'build') {
      const target = ex.mode === 'es-nl' ? ex.s.nl : ex.s.es;
      sol = ok ? `<span class="muted">${esc(ex.mode === 'es-nl' ? ex.s.es : ex.s.nl)}</span>` : `Juist: <b>${esc(target)}</b><br><span class="muted">${esc(ex.mode === 'es-nl' ? ex.s.es : ex.s.nl)}</span>`;
    } else {
      if (!ok) sol = `Juist: <b>${esc(it.es)}</b> = ${esc(it.nl)}`;
      else if (note) sol = `${esc(note)}: <b>${esc(it.es)}</b>`;
      else sol = `<b>${esc(it.es)}</b> = ${esc(it.nl)}`;
      if (!ok && note) sol = `${esc(note)}. ${sol}`;
      if (it.ex) sol += `<div class="fb-ex"><button class="mini-say" data-say="${esc(it.ex)}">🔊</button> ${esc(it.ex)}<br><span class="muted">${esc(it.exNl || '')}</span></div>`;
    }
    if (ex.item.tip) sol += `<div class="wtip">💡 ${esc(ex.item.tip)}</div>`;
  }
  $('#fbs').innerHTML = sol;
  const btn = $('#mainBtn');
  btn.style.display = ''; btn.disabled = false;
  btn.className = 'btn ' + (ok ? 'green' : 'red'); btn.textContent = 'Doorgaan';
  if (!isMatch && (ex.type !== 'mc' || !ok || ex.dir === 'nl-es')) speak(ex.type === 'build' ? ex.s.es : it.es);
}

function finishSession() {
  const d = todayStats();
  const perfect = S.mistakes === 0;
  const accuracy = Math.round((S.correct / Math.max(1, S.answered)) * 100);
  const firstToday = d.lessons === 0;
  let xp = 10 + S.correct + (perfect ? 5 : 0) + Math.floor(S.bestCombo / 5) * 2 + (S.kind === 'review' ? 5 : 0);
  state.xp += xp; d.xp += xp;
  d.lessons++; state.totals.lessons++;
  if (perfect) { d.perfect++; state.totals.perfect++; }
  d.bestCombo = Math.max(d.bestCombo, S.bestCombo);
  state.totals.bestCombo = Math.max(state.totals.bestCombo, S.bestCombo);
  if (S.kind === 'review') { d.reviews++; state.totals.reviews++; }
  let unitDone = false, unitTitle = '';
  if (S.kind === 'lesson') {
    const u = getDomain(S.domain).units[S.ui];
    state.progress[u.id] = Math.max(state.progress[u.id] || 0, S.li + 1);
    unitDone = S.li === LESSONS_PER_UNIT - 1; unitTitle = u.title;
  }
  if (firstToday) {
    if (state.streak.last === yesterday()) state.streak.count++;
    else if (state.streak.last !== today()) state.streak.count = 1;
    state.streak.last = today();
  }
  const badges = checkBadges();
  const L = levelInfo();
  const leveled = L.level > S.startLevel;
  save();

  const secs = Math.round((Date.now() - S.t0) / 1000);
  const time = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${secs}s`;
  const emoji = unitDone ? '🏆' : perfect ? '💎' : accuracy >= 80 ? '🎉' : '💪';
  const title = unitDone ? '¡Misión cumplida!' : perfect ? '¡Perfecto!' : accuracy >= 80 ? '¡Muy bien!' : '¡Sigue así!';
  const sub = unitDone ? `Missie “${esc(unitTitle)}” voltooid` : perfect ? 'Foutloos. Sterk.' : 'Fouten komen vaker terug in je herhaling.';
  const goalHit = d.xp >= state.dailyGoal && d.xp - xp < state.dailyGoal;
  const card = (txt) => `<div class="card" style="margin-bottom:12px;font-size:15px;font-weight:700">${txt}</div>`;

  $('#combo').textContent = '';
  $('#lbar').style.width = '100%';
  $('#stage').innerHTML = `<div class="result">
    <div class="big-emoji">${emoji}</div><h2>${title}</h2><p class="muted">${sub}</p>
    <div class="stats-row">
      <div class="stat"><div class="v" style="color:var(--orange)">+${xp}</div><div class="k">XP</div></div>
      <div class="stat"><div class="v" style="color:var(--green)">${accuracy}%</div><div class="k">Score</div></div>
      <div class="stat"><div class="v" style="color:var(--accent)">${time}</div><div class="k">Tijd</div></div>
    </div>
    ${leveled ? card(`🎖️ Level ${L.level} bereikt: ${L.name}`) : ''}
    ${goalHit ? card(`🎯 Dagdoel gehaald · 🔥 ${state.streak.count} ${state.streak.count === 1 ? 'dag' : 'dagen'}`) : ''}
    ${badges.map((b) => card(`${b.e} Nieuwe prestatie: ${b.n}`)).join('')}
    ${S.bestCombo >= 5 ? `<p class="muted small">Beste combo: 🔥 ${S.bestCombo}</p>` : ''}
  </div>`;
  $('#footer').className = 'footer';
  const btn = $('#mainBtn'); btn.style.display = ''; btn.disabled = false; btn.className = 'btn'; btn.textContent = 'Doorgaan'; btn.dataset.l = 'finish';
  S = null;
  sfx.complete(); confetti();
  if (leveled) setTimeout(() => sfx.levelup(), 900);
}

/* ---------- Boot ---------- */
document.addEventListener('pointerdown', () => audio(), { once: true });
render.scrollTo = false;
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

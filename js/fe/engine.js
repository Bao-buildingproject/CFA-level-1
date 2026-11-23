// ============================================================
// fe/engine.js — Financial English flashcards: the logic, without any page code.
// Decks (12 topics) are registered by the data files in js/fe/data/ (one file per topic).
// Progress lives in the account (DATA.fe) and is checked and repaired here before use:
//   { v: 1,
//     marks: { cardId: "k" (I know) | "r" (study again) },
//     decks: { topicId: { pos, order: [card index…] | null, mode: "all" | "review", list: [cardId…] | null } },
//     quiz:  { topicId: { best, last, n, date } },          // scores as a share of correct answers (0–1)
//     runs:  { topicId: { deck, qs: [question…], i, picks: [index | null…], seed } },  // the current quiz of each topic
//     last:  topicId | null }                                // the topic studied most recently
// Works in the browser (window.FinEng) and in Node (module.exports) for the tests.
// ============================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FinEng = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOPICS = [
    { id: "fund", name: "Financial Fundamentals", vi: "Nền tảng tài chính" },
    { id: "fs", name: "Financial Statements", vi: "Báo cáo tài chính" },
    { id: "cf", name: "Corporate Finance", vi: "Tài chính doanh nghiệp" },
    { id: "eq", name: "Equity Investments", vi: "Đầu tư cổ phiếu" },
    { id: "fi", name: "Fixed Income", vi: "Trái phiếu và thu nhập cố định" },
    { id: "der", name: "Derivatives", vi: "Công cụ phái sinh" },
    { id: "pm", name: "Portfolio Management", vi: "Quản lý danh mục đầu tư" },
    { id: "eco", name: "Economics", vi: "Kinh tế học" },
    { id: "bank", name: "Banking", vi: "Ngân hàng" },
    { id: "qm", name: "Quantitative Methods", vi: "Phương pháp định lượng" },
    { id: "risk", name: "Risk Management", vi: "Quản trị rủi ro" },
    { id: "acad", name: "Academic Financial English", vi: "Tiếng Anh tài chính học thuật" }
  ];
  const TYPES = ["vocabulary", "definition", "vi-en", "mcq"];
  const TYPE_LABEL = { vocabulary: "Vocabulary", definition: "Definition", "vi-en": "Vietnamese → English", mcq: "Multiple choice" };
  const LEVELS = ["Beginner", "Intermediate", "Advanced"];
  const LETTERS = ["A", "B", "C", "D"];
  const QUIZ_SIZE = 10;

  // ---------- helpers ----------
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) {   // mulberry32: the same seed gives the same sequence (tests, resumable quizzes)
    let a = (typeof seed === "number" ? seed : hashStr(String(seed))) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function permute(list, rndOrSeed) {   // Fisher–Yates on a copy
    const rnd = typeof rndOrSeed === "function" ? rndOrSeed : rng(rndOrSeed == null ? 1 : rndOrSeed);
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  const baseTerm = t => norm(String(t || "").replace(/\s*\([^)]*\)\s*/g, " "));   // "Return on Equity (ROE)" → "return on equity"
  function isPermutation(order, n) {
    if (!Array.isArray(order) || order.length !== n) return false;
    const seen = new Set();
    for (const x of order) { if (!Number.isInteger(x) || x < 0 || x >= n || seen.has(x)) return false; seen.add(x); }
    return true;
  }
  const topicById = id => TOPICS.find(t => t.id === id) || null;

  // ---------- card checks ----------
  const REQUIRED = {
    vocabulary: ["term", "ipa", "vietnamese", "definition", "explanation", "example", "cfaApplication"],
    definition: ["term", "vietnamese", "question", "definition", "formula", "explanation"],
    "vi-en": ["vietnamese", "term", "ipa", "definition", "explanation", "example"],
    mcq: ["question", "explanationEn", "explanationVi"]
  };
  function validateCard(c) {
    if (!c || typeof c !== "object" || Array.isArray(c)) return ["not a card object"];
    const p = [], str = k => typeof c[k] === "string" && c[k].trim().length > 0;
    if (!str("id")) p.push("missing id");
    if (!TYPES.includes(c.type)) p.push("unknown type");
    if (!LEVELS.includes(c.difficulty)) p.push("difficulty must be Beginner, Intermediate or Advanced");
    (REQUIRED[c.type] || []).forEach(k => { if (!str(k)) p.push("missing " + k); });
    if (c.ipa !== undefined && !(typeof c.ipa === "string" && /^\/[^/]+\/$/.test(c.ipa.trim()))) p.push("ipa must look like /…/");
    if (c.relatedTerms !== undefined && !(Array.isArray(c.relatedTerms) && c.relatedTerms.every(x => typeof x === "string" && x.trim()))) p.push("relatedTerms must be a list of words");
    if (c.type === "vocabulary" && !(Array.isArray(c.relatedTerms) && c.relatedTerms.length)) p.push("missing relatedTerms");
    if (c.type === "mcq") {
      if (!Array.isArray(c.options) || c.options.length !== 4 || !c.options.every(o => typeof o === "string" && o.trim())) p.push("options must be 4 answers");
      else if (new Set(c.options.map(norm)).size !== 4) p.push("the 4 options must differ");
      if (!LETTERS.includes(c.correctAnswer)) p.push("correctAnswer must be A, B, C or D");
    }
    return p;
  }

  // ---------- decks (filled by js/fe/data/*.js) ----------
  const decks = {};
  function register(id, raw) {
    const topic = topicById(id), out = { id, cards: [], errors: [] };
    decks[id] = out;
    if (!topic) { out.errors.push(`Unknown topic "${id}"`); return out; }
    if (!Array.isArray(raw)) { out.errors.push("The deck is not a list of cards"); return out; }
    const ids = new Set(), list = [];
    raw.forEach((c, i) => {
      const p = validateCard(c);
      if (!p.length && ids.has(c.id)) p.push("duplicate id");
      if (p.length) { out.errors.push(`${(c && c.id) || "card " + (i + 1)}: ${p.join("; ")}`); return; }
      ids.add(c.id);
      list.push([Object.freeze({ ...c, topic: id, module: topic.name }), i]);
    });
    // study order: beginner → advanced, and the file's order within each level
    out.cards = list.sort((a, b) => LEVELS.indexOf(a[0].difficulty) - LEVELS.indexOf(b[0].difficulty) || a[1] - b[1]).map(x => x[0]);
    return out;
  }
  const deck = id => decks[id] || null;
  const allCards = () => TOPICS.flatMap(t => (decks[t.id] ? decks[t.id].cards : []));
  function forget(id) { delete decks[id]; }

  // ---------- saved progress ----------
  function blankState() { return { v: 1, marks: {}, decks: {}, quiz: {}, runs: {}, last: null }; }
  const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);
  // keep what is valid, drop what is not; repaired = true when something had to be dropped
  function repairState(raw) {
    if (raw === undefined || raw === null) return { state: blankState(), repaired: false };
    if (!isObj(raw)) return { state: blankState(), repaired: true };
    const s = blankState(); let repaired = false;
    if (raw.marks !== undefined) {
      if (!isObj(raw.marks)) repaired = true;
      else Object.entries(raw.marks).forEach(([k, v]) => { if (v === "k" || v === "r") s.marks[k] = v; else repaired = true; });
    }
    if (raw.decks !== undefined) {
      if (!isObj(raw.decks)) repaired = true;
      else Object.entries(raw.decks).forEach(([k, d]) => {
        if (!topicById(k) || !isObj(d)) { repaired = true; return; }
        const ds = { pos: Number.isInteger(d.pos) && d.pos >= 0 ? d.pos : 0, order: Array.isArray(d.order) ? d.order.slice() : null,
          mode: d.mode === "review" ? "review" : "all", list: Array.isArray(d.list) ? d.list.filter(x => typeof x === "string") : null };
        if (ds.pos !== d.pos || (d.order != null && !Array.isArray(d.order)) || (d.mode != null && d.mode !== ds.mode)) repaired = true;
        s.decks[k] = ds;
      });
    }
    if (raw.quiz !== undefined) {
      if (!isObj(raw.quiz)) repaired = true;
      else Object.entries(raw.quiz).forEach(([k, q]) => {
        const ok = topicById(k) && isObj(q) && typeof q.best === "number" && q.best >= 0 && q.best <= 1;
        if (ok) s.quiz[k] = { best: q.best, last: typeof q.last === "number" ? q.last : q.best, n: Number.isInteger(q.n) ? q.n : 0, date: typeof q.date === "string" ? q.date : "" };
        else repaired = true;
      });
    }
    if (raw.runs !== undefined) {   // each run is checked against its deck by validRun when it is opened
      if (!isObj(raw.runs)) repaired = true;
      else Object.entries(raw.runs).forEach(([k, r]) => { if (topicById(k) && isObj(r)) s.runs[k] = r; else repaired = true; });
    }
    if (raw.last != null) { if (topicById(raw.last)) s.last = raw.last; else repaired = true; }
    return { state: s, repaired };
  }
  function deckState(state, id) { return state.decks[id] || (state.decks[id] = { pos: 0, order: null, mode: "all", list: null }); }
  // make a deck's saved place consistent with its cards (cards can be added later); true when something changed
  function sanitize(ds, cards) {
    let fixed = false;
    if (ds.order != null && !isPermutation(ds.order, cards.length)) { ds.order = null; ds.pos = 0; fixed = true; }
    if (ds.mode === "review") {
      const have = new Set(cards.map(c => c.id)), list = (ds.list || []).filter(x => have.has(x));
      if (!list.length) { ds.mode = "all"; ds.list = null; ds.pos = 0; fixed = true; }
      else if (list.length !== ds.list.length) { ds.list = list; fixed = true; }
    } else if (ds.list != null) { ds.list = null; fixed = true; }
    const len = sequence(ds, cards).length;
    if (!Number.isInteger(ds.pos) || ds.pos < 0 || ds.pos > len) { ds.pos = 0; fixed = true; }
    return fixed;
  }
  // the cards in study order (all cards, or only the ones to review)
  function sequence(ds, cards) {
    if (ds.mode === "review" && ds.list) { const byId = new Map(cards.map(c => [c.id, c])); return ds.list.map(id => byId.get(id)).filter(Boolean); }
    const order = isPermutation(ds.order, cards.length) ? ds.order : cards.map((_, i) => i);
    return order.map(i => cards[i]);
  }
  function shuffleDeck(ds, cards, seed) {
    if (ds.mode === "review" && ds.list) ds.list = permute(ds.list, seed);
    else ds.order = permute(cards.map((_, i) => i), seed);
    ds.pos = 0;
  }
  function restart(ds) { ds.mode = "all"; ds.list = null; ds.order = null; ds.pos = 0; }
  const reviewIds = (state, cards) => cards.filter(c => state.marks[c.id] === "r").map(c => c.id);
  function startReview(ds, state, cards) {
    const ids = reviewIds(state, cards);
    if (!ids.length) return false;
    ds.mode = "review"; ds.list = ids; ds.pos = 0;
    return true;
  }
  function mark(state, id, v) { if (v === "k" || v === "r") state.marks[id] = v; else delete state.marks[id]; }
  function counts(state, cards) {
    let known = 0, review = 0;
    cards.forEach(c => { const m = state.marks[c.id]; if (m === "k") known++; else if (m === "r") review++; });
    return { total: cards.length, known, review, fresh: cards.length - known - review };
  }
  function resetDeck(state, id, cards) {
    cards.forEach(c => { delete state.marks[c.id]; });
    delete state.decks[id]; delete state.quiz[id]; delete state.runs[id];
  }

  // ---------- quiz ----------
  // Questions: the deck's own multiple-choice cards (options shuffled) plus questions made from its terms:
  //   def: definition → which term;  vi: term → Vietnamese meaning;  en: Vietnamese → which English term.
  // A question stores card ids only, so a quiz in progress survives a reload.
  //   { k: "mcq" | "def" | "vi" | "en", c: cardId, o: [4 option keys], ans: index of the right option }
  //   option keys: for "mcq" the card's own option indexes (0–3); otherwise card ids.
  const termField = k => (k === "vi" ? "vietnamese" : "term");
  function buildQuiz(cards, opts) {
    opts = opts || {};
    const n = opts.n || QUIZ_SIZE, rnd = rng(opts.seed == null ? 1 : opts.seed);
    const mcqs = permute(cards.filter(c => c.type === "mcq"), rnd);
    const termCards = cards.filter(c => c.type !== "mcq" && c.term && c.definition && c.vietnamese);
    const nM = Math.min(mcqs.length, Math.round(n * 0.4));
    const qs = mcqs.slice(0, nM).map(c => { const o = permute([0, 1, 2, 3], rnd); return { k: "mcq", c: c.id, o, ans: o.indexOf(LETTERS.indexOf(c.correctAnswer)) }; });
    const kinds = permute(["def", "vi", "en"], rnd);
    let i = 0;
    for (const c of permute(termCards, rnd)) {
      if (qs.length >= n) break;
      const k = kinds[i++ % 3], f = termField(k), used = new Set([norm(c[f])]), distract = [];
      for (const x of permute(termCards, rnd)) {
        if (x.id === c.id || used.has(norm(x[f]))) continue;
        used.add(norm(x[f])); distract.push(x.id);
        if (distract.length === 3) break;
      }
      if (distract.length < 3) continue;
      const o = permute([c.id, ...distract], rnd);
      qs.push({ k, c: c.id, o, ans: o.indexOf(c.id) });
    }
    // fill with the remaining multiple-choice cards if the deck had too few terms
    for (const c of mcqs.slice(nM)) { if (qs.length >= n) break; const o = permute([0, 1, 2, 3], rnd); qs.push({ k: "mcq", c: c.id, o, ans: o.indexOf(LETTERS.indexOf(c.correctAnswer)) }); }
    return permute(qs, rnd);
  }
  // the text of a question for the page
  function questionView(q, cards) {
    const byId = new Map(cards.map(c => [c.id, c])), c = byId.get(q.c);
    if (!c) return null;
    let prompt, sub = "", options, explainEn, explainVi;
    if (q.k === "mcq") {
      prompt = c.question; options = q.o.map(j => c.options[j]);
      explainEn = c.explanationEn; explainVi = c.explanationVi;
    } else {
      const f = termField(q.k), opt = q.o.map(id => byId.get(id));
      if (opt.some(x => !x)) return null;
      options = opt.map(x => x[f]);
      if (q.k === "def") { prompt = "Which term matches this definition?"; sub = c.definition; }
      else if (q.k === "vi") { prompt = `What is the Vietnamese meaning of “${c.term}”?`; }
      else { prompt = `Which English term means “${c.vietnamese}”?`; }
      explainEn = `${c.term}: ${c.definition}`;
      explainVi = `${c.term} – ${c.vietnamese}. ${c.explanation}`;
    }
    return { prompt, sub, options, ans: q.ans, explainEn, explainVi, card: c, kind: q.k };
  }
  function validQuestion(q, byId) {
    if (!isObj(q) || !["mcq", "def", "vi", "en"].includes(q.k) || !Array.isArray(q.o) || q.o.length !== 4 || !Number.isInteger(q.ans) || q.ans < 0 || q.ans > 3) return false;
    const c = byId.get(q.c); if (!c) return false;
    if (q.k === "mcq") return c.type === "mcq" && isPermutation(q.o, 4) && q.o[q.ans] === LETTERS.indexOf(c.correctAnswer);
    return c.type !== "mcq" && q.o[q.ans] === c.id && q.o.every(id => byId.has(id)) && new Set(q.o).size === 4;
  }
  // a saved quiz is used only if every question still matches the deck
  function validRun(run, deckId, cards) {
    if (!isObj(run) || run.deck !== deckId || !Array.isArray(run.qs) || !run.qs.length || !Array.isArray(run.picks)) return false;
    const byId = new Map(cards.map(c => [c.id, c]));
    if (!run.qs.every(q => validQuestion(q, byId))) return false;
    if (!Number.isInteger(run.i) || run.i < 0 || run.i > run.qs.length) return false;
    return run.picks.length <= run.qs.length && run.picks.every(p => p === null || (Number.isInteger(p) && p >= 0 && p <= 3));
  }
  function newRun(deckId, cards, seed, n) { return { deck: deckId, qs: buildQuiz(cards, { seed, n }), i: 0, picks: [], seed }; }
  function scoreRun(run) {
    let right = 0; const wrong = [];
    run.qs.forEach((q, i) => { if (run.picks[i] === q.ans) right++; else wrong.push(i); });
    return { right, total: run.qs.length, wrong, share: run.qs.length ? right / run.qs.length : 0 };
  }
  function recordQuiz(state, deckId, res, date) {
    const prev = state.quiz[deckId];
    state.quiz[deckId] = { best: Math.max(prev ? prev.best : 0, res.share), last: res.share, n: res.total, date: date || "" };
  }

  return { TOPICS, TYPES, TYPE_LABEL, LEVELS, LETTERS, QUIZ_SIZE, hashStr, rng, permute, norm, baseTerm, isPermutation, topicById,
    validateCard, register, deck, allCards, forget, blankState, repairState, deckState, sanitize, sequence, shuffleDeck, restart,
    reviewIds, startReview, mark, counts, resetDeck, buildQuiz, questionView, validRun, newRun, scoreRun, recordQuiz };
});

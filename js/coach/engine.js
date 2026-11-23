// ============================================================
// coach/engine.js — Hoa Tiêu (CFA Compass) v2: the deterministic learning engine.
// No DOM, no storage, no network: every function takes data and returns data, so all of it is tested
// (tests/coach.test.js). The UI (coach/ui.js) only shows what this file decides.
//
//   question selection (diagnostics, confirmation, module checks, topic tests, 180-question mocks, practice)
//   exam / practice sessions (clock, per-question time, no answer key inside the session)
//   analysis (topic → module → skill, difficulty weights, uncertainty, error classes, trends, calibration)
//   knowledge and priority per module · study plan generator · replanning · spaced repetition
//   completion rules · readiness index · recommendations · remediation · calendar / CSV export
//
// Scores, priorities and plans come from the rules and statistics below. An LLM (the site's CFA Tutor)
// only explains them. Every weight and threshold is a heuristic set in CONFIG; none is validated by
// CFA Institute.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CoachEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CONFIG = {
    bands: { strong: 0.80, developing: 0.65, needs: 0.50 },          // accuracy thresholds (adjustable)
    diffWeight: { 1: 0.8, 2: 1.0, 3: 1.3 },                          // a hard question counts more than an easy one
    evidence: { insufficient: 4, low: 8, medium: 15 },               // questions needed for each confidence level
    selfPrior: { 1: 0.30, 2: 0.42, 3: 0.52, 4: 0.62, 5: 0.70 },     // self-rating 1–5 → weak prior (never above 0.70)
    statusPrior: { none: 0.05, partial: 0.30, unclear: 0.55, solid: 0.80, confident: 0.88 },
    priorWeight: 2,                                                  // the prior counts like 2 questions (topic display)
    shrink: { topic: 3, module: 3 },                                 // knowledge: module answers shrink toward the topic, the topic toward the self-assessment
    qbWeight: 0.6,                                                   // a Question Bank mark is the latest mark (may be a redo): 0.6 of a question
    priority: { gap: 0.30, exam: 0.25, forget: 0.20, prereq: 0.15, urgency: 0.10 },
    recommendedHours: 300,                                           // typical total study time for Level I (assumption)
    learnShare: 0.5,                                                 // share of those hours for first learning
    moduleMinutes: { min: 40, max: 240 },
    learnedAt: 0.8,                                                  // knowledge from which a module needs no first learning
    chunkMinutes: 60,                                                // a learning block is at most this long (and at most one session)
    minutesPerQuestion: 1.5,
    practiceBase: 12,                                                // questions per module practice round at an average gap
    miniPractice: 8,                                                 // questions right after learning a module
    topicTest: 15,
    reviewQuestions: 5, reviewMinutes: 10, reviewCap: 0.20,           // spaced reviews take at most a fifth of a day
    depth: { min: 0.75, max: 1.4 },                                  // learning time scales with the time available (within these bounds)
    intervals: [1, 3, 7, 14, 30],                                    // spaced repetition gaps, in days
    mock: { sessionQuestions: 90, sessionMinutes: 135, analysisMinutes: 60 },
    bufferShare: 0.10,                                               // a weekly catch-up slot
    maintainShare: 0.5,                                              // every topic gets at least half of its exam-weight share of the work
    lightDayMinutes: 60,                                             // the day before the exam
    diagMix: { 1: 0.30, 2: 0.45, 3: 0.25 },
    mockMix: { 1: 0.25, 2: 0.50, 3: 0.25 }
  };

  // Modules other topics lean on (0–1). A heuristic, listed here so it can be reviewed and edited.
  const PREREQ = { "QM-04": 1, "QM-05": 0.8, "QM-01": 0.7, "QM-02": 0.7, "QM-06": 0.6, "QM-03": 0.5, "FSA-03": 0.7, "FSA-02": 0.6, "FSA-01": 0.5,
    "FI-06": 0.8, "FI-01": 0.6, "FI-07": 0.6, "PM-01": 0.7, "PM-02": 0.6, "DER-01": 0.5, "DER-05": 0.6, "CI-05": 0.5, "ETH-02": 0.6, "ECO-01": 0.4 };
  // a foundation module to check first when a topic is weak
  const PRE_MODULE = { FI: "QM-04", DER: "QM-04", EQ: "QM-04", CI: "QM-04", PM: "QM-05", FSA: "FSA-03", ALT: "QM-04" };
  // topics learned before the topics that use them, when both still need learning
  const TOPIC_BEFORE = { QM: ["FI", "DER", "PM", "EQ", "CI"], FSA: ["EQ", "CI"] };

  const KINDS = {
    quick45: { n: 30, minutes: 45, mode: "exam", label: "Chẩn đoán nhanh 45 phút" },
    full90: { n: 60, minutes: 90, mode: "exam", label: "Chẩn đoán toàn diện 90 phút" },
    confirm: { n: 10, minutes: 15, mode: "exam", label: "Kiểm tra xác nhận thành thạo" },
    check: { n: 5, minutes: 8, mode: "exam", label: "Kiểm tra nhanh module" },
    test: { n: 15, minutes: 25, mode: "exam", label: "Kiểm tra cuối topic" },
    mock: { n: 90, minutes: 135, mode: "exam", label: "Thi thử" },
    practice: { n: 10, minutes: null, mode: "practice", label: "Luyện tập" },
    review: { n: 5, minutes: null, mode: "practice", label: "Ôn ngắt quãng" },
    mistakes: { n: 10, minutes: null, mode: "practice", label: "Ôn lỗi sai" }
  };
  const DIAG_KINDS = ["quick45", "full90"];
  const SRC = { quick45: "q", full90: "f", confirm: "c", check: "k", test: "t", mock: "m", practice: "p", review: "r", mistakes: "e", site: "s", qb: "b" };
  const SRC_KIND = Object.fromEntries(Object.entries(SRC).map(([k, v]) => [v, k]));

  // ---------- small helpers ----------
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round = (x, d) => { const k = Math.pow(10, d || 0); return Math.round(x * k) / k; };
  const r5 = x => Math.round(x / 5) * 5;
  const vn = x => String(x).replace(".", ",");                       // 1.5 → "1,5" in Vietnamese text
  const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(String(seed)) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Dates are "YYYY-MM-DD" strings in the learner's own calendar. Day arithmetic uses UTC midnights,
  // so daylight saving and the viewer's time zone never shift a day.
  const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const fromDayNum = n => new Date(n * 86400000).toISOString().slice(0, 10);
  const addDays = (s, n) => fromDayNum(dayNum(s) + n);
  const daysBetween = (a, b) => dayNum(b) - dayNum(a);
  const weekday = s => new Date(dayNum(s) * 86400000).getUTCDay();   // 0 = Sunday
  const validDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromDayNum(dayNum(s)) === s;
  const isoWeek = s => { const n = dayNum(s), wd = (weekday(s) + 6) % 7; return n - wd; };        // Monday of the week (day number)

  // ---------- weights ----------
  // "11–14%" → 12.5, then normalised to shares that sum to 1
  function weightsFromTopics(topics) {
    const raw = {}; let total = 0;
    topics.forEach(t => { const m = String(t.weight).match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/); const v = m ? (+m[1] + +m[2]) / 2 : 10; raw[t.id] = v; total += v; });
    const out = {}; Object.keys(raw).forEach(k => { out[k] = raw[k] / total; });
    return out;
  }

  // ---------- question pool ----------
  // pool item: { id, topic, module, skill, diff 1|2|3, est (seconds), isCalc, src, trap (letter of the typical-mistake answer or null) }
  function normalizePool(rows) {
    const LV = { foundation: 1, application: 2, exam: 3, challenge: 3 };
    return rows.map(q => {
      const diff = q.diff || LV[q.level] || 2;
      const los = q.los && !/^Vol \d+ LM \d+$/.test(q.los) ? q.los : null;      // "Vol 1 LM 2" names the module, not a skill
      return { id: q.id, topic: q.topic, module: q.module || q.chapter || null, skill: q.skill || los || q.module || q.chapter || q.topic,
        diff, est: q.est || ({ 1: 60, 2: 90, 3: 130 })[diff], isCalc: !!(q.isCalc || q.calc), src: q.src || "bank", trap: q.trapKey || null };
    });
  }

  // allocate `total` items across topics in proportion to weights (largest remainder), at least `minEach`
  // wherever the pool has enough, never more than the pool supplies
  function allocate(total, weights, supply, minEach) {
    const ids = Object.keys(weights).filter(t => (supply[t] || 0) > 0);
    const out = {}; ids.forEach(t => { out[t] = Math.min(supply[t], minEach); });
    let used = sum(ids, t => out[t]);
    if (used > total) {
      ids.slice().sort((a, b) => weights[b] - weights[a]).slice(total).forEach(t => { out[t] = 0; });
      used = sum(ids, t => out[t]);
    }
    const quota = {}; ids.forEach(t => { quota[t] = weights[t] * total; });
    let left = total - used;
    while (left > 0) {
      const open = ids.filter(t => out[t] < supply[t]);
      if (!open.length) break;
      open.sort((a, b) => (quota[b] - out[b]) - (quota[a] - out[a]));
      out[open[0]]++; left--;
    }
    return out;
  }

  // Build the list of question ids for an assessment or practice set. Deterministic for a given seed.
  // opts: { seed, seen, weights, topic, module, modules, ids, n, mix }
  function buildAssessment(pool, kind, opts) {
    opts = opts || {};
    const K = KINDS[kind]; if (!K) throw new Error("Unknown assessment kind: " + kind);
    const r = rng((opts.seed || "seed") + "|" + kind);
    const seen = new Set(opts.seen || []);
    const total = opts.n || K.n;
    let items = pool;
    if (opts.ids) { const s = new Set(opts.ids); items = items.filter(q => s.has(q.id)); }
    if (opts.topic) items = items.filter(q => q.topic === opts.topic);
    if (opts.modules) { const s = new Set(opts.modules); items = items.filter(q => s.has(q.module)); }
    else if (opts.module) items = items.filter(q => q.module === opts.module);
    const scoped = !!(opts.topic || opts.module || opts.modules || opts.ids);
    const weights = {};
    if (scoped) items.forEach(q => { weights[q.topic] = (weights[q.topic] || 0) + 1; });
    else Object.assign(weights, opts.weights || {});
    const supply = {}; Object.keys(weights).forEach(t => { supply[t] = items.filter(q => q.topic === t).length; });
    const alloc = allocate(total, weights, supply, scoped ? 0 : DIAG_KINDS.includes(kind) ? 2 : kind === "mock" ? 1 : 0);
    const mix = opts.mix || (kind === "mock" ? CONFIG.mockMix : CONFIG.diagMix);
    const picked = [];
    for (const t of Object.keys(alloc)) {
      const need = alloc[t]; if (!need) continue;
      const cand = items.filter(q => q.topic === t);
      const fresh = cand.filter(q => !seen.has(q.id)), reuse = cand.filter(q => seen.has(q.id));
      const want = { 1: Math.round(need * mix[1]), 2: Math.round(need * mix[2]) }; want[3] = Math.max(0, need - want[1] - want[2]);
      const modCount = {}, chosen = [], chosenSet = new Set();
      const take = (list, d, n) => {
        // spread over modules (least used first) and alternate calculation and concept questions
        const pl = shuffle(list.filter(q => (d == null || q.diff === d) && !chosenSet.has(q.id)), r);
        for (let i = 0; i < n && pl.length; i++) {
          const wantCalc = chosen.filter(q => q.isCalc).length < (chosen.length + 1) / 2;
          pl.sort((a, b) => ((modCount[a.module] || 0) - (modCount[b.module] || 0)) || ((b.isCalc === wantCalc) - (a.isCalc === wantCalc)));
          const q = pl.shift(); chosen.push(q); chosenSet.add(q.id); modCount[q.module] = (modCount[q.module] || 0) + 1;
        }
      };
      [1, 2, 3].forEach(d => take(fresh, d, want[d]));
      for (const list of [fresh, reuse]) for (const d of [2, 1, 3]) { if (chosen.length >= need) break; take(list, d, need - chosen.length); }
      picked.push(...chosen);
    }
    return shuffle(picked, r).map(q => q.id);          // topics and difficulties mixed together
  }

  // A full mock: 180 questions by topic weight, in two sessions of 90 (135 minutes each).
  // Questions are grouped by topic in the site's topic order; the split between the two sessions is the
  // website's simulation, not a claim about how the real exam orders topics.
  function buildMock(pool, opts) {
    opts = opts || {};
    const total = 2 * CONFIG.mock.sessionQuestions, weights = opts.weights || {};
    const order = opts.order || Object.keys(weights);
    const supply = {}; order.forEach(t => { supply[t] = pool.filter(q => q.topic === t).length; });
    const alloc = allocate(total, weights, supply, 1);
    const all = [];
    order.forEach(t => { if (alloc[t]) all.push(...buildAssessment(pool, "mock", { seed: (opts.seed || "seed") + "|" + t, topic: t, n: alloc[t], seen: opts.seen, mix: CONFIG.mockMix })); });
    return { parts: [all.slice(0, CONFIG.mock.sessionQuestions), all.slice(CONFIG.mock.sessionQuestions)], alloc };
  }

  // ---------- sessions (exam and practice) ----------
  // A session never holds the answer key: ids, the learner's picks, flags, time per question and the clock.
  // exam mode: timed, no feedback until submitted. practice mode: untimed, the answer is shown after each pick
  // and can no longer be changed.
  function newSession(kind, ids, o) {
    o = o || {};
    const K = KINDS[kind]; if (!K) throw new Error("Unknown session kind: " + kind);
    const minutes = o.minutes !== undefined ? o.minutes : K.minutes;
    return { id: o.id || "s" + hash(kind + ids.join(",") + (o.salt || "")).toString(36), kind, mode: K.mode, ids: ids.slice(), answers: {}, flags: {}, secs: {}, current: 0,
      limitSec: K.mode === "exam" && minutes ? minutes * 60 : null, startedAt: null, shownAt: null, submittedAt: null, expired: false,
      target: o.target || null, task: o.task || null, mock: o.mock || null, part: o.part || null };
  }
  function startSession(s, now) { if (s.startedAt == null) { s.startedAt = now; s.shownAt = now; } return s; }
  const elapsedSec = (s, now) => s.startedAt != null ? Math.floor((now - s.startedAt) / 1000) : 0;
  function remainingSec(s, now) { if (s.submittedAt != null) return 0; if (!s.limitSec) return Infinity; return Math.max(0, s.limitSec - elapsedSec(s, now)); }
  const isOpen = (s, now) => s.startedAt != null && s.submittedAt == null && remainingSec(s, now) > 0;
  const MAX_VISIT = 600;          // an idle tab does not count as more than 10 minutes on one question
  function tick(s, now) {
    if (s.startedAt == null || s.submittedAt != null || s.shownAt == null) return;
    const id = s.ids[s.current], d = clamp(Math.round((now - s.shownAt) / 1000), 0, MAX_VISIT);
    if (id && !(s.mode === "practice" && s.answers[id])) s.secs[id] = (s.secs[id] || 0) + d;
    s.shownAt = now;
  }
  function visit(s, i, now) { if (!isOpen(s, now)) return false; tick(s, now); s.current = clamp(i, 0, s.ids.length - 1); return true; }
  function answer(s, qid, choice, now) {
    if (s.submittedAt != null) return { ok: false, reason: "submitted" };
    if (s.startedAt == null) return { ok: false, reason: "not-started" };
    if (remainingSec(s, now) <= 0) { s.expired = true; return { ok: false, reason: "expired" }; }
    if (!s.ids.includes(qid)) return { ok: false, reason: "not-in-session" };
    if (!["A", "B", "C"].includes(choice)) return { ok: false, reason: "bad-choice" };
    if (s.mode === "practice" && s.answers[qid]) return { ok: false, reason: "revealed" };
    if (s.ids[s.current] === qid) tick(s, now);
    s.answers[qid] = choice;
    return { ok: true };
  }
  function submit(s, now) {
    if (s.submittedAt != null) return s;
    if (s.startedAt != null) { const end = s.limitSec ? Math.min(now, s.startedAt + s.limitSec * 1000) : now; tick(s, end); s.expired = !!(s.limitSec && now - s.startedAt >= s.limitSec * 1000); }
    s.submittedAt = now;
    return s;
  }
  // Grade a session. meta(id) → { topic, module, skill, diff, est, isCalc, trap, ans }. Practice: unanswered questions are not recorded.
  function attemptsFromSession(s, meta, today) {
    return s.ids.map(id => {
      const q = meta(id); if (!q) return null;
      const pick = s.answers[id] || null;
      if (!pick && s.mode === "practice") return null;
      const ok = pick ? pick === q.ans : null;
      return { q: id, t: q.topic, m: q.module, s: q.skill, d: q.diff, ok, pick, sec: s.secs[id] || 0, est: q.est, calc: !!q.isCalc,
        trap: !!(pick && q.trap && pick === q.trap && ok === false), ts: today, src: s.kind, sess: s.id };
    }).filter(Boolean);
  }
  // compact storage: [question id, 1 right | 0 wrong | -1 unanswered, pick, seconds, day number, source code, session id]
  const packAttempt = a => [a.q, a.ok === true ? 1 : a.ok === false ? 0 : -1, a.pick || "", Math.round(a.sec || 0), dayNum(a.ts), SRC[a.src] || "p", a.sess || ""];
  function unpackAttempt(p, meta) {
    const q = meta(p[0]); if (!q) return null;
    const ok = p[1] === 1 ? true : p[1] === 0 ? false : null, pick = p[2] || null;
    return { q: p[0], t: q.topic, m: q.module, s: q.skill, d: q.diff, ok, pick, sec: p[3] || 0, est: q.est, calc: !!q.isCalc,
      trap: !!(pick && q.trap && pick === q.trap && ok === false), ts: fromDayNum(p[4]), src: SRC_KIND[p[5]] || "practice", sess: p[6] || null };
  }

  // ---------- statistics ----------
  function wilson(k, n, z) {     // Wilson score interval; z = 1.645 is a 90% interval
    z = z || 1.645; if (!n) return [0, 1];
    const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [clamp((c - m) / d, 0, 1), clamp((c + m) / d, 0, 1)];
  }
  function confidenceOf(n) { const E = CONFIG.evidence; return n < E.insufficient ? "insufficient" : n < E.low ? "low" : n < E.medium ? "medium" : "high"; }
  function bandOf(acc, n) {
    if (confidenceOf(n) === "insufficient" || acc == null) return "unknown";
    const B = CONFIG.bands; return acc >= B.strong ? "strong" : acc >= B.developing ? "developing" : acc >= B.needs ? "needs" : "weak";
  }
  // Only the FIRST attempt at a question is evidence of knowledge; a repeat says more about memory.
  function firstAttempts(rows) {
    const seen = new Set(), out = [];
    rows.map((a, i) => [a, i]).sort((x, y) => (x[0].ts < y[0].ts ? -1 : x[0].ts > y[0].ts ? 1 : x[1] - y[1]))
      .forEach(([a]) => { if (!seen.has(a.q)) { seen.add(a.q); out.push(a); } });
    return out;
  }
  function tally(rows, prior) {
    let n = 0, k = 0, w = 0, wk = 0, nEff = 0, tN = 0, tSec = 0, tEst = 0;
    const byDiff = { 1: { n: 0, k: 0 }, 2: { n: 0, k: 0 }, 3: { n: 0, k: 0 } };
    rows.forEach(a => {
      const sw = a.src === "qb" ? CONFIG.qbWeight : 1, ok = a.ok === true;
      n++; nEff += sw; if (ok) k++;
      const wt = (CONFIG.diffWeight[a.d] || 1) * sw; w += wt; if (ok) wk += wt;
      if (a.src !== "qb" && byDiff[a.d]) { byDiff[a.d].n++; if (ok) byDiff[a.d].k++; }
      if (a.sec > 0 && a.est) { tN++; tSec += a.sec; tEst += a.est; }
    });
    const acc = n ? k / n : null, wAcc = w ? wk / w : null;
    const p0 = prior == null ? 0.5 : prior, a0 = CONFIG.priorWeight;
    nEff = round(nEff, 2);
    return { n, k, nEff, w: round(w, 3), wk: round(wk, 3), acc, wAcc, ci: n ? wilson(k, n) : [0, 1], byDiff, mastery: (wk + a0 * p0) / (w + a0),
      confidence: confidenceOf(nEff), band: bandOf(wAcc, nEff),
      time: tN ? { n: tN, avgSec: tSec / tN, avgEst: tEst / tN, pace: tSec / tEst } : null };
  }

  // ---------- error classes (hypotheses, never diagnoses) ----------
  // From a first wrong answer we know: unanswered (time), the typical-mistake answer was chosen (trap),
  // a calculation or a concept item, and how long it took. Each class says how much evidence it has.
  function classifyErrors(rows, topicAcc) {
    const first = firstAttempts(rows).filter(a => a.src !== "qb" && a.ok !== true);
    const types = { time: 0, trapCalc: 0, trapConcept: 0, calc: 0, concept: 0 }, examples = {};
    let sink = 0, rushed = 0;
    first.forEach(a => {
      const t = a.ok === null ? "time" : a.trap ? (a.calc ? "trapCalc" : "trapConcept") : (a.calc ? "calc" : "concept");
      types[t]++; (examples[t] = examples[t] || []).length < 5 && examples[t].push(a.q);
      if (a.ok === false && a.est && a.sec > 2 * a.est) sink++;
      if (a.ok === false && a.d === 1 && a.est && a.sec > 0 && a.sec < 0.3 * a.est) rushed++;
    });
    const level = c => c >= 3 ? "moderate" : c >= 2 ? "weak" : "insufficient";
    const evidence = {}; Object.keys(types).forEach(t => { evidence[t] = level(types[t]); });
    return { total: first.length, types, evidence, examples, timeSink: sink, timeSinkEvidence: level(sink), rushed,
      carelessEvidence: rushed >= 3 && (topicAcc == null || topicAcc >= 0.7) ? "weak" : "insufficient" };
  }

  // per-session results of one topic, oldest first (exam-style sessions with ≥ 5 questions of the topic)
  const TREND_KINDS = ["quick45", "full90", "confirm", "test", "mock"];
  function trend(rows) {
    const by = {}; rows.forEach(a => { if (a.sess && TREND_KINDS.includes(a.src)) (by[a.sess] = by[a.sess] || []).push(a); });
    const pts = Object.values(by).filter(l => l.length >= 5).map(l => { const t = tally(l, null); return { date: l[0].ts, n: t.n, wAcc: t.wAcc, diff: sum(l, a => a.d || 2) / l.length }; })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (pts.length < 2) return { points: pts, status: "insufficient", delta: null };
    const a = pts[0], b = pts[pts.length - 1], delta = b.wAcc - a.wAcc;
    const comparable = Math.abs(a.diff - b.diff) <= 0.4;
    return { points: pts, delta, comparable, status: !comparable ? "not-comparable" : delta >= 0.15 ? "improving" : delta <= -0.15 ? "declining" : "stable" };
  }
  // self-rating vs measured result (only with enough evidence)
  function calibrate(rating, tl) {
    if (!rating || tl.confidence === "insufficient") return null;
    if (rating >= 4 && (tl.band === "needs" || tl.band === "weak")) return "over";
    if (rating <= 2 && tl.band === "strong") return "under";
    return "ok";
  }
  // 4 or more wrong in the last 5 questions of one skill (or module): needs remediation, not more of the same
  function remediationNeeds(rows) {
    const groups = {};
    rows.map((a, i) => [a, i]).filter(([a]) => a.src !== "qb" && a.ok !== null && a.m)
      .sort((x, y) => (x[0].ts < y[0].ts ? -1 : x[0].ts > y[0].ts ? 1 : x[1] - y[1]))
      .forEach(([a]) => { const key = a.m + "|" + (a.s || a.m); (groups[key] = groups[key] || []).push(a); });
    const out = [];
    Object.entries(groups).forEach(([key, list]) => {
      const lastByQ = new Map(); list.forEach(a => lastByQ.set(a.q, a));          // one answer per question (its latest)
      const last5 = [...lastByQ.values()].slice(-5);
      const wrong = last5.filter(a => a.ok === false).length;
      if (last5.length >= 5 && wrong >= 4) { const [m, s] = key.split("|"); out.push({ module: m, skill: s, topic: last5[0].t, wrong, n: last5.length, ids: last5.filter(a => !a.ok).map(a => a.q) }); }
    });
    return out.sort((a, b) => b.wrong - a.wrong);
  }

  // ---------- performance analysis ----------
  // ctx: { weights, topicIds, selfRatings:{TOPIC:1..5} }
  function analyze(rows, ctx) {
    ctx = ctx || {}; rows = rows || [];
    const first = firstAttempts(rows), self = ctx.selfRatings || {};
    const group = (list, key) => { const m = {}; list.forEach(a => { const k = key(a); if (k) (m[k] || (m[k] = [])).push(a); }); return m; };
    const byTopic = group(first, a => a.t), byModule = group(first, a => a.m), bySkill = group(first.filter(a => a.src !== "qb"), a => a.m && a.s ? a.m + "|" + a.s : null);
    const topics = {};
    (ctx.topicIds || Object.keys(ctx.weights || byTopic)).forEach(t => {
      const tl = tally(byTopic[t] || [], self[t] ? CONFIG.selfPrior[self[t]] : null), own = rows.filter(a => a.t === t);
      topics[t] = { ...tl, selfRating: self[t] || null, errors: classifyErrors(own, tl.acc), calibration: calibrate(self[t], tl), trend: trend(own) };
    });
    const modules = {};
    Object.keys(byModule).forEach(m => { modules[m] = tally(byModule[m], null); modules[m].topic = byModule[m][0].t; });
    const skills = {};
    Object.keys(bySkill).forEach(k => { const [m, s] = k.split("|"); skills[k] = { ...tally(bySkill[k], null), module: m, skill: s, topic: bySkill[k][0].t }; });
    const weakSkills = Object.values(skills).filter(x => x.n >= 2 && x.acc < 0.6).sort((a, b) => a.acc - b.acc || b.n - a.n).slice(0, 15)
      .map(x => ({ module: x.module, skill: x.skill, topic: x.topic, n: x.n, k: x.k, preliminary: x.n < 4 }));
    return { total: tally(first, null), topics, modules, skills, weakSkills, remediation: remediationNeeds(rows), errors: classifyErrors(rows),
      evidenceTotal: first.length, timed: first.filter(a => a.sec > 0).length };
  }
  function evidenceSummary(an) {
    const out = { insufficient: [], low: [], ok: [] };
    Object.keys(an.topics).forEach(t => { const c = an.topics[t].confidence; (c === "insufficient" ? out.insufficient : c === "low" ? out.low : out.ok).push(t); });
    return out;
  }

  // ---------- spaced repetition ----------
  const IV = () => CONFIG.intervals;
  function startReview(today) { return { stage: 0, ease: 1, last: today, next: addDays(today, IV()[0]), reviews: 0 }; }
  // r = share right in a review of n ≥ 2 questions
  function recordReview(rev, r, n, today) {
    rev = rev ? { ...rev } : startReview(today);
    if (n < 2) return { ...rev, last: today };
    if (r >= 0.8) { rev.stage = Math.min(IV().length - 1, rev.stage + 1); rev.ease = clamp(rev.ease + 0.1, 0.6, 1.6); }
    else if (r >= 0.5) rev.ease = clamp(rev.ease - 0.05, 0.6, 1.6);
    else { rev.stage = Math.max(0, rev.stage - 1); rev.ease = clamp(rev.ease - 0.2, 0.6, 1.6); }
    rev.last = today; rev.reviews = (rev.reviews || 0) + 1;
    rev.next = addDays(today, r < 0.5 ? 1 : Math.max(1, Math.round(IV()[rev.stage] * rev.ease)));
    return rev;
  }
  // exponential forgetting with a stability tied to the current interval (a heuristic, not a fitted model)
  function retention(rev, today) {
    if (!rev) return null;
    return Math.exp(-Math.max(0, daysBetween(rev.last, today)) / (IV()[rev.stage] * rev.ease * 1.5));
  }

  // ---------- knowledge and priority per module ----------
  // Hierarchical estimate: the learner's own status is the starting point; the topic's answers pull it toward what
  // they show (the status counts like 3 weighted answers); the module's own answers pull the module away from the
  // topic (the topic estimate counts like 3 answers). So 3 answers in a module never decide on their own, and a
  // claim of "confident" gives way as soon as answers say otherwise. "Learned" claims add a little and are capped;
  // a passed confirmation test sets a floor.
  function moduleKnowledge(m, st) {
    const status = (st.statuses && st.statuses[m.id]) || (st.topicStatus && st.topicStatus[m.topic]) || "none";
    const prior = CONFIG.statusPrior[status] != null ? CONFIG.statusPrior[status] : CONFIG.statusPrior.none;
    let k = prior, wEv = 0, level = null;
    const a = st.analysis, S = CONFIG.shrink;
    if (a) {
      const mo = a.modules[m.id], tp = a.topics[m.topic];
      const part = tp ? clamp(tp.nEff / CONFIG.evidence.insufficient, 0, 1) : 0;      // 1–3 answers count partly
      const kt = tp && tp.w ? (tp.wk * part + S.topic * prior) / (tp.w * part + S.topic) : prior;
      k = mo && mo.w ? (mo.wk + S.module * kt) / (mo.w + S.module) : kt;
      wEv = 1 - (S.topic / ((tp && tp.w || 0) * part + S.topic)) * (S.module / ((mo && mo.w || 0) + S.module));
      level = mo && mo.n ? "module" : tp && tp.n ? "topic" : null;
    }
    const l = st.learned && st.learned[m.id];
    if (l === "reported") k = Math.min(k + 0.10, Math.max(k, 0.70));
    if (l === "verified") k = Math.min(k + 0.25, Math.max(k, 0.85));
    if (st.confirmed && st.confirmed[m.topic]) k = Math.max(k, 0.85);
    return { k: clamp(k, 0, 1), prior, evidence: wEv, evidenceLevel: level, status };
  }
  // Priority = 0.30 gap + 0.25 exam weight + 0.20 forgetting risk + 0.15 prerequisite + 0.10 urgency (each 0–1)
  function priorities(modules, st, today, examDate, needRatio) {
    const W = CONFIG.priority, weights = st.weights || {}, maxW = Math.max(...Object.values(weights), 0.0001);
    const left = examDate ? Math.max(0, daysBetween(today, examDate)) : 180;
    const pressure = needRatio != null ? clamp(needRatio, 0, 1) : clamp(1 - left / 180, 0, 1);
    return modules.map(m => {
      const kn = moduleKnowledge(m, st), gap = 1 - kn.k;
      const exam = (weights[m.topic] || 0) / maxW;
      const rev = st.reviews && st.reviews[m.id];
      const forget = rev ? 1 - retention(rev, today) : (kn.prior >= 0.55 && !(st.analysis && st.analysis.modules[m.id]) ? 0.5 : 0);
      const prereq = PREREQ[m.id] != null ? PREREQ[m.id] : 0.2;
      const urgency = pressure * (gap > 0.3 ? 1 : 0.5);
      const score = W.gap * gap + W.exam * exam + W.forget * forget + W.prereq * prereq + W.urgency * urgency;
      return { id: m.id, topic: m.topic, title: m.title, k: kn.k, status: kn.status, evidence: kn.evidence, evidenceLevel: kn.evidenceLevel,
        gap, exam, forget, prereq, urgency, score: round(score, 4) };
    });
  }
  // minutes of first learning per module: the recommended hours × topic weight × learning share, split over the topic's modules
  function moduleBudgets(modules, weights) {
    const n = {}; modules.forEach(m => { n[m.topic] = (n[m.topic] || 0) + 1; });
    const out = {};
    modules.forEach(m => { out[m.id] = clamp(r5(CONFIG.recommendedHours * 60 * (weights[m.topic] || 0.1) * CONFIG.learnShare / n[m.topic]), CONFIG.moduleMinutes.min, CONFIG.moduleMinutes.max); });
    return out;
  }
  function learnNeed(k, budget, id, st) {
    if (k >= CONFIG.learnedAt || (st.learned && st.learned[id])) return 0;
    const need = r5(budget * (1 - k) / (1 - CONFIG.statusPrior.none));
    const left = need - ((st.progress && st.progress[id]) || 0);
    return left >= 20 ? left : 0;
  }

  // ---------- the study plan ----------
  // profile: { examDate, hoursPerDay, minutesByWeekday?, studyDays:[0..6], busyDates:[], maxSessionMin, breakMin, slot }
  // state:   { modules:[{id,topic,title}], weights, analysis, statuses, topicStatus, learned, confirmed, reviews, progress,
  //            supply:{module:n built-in questions}, seen:{module:n answered}, qb:{module:[{fileId,total,done}]},
  //            remediation:[{module,skill}], hasDiagnostic, done:{taskKey:status} }
  function dayMinutes(profile, date) {
    if ((profile.busyDates || []).includes(date)) return 0;
    const wd = weekday(date);
    if (!(profile.studyDays || [1, 2, 3, 4, 5, 6, 0]).includes(wd)) return 0;
    const by = profile.minutesByWeekday && profile.minutesByWeekday[wd];
    return Math.max(0, r5(by != null ? by : (profile.hoursPerDay || 2) * 60));
  }
  const taskKey = t => [t.type, t.module || t.topic || "", t.part || t.round || t.step || ""].join(":");
  // types the learner finishes by doing a Hoa Tiêu session (the session proves it)
  const SESSION_TASKS = ["diag", "confirm", "practice", "test", "check", "review", "mistakes", "mock"];
  const SELF_TASKS = ["formula", "buffer", "final", "reread", "mockReview", "fixStudy"];

  function buildPlan(profile, state, today, opts) {
    opts = opts || {};
    if (!validDate(profile.examDate)) return { error: "Ngày thi không hợp lệ" };
    const daysLeft = daysBetween(today, profile.examDate);
    if (daysLeft <= 0) return { error: "Ngày thi đã qua hoặc là hôm nay" };
    const maxSess = clamp(profile.maxSessionMin || 90, 30, 240), chunk = Math.min(maxSess, CONFIG.chunkMinutes);
    const warnings = [], notes = [];
    // 1) the days. The day before the exam is a light day.
    const days = [];
    for (let i = 0; i < daysLeft; i++) {
      const date = addDays(today, i); let min = dayMinutes(profile, date);
      if (opts.ramp && i < opts.ramp.days) min = r5(min * opts.ramp.factor);
      if (i === daysLeft - 1) min = Math.min(min, CONFIG.lightDayMinutes);
      days.push({ date, minutes: min, phase: 0, tasks: [] });
    }
    const capacity = sum(days, d => d.minutes);
    if (capacity < 60) return { error: "Không còn thời gian học khả dụng trước ngày thi", capacity };

    // 2) knowledge, needs and priorities
    const mods = state.modules, weights = state.weights || {}, byId = {}; mods.forEach((m, i) => { byId[m.id] = { ...m, idx: i }; });
    const budget = moduleBudgets(mods, weights);
    const k0 = {}, need = {}; mods.forEach(m => { k0[m.id] = moduleKnowledge(m, state).k; need[m.id] = learnNeed(k0[m.id], budget[m.id], m.id, state); });
    const practiceN = id => clamp(Math.round(CONFIG.practiceBase * (0.6 + 0.8 * (1 - k0[id]))), 5, 20);
    const practiceEst = sum(mods, m => practiceN(m.id) * CONFIG.minutesPerQuestion);
    const mockNeed = 2 * (2 * CONFIG.mock.sessionMinutes + CONFIG.mock.analysisMinutes);
    const baseNeed = sum(mods, m => need[m.id]) + practiceEst + mockNeed;
    // learning depth follows the time available: more time = deeper study of each module; less time = every module
    // still covered, at no less than 75% of its normal time, before anything is left out
    const depth = clamp(capacity / Math.max(1, baseNeed), CONFIG.depth.min, CONFIG.depth.max);
    mods.forEach(m => { if (need[m.id]) need[m.id] = Math.max(20, r5(need[m.id] * depth)); });
    // Not enough time even at reduced depth: each topic gets its exam-weight share of the learning time and spends it
    // on its highest-priority modules, so no topic is dropped; the rest is listed as not scheduled.
    const shortOf = [];
    const learnCap = capacity * 0.6;
    if (sum(mods, m => need[m.id]) > learnCap) {
      const pr0 = priorities(mods, state, today, profile.examDate, 1), sc = {}; pr0.forEach(x => { sc[x.id] = x.score; });
      Object.keys(weights).forEach(t => {
        let cap = learnCap * weights[t], used = 0;
        mods.filter(m => m.topic === t && need[m.id] > 0).sort((a, b) => sc[b.id] - sc[a.id]).forEach((m, i) => {
          if (i === 0 || used + need[m.id] <= cap) used += need[m.id];
          else { shortOf.push({ type: "learn", topic: t, module: m.id, min: need[m.id], phase: 2, reason: "time" }); need[m.id] = 0; }
        });
      });
    }
    const learnTotal = sum(mods, m => need[m.id]);
    const needRatio = (learnTotal + practiceEst + mockNeed) / capacity;
    const pri = priorities(mods, state, today, profile.examDate, needRatio), P = {}; pri.forEach(x => { P[x.id] = x; });
    const sorted = pri.slice().sort((a, b) => b.score - a.score || byId[a.id].idx - byId[b.id].idx);
    const sortedByK = pri.filter(x => x.k < 0.85).sort((a, b) => a.k - b.k || b.score - a.score);
    const done = state.done || {}, isDone = key => done[key] === "verified" || done[key] === "reported";
    const supply = state.supply || {}, avail = {}, qbs = {};
    mods.forEach(m => { avail[m.id] = Math.max(0, (supply[m.id] || 0) - ((state.seen || {})[m.id] || 0)); qbs[m.id] = ((state.qb || {})[m.id] || []).map(s => ({ fileId: s.fileId, left: Math.max(0, (s.total || 0) - (s.done || 0)) })); });
    const T = (type, o) => ({ type, ...o });
    const take = (id, n) => { const q = Math.min(n, avail[id]); avail[id] -= q; return q; };
    const takeTopic = (t, n) => { let got = 0; mods.filter(m => m.topic === t).sort((a, b) => avail[b.id] - avail[a.id]).forEach(m => { if (got < n) got += take(m.id, Math.min(n - got, Math.ceil(n / 3))); });
      mods.filter(m => m.topic === t).forEach(m => { if (got < n) got += take(m.id, n - got); }); return got; };
    let wantedQ = 0, placedQ = 0;
    // practice: unseen built-in questions first (they carry difficulty and time), then a Question Bank set, else nothing
    const practiceTask = (id, n, round_, extra, minQ) => {
      if (!extra) wantedQ += n;
      const m = byId[id], q = take(id, n);
      if (q >= Math.min(minQ || 5, n)) { placedQ += q; return T("practice", { topic: m.topic, module: id, n: q, min: Math.ceil(q * CONFIG.minutesPerQuestion), round: round_ }); }
      avail[id] += q;
      const set = qbs[id].find(s => s.left >= 5);
      if (set) { const n2 = Math.min(n, set.left); set.left -= n2; placedQ += n2; return T("qb", { topic: m.topic, module: id, fileId: set.fileId, n: n2, min: Math.ceil(n2 * CONFIG.minutesPerQuestion), round: round_ }); }
      return null;
    };
    const learnTasks = id => {
      const m = byId[id], total = need[id]; if (!total) return [];
      const parts = Math.ceil(total / chunk), per = Math.ceil(total / parts / 5) * 5;
      const out = Array.from({ length: parts }, (_, i) => T("learn", { topic: m.topic, module: id, min: i < parts - 1 ? per : Math.max(15, total - per * (parts - 1)), part: `${i + 1}/${parts}`, last: i === parts - 1 }));
      const mini = practiceTask(id, CONFIG.miniPractice, "mini"); if (mini) out.push(mini);
      return out;
    };

    // 3) the queues
    const Q = [[], [], [], []];
    if (!state.hasDiagnostic && !isDone("diag::")) { Object.keys(weights).forEach(t => takeTopic(t, 3)); Q[0].push(T("diag", { n: 30, min: 45 })); }
    // remediation for repeated mistakes: study the worked solutions, practise new questions, check again
    (state.remediation || []).slice(0, 3).forEach(f => {
      const m = byId[f.module]; if (!m) return;
      const pre = PRE_MODULE[m.topic];          // 1) is the foundation behind it solid?
      if (pre && pre !== m.id && byId[pre] && k0[pre] < 0.7 && avail[pre] >= 3 && !isDone(`check:${pre}:pre`)) Q[0].push(T("check", { topic: byId[pre].topic, module: pre, n: take(pre, Math.min(5, avail[pre])), min: 8, round: "pre" }));
      if (!isDone(`fixStudy:${m.id}:`)) Q[0].push(T("fixStudy", { topic: m.topic, module: m.id, skill: f.skill, min: 30 }));   // 2) relearn + worked solutions
      const nCheck = avail[m.id] >= 6 ? take(m.id, Math.min(5, avail[m.id] - 3)) : 0;             // keep fresh questions for the re-check
      const p = practiceTask(m.id, 10, "fix", false, 3); if (p) Q[0].push(p);                     // 3) new questions, not the same ones again
      if (nCheck) Q[0].push(T("check", { topic: m.topic, module: m.id, n: nCheck, min: 8, round: "fix" }));   // 4) measure again
    });
    // topics the learner says they know well but has barely been tested on: a 10-question confirmation instead of
    // silently trusting the claim or making them relearn everything
    const claimed = Object.keys(weights).filter(t => {
      const ms = mods.filter(m => m.topic === t); if (!ms.length) return false;
      const strong = ms.filter(m => ["solid", "confident"].includes(P[m.id].status)).length / ms.length;
      const a = state.analysis && state.analysis.topics[t];
      return strong >= 0.6 && (!a || a.nEff < CONFIG.evidence.low) && !(state.confirmed && state.confirmed[t]) && !isDone(`confirm:${t}:`);
    });
    claimed.forEach(t => { takeTopic(t, 10); Q[0].push(T("confirm", { topic: t, n: 10, min: 15 })); });
    // phase-1 learning: the quantitative toolkit other topics use (QM-01 … QM-05, in curriculum order) when it is weak;
    // other key modules stay inside their own topic block so every topic is learned in curriculum order
    const qmTools = mods.filter(m => m.topic === "QM" && +m.id.split("-")[1] <= 5 && need[m.id] > 0);
    const foundation = qmTools.some(m => P[m.id].prereq >= 0.7 && P[m.id].k < 0.6) ? qmTools : [];
    const isFound = new Set(foundation.map(m => m.id));
    foundation.forEach(m => Q[0].push(...learnTasks(m.id)));
    // core learning in topic blocks: highest priority first, Quantitative Methods before the topics that use it,
    // FSA before Equity and Corporate Issuers; modules in curriculum order; a topic test at the end of each block
    const topicNeed = {}, topicScore = {};
    mods.forEach(m => { if (need[m.id] > 0 && !isFound.has(m.id)) { topicNeed[m.topic] = (topicNeed[m.topic] || 0) + need[m.id]; topicScore[m.topic] = (topicScore[m.topic] || 0) + P[m.id].score * need[m.id]; } });
    const order = Object.keys(topicNeed).sort((a, b) => topicScore[b] / topicNeed[b] - topicScore[a] / topicNeed[a] || a.localeCompare(b));
    Object.entries(TOPIC_BEFORE).forEach(([x, ys]) => {
      const i = order.indexOf(x); if (i < 0) return;
      const j = Math.min(...ys.map(y => order.indexOf(y)).filter(v => v >= 0));
      if (isFinite(j) && j < i) { order.splice(i, 1); order.splice(j, 0, x); }
    });
    order.forEach(t => {
      mods.filter(m => m.topic === t && need[m.id] > 0 && !isFound.has(m.id)).forEach(m => Q[1].push(...learnTasks(m.id)));
      if (!isDone(`test:${t}:`) && sum(mods.filter(m => m.topic === t), m => avail[m.id]) >= 10) { const n = takeTopic(t, CONFIG.topicTest); Q[1].push(T("test", { topic: t, n, min: 25 })); }
    });
    // modules the learner says they have studied (not yet verified): a 5-question check, not a relearn
    mods.forEach(m => { if (state.learned && state.learned[m.id] === "reported" && !isDone(`check:${m.id}:`) && avail[m.id] >= 3) { take(m.id, 5); Q[1].push(T("check", { topic: m.topic, module: m.id, n: 5, min: 8 })); } });
    // reinforcement: one practice round on every module by priority, a second on the weaker ones
    sorted.forEach(x => { const t = practiceTask(x.id, practiceN(x.id), "r1", false, 3); if (t) Q[2].push(t); });
    sorted.filter(x => k0[x.id] < 0.7).forEach(x => { const t = practiceTask(x.id, 10, "r2"); if (t) Q[2].push(t); });
    // Maintenance: a topic the learner already knows (or says so) is never dropped. Every topic gets at least
    // CONFIG.maintainShare of its exam-weight share of the planned work, as rereads of its modules (and Question
    // Bank sets when there are some); the confirmation test or new answers then decide whether more is needed.
    const planned = {}; Q.slice(0, 3).forEach(q => q.forEach(t => { if (t.topic) planned[t.topic] = (planned[t.topic] || 0) + t.min; }));
    const work = sum(Object.values(planned));
    Object.keys(weights).forEach(t => {
      let gap = Math.round(CONFIG.maintainShare * weights[t] * work) - (planned[t] || 0);
      const ms = sorted.filter(x => x.topic === t);
      for (let i = 0; gap >= 15 && ms.length && i < 40; i++) {
        const x = ms[i % ms.length];
        const qt = qbs[x.id] && qbs[x.id].some(s => s.left >= 5) ? practiceTask(x.id, 15, "maint", true) : null;
        const task = qt || T("reread", { topic: t, module: x.id, min: 30, round: "maint" });
        Q[2].push(task); gap -= task.min;
      }
    });

    // 4) phases, by share of the available minutes
    const qMin = q => sum(q, t => t.min);
    const newShare = learnTotal / Math.max(1, learnTotal + practiceEst);
    let p1 = clamp(qMin(Q[0]) / capacity, 0, 0.18);
    let p4 = clamp(Math.max(mockNeed / capacity, 0.15 + 0.12 * (1 - newShare)), 0.12, 0.32);
    let p2 = qMin(Q[1]) > 0 ? clamp(qMin(Q[1]) * 1.45 / capacity, 0.08, 0.62) : 0;     // reviews, catch-up and revision share those days
    if (p1 + p2 + p4 > 0.92) p2 = Math.max(0.05, 0.92 - p1 - p4);
    const bounds = [p1, p1 + p2, 1 - p4].map(f => f * capacity);
    let cum = 0, lastP = 0;
    days.forEach(d => { if (d.minutes) { d.phase = cum < bounds[0] ? 0 : cum < bounds[1] ? 1 : cum < bounds[2] ? 2 : 3; lastP = d.phase; } else d.phase = lastP; cum += d.minutes; });

    // 5) fixed days: full mocks in the last phase (both sessions on one day when it is long enough, otherwise
    // session 2 on the next long day), the analysis on the following study day, weekly catch-up slots
    const M = CONFIG.mock.sessionMinutes, mockAt = {}, afterMock = {};
    const lastIdx = days.length - 1;
    const p4days = days.filter((d, i) => d.phase === 3 && d.minutes >= M && i < lastIdx - 1);
    const p4cap = sum(days.filter(d => d.phase === 3), d => d.minutes);
    let nMocks = p4days.length ? clamp(Math.floor(p4cap / 1000), 1, 3) : 0;
    const used = new Set();
    const targets = Array.from({ length: nMocks }, (_, i) => p4days[Math.min(p4days.length - 1, Math.floor((i + 0.5) * p4days.length / nMocks))].date);
    for (let i = 0; i < nMocks; i++) {
      const d = p4days.find(x => x.date >= targets[i] && !used.has(x.date)) || p4days.find(x => !used.has(x.date)); if (!d) break;
      used.add(d.date);
      if (d.minutes >= 2 * M + (profile.breakMin || 10)) mockAt[d.date] = [{ part: 1, mock: i + 1 }, { part: 2, mock: i + 1 }];
      else {
        mockAt[d.date] = [{ part: 1, mock: i + 1 }];
        const nx = days.find(x => x.date > d.date && x.minutes >= M && !used.has(x.date) && days.indexOf(x) < lastIdx);
        if (nx) { used.add(nx.date); mockAt[nx.date] = [{ part: 2, mock: i + 1 }]; }
      }
    }
    const mockDates = Object.keys(mockAt).sort();
    mockDates.forEach(dt => { if (mockAt[dt].some(x => x.part === 2)) { const nx = days.find(x => x.date > dt && x.minutes >= 30 && !mockAt[x.date]); if (nx) afterMock[nx.date] = mockAt[dt][0].mock; } });
    nMocks = new Set(mockDates.flatMap(dt => mockAt[dt].map(x => x.mock))).size;
    if (!nMocks) warnings.push("Giai đoạn cuối không có ngày nào học được từ 2 giờ 15 phút trở lên nên chưa xếp được bài thi thử 90 câu. Hãy dành ít nhất một ngày dài trước kỳ thi.");
    const bufferAt = {}, weekMin = {};
    days.forEach(d => { weekMin[isoWeek(d.date)] = (weekMin[isoWeek(d.date)] || 0) + d.minutes; });
    days.forEach((d, i) => { if (d.minutes >= 60 && !mockAt[d.date] && i < lastIdx) bufferAt[isoWeek(d.date)] = d.date; });
    const bufferMin = {}; Object.entries(bufferAt).forEach(([w, dt]) => { bufferMin[dt] = clamp(r5(weekMin[w] * CONFIG.bufferShare), 15, 60); });

    // 6) fill the days
    const rq = [];           // spaced reviews still to place: { module, due, step }
    const learnedIn = new Set();   // modules whose learning is placed (so far, day by day)
    Object.entries(state.reviews || {}).forEach(([id, rv]) => { if (byId[id]) rq.push({ module: id, due: rv.next < today ? today : rv.next, step: Math.min((rv.stage || 0) + 1, IV().length) }); });
    // modules already known (by answers or by the learner's own status) but never scheduled: keep them in spaced
    // review from the start, spread over the first two weeks, then every 7 → 14 → 30 days, so nothing is forgotten
    let spread = 0;
    sorted.forEach(x => { if (k0[x.id] >= 0.6 && !need[x.id] && !(state.reviews || {})[x.id]) rq.push({ module: x.id, due: addDays(today, 3 + (spread++ % 14)), step: 2 }); });
    let studyIdx = 0, reread = 0;
    days.forEach((d, di) => {
      if (!d.minutes) return;
      studyIdx++;
      let left = d.minutes;
      const add = t => { const task = { ...t, id: `${d.date}_${d.tasks.length + 1}`, date: d.date, status: "todo" }; task.key = taskKey(task); d.tasks.push(task); left -= t.min; return task; };
      if (di === lastIdx) { add(T("final", { min: left })); return; }
      if (mockAt[d.date]) { mockAt[d.date].forEach(x => { if (left >= M) add(T("mock", { min: M, part: String(x.part), mock: x.mock, n: CONFIG.mock.sessionQuestions })); }); return; }
      if (afterMock[d.date]) add(T("mockReview", { min: Math.min(left, CONFIG.mock.analysisMinutes), mock: afterMock[d.date] }));
      const buf = bufferMin[d.date] && left - bufferMin[d.date] >= 30 ? bufferMin[d.date] : 0; left -= buf;
      // spaced reviews that are due (at most a quarter of the day)
      const capN = Math.max(1, Math.floor(d.minutes * CONFIG.reviewCap / CONFIG.reviewMinutes));
      rq.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
      let nrev = 0;
      for (let i = 0; i < rq.length && nrev < capN && left >= CONFIG.reviewMinutes + 10;) {
        const it = rq[i]; if (it.due > d.date) break;
        const has = (supply[it.module] || 0) >= 3;
        add(has ? T("review", { topic: byId[it.module].topic, module: it.module, n: CONFIG.reviewQuestions, min: CONFIG.reviewMinutes, step: it.step })
                : T("reread", { topic: byId[it.module].topic, module: it.module, min: CONFIG.reviewMinutes, step: it.step }));
        rq.splice(i, 1); nrev++;
        const nx = addDays(d.date, IV()[Math.min(it.step, IV().length - 1)]);
        if (nx < profile.examDate) rq.push({ module: it.module, due: nx, step: it.step + 1 });
      }
      // a short formula revision every 5th study day and an error review every 6th, once learning has started
      if (d.phase >= 1 && studyIdx % 5 === 0 && d.minutes >= 90 && left >= 40) add(T("formula", { min: 15 }));
      if (d.phase >= 1 && studyIdx % 6 === 0 && left >= 45) add(T("mistakes", { n: 10, min: 20 }));
      // the phase queues: unfinished earlier phases first, then the current one, then run ahead to the next
      const fill = queues => {
        for (const q of queues) {
          let guard = 0;
          while (left >= 20 && q.length && guard++ < 50) {
            // a task may jump the queue only if nothing it depends on is still waiting: practice after its module's
            // learning, a topic test after all of the topic's learning
            const blocked = (t, j) => q.slice(0, j).some(u => u.type === "learn" && (u.module === t.module || (t.type === "test" && u.topic === t.topic)));
            let i = q.findIndex((t, j) => j < 6 && t.min <= left && !blocked(t, j));
            if (i < 0 && q[0].type === "learn" && left >= 25) {      // split a learning block across days
              const t = q[0], part = Math.min(left, r5(left - 2) || left);
              if (t.min - part < 10) {                               // the rest is too small to keep: this piece finishes the block
                q.shift(); add({ ...t, min: part });
                if (t.last) { rq.push({ module: t.module, due: addDays(d.date, IV()[0]), step: 1 }); learnedIn.add(t.module); }
              } else { add({ ...t, min: part, cont: true, last: false }); t.min -= part; }
              continue;
            }
            if (i < 0) break;
            const t = q.splice(i, 1)[0]; add(t);
            if (t.type === "learn" && t.last) { rq.push({ module: t.module, due: addDays(d.date, IV()[0]), step: 1 }); learnedIn.add(t.module); }
          }
        }
      };
      fill(Q.slice(0, d.phase + 1));
      if (left >= 20 && d.phase < 3) fill([Q[d.phase + 1]]);
      // nothing left in the queues: extra practice on the highest-priority modules (while unseen questions last), one
      // error review and one reread of the weakest module. Whatever is still free stays free: the plan does not invent work.
      for (const x of sorted) { if (left < 20) break; const n = Math.min(20, Math.floor(left / CONFIG.minutesPerQuestion)); const t = n >= 5 && practiceTask(x.id, n, "extra", true); if (t) { t.min = Math.min(t.min, left); add(t); } }
      // alternate the two fillers; a reread only for modules already learned (in the plan or before it)
      if (left >= 20 && studyIdx % 2 === 0 && !d.tasks.some(t => t.type === "mistakes") && studyIdx > 3) add(T("mistakes", { n: Math.min(15, Math.floor(left / CONFIG.minutesPerQuestion)), min: Math.min(left, 25) }));
      else if (left >= 20) {
        const pool_ = sortedByK.filter(x => (learnedIn.has(x.id) || k0[x.id] >= 0.35) && !d.tasks.some(t => t.module === x.id));
        const x = pool_.length ? pool_[reread++ % pool_.length] : null;
        if (x) add(T("reread", { topic: x.topic, module: x.id, min: Math.min(left, 30) }));
      }
      d.free = left;
      if (buf) { add(T("buffer", { min: buf })); }
    });

    // 7) what did not fit is reported, never silently dropped
    const deferred = shortOf.slice();
    Q.slice(0, 2).forEach((q, i) => q.forEach(t => deferred.push({ ...t, phase: i + 1 })));
    const deferredMinutes = sum(deferred, t => t.min);
    const placedMinutes = sum(days, d => sum(d.tasks, t => t.min)), freeMinutes = sum(days, d => d.free || 0);
    const workDays = days.filter(d => d.minutes).length;
    const suggestedHours = deferredMinutes > 0 && workDays ? Math.ceil(((capacity + deferredMinutes * 1.1) / workDays) / 30) / 2 : null;
    if (deferredMinutes > 0) warnings.push(`Với ${vn(round(profile.hoursPerDay || 2, 1))} giờ/ngày, còn khoảng ${vn(round(deferredMinutes / 60, 1))} giờ nội dung cần học chưa xếp được vào lịch. Hãy tăng lên khoảng ${vn(suggestedHours)} giờ/ngày, thêm ngày học hoặc dời ngày thi; nếu không, các mục ưu tiên thấp nhất sẽ chưa được học.`);
    // the estimated need at the normal depth (first learning + module practice + mocks); the same figure everywhere
    const neededH = baseNeed / 60;
    if (freeMinutes >= 600) notes.push(`Kế hoạch để trống khoảng ${round(freeMinutes / 60, 0)} giờ: bạn có ${round(capacity / 60, 0)} giờ, trong khi học, luyện và thi thử ở mức chuẩn cần khoảng ${round(neededH, 0)} giờ; lịch đã cho mỗi module học sâu hơn và thêm ôn tập, kiểm tra. Bạn có thể giảm số giờ mỗi ngày, hoặc dùng thời gian trống cho Question Bank.`);
    if (capacity / 60 < neededH * 0.9) warnings.push(`Thời gian khả dụng (${round(capacity / 60, 0)} giờ) ít hơn nhu cầu ước tính (${round(neededH, 0)} giờ cho học, luyện và thi thử, dựa trên giả định khoảng ${CONFIG.recommendedHours} giờ cho cả chương trình Level I).`);
    if (wantedQ - placedQ > 40) notes.push(`Ngân hàng câu hỏi tích hợp không còn đủ câu chưa làm cho một số module (thiếu khoảng ${wantedQ - placedQ} câu). Nạp các set Question Bank trên thiết bị này để kế hoạch có thêm câu luyện.`);
    const phaseNames = ["Nền tảng & lấp lỗ hổng", "Học nội dung chính", "Củng cố & luyện tập", "Thi thử & ôn cuối"];
    const phases = phaseNames.map((name, i) => { const ds = days.filter(d => d.phase === i && d.minutes); return { id: i + 1, name, from: ds.length ? ds[0].date : null, to: ds.length ? ds[ds.length - 1].date : null, minutes: sum(ds, d => d.minutes) }; });
    const plan = { error: null, v: 2, createdAt: today, examDate: profile.examDate, daysLeft, capacity, placedMinutes, deferred, deferredMinutes, suggestedHours,
      mocks: nMocks, phases, days, warnings, notes, neededMinutes: Math.round(neededH * 60), depth: round(depth, 2), freeMinutes,
      assumptions: { recommendedHours: CONFIG.recommendedHours, learnShare: CONFIG.learnShare, minutesPerQuestion: CONFIG.minutesPerQuestion, intervals: CONFIG.intervals, priorityWeights: CONFIG.priority, budgets: budget },
      priorities: sorted.slice(0, 12).map(x => ({ id: x.id, topic: x.topic, score: x.score, k: round(x.k, 3), gap: round(x.gap, 3) })) };
    plan.summary = summarizePlan(plan);
    return plan;
  }

  // sessions of a day: no longer than the learner's maximum (a mock session is the exception), with breaks,
  // at the preferred time of day (moved earlier when the day would run past 23:30)
  const SLOT_START = { morning: 7 * 60, afternoon: 14 * 60, evening: 19 * 60 + 30, flex: 19 * 60 };
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  function daySessions(day, profile) {
    const maxSess = clamp(profile.maxSessionMin || 90, 30, 240), brk = clamp(profile.breakMin == null ? 10 : profile.breakMin, 0, 60);
    const out = []; let cur = null;
    day.tasks.forEach(t => { if (!cur || (cur.minutes + t.min > maxSess && cur.tasks.length)) { cur = { tasks: [], minutes: 0 }; out.push(cur); } cur.tasks.push(t); cur.minutes += t.min; });
    const total = sum(out, s => s.minutes) + brk * Math.max(0, out.length - 1);
    let clock = Math.max(6 * 60, Math.min(SLOT_START[profile.slot] || SLOT_START.evening, 23 * 60 + 30 - total));
    out.forEach(s => { s.startMin = clock; s.start = hhmm(clock); s.end = hhmm(clock + s.minutes); clock += s.minutes + brk; });
    return out;
  }

  // ---------- plan summaries, versions and comparisons ----------
  function summarizePlan(plan) {
    const byTopic = {}, byType = {};
    plan.days.forEach(d => d.tasks.forEach(t => { if (t.topic) byTopic[t.topic] = (byTopic[t.topic] || 0) + t.min; byType[t.type] = (byType[t.type] || 0) + t.min; }));
    return { createdAt: plan.createdAt, examDate: plan.examDate, daysLeft: plan.daysLeft, capacity: plan.capacity, placedMinutes: plan.placedMinutes, deferredMinutes: plan.deferredMinutes, freeMinutes: plan.freeMinutes || 0,
      mocks: plan.mocks, phases: plan.phases.map(p => ({ id: p.id, from: p.from, to: p.to, minutes: p.minutes })), byTopic, byType };
  }
  // what changed between two plan summaries, in plain words (Vietnamese, like the rest of the plan text)
  function diffSummaries(a, b) {
    if (!a || !b) return [];
    const out = [], h = m => vn(round(m / 60, 1));
    if (a.examDate !== b.examDate) out.push(`Ngày thi đổi từ ${a.examDate} sang ${b.examDate}.`);
    if (Math.abs(b.capacity - a.capacity) >= 60) out.push(`Thời gian khả dụng ${b.capacity > a.capacity ? "tăng" : "giảm"} ${h(Math.abs(b.capacity - a.capacity))} giờ (còn ${h(b.capacity)} giờ).`);
    const topics = new Set([...Object.keys(a.byTopic || {}), ...Object.keys(b.byTopic || {})]);
    const deltas = [...topics].map(t => [t, (b.byTopic[t] || 0) - (a.byTopic[t] || 0)]).filter(x => Math.abs(x[1]) >= 60).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4);
    deltas.forEach(([t, dm]) => out.push(`${t}: ${dm > 0 ? "+" : "−"}${h(Math.abs(dm))} giờ.`));
    if ((b.deferredMinutes || 0) !== (a.deferredMinutes || 0) && Math.abs(b.deferredMinutes - a.deferredMinutes) >= 30) out.push(`Phần chưa xếp được: ${h(a.deferredMinutes)} → ${h(b.deferredMinutes)} giờ.`);
    if ((a.mocks || 0) !== (b.mocks || 0)) out.push(`Số bài thi thử: ${a.mocks || 0} → ${b.mocks || 0}.`);
    if (!out.length) out.push("Không có thay đổi lớn; lịch được dời theo ngày hôm nay.");
    return out;
  }
  // a new version is added; nothing is deleted (versions keep a summary and the list of changes, the current plan is kept in full)
  function pushVersion(versions, plan, reason, today) {
    const list = (versions || []).slice(), prev = list.length ? list[list.length - 1].sum : null;
    list.push({ v: list.length + 1, date: today, reason, sum: plan.summary || summarizePlan(plan), diff: diffSummaries(prev, plan.summary || summarizePlan(plan)) });
    return list;
  }

  // ---------- compact storage of a plan ----------
  const TYPE_CODE = { diag: "D", confirm: "C", learn: "L", practice: "P", qb: "Q", test: "T", check: "K", review: "R", reread: "V", mistakes: "E", formula: "F", mock: "M", mockReview: "A", fixStudy: "X", buffer: "B", final: "Z" };
  const CODE_TYPE = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));
  const ST_CODE = { todo: 0, reported: 1, verified: 2 }, CODE_ST = ["todo", "reported", "verified"];
  const EXTRA = ["fileId", "round", "step", "mock", "doneAt", "cont", "skill", "last", "qb0"];
  function packTask(t) {
    const x = {}; EXTRA.forEach(k => { if (t[k] !== undefined && t[k] !== null && t[k] !== false) x[k] = t[k]; });
    const row = [TYPE_CODE[t.type] || "?", t.module || "", t.topic || "", t.min, t.n || 0, t.part || "", ST_CODE[t.status] || 0];
    if (Object.keys(x).length) row.push(x);
    return row;
  }
  function unpackTask(r, date, i) {
    const t = { type: CODE_TYPE[r[0]] || "review", module: r[1] || null, topic: r[2] || null, min: r[3], n: r[4] || 0, part: r[5] || null, status: CODE_ST[r[6]] || "todo", ...(r[7] || {}) };
    if (date) { t.date = date; t.id = `${date}_${i + 1}`; }
    t.key = taskKey(t);
    return t;
  }
  function packPlan(p) {
    return { v: 2, c: p.createdAt, e: p.examDate, dl: p.daysLeft, cap: p.capacity, pm: p.placedMinutes, dm: p.deferredMinutes, sh: p.suggestedHours, mk: p.mocks, nm: p.neededMinutes, fm: p.freeMinutes, dp: p.depth,
      w: p.warnings, n: p.notes, ph: p.phases, pr: p.priorities, s: p.summary,
      d: p.days.map(d => [dayNum(d.date), d.minutes, d.phase, d.tasks.map(packTask), d.free || 0]), df: p.deferred.map(t => packTask(t)) };
  }
  function unpackPlan(o) {
    if (!o || o.v !== 2) return null;
    const days = o.d.map(([dn, minutes, phase, tasks, free]) => { const date = fromDayNum(dn); return { date, minutes, phase, free: free || 0, tasks: tasks.map((r, i) => unpackTask(r, date, i)) }; });
    return { error: null, v: 2, createdAt: o.c, examDate: o.e, daysLeft: o.dl, capacity: o.cap, placedMinutes: o.pm, deferredMinutes: o.dm, suggestedHours: o.sh, mocks: o.mk, neededMinutes: o.nm, freeMinutes: o.fm || 0, depth: o.dp,
      warnings: o.w || [], notes: o.n || [], phases: o.ph, priorities: o.pr || [], summary: o.s, days, deferred: (o.df || []).map(r => unpackTask(r)) };
  }

  // ---------- adaptive behaviour ----------
  // minutes actually studied vs planned in the last `window` days
  function adherence(plan, log, today, window) {
    window = window || 14;
    const from = addDays(today, -window); let planned = 0, studied = 0, missedDays = 0, planDays = 0;
    (plan && plan.days || []).forEach(d => { if (d.date >= from && d.date < today && d.minutes) { planDays++; planned += d.minutes; const m = (log && log[d.date]) || 0; studied += Math.min(m, d.minutes); if (!m) missedDays++; } });
    let streak = 0;
    for (let i = 1; i <= window; i++) { const dd = addDays(today, -i), pd = (plan && plan.days || []).find(x => x.date === dd); if (!pd) break; if (!pd.minutes) continue; if ((log && log[dd]) > 0) break; streak++; }
    return { planned, studied, planDays, rate: planned ? studied / planned : null, missedDays, missStreak: streak };
  }
  // Re-plan from today. Missed tasks are never marked done and never lower the competence estimate; they simply
  // come back by priority. After 3+ empty days the next 3 days are 20% lighter. If the learner keeps doing
  // less than 60% of the plan for a week or more, the new plan uses the hours they really study.
  function replan(profile, state, today, prev, log, reason) {
    const adh = adherence(prev, log, today), opts = {};
    if (adh.missStreak >= 3) opts.ramp = { days: 3, factor: 0.8 };
    let p = profile;
    if (adh.rate != null && adh.rate < 0.6 && adh.planned > 240 && adh.missStreak < 3 && adh.planDays >= 7) {
      const real = Math.max(adh.studied / adh.planDays * 1.15, (profile.hoursPerDay || 2) * 60 * 0.6);
      p = { ...profile, hoursPerDay: round(real / 60, 1) }; opts.adjusted = true;
    }
    const plan = buildPlan(p, state, today, opts);
    if (plan.error) return { plan, adherence: adh };
    if (opts.adjusted) plan.warnings.unshift(`Gần đây bạn hoàn thành ${Math.round(adh.rate * 100)}% kế hoạch, nên lịch mới dùng ${vn(p.hoursPerDay)} giờ/ngày cho khả thi. Muốn giữ ${vn(profile.hoursPerDay)} giờ/ngày thì hãy học đủ số giờ đó.`);
    if (opts.ramp) plan.warnings.unshift(`Bạn đã nghỉ ${adh.missStreak} ngày liên tiếp: 3 ngày tới nhẹ hơn 20% để quay lại nhịp học. Điểm năng lực không bị trừ.`);
    return { plan, adherence: adh, reason: reason || (adh.missStreak >= 1 ? "missed-days" : "update") };
  }

  // ---------- completion rules ----------
  // A task is never "done" because it was shown. Session tasks are verified by the session itself, Question Bank
  // tasks by new marks in the set, learning by a 5-question check (or recorded as self-reported, which never
  // changes the mastery estimate). Self-directed tasks (formula, catch-up, reread, mock analysis) are self-reported.
  function completeTask(task, ev) {
    ev = ev || {};
    const t = task.type;
    if (SESSION_TASKS.includes(t)) {
      if (!ev.session) return { status: "todo", reason: "Làm bài trong Hoa Tiêu để tính là hoàn thành" };
      if (["diag", "confirm", "test", "check", "mock"].includes(t)) return ev.session.submitted ? { status: "verified" } : { status: "todo", reason: "Bài chưa nộp" };
      const need = Math.max(1, Math.ceil((task.n || ev.session.total || 5) * 0.8));
      return ev.session.answered >= need ? { status: "verified" } : { status: "todo", reason: `Cần trả lời ít nhất ${need} câu` };
    }
    if (t === "qb") { const need = Math.max(1, Math.ceil((task.n || 5) * 0.8)); return (ev.qbDone || 0) >= need ? { status: "verified" } : { status: "todo", reason: `Cần làm thêm ít nhất ${need} câu trong set Question Bank (đã ghi nhận ${ev.qbDone || 0})` }; }
    if (t === "learn") {
      if (ev.checkTotal >= 5) return ev.checkCorrect / ev.checkTotal >= 0.6 ? { status: "verified" } : { status: "reported", reason: "Điểm kiểm tra nhanh thấp: ghi nhận bạn đã học, chưa tính là nắm vững" };
      if (ev.selfReport) return { status: "reported" };
      return { status: "todo", reason: "Bấm “Tôi đã học xong” hoặc làm bài kiểm tra nhanh 5 câu" };
    }
    if (SELF_TASKS.includes(t)) return ev.selfReport ? { status: "reported" } : { status: "todo" };
    return ev.selfReport ? { status: "reported" } : { status: "todo" };
  }

  // ---------- readiness (an internal index, not a pass probability) ----------
  function readiness(an, weights, selfRatings) {
    let v = 0, lo = 0, hi = 0, covered = 0, topics = 0;
    Object.keys(weights).forEach(t => {
      topics++;
      const a = an.topics[t], w = weights[t];
      if (a && a.nEff >= CONFIG.evidence.insufficient) { covered++; v += w * a.mastery; lo += w * a.ci[0]; hi += w * a.ci[1]; }
      else { const p = selfRatings && selfRatings[t] ? CONFIG.selfPrior[selfRatings[t]] : 0.5; v += w * Math.min(p, 0.5); lo += w * 0.15; hi += w * 0.75; }
    });
    const enough = covered >= 5 && an.evidenceTotal >= 20;
    return { value: Math.round(v * 100), low: Math.round(lo * 100), high: Math.round(hi * 100), covered, topics, enough,
      label: !enough ? "Chưa đủ dữ liệu" : v >= 0.75 ? "Khá vững" : v >= 0.6 ? "Đang tiến bộ" : v >= 0.45 ? "Cần củng cố" : "Cần học thêm" };
  }
  // a confirmation test shows mastery with ≥ 10 questions and ≥ 80% difficulty-weighted accuracy
  function evaluateConfirm(rows) { const t = tally(rows, null); return { passed: t.n >= 10 && t.wAcc >= CONFIG.bands.strong, n: t.n, wAcc: t.wAcc, ci: t.ci }; }

  // ---------- recommendations (3–5 concrete next steps with their evidence) ----------
  function recommendations(st, today, examDate, limit) {
    const pri = priorities(st.modules, st, today, examDate).sort((a, b) => b.score - a.score);
    const an = st.analysis || { modules: {}, topics: {}, weakSkills: [], remediation: [] }, budget = moduleBudgets(st.modules, st.weights || {});
    const out = [], per = {};
    for (const p of pri) {
      if (out.length >= limit) break;
      if ((per[p.topic] || 0) >= 1 && pri.length > limit) continue;
      per[p.topic] = (per[p.topic] || 0) + 1;
      const mo = an.modules[p.id], tp = an.topics[p.topic];
      const fresh = Math.max(0, ((st.supply || {})[p.id] || 0) - ((st.seen || {})[p.id] || 0));
      const qb = ((st.qb || {})[p.id] || []).filter(s => s.total > s.done);
      const pre = PRE_MODULE[p.topic], preMod = pre && pre !== p.id && st.modules.find(m => m.id === pre);
      out.push({ module: p.id, topic: p.topic, title: p.title, score: p.score, k: p.k, gap: p.gap, components: { gap: p.gap, exam: p.exam, forget: p.forget, prereq: p.prereq, urgency: p.urgency },
        evidence: mo && mo.n ? { scope: "module", n: mo.n, k: mo.k, preliminary: mo.nEff < CONFIG.evidence.insufficient } : tp && tp.n ? { scope: "topic", n: tp.n, k: tp.k, preliminary: tp.nEff < CONFIG.evidence.insufficient } : { scope: "self", status: p.status },
        skill: (an.weakSkills.find(w => w.module === p.id) || {}).skill || null,
        prereq: preMod && moduleKnowledge(preMod, st).k < 0.6 ? pre : null,
        learnMinutes: learnNeed(p.k, budget[p.id], p.id, st) || 0, fresh, qbSets: qb.map(s => s.fileId),
        resourceMissing: fresh < 3 && !qb.length,
        remediation: (an.remediation || []).some(r => r.module === p.id) });
    }
    return out;
  }

  // ---------- calendar and spreadsheet export ----------
  const ENC = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const bytes = ch => ENC ? ENC.encode(ch).length : unescape(encodeURIComponent(ch)).length;
  const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  function icsFold(line) {   // lines longer than 75 octets continue on the next line after a space
    const out = []; let cur = "", len = 0;
    for (const ch of line) { const b = bytes(ch); if (len + b > 75) { out.push(cur); cur = " " + ch; len = 1 + b; } else { cur += ch; len += b; } }
    out.push(cur); return out.join("\r\n");
  }
  // one event per study session, in floating local time (calendars show it at the same clock time wherever the learner is)
  function toICS(plan, profile, label, stampIso) {
    const stamp = (stampIso || new Date().toISOString()).replace(/[-:]/g, "").replace(/\.\d+/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CFA Study//Hoa Tieu//VI", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Hoa Tiêu · CFA Level I"];
    plan.days.forEach(d => daySessions(d, profile).forEach((s, i) => {
      const ymd = d.date.replace(/-/g, ""), t0 = s.startMin, t1 = s.startMin + s.minutes;
      const at = m => `${ymd}T${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
      const end = t1 >= 24 * 60 ? `${addDays(d.date, 1).replace(/-/g, "")}T${String(Math.floor((t1 - 1440) / 60)).padStart(2, "0")}${String((t1 - 1440) % 60).padStart(2, "0")}00` : at(t1);
      lines.push("BEGIN:VEVENT", `UID:${ymd}-${i + 1}-${hash(plan.createdAt + d.date + i)}@hoa-tieu.cfa-study`, `DTSTAMP:${stamp}`, `DTSTART:${at(t0)}`, `DTEND:${end}`,
        icsFold("SUMMARY:" + icsEsc(`Hoa Tiêu: ${label(s.tasks[0])}${s.tasks.length > 1 ? ` (+${s.tasks.length - 1})` : ""}`)),
        icsFold("DESCRIPTION:" + icsEsc(s.tasks.map(t => `• ${label(t)} — ${t.min} phút`).join("\n"))), "END:VEVENT");
    }));
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }
  function toCSV(plan, profile, label) {
    const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const rows = [["date", "session", "start", "end", "phase", "type", "topic", "module", "task", "minutes", "status"]];
    plan.days.forEach(d => daySessions(d, profile).forEach((s, i) => s.tasks.forEach(t => rows.push([d.date, i + 1, s.start, s.end, d.phase + 1, t.type, t.topic || "", t.module || "", label(t), t.min, t.status]))));
    return rows.map(r => r.map(q).join(",")).join("\n") + "\n";
  }

  // ---------- version 1 data → version 2 ----------
  function migrateV1(c) {
    if (!c || c.v === 2) return c;
    const p = c.profile;
    const profile = p ? { name: p.displayName || "", level: "I", year: p.year || 2027, examDate: p.examDate, goal: p.goal || "pass", lang: p.lang || "vi", finLevel: p.finLevel || "some", tookBefore: p.tookBefore || "no",
      hoursPerDay: +p.hoursPerDay || 2, studyDays: (p.studyDays || []).map(Number), busy: p.busy || "", slot: p.slot || "evening", maxSession: +p.maxSession || 90, breakMin: p.breakMin == null ? 10 : +p.breakMin, assess: p.assess || "hybrid" } : null;
    return { v: 2, profile, draft: null, self: { topic: (c.self || {}).topicStatus || {}, module: (c.self || {}).statuses || {}, rating: (c.self || {}).rating || {} },
      att: (c.attempts || []).filter(a => a && a.q && a.ts).map(packAttempt), sess: null,
      hist: (c.history || []).map(h => ({ id: h.id, kind: h.kind, date: h.date, n: h.n, k: h.k, expired: !!h.expired, target: h.target || null })),
      plan: null, ver: (c.versions || []).map((v, i) => ({ v: i + 1, date: v.createdAt, reason: v.reason, sum: v.summary ? { ...v.summary, byType: {} } : null, diff: [] })),
      learned: c.learned || {}, confirmed: Object.fromEntries(Object.keys(c.confirmed || {}).map(t => [t, true])), rev: c.reviews || {}, log: c.log || {}, progress: {}, qbSnap: {}, migratedFrom: 1 };
  }

  return { CONFIG, PREREQ, PRE_MODULE, TOPIC_BEFORE, KINDS, DIAG_KINDS, SESSION_TASKS, SELF_TASKS, SLOT_START,
    hash, rng, dayNum, fromDayNum, addDays, daysBetween, weekday, validDate, weightsFromTopics, normalizePool, allocate, buildAssessment, buildMock,
    newSession, startSession, remainingSec, isOpen, visit, answer, submit, attemptsFromSession, packAttempt, unpackAttempt,
    wilson, confidenceOf, bandOf, firstAttempts, tally, classifyErrors, trend, calibrate, remediationNeeds, analyze, evidenceSummary,
    startReview, recordReview, retention, moduleKnowledge, priorities, moduleBudgets, learnNeed, dayMinutes, taskKey, buildPlan, daySessions,
    summarizePlan, diffSummaries, pushVersion, packTask, unpackTask, packPlan, unpackPlan, adherence, replan, completeTask, readiness, evaluateConfirm,
    recommendations, toICS, toCSV, migrateV1 };
});

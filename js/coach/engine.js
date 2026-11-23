// ============================================================
// coach/engine.js — Hoa Tiêu (CFA Compass): deterministic learning engine.
// No DOM, no storage, no network: every function takes data and returns data, so it can be tested.
//   assessment selection · exam sessions (timer, autosave, no answer key in the session) ·
//   performance analysis (topic / module / skill, uncertainty, error classes) ·
//   priority score · study plan generator · replan after missed days ·
//   spaced repetition · readiness index · mastery confirmation.
// The scoring and the plan are rule-based and statistical. An LLM (the CFA Tutor) only explains them.
// All weights and thresholds are heuristics set in CONFIG; they are NOT validated by CFA Institute.
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
    priorWeight: 2,                                                  // the prior counts like 2 questions
    priority: { gap: 0.30, exam: 0.25, forget: 0.20, prereq: 0.15, urgency: 0.10 },
    moduleMinutes: 120,                                              // reading + notes for a module nobody knows
    practiceQuestions: 20, minutesPerQuestion: 1.5,
    intervals: [1, 3, 7, 14, 30],                                    // spaced repetition start, in days
    minTopicShare: 0.03,                                             // protected share of time for every topic
    mock: { sessionQuestions: 90, sessionMinutes: 135 },
    diagMix: { 1: 0.30, 2: 0.45, 3: 0.25 }
  };

  // Modules other topics lean on (0–1). A heuristic, listed so it can be reviewed and edited.
  const PREREQ = { "QM-04": 1, "QM-05": 0.8, "QM-01": 0.7, "QM-02": 0.7, "QM-06": 0.6, "QM-03": 0.5, "FSA-03": 0.7, "FSA-02": 0.6, "FSA-01": 0.5,
    "FI-06": 0.8, "FI-01": 0.6, "FI-07": 0.6, "PM-01": 0.7, "PM-02": 0.6, "DER-01": 0.5, "DER-05": 0.6, "CI-05": 0.5, "ETH-02": 0.6, "ECO-01": 0.4 };

  const KINDS = {
    quick45: { n: 30, minutes: 45, label: "Chẩn đoán nhanh 45 phút" },
    full90: { n: 60, minutes: 90, label: "Chẩn đoán toàn diện 90 phút" },
    confirm: { n: 10, minutes: 15, label: "Bài kiểm tra xác nhận thành thạo" },
    check: { n: 5, minutes: 8, label: "Kiểm tra nhanh module" },
    targeted: { n: 15, minutes: 25, label: "Bài luyện theo điểm yếu" }
  };

  // ---------- small helpers ----------
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round = (x, d) => { const k = Math.pow(10, d || 0); return Math.round(x * k) / k; };
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

  // ---------- weights ----------
  // "11–14%" → 12.5, then normalised to shares that sum to 1
  function weightsFromTopics(topics) {
    const raw = {}; let sum = 0;
    topics.forEach(t => { const m = String(t.weight).match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/); const v = m ? (+m[1] + +m[2]) / 2 : 10; raw[t.id] = v; sum += v; });
    const out = {}; Object.keys(raw).forEach(k => { out[k] = raw[k] / sum; });
    return out;
  }

  // ---------- question pool ----------
  // pool item: { id, topic, module, skill, diff 1|2|3, est (seconds), isCalc }
  function normalizePool(rows) {
    const LV = { foundation: 1, application: 2, exam: 3, challenge: 3 };
    return rows.map(q => ({
      id: q.id, topic: q.topic, module: q.module || null, skill: q.skill || q.los || q.module || q.topic,
      diff: q.diff || LV[q.level] || 2, est: q.est || ({ 1: 60, 2: 90, 3: 130 }[q.diff || LV[q.level] || 2]), isCalc: !!(q.isCalc || q.calc),
      src: q.src || "bank"
    }));
  }

  // allocate `total` items across topics in proportion to weights (largest remainder), at least `minEach`
  // wherever the pool has enough, never more than the pool supplies
  function allocate(total, weights, supply, minEach) {
    const ids = Object.keys(weights).filter(t => (supply[t] || 0) > 0);
    const out = {}; ids.forEach(t => { out[t] = Math.min(supply[t], minEach); });
    let used = ids.reduce((s, t) => s + out[t], 0);
    if (used > total) { // not enough room for the minimum: keep the heaviest topics
      ids.sort((a, b) => weights[b] - weights[a]).slice(total).forEach(t => { out[t] = 0; });
      used = ids.reduce((s, t) => s + out[t], 0);
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

  // Build the list of question ids for an assessment. Deterministic for a given seed.
  // opts: { seed, seen:Set|Array, weights, topic?, module?, n? }
  function buildAssessment(pool, kind, opts) {
    opts = opts || {};
    const K = KINDS[kind]; if (!K) throw new Error("Unknown assessment kind: " + kind);
    const r = rng((opts.seed || "seed") + "|" + kind);
    const seen = new Set(opts.seen || []);
    const total = opts.n || K.n;
    let items = pool;
    if (opts.topic) items = items.filter(q => q.topic === opts.topic);
    if (opts.module) items = items.filter(q => q.module === opts.module);
    const weights = opts.topic ? { [opts.topic]: 1 } : (opts.weights || {});
    const topics = Object.keys(weights);
    const bySupply = {}; topics.forEach(t => { bySupply[t] = items.filter(q => q.topic === t).length; });
    const alloc = allocate(total, weights, bySupply, opts.module ? total : (kind === "full90" || kind === "quick45" ? 2 : 0));
    const picked = [];
    for (const t of Object.keys(alloc)) {
      const need = alloc[t]; if (!need) continue;
      const cand = items.filter(q => q.topic === t);
      const fresh = cand.filter(q => !seen.has(q.id)), reuse = cand.filter(q => seen.has(q.id));
      const mix = opts.mix || CONFIG.diagMix;
      const want = { 1: Math.round(need * mix[1]), 2: Math.round(need * mix[2]), 3: 0 };
      want[3] = need - want[1] - want[2];
      const modCount = {}, chosen = [];
      const take = (list, d, n) => {
        const pl = shuffle(list.filter(q => q.diff === d && !chosen.includes(q)), r);
        for (let i = 0; i < n && pl.length; i++) {          // spread over modules: least used module first
          pl.sort((a, b) => (modCount[a.module] || 0) - (modCount[b.module] || 0));
          const q = pl.shift(); chosen.push(q); modCount[q.module] = (modCount[q.module] || 0) + 1;
        }
      };
      [1, 2, 3].forEach(d => take(fresh, d, want[d]));
      // fill any shortfall: other difficulties from fresh questions first, repeats last
      for (const list of [fresh, reuse]) {
        for (const d of [2, 1, 3]) { if (chosen.length >= need) break; take(list, d, need - chosen.length); }
      }
      picked.push(...chosen);
    }
    return shuffle(picked, r).map(q => q.id);       // topics and difficulties mixed together
  }

  // ---------- exam session (timer, autosave) ----------
  // A session never holds the answer key: it stores ids, the learner's picks, flags and the clock.
  function newSession(kind, ids, nowMs, id) {
    const K = KINDS[kind];
    return { id: id || "s" + nowMs, kind, ids: ids.slice(), answers: {}, flags: {}, secs: {}, startedAt: nowMs, limitSec: K.minutes * 60, submittedAt: null, current: 0, expired: false };
  }
  const remainingSec = (s, nowMs) => s.submittedAt ? 0 : Math.max(0, s.limitSec - Math.floor((nowMs - s.startedAt) / 1000));
  const isOpen = (s, nowMs) => !s.submittedAt && remainingSec(s, nowMs) > 0;
  function answer(s, qid, choice, nowMs, spentSec) {
    if (s.submittedAt) return { ok: false, reason: "submitted" };
    if (remainingSec(s, nowMs) <= 0) { s.expired = true; return { ok: false, reason: "expired" }; }
    if (!s.ids.includes(qid)) return { ok: false, reason: "not-in-session" };
    if (!["A", "B", "C"].includes(choice)) return { ok: false, reason: "bad-choice" };
    s.answers[qid] = choice; s.secs[qid] = (s.secs[qid] || 0) + Math.max(0, spentSec || 0);
    return { ok: true };
  }
  function submit(s, nowMs) { if (!s.submittedAt) { s.submittedAt = nowMs; s.expired = remainingSec({ ...s, submittedAt: null }, nowMs) <= 0; } return s; }

  // Turn a submitted session into attempt rows. `byId` maps question id → { ans, topic, module, skill, diff, est, isCalc }.
  function attemptsFromSession(s, byId, today, src) {
    return s.ids.map(id => {
      const q = byId[id]; if (!q) return null;
      const pick = s.answers[id] || null;
      return { q: id, t: q.topic, m: q.module, s: q.skill, d: q.diff, ok: pick ? pick === q.ans : null, pick, sec: s.secs[id] || 0, est: q.est, calc: !!q.isCalc, ts: today, src: src || s.kind, sess: s.id };
    }).filter(Boolean);
  }

  // ---------- statistics ----------
  // Wilson score interval; z = 1.645 is a 90% interval
  function wilson(k, n, z) {
    z = z || 1.645; if (!n) return [0, 1];
    const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [clamp((c - m) / d, 0, 1), clamp((c + m) / d, 0, 1)];
  }
  function confidenceOf(n) { const E = CONFIG.evidence; return n < E.insufficient ? "insufficient" : n < E.low ? "low" : n < E.medium ? "medium" : "high"; }
  function bandOf(acc, n) {
    if (confidenceOf(n) === "insufficient") return "unknown";
    const B = CONFIG.bands; return acc >= B.strong ? "strong" : acc >= B.developing ? "developing" : acc >= B.needs ? "needs" : "weak";
  }

  // Only the FIRST attempt at a question counts as evidence of knowledge. Repeating a question you
  // have already seen says more about memory than about mastery.
  function firstAttempts(attempts) {
    const seen = new Set(), out = [];
    attempts.slice().sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)).forEach(a => { if (!seen.has(a.q)) { seen.add(a.q); out.push(a); } });
    return out;
  }
  function tally(rows, prior) {
    let n = 0, k = 0, w = 0, wk = 0; const byDiff = { 1: { n: 0, k: 0 }, 2: { n: 0, k: 0 }, 3: { n: 0, k: 0 } };
    rows.forEach(a => {
      n++; const ok = a.ok === true; if (ok) k++;
      const wt = CONFIG.diffWeight[a.d] || 1; w += wt; if (ok) wk += wt;
      const b = byDiff[a.d] || (byDiff[a.d] = { n: 0, k: 0 }); b.n++; if (ok) b.k++;
    });
    const acc = n ? k / n : null, wAcc = w ? wk / w : null;
    const ci = n ? wilson(k, n) : [0, 1];
    const p0 = prior == null ? 0.5 : prior, a0 = CONFIG.priorWeight;
    const mastery = (wk + a0 * p0) / (w + a0);        // evidence shrunk toward the (weak) prior
    return { n, k, acc, wAcc, ci, byDiff, mastery, confidence: confidenceOf(n), band: bandOf(wAcc == null ? 0 : wAcc, n) };
  }

  // ---------- error classification (hypotheses, not diagnoses) ----------
  // From a first wrong answer we only know: unanswered (time), a calculation item, or a concept item,
  // plus whether it was answered much faster than the estimate. We say so, and ask for more evidence.
  function classifyErrors(attempts) {
    const rows = firstAttempts(attempts).filter(a => a.ok !== true);
    const types = { time: 0, calc: 0, concept: 0 }; let fast = 0;
    rows.forEach(a => {
      if (a.ok === null) types.time++; else if (a.calc) types.calc++; else types.concept++;
      if (a.ok === false && a.est && a.sec > 0 && a.sec < 0.3 * a.est) fast++;
    });
    const level = c => c >= 3 ? "moderate" : c >= 2 ? "weak" : "insufficient";
    return { total: rows.length, types, evidence: { time: level(types.time), calc: level(types.calc), concept: level(types.concept) },
      rushedWrong: fast, rushedEvidence: fast >= 3 ? "weak" : "insufficient",
      note: "Phân loại suy ra từ loại câu hỏi (tính toán / khái niệm), việc bỏ trống khi hết giờ và tốc độ trả lời. Đây là giả thuyết, cần thêm bài làm để xác nhận." };
  }

  // ---------- performance analysis ----------
  // ctx: { weights, selfRatings:{TOPIC:1..5}, modules:[{id,topic,title}] }
  function analyze(attempts, ctx) {
    ctx = ctx || {};
    const first = firstAttempts(attempts), self = ctx.selfRatings || {};
    const group = (rows, key) => { const m = {}; rows.forEach(a => { const k = key(a); if (k) (m[k] || (m[k] = [])).push(a); }); return m; };
    const byTopic = group(first, a => a.t), byModule = group(first, a => a.m), bySkill = group(first, a => a.m && a.s ? a.m + "|" + a.s : null);
    const topics = {};
    (ctx.topicIds || Object.keys(ctx.weights || byTopic)).forEach(t => {
      const prior = self[t] ? CONFIG.selfPrior[self[t]] : null;
      topics[t] = { ...tally(byTopic[t] || [], prior), selfRating: self[t] || null, errors: classifyErrors((attempts || []).filter(a => a.t === t)) };
    });
    const modules = {};
    Object.keys(byModule).forEach(m => { modules[m] = tally(byModule[m], null); modules[m].topic = byModule[m][0].t; });
    const skills = {};
    Object.keys(bySkill).forEach(k => { const [m, s] = k.split("|"); skills[k] = { ...tally(bySkill[k], null), module: m, skill: s, topic: bySkill[k][0].t }; });
    const weakSkills = Object.values(skills).filter(x => x.n >= 2 && x.acc < 0.6).sort((a, b) => a.acc - b.acc || b.n - a.n).slice(0, 12)
      .map(x => ({ module: x.module, skill: x.skill, topic: x.topic, n: x.n, k: x.k, preliminary: x.n < 4 }));
    return { total: tally(first, null), topics, modules, skills, weakSkills, evidenceTotal: first.length };
  }

  // ---------- spaced repetition ----------
  const IV = () => CONFIG.intervals;
  function startReview(today) { return { stage: 0, ease: 1, last: today, next: addDays(today, IV()[0]), reviews: 0 }; }
  // r = share correct in a review quiz of n ≥ 2 questions
  function recordReview(rev, r, n, today) {
    rev = rev ? { ...rev } : startReview(today);
    if (n < 2) return { ...rev, last: today };
    if (r >= 0.8) { rev.stage = Math.min(IV().length - 1, rev.stage + 1); rev.ease = clamp(rev.ease + 0.1, 0.6, 1.6); }
    else if (r >= 0.5) { rev.ease = clamp(rev.ease - 0.05, 0.6, 1.6); }
    else { rev.stage = Math.max(0, rev.stage - 1); rev.ease = clamp(rev.ease - 0.2, 0.6, 1.6); }
    rev.last = today; rev.reviews = (rev.reviews || 0) + 1;
    rev.next = addDays(today, r < 0.5 ? 1 : Math.max(1, Math.round(IV()[rev.stage] * rev.ease)));
    return rev;
  }
  // exponential forgetting with a stability tied to the current interval (a heuristic, not a fitted model)
  function retention(rev, today) {
    if (!rev) return null;
    const S = IV()[rev.stage] * rev.ease * 1.5;
    return Math.exp(-Math.max(0, daysBetween(rev.last, today)) / S);
  }

  // ---------- knowledge per module ----------
  // prior from the learner's own status; evidence from answers; "learned" claims add a little, capped.
  // inputs: statuses {moduleId:status}, topicStatus {TOPIC:status}, analysis, learned {moduleId:"reported"|"verified"}, confirmed {TOPIC:true}
  function moduleKnowledge(m, st) {
    const status = (st.statuses && st.statuses[m.id]) || (st.topicStatus && st.topicStatus[m.topic]) || "none";
    let prior = CONFIG.statusPrior[status] != null ? CONFIG.statusPrior[status] : 0.05;
    const a = st.analysis; let k = prior, wEv = 0;
    if (a) {
      const mo = a.modules[m.id], tp = a.topics[m.topic];
      const nMod = mo ? mo.n : 0, nTop = tp ? tp.n : 0;
      const nEff = nMod + 0.5 * nTop;
      if (nEff > 0) {
        const ev = nMod >= 3 ? mo.mastery : (tp && nTop >= 2 ? tp.mastery : null);
        if (ev != null) { wEv = clamp(nEff / 6, 0, 1); k = wEv * ev + (1 - wEv) * prior; }
      }
    }
    const l = st.learned && st.learned[m.id];
    if (l === "reported") k = Math.min(Math.max(k, k + 0.10), 0.70);
    if (l === "verified") k = Math.min(Math.max(k, k + 0.25), 0.85);
    if (st.confirmed && st.confirmed[m.topic]) k = Math.max(k, 0.85);
    return { k: clamp(k, 0, 1), prior, evidence: wEv, status };
  }

  // ---------- priority ----------
  // Priority = 0.30 gap + 0.25 exam weight + 0.20 forgetting risk + 0.15 prerequisite + 0.10 urgency (all 0–1)
  function priorities(modules, st, today, examDate) {
    const W = CONFIG.priority, weights = st.weights || {}, maxW = Math.max(...Object.values(weights), 0.0001);
    const left = examDate ? Math.max(0, daysBetween(today, examDate)) : 180;
    return modules.map(m => {
      const kn = moduleKnowledge(m, st), gap = 1 - kn.k;
      const exam = (weights[m.topic] || 0) / maxW;
      const rev = st.reviews && st.reviews[m.id];
      let forget;
      if (rev) forget = 1 - retention(rev, today);
      else forget = kn.prior >= 0.55 && !(st.analysis && st.analysis.modules[m.id]) ? 0.5 : 0;     // "learned" long ago, never checked
      const prereq = PREREQ[m.id] != null ? PREREQ[m.id] : 0.2;
      const urgency = clamp(1 - left / 180, 0, 1) * (gap > 0.3 ? 1 : 0.5);
      const score = W.gap * gap + W.exam * exam + W.forget * forget + W.prereq * prereq + W.urgency * urgency;
      return { id: m.id, topic: m.topic, title: m.title, k: kn.k, status: kn.status, evidence: kn.evidence, gap, exam, forget, prereq, urgency, score: round(score, 4) };
    });
  }

  // ---------- study plan ----------
  // profile: { examDate, hoursPerDay, studyDays:[0..6], busyDates:[], maxSessionMin, breakMin, minutesByWeekday? }
  // state:   { modules, weights, analysis, statuses, topicStatus, learned, confirmed, reviews, supply:{moduleId:nQuestions}, done:{key:status} }
  function dayMinutes(profile, date) {
    if ((profile.busyDates || []).includes(date)) return 0;
    const wd = weekday(date);
    if (!(profile.studyDays || [1, 2, 3, 4, 5, 6, 0]).includes(wd)) return 0;
    const by = profile.minutesByWeekday && profile.minutesByWeekday[wd];
    return Math.max(0, Math.round(by != null ? by : (profile.hoursPerDay || 2) * 60));
  }
  const taskKey = t => [t.type, t.module || t.topic || "", t.part || ""].join(":");

  function buildPlan(profile, state, today, opts) {
    opts = opts || {};
    if (!validDate(profile.examDate)) return { error: "Ngày thi không hợp lệ" };
    const daysLeft = daysBetween(today, profile.examDate);
    if (daysLeft <= 0) return { error: "Ngày thi đã qua hoặc là hôm nay" };
    const maxSess = clamp(profile.maxSessionMin || 90, 30, 240), warnings = [];
    // 1) the days that can be studied. The day before the exam is a light day.
    const days = [];
    for (let i = 0; i < daysLeft; i++) {
      const date = addDays(today, i); let min = dayMinutes(profile, date);
      if (opts.ramp && i < opts.ramp.days) min = Math.round(min * opts.ramp.factor);
      if (i === daysLeft - 1) min = Math.min(min, 90);
      days.push({ date, minutes: min, phase: null, tasks: [] });
    }
    const capacity = days.reduce((s, d) => s + d.minutes, 0);
    if (capacity < 60) return { error: "Không còn thời gian học khả dụng trước ngày thi", capacity };
    // 2) what needs learning
    const pri = priorities(state.modules, state, today, profile.examDate).sort((a, b) => b.score - a.score);
    const supply = state.supply || {};
    const learnMin = m => clamp(Math.ceil(CONFIG.moduleMinutes * (1 - m.k)), 30, maxSess);
    const needLearn = pri.filter(m => m.k < 0.8);
    const learnTotal = needLearn.reduce((s, m) => s + Math.ceil(CONFIG.moduleMinutes * (1 - m.k)), 0);
    const practiceTotal = pri.reduce((s, m) => s + CONFIG.practiceQuestions * CONFIG.minutesPerQuestion * (0.4 + 0.6 * (1 - m.k)), 0);
    const newShare = learnTotal / Math.max(1, learnTotal + practiceTotal);
    const foundation = needLearn.filter(m => m.prereq >= 0.7 && m.k < 0.6);
    // topics the learner says they know well but has barely been tested on: offer a 10-question confirmation
    // instead of silently trusting the claim or making them relearn everything
    const claimed = Object.keys(state.weights || {}).filter(t => {
      const ms = pri.filter(m => m.topic === t); if (!ms.length) return false;
      const strong = ms.filter(m => m.status === "solid" || m.status === "confident").length / ms.length;
      const a = state.analysis && state.analysis.topics[t];
      return strong >= 0.6 && (!a || a.n < CONFIG.evidence.low) && !(state.confirmed && state.confirmed[t]);
    });
    const foundMin = foundation.reduce((s, m) => s + learnMin(m), 0) + claimed.length * 15;
    const mockMin = 2 * CONFIG.mock.sessionMinutes;
    const mockFits = capacity >= 2400;
    let p1 = clamp(foundMin / capacity, 0, 0.15);
    let p4 = clamp(0.15 + 0.15 * (1 - newShare), 0.15, 0.32);
    let p2 = clamp(newShare * 0.75, 0.08, 0.55);
    if (p1 + p2 + p4 > 0.88) { const f = 0.88 / (p1 + p2 + p4); p1 *= f; p2 *= f; p4 *= f; }
    const p3 = 1 - p1 - p2 - p4;
    const bounds = [p1, p1 + p2, p1 + p2 + p3].map(f => f * capacity);
    const phaseNames = ["Nền tảng & lấp lỗ hổng", "Học nội dung chính", "Củng cố & luyện tập", "Thi thử & ôn cuối"];
    // 3) phases by cumulative capacity
    let cum = 0;
    days.forEach(d => { d.phase = d.minutes ? (cum < bounds[0] ? 0 : cum < bounds[1] ? 1 : cum < bounds[2] ? 2 : 3) : null; cum += d.minutes; });
    let last = 0; days.forEach(d => { if (d.phase == null) d.phase = last; else last = d.phase; });
    const phases = phaseNames.map((name, i) => { const ds = days.filter(d => d.phase === i); return { id: i + 1, name, from: ds.length ? ds[0].date : null, to: ds.length ? ds[ds.length - 1].date : null, minutes: ds.reduce((s, d) => s + d.minutes, 0) }; });
    // 4) queues
    const doneKeys = state.done || {};
    const skip = t => doneKeys[taskKey(t)] === "verified" || doneKeys[taskKey(t)] === "reported";
    const mkLearn = m => ({ type: "learn", topic: m.topic, module: m.id, title: `Học: ${m.title}`, min: learnMin(m), reason: m.k < 0.35 ? "Kiến thức nền còn thiếu" : "Còn khoảng trống so với yêu cầu", prio: m.score });
    const mkPractice = (m, n, label) => { const have = supply[m.id] || 0, q = Math.min(n, have); return have ? { type: "practice", topic: m.topic, module: m.id, title: `${label || "Luyện"}: ${m.title} (${q} câu)`, n: q, min: Math.ceil(q * CONFIG.minutesPerQuestion), reason: "Củng cố bằng câu hỏi thật trong ngân hàng", prio: m.score } : null; };
    const Q1 = claimed.map(t => ({ type: "confirm", topic: t, title: `Kiểm tra xác nhận topic ${t} (10 câu)`, n: 10, min: 15, part: "c", reason: "Bạn tự đánh giá đã học kỹ nhưng chưa đủ bài làm: xác nhận thay vì học lại hoặc bỏ qua", prio: 1 }))
      .concat(foundation.map(mkLearn)).filter(t => !skip(t));
    const Q2 = needLearn.filter(m => !foundation.includes(m)).map(mkLearn).filter(t => !skip(t));
    const Q3 = [];
    [1, 2].forEach(round_ => pri.forEach(m => { const t = mkPractice(m, round_ === 1 ? CONFIG.practiceQuestions : 10, round_ === 1 ? "Luyện" : "Luyện lại điểm yếu"); if (t) { t.part = "r" + round_; if (round_ === 2 && m.k > 0.7) return; Q3.push(t); } }));
    const queues = [Q1, Q2, Q3, []];
    const placed = [], deferred = [];
    // protected minimum time for every topic: one maintenance practice task per topic, spread through phase 3
    const mainten = state.weights ? Object.keys(state.weights).map(t => { const m = pri.filter(x => x.topic === t).sort((a, b) => a.k - b.k)[0]; return m && mkPractice(m, 10, "Duy trì"); }).filter(Boolean) : [];
    mainten.forEach(t => { t.part = "m"; Q3.push(t); });
    // 5) fill the days
    const reviewDue = (date) => Object.entries(state.reviews || {}).filter(([, r]) => r.next <= date && daysBetween(today, date) >= 0).map(([id]) => id);
    const scheduledReviews = {};
    const mockDays = [];
    if (mockFits || capacity >= 1500) {
      const p4days = days.filter(d => d.phase === 3 && d.minutes >= 120 && d.date !== days[days.length - 1].date);
      const nMock = p4days.length ? clamp(Math.floor(p4days.length / 6), 1, 4) : 0;
      for (let i = 0; i < nMock; i++) mockDays.push(p4days[Math.floor((i + 0.5) * p4days.length / nMock)].date);
      if (!nMock) warnings.push("Không có ngày nào đủ dài (từ 2 giờ) để thi thử trong giai đoạn cuối; hãy dành ít nhất một ngày dài.");
    } else warnings.push("Thời gian khả dụng chưa đủ cho bài thi thử 180 câu đầy đủ; nên tăng giờ học hoặc thi thử từng phần 90 câu.");
    days.forEach((d, di) => {
      if (!d.minutes) return;
      let left = d.minutes; const add = t => { d.tasks.push({ ...t, id: `${d.date}#${d.tasks.length + 1}`, status: "todo", date: d.date }); left -= t.min; placed.push(t); };
      const isLast = di === days.length - 1;
      if (isLast) {                                    // light day before the exam: formulas, flagged errors, rest
        add({ type: "review", topic: null, module: null, title: "Ôn công thức và xem lại lỗi sai", min: Math.min(left, 45), reason: "Ngày trước kỳ thi: nhẹ nhàng, không học nội dung mới", link: "#/cards" });
        return;
      }
      if (mockDays.includes(d.date)) {
        const need = CONFIG.mock.sessionMinutes;
        if (left >= need) { add({ type: "mock", title: "Thi thử phiên 1 (90 câu · 135 phút)", min: need, reason: "Mô phỏng điều kiện thi; dùng trang Mock exams", link: "#/mock", part: d.date + "a" }); }
        if (left >= need) add({ type: "mock", title: "Thi thử phiên 2 (90 câu · 135 phút)", min: need, reason: "Phiên thứ hai của bài thi thử", link: "#/mock", part: d.date + "b" });
        else if (left > 0) { /* second session continues next day */ }
        return;
      }
      if (di > 0 && mockDays.includes(days[di - 1].date)) add({ type: "review", title: "Phân tích bài thi thử và ôn lỗi sai", min: Math.min(left, 60), reason: "Rút kinh nghiệm theo topic và thời gian làm bài", link: "#/analysis" });
      // spaced reviews first (up to a quarter of the day)
      const cap = Math.floor(d.minutes * 0.25);
      for (const id of reviewDue(d.date).concat(Object.keys(scheduledReviews).filter(k => scheduledReviews[k] <= d.date))) {
        if (left <= 20 || d.tasks.filter(t => t.type === "review").length * 15 >= cap) break;
        const m = state.modules.find(x => x.id === id); if (!m || (supply[id] || 0) < 3) continue;
        if (d.tasks.some(t => t.module === id)) continue;
        add({ type: "review", topic: m.topic, module: id, n: Math.min(5, supply[id]), title: `Ôn ngắt quãng: ${m.title}`, min: 15, reason: "Đến hạn ôn lại để chống quên", part: d.date });
        delete scheduledReviews[id];
      }
      const q = queues[d.phase];
      let guard = 0;
      while (left >= 25 && guard++ < 40) {
        let i = q.findIndex(t => t.min <= left); if (i < 0) i = -1;
        if (i < 0) { // nothing fits in the queue: fall back to the next phase's queue, then to weakest-module practice
          const alt = queues[Math.min(3, d.phase + 1)].findIndex(t => t.min <= left);
          if (alt >= 0 && d.phase < 3) { add(queues[d.phase + 1].splice(alt, 1)[0]); continue; }
          const w = pri.filter(m => (supply[m.id] || 0) >= 5).sort((a, b) => b.score - a.score)[(guard + di) % Math.max(1, Math.min(8, pri.length))];
          const t = w && mkPractice(w, Math.max(5, Math.floor(left / CONFIG.minutesPerQuestion)), "Luyện bổ sung");
          if (t) { t.part = "f" + di + "-" + guard; t.min = Math.min(t.min, left); add(t); continue; }
          break;
        }
        const t = q.splice(i, 1)[0]; add(t);
        if (t.type === "learn") {                       // schedule the follow-up reviews (1 / 3 / 7 / 14 / 30 days)
          const rv = state.reviews && state.reviews[t.module]; const iv = (rv ? [IV()[Math.min(IV().length - 1, rv.stage)]] : IV()).slice(0, 5);
          let at = d.date; iv.forEach(x => { at = addDays(at, x); if (daysBetween(at, profile.examDate) > 1) scheduledReviews[t.module] = scheduledReviews[t.module] && scheduledReviews[t.module] < at ? scheduledReviews[t.module] : at; });
        }
      }
    });
    // anything that never fitted is reported, not silently dropped
    queues.forEach((q, i) => q.forEach(t => { if (t.part !== "m" && t.part !== "r2") deferred.push({ type: t.type, module: t.module, topic: t.topic, title: t.title, min: t.min, phase: i + 1 }); }));
    const placedMin = days.reduce((s, d) => s + d.tasks.reduce((x, t) => x + t.min, 0), 0);
    const deferredMin = deferred.reduce((s, t) => s + t.min, 0);
    const workDays = days.filter(d => d.minutes).length;
    const suggestedHours = deferredMin > 0 && workDays ? round(Math.ceil(((capacity + deferredMin * 1.1) / workDays) / 30) / 2, 1) : null;
    if (deferredMin > 0) warnings.push(`Với ${round((profile.hoursPerDay || 2), 1)} giờ/ngày, còn ${Math.round(deferredMin / 60 * 10) / 10} giờ nội dung chưa xếp vào lịch (ưu tiên thấp). Hãy tăng giờ học (khoảng ${suggestedHours} giờ/ngày), dời ngày thi hoặc chấp nhận bỏ các mục này.`);
    // sessions: group the day's tasks so that no session is longer than the learner's maximum
    days.forEach(d => {
      d.sessions = []; let cur = null;
      d.tasks.forEach(t => { if (!cur || cur.minutes + t.min > maxSess) { cur = { minutes: 0, tasks: [] }; d.sessions.push(cur); } cur.tasks.push(t.id); cur.minutes += t.min; });
    });
    return { error: null, createdAt: today, examDate: profile.examDate, daysLeft, capacity, placedMinutes: placedMin, deferred, deferredMinutes: deferredMin, suggestedHours,
      phases, days, warnings, assumptions: { moduleMinutes: CONFIG.moduleMinutes, practiceQuestions: CONFIG.practiceQuestions, minutesPerQuestion: CONFIG.minutesPerQuestion, priorityWeights: CONFIG.priority }, priorities: pri.slice(0, 20) };
  }

  // ---------- adaptive behavior ----------
  // minutes actually studied vs planned, last `window` days. Returns a gentler load when the plan was not met.
  function adherence(plan, log, today, window) {
    window = window || 14;
    const from = addDays(today, -window); let planned = 0, done = 0, missedDays = 0;
    (plan && plan.days || []).forEach(d => { if (d.date >= from && d.date < today && d.minutes) { planned += d.minutes; const m = (log && log[d.date]) || 0; done += Math.min(m, d.minutes); if (m === 0) missedDays++; } });
    // consecutive days with nothing done, counted back from yesterday
    let streak = 0; for (let i = 1; i <= window; i++) { const dd = addDays(today, -i); const pd = (plan && plan.days || []).find(x => x.date === dd); if (pd && pd.minutes && !((log && log[dd]) > 0)) streak++; else if (pd && pd.minutes) break; }
    return { planned, done, rate: planned ? done / planned : null, missedDays, missStreak: streak };
  }
  // Re-plan from `today`. Missed tasks are never marked done and never lower mastery; they simply re-enter
  // the queue by priority. After a gap the next days carry a lighter load so the plan stays feasible.
  function replan(profile, state, today, prev, log, reason) {
    const adh = adherence(prev, log, today);
    const opts = {};
    if (adh.missStreak >= 3) opts.ramp = { days: 3, factor: 0.8 };
    let p = profile;
    if (adh.rate != null && adh.rate < 0.6 && adh.planned > 240 && adh.missStreak < 3 && (prev.days || []).filter(d => d.date < today && d.minutes).length >= 7) {   // chronic shortfall, not a short break             // plan was not met: plan for what the learner really does
      const real = Math.max(adh.done / Math.max(1, (prev.days || []).filter(d => d.date < today && d.minutes).length) * 1.15, (profile.hoursPerDay || 2) * 60 * 0.6);
      p = { ...profile, hoursPerDay: round(real / 60, 2) };
      opts.adjusted = true;
    }
    const plan = buildPlan(p, state, today, opts);
    if (plan.error) return { plan, adherence: adh, version: null };
    if (opts.adjusted) plan.warnings.unshift(`Bạn hoàn thành ${Math.round(adh.rate * 100)}% kế hoạch gần đây nên lịch mới giảm xuống ${p.hoursPerDay} giờ/ngày cho khả thi. Nếu muốn giữ ${profile.hoursPerDay} giờ/ngày, hãy tăng giờ học thực tế.`);
    if (opts.ramp) plan.warnings.unshift(`Bạn đã bỏ ${adh.missStreak} ngày liên tiếp: 3 ngày tới nhẹ hơn 20% để quay lại nhịp học. Điểm năng lực không bị ảnh hưởng.`);
    return { plan, adherence: adh, reason: reason || (adh.missStreak >= 1 ? "missed-days" : "update") };
  }
  // keep the old plans: the new one is added, nothing is deleted (only the oldest full plans are trimmed to a summary)
  function pushVersion(versions, plan, reason, today) {
    const list = (versions || []).slice();
    list.push({ v: list.length + 1, createdAt: today, reason, summary: summarizePlan(plan), plan });
    for (let i = 0; i < list.length - 3; i++) if (list[i].plan) list[i] = { ...list[i], plan: null };
    return list;
  }
  function summarizePlan(plan) {
    const byTopic = {}; plan.days.forEach(d => d.tasks.forEach(t => { if (t.topic) byTopic[t.topic] = (byTopic[t.topic] || 0) + t.min; }));
    return { daysLeft: plan.daysLeft, capacity: plan.capacity, placedMinutes: plan.placedMinutes, deferredMinutes: plan.deferredMinutes, phases: plan.phases.map(p => ({ id: p.id, from: p.from, to: p.to, minutes: p.minutes })), byTopic };
  }

  // ---------- completion rules ----------
  // A task is never "done" because it was shown. practice tasks are verified by real answers; learn tasks can be
  // self-reported and are verified by a short check; self-reports never change the mastery estimate.
  function completeTask(task, evidence) {
    evidence = evidence || {};
    if (task.type === "practice" || task.type === "review") {
      const need = Math.max(1, Math.ceil((task.n || 5) * 0.8));
      return (evidence.answered || 0) >= need ? { status: "verified" } : { status: "todo", reason: `Cần trả lời ít nhất ${need} câu của ${task.n || 5} câu để tính là hoàn thành` };
    }
    if (task.type === "learn") {
      if (evidence.checkTotal >= 5) return evidence.checkCorrect / evidence.checkTotal >= 0.6 ? { status: "verified" } : { status: "reported", reason: "Điểm kiểm tra nhanh thấp: đã ghi nhận bạn tự báo cáo, chưa tính là nắm vững" };
      if (evidence.selfReport) return { status: "reported" };
      return { status: "todo", reason: "Bấm “Tôi đã học xong” hoặc làm bài kiểm tra nhanh 5 câu" };
    }
    if (task.type === "confirm") return evidence.confirmDone ? { status: "verified" } : { status: "todo", reason: "Làm bài kiểm tra xác nhận 10 câu của topic này" };
    if (task.type === "mock") return evidence.mockFinished ? { status: "verified" } : { status: "todo", reason: "Hoàn thành bài thi thử trong Mock exams để tính" };
    return evidence.selfReport ? { status: "reported" } : { status: "todo" };
  }

  // ---------- readiness (internal index, not a pass probability) ----------
  function readiness(analysis, weights, selfRatings) {
    let v = 0, lo = 0, hi = 0, covered = 0, topicsN = 0;
    Object.keys(weights).forEach(t => {
      topicsN++;
      const a = analysis.topics[t]; const w = weights[t];
      if (a && a.n >= CONFIG.evidence.insufficient) { covered++; v += w * a.mastery; lo += w * a.ci[0]; hi += w * a.ci[1]; }
      else { const p = selfRatings && selfRatings[t] ? CONFIG.selfPrior[selfRatings[t]] : 0.5; v += w * Math.min(p, 0.5); lo += w * 0.15; hi += w * 0.75; }
    });
    const enough = covered >= 5 && analysis.evidenceTotal >= 20;
    return { value: Math.round(v * 100), low: Math.round(lo * 100), high: Math.round(hi * 100), covered, topics: topicsN, enough,
      label: !enough ? "Chưa đủ dữ liệu" : v >= 0.75 ? "Khá vững" : v >= 0.6 ? "Đang tiến bộ" : v >= 0.45 ? "Cần củng cố" : "Cần học thêm",
      note: "Chỉ số nội bộ = tổng có trọng số theo tỷ trọng topic của mức nắm vững ước tính (độ khó được tính trọng số, topic thiếu dữ liệu được kéo về mức thận trọng). Khoảng [thấp–cao] là khoảng tin cậy 90% và rất rộng khi ít câu hỏi. Đây KHÔNG phải xác suất đỗ CFA." };
  }

  // does a confirmation test show mastery? (n ≥ 10 and difficulty-weighted accuracy ≥ 80%)
  function evaluateConfirm(rows) {
    const t = tally(rows, null);
    return { passed: t.n >= 10 && t.wAcc >= CONFIG.bands.strong, n: t.n, wAcc: t.wAcc, ci: t.ci };
  }

  // evidence gathered so far, for a "what would I need to know" panel
  function evidenceSummary(analysis) {
    const out = { insufficient: [], low: [], ok: [] };
    Object.keys(analysis.topics).forEach(t => { const c = analysis.topics[t].confidence; (c === "insufficient" ? out.insufficient : c === "low" ? out.low : out.ok).push(t); });
    return out;
  }

  return { CONFIG, PREREQ, KINDS, hash, rng, dayNum, addDays, daysBetween, weekday, validDate, weightsFromTopics, normalizePool, allocate, buildAssessment,
    newSession, remainingSec, isOpen, answer, submit, attemptsFromSession, wilson, confidenceOf, bandOf, firstAttempts, tally, classifyErrors, analyze,
    startReview, recordReview, retention, moduleKnowledge, priorities, dayMinutes, taskKey, buildPlan, adherence, replan, pushVersion, summarizePlan,
    completeTask, readiness, evaluateConfirm, evidenceSummary };
});

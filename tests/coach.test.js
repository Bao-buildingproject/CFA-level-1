// Hoa Tiêu (CFA Compass) v2: the learning engine and the diagnostic question bank.
// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");
const CE = require("../js/coach/engine.js");

// Load the site's data scripts exactly as the browser does (shared global scope).
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const files = ["js/syllabus.js", "js/modules.js", "js/data/qbank.js",
  ...fs.readdirSync(path.join(__dirname, "../js/data")).filter(f => /^q-.*\.js$/.test(f)).map(f => "js/data/" + f),
  "js/coach/bank.js", ...["qm", "eco", "fsa", "ci", "eq", "fi", "der", "alt", "pm", "eth", "hard"].map(t => `js/coach/q-${t}.js`)];
files.forEach(f => vm.runInThisContext(read(f), { filename: f }));
const get = expr => vm.runInThisContext(expr);
const STARTER = get("STARTER_QUESTIONS"), TOPICS = get("TOPICS"), MODULES = get("MODULES");
const POOL = CE.normalizePool(STARTER);
const WEIGHTS = CE.weightsFromTopics(TOPICS);
const META = {}; STARTER.forEach(q => { META[q.id] = { ...POOL.find(p => p.id === q.id), ans: q.ans }; });
const meta = id => META[id];
const SUPPLY = {}; POOL.forEach(q => { SUPPLY[q.module] = (SUPPLY[q.module] || 0) + 1; });
const MODS = MODULES.map(m => ({ id: m.id, topic: m.topic, title: m.title }));
const TODAY = "2026-11-24";
const TOPIC_IDS = TOPICS.map(t => t.id);

// ---- helpers ----
const analyze = rows => CE.analyze(rows, { weights: WEIGHTS, topicIds: TOPIC_IDS });
function baseState(over) {
  return { modules: MODS, weights: WEIGHTS, analysis: analyze([]), statuses: {}, topicStatus: {}, learned: {}, confirmed: {}, reviews: {}, progress: {}, supply: SUPPLY, seen: {}, qb: {}, remediation: [], hasDiagnostic: true, done: {}, ...over };
}
const profile = over => ({ examDate: "2027-05-13", hoursPerDay: 3, studyDays: [0, 1, 2, 3, 4, 5, 6], busyDates: [], maxSessionMin: 90, breakMin: 10, slot: "evening", ...over });
const allStatus = s => Object.fromEntries(TOPIC_IDS.map(t => [t, s]));
// attempts for a topic: n questions, `right` of them right, in an exam-style session
function attempts(topic, n, right, o) {
  o = o || {};
  const qs = POOL.filter(q => q.topic === topic && (!o.module || q.module === o.module)).slice(o.offset || 0, (o.offset || 0) + n);
  return qs.map((q, i) => ({ q: q.id, t: topic, m: q.module, s: q.skill, d: q.diff, ok: i < right, pick: "A", sec: o.sec || 60, est: q.est, calc: q.isCalc, trap: false, ts: o.ts || "2026-11-20", src: o.src || "full90", sess: o.sess || "s1" }));
}
const planFor = (over, st) => CE.buildPlan(profile(over), baseState(st), TODAY);
const tasks = p => p.days.flatMap(d => d.tasks);
const taskMin = (p, f) => tasks(p).filter(f).reduce((s, t) => s + t.min, 0);

// ---------------- question bank ----------------
test("bank: 180 coach questions, 18 per topic, easy/medium/hard mixed, with trap answers", () => {
  const coach = STARTER.filter(q => q.src === "coach");
  assert.equal(coach.length, 180);
  assert.equal(new Set(coach.map(q => q.id)).size, 180);
  for (const t of TOPIC_IDS) {
    const qs = coach.filter(q => q.topic === t);
    assert.equal(qs.length, 18, t);
    assert.ok([1, 2, 3].every(d => qs.filter(q => q.diff === d).length >= 4), `${t} has at least 4 easy, 4 medium and 4 hard`);
    assert.ok(new Set(qs.slice(0, 6).map(q => q.diff)).size >= 2, `${t} difficulty is mixed, not sorted`);
  }
  for (const q of coach) {
    assert.ok(MODULES.some(m => m.id === q.module), `${q.id} module ${q.module}`);
    assert.ok(["A", "B", "C"].includes(q.ans));
    assert.ok(["A", "B", "C"].includes(q.trapKey) && q.trapKey !== q.ans, `${q.id} trap answer`);
    assert.equal(new Set([q.A, q.B, q.C]).size, 3, `${q.id} options are distinct`);
    assert.ok(q.why.length > 20 && q.skill && q.est > 0);
  }
  const letters = { A: 0, B: 0, C: 0 }; coach.forEach(q => letters[q.ans]++);
  assert.ok(Object.values(letters).every(n => n > 40), "the correct answer is spread over A, B and C");
});

// ---------------- dates ----------------
test("dates: day arithmetic ignores daylight saving and time zones", () => {
  assert.equal(CE.daysBetween("2027-03-13", "2027-03-15"), 2);
  assert.equal(CE.daysBetween("2026-10-30", "2026-11-02"), 3);
  assert.equal(CE.addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(CE.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(CE.weekday("2027-05-13"), 4);
  assert.equal(CE.validDate("2027-02-30"), false);
  for (const tz of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles"]) { process.env.TZ = tz; assert.equal(CE.daysBetween("2026-11-24", "2027-05-13"), 170, tz); }
  process.env.TZ = "UTC";
});

// ---------------- assessments ----------------
test("assessment: 30 and 60 questions, every topic, weighted, difficulties and question types mixed", () => {
  const quick = CE.buildAssessment(POOL, "quick45", { seed: "u1", weights: WEIGHTS });
  const full = CE.buildAssessment(POOL, "full90", { seed: "u1", weights: WEIGHTS });
  assert.equal(quick.length, 30); assert.equal(full.length, 60); assert.equal(new Set(full).size, 60);
  const count = (ids, t) => ids.filter(id => META[id].topic === t).length;
  for (const t of TOPIC_IDS) { assert.ok(count(quick, t) >= 2, `quick ${t}`); assert.ok(count(full, t) >= 2, `full ${t}`); }
  assert.ok(count(full, "FI") > count(full, "ECO"), "an 11–14% topic gets more questions than a 6–9% one");
  const d = [1, 2, 3].map(x => full.filter(id => META[id].diff === x).length);
  assert.ok(d.every(n => n >= 8), `all difficulties present ${d}`);
  const calc = full.filter(id => META[id].isCalc).length;
  assert.ok(calc >= 12 && full.length - calc >= 12, `calculation and concept questions both present (${calc} calc)`);
  const order = full.map(id => META[id].diff);
  assert.notDeepEqual(order, order.slice().sort(), "order is mixed, not easy → hard");
  assert.deepEqual(CE.buildAssessment(POOL, "quick45", { seed: "u1", weights: WEIGHTS }), quick, "same seed, same set");
  assert.notDeepEqual(CE.buildAssessment(POOL, "quick45", { seed: "u2", weights: WEIGHTS }), quick, "other accounts get other sets");
});
test("assessment: avoids repeats, repeats only when the pool runs out; module scope respected", () => {
  const first = CE.buildAssessment(POOL, "full90", { seed: "a", weights: WEIGHTS });
  const second = CE.buildAssessment(POOL, "full90", { seed: "b", weights: WEIGHTS, seen: first });
  assert.equal(second.filter(id => first.includes(id)).length, 0);
  const tiny = POOL.filter(q => q.topic === "ALT").slice(0, 3);
  assert.equal(CE.buildAssessment(tiny, "check", { seed: "x", topic: "ALT", n: 5, seen: tiny.map(q => q.id) }).length, 3);
  const ids = CE.buildAssessment(POOL, "practice", { seed: "t", module: "FI-06", n: 8 });
  assert.ok(ids.length >= 3 && ids.every(id => META[id].module === "FI-06"));
});
test("mock: 180 questions in two sessions of 90, by topic weight, grouped by topic, no repeats", () => {
  const m = CE.buildMock(POOL, { seed: "m1", weights: WEIGHTS, order: TOPIC_IDS });
  assert.equal(m.parts[0].length, 90); assert.equal(m.parts[1].length, 90);
  const all = m.parts.flat(); assert.equal(new Set(all).size, 180);
  assert.equal(Object.values(m.alloc).reduce((a, b) => a + b, 0), 180);
  for (const t of TOPIC_IDS) assert.ok(m.alloc[t] >= 10, `${t} ${m.alloc[t]}`);
  assert.ok(m.alloc.FI > m.alloc.ECO && m.alloc.PM > m.alloc.DER);
  const seq = all.map(id => META[id].topic); let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
  assert.equal(changes, TOPIC_IDS.length - 1, "questions grouped by topic, in the site's topic order");
  const m2 = CE.buildMock(POOL, { seed: "m2", weights: WEIGHTS, order: TOPIC_IDS, seen: all });
  assert.equal(m2.parts.flat().filter(id => all.includes(id)).length, 0, "a second mock uses new questions");
});

// ---------------- sessions ----------------
test("session: the clock starts only when the learner starts; 45 minutes later answers are refused", () => {
  const ids = CE.buildAssessment(POOL, "quick45", { seed: "s", weights: WEIGHTS });
  const s = CE.newSession("quick45", ids, { id: "s1" }), t0 = Date.UTC(2026, 10, 24, 9);
  assert.equal(CE.answer(s, ids[0], "A", t0).reason, "not-started", "an intro page can be read without the clock running");
  assert.equal(CE.remainingSec(s, t0 + 3600e3), 45 * 60);
  CE.startSession(s, t0);
  assert.equal(CE.answer(s, ids[0], "B", t0 + 60e3).ok, true);
  assert.equal(s.secs[ids[0]], 60);
  CE.visit(s, 1, t0 + 100e3);
  assert.equal(CE.remainingSec(s, t0 + 44 * 60e3), 60);
  assert.equal(CE.isOpen(s, t0 + 45 * 60e3), false);
  assert.deepEqual(CE.answer(s, ids[1], "A", t0 + 45 * 60e3 + 1000), { ok: false, reason: "expired" });
  CE.submit(s, t0 + 50 * 60e3);
  assert.equal(s.expired, true);
  assert.equal(CE.answer(s, ids[0], "C", t0 + 51 * 60e3).reason, "submitted");
  assert.equal(s.answers[ids[0]], "B");
  assert.ok(s.secs[ids[1]] <= 600, "an idle tab counts at most 10 minutes on one question");
});
test("session: a 90-minute exam keeps answers, flags and position after a reload", () => {
  const ids = CE.buildAssessment(POOL, "full90", { seed: "r", weights: WEIGHTS });
  const t0 = 1_800_000_000_000, s = CE.startSession(CE.newSession("full90", ids, { id: "r1" }), t0);
  ids.slice(0, 20).forEach((id, i) => { CE.visit(s, i, t0 + i * 30e3); CE.answer(s, id, "ABC"[i % 3], t0 + i * 30e3 + 20e3); });
  s.flags[ids[3]] = true;
  const back = JSON.parse(JSON.stringify(s));
  assert.deepEqual(back.answers, s.answers); assert.equal(back.flags[ids[3]], true); assert.equal(back.current, 19);
  assert.equal(CE.remainingSec(back, t0 + 30 * 60e3), 60 * 60, "the clock runs on wall time");
  assert.equal(CE.answer(back, ids[20], "A", t0 + 31 * 60e3).ok, true);
});
test("session: nothing in a session reveals the answer key", () => {
  const ids = CE.buildAssessment(POOL, "quick45", { seed: "k", weights: WEIGHTS });
  const s = CE.startSession(CE.newSession("quick45", ids, { id: "k1" }), 1);
  assert.ok(!/"ans"|"trap"|correct|why/i.test(JSON.stringify(s)));
  assert.equal(CE.answer(s, "nope", "A", 2).reason, "not-in-session");
  assert.equal(CE.answer(s, ids[0], "D", 2).reason, "bad-choice");
});
test("session: practice mode is untimed, an answer shown cannot be changed, skipped questions are not recorded", () => {
  const ids = CE.buildAssessment(POOL, "practice", { seed: "p", module: "FI-06", n: 4 });
  const s = CE.startSession(CE.newSession("practice", ids, { id: "p1" }), 0);
  assert.equal(CE.remainingSec(s, 99 * 3600e3), Infinity);
  assert.equal(CE.answer(s, ids[0], META[ids[0]].ans, 40e3).ok, true);
  assert.equal(CE.answer(s, ids[0], "A", 50e3).reason, "revealed");
  CE.visit(s, 1, 200e3);
  assert.equal(s.secs[ids[0]], 40, "time stops once the answer is shown");
  CE.submit(s, 300e3);
  const rows = CE.attemptsFromSession(s, meta, TODAY);
  assert.equal(rows.length, 1); assert.equal(rows[0].ok, true); assert.equal(rows[0].sec, 40);
});
test("session: grading marks right, wrong, unanswered and a chosen trap answer", () => {
  const ids = CE.buildAssessment(POOL.filter(q => q.src === "coach"), "check", { seed: "g", topic: "FI", n: 5 });
  const s = CE.startSession(CE.newSession("check", ids, { id: "g1" }), 10);
  CE.answer(s, ids[0], META[ids[0]].ans, 11);
  CE.visit(s, 1, 12); CE.answer(s, ids[1], META[ids[1]].trap, 13);
  CE.submit(s, 14);
  const rows = CE.attemptsFromSession(s, meta, TODAY);
  assert.deepEqual(rows.map(r => r.ok), [true, false, null, null, null]);
  assert.equal(rows[1].trap, true); assert.equal(rows[0].trap, false);
  const packed = rows.map(CE.packAttempt), back = packed.map(p => CE.unpackAttempt(p, meta));
  assert.deepEqual(back, rows, "compact storage round-trips");
  assert.ok(JSON.stringify(packed).length < 200);
});

// ---------------- analysis ----------------
test("analysis: bands, uncertainty and 'insufficient evidence'", () => {
  const a = analyze([...attempts("FI", 10, 4), ...attempts("QM", 10, 9), ...attempts("ECO", 3, 3)]);
  assert.equal(a.topics.QM.band, "strong"); assert.equal(a.topics.FI.band, "weak");
  assert.equal(a.topics.ECO.band, "unknown"); assert.equal(a.topics.ECO.confidence, "insufficient");
  assert.equal(a.topics.DER.n, 0);
  const [lo, hi] = a.topics.FI.ci; assert.ok(lo < 0.4 && hi > 0.4 && hi - lo > 0.3);
  assert.ok(CE.evidenceSummary(a).insufficient.includes("ECO"));
  assert.ok(a.topics.FI.time && a.topics.FI.time.avgSec === 60);
});
test("analysis: only the first attempt at a question counts", () => {
  const one = attempts("QM", 6, 2);
  const a = analyze(one.concat(one.map(r => ({ ...r, ok: true, ts: "2026-11-23", src: "practice" })), one.map(r => ({ ...r, ok: true, ts: "2026-11-24", src: "review" }))));
  assert.equal(a.topics.QM.n, 6); assert.equal(a.topics.QM.k, 2);
});
test("analysis: a hard question outweighs an easy one; difficulty is reported", () => {
  const easy = { q: "e", t: "QM", m: "QM-01", s: "x", d: 1, ok: true }, hard = { q: "h", t: "QM", m: "QM-01", s: "x", d: 3, ok: false };
  assert.ok(CE.tally([{ ...easy, ok: false }, { ...hard, ok: true }], null).wAcc > CE.tally([easy, hard], null).wAcc);
  assert.deepEqual(CE.tally([easy, hard], null).byDiff[1], { n: 1, k: 1 });
});
test("analysis: Question Bank marks count as 0.6 of a question and are not used for error classes", () => {
  const qb = Array.from({ length: 10 }, (_, i) => ({ q: "qb|f|" + i, t: "FI", m: "FI-06", s: "FI-06", d: null, ok: i < 5, src: "qb", ts: "" }));
  const a = analyze(qb);
  assert.equal(a.topics.FI.n, 10); assert.equal(a.topics.FI.nEff, 6);
  assert.equal(a.topics.FI.errors.total, 0);
});
test("analysis: weak modules and skills are named", () => {
  const fi = POOL.filter(q => q.topic === "FI");
  const row = (q, ok) => ({ q: q.id, t: "FI", m: q.module, s: q.skill, d: q.diff, ok, est: q.est, calc: q.isCalc, ts: "2026-11-20", src: "full90" });
  const a = analyze(fi.filter(q => q.module === "FI-06" || q.module === "FI-11").map(q => row(q, false)).concat(fi.filter(q => q.module === "FI-01").map(q => row(q, true))));
  assert.ok(a.modules["FI-06"].acc === 0 && a.modules["FI-01"].acc === 1);
  assert.ok(a.weakSkills.some(w => w.module === "FI-06" || w.module === "FI-11"));
  assert.ok(a.weakSkills.every(w => w.preliminary === (w.n < 4)));
});
test("errors: trap answers, calculation vs concept, time, time sinks and possible carelessness — each with its evidence", () => {
  const coach = POOL.filter(q => q.src === "coach" && q.topic === "QM");
  const calc = coach.filter(q => q.isCalc), concept = coach.filter(q => !q.isCalc);
  const row = (q, o) => ({ q: q.id, t: "QM", m: q.module, s: q.skill, d: q.diff, ok: false, sec: 80, est: q.est, calc: q.isCalc, trap: false, ts: "2026-11-20", src: "full90", ...o });
  const rows = [row(calc[0], { trap: true }), row(calc[1], { trap: true }), row(calc[2], { trap: true }), row(concept[0], { trap: true }),
    row(concept[1]), row(calc[3], { sec: 400 }), row(concept[2], { ok: null, sec: 0 })];
  const e = CE.classifyErrors(rows, 0.3);
  assert.deepEqual(e.types, { time: 1, trapCalc: 3, trapConcept: 1, calc: 1, concept: 1 });
  assert.equal(e.evidence.trapCalc, "moderate"); assert.equal(e.evidence.concept, "insufficient");
  assert.equal(e.timeSink, 1);
  const easy = coach.filter(q => q.diff === 1).slice(0, 3).map(q => row(q, { sec: 5 }));
  assert.equal(CE.classifyErrors(easy, 0.9).carelessEvidence, "weak", "3 fast misses on easy questions in a strong topic");
  assert.equal(CE.classifyErrors(easy.slice(0, 2), 0.9).carelessEvidence, "insufficient", "2 are not enough to say");
  assert.equal(CE.classifyErrors(easy, 0.4).carelessEvidence, "insufficient", "not careless when the topic itself is weak");
});
test("trend: 38% → 57% → 78% on comparable tests reads as improving; different difficulty is not compared", () => {
  const qs = POOL.filter(q => q.topic === "FI" && q.diff === 2);
  const sessRows = (sess, n, right, ts, off) => qs.slice(off, off + n).map((q, i) => ({ q: q.id, t: "FI", m: q.module, s: q.skill, d: 2, ok: i < right, ts, src: "full90", sess }));
  const rows = [...sessRows("a", 8, 3, "2026-11-01", 0), ...sessRows("b", 7, 4, "2026-11-15", 8), ...sessRows("c", 9, 7, "2026-12-01", 15)];
  const t = CE.trend(rows);
  assert.equal(t.points.length, 3); assert.equal(t.status, "improving"); assert.ok(t.delta > 0.3);
  assert.equal(CE.trend(sessRows("a", 8, 3, "2026-11-01", 0)).status, "insufficient");
  const hard = rows.map(r => (r.sess === "c" ? { ...r, d: 3 } : { ...r, d: 1 }));
  assert.equal(CE.trend(hard).status, "not-comparable");
});
test("calibration: a high self-rating with weak results is flagged, and the reverse", () => {
  const a = CE.analyze(attempts("FI", 10, 3).concat(attempts("QM", 10, 9)), { weights: WEIGHTS, topicIds: TOPIC_IDS, selfRatings: { FI: 5, QM: 1, ECO: 5 } });
  assert.equal(a.topics.FI.calibration, "over"); assert.equal(a.topics.QM.calibration, "under"); assert.equal(a.topics.ECO.calibration, null);
});
test("remediation: 4 of the last 5 questions wrong in one skill needs remediation; 3 of 5 does not", () => {
  const qs = POOL.filter(q => q.module === "FI-06");
  const mk = (q, ok, ts) => ({ q: q.id, t: "FI", m: "FI-06", s: "Bond pricing", d: 2, ok, ts, src: "practice" });
  const bad = qs.slice(0, 5).map((q, i) => mk(q, i === 2, "2026-11-2" + i));
  assert.equal(CE.remediationNeeds(bad).length, 1);
  assert.equal(CE.remediationNeeds(bad)[0].wrong, 4);
  const ok = qs.slice(0, 5).map((q, i) => mk(q, i < 2, "2026-11-2" + i));
  assert.equal(CE.remediationNeeds(ok).length, 0);
  const redone = bad.concat(qs.slice(0, 2).map(q => mk(q, true, "2026-11-29")));
  assert.equal(CE.remediationNeeds(redone).length, 0, "the latest answer to each question is what counts");
});

// ---------------- knowledge and priority ----------------
test("knowledge: a 'confident' claim is not mastery; three wrong answers pull it down a little, twelve decide", () => {
  const m = MODS.find(x => x.id === "FI-06");
  const claim = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" } })).k;
  const few = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" }, analysis: analyze(attempts("FI", 3, 0, { module: "FI-01" })) })).k;
  const many = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" }, analysis: analyze(attempts("FI", 12, 3)) })).k;
  assert.ok(claim <= 0.9 && few < claim && few > claim - 0.4 && many < 0.5, `${claim} → ${few} → ${many}`);
  const zeroClaim = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "none" }, analysis: analyze(attempts("FI", 14, 14)) })).k;
  assert.ok(zeroClaim >= 0.8, `answers beat a modest claim (${zeroClaim})`);
  const reported = CE.moduleKnowledge(m, baseState({ learned: { "FI-06": "reported" } })).k, verified = CE.moduleKnowledge(m, baseState({ learned: { "FI-06": "verified" } })).k;
  assert.ok(reported < verified && reported <= 0.7);
});
test("priority: components are normalised and combined with the documented weights", () => {
  const p = CE.priorities(MODS, baseState({ topicStatus: allStatus("none") }), TODAY, "2027-05-13");
  p.forEach(x => ["gap", "exam", "forget", "prereq", "urgency"].forEach(k => assert.ok(x[k] >= 0 && x[k] <= 1, `${x.id} ${k}`)));
  const W = CE.CONFIG.priority, x = p[0];
  assert.ok(Math.abs(x.score - (W.gap * x.gap + W.exam * x.exam + W.forget * x.forget + W.prereq * x.prereq + W.urgency * x.urgency)) < 1e-3);
  assert.equal(Object.values(W).reduce((a, b) => a + b, 0).toFixed(2), "1.00");
});
test("improvement: scores 40% → 60% → 80% lower the priority of a topic", () => {
  const prio = n => CE.priorities(MODS, baseState({ topicStatus: allStatus("partial"), analysis: analyze(attempts("FI", 15, n)) }), TODAY, "2027-05-13").filter(p => p.topic === "FI").reduce((s, p) => s + p.score, 0);
  const [a, b, c] = [6, 9, 12].map(prio);
  assert.ok(a > b && b > c);
});

// ---------------- the plan ----------------
test("plan: every day until the exam, never more than the day's time, sessions within the limit, real links", () => {
  const plan = planFor({}, { topicStatus: allStatus("partial") });
  assert.equal(plan.error, null); assert.equal(plan.days.length, 170);
  assert.equal(plan.days[0].date, TODAY); assert.equal(plan.days[169].date, "2027-05-12");
  plan.days.forEach(d => assert.ok(d.tasks.reduce((s, t) => s + t.min, 0) <= d.minutes, d.date));
  plan.days.forEach(d => CE.daySessions(d, profile()).forEach(s => assert.ok(s.minutes <= 90 || s.tasks.length === 1, `${d.date} session ${s.minutes}`)));
  const ids = new Set();
  tasks(plan).forEach(t => { assert.ok(!ids.has(t.id)); ids.add(t.id); if (t.module) assert.ok(MODS.some(m => m.id === t.module), t.module);
    if (t.type === "practice") assert.ok(SUPPLY[t.module] >= t.n, "practice points at a module that has the questions"); assert.ok(t.min > 0); });
  assert.equal(plan.phases.length, 4); assert.ok(plan.phases.slice(1).every(p => p.from));
  assert.deepEqual(plan.days[169].tasks.map(t => t.type), ["final"], "the day before the exam is light");
  assert.ok(plan.days[169].minutes <= 60);
  const mocks = tasks(plan).filter(t => t.type === "mock");
  assert.ok(mocks.length >= 4 && mocks.every(t => t.min === 135 && t.n === 90), "full mocks: two 135-minute sessions each");
  assert.ok(tasks(plan).some(t => t.type === "mockReview"), "each mock is followed by its analysis");
  assert.ok(mocks.every(t => t.date < "2027-05-11"), "the last mock leaves time to review");
});
test("plan: learning follows the curriculum inside a topic; Quantitative Methods before Fixed Income; practice only after learning", () => {
  const plan = planFor({}, { topicStatus: allStatus("none") });
  const order = tasks(plan).filter(t => t.type === "learn" && !t.cont);
  const pos = id => order.findIndex(t => t.module === id);
  for (const t of TOPIC_IDS) {
    const ms = MODS.filter(m => m.topic === t).map(m => pos(m.id)).filter(i => i >= 0);
    assert.deepEqual(ms, ms.slice().sort((a, b) => a - b), `${t} modules in curriculum order`);
  }
  assert.ok(pos("QM-04") < pos("FI-06") && pos("QM-08") < pos("FI-06"), "time value of money and QM before bond valuation");
  const all = tasks(plan);
  all.forEach((t, i) => {
    if (t.type === "practice" && t.round === "mini") assert.ok(all.slice(0, i).some(u => u.type === "learn" && u.module === t.module && u.last !== false), `${t.module} practised after learning`);
    if (t.type === "test") assert.ok(!all.slice(i + 1).some(u => u.type === "learn" && u.topic === t.topic), `${t.topic} test after all of its learning`);
  });
  assert.ok(all.some(t => t.type === "test"), "topic tests are planned");
  assert.notEqual(all[0].type, "diag", "a diagnostic already done is not planned again");
  assert.equal(tasks(planFor({}, { topicStatus: allStatus("none"), hasDiagnostic: false }))[0].type, "diag", "no diagnostic yet: the plan starts with one");
});
test("plan: spaced reviews follow learning at 1, 3, 7, 14, 30-day gaps and an existing schedule is not repeated daily", () => {
  const plan = planFor({}, { topicStatus: allStatus("none") });
  const learnDay = {}; tasks(plan).forEach(t => { if (t.type === "learn" && t.last !== false && !(t.module in learnDay)) learnDay[t.module] = t.date; });
  const rev = {}; tasks(plan).forEach(t => { if (t.type === "review") (rev[t.module] = rev[t.module] || []).push(t.date); });
  const m = "QM-04", dates = [learnDay[m], ...rev[m]];
  const gaps = dates.slice(1).map((d, i) => CE.daysBetween(dates[i], d));
  assert.ok(gaps.length >= 4);
  [1, 3, 7, 14].forEach((g, i) => assert.ok(gaps[i] >= g && gaps[i] <= g + 3, `gap ${i}: ${gaps[i]} vs ${g}`));
  Object.entries(rev).forEach(([mod, ds]) => assert.ok(ds.every(d => d > learnDay[mod]), `${mod} reviewed only after learning`));
  // a learner with an existing review schedule: each module comes back a few times, not every day
  const reviews = {}; MODS.slice(0, 20).forEach(x => { reviews[x.id] = CE.startReview("2026-11-20"); });
  const p2 = planFor({}, { topicStatus: allStatus("solid"), reviews });
  const per = {}; tasks(p2).forEach(t => { if (t.type === "review" || (t.type === "reread" && t.step)) per[t.module] = (per[t.module] || 0) + 1; });
  Object.entries(per).forEach(([mod, n]) => assert.ok(n <= 10, `${mod} reviewed ${n} times in 170 days`));
  assert.ok(Object.keys(per).length >= 15);
});
test("plan: two accounts with different results and exam dates get different plans", () => {
  const a = planFor({ examDate: "2027-05-13", hoursPerDay: 3 }, { topicStatus: { ...allStatus("solid"), FI: "none" }, analysis: analyze(attempts("FI", 12, 3).concat(attempts("ETH", 12, 11))) });
  const b = planFor({ examDate: "2027-08-20", hoursPerDay: 5 }, { topicStatus: { ...allStatus("solid"), ETH: "none" }, analysis: analyze(attempts("ETH", 12, 3).concat(attempts("FI", 12, 11))) });
  const share = (p, t) => taskMin(p, x => x.topic === t) / Math.max(1, taskMin(p, x => x.topic));
  assert.ok(share(a, "FI") > share(a, "ETH") * 1.4, "A is weak in Fixed Income");
  assert.ok(share(b, "ETH") > share(b, "FI") * 1.4, "B is weak in Ethics");
  assert.ok(share(a, "ETH") > 0.03 && share(b, "FI") > 0.03, "the strong topic is kept up, not dropped");
  assert.ok(b.capacity > a.capacity); assert.equal(b.phases[3].to, "2027-08-19");
});
test("plan: the same inputs always give the same plan", () => {
  const st = { topicStatus: allStatus("partial") };
  assert.deepEqual(planFor({}, st), planFor({}, st));
});
test("plan: a new learner gets a foundation plan; a learner who finished everything gets revision and mocks", () => {
  const fresh = planFor({}, { topicStatus: allStatus("none") });
  const done = planFor({}, { topicStatus: allStatus("confident"), analysis: analyze(TOPIC_IDS.flatMap(t => attempts(t, 14, 13))) });
  const learn = p => taskMin(p, t => t.type === "learn");
  assert.ok(learn(fresh) > 100 * 60 && learn(done) < learn(fresh) / 8, `${learn(fresh)} vs ${learn(done)}`);
  assert.ok(fresh.days.slice(0, 5).some(d => d.tasks.some(t => t.module === "QM-04")), "time value of money in the first days");
  assert.ok(done.phases[3].minutes / done.capacity >= fresh.phases[3].minutes / fresh.capacity - 0.01);
  assert.ok(tasks(done).filter(t => t.type === "mock").length >= 4);
});
test("plan: not enough time — every topic still gets its share, the rest is listed with the hours needed", () => {
  const plan = planFor({ examDate: "2027-01-23", hoursPerDay: 1 }, { topicStatus: allStatus("none"), hasDiagnostic: false });
  assert.equal(plan.error, null);
  const learned = new Set(tasks(plan).filter(t => t.type === "learn").map(t => t.topic));
  assert.equal(learned.size, 10, "no topic is dropped");
  assert.ok(plan.deferredMinutes > 1200 && plan.suggestedHours > 1);
  assert.ok(plan.deferred.every(t => t.min > 0 && t.type));
  assert.ok(plan.warnings.some(w => /chưa xếp được/.test(w)));
  assert.ok(plan.placedMinutes <= plan.capacity);
  assert.ok(plan.depth < 1, "depth reduced before anything is left out");
});
test("plan: plenty of time — free time is left free and the learner is told", () => {
  const plan = planFor({}, { topicStatus: allStatus("solid"), analysis: analyze(TOPIC_IDS.flatMap(t => t === "FI" ? attempts("FI", 12, 3) : attempts(t, 8, 7))) });
  assert.ok(plan.freeMinutes > 60 * 60, `free ${plan.freeMinutes}`);
  assert.ok(plan.notes.some(n => /để trống/.test(n)));
  assert.ok(taskMin(plan, t => t.type === "reread") < 80 * 60, "no filling the calendar with rereads");
  assert.ok(taskMin(plan, t => t.topic === "FI") > taskMin(plan, t => t.topic === "ETH") * 3);
});
test("plan: busy days and days off carry no tasks; a changed exam date changes the plan; bad dates are refused", () => {
  const plan = CE.buildPlan(profile({ studyDays: [1, 2, 3, 4, 5], busyDates: ["2026-11-26"] }), baseState({ topicStatus: allStatus("partial") }), TODAY);
  assert.equal(plan.days.find(d => d.date === "2026-11-26").tasks.length, 0);
  assert.equal(plan.days.find(d => d.date === "2026-11-28").tasks.length, 0);
  const moved = CE.buildPlan(profile({ examDate: "2027-04-01", studyDays: [1, 2, 3, 4, 5] }), baseState({ topicStatus: allStatus("partial") }), TODAY);
  assert.equal(moved.daysLeft, 128); assert.ok(moved.capacity < plan.capacity);
  assert.equal(CE.buildPlan(profile({ examDate: TODAY }), baseState(), TODAY).error, "Ngày thi đã qua hoặc là hôm nay");
  assert.equal(CE.buildPlan(profile({ examDate: "2027-13-40" }), baseState(), TODAY).error, "Ngày thi không hợp lệ");
});
test("plan: practice never asks for more unseen questions than exist; Question Bank sets take over when they run out", () => {
  const plan = planFor({}, { topicStatus: allStatus("partial") });
  const used = {}; tasks(plan).filter(t => t.type === "practice").forEach(t => { used[t.module] = (used[t.module] || 0) + t.n; });
  Object.entries(used).forEach(([m, n]) => assert.ok(n <= SUPPLY[m], `${m}: ${n} > ${SUPPLY[m]}`));
  const seen = { ...SUPPLY };
  const qb = { "FI-06": [{ fileId: "f-bonds", total: 60, done: 10 }] };
  const p2 = planFor({}, { topicStatus: allStatus("partial"), seen, qb });
  const qbTasks = tasks(p2).filter(t => t.type === "qb");
  assert.ok(qbTasks.length >= 2 && qbTasks.every(t => t.fileId === "f-bonds" && t.module === "FI-06"));
  assert.ok(qbTasks.reduce((s, t) => s + t.n, 0) <= 50, "never more than the set has left");
  assert.equal(tasks(p2).filter(t => t.type === "practice").length, 0, "no built-in practice when every question was seen");
});
test("plan: a module reported as studied gets a 5-question check, not a relearn; partial learning shortens a module", () => {
  const plan = planFor({}, { topicStatus: allStatus("none"), learned: { "FI-06": "reported" } });
  assert.equal(tasks(plan).filter(t => t.type === "learn" && t.module === "FI-06").length, 0);
  assert.ok(tasks(plan).some(t => t.type === "check" && t.module === "FI-06"));
  const minFor = p => taskMin(p, t => t.type === "learn" && t.module === "QM-04");
  const full = minFor(planFor({}, { topicStatus: allStatus("none") }));
  const half = minFor(planFor({}, { topicStatus: allStatus("none"), progress: { "QM-04": Math.round(full / 1.4 / 2) } }));
  assert.ok(half < full * 0.75 && half > 0, `${full} → ${half}`);
});
test("plan: a topic claimed as known but barely tested gets an early 10-question confirmation", () => {
  const plan = planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" } });
  assert.deepEqual(tasks(plan).filter(t => t.type === "confirm").map(t => t.topic), ["FI"]);
  assert.ok(plan.days.slice(0, 3).some(d => d.tasks.some(t => t.type === "confirm")));
  assert.equal(tasks(planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" }, analysis: analyze(attempts("FI", 12, 11)) })).filter(t => t.type === "confirm").length, 0);
  assert.equal(tasks(planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" }, confirmed: { FI: true } })).filter(t => t.type === "confirm").length, 0);
});
test("plan: repeated mistakes in a skill put a remediation sequence at the front of the plan", () => {
  const plan = planFor({}, { topicStatus: allStatus("partial"), remediation: [{ module: "FI-11", skill: "Modified duration" }] });
  const first = plan.days.slice(0, 3).flatMap(d => d.tasks);
  assert.ok(first.some(t => t.type === "fixStudy" && t.module === "FI-11"), "study the worked solutions first");
  assert.ok(first.some(t => t.type === "practice" && t.module === "FI-11" && t.round === "fix"), "then new questions");
  assert.ok(tasks(plan).some(t => t.type === "check" && t.module === "FI-11" && t.round === "fix"), "then a check");
});
test("plan: topics claimed or shown as known keep a maintenance share and spaced reviews", () => {
  const plan = planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident", ETH: "solid" } });
  const total = taskMin(plan, t => t.topic);
  const share = t => taskMin(plan, x => x.topic === t) / total;
  assert.ok(share("FI") > 0.04 && share("ETH") > 0.04, `FI ${share("FI").toFixed(3)} ETH ${share("ETH").toFixed(3)}`);
  const known = planFor({}, { topicStatus: allStatus("solid"), analysis: analyze(TOPIC_IDS.flatMap(t => attempts(t, 10, 9))) });
  const reviewed = new Set(tasks(known).filter(t => t.type === "review" || t.type === "reread").map(t => t.module));
  assert.ok(reviewed.size >= 60, `${reviewed.size} known modules come back for review`);
  const firstReview = tasks(known).find(t => t.type === "review");
  assert.ok(firstReview && CE.daysBetween(TODAY, firstReview.date) <= 4, "reviews start in the first days, spread over two weeks");
});
test("plan: weekly catch-up slots and periodic error reviews and formula revision", () => {
  const plan = planFor({}, { topicStatus: allStatus("partial") });
  const buffers = tasks(plan).filter(t => t.type === "buffer");
  assert.ok(buffers.length >= 20 && buffers.every(t => t.min >= 15 && t.min <= 60));
  assert.ok(tasks(plan).filter(t => t.type === "mistakes").length >= 10);
  assert.ok(tasks(plan).filter(t => t.type === "formula").length >= 10);
  assert.equal(tasks(planFor({}, { topicStatus: allStatus("partial"), hasDiagnostic: true })).filter(t => t.type === "diag").length, 0);
});
test("plan: stored compactly and restored exactly", () => {
  const plan = planFor({}, { topicStatus: allStatus("none"), qb: { "FI-06": [{ fileId: "f1", total: 40, done: 0 }] } });
  const packed = JSON.stringify(CE.packPlan(plan));
  assert.ok(packed.length < 70000, `packed ${packed.length} chars for ${tasks(plan).length} tasks`);
  const back = CE.unpackPlan(JSON.parse(packed));
  const strip = t => ({ type: t.type, module: t.module || null, topic: t.topic || null, min: t.min, n: t.n || 0, part: t.part || null, status: t.status, id: t.id, date: t.date, key: t.key, fileId: t.fileId, round: t.round, step: t.step, mock: t.mock });
  assert.deepEqual(back.days.map(d => d.tasks.map(strip)), plan.days.map(d => d.tasks.map(strip)));
  assert.deepEqual(back.phases, plan.phases); assert.equal(back.capacity, plan.capacity); assert.deepEqual(back.summary, plan.summary);
});
test("sessions of a day: grouped within the limit, with breaks, at the preferred time, moved earlier for long days", () => {
  const day = { date: "2026-11-24", tasks: [{ min: 50 }, { min: 30 }, { min: 40 }, { min: 45 }] };
  const ss = CE.daySessions(day, profile({ maxSessionMin: 90, breakMin: 10, slot: "evening" }));
  assert.deepEqual(ss.map(s => s.minutes), [80, 85]);
  assert.deepEqual(ss.map(s => [s.start, s.end]), [["19:30", "20:50"], ["21:00", "22:25"]]);
  const long = { date: "2026-11-24", tasks: Array.from({ length: 6 }, () => ({ min: 60 })) };
  const ls = CE.daySessions(long, profile({ maxSessionMin: 120, slot: "evening" }));
  assert.ok(ls[ls.length - 1].startMin + ls[ls.length - 1].minutes <= 23 * 60 + 30, "a long evening starts earlier instead of running past midnight");
  assert.equal(CE.daySessions({ date: "2026-11-24", tasks: [{ min: 135 }, { min: 135 }] }, profile()).length, 2, "a mock session is one session");
});
test("export: a valid calendar file (one event per session) and a CSV", () => {
  const plan = planFor({ examDate: "2026-12-24" }, { topicStatus: allStatus("partial") });
  const label = t => `${t.type}, ${t.module || t.topic || ""}; nội dung dài để kiểm tra việc gấp dòng trong tệp lịch theo chuẩn iCalendar`;
  const ics = CE.toICS(plan, profile(), label, "2026-11-24T00:00:00Z");
  const lines = ics.split("\r\n"); assert.equal(lines.pop(), "");
  assert.equal(lines[0], "BEGIN:VCALENDAR"); assert.equal(lines[lines.length - 1], "END:VCALENDAR");
  const sessions = plan.days.reduce((s, d) => s + CE.daySessions(d, profile()).length, 0);
  assert.equal(lines.filter(l => l === "BEGIN:VEVENT").length, sessions);
  assert.equal(lines.filter(l => l === "END:VEVENT").length, sessions);
  assert.ok(lines.every(l => Buffer.byteLength(l, "utf8") <= 75), "folded at 75 octets");
  assert.ok(ics.includes("\\,") && ics.includes("\\;"), "commas and semicolons escaped");
  assert.ok(/DTSTART:20261124T\d{4}00/.test(ics));
  const csv = CE.toCSV(plan, profile(), t => t.type).trim().split("\n");
  assert.equal(csv.length, 1 + tasks(plan).length);
});

// ---------------- adaptive behaviour ----------------
test("confirmation: a verified topic moves to maintenance and its learning shrinks, but it keeps some time", () => {
  assert.equal(CE.evaluateConfirm(attempts("ETH", 10, 9)).passed, true);
  assert.equal(CE.evaluateConfirm(attempts("ETH", 6, 6)).passed, false, "too few questions");
  assert.equal(CE.evaluateConfirm(attempts("ETH", 10, 6)).passed, false);
  const before = planFor({}, { topicStatus: allStatus("none") }), after = planFor({}, { topicStatus: allStatus("none"), confirmed: { ETH: true } });
  const learnEth = p => taskMin(p, t => t.type === "learn" && t.topic === "ETH");
  assert.ok(learnEth(after) < learnEth(before) * 0.3 && taskMin(after, t => t.topic === "ETH") > 0);
});
test("missed days: nothing is marked done, mastery is untouched, the next days are lighter, missed learning comes back", () => {
  const st = baseState({ topicStatus: allStatus("partial"), analysis: analyze(attempts("FI", 10, 6)) });
  const prev = CE.buildPlan(profile(), st, "2026-11-24");
  const log = { "2026-11-24": 180, "2026-11-25": 180 };
  const r = CE.replan(profile(), st, "2026-11-30", prev, log, "check");
  assert.equal(r.adherence.missStreak, 4);
  assert.equal(r.plan.days[0].date, "2026-11-30");
  assert.ok(r.plan.warnings.some(w => /nhẹ hơn 20%/.test(w)));
  assert.equal(r.plan.days[0].minutes, 145); assert.equal(r.plan.days[3].minutes, 180);
  prev.days.forEach(d => d.tasks.forEach(t => assert.equal(t.status, "todo")));
  const missed = prev.days.slice(2, 6).flatMap(d => d.tasks).filter(t => t.type === "learn").map(t => t.module);
  const again = tasks(r.plan).filter(t => t.type === "learn").map(t => t.module);
  missed.forEach(m => assert.ok(again.includes(m), `${m} comes back`));
});
test("missed days: a plan that keeps being missed is scaled to what the learner really does", () => {
  const st = baseState({ topicStatus: allStatus("none") });
  const prev = CE.buildPlan(profile({ hoursPerDay: 4 }), st, "2026-11-10");
  const log = {}; for (let i = 0; i < 14; i++) log[CE.addDays("2026-11-10", i)] = 60;
  const r = CE.replan(profile({ hoursPerDay: 4 }), st, "2026-11-24", prev, log);
  assert.ok(r.adherence.rate < 0.6);
  assert.ok(r.plan.days[0].minutes < 240 && r.plan.days[0].minutes >= 140);
  assert.ok(r.plan.warnings.some(w => /cho khả thi/.test(w)));
});
test("versions: each new plan adds a version with what changed; nothing is deleted", () => {
  const st = baseState({ topicStatus: allStatus("partial") });
  const p1 = CE.buildPlan(profile(), st, TODAY), p2 = CE.buildPlan(profile({ hoursPerDay: 2, examDate: "2027-06-01" }), st, "2026-11-30");
  let v = CE.pushVersion([], p1, "setup", TODAY);
  v = CE.pushVersion(v, p2, "manual", "2026-11-30");
  assert.equal(v.length, 2); assert.equal(v[1].v, 2);
  assert.ok(v[1].diff.some(x => /Ngày thi đổi/.test(x)) && v[1].diff.some(x => /giảm/.test(x)));
  for (let i = 0; i < 40; i++) v = CE.pushVersion(v, p2, "x", "2026-12-01");
  assert.equal(v.length, 42); assert.equal(v[0].sum.daysLeft, 170);
  assert.ok(JSON.stringify(v).length < 60000, "summaries stay small");
});
test("completion: a task is done only with evidence", () => {
  assert.equal(CE.completeTask({ type: "learn" }, {}).status, "todo");
  assert.equal(CE.completeTask({ type: "learn" }, { selfReport: true }).status, "reported");
  assert.equal(CE.completeTask({ type: "learn" }, { checkTotal: 5, checkCorrect: 4 }).status, "verified");
  assert.equal(CE.completeTask({ type: "learn" }, { checkTotal: 5, checkCorrect: 1 }).status, "reported");
  assert.equal(CE.completeTask({ type: "practice", n: 20 }, { selfReport: true }).status, "todo", "practice needs answers, not a click");
  assert.equal(CE.completeTask({ type: "practice", n: 20 }, { session: { answered: 15 } }).status, "todo");
  assert.equal(CE.completeTask({ type: "practice", n: 20 }, { session: { answered: 16 } }).status, "verified");
  assert.equal(CE.completeTask({ type: "mock", n: 90 }, { session: { submitted: false } }).status, "todo");
  assert.equal(CE.completeTask({ type: "mock", n: 90 }, { session: { submitted: true } }).status, "verified");
  assert.equal(CE.completeTask({ type: "qb", n: 20 }, { qbDone: 10 }).status, "todo");
  assert.equal(CE.completeTask({ type: "qb", n: 20 }, { qbDone: 16 }).status, "verified");
  assert.equal(CE.completeTask({ type: "formula" }, { selfReport: true }).status, "reported");
  assert.equal(CE.completeTask({ type: "confirm" }, {}).status, "todo");
});

// ---------------- spaced repetition, readiness, recommendations ----------------
test("spaced repetition: intervals grow with success, shrink on failure, retention decays", () => {
  let r = CE.startReview("2026-11-24");
  assert.equal(r.next, "2026-11-25");
  r = CE.recordReview(r, 1, 5, "2026-11-25"); assert.equal(r.stage, 1); assert.equal(r.next, CE.addDays("2026-11-25", Math.round(3 * r.ease)));
  r = CE.recordReview(r, 1, 5, r.next); r = CE.recordReview(r, 1, 5, r.next);
  assert.ok(r.stage >= 3 && r.ease > 1.2);
  const stage = r.stage; r = CE.recordReview(r, 0.2, 5, r.next);
  assert.equal(r.stage, stage - 1); assert.equal(r.next, CE.addDays(r.last, 1));
  assert.equal(CE.recordReview(r, 1, 1, "2027-01-01").stage, r.stage, "one question is not enough");
  const f = CE.startReview("2026-11-24");
  assert.ok(CE.retention(f, "2026-11-24") === 1 && CE.retention(f, "2026-12-24") < 0.01 && CE.retention(null, "2026-11-24") === null);
});
test("readiness: no number without enough evidence; an honest interval with it", () => {
  const none = CE.readiness(analyze([]), WEIGHTS, {});
  assert.equal(none.enough, false); assert.equal(none.label, "Chưa đủ dữ liệu");
  const r = CE.readiness(analyze(TOPIC_IDS.flatMap(t => attempts(t, 6, 4))), WEIGHTS, {});
  assert.ok(r.enough && r.low < r.value && r.value < r.high && r.high - r.low > 10);
  assert.ok(CE.readiness(analyze(TOPIC_IDS.flatMap(t => attempts(t, 15, 14))), WEIGHTS, {}).value > r.value);
});
test("recommendations: concrete, spread over topics, with evidence, prerequisites and missing resources", () => {
  const st = baseState({ topicStatus: allStatus("partial"), analysis: analyze(attempts("FI", 10, 2).concat(attempts("QM", 6, 1))), seen: { "ALT-07": SUPPLY["ALT-07"] } });
  const rec = CE.recommendations(st, TODAY, "2027-05-13", 5);
  assert.ok(rec.length >= 3 && rec.length <= 5);
  assert.equal(new Set(rec.map(r => r.topic)).size, rec.length, "one per topic");
  rec.forEach(r => { assert.ok(r.evidence && r.components && r.score > 0); assert.ok(MODS.some(m => m.id === r.module)); });
  const fi = rec.find(r => r.topic === "FI");
  if (fi) { assert.equal(fi.evidence.scope === "module" || fi.evidence.scope === "topic", true); assert.equal(fi.prereq, "QM-04"); }
  const noQ = CE.recommendations(baseState({ modules: [{ id: "ALT-07", topic: "ALT", title: "Digital" }], seen: { "ALT-07": SUPPLY["ALT-07"] } }), TODAY, "2027-05-13", 1);
  assert.equal(noQ[0].resourceMissing, true);
});

// ---------------- isolation and migration ----------------
test("isolation: analysing one account's attempts never touches another's", () => {
  const A = attempts("FI", 10, 2), B = attempts("FI", 10, 9), copyB = JSON.stringify(B);
  const a = analyze(A), b = analyze(B);
  assert.ok(a.topics.FI.acc < 0.3 && b.topics.FI.acc > 0.8);
  assert.equal(JSON.stringify(B), copyB, "inputs are not modified");
});
test("migration: data from the first version keeps the profile, answers, history and reviews", () => {
  const v1 = { v: 1, profile: { displayName: "An", examDate: "2027-05-13", hoursPerDay: 3, studyDays: ["1", "2", "0"], busy: "2026-12-24", maxSession: 90, breakMin: 10, assess: "hybrid", slot: "evening" },
    self: { topicStatus: { FI: "confident" }, statuses: { "QM-04": "solid" }, rating: { FI: 5 } },
    attempts: attempts("FI", 5, 2).map(a => ({ ...a, src: "quick45", sess: "old1" })), session: { kind: "quick45" },
    history: [{ id: "old1", date: "2026-11-23", kind: "quick45", n: 30, k: 20 }], plan: { days: [] }, versions: [{ createdAt: "2026-11-23", reason: "setup", summary: { capacity: 30000, byTopic: {} } }],
    learned: { "QM-01": "reported" }, confirmed: { ETH: true }, reviews: { "QM-01": CE.startReview("2026-11-23") }, log: { "2026-11-23": 45 } };
  const v2 = CE.migrateV1(v1);
  assert.equal(v2.v, 2); assert.equal(v2.profile.name, "An"); assert.deepEqual(v2.profile.studyDays, [1, 2, 0]);
  assert.deepEqual(v2.self.topic, { FI: "confident" }); assert.deepEqual(v2.self.module, { "QM-04": "solid" });
  assert.equal(v2.att.length, 5);
  assert.deepEqual(v2.att.map(p => CE.unpackAttempt(p, meta).ok), [true, true, false, false, false]);
  assert.equal(v2.hist[0].k, 20); assert.equal(v2.ver.length, 1); assert.equal(v2.confirmed.ETH, true);
  assert.equal(v2.sess, null, "an unfinished old session is dropped, not resumed in the new format");
  assert.equal(v2.plan, null, "a new plan is built in the new format");
  assert.equal(CE.migrateV1(v2), v2);
});

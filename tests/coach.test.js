// Hoa Tiêu (CFA Compass): the learning engine and the diagnostic question bank.
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
const BY_ID = Object.fromEntries(STARTER.map(q => [q.id, { ...q, ...POOL.find(p => p.id === q.id) }]));
const SUPPLY = {}; POOL.forEach(q => { SUPPLY[q.module] = (SUPPLY[q.module] || 0) + 1; });
const MODS = MODULES.map(m => ({ id: m.id, topic: m.topic, title: m.title }));
const TODAY = "2026-11-24";

// ---- helpers ----
function baseState(over) {
  return { modules: MODS, weights: WEIGHTS, analysis: CE.analyze([], { weights: WEIGHTS }), statuses: {}, topicStatus: {}, learned: {}, confirmed: {}, reviews: {}, supply: SUPPLY, done: {}, ...over };
}
const profile = over => ({ examDate: "2027-05-13", hoursPerDay: 3, studyDays: [0, 1, 2, 3, 4, 5, 6], busyDates: [], maxSessionMin: 90, ...over });
const allStatus = s => Object.fromEntries(TOPICS.map(t => [t.id, s]));
// attempts for a topic: n questions, `right` of them right
function attempts(topic, n, right, src) {
  const qs = POOL.filter(q => q.topic === topic).slice(0, n);
  return qs.map((q, i) => ({ q: q.id, t: topic, m: q.module, s: q.skill, d: q.diff, ok: i < right, pick: "A", sec: 60, est: q.est, calc: q.isCalc, ts: "2026-11-20", src: src || "diag" }));
}

// ---------------- question bank ----------------
test("bank: 180 coach questions, 18 per topic, mixed difficulty, valid metadata", () => {
  const coach = STARTER.filter(q => q.src === "coach");
  assert.equal(coach.length, 180);
  assert.equal(new Set(coach.map(q => q.id)).size, 180);
  for (const t of TOPICS) {
    const qs = coach.filter(q => q.topic === t.id);
    assert.equal(qs.length, 18, t.id);
    assert.ok([1, 2, 3].every(d => qs.some(q => q.diff === d)), `${t.id} has easy, medium and hard`);
    const firstThree = qs.slice(0, 6).map(q => q.diff);
    assert.ok(new Set(firstThree).size >= 2, `${t.id} difficulty is mixed, not sorted`);
  }
  for (const q of coach) {
    assert.ok(MODULES.some(m => m.id === q.module), `${q.id} module ${q.module}`);
    assert.ok(["A", "B", "C"].includes(q.ans));
    assert.equal(new Set([q.A, q.B, q.C]).size, 3, `${q.id} options are distinct`);
    assert.ok(q.why.length > 20 && q.skill && q.est > 0);
  }
  const letters = { A: 0, B: 0, C: 0 }; coach.forEach(q => letters[q.ans]++);
  assert.ok(Object.values(letters).every(n => n > 40), "the correct answer is spread over A, B and C");
});

// ---------------- dates ----------------
test("dates: day arithmetic ignores daylight saving and time zones", () => {
  assert.equal(CE.daysBetween("2027-03-13", "2027-03-15"), 2);        // US DST starts 14 Mar
  assert.equal(CE.daysBetween("2026-10-30", "2026-11-02"), 3);
  assert.equal(CE.addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(CE.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(CE.weekday("2027-05-13"), 4);                          // Thursday
  assert.equal(CE.validDate("2027-02-30"), false);
  for (const tz of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
    process.env.TZ = tz; assert.equal(CE.daysBetween("2026-11-24", "2027-05-13"), 170, tz);
  }
  process.env.TZ = "UTC";
});

// ---------------- assessments ----------------
test("assessment: 30 and 60 questions, every topic represented, weighted, difficulties mixed", () => {
  const quick = CE.buildAssessment(POOL, "quick45", { seed: "u1", weights: WEIGHTS });
  const full = CE.buildAssessment(POOL, "full90", { seed: "u1", weights: WEIGHTS });
  assert.equal(quick.length, 30); assert.equal(full.length, 60);
  assert.equal(new Set(quick).size, 30);
  const count = (ids, t) => ids.filter(id => BY_ID[id].topic === t).length;
  for (const t of TOPICS) { assert.ok(count(quick, t.id) >= 2, `quick ${t.id}`); assert.ok(count(full, t.id) >= 2, `full ${t.id}`); }
  assert.ok(count(full, "FI") > count(full, "ECO"), "a 11–14% topic gets more questions than a 6–9% one");
  const d = [1, 2, 3].map(x => full.filter(id => BY_ID[id].diff === x).length);
  assert.ok(d.every(n => n >= 8), `all difficulties present ${d}`);
  const sorted = full.map(id => BY_ID[id].diff);
  assert.notDeepEqual(sorted, sorted.slice().sort(), "order is mixed, not easy → hard");
  assert.deepEqual(CE.buildAssessment(POOL, "quick45", { seed: "u1", weights: WEIGHTS }), quick, "same seed, same set");
  assert.notDeepEqual(CE.buildAssessment(POOL, "quick45", { seed: "u2", weights: WEIGHTS }), quick, "other accounts get other sets");
});
test("assessment: avoids repeats, only repeats when the pool runs out", () => {
  const first = CE.buildAssessment(POOL, "full90", { seed: "a", weights: WEIGHTS });
  const second = CE.buildAssessment(POOL, "full90", { seed: "b", weights: WEIGHTS, seen: first });
  assert.equal(second.filter(id => first.includes(id)).length, 0);
  const tiny = POOL.filter(q => q.topic === "ALT").slice(0, 3);
  const small = CE.buildAssessment(tiny, "check", { seed: "x", weights: { ALT: 1 }, n: 5, seen: tiny.map(q => q.id) });
  assert.equal(small.length, 3, "never more than the pool holds; repeats allowed when nothing fresh is left");
});
test("assessment: targeted practice stays in the requested module", () => {
  const ids = CE.buildAssessment(POOL, "targeted", { seed: "t", topic: "FI", module: "FI-06", n: 8 });
  assert.ok(ids.length >= 3 && ids.every(id => BY_ID[id].module === "FI-06"));
});

// ---------------- exam session ----------------
test("session: 45-minute exam closes by itself and cannot be edited after the time", () => {
  const ids = CE.buildAssessment(POOL, "quick45", { seed: "s", weights: WEIGHTS });
  const t0 = Date.UTC(2026, 10, 24, 9, 0, 0), s = CE.newSession("quick45", ids, t0);
  assert.equal(s.limitSec, 45 * 60);
  assert.equal(CE.answer(s, ids[0], "B", t0 + 60e3, 55).ok, true);
  assert.equal(CE.remainingSec(s, t0 + 44 * 60e3), 60);
  assert.equal(CE.isOpen(s, t0 + 45 * 60e3), false);
  const late = CE.answer(s, ids[1], "A", t0 + 45 * 60e3 + 1000, 5);
  assert.deepEqual([late.ok, late.reason], [false, "expired"]);
  assert.equal(s.answers[ids[1]], undefined);
  CE.submit(s, t0 + 46 * 60e3);
  assert.equal(s.expired, true);
  assert.equal(CE.answer(s, ids[0], "C", t0 + 46 * 60e3, 5).ok, false, "changing an answer after submit is refused");
  assert.equal(s.answers[ids[0]], "B");
});
test("session: 90-minute exam keeps its answers after a reload", () => {
  const ids = CE.buildAssessment(POOL, "full90", { seed: "r", weights: WEIGHTS });
  const t0 = 1_800_000_000_000, s = CE.newSession("full90", ids, t0);
  ids.slice(0, 20).forEach((id, i) => CE.answer(s, id, "ABC"[i % 3], t0 + i * 1000, 30));
  s.flags[ids[3]] = true; s.current = 12;
  const back = JSON.parse(JSON.stringify(s));                    // what localStorage gives back after a refresh
  assert.deepEqual(back.answers, s.answers);
  assert.equal(back.flags[ids[3]], true); assert.equal(back.current, 12);
  assert.equal(CE.remainingSec(back, t0 + 30 * 60e3), 60 * 60, "the clock keeps running on wall time");
  assert.equal(CE.answer(back, ids[20], "A", t0 + 31 * 60e3, 20).ok, true);
});
test("session: nothing in the session reveals the answer key", () => {
  const ids = CE.buildAssessment(POOL, "quick45", { seed: "k", weights: WEIGHTS });
  const s = CE.newSession("quick45", ids, 1);
  const json = JSON.stringify(s);
  assert.ok(!/"ans"|correct|why/i.test(json));
  assert.deepEqual(Object.keys(s).sort(), ["answers", "current", "expired", "flags", "id", "ids", "kind", "limitSec", "secs", "startedAt", "submittedAt"]);
  assert.equal(CE.answer(s, "not-a-question", "A", 2, 1).reason, "not-in-session");
  assert.equal(CE.answer(s, ids[0], "D", 2, 1).reason, "bad-choice");
});
test("session: grading marks right, wrong and unanswered", () => {
  const ids = CE.buildAssessment(POOL, "check", { seed: "g", weights: { FI: 1 }, topic: "FI", n: 5 });
  const s = CE.newSession("check", ids, 10);
  CE.answer(s, ids[0], BY_ID[ids[0]].ans, 11, 20); CE.answer(s, ids[1], BY_ID[ids[1]].ans === "A" ? "B" : "A", 12, 20);
  CE.submit(s, 13);
  const rows = CE.attemptsFromSession(s, BY_ID, "2026-11-24");
  assert.deepEqual(rows.map(r => r.ok), [true, false, null, null, null]);
  assert.equal(rows[0].t, "FI");
});

// ---------------- analysis ----------------
test("analysis: bands, uncertainty and 'insufficient evidence'", () => {
  const rows = [...attempts("FI", 10, 4), ...attempts("QM", 10, 9), ...attempts("ECO", 3, 3)];
  const a = CE.analyze(rows, { weights: WEIGHTS });
  assert.equal(a.topics.QM.band, "strong"); assert.equal(a.topics.FI.band, "weak");
  assert.equal(a.topics.ECO.band, "unknown", "3 questions: no conclusion");
  assert.equal(a.topics.ECO.confidence, "insufficient");
  assert.equal(a.topics.DER.n, 0);
  const [lo, hi] = a.topics.FI.ci; assert.ok(lo < 0.4 && hi > 0.4 && hi - lo > 0.3, "wide interval for 10 questions");
  const a40 = CE.analyze(attempts("QM", 18, 9).concat(attempts("QM", 18, 9).map(r => ({ ...r, q: r.q + "x" }))), { weights: WEIGHTS });
  assert.ok(a40.topics.QM.ci[1] - a40.topics.QM.ci[0] < a.topics.FI.ci[1] - a.topics.FI.ci[0], "more questions, narrower interval");
  assert.ok(CE.evidenceSummary(a).insufficient.includes("ECO"));
});
test("analysis: only the first attempt of a question counts as evidence", () => {
  const one = attempts("QM", 6, 2);
  const repeated = one.concat(one.map(r => ({ ...r, ok: true, ts: "2026-11-23", src: "practice" })), one.map(r => ({ ...r, ok: true, ts: "2026-11-24" })));
  const a = CE.analyze(repeated, { weights: WEIGHTS });
  assert.equal(a.topics.QM.n, 6); assert.equal(a.topics.QM.k, 2);
});
test("analysis: a hard question outweighs an easy one", () => {
  const easy = { q: "e", t: "QM", m: "QM-01", s: "x", d: 1, ok: true }, hard = { q: "h", t: "QM", m: "QM-01", s: "x", d: 3, ok: false };
  const swap = [{ ...easy, ok: false }, { ...hard, ok: true }];
  const w1 = CE.tally([easy, hard], null), w2 = CE.tally(swap, null);
  assert.ok(w2.wAcc > w1.wAcc, "same raw 50%, but missing the easy one costs more than missing the hard one");
});
test("analysis: weak modules and skills are named, not just 'weak in Fixed Income'", () => {
  const fi = POOL.filter(q => q.topic === "FI");
  const rows = fi.filter(q => q.module === "FI-06" || q.module === "FI-11").map(q => ({ q: q.id, t: "FI", m: q.module, s: q.skill, d: q.diff, ok: false, est: q.est, calc: q.isCalc, ts: "2026-11-20" }))
    .concat(fi.filter(q => q.module === "FI-01").map(q => ({ q: q.id, t: "FI", m: q.module, s: q.skill, d: q.diff, ok: true, est: q.est, calc: q.isCalc, ts: "2026-11-20" })));
  const a = CE.analyze(rows, { weights: WEIGHTS });
  assert.ok(a.modules["FI-06"].acc === 0 && a.modules["FI-01"].acc === 1);
  assert.ok(a.weakSkills.some(w => w.module === "FI-06" || w.module === "FI-11"));
  assert.ok(a.weakSkills.every(w => w.preliminary === (w.n < 4)));
});
test("errors: classified from question type and time, with evidence labels", () => {
  const calc = POOL.filter(q => q.topic === "QM" && q.isCalc).slice(0, 3), concept = POOL.filter(q => q.topic === "QM" && !q.isCalc).slice(0, 1);
  const rows = calc.map(q => ({ q: q.id, t: "QM", m: q.module, s: q.skill, d: q.diff, ok: false, sec: 5, est: q.est, calc: true, ts: "2026-11-20" }))
    .concat(concept.map(q => ({ q: q.id, t: "QM", m: q.module, s: q.skill, d: q.diff, ok: false, sec: 80, est: q.est, calc: false, ts: "2026-11-20" })),
      [{ q: "u", t: "QM", m: "QM-01", s: "s", d: 2, ok: null, sec: 0, est: 90, calc: false, ts: "2026-11-20" }]);
  const e = CE.classifyErrors(rows);
  assert.deepEqual(e.types, { time: 1, calc: 3, concept: 1 });
  assert.equal(e.evidence.calc, "moderate"); assert.equal(e.evidence.concept, "insufficient"); assert.equal(e.evidence.time, "insufficient");
  assert.equal(e.rushedEvidence, "weak");
  assert.match(e.note, /giả thuyết/);
});

// ---------------- priority and knowledge ----------------
test("priority: components are normalised and the weights are the documented ones", () => {
  const st = baseState({ topicStatus: allStatus("none") });
  const p = CE.priorities(MODS, st, TODAY, "2027-05-13");
  p.forEach(x => ["gap", "exam", "forget", "prereq", "urgency"].forEach(k => assert.ok(x[k] >= 0 && x[k] <= 1, `${x.id} ${k}`)));
  const x = p[0], W = CE.CONFIG.priority;
  assert.ok(Math.abs(x.score - (W.gap * x.gap + W.exam * x.exam + W.forget * x.forget + W.prereq * x.prereq + W.urgency * x.urgency)) < 1e-3);
  assert.equal(Object.values(W).reduce((a, b) => a + b, 0).toFixed(2), "1.00");
});
test("knowledge: a self-rating of 'confident' is not mastery; evidence overrides it", () => {
  const m = MODS.find(x => x.id === "FI-06");
  const claim = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" } })).k;
  const tested = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" }, analysis: CE.analyze(attempts("FI", 12, 3), { weights: WEIGHTS }) })).k;
  assert.ok(claim <= 0.9 && tested < claim - 0.2, `${claim} → ${tested}`);
  const reported = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "none" }, learned: { "FI-06": "reported" } })).k;
  const verified = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "none" }, learned: { "FI-06": "verified" } })).k;
  assert.ok(reported < verified && reported <= 0.7);
});

// ---------------- plan ----------------
function planFor(over, st) { return CE.buildPlan(profile(over), baseState(st), TODAY); }
const taskMin = (plan, f) => plan.days.reduce((s, d) => s + d.tasks.filter(f).reduce((x, t) => x + t.min, 0), 0);

test("plan: covers every day until the exam, never exceeds a day's time, links are real", () => {
  const plan = planFor({}, { topicStatus: allStatus("partial") });
  assert.equal(plan.error, null); assert.equal(plan.daysLeft, 170);
  assert.equal(plan.days.length, 170); assert.equal(plan.days[0].date, TODAY); assert.equal(plan.days[169].date, "2027-05-12");
  plan.days.forEach(d => { const sum = d.tasks.reduce((s, t) => s + t.min, 0); assert.ok(sum <= d.minutes, `${d.date} ${sum} > ${d.minutes}`); });
  plan.days.forEach(d => d.sessions.forEach(s => assert.ok(s.minutes <= 90 || s.tasks.length === 1, "session length limit")));
  const ids = new Set(); plan.days.forEach(d => d.tasks.forEach(t => { assert.ok(!ids.has(t.id)); ids.add(t.id); if (t.module) assert.ok(MODS.some(m => m.id === t.module), t.module); if (t.type === "practice") assert.ok(SUPPLY[t.module] >= t.n, "practice tasks only point at modules that have questions"); }));
  assert.equal(plan.phases.length, 4); assert.ok(plan.phases.every(p => p.from));
  assert.ok(plan.days[169].tasks.every(t => t.type === "review"), "day before the exam is a light review day");
  assert.ok(taskMin(plan, t => t.type === "mock") >= 540, "mock exam sessions are reserved");
});
test("plan: two accounts with different results and exam dates get different plans", () => {
  const a = planFor({ examDate: "2027-05-13", hoursPerDay: 3 }, { topicStatus: { ...allStatus("solid"), FI: "none" }, analysis: CE.analyze(attempts("FI", 12, 3).concat(attempts("ETH", 12, 11)), { weights: WEIGHTS }) });
  const b = planFor({ examDate: "2027-08-20", hoursPerDay: 5 }, { topicStatus: { ...allStatus("solid"), ETH: "none" }, analysis: CE.analyze(attempts("ETH", 12, 3).concat(attempts("FI", 12, 11)), { weights: WEIGHTS }) });
  const share = (p, t) => taskMin(p, x => x.topic === t) / Math.max(1, taskMin(p, x => x.topic));
  assert.ok(share(a, "FI") > share(a, "ETH") + 0.1, "A is weak in Fixed Income");
  assert.ok(share(b, "ETH") > share(b, "FI") + 0.1, "B is weak in Ethics");
  assert.notEqual(a.daysLeft, b.daysLeft); assert.ok(b.capacity > a.capacity);
  assert.ok(a.phases[3].to === "2027-05-12" && b.phases[3].to === "2027-08-19");
});
test("plan: the same inputs always give the same plan", () => {
  const st = { topicStatus: allStatus("partial") };
  assert.deepEqual(planFor({}, st), planFor({}, st));
});
test("plan: a new learner gets a foundation plan; a finished learner gets a revision and mock plan", () => {
  const fresh = planFor({}, { topicStatus: allStatus("none") }), done = planFor({}, { topicStatus: allStatus("confident"), analysis: CE.analyze(TOPICS.flatMap(t => attempts(t.id, 14, 12)), { weights: WEIGHTS }) });
  const learn = p => taskMin(p, t => t.type === "learn");
  assert.ok(learn(fresh) > 20 * 60 && learn(done) < learn(fresh) / 4, `${learn(fresh)} vs ${learn(done)}`);
  assert.ok(fresh.phases[0].minutes > 0 && fresh.days.slice(0, 5).some(d => d.tasks.some(t => t.module === "QM-04")), "time value of money comes first");
  assert.ok(taskMin(done, t => t.type === "practice") > taskMin(fresh, t => t.type === "practice") * 0.5);
  assert.ok(done.phases[3].minutes / done.capacity > fresh.phases[3].minutes / fresh.capacity - 0.01, "more time for mocks when most content is learned");
});
test("plan: an infeasible request is reported with the shortfall, not squeezed in", () => {
  const plan = planFor({ examDate: "2026-12-24", hoursPerDay: 1 }, { topicStatus: allStatus("none") });
  assert.equal(plan.error, null);
  assert.ok(plan.deferredMinutes > 600 && plan.suggestedHours > 1);
  assert.ok(plan.warnings.some(w => /chưa xếp vào lịch/.test(w)));
  assert.ok(plan.placedMinutes <= plan.capacity);
});
test("plan: busy days and days off carry no tasks; a changed exam date changes the plan", () => {
  const plan = CE.buildPlan(profile({ studyDays: [1, 2, 3, 4, 5], busyDates: ["2026-11-26"] }), baseState({ topicStatus: allStatus("partial") }), TODAY);
  assert.equal(plan.days.find(d => d.date === "2026-11-26").tasks.length, 0);
  assert.equal(plan.days.find(d => d.date === "2026-11-28").tasks.length, 0);      // Saturday
  const moved = CE.buildPlan(profile({ examDate: "2027-04-01", studyDays: [1, 2, 3, 4, 5] }), baseState({ topicStatus: allStatus("partial") }), TODAY);
  assert.equal(moved.daysLeft, 128); assert.ok(moved.capacity < plan.capacity);
  assert.equal(CE.buildPlan(profile({ examDate: "2026-11-24" }), baseState(), TODAY).error, "Ngày thi đã qua hoặc là hôm nay");
  assert.equal(CE.buildPlan(profile({ examDate: "2027-13-40" }), baseState(), TODAY).error, "Ngày thi không hợp lệ");
});
test("plan: reviews appear after learning, at spaced intervals, only on modules with questions", () => {
  const plan = planFor({}, { topicStatus: allStatus("none") });
  const learnDay = {}; plan.days.forEach(d => d.tasks.forEach(t => { if (t.type === "learn" && !(t.module in learnDay)) learnDay[t.module] = d.date; }));
  const reviews = []; plan.days.forEach(d => d.tasks.forEach(t => { if (t.title.startsWith("Ôn ngắt quãng")) reviews.push({ m: t.module, date: d.date }); }));
  assert.ok(reviews.length > 5);
  reviews.forEach(r => { assert.ok(r.date > learnDay[r.m], `${r.m} reviewed after it was learned`); assert.ok(SUPPLY[r.m] >= 3); });
});

// ---------------- adaptive behavior ----------------
test("confirmation test: a verified topic moves to maintenance and shortens the plan", () => {
  const rows = attempts("ETH", 10, 9), ev = CE.evaluateConfirm(rows);
  assert.equal(ev.passed, true);
  assert.equal(CE.evaluateConfirm(attempts("ETH", 6, 6)).passed, false, "too few questions");
  assert.equal(CE.evaluateConfirm(attempts("ETH", 10, 6)).passed, false);
  const before = planFor({}, { topicStatus: allStatus("none") }), after = planFor({}, { topicStatus: allStatus("none"), confirmed: { ETH: true } });
  const learnEth = p => taskMin(p, t => t.type === "learn" && t.topic === "ETH");
  assert.ok(learnEth(after) < learnEth(before) * 0.4 && taskMin(after, t => t.topic === "ETH") > 0, "still some time: not dropped completely");
});
test("plan: a topic claimed as known but barely tested gets a confirmation test, not silence", () => {
  const plan = planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" } });
  const first = plan.days.flatMap(d => d.tasks).filter(t => t.type === "confirm");
  assert.deepEqual(first.map(t => t.topic), ["FI"]);
  assert.ok(plan.days.slice(0, 3).some(d => d.tasks.some(t => t.type === "confirm" && t.topic === "FI")), "scheduled early");
  const tested = planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" }, analysis: CE.analyze(attempts("FI", 12, 11), { weights: WEIGHTS }) });
  assert.equal(tested.days.flatMap(d => d.tasks).filter(t => t.type === "confirm").length, 0, "enough evidence already");
  const done = planFor({}, { topicStatus: { ...allStatus("none"), FI: "confident" }, confirmed: { FI: true } });
  assert.equal(done.days.flatMap(d => d.tasks).filter(t => t.type === "confirm").length, 0);
  assert.equal(CE.completeTask({ type: "confirm" }, {}).status, "todo");
  assert.equal(CE.completeTask({ type: "confirm" }, { confirmDone: true }).status, "verified");
});
test("knowledge: three wrong answers in a topic already pull a 'confident' claim down a little, never to a verdict", () => {
  const m = MODS.find(x => x.id === "FI-06");
  const claim = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" } })).k;
  const few = CE.moduleKnowledge(m, baseState({ topicStatus: { FI: "confident" }, analysis: CE.analyze(attempts("FI", 3, 0), { weights: WEIGHTS }) })).k;
  assert.ok(few < claim && few > claim - 0.4, `${claim} → ${few}`);
});
test("improvement: scores 38% → 57% → 78% lower the priority of a topic", () => {
  const prio = n => CE.priorities(MODS, baseState({ topicStatus: allStatus("partial"), analysis: CE.analyze(attempts("FI", 15, n), { weights: WEIGHTS }) }), TODAY, "2027-05-13").filter(p => p.topic === "FI").reduce((s, p) => s + p.score, 0);
  const [p1, p2, p3] = [6, 9, 12].map(prio);                    // 40%, 60%, 80% of 15
  assert.ok(p1 > p2 && p2 > p3);
});
test("missed days: nothing is marked done, mastery is untouched, the new plan is lighter and feasible", () => {
  const st = baseState({ topicStatus: allStatus("partial"), analysis: CE.analyze(attempts("FI", 10, 6), { weights: WEIGHTS }) });
  const prev = CE.buildPlan(profile(), st, "2026-11-24");
  const log = {}; ["2026-11-24", "2026-11-25"].forEach(d => { log[d] = 180; });      // studied two days, then nothing for three
  const today = "2026-11-30";
  const r = CE.replan(profile(), st, today, prev, log, "check");
  assert.equal(r.adherence.missStreak, 4);
  assert.equal(r.plan.error, null); assert.equal(r.plan.days[0].date, today);
  assert.ok(r.plan.warnings.some(w => /nhẹ hơn 20%/.test(w)));
  assert.equal(r.plan.days[0].minutes, Math.round(180 * 0.8)); assert.equal(r.plan.days[3].minutes, 180);
  assert.equal(CE.analyze(attempts("FI", 10, 6), { weights: WEIGHTS }).topics.FI.mastery, st.analysis.topics.FI.mastery, "no penalty to the competence estimate");
  prev.days.forEach(d => d.tasks.forEach(t => assert.equal(t.status, "todo")));
  const wants = prev.days.slice(0, 3).flatMap(d => d.tasks).filter(t => t.type === "learn").map(t => t.module);
  const again = r.plan.days.flatMap(d => d.tasks).filter(t => t.type === "learn").map(t => t.module);
  wants.forEach(m => assert.ok(again.includes(m), `${m} missed learning returns to the plan`));
});
test("missed days: a plan that keeps being missed is scaled to what the learner really does", () => {
  const st = baseState({ topicStatus: allStatus("none") });
  const prev = CE.buildPlan(profile({ hoursPerDay: 4 }), st, "2026-11-10");
  const log = {}; for (let i = 0; i < 14; i++) log[CE.addDays("2026-11-10", i)] = 60;
  const r = CE.replan(profile({ hoursPerDay: 4 }), st, "2026-11-24", prev, log);
  assert.ok(r.adherence.rate < 0.6);
  assert.ok(r.plan.days[0].minutes < 240 && r.plan.days[0].minutes >= 144);
  assert.ok(r.plan.warnings.some(w => /giảm xuống/.test(w)));
});
test("versions: a replan adds a version and keeps the old one", () => {
  const st = baseState({ topicStatus: allStatus("partial") });
  const p1 = CE.buildPlan(profile(), st, TODAY), p2 = CE.buildPlan(profile({ hoursPerDay: 2 }), st, "2026-11-30");
  let v = CE.pushVersion([], p1, "first", TODAY);
  v = CE.pushVersion(v, p2, "fewer hours", "2026-11-30");
  assert.equal(v.length, 2); assert.equal(v[0].plan.days[0].date, TODAY); assert.equal(v[1].v, 2);
  assert.ok(v[1].summary.capacity < v[0].summary.capacity);
  for (let i = 0; i < 4; i++) v = CE.pushVersion(v, p2, "x", "2026-12-01");
  assert.equal(v.length, 6); assert.equal(v[0].summary.daysLeft, 170); assert.equal(v[0].plan, null, "oldest full plans are trimmed to their summary, never dropped");
});
test("completion: a task is not done until there is evidence", () => {
  assert.equal(CE.completeTask({ type: "learn" }, {}).status, "todo");
  assert.equal(CE.completeTask({ type: "learn" }, { selfReport: true }).status, "reported");
  assert.equal(CE.completeTask({ type: "learn" }, { checkTotal: 5, checkCorrect: 4 }).status, "verified");
  assert.equal(CE.completeTask({ type: "learn" }, { checkTotal: 5, checkCorrect: 1 }).status, "reported");
  assert.equal(CE.completeTask({ type: "practice", n: 20 }, { answered: 5 }).status, "todo");
  assert.equal(CE.completeTask({ type: "practice", n: 20 }, { answered: 16 }).status, "verified");
  assert.equal(CE.completeTask({ type: "mock" }, { selfReport: true }).status, "todo");
});

// ---------------- spaced repetition and readiness ----------------
test("spaced repetition: intervals grow with success, reset on failure, retention decays", () => {
  let r = CE.startReview("2026-11-24");
  assert.equal(r.next, "2026-11-25");
  r = CE.recordReview(r, 1, 5, "2026-11-25"); assert.equal(r.stage, 1); assert.equal(r.next, CE.addDays("2026-11-25", Math.round(3 * r.ease)));
  r = CE.recordReview(r, 1, 5, r.next); r = CE.recordReview(r, 1, 5, r.next);
  assert.ok(r.stage >= 3 && r.ease > 1.2);
  const stage = r.stage; r = CE.recordReview(r, 0.2, 5, r.next);
  assert.equal(r.stage, stage - 1); assert.equal(r.next, CE.addDays(r.last, 1));
  assert.equal(CE.recordReview(r, 1, 1, "2027-01-01").stage, r.stage, "one question is not enough to change the schedule");
  const fresh = CE.startReview("2026-11-24");
  assert.ok(CE.retention(fresh, "2026-11-24") === 1 && CE.retention(fresh, "2026-12-24") < 0.01 && CE.retention(null, "2026-11-24") === null);
});
test("readiness: no number without enough evidence, an honest interval with it", () => {
  const none = CE.readiness(CE.analyze([], { weights: WEIGHTS }), WEIGHTS, {});
  assert.equal(none.enough, false); assert.equal(none.label, "Chưa đủ dữ liệu");
  const rows = TOPICS.flatMap(t => attempts(t.id, 6, 4));
  const r = CE.readiness(CE.analyze(rows, { weights: WEIGHTS }), WEIGHTS, {});
  assert.ok(r.enough && r.low < r.value && r.value < r.high && r.high - r.low > 10);
  assert.match(r.note, /KHÔNG phải xác suất đỗ/);
  const strong = CE.readiness(CE.analyze(TOPICS.flatMap(t => attempts(t.id, 15, 14)), { weights: WEIGHTS }), WEIGHTS, {});
  assert.ok(strong.value > r.value);
});

// ---------------- isolation ----------------
test("isolation: analysing one account's attempts never touches another's", () => {
  const A = attempts("FI", 10, 2), B = attempts("FI", 10, 9);
  const copyB = JSON.stringify(B);
  const a = CE.analyze(A, { weights: WEIGHTS }), b = CE.analyze(B, { weights: WEIGHTS });
  assert.ok(a.topics.FI.acc < 0.3 && b.topics.FI.acc > 0.8);
  assert.equal(JSON.stringify(B), copyB, "inputs are not modified");
});

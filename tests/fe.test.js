// Financial English flashcards: the 12 decks (content checks) and the engine (study order, marks, quiz, saved progress).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FE = require(path.join(ROOT, "js/fe/engine.js"));
global.FinEng = FE;
const DECK_FILES = fs.readdirSync(path.join(ROOT, "js/fe/data")).filter(f => f.endsWith(".js"));
DECK_FILES.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/fe/data", f), "utf8"), { filename: f }));
const decks = FE.TOPICS.map(t => ({ t, d: FE.deck(t.id) }));
const all = FE.allCards();
const termCards = all.filter(c => c.type !== "mcq");

// ---------- content ----------
test("12 topics, each loaded from its own file with no rejected cards", () => {
  assert.equal(FE.TOPICS.length, 12);
  assert.equal(DECK_FILES.length, 12);
  decks.forEach(({ t, d }) => {
    assert.ok(d, `deck ${t.id} registered`);
    assert.deepEqual(d.errors, [], `${t.id} has invalid cards`);
  });
});

test("at least 20 cards per topic and 240 in total", () => {
  decks.forEach(({ t, d }) => assert.ok(d.cards.length >= 20, `${t.id}: ${d.cards.length} cards`));
  assert.ok(all.length >= 240, `total ${all.length}`);
});

test("every topic has all four card types and goes from beginner to advanced", () => {
  decks.forEach(({ t, d }) => {
    FE.TYPES.forEach(type => assert.ok(d.cards.some(c => c.type === type), `${t.id} has no ${type} card`));
    FE.LEVELS.forEach(lv => assert.ok(d.cards.some(c => c.difficulty === lv), `${t.id} has no ${lv} card`));
    const ranks = d.cards.map(c => FE.LEVELS.indexOf(c.difficulty));
    assert.deepEqual(ranks, ranks.slice().sort((a, b) => a - b), `${t.id} study order is not beginner → advanced`);
  });
});

test("ids are unique and carry their topic", () => {
  const ids = all.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  all.forEach(c => assert.ok(c.id.startsWith(c.topic + "-"), c.id));
});

test("no term appears twice anywhere, and no definition is reused under another name", () => {
  const seen = new Map();
  termCards.forEach(c => {
    const k = FE.baseTerm(c.term);
    assert.ok(!seen.has(k), `“${c.term}” in ${c.id} repeats ${seen.get(k)}`);
    seen.set(k, c.id);
  });
  const defs = new Map();
  termCards.forEach(c => {
    const k = FE.norm(c.definition);
    assert.ok(!defs.has(k), `${c.id} repeats the definition of ${defs.get(k)}`);
    defs.set(k, c.id);
  });
  const qs = all.filter(c => c.type === "mcq").map(c => FE.norm(c.question));
  assert.equal(new Set(qs).size, qs.length, "a multiple-choice question is repeated");
});

test("a definition never contains its own term (it would give the quiz answer away)", () => {
  termCards.forEach(c => assert.ok(!FE.norm(c.definition).includes(FE.baseTerm(c.term)), `${c.id} “${c.term}”`));
});

test("Vietnamese meanings are distinct inside each topic", () => {
  decks.forEach(({ t, d }) => {
    const vi = d.cards.filter(c => c.type !== "mcq").map(c => FE.norm(c.vietnamese));
    assert.equal(new Set(vi).size, vi.length, t.id);
  });
});

test("fields match the card type", () => {
  all.forEach(c => {
    if (c.type === "vocabulary") {
      assert.ok(c.relatedTerms.length >= 2, `${c.id} related terms`);
      assert.ok(c.cfaApplication.length > 20, `${c.id} CFA application`);
    }
    if (c.type === "definition") assert.ok(/[=÷×]/.test(c.formula), `${c.id} formula`);
    if (c.type === "vocabulary" || c.type === "vi-en") assert.match(c.ipa, /^\/[^/]+\/$/, c.id);
    if (c.type === "mcq") {
      assert.equal(c.options.length, 4, c.id);
      assert.ok("ABCD".includes(c.correctAnswer), c.id);
      assert.ok(c.explanationEn.length > 30 && c.explanationVi.length > 30, `${c.id} explanations`);
      // explanations are shown with shuffled options in the quiz, so they must not point at a letter
      assert.ok(!/\b(option|answer|choice|đáp án|phương án)\s+[A-D]\b/i.test(c.explanationEn + " " + c.explanationVi), `${c.id} names a letter`);
    }
  });
});

test("Vietnamese text is written with Vietnamese letters, English text without them", () => {
  const viChars = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;
  termCards.forEach(c => {
    assert.ok(viChars.test(c.vietnamese + c.explanation), `${c.id} Vietnamese`);
    assert.ok(!viChars.test(c.definition), `${c.id} definition should be English`);
  });
  all.filter(c => c.type === "mcq").forEach(c => assert.ok(viChars.test(c.explanationVi) && !viChars.test(c.explanationEn), c.id));
});

test("no placeholder text", () => {
  const bad = /lorem|ipsum|placeholder|\btodo\b|\btbd\b|xxx|sample text|\?\?\?/i;
  all.forEach(c => Object.entries(c).forEach(([k, v]) => {
    const s = Array.isArray(v) ? v.join(" ") : String(v);
    assert.ok(!bad.test(s), `${c.id}.${k}`);
  }));
});

test("worked numbers in the cards are right", () => {
  const near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.005);
  assert.ok(near(1000 * 1.06 ** 3, 1191.02, 0.01));                          // fund-13
  assert.ok(near(((1 + 0.12 / 12) ** 12 - 1) * 100, 12.68, 0.01));           // fund-14
  assert.ok(near(100 * (1 - 1.1 ** -3) / 0.1, 248.69, 0.01));                // fund-15
  assert.ok(near(500 / 1.08 ** 2, 428.67, 0.01));                            // fund-16
  assert.ok(near(1000 * 1.05 ** 2, 1102.5));                                 // fund-20
  assert.ok(near(60 / 1.1 + 60 / 1.21 - 100, 4.13, 0.01));                   // cf-13
  assert.ok(near(0.4 * 6 * 0.75 + 0.6 * 10, 7.8));                           // cf-15
  assert.ok(near(2 / 0.06, 33.33, 0.01));                                    // eq-14
  assert.ok(near((10 - 1) / 3, 3));                                          // eq-15
  assert.ok(near(1000 / 1.05 ** 3, 863.84, 0.01));                           // fi-07
  assert.ok(near(50 / 950 * 100, 5.26, 0.01));                               // fi-15
  assert.ok(near(5 + 50 / 1.05 - 50, 2.62, 0.01));                           // der-13
  assert.ok(near((1.02 * 1.03 - 1) * 100, 5.06));                            // eco-13
  assert.ok(near(1 / (1 - 0.8 * 0.75), 2.5));                                // eco-15
  assert.ok(near((1.2 / 1.1 - 1) * 100, 9.09, 0.01));                        // eco-21
  assert.ok(near(((1.5 * 0.5) ** 0.5 - 1) * 100, -13.40, 0.01));             // qm-15
  assert.ok(near((2 + 3 + 7 + 9 + 50) / 5, 14.2));                           // qm-02
  assert.ok(near(1.65 * 0.01 * 10e6, 165000));                               // risk-13
  assert.ok(near(0.02 * 1e6 * 0.6, 12000));                                  // risk-14
  assert.ok(near((1.5 ** 0.25 - 1) * 100, 10.67, 0.01));                     // acad-15
  assert.ok(near((110 / 105 - 1) * 100, 4.76, 0.01));                        // acad-22
});

// ---------- engine ----------
test("broken data is reported and the valid cards are kept", () => {
  const good = { id: "x-1", type: "vocabulary", difficulty: "Beginner", term: "T", ipa: "/t/", vietnamese: "Thuật ngữ", definition: "D", explanation: "G", example: "E", relatedTerms: ["R"], cfaApplication: "C" };
  assert.deepEqual(FE.validateCard(good), []);
  assert.ok(FE.validateCard({ ...good, type: "poem" }).length);
  assert.ok(FE.validateCard({ ...good, ipa: "no slashes" }).length);
  assert.ok(FE.validateCard({ id: "m", type: "mcq", difficulty: "Beginner", question: "Q", options: ["a", "b", "c"], correctAnswer: "B", explanationEn: "e", explanationVi: "v" }).length);
  assert.ok(FE.validateCard({ id: "m", type: "mcq", difficulty: "Beginner", question: "Q", options: ["a", "a", "c", "d"], correctAnswer: "E", explanationEn: "e", explanationVi: "v" }).length);
  assert.deepEqual(FE.validateCard(null), ["not a card object"]);
  const saved = FE.deck("acad");
  const r = FE.register("acad", [good, { ...good, id: "x-2", term: "" }, null, good]);
  assert.equal(r.cards.length, 1);
  assert.equal(r.errors.length, 3);                     // missing term, not an object, duplicate id
  assert.equal(FE.register("acad", "not a list").errors.length, 1);
  assert.equal(FE.register("nope", []).errors[0], 'Unknown topic "nope"');
  FE.forget("nope");
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/fe/data/acad.js"), "utf8"));   // restore
  assert.equal(FE.deck("acad").cards.length, saved.cards.length);
});

test("shuffle is a real permutation, repeatable with the same seed, and kept in the saved state", () => {
  const cards = FE.deck("fund").cards, ds = { pos: 5, order: null, mode: "all", list: null };
  FE.shuffleDeck(ds, cards, 42);
  assert.ok(FE.isPermutation(ds.order, cards.length));
  assert.equal(ds.pos, 0);
  const again = { pos: 0, order: null, mode: "all", list: null }; FE.shuffleDeck(again, cards, 42);
  assert.deepEqual(ds.order, again.order);
  const other = { pos: 0, order: null, mode: "all", list: null }; FE.shuffleDeck(other, cards, 43);
  assert.notDeepEqual(ds.order, other.order);
  assert.equal(new Set(FE.sequence(ds, cards).map(c => c.id)).size, cards.length);
  FE.restart(ds);
  assert.deepEqual(FE.sequence(ds, cards).map(c => c.id), cards.map(c => c.id));
});

test("I know / Study again marks, counts and the review list", () => {
  const s = FE.blankState(), cards = FE.deck("fi").cards, ds = FE.deckState(s, "fi");
  assert.deepEqual(FE.counts(s, cards), { total: cards.length, known: 0, review: 0, fresh: cards.length });
  assert.equal(FE.startReview(ds, s, cards), false);   // nothing to review yet
  FE.mark(s, cards[0].id, "k"); FE.mark(s, cards[1].id, "r"); FE.mark(s, cards[2].id, "r");
  assert.deepEqual(FE.counts(s, cards), { total: cards.length, known: 1, review: 2, fresh: cards.length - 3 });
  assert.equal(FE.startReview(ds, s, cards), true);
  assert.deepEqual(FE.sequence(ds, cards).map(c => c.id), [cards[1].id, cards[2].id]);
  FE.mark(s, cards[1].id, "k");                          // learned during the review
  assert.deepEqual(FE.reviewIds(s, cards), [cards[2].id]);
  FE.mark(s, cards[2].id, null);
  assert.equal(s.marks[cards[2].id], undefined);
  s.runs.fi = FE.newRun("fi", cards, 1); s.quiz.fi = { best: 1, last: 1, n: 10, date: "" };
  FE.resetDeck(s, "fi", cards);
  assert.deepEqual(FE.counts(s, cards).known, 0);
  assert.equal(s.decks.fi, undefined); assert.equal(s.runs.fi, undefined); assert.equal(s.quiz.fi, undefined);
});

test("a saved place that no longer fits the deck is repaired", () => {
  const cards = FE.deck("eq").cards;
  const a = { pos: 99, order: [0, 0, 1], mode: "all", list: null };
  assert.equal(FE.sanitize(a, cards), true);
  assert.equal(a.order, null); assert.equal(a.pos, 0);
  const b = { pos: 1, order: null, mode: "review", list: ["gone-1", cards[3].id, "gone-2"] };
  assert.equal(FE.sanitize(b, cards), true);
  assert.deepEqual(b.list, [cards[3].id]); assert.equal(b.pos, 1);   // pos = list length: the end screen
  const c = { pos: 0, order: null, mode: "review", list: ["gone"] };
  FE.sanitize(c, cards);
  assert.equal(c.mode, "all");
  const d = { pos: cards.length, order: null, mode: "all", list: null };
  assert.equal(FE.sanitize(d, cards), false);           // finished deck stays finished
});

test("saved progress: missing, corrupted or partly corrupted data", () => {
  assert.deepEqual(FE.repairState(undefined), { state: FE.blankState(), repaired: false });
  assert.deepEqual(FE.repairState("garbage"), { state: FE.blankState(), repaired: true });
  assert.deepEqual(FE.repairState([1, 2]), { state: FE.blankState(), repaired: true });
  const r = FE.repairState({ v: 1, marks: { "fund-01": "k", "fund-02": "maybe", "fund-03": "r" }, decks: { fund: { pos: -3, order: "x", mode: "weird" }, zzz: {} },
    quiz: { fund: { best: 0.7, last: 0.6, n: 10, date: "2026-11-23" }, fs: { best: 7 } }, runs: { fund: { deck: "fund" }, zzz: {}, fs: 3 }, last: "nowhere" });
  assert.equal(r.repaired, true);
  assert.deepEqual(r.state.marks, { "fund-01": "k", "fund-03": "r" });
  assert.deepEqual(r.state.decks, { fund: { pos: 0, order: null, mode: "all", list: null } });
  assert.deepEqual(Object.keys(r.state.quiz), ["fund"]);
  assert.deepEqual(Object.keys(r.state.runs), ["fund"]);
  assert.equal(r.state.last, null);
  const ok = FE.repairState({ v: 1, marks: { "fs-01": "k" }, decks: { fs: { pos: 3, order: null, mode: "all", list: null } }, quiz: {}, runs: {}, last: "fs" });
  assert.equal(ok.repaired, false);
  assert.equal(ok.state.last, "fs");
});

test("quiz: 10 questions per topic, one right answer each, four different options, repeatable", () => {
  decks.forEach(({ t, d }) => {
    const qs = FE.buildQuiz(d.cards, { seed: 7 });
    assert.equal(qs.length, FE.QUIZ_SIZE, t.id);
    const mcqs = d.cards.filter(c => c.type === "mcq").length;
    assert.equal(qs.filter(q => q.k === "mcq").length, Math.min(mcqs, 4), `${t.id} multiple-choice share`);
    assert.equal(new Set(qs.map(q => q.c)).size, qs.length, `${t.id} a card is asked twice`);
    qs.forEach(q => {
      const v = FE.questionView(q, d.cards);
      assert.ok(v && v.prompt && v.explainEn && v.explainVi, `${t.id} ${q.c}`);
      assert.equal(v.options.length, 4);
      assert.equal(new Set(v.options.map(FE.norm)).size, 4, `${t.id} ${q.c} duplicate option`);
      assert.ok(v.ans >= 0 && v.ans < 4);
      if (q.k === "mcq") assert.equal(v.options[v.ans], v.card.options["ABCD".indexOf(v.card.correctAnswer)]);
      else assert.equal(v.options[v.ans], q.k === "vi" ? v.card.vietnamese : v.card.term);
      if (q.k === "def") assert.ok(!FE.norm(v.sub).includes(FE.baseTerm(v.card.term)), `${q.c} definition gives the answer away`);
    });
    assert.deepEqual(FE.buildQuiz(d.cards, { seed: 7 }), qs);
    assert.notDeepEqual(FE.buildQuiz(d.cards, { seed: 8 }), qs);
  });
});

test("quiz positions of the right answer are spread out", () => {
  const counts = [0, 0, 0, 0];
  for (let s = 1; s <= 30; s++) FE.TOPICS.forEach(t => FE.buildQuiz(FE.deck(t.id).cards, { seed: s }).forEach(q => counts[q.ans]++));
  const total = counts.reduce((a, b) => a + b, 0);
  counts.forEach(n => assert.ok(n / total > 0.18 && n / total < 0.32, `answer positions ${counts}`));
});

test("a quiz in progress survives a reload, and is dropped if the deck changed", () => {
  const cards = FE.deck("pm").cards;
  const run = FE.newRun("pm", cards, 123);
  run.picks = [run.qs[0].ans, (run.qs[1].ans + 1) % 4]; run.i = 2;
  const reloaded = JSON.parse(JSON.stringify(run));
  assert.equal(FE.validRun(reloaded, "pm", cards), true);
  assert.equal(FE.validRun(reloaded, "fs", FE.deck("fs").cards), false);
  assert.equal(FE.validRun({ ...reloaded, i: 99 }, "pm", cards), false);
  assert.equal(FE.validRun({ ...reloaded, picks: [7] }, "pm", cards), false);
  const fewer = cards.filter(c => c.id !== run.qs[0].c);
  assert.equal(FE.validRun(reloaded, "pm", fewer), false);
  const tampered = JSON.parse(JSON.stringify(run)); tampered.qs[0].ans = (tampered.qs[0].ans + 1) % 4;
  assert.equal(FE.validRun(tampered, "pm", cards), false);
});

test("quiz score, wrong answers and best score", () => {
  const cards = FE.deck("risk").cards, run = FE.newRun("risk", cards, 5);
  run.picks = run.qs.map((q, i) => (i < 7 ? q.ans : (q.ans + 1) % 4));
  const res = FE.scoreRun(run);
  assert.equal(res.right, 7); assert.equal(res.total, 10); assert.deepEqual(res.wrong, [7, 8, 9]);
  const s = FE.blankState();
  FE.recordQuiz(s, "risk", res, "2026-11-23");
  FE.recordQuiz(s, "risk", { right: 5, total: 10, share: 0.5 }, "2026-11-24");
  assert.deepEqual(s.quiz.risk, { best: 0.7, last: 0.5, n: 10, date: "2026-11-24" });
});

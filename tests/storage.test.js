// Account storage: built-in questions are stored as progress only and rebuilt on load.
// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

// a fresh browser-like context with its own localStorage for each test
function site(store) {
  const mem = store || {};
  const ctx = vm.createContext({
    console, Date, Math, JSON, Map, Set, Intl,
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  });
  const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const files = ["js/syllabus.js", "js/modules.js", "js/data/qbank.js",
    ...fs.readdirSync(path.join(__dirname, "../js/data")).filter(f => /^q-.*\.js$/.test(f)).map(f => "js/data/" + f),
    "js/coach/bank.js", ...fs.readdirSync(path.join(__dirname, "../js/coach")).filter(f => /^q-.*\.js$/.test(f)).map(f => "js/coach/" + f), "js/storage.js"];
  files.forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return { ctx, mem, run: code => vm.runInContext(code, ctx) };
}

test("storage: built-in question text is not written, progress is", () => {
  const s = site();
  s.run(`const q = DATA.questions.find(x => x.builtIn); q.attempts.push({ date: "2026-11-20", picked: "A", correct: false }); q.inMistakeLog = true; q.flagged = true;
         DATA.questions.push(normalizeQuestion({ id: "own1", topic: "QM", question: "My own question?", choices: { A: "1", B: "2", C: "3" }, answer: "B", source: "self" })); saveData();`);
  const raw = s.mem[s.run("STORAGE_KEY")];
  const stored = JSON.parse(raw);
  const firstBuiltin = s.run("DATA.questions.find(x => x.builtIn).id");
  const sq = stored.questions.find(x => x.id === firstBuiltin);
  assert.deepEqual(Object.keys(sq).sort(), ["attempts", "builtIn", "flagged", "id", "inMistakeLog"]);
  assert.ok(!stored.questions.some(x => x.builtIn && (x.question || x.explanation || x.choices)), "no built-in text stored");
  const own = stored.questions.find(x => x.id === "own1");
  assert.equal(own.question, "My own question?", "your own questions are stored in full");
  assert.ok(raw.length < 120000, `stored size ${raw.length} chars`);
  assert.equal(s.run("SAVE_OK"), true);
});

test("storage: reloading rebuilds the full questions and keeps progress", () => {
  const a = site();
  const id = a.run(`const q = DATA.questions.find(x => x.builtIn && x.topic === "FI"); q.attempts.push({ date: "2026-11-21", picked: "C", correct: true }); q.correctStreak = 1; saveData(); q.id`);
  const full = JSON.parse(a.run(`JSON.stringify(DATA.questions.find(x => x.id === "${id}"))`));
  const b = site(a.mem);                                   // a new page load on the same browser
  const back = JSON.parse(b.run(`JSON.stringify(DATA.questions.find(x => x.id === "${id}"))`));
  delete full.createdAt;                                      // never shown or used for built-in questions, so not stored
  assert.deepEqual(back, full, "identical after a reload");
  assert.equal(b.run("DATA.questions.length"), a.run("DATA.questions.length"));
  assert.equal(b.run(`DATA.questions.filter(x => x.builtIn && !x.question).length`), 0);
});

test("storage: data saved by the old version (with text) still loads, and shrinks on the next save", () => {
  const a = site();
  const oldFormat = a.run("JSON.stringify(DATA)");             // what the previous version wrote
  const mem = { [a.run("STORAGE_KEY")]: oldFormat };
  const b = site(mem);
  assert.equal(b.run("DATA.questions.filter(x => x.builtIn).length"), a.run("DATA.questions.filter(x => x.builtIn).length"));
  b.run("saveData()");
  assert.ok(mem[b.run("STORAGE_KEY")].length < oldFormat.length / 4, "much smaller after one save");
});

test("storage: a full quota is reported, not hidden", () => {
  const s = site();
  s.run(`localStorage.setItem = () => { throw new Error("QuotaExceededError"); }`);
  assert.equal(s.run("saveData()"), false);
  assert.equal(s.run("SAVE_OK"), false);
});

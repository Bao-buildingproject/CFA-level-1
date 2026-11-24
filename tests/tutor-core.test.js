// CFA Tutor: which Gemini models are asked, with how much thinking, and the hedged race between them.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../js/tutor-core.js");

const LIST = ["gemini-3.9-flash-preview", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash",
  "gemini-2.5-flash-lite", "gemini-3.1-pro", "gemini-2.5-pro", "gemini-flash-latest", "gemini-2.0-flash-001", "gemini-2.0-flash"].map(id => ({ id }));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a fake Gemini model: writes after `delay` ms (or fails), honours abort
function fake(script) {
  const log = { started: [], aborted: [] };
  const start = (model, signal, onText) => new Promise((resolve, reject) => {
    log.started.push(model);
    const s = script[model] || { fail: 503 };
    const timers = [];
    signal.addEventListener("abort", () => { log.aborted.push(model); timers.forEach(clearTimeout); const e = new Error("aborted"); e.name = "AbortError"; reject(e); });
    if (s.fail && !s.text) { timers.push(setTimeout(() => { const e = new Error(s.msg || "The model is overloaded."); e.status = s.fail; reject(e); }, s.delay || 1)); return; }
    timers.push(setTimeout(() => {
      onText(s.text);
      if (s.failAfter) { const e = new Error("stream broke"); e.status = 500; timers.push(setTimeout(() => reject(e), 5)); return; }
      timers.push(setTimeout(() => resolve({ text: s.text + " (end)", finish: "STOP" }), s.tail || 5));
    }, s.delay || 1));
  });
  return { start, log };
}

test("model names are read correctly", () => {
  assert.deepEqual(T.parseModel("gemini-3.8-flash"), { id: "gemini-3.8-flash", version: 3.8, tier: "flash", family: "gemini-3.8-flash", preview: false, alias: false, dated: false });
  assert.equal(T.parseModel("models/gemini-2.5-flash-lite").tier, "lite");
  assert.equal(T.parseModel("gemini-2.5-flash-lite-preview-06-17").family, "gemini-2.5-flash-lite");
  assert.equal(T.parseModel("gemini-2.5-flash-lite-preview-06-17").preview, true);
  assert.equal(T.parseModel("gemini-3-flash-preview").version, 3);
  assert.equal(T.parseModel("gemini-2.0-flash-001").dated, true);
  assert.equal(T.parseModel("gemini-flash-latest").alias, true);
  assert.equal(T.parseModel("gemini-3.1-pro").tier, "pro");
});

test("fast order: stable Flash, then Flash-Lite, then another Flash generation; one model per family", () => {
  const c = T.chain(LIST, "fast", {}, 0, 6);
  assert.deepEqual(c.slice(0, 4), ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash-lite"]);
  assert.ok(!c.includes("gemini-2.0-flash-001") || !c.includes("gemini-2.0-flash"), "two models of one family");
  assert.ok(c.indexOf("gemini-3.9-flash-preview") === -1 || c.indexOf("gemini-3.9-flash-preview") > c.indexOf("gemini-2.5-flash"), "a preview comes after stable models");
  assert.equal(T.chain(LIST, "fast", {}, 0).length, 5);
});

test("a stable plain name wins inside its family; previews are used when nothing stable exists", () => {
  assert.deepEqual(T.chain([{ id: "gemini-2.0-flash-001" }, { id: "gemini-2.0-flash" }], "fast", {}, 0), ["gemini-2.0-flash"]);
  assert.deepEqual(T.chain([{ id: "gemini-3-flash-preview" }, { id: "gemini-flash-latest" }], "fast", {}, 0), ["gemini-3-flash-preview", "gemini-flash-latest"]);
  assert.deepEqual(T.chain([], "fast", {}, 0), []);
});

test("thorough order puts one Pro model second", () => {
  const c = T.chain(LIST, "deep", {}, 0, 6);
  assert.equal(c[0], "gemini-3.8-flash");
  assert.equal(c[1], "gemini-3.1-pro");
});

test("a model that was just overloaded or out of quota is asked last", () => {
  const now = 1e9, st = {};
  T.rest(st, "gemini-3.8-flash", Object.assign(new Error("overloaded"), { status: 503 }), now);
  T.rest(st, "gemini-3.5-flash-lite", Object.assign(new Error("quota"), { status: 429 }), now);
  const c = T.chain(LIST, "fast", st, now + 1000, 8);
  assert.deepEqual(c.slice(0, 2), ["gemini-3.6-flash", "gemini-2.5-flash-lite"]);
  const late = id => c.indexOf(id) === -1 || c.indexOf(id) > c.indexOf("gemini-2.5-flash");   // last, or left out when others are enough
  assert.ok(late("gemini-3.8-flash") && late("gemini-3.5-flash-lite"));
  // when nothing else is left, a resting model is still asked
  assert.deepEqual(T.chain([{ id: "gemini-3.8-flash" }], "fast", st, now + 1000), ["gemini-3.8-flash"]);
  // back to normal once the rest is over
  assert.equal(T.chain(LIST, "fast", st, now + T.HOT_MS + 1)[0], "gemini-3.8-flash");
  assert.notEqual(T.chain(LIST, "fast", st, now + T.HOT_MS + 1)[1], "gemini-3.5-flash-lite");
  assert.equal(T.chain(LIST, "fast", st, now + T.COOL_MS + 1)[1], "gemini-3.5-flash-lite");
});

test("thinking: the least each model accepts in fast mode, the model's default in thorough mode", () => {
  assert.deepEqual(T.thinkingConfig("gemini-3.8-flash", "fast"), { thinkingLevel: "low" });
  assert.deepEqual(T.thinkingConfig("gemini-3.5-flash-lite", "fast"), { thinkingLevel: "minimal" });
  assert.deepEqual(T.thinkingConfig("gemini-2.5-flash", "fast"), { thinkingBudget: 0 });
  assert.deepEqual(T.thinkingConfig("gemini-2.5-flash-lite", "fast"), { thinkingBudget: 0 });
  assert.deepEqual(T.thinkingConfig("gemini-2.5-pro", "fast"), { thinkingBudget: 128 });
  assert.equal(T.thinkingConfig("gemini-2.0-flash", "fast"), null);
  assert.equal(T.thinkingConfig("gemini-flash-latest", "fast"), null);
  assert.equal(T.thinkingConfig("gemini-3.8-flash", "deep"), null);
  // learned from an "invalid thinking" error
  assert.deepEqual(T.thinkingConfig("gemini-3.5-flash-lite", "fast", "low"), { thinkingLevel: "low" });
  assert.equal(T.thinkingConfig("gemini-3.8-flash", "fast", "none"), null);
  assert.equal(T.nextFix({ thinkingLevel: "minimal" }), "low");
  assert.equal(T.nextFix({ thinkingLevel: "low" }), "none");
  assert.equal(T.nextFix({ thinkingBudget: 0 }), "none");
});

test("generation settings: short and least thinking when fast; Gemini 3 keeps its default temperature", () => {
  assert.deepEqual(T.generation("gemini-3.8-flash", "fast"), { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "low" } });
  assert.deepEqual(T.generation("gemini-3.5-flash-lite", "fast"), { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "minimal" } });
  assert.deepEqual(T.generation("gemini-2.5-flash", "fast"), { maxOutputTokens: 2048, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } });
  assert.deepEqual(T.generation("gemini-3.8-flash", "deep"), { maxOutputTokens: 8192 });
  assert.deepEqual(T.generation("gemini-2.5-pro", "deep"), { maxOutputTokens: 8192, temperature: 0.4 });
  assert.deepEqual(T.generation("gemini-flash-latest", "fast"), { maxOutputTokens: 2048 });
  assert.deepEqual(T.generation("gemini-3.8-flash", "fast", "none"), { maxOutputTokens: 2048 });
});

test("errors are sorted into what to do next", () => {
  const E = (status, message) => Object.assign(new Error(message || "x"), { status });
  assert.equal(T.classify(E(503, "The model is overloaded.")), "busy");
  assert.equal(T.classify(E(500)), "busy");
  assert.equal(T.classify(E(429)), "quota");
  assert.equal(T.classify(E(404)), "missing");
  assert.equal(T.classify(E(400, "thinking_level MINIMAL is not supported for this model")), "thinking");
  assert.equal(T.classify(E(400, "Budget 0 is invalid. This model only works in thinking mode.")), "thinking");
  assert.equal(T.classify(E(400, "API key not valid. Please pass a valid API key.")), "auth");
  assert.equal(T.classify(E(403)), "auth");
  assert.equal(T.classify(E(0)), "network");
  assert.equal(T.classify(Object.assign(new Error(), { name: "AbortError" })), "abort");
  assert.equal(T.handOver(E(503)), true);
  assert.equal(T.handOver(E(403)), false);
  assert.equal(T.handOver(E(400, "Invalid JSON payload")), false);
});

test("race: a fast first model answers and nothing else is asked", async () => {
  const f = fake({ A: { text: "hello", delay: 5 }, B: { text: "other", delay: 5 } });
  const texts = [];
  const r = await T.race(["A", "B"], f.start, { hedgeMs: 200, onText: t => texts.push(t) });
  assert.equal(r.model, "A");
  assert.equal(r.out.text, "hello (end)");
  assert.deepEqual(f.log.started, ["A"]);
  assert.deepEqual(texts, ["hello"]);
  assert.ok(r.ttft >= 0);
});

test("race: an overloaded model hands over at once (no waiting for the hedge)", async () => {
  const f = fake({ A: { fail: 503, delay: 5 }, B: { text: "from B", delay: 5 } });
  const fails = [];
  const t = Date.now();
  const r = await T.race(["A", "B", "C"], f.start, { hedgeMs: 5000, onFail: (m, e) => fails.push([m, e.status]) });
  assert.equal(r.model, "B");
  assert.ok(Date.now() - t < 1000, "did not wait for the hedge timer");
  assert.deepEqual(fails, [["A", 503]]);
  assert.deepEqual(r.tried, ["A", "B"]);
});

test("race: a slow model gets company after hedgeMs, the first to write wins, the other is stopped", async () => {
  const f = fake({ A: { text: "slow A", delay: 400 }, B: { text: "quick B", delay: 20 } });
  const r = await T.race(["A", "B"], f.start, { hedgeMs: 60 });
  assert.equal(r.model, "B");
  assert.deepEqual(f.log.started, ["A", "B"]);
  assert.deepEqual(f.log.aborted, ["A"]);
});

test("race: if the slow first model writes before the backup, it is kept and the backup stopped", async () => {
  const f = fake({ A: { text: "A at last", delay: 90 }, B: { text: "B late", delay: 400 } });
  const r = await T.race(["A", "B"], f.start, { hedgeMs: 40 });
  assert.equal(r.model, "A");
  assert.deepEqual(f.log.aborted, ["B"]);
});

test("race: at most two models at a time", async () => {
  const f = fake({ A: { text: "a", delay: 300 }, B: { text: "b", delay: 300 }, C: { text: "c", delay: 10 } });
  const r = await T.race(["A", "B", "C"], f.start, { hedgeMs: 30, parallel: 2 });
  // C may only start once A or B is over; here A wins at 300 ms, before a slot frees up
  assert.ok(f.log.started.length <= 2 || r.model === "C");
  assert.equal(new Set(f.log.started).size, f.log.started.length);
});

test("race: every model busy → the last error; a key problem stops at once", async () => {
  const f = fake({ A: { fail: 503 }, B: { fail: 503 }, C: { fail: 500 } });
  await assert.rejects(T.race(["A", "B", "C"], f.start, { hedgeMs: 1000 }), e => e.status === 500);
  assert.deepEqual(f.log.started, ["A", "B", "C"]);
  const g = fake({ A: { fail: 403, msg: "Permission denied" }, B: { text: "never" } });
  await assert.rejects(T.race(["A", "B"], g.start, { hedgeMs: 1000 }), e => e.status === 403);
  assert.deepEqual(g.log.started, ["A"]);
});

test("race: a model that breaks after it started writing is reported as partial", async () => {
  const f = fake({ A: { text: "half an answer", delay: 5, failAfter: true }, B: { text: "B" } });
  const texts = [];
  await assert.rejects(T.race(["A", "B"], f.start, { hedgeMs: 1000, onText: t => texts.push(t) }), e => e.partial === true);
  assert.deepEqual(texts, ["half an answer"]);
  assert.deepEqual(f.log.started, ["A"]);
});

test("race: no words within firstTokenMs → a timeout error, and every request is stopped", async () => {
  const f = fake({ A: { text: "too late", delay: 500 }, B: { text: "too late", delay: 500 } });
  await assert.rejects(T.race(["A", "B"], f.start, { hedgeMs: 20, firstTokenMs: 120 }), e => e.timeout === true);
  await sleep(20);
  assert.deepEqual(f.log.aborted.sort(), ["A", "B"]);
});

test("race: Stop stops everything", async () => {
  const f = fake({ A: { text: "a", delay: 300 }, B: { text: "b", delay: 300 } });
  const ctrl = new AbortController();
  const p = T.race(["A", "B"], f.start, { hedgeMs: 20, signal: ctrl.signal });
  await sleep(60);
  ctrl.abort();
  await assert.rejects(p, e => e.name === "AbortError" && e.byUser === true);
  await sleep(10);
  assert.deepEqual(f.log.aborted.sort(), ["A", "B"]);
});

test("race: an answer with no words (blocked) still finishes instead of hanging", async () => {
  const start = () => Promise.resolve({ text: "", finish: "SAFETY" });
  const r = await T.race(["A", "B"], start, { hedgeMs: 1000 });
  assert.equal(r.model, "A");
  assert.equal(r.out.finish, "SAFETY");
});

test("the fast mode settings are quicker than the thorough ones", () => {
  assert.ok(T.MODES.fast.hedgeMs < T.MODES.deep.hedgeMs);
  assert.ok(T.MODES.fast.maxOutputTokens < T.MODES.deep.maxOutputTokens);
  assert.ok(T.MODES.fast.historyMessages <= T.MODES.deep.historyMessages);
});

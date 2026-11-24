// ============================================================
// tutor-core.js — how the CFA Tutor talks to Gemini quickly, without the page code.
//   • chain():   which models to ask, in order. Fast answers come from Flash with the least thinking; when a
//                model is overloaded the next one is from a different family (Flash-Lite, another Flash
//                generation), because Google's capacity is per model. Models that just failed go last.
//   • thinkingConfig(): the smallest thinking each model accepts (thinking is what makes the first words slow).
//   • race():    asks the first model; if it has not started writing after `hedgeMs`, asks the next one too and
//                keeps whichever writes first; a model that fails before writing hands over at once.
// Works in the browser (window.TutorCore) and in Node (module.exports) for the tests.
// ============================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TutorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODES = {
    fast: { hedgeMs: 3000, firstTokenMs: 25000, maxOutputTokens: 2048, historyMessages: 10 },
    deep: { hedgeMs: 12000, firstTokenMs: 60000, maxOutputTokens: 8192, historyMessages: 14 }
  };
  const HOT_MS = 2 * 60 * 1000;      // a model that was overloaded goes last for 2 minutes
  const COOL_MS = 10 * 60 * 1000;    // a model out of free requests goes last for 10 minutes

  // ---------- models ----------
  // "gemini-3.8-flash" → { version: 3.8, tier: "flash", family: "gemini-3.8-flash", preview: false }
  function parseModel(id) {
    id = String(id || "").replace(/^models\//, "");
    const m = id.match(/^gemini-(\d+(?:\.\d+)?)-(pro|flash-lite|flash)(?:-(.+))?$/);
    if (!m) {
      const tier = /flash-lite/.test(id) ? "lite" : /flash/.test(id) ? "flash" : /pro/.test(id) ? "pro" : "";
      return { id, version: 0, tier, family: id, preview: /preview|exp/.test(id), alias: /latest/.test(id) };
    }
    const rest = m[3] || "";
    return { id, version: parseFloat(m[1]), tier: m[2] === "flash-lite" ? "lite" : m[2], family: `gemini-${m[1]}-${m[2]}`,
      preview: /preview|exp/.test(rest), alias: /latest/.test(rest), dated: /\d/.test(rest) };
  }
  // within a family: the plain stable name, then a dated stable one ("-001"), then previews; newest version first
  const better = (a, b) => (a.preview - b.preview) || (a.alias - b.alias) || ((a.dated || 0) - (b.dated || 0)) || (b.version - a.version) || (a.id < b.id ? -1 : 1);

  // the order in which models are asked; `state` holds { hot: {id: until}, cool: {id: until} }
  function chain(models, mode, state, now, max) {
    state = state || {}; now = now == null ? Date.now() : now; max = max || 5;
    const all = [], seen = new Set();
    (models || []).forEach(m => { const p = parseModel(typeof m === "string" ? m : m && m.id); if (p.tier && !seen.has(p.id)) { seen.add(p.id); all.push(p); } });
    // one model per family (aliases such as gemini-flash-latest are only a last resort)
    const fam = new Map();
    all.filter(p => !p.alias).forEach(p => { const cur = fam.get(p.family); if (!cur || better(p, cur) < 0) fam.set(p.family, p); });
    const byTier = t => [...fam.values()].filter(p => p.tier === t).sort(better);
    const flash = byTier("flash"), lite = byTier("lite"), pro = byTier("pro");
    const order = [];
    const n = Math.max(flash.length, lite.length);
    for (let i = 0; i < n; i++) { if (flash[i]) order.push(flash[i]); if (lite[i]) order.push(lite[i]); }   // Flash, Flash-Lite, Flash, …
    if (mode === "deep") order.splice(1, 0, ...pro.slice(0, 1)); else order.push(...pro);              // a thorough answer may come from Pro
    all.filter(p => p.alias).forEach(p => order.push(p));
    const out = [...new Set(order.map(p => p.id))];
    const resting = id => (state.hot && state.hot[id] > now) || (state.cool && state.cool[id] > now);
    const ready = out.filter(id => !resting(id)), later = out.filter(resting);
    return ready.concat(later).slice(0, max);
  }

  // ---------- thinking (what delays the first words) ----------
  // fast: the least thinking each family accepts — Gemini 3+ Flash "low" (3.8 Flash rejects "minimal"),
  //       Flash-Lite "minimal", 2.5 Flash / Flash-Lite budget 0 (off), 2.5 Pro the minimum budget 128.
  // deep: the model's own default. `fix` is what an earlier "invalid thinking" error taught: a level, or "none".
  function thinkingConfig(id, mode, fix) {
    if (mode !== "fast" || fix === "none") return null;
    if (fix) return { thinkingLevel: fix };
    const p = parseModel(id);
    if (p.version >= 3) return { thinkingLevel: p.tier === "lite" ? "minimal" : "low" };
    if (p.version >= 2.5) return { thinkingBudget: p.tier === "pro" ? 128 : 0 };
    return null;
  }
  // after a 400 about thinking: minimal → low → no setting at all
  function nextFix(tc) { return tc && tc.thinkingLevel === "minimal" ? "low" : "none"; }
  // the whole generationConfig for one model. Gemini 3 keeps its default temperature (Google advises against
  // lowering it: answers can loop, which is slow and long); Gemini 2.x gets a steadier 0.4.
  function generation(id, mode, fix) {
    const M = MODES[mode] || MODES.fast, p = parseModel(id), g = { maxOutputTokens: M.maxOutputTokens };
    if (p.version && p.version < 3) g.temperature = 0.4;
    const tc = thinkingConfig(id, mode, fix);
    if (tc) g.thinkingConfig = tc;
    return g;
  }

  // ---------- errors ----------
  function classify(e) {
    if (!e) return "other";
    if (e.name === "AbortError") return "abort";
    if (e.timeout) return "slow";
    const s = e.status || 0, msg = String(e.message || "");
    if (!s) return "network";
    if (s === 400 && /thinking|budget|thought/i.test(msg)) return "thinking";
    if (s === 400 && /api[ _-]?key|credential/i.test(msg)) return "auth";
    if (s === 401 || s === 403) return "auth";
    if (s === 404) return "missing";
    if (s === 429) return "quota";
    if (s >= 500) return "busy";
    return "other";
  }
  const handOver = e => ["busy", "quota", "missing", "network", "slow", "thinking"].includes(classify(e));
  function rest(state, id, e, now) {
    now = now == null ? Date.now() : now;
    const k = classify(e);
    if (k === "busy" || k === "slow" || k === "network") (state.hot || (state.hot = {}))[id] = now + HOT_MS;
    if (k === "quota") (state.cool || (state.cool = {}))[id] = now + COOL_MS;
    return k;
  }

  // ---------- asking several models, keeping the first that writes ----------
  // start(model, signal, onText) must return a promise of the finished answer and call onText(textSoFar)
  // as text arrives. Resolves { model, out, ttft, tried } or rejects with the last error (err.partial = true
  // when the answering model failed after it had started writing).
  function race(models, start, o) {
    o = Object.assign({ hedgeMs: 3000, firstTokenMs: 25000, parallel: 2, retryable: handOver, now: () => Date.now() }, o || {});
    return new Promise((resolve, reject) => {
      const t0 = o.now(), runs = [], tried = [];
      let next = 0, winner = null, done = false, lastErr = null, hedgeT = null;
      const live = () => runs.filter(r => !r.over);
      const stopTimers = () => { clearTimeout(hedgeT); clearTimeout(deadT); };
      const end = (ok, v) => {
        if (done) return;
        done = true; stopTimers();
        runs.forEach(r => { if (r !== winner && !r.over) r.ctrl.abort(); });
        ok ? resolve(v) : reject(v);
      };
      const hedge = () => {
        if (done || winner || next >= models.length) return;
        if (live().length < o.parallel) launch("slow");
        else hedgeT = setTimeout(hedge, Math.max(50, o.hedgeMs / 4));
      };
      const launch = why => {
        if (done || winner || next >= models.length) return false;
        const model = models[next++], run = { model, ctrl: new AbortController(), over: false };
        runs.push(run); tried.push(model);
        if (o.onAttempt) o.onAttempt(model, why, runs.length);
        clearTimeout(hedgeT);
        if (next < models.length) hedgeT = setTimeout(hedge, o.hedgeMs);
        let p;
        try {
          p = Promise.resolve(start(model, run.ctrl.signal, text => {
            if (done || !text) return;
            if (!winner) {
              winner = run; run.ttft = o.now() - t0; stopTimers();
              runs.forEach(r => { if (r !== run && !r.over) r.ctrl.abort(); });
              if (o.onWinner) o.onWinner(model, run.ttft);
            }
            if (winner === run && o.onText) o.onText(text);
          }));
        } catch (err) { p = Promise.reject(err); }
        p.then(out => {
          run.over = true;
          if (done || (winner && winner !== run)) return;
          if (!winner) { winner = run; run.ttft = o.now() - t0; }
          end(true, { model, out, ttft: run.ttft, tried });
        }, err => {
          run.over = true;
          if (done || (winner && winner !== run)) return;
          if (err && err.name === "AbortError") { if (!winner && !live().length && !launch("next")) end(false, lastErr || err); return; }
          lastErr = err;
          if (o.onFail) o.onFail(model, err);
          if (winner === run) { err.partial = true; end(false, err); return; }
          if (!o.retryable(err)) { end(false, err); return; }
          if (!launch("failed") && !live().length) end(false, lastErr);
        });
        return true;
      };
      const deadT = setTimeout(() => { if (!winner) { const e = new Error("No answer in time"); e.timeout = true; end(false, e); } }, o.firstTokenMs);
      if (o.signal) {
        const stop = () => { runs.forEach(r => { if (!r.over) r.ctrl.abort(); }); const e = new Error("Stopped"); e.name = "AbortError"; e.byUser = true; end(false, e); };
        if (o.signal.aborted) { stop(); return; }
        o.signal.addEventListener("abort", stop, { once: true });
      }
      launch("first");
    });
  }

  return { MODES, HOT_MS, COOL_MS, parseModel, chain, thinkingConfig, nextFix, generation, classify, handOver, rest, race };
});

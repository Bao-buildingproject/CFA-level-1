// ============================================================
// alt/world.js — Alternative Empire: the economic simulation (one step = one quarter)
// Growth, inflation, policy rate, credit spread, equities, bonds, volatility, liquidity,
// commodity prices and futures curve slopes, office and housing demand, traffic, timber,
// farmland values, a digital token index and the weather at harvest.
// Every random number is a pure function of (seed, name, quarter), so the same seed and the
// same events give the same economy, whatever the player does and however often it is saved.
// All of it is SIMULATED unless the player imports a replay file: then the series in that file
// (real quarter-end prices, rates and inflation from WiData, kept only in the player's browser)
// replace the matching simulated variables, and the regime is read from the real data.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AltWorld = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Deterministic randomness ----------
  function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  const uni = (...k) => (hash32(k.join("|")) + 0.5) / 4294967296;                // (0, 1)
  const gauss = (...k) => Math.sqrt(-2 * Math.log(uni(...k, "a"))) * Math.cos(2 * Math.PI * uni(...k, "b"));
  const r6 = x => Math.round(x * 1e6) / 1e6;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // ---------- Calendar ----------
  const START_YEAR = 2027;
  // base: { year } of quarter 0 (the campaign starts in 2027; a replay starts in a real year)
  const label = (q, base) => `Q${(q % 4) + 1}/${((base && base.year) || START_YEAR) + Math.floor(q / 4)}`;
  const year = (q, base) => ((base && base.year) || START_YEAR) + Math.floor(q / 4);
  const isHarvest = q => q % 4 === 2;          // Q3: row crops come in
  const isYearEnd = q => q % 4 === 3;          // Q4: timber harvest and annual fees

  // ---------- Regimes (annualised targets) ----------
  const REGIMES = {
    exp:   { name: "Mở rộng",          g: 0.030, pi: 0.024, eq: 0.10, vol: 0.15, spread: 0.035, liq: 0.85, office: 0.010, resi: 0.020, traffic: 0.030, cmd: 0.03, token: 0.20 },
    slow:  { name: "Giảm tốc",         g: 0.012, pi: 0.028, eq: 0.03, vol: 0.20, spread: 0.045, liq: 0.70, office: -0.010, resi: 0.010, traffic: 0.010, cmd: 0.00, token: -0.15 },
    rec:   { name: "Suy thoái",        g: -0.018, pi: 0.014, eq: -0.20, vol: 0.32, spread: 0.075, liq: 0.45, office: -0.060, resi: -0.020, traffic: -0.030, cmd: -0.15, token: -0.60 },
    recov: { name: "Phục hồi",         g: 0.028, pi: 0.018, eq: 0.16, vol: 0.22, spread: 0.050, liq: 0.70, office: 0.000, resi: 0.020, traffic: 0.030, cmd: 0.06, token: 0.25 },
    stag:  { name: "Đình lạm",         g: 0.002, pi: 0.055, eq: -0.05, vol: 0.26, spread: 0.055, liq: 0.60, office: -0.030, resi: 0.000, traffic: 0.000, cmd: 0.14, token: -0.30 }
  };
  const TRANS = {
    exp:   { exp: 0.84, slow: 0.12, stag: 0.04 },
    slow:  { exp: 0.22, slow: 0.58, rec: 0.15, stag: 0.05 },
    rec:   { rec: 0.50, recov: 0.50 },
    recov: { recov: 0.45, exp: 0.50, slow: 0.05 },
    stag:  { stag: 0.60, slow: 0.25, rec: 0.15 }
  };
  const DIFFICULTY = {
    analyst:  { name: "Analyst (dễ)", shock: 0.7, bad: 0.7, events: 0.6 },
    standard: { name: "Standard", shock: 1.0, bad: 1.0, events: 1.0 },
    crisis:   { name: "Crisis (khó)", shock: 1.25, bad: 1.6, events: 1.5 }
  };

  // ---------- Real-market replay ----------
  // A replay file (schema alt-replay/1) holds quarter-end values. replayFrom() cuts it at the
  // quarter before the chosen start year, so index i is the state at the start of game quarter i.
  // A value may be null (no data for that quarter): the simulation fills it, and the game says so.
  const REPLAY_KEYS = ["energy", "gold", "metals", "corn", "rice", "soymeal", "timber", "rate", "infl", "equity", "vol"];
  const REPLAY_NEED = ["equity", "rate", "infl"];
  function validateReplay(doc) {
    const errors = [];
    if (!doc || typeof doc !== "object") return { ok: false, errors: ["Không đọc được tệp"] };
    if (doc.schema !== "alt-replay/1") errors.push("Không phải tệp replay của Alternative Empire (schema alt-replay/1)");
    const Q = Array.isArray(doc.quarters) ? doc.quarters : [];
    if (Q.length < 8) errors.push("Cần ít nhất 8 quý dữ liệu");
    for (let i = 0; i < Q.length; i++) {
      if (!/^\d{4}Q[1-4]$/.test(Q[i])) { errors.push(`Quý không hợp lệ: ${Q[i]}`); break; }
      if (i) { const [y0, q0] = Q[i - 1].split("Q").map(Number), [y1, q1] = Q[i].split("Q").map(Number); if (y1 * 4 + q1 !== y0 * 4 + q0 + 1) { errors.push(`Quý không liên tục: ${Q[i - 1]} → ${Q[i]}`); break; } }
    }
    const S = doc.series || {}, gaps = {};
    for (const k of REPLAY_NEED) if (!S[k]) errors.push(`Thiếu chuỗi bắt buộc: ${k}`);
    for (const k of Object.keys(S)) {
      if (!REPLAY_KEYS.includes(k)) continue;
      const v = S[k] && S[k].values;
      if (!Array.isArray(v) || v.length !== Q.length) { errors.push(`Chuỗi ${k} phải có đúng ${Q.length} giá trị`); continue; }
      const nums = v.filter(x => x != null);
      if (nums.some(x => typeof x !== "number" || !isFinite(x))) errors.push(`Chuỗi ${k} có giá trị không phải số`);
      else if (nums.length < Q.length / 2) errors.push(`Chuỗi ${k} trống quá nửa số quý`);
      else if (k !== "infl" && k !== "rate" && nums.some(x => x <= 0)) errors.push(`Chuỗi ${k} phải dương`);
      else if (k === "rate" && nums.some(x => x < -5 || x > 30)) errors.push("Lãi suất ngoài khoảng hợp lý (%/năm)");
      if (nums.length < v.length) gaps[k] = v.length - nums.length;
    }
    const starts = Q.filter((q, i) => q.endsWith("Q4") && i < Q.length - 4).map(q => +q.slice(0, 4) + 1);
    return { ok: errors.length === 0, errors, quarters: Q, starts, keys: Object.keys(S).filter(k => REPLAY_KEYS.includes(k)), gaps, title: doc.title || "", source: doc.source || "", fetched: doc.fetched || "" };
  }
  function replayFrom(doc, startYear) {
    const v = validateReplay(doc);
    if (!v.ok) throw new Error(v.errors.join("; "));
    const i0 = doc.quarters.indexOf(`${startYear - 1}Q4`);
    if (i0 < 0 || i0 > doc.quarters.length - 5) throw new Error("Năm bắt đầu nằm ngoài dữ liệu");
    const d = {};
    for (const k of v.keys) d[k] = doc.series[k].values.slice(i0);
    return { year: startYear, n: doc.quarters.length - i0, last: doc.quarters[doc.quarters.length - 1], title: v.title, source: v.source, fetched: v.fetched,
      names: Object.fromEntries(v.keys.map(k => [k, doc.series[k].name || k])), d };
  }
  // The real values for game quarter i (null once the file runs out). Rates, inflation and VIX are
  // levels in %; prices are indices = 100 × value / first value from the start (equity is the S&P 500
  // level; step() turns it into the quarter's return). A null is a quarter with no data: the
  // simulation fills it, and the next real quarter puts the index back on the real path.
  function realAt(rp, i) {
    if (!rp || i >= rp.n) return null;
    const d = rp.d, at = k => d[k] && d[k][i] != null ? d[k][i] : null;
    const rel = k => { if (at(k) == null) return null; const b = d[k].find(x => x != null); return at(k) / b; };
    const pc = k => at(k) != null ? at(k) / 100 : null;
    const crops = ["corn", "rice", "soymeal"].filter(k => d[k]), cr = crops.map(rel);
    const tb = rel("timber"), eq = rel("equity");
    return {
      equity: eq != null ? 100 * eq : null, rate: pc("rate"), infl: pc("infl"), vol: pc("vol"),
      energy: rel("energy") != null ? 100 * rel("energy") : null, gold: rel("gold") != null ? 100 * rel("gold") : null,
      metals: rel("metals") != null ? 100 * rel("metals") : null,
      // equal-weight crop index, real only when every crop in the file has a value for the quarter
      ags: cr.length && cr.every(x => x != null) ? 100 * cr.reduce((s, x) => s + x, 0) / cr.length : null,
      // standing timber moves far less than lumber futures: the game damps the real lumber price (power 0.4)
      timber: tb != null ? 100 * Math.pow(tb, 0.4) : null
    };
  }
  // the regime read from real data, so spreads, liquidity and property respond consistently
  function realRegime(r, prev) {
    if ((r.vol != null && r.vol >= 0.30) || r.eqRet <= -0.12) return "rec";
    if (r.infl != null && r.infl >= 0.045 && r.eqRet < 0.03) return "stag";
    if (prev === "rec") return "recov";
    return r.eqRet >= 0.015 ? "exp" : "slow";
  }

  function create({ seed, difficulty, init, replay }) {
    const w = { seed: seed >>> 0, difficulty: DIFFICULTY[difficulty] ? difficulty : "standard", q: 0, regime: "exp",
      gdp: 0.026, infl: 0.026, rate: 0.035, spread: 0.038, vol: 0.16, liq: 0.82,
      eqRet: 0, bondRet: 0, benchRet: 0, eqIdx: 100, benchIdx: 100,
      energy: 100, metals: 100, ags: 100, kE: 0.03, kM: 0.02, kA: 0.01,   // futures curve slope k = r + c − i (annual)
      office: 100, resi: 100, traffic: 100, timber: 100, land: 100, token: 100, tokenRet: 0, weather: 1, cpi: 100, gold: 100,
      base: { year: replay ? replay.year : START_YEAR }, rp: replay || null,
      hist: [] };
    for (const k of ["regime", "gdp", "infl", "rate", "spread", "vol", "liq"]) if (init && init[k] != null) w[k] = init[k];
    const r0 = realAt(w.rp, 0);
    if (r0) { for (const k of ["rate", "infl", "vol"]) if (r0[k] != null) w[k] = r6(r0[k]); }
    w.hist.push(snap(w));
    return w;
  }
  function snap(w) {
    return { q: w.q, regime: w.regime, gdp: w.gdp, infl: w.infl, rate: w.rate, spread: w.spread, vol: w.vol, liq: w.liq, eqRet: w.eqRet, eqIdx: w.eqIdx,
      benchRet: w.benchRet, benchIdx: w.benchIdx, energy: w.energy, metals: w.metals, ags: w.ags, kE: w.kE, kM: w.kM, kA: w.kA, office: w.office, resi: w.resi,
      traffic: w.traffic, timber: w.timber, land: w.land, token: w.token, weather: w.weather, gold: w.gold, real: !!w.real, gaps: (w.gaps || []).slice() };
  }
  function nextRegime(w, d) {
    const row = TRANS[w.regime], u = uni(w.seed, "regime", w.q + 1);
    const weights = Object.entries(row).map(([k, p]) => [k, (k === "rec" || k === "stag") ? p * d.bad : p]);
    const tot = weights.reduce((s, [, p]) => s + p, 0);
    let acc = 0;
    for (const [k, p] of weights) { acc += p / tot; if (u <= acc) return k; }
    return weights[weights.length - 1][0];
  }
  // shocks: [{ v: variable, add?: number, mul?: number }] for this quarter (events)
  function step(w0, shocks) {
    const w = JSON.parse(JSON.stringify(w0)), d = DIFFICULTY[w.difficulty], S = w.seed, q1 = w.q + 1;
    const z = k => gauss(S, k, q1) * d.shock;
    if (w.gold == null) w.gold = 100;                      // saves from before gold had its own index
    const prev = { rate: w.rate, spread: w.spread, vol: w.vol, energy: w.energy, metals: w.metals, ags: w.ags, token: w.token, kE: w.kE, kM: w.kM, kA: w.kA, gold: w.gold, infl: w.infl };
    const real = realAt(w.rp, q1);
    w.real = !!real;
    if (real) real.eqRet = real.equity != null ? real.equity / w0.eqIdx - 1 : null;   // the move that puts the index on the real level
    // what the file has for this quarter is what happened: no event moves it. A blank is simulated (w.gaps).
    const rv = real ? replayed(w).filter(k => real[k] != null) : [];
    w.gaps = real ? replayed(w).filter(k => real[k] == null) : [];
    if (rv.length) shocks = (shocks || []).filter(s => !rv.includes(s.v));
    w.regime = real && real.eqRet != null ? realRegime(real, w0.regime) : nextRegime(w, d);
    const R = REGIMES[w.regime];
    w.gdp = r6(0.55 * w.gdp + 0.45 * R.g + 0.006 * z("g"));
    w.infl = r6(clamp(0.7 * w.infl + 0.3 * R.pi + 0.004 * z("pi"), -0.01, 0.12));
    const taylor = 0.01 + w.infl + 0.5 * (w.infl - 0.02) + 0.5 * (w.gdp - 0.02);
    w.rate = r6(clamp(0.7 * w.rate + 0.3 * taylor + 0.0015 * z("r"), 0, 0.12));
    w.spread = r6(clamp(0.6 * w.spread + 0.4 * R.spread + 0.004 * z("s"), 0.015, 0.2));
    w.vol = r6(clamp(0.5 * w.vol + 0.5 * R.vol + 0.02 * z("v"), 0.08, 0.8));
    w.liq = r6(clamp(0.5 * w.liq + 0.5 * R.liq + 0.04 * z("l"), 0.05, 1));
    // weather for the coming harvest: mostly normal, sometimes poor or bumper
    const wu = uni(S, "weather", q1);
    w.weather = r6(wu < 0.08 ? 0.7 : wu > 0.92 ? 1.1 : 1 + 0.04 * gauss(S, "wx", q1));
    apply(w, shocks, ["gdp", "infl", "rate", "spread", "vol", "liq", "weather"]);
    if (real) for (const k of ["rate", "infl", "vol"]) if (real[k] != null) w[k] = r6(real[k]);
    // markets react to the new state
    const dS = w.spread - prev.spread, dR = w.rate - prev.rate;
    w.eqRet = r6(clamp(R.eq / 4 - 2.5 * dS - 1.2 * dR + (w.vol / 2) * z("eq"), -0.45, 0.45));
    w.bondRet = r6(clamp(prev.rate / 4 - 6 * dR, -0.15, 0.15));
    const cmd = (k, beta, sig) => r6(clamp(R.cmd / 4 + beta * w.eqRet * 0.3 + sig * z(k), -0.5, 0.6));
    w.energy = r6(Math.max(5, w.energy * (1 + cmd("en", 1.2, 0.09))));
    w.metals = r6(Math.max(5, w.metals * (1 + cmd("mt", 1.0, 0.06))));
    w.ags = r6(Math.max(5, w.ags * (1 + cmd("ag", 0.4, 0.05) + (1 - w.weather) * 0.35)));   // poor harvests lift crop prices
    w.gold = r6(Math.max(5, w.gold * (1 + clamp(0.6 * (w.metals / prev.metals - 1) - 0.25 * w.eqRet + 0.5 * (w.infl - prev.infl) + 0.03 * z("au"), -0.4, 0.5))));
    if (real) {
      if (real.eqRet != null) w.eqRet = r6(real.eqRet);
      for (const k of ["energy", "gold", "metals", "ags"]) if (real[k] != null) w[k] = r6(real[k]);
    }
    // futures curve slopes: carry r + storage − convenience yield; low inventories (price spikes) bring backwardation
    const slope = (k, px0, px1, base) => r6(clamp(0.6 * w0[k] + 0.4 * (w.rate + base) - 1.6 * (px1 / px0 - 1) + 0.01 * z(k), -0.25, 0.25));
    w.kE = slope("kE", prev.energy, w.energy, 0.01); w.kM = slope("kM", prev.metals, w.metals, 0.0); w.kA = slope("kA", prev.ags, w.ags, -0.01);
    w.office = r6(Math.max(20, w.office * (1 + R.office / 4 + 0.01 * z("of"))));
    w.resi = r6(Math.max(20, w.resi * (1 + R.resi / 4 + 0.006 * z("re"))));
    w.traffic = r6(Math.max(20, w.traffic * (1 + R.traffic / 4 + 0.6 * (w.gdp - 0.02) / 4 + 0.01 * z("tr"))));
    w.timber = r6(Math.max(20, w.timber * (1 + 0.3 * (w.resi / w0.resi - 1) + w.infl / 4 * 0.5 + 0.035 * z("tb"))));
    if (real && real.timber != null) w.timber = r6(real.timber);
    w.land = r6(Math.max(20, w.land * (1 + w.infl / 4 * 0.9 + 0.004 + 0.008 * z("ld") - 0.3 * Math.max(0, dR))));
    w.tokenRet = r6(clamp(R.token / 4 + 1.6 * w.eqRet + 0.22 * z("tk"), -0.8, 1.5));
    w.token = r6(Math.max(1, w.token * (1 + w.tokenRet)));
    w.cpi = r6(w.cpi * (1 + w.infl / 4));
    apply(w, shocks, ["eqRet", "energy", "metals", "ags", "office", "resi", "traffic", "timber", "land", "token", "kE", "kM", "kA"]);
    // index levels after any shock to the quarter's equity return
    w.eqIdx = r6(w.eqIdx * (1 + w.eqRet));
    w.benchRet = r6(0.6 * w.eqRet + 0.4 * w.bondRet);
    w.benchIdx = r6(w.benchIdx * (1 + w.benchRet));
    w.q = q1;
    w.hist.push(snap(w));
    if (w.hist.length > 48) w.hist.shift();
    return w;
  }
  function apply(w, shocks, vars) {
    for (const s of shocks || []) {
      if (!vars.includes(s.v)) continue;
      if (s.add != null) w[s.v] = r6(w[s.v] + s.add);
      if (s.mul != null) w[s.v] = r6(w[s.v] * s.mul);
      if (s.set != null) w[s.v] = r6(s.set);
    }
  }
  // Per-asset noise for quarter q: also a pure function of the seed
  const noise = (seed, id, q, k) => gauss(seed, "asset", id, q, k || "");
  const draw = (seed, id, q, k) => uni(seed, "asset", id, q, k || "");

  // variables a replay replaces (events that would move them are not drawn in a replay)
  const REPLAY_VARS = { eqRet: ["equity"], rate: ["rate"], infl: ["infl"], vol: ["vol"], energy: ["energy"], gold: ["gold"], metals: ["metals"], ags: ["corn", "rice", "soymeal"], timber: ["timber"] };
  const replayed = w => w && w.rp ? Object.keys(REPLAY_VARS).filter(k => REPLAY_VARS[k].some(s => w.rp.d[s])) : [];

  return { hash32, uni, gauss, noise, draw, label, year, isHarvest, isYearEnd, REGIMES, TRANS, DIFFICULTY, create, step, START_YEAR,
    validateReplay, replayFrom, realAt, realRegime, replayed, REPLAY_KEYS };
});

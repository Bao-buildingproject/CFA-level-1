// ============================================================
// alt/world.js — Alternative Empire: the economic simulation (one step = one quarter)
// Growth, inflation, policy rate, credit spread, equities, bonds, volatility, liquidity,
// commodity prices and futures curve slopes, office and housing demand, traffic, timber,
// farmland values, a digital token index and the weather at harvest.
// Every random number is a pure function of (seed, name, quarter), so the same seed and the
// same events give the same economy, whatever the player does and however often it is saved.
// All of it is SIMULATED; none of it is market data.
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
  const label = q => `Q${(q % 4) + 1}/${START_YEAR + Math.floor(q / 4)}`;
  const year = q => START_YEAR + Math.floor(q / 4);
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

  function create({ seed, difficulty }) {
    const w = { seed: seed >>> 0, difficulty: DIFFICULTY[difficulty] ? difficulty : "standard", q: 0, regime: "exp",
      gdp: 0.026, infl: 0.026, rate: 0.035, spread: 0.038, vol: 0.16, liq: 0.82,
      eqRet: 0, bondRet: 0, benchRet: 0, eqIdx: 100, benchIdx: 100,
      energy: 100, metals: 100, ags: 100, kE: 0.03, kM: 0.02, kA: 0.01,   // futures curve slope k = r + c − i (annual)
      office: 100, resi: 100, traffic: 100, timber: 100, land: 100, token: 100, tokenRet: 0, weather: 1, cpi: 100,
      hist: [] };
    w.hist.push(snap(w));
    return w;
  }
  function snap(w) {
    return { q: w.q, regime: w.regime, gdp: w.gdp, infl: w.infl, rate: w.rate, spread: w.spread, vol: w.vol, liq: w.liq, eqRet: w.eqRet, eqIdx: w.eqIdx,
      benchRet: w.benchRet, benchIdx: w.benchIdx, energy: w.energy, metals: w.metals, ags: w.ags, kE: w.kE, kM: w.kM, kA: w.kA, office: w.office, resi: w.resi,
      traffic: w.traffic, timber: w.timber, land: w.land, token: w.token, weather: w.weather };
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
    const prev = { rate: w.rate, spread: w.spread, vol: w.vol, energy: w.energy, metals: w.metals, ags: w.ags, token: w.token, kE: w.kE, kM: w.kM, kA: w.kA };
    w.regime = nextRegime(w, d);
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
    // markets react to the new state
    const dS = w.spread - prev.spread, dR = w.rate - prev.rate;
    w.eqRet = r6(clamp(R.eq / 4 - 2.5 * dS - 1.2 * dR + (w.vol / 2) * z("eq"), -0.45, 0.45));
    w.bondRet = r6(clamp(prev.rate / 4 - 6 * dR, -0.15, 0.15));
    const cmd = (k, beta, sig) => r6(clamp(R.cmd / 4 + beta * w.eqRet * 0.3 + sig * z(k), -0.5, 0.6));
    w.energy = r6(Math.max(5, w.energy * (1 + cmd("en", 1.2, 0.09))));
    w.metals = r6(Math.max(5, w.metals * (1 + cmd("mt", 1.0, 0.06))));
    w.ags = r6(Math.max(5, w.ags * (1 + cmd("ag", 0.4, 0.05) + (1 - w.weather) * 0.35)));   // poor harvests lift crop prices
    // futures curve slopes: carry r + storage − convenience yield; low inventories (price spikes) bring backwardation
    const slope = (k, px0, px1, base) => r6(clamp(0.6 * w0[k] + 0.4 * (w.rate + base) - 1.6 * (px1 / px0 - 1) + 0.01 * z(k), -0.25, 0.25));
    w.kE = slope("kE", prev.energy, w.energy, 0.01); w.kM = slope("kM", prev.metals, w.metals, 0.0); w.kA = slope("kA", prev.ags, w.ags, -0.01);
    w.office = r6(Math.max(20, w.office * (1 + R.office / 4 + 0.01 * z("of"))));
    w.resi = r6(Math.max(20, w.resi * (1 + R.resi / 4 + 0.006 * z("re"))));
    w.traffic = r6(Math.max(20, w.traffic * (1 + R.traffic / 4 + 0.6 * (w.gdp - 0.02) / 4 + 0.01 * z("tr"))));
    w.timber = r6(Math.max(20, w.timber * (1 + 0.3 * (w.resi / w0.resi - 1) + w.infl / 4 * 0.5 + 0.035 * z("tb"))));
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

  return { hash32, uni, gauss, noise, draw, label, year, isHarvest, isYearEnd, REGIMES, TRANS, DIFFICULTY, create, step, START_YEAR };
});

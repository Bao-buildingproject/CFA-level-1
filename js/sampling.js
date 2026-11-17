// ============================================================
// sampling.js — Distributions lab tab "Sampling & tests" (#/dist/sampling)
// A fish farm: 120 fish in 10 cages (small 50%, medium 30%, large 20%).
//   1. Sampling methods  2. Sampling error & CLT
//   3. Hypothesis test: weigh a catch  4. Practice questions (A/B/C)
// ============================================================

// ---------- The population (fixed, seeded so it is the same every visit) ----------
function smRng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SM_SIZES = { s: { name: "Small", share: 0.5, cls: "fish-s", mean: 200, sd: 40 }, m: { name: "Medium", share: 0.3, cls: "fish-m", mean: 450, sd: 60 }, l: { name: "Large", share: 0.2, cls: "fish-l", mean: 900, sd: 120 } };
const SM_FISH = (() => {
  const r = smRng(20270513);
  const sizes = [...Array(60).fill("s"), ...Array(36).fill("m"), ...Array(24).fill("l")];
  for (let i = sizes.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sizes[i], sizes[j]] = [sizes[j], sizes[i]]; }
  const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  return sizes.map((s, i) => ({ id: i + 1, cage: Math.floor(i / 12) + 1, size: s, w: Math.max(60, Math.round(SM_SIZES[s].mean + SM_SIZES[s].sd * gauss())) }));
})();
const SM_MU = SM_FISH.reduce((a, f) => a + f.w, 0) / SM_FISH.length;
const SM_SIGMA = Math.sqrt(SM_FISH.reduce((a, f) => a + (f.w - SM_MU) ** 2, 0) / SM_FISH.length);
const SM_N = 12;

const sm = { sub: "methods", method: null, chosen: [], clt: { n: 5, means: [] }, test: { mu0: 450, n: 15, alpha: 0.05, alt: "two", res: null, runs: 0, rejects: 0 }, q: null, score: [0, 0] };

const smPick = (arr, k) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };

// ---------- 1. Sampling methods ----------
const SM_METHODS = {
  simple: { name: "Simple random", prob: true, pick: () => smPick(SM_FISH, SM_N).map(f => f.id),
    how: "Every fish has the same chance, and every group of 12 fish is equally likely: like drawing 12 numbers out of a hat with 120 numbers.",
    pros: "Unbiased and easy to understand.", cons: "By chance the sample can have too many or too few large fish (sampling error)." },
  systematic: { name: "Systematic", prob: true, pick: () => { const k = SM_FISH.length / SM_N, start = 1 + Math.floor(Math.random() * k); const ids = Array.from({ length: SM_N }, (_, i) => start + i * k); sm.note = `Random start: fish ${start} → ${ids.join(", ")}.`; return ids; },
    how: "k = population / sample = 120 / 12 = 10. Pick a random start between 1 and 10, then take every 10th fish.",
    pros: "Simple to do in practice; behaves like simple random sampling if the list has no pattern.", cons: "Biased if the list has a cycle that matches k." },
  stratified: { name: "Stratified random", prob: true, pick: () => ["s", "m", "l"].flatMap(s => smPick(SM_FISH.filter(f => f.size === s), Math.round(SM_N * SM_SIZES[s].share)).map(f => f.id)),
    how: "Split the population into strata (small / medium / large), then take a simple random sample from each stratum in proportion to its size: 50% × 12 = 6 small, 30% × 12 ≈ 4 medium, 20% × 12 ≈ 2 large.",
    pros: "The sample matches the population mix, so the estimate is more precise (smaller sampling error). Used for bond index funds (stratify by duration, sector, rating).", cons: "Needs the stratum of every member before sampling." },
  cluster: { name: "Cluster", prob: true, pick: () => { const c = 1 + Math.floor(Math.random() * 10); sm.note = `Cage drawn: cage ${c}.`; return SM_FISH.filter(f => f.cage === c).map(f => f.id); },
    how: "The population is already in groups (cages = clusters). Pick one cage at random and take every fish in it (one-stage cluster sampling).",
    pros: "Cheap and fast: you only visit one cage.", cons: "Each cage may not look like the whole farm, so the sample is usually less precise than stratified sampling." },
  convenience: { name: "Convenience", prob: false, pick: () => SM_FISH.filter(f => f.cage <= 3 && (f.id - 1) % 12 < 4).map(f => f.id),
    how: "Take the fish that are easiest to catch: the first row of the three cages closest to the dock.",
    pros: "Quick and cheap — fine for a first look or a pilot study.", cons: "Not random, so the sample may not represent the population (sample selection bias)." },
  judgmental: { name: "Judgmental", prob: false, pick: () => { const med = SM_FISH.filter(f => f.size === "m"); return med.slice(0, 8).concat(SM_FISH.filter(f => f.size === "l").slice(0, 4)).map(f => f.id); },
    how: "An expert picks the fish they believe are 'typical' — here mostly medium and large fish.",
    pros: "Uses expert knowledge; useful when time is short or the population is unusual.", cons: "The expert's view may be wrong or biased — here small fish are left out, so the mean weight is too high." }
};

function smFishSvg(f, chosen) {
  return `<div class="fish-cell ${chosen ? "fish-on" : ""}" title="Fish ${f.id}: ${SM_SIZES[f.size].name}, ${f.w} g">
    <svg class="fish ${SM_SIZES[f.size].cls}" viewBox="0 0 40 22" aria-hidden="true"><ellipse cx="16" cy="11" rx="14" ry="8"/><path d="M28 11 L39 3 L39 19 Z"/><circle cx="8" cy="9" r="1.6" class="fish-eye"/></svg>
    <span>${f.id}</span></div>`;
}

function smMethodsHtml() {
  const on = new Set(sm.chosen), M = sm.method && SM_METHODS[sm.method];
  let result = `<div class="callout info">${icon("target", 18)}<div>Choose a sampling method to see which fish are picked.</div></div>`;
  if (M) {
    const fish = SM_FISH.filter(f => on.has(f.id));
    const cnt = s => fish.filter(f => f.size === s).length;
    const mean = fish.reduce((a, f) => a + f.w, 0) / fish.length;
    result = `<div class="card section sm-result">
      <div class="card-head"><div><h2>${M.name} sampling</h2><p class="text-2 small">${M.prob ? "Probability sampling — every fish has a known chance" : "Non-probability sampling — chosen by convenience or judgment"}</p></div>
        <button class="btn btn-secondary btn-sm" id="sm-again">Draw again</button></div>
      <p><strong>How:</strong> ${M.how}${sm.note ? ` <strong>${sm.note}</strong>` : ""}</p>
      <div class="sm-stats">
        <div class="sm-stat"><b>${cnt("s")} / ${cnt("m")} / ${cnt("l")}</b><span>small / medium / large in the sample</span></div>
        <div class="sm-stat"><b>6 / 4 / 2</b><span>matching the population mix (50 / 30 / 20%)</span></div>
        <div class="sm-stat"><b>${mean.toFixed(0)} g</b><span>sample mean x̄</span></div>
        <div class="sm-stat"><b>${SM_MU.toFixed(0)} g</b><span>population mean μ</span></div>
      </div>
      <p class="small">Sampling error = x̄ − μ = ${mean.toFixed(0)} − ${SM_MU.toFixed(0)} = <strong>${(mean - SM_MU).toFixed(0)} g</strong></p>
      <p class="small"><strong>Pros:</strong> ${M.pros}</p><p class="small"><strong>Cons:</strong> ${M.cons}</p>
    </div>`;
  }
  return `
    <div class="card">
      <p class="sm-cap">Population: 120 fish in 10 cages · we need a sample of 12</p>
      <div class="sm-legend"><span><i class="fish-dot fish-s"></i>Small (50%)</span><span><i class="fish-dot fish-m"></i>Medium (30%)</span><span><i class="fish-dot fish-l"></i>Large (20%)</span><span><i class="fish-ring"></i>In the sample</span></div>
      <div class="sm-cages">${Array.from({ length: 10 }, (_, c) => `<div class="sm-cage"><div class="sm-cage-t">Cage ${c + 1}</div><div class="sm-fishes">${SM_FISH.filter(f => f.cage === c + 1).map(f => smFishSvg(f, on.has(f.id))).join("")}</div></div>`).join("")}</div>
      <p class="sm-cap" style="margin-top:18px">Probability sampling</p>
      <div class="row-gap" style="flex-wrap:wrap">${["simple", "systematic", "stratified", "cluster"].map(k => `<button class="btn ${sm.method === k ? "btn-primary" : "btn-secondary"}" data-smm="${k}">${SM_METHODS[k].name}</button>`).join("")}</div>
      <p class="sm-cap" style="margin-top:14px">Non-probability sampling</p>
      <div class="row-gap" style="flex-wrap:wrap">${["convenience", "judgmental"].map(k => `<button class="btn ${sm.method === k ? "btn-primary" : "btn-secondary"}" data-smm="${k}">${SM_METHODS[k].name}</button>`).join("")}</div>
    </div>
    ${result}`;
}

// ---------- 2. Sampling error & CLT ----------
// Population of 10,000 fish with three possible shapes; draw samples of size n and watch x̄ become normal.
const CLT_RANGE = [0, 1200], CLT_BINS = 48;
const CLT_POPS = {
  skew: { name: "Fish weight (right-skewed)", gen: g => Math.exp(5.75 + 0.55 * g()) },
  uniform: { name: "Uniform", gen: (g, r) => 60 + 640 * r() },
  bimodal: { name: "Two peaks (bimodal)", gen: (g, r) => r() < 0.5 ? 210 + 50 * g() : 620 + 60 * g() }
};
const cltCache = {};
function cltPop(key) {
  if (cltCache[key]) return cltCache[key];
  const r = smRng(7 + key.length * 131), g = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const vals = Array.from({ length: 10000 }, () => Math.min(CLT_RANGE[1] - 1, Math.max(5, CLT_POPS[key].gen(g, r))));
  const mu = vals.reduce((a, b) => a + b, 0) / vals.length, sigma = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length);
  const bw = (CLT_RANGE[1] - CLT_RANGE[0]) / CLT_BINS, dens = new Array(CLT_BINS).fill(0);
  vals.forEach(v => { dens[Math.floor(v / bw)]++; });
  return cltCache[key] = { vals, mu, sigma, dens: dens.map(c => c / (vals.length * bw)) };
}
sm.clt = { pop: "skew", n: 5, means: [], last: null, timer: null };

sm.clt.anim = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
sm.clt.queue = []; sm.clt.active = []; sm.clt.raf = null;

function cltDraw(times) {
  const C = sm.clt, P = cltPop(C.pop);
  for (let t = 0; t < times; t++) {
    const xs = Array.from({ length: C.n }, () => P.vals[Math.floor(Math.random() * P.vals.length)]);
    const m = xs.reduce((a, b) => a + b, 0) / C.n;
    C.last = xs;
    if (C.anim) C.queue.push(m); else C.means.push(m);
  }
  if (C.anim) cltBallsStart();
  cltRefresh();
}
function cltStop() { const C = sm.clt; if (C.timer) { clearInterval(C.timer); C.timer = null; } }
function cltClearBalls() {
  const C = sm.clt; C.queue = []; C.active = [];
  if (C.raf) { cancelAnimationFrame(C.raf); C.raf = null; }
  const c = document.getElementById("clt-balls"); if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}
function cltFlushBalls() { const C = sm.clt; C.active.forEach(b => C.means.push(b.m)); C.queue.forEach(m => C.means.push(m)); cltClearBalls(); }

function cltGeom() {
  const C = sm.clt, P = cltPop(C.pop), se = P.sigma / Math.sqrt(C.n);
  const mlo = Math.max(0, P.mu - 3.6 * se), mhi = P.mu + 4.6 * se, bins = 40;
  return { C, P, se, mlo, mhi, bins, bw: (mhi - mlo) / bins };
}
function cltHistSvg() {
  const { C, P, se, mlo, mhi, bins, bw } = cltGeom(), k = C.means.length;
  const d = new Array(bins).fill(0); C.means.forEach(m => { const i = Math.floor((m - mlo) / bw); if (i >= 0 && i < bins) d[i]++; });
  return dlSvg({ pdf: x => normPdf((x - P.mu) / se) / se, range: [mlo, mhi], x1: 0, x2: 0, hist: k ? { dens: d.map(c => c / (k * bw)) } : null, marks: [{ x: P.mu, label: "μ" }], label: "Distribution of sample means" });
}
function cltStatsHtml() {
  const { C, P, se } = cltGeom(), k = C.means.length, n = C.n;
  const avg = k ? C.means.reduce((a, b) => a + b, 0) / k : NaN;
  const sd = k > 1 ? Math.sqrt(C.means.reduce((a, b) => a + (b - avg) ** 2, 0) / (k - 1)) : NaN;
  const stat = (v, l) => `<div class="sm-stat"><b>${v}</b><span>${l}</span></div>`;
  return `${stat(P.mu.toFixed(0) + " g", "μ: population mean")}${stat(P.sigma.toFixed(0) + " g", "σ: population standard deviation")}
    ${stat(k.toLocaleString("en-US"), "samples landed")}${stat(k ? avg.toFixed(1) + " g" : "–", "mean of the x̄ values (≈ μ)")}
    ${stat(k > 1 ? sd.toFixed(1) + " g" : "–", "standard deviation of the x̄ values")}${stat(se.toFixed(1) + " g", `σ/√n = standard error (n = ${n})`)}`;
}
function cltRefresh() {
  const C = sm.clt, P = cltPop(C.pop), set = (id, h) => { const e = document.getElementById(id); if (e) e.innerHTML = h; };
  set("clt-sample", cltSampleSvg(P, C));
  set("clt-hist", cltHistSvg());
  set("clt-stats", cltStatsHtml());
  const c = document.getElementById("clt-count"); if (c) c.textContent = (C.means.length).toLocaleString("en-US");
}
function cltBallsStart() { const C = sm.clt; if (!C.raf) C.raf = requestAnimationFrame(cltBallsTick); }

function cltBallsTick() {
  const C = sm.clt; C.raf = null;
  const canvas = document.getElementById("clt-balls"), svg = document.querySelector("#clt-hist .dl-svg");
  if (!canvas || !svg || currentRoute()[1] !== "sampling" || sm.sub !== "clt") { cltFlushBalls(); return; }
  const r = svg.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
  }
  const W = DL.W, H = DL.H, k = r.width / W, lo = +svg.dataset.lo, hi = +svg.dataset.hi, ymax = +svg.dataset.ymax;
  const { bins, bw } = cltGeom(), pw = W - DL.L - DL.R, ph = H - DL.T - DL.B;
  const X = x => DL.L + (x - lo) / (hi - lo) * pw, Y = y => DL.T + ph - Math.min(y, ymax) / ymax * ph;

  const counts = new Array(bins).fill(0);
  C.means.forEach(m => { const i = Math.floor((m - lo) / bw); if (i >= 0 && i < bins) counts[i]++; });
  C.active.forEach(b => { if (b.bin >= 0) counts[b.bin]++; });
  let spawn = Math.min(40, Math.ceil(C.queue.length / 40));
  while (spawn-- > 0 && C.queue.length) {
    const m = C.queue.shift(), bin = Math.floor((m - lo) / bw);
    if (bin < 0 || bin >= bins || C.active.length > 700) { C.means.push(m); C.dirty = true; continue; }
    const n = C.means.length + C.active.length + 1, cnt = ++counts[bin];
    C.active.push({ m, bin, tx: X(m), ty: Math.max(DL.T + 6, Y(cnt / (n * bw)) - 4), t: 0, dur: 36 + Math.random() * 18 });
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#2952cc";
  const still = [];
  for (const b of C.active) {
    b.t += 1 / b.dur;
    if (b.t >= 1) { C.means.push(b.m); C.dirty = true; continue; }
    const y0 = DL.T - 12, y = y0 + (b.ty - y0) * b.t * b.t;
    ctx.beginPath(); ctx.arc(b.tx, y, 3.6, 0, Math.PI * 2); ctx.fill(); still.push(b);
  }
  C.active = still; C.frame = (C.frame || 0) + 1;
  if (C.dirty && (C.frame % 3 === 0 || !C.active.length)) { C.dirty = false; cltRefresh(); }
  if (C.active.length || C.queue.length) C.raf = requestAnimationFrame(cltBallsTick);
  else { ctx.clearRect(0, 0, W, H); if (C.dirty) { C.dirty = false; cltRefresh(); } }
}

function cltSampleSvg(P, C) {
  const W = 640, H = 150, L = 16, R = 16, lo = CLT_RANGE[0], hi = CLT_RANGE[1], X = v => L + (v - lo) / (hi - lo) * (W - L - R);
  const xs = C.last || [], mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const dots = xs.map((v, i) => `<circle class="sm-dot" style="animation-delay:${Math.round(i * Math.min(40, 700 / Math.max(1, xs.length)))}ms" cx="${X(v).toFixed(1)}" cy="${H - 34 - (i % 5) * 16}" r="6"/>`).join("");
  return `<svg class="dl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="The sample just drawn">
    <line class="dl-axis" x1="${L}" x2="${W - R}" y1="${H - 24}" y2="${H - 24}"/>
    <line class="dl-mark" x1="${X(P.mu)}" x2="${X(P.mu)}" y1="8" y2="${H - 24}"/><text class="dl-mlabel" x="${X(P.mu) + 5}" y="20">μ</text>
    ${dots}
    ${mean !== null ? `<line class="dl-xbar" x1="${X(mean)}" x2="${X(mean)}" y1="8" y2="${H - 24}"/><text class="dl-mlabel dl-xbar-t" x="${X(mean) + 5}" y="34">x̄</text>` : ""}
    <text class="dl-tick" x="${L}" y="${H - 6}">${lo}</text><text class="dl-tick" x="${W - R}" y="${H - 6}" text-anchor="end">${hi} g</text></svg>
    <p class="small" style="margin:6px 0 0">${mean !== null ? `x̄ = <strong>${mean.toFixed(1)} g</strong> &nbsp; sampling error x̄ − μ = <strong>${(mean - P.mu >= 0 ? "+" : "") + (mean - P.mu).toFixed(1)} g</strong>` : "Press “Draw 1 sample” to start."}</p>`;
}

function smCltHtml() {
  const C = sm.clt, P = cltPop(C.pop), n = C.n;
  return `
    <div class="card">
      <div class="form-grid" style="align-items:end">
        <label class="field"><span class="field-label">Population</span><select class="select" id="sm-pop">${Object.entries(CLT_POPS).map(([k2, v]) => `<option value="${k2}" ${C.pop === k2 ? "selected" : ""}>${v.name}</option>`).join("")}</select></label>
        <label class="dl-slider" style="margin:0"><span>Sample size n = <strong>${n}</strong></span><input type="range" id="sm-n" min="1" max="60" step="1" value="${n}"></label>
      </div>
      <p class="sm-cap" style="margin-top:16px">① Population: 10,000 fish — not bell-shaped</p>
      ${dlSvg({ pdf: () => 0, range: CLT_RANGE, x1: 0, x2: 0, hist: { dens: P.dens }, marks: [{ x: P.mu, label: `μ = ${P.mu.toFixed(0)} g` }], label: "Population histogram" })}
      <p class="sm-cap" style="margin-top:10px">② The sample just drawn (n = ${n})</p>
      <div id="clt-sample">${cltSampleSvg(P, C)}</div>
      <div class="row-gap" style="flex-wrap:wrap;margin:12px 0">
        <button class="btn btn-primary" data-smclt="1">Drop 1 sample</button><button class="btn btn-secondary" data-smclt="10">Drop 10</button>
        <button class="btn btn-secondary" data-smclt="100">Drop 100</button><button class="btn btn-secondary" data-smclt="1000">Drop 1,000</button>
        <button class="btn btn-secondary" id="sm-clt-run">${C.timer ? "■ Stop" : "▶ Run"}</button><button class="btn btn-ghost" id="sm-clt-clear">Reset</button>
      </div>
      <label class="check-chip dl-check"><input type="checkbox" id="sm-clt-anim" ${C.anim ? "checked" : ""}> Falling balls animation</label>
      <p class="sm-cap" style="margin-top:10px">③ Each sample mean x̄ drops like a ball — <span id="clt-count">${C.means.length.toLocaleString("en-US")}</span> landed</p>
      <div class="dl-stage"><div id="clt-hist">${cltHistSvg()}</div><canvas id="clt-balls" aria-hidden="true"></canvas></div>
      <div class="sm-stats" id="clt-stats">${cltStatsHtml()}</div>
      <div class="callout info">${icon("book", 18)}<div class="small"><strong>Central limit theorem.</strong> The population in ① is not bell-shaped, but the balls (the x̄ values) pile up into a bell that matches the normal curve (mean μ, standard deviation σ/√n — the standard error). Move n up to 30 or more: the bell gets narrower and smoother. With n = 1 or 2, the pile still follows the population. Sampling error = x̄ − μ; it shrinks as n grows.</div></div>
    </div>`;
}

// ---------- 3. Hypothesis test: weigh a catch ----------
function smTestRun() {
  const T = sm.test, fish = Array.from({ length: T.n }, () => SM_FISH[Math.floor(Math.random() * 120)]);
  const xs = fish.map(f => f.w), n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n;
  const s = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)), se = s / Math.sqrt(n), t = (mean - T.mu0) / se, df = n - 1;
  const a = T.alpha, crit = T.alt === "two" ? tCrit(df, a / 2) : tCrit(df, a);
  const p = T.alt === "two" ? 2 * (1 - tCdf(Math.abs(t), df)) : T.alt === "gt" ? 1 - tCdf(t, df) : tCdf(t, df);
  const reject = p < a;
  T.runs++; if (reject) T.rejects++;
  return { fish, mean, s, se, t, df, crit, p, reject };
}

function smTestHtml() {
  const T = sm.test, R = T.res;
  const altSym = { two: "≠", gt: ">", lt: "<" }[T.alt];
  let chart = "", body = `<p class="text-2">Press <strong>Catch & weigh</strong> to net ${T.n} fish at random and test the claim.</p>`;
  if (R) {
    const lim = Math.max(4.5, Math.abs(R.t) + 0.8);
    const shade = T.alt === "two" ? "tails" : T.alt === "gt" ? "right" : "left";
    const x1 = T.alt === "two" ? -R.crit : T.alt === "lt" ? -R.crit : R.crit, x2 = R.crit;
    chart = dlSvg({ pdf: x => tPdf(x, R.df), range: [-lim, lim], x1, x2, shade, areaCls: "dl-area-red", dot: R.t, marks: [{ x: R.t, label: `t = ${R.t.toFixed(2)}` }], label: "t distribution with rejection region" });
    body = `
      <div class="sm-catch">${R.fish.map(f => `<span class="sm-chip ${SM_SIZES[f.size].cls}">${f.w} g</span>`).join("")}</div>
      <div class="dl-res">
        <div class="dl-eq">x̄ = <strong>${R.mean.toFixed(1)} g</strong> · s = ${R.s.toFixed(1)} g · n = ${T.n} · df = n − 1 = ${R.df}</div>
        <div class="dl-eq">Test statistic t = (x̄ − μ<sub>0</sub>) / (s/√n) = (${R.mean.toFixed(1)} − ${T.mu0}) / (${R.s.toFixed(1)}/√${T.n}) = <strong>${R.t.toFixed(3)}</strong></div>
        <div class="dl-eq">Critical value${T.alt === "two" ? "s" : ""}: <strong>${T.alt === "two" ? "±" : T.alt === "lt" ? "−" : "+"}${R.crit.toFixed(3)}</strong> (α = ${T.alpha}${T.alt === "two" ? `, ${T.alpha / 2} in each tail` : ""}) · p-value = <strong>${R.p < 0.0001 ? "< 0.0001" : R.p.toFixed(4)}</strong></div>
        <div class="callout ${R.reject ? "danger" : "success"}" style="margin-top:10px">${icon(R.reject ? "alert" : "check", 18)}<div><strong>${R.reject ? "Reject H₀" : "Fail to reject H₀"}</strong> — ${R.reject ? `the test statistic is in the rejection region (p-value ${R.p.toFixed(4)} < α = ${T.alpha}).` : `the test statistic is not in the rejection region (p-value ${R.p.toFixed(4)} ≥ α = ${T.alpha}). We never "accept" H₀.`}</div></div>
        <p class="text-2 small" style="margin-top:8px">The true mean of the farm is ${SM_MU.toFixed(1)} g. ${Math.abs(T.mu0 - SM_MU) < 1 ? `H₀ is TRUE here, so rejecting it is a <strong>Type I error</strong> (probability = α).` : `H₀ is FALSE here (μ₀ = ${T.mu0} ≠ ${SM_MU.toFixed(1)}), so failing to reject is a <strong>Type II error</strong>; rejecting is correct (power = 1 − β).`} Tests run: ${T.runs} · rejected ${T.rejects} (${pct(T.rejects, T.runs)}%).</p>
      </div>`;
  }
  return `
    <div class="dl-layout">
      <div class="card dl-chart-card">${chart || `<div class="sm-empty">${icon("target", 28)}<p>The t distribution and rejection region appear here.</p></div>`}</div>
      <div class="dl-side"><div class="card">
        <div class="dl-eq dl-big">H<sub>0</sub>: μ = ${T.mu0} g &nbsp; vs &nbsp; H<sub>a</sub>: μ ${altSym} ${T.mu0} g</div>
        <p class="text-2 small">A buyer claims the average fish weighs ${T.mu0} g. Catch a random sample and test it (σ unknown → t-test).</p>
        <label class="dl-slider"><span>Claimed mean μ<sub>0</sub> = <strong>${T.mu0} g</strong></span><input type="range" id="sm-mu0" min="250" max="650" step="5" value="${T.mu0}"></label>
        <label class="dl-slider"><span>Sample size n = <strong>${T.n}</strong></span><input type="range" id="sm-tn" min="5" max="60" step="1" value="${T.n}"></label>
        <div class="form-grid">
          ${dlSel("sm-alpha", "Significance level α", [0.10, 0.05, 0.01], T.alpha)}
          <label class="field"><span class="field-label">Alternative H<sub>a</sub></span><select class="select" id="sm-alt">
            ${[["two", "μ ≠ μ₀ (two-tailed)"], ["gt", "μ > μ₀ (right tail)"], ["lt", "μ < μ₀ (left tail)"]].map(([k, l]) => `<option value="${k}" ${T.alt === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        <div class="row-gap" style="flex-wrap:wrap;margin:12px 0">
          <button class="btn btn-primary" id="sm-catch">${icon("play", 16)} Catch & weigh</button>
          <button class="btn btn-secondary" id="sm-100">Run 100 tests</button>
          <button class="btn btn-ghost" id="sm-true">Set μ₀ = true mean</button>
        </div>
        ${body}
      </div></div>
    </div>`;
}

// ---------- 4. Practice questions ----------
function smNewQ() {
  const pick = a => a[Math.floor(Math.random() * a.length)], L = ["A", "B", "C"];
  const kind = pick(["stat", "se", "decision", "method", "error"]);
  let q, opts, ans, why;
  if (kind === "stat" || kind === "se") {
    const n = pick([16, 25, 36, 49, 64, 81, 100]), s = pick([4, 6, 8, 10, 12, 15]), mu0 = pick([50, 60, 80, 100]);
    const xbar = +(mu0 + pick([-1, 1]) * (0.3 + Math.random() * 2.2) * s / Math.sqrt(n)).toFixed(2);
    const se = s / Math.sqrt(n), t = (xbar - mu0) / se;
    if (kind === "se") {
      q = `A sample of ${n} fish has a standard deviation of ${s} g. The standard error of the sample mean is closest to:`;
      opts = [se, s / n, s / Math.sqrt(n - 1)].map(v => v.toFixed(3)); ans = 0;
      why = `Standard error = s / √n = ${s} / √${n} = ${s} / ${Math.sqrt(n)} = ${se.toFixed(3)}. Dividing by n (${(s / n).toFixed(3)}) or √(n − 1) are traps.`;
    } else {
      q = `H₀: μ = ${mu0}. A random sample of n = ${n} has x̄ = ${xbar} and s = ${s}. The test statistic is closest to:`;
      opts = [t, (xbar - mu0) / s, (xbar - mu0) / (s / n)].map(v => v.toFixed(3)); ans = 0;
      why = `t = (x̄ − μ₀) / (s/√n) = (${xbar} − ${mu0}) / (${s}/√${n}) = ${(xbar - mu0).toFixed(2)} / ${se.toFixed(3)} = ${t.toFixed(3)}. Forgetting √n gives ${opts[1]}; dividing by n gives ${opts[2]}.`;
    }
  } else if (kind === "decision") {
    const df = pick([10, 15, 20, 24, 29]), a = pick([0.05, 0.01]), two = Math.random() < 0.6;
    const crit = two ? tCrit(df, a / 2) : tCrit(df, a), t = +(pick([-1, 1]) * (two ? 1 : 1) * (crit + pick([-0.6, -0.3, 0.25, 0.5]))).toFixed(2);
    const tt = two ? t : Math.abs(t);
    const rej = two ? Math.abs(tt) > crit : tt > crit;
    q = `A ${two ? "two" : "one"}-tailed t-test (H<sub>a</sub>: μ ${two ? "≠" : ">"} μ₀) with ${df} degrees of freedom gives t = ${tt}. At the ${a * 100}% significance level, the analyst should:`;
    opts = ["reject H₀.", "fail to reject H₀.", "accept H₀."]; ans = rej ? 0 : 1;
    why = `Critical t (df ${df}, ${two ? `α/2 = ${a / 2}` : `α = ${a}`}) = ${two ? "±" : ""}${crit.toFixed(3)}. ${rej ? `|t| = ${Math.abs(tt)} > ${crit.toFixed(3)} → reject H₀.` : `${two ? "|t|" : "t"} = ${Math.abs(tt)} ≤ ${crit.toFixed(3)} → fail to reject H₀.`} We never "accept" H₀ — that wording is the trap.`;
  } else if (kind === "method") {
    const cases = [
      ["An analyst divides bonds by credit rating and maturity, then randomly selects bonds from each group in proportion to its weight in the index.", "stratified random sampling.", "cluster sampling.", "systematic sampling.", "Groups are formed by a characteristic and EVERY group is sampled → stratified random sampling."],
      ["An auditor chooses 10 of a company's 200 branches at random and checks every invoice in those branches.", "cluster sampling.", "stratified random sampling.", "convenience sampling.", "Whole groups (branches) are chosen at random and every member is used → cluster sampling."],
      ["From an alphabetical list of 5,000 customers, a researcher picks a random start and then every 50th name.", "systematic sampling.", "simple random sampling.", "judgmental sampling.", "Every k-th element after a random start → systematic sampling (k = 5,000 / 100 = 50)."],
      ["A fund manager selects the stocks she believes are most representative of the market for a quick estimate.", "judgmental sampling.", "convenience sampling.", "stratified random sampling.", "Chosen by expert opinion → judgmental sampling (non-probability)."]
    ];
    const c = pick(cases);
    q = `${c[0]} This is best described as:`; opts = [c[1], c[2], c[3]]; ans = 0; why = c[4];
  } else {
    const c = pick([
      ["The null hypothesis is true, but the analyst rejects it. This is a:", "Type I error.", "Type II error.", "correct decision.", "Rejecting a TRUE null = Type I error; its probability is the significance level α."],
      ["The null hypothesis is false, but the analyst fails to reject it. This is a:", "Type II error.", "Type I error.", "correct decision.", "Failing to reject a FALSE null = Type II error (probability β). Power = 1 − β."],
      ["Holding everything else constant, lowering the significance level from 5% to 1% will most likely:", "increase the probability of a Type II error.", "increase the probability of a Type I error.", "increase the power of the test.", "A smaller α makes rejection harder: fewer Type I errors but more Type II errors (lower power)."]
    ]);
    q = c[0]; opts = [c[1], c[2], c[3]]; ans = 0; why = c[4];
  }
  // shuffle the options
  const order = smPick([0, 1, 2], 3);
  const choices = {}; order.forEach((o, i) => { choices[L[i]] = opts[o]; });
  sm.q = { kind, q, choices, answer: L[order.indexOf(ans)], why, picked: null };
}

function smPracticeHtml() {
  if (!sm.q) smNewQ();
  const Q = sm.q, done = Q.picked !== null;
  return `
    <div style="max-width:760px;margin:0 auto">
      <div class="row-between" style="margin-bottom:12px"><span class="badge">QM-07</span><span class="text-2 small">Score this session: <strong>${sm.score[0]}/${sm.score[1]}</strong></span></div>
      <div class="card">
        <div class="q-text">${Q.q}</div>
        ${choicesHtml({ choices: Q.choices, answer: Q.answer }, Q.picked, done)}
        ${done ? `<div class="explain"><div class="explain-head ${Q.picked === Q.answer ? "ok" : "bad"}">${icon(Q.picked === Q.answer ? "check" : "alert", 18)} ${Q.picked === Q.answer ? "Correct" : `Incorrect — the answer is ${Q.answer}`}</div>
          <div class="explain-body"><div class="explain-block"><h4>Explanation</h4><p>${Q.why}</p></div></div></div>
          <button class="btn btn-primary btn-lg btn-block" id="sm-qnext" style="margin-top:20px">Next question ${icon("next", 18)}</button>` : ""}
      </div>
    </div>`;
}

// ---------- Page ----------
const SM_SUBS = [["methods", "1. Sampling methods"], ["clt", "2. Sampling error & CLT"], ["test", "3. Test: weigh the catch"], ["practice", "4. Practice questions"]];

function dlSampling() {
  const body = { methods: smMethodsHtml, clt: smCltHtml, test: smTestHtml, practice: smPracticeHtml }[sm.sub]();
  document.getElementById("dl-body").innerHTML = `
    <div class="sm-subs">${SM_SUBS.map(([k, l]) => `<button class="sm-sub ${sm.sub === k ? "active" : ""}" data-smsub="${k}">${l}</button>`).join("")}</div>
    ${body}`;
  view.querySelectorAll("[data-smsub]").forEach(b => b.onclick = () => { cltStop(); cltFlushBalls(); sm.sub = b.dataset.smsub; dlSampling(); });

  if (sm.sub === "methods") {
    view.querySelectorAll("[data-smm]").forEach(b => b.onclick = () => { sm.method = b.dataset.smm; sm.note = ""; sm.chosen = SM_METHODS[sm.method].pick(); dlSampling(); document.querySelector(".sm-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
    const ag = document.getElementById("sm-again"); if (ag) ag.onclick = () => { sm.note = ""; sm.chosen = SM_METHODS[sm.method].pick(); dlSampling(); };
  }
  if (sm.sub === "clt") {
    const C = sm.clt, nIn = document.getElementById("sm-n"), run = document.getElementById("sm-clt-run");
    const reset = () => { cltStop(); cltClearBalls(); C.means = []; C.last = null; dlSampling(); };
    document.getElementById("sm-pop").onchange = e => { C.pop = e.target.value; reset(); };
    nIn.oninput = () => { nIn.previousElementSibling.querySelector("strong").textContent = nIn.value; };
    nIn.onchange = () => { C.n = +nIn.value; reset(); };
    view.querySelectorAll("[data-smclt]").forEach(b => b.onclick = () => cltDraw(+b.dataset.smclt));
    document.getElementById("sm-clt-clear").onclick = reset;
    document.getElementById("sm-clt-anim").onchange = e => { C.anim = e.target.checked; if (!C.anim) { cltFlushBalls(); cltRefresh(); } };
    run.onclick = () => {
      if (C.timer) { cltStop(); run.textContent = "▶ Run"; return; }
      run.textContent = "■ Stop";
      C.timer = setInterval(() => {
        if (currentRoute()[1] !== "sampling" || sm.sub !== "clt" || C.means.length + C.queue.length >= 20000) { cltStop(); run.textContent = "▶ Run"; return; }
        if (!C.anim || C.queue.length < 120) cltDraw(Math.max(5, Math.round(C.means.length / 12)));
      }, 100);
    };
  }
  if (sm.sub === "test") {
    const T = sm.test, reset = () => { T.res = null; T.runs = 0; T.rejects = 0; };
    const mu = document.getElementById("sm-mu0"), tn = document.getElementById("sm-tn");
    mu.oninput = () => { mu.previousElementSibling.querySelector("strong").textContent = mu.value + " g"; };
    mu.onchange = () => { T.mu0 = +mu.value; reset(); dlSampling(); };
    tn.oninput = () => { tn.previousElementSibling.querySelector("strong").textContent = tn.value; };
    tn.onchange = () => { T.n = +tn.value; reset(); dlSampling(); };
    document.getElementById("sm-alpha").onchange = e => { T.alpha = +e.target.value; reset(); dlSampling(); };
    document.getElementById("sm-alt").onchange = e => { T.alt = e.target.value; reset(); dlSampling(); };
    document.getElementById("sm-catch").onclick = () => { T.res = smTestRun(); dlSampling(); };
    document.getElementById("sm-100").onclick = () => { for (let i = 0; i < 100; i++) T.res = smTestRun(); dlSampling(); toast(`100 tests run · ${T.rejects} of ${T.runs} rejected H₀`); };
    document.getElementById("sm-true").onclick = () => { T.mu0 = Math.round(SM_MU); reset(); dlSampling(); toast(`μ₀ = ${T.mu0} g (≈ true mean): now every rejection is a Type I error`); };
  }
  if (sm.sub === "practice") {
    view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
      if (sm.q.picked !== null) return;
      sm.q.picked = b.dataset.pick; sm.score[1]++; if (sm.q.picked === sm.q.answer) sm.score[0]++; dlSampling();
    });
    const nx = document.getElementById("sm-qnext"); if (nx) nx.onclick = () => { smNewQ(); dlSampling(); };
  }
}

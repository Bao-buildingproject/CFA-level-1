// ============================================================
// distlab.js — Quant "Distributions" lab (#/dist/<tab>)
// Drag x1/x2 on the curve, change parameters, see z-values and
// probabilities, simulate samples, use a z-table, explore skew and
// kurtosis, and practise exam-style probability questions.
// ============================================================

// ---------- Math ----------
function dlErfc(x) {                                   // Numerical Recipes, |error| < 1.2e-7
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function normCdf(z) { return 0.5 * dlErfc(-z / Math.SQRT2); }
function lnGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function gammaP(a, x) {                                // regularized lower incomplete gamma
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 200; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
function betaCF(a, b, x) {
  let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
  for (let m = 1; m < 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}
function betaI(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betaCF(a, b, x) / a : 1 - bt * betaCF(b, a, 1 - x) / b;
}
function tPdf(t, v) { return Math.exp(lnGamma((v + 1) / 2) - lnGamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + t * t / v, -(v + 1) / 2); }
function tCdf(t, v) { const p = 0.5 * betaI(v / 2, 0.5, v / (v + t * t)); return t > 0 ? 1 - p : p; }
function randn() { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); }
function chiSample(k) { let s = 0; for (let i = 0; i < k; i++) { const z = randn(); s += z * z; } return s; }

// ---------- Distributions ----------
// params: [key, label, min, max, step, default]
const DISTS = {
  normal: {
    name: "Normal", z: true,
    params: [["mu", "μ", -5, 10, 0.1, 0], ["sigma", "σ", 0.2, 4, 0.05, 1]],
    about: "Normal N(μ, σ²): symmetric around μ. About 68% / 95% / 99.7% of values lie within μ ± 1σ / 2σ / 3σ. To find a probability, convert to z = (x − μ)/σ and read N(z) from the z-table. Used for portfolio returns, confidence intervals (known variance), shortfall risk and Roy's safety-first.",
    pdf: (x, p) => normPdf((x - p.mu) / p.sigma) / p.sigma,
    cdf: (x, p) => normCdf((x - p.mu) / p.sigma),
    range: p => [Math.min(-4, p.mu - 4 * p.sigma), Math.max(4, p.mu + 4 * p.sigma)],
    sample: p => p.mu + p.sigma * randn(),
    moments: p => ({ mean: p.mu, variance: p.sigma ** 2, skew: 0, kurt: 0 })
  },
  lognormal: {
    name: "Lognormal",
    params: [["mu", "μ (of ln X)", -1, 2, 0.05, 0], ["sigma", "σ (of ln X)", 0.1, 1.2, 0.05, 0.5]],
    about: "Lognormal: ln X is normal, so X is always positive and skewed to the right. Asset PRICES are modelled as lognormal when continuously compounded RETURNS are normal. P(X < x) = N((ln x − μ)/σ).",
    pdf: (x, p) => x <= 0 ? 0 : normPdf((Math.log(x) - p.mu) / p.sigma) / (x * p.sigma),
    cdf: (x, p) => x <= 0 ? 0 : normCdf((Math.log(x) - p.mu) / p.sigma),
    range: p => [0, Math.exp(p.mu + 3.2 * p.sigma)],
    sample: p => Math.exp(p.mu + p.sigma * randn()),
    moments: p => { const e = Math.exp(p.sigma ** 2); return { mean: Math.exp(p.mu + p.sigma ** 2 / 2), variance: (e - 1) * Math.exp(2 * p.mu + p.sigma ** 2), skew: (e + 2) * Math.sqrt(e - 1), kurt: e ** 4 + 2 * e ** 3 + 3 * e ** 2 - 6 }; }
  },
  t: {
    name: "Student's t", std: true,
    params: [["df", "Degrees of freedom (df)", 1, 40, 1, 5]],
    about: "Student's t: symmetric like the standard normal but with fatter tails; as df rises it approaches the normal. Used for confidence intervals and hypothesis tests on a mean when the population variance is unknown (df = n − 1).",
    pdf: (x, p) => tPdf(x, p.df),
    cdf: (x, p) => tCdf(x, p.df),
    range: () => [-5, 5],
    sample: p => randn() / Math.sqrt(chiSample(p.df) / p.df),
    moments: p => ({ mean: p.df > 1 ? 0 : NaN, variance: p.df > 2 ? p.df / (p.df - 2) : Infinity, skew: p.df > 3 ? 0 : NaN, kurt: p.df > 4 ? 6 / (p.df - 4) : Infinity })
  },
  chi2: {
    name: "Chi-square",
    params: [["df", "Degrees of freedom (df)", 1, 20, 1, 4]],
    about: "Chi-square: sum of df squared standard normals — never negative and skewed right (less skewed as df rises). Used to test a single population variance and in tests of independence (contingency tables).",
    pdf: (x, p) => x <= 0 ? 0 : Math.exp((p.df / 2 - 1) * Math.log(x) - x / 2 - (p.df / 2) * Math.LN2 - lnGamma(p.df / 2)),
    cdf: (x, p) => gammaP(p.df / 2, x / 2),
    range: p => [0, p.df + 5 * Math.sqrt(2 * p.df) + 2],
    sample: p => chiSample(p.df),
    moments: p => ({ mean: p.df, variance: 2 * p.df, skew: Math.sqrt(8 / p.df), kurt: 12 / p.df })
  },
  uniform: {
    name: "Uniform",
    params: [["a", "a (lower)", -5, 5, 0.1, 0], ["b", "b (upper)", -4, 10, 0.1, 4]],
    about: "Continuous uniform on [a, b]: every value equally likely. P(x1 < X < x2) = (x2 − x1)/(b − a). Mean = (a + b)/2, variance = (b − a)²/12. Used in Monte Carlo simulation to generate random numbers.",
    pdf: (x, p) => x >= p.a && x <= p.b && p.b > p.a ? 1 / (p.b - p.a) : 0,
    cdf: (x, p) => p.b <= p.a ? 0 : Math.min(1, Math.max(0, (x - p.a) / (p.b - p.a))),
    range: p => [p.a - 1, Math.max(p.b, p.a + 0.5) + 1],
    sample: p => p.a + Math.random() * (p.b - p.a),
    moments: p => ({ mean: (p.a + p.b) / 2, variance: (p.b - p.a) ** 2 / 12, skew: 0, kurt: -1.2 })
  }
};

const dl = { tab: "explore", dist: "normal", p: {}, x1: -1, x2: 1, showStd: true, showSig: true, samples: [], timer: null, drag: null, z: 1.96, guess: null, score: [0, 0], beta: 2, alpha: 4 };

function dlReset(key) {
  dl.dist = key; dl.p = {};
  DISTS[key].params.forEach(([k, , , , , d]) => { dl.p[k] = d; });
  const D = DISTS[key], [lo, hi] = D.range(dl.p);
  const q = f => { let a = lo, b = hi; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (D.cdf(m, dl.p) < f) a = m; else b = m; } return Math.round(a * 10) / 10; };
  dl.x1 = key === "normal" ? -1 : q(0.15); dl.x2 = key === "normal" ? 1 : q(0.85);
  dlClear();
}
dlReset("normal");

function dlClear() { dl.samples = []; dlStop(); dlClearBalls(); }
function dlStop() { if (dl.timer) { clearInterval(dl.timer); dl.timer = null; } }

// ---------- Chart ----------
// Narrow screens use a smaller drawing so labels stay readable
const DL = { get W() { return innerWidth < 600 ? 380 : 640; }, get H() { return innerWidth < 600 ? 240 : 300; }, L: 44, R: 14, T: 34, B: 30 };
function niceStep(span, n) { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
const fmt = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d) : "∞";

// opts: { pdf, range:[lo,hi], x1, x2, shade:"between"|"left"|"right"|"tails"|null, extra:[{pdf,cls}], marks:[{x,label,cls}], hist:{bins,dens}, handles:bool, sig:{mu,sigma} }
function dlSvg(o) {
  const { W, H, L, R, T, B } = DL;
  const [lo, hi] = o.range, pw = W - L - R, ph = H - T - B;
  const N = 320, xs = Array.from({ length: N + 1 }, (_, i) => lo + (hi - lo) * i / N);
  const ys = xs.map(x => o.pdf(x));
  let ymax = Math.max(...ys.slice(4).filter(Number.isFinite), ...(o.extra || []).map(e => Math.max(...xs.map(e.pdf))));
  if (o.hist) ymax = Math.max(ymax, ...o.hist.dens.map(d => d * 0.9));
  ymax = (ymax || 1) * 1.12;
  const X = x => L + (x - lo) / (hi - lo) * pw, Y = y => T + ph - Math.min(y, ymax) / ymax * ph;
  const line = (f, a = lo, b = hi) => { const pts = []; for (let i = 0; i <= N; i++) { const x = a + (b - a) * i / N; pts.push(`${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`); } return pts.join(" "); };
  const area = (f, a, b) => b > a ? `${X(a).toFixed(1)},${Y(0)} ${line(f, a, b)} ${X(b).toFixed(1)},${Y(0)}` : "";

  const ys0 = niceStep(ymax, 4), xstep = niceStep(hi - lo, 9);
  let grid = "";
  for (let y = ys0; y < ymax; y += ys0) grid += `<line class="dl-grid" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="dl-tick" x="${L - 6}" y="${Y(y) + 4}" text-anchor="end">${+y.toFixed(3)}</text>`;
  for (let x = Math.ceil(lo / xstep) * xstep; x <= hi + 1e-9; x += xstep) grid += `<line class="dl-grid" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${Y(0)}"/><text class="dl-tick" x="${X(x)}" y="${H - 10}" text-anchor="middle">${+x.toFixed(2)}</text>`;

  const a = Math.min(o.x1, o.x2), b = Math.max(o.x1, o.x2);
  const cl = v => Math.min(hi, Math.max(lo, v));
  let shade = "";
  if (o.shade === "between") shade = `<polygon class="dl-area" points="${area(o.pdf, cl(a), cl(b))}"/>`;
  if (o.shade === "left") shade = `<polygon class="dl-area" points="${area(o.pdf, lo, cl(a))}"/>`;
  if (o.shade === "right") shade = `<polygon class="dl-area" points="${area(o.pdf, cl(b), hi)}"/>`;
  if (o.shade === "tails") shade = `<polygon class="dl-area" points="${area(o.pdf, lo, cl(a))}"/><polygon class="dl-area" points="${area(o.pdf, cl(b), hi)}"/>`;

  let hist = "";
  if (o.hist) { const bw = (hi - lo) / o.hist.dens.length; hist = o.hist.dens.map((d, i) => d ? `<rect class="dl-hist" x="${(X(lo + i * bw) + 1).toFixed(1)}" y="${Y(d).toFixed(1)}" width="${Math.max(0, X(lo + bw) - X(lo) - 2).toFixed(1)}" height="${(Y(0) - Y(d)).toFixed(1)}"/>` : "").join(""); }

  const extra = (o.extra || []).map(e => `${e.fill ? `<polygon class="${e.cls}-fill" points="${area(e.pdf, lo, hi)}"/>` : ""}<polyline class="${e.cls}" points="${line(e.pdf)}"/>`).join("");
  let sig = "";
  if (o.sig) for (let k = -3; k <= 3; k++) { const x = o.sig.mu + k * o.sig.sigma; if (x > lo && x < hi) sig += `<line class="dl-sig" x1="${X(x)}" x2="${X(x)}" y1="${Y(0)}" y2="${Y(o.pdf(x))}"/>`; }
  const marks = (o.marks || []).map((m, i) => `<line class="dl-mark ${m.cls || ""}" x1="${X(m.x)}" x2="${X(m.x)}" y1="${T - 4}" y2="${Y(0)}"/><text class="dl-mlabel ${m.cls || ""}" x="${X(m.x)}" y="${T - 10 - (i % 2) * 12}" text-anchor="middle">${m.label}</text>`).join("");

  let handles = "", pctLabel = "";
  if (o.handles) {
    const lab = (x, sub, dy) => `<text class="dl-hlabel" x="${Math.min(W - R - 40, Math.max(L + 40, X(cl(x))))}" y="${T - 12 + dy}" text-anchor="middle">x<tspan dy="3" font-size="9">${sub}</tspan><tspan dy="-3"> = ${fmt(x)}</tspan></text>`;
    const close = Math.abs(X(cl(o.x1)) - X(cl(o.x2))) < 90;
    handles = `${lab(o.x1, 1, 0)}${lab(o.x2, 2, close ? 14 : 0)}
      <circle class="dl-handle" cx="${X(cl(o.x1))}" cy="${Y(0)}" r="9"/><circle class="dl-handle" cx="${X(cl(o.x2))}" cy="${Y(0)}" r="9"/>`;
  }
  if (o.pct !== undefined) { const mx = o.shade === "between" ? (cl(a) + cl(b)) / 2 : o.shade === "left" ? (lo + cl(a)) / 2 : o.shade === "right" ? (cl(b) + hi) / 2 : (lo + hi) / 2; pctLabel = `<text class="dl-pct" x="${X(mx)}" y="${Math.max(T + 20, Y(o.pdf(mx)) + (Y(0) - Y(o.pdf(mx))) * 0.45)}" text-anchor="middle">${o.pct}</text>`; }

  return `<svg class="dl-svg" viewBox="0 0 ${W} ${H}" data-lo="${lo}" data-hi="${hi}" data-ymax="${ymax}" role="img" aria-label="${esc(o.label || "Distribution chart")}">
    ${grid}${hist}${extra}${shade}${sig}<polyline class="dl-curve" points="${line(o.pdf)}"/>
    <line class="dl-axis" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>${marks}${pctLabel}${handles}</svg>`;
}

// ---------- Page ----------
const DL_TABS = [["explore", "Explore"], ["ztable", "Z-table"], ["shape", "Skew & Kurtosis"], ["quiz", "Quick quiz"]];

function renderDist(tab) {
  dlStop();
  dl.tab = DL_TABS.some(t => t[0] === tab) ? tab : "explore";
  view.innerHTML = `
    <a href="#/topic/QM" class="btn btn-ghost btn-sm" style="margin-bottom:12px;padding-left:6px">${icon("back", 18)} Quantitative Methods</a>
    ${pageHeader("Distributions", "Drag to calculate, simulate to check, read the z-table like in the exam.")}
    <div class="tabs" role="tablist">${DL_TABS.map(([k, l]) => `<a class="tab ${dl.tab === k ? "active" : ""}" href="#/dist/${k}">${l}</a>`).join("")}</div>
    <div id="dl-body"></div>`;
  ({ explore: dlExplore, ztable: dlZTable, shape: dlShape, quiz: dlQuiz })[dl.tab]();
}

// ----- Explore -----
function dlStats() {
  const D = DISTS[dl.dist], p = dl.p, a = Math.min(dl.x1, dl.x2), b = Math.max(dl.x1, dl.x2);
  const F1 = D.cdf(a, p), F2 = D.cdf(b, p);
  return { a, b, F1, F2, mid: F2 - F1, left: F1, right: 1 - F2 };
}

function dlHist() {
  if (!dl.samples.length) return null;
  const [lo, hi] = DISTS[dl.dist].range(dl.p), n = 40, bw = (hi - lo) / n, c = new Array(n).fill(0);
  dl.samples.forEach(s => { const i = Math.floor((s - lo) / bw); if (i >= 0 && i < n) c[i]++; });
  return { dens: c.map(k => k / (dl.samples.length * bw)) };
}

function dlChartHtml() {
  const D = DISTS[dl.dist], p = dl.p, s = dlStats();
  const extra = [];
  if ((D.z || D.std) && dl.showStd && !(dl.dist === "normal" && p.mu === 0 && p.sigma === 1)) extra.push({ pdf: normPdf, cls: "dl-std", fill: true });
  return dlSvg({ pdf: x => D.pdf(x, p), range: D.range(p), x1: dl.x1, x2: dl.x2, shade: "between", handles: true, extra,
    hist: dlHist(), sig: D.z && dl.showSig ? { mu: p.mu, sigma: p.sigma } : null, pct: (s.mid * 100).toFixed(2) + "%", label: `${D.name} distribution` });
}

function dlResultsHtml() {
  const D = DISTS[dl.dist], p = dl.p, s = dlStats(), m = D.moments(p);
  let lines = "";
  if (D.z) {
    const z1 = (s.a - p.mu) / p.sigma, z2 = (s.b - p.mu) / p.sigma;
    lines = `<div class="dl-eq">z<sub>1</sub> = (x<sub>1</sub> − μ) / σ = (${fmt(s.a)} − ${fmt(p.mu)}) / ${fmt(p.sigma)} = <strong>${fmt(z1, 4)}</strong></div>
      <div class="dl-eq">z<sub>2</sub> = (x<sub>2</sub> − μ) / σ = (${fmt(s.b)} − ${fmt(p.mu)}) / ${fmt(p.sigma)} = <strong>${fmt(z2, 4)}</strong></div>
      <div class="dl-eq dl-big">P(x<sub>1</sub> &lt; X &lt; x<sub>2</sub>) = N(z<sub>2</sub>) − N(z<sub>1</sub>) = ${fmt(s.F2, 4)} − ${fmt(s.F1, 4)} = <strong>${fmt(s.mid, 4)}</strong></div>`;
  } else if (dl.dist === "lognormal") {
    lines = `<div class="dl-eq">z<sub>1</sub> = (ln ${fmt(s.a)} − ${fmt(p.mu)}) / ${fmt(p.sigma)} = <strong>${s.a > 0 ? fmt((Math.log(s.a) - p.mu) / p.sigma, 4) : "−∞"}</strong></div>
      <div class="dl-eq">z<sub>2</sub> = (ln ${fmt(s.b)} − ${fmt(p.mu)}) / ${fmt(p.sigma)} = <strong>${s.b > 0 ? fmt((Math.log(s.b) - p.mu) / p.sigma, 4) : "−∞"}</strong></div>
      <div class="dl-eq dl-big">P(x<sub>1</sub> &lt; X &lt; x<sub>2</sub>) = N(z<sub>2</sub>) − N(z<sub>1</sub>) = <strong>${fmt(s.mid, 4)}</strong></div>`;
  } else {
    lines = `<div class="dl-eq dl-big">P(x<sub>1</sub> &lt; X &lt; x<sub>2</sub>) = F(${fmt(s.b)}) − F(${fmt(s.a)}) = ${fmt(s.F2, 4)} − ${fmt(s.F1, 4)} = <strong>${fmt(s.mid, 4)}</strong></div>`;
  }
  return `${lines}<p class="text-2 small">P(X &lt; x<sub>1</sub>) = ${fmt(s.left, 4)} · P(X &gt; x<sub>2</sub>) = ${fmt(s.right, 4)} · Mean = ${fmt(m.mean, 3)} · Variance = ${fmt(m.variance, 3)} · Skewness = ${fmt(m.skew, 3)} · Excess kurtosis = ${fmt(m.kurt, 3)}</p>`;
}

function dlSimHtml() {
  const n = dl.samples.length, s = dlStats();
  if (!n) return `<p class="text-3 small">No samples yet. Draw random values and watch the histogram take the shape of the curve.</p>`;
  const inside = dl.samples.filter(v => v > s.a && v < s.b).length;
  const mean = dl.samples.reduce((a, v) => a + v, 0) / n;
  const sd = Math.sqrt(dl.samples.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1));
  return `<p class="small"><strong>${n.toLocaleString("en-US")}</strong> samples · inside [x<sub>1</sub>, x<sub>2</sub>]: <strong>${(100 * inside / n).toFixed(2)}%</strong> (theory ${(100 * s.mid).toFixed(2)}%) · sample mean ${fmt(mean, 3)} · sample s.d. ${fmt(sd, 3)}</p>`;
}

function dlExplore() {
  const D = DISTS[dl.dist];
  const [lo, hi] = D.range(dl.p);
  const slider = (id, label, min, max, step, val) => `<label class="dl-slider"><span>${label} = <strong id="${id}-v">${fmt(val)}</strong></span>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  document.getElementById("dl-body").innerHTML = `
    <div class="dl-layout">
      <div class="card dl-chart-card"><div class="dl-stage"><div id="dl-chart">${dlChartHtml()}</div><canvas id="dl-balls" aria-hidden="true"></canvas></div>
        <p class="text-3 small dl-hint">Drag the green dots or tap the chart to move x<sub>1</sub>, x<sub>2</sub>.</p></div>
      <div class="dl-side">
        <div class="card">
          <label class="field"><span class="field-label">Distribution</span>
            <select class="select" id="dl-dist">${Object.entries(DISTS).map(([k, d]) => `<option value="${k}" ${k === dl.dist ? "selected" : ""}>${d.name}</option>`).join("")}</select></label>
          <div class="callout info" style="margin:12px 0">${icon("book", 18)}<div class="small">${D.about}</div></div>
          ${D.params.map(([k, l, mn, mx, st]) => slider("dlp-" + k, l, mn, mx, st, dl.p[k])).join("")}
          ${slider("dl-x1", "x<sub>1</sub>", lo.toFixed(2), hi.toFixed(2), 0.01, dl.x1)}
          ${slider("dl-x2", "x<sub>2</sub>", lo.toFixed(2), hi.toFixed(2), 0.01, dl.x2)}
          ${D.z || D.std ? `<label class="check-chip dl-check"><input type="checkbox" id="dl-std" ${dl.showStd ? "checked" : ""}> Show standard normal (μ = 0, σ = 1)</label>` : ""}
          ${D.z ? `<label class="check-chip dl-check"><input type="checkbox" id="dl-sig" ${dl.showSig ? "checked" : ""}> Show μ ± 1σ, 2σ, 3σ</label>` : ""}
          <div id="dl-res" class="dl-res">${dlResultsHtml()}</div>
        </div>
        <div class="card section">
          <h2>Simulation</h2>
          <div class="row-gap" style="flex-wrap:wrap;margin:10px 0">
            <button class="btn btn-primary btn-sm" data-dlsim="1">+1 sample</button>
            <button class="btn btn-primary btn-sm" data-dlsim="100">+100</button>
            <button class="btn btn-primary btn-sm" data-dlsim="1000">+1000</button>
            <button class="btn btn-secondary btn-sm" id="dl-run">${icon("play", 14)} Run continuously</button>
            <button class="btn btn-ghost btn-sm" id="dl-clear">Clear</button>
          </div>
          <label class="check-chip dl-check"><input type="checkbox" id="dl-balls-on" ${dl.balls ? "checked" : ""}> Falling balls animation</label>
          <div id="dl-sim">${dlSimHtml()}</div>
        </div>
      </div>
    </div>`;
  dlBindExplore();
}

function dlRefresh(full) {
  if (full) return dlExplore();
  document.getElementById("dl-chart").innerHTML = dlChartHtml();
  document.getElementById("dl-res").innerHTML = dlResultsHtml();
  document.getElementById("dl-sim").innerHTML = dlSimHtml();
  ["x1", "x2"].forEach(k => { const el = document.getElementById("dl-" + k); if (el) { el.value = dl[k]; document.getElementById(`dl-${k}-v`).textContent = fmt(dl[k]); } });
  dlBindChart();
}

function dlBindExplore() {
  const D = DISTS[dl.dist];
  document.getElementById("dl-dist").onchange = e => { dlReset(e.target.value); dlExplore(); };
  D.params.forEach(([k]) => {
    const el = document.getElementById("dlp-" + k);
    el.oninput = () => {
      dl.p[k] = +el.value; document.getElementById(`dlp-${k}-v`).textContent = fmt(dl.p[k]);
      dlClearBalls(); dl.samples = [];
      const [lo, hi] = D.range(dl.p);
      ["x1", "x2"].forEach(x => { const s = document.getElementById("dl-" + x); s.min = lo.toFixed(2); s.max = hi.toFixed(2); dl[x] = Math.min(hi, Math.max(lo, dl[x])); });
      dlRefresh();
    };
  });
  ["x1", "x2"].forEach(k => { const el = document.getElementById("dl-" + k); el.oninput = () => { dl[k] = +el.value; dlRefresh(); }; });
  const std = document.getElementById("dl-std"); if (std) std.onchange = () => { dl.showStd = std.checked; dlRefresh(); };
  const sig = document.getElementById("dl-sig"); if (sig) sig.onchange = () => { dl.showSig = sig.checked; dlRefresh(); };
  view.querySelectorAll("[data-dlsim]").forEach(b => b.onclick = () => { dlAdd(+b.dataset.dlsim); if (!dl.balls) dlRefresh(); });
  const bl = document.getElementById("dl-balls-on");
  bl.onchange = () => { dl.balls = bl.checked; if (!dl.balls) { dlFlushBalls(); dlRefresh(); } };
  const run = document.getElementById("dl-run");
  run.onclick = () => {
    if (dl.timer) { dlStop(); run.innerHTML = `${icon("play", 14)} Run continuously`; return; }
    run.innerHTML = `${icon("x", 14)} Stop`;
    dl.timer = setInterval(() => {
      if (currentRoute()[0] !== "dist" || dl.samples.length >= 50000) { dlStop(); run.innerHTML = `${icon("play", 14)} Run continuously`; return; }
      if (dl.balls) { if (dl.queue.length < 120) dlAdd(Math.max(4, Math.round(dl.samples.length / 25))); }
      else { dlAdd(Math.max(5, Math.round(dl.samples.length / 20))); dlRefresh(); }
    }, 80);
  };
  document.getElementById("dl-clear").onclick = () => { dlClear(); run.innerHTML = `${icon("play", 14)} Run continuously`; dlRefresh(); };
  dlBindChart();
}
function dlAdd(n) {
  const D = DISTS[dl.dist];
  for (let i = 0; i < n; i++) { const v = D.sample(dl.p); if (dl.balls) dl.queue.push(v); else dl.samples.push(v); }
  if (dl.balls) dlBallsStart();
}

// ---------- Falling balls: each sample drops straight down above its own value (across the whole axis), like a
// rain of samples, and lands on its histogram bar ----------
dl.balls = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
dl.queue = []; dl.active = []; dl.raf = null;

function dlClearBalls() {
  dl.queue = []; dl.active = [];
  if (dl.raf) { cancelAnimationFrame(dl.raf); dl.raf = null; }
  const c = document.getElementById("dl-balls"); if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}
function dlFlushBalls() {             // land everything now (used when the animation is turned off)
  dl.active.forEach(b => dl.samples.push(b.v)); dl.queue.forEach(v => dl.samples.push(v));
  dlClearBalls();
}
function dlBallsStart() { if (!dl.raf) { dl.frame = 0; dl.raf = requestAnimationFrame(dlBallsTick); } }

function dlBallsTick() {
  dl.raf = null;
  const canvas = document.getElementById("dl-balls"), svg = document.querySelector("#dl-chart .dl-svg");
  if (!canvas || !svg || currentRoute()[0] !== "dist") { dl.queue.forEach(v => dl.samples.push(v)); dl.active.forEach(b => dl.samples.push(b.v)); dl.queue = []; dl.active = []; return; }
  const r = svg.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
  }
  const W = DL.W, H = DL.H, k = r.width / W;
  const lo = +svg.dataset.lo, hi = +svg.dataset.hi, ymax = +svg.dataset.ymax;
  const pw = W - DL.L - DL.R, ph = H - DL.T - DL.B;
  const X = x => DL.L + (x - lo) / (hi - lo) * pw, Y = y => DL.T + ph - Math.min(y, ymax) / ymax * ph;

  // spawn
  const nb = 40, bw = (hi - lo) / nb;
  const counts = new Array(nb).fill(0);
  dl.samples.forEach(s => { const i = Math.floor((s - lo) / bw); if (i >= 0 && i < nb) counts[i]++; });
  dl.active.forEach(b => { counts[b.bin]++; });
  let spawn = Math.min(40, Math.ceil(dl.queue.length / 45));
  while (spawn-- > 0 && dl.queue.length) {
    const v = dl.queue.shift();
    if (v < lo || v > hi || dl.active.length > 700) { dl.samples.push(v); dl.dirty = true; continue; }
    const bin = Math.min(nb - 1, Math.floor((v - lo) / bw)), n = dl.samples.length + dl.active.length + 1;
    const cnt = ++counts[bin];
    const ty = Math.max(DL.T + 6, Y(cnt / (n * bw)) - 4);
    dl.active.push({ v, bin, tx: X(v), ty, t: 0, dur: 38 + Math.random() * 18, ph: Math.random() * 6.28, amp: 4 + Math.random() * 6 });
  }

  // move & land
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue("--primary").trim() || "#2952cc";
  const still = [];
  for (const b of dl.active) {
    b.t += 1 / b.dur;
    if (b.t >= 1) { dl.samples.push(b.v); dl.dirty = true; continue; }
    const t = b.t, y0 = DL.T - 14 - b.amp * 2;     // drop straight down from above its own value
    const x = b.tx;
    const y = y0 + (b.ty - y0) * t * t;
    ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
    still.push(b);
  }
  dl.active = still;
  dl.frame = (dl.frame || 0) + 1;
  if (dl.dirty && (dl.frame % 3 === 0 || !dl.active.length)) { dl.dirty = false; dlMoveRefresh(); }
  if (dl.active.length || dl.queue.length) dl.raf = requestAnimationFrame(dlBallsTick);
  else { ctx.clearRect(0, 0, W, H); if (dl.dirty) { dl.dirty = false; dlMoveRefresh(); } }
}

function dlBindChart() {
  const svg = view.querySelector("#dl-chart .dl-svg");
  if (!svg) return;
  const toX = e => {
    const r = svg.getBoundingClientRect(), lo = +svg.dataset.lo, hi = +svg.dataset.hi;
    const px = (e.clientX - r.left) / r.width * DL.W;
    const x = lo + (px - DL.L) / (DL.W - DL.L - DL.R) * (hi - lo);
    return Math.round(Math.min(hi, Math.max(lo, x)) * 100) / 100;
  };
  svg.onpointerdown = e => {
    const x = toX(e);
    dl.drag = Math.abs(x - dl.x1) <= Math.abs(x - dl.x2) ? "x1" : "x2";
    dl[dl.drag] = x;
    try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    dlMoveRefresh();
  };
  svg.onpointermove = e => { if (!dl.drag) return; dl[dl.drag] = toX(e); dlMoveRefresh(); };
  svg.onpointerup = svg.onpointercancel = () => { dl.drag = null; };
}
// While dragging keep the same <svg> element (so pointer capture survives): replace only its contents
function dlMoveRefresh() {
  const host = document.getElementById("dl-chart"), svg = host.querySelector(".dl-svg");
  const tmp = document.createElement("div"); tmp.innerHTML = dlChartHtml();
  svg.innerHTML = tmp.firstElementChild.innerHTML;
  document.getElementById("dl-res").innerHTML = dlResultsHtml();
  document.getElementById("dl-sim").innerHTML = dlSimHtml();
  ["x1", "x2"].forEach(k => { const el = document.getElementById("dl-" + k); if (el) { el.value = dl[k]; document.getElementById(`dl-${k}-v`).textContent = fmt(dl[k]); } });
}

// ----- Z-table -----
function dlZTable() {
  const z = dl.z, az = Math.abs(z);
  const row = Math.min(3.4, Math.floor(Math.round(az * 100) / 10) / 10), col = Math.round(az * 100) % 10;
  const rows = []; for (let r = 0; r <= 34; r++) rows.push(r / 10);
  document.getElementById("dl-body").innerHTML = `
    <div class="dl-layout">
      <div class="card dl-chart-card">
        <div id="dl-zchart">${dlSvg({ pdf: normPdf, range: [-4, 4], x1: -40, x2: z, shade: "left", pct: `N(z) = ${normCdf(z).toFixed(4)}`, marks: [{ x: z, label: `z = ${z.toFixed(2)}` }], label: "Standard normal" })}</div>
      </div>
      <div class="dl-side"><div class="card">
        <div class="form-grid">
          <label class="field"><span class="field-label">z</span><input class="input" type="number" step="0.01" min="-4" max="4" id="dl-z" value="${z}"></label>
          <label class="field"><span class="field-label">…or probability N(z) → z</span><input class="input" type="number" step="0.0001" min="0.0001" max="0.9999" id="dl-p" placeholder="e.g. 0.95"></label>
        </div>
        <div class="dl-res">
          <div class="dl-eq dl-big">N(${z.toFixed(2)}) = P(Z &lt; ${z.toFixed(2)}) = <strong>${normCdf(z).toFixed(4)}</strong></div>
          <p class="text-2 small">P(Z &gt; ${z.toFixed(2)}) = ${(1 - normCdf(z)).toFixed(4)} · P(|Z| &gt; ${az.toFixed(2)}) = ${(2 * (1 - normCdf(az))).toFixed(4)} · P(−${az.toFixed(2)} &lt; Z &lt; ${az.toFixed(2)}) = ${(2 * normCdf(az) - 1).toFixed(4)}</p>
          ${z < 0 ? `<p class="text-2 small">Tables only list positive z: N(${z.toFixed(2)}) = 1 − N(${az.toFixed(2)}) = 1 − ${normCdf(az).toFixed(4)}.</p>` : ""}
        </div>
        <h3 style="margin-top:14px">Critical values to remember</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Confidence</th><th class="num">Two-tailed z</th><th class="num">One-tailed z</th></tr></thead>
          <tbody>${[[90, 1.645, 1.282], [95, 1.96, 1.645], [99, 2.576, 2.326]].map(([c, t, o]) => `<tr><td>${c}%</td><td class="num">±${t}</td><td class="num">${o}</td></tr>`).join("")}</tbody></table></div>
      </div></div>
    </div>
    <div class="card section">
      <h2>Cumulative z-table N(z)</h2><p class="text-2 small">Row = first decimal, column = second decimal. Tap a cell to look it up.</p>
      <div class="table-wrap"><table class="table dl-ztab">
        <thead><tr><th>z</th>${Array.from({ length: 10 }, (_, c) => `<th class="num">.0${c}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr class="${Math.abs(r - row) < 1e-9 ? "dl-zrow" : ""}"><th>${r.toFixed(1)}</th>${Array.from({ length: 10 }, (_, c) => {
          const v = r + c / 100, on = Math.abs(r - row) < 1e-9 && c === col && az <= 3.49;
          return `<td class="num ${on ? "dl-zon" : ""}" data-z="${v.toFixed(2)}">${normCdf(v).toFixed(4)}</td>`; }).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  const zi = document.getElementById("dl-z");
  zi.onchange = () => { const v = +zi.value; if (Number.isFinite(v)) { dl.z = Math.max(-4, Math.min(4, Math.round(v * 100) / 100)); dlZTable(); } };
  const pi = document.getElementById("dl-p");
  pi.onchange = () => { const v = +pi.value; if (v > 0 && v < 1) { dl.z = Math.round(normInv(v) * 100) / 100; dlZTable(); toast(`z for N(z) = ${v} is about ${dl.z.toFixed(2)}`); } };
  view.querySelectorAll("[data-z]").forEach(td => td.onclick = () => { dl.z = +td.dataset.z; dlZTable(); });
}

// ----- Skew & kurtosis -----
function dlShape() {
  // Skew-normal with shape alpha (location/scale chosen so mean 0, sd 1)
  const al = dl.alpha, d = al / Math.sqrt(1 + al * al), m0 = d * Math.sqrt(2 / Math.PI);
  const w = 1 / Math.sqrt(1 - m0 * m0), xi = -w * m0;
  const snPdf = x => { const z = (x - xi) / w; return 2 / w * normPdf(z) * normCdf(al * z); };
  const skew = (4 - Math.PI) / 2 * Math.pow(m0, 3) / Math.pow(1 - m0 * m0, 1.5);
  const grid = Array.from({ length: 2001 }, (_, i) => -5 + i * 0.005);
  let acc = 0, median = 0, mode = 0, best = -1;
  for (const x of grid) { const y = snPdf(x); if (y > best) { best = y; mode = x; } acc += y * 0.005; if (!median && acc >= 0.5) median = x; }
  // Generalized normal with shape beta (unit variance): beta 2 = normal, < 2 fat tails, > 2 thin tails
  const be = dl.beta, sc = Math.sqrt(Math.exp(lnGamma(1 / be) - lnGamma(3 / be)));
  const gnPdf = x => be / (2 * sc * Math.exp(lnGamma(1 / be))) * Math.exp(-Math.pow(Math.abs(x) / sc, be));
  const exk = Math.exp(lnGamma(5 / be) + lnGamma(1 / be) - 2 * lnGamma(3 / be)) - 3;
  const kName = Math.abs(exk) < 0.05 ? "Mesokurtic (normal)" : exk > 0 ? "Leptokurtic — fat tails, tall peak" : "Platykurtic — thin tails, flat top";
  const sName = Math.abs(skew) < 0.02 ? "Symmetric: mean = median = mode" : skew > 0 ? "Positive (right) skew: mode < median < mean" : "Negative (left) skew: mean < median < mode";

  document.getElementById("dl-body").innerHTML = `
    <div class="grid dl-two">
      <div class="card">
        <h2>Skewness</h2>
        ${dlSvg({ pdf: snPdf, range: [-4, 4], x1: 0, x2: 0, extra: [{ pdf: normPdf, cls: "dl-std", fill: false }],
          marks: [{ x: mode, label: "Mode", cls: "m-mode" }, { x: median, label: "Median", cls: "m-med" }, { x: 0, label: "Mean", cls: "m-mean" }], label: "Skewed distribution" })}
        <label class="dl-slider"><span>Skew shape = <strong>${al.toFixed(1)}</strong> · skewness = <strong>${skew.toFixed(3)}</strong></span>
          <input type="range" id="dl-alpha" min="-8" max="8" step="0.5" value="${al}"></label>
        <div class="callout ${Math.abs(skew) < 0.02 ? "success" : "warning"}">${icon("target", 18)}<div><strong>${sName}</strong><br><span class="small">Mean 0.00 · median ${median.toFixed(2)} · mode ${mode.toFixed(2)}. The mean is pulled toward the long tail. Positive skew: many small losses and a few big gains — investors usually prefer it.</span></div></div>
      </div>
      <div class="card">
        <h2>Kurtosis</h2>
        ${dlSvg({ pdf: gnPdf, range: [-4, 4], x1: 0, x2: 0, extra: [{ pdf: normPdf, cls: "dl-std", fill: false }], label: "Kurtosis comparison" })}
        <label class="dl-slider"><span>Tail shape = <strong>${be.toFixed(2)}</strong> · excess kurtosis = <strong>${exk.toFixed(2)}</strong></span>
          <input type="range" id="dl-beta" min="0.8" max="8" step="0.1" value="${be}"></label>
        <div class="callout ${Math.abs(exk) < 0.05 ? "success" : "warning"}">${icon("target", 18)}<div><strong>${kName}</strong><br><span class="small">Same mean and variance as the grey normal curve. Excess kurtosis = kurtosis − 3. Fat tails (> 0) mean extreme returns happen more often than a normal model predicts, so normal-based VaR understates risk.</span></div></div>
      </div>
    </div>`;
  document.getElementById("dl-alpha").oninput = e => { dl.alpha = +e.target.value; dlShape(); document.getElementById("dl-alpha").focus(); };
  document.getElementById("dl-beta").oninput = e => { dl.beta = +e.target.value; dlShape(); document.getElementById("dl-beta").focus(); };
}

// ----- Quick quiz (exam-style A/B/C) -----
function dlNewQuestion() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mu = pick([4, 5, 6, 7, 8, 9, 10, 12]), sigma = pick([2, 4, 5, 8, 10, 12, 15]);
  const zs = [0.5, 1, 1.5, 1.645, 1.96, 2, 2.33, 2.5];
  const kind = pick(["left", "right", "between", "tails"]);
  const za = pick(zs), zb = pick(zs);
  let x1, x2, ans, text, shade;
  const r2 = v => Math.round(v * 100) / 100;
  if (kind === "left") { x1 = r2(mu - za * sigma); x2 = x1; ans = normCdf(-za); text = `the return is below ${x1}%`; shade = "left"; }
  if (kind === "right") { x2 = r2(mu + za * sigma); x1 = x2; ans = 1 - normCdf(za); text = `the return is above ${x2}%`; shade = "right"; }
  if (kind === "between") { x1 = r2(mu - za * sigma); x2 = r2(mu + zb * sigma); ans = normCdf(zb) - normCdf(-za); text = `the return is between ${x1}% and ${x2}%`; shade = "between"; }
  if (kind === "tails") { x1 = r2(mu - za * sigma); x2 = r2(mu + za * sigma); ans = 2 * (1 - normCdf(za)); text = `the return is below ${x1}% or above ${x2}%`; shade = "tails"; }
  const wrongs = [kind === "tails" ? 1 - normCdf(za) : 2 * Math.min(ans, 1 - ans), 1 - ans, kind === "between" ? normCdf(zb) : normCdf(za) - 0.5, ans / 2, Math.min(0.99, ans + 0.1)]
    .filter(w => w > 0.001 && w < 0.999 && Math.abs(w - ans) > 0.02);
  const choices = [ans];
  for (const w of wrongs) if (choices.length < 3 && choices.every(c => Math.abs(c - w) > 0.02)) choices.push(w);
  while (choices.length < 3) choices.push(Math.min(0.98, choices[choices.length - 1] + 0.07));
  choices.sort((a, b) => a - b);
  const L = ["A", "B", "C"];
  dl.guess = { mu, sigma, x1, x2, kind, za, zb, ans, shade, text, picked: null,
    choices: Object.fromEntries(choices.map((c, i) => [L[i], (c * 100).toFixed(2) + "%"])), answer: L[choices.indexOf(ans)] };
}

function dlQuiz() {
  if (!dl.guess) dlNewQuestion();
  const g = dl.guess, done = g.picked !== null;
  const z1 = (g.x1 - g.mu) / g.sigma, z2 = (g.x2 - g.mu) / g.sigma;
  const q = { choices: g.choices, answer: g.answer };
  const steps = {
    left: `z = (${g.x1} − ${g.mu}) / ${g.sigma} = ${z1.toFixed(2)} → P(Z < ${z1.toFixed(2)}) = 1 − N(${Math.abs(z1).toFixed(2)}) = ${g.ans.toFixed(4)}`,
    right: `z = (${g.x2} − ${g.mu}) / ${g.sigma} = ${z2.toFixed(2)} → P(Z > ${z2.toFixed(2)}) = 1 − N(${z2.toFixed(2)}) = ${g.ans.toFixed(4)}`,
    between: `z₁ = (${g.x1} − ${g.mu}) / ${g.sigma} = ${z1.toFixed(2)}, z₂ = (${g.x2} − ${g.mu}) / ${g.sigma} = ${z2.toFixed(2)} → N(${z2.toFixed(2)}) − N(${z1.toFixed(2)}) = ${normCdf(z2).toFixed(4)} − ${normCdf(z1).toFixed(4)} = ${g.ans.toFixed(4)}`,
    tails: `z = ±${g.za} → both tails = 2 × [1 − N(${g.za})] = 2 × ${(1 - normCdf(g.za)).toFixed(4)} = ${g.ans.toFixed(4)}`
  }[g.kind];
  document.getElementById("dl-body").innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <div class="row-between" style="margin-bottom:12px"><span class="badge">QM-06</span><span class="text-2 small">Score this session: <strong>${dl.score[0]}/${dl.score[1]}</strong></span></div>
      <div class="card">
        <div class="q-text">An asset's annual returns are normally distributed with a mean of ${g.mu}% and a standard deviation of ${g.sigma}%. The probability that ${g.text} is closest to:</div>
        ${choicesHtml(q, g.picked, done)}
        ${done ? `<div class="explain"><div class="explain-head ${g.picked === g.answer ? "ok" : "bad"}">${icon(g.picked === g.answer ? "check" : "alert", 18)} ${g.picked === g.answer ? "Correct" : `Incorrect — the answer is ${g.answer}`}</div>
          <div class="explain-body"><div class="explain-block"><h4>Solution</h4><p>${steps}</p></div>
          <div class="explain-block">${dlSvg({ pdf: x => normPdf((x - g.mu) / g.sigma) / g.sigma, range: [g.mu - 4 * g.sigma, g.mu + 4 * g.sigma], x1: g.x1, x2: g.x2, shade: g.shade, pct: (g.ans * 100).toFixed(2) + "%", label: "Solution chart" })}</div>
          <div class="explain-block"><h4>Exam trap</h4><p>${g.kind === "tails" ? "Two tails: double the one-tail area." : g.kind === "between" ? "Subtract the two cumulative values; do not add the tails." : "N(z) from the table is the LEFT area. For a right tail use 1 − N(z); for a negative z use 1 − N(|z|)."}</p></div></div></div>
          <button class="btn btn-primary btn-lg btn-block" id="dl-next" style="margin-top:20px">Next question ${icon("next", 18)}</button>` : ""}
      </div>
    </div>`;
  view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    if (g.picked !== null) return;
    g.picked = b.dataset.pick; dl.score[1]++; if (g.picked === g.answer) dl.score[0]++; dlQuiz();
  });
  const nx = document.getElementById("dl-next");
  if (nx) nx.onclick = () => { dlNewQuestion(); dlQuiz(); window.scrollTo(0, 0); };
}

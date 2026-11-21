// ============================================================
// js/baii.js — a financial calculator that follows the keystrokes of the
// BA II Plus, the calculator allowed in the CFA exam.
//
// Standard calculations (chain or AOS, parentheses, memories), TVM with P/Y,
// C/Y and BGN/END, cash flows (NPV, IRR), amortization, interest conversion,
// statistics (1-V, LIN, Ln, EXP, PWR), dates, percent change, profit margin,
// breakeven, memories, format settings and reset. Not included: the BOND and
// DEPR worksheets. Pure logic with no page code: js/calc.js draws the keys.
// Works in the browser (window.BAII) and in Node (require) for the tests.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BAII = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- errors (the calculator's numbering) ----------
  const ERRORS = {
    1: "Overflow", 2: "Invalid argument", 3: "Too many pending operations", 4: "Out of range",
    5: "No solution exists", 6: "Invalid date", 7: "Iteration limit exceeded", 8: "Canceled iterative calculation"
  };
  function CalcError(code) { this.code = code; }
  const fail = code => { throw new CalcError(code); };
  const MAX = 9.9999999999e99;
  const chk = v => {
    if (Number.isNaN(v)) fail(2);
    if (!Number.isFinite(v) || Math.abs(v) > MAX) fail(1);
    return Object.is(v, -0) ? 0 : v;
  };
  const clean = v => chk(Number(v.toPrecision(13)));   // the calculator keeps 13 significant digits

  // ---------- key layout: [id, key label, 2nd label] row by row; "=" takes two rows ----------
  const LAYOUT = [
    [["cpt", "CPT", "QUIT"], ["enter", "ENTER", "SET"], ["up", "↑", "DEL"], ["down", "↓", "INS"], ["on", "ON|OFF", ""]],
    [["2nd", "2ND", ""], ["cf", "CF", ""], ["npv", "NPV", ""], ["irr", "IRR", ""], ["back", "→", ""]],
    [["n", "N", "xP/Y"], ["iy", "I/Y", "P/Y"], ["pv", "PV", "AMORT"], ["pmt", "PMT", "BGN"], ["fv", "FV", "CLR TVM"]],
    [["pct", "%", ""], ["sqrt", "√x", ""], ["sq", "x²", ""], ["recip", "1/x", ""], ["/", "÷", ""]],
    [["inv", "INV", "HYP"], ["(", "(", "SIN"], [")", ")", "COS"], ["pow", "yˣ", "TAN"], ["*", "×", "x!"]],
    [["ln", "LN", "eˣ"], ["7", "7", "DATA"], ["8", "8", "STAT"], ["9", "9", "BOND"], ["-", "−", "nPr"]],
    [["sto", "STO", "RAND"], ["4", "4", "DEPR"], ["5", "5", "Δ%"], ["6", "6", "BRKEVN"], ["+", "+", "nCr"]],
    [["rcl", "RCL", "ROUND"], ["1", "1", "DATE"], ["2", "2", "ICONV"], ["3", "3", "PROFIT"], ["=", "=", "ANS"]],
    [["ce", "CE|C", "CLR WORK"], ["0", "0", "MEM"], [".", ".", "FORMAT"], ["neg", "+|−", "RESET"]]
  ];
  const KEY = {};
  LAYOUT.forEach(row => row.forEach(([id, label, second]) => { KEY[id] = { label, second }; }));

  // ---------- state ----------
  const DATE0 = { y: 1990, m: 12, d: 31 };
  function defaults() {
    return {
      v: 1,
      fmt: { dec: 2, rad: false, eurDate: false, eurSep: false, aos: false },
      mem: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ans: 0,
      tvm: { N: 0, IY: 0, PV: 0, PMT: 0, FV: 0, PY: 1, CY: 1, bgn: false },
      cf: { CF0: 0, list: [], I: 0, NPV: 0, IRR: 0 },
      amort: { P1: 1, P2: 1 },
      iconv: { NOM: 0, EFF: 0, CY: 1 },
      data: [], stat: { method: "LIN", X: 0, Y: 0 },
      date: { DT1: { ...DATE0 }, DT2: { ...DATE0 }, DBD: 0, act: true },
      pct: { OLD: 0, NEW: 0, CH: 0, PD: 1 },
      profit: { CST: 0, SEL: 0, MAR: 0 },
      brk: { FC: 0, VC: 0, P: 0, PFT: 0, Q: 0 }
    };
  }
  const frame = () => ({ vals: [], ops: [] });
  const freshUi = () => ({
    mode: null, idx: 0, second: false, inv: false, hyp: false, entry: null, x: 0, label: null, text: null,
    computed: false, err: 0, frames: [frame()], lastOp: false, cpt: false, sto: null, rst: false
  });
  // a saved state is read back field by field, so an old or damaged copy can't break the calculator
  function load(saved) {
    const st = defaults();
    if (saved && typeof saved === "object" && saved.v === 1) {
      Object.keys(st).forEach(k => {
        const a = st[k], b = saved[k];
        if (b === undefined || b === null || typeof b !== typeof a) return;
        if (Array.isArray(a)) { if (Array.isArray(b)) st[k] = b; }
        else if (typeof a === "object") Object.keys(a).forEach(f => { if (b[f] !== undefined && typeof b[f] === typeof a[f]) a[f] = b[f]; });
        else st[k] = b;
      });
      if (st.mem.length !== 10 || st.mem.some(v => typeof v !== "number")) st.mem = defaults().mem;
      st.cf.list = st.cf.list.filter(f => f && typeof f.c === "number" && typeof f.f === "number").slice(0, 24);
      st.data = st.data.filter(d => d && typeof d.x === "number" && typeof d.y === "number").slice(0, 50);
    }
    st.ui = freshUi();
    const u = saved && saved.ui;
    if (u && typeof u === "object") {
      ["mode", "idx", "x", "label", "text", "computed", "err"].forEach(k => { if (u[k] !== undefined) st.ui[k] = u[k]; });
      if (st.ui.mode && !WS_IDS.includes(st.ui.mode)) { st.ui.mode = null; st.ui.idx = 0; }
      if (typeof st.ui.x !== "number" || !Number.isFinite(st.ui.x)) st.ui.x = 0;
    }
    return st;
  }

  // ---------- number formatting ----------
  // round half away from zero on the decimal digits (1.005 → 1.01), as a decimal calculator does
  function roundDec(v, d) {
    if (!Number.isFinite(v) || v === 0 || Math.abs(v) >= 1e15) return v;
    const sgn = v < 0 ? -1 : 1;
    const [m, e = "0"] = Math.abs(v).toPrecision(13).split("e");
    const r = Math.round(Number(`${m}e${Number(e) + d}`));
    return sgn * Number(`${r}e${-d}`);
  }
  function localize(s, f) {
    const neg = s[0] === "-";
    if (neg) s = s.slice(1);
    let exp = "";
    const ei = s.indexOf("E");
    if (ei >= 0) { exp = s.slice(ei); s = s.slice(0, ei); }
    const dot = s.indexOf(".");
    const ip = dot >= 0 ? s.slice(0, dot) : s, dp = dot >= 0 ? s.slice(dot + 1) : null;
    const g = ip.replace(/\B(?=(\d{3})+(?!\d))/g, f.eurSep ? "." : ",");
    return (neg ? "-" : "") + g + (dp !== null ? (f.eurSep ? "," : ".") + dp : "") + exp;
  }
  function fmtNum(v, f, int) {
    v = Object.is(v, -0) ? 0 : v;
    const dec = int ? 0 : f.dec, a = Math.abs(v);
    if (a !== 0 && (a >= 1e10 || (dec === 9 && a < 1e-9))) {
      let [m, e] = v.toExponential(dec === 9 ? 7 : Math.min(dec, 7)).split("e");
      if (dec === 9) m = m.replace(/\.?0+$/, "");
      return localize(`${m}E${Number(e)}`, f);
    }
    let s;
    if (dec === 9) {
      const intDigits = a < 1 ? 1 : Math.floor(Math.log10(a)) + 1, d = Math.max(0, 10 - intDigits);
      s = roundDec(v, d).toFixed(d);
      if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    } else s = roundDec(v, dec).toFixed(dec);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return localize(s, f);
  }
  const pad2 = n => String(n).padStart(2, "0");

  // ---------- dates ----------
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const mdays = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  const dayNo = d => Math.round(Date.UTC(d.y, d.m - 1, d.d) / 86400000);
  const fromDayNo = n => { const t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  // MM.DDYY (US) or DD.MMYY (EUR); YY 50–99 → 1950–1999, 00–49 → 2000–2049
  function parseDate(v, f) {
    if (!(v > 0)) fail(6);
    const [a, b] = v.toFixed(4).split(".");
    const first = Number(a), second = Number(b.slice(0, 2)), yy = Number(b.slice(2, 4));
    const m = f.eurDate ? second : first, d = f.eurDate ? first : second, y = yy >= 50 ? 1900 + yy : 2000 + yy;
    if (m < 1 || m > 12 || d < 1 || d > mdays(y, m)) fail(6);
    return { y, m, d };
  }
  const fmtDate = (dt, f) => f.eurDate ? `${dt.d}-${pad2(dt.m)}-${dt.y}` : `${dt.m}-${pad2(dt.d)}-${dt.y}`;
  function days360(a, b) {
    const d1 = Math.min(a.d, 30), d2 = b.d === 31 && d1 === 30 ? 30 : b.d;
    return (b.y - a.y) * 360 + (b.m - a.m) * 30 + (d2 - d1);
  }
  const dbd = dt => dt.act ? dayNo(dt.DT2) - dayNo(dt.DT1) : days360(dt.DT1, dt.DT2);
  function addDays(from, n, act, back) {
    n = Math.round(n);
    if (act) return fromDayNo(dayNo(from) + (back ? -n : n));
    // 30/360: search near the actual-day estimate for the date with this count
    const est = dayNo(from) + Math.round((back ? -n : n) * 365.25 / 360);
    for (let k = 0; k <= 40; k++) for (const s of [k, -k]) {
      const c = fromDayNo(est + s), cnt = back ? days360(c, from) : days360(from, c);
      if (cnt === n) return c;
    }
    fail(5);
  }

  // ---------- money maths ----------
  function periodicRate(t) {
    if (!(t.PY > 0) || !(t.CY > 0)) fail(2);
    const base = 1 + t.IY / 100 / t.CY;
    if (base <= 0) fail(2);
    return Math.pow(base, t.CY / t.PY) - 1;
  }
  function tvmF(r, N, PV, PMT, FV, k) {
    if (Math.abs(r) < 1e-12) return PV + PMT * N + FV;
    const v = Math.pow(1 + r, -N);
    return PV + PMT * (1 + r * k) * (1 - v) / r + FV * v;
  }
  // a root of f in rate r (> −1): Newton from a guess, then the nearest bracket on a grid, then bisection
  function findRate(f, guess) {
    const ok = r => Number.isFinite(r) && r > -1;
    let r = guess;
    for (let i = 0; i < 80 && ok(r); i++) {
      const h = 1e-7 * Math.max(1, Math.abs(r)), y = f(r), d = (f(r + h) - f(r - h)) / (2 * h);
      if (!Number.isFinite(y) || !Number.isFinite(d) || d === 0) break;
      const nr = r - y / d;
      if (Math.abs(nr - r) < 1e-14 * Math.max(1, Math.abs(r))) {
        if (ok(nr) && Math.abs(f(nr)) <= 1e-9 * scaleOf(f)) return nr;
        break;
      }
      r = nr;
    }
    const grid = [-0.999, -0.99, -0.95, -0.9, -0.8, -0.6, -0.4, -0.2, -0.1, -0.05, -0.02, -0.01, -0.001, 0, 0.001, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 1, 2, 5, 10, 50, 100, 1000];
    const pairs = [];
    for (let i = 0; i < grid.length - 1; i++) {
      const a = grid[i], b = grid[i + 1], fa = f(a), fb = f(b);
      if (Number.isFinite(fa) && Number.isFinite(fb) && (fa === 0 || fa * fb < 0)) pairs.push([a, b, fa]);
    }
    if (!pairs.length) fail(5);
    pairs.sort((p, q) => Math.min(Math.abs(p[0] - guess), Math.abs(p[1] - guess)) - Math.min(Math.abs(q[0] - guess), Math.abs(q[1] - guess)));
    let [lo, hi, flo] = pairs[0];
    if (flo === 0) return lo;
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if (fm === 0 || (hi - lo) / 2 < 1e-15) return mid;
      if (fm * flo < 0) hi = mid; else { lo = mid; flo = fm; }
    }
    fail(7);
  }
  // size of the numbers in f's equation, so "close to zero" means the same for 1 and for 1,000,000
  let SCALE = 1;
  const scaleOf = () => SCALE;

  function solveTvm(field, t) {
    const k = t.bgn ? 1 : 0, { N, PV, PMT, FV } = t;
    if (field === "IY") {
      if (!(N > 0)) fail(5);
      SCALE = Math.max(1, Math.abs(PV), Math.abs(PMT) * Math.max(1, N), Math.abs(FV));
      const f = r => tvmF(r, N, PV, PMT, FV, k);
      let r;
      if (PMT === 0) {
        if (PV === 0 || FV === 0 || -FV / PV <= 0) fail(5);
        r = Math.pow(-FV / PV, 1 / N) - 1;
      } else r = findRate(f, 0.05);
      const iy = 100 * t.CY * (Math.pow(1 + r, t.PY / t.CY) - 1);
      return chk(iy);
    }
    const r = periodicRate(t);
    switch (field) {
      case "PV": {
        if (Math.abs(r) < 1e-12) return chk(-(PMT * N + FV));
        const v = Math.pow(1 + r, -N);
        return chk(-(PMT * (1 + r * k) * (1 - v) / r + FV * v));
      }
      case "FV": {
        if (Math.abs(r) < 1e-12) return chk(-(PV + PMT * N));
        const g = Math.pow(1 + r, N);
        return chk(-(PV * g + PMT * (1 + r * k) * (g - 1) / r));
      }
      case "PMT": {
        if (Math.abs(r) < 1e-12) { if (N === 0) fail(5); return chk(-(PV + FV) / N); }
        const v = Math.pow(1 + r, -N), a = (1 + r * k) * (1 - v) / r;
        if (a === 0) fail(5);
        return chk(-(PV + FV * v) / a);
      }
      case "N": {
        if (Math.abs(r) < 1e-12) { if (PMT === 0) fail(5); return chk(-(PV + FV) / PMT); }
        const A = PMT * (1 + r * k) / r, v = -(PV + A) / (FV - A);
        if (!(v > 0) || !Number.isFinite(v)) fail(5);
        return chk(-Math.log(v) / Math.log(1 + r));
      }
    }
    return 0;
  }

  // cash flows: groups {c, f}; NPV at a rate in %
  function npvAt(cf, rate) {
    let s = cf.CF0, t = 0;
    for (const g of cf.list) {
      if (Math.abs(rate) < 1e-12) s += g.c * g.f;
      else s += g.c * Math.pow(1 + rate, -t) * (1 - Math.pow(1 + rate, -g.f)) / rate;
      t += g.f;
    }
    return s;
  }
  const npv = (cf, I) => { if (I <= -100) fail(2); return chk(npvAt(cf, I / 100)); };
  function irr(cf) {
    if (!cf.list.length) fail(5);
    SCALE = Math.max(1, Math.abs(cf.CF0), ...cf.list.map(g => Math.abs(g.c) * g.f));
    return chk(100 * findRate(r => npvAt(cf, r), 0.1));
  }

  // amortization of payments P1..P2 from the TVM values (END: interest on the balance before each payment)
  function amortize(t, P1, P2) {
    const r = periodicRate(t);
    let bal = t.PV, prn = 0, int = 0;
    for (let k = 1; k <= P2; k++) {
      const i = t.bgn && k === 1 ? 0 : -bal * r, p = t.PMT - i;
      bal += p;
      if (k >= P1) { prn += p; int += i; }
    }
    return { bal: chk(bal), prn: chk(prn), int: chk(int) };
  }

  // statistics; Ln/EXP/PWR regress on ln x and/or ln y
  const METHODS = ["LIN", "Ln", "EXP", "PWR", "1-V"];
  function stats(s) {
    const m = s.stat.method, pts = s.data, Z = { n: 0, mx: 0, sx: 0, px: 0, my: 0, sy: 0, py: 0, a: 0, b: 0, r: 0, sumx: 0, sumx2: 0, sumy: 0, sumy2: 0, sumxy: 0 };
    if (!pts.length) return Z;
    if (m === "1-V") {
      let n = 0, sx = 0, sx2 = 0;
      pts.forEach(p => { n += p.y; sx += p.x * p.y; sx2 += p.x * p.x * p.y; });
      if (n <= 0) return Z;
      const mx = sx / n;
      let ss = 0; pts.forEach(p => { ss += p.y * (p.x - mx) * (p.x - mx); });
      return { ...Z, n, mx, sx: n > 1 ? Math.sqrt(ss / (n - 1)) : 0, px: Math.sqrt(ss / n), sumx: sx, sumx2: sx2 };
    }
    const lx = m === "Ln" || m === "PWR", ly = m === "EXP" || m === "PWR";
    const X = pts.map(p => { if (lx && !(p.x > 0)) fail(2); return lx ? Math.log(p.x) : p.x; });
    const Y = pts.map(p => { if (ly && !(p.y > 0)) fail(2); return ly ? Math.log(p.y) : p.y; });
    const n = X.length, sum = a => a.reduce((t, v) => t + v, 0);
    const sumx = sum(X), sumy = sum(Y), mx = sumx / n, my = sumy / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (X[i] - mx) ** 2; syy += (Y[i] - my) ** 2; sxy += (X[i] - mx) * (Y[i] - my); }
    let b = sxx ? sxy / sxx : 0, a = my - b * mx;
    const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    if (m === "EXP") { a = Math.exp(a); b = Math.exp(b); }
    if (m === "PWR") a = Math.exp(a);
    return {
      n, mx, my, a, b, r, sx: n > 1 ? Math.sqrt(sxx / (n - 1)) : 0, px: Math.sqrt(sxx / n), sy: n > 1 ? Math.sqrt(syy / (n - 1)) : 0, py: Math.sqrt(syy / n),
      sumx, sumx2: sum(X.map(v => v * v)), sumy, sumy2: sum(Y.map(v => v * v)), sumxy: sum(X.map((v, i) => v * Y[i]))
    };
  }
  function predictY(R, m, x) {
    if (m === "Ln") { if (!(x > 0)) fail(2); return R.a + R.b * Math.log(x); }
    if (m === "EXP") return R.a * Math.pow(R.b, x);
    if (m === "PWR") { if (!(x > 0)) fail(2); return R.a * Math.pow(x, R.b); }
    return R.a + R.b * x;
  }
  function predictX(R, m, y) {
    if (m === "EXP") { if (!(y / R.a > 0) || R.b <= 0 || R.b === 1) fail(2); return Math.log(y / R.a) / Math.log(R.b); }
    if (!R.b) fail(2);
    if (m === "Ln") return Math.exp((y - R.a) / R.b);
    if (m === "PWR") { if (!(y / R.a > 0)) fail(2); return Math.pow(y / R.a, 1 / R.b); }
    return (y - R.a) / R.b;
  }

  // ---------- small maths ----------
  function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
  const intArg = (v, max) => { if (v < 0 || v !== Math.floor(v) || v > max) fail(2); return v; };
  function comb(n, r) { intArg(n, 1e6); intArg(r, n); let c = 1; for (let i = 1; i <= Math.min(r, n - r); i++) c = c * (n - Math.min(r, n - r) + i) / i; return Math.round(c); }
  function perm(n, r) { intArg(n, 1e6); intArg(r, n); let p = 1; for (let i = 0; i < r; i++) p *= n - i; return p; }

  // ---------- worksheets ----------
  const WS_IDS = ["PY", "BGN", "CF", "NPV", "IRR", "AMORT", "ICONV", "DATA", "STAT", "DATE", "PCT", "PROFIT", "BRKEVN", "MEM", "FORMAT"];
  const num = (label, get, set, extra) => Object.assign({ label, get, set }, extra || {});
  const pos = v => { if (!(v > 0)) fail(2); return v; };
  const intIn = (v, lo, hi) => { if (v !== Math.floor(v) || v < lo || v > hi) fail(4); return v; };

  function wsVars(s, mode) {
    switch (mode) {
      case "PY": return [
        num("P/Y", s => s.tvm.PY, (s, v) => { s.tvm.PY = pos(v); s.tvm.CY = v; }),
        num("C/Y", s => s.tvm.CY, (s, v) => { s.tvm.CY = pos(v); })];
      case "BGN": return [{ text: s => s.tvm.bgn ? "BGN" : "END", toggle: s => { s.tvm.bgn = !s.tvm.bgn; } }];
      case "CF": {
        const L = s.cf.list, v = [num("CF0", s => s.cf.CF0, (s, x) => { s.cf.CF0 = x; })];
        L.forEach((g, j) => v.push(
          num(`C${pad2(j + 1)}`, s => s.cf.list[j].c, (s, x) => { s.cf.list[j].c = x; }, { row: j }),
          num(`F${pad2(j + 1)}`, s => s.cf.list[j].f, (s, x) => { s.cf.list[j].f = intIn(x, 1, 9999); }, { row: j })));
        if (L.length < 24) v.push(num(`C${pad2(L.length + 1)}`, () => 0, (s, x) => { s.cf.list.push({ c: x, f: 1 }); }, { row: L.length, fresh: true }));
        return v;
      }
      case "NPV": return [
        num("I", s => s.cf.I, (s, x) => { s.cf.I = x; }),
        num("NPV", s => s.cf.NPV, null, { cpt: s => { s.cf.NPV = npv(s.cf, s.cf.I); } })];
      case "IRR": return [num("IRR", s => s.cf.IRR, null, { cpt: s => { s.cf.IRR = irr(s.cf); } })];
      case "AMORT": {
        const A = () => amortize(s.tvm, s.amort.P1, s.amort.P2);
        const next = s => { const span = s.amort.P2 - s.amort.P1 + 1; s.amort.P1 = s.amort.P2 + 1; s.amort.P2 = s.amort.P1 + span - 1; };
        return [
          num("P1", s => s.amort.P1, (s, x) => { s.amort.P1 = intIn(x, 1, 9999); if (s.amort.P2 < s.amort.P1) s.amort.P2 = s.amort.P1; }, { cpt: next }),
          num("P2", s => s.amort.P2, (s, x) => { s.amort.P2 = intIn(x, s.amort.P1, 9999); }, { cpt: next }),
          num("BAL", () => A().bal), num("PRN", () => A().prn), num("INT", () => A().int)];
      }
      case "ICONV": return [
        num("NOM", s => s.iconv.NOM, (s, x) => { s.iconv.NOM = x; }, { cpt: s => { const c = pos(s.iconv.CY); s.iconv.NOM = chk(100 * c * (Math.pow(1 + s.iconv.EFF / 100, 1 / c) - 1)); } }),
        num("EFF", s => s.iconv.EFF, (s, x) => { s.iconv.EFF = x; }, { cpt: s => { const c = pos(s.iconv.CY); s.iconv.EFF = chk(100 * (Math.pow(1 + s.iconv.NOM / (100 * c), c) - 1)); } }),
        num("C/Y", s => s.iconv.CY, (s, x) => { s.iconv.CY = pos(x); })];
      case "DATA": {
        const v = [];
        s.data.forEach((p, j) => v.push(
          num(`X${pad2(j + 1)}`, s => s.data[j].x, (s, x) => { s.data[j].x = x; }, { row: j }),
          num(`Y${pad2(j + 1)}`, s => s.data[j].y, (s, x) => { s.data[j].y = x; }, { row: j })));
        if (s.data.length < 50) v.push(num(`X${pad2(s.data.length + 1)}`, () => 0, (s, x) => { s.data.push({ x, y: 1 }); }, { row: s.data.length, fresh: true }));
        return v;
      }
      case "STAT": {
        const m = s.stat.method, one = m === "1-V", R = () => stats(s);
        const v = [{ text: s => s.stat.method, toggle: s => { s.stat.method = METHODS[(METHODS.indexOf(s.stat.method) + 1) % METHODS.length]; } },
          num("n", () => R().n), num("x̄", () => R().mx), num("Sx", () => R().sx), num("σx", () => R().px)];
        if (!one) v.push(num("ȳ", () => R().my), num("Sy", () => R().sy), num("σy", () => R().py),
          num("a", () => R().a), num("b", () => R().b), num("r", () => R().r),
          num("X'", s => s.stat.X, (s, x) => { s.stat.X = x; }, { cpt: s => { s.stat.X = chk(predictX(R(), m, s.stat.Y)); } }),
          num("Y'", s => s.stat.Y, (s, x) => { s.stat.Y = x; }, { cpt: s => { s.stat.Y = chk(predictY(R(), m, s.stat.X)); } }));
        v.push(num("Σx", () => R().sumx), num("Σx²", () => R().sumx2));
        if (!one) v.push(num("Σy", () => R().sumy), num("Σy²", () => R().sumy2), num("Σxy", () => R().sumxy));
        return v;
      }
      case "DATE": return [
        { label: "DT1", date: "DT1", cpt: s => { s.date.DT1 = addDays(s.date.DT2, s.date.DBD, s.date.act, true); } },
        { label: "DT2", date: "DT2", cpt: s => { s.date.DT2 = addDays(s.date.DT1, s.date.DBD, s.date.act, false); } },
        num("DBD", s => s.date.DBD, (s, x) => { s.date.DBD = x; }, { cpt: s => { s.date.DBD = dbd(s.date); } }),
        { text: s => s.date.act ? "ACT" : "360", toggle: s => { s.date.act = !s.date.act; } }];
      case "PCT": {
        const P = s.pct;
        return [
          num("OLD", s => s.pct.OLD, (s, x) => { s.pct.OLD = x; }, { cpt: s => { const g = 1 + P.CH / 100; if (g === 0) fail(2); s.pct.OLD = chk(P.NEW / Math.pow(g, P.PD)); } }),
          num("NEW", s => s.pct.NEW, (s, x) => { s.pct.NEW = x; }, { cpt: s => { s.pct.NEW = chk(P.OLD * Math.pow(1 + P.CH / 100, P.PD)); } }),
          num("%CH", s => s.pct.CH, (s, x) => { s.pct.CH = x; }, { cpt: s => { if (!P.OLD || !P.PD) fail(2); s.pct.CH = chk(100 * (Math.pow(P.NEW / P.OLD, 1 / P.PD) - 1)); } }),
          num("#PD", s => s.pct.PD, (s, x) => { s.pct.PD = x; }, { cpt: s => { const q = P.NEW / P.OLD, g = 1 + P.CH / 100; if (!(q > 0) || !(g > 0) || g === 1) fail(2); s.pct.PD = chk(Math.log(q) / Math.log(g)); } })];
      }
      case "PROFIT": {
        const P = s.profit;
        return [
          num("CST", s => P.CST, (s, x) => { P.CST = x; }, { cpt: () => { P.CST = chk(P.SEL * (1 - P.MAR / 100)); } }),
          num("SEL", s => P.SEL, (s, x) => { P.SEL = x; }, { cpt: () => { if (P.MAR === 100) fail(2); P.SEL = chk(P.CST / (1 - P.MAR / 100)); } }),
          num("MAR", s => P.MAR, (s, x) => { P.MAR = x; }, { cpt: () => { if (!P.SEL) fail(2); P.MAR = chk(100 * (P.SEL - P.CST) / P.SEL); } })];
      }
      case "BRKEVN": {
        const B = s.brk;
        return [
          num("FC", () => B.FC, (s, x) => { B.FC = x; }, { cpt: () => { B.FC = chk(B.P * B.Q - B.VC * B.Q - B.PFT); } }),
          num("VC", () => B.VC, (s, x) => { B.VC = x; }, { cpt: () => { if (!B.Q) fail(2); B.VC = chk((B.P * B.Q - B.FC - B.PFT) / B.Q); } }),
          num("P", () => B.P, (s, x) => { B.P = x; }, { cpt: () => { if (!B.Q) fail(2); B.P = chk((B.FC + B.VC * B.Q + B.PFT) / B.Q); } }),
          num("PFT", () => B.PFT, (s, x) => { B.PFT = x; }, { cpt: () => { B.PFT = chk(B.P * B.Q - B.FC - B.VC * B.Q); } }),
          num("Q", () => B.Q, (s, x) => { B.Q = x; }, { cpt: () => { if (B.P === B.VC) fail(2); B.Q = chk((B.FC + B.PFT) / (B.P - B.VC)); } })];
      }
      case "MEM": return s.mem.map((m, i) => num(`M${i}`, s => s.mem[i], (s, x) => { s.mem[i] = x; }));
      case "FORMAT": return [
        num("DEC", s => s.fmt.dec, (s, x) => { s.fmt.dec = intIn(x, 0, 9); }, { int: true }),
        { text: s => s.fmt.rad ? "RAD" : "DEG", toggle: s => { s.fmt.rad = !s.fmt.rad; } },
        { text: s => s.fmt.eurDate ? "EUR" : "US", sample: s => fmtDate(DATE0, s.fmt), toggle: s => { s.fmt.eurDate = !s.fmt.eurDate; } },
        { text: s => s.fmt.eurSep ? "EUR" : "US", sample: s => localize("1000.", s.fmt), toggle: s => { s.fmt.eurSep = !s.fmt.eurSep; } },
        { text: s => s.fmt.aos ? "AOS" : "Chn", toggle: s => { s.fmt.aos = !s.fmt.aos; } }];
    }
    return [];
  }
  // what 2nd CLR WORK resets in each worksheet
  function clearWork(s, mode) {
    const d = defaults();
    switch (mode) {
      case "PY": s.tvm.PY = 1; s.tvm.CY = 1; break;
      case "BGN": s.tvm.bgn = false; break;
      case "CF": case "NPV": case "IRR": s.cf = d.cf; break;
      case "AMORT": s.amort = d.amort; break;
      case "ICONV": s.iconv = d.iconv; break;
      case "DATA": case "STAT": s.data = []; s.stat.X = 0; s.stat.Y = 0; break;
      case "DATE": s.date = d.date; break;
      case "PCT": s.pct = d.pct; break;
      case "PROFIT": s.profit = d.profit; break;
      case "BRKEVN": s.brk = d.brk; break;
      case "MEM": s.mem = d.mem; break;
      case "FORMAT": s.fmt = d.fmt; break;
    }
  }

  // ---------- the calculator ----------
  const TVM = { n: ["N", "N"], iy: ["IY", "I/Y"], pv: ["PV", "PV"], pmt: ["PMT", "PMT"], fv: ["FV", "FV"] };
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, pow: 3, root: 3, ncr: 4, npr: 4 };
  const DIGITS = "0123456789";
  const PLAIN = ["RST", "BOND", "DEPR"];      // labels shown without "="

  function create(saved) {
    let st = load(saved);
    const U = () => st.ui;

    // ---- helpers ----
    const value = () => { const u = U(); return u.entry !== null ? chk(parseFloat(u.entry)) : u.x; };
    const vars = () => wsVars(st, U().mode);
    const curVar = () => { const v = vars(), u = U(); if (!v.length) return null; u.idx = Math.max(0, Math.min(u.idx, v.length - 1)); return v[u.idx]; };
    function settle(x, label, computed) {          // show a value: no typing in progress, no pending operator
      const u = U();
      u.x = chk(x); u.entry = null; u.text = null; u.lastOp = false; u.computed = !!computed;
      if (label !== undefined) u.label = label;
    }
    function showVar(computed) {
      const u = U(), vr = curVar();
      u.entry = null; u.lastOp = false; u.computed = !!computed;
      if (!vr) return;
      if (vr.text) { u.label = vr.text(st); u.text = vr.sample ? vr.sample(st) : ""; u.x = 0; return; }
      u.label = vr.label;
      if (vr.date) { u.text = fmtDate(st.date[vr.date], st.fmt); u.x = 0; return; }
      u.text = null; u.x = chk(vr.get(st));
    }
    function leaveWs() { const u = U(); u.mode = null; u.idx = 0; u.text = null; }
    function clearCalc() { const u = U(); u.frames = [frame()]; u.lastOp = false; }
    function openWs(id) {
      const u = U();
      clearCalc(); u.cpt = false; u.mode = id; u.idx = 0; showVar();
    }

    // ---- arithmetic ----
    function apply(a, op, b) {
      switch (op) {
        case "+": return clean(a + b);
        case "-": return clean(a - b);
        case "*": return clean(a * b);
        case "/": if (b === 0) fail(2); return clean(a / b);
        case "pow": if ((a < 0 && b !== Math.floor(b)) || (a === 0 && b < 0)) fail(2); return clean(Math.pow(a, b));
        case "root": { if (b === 0) fail(2); const e = 1 / b; if ((a < 0 && Math.abs(b % 2) !== 1) || (a === 0 && e < 0)) fail(2); return clean(a < 0 ? -Math.pow(-a, e) : Math.pow(a, e)); }
        case "ncr": return chk(comb(a, b));
        case "npr": return chk(perm(a, b));
      }
      return b;
    }
    function reduce(f, p) {
      while (f.ops.length && (!st.fmt.aos || PREC[f.ops[f.ops.length - 1]] >= p)) {
        const b = f.vals.pop(), a = f.vals.pop(), op = f.ops.pop();
        f.vals.push(apply(a, op, b));
      }
    }
    const pending = () => U().frames.reduce((t, f) => t + f.ops.length, 0);
    function binary(op) {
      const u = U(), f = u.frames[u.frames.length - 1];
      if (u.lastOp && f.ops.length) { f.ops[f.ops.length - 1] = op; return; }
      f.vals.push(value());
      reduce(f, PREC[op]);
      if (pending() >= 15) fail(3);
      f.ops.push(op);
      const keep = u.mode ? u.label : null;
      settle(f.vals[f.vals.length - 1], keep);
      u.lastOp = true;
    }
    function closeFrame(cur) { const f = U().frames.pop(); f.vals.push(cur); reduce(f, -1); while (f.ops.length) reduce(f, -1); return f.vals[f.vals.length - 1]; }
    function equals() {
      const u = U();
      let cur = value();
      while (u.frames.length) cur = closeFrame(cur);
      u.frames = [frame()];
      st.ans = cur;
      settle(cur, u.mode ? u.label : null);
    }
    function openParen() { const u = U(); if (u.frames.length >= 9) fail(3); u.frames.push(frame()); u.entry = null; u.lastOp = false; }
    function closeParen() { const u = U(); if (u.frames.length < 2) return; const r = closeFrame(value()); settle(r, u.mode ? u.label : null); }
    function percent() {
      const u = U(), f = u.frames[u.frames.length - 1], v = value(), top = f.ops[f.ops.length - 1];
      const r = !u.lastOp && (top === "+" || top === "-") ? f.vals[f.vals.length - 1] * v / 100 : v / 100;
      settle(clean(r), u.mode ? u.label : null);
    }
    function unary(fn) {
      const u = U(), v = value(), toRad = x => st.fmt.rad ? x : x * Math.PI / 180, fromRad = x => st.fmt.rad ? x : x * 180 / Math.PI;
      let r;
      const inv = u.inv, hyp = u.hyp;
      u.inv = false; u.hyp = false;
      switch (fn) {
        case "sq": r = inv ? (v < 0 ? fail(2) : Math.sqrt(v)) : v * v; break;
        case "sqrt": if (v < 0) fail(2); r = Math.sqrt(v); break;
        case "recip": if (v === 0) fail(2); r = 1 / v; break;
        case "ln": if (inv) r = Math.exp(v); else { if (v <= 0) fail(2); r = Math.log(v); } break;
        case "exp": r = Math.exp(v); break;
        case "fact": intArg(v, 69); r = factorial(v); break;
        case "sin": case "cos": case "tan": {
          if (hyp) {
            if (!inv) r = Math[fn + "h"](v);
            else if (fn === "sin") r = Math.asinh(v);
            else if (fn === "cos") { if (v < 1) fail(2); r = Math.acosh(v); }
            else { if (Math.abs(v) >= 1) fail(2); r = Math.atanh(v); }
          } else if (inv) {
            if (fn !== "tan" && Math.abs(v) > 1) fail(2);
            r = fromRad(Math["a" + fn](v));
          } else {
            if (fn === "tan" && Math.abs(Math.cos(toRad(v))) < 1e-15) fail(2);
            r = Math[fn](toRad(v));
            if (Math.abs(r) < 1e-13) r = 0;
          }
          break;
        }
      }
      settle(clean(r), u.mode ? u.label : null);
    }

    // ---- typing ----
    function digit(d) {
      const u = U();
      if (u.rst) return;
      if (u.entry === null) u.entry = d === "." ? "0." : d;
      else {
        if (d === "." && u.entry.includes(".")) return;
        if (d !== "." && u.entry.replace(/[^0-9]/g, "").length >= 10) return;
        u.entry = u.entry === "0" && d !== "." ? d : u.entry === "-0" && d !== "." ? "-" + d : u.entry + d;
      }
      if (!u.mode) u.label = null;
      u.text = null; u.computed = false; u.lastOp = false;
    }
    function negate() {
      const u = U();
      if (u.entry !== null) u.entry = u.entry[0] === "-" ? u.entry.slice(1) : "-" + u.entry;
      else { if (u.text !== null) return; u.x = chk(-u.x); u.computed = false; if (!u.mode) u.label = null; }
    }
    function backspace() { const u = U(); if (u.entry === null) return; u.entry = u.entry.slice(0, -1); if (u.entry === "" || u.entry === "-") u.entry = "0"; }
    function clearKey() {
      const u = U();
      u.cpt = false; u.sto = null; u.inv = false; u.hyp = false;
      if (u.rst) { u.rst = false; settle(0, null); return; }
      if (u.entry !== null) { u.entry = null; u.x = 0; u.text = null; u.computed = false; return; }
      clearCalc(); u.x = 0; u.text = null; u.computed = false;
      if (!u.mode) u.label = null;
    }

    // ---- TVM ----
    function tvmKey(k) {
      const u = U(), [field, label] = TVM[k];
      if (u.mode) leaveWs();
      if (u.cpt) {
        u.cpt = false; clearCalc();
        const r = solveTvm(field, st.tvm);
        st.tvm[field] = r; st.ans = r;
        settle(r, label, true);
        return;
      }
      const v = value();
      st.tvm[field] = v; clearCalc();
      settle(v, label);
    }

    // ---- worksheet keys ----
    function enter() {
      const u = U();
      if (u.rst) { st = Object.assign(defaults(), { ui: freshUi() }); st.ui.label = "RST"; return; }
      const vr = u.mode && curVar();
      if (!vr || vr.text) return;
      if (vr.date) {
        if (u.entry === null) { showVar(); return; }
        st.date[vr.date] = parseDate(value(), st.fmt);
        showVar(); return;
      }
      if (!vr.set) { showVar(u.computed); return; }
      if (pending()) equals();                      // 100 ÷ 12 ENTER stores the result
      const v = value();
      vr.set(st, v);
      clearCalc();
      showVar();
    }
    function move(d) {
      const u = U();
      if (!u.mode) return;
      const n = vars().length;
      clearCalc(); u.cpt = false;
      u.idx = ((u.idx + d) % n + n) % n;
      showVar();
    }
    function setKey() { const vr = U().mode && curVar(); if (!vr || !vr.toggle) return; vr.toggle(st); showVar(); }
    function delIns(ins) {
      const u = U();
      if (u.mode !== "CF" && u.mode !== "DATA") return;
      const vr = curVar();
      if (!vr || vr.row === undefined) return;
      const cf = u.mode === "CF", arr = cf ? st.cf.list : st.data;
      if (ins) {
        if (arr.length >= (cf ? 24 : 50)) fail(4);
        arr.splice(vr.row, 0, cf ? { c: 0, f: 1 } : { x: 0, y: 1 });
      } else {
        if (vr.fresh) return;
        arr.splice(vr.row, 1);
      }
      u.idx = cf ? 1 + 2 * vr.row : 2 * vr.row;
      showVar();
    }
    function compute() {
      const u = U();
      if (u.mode) {
        const vr = curVar();
        if (vr && vr.cpt) { clearCalc(); vr.cpt(st); showVar(true); if (!vr.date && vr.get) st.ans = vr.get(st); return; }
      }
      u.cpt = true;
    }
    function memKey(s, n) {
      const u = U();
      if (s.kind === "RCL") { settle(st.mem[n], u.mode ? u.label : null); return; }
      const v = value();
      st.mem[n] = s.op ? apply(st.mem[n], s.op, v) : v;
      settle(v, u.mode ? u.label : null);
    }

    // ---- 2nd functions ----
    function second(key) {
      const u = U();
      switch (key) {
        case "cpt": clearCalc(); leaveWs(); u.cpt = false; settle(0, null); return;           // QUIT
        case "enter": return setKey();                                                     // SET
        case "up": return delIns(false);                                                   // DEL
        case "down": return delIns(true);                                                  // INS
        case "n": settle(clean(value() * st.tvm.PY), u.mode ? u.label : null); return;     // xP/Y
        case "iy": return openWs("PY");
        case "pv": return openWs("AMORT");
        case "pmt": return openWs("BGN");
        case "fv": Object.assign(st.tvm, { N: 0, IY: 0, PV: 0, PMT: 0, FV: 0 }); leaveWs(); clearCalc(); u.cpt = false; settle(0, null); return;   // CLR TVM
        case "inv": u.hyp = !u.hyp; return;                                                // HYP
        case "(": return unary("sin");
        case ")": return unary("cos");
        case "pow": return unary("tan");
        case "*": return unary("fact");                                                    // x!
        case "-": return binary("npr");
        case "+": return binary("ncr");
        case "ln": return unary("exp");                                                    // eˣ
        case "sto": settle(clean(Math.random()), u.mode ? u.label : null); return;          // RAND
        case "rcl": { const d = st.fmt.dec; settle(d === 9 ? value() : roundDec(value(), d), u.mode ? u.label : null); return; }   // ROUND
        case "7": return openWs("DATA");
        case "8": return openWs("STAT");
        case "9": case "4": clearCalc(); leaveWs(); u.cpt = false; settle(0, key === "9" ? "BOND" : "DEPR"); u.text = "n/a"; return;
        case "5": return openWs("PCT");
        case "6": return openWs("BRKEVN");
        case "1": return openWs("DATE");
        case "2": return openWs("ICONV");
        case "3": return openWs("PROFIT");
        case "0": return openWs("MEM");
        case ".": return openWs("FORMAT");
        case "neg": clearCalc(); u.cpt = false; u.rst = true; return;                       // RESET?
        case "ce": if (u.mode) { clearWork(st, u.mode); clearCalc(); u.idx = 0; showVar(); } else clearKey(); return;   // CLR WORK
        case "=": settle(st.ans, u.mode ? u.label : null); return;                         // ANS
      }
      return primary(key);
    }

    function primary(key) {
      const u = U();
      if (DIGITS.includes(key) || key === ".") return digit(key);
      switch (key) {
        case "neg": return negate();
        case "back": return backspace();
        case "ce": return clearKey();
        case "+": case "-": case "*": case "/": return binary(key);
        case "pow": return binary(u.inv ? (u.inv = false, "root") : "pow");
        case "=": return equals();
        case "(": return openParen();
        case ")": return closeParen();
        case "pct": return percent();
        case "sqrt": case "sq": case "recip": case "ln": return unary(key);
        case "inv": u.inv = !u.inv; return;
        case "sto": u.sto = { kind: "STO", op: null }; return;
        case "rcl": u.sto = { kind: "RCL", op: null }; return;
        case "cpt": return compute();
        case "enter": return enter();
        case "up": return move(-1);
        case "down": return move(1);
        case "n": case "iy": case "pv": case "pmt": case "fv": return tvmKey(key);
        case "cf": return openWs("CF");
        case "npv": return openWs("NPV");
        case "irr": return openWs("IRR");
      }
    }

    function press(key) {
      const u = U();
      try {
        if (key === "on") { st.ui = freshUi(); return; }          // off and on: display and pending work clear, memory stays
        if (u.err) { if (key === "ce") { u.err = 0; clearCalc(); settle(0, u.mode ? u.label : null); } return; }
        if (u.rst && key !== "enter" && key !== "ce") return;
        if (key === "2nd") { u.second = !u.second; return; }
        const sec = u.second;
        u.second = false;
        if (u.sto && !sec) {                         // STO n, STO + n, RCL n, RCL <TVM key>
          const s = u.sto;
          if (DIGITS.includes(key)) { u.sto = null; return memKey(s, Number(key)); }
          if (s.kind === "STO" && !s.op && ["+", "-", "*", "/", "pow"].includes(key)) { s.op = key; return; }
          if (s.kind === "RCL" && TVM[key]) { u.sto = null; if (u.mode) leaveWs(); return settle(st.tvm[TVM[key][0]], TVM[key][1]); }
          u.sto = null;
        } else if (sec) u.sto = null;
        if (sec) return second(key);
        return primary(key);
      } catch (e) {
        if (!(e instanceof CalcError)) throw e;
        Object.assign(U(), { err: e.code, entry: null, frames: [frame()], lastOp: false, cpt: false, sto: null, inv: false, hyp: false });
      }
    }

    function display() {
      const u = U(), vr = u.mode ? curVar() : null, many = u.mode && vars().length > 1;
      const ind = {
        second: u.second, inv: u.inv, hyp: u.hyp, compute: u.cpt,
        enter: !!(u.rst || (vr && (vr.set || vr.date))), set: !!(vr && vr.toggle),
        del: !!(vr && vr.row !== undefined && !vr.fresh), ins: !!(vr && vr.row !== undefined),
        bgn: st.tvm.bgn, rad: st.fmt.rad, up: !!many, down: !!many
      };
      if (u.err) return { label: "", value: `Error ${u.err}`, err: u.err, errText: ERRORS[u.err], computed: false, ind };
      if (u.rst) return { label: "RST?", value: "", computed: false, ind };
      if (u.entry !== null) return { label: u.label ? `${u.label}=` : "", value: localize(u.entry, st.fmt), computed: false, ind };
      if (u.text !== null) return { label: u.label ? ((vr && vr.text) || PLAIN.includes(u.label) ? u.label : `${u.label}=`) : "", value: u.text, computed: u.computed, ind };
      const int = !!(vr && vr.int && u.label === vr.label);
      return { label: u.label ? (PLAIN.includes(u.label) ? u.label : `${u.label}=`) : "", value: fmtNum(u.x, st.fmt, int), computed: u.computed, ind };
    }

    return {
      press, display,
      state: () => st,
      save: () => JSON.parse(JSON.stringify(st)),
      // what the side panel shows: the stored values, in the calculator's own format
      registers: () => ({
        tvm: st.tvm, cf: st.cf, mem: st.mem, data: st.data, fmt: st.fmt, ans: st.ans, mode: U().mode,
        f: v => fmtNum(v, st.fmt)
      })
    };
  }

  // "2nd fv 10 n 5 iy" → ["2nd", "fv", "1", "0", "n", "5", "iy"]: numbers are typed digit by digit
  const keys = str => String(str).trim().split(/\s+/).filter(Boolean).flatMap(t => /^[0-9.]+$/.test(t) && t.length > 1 ? [...t] : [t]);

  return { create, defaults, keys, LAYOUT, KEY, ERRORS, fmtNum, roundDec, solveTvm, npv: (cf, I) => npv(cf, I), irr, amortize, stats, parseDate, dbd };
});

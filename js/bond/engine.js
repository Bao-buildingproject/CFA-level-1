// ============================================================
// bond/engine.js — Bond Empire: the fixed income calculation engine
//
// Pure functions, no DOM and no storage: the same file runs in the browser
// (window.BondEngine) and in the Node tests. Covers the calculations of the
// CFA Level I Fixed Income modules: cash flow schedules, pricing from a yield
// and from a spot curve, accrued interest and clean/dirty prices, YTM, current
// yield, spreads, spot/forward/par curves, duration, convexity, PVBP, key rate
// durations, money market instruments, repos, floating rate notes, credit loss
// and recovery, ABS/MBS cash flows and bond auctions.
//
// Conventions (documented in docs/bond-empire.md):
//  · prices are per 100 of par; rates are decimals (0.05 = 5%)
//  · a yield is quoted with the bond's coupon frequency (street convention)
//  · between coupon dates the full price is PV × (1 + y/m)^(t/T)
//  · regular coupon periods counted back from maturity (no odd first coupon)
//  · money amounts in đồng are rounded once, where cash changes hands (book.js)
// ============================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BondEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Dates ----------
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, "0");
  const ser = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const str = n => new Date(n * DAY).toISOString().slice(0, 10);
  const ymd = s => s.split("-").map(Number);
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  function addMonths(s, k) {
    let [y, m, d] = ymd(s);
    const t = y * 12 + (m - 1) + k;
    y = Math.floor(t / 12); m = t - y * 12 + 1;
    return `${y}-${pad(m)}-${pad(Math.min(d, dim(y, m)))}`;
  }
  const addDays = (s, k) => str(ser(s) + k);
  const daysBetween = (a, b) => ser(b) - ser(a);
  function isBusinessDay(s, hol) { const w = new Date(ser(s) * DAY).getUTCDay(); return w !== 0 && w !== 6 && !(hol && hol.has(s)); }
  // Business day conventions for payment dates: following, modified following, preceding
  function adjust(s, rule, hol) {
    if (!rule || rule === "none") return s;
    let d = s;
    if (rule === "preceding") { while (!isBusinessDay(d, hol)) d = addDays(d, -1); return d; }
    while (!isBusinessDay(d, hol)) d = addDays(d, 1);
    if (rule === "modfollowing" && d.slice(0, 7) !== s.slice(0, 7)) { d = s; while (!isBusinessDay(d, hol)) d = addDays(d, -1); }
    return d;
  }
  // 30/360 (US bond basis): day 31 → 30; the end date's 31 → 30 when the start is the 30th or 31st
  function days30(a, b) {
    let [y1, m1, d1] = ymd(a), [y2, m2, d2] = ymd(b);
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 >= 30) d2 = 30;
    return 360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1);
  }

  // ---------- Bonds ----------
  // bond: { id, coupon, freq (1|2|4|12), issue, maturity, dayCount ("ACT/ACT"|"30/360"|"ACT/365"), bdc, frn: { margin }, kind }
  function check(b) {
    if (!b || !b.maturity || !b.issue || !(b.freq > 0) || 12 % b.freq) throw new Error("Trái phiếu thiếu điều khoản hoặc tần suất trả lãi không hợp lệ");
  }
  function couponRate(b, opt) {
    if (b.frn) return Math.max(0, ((opt && opt.index != null) ? opt.index : (b.frn.index || 0)) + b.frn.margin);
    return b.coupon || 0;
  }
  // Coupon dates, counted back from maturity in whole periods
  function schedule(b) {
    check(b);
    const step = 12 / b.freq, dates = [];
    let k = 0, d = b.maturity;
    while (d > b.issue) { dates.unshift(d); k += 1; d = addMonths(b.maturity, -step * k); }
    return { dates, start: d };
  }
  function period(b, settle) {
    const s = schedule(b), i = s.dates.findIndex(x => x > settle);
    if (i < 0 || settle < b.issue) return null;
    return { last: i ? s.dates[i - 1] : s.start, next: s.dates[i], n: s.dates.length - i, dates: s.dates.slice(i) };
  }
  // Share of the current coupon period elapsed at settlement: one for accrued interest, one for discounting
  function fractions(b, last, next, settle) {
    if (b.dayCount === "30/360") { const f = days30(last, settle) / days30(last, next); return { ai: f, px: f }; }
    const px = daysBetween(last, settle) / daysBetween(last, next);
    if (b.dayCount === "ACT/365") return { ai: daysBetween(last, settle) * b.freq / 365, px };
    return { ai: px, px };
  }
  // Future cash flows per 100 of par (unadjusted accrual date, adjusted payment date)
  function cashflows(b, settle, opt) {
    const p = period(b, settle);
    if (!p) return [];
    const c = couponRate(b, opt) / b.freq * 100;
    return p.dates.map((d, j) => {
      const last = j === p.dates.length - 1;
      return { k: j + 1, date: d, pay: adjust(d, b.bdc || "following", opt && opt.holidays), coupon: c, principal: last ? 100 : 0, amount: c + (last ? 100 : 0) };
    });
  }
  function accrued(b, settle, opt) {
    const p = period(b, settle);
    if (!p) return 0;
    return couponRate(b, opt) / b.freq * 100 * fractions(b, p.last, p.next, settle).ai;
  }
  // Price from a yield-to-maturity (periodic, at the coupon frequency)
  function priceFromYield(b, settle, y, opt) {
    const p = period(b, settle);
    if (!p) return null;
    const m = b.freq, f = fractions(b, p.last, p.next, settle), w = 1 - f.px, c = couponRate(b, opt) / m * 100;
    let full = 0;
    for (let k = 1; k <= p.n; k++) full += (c + (k === p.n ? 100 : 0)) / Math.pow(1 + y / m, k - 1 + w);
    const ai = c * f.ai;
    return { full, ai, clean: full - ai, f: f.px, n: p.n, last: p.last, next: p.next };
  }
  // Yield-to-maturity from a full (dirty) price: Newton's method, bisection when Newton leaves the bracket
  function ytm(b, settle, full, opt) {
    const g = y => priceFromYield(b, settle, y, opt).full - full;
    if (!period(b, settle) || !(full > 0)) return null;
    const lo = -0.9 * b.freq, hi = 5;
    let y = couponRate(b, opt) || 0.05;
    for (let i = 0; i < 60; i++) {
      const v = g(y);
      if (Math.abs(v) < 1e-11) return y;
      const d = (g(y + 1e-7) - g(y - 1e-7)) / 2e-7;
      const ny = y - v / d;
      if (!isFinite(ny) || ny <= lo || ny >= hi) break;
      if (Math.abs(ny - y) < 1e-13) return ny;
      y = ny;
    }
    let a = lo + 1e-9, z = hi;
    if (g(a) * g(z) > 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (a + z) / 2; if (g(mid) > 0) a = mid; else z = mid; }
    return (a + z) / 2;
  }
  const currentYield = (b, clean, opt) => couponRate(b, opt) * 100 / clean;
  // Yield on another compounding basis: same annual effective yield
  const convertYield = (y, from, to) => to * (Math.pow(1 + y / from, from / to) - 1);

  // ---------- Duration, convexity, PVBP (yield based) ----------
  function yieldRisk(b, settle, y, opt) {
    const p = priceFromYield(b, settle, y, opt);
    if (!p) return null;
    const m = b.freq, w = 1 - p.f, c = couponRate(b, opt) / m * 100;
    let mac = 0, cvx = 0;
    for (let k = 1; k <= p.n; k++) {
      const t = (k - 1 + w) / m, pv = (c + (k === p.n ? 100 : 0)) / Math.pow(1 + y / m, k - 1 + w);
      mac += t * pv; cvx += t * (t + 1 / m) * pv;
    }
    mac /= p.full;
    cvx /= p.full * Math.pow(1 + y / m, 2);
    const mod = mac / (1 + y / m), dy = 1e-4;
    const up = priceFromYield(b, settle, y + dy, opt).full, dn = priceFromYield(b, settle, y - dy, opt).full;
    return { full: p.full, clean: p.clean, ai: p.ai, mac, mod, approxMod: (dn - up) / (2 * dy * p.full), cvx,
      approxCvx: (dn + up - 2 * p.full) / (dy * dy * p.full), pvbp: (dn - up) / 2, money: mod * p.full };
  }
  // Estimated and actual price change for a yield change dy (decimal)
  function shock(b, settle, y, dy, opt) {
    const r = yieldRisk(b, settle, y, opt), after = priceFromYield(b, settle, y + dy, opt).full;
    const durOnly = -r.mod * dy, withCvx = durOnly + 0.5 * r.cvx * dy * dy, actual = after / r.full - 1;
    return { before: r.full, after, durOnly, withCvx, actual, error: withCvx - actual };
  }

  // ---------- Curves ----------
  // curve: { tenors: [1, 3, 5, 10, 20], par: [decimals] } — annual-pay par yields at key tenors
  function parAt(curve, T) {
    const t = curve.tenors, p = curve.par;
    if (T <= t[0]) return p[0];
    if (T >= t[t.length - 1]) return p[p.length - 1];
    let i = 1; while (t[i] < T) i++;
    return p[i - 1] + (p[i] - p[i - 1]) * (T - t[i - 1]) / (t[i] - t[i - 1]);
  }
  // Bootstrapping: annual par yields (interpolated) → discount factors and spot rates, year by year
  function bootstrap(curve, years) {
    const N = years || 30, df = [1], z = [null], par = [null];
    let sum = 0;
    for (let k = 1; k <= N; k++) {
      const pk = parAt(curve, k);
      const d = (1 - pk * sum) / (1 + pk);
      df.push(d); sum += d; par.push(pk);
      z.push(Math.pow(d, -1 / k) - 1);
    }
    return { df, z, par, N, curve };
  }
  function spotAt(boot, t) {
    if (t <= 1) return boot.z[1];
    if (t >= boot.N) return boot.z[boot.N];
    const i = Math.floor(t), f = t - i;
    return boot.z[i] + (boot.z[i + 1] - boot.z[i]) * f;
  }
  const discount = (boot, t, s) => Math.pow(1 + spotAt(boot, t) + (s || 0), -t);
  const forward = (boot, a, b) => Math.pow(Math.pow(1 + spotAt(boot, b), b) / (a > 0 ? Math.pow(1 + spotAt(boot, a), a) : 1), 1 / (b - a)) - 1;
  function parFromSpots(boot, k) { let s = 0; for (let j = 1; j <= k; j++) s += boot.df[j]; return (1 - boot.df[k]) / s; }
  // Textbook bootstrapping at any periodic frequency: par rates for periods 1..n → spot rates (periodic, annualized)
  function bootstrapPeriodic(parRates, m) {
    const df = [], z = [];
    let sum = 0;
    parRates.forEach((p, i) => {
      const c = p / m, d = (1 - c * sum) / (1 + c);
      df.push(d); sum += d; z.push(m * (Math.pow(d, -1 / (i + 1)) - 1));
    });
    return { df, z };
  }
  // Price on the spot curve with a constant spread over every spot rate (Z-spread)
  function priceOnCurve(b, settle, boot, z, opt) {
    const fl = cashflows(b, settle, opt);
    if (!fl.length) return null;
    let full = 0;
    for (const c of fl) full += c.amount * discount(boot, daysBetween(settle, c.date) / 365, z);
    const ai = accrued(b, settle, opt);
    return { full, ai, clean: full - ai };
  }
  function zSpread(b, settle, boot, full, opt) {
    let a = -0.05, z = 1.5;
    const g = s => priceOnCurve(b, settle, boot, s, opt).full - full;
    if (g(a) * g(z) > 0) return null;
    for (let i = 0; i < 120; i++) { const mid = (a + z) / 2; if (g(mid) > 0) a = mid; else z = mid; }
    return (a + z) / 2;
  }
  const gSpread = (y, curve, T) => y - parAt(curve, T);
  function shiftCurve(curve, dy, node) {
    return { tenors: curve.tenors.slice(), par: curve.par.map((p, i) => node == null || node === i ? p + dy : p) };
  }
  // Effective duration and convexity: reprice on the shifted benchmark curve, spread held constant
  function curveRisk(b, settle, curve, z, opt, dy) {
    dy = dy || 1e-4;
    const p0 = priceOnCurve(b, settle, bootstrap(curve), z, opt).full;
    const up = priceOnCurve(b, settle, bootstrap(shiftCurve(curve, dy)), z, opt).full;
    const dn = priceOnCurve(b, settle, bootstrap(shiftCurve(curve, -dy)), z, opt).full;
    const krd = curve.tenors.map((_, i) => {
      const u = priceOnCurve(b, settle, bootstrap(shiftCurve(curve, dy, i)), z, opt).full;
      const d = priceOnCurve(b, settle, bootstrap(shiftCurve(curve, -dy, i)), z, opt).full;
      return (d - u) / (2 * dy * p0);
    });
    return { full: p0, effDur: (dn - up) / (2 * dy * p0), effCvx: (dn + up - 2 * p0) / (dy * dy * p0), krd };
  }

  // ---------- Money market, repo, floating rate notes ----------
  const mm = {
    pvDiscountBasis: (fv, days, dr, year) => fv * (1 - days / (year || 360) * dr),
    pvAddOn: (fv, days, aor, year) => fv / (1 + days / (year || 365) * aor),
    discountFromPrice: (pv, fv, days, year) => (year || 360) / days * (fv - pv) / fv,
    addOnFromPrice: (pv, fv, days, year) => (year || 365) / days * (fv - pv) / pv,
    // bond equivalent yield: add-on rate on a 365-day year
    bey: (pv, fv, days) => 365 / days * (fv - pv) / pv
  };
  // Repurchase agreement: cash lent against collateral after the haircut, repaid with repo interest
  function repo(collateralValue, haircut, rate, days, year) {
    const cash = collateralValue * (1 - haircut), interest = cash * rate * days / (year || 360);
    return { cash, interest, repurchase: cash + interest, margin: collateralValue - cash };
  }
  // FRN between reset dates: quoted margin paid, discount margin required (flat reference rate assumed)
  function frnPrice(index, qm, dm, m, n) {
    const c = (index + qm) / m * 100, r = (index + dm) / m;
    let pv = 0;
    for (let k = 1; k <= n; k++) pv += (c + (k === n ? 100 : 0)) / Math.pow(1 + r, k);
    return pv;
  }

  // ---------- Credit ----------
  const expectedLoss = (exposure, pd, rr) => exposure * pd * (1 - rr);
  const spreadApprox = (pd, rr) => pd * (1 - rr);                         // credit spread ≈ probability of default × loss severity
  const cumulativePD = (hazard, years) => 1 - Math.pow(1 - hazard, years);
  function ratios(x) {
    return { debtToEbitda: x.debt / x.ebitda, netDebtToEbitda: (x.debt - (x.cash || 0)) / x.ebitda, coverage: x.ebitda / x.interest,
      ffoToDebt: x.ffo != null ? x.ffo / x.debt : null, debtToCapital: x.equity != null ? x.debt / (x.debt + x.equity) : null };
  }
  // Recovery by priority of claims. Secured claims take their collateral first; any shortfall joins the
  // senior unsecured claims (pari passu); the rest of the estate pays senior, then subordinated, then equity.
  function recoveryWaterfall(estate, collateral, claims) {
    const out = claims.map(c => ({ ...c, recovered: 0 }));
    let pool = estate;
    const deficiency = [];
    for (const c of out.filter(c => c.rank === "secured")) {
      const take = Math.min(c.amount, collateral, pool);
      c.recovered += take; pool -= take; collateral -= take;
      if (c.amount > take) deficiency.push({ c, left: c.amount - take });
    }
    for (const rank of ["senior", "sub", "equity"]) {
      const group = out.filter(c => c.rank === rank).map(c => ({ c, left: c.amount }));
      if (rank === "senior") group.push(...deficiency);
      const total = group.reduce((n, g) => n + g.left, 0);
      if (!total) continue;
      const pay = Math.min(pool, total);
      for (const g of group) g.c.recovered += pay * g.left / total;
      pool -= pay;
    }
    out.forEach(c => { c.rate = c.amount ? c.recovered / c.amount : 0; });
    return { claims: out, leftover: pool };
  }

  // ---------- Securitization ----------
  const smmFromCpr = cpr => 1 - Math.pow(1 - cpr, 1 / 12);
  const psaCpr = (month, psa) => Math.min(0.06, 0.002 * month) * psa / 100;
  // Pool of level-pay loans with defaults (CDR), prepayments (CPR or PSA) and recoveries, then a sequential
  // waterfall: fees → note interest by seniority → principal to the most senior note first → residual to equity.
  // Losses reduce the pool; any shortfall of collateral below the notes writes notes down from the bottom.
  function absWaterfall(o) {
    const P = o.pool, tr = o.tranches.map(t => ({ ...t, bal: t.size, interest: 0, principal: 0, writedown: 0, shortfall: 0, wal: 0 }));
    let bal = P.balance, month = 0, equityCash = 0, totalLoss = 0, totalDefault = 0, totalPrepay = 0;
    const rows = [], r = P.wac / 12, mdr = smmFromCpr(P.cdr || 0);
    while (bal > 0.5 && month < P.term) {
      month += 1;
      const left = P.term - month + 1;
      const def = bal * mdr, perf = bal - def;
      const pmt = r ? perf * r / (1 - Math.pow(1 + r, -left)) : perf / left;
      const intC = perf * r, sched = Math.min(perf, pmt - intC);
      const cpr = P.psa != null ? psaCpr(month + (P.age || 0), P.psa) : (P.cpr || 0);
      const prep = (perf - sched) * smmFromCpr(cpr);
      const rec = def * (P.recovery || 0), loss = def - rec;
      bal = perf - sched - prep;
      totalLoss += loss; totalDefault += def; totalPrepay += prep;
      let avail = intC - (P.fee || 0) / 12 * (bal + sched + prep);
      for (const t of tr) { const due = t.bal * t.coupon / 12, pay = Math.max(0, Math.min(avail, due)); t.interest += pay; t.shortfall += due - pay; avail -= pay; }
      let prin = sched + prep + rec;
      // excess interest first covers this month's losses (turbo), the rest goes to the residual holder
      const turbo = Math.max(0, Math.min(avail, loss)); prin += turbo; avail -= turbo;
      equityCash += Math.max(0, avail);
      for (const t of tr) { const pay = Math.min(prin, t.bal); t.bal -= pay; t.principal += pay; t.wal += pay * month / 12; prin -= pay; }
      equityCash += prin;
      let gap = tr.reduce((n, t) => n + t.bal, 0) - bal;
      for (let i = tr.length - 1; i >= 0 && gap > 1e-9; i--) { const w = Math.min(gap, tr[i].bal); tr[i].bal -= w; tr[i].writedown += w; gap -= w; }
      rows.push({ month, pool: bal, interest: intC, scheduled: sched, prepay: prep, default: def, loss, notes: tr.map(t => t.bal) });
    }
    tr.forEach(t => { t.wal = t.principal ? t.wal / t.principal : null; t.lossPct = t.size ? t.writedown / t.size : 0; });
    return { tranches: tr, rows, months: month, equityCash, totalLoss, totalDefault, totalPrepay, oc: P.balance - o.tranches.reduce((n, t) => n + t.size, 0) };
  }
  // Mortgage pass-through: scheduled principal, prepayments and interest to investors; weighted average life
  function passThrough(o) {
    const r = o.wac / 12, pr = o.rate / 12;
    let bal = o.balance, wal = 0, prinTotal = 0;
    const rows = [];
    for (let m = 1; m <= o.term && bal > 0.5; m++) {
      const left = o.term - m + 1, pmt = bal * r / (1 - Math.pow(1 + r, -left)), sched = pmt - bal * r;
      const cpr = o.psa != null ? psaCpr(m + (o.age || 0), o.psa) : (o.cpr || 0), prep = (bal - sched) * smmFromCpr(cpr);
      const interest = bal * pr, prin = sched + prep;
      wal += prin * m / 12; prinTotal += prin;
      rows.push({ m, bal, sched, prep, interest, cpr });
      bal -= prin;
    }
    return { rows, wal: wal / prinTotal, months: rows.length };
  }

  // Sequential-pay CMO: the pass-through's principal goes to tranche A until it is retired, then B, then C
  function cmoSequential(pt, sizes) {
    const bal = sizes.slice(), wal = sizes.map(() => 0), paid = sizes.map(() => 0), first = sizes.map(() => null), last = sizes.map(() => null);
    for (const r of pt.rows) {
      let prin = r.sched + r.prep;
      for (let i = 0; i < bal.length && prin > 1e-9; i++) {
        const pay = Math.min(bal[i], prin);
        if (pay <= 0) continue;
        bal[i] -= pay; prin -= pay; paid[i] += pay; wal[i] += pay * r.m / 12;
        if (first[i] == null) first[i] = r.m; last[i] = r.m;
      }
    }
    return sizes.map((s, i) => ({ size: s, wal: paid[i] ? wal[i] / paid[i] : null, firstMonth: first[i], lastMonth: last[i] }));
  }

  // ---------- Primary market: bond auction ----------
  // Bids filled from the lowest yield up; bids at the stop-out yield share the rest pro rata.
  // Single-price (Dutch) auctions pay everyone the stop-out yield; multiple-price auctions pay each bid its own.
  function auction(o) {
    const bids = o.bids.filter(b => b.amount > 0 && (o.maxYield == null || b.yield <= o.maxYield)).sort((a, b) => a.yield - b.yield);
    const total = o.bids.reduce((n, b) => n + b.amount, 0);
    let left = o.offered, stop = null;
    const alloc = [];
    for (let i = 0; i < bids.length && left > 0;) {
      const y = bids[i].yield, same = bids.filter(b => b.yield === y), want = same.reduce((n, b) => n + b.amount, 0);
      const fill = Math.min(left, want);
      same.forEach(b => alloc.push({ id: b.id, yield: b.yield, bid: b.amount, filled: fill * b.amount / want }));
      left -= fill; stop = y; i += same.length;
    }
    alloc.forEach(a => { a.paidYield = o.format === "multiple" ? a.yield : stop; });
    return { stopOut: stop, sold: o.offered - left, unsold: left, alloc, bidToCover: total / o.offered };
  }

  return { ser, str, addMonths, addDays, daysBetween, adjust, isBusinessDay, days30, schedule, period, fractions, couponRate,
    cashflows, accrued, priceFromYield, ytm, currentYield, convertYield, yieldRisk, shock, parAt, bootstrap, spotAt, discount, forward,
    parFromSpots, bootstrapPeriodic, priceOnCurve, zSpread, gSpread, shiftCurve, curveRisk, mm, repo, frnPrice, expectedLoss,
    spreadApprox, cumulativePD, ratios, recoveryWaterfall, smmFromCpr, psaCpr, absWaterfall, passThrough, cmoSequential, auction };
});

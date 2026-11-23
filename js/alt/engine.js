// ============================================================
// alt/engine.js — Alternative Empire: the financial calculation engine
// Pure functions, no DOM. Money is integer US cents; a rate times money is computed
// exactly with BigInt (rates rounded to 1e-6) and rounded half away from zero, so
// the same inputs always give the same cents. Every calculator returns its inputs,
// the formula and the steps, so the screen can show how a number was reached.
// Formulas marked "curriculum" follow the forms used in the CFA Level I 2027
// Alternative Investments readings; those marked "game model" are this game's own
// conventions and are labelled as such on screen.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AltEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Money ----------
  const PPM = 1000000n;
  class AltError extends Error {}
  function need(cond, msg) { if (!cond) throw new AltError(msg); }
  const isCents = c => Number.isSafeInteger(c);
  function assertCents(c, name) { need(isCents(c), `${name || "Số tiền"} phải là số nguyên (cent)`); }
  function assertRate(r, name, lo, hi) {
    need(typeof r === "number" && isFinite(r), `${name || "Tỷ lệ"} không hợp lệ`);
    if (lo != null) need(r >= lo, `${name} phải ≥ ${lo}`);
    if (hi != null) need(r <= hi, `${name} phải ≤ ${hi}`);
  }
  const toPpm = r => BigInt(Math.round(r * 1e6));
  function divRound(n, d) {                       // BigInt n/d, half away from zero (d > 0)
    const q = n / d, r = n % d;
    if (r === 0n) return q;
    return (r < 0n ? -r : r) * 2n >= d ? q + (n < 0n ? -1n : 1n) : q;
  }
  // cents × rate, exact to the cent
  function mul(c, rate) { assertCents(c); assertRate(rate); return Number(divRound(BigInt(c) * toPpm(rate), PPM)); }
  // cents × a / b with integer a, b (b > 0)
  function mulDiv(c, a, b) { assertCents(c); need(b > 0, "Mẫu số phải dương"); return Number(divRound(BigInt(c) * BigInt(a), BigInt(b))); }
  const cents = usd => Math.round(usd * 100);
  const usd = c => c / 100;
  const M = usd => Math.round(usd * 1e8);           // $ million → cents
  const toM = c => c / 1e8;                          // cents → $ million
  const sum = a => a.reduce((s, x) => s + x, 0);
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const r6 = x => Math.round(x * 1e6) / 1e6;

  // ---------- Hedge fund style fees for one period (curriculum, LM2 eq. 4–9) ----------
  // P0, P1: fund value at the start and end of the period, before fees (cents).
  // mgmtBasis "end" charges rm × P1 (as in the curriculum examples), "begin" charges rm × P0.
  // perfBasis "independent": p × (P1 − reference); "net": p × (P1 − management fee − reference).
  // reference: P0, or the high-water mark when hwm is given (highest value net of fees).
  // hurdleType "hard": fee only above P0 × (1 + rh); "soft": once above the hurdle, the fee
  // applies to the whole gain above the reference (full catch-up).
  // Game convention when a hurdle and a high-water mark both apply: threshold = max(HWM, P0(1+rh)).
  // eitherOr: the manager takes the larger of the management fee and the performance fee.
  function hfFees(o) {
    const { P0, P1 } = o;
    assertCents(P0, "Giá trị đầu kỳ"); assertCents(P1, "Giá trị cuối kỳ");
    need(P0 > 0, "Giá trị đầu kỳ phải dương"); need(P1 >= 0, "Giá trị cuối kỳ không được âm");
    const rm = o.mgmtRate || 0, p = o.perfRate || 0, rh = o.hurdle || 0;
    assertRate(rm, "Phí quản lý", 0, 0.1); assertRate(p, "Phí hiệu suất", 0, 0.6); assertRate(rh, "Hurdle", 0, 1);
    const basis = o.mgmtBasis === "begin" ? "begin" : "end";
    const perfBasis = o.perfBasis === "net" ? "net" : "independent";
    const hType = o.hurdleType === "soft" ? "soft" : o.hurdleType === "hard" ? "hard" : "none";
    const hwm = o.hwm == null ? null : o.hwm;
    if (hwm != null) assertCents(hwm, "High-water mark");
    const steps = [];
    const mgmt = mul(basis === "end" ? P1 : P0, rm);
    steps.push({ k: "Phí quản lý", f: basis === "end" ? "P1 × rm" : "P0 × rm", v: mgmt });
    const feeable = perfBasis === "net" ? P1 - mgmt : P1;
    steps.push({ k: "Giá trị tính phí hiệu suất", f: perfBasis === "net" ? "P1 − phí quản lý" : "P1 (tính độc lập)", v: feeable });
    const ref = hwm != null ? Math.max(hwm, P0) : P0;
    steps.push({ k: hwm != null ? "Mốc tham chiếu (high-water mark)" : "Mốc tham chiếu (P0)", f: hwm != null ? "max(HWM, P0)" : "P0", v: ref });
    let threshold = ref;
    if (hType !== "none") {
      const hurdleLevel = P0 + mul(P0, rh);
      steps.push({ k: "Mức hurdle", f: "P0 × (1 + rh)", v: hurdleLevel });
      threshold = Math.max(ref, hurdleLevel);
    }
    let perf = 0;
    if (hType === "soft") perf = feeable > threshold ? mul(feeable - ref, p) : 0;
    else perf = mul(Math.max(0, feeable - threshold), p);
    steps.push({ k: "Phí hiệu suất", f: hType === "soft" ? "vượt hurdle ⇒ p × (giá trị − mốc tham chiếu)" : "p × max(0, giá trị − ngưỡng)", v: perf });
    let mgmtFee = mgmt, perfFee = perf;
    if (o.eitherOr) {
      if (perf >= mgmt) mgmtFee = 0; else perfFee = 0;
      steps.push({ k: "Either/or", f: "lấy khoản lớn hơn", v: mgmtFee + perfFee });
    }
    const fees = mgmtFee + perfFee, end = P1 - fees;
    const ret = (end - P0) / P0, gross = (P1 - P0) / P0;
    const hwmNext = hwm != null ? Math.max(ref, end) : null;
    steps.push({ k: "Giá trị của nhà đầu tư cuối kỳ", f: "P1 − tổng phí", v: end });
    return { mgmt: mgmtFee, perf: perfFee, fees, end, ret, gross, hwmNext, steps, terms: { basis, perfBasis, hType, rm, p, rh, hwm: hwm != null } };
  }
  // A run of periods for one investor (fees each period; the high-water mark carries over)
  function hfSeries(o) {
    need(Array.isArray(o.grossReturns) && o.grossReturns.length > 0, "Cần ít nhất một kỳ");
    let v = o.start, hwm = o.useHwm ? o.start : null;
    const rows = [];
    for (const g of o.grossReturns) {
      assertRate(g, "Lợi nhuận gộp", -1, 10);
      const P1 = v + mul(v, g);
      const r = hfFees(Object.assign({}, o, { P0: v, P1, hwm }));
      rows.push(Object.assign({ P0: v, P1, hwm }, r));
      v = r.end; hwm = r.hwmNext;
    }
    const cum = v / o.start - 1, gcum = o.grossReturns.reduce((a, g) => a * (1 + g), 1) - 1;
    return { rows, end: v, cumNet: cum, cumGross: gcum, fees: sum(rows.map(r => r.fees)) };
  }

  // ---------- GP rate of return (curriculum LM1 eq. 1–2) ----------
  // Hard hurdle, no catch-up: rGP = max[0, p(r − rh)].
  // With a full catch-up the LP takes everything up to rh, then the GP takes everything until it
  // holds p of the profit (rcu = p·rh/(1 − p)), then the split is p / (1 − p).
  function gpReturn({ r, rh, p, catchUp }) {
    assertRate(r, "r"); assertRate(rh, "rh", 0, 1); assertRate(p, "p", 0, 0.6);
    if (!catchUp) return { rGP: Math.max(0, p * (r - rh)), rcu: 0 };
    const rcu = p * rh / (1 - p);
    let rGP;
    if (r <= rh) rGP = 0;
    else if (r <= rh + rcu) rGP = r - rh;            // still inside the catch-up tier
    else rGP = rcu + p * (r - rh - rcu);              // curriculum eq. 2
    return { rGP, rcu, rLP: r - rGP };
  }

  // ---------- Distribution waterfall for one pool of capital (curriculum LM2) ----------
  // Tiers: return of capital → preferred return → GP catch-up → carried interest split.
  // prefMode "simple" accrues rh × years on capital (as in the curriculum's soft/hard hurdle
  // question); "compound" uses (1 + rh)^years − 1. catchUp: share of the catch-up tier paid to the
  // GP (1 = full catch-up, 0 = none, i.e. a hard hurdle). prefAmount overrides the computed pref.
  function waterfall(o) {
    const { capital, proceeds } = o;
    assertCents(capital, "Vốn góp"); assertCents(proceeds, "Tiền thu về");
    need(capital >= 0 && proceeds >= 0, "Vốn và tiền thu về không được âm");
    const carry = o.carry == null ? 0.2 : o.carry, rh = o.pref || 0, years = o.years || 0, cu = o.catchUp || 0;
    assertRate(carry, "Carried interest", 0, 0.5); assertRate(rh, "Preferred return", 0, 1); assertRate(cu, "Catch-up", 0, 1);
    need(cu === 0 || cu > carry, "Tỷ lệ catch-up phải lớn hơn carried interest (hoặc bằng 0)");
    let rem = proceeds, lp = 0, gp = 0;
    const tiers = [];
    const roc = Math.min(rem, capital); lp += roc; rem -= roc;
    tiers.push({ k: "Hoàn vốn cho LP", lp: roc, gp: 0 });
    let prefAmt = 0;
    if (o.prefAmount != null) { assertCents(o.prefAmount, "Preferred return"); prefAmt = o.prefAmount; }
    else if (rh > 0) prefAmt = o.prefMode === "compound" ? mul(capital, Math.pow(1 + rh, years) - 1) : mul(capital, rh * years);
    if (prefAmt > 0) {
      const pf = Math.min(rem, prefAmt); lp += pf; rem -= pf;
      tiers.push({ k: "Preferred return cho LP", lp: pf, gp: 0 });
      if (cu > 0 && pf === prefAmt && rem > 0) {
        const size = Number(divRound(BigInt(prefAmt) * toPpm(carry), toPpm(cu) - toPpm(carry)));  // GP reaches carry × (pref + tier) of profit
        const tier = Math.min(rem, size), toGp = mul(tier, cu);
        gp += toGp; lp += tier - toGp; rem -= tier;
        tiers.push({ k: "Catch-up cho GP", lp: tier - toGp, gp: toGp });
      }
    }
    if (rem > 0) {
      const g = mul(rem, carry); gp += g; lp += rem - g;
      tiers.push({ k: `Chia ${Math.round((1 - carry) * 100)}/${Math.round(carry * 100)}`, lp: rem - g, gp: g });
    }
    return { lp, gp, tiers, prefAmt, profit: proceeds - capital };
  }

  // ---------- Deal-by-deal (American) vs whole-of-fund (European), with clawback ----------
  // deals: [{ name, invested, proceeds, years }] (years held, for a pref). Under American terms the GP
  // takes carry on each profitable deal when it exits; at the end it is entitled only to the
  // whole-fund amount, and a clawback clause returns the excess to the LPs.
  function dealWaterfalls(deals, terms) {
    need(Array.isArray(deals) && deals.length > 0, "Cần ít nhất một thương vụ");
    const t = Object.assign({ carry: 0.2, pref: 0, catchUp: 0, prefMode: "simple", clawback: true }, terms || {});
    const per = deals.map(d => {
      assertCents(d.invested, "Vốn đầu tư"); assertCents(d.proceeds, "Tiền thu về");
      const w = waterfall({ capital: d.invested, proceeds: d.proceeds, carry: t.carry, pref: t.pref, years: d.years || 0, prefMode: t.prefMode, catchUp: t.catchUp });
      return { name: d.name, invested: d.invested, proceeds: d.proceeds, profit: d.proceeds - d.invested, gpAmerican: w.gp, prefAmt: w.prefAmt };
    });
    const invested = sum(per.map(x => x.invested)), proceeds = sum(per.map(x => x.proceeds));
    const euro = waterfall({ capital: invested, proceeds, carry: t.carry, catchUp: t.catchUp, prefAmount: sum(per.map(x => x.prefAmt)) });
    const gpPaid = sum(per.map(x => x.gpAmerican));
    const excess = Math.max(0, gpPaid - euro.gp);
    const clawback = t.clawback ? excess : 0;
    return { per, invested, proceeds, profit: proceeds - invested, european: { gp: euro.gp, lp: euro.lp, tiers: euro.tiers },
      american: { gpPaid, clawback, gpKept: gpPaid - clawback, lp: proceeds - (gpPaid - clawback), lost: excess - clawback } };
  }

  // ---------- NPV and IRR (all roots, or none) ----------
  function npv(rate, cfs, times) {
    need(rate > -1, "Lãi suất chiết khấu phải > −100%");
    let s = 0;
    for (let i = 0; i < cfs.length; i++) s += cfs[i] / Math.pow(1 + rate, times ? times[i] : i);
    return s;
  }
  function signChanges(cfs) { let n = 0, last = 0; for (const c of cfs) { const s = Math.sign(c); if (s && last && s !== last) n++; if (s) last = s; } return n; }
  // Scans r in (−99%, 1000%] for every sign change of NPV and refines each by bisection.
  // status: "unique" | "multiple" | "none" — a case with no root returns no number.
  function irr(cfs, opts) {
    const o = opts || {}, times = o.times || null;
    need(Array.isArray(cfs) && cfs.length >= 2, "Cần ít nhất hai dòng tiền");
    need(cfs.every(c => typeof c === "number" && isFinite(c)), "Dòng tiền không hợp lệ");
    if (times) need(times.length === cfs.length && times.every((t, i) => isFinite(t) && (i === 0 || t >= times[i - 1])), "Thời điểm dòng tiền không hợp lệ");
    const sc = signChanges(cfs);
    if (sc === 0) return { status: "none", roots: [], signChanges: 0, reason: "Dòng tiền không đổi dấu nên không có IRR" };
    const lo = Math.log(0.01), hi = Math.log(11), N = 6000, roots = [];
    const f = u => npv(Math.exp(u) - 1, cfs, times);
    let pu = lo, pv = f(lo);
    for (let k = 1; k <= N; k++) {
      const u = lo + (hi - lo) * k / N, v = f(u);
      if (!isFinite(v) || !isFinite(pv)) { pu = u; pv = v; continue; }
      if (v === 0) roots.push(Math.exp(u) - 1);
      else if (pv !== 0 && Math.sign(v) !== Math.sign(pv)) {
        let a = pu, b = u, fa = pv;
        for (let it = 0; it < 200; it++) {
          const m = (a + b) / 2, fm = f(m);
          if (fm === 0 || b - a < 1e-14) { a = b = m; break; }
          if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
        }
        roots.push(Math.exp((a + b) / 2) - 1);
      }
      pu = u; pv = v;
    }
    const uniq = [];
    for (const r of roots) if (!uniq.some(x => Math.abs(x - r) < 1e-7)) uniq.push(r);
    if (!uniq.length) return { status: "none", roots: [], signChanges: sc, reason: "NPV không bằng 0 ở mức lãi suất nào trong khoảng −99% đến 1000%" };
    return { status: uniq.length === 1 ? "unique" : "multiple", roots: uniq, irr: uniq.length === 1 ? uniq[0] : null, signChanges: sc,
      reason: uniq.length > 1 ? "Dòng tiền đổi dấu nhiều lần nên có nhiều IRR; dùng NPV hoặc MOIC để đánh giá" : "" };
  }
  const annualize = (rq, n) => Math.pow(1 + rq, n || 4) - 1;

  // ---------- Multiples (curriculum LM2 eq. 1 for MOIC) ----------
  // MOIC = (realized + unrealized value) / invested capital (paid-in less fees and fund expenses)
  function moic(realized, unrealized, invested) { need(invested > 0, "Vốn đầu tư phải dương"); return (realized + unrealized) / invested; }
  // Fund multiples on paid-in capital (industry convention)
  function multiples({ distributions, nav, paidIn }) {
    if (!(paidIn > 0)) return { dpi: null, rvpi: null, tvpi: null };
    return { dpi: distributions / paidIn, rvpi: nav / paidIn, tvpi: (distributions + nav) / paidIn };
  }

  // ---------- Leverage (curriculum LM2 eq. 2–3) ----------
  // rL = [r(Vc + Vb) − Vb·rb] / Vc = r + (Vb/Vc)(r − rb)
  function leveredReturn({ r, Vc, Vb, rb }) {
    assertRate(r, "r"); assertRate(rb, "rb", -0.2, 1);
    need(Vc > 0, "Vốn chủ sở hữu phải dương"); need(Vb >= 0, "Vốn vay không được âm");
    const rL = r + (Vb / Vc) * (r - rb);
    return { rL, magnifier: (Vb / Vc) * (r - rb), longForm: (r * (Vc + Vb) - Vb * rb) / Vc, breakEvenRb: r };
  }

  // ---------- Fund of funds: two fee layers (curriculum LM2 example) ----------
  function fofReturn(o) {
    const inner = hfFees({ P0: o.capital, P1: o.capital + mul(o.capital, o.grossReturn), mgmtRate: o.hf.mgmt, mgmtBasis: o.hf.basis, perfRate: o.hf.perf, perfBasis: o.hf.perfBasis });
    const outer = hfFees({ P0: o.capital, P1: inner.end, mgmtRate: o.fof.mgmt, mgmtBasis: o.fof.basis, perfRate: o.fof.perf, perfBasis: o.fof.perfBasis });
    return { direct: inner.ret, viaFof: outer.ret, innerFees: inner.fees, outerFees: outer.fees, drag: inner.ret - outer.ret };
  }

  // ---------- Commodities ----------
  // Forward price under continuous compounding (curriculum LM5 eq. 1): F0(T) = S0 · e^{(r + c − i)T}
  function forwardPrice({ S0, r, c, i, T }) {
    need(S0 > 0, "Giá giao ngay phải dương"); need(T >= 0, "Kỳ hạn không được âm");
    const F = S0 * Math.exp((r + c - i) * T);
    return { F, shape: F > S0 + 1e-12 ? "contango" : F < S0 - 1e-12 ? "backwardation" : "flat" };
  }
  // Game model: a fully collateralised long futures position held for one quarter and rolled.
  // Bought at F0 = S0·e^{k/4} (k = r + c − i, annualised), it settles at S1; the collateral earns r/4.
  // Return = spot (S1/S0 − 1) + roll ((S1/S0)(e^{−k/4} − 1)) + collateral (r/4), exactly.
  function futuresQuarter({ S0, S1, k, r }) {
    need(S0 > 0 && S1 > 0, "Giá phải dương");
    const spot = S1 / S0 - 1, roll = (S1 / S0) * (Math.exp(-k / 4) - 1), coll = r / 4;
    return { spot, roll, collateral: coll, total: spot + roll + coll, shape: k > 0 ? "contango" : k < 0 ? "backwardation" : "flat" };
  }

  // ---------- Real estate (game model: direct capitalisation of next year's income) ----------
  function reValue({ noi, yieldRate }) { need(yieldRate > 0.005, "Tỷ suất thu nhập phải > 0,5%"); return Math.round(noi / yieldRate); }
  function ltv(debt, value) { return value > 0 ? debt / value : Infinity; }

  // ---------- Infrastructure project cash flows (game model) ----------
  // Annual cash flows to equity: construction capex first, then operating cash flow until the
  // concession ends, when the asset is handed back with no terminal value (build-operate-transfer).
  function projectCashflows(p) {
    need(Array.isArray(p.capex) && p.capex.length > 0, "Cần lịch giải ngân xây dựng");
    need(p.years > 0 && p.years <= 60, "Thời hạn khai thác 1–60 năm");
    const cfs = p.capex.map(c => -c);
    for (let t = 0; t < p.years; t++) {
      const ramp = p.ramp ? Math.min(1, (t + 1) / p.ramp) : 1;
      const rev = p.rev0 * ramp * Math.pow(1 + p.growth, t);
      cfs.push(rev * (1 - p.opex));
    }
    return cfs;
  }
  function scenarioTable(p, scen, rate) {
    return scen.map(s => {
      const cfs = projectCashflows(Object.assign({}, p, { rev0: p.rev0 * s.demand, growth: s.growth != null ? s.growth : p.growth }));
      const ir = irr(cfs);
      return { id: s.id, label: s.label, demand: s.demand, cfs, npv: npv(rate, cfs), irr: ir.status === "unique" ? ir.irr : null, irrStatus: ir.status };
    });
  }

  // ---------- Hedge fund exposure (game model) ----------
  function exposure({ equity, long, short }) {
    need(equity > 0, "Vốn chủ sở hữu phải dương"); need(long >= 0 && short >= 0, "Vị thế không được âm");
    return { gross: (long + short) / equity, net: (long - short) / equity };
  }

  // ---------- Performance statistics ----------
  function twr(returns) { return returns.reduce((a, r) => a * (1 + r), 1) - 1; }
  function maxDrawdown(values) {
    let peak = -Infinity, dd = 0;
    for (const v of values) { peak = Math.max(peak, v); if (peak > 0) dd = Math.min(dd, v / peak - 1); }
    return dd;
  }
  function stdev(a) { if (a.length < 2) return 0; const m = sum(a) / a.length; return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / (a.length - 1)); }
  function correl(a, b) {
    const n = Math.min(a.length, b.length); if (n < 3) return null;
    const x = a.slice(-n), y = b.slice(-n), mx = sum(x) / n, my = sum(y) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
  }
  // Survivorship bias: average return of the funds still reporting vs all funds (curriculum LM2)
  function survivorship(funds) {
    const all = funds.map(f => f.ret), alive = funds.filter(f => f.alive).map(f => f.ret);
    const backfilled = funds.filter(f => f.alive && f.backfilled).length;
    const ma = all.length ? sum(all) / all.length : 0, ms = alive.length ? sum(alive) / alive.length : 0;
    return { allFunds: ma, survivors: ms, bias: ms - ma, dead: funds.length - alive.length, backfilled };
  }

  return { AltError, need, mul, mulDiv, cents, usd, M, toM, sum, clamp, r6, isCents,
    hfFees, hfSeries, gpReturn, waterfall, dealWaterfalls, npv, irr, signChanges, annualize, moic, multiples,
    leveredReturn, fofReturn, forwardPrice, futuresQuarter, reValue, ltv, projectCashflows, scenarioTable, exposure,
    twr, maxDrawdown, stdev, correl, survivorship };
});

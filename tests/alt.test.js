// Alternative Empire: engine, world, assets, fund ledger and game rules.
// Worked numbers are checked against hand calculations; where a case mirrors a curriculum
// worked example, only the figures are used here (no text from the curriculum).
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/alt/engine.js");

const M = E.M, near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= (tol == null ? 1e-9 : tol), `${msg || ""} ${a} vs ${b}`);

// ---------------- Engine ----------------
test("money: exact cents, half away from zero, integers only", () => {
  assert.equal(E.mul(13000000000, 0.02), 260000000);
  assert.equal(E.mul(5, 0.5), 3);          // 2.5 → 3
  assert.equal(E.mul(-5, 0.5), -3);        // −2.5 → −3
  assert.equal(E.mul(1, 0.4), 0);
  assert.throws(() => E.mul(1.5, 0.1), E.AltError);
  assert.equal(E.mulDiv(1000, 1, 3), 333);
});

test("hedge fund fees: end-of-year AUM, independent vs net of the management fee, hurdle", () => {
  const base = { P0: M(100), P1: M(130), mgmtRate: 0.02, perfRate: 0.2 };
  const a = E.hfFees(base);
  assert.equal(a.mgmt, M(2.6)); assert.equal(a.perf, M(6)); near(a.ret, 0.214);
  const b = E.hfFees(Object.assign({ perfBasis: "net" }, base));
  assert.equal(b.perf, M(5.48)); near(b.ret, 0.2192);
  const c = E.hfFees(Object.assign({ perfBasis: "net", hurdle: 0.05, hurdleType: "hard" }, base));
  assert.equal(c.perf, M(4.48)); near(c.ret, 0.2292);
});

test("hedge fund fees: high-water mark carries across years", () => {
  // year 1 independent fees, then the fund falls to 110 and recovers to 128
  const y1 = E.hfFees({ P0: M(100), P1: M(130), mgmtRate: 0.02, perfRate: 0.2, hwm: M(100) });
  assert.equal(y1.end, M(121.4)); assert.equal(y1.hwmNext, M(121.4));
  const y2 = E.hfFees({ P0: y1.end, P1: M(110), mgmtRate: 0.02, perfRate: 0.2, hwm: y1.hwmNext });
  assert.equal(y2.mgmt, M(2.2)); assert.equal(y2.perf, 0); near(y2.ret, -0.112, 1e-4);
  assert.equal(y2.hwmNext, M(121.4));
  const y3 = E.hfFees({ P0: y2.end, P1: M(128), mgmtRate: 0.02, perfRate: 0.2, hwm: y2.hwmNext });
  assert.equal(y3.perf, M(1.32)); assert.equal(y3.fees, M(3.88)); near(y3.ret, 0.1514, 1e-4);
  assert.equal(y3.hwmNext, M(124.12));
});

test("hedge fund fees: 1% on year-end AUM, net basis, hurdle and HWM over three years", () => {
  const t = { mgmtRate: 0.01, perfRate: 0.2 };
  assert.equal(E.hfFees(Object.assign({ P0: M(100), P1: M(130) }, t)).fees, M(7.3));
  const n1 = E.hfFees(Object.assign({ P0: M(100), P1: M(130), perfBasis: "net" }, t));
  assert.equal(n1.fees, M(7.04)); near(n1.ret, 0.2296);
  const h = E.hfFees(Object.assign({ P0: M(100), P1: M(130), perfBasis: "net", hurdle: 0.06, hurdleType: "hard" }, t));
  assert.equal(h.fees, M(5.84)); near(h.ret, 0.2416);
  const s = E.hfSeries(Object.assign({ start: M(100), grossReturns: [0.3, 110 / 122.96 - 1, 128 / 108.9 - 1], useHwm: true, perfBasis: "net" }, t));
  // the series compounds the investor's own value, so year 2 and 3 values are close to, not exactly, 110 and 128
  assert.equal(s.rows[0].end, M(122.96));
  near(s.rows[1].ret, -0.11435, 2e-4);
  assert.equal(s.rows[1].perf, 0);
});

test("soft hurdle with full catch-up vs hard hurdle", () => {
  const soft = E.waterfall({ capital: M(100), proceeds: M(160), pref: 0.08, years: 2, carry: 0.2, catchUp: 1 });
  assert.equal(soft.lp, M(148)); assert.equal(soft.gp, M(12));
  assert.deepEqual(soft.tiers.map(t => t.gp), [0, 0, M(4), M(8)]);
  const hard = E.waterfall({ capital: M(100), proceeds: M(160), pref: 0.08, years: 2, carry: 0.2, catchUp: 0 });
  assert.equal(hard.lp, M(151.2)); assert.equal(hard.gp, M(8.8));
  const short = E.waterfall({ capital: M(100), proceeds: M(110), pref: 0.08, years: 2, carry: 0.2, catchUp: 1 });
  assert.equal(short.gp, 0); assert.equal(short.lp, M(110));
  const loss = E.waterfall({ capital: M(100), proceeds: M(70), pref: 0.08, years: 2, carry: 0.2, catchUp: 1 });
  assert.equal(loss.lp, M(70)); assert.equal(loss.gp, 0);
  assert.throws(() => E.waterfall({ capital: M(1), proceeds: M(2), carry: 0.2, catchUp: 0.1, pref: 0.08, years: 1 }), E.AltError);
  for (const w of [soft, hard, short, loss]) assert.equal(w.lp + w.gp, w.tiers.reduce((s, t) => s + t.lp + t.gp, 0));
});

test("GP rate of return with and without catch-up", () => {
  near(E.gpReturn({ r: 0.18, rh: 0.08, p: 0.2 }).rGP, 0.02);
  near(E.gpReturn({ r: 0.20, rh: 0.10, p: 0.18 }).rGP, 0.018);
  const c = E.gpReturn({ r: 0.18, rh: 0.08, p: 0.2, catchUp: true });
  near(c.rcu, 0.02); near(c.rGP, 0.036);
  near(E.gpReturn({ r: 0.09, rh: 0.08, p: 0.2, catchUp: true }).rGP, 0.01);   // inside the catch-up tier
});

test("deal-by-deal waterfall pays early carry; clawback returns it", () => {
  const deals = [[10, 20], [20, 35], [40, 80], [20, 20], [35, 25], [25, 20], [30, 0], [20, 0]].map(([i, s], k) => ({ name: "D" + (k + 1), invested: M(i), proceeds: M(s) }));
  const w = E.dealWaterfalls(deals, { carry: 0.2, clawback: true });
  assert.equal(w.profit, 0);
  assert.equal(w.american.gpPaid, M(13)); assert.equal(w.american.clawback, M(13)); assert.equal(w.european.gp, 0);
  const noClaw = E.dealWaterfalls(deals, { carry: 0.2, clawback: false });
  assert.equal(noClaw.american.lost, M(13));
  const two = E.dealWaterfalls([{ invested: M(10), proceeds: M(22) }, { invested: M(10), proceeds: 0 }], { carry: 0.2 });
  assert.equal(two.american.gpPaid, M(2.4)); assert.equal(two.european.gp, M(0.4)); assert.equal(two.american.clawback, M(2));
});

test("IRR: unique, none, multiple; NPV and MOIC", () => {
  const r = E.irr([-2.5, -4, -1.7, -0.5, 1, 3, 12.5]);
  assert.equal(r.status, "unique"); near(r.irr, 0.14596, 5e-5);
  assert.equal(E.irr([100, 50]).status, "none");
  const m = E.irr([-100, 230, -132]);
  assert.equal(m.status, "multiple"); assert.equal(m.irr, null);
  near(m.roots[0], 0.1, 1e-9); near(m.roots[1], 0.2, 1e-9);
  near(E.npv(0.1, [-100, 110]), 0);
  near(E.moic(8.5, 0, 3.8 + 1.2 + 0.2), 1.6346, 1e-4);
  const t = E.irr([-100, 60, 60], { times: [0, 0.5, 1.5] });
  assert.equal(t.status, "unique"); near(E.npv(t.irr, [-100, 60, 60], [0, 0.5, 1.5]), 0, 1e-6);
  assert.throws(() => E.irr([1]), E.AltError);
});

test("leverage magnifies both ways", () => {
  near(E.leveredReturn({ r: 0.08, Vc: 100, Vb: 50, rb: 0.04 }).rL, 0.10);
  near(E.leveredReturn({ r: -0.02, Vc: 100, Vb: 50, rb: 0.04 }).rL, -0.05);
  const x = E.leveredReturn({ r: 0.10, Vc: 100, Vb: 100, rb: 0.03 });
  near(x.rL, 0.17); near(x.longForm, x.rL);
});

test("fund of funds: two fee layers", () => {
  const f = E.fofReturn({ capital: M(100), grossReturn: 0.2, hf: { mgmt: 0.02, basis: "begin", perf: 0.2 }, fof: { mgmt: 0.01, basis: "begin", perf: 0.1 } });
  near(f.direct, 0.14); near(f.viaFof, 0.116);
  const cap = E.hfFees({ P0: M(200), P1: M(220), mgmtRate: 0.01, perfRate: 0.1 });
  near(cap.ret, 0.079);
});

test("commodity futures: contango drags, backwardation helps, pieces add up", () => {
  assert.equal(E.forwardPrice({ S0: 100, r: 0.04, c: 0.03, i: 0, T: 1 }).shape, "contango");
  assert.equal(E.forwardPrice({ S0: 100, r: 0.04, c: 0.01, i: 0.08, T: 1 }).shape, "backwardation");
  const c = E.futuresQuarter({ S0: 100, S1: 100, k: 0.08, r: 0.04 });
  assert.ok(c.roll < 0); near(c.spot + c.roll + c.collateral, c.total);
  const b = E.futuresQuarter({ S0: 100, S1: 100, k: -0.06, r: 0.04 });
  assert.ok(b.roll > 0);
});

test("projects, exposure, statistics, survivorship", () => {
  const p = { capex: [50, 50], years: 10, rev0: 20, growth: 0.02, opex: 0.3, ramp: 2 };
  const cfs = E.projectCashflows(p);
  assert.equal(cfs.length, 12); assert.equal(cfs[0], -50);
  const tbl = E.scenarioTable(p, [{ id: "low", demand: 0.7 }, { id: "base", demand: 1 }, { id: "high", demand: 1.25 }], 0.08);
  assert.ok(tbl[0].npv < tbl[1].npv && tbl[1].npv < tbl[2].npv);
  const ex = E.exposure({ equity: 100, long: 150, short: 90 });
  near(ex.gross, 2.4); near(ex.net, 0.6);
  near(E.maxDrawdown([100, 120, 90, 130]), -0.25);
  near(E.twr([0.1, -0.1]), -0.01);
  const sb = E.survivorship([{ ret: 0.1, alive: true }, { ret: -0.2, alive: false }, { ret: 0.06, alive: true, backfilled: true }]);
  assert.ok(sb.bias > 0); assert.equal(sb.dead, 1); assert.equal(sb.backfilled, 1);
});

module.exports = { near };

// ---------------- World, assets, ledger ----------------
const W = require("../js/alt/world.js"), A = require("../js/alt/assets.js"), F = require("../js/alt/fund.js");
const G = require("../js/alt/game.js"), C = require("../js/alt/content.js");

test("world: the same seed and shocks give the same economy", () => {
  const run = (seed, shocks) => { let w = W.create({ seed }); for (let i = 0; i < 12; i++) w = W.step(w, i === 3 ? shocks : []); return w; };
  const a = run(11, []), b = run(11, []), c = run(12, []), d = run(11, [{ v: "liq", add: -0.3 }]);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.eqIdx, c.eqIdx);
  assert.notEqual(a.liq, d.liq);
  for (const k of ["rate", "spread", "vol", "liq"]) assert.ok(isFinite(a[k]));
  assert.equal(W.label(0), "Q1/2027"); assert.equal(W.label(7), "Q4/2028");
});

function bigFund(seed) {
  let w = W.create({ seed }); const f = F.create({ initial: M(100), q: 0 }), companies = {};
  const ctx = () => ({ seed, W: w, q: w.q });
  companies.bw = A.newCompany({ id: "bw", name: "B", kind: "mature", ebitda: M(12), mult0: 8, netDebt: M(50), debtSpread: 0.04, covenant: 6.5, plan: "cost" }, w);
  companies.ng = A.newCompany({ id: "ng", name: "N", kind: "startup", val: M(40), stage: 0, fails: 0, milestones: [2, 5, 8] }, w);
  companies.hs = A.newCompany({ id: "hs", name: "H", kind: "distressed", ev: M(60), face: M(100), resolveAge: 5 }, w);
  F.open(f, 0, { type: "pefund", name: "PE", commit: M(30), terms: { mgmt: 0.02, carry: 0.2, pref: 0.08, catchUp: 1, waterfall: "european", clawback: true, beta: 1.1, alpha: 0.04, sigma: 0.08 } }, ctx());
  F.open(f, 0, { type: "pefund", name: "PE2", commit: M(20), terms: { mgmt: 0.02, carry: 0.2, pref: 0.08, catchUp: 1, waterfall: "american", clawback: true, beta: 1.1, alpha: 0.04, sigma: 0.08 } }, ctx());
  F.open(f, 0, { type: "re", name: "RE", buy: M(20), borrow: M(10), txCost: M(0.3), terms: { noi: M(1.3), y0: 0.065, debtRate: 0.055, demand: "office" } }, ctx());
  F.open(f, 0, { type: "equity", name: "EQ", buy: M(8), terms: { company: "bw", stake: 0.3 } }, ctx());
  F.open(f, 0, { type: "loan", name: "VD", buy: M(3), terms: { company: "ng", rate: 0.12, seniority: "venture", warrants: 0.02, term: 16 } }, ctx());
  F.open(f, 0, { type: "distressed", name: "DD", buy: M(4.5), terms: { company: "hs", face: M(10) } }, ctx());
  F.open(f, 0, { type: "infra", name: "Toll", commit: M(10), terms: { buildQ: 4, rev0: M(1.5), opex: 0.3, years: 25, premium: 0.045, growth: 0.02, ramp: 2, realized: 0.9 } }, ctx());
  F.open(f, 0, { type: "farm", name: "Farm", buy: M(6), terms: { price: M(6), acres: 2000, yieldPerAcre: 3, cropPrice: 21000, costPerAcre: 45000, model: "operate", hedgeTons: 2400, hedgePrice: 21000 } }, ctx());
  F.open(f, 0, { type: "timber", name: "Timber", buy: M(5), terms: { landValue: M(2), stumpage: 8000, cutCost: 2200, growth: 0.04, harvest: 0.05 }, params: { volume: 57000 } }, ctx());
  F.open(f, 0, { type: "futures", name: "Fut", buy: M(3), terms: { weights: { energy: 0.5, metals: 0.3, ags: 0.2 } } }, ctx());
  F.open(f, 0, { type: "hf", name: "HF", buy: M(5), terms: { w: { eh: 0.4, ed: 0.2, rv: 0.2, opp: 0.2 }, lev: 2 } }, ctx());
  F.open(f, 0, { type: "fof", name: "FoF", buy: M(3), terms: { hfMgmt: 0.02, hfPerf: 0.2, mgmt: 0.01, perf: 0.1 } }, ctx());
  F.open(f, 0, { type: "token", name: "Tok", buy: M(1), terms: { custody: "self", staking: true } }, ctx());
  F.open(f, 0, { type: "coinv", name: "Co", buy: M(4), terms: { fee: 0, carry: 0.1, beta: 1.2, alpha: 0.03, sigma: 0.12 }, params: { exitAge: 10 } }, ctx());
  F.open(f, 0, { type: "reit", name: "REIT", buy: M(2), terms: {} }, ctx());
  F.open(f, 0, { type: "gold", name: "Gold", buy: M(1), terms: {} }, ctx());
  F.open(f, 0, { type: "dfund", name: "ETP", buy: M(0.5), terms: {} }, ctx());
  F.open(f, 0, { type: "dlteq", name: "DLT", buy: M(0.5), terms: {} }, ctx());
  F.setCredit(f, M(10), 0.06);
  return { f, companies, step(q) { const w0 = w; w = W.step(w0, []); const c = { seed, W: w, W0: w0, q, companies }; for (const co of Object.values(companies)) A.stepCompany(co, w, c); const news = F.stepQuarter(f, q, c); F.cover(f, q, w); F.closeQuarter(f, q, w); return news; }, get w() { return w; } };
}

test("ledger: every quarter reconciles with all 17 asset types; NAV equals the sum of P&L categories", () => {
  for (const seed of [1, 42, 777]) {
    const b = bigFund(seed);
    assert.equal(new Set(b.f.holdings.map(h => h.type)).size, Object.keys(A.TYPES).length);
    for (let q = 1; q <= 20; q++) {
      b.step(q);
      const v = F.verify(b.f);
      assert.ok(v.ok, `seed ${seed} q ${q}: ${v.errors.join("; ")}`);
      assert.ok(b.f.cash >= 0, "cash covered by the credit line or sales");
    }
    const cats = F.pnl(b.f, 0, 99);                  // everything after the opening capital
    assert.equal(F.nav(b.f), b.f.initial + Object.values(cats).reduce((s, x) => s + x, 0));
  }
});

test("ledger: borrowing is not profit; a distribution is not counted twice; a broken posting is refused", () => {
  const f = F.create({ initial: M(100), q: 0 }), w = W.create({ seed: 3 });
  const h = F.open(f, 0, { type: "re", name: "R", buy: M(20), borrow: M(12), terms: { noi: M(1), y0: 0.06, debtRate: 0.05, demand: "resi" } }, { seed: 3, W: w, q: 0 });
  assert.equal(F.nav(f), M(100));                    // assets +20, cash −20 +12, debt +12
  assert.equal(f.cum.income + f.cum.realized + f.cum.unrealized, 0);
  F.post(f, 0, "MARK", h.id, { value: M(2), cat: { unrealized: M(2) } });
  const before = F.nav(f);
  F.distribute(f, 0, h, M(3), "test");
  assert.equal(F.nav(f), before);                    // value → cash, NAV unchanged
  assert.equal(f.cum.realized + f.cum.unrealized, M(2));
  assert.throws(() => F.post(f, 0, "MARK", h.id, { value: M(1) }), E.AltError);
  assert.throws(() => F.post(f, 0, "MARK", h.id, { value: 1.5, cat: { unrealized: 1.5 } }), E.AltError);
  assert.ok(F.verify(f).ok);
  f.cash += 1;                                       // tampering is detected
  assert.equal(F.verify(f).ok, false);
});

test("PE fund: calls follow the commitment, unfunded falls, J-curve then distributions, value = gross − accrued carry + clawback", () => {
  const b = bigFund(5), pe = b.f.holdings.find(h => h.name === "PE");
  assert.equal(pe.unfunded, M(30)); assert.equal(pe.value, 0);
  let minTvpi = Infinity;
  for (let q = 1; q <= 20; q++) {
    b.step(q);
    assert.equal(pe.commit - pe.paidIn, pe.unfunded);
    assert.ok(pe.unfunded >= 0);
    const m = pe.m, gross = m.deals.reduce((s, d) => s + (d.live ? d.rep : 0), 0);
    assert.equal(pe.value, gross - m.accrued + m.recv);
    const st = F.holdingStats(b.f, pe, q);
    if (q <= 6 && st.mult.tvpi != null) minTvpi = Math.min(minTvpi, st.mult.tvpi);
  }
  assert.ok(minTvpi < 1, "early TVPI below 1 (J-curve)");
  assert.ok(pe.dist > 0, "exits paid distributions");
});

test("secondary sale: illiquid at a discount, buyer takes the unfunded commitment; lockup blocks a sale", () => {
  const b = bigFund(9); for (let q = 1; q <= 3; q++) b.step(q);
  const pe = b.f.holdings.find(h => h.name === "PE"), v = pe.value;
  const r = F.sell(b.f, 3, pe, 1, b.w);
  assert.ok(r.discount > 0 && r.price < v);
  assert.equal(pe.status, "sold"); assert.equal(pe.unfunded, 0); assert.equal(pe.value, 0);
  assert.ok(F.verify(b.f).ok);
  const hf = b.f.holdings.find(h => h.type === "hf"); hf.lockUntil = 10;
  assert.throws(() => F.sell(b.f, 3, hf, 0.5, b.w), E.AltError);
});

test("cash shortfall: the credit line pays a capital call; without one, liquid assets are sold", () => {
  const w = W.create({ seed: 4 }), f = F.create({ initial: M(10), q: 0 }), ctx = { seed: 4, W: w, q: 0 };
  F.open(f, 0, { type: "pefund", name: "Big", commit: M(40), terms: { mgmt: 0.02, carry: 0.2, pref: 0.08, catchUp: 1, waterfall: "european", clawback: true, beta: 1, alpha: 0, sigma: 0.05 } }, ctx);
  F.open(f, 0, { type: "reit", name: "REIT", buy: M(6), terms: {} }, ctx);
  F.setCredit(f, M(2), 0.06);
  let ww = w;
  for (let q = 1; q <= 3; q++) { const w0 = ww; ww = W.step(w0, []); F.stepQuarter(f, q, { seed: 4, W: ww, W0: w0, q, companies: {} }); const c = F.cover(f, q, ww); if (q === 1) assert.ok(c.steps.length >= 1); }
  assert.ok(f.debt > 0, "credit line drawn");
  assert.ok(f.holdings.find(h => h.name === "REIT").cost < M(6), "REIT sold to pay calls");
  assert.ok(F.verify(f).ok);
});

// ---------------- Game rules ----------------
test("game: deals validate input, cash and chapter; negotiation budget is enforced", () => {
  const g = G.newGame({ seed: 21 });
  assert.equal(G.dealState(g, "d3-bw-lbo").ok, false);
  assert.equal(G.invest(g, "d1-fund", { commit: 25 }).ok, false, "needs a term sheet");
  assert.equal(G.invest(g, "d1-direct", { amount: 99 }).ok, false, "out of range");
  assert.equal(G.invest(g, "d1-direct", { amount: 7.5 }).ok, false, "off the step");
  assert.equal(G.invest(g, "d1-coinv", { amount: 5, dd: "own" }).ok, false, "co-invest only for LPs");
  const greedy = G.negotiate(g, "d1-fund", { mgmt: 2, carry: 2, waterfall: 1, catchUp: 1 }, 25);
  assert.equal(greedy.status, "rejected");
  assert.ok(g.rep < 50);
  const fair = G.negotiate(g, "d1-fund", { waterfall: 1 }, 30);   // 3 points, budget 3 + 2 − 1 strike = 4
  assert.equal(fair.status, "accepted"); assert.equal(fair.terms.waterfall, "european");
  const r = G.invest(g, "d1-fund", { commit: 30 });
  assert.ok(r.ok, r.msg);
  assert.equal(r.holding.terms.waterfall, "european");
  assert.equal(r.holding.unfunded, M(30));
  assert.equal(F.nav(g.fund), M(100), "a commitment is not an asset and does not move NAV");
  assert.ok(G.invest(g, "d1-coinv", { amount: 5, dd: "own" }).ok);
  assert.equal(G.dealState(g, "d1-coinv").ok, false, "one-off deal");
});

test("game: missions grade against the engine, quizzes need a pass, decisions apply consequences later", () => {
  const g = G.newGame({ seed: 8 });
  const m = C.MISSIONS.find(x => x.id === "c1-calls");
  assert.ok(G.submitStep(g, "c1-calls", 0).ok);
  const t = G.computeTask(g, "c1-calls", 1);
  const wrong = G.submitStep(g, "c1-calls", 1, { next: 0, after: 0 });
  assert.equal(wrong.score, 0);
  assert.equal(G.submitStep(g, "c1-calls", 2, "plan").ok, true);
  assert.equal(g.missions["c1-calls"].done, true);
  assert.ok(g.know[1].n >= 3);
  void m; void t;
  // quiz: answering all wrong does not complete the step
  const qz = G.missionQuiz(g, "c1-quiz");
  for (const id of qz.ids) G.answer(g, id, (C.QUESTIONS.find(q => q.id === id).ans + 1) % 3, "c1-quiz");
  const r = G.submitStep(g, "c1-quiz", 0);
  assert.equal(r.done, false); assert.ok(g.wrong.length >= 3);
  // a choice with a delayed effect
  g.chapter = 2; g.chapterStart[2] = 0;
  G.submitStep(g, "c2-dispute", 0);
  G.submitStep(g, "c2-dispute", 1, { perf3: 0 });
  const rep0 = g.rep;
  G.submitStep(g, "c2-dispute", 2, "deny");
  assert.ok(g.rep < rep0);
  assert.equal(g.pending.length, 1);
  const due = g.pending[0].due, before = g.rep;
  while (g.q < due) G.endQuarter(g);
  assert.ok(g.rep < before, "the audit two quarters later costs reputation");
  assert.ok(F.verify(g.fund).ok);
});

test("game: save → load → continue gives the same result; edits are detected; old saves migrate", () => {
  const play = g => { G.negotiate(g, "d1-fund", {}, 20); G.invest(g, "d1-fund", { commit: 20 }); G.invest(g, "d1-direct", { amount: 8, plan: "cost" }); for (let i = 0; i < 4; i++) G.endQuarter(g); };
  const a = G.newGame({ seed: 33 }); play(a);
  const saved = G.serialize(a);
  const b = G.deserialize(saved);
  assert.ok(b.ok && b.sealOk && b.ledgerOk);
  for (let i = 0; i < 3; i++) { G.endQuarter(a); G.endQuarter(b.G); }
  assert.equal(F.nav(a.fund), F.nav(b.G.fund));
  assert.deepEqual(a.world, b.G.world);
  const forged = JSON.parse(saved); forged.fund.cash += M(50);
  const c = G.deserialize(JSON.stringify(forged));
  assert.ok(c.ok); assert.equal(c.G.tampered, true);
  const old = JSON.parse(saved); delete old.wrong; delete old.reports; old.v = 0;
  const d = G.deserialize(JSON.stringify(old));
  assert.ok(d.ok); assert.deepEqual(d.G.wrong, []); assert.equal(d.G.v, G.VERSION);
  assert.equal(G.deserialize("{not json").ok, false);
  assert.equal(G.deserialize(JSON.stringify({ hello: 1 })).ok, false);
});

// a full campaign through the public rules, answering correctly
function campaign(seed, plan) {
  const g = G.newGame({ seed });
  for (let guard = 0; guard < 60 && g.status === "active"; guard++) {
    for (const m of C.MISSIONS.filter(x => x.ch === g.chapter)) {
      if (!G.missionOpen(g, m).ok) continue;
      let si;
      while ((si = G.stepIndex(g, m)) !== -1) {
        const st = m.steps[si]; let ans;
        if (st.type === "classify") ans = Object.fromEntries(st.items.map((it, i) => [i, it[1]]));
        else if (st.type === "choice") ans = (st.options.find(o => o.ok) || st.options[0]).id;
        else if (st.type === "compute") ans = Object.fromEntries(G.computeTask(g, m.id, si).fields.map(f => [f.id, f.select ? f.ans : f.ans.toFixed(4)]));
        else if (st.type === "deals") { for (const id of st.deals) if (plan[id] && G.dealState(g, id).ok) { if (C.DEALS[id].negotiate) G.negotiate(g, id, {}, plan[id].commit); G.invest(g, id, plan[id]); } }
        else if (st.type === "quiz") { const qz = G.missionQuiz(g, m.id); qz.ids.forEach(id => G.answer(g, id, C.QUESTIONS.find(q => q.id === id).ans, m.id)); }
        const r = G.submitStep(g, m.id, si, ans);
        assert.ok(r.ok && r.done, `${m.id} step ${si}: ${r.msg}`);
      }
    }
    if (g.status !== "active") break;
    g.decisions.filter(d => !d.done).forEach(d => G.resolve(g, d.id, d.options[0].id));
    const rep = G.endQuarter(g);
    assert.ok(rep.verify, `ledger at ${W.label(g.q)}`);
  }
  return g;
}
test("game: a careful campaign plays all seven chapters to an ending", () => {
  const g = campaign(7, { "d1-fund": { commit: 25 }, "d1-direct": { amount: 8, plan: "cost" }, "d3-bw-dl": { amount: 6 }, "d3-hs-dd": { face: 8, active: "yes" }, "d4-hospital": { amount: 10 }, "d4-reit": { amount: 4 },
    "d5-farm": { model: "lease", hedge: "0" }, "d6-fof": { amount: 5 }, "d7-dfund": { amount: 1 } });
  assert.equal(g.status, "finished");
  assert.ok(g.ending && g.finalScore > 0);
  for (let ch = 1; ch <= 7; ch++) assert.ok(g.chapterDone[ch] != null, "chapter " + ch);
  assert.ok(g.career >= 5);
  assert.ok(g.events.length >= 4, "story and random events happened");
});
test("game: reckless over-commitment ends in an emergency loan and replacement", () => {
  const g = G.newGame({ seed: 2 });
  G.negotiate(g, "d1-fund", {}, 40); G.invest(g, "d1-fund", { commit: 40 });
  G.invest(g, "d1-direct", { amount: 14, plan: "growth" });
  // spend the rest of the cash on an illiquid asset by force, then let the calls arrive
  F.open(g.fund, g.q, { type: "re", name: "Trophy tower", buy: g.fund.cash - M(1), terms: { noi: M(2), y0: 0.07, debtRate: 0.06, demand: "office" } }, { seed: 2, W: g.world, q: g.q });
  for (let i = 0; i < 12 && g.status === "active"; i++) G.endQuarter(g);
  assert.equal(g.status, "lost");
  assert.ok(["insolvent", "closed"].includes(g.lost.why), g.lost.why);
  assert.ok(g.emergencies >= 1, "the board had to lend");
  assert.ok(F.verify(g.fund).ok);
});

// Tests for Bond Empire: the fixed income engine (worked examples checked by hand)
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../js/bond/engine.js");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} expected ${b}, got ${a}`);
const bond = o => ({ id: "T", coupon: 0.05, freq: 1, issue: "2020-01-15", maturity: "2030-01-15", dayCount: "ACT/ACT", bdc: "following", ...o });

test("price from yield on a coupon date: par, discount and premium", () => {
  const b = bond({ maturity: "2031-01-15", issue: "2026-01-15" });
  near(B.priceFromYield(b, "2026-01-15", 0.05).full, 100, 1e-9, "par");
  near(B.priceFromYield(b, "2026-01-15", 0.06).full, 95.787636, 1e-5, "discount");   // 5 × 4.212364 + 100 × 0.747258
  const s = bond({ coupon: 0.10, freq: 2, issue: "2026-01-15", maturity: "2036-01-15" });
  near(B.priceFromYield(s, "2026-01-15", 0.08).full, 113.590326, 1e-5, "semiannual premium");
});

test("between coupon dates: full = PV at last coupon × (1 + y/m)^(t/T); clean = full − accrued", () => {
  const b = bond({ coupon: 0.06, freq: 2, dayCount: "30/360", issue: "2025-03-15", maturity: "2030-03-15" });
  const p = B.priceFromYield(b, "2026-05-15", 0.07);
  const atLast = B.priceFromYield(b, "2026-03-15", 0.07).full;
  near(p.f, 60 / 180, 1e-12, "fraction");
  near(p.full, atLast * Math.pow(1.035, 60 / 180), 1e-9, "full");
  near(p.ai, 1.0, 1e-12, "accrued = 3 × 60/180");
  near(p.clean, p.full - 1, 1e-12, "clean");
});

test("accrued interest under ACT/ACT, ACT/365 and 30/360", () => {
  const a = bond({ coupon: 0.05, freq: 2, issue: "2025-01-15", maturity: "2030-01-15" });
  near(B.accrued(a, "2026-04-15"), 2.5 * 90 / 181, 1e-12, "ACT/ACT: 90 of 181 days");
  near(B.accrued({ ...a, dayCount: "ACT/365" }, "2026-04-15"), 5 * 90 / 365, 1e-12, "ACT/365");
  assert.equal(B.days30("2026-01-31", "2026-03-31"), 60);
  assert.equal(B.days30("2026-02-28", "2026-03-31"), 33);
  assert.equal(B.accrued(a, "2026-01-15"), 0);                      // on the coupon date
});

test("yield to maturity inverts the price; current yield", () => {
  const b = bond({ coupon: 0.045, freq: 2, issue: "2024-06-30", maturity: "2034-06-30", dayCount: "30/360" });
  for (const y of [0.01, 0.045, 0.08, 0.15]) {
    const p = B.priceFromYield(b, "2026-11-20", y);
    near(B.ytm(b, "2026-11-20", p.full), y, 1e-10, `ytm ${y}`);
  }
  near(B.currentYield(b, 90), 0.05, 1e-12);
  near(B.convertYield(0.06, 2, 1), 0.0609, 1e-12, "semiannual 6% = annual 6.09%");
});

test("cash flow schedule: count back from maturity, business-day adjusted payments", () => {
  const b = bond({ coupon: 0.06, freq: 4, issue: "2026-02-22", maturity: "2027-11-22" });
  const cf = B.cashflows(b, "2026-11-20");
  assert.deepEqual(cf.map(c => c.date), ["2026-11-22", "2027-02-22", "2027-05-22", "2027-08-22", "2027-11-22"]);
  assert.equal(cf[0].pay, "2026-11-23");                            // 22/11/2026 is a Sunday → following business day
  near(cf[0].amount, 1.5, 1e-12); near(cf[4].amount, 101.5, 1e-12);
  assert.equal(B.adjust("2026-01-31", "modfollowing"), "2026-01-30"); // next business day is in February → go back
  assert.equal(B.cashflows(b, "2027-11-22").length, 0);               // matured
});

test("Macaulay, modified, money duration, PVBP and convexity", () => {
  const b = bond({ coupon: 0.05, freq: 1, issue: "2026-01-15", maturity: "2029-01-15" });
  const r = B.yieldRisk(b, "2026-01-15", 0.05);
  near(r.mac, 2.859410, 1e-6, "Macaulay");                          // (4.7619 + 2×4.5351 + 3×90.7029) / 100
  near(r.mod, 2.859410 / 1.05, 1e-6, "modified");
  near(r.approxMod, r.mod, 1e-6, "approximate modified");
  near(r.approxCvx, r.cvx, 1e-3, "approximate convexity");
  near(r.money, r.mod * 100, 1e-9, "money duration per 100");
  near(r.pvbp, r.mod * 100 * 0.0001, 1e-5, "PVBP");
  const z = B.yieldRisk(bond({ coupon: 0, issue: "2026-01-15", maturity: "2036-01-15" }), "2026-01-15", 0.04);
  near(z.mac, 10, 1e-12, "a zero's Macaulay duration is its maturity");
});

test("price change: duration plus convexity is closer to full repricing than duration alone", () => {
  const b = bond({ coupon: 0.04, freq: 2, issue: "2026-01-15", maturity: "2046-01-15" });
  const s = B.shock(b, "2026-01-15", 0.05, 0.01);
  assert.ok(Math.abs(s.withCvx - s.actual) < Math.abs(s.durOnly - s.actual));
  assert.ok(s.actual < 0);
});

test("spot curve by bootstrapping, forward rates, par rates back", () => {
  const curve = { tenors: [1, 2], par: [0.02, 0.03] };
  const bt = B.bootstrap(curve, 2);
  near(bt.df[1], 1 / 1.02, 1e-12);
  near(bt.df[2], (1 - 0.03 / 1.02) / 1.03, 1e-12);
  near(bt.z[2], 0.030152, 1e-6, "2-year spot");
  near(B.forward(bt, 1, 2), Math.pow(1 + bt.z[2], 2) / 1.02 - 1, 1e-12, "1y1y forward");
  near(B.forward(bt, 1, 2), 0.040405, 1e-6);
  near(B.parFromSpots(bt, 2), 0.03, 1e-12, "par rate from spots");
  const sa = B.bootstrapPeriodic([0.04, 0.045], 2);
  near(sa.z[0], 0.04, 1e-12);
  assert.ok(sa.z[1] > 0.045);
  const b = bond({ coupon: 0.03, freq: 1, issue: "2026-01-15", maturity: "2028-01-15" });
  near(B.priceOnCurve(b, "2026-01-15", B.bootstrap({ tenors: [1, 2], par: [0.02, 0.03] }, 30), 0).full, 100, 1e-9, "a par bond prices at 100 on its own curve");
});

test("Z-spread, G-spread, effective and key rate durations", () => {
  const curve = { tenors: [1, 3, 5, 10, 20], par: [0.035, 0.038, 0.042, 0.046, 0.048] };
  const bt = B.bootstrap(curve);
  const b = bond({ coupon: 0.06, freq: 1, issue: "2026-01-15", maturity: "2033-01-15" });
  const p = B.priceOnCurve(b, "2026-01-15", bt, 0.015);
  near(B.zSpread(b, "2026-01-15", bt, p.full), 0.015, 1e-9, "Z-spread recovered");
  const y = B.ytm(b, "2026-01-15", p.full);
  near(B.gSpread(y, curve, 7), y - (0.042 + 0.004 * 2 / 5), 1e-12);
  const r = B.curveRisk(b, "2026-01-15", curve, 0.015);
  const sum = r.krd.reduce((a, x) => a + x, 0);
  near(sum, r.effDur, 2e-3, "key rate durations add up to effective duration");
  near(r.effDur, B.yieldRisk(b, "2026-01-15", y).mod, 0.15, "effective ≈ modified for an option-free bond");
  assert.ok(r.krd[0] >= 0 && r.krd[3] > r.krd[0]);
});

test("money market rates, repo and floating rate notes", () => {
  near(B.mm.pvDiscountBasis(100, 90, 0.04), 99, 1e-12);
  near(B.mm.addOnFromPrice(99, 100, 90), 365 / 90 / 99, 1e-12);
  near(B.mm.discountFromPrice(99, 100, 90), 0.04, 1e-12);
  const r = B.repo(100e6, 0.02, 0.04, 30);
  near(r.cash, 98e6, 1e-6); near(r.interest, 98e6 * 0.04 * 30 / 360, 1e-6);
  near(B.frnPrice(0.03, 0.01, 0.01, 4, 12), 100, 1e-9, "quoted margin = discount margin → par");
  assert.ok(B.frnPrice(0.03, 0.01, 0.02, 4, 12) < 100);
});

test("credit: expected loss, spread ≈ PD × LGD, recovery by priority", () => {
  near(B.expectedLoss(1e9, 0.02, 0.4), 12e6, 1e-6);
  near(B.spreadApprox(0.02, 0.4), 0.012, 1e-15);
  near(B.cumulativePD(0.05, 2), 0.0975, 1e-12);
  const w = B.recoveryWaterfall(100, 60, [{ name: "A", rank: "secured", amount: 80 }, { name: "B", rank: "senior", amount: 50 }, { name: "C", rank: "sub", amount: 30 }]);
  near(w.claims[0].recovered, 60 + 20 * 40 / 70, 1e-9, "secured: collateral plus a share for the shortfall");
  near(w.claims[1].recovered, 50 * 40 / 70, 1e-9, "senior unsecured, pari passu with the shortfall");
  assert.equal(w.claims[2].recovered, 0);
  const x = B.ratios({ debt: 800, ebitda: 200, interest: 50, cash: 100, equity: 400 });
  assert.equal(x.debtToEbitda, 4); assert.equal(x.coverage, 4); near(x.debtToCapital, 800 / 1200, 1e-12);
});

test("ABS waterfall: no losses repays every note; losses hit the bottom first", () => {
  const pool = { balance: 1000, wac: 0.12, term: 36, cdr: 0, cpr: 0, recovery: 0.4, fee: 0.005 };
  const notes = [{ name: "A", size: 700, coupon: 0.06 }, { name: "B", size: 200, coupon: 0.09 }, { name: "E", size: 100, coupon: 0 }];
  const ok = B.absWaterfall({ pool, tranches: notes });
  ok.tranches.forEach(t => near(t.writedown, 0, 1e-9, t.name));
  near(ok.tranches[0].principal, 700, 1e-6);
  const bad = B.absWaterfall({ pool: { ...pool, cdr: 0.35 }, tranches: notes });
  assert.ok(bad.tranches[2].lossPct > 0);
  assert.equal(bad.tranches[0].writedown, 0);
  assert.ok(bad.tranches[2].lossPct >= bad.tranches[1].lossPct);
  assert.ok(ok.tranches[0].wal < ok.tranches[1].wal, "sequential pay: the senior note is repaid first");
});

test("prepayments: PSA ramp, faster prepayment shortens the average life", () => {
  near(B.psaCpr(30, 100), 0.06, 1e-12); near(B.psaCpr(15, 100), 0.03, 1e-12); near(B.psaCpr(15, 200), 0.06, 1e-12);
  const slow = B.passThrough({ balance: 1e6, wac: 0.07, rate: 0.065, term: 360, psa: 50 });
  const fast = B.passThrough({ balance: 1e6, wac: 0.07, rate: 0.065, term: 360, psa: 300 });
  assert.ok(fast.wal < slow.wal);
});

test("bond auction: stop-out yield, pro-rata at the margin, single vs multiple price", () => {
  const bids = [{ id: "a", yield: 0.030, amount: 40 }, { id: "b", yield: 0.031, amount: 50 }, { id: "c", yield: 0.032, amount: 30 }];
  const r = B.auction({ offered: 100, bids, format: "single" });
  assert.equal(r.stopOut, 0.032);
  near(r.alloc.find(a => a.id === "c").filled, 10, 1e-12);
  assert.ok(r.alloc.every(a => a.paidYield === 0.032));
  near(r.bidToCover, 1.2, 1e-12);
  const m = B.auction({ offered: 100, bids, format: "multiple" });
  assert.equal(m.alloc.find(a => a.id === "a").paidYield, 0.030);
  const capped = B.auction({ offered: 100, bids, maxYield: 0.031 });
  assert.equal(capped.unsold, 10);
});

// ---------- Market simulation and portfolio ----------
const M = require("../js/bond/market.js");
const K = require("../js/bond/book.js");
const ctx = { userId: "u1" };

test("synthetic market: seeded, curve plausible, events in time order", () => {
  const a = M.createSynthetic({ seed: 11 }), b = M.createSynthetic({ seed: 11 });
  for (let i = 0; i < 30; i++) { M.step(a); M.step(b); }
  assert.deepEqual(a.curve.par, b.curve.par);
  assert.equal(a.date, "2027-06-21");                               // 30 weeks after 23/11/2026
  assert.ok(a.curve.par.every(y => y > 0 && y < 0.2));
  const dates = a.news.map(n => n.date);
  assert.deepEqual(dates, dates.slice().sort());
});

test("quotes: government bonds on the curve, corporates over it, bid < mid < ask", () => {
  const st = M.createSynthetic({ seed: 3 });
  const g = M.quote(st, "GOV-33"), c = M.quote(st, "PLG-32"), lcl = M.quote(st, "LCL-29");
  assert.equal(g.z, 0);
  assert.ok(Math.abs(g.g) < 0.003, "a government bond yields about its own curve");
  assert.ok(c.z > 0.01 && lcl.z > c.z, "lower rating, wider spread");
  assert.ok(c.bid < c.mid && c.mid < c.ask);
  near(c.full, c.mid + c.ai, 1e-9);
  const frn = M.quote(st, "CCB-29F");
  assert.ok(frn.mid > 97 && frn.mid < 103, "a floater trades near par");
  M.defaultIssuer(st, "LCL");
  const d = M.quote(st, "LCL-29");
  assert.ok(d.defaulted); near(d.mid, d.recovery * 100, 1e-12);
});

test("portfolio: a purchase costs the full ask price plus the fee, to the đồng", () => {
  const st = M.createSynthetic({ seed: 5 }), a = K.createAccount({ userId: "u1", date: st.date });
  const q = M.quote(st, "GOV-30");
  const r = K.buy(a, { cid: "b1", bondId: "GOV-30", qty: 300 }, st, ctx);
  assert.ok(r.ok, r.error);
  const gross = Math.round(300 * 100000 * (q.ask + q.ai) / 100);
  assert.equal(K.cash(a), 100000000 - gross - K.feeOf(gross));
  assert.ok(K.buy(a, { cid: "b1", bondId: "GOV-30", qty: 300 }, st, ctx).duplicate);   // the same click twice
  assert.equal(a.holdings["GOV-30"].qty, 300);
  const before = JSON.stringify(a.ledger);
  assert.match(K.buy(a, { cid: "b2", bondId: "GOV-30", qty: 9000 }, st, ctx).error, /Không đủ tiền/);
  assert.equal(JSON.stringify(a.ledger), before);
  assert.match(K.buy(a, { cid: "b3", bondId: "GOV-30", qty: 1 }, st, { userId: "u2" }).error, /Không có quyền/);
  assert.ok(K.verify(a).ok);
});

test("portfolio: coupons on schedule, principal at maturity, first-in first-out sales", () => {
  const st = M.createSynthetic({ seed: 8, start: "2028-10-02" }), a = K.createAccount({ userId: "u1", date: st.date });
  K.buy(a, { bondId: "GOV-28", qty: 100 }, st, ctx);
  K.buy(a, { bondId: "GOV-28", qty: 50 }, st, ctx);
  assert.ok(K.sell(a, { bondId: "GOV-28", qty: 120 }, st, ctx).ok);
  assert.equal(a.holdings["GOV-28"].qty, 30);
  assert.equal(a.holdings["GOV-28"].lots.length, 1);
  let paid = [];
  for (let i = 0; i < 8; i++) { const w = M.step(st); paid = paid.concat(K.settle(a, st, w.from, w.to)); }
  const cpn = paid.find(p => p.type === "COUPON"), prn = paid.find(p => p.type === "PRINCIPAL");
  assert.equal(cpn.amount, Math.round(30 * 100000 * 0.034));       // 3.4% annual coupon on 3,000,000 ₫ of par
  assert.equal(prn.amount, 30 * 100000);
  assert.equal(a.holdings["GOV-28"], undefined);
  assert.equal(a.ledger.find(e => e.type === "COUPON").date, "2028-11-15");
});

test("portfolio: a default pays the recovery value; redemptions need cash; fire sales raise it", () => {
  const st = M.createSynthetic({ seed: 9 }), a = K.createAccount({ userId: "u1", date: st.date });
  K.buy(a, { bondId: "LCL-29", qty: 200 }, st, ctx);
  K.buy(a, { bondId: "GOV-33", qty: 500 }, st, ctx);
  M.defaultIssuer(st, "LCL");
  const w = M.step(st), paid = K.settle(a, st, w.from, w.to);
  const rec = paid.find(p => p.type === "RECOVERY");
  assert.equal(rec.amount, Math.round(200 * 100000 * st.issuers.LCL.recovery.secured));
  assert.equal(a.holdings["LCL-29"], undefined);
  const need = K.cash(a) + 30000000;
  assert.match(K.redeem(a, need, st.date, "test", ctx).error, /Không đủ tiền mặt/);
  K.raiseCash(a, st, need, ctx, 0.5);
  assert.ok(K.cash(a) >= need);
  assert.ok(K.redeem(a, need, st.date, "test", ctx).ok);
  assert.ok(K.verify(a).ok);
});

test("portfolio risk: duration and convexity estimate vs full revaluation", () => {
  const st = M.createSynthetic({ seed: 2 }), a = K.createAccount({ userId: "u1", date: st.date });
  K.buy(a, { bondId: "GOV-36", qty: 400 }, st, ctx);
  K.buy(a, { bondId: "MGE-31", qty: 300 }, st, ctx);
  const r = K.risk(a, st, true);
  assert.ok(r.dur > 3 && r.dur < 9);
  near(r.krd.reduce((n, k) => n + k, 0), r.durNav, 0.3, "key rates add up to about the NAV duration");
  const s = K.shockPortfolio(a, st, E2.shiftCurve(st.curve, 0.01));
  assert.ok(s.actual < 0);
  assert.ok(Math.abs(s.error) < Math.abs(s.actual) * 0.08, "the estimate is within 8% of the full revaluation for +100 bp");
  const t = JSON.parse(JSON.stringify(a)); t.ledger[0].amount = 999e9;
  assert.equal(K.verify(t).ok, false);
});
const E2 = B;

test("historical replay: the curve comes from the data, one week at a time", () => {
  const pts = []; for (let i = 0; i < 10; i++) pts.push({ d: E2.addDays("2026-01-09", 7 * i), y: [3 + i / 10, 3.3, 3.7, 4.2, 4.4] });
  const v = M.validateCurveDataset({ kind: "bond-curve-dataset", tenors: [1, 3, 5, 10, 20], points: pts.concat([{ d: "bad", y: [1] }]) });
  assert.ok(v.ok); assert.equal(v.points.length, 10); assert.ok(v.problems.length === 1);
  const st = M.createReplay(v, { seed: 4 });
  near(st.curve.par[0], 0.03, 1e-12);
  M.step(st, v);
  assert.equal(st.date, pts[1].d); near(st.curve.par[0], 0.031, 1e-12);
  for (let i = 0; i < 20; i++) M.step(st, v);
  assert.ok(M.replayDone(st)); assert.equal(st.date, pts[9].d);
});

// ---------- Campaign ----------
const Q = require("../js/bond/missions.js");

test("campaign: 7 chapters, every learning module covered, 25 missions", () => {
  assert.equal(Q.CHAPTERS.length, 7);
  assert.equal(Q.MISSIONS.length, 25);
  const lms = new Set();
  for (const m of Q.MISSIONS) for (const part of m.lm.replace(/LM/g, "").split(/[–,]/)) lms.add(+part);
  for (const m of Q.MISSIONS) { const r = m.lm.match(/LM(\d+)–LM(\d+)/); if (r) for (let i = +r[1]; i <= +r[2]; i++) lms.add(i); }
  for (let i = 1; i <= 19; i++) assert.ok(lms.has(i), `LM${i}`);
  assert.ok(Q.MISSIONS.filter(m => m.type === "compute").length < Q.MISSIONS.length * 0.6, "most missions are not just number entry");
});

test("compute missions: the engine's own answers pass, wrong answers fail", () => {
  for (const m of Q.MISSIONS.filter(x => x.type === "compute")) {
    const d = m.data(), good = {}, bad = {};
    for (const f of d.inputs) { good[f.key] = f.kind === "date" ? f.answer : String(f.answer); bad[f.key] = f.kind === "date" ? "2000-01-01" : String(f.answer * 1.5 + 1); }
    if (d.choice) { good.choice = d.choice.correct; bad.choice = d.choice.options.find(o => o[0] !== d.choice.correct)[0]; }
    const r = m.check(good, d), w = m.check(bad, d);
    assert.ok(r.pass && r.score > 0.99, `${m.id} with the right answers`);
    assert.ok(!w.pass, `${m.id} with wrong answers`);
  }
});

test("action missions: term sheet, offers, auction, detective, factory, committee", () => {
  const tag = Q.missionById("c1-indenture");
  const right = {}; tag.data().items.forEach((_, i) => { right[i] = ["issuer", "maturity", "coupon", "par", "affirmative", "negative", "negative", "seniority", "trustee", "law"][i]; });
  assert.ok(tag.check(right).score === 1);
  const offers = Q.missionById("c1-offers"), breaks = {};
  for (const o of Q.OFFERS) { breaks[o.id] = {}; for (const r of o.breaks) breaks[o.id][r] = true; }
  assert.equal(offers.check({ pick: "B", breaks }).score, 1);
  assert.ok(!offers.check({ pick: "A", breaks: {} }).pass);
  const auc = Q.missionById("c1-auction").check({ yield: "4.00", amount: "300" });
  assert.ok(auc.auction.alloc.find(a => a.id === "Bạn").filled >= 300 - 1e-9);
  const det = Q.missionById("c5-detective"), t = Q.detectiveTruth(), pins = {};
  Q.LCL_CASE.facts.forEach(f => { if (f[2]) pins[f[0]] = true; });
  const good = det.check({ pins, coverage: t.coverage.toFixed(3), lev: t.lev.toFixed(2), rrSec: (t.rrSec * 100).toFixed(1), rrSub: (t.rrSub * 100).toFixed(1), sub: "sell", sec: "sell", pd: "high", limit: "zero" });
  assert.ok(good.score > 0.99, JSON.stringify(good.parts));
  assert.ok(!det.check({ pins: { f9: true, f10: true }, sub: "buy", pd: "low" }).pass);
  near(t.rrSec, (2100 + 400 * 3900 / 9300) / 2500, 1e-12);
  const abs = Q.missionById("c6-abs");
  assert.ok(abs.check({ s: "800", m: "170", e: "30" }).parts.compliance <= 1);
  assert.ok(!abs.check({ s: "990", m: "5", e: "5" }).pass, "too thin a cushion fails the stress test");
  const cmo = Q.missionById("c6-cmo");
  assert.ok(cmo.check({ a: "150", b: "200", c: "150" }).parts.compliance >= 0.5);
  const st = M.createSynthetic({ seed: 21 }), tr = Q.committeeTruth(st, "PLG-32");
  const cr = Q.committeeCheck({ bondId: "PLG-32", shock: tr.shock, defaultLoss: tr.defaultLoss, fair: tr.fair, risk: "credit", horizon: "medium", rec: tr.fair > tr.q.ask ? "buy" : "hold", plan: { spread: true, diversify: true } }, st);
  assert.ok(cr.score > 0.95, JSON.stringify(cr.parts));
});

test("career: XP from the best score of each mission, levels need chapters", () => {
  const p = {};
  assert.equal(Q.level(p).name, "Junior Analyst");
  for (const id of Q.CHAPTERS[0].missions) p[id] = { best: 1, passed: true };
  const L = Q.level(p);
  assert.equal(L.xp, Q.CHAPTERS[0].missions.reduce((n, id) => n + Q.missionById(id).xp, 0));
  assert.ok(L.lv <= 3);
  assert.ok(Q.chapterOpen(p, 2) && !Q.chapterOpen(p, 3));
});

test("fund scenario: scoring and endings", () => {
  const s = Q.fundScore({ ret: 0.02, benchRet: -0.01, maxDD: 0.02, breaches: 0, weeks: 12, redeemed: true, fireSale: false });
  assert.equal(s.ending[1], "Huyền thoại thị trường trái phiếu");
  const bad = Q.fundScore({ ret: -0.08, benchRet: -0.01, maxDD: 0.12, breaches: 20, weeks: 12, redeemed: false });
  assert.equal(bad.ending[1], "Bị thay thế");
});

test("hand-over of securities: no cash moves, the return is not inflated", () => {
  const st = M.createSynthetic({ seed: 31 }), a = K.createAccount({ userId: "u1", date: st.date });
  K.buy(a, { bondId: "GOV-30", qty: 990 }, st, ctx);
  const cash0 = K.cash(a), ret0 = K.performance(a, st).ret;
  assert.ok(K.transferIn(a, "SRR-28", 200, st, ctx, "test").ok);
  assert.equal(K.cash(a), cash0);
  assert.equal(a.holdings["SRR-28"].qty, 200);
  near(K.performance(a, st).ret, ret0, 1e-3, "a transfer is a flow, not a gain");
  assert.ok(K.sell(a, { bondId: "SRR-28", qty: 200 }, st, ctx).ok);
  assert.ok(K.verify(a).ok);
});

// Tests for the Derivatives Trading Arena: engine (orders, margin, P&L, ledger), market data and store
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/arena/engine.js");
const M = require("../js/arena/market.js");
const ST = require("../js/arena/store.js");

const S = E.SPECS.VN30F1M;
const ctx = { userId: "u1" };
let cidN = 0;
const cid = () => `c${++cidN}`;
function mkt(mark, o) {
  o = o || {};
  const ref = o.ref || mark, lim = E.limitsFor(S, ref);
  return { t: o.t || 1000, open: o.open !== false, queue: !!o.queue,
    q: { VN30F1M: { mark, ref, ceil: lim.ceil, floor: lim.floor, contract: o.contract || "VN30F2612", exp: "2026-12-17", stale: !!o.stale, depthScale: 1 } } };
}
const acct = () => E.createAccount({ id: "practice", userId: "u1", t: 0 });
const buy = (a, qty, m, extra) => E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "MKT", qty, ...(extra || {}) }, m, ctx);
const sell = (a, qty, m, extra) => E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "S", type: "MKT", qty, ...(extra || {}) }, m, ctx);
const bar = (o, h, l, c, t) => ({ t: t || 2000, o, h, l, c });
const pos = a => E.openPos(a, "VN30F1M");

test("100 million ₫ of virtual money on a new account, recorded in the ledger", () => {
  const a = acct(), m = E.metrics(a);
  assert.equal(m.cash, 100000000);
  assert.equal(m.equity, 100000000);
  assert.equal(a.ledger[0].type, "INITIAL");
  assert.ok(E.verify(a).ok);
});

test("long P&L = (exit − entry) × multiplier × quantity, exact to the đồng", () => {
  const a = acct();
  assert.ok(buy(a, 1, mkt(180000)).ok);                       // fills at the ask, 1800.1, not at the mark 1800.0
  assert.equal(pos(a).lots[0].px, 180010);
  E.onBar(a, "VN30F1M", bar(180000, 181000, 180000, 181000), mkt(181000));
  assert.equal(E.metrics(a).unreal, (181000 - 180010) * 1000);   // 0.99 point × 100,000 ₫
  assert.ok(sell(a, 1, mkt(181000)).ok);                      // closes at the bid, 1809.9
  const m = E.metrics(a);
  assert.equal(m.realized, (180990 - 180010) * 1000);
  assert.equal(m.fees, 10000);
  assert.equal(m.cash, 100000000 + 980000 - 10000);
  assert.equal(m.unreal, 0);
  assert.ok(E.verify(a).ok);
});

test("short P&L = (entry − exit) × multiplier × quantity", () => {
  const a = acct();
  assert.ok(sell(a, 2, mkt(180000)).ok);
  assert.equal(pos(a).side, -1);
  assert.ok(buy(a, 2, mkt(179000)).ok);
  assert.equal(E.metrics(a).realized, (179990 - 179010) * 2 * 1000);
  assert.equal(E.metrics(a).fees, 4 * 5000);
});

test("fees: one per contract per fill, each a ledger entry", () => {
  const a = acct();
  buy(a, 3, mkt(180000));
  const fees = a.ledger.filter(e => e.type === "FEE");
  assert.equal(fees.length, 1);
  assert.equal(fees[0].amount, -15000);
});

test("initial and maintenance margin", () => {
  assert.equal(E.imOf(S, 2, 180000), 61200000);              // 2 × 180,000,000 × 17%
  assert.equal(E.mmFromIm(61200000), 48960000);              // 80% of IM
  assert.equal(E.liqFromMm(48960000), 24480000);             // 50% of MM
  const a = acct();
  buy(a, 2, mkt(180000));
  const m = E.metrics(a);
  assert.equal(m.im, E.imOf(S, 2, 180000));
  assert.equal(m.available, m.equity - m.im - m.reserved);
});

test("an order beyond the available margin is refused and changes nothing", () => {
  const a = acct(), before = JSON.stringify({ o: a.orders, l: a.ledger, p: a.positions });
  const r = buy(a, 4, mkt(180000));                          // 4 contracts need 122.4 million of IM
  assert.equal(r.ok, false);
  assert.match(r.error, /Không đủ ký quỹ/);
  assert.equal(JSON.stringify({ o: a.orders, l: a.ledger, p: a.positions }), before);
  assert.equal(E.metrics(a).cash, 100000000);
});

test("two pending orders cannot use the same margin", () => {
  const a = acct(), m = mkt(180000);
  const r1 = E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 2, px: 179000 }, m, ctx);
  assert.ok(r1.ok);
  assert.ok(E.metrics(a).reserved > 60000000);
  const r2 = E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 2, px: 179000 }, m, ctx);
  assert.equal(r2.ok, false);
  assert.match(r2.error, /Không đủ ký quỹ/);
});

test("a market order fills at the ask plus slippage, never at the displayed price", () => {
  const q = mkt(180000).q.VN30F1M;
  assert.equal(E.marketPx(S, q, "B", 1), 180010);
  assert.equal(E.marketPx(S, q, "B", 120), 180010 + 2 * 10);   // 120 contracts: 2 ticks of slippage
  assert.equal(E.marketPx(S, q, "S", 51), 179990 - 10);
  const a = acct();
  buy(a, 1, mkt(180000), { px: 100, price: 100 });             // a price sent by the page is ignored
  assert.equal(a.fills[0].px, 180010);
});

test("limit orders wait, fill at the limit, and fill at the open after a gap", () => {
  const a = acct(), m = mkt(180000);
  E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 1, px: 179500 }, m, ctx);
  E.onBar(a, "VN30F1M", bar(180000, 180100, 179495, 179800), m);  // ask reaches 1795.05 only: no fill
  assert.equal(a.fills.length, 0);
  E.onBar(a, "VN30F1M", bar(179800, 179900, 179480, 179700), m);  // ask reaches 1794.9: fills at 1795.0
  assert.equal(a.fills[0].px, 179500);
  const b = acct();
  E.placeOrder(b, { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 1, px: 179500 }, m, ctx);
  E.onBar(b, "VN30F1M", bar(179000, 179200, 178900, 179100), m);  // opens below the limit: fills at the open's ask
  assert.equal(b.fills[0].px, 179010);
});

test("stop orders trigger at the stop, and a gap through the stop fills at the open", () => {
  const m = mkt(180000);
  const a = acct();
  E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "STP", qty: 1, stop: 180500 }, m, ctx);
  E.onBar(a, "VN30F1M", bar(180000, 180600, 179900, 180550), m);
  assert.equal(a.fills[0].px, 180500);
  const b = acct();
  E.placeOrder(b, { cid: cid(), sym: "VN30F1M", side: "B", type: "STP", qty: 1, stop: 180500 }, m, ctx);
  E.onBar(b, "VN30F1M", bar(181000, 181200, 180900, 181100), m);
  assert.equal(b.fills[0].px, 181010);
  const r = E.placeOrder(acct(), { cid: cid(), sym: "VN30F1M", side: "B", type: "STP", qty: 1, stop: 179000 }, m, ctx);
  assert.equal(r.ok, false);                                  // a buy stop below the market would fire at once
});

test("Stop Loss: a gap fills worse than the stop, and the Take Profit is cancelled (OCO)", () => {
  const a = acct();
  assert.ok(buy(a, 1, mkt(180000), { sl: 179000, tp: 182000 }).ok);
  const prot = a.orders.filter(o => o.status === "PENDING");
  assert.deepEqual(prot.map(o => o.tag).sort(), ["SL", "TP"]);
  E.onBar(a, "VN30F1M", bar(178000, 178200, 177500, 177800), mkt(178000, { ref: 180000 }));
  const f = a.fills[a.fills.length - 1];
  assert.equal(f.tag, "SL");
  assert.equal(f.px, 177990);                                  // the open's bid, below the 1790.0 stop
  assert.equal(pos(a), null);
  assert.equal(a.orders.filter(o => o.status === "PENDING").length, 0);
});

test("when one bar touches both, the Stop Loss is assumed first (conservative)", () => {
  const a = acct();
  buy(a, 1, mkt(180000), { sl: 179000, tp: 181000 });
  E.onBar(a, "VN30F1M", bar(180000, 181500, 178900, 180000), mkt(180000));
  assert.equal(a.fills[a.fills.length - 1].tag, "SL");
  assert.equal(a.fills[a.fills.length - 1].px, 179000);
});

test("partial close uses first-in first-out lots; protection follows the size", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  buy(a, 1, mkt(181000));
  assert.deepEqual(pos(a).lots.map(l => l.px), [180010, 181010]);
  E.setProtection(a, "VN30F1M", { sl: 179000 }, mkt(181000), ctx);
  assert.ok(E.closePosition(a, "VN30F1M", 1, mkt(182000), ctx).ok);
  assert.equal(E.metrics(a).realized, (181990 - 180010) * 1000);
  assert.equal(pos(a).qty, 1);
  assert.deepEqual(pos(a).lots.map(l => l.px), [181010]);
  assert.equal(a.orders.find(o => o.status === "PENDING" && o.tag === "SL").qty, 1);
  assert.ok(E.verify(a).ok);
});

test("reverse turns a long into a short of the same size", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  const first = pos(a).id;
  assert.ok(E.reversePosition(a, "VN30F1M", mkt(180500), ctx).ok);
  assert.equal(pos(a).side, -1);
  assert.equal(pos(a).qty, 1);
  assert.equal(a.positions.find(p => p.id === first).status, "CLOSED");
  assert.ok(E.verify(a).ok);
});

test("a price drop below maintenance margin puts the account in margin call; only risk-reducing orders pass", () => {
  const a = acct();
  assert.ok(buy(a, 3, mkt(180000)).ok);
  E.onBar(a, "VN30F1M", bar(180000, 180000, 169000, 169000), mkt(169000, { ref: 180000 }));
  const m = E.metrics(a);
  assert.ok(m.equity < m.mm);
  assert.equal(a.status, "MARGIN_CALL");
  assert.match(buy(a, 1, mkt(169000)).error, /Margin Call/);
  assert.ok(sell(a, 2, mkt(169000)).ok);                       // reducing is allowed
  assert.equal(a.status, "OK");                                // equity is back above IM of what is left
});

test("forced liquidation closes the fewest contracts and leaves equity at or above IM", () => {
  const a = acct();
  buy(a, 3, mkt(180000));
  E.onBar(a, "VN30F1M", bar(180000, 180000, 167400, 167400), mkt(167400, { ref: 180000 }));
  assert.equal(a.status, "MARGIN_CALL");
  const lv = E.liqLevel(a, "VN30F1M");
  assert.ok(lv > 155690 && lv < 167400);
  E.onBar(a, "VN30F1M", bar(167000, 167000, 155700, 156000), mkt(156000, { ref: 167400 }));
  const liq = a.fills.filter(f => f.tag === "LIQ");
  assert.ok(liq.length >= 1);
  assert.ok(liq[0].px <= Math.round(lv));
  assert.ok(liq[0].qty < 3);                                   // not everything: only what restores the margin
  assert.equal(a.stats.liq >= 1, true);
  assert.ok(a.audit.some(x => x.act === "LIQUIDATION"));
  assert.ok(E.verify(a).ok);
});

test("expiry settles at the final settlement price, without a fee", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  E.settleExpiry(a, "VN30F1M", "VN30F2612", 181234, 5000);
  const p = a.positions[0];
  assert.equal(p.status, "SETTLED");
  assert.equal(p.realized, (181234 - 180010) * 1000);
  assert.equal(a.fills[a.fills.length - 1].fee, 0);
  assert.ok(E.verify(a).ok);
});

test("closed market: market orders refused, limit orders accepted; stale prices refused", () => {
  const a = acct();
  assert.match(buy(a, 1, mkt(180000, { open: false })).error, /đóng cửa/);
  assert.ok(E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 1, px: 179000 }, mkt(180000, { open: false }), ctx).ok);
  assert.match(buy(acct(), 1, mkt(180000, { stale: true })).error, /Giá chưa được cập nhật/);
});

test("prices must sit inside the daily band and on the 0.1-point tick", () => {
  const m = mkt(180000), lim = m.q.VN30F1M;
  assert.equal(lim.ceil, 192600); assert.equal(lim.floor, 167400);
  assert.match(E.placeOrder(acct(), { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 1, px: lim.ceil + 10 }, m, ctx).error, /biên độ/);
  assert.match(E.placeOrder(acct(), { cid: cid(), sym: "VN30F1M", side: "B", type: "LMT", qty: 1, px: 179005 }, m, ctx).error, /bước giá/);
  const lim2 = E.limitsFor(S, 179110);                         // reference 1791.1 → band 1665.8–1916.4, as on the exchange
  assert.deepEqual([lim2.floor, lim2.ceil], [166580, 191640]);
});

test("the same order sent twice (double click, retry) is processed once", () => {
  const a = acct(), m = mkt(180000);
  const req = { cid: "same-click", sym: "VN30F1M", side: "B", type: "MKT", qty: 1 };
  assert.ok(E.placeOrder(a, req, m, ctx).ok);
  const r = E.placeOrder(a, req, m, ctx);
  assert.ok(r.duplicate);
  assert.equal(a.fills.length, 1);
  assert.equal(pos(a).qty, 1);
});

test("closing twice: the second close finds no position", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  assert.ok(E.closePosition(a, "VN30F1M", null, mkt(180000), ctx).ok);
  assert.equal(E.closePosition(a, "VN30F1M", null, mkt(180000), ctx).ok, false);
});

test("a failure in the middle of an action rolls everything back", () => {
  const a = acct();
  let reads = 0;
  const q = mkt(180000).q.VN30F1M;
  const trap = new Proxy(q, { get(t, k) { if (k === "depthScale" && ++reads > 1) throw new TypeError("feed broke"); return t[k]; } });
  const before = JSON.stringify(a.orders) + JSON.stringify(a.ledger);
  const r = E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "MKT", qty: 1 }, { t: 1, open: true, q: { VN30F1M: trap } }, ctx);
  assert.equal(r.ok, false);
  assert.match(r.error, /hoàn tác/);
  assert.equal(JSON.stringify(a.orders) + JSON.stringify(a.ledger), before);
});

test("authorization: one user cannot trade on another user's account", () => {
  const a = acct();
  const r = E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "MKT", qty: 1 }, mkt(180000), { userId: "u2" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Không có quyền/);
  assert.equal(E.resetAccount(a, 1, { userId: "u2" }).ok, false);
});

test("ledger reconciliation after many trades: cash = initial + realized − fees", () => {
  const a = acct();
  let px = 180000;
  for (let i = 0; i < 30; i++) {
    const m = mkt(px);
    if (i % 3 === 0) buy(a, 1 + (i % 2), m);
    else if (i % 3 === 1) sell(a, 2, m);
    else if (pos(a)) E.closePosition(a, "VN30F1M", null, m, ctx);
    px += (i % 5 - 2) * 150;
    E.onBar(a, "VN30F1M", bar(px, px + 200, px - 200, px), mkt(px));
  }
  const m = E.metrics(a), pnl = a.fills.reduce((n, f) => n + f.pnl, 0), fees = a.fills.reduce((n, f) => n + f.fee, 0);
  assert.equal(m.cash, 100000000 + pnl - fees);
  assert.equal(m.realized, pnl);
  assert.ok(E.verify(a).ok, E.verify(a).problems.join("; "));
});

test("raising the balance by editing saved data is detected", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  sell(a, 1, mkt(181000));
  const t1 = JSON.parse(JSON.stringify(a));
  t1.ledger[0].amount = 900000000;                             // edit the initial deposit
  assert.equal(E.verify(t1).ok, false);
  const t2 = JSON.parse(JSON.stringify(a));
  t2.ledger.push({ id: "L999999", t: 1, type: "PNL", amount: 50000000, ref: "", note: "" });
  assert.equal(E.verify(t2).ok, false);
  const t3 = JSON.parse(JSON.stringify(a));
  buy(t3, 1, mkt(180000));
  t3.positions.find(p => p.status === "OPEN").lots[0].px = 100000;   // a cheaper entry → bigger unrealized gain
  assert.equal(E.verify(t3).ok, false);
});

test("demo reset: a fresh 100 million, with the reset kept in the history", () => {
  const a = acct();
  buy(a, 1, mkt(180000));
  sell(a, 1, mkt(179000));
  assert.ok(E.resetAccount(a, 9000, ctx).ok);
  assert.equal(E.metrics(a).cash, 100000000);
  assert.equal(a.ledger[0].type, "RESET");
  assert.equal(a.resets.length, 1);
  assert.ok(a.resets[0].equity < 100000000);
  assert.equal(a.positions.length, 0);
  assert.ok(E.verify(a).ok);
});

test("analytics come from the account's own trades", () => {
  const a = acct();
  buy(a, 1, mkt(180000)); sell(a, 1, mkt(181000));            // win
  buy(a, 1, mkt(181000)); sell(a, 1, mkt(180500));            // loss
  const x = E.analytics(a, {});
  assert.equal(x.n, 2);
  assert.equal(x.wins, 1);
  assert.equal(x.winRate, 0.5);
  assert.equal(x.best.net, (180990 - 180010) * 1000 - 10000);
  assert.equal(x.worst.net, (180490 - 181010) * 1000 - 10000);
  assert.equal(x.pf, x.best.net / -x.worst.net);
});

// ---------- Market data ----------
test("synthetic market: same seed, same prices; prices on the tick and inside the band", () => {
  const a = M.createSynthetic({ seed: 42, start: "2026-11-23" }), b = M.createSynthetic({ seed: 42, start: "2026-11-23" });
  const ea = M.advance(a, 3600), eb = M.advance(b, 3600);
  assert.deepEqual(ea.map(e => e.bar && e.bar.c), eb.map(e => e.bar && e.bar.c));
  for (const e of ea.filter(x => x.type === "bar")) {
    const x = a.syms[e.sym];
    assert.equal(e.bar.c % 10, 0);
    assert.ok(e.bar.c <= x.ceil && e.bar.c >= x.floor);
  }
  const c = M.createSynthetic({ seed: 43, start: "2026-11-23" });
  assert.notEqual(M.advance(c, 3600).filter(e => e.type === "bar").pop().bar.c, ea.filter(e => e.type === "bar").pop().bar.c);
});

test("synthetic market: a session lasts 270 minutes, skips lunch, then closes", () => {
  const st = M.createSynthetic({ seed: 7, start: "2026-11-23", preDays: 0 });
  assert.equal(st.phase, "open");
  const ev = M.advance(st, 270 * 60 + 600);
  assert.ok(ev.some(e => e.type === "lunch"));
  assert.ok(ev.some(e => e.type === "close"));
  assert.equal(st.phase, "closed");
  M.openDay(st);
  assert.equal(st.day, "2026-11-24");
});

test("calendar: weekends, holidays and the monthly expiry (third Thursday)", () => {
  assert.equal(M.expiryOf(2026, 11), "2026-11-19");
  assert.equal(M.expiryOf(2026, 12), "2026-12-17");
  assert.equal(M.contractFor("VN30F", "2026-11-19").code, "VN30F2611");
  assert.equal(M.contractFor("VN30F", "2026-11-20").code, "VN30F2612");
  assert.equal(M.nextTradingDay("2026-11-20"), "2026-11-23");
  assert.equal(M.isTradingDay("2026-09-02"), false);
});

test("synthetic market reports an expiry on the contract's last trading day", () => {
  const st = M.createSynthetic({ seed: 5, start: "2026-12-17", preDays: 0 });
  assert.equal(st.syms.VN30F1M.contract, "VN30F2612");
  const ev = M.advance(st, 271 * 60);
  assert.ok(ev.some(e => e.type === "expiry" && e.contract === "VN30F2612"));
  M.openDay(st);
  assert.equal(st.syms.VN30F1M.contract, "VN30F2701");
});

test("candles: 5-minute bars aggregate the 1-minute bars", () => {
  const rows = [], t0 = M.wall("2026-11-23", 525);
  for (let i = 0; i < 10; i++) rows.push([t0 + i * 60, 100 + i, 105 + i, 95 + i, 101 + i, 10]);
  const five = M.aggregate(rows, 5);
  assert.equal(five.length, 2);
  assert.deepEqual(five[0], [t0, 100, 109, 95, 105, 50]);
});

test("dataset check: bad candles dropped, order fixed, repeated dates kept once", () => {
  const good = (d, c) => ({ d, c: "VN30F2612", exp: "2026-12-17", o: c, h: c + 100, l: c - 100, cl: c, v: 10, ref: c, idx: null });
  const bars = [];
  for (let i = 0; i < 45; i++) bars.push(good(M.addDays("2026-01-05", i), 180000 + i * 10));
  bars.push({ ...good("2026-03-30", 180000), h: 170000 });         // high below the close
  bars.push(good("2026-01-05", 181000));                           // repeated date
  bars.reverse();                                                  // wrong order
  const v = M.validateDataset({ kind: "arena-dataset", symbol: "VN30F1M", bars });
  assert.ok(v.ok);
  assert.equal(v.bars.length, 45);
  assert.ok(v.bars.every((b, i) => !i || b.d > v.bars[i - 1].d));
  assert.ok(v.problems.some(p => /sai thứ tự/.test(p)));
  assert.ok(v.problems.some(p => /nến lỗi/.test(p)));
});

test("replay never shows the future: only revealed sessions reach the chart", () => {
  const bars = [];
  for (let i = 0; i < 80; i++) bars.push({ d: M.addDays("2026-01-05", i), c: "VN30F2612", exp: "2026-12-17", o: 180000, h: 180500, l: 179500, cl: 180000 + i * 10, v: 1, ref: 180000, idx: null });
  const ds = { bars, sym: "VN30F1M", meta: { id: "t" } };
  const st = M.createReplay(ds, { start: 40, length: 10 });
  assert.equal(M.replayCandles(st, bars).length, 41);
  const q = M.replayQuote(st, bars);
  assert.equal(q.q.VN30F1M.mark, bars[40].cl);
  assert.equal(JSON.stringify(q).includes(String(bars[41].cl)), false);
  M.replayNext(st, bars);
  assert.equal(M.replayCandles(st, bars).length, 42);
});

test("replay: market orders wait for the next session's open", () => {
  const bars = [];
  for (let i = 0; i < 60; i++) bars.push({ d: M.addDays("2026-01-05", i), c: "VN30F2612", exp: "2026-12-17", o: 180000 + i * 100, h: 180500 + i * 100, l: 179500 + i * 100, cl: 180000 + i * 100, v: 1, ref: 180000 + i * 100, idx: null });
  const st = M.createReplay({ bars, sym: "VN30F1M", meta: { id: "t" } }, { start: 40, length: 5 });
  const a = acct();
  assert.ok(E.placeOrder(a, { cid: cid(), sym: "VN30F1M", side: "B", type: "MKT", qty: 1 }, M.replayQuote(st, bars), ctx).ok);
  assert.equal(a.fills.length, 0);
  const ev = M.replayNext(st, bars)[0];
  E.onBar(a, ev.sym, ev.bar, { t: ev.bar.t, open: true, q: { VN30F1M: ev.q } });
  assert.equal(a.fills[0].px, bars[41].o + 10);
});

test("indicators: SMA, EMA, RSI, MACD and Bollinger bands", () => {
  assert.deepEqual(M.sma([1, 2, 3, 4], 2), [null, 1.5, 2.5, 3.5]);
  const e = M.ema([1, 2, 3, 4, 5], 3);
  assert.equal(e[2], 2); assert.equal(e[3], 3); assert.equal(e[4], 4);
  const up = M.rsi(Array.from({ length: 20 }, (_, i) => i), 14);
  assert.equal(up[19], 100);
  const bb = M.bollinger([2, 2, 2, 2], 2, 2);
  assert.equal(bb.up[3], 2);
  assert.ok(M.macd(Array.from({ length: 60 }, (_, i) => i)).hist.some(x => x != null));
});

// ---------- Store ----------
function fakeStorage() {
  const m = new Map();
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}

test("each user has an independent wallet", () => {
  const s = fakeStorage();
  const h1 = ST.open(s, "alice"), h2 = ST.open(s, "bob");
  ST.startPractice(h1, { seed: 1 }); ST.save(h1);
  ST.startPractice(h2, { seed: 1 }); ST.save(h2);
  assert.notEqual(ST.KEY("alice"), ST.KEY("bob"));
  assert.equal(ST.open(s, "alice").state.accounts.practice.userId, "alice");
  assert.equal(ST.open(s, "bob").state.accounts.practice.userId, "bob");
});

test("two tabs: a stale tab cannot overwrite a newer save", () => {
  const s = fakeStorage();
  const a = ST.open(s, "u1");
  ST.startPractice(a, { seed: 3 });
  assert.ok(ST.save(a).ok);
  const tab1 = ST.open(s, "u1"), tab2 = ST.open(s, "u1");
  tab1.state.prefs.x = 1;
  assert.ok(ST.save(tab1).ok);
  tab2.state.prefs.x = 2;
  assert.deepEqual(ST.save(tab2), { ok: false, conflict: true });
  ST.load(tab2);
  assert.equal(tab2.state.prefs.x, 1);
  assert.ok(ST.save(tab2).ok);
});

test("an account edited in storage is flagged on load", () => {
  const s = fakeStorage();
  const h = ST.open(s, "u1");
  ST.startPractice(h, { seed: 4 });
  ST.save(h);
  const raw = JSON.parse(s.getItem(ST.KEY("u1")));
  raw.accounts.practice.ledger[0].amount = 5000000000;
  s.setItem(ST.KEY("u1"), JSON.stringify(raw));
  const h2 = ST.open(s, "u1");
  assert.ok(h2.flags.practice && h2.flags.practice.length);
});

test("order spam: at most 8 orders in 5 seconds", () => {
  const h = ST.open(fakeStorage(), "u1");
  let ok = 0;
  for (let i = 0; i < 12; i++) if (ST.allowOrder(h, 1000 + i)) ok++;
  assert.equal(ok, 8);
  assert.ok(ST.allowOrder(h, 7000));
});

test("challenge rules are checked from the account", () => {
  const h = ST.open(fakeStorage(), "u1");
  const slot = ST.startChallenge(h, "warmup");
  const a = ST.account(h, slot);
  a.meta.sessions = 3;
  const r = ST.evalChallenge(h, slot);
  assert.equal(r.done, true);
  assert.equal(r.passed, false);                               // no trades, no +3%
  assert.ok(r.fails.length);
});

test("history compaction keeps the balance, the checks and the statistics", () => {
  const a = acct();
  let px = 180000;
  for (let i = 0; i < 40; i++) {
    buy(a, 1, mkt(px)); px += i % 3 === 0 ? -400 : 300; sell(a, 1, mkt(px));
  }
  const before = E.metrics(a), stats = E.analytics(a, {});
  assert.equal(E.compact(a, 50), true);
  assert.equal(a.fills.length, 0);
  const after = E.metrics(a), s2 = E.analytics(a, {});
  assert.equal(after.cash, before.cash);
  assert.equal(after.realized, before.realized);
  assert.equal(after.fees, before.fees);
  assert.equal(s2.n, stats.n);
  assert.equal(s2.winRate, stats.winRate);
  assert.ok(E.verify(a).ok, E.verify(a).problems.join("; "));
  buy(a, 1, mkt(px)); sell(a, 1, mkt(px + 500));                  // trading continues on top of the checkpoint
  assert.ok(E.verify(a).ok, E.verify(a).problems.join("; "));
  assert.equal(E.metrics(a).cash, after.cash + (px + 490 - (px + 10)) * 1000 - 10000);
  const t = JSON.parse(JSON.stringify(a));
  t.base.cash += 1000000000;                                       // raise the balance inside the checkpoint
  assert.equal(E.verify(t).ok, false);
  const busy = acct();
  buy(busy, 1, mkt(180000));
  assert.equal(E.compact(busy, 0), false);                          // never while a position is open
});

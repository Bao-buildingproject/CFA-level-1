// ============================================================
// bond/book.js — Bond Empire: the portfolio engine and the transaction ledger
//
// One virtual account: cash is the sum of a ledger in whole đồng; holdings are kept in
// first-in first-out lots with their clean cost and the accrued interest paid. Trades
// settle at the full (dirty) price = clean ± half the bid/ask spread + accrued interest,
// plus a fee. Coupons and principal are paid on their (business-day adjusted) payment
// dates as the clock passes them; a default pays the recovery value at once.
// Every action runs on a copy and is committed only if it completes (all or nothing);
// a price sent by the page is never used: prices come from the market state.
// ============================================================
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./engine.js") : root.BondEngine, node ? require("./market.js") : root.BondMarket);
  if (node) module.exports = api;
  else root.BondBook = api;
})(typeof self !== "undefined" ? self : this, function (E, M) {
  "use strict";
  const INITIAL = 100000000, FEE_BPS = 3, FACE = M.FACE;   // fee 0.03% of the trade value (simulation assumption)
  class BookError extends Error {}
  const must = (ok, msg) => { if (!ok) throw new BookError(msg); };
  const isInt = Number.isSafeInteger;
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const key = e => `${e.id}|${e.date}|${e.type}|${e.amount}|${e.ref}`;
  const vnd = n => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;

  function nextId(a, p) { a.seq += 1; return p + String(a.seq).padStart(6, "0"); }
  function post(a, date, type, amount, ref, note) {
    must(isInt(amount), "Số tiền không phải số nguyên");
    const e = { id: nextId(a, "L"), date, type, amount, ref: ref || "", note: note || "" };
    a.ledger.push(e); a.hL = hash(a.hL + "#" + key(e));
    return e;
  }
  function audit(a, date, act, msg) { a.audit.push({ date, act, msg }); if (a.audit.length > 300) a.audit.shift(); }
  function createAccount(o) {
    const a = { v: 1, userId: o.userId, slot: o.slot || "free", label: o.label || "", initial: o.initial || INITIAL, created: o.date, seq: 0,
      ledger: [], holdings: {}, trades: [], hL: "", cids: {}, curve: [], audit: [], flows: 0, realized: 0, income: 0, fees: 0, meta: {} };
    post(a, o.date, "INITIAL", a.initial, "", "Vốn ảo ban đầu");
    a.curve.push({ date: o.date, nav: a.initial });
    return a;
  }
  const cash = a => a.ledger.reduce((n, e) => n + e.amount, 0);
  const clone = x => JSON.parse(JSON.stringify(x));
  function txn(a, ctx, date, fn) {
    if (!ctx || ctx.userId !== a.userId) return { ok: false, error: "Không có quyền thao tác trên tài khoản này" };
    const x = clone(a);
    try {
      const r = fn(x) || {};
      for (const h of Object.values(x.holdings)) if (h.lots.reduce((n, l) => n + l.q, 0) !== h.qty || h.qty <= 0) throw new Error("Sai lệch lô");
      if (cash(x) < 0) throw new Error("Tiền mặt âm");
      Object.keys(a).forEach(k => delete a[k]); Object.assign(a, x);
      return { ok: true, ...r };
    } catch (e) {
      const msg = e instanceof BookError ? e.message : `Lỗi hệ thống, giao dịch đã được hoàn tác (${e.message})`;
      audit(a, date, "REJECT", msg);
      return { ok: false, error: msg };
    }
  }
  const tradeValue = (qty, pricePer100) => Math.round(qty * FACE * pricePer100 / 100);
  const feeOf = v => Math.round(Math.abs(v) * FEE_BPS / 10000);

  // ---------- Trading ----------
  function buy(a, req, st, ctx) {
    if (req.cid && a.cids[req.cid]) return { ok: true, duplicate: true, trade: a.trades.find(t => t.id === a.cids[req.cid]) };
    return txn(a, ctx, st.date, x => {
      const q = M.quote(st, req.bondId);
      must(q, "Trái phiếu không còn lưu hành");
      must(!q.defaulted, "Trái phiếu đã vỡ nợ: ngừng giao dịch trong trò chơi");
      must(isInt(req.qty) && req.qty >= 1 && req.qty <= 1000000, "Số lượng phải là số nguyên từ 1 đến 1.000.000 trái phiếu");
      const gross = tradeValue(req.qty, q.ask + q.ai), fee = feeOf(gross);
      must(cash(x) >= gross + fee, `Không đủ tiền: cần ${vnd(gross + fee)}, có ${vnd(cash(x))}`);
      const t = { id: nextId(x, "T"), date: st.date, side: "BUY", bondId: req.bondId, qty: req.qty, clean: q.ask, ai: q.ai, ytm: q.ytm, gross, fee };
      x.trades.push(t);
      post(x, st.date, "BUY", -gross, t.id, `Mua ${req.qty} ${req.bondId} @ ${q.ask.toFixed(3)} + lãi dồn tích ${q.ai.toFixed(3)}`);
      if (fee) post(x, st.date, "FEE", -fee, t.id);
      x.fees += fee;
      const h = x.holdings[req.bondId] || (x.holdings[req.bondId] = { id: req.bondId, qty: 0, lots: [] });
      h.qty += req.qty; h.lots.push({ q: req.qty, clean: q.ask, ai: q.ai, date: st.date });
      if (req.cid) x.cids[req.cid] = t.id;
      return { trade: t };
    });
  }
  function sell(a, req, st, ctx, opt) {
    if (req.cid && a.cids[req.cid]) return { ok: true, duplicate: true, trade: a.trades.find(t => t.id === a.cids[req.cid]) };
    return txn(a, ctx, st.date, x => {
      const h = x.holdings[req.bondId];
      must(h, "Không nắm giữ trái phiếu này");
      must(isInt(req.qty) && req.qty >= 1 && req.qty <= h.qty, `Số lượng bán phải từ 1 đến ${h ? h.qty : 0}`);
      const q = M.quote(st, req.bondId);
      must(q && !q.defaulted, "Trái phiếu không giao dịch được");
      const bid = q.bid - ((opt && opt.penalty) || 0);
      const gross = tradeValue(req.qty, bid + q.ai), fee = feeOf(gross);
      let left = req.qty, priceGain = 0, interest = 0;
      while (left > 0) {
        const l = h.lots[0], take = Math.min(l.q, left);
        priceGain += take * FACE * (bid - l.clean) / 100;
        interest += take * FACE * (q.ai - l.ai) / 100;
        l.q -= take; left -= take;
        if (!l.q) h.lots.shift();
      }
      h.qty -= req.qty;
      if (!h.qty) delete x.holdings[req.bondId];
      const t = { id: nextId(x, "T"), date: st.date, side: "SELL", bondId: req.bondId, qty: req.qty, clean: bid, ai: q.ai, ytm: q.ytm, gross, fee,
        priceGain: Math.round(priceGain), interest: Math.round(interest), forced: !!(opt && opt.penalty) };
      x.trades.push(t);
      post(x, st.date, "SELL", gross, t.id, `Bán ${req.qty} ${req.bondId} @ ${bid.toFixed(3)} + lãi dồn tích ${q.ai.toFixed(3)}`);
      if (fee) post(x, st.date, "FEE", -fee, t.id);
      x.fees += fee; x.realized += t.priceGain; x.income += t.interest;
      if (req.cid) x.cids[req.cid] = t.id;
      return { trade: t };
    });
  }

  // Securities handed over to the account (no cash changes hands): booked at today's mid as an external inflow,
  // so the return of the account is not inflated by the transfer
  function transferIn(a, bondId, qty, st, ctx, note) {
    return txn(a, ctx, st.date, x => {
      const q = M.quote(st, bondId);
      must(q && !q.defaulted, "Không chuyển được trái phiếu này");
      must(isInt(qty) && qty >= 1, "Số lượng không hợp lệ");
      const value = tradeValue(qty, q.mid + q.ai);
      const t = { id: nextId(x, "T"), date: st.date, side: "TRANSFER", bondId, qty, clean: q.mid, ai: q.ai, ytm: q.ytm, gross: value, fee: 0 };
      x.trades.push(t);
      const h = x.holdings[bondId] || (x.holdings[bondId] = { id: bondId, qty: 0, lots: [] });
      h.qty += qty; h.lots.push({ q: qty, clean: q.mid, ai: q.ai, date: st.date });
      x.flows += value;
      audit(x, st.date, "TRANSFER", `${note || "Nhận bàn giao"} ${qty} ${bondId} (${vnd(value)})`);
      return { trade: t };
    });
  }

  // ---------- The clock passes: coupons, principal, defaults ----------
  function settle(a, st, from, to) {
    const x = clone(a), paid = [];
    for (const h of Object.values(x.holdings)) {
      const b = M.bondById(h.id), iss = st.issuers[b.issuer];
      if (iss && iss.defaulted && iss.defaulted <= to) {
        const rr = iss.recovery[b.seniority], amount = Math.round(h.qty * FACE * rr);
        const cost = h.lots.reduce((n, l) => n + l.q * FACE * l.clean / 100, 0);
        post(x, iss.defaulted, "RECOVERY", amount, h.id, `${b.name}: thu hồi ${(rr * 100).toFixed(0)}% mệnh giá sau vỡ nợ`);
        x.realized += Math.round(amount - cost) - Math.round(h.lots.reduce((n, l) => n + l.q * FACE * l.ai / 100, 0));
        paid.push({ type: "RECOVERY", id: h.id, amount });
        delete x.holdings[h.id];
        continue;
      }
      const flows = E.cashflows(b, E.addDays(from, -10), { index: st.curve.par[0] }).filter(c => c.pay > from && c.pay <= to);
      for (const c of flows) {
        const cpn = Math.round(h.qty * FACE * c.coupon / 100);
        if (cpn) {
          post(x, c.pay, "COUPON", cpn, h.id, `${b.name}: coupon kỳ ${E.str(E.ser(c.date))}`);
          const aiPaid = h.lots.reduce((n, l) => n + l.q * FACE * l.ai / 100, 0);
          x.income += Math.round(cpn - aiPaid);
          h.lots.forEach(l => { l.ai = 0; });
          paid.push({ type: "COUPON", id: h.id, amount: cpn });
        }
        if (c.principal) {
          const amt = Math.round(h.qty * FACE * c.principal / 100);
          post(x, c.pay, "PRINCIPAL", amt, h.id, `${b.name}: hoàn trả gốc khi đáo hạn`);
          x.realized += Math.round(h.lots.reduce((n, l) => n + l.q * FACE * (100 - l.clean) / 100, 0));
          paid.push({ type: "PRINCIPAL", id: h.id, amount: amt });
          delete x.holdings[h.id];
          break;
        }
      }
    }
    Object.keys(a).forEach(k => delete a[k]); Object.assign(a, x);
    return paid;
  }
  // External cash flows of a fund (a client redemption). Not enough cash → an error, so the caller can sell first.
  function redeem(a, amount, date, reason, ctx) {
    return txn(a, ctx, date, x => {
      must(isInt(amount) && amount > 0, "Số tiền rút không hợp lệ");
      must(cash(x) >= amount, `Không đủ tiền mặt để chi trả ${vnd(amount)}: cần bán bớt trái phiếu`);
      post(x, date, "REDEEM", -amount, "", reason || "Nhà đầu tư rút vốn");
      x.flows -= amount;
      return {};
    });
  }
  // Fire sale to raise cash: most liquid first (government, then by rating), at the bid minus a penalty
  function raiseCash(a, st, amount, ctx, penalty) {
    const order = Object.values(a.holdings).map(h => ({ h, q: M.quote(st, h.id) })).filter(x => x.q && !x.q.defaulted)
      .sort((p, q) => (M.RATINGS.indexOf(p.q.rating === "GOV" ? "AAA" : p.q.rating) - M.RATINGS.indexOf(q.q.rating === "GOV" ? "AAA" : q.q.rating)) || (p.q.rating === "GOV" ? -1 : 1));
    const sold = [];
    for (const { h, q } of order) {
      const need = amount - cash(a);
      if (need <= 0) break;
      const per = FACE * (q.bid - (penalty || 0) + q.ai) / 100;
      const n = Math.min(h.qty, Math.ceil(need / per / (1 - FEE_BPS / 10000)));
      const r = sell(a, { bondId: h.id, qty: n }, st, ctx, { penalty: penalty || 0 });
      if (r.ok) sold.push(r.trade);
    }
    return sold;
  }

  // ---------- Valuation and risk ----------
  function positions(a, st) {
    return Object.values(a.holdings).map(h => {
      const q = M.quote(st, h.id), b = M.bondById(h.id);
      if (!q) return null;
      const mv = h.qty * FACE * q.full / 100;
      const cost = h.lots.reduce((n, l) => n + l.q * FACE * (l.clean + l.ai) / 100, 0);
      const r = !q.defaulted && q.ytm != null ? E.yieldRisk(b, st.date, q.ytm, { index: q.index }) : null;
      return { id: h.id, bond: b, q, qty: h.qty, mv, cost, unreal: mv - cost, mod: r ? r.mod : 0, mac: r ? r.mac : 0, cvx: r ? r.cvx : 0,
        money: r ? r.mod * mv : 0, pvbp: r ? r.mod * mv * 0.0001 : 0, avgClean: h.lots.reduce((n, l) => n + l.q * l.clean, 0) / h.qty };
    }).filter(Boolean);
  }
  function risk(a, st, withKrd) {
    const pos = positions(a, st), c = cash(a), mvb = pos.reduce((n, p) => n + p.mv, 0), nav = c + mvb;
    const wd = (f) => mvb ? pos.reduce((n, p) => n + p.mv * f(p), 0) / mvb : 0;
    const out = { cash: c, bonds: mvb, nav, positions: pos, dur: wd(p => p.mod), mac: wd(p => p.mac), cvx: wd(p => p.cvx),
      durNav: nav ? pos.reduce((n, p) => n + p.mv * p.mod, 0) / nav : 0, money: pos.reduce((n, p) => n + p.money, 0), pvbp: pos.reduce((n, p) => n + p.pvbp, 0),
      ytm: wd(p => p.q.ytm || 0), byRating: {}, bySector: {}, cashPct: nav ? c / nav : 1 };
    for (const p of pos) {
      const r = p.q.rating, s = M.issuerById(p.bond.issuer).sector;
      out.byRating[r] = (out.byRating[r] || 0) + p.mv / nav;
      out.bySector[s] = (out.bySector[s] || 0) + p.mv / nav;
    }
    out.hy = pos.filter(p => p.q.rating !== "GOV" && !M.isIG(p.q.rating)).reduce((n, p) => n + p.mv, 0) / (nav || 1);
    if (withKrd) {
      const boot = M.bootOf(st);
      out.krd = st.curve.tenors.map(() => 0);
      for (const p of pos) {
        if (p.q.defaulted) continue;
        const r = E.curveRisk(p.bond, st.date, st.curve, p.q.z, { index: p.q.index });
        r.krd.forEach((k, i) => { out.krd[i] += k * p.mv / (nav || 1); });
      }
      void boot;
    }
    return out;
  }
  // Full revaluation after a curve change (spreads unchanged) against the duration/convexity estimate
  function shockPortfolio(a, st, curveAfter) {
    const before = risk(a, st), st2 = { ...st, curve: curveAfter, issuers: st.issuers, macro: st.macro };
    const pos2 = positions(a, st2), after = cash(a) + pos2.reduce((n, p) => n + p.mv, 0);
    let est = 0;
    for (const p of before.positions) {
      if (p.q.defaulted) continue;
      const T = Math.max(0.01, p.q.years);
      const dy = E.parAt(curveAfter, T) - E.parAt(st.curve, T);
      est += p.mv * (-p.mod * dy + 0.5 * p.cvx * dy * dy);
    }
    return { before: before.nav, after, actual: after - before.nav, estimate: est, error: est - (after - before.nav) };
  }
  function snapshot(a, st) {
    const nav = risk(a, st).nav, last = a.curve[a.curve.length - 1];
    if (last && last.date === st.date) last.nav = nav; else a.curve.push({ date: st.date, nav });
    if (a.curve.length > 600) a.curve.shift();
    return nav;
  }
  function performance(a, st) {
    const r = risk(a, st);
    let peak = -Infinity, maxDD = 0;
    for (const p of a.curve.concat([{ nav: r.nav }])) { peak = Math.max(peak, p.nav); if (peak > 0) maxDD = Math.max(maxDD, (peak - p.nav) / peak); }
    const invested = a.initial + a.flows;
    return { nav: r.nav, ret: invested ? (r.nav - invested) / a.initial : 0, income: a.income, realized: a.realized, fees: a.fees, maxDD,
      unreal: r.positions.reduce((n, p) => n + p.unreal, 0), trades: a.trades.length };
  }
  function verify(a) {
    const problems = [];
    let h = "";
    for (const e of a.ledger) h = hash(h + "#" + key(e));
    if (h !== a.hL) problems.push("Sổ cái đã bị sửa ngoài trò chơi");
    if (!a.ledger.length || a.ledger[0].type !== "INITIAL" || a.ledger[0].amount !== a.initial) problems.push("Vốn ban đầu không khớp");
    for (const x of Object.values(a.holdings)) if (x.lots.reduce((n, l) => n + l.q, 0) !== x.qty) problems.push(`Lô ${x.id} không khớp`);
    const bought = {}, sold = {};
    for (const t of a.trades) { const inn = t.side !== "SELL"; (inn ? bought : sold)[t.bondId] = ((inn ? bought : sold)[t.bondId] || 0) + t.qty; }
    for (const [id, x] of Object.entries(a.holdings)) if ((bought[id] || 0) - (sold[id] || 0) < x.qty) problems.push(`Số lượng ${id} lớn hơn số đã mua`);
    return { ok: !problems.length, problems };
  }

  return { INITIAL, FEE_BPS, FACE, createAccount, cash, buy, sell, transferIn, settle, redeem, raiseCash, positions, risk, shockPortfolio, snapshot, performance, verify, tradeValue, feeOf, vnd };
});

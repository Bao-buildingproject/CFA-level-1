// ============================================================
// arena/engine.js — Derivatives Trading Arena: the trading engine
//
// Orders, matching, positions, margin, liquidation, expiry and the ledger of one
// virtual account. Pure functions over plain objects: no DOM, no storage, no clock;
// the same file runs in the browser (window.ArenaEngine) and in Node tests.
//
// Exact arithmetic: money is whole đồng and prices are whole "price units" of
// 0.01 index point, so every amount is a safe integer — no floating point in money.
//   VN30F: 1 point = 100,000 ₫ per contract → 1 price unit = 1,000 ₫; tick = 0.1 point = 10 units.
//
// Every public action runs on a copy of the account and is committed only if it
// finishes and the account still balances (atomic, all or nothing). Cash is never
// stored: it is the sum of the ledger, and the ledger and the fills are hash-chained
// so an edit made outside the engine is detected (tamper-evident, not tamper-proof:
// the site has no server).
// ============================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArenaEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PU = 100;                    // price units per index point
  const INITIAL = 100000000;         // 100 million ₫ of virtual money
  // Contract specifications. Multiplier, tick and the ±7% daily band follow the HNX index
  // futures; the margin rate, fee, spread and depth are SIMULATION ASSUMPTIONS (see docs).
  const SPECS = {
    VN30F1M: { sym: "VN30F1M", root: "VN30F", name: "HĐTL chỉ số VN30 · tháng gần", underlying: "VN30",
      multiplier: 100000, tick: 10, unitValue: 1000, imBps: 1700, limitBps: 700,
      halfSpread: 10, depth: 50, fee: 5000, maxOrder: 500, maxPos: 2000 },
    VN100F1M: { sym: "VN100F1M", root: "VN100F", name: "HĐTL chỉ số VN100 · tháng gần", underlying: "VN100",
      multiplier: 100000, tick: 10, unitValue: 1000, imBps: 1700, limitBps: 700,
      halfSpread: 20, depth: 5, fee: 5000, maxOrder: 500, maxPos: 2000 }
  };
  // Risk rules (the whole policy, nothing else liquidates an account):
  //  · opening needs Available funds ≥ initial margin (IM) of the new contracts + fees
  //  · Margin Call when Equity < maintenance margin (MM = 80% of IM): only orders that reduce risk
  //    are accepted; the call ends when Equity is back at or above IM
  //  · Forced liquidation when Equity < liquidation level (50% of MM): the engine closes the
  //    fewest contracts at market (with slippage) that bring Equity back to IM of what is left
  const RISK = { mmPct: 80, liqPct: 50 };

  class ArenaError extends Error {}
  const isInt = Number.isSafeInteger;
  function must(ok, msg) { if (!ok) throw new ArenaError(msg); }
  function ceilDiv(a, b) {
    if (!(isInt(a) && a >= 0 && isInt(b) && b > 0)) throw new Error("ceilDiv: không phải số nguyên an toàn");
    return Math.floor((a + b - 1) / b);
  }
  function spec(sym) { const s = SPECS[sym]; must(!!s, "Sản phẩm không tồn tại"); return s; }
  const notional = (s, q, px) => q * px * s.unitValue;
  const imOf = (s, q, px) => q > 0 ? ceilDiv(notional(s, q, px) * s.imBps, 10000) : 0;
  const mmFromIm = im => ceilDiv(im * RISK.mmPct, 100);
  const liqFromMm = mm => ceilDiv(mm * RISK.liqPct, 100);
  const onTick = (s, px) => isInt(px) && px > 0 && px % s.tick === 0;
  const floorTick = (s, px) => Math.floor(px / s.tick) * s.tick;
  const ceilTick = (s, px) => Math.ceil(px / s.tick) * s.tick;
  // Daily price band around the reference price, rounded inward to the tick (HNX ±7%)
  function limitsFor(s, ref) {
    return { ceil: floorTick(s, Math.floor(ref * (10000 + s.limitBps) / 10000)),
      floor: ceilTick(s, Math.ceil(ref * (10000 - s.limitBps) / 10000)) };
  }
  const bidOf = (s, m) => m - s.halfSpread;
  const askOf = (s, m) => m + s.halfSpread;
  // Slippage of a market order: one extra tick for every `depth` contracts after the first ones
  const slipTicks = (s, q, scale) => Math.floor((q - 1) / Math.max(1, Math.floor(s.depth * (scale || 1))));
  const clampPx = (px, q) => q && isInt(q.ceil) ? Math.min(q.ceil, Math.max(q.floor, px)) : px;
  const sideNum = side => side === "B" ? 1 : -1;
  function marketPx(s, q, side, qty) {
    const slip = slipTicks(s, qty, q.depthScale) * s.tick;
    return clampPx(side === "B" ? askOf(s, q.mark) + slip : bidOf(s, q.mark) - slip, q);
  }

  // ---------- Tamper evidence: a 53-bit string hash (cyrb53), chained over ledger and fills ----------
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const ledgerKey = e => `${e.id}|${e.t}|${e.type}|${e.amount}|${e.ref}`;
  const fillKey = f => `${f.id}|${f.t}|${f.sym}|${f.contract}|${f.side}|${f.qty}|${f.px}|${f.fee}|${f.tag}|${f.pos}|${f.pnl}|${f.open ? 1 : 0}`;

  // ---------- Formatting (shared by the UI) ----------
  const fmtPx = px => px == null || !isFinite(px) ? "—" : (px / PU).toFixed(px % 10 === 0 ? 1 : 2);
  const fmtVnd = n => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;

  // ---------- Account ----------
  function nextId(a, p) { a.seq += 1; return p + String(a.seq).padStart(6, "0"); }
  function post(a, t, type, amount, ref, note) {
    must(isInt(amount), "Số tiền không phải số nguyên");
    const e = { id: nextId(a, "L"), t, type, amount, ref: ref || "", note: note || "" };
    a.ledger.push(e);
    a.hL = hash(a.hL + "#" + ledgerKey(e));
    return e;
  }
  function audit(a, t, act, msg) {
    a.audit.push({ id: nextId(a, "A"), t, act, msg });
    if (a.audit.length > 300) a.audit.splice(0, a.audit.length - 300);
  }
  function createAccount(o) {
    const a = { v: 1, id: o.id, userId: o.userId, kind: o.kind || "practice", label: o.label || "", initial: o.initial || INITIAL,
      createdT: o.t || 0, seq: 0, ledger: [], orders: [], fills: [], positions: [], marks: {}, status: "OK", mcT: null,
      curve: [], audit: [], resets: o.resets || [], stats: { mc: 0, mcCured: 0, liq: 0, maxUtil: 0 }, hL: "", hF: "", cids: {} };
    must(isInt(a.initial) && a.initial > 0, "Vốn ban đầu không hợp lệ");
    if (o.resetNote) post(a, a.createdT, "RESET", 0, "", o.resetNote);
    post(a, a.createdT, "INITIAL", a.initial, "", "Vốn ảo ban đầu");
    audit(a, a.createdT, "OPEN", `Mở tài khoản ${a.kind} với ${fmtVnd(a.initial)} tiền ảo`);
    a.curve.push({ t: a.createdT, eq: a.initial });
    return a;
  }
  // Demo reset: a fresh account; the old one is summarised in `resets` and the new ledger starts with a RESET mark
  function resetAccount(a, t, ctx) {
    if (!ctx || ctx.userId !== a.userId) return { ok: false, error: "Không có quyền thao tác trên tài khoản này" };
    const m = metrics(a), trades = a.positions.filter(p => p.status !== "OPEN").length;
    const resets = (a.resets || []).concat([{ t, equity: m.equity, ret: (m.equity - a.initial) / a.initial, trades, realized: m.realized }]).slice(-50);
    const fresh = createAccount({ id: a.id, userId: a.userId, kind: a.kind, label: a.label, initial: INITIAL, t, resets,
      resetNote: `Đặt lại tài khoản demo — Equity trước khi đặt lại ${fmtVnd(m.equity)}` });
    Object.keys(a).forEach(k => delete a[k]);
    Object.assign(a, fresh);
    return { ok: true };
  }

  function openPos(a, sym) { return a.positions.find(p => p.status === "OPEN" && p.sym === sym) || null; }
  function markOf(a, p) { const m = a.marks[p.sym]; return isInt(m) ? m : p.lots[p.lots.length - 1].px; }
  function unrealOf(a, p, m) {
    const s = SPECS[p.sym], mk = m == null ? markOf(a, p) : m;
    let u = 0;
    for (const l of p.lots) u += (mk - l.px) * p.side * l.q * s.unitValue;
    return u;
  }
  // Margin and fees held back by a pending order that would add exposure
  function reservedOf(a, o) {
    if (o.status !== "PENDING" || o.reduceOnly) return 0;
    const s = SPECS[o.sym], pos = openPos(a, o.sym), sd = sideNum(o.side);
    const inc = !pos || pos.side === sd ? o.qty : Math.max(0, o.qty - pos.qty);
    const px = o.type === "LMT" ? o.px : o.type === "STP" ? o.stop : (isInt(a.marks[o.sym]) ? a.marks[o.sym] : 0);
    return imOf(s, inc, px) + s.fee * o.qty;
  }
  // The account in numbers. Each figure has its own variable: cash ≠ equity ≠ available.
  function metrics(a) {
    const b = a.base || null;
    let cash = b ? b.cash : 0, realized = b ? b.realized : 0, fees = b ? b.fees : 0;
    for (const e of a.ledger) {
      cash += e.amount;
      if (e.type === "PNL") realized += e.amount; else if (e.type === "FEE") fees -= e.amount;
    }
    let unreal = 0, im = 0, mm = 0, liq = 0, gross = 0;
    const open = a.positions.filter(p => p.status === "OPEN");
    for (const p of open) {
      const s = SPECS[p.sym], m = markOf(a, p);
      unreal += unrealOf(a, p, m);
      const pim = imOf(s, p.qty, m), pmm = mmFromIm(pim);
      im += pim; mm += pmm; liq += liqFromMm(pmm); gross += notional(s, p.qty, m);
    }
    let reserved = 0;
    for (const o of a.orders) if (o.status === "PENDING") reserved += reservedOf(a, o);
    const equity = cash + unreal;
    return { cash, realized, fees, unreal, equity, im, mm, liq, reserved, gross,
      available: equity - im - reserved,
      util: im === 0 ? 0 : equity > 0 ? im / equity : Infinity,          // margin utilisation = IM / Equity
      marginRatio: mm === 0 ? Infinity : equity / mm,                      // Equity / MM (below 1 → margin call)
      status: a.status, open };
  }

  // ---------- Orders and fills ----------
  function addOrder(a, o) {
    const order = { id: nextId(a, "O"), cid: o.cid || "", t: o.t, sym: o.sym, contract: o.contract || "", side: o.side, type: o.type,
      qty: o.qty, px: o.px == null ? null : o.px, stop: o.stop == null ? null : o.stop, reduceOnly: !!o.reduceOnly, tag: o.tag || "",
      pos: o.pos || null, oco: o.oco || null, bracket: o.bracket || null, status: "PENDING", reason: "", filled: 0, avgPx: null, tDone: null };
    a.orders.push(order);
    if (a.orders.length > 160) {                   // finished orders are not needed to rebuild the account: keep the latest
      const drop = a.orders.findIndex(x => x.status !== "PENDING");
      if (drop >= 0) a.orders.splice(drop, 1);
    }
    return order;
  }
  function finish(o, status, t, reason) { o.status = status; o.tDone = t; if (reason) o.reason = reason; }
  function pushFill(a, f) {
    const fill = { id: nextId(a, "F"), ...f };
    a.fills.push(fill);
    a.hF = hash(a.hF + "#" + fillKey(fill));
    return fill;
  }
  function newPosition(a, sym, side, t, contract) {
    const p = { id: nextId(a, "P"), userId: a.userId, sym, contract: contract || "", side, qty: 0, lots: [], realized: 0, fees: 0,
      inQty: 0, inCost: 0, outQty: 0, outCost: 0, maxQty: 0, openT: t, closeT: null, exitPx: null, sl: null, tp: null, status: "OPEN" };
    a.positions.push(p);
    return p;
  }
  function closePos(a, pos, t, tag) {
    pos.status = tag === "LIQ" ? "LIQUIDATED" : tag === "EXP" ? "SETTLED" : "CLOSED";
    pos.closeT = t;
    pos.exitPx = pos.outQty ? Math.round(pos.outCost / pos.outQty) : null;
    pos.sl = pos.tp = null;
    for (const o of a.orders) if (o.status === "PENDING" && o.reduceOnly && o.sym === pos.sym) finish(o, "CANCELLED", t, "Vị thế đã đóng");
  }
  function protOrders(a, pos) { return a.orders.filter(o => o.status === "PENDING" && o.pos === pos.id && (o.tag === "SL" || o.tag === "TP")); }
  function setProtectionInner(a, pos, prot, t) {
    protOrders(a, pos).forEach(o => finish(o, "CANCELLED", t, "Thay bằng SL/TP mới"));
    const side = pos.side === 1 ? "S" : "B", oco = (prot.sl && prot.tp) ? nextId(a, "G") : null;
    if (prot.sl) addOrder(a, { t, sym: pos.sym, contract: pos.contract, side, type: "STP", qty: pos.qty, stop: prot.sl, reduceOnly: true, tag: "SL", pos: pos.id, oco });
    if (prot.tp) addOrder(a, { t, sym: pos.sym, contract: pos.contract, side, type: "LMT", qty: pos.qty, px: prot.tp, reduceOnly: true, tag: "TP", pos: pos.id, oco });
    pos.sl = prot.sl || null; pos.tp = prot.tp || null;
    if (prot.sl) pos.hadSL = true;
  }
  function syncProtection(a, pos) { for (const o of protOrders(a, pos)) o.qty = o.filled + pos.qty; }

  // Fill an order (all of it, at one price). Returns the contracts filled (0 if the order was cancelled).
  function execFill(a, o, px, t, opt) {
    opt = opt || {};
    const s = SPECS[o.sym], sd = sideNum(o.side);
    must(onTick(s, px) || (o.tag === "EXP" && isInt(px) && px > 0), "Giá khớp không đúng bước giá");
    let pos = openPos(a, o.sym);
    let qty = o.qty - o.filled;
    if (o.reduceOnly) {
      if (!pos || pos.side === sd) { finish(o, "CANCELLED", t, "Không còn vị thế để đóng"); return 0; }
      qty = Math.min(qty, pos.qty);
    }
    const fee = opt.noFee ? 0 : s.fee;
    if (!o.reduceOnly && !opt.force) {
      // margin is checked again at the moment of the fill: prices may have moved since the order was placed
      const inc = !pos || pos.side === sd ? qty : Math.max(0, qty - pos.qty);
      if (inc > 0) {
        const m = metrics(a), mark = isInt(a.marks[o.sym]) ? a.marks[o.sym] : px;
        const posQ = pos ? pos.qty * pos.side : 0, newQ = posQ + sd * qty;
        const imAfter = m.im - (pos ? imOf(s, pos.qty, mark) : 0) + imOf(s, Math.abs(newQ), mark);
        const eqAfter = m.equity - fee * qty + sd * qty * s.unitValue * (mark - px);
        if (eqAfter - imAfter - (m.reserved - reservedOf(a, o)) < 0) {
          finish(o, "CANCELLED", t, "Không đủ ký quỹ tại thời điểm khớp");
          audit(a, t, "CANCEL", `Lệnh ${o.id} bị hủy khi khớp: không đủ ký quỹ`);
          return 0;
        }
        must(Math.abs(newQ) <= s.maxPos, `Vượt giới hạn vị thế ${s.maxPos} hợp đồng`);
      }
    }
    let rem = qty;
    if (pos && pos.side !== sd) {                          // the closing part, first in first out
      const c = Math.min(rem, pos.qty);
      let pnl = 0, left = c;
      while (left > 0) {
        const lot = pos.lots[0], take = Math.min(lot.q, left);
        pnl += (px - lot.px) * pos.side * take * s.unitValue;
        lot.q -= take; left -= take;
        if (!lot.q) pos.lots.shift();
      }
      pos.qty -= c; pos.realized += pnl; pos.outQty += c; pos.outCost += px * c;
      const f = pushFill(a, { t, sym: o.sym, contract: pos.contract, side: o.side, qty: c, px, fee: fee * c, tag: o.tag, order: o.id, pos: pos.id, pnl, open: false });
      pos.fees += f.fee;
      if (f.fee) post(a, t, "FEE", -f.fee, f.id);
      if (pnl) post(a, t, "PNL", pnl, f.id);
      if (!pos.qty) closePos(a, pos, t, o.tag);
      rem -= c;
    }
    if (rem > 0) {                                         // the opening part (a reverse opens the other side)
      if (!pos || pos.status !== "OPEN") pos = newPosition(a, o.sym, sd, t, opt.contract || o.contract);
      pos.lots.push({ q: rem, px }); pos.qty += rem; pos.inQty += rem; pos.inCost += px * rem;
      pos.maxQty = Math.max(pos.maxQty, pos.qty);
      const f = pushFill(a, { t, sym: o.sym, contract: pos.contract, side: o.side, qty: rem, px, fee: fee * rem, tag: o.tag, order: o.id, pos: pos.id, pnl: 0, open: true });
      pos.fees += f.fee;
      if (f.fee) post(a, t, "FEE", -f.fee, f.id);
    }
    o.filled += qty; o.avgPx = px;
    finish(o, "FILLED", t);
    if (pos.status === "OPEN") {
      if (o.bracket && pos.side === sd) setProtectionInner(a, pos, o.bracket, t);
      else syncProtection(a, pos);
    }
    return qty;
  }

  // ---------- Atomic actions ----------
  const clone = x => JSON.parse(JSON.stringify(x));
  function invariants(a) {
    const syms = new Set();
    for (const p of a.positions) {
      const lotQ = p.lots.reduce((n, l) => n + l.q, 0);
      if (lotQ !== p.qty || p.qty < 0) throw new Error("Sai lệch lô vị thế");
      if (p.status === "OPEN") { if (!p.qty) throw new Error("Vị thế mở không có khối lượng"); if (syms.has(p.sym)) throw new Error("Hai vị thế mở cùng sản phẩm"); syms.add(p.sym); }
      else if (p.qty) throw new Error("Vị thế đã đóng còn khối lượng");
    }
    for (const e of a.ledger) if (!isInt(e.amount)) throw new Error("Sổ cái có số không nguyên");
  }
  function commit(a, x) { Object.keys(a).forEach(k => delete a[k]); Object.assign(a, x); }
  // A user action: checked against the owner, run on a copy, committed only if it completes and balances
  function txn(a, ctx, t, fn) {
    if (!ctx || ctx.userId !== a.userId) return { ok: false, error: "Không có quyền thao tác trên tài khoản này" };
    const x = clone(a);
    try {
      const r = fn(x) || {};
      invariants(x);
      commit(a, x);
      return { ok: true, ...r };
    } catch (e) {
      const msg = e instanceof ArenaError ? e.message : `Lỗi hệ thống, giao dịch đã được hoàn tác (${e.message})`;
      audit(a, t, "REJECT", msg);
      return { ok: false, error: msg };
    }
  }
  // A market event (price, expiry): same all-or-nothing rule, no user involved
  function sys(a, fn) {
    const x = clone(a);
    const r = fn(x) || {};
    invariants(x);
    commit(a, x);
    return { ok: true, ...r };
  }

  function exposureAdd(pos, sd, qty) { return !pos || pos.side === sd ? qty : Math.max(0, qty - pos.qty); }

  // req: { cid, sym, side "B"|"S", type "MKT"|"LMT"|"STP", qty, px (LMT), stop (STP), sl, tp, reduceOnly, tag }
  // mkt: { t, open, queue, q: { [sym]: { mark, ref, ceil, floor, contract, exp, stale, depthScale } } }
  // Prices and fills always come from `mkt`, never from the request: a price sent by the page is not trusted.
  function placeOrder(a, req, mkt, ctx) {
    const t = mkt.t;
    if (req && req.cid && a.cids[req.cid] && ctx && ctx.userId === a.userId) {   // the same click arriving twice
      return { ok: true, duplicate: true, order: a.orders.find(o => o.id === a.cids[req.cid]) || null };
    }
    return txn(a, ctx, t, x => {
      for (const [k, v] of Object.entries(mkt.q || {})) if (SPECS[k] && isInt(v.mark) && v.mark > 0) x.marks[k] = v.mark;   // the latest market price
      const s = spec(req.sym), q = mkt.q && mkt.q[req.sym];
      must(q && isInt(q.mark), "Chưa có giá cho sản phẩm này");
      must(req.side === "B" || req.side === "S", "Chiều lệnh không hợp lệ");
      must(["MKT", "LMT", "STP"].includes(req.type), "Loại lệnh không hợp lệ");
      must(isInt(req.qty) && req.qty >= 1 && req.qty <= s.maxOrder, `Khối lượng phải từ 1 đến ${s.maxOrder} hợp đồng`);
      must(!q.expired, "Hợp đồng đã đáo hạn");
      const sd = sideNum(req.side), pos = openPos(x, req.sym);
      if (req.reduceOnly) must(pos && pos.side !== sd, "Không có vị thế ngược chiều để đóng");
      const qty = req.reduceOnly ? Math.min(req.qty, pos.qty) : req.qty;
      if (req.type === "LMT") {
        must(onTick(s, req.px), "Giá phải theo bước giá 0,1 điểm");
        must(req.px >= q.floor && req.px <= q.ceil, `Giá ngoài biên độ ${fmtPx(q.floor)}–${fmtPx(q.ceil)}`);
      }
      if (req.type === "STP") {
        must(onTick(s, req.stop), "Giá kích hoạt phải theo bước giá 0,1 điểm");
        must(req.stop >= q.floor && req.stop <= q.ceil, `Giá kích hoạt ngoài biên độ ${fmtPx(q.floor)}–${fmtPx(q.ceil)}`);
        must(req.side === "B" ? req.stop > askOf(s, q.mark) : req.stop < bidOf(s, q.mark),
          req.side === "B" ? "Stop mua phải cao hơn giá chào bán hiện tại" : "Stop bán phải thấp hơn giá chào mua hiện tại");
      }
      if (req.type === "MKT") {
        must(mkt.open || mkt.queue, "Thị trường đang đóng cửa — đặt lệnh Limit/Stop hoặc chờ phiên sau");
        must(!(mkt.open && q.stale), "Giá chưa được cập nhật — lệnh thị trường bị từ chối, hãy thử lại");
      }
      const inc = req.reduceOnly ? 0 : exposureAdd(pos, sd, qty);
      let bracket = null;
      if (inc > 0) {
        must(x.status !== "MARGIN_CALL", "Tài khoản đang Margin Call — chỉ được đặt lệnh giảm vị thế");
        const posQ = pos ? pos.qty * pos.side : 0;
        must(Math.abs(posQ + sd * qty) <= s.maxPos, `Vượt giới hạn vị thế ${s.maxPos} hợp đồng`);
        const ref = req.type === "LMT" ? req.px : req.type === "STP" ? req.stop : marketPx(s, q, req.side, qty);
        const m = metrics(x), need = imOf(s, inc, ref) + s.fee * qty;
        must(m.available >= need, `Không đủ ký quỹ: cần ${fmtVnd(need)}, khả dụng ${fmtVnd(Math.max(0, m.available))}`);
        if (req.sl || req.tp) {
          const entry = ref;
          if (req.sl) { must(onTick(s, req.sl), "Stop Loss phải theo bước giá"); must(sd === 1 ? req.sl < entry : req.sl > entry, sd === 1 ? "Stop Loss của lệnh mua phải thấp hơn giá vào" : "Stop Loss của lệnh bán phải cao hơn giá vào"); }
          if (req.tp) { must(onTick(s, req.tp), "Take Profit phải theo bước giá"); must(sd === 1 ? req.tp > entry : req.tp < entry, sd === 1 ? "Take Profit của lệnh mua phải cao hơn giá vào" : "Take Profit của lệnh bán phải thấp hơn giá vào"); }
          bracket = { sl: req.sl || null, tp: req.tp || null };
        }
      }
      const o = addOrder(x, { t, cid: req.cid, sym: req.sym, contract: q.contract, side: req.side, type: req.type, qty,
        px: req.type === "LMT" ? req.px : null, stop: req.type === "STP" ? req.stop : null,
        reduceOnly: !!req.reduceOnly, tag: req.tag || "", pos: req.reduceOnly && pos ? pos.id : null, bracket });
      if (req.cid) {
        x.cids[req.cid] = o.id;
        const keys = Object.keys(x.cids);
        if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(k => delete x.cids[k]);
      }
      audit(x, t, "ORDER", `${o.id} ${req.side === "B" ? "Mua/Long" : "Bán/Short"} ${qty} ${req.sym} ${req.type}${o.px ? " @" + fmtPx(o.px) : ""}${o.stop ? " stop " + fmtPx(o.stop) : ""}${o.reduceOnly ? " (đóng vị thế)" : ""}`);
      if (mkt.open) {                                           // continuous trading: market and marketable limit orders fill now
        if (o.type === "MKT") execFill(x, o, marketPx(s, q, o.side, qty), t, { contract: q.contract });
        else if (o.type === "LMT") {
          const ask = askOf(s, q.mark), bid = bidOf(s, q.mark);
          if (o.side === "B" && ask <= o.px) execFill(x, o, clampPx(ask, q), t, { contract: q.contract });
          else if (o.side === "S" && bid >= o.px) execFill(x, o, clampPx(bid, q), t, { contract: q.contract });
        }
      }
      updateStatus(x, t);
      return { order: o };
    });
  }
  function cancelOrder(a, id, mkt, ctx) {
    return txn(a, ctx, mkt.t, x => {
      const o = x.orders.find(z => z.id === id);
      must(o, "Không tìm thấy lệnh");
      must(o.status === "PENDING", "Lệnh không còn chờ khớp");
      must(o.tag !== "LIQ" && o.tag !== "EXP", "Không thể hủy lệnh của hệ thống");
      finish(o, "CANCELLED", mkt.t, "Người chơi hủy");
      if (o.pos) { const p = x.positions.find(z => z.id === o.pos); if (p) { if (o.tag === "SL") p.sl = null; if (o.tag === "TP") p.tp = null; } }
      audit(x, mkt.t, "CANCEL", `Hủy lệnh ${o.id}`);
      return { order: o };
    });
  }
  function closePosition(a, sym, qty, mkt, ctx, cid) {
    const pos = openPos(a, sym);
    if (!pos) return { ok: false, error: "Không có vị thế mở" };
    const n = qty == null ? pos.qty : qty;
    if (!(isInt(n) && n >= 1 && n <= pos.qty)) return { ok: false, error: `Số hợp đồng đóng phải từ 1 đến ${pos.qty}` };
    return placeOrder(a, { cid, sym, side: pos.side === 1 ? "S" : "B", type: "MKT", qty: n, reduceOnly: true, tag: n < pos.qty ? "PART" : "CLOSE" }, mkt, ctx);
  }
  function reversePosition(a, sym, mkt, ctx, cid) {
    const pos = openPos(a, sym);
    if (!pos) return { ok: false, error: "Không có vị thế mở" };
    return placeOrder(a, { cid, sym, side: pos.side === 1 ? "S" : "B", type: "MKT", qty: pos.qty * 2, tag: "REV" }, mkt, ctx);
  }
  function setProtection(a, sym, prot, mkt, ctx) {
    return txn(a, ctx, mkt.t, x => {
      const pos = openPos(x, sym), s = spec(sym), q = mkt.q[sym];
      must(pos, "Không có vị thế mở");
      const m = q.mark, sl = prot.sl || null, tp = prot.tp || null;
      if (sl) { must(onTick(s, sl), "Stop Loss phải theo bước giá 0,1 điểm"); must(pos.side === 1 ? sl < bidOf(s, m) : sl > askOf(s, m), pos.side === 1 ? "Stop Loss phải thấp hơn giá hiện tại" : "Stop Loss phải cao hơn giá hiện tại"); }
      if (tp) { must(onTick(s, tp), "Take Profit phải theo bước giá 0,1 điểm"); must(pos.side === 1 ? tp > bidOf(s, m) : tp < askOf(s, m), pos.side === 1 ? "Take Profit phải cao hơn giá hiện tại" : "Take Profit phải thấp hơn giá hiện tại"); }
      setProtectionInner(x, pos, { sl, tp }, mkt.t);
      audit(x, mkt.t, "PROTECT", `${sym}: SL ${sl ? fmtPx(sl) : "—"} · TP ${tp ? fmtPx(tp) : "—"}`);
      return {};
    });
  }

  // ---------- Prices: the bar engine ----------
  // A bar { t, o, h, l, c } is walked as a path. For an open position the adverse extreme is assumed
  // first (O→L→H→C for a long, O→H→L→C for a short): when one bar touches both the Stop Loss and the
  // Take Profit, the Stop Loss counts — the conservative reading of a bar whose inside is unknown.
  // At the open, anything already crossed fills at the open (a gap through a stop fills worse than the stop).
  function trigger(o, s) {           // the mark level where a pending order fires, and from which side
    const hs = s.halfSpread;
    if (o.type === "LMT") return o.side === "B" ? { level: o.px - hs, up: false } : { level: o.px + hs, up: true };
    if (o.type === "STP") return o.side === "B" ? { level: o.stop - hs, up: true } : { level: o.stop + hs, up: false };
    return null;
  }
  function liqLevel(a, sym, rate) {   // mark at which Equity meets the liquidation level (or margin-call level), others fixed
    const pos = openPos(a, sym);
    if (!pos) return null;
    const s = SPECS[sym], m = metrics(a), mark = markOf(a, pos);
    const r = s.imBps / 10000 * RISK.mmPct / 100 * (rate === "mm" ? 1 : RISK.liqPct / 100);
    const pim = imOf(s, pos.qty, mark), pmm = mmFromIm(pim);
    const other = (rate === "mm" ? m.mm - pmm : m.liq - liqFromMm(pmm));
    const k = pos.qty * s.unitValue;
    if (pos.side === 1) { const P = (other - m.equity + k * mark) / (k * (1 - r)); return P > 0 ? P : null; }
    return (m.equity + k * mark - other) / (k * (1 + r));
  }
  function liquidate(a, sym, level, t, q) {
    const pos = openPos(a, sym);
    if (!pos) return;
    const s = SPECS[sym], mark = clampPx(Math.round(level / s.tick) * s.tick, q);
    a.marks[sym] = mark;
    const m = metrics(a);
    let k = pos.qty, px = null;
    for (let n = 1; n <= pos.qty; n++) {
      const slip = slipTicks(s, n, q && q.depthScale) * s.tick;
      const p = clampPx(pos.side === 1 ? bidOf(s, mark) - slip : askOf(s, mark) + slip, q);
      const eqAfter = m.equity - s.fee * n + (p - mark) * pos.side * n * s.unitValue;
      const imAfter = m.im - imOf(s, pos.qty, mark) + imOf(s, pos.qty - n, mark);
      if (eqAfter >= imAfter || n === pos.qty) { k = n; px = p; break; }
    }
    const o = addOrder(a, { t, sym, contract: pos.contract, side: pos.side === 1 ? "S" : "B", type: "MKT", qty: k, reduceOnly: true, tag: "LIQ", pos: pos.id });
    execFill(a, o, px, t, { force: true });
    a.stats.liq += 1;
    audit(a, t, "LIQUIDATION", `Thanh lý bắt buộc ${k} HĐ ${sym} tại ${fmtPx(px)}: Equity xuống dưới mức thanh lý (${RISK.liqPct}% ký quỹ duy trì)`);
  }
  // A fill triggered by the market: a rule that refuses it cancels the order instead of stopping the bar
  function tryFill(a, o, px, t, opt) {
    try { return execFill(a, o, px, t, opt); }
    catch (e) {
      if (!(e instanceof ArenaError)) throw e;
      finish(o, "CANCELLED", t, e.message);
      audit(a, t, "CANCEL", `Lệnh ${o.id} bị hủy khi khớp: ${e.message}`);
      return 0;
    }
  }
  function pendingFor(a, sym) { return a.orders.filter(o => o.status === "PENDING" && o.sym === sym); }
  function fillAtOpen(a, s, sym, m, t, q) {
    for (let guard = 0; guard < 100; guard++) {
      const hs = s.halfSpread;
      const hit = pendingFor(a, sym).find(o => o.type === "MKT" ||
        (o.type === "LMT" && (o.side === "B" ? m <= o.px - hs : m >= o.px + hs)) ||
        (o.type === "STP" && (o.side === "B" ? m >= o.stop - hs : m <= o.stop + hs)));
      const pos = openPos(a, sym), lv = pos ? liqLevel(a, sym) : null;
      const liqNow = lv != null && (pos.side === 1 ? m <= lv : m >= lv);
      if (liqNow && (!hit || !(hit.reduceOnly && hit.tag === "SL"))) { liquidate(a, sym, m, t, q); continue; }
      if (!hit) return;
      const slip = slipTicks(s, hit.qty, q && q.depthScale) * s.tick;
      const px = hit.type === "LMT" ? (hit.side === "B" ? askOf(s, m) : bidOf(s, m))
        : hit.side === "B" ? askOf(s, m) + slip : bidOf(s, m) - slip;
      a.marks[sym] = m;
      tryFill(a, hit, clampPx(px, q), t, { contract: q && q.contract });
    }
  }
  function walk(a, s, sym, from, to, t, q) {
    if (from === to) return;
    const up = to > from;
    let cur = from;
    for (let guard = 0; guard < 200; guard++) {
      let best = null;
      for (const o of pendingFor(a, sym)) {
        const tr = trigger(o, s);
        if (!tr || tr.up !== up) continue;
        const inside = up ? tr.level > cur && tr.level <= to : tr.level < cur && tr.level >= to;
        if (!inside) continue;
        const d = Math.abs(tr.level - cur);
        if (!best || d < best.d || (d === best.d && o.type === "STP" && best.o && best.o.type !== "STP")) best = { d, level: tr.level, o };
      }
      const pos = openPos(a, sym);
      if (pos && (pos.side === 1) === !up) {
        const lv = liqLevel(a, sym);
        if (lv != null && (up ? lv > cur && lv <= to : lv < cur && lv >= to)) {
          const d = Math.abs(lv - cur);
          if (!best || d < best.d) best = { d, level: lv, liq: true };
        }
      }
      if (!best) return;
      cur = best.level;
      if (best.liq) { liquidate(a, sym, cur, t, q); cur = a.marks[sym]; continue; }
      a.marks[sym] = Math.round(cur);
      const o = best.o, slip = slipTicks(s, o.qty, q && q.depthScale) * s.tick;
      const px = o.type === "LMT" ? o.px : o.side === "B" ? o.stop + slip : o.stop - slip;
      tryFill(a, o, clampPx(px, q), t, { contract: q && q.contract });
    }
  }
  function processBar(a, sym, bar, mkt) {
    const s = spec(sym), q = mkt.q[sym], t = bar.t;
    const pos = openPos(a, sym);
    const downFirst = pos ? pos.side === 1 : bar.c < bar.o;
    const path = downFirst ? [bar.o, bar.l, bar.h, bar.c] : [bar.o, bar.h, bar.l, bar.c];
    a.marks[sym] = bar.o;
    fillAtOpen(a, s, sym, bar.o, t, q);
    for (let i = 1; i < path.length; i++) walk(a, s, sym, path[i - 1], path[i], t, q);
    a.marks[sym] = bar.c;
    updateStatus(a, t);
  }
  function onBar(a, sym, bar, mkt) {
    const ok = [bar.o, bar.h, bar.l, bar.c].every(v => isInt(v) && v > 0) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c);
    if (!ok) return { ok: false, error: "Nến lỗi bị bỏ qua" };
    return sys(a, x => processBar(x, sym, bar, mkt));
  }
  function setMark(a, sym, px) { if (isInt(px) && px > 0) a.marks[sym] = px; }
  function updateStatus(a, t) {
    const m = metrics(a);
    if (!m.open.length) {
      if (a.status === "MARGIN_CALL") { a.stats.mcCured += 1; audit(a, t, "MARGIN_OK", "Hết Margin Call: không còn vị thế mở"); }
      a.status = "OK"; a.mcT = null;
      return;
    }
    if (isFinite(m.util)) a.stats.maxUtil = Math.max(a.stats.maxUtil, Math.round(m.util * 1000) / 1000);
    if (a.status !== "MARGIN_CALL" && m.equity < m.mm) {
      a.status = "MARGIN_CALL"; a.mcT = t; a.stats.mc += 1;
      audit(a, t, "MARGIN_CALL", `Margin Call: Equity ${fmtVnd(m.equity)} < ký quỹ duy trì ${fmtVnd(m.mm)}. Cần giảm vị thế để Equity ≥ ký quỹ ban đầu ${fmtVnd(m.im)}`);
    } else if (a.status === "MARGIN_CALL" && m.equity >= m.im) {
      a.status = "OK"; a.mcT = null; a.stats.mcCured += 1;
      audit(a, t, "MARGIN_OK", "Hết Margin Call: Equity đã trở lại trên ký quỹ ban đầu");
    }
  }
  // Expiry: open positions in the expiring contract are closed at the final settlement price
  // (the closing value of the underlying index on the last trading day); its pending orders are cancelled.
  function settleExpiry(a, sym, contract, px, t) {
    return sys(a, x => {
      for (const o of x.orders) if (o.status === "PENDING" && o.sym === sym && o.contract === contract) finish(o, "CANCELLED", t, "Hợp đồng đáo hạn");
      const pos = openPos(x, sym);
      if (pos && pos.contract === contract) {
        const o = addOrder(x, { t, sym, contract, side: pos.side === 1 ? "S" : "B", type: "MKT", qty: pos.qty, reduceOnly: true, tag: "EXP", pos: pos.id });
        x.marks[sym] = px;
        execFill(x, o, px, t, { force: true, noFee: true });
        audit(x, t, "EXPIRY", `${contract} đáo hạn: thanh toán ${o.filled} HĐ tại giá thanh toán cuối cùng ${fmtPx(px)}`);
      }
      updateStatus(x, t);
    });
  }
  // Equity curve: one point per call unless the last one is too recent; thinned to keep it small
  function snapshot(a, t, minGap) {
    const eq = metrics(a).equity, last = a.curve[a.curve.length - 1];
    if (last && t - last.t < (minGap || 0)) { if (t === last.t) last.eq = eq; return; }
    a.curve.push({ t, eq });
    if (a.curve.length > 2400) a.curve = a.curve.filter((p, i) => i % 2 === 0 || i > a.curve.length - 200);
  }

  // ---------- Reconciliation and tamper check ----------
  // Rebuilds positions and the expected ledger from the fills, and checks both hash chains.
  function verify(a) {
    const problems = [], b = a.base || null;
    if (b && hash(`${b.cash}|${b.realized}|${b.fees}|${b.hL}|${b.hF}|${b.n}|${(a.hist || []).length}`) !== b.seal) problems.push("Điểm mốc lịch sử đã bị sửa ngoài hệ thống");
    let h = b ? b.hL : "";
    for (const e of a.ledger) h = hash(h + "#" + ledgerKey(e));
    if (h !== a.hL) problems.push("Sổ cái đã bị sửa ngoài hệ thống (chuỗi băm không khớp)");
    h = b ? b.hF : "";
    for (const f of a.fills) h = hash(h + "#" + fillKey(f));
    if (h !== a.hF) problems.push("Lịch sử khớp lệnh đã bị sửa ngoài hệ thống (chuỗi băm không khớp)");
    const expect = [], lots = {}, qty = {}, realized = {};
    for (const e of a.ledger) if (e.type === "INITIAL" || e.type === "RESET") expect.push(`${e.type}|${e.amount}`);
    let initial = 0;
    for (const e of a.ledger) if (e.type === "INITIAL") initial += e.amount;
    if (!b && initial !== a.initial) problems.push("Vốn ban đầu không khớp sổ cái");
    for (const f of a.fills) {
      const s = SPECS[f.sym];
      if (!s) { problems.push(`Khớp lệnh ${f.id} có sản phẩm lạ`); continue; }
      lots[f.pos] = lots[f.pos] || []; qty[f.pos] = qty[f.pos] || 0; realized[f.pos] = realized[f.pos] || 0;
      if (f.fee) expect.push(`FEE|${-f.fee}|${f.id}`);
      if (f.open) { lots[f.pos].push({ q: f.qty, px: f.px }); qty[f.pos] += f.qty; continue; }
      const p = a.positions.find(z => z.id === f.pos);
      if (!p) { problems.push(`Khớp lệnh ${f.id} không thuộc vị thế nào`); continue; }
      let left = f.qty, pnl = 0;
      while (left > 0 && lots[f.pos].length) {
        const l = lots[f.pos][0], take = Math.min(l.q, left);
        pnl += (f.px - l.px) * p.side * take * s.unitValue; l.q -= take; left -= take;
        if (!l.q) lots[f.pos].shift();
      }
      if (left) problems.push(`Khớp lệnh ${f.id} đóng nhiều hơn vị thế`);
      qty[f.pos] -= f.qty; realized[f.pos] += pnl;
      if (pnl !== f.pnl) problems.push(`Lãi/lỗ của ${f.id} không khớp khi tính lại`);
      if (pnl) expect.push(`PNL|${pnl}|${f.id}`);
    }
    const got = a.ledger.map(e => e.type === "INITIAL" || e.type === "RESET" ? `${e.type}|${e.amount}` : `${e.type}|${e.amount}|${e.ref}`);
    if (got.join(";") !== expect.join(";")) problems.push("Sổ cái không khớp với lịch sử khớp lệnh");
    for (const p of a.positions) {
      if ((qty[p.id] || 0) !== p.qty) problems.push(`Khối lượng vị thế ${p.id} không khớp`);
      if ((realized[p.id] || 0) !== p.realized) problems.push(`Lãi/lỗ đã thực hiện của ${p.id} không khớp`);
      const lq = (lots[p.id] || []).map(l => `${l.q}@${l.px}`).join(","), sq = p.lots.map(l => `${l.q}@${l.px}`).join(",");
      if (lq !== sq) problems.push(`Lô của vị thế ${p.id} không khớp`);
    }
    const m = metrics(a), fees = a.fills.reduce((n, f) => n + f.fee, 0), pnl = a.fills.reduce((n, f) => n + f.pnl, 0);
    if (m.cash !== (b ? b.cash : a.initial) + pnl - fees) problems.push("Tiền mặt ≠ vốn ban đầu + lãi/lỗ đã thực hiện − phí");
    return { ok: !problems.length, problems };
  }

  // ---------- Analytics (from the account's own history only) ----------
  const dayOf = t => new Date(t * 1000).toISOString().slice(0, 10);   // times are exchange wall-clock seconds
  const HIST_STATUS = { C: "CLOSED", L: "LIQUIDATED", S: "SETTLED" };
  function tradesOf(a) {
    const old = (a.hist || []).map(r => ({ id: r[11], sym: r[10], contract: "", side: r[4], qty: r[5], entry: r[6], exit: r[7], openT: r[1], closeT: r[0],
      pnl: r[3], fees: r[3] - r[2], net: r[2], status: HIST_STATUS[r[8]] || "CLOSED", prot: !!r[9], archived: true }));
    return old.concat(a.positions.filter(p => p.status !== "OPEN").map(p => ({ id: p.id, sym: p.sym, contract: p.contract, side: p.side,
      qty: p.maxQty, entry: p.inQty ? Math.round(p.inCost / p.inQty) : null, exit: p.exitPx, openT: p.openT, closeT: p.closeT,
      pnl: p.realized, fees: p.fees, net: p.realized - p.fees, status: p.status,
      prot: a.fills.some(f => f.pos === p.id && (f.tag === "SL" || f.tag === "TP")) })));
  }
  // History compaction. When the account is flat (no position, no pending order) and its history is long,
  // the closed part is folded into a checkpoint: cash, realized P&L, fees and both hash chains carry over,
  // so the ledger still reconciles and later edits are still detected; each closed trade keeps a one-line
  // summary for the statistics. Keeps the saved account small in the browser's storage.
  function compact(a, minFills) {
    if (a.fills.length < (minFills || 500)) return false;
    if (a.positions.some(p => p.status === "OPEN") || a.orders.some(o => o.status === "PENDING")) return false;
    const m = metrics(a), rows = tradesOf(a).filter(x => !x.archived);
    a.hist = (a.hist || []).concat(rows.map(x => [x.closeT, x.openT, x.net, x.pnl, x.side, x.qty, x.entry, x.exit, (x.status || "C")[0], x.prot ? 1 : 0, x.sym, x.id])).slice(-6000);
    const n = (a.base ? a.base.n : 0) + a.fills.length;
    a.base = { cash: m.cash, realized: m.realized, fees: m.fees, hL: a.hL, hF: a.hF, n, t: a.fills[a.fills.length - 1].t };
    a.base.seal = hash(`${a.base.cash}|${a.base.realized}|${a.base.fees}|${a.base.hL}|${a.base.hF}|${a.base.n}|${a.hist.length}`);
    a.ledger = []; a.fills = []; a.positions = []; a.orders = []; a.cids = {};
    audit(a, a.base.t, "COMPACT", `Đã gộp ${n} lần khớp lệnh cũ thành điểm mốc lịch sử (số dư và chuỗi băm được giữ nguyên)`);
    return true;
  }
  function analytics(a, opt) {
    opt = opt || {};
    const from = opt.from == null ? -Infinity : opt.from;
    const m = metrics(a);
    const trades = tradesOf(a).filter(x => x.closeT >= from);
    const wins = trades.filter(x => x.net > 0), losses = trades.filter(x => x.net < 0);
    const gp = wins.reduce((n, x) => n + x.net, 0), gl = -losses.reduce((n, x) => n + x.net, 0);
    const curve = a.curve.filter(p => p.t >= from).concat(opt.now != null ? [{ t: opt.now, eq: m.equity }] : []);
    let peak = -Infinity, maxDD = 0;
    for (const p of curve) { peak = Math.max(peak, p.eq); if (peak > 0) maxDD = Math.max(maxDD, (peak - p.eq) / peak); }
    const byDay = new Map();
    for (const p of a.curve.concat(opt.now != null ? [{ t: opt.now, eq: m.equity }] : [])) byDay.set(dayOf(p.t), p.eq);
    const days = [...byDay.entries()];
    const daily = days.map(([d, eq], i) => ({ d, pnl: eq - (i ? days[i - 1][1] : a.initial) })).filter(x => x.d >= (from === -Infinity ? "" : dayOf(from)));
    let realized = 0, fees = 0;
    for (const e of a.ledger) if (e.t >= from) { if (e.type === "PNL") realized += e.amount; if (e.type === "FEE") fees -= e.amount; }
    for (const r of a.hist || []) if (r[0] >= from) { realized += r[3]; fees += r[3] - r[2]; }
    const best = trades.reduce((b, x) => !b || x.net > b.net ? x : b, null), worst = trades.reduce((b, x) => !b || x.net < b.net ? x : b, null);
    return { initial: a.initial, equity: m.equity, ret: (m.equity - a.initial) / a.initial, realized, unreal: m.unreal, fees,
      n: trades.length, wins: wins.length, losses: losses.length, winRate: trades.length ? wins.length / trades.length : null,
      pf: gl > 0 ? gp / gl : gp > 0 ? Infinity : null, avgWin: wins.length ? gp / wins.length : null, avgLoss: losses.length ? -gl / losses.length : null,
      best, worst, maxDD, curve, daily, trades };
  }
  // Achievements: earned from the account's history (virtual badges, no value outside the game)
  const ACHIEVEMENTS = [
    { id: "first", name: "Lệnh đầu tiên", desc: "Khớp lệnh đầu tiên", test: (a) => a.fills.length > 0 || !!a.base },
    { id: "short", name: "Người bán khống", desc: "Mở một vị thế Short", test: (a, t) => a.positions.some(p => p.side === -1) || t.some(x => x.side === -1) },
    { id: "green", name: "Lãi đầu tiên", desc: "Đóng một vị thế có lãi sau phí", test: (a, t) => t.some(x => x.net > 0) },
    { id: "guard", name: "Kỷ luật", desc: "5 vị thế được đóng bởi Stop Loss hoặc Take Profit", test: (a, t) => t.filter(x => x.prot).length >= 5 },
    { id: "streak", name: "Chuỗi thắng 3", desc: "3 giao dịch có lãi liên tiếp", test: (a, t) => { let r = 0, b = 0; t.slice().sort((x, y) => x.closeT - y.closeT).forEach(x => { r = x.net > 0 ? r + 1 : 0; b = Math.max(b, r); }); return b >= 3; } },
    { id: "survive", name: "Thoát Margin Call", desc: "Khắc phục một Margin Call mà không bị thanh lý", test: (a) => a.stats.mcCured > 0 && a.stats.liq === 0 },
    { id: "pf", name: "Hệ số lợi nhuận 1,5", desc: "Profit factor ≥ 1,5 sau ít nhất 10 giao dịch", test: (a, t) => { if (t.length < 10) return false; const gp = t.filter(x => x.net > 0).reduce((n, x) => n + x.net, 0), gl = -t.filter(x => x.net < 0).reduce((n, x) => n + x.net, 0); return gl > 0 ? gp / gl >= 1.5 : gp > 0; } },
    { id: "plus5", name: "+5% tài khoản", desc: "Equity đạt 105 triệu ₫", test: (a) => a.curve.some(p => p.eq >= a.initial * 1.05) },
    { id: "expiry", name: "Qua ngày đáo hạn", desc: "Giữ một vị thế đến khi hợp đồng đáo hạn", test: (a, t) => t.some(x => x.status === "SETTLED") },
    { id: "clean", name: "Không bị thanh lý", desc: "20 giao dịch mà chưa lần nào bị thanh lý", test: (a, t) => t.length >= 20 && a.stats.liq === 0 }
  ];
  function achievements(a) {
    const t = tradesOf(a);
    return ACHIEVEMENTS.map(x => ({ id: x.id, name: x.name, desc: x.desc, done: !!x.test(a, t) }));
  }

  return { PU, INITIAL, SPECS, RISK, ArenaError, ceilDiv, imOf, mmFromIm, liqFromMm, notional, limitsFor, onTick, floorTick, ceilTick,
    bidOf, askOf, slipTicks, marketPx, hash, fmtPx, fmtVnd, createAccount, resetAccount, metrics, openPos, unrealOf, reservedOf,
    placeOrder, cancelOrder, closePosition, reversePosition, setProtection, onBar, setMark, settleExpiry, updateStatus, liqLevel,
    snapshot, verify, analytics, tradesOf, compact, achievements, ACHIEVEMENTS, dayOf };
});

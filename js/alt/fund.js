// ============================================================
// alt/fund.js — Alternative Empire: the fund's books
// Every economic event is a posting with its effect on cash, holding value, cost, debt and
// a P&L category. A posting is refused unless
//     Δcash + Δvalue − Δdebt  =  Σ categories
// so NAV always reconciles: NAV_t − NAV_0 = income + realized + unrealized + fees + expenses
// + interest + external flows. Borrowing moves cash and debt together and is never profit;
// a distribution moves value into cash and is never counted twice. Postings are hash-chained.
// Money: integer cents.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./engine.js"), require("./world.js"), require("./assets.js"));
  else root.AltFund = factory(root.AltEngine, root.AltWorld, root.AltAssets);
})(typeof self !== "undefined" ? self : this, function (E, W, A) {
  "use strict";
  const CATS = ["income", "realized", "unrealized", "mgmtFee", "perfFee", "expense", "interest", "flow"];
  const CAT_NAME = { income: "Thu nhập (lãi, cổ tức, thuê, thu hoạch)", realized: "Lãi/lỗ đã thực hiện", unrealized: "Lãi/lỗ chưa thực hiện (ước tính)", mgmtFee: "Phí quản lý trả cho GP/quỹ", perfFee: "Phí hiệu suất / carried interest", expense: "Chi phí vận hành", interest: "Lãi vay", flow: "Dòng vốn khách hàng (nộp/rút)" };
  const R = Math.round;
  function fnv(str, h) { h = h >>> 0 || 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }

  function create({ initial, q }) {
    E.need(E.isCents(initial) && initial > 0, "Vốn ban đầu không hợp lệ");
    const f = { initial, cash: 0, debt: 0, credit: { limit: 0, rate: 0 }, holdings: [], ledger: [], seq: 0, hash: "", nextId: 1,
      navHist: [], cum: zero(), q: q || 0, flows: [], marked: {} };
    post(f, q || 0, "SEED", null, { cash: initial, cat: { flow: initial }, n: "Vốn khởi điểm từ Hội đồng quản trị" });
    f.navHist.push({ q: q || 0, nav: nav(f), ret: 0, flow: 0, bench: 0, idx: 1 });
    return f;
  }
  const zero = () => Object.fromEntries(CATS.map(k => [k, 0]));
  const hold = (f, id) => f.holdings.find(h => h.id === id) || null;

  // ---------- Posting ----------
  function post(f, q, t, hid, d) {
    const h = hid ? hold(f, hid) : null;
    if (hid) E.need(!!h, "Không tìm thấy khoản đầu tư " + hid);
    const c = d.cash || 0, v = d.value || 0, k = d.cost || 0, db = d.debt || 0, fd = d.fdebt || 0;
    for (const x of [c, v, k, db, fd]) E.need(E.isCents(x), "Bút toán phải là số nguyên cent");
    const cat = Object.assign(zero(), d.cat || {});
    const lhs = c + v - db - fd, rhs = CATS.reduce((s, x) => s + cat[x], 0);
    E.need(lhs === rhs, `Bút toán không cân (${t}): ${lhs} ≠ ${rhs}`);
    f.cash += c; f.debt += fd;
    for (const x of CATS) f.cum[x] += cat[x];
    if (h) {
      h.value += v; h.cost += k; h.debt += db;
      if (d.paidIn) h.paidIn += d.paidIn;
      if (d.unfunded) h.unfunded += d.unfunded;
      if (d.commit) h.commit += d.commit;
      if (d.dist) h.dist += d.dist;
      h.inc += cat.income; h.fees += cat.mgmtFee + cat.perfFee; h.exp += cat.expense + cat.interest; h.real += cat.realized;
      if (d.cf) h.cf.push({ q, a: d.cf });
    }
    const rec = { s: ++f.seq, q, t, h: hid || null, c, v, k, d: db, fd, pi: d.paidIn || 0, uf: d.unfunded || 0, cm: d.commit || 0, ds: d.dist || 0, cf: d.cf || 0, cat: compact(cat), n: d.n || "" };
    rec.x = fnv(JSON.stringify(rec), parseInt(f.hash || "0", 16) || 0x811c9dc5);
    f.hash = rec.x;
    f.ledger.push(rec);
    return rec;
  }
  const compact = cat => Object.fromEntries(Object.entries(cat).filter(([, v]) => v));

  // ---------- Holdings ----------
  // Creates a holding; a commitment records unfunded capital, a purchase moves cash into value.
  function open(f, q, spec, ctx) {
    const T = A.TYPES[spec.type]; E.need(!!T, "Loại tài sản không hợp lệ");
    const id = "H" + (f.nextId++);
    const h = { id, deal: spec.deal || null, type: spec.type, cls: T.cls, liq: T.liq, basis: T.basis, name: spec.name, startQ: q, status: "active",
      commit: 0, unfunded: 0, paidIn: 0, cost: 0, value: 0, debt: 0, dist: 0, inc: 0, fees: 0, exp: 0, real: 0, cf: [], terms: spec.terms || {}, lockUntil: spec.lockQ ? q + spec.lockQ : null, notes: [] };
    h.m = A.MODELS[spec.type].init(Object.assign({ id, commit: spec.commit || 0, amount: spec.buy || 0 }, spec.terms, spec.params || {}), ctx);
    f.holdings.push(h);
    if (spec.commit) post(f, q, "COMMIT", id, { commit: spec.commit, unfunded: spec.commit, n: `Cam kết vốn ${E.toM(spec.commit).toFixed(2)}M — chưa giải ngân, không phải tài sản` });
    if (spec.buy) {
      E.need(f.cash >= spec.buy + (spec.txCost || 0) - (spec.borrow || 0), "Không đủ tiền mặt");
      post(f, q, "BUY", id, { cash: -spec.buy, value: spec.buy, cost: spec.buy, paidIn: spec.buy, cf: -spec.buy, n: `Mua ${spec.name}` });
      if (spec.borrow) post(f, q, "BORROW", id, { cash: spec.borrow, debt: spec.borrow, cf: spec.borrow, n: `Vay thế chấp ${E.toM(spec.borrow).toFixed(2)}M (tài sản và nợ cùng tăng, NAV không đổi)` });
      if (spec.txCost) post(f, q, "TXCOST", id, { cash: -spec.txCost, cf: -spec.txCost, cat: { expense: -spec.txCost }, n: "Chi phí giao dịch và thẩm định" });
    }
    return h;
  }

  // Applies the events a model produced for one quarter
  function apply(f, q, h, evs, news) {
    for (const e of evs) {
      switch (e.t) {
        case "CALL": {
          const amt = e.inv + e.fee;
          post(f, q, "CALL", h.id, { cash: -amt, value: e.inv, cost: e.inv, paidIn: amt, unfunded: -amt, cf: -amt, cat: { mgmtFee: -e.fee }, n: e.note });
          break;
        }
        case "COMMIT": post(f, q, "COMMIT", h.id, { commit: e.amt, unfunded: e.amt, n: e.note }); news && news.push(e.note); break;
        case "MARK": if (e.amt) post(f, q, "MARK", h.id, { value: e.amt, cat: e.cat === "income" ? { income: e.amt } : { unrealized: e.amt }, n: e.note }); break;
        case "PERF": if (e.amt) post(f, q, "PERF", h.id, { value: e.amt, cat: { perfFee: e.amt }, n: e.note }); break;
        case "FEE": if (e.amt) post(f, q, "FEE", h.id, { value: -e.amt, cat: { mgmtFee: -e.amt }, n: e.note }); break;
        case "INCOME": if (e.amt) post(f, q, "INCOME", h.id, { cash: e.amt, cf: e.amt, cat: { income: e.amt }, n: e.note }); break;
        case "COST": if (e.amt) post(f, q, "COST", h.id, { cash: -e.amt, cf: -e.amt, cat: { [e.cat || "expense"]: -e.amt }, n: e.note }); break;
        case "DIST": distribute(f, q, h, e.amt, e.note); break;
        case "SETTLE": settle(f, q, h, e.amt, e.perf || 0, e.note); news && news.push(e.note); break;
        case "WRITEOFF": if (h.value) post(f, q, "MARK", h.id, { value: -h.value, cat: { unrealized: -h.value }, n: e.note }); close(f, q, h, "written_off"); news && news.push(e.note); break;
        case "LOSS": { const l = R(h.value * e.frac); if (l) post(f, q, "MARK", h.id, { value: -l, cat: { unrealized: -l }, n: e.note }); if (e.frac >= 1) close(f, q, h, "lost"); news && news.push(e.note); break; }
        case "REPAY": { const amt = Math.min(e.amt, h.debt); if (amt > 0) post(f, q, "REPAY", h.id, { cash: -amt, debt: -amt, cf: -amt, n: e.note }); news && news.push(e.note); break; }
        case "NOTE": news && news.push(e.note); break;
        default: throw new E.AltError("Sự kiện không hợp lệ: " + e.t);
      }
    }
  }
  // value → cash; cost relieved pro rata, so realized gain = amount − cost relieved
  function distribute(f, q, h, amt, note) {
    if (!(amt > 0)) return;
    const base = h.value;
    const relief = base > 0 ? Math.min(h.cost, E.mulDiv(h.cost, Math.min(amt, base), base)) : h.cost;
    const realized = amt - relief;
    post(f, q, "DIST", h.id, { cash: amt, value: -amt, cost: -relief, dist: amt, cf: amt, cat: { realized, unrealized: -realized }, n: note || "Phân phối" });
  }
  // realise the whole holding at amt (after an optional carry to the GP)
  function settle(f, q, h, amt, perf, note) {
    const gross = amt + perf, adj = gross - h.value;
    if (adj) post(f, q, "MARK", h.id, { value: adj, cat: { unrealized: adj }, n: "Điều chỉnh về giá trị thực hiện" });
    if (perf) post(f, q, "PERF", h.id, { value: -perf, cat: { perfFee: -perf }, n: "Carried interest trả GP khi thoái vốn" });
    if (amt > 0) distribute(f, q, h, amt, note);
    closeCost(f, q, h);
    if (h.debt) post(f, q, "REPAY", h.id, { cash: -h.debt, debt: -h.debt, cf: -h.debt, n: "Trả hết nợ vay gắn với tài sản" });
    close(f, q, h, "exited");
  }
  // whatever cost is left when a holding closes is a realized loss (reclassified from unrealized)
  function closeCost(f, q, h) {
    if (h.cost) post(f, q, "CLOSE", h.id, { cost: -h.cost, cat: { realized: -h.cost, unrealized: h.cost }, n: "Ghi nhận phần giá vốn còn lại là lỗ đã thực hiện" });
  }
  function close(f, q, h, status) {
    if (h.unfunded) post(f, q, "UNCOMMIT", h.id, { unfunded: -h.unfunded, n: "Hủy phần vốn cam kết chưa giải ngân" });
    closeCost(f, q, h);
    h.status = status; h.closedQ = q;
  }
  // Sell part or all of a holding: liquid at market less costs, illiquid on the secondary market at a discount.
  // A buyer of a commitment takes over its unfunded capital.
  function sell(f, q, h, frac, w, why) {
    E.need(h.status === "active", "Khoản đầu tư đã đóng");
    E.need(frac > 0 && frac <= 1, "Tỷ lệ bán 1–100%");
    E.need(!(h.lockUntil != null && q < h.lockUntil), `Đang trong thời gian khóa vốn (lockup) tới ${W.label(h.lockUntil)}`);
    const disc = A.TYPES[h.type].liq === "liquid" ? (A.SELL_COST[h.type] || 0) : h.type === "hf" || h.type === "fof" ? (w.liq < 0.4 ? 0.03 : 0.005) : A.secondaryDiscount(h, w);
    const v = R(h.value * frac), px = R(v * (1 - disc)), loss = px - v;
    const debtPart = R(h.debt * frac);
    if (loss) post(f, q, "MARK", h.id, { value: loss, cat: { unrealized: loss }, n: `${A.TYPES[h.type].liq === "illiquid" ? "Chiết khấu thị trường thứ cấp" : "Chi phí bán"} ${(disc * 100).toFixed(1)}%` });
    if (debtPart) post(f, q, "REPAY", h.id, { cash: -debtPart, debt: -debtPart, cf: -debtPart, n: "Trả nợ vay tương ứng phần bán" });
    distribute(f, q, h, px, why || `Bán ${Math.round(frac * 100)}% ${h.name}`);
    if (frac >= 1 || h.value <= 0) {
      if (h.unfunded) post(f, q, "UNCOMMIT", h.id, { unfunded: -h.unfunded, n: "Bên mua nhận phần vốn cam kết chưa giải ngân" });
      closeCost(f, q, h);
      h.status = "sold"; h.closedQ = q;
    } else if (h.unfunded) {
      const u = R(h.unfunded * frac); post(f, q, "UNCOMMIT", h.id, { unfunded: -u, commit: -u, n: "Bên mua nhận phần vốn cam kết tương ứng" });
    }
    return { price: px, discount: disc, loss };
  }

  // ---------- Fund-level cash: credit line, interest on cash, external flows ----------
  function setCredit(f, limit, rate) { E.need(E.isCents(limit) && limit >= 0, "Hạn mức không hợp lệ"); f.credit = { limit, rate }; }
  function draw(f, q, amt, note) { E.need(f.debt + amt <= f.credit.limit, "Vượt hạn mức tín dụng"); post(f, q, "DRAW", null, { cash: amt, fdebt: amt, n: note || "Rút hạn mức tín dụng của quỹ" }); }
  function repayFund(f, q, amt) { const a = Math.min(amt, f.debt, Math.max(0, f.cash)); if (a > 0) post(f, q, "REPAY", null, { cash: -a, fdebt: -a, n: "Trả hạn mức tín dụng" }); return a; }
  function flow(f, q, amt, note) {
    E.need(E.isCents(amt) && amt !== 0, "Số tiền không hợp lệ");
    post(f, q, "FLOW", null, { cash: amt, cat: { flow: amt }, n: note });
    f.flows.push({ q, a: amt });
  }
  function expense(f, q, amt, note) { if (amt > 0) post(f, q, "OPEX", null, { cash: -amt, cat: { expense: -amt }, n: note }); }
  function fundIncome(f, q, amt, note) { if (amt) post(f, q, "CASHINT", null, { cash: amt, cat: { income: amt }, n: note }); }

  // One quarter for every open holding, then cash interest and the credit line
  function stepQuarter(f, q, ctx) {
    const news = [];
    // interest on idle cash (T-bill-like, simulated rate) and on the credit line
    if (f.cash > 0) fundIncome(f, q, E.mul(f.cash, Math.max(0, ctx.W0.rate - 0.003) / 4), "Lãi tiền gửi trên tiền mặt nhàn rỗi");
    if (f.debt > 0) post(f, q, "INTEREST", null, { cash: -E.mul(f.debt, f.credit.rate / 4), cat: { interest: -E.mul(f.debt, f.credit.rate / 4) }, n: "Lãi hạn mức tín dụng của quỹ" });
    for (const h of f.holdings.filter(x => x.status === "active")) {
      const evs = A.step(h, ctx);
      apply(f, q, h, evs, news);
    }
    return news;
  }
  // Covers a cash shortfall: credit line first, then liquid holdings at market. Returns what is still missing.
  function cover(f, q, w) {
    const steps = [];
    if (f.cash >= 0) return { short: 0, steps };
    const room = f.credit.limit - f.debt;
    if (room > 0) { const a = Math.min(room, -f.cash); draw(f, q, a, "Tự động rút hạn mức để thanh toán nghĩa vụ"); steps.push(`Rút hạn mức ${E.toM(a).toFixed(2)}M`); }
    for (const h of f.holdings.filter(x => x.status === "active" && A.TYPES[x.type].liq === "liquid").sort((a, b) => b.value - a.value)) {
      if (f.cash >= 0) break;
      const need = -f.cash, frac = Math.min(1, need / (h.value * (1 - (A.SELL_COST[h.type] || 0))) * 1.001);
      if (h.value <= 0) continue;
      const r = sell(f, q, h, Math.min(1, frac), w, `Bán bắt buộc để thanh toán: ${h.name}`);
      steps.push(`Bán ${h.name} ${E.toM(r.price).toFixed(2)}M`);
    }
    return { short: f.cash < 0 ? -f.cash : 0, steps };
  }

  // ---------- Measures ----------
  function nav(f) { return f.cash + f.holdings.reduce((s, h) => s + (h.status === "active" ? h.value - h.debt : 0), 0) - f.debt; }
  function grossAssets(f) { return Math.max(0, f.cash) + f.holdings.reduce((s, h) => s + (h.status === "active" ? h.value : 0), 0); }
  function unfunded(f) { return f.holdings.reduce((s, h) => s + (h.status === "active" ? h.unfunded : 0), 0); }
  function forecastCalls(f, n) {
    const out = new Array(n).fill(0);
    for (const h of f.holdings) A.forecast(h, n).forEach((a, i) => { out[i] += a; });
    return out;
  }
  function exposure(f) {
    const n = nav(f), by = {};
    for (const k of Object.keys(A.CLASSES)) by[k] = 0;
    for (const h of f.holdings) if (h.status === "active") by[h.cls] += h.value - h.debt;
    by.cash = f.cash - f.debt;
    const pct = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, n > 0 ? v / n : 0]));
    return { nav: n, by, pct };
  }
  function liquidity(f, horizon) {
    const n = nav(f), H = horizon || 4;
    const buckets = { cash: Math.max(0, f.cash), liquid: 0, semi: 0, illiquid: 0 };
    for (const h of f.holdings) if (h.status === "active") buckets[A.TYPES[h.type].liq] += Math.max(0, h.value - h.debt);
    const calls = forecastCalls(f, H), need = calls.reduce((s, x) => s + x, 0);
    const avail = buckets.cash + R(buckets.liquid * 0.97) + R(buckets.semi * 0.5) + Math.max(0, f.credit.limit - f.debt);
    return { buckets, calls, need, avail, coverage: need > 0 ? avail / need : Infinity, illiquidPct: n > 0 ? buckets.illiquid / n : 0, unfunded: unfunded(f) };
  }
  // quarterly time-weighted return; external flows assumed at the start of the quarter
  function closeQuarter(f, q, w) {
    const last = f.navHist[f.navHist.length - 1], n = nav(f);
    const fl = f.flows.filter(x => x.q === q).reduce((s, x) => s + x.a, 0);
    const base = last.nav + fl, ret = base > 0 ? (n - base) / base : 0;
    const row = { q, nav: n, ret, flow: fl, bench: w.benchRet, idx: last.idx * (1 + ret), benchIdx: (last.benchIdx || 1) * (1 + w.benchRet), cash: f.cash, debt: f.debt, unfunded: unfunded(f) };
    f.navHist.push(row);
    return row;
  }
  // per-holding performance: IRR on quarterly cash flows (+ current value), MOIC on invested capital
  function holdingStats(f, h, qNow) {
    const by = {};
    for (const c of h.cf) by[c.q] = (by[c.q] || 0) + c.a;
    const qs = Object.keys(by).map(Number).sort((a, b) => a - b);
    let ir = null;
    if (qs.length) {
      const t0 = qs[0], cfs = [], times = [];
      for (const q of qs) { cfs.push(by[q] / 1e8); times.push((q - t0) / 4); }
      if (h.status === "active") { const tq = (qNow - t0) / 4; if (times.length && times[times.length - 1] === tq) cfs[cfs.length - 1] += (h.value - h.debt) / 1e8; else { cfs.push((h.value - h.debt) / 1e8); times.push(tq); } }
      ir = times[times.length - 1] > 0 ? E.irr(cfs, { times }) : null;
    }
    // multiples from Aurelion's own net cash flows by quarter: what went in, what came back
    // (distributions, income, sale proceeds), plus what is still held net of debt
    let contributed = 0, received = 0;
    for (const q of qs) { if (by[q] < 0) contributed -= by[q]; else received += by[q]; }
    const navNow = h.status === "active" ? h.value - h.debt : 0;
    const invested = contributed - feesInCalls(f, h);
    return {
      irr: ir, moic: invested > 0 ? (received + navNow) / invested : null,
      mult: E.multiples({ distributions: received, nav: navNow, paidIn: contributed }),
      unrealized: h.status === "active" ? h.value - h.cost : 0, invested, contributed, received
    };
  }
  function feesInCalls(f, h) { return f.ledger.filter(r => r.h === h.id && r.t === "CALL").reduce((s, r) => s - (r.cat.mgmtFee || 0), 0); }
  // since-inception money-weighted return of the fund (board capital in, flows, NAV now), annualised
  function fundIrr(f, qNow) {
    const cfs = [-f.initial / 1e8], times = [0];
    for (const x of f.flows) { cfs.push(-x.a / 1e8); times.push(x.q / 4); }
    const last = qNow / 4;
    cfs.push(nav(f) / 1e8); times.push(last);
    if (last <= 0) return null;
    const ord = times.map((t, i) => [t, cfs[i]]).sort((a, b) => a[0] - b[0]);
    return E.irr(ord.map(x => x[1]), { times: ord.map(x => x[0]) });
  }

  // ---------- Reconciliation ----------
  // Rebuilds every balance from the ledger and checks the chain and the NAV identity.
  function verify(f) {
    const errors = [];
    let cash = 0, fdebt = 0, prev = "";
    const hs = {}; const cum = zero();
    for (const r of f.ledger) {
      const { x, ...rest } = r;
      if (fnv(JSON.stringify(rest), parseInt(prev || "0", 16) || 0x811c9dc5) !== x) { errors.push(`Chuỗi băm sai ở bút toán ${r.s}`); break; }
      prev = x;
      cash += r.c; fdebt += r.fd;
      for (const [k, v] of Object.entries(r.cat)) cum[k] += v;
      if (r.h) { const o = hs[r.h] = hs[r.h] || { value: 0, cost: 0, debt: 0, paidIn: 0, unfunded: 0, dist: 0, commit: 0 }; o.value += r.v; o.cost += r.k; o.debt += r.d; o.paidIn += r.pi; o.unfunded += r.uf; o.dist += r.ds; o.commit += r.cm; }
      if (r.c + r.v - r.d - r.fd !== Object.values(r.cat).reduce((s, v) => s + v, 0)) errors.push(`Bút toán ${r.s} không cân`);
    }
    if (prev !== f.hash) errors.push("Mã băm cuối không khớp");
    if (cash !== f.cash) errors.push(`Tiền mặt sổ cái ${cash} ≠ ${f.cash}`);
    if (fdebt !== f.debt) errors.push("Nợ của quỹ không khớp");
    for (const x of f.holdings) {
      const o = hs[x.id] || { value: 0, cost: 0, debt: 0, paidIn: 0, unfunded: 0, dist: 0, commit: 0 };
      for (const k of ["value", "cost", "debt", "paidIn", "unfunded", "dist", "commit"]) if (o[k] !== x[k]) errors.push(`${x.id} ${k}: sổ cái ${o[k]} ≠ ${x[k]}`);
      if (x.status !== "active" && (x.value !== 0 || x.debt !== 0)) errors.push(`${x.id} đã đóng nhưng còn giá trị`);
    }
    for (const k of CATS) if (cum[k] !== f.cum[k]) errors.push(`Tổng ${k} không khớp`);
    const n = nav(f), sumCats = CATS.reduce((s, k) => s + cum[k], 0);
    if (n !== sumCats) errors.push(`NAV ${n} ≠ tổng các khoản ${sumCats}`);
    return { ok: errors.length === 0, errors, nav: n, cats: cum };
  }
  // P&L of postings in a range of quarters, by category
  function pnl(f, q0, q1) {
    const out = zero();
    for (const r of f.ledger) if (r.q >= q0 && r.q <= q1 && r.t !== "SEED") for (const [k, v] of Object.entries(r.cat)) out[k] += v;
    return out;
  }

  return { CATS, CAT_NAME, create, open, apply, post, distribute, settle, sell, setCredit, draw, repayFund, flow, expense, stepQuarter, cover,
    nav, grossAssets, unfunded, forecastCalls, exposure, liquidity, closeQuarter, holdingStats, fundIrr, verify, pnl, hold };
});

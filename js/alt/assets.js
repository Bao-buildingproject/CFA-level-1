// ============================================================
// alt/assets.js — Alternative Empire: how each kind of investment behaves over a quarter
// A model turns the new economy into accounting events (capital calls, marks, income,
// distributions, fees, carried interest, debt) that alt/fund.js posts to the ledger.
// Models never touch cash or the ledger themselves. Valuations of assets without an
// observable price are model estimates (Level 3) and are flagged as such.
// Money: integer cents. Noise comes from AltWorld.noise, so results repeat for a seed.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./engine.js"), require("./world.js"));
  else root.AltAssets = factory(root.AltEngine, root.AltWorld);
})(typeof self !== "undefined" ? self : this, function (E, W) {
  "use strict";
  const R = Math.round, clamp = E.clamp;

  // Asset classes for allocation and limits
  const CLASSES = {
    pe: { name: "Private equity", short: "PE", color: "#C9A86A" },
    debt: { name: "Private debt", short: "Nợ", color: "#8FB3E8" },
    re: { name: "Bất động sản", short: "BĐS", color: "#5CC9A7" },
    infra: { name: "Hạ tầng", short: "Hạ tầng", color: "#7FD1E0" },
    nr: { name: "Đất nông nghiệp & rừng", short: "Đất", color: "#A7C76B" },
    cmdty: { name: "Hàng hóa", short: "Hàng hóa", color: "#E0A75C" },
    hf: { name: "Hedge funds", short: "HF", color: "#B49AF0" },
    digital: { name: "Tài sản số", short: "Số", color: "#E57FB0" }
  };
  // type → class, liquidity, valuation basis
  const TYPES = {
    pefund: { cls: "pe", liq: "illiquid", basis: "model", name: "Quỹ private equity (LP)" },
    coinv: { cls: "pe", liq: "illiquid", basis: "model", name: "Co-investment" },
    equity: { cls: "pe", liq: "illiquid", basis: "model", name: "Cổ phần tư nhân" },
    loan: { cls: "debt", liq: "illiquid", basis: "model", name: "Khoản vay tư nhân" },
    distressed: { cls: "debt", liq: "semi", basis: "model", name: "Nợ khó đòi (distressed)" },
    re: { cls: "re", liq: "illiquid", basis: "model", name: "Bất động sản sở hữu trực tiếp" },
    reit: { cls: "re", liq: "liquid", basis: "market", name: "Cổ phiếu REIT niêm yết" },
    infra: { cls: "infra", liq: "illiquid", basis: "model", name: "Dự án hạ tầng" },
    farm: { cls: "nr", liq: "illiquid", basis: "model", name: "Đất nông nghiệp" },
    timber: { cls: "nr", liq: "illiquid", basis: "model", name: "Rừng trồng (timberland)" },
    futures: { cls: "cmdty", liq: "liquid", basis: "market", name: "Hợp đồng tương lai hàng hóa" },
    gold: { cls: "cmdty", liq: "liquid", basis: "market", name: "Vàng vật chất" },
    hf: { cls: "hf", liq: "semi", basis: "model", name: "Hedge fund nội bộ" },
    fof: { cls: "hf", liq: "semi", basis: "model", name: "Fund of hedge funds" },
    token: { cls: "digital", liq: "liquid", basis: "market", name: "Token nắm giữ trực tiếp" },
    dfund: { cls: "digital", liq: "liquid", basis: "market", name: "Quỹ/ETP tài sản số" },
    dlteq: { cls: "digital", liq: "liquid", basis: "market", name: "Cổ phiếu công ty blockchain" }
  };
  const SELL_COST = { reit: 0.003, futures: 0.001, gold: 0.005, token: 0.01, dfund: 0.003, dlteq: 0.003, hf: 0, fof: 0 };
  const nz = (ctx, h, k) => W.noise(ctx.seed, h.id, ctx.q, k);
  const dz = (ctx, h, k) => W.draw(ctx.seed, h.id, ctx.q, k);

  // ======================= Companies (Chapter 3 and direct deals) =======================
  // kind "startup": milestone rounds; "mature": EBITDA × multiple less net debt; "distressed": EV vs debt face
  function newCompany(p, w) {
    const c = Object.assign({ status: "active", age: 0, hist: [] }, JSON.parse(JSON.stringify(p)));
    c.r0 = w.rate; c.s0 = w.spread;
    if (c.kind === "mature") { c.mult = c.mult0; value(c); }
    if (c.kind === "distressed") c.recoveryEst = clamp(c.ev / c.face, 0, 1.05);
    return c;
  }
  function value(c) {
    if (c.kind === "startup") c.equity = c.status === "failed" ? 0 : c.val;
    else if (c.kind === "mature") { c.evNow = R(c.ebitda * c.mult); c.equity = Math.max(0, c.evNow - c.netDebt); c.lev = c.ebitda > 0 ? c.netDebt / c.ebitda : Infinity; }
    else if (c.kind === "distressed") c.equity = 0;
    return c.equity;
  }
  // one quarter for a company; returns news strings and decision flags it raises
  function stepCompany(c, w, ctx) {
    const out = [];
    if (c.status !== "active") return out;
    c.age += 1;
    const z = k => W.noise(ctx.seed, c.id, ctx.q, k), u = k => W.draw(ctx.seed, c.id, ctx.q, k);
    if (c.kind === "startup") {
      if ((c.milestones || []).includes(c.age)) {
        const p = clamp(0.6 + 0.25 * (w.liq - 0.7) - 0.3 * (w.vol - 0.2) + (c.support ? 0.1 : 0) + (c.bonus || 0), 0.15, 0.92);
        if (u("ms") < p) { c.val = R(c.val * 1.7); c.stage += 1; out.push({ k: "ms-ok", text: `${c.name} đạt mốc sản phẩm (vòng ${c.stage}); định giá tăng 70%.` }); }
        else {
          c.val = R(c.val * 0.5); c.fails += 1;
          out.push({ k: "ms-fail", text: `${c.name} trượt mốc sản phẩm; vòng gọi vốn mới phải hạ giá (down round) 50%.` });
          if (c.fails >= 2) { c.status = "failed"; c.val = 0; out.push({ k: "failed", text: `${c.name} cạn tiền và đóng cửa. Cổ phần về 0; chủ nợ chỉ thu hồi một phần.` }); }
        }
      }
      if (c.status === "active" && c.stage >= 3 && !c.exitReady) { c.exitReady = true; out.push({ k: "exit-ready", text: `${c.name} đủ điều kiện thoái vốn (IPO hoặc bán cho đối tác chiến lược).` }); }
      if (c.status === "active" && c.age >= (c.maxAge || 14)) exitCompany(c, w, "trade", out);
    } else if (c.kind === "mature") {
      const plan = c.plan === "cost" ? (c.age <= 6 ? 0.03 : 0.005) : c.plan === "growth" ? 0.05 : 0;
      const g = (w.gdp - 0.02) * 1.5 + plan + (c.drift || 0);
      c.ebitda = R(Math.max(1, c.ebitda * (1 + g / 4 + 0.025 * z("e"))));
      c.mult = Math.max(3, c.mult0 - 10 * (w.rate - c.r0) - 8 * (w.spread - c.s0) + 0.25 * z("m"));
      const interest = E.mul(c.netDebt, (w.rate + c.debtSpread) / 4);
      const fcf = R(c.ebitda / 4 * (c.plan === "growth" ? 0.3 : 0.5)) - interest;
      c.netDebt = Math.max(0, c.netDebt - fcf);
      value(c);
      if (c.lev > c.covenant && !c.breach) { c.breach = true; out.push({ k: "breach", text: `${c.name} vi phạm covenant: nợ ròng/EBITDA ${c.lev.toFixed(1)}× > ${c.covenant}×.` }); }
      if (c.equity <= 0) { c.status = "default"; out.push({ k: "default", text: `${c.name} mất khả năng trả nợ: giá trị doanh nghiệp thấp hơn nợ. Chủ nợ tiếp quản, cổ phần về 0.` }); }
    } else if (c.kind === "distressed") {
      c.ev = R(Math.max(1, c.ev * (1 + (w.gdp - 0.01) / 4 + 0.35 * (w.metals / (ctx.W0.metals || w.metals) - 1) + 0.04 * z("ev"))));
      c.recoveryEst = clamp(c.ev / c.face * (0.75 + 0.25 * w.liq) + (c.active ? 0.04 : 0), 0, 1.05);
      if (c.age >= c.resolveAge) {
        const cov = c.ev / c.face + (c.active ? 0.06 : 0);
        if (cov >= 0.9) { c.outcome = "reorg-strong"; c.recovery = Math.min(1.05, cov); }
        else if (cov >= 0.45) { c.outcome = "reorg"; c.recovery = cov * 0.9; }
        else { c.outcome = "liquidation"; c.recovery = cov * 0.65; }
        c.recovery = Math.round(c.recovery * 1e4) / 1e4;
        c.status = "resolved";
        out.push({ k: "resolved", text: `${c.name}: ${c.outcome === "liquidation" ? "thanh lý tài sản" : "tái cấu trúc thành công"}; chủ nợ thu hồi ${(c.recovery * 100).toFixed(1)}% mệnh giá.` });
      }
    }
    c.hist.push({ q: ctx.q, equity: c.equity || 0, ev: c.evNow || c.ev || c.val || 0 });
    if (c.hist.length > 40) c.hist.shift();
    return out;
  }
  // routes: "ipo", "trade" (trade sale), "sbo" (secondary buyout), "recap" (dividend recapitalisation)
  function exitCompany(c, w, route, out) {
    if (c.status !== "active") return { ok: false, msg: "Doanh nghiệp không còn hoạt động" };
    if (route === "recap") {
      if (c.kind !== "mature") return { ok: false, msg: "Chỉ doanh nghiệp có EBITDA ổn định mới tái cấp vốn được" };
      if (w.liq < 0.5) return { ok: false, msg: "Thị trường tín dụng đóng băng: ngân hàng không cho vay thêm" };
      const target = R(c.ebitda * Math.min(5, c.covenant - 0.5)), extra = Math.max(0, target - c.netDebt);
      c.netDebt += extra; c.recapPaid = (c.recapPaid || 0) + extra; value(c);
      out && out.push({ k: "recap", text: `${c.name} vay thêm và trả cổ tức đặc biệt (dividend recap).` });
      return { ok: true, dividend: extra };
    }
    const f = route === "ipo" ? (w.liq >= 0.6 ? 0.95 + 0.4 * (w.eqIdx / 100 - 1) : null) : route === "trade" ? 1.05 : route === "sbo" ? (w.liq >= 0.45 ? 1.0 : null) : null;
    if (f == null) return { ok: false, msg: route === "ipo" ? "Cửa sổ IPO đóng: thanh khoản thị trường thấp" : "Không có người mua phù hợp lúc này" };
    const ev = c.kind === "startup" ? c.val : c.evNow;
    const exitEquity = Math.max(0, R(ev * clamp(f, 0.6, 1.5)) - (c.netDebt || 0));
    c.status = "exited"; c.exit = { q: w.q, route, equity: exitEquity, debtRepaid: c.netDebt || 0 };
    c.equity = exitEquity;
    out && out.push({ k: "exit", text: `${c.name} thoái vốn qua ${{ ipo: "IPO", trade: "bán cho nhà đầu tư chiến lược (trade sale)", sbo: "bán cho quỹ khác (secondary buyout)" }[route]}.` });
    return { ok: true, equity: exitEquity };
  }

  // ======================= Models =======================
  const MODELS = {};

  // ---- Private equity fund commitment (LP) ----
  // Calls: management fee on committed capital each quarter while undrawn capital remains, plus the
  // cost of each new deal. Deals are held at cost for four quarters, then marked with a lag
  // (appraisal smoothing). Exits pay through the waterfall chosen in the contract.
  MODELS.pefund = {
    init(p, ctx) {
      const n = p.deals || 6, per = R(p.commit * 0.85 / n), entries = [0, 1, 2, 3, 5, 7].slice(0, n);
      const deals = entries.map((a, i) => {
        const fail = W.draw(ctx.seed, p.id, 0, "fail" + i) < (p.failP != null ? p.failP : 0.15);
        return { i, entry: a, cost: per, exit: a + 10 + Math.floor(W.draw(ctx.seed, p.id, 0, "exit" + i) * 6), fail, tv: 0, rep: 0, live: false, done: false };
      });
      return { age: -1, deals, calls: [], gross: 0, cumProceeds: 0, gpPaid: 0, accrued: 0, recv: 0, suspended: false };
    },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, ev = [];
      m.age += 1;
      // 1. capital call: fee on committed capital + new deals (key-person suspension stops new deals)
      let fee = h.unfunded > 0 ? Math.min(h.unfunded, E.mul(h.commit, t.mgmt / 4)) : 0;
      let inv = 0;
      for (const d of m.deals) if (d.entry === m.age && !d.live && !d.done) {
        if (m.suspended || h.unfunded - fee - inv < d.cost) { d.entry += 1; continue; }
        d.live = true; d.tv = d.cost; d.rep = d.cost; inv += d.cost;
      }
      if (fee + inv > 0) { ev.push({ t: "CALL", inv, fee, note: inv ? `Gọi vốn: ${fmt(inv)} cho thương vụ mới + phí quản lý ${fmt(fee)}` : `Gọi vốn trả phí quản lý ${fmt(fee)}` }); m.calls.push({ age: m.age, amt: fee + inv }); }
      const paidInNow = h.paidIn + fee + inv;
      // 2. marks on deals already held
      let dm = 0;
      for (const d of m.deals) {
        if (!d.live || d.entry === m.age) continue;
        const held = m.age - d.entry;
        if (d.fail && held >= 4) d.tv = R(d.tv * 0.45);
        else d.tv = R(Math.max(0, d.tv * (1 + t.beta * (w.eqRet - w.rate / 4) + w.rate / 4 + t.alpha / 4 + t.sigma * nz(ctx, h, "d" + d.i))));
        const rep = held < 4 ? d.cost : R(d.rep + 0.5 * (d.tv - d.rep));
        dm += rep - d.rep; d.rep = rep;
      }
      // 3. exits (frozen markets delay them)
      const exiting = [];
      for (const d of m.deals) if (d.live && m.age >= d.exit) {
        if (w.liq < 0.35 && !d.fail) { d.exit += 2; continue; }
        dm += d.tv - d.rep; d.rep = d.tv; exiting.push(d);
      }
      if (dm) ev.push({ t: "MARK", amt: dm, note: "Định giá lại các thương vụ (ước tính, có độ trễ)" });
      // 4. waterfall on what exits
      const P = exiting.reduce((s, d) => s + d.tv, 0);
      let gpPay = 0;
      if (exiting.length) {
        if (t.waterfall === "american") {
          for (const d of exiting) gpPay += E.waterfall({ capital: d.cost, proceeds: d.tv, carry: t.carry, pref: t.pref, years: (m.age - d.entry) / 4, catchUp: t.catchUp }).gp;
        } else {
          const due = E.waterfall({ capital: paidInNow, proceeds: m.cumProceeds + P, carry: t.carry, catchUp: t.catchUp, prefAmount: prefOf(m, t) }).gp;
          gpPay = Math.max(0, due - m.gpPaid);
        }
        gpPay = Math.min(gpPay, P);
        for (const d of exiting) { d.live = false; d.done = true; d.realized = d.tv; d.tv = 0; d.rep = 0; }
        m.cumProceeds += P; m.gpPaid += gpPay;
        if (P - gpPay > 0) ev.push({ t: "DIST", amt: P - gpPay, note: `Phân phối từ ${exiting.length} thương vụ thoái vốn` });
        if (gpPay > 0) ev.push({ t: "PERF", amt: -gpPay, note: `Carried interest trả GP ${fmt(gpPay)} (${t.waterfall === "american" ? "theo từng thương vụ" : "toàn quỹ"})` });
      }
      m.gross = sumRep(m);
      // 5. carry accrued on a liquidation basis, and a clawback receivable if the clause exists
      const ent = E.waterfall({ capital: paidInNow, proceeds: m.cumProceeds + m.gross, carry: t.carry, catchUp: t.catchUp, prefAmount: prefOf(m, t) }).gp;
      let accrued, recv;
      if (t.waterfall === "american") {
        accrued = m.deals.filter(d => d.live).reduce((s, d) => s + E.waterfall({ capital: d.cost, proceeds: d.rep, carry: t.carry, pref: t.pref, years: (m.age - d.entry) / 4, catchUp: t.catchUp }).gp, 0);
        recv = t.clawback ? Math.max(0, m.gpPaid + accrued - ent) : 0;
      } else { accrued = Math.max(0, ent - m.gpPaid); recv = t.clawback ? Math.max(0, m.gpPaid - ent) : 0; }
      const dPerf = -(accrued - m.accrued) + (recv - m.recv);
      if (dPerf) ev.push({ t: "PERF", amt: dPerf, note: dPerf < 0 ? "Carried interest tích lũy (chưa trả) tăng" : recv > m.recv ? "Ước tính khoản clawback LP được đòi lại" : "Carried interest tích lũy giảm" });
      m.accrued = accrued; m.recv = recv;
      return ev;
    },
    // expected calls in the next n quarters (fees + scheduled deals), for the liquidity plan
    forecast(h, n) {
      const m = h.m, t = h.terms, out = [];
      let unf = h.unfunded;
      for (let k = 1; k <= n; k++) {
        const age = m.age + k;
        let amt = unf > 0 ? Math.min(unf, E.mul(h.commit, t.mgmt / 4)) : 0;
        for (const d of m.deals) if (!d.live && !d.done && d.entry === age && !m.suspended) amt += d.cost;
        amt = Math.min(amt, unf); unf -= amt; out.push(amt);
      }
      return out;
    }
  };
  function sumRep(m) { return m.deals.reduce((s, d) => s + (d.live ? d.rep : 0), 0); }
  // simple preferred return on each call, by time since the call (years = quarters / 4)
  function prefOf(m, t) { return t.pref > 0 ? m.calls.reduce((s, c) => s + E.mul(c.amt, t.pref * (m.age - c.age) / 4), 0) : 0; }
  const fmt = c => `$${(c / 1e8).toFixed(2)}M`;

  // ---- Co-investment alongside a GP: one deal, low or no fees ----
  MODELS.coinv = {
    init(p) { return { age: 0, tv: p.amount, exitAge: p.exitAge || 12 }; },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, ev = [];
      m.age += 1;
      let v = h.value;
      if (t.fee > 0) { const f = E.mul(v, t.fee / 4); ev.push({ t: "FEE", amt: f, note: "Phí quản lý co-investment" }); v -= f; }
      m.tv = R(Math.max(0, m.tv * (1 + t.beta * (w.eqRet - w.rate / 4) + w.rate / 4 + t.alpha / 4 + t.sigma * nz(ctx, h, "c"))));
      if (m.age >= m.exitAge && w.liq >= 0.4) {
        const gain = Math.max(0, m.tv - h.cost), carry = t.carry > 0 ? E.mul(gain, t.carry) : 0;
        ev.push({ t: "SETTLE", amt: m.tv - carry, perf: carry, note: `Thoái vốn co-investment${carry ? `, carry cho GP ${fmt(carry)}` : ""}` });
        return ev;
      }
      const target = m.age < 4 ? v : R(v + 0.6 * (m.tv - v));
      if (target !== v) ev.push({ t: "MARK", amt: target - v, note: "Định giá lại (ước tính)" });
      return ev;
    }
  };

  // ---- Equity in a company (direct stake, VC, growth or buyout equity) ----
  MODELS.equity = {
    init() { return { age: 0, recapTaken: 0 }; },
    step(h, ctx) {
      const c = ctx.companies[h.terms.company], ev = [];
      h.m.age += 1;
      if (h.terms.opex) ev.push({ t: "COST", amt: h.terms.opex, cat: "expense", note: "Chi phí đội ngũ giám sát doanh nghiệp (đầu tư trực tiếp)" });
      if (!c) return ev;
      let v = h.value;
      if ((c.recapPaid || 0) > h.m.recapTaken) {
        const amt = Math.min(v, R((c.recapPaid - h.m.recapTaken) * h.terms.stake)); h.m.recapTaken = c.recapPaid;
        if (amt > 0) { ev.push({ t: "DIST", amt, note: `Cổ tức đặc biệt từ dividend recap của ${c.name}` }); v -= amt; }
      }
      if (c.status === "exited") { ev.push({ t: "SETTLE", amt: R(c.exit.equity * h.terms.stake), note: `Thoái vốn ${c.name}` }); return ev; }
      if (c.status === "failed" || c.status === "default") { ev.push({ t: "WRITEOFF", note: `${c.name}: cổ phần mất giá trị` }); return ev; }
      const target = R(c.equity * h.terms.stake);
      const next = h.m.age < 3 && c.kind !== "startup" ? v : R(v + 0.6 * (target - v));
      if (next !== v) ev.push({ t: "MARK", amt: next - v, note: `Định giá lại ${c.name} (ước tính)` });
      return ev;
    }
  };

  // ---- Private loan (direct lending, unitranche, mezzanine, venture debt) ----
  const RECOVERY = { senior: 0.65, unitranche: 0.55, mezz: 0.25, venture: 0.35 };
  MODELS.loan = {
    init() { return { age: 0, warrantVal: 0 }; },
    step(h, ctx) {
      const c = ctx.companies[h.terms.company], t = h.terms, ev = [];
      h.m.age += 1;
      const principalLeft = h.cost;
      if (!c) return ev;
      const failed = c.status === "failed" || c.status === "default";
      if (failed) {
        const rec = R(principalLeft * RECOVERY[t.seniority] * (c.kind === "mature" ? clamp((c.evNow || 0) / Math.max(1, c.netDebt), 0.3, 1) : 1));
        ev.push({ t: "SETTLE", amt: rec, note: `${c.name} vỡ nợ: thu hồi ${Math.round(rec / Math.max(1, principalLeft) * 100)}% gốc (${t.seniority})` });
        return ev;
      }
      ev.push({ t: "INCOME", amt: E.mul(principalLeft, t.rate / 4), note: `Lãi vay ${(t.rate * 100).toFixed(1)}%/năm` });
      if (t.warrants) {
        const wv = R((c.equity || 0) * t.warrants), d = wv - h.m.warrantVal;
        if (d) ev.push({ t: "MARK", amt: d, note: "Giá trị chứng quyền (warrants) đi kèm khoản vay" });
        h.m.warrantVal = wv;
      }
      if (c.status === "exited" || h.m.age >= t.term) {
        ev.push({ t: "SETTLE", amt: principalLeft + h.m.warrantVal, note: c.status === "exited" ? `${c.name} thoái vốn: hoàn gốc${t.warrants ? " + warrants" : ""}` : "Khoản vay đáo hạn: hoàn gốc" });
      }
      return ev;
    }
  };

  // ---- Distressed debt bought below face ----
  MODELS.distressed = {
    init() { return { age: 0 }; },
    step(h, ctx) {
      const c = ctx.companies[h.terms.company], ev = [];
      h.m.age += 1;
      if (!c) return ev;
      if (h.terms.legal) ev.push({ t: "COST", amt: h.terms.legal, cat: "expense", note: "Phí pháp lý ủy ban chủ nợ" });
      if (c.status === "resolved") { ev.push({ t: "SETTLE", amt: E.mul(h.terms.face, c.recovery), note: `${c.name}: nhận thu hồi ${(c.recovery * 100).toFixed(1)}% mệnh giá` }); return ev; }
      const target = E.mul(h.terms.face, c.recoveryEst);
      if (target !== h.value) ev.push({ t: "MARK", amt: target - h.value, note: "Giá trị thu hồi ước tính" });
      return ev;
    }
  };

  // ---- Real estate owned directly, optionally with a mortgage ----
  // Game model: value = next year's net income / income yield; the yield moves with rates and spreads.
  MODELS.re = {
    init(p, ctx) { return { noi: p.noi, idx0: ctx.W[p.demand], cpi0: ctx.W.cpi, r0: ctx.W.rate, s0: ctx.W.spread, age: 0 }; },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, ev = [];
      m.age += 1;
      const occ = clamp(w[t.demand] / m.idx0, 0.4, 1.3);
      m.noi = R(t.noi * occ * Math.pow(w.cpi / m.cpi0, t.indexation || 0.6));
      ev.push({ t: "INCOME", amt: R(m.noi / 4), note: `Thu nhập ròng từ cho thuê (NOI) quý` });
      if (h.debt > 0) ev.push({ t: "COST", amt: E.mul(h.debt, t.debtRate / 4), cat: "interest", note: "Lãi vay thế chấp" });
      m.y = clamp(t.y0 + 0.6 * (w.rate - m.r0) + 0.25 * (w.spread - m.s0), 0.025, 0.15);
      const fair = E.reValue({ noi: m.noi, yieldRate: m.y }), target = R(h.value + 0.5 * (fair - h.value));
      if (target !== h.value) ev.push({ t: "MARK", amt: target - h.value, note: "Thẩm định lại giá trị tài sản (ước tính)" });
      const after = target;
      if (h.debt > 0 && h.debt / after > (t.ltvCap || 0.75)) {
        const pay = h.debt - R(after * 0.65);
        ev.push({ t: "REPAY", amt: pay, forced: true, note: `LTV vượt ${Math.round((t.ltvCap || 0.75) * 100)}%: ngân hàng yêu cầu trả bớt nợ ${fmt(pay)}` });
      }
      return ev;
    }
  };
  MODELS.reit = {
    init(p, ctx) { return { o0: ctx.W.office, r0: ctx.W.resi }; },
    step(h, ctx) {
      const w = ctx.W, w0 = ctx.W0, ev = [];
      const r = 0.6 * w.eqRet + 0.5 * (w.office / w0.office - 1) + 0.3 * (w.resi / w0.resi - 1) - 2 * (w.rate - w0.rate) + 0.035 * nz(ctx, h, "r");
      ev.push({ t: "INCOME", amt: E.mul(h.value, 0.011), note: "Cổ tức REIT" });
      ev.push({ t: "MARK", amt: R(h.value * clamp(r, -0.5, 0.5)), note: "Giá thị trường cổ phiếu REIT" });
      return ev;
    }
  };

  // ---- Infrastructure: greenfield (build, operate, transfer), brownfield, social (availability) ----
  MODELS.infra = {
    init(p, ctx) { return { age: 0, built: p.buildQ === 0, overrun: 0, tr0: ctx.W.traffic, cpi0: ctx.W.cpi, opYears: 0, rev: 0 }; },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, ev = [];
      m.age += 1;
      if (!m.built) {
        let unf = h.unfunded;
        if (dz(ctx, h, "ovr") < (t.overrunP || 0.1) && m.overrun < 2) { m.overrun += 1; const extra = E.mul(h.commit, 0.12); unf += extra; ev.push({ t: "COMMIT", amt: extra, note: `${h.name}: vượt chi phí xây dựng, vốn cam kết tăng 12% (${fmt(extra)})` }); }
        const left = t.buildQ - m.age + 1, amt = left > 0 ? Math.min(unf, R(unf / left)) : unf;
        if (amt > 0) ev.push({ t: "CALL", inv: amt, fee: 0, note: `Giải ngân xây dựng ${fmt(amt)}` });
        if (m.age >= t.buildQ) { m.built = true; ev.push({ t: "NOTE", note: `${h.name} hoàn thành xây dựng và bắt đầu khai thác` }); }
        return ev;
      }
      m.opYears += 0.25;
      const demand = t.availability ? 1 : clamp(w.traffic / m.tr0 * (t.realized || 1), 0.3, 2);
      const rampAt = y => t.ramp ? Math.min(1, y / t.ramp) : 1;
      const full = t.rev0 * demand * Math.pow(w.cpi / m.cpi0, t.indexed ? 1 : 0.5);   // run-rate once ramped up
      m.rev = R(full * rampAt(m.opYears));
      const cf = R(m.rev * (1 - t.opex) / 4);
      ev.push({ t: "INCOME", amt: cf, note: t.availability ? "Thanh toán theo mức sẵn sàng (availability payment)" : "Thu phí sử dụng sau chi phí vận hành" });
      // model value: PV of the rest of the concession (ramp-up included), no terminal value
      const left = Math.max(0, t.years - m.opYears), d = w.rate + t.premium, g = t.growth;
      let pv = 0; for (let k = 1; k <= Math.ceil(left); k++) pv += full * rampAt(m.opYears + k - 0.5) * (1 - t.opex) * Math.pow(1 + g, k - 1) * Math.min(1, left - k + 1) / Math.pow(1 + d, k);
      const target = R(h.value + 0.5 * (R(pv) - h.value));
      if (target !== h.value) ev.push({ t: "MARK", amt: target - h.value, note: "Giá trị hiện tại dòng tiền còn lại của hợp đồng nhượng quyền (ước tính)" });
      return ev;
    },
    forecast(h, n) {
      const out = []; let unf = h.unfunded;
      for (let k = 1; k <= n; k++) { const left = h.terms.buildQ - (h.m.age + k) + 1; const a = h.m.built || left <= 0 ? 0 : Math.min(unf, R(unf / left)); unf -= a; out.push(a); }
      return out;
    }
  };

  // ---- Farmland: harvest income (owner-operator) or fixed rent (owner, leased out) ----
  MODELS.farm = {
    init(p, ctx) { return { land0: ctx.W.land, ags0: ctx.W.ags, landVal: p.price, last: null }; },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, ev = [];
      const cropPx = t.cropPrice * w.ags / m.ags0;
      if (t.model === "lease") ev.push({ t: "INCOME", amt: R(t.rent / 4), note: "Tiền thuê đất cố định (mô hình cho thuê)" });
      else if (W.isHarvest(ctx.q)) {
        const tons = t.acres * t.yieldPerAcre * w.weather;
        const hedgeT = Math.min(t.hedgeTons || 0, t.acres * t.yieldPerAcre);
        const rev = R(tons * cropPx), hedge = R(hedgeT * ((t.hedgePrice || cropPx) - cropPx)), cost = R(t.acres * t.costPerAcre);
        m.last = { q: ctx.q, tons, cropPx, rev, hedge, cost, weather: w.weather };
        ev.push({ t: "INCOME", amt: rev + hedge - cost, note: `Thu hoạch: ${Math.round(tons).toLocaleString("en-US")} tấn × $${(cropPx / 100).toFixed(0)}${hedge ? `; lãi/lỗ phòng hộ ${fmt(hedge)}` : ""}; chi phí ${fmt(cost)}` });
      }
      const target = R(t.price * w.land / m.land0 * (t.model === "lease" ? 1 : 0.85 + 0.15 * w.ags / m.ags0));
      const next = R(h.value + 0.5 * (target - h.value));
      if (next !== h.value) ev.push({ t: "MARK", amt: next - h.value, note: "Thẩm định giá đất (ước tính)" });
      return ev;
    }
  };

  // ---- Timberland: biological growth, flexible harvest, timber price, land value ----
  MODELS.timber = {
    init(p, ctx) { return { vol: p.volume, tb0: ctx.W.timber, land0: ctx.W.land, parts: null }; },
    step(h, ctx) {
      const m = h.m, t = h.terms, w = ctx.W, w0 = ctx.W0, ev = [];
      const px0 = t.stumpage * w0.timber / m.tb0, px = t.stumpage * w.timber / m.tb0;
      const grown = m.vol * t.growth / 4;
      m.vol += grown;
      let harvested = 0;
      if (W.isYearEnd(ctx.q) && t.harvest > 0) {
        harvested = m.vol * t.harvest; m.vol -= harvested;
        ev.push({ t: "INCOME", amt: R(harvested * (px - t.cutCost)), note: `Khai thác ${Math.round(harvested).toLocaleString("en-US")} m³ × ($${(px / 100).toFixed(0)} − chi phí $${(t.cutCost / 100).toFixed(0)})` });
      }
      const net = x => Math.max(0, x - t.cutCost) * 0.9;            // standing timber: log price less harvest cost, discounted for time
      const land = R(t.landValue * w.land / m.land0), trees = R(m.vol * net(px));
      const target = land + trees;
      m.parts = { growth: R(grown * net(px)), price: R((m.vol + harvested - grown) * (net(px) - net(px0))), landChg: m.prevLand == null ? 0 : land - m.prevLand, land, trees, vol: m.vol, px, harvested };
      if (target !== h.value) ev.push({ t: "MARK", amt: target - h.value, note: "Giá trị rừng = đất + gỗ đứng (ước tính)" });
      m.prevLand = land;
      return ev;
    }
  };

  // ---- Commodity futures, fully collateralised, rolled every quarter (game model decomposition) ----
  MODELS.futures = {
    init() { return { parts: null }; },
    step(h, ctx) {
      const w = ctx.W, w0 = ctx.W0, t = h.terms, parts = { spot: 0, roll: 0, collateral: 0 };
      for (const [k, slope] of [["energy", "kE"], ["metals", "kM"], ["ags", "kA"]]) {
        const wt = t.weights[k] || 0; if (!wt) continue;
        const r = E.futuresQuarter({ S0: w0[k], S1: w[k], k: w0[slope], r: w0.rate });
        parts.spot += wt * r.spot; parts.roll += wt * r.roll; parts.collateral += wt * r.collateral;
      }
      h.m.parts = parts;
      const tot = parts.spot + parts.roll + parts.collateral;
      return [{ t: "MARK", amt: R(h.value * tot), note: `Futures: giá giao ngay ${(parts.spot * 100).toFixed(2)}%, roll ${(parts.roll * 100).toFixed(2)}%, lãi tài sản ký quỹ ${(parts.collateral * 100).toFixed(2)}%` }];
    }
  };
  MODELS.gold = {
    init(p, ctx) { return { m0: ctx.W.metals }; },
    step(h, ctx) {
      const w = ctx.W, w0 = ctx.W0;
      return [{ t: "COST", amt: E.mul(h.value, 0.004 / 4), cat: "expense", note: "Phí lưu kho và bảo hiểm vàng (không có dòng tiền thu vào)" },
        { t: "MARK", amt: R(h.value * (w0.gold && w.gold ? w.gold / w0.gold - 1 : clamp(0.6 * (w.metals / w0.metals - 1) - 0.25 * w.eqRet + 0.03 * nz(ctx, h, "au"), -0.4, 0.5))), note: "Giá vàng" }];
    }
  };

  // ---- Hedge funds: an in-house multi-strategy sleeve, and a fund of hedge funds ----
  const STRATS = {
    eh: { name: "Equity hedge", long: 1.3, short: 0.8 },
    ed: { name: "Event-driven", long: 1.0, short: 0.3 },
    rv: { name: "Relative value", long: 2.0, short: 1.8 },
    opp: { name: "Opportunistic (macro/CTA)", long: 0.8, short: 0.6 }
  };
  function stratReturns(w, w0, z) {
    const dS = w.spread - w0.spread, dV = w.vol - w0.vol;
    return {
      eh: 1.3 * (w.eqRet + 0.008) - 0.8 * (w.eqRet - 0.006) - 0.002 + 0.025 * z("eh"),
      ed: 0.014 + 0.2 * w.eqRet - 2.5 * dS + (w.regime === "rec" ? -0.03 : 0) + 0.02 * z("ed"),
      rv: 0.011 - 3.5 * dS - 0.15 * dV - (w.liq < 0.4 ? 0.04 : 0) + 0.015 * z("rv"),
      opp: 0.008 + 0.35 * Math.abs(w.eqRet) - 0.1 * w.eqRet + 0.04 * z("op")
    };
  }
  MODELS.hf = {
    init() { return { last: null, hwm: null }; },
    step(h, ctx) {
      const t = h.terms, w = ctx.W, ev = [];
      const rs = stratReturns(w, ctx.W0, k => nz(ctx, h, k));
      let r = 0; for (const k of Object.keys(STRATS)) r += (t.w[k] || 0) * rs[k];
      const lev = t.lev || 1;
      let rr = r * lev - (lev - 1) * (w.rate + 0.01) / 4;
      let note = `Hedge fund nội bộ: ${(rr * 100).toFixed(2)}% (đòn bẩy ${lev.toFixed(1)}×)`;
      if (rr < -0.15 && lev > 1.5) { rr -= 0.02; t.lev = 1; note += " — gọi ký quỹ: buộc giảm đòn bẩy về 1×, chịu thêm chi phí thanh lý 2%"; }
      h.m.last = { rs, r: rr, lev };
      ev.push({ t: "MARK", amt: R(h.value * clamp(rr, -0.9, 1)), note });
      return ev;
    }
  };
  MODELS.fof = {
    init(p) { return { hwm: p.amount, hwmIn: p.amount, inner: p.amount, last: null }; },
    step(h, ctx) {
      const t = h.terms, w = ctx.W, m = h.m, ev = [];
      const g = 0.012 + 0.3 * w.eqRet - 1.5 * (w.spread - ctx.W0.spread) + 0.012 * nz(ctx, h, "f");
      // underlying funds' fees (2 and 20 with high-water mark, quarterly), then the fund of funds' own
      const P0 = h.value, P1 = P0 + R(P0 * g);
      const inner = E.hfFees({ P0, P1, mgmtRate: t.hfMgmt / 4, mgmtBasis: "end", perfRate: t.hfPerf, hwm: Math.max(m.hwmIn, 1) });
      m.hwmIn = inner.hwmNext;
      const outer = E.hfFees({ P0, P1: inner.end, mgmtRate: t.mgmt / 4, mgmtBasis: "end", perfRate: t.perf, hwm: Math.max(m.hwm, 1) });
      m.hwm = outer.hwmNext;
      m.last = { gross: g, innerFees: inner.fees, outerFees: outer.fees, net: (outer.end - P0) / P0 };
      ev.push({ t: "MARK", amt: P1 - P0, note: "Lợi nhuận gộp của các quỹ thành phần" });
      if (inner.mgmt + outer.mgmt) ev.push({ t: "FEE", amt: inner.mgmt + outer.mgmt, note: "Phí quản lý hai tầng (quỹ thành phần + fund of funds)" });
      if (inner.perf + outer.perf) ev.push({ t: "PERF", amt: -(inner.perf + outer.perf), note: "Phí hiệu suất hai tầng" });
      return ev;
    }
  };

  // ---- Digital assets: direct tokens (custody risk, staking), funds/ETPs, listed blockchain companies ----
  const HACK = { exchange: 0.03, self: 0.015, custodian: 0.003 };
  MODELS.token = {
    init() { return {}; },
    step(h, ctx) {
      const t = h.terms, w = ctx.W, ev = [];
      ev.push({ t: "MARK", amt: R(h.value * (w.token / ctx.W0.token - 1)), note: "Giá token" });
      if (t.staking) ev.push({ t: "MARK", amt: E.mul(h.value, 0.009), note: "Phần thưởng staking (Proof of Stake), nhận bằng token", cat: "income" });
      if (dz(ctx, h, "hack") < HACK[t.custody] * (ctx.hackMul || 1)) {
        const loss = t.custody === "custodian" ? 0.2 : 1;
        ev.push({ t: "LOSS", frac: loss, note: t.custody === "exchange" ? "Sàn giao dịch bị tấn công: mất toàn bộ token gửi trên sàn" : t.custody === "self" ? "Mất khóa riêng của ví tự lưu ký: không truy cập được token" : "Sự cố tại đơn vị lưu ký: bảo hiểm bù một phần, mất 20%" });
      }
      return ev;
    }
  };
  MODELS.dfund = {
    init() { return {}; },
    step(h, ctx) {
      return [{ t: "MARK", amt: R(h.value * (ctx.W.token / ctx.W0.token - 1 + 0.004 * nz(ctx, h, "te"))), note: "Giá chứng chỉ quỹ theo giá token (có sai lệch theo dõi)" },
        { t: "FEE", amt: E.mul(h.value, 0.015 / 4), note: "Phí quản lý quỹ tài sản số 1,5%/năm" }];
    }
  };
  MODELS.dlteq = {
    init() { return {}; },
    step(h, ctx) {
      const w = ctx.W, r = 0.45 * (w.token / ctx.W0.token - 1) + 0.9 * w.eqRet + 0.05 * nz(ctx, h, "eq");
      return [{ t: "MARK", amt: R(h.value * clamp(r, -0.8, 1.5)), note: "Giá cổ phiếu công ty hạ tầng blockchain" }];
    }
  };

  // Generic quarter for a holding
  function step(h, ctx) { return MODELS[h.type].step(h, ctx); }
  function forecast(h, n) { const f = MODELS[h.type].forecast; return f && h.status === "active" ? f(h, n) : new Array(n).fill(0); }

  // Secondary market price for an illiquid holding (game model): discount widens when markets are
  // illiquid, for young private equity commitments and for large unfunded obligations taken over.
  function secondaryDiscount(h, w) {
    const base = { pefund: 0.1, coinv: 0.12, equity: 0.15, loan: 0.05, distressed: 0.08, re: 0.06, infra: 0.07, farm: 0.06, timber: 0.07 }[h.type];
    if (base == null) return 0;
    let d = base + 0.35 * (1 - w.liq);
    if (h.type === "pefund" && h.m.age < 8) d += 0.08;
    if (h.unfunded > 0 && h.value > 0) d += 0.05 * Math.min(1, h.unfunded / h.value);
    return Math.round(clamp(d, 0.02, 0.6) * 1e4) / 1e4;
  }

  return { CLASSES, TYPES, MODELS, STRATS, SELL_COST, RECOVERY, HACK, newCompany, stepCompany, exitCompany, valueCompany: value, step, forecast, secondaryDiscount, stratReturns };
});

// ============================================================
// alt/game.js — Alternative Empire: the rules of the game
// New game, the quarterly loop (events → economy → companies → assets → ledger → board),
// deals and term-sheet negotiation, missions and quizzes, decisions with immediate and
// delayed consequences, mandate limits, career, achievements, win/lose and saved games.
// The state is plain JSON (seed, quarter, economy, ledger, pending effects), so a saved
// game reloads exactly where it stopped.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./engine.js"), require("./world.js"), require("./assets.js"), require("./fund.js"), require("./content.js"));
  else root.AltGame = factory(root.AltEngine, root.AltWorld, root.AltAssets, root.AltFund, root.AltContent);
})(typeof self !== "undefined" ? self : this, function (E, W, A, F, C) {
  "use strict";
  const SCHEMA = "alt-save/1", VERSION = 1, INITIAL = E.M(100);
  const REPEATABLE = new Set(["d4-reit", "d5-futures", "d5-gold", "d6-hf", "d6-fof", "d7-token", "d7-dfund", "d7-dlteq"]);
  const MARKET = new Set(["d4-reit", "d5-futures", "d5-gold", "d6-fof", "d7-dfund", "d7-dlteq"]);   // stay open in later chapters
  const R = Math.round, clamp = E.clamp;
  const toM = c => E.toM(c), fmtM = c => `$${toM(c).toFixed(2)}M`;

  // ======================= New game =======================
  function newGame(o) {
    const seed = (o && o.seed ? o.seed : 1) >>> 0 || 1, difficulty = o && o.difficulty;
    const world = W.create({ seed, difficulty });
    const G = { schema: SCHEMA, v: VERSION, seed, difficulty: world.difficulty, name: (o && o.name) || "Portfolio Manager", createdAt: (o && o.now) || 0,
      q: 0, world, fund: F.create({ initial: INITIAL, q: 0 }), companies: {},
      chapter: 1, chapterStart: { 1: 0 }, chapterDone: {}, reviews: [],
      missions: {}, deals: {}, nego: {}, decisions: [], pending: [], persist: [], inbox: [], events: [], fired: {},
      rep: 50, trust: 60, probation: 0, emergencies: 0,
      know: { 1: { n: 0, r: 0 }, 2: { n: 0, r: 0 }, 3: { n: 0, r: 0 }, 4: { n: 0, r: 0 }, 5: { n: 0, r: 0 }, 6: { n: 0, r: 0 }, 7: { n: 0, r: 0 } },
      quizHist: [], wrong: [], flags: {}, ach: {}, career: 1, careerHist: [{ q: 0, lv: 1 }], board: null, boardHist: [], reports: [],
      status: "active", ending: null, finalScore: null, lost: null, tampered: false };
    mail(G, "eleanor", "Chào mừng tới Aurelion Capital", "Bạn được giao 100 triệu USD vốn mô phỏng. Mở Nhiệm vụ của chương 1, đọc kỹ các đề xuất và nhớ: Hội đồng chấm cả rủi ro, thanh khoản và hiểu biết — không chỉ NAV.");
    G.board = scorecard(G);
    return G;
  }
  function mail(G, from, title, text, kind) { G.inbox.unshift({ q: G.q, from, title, text, kind: kind || "info", read: false }); if (G.inbox.length > 80) G.inbox.pop(); }
  const draw = (G, k) => W.uni(G.seed, "game", k);

  // ======================= Knowledge =======================
  function learn(G, lm, n, r) { if (!lm || !G.know[lm]) return; G.know[lm].n += n; G.know[lm].r += r; }
  function mastery(G, lm) { const k = G.know[lm]; return k && k.n ? k.r / k.n : 0; }
  function avgMastery(G, lms) { const xs = (lms || [1, 2, 3, 4, 5, 6, 7]).map(l => mastery(G, l)); return xs.reduce((s, x) => s + x, 0) / xs.length; }
  function weaknesses(G) { return Object.keys(G.know).map(Number).filter(l => G.know[l].n >= 3).map(l => ({ lm: l, m: mastery(G, l), n: G.know[l].n })).sort((a, b) => a.m - b.m); }

  // ======================= Deals =======================
  function dealState(G, id) {
    const d = C.DEALS[id];
    if (!d) return { ok: false, reason: "Không tồn tại" };
    const taken = !!G.deals[id];
    if (G.status === "lost") return { ok: false, reason: "Ván chơi đã kết thúc", taken };
    if (d.ch > G.chapter) return { ok: false, reason: `Mở ở chương ${d.ch}`, taken, locked: true };
    if (d.ch < G.chapter && !MARKET.has(id)) return { ok: false, reason: "Cơ hội đã đóng (chỉ mở trong chương của nó)", taken, closed: true };
    if (taken && !REPEATABLE.has(id)) return { ok: false, reason: "Đã thực hiện", taken };
    if (d.co && G.companies[d.co] && G.companies[d.co].age > 0) return { ok: false, reason: "Vòng vốn đã đóng: doanh nghiệp đã bước sang giai đoạn tiếp theo", taken, closed: true };
    const need = d.need ? d.need(G) : null;
    if (need) return { ok: false, reason: need, taken };
    return { ok: true, taken };
  }
  function readForm(d, raw) {
    const v = {}, errs = [];
    for (const f of d.form) {
      const x = raw && raw[f.id] != null ? raw[f.id] : f.def;
      if (f.options) { if (!f.options.some(o => o.v === String(x))) errs.push(`${f.label}: lựa chọn không hợp lệ`); v[f.id] = String(x); }
      else {
        const n = +x;
        if (!isFinite(n)) errs.push(`${f.label}: không phải số`);
        else if (n < f.min || n > f.max) errs.push(`${f.label}: phải trong khoảng ${f.min}–${f.max}`);
        else if (Math.abs(Math.round((n - f.min) / f.step) * f.step - (n - f.min)) > 1e-9) errs.push(`${f.label}: bước ${f.step}`);
        v[f.id] = n;
      }
    }
    return { v, errs };
  }
  // what an investment would do, without doing it
  function preview(G, id, raw) {
    const d = C.DEALS[id], st = dealState(G, id), out = { ok: false, errors: [], warnings: [], cash: 0, commit: 0 };
    if (!st.ok) { out.errors.push(st.reason); return out; }
    const { v, errs } = readForm(d, raw); out.errors.push(...errs); out.v = v;
    if (errs.length) return out;
    if (d.check) { const c = d.check(v); if (c) out.errors.push(c); }
    if (d.negotiate) {
      const n = G.nego[id];
      if (!n || !n.accepted) out.errors.push("Cần đàm phán và thống nhất term sheet trước khi ký");
      else { v.terms = n.terms; if (v.commit > n.maxCommit) out.errors.push(`GP chỉ phân bổ tối đa $${n.maxCommit}M cho Aurelion`); }
    }
    if (id === "d3-bw-lbo" && G.companies.bw) v.lev = G.companies.bw.lev;
    let spec;
    try { spec = d.build(v, G, k => draw(G, id + k)); } catch (e) { out.errors.push(e.message); return out; }
    out.spec = spec;
    out.cash = (spec.buy || 0) + (spec.txCost || 0) - (spec.borrow || 0);
    out.commit = spec.commit || 0;
    if (out.cash > G.fund.cash) out.errors.push(`Không đủ tiền mặt: cần ${fmtM(out.cash)}, có ${fmtM(G.fund.cash)}`);
    // mandate and liquidity warnings (allowed, but the Chief Risk Officer records them)
    const nav = F.nav(G.fund), size = (spec.buy || 0) - (spec.borrow || 0) + (spec.commit || 0);
    if (nav > 0 && size / nav > C.MANDATE.single) out.warnings.push(`Quy mô ${fmtM(size)} vượt ${C.MANDATE.single * 100}% NAV cho một khoản (giới hạn mandate)`);
    if (C.DEALS[id].cls === "digital") { const cur = F.exposure(G.fund).by.digital; if ((cur + (spec.buy || 0)) / nav > C.MANDATE.digital) out.warnings.push("Tài sản số sẽ vượt 5% NAV — vi phạm mandate của khách hàng"); }
    if (spec.commit) {
      const liq = F.liquidity(G.fund), needNext = liq.need + R(spec.commit * 0.4);
      if (liq.avail < needNext) out.warnings.push(`Độ phủ thanh khoản có thể < 1: nghĩa vụ góp vốn 4 quý tới ước ${fmtM(needNext)}, nguồn sẵn có ${fmtM(liq.avail)}`);
    }
    if (d.scenarios) { const p = d.project(v), rate = G.world.rate + 0.045; out.scenarios = E.scenarioTable(p, d.scen, rate); out.rate = rate; }
    out.ok = out.errors.length === 0;
    return out;
  }
  function invest(G, id, raw) {
    const p = preview(G, id, raw);
    if (!p.ok) return { ok: false, msg: p.errors.join("; ") };
    const d = C.DEALS[id], v = p.v, spec = p.spec;
    if (d.co && !G.companies[d.co]) G.companies[d.co] = A.newCompany(d.company(v), G.world);
    const ctx = { seed: G.seed, W: G.world, q: G.q };
    let h = null;
    const prev = G.deals[id] && REPEATABLE.has(id) ? G.fund.holdings.find(x => x.deal === id && x.status === "active" && sameTerms(x, spec)) : null;
    if (prev) {
      F.post(G.fund, G.q, "BUY", prev.id, { cash: -spec.buy, value: spec.buy, cost: spec.buy, paidIn: spec.buy, cf: -spec.buy, n: `Mua thêm ${prev.name}` });
      if (spec.txCost) F.post(G.fund, G.q, "TXCOST", prev.id, { cash: -spec.txCost, cf: -spec.txCost, cat: { expense: -spec.txCost }, n: "Chi phí giao dịch" });
      if (prev.type === "fof") { prev.m.hwm += spec.buy; prev.m.hwmIn += spec.buy; }
      h = prev;
    } else {
      h = F.open(G.fund, G.q, Object.assign({ deal: id }, spec), ctx);
    }
    if (spec.support && G.companies.nova) G.companies.nova.support = true;
    (spec.flags || []).forEach(f => { G.flags[f] = true; });
    const rec = G.deals[id] || { q: G.q, hids: [], v: [] };
    if (!rec.hids.includes(h.id)) rec.hids.push(h.id);
    rec.v.push(Object.assign({ q: G.q }, v, { terms: undefined }));
    G.deals[id] = rec;
    mail(G, "marcus", `Đã ký: ${d.name}`, `${spec.commit ? `Cam kết ${fmtM(spec.commit)} (chưa giải ngân).` : `Giải ngân ${fmtM(spec.buy)}${spec.borrow ? `, trong đó vay ${fmtM(spec.borrow)}` : ""}.`} ${p.warnings.length ? "Lưu ý của Sophia: " + p.warnings.join(" ") : ""}`, "deal");
    if (p.warnings.length) G.rep = clamp(G.rep - 1, 0, 100);
    award(G, "first-deal");
    if (d.negotiate && G.nego[id] && G.nego[id].cost > 0) award(G, "negotiator");
    if (G.fund.holdings.filter(x => x.type === "pefund").map(x => W.year(x.startQ)).filter((y, i, a) => a.indexOf(y) === i).length >= 2) award(G, "vintage");
    if (id === "d7-token" && spec.terms.custody === "custodian" || id === "d7-dfund" || id === "d7-dlteq") award(G, "custody");
    checkAch(G);
    return { ok: true, holding: h, warnings: p.warnings };
  }
  function sameTerms(h, spec) { return JSON.stringify(h.terms) === JSON.stringify(spec.terms); }

  // ======================= Negotiation =======================
  function negoInfo(G, id, commit) {
    const n = G.nego[id] || { round: 0, strikes: 0 };
    const size = commit >= 30 ? 2 : commit >= 20 ? 1 : 0;
    const budget = 3 + size + (G.rep >= 60 ? 1 : 0) - n.strikes;
    return { budget, size, rep: G.rep >= 60 ? 1 : 0, strikes: n.strikes, round: n.round, maxCommit: n.maxCommit || C.DEALS[id].form[0].max };
  }
  function termsOf(asks) {
    const t = {}; let cost = 0;
    for (const cl of C.CLAUSES) { const i = asks && asks[cl.id] != null ? +asks[cl.id] : 0, o = cl.options[i] || cl.options[0]; t[cl.id] = o.v; cost += o.c; }
    return { terms: t, cost };
  }
  // GP accepts asks that fit the negotiating budget; a near miss gets a counter-offer;
  // pushing too hard costs reputation, budget next round and allocation.
  function negotiate(G, id, asks, commit) {
    const d = C.DEALS[id]; if (!d || !d.negotiate) return { status: "error", msg: "Thương vụ không cần đàm phán" };
    const st = dealState(G, id); if (!st.ok) return { status: "error", msg: st.reason };
    const info = negoInfo(G, id, commit), { terms, cost } = termsOf(asks);
    const n = G.nego[id] = G.nego[id] || { round: 0, strikes: 0 };
    n.round += 1;
    if (cost <= info.budget) {
      Object.assign(n, { accepted: true, terms, cost, budget: info.budget, asks: Object.assign({}, asks), maxCommit: n.maxCommit || d.form[0].max });
      return { status: "accepted", terms, cost, budget: info.budget, msg: cost > 0 ? "GP chấp nhận các điều khoản bạn đề xuất." : "Ký theo điều khoản chuẩn của GP." };
    }
    if (cost <= info.budget + 2) {
      // drop the costliest ask
      let worst = null, wc = 0;
      for (const cl of C.CLAUSES) { const i = +(asks[cl.id] || 0), c = cl.options[i].c; if (c > wc) { wc = c; worst = cl.id; } }
      const counter = Object.assign({}, asks, { [worst]: 0 });
      n.accepted = false;
      return { status: "counter", counter, cost, budget: info.budget, msg: `GP phản đề xuất: giữ điều khoản chuẩn cho “${C.CLAUSES.find(c => c.id === worst).label}”, chấp nhận phần còn lại.` };
    }
    n.strikes += 1; n.accepted = false;
    G.rep = clamp(G.rep - 2, 0, 100);
    if (n.strikes >= 2) n.maxCommit = Math.max(d.form[0].min, Math.floor(d.form[0].max * 0.7 / d.form[0].step) * d.form[0].step);
    return { status: "rejected", cost, budget: info.budget, msg: `GP từ chối: yêu cầu vượt xa đòn bẩy đàm phán của bạn (${cost} điểm so với ${info.budget}).${n.strikes >= 2 ? " GP giảm phân bổ tối đa cho Aurelion." : " Lần sau bạn có ít đòn bẩy hơn."}` };
  }

  // ======================= Holding actions =======================
  function holding(G, hid) { return G.fund.holdings.find(h => h.id === hid); }
  function sellHolding(G, hid, frac) {
    const h = holding(G, hid); if (!h) return { ok: false, msg: "Không tìm thấy" };
    try {
      const r = F.sell(G.fund, G.q, h, frac, G.world);
      mail(G, "sophia", `Đã bán ${Math.round(frac * 100)}% ${h.name}`, `Thu về ${fmtM(r.price)}; chiết khấu/chi phí ${(r.discount * 100).toFixed(1)}% (${fmtM(-r.loss)}).`, "deal");
      if (A.TYPES[h.type].liq === "illiquid") G.rep = clamp(G.rep - 1, 0, 100);
      return Object.assign({ ok: true }, r);
    } catch (e) { return { ok: false, msg: e.message }; }
  }
  function setPolicy(G, hid, key, val) {
    const h = holding(G, hid); if (!h || h.status !== "active") return { ok: false, msg: "Không tìm thấy" };
    if (h.type === "timber" && key === "harvest") { E.need([0, 0.04, 0.08, 0.12].includes(+val), "Tỷ lệ không hợp lệ"); h.terms.harvest = +val; return { ok: true }; }
    if (h.type === "farm" && key === "hedge") {
      E.need(h.terms.model === "operate", "Chỉ trang trại tự vận hành mới phòng hộ sản lượng");
      E.need([0, 0.4, 0.8].includes(+val), "Tỷ lệ không hợp lệ");
      const px = h.terms.cropPrice * G.world.ags / h.m.ags0;
      h.terms.hedgeTons = h.terms.acres * h.terms.yieldPerAcre * +val; h.terms.hedgePrice = px; h.terms.hedgeQ = G.q;
      return { ok: true, msg: `Đã khóa giá $${(px / 100).toFixed(0)}/tấn cho ${Math.round(+val * 100)}% sản lượng kỳ vọng` };
    }
    if (h.type === "hf" && key === "lev") { E.need([1, 1.5, 2, 3].includes(+val), "Đòn bẩy 1–3×"); h.terms.lev = +val; return { ok: true }; }
    return { ok: false, msg: "Không áp dụng" };
  }
  function companyOfHolding(G, h) { return h && h.terms && h.terms.company ? G.companies[h.terms.company] : null; }
  function exitOptions(G, hid) {
    const h = holding(G, hid), c = companyOfHolding(G, h);
    if (!h || h.type !== "equity" || !c || c.status !== "active") return [];
    if (c.kind === "startup") return c.exitReady ? ["ipo", "trade"] : [];
    if (c.kind === "mature") return c.age >= (c.id === "solace" ? 6 : 5) ? ["ipo", "trade", "sbo", "recap"] : [];
    return [];
  }
  function exitHolding(G, hid, route) {
    const h = holding(G, hid), c = companyOfHolding(G, h);
    if (!exitOptions(G, hid).includes(route)) return { ok: false, msg: "Chưa thể thoái vốn theo cách này" };
    const out = [], r = A.exitCompany(c, G.world, route, out);
    if (!r.ok) return r;
    out.forEach(o => mail(G, "adrian", c.name, o.text + " Tiền về quỹ vào cuối quý.", "deal"));
    return { ok: true, msg: out.map(o => o.text).join(" ") };
  }
  function credit(G, op, amt) {
    const f = G.fund;
    if (op === "draw") { if (!(amt > 0) || f.debt + amt > f.credit.limit) return { ok: false, msg: "Vượt hạn mức" }; F.draw(f, G.q, amt, "Rút hạn mức tín dụng chủ động"); return { ok: true }; }
    if (op === "repay") { const a = F.repayFund(f, G.q, amt); return a > 0 ? { ok: true, msg: `Đã trả ${fmtM(a)}` } : { ok: false, msg: "Không có gì để trả hoặc thiếu tiền mặt" }; }
    return { ok: false };
  }

  // ======================= Effects =======================
  function applyFx(G, fx, note) {
    if (!fx) return;
    if (fx.rep) G.rep = clamp(G.rep + fx.rep, 0, 100);
    if (fx.trust) G.trust = clamp(G.trust + fx.trust, 0, 100);
    if (fx.cash) { const a = E.M(Math.abs(fx.cash)); if (fx.cash < 0) F.expense(G.fund, G.q, a, note || "Chi phí quyết định"); else F.post(G.fund, G.q, "OTHER", null, { cash: a, cat: { income: a }, n: note || "Thu nhập khác" }); }
    if (fx.expense) F.expense(G.fund, G.q, E.M(fx.expense), note || "Chi phí");
    if (fx.flow) F.flow(G.fund, G.q, E.M(fx.flow), note || "Dòng vốn khách hàng");
    if (fx.credit != null) F.setCredit(G.fund, E.M(fx.credit), G.world.rate + 0.02);
    if (fx.flag) G.flags[fx.flag] = true;
    if (fx.ach) award(G, fx.ach);
    if (fx.delayed) G.pending.push({ due: G.q + fx.delayed.in, fx: fx.delayed.fx, note: fx.delayed.note });
  }
  function award(G, id) { if (!G.ach[id] && C.ACHIEVEMENTS[id]) { G.ach[id] = G.q; mail(G, "eleanor", `Thành tựu: ${C.ACHIEVEMENTS[id][0]}`, C.ACHIEVEMENTS[id][1], "ach"); } }
  function checkAch(G) {
    const act = G.fund.holdings.filter(h => h.status === "active");
    if (new Set(act.map(h => h.cls)).size >= 5) award(G, "diversifier");
    if (G.trust >= 80) award(G, "board-favorite");
    if ([1, 2, 3, 4, 5, 6, 7].every(l => G.know[l].n >= 4 && mastery(G, l) >= 0.85)) award(G, "scholar");
    for (const h of G.fund.holdings) {
      if (h.type === "distressed" && h.status === "exited" && h.dist > h.paidIn) award(G, "vulture");
      if (h.type === "equity" && h.status === "exited" && h.paidIn > 0 && h.dist / h.paidIn >= 2) award(G, "exit-master");
    }
    if (G.career >= 7) award(G, "empire");
  }

  // ======================= Decisions =======================
  const DECISIONS = {
    keyperson: G => {
      const h = G.fund.holdings.find(x => x.type === "pefund" && x.status === "active");
      const clause = h && h.terms.keyPerson;
      return { from: "adrian", title: "Key person event tại Northgate", text: clause ? "Hợp đồng có điều khoản key person: LP có thể bỏ phiếu tạm dừng giai đoạn đầu tư cho tới khi GP bổ nhiệm người thay thế." : "Hợp đồng không có điều khoản key person: LP không có quyền tạm dừng.",
        options: clause ? [{ id: "suspend", label: "Bỏ phiếu tạm dừng đầu tư (2 quý)", desc: "Không gọi vốn cho thương vụ mới trong thời gian tạm dừng; GP buộc tìm người thay thế có năng lực." }, { id: "continue", label: "Để GP tiếp tục", desc: "Không gián đoạn nhưng chất lượng chọn thương vụ có thể giảm." }] : [{ id: "continue", label: "Ghi nhận", desc: "Chất lượng chọn thương vụ có thể giảm." }], def: "continue", ref: h && h.id };
    },
    redeem: G => {
      const amt = Math.max(E.M(5), R(F.nav(G.fund) * 0.08 / 1e6) * 1e6);
      return { from: "victor", title: "Harborview yêu cầu rút vốn", text: `Giữa khủng hoảng, hội đồng quỹ hưu trí Harborview cần thanh khoản và yêu cầu rút ${fmtM(amt)} (≈8% NAV) trong quý này.`, amt,
        options: [{ id: "pay", label: "Thanh toán đầy đủ trong quý", desc: "Dùng tiền mặt; thiếu thì rút hạn mức, rồi bán tài sản thanh khoản. Nếu vẫn thiếu, Hội đồng phải cho vay khẩn cấp." },
          { id: "defer", label: "Đề nghị hoãn một quý kèm bù 2%", desc: "Giữ được tài sản, nhưng Harborview phật ý và Hội đồng lo ngại." }], def: "pay" };
    },
    "nova-down": G => ({ from: "adrian", title: "NovaGrid: down round", text: "NovaGrid gọi vốn ở định giá thấp hơn. Nếu không góp thêm theo tỷ lệ (pro-rata), phần sở hữu của Aurelion bị pha loãng 25%.",
      options: [{ id: "follow", label: "Góp thêm pro-rata", desc: "Góp thêm 25% số vốn ban đầu để giữ tỷ lệ sở hữu." }, { id: "pass", label: "Không góp", desc: "Phần sở hữu giảm 25%." }], def: "pass", ref: "nova" }),
    "nova-exit": G => ({ from: "adrian", title: "NovaGrid sẵn sàng thoái vốn", text: "Cửa sổ thoái vốn đã mở. Bạn có thể chọn IPO hoặc bán cho đối tác chiến lược ngay trong Danh mục, hoặc tiếp tục nắm giữ.", options: [{ id: "ok", label: "Đã hiểu", desc: "Quyết định thoái vốn ở chi tiết khoản đầu tư." }], def: "ok", ref: "nova" }),
    "bw-breach": G => ({ from: "sophia", title: "Brightwell vi phạm covenant", text: "Nợ ròng/EBITDA vượt ngưỡng cam kết với ngân hàng. Chủ sở hữu phải chọn cách xử lý.",
      options: [{ id: "inject", label: "Bơm thêm vốn cổ phần", desc: "Các cổ đông góp $8M (Aurelion góp theo tỷ lệ sở hữu) để giảm nợ." }, { id: "amend", label: "Đàm phán nới covenant", desc: "Trả phí sửa đổi $0,5M; ngưỡng covenant tăng 1×." }, { id: "keys", label: "Giao doanh nghiệp cho chủ nợ", desc: "Cổ phần về 0; dừng mọi tổn thất thêm." }], def: "amend", ref: "bw" }),
    "timber-low": G => ({ from: "marcus", title: "Giá gỗ đang thấp", text: "Giá gỗ thấp hơn lúc mua hơn 10%. Rừng có thể “làm kho”: để cây đứng và tiếp tục lớn.",
      options: [{ id: "defer", label: "Hoãn khai thác năm nay", desc: "Đặt tỷ lệ khai thác về 0%." }, { id: "harvest", label: "Vẫn khai thác", desc: "Giữ chính sách hiện tại." }], def: "harvest", ref: "timber" })
  };
  function openDecision(G, kind, extra) {
    if (G.decisions.some(d => d.kind === kind && !d.done)) return;
    const d = Object.assign({ id: `${kind}-${G.q}`, kind, q: G.q, done: false }, DECISIONS[kind](G), extra || {});
    G.decisions.push(d);
    mail(G, d.from, d.title, d.text, "decision");
  }
  function resolve(G, did, oid, auto) {
    const d = G.decisions.find(x => x.id === did && !x.done);
    if (!d) return { ok: false, msg: "Không tìm thấy quyết định" };
    if (!d.options.some(o => o.id === oid)) return { ok: false, msg: "Lựa chọn không hợp lệ" };
    let msg = "";
    const nova = G.companies.nova, bw = G.companies.bw;
    if (d.kind === "keyperson") {
      const h = holding(G, d.ref);
      if (h && oid === "suspend") { h.m.suspended = true; G.pending.push({ due: G.q + 2, fx: { resume: h.id }, note: "Northgate bổ nhiệm managing partner mới; giai đoạn đầu tư tiếp tục." }); G.rep = clamp(G.rep + 1, 0, 100); msg = "Đã tạm dừng giai đoạn đầu tư."; }
      else if (h) { h.terms.alpha -= h.terms.keyPerson ? 0.02 : 0.03; msg = "GP tiếp tục; kỳ vọng lợi nhuận của quỹ giảm."; }
    } else if (d.kind === "redeem") {
      if (oid === "pay") { F.flow(G.fund, G.q, -d.amt, "Harborview rút vốn"); const cv = F.cover(G.fund, G.q, G.world); msg = `Đã thanh toán ${fmtM(d.amt)}.${cv.steps.length ? " " + cv.steps.join("; ") + "." : ""}`; G.rep = clamp(G.rep + 3, 0, 100); }
      else { G.pending.push({ due: G.q + 1, fx: { flow: -toM(R(d.amt * 1.02)) }, note: "Thanh toán khoản rút vốn đã hoãn của Harborview (kèm bù 2%)" }); G.rep = clamp(G.rep - 6, 0, 100); G.trust = clamp(G.trust - 4, 0, 100); msg = "Đã hoãn; thanh toán vào quý sau."; }
      G.flags["redeem-done"] = true;
      const hf = G.fund.holdings.find(h => h.type === "hf" && h.status === "active");
      if (!hf || hf.terms.lev <= 1.5) award(G, "steady-hands");
    } else if (d.kind === "nova-down" && nova) {
      const h = G.fund.holdings.find(x => x.type === "equity" && x.terms.company === "nova" && x.status === "active");
      if (h && oid === "follow") {
        const amt = R(h.paidIn * 0.25);
        if (G.fund.cash < amt) return { ok: false, msg: "Không đủ tiền mặt để góp thêm" };
        F.post(G.fund, G.q, "BUY", h.id, { cash: -amt, value: amt, cost: amt, paidIn: amt, cf: -amt, n: "Góp thêm pro-rata vòng down round" });
        h.terms.stake += amt / nova.val; msg = "Đã góp thêm, giữ tỷ lệ sở hữu.";
      } else if (h) { h.terms.stake *= 0.75; msg = "Không góp; tỷ lệ sở hữu bị pha loãng."; }
    } else if (d.kind === "bw-breach" && bw) {
      const h = G.fund.holdings.find(x => x.type === "equity" && x.terms.company === "bw" && x.status === "active");
      if (oid === "inject") {
        const share = h ? R(E.M(8) * h.terms.stake) : 0;
        if (share > G.fund.cash) return { ok: false, msg: "Không đủ tiền mặt" };
        if (h && share) F.post(G.fund, G.q, "BUY", h.id, { cash: -share, value: share, cost: share, paidIn: share, cf: -share, n: "Bơm vốn Brightwell để giảm nợ" });
        bw.netDebt = Math.max(0, bw.netDebt - E.M(8)); A.valueCompany(bw); bw.breach = false; msg = "Đã giảm nợ Brightwell.";
      } else if (oid === "amend") { F.expense(G.fund, G.q, h ? R(E.M(0.5) * Math.max(0.2, h.terms.stake)) : E.M(0.1), "Phí sửa đổi covenant Brightwell"); bw.covenant += 1; bw.breach = false; msg = "Covenant được nới thêm 1×."; }
      else { bw.status = "default"; msg = "Brightwell giao cho chủ nợ."; }
    } else if (d.kind === "timber-low") {
      const h = G.fund.holdings.find(x => x.type === "timber" && x.status === "active");
      if (h && oid === "defer") { h.terms.harvest = 0; G.flags["timber-patience"] = true; msg = "Tạm ngừng khai thác."; }
    }
    d.done = true; d.choice = oid; d.auto = !!auto; d.msg = msg;
    return { ok: true, msg };
  }

  // ======================= Missions =======================
  function mstate(G, id) { return G.missions[id] = G.missions[id] || { steps: [], done: false, score: null, attempts: {} }; }
  function missionOpen(G, m) {
    if (m.ch > G.chapter) return { ok: false, reason: `Chương ${m.ch}` };
    if (m.req && m.req.flag && !G.flags[m.req.flag]) return { ok: false, reason: m.id === "c5-drought" ? "Mở sau vụ thu hoạch có hạn hán" : "Mở sau khi xử lý yêu cầu rút vốn" };
    if (m.req && m.req.allBut) {
      const rest = C.MISSIONS.filter(x => x.ch === m.ch && x.id !== m.req.allBut);
      if (!rest.every(x => G.missions[x.id] && G.missions[x.id].done)) return { ok: false, reason: "Hoàn thành các nhiệm vụ khác của chương trước" };
      const need = C.CHAPTERS[m.ch - 1].minQ, been = G.q - (G.chapterStart[m.ch] != null ? G.chapterStart[m.ch] : G.q);
      if (been < need) return { ok: false, reason: `Hội đồng họp sau ít nhất ${need} quý ở chương này (còn ${need - been} quý)` };
    }
    return { ok: true };
  }
  function stepIndex(G, m) { const s = mstate(G, m.id); return m.steps.findIndex((_, i) => !(s.steps[i] && s.steps[i].done)); }
  // compute tasks: numbers generated from the seed; the answer comes from the engine
  const GEN = {
    calls(G, a) {
      let h = G.fund.holdings.find(x => x.type === "pefund" && x.status === "active"), hypo = false;
      if (!h) {
        hypo = true;
        const terms = { mgmt: 0.02, carry: 0.2, pref: 0.08, catchUp: 1, waterfall: "american" }, commit = E.M(25);
        h = { id: "hypo", commit, unfunded: commit, terms, m: A.MODELS.pefund.init({ id: "hypo", commit, failP: 0 }, { seed: G.seed }) };
      }
      const f4 = A.MODELS.pefund.forecast(h, 4), next = f4[0], after = h.unfunded - f4.reduce((s, x) => s + x, 0);
      return { givens: [["Quỹ", hypo ? "Cam kết giả định $25M vào một quỹ PE (bạn chưa cam kết)" : h.name], ["Vốn cam kết", fmtM(h.commit)], ["Đã góp (paid-in)", fmtM(h.paidIn || 0)], ["Phí quản lý", `${(h.terms.mgmt * 100).toFixed(2)}%/năm trên committed capital, gọi theo quý`],
          ["Thương vụ dự kiến", h.m.deals.filter(d => !d.live && !d.done).map(d => `quý +${d.entry - h.m.age} của quỹ: ${fmtM(d.cost)}`).slice(0, 4).join("; ") || "Không còn"]],
        fields: [{ id: "next", label: "Số tiền gọi vốn quý tới", unit: "$M", ans: toM(next), tol: 0.011 }, { id: "after", label: "Vốn chưa gọi (unfunded) sau 4 quý tới", unit: "$M", ans: toM(after), tol: 0.011 }],
        formula: "Gọi vốn = phí quý (commit × phí/4) + chi phí thương vụ mới; Unfunded = cam kết − tổng đã gọi",
        steps: f4.map((x, i) => `Quý +${i + 1}: gọi ${fmtM(x)}`).concat([`Unfunded = ${fmtM(h.unfunded)} − ${fmtM(f4.reduce((s, x) => s + x, 0))} = ${fmtM(after)}`]) };
    },
    hffee(G, a) {
      const u = k => W.uni(G.seed, "hffee", a, k);
      const P0 = E.M(Math.round(80 + 70 * u(1))), g = Math.round((-0.08 + 0.4 * u(2)) * 1000) / 1000, P1 = P0 + E.mul(P0, g);
      const rm = [0.01, 0.015, 0.02][Math.floor(u(3) * 3)], p = [0.15, 0.2, 0.25][Math.floor(u(4) * 3)];
      const basis = u(5) < 0.6 ? "end" : "begin", perfBasis = u(6) < 0.5 ? "net" : "independent", hard = u(7) < 0.5, rh = hard ? [0.04, 0.05, 0.06, 0.08][Math.floor(u(8) * 4)] : 0;
      const r = E.hfFees({ P0, P1, mgmtRate: rm, mgmtBasis: basis, perfRate: p, perfBasis, hurdle: rh, hurdleType: hard ? "hard" : "none" });
      return { givens: [["Giá trị đầu năm (P0)", fmtM(P0)], ["Giá trị cuối năm trước phí (P1)", fmtM(P1)], ["Phí quản lý", `${(rm * 100).toFixed(1)}% trên giá trị ${basis === "end" ? "cuối năm" : "đầu năm"}`], ["Phí hiệu suất", `${(p * 100).toFixed(0)}% ${perfBasis === "net" ? "tính sau phí quản lý" : "tính độc lập với phí quản lý"}`], ["Hurdle", hard ? `Hard hurdle ${(rh * 100).toFixed(0)}% trên P0` : "Không có"]],
        fields: [{ id: "fees", label: "Tổng phí", unit: "$M", ans: toM(r.fees), tol: 0.011 }, { id: "ret", label: "Lợi nhuận ròng của nhà đầu tư", unit: "%", ans: r.ret * 100, tol: 0.011 }],
        formula: "Phí hiệu suất = p × max{0, [P1 − (phí quản lý nếu tính sau phí) − P0(1 + rh)]}; r = (P1 − P0 − tổng phí)/P0",
        steps: r.steps.map(s => `${s.k} = ${s.f} = ${fmtM(s.v)}`).concat([`Lợi nhuận ròng = (${fmtM(P1)} − ${fmtM(P0)} − ${fmtM(r.fees)}) / ${fmtM(P0)} = ${(r.ret * 100).toFixed(2)}%`]) };
    },
    waterfall(G, a) {
      const u = k => W.uni(G.seed, "wf", a, k);
      const cap = E.M(Math.round(60 + 90 * u(1))), mult = 1.25 + 0.5 * u(2), proceeds = E.M(Math.round(toM(cap) * mult)), pref = [0.06, 0.07, 0.08, 0.09][Math.floor(u(3) * 4)], years = 2 + Math.floor(u(4) * 3);
      const soft = E.waterfall({ capital: cap, proceeds, pref, years, carry: 0.2, catchUp: 1 }), hard = E.waterfall({ capital: cap, proceeds, pref, years, carry: 0.2, catchUp: 0 });
      return { givens: [["Vốn góp ban đầu", fmtM(cap)], ["Giá bán tài sản (tổng tiền thu về)", fmtM(proceeds)], ["Preferred return", `${(pref * 100).toFixed(0)}%/năm, tính đơn trên vốn góp trong ${years} năm`], ["Carried interest", "20%; bỏ qua phí quản lý"]],
        fields: [{ id: "soft", label: "GP nhận — soft hurdle, catch-up toàn phần", unit: "$M", ans: toM(soft.gp), tol: 0.011 }, { id: "hard", label: "GP nhận — hard hurdle, không catch-up", unit: "$M", ans: toM(hard.gp), tol: 0.011 }],
        formula: "Hoàn vốn → preferred return → (catch-up) → chia 80/20",
        steps: [`Preferred return = ${fmtM(cap)} × ${(pref * 100).toFixed(0)}% × ${years} = ${fmtM(soft.prefAmt)}`].concat(soft.tiers.map(t => `Soft — ${t.k}: LP ${fmtM(t.lp)}, GP ${fmtM(t.gp)}`), hard.tiers.map(t => `Hard — ${t.k}: LP ${fmtM(t.lp)}, GP ${fmtM(t.gp)}`)) };
    },
    dispute(G, a) {
      const u = k => W.uni(G.seed, "disp", a, k);
      const g = [0.14 + 0.08 * u(1), -(0.08 + 0.06 * u(2)), 0.1 + 0.08 * u(3)].map(x => Math.round(x * 1000) / 1000);
      const t = { mgmtRate: 0.01, perfRate: 0.2 };
      let v = E.M(100), hwm = v; const rows = [];
      for (let i = 0; i < 3; i++) {
        const P1 = v + E.mul(v, g[i]), right = E.hfFees(Object.assign({ P0: v, P1, hwm }, t));
        const charged = i === 2 ? E.hfFees(Object.assign({ P0: v, P1 }, t)) : right;   // the back office forgot the high-water mark in year 3
        rows.push({ y: i + 1, P0: v, P1, mgmt: charged.mgmt, perf: charged.perf, right: right.perf, hwm });
        v = right.end; hwm = right.hwmNext;
      }
      const r3 = rows[2];
      return { givens: rows.map(r => [`Năm ${r.y}`, `đầu năm ${fmtM(r.P0)} → cuối năm trước phí ${fmtM(r.P1)}; phí quản lý tính ${fmtM(r.mgmt)}; phí hiệu suất tính ${fmtM(r.perf)}`]).concat([["Hợp đồng", "1% phí quản lý trên giá trị cuối năm; 20% phí hiệu suất tính độc lập; có high-water mark (giá trị cao nhất sau phí)"]]),
        fields: [{ id: "perf3", label: "Phí hiệu suất đúng của năm 3", unit: "$M", ans: toM(r3.right), tol: 0.011 }],
        formula: "Phí hiệu suất = p × max[0, P1 − HWM]; HWM = giá trị cao nhất cuối kỳ sau phí",
        steps: [`High-water mark đầu năm 3 = ${fmtM(r3.hwm)} (giá trị sau phí cuối năm 1)`, `Phí đúng = 20% × max(0, ${fmtM(r3.P1)} − ${fmtM(r3.hwm)}) = ${fmtM(r3.right)}`, `Phí đã tính = 20% × (${fmtM(r3.P1)} − ${fmtM(r3.P0)}) = ${fmtM(r3.perf)} ⇒ tính thừa ${fmtM(r3.perf - r3.right)}`] };
    },
    irr(G, a) {
      const u = k => W.uni(G.seed, "irr", a, k);
      const c0 = -Math.round(20 + 20 * u(1)), c1 = -Math.round(5 + 10 * u(2)), c3 = Math.round(5 + 10 * u(3)), c5 = Math.round(40 + 45 * u(4));
      const cfs = [c0, c1, 0, c3, 0, c5], r = E.irr(cfs), inv = -(c0 + c1), mo = E.moic(c3 + c5, 0, inv);
      return { givens: cfs.map((c, i) => [`Năm ${i}`, `${c >= 0 ? "+" : "−"}$${Math.abs(c)}M`]),
        fields: [{ id: "irr", label: "IRR", unit: "%", ans: r.irr * 100, tol: 0.06 }, { id: "moic", label: "MOIC", unit: "×", ans: mo, tol: 0.011 }],
        formula: "Σ CFt/(1 + IRR)^t = 0; MOIC = tổng giá trị nhận về / vốn đầu tư",
        steps: [`Dòng tiền: ${cfs.join(", ")} ($M)`, `IRR ≈ ${(r.irr * 100).toFixed(2)}% (BA II Plus: CF, IRR CPT)`, `MOIC = (${c3} + ${c5}) / (${-c0} + ${-c1}) = ${mo.toFixed(2)}×`] };
    },
    lev(G, a) {
      const u = k => W.uni(G.seed, "lev", a, k);
      const r = Math.round((0.06 + 0.06 * u(1)) * 1000) / 1000, Vb = [25, 50, 75, 100][Math.floor(u(2) * 4)], rb = Math.round((0.03 + 0.03 * u(3)) * 1000) / 1000, rd = -Math.round((0.02 + 0.04 * u(4)) * 1000) / 1000;
      const up = E.leveredReturn({ r, Vc: 100, Vb, rb }).rL, dn = E.leveredReturn({ r: rd, Vc: 100, Vb, rb }).rL;
      return { givens: [["Vốn chủ sở hữu (Vc)", "$100M"], ["Vốn vay (Vb)", `$${Vb}M`], ["Lãi vay (rb)", `${(rb * 100).toFixed(1)}%`], ["Lợi nhuận danh mục — kịch bản tốt", `${(r * 100).toFixed(1)}%`], ["Lợi nhuận danh mục — kịch bản xấu", `${(rd * 100).toFixed(1)}%`]],
        fields: [{ id: "up", label: "Lợi nhuận trên vốn chủ — kịch bản tốt", unit: "%", ans: up * 100, tol: 0.011 }, { id: "dn", label: "Lợi nhuận trên vốn chủ — kịch bản xấu", unit: "%", ans: dn * 100, tol: 0.011 }],
        formula: "rL = r + (Vb/Vc)(r − rb)", steps: [`Tốt: ${(r * 100).toFixed(1)}% + ${Vb / 100} × (${(r * 100).toFixed(1)}% − ${(rb * 100).toFixed(1)}%) = ${(up * 100).toFixed(2)}%`, `Xấu: ${(rd * 100).toFixed(1)}% + ${Vb / 100} × (${(rd * 100).toFixed(1)}% − ${(rb * 100).toFixed(1)}%) = ${(dn * 100).toFixed(2)}%`] };
    },
    toll(G) {
      const d = C.DEALS["d4-toll"], p = d.project({ commit: 20 }), rate = G.world.rate + 0.045, tbl = E.scenarioTable(p, d.scen, rate);
      const low = tbl[0], cf3 = low.cfs[p.capex.length + 2];
      const neg = tbl.filter(s => s.npv < 0).map(s => s.id).join(",") || "none";
      const opts = [["none", "Không kịch bản nào"], ["low", "Chỉ kịch bản thấp"], ["low,base", "Thấp và cơ sở"], ["low,base,high", "Cả ba"]];
      return { givens: [["Vốn cổ phần", "$20M, giải ngân $10M năm 0 và $10M năm 1"], ["Doanh thu cơ sở năm vận hành đầu", `$${p.rev0.toFixed(2)}M, tăng ${(p.growth * 100).toFixed(0)}%/năm; năm đầu đạt 50% (ramp-up 2 năm)`], ["Chi phí vận hành", "35% doanh thu"], ["Nhượng quyền", "25 năm, không giá trị cuối kỳ"], ["Lãi suất chiết khấu", `${(rate * 100).toFixed(2)}%`]].concat(tbl.map(s => [`NPV kịch bản ${s.label}`, s.id === "low" ? "? (bạn tính)" : `$${s.npv.toFixed(2)}M`])),
        fields: [{ id: "cf3", label: "Dòng tiền hoạt động năm vận hành thứ 3, kịch bản thấp", unit: "$M", ans: cf3, tol: 0.011 }, { id: "neg", label: "Kịch bản nào có NPV âm?", select: opts, ans: neg }],
        formula: "CF = doanh thu cơ sở × hệ số nhu cầu × (1 + g)^t × (1 − 35%)",
        steps: [`Năm vận hành thứ 3 (t = 2, đã hết ramp-up): ${p.rev0.toFixed(3)} × 0,7 × 1,02² × 0,65 = ${cf3.toFixed(3)}`, ...tbl.map(s => `NPV ${s.label} = $${s.npv.toFixed(2)}M; IRR ${s.irr != null ? (s.irr * 100).toFixed(2) + "%" : "—"}`)] };
    },
    forward(G, a) {
      const u = k => W.uni(G.seed, "fwd", a, k);
      const S0 = Math.round(60 + 60 * u(1)), r = Math.round((0.02 + 0.04 * u(2)) * 1000) / 1000, c = Math.round(0.04 * u(3) * 1000) / 1000, i = Math.round(0.1 * u(4) * 1000) / 1000, T = [0.5, 1, 1.5][Math.floor(u(5) * 3)];
      const f = E.forwardPrice({ S0, r, c, i, T });
      return { givens: [["Giá giao ngay S0", S0.toFixed(2)], ["Lãi suất phi rủi ro r", `${(r * 100).toFixed(1)}%`], ["Chi phí lưu kho c", `${(c * 100).toFixed(1)}%`], ["Convenience yield i", `${(i * 100).toFixed(1)}%`], ["Kỳ hạn T", `${T} năm (ghép lãi liên tục)`]],
        fields: [{ id: "F", label: "Giá kỳ hạn F0(T)", unit: "", ans: f.F, tol: 0.011 }, { id: "shape", label: "Đường cong", select: [["contango", "Contango"], ["backwardation", "Backwardation"]], ans: f.shape === "flat" ? "contango" : f.shape }],
        formula: "F0(T) = S0 · e^{(r + c − i)T}", steps: [`F = ${S0} × e^{(${r} + ${c} − ${i}) × ${T}} = ${f.F.toFixed(3)}`, f.F > S0 ? "F > S0 ⇒ contango" : "F < S0 ⇒ backwardation"] };
    },
    drought(G) {
      const h = G.fund.holdings.find(x => x.type === "farm" && x.m.last && x.m.last.weather < 0.9);
      const L = h ? h.m.last : { tons: 4000 * 3.2 * 0.6, cropPx: 24150, rev: R(4000 * 3.2 * 0.6 * 24150), hedge: 0, cost: 4000 * 45000, weather: 0.6 };
      const normal = (h ? h.terms.acres * h.terms.yieldPerAcre : 12800), lost = normal - L.tons, net = L.rev + L.hedge - L.cost;
      return { givens: [["Trang trại", h ? h.name : "Trang trại giả định 4.000 mẫu (bạn không sở hữu trang trại tự vận hành)"], ["Sản lượng bình thường", `${Math.round(normal).toLocaleString("en-US")} tấn`], ["Hệ số thời tiết vụ này", L.weather.toFixed(2)], ["Giá nông sản lúc thu hoạch", `$${(L.cropPx / 100).toFixed(2)}/tấn`], ["Lãi/lỗ hợp đồng phòng hộ", fmtM(L.hedge)], ["Chi phí canh tác", fmtM(L.cost)]],
        fields: [{ id: "lost", label: "Sản lượng mất do hạn hán", unit: "tấn", ans: Math.round(lost), tol: 1.01 }, { id: "net", label: "Thu nhập ròng từ vụ thu hoạch (doanh thu + phòng hộ − chi phí)", unit: "$M", ans: toM(net), tol: 0.011 }],
        formula: "Sản lượng = bình thường × hệ số thời tiết; Thu nhập ròng = sản lượng × giá + lãi/lỗ phòng hộ − chi phí",
        steps: [`Mất = ${Math.round(normal)} × (1 − ${L.weather.toFixed(2)}) = ${Math.round(lost)} tấn`, `Doanh thu = ${Math.round(L.tons)} × $${(L.cropPx / 100).toFixed(2)} = ${fmtM(L.rev)}`, `Thu nhập ròng = ${fmtM(L.rev)} + ${fmtM(L.hedge)} − ${fmtM(L.cost)} = ${fmtM(net)}`, "Giá đất là nguồn lợi nhuận riêng, xem trong chi tiết khoản đầu tư."] };
    },
    exposure(G, a) {
      const u = k => W.uni(G.seed, "exp", a, k);
      const L = 100 + 10 * Math.round(8 * u(1)), S = 30 + 10 * Math.round(8 * u(2)), ex = E.exposure({ equity: 100, long: L, short: S });
      return { givens: [["Vốn", "$100M"], ["Vị thế long", `$${L}M`], ["Vị thế short", `$${S}M`]],
        fields: [{ id: "gross", label: "Gross exposure", unit: "%", ans: ex.gross * 100, tol: 0.011 }, { id: "net", label: "Net exposure", unit: "%", ans: ex.net * 100, tol: 0.011 }],
        formula: "Gross = (long + short)/vốn; Net = (long − short)/vốn (thước đo phổ biến trong ngành)", steps: [`Gross = (${L} + ${S})/100 = ${L + S}%`, `Net = (${L} − ${S})/100 = ${L - S}%`] };
    },
    fof(G, a) {
      const u = k => W.uni(G.seed, "fof", a, k);
      const g = Math.round((0.08 + 0.17 * u(1)) * 1000) / 1000;
      const r = E.fofReturn({ capital: E.M(100), grossReturn: g, hf: { mgmt: 0.02, basis: "begin", perf: 0.2 }, fof: { mgmt: 0.01, basis: "begin", perf: 0.1 } });
      return { givens: [["Lợi nhuận gộp của các quỹ thành phần", `${(g * 100).toFixed(1)}%`], ["Phí quỹ thành phần", "2% trên giá trị đầu năm + 20% lợi nhuận (tính độc lập)"], ["Phí fund of funds", "1% trên giá trị đầu năm + 10% lợi nhuận sau phí tầng dưới (tính độc lập)"], ["Vốn", "$100M"]],
        fields: [{ id: "direct", label: "Lợi nhuận ròng đầu tư trực tiếp", unit: "%", ans: r.direct * 100, tol: 0.011 }, { id: "fof", label: "Lợi nhuận ròng qua fund of funds", unit: "%", ans: r.viaFof * 100, tol: 0.011 }],
        formula: "Áp dụng hai tầng phí nối tiếp", steps: [`Trực tiếp: ${(g * 100).toFixed(1)} − 2 − 20% × ${(g * 100).toFixed(1)} = ${(r.direct * 100).toFixed(2)}%`, `Qua FoF: ${(r.direct * 100).toFixed(2)} − 1 − 10% × ${(r.direct * 100).toFixed(2)} = ${(r.viaFof * 100).toFixed(2)}%`] };
    }
  };
  function computeTask(G, mid, si) {
    const m = C.MISSIONS.find(x => x.id === mid), st = m.steps[si], s = mstate(G, mid);
    const a = s.attempts[si] || 0;
    const t = GEN[st.gen](G, a);
    return t;
  }
  function checkField(f, val) {
    if (f.select) return String(val) === String(f.ans);
    const n = parseFloat(String(val).replace(",", "."));
    return isFinite(n) && Math.abs(n - f.ans) <= f.tol;
  }
  // submit one step; returns feedback for the screen
  function submitStep(G, mid, si, ans) {
    const m = C.MISSIONS.find(x => x.id === mid);
    if (!m) return { ok: false, msg: "Không có nhiệm vụ" };
    const op = missionOpen(G, m); if (!op.ok) return { ok: false, msg: op.reason };
    const s = mstate(G, mid), st = m.steps[si];
    if (!st) return { ok: false, msg: "Không có bước" };
    if (stepIndex(G, m) !== si) return { ok: false, msg: "Hãy làm theo thứ tự các bước" };
    let res = { ok: true, done: true, score: null };
    if (st.type === "talk") res.score = null;
    else if (st.type === "classify") {
      const marks = st.items.map((it, i) => ans && ans[i] === it[1]);
      const right = marks.filter(Boolean).length;
      learn(G, m.lm, st.items.length, right);
      res = { ok: true, done: true, score: right / st.items.length, marks, explain: st.explain };
    } else if (st.type === "choice") {
      const o = st.options.find(x => x.id === ans);
      if (!o) return { ok: false, msg: "Hãy chọn một phương án" };
      let fx = o.fx, fb = o.fb;
      if (o.needCorrect) { const prev = s.steps[si - 1]; if (!prev || !prev.score) { fx = { rep: 1, cash: -1 }; fb = "Bạn hoàn phí nhưng con số chưa đúng; Harborview yêu cầu kiểm toán lại."; } }
      applyFx(G, fx, `Quyết định: ${m.title}`);
      if (o.ok != null || st.options.some(x => x.ok)) learn(G, m.lm, 1, o.ok ? 1 : 0);
      res = { ok: true, done: true, score: st.options.some(x => x.ok) ? (o.ok ? 1 : 0) : null, fb, choice: o.id, right: (st.options.find(x => x.ok) || {}).id };
    } else if (st.type === "deals") {
      const n = st.deals.filter(id => G.deals[id]).length;
      if (n < st.min) return { ok: false, msg: `Cần thực hiện ít nhất ${st.min} khoản đầu tư trong danh sách (hoặc chuyển sang chương sau khi đã cân nhắc)` };
      res = { ok: true, done: true, score: null, taken: n };
    } else if (st.type === "compute") {
      const t = computeTask(G, mid, si);
      const marks = t.fields.map(f => checkField(f, ans && ans[f.id]));
      const right = marks.filter(Boolean).length;
      learn(G, m.lm, t.fields.length, right);
      s.attempts[si] = (s.attempts[si] || 0) + 1;
      const prevBest = s.steps[si] ? s.steps[si].score || 0 : 0;
      res = { ok: true, done: true, score: Math.max(prevBest, right / t.fields.length), marks, task: t, answers: ans };
    } else if (st.type === "quiz") {
      const qz = s.quiz;
      if (!qz || Object.keys(qz.answers).length < qz.ids.length) return { ok: false, msg: "Trả lời hết các câu hỏi trước" };
      const right = qz.ids.filter(id => qz.answers[id] === C.QUESTIONS.find(q => q.id === id).ans).length;
      if (right < st.pass) { s.quiz = null; return { ok: true, done: false, retry: true, score: right / qz.ids.length, msg: `Đúng ${right}/${qz.ids.length}. Cần ít nhất ${st.pass}. Làm lại với bộ câu hỏi mới.` }; }
      res = { ok: true, done: true, score: right / qz.ids.length };
    } else if (st.type === "review") {
      res = Object.assign({ ok: true, done: true }, finalReview(G));
    }
    s.steps[si] = { done: res.done, score: res.score, ans: st.type === "compute" || st.type === "classify" || st.type === "choice" ? ans : undefined, task: st.type === "compute" ? res.task : undefined, q: G.q };
    if (stepIndex(G, m) === -1 && !s.done) {
      s.done = true;
      const sc = s.steps.map(x => x.score).filter(x => x != null);
      s.score = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 1;
      mail(G, "marcus", `Hoàn thành: ${m.title}`, `Điểm nhiệm vụ ${Math.round(s.score * 100)}/100.`, "mission");
    }
    updateCareer(G); checkAch(G);
    return res;
  }
  // quiz inside a mission: draw, answer one by one
  function drawQuiz(G, lm, n, salt) {
    const pool = C.QUESTIONS.filter(q => q.lm === lm);
    const seen = new Set(G.quizHist.map(h => h.id)), wrong = new Set(G.wrong);
    const score = q => (wrong.has(q.id) ? 0 : seen.has(q.id) ? 2 : 1) + W.uni(G.seed, "qz", salt, q.id);
    return pool.slice().sort((a, b) => score(a) - score(b)).slice(0, n).map(q => q.id);
  }
  function missionQuiz(G, mid) {
    const m = C.MISSIONS.find(x => x.id === mid), s = mstate(G, mid), st = m.steps.find(x => x.type === "quiz");
    if (!s.quiz) s.quiz = { ids: drawQuiz(G, st.lm, st.n, `${mid}-${G.quizHist.length}`), answers: {} };
    return s.quiz;
  }
  function answer(G, qid, choice, mid) {
    const q = C.QUESTIONS.find(x => x.id === qid); if (!q) return { ok: false };
    const c = +choice; if (![0, 1, 2].includes(c)) return { ok: false, msg: "Chọn A, B hoặc C" };
    if (mid) { const s = mstate(G, mid); if (!s.quiz || !s.quiz.ids.includes(qid)) return { ok: false, msg: "Câu hỏi không thuộc bài kiểm tra" }; if (s.quiz.answers[qid] != null) return { ok: false, msg: "Đã trả lời" }; s.quiz.answers[qid] = c; }
    const ok = c === q.ans;
    learn(G, q.lm, 1, ok ? 1 : 0);
    G.quizHist.push({ q: G.q, id: qid, lm: q.lm, c, ok });
    if (G.quizHist.length > 400) G.quizHist.shift();
    if (!ok && !G.wrong.includes(qid)) G.wrong.push(qid);
    if (ok) G.wrong = G.wrong.filter(x => x !== qid);
    updateCareer(G); checkAch(G);
    return { ok: true, correct: ok, q };
  }

  // ======================= Board, mandate, career =======================
  function breaches(G) {
    const f = G.fund, n = F.nav(f), out = [], L = C.MANDATE;
    if (n <= 0) return ["NAV âm"];
    for (const h of f.holdings) if (h.status === "active" && (h.value - h.debt + h.unfunded) / n > L.single + 1e-9) out.push(`${h.name} chiếm ${Math.round((h.value - h.debt + h.unfunded) / n * 100)}% NAV (gồm vốn cam kết chưa gọi) > ${L.single * 100}%`);
    const liq = F.liquidity(f), ex = F.exposure(f);
    if (liq.illiquidPct > L.illiquid) out.push(`Tài sản kém thanh khoản ${Math.round(liq.illiquidPct * 100)}% NAV > ${L.illiquid * 100}%`);
    if (ex.by.digital / n > L.digital + 1e-9) out.push(`Tài sản số ${(ex.by.digital / n * 100).toFixed(1)}% NAV > 5%`);
    if (f.debt / n > L.fundDebt) out.push(`Nợ cấp quỹ ${(f.debt / n * 100).toFixed(1)}% NAV > 20%`);
    if ((liq.buckets.cash + liq.buckets.liquid) / n < L.minLiquid) out.push("Tiền mặt + tài sản thanh khoản < 3% NAV");
    for (const h of f.holdings) if (h.type === "hf" && h.status === "active" && h.terms.lev > L.hfLev) out.push("Đòn bẩy hedge fund > 3×");
    return out;
  }
  function scorecard(G) {
    const f = G.fund, nh = f.navHist, n = F.nav(f), yrs = Math.max(0.25, G.q / 4);
    const twr = E.twr(nh.slice(1).map(x => x.ret)), bench = E.twr(nh.slice(1).map(x => x.bench));
    const ann = Math.pow(1 + twr, 1 / yrs) - 1, annB = Math.pow(1 + bench, 1 / yrs) - 1;
    const perf = G.q === 0 ? 50 : clamp(55 + (ann - annB) * 500 + (n < f.initial ? -10 : 0), 0, 100);
    const dd = E.maxDrawdown(nh.map(x => x.idx)), act = f.holdings.filter(h => h.status === "active");
    const conc = n > 0 && act.length ? Math.max(...act.map(h => (h.value - h.debt) / n)) : 0, lev = n > 0 ? f.debt / n : 0;
    const hfLev = Math.max(0, ...act.filter(h => h.type === "hf").map(h => h.terms.lev - 1.5));
    const risk = clamp(100 - Math.abs(dd) * 250 - Math.max(0, conc - 0.2) * 300 - lev * 150 - hfLev * 15, 0, 100);
    const liq = F.liquidity(f), cov = liq.coverage;
    let liqS = cov >= 1.5 ? 100 : cov >= 1 ? 65 + (cov - 1) * 70 : 65 * cov;
    if (liq.illiquidPct > C.MANDATE.illiquid) liqS -= 20;
    liqS = clamp(liqS, 0, 100);
    const br = breaches(G), comp = clamp(100 - 25 * br.length, 0, 100);
    const seen = [1, 2, 3, 4, 5, 6, 7].filter(l => G.know[l].n >= 3);
    const know = seen.length ? seen.reduce((s, l) => s + mastery(G, l), 0) / seen.length * 100 : 50;
    const total = 0.25 * perf + 0.2 * risk + 0.15 * liqS + 0.15 * comp + 0.1 * G.rep + 0.15 * know;
    return { perf, risk, liq: liqS, comp, rep: G.rep, know, total, d: { twr, bench, ann, annB, dd, conc, lev, coverage: cov, breaches: br, nav: n } };
  }
  function updateCareer(G) {
    const L = G.board || scorecard(G), done = n => !!G.chapterDone[n];
    const lastRev = G.reviews[G.reviews.length - 1];
    const ok = {
      2: () => done(1) && mastery(G, 1) >= 0.6,
      3: () => done(2) && mastery(G, 2) >= 0.6 && (!lastRev || lastRev.sc.d.breaches.length === 0),
      4: () => done(3) && G.rep >= 45 && L.d.coverage >= 1,
      5: () => done(5) && avgMastery(G, [1, 2, 3, 4, 5]) >= 0.65 && L.risk >= 50,
      6: () => done(6) && G.trust >= 60 && avgMastery(G, [1, 2, 3, 4, 5, 6]) >= 0.7,
      7: () => done(7) && (G.finalScore || 0) >= 75 && avgMastery(G) >= 0.75
    };
    while (G.career < 7 && ok[G.career + 1]()) { G.career += 1; G.careerHist.push({ q: G.q, lv: G.career }); mail(G, "eleanor", `Thăng chức: ${C.CAREER[G.career - 1].name}`, `Hội đồng ghi nhận: ${C.CAREER[G.career - 1].need}.`, "career"); }
  }
  function careerNext(G) {
    const nx = C.CAREER[G.career]; if (!nx) return null;
    return nx;
  }
  function chapterReady(G) {
    const ms = C.MISSIONS.filter(m => m.ch === G.chapter);
    const left = ms.filter(m => !(G.missions[m.id] && G.missions[m.id].done));
    const qs = G.q - G.chapterStart[G.chapter], minQ = C.CHAPTERS[G.chapter - 1].minQ;
    return { ready: left.length === 0 && qs >= minQ, left, qs, minQ };
  }
  function finalReview(G) {
    const sc = scorecard(G);
    const ms = C.MISSIONS.map(m => G.missions[m.id] && G.missions[m.id].score).filter(x => x != null);
    const avgM = ms.length ? ms.reduce((a, b) => a + b, 0) / C.MISSIONS.length : 0;
    const fs = Math.round(0.6 * sc.total + 0.25 * avgM * 100 + 0.15 * avgMastery(G) * 100);
    G.finalScore = fs;
    updateCareer(G);
    const end = C.ENDINGS.find(e => fs >= e.min && (!e.career || G.career >= e.career));
    G.ending = end.id; G.chapterDone[7] = G.q;
    G.status = "finished";
    updateCareer(G);
    if (G.career >= 7) award(G, "empire");
    if (!G.emergencies) award(G, "no-default");
    mail(G, "eleanor", `Kết thúc chiến dịch: ${end.title}`, `${end.text} Điểm tổng kết ${fs}/100.`, "ending");
    return { final: fs, ending: end, sc };
  }

  // ======================= The quarter =======================
  function preflight(G) {
    const f = G.fund, calls = F.forecastCalls(f, 1)[0], warn = [];
    if (calls > f.cash) warn.push(`Dự kiến gọi vốn ${fmtM(calls)} quý tới nhưng tiền mặt chỉ ${fmtM(f.cash)}: hệ thống sẽ rút hạn mức, rồi bán tài sản thanh khoản; nếu vẫn thiếu, Hội đồng cho vay khẩn cấp (bị phạt uy tín).`);
    const open = G.decisions.filter(d => !d.done);
    if (open.length) warn.push(`${open.length} quyết định chưa xử lý sẽ được áp dụng phương án mặc định.`);
    const br = breaches(G); if (br.length) warn.push("Đang vi phạm mandate: " + br.join("; "));
    return warn;
  }
  function endQuarter(G) {
    if (G.status === "lost") return { ok: false, msg: "Ván chơi đã kết thúc" };
    const q0 = G.q, q1 = q0 + 1, f = G.fund, report = { q: q1, news: [], events: [], decisions: [], auto: [] };
    // 1. decisions left open take their default
    for (const d of G.decisions.filter(x => !x.done)) { const r = resolve(G, d.id, d.def, true); report.auto.push(`${d.title}: ${d.options.find(o => o.id === d.def).label}${r.msg ? " — " + r.msg : ""}`); }
    // 2. events: the story's, then perhaps a random one
    const shocks = [], evIds = [];
    const ch = G.chapter, cq = q0 - G.chapterStart[ch];
    for (const s of C.SCRIPT[ch] || []) {
      const key = `${ch}-${s.ev}`;
      if (G.fired[key]) continue;
      if (s.at === cq || (s.at === "harvest" && W.isHarvest(q1))) { evIds.push({ id: s.ev, decision: s.decision }); G.fired[key] = q1; }
    }
    if (!evIds.length) {
      const D = W.DIFFICULTY[G.difficulty], u = W.uni(G.seed, "event", q1);
      if (u < 0.24 * D.events) {
        const pool = Object.entries(C.EVENTS).filter(([id, e]) => (!e.cond || e.cond(G.world)) && (!e.needs || e.needs(G)) && id !== "drought" && !(id === "keyPerson" && G.fired.keyPerson));
        const tot = pool.reduce((s, [, e]) => s + e.w, 0); let acc = 0; const v = W.uni(G.seed, "eventPick", q1) * tot;
        for (const [id, e] of pool) { acc += e.w; if (v <= acc) { evIds.push({ id }); if (id === "keyPerson") G.fired.keyPerson = q1; break; } }
      }
    }
    for (const p of G.persist.filter(x => x.due === q1)) shocks.push(...p.shocks);
    G.persist = G.persist.filter(x => x.due > q1);
    for (const e of evIds) {
      const ev = C.EVENTS[e.id];
      shocks.push(...(ev.shocks || []));
      (ev.persist || []).forEach(p => G.persist.push({ due: q1 + p.q, shocks: p.shocks }));
      G.events.unshift({ q: q1, id: e.id, title: ev.title, text: ev.text });
      report.events.push({ id: e.id, title: ev.title, text: ev.text, from: ev.from });
      mail(G, ev.from, ev.title, ev.text, "event");
      if (e.id === "drought") G.flags.droughtQ = q1;
    }
    if (G.events.length > 60) G.events.length = 60;
    // 3. the economy
    const w0 = G.world, w1 = W.step(w0, shocks);
    G.world = w1;
    const ctx = { seed: G.seed, W: w1, W0: w0, q: q1, companies: G.companies, hackMul: ch === 7 ? 2 : 1 };
    // 4. companies
    for (const c of Object.values(G.companies)) {
      for (const o of A.stepCompany(c, w1, ctx)) {
        report.news.push(o.text); mail(G, "adrian", c.name, o.text, "company");
        if (c.id === "nova" && o.k === "ms-fail" && c.status === "active" && G.fund.holdings.some(h => h.terms.company === "nova" && h.type === "equity" && h.status === "active")) openDecision(G, "nova-down");
        if (c.id === "nova" && o.k === "exit-ready" && G.fund.holdings.some(h => h.terms.company === "nova" && h.type === "equity" && h.status === "active")) openDecision(G, "nova-exit");
        if (c.id === "bw" && o.k === "breach" && G.fund.holdings.some(h => h.terms.company === "bw" && h.type === "equity" && h.status === "active")) openDecision(G, "bw-breach");
      }
    }
    // 5. the books
    report.news.push(...F.stepQuarter(f, q1, ctx));
    for (const e of evIds) if (C.EVENTS[e.id].fund === "bankrupt") {
      const h = f.holdings.find(x => x.type === "coinv" && x.status === "active");
      if (h) { const loss = R(h.value * 0.6); F.post(f, q1, "MARK", h.id, { value: -loss, cat: { unrealized: -loss }, n: "Ghi giảm 60% sau phá sản" }); if (h.m) h.m.tv = R(h.m.tv * 0.4); }
    }
    // 6. delayed consequences that fall due
    G.q = q1;
    for (const p of G.pending.filter(x => x.due === q1)) {
      if (p.fx.resume) { const h = holding(G, p.fx.resume); if (h) h.m.suspended = false; }
      applyFx(G, p.fx, p.note); mail(G, "eleanor", "Hệ quả của một quyết định trước", p.note, "consequence"); report.news.push(p.note);
    }
    G.pending = G.pending.filter(x => x.due > q1);
    // 7. decisions raised by events this quarter (after the books, so amounts use the new NAV)
    for (const e of evIds) { const ev = C.EVENTS[e.id]; if (ev.decision) openDecision(G, ev.decision); if (e.decision) openDecision(G, e.decision); }
    if (W.isYearEnd(q1 + 1)) { const t = f.holdings.find(h => h.type === "timber" && h.status === "active"); if (t && t.terms.harvest > 0 && w1.timber < 0.9 * t.m.tb0) openDecision(G, "timber-low"); }
    if (G.flags.droughtQ && W.isHarvest(q1) && G.flags.droughtQ <= q1) { G.flags["drought-done"] = true; const fm = f.holdings.find(h => h.type === "farm" && h.status === "active"); if (fm && fm.terms.hedgeTons > 0) award(G, "hedged-harvest"); }
    // 8. cash shortfall: credit line, liquid sales, then an emergency loan from the board
    const cv = F.cover(f, q1, w1);
    cv.steps.forEach(s => report.news.push(s));
    if (cv.short > 0) {
      const amt = cv.short + E.M(1);
      F.setCredit(f, f.debt + amt + Math.max(0, f.credit.limit - f.debt), Math.max(f.credit.rate, w1.rate + 0.06));
      F.draw(f, q1, amt, "Khoản vay khẩn cấp từ Hội đồng (lãi phạt)");
      G.emergencies += 1; G.trust = clamp(G.trust - 15, 0, 100); G.rep = clamp(G.rep - 10, 0, 100);
      mail(G, "eleanor", "Vay khẩn cấp để trả nghĩa vụ", `Quỹ thiếu ${fmtM(cv.short)} tiền mặt để trả capital call và chi phí. Hội đồng cho vay khẩn cấp với lãi phạt. Lần thứ hai, bạn sẽ bị thay thế.`, "alert");
      report.news.push("Vay khẩn cấp từ Hội đồng");
    }
    const row = F.closeQuarter(f, q1, w1);
    // 9. board
    G.board = scorecard(G);
    G.trust = clamp(Math.round((0.75 * G.trust + 0.25 * G.board.total) * 10) / 10, 0, 100);
    G.boardHist.push({ q: q1, total: G.board.total, trust: G.trust, nav: row.nav });
    if (G.boardHist.length > 60) G.boardHist.shift();
    report.board = G.board; report.nav = row;
    // 10. chapter review
    const cr = chapterReady(G);
    if (G.status === "active" && cr.ready && G.chapter < 7) report.review = chapterReview(G);
    // 11. win/lose
    const nav = F.nav(f);
    if (nav < R(f.initial * 0.6)) lose(G, "closed", "NAV giảm dưới 60% vốn ban đầu: Hội đồng đóng quỹ.");
    else if (G.trust <= 10) lose(G, "fired", "Niềm tin của Hội đồng xuống dưới 10: bạn bị sa thải.");
    else if (G.emergencies >= 2) lose(G, "insolvent", "Hai lần phải vay khẩn cấp để trả nghĩa vụ: Hội đồng thay người quản lý.");
    updateCareer(G); checkAch(G);
    report.verify = F.verify(f).ok;
    G.reports.unshift({ q: q1, nav: row.nav, ret: row.ret, bench: row.bench, events: report.events.map(e => e.title), news: report.news.slice(0, 12), auto: report.auto, total: G.board.total, trust: G.trust, review: report.review ? { ch: report.review.ch, pass: report.review.pass } : null });
    if (G.reports.length > 40) G.reports.pop();
    return Object.assign({ ok: true }, report);
  }
  function chapterReview(G) {
    const ch = G.chapter, sc = G.board, pass = sc.total >= 45;
    G.reviews.push({ ch, q: G.q, sc, pass });
    G.chapterDone[ch] = G.q;
    if (pass) { G.probation = 0; G.trust = clamp(G.trust + 5, 0, 100); }
    else { G.probation += 1; G.trust = clamp(G.trust - 10, 0, 100); }
    mail(G, "eleanor", `Đánh giá chương ${ch}: ${pass ? "Đạt" : "Cảnh cáo"}`, pass ? `Điểm Hội đồng ${Math.round(sc.total)}/100. Chương ${ch + 1} — ${C.CHAPTERS[ch].title} — được mở.` : `Điểm Hội đồng ${Math.round(sc.total)}/100 < 45. Bạn vẫn tiếp tục, nhưng hai lần cảnh cáo liên tiếp sẽ dẫn tới thay thế.`, "review");
    if (G.probation >= 2) lose(G, "fired", "Hai lần đánh giá chương liên tiếp dưới chuẩn.");
    G.chapter = ch + 1; G.chapterStart[ch + 1] = G.q;
    const next = C.CHAPTERS[ch];
    next.intro.forEach(([who, t]) => mail(G, who, `Chương ${next.n}: ${next.title}`, t, "story"));
    updateCareer(G);
    return { ch, pass, sc };
  }
  function lose(G, why, text) { if (G.status === "lost") return; G.status = "lost"; G.lost = { why, text, q: G.q }; mail(G, "eleanor", "Kết thúc", text, "alert"); }

  // ======================= Saved games =======================
  function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
  function serialize(G) { const { check, ...rest } = G; const body = JSON.stringify(rest); return JSON.stringify(Object.assign({}, rest, { check: fnv(body) })); }
  function deserialize(str) {
    let o; try { o = JSON.parse(str); } catch (e) { return { ok: false, msg: "Tệp lưu không đọc được" }; }
    if (!o || typeof o !== "object" || !String(o.schema || "").startsWith("alt-save/")) return { ok: false, msg: "Không phải tệp lưu của Alternative Empire" };
    const { check, ...rest } = o;
    const fresh = migrate(rest);
    const sealOk = check === fnv(JSON.stringify(rest));
    const v = F.verify(fresh.fund);
    if (!sealOk || !v.ok) fresh.tampered = true;
    return { ok: true, G: fresh, sealOk, ledgerOk: v.ok, errors: v.errors };
  }
  // fills fields added after a save was written; v1 is current
  function migrate(G) {
    if ((G.v || 0) > VERSION) throw new E.AltError("Tệp lưu từ phiên bản mới hơn");
    const d = newGame({ seed: G.seed || 1, difficulty: G.difficulty });
    for (const k of Object.keys(d)) if (G[k] === undefined) G[k] = d[k];
    G.v = VERSION; G.schema = SCHEMA;
    return G;
  }
  function summary(G) { return { name: G.name, q: G.q, label: W.label(G.q), chapter: G.chapter, nav: F.nav(G.fund), career: C.CAREER[G.career - 1].name, status: G.status, difficulty: G.difficulty, seed: G.seed, tampered: !!G.tampered }; }

  return { SCHEMA, VERSION, INITIAL, REPEATABLE, newGame, dealState, preview, invest, negoInfo, negotiate, termsOf, holding, sellHolding, setPolicy, exitOptions, exitHolding, credit,
    resolve, missionOpen, stepIndex, mstate, computeTask, submitStep, missionQuiz, answer, drawQuiz, mastery, avgMastery, weaknesses, breaches, scorecard, careerNext, chapterReady,
    preflight, endQuarter, serialize, deserialize, migrate, summary, learn, GEN, checkField, companyOfHolding };
});

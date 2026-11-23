// ============================================================
// bond/market.js — Bond Empire: the bond universe and the market simulation
//
// Synthetic mode: a weekly clock moves inflation, growth, the policy rate, government
// borrowing, risk appetite and liquidity; the government par curve, every issuer's
// credit spread, its default probability and its rating follow from them. Events are
// processed in time order and reported as news. Everything here is SIMULATED, and the
// issuers are fictional.
// Replay mode: the government curve comes, week by week, from a dataset the player
// imports (Vietnam government yield curve from WiData); credit spreads stay simulated.
// Only weeks already reached are visible.
// ============================================================
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./engine.js") : root.BondEngine);
  if (node) module.exports = api;
  else root.BondMarket = api;
})(typeof self !== "undefined" ? self : this, function (E) {
  "use strict";

  const TENORS = [1, 3, 5, 10, 20];
  const FACE = 100000;                                     // đồng of par per bond
  const RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"];
  const RATING = { AAA: { s: 0.0045, pd: 0.0002, h: 0.10 }, AA: { s: 0.0070, pd: 0.0005, h: 0.12 }, A: { s: 0.0105, pd: 0.0010, h: 0.15 },
    BBB: { s: 0.0175, pd: 0.0030, h: 0.25 }, BB: { s: 0.0350, pd: 0.0120, h: 0.45 }, B: { s: 0.0600, pd: 0.0400, h: 0.80 }, CCC: { s: 0.1200, pd: 0.1500, h: 1.50 } };
  const isIG = r => RATINGS.indexOf(r) <= 3;
  const SENIORITY = { secured: { add: -0.003, rr: 0.65, name: "Có bảo đảm" }, senior: { add: 0, rr: 0.40, name: "Không bảo đảm, ưu tiên" }, sub: { add: 0.015, rr: 0.15, name: "Thứ cấp" } };
  // Fictional issuers (any resemblance to real companies is not intended)
  const ISSUERS = [
    { id: "GOV", name: "Kho bạc (mô phỏng)", sector: "Chính phủ", rating: "GOV", gov: true },
    { id: "MGE", name: "Mekong Grid Energy", sector: "Điện", rating: "AA", beta: 0.6 },
    { id: "CCB", name: "Coastal Commerce Bank", sector: "Ngân hàng", rating: "A", beta: 1.0 },
    { id: "PLG", name: "Pacific Logistics Group", sector: "Vận tải", rating: "BBB", beta: 0.9 },
    { id: "IBS", name: "Ironbay Steel", sector: "Thép", rating: "BBB", beta: 1.3 },
    { id: "SRR", name: "Silkroad Retail", sector: "Bán lẻ", rating: "BB", beta: 1.2 },
    { id: "LCL", name: "Lotus Crest Land", sector: "Bất động sản", rating: "B", beta: 1.8 }
  ];
  // The bonds (terms only; prices come from the market). Face value 100,000 ₫ per bond.
  const BONDS = [
    { id: "GOV-28", issuer: "GOV", name: "TPCP 3,4% 2028", coupon: 0.034, freq: 1, issue: "2023-11-15", maturity: "2028-11-15", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-30", issuer: "GOV", name: "TPCP 3,8% 2030", coupon: 0.038, freq: 1, issue: "2020-08-20", maturity: "2030-08-20", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-33", issuer: "GOV", name: "TPCP 4,1% 2033", coupon: 0.041, freq: 1, issue: "2023-03-10", maturity: "2033-03-10", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-36", issuer: "GOV", name: "TPCP 4,5% 2036", coupon: 0.045, freq: 1, issue: "2021-06-25", maturity: "2036-06-25", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-41", issuer: "GOV", name: "TPCP 4,7% 2041", coupon: 0.047, freq: 1, issue: "2021-09-30", maturity: "2041-09-30", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-46", issuer: "GOV", name: "TPCP 4,9% 2046", coupon: 0.049, freq: 1, issue: "2016-04-12", maturity: "2046-04-12", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "GOV-Z27", issuer: "GOV", name: "TPCP chiết khấu 2027", coupon: 0, freq: 1, issue: "2024-10-15", maturity: "2027-10-15", dayCount: "ACT/ACT", seniority: "senior", kind: "zero" },
    { id: "MGE-31", issuer: "MGE", name: "MGE 5,2% 2031", coupon: 0.052, freq: 2, issue: "2024-07-01", maturity: "2031-07-01", dayCount: "30/360", seniority: "senior" },
    { id: "CCB-29F", issuer: "CCB", name: "CCB thả nổi 2029 (tham chiếu + 1,8%)", coupon: 0, freq: 4, issue: "2024-03-20", maturity: "2029-03-20", dayCount: "ACT/365", seniority: "senior", frn: { margin: 0.018 } },
    { id: "CCB-33S", issuer: "CCB", name: "CCB thứ cấp 7,6% 2033", coupon: 0.076, freq: 1, issue: "2023-12-05", maturity: "2033-12-05", dayCount: "ACT/ACT", seniority: "sub" },
    { id: "PLG-32", issuer: "PLG", name: "PLG 6,6% 2032", coupon: 0.066, freq: 1, issue: "2022-05-18", maturity: "2032-05-18", dayCount: "ACT/ACT", seniority: "senior" },
    { id: "IBS-30", issuer: "IBS", name: "IBS 6,8% 2030 (bảo đảm)", coupon: 0.068, freq: 2, issue: "2023-09-12", maturity: "2030-09-12", dayCount: "30/360", seniority: "secured" },
    { id: "SRR-28", issuer: "SRR", name: "SRR 8,5% 2028", coupon: 0.085, freq: 2, issue: "2023-02-28", maturity: "2028-02-28", dayCount: "30/360", seniority: "senior" },
    { id: "LCL-29", issuer: "LCL", name: "LCL 11% 2029 (bảo đảm bằng dự án)", coupon: 0.11, freq: 4, issue: "2024-01-26", maturity: "2029-01-26", dayCount: "ACT/365", seniority: "secured" },
    { id: "LCL-27S", issuer: "LCL", name: "LCL thứ cấp 13% 2027", coupon: 0.13, freq: 4, issue: "2024-06-14", maturity: "2027-06-14", dayCount: "ACT/365", seniority: "sub" }
  ].map(b => ({ bdc: "following", face: FACE, ...b }));
  const bondById = id => BONDS.find(b => b.id === id);
  const issuerById = id => ISSUERS.find(x => x.id === id);

  // ---------- Random numbers (seeded; the state is saved with the market) ----------
  function rand(st) {
    st.rng = (st.rng + 0x6D2B79F5) >>> 0;
    let t = st.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss(st) { let u = 0, v = 0; while (!u) u = rand(st); while (!v) v = rand(st); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // ---------- Curve from the macro state ----------
  // Par yields from a Nelson–Siegel shape: the short end follows the policy rate, the long end
  // follows expected inflation, a real rate and a term premium that rises with government borrowing.
  function macroCurve(m, dev) {
    const tau = 3, long = 0.016 + (0.6 * m.inflation + 0.4 * 0.03) + 0.003 * m.supply;
    const short = m.policy + 0.002, S = short - long;
    return TENORS.map((T, i) => {
      const x = T / tau, l1 = (1 - Math.exp(-x)) / x, l2 = l1 - Math.exp(-x);
      return Math.max(0.001, long + S * l1 + (dev.c || 0) * l2 + (dev.n ? dev.n[i] : 0));
    });
  }
  function createSynthetic(o) {
    o = o || {};
    const st = { kind: "synthetic", v: 1, seed: (o.seed >>> 0) || 1, rng: (o.seed >>> 0) || 1, date: o.start || "2026-11-23", week: 0,
      macro: { policy: 0.035, inflation: 0.032, growth: 0.062, supply: 0.3, risk: 1, liquidity: 1, ...(o.macro || {}) },
      dev: { c: 0, n: [0, 0, 0, 0, 0] }, issuers: {}, news: [], script: o.script || [], label: o.label || "" };
    for (let i = 0; i < 9; i++) rand(st);
    for (const x of ISSUERS) if (!x.gov) st.issuers[x.id] = { rating: (o.ratings && o.ratings[x.id]) || x.rating, stress: (o.stress && o.stress[x.id]) || 0, defaulted: null };
    st.curve = { tenors: TENORS, par: macroCurve(st.macro, st.dev) };
    return st;
  }
  // Replay: the government curve week by week from an imported dataset; credit stays simulated
  function validateCurveDataset(raw) {
    if (!raw || raw.kind !== "bond-curve-dataset" || !Array.isArray(raw.points)) return { ok: false, problems: ["Không phải tệp đường cong lợi suất của Bond Empire"] };
    const t = raw.tenors || TENORS, problems = [];
    if (t.join() !== TENORS.join()) return { ok: false, problems: ["Kỳ hạn phải là 1, 3, 5, 10, 20 năm"] };
    const by = new Map();
    raw.points.forEach((p, i) => {
      const ok = p && /^\d{4}-\d{2}-\d{2}$/.test(p.d) && Array.isArray(p.y) && p.y.length === 5 && p.y.every(v => typeof v === "number" && isFinite(v) && v > -1 && v < 30);
      if (!ok) { problems.push(`Bỏ dòng lỗi ${i + 1}`); return; }
      by.set(p.d, p.y.map(v => v / 100));
    });
    const points = [...by.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([d, y]) => ({ d, y }));
    return { ok: points.length >= 8, problems: points.length >= 8 ? problems : problems.concat(["Cần ít nhất 8 tuần dữ liệu"]), points,
      meta: { id: String(raw.id || "curve"), title: String(raw.title || "Đường cong lợi suất"), source: String(raw.source || ""), license: String(raw.license || "") } };
  }
  function createReplay(ds, o) {
    o = o || {};
    const st = createSynthetic({ seed: o.seed, start: ds.points[0].d });
    st.kind = "replay"; st.dataset = ds.meta.id; st.cursor = 0; st.end = ds.points.length - 1;
    st.date = ds.points[0].d;
    st.curve = { tenors: TENORS, par: ds.points[0].y.slice() };
    st.macro.policy = st.curve.par[0] - 0.002;
    return st;
  }

  // ---------- Prices ----------
  function spreadOf(st, b) {
    const x = issuerById(b.issuer);
    if (x.gov) return 0;
    const s = st.issuers[b.issuer], r = RATING[s.rating];
    const liq = 0.004 * Math.max(0, 1 / Math.max(0.2, st.macro.liquidity) - 1) * (isIG(s.rating) ? 1 : 2);
    return r.s * st.macro.risk * (1 + Math.max(-0.5, s.stress)) + SENIORITY[b.seniority].add + liq;
  }
  function recoveryOf(st, b) {
    const x = st.issuers[b.issuer];
    return x && x.defaulted ? x.recovery[b.seniority] : null;
  }
  // Spot curve of today's par curve, cached outside the saved state
  const BOOT = new WeakMap();
  function bootOf(st) {
    const key = st.curve.par.join(), c = BOOT.get(st);
    if (c && c.key === key) return c.boot;
    const boot = E.bootstrap(st.curve);
    BOOT.set(st, { key, boot });
    return boot;
  }
  // Mid, bid and ask (clean, per 100), accrued interest, full price, yield and spreads of one bond today
  function quote(st, id) {
    const b = typeof id === "string" ? bondById(id) : id, date = st.date;
    if (!b || date >= b.maturity) return null;
    const boot = bootOf(st);
    const opt = { index: st.curve.par[0] };
    const x = issuerById(b.issuer), iss = st.issuers[b.issuer];
    if (iss && iss.defaulted) {
      const rr = iss.recovery[b.seniority], mid = rr * 100;
      return { bond: b, defaulted: true, mid, bid: Math.max(0, mid - 2), ask: mid + 2, ai: 0, full: mid, ytm: null, z: null, rating: "D", recovery: rr };
    }
    const z = spreadOf(st, b), p = E.priceOnCurve(b, date, boot, z, opt);
    if (!p) return null;
    const half = x.gov ? 0.05 : ({ AAA: 0.12, AA: 0.15, A: 0.18, BBB: 0.25, BB: 0.45, B: 0.8, CCC: 1.5 }[iss.rating] || 0.5) / Math.max(0.3, st.macro.liquidity);
    const y = E.ytm(b, date, p.full, opt);
    const T = E.daysBetween(date, b.maturity) / 365;
    return { bond: b, mid: p.clean, bid: p.clean - half, ask: p.clean + half, ai: p.ai, full: p.full, ytm: y, z, g: y != null ? y - E.parAt(st.curve, T) : null,
      rating: x.gov ? "GOV" : iss.rating, years: T, index: opt.index, cy: b.frn ? null : E.currentYield(b, p.clean, opt) };
  }
  function universe(st) { return BONDS.map(b => quote(st, b)).filter(Boolean); }

  // ---------- The weekly clock ----------
  const EVENTS = [
    { id: "infl", w: 3, text: "Lạm phát tháng vượt dự báo", apply: (st) => { st.macro.inflation += 0.004; } },
    { id: "disinfl", w: 2, text: "Lạm phát hạ nhiệt hơn kỳ vọng", apply: (st) => { st.macro.inflation -= 0.003; } },
    { id: "slow", w: 2, text: "Tăng trưởng quý chậm lại rõ rệt", apply: (st) => { st.macro.growth -= 0.008; st.macro.risk += 0.15; } },
    { id: "boom", w: 2, text: "Xuất khẩu và sản xuất tăng mạnh", apply: (st) => { st.macro.growth += 0.006; st.macro.risk -= 0.08; } },
    { id: "supply", w: 2, text: "Kế hoạch phát hành TPCP tăng mạnh để bù bội chi", apply: (st) => { st.macro.supply += 0.6; } },
    { id: "creditscare", w: 2, text: "Lo ngại nợ xấu: nhà đầu tư rút khỏi trái phiếu doanh nghiệp", apply: (st) => { st.macro.risk += 0.35; st.macro.liquidity -= 0.2; } },
    { id: "liq", w: 1, text: "Thanh khoản liên ngân hàng căng thẳng", apply: (st) => { st.macro.liquidity -= 0.3; st.dev.n[0] += 0.004; } },
    { id: "calm", w: 2, text: "Thị trường ổn định, khẩu vị rủi ro cải thiện", apply: (st) => { st.macro.risk -= 0.1; st.macro.liquidity += 0.1; } }
  ];
  function news(st, text, kind, extra) {
    st.news.push({ date: st.date, week: st.week, text, kind: kind || "macro", ...(extra || {}) });
    if (st.news.length > 80) st.news.shift();
  }
  function applyScripted(st, ev) {
    if (ev.macro) for (const [k, v] of Object.entries(ev.macro)) st.macro[k] += v;
    if (ev.curve) st.dev.n = st.dev.n.map((x, i) => x + (ev.curve[i] || 0));
    if (ev.stress) for (const [k, v] of Object.entries(ev.stress)) if (st.issuers[k]) st.issuers[k].stress += v;
    if (ev.default) defaultIssuer(st, ev.default);
    if (ev.text) news(st, ev.text, ev.kind || "event");
  }
  function defaultIssuer(st, id) {
    const s = st.issuers[id];
    if (!s || s.defaulted) return;
    const sectorAdj = id === "LCL" ? -0.1 : 0;
    s.defaulted = st.date;
    s.recovery = { secured: clamp(SENIORITY.secured.rr + sectorAdj, 0, 1), senior: clamp(SENIORITY.senior.rr + sectorAdj, 0, 1), sub: clamp(SENIORITY.sub.rr + sectorAdj / 2, 0, 1) };
    news(st, `${issuerById(id).name} vỡ nợ: không thanh toán đúng hạn nghĩa vụ trái phiếu`, "default", { issuer: id });
  }
  // One week. Returns the date before and after, so the portfolio can pay what fell due in between.
  function step(st, ds) {
    const from = st.date;
    st.week += 1;
    const m = st.macro;
    if (st.kind === "replay") {
      if (st.cursor >= st.end) return null;
      st.cursor += 1;
      const p = ds.points[st.cursor];
      st.date = p.d;
      st.curve = { tenors: TENORS, par: p.y.slice() };
      m.policy = st.curve.par[0] - 0.002;
    } else {
      st.date = E.addDays(st.date, 7);
      // mean reversion with shocks
      m.inflation += 0.04 * (0.033 - m.inflation) + 0.0007 * gauss(st);
      m.growth += 0.04 * (0.062 - m.growth) + 0.0012 * gauss(st);
      m.supply += 0.05 * (0.3 - m.supply) + 0.03 * gauss(st);
      // central bank: every six weeks, toward a Taylor-type rule, in 25 bp steps
      if (st.week % 6 === 0) {
        const target = 0.025 + 1.3 * (m.inflation - 0.03) + 0.5 * (m.growth - 0.062);
        const gap = target - m.policy, move = Math.abs(gap) < 0.00125 ? 0 : Math.sign(gap) * Math.min(0.005, Math.round(Math.abs(gap) / 0.0025) * 0.0025);
        if (move) { m.policy = Math.max(0.005, m.policy + move); news(st, `Ngân hàng trung ương ${move > 0 ? "tăng" : "giảm"} lãi suất điều hành ${Math.round(Math.abs(move) * 10000)} điểm cơ bản, còn ${(m.policy * 100).toFixed(2)}%`, "policy"); }
        else news(st, `Ngân hàng trung ương giữ lãi suất điều hành ở ${(m.policy * 100).toFixed(2)}%`, "policy");
      }
      st.dev.c = 0.9 * st.dev.c + 0.0006 * gauss(st);
      st.dev.n = st.dev.n.map(x => 0.85 * x + 0.0004 * gauss(st));
    }
    m.risk = clamp(m.risk + 0.06 * (1 - m.risk) + 0.04 * gauss(st), 0.6, 3.5);
    m.liquidity = clamp(m.liquidity + 0.08 * (1 - m.liquidity) + 0.03 * gauss(st), 0.2, 1.3);
    // scripted events (scenarios) first, then random ones
    for (const ev of st.script.filter(e => e.week === st.week)) applyScripted(st, ev);
    if (!st.script.length && st.kind !== "replay" && rand(st) < 0.12) {
      const tot = EVENTS.reduce((n, e) => n + e.w, 0);
      let r = rand(st) * tot, pick = EVENTS[0];
      for (const e of EVENTS) { r -= e.w; if (r <= 0) { pick = e; break; } }
      pick.apply(st); news(st, pick.text, "macro");
    }
    // issuers: stress, rating migration, default (hazard per week)
    for (const x of ISSUERS) {
      if (x.gov) continue;
      const s = st.issuers[x.id];
      if (s.defaulted) continue;
      s.stress = 0.97 * s.stress + 0.04 * gauss(st) + 0.015 * x.beta * (m.risk - 1) - 0.01 * x.beta * (m.growth - 0.062) * 10;
      const i = RATINGS.indexOf(s.rating);
      if (s.stress > 0.9 && i < RATINGS.length - 1) { s.rating = RATINGS[i + 1]; s.stress -= 0.6; news(st, `Hạ hạng tín nhiệm ${x.name} xuống ${s.rating}`, "rating", { issuer: x.id }); }
      else if (s.stress < -0.7 && i > 0) { s.rating = RATINGS[i - 1]; s.stress += 0.5; news(st, `Nâng hạng tín nhiệm ${x.name} lên ${s.rating}`, "rating", { issuer: x.id }); }
      const hazard = RATING[s.rating].pd * m.risk * Math.exp(1.5 * Math.max(0, s.stress)) / 52;
      if (!st.script.length && rand(st) < hazard) defaultIssuer(st, x.id);
    }
    if (st.kind !== "replay") st.curve = { tenors: TENORS, par: macroCurve(m, st.dev) };
    return { from, to: st.date };
  }
  const replayDone = st => st.kind === "replay" && st.cursor >= st.end;

  return { TENORS, FACE, RATINGS, RATING, isIG, SENIORITY, ISSUERS, BONDS, bondById, issuerById, rand, gauss,
    createSynthetic, createReplay, validateCurveDataset, macroCurve, spreadOf, recoveryOf, quote, universe, step, replayDone, defaultIssuer, news, bootOf };
});

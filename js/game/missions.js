// ============================================================
// js/game/missions.js — mission rules of "Financial Empire: Beyond the Numbers"
//
// A mission = one dataset × one archetype. Each archetype has four hypotheses;
// each hypothesis lists the evidence cards that bear on it, and every card has a
// data test written as a plain rule with thresholds ("DSO up 15% or more over
// the period → supports"). The rules give the reference analyst view; the
// player's own links between cards and hypotheses give the player's view; the
// score compares the two and checks the player's discipline and sourcing.
// No number is invented here: every test reads the engine's results, and a
// test whose inputs are missing returns "na" with the reason.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./engine.js"));
  else root.FWMissions = factory(root.FWEngine);
})(typeof self !== "undefined" ? self : this, function (E) {
  "use strict";

  const RULES_VERSION = "1.0.0";
  const isNum = v => typeof v === "number" && isFinite(v);

  // ---------- Vocabulary ----------
  const DECISIONS = {
    INVEST: { en: "INVEST", vi: "Đầu tư", pol: 1 },
    HOLD: { en: "HOLD", vi: "Nắm giữ, theo dõi thêm", pol: 0 },
    AVOID: { en: "AVOID", vi: "Tránh", pol: -1 },
    REQUEST: { en: "REQUEST MORE EVIDENCE", vi: "Yêu cầu thêm bằng chứng", pol: 0 }
  };
  const DECISION_IDS = ["INVEST", "HOLD", "AVOID", "REQUEST"];
  // points out of 5 for the player's decision (columns) given the reference decision (rows)
  const REC_POINTS = {
    INVEST: { INVEST: 5, HOLD: 2, REQUEST: 2, AVOID: 0 },
    HOLD: { HOLD: 5, AVOID: 3, REQUEST: 3, INVEST: 2 },
    AVOID: { AVOID: 5, REQUEST: 3, HOLD: 2, INVEST: 0 },
    REQUEST: { REQUEST: 5, HOLD: 3, AVOID: 2, INVEST: 1 }
  };
  const CONFIDENCE = { high: "Cao", medium: "Trung bình", low: "Thấp" };
  const CONF_ORDER = ["low", "medium", "high"];
  const RELATIONS = {
    supports: { en: "Supports", vi: "Ủng hộ" },
    contradicts: { en: "Contradicts", vi: "Mâu thuẫn" },
    explains: { en: "Explains", vi: "Giải thích bối cảnh" },
    needs: { en: "Requires more evidence", vi: "Cần thêm bằng chứng" }
  };
  const STATUS = {
    SUPPORTED: { en: "SUPPORTED", vi: "Được ủng hộ" },
    PLAUSIBLE: { en: "PLAUSIBLE", vi: "Có thể đúng" },
    CONTRADICTED: { en: "CONTRADICTED", vi: "Bị bác bỏ" },
    UNTESTED: { en: "NOT ENOUGH EVIDENCE", vi: "Chưa đủ bằng chứng" }
  };
  // career at Aurora Capital (GDD §25): one level per 20 Reputation, ranks at levels 1, 5, 10, 15, 20, 30, 40, 50
  const XP_PER_LEVEL = 20, MAX_LEVEL = 50;
  const RANKS = [
    { level: 1, name: "Junior Analyst", unlock: "Báo cáo tài chính cơ bản" },
    { level: 5, name: "Financial Analyst", unlock: "Bảng chỉ số" },
    { level: 10, name: "Senior Analyst", unlock: "Điều tra dòng tiền" },
    { level: 15, name: "Research Associate", unlock: "So sánh doanh nghiệp cùng ngành" },
    { level: 20, name: "Head of Research", unlock: "Vụ án rủi ro nâng cao" },
    { level: 30, name: "Portfolio Manager", unlock: "Thử thách danh mục" },
    { level: 40, name: "Investment Director", unlock: "M&A và định giá" },
    { level: 50, name: "Fund Founder", unlock: "Kịch bản cuối" }
  ].map(r => ({ ...r, xp: (r.level - 1) * XP_PER_LEVEL }));

  // ---------- Number formatting (Vietnamese: 1.234,5) ----------
  const NF = {};
  const nf = d => NF[d] || (NF[d] = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const num = (v, d = 1) => nf(d).format(v).replace("-", "−");
  const bn = v => num(v / 1e9, Math.abs(v) >= 1e12 ? 0 : 1);          // tỷ đồng
  function fmt(v, unit) {
    if (!isNum(v)) return "—";
    switch (unit) {
      case "pct": return `${num(v * 100, 1)}%`;
      case "pp": return `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v * 100), 1)} điểm %`;
      case "x": return `${num(v, 2)} lần`;
      case "days": return `${num(v, 1)} ngày`;
      case "vnd": return `${bn(v)} tỷ`;
      default: return num(v, 2);
    }
  }
  const sp = v => `${v >= 0 ? "+" : "−"}${num(Math.abs(v * 100), 0)}%`;     // signed percentage change
  const mv = (t, unit) => `${fmt(t.first, unit)} (${t.firstYear}) → ${fmt(t.last, unit)} (${t.lastYear})`;

  // ---------- Data tests ----------
  // A test returns { t: "for" | "against" | "neutral" | "na", s: strength 1–3 (for/against only), why }
  const R = (t, s, why) => ({ t, s: t === "for" || t === "against" ? s : 0, why });
  const NA = why => R("na", 0, why);
  const flip = o => o.t === "for" ? R("against", o.s, o.why) : o.t === "against" ? R("for", o.s, o.why) : o;
  const lvl = (x, b, c) => x >= c ? 3 : x >= b ? 2 : 1;                     // strength by size, x already past the first threshold
  const noTrend = name => `Không đủ số liệu để tính xu hướng ${name}`;

  // context for the tests: engine results plus small helpers
  function prepare(ds) {
    const val = E.validate(ds), man = E.manifest(ds, val), res = E.computeMetrics(ds);
    const c = { ds, val, man, res, firstYear: ds.years[0], lastYear: ds.years[ds.years.length - 1] };
    c.T = id => { const t = E.trend(res, id); return t && t.n >= 2 ? t : null; };
    c.IT = item => E.itemTrend(ds, item);
    c.v = (item, y) => E.itemValue(ds, item, y);
    c.metricAt = (id, y) => { const r = res.results[id] && res.results[id].byYear[y]; return r && isNum(r.v) ? r.v : null; };
    // sums of two items over the years where both are reported
    c.pair = (a, b) => {
      const ys = ds.years.filter(y => isNum(c.v(a, y)) && isNum(c.v(b, y)));
      return { years: ys, a: ys.reduce((s, y) => s + c.v(a, y), 0), b: ys.reduce((s, y) => s + c.v(b, y), 0), per: ys.map(y => ({ y, a: c.v(a, y), b: c.v(b, y) })) };
    };
    c.check = id => c.val.checks.find(x => x.id === id);
    return c;
  }

  const TESTS = {
    // ---- working capital ----
    dsoUp: c => {
      const t = c.T("dso"); if (!t) return NA(noTrend("DSO"));
      const why = `DSO ${mv(t, "days")}, ${sp(t.rel)}`;
      if (t.rel >= 0.15) return R("for", lvl(t.rel, 0.25, 0.4), why);
      if (t.rel <= -0.10) return R("against", 2, why);
      return Math.abs(t.rel) <= 0.05 ? R("against", 1, `${why}: ổn định`) : R("neutral", 0, why);
    },
    arGap: c => {
      const t = c.T("ar_rev_gap"); if (!t) return NA(noTrend("phải thu so với doanh thu"));
      const why = `Phải thu tăng nhanh hơn doanh thu bình quân ${fmt(t.avg, "pp")} mỗi năm (${t.firstYear}–${t.lastYear})`;
      if (t.avg >= 0.10) return R("for", lvl(t.avg, 0.2, 0.3), why);
      if (t.avg <= -0.05) return R("against", 2, why);
      return Math.abs(t.avg) <= 0.03 ? R("against", 1, `${why}: gần như cùng tốc độ`) : R("neutral", 0, why);
    },
    arVsRev: c => {
      const a = c.IT("ar"), r = c.IT("rev");
      if (!a || !r || a.cagr === null || r.cagr === null) return NA("Không tính được tốc độ tăng bình quân của phải thu hoặc doanh thu");
      const gap = a.cagr - r.cagr;
      const why = `Phải thu khách hàng ${fmt(a.first, "vnd")} → ${fmt(a.last, "vnd")} (CAGR ${sp(a.cagr)}) so với doanh thu CAGR ${sp(r.cagr)}, ${a.firstYear}–${a.lastYear}`;
      return gap >= 0.10 ? R("for", lvl(gap, 0.15, 0.25), why) : gap <= -0.03 ? R("against", 2, why) : R("neutral", 0, why);
    },
    cccUp: c => {
      const t = c.T("ccc"); if (!t) return NA(noTrend("chu kỳ tiền mặt"));
      const why = `Chu kỳ tiền mặt ${mv(t, "days")}, ${sp(t.rel)} (DPO là số ước tính)`;
      if (t.rel >= 0.15) return R("for", lvl(t.rel, 0.25, 0.4), why);
      if (t.rel <= -0.10) return R("against", 2, why);
      return Math.abs(t.rel) <= 0.05 ? R("against", 1, `${why}: ổn định`) : R("neutral", 0, why);
    },
    invGap: c => {
      const t = c.T("inv_cogs_gap"); if (!t) return NA(noTrend("tồn kho so với giá vốn"));
      const why = `Tồn kho tăng nhanh hơn giá vốn bình quân ${fmt(t.avg, "pp")} mỗi năm`;
      return t.avg >= 0.10 ? R("for", lvl(t.avg, 0.2, 0.3), why) : t.avg <= -0.05 ? R("against", 1, why) : R("neutral", 0, why);
    },
    // ---- cash conversion ----
    cfoNi: c => {
      const p = c.pair("cfo", "ni");
      if (p.years.length < 2) return NA("Không đủ năm có cả CFO và LNST");
      if (!(p.b > 0)) return NA("LNST cộng dồn không dương: CFO/LNST không có ý nghĩa");
      const cum = p.a / p.b, last = c.metricAt("cfo_ni", c.lastYear);
      const why = `CFO/LNST cộng dồn ${p.years[0]}–${p.years[p.years.length - 1]}: ${fmt(cum, "x")}${isNum(last) ? `; năm ${c.lastYear}: ${fmt(last, "x")}` : ""}`;
      const worst = Math.min(cum, isNum(last) ? last : cum);
      if (worst < 0.8) return R("for", worst < 0.5 ? 3 : worst < 0.65 ? 2 : 1, why);
      if (cum >= 1.0 && (!isNum(last) || last >= 0.9)) return R("against", cum >= 1.2 ? 3 : 2, why);
      return R("neutral", 0, why);
    },
    accr: c => {
      const t = c.T("accr"); if (!t) return NA(noTrend("tỷ lệ dồn tích"));
      const why = `Dồn tích (LNST − CFO) năm ${t.lastYear}: ${fmt(t.last, "pct")} tổng tài sản bình quân; trung bình giai đoạn ${fmt(t.avg, "pct")}`;
      return t.last >= 0.05 ? R("for", t.last >= 0.10 ? 3 : 2, why) : t.last <= 0 ? R("against", 2, why) : R("neutral", 0, why);
    },
    fcfNeg: c => {
      const p = c.pair("cfo", "capex");
      if (p.years.length < 2) return NA("Không đủ năm có cả CFO và tiền chi mua sắm TSCĐ");
      const total = p.a + p.b, neg = p.per.filter(x => x.a + x.b < 0).length, n = p.years.length;
      const why = `FCF (CFO + chi mua sắm TSCĐ) cộng dồn ${p.years[0]}–${p.years[n - 1]}: ${fmt(total, "vnd")}; ${neg}/${n} năm âm`;
      if (total < 0) return R("for", neg === n ? 3 : 2, why);
      if (neg > n / 2) return R("for", 1, `${why}: phần lớn các năm âm`);
      if (total > 0) return R("against", neg === 0 ? 3 : 2, why);
      return R("neutral", 0, why);
    },
    cfoRev: c => {
      const t = c.T("cfo_rev"); if (!t) return NA(noTrend("CFO/doanh thu"));
      const why = `CFO/Doanh thu ${mv(t, "pct")}`;
      if (t.last < 0) return R("for", 3, why);
      if (t.abs <= -0.02 || (t.last < 0.03 && t.rel <= -0.3)) return R("for", 2, why);
      if (t.last >= 0.08 && t.abs > -0.01) return R("against", 2, why);
      return R("neutral", 0, why);
    },
    cfoVsNi: c => {
      const a = c.IT("cfo"), n = c.IT("ni");
      if (!a || !n) return NA("Không đủ số liệu CFO hoặc LNST");
      const span = `${a.firstYear}–${a.lastYear}`;
      if (a.last <= 0) return R("for", 3, `CFO năm ${a.lastYear} là ${fmt(a.last, "vnd")} trong khi LNST là ${fmt(n.last, "vnd")}`);
      if (!(a.first > 0) || !(n.first > 0)) return R("neutral", 0, `CFO hoặc LNST năm ${a.firstYear} không dương: không so được tốc độ tăng`);
      const gc = a.last / a.first - 1, gn = n.last / n.first - 1;
      const why = `CFO ${fmt(a.first, "vnd")} → ${fmt(a.last, "vnd")} (${sp(gc)}) trong khi LNST ${sp(gn)}, ${span}`;
      return gc < gn - 0.3 ? R("for", 2, why) : gc >= gn ? R("against", 2, why) : R("neutral", 0, why);
    },
    // ---- borrowing ----
    stdUp: c => {
      const it = c.IT("std"); if (!it) return NA("Không có số liệu vay ngắn hạn");
      const span = `${it.firstYear}–${it.lastYear}`;
      if (it.first === 0 && it.last === 0) return R("against", 2, `Không có vay ngắn hạn trong ${span}`);
      if (it.first <= 0) return R("for", 2, `Vay ngắn hạn từ ${fmt(it.first, "vnd")} lên ${fmt(it.last, "vnd")} (${span})`);
      if (it.last <= 0 || it.cagr === null) return R("against", 2, `Vay ngắn hạn giảm về ${fmt(it.last, "vnd")} (${span})`);
      const why = `Vay ngắn hạn ${fmt(it.first, "vnd")} → ${fmt(it.last, "vnd")} (${span}), CAGR ${sp(it.cagr)}`;
      return it.cagr >= 0.20 ? R("for", it.cagr >= 0.40 ? 3 : 2, why) : it.cagr <= 0 ? R("against", 2, why) : R("neutral", 0, why);
    },
    debtGrowth: c => {
      const t = c.T("debt_g"); if (!t) return NA(noTrend("nợ vay"));
      const why = `Tổng nợ vay tăng bình quân ${sp(t.avg)} mỗi năm (${t.firstYear}–${t.lastYear})`;
      return t.avg >= 0.15 ? R("for", t.avg >= 0.30 ? 3 : 2, why) : t.avg <= 0 ? R("against", 2, why) : R("neutral", 0, why);
    },
    stShare: c => {
      const t = c.T("st_share"); if (!t) return NA(noTrend("tỷ trọng vay ngắn hạn"));
      const why = `Tỷ trọng vay ngắn hạn trong tổng nợ vay ${mv(t, "pct")}`;
      if (t.last >= 0.6 && t.abs >= 0.05) return R("for", t.last >= 0.75 ? 3 : 2, why);
      if (t.last >= 0.6 && t.abs > -0.05) return R("for", 1, why);
      if (t.last <= 0.4) return R("against", 2, why);
      if (t.abs <= -0.10) return R("against", 1, why);
      return R("neutral", 0, why);
    },
    netDebt: c => {
      const nd = y => {
        const s = c.v("std", y), l = c.v("ltd", y), cash = c.v("cash", y);
        if ((s === null && l === null) || cash === null) return null;
        return (s || 0) + (l || 0) - cash - (c.v("st_inv", y) || 0);
      };
      const a = nd(c.firstYear), b = nd(c.lastYear);
      if (a === null || b === null) return NA("Không đủ số liệu nợ vay hoặc tiền");
      const why = `Nợ vay ròng (vay − tiền − đầu tư tài chính ngắn hạn) ${fmt(a, "vnd")} (${c.firstYear}) → ${fmt(b, "vnd")} (${c.lastYear})`;
      if (b <= 0) return R("against", 2, `${why}: tiền và đầu tư ngắn hạn lớn hơn nợ vay`);
      if (b > a) return R("for", b >= 2 * Math.max(a, 0) + 1 ? 2 : 1, why);
      return R("neutral", 0, why);
    },
    deUp: c => {
      const t = c.T("de"); if (!t) return NA(noTrend("nợ vay/VCSH"));
      const why = `Nợ vay/VCSH ${mv(t, "x")}, ${sp(t.rel)}`;
      if (t.last >= 1.5) return R("for", 3, why);
      if (t.rel >= 0.15) return R("for", 2, why);
      if (t.rel >= 0.10) return R("for", 1, why);
      if (t.rel <= -0.10) return R("against", 2, why);
      return R("neutral", 0, why);
    },
    daUp: c => {
      const t = c.T("d_a"); if (!t) return NA(noTrend("nợ vay/tổng tài sản"));
      const why = `Nợ vay/Tổng tài sản ${mv(t, "pct")}, ${sp(t.rel)}`;
      return t.rel >= 0.15 ? R("for", 2, why) : t.rel >= 0.10 ? R("for", 1, why) : t.rel <= -0.10 ? R("against", 2, why) : R("neutral", 0, why);
    },
    emUp: c => {
      const t = c.T("em"); if (!t) return NA(noTrend("hệ số nhân vốn chủ"));
      const why = `Hệ số nhân vốn chủ ${mv(t, "x")}`;
      return t.rel >= 0.10 ? R("for", 1, why) : t.rel <= -0.10 ? R("against", 1, why) : R("neutral", 0, why);
    },
    // ---- liquidity ----
    curWeak: c => {
      const t = c.T("cur"); if (!t) return NA(noTrend("hệ số thanh toán hiện hành"));
      const why = `Hệ số thanh toán hiện hành ${mv(t, "x")}`;
      if (t.last < 1) return R("for", 3, why);
      if (t.rel <= -0.10) return R("for", 2, why);
      if (t.rel >= 0.05 && t.last >= 1.2) return R("against", 2, why);
      if (t.last >= 1.5 && t.rel > -0.05) return R("against", 1, why);
      return R("neutral", 0, why);
    },
    quickWeak: c => {
      const t = c.T("quick"); if (!t) return NA(noTrend("hệ số thanh toán nhanh"));
      const why = `Hệ số thanh toán nhanh ${mv(t, "x")}`;
      if (t.last < 0.7) return R("for", 3, why);
      if (t.rel <= -0.10) return R("for", 2, why);
      if (t.rel >= 0.05 && t.last >= 1) return R("against", 2, why);
      if (t.last >= 1 && t.rel > -0.05) return R("against", 1, why);
      return R("neutral", 0, why);
    },
    cashDown: c => {
      const t = c.T("cash_r"); if (!t) return NA(noTrend("hệ số tiền mặt"));
      const why = `Hệ số tiền mặt ${mv(t, "x")}, ${sp(t.rel)}`;
      if (t.last < 0.1) return R("for", 3, why);
      if (t.rel <= -0.2) return R("for", t.rel <= -0.4 ? 3 : 2, why);
      if (t.rel >= 0.1) return R("against", 2, why);
      return R("neutral", 0, why);
    },
    cashVsStd: c => {
      const y = c.lastYear, cash = c.v("cash", y), std = c.v("std", y);
      if (cash === null || std === null) return NA(`Thiếu tiền hoặc vay ngắn hạn năm ${y}`);
      const liquid = cash + (c.v("st_inv", y) || 0);
      if (std === 0) return R("against", 2, `Năm ${y} không có vay ngắn hạn`);
      const r = liquid / std;
      const why = `Năm ${y}: tiền và đầu tư tài chính ngắn hạn ${fmt(liquid, "vnd")} bằng ${fmt(r, "x")} vay ngắn hạn ${fmt(std, "vnd")}`;
      return r < 0.5 ? R("for", 3, why) : r < 1 ? R("for", 2, why) : r >= 1.5 ? R("against", 2, why) : R("neutral", 0, why);
    },
    ltdShift: c => {
      const l = c.IT("ltd"), s = c.IT("std");
      if (!l) return NA("Không có số liệu vay dài hạn");
      const why = `Vay dài hạn ${fmt(l.first, "vnd")} → ${fmt(l.last, "vnd")}${s ? `; vay ngắn hạn ${fmt(s.first, "vnd")} → ${fmt(s.last, "vnd")}` : ""} (${l.firstYear}–${l.lastYear})`;
      if (l.rel <= -0.10 && s && s.rel >= 0.20) return R("for", 1, `${why}: nợ chuyển dần sang ngắn hạn`);
      if (l.rel > 0.10 && (!s || l.rel >= s.rel)) return R("against", 1, `${why}: kỳ hạn nợ được kéo dài`);
      return R("neutral", 0, why);
    },
    // ---- interest coverage ----
    intCov: c => {
      const t = c.T("int_cov"); if (!t) return NA("Không có chi phí lãi vay hoặc không đủ năm để tính");
      const why = `Khả năng trả lãi (EBIT/lãi vay) ${mv(t, "x")}`;
      if (t.last < 2) return R("for", 3, why);
      if (t.last < 3) return R("for", 2, why);
      if (t.rel <= -0.3) return R("for", 2, why);
      if (t.last >= 6) return R("against", t.last >= 8 ? 3 : 2, why);
      if (t.last >= 4) return R("against", 1, why);
      return R("neutral", 0, why);
    },
    intVsPbt: c => {
      const i = c.IT("int_exp"), p = c.IT("pbt");
      if (!i || !p) return NA("Không đủ số liệu chi phí lãi vay hoặc LNTT");
      if (p.last <= 0) return R("for", 3, `LNTT năm ${p.lastYear} không dương (${fmt(p.last, "vnd")})`);
      if (!(i.first > 0) || !(p.first > 0)) return R("neutral", 0, "Năm đầu không có lãi vay hoặc LNTT không dương: không so được tốc độ tăng");
      const gi = i.last / i.first - 1, gp = p.last / p.first - 1;
      const why = `Chi phí lãi vay ${fmt(i.first, "vnd")} → ${fmt(i.last, "vnd")} (${sp(gi)}) so với LNTT ${sp(gp)}, ${i.firstYear}–${i.lastYear}`;
      return gi >= gp + 0.3 ? R("for", 2, why) : gi <= gp ? R("against", 1, why) : R("neutral", 0, why);
    },
    opTrend: c => {
      const o = c.IT("op"); if (!o) return NA("Không có lợi nhuận thuần từ hoạt động kinh doanh");
      const why = `Lợi nhuận thuần từ HĐKD ${fmt(o.first, "vnd")} → ${fmt(o.last, "vnd")} (${o.firstYear}–${o.lastYear})`;
      if (o.last <= 0) return R("for", 3, why);
      if (o.first > 0 && o.last / o.first - 1 <= -0.2) return R("for", 2, why);
      if (o.cagr !== null && o.cagr >= 0.05) return R("against", 1, why);
      return R("neutral", 0, why);
    },
    // ---- growth and profitability ----
    revGrowth: c => {
      const t = c.T("rev_g"); if (!t) return NA(noTrend("doanh thu"));
      const why = `Doanh thu thuần tăng bình quân ${sp(t.avg)} mỗi năm (${t.firstYear}–${t.lastYear})`;
      return t.avg >= 0.08 ? R("for", t.avg >= 0.15 ? 2 : 1, why) : t.avg <= 0 ? R("against", 2, why) : R("neutral", 0, why);
    },
    gmStable: c => {
      const t = c.T("gm"); if (!t) return NA(noTrend("biên lợi nhuận gộp"));
      const why = `Biên lợi nhuận gộp ${mv(t, "pct")}`;
      return t.abs >= 0.02 ? R("for", 2, why) : t.abs >= -0.005 ? R("for", 1, why) : t.abs <= -0.02 ? R("against", 2, why) : R("neutral", 0, why);
    },
    niUp: c => {
      const n = c.IT("ni"); if (!n) return NA("Không đủ số liệu LNST");
      const why = `LNST ${fmt(n.first, "vnd")} → ${fmt(n.last, "vnd")} (${n.firstYear}–${n.lastYear})${n.cagr !== null ? `, CAGR ${sp(n.cagr)}` : ""}`;
      if (n.last <= 0) return R("against", 3, why);
      if (n.cagr === null) return R("neutral", 0, why);
      return n.cagr >= 0.10 ? R("for", 2, why) : n.cagr <= 0 ? R("against", 2, why) : R("neutral", 0, why);
    },
    // context only: relevant to the hypothesis, never decisive
    context: (id, text) => c => { const t = c.T(id); return t ? R("neutral", 0, `${text}: ${mv(t, E.METRIC[id].unit)}`) : NA(noTrend(E.METRIC[id].vi)); }
  };

  // ---------- Archetypes ----------
  const ARCHETYPES = {
    EQ: {
      id: "EQ", code: "EQ-01", title: "The Earnings Quality Case", vi: "Vụ án chất lượng lợi nhuận", requires: null,
      question: "Lợi nhuận có được dòng tiền và vốn lưu động xác nhận không, và quỹ nên làm gì?",
      memo: c => {
        const r = c.IT("rev"), n = c.IT("ni");
        const grow = r && n && r.cagr !== null && n.cagr !== null ? ` Doanh thu thuần thay đổi bình quân ${sp(r.cagr)} mỗi năm, LNST ${sp(n.cagr)} mỗi năm.` : "";
        return `${c.ds.company.name} công bố kết quả kinh doanh ${c.firstYear}–${c.lastYear}.${grow} Trước khi quỹ giải ngân, Investment Committee cần biết lợi nhuận này có chất lượng hay không: tiền có thật sự về, vốn lưu động có phình ra, và doanh nghiệp có phải vay để bù hay không.`;
      },
      los: ["frq", "fat", "cf2"],
      workpapers: ["dso", "cfo_ni", "ar_g", "accr", "gm", "rev_g"],
      hyps: [
        { id: "H1", tag: "Working capital", pol: -1, title: "Doanh thu tăng nhờ bán chịu: phải thu và vốn lưu động phình nhanh hơn doanh thu",
          hint: "So tốc độ tăng của phải thu với doanh thu; xem số ngày thu tiền và chu kỳ tiền mặt.",
          refs: [["m:dso", TESTS.dsoUp], ["m:ar_rev_gap", TESTS.arGap], ["i:ar", TESTS.arVsRev], ["m:ccc", TESTS.cccUp], ["m:inv_cogs_gap", TESTS.invGap],
            ["m:rev_g", TESTS.context("rev_g", "Bối cảnh: doanh thu tăng thì phải thu tăng theo, cần so tốc độ")]] },
        { id: "H2", tag: "Cash conversion", pol: -1, title: "Lợi nhuận chưa chuyển thành tiền: dòng tiền kinh doanh thấp hơn nhiều so với LNST",
          hint: "Đặt CFO cạnh LNST qua nhiều năm; xem tỷ lệ dồn tích và dòng tiền tự do.",
          refs: [["m:cfo_ni", TESTS.cfoNi], ["m:accr", TESTS.accr], ["m:cfo_rev", TESTS.cfoRev], ["i:cfo", TESTS.cfoVsNi], ["m:fcf", TESTS.fcfNeg],
            ["m:ni_g", TESTS.context("ni_g", "Bối cảnh: tốc độ tăng LNST")]] },
        { id: "H3", tag: "Funding", pol: -1, title: "Phần tiền thiếu hụt đang được bù bằng vay, chủ yếu là vay ngắn hạn",
          hint: "Xem dòng tiền tự do, vay ngắn hạn, tốc độ tăng nợ vay và nợ vay ròng.",
          refs: [["i:std", TESTS.stdUp], ["m:debt_g", TESTS.debtGrowth], ["m:st_share", TESTS.stShare], ["m:fcf", TESTS.fcfNeg], ["m:debt", TESTS.netDebt]] },
        { id: "H4", tag: "Quality", pol: 1, title: "Tăng trưởng lợi nhuận bền vững: doanh thu, biên lợi nhuận và dòng tiền cùng xác nhận",
          hint: "Một kết luận tích cực cũng cần bằng chứng: tăng trưởng, biên lợi nhuận, và tiền có về theo lợi nhuận không.",
          refs: [["m:rev_g", TESTS.revGrowth], ["m:gm", TESTS.gmStable], ["i:ni", TESTS.niUp], ["m:cfo_ni", c => flip(TESTS.cfoNi(c))], ["m:dso", c => flip(TESTS.dsoUp(c))], ["m:fcf", c => flip(TESTS.fcfNeg(c))]] }
      ]
    },
    LIQ: {
      id: "LIQ", code: "LIQ-01", title: "The Liquidity Clock", vi: "Đồng hồ thanh khoản", requires: "EQ",
      question: "Rủi ro thanh khoản trong 12 tháng tới ở mức nào, và quỹ nên làm gì?",
      memo: c => `Daniel Ross, Chief Risk Officer của Aurora Capital, cần đánh giá ${c.ds.company.name} trước kỳ đáo hạn nợ: doanh nghiệp có đủ tiền cho nghĩa vụ ngắn hạn không, nợ vay đang tăng ở đâu, và lợi nhuận có đủ trả lãi không. Dữ liệu: ${c.firstYear}–${c.lastYear}.`,
      los: ["fat", "bal", "cf2"],
      workpapers: ["cur", "de", "int_cov", "quick", "cash_r", "d_a"],
      hyps: [
        { id: "L1", tag: "Liquidity", pol: -1, title: "Thanh khoản ngắn hạn đang suy yếu",
          hint: "Đừng dừng ở hệ số thanh toán hiện hành: tài sản ngắn hạn gồm những gì, tiền mặt chiếm bao nhiêu?",
          refs: [["m:cur", TESTS.curWeak], ["m:quick", TESTS.quickWeak], ["m:cash_r", TESTS.cashDown], ["m:ccc", TESTS.cccUp]] },
        { id: "L2", tag: "Leverage", pol: -1, title: "Đòn bẩy tài chính đang tăng nhanh",
          hint: "So nợ vay với vốn chủ và tổng tài sản; xem cả số tuyệt đối lẫn tỷ lệ.",
          refs: [["m:de", TESTS.deUp], ["m:d_a", TESTS.daUp], ["m:debt_g", TESTS.debtGrowth], ["m:em", TESTS.emUp], ["m:debt", TESTS.netDebt]] },
        { id: "L3", tag: "Coverage", pol: -1, title: "Lợi nhuận không đủ an toàn để trả lãi vay",
          hint: "EBIT gấp bao nhiêu lần lãi vay? Lãi vay tăng nhanh hơn lợi nhuận không? Tiền trả lãi đến từ đâu?",
          refs: [["m:int_cov", TESTS.intCov], ["i:int_exp", TESTS.intVsPbt], ["m:fcf", TESTS.fcfNeg], ["i:op", TESTS.opTrend]] },
        { id: "L4", tag: "Maturity", pol: -1, title: "Nợ vay dồn về ngắn hạn trong khi tiền mặt mỏng (rủi ro đáo hạn)",
          hint: "Bao nhiêu phần nợ vay đến hạn trong 12 tháng? Tiền và đầu tư ngắn hạn có đủ trả không?",
          refs: [["m:st_share", TESTS.stShare], ["i:std", TESTS.stdUp], ["i:ltd", TESTS.ltdShift], ["i:cash", TESTS.cashVsStd]] }
      ]
    }
  };
  const ARCHETYPE_IDS = ["EQ", "LIQ"];

  // ---------- Evidence cards ----------
  function cardInfo(c, id) {
    const [kind, key] = String(id).split(":");
    if (kind === "m" && E.METRIC[key]) {
      const m = E.METRIC[key], r = c.res.results[key];
      return { id, kind, key, title: m.vi, unit: m.unit, group: E.GROUPS[m.group], los: m.los, formula: m.formula, proxy: !!m.proxy, label: "CALCULATED",
        points: c.res.years.map(y => ({ year: y, v: r.byYear[y].v, reason: r.byYear[y].reason || "" })) };
    }
    if (kind === "i" && E.ITEMS[key]) {
      const it = E.ITEMS[key];
      return { id, kind, key, title: it.vi, en: it.en, unit: "vnd", sec: it.sec, label: c.ds.class,
        points: c.ds.years.map(y => ({ year: y, v: c.v(key, y), reason: c.v(key, y) === null ? "Không có trong dữ liệu" : "" })) };
    }
    return null;
  }
  // every card a player can pin: all ratios, then all statement lines
  const ALL_CARDS = [...E.METRICS.map(m => "m:" + m.id), ...Object.keys(E.ITEMS).map(k => "i:" + k)];

  // ---------- Building a case ----------
  // status of a hypothesis from weighted evidence (data) — same shape as the player's rule below
  function refStatusOf(refs) {
    const avail = refs.filter(r => r.t !== "na").length;
    const F = refs.filter(r => r.t === "for").reduce((s, r) => s + r.s, 0);
    const A = refs.filter(r => r.t === "against").reduce((s, r) => s + r.s, 0);
    let status;
    if (avail < 2 || (F === 0 && A === 0)) status = "UNTESTED";
    else if (F >= 3 && A <= F / 3) status = "SUPPORTED";
    else if (A > 0 && A >= F) status = "CONTRADICTED";
    else status = F > 0 ? "PLAUSIBLE" : "UNTESTED";
    return { status, F, A, avail };
  }
  // decision implied by hypothesis statuses: bullish evidence minus bearish evidence
  function decide(arch, statuses) {
    let bull = 0, open = 0;
    arch.hyps.forEach(h => {
      const s = statuses[h.id];
      const w = s === "SUPPORTED" ? 2 : s === "PLAUSIBLE" ? 0.5 : s === "CONTRADICTED" ? -2 : 0;
      if (s !== "SUPPORTED" && s !== "PLAUSIBLE" && s !== "CONTRADICTED") open++;
      bull += w * h.pol;
    });
    const decision = open >= 2 ? "REQUEST" : bull >= 3 ? "INVEST" : bull <= -3 ? "AVOID" : "HOLD";
    return { decision, bull, open };
  }

  function buildCase(ds, archId, ctx) {
    const c = ctx || prepare(ds), arch = ARCHETYPES[archId];
    if (!arch) throw new Error("Unknown archetype " + archId);
    const hyps = arch.hyps.map(h => {
      const refs = h.refs.map(([card, test]) => { const o = test(c); return { card, t: o.t, s: o.s, why: o.why, pol: o.t === "for" ? h.pol : o.t === "against" ? -h.pol : 0 }; });
      const st = refStatusOf(refs);
      return { id: h.id, tag: h.tag, title: h.title, hint: h.hint, pol: h.pol, refs, refStatus: st.status, weight: { for: st.F, against: st.A }, available: st.avail };
    });
    const statuses = Object.fromEntries(hyps.map(h => [h.id, h.refStatus]));
    const d = decide(arch, statuses);
    // card summary across hypotheses: direction for the decision (+ bullish, − bearish) and strength
    const cards = {};
    hyps.forEach(h => h.refs.forEach(r => {
      const e = cards[r.card] || (cards[r.card] = { id: r.card, hyps: [], score: 0, s: 0, decisive: false, na: true });
      e.hyps.push(h.id);
      if (r.t !== "na") e.na = false;
      if (r.t === "for" || r.t === "against") { e.decisive = true; e.score += r.s * r.pol; e.s = Math.max(e.s, r.s); }
    }));
    Object.values(cards).forEach(e => { e.pol = Math.sign(e.score); });
    // workpapers: the first three ratios of the list that exist for the latest year
    const workpapers = [];
    arch.workpapers.forEach(id => {
      if (workpapers.length >= 3) return;
      const r = c.res.results[id].byYear[c.lastYear];
      if (r && isNum(r.v)) workpapers.push({ id, title: E.METRIC[id].vi, unit: E.METRIC[id].unit, formula: E.METRIC[id].formula, year: c.lastYear, value: r.v, inputs: r.inputs, notes: r.notes });
    });
    const playable = [];
    if (!c.val.publishable) playable.push("Bộ dữ liệu chưa qua các kiểm tra bắt buộc (NOT PUBLISHABLE).");
    if (workpapers.length < 3) playable.push("Không đủ 3 chỉ số để lập workpaper cho năm gần nhất.");
    if (hyps.filter(h => h.available >= 2).length < 3) playable.push("Quá ít bằng chứng khả dụng cho các giả thuyết.");
    const reference = { decision: d.decision, bull: d.bull, statuses, confidence: refConfidence(c, hyps, d) };
    return { arch, archId, ds, c, hyps, cards, workpapers, reference, limits: limitOptions(c), playable: playable.length === 0, notPlayable: playable,
      memo: arch.memo(c), question: arch.question, rules: RULES_VERSION, engine: E.ENGINE_VERSION };
  }

  // how clear the evidence is: number of decided hypotheses, minus data-quality issues
  function refConfidence(c, hyps, d) {
    if (d.decision === "REQUEST") return "low";
    const decided = hyps.filter(h => h.refStatus === "SUPPORTED" || h.refStatus === "CONTRADICTED").length;
    let lvlIdx = decided >= 4 ? 2 : decided >= 2 ? 1 : 0;
    const fail = id => { const x = c.check(id); return x && x.status === "fail"; };
    const issues = [fail("audit"), fail("continuity"), c.ds.years.length < 4, hyps.some(h => h.refStatus === "UNTESTED")].filter(Boolean).length;
    lvlIdx = Math.max(0, lvlIdx - issues);
    return CONF_ORDER[lvlIdx];
  }

  // statements about the limits of the case file; truth comes from the data and the checks
  function limitOptions(c) {
    const fail = id => { const x = c.check(id); return !!x && x.status === "fail"; };
    const missing = c.ds.years.some(y => Object.keys(E.ITEMS).some(k => c.v(k, y) === null));
    return [
      { id: "notes", truth: true, text: "Không có thuyết minh BCTC: không xem được tuổi nợ phải thu, dự phòng, chi tiết từng khoản vay" },
      { id: "auditor", truth: true, text: "Không có báo cáo kiểm toán nên không biết ý kiến của kiểm toán viên" },
      { id: "unbalanced", truth: fail("equation") || fail("total_sources"), text: "Bảng cân đối kế toán không cân" },
      { id: "proxy", truth: true, text: "DPO và chu kỳ tiền mặt là số ước tính vì VAS không trình bày giá trị mua hàng" },
      { id: "unaudited", truth: fail("audit"), text: "Có năm chưa được kiểm toán hoặc có số liệu điều chỉnh hồi tố" },
      { id: "quarterly", truth: false, text: "Số liệu là báo cáo quý nên không so sánh được giữa các năm" },
      { id: "market", truth: true, text: "Không có giá cổ phiếu và định giá: dữ liệu không cho biết cổ phiếu đắt hay rẻ" },
      { id: "continuity", truth: fail("continuity"), text: "Tiền đầu kỳ không khớp tiền cuối kỳ trước ở ít nhất một năm" },
      { id: "missing", truth: missing, text: "Một số khoản mục không có trong dữ liệu và được ghi là không khả dụng" },
      c.ds.class === "SIMULATED"
        ? { id: "source", truth: true, text: "Đây là dữ liệu mô phỏng của một doanh nghiệp hư cấu" }
        : { id: "source", truth: true, text: "Số liệu lấy qua nhà cung cấp dữ liệu, chưa đối chiếu với bản BCTC gốc" }
    ];
  }

  // ---------- The player's side ----------
  // The verdict on each hypothesis is the player's own judgement, set on the board.
  // The balance only counts their links: two weak signals do not outweigh one strong one,
  // and weighing them is the analyst's job.
  function balance(links, hypId) {
    const mine = (links || []).filter(l => l.h === hypId), n = r => mine.filter(l => l.r === r).length;
    return { supports: n("supports"), contradicts: n("contradicts"), explains: n("explains"), needs: n("needs"), total: mine.length };
  }
  function playerStatuses(cs, st) {
    const v = (st && st.verdicts) || {};
    return Object.fromEntries(cs.hyps.map(h => [h.id, STATUS[v[h.id]] ? v[h.id] : "UNTESTED"]));
  }
  // closeness of a verdict to the reference: exact 1; one step apart on CONTRADICTED – PLAUSIBLE – SUPPORTED 0.5
  function verdictPoints(mine, ref) {
    if (mine === ref) return 1;
    const scale = ["CONTRADICTED", "PLAUSIBLE", "SUPPORTED"], a = scale.indexOf(mine), b = scale.indexOf(ref);
    return a >= 0 && b >= 0 && Math.abs(a - b) === 1 ? 0.5 : 0;
  }

  // is a link consistent with the data? returns { ok, why }
  function linkCheck(cs, link) {
    const h = cs.hyps.find(x => x.id === link.h);
    const ref = h && h.refs.find(r => r.card === link.c);
    if (!ref) return { ok: false, ref: null, why: "Bằng chứng này không liên quan đến giả thuyết" };
    const ok = link.r === "supports" ? ref.t === "for" : link.r === "contradicts" ? ref.t === "against"
      : link.r === "explains" ? ref.t !== "against" : link.r === "needs" ? ref.t === "neutral" || ref.t === "na" : false;
    const said = { for: "dữ liệu ủng hộ giả thuyết", against: "dữ liệu đi ngược giả thuyết", neutral: "dữ liệu chưa cho tín hiệu rõ", na: "dữ liệu không khả dụng" }[ref.t];
    return { ok, ref, why: `${said}: ${ref.why}` };
  }

  // grading a workpaper: tolerance by unit; the formula is given, the inputs come from the statements
  function gradeWorkpaper(wp, input) {
    if (!isNum(input)) return { frac: 0, err: null };
    const shown = wp.unit === "pct" ? wp.value * 100 : wp.value;   // percentages are typed as 12.3 for 12.3%
    let frac;
    if (wp.unit === "pct") { const d = Math.abs(input - shown); frac = d <= 0.2 ? 1 : d <= 1 ? 0.6 : d <= 3 ? 0.3 : 0; return { frac, err: d, errUnit: "điểm %" }; }
    // relative error, but rounding to the shown precision never costs points (0,17 for 0,1672 lần; 82,9 for 82,93 ngày)
    const d = Math.abs(input - shown), rel = d / Math.max(Math.abs(shown), 1e-9), step = wp.unit === "days" ? 0.5 : 0.006;
    frac = d <= step || rel <= 0.01 ? 1 : d <= step * 2.5 || rel <= 0.03 ? 0.6 : d <= step * 6 || rel <= 0.08 ? 0.3 : 0;
    return { frac, err: rel, errUnit: "%" };
  }
  const shownValue = wp => wp.unit === "pct" ? wp.value * 100 : wp.value;
  // a workpaper number as typed or shown: 44,6% · 82,9 ngày · 0,17 lần
  const wpFmt = (wp, v) => wp.unit === "pct" ? `${num(v, 1)}%` : wp.unit === "days" ? `${num(v, 1)} ngày` : wp.unit === "x" ? `${num(v, 2)} lần` : num(v, 2);

  // ---------- Score (100 points) ----------
  // Data accuracy 25 · Evidence quality 25 · Analytical reasoning 25 · Decision discipline 15 · Source awareness 10
  function score(cs, st) {
    st = st || {};
    const links = st.links || [], pins = st.pins || [];
    const r1 = x => Math.round(x * 10) / 10;
    const parts = [];

    // GDD §11 rubric. 1. Data and formula accuracy (20): the three workpapers
    const per = 20 / Math.max(cs.workpapers.length, 1);
    const accItems = cs.workpapers.map(wp => {
      const a = (st.wp || {})[wp.id];
      const g = a && a.checked ? gradeWorkpaper(wp, a.input) : { frac: 0, err: null };
      return { label: `${wp.title} (${wp.year})`, score: r1(per * g.frac), raw: per * g.frac, max: r1(per), note: a && a.checked ? `Bạn: ${wpFmt(wp, a.input)} · Engine: ${wpFmt(wp, shownValue(wp))}` : "Chưa làm" };
    });
    parts.push({ id: "accuracy", name: "Data & Formula Accuracy", vi: "Độ chính xác dữ liệu và công thức", max: 20, items: accItems });

    // 2. Finding the key risks (20): the decisive evidence of each hypothesis, linked the right way
    let target = 0, found = 0;
    const missed = [];
    cs.hyps.forEach(h => {
      const key = h.refs.filter(r => r.t === "for" || r.t === "against").sort((a, b) => b.s - a.s);
      const tgt = Math.min(3, key.length);
      const hits = key.filter(r => links.some(l => l.h === h.id && l.c === r.card && (l.r === "supports" || l.r === "contradicts") && linkCheck(cs, l).ok)).length;
      target += tgt; found += Math.min(hits, tgt);
      if (hits < tgt) key.filter(r => !links.some(l => l.h === h.id && l.c === r.card && linkCheck(cs, l).ok)).slice(0, tgt - hits).forEach(r => missed.push({ h: h.id, card: r.card, t: r.t, why: r.why }));
    });
    const coverage = target ? found / target : (links.length ? 1 : 0);
    parts.push({ id: "risk", name: "Key Risk Detection", vi: "Phát hiện rủi ro quan trọng", max: 20, items: [
      { label: "Bằng chứng then chốt được tìm ra và gắn đúng", score: r1(20 * coverage), raw: 20 * coverage, max: 20, note: `${found}/${target} bằng chứng then chốt (tối đa 3 cho mỗi giả thuyết)` }
    ] });

    // 3. Evidence quality (20): links that match the data, relevant pins, checks and sources looked at
    const checked = links.map(l => ({ link: l, res: linkCheck(cs, l) }));
    const validN = checked.filter(x => x.res.ok).length;
    const validity = links.length ? validN / links.length : 0;
    const relevant = pins.filter(p => cs.cards[p]).length;
    const relevance = pins.length ? relevant / pins.length : 0;
    const insp = (st.inspected || []).length;
    const lineage = insp >= 2 ? 3 : insp === 1 ? 2 : st.viewedSource ? 1 : 0;
    parts.push({ id: "evidence", name: "Evidence Quality", vi: "Chất lượng bằng chứng", max: 20, items: [
      { label: "Liên kết bằng chứng hợp lệ", score: r1(8 * validity), raw: 8 * validity, max: 8, note: `${validN}/${links.length} liên kết khớp với dữ liệu` },
      { label: "Độ liên quan của bằng chứng đã ghim", score: r1(6 * relevance), raw: 6 * relevance, max: 6, note: `${relevant}/${pins.length} thẻ đã ghim có liên quan đến nhiệm vụ` },
      { label: "Đã xem các kiểm tra dữ liệu", score: st.viewedChecks ? 3 : 0, max: 3, note: st.viewedChecks ? "Đã mở tab Kiểm tra" : "Chưa mở tab Kiểm tra" },
      { label: "Đã truy nguồn con số", score: lineage, max: 3, note: `${insp} con số được mở trong Formula Inspector` }
    ] });

    // 4. Alternative hypotheses (15): a verdict on every hypothesis, and the strongest counter-evidence
    const mineStatuses = playerStatuses(cs, st);
    const exactN = cs.hyps.filter(h => mineStatuses[h.id] === h.refStatus).length;
    const verdicts = 9 * cs.hyps.reduce((s, h) => s + verdictPoints(mineStatuses[h.id], h.refStatus), 0) / cs.hyps.length;
    const dp = st.decision ? DECISIONS[st.decision].pol : 0;
    const cardOf = id => cs.cards[id] || { pol: 0, s: 0, decisive: false };
    const counterSet = Object.values(cs.cards).filter(e => e.decisive && (dp !== 0 ? e.pol === -dp : e.s >= 2));
    let c2 = 0;
    if (st.c2) {
      if (counterSet.length) c2 = st.c2 === "none" ? 0 : counterSet.some(e => e.id === st.c2) ? (cardOf(st.c2).s >= 2 ? 6 : 3.6) : 1.2;
      else c2 = st.c2 === "none" ? 6 : cardOf(st.c2).decisive ? 0 : 2.4;
    }
    parts.push({ id: "alternatives", name: "Alternative Hypotheses", vi: "Xem xét giả thuyết thay thế", max: 15, items: [
      { label: "Kết luận cho từng giả thuyết", score: r1(verdicts), raw: verdicts, max: 9, note: `${exactN}/${cs.hyps.length} kết luận khớp góc nhìn tham chiếu` },
      { label: "Committee 2: bằng chứng ngược chiều", score: r1(c2), raw: c2, max: 6, note: !st.c2 ? "Chưa trả lời" : st.c2 === "none" ? "Bạn trả lời: không có" : "Đã chọn một thẻ" }
    ] });

    // 5. Financial impact (15): what the evidence means for the fund, and the evidence that carries it
    const rec = st.decision ? REC_POINTS[cs.reference.decision][st.decision] * 8 / 5 : 0;
    const c1raw = (st.c1 || []).slice(0, 3).reduce((s, id) => {
      const e = cardOf(id);
      if (!e.decisive) return s;
      if (dp !== 0) return s + (e.pol === dp ? (e.s >= 2 ? 2 : 1) : 0);
      return s + (e.s >= 2 ? 2 : 1);
    }, 0);
    const c1 = c1raw * 7 / 6;
    parts.push({ id: "impact", name: "Financial Impact", vi: "Đánh giá tác động tài chính", max: 15, items: [
      { label: "Khuyến nghị so với góc nhìn tham chiếu", score: r1(rec), raw: rec, max: 8, note: `Tham chiếu: ${DECISIONS[cs.reference.decision].en}` },
      { label: "Committee 1: ba bằng chứng mạnh nhất", score: r1(c1), raw: c1, max: 7, note: (st.c1 || []).length ? `${(st.c1 || []).length} thẻ được chọn` : "Chưa trả lời" }
    ] });

    // 6. Decision and presentation (10): consistent with your own verdicts, calibrated, honest about limits
    const implied = decide(cs.arch, mineStatuses).decision;
    const consistency = !st.decision ? 0 : st.decision === implied ? 4 : REC_POINTS[implied][st.decision] >= 3 ? 2 : 0;
    const confGap = st.confidence ? Math.abs(CONF_ORDER.indexOf(st.confidence) - CONF_ORDER.indexOf(cs.reference.confidence)) : 2;
    const calib = st.confidence ? [3, 1.5, 0][confGap] : 0;
    const truths = cs.limits.filter(o => o.truth).map(o => o.id), picked = st.c3 || [];
    const tp = picked.filter(id => truths.includes(id)).length, fp = picked.length - tp;
    const c3 = truths.length ? Math.max(0, 3 * (tp - fp) / truths.length) : 0;
    parts.push({ id: "decision", name: "Decision & Presentation", vi: "Quyết định và cách trình bày", max: 10, items: [
      { label: "Quyết định nhất quán với kết luận của chính bạn", score: consistency, max: 4, note: `Các kết luận của bạn dẫn tới: ${DECISIONS[implied].en}` },
      { label: "Mức tự tin tương xứng với bằng chứng", score: calib, max: 3, note: `Tham chiếu: ${CONFIDENCE[cs.reference.confidence]}` },
      { label: "Committee 3: giới hạn của dữ liệu", score: r1(c3), raw: c3, max: 3, note: `${tp} đúng, ${fp} sai trên ${truths.length} giới hạn có thật` }
    ] });

    // parts add the unrounded item scores, so a perfect part shows 25/25 and not 24.9
    parts.forEach(p => { p.raw = p.items.reduce((s, i) => s + (i.raw !== undefined ? i.raw : i.score), 0); p.score = r1(p.raw); });
    const total = Math.round(parts.reduce((s, p) => s + p.raw, 0));
    const grade = total >= 90 ? "Xuất sắc" : total >= 75 ? "Tốt" : total >= 60 ? "Đạt" : "Cần cải thiện";
    return { total, grade, parts, missed, invalid: checked.filter(x => !x.res.ok).map(x => ({ ...x.link, why: x.res.why })), implied, mineStatuses };
  }

  // ---------- Progress ----------
  function rankOf(xp) {
    let i = 0;
    RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    const next = RANKS[i + 1] || null, level = Math.min(MAX_LEVEL, 1 + Math.floor(xp / XP_PER_LEVEL));
    return { idx: i, name: RANKS[i].name, level, xp, next, progress: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1 };
  }
  const caseKey = (dsId, archId) => `${dsId}|${archId}`;
  function unlocked(archId, best) {
    const req = ARCHETYPES[archId].requires;
    return !req || Object.keys(best || {}).some(k => k.endsWith("|" + req));
  }

  return { RULES_VERSION, DECISIONS, DECISION_IDS, REC_POINTS, CONFIDENCE, CONF_ORDER, RELATIONS, STATUS, RANKS, ARCHETYPES, ARCHETYPE_IDS, ALL_CARDS, TESTS,
    fmt, num, bn, sp, prepare, cardInfo, buildCase, decide, refStatusOf, balance, playerStatuses, verdictPoints, linkCheck, gradeWorkpaper, shownValue, wpFmt, score, rankOf, caseKey, unlocked };
});

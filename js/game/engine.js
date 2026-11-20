// ============================================================
// js/game/engine.js — Financial Engine of "Financial World: Evidence of Value"
//
// Pure functions: no DOM, no network. They check a dataset of financial
// statements (accounting identities, cash reconciliation, units, periods,
// scope) and compute a registry of ratios. Every ratio keeps its formula,
// its inputs (item, year, value) and its conventions; when an input is
// missing the ratio is "unavailable" with the reason, never a guessed number.
//
// Loads as a classic script (window.FWEngine) and in Node (require) so the
// tests in tests/ can run without a browser.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FWEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ENGINE_VERSION = "1.0.0";
  const SCHEMA = "fw-dataset/1";

  // Canonical line items. Values are in VND. sec: bs = balance at year-end,
  // is = income statement for the year, cf = cash flow for the year.
  const ITEMS = {
    cash: { sec: "bs", vi: "Tiền và các khoản tương đương tiền", en: "Cash and cash equivalents", req: true },
    st_inv: { sec: "bs", vi: "Đầu tư tài chính ngắn hạn", en: "Short-term investments" },
    ar: { sec: "bs", vi: "Phải thu ngắn hạn của khách hàng", en: "Trade receivables", req: true },
    inv: { sec: "bs", vi: "Hàng tồn kho", en: "Inventories" },
    ca: { sec: "bs", vi: "Tài sản ngắn hạn", en: "Current assets", req: true },
    ta: { sec: "bs", vi: "Tổng cộng tài sản", en: "Total assets", req: true },
    ap: { sec: "bs", vi: "Phải trả người bán ngắn hạn", en: "Trade payables" },
    std: { sec: "bs", vi: "Vay và nợ thuê tài chính ngắn hạn", en: "Short-term borrowings" },
    cl: { sec: "bs", vi: "Nợ ngắn hạn", en: "Current liabilities", req: true },
    ltd: { sec: "bs", vi: "Vay và nợ thuê tài chính dài hạn", en: "Long-term borrowings" },
    tl: { sec: "bs", vi: "Nợ phải trả", en: "Total liabilities", req: true },
    te: { sec: "bs", vi: "Vốn chủ sở hữu", en: "Total equity", req: true },
    nci: { sec: "bs", vi: "Lợi ích cổ đông không kiểm soát", en: "Non-controlling interests" },
    tle: { sec: "bs", vi: "Tổng cộng nguồn vốn", en: "Total liabilities and equity" },
    rev: { sec: "is", vi: "Doanh thu thuần", en: "Net revenue", req: true },
    cogs: { sec: "is", vi: "Giá vốn hàng bán", en: "Cost of goods sold" },
    gp: { sec: "is", vi: "Lợi nhuận gộp", en: "Gross profit" },
    int_exp: { sec: "is", vi: "Chi phí lãi vay", en: "Interest expense" },
    op: { sec: "is", vi: "Lợi nhuận thuần từ hoạt động kinh doanh", en: "Operating profit" },
    pbt: { sec: "is", vi: "Tổng lợi nhuận kế toán trước thuế", en: "Profit before tax", req: true },
    ni: { sec: "is", vi: "Lợi nhuận sau thuế", en: "Net income", req: true },
    ni_parent: { sec: "is", vi: "LNST của cổ đông công ty mẹ", en: "Net income attributable to the parent" },
    dep: { sec: "cf", vi: "Khấu hao TSCĐ", en: "Depreciation and amortisation" },
    cfo: { sec: "cf", vi: "Lưu chuyển tiền thuần từ hoạt động kinh doanh", en: "Cash flow from operating activities", req: true },
    capex: { sec: "cf", vi: "Tiền chi mua sắm, xây dựng TSCĐ", en: "Purchases of fixed assets" },
    cfi: { sec: "cf", vi: "Lưu chuyển tiền thuần từ hoạt động đầu tư", en: "Cash flow from investing activities" },
    cff: { sec: "cf", vi: "Lưu chuyển tiền thuần từ hoạt động tài chính", en: "Cash flow from financing activities" },
    cf_net: { sec: "cf", vi: "Lưu chuyển tiền thuần trong kỳ", en: "Net change in cash" },
    cf_beg: { sec: "cf", vi: "Tiền và tương đương tiền đầu kỳ", en: "Cash at beginning of year" },
    cf_fx: { sec: "cf", vi: "Ảnh hưởng của thay đổi tỷ giá", en: "Effect of exchange rate changes" },
    cf_end: { sec: "cf", vi: "Tiền và tương đương tiền cuối kỳ", en: "Cash at end of year" }
  };
  const ORDER = {
    bs: ["cash", "st_inv", "ar", "inv", "ca", "ta", "ap", "std", "cl", "ltd", "tl", "te", "nci", "tle"],
    is: ["rev", "cogs", "gp", "int_exp", "op", "pbt", "ni", "ni_parent"],
    cf: ["dep", "cfo", "capex", "cfi", "cff", "cf_net", "cf_beg", "cf_fx", "cf_end"]
  };
  const SUBTOTALS = ["ca", "ta", "cl", "tl", "te", "tle", "gp", "op", "pbt", "ni", "cfo", "cfi", "cff", "cf_net", "cf_end"];
  const REQUIRED = Object.keys(ITEMS).filter(k => ITEMS[k].req);
  const SCALES = { 1: "đồng", 1e3: "nghìn đồng", 1e6: "triệu đồng", 1e9: "tỷ đồng" };

  class Unavailable extends Error {}
  const isNum = v => typeof v === "number" && isFinite(v);
  const str = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";

  // ---------- Dataset structure and units ----------
  // Accepts a parsed JSON object; returns a clean copy in VND (unit 1) or the reasons it cannot be read.
  function normalize(raw) {
    const errors = [], warnings = [];
    if (!raw || typeof raw !== "object") return { ok: false, errors: ["Không phải hồ sơ dữ liệu (JSON object)."], warnings };
    if (raw.schema !== SCHEMA) errors.push(`Sai định dạng: cần "${SCHEMA}".`);
    if (raw.class !== "REAL" && raw.class !== "SIMULATED") errors.push("Thiếu nhãn dữ liệu REAL hoặc SIMULATED.");
    const company = raw.company || {};
    if (!str(company.name)) errors.push("Thiếu tên doanh nghiệp.");
    const years = Array.isArray(raw.years) ? raw.years.slice() : [];
    if (!years.length || years.some(y => !Number.isInteger(y) || y < 1990 || y > 2100)) errors.push("Danh sách năm không hợp lệ.");
    const scope = raw.scope || {};
    const unit = scope.unit === undefined ? 1 : scope.unit;
    if (!SCALES[unit]) errors.push("Đơn vị không hỗ trợ (chỉ đồng, nghìn, triệu, tỷ đồng).");
    if (errors.length) return { ok: false, errors, warnings };

    const values = {}, dropped = new Set();
    years.forEach(y => {
      const row = (raw.values || {})[y] || (raw.values || {})[String(y)] || {};
      values[y] = {};
      Object.keys(ITEMS).forEach(k => {
        const v = row[k];
        if (v === null || v === undefined) values[y][k] = null;
        else if (isNum(v)) values[y][k] = v * unit;
        else { values[y][k] = null; errors.push(`Giá trị không phải số: ${k} năm ${y}.`); }
      });
      Object.keys(row).forEach(k => { if (!ITEMS[k]) dropped.add(k); });
    });
    if (dropped.size) warnings.push(`Bỏ qua khoản mục không thuộc mô hình chuẩn: ${[...dropped].slice(0, 8).join(", ")}.`);
    // Normalised signs: expenses and outflows as the statements show them. Costs are positive, capex is an outflow (negative).
    years.forEach(y => {
      const r = values[y];
      ["cogs", "int_exp"].forEach(k => { if (isNum(r[k]) && r[k] < 0) r[k] = -r[k]; });
      if (isNum(r.capex) && r.capex > 0) r.capex = -r.capex;
    });
    const lineage = {};
    Object.keys(ITEMS).forEach(k => {
      const l = (raw.lineage || {})[k] || {};
      lineage[k] = { column: str(l.column, 40), label: str(l.label, 160), transform: str(l.transform, 120) };
    });
    const periodMeta = {};
    years.forEach(y => {
      const m = (raw.periodMeta || {})[y] || (raw.periodMeta || {})[String(y)] || {};
      periodMeta[y] = { audit: str(m.audit, 40) || "không rõ", restated: m.restated === true };
    });
    const ds = {
      schema: SCHEMA, id: str(raw.id, 80) || "dataset", class: raw.class,
      company: { name: str(company.name), ticker: str(company.ticker, 20), exchange: str(company.exchange, 20), sector: str(company.sector, 80), fictional: company.fictional === true },
      scope: { basis: str(scope.basis, 20), framework: str(scope.framework, 30), periodType: str(scope.periodType, 20), currency: str(scope.currency, 8), unit: 1, sourceUnit: SCALES[unit] },
      years: years.slice().sort((a, b) => a - b), values, lineage, periodMeta,
      source: { provider: str((raw.source || {}).provider), endpoint: str((raw.source || {}).endpoint, 60), retrievedAt: str((raw.source || {}).retrievedAt, 40), attribution: str((raw.source || {}).attribution), license: str((raw.source || {}).license, 400), version: str((raw.source || {}).version, 40), note: str((raw.source || {}).note, 400) },
      exceptions: Array.isArray(raw.exceptions) ? raw.exceptions.slice(0, 20).map(e => ({ check: str(e.check, 40), year: Number.isInteger(e.year) ? e.year : undefined, note: str(e.note, 300) })) : [],
      story: raw.story && typeof raw.story === "object" ? { brief: str(raw.story.brief, 600), epilogue: str(raw.story.epilogue, 600) } : null
    };
    return { ok: errors.length === 0, errors, warnings, ds };
  }

  // ---------- Checks before a case can be published ----------
  // level "block": the case is NOT PUBLISHABLE while it fails · level "warn": shown, does not block
  function validate(ds) {
    const checks = [];
    const add = (id, label, level, status, detail) => checks.push({ id, label, level, status, detail });
    const tolOf = base => Math.max(1e6, Math.abs(base || 0) * 1e-5);   // 1 million VND or 0.001%: rounding in published statements
    const exceptionFor = (id, y) => ds.exceptions.find(e => e.check === id && (e.year === undefined || e.year === y));
    const v = (y, k) => ds.values[y] ? ds.values[y][k] : null;
    const fmtBn = x => `${(x / 1e9).toLocaleString("en-US", { maximumFractionDigits: 3 })} tỷ`;
    // runs an identity for every year where all its inputs exist
    const identity = (id, label, level, needs, left, right, base) => {
      const bad = [], ok = [], skipped = [], excused = [];
      ds.years.forEach(y => {
        if (needs.some(k => !isNum(v(y, k)))) { skipped.push(y); return; }
        const a = left(y), b = right(y), diff = a - b;
        if (Math.abs(diff) <= tolOf(base(y))) ok.push(y);
        else if (exceptionFor(id, y)) excused.push(`${y}: ${exceptionFor(id, y).note}`);
        else bad.push(`${y}: lệch ${fmtBn(diff)}`);
      });
      if (!ok.length && !bad.length && !excused.length) add(id, label, level, "na", "Không đủ khoản mục để kiểm tra.");
      else if (bad.length) add(id, label, level, "fail", bad.join(" · "));
      else add(id, label, level, "pass", `${ok.length} năm khớp${excused.length ? ` · ngoại lệ đã ghi nhận: ${excused.join(" · ")}` : ""}${skipped.length ? ` · không đủ dữ liệu: ${skipped.join(", ")}` : ""}`);
    };

    const ys = ds.years;
    const consecutive = ys.every((y, i) => i === 0 || y === ys[i - 1] + 1);
    add("years", "Kỳ báo cáo: năm liên tiếp, không trùng", "block", ys.length >= 3 && consecutive && new Set(ys).size === ys.length ? "pass" : "fail",
      ys.length < 3 ? "Cần ít nhất 3 năm để phân tích xu hướng." : consecutive ? `${ys[0]}–${ys[ys.length - 1]} (${ys.length} năm)` : "Các năm không liên tiếp.");
    const missing = [];
    ys.forEach(y => REQUIRED.forEach(k => { if (!isNum(v(y, k))) missing.push(`${ITEMS[k].vi} ${y}`); }));
    add("required", "Đủ khoản mục bắt buộc của 3 báo cáo", "block", missing.length ? "fail" : "pass", missing.length ? `Thiếu: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}` : `${REQUIRED.length} khoản mục × ${ys.length} năm`);
    const scopeOk = ["consolidated", "separate"].includes(ds.scope.basis) && !!ds.scope.framework && ds.scope.periodType === "annual" && ds.scope.currency === "VND";
    add("scope", "Phạm vi: một cơ sở (hợp nhất hoặc riêng lẻ), báo cáo năm, VND", "block", scopeOk ? "pass" : "fail",
      scopeOk ? `${ds.scope.basis === "consolidated" ? "Hợp nhất" : "Riêng lẻ"} · ${ds.scope.framework} · năm · VND (nguồn tính bằng ${ds.scope.sourceUnit}, đã quy về đồng)` : "Thiếu hoặc sai phạm vi báo cáo.");
    const classOk = ds.class === "SIMULATED" ? ds.company.fictional === true : ds.company.fictional !== true && !!ds.source.provider;
    add("class", "Nhãn dữ liệu đúng với nguồn", "block", classOk ? "pass" : "fail",
      ds.class === "SIMULATED" ? (classOk ? "SIMULATED — doanh nghiệp hư cấu" : "Dữ liệu mô phỏng phải gắn với doanh nghiệp hư cấu.") : (classOk ? `REAL — ${ds.source.provider}` : "Dữ liệu REAL phải có nhà cung cấp và không phải doanh nghiệp hư cấu."));

    identity("equation", "Tài sản = Nợ phải trả + Vốn chủ sở hữu", "block", ["ta", "tl", "te"], y => v(y, "ta"), y => v(y, "tl") + v(y, "te"), y => v(y, "ta"));
    identity("total_sources", "Tổng tài sản = Tổng nguồn vốn", "block", ["ta", "tle"], y => v(y, "ta"), y => v(y, "tle"), y => v(y, "ta"));
    // subtotals: parts cannot exceed their total
    const over = [];
    ys.forEach(y => {
      const t = tolOf(v(y, "ta"));
      if (isNum(v(y, "ca")) && v(y, "ca") > v(y, "ta") + t) over.push(`${y}: TS ngắn hạn > tổng TS`);
      if (isNum(v(y, "cl")) && v(y, "cl") > v(y, "tl") + t) over.push(`${y}: nợ ngắn hạn > nợ phải trả`);
      const parts = ["cash", "st_inv", "ar", "inv"].reduce((s, k) => s + (isNum(v(y, k)) ? v(y, k) : 0), 0);
      if (isNum(v(y, "ca")) && parts > v(y, "ca") + t) over.push(`${y}: tiền + đầu tư NH + phải thu + tồn kho > TS ngắn hạn`);
      if (isNum(v(y, "std")) && isNum(v(y, "cl")) && v(y, "std") > v(y, "cl") + t) over.push(`${y}: vay ngắn hạn > nợ ngắn hạn`);
    });
    add("subtotals", "Khoản mục con không vượt tổng của nó", "block", over.length ? "fail" : "pass", over.length ? over.join(" · ") : "Khớp ở mọi năm");
    identity("gross_profit", "Lợi nhuận gộp = Doanh thu thuần − Giá vốn", "block", ["rev", "cogs", "gp"], y => v(y, "gp"), y => v(y, "rev") - v(y, "cogs"), y => v(y, "rev"));
    identity("cf_sections", "CFO + CFI + CFF = Lưu chuyển tiền thuần", "block", ["cfo", "cfi", "cff", "cf_net"], y => v(y, "cf_net"), y => v(y, "cfo") + v(y, "cfi") + v(y, "cff"), y => v(y, "ta"));
    identity("cf_roll", "Tiền đầu kỳ + lưu chuyển thuần ± tỷ giá = tiền cuối kỳ", "block", ["cf_beg", "cf_net", "cf_end"], y => v(y, "cf_end"), y => v(y, "cf_beg") + v(y, "cf_net") + (v(y, "cf_fx") || 0), y => v(y, "ta"));
    identity("cash_tie", "Tiền cuối kỳ (lưu chuyển tiền tệ) = Tiền trên bảng cân đối", "block", ["cf_end", "cash"], y => v(y, "cf_end"), y => v(y, "cash"), y => v(y, "ta"));
    // continuity: this year's opening cash equals last year's closing cash (a restatement or reclassification breaks it)
    const cont = [];
    ys.forEach((y, i) => { if (i && isNum(v(y, "cf_beg")) && isNum(v(ys[i - 1], "cash")) && Math.abs(v(y, "cf_beg") - v(ys[i - 1], "cash")) > tolOf(v(y, "ta"))) cont.push(`${y}: tiền đầu kỳ khác tiền cuối năm ${ys[i - 1]} (${fmtBn(v(y, "cf_beg") - v(ys[i - 1], "cash"))})`); });
    add("continuity", "Số dư đầu kỳ = số dư cuối kỳ trước", "warn", cont.length ? "fail" : "pass", cont.length ? `${cont.join(" · ")} — có thể do trình bày lại số liệu` : "Liên tục giữa các năm");
    const neg = [];
    ys.forEach(y => { if (!(v(y, "ta") > 0)) neg.push(`${y}: tổng tài sản`); if (!(v(y, "rev") > 0)) neg.push(`${y}: doanh thu thuần`); });
    add("signs", "Dấu và độ lớn hợp lý", "block", neg.length ? "fail" : "pass", neg.length ? `Không dương: ${neg.join(", ")}` : "Tổng tài sản và doanh thu dương");
    const odd = ys.filter(y => { const r = v(y, "rev") / v(y, "ta"); return isFinite(r) && (r < 0.02 || r > 20); });
    add("scale", "Thang đơn vị nhất quán (doanh thu so với tài sản)", "warn", odd.length ? "fail" : "pass", odd.length ? `Tỷ lệ bất thường ở ${odd.join(", ")} — kiểm tra đơn vị` : "Không thấy lệch đơn vị");
    const notAudited = ys.filter(y => ds.periodMeta[y].audit !== "audited" && ds.periodMeta[y].audit !== "simulated");
    const restated = ys.filter(y => ds.periodMeta[y].restated);
    add("audit", "Tình trạng kiểm toán", "warn", notAudited.length || restated.length ? "fail" : "pass",
      [notAudited.length ? `Chưa kiểm toán/không rõ: ${notAudited.map(y => `${y} (${ds.periodMeta[y].audit})`).join(", ")}` : "", restated.length ? `Có số liệu hồi tố: ${restated.join(", ")}` : ""].filter(Boolean).join(" · ") || (ds.class === "SIMULATED" ? "Dữ liệu mô phỏng" : "Mọi năm đã kiểm toán"));

    const publishable = !checks.some(c => c.level === "block" && c.status === "fail");
    return { publishable, checks };
  }

  // What the case file holds and what it does not (the source inventory manifest)
  function manifest(ds, val) {
    const blocks = { bs: "Bảng cân đối kế toán", is: "Báo cáo kết quả kinh doanh", cf: "Báo cáo lưu chuyển tiền tệ" };
    const rows = Object.keys(blocks).map(sec => {
      const got = ds.years.filter(y => ORDER[sec].some(k => isNum(ds.values[y][k]))).length;
      const failing = (val || validate(ds)).checks.filter(c => c.level === "block" && c.status === "fail" && sectionOf(c.id) === sec);
      return { id: sec, name: blocks[sec], inScope: true, expected: ds.years.length, retrieved: got, qa: got === ds.years.length && !failing.length ? "PASS" : "FAIL", missing: ds.years.length - got };
    });
    const outOfScope = [
      ["notes", "Thuyết minh báo cáo tài chính"], ["annual", "Báo cáo thường niên"], ["audit_report", "Báo cáo kiểm toán"],
      ["agm", "Tài liệu ĐHĐCĐ, nghị quyết HĐQT"], ["explain", "Giải trình kết quả kinh doanh"], ["market", "Giá cổ phiếu và định giá"]
    ].map(([id, name]) => ({ id, name, inScope: false }));
    const reconciled = rows.every(r => r.qa === "PASS" && !r.missing);
    return { rows, outOfScope, reconciled };
  }
  const sectionOf = id => ({ equation: "bs", total_sources: "bs", subtotals: "bs", gross_profit: "is", cf_sections: "cf", cf_roll: "cf", cash_tie: "cf" }[id] || "");

  // ---------- Ratio registry ----------
  function getter(ds, y) {
    const inputs = [], notes = [];
    const raw = (item, yr) => {
      const row = ds.values[yr], val = row ? row[item] : undefined;
      if (!isNum(val)) throw new Unavailable(`Thiếu ${ITEMS[item] ? ITEMS[item].vi : item} năm ${yr}`);
      return val;
    };
    const g = {
      inputs, notes,
      has: item => !!ds.values[y] && isNum(ds.values[y][item]),
      cur: item => { const v = raw(item, y); inputs.push({ item, year: y, v, how: "cuối kỳ" }); return v; },
      prev: item => { const v = raw(item, y - 1); inputs.push({ item, year: y - 1, v, how: "kỳ trước" }); return v; },
      avg: item => { const a = raw(item, y - 1), b = raw(item, y); inputs.push({ item, year: y - 1, v: a, how: "bình quân" }, { item, year: y, v: b, how: "bình quân" }); return (a + b) / 2; },
      opt: (item, note) => { if (g.has(item)) return g.cur(item); notes.push(note || `Không có ${ITEMS[item].vi} — tính bằng 0`); return 0; },
      pos: (v, why) => { if (!(v > 0)) throw new Unavailable(why || "Mẫu số không dương"); return v; },
      // first try `a`; when an input is missing, fall back to `b` with a note about the convention used
      attempt: (a, b, note) => {
        const n = inputs.length, m = notes.length;
        try { return a(); } catch (e) {
          if (!(e instanceof Unavailable)) throw e;
          inputs.length = n; notes.length = m; notes.push(note); return b();
        }
      }
    };
    return g;
  }
  // total borrowings at a year (short + long); unavailable only when neither is reported
  const borrowings = (g, pick) => {
    const s = (() => { try { return pick("std"); } catch (e) { if (e instanceof Unavailable) return null; throw e; } })();
    const l = (() => { try { return pick("ltd"); } catch (e) { if (e instanceof Unavailable) return null; throw e; } })();
    if (s === null && l === null) throw new Unavailable("Không có số liệu nợ vay");
    if (s === null || l === null) g.notes.push(`Không có ${s === null ? "vay ngắn hạn" : "vay dài hạn"} — tính bằng 0`);
    return (s || 0) + (l || 0);
  };
  const growth = (g, item, label) => g.cur(item) / g.pos(g.prev(item), `${label} năm trước không dương — tăng trưởng không có ý nghĩa`) - 1;

  const LOS = {
    fat: "Financial Analysis Techniques", inc: "Analyzing Income Statements", inv: "Analysis of Inventories",
    frq: "Financial Reporting Quality", cf2: "Analyzing Statements of Cash Flows II", bal: "Analyzing Balance Sheets"
  };
  const GROUPS = { growth: "Tăng trưởng", profit: "Khả năng sinh lời", eff: "Hiệu quả vốn lưu động", liq: "Thanh khoản", lev: "Đòn bẩy và khả năng trả nợ", cash: "Chất lượng dòng tiền" };
  // unit: pct (fraction shown as %), pp (difference of two growth rates), x (times), days, vnd
  const METRICS = [
    { id: "rev_g", vi: "Tăng trưởng doanh thu thuần", group: "growth", unit: "pct", better: "up", los: LOS.fat, formula: "Doanh thu thuần năm t ÷ năm t−1 − 1", calc: g => growth(g, "rev", "Doanh thu") },
    { id: "ni_g", vi: "Tăng trưởng LNST", group: "growth", unit: "pct", better: "up", los: LOS.fat, formula: "LNST năm t ÷ năm t−1 − 1", calc: g => growth(g, "ni", "LNST") },
    { id: "ar_g", vi: "Tăng trưởng phải thu khách hàng", group: "growth", unit: "pct", better: null, los: LOS.fat, formula: "Phải thu khách hàng cuối năm t ÷ cuối năm t−1 − 1", calc: g => growth(g, "ar", "Phải thu") },
    { id: "ar_rev_gap", vi: "Phải thu tăng nhanh hơn doanh thu", group: "growth", unit: "pp", better: "down", los: LOS.frq, formula: "Tăng trưởng phải thu − tăng trưởng doanh thu", calc: g => growth(g, "ar", "Phải thu") - growth(g, "rev", "Doanh thu") },
    { id: "inv_g", vi: "Tăng trưởng hàng tồn kho", group: "growth", unit: "pct", better: null, los: LOS.inv, formula: "Hàng tồn kho cuối năm t ÷ cuối năm t−1 − 1", calc: g => growth(g, "inv", "Hàng tồn kho") },
    { id: "inv_cogs_gap", vi: "Tồn kho tăng nhanh hơn giá vốn", group: "growth", unit: "pp", better: "down", los: LOS.inv, formula: "Tăng trưởng hàng tồn kho − tăng trưởng giá vốn", calc: g => growth(g, "inv", "Hàng tồn kho") - growth(g, "cogs", "Giá vốn") },

    { id: "gm", vi: "Biên lợi nhuận gộp", group: "profit", unit: "pct", better: "up", los: LOS.inc, formula: "Lợi nhuận gộp ÷ Doanh thu thuần",
      calc: g => g.attempt(() => g.cur("gp") / g.pos(g.cur("rev")), () => (g.cur("rev") - g.cur("cogs")) / g.pos(g.cur("rev")), "Không có lợi nhuận gộp — tính bằng doanh thu thuần − giá vốn") },
    { id: "nm", vi: "Biên lợi nhuận ròng", group: "profit", unit: "pct", better: "up", los: LOS.inc, formula: "LNST ÷ Doanh thu thuần", calc: g => g.cur("ni") / g.pos(g.cur("rev")) },
    { id: "roa", vi: "ROA", group: "profit", unit: "pct", better: "up", los: LOS.fat, formula: "LNST ÷ Tổng tài sản bình quân", calc: g => g.cur("ni") / g.pos(g.avg("ta")) },
    { id: "roe", vi: "ROE", group: "profit", unit: "pct", better: "up", los: LOS.fat, formula: "LNST của cổ đông công ty mẹ ÷ VCSH của cổ đông công ty mẹ bình quân",
      calc: g => g.attempt(
        () => g.cur("ni_parent") / g.pos(((g.prev("te") - g.prev("nci")) + (g.cur("te") - g.cur("nci"))) / 2, "VCSH của cổ đông công ty mẹ không dương"),
        () => g.cur("ni") / g.pos(g.avg("te"), "VCSH bình quân không dương"),
        "Thiếu LNST hoặc lợi ích cổ đông không kiểm soát — dùng LNST và VCSH toàn công ty") },
    { id: "ato", vi: "Vòng quay tổng tài sản", group: "profit", unit: "x", better: "up", los: LOS.fat, formula: "Doanh thu thuần ÷ Tổng tài sản bình quân", calc: g => g.cur("rev") / g.pos(g.avg("ta")) },
    { id: "em", vi: "Hệ số nhân vốn chủ (đòn bẩy DuPont)", group: "profit", unit: "x", better: null, los: LOS.fat, formula: "Tổng tài sản bình quân ÷ VCSH bình quân", calc: g => g.avg("ta") / g.pos(g.avg("te"), "VCSH bình quân không dương") },

    { id: "dso", vi: "Số ngày phải thu (DSO)", group: "eff", unit: "days", better: "down", los: LOS.fat, formula: "Phải thu khách hàng bình quân ÷ Doanh thu thuần × 365", calc: g => g.avg("ar") / g.pos(g.cur("rev")) * 365 },
    { id: "dio", vi: "Số ngày tồn kho (DIO)", group: "eff", unit: "days", better: "down", los: LOS.inv, formula: "Hàng tồn kho bình quân ÷ Giá vốn × 365", calc: g => g.avg("inv") / g.pos(g.cur("cogs"), "Không có giá vốn") * 365 },
    { id: "dpo", vi: "Số ngày phải trả (DPO)", group: "eff", unit: "days", better: null, los: LOS.fat, proxy: true, formula: "Phải trả người bán bình quân ÷ Giá trị mua hàng × 365; mua hàng ≈ Giá vốn + tồn kho cuối − tồn kho đầu",
      calc: g => { g.notes.push("PROXY: VAS không trình bày giá trị mua hàng; ước tính = giá vốn + thay đổi tồn kho"); return g.avg("ap") / g.pos(g.cur("cogs") + g.cur("inv") - g.prev("inv"), "Giá trị mua hàng ước tính không dương") * 365; } },
    { id: "ccc", vi: "Chu kỳ tiền mặt (CCC)", group: "eff", unit: "days", better: "down", los: LOS.fat, proxy: true, formula: "DSO + DIO − DPO (DPO là ước tính)",
      calc: g => { g.notes.push("PROXY: dùng DPO ước tính"); const dso = g.avg("ar") / g.pos(g.cur("rev")) * 365, cogs = g.pos(g.cur("cogs"), "Không có giá vốn"), dio = g.avg("inv") / cogs * 365, dpo = g.avg("ap") / g.pos(cogs + g.cur("inv") - g.prev("inv"), "Giá trị mua hàng ước tính không dương") * 365; return dso + dio - dpo; } },

    { id: "cur", vi: "Hệ số thanh toán hiện hành", group: "liq", unit: "x", better: "up", los: LOS.fat, formula: "Tài sản ngắn hạn ÷ Nợ ngắn hạn", calc: g => g.cur("ca") / g.pos(g.cur("cl")) },
    { id: "quick", vi: "Hệ số thanh toán nhanh", group: "liq", unit: "x", better: "up", los: LOS.fat, formula: "(Tiền + Đầu tư tài chính ngắn hạn + Phải thu khách hàng) ÷ Nợ ngắn hạn",
      calc: g => (g.cur("cash") + g.opt("st_inv", "Không có đầu tư tài chính ngắn hạn — tính bằng 0") + g.cur("ar")) / g.pos(g.cur("cl")) },
    { id: "cash_r", vi: "Hệ số tiền mặt", group: "liq", unit: "x", better: "up", los: LOS.fat, formula: "Tiền và tương đương tiền ÷ Nợ ngắn hạn", calc: g => g.cur("cash") / g.pos(g.cur("cl")) },

    { id: "debt", vi: "Tổng nợ vay", group: "lev", unit: "vnd", better: null, los: LOS.bal, formula: "Vay ngắn hạn + Vay dài hạn", calc: g => borrowings(g, g.cur) },
    { id: "de", vi: "Nợ vay / VCSH", group: "lev", unit: "x", better: "down", los: LOS.fat, formula: "(Vay ngắn hạn + Vay dài hạn) ÷ VCSH", calc: g => borrowings(g, g.cur) / g.pos(g.cur("te"), "VCSH không dương") },
    { id: "d_a", vi: "Nợ vay / Tổng tài sản", group: "lev", unit: "pct", better: "down", los: LOS.fat, formula: "(Vay ngắn hạn + Vay dài hạn) ÷ Tổng tài sản", calc: g => borrowings(g, g.cur) / g.pos(g.cur("ta")) },
    { id: "st_share", vi: "Tỷ trọng vay ngắn hạn", group: "lev", unit: "pct", better: "down", los: LOS.bal, formula: "Vay ngắn hạn ÷ Tổng nợ vay",
      calc: g => { const d = g.pos(borrowings(g, g.cur), "Không có nợ vay"); return (g.has("std") ? g.cur("std") : 0) / d; } },
    { id: "debt_g", vi: "Tăng trưởng nợ vay", group: "lev", unit: "pct", better: null, los: LOS.bal, formula: "Tổng nợ vay cuối năm t ÷ cuối năm t−1 − 1",
      calc: g => borrowings(g, g.cur) / g.pos(borrowings(g, g.prev), "Không có nợ vay năm trước") - 1 },
    { id: "int_cov", vi: "Khả năng trả lãi (EBIT / lãi vay)", group: "lev", unit: "x", better: "up", los: LOS.fat, formula: "(LNTT + Chi phí lãi vay) ÷ Chi phí lãi vay; EBIT ≈ LNTT + lãi vay",
      calc: g => (g.cur("pbt") + g.cur("int_exp")) / g.pos(g.cur("int_exp"), "Không có chi phí lãi vay — chỉ số không áp dụng") },

    { id: "cfo_ni", vi: "CFO / LNST", group: "cash", unit: "x", better: "up", los: LOS.frq, formula: "Lưu chuyển tiền thuần từ HĐKD ÷ LNST", calc: g => g.cur("cfo") / g.pos(g.cur("ni"), "LNST không dương — tỷ lệ không có ý nghĩa") },
    { id: "accr", vi: "Tỷ lệ dồn tích (accruals)", group: "cash", unit: "pct", better: "down", los: LOS.frq, formula: "(LNST − CFO) ÷ Tổng tài sản bình quân", calc: g => (g.cur("ni") - g.cur("cfo")) / g.pos(g.avg("ta")) },
    { id: "fcf", vi: "Dòng tiền tự do (FCF)", group: "cash", unit: "vnd", better: "up", los: LOS.cf2, formula: "CFO + Tiền chi mua sắm TSCĐ (số âm)", calc: g => g.cur("cfo") + g.cur("capex") },
    { id: "cfo_rev", vi: "CFO / Doanh thu", group: "cash", unit: "pct", better: "up", los: LOS.cf2, formula: "Lưu chuyển tiền thuần từ HĐKD ÷ Doanh thu thuần", calc: g => g.cur("cfo") / g.pos(g.cur("rev")) }
  ];
  const METRIC = Object.fromEntries(METRICS.map(m => [m.id, m]));

  // Ratios for every year that has a previous year (averages and growth need one)
  function computeMetrics(ds) {
    const years = ds.years.slice(1), results = {};
    METRICS.forEach(m => {
      const byYear = {};
      years.forEach(y => {
        const g = getter(ds, y);
        const uniq = list => list.filter((p, i) => list.findIndex(q => q.item === p.item && q.year === p.year) === i);
        try {
          const v = m.calc(g);
          byYear[y] = isNum(v) ? { v, inputs: uniq(g.inputs), notes: g.notes, proxy: !!m.proxy } : { v: null, reason: "Kết quả không xác định", inputs: uniq(g.inputs), notes: g.notes };
        } catch (e) {
          if (!(e instanceof Unavailable)) throw e;
          byYear[y] = { v: null, reason: e.message, inputs: uniq(g.inputs), notes: g.notes };
        }
      });
      results[m.id] = { def: m, byYear };
    });
    return { years, results, engine: ENGINE_VERSION };
  }

  // ---------- Trends ----------
  // first/last available value of a ratio, its relative and absolute change, the average
  function trend(res, id) {
    const r = res.results[id];
    if (!r) return null;
    const pts = res.years.map(y => ({ year: y, v: r.byYear[y].v })).filter(p => isNum(p.v));
    if (pts.length < 2) return pts.length === 1 ? { first: pts[0].v, last: pts[0].v, firstYear: pts[0].year, lastYear: pts[0].year, rel: 0, abs: 0, avg: pts[0].v, n: 1, points: pts } : null;
    const first = pts[0].v, last = pts[pts.length - 1].v;
    return { first, last, firstYear: pts[0].year, lastYear: pts[pts.length - 1].year, rel: first !== 0 ? (last - first) / Math.abs(first) : 0, abs: last - first, avg: pts.reduce((s, p) => s + p.v, 0) / pts.length, n: pts.length, points: pts };
  }
  // a statement line over all years of the dataset; cagr between the first and last reported values
  function itemTrend(ds, item) {
    const pts = ds.years.map(y => ({ year: y, v: ds.values[y][item] })).filter(p => isNum(p.v));
    if (pts.length < 2) return null;
    const first = pts[0].v, last = pts[pts.length - 1].v, span = pts[pts.length - 1].year - pts[0].year;
    return { first, last, firstYear: pts[0].year, lastYear: pts[pts.length - 1].year, rel: first !== 0 ? (last - first) / Math.abs(first) : 0, cagr: first > 0 && last > 0 && span > 0 ? Math.pow(last / first, 1 / span) - 1 : null, n: pts.length, points: pts };
  }
  // sum of a flow item over the given years (null when any year is missing)
  function sumItem(ds, item, years) {
    let s = 0;
    for (const y of years) { const v = ds.values[y] && ds.values[y][item]; if (!isNum(v)) return null; s += v; }
    return s;
  }
  function itemValue(ds, item, year) { const v = ds.values[year] && ds.values[year][item]; return isNum(v) ? v : null; }

  return { ENGINE_VERSION, SCHEMA, ITEMS, ORDER, SUBTOTALS, REQUIRED, METRICS, METRIC, GROUPS, LOS, normalize, validate, manifest, computeMetrics, trend, itemTrend, sumItem, itemValue, Unavailable };
});

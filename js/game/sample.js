// ============================================================
// js/game/sample.js — the bundled training case (SIMULATED data, fictional company)
//
// The statements are built from a few drivers. Every balance-sheet change has
// its line in the cash flow statement, so assets = liabilities + equity and the
// cash reconciles by construction (the tests check it). Nothing here describes a
// real company; the dataset is labelled SIMULATED everywhere it appears.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FWSample = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // triệu đồng (million VND)
  const DRIVERS = {
    open: { cash: 80000, st_inv: 20000, ar: 100000, inv: 90000, oca: 12000, ppe: 220000, cip: 20000, ona: 15000,
      ap: 70000, std: 60000, ocl: 40000, ltd: 80000, oncl: 5000, sc: 200000, oe: 4000 },
    years: [2022, 2023, 2024, 2025],
    rev: [1150000, 1380000, 1656000, 1954080],
    gm: [0.200, 0.205, 0.210, 0.212],
    sga: [0.110, 0.108, 0.104, 0.100],
    dep: [24000, 26000, 28000, 30000],
    finInc: [3000, 3000, 3000, 3000],
    arDays: [40, 58, 80, 98],          // trade receivables at year-end, in days of revenue
    invDays: [41, 40, 38, 37],         // inventories, in days of cost of goods sold
    apDays: [32, 31, 30, 28],          // trade payables, in days of cost of goods sold
    oclPct: 0.035,                     // other current liabilities, share of revenue
    capex: [45000, 50000, 48000, 45000],    // new distribution centres for the supermarket channel
    cipAdd: [5000, 5000, 5000, 5000],
    std: [75000, 130000, 190000, 260000],
    ltd: [75000, 70000, 65000, 60000],
    rate: 0.09, tax: 0.20, payout: 0.30
  };

  function build() {
    const d = DRIVERS, o = d.open, r = Math.round;
    const s = { ...o, re: 0 };
    const taOpen = o.cash + o.st_inv + o.ar + o.inv + o.oca + o.ppe + o.cip + o.ona;
    const tlOpen = o.ap + o.std + o.ocl + o.ltd + o.oncl;
    s.re = taOpen - tlOpen - o.sc - o.oe;               // retained earnings balance the opening statement
    const values = {}, periodMeta = {};
    d.years.forEach((y, i) => {
      const rev = d.rev[i], cogs = r(rev * (1 - d.gm[i])), gp = rev - cogs, sga = r(rev * d.sga[i]);
      const debtBeg = s.std + s.ltd, debtEnd = d.std[i] + d.ltd[i];
      const int = r(d.rate * (debtBeg + debtEnd) / 2);
      const op = gp - sga + d.finInc[i] - int, pbt = op, tax = r(d.tax * pbt), ni = pbt - tax, div = r(d.payout * ni);
      const ar = r(rev * d.arDays[i] / 365), inv = r(cogs * d.invDays[i] / 365), ap = r(cogs * d.apDays[i] / 365), ocl = r(rev * d.oclPct), oca = s.oca;
      const cfo = ni + d.dep[i] - (ar - s.ar) - (inv - s.inv) - (oca - s.oca) + (ap - s.ap) + (ocl - s.ocl);
      const capex = -(d.capex[i] + d.cipAdd[i]), cfi = capex;
      const cff = (d.std[i] - s.std) + (d.ltd[i] - s.ltd) - div;
      const net = cfo + cfi + cff, beg = s.cash, end = beg + net;
      Object.assign(s, { cash: end, ar, inv, ap, ocl, oca, ppe: s.ppe + d.capex[i] - d.dep[i], cip: s.cip + d.cipAdd[i], std: d.std[i], ltd: d.ltd[i], re: s.re + ni - div });
      const ca = s.cash + s.st_inv + ar + inv + oca, ta = ca + s.ppe + s.cip + s.ona;
      const cl = ap + s.std + ocl, tl = cl + s.ltd + s.oncl, te = s.sc + s.re + s.oe;
      values[y] = { cash: s.cash, st_inv: s.st_inv, ar, inv, ca, ta, ap, std: s.std, cl, ltd: s.ltd, tl, te, nci: 0, tle: tl + te,
        rev, cogs, gp, int_exp: int, op, pbt, ni, ni_parent: ni, dep: d.dep[i], cfo, capex, cfi, cff, cf_net: net, cf_beg: beg, cf_fx: 0, cf_end: end };
      periodMeta[y] = { audit: "simulated" };
    });
    return {
      schema: "fw-dataset/1", id: "sim-lotus-harvest", class: "SIMULATED",
      company: { name: "Lotus Harvest Foods JSC", ticker: "SIM-LHF", exchange: "Hư cấu", sector: "Thực phẩm và phân phối (hư cấu)", fictional: true },
      scope: { basis: "consolidated", framework: "Mô phỏng theo mẫu VAS", periodType: "annual", currency: "VND", unit: 1e6 },
      years: d.years.slice(), values, periodMeta,
      lineage: {},
      source: { provider: "Financial World — bộ dữ liệu huấn luyện", version: "1.0.0", attribution: "Dữ liệu mô phỏng, doanh nghiệp hư cấu", license: "Thuộc trò chơi; không mô tả doanh nghiệp có thật.", note: "Sinh từ các tham số trong js/game/sample.js" },
      story: {
        brief: "Lotus Harvest công bố doanh thu và lợi nhuận tăng ba năm liền nhờ mở rộng kênh siêu thị. Ban điều hành nói tăng trưởng đến từ hoạt động cốt lõi.",
        epilogue: "Mười hai tháng sau (kịch bản mô phỏng): Lotus Harvest trích lập thêm 190 tỷ đồng dự phòng phải thu khó đòi từ hai chuỗi siêu thị chậm trả; lợi nhuận năm 2026 giảm gần một nửa và công ty phải gia hạn các khoản vay ngắn hạn."
      }
    };
  }

  let cached = null;
  return { DRIVERS, dataset: () => cached || (cached = build()) };
});

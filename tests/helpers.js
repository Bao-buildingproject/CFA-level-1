// Shared fixture for the game tests: a small company in tỷ đồng (unit 1e9) whose
// ratios are easy to check by hand. Every identity holds; tests break one at a time.
const E = require("../js/game/engine.js");

function fixture() {
  return {
    schema: "fw-dataset/1", id: "fixture", class: "SIMULATED",
    company: { name: "Fixture Co (hư cấu)", ticker: "FIX", fictional: true },
    scope: { basis: "consolidated", framework: "VAS", periodType: "annual", currency: "VND", unit: 1e9 },
    years: [2023, 2024, 2025],
    values: {
      2023: { cash: 10, st_inv: 5, ar: 20, inv: 15, ca: 50, ta: 100, ap: 10, std: 15, cl: 30, ltd: 20, tl: 50, te: 50, nci: 5, tle: 100,
        rev: 120, cogs: 90, gp: 30, int_exp: 2, op: 12, pbt: 12, ni: 9, ni_parent: 8, dep: 5, cfo: 10, capex: -6, cfi: -6, cff: -2, cf_net: 2, cf_beg: 8, cf_fx: 0, cf_end: 10 },
      2024: { cash: 12, st_inv: 5, ar: 26, inv: 17, ca: 60, ta: 115, ap: 12, std: 20, cl: 37, ltd: 20, tl: 60, te: 55, nci: 5, tle: 115,
        rev: 140, cogs: 104, gp: 36, int_exp: 2.5, op: 14, pbt: 14, ni: 10.5, ni_parent: 9.5, dep: 6, cfo: 7, capex: -8, cfi: -8, cff: 3, cf_net: 2, cf_beg: 10, cf_fx: 0, cf_end: 12 },
      2025: { cash: 9, st_inv: 5, ar: 35, inv: 21, ca: 70, ta: 130, ap: 13, std: 30, cl: 48, ltd: 18, tl: 70, te: 60, nci: 6, tle: 130,
        rev: 160, cogs: 120, gp: 40, int_exp: 3.5, op: 15, pbt: 15, ni: 11.25, ni_parent: 10.25, dep: 7, cfo: 4, capex: -9, cfi: -9, cff: 2, cf_net: -3, cf_beg: 12, cf_fx: 0, cf_end: 9 }
    },
    periodMeta: { 2023: { audit: "audited" }, 2024: { audit: "audited" }, 2025: { audit: "audited" } },
    source: { provider: "Test fixture" }
  };
}
const clone = o => JSON.parse(JSON.stringify(o));
// normalise a raw dataset and fail loudly if it cannot be read
function load(raw) {
  const n = E.normalize(raw);
  if (!n.ok) throw new Error("fixture did not normalise: " + n.errors.join("; "));
  return n.ds;
}
const metric = (res, id, y) => res.results[id].byYear[y];
const check = (val, id) => val.checks.find(c => c.id === id);

module.exports = { fixture, clone, load, metric, check };

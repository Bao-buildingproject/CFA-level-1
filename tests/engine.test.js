// Financial Engine: units, validation gates, ratio formulas, unavailable data.
// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/game/engine.js");
const { fixture, clone, load, metric, check } = require("./helpers.js");

const B = 1e9;
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test("normalize converts the source unit to VND and keeps the labels", () => {
  const n = E.normalize(fixture());
  assert.equal(n.ok, true, n.errors.join("; "));
  assert.equal(n.ds.values[2025].rev, 160 * B);
  assert.equal(n.ds.scope.sourceUnit, "tỷ đồng");
  assert.equal(n.ds.class, "SIMULATED");
  assert.equal(n.ds.company.fictional, true);
});

test("normalize rejects what it cannot read and says why", () => {
  const bad = fixture(); bad.schema = "other";
  assert.match(E.normalize(bad).errors.join(" "), /Sai định dạng/);
  const unit = fixture(); unit.scope.unit = 7;
  assert.match(E.normalize(unit).errors.join(" "), /Đơn vị không hỗ trợ/);
  const text = fixture(); text.values[2024].rev = "140";
  const n = E.normalize(text);
  assert.equal(n.ok, false);
  assert.match(n.errors.join(" "), /Giá trị không phải số: rev năm 2024/);
  const label = fixture(); delete label.class;
  assert.match(E.normalize(label).errors.join(" "), /REAL hoặc SIMULATED/);
});

test("normalize drops unknown lines with a warning and fixes the sign convention", () => {
  const raw = fixture();
  raw.values[2025].goodwill_extra = 3;
  raw.values[2025].cogs = -120;      // some sources show costs as negatives
  raw.values[2025].capex = 9;        // and outflows as positives
  const n = E.normalize(raw);
  assert.equal(n.ok, true);
  assert.match(n.warnings.join(" "), /goodwill_extra/);
  assert.equal(n.ds.values[2025].cogs, 120 * B);
  assert.equal(n.ds.values[2025].capex, -9 * B);
});

test("the fixture passes every check", () => {
  const v = E.validate(load(fixture()));
  assert.equal(v.publishable, true);
  v.checks.forEach(c => assert.equal(c.status, "pass", `${c.id}: ${c.detail}`));
});

test("an unbalanced balance sheet is NOT PUBLISHABLE", () => {
  const raw = fixture(); raw.values[2024].ta = 116;
  const v = E.validate(load(raw));
  assert.equal(v.publishable, false);
  assert.equal(check(v, "equation").status, "fail");
  assert.match(check(v, "equation").detail, /2024: lệch 1 tỷ/);
  assert.equal(check(v, "total_sources").status, "fail");
});

test("cash that does not roll forward or tie to the balance sheet blocks the case", () => {
  const raw = fixture(); raw.values[2025].cf_end = 10;
  const v = E.validate(load(raw));
  assert.equal(v.publishable, false);
  assert.equal(check(v, "cf_roll").status, "fail");
  assert.equal(check(v, "cash_tie").status, "fail");
});

test("cash flow sections must add up", () => {
  const raw = fixture(); raw.values[2023].cfi = -7;
  const v = E.validate(load(raw));
  assert.equal(check(v, "cf_sections").status, "fail");
  assert.equal(v.publishable, false);
});

test("years must be consecutive and at least three", () => {
  const raw = fixture();
  raw.values = { 2021: raw.values[2023], 2024: raw.values[2024], 2025: raw.values[2025] };
  raw.years = [2021, 2024, 2025];
  const v = E.validate(load(raw));
  assert.equal(check(v, "years").status, "fail");
  const two = fixture(); two.years = [2024, 2025];
  assert.equal(check(E.validate(load(two)), "years").status, "fail");
});

test("a missing required line is named", () => {
  const raw = fixture(); delete raw.values[2024].cfo;
  const v = E.validate(load(raw));
  assert.equal(check(v, "required").status, "fail");
  assert.match(check(v, "required").detail, /Lưu chuyển tiền thuần từ hoạt động kinh doanh 2024/);
  assert.equal(v.publishable, false);
});

test("the data label must match the source", () => {
  const sim = fixture(); sim.company.fictional = false;
  assert.equal(check(E.validate(load(sim)), "class").status, "fail");
  const real = fixture(); real.class = "REAL";
  assert.equal(check(E.validate(load(real)), "class").status, "fail", "REAL data cannot describe a fictional company");
  const noSource = fixture(); noSource.class = "REAL"; noSource.company.fictional = false; noSource.source = {};
  assert.equal(check(E.validate(load(noSource)), "class").status, "fail", "REAL data needs a provider");
  const ok = fixture(); ok.class = "REAL"; ok.company.fictional = false;
  assert.equal(check(E.validate(load(ok)), "class").status, "pass");
});

test("a documented exception lets a known difference through, with its note", () => {
  const raw = fixture(); raw.values[2024].te = 54;      // assets 115 vs liabilities + equity 114
  assert.equal(check(E.validate(load(raw)), "equation").status, "fail");
  raw.exceptions = [{ check: "equation", year: 2024, note: "Làm tròn trong BCTC gốc" }];
  const c = check(E.validate(load(raw)), "equation");
  assert.equal(c.status, "pass");
  assert.match(c.detail, /ngoại lệ đã ghi nhận: 2024: Làm tròn trong BCTC gốc/);
});

test("warnings show but do not block: unit scale, continuity, audit status", () => {
  const scale = fixture();
  [2023, 2024, 2025].forEach(y => Object.assign(scale.values[y], { rev: 1, cogs: 0.5, gp: 0.5 }));
  const v1 = E.validate(load(scale));
  assert.equal(check(v1, "scale").status, "fail");
  assert.equal(check(v1, "scale").level, "warn");
  assert.equal(v1.publishable, true);

  const cont = fixture();
  Object.assign(cont.values[2025], { cf_beg: 11, cf_end: 8, cash: 8, ca: 69, ta: 129, te: 59, tle: 129 });
  const v2 = E.validate(load(cont));
  assert.equal(check(v2, "continuity").status, "fail");
  assert.equal(v2.publishable, true);

  const audit = fixture(); audit.periodMeta[2025] = { audit: "unaudited" };
  const v3 = E.validate(load(audit));
  assert.equal(check(v3, "audit").status, "fail");
  assert.match(check(v3, "audit").detail, /2025 \(unaudited\)/);
  assert.equal(v3.publishable, true);

  const restated = fixture(); restated.periodMeta[2024] = { audit: "restated", restated: true };
  const v4 = E.validate(load(restated));
  assert.equal(check(v4, "audit").status, "fail");
  assert.doesNotMatch(check(v4, "audit").detail, /Chưa kiểm toán/, "a restated year is audited");
  assert.match(check(v4, "audit").detail, /hồi tố: 2024/);
});

test("ratios match hand calculations (2025)", () => {
  const res = E.computeMetrics(load(fixture()));
  assert.deepEqual(res.years, [2024, 2025]);
  const v = id => metric(res, id, 2025).v;
  close(v("dso"), 30.5 / 160 * 365);                       // average receivables (26 + 35) / 2
  close(v("dio"), 19 / 120 * 365);
  close(v("dpo"), 12.5 / (120 + 21 - 17) * 365);           // purchases ≈ COGS + change in inventory
  close(v("ccc"), 30.5 / 160 * 365 + 19 / 120 * 365 - 12.5 / 124 * 365);
  close(v("cur"), 70 / 48);
  close(v("quick"), (9 + 5 + 35) / 48);
  close(v("cash_r"), 9 / 48);
  close(v("debt"), 48 * B);
  close(v("de"), 48 / 60);
  close(v("d_a"), 48 / 130);
  close(v("st_share"), 30 / 48);
  close(v("debt_g"), 48 / 40 - 1);
  close(v("int_cov"), (15 + 3.5) / 3.5);
  close(v("cfo_ni"), 4 / 11.25);
  close(v("accr"), (11.25 - 4) / 122.5);
  close(v("fcf"), -5 * B);
  close(v("cfo_rev"), 4 / 160);
  close(v("gm"), 40 / 160);
  close(v("nm"), 11.25 / 160);
  close(v("roa"), 11.25 / 122.5);
  close(v("roe"), 10.25 / ((50 + 54) / 2));                // parent: (equity − NCI) averaged
  close(v("ato"), 160 / 122.5);
  close(v("em"), 122.5 / 57.5);
  close(v("rev_g"), 160 / 140 - 1);
  close(v("ni_g"), 11.25 / 10.5 - 1);
  close(v("ar_g"), 35 / 26 - 1);
  close(v("ar_rev_gap"), (35 / 26 - 1) - (160 / 140 - 1));
  close(v("inv_cogs_gap"), (21 / 17 - 1) - (120 / 104 - 1));
});

test("DuPont: net margin × asset turnover × equity multiplier = ROE on total equity", () => {
  const raw = fixture();
  [2023, 2024, 2025].forEach(y => { delete raw.values[y].ni_parent; delete raw.values[y].nci; });
  const res = E.computeMetrics(load(raw));
  [2024, 2025].forEach(y => {
    const v = id => metric(res, id, y).v;
    close(v("roe"), v("nm") * v("ato") * v("em"), 1e-12);
    assert.match(metric(res, "roe", y).notes.join(" "), /dùng LNST và VCSH toàn công ty/);
  });
});

test("every ratio records its inputs, once each", () => {
  const res = E.computeMetrics(load(fixture()));
  const dso = metric(res, "dso", 2025);
  assert.deepEqual(dso.inputs.map(i => `${i.item}@${i.year}`).sort(), ["ar@2024", "ar@2025", "rev@2025"]);
  assert.equal(dso.inputs.find(i => i.item === "rev").v, 160 * B);
  const ccc = metric(res, "ccc", 2025);
  assert.equal(new Set(ccc.inputs.map(i => `${i.item}@${i.year}`)).size, ccc.inputs.length);
  assert.equal(ccc.proxy, true);
  assert.match(metric(res, "dpo", 2025).notes[0], /^PROXY/);
});

test("missing data makes a ratio unavailable with the reason, never a number", () => {
  const raw = fixture();
  [2023, 2024, 2025].forEach(y => delete raw.values[y].inv);
  raw.values[2025].int_exp = 0;
  raw.values[2025].ni = -2; raw.values[2025].ni_parent = -2;
  const res = E.computeMetrics(load(raw));
  const dio = metric(res, "dio", 2025);
  assert.equal(dio.v, null);
  assert.match(dio.reason, /Hàng tồn kho/);
  assert.equal(metric(res, "ccc", 2025).v, null);
  assert.equal(metric(res, "int_cov", 2025).v, null);
  assert.match(metric(res, "int_cov", 2025).reason, /Không có chi phí lãi vay/);
  assert.equal(metric(res, "cfo_ni", 2025).v, null);
  assert.match(metric(res, "cfo_ni", 2025).reason, /LNST không dương/);
  // nothing in the registry is ever NaN or Infinity
  Object.values(res.results).forEach(r => Object.values(r.byYear).forEach(b => assert.ok(b.v === null || Number.isFinite(b.v))));
});

test("an optional line is counted as zero with a visible note", () => {
  const raw = fixture();
  [2023, 2024, 2025].forEach(y => delete raw.values[y].st_inv);
  const q = metric(E.computeMetrics(load(raw)), "quick", 2025);
  close(q.v, (9 + 35) / 48);
  assert.match(q.notes.join(" "), /Không có đầu tư tài chính ngắn hạn — tính bằng 0/);
});

test("dataset ids are made safe for links and storage keys", () => {
  const raw = fixture(); raw.id = 'bad id/"><script>';
  assert.match(E.normalize(raw).ds.id, /^[A-Za-z0-9._-]+$/);
});

test("manifest lists what is in the file and what is not", () => {
  const ds = load(fixture());
  const m = E.manifest(ds);
  assert.equal(m.reconciled, true);
  assert.deepEqual(m.rows.map(r => [r.id, r.retrieved, r.qa]), [["bs", 3, "PASS"], ["is", 3, "PASS"], ["cf", 3, "PASS"]]);
  assert.ok(m.outOfScope.some(o => o.id === "notes"));
  const broken = fixture(); broken.values[2024].ta = 116;
  assert.equal(E.manifest(load(broken)).rows.find(r => r.id === "bs").qa, "FAIL");
});

test("trends and sums skip nothing silently", () => {
  const ds = load(fixture());
  const res = E.computeMetrics(ds);
  const t = E.trend(res, "dso");
  assert.equal(t.firstYear, 2024);
  assert.equal(t.lastYear, 2025);
  const it = E.itemTrend(ds, "rev");
  close(it.cagr, Math.sqrt(160 / 120) - 1);
  assert.equal(E.sumItem(ds, "cfo", ds.years), 21 * B);
  const raw = fixture(); delete raw.values[2024].capex;
  assert.equal(E.sumItem(load(raw), "capex", [2023, 2024, 2025]), null);
});

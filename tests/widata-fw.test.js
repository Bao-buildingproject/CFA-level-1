// The WiData converter: column mapping, lineage, audit status, compact tables, packs.
// Uses synthetic rows built from the test fixture: no WiData data in this repository.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const E = require("../js/game/engine.js");
const T = require("../tools/widata-fw.js");
const { fixture } = require("./helpers.js");

// fixture values (tỷ đồng) written out as fs_nonfin rows in VND
function rows(ticker = "FIX") {
  const f = fixture();
  return f.years.map(y => {
    const r = { symbol: ticker, year: y, quarter: 0, consolidation_id: 2, audit_status_id: y === 2024 ? 4 : 3 };
    Object.entries(T.FS_NONFIN).forEach(([k, [col]]) => { if (f.values[y][k] !== undefined) r[col] = f.values[y][k] * 1e9; });
    return r;
  });
}

test("rows map to the game's line items with their source columns", () => {
  const { ds } = T.build(rows(), { ticker: "fix", name: "Fixture Co", retrieved: "2026-11-20" });
  assert.equal(ds.id, "widata-fix-2023-2025");
  assert.equal(ds.class, "REAL");
  assert.equal(ds.values[2025].rev, 160e9);
  assert.equal(ds.values[2025].cash, 9e9);
  assert.equal(ds.lineage.ar.column, "bs131");
  assert.equal(ds.lineage.cfo.column, "cf20");
  assert.equal(ds.periodMeta[2024].audit, "restated");
  assert.equal(ds.source.attribution, "WiData MCP by WiGroup");
  const n = E.normalize(ds);
  assert.equal(n.ok, true);
  assert.equal(E.validate(n.ds).publishable, true);
});

test("the compact cot/dong table and other tickers' rows are handled", () => {
  const all = [...rows("FIX"), ...rows("OTHER")];
  const cot = Object.keys(all[0]);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fw-")), "rows.json");
  fs.writeFileSync(file, JSON.stringify({ data: { cot, dong: all.map(r => cot.map(k => r[k])) } }));
  const read = T.readRows(file);
  assert.equal(read.length, 6);
  const { ds } = T.build(read, { ticker: "OTHER" });
  assert.deepEqual(ds.years, [2023, 2024, 2025]);
  assert.equal(ds.company.ticker, "OTHER");
});

test("a pack holds one dataset per ticker", () => {
  const pack = T.pack([...rows("AAA"), ...rows("BBB")], { AAA: { name: "Công ty A" } }, { retrieved: "2026-11-20" });
  assert.equal(pack.schema, "fw-pack/1");
  assert.deepEqual(pack.datasets.map(d => d.company.ticker), ["AAA", "BBB"]);
  assert.equal(pack.datasets[0].company.name, "Công ty A");
});

test("no rows for the ticker is an error, not an empty file", () => {
  assert.throws(() => T.build(rows("AAA"), { ticker: "ZZZ" }), /Không có dòng/);
});

#!/usr/bin/env node
// ============================================================
// tools/widata-fw.js — turn WiData fs_nonfin rows into a Financial World dataset
//
// One company at a time, on request: fetch its annual consolidated statements
// with the WiData MCP (wi_data_companies · get_data · fs_nonfin, quarter 0,
// consolidation_id 2), save what the tool returned to a JSON file, then run:
//
//   node tools/widata-fw.js rows.json --ticker HPG --name "CTCP Tập đoàn Hòa Phát" \
//        --exchange HOSE --sector "Nguyên vật liệu" --retrieved 2026-11-20 --out hpg.fw.json
//
// rows.json may be an array of rows, { data: [...] }, or WiData's compact table
// { data: { cot: [...], dong: [[...]] } }. The script maps each column to the
// game's line items, records the column of every number (lineage), runs the
// engine's checks and writes the file. A file that fails a blocking check is
// still written, and the game will hold it in quarantine with the reasons.
//
// The output contains WiData data: personal use only. Do not commit it to this
// repository and do not share it. This script holds no data, only the mapping.
// ============================================================
"use strict";
const fs = require("fs");
const path = require("path");
const E = require("../js/game/engine.js");

// game line item -> fs_nonfin column, with the column's name in the WiData schema
const FS_NONFIN = {
  cash: ["bs110", "I. Tiền và tương đương tiền"], st_inv: ["bs120", "II. Đầu tư tài chính ngắn hạn"],
  ar: ["bs131", "1. Phải thu khách hàng ngắn hạn"], inv: ["bs140", "IV. Hàng tồn kho ròng"],
  ca: ["bs100", "A. Tài sản ngắn hạn"], ta: ["bs280", "Tổng tài sản"],
  ap: ["bs311", "1. Phải trả người bán ngắn hạn"], std: ["bs321", "11. Vay và thuê tài chính ngắn hạn"],
  cl: ["bs310", "I. Nợ ngắn hạn"], ltd: ["bs339", "9. Vay và thuê tài chính dài hạn"],
  tl: ["bs300", "C. Nợ phải trả"], te: ["bs400", "D. Vốn chủ sở hữu (gồm lợi ích cổ đông không kiểm soát)"],
  nci: ["bs429", "11. Lợi ích cổ đông thiểu số"], tle: ["bs440", "Tổng nguồn vốn"],
  rev: ["is10", "3. Doanh thu thuần"], cogs: ["is11", "4. Giá vốn hàng bán"], gp: ["is20", "5. Lợi nhuận gộp"],
  int_exp: ["is24", "Chi phí lãi vay"], op: ["is30", "12. Lợi nhuận thuần từ HĐKD"], pbt: ["is50", "16. Lợi nhuận trước thuế"],
  ni: ["is60", "19. Lợi nhuận sau thuế"], ni_parent: ["is62", "Lợi nhuận sau thuế công ty mẹ"],
  dep: ["cf02", "8.3 Khấu hao tài sản cố định và bất động sản đầu tư"], cfo: ["cf20", "LCTT từ hoạt động kinh doanh"],
  capex: ["cf21", "1. Tiền chi mua sắm xây dựng TSCĐ"], cfi: ["cf30", "LCTT từ hoạt động đầu tư"],
  cff: ["cf40", "LCTT từ hoạt động tài chính"], cf_net: ["cf50", "Lưu chuyển tiền thuần trong kỳ"],
  cf_beg: ["cf60", "Tiền và tương đương đầu kỳ"], cf_fx: ["cf61", "Ảnh hưởng của thay đổi tỷ giá"],
  cf_end: ["cf70", "Tiền và tương đương cuối kỳ"]
};
const COLUMNS = ["symbol", "year", "quarter", "consolidation_id", "audit_status_id", ...Object.values(FS_NONFIN).map(c => c[0])];
const AUDIT = { 1: "unaudited", 2: "reviewed", 3: "audited", 4: "restated" };

function readRows(file) {
  let j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (j && !Array.isArray(j) && j.data !== undefined) j = j.data;
  if (j && Array.isArray(j.cot) && Array.isArray(j.dong)) j = j.dong.map(r => Object.fromEntries(j.cot.map((k, i) => [k, r[i]])));
  if (!Array.isArray(j)) throw new Error("Không đọc được danh sách dòng dữ liệu");
  return j;
}

function build(rows, opt) {
  const ticker = String(opt.ticker || "").toUpperCase();
  const basis = opt.separate ? 1 : 2;
  const warnings = [];
  const mine = rows.filter(r => String(r.symbol).toUpperCase() === ticker && Number(r.quarter) === 0 && Number(r.consolidation_id) === basis);
  if (!mine.length) throw new Error(`Không có dòng báo cáo năm ${basis === 2 ? "hợp nhất" : "riêng lẻ"} nào của ${ticker}`);
  // one row per year; if a year comes twice keep the later report (restated > audited > reviewed > unaudited)
  const byYear = {};
  mine.forEach(r => {
    const y = Number(r.year), old = byYear[y];
    if (old) warnings.push(`Năm ${y} có hai dòng; giữ dòng có trạng thái kiểm toán ${Math.max(old.audit_status_id, r.audit_status_id)}`);
    if (!old || Number(r.audit_status_id) > Number(old.audit_status_id)) byYear[y] = r;
  });
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const values = {}, periodMeta = {};
  years.forEach(y => {
    const r = byYear[y];
    values[y] = Object.fromEntries(Object.entries(FS_NONFIN).map(([k, [col]]) => [k, typeof r[col] === "number" && isFinite(r[col]) ? r[col] : null]));
    periodMeta[y] = { audit: AUDIT[r.audit_status_id] || "không rõ", restated: Number(r.audit_status_id) === 4 };
  });
  return {
    warnings,
    ds: {
      schema: E.SCHEMA, id: `widata-${ticker.toLowerCase()}-${years[0]}-${years[years.length - 1]}`, class: "REAL",
      company: { name: opt.name || ticker, ticker, exchange: opt.exchange || "", sector: opt.sector || "", fictional: false },
      scope: { basis: basis === 2 ? "consolidated" : "separate", framework: "VAS", periodType: "annual", currency: "VND", unit: 1 },
      years, values, periodMeta,
      lineage: Object.fromEntries(Object.entries(FS_NONFIN).map(([k, [column, label]]) => [k, { column, label, transform: k === "capex" ? "giữ dấu âm (tiền chi ra)" : "" }])),
      source: {
        provider: "WiData MCP by WiGroup", endpoint: "wi_data_companies · fs_nonfin", retrievedAt: opt.retrieved || new Date().toISOString().slice(0, 10),
        attribution: "WiData MCP by WiGroup",
        license: "Chỉ dùng cá nhân cho mục đích học tập. Không phân phối lại, không đưa lên kho mã công khai.",
        version: `Báo cáo năm (quarter = 0), ${basis === 2 ? "hợp nhất (consolidation_id = 2)" : "riêng lẻ (consolidation_id = 1)"}`,
        note: "Mỗi năm lấy từ BCTC của chính năm đó (bản mới nhất), không lấy cột so sánh của năm sau."
      }
    }
  };
}

// several companies in one file: one dataset per ticker found in the rows
function pack(rows, meta, opt) {
  const tickers = [...new Set(rows.map(r => String(r.symbol).toUpperCase()))].sort();
  return {
    schema: "fw-pack/1", createdAt: opt.retrieved || new Date().toISOString().slice(0, 10),
    note: "Dữ liệu WiData MCP by WiGroup: chỉ dùng cá nhân, không phân phối lại.",
    datasets: tickers.map(tk => build(rows, { ...opt, ...((meta || {})[tk] || {}), ticker: tk }).ds)
  };
}

function parseArgs(argv) {
  const opt = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--separate") opt.separate = true;
    else if (a.startsWith("--")) opt[a.slice(2)] = argv[++i];
    else opt._.push(a);
  }
  return opt;
}

if (require.main === module && process.argv[2] === "pack") {
  // node tools/widata-fw.js pack --meta companies.json --retrieved YYYY-MM-DD --out pack.json rows1.json rows2.json …
  const opt = parseArgs(process.argv.slice(3));
  const rows = opt._.flatMap(readRows);
  const meta = opt.meta ? JSON.parse(fs.readFileSync(opt.meta, "utf8")) : {};
  const p = pack(rows, meta, opt);
  p.datasets.forEach(ds => {
    const val = E.validate(E.normalize(ds).ds);
    console.log(`${val.publishable ? "PUBLISHABLE    " : "NOT PUBLISHABLE"} ${ds.company.ticker.padEnd(5)} ${ds.years[0]}–${ds.years[ds.years.length - 1]} ${val.checks.filter(c => c.status !== "pass").map(c => c.detail).join(" · ")}`);
  });
  fs.writeFileSync(opt.out || "pack.fwpack.json", JSON.stringify(p));
  console.log(`${p.datasets.length} công ty → ${opt.out || "pack.fwpack.json"}`);
} else if (require.main === module) {
  const opt = parseArgs(process.argv.slice(2));
  if (opt.columns !== undefined || !opt._[0] || !opt.ticker) {
    console.log(`Cột cần lấy ở fs_nonfin:\n${COLUMNS.join(",")}\n\nCách dùng: node tools/widata-fw.js rows.json --ticker MÃ [--name "..."] [--exchange HOSE] [--sector "..."] [--retrieved YYYY-MM-DD] [--out file] [--separate]`);
    process.exit(opt._[0] && opt.ticker ? 0 : 1);
  }
  const { ds, warnings } = build(readRows(opt._[0]), opt);
  const n = E.normalize(ds);
  if (!n.ok) { console.error("Không chuẩn hoá được:", n.errors.join("; ")); process.exit(2); }
  const val = E.validate(n.ds);
  warnings.concat(n.warnings).forEach(w => console.warn("Lưu ý:", w));
  val.checks.filter(c => c.status !== "pass").forEach(c => console.log(`${c.level === "block" ? "CHẶN" : "CẢNH BÁO"} ${c.label}: ${c.detail}`));
  const out = opt.out || path.join(path.dirname(opt._[0]), `${ds.id}.fw.json`);
  fs.writeFileSync(out, JSON.stringify(ds, null, 2));
  console.log(`${val.publishable ? "PUBLISHABLE" : "NOT PUBLISHABLE (game sẽ cách ly)"} · ${ds.company.ticker} ${ds.years[0]}–${ds.years[ds.years.length - 1]} → ${out}`);
}

module.exports = { FS_NONFIN, COLUMNS, build, pack, readRows };

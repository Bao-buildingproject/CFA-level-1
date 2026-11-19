// ============================================================
// trade.js — Giả lập chứng khoán (paper trading) with real Vietnamese prices
//
// Prices: VPS price board (quotes, order book, foreign trading, index
// values, VN30/HNX30 lists) and VNDirect charts (history, VN-Index).
// Both answer browsers directly. Money is virtual; orders follow the main
// HOSE rules: 100-share lots, tick sizes, ceiling/floor band, day orders,
// T+2 settlement, broker fee and the 0.1% tax on sales.
// This page is in Vietnamese; the rest of the site is in English.
// ============================================================

const TR_API = "https://bgapidatafeed.vps.com.vn/";
const TR_BARS = "https://dchart-api.vndirect.com.vn/dchart/history";
const TR_FEE = 0.0015, TR_TAX = 0.001, TR_LOT = 100;
const TR_START_CASH = 1000000000;     // every account starts with 1 billion ₫ of virtual money
const TR_VN30 = ["ACB", "BID", "BSR", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB", "MCH", "MSN", "MWG", "SAB",
  "SHB", "SSB", "SSI", "STB", "TCB", "TCX", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VPL", "VRE"];
const TR_WATCH = ["FPT", "VNM", "HPG", "VCB", "SSI", "MWG"];
const TR_MARKET = { STO: "HOSE", STX: "HNX", UPX: "UPCoM" };
const TR_INDEX = [["10", "VN-Index"], ["11", "VN30"], ["02", "HNX-Index"], ["03", "UPCoM"]];
// Board groups: the two index lists come live from VPS; the sector lists are fixed
const TR_GROUPS = [
  ["watch", "Theo dõi"], ["VN30", "VN30"], ["HNX30", "HNX30"],
  ["bank", "Ngân hàng", ["ACB", "BID", "CTG", "EIB", "HDB", "LPB", "MBB", "MSB", "NAB", "OCB", "SHB", "SSB", "STB", "TCB", "TPB", "VCB", "VIB", "VPB"]],
  ["sec", "Chứng khoán", ["SSI", "VND", "HCM", "VCI", "SHS", "MBS", "FTS", "BSI", "CTS", "VIX", "VDS", "AGR", "ORS"]],
  ["re", "Bất động sản", ["VHM", "VIC", "VRE", "NVL", "PDR", "DXG", "KDH", "NLG", "DIG", "CEO", "KBC", "IDC", "HDG", "DXS"]],
  ["hold", "Đang nắm giữ"]
];
const TRADE = { q: {}, at: 0, err: "", loading: false, timer: null, tab: "board", group: "VN30", lists: {}, idx: null, prev: {}, bars: {}, range: "3M", side: "B", type: "LO", vnindex: null };

// ---------- Account ----------
function tradeData() {
  if (!DATA.trade) DATA.trade = { v: 2, initial: TR_START_CASH, start: trToday(), cash: TR_START_CASH, holdings: {}, orders: [], watch: TR_WATCH.slice(), nav: [], navx: [], fees: 0 };
  const T = DATA.trade;
  T.holdings = T.holdings || {}; T.orders = T.orders || []; T.watch = T.watch || TR_WATCH.slice(); T.nav = T.nav || []; T.navx = T.navx || [];
  if (!(T.v >= 2)) {                 // accounts opened with 100 m ₫ are topped up to 1 billion; P/L stays the same
    const add = Math.max(0, TR_START_CASH - (T.initial || 0));
    if (add) { T.initial += add; T.cash += add; T.nav.forEach(p => { p.v += add; }); T.navx.forEach(p => { p.v += add; }); }
    T.v = 2;
  }
  return T;
}
// Vietnam time (UTC+7) — the exchange clock, whatever the device's time zone
function trClock() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return { dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d.toISOString().slice(0, 10) };
}
const trToday = () => trClock().date;
function trStatus() {
  const { dow, min } = trClock();
  if (dow === 0 || dow === 6) return { code: "closed", label: "Cuối tuần · nghỉ giao dịch" };
  if (min < 9 * 60) return { code: "closed", label: "Mở cửa lúc 9:00" };
  if (min < 11 * 60 + 30) return { code: "open", label: "Đang giao dịch" };
  if (min < 13 * 60) return { code: "break", label: "Nghỉ trưa · mở lại 13:00" };
  if (min < 14 * 60 + 45) return { code: "open", label: "Đang giao dịch" };
  return { code: "closed", label: "Đã đóng cửa · mở lại 9:00" };
}
// Trading days (Mon–Fri) after date a, up to and including date b
function trTradingDaysAfter(a, b) {
  let n = 0;
  const d = new Date(a + "T00:00:00Z"), end = new Date(b + "T00:00:00Z");
  while (d < end) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w && w !== 6) n++; }
  return n;
}
const trUnsettled = h => (h.lots || []).filter(l => trTradingDaysAfter(l.d, trToday()) < 2).reduce((s, l) => s + l.qty, 0);
function trPending(sym, side) { return tradeData().orders.filter(o => o.status === "pending" && (!sym || o.sym === sym) && (!side || o.side === side)); }
function trReservedCash() { return trPending(null, "B").reduce((s, o) => s + o.qty * o.price * 1000 * (1 + TR_FEE), 0); }
function trAvailableCash() { return Math.max(0, tradeData().cash - trReservedCash()); }
function trAvailableShares(sym) {
  const h = tradeData().holdings[sym];
  if (!h) return 0;
  return Math.max(0, h.qty - trUnsettled(h) - trPending(sym, "S").reduce((s, o) => s + o.qty, 0));
}
function trNav() {
  const T = tradeData();
  return T.cash + Object.entries(T.holdings).reduce((s, [sym, h]) => s + h.qty * (TRADE.q[sym] ? TRADE.q[sym].last : h.cost / h.qty / 1000) * 1000, 0);
}

// ---------- Formatting (numbers as on Vietnamese price boards) ----------
const trP = p => (p || 0).toFixed(2);
const trVND = n => `${Math.round(n || 0).toLocaleString("en-US")} ₫`;
const trInt = n => Math.round(n || 0).toLocaleString("en-US");
const trBig = n => `${(n / 1e6).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small class="tr-unit">triệu ₫</small>`;
const trSigned = (n, f = trVND) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f(Math.abs(n))}`;
const trPct = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n || 0).toFixed(2)}%`;
const trDate = d => d ? d.split("-").reverse().join("/") : "";
// Colour of a price against the reference, ceiling and floor
function trPxClass(q, p) {
  if (!q || !p) return "";
  if (q.ceil && p >= q.ceil) return "px-ceil";
  if (q.floor && p <= q.floor) return "px-floor";
  return p > q.ref ? "px-up" : p < q.ref ? "px-down" : "px-ref";
}
const trTone = q => q ? trPxClass(q, q.last) : "";
const trPlTone = n => n > 0 ? "px-up" : n < 0 ? "px-down" : "px-ref";
// HOSE tick sizes; HNX and UPCoM trade in steps of 100 ₫
function trTick(price, market) {
  if (market && market !== "STO") return 0.1;
  return price < 10 ? 0.01 : price < 50 ? 0.05 : 0.1;
}
const trOnTick = (p, step) => Math.abs(p / step - Math.round(p / step)) < 1e-6;

// ---------- Data ----------
function trParseQuote(x) {
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  // order book level "price|volume|…"; volumes on the VPS board are in units of 10 shares
  const lvl = s => { const [p, v] = String(s || "").split("|"); return [num(p), num(v) * 10, /^[A-Z]+$/.test(p || "") ? p : ""]; };
  const ref = num(x.r), last = num(x.lastPrice) || ref;
  return { sym: x.sym, market: x.marketId, ref, ceil: num(x.c), floor: num(x.f), last, lastVol: num(x.lastVolume) * 10, open: num(x.openPrice),
    high: num(x.highPrice), low: num(x.lowPrice), avg: num(x.avePrice), vol: num(x.lot) * 10, chg: last - ref, pct: ref ? (last - ref) / ref * 100 : 0,
    bid: [x.g1, x.g2, x.g3].map(lvl), ask: [x.g4, x.g5, x.g6].map(lvl), fBuy: num(x.fBVol) * 10, fSell: num(x.fSVolume) * 10, fRoom: num(x.fRoom) };
}
async function trFetchQuotes(syms) {
  syms = [...new Set(syms.filter(Boolean))];
  if (!syms.length) return [];
  const out = [];
  for (let i = 0; i < syms.length; i += 60) {
    const r = await fetch(TR_API + "getliststockdata/" + syms.slice(i, i + 60).join(","), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const arr = await r.json();
    (Array.isArray(arr) ? arr : []).forEach(x => { if (x && x.sym) { TRADE.q[x.sym] = trParseQuote(x); out.push(x.sym); } });
  }
  TRADE.at = Date.now();
  return out;
}
async function trFetchIndexes() {
  try {
    const r = await fetch(TR_API + "getlistindexdetail/" + TR_INDEX.map(x => x[0]).join(","), { cache: "no-store" });
    const arr = await r.json();
    TRADE.idx = TR_INDEX.map(([code, name]) => {
      const x = (arr || []).find(y => y && y.mc === code);
      if (!x) return null;
      const ot = String(x.ot || "").split("|");
      return { name, v: +x.cIndex, chg: +x.cIndex - +x.oIndex, pct: x.oIndex ? (x.cIndex / x.oIndex - 1) * 100 : 0, value: +x.value, vol: +x.vol, up: +ot[3] || 0, down: +ot[4] || 0, same: +ot[5] || 0 };
    }).filter(Boolean);
  } catch (e) { /* the strip is optional */ }
}
async function trGroupList(g) {
  const T = tradeData();
  if (g === "watch") return T.watch;
  if (g === "hold") return Object.keys(T.holdings);
  const fixed = TR_GROUPS.find(x => x[0] === g);
  if (fixed && fixed[2]) return fixed[2];
  if (!TRADE.lists[g]) {
    try { const r = await fetch(TR_API + "getlistckindex/" + g, { cache: "no-store" }); const a = await r.json(); if (Array.isArray(a) && a.length) TRADE.lists[g] = a; } catch (e) { /* fall back below */ }
  }
  return TRADE.lists[g] || (g === "VN30" ? TR_VN30 : []);
}
async function trFetchBars(sym, range) {
  const key = `${sym}|${range}`, hit = TRADE.bars[key];
  if (hit && Date.now() - hit.at < 60000) return hit.bars;
  const now = Math.floor(Date.now() / 1000);
  const [res, days] = { "1D": ["5", 6], "1M": ["D", 31], "3M": ["D", 92], "6M": ["D", 183], "1Y": ["D", 366], "3Y": ["W", 1100] }[range] || ["D", 92];
  const r = await fetch(`${TR_BARS}?resolution=${res}&symbol=${encodeURIComponent(sym)}&from=${now - days * 86400}&to=${now}`, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json().catch(() => ({}));
  let bars = j && j.s === "ok" && Array.isArray(j.t) ? j.t.map((t, i) => ({ t, o: j.o[i], h: j.h[i], l: j.l[i], c: j.c[i], v: j.v[i] })) : [];
  if (range === "1D" && bars.length) {           // keep only the latest trading day
    const day = t => new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 10);
    const last = day(bars[bars.length - 1].t);
    bars = bars.filter(b => day(b.t) === last);
  }
  TRADE.bars[key] = { at: Date.now(), bars };
  return bars;
}

// ---------- Orders ----------
function trMarketPrice(q, side) {
  const lv = side === "B" ? q.ask[0][0] : q.bid[0][0];
  let p = lv > 0 ? lv : q.last;
  if (q.ceil) p = Math.min(p, q.ceil);
  if (q.floor) p = Math.max(p, q.floor);
  return p;
}
function trFill(o, price) {
  const T = tradeData(), val = o.qty * price * 1000;
  o.fee = val * TR_FEE;
  if (o.side === "B") {
    T.cash -= val + o.fee;
    const h = T.holdings[o.sym] || (T.holdings[o.sym] = { qty: 0, cost: 0, lots: [] });
    h.qty += o.qty; h.cost += val + o.fee; h.lots = (h.lots || []).concat({ qty: o.qty, d: trToday() });
  } else {
    o.tax = val * TR_TAX;
    const h = T.holdings[o.sym], out = h.cost * o.qty / h.qty;
    h.qty -= o.qty; h.cost -= out;
    T.cash += val - o.fee - o.tax;
    o.pnl = val - o.fee - o.tax - out;
    if (h.qty <= 0) delete T.holdings[o.sym];
  }
  o.status = "filled"; o.fill = price; o.ft = new Date().toISOString();
  T.fees = (T.fees || 0) + o.fee + (o.tax || 0);
}
// Day orders: waiting LO orders fill when the price reaches them and expire at the end of the day
function trProcessPending() {
  const T = tradeData(), today = trToday(), filled = [];
  T.orders.forEach(o => {
    if (o.status !== "pending") return;
    if (o.d !== today) { o.status = "expired"; return; }
    const q = TRADE.q[o.sym];
    if (!q || !q.last) return;
    if ((o.side === "B" && q.last <= o.price) || (o.side === "S" && q.last >= o.price)) { trFill(o, o.price); filled.push(o); }
  });
  Object.values(T.holdings).forEach(h => { h.lots = (h.lots || []).filter(l => trTradingDaysAfter(l.d, today) < 2); });
  if (filled.length) { trSnapshot(trNav(), true); filled.forEach(o => toast(`Đã khớp: ${o.side === "B" ? "mua" : "bán"} ${trInt(o.qty)} ${o.sym} giá ${trP(o.fill)}`)); }
  return filled;
}
function trPlace({ sym, side, type, qty, price }) {
  const T = tradeData(), q = TRADE.q[sym];
  if (!q) return "Chưa có giá của mã này — bấm Làm mới rồi thử lại.";
  if (!(qty > 0) || qty % TR_LOT) return `Khối lượng phải là bội số của ${TR_LOT} cổ phiếu.`;
  const step = trTick(type === "LO" ? price : q.last, q.market);
  if (type === "LO") {
    if (!(price > 0)) return "Nhập giá đặt.";
    if (q.ceil && (price > q.ceil + 1e-9 || price < q.floor - 1e-9)) return `Giá phải nằm trong biên độ: sàn ${trP(q.floor)} – trần ${trP(q.ceil)}.`;
    if (!trOnTick(price, step)) return `Bước giá của mã này là ${trP(step)} (${trInt(step * 1000)} ₫).`;
  }
  const mkt = trMarketPrice(q, side);
  const fillNow = type === "MP" || (side === "B" ? price >= mkt : price <= mkt);
  const at = type === "MP" ? mkt : fillNow ? mkt : price;
  if (side === "B") {
    const need = qty * (type === "LO" ? Math.max(price, at) : at) * 1000 * (1 + TR_FEE);
    if (need > trAvailableCash() + 1) return `Không đủ tiền: lệnh cần ${trVND(need)}, bạn có ${trVND(trAvailableCash())}.`;
  } else {
    const h = T.holdings[sym];
    if (!h) return `Bạn chưa có cổ phiếu ${sym}.`;
    const avail = trAvailableShares(sym);
    if (qty > avail) return trUnsettled(h) ? `Hiện chỉ bán được ${trInt(avail)} cổ phiếu — cổ phiếu mua trong 2 phiên gần nhất chưa về (T+2).` : `Bạn chỉ bán được tối đa ${trInt(avail)} cổ phiếu.`;
  }
  const o = { id: makeId("o"), sym, side, type, qty, price: type === "LO" ? price : at, status: "pending", d: trToday(), t: new Date().toISOString() };
  T.orders.unshift(o);
  if (T.orders.length > 500) T.orders.length = 500;
  if (fillNow) { trFill(o, at); trSnapshot(trNav(), true); }
  saveData();
  return o;
}

// ---------- Charts ----------
function trChartSvg(bars, w, opts = {}) {
  const H = opts.h || 260, VH = 46, R = 46, top = 10, plotH = H - VH - top - 18;
  if (!bars.length) return `<div class="tr-chart-empty">Chưa có dữ liệu giá cho khoảng thời gian này.</div>`;
  const n = bars.length, plotW = w - R, step = plotW / n;
  let lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  if (opts.ref) { lo = Math.min(lo, opts.ref); hi = Math.max(hi, opts.ref); }
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1; lo -= pad; hi += pad;
  const y = v => top + (hi - v) / (hi - lo) * plotH;
  const vmax = Math.max(...bars.map(b => b.v || 0)) || 1;
  let marks = "";
  if (n <= 140) {
    const bw = Math.max(1, Math.min(10, step * 0.62));
    bars.forEach((b, i) => {
      const x = i * step + step / 2, cls = b.c >= b.o ? "tr-up" : "tr-down";
      const y1 = y(Math.max(b.o, b.c)), y2 = y(Math.min(b.o, b.c));
      marks += `<line class="${cls}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y(b.h).toFixed(1)}" y2="${y(b.l).toFixed(1)}"/><rect class="${cls}" x="${(x - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y2 - y1).toFixed(1)}"/>`;
    });
  } else {
    const pts = bars.map((b, i) => `${(i * step + step / 2).toFixed(1)},${y(b.c).toFixed(1)}`);
    marks = `<path class="tr-area" d="M${pts[0].split(",")[0]},${top + plotH} L${pts.join(" L")} L${pts[pts.length - 1].split(",")[0]},${top + plotH}Z"/><polyline class="tr-line" points="${pts.join(" ")}"/>`;
  }
  const vol = bars.map((b, i) => { const hgt = (b.v || 0) / vmax * (VH - 6); return `<rect class="${b.c >= b.o ? "tr-vup" : "tr-vdown"}" x="${(i * step + step * 0.2).toFixed(1)}" y="${(H - 18 - hgt).toFixed(1)}" width="${Math.max(0.6, step * 0.6).toFixed(1)}" height="${hgt.toFixed(1)}"/>`; }).join("");
  const ticks = [0, 1, 2, 3].map(k => lo + pad + (hi - lo - 2 * pad) * k / 3);
  const axis = ticks.map(v => `<line class="tr-grid" x1="0" x2="${plotW}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tr-axis" x="${plotW + 6}" y="${(y(v) + 4).toFixed(1)}">${trP(v)}</text>`).join("");
  const fmtT = t => { const d = new Date((t + 7 * 3600) * 1000); return opts.intraday ? d.toISOString().slice(11, 16) : d.toISOString().slice(5, 10).split("-").reverse().join("/"); };
  const labels = [0, Math.floor(n / 2), n - 1].map((i, k) => `<text class="tr-axis" x="${(i * step + step / 2).toFixed(1)}" y="${H - 4}" text-anchor="${["start", "middle", "end"][k]}">${fmtT(bars[i].t)}</text>`).join("");
  const ref = opts.ref ? `<line class="tr-refline" x1="0" x2="${plotW}" y1="${y(opts.ref).toFixed(1)}" y2="${y(opts.ref).toFixed(1)}"/>` : "";
  return `<svg class="tr-chart" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" data-n="${n}" data-step="${step}" role="img" aria-label="Biểu đồ giá">${axis}${ref}${marks}${vol}${labels}<line class="tr-cross" x1="0" x2="0" y1="${top}" y2="${H - 18}" visibility="hidden"/></svg>`;
}
// Lines over time: each series is [[time ms, value], …]
function trLinesSvg(series, w, h = 200, opts = {}) {
  series = series.filter(s => s.pts.length);
  const all = series.flatMap(s => s.pts.map(p => p[1])), ts = series.flatMap(s => s.pts.map(p => p[0]));
  if (all.length < 2) return "";
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.002 || 1; lo -= pad; hi += pad;
  const R = 52, t0 = Math.min(...ts), t1 = Math.max(...ts);
  const x = t => t1 > t0 ? (t - t0) / (t1 - t0) * (w - R) : (w - R) / 2, y = v => 8 + (hi - v) / (hi - lo) * (h - 30);
  const grid = [lo + pad, (lo + hi) / 2, hi - pad].map(v => `<line class="tr-grid" x1="0" x2="${w - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tr-axis" x="${w - R + 6}" y="${(y(v) + 4).toFixed(1)}">${(opts.fmt || (q => q.toFixed(1)))(v)}</text>`).join("");
  const lab = t => { const d = new Date(t + 7 * 3600 * 1000).toISOString(); return opts.intraday ? `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)}` : `${d.slice(8, 10)}/${d.slice(5, 7)}`; };
  const labels = t1 > t0 ? `<text class="tr-axis" x="0" y="${h - 4}">${lab(t0)}</text><text class="tr-axis" x="${w - R}" y="${h - 4}" text-anchor="end">${lab(t1)}</text>` : "";
  return `<svg class="tr-chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(opts.label || "Tài khoản của bạn so với VN-Index")}">${grid}${series.map(s =>
    s.pts.length > 1 ? `<polyline class="${s.cls}" points="${s.pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ")}"/>` : `<circle class="${s.cls} tr-dot" cx="${x(s.pts[0][0]).toFixed(1)}" cy="${y(s.pts[0][1]).toFixed(1)}" r="3.5"/>`).join("")}${labels}</svg>`;
}

// ---------- Shared page parts ----------
function tradeStop() { if (TRADE.timer) { clearInterval(TRADE.timer); TRADE.timer = null; } trQuickClose(); }
function trAutoRefresh(fn, every = 10000) {
  if (TRADE.timer) clearInterval(TRADE.timer);
  TRADE.timer = setInterval(() => {
    if (currentRoute()[0] !== "trade") return tradeStop();
    if (trStatus().code === "open" && !document.hidden) fn();
  }, every);
}
async function trRefresh(syms, quiet) {
  TRADE.loading = true; TRADE.err = "";
  try { await trFetchQuotes(syms); trProcessPending(); }
  catch (e) { TRADE.err = "Không tải được giá. Kiểm tra kết nối mạng rồi thử lại."; if (!quiet) toast(TRADE.err, "error"); }
  TRADE.loading = false;
}
function trHeadActions() {
  const st = trStatus();
  return `<span class="tr-status tr-${st.code}"><i></i>${st.label}</span>
    <button class="btn btn-secondary btn-sm" id="tr-refresh">${icon("pulse", 16)} Làm mới</button>`;
}
function trUpdatedHtml() {
  return TRADE.at ? `Cập nhật ${new Date(TRADE.at).toLocaleTimeString("vi-VN")} · nguồn VPS và VNDirect · ${trStatus().code === "open" ? "tự cập nhật mỗi 10 giây" : "giá cuối phiên"}` : "";
}
function trSnapshot(nav, force) {
  const T = tradeData(), d = trToday(), last = T.nav[T.nav.length - 1], v = Math.round(nav);
  if (last && last.d === d) last.v = v; else T.nav.push({ d, v });
  if (T.nav.length > 600) T.nav.splice(0, T.nav.length - 600);
  const lx = T.navx[T.navx.length - 1], now = Date.now();
  // a new point after a trade, or every 10 minutes while the value moves; the first point keeps the starting value
  if (force || !lx || (now - lx.t > 10 * 60 * 1000 && lx.v !== v)) T.navx.push({ t: now, v });
  else if (T.navx.length > 1) lx.v = v;
  if (T.navx.length > 500) T.navx.splice(0, T.navx.length - 500);
  saveData();
}

// ---------- Main page: board · portfolio · orders ----------
function renderTrade(sub, sym) {
  if (sub === "s" && sym) return renderTradeStock(String(sym).toUpperCase());
  const T = tradeData();
  let list = [];
  const symsNeeded = () => [...new Set([...list, ...Object.keys(T.holdings), ...trPending().map(o => o.sym)])];
  const draw = () => {
    if (currentRoute()[0] !== "trade" || currentRoute()[1]) return;
    if (document.activeElement && document.activeElement.id === "tr-add" && document.activeElement.value) return;   // don't wipe a ticker being typed
    trProcessPending();
    const nav = trNav(), ret = T.initial ? (nav - T.initial) / T.initial * 100 : 0;
    if (TRADE.at) trSnapshot(nav);
    const holdVal = Object.entries(T.holdings).reduce((s, [k, h]) => s + h.qty * ((TRADE.q[k] || {}).last || h.cost / h.qty / 1000) * 1000, 0);
    const unreal = holdVal - Object.values(T.holdings).reduce((s, h) => s + h.cost, 0);
    const nHold = Object.keys(T.holdings).length, nPend = trPending().length;
    view.innerHTML = `
      ${pageHeader("Giả lập chứng khoán", "Giao dịch bằng tiền ảo với giá thật trên HOSE, HNX và UPCoM", trHeadActions(), "Tiền ảo · giá thật")}
      ${TRADE.err ? `<div class="callout danger section">${icon("alert", 18)}<div style="flex:1">${esc(TRADE.err)}</div><button class="btn btn-secondary btn-sm" data-tr-retry>Thử lại</button></div>` : ""}
      <div class="grid grid-stats">
        <div class="card stat"><span class="stat-label">Tài sản ròng</span><span class="stat-value">${trBig(nav)}</span><span class="stat-hint">${trVND(nav)}</span></div>
        <div class="card stat"><span class="stat-label">Lãi/lỗ từ ${trDate(T.start)}</span><span class="stat-value ${trPlTone(ret)}">${trPct(ret)}</span><span class="stat-hint">${trSigned(nav - T.initial)}</span></div>
        <div class="card stat"><span class="stat-label">Sức mua</span><span class="stat-value">${trBig(trAvailableCash())}</span><span class="stat-hint">${trVND(trAvailableCash())}${trReservedCash() ? ` · ${trVND(trReservedCash())} đang giữ cho lệnh chờ` : ""}</span></div>
        <div class="card stat"><span class="stat-label">Lãi/lỗ chưa chốt</span><span class="stat-value ${trPlTone(unreal)}">${trSigned(unreal / 1e6, v => v.toFixed(2))}<small class="tr-unit">triệu ₫</small></span><span class="stat-hint">${nHold} mã đang nắm giữ</span></div>
      </div>
      <div class="tr-tabs section">
        <div class="segmented" role="tablist">${[["board", "Bảng giá"], ["portfolio", `Danh mục (${nHold})`], ["orders", `Sổ lệnh${nPend ? ` · ${nPend} chờ` : ""}`]].map(([k, l]) => `<button role="tab" aria-selected="${TRADE.tab === k}" class="${TRADE.tab === k ? "active" : ""}" data-tr-tab="${k}">${l}</button>`).join("")}</div>
        <span class="text-3 small">${trUpdatedHtml()}</span>
      </div>
      ${TRADE.tab === "portfolio" ? trPortfolioHtml() : TRADE.tab === "orders" ? trOrdersHtml() : trBoardHtml(list)}
      <p class="text-3 small section">Chỉ để luyện tập — không dùng tiền thật, không đặt lệnh thật. Phí ${(TR_FEE * 100).toFixed(2).replace(".", ",")}% mỗi lệnh, thuế ${(TR_TAX * 100).toFixed(1).replace(".", ",")}% khi bán; lô ${TR_LOT} cổ phiếu; cổ phiếu mua về bán được sau T+2; lệnh LO chưa khớp tự hủy cuối ngày.</p>`;
    trBindMain(draw, reload);
    if (TRADE.tab === "portfolio") trDrawPerformance();
  };
  TRADE.redraw = draw;
  const reload = async quiet => {
    list = await trGroupList(TRADE.group);
    await Promise.all([trRefresh(symsNeeded(), quiet), trFetchIndexes()]);
    draw();
  };
  draw();
  reload(true);
  trAutoRefresh(() => reload(true));
}

// The price board (standard Vietnamese layout)
function trBoardHtml(list) {
  const T = tradeData();
  const ix = (TRADE.idx || []).map(x => `<div class="vb-ix">
      <span class="vb-ix-name">${x.name}</span>
      <span class="vb-ix-v ${trPlTone(x.chg)}">${x.v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span class="vb-ix-c ${trPlTone(x.chg)}">${trSigned(x.chg, v => v.toFixed(2))} (${trPct(x.pct)})</span>
      <span class="vb-ix-m">${trInt(x.vol)} CP · ${trInt(x.value / 1000)} tỷ</span>
      <span class="vb-ix-b"><b class="px-up">▲${x.up}</b> <b class="px-ref">■${x.same}</b> <b class="px-down">▼${x.down}</b></span>
    </div>`).join("");
  const prevKey = TRADE.prev;
  const cell = (sym, k, txt, cls, qo) => {
    const key = sym + "|" + k, old = prevKey[key];
    prevKey[key] = txt;
    const flash = old !== undefined && old !== txt && txt !== "" ? " vb-flash" : "";
    return `<td class="${cls || ""}${flash}${qo ? " vb-click" : ""}"${qo ? ` data-qo="${qo}" title="Bấm để đặt lệnh"` : ""}>${txt}</td>`;
  };
  // a bid price opens a SELL at that price (you hit the bid); an offer opens a BUY (you lift the offer)
  const lvl = (sym, q, side, i) => {
    const [p, v, raw] = q[side][i], cls = raw ? "px-ref" : trPxClass(q, p);
    const qo = p && !raw ? `${sym}|${side === "bid" ? "S" : "B"}|${p}` : "";
    return cell(sym, side + "p" + i, raw || (p ? trP(p) : ""), "vb-p " + cls, qo) + cell(sym, side + "v" + i, v ? trInt(v) : "", "vb-v " + cls, qo);
  };
  const rows = list.map(sym => {
    const q = TRADE.q[sym];
    if (!q) return `<tr><th class="vb-sym" scope="row">${sym}</th><td colspan="24" class="vb-wait">${TRADE.loading ? "đang tải…" : "không có dữ liệu"}</td></tr>`;
    const t = trTone(q), mine = T.holdings[sym] ? " vb-mine" : "";
    return `<tr class="vb-row${mine}" data-tr-open="${sym}" tabindex="0">
      <th class="vb-sym ${t}" scope="row">${sym}</th>
      <td class="vb-ceil px-ceil">${trP(q.ceil)}</td><td class="vb-floor px-floor">${trP(q.floor)}</td><td class="vb-ref px-ref">${trP(q.ref)}</td>
      ${lvl(sym, q, "bid", 2)}${lvl(sym, q, "bid", 1)}${lvl(sym, q, "bid", 0)}
      ${cell(sym, "last", trP(q.last), "vb-m vb-p " + t, `${sym}|B|${q.last}`)}${cell(sym, "lv", q.lastVol ? trInt(q.lastVol) : "", "vb-m vb-v " + t)}${cell(sym, "chg", trSigned(q.chg, trP), "vb-m " + t)}${cell(sym, "pct", trPct(q.pct), "vb-m " + t)}
      ${lvl(sym, q, "ask", 0)}${lvl(sym, q, "ask", 1)}${lvl(sym, q, "ask", 2)}
      ${cell(sym, "vol", trInt(q.vol), "vb-tot")}
      ${cell(sym, "hi", q.high ? trP(q.high) : "", trPxClass(q, q.high))}${cell(sym, "lo", q.low ? trP(q.low) : "", trPxClass(q, q.low))}
      ${cell(sym, "fb", q.fBuy ? trInt(q.fBuy) : "", "vb-f")}${cell(sym, "fs", q.fSell ? trInt(q.fSell) : "", "vb-f")}
    </tr>`;
  }).join("");
  return `
    ${ix ? `<div class="vb-ixs section">${ix}</div>` : ""}
    <div class="vb-tools section">
      <div class="vb-groups" role="tablist">${TR_GROUPS.map(([k, l]) => `<button class="tt-chip${TRADE.group === k ? " active" : ""}" data-tr-group="${k}" role="tab" aria-selected="${TRADE.group === k}">${l}${k === "watch" ? ` (${T.watch.length})` : k === "hold" ? ` (${Object.keys(T.holdings).length})` : ""}</button>`).join("")}</div>
      <form class="tr-add" id="tr-add-form" autocomplete="off">
        <input class="input" id="tr-add" placeholder="Thêm mã vào Theo dõi, ví dụ VNM" maxlength="10" spellcheck="false" aria-label="Mã cổ phiếu">
        <button class="btn btn-secondary" type="submit">${icon("plus", 16)} Thêm</button>
        <button class="btn btn-primary" type="button" id="tr-qo-open">${icon("trend", 16)} Đặt lệnh</button>
        ${document.fullscreenEnabled ? `<button class="btn btn-ghost hide-mobile" id="vb-full" type="button" title="Xem bảng giá toàn màn hình">${icon("grid", 16)} Toàn màn hình</button>` : ""}
      </form>
    </div>
    <div class="vb-wrap" id="vb-wrap">
      <table class="vb">
        <thead>
          <tr><th rowspan="2" class="vb-sym">Mã CK</th><th rowspan="2">Trần</th><th rowspan="2">Sàn</th><th rowspan="2">TC</th>
            <th colspan="6" class="vb-g">Bên mua</th><th colspan="4" class="vb-g vb-mh">Khớp lệnh</th><th colspan="6" class="vb-g">Bên bán</th>
            <th rowspan="2">Tổng KL</th><th rowspan="2">Cao</th><th rowspan="2">Thấp</th><th colspan="2" class="vb-g">ĐTNN</th></tr>
          <tr><th>Giá 3</th><th>KL 3</th><th>Giá 2</th><th>KL 2</th><th>Giá 1</th><th>KL 1</th>
            <th class="vb-mh">Giá</th><th class="vb-mh">KL</th><th class="vb-mh">+/−</th><th class="vb-mh">%</th>
            <th>Giá 1</th><th>KL 1</th><th>Giá 2</th><th>KL 2</th><th>Giá 3</th><th>KL 3</th><th>Mua</th><th>Bán</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="25" class="vb-wait">${TRADE.group === "hold" ? "Bạn chưa nắm giữ mã nào." : TRADE.group === "watch" ? "Danh sách Theo dõi đang trống — thêm mã ở ô bên trên." : "Đang tải danh sách…"}</td></tr>`}</tbody>
      </table>
    </div>
    <p class="text-3 small vb-note">Giá: nghìn đồng (51.10 = 51.100 ₫) · KL: cổ phiếu · ĐTNN: khối lượng nhà đầu tư nước ngoài mua/bán. Màu: <span class="px-up">tăng</span>, <span class="px-down">giảm</span>, <span class="px-ref">tham chiếu</span>, <span class="px-ceil">trần</span>, <span class="px-floor">sàn</span>. <strong>Bấm vào giá bên Bán để mua, giá bên Mua để bán</strong>; bấm vào mã để xem biểu đồ${TRADE.group === "watch" ? "; nhấn giữ hoặc chuột phải vào mã để bỏ khỏi Theo dõi" : ""}.</p>`;
}

function trPortfolioHtml() {
  const T = tradeData(), hs = Object.entries(T.holdings);
  const realised = T.orders.filter(o => o.status === "filled" && o.side === "S").reduce((s, o) => s + (o.pnl || 0), 0);
  return `<div class="card section">
    <div class="card-head"><div><h2>Cổ phiếu đang nắm giữ</h2><p class="text-2 small">Giá vốn trung bình đã gồm phí mua</p></div></div>
    ${hs.length ? `<div class="table-wrap"><table class="table tr-table">
      <thead><tr><th>Mã</th><th class="num">SL</th><th class="num hide-mobile">Bán được</th><th class="num">Giá vốn</th><th class="num">Giá hiện tại</th><th class="num hide-mobile">Giá trị</th><th class="num">Lãi/lỗ</th></tr></thead>
      <tbody>${hs.map(([sym, h]) => {
        const q = TRADE.q[sym], last = q ? q.last : h.cost / h.qty / 1000, val = h.qty * last * 1000, pl = val - h.cost, plp = h.cost ? pl / h.cost * 100 : 0;
        return `<tr class="tr-row" data-tr-open="${sym}" tabindex="0"><td><strong class="tr-sym">${sym}</strong></td><td class="num">${trInt(h.qty)}</td><td class="num hide-mobile">${trInt(trAvailableShares(sym))}</td>
          <td class="num">${trP(h.cost / h.qty / 1000)}</td><td class="num ${trTone(q)}">${trP(last)}</td><td class="num hide-mobile">${trVND(val)}</td>
          <td class="num ${trPlTone(pl)}"><strong>${trPct(plp)}</strong><br><span class="small">${trSigned(pl)}</span></td></tr>`;
      }).join("")}</tbody></table></div>`
      : emptyState("pulse", "Chưa có cổ phiếu nào", "Mở tab Bảng giá, chọn một mã và đặt lệnh mua.")}
  </div>
  <div class="card section">
    <div class="card-head"><div><h2>Hiệu quả so với VN-Index</h2><p class="text-2 small">Cả hai bắt đầu từ 100 ngày ${trDate(T.start)} · lợi suất nắm giữ (HPR) = (cuối − đầu) ÷ đầu</p></div></div>
    <div id="tr-perf"><p class="text-3 small">Đang tải…</p></div>
    <dl class="tr-facts">
      <div><dt>Lãi/lỗ đã chốt</dt><dd class="${trPlTone(realised)}">${trSigned(realised)}</dd></div>
      <div><dt>Phí và thuế đã trả</dt><dd>${trVND(T.fees || 0)}</dd></div>
      <div><dt>Số lệnh đã khớp</dt><dd>${T.orders.filter(o => o.status === "filled").length}</dd></div>
      <div><dt>Lệnh bán có lãi</dt><dd>${(() => { const s = T.orders.filter(o => o.status === "filled" && o.side === "S"); return s.length ? `${pct(s.filter(o => o.pnl > 0).length, s.length)}% của ${s.length} lệnh` : "–"; })()}</dd></div>
    </dl>
    <div class="row-gap" style="margin-top:16px"><button class="btn btn-soft-danger btn-sm" id="tr-reset">${icon("trash", 16)} Làm lại từ đầu</button></div>
  </div>`;
}
async function trIndexBars(res, fromSec) {
  const key = `${res}|${fromSec}`;
  if (TRADE.vnindex && TRADE.vnindex.key === key && Date.now() - TRADE.vnindex.at < 300000) return TRADE.vnindex.bars;
  const now = Math.floor(Date.now() / 1000);
  const r = await fetch(`${TR_BARS}?resolution=${res}&symbol=VNINDEX&from=${fromSec}&to=${now}`, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  const bars = j.s === "ok" ? j.t.map((t, i) => ({ t: t * 1000, c: j.c[i] })) : [];
  TRADE.vnindex = { key, at: Date.now(), bars };
  return bars;
}
async function trDrawPerformance() {
  const box = document.getElementById("tr-perf");
  if (!box) return;
  const T = tradeData(), w = Math.max(280, box.clientWidth || 600), base = T.initial;
  const daily = T.nav.length >= 2;
  // your account: one point per day once there are two days, otherwise the points taken today
  const mine = daily ? T.nav.map(p => [Date.parse(p.d + "T07:45:00Z"), p.v / base * 100]) : T.navx.map(p => [p.t, p.v / base * 100]);
  let idx = [], note = "", idxErr = false;
  try {
    if (mine.length >= 2) {
      const from = Math.floor(mine[0][0] / 1000) - (daily ? 7 * 86400 : 86400);
      const bars = await trIndexBars(daily ? "D" : "5", from);
      const at = t => { let c = null; bars.forEach(b => { if (b.t <= t) c = b.c; }); return c; };
      const ib = at(mine[0][0]) || (bars[0] && bars[0].c);
      if (ib) idx = mine.map(p => [p[0], (at(p[0]) || ib) / ib * 100]);
    } else {
      // first visit: show the market for context until your own line has two points
      const bars = await trIndexBars("D", Math.floor(Date.now() / 1000) - 92 * 86400);
      if (bars.length >= 2) {
        box.innerHTML = `${trLinesSvg([{ cls: "tr-l-idx2", pts: bars.map(b => [b.t, b.c]) }], w, 200, { fmt: v => trInt(v), label: "VN-Index 3 tháng gần nhất" })}
          <div class="tr-legend"><span><i class="tr-l-idx2"></i>VN-Index · 3 tháng gần nhất · ${trInt(bars[bars.length - 1].c)} (${trPct((bars[bars.length - 1].c / bars[0].c - 1) * 100)})</span></div>
          <p class="text-3 small" style="margin-top:6px">Đường tài khoản của bạn sẽ hiện cạnh VN-Index sau lệnh đầu tiên.</p>`;
        return;
      }
    }
  } catch (e) { idxErr = true; }
  if (mine.length < 2) { box.innerHTML = `<p class="text-3 small">${idxErr ? "Chưa tải được VN-Index. " : ""}Đường tài khoản của bạn bắt đầu từ lệnh đầu tiên.</p>`; return; }
  const r1 = mine[mine.length - 1][1] - 100, r2 = idx.length ? idx[idx.length - 1][1] - 100 : null;
  if (idxErr) note = `<p class="text-3 small" style="margin-top:6px">Chưa tải được VN-Index — đang chỉ vẽ tài khoản của bạn.</p>`;
  box.innerHTML = `${trLinesSvg([{ cls: "tr-l-me", pts: mine }, { cls: "tr-l-idx", pts: idx }], w, 200, { intraday: !daily })}
    <div class="tr-legend"><span><i class="tr-l-me"></i>Tài khoản của bạn ${trPct(r1)}</span>${r2 !== null ? `<span><i class="tr-l-idx"></i>VN-Index ${trPct(r2)}</span><span>Lợi suất vượt trội (excess return) <strong class="${trPlTone(r1 - r2)}">${trPct(r1 - r2)}</strong></span>` : ""}</div>${note}`;
}

function trOrdersHtml() {
  const T = tradeData();
  const st = { filled: ["Đã khớp", "badge-success"], pending: ["Chờ khớp", "badge-warning"], cancelled: ["Đã hủy", ""], expired: ["Hết hạn", ""] };
  return `<div class="card section">
    ${T.orders.length ? `<div class="table-wrap"><table class="table tr-table">
      <thead><tr><th>Thời gian</th><th>Lệnh</th><th class="num">KL</th><th class="num">Giá</th><th>Trạng thái</th><th class="num hide-mobile">Phí + thuế</th><th class="num hide-mobile">Lãi/lỗ</th><th></th></tr></thead>
      <tbody>${T.orders.slice(0, 200).map(o => `<tr>
        <td class="small">${new Date(o.t).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td><span class="tr-side ${o.side === "B" ? "buy" : "sell"}">${o.side === "B" ? "Mua" : "Bán"}</span> <strong>${o.sym}</strong> <span class="text-3 small">${o.type}</span></td>
        <td class="num">${trInt(o.qty)}</td>
        <td class="num">${trP(o.status === "filled" ? o.fill : o.price)}</td>
        <td><span class="badge ${st[o.status][1]}">${st[o.status][0]}</span></td>
        <td class="num hide-mobile">${o.status === "filled" ? trVND((o.fee || 0) + (o.tax || 0)) : ""}</td>
        <td class="num hide-mobile ${o.pnl ? trPlTone(o.pnl) : ""}">${o.side === "S" && o.status === "filled" ? trSigned(o.pnl || 0) : ""}</td>
        <td class="num">${o.status === "pending" ? `<button class="btn btn-ghost btn-sm" data-tr-cancel="${o.id}">Hủy</button>` : ""}</td>
      </tr>`).join("")}</tbody></table></div>`
      : emptyState("clock", "Chưa có lệnh nào", "Các lệnh mua, bán của bạn sẽ hiện ở đây.")}
  </div>`;
}

function trBindMain(draw, reload) {
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; await reload(false); };
  view.querySelectorAll("[data-tr-retry]").forEach(b => b.onclick = () => reload(false));
  view.querySelectorAll("[data-tr-tab]").forEach(b => b.onclick = () => { TRADE.tab = b.dataset.trTab; draw(); });
  view.querySelectorAll("[data-tr-group]").forEach(b => b.onclick = async () => { TRADE.group = b.dataset.trGroup; TRADE.prev = {}; draw(); await reload(true); });
  view.querySelectorAll("[data-tr-open]").forEach(r => {
    r.onclick = e => {
      if (e.target.closest("button")) return;
      const qo = e.target.closest("[data-qo]");
      if (qo) { const [s2, side, p] = qo.dataset.qo.split("|"); trQuickOpen({ sym: s2, side, price: +p }); return; }
      location.hash = `#/trade/s/${r.dataset.trOpen}`;
    };
    r.onkeydown = e => { if (e.key === "Enter") location.hash = `#/trade/s/${r.dataset.trOpen}`; };
    if (TRADE.group === "watch") r.oncontextmenu = async e => {
      e.preventDefault();
      const sym = r.dataset.trOpen;
      if (!await confirmDialog({ title: `Bỏ ${sym} khỏi Theo dõi?`, confirmText: "Bỏ" })) return;
      const T = tradeData(); T.watch = T.watch.filter(s => s !== sym); saveData(); reload(true);
    };
  });
  view.querySelectorAll("[data-tr-cancel]").forEach(b => b.onclick = () => {
    const o = tradeData().orders.find(x => x.id === b.dataset.trCancel);
    if (o && o.status === "pending") { o.status = "cancelled"; saveData(); toast("Đã hủy lệnh"); draw(); }
  });
  const qob = document.getElementById("tr-qo-open");
  if (qob) qob.onclick = () => trQuickOpen({});
  const full = document.getElementById("vb-full");
  if (full) full.onclick = () => { const w = document.getElementById("vb-wrap"); if (document.fullscreenElement) document.exitFullscreen(); else if (w.requestFullscreen) w.requestFullscreen().catch(() => {}); };
  const form = document.getElementById("tr-add-form");
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const inp = document.getElementById("tr-add"), sym = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (sym.length < 3) { toast("Nhập mã cổ phiếu, ví dụ VNM", "error"); return; }
    const T = tradeData();
    if (T.watch.includes(sym)) { toast(`${sym} đã có trong Theo dõi`); return; }
    try {
      const got = await trFetchQuotes([sym]);
      if (!got.includes(sym)) { toast(`Không tìm thấy mã ${sym}`, "error"); return; }
      T.watch.unshift(sym); saveData(); toast(`Đã thêm ${sym} vào Theo dõi`);
      inp.value = ""; TRADE.group = "watch"; reload(true);
    } catch (err) { toast("Không kết nối được bảng giá — thử lại", "error"); }
  };
  const rs = document.getElementById("tr-reset");
  if (rs) rs.onclick = async () => {
    const v = await promptDialog({ title: "Làm lại từ đầu?", message: "Toàn bộ cổ phiếu, lệnh và lịch sử trong phần giả lập sẽ bị xóa, bạn bắt đầu lại với tiền ảo mới.", label: "Vốn ban đầu (triệu ₫)", type: "number", inputmode: "numeric", value: String(Math.round(tradeData().initial / 1e6)), confirmText: "Làm lại", validate: x => (+x >= 1 && +x <= 1000000) ? "" : "Nhập từ 1 đến 1.000.000 (triệu ₫)" });
    if (v === null) return;
    const watch = tradeData().watch;
    DATA.trade = null;
    const T = tradeData(); T.initial = T.cash = Math.round(+v * 1e6); T.watch = watch; saveData();
    toast("Đã làm lại phần giả lập"); draw();
  };
}

// ---------- One stock: chart, order book, order ticket ----------
const TR_RANGES = [["1D", "Hôm nay"], ["1M", "1 tháng"], ["3M", "3 tháng"], ["6M", "6 tháng"], ["1Y", "1 năm"], ["3Y", "3 năm"]];
function renderTradeStock(sym) {
  const T = tradeData();
  const draw = () => {
    if (currentRoute()[0] !== "trade" || String(currentRoute()[2] || "").toUpperCase() !== sym) return;
    const q = TRADE.q[sym], h = T.holdings[sym];
    if (!q) {
      view.innerHTML = `<a href="#/trade" class="back-link">${icon("back", 16)} Giả lập chứng khoán</a>${pageHeader(sym, "", trHeadActions())}
        ${TRADE.err ? `<div class="callout danger">${icon("alert", 18)}<div style="flex:1">${esc(TRADE.err)}</div><button class="btn btn-secondary btn-sm" data-tr-retry>Thử lại</button></div>` : TRADE.loading ? `<p class="text-2">Đang tải…</p>` : `<div class="card">${emptyState("alert", `Không tìm thấy mã ${esc(sym)}`, "Kiểm tra lại mã rồi thử lại.")}</div>`}`;
      view.querySelectorAll("[data-tr-retry]").forEach(b => b.onclick = async () => { await trRefresh([sym]); draw(); });
      return;
    }
    const tone = trTone(q), pend = trPending(sym);
    const pl = h ? h.qty * q.last * 1000 - h.cost : 0;
    const bookCls = p => trPxClass(q, p);
    view.innerHTML = `
      <a href="#/trade" class="back-link">${icon("back", 16)} Giả lập chứng khoán</a>
      <header class="page-header tr-head">
        <div class="ph-text">
          <div class="kicker">${TR_MARKET[q.market] || ""} · ${T.watch.includes(sym) ? "đang theo dõi" : `<button class="linklike" id="tr-watch">thêm vào Theo dõi</button>`}</div>
          <h1>${sym} <span class="tr-big ${tone}">${trP(q.last)}</span></h1>
          <p class="ph-sub ${tone}"><strong>${trSigned(q.chg, trP)} (${trPct(q.pct)})</strong></p>
        </div>
        <div class="page-actions">${trHeadActions()}</div>
      </header>
      <dl class="tr-quote">
        <div><dt>Tham chiếu</dt><dd class="px-ref">${trP(q.ref)}</dd></div><div><dt>Trần</dt><dd class="px-ceil">${trP(q.ceil)}</dd></div><div><dt>Sàn</dt><dd class="px-floor">${trP(q.floor)}</dd></div>
        <div><dt>Mở cửa</dt><dd class="${bookCls(q.open)}">${trP(q.open)}</dd></div><div><dt>Cao nhất</dt><dd class="${bookCls(q.high)}">${trP(q.high)}</dd></div><div><dt>Thấp nhất</dt><dd class="${bookCls(q.low)}">${trP(q.low)}</dd></div><div><dt>Tổng KL</dt><dd>${trInt(q.vol)}</dd></div>
      </dl>
      <div class="tr-layout">
        <div class="tr-main">
          <div class="card">
            <div class="card-head" style="flex-wrap:wrap"><div class="segmented">${TR_RANGES.map(([r, l]) => `<button class="${TRADE.range === r ? "active" : ""}" data-tr-range="${r}">${l}</button>`).join("")}</div>
              <span class="tr-readout text-2 small" id="tr-readout"></span></div>
            <div id="tr-chart" class="tr-chart-box"><p class="text-3 small">Đang tải biểu đồ…</p></div>
          </div>
          <div class="card section">
            <div class="card-head"><h2>Dư mua · Dư bán</h2><span class="text-3 small">3 mức giá tốt nhất</span></div>
            <table class="table tr-book"><thead><tr><th class="num">KL mua</th><th class="num">Giá mua</th><th class="num">Giá bán</th><th class="num">KL bán</th></tr></thead>
              <tbody>${[0, 1, 2].map(i => { const [bp, bv, br] = q.bid[i], [ap, av, ar] = q.ask[i]; return `<tr><td class="num">${bv ? trInt(bv) : ""}</td><td class="num ${br ? "px-ref" : bookCls(bp)}"><strong>${br || (bp ? trP(bp) : "–")}</strong></td><td class="num ${ar ? "px-ref" : bookCls(ap)}"><strong>${ar || (ap ? trP(ap) : "–")}</strong></td><td class="num">${av ? trInt(av) : ""}</td></tr>`; }).join("")}</tbody></table>
            <p class="text-3 small" style="margin-top:8px">Nước ngoài mua ${trInt(q.fBuy)} · bán ${trInt(q.fSell)} cổ phiếu${q.fRoom ? ` · room còn ${trInt(q.fRoom)}` : ""}</p>
          </div>
        </div>
        <aside class="tr-side-col">
          <div class="card tr-ticket">
            <div class="tr-sides"><button class="${TRADE.side === "B" ? "active buy" : ""}" data-tr-side="B">Mua</button><button class="${TRADE.side === "S" ? "active sell" : ""}" data-tr-side="S">Bán</button></div>
            <div class="segmented tr-types"><button class="${TRADE.type === "LO" ? "active" : ""}" data-tr-type="LO">LO · giới hạn</button><button class="${TRADE.type === "MP" ? "active" : ""}" data-tr-type="MP">MP · thị trường</button></div>
            ${TRADE.type === "LO" ? `<label class="field"><span class="field-label">Giá đặt (nghìn ₫)</span>
              <div class="tr-stepper"><button type="button" class="btn btn-secondary" data-tr-step="-1" aria-label="Giảm giá">−</button><input class="input mono" id="tr-price" inputmode="decimal" value="${trP(trMarketPrice(q, TRADE.side))}"><button type="button" class="btn btn-secondary" data-tr-step="1" aria-label="Tăng giá">+</button></div></label>`
              : `<p class="text-2 small">Khớp ngay theo giá ${TRADE.side === "B" ? "bán" : "mua"} tốt nhất: <strong>${trP(trMarketPrice(q, TRADE.side))}</strong></p>`}
            <label class="field"><span class="field-label">Khối lượng (lô ${TR_LOT})</span>
              <div class="tr-stepper"><button type="button" class="btn btn-secondary" data-tr-qty="-1" aria-label="Giảm khối lượng">−</button><input class="input mono" id="tr-qty" inputmode="numeric" value="${TR_LOT}"><button type="button" class="btn btn-secondary" data-tr-qty="1" aria-label="Tăng khối lượng">+</button></div></label>
            <div class="tr-quick">${[25, 50, 100].map(p => `<button type="button" class="tt-chip" data-tr-max="${p}">${p}%</button>`).join("")}</div>
            <div class="tr-sum" id="tr-sum"></div>
            <button class="btn btn-lg btn-block ${TRADE.side === "B" ? "tr-buy" : "tr-sell"}" id="tr-go">Đặt lệnh ${TRADE.side === "B" ? "mua" : "bán"} ${sym}</button>
            <p class="text-3 small" style="margin-top:8px">${TRADE.side === "B" ? `Sức mua: <strong>${trVND(trAvailableCash())}</strong>` : `Có thể bán: <strong>${trInt(trAvailableShares(sym))}</strong> cổ phiếu${h && trUnsettled(h) ? ` · ${trInt(trUnsettled(h))} đang chờ về (T+2)` : ""}`}</p>
          </div>
          ${h ? `<div class="card section"><div class="stat-label">Đang nắm giữ</div>
            <p class="tr-pos"><strong>${trInt(h.qty)}</strong> cổ phiếu · giá vốn <strong>${trP(h.cost / h.qty / 1000)}</strong></p>
            <p class="${trPlTone(pl)}"><strong>${trSigned(pl)}</strong> (${trPct(h.cost ? pl / h.cost * 100 : 0)})</p></div>` : ""}
          ${pend.length ? `<div class="card section"><div class="stat-label">Lệnh chờ khớp</div>${pend.map(o => `<div class="row-between tr-pend"><span><span class="tr-side ${o.side === "B" ? "buy" : "sell"}">${o.side === "B" ? "Mua" : "Bán"}</span> ${trInt(o.qty)} giá ${trP(o.price)}</span><button class="btn btn-ghost btn-sm" data-tr-cancel="${o.id}">Hủy</button></div>`).join("")}</div>` : ""}
        </aside>
      </div>
      <p class="text-3 small section">${trUpdatedHtml()}</p>`;
    trBindStock(sym, draw);
    trDrawChart(sym);
  };
  draw();
  trRefresh([sym], true).then(draw);
  trAutoRefresh(() => trRefresh([sym], true).then(() => { if (!document.activeElement || !["tr-price", "tr-qty"].includes(document.activeElement.id)) draw(); }));
}
async function trDrawChart(sym) {
  const box = document.getElementById("tr-chart");
  if (!box) return;
  const range = TRADE.range;
  try {
    const bars = await trFetchBars(sym, range);
    if (TRADE.range !== range || !document.getElementById("tr-chart")) return;
    const w = Math.max(280, box.clientWidth || 640), q = TRADE.q[sym];
    box.innerHTML = trChartSvg(bars, w, { intraday: range === "1D", ref: range === "1D" && q ? q.ref : null, h: w < 500 ? 220 : 280 });
    const svg = box.querySelector("svg"), out = document.getElementById("tr-readout"), cross = svg && svg.querySelector(".tr-cross");
    const show = i => {
      const b = bars[i]; if (!b) return;
      const d = new Date((b.t + 7 * 3600) * 1000).toISOString();
      out.innerHTML = `${range === "1D" ? d.slice(11, 16) : d.slice(0, 10).split("-").reverse().join("/")} · M ${trP(b.o)} C ${trP(b.h)} T ${trP(b.l)} <strong>Đ ${trP(b.c)}</strong> · KL ${trInt(b.v)}`;
    };
    if (svg && bars.length) {
      show(bars.length - 1);
      const step = +svg.dataset.step;
      svg.addEventListener("pointermove", e => {
        const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (w / r.width), i = Math.min(bars.length - 1, Math.max(0, Math.floor(x / step)));
        cross.setAttribute("x1", i * step + step / 2); cross.setAttribute("x2", i * step + step / 2); cross.setAttribute("visibility", "visible");
        show(i);
      });
      svg.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); show(bars.length - 1); });
    }
  } catch (e) {
    box.innerHTML = `<div class="tr-chart-empty">Chưa tải được biểu đồ từ VNDirect. Giá và đặt lệnh vẫn dùng bình thường.<br><button class="btn btn-secondary btn-sm" style="margin-top:10px" id="tr-chart-retry">Thử lại</button></div>`;
    const rb = document.getElementById("tr-chart-retry");
    if (rb) rb.onclick = () => { delete TRADE.bars[`${sym}|${range}`]; box.innerHTML = `<p class="text-3 small">Đang tải biểu đồ…</p>`; trDrawChart(sym); };
  }
}
function trBindStock(sym, draw) {
  const T = tradeData(), q = TRADE.q[sym];
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; TRADE.bars = {}; await trRefresh([sym]); draw(); };
  const wt = document.getElementById("tr-watch");
  if (wt) wt.onclick = () => { T.watch.unshift(sym); saveData(); toast(`Đã thêm ${sym} vào Theo dõi`); draw(); };
  view.querySelectorAll("[data-tr-range]").forEach(b => b.onclick = () => { TRADE.range = b.dataset.trRange; view.querySelectorAll("[data-tr-range]").forEach(x => x.classList.toggle("active", x === b)); trDrawChart(sym); });
  view.querySelectorAll("[data-tr-side]").forEach(b => b.onclick = () => { TRADE.side = b.dataset.trSide; draw(); });
  view.querySelectorAll("[data-tr-type]").forEach(b => b.onclick = () => { TRADE.type = b.dataset.trType; draw(); });
  view.querySelectorAll("[data-tr-cancel]").forEach(b => b.onclick = () => {
    const o = T.orders.find(x => x.id === b.dataset.trCancel);
    if (o && o.status === "pending") { o.status = "cancelled"; saveData(); toast("Đã hủy lệnh"); draw(); }
  });
  const pin = document.getElementById("tr-price"), qin = document.getElementById("tr-qty"), sum = document.getElementById("tr-sum");
  const price = () => TRADE.type === "MP" ? trMarketPrice(q, TRADE.side) : parseFloat(String(pin.value).replace(",", "."));
  const qty = () => parseInt(String(qin.value).replace(/[^0-9]/g, ""), 10) || 0;
  const update = () => {
    const p = price(), n = qty(), val = n * (p || 0) * 1000, fee = val * TR_FEE, tax = TRADE.side === "S" ? val * TR_TAX : 0;
    sum.innerHTML = `<div class="row-between"><span>Giá trị lệnh</span><strong>${trVND(val)}</strong></div>
      <div class="row-between"><span>Phí 0,15%</span><span>${trVND(fee)}</span></div>
      ${TRADE.side === "S" ? `<div class="row-between"><span>Thuế 0,1%</span><span>${trVND(tax)}</span></div>` : ""}
      <div class="row-between tr-total"><span>${TRADE.side === "B" ? "Tổng tiền trả" : "Tiền nhận về"}</span><strong>${trVND(TRADE.side === "B" ? val + fee : val - fee - tax)}</strong></div>`;
  };
  if (pin) pin.oninput = update;
  qin.oninput = update;
  view.querySelectorAll("[data-tr-step]").forEach(b => b.onclick = () => {
    const p = price() || q.last, st = trTick(p, q.market);
    let v = Math.round((p + st * +b.dataset.trStep) / st) * st;
    v = Math.min(q.ceil || v, Math.max(q.floor || v, v));
    pin.value = trP(v); update();
  });
  view.querySelectorAll("[data-tr-qty]").forEach(b => b.onclick = () => { qin.value = Math.max(TR_LOT, qty() + TR_LOT * +b.dataset.trQty); update(); });
  view.querySelectorAll("[data-tr-max]").forEach(b => b.onclick = () => {
    const share = +b.dataset.trMax / 100, p = price() || q.last;
    const max = TRADE.side === "B" ? Math.floor(trAvailableCash() * share / (p * 1000 * (1 + TR_FEE)) / TR_LOT) * TR_LOT : Math.floor(trAvailableShares(sym) * share / TR_LOT) * TR_LOT;
    qin.value = Math.max(0, max); update();
  });
  update();
  document.getElementById("tr-go").onclick = async () => {
    const p = price(), n = qty();
    const o = { sym, side: TRADE.side, type: TRADE.type, qty: n, price: Math.round(p * 100) / 100 };
    const verb = o.side === "B" ? "Mua" : "Bán";
    if (!await confirmDialog({ title: `${verb} ${trInt(n)} ${sym}?`, message: `${o.type === "MP" ? "Lệnh MP (thị trường)" : `Lệnh LO giá ${trP(o.price)}`} · khoảng ${trVND(n * p * 1000)} chưa gồm phí. Chỉ là giả lập — không dùng tiền thật.`, confirmText: verb })) return;
    const res = trPlace(o);
    if (typeof res === "string") { toast(res, "error"); return; }
    toast(res.status === "filled" ? `Đã khớp: ${res.side === "B" ? "mua" : "bán"} ${trInt(res.qty)} ${sym} giá ${trP(res.fill)}` : `Đã đặt lệnh — sẽ khớp khi giá chạm ${trP(res.price)}`);
    draw();
  };
}

// ---------- Quick order bar (opens from a price on the board) ----------
function trQuickClose() { const el = document.getElementById("tr-qo"); if (el) el.remove(); document.body.classList.remove("qo-open"); }
async function trQuickOpen(o) {
  const T = tradeData(), prev = TRADE.qo || {};
  TRADE.qo = { sym: o.sym || prev.sym || Object.keys(T.holdings)[0] || T.watch[0] || "", side: o.side || prev.side || "B", type: o.type || (o.price ? "LO" : prev.type || "LO"), price: o.price || null, qty: prev.qty || TR_LOT };
  let el = document.getElementById("tr-qo");
  if (!el) { el = document.createElement("div"); el.id = "tr-qo"; el.className = "qo"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Đặt lệnh"); document.body.appendChild(el); }
  document.body.classList.add("qo-open");
  if (TRADE.qo.sym && !TRADE.q[TRADE.qo.sym]) { try { await trFetchQuotes([TRADE.qo.sym]); } catch (e) { /* shown below */ } }
  trQuickDraw();
  const f = document.getElementById(TRADE.qo.sym ? "qo-qty" : "qo-sym");
  if (f) { f.focus(); f.select && f.select(); }
}
function trQuickDraw() {
  const el = document.getElementById("tr-qo"), s = TRADE.qo;
  if (!el || !s) return;
  const q = TRADE.q[s.sym];
  if (q && !s.price) s.price = trMarketPrice(q, s.side);
  const buy = s.side === "B";
  el.className = "qo " + (buy ? "qo-buy" : "qo-sell");
  el.innerHTML = `
    <div class="qo-sides"><button type="button" class="${buy ? "active buy" : ""}" data-qo-side="B">Mua</button><button type="button" class="${!buy ? "active sell" : ""}" data-qo-side="S">Bán</button></div>
    <label class="qo-f qo-sym"><span>Mã CK</span><input class="input mono" id="qo-sym" value="${esc(s.sym)}" maxlength="10" spellcheck="false" autocomplete="off"></label>
    <label class="qo-f qo-type"><span>Loại lệnh</span><select class="select" id="qo-type"><option value="LO" ${s.type === "LO" ? "selected" : ""}>LO</option><option value="MP" ${s.type === "MP" ? "selected" : ""}>MP</option></select></label>
    <div class="qo-f qo-price"><span>Giá</span><div class="tr-stepper"><button type="button" class="btn btn-secondary" data-qo-step="-1" aria-label="Giảm giá" ${s.type === "MP" ? "disabled" : ""}>−</button><input class="input mono" id="qo-price" inputmode="decimal" value="${s.type === "MP" ? "MP" : s.price ? trP(s.price) : ""}" ${s.type === "MP" ? "disabled" : ""} aria-label="Giá"><button type="button" class="btn btn-secondary" data-qo-step="1" aria-label="Tăng giá" ${s.type === "MP" ? "disabled" : ""}>+</button></div></div>
    <div class="qo-f qo-qty"><span>Khối lượng</span><div class="tr-stepper"><button type="button" class="btn btn-secondary" data-qo-qty="-1" aria-label="Giảm khối lượng">−</button><input class="input mono" id="qo-qty" inputmode="numeric" value="${s.qty}" aria-label="Khối lượng"><button type="button" class="btn btn-secondary" data-qo-qty="1" aria-label="Tăng khối lượng">+</button></div></div>
    <div class="qo-info" id="qo-info"></div>
    <button type="button" class="btn btn-lg qo-go ${buy ? "tr-buy" : "tr-sell"}" id="qo-go">${buy ? "Mua" : "Bán"}</button>
    <button type="button" class="icon-btn qo-x" id="qo-x" aria-label="Đóng">${icon("x", 18)}</button>`;
  const info = () => {
    const q2 = TRADE.q[s.sym], box = document.getElementById("qo-info");
    if (!box) return;
    if (!s.sym) { box.innerHTML = `<span class="text-3">Nhập mã cổ phiếu</span>`; return; }
    if (!q2) { box.innerHTML = `<span class="px-down">Không tìm thấy mã ${esc(s.sym)}</span>`; return; }
    const p = s.type === "MP" ? trMarketPrice(q2, s.side) : s.price || 0, val = s.qty * p * 1000, fee = val * TR_FEE, tax = buy ? 0 : val * TR_TAX;
    box.innerHTML = `<div><span class="px-ceil">Trần ${trP(q2.ceil)}</span> · <span class="px-floor">Sàn ${trP(q2.floor)}</span> · <span class="px-ref">TC ${trP(q2.ref)}</span> · <span class="${trTone(q2)}">Khớp ${trP(q2.last)}</span></div>
      <div>${buy ? `Sức mua <strong>${trVND(trAvailableCash())}</strong>` : `Có thể bán <strong>${trInt(trAvailableShares(s.sym))}</strong> CP`} · ${buy ? "Tổng trả" : "Nhận về"} <strong>${trVND(buy ? val + fee : val - fee - tax)}</strong></div>`;
  };
  info();
  el.querySelectorAll("[data-qo-side]").forEach(b => b.onclick = () => { s.side = b.dataset.qoSide; const q2 = TRADE.q[s.sym]; if (q2 && s.type === "LO") s.price = trMarketPrice(q2, s.side); trQuickDraw(); });
  const symIn = document.getElementById("qo-sym");
  symIn.onchange = async () => {
    s.sym = symIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); s.price = null;
    if (s.sym && !TRADE.q[s.sym]) { try { await trFetchQuotes([s.sym]); } catch (e) { /* info shows it */ } }
    trQuickDraw();
  };
  symIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); symIn.blur(); } };
  document.getElementById("qo-type").onchange = e => { s.type = e.target.value; if (s.type === "LO") { const q2 = TRADE.q[s.sym]; s.price = q2 ? trMarketPrice(q2, s.side) : null; } trQuickDraw(); };
  const pin = document.getElementById("qo-price"), qin = document.getElementById("qo-qty");
  pin.oninput = () => { s.price = parseFloat(String(pin.value).replace(",", ".")) || 0; info(); };
  qin.oninput = () => { s.qty = parseInt(String(qin.value).replace(/[^0-9]/g, ""), 10) || 0; info(); };
  el.querySelectorAll("[data-qo-step]").forEach(b => b.onclick = () => {
    const q2 = TRADE.q[s.sym]; if (!q2) return;
    const p = s.price || q2.last, st = trTick(p, q2.market);
    let v = Math.round((p + st * +b.dataset.qoStep) / st) * st;
    v = Math.min(q2.ceil || v, Math.max(q2.floor || v, v));
    s.price = +v.toFixed(2); pin.value = trP(v); info();
  });
  el.querySelectorAll("[data-qo-qty]").forEach(b => b.onclick = () => { s.qty = Math.max(TR_LOT, s.qty + TR_LOT * +b.dataset.qoQty); qin.value = s.qty; info(); });
  document.getElementById("qo-x").onclick = trQuickClose;
  el.onkeydown = e => { if (e.key === "Escape") trQuickClose(); };
  document.getElementById("qo-go").onclick = async () => {
    const q2 = TRADE.q[s.sym];
    if (!q2) { toast(s.sym ? `Không tìm thấy mã ${s.sym}` : "Nhập mã cổ phiếu", "error"); return; }
    const p = s.type === "MP" ? trMarketPrice(q2, s.side) : s.price;
    const verb = buy ? "Mua" : "Bán";
    if (!await confirmDialog({ title: `${verb} ${trInt(s.qty)} ${s.sym}?`, message: `${s.type === "MP" ? "Lệnh MP (thị trường)" : `Lệnh LO giá ${trP(p)}`} · khoảng ${trVND(s.qty * p * 1000)} chưa gồm phí. Chỉ là giả lập — không dùng tiền thật.`, confirmText: verb })) return;
    const res = trPlace({ sym: s.sym, side: s.side, type: s.type, qty: s.qty, price: Math.round(p * 100) / 100 });
    if (typeof res === "string") { toast(res, "error"); return; }
    toast(res.status === "filled" ? `Đã khớp: ${res.side === "B" ? "mua" : "bán"} ${trInt(res.qty)} ${s.sym} giá ${trP(res.fill)}` : `Đã đặt lệnh — sẽ khớp khi giá chạm ${trP(res.price)}`);
    trQuickDraw();
    const [route, sub] = currentRoute();
    if (route === "trade" && !sub && typeof TRADE.redraw === "function") TRADE.redraw();
  };
}

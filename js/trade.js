// ============================================================
// trade.js — Giả lập chứng khoán (paper trading) with real Vietnamese prices
//
// Prices: VPS price board (quotes, order book, foreign trading, index
// values, every code on HOSE/HNX/UPCoM with company names, the index
// baskets) and VNDirect charts (history, VN-Index). Both answer browsers
// directly. A whole exchange is ~400–800 codes: the board refreshes the
// rows on screen and updates the numbers in place. Money is virtual; orders follow the main
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
// Board groups. Tabs: your two lists, VN30 and the three exchanges (every listed stock, live from VPS).
// The picker holds the other index baskets (live), a few hand-picked sectors and the listed funds.
const TR_TABS = [["watch", "Theo dõi"], ["hold", "Nắm giữ"], ["VN30", "VN30"], ["HOSE", "HOSE"], ["HNX", "HNX"], ["UPCOM", "UPCoM"]];
const TR_MORE = [
  ["Chỉ số", [["VN100", "VN100"], ["VNMID", "VNMidcap"], ["VNSML", "VNSmallcap"], ["VNX50", "VNX50"], ["VNDIAMOND", "VNDiamond"], ["VNFINLEAD", "VNFinLead"], ["HNX30", "HNX30"]]],
  ["Ngành", [["bank", "Ngân hàng"], ["sec", "Chứng khoán"], ["re", "Bất động sản"]]],
  ["Quỹ", [["ETF", "Quỹ ETF"]]]
];
const TR_SECTORS = {
  bank: ["ACB", "BID", "CTG", "EIB", "HDB", "LPB", "MBB", "MSB", "NAB", "OCB", "SHB", "SSB", "STB", "TCB", "TPB", "VCB", "VIB", "VPB"],
  sec: ["SSI", "VND", "HCM", "VCI", "SHS", "MBS", "FTS", "BSI", "CTS", "VIX", "VDS", "AGR", "ORS"],
  re: ["VHM", "VIC", "VRE", "NVL", "PDR", "DXG", "KDH", "NLG", "DIG", "CEO", "KBC", "IDC", "HDG", "DXS"]
};
const TR_EXCH = { HOSE: "hose", HNX: "hnx", UPCOM: "upcom" };          // VPS names of the full exchange lists
// listed funds (ETFs and closed-end funds on HOSE), used when the full code list can't load
const TR_FUNDS = ["E1VFVN30", "FUEVFVND", "FUESSVFL", "FUEVN100", "FUEDCMID", "FUEKIV30", "FUEMAV30", "FUESSV30", "FUESSV50", "FUETCC50", "FUEPHVNS", "FUEKIVND",
  "FUEMAVND", "FUEABVND", "FUEBFVND", "FUEFCV50", "FUEIP100", "FUEKIVFS", "FUEMITEC", "FUETPVND", "FUEVN50G", "FUCTVGF4", "FUCTVGF5", "FUCVREIT"];
const TR_GROUP_TIPS = { watch: "Danh sách theo dõi của bạn", hold: "Cổ phiếu bạn đang nắm giữ", VN30: "30 cổ phiếu vốn hóa lớn nhất HOSE",
  HOSE: "Tất cả cổ phiếu niêm yết trên HOSE", HNX: "Tất cả cổ phiếu niêm yết trên HNX", UPCOM: "Tất cả cổ phiếu giao dịch trên UPCoM" };
const trGroupLabel = g => (TR_TABS.find(x => x[0] === g) || TR_MORE.flatMap(x => x[1]).find(x => x[0] === g) || [g, g])[1];
const TRADE = { q: {}, seen: {}, at: 0, err: "", loading: false, timer: null, tab: "board", group: "VN30", lists: {}, idx: null, prev: {}, bars: {}, range: "ALL", interval: "auto", chartRequest: null,
  side: "B", type: "LO", vnindex: null, sort: null, uni: null, uniP: null, fullAt: 0, fullKey: "", shown: 0 };

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
// Tick sizes: HOSE stocks by price band, HOSE funds and ETFs 10 ₫, HNX and UPCoM 100 ₫
function trTick(price, q) {
  if (q && q.market && q.market !== "STO") return 0.1;
  if (q && q.fund) return 0.01;
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
    bid: [x.g1, x.g2, x.g3].map(lvl), ask: [x.g4, x.g5, x.g6].map(lvl), fBuy: num(x.fBVol) * 10, fSell: num(x.fSVolume) * 10, fRoom: num(x.fRoom),
    fund: /(EF|MF)$/.test(x.productId || ""), at: Date.now() };
}
// Quotes in batches of 200 codes, up to 4 requests at a time (a whole exchange is ~400–800 codes)
async function trFetchQuotes(syms) {
  syms = [...new Set(syms.filter(Boolean))];
  if (!syms.length) return [];
  const out = [], parts = [];
  for (let i = 0; i < syms.length; i += 200) parts.push(syms.slice(i, i + 200));
  let next = 0;
  const worker = async () => {
    while (next < parts.length) {
      const part = parts[next++];
      const r = await fetch(TR_API + "getliststockdata/" + part.join(","), { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach(x => { if (x && x.sym) { TRADE.q[x.sym] = trParseQuote(x); out.push(x.sym); } });
      part.forEach(s => { TRADE.seen[s] = 1; });         // asked for — a code with no answer has no trading data
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, parts.length) }, worker));
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
// The codes of a board group, if known without a request
function trGroupNow(g) {
  const T = tradeData();
  if (g === "watch") return T.watch;
  if (g === "hold") return Object.keys(T.holdings);
  if (TR_SECTORS[g]) return TR_SECTORS[g];
  if (g === "ETF") return TRADE.uni ? TRADE.uni.items.filter(x => x.fund).map(x => x.s) : null;
  return TRADE.lists[g] || null;
}
async function trGroupList(g) {
  const now = trGroupNow(g);
  if (now) return now;
  if (g === "ETF") { try { await trUniverse(); return trGroupNow("ETF"); } catch (e) { return TR_FUNDS; } }
  try {
    const r = await fetch(TR_API + "getlistckindex/" + (TR_EXCH[g] || g), { cache: "no-store" });
    const a = await r.json();
    if (Array.isArray(a) && a.length) TRADE.lists[g] = a;
  } catch (e) { /* fall back below */ }
  return TRADE.lists[g] || (g === "VN30" ? TR_VN30 : []);
}

// ---------- Every listed code with its company name (for search) ----------
// ~1,500 stocks plus the listed funds; kept on this device for 3 days
const TR_UNI_KEY = "cfaStudy_vnstocks";
const trFold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
function trShortName(n, code) {
  let s = String(n || "").replace(/\s+/g, " ").trim().replace(/^Cổ phiếu\s+/iu, "");
  if (code) s = s.replace(new RegExp(`^${code}\\s*[-–]\\s*`), "");
  s = s.replace(/^(Công ty cổ phần|Công ty CP|CTCP)\s+/iu, "").replace(/Ngân hàng Thương mại Cổ phần/iu, "Ngân hàng TMCP")
    .replace(/\s*[-–]\s*(Công ty cổ phần|Công ty CP|CTCP)\s*$/iu, "");
  return s || String(n || code || "");
}
function trUniSet(list) {
  const by = {}, rank = { HOSE: 0, HNX: 1, UPCOM: 2 };          // search shows HOSE stocks first, funds last
  const items = list.map(([s, ex, t, n]) => (by[s] = { s, ex: ex === "UPCOM" ? "UPCoM" : ex, r: t !== "S" ? 3 : rank[ex] ?? 3, fund: t !== "S", n, f: trFold(n) }));
  items.sort((a, b) => a.s < b.s ? -1 : a.s > b.s ? 1 : 0);
  return (TRADE.uni = { items, by });
}
function trUniCache() {
  try {
    const c = JSON.parse(localStorage.getItem(TR_UNI_KEY) || "null");
    if (c && c.v === 1 && Array.isArray(c.list) && c.list.length > 500) return c;
  } catch (e) { /* ignore */ }
  return null;
}
// The saved copy, whatever its age, without a request (names and the fund list show at once)
function trUniQuick() { if (!TRADE.uni) { const c = trUniCache(); if (c) trUniSet(c.list); } }
function trUniverse() {
  if (TRADE.uni && TRADE.uniFresh) return Promise.resolve(TRADE.uni);
  if (!TRADE.uniP) TRADE.uniP = (async () => {
    const c = trUniCache(), ok = !!c;
    if (ok && Date.now() - c.at < 3 * 86400000) { TRADE.uniFresh = true; return trUniSet(c.list); }
    try {
      const r = await fetch(TR_API + "getlistallstock", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const all = await r.json();
      // stocks still trading, by the exchange lists (an exchange whose list didn't load keeps all its codes)
      const live = {};
      await Promise.all(Object.keys(TR_EXCH).map(async g => { const a = await trGroupList(g); if (a.length) live[g] = new Set(a); }));
      const list = (Array.isArray(all) ? all : []).filter(x => x && x.stock_code && (x.type === "S" ? (!live[x.post_to] || live[x.post_to].has(x.stock_code)) : x.type === "E" || x.type === "U"))
        .map(x => [x.stock_code, String(x.post_to || "").toUpperCase(), x.type, trShortName(x.name_vn, x.stock_code)]);
      if (list.length < 500) throw new Error("short list");
      try { localStorage.setItem(TR_UNI_KEY, JSON.stringify({ v: 1, at: Date.now(), list })); } catch (e) { /* storage full: keep it in memory */ }
      TRADE.uniFresh = true;
      return trUniSet(list);
    } catch (e) {
      if (ok) return trUniSet(c.list);                 // an older copy still works
      TRADE.uniP = null;
      throw e;
    }
  })();
  return TRADE.uniP;
}
const trName = sym => (TRADE.uni && TRADE.uni.by[sym] ? TRADE.uni.by[sym].n : "");
// Search by code or company name (accents optional): exact code, code prefix, name, then code anywhere
function trFind(text, max = 8) {
  const u = TRADE.uni, code = text.toUpperCase().replace(/[^A-Z0-9]/g, ""), f = trFold(text.trim());
  if (!u || (!code && f.length < 2)) return [];
  const hits = [];
  u.items.forEach(x => {
    let sc = -1;
    if (code && x.s === code) sc = 0;
    else if (code && x.s.startsWith(code)) sc = 1;
    else if (f.length >= 2 && x.f.includes(f)) sc = x.f.startsWith(f) || x.f.includes(" " + f) ? 2 : 3;
    else if (code.length >= 2 && x.s.includes(code)) sc = 4;
    if (sc >= 0) hits.push([sc, x]);
  });
  hits.sort((a, b) => a[0] - b[0] || a[1].r - b[1].r || (a[1].s < b[1].s ? -1 : 1));
  return hits.slice(0, max).map(h => h[1]);
}
async function trFetchBars(sym, range) {
  const key = `${sym}|${range}`, hit = TRADE.bars[key];
  const cacheMs = range === "1D" ? 60000 : 300000;
  if (hit && hit.pending) return hit.pending;
  if (hit && Date.now() - hit.at < cacheMs) return hit.bars;
  const entry = { pending: trLoadBars(sym, range) };
  TRADE.bars[key] = entry;
  try {
    entry.bars = await entry.pending;
    entry.at = Date.now();
    return entry.bars;
  } catch (e) {
    if (TRADE.bars[key] === entry) delete TRADE.bars[key];
    throw e;
  } finally {
    delete entry.pending;
  }
}

const trChartLocalTime = t => new Date((t + 7 * 3600) * 1000);
const trChartDate = t => trChartLocalTime(t).toISOString().slice(0, 10).split("-").reverse().join("/");
const TR_RANGE_DAYS = { "1M": 31, "3M": 92, "6M": 183, "1Y": 366, "3Y": 1100 };

async function trLoadBars(sym, range) {
  const now = Math.floor(Date.now() / 1000);
  const from = range === "1D" ? now - 6 * 86400 : 0;
  const resolution = range === "1D" ? "5" : range === "HOUR" ? "60" : "D";
  const r = await fetch(`${TR_BARS}?resolution=${resolution}&symbol=${encodeURIComponent(sym)}&from=${from}&to=${now}`, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const body = (await r.text()).trim();
  if (!body) return [];
  const j = JSON.parse(body);
  if (j.s === "no_data") return [];
  const columns = [j.t, j.o, j.h, j.l, j.c, j.v];
  if (j.s !== "ok" || !columns.every(col => Array.isArray(col) && col.length === j.t.length && col.every(Number.isFinite))) {
    throw new Error("Invalid VNDirect chart data");
  }
  const bars = j.t.map((t, i) => ({ t, o: j.o[i], h: j.h[i], l: j.l[i], c: j.c[i], v: j.v[i] }))
    .sort((a, b) => a.t - b.t).filter((bar, i, rows) => !i || bar.t !== rows[i - 1].t);
  if (range === "1D" && bars.length) {
    const last = trChartDate(bars[bars.length - 1].t);
    return bars.filter(b => trChartDate(b.t) === last);
  }
  return bars;
}

function trVisibleBars(bars, range) {
  if (range === "ALL" || !bars.length) return bars;
  if (range === "1D") {
    const lastDay = trChartDate(bars.at(-1).end ?? bars.at(-1).t);
    return bars.filter(b => trChartDate(b.end ?? b.t) === lastDay);
  }
  const from = Date.now() / 1000 - TR_RANGE_DAYS[range] * 86400;
  return bars.filter(b => (b.end ?? b.t) >= from);
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
  const step = trTick(type === "LO" ? price : q.last, q);
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
  for (const { values } of opts.overlays || []) {
    for (const value of values) {
      if (value === null) continue;
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
  }
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1; lo -= pad; hi += pad;
  const y = v => top + (hi - v) / (hi - lo) * plotH;
  const vmax = Math.max(...bars.map(b => b.v || 0)) || 1;
  const bw = Math.min(10, step * 0.62);
  const wickWidth = Math.min(1, step * 0.48).toFixed(2);
  const marks = bars.map((b, i) => {
    const x = i * step + step / 2, cls = b.c >= b.o ? "tr-up" : "tr-down";
    const y1 = y(Math.max(b.o, b.c)), y2 = y(Math.min(b.o, b.c));
    return `<line class="${cls}" style="stroke-width:${wickWidth}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y(b.h).toFixed(1)}" y2="${y(b.l).toFixed(1)}"/><rect class="${cls}" x="${(x - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(2)}" height="${Math.max(1, y2 - y1).toFixed(1)}"/>`;
  }).join("");
  const volumeWidth = (step * 0.6).toFixed(2);
  const vol = bars.map((b, i) => { const hgt = (b.v || 0) / vmax * (VH - 6); return `<rect class="${b.c >= b.o ? "tr-vup" : "tr-vdown"}" x="${(i * step + step * 0.2).toFixed(1)}" y="${(H - 18 - hgt).toFixed(1)}" width="${volumeWidth}" height="${hgt.toFixed(1)}"/>`; }).join("");
  const ticks = [0, 1, 2, 3].map(k => lo + pad + (hi - lo - 2 * pad) * k / 3);
  const axis = ticks.map(v => `<line class="tr-grid" x1="0" x2="${plotW}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tr-axis" x="${plotW + 6}" y="${(y(v) + 4).toFixed(1)}">${trP(v)}</text>`).join("");
  const spansYears = trChartLocalTime(bars[0].t).getUTCFullYear() !== trChartLocalTime(bars[n - 1].t).getUTCFullYear();
  const fmtT = t => {
    const iso = trChartLocalTime(t).toISOString();
    if (opts.intraday) return iso.slice(11, 16);
    if (opts.yearly) return iso.slice(0, 4);
    if ((opts.calendar || opts.hourly) && spansYears) return iso.slice(0, 7).split("-").reverse().join("/");
    if (opts.hourly) return `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
    return iso.slice(5, 10).split("-").reverse().join("/");
  };
  const labelIndexes = new Set([0, Math.floor(n / 2), n - 1]);
  const labels = Array.from(labelIndexes, i => {
    const anchor = n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle";
    return `<text class="tr-axis" x="${(i * step + step / 2).toFixed(1)}" y="${H - 4}" text-anchor="${anchor}">${fmtT(bars[i].t)}</text>`;
  }).join("");
  const ref = opts.ref ? `<line class="tr-refline" x1="0" x2="${plotW}" y1="${y(opts.ref).toFixed(1)}" y2="${y(opts.ref).toFixed(1)}"/>` : "";
  const overlays = (opts.overlays || []).map(series => trTechnicalPath(series, step, y)).join("");
  return `<svg class="tr-chart" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" data-n="${n}" data-step="${step}" role="img" aria-label="Biểu đồ giá">${axis}${ref}${marks}${overlays}${vol}${labels}<line class="tr-cross" x1="0" x2="0" y1="${top}" y2="${H - 18}" visibility="hidden"/></svg>`;
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
function trStatsHtml() {
  const T = tradeData(), nav = trNav(), ret = T.initial ? (nav - T.initial) / T.initial * 100 : 0;
  const holdVal = Object.entries(T.holdings).reduce((s, [k, h]) => s + h.qty * ((TRADE.q[k] || {}).last || h.cost / h.qty / 1000) * 1000, 0);
  const unreal = holdVal - Object.values(T.holdings).reduce((s, h) => s + h.cost, 0);
  return `<div class="card stat"><span class="stat-label">Tài sản ròng</span><span class="stat-value">${trBig(nav)}</span><span class="stat-hint">${trVND(nav)}</span></div>
    <div class="card stat"><span class="stat-label">Lãi/lỗ từ ${trDate(T.start)}</span><span class="stat-value ${trPlTone(ret)}">${trPct(ret)}</span><span class="stat-hint">${trSigned(nav - T.initial)}</span></div>
    <div class="card stat"><span class="stat-label">Sức mua</span><span class="stat-value">${trBig(trAvailableCash())}</span><span class="stat-hint">${trVND(trAvailableCash())}${trReservedCash() ? ` · ${trVND(trReservedCash())} đang giữ cho lệnh chờ` : ""}</span></div>
    <div class="card stat"><span class="stat-label">Lãi/lỗ chưa chốt</span><span class="stat-value ${trPlTone(unreal)}">${trSigned(unreal / 1e6, v => v.toFixed(2))}<small class="tr-unit">triệu ₫</small></span><span class="stat-hint">${Object.keys(T.holdings).length} mã đang nắm giữ</span></div>`;
}
function trSegHtml() {
  const nHold = Object.keys(tradeData().holdings).length, nPend = trPending().length;
  return [["board", "Bảng giá"], ["portfolio", `Danh mục (${nHold})`], ["orders", `Sổ lệnh${nPend ? ` · ${nPend} chờ` : ""}`]].map(([k, l]) =>
    `<button role="tab" aria-selected="${TRADE.tab === k}" class="${TRADE.tab === k ? "active" : ""}" data-tr-tab="${k}">${l}</button>`).join("");
}
const trErrHtml = () => TRADE.err ? `<div class="callout danger section">${icon("alert", 18)}<div style="flex:1">${esc(TRADE.err)}</div><button class="btn btn-secondary btn-sm" data-tr-retry>Thử lại</button></div>` : "";

function renderTrade(sub, sym) {
  if (sub === "s" && sym) return renderTradeStock(String(sym).toUpperCase());
  trUniQuick();
  let list = trGroupNow(TRADE.group) || [];
  const extra = () => [...Object.keys(tradeData().holdings), ...trPending().map(o => o.sym)];
  const here = () => currentRoute()[0] === "trade" && !currentRoute()[1];
  // the whole page: on opening, and when the tab, group or view changes
  const draw = () => {
    if (!here()) return;
    const fs = document.fullscreenElement;
    if (fs && fs.id === "vb-card" && TRADE.tab === "board") {          // full screen: rebuild only the board
      trProcessPending();
      const tmp = document.createElement("div");
      tmp.innerHTML = trBoardHtml(list);
      const fresh = tmp.querySelector("#vb-card");
      if (fresh) {
        const ticket = document.getElementById("tr-qo");
        fs.dataset.board = fresh.dataset.board; fs.replaceChildren(...fresh.childNodes);
        if (ticket) fs.appendChild(ticket);
        trBindMain(ctx);
      }
      return;
    }
    trProcessPending();
    if (TRADE.at) trSnapshot(trNav());
    view.innerHTML = `
      ${pageHeader("Giả lập chứng khoán", "Giao dịch bằng tiền ảo với giá thật của mọi mã trên HOSE, HNX và UPCoM", trHeadActions(), "Tiền ảo · giá thật")}
      <div id="tr-err">${trErrHtml()}</div>
      <div class="grid grid-stats" id="tr-stats">${trStatsHtml()}</div>
      <div class="tr-tabs section">
        <div class="segmented" role="tablist" id="tr-seg">${trSegHtml()}</div>
        <span class="text-3 small" id="tr-upd">${trUpdatedHtml()}</span>
      </div>
      ${TRADE.tab === "portfolio" ? trPortfolioHtml() : TRADE.tab === "orders" ? trOrdersHtml() : trBoardHtml(list)}
      <p class="text-3 small section">Chỉ để luyện tập — không dùng tiền thật, không đặt lệnh thật. Phí ${(TR_FEE * 100).toFixed(2).replace(".", ",")}% mỗi lệnh, thuế ${(TR_TAX * 100).toFixed(1).replace(".", ",")}% khi bán; lô ${TR_LOT} cổ phiếu; cổ phiếu mua về bán được sau T+2; lệnh LO chưa khớp tự hủy cuối ngày.</p>`;
    trBindMain(ctx);
    if (TRADE.tab === "portfolio") trDrawPerformance();
  };
  // new prices: change the numbers in place, so scrolling, the search box and the order ticket stay put
  const paint = () => {
    if (!here()) return;
    const body = document.getElementById("vb-body");
    if (TRADE.tab !== "board" || !body) return draw();
    trProcessPending();
    if (TRADE.at) trSnapshot(trNav());
    body.innerHTML = trBoardRows(list);
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set("tr-err", trErrHtml()); set("tr-stats", trStatsHtml()); set("tr-seg", trSegHtml()); set("tr-upd", trUpdatedHtml());
    set("tr-mk", trMarketStrip()); set("vb-count", trCountHtml());
    trTabCounts();
  };
  const reload = async (quiet, all) => {
    const g = TRADE.group, known = !!trGroupNow(g);
    const got = await trGroupList(g);
    if (TRADE.group !== g) return;                        // the group changed meanwhile; that load paints
    list = got;
    if (!known) paint();                                  // show the codes while their prices load
    // a long list refreshes the rows on screen (and your own stocks) every 10 s, all of it once a minute;
    // on the portfolio and order tabs only your own stocks
    const board = TRADE.tab === "board";
    all = board && (all || list.length <= 150 || TRADE.fullKey !== g || Date.now() - TRADE.fullAt > 60000);
    await Promise.all([trRefresh([...(!board ? [] : all ? list : trVisibleSyms()), ...extra()], quiet), trFetchIndexes()]);
    if (all && !TRADE.err) { TRADE.fullAt = Date.now(); TRADE.fullKey = g; }
    if (TRADE.group === g) paint();
  };
  const setGroup = g => {
    if (!g || g === TRADE.group) return;
    TRADE.group = g; TRADE.prev = {};
    list = trGroupNow(g) || [];
    draw();
    reload(true, true);
  };
  // rows scrolled into view while the market is open get fresh prices if theirs are old
  const fillVisible = async () => {
    if (!here() || trStatus().code !== "open") return;
    const old = trVisibleSyms(8).filter(s => !TRADE.q[s] || Date.now() - TRADE.q[s].at > 15000);
    if (!old.length) return;
    try { await trFetchQuotes(old); paint(); } catch (e) { /* the next refresh tries again */ }
  };
  const ctx = { draw, paint, reload, setGroup, fillVisible, list: () => list };
  TRADE.redraw = paint;
  draw();
  reload(true, true);
  trAutoRefresh(() => reload(true));
}

// ---------- Price board (bảng điện) ----------
// View (full 25 columns / compact 6 columns) and light/dark board are remembered on this device
const TR_BOARD_VIEW = "cfaStudy_board_view", TR_BOARD_THEME = "cfaStudy_board_theme";
function trPref(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function trSetPref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
function trBoardView() { const v = trPref(TR_BOARD_VIEW); return v === "full" || v === "compact" ? v : window.innerWidth < 768 ? "compact" : "full"; }
function trBoardTheme() {
  const v = trPref(TR_BOARD_THEME);
  if (v === "dark" || v === "light") return v;
  const a = document.documentElement.getAttribute("data-theme");
  return a === "dark" ? "dark" : a === "light" ? "light" : (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
const trV10 = v => v ? trInt(v / 10) : "";          // board volumes in units of 10 shares, as on Vietnamese boards
const trShort = v => !v ? "" : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(1)}K` : trInt(v);

// Market strip: the four indices with their breadth (advancers / unchanged / decliners)
function trMarketStrip() {
  if (!TRADE.idx || !TRADE.idx.length) return "";
  return `<div class="mk section" data-board="${trBoardTheme()}">${TRADE.idx.map(x => {
    const t = trPlTone(x.chg);
    return `<div class="mk-i">
      <div class="mk-top"><span class="mk-name">${x.name}</span><span class="mk-pill ${t}">${trPct(x.pct)}</span></div>
      <div class="mk-v">${x.v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="mk-c ${t}">${trSigned(x.chg, v => v.toFixed(2))} điểm</div>
      <div class="mk-br" role="img" aria-label="${x.up} mã tăng, ${x.same} đứng giá, ${x.down} mã giảm"><i class="b-up" style="flex:${x.up || 0}"></i><i class="b-ref" style="flex:${x.same || 0}"></i><i class="b-down" style="flex:${x.down || 0}"></i></div>
      <div class="mk-meta"><span><b class="px-up">▲ ${x.up}</b><b class="px-ref">■ ${x.same}</b><b class="px-down">▼ ${x.down}</b></span><span>${trInt(x.value / 1000)} tỷ</span></div>
    </div>`;
  }).join("")}</div>`;
}

// Sorting by a column: numbers go high→low, then low→high, then back to the list's own order (codes: A→Z, Z→A, own order)
const TR_SORT_KEYS = { last: q => q.last, chg: q => q.chg, pct: q => q.pct, vol: q => q.vol, fb: q => q.fBuy, fs: q => q.fSell };
const TR_SORT_NAMES = { sym: "mã", last: "giá khớp", chg: "mức thay đổi", pct: "% thay đổi", vol: "tổng khối lượng", fb: "khối lượng nước ngoài mua", fs: "khối lượng nước ngoài bán" };
function trToggleSort(k) {
  const s = TRADE.sort, first = k === "sym" ? 1 : -1;
  TRADE.sort = !s || s.k !== k ? { k, dir: first } : s.dir === first ? { k, dir: -first } : null;
}
function trSorted(list) {
  const s = TRADE.sort;
  if (!s) return list;
  if (s.k === "sym") return list.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0) * s.dir);
  const get = TR_SORT_KEYS[s.k];
  if (!get) return list;
  return list.slice().sort((a, b) => {
    const qa = TRADE.q[a], qb = TRADE.q[b];
    if (!qa || !qb) return qa ? -1 : qb ? 1 : 0;
    return (get(qa) - get(qb)) * s.dir || (a < b ? -1 : 1);
  });
}
// The codes of the rows on screen (plus a margin), found by halving — a list can have 800 rows
function trVisibleSyms(pad = 15) {
  const wrap = document.getElementById("vb-wrap"), body = document.getElementById("vb-body");
  if (!wrap || !body || !body.rows.length) return [];
  const rows = body.rows, n = rows.length, box = wrap.getBoundingClientRect();
  const top = Math.max(box.top, 0), bot = Math.min(box.bottom, window.innerHeight);
  if (bot <= top) return [];
  const firstBelow = y => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m].getBoundingClientRect().bottom <= y) lo = m + 1; else hi = m; } return lo; };
  const out = [];
  for (let i = Math.max(0, firstBelow(top) - pad), end = Math.min(n, firstBelow(bot) + pad + 1); i < end; i++) {
    const s = rows[i].dataset.trOpen;
    if (s) out.push(s);
  }
  return out;
}
function trTabCounts() {
  const T = tradeData();
  [["watch", T.watch.length], ["hold", Object.keys(T.holdings).length]].forEach(([g, n]) => { const el = document.querySelector(`[data-tr-group="${g}"] .n`); if (el) el.textContent = n; });
}
const trCountHtml = () => `${esc(trGroupLabel(TRADE.group))} · ${trInt(TRADE.shown)} mã`;

function trBoardHead(full) {
  const s = TRADE.sort;
  // a sortable header: click (or Enter) to sort; the arrow shows the order
  const sh = (k, label, cls = "", span = "") => {
    const on = s && s.k === k, dir = on ? s.dir : k === "sym" ? 1 : -1;
    return `<th${span}${cls ? ` class="${cls}"` : ""} data-sort="${k}" tabindex="0" aria-sort="${on ? (s.dir === 1 ? "ascending" : "descending") : "none"}" title="Sắp xếp theo ${TR_SORT_NAMES[k]}">${label}<i class="srt${on ? " on" : ""}" aria-hidden="true">${dir === 1 ? "▲" : "▼"}</i></th>`;
  };
  if (!full) return `<thead><tr>${sh("sym", "Mã CK", "vb-sym")}<th class="h-bid">Giá mua</th>${sh("pct", "Khớp", "h-mid")}<th class="h-ask">Giá bán</th>${sh("vol", "Tổng KL")}</tr></thead>`;
  return `<thead>
    <tr>${sh("sym", "Mã CK", "vb-sym", ' rowspan="2"')}<th rowspan="2" class="gs">Trần</th><th rowspan="2">Sàn</th><th rowspan="2">TC</th>
      <th colspan="6" class="g h-bid gs">Bên mua</th><th colspan="4" class="g h-mid gs">Khớp lệnh</th><th colspan="6" class="g h-ask gs">Bên bán</th>
      ${sh("vol", "Tổng KL", "gs", ' rowspan="2"')}<th rowspan="2">Cao</th><th rowspan="2">Thấp</th><th colspan="2" class="g gs">ĐTNN</th></tr>
    <tr><th class="h-bid gs">Giá 3</th><th class="h-bid">KL 3</th><th class="h-bid">Giá 2</th><th class="h-bid">KL 2</th><th class="h-bid">Giá 1</th><th class="h-bid">KL 1</th>
      ${sh("last", "Giá", "h-mid gs")}<th class="h-mid">KL</th>${sh("chg", "+/−", "h-mid")}${sh("pct", "%", "h-mid")}
      <th class="h-ask gs">Giá 1</th><th class="h-ask">KL 1</th><th class="h-ask">Giá 2</th><th class="h-ask">KL 2</th><th class="h-ask">Giá 3</th><th class="h-ask">KL 3</th>
      ${sh("fb", "Mua", "gs")}${sh("fs", "Bán")}</tr></thead>`;
}

// The rows of the board (tbody); cells flash green/red when a price ticks up/down, gold when a volume changes
function trBoardRows(list) {
  const T = tradeData(), full = trBoardView() === "full", view = full ? "full" : "compact", prev = TRADE.prev;
  const market = TRADE.group !== "watch" && TRADE.group !== "hold";
  const num = s => parseFloat(String(s).replace(/,/g, ""));
  const td = (sym, k, txt, o = {}) => {
    const key = `${view}|${sym}|${k}`, old = prev[key];
    prev[key] = txt;
    let fl = "";
    if (old !== undefined && old !== txt && txt !== "") {
      const a = num(old), b = num(txt);
      fl = o.price && isFinite(a) && isFinite(b) ? (b > a ? "fl-up" : "fl-dn") : "fl";
    }
    const cls = [o.cls, fl, o.qo ? "vb-click" : ""].filter(Boolean).join(" ");
    const act = o.qo ? (o.qo.split("|")[1] === "B" ? "Mua" : "Bán") : "";
    return `<td${cls ? ` class="${cls}"` : ""}${o.qo ? ` data-qo="${o.qo}" data-act="${act}" title="Bấm để ${act.toLowerCase()} giá này"` : ""}>${o.html || txt}</td>`;
  };
  // an order-book level: a bid opens a SELL at that price (you hit the bid), an offer opens a BUY (you lift the offer)
  const lvl = (sym, q, side, i, start) => {
    const [p, v, raw] = q[side][i], tone = raw ? "px-ref" : trPxClass(q, p);
    const qo = p && !raw ? `${sym}|${side === "bid" ? "S" : "B"}|${p}` : "";
    const band = side === "bid" ? "bd-bid" : "bd-ask";
    return td(sym, `${side}p${i}`, raw || (p ? trP(p) : ""), { cls: `p ${tone} ${band}${start ? " gs" : ""}`, qo, price: true })
      + td(sym, `${side}v${i}`, trV10(v), { cls: `v ${tone} ${band}`, qo });
  };
  const pctPill = q => `<span class="vb-pct">${trPct(q.pct)}</span>`;
  let shown = 0;
  const rows = trSorted(list).map(sym => {
    const q = TRADE.q[sym], nm = trName(sym), tip = nm ? ` title="${esc(nm)}"` : "";
    if (!q) {
      if (market && TRADE.seen[sym]) return "";            // no trading data (suspended, or not trading yet): left off market lists
      shown++;
      return `<tr class="vb-row" data-tr-open="${sym}" tabindex="0"><th class="vb-sym" scope="row"${tip}><span>${sym}</span></th><td colspan="${full ? 24 : 4}" class="vb-wait">${TRADE.seen[sym] ? "không có dữ liệu" : "đang tải…"}</td></tr>`;
    }
    shown++;
    const t = trTone(q), mine = T.holdings[sym] ? " vb-mine" : "";
    const sym1 = `<th class="vb-sym ${t}" scope="row"${tip}><span>${sym}</span>${full ? "" : `<small>${TR_MARKET[q.market] || ""}</small>`}</th>`;
    if (!full) {
      const [bp, bv, br] = q.bid[0], [ap, av, ar] = q.ask[0];
      const bt = br ? "px-ref" : trPxClass(q, bp), at = ar ? "px-ref" : trPxClass(q, ap);
      return `<tr class="vb-row${mine}" data-tr-open="${sym}" tabindex="0">${sym1}
        ${td(sym, "bidp0", br || (bp ? trP(bp) : "–"), { cls: `c2 bd-bid ${bt}`, qo: bp && !br ? `${sym}|S|${bp}` : "", price: true, html: `<b>${br || (bp ? trP(bp) : "–")}</b><small>${trV10(bv)}</small>` })}
        ${td(sym, "last", trP(q.last), { cls: `c2 m mp ${t}`, qo: `${sym}|B|${q.last}`, price: true, html: `<b>${trP(q.last)}</b>${pctPill(q)}` })}
        ${td(sym, "askp0", ar || (ap ? trP(ap) : "–"), { cls: `c2 bd-ask ${at}`, qo: ap && !ar ? `${sym}|B|${ap}` : "", price: true, html: `<b>${ar || (ap ? trP(ap) : "–")}</b><small>${trV10(av)}</small>` })}
        ${td(sym, "vol", trShort(q.vol / 10), { cls: "tot" })}
      </tr>`;
    }
    return `<tr class="vb-row${mine}" data-tr-open="${sym}" tabindex="0">${sym1}
      <td class="r px-ceil gs">${trP(q.ceil)}</td><td class="r px-floor">${trP(q.floor)}</td><td class="r px-ref">${trP(q.ref)}</td>
      ${lvl(sym, q, "bid", 2, true)}${lvl(sym, q, "bid", 1)}${lvl(sym, q, "bid", 0)}
      ${td(sym, "last", trP(q.last), { cls: `m mp gs ${t}`, qo: `${sym}|B|${q.last}`, price: true })}${td(sym, "lv", trV10(q.lastVol), { cls: `m v ${t}` })}${td(sym, "chg", trSigned(q.chg, trP), { cls: `m ${t}` })}${td(sym, "pct", trPct(q.pct), { cls: `m ${t}`, html: pctPill(q) })}
      ${lvl(sym, q, "ask", 0, true)}${lvl(sym, q, "ask", 1)}${lvl(sym, q, "ask", 2)}
      ${td(sym, "vol", trV10(q.vol), { cls: "tot gs" })}${td(sym, "hi", q.high ? trP(q.high) : "", { cls: `r ${trPxClass(q, q.high)}` })}${td(sym, "lo", q.low ? trP(q.low) : "", { cls: `r ${trPxClass(q, q.low)}` })}
      ${td(sym, "fb", trV10(q.fBuy), { cls: "nn gs" })}${td(sym, "fs", trV10(q.fSell), { cls: "nn" })}
    </tr>`;
  }).join("");
  TRADE.shown = shown;
  const empty = TRADE.group === "hold" ? "Bạn chưa nắm giữ mã nào."
    : TRADE.group === "watch" ? "Danh sách Theo dõi đang trống — tìm mã ở ô tìm kiếm rồi bấm hình ngôi sao để thêm vào đây."
    : list.length && list.every(s => TRADE.seen[s]) ? "Chưa có mã nào trong nhóm này có dữ liệu giao dịch." : "Đang tải danh sách…";
  return rows || `<tr><td colspan="${full ? 25 : 5}" class="vb-wait">${empty}</td></tr>`;
}

function trBoardHtml(list) {
  const T = tradeData(), full = trBoardView() === "full", theme = trBoardTheme();
  const rows = trBoardRows(list), more = TR_MORE.some(x => x[1].some(y => y[0] === TRADE.group));
  return `<div id="tr-mk">${trMarketStrip()}</div>
    <div class="vb-card section" id="vb-card" data-board="${theme}">
      <div class="vb-bar">
        <div class="vb-groups">
          <div class="vb-tabs" role="tablist" aria-label="Nhóm cổ phiếu">${TR_TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${TRADE.group === k}" class="${TRADE.group === k ? "active" : ""}" data-tr-group="${k}"${TR_GROUP_TIPS[k] ? ` title="${TR_GROUP_TIPS[k]}"` : ""}>${l}${k === "watch" ? `<span class="n">${T.watch.length}</span>` : k === "hold" ? `<span class="n">${Object.keys(T.holdings).length}</span>` : ""}</button>`).join("")}</div>
          <label class="vb-pick${more ? " active" : ""}" title="Các chỉ số khác, nhóm ngành và quỹ ETF">
            <span>${more ? esc(trGroupLabel(TRADE.group)) : "Nhóm khác"}</span>${icon("chevron", 13)}
            <select id="vb-more" aria-label="Nhóm khác: chỉ số, ngành, quỹ ETF">${more ? "" : `<option value="" selected disabled hidden>Nhóm khác</option>`}${TR_MORE.map(([lab, items]) => `<optgroup label="${lab}">${items.map(([k, l]) => `<option value="${k}"${TRADE.group === k ? " selected" : ""}>${l}</option>`).join("")}</optgroup>`).join("")}</select>
          </label>
        </div>
        <div class="vb-actions">
          <div class="vb-search" role="search">${icon("search", 15)}<input id="tr-add" placeholder="Tìm mã hoặc tên công ty" maxlength="40" spellcheck="false" autocomplete="off" enterkeyhint="search" role="combobox" aria-expanded="false" aria-controls="vb-sug" aria-autocomplete="list" aria-label="Tìm mã cổ phiếu hoặc tên công ty"><div class="vb-sug" id="vb-sug" role="listbox" aria-label="Kết quả tìm kiếm" hidden></div></div>
          <button type="button" class="vb-icon" id="vb-view" title="${full ? "Chế độ gọn" : "Chế độ đầy đủ"}" aria-label="${full ? "Chuyển sang chế độ gọn" : "Chuyển sang chế độ đầy đủ"}">${icon(full ? "rows" : "columns", 16)}</button>
          <button type="button" class="vb-icon" id="vb-theme" title="${theme === "dark" ? "Nền sáng" : "Nền tối"}" aria-label="${theme === "dark" ? "Chuyển bảng sang nền sáng" : "Chuyển bảng sang nền tối"}">${icon(theme === "dark" ? "sun" : "moon", 16)}</button>
          ${document.fullscreenEnabled ? `<button type="button" class="vb-icon hide-mobile" id="vb-full" title="Toàn màn hình" aria-label="Xem bảng giá toàn màn hình">${icon("expand", 16)}</button>` : ""}
          <button type="button" class="btn btn-primary btn-sm vb-order" id="tr-qo-open">${icon("plus", 15)} Đặt lệnh</button>
        </div>
      </div>
      <div class="vb-wrap" id="vb-wrap">
        <table class="vb ${full ? "vb-wide" : "vb-compact"}">${trBoardHead(full)}<tbody id="vb-body">${rows}</tbody></table>
      </div>
      <div class="vb-foot">
        <span><b id="vb-count">${trCountHtml()}</b> · Giá: nghìn ₫ · KL: 10 cổ phiếu</span>
        <span class="vb-legend"><span><i class="d-up"></i>Tăng</span><span><i class="d-down"></i>Giảm</span><span><i class="d-ref"></i>Tham chiếu</span><span><i class="d-ceil"></i>Trần</span><span><i class="d-floor"></i>Sàn</span></span>
        <span>Bấm giá <b>bên bán</b> để mua, giá <b>bên mua</b> để bán · bấm tên cột để sắp xếp${TRADE.group === "watch" ? " · nhấn giữ mã để bỏ khỏi Theo dõi" : ""}</span>
      </div>
    </div>`;
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

function trBindMain(ctx) {
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; await ctx.reload(false, true); rf.disabled = false; };
  const err = document.getElementById("tr-err");
  if (err) err.onclick = e => { if (e.target.closest("[data-tr-retry]")) ctx.reload(false, true); };
  const seg = document.getElementById("tr-seg");
  if (seg) seg.onclick = e => { const b = e.target.closest("[data-tr-tab]"); if (b) { TRADE.tab = b.dataset.trTab; ctx.draw(); if (TRADE.tab === "board") ctx.reload(true); } };
  view.querySelectorAll("[data-tr-group]").forEach(b => b.onclick = () => ctx.setGroup(b.dataset.trGroup));
  const more = document.getElementById("vb-more");
  if (more) more.onchange = () => ctx.setGroup(more.value);
  view.querySelectorAll("[data-tr-cancel]").forEach(b => b.onclick = () => {
    const o = tradeData().orders.find(x => x.id === b.dataset.trCancel);
    if (o && o.status === "pending") { o.status = "cancelled"; saveData(); toast("Đã hủy lệnh"); ctx.draw(); }
  });
  trBindBoard(ctx);
  trBindSearch(ctx);
  trBindRest(ctx);
  // on a phone the tab strip scrolls: keep the chosen tab in view
  const tabs = document.querySelector(".vb-tabs"), act = tabs && tabs.querySelector(".active");
  if (act) {
    const a = act.getBoundingClientRect(), t = tabs.getBoundingClientRect();
    if (a.right > t.right || a.left < t.left) tabs.scrollLeft += a.left - t.left - 8;
  }
}
// One set of handlers on the board card: rows come and go with every refresh
function trBindBoard(ctx) {
  const card = document.getElementById("vb-card"), wrap = document.getElementById("vb-wrap");
  if (!card) return;
  const sortBy = k => {
    trToggleSort(k);
    const table = wrap && wrap.querySelector("table");
    if (table) { table.innerHTML = trBoardHead(trBoardView() === "full") + `<tbody id="vb-body">${trBoardRows(ctx.list())}</tbody>`; wrap.scrollTop = 0; }
    const f = card.querySelector(`th[data-sort="${k}"]`);
    if (f) f.focus({ preventScroll: true });
  };
  card.onclick = e => {
    const th = e.target.closest("th[data-sort]");
    if (th) { sortBy(th.dataset.sort); return; }
    const row = e.target.closest("tr[data-tr-open]");
    if (!row || e.target.closest("button")) return;
    const qo = e.target.closest("[data-qo]");
    if (qo) { const [s2, side, p] = qo.dataset.qo.split("|"); trQuickOpen({ sym: s2, side, price: +p }); return; }
    location.hash = `#/trade/s/${row.dataset.trOpen}`;
  };
  card.onkeydown = e => {
    if (e.key !== "Enter" || !e.target.closest) return;
    const th = e.target.closest("th[data-sort]");
    if (th) { e.preventDefault(); sortBy(th.dataset.sort); return; }
    if (e.target.matches("tr[data-tr-open]")) location.hash = `#/trade/s/${e.target.dataset.trOpen}`;
  };
  card.oncontextmenu = async e => {
    const row = TRADE.group === "watch" && e.target.closest("tr[data-tr-open]");
    if (!row) return;
    e.preventDefault();
    const sym = row.dataset.trOpen;
    if (!await confirmDialog({ title: `Bỏ ${sym} khỏi Theo dõi?`, confirmText: "Bỏ" })) return;
    const T = tradeData(); T.watch = T.watch.filter(s => s !== sym); saveData(); trTabCounts(); ctx.reload(true);
  };
  if (wrap) wrap.onscroll = () => { clearTimeout(TRADE.scrollT); TRADE.scrollT = setTimeout(ctx.fillVisible, 350); };
}
// Search every listed code by code or company name; Enter or a click opens the stock, the star adds it to Theo dõi
function trBindSearch(ctx) {
  const inp = document.getElementById("tr-add"), box = document.getElementById("vb-sug");
  if (!inp || !box) return;
  let items = [], sel = 0;
  const close = () => { box.hidden = true; inp.setAttribute("aria-expanded", "false"); inp.removeAttribute("aria-activedescendant"); };
  const show = html => { box.innerHTML = html; box.hidden = false; inp.setAttribute("aria-expanded", "true"); };
  const draw = () => {
    if (!items.length) { show(`<div class="vb-sug-empty">Không thấy mã hoặc công ty nào khớp.</div>`); inp.removeAttribute("aria-activedescendant"); return; }
    const W = tradeData().watch;
    show(items.map((x, i) => {
      const on = W.includes(x.s);
      return `<div class="vb-sug-i${i === sel ? " sel" : ""}" role="option" id="vb-sug-${i}" aria-selected="${i === sel}" data-sug="${x.s}">
        <b>${x.s}</b><span class="vb-sug-ex">${x.ex ? esc(x.ex) : "–"}</span><span class="vb-sug-n">${esc(x.n || "")}</span>
        <button type="button" class="vb-star${on ? " on" : ""}" data-star="${x.s}" aria-pressed="${on}" title="${on ? "Bỏ khỏi Theo dõi" : "Thêm vào Theo dõi"}" aria-label="${on ? `Bỏ ${x.s} khỏi Theo dõi` : `Thêm ${x.s} vào Theo dõi`}">${icon("star", 16)}</button>
      </div>`;
    }).join(""));
    inp.setAttribute("aria-activedescendant", "vb-sug-" + sel);
  };
  const run = async () => {
    const text = inp.value.trim();
    if (!text) { close(); return; }
    if (!TRADE.uni) {
      show(`<div class="vb-sug-empty">Đang tải danh sách mã…</div>`);
      try { await trUniverse(); } catch (e) { /* a typed code still works below */ }
      if (inp.value.trim() !== text || document.activeElement !== inp) return;
    }
    items = trFind(text);
    const code = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!items.length && /^[A-Z0-9]{3,9}$/.test(code)) items = [{ s: code, ex: "", n: TRADE.uni ? "Không có trong danh sách — vẫn mở thử" : "Mở mã này" }];
    sel = 0; draw();
  };
  const go = s => { close(); inp.value = ""; inp.blur(); location.hash = `#/trade/s/${s}`; };
  inp.oninput = run;
  inp.onfocus = () => { if (inp.value.trim()) run(); else trUniverse().catch(() => {}); };
  inp.onblur = () => setTimeout(() => { if (document.activeElement !== inp) close(); }, 150);
  inp.onkeydown = e => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !box.hidden && items.length) {
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      draw();
      const el = document.getElementById("vb-sug-" + sel);
      if (el) el.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); if (!box.hidden && items[sel]) go(items[sel].s); else run(); }
    else if (e.key === "Escape") { if (!box.hidden) { e.preventDefault(); close(); } else inp.blur(); }
  };
  box.onmousedown = e => e.preventDefault();            // choosing keeps the focus in the search box
  box.onclick = e => {
    const st = e.target.closest("[data-star]");
    if (st) {
      const T = tradeData(), s = st.dataset.star;
      if (T.watch.includes(s)) { T.watch = T.watch.filter(x => x !== s); toast(`Đã bỏ ${s} khỏi Theo dõi`); }
      else { T.watch.unshift(s); toast(`Đã thêm ${s} vào Theo dõi`); }
      saveData(); trTabCounts(); draw();
      if (TRADE.group === "watch") ctx.reload(true);
      return;
    }
    const it = e.target.closest("[data-sug]");
    if (it) go(it.dataset.sug);
  };
}
function trBindRest(ctx) {
  const qob = document.getElementById("tr-qo-open");
  if (qob) qob.onclick = () => trQuickOpen({});
  const full = document.getElementById("vb-full");
  if (full) full.onclick = () => { const c = document.getElementById("vb-card"); if (document.fullscreenElement) document.exitFullscreen(); else if (c.requestFullscreen) c.requestFullscreen().catch(() => {}); };
  const vw = document.getElementById("vb-view");
  if (vw) vw.onclick = () => { trSetPref(TR_BOARD_VIEW, trBoardView() === "full" ? "compact" : "full"); TRADE.prev = {}; ctx.draw(); };
  const th = document.getElementById("vb-theme");
  if (th) th.onclick = () => { trSetPref(TR_BOARD_THEME, trBoardTheme() === "dark" ? "light" : "dark"); ctx.draw(); };
  const rs = document.getElementById("tr-reset");
  if (rs) rs.onclick = async () => {
    const v = await promptDialog({ title: "Làm lại từ đầu?", message: "Toàn bộ cổ phiếu, lệnh và lịch sử trong phần giả lập sẽ bị xóa, bạn bắt đầu lại với tiền ảo mới.", label: "Vốn ban đầu (triệu ₫)", type: "number", inputmode: "numeric", value: String(Math.round(tradeData().initial / 1e6)), confirmText: "Làm lại", validate: x => (+x >= 1 && +x <= 1000000) ? "" : "Nhập từ 1 đến 1.000.000 (triệu ₫)" });
    if (v === null) return;
    const watch = tradeData().watch;
    DATA.trade = null;
    const T = tradeData(); T.initial = T.cash = Math.round(+v * 1e6); T.watch = watch; saveData();
    toast("Đã làm lại phần giả lập"); ctx.draw();
  };
}

// ---------- One stock: chart, order book, order ticket ----------
const TR_RANGES = [["1D", "Hôm nay"], ["1M", "1 tháng"], ["3M", "3 tháng"], ["6M", "6 tháng"], ["1Y", "1 năm"], ["3Y", "3 năm"], ["ALL", "Toàn bộ"]];
function renderTradeStock(sym) {
  TRADE.range = "ALL";
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
          <p class="tr-name" id="tr-name">${esc(trName(sym))}</p>
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
          <section class="card tr-terminal" aria-label="Biểu đồ và phân tích kỹ thuật">
            <header class="tr-terminal-head">
              <div><h2>${esc(sym)} <span>${TR_MARKET[q.market] || ""}</span></h2>
              <div class="tr-readout small" id="tr-readout"></div></div>
              ${trTechnicalControls()}
            </header>
            <div id="tr-chart-legend" class="tr-chart-legend"></div>
            <div id="tr-chart" class="tr-chart-box"></div>
            <p id="tr-chart-period" class="text-3 small" hidden></p>
            <div id="tr-indicator-plots"></div>
            <div class="tr-terminal-ranges segmented" role="group" aria-label="Khoảng thời gian biểu đồ">${TR_RANGES.map(([r, l]) => `<button type="button" class="${TRADE.range === r ? "active" : ""}" data-tr-range="${r}" aria-pressed="${TRADE.range === r}">${l}</button>`).join("")}</div>
            <div id="tr-technical"></div>
          </section>
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
  trUniQuick();
  draw();
  trRefresh([sym], true).then(draw);
  if (!trName(sym)) trUniverse().then(() => { const el = document.getElementById("tr-name"); if (el) el.textContent = trName(sym); }).catch(() => {});
  trAutoRefresh(() => trRefresh([sym], true).then(() => {
    if (document.querySelector(".tr-indicator-menu[open]") || document.activeElement?.closest(".tr-terminal, #tr-price, #tr-qty")) return;
    draw();
  }));
}
async function trDrawChart(sym) {
  const box = document.getElementById("tr-chart");
  if (!box) return;
  const range = TRADE.range, selection = TRADE.interval;
  const interval = selection === "auto" ? (range === "ALL" || range === "3Y" ? "week" : "day") : selection;
  const intraday = selection === "auto" && range === "1D";
  const hourly = interval === "hour";
  const calendar = ["week", "month", "year"].includes(interval);
  const analysisInterval = selection === "auto" ? "day" : interval;
  const out = document.getElementById("tr-readout"), period = document.getElementById("tr-chart-period");
  const summary = document.getElementById("tr-technical"), plots = document.getElementById("tr-indicator-plots");
  const legend = document.getElementById("tr-chart-legend");
  const request = Symbol();
  TRADE.chartRequest = request;
  const isCurrent = () => TRADE.chartRequest === request && document.getElementById("tr-chart") === box;
  box.innerHTML = '<p class="text-3 small" role="status">Đang tải biểu đồ…</p>';
  out.textContent = "";
  period.hidden = true;
  plots.replaceChildren();
  legend.replaceChildren();
  if (!summary.hasChildNodes()) summary.innerHTML = '<p class="small" role="status">Đang tính chỉ báo…</p>';
  const history = trFetchBars(sym, hourly ? "HOUR" : "HISTORY").catch(() => null);
  try {
    const [raw, minutes] = await Promise.all([history, intraday ? trFetchBars(sym, "1D") : null]);
    if (!isCurrent()) return;
    if (!raw && !minutes) throw new Error("Could not load chart history");
    const allBars = calendar ? trCalendarSeries(raw, interval) : raw || [];
    const bars = intraday ? minutes : trVisibleBars(allBars, range);
    const analysis = analysisInterval === interval && calendar ? allBars : raw;
    const w = Math.max(250, box.clientWidth || 640), q = TRADE.q[sym];
    const technical = trTechnicalView(analysis, intraday ? [] : bars, analysisInterval, w);
    summary.innerHTML = technical.summary;
    plots.innerHTML = technical.plots;
    legend.innerHTML = trTechnicalLegend(technical.overlays);
    summary.querySelector("[data-tr-tech-retry]")?.addEventListener("click", () => trDrawChart(sym));
    box.innerHTML = trChartSvg(bars, w, { intraday, hourly, yearly: interval === "year", calendar: calendar || range === "ALL", overlays: technical.overlays, ref: intraday && q ? q.ref : null, h: w < 500 ? 255 : 350 });
    if (bars.length) {
      const type = intraday ? "5 phút" : TR_CHART_INTERVALS.find(([key]) => key === interval)[1].toLowerCase();
      const first = trChartDate(bars[0].t), last = trChartDate(bars.at(-1).end ?? bars.at(-1).t);
      period.textContent = `VNDirect · Nến ${type} · ${first === last ? first : `${first}–${last}`}${hourly ? " · Có thể thiếu phiên giờ ở các giai đoạn cũ" : ""}`;
      period.hidden = false;
    }
    const svg = box.querySelector("svg"), cross = svg && svg.querySelector(".tr-cross");
    const show = i => {
      const b = bars[i]; if (!b) return;
      const time = trChartLocalTime(b.t).toISOString().slice(11, 16);
      const start = intraday ? time : hourly ? `${trChartDate(b.t)} ${time}` : trChartDate(b.t);
      const dates = b.end && b.end !== b.t ? `${start}–${trChartDate(b.end)}` : start;
      out.innerHTML = `${dates} · M ${trP(b.o)} C ${trP(b.h)} T ${trP(b.l)} <strong>Đ ${trP(b.c)}</strong> · KL ${trInt(b.v)}`;
    };
    if (svg && bars.length) {
      show(bars.length - 1);
      const step = +svg.dataset.step;
      const showPointer = e => {
        const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (w / r.width), i = Math.min(bars.length - 1, Math.max(0, Math.floor(x / step)));
        cross.setAttribute("x1", i * step + step / 2); cross.setAttribute("x2", i * step + step / 2); cross.setAttribute("visibility", "visible");
        show(i);
      };
      svg.addEventListener("pointermove", showPointer);
      svg.addEventListener("pointerdown", showPointer);
      svg.addEventListener("pointerleave", e => {
        if (e.pointerType === "touch") return;
        cross.setAttribute("visibility", "hidden");
        show(bars.length - 1);
      });
    }
  } catch (e) {
    if (!isCurrent()) return;
    const raw = await history;
    const analysis = calendar && analysisInterval === interval && raw ? trCalendarSeries(raw, interval) : raw;
    const technical = trTechnicalView(analysis, [], analysisInterval, 0);
    if (!isCurrent()) return;
    summary.innerHTML = technical.summary;
    summary.querySelector("[data-tr-tech-retry]")?.addEventListener("click", () => trDrawChart(sym));
    box.innerHTML = `<div class="tr-chart-empty">Chưa tải được biểu đồ từ VNDirect. Giá và đặt lệnh vẫn dùng bình thường.<br><button class="btn btn-secondary btn-sm" style="margin-top:10px" id="tr-chart-retry">Thử lại</button></div>`;
    box.querySelector("#tr-chart-retry").onclick = () => trDrawChart(sym);
  }
}
function trBindStock(sym, draw) {
  const T = tradeData(), q = TRADE.q[sym];
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; TRADE.bars = {}; await trRefresh([sym]); draw(); };
  const wt = document.getElementById("tr-watch");
  if (wt) wt.onclick = () => { T.watch.unshift(sym); saveData(); toast(`Đã thêm ${sym} vào Theo dõi`); draw(); };
  const ranges = view.querySelectorAll("[data-tr-range]");
  view.querySelector("#tr-interval").onchange = event => {
    TRADE.interval = event.target.value;
    trDrawChart(sym);
  };
  view.querySelectorAll("[data-tr-indicator]").forEach(input => input.onchange = () => {
    TR_INDICATOR_OPTIONS[input.dataset.trIndicator] = input.checked;
    trDrawChart(sym);
  });
  ranges.forEach(b => b.onclick = () => {
    if (TRADE.range === b.dataset.trRange) return;
    TRADE.range = b.dataset.trRange;
    ranges.forEach(x => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    trDrawChart(sym);
  });
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
    const p = price() || q.last, st = trTick(p, q);
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
  const host = document.fullscreenElement || document.body;        // in full screen the ticket must live inside the board
  if (!el) { el = document.createElement("div"); el.id = "tr-qo"; el.className = "qo"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Đặt lệnh"); }
  if (el.parentNode !== host) host.appendChild(el);
  if (!trQuickOpen.watching) {
    trQuickOpen.watching = true;
    document.addEventListener("fullscreenchange", () => {
      const t = document.getElementById("tr-qo");
      if (t && !document.fullscreenElement && t.parentNode !== document.body) document.body.appendChild(t);
    });
  }
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
    <button type="button" class="btn btn-lg qo-go ${buy ? "tr-buy" : "tr-sell"}" id="qo-go">${buy ? "Mua" : "Bán"} ${esc(s.sym)}</button>
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
    const p = s.price || q2.last, st = trTick(p, q2);
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

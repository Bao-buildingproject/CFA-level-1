// ============================================================
// trade.js — Stock simulator (paper trading) with real Vietnamese prices
//
// Prices: VPS price board (live quotes, order book) and VNDirect charts
// (daily and intraday history, VN-Index). Both answer browsers directly.
// Money is virtual; orders follow the main HOSE rules: 100-share lots,
// tick sizes, ceiling/floor band, day orders, T+2 settlement, broker fee
// and the 0.1% tax on sales. Everything is saved in this profile's data.
// ============================================================

const TR_QUOTES = "https://bgapidatafeed.vps.com.vn/getliststockdata/";
const TR_BARS = "https://dchart-api.vndirect.com.vn/dchart/history";
const TR_FEE = 0.0015, TR_TAX = 0.001, TR_LOT = 100;
const TR_START_CASH = 100000000;
const TR_WATCH = ["ACB", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB", "MSN", "MWG", "PLX", "POW",
  "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"];
const TR_MARKET = { STO: "HOSE", STX: "HNX", UPX: "UPCoM" };
const TRADE = { q: {}, at: 0, err: "", loading: false, timer: null, tab: "market", bars: {}, range: "3M", side: "B", type: "LO", vnindex: null };

// ---------- Account ----------
function tradeData() {
  if (!DATA.trade) DATA.trade = { v: 1, initial: TR_START_CASH, start: trToday(), cash: TR_START_CASH, holdings: {}, orders: [], watch: TR_WATCH.slice(), nav: [], fees: 0 };
  const T = DATA.trade;
  T.holdings = T.holdings || {}; T.orders = T.orders || []; T.watch = T.watch || TR_WATCH.slice(); T.nav = T.nav || [];
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
  if (dow === 0 || dow === 6) return { code: "closed", label: "Weekend · market closed" };
  if (min < 9 * 60) return { code: "closed", label: "Opens at 9:00" };
  if (min < 11 * 60 + 30) return { code: "open", label: "Market open" };
  if (min < 13 * 60) return { code: "break", label: "Lunch break · reopens 13:00" };
  if (min < 14 * 60 + 45) return { code: "open", label: "Market open" };
  return { code: "closed", label: "Closed · opens 9:00" };
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

// ---------- Formatting ----------
const trP = p => (p || 0).toFixed(2);
const trVND = n => `${Math.round(n || 0).toLocaleString("en-US")} ₫`;
const trInt = n => Math.round(n || 0).toLocaleString("en-US");
const trSigned = (n, f = trVND) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f(Math.abs(n))}`;
const trPct = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n || 0).toFixed(2)}%`;
function trTone(q) {
  if (!q) return "";
  if (q.ceil && q.last >= q.ceil) return "px-ceil";
  if (q.floor && q.last <= q.floor) return "px-floor";
  return q.last > q.ref ? "px-up" : q.last < q.ref ? "px-down" : "px-ref";
}
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
  const lvl = s => { const [p, v] = String(s || "").split("|"); return [num(p), num(v) * 10]; };
  const ref = num(x.r), last = num(x.lastPrice) || ref;
  return { sym: x.sym, market: x.marketId, ref, ceil: num(x.c), floor: num(x.f), last, open: num(x.openPrice), high: num(x.highPrice), low: num(x.lowPrice),
    vol: num(x.lot) * 10, chg: last - ref, pct: ref ? (last - ref) / ref * 100 : 0, bid: [x.g1, x.g2, x.g3].map(lvl), ask: [x.g4, x.g5, x.g6].map(lvl) };
}
async function trFetchQuotes(syms) {
  syms = [...new Set(syms.filter(Boolean))];
  if (!syms.length) return [];
  const out = [];
  for (let i = 0; i < syms.length; i += 60) {
    const r = await fetch(TR_QUOTES + syms.slice(i, i + 60).join(","), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const arr = await r.json();
    (Array.isArray(arr) ? arr : []).forEach(x => { if (x && x.sym) { TRADE.q[x.sym] = trParseQuote(x); out.push(x.sym); } });
  }
  TRADE.at = Date.now();
  return out;
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
// Day orders: pending limit orders fill when the price reaches them and expire at the end of the day
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
  if (filled.length) { saveData(); filled.forEach(o => toast(`${o.side === "B" ? "Bought" : "Sold"} ${trInt(o.qty)} ${o.sym} at ${trP(o.fill)}`)); }
  return filled;
}
function trPlace({ sym, side, type, qty, price }) {
  const T = tradeData(), q = TRADE.q[sym];
  if (!q) return "No price for this stock yet — refresh and try again.";
  if (!(qty > 0) || qty % TR_LOT) return `Quantity must be a multiple of ${TR_LOT} shares.`;
  const step = trTick(type === "LO" ? price : q.last, q.market);
  if (type === "LO") {
    if (!(price > 0)) return "Enter a price.";
    if (q.ceil && (price > q.ceil + 1e-9 || price < q.floor - 1e-9)) return `Price must be between the floor ${trP(q.floor)} and the ceiling ${trP(q.ceil)}.`;
    if (!trOnTick(price, step)) return `Price must be in steps of ${trP(step)} (${trInt(step * 1000)} ₫).`;
  }
  const mkt = trMarketPrice(q, side);
  const fillNow = type === "MP" || (side === "B" ? price >= mkt : price <= mkt);
  const at = type === "MP" ? mkt : fillNow ? mkt : price;
  if (side === "B") {
    const need = qty * (type === "LO" ? Math.max(price, at) : at) * 1000 * (1 + TR_FEE);
    if (need > trAvailableCash() + 1) return `Not enough cash: this order needs ${trVND(need)}, you have ${trVND(trAvailableCash())}.`;
  } else {
    const h = T.holdings[sym];
    if (!h) return `You do not own ${sym}.`;
    const avail = trAvailableShares(sym);
    if (qty > avail) return trUnsettled(h) ? `Only ${trInt(avail)} shares can be sold now — shares bought in the last two trading days settle at T+2.` : `You can sell at most ${trInt(avail)} shares.`;
  }
  const o = { id: makeId("o"), sym, side, type, qty, price: type === "LO" ? price : at, status: "pending", d: trToday(), t: new Date().toISOString() };
  T.orders.unshift(o);
  if (T.orders.length > 500) T.orders.length = 500;
  if (fillNow) trFill(o, at);
  saveData();
  return o;
}

// ---------- Charts ----------
function trChartSvg(bars, w, opts = {}) {
  const H = opts.h || 260, VH = 46, R = 46, top = 10, plotH = H - VH - top - 18;
  if (!bars.length) return `<div class="tr-chart-empty">No price history for this range.</div>`;
  const n = bars.length, plotW = w - R, step = plotW / n;
  let lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  if (opts.ref) { lo = Math.min(lo, opts.ref); hi = Math.max(hi, opts.ref); }
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1; lo -= pad; hi += pad;
  const y = v => top + (hi - v) / (hi - lo) * plotH;
  const vmax = Math.max(...bars.map(b => b.v || 0)) || 1;
  const candles = n <= 140;
  let marks = "";
  if (candles) {
    const bw = Math.max(1, Math.min(10, step * 0.62));
    bars.forEach((b, i) => {
      const x = i * step + step / 2, up = b.c >= b.o, cls = up ? "tr-up" : "tr-down";
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
  return `<svg class="tr-chart" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" data-n="${n}" data-step="${step}" role="img" aria-label="Price chart">${axis}${ref}${marks}${vol}${labels}<line class="tr-cross" x1="0" x2="0" y1="${top}" y2="${H - 18}" visibility="hidden"/></svg>`;
}
// Normalised lines (start = 100) for the performance chart
function trLinesSvg(series, w, h = 200) {
  const all = series.flatMap(s => s.pts.map(p => p[1]));
  if (all.length < 2) return "";
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
  const R = 46, n = Math.max(...series.map(s => s.pts.length));
  const x = i => i / Math.max(1, n - 1) * (w - R), y = v => 8 + (hi - v) / (hi - lo) * (h - 26);
  const grid = [lo + pad, (lo + hi) / 2, hi - pad].map(v => `<line class="tr-grid" x1="0" x2="${w - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tr-axis" x="${w - R + 6}" y="${(y(v) + 4).toFixed(1)}">${v.toFixed(1)}</text>`).join("");
  return `<svg class="tr-chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Your account against the VN-Index">${grid}${series.map(s => `<polyline class="${s.cls}" points="${s.pts.map((p, i) => `${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ")}"/>`).join("")}</svg>`;
}

// ---------- Pages ----------
function tradeStop() { if (TRADE.timer) { clearInterval(TRADE.timer); TRADE.timer = null; } }
function trAutoRefresh(fn) {
  tradeStop();
  TRADE.timer = setInterval(() => {
    if (currentRoute()[0] !== "trade") return tradeStop();
    if (trStatus().code === "open" && !document.hidden) fn();
  }, 15000);
}
async function trRefresh(syms, quiet) {
  TRADE.loading = true; TRADE.err = "";
  try { await trFetchQuotes(syms); trProcessPending(); }
  catch (e) { TRADE.err = "Could not load prices. Check your connection and try again."; if (!quiet) toast(TRADE.err, "error"); }
  TRADE.loading = false;
}
function trHeadActions() {
  const st = trStatus();
  return `<span class="tr-status tr-${st.code}"><i></i>${st.label}</span>
    <button class="btn btn-secondary btn-sm" id="tr-refresh">${icon("pulse", 16)} Refresh</button>`;
}
function trUpdatedHtml() {
  return TRADE.at ? `Prices updated ${new Date(TRADE.at).toLocaleTimeString("en-GB")} · VPS & VNDirect · ${trStatus().code === "open" ? "refreshes every 15 s" : "last prices of the session"}` : "";
}

function renderTrade(sub, sym) {
  if (sub === "s" && sym) return renderTradeStock(String(sym).toUpperCase());
  const T = tradeData();
  const syms = [...new Set([...T.watch, ...Object.keys(T.holdings), ...trPending().map(o => o.sym)])];
  const draw = () => {
    if (currentRoute()[0] !== "trade" || currentRoute()[1]) return;
    if (document.activeElement && document.activeElement.id === "tr-add" && document.activeElement.value) return;   // don't wipe a ticker being typed
    trProcessPending();
    const nav = trNav(), ret = T.initial ? (nav - T.initial) / T.initial * 100 : 0;
    if (TRADE.at) trSnapshot(nav);
    const holdVal = Object.entries(T.holdings).reduce((s, [k, h]) => s + h.qty * ((TRADE.q[k] || {}).last || h.cost / h.qty / 1000) * 1000, 0);
    const unreal = holdVal - Object.values(T.holdings).reduce((s, h) => s + h.cost, 0);
    view.innerHTML = `
      ${pageHeader("Stock simulator", "Virtual money · real prices from HOSE, HNX and UPCoM", trHeadActions(), "Paper trading")}
      ${TRADE.err ? `<div class="callout danger section">${icon("alert", 18)}<div style="flex:1">${esc(TRADE.err)}</div><button class="btn btn-secondary btn-sm" data-tr-retry>Try again</button></div>` : ""}
      <div class="grid grid-stats">
        <div class="card stat"><span class="stat-label">Account value</span><span class="stat-value">${trInt(nav / 1e6)}<small class="tr-unit">m ₫</small></span><span class="stat-hint">${trVND(nav)}</span></div>
        <div class="card stat"><span class="stat-label">Return since ${prettyDate(T.start)}</span><span class="stat-value ${trPlTone(ret)}">${trPct(ret)}</span><span class="stat-hint">${trSigned(nav - T.initial)}</span></div>
        <div class="card stat"><span class="stat-label">Cash to trade</span><span class="stat-value">${trInt(trAvailableCash() / 1e6)}<small class="tr-unit">m ₫</small></span><span class="stat-hint">${trVND(trAvailableCash())}${trReservedCash() ? ` · ${trVND(trReservedCash())} held for orders` : ""}</span></div>
        <div class="card stat"><span class="stat-label">Unrealised P/L</span><span class="stat-value ${trPlTone(unreal)}">${trSigned(unreal / 1e6, v => v.toFixed(2))}<small class="tr-unit">m ₫</small></span><span class="stat-hint">${Object.keys(T.holdings).length} stock${Object.keys(T.holdings).length === 1 ? "" : "s"} held</span></div>
      </div>
      <div class="tr-tabs section">
        <div class="segmented" role="tablist">${[["market", "Market"], ["portfolio", `Portfolio (${Object.keys(T.holdings).length})`], ["orders", `Orders${trPending().length ? ` · ${trPending().length} open` : ""}`]].map(([k, l]) => `<button role="tab" aria-selected="${TRADE.tab === k}" class="${TRADE.tab === k ? "active" : ""}" data-tr-tab="${k}">${l}</button>`).join("")}</div>
        <span class="text-3 small">${trUpdatedHtml()}</span>
      </div>
      ${TRADE.tab === "portfolio" ? trPortfolioHtml() : TRADE.tab === "orders" ? trOrdersHtml() : trMarketHtml()}
      <p class="text-3 small section">Practice only — no real money and no real orders. Fees ${TR_FEE * 100}% per trade and ${TR_TAX * 100}% tax on sales; ${TR_LOT}-share lots; shares you buy can be sold after T+2; unfilled limit orders expire at the end of the day.</p>`;
    trBindMain(draw, syms);
    if (TRADE.tab === "portfolio") trDrawPerformance();
  };
  draw();
  trRefresh(syms, true).then(draw);
  trAutoRefresh(() => trRefresh(syms, true).then(draw));
}

function trMarketHtml() {
  const T = tradeData();
  const rows = T.watch.map(sym => {
    const q = TRADE.q[sym];
    return `<tr class="tr-row" data-tr-open="${sym}" tabindex="0">
      <td><strong class="tr-sym">${sym}</strong><span class="tr-mkt">${q ? TR_MARKET[q.market] || "" : ""}</span></td>
      <td class="num ${trTone(q)}"><strong>${q ? trP(q.last) : "…"}</strong></td>
      <td class="num ${trTone(q)}">${q ? trSigned(q.chg, trP) : ""}</td>
      <td class="num ${trTone(q)}">${q ? trPct(q.pct) : ""}</td>
      <td class="num hide-mobile px-ref">${q ? trP(q.ref) : ""}</td>
      <td class="num hide-mobile px-ceil">${q ? trP(q.ceil) : ""}</td>
      <td class="num hide-mobile px-floor">${q ? trP(q.floor) : ""}</td>
      <td class="num hide-mobile">${q ? trInt(q.vol) : ""}</td>
      <td class="num"><button class="icon-btn tr-x" data-tr-unwatch="${sym}" aria-label="Remove ${sym} from the list" title="Remove">${icon("x", 14)}</button></td>
    </tr>`;
  }).join("");
  return `<div class="card section">
    <form class="tr-add" id="tr-add-form" autocomplete="off">
      <input class="input" id="tr-add" placeholder="Add a ticker, e.g. VNM, SHS, BSR" maxlength="10" spellcheck="false">
      <button class="btn btn-primary" type="submit">${icon("plus", 16)} Add</button>
    </form>
    <div class="table-wrap"><table class="table tr-table">
      <thead><tr><th>Stock</th><th class="num">Price</th><th class="num">+/−</th><th class="num">%</th><th class="num hide-mobile">Ref</th><th class="num hide-mobile">Ceiling</th><th class="num hide-mobile">Floor</th><th class="num hide-mobile">Volume</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="9" class="text-3">Your list is empty — add a ticker above.</td></tr>`}</tbody>
    </table></div>
    <p class="text-3 small" style="margin-top:10px">Prices in thousand ₫ (51.10 = 51,100 ₫). Colours follow Vietnamese boards: <span class="px-up">up</span>, <span class="px-down">down</span>, <span class="px-ref">reference</span>, <span class="px-ceil">ceiling</span>, <span class="px-floor">floor</span>. Tap a stock to see its chart and trade.</p>
  </div>`;
}

function trPortfolioHtml() {
  const T = tradeData(), hs = Object.entries(T.holdings);
  const realised = T.orders.filter(o => o.status === "filled" && o.side === "S").reduce((s, o) => s + (o.pnl || 0), 0);
  return `<div class="card section">
    <div class="card-head"><div><h2>Holdings</h2><p class="text-2 small">Average cost includes the buying fee</p></div></div>
    ${hs.length ? `<div class="table-wrap"><table class="table tr-table">
      <thead><tr><th>Stock</th><th class="num">Shares</th><th class="num hide-mobile">Can sell</th><th class="num">Avg cost</th><th class="num">Price</th><th class="num hide-mobile">Value</th><th class="num">P/L</th></tr></thead>
      <tbody>${hs.map(([sym, h]) => {
        const q = TRADE.q[sym], last = q ? q.last : h.cost / h.qty / 1000, val = h.qty * last * 1000, pl = val - h.cost, plp = h.cost ? pl / h.cost * 100 : 0;
        return `<tr class="tr-row" data-tr-open="${sym}" tabindex="0"><td><strong class="tr-sym">${sym}</strong></td><td class="num">${trInt(h.qty)}</td><td class="num hide-mobile">${trInt(trAvailableShares(sym))}</td>
          <td class="num">${trP(h.cost / h.qty / 1000)}</td><td class="num ${trTone(q)}">${trP(last)}</td><td class="num hide-mobile">${trVND(val)}</td>
          <td class="num ${trPlTone(pl)}"><strong>${trPct(plp)}</strong><br><span class="small">${trSigned(pl)}</span></td></tr>`;
      }).join("")}</tbody></table></div>`
      : emptyState("pulse", "No stocks yet", "Open the Market tab, pick a stock and place a buy order.")}
  </div>
  <div class="card section">
    <div class="card-head"><div><h2>Performance against the VN-Index</h2><p class="text-2 small">Both start at 100 on ${prettyDate(T.start)} · holding period return = (end − start) ÷ start</p></div></div>
    <div id="tr-perf"><p class="text-3 small">Loading…</p></div>
    <dl class="tr-facts">
      <div><dt>Realised P/L</dt><dd class="${trPlTone(realised)}">${trSigned(realised)}</dd></div>
      <div><dt>Fees and tax paid</dt><dd>${trVND(T.fees || 0)}</dd></div>
      <div><dt>Trades filled</dt><dd>${T.orders.filter(o => o.status === "filled").length}</dd></div>
      <div><dt>Winning sells</dt><dd>${(() => { const s = T.orders.filter(o => o.status === "filled" && o.side === "S"); return s.length ? `${pct(s.filter(o => o.pnl > 0).length, s.length)}% of ${s.length}` : "–"; })()}</dd></div>
    </dl>
    <div class="row-gap" style="margin-top:16px"><button class="btn btn-soft-danger btn-sm" id="tr-reset">${icon("trash", 16)} Start over</button></div>
  </div>`;
}
function trSnapshot(nav) {
  const T = tradeData(), d = trToday(), last = T.nav[T.nav.length - 1];
  if (last && last.d === d) last.v = Math.round(nav); else T.nav.push({ d, v: Math.round(nav) });
  if (T.nav.length > 600) T.nav.splice(0, T.nav.length - 600);
  saveData();
}
async function trDrawPerformance() {
  const box = document.getElementById("tr-perf");
  if (!box) return;
  const T = tradeData();
  if (T.nav.length < 2) { box.innerHTML = `<p class="text-3 small">The chart starts once your account has values on two different days — come back after the next session.</p>`; return; }
  try {
    if (!TRADE.vnindex || Date.now() - TRADE.vnindex.at > 300000) {
      const now = Math.floor(Date.now() / 1000), from = Math.floor(new Date(T.nav[0].d + "T00:00:00Z").getTime() / 1000) - 7 * 86400;
      const r = await fetch(`${TR_BARS}?resolution=D&symbol=VNINDEX&from=${from}&to=${now}`, { cache: "no-store" });
      const j = await r.json();
      TRADE.vnindex = { at: Date.now(), bars: j.s === "ok" ? j.t.map((t, i) => ({ d: new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 10), c: j.c[i] })) : [] };
    }
    const vi = TRADE.vnindex.bars, at = d => { let c = null; vi.forEach(b => { if (b.d <= d) c = b.c; }); return c; };
    const base = T.initial, ib = at(T.nav[0].d) || (vi[0] && vi[0].c);
    const mine = T.nav.map(p => [p.d, p.v / base * 100]);
    const idx = ib ? T.nav.map(p => [p.d, (at(p.d) || ib) / ib * 100]) : [];
    const w = Math.max(280, box.clientWidth || 600);
    const r1 = mine[mine.length - 1][1] - 100, r2 = idx.length ? idx[idx.length - 1][1] - 100 : null;
    box.innerHTML = `${trLinesSvg([{ cls: "tr-l-me", pts: mine }, ...(idx.length ? [{ cls: "tr-l-idx", pts: idx }] : [])], w)}
      <div class="tr-legend"><span><i class="tr-l-me"></i>Your account ${trPct(r1)}</span>${r2 !== null ? `<span><i class="tr-l-idx"></i>VN-Index ${trPct(r2)}</span><span>Excess return <strong class="${trPlTone(r1 - r2)}">${trPct(r1 - r2)}</strong></span>` : ""}</div>`;
  } catch (e) { box.innerHTML = `<p class="text-3 small">Could not load the VN-Index right now.</p>`; }
}

function trOrdersHtml() {
  const T = tradeData();
  const st = { filled: ["Filled", "badge-success"], pending: ["Waiting", "badge-warning"], cancelled: ["Cancelled", ""], expired: ["Expired", ""] };
  return `<div class="card section">
    ${T.orders.length ? `<div class="table-wrap"><table class="table tr-table">
      <thead><tr><th>Time</th><th>Order</th><th class="num">Shares</th><th class="num">Price</th><th>Status</th><th class="num hide-mobile">Fee + tax</th><th class="num hide-mobile">Realised</th><th></th></tr></thead>
      <tbody>${T.orders.slice(0, 200).map(o => `<tr>
        <td class="small">${new Date(o.t).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td><span class="tr-side ${o.side === "B" ? "buy" : "sell"}">${o.side === "B" ? "Buy" : "Sell"}</span> <strong>${o.sym}</strong> <span class="text-3 small">${o.type === "MP" ? "market" : "limit"}</span></td>
        <td class="num">${trInt(o.qty)}</td>
        <td class="num">${trP(o.status === "filled" ? o.fill : o.price)}</td>
        <td><span class="badge ${st[o.status][1]}">${st[o.status][0]}</span></td>
        <td class="num hide-mobile">${o.status === "filled" ? trVND((o.fee || 0) + (o.tax || 0)) : ""}</td>
        <td class="num hide-mobile ${o.pnl ? trPlTone(o.pnl) : ""}">${o.side === "S" && o.status === "filled" ? trSigned(o.pnl || 0) : ""}</td>
        <td class="num">${o.status === "pending" ? `<button class="btn btn-ghost btn-sm" data-tr-cancel="${o.id}">Cancel</button>` : ""}</td>
      </tr>`).join("")}</tbody></table></div>`
      : emptyState("clock", "No orders yet", "Your buy and sell orders will be listed here.")}
  </div>`;
}

function trBindMain(draw, syms) {
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; await trRefresh(tradeData().watch.concat(Object.keys(tradeData().holdings))); draw(); };
  view.querySelectorAll("[data-tr-retry]").forEach(b => b.onclick = async () => { await trRefresh(syms); draw(); });
  view.querySelectorAll("[data-tr-tab]").forEach(b => b.onclick = () => { TRADE.tab = b.dataset.trTab; draw(); });
  view.querySelectorAll("[data-tr-open]").forEach(r => {
    r.onclick = e => { if (!e.target.closest("button")) location.hash = `#/trade/s/${r.dataset.trOpen}`; };
    r.onkeydown = e => { if (e.key === "Enter") location.hash = `#/trade/s/${r.dataset.trOpen}`; };
  });
  view.querySelectorAll("[data-tr-unwatch]").forEach(b => b.onclick = () => {
    const T = tradeData(); T.watch = T.watch.filter(s => s !== b.dataset.trUnwatch); saveData(); draw();
  });
  view.querySelectorAll("[data-tr-cancel]").forEach(b => b.onclick = () => {
    const o = tradeData().orders.find(x => x.id === b.dataset.trCancel);
    if (o && o.status === "pending") { o.status = "cancelled"; saveData(); toast("Order cancelled"); draw(); }
  });
  const form = document.getElementById("tr-add-form");
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const inp = document.getElementById("tr-add"), sym = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (sym.length < 3) { toast("Enter a ticker such as VNM", "error"); return; }
    const T = tradeData();
    if (T.watch.includes(sym)) { toast(`${sym} is already on your list`); return; }
    try {
      const got = await trFetchQuotes([sym]);
      if (!got.includes(sym)) { toast(`No stock found with the ticker ${sym}`, "error"); return; }
      T.watch.unshift(sym); saveData(); toast(`${sym} added`); draw();
    } catch (err) { toast("Could not reach the price board — try again", "error"); }
  };
  const rs = document.getElementById("tr-reset");
  if (rs) rs.onclick = async () => {
    const v = await promptDialog({ title: "Start over?", message: "All holdings, orders and history in the simulator are cleared, and you start again with fresh virtual cash.", label: "Starting cash (million ₫)", type: "number", inputmode: "numeric", value: String(Math.round(tradeData().initial / 1e6)), confirmText: "Start over", validate: x => (+x >= 1 && +x <= 100000) ? "" : "Enter 1 to 100,000 (million ₫)" });
    if (v === null) return;
    const watch = tradeData().watch;
    DATA.trade = null;
    const T = tradeData(); T.initial = T.cash = Math.round(+v * 1e6); T.watch = watch; saveData();
    toast("Simulator reset"); draw();
  };
}

// ---------- One stock: chart, order book, order ticket ----------
function renderTradeStock(sym) {
  const T = tradeData();
  const draw = () => {
    if (currentRoute()[0] !== "trade" || String(currentRoute()[2] || "").toUpperCase() !== sym) return;
    const q = TRADE.q[sym], h = T.holdings[sym];
    if (!q) {
      view.innerHTML = `<a href="#/trade" class="back-link">${icon("back", 16)} Stock simulator</a>${pageHeader(sym, "", trHeadActions())}
        ${TRADE.err ? `<div class="callout danger">${icon("alert", 18)}<div style="flex:1">${esc(TRADE.err)}</div><button class="btn btn-secondary btn-sm" data-tr-retry>Try again</button></div>` : TRADE.loading ? `<p class="text-2">Loading…</p>` : `<div class="card">${emptyState("alert", `No stock found with the ticker ${esc(sym)}`, "Check the ticker and try again.")}</div>`}`;
      view.querySelectorAll("[data-tr-retry]").forEach(b => b.onclick = async () => { await trRefresh([sym]); draw(); });
      return;
    }
    const tone = trTone(q), pend = trPending(sym);
    const pl = h ? h.qty * q.last * 1000 - h.cost : 0;
    view.innerHTML = `
      <a href="#/trade" class="back-link">${icon("back", 16)} Stock simulator</a>
      <header class="page-header tr-head">
        <div class="ph-text">
          <div class="kicker">${TR_MARKET[q.market] || ""} · ${T.watch.includes(sym) ? "on your list" : `<button class="linklike" id="tr-watch">add to your list</button>`}</div>
          <h1>${sym} <span class="tr-big ${tone}">${trP(q.last)}</span></h1>
          <p class="ph-sub ${tone}"><strong>${trSigned(q.chg, trP)} (${trPct(q.pct)})</strong></p>
        </div>
        <div class="page-actions">${trHeadActions()}</div>
      </header>
      <dl class="tr-quote">
        <div><dt>Ref</dt><dd class="px-ref">${trP(q.ref)}</dd></div><div><dt>Ceiling</dt><dd class="px-ceil">${trP(q.ceil)}</dd></div><div><dt>Floor</dt><dd class="px-floor">${trP(q.floor)}</dd></div>
        <div><dt>Open</dt><dd>${trP(q.open)}</dd></div><div><dt>High</dt><dd>${trP(q.high)}</dd></div><div><dt>Low</dt><dd>${trP(q.low)}</dd></div><div><dt>Volume</dt><dd>${trInt(q.vol)}</dd></div>
      </dl>
      <div class="tr-layout">
        <div class="tr-main">
          <div class="card">
            <div class="card-head" style="flex-wrap:wrap"><div class="segmented">${["1D", "1M", "3M", "6M", "1Y", "3Y"].map(r => `<button class="${TRADE.range === r ? "active" : ""}" data-tr-range="${r}">${r}</button>`).join("")}</div>
              <span class="tr-readout text-2 small" id="tr-readout"></span></div>
            <div id="tr-chart" class="tr-chart-box"><p class="text-3 small">Loading chart…</p></div>
          </div>
          <div class="card section">
            <div class="card-head"><h2>Order book</h2><span class="text-3 small">best 3 bids and offers</span></div>
            <table class="table tr-book"><thead><tr><th class="num">Bid vol</th><th class="num">Bid</th><th class="num">Offer</th><th class="num">Offer vol</th></tr></thead>
              <tbody>${[0, 1, 2].map(i => { const [bp, bv] = q.bid[i], [ap, av] = q.ask[i]; const t = p => p ? (p >= q.ceil ? "px-ceil" : p <= q.floor ? "px-floor" : p > q.ref ? "px-up" : p < q.ref ? "px-down" : "px-ref") : ""; return `<tr><td class="num">${bv ? trInt(bv) : ""}</td><td class="num ${t(bp)}"><strong>${bp ? trP(bp) : "–"}</strong></td><td class="num ${t(ap)}"><strong>${ap ? trP(ap) : "–"}</strong></td><td class="num">${av ? trInt(av) : ""}</td></tr>`; }).join("")}</tbody></table>
          </div>
        </div>
        <aside class="tr-side-col">
          <div class="card tr-ticket">
            <div class="tr-sides"><button class="${TRADE.side === "B" ? "active buy" : ""}" data-tr-side="B">Buy</button><button class="${TRADE.side === "S" ? "active sell" : ""}" data-tr-side="S">Sell</button></div>
            <div class="segmented tr-types"><button class="${TRADE.type === "LO" ? "active" : ""}" data-tr-type="LO">Limit</button><button class="${TRADE.type === "MP" ? "active" : ""}" data-tr-type="MP">Market</button></div>
            ${TRADE.type === "LO" ? `<label class="field"><span class="field-label">Price (thousand ₫)</span>
              <div class="tr-stepper"><button type="button" class="btn btn-secondary" data-tr-step="-1" aria-label="Lower price">−</button><input class="input mono" id="tr-price" inputmode="decimal" value="${trP(TRADE.side === "B" ? trMarketPrice(q, "B") : trMarketPrice(q, "S"))}"><button type="button" class="btn btn-secondary" data-tr-step="1" aria-label="Higher price">+</button></div></label>`
              : `<p class="text-2 small">Fills now at the best ${TRADE.side === "B" ? "offer" : "bid"}: <strong>${trP(trMarketPrice(q, TRADE.side))}</strong></p>`}
            <label class="field"><span class="field-label">Shares (lots of ${TR_LOT})</span>
              <div class="tr-stepper"><button type="button" class="btn btn-secondary" data-tr-qty="-1" aria-label="Fewer shares">−</button><input class="input mono" id="tr-qty" inputmode="numeric" value="${TR_LOT}"><button type="button" class="btn btn-secondary" data-tr-qty="1" aria-label="More shares">+</button></div></label>
            <div class="tr-quick">${[25, 50, 100].map(p => `<button type="button" class="tt-chip" data-tr-max="${p}">${p}%</button>`).join("")}</div>
            <div class="tr-sum" id="tr-sum"></div>
            <button class="btn btn-lg btn-block ${TRADE.side === "B" ? "tr-buy" : "tr-sell"}" id="tr-go">${TRADE.side === "B" ? "Buy" : "Sell"} ${sym}</button>
            <p class="text-3 small" style="margin-top:8px">${TRADE.side === "B" ? `Cash to trade: <strong>${trVND(trAvailableCash())}</strong>` : `Shares you can sell: <strong>${trInt(trAvailableShares(sym))}</strong>${h && trUnsettled(h) ? ` · ${trInt(trUnsettled(h))} settle at T+2` : ""}`}</p>
          </div>
          ${h ? `<div class="card section"><div class="stat-label">Your position</div>
            <p class="tr-pos"><strong>${trInt(h.qty)}</strong> shares · avg cost <strong>${trP(h.cost / h.qty / 1000)}</strong></p>
            <p class="${trPlTone(pl)}"><strong>${trSigned(pl)}</strong> (${trPct(h.cost ? pl / h.cost * 100 : 0)})</p></div>` : ""}
          ${pend.length ? `<div class="card section"><div class="stat-label">Waiting orders</div>${pend.map(o => `<div class="row-between tr-pend"><span><span class="tr-side ${o.side === "B" ? "buy" : "sell"}">${o.side === "B" ? "Buy" : "Sell"}</span> ${trInt(o.qty)} at ${trP(o.price)}</span><button class="btn btn-ghost btn-sm" data-tr-cancel="${o.id}">Cancel</button></div>`).join("")}</div>` : ""}
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
      out.innerHTML = `${range === "1D" ? d.slice(11, 16) : d.slice(0, 10).split("-").reverse().join("/")} · O ${trP(b.o)} H ${trP(b.h)} L ${trP(b.l)} <strong>C ${trP(b.c)}</strong> · Vol ${trInt(b.v)}`;
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
  } catch (e) { box.innerHTML = `<p class="text-3 small">Could not load the chart right now.</p>`; }
}
function trBindStock(sym, draw) {
  const T = tradeData(), q = TRADE.q[sym];
  const rf = document.getElementById("tr-refresh");
  if (rf) rf.onclick = async () => { rf.disabled = true; TRADE.bars = {}; await trRefresh([sym]); draw(); };
  const wt = document.getElementById("tr-watch");
  if (wt) wt.onclick = () => { T.watch.unshift(sym); saveData(); toast(`${sym} added to your list`); draw(); };
  view.querySelectorAll("[data-tr-range]").forEach(b => b.onclick = () => { TRADE.range = b.dataset.trRange; view.querySelectorAll("[data-tr-range]").forEach(x => x.classList.toggle("active", x === b)); trDrawChart(sym); });
  view.querySelectorAll("[data-tr-side]").forEach(b => b.onclick = () => { TRADE.side = b.dataset.trSide; draw(); });
  view.querySelectorAll("[data-tr-type]").forEach(b => b.onclick = () => { TRADE.type = b.dataset.trType; draw(); });
  view.querySelectorAll("[data-tr-cancel]").forEach(b => b.onclick = () => {
    const o = T.orders.find(x => x.id === b.dataset.trCancel);
    if (o && o.status === "pending") { o.status = "cancelled"; saveData(); toast("Order cancelled"); draw(); }
  });
  const pin = document.getElementById("tr-price"), qin = document.getElementById("tr-qty"), sum = document.getElementById("tr-sum");
  const price = () => TRADE.type === "MP" ? trMarketPrice(q, TRADE.side) : parseFloat(String(pin.value).replace(",", "."));
  const qty = () => parseInt(String(qin.value).replace(/[^0-9]/g, ""), 10) || 0;
  const update = () => {
    const p = price(), n = qty(), val = n * (p || 0) * 1000, fee = val * TR_FEE, tax = TRADE.side === "S" ? val * TR_TAX : 0;
    sum.innerHTML = `<div class="row-between"><span>Value</span><strong>${trVND(val)}</strong></div>
      <div class="row-between"><span>Fee ${TR_FEE * 100}%</span><span>${trVND(fee)}</span></div>
      ${TRADE.side === "S" ? `<div class="row-between"><span>Tax ${TR_TAX * 100}%</span><span>${trVND(tax)}</span></div>` : ""}
      <div class="row-between tr-total"><span>${TRADE.side === "B" ? "You pay" : "You receive"}</span><strong>${trVND(TRADE.side === "B" ? val + fee : val - fee - tax)}</strong></div>`;
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
    const verb = o.side === "B" ? "Buy" : "Sell";
    if (!await confirmDialog({ title: `${verb} ${trInt(n)} ${sym}?`, message: `${o.type === "MP" ? "Market order" : `Limit order at ${trP(o.price)}`} · about ${trVND(n * p * 1000)} before fees. Practice only — no real money.`, confirmText: verb })) return;
    const res = trPlace(o);
    if (typeof res === "string") { toast(res, "error"); return; }
    toast(res.status === "filled" ? `${res.side === "B" ? "Bought" : "Sold"} ${trInt(res.qty)} ${sym} at ${trP(res.fill)}` : `Order placed — it fills when the price reaches ${trP(res.price)}`);
    draw();
  };
}

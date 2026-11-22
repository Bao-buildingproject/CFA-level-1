// ============================================================
// arena/market.js — Derivatives Trading Arena: market data adapters
//
//  · Synthetic market (Mode C): geometric Brownian motion with jumps, volatility regimes
//    and random market events, on the exchange's sessions (08:45–11:30, 13:00–14:45),
//    trading days, ±7% daily band and monthly expiry. Seeded, so a seed always gives
//    the same market. SIMULATED prices — never presented as real ones.
//  · Historical replay (Mode A): daily bars of a dataset the player imports (for example
//    VN30F front-month bars pulled from WiData). Bars are revealed one session at a time;
//    the future is never sent to the chart.
//  · Live market (Mode B) needs a licensed real-time feed, which this static site does not have.
// Times are exchange wall-clock seconds written as UTC (09:00 in Hà Nội → 09:00 "UTC"),
// so charts show the exchange's clock on any device.
// ============================================================
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./engine.js") : root.ArenaEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArenaMarket = api;
})(typeof self !== "undefined" ? self : this, function (E) {
  "use strict";

  // ---------- Random numbers: mulberry32 with its state kept in the market state ----------
  function rand(st) {
    st.rng = (st.rng + 0x6D2B79F5) >>> 0;
    let t = st.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss(st) {
    let u = 0, v = 0;
    while (u === 0) u = rand(st);
    while (v === 0) v = rand(st);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- Calendar ----------
  const SESSIONS = [[8 * 60 + 45, 11 * 60 + 30], [13 * 60, 14 * 60 + 45]];   // minutes of the day
  const DAY_MINUTES = SESSIONS.reduce((n, s) => n + s[1] - s[0], 0);        // 270
  const SUB = 10;                                                           // seconds per simulation step
  // Exchange holidays used by the synthetic calendar (2026 from the exchange's trading days; 2027 lunar dates approximate)
  const HOLIDAYS = new Set(["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-04-27", "2026-04-30",
    "2026-05-01", "2026-08-31", "2026-09-01", "2026-09-02", "2027-01-01", "2027-02-08", "2027-02-09", "2027-02-10", "2027-02-11",
    "2027-02-12", "2027-04-16", "2027-04-30", "2027-05-03", "2027-09-02", "2027-09-03"]);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const parseDay = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  function addDays(s, n) { const d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }
  function isTradingDay(s) { const w = parseDay(s).getUTCDay(); return w !== 0 && w !== 6 && !HOLIDAYS.has(s); }
  function nextTradingDay(s) { let d = addDays(s, 1); while (!isTradingDay(d)) d = addDays(d, 1); return d; }
  // Last trading day of the month's contract: the third Thursday, or the trading day before it
  function expiryOf(y, m) {
    const first = new Date(Date.UTC(y, m - 1, 1));
    const thu = 1 + ((4 - first.getUTCDay() + 7) % 7) + 14;
    let d = `${y}-${pad(m)}-${pad(thu)}`;
    while (!isTradingDay(d)) d = addDays(d, -1);
    return d;
  }
  function contractFor(root, day) {
    let [y, m] = day.split("-").map(Number);
    if (day > expiryOf(y, m)) { m += 1; if (m > 12) { m = 1; y += 1; } }
    return { code: `${root}${String(y).slice(2)}${pad(m)}`, exp: expiryOf(y, m) };
  }
  const wall = (day, min, sec) => Date.UTC(...day.split("-").map((v, i) => i === 1 ? +v - 1 : +v)) / 1000 + min * 60 + (sec || 0);

  // ---------- Synthetic market ----------
  const REGIMES = { calm: { vol: 0.6, volu: 0.7, next: ["normal"], dur: [60, 360] },
    normal: { vol: 1, volu: 1, next: ["calm", "high"], dur: [90, 540] },
    high: { vol: 2.1, volu: 1.8, next: ["normal"], dur: [30, 180] } };
  const NEWS = [["Sự kiện giả lập: số liệu vĩ mô tốt hơn kỳ vọng", 1], ["Sự kiện giả lập: lãi suất liên ngân hàng tăng mạnh", -1],
    ["Sự kiện giả lập: khối ngoại bán ròng mạnh", -1], ["Sự kiện giả lập: tin nâng hạng thị trường", 1],
    ["Sự kiện giả lập: căng thẳng địa chính trị", -1], ["Sự kiện giả lập: lạm phát thấp hơn dự báo", 1],
    ["Sự kiện giả lập: một nhóm vốn hóa lớn bị bán tháo", -1], ["Sự kiện giả lập: dòng tiền ETF đổ vào mạnh", 1]];
  const SYN_SYMS = { VN30F1M: { start: 180000, beta: 1, baseVol: 200000 }, VN100F1M: { start: 173000, beta: 0.92, baseVol: 60 } };
  const YEAR_SECONDS = 252 * DAY_MINUTES * 60;
  const RHO = 0.94;

  function createSynthetic(o) {
    o = o || {};
    const st = { kind: "synthetic", v: 1, seed: (o.seed >>> 0) || 1, rng: (o.seed >>> 0) || 1, sigma: o.sigma || 0.2, volMult: o.volMult || 1,
      drift: o.drift || 0, events: o.events !== false, day: null, min: SESSIONS[0][0], sub: 0, phase: "closed", regime: "normal", regimeLeft: 240,
      syms: {}, m1: {}, d1: {}, news: [], newsAt: null, dayCount: 0, lastT: 0 };
    for (let i = 0; i < 7; i++) rand(st);
    let day = o.start || "2026-11-23";
    while (!isTradingDay(day)) day = addDays(day, 1);
    const pre = o.preDays == null ? 4 : o.preDays;
    let d0 = day;
    for (let i = 0; i < pre; i++) { d0 = addDays(d0, -1); while (!isTradingDay(d0)) d0 = addDays(d0, -1); }
    for (const sym of Object.keys(SYN_SYMS)) {
      const px = E.floorTick(E.SPECS[sym], Math.round((o.startPx && o.startPx[sym]) || SYN_SYMS[sym].start));
      st.syms[sym] = { px, ref: px, ceil: 0, floor: 0, contract: "", exp: "", root: E.SPECS[sym].root, dayO: px, dayH: px, dayL: px, dayV: 0, m: null };
      st.m1[sym] = []; st.d1[sym] = [];
    }
    st.day = null; st.pendingDay = d0;
    // warm-up sessions, so the chart and indicators have history before trading starts
    for (let i = 0; i <= pre; i++) {
      openDay(st);
      if (i < pre) { while (st.phase === "open") step(st, []); }
    }
    return st;
  }
  // Opens the next session: settlement → new reference price, band, contract, overnight gap
  function openDay(st) {
    const day = st.pendingDay || nextTradingDay(st.day);
    st.pendingDay = null;
    const sd = st.sigma * st.volMult / Math.sqrt(252);
    const gap = gauss(st) * sd * 0.35;
    const out = [];
    for (const sym of Object.keys(st.syms)) {
      const x = st.syms[sym], s = E.SPECS[sym];
      x.ref = x.px;
      const lim = E.limitsFor(s, x.ref);
      x.ceil = lim.ceil; x.floor = lim.floor;
      const c = contractFor(x.root, day);
      x.contract = c.code; x.exp = c.exp;
      const open = Math.min(x.ceil, Math.max(x.floor, E.floorTick(s, Math.round(x.ref * Math.exp(gap * SYN_SYMS[sym].beta)))));
      x.px = open; x.dayO = x.dayH = x.dayL = open; x.dayV = 0; x.m = null;
      out.push({ type: "bar", sym, bar: { t: wall(day, SESSIONS[0][0]), o: open, h: open, l: open, c: open }, open: true });
    }
    st.day = day; st.min = SESSIONS[0][0]; st.sub = 0; st.phase = "open"; st.dayCount += 1;
    st.lastT = wall(day, st.min);
    st.newsAt = st.events && rand(st) < 0.3 ? SESSIONS[0][0] + 10 + Math.floor(rand(st) * (DAY_MINUTES - 30)) : null;
    return out;
  }
  function closeMinuteBar(st, sym) {
    const x = st.syms[sym];
    if (!x.m) return;
    st.m1[sym].push([x.m.t, x.m.o, x.m.h, x.m.l, x.m.c, x.m.v]);
    if (st.m1[sym].length > DAY_MINUTES * 3) st.m1[sym].splice(0, st.m1[sym].length - DAY_MINUTES * 3);
    x.m = null;
  }
  function closeDayBar(st, sym) {
    const x = st.syms[sym];
    st.d1[sym].push([wall(st.day, 0), x.dayO, x.dayH, x.dayL, x.px, x.dayV]);
    if (st.d1[sym].length > 600) st.d1[sym].shift();
  }
  // One 10-second step of every symbol. Pushes { type: "bar", sym, bar } events into `out`;
  // at the end of the day also "close" and, on the last trading day of a contract, "expiry".
  function step(st, out) {
    if (st.phase !== "open") return out;
    const minuteOfDay = st.min;
    const t = wall(st.day, st.min, st.sub * SUB);
    if (st.sub === 0) {                                          // once a minute: regime switching and news
      st.regimeLeft -= 1;
      if (st.regimeLeft <= 0) {
        const r = REGIMES[st.regime], nx = r.next[Math.floor(rand(st) * r.next.length)];
        st.regime = nx; const d = REGIMES[nx].dur; st.regimeLeft = d[0] + Math.floor(rand(st) * (d[1] - d[0]));
      }
    }
    const reg = REGIMES[st.regime];
    const sd = st.sigma * st.volMult * reg.vol * Math.sqrt(SUB / YEAR_SECONDS);
    const mu = (st.drift - 0.5 * st.sigma * st.sigma) * (SUB / YEAR_SECONDS);
    const z1 = gauss(st), z2 = RHO * z1 + Math.sqrt(1 - RHO * RHO) * gauss(st);
    let jump = 0, news = null;
    if (st.newsAt === minuteOfDay && st.sub === 0) {
      const n = NEWS[Math.floor(rand(st) * NEWS.length)];
      jump = n[1] * (0.005 + rand(st) * 0.012) * st.volMult;
      news = { t, text: n[0], dir: n[1] };
      st.news.push(news); if (st.news.length > 40) st.news.shift();
      st.regime = "high"; st.regimeLeft = 30 + Math.floor(rand(st) * 60);
      st.newsAt = null;
    } else if (rand(st) < 0.35 / (DAY_MINUTES * 6)) {
      jump = (gauss(st) * 0.006 - 0.001) * st.volMult;          // small random jumps
    }
    for (const sym of Object.keys(st.syms)) {
      const x = st.syms[sym], s = E.SPECS[sym], meta = SYN_SYMS[sym];
      const z = sym === "VN30F1M" ? z1 : z2;
      const r = mu + sd * meta.beta * z + jump * meta.beta;
      const o = x.px;
      const c = Math.min(x.ceil, Math.max(x.floor, E.floorTick(s, Math.round(o * Math.exp(r)) + s.tick / 2)));
      const hi = Math.max(o, c), lo = Math.min(o, c);
      const lam = meta.baseVol / (DAY_MINUTES * 6) * reg.volu * (1 + Math.min(6, Math.abs(r) / (sd || 1e-9) * 0.4));
      const v = lam >= 5 ? Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(st))) : (rand(st) < lam ? 1 : 0);
      x.px = c; x.dayH = Math.max(x.dayH, hi); x.dayL = Math.min(x.dayL, lo); x.dayV += v;
      if (!x.m) x.m = { t: wall(st.day, st.min), o, h: hi, l: lo, c, v };
      else { x.m.h = Math.max(x.m.h, hi); x.m.l = Math.min(x.m.l, lo); x.m.c = c; x.m.v += v; }
      out.push({ type: "bar", sym, bar: { t, o, h: hi, l: lo, c } });
    }
    if (news) out.push({ type: "news", news });
    st.lastT = t;
    st.sub += 1;
    if (st.sub * SUB >= 60) {
      st.sub = 0;
      for (const sym of Object.keys(st.syms)) closeMinuteBar(st, sym);
      st.min += 1;
      if (st.min >= SESSIONS[0][1] && st.min < SESSIONS[1][0]) { st.min = SESSIONS[1][0]; out.push({ type: "lunch" }); }
      else if (st.min >= SESSIONS[1][1]) {
        st.phase = "closed";
        for (const sym of Object.keys(st.syms)) {
          closeDayBar(st, sym);
          const x = st.syms[sym];
          if (x.exp === st.day) out.push({ type: "expiry", sym, contract: x.contract, px: x.px });
        }
        out.push({ type: "close", day: st.day });
      }
    }
    return out;
  }
  // Advance by `seconds` of exchange time (stops at the end of the session)
  function advance(st, seconds) {
    const out = [];
    let n = Math.max(1, Math.round(seconds / SUB));
    while (n-- > 0 && st.phase === "open") step(st, out);
    return out;
  }
  function synthQuote(st, stale) {
    const q = {};
    for (const sym of Object.keys(st.syms)) {
      const x = st.syms[sym];
      q[sym] = { mark: x.px, ref: x.ref, ceil: x.ceil, floor: x.floor, contract: x.contract, exp: x.exp, stale: !!stale,
        depthScale: st.regime === "high" ? 0.5 : 1, dayO: x.dayO, dayH: x.dayH, dayL: x.dayL, dayV: x.dayV };
    }
    return { t: st.lastT, open: st.phase === "open", queue: false, q };
  }
  // Candles for the chart: 1, 5, 15, 60, 240 minutes from the 1-minute bars; "D" from the daily bars
  function candles(st, sym, tf) {
    const x = st.syms[sym];
    if (tf === "D") {
      const rows = st.d1[sym].slice();
      if (st.phase === "open") rows.push([wall(st.day, 0), x.dayO, x.dayH, x.dayL, x.px, x.dayV]);
      return rows;
    }
    const rows = st.m1[sym].slice();
    if (x.m) rows.push([x.m.t, x.m.o, x.m.h, x.m.l, x.m.c, x.m.v]);
    return aggregate(rows, +tf || 1);
  }
  function aggregate(rows, tf) {
    if (tf <= 1) return rows;
    const out = [];
    let cur = null, key = null;
    for (const r of rows) {
      const dayStart = Math.floor(r[0] / 86400) * 86400, minOfDay = Math.floor((r[0] - dayStart) / 60);
      const k = dayStart + Math.floor((minOfDay - SESSIONS[0][0]) / tf);
      if (k !== key) {
        if (cur) out.push(cur);
        key = k; cur = [r[0], r[1], r[2], r[3], r[4], r[5]];
      } else { cur[2] = Math.max(cur[2], r[2]); cur[3] = Math.min(cur[3], r[3]); cur[4] = r[4]; cur[5] += r[5]; }
    }
    if (cur) out.push(cur);
    return out;
  }
  // Volatility and price level of a real dataset, to calibrate the synthetic market (still simulated)
  function calibrate(bars) {
    if (!bars || bars.length < 20) return null;
    const r = [];
    for (let i = 1; i < bars.length; i++) if (bars[i].c === bars[i - 1].c) r.push(Math.log(bars[i].cl / bars[i - 1].cl));
    if (r.length < 10) return null;
    const m = r.reduce((n, x) => n + x, 0) / r.length;
    const v = r.reduce((n, x) => n + (x - m) * (x - m), 0) / (r.length - 1);
    return { sigma: Math.min(0.6, Math.max(0.08, Math.sqrt(v * 252))), px: bars[bars.length - 1].cl };
  }

  // ---------- Historical replay ----------
  // Checks an imported dataset: bad candles are dropped, bars are sorted by date, a repeated date keeps its last row
  function validateDataset(raw) {
    const problems = [];
    if (!raw || raw.kind !== "arena-dataset" || !Array.isArray(raw.bars)) return { ok: false, problems: ["Không phải tệp dữ liệu của Trading Arena"], bars: [] };
    const sym = raw.symbol || "VN30F1M";
    if (!E.SPECS[sym]) return { ok: false, problems: [`Sản phẩm ${sym} không được hỗ trợ`], bars: [] };
    const s = E.SPECS[sym], byDay = new Map();
    let dropped = 0;
    raw.bars.forEach((b, i) => {
      const row = b && { d: b.d, c: String(b.c || ""), exp: b.exp, o: b.o, h: b.h, l: b.l, cl: b.cl, v: b.v || 0, ref: b.ref, idx: b.idx || null };
      const okNum = row && [row.o, row.h, row.l, row.cl, row.ref].every(x => Number.isSafeInteger(x) && x > 0);
      const ok = okNum && /^\d{4}-\d{2}-\d{2}$/.test(row.d) && /^\d{4}-\d{2}-\d{2}$/.test(row.exp || "") && row.c &&
        row.h >= Math.max(row.o, row.cl) && row.l <= Math.min(row.o, row.cl) && [row.o, row.h, row.l, row.cl].every(x => x % s.tick === 0);
      if (!ok) { dropped += 1; if (problems.length < 6) problems.push(`Bỏ nến lỗi ở dòng ${i + 1}${b && b.d ? ` (${b.d})` : ""}`); return; }
      if (byDay.has(row.d)) problems.push(`Ngày ${row.d} bị lặp: giữ dòng sau`);
      byDay.set(row.d, row);
    });
    const bars = [...byDay.values()].sort((a, b) => a.d < b.d ? -1 : 1);
    let unsorted = false;
    raw.bars.forEach((b, i) => { if (i && b && raw.bars[i - 1] && b.d < raw.bars[i - 1].d) unsorted = true; });
    if (unsorted) problems.push("Dữ liệu sai thứ tự thời gian: đã sắp xếp lại");
    if (dropped) problems.push(`Đã bỏ ${dropped} nến lỗi`);
    return { ok: bars.length >= 40, problems: bars.length >= 40 ? problems : problems.concat(["Cần ít nhất 40 phiên"]), bars, sym,
      meta: { id: String(raw.id || "dataset"), title: String(raw.title || "Dữ liệu lịch sử"), source: String(raw.source || ""), license: String(raw.license || ""), pulled: String(raw.pulled || "") } };
  }
  // A replay round: `length` sessions after a start that leaves enough history behind it
  function createReplay(ds, o) {
    o = o || {};
    const n = ds.bars.length, minStart = Math.min(30, n - 2), maxStart = Math.max(minStart, n - (o.length || 20) - 1);
    const st = { kind: "replay", v: 1, dataset: ds.meta.id, sym: ds.sym, blind: o.blind !== false, length: o.length || 20, rng: (o.seed >>> 0) || 7 };
    st.start = o.start != null ? Math.max(minStart, Math.min(maxStart, o.start)) : minStart + Math.floor(rand(st) * (maxStart - minStart + 1));
    st.cursor = st.start; st.end = Math.min(n - 1, st.start + st.length);
    return st;
  }
  const replayDone = (st) => st.cursor >= st.end;
  function replayTime(st, i, bars) {             // blind rounds hide the real dates: sequential days from 2001-01-01
    return st.blind ? Date.UTC(2001, 0, 1) / 1000 + (i - st.start) * 86400 + 400 * 86400 : wall(bars[i].d, 0);
  }
  function replayQuote(st, bars) {
    const b = bars[st.cursor], nx = bars[st.cursor + 1];
    const s = E.SPECS[st.sym], ref = nx ? nx.ref : b.cl, lim = E.limitsFor(s, ref);
    return { t: replayTime(st, st.cursor, bars) + 15 * 3600, open: false, queue: !replayDone(st),
      q: { [st.sym]: { mark: b.cl, ref, ceil: lim.ceil, floor: lim.floor, contract: nx ? nx.c : b.c, exp: nx ? nx.exp : b.exp,
        stale: false, depthScale: 1, dayO: b.o, dayH: b.h, dayL: b.l, dayV: b.v, idx: b.idx } } };
  }
  // Reveals the next session. Returns the engine events: the bar, then an expiry if that session ended a contract.
  function replayNext(st, bars) {
    if (replayDone(st)) return [];
    st.cursor += 1;
    const b = bars[st.cursor], nx = bars[st.cursor + 1], s = E.SPECS[st.sym], lim = E.limitsFor(s, b.ref);
    const t = replayTime(st, st.cursor, bars) + 9 * 3600;
    const out = [{ type: "bar", sym: st.sym, bar: { t, o: b.o, h: b.h, l: b.l, c: b.cl }, q: { mark: b.o, ref: b.ref, ceil: lim.ceil, floor: lim.floor, contract: b.c, exp: b.exp, stale: false, depthScale: 1 } }];
    if (b.exp === b.d || (nx && nx.c !== b.c)) out.push({ type: "expiry", sym: st.sym, contract: b.c, px: b.idx || b.cl, t: t + 6 * 3600 });
    return out;
  }
  function replayCandles(st, bars) {
    return bars.slice(0, st.cursor + 1).map((b, i) => [replayTime(st, i, bars), b.o, b.h, b.l, b.cl, b.v]);
  }

  // ---------- Indicators ----------
  function sma(v, n) { const out = []; let s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; out.push(i >= n - 1 ? s / n : null); } return out; }
  function ema(v, n) {
    const out = [], k = 2 / (n + 1); let prev = null, s = 0;
    for (let i = 0; i < v.length; i++) {
      if (i < n - 1) { s += v[i]; out.push(null); continue; }
      if (i === n - 1) { s += v[i]; prev = s / n; out.push(prev); continue; }
      prev = v[i] * k + prev * (1 - k); out.push(prev);
    }
    return out;
  }
  function rsi(v, n) {
    n = n || 14;
    const out = new Array(v.length).fill(null);
    if (v.length <= n) return out;
    let g = 0, l = 0;
    for (let i = 1; i <= n; i++) { const d = v[i] - v[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= n; l /= n;
    out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = n + 1; i < v.length; i++) {
      const d = v[i] - v[i - 1];
      g = (g * (n - 1) + Math.max(0, d)) / n; l = (l * (n - 1) + Math.max(0, -d)) / n;
      out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return out;
  }
  function macd(v, f, sl, sg) {
    const a = ema(v, f || 12), b = ema(v, sl || 26);
    const line = v.map((_, i) => a[i] != null && b[i] != null ? a[i] - b[i] : null);
    const start = line.findIndex(x => x != null);
    const sig = start < 0 ? line.map(() => null) : new Array(start).fill(null).concat(ema(line.slice(start), sg || 9));
    return { line, signal: sig, hist: line.map((x, i) => x != null && sig[i] != null ? x - sig[i] : null) };
  }
  function bollinger(v, n, k) {
    n = n || 20; k = k || 2;
    const mid = sma(v, n), up = [], lo = [];
    for (let i = 0; i < v.length; i++) {
      if (mid[i] == null) { up.push(null); lo.push(null); continue; }
      let s = 0; for (let j = i - n + 1; j <= i; j++) s += (v[j] - mid[i]) ** 2;
      const sd = Math.sqrt(s / n); up.push(mid[i] + k * sd); lo.push(mid[i] - k * sd);
    }
    return { mid, up, lo };
  }

  return { SESSIONS, DAY_MINUTES, SUB, HOLIDAYS, isTradingDay, nextTradingDay, addDays, expiryOf, contractFor, wall, rand, gauss,
    createSynthetic, openDay, step, advance, synthQuote, candles, aggregate, calibrate, REGIMES,
    validateDataset, createReplay, replayNext, replayQuote, replayCandles, replayDone, replayTime,
    sma, ema, rsi, macd, bollinger };
});

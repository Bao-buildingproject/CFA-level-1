// ============================================================
// arena/ui.js — Derivatives Trading Arena: the lobby and the trading terminal
// Routes: #/trading/derivatives (lobby), …/practice, …/challenge/<id>, …/replay, …/cup
// Every button acts on the engine (arena/engine.js) through the store (arena/store.js);
// the chart shows exactly the bars the engine matches against.
// ============================================================
(function () {
  "use strict";
  const E = window.ArenaEngine, M = window.ArenaMarket, ST = window.ArenaStore;
  const TFS = [["1", "1m"], ["5", "5m"], ["15", "15m"], ["60", "1H"], ["240", "4H"], ["D", "1D"]];
  const SPEEDS = [[1, "1×"], [10, "10×"], [60, "60×"], [300, "300×"]];
  const MODE_NAME = { practice: "Luyện tập", challenge: "Thử thách", replay: "Replay lịch sử", cup: "Giải tuần" };
  const TAG = { SL: "Stop Loss", TP: "Take Profit", LIQ: "Thanh lý", EXP: "Đáo hạn", CLOSE: "Đóng", PART: "Đóng một phần", REV: "Đảo vị thế" };
  const LEDGER = { INITIAL: "Vốn ảo ban đầu", FEE: "Phí giao dịch", PNL: "Lãi/lỗ đã thực hiện", RESET: "Đặt lại tài khoản", BASE: "Điểm mốc lịch sử" };
  const STATUS = { OPEN: "Đang mở", CLOSED: "Đã đóng", LIQUIDATED: "Bị thanh lý", SETTLED: "Thanh toán đáo hạn", PENDING: "Chờ khớp", FILLED: "Đã khớp", CANCELLED: "Đã hủy" };

  const AR = { h: null, pid: null, slot: null, sym: "VN30F1M", tf: "5", speed: 60, playing: false, timer: null, acc: 0, last: 0,
    chart: null, sub: null, s: {}, plines: [], dlines: [], dseries: [], draw: null, drawA: null, tab: "pos", range: "all", mtab: "chart",
    ticket: { side: "B", type: "MKT", qty: 1, px: "", stop: "", sl: "", tp: "" }, dirty: false, savedAt: 0, paintAt: 0, paintQ: false,
    cid: null, busy: false, nRows: 0, firstT: null, fills: 0, auto: null, endInfo: null, lb: "practice", syncing: false };

  // ---------- Formatting ----------
  const pad = n => String(n).padStart(2, "0");
  const P = px => E.fmtPx(px);
  const vnd = n => E.fmtVnd(n);
  const sgn = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;
  const pct = (x, d) => x == null || !isFinite(x) ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d == null ? 2 : d)}%`;
  const tone = n => n > 0 ? "up" : n < 0 ? "down" : "";
  const mil = n => `${(n / 1e6).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tr ₫`;
  const toPu = v => { const x = parseFloat(String(v || "").replace(",", ".")); return isFinite(x) && x > 0 ? Math.round(x * 100) : null; };
  const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  function blind() { const mk = arMk(); return mk && mk.kind === "replay" && mk.blind; }
  function sessionNo(t) { return Math.floor((t - Date.UTC(2001, 0, 1) / 1000) / 86400) - 400; }
  function when(t, withDate) {
    if (t == null) return "—";
    if (blind()) { const n = sessionNo(t); return `Phiên ${n > 0 ? "+" : ""}${n}`; }
    const d = new Date(t * 1000), day = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
    const mk = arMk();
    if (mk && mk.kind === "replay") return day + (withDate === "y" ? `/${d.getUTCFullYear()}` : "");
    return `${day} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  const dmy = s => s ? s.split("-").reverse().join("/") : "";
  // Live areas are patched, not replaced: a button under the pointer stays the same element while
  // prices change, so a click is never lost to a refresh.
  function morph(el, html) {
    if (!el) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    patchKids(el, tpl.content);
  }
  function patchKids(cur, next) {
    const a = Array.from(cur.childNodes), b = Array.from(next.childNodes);
    for (let i = 0; i < b.length; i++) {
      const x = a[i], y = b[i];
      if (!x) { cur.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { cur.replaceChild(y, x); continue; }
      if (x.nodeType === 3 || x.nodeType === 8) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      if (x.nodeType !== 1) continue;
      for (const at of Array.from(x.attributes)) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
      for (const at of Array.from(y.attributes)) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
      if (x.tagName === "INPUT" && x !== document.activeElement && x.value !== y.getAttribute("value")) x.value = y.getAttribute("value") || "";
      patchKids(x, y);
    }
    for (let i = a.length - 1; i >= b.length; i--) cur.removeChild(a[i]);
  }

  // ---------- Store access ----------
  function arH() {
    const pid = PROFILES.active;
    if (!AR.h || AR.pid !== pid) { AR.h = ST.open(localStorage, pid); AR.pid = pid; }
    return AR.h;
  }
  const arAcct = () => AR.slot ? arH().state.accounts[AR.slot] : null;
  const arMk = () => AR.slot ? arH().state.markets[AR.slot] : null;
  const arDs = () => ST.getDataset(localStorage);
  function arBars() {
    const mk = arMk(), ds = arDs();
    return mk && mk.kind === "replay" && ds && ds.meta.id === mk.dataset ? ds.bars : null;
  }
  function arQuote() {
    const mk = arMk();
    if (!mk) return null;
    if (mk.kind === "replay") { const b = arBars(); return b ? M.replayQuote(mk, b) : null; }
    return M.synthQuote(mk, false);
  }
  const arCtx = () => ST.ctxOf(arH(), (arQuote() || {}).t || 0);
  const arPrefs = () => { const p = arH().state.prefs; p.ind = p.ind || { vol: true, ma: true, ema: false, bb: false, sub: "rsi" }; p.draw = p.draw || {}; if (p.confirm == null) p.confirm = true; return p; };
  function arSave(force) {
    if (!AR.h || (!force && (!AR.dirty || Date.now() - AR.savedAt < 3000))) return;
    const r = ST.save(AR.h);
    if (r.ok) { AR.dirty = false; AR.savedAt = Date.now(); return; }
    if (r.conflict) {
      ST.load(AR.h); AR.dirty = false; AR.playing = false;
      toast("Arena vừa được cập nhật ở một tab khác — đã tải bản mới nhất", "error");
      if (AR.slot) arTerminal(AR.slot); else arLobby();
    } else toast(r.error || "Không lưu được", "error");
  }
  function onStorage(e) {
    if (!AR.h || e.key !== ST.KEY(AR.pid)) return;
    if (AR.dirty) return;                               // our next save will notice the newer version
    ST.load(AR.h); AR.playing = false;
    if (document.body.classList.contains("ta-mode")) { if (AR.slot) arTerminal(AR.slot); else arLobby(); }
  }
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", () => { AR.last = performance.now(); if (document.hidden) arSave(true); });
  window.addEventListener("beforeunload", () => arSave(true));

  window.arenaStop = function () {
    if (AR.timer) { clearInterval(AR.timer); AR.timer = null; }
    if (AR.auto) { clearInterval(AR.auto); AR.auto = null; }
    arSave(true);
    AR.playing = false;
    arChartDestroy();
    AR.slot = null;
  };
  window.arenaClearProfile = pid => ST.clearProfile(localStorage, pid);

  // ---------- Entry ----------
  window.renderArena = function (a, b, c) {
    document.body.classList.add("ta-mode");
    if (!E || !M || !ST) { view.innerHTML = `<div class="callout danger">Không tải được Trading Arena. Hãy tải lại trang.</div>`; return; }
    if (a !== "derivatives") { history.replaceState(null, "", "#/trading/derivatives"); }
    const h = arH();
    if (h.broken) { toast("Dữ liệu Arena cũ không đọc được — đã lưu một bản sao và mở ví mới", "error"); h.broken = false; }
    if (!b) return arLobby();
    const slot = b === "challenge" ? ST.slotOf("challenge", c) : b;
    if (!(["practice", "cup", "replay"].includes(slot) || /^ch-[a-z]+$/.test(slot))) return arLobby();
    if (!h.state.accounts[slot] || !h.state.markets[slot]) return arLobby(slot);
    arTerminal(slot);
  };

  // ---------- Shared pieces ----------
  const LOGO = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#151B2B"/><path d="M8 21l5-6 4 3 7-9" fill="none" stroke="#22C58B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 24h16" stroke="#F0525C" stroke-width="2" stroke-linecap="round" opacity=".8"/><circle cx="24" cy="9" r="2.2" fill="#E3B341"/></svg>`;
  function themeAttr() { return arPrefs().theme === "light" ? "light" : "dark"; }
  function dataChip(mk) {
    if (!mk) return "";
    if (mk.kind === "replay") return `<span class="ta-chip blue" title="Dữ liệu ngày thật (WiData), phát lại từng phiên; không phải thời gian thực">LỊCH SỬ<span class="hide-xs"> · WiData · 1D</span></span>`;
    return `<span class="ta-chip amber" title="Giá do mô hình tạo ra (GBM + nhảy giá + chế độ biến động + sự kiện). Không phải giá giao dịch thật.">MÔ PHỎNG<span class="hide-xs"> · Synthetic</span></span>`;
  }
  function userChip() {
    const p = activeProfile();
    return `<span class="ta-user" title="Ví ảo của tài khoản ${esc(p.name)}">${icon("user", 15)}<span>${esc(p.name)}</span></span>`;
  }
  function topLinks() {
    return `<button type="button" class="ta-ib hide-sm" data-ar="tutor" title="Hỏi CFA Tutor" aria-label="Hỏi CFA Tutor">${icon("chat", 17)}</button>
      <button type="button" class="ta-ib" data-ar="calc" title="BA II Plus" aria-label="Mở máy tính BA II Plus">${icon("calc", 17)}</button>
      <button type="button" class="ta-ib" data-ar="theme" title="Đổi giao diện sáng/tối" aria-label="Đổi giao diện sáng/tối">${icon(themeAttr() === "light" ? "moon" : "sun", 17)}</button>
      ${userChip()}`;
  }

  // ================= LOBBY =================
  function arLobby(focus) {
    arChartDestroy();
    if (AR.timer) { clearInterval(AR.timer); AR.timer = null; }
    AR.slot = null;
    const h = arH(), st = h.state, ds = arDs(), wk = ST.isoWeek(new Date());
    const acc = slot => st.accounts[slot];
    const eqLine = slot => { const a = acc(slot); if (!a || h.flags[slot]) return ""; const an = E.analytics(a, {}); return `<div class="ta-mc-eq"><b>${mil(an.equity)}</b><span class="${tone(an.ret)}">${pct(an.ret)}</span><span>${an.n} giao dịch</span></div>`; };
    const flag = slot => h.flags[slot] ? `<p class="ta-warn">${icon("alert", 14)} Dữ liệu ví này đã bị sửa ngoài trò chơi: ${esc(h.flags[slot][0])}. Kết quả không được xếp hạng.</p>` : "";
    const chRows = ST.CHALLENGES.map(c => {
      const slot = ST.slotOf("challenge", c.id), a = acc(slot), fin = a && a.meta && a.meta.finished;
      const best = st.results.filter(r => r.slot === slot).sort((x, y) => y.ret - x.ret)[0];
      const passed = st.results.some(r => r.slot === slot && r.passed);
      const state = fin ? (fin.passed ? "Đạt" : "Chưa đạt") : a ? `Đang chơi · phiên ${(a.meta || {}).sessions || 0}/${c.sessions}` : "Chưa chơi";
      return `<li class="ta-ch ${passed ? "done" : ""}">
        <div><strong>${esc(c.name)}</strong>${passed ? `<span class="ta-badge up">${icon("check", 12)} Đã vượt</span>` : ""}<p>${esc(c.desc)}</p>
          <span class="ta-muted">${esc(state)}${best ? ` · tốt nhất ${pct(best.ret)}` : ""}</span></div>
        <div class="ta-ch-act">${a && !fin ? `<a class="ta-btn sm" href="#/trading/derivatives/challenge/${c.id}">Tiếp tục</a>` : ""}
          <button type="button" class="ta-btn sm ${a && !fin ? "ghost" : ""}" data-ar="start" data-mode="challenge" data-id="${c.id}">${a ? "Chơi lại" : "Bắt đầu"}</button></div>
      </li>`;
    }).join("");
    const practice = acc("practice"), cup = acc("cup"), rep = acc("replay");
    const cupThisWeek = cup && (cup.meta || {}).week === wk.id;
    const repOk = rep && ds && st.markets.replay && st.markets.replay.dataset === ds.meta.id;
    view.innerHTML = `<div class="ta ta-lobby" data-theme="${themeAttr()}">
      <header class="ta-top ta-top-lobby">
        <a class="ta-brand" href="#/trade" title="Về Giả lập chứng khoán">${icon("back", 16)}</a>
        <span class="ta-logo">${LOGO}<span><b>Trading Arena</b><small>Phái sinh · tiền ảo</small></span></span>
        <span class="ta-grow"></span>${topLinks()}
      </header>
      <main class="ta-lobby-main">
        <section class="ta-hero">
          <div>
            <p class="ta-kicker">Derivatives Trading Arena</p>
            <h1>Giao dịch hợp đồng tương lai chỉ số — bằng 100.000.000 ₫ tiền ảo</h1>
            <p class="ta-lead">Long khi nghĩ thị trường tăng, Short khi nghĩ thị trường giảm. Ký quỹ, đòn bẩy, Margin Call, thanh lý bắt buộc và đáo hạn đều được tính thật trên tài khoản ảo của bạn. Không có tiền thật, không nạp tiền, không gửi lệnh tới công ty chứng khoán.</p>
          </div>
          <div class="ta-hero-card">
            <div><span>Ví ảo của</span><b>${esc(activeProfile().name)}</b></div>
            <div><span>Vốn mỗi tài khoản</span><b>${vnd(E.INITIAL)}</b></div>
            <div><span>Sản phẩm</span><b>VN30F1M · VN100F1M</b></div>
          </div>
        </section>

        <section class="ta-modes">
          <article class="ta-mc ${focus === "practice" ? "focus" : ""}">
            <header><span class="ta-mc-ico amber">${icon("play", 18)}</span><div><h2>Luyện tập</h2><p>Thị trường mô phỏng, không giới hạn thời gian</p></div></header>
            ${eqLine("practice")}${flag("practice")}
            <p class="ta-muted">Giá do mô hình tạo ra theo phiên giao dịch thật (08:45–11:30, 13:00–14:45), biên độ ±7%, đáo hạn hằng tháng. Chỉnh tốc độ 1×–300×.</p>
            ${ds ? `<label class="ta-check"><input type="checkbox" id="ar-calib" checked> Hiệu chỉnh biến động và mức giá theo dữ liệu WiData đã nhập (vẫn là giá mô phỏng)</label>` : ""}
            <div class="ta-mc-act">${practice ? `<a class="ta-btn" href="#/trading/derivatives/practice">Vào sàn</a><button type="button" class="ta-btn ghost" data-ar="start" data-mode="practice">Thị trường mới</button>`
              : `<button type="button" class="ta-btn" data-ar="start" data-mode="practice">Vào sàn với 100 triệu ₫</button>`}</div>
          </article>
          <article class="ta-mc ${focus === "replay" ? "focus" : ""}">
            <header><span class="ta-mc-ico blue">${icon("calendar", 18)}</span><div><h2>Replay lịch sử</h2><p>Giao dịch lại phiên thật, không biết trước tương lai</p></div></header>
            ${repOk ? eqLine("replay") : ""}${flag("replay")}
            ${ds ? `<p class="ta-muted"><b>${esc(ds.meta.title)}</b> · ${ds.bars.length} phiên · ${esc(ds.meta.source)}</p>
              <label class="ta-check"><input type="checkbox" id="ar-blind" checked> Ẩn ngày thật (không nhận ra giai đoạn nào)</label>
              <div class="ta-mc-act">${repOk && !(rep.meta || {}).finished ? `<a class="ta-btn" href="#/trading/derivatives/replay">Tiếp tục vòng đang chơi</a>` : ""}
                <button type="button" class="ta-btn ${repOk && !(rep.meta || {}).finished ? "ghost" : ""}" data-ar="start" data-mode="replay">Vòng mới · 20 phiên</button></div>`
              : `<p class="ta-muted">Chưa có dữ liệu lịch sử trên trình duyệt này. Nhập tệp dữ liệu WiData (JSON) để chơi chế độ này. Tệp chỉ lưu trên máy bạn.</p>`}
            <div class="ta-mc-act"><label class="ta-btn ghost file">${icon("upload", 15)} ${ds ? "Thay dữ liệu" : "Nhập dữ liệu WiData"}<input type="file" accept=".json,application/json" id="ar-file" hidden></label></div>
            <div id="ar-import-msg"></div>
          </article>
          <article class="ta-mc ${focus === "cup" ? "focus" : ""}">
            <header><span class="ta-mc-ico violet">${icon("star", 18)}</span><div><h2>Giải tuần ${esc(wk.id)}</h2><p>Mọi người cùng một thị trường và luật chơi</p></div></header>
            ${cupThisWeek ? eqLine("cup") : ""}${flag("cup")}
            <p class="ta-muted">5 phiên mô phỏng, biến động 1,2×. Hạt giống thị trường là số tuần, nên tuần này ai chơi cũng gặp đúng diễn biến giá như nhau. Bảng xếp hạng gồm các tài khoản trên thiết bị này.</p>
            <div class="ta-mc-act">${cupThisWeek && !(cup.meta || {}).finished ? `<a class="ta-btn" href="#/trading/derivatives/cup">Tiếp tục</a>` : ""}
              <button type="button" class="ta-btn ${cupThisWeek && !(cup.meta || {}).finished ? "ghost" : ""}" data-ar="start" data-mode="cup">${cupThisWeek ? "Chơi lại" : "Tham gia"}</button></div>
          </article>
          <article class="ta-mc ta-mc-wide ${focus && focus.startsWith("ch-") ? "focus" : ""}">
            <header><span class="ta-mc-ico green">${icon("target", 18)}</span><div><h2>Thử thách</h2><p>Đạt mục tiêu lợi nhuận trong giới hạn rủi ro</p></div></header>
            <ul class="ta-chs">${chRows}</ul>
          </article>
        </section>

        <section class="ta-two">
          <article class="ta-card">
            <header class="ta-card-h"><h2>Bảng xếp hạng</h2><span class="ta-muted">trên thiết bị này</span></header>
            <div class="ta-seg" role="tablist">${[["practice", "Luyện tập"], ["cup", "Giải tuần"], ["replay", "Replay"], ["badge", "Thử thách"]].map(([k, l]) => `<button type="button" data-ar="lb" data-k="${k}" class="${AR.lb === k ? "on" : ""}">${l}</button>`).join("")}</div>
            <div id="ar-lb">${lbHtml(wk.id)}</div>
            <p class="ta-foot">Thi đấu trực tuyến nhiều người cần máy chủ, website tĩnh này chưa có. Tài khoản bị phát hiện sửa dữ liệu không được xếp hạng.</p>
          </article>
          <article class="ta-card">
            <header class="ta-card-h"><h2>Thành tích</h2><span class="ta-muted">phần thưởng ảo, không quy đổi thành tiền</span></header>
            <div class="ta-ach">${achHtml()}</div>
          </article>
        </section>

        <section class="ta-card ta-rules">
          <header class="ta-card-h"><h2>Luật chơi và giả định mô phỏng</h2></header>
          ${rulesHtml()}
        </section>
        <p class="ta-attrib">Biểu đồ: <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a> — Copyright © 2024 TradingView, Inc. · Dữ liệu lịch sử: WiData MCP by WiGroup (người dùng tự nhập, dùng cá nhân).</p>
      </main>
    </div>`;
    const file = document.getElementById("ar-file");
    if (file) file.onchange = () => arImport(file.files[0]);
  }
  function lbHtml(week) {
    const rows = ST.leaderboard(localStorage, PROFILES.list, week).filter(r => r.mode === AR.lb);
    if (!rows.length) return `<p class="ta-empty">Chưa có kết quả nào.</p>`;
    rows.sort((a, b) => (b.ok - a.ok) || (b.ret - a.ret));
    return `<div class="ta-tw"><table class="ta-t"><thead><tr><th>#</th><th>Người chơi</th><th>${AR.lb === "badge" ? "Thử thách" : "Vòng"}</th><th class="n">Lợi nhuận</th>${AR.lb === "badge" ? "" : `<th class="n">Sụt giảm tối đa</th><th class="n">GD</th>`}<th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.user === PROFILES.active ? "me" : ""}"><td>${r.ok ? i + 1 : "—"}</td><td>${esc(r.name)}</td><td>${esc(r.label || MODE_NAME[r.mode] || r.mode)}</td>
        <td class="n ${tone(r.ret)}">${pct(r.ret)}</td>${AR.lb === "badge" ? "" : `<td class="n">${pct(-r.maxDD)}</td><td class="n">${r.trades}</td>`}
        <td>${r.ok ? "" : `<span class="ta-badge down" title="Dữ liệu bị sửa ngoài trò chơi">⚠</span>`}${r.liq ? `<span class="ta-badge amber" title="Đã bị thanh lý ${r.liq} lần">LIQ</span>` : ""}</td></tr>`).join("")}
    </tbody></table></div>`;
  }
  function achHtml() {
    const st = arH().state, got = {};
    for (const a of Object.values(st.accounts)) if (a && a.userId === arH().userId) for (const x of E.achievements(a)) if (x.done) got[x.id] = true;
    const passed = new Set(st.results.filter(r => r.mode === "challenge" && r.passed).map(r => r.slot));
    const list = E.ACHIEVEMENTS.map(x => ({ ...x, done: !!got[x.id] })).concat(ST.CHALLENGES.map(c => ({ id: "ch-" + c.id, name: `Vượt “${c.name}”`, desc: c.desc, done: passed.has("ch-" + c.id) })));
    return list.map(x => `<div class="ta-a ${x.done ? "done" : ""}" title="${esc(x.desc)}"><span>${icon(x.done ? "star" : "lock", 16)}</span><div><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></div></div>`).join("");
  }
  function rulesHtml() {
    const s = E.SPECS.VN30F1M, s2 = E.SPECS.VN100F1M;
    return `<div class="ta-rules-grid">
      <div><h3>Long và Short</h3><p>Long lãi khi giá tăng: (giá hiện tại − giá vào) × 100.000 ₫ × số hợp đồng. Short lãi khi giá giảm: (giá vào − giá hiện tại) × 100.000 ₫ × số hợp đồng. Lãi/lỗ chưa thực hiện chuyển sang đã thực hiện khi đóng vị thế (nhập trước xuất trước).</p></div>
      <div><h3>Hợp đồng</h3><p>Hệ số nhân 100.000 ₫/điểm, bước giá 0,1 điểm (10.000 ₫/hợp đồng), biên độ ±7% quanh giá tham chiếu, đáo hạn vào thứ Năm tuần thứ ba của tháng, thanh toán bằng tiền theo giá đóng cửa của chỉ số cơ sở ngày giao dịch cuối cùng. Tối đa ${s.maxOrder} hợp đồng/lệnh, ${s.maxPos} hợp đồng/vị thế (giả định).</p></div>
      <div><h3>Ký quỹ (giả định)</h3><p>Ký quỹ ban đầu (IM) = ${s.imBps / 100}% giá trị danh nghĩa. Ký quỹ duy trì (MM) = ${E.RISK.mmPct}% IM. <b>Margin Call</b> khi Equity &lt; MM: chỉ được đặt lệnh giảm vị thế, hết khi Equity ≥ IM. <b>Thanh lý bắt buộc</b> khi Equity &lt; ${E.RISK.liqPct}% MM: hệ thống đóng ít hợp đồng nhất đủ đưa Equity về ≥ IM phần còn lại. Không có nạp thêm tiền.</p></div>
      <div><h3>Khớp lệnh (giả định)</h3><p>Không có sổ lệnh thật, nên lệnh không khớp ở giá hiển thị: mua ở giá chào bán = giá + ${P(s.halfSpread)} điểm, bán ở giá chào mua = giá − ${P(s.halfSpread)} (VN100F: ${P(s2.halfSpread)}). Market/Stop trượt thêm 1 bước giá mỗi ${s.depth} hợp đồng (VN100F: ${s2.depth}), gấp đôi khi biến động mạnh. Limit khớp đúng giá đặt khi giá chào chạm tới. Giá mở cửa nhảy qua Stop thì khớp ở giá mở cửa. Một nến chạm cả SL và TP: tính SL trước. Mỗi lệnh khớp toàn bộ một lần.</p></div>
      <div><h3>Phí (giả định)</h3><p>${vnd(s.fee)} cho mỗi hợp đồng mỗi lần khớp (đã gồm phí sở, phí lưu ký và môi giới). Không tính thuế. Thanh toán đáo hạn không mất phí.</p></div>
      <div><h3>Dữ liệu</h3><p><b>Mô phỏng</b>: mô hình chuyển động Brown hình học có nhảy giá, chế độ biến động và sự kiện ngẫu nhiên — luôn ghi “MÔ PHỎNG”. <b>Lịch sử</b>: dữ liệu ngày từ WiData do bạn nhập, phát lại từng phiên; lệnh đặt giữa hai phiên khớp từ phiên sau, Market khớp ở giá mở cửa. <b>Thời gian thực</b>: chưa khả dụng vì chưa có nguồn dữ liệu được cấp phép.</p></div>
      <div><h3>An toàn dữ liệu</h3><p>Website không có máy chủ: ví ảo nằm trong trình duyệt của bạn. Tiền mặt không được lưu thành một con số để sửa, mà tính lại từ sổ cái; sổ cái và lịch sử khớp lệnh được nối chuỗi băm và đối chiếu mỗi lần mở. Sửa dữ liệu sẽ bị phát hiện và loại khỏi bảng xếp hạng, nhưng không thể chặn tuyệt đối như khi có máy chủ.</p></div>
      <div><h3>Chế độ</h3><p><b>Luyện tập</b> không giới hạn. <b>Thử thách</b> có mục tiêu và giới hạn sụt giảm. <b>Replay</b> 20 phiên thật, ẩn tương lai. <b>Giải tuần</b> cùng một thị trường cho mọi người trong tuần. Mỗi chế độ có ví 100 triệu ₫ riêng.</p></div>
    </div>`;
  }
  async function arImport(f) {
    const box = document.getElementById("ar-import-msg");
    if (!f) return;
    if (f.size > 3e6) { box.innerHTML = `<p class="ta-warn">Tệp quá lớn.</p>`; return; }
    const r = ST.setDataset(localStorage, await f.text());
    box.innerHTML = r.ok ? `<p class="ta-ok">${icon("check", 14)} Đã nhập ${r.bars.length} phiên: ${esc(r.meta.title)}${r.problems.length ? ` · ${esc(r.problems.join("; "))}` : ""}</p>`
      : `<p class="ta-warn">${icon("alert", 14)} ${esc(r.problems.join("; "))}</p>`;
    if (r.ok) setTimeout(() => arLobby("replay"), 900);
  }
  function arStart(mode, id) {
    const h = arH();
    try {
      if (mode === "practice") {
        const ds = arDs(), cal = document.getElementById("ar-calib");
        ST.startPractice(h, { calibration: ds && cal && cal.checked ? M.calibrate(ds.bars) : null });
      } else if (mode === "challenge") ST.startChallenge(h, id);
      else if (mode === "cup") ST.startCup(h, new Date());
      else if (mode === "replay") {
        const ds = arDs();
        if (!ds) return toast("Hãy nhập dữ liệu WiData trước", "error");
        const bl = document.getElementById("ar-blind");
        ST.startReplay(h, ds, { blind: !bl || bl.checked });
      }
    } catch (e) { return toast(e.message, "error"); }
    const slot = mode === "challenge" ? ST.slotOf("challenge", id) : mode;
    const a = h.state.accounts[slot];
    a.meta = { ...(a.meta || {}), dayEq: E.metrics(a).equity };
    AR.dirty = true; arSave(true);
    location.hash = `#/trading/derivatives/${mode === "challenge" ? "challenge/" + id : mode}`;
  }

  // ================= TERMINAL =================
  function arTerminal(slot) {
    arChartDestroy();
    if (AR.slot !== slot || AR.tpid !== AR.pid) {      // a new account or mode: a clean order ticket
      AR.ticket = { side: AR.ticket.side, type: "MKT", qty: 1, px: "", stop: "", sl: "", tp: "" };
      AR.cid = null; AR.tpid = AR.pid;
    }
    AR.slot = slot;
    const mk = arMk(), a = arAcct();
    const flag = arH().flags[slot];
    if (flag) {                                         // edited outside the game: locked until it is reset
      view.innerHTML = `<div class="ta ta-lobby" data-theme="${themeAttr()}"><main class="ta-lobby-main"><div class="ta-card">
        <p class="ta-kicker">Ví đã bị khóa</p><h2>Dữ liệu của ví này đã bị sửa ngoài trò chơi</h2>
        <p class="ta-warn">${icon("alert", 14)} ${esc(flag.join(" · "))}</p>
        <p class="ta-muted">Số dư được tính lại từ sổ cái và lịch sử khớp lệnh, nên con số bị sửa không được công nhận. Hãy đặt lại ví để chơi tiếp.</p>
        <div class="ta-mc-act"><button type="button" class="ta-btn" data-ar="unlock" data-v="${esc(slot)}">Đặt lại ví ${esc(MODE_NAME[a.kind] || "")}</button><a class="ta-btn ghost" href="#/trading/derivatives">Về sảnh</a></div></div></main></div>`;
      return;
    }
    if (mk.kind === "replay" && !arBars()) {
      view.innerHTML = `<div class="ta ta-lobby" data-theme="${themeAttr()}"><main class="ta-lobby-main"><div class="ta-card"><h2>Không tìm thấy dữ liệu của vòng Replay này</h2>
        <p class="ta-muted">Vòng này dùng bộ dữ liệu khác với bộ đang có trên trình duyệt. Hãy nhập lại tệp dữ liệu cũ hoặc bắt đầu vòng mới.</p>
        <a class="ta-btn" href="#/trading/derivatives">Về sảnh Arena</a></div></main></div>`;
      return;
    }
    const syms = Object.keys(arQuote().q);
    if (!syms.includes(AR.sym)) AR.sym = syms[0];
    if (mk.kind === "replay") AR.tf = "D";
    else if (AR.tf === "D" && !AR.tfChosen) AR.tf = "5";
    AR.fills = a.fills.length; AR.endInfo = null;
    const ind = arPrefs().ind;
    view.innerHTML = `<div class="ta ta-term" data-theme="${themeAttr()}" data-mtab="${AR.mtab}" id="ta-root">
      <header class="ta-top">
        <a class="ta-brand" href="#/trading/derivatives" title="Về sảnh Arena" aria-label="Về sảnh Arena">${icon("back", 16)}</a>
        <span class="ta-logo">${LOGO}<span><b>Trading Arena</b><small>${esc(a.label || MODE_NAME[a.kind] || "")}</small></span></span>
        <div class="ta-stats">
          <div class="ta-stat"><span>Tiền mặt</span><b id="ta-cash">—</b></div>
          <div class="ta-stat"><span>Equity</span><b id="ta-eq">—</b></div>
          <div class="ta-stat"><span>Lãi/lỗ hôm nay</span><b id="ta-day">—</b></div>
          <div class="ta-stat hide-sm hide-md"><span>Khả dụng</span><b id="ta-avail">—</b></div>
        </div>
        <div class="ta-feedbox">${dataChip(mk)}<span class="ta-chip" id="ta-mstat">—</span></div>
        <div class="ta-ctl" id="ta-ctl"></div>
        <span class="ta-grow"></span>
        <button type="button" class="ta-btn ghost sm ta-reset" data-ar="reset" title="${a.kind === "practice" ? "Reset tài khoản demo" : "Chơi lại vòng này"}">${icon("trash", 14)}<span>${a.kind === "practice" ? "Reset demo" : "Chơi lại"}</span></button>
        ${topLinks()}
      </header>
      <aside class="ta-watch" aria-label="Danh sách sản phẩm"><div id="ta-wl"></div><div id="ta-sess"></div><div id="ta-news"></div></aside>
      <section class="ta-chartbox" aria-label="Biểu đồ">
        <div class="ta-tools">
          <div class="ta-seg">${TFS.map(([v, l]) => `<button type="button" data-ar="tf" data-v="${v}" class="${AR.tf === v ? "on" : ""}" ${mk.kind === "replay" && v !== "D" ? "disabled title=\"Dữ liệu WiData là dữ liệu ngày\"" : ""}>${l}</button>`).join("")}</div>
          <div class="ta-seg">${[["vol", "Vol"], ["ma", "MA20"], ["ema", "EMA9"], ["bb", "BB"]].map(([k, l]) => `<button type="button" data-ar="ind" data-k="${k}" class="${ind[k] ? "on" : ""}">${l}</button>`).join("")}
            ${[["rsi", "RSI"], ["macd", "MACD"]].map(([k, l]) => `<button type="button" data-ar="subind" data-k="${k}" class="${ind.sub === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <div class="ta-seg">
            <button type="button" data-ar="draw" data-k="t" title="Vẽ đường xu hướng: bấm 2 điểm trên biểu đồ">╱ Xu hướng</button>
            <button type="button" data-ar="draw" data-k="h" title="Vẽ đường ngang: bấm 1 điểm">― Ngang</button>
            <button type="button" data-ar="draw" data-k="x" title="Xóa hình vẽ của sản phẩm này">${icon("x", 13)}</button></div>
          <span class="ta-legend" id="ta-legend"></span>
        </div>
        <div class="ta-chart" id="ta-chart"></div>
        <div class="ta-subchart ${ind.sub ? "" : "off"}" id="ta-sub"></div>
        <div class="ta-overlay" id="ta-over" hidden></div>
      </section>
      <aside class="ta-ticket" aria-label="Đặt lệnh" id="ta-ticket">${ticketHtml()}</aside>
      <section class="ta-bottom" aria-label="Tài khoản">
        <div class="ta-tabs" role="tablist">${[["pos", "Vị thế mở"], ["ord", "Lệnh chờ"], ["fills", "Lịch sử khớp"], ["trades", "Giao dịch"], ["ledger", "Sổ cái"], ["perf", "Hiệu suất"], ["margin", "Ký quỹ"], ["log", "Nhật ký"]]
          .map(([k, l]) => `<button type="button" role="tab" data-ar="tab" data-k="${k}" class="${AR.tab === k ? "on" : ""}">${l}<span class="ta-n" id="ta-n-${k}"></span></button>`).join("")}</div>
        <div class="ta-tab" id="ta-tab"></div>
      </section>
      <nav class="ta-mnav">${[["chart", "trend", "Biểu đồ"], ["order", "plus", "Đặt lệnh"], ["book", "rows", "Vị thế"], ["acct", "grid", "Thị trường"]].map(([k, ic, l]) => `<button type="button" data-ar="mtab" data-k="${k}" class="${AR.mtab === k ? "on" : ""}">${icon(ic, 18)}<span>${l}</span></button>`).join("")}</nav>
    </div>`;
    arBindTicket();
    arChartInit();
    arPaint(true);
    if (mk.kind === "synthetic") { AR.last = performance.now(); if (!AR.timer) AR.timer = setInterval(arTick, 200); }
    const fin = a.meta && a.meta.finished;
    if (fin) arShowEnd(fin, null);
    else if (mk.kind === "synthetic" && mk.phase === "closed") arShowSessionEnd();
  }

  // ---------- Order ticket ----------
  function ticketHtml() {
    const t = AR.ticket;
    return `<div class="ta-side" role="group" aria-label="Chiều lệnh">
        <button type="button" data-ar="side" data-v="B" class="buy ${t.side === "B" ? "on" : ""}">Mua / Long</button>
        <button type="button" data-ar="side" data-v="S" class="sell ${t.side === "S" ? "on" : ""}">Bán / Short</button></div>
      <div class="ta-seg full" role="group" aria-label="Loại lệnh">${[["MKT", "Market"], ["LMT", "Limit"], ["STP", "Stop"]].map(([v, l]) => `<button type="button" data-ar="otype" data-v="${v}" class="${t.type === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <label class="ta-f ${t.type === "LMT" ? "" : "off"}"><span>Giá Limit (điểm)</span><input id="tk-px" inputmode="decimal" autocomplete="off" value="${esc(t.px)}" placeholder="vd 1800.0"></label>
      <label class="ta-f ${t.type === "STP" ? "" : "off"}"><span>Giá kích hoạt Stop (điểm)</span><input id="tk-stop" inputmode="decimal" autocomplete="off" value="${esc(t.stop)}" placeholder="vd 1805.0"></label>
      <div class="ta-f"><span>Khối lượng (hợp đồng)</span>
        <div class="ta-qty"><button type="button" data-ar="qty" data-v="-1" aria-label="Bớt 1">−</button><input id="tk-qty" inputmode="numeric" value="${t.qty}" aria-label="Số hợp đồng"><button type="button" data-ar="qty" data-v="1" aria-label="Thêm 1">+</button></div>
        <div class="ta-quick">${[1, 2, 3].map(n => `<button type="button" data-ar="qtyset" data-v="${n}">${n}</button>`).join("")}<button type="button" data-ar="qtymax">Tối đa</button></div></div>
      <div class="ta-prot">
        <label class="ta-f"><span>Stop Loss (điểm)</span><input id="tk-sl" inputmode="decimal" autocomplete="off" value="${esc(t.sl)}" placeholder="không bắt buộc"></label>
        <label class="ta-f"><span>Take Profit (điểm)</span><input id="tk-tp" inputmode="decimal" autocomplete="off" value="${esc(t.tp)}" placeholder="không bắt buộc"></label>
      </div>
      <dl class="ta-est" id="tk-est"></dl>
      <button type="button" class="ta-submit ${t.side === "B" ? "buy" : "sell"}" id="tk-go" data-ar="submit">—</button>
      <label class="ta-check sm"><input type="checkbox" id="tk-confirm" ${arPrefs().confirm ? "checked" : ""}> Hỏi xác nhận trước khi đặt lệnh</label>
      <p class="ta-note" id="tk-note"></p>`;
  }
  function arBindTicket() {
    const on = (id, k) => { const el = document.getElementById(id); if (el) el.oninput = () => { AR.ticket[k] = el.value; AR.cid = null; arEstimate(); }; };
    on("tk-px", "px"); on("tk-stop", "stop"); on("tk-sl", "sl"); on("tk-tp", "tp");
    const q = document.getElementById("tk-qty");
    if (q) q.oninput = () => { AR.ticket.qty = Math.max(0, parseInt(q.value, 10) || 0); AR.cid = null; arEstimate(); };
    const c = document.getElementById("tk-confirm");
    if (c) c.onchange = () => { arPrefs().confirm = c.checked; AR.dirty = true; arSave(true); };
  }
  function ticketReq() {
    const t = AR.ticket;
    return { sym: AR.sym, side: t.side, type: t.type, qty: parseInt(t.qty, 10) || 0,
      px: t.type === "LMT" ? toPu(t.px) : null, stop: t.type === "STP" ? toPu(t.stop) : null, sl: toPu(t.sl), tp: toPu(t.tp) };
  }
  // What the order would cost, from the engine's own rules (a copy of the account, nothing is saved)
  function estimate(req) {
    const a = arAcct(), q = arQuote();
    if (!a || !q || !q.q[req.sym]) return null;
    const s = E.SPECS[req.sym], qq = q.q[req.sym], m = E.metrics(a), pos = E.openPos(a, req.sym), sd = req.side === "B" ? 1 : -1;
    const qty = Math.max(0, req.qty || 0);
    const px = req.type === "MKT" ? E.marketPx(s, qq, req.side, Math.max(1, qty)) : req.type === "LMT" ? req.px : req.stop != null ? req.stop + sd * E.slipTicks(s, Math.max(1, qty), qq.depthScale) * s.tick : null;
    const inc = !pos || pos.side === sd ? qty : Math.max(0, qty - pos.qty);
    const out = { px, qty, inc, notional: px ? E.notional(s, qty, px) : null, im: px ? E.imOf(s, inc, px) : null, fee: s.fee * qty, avail: m.available, liq: null, mc: null, reduce: pos && pos.side !== sd };
    if (px && qty) {
      out.after = m.available - (out.im || 0) - out.fee;
      const x = JSON.parse(JSON.stringify(a));
      const mark = req.side === "B" ? px - s.halfSpread : px + s.halfSpread;
      const r = E.placeOrder(x, { cid: "estimate", sym: req.sym, side: req.side, type: "LMT", qty, px }, { t: q.t, open: true, q: { ...q.q, [req.sym]: { ...qq, mark, ceil: Math.max(qq.ceil, px), floor: Math.min(qq.floor, px) } } }, ST.ctxOf(arH(), q.t));
      if (r.ok && E.openPos(x, req.sym)) { out.liq = E.liqLevel(x, req.sym); out.mc = E.liqLevel(x, req.sym, "mm"); }
    }
    return out;
  }
  function arEstimate() {
    const box = document.getElementById("tk-est"), go = document.getElementById("tk-go"), note = document.getElementById("tk-note");
    if (!box) return;
    const req = ticketReq(), e = estimate(req), q = arQuote(), qq = q && q.q[AR.sym], s = E.SPECS[AR.sym];
    if (!e || !qq) { box.innerHTML = ""; return; }
    const mk = arMk();
    morph(box, `
      <div><dt>Chào mua / chào bán</dt><dd class="mono">${P(E.bidOf(s, qq.mark))} / ${P(E.askOf(s, qq.mark))}</dd></div>
      <div><dt>Giá khớp ước tính</dt><dd class="mono">${e.px ? P(e.px) : "—"}</dd></div>
      <div><dt>Giá trị danh nghĩa</dt><dd>${e.notional != null ? mil(e.notional) : "—"}</dd></div>
      <div><dt>Ký quỹ ban đầu cần</dt><dd>${e.im != null ? vnd(e.im) : "—"}${e.reduce && !e.inc ? " <small>(giảm vị thế)</small>" : ""}</dd></div>
      <div><dt>Phí ước tính</dt><dd>${vnd(e.fee)}</dd></div>
      <div><dt>Khả dụng sau lệnh</dt><dd class="${e.after != null && e.after < 0 ? "down" : ""}">${e.after != null ? vnd(e.after) : "—"}</dd></div>
      <div><dt>Giá Margin Call / thanh lý</dt><dd class="mono">${e.mc ? P(Math.round(e.mc / 10) * 10) : "—"} / <span class="down">${e.liq ? P(Math.round(e.liq / 10) * 10) : "—"}</span></dd></div>`);
    const side = req.side === "B" ? "Mua Long" : "Bán Short";
    go.textContent = `${side} ${req.qty || 0} HĐ ${AR.sym}`;
    go.className = `ta-submit ${req.side === "B" ? "buy" : "sell"}`;
    note.textContent = mk.kind === "replay" ? "Replay theo ngày: lệnh sẽ khớp từ phiên kế tiếp (Market khớp ở giá mở cửa)."
      : mk.phase !== "open" ? "Thị trường đã đóng cửa: lệnh Market bị từ chối, Limit/Stop sẽ chờ phiên sau."
      : req.type === "MKT" ? "Market khớp ngay ở giá chào + trượt giá, không phải giá trên biểu đồ." : "";
  }
  async function arSubmit() {
    if (AR.busy) return;
    const a = arAcct(), h = arH(), req = ticketReq();
    if (!req.qty) return toast("Nhập số hợp đồng", "error");
    if (req.type === "LMT" && !req.px) return toast("Nhập giá Limit", "error");
    if (req.type === "STP" && !req.stop) return toast("Nhập giá kích hoạt Stop", "error");
    if (!ST.allowOrder(h, Date.now())) return toast("Bạn đặt lệnh quá nhanh — chờ vài giây rồi thử lại", "error");
    AR.cid = AR.cid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    req.cid = AR.cid;
    AR.busy = true;
    const go = document.getElementById("tk-go");
    if (go) go.disabled = true;
    try {
      if (arPrefs().confirm) {
        const e = estimate(req);
        const ok = await confirmDialog({ title: "Xác nhận đặt lệnh", confirmText: "Đặt lệnh", message: `<span class="ta-confirm">
          <b class="${req.side === "B" ? "up" : "down"}">${req.side === "B" ? "Mua / Long" : "Bán / Short"} ${req.qty} hợp đồng ${esc(req.sym)}</b><br>
          Loại lệnh: ${req.type === "MKT" ? "Market" : req.type === "LMT" ? `Limit @ ${P(req.px)}` : `Stop @ ${P(req.stop)}`}<br>
          Giá khớp ước tính: ${e && e.px ? P(e.px) : "—"} · Danh nghĩa: ${e && e.notional ? mil(e.notional) : "—"}<br>
          Ký quỹ ban đầu: ${e && e.im != null ? vnd(e.im) : "—"} · Phí: ${e ? vnd(e.fee) : "—"}<br>
          Stop Loss: ${req.sl ? P(req.sl) : "không"} · Take Profit: ${req.tp ? P(req.tp) : "không"}</span>` });
        if (!ok) { AR.busy = false; if (go) go.disabled = false; return; }
      }
      const before = a.fills.length;
      const r = E.placeOrder(a, req, arQuote(), arCtx());
      AR.dirty = true;
      if (r.ok) {
        const o = r.order;
        AR.cid = null;
        if (r.duplicate) toast("Lệnh này đã được ghi nhận trước đó");
        else if (o.status === "FILLED") toast(`Đã khớp ${o.filled} HĐ @ ${P(o.avgPx)}`);
        else if (o.status === "CANCELLED") toast(o.reason, "error");
        else toast(`Đã đặt lệnh ${o.type === "MKT" ? "Market (chờ phiên sau)" : o.type === "LMT" ? "Limit" : "Stop"} ${o.id}`);
        AR.fills = before;
      } else { AR.cid = null; toast(r.error, "error"); }
      arSave(true);
      arAfterChange();
    } finally { AR.busy = false; if (go) go.disabled = false; }
  }

  // ---------- Painting ----------
  function arPaintSoon() {
    if (AR.paintQ) return;
    AR.paintQ = true;
    const wait = Math.max(0, 250 - (Date.now() - AR.paintAt));
    setTimeout(() => { AR.paintQ = false; arPaint(false); }, wait);
  }
  function arPaint(full) {
    const root = document.getElementById("ta-root");
    if (!root || !arAcct()) return;
    AR.paintAt = Date.now();
    const a = arAcct(), mk = arMk(), q = arQuote(), m = E.metrics(a);
    const set = (id, html, cls) => { const el = document.getElementById(id); if (el) { morph(el, html); if (cls != null) el.className = cls; } };
    set("ta-cash", mil(m.cash));
    set("ta-eq", mil(m.equity), tone(m.equity - a.initial));
    const dayEq = (a.meta && a.meta.dayEq) || a.initial;
    set("ta-day", `${sgn(m.equity - dayEq)}`, tone(m.equity - dayEq));
    set("ta-avail", mil(m.available));
    const st = document.getElementById("ta-mstat");
    if (st) {
      const lv = m.open.length ? m.marginRatio : Infinity;
      st.className = `ta-chip ${a.status === "MARGIN_CALL" ? "red pulse" : lv < 1.6 ? "amber" : "green"}`;
      st.textContent = a.status === "MARGIN_CALL" ? "MARGIN CALL" : m.open.length ? `Ký quỹ ${isFinite(m.util) ? Math.round(m.util * 100) : "—"}%` : "Không vị thế";
      st.title = "Tỷ lệ sử dụng ký quỹ = ký quỹ ban đầu ÷ Equity";
    }
    set("ta-ctl", ctlHtml(mk));
    set("ta-wl", watchHtml(q));
    set("ta-sess", sessHtml(q));
    set("ta-news", newsHtml(mk));
    arEstimate();
    const counts = { pos: m.open.length, ord: a.orders.filter(o => o.status === "PENDING").length };
    for (const k of ["pos", "ord"]) set(`ta-n-${k}`, counts[k] ? String(counts[k]) : "");
    const tab = document.getElementById("ta-tab");
    if (tab) { if (full) tab.innerHTML = tabHtml(AR.tab); else morph(tab, tabHtml(AR.tab)); }
    arChartData(full);
    arLines();
  }
  function ctlHtml(mk) {
    if (mk.kind === "replay") {
      const done = M.replayDone(mk), n = mk.cursor - mk.start;
      return `<span class="ta-clock"><b>Phiên ${n}/${mk.end - mk.start}</b><small>${blind() ? "ngày thật đang ẩn" : esc(dmy(arBars()[mk.cursor].d))}</small></span>
        <button type="button" class="ta-btn sm" data-ar="rnext" ${done ? "disabled" : ""}>${icon("next", 14)} Phiên tiếp</button>
        <button type="button" class="ta-btn ghost sm" data-ar="rauto" ${done ? "disabled" : ""}>${AR.auto ? icon("stop", 14) + " Dừng" : icon("play", 14) + " Tự chạy"}</button>`;
    }
    const d = new Date(mk.lastT * 1000), dow = DOW[d.getUTCDay()];
    const ph = mk.phase !== "open" ? "Đóng cửa" : mk.min < M.SESSIONS[0][1] ? "Phiên sáng" : "Phiên chiều";
    return `<span class="ta-clock"><b>${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}</b><small>${dow} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} · ${ph}</small></span>
      ${mk.phase === "open" ? `<button type="button" class="ta-ib ta-play ${AR.playing ? "on" : ""}" data-ar="play" aria-label="${AR.playing ? "Tạm dừng" : "Chạy"}" title="${AR.playing ? "Tạm dừng" : "Chạy thị trường"}">${icon(AR.playing ? "stop" : "play", 16)}</button>
        <div class="ta-seg sm">${SPEEDS.map(([v, l]) => `<button type="button" data-ar="speed" data-v="${v}" class="${AR.speed === v ? "on" : ""}">${l}</button>`).join("")}</div>`
        : `<button type="button" class="ta-btn sm" data-ar="nextday">${icon("next", 14)} Mở phiên kế tiếp</button>`}`;
  }
  function watchHtml(q) {
    const a = arAcct(), prefs = arPrefs(), watch = prefs.watch || [];
    return `<h3 class="ta-h3">Sản phẩm phái sinh</h3><div class="ta-wl">${Object.entries(q.q).map(([sym, x]) => {
      const ch = (x.mark - x.ref) / x.ref, pos = E.openPos(a, sym);
      return `<div class="ta-wr ${AR.sym === sym ? "on" : ""}"><button type="button" class="ta-wrow" data-ar="sym" data-v="${sym}" aria-pressed="${AR.sym === sym}">
        <span class="ta-wsym"><b>${sym}</b><small>${blind() ? "Hợp đồng tháng gần" : esc(x.contract)}</small></span>
        <span class="ta-wpx"><b class="mono ${tone(x.mark - x.ref)}">${P(x.mark)}</b><small class="${tone(ch)}">${pct(ch)}</small></span>
        <span class="ta-wvol"><small>KL ${Number(x.dayV || 0).toLocaleString("vi-VN")}</small>${pos ? `<small class="ta-pos ${pos.side > 0 ? "up" : "down"}">${pos.side > 0 ? "L" : "S"} ${pos.qty}</small>` : ""}</span>
      </button><button type="button" class="ta-star ${watch.includes(sym) ? "on" : ""}" data-ar="watch" data-v="${sym}" aria-label="Theo dõi ${sym}" aria-pressed="${watch.includes(sym)}" title="Watchlist">${icon("star", 13)}</button></div>`;
    }).join("")}</div>`;
  }
  function sessHtml(q) {
    const x = q.q[AR.sym], mk = arMk();
    if (!x) return "";
    let exp = blind() ? (() => { const b = arBars(); let n = 0; for (let i = mk.cursor + 1; i < b.length && b[i].c === b[mk.cursor].c; i++) n++; return `sau ${n} phiên`; })() : dmy(x.exp);
    return `<h3 class="ta-h3">Phiên hiện tại · ${AR.sym}</h3><dl class="ta-kv">
      <div><dt>Tham chiếu</dt><dd class="mono">${P(x.ref)}</dd></div><div><dt>Trần / sàn</dt><dd class="mono"><span class="up">${P(x.ceil)}</span> / <span class="down">${P(x.floor)}</span></dd></div>
      <div><dt>Mở cửa</dt><dd class="mono">${P(x.dayO)}</dd></div><div><dt>Cao / thấp</dt><dd class="mono">${P(x.dayH)} / ${P(x.dayL)}</dd></div>
      <div><dt>Hợp đồng</dt><dd>${blind() ? "Tháng gần" : esc(x.contract)}</dd></div><div><dt>Đáo hạn</dt><dd>${esc(exp)}</dd></div>
      ${mk.kind === "synthetic" ? `<div><dt>Biến động</dt><dd>${mk.regime === "high" ? `<span class="down">Mạnh</span>` : mk.regime === "calm" ? "Thấp" : "Bình thường"}</dd></div>` : ""}
      ${x.idx ? `<div><dt>Chỉ số VN30</dt><dd class="mono">${P(x.idx)} <small class="ta-muted">basis ${((x.mark - x.idx) / 100).toFixed(2)}</small></dd></div>` : ""}
    </dl>`;
  }
  function newsHtml(mk) {
    if (mk.kind !== "synthetic") return `<p class="ta-foot">Nguồn: WiData MCP by WiGroup · giá gốc hợp đồng tương lai theo ngày.</p>`;
    const n = (mk.news || []).slice(-5).reverse();
    return `<h3 class="ta-h3">Tin thị trường <small>(giả lập)</small></h3>${n.length ? `<ul class="ta-news">${n.map(x => `<li><time>${when(x.t)}</time><span class="${x.dir > 0 ? "up" : "down"}">${esc(x.text)}</span></li>`).join("")}</ul>` : `<p class="ta-empty sm">Chưa có tin.</p>`}`;
  }

  // ---------- Bottom tabs ----------
  function tabHtml(k) {
    const a = arAcct(), m = E.metrics(a), q = arQuote();
    const empty = t => `<p class="ta-empty">${t}</p>`;
    const table = (head, rows) => `<div class="ta-tw"><table class="ta-t"><thead><tr>${head.map(h => `<th class="${h[1] || ""}">${h[0]}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    if (k === "pos") {
      if (!m.open.length) return empty("Chưa có vị thế mở. Đặt lệnh ở bảng bên phải.");
      return table([["Sản phẩm"], ["Chiều"], ["KL", "n"], ["Giá vốn TB", "n"], ["Giá mark", "n"], ["Lãi/lỗ chưa TH", "n"], ["Ký quỹ BĐ", "n"], ["Giá thanh lý", "n"], ["SL / TP", "n"], [""]],
        m.open.map(p => {
          const s = E.SPECS[p.sym], mark = a.marks[p.sym], u = E.unrealOf(a, p), avg = Math.round(p.lots.reduce((n, l) => n + l.q * l.px, 0) / p.qty), lv = E.liqLevel(a, p.sym);
          const cost = E.notional(s, p.qty, avg);
          return `<tr><td><b>${p.sym}</b><small>${blind() ? "" : esc(p.contract)}</small></td><td class="${p.side > 0 ? "up" : "down"}">${p.side > 0 ? "Long" : "Short"}</td><td class="n">${p.qty}</td>
            <td class="n mono">${P(avg)}</td><td class="n mono">${P(mark)}</td><td class="n ${tone(u)}">${sgn(u)}<small>${pct(u / cost)}</small></td>
            <td class="n">${vnd(E.imOf(s, p.qty, mark))}</td><td class="n mono down">${lv ? P(Math.round(lv / 10) * 10) : "—"}</td>
            <td class="n mono">${p.sl ? `<span class="down">${P(p.sl)}</span>` : "—"} / ${p.tp ? `<span class="up">${P(p.tp)}</span>` : "—"}</td>
            <td class="act"><button type="button" class="ta-btn xs ghost" data-ar="prot" data-v="${p.sym}">SL/TP</button><button type="button" class="ta-btn xs ghost" data-ar="part" data-v="${p.sym}" ${p.qty < 2 ? "disabled" : ""}>Đóng 1 phần</button><button type="button" class="ta-btn xs ghost" data-ar="rev" data-v="${p.sym}">Đảo</button><button type="button" class="ta-btn xs" data-ar="close" data-v="${p.sym}">Đóng</button></td></tr>`;
        }));
    }
    if (k === "ord") {
      const list = a.orders.filter(o => o.status === "PENDING");
      if (!list.length) return empty("Không có lệnh chờ.");
      return table([["Mã lệnh"], ["Thời gian"], ["Sản phẩm"], ["Chiều"], ["Loại"], ["KL", "n"], ["Giá / kích hoạt", "n"], ["Nhãn"], ["Ký quỹ giữ", "n"], [""]],
        list.slice().reverse().map(o => `<tr><td class="mono">${o.id}</td><td>${when(o.t)}</td><td>${o.sym}</td><td class="${o.side === "B" ? "up" : "down"}">${o.side === "B" ? "Mua" : "Bán"}</td>
          <td>${o.type === "MKT" ? "Market" : o.type === "LMT" ? "Limit" : "Stop"}</td><td class="n">${o.qty}</td><td class="n mono">${o.px ? P(o.px) : o.stop ? P(o.stop) : "giá mở cửa"}</td>
          <td>${esc(TAG[o.tag] || (o.reduceOnly ? "Đóng vị thế" : "Mở/tăng"))}</td><td class="n">${vnd(E.reservedOf(a, o))}</td>
          <td class="act"><button type="button" class="ta-btn xs ghost" data-ar="cancel" data-v="${o.id}">Hủy</button></td></tr>`));
    }
    if (k === "fills") {
      if (!a.fills.length) return empty("Chưa có lệnh nào khớp.");
      return table([["Thời gian"], ["Hợp đồng"], ["Chiều"], ["KL", "n"], ["Giá khớp", "n"], ["Phí", "n"], ["Lãi/lỗ đã TH", "n"], ["Nguồn"]],
        a.fills.slice(-200).reverse().map(f => `<tr><td>${when(f.t)}</td><td>${blind() ? f.sym : esc(f.contract)}</td><td class="${f.side === "B" ? "up" : "down"}">${f.side === "B" ? "Mua" : "Bán"}${f.open ? " mở" : " đóng"}</td>
          <td class="n">${f.qty}</td><td class="n mono">${P(f.px)}</td><td class="n">${vnd(f.fee)}</td><td class="n ${tone(f.pnl)}">${f.open ? "—" : sgn(f.pnl)}</td><td>${esc(TAG[f.tag] || "Lệnh của bạn")}</td></tr>`));
    }
    if (k === "trades") {
      const t = E.tradesOf(a);
      if (!t.length) return empty("Chưa có giao dịch đã đóng.");
      return table([["Mở"], ["Đóng"], ["Sản phẩm"], ["Chiều"], ["KL tối đa", "n"], ["Giá vào TB", "n"], ["Giá ra TB", "n"], ["Lãi/lỗ sau phí", "n"], ["Kết thúc"]],
        t.slice(-200).reverse().map(x => `<tr><td>${when(x.openT)}</td><td>${when(x.closeT)}</td><td>${x.sym}</td><td class="${x.side > 0 ? "up" : "down"}">${x.side > 0 ? "Long" : "Short"}</td><td class="n">${x.qty}</td>
          <td class="n mono">${P(x.entry)}</td><td class="n mono">${P(x.exit)}</td><td class="n ${tone(x.net)}">${sgn(x.net)}</td><td>${STATUS[x.status]}</td></tr>`));
    }
    if (k === "ledger") {
      let bal = a.base ? a.base.cash : 0;
      const rows = a.ledger.map(e => { bal += e.amount; return { e, bal }; });
      if (a.base) rows.unshift({ e: { id: "—", t: a.base.t, type: "BASE", amount: 0, ref: `${a.base.n} lần khớp cũ đã gộp` }, bal: a.base.cash });
      const resets = (a.resets || []).map(r => `<li>Đặt lại tài khoản lúc ${when(r.t)} — Equity trước đó ${vnd(r.equity)} (${pct(r.ret)}), ${r.trades} giao dịch</li>`).join("");
      return `${resets ? `<ul class="ta-resets">${resets}</ul>` : ""}${table([["Mã"], ["Thời gian"], ["Loại"], ["Số tiền", "n"], ["Số dư tiền mặt", "n"], ["Tham chiếu"]],
        rows.slice(-300).reverse().map(({ e, bal: b }) => `<tr><td class="mono">${e.id}</td><td>${when(e.t)}</td><td>${LEDGER[e.type] || e.type}</td><td class="n ${tone(e.amount)}">${e.amount ? sgn(e.amount) : "—"}</td><td class="n">${vnd(b)}</td><td class="mono">${esc(e.ref || e.note || "")}</td></tr>`))}`;
    }
    if (k === "perf") return perfHtml(a, q);
    if (k === "margin") return marginHtml(a, m);
    if (k === "log") {
      const v = E.verify(a);
      return `<p class="${v.ok ? "ta-ok" : "ta-warn"}">${icon(v.ok ? "check" : "alert", 14)} ${v.ok ? "Đối chiếu sổ cái: khớp. Tiền mặt = vốn ban đầu + lãi/lỗ đã thực hiện − phí; chuỗi băm nguyên vẹn." : esc(v.problems.join(" · "))}</p>
        ${table([["Thời gian"], ["Sự kiện"], ["Chi tiết"]], a.audit.slice(-120).reverse().map(x => `<tr><td>${when(x.t)}</td><td class="mono">${esc(x.act)}</td><td>${esc(x.msg)}</td></tr>`))}`;
    }
    return "";
  }
  function perfHtml(a, q) {
    const mk = arMk(), now = q.t;
    const day = Math.floor(now / 86400) * 86400;
    const from = AR.range === "day" ? day : AR.range === "week" ? day - 6 * 86400 : AR.range === "month" ? day - 29 * 86400 : null;
    const x = E.analytics(a, { from, now });
    const k = (l, v, c) => `<div class="ta-k"><span>${l}</span><b class="${c || ""}">${v}</b></div>`;
    const pf = x.pf == null ? "—" : x.pf === Infinity ? "∞" : x.pf.toFixed(2);
    return `<div class="ta-seg">${[["day", "Ngày"], ["week", "Tuần"], ["month", "Tháng"], ["all", "Toàn bộ"]].map(([v, l]) => `<button type="button" data-ar="range" data-v="${v}" class="${AR.range === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="ta-kpis">${k("Vốn ban đầu", mil(x.initial))}${k("Equity hiện tại", mil(x.equity), tone(x.equity - x.initial))}${k("Tổng lợi nhuận", pct(x.ret), tone(x.ret))}
        ${k("Lãi/lỗ đã TH", sgn(x.realized), tone(x.realized))}${k("Lãi/lỗ chưa TH", sgn(x.unreal), tone(x.unreal))}${k("Phí đã trả", vnd(x.fees))}
        ${k("Số giao dịch", x.n)}${k("Tỷ lệ thắng", x.winRate == null ? "—" : pct(x.winRate, 1).replace("+", ""))}${k("Profit factor", pf)}
        ${k("Sụt giảm tối đa", pct(-x.maxDD), x.maxDD > 0 ? "down" : "")}${k("Lãi TB / lệnh thắng", x.avgWin == null ? "—" : sgn(x.avgWin), "up")}${k("Lỗ TB / lệnh thua", x.avgLoss == null ? "—" : sgn(x.avgLoss), "down")}
        ${k("Giao dịch tốt nhất", x.best ? sgn(x.best.net) : "—", "up")}${k("Giao dịch tệ nhất", x.worst ? sgn(x.worst.net) : "—", "down")}</div>
      <div class="ta-perf-charts"><figure><figcaption>Đường Equity</figcaption>${curveSvg(x.curve, a.initial)}</figure>
        <figure><figcaption>Lãi/lỗ theo ngày${mk.kind === "replay" ? " (phiên)" : ""}</figcaption>${dailySvg(x.daily.slice(-30))}</figure></div>
      <p class="ta-foot">Tính từ lịch sử giao dịch của chính tài khoản mô phỏng này${mk.kind === "synthetic" ? ", theo thời gian của thị trường mô phỏng" : ""}.</p>`;
  }
  function curveSvg(pts, initial) {
    if (pts.length < 2) return `<p class="ta-empty sm">Chưa đủ dữ liệu.</p>`;
    const w = 560, h = 150, ys = pts.map(p => p.eq), lo = Math.min(...ys, initial), hi = Math.max(...ys, initial), r = hi - lo || 1;
    const X = i => (i / (pts.length - 1)) * w, Y = v => h - 8 - (v - lo) / r * (h - 16);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.eq).toFixed(1)}`).join("");
    const last = pts[pts.length - 1].eq;
    return `<svg viewBox="0 0 ${w} ${h}" class="ta-svg" role="img" aria-label="Đường Equity"><line x1="0" x2="${w}" y1="${Y(initial)}" y2="${Y(initial)}" class="base"/><path d="${d}" class="${last >= initial ? "up" : "down"}"/></svg>`;
  }
  function dailySvg(days) {
    if (!days.length) return `<p class="ta-empty sm">Chưa đủ dữ liệu.</p>`;
    const w = 560, h = 150, mx = Math.max(...days.map(d => Math.abs(d.pnl)), 1), bw = w / days.length;
    return `<svg viewBox="0 0 ${w} ${h}" class="ta-svg" role="img" aria-label="Lãi lỗ theo ngày"><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="base"/>
      ${days.map((d, i) => { const bh = Math.abs(d.pnl) / mx * (h / 2 - 6); return `<rect x="${(i * bw + bw * 0.18).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" y="${(d.pnl >= 0 ? h / 2 - bh : h / 2).toFixed(1)}" height="${Math.max(1, bh).toFixed(1)}" class="${d.pnl >= 0 ? "up" : "down"}"><title>${blind() ? "" : d.d + ": "}${sgn(d.pnl)}</title></rect>`; }).join("")}</svg>`;
  }
  function marginHtml(a, m) {
    // the bar runs from 0 to the liquidation level, in units of utilisation (IM ÷ Equity)
    const util = isFinite(m.util) ? m.util : 9, uMc = 100 / E.RISK.mmPct, uLiq = uMc * 100 / E.RISK.liqPct;
    const mcAt = E.RISK.mmPct / 100, bar = Math.min(100, util / uLiq * 100);
    return `<div class="ta-kpis">
        <div class="ta-k"><span>Equity</span><b>${vnd(m.equity)}</b></div><div class="ta-k"><span>Tiền mặt</span><b>${vnd(m.cash)}</b></div>
        <div class="ta-k"><span>Ký quỹ ban đầu (IM)</span><b>${vnd(m.im)}</b></div><div class="ta-k"><span>Ký quỹ duy trì (MM)</span><b>${vnd(m.mm)}</b></div>
        <div class="ta-k"><span>Mức thanh lý (${E.RISK.liqPct}% MM)</span><b>${vnd(m.liq)}</b></div><div class="ta-k"><span>Ký quỹ giữ cho lệnh chờ</span><b>${vnd(m.reserved)}</b></div>
        <div class="ta-k"><span>Khả dụng</span><b class="${m.available < 0 ? "down" : ""}">${vnd(m.available)}</b></div><div class="ta-k"><span>Giá trị danh nghĩa</span><b>${vnd(m.gross)}</b></div>
        <div class="ta-k"><span>Đòn bẩy thực tế</span><b>${m.equity > 0 && m.gross ? (m.gross / m.equity).toFixed(2) + "×" : "—"}</b></div>
        <div class="ta-k"><span>Equity / MM</span><b class="${m.marginRatio < 1 ? "down" : ""}">${isFinite(m.marginRatio) ? m.marginRatio.toFixed(2) + "×" : "—"}</b></div>
      </div>
      <div class="ta-util"><div class="ta-util-h"><span>Tỷ lệ sử dụng ký quỹ (IM ÷ Equity)</span><b>${isFinite(m.util) ? Math.round(m.util * 100) + "%" : "—"}</b></div>
        <div class="ta-util-bar"><i style="width:${bar}%" class="${a.status === "MARGIN_CALL" || util > uMc ? "down" : util > 1 ? "amber" : "up"}"></i><em style="left:${(uMc / uLiq * 100).toFixed(1)}%" title="Margin Call: ${Math.round(uMc * 100)}%"></em><em class="liq" style="left:calc(100% - 2px)" title="Thanh lý: ${Math.round(uLiq * 100)}%"></em></div>
        <div class="ta-util-scale"><span>0%</span><span style="left:${(100 / uLiq).toFixed(1)}%">100% (hết khả dụng)</span><span style="left:${(uMc / uLiq * 100).toFixed(1)}%">${Math.round(uMc * 100)}% Margin Call</span><span style="right:0">${Math.round(uLiq * 100)}% thanh lý</span></div>
        <p class="ta-foot">Trạng thái: <b class="${a.status === "MARGIN_CALL" ? "down" : "up"}">${a.status === "MARGIN_CALL" ? "MARGIN CALL — chỉ được giảm vị thế cho tới khi Equity ≥ IM" : "Bình thường"}</b>. Margin Call khi Equity &lt; MM (tỷ lệ trên ${Math.round(uMc * 100)}%); thanh lý bắt buộc khi Equity &lt; ${E.RISK.liqPct}% MM (tỷ lệ trên ${Math.round(uLiq * 100)}%).
          Đã bị Margin Call ${a.stats.mc} lần, khắc phục ${a.stats.mcCured} lần, bị thanh lý ${a.stats.liq} lần.</p></div>
      ${a.audit.filter(x => /MARGIN|LIQUIDATION|EXPIRY/.test(x.act)).length ? `<ul class="ta-news">${a.audit.filter(x => /MARGIN|LIQUIDATION|EXPIRY/.test(x.act)).slice(-8).reverse().map(x => `<li><time>${when(x.t)}</time><span class="${x.act === "MARGIN_OK" ? "up" : "down"}">${esc(x.msg)}</span></li>`).join("")}</ul>` : ""}`;
  }

  // ---------- Chart ----------
  function arTheme() {
    return themeAttr() === "light"
      ? { bg: "#FFFFFF", text: "#5B6475", grid: "rgba(16,24,40,0.06)", line: "rgba(16,24,40,0.14)", up: "#0E9F6E", down: "#E0464E", ma: "#B7791F", ema: "#2563EB", bb: "rgba(124,92,255,0.75)", vol: ["rgba(14,159,110,0.35)", "rgba(224,70,78,0.35)"] }
      : { bg: "#0B0F19", text: "#8C96AB", grid: "rgba(255,255,255,0.045)", line: "rgba(255,255,255,0.1)", up: "#22C58B", down: "#F0525C", ma: "#E3B341", ema: "#5B9CF6", bb: "rgba(167,139,250,0.8)", vol: ["rgba(34,197,139,0.32)", "rgba(240,82,92,0.32)"] };
  }
  function tickFmt(t, type) {
    if (blind()) return `P${sessionNo(t)}`;
    const d = new Date(t * 1000);
    if (AR.tf === "D" || type < 3) return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  function arChartDestroy() {
    if (AR.chart) { try { AR.chart.remove(); } catch (e) { /* ignore */ } }
    if (AR.sub) { try { AR.sub.remove(); } catch (e) { /* ignore */ } }
    AR.chart = AR.sub = null; AR.s = {}; AR.plines = []; AR.dlines = []; AR.dseries = []; AR.nRows = 0; AR.firstT = null; AR.draw = null; AR.drawA = null;
  }
  function arChartInit() {
    const L = window.LightweightCharts, el = document.getElementById("ta-chart");
    if (!L || !el) { if (el) el.innerHTML = `<p class="ta-empty">Không tải được thư viện biểu đồ.</p>`; return; }
    const th = arTheme(), ind = arPrefs().ind;
    const base = { autoSize: true, layout: { background: { type: "solid", color: th.bg }, textColor: th.text, fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace", fontSize: 11 },
      grid: { vertLines: { color: th.grid }, horzLines: { color: th.grid } }, crosshair: { mode: L.CrosshairMode.Normal },
      rightPriceScale: { borderColor: th.line }, timeScale: { borderColor: th.line, timeVisible: AR.tf !== "D", secondsVisible: false, rightOffset: 4, tickMarkFormatter: tickFmt },
      localization: { locale: "vi-VN", timeFormatter: t => when(t), priceFormatter: p => p.toFixed(1) } };
    AR.chart = L.createChart(el, base);
    AR.s.c = AR.chart.addCandlestickSeries({ upColor: th.up, downColor: th.down, borderVisible: false, wickUpColor: th.up, wickDownColor: th.down, priceFormat: { type: "price", precision: 1, minMove: 0.1 } });
    AR.s.v = AR.chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "", lastValueVisible: false, priceLineVisible: false, visible: !!ind.vol });
    AR.s.v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const line = (color, extra) => AR.chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...(extra || {}) });
    AR.s.ma = line(th.ma, { visible: !!ind.ma }); AR.s.ema = line(th.ema, { visible: !!ind.ema });
    AR.s.bbu = line(th.bb, { visible: !!ind.bb }); AR.s.bbm = line(th.bb, { visible: !!ind.bb, lineStyle: L.LineStyle.Dotted }); AR.s.bbl = line(th.bb, { visible: !!ind.bb });
    const subEl = document.getElementById("ta-sub");
    if (ind.sub && subEl) {
      AR.sub = L.createChart(subEl, { ...base, layout: { ...base.layout, attributionLogo: false }, timeScale: { ...base.timeScale, visible: false }, rightPriceScale: { borderColor: th.line, scaleMargins: { top: 0.12, bottom: 0.08 } } });
      if (ind.sub === "rsi") {
        AR.s.rsi = AR.sub.addLineSeries({ color: th.ema, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, priceFormat: { type: "price", precision: 1, minMove: 0.1 } });
        AR.s.rsi.createPriceLine({ price: 70, color: th.down, lineWidth: 1, lineStyle: L.LineStyle.Dashed, axisLabelVisible: false, title: "70" });
        AR.s.rsi.createPriceLine({ price: 30, color: th.up, lineWidth: 1, lineStyle: L.LineStyle.Dashed, axisLabelVisible: false, title: "30" });
      } else {
        AR.s.mh = AR.sub.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "price", precision: 2, minMove: 0.01 } });
        AR.s.ml = AR.sub.addLineSeries({ color: th.ema, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        AR.s.msig = AR.sub.addLineSeries({ color: th.ma, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      }
      const sync = (from, to) => from.timeScale().subscribeVisibleLogicalRangeChange(r => { if (!r || AR.syncing || !to) return; AR.syncing = true; try { to.timeScale().setVisibleLogicalRange(r); } catch (e) { /* ignore */ } AR.syncing = false; });
      sync(AR.chart, AR.sub); sync(AR.sub, AR.chart);
    }
    AR.chart.subscribeClick(arChartClick);
    AR.chart.subscribeCrosshairMove(p => {
      const lg = document.getElementById("ta-legend");
      if (!lg) return;
      const d = p && p.seriesData && p.seriesData.get(AR.s.c);
      lg.innerHTML = d ? `O <b>${d.open.toFixed(1)}</b> H <b>${d.high.toFixed(1)}</b> L <b>${d.low.toFixed(1)}</b> C <b class="${d.close >= d.open ? "up" : "down"}">${d.close.toFixed(1)}</b>` : "";
    });
    arChartData(true);
  }
  function arRows() {
    const mk = arMk();
    if (!mk) return [];
    if (mk.kind === "replay") { const b = arBars(); return b ? M.replayCandles(mk, b) : []; }
    return M.candles(mk, AR.sym, AR.tf);
  }
  function arChartData(full) {
    if (!AR.chart || !AR.s.c) return;
    const rows = arRows();
    if (!rows.length) return;
    const th = arTheme(), cd = rows.map(r => ({ time: r[0], open: r[1] / 100, high: r[2] / 100, low: r[3] / 100, close: r[4] / 100 }));
    const vd = rows.map(r => ({ time: r[0], value: r[5], color: r[4] >= r[1] ? th.vol[0] : th.vol[1] }));
    const closes = rows.map(r => r[4] / 100), times = rows.map(r => r[0]);
    const ln = arr => arr.map((v, i) => v == null ? { time: times[i] } : { time: times[i], value: v });
    const reset = full || rows.length !== AR.nRows || rows[0][0] !== AR.firstT;
    const ma = M.sma(closes, 20), ema = M.ema(closes, 9), bb = M.bollinger(closes, 20, 2);
    const subs = [];
    if (AR.s.rsi) subs.push([AR.s.rsi, ln(M.rsi(closes, 14))]);
    if (AR.s.mh) { const mc = M.macd(closes); subs.push([AR.s.ml, ln(mc.line)], [AR.s.msig, ln(mc.signal)], [AR.s.mh, mc.hist.map((v, i) => v == null ? { time: times[i] } : { time: times[i], value: v, color: v >= 0 ? th.vol[0] : th.vol[1] })]); }
    const pairs = [[AR.s.c, cd], [AR.s.v, vd], [AR.s.ma, ln(ma)], [AR.s.ema, ln(ema)], [AR.s.bbu, ln(bb.up)], [AR.s.bbm, ln(bb.mid)], [AR.s.bbl, ln(bb.lo)], ...subs];
    if (reset) {
      const keep = AR.nRows && !full ? AR.chart.timeScale().getVisibleLogicalRange() : null;
      for (const [s, d] of pairs) s.setData(d);
      AR.nRows = rows.length; AR.firstT = rows[0][0];
      if (full) { const n = rows.length; AR.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - (AR.tf === "D" ? 80 : 140)), to: n + 4 }); }
      else if (keep && keep.to >= AR.nRows - 6) AR.chart.timeScale().scrollToRealTime();
      arMarkers(); arDrawings();
    } else for (const [s, d] of pairs) s.update(d[d.length - 1]);
    if (AR.fills !== arAcct().fills.length) arMarkers();
  }
  function snapTime(t) {
    const rows = arRows();
    let lo = 0, hi = rows.length - 1, ans = rows.length ? rows[0][0] : t;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (rows[mid][0] <= t) { ans = rows[mid][0]; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  function arMarkers() {
    if (!AR.s.c) return;
    const a = arAcct(), th = arTheme();
    AR.fills = a.fills.length;
    const first = AR.firstT || 0;
    const mk = a.fills.filter(f => f.sym === AR.sym && f.t >= first).slice(-150).map(f => ({ time: snapTime(f.t), position: f.side === "B" ? "belowBar" : "aboveBar", color: f.tag === "LIQ" ? "#F59E0B" : f.side === "B" ? th.up : th.down,
      shape: f.side === "B" ? "arrowUp" : "arrowDown", text: `${f.tag === "LIQ" ? "LIQ " : f.tag === "SL" ? "SL " : f.tag === "TP" ? "TP " : f.tag === "EXP" ? "ĐH " : ""}${f.side === "B" ? "B" : "S"}${f.qty}` }));
    mk.sort((x, y) => x.time - y.time);
    AR.s.c.setMarkers(mk);
  }
  // Entry, Stop Loss, Take Profit, margin-call and liquidation prices of the open position, and pending orders
  function arLines() {
    if (!AR.s.c) return;
    const L = window.LightweightCharts, th = arTheme(), a = arAcct();
    for (const l of AR.plines) { try { AR.s.c.removePriceLine(l); } catch (e) { /* ignore */ } }
    AR.plines = [];
    const add = (pu, color, title, style) => { if (pu == null || !isFinite(pu) || pu <= 0) return; AR.plines.push(AR.s.c.createPriceLine({ price: pu / 100, color, lineWidth: 1, lineStyle: style == null ? L.LineStyle.Dashed : style, axisLabelVisible: true, title })); };
    const p = E.openPos(a, AR.sym);
    if (p) {
      add(Math.round(p.lots.reduce((n, l) => n + l.q * l.px, 0) / p.qty), "#C9D1E0", `${p.side > 0 ? "Long" : "Short"} ${p.qty}`, L.LineStyle.Solid);
      if (p.sl) add(p.sl, th.down, "SL");
      if (p.tp) add(p.tp, th.up, "TP");
      const mc = E.liqLevel(a, AR.sym, "mm"), lq = E.liqLevel(a, AR.sym);
      if (mc) add(mc, "#E3B341", "Margin call", L.LineStyle.Dotted);
      if (lq) add(lq, "#F97316", "Thanh lý", L.LineStyle.LargeDashed);
    }
    for (const o of a.orders) if (o.status === "PENDING" && o.sym === AR.sym && !o.tag) add(o.px || o.stop, o.side === "B" ? th.up : th.down, `${o.type === "LMT" ? "Limit" : o.type === "STP" ? "Stop" : "MKT"} ${o.side === "B" ? "B" : "S"}${o.qty}`, L.LineStyle.SparseDotted);
  }
  function arDrawings() {
    if (!AR.chart) return;
    const L = window.LightweightCharts, list = (arPrefs().draw[AR.sym] || []);
    for (const s of AR.dseries) { try { AR.chart.removeSeries(s); } catch (e) { /* ignore */ } }
    for (const l of AR.dlines) { try { AR.s.c.removePriceLine(l); } catch (e) { /* ignore */ } }
    AR.dseries = []; AR.dlines = [];
    for (const d of list) {
      if (d.k === "h") AR.dlines.push(AR.s.c.createPriceLine({ price: d.p, color: "#A78BFA", lineWidth: 1, lineStyle: L.LineStyle.Solid, axisLabelVisible: true, title: "" }));
      else {
        const t1 = snapTime(d.a.t), t2 = snapTime(d.b.t);
        if (t1 === t2) continue;
        const pts = [{ time: t1, value: d.a.p }, { time: t2, value: d.b.p }].sort((x, y) => x.time - y.time);
        const s = AR.chart.addLineSeries({ color: "#A78BFA", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(pts); AR.dseries.push(s);
      }
    }
  }
  function arChartClick(p) {
    if (!AR.draw || !p || !p.point || p.time == null) return;
    const price = AR.s.c.coordinateToPrice(p.point.y);
    if (price == null) return;
    const pr = arPrefs(), list = pr.draw[AR.sym] = pr.draw[AR.sym] || [];
    if (AR.draw === "h") { list.push({ k: "h", p: Math.round(price * 10) / 10 }); AR.draw = null; }
    else if (!AR.drawA) { AR.drawA = { t: p.time, p: price }; toast("Chọn điểm thứ hai của đường xu hướng"); return; }
    else { list.push({ k: "t", a: AR.drawA, b: { t: p.time, p: price } }); AR.drawA = null; AR.draw = null; }
    if (list.length > 30) list.shift();
    AR.dirty = true; arSave(true);
    document.querySelectorAll('[data-ar="draw"]').forEach(b => b.classList.remove("on"));
    arDrawings();
  }

  // ---------- Market loop ----------
  function arNeeds(a, sym) { return a.positions.some(p => p.status === "OPEN" && p.sym === sym) || a.orders.some(o => o.status === "PENDING" && o.sym === sym); }
  function arTick() {
    const mk = arMk();
    if (!mk || mk.kind !== "synthetic" || !document.getElementById("ta-root")) return;
    const now = performance.now();
    if (!AR.playing || document.hidden || mk.phase !== "open") { AR.last = now; return; }
    const dt = Math.min(1, (now - (AR.last || now)) / 1000);
    AR.last = now;
    AR.acc += dt * AR.speed;
    const n = Math.floor(AR.acc / M.SUB);
    if (n < 1) { if (AR.speed <= 10) arPaintClock(); return; }
    AR.acc -= n * M.SUB;
    arEvents(M.advance(mk, n * M.SUB));
  }
  function arPaintClock() { const el = document.getElementById("ta-ctl"); if (el) morph(el, ctlHtml(arMk())); }
  function arEvents(ev) {
    const a = arAcct(), mk = arMk();
    if (!a) return;
    let closed = false;
    const mcBefore = a.status;
    for (const e of ev) {
      if (e.type === "bar") {
        if (arNeeds(a, e.sym)) E.onBar(a, e.sym, e.bar, { t: e.bar.t, open: true, q: M.synthQuote(mk, false).q });
        else E.setMark(a, e.sym, e.bar.c);
      } else if (e.type === "expiry") E.settleExpiry(a, e.sym, e.contract, e.px, mk.lastT);
      else if (e.type === "news") toast(e.news.text, e.news.dir > 0 ? "success" : "error");
      else if (e.type === "close") closed = true;
    }
    E.snapshot(a, mk.lastT, 300);
    AR.dirty = true;
    if (a.status !== mcBefore && a.status === "MARGIN_CALL") toast("MARGIN CALL: Equity dưới ký quỹ duy trì — hãy giảm vị thế", "error");
    arAfterChange(true);
    if (closed) arSessionEnd();
    arSave();
  }
  function arAfterChange(fromMarket) {
    const a = arAcct();
    if (!a) return;
    const fresh = a.fills.slice(AR.fills);
    if (fromMarket) for (const f of fresh) if (f.tag && f.tag !== "CLOSE" && f.tag !== "PART" && f.tag !== "REV") toast(`${TAG[f.tag] || f.tag}: ${f.side === "B" ? "mua" : "bán"} ${f.qty} HĐ @ ${P(f.px)}${f.open ? "" : ` · ${sgn(f.pnl - f.fee)}`}`, f.tag === "TP" ? "success" : "error");
      else if (f.order && !f.tag) toast(`Lệnh chờ đã khớp: ${f.side === "B" ? "mua" : "bán"} ${f.qty} HĐ @ ${P(f.px)}`);
    if (fresh.length) arMarkers();
    if (fromMarket) arPaintSoon(); else arPaint(true);
  }
  function arSessionEnd() {
    const a = arAcct(), mk = arMk();
    AR.playing = false;
    a.meta = a.meta || {};
    if (a.kind === "challenge" || a.kind === "cup") a.meta.sessions = (a.meta.sessions || 0) + 1;
    AR.dirty = true; arSave(true);
    if (a.kind === "challenge") {
      const r = ST.evalChallenge(arH(), AR.slot);
      if (r && r.done) { const fin = ST.finishRound(arH(), AR.slot, { passed: r.passed, fails: r.fails }); arSave(true); return arShowEnd(fin, r); }
    }
    if (a.kind === "cup" && a.meta.sessions >= ST.CUP.sessions) { const fin = ST.finishRound(arH(), "cup", { week: a.meta.week }); arSave(true); return arShowEnd(fin, null); }
    arPaint(true);
    arShowSessionEnd();
  }
  function arShowSessionEnd() {
    const a = arAcct(), mk = arMk(), over = document.getElementById("ta-over"), m = E.metrics(a);
    if (!over) return;
    const dayEq = (a.meta && a.meta.dayEq) || a.initial, ch = a.kind === "challenge" ? ST.evalChallenge(arH(), AR.slot) : null;
    over.hidden = false;
    over.innerHTML = `<div class="ta-pop"><p class="ta-kicker">Hết phiên ${esc(dmy(mk.day))}</p><h2 class="${tone(m.equity - dayEq)}">${sgn(m.equity - dayEq)}</h2>
      <p>Equity ${vnd(m.equity)} · tổng ${pct((m.equity - a.initial) / a.initial)}${m.open.length ? ` · còn ${m.open.length} vị thế mở qua đêm (giá có thể mở cửa chênh lệch)` : ""}</p>
      ${ch ? `<p class="ta-muted">Thử thách: phiên ${ch.sessions}/${ch.need}</p>` : a.kind === "cup" ? `<p class="ta-muted">Giải tuần: phiên ${a.meta.sessions}/${ST.CUP.sessions}</p>` : ""}
      <button type="button" class="ta-btn" data-ar="nextday">${icon("next", 15)} Mở phiên kế tiếp</button></div>`;
  }
  function arShowEnd(fin, ev) {
    const over = document.getElementById("ta-over");
    AR.playing = false;
    if (AR.auto) { clearInterval(AR.auto); AR.auto = null; }
    if (!over || !fin) return;
    over.hidden = false;
    const passed = fin.passed;
    over.innerHTML = `<div class="ta-pop"><p class="ta-kicker">${fin.mode === "challenge" ? "Kết thúc thử thách" : fin.mode === "cup" ? "Kết thúc giải tuần" : "Kết thúc vòng Replay"}</p>
      <h2 class="${fin.mode === "challenge" ? (passed ? "up" : "down") : tone(fin.ret)}">${fin.mode === "challenge" ? (passed ? "Đạt" : "Chưa đạt") : pct(fin.ret)}</h2>
      <p>Lợi nhuận ${pct(fin.ret)} · sụt giảm tối đa ${pct(-fin.maxDD)} · ${fin.trades} giao dịch${fin.liq ? ` · bị thanh lý ${fin.liq} lần` : ""}</p>
      ${fin.fails && fin.fails.length ? `<ul class="ta-fails">${fin.fails.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      ${fin.mode === "replay" && fin.period ? `<p class="ta-muted">Giai đoạn thật: ${esc(fin.period)}</p>` : ""}
      <div class="ta-mc-act"><a class="ta-btn" href="#/trading/derivatives">Về sảnh và bảng xếp hạng</a><button type="button" class="ta-btn ghost" data-ar="hideover">Xem lại tài khoản</button></div></div>`;
  }
  function arNextDay() {
    const mk = arMk(), a = arAcct();
    if (!mk || mk.kind !== "synthetic" || mk.phase === "open") return;
    if (a.meta && a.meta.finished) return;
    const ev = M.openDay(mk);
    a.meta = a.meta || {};
    a.meta.dayEq = E.metrics(a).equity;
    const over = document.getElementById("ta-over");
    if (over) over.hidden = true;
    arEvents(ev);
    AR.playing = true; AR.last = performance.now();
    arPaint(true);
  }
  function arReplayNext() {
    const mk = arMk(), a = arAcct(), bars = arBars();
    if (!mk || !bars || M.replayDone(mk) || (a.meta && a.meta.finished)) return;
    a.meta = a.meta || {};
    a.meta.dayEq = E.metrics(a).equity;
    const before = a.fills.length;
    for (const e of M.replayNext(mk, bars)) {
      if (e.type === "bar") E.onBar(a, e.sym, e.bar, { t: e.bar.t, open: true, q: { [e.sym]: e.q } });
      else if (e.type === "expiry") E.settleExpiry(a, e.sym, e.contract, e.px, e.t);
    }
    E.snapshot(a, M.replayQuote(mk, bars).t, 0);
    a.meta.sessions = (a.meta.sessions || 0) + 1;
    AR.fills = before;
    AR.dirty = true;
    if (M.replayDone(mk)) {
      const period = `${dmy(bars[mk.start + 1].d)} – ${dmy(bars[mk.end].d)}`;
      const fin = ST.finishRound(arH(), "replay", { period });
      arSave(true); arAfterChange(true); arPaint(true);
      return arShowEnd(fin, null);
    }
    arSave(true);
    arAfterChange(true);
  }

  // ---------- Position actions ----------
  async function arClose(sym, part) {
    const a = arAcct(), p = E.openPos(a, sym);
    if (!p) return;
    let qty = p.qty;
    if (part) {
      const v = await promptDialog({ title: `Đóng một phần ${sym}`, message: `Đang ${p.side > 0 ? "Long" : "Short"} ${p.qty} hợp đồng. Đóng bao nhiêu hợp đồng?`, label: "Số hợp đồng", inputmode: "numeric", value: "1", confirmText: "Đóng",
        validate: v => { const n = parseInt(v, 10); return n >= 1 && n < p.qty ? "" : `Nhập từ 1 đến ${p.qty - 1}`; } });
      if (v == null) return;
      qty = parseInt(v, 10);
    } else if (arPrefs().confirm && !await confirmDialog({ title: `Đóng vị thế ${sym}?`, message: `Đóng toàn bộ ${p.qty} hợp đồng ${p.side > 0 ? "Long" : "Short"} bằng lệnh Market${arMk().kind === "replay" ? " (khớp ở giá mở cửa phiên sau)" : ""}.`, confirmText: "Đóng vị thế" })) return;
    const r = E.closePosition(a, sym, qty, arQuote(), arCtx(), `close-${p.id}-${qty}-${a.fills.length}`);
    AR.dirty = true; arSave(true);
    if (!r.ok) toast(r.error, "error"); else toast(r.order && r.order.status === "FILLED" ? `Đã đóng ${r.order.filled} HĐ @ ${P(r.order.avgPx)}` : "Lệnh đóng sẽ khớp ở phiên kế tiếp");
    arAfterChange(false);
  }
  async function arReverse(sym) {
    const a = arAcct(), p = E.openPos(a, sym);
    if (!p) return;
    if (!await confirmDialog({ title: "Đảo vị thế?", message: `Đóng ${p.qty} hợp đồng ${p.side > 0 ? "Long" : "Short"} và mở ${p.qty} hợp đồng ${p.side > 0 ? "Short" : "Long"} bằng một lệnh Market ${p.qty * 2} hợp đồng. Cần đủ ký quỹ cho vị thế mới.`, confirmText: "Đảo vị thế" })) return;
    const r = E.reversePosition(a, sym, arQuote(), arCtx(), `rev-${p.id}-${a.fills.length}`);
    AR.dirty = true; arSave(true);
    if (!r.ok) toast(r.error, "error"); else toast(r.order.status === "FILLED" ? "Đã đảo vị thế" : "Lệnh đảo sẽ khớp ở phiên kế tiếp");
    arAfterChange(false);
  }
  function arProtect(sym) {
    const a = arAcct(), p = E.openPos(a, sym);
    if (!p) return;
    const over = document.createElement("div");
    over.className = "modal-overlay";
    over.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ap-h"><h2 id="ap-h">Stop Loss / Take Profit · ${sym}</h2>
      <p class="text-2">${p.side > 0 ? "Long" : "Short"} ${p.qty} HĐ, giá hiện tại ${P(a.marks[sym])}. Để trống để bỏ.</p>
      <label class="field"><span class="field-label">Stop Loss (điểm)</span><input class="input" id="ap-sl" inputmode="decimal" value="${p.sl ? P(p.sl) : ""}"></label>
      <label class="field"><span class="field-label">Take Profit (điểm)</span><input class="input" id="ap-tp" inputmode="decimal" value="${p.tp ? P(p.tp) : ""}"></label>
      <p class="field-error" id="ap-err" hidden></p>
      <div class="modal-actions"><button class="btn btn-ghost" data-x="0">Hủy</button><button class="btn btn-primary" data-x="1">Lưu</button></div></div>`;
    document.body.appendChild(over);
    requestAnimationFrame(() => over.classList.add("show"));
    const close = () => { over.classList.remove("show"); setTimeout(() => over.remove(), 150); };
    over.onclick = e => {
      if (e.target === over || (e.target.closest("[data-x]") && e.target.closest("[data-x]").dataset.x === "0")) return close();
      if (!e.target.closest('[data-x="1"]')) return;
      const r = E.setProtection(a, sym, { sl: toPu(document.getElementById("ap-sl").value), tp: toPu(document.getElementById("ap-tp").value) }, arQuote(), arCtx());
      AR.dirty = true; arSave(true);
      if (!r.ok) { const er = document.getElementById("ap-err"); er.textContent = r.error; er.hidden = false; return; }
      close(); toast("Đã cập nhật SL/TP"); arPaint(true);
    };
    document.getElementById("ap-sl").focus();
  }
  async function arReset() {
    const a = arAcct();
    if (a.kind === "practice") {
      if (!await confirmDialog({ title: "Reset tài khoản demo?", message: `Tài khoản Luyện tập trở về ${vnd(E.INITIAL)}. Vị thế và lệnh chờ bị xóa; một dấu mốc reset được lưu trong sổ cái và lịch sử. Thị trường mô phỏng vẫn tiếp tục.`, confirmText: "Reset", danger: true })) return;
      const r = E.resetAccount(a, arQuote().t, arCtx());
      if (!r.ok) return toast(r.error, "error");
      a.meta = { dayEq: E.INITIAL };
      AR.dirty = true; arSave(true); toast("Đã reset tài khoản demo");
      return arTerminal(AR.slot);
    }
    if (!await confirmDialog({ title: "Chơi lại vòng này?", message: "Vòng hiện tại sẽ bị bỏ (kết quả của các vòng đã hoàn thành vẫn được giữ).", confirmText: "Chơi lại", danger: true })) return;
    const mode = a.kind, id = (a.meta || {}).challenge;
    if (mode === "replay") { const ds = arDs(); if (!ds) return toast("Không còn dữ liệu WiData trên trình duyệt", "error"); ST.startReplay(arH(), ds, { blind: arMk().blind }); }
    else if (mode === "challenge") ST.startChallenge(arH(), id);
    else ST.startCup(arH(), new Date());
    const na = arAcct(); na.meta = { ...(na.meta || {}), dayEq: E.INITIAL };
    AR.dirty = true; arSave(true); arTerminal(AR.slot);
  }

  // ---------- Clicks ----------
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-ar]");
    if (!b || !b.closest(".ta")) return;
    const act = b.dataset.ar, v = b.dataset.v, k = b.dataset.k;
    if (act === "start") return arStart(b.dataset.mode, b.dataset.id);
    if (act === "theme") { arPrefs().theme = themeAttr() === "light" ? "dark" : "light"; AR.dirty = true; arSave(true); return AR.slot ? arTerminal(AR.slot) : arLobby(); }
    if (act === "tutor") { if (typeof tutorOpen === "function") tutorOpen(); return; }
    if (act === "calc") { if (typeof calcMount === "function") calcMount(); if (typeof calcOpen === "function") calcOpen(); return; }
    if (act === "lb") { AR.lb = k; document.querySelectorAll('[data-ar="lb"]').forEach(x => x.classList.toggle("on", x.dataset.k === k)); const box = document.getElementById("ar-lb"); if (box) box.innerHTML = lbHtml(ST.isoWeek(new Date()).id); return; }
    if (act === "unlock") {
      const h = arH(), slot = v, a = h.state.accounts[slot];
      if (!a) return;
      if (a.kind === "practice") ST.startPractice(h, {});
      else if (a.kind === "challenge") ST.startChallenge(h, (a.meta || {}).challenge || slot.slice(3));
      else if (a.kind === "cup") ST.startCup(h, new Date());
      else { const ds = arDs(); if (!ds) return toast("Cần nhập lại dữ liệu WiData", "error"); ST.startReplay(h, ds, {}); }
      delete h.flags[slot];
      const na = h.state.accounts[slot]; na.meta = { ...(na.meta || {}), dayEq: E.INITIAL };
      AR.dirty = true; arSave(true); toast("Đã đặt lại ví");
      return arTerminal(slot);
    }
    if (!AR.slot) return;
    if (act === "watch") { const w = arPrefs().watch = arPrefs().watch || []; const i = w.indexOf(v); if (i >= 0) w.splice(i, 1); else w.push(v); AR.dirty = true; arSave(true); return arPaint(false); }
    if (act === "sym") { if (AR.sym === v) return; AR.sym = v; AR.cid = null; return arTerminal(AR.slot); }
    if (act === "tf") { AR.tf = v; AR.tfChosen = true; return arTerminal(AR.slot); }
    if (act === "ind") { const ind = arPrefs().ind; ind[k] = !ind[k]; AR.dirty = true; arSave(true); return arTerminal(AR.slot); }
    if (act === "subind") { const ind = arPrefs().ind; ind.sub = ind.sub === k ? "" : k; AR.dirty = true; arSave(true); return arTerminal(AR.slot); }
    if (act === "draw") {
      if (k === "x") { arPrefs().draw[AR.sym] = []; AR.dirty = true; arSave(true); AR.draw = null; AR.drawA = null; arDrawings(); document.querySelectorAll('[data-ar="draw"]').forEach(x => x.classList.remove("on")); return; }
      AR.draw = AR.draw === k ? null : k; AR.drawA = null;
      document.querySelectorAll('[data-ar="draw"]').forEach(x => x.classList.toggle("on", x.dataset.k === AR.draw));
      if (AR.draw) toast(AR.draw === "t" ? "Bấm điểm đầu của đường xu hướng trên biểu đồ" : "Bấm vào mức giá muốn kẻ đường ngang");
      return;
    }
    if (act === "tab") { AR.tab = k; document.querySelectorAll('[data-ar="tab"]').forEach(x => x.classList.toggle("on", x.dataset.k === k)); const t = document.getElementById("ta-tab"); if (t) t.innerHTML = tabHtml(k); return; }
    if (act === "mtab") { AR.mtab = k; const r = document.getElementById("ta-root"); if (r) r.dataset.mtab = k; document.querySelectorAll('[data-ar="mtab"]').forEach(x => x.classList.toggle("on", x.dataset.k === k)); if (k === "book") { const t = document.getElementById("ta-tab"); if (t) t.innerHTML = tabHtml(AR.tab); } return; }
    if (act === "range") { AR.range = v; const t = document.getElementById("ta-tab"); if (t) t.innerHTML = tabHtml("perf"); return; }
    if (act === "side" || act === "otype") {
      if (act === "side") AR.ticket.side = v; else AR.ticket.type = v;
      AR.cid = null;
      const q = arQuote(), x = q && q.q[AR.sym];
      if (x && AR.ticket.type === "LMT" && !AR.ticket.px) AR.ticket.px = P(x.mark);
      if (x && AR.ticket.type === "STP" && !AR.ticket.stop) AR.ticket.stop = P(x.mark + (AR.ticket.side === "B" ? 300 : -300));
      const t = document.getElementById("ta-ticket"); t.innerHTML = ticketHtml(); arBindTicket(); return arEstimate();
    }
    if (act === "qty" || act === "qtyset" || act === "qtymax") {
      let n = act === "qty" ? (parseInt(AR.ticket.qty, 10) || 0) + parseInt(v, 10) : act === "qtyset" ? parseInt(v, 10) : 0;
      if (act === "qtymax") {
        const a = arAcct(), q = arQuote(), s = E.SPECS[AR.sym], x = q.q[AR.sym], m = E.metrics(a);
        const px = AR.ticket.type === "LMT" ? toPu(AR.ticket.px) || x.mark : AR.ticket.type === "STP" ? toPu(AR.ticket.stop) || x.mark : E.marketPx(s, x, AR.ticket.side, 1);
        n = Math.max(0, Math.min(s.maxOrder, Math.floor(m.available / (E.imOf(s, 1, px) + s.fee))));
        const pos = E.openPos(a, AR.sym);
        if (pos && pos.side !== (AR.ticket.side === "B" ? 1 : -1)) n += pos.qty;
      }
      AR.ticket.qty = Math.max(1, Math.min(500, n)); AR.cid = null;
      const q = document.getElementById("tk-qty"); if (q) q.value = AR.ticket.qty;
      return arEstimate();
    }
    if (act === "submit") return arSubmit();
    if (act === "play") { AR.playing = !AR.playing; AR.last = performance.now(); return arPaintClock(); }
    if (act === "speed") { AR.speed = +v; return arPaintClock(); }
    if (act === "nextday") return arNextDay();
    if (act === "rnext") return arReplayNext();
    if (act === "rauto") {
      if (AR.auto) { clearInterval(AR.auto); AR.auto = null; }
      else AR.auto = setInterval(() => { const mk = arMk(); if (!mk || M.replayDone(mk) || !document.getElementById("ta-root")) { clearInterval(AR.auto); AR.auto = null; arPaintClock(); return; } arReplayNext(); }, 1400);
      return arPaintClock();
    }
    if (act === "close") return arClose(v, false);
    if (act === "part") return arClose(v, true);
    if (act === "rev") return arReverse(v);
    if (act === "prot") return arProtect(v);
    if (act === "cancel") { const r = E.cancelOrder(arAcct(), v, arQuote(), arCtx()); AR.dirty = true; arSave(true); if (!r.ok) toast(r.error, "error"); else toast(`Đã hủy ${v}`); return arPaint(true); }
    if (act === "reset") return arReset();
    if (act === "hideover") { const o = document.getElementById("ta-over"); if (o) o.hidden = true; return; }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && AR.draw) { AR.draw = null; AR.drawA = null; document.querySelectorAll('[data-ar="draw"]').forEach(x => x.classList.remove("on")); }
  });
})();

// ============================================================
// bond/ui.js — Bond Empire: The Yield War (route #/bond)
// HQ, story campaign and missions, bond terminal, yield curve lab and calculators,
// duration risk center, credit office, structured finance factory, investment
// committee, career and leaderboard. All numbers come from bond/engine.js through
// bond/market.js and bond/book.js; nothing on screen is decoration.
// ============================================================
(function () {
  "use strict";
  const E = window.BondEngine, M = window.BondMarket, K = window.BondBook, Q = window.BondMissions;
  const KEY = pid => `cfaStudy_bond_${pid}`, DATA_KEY = "cfaStudy_bond_data";
  const BE = { h: null, pid: null, sel: "GOV-33", filter: "all", tab: "pos", auto: null, lab: null, scen: "p100", riskSlot: null, cid: null, fac: null, mbs: null, lb: "free", calc: "bond" };
  const NAV = [["", "home", "HQ"], ["story", "book", "Cốt truyện"], ["terminal", "trend", "Terminal"], ["curve", "curve", "Curve Lab"], ["risk", "pulse", "Duration"],
    ["credit", "search", "Tín dụng"], ["factory", "layers", "Factory"], ["committee", "user", "Hội đồng"], ["career", "star", "Sự nghiệp"]];
  const SLOT_NAME = { free: "Giao dịch tự do", replay: "Replay lịch sử", story: "Bàn giao dịch cốt truyện", fund: "Quỹ CIO — The Yield War", cup: "Giải đấu tuần" };

  // ---------- Formatting ----------
  const pct = (x, d) => x == null || !isFinite(x) ? "—" : `${(x * 100).toFixed(d == null ? 2 : d)}%`;
  const bp = x => x == null || !isFinite(x) ? "—" : `${Math.round(x * 10000)} bp`;
  const px = (x, d) => x == null || !isFinite(x) ? "—" : x.toFixed(d == null ? 3 : d);
  const vnd = n => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;
  const mil = n => `${(n / 1e6).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tr ₫`;
  const dmy = s => s ? s.split("-").reverse().join("/") : "";
  const tone = n => n > 0 ? "up" : n < 0 ? "down" : "";
  const num = Q.num;

  // ---------- Saved game ----------
  function blank() { return { v: 1, rev: 0, progress: {}, slots: {}, prefs: {}, results: [], seen: false }; }
  function H() {
    const pid = PROFILES.active;
    if (!BE.h || BE.pid !== pid) {
      let s = null;
      try { s = JSON.parse(localStorage.getItem(KEY(pid)) || "null"); } catch (e) { s = null; }
      BE.h = s && s.v === 1 ? s : blank(); BE.pid = pid; BE.rev = BE.h.rev || 0;
      BE.flags = {};
      for (const [k, x] of Object.entries(BE.h.slots)) if (x.account && (x.account.userId !== pid || !K.verify(x.account).ok)) BE.flags[k] = true;
    }
    return BE.h;
  }
  function save() {
    const h = H();
    let cur = null;
    try { cur = JSON.parse(localStorage.getItem(KEY(BE.pid)) || "null"); } catch (e) { /* ignore */ }
    if (cur && (cur.rev || 0) !== BE.rev) { BE.h = null; H(); toast("Bond Empire vừa được cập nhật ở tab khác — đã tải bản mới nhất", "error"); return false; }
    h.rev = BE.rev + 1;
    try { localStorage.setItem(KEY(BE.pid), JSON.stringify(h)); BE.rev = h.rev; return true; }
    catch (e) { h.rev = BE.rev; toast("Không lưu được: bộ nhớ trình duyệt đầy", "error"); return false; }
  }
  const ctx = () => ({ userId: BE.pid });
  function dataset() {
    try { const raw = localStorage.getItem(DATA_KEY); if (!raw) return null; const v = M.validateCurveDataset(JSON.parse(raw)); return v.ok ? v : null; } catch (e) { return null; }
  }
  window.bondClearProfile = pid => { try { localStorage.removeItem(KEY(pid)); } catch (e) { /* ignore */ } };
  window.bondStop = function () { if (BE.auto) { clearInterval(BE.auto); BE.auto = null; } };

  // ---------- Slots: a market and an account per mode ----------
  function makeSlot(id) {
    const h = H(), pid = BE.pid;
    let market, label = SLOT_NAME[id] || id;
    if (id === "free") market = M.createSynthetic({ seed: (Date.now() % 2147483647) >>> 0 });
    else if (id === "story") market = M.createSynthetic({ seed: 777, start: "2027-01-04", script: [{ week: 999, text: "" }] });
    else if (id === "fund") market = M.createSynthetic({ seed: 7007, start: "2027-03-01", script: Q.FUND.script });
    else if (id === "cup") { const w = isoWeek(new Date()); market = M.createSynthetic({ seed: w.seed, start: "2027-06-07" }); label = `Giải đấu tuần ${w.id}`; }
    else if (id === "replay") { const ds = dataset(); if (!ds) return null; market = M.createReplay(ds, { seed: 99 }); label = ds.meta.title; }
    else if (id.startsWith("ch-")) { const c = Q.CHALLENGES.find(x => x.id === id.slice(3)); if (!c) return null; market = M.createSynthetic({ seed: c.seed, start: "2027-05-03", script: c.script || [] }); label = c.name; }
    else return null;
    const account = K.createAccount({ userId: pid, slot: id, date: market.date, label });
    const s = { market, account, hist: { dates: [market.date], px: {} } };
    recordPrices(s);
    if (id === "fund") {
      s.bench = K.createAccount({ userId: pid, slot: "bench", date: market.date, label: "Danh mục chuẩn" });
      for (const [b, q] of Q.FUND.start) { K.buy(account, { bondId: b, qty: q }, market, ctx()); K.buy(s.bench, { bondId: b, qty: q }, market, ctx()); }
      account.meta.run = { week: 0, weeks: Q.FUND.weeks, breaches: 0, maxDD: 0, redeemed: false, fireSale: false, done: false, pending: null };
    }
    if (id.startsWith("ch-") || id === "cup") account.meta.run = { week: 0, weeks: id === "cup" ? 10 : Q.CHALLENGES.find(x => x.id === id.slice(3)).weeks, breaches: 0, maxDD: 0, done: false };
    h.slots[id] = s; delete BE.flags[id];
    save();                                              // a new market is kept at once: a reload must not draw another one
    return s;
  }
  function slot(id, create) { const h = H(); return h.slots[id] || (create === false ? null : makeSlot(id)); }
  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())), day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return { id: `${y}-W${String(w).padStart(2, "0")}`, seed: y * 100 + w };
  }
  function recordPrices(s) {
    const q = M.universe(s.market);
    if (s.hist.dates[s.hist.dates.length - 1] !== s.market.date) s.hist.dates.push(s.market.date);
    const n = s.hist.dates.length;
    for (const x of q) { const a = s.hist.px[x.bond.id] = s.hist.px[x.bond.id] || []; while (a.length < n - 1) a.push(null); a[n - 1] = x.mid; }
    if (n > 104) { s.hist.dates.shift(); for (const k of Object.keys(s.hist.px)) s.hist.px[k].shift(); }
  }
  const MANDATE = { cup: { dur: [1, 7], hy: 0.3, issuer: 0.3, cash: 0 } };
  function mandateOf(id) { return id === "fund" ? Q.FUND.mandate : id.startsWith("ch-") ? Q.CHALLENGES.find(x => x.id === id.slice(3)).mandate : MANDATE[id] || null; }
  // One week of the clock: market, cash flows, scripted redemptions, mandate checks
  function advance(id, n) {
    const s = slot(id), ds = s.market.kind === "replay" ? dataset() : null, msgs = [];
    for (let i = 0; i < n; i++) {
      const run = s.account.meta.run;
      if (run && run.done) break;
      if (s.market.kind === "replay" && (!ds || M.replayDone(s.market))) break;
      const newsBefore = s.market.news.length;
      const w = M.step(s.market, ds);
      if (!w) break;
      const paid = K.settle(s.account, s.market, w.from, w.to);
      if (s.bench) K.settle(s.bench, s.market, w.from, w.to);
      for (const p of paid) msgs.push(`${p.type === "COUPON" ? "Coupon" : p.type === "PRINCIPAL" ? "Hoàn gốc" : "Thu hồi sau vỡ nợ"} ${p.id}: ${vnd(p.amount)}`);
      for (const nw of s.market.news.slice(newsBefore)) msgs.push(nw.text);
      if (id === "fund") fundWeek(s, msgs);
      recordPrices(s);
      K.snapshot(s.account, s.market);
      if (run) {
        run.week = s.market.week;
        const mand = mandateOf(id);
        if (mand) run.breaches += Q.mandateBreaches(s.account, s.market, mand).length;
        const perf = K.performance(s.account, s.market);
        run.maxDD = perf.maxDD;
        if (s.market.week >= run.weeks) finishRun(id, s);
      }
    }
    save();
    return msgs;
  }
  function fundWeek(s, msgs) {
    const run = s.account.meta.run, ev = Q.FUND.script.find(e => e.week === s.market.week && e.redeem);
    if (ev) { run.pending = { amount: Math.round(K.risk(s.account, s.market).nav * ev.redeem), bench: Math.round(K.risk(s.bench, s.market).nav * ev.redeem), due: s.market.week + 1 }; msgs.push(`Yêu cầu rút vốn ${vnd(run.pending.amount)}: chi trả khi sang tuần ${run.pending.due}`); }
    if (run.pending && s.market.week >= run.pending.due) {
      let r = K.redeem(s.account, run.pending.amount, s.market.date, "Khách hàng tổ chức rút 20% vốn", ctx());
      if (!r.ok) { K.raiseCash(s.account, s.market, run.pending.amount, ctx(), 1.0); run.fireSale = true; r = K.redeem(s.account, run.pending.amount, s.market.date, "Khách hàng tổ chức rút 20% vốn (sau bán tháo)", ctx()); msgs.push("Không đủ tiền mặt: quỹ phải bán tháo trái phiếu (giá bid trừ 1 điểm) để chi trả"); }
      K.raiseCash(s.bench, s.market, run.pending.bench, ctx(), 0); K.redeem(s.bench, Math.min(run.pending.bench, K.cash(s.bench)), s.market.date, "Rút vốn (danh mục chuẩn)", ctx());
      run.redeemed = r.ok; run.pending = null;
    }
  }
  function finishRun(id, s) {
    const run = s.account.meta.run;
    if (run.done) return;
    const perf = K.performance(s.account, s.market);
    run.done = true; run.ret = perf.ret; run.maxDD = perf.maxDD;
    if (s.bench) run.benchRet = K.performance(s.bench, s.market).ret;
    const h = H();
    let passed = null, name = SLOT_NAME[id] || id;
    if (id.startsWith("ch-")) { const c = Q.CHALLENGES.find(x => x.id === id.slice(3)); name = c.name; passed = run.ret >= c.target && run.maxDD <= c.maxDD && run.breaches <= 1; }
    h.results.push({ slot: id, name, ret: run.ret, maxDD: run.maxDD, breaches: run.breaches, passed, at: new Date().toISOString(), week: id === "cup" ? isoWeek(new Date()).id : null, ok: !BE.flags[id] });
    if (h.results.length > 100) h.results.shift();
  }

  // ---------- Shell ----------
  function shell(page, head, body) {
    const L = Q.level(H().progress, endingScore());
    view.innerHTML = `<div class="be" id="be-root"><nav class="be-rail" aria-label="Bond Empire">
        <a class="be-logo" href="#/bond" title="Bond Empire">${logo()}</a>
        ${NAV.map(([p, ic, l]) => `<a class="be-nav ${page === p || (p && page.startsWith(p)) ? "on" : ""}" href="#/bond${p ? "/" + p : ""}"><span>${icon(ic, 18)}</span><em>${l}</em></a>`).join("")}
        <button type="button" class="be-nav be-exit" data-be="calcopen" title="Máy tính BA II Plus"><span>${icon("calc", 18)}</span><em>BA II Plus</em></button>
        <a class="be-nav" href="#/trading/derivatives" title="Về Trading Arena"><span>${icon("back", 18)}</span><em>Thoát</em></a>
      </nav><main class="be-main"><header class="be-head"><div>${head}</div><a class="be-me" href="#/bond/career" title="Sự nghiệp"><b>Cấp ${L.lv}</b><span>${esc(L.name)}</span><i style="width:${Math.round(L.progress * 100)}%"></i></a></header>${body}</main></div>`;
  }
  const hd = (kicker, title, sub) => `<p class="be-kicker">${kicker}</p><h1>${title}</h1>${sub ? `<p class="be-sub">${sub}</p>` : ""}`;
  function logo() { return `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#0A1324"/><path d="M9 28c5-1 8-5 11-11s6-8 11-8" fill="none" stroke="#C9A55A" stroke-width="2.6" stroke-linecap="round"/><path d="M9 31h22" stroke="#1FA97A" stroke-width="2.2" stroke-linecap="round"/><circle cx="31" cy="9" r="3" fill="#C9A55A"/></svg>`; }
  function endingScore() { const p = H().progress["c7-fund"]; return p && p.total != null ? p.total : 0; }
  const chip = (t, cls, title) => `<span class="be-chip ${cls || ""}" ${title ? `title="${esc(title)}"` : ""}>${t}</span>`;
  function dataChip(s) {
    return s.market.kind === "replay" ? chip("TPCP THẬT (WiData) · tín dụng mô phỏng", "blue", "Đường cong lợi suất TPCP lấy từ dữ liệu WiData bạn nhập, theo tuần; spread doanh nghiệp, vỡ nợ và tin tức là mô phỏng")
      : chip("MÔ PHỎNG", "amber", "Lãi suất, spread, vỡ nợ và tin tức do mô hình tạo ra; các tổ chức phát hành là hư cấu");
  }
  function bar(v, max, cls) { return `<span class="be-bar ${cls || ""}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span>`; }

  // ---------- Entry ----------
  window.renderBond = function (a, b, c) {
    document.body.classList.add("be-mode");
    window.bondStop();
    if (!E || !M || !K || !Q) { view.innerHTML = `<div class="callout danger">Không tải được Bond Empire. Hãy tải lại trang.</div>`; return; }
    H();
    if (!a) return hq();
    if (a === "story") return story();
    if (a === "m") return mission(b);
    if (a === "terminal") return terminal(b || "free");
    if (a === "curve") return curveLab();
    if (a === "risk") return riskCenter(b);
    if (a === "credit") return creditOffice();
    if (a === "factory") return factory();
    if (a === "committee") return committee(null);
    if (a === "career") return career();
    hq();
  };

  // ================= HQ =================
  function hq() {
    const h = H(), L = Q.level(h.progress, endingScore()), next = Q.MISSIONS.find(m => !(h.progress[m.id] && h.progress[m.id].passed) && Q.chapterOpen(h.progress, m.ch));
    const free = slot("free", false), news = free ? free.market.news.slice(-6).reverse() : [];
    const done = Q.MISSIONS.filter(m => h.progress[m.id] && h.progress[m.id].passed).length;
    const modeCard = (href, ic, cls, t, d, extra) => `<a class="be-mode-card" href="${href}"><span class="be-ico ${cls}">${icon(ic, 20)}</span><b>${t}</b><p>${d}</p>${extra || ""}</a>`;
    const ds = dataset(), freeNav = free ? K.risk(free.account, free.market).nav : null;
    shell("", hd("Bond Empire · The Yield War", "Trụ sở Aurora Capital", "Trò chơi chiến lược trái phiếu theo CFA Level I Fixed Income (19 module). Tiền ảo, tổ chức phát hành hư cấu, mọi phép tính từ engine."),
      `${!h.seen ? `<section class="be-card be-welcome"><div><p class="be-kicker">Chào mừng</p><h2>Từ Junior Analyst tới người sáng lập quỹ</h2>
          <p>Bạn bắt đầu với 100.000.000 ₫ tiền ảo, một danh mục trống và chức danh Junior Fixed Income Analyst tại Aurora Capital (hư cấu). Đọc điều khoản, định giá, giao dịch, đo rủi ro, điều tra tín dụng, chứng khoán hóa — và cuối cùng điều hành một quỹ giữa khủng hoảng.</p>
          <p class="be-muted">Không có giao dịch tiền thật. Dữ liệu mô phỏng luôn ghi "MÔ PHỎNG"; dữ liệu thật (WiData) chỉ dùng khi bạn tự nhập.</p></div>
          <button type="button" class="be-btn gold" data-be="seen">Bắt đầu sự nghiệp</button></section>` : ""}
      <section class="be-grid3">
        <div class="be-card be-player"><p class="be-kicker">Hồ sơ</p><h2>${esc(activeProfile().name)}</h2><p class="be-rank">Cấp ${L.lv} · ${esc(L.name)}</p>
          <div class="be-xp">${bar(L.progress, 1, "gold")}<span>${L.xp} XP${L.next ? ` · cấp sau ${L.next.xp} XP${L.next.ch ? ` và hoàn thành chương ${L.next.lv >= 7 ? L.next.ch - 1 : L.next.ch}` : ""}` : ""}</span></div>
          <p class="be-muted">${done}/${Q.MISSIONS.length} nhiệm vụ đã đạt</p></div>
        <div class="be-card"><p class="be-kicker">Nhiệm vụ tiếp theo</p>${next ? `<h2>${esc(next.title)}</h2><p class="be-muted">Chương ${next.ch} · ${esc(next.lm)}</p><p>${esc(next.brief.slice(0, 170))}…</p><a class="be-btn gold" href="#/bond/m/${next.id}">Nhận nhiệm vụ</a>` : `<h2>Bạn đã hoàn thành chiến dịch</h2><a class="be-btn" href="#/bond/career">Xem sự nghiệp</a>`}</div>
        <div class="be-card"><p class="be-kicker">Tin thị trường ${free ? "(mô phỏng)" : ""}</p>${news.length ? `<ul class="be-news">${news.map(n => `<li class="${n.kind}"><time>${dmy(n.date)}</time>${esc(n.text)}</li>`).join("")}</ul>` : `<p class="be-muted">Mở Terminal và chạy đồng hồ thị trường để nhận tin.</p>`}</div>
      </section>
      <h2 class="be-h2">Chế độ chơi</h2>
      <section class="be-modes">
        ${modeCard("#/bond/story", "book", "gold", "Cốt truyện", "7 chương, 25 nhiệm vụ hành động, phủ 19 Learning Module.")}
        ${modeCard("#/bond/terminal/free", "trend", "green", "Giao dịch tự do", "100 triệu ₫ ảo trên thị trường mô phỏng, không giới hạn thời gian.", freeNav != null ? `<span class="be-tag">${mil(freeNav)}</span>` : "")}
        ${modeCard(ds ? "#/bond/terminal/replay" : "#/bond/career", "calendar", "blue", "Replay lịch sử", ds ? `Đường cong TPCP thật từng tuần (${ds.points.length} tuần), không thấy tương lai.` : "Nhập dữ liệu đường cong TPCP từ WiData ở trang Sự nghiệp → Dữ liệu.")}
        ${modeCard("#/bond/career", "target", "red", "Thử thách danh mục", `${Q.CHALLENGES.length} nhiệm vụ quản lý quỹ có mục tiêu và giới hạn rủi ro.`)}
        ${modeCard("#/bond/terminal/cup", "star", "violet", "Giải đấu tuần", "Cùng một thị trường cho mọi người trong tuần; bảng xếp hạng trên thiết bị này.")}
      </section>
      <h2 class="be-h2">Công cụ</h2>
      <section class="be-tools">${[["terminal", "trend", "Bond Terminal", "Tìm, định giá, mua bán, coupon, đáo hạn"], ["curve", "curve", "Yield Curve Lab", "Par, spot, forward; dịch chuyển đường cong; máy tính"], ["risk", "pulse", "Duration Risk Center", "Duration, convexity, PVBP, key rate; cú sốc"],
        ["credit", "search", "Credit Office", "Theo dõi tổ chức phát hành; điều tra; thu hồi"], ["factory", "layers", "Structured Finance Factory", "ABS, MBS, CMO, thác thanh toán"], ["committee", "user", "Investment Committee", "Bảo vệ một vị thế trước Hội đồng"]]
        .map(([p, ic, t, d]) => `<a class="be-tool" href="#/bond/${p}"><span>${icon(ic, 18)}</span><b>${t}</b><small>${d}</small></a>`).join("")}</section>`);
  }

  // ================= STORY =================
  function story() {
    const h = H();
    shell("story", hd("Story Campaign", "Bảy chương của The Yield War", "Mỗi chương mở khi chương trước đạt hết nhiệm vụ (điểm ≥ 60%). XP tính theo điểm cao nhất của từng nhiệm vụ."),
      `<section class="be-chapters">${Q.CHAPTERS.map(c => {
        const open = Q.chapterOpen(h.progress, c.n), done = Q.chapterDone(h.progress, c.n);
        return `<article class="be-card be-ch ${open ? "" : "locked"} ${done ? "done" : ""}"><header><span class="be-chn">${c.n}</span><div><p class="be-kicker">${c.lms}</p><h2>${esc(c.title)}</h2><p class="be-muted">${esc(c.vi)}</p></div>${done ? chip("Hoàn thành", "green") : open ? "" : chip("Khóa", "")}</header>
          <p>${esc(c.story)}</p><ol class="be-ml">${c.missions.map(id => { const m = Q.missionById(id), p = h.progress[id];
            return `<li class="${p && p.passed ? "ok" : ""}"><a ${open ? `href="#/bond/m/${id}"` : `aria-disabled="true"`}><b>${esc(m.title)}</b><span>${esc(m.lm)} · ${typeLabel(m.type)} · ${m.xp} XP</span>${p ? `<em>${Math.round(p.best * 100)}%</em>` : ""}</a></li>`; }).join("")}</ol></article>`;
      }).join("")}</section>`);
  }
  const typeLabel = t => ({ compute: "Tính toán", tag: "Phân loại", choose: "Lựa chọn", auction: "Đấu thầu", desk: "Giao dịch", detective: "Điều tra", factory: "Thiết kế", committee: "Hội đồng" }[t] || t);

  // ================= MISSION =================
  function mission(id) {
    const m = Q.missionById(id), h = H();
    if (!m) return story();
    if (!Q.chapterOpen(h.progress, m.ch)) { toast("Chương này chưa mở", "error"); return story(); }
    const d = m.data(), p = h.progress[id];
    if (m.setup === "inherit" && !(p && p.setupDone)) {                 // the hand-over portfolio of chapter 5
      const s = slot("story");
      K.transferIn(s.account, "LCL-27S", 150, s.market, ctx(), "Bàn giao từ đồng nghiệp"); K.transferIn(s.account, "SRR-28", 200, s.market, ctx(), "Bàn giao từ đồng nghiệp");
      h.progress[id] = { ...(p || {}), setupDone: true }; save();
    }
    BE.mid = id; BE.md = d; BE.ans = {};
    shell("story", hd(`Chương ${m.ch} · ${esc(m.lm)} · ${typeLabel(m.type)}`, esc(m.title), ""),
      `<section class="be-card be-brief"><p>${esc(m.brief)}</p>${p ? `<p class="be-muted">Điểm cao nhất ${Math.round(p.best * 100)}% · ${p.tries || 0} lần nộp</p>` : ""}</section>
      <form class="be-card be-form" id="be-mform" autocomplete="off">${missionBody(m, d)}<div class="be-actions"><button type="submit" class="be-btn gold">${m.type === "desk" ? "Kiểm tra kết quả" : "Nộp bài"}</button><a class="be-btn ghost" href="#/bond/story">Về danh sách</a></div></form>
      <section id="be-result"></section>`);
    const f = document.getElementById("be-mform");
    f.onsubmit = e => { e.preventDefault(); submitMission(m, d, f); };
    if (m.type === "factory") bindFactoryMission(m);
  }
  function givens(d) { return d.givens ? `<dl class="be-givens">${d.givens.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""; }
  function missionBody(m, d) {
    if (m.type === "compute") return `${givens(d)}<div class="be-inputs">${d.inputs.map(f => `<label class="be-f"><span>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</span><input name="${f.key}" ${f.kind === "date" ? 'placeholder="YYYY-MM-DD"' : 'inputmode="decimal" placeholder="nhập số"'}></label>`).join("")}</div>
      ${d.choice ? choiceHtml(d.choice) : ""}<p class="be-muted">Dùng Curve Lab → Máy tính Fixed Income nếu cần. Dấu thập phân: chấm hoặc phẩy.</p>`;
    if (m.type === "tag") return `<div class="be-tags">${d.items.map((t, i) => `<div class="be-tagrow"><p>${esc(t)}</p><select name="t${i}"><option value="">— chọn nhóm —</option>${d.cats.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>`).join("")}</div>`;
    if (m.type === "choose") return `<p class="be-muted">Tiêu chí: ${d.rules.map(r => esc(r[1])).join(" · ")}</p><div class="be-offers">${d.offers.map(o => `<div class="be-offer"><h3>${esc(o.name)}</h3>
        <dl class="be-givens"><div><dt>Hạng</dt><dd>${o.rating}</dd></div><div><dt>Kỳ hạn còn lại</dt><dd>${o.years} năm</dd></div><div><dt>Lãi suất</dt><dd>${o.type}</dd></div><div><dt>Bảo đảm</dt><dd>${o.seniority}</dd></div><div><dt>Giá sạch</dt><dd>${o.price}</dd></div></dl>
        <p class="be-muted">Vi phạm tiêu chí nào?</p>${d.rules.map(([k, l]) => `<label class="be-check"><input type="checkbox" name="br-${o.id}-${k}"> ${esc(l)}</label>`).join("")}
        <label class="be-pick"><input type="radio" name="pick" value="${o.id}"> Chọn sản phẩm này</label></div>`).join("")}</div>`;
    if (m.type === "auction") return `<dl class="be-givens"><div><dt>Gọi thầu</dt><dd>${d.offered.toLocaleString("vi-VN")} tỷ ₫, trái phiếu 5 năm</dd></div><div><dt>Phương thức</dt><dd>Một giá (single-price / Dutch)</dd></div><div><dt>Khách hàng</dt><dd>cần ≥ ${d.need} tỷ, tối đa ${d.maxAmount} tỷ</dd></div><div><dt>Lợi suất thứ cấp tham khảo</dt><dd>khoảng 4,0% – 4,1%</dd></div></dl>
      <div class="be-inputs"><label class="be-f"><span>Lãi suất đặt thầu (%)</span><input name="yield" inputmode="decimal" placeholder="vd 4.02"></label><label class="be-f"><span>Khối lượng (tỷ ₫)</span><input name="amount" inputmode="decimal" placeholder="vd 300"></label></div>`;
    if (m.type === "desk") return deskBody(m, d);
    if (m.type === "detective") return detectiveBody(d);
    if (m.type === "factory") return m.mode === "abs" ? `<p class="be-muted">Pool: 1.000 tỷ ₫, lãi suất 11%, 48 tháng, trả trước CPR 6%, thu hồi 40%, phí dịch vụ 0,5%. Coupon: Senior 5,5% · Mezzanine 8,5% · Equity nhận phần còn lại.</p>
        <div class="be-inputs"><label class="be-f"><span>Senior (tỷ ₫)</span><input name="s" inputmode="decimal" value="800"></label><label class="be-f"><span>Mezzanine (tỷ ₫)</span><input name="m" inputmode="decimal" value="150"></label><label class="be-f"><span>Equity (tỷ ₫)</span><input name="e" inputmode="decimal" value="50"></label></div>
        <label class="be-f"><span>Thử kịch bản CDR (%/năm) trước khi nộp</span><input type="range" min="0" max="20" step="0.5" value="8" id="fm-cdr"></label><div id="fm-out"></div>`
      : `<p class="be-muted">Pool: 500 tỷ ₫, lãi suất 8%, nhà đầu tư nhận 7,5%, 30 năm, tốc độ trả trước 150 PSA. Trả gốc tuần tự A → B → C.</p>
        <div class="be-inputs"><label class="be-f"><span>Lớp A (tỷ ₫)</span><input name="a" inputmode="decimal" value="200"></label><label class="be-f"><span>Lớp B (tỷ ₫)</span><input name="b" inputmode="decimal" value="200"></label><label class="be-f"><span>Lớp C (tỷ ₫)</span><input name="c" inputmode="decimal" value="100"></label></div><div id="fm-out"></div>`;
    if (m.type === "committee") return committeeForm(slot("story").market);
    return "";
  }
  const choiceHtml = c => `<fieldset class="be-choice"><legend>${esc(c.q)}</legend>${c.options.map(([k, l]) => `<label><input type="radio" name="choice" value="${k}"> ${esc(l)}</label>`).join("")}</fieldset>`;
  function deskBody(m, d) {
    if (m.desk === "fund") {
      const s = slot("fund"), run = s.account.meta.run, r = K.risk(s.account, s.market);
      return `<dl class="be-givens"><div><dt>Tuần</dt><dd>${run.week}/${run.weeks}${run.done ? " · đã kết thúc" : ""}</dd></div><div><dt>NAV</dt><dd>${mil(r.nav)}</dd></div><div><dt>Duration (NAV)</dt><dd>${r.durNav.toFixed(2)}</dd></div><div><dt>Lợi suất cao</dt><dd>${pct(r.hy, 1)}</dd></div><div><dt>Vi phạm (tích lũy)</dt><dd>${run.breaches}</dd></div></dl>
        <p><a class="be-btn" href="#/bond/terminal/fund">Mở Terminal của quỹ</a> <a class="be-btn ghost" href="#/bond/risk/fund">Duration Center của quỹ</a></p>
        <p class="be-muted">Hạn mức: duration 2–6 năm · lợi suất cao ≤ 15% NAV · mỗi tổ chức phát hành ≤ 25% · tiền mặt ≥ 3%. Chạy đủ 12 tuần trong Terminal rồi bấm Kiểm tra.</p>`;
    }
    const s = slot("story"), r = K.risk(s.account, s.market);
    return `<dl class="be-givens"><div><dt>Tài khoản cốt truyện</dt><dd>NAV ${mil(r.nav)} · tiền mặt ${mil(r.cash)}</dd></div><div><dt>Duration (NAV)</dt><dd>${r.durNav.toFixed(2)} năm</dd></div><div><dt>Đã đầu tư</dt><dd>${pct(1 - r.cashPct, 1)}</dd></div><div><dt>Lợi suất cao</dt><dd>${pct(r.hy, 1)} NAV</dd></div></dl>
      <p><a class="be-btn" href="#/bond/terminal/story">Mở Terminal (chế độ cốt truyện)</a> <a class="be-btn ghost" href="#/bond/risk/story">Duration Center</a></p>
      ${m.id === "c4-defense" ? `<label class="be-f"><span>Dự báo thay đổi giá trị danh mục khi lợi suất tăng 150 bp (₫, số âm nếu lỗ)</span><input name="guess" inputmode="decimal" placeholder="vd -5000000"></label><p class="be-muted">Kiểm tra sẽ áp cú sốc lên danh mục hiện tại (định giá lại đầy đủ, spread giữ nguyên).</p>` : ""}
      <p class="be-muted">Thị trường cốt truyện đứng yên trong lúc làm nhiệm vụ: giá không đổi cho tới khi bạn kiểm tra.</p>`;
  }
  function detectiveBody(c) {
    const f = c.fs, row = (k, l) => `<tr><th>${l}</th>${f[k].map(v => `<td class="n">${v.toLocaleString("vi-VN")}</td>`).join("")}</tr>`;
    return `<div class="be-case"><div class="be-docs">
      <details open><summary>${esc(c.docs[0].title)}</summary><table class="be-t"><thead><tr><th></th>${c.years.map(y => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
        ${row("revenue", "Doanh thu")}${row("ebitda", "EBITDA")}${row("interest", "Chi phí lãi vay")}${row("debt", "Tổng nợ vay")}${row("cash", "Tiền mặt")}${row("equity", "Vốn chủ sở hữu")}${row("cfo", "Dòng tiền kinh doanh")}${row("inventory", "Hàng tồn kho (quỹ đất)")}</tbody></table></details>
      <details><summary>Lịch đáo hạn nợ (tỷ ₫)</summary><table class="be-t">${c.maturities.map(m => `<tr><th>${m[0]}</th><td class="n">${m[1].toLocaleString("vi-VN")}</td><td>${esc(m[2])}</td></tr>`).join("")}</table></details>
      ${c.docs.slice(1).map(d => `<details><summary>${esc(d.title)}</summary><p>${esc(d.text)}</p></details>`).join("")}
      </div><div class="be-evidence"><h3>Bảng bằng chứng</h3><p class="be-muted">Ghim những điều thật sự là dấu hiệu rủi ro. Ghim nhầm cũng bị trừ điểm.</p>
        ${c.facts.map(([k, t]) => `<label class="be-check"><input type="checkbox" name="pin-${k}"> ${esc(t)}</label>`).join("")}</div></div>
      <h3>Phân tích</h3><div class="be-inputs"><label class="be-f"><span>EBITDA / lãi vay 2026 (lần)</span><input name="coverage" inputmode="decimal"></label><label class="be-f"><span>Nợ vay / EBITDA 2026 (lần)</span><input name="lev" inputmode="decimal"></label>
        <label class="be-f"><span>Tỷ lệ thu hồi LCL 11% 2029 có bảo đảm (%)</span><input name="rrSec" inputmode="decimal"></label><label class="be-f"><span>Tỷ lệ thu hồi LCL thứ cấp 2027 (%)</span><input name="rrSub" inputmode="decimal"></label></div>
      <p class="be-muted">Kịch bản vỡ nợ: giá trị thanh lý toàn bộ tài sản 6.000 tỷ ₫, trong đó tài sản bảo đảm cho LCL 2029 là 2.100 tỷ. Nghĩa vụ: LCL 2029 có bảo đảm 2.500 · nợ không bảo đảm khác 8.900 · LCL thứ cấp 1.500.</p>
      <h3>Đề xuất</h3><div class="be-inputs">
        <label class="be-f"><span>LCL 11% 2029 (có bảo đảm)</span><select name="sec"><option value="">—</option><option value="buy">Mua thêm</option><option value="hold">Giữ</option><option value="sell">Bán</option></select></label>
        <label class="be-f"><span>LCL thứ cấp 13% 2027</span><select name="sub"><option value="">—</option><option value="buy">Mua thêm</option><option value="hold">Giữ</option><option value="sell">Bán</option></select></label>
        <label class="be-f"><span>Xác suất vỡ nợ 12 tháng</span><select name="pd"><option value="">—</option><option value="low">Thấp</option><option value="mid">Trung bình</option><option value="high">Cao</option></select></label>
        <label class="be-f"><span>Hạn mức cho tổ chức này</span><select name="limit"><option value="">—</option><option value="keep">Giữ nguyên</option><option value="cut">Cắt giảm</option><option value="zero">Đưa về 0</option></select></label></div>`;
  }
  function readForm(m, f) {
    const fd = new FormData(f), a = {};
    if (m.type === "tag") { BE.md.items.forEach((_, i) => { a[i] = fd.get(`t${i}`) || ""; }); return a; }
    if (m.type === "choose") { a.pick = fd.get("pick"); a.breaks = {}; for (const o of BE.md.offers) { a.breaks[o.id] = {}; for (const [r] of BE.md.rules) a.breaks[o.id][r] = fd.get(`br-${o.id}-${r}`) === "on"; } return a; }
    if (m.type === "detective") { a.pins = {}; for (const [k] of BE.md.facts) a.pins[k] = fd.get(`pin-${k}`) === "on"; ["coverage", "lev", "rrSec", "rrSub", "sec", "sub", "pd", "limit"].forEach(k => { a[k] = fd.get(k); }); return a; }
    if (m.type === "committee") return committeeRead(fd);
    for (const [k, v] of fd.entries()) a[k] = v;
    return a;
  }
  function submitMission(m, d, f) {
    const h = H(), ans = readForm(m, f);
    const c = m.type === "desk" ? (m.desk === "fund" ? { ...slot("fund") } : { ...slot("story") }) : m.type === "committee" ? { market: slot("story").market } : {};
    const r = m.check(ans, d, c);
    const p = h.progress[m.id] || {};
    const before = Q.level(h.progress, endingScore()), xpBefore = Q.xpOf(h.progress);
    p.tries = (p.tries || 0) + 1; p.last = r.score; p.best = Math.max(p.best || 0, r.score); p.passed = !!(p.passed || r.pass); p.at = new Date().toISOString();
    if (r.total != null) p.total = Math.max(p.total || 0, r.total);
    p.parts = r.parts;
    h.progress[m.id] = p;
    if (m.id === "c5-derisk" && r.pass) {                                  // the storm breaks
      const s = slot("story");
      if (!s.market.issuers.LCL.defaulted) { M.defaultIssuer(s.market, "LCL"); M.news(s.market, "Thị trường hoảng loạn sau vụ vỡ nợ của Lotus Crest Land", "default"); }
    }
    save();
    const after = Q.level(h.progress, endingScore());
    document.getElementById("be-result").innerHTML = resultHtml(r, m, after.lv > before.lv ? after : null, Math.max(0, Q.xpOf(h.progress) - xpBefore));
    document.getElementById("be-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resultHtml(r, m, up, xp) {
    return `<section class="be-card be-res ${r.pass ? "pass" : "fail"}"><header><div><p class="be-kicker">${r.pass ? "Đạt" : "Chưa đạt"} · cần 60%</p><h2>${Math.round(r.score * 100)}%</h2></div>${xp ? chip(`+${xp} XP`, "gold") : ""}${up ? chip(`Lên cấp ${up.lv}: ${esc(up.name)}`, "green") : ""}</header>
      <div class="be-parts">${Object.entries(r.parts).filter(([, v]) => v != null).map(([k, v]) => `<div><span>${Q.PARTS[k]}</span>${bar(v, 1, v >= 0.6 ? "green" : "red")}<b>${Math.round(v * 100)}%</b></div>`).join("")}</div>
      <ul class="be-fb">${r.feedback.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      ${r.questions ? `<h3>Hội đồng chất vấn</h3><ol class="be-fb">${r.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol>` : ""}
      ${r.pass && m ? nextLink(m) : ""}</section>`;
  }
  function nextLink(m) { const i = Q.MISSIONS.indexOf(m), n = Q.MISSIONS[i + 1]; return n ? `<p><a class="be-btn gold" href="#/bond/m/${n.id}">Nhiệm vụ tiếp: ${esc(n.title)}</a></p>` : `<p><a class="be-btn gold" href="#/bond/career">Xem sự nghiệp</a></p>`; }

  // ================= TERMINAL =================
  function terminal(id) {
    if (id === "replay" && !dataset()) { toast("Chưa có dữ liệu đường cong — nhập ở trang Sự nghiệp", "error"); return career(); }
    if (BE.flags[id]) return locked(id);
    const s = slot(id);
    if (!s) return hq();
    BE.slot = id;
    const run = s.account.meta.run;
    shell("terminal", `<p class="be-kicker">Bond Terminal · ${esc(s.account.label || SLOT_NAME[id] || id)}</p><h1>${dmy(s.market.date)} <small>tuần ${s.market.week}${run ? `/${run.weeks}` : ""}</small></h1>`,
      `<div class="be-term">
        <section class="be-bar-top" id="bt-top"></section>
        <section class="be-card be-mkt"><div class="be-mkt-h"><div class="be-seg">${[["all", "Tất cả"], ["gov", "Chính phủ"], ["ig", "Hạng đầu tư"], ["hy", "Lợi suất cao"]].map(([k, l]) => `<button type="button" data-be="filter" data-v="${k}" class="${BE.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <input class="be-search" id="bt-q" placeholder="Tìm mã, tổ chức phát hành…" aria-label="Tìm trái phiếu"></div><div id="bt-list"></div></section>
        <section class="be-card be-detail" id="bt-detail"></section>
        <section class="be-card be-ticket" id="bt-ticket"></section>
        <section class="be-card be-book"><div class="be-tabs">${[["pos", "Danh mục"], ["ledger", "Sổ cái"], ["trades", "Giao dịch"], ["risk", "Rủi ro"], ["news", "Tin tức"]].map(([k, l]) => `<button type="button" data-be="tab" data-v="${k}" class="${BE.tab === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="bt-tab"></div></section>
      </div>`);
    const q = document.getElementById("bt-q");
    q.oninput = () => paintList();
    paintTerminal(true);
  }
  function locked(id) {
    shell("terminal", hd("Tài khoản bị khóa", "Dữ liệu tài khoản này đã bị sửa ngoài trò chơi", ""), `<section class="be-card"><p>Sổ cái không khớp chuỗi băm hoặc số dư ban đầu. Số liệu bị sửa không được công nhận.</p><button type="button" class="be-btn gold" data-be="resetslot" data-v="${esc(id)}">Đặt lại tài khoản này</button></section>`);
  }
  function paintTerminal(full) {
    const s = slot(BE.slot), m = s.market, a = s.account, r = K.risk(a, m), perf = K.performance(a, m), run = a.meta.run;
    const top = document.getElementById("bt-top");
    if (!top) return;
    const done = (run && run.done) || (m.kind === "replay" && M.replayDone(m)) || BE.slot === "story";
    top.innerHTML = `<div class="be-stats"><div><span>NAV</span><b>${mil(r.nav)}</b></div><div><span>Tiền mặt</span><b>${mil(r.cash)}</b></div><div><span>Lợi nhuận</span><b class="${tone(perf.ret)}">${pct(perf.ret)}</b></div>
        <div><span>Duration (NAV)</span><b>${r.durNav.toFixed(2)}</b></div><div><span>PVBP</span><b>${vnd(r.pvbp)}</b></div><div><span>Lãi coupon nhận</span><b>${mil(perf.income)}</b></div></div>
      <div class="be-clock">${dataChip(s)}<span class="be-muted">Chính sách ${pct(m.macro.policy)} · lạm phát ${pct(m.macro.inflation, 1)}${m.kind === "replay" ? " (mô phỏng)" : ""}</span>
        ${BE.slot === "story" ? `<span class="be-muted">Thị trường cốt truyện đứng yên trong lúc làm nhiệm vụ</span>` : ""}
        <button type="button" class="be-btn sm" data-be="step" data-v="1" ${done ? "disabled" : ""}>${icon("next", 14)} 1 tuần</button><button type="button" class="be-btn sm ghost" data-be="step" data-v="4" ${done ? "disabled" : ""}>4 tuần</button>
        <button type="button" class="be-btn sm ghost" data-be="auto" ${done ? "disabled" : ""}>${BE.auto ? icon("stop", 14) + " Dừng" : icon("play", 14) + " Chạy"}</button>
        ${BE.slot === "free" ? `<button type="button" class="be-btn sm ghost" data-be="resetslot" data-v="free">${icon("trash", 14)} Reset</button>` : ""}</div>
      ${run && run.done ? runSummary(s) : ""}${m.kind === "replay" && M.replayDone(m) ? `<p class="be-note">Hết dữ liệu: vòng Replay kết thúc ở ${dmy(m.date)}. Lợi nhuận ${pct(perf.ret)}.</p>` : ""}
      ${BE.slot === "fund" && run && run.pending ? `<p class="be-note red">Yêu cầu rút vốn ${vnd(run.pending.amount)} đến hạn khi sang tuần ${run.pending.due}. Tiền mặt hiện có ${vnd(r.cash)}.</p>` : ""}
      ${mandateOf(BE.slot) ? mandateLine(s) : ""}`;
    paintList(); paintDetail();
    if (full || !document.getElementById("bt-ticket").contains(document.activeElement)) paintTicket();
    paintTab();
  }
  function mandateLine(s) {
    const br = Q.mandateBreaches(s.account, s.market, mandateOf(BE.slot));
    return `<p class="be-note ${br.length ? "red" : "green"}">${br.length ? "Vi phạm hạn mức: " + br.map(esc).join(" · ") : "Đang tuân thủ mọi hạn mức"}</p>`;
  }
  function runSummary(s) {
    const run = s.account.meta.run;
    if (BE.slot === "fund") { const sc = Q.fundScore(run); return `<p class="be-note gold">Kết thúc 12 tuần — ${esc(sc.ending[1])}: ${esc(sc.ending[2])} (điểm ${Math.round(sc.total)}). <a href="#/bond/m/c7-fund">Nộp nhiệm vụ</a></p>`; }
    const c = BE.slot.startsWith("ch-") ? Q.CHALLENGES.find(x => x.id === BE.slot.slice(3)) : null;
    const pass = c ? run.ret >= c.target && run.maxDD <= c.maxDD && run.breaches <= 1 : null;
    return `<p class="be-note ${pass === false ? "red" : "gold"}">Kết thúc: lợi nhuận ${pct(run.ret)} · sụt giảm tối đa ${pct(run.maxDD)} · vi phạm ${run.breaches}${c ? ` · ${pass ? "ĐẠT thử thách" : "CHƯA ĐẠT"}` : ""}. <button type="button" class="be-btn sm ghost" data-be="resetslot" data-v="${BE.slot}">Chơi lại</button></p>`;
  }
  function paintList() {
    const el = document.getElementById("bt-list");
    if (!el) return;
    const s = slot(BE.slot), q = (document.getElementById("bt-q") || {}).value || "", ql = q.toLowerCase();
    const rows = M.universe(s.market).filter(x => BE.filter === "all" || (BE.filter === "gov" ? x.rating === "GOV" : BE.filter === "ig" ? x.rating !== "GOV" && M.isIG(x.rating) : x.rating !== "GOV" && !M.isIG(x.rating)))
      .filter(x => !ql || (x.bond.id + " " + x.bond.name + " " + M.issuerById(x.bond.issuer).name).toLowerCase().includes(ql));
    const prev = id => { const a = s.hist.px[id]; return a && a.length > 1 ? a[a.length - 2] : null; };
    el.innerHTML = `<table class="be-t be-mt"><thead><tr><th>Trái phiếu</th><th>Hạng</th><th class="n">Giá sạch</th><th class="n">YTM</th><th class="n">Spread</th></tr></thead><tbody>${rows.map(x => {
      const p = prev(x.bond.id), ch = p != null ? x.mid - p : 0;
      return `<tr class="${BE.sel === x.bond.id ? "on" : ""}" data-be="sel" data-v="${x.bond.id}" tabindex="0"><td><b>${x.bond.id}</b><small>${esc(x.bond.name)}</small></td><td>${x.defaulted ? chip("Vỡ nợ", "red") : x.rating}</td>
        <td class="n">${px(x.mid, 2)}<small class="${tone(ch)}">${ch ? (ch > 0 ? "+" : "") + ch.toFixed(2) : ""}</small></td><td class="n">${pct(x.ytm)}</td><td class="n">${x.z ? bp(x.z) : x.rating === "GOV" ? "—" : ""}</td></tr>`;
    }).join("")}</tbody></table>`;
  }
  function paintDetail() {
    const el = document.getElementById("bt-detail");
    if (!el) return;
    const s = slot(BE.slot), q = M.quote(s.market, BE.sel);
    if (!q) { BE.sel = M.universe(s.market)[0].bond.id; return paintDetail(); }
    const b = q.bond, iss = M.issuerById(b.issuer), st = s.market.issuers[b.issuer];
    const r = !q.defaulted ? E.yieldRisk(b, s.market.date, q.ytm, { index: q.index }) : null, cf = q.defaulted ? [] : E.cashflows(b, s.market.date, { index: q.index });
    const hist = (s.hist.px[b.id] || []).filter(v => v != null);
    el.innerHTML = `<header class="be-dh"><div><p class="be-kicker">${esc(iss.name)} · ${esc(iss.sector)}${st ? ` · triển vọng ${st.stress > 0.4 ? "tiêu cực" : st.stress < -0.3 ? "tích cực" : "ổn định"}` : ""}</p><h2>${esc(b.name)}</h2>
        <p class="be-muted">${b.frn ? `Thả nổi: tham chiếu (lợi suất TPCP 1 năm, ${pct(q.index)}) + ${pct(b.frn.margin)}` : `Coupon ${pct(b.coupon)}`} · trả ${({ 1: "hằng năm", 2: "6 tháng/lần", 4: "hằng quý" })[b.freq]} · ${b.dayCount} · đáo hạn ${dmy(b.maturity)} · ${M.SENIORITY[b.seniority].name} · mệnh giá 100.000 ₫</p></div>${spark(hist)}</header>
      <div class="be-quote">${[["Giá mua (bid)", px(q.bid)], ["Giá bán (ask)", px(q.ask)], ["Lãi dồn tích", px(q.ai, 4)], ["Giá bẩn (mid)", px(q.full)], ["YTM", pct(q.ytm, 3)], ["Lợi suất hiện hành", q.cy != null ? pct(q.cy, 3) : "—"],
        ["G-spread", q.g != null && b.issuer !== "GOV" ? bp(q.g) : "—"], ["Z-spread", b.issuer === "GOV" ? "0" : bp(q.z)], ["Kỳ hạn còn lại", q.years.toFixed(2) + " năm"]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
      ${r ? `<div class="be-quote small">${[["Macaulay", r.mac.toFixed(3)], ["Modified", r.mod.toFixed(3)], ["Convexity", r.cvx.toFixed(2)], ["PVBP / 1 tỷ ₫ mệnh giá", vnd(r.pvbp / 100 * 1e9)], ["Money duration / 1 tỷ ₫ mệnh giá", vnd(r.money / 100 * 1e9)]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>` : `<p class="be-note red">Đã vỡ nợ: giao dịch bị dừng, giá phản ánh tỷ lệ thu hồi ${pct(q.recovery, 0)}.</p>`}
      ${cf.length ? `<details><summary>Lịch dòng tiền / 100 mệnh giá (${cf.length} kỳ)</summary><table class="be-t"><thead><tr><th>Ngày đến hạn</th><th>Ngày thanh toán</th><th class="n">Coupon</th><th class="n">Gốc</th></tr></thead><tbody>${cf.map(c => `<tr><td>${dmy(c.date)}</td><td>${dmy(c.pay)}${c.pay !== c.date ? " *" : ""}</td><td class="n">${c.coupon.toFixed(4)}</td><td class="n">${c.principal ? "100" : ""}</td></tr>`).join("")}</tbody></table><p class="be-muted">* điều chỉnh theo ngày làm việc kế tiếp.${b.frn ? " Coupon thả nổi tương lai giả định bằng lãi suất tham chiếu hiện tại." : ""}</p></details>` : ""}`;
  }
  function spark(v) {
    if (v.length < 2) return "";
    const w = 160, h = 44, lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
    const d = v.map((x, i) => `${i ? "L" : "M"}${(i / (v.length - 1) * w).toFixed(1)} ${(h - 4 - (x - lo) / r * (h - 8)).toFixed(1)}`).join("");
    return `<svg class="be-spark" viewBox="0 0 ${w} ${h}" aria-label="Diễn biến giá"><path d="${d}" class="${v[v.length - 1] >= v[0] ? "up" : "down"}"/></svg>`;
  }
  function paintTicket() {
    const el = document.getElementById("bt-ticket");
    if (!el) return;
    const s = slot(BE.slot), q = M.quote(s.market, BE.sel), held = s.account.holdings[BE.sel];
    const run = s.account.meta.run, closed = (run && run.done) || (s.market.kind === "replay" && M.replayDone(s.market));
    el.innerHTML = `<h3>Đặt lệnh · ${BE.sel}</h3>${q && !q.defaulted && !closed ? `<div class="be-side"><button type="button" data-be="side" data-v="BUY" class="buy ${BE.side !== "SELL" ? "on" : ""}">Mua</button><button type="button" data-be="side" data-v="SELL" class="sell ${BE.side === "SELL" ? "on" : ""}">Bán</button></div>
      <label class="be-f"><span>Số trái phiếu (mệnh giá 100.000 ₫)</span><input id="bt-qty" inputmode="numeric" value="${BE.qty || 100}"></label>
      <div class="be-quick">${[100, 500, 1000].map(n => `<button type="button" data-be="qty" data-v="${n}">${n}</button>`).join("")}${held ? `<button type="button" data-be="qty" data-v="${held.qty}">Tất cả ${held.qty}</button>` : ""}</div>
      <dl class="be-est" id="bt-est"></dl><button type="button" class="be-btn ${BE.side === "SELL" ? "red" : "green"} wide" data-be="order">${BE.side === "SELL" ? "Bán" : "Mua"} ${BE.sel}</button>
      <p class="be-muted">Khớp ở giá ${BE.side === "SELL" ? "bid" : "ask"} + lãi dồn tích, phí ${K.FEE_BPS / 100}% (giả định). Giá do thị trường quyết định, không lấy từ trang.</p>` : `<p class="be-muted">${closed ? "Vòng chơi đã kết thúc." : "Không giao dịch được trái phiếu này."}</p>`}`;
    const qi = document.getElementById("bt-qty");
    if (qi) qi.oninput = () => { BE.qty = parseInt(qi.value, 10) || 0; BE.cid = null; paintEst(); };
    paintEst();
  }
  function paintEst() {
    const el = document.getElementById("bt-est");
    if (!el) return;
    const s = slot(BE.slot), q = M.quote(s.market, BE.sel), n = BE.qty || 100;
    const pr = BE.side === "SELL" ? q.bid : q.ask, gross = K.tradeValue(n, pr + q.ai), fee = K.feeOf(gross), cash = K.cash(s.account);
    const tot = BE.side === "SELL" ? gross - fee : gross + fee;
    el.innerHTML = `<div><dt>Giá sạch</dt><dd>${px(pr)}</dd></div><div><dt>Lãi dồn tích</dt><dd>${px(q.ai, 4)}</dd></div><div><dt>Giá trị (giá bẩn)</dt><dd>${vnd(gross)}</dd></div><div><dt>Phí</dt><dd>${vnd(fee)}</dd></div>
      <div><dt>${BE.side === "SELL" ? "Tiền nhận" : "Tổng chi"}</dt><dd>${vnd(tot)}</dd></div><div><dt>Tiền mặt sau lệnh</dt><dd class="${cash - (BE.side === "SELL" ? -tot : tot) < 0 ? "down" : ""}">${vnd(cash + (BE.side === "SELL" ? tot : -tot))}</dd></div>`;
  }
  function paintTab() {
    const el = document.getElementById("bt-tab");
    if (!el) return;
    const s = slot(BE.slot), a = s.account, m = s.market;
    if (BE.tab === "pos") {
      const pos = K.positions(a, m);
      el.innerHTML = pos.length ? `<div class="be-tw"><table class="be-t"><thead><tr><th>Trái phiếu</th><th class="n">SL</th><th class="n">Giá vốn sạch TB</th><th class="n">Giá sạch</th><th class="n">Giá trị (bẩn)</th><th class="n">Lãi/lỗ chưa TH</th><th class="n">YTM</th><th class="n">Mod dur</th><th class="n">Tỷ trọng</th></tr></thead><tbody>${pos.map(p => {
        const nav = K.risk(a, m).nav;
        return `<tr data-be="sel" data-v="${p.id}"><td><b>${p.id}</b><small>${esc(p.bond.name)}</small></td><td class="n">${p.qty.toLocaleString("vi-VN")}</td><td class="n">${px(p.avgClean)}</td><td class="n">${px(p.q.mid)}</td><td class="n">${vnd(p.mv)}</td><td class="n ${tone(p.unreal)}">${vnd(p.unreal)}</td><td class="n">${pct(p.q.ytm)}</td><td class="n">${p.mod.toFixed(2)}</td><td class="n">${pct(p.mv / nav, 1)}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<p class="be-muted">Danh mục trống. Chọn trái phiếu bên trái và đặt lệnh mua.</p>`;
    } else if (BE.tab === "ledger") {
      let bal = 0;
      const rows = a.ledger.map(e => { bal += e.amount; return [e, bal]; }).slice(-200).reverse();
      el.innerHTML = `<div class="be-tw"><table class="be-t"><thead><tr><th>Ngày</th><th>Loại</th><th class="n">Số tiền</th><th class="n">Số dư</th><th>Diễn giải</th></tr></thead><tbody>${rows.map(([e, b]) => `<tr><td>${dmy(e.date)}</td><td>${({ INITIAL: "Vốn ban đầu", BUY: "Mua", SELL: "Bán", FEE: "Phí", COUPON: "Coupon", PRINCIPAL: "Hoàn gốc", RECOVERY: "Thu hồi", REDEEM: "Rút vốn" })[e.type] || e.type}</td><td class="n ${tone(e.amount)}">${vnd(e.amount)}</td><td class="n">${vnd(b)}</td><td>${esc(e.note)}</td></tr>`).join("")}</tbody></table></div>
        <p class="${K.verify(a).ok ? "be-ok" : "be-warn"}">${K.verify(a).ok ? "Sổ cái khớp: tiền mặt = tổng các bút toán, chuỗi băm nguyên vẹn." : esc(K.verify(a).problems.join(" · "))}</p>`;
    } else if (BE.tab === "trades") {
      el.innerHTML = a.trades.length ? `<div class="be-tw"><table class="be-t"><thead><tr><th>Ngày</th><th>Lệnh</th><th>Trái phiếu</th><th class="n">SL</th><th class="n">Giá sạch</th><th class="n">YTM</th><th class="n">Giá trị</th><th class="n">Phí</th><th class="n">Lãi vốn</th></tr></thead><tbody>${a.trades.slice().reverse().map(t => `<tr><td>${dmy(t.date)}</td><td class="${t.side === "SELL" ? "down" : "up"}">${t.side === "BUY" ? "Mua" : t.side === "TRANSFER" ? "Nhận bàn giao" : "Bán"}${t.forced ? " (bán tháo)" : ""}</td><td>${t.bondId}</td><td class="n">${t.qty}</td><td class="n">${px(t.clean)}</td><td class="n">${pct(t.ytm)}</td><td class="n">${vnd(t.gross)}</td><td class="n">${vnd(t.fee)}</td><td class="n ${tone(t.priceGain || 0)}">${t.priceGain != null ? vnd(t.priceGain) : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="be-muted">Chưa có giao dịch.</p>`;
    } else if (BE.tab === "risk") {
      const r = K.risk(a, m, true), perf = K.performance(a, m);
      el.innerHTML = `<div class="be-kpis">${[["NAV", mil(r.nav)], ["Lợi nhuận", pct(perf.ret)], ["Duration trái phiếu", r.dur.toFixed(2)], ["Duration theo NAV", r.durNav.toFixed(2)], ["Convexity", r.cvx.toFixed(2)], ["Money duration", vnd(r.money)], ["PVBP", vnd(r.pvbp)], ["YTM bình quân", pct(r.ytm)],
        ["Tiền mặt", pct(r.cashPct, 1)], ["Lợi suất cao", pct(r.hy, 1)], ["Lãi coupon", vnd(perf.income)], ["Lãi vốn đã TH", vnd(perf.realized)], ["Phí", vnd(perf.fees)], ["Sụt giảm tối đa", pct(perf.maxDD)]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
        <h3>Key rate duration (đóng góp theo NAV)</h3>${krdBars(r.krd)}<h3>Phân bổ theo hạng</h3>${Object.entries(r.byRating).map(([k, v]) => `<div class="be-row"><span>${k}</span>${bar(v, 1, "gold")}<b>${pct(v, 1)}</b></div>`).join("") || `<p class="be-muted">—</p>`}`;
    } else {
      el.innerHTML = m.news.length ? `<ul class="be-news">${m.news.slice().reverse().map(n => `<li class="${n.kind}"><time>${dmy(n.date)}</time>${esc(n.text)}</li>`).join("")}</ul>` : `<p class="be-muted">Chưa có tin. Chạy đồng hồ thị trường.</p>`;
    }
  }
  function krdBars(k) {
    if (!k) return "";
    const mx = Math.max(0.01, ...k.map(Math.abs));
    return `<div class="be-krd">${M.TENORS.map((t, i) => `<div><b>${k[i].toFixed(2)}</b><i style="height:${Math.abs(k[i]) / mx * 100}%" class="${k[i] < 0 ? "neg" : ""}"></i><span>${t}Y</span></div>`).join("")}</div>`;
  }
  function placeOrder() {
    const s = slot(BE.slot), n = parseInt(BE.qty || 100, 10);
    BE.cid = BE.cid || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const req = { cid: BE.cid, bondId: BE.sel, qty: n };
    const r = BE.side === "SELL" ? K.sell(s.account, req, s.market, ctx()) : K.buy(s.account, req, s.market, ctx());
    BE.cid = null;
    if (!r.ok) { toast(r.error, "error"); save(); return; }
    K.snapshot(s.account, s.market); save();
    toast(`${BE.side === "SELL" ? "Đã bán" : "Đã mua"} ${n} ${BE.sel} @ ${px(r.trade.clean)} · ${vnd(r.trade.gross)}`);
    paintTerminal(true);
  }
  function step(n) {
    const msgs = advance(BE.slot, n);
    msgs.slice(-4).forEach(t => toast(t, /vỡ nợ|bán tháo|Hạ hạng|rút/.test(t) ? "error" : "success"));
    if (document.getElementById("bt-top")) { const s = slot(BE.slot), run = s.account.meta.run; document.querySelector(".be-head h1").innerHTML = `${dmy(s.market.date)} <small>tuần ${s.market.week}${run ? `/${run.weeks}` : ""}</small>`; paintTerminal(false); }
  }

  // ================= YIELD CURVE LAB =================
  function baseCurve() { const s = slot("free"); return { tenors: M.TENORS.slice(), par: s.market.curve.par.slice() }; }
  function curveLab() {
    if (!BE.lab) BE.lab = { base: baseCurve(), cur: baseCurve(), bond: "GOV-36" };
    const ds = dataset();
    shell("curve", hd("Yield Curve Laboratory", "Phòng thí nghiệm đường cong lợi suất", "Sửa đường par ở năm kỳ hạn chuẩn; engine bootstrap ra đường spot, forward 1 năm và định giá lại trái phiếu."),
      `<section class="be-lab"><div class="be-card"><h3>Đường par (%/năm, trả lãi hằng năm)</h3><div class="be-curvein">${M.TENORS.map((t, i) => `<label><span>${t}Y</span><input type="number" step="0.01" data-lab="${i}" value="${(BE.lab.cur.par[i] * 100).toFixed(3)}"></label>`).join("")}</div>
        <div class="be-btns">${[["up", "Song song +25 bp"], ["down", "Song song −25 bp"], ["steep", "Dốc lên"], ["flat", "Phẳng đi"], ["inv", "Đảo ngược"], ["bfly", "Butterfly"], ["reset", "Về thị trường"]].map(([k, l]) => `<button type="button" class="be-btn sm ghost" data-be="lab" data-v="${k}">${l}</button>`).join("")}
          ${ds ? `<button type="button" class="be-btn sm" data-be="lab" data-v="real">Đường TPCP thật ${dmy(ds.points[ds.points.length - 1].d)}</button>` : ""}</div>
        <div id="lab-chart"></div></div>
        <div class="be-card"><h3>Bảng đường cong</h3><div id="lab-table"></div><h3>Tác động lên trái phiếu</h3><select id="lab-bond" class="be-sel">${M.BONDS.map(b => `<option value="${b.id}" ${b.id === BE.lab.bond ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select><div id="lab-impact"></div></div></section>
      <section class="be-card"><h3>Máy tính Fixed Income</h3><div class="be-seg">${[["bond", "Trái phiếu"], ["mm", "Thị trường tiền tệ"], ["repo", "Repo"], ["frn", "FRN"], ["credit", "Tín dụng"], ["recovery", "Thu hồi"]].map(([k, l]) => `<button type="button" data-be="calc" data-v="${k}" class="${BE.calc === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="calc-body"></div></section>`);
    document.querySelectorAll("[data-lab]").forEach(inp => { inp.oninput = () => { const v = parseFloat(inp.value); if (isFinite(v)) { BE.lab.cur.par[+inp.dataset.lab] = v / 100; paintLab(false); } }; });
    document.getElementById("lab-bond").onchange = e => { BE.lab.bond = e.target.value; paintLab(false); };
    paintLab(true); paintCalc();
  }
  function paintLab(inputs) {
    const L = BE.lab, bt = E.bootstrap(L.cur), base = E.bootstrap(L.base);
    if (inputs) document.querySelectorAll("[data-lab]").forEach(inp => { inp.value = (L.cur.par[+inp.dataset.lab] * 100).toFixed(3); });
    const xs = Array.from({ length: 20 }, (_, i) => i + 1);
    const series = [["Par", xs.map(t => E.parAt(L.cur, t)), "gold"], ["Spot", xs.map(t => bt.z[t]), "green"], ["Forward 1 năm", xs.map(t => E.forward(bt, t - 1, t)), "blue"], ["Par (thị trường)", xs.map(t => E.parAt(L.base, t)), "dim"]];
    document.getElementById("lab-chart").innerHTML = lineChart(xs, series, v => pct(v, 1));
    const rows = [1, 2, 3, 5, 7, 10, 15, 20];
    document.getElementById("lab-table").innerHTML = `<table class="be-t"><thead><tr><th>Kỳ hạn</th><th class="n">Par</th><th class="n">Spot</th><th class="n">Hệ số chiết khấu</th><th class="n">Forward 1 năm</th><th class="n">Par từ spot</th></tr></thead><tbody>${rows.map(t => `<tr><td>${t} năm</td><td class="n">${pct(E.parAt(L.cur, t), 3)}</td><td class="n">${pct(bt.z[t], 3)}</td><td class="n">${bt.df[t].toFixed(5)}</td><td class="n">${pct(E.forward(bt, t - 1, t), 3)}</td><td class="n">${pct(E.parFromSpots(bt, t), 3)}</td></tr>`).join("")}</tbody></table>`;
    const s = slot("free"), q = M.quote(s.market, L.bond);
    if (q && !q.defaulted) {
      const b = q.bond, opt = { index: q.index }, p0 = E.priceOnCurve(b, s.market.date, base, q.z, opt), p1 = E.priceOnCurve(b, s.market.date, bt, q.z, opt);
      const cr = E.curveRisk(b, s.market.date, L.base, q.z, opt), dyApprox = M.TENORS.map((t, i) => L.cur.par[i] - L.base.par[i]);
      const est = -cr.krd.reduce((n, k, i) => n + k * dyApprox[i], 0);
      document.getElementById("lab-impact").innerHTML = `<div class="be-kpis">${[["Giá sạch trước", px(p0.clean)], ["Giá sạch sau", px(p1.clean)], ["% thay đổi (định giá lại)", pct(p1.full / p0.full - 1)], ["% ước tính bằng key rate duration", pct(est)], ["Duration hiệu dụng", cr.effDur.toFixed(2)], ["Z-spread giữ nguyên", bp(q.z)]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>${krdBars(cr.krd)}`;
    } else document.getElementById("lab-impact").innerHTML = `<p class="be-muted">Trái phiếu không định giá được.</p>`;
  }
  function lineChart(xs, series, fmtY) {
    const w = 640, h = 240, padL = 46, padB = 22, all = series.flatMap(s => s[1]).filter(v => v != null && isFinite(v));
    const lo = Math.min(...all), hi = Math.max(...all), r = hi - lo || 0.001, X = i => padL + i / (xs.length - 1) * (w - padL - 8), Y = v => 8 + (1 - (v - lo) / r) * (h - padB - 16);
    const ticks = [lo, lo + r / 2, hi];
    return `<svg class="be-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ">${ticks.map(t => `<line x1="${padL}" x2="${w - 8}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="4" y="${Y(t) + 4}" class="ax">${fmtY(t)}</text>`).join("")}
      ${xs.map((x, i) => i % Math.ceil(xs.length / 10) === 0 || i === xs.length - 1 ? `<text x="${X(i)}" y="${h - 4}" class="ax" text-anchor="middle">${x}</text>` : "").join("")}
      ${series.map(([n, v, c]) => `<path class="ln ${c}" d="${v.map((y, i) => y == null ? "" : `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(y).toFixed(1)}`).join("")}"/>`).join("")}</svg>
      <div class="be-legend">${series.map(([n, , c]) => `<span class="${c}"><i></i>${esc(n)}</span>`).join("")}</div>`;
  }
  const CALC = {
    bond: { f: [["c", "Coupon (%/năm)", 5], ["m", "Số kỳ trả/năm (1, 2, 4)", 2], ["iss", "Ngày bắt đầu tính lãi", "2025-03-15"], ["mat", "Ngày đáo hạn", "2032-03-15"], ["set", "Ngày thanh toán", "2026-11-20"], ["dc", "Quy ước (ACT/ACT, 30/360, ACT/365)", "30/360"], ["y", "YTM (%) — để trống nếu nhập giá", 5.5], ["p", "Giá sạch — dùng khi YTM trống", ""]],
      run: v => { const b = { coupon: v.c / 100, freq: v.m, issue: v.iss, maturity: v.mat, dayCount: v.dc }; let y = v.y !== "" && v.y != null ? v.y / 100 : null;
        if (y == null) { const ai = E.accrued(b, v.set); y = E.ytm(b, v.set, v.p + ai); }
        const p = E.priceFromYield(b, v.set, y), r = E.yieldRisk(b, v.set, y);
        return [["YTM", pct(y, 4)], ["Giá bẩn", px(p.full, 4)], ["Lãi dồn tích", px(p.ai, 4)], ["Giá sạch", px(p.clean, 4)], ["t/T", p.f.toFixed(5)], ["Macaulay", r.mac.toFixed(4)], ["Modified", r.mod.toFixed(4)], ["Convexity", r.cvx.toFixed(3)], ["PVBP / 100", r.pvbp.toFixed(5)], ["Lợi suất hiện hành", pct(E.currentYield(b, p.clean), 4)], ["Lợi suất quy đổi năm", pct(E.convertYield(y, v.m, 1), 4)]]; } },
    mm: { f: [["fv", "Mệnh giá", 100], ["d", "Số ngày", 90], ["dr", "Lãi suất chiết khấu (%, năm 360)", 4]],
      run: v => { const pv = E.mm.pvDiscountBasis(v.fv, v.d, v.dr / 100); return [["Giá (PV)", px(pv, 4)], ["Lãi suất cộng thêm, năm 365", pct(E.mm.addOnFromPrice(pv, v.fv, v.d, 365), 4)], ["Lãi suất cộng thêm, năm 360", pct(E.mm.addOnFromPrice(pv, v.fv, v.d, 360), 4)], ["Lợi suất tương đương trái phiếu", pct(E.mm.bey(pv, v.fv, v.d), 4)]]; } },
    repo: { f: [["mv", "Giá trị tài sản đảm bảo", 120], ["hc", "Haircut (%)", 3], ["r", "Lãi suất repo (%, năm 360)", 4.4], ["d", "Số ngày", 14]],
      run: v => { const r = E.repo(v.mv, v.hc / 100, v.r / 100, v.d); return [["Tiền nhận", px(r.cash, 4)], ["Tiền lãi", px(r.interest, 6)], ["Giá mua lại", px(r.repurchase, 4)], ["Biên đảm bảo", px(r.margin, 4)]]; } },
    frn: { f: [["i", "Lãi suất tham chiếu (%)", 4], ["qm", "Biên niêm yết (%)", 1.5], ["dm", "Biên chiết khấu (%)", 2], ["m", "Số kỳ/năm", 4], ["n", "Số kỳ còn lại", 12]],
      run: v => [["Giá / 100", px(E.frnPrice(v.i / 100, v.qm / 100, v.dm / 100, v.m, v.n), 4)]] },
    credit: { f: [["s", "Credit spread (%)", 6], ["rr", "Tỷ lệ thu hồi (%)", 40], ["ex", "Giá trị vị thế", 10], ["yrs", "Số năm", 3]],
      run: v => { const pd = v.s / 100 / (1 - v.rr / 100); return [["PD hằng năm ngầm định", pct(pd, 3)], ["Tổn thất kỳ vọng 1 năm", px(E.expectedLoss(v.ex, pd, v.rr / 100), 4)], [`PD tích lũy ${v.yrs} năm`, pct(E.cumulativePD(pd, v.yrs), 3)]]; } },
    recovery: { f: [["est", "Giá trị tài sản khi vỡ nợ", 6000], ["col", "Trong đó tài sản bảo đảm", 2100], ["sec", "Nợ có bảo đảm", 2500], ["sen", "Nợ không bảo đảm ưu tiên", 8900], ["sub", "Nợ thứ cấp", 1500]],
      run: v => { const w = E.recoveryWaterfall(v.est, v.col, [{ name: "Có bảo đảm", rank: "secured", amount: v.sec }, { name: "Không bảo đảm", rank: "senior", amount: v.sen }, { name: "Thứ cấp", rank: "sub", amount: v.sub }]);
        return w.claims.map(c => [c.name, `${px(c.recovered, 1)} (${pct(c.rate, 1)})`]).concat([["Còn lại cho cổ đông", px(w.leftover, 1)]]); } }
  };
  function paintCalc() {
    const el = document.getElementById("calc-body"), c = CALC[BE.calc];
    if (!el) return;
    el.innerHTML = `<form class="be-calc" id="calc-form"><div class="be-inputs">${c.f.map(([k, l, v]) => `<label class="be-f"><span>${esc(l)}</span><input name="${k}" value="${v}"></label>`).join("")}</div></form><div id="calc-out"></div>`;
    const f = document.getElementById("calc-form"), run = () => {
      const v = {};
      for (const [k, , d] of c.f) { const raw = f.elements[k].value.trim(); v[k] = typeof d === "number" || /^-?[\d.,]+$/.test(raw) ? (raw === "" ? "" : num(raw)) : raw; }
      try { const out = c.run(v); document.getElementById("calc-out").innerHTML = `<div class="be-kpis">${out.map(([k, x]) => `<div><span>${esc(k)}</span><b>${x}</b></div>`).join("")}</div>`; }
      catch (e) { document.getElementById("calc-out").innerHTML = `<p class="be-warn">Dữ liệu chưa hợp lệ: ${esc(e.message)}</p>`; }
    };
    f.oninput = run; run();
  }

  // ================= DURATION RISK CENTER =================
  const SCEN = { p50: ["+50 bp song song", [0.005, 0.005, 0.005, 0.005, 0.005]], p100: ["+100 bp song song", [0.01, 0.01, 0.01, 0.01, 0.01]], p200: ["+200 bp song song", [0.02, 0.02, 0.02, 0.02, 0.02]],
    m100: ["−100 bp song song", [-0.01, -0.01, -0.01, -0.01, -0.01]], steep: ["Dốc lên (ngắn −25, dài +75)", [-0.0025, 0, 0.0025, 0.005, 0.0075]], flat: ["Phẳng đi (ngắn +75, dài 0)", [0.0075, 0.005, 0.0025, 0.001, 0]], bfly: ["Butterfly (giữa +60)", [0, 0.003, 0.006, 0.003, 0]] };
  function riskCenter(id) {
    const ids = ["free", "story", "fund", "replay", "cup", ...Q.CHALLENGES.map(c => "ch-" + c.id)].filter(k => H().slots[k]);
    BE.riskSlot = id && H().slots[id] ? id : BE.riskSlot && H().slots[BE.riskSlot] ? BE.riskSlot : ids[0] || "free";
    const s = slot(BE.riskSlot), r = K.risk(s.account, s.market, true), sc = SCEN[BE.scen];
    const after = { tenors: M.TENORS.slice(), par: s.market.curve.par.map((p, i) => p + sc[1][i]) }, sh = K.shockPortfolio(s.account, s.market, after);
    const per = r.positions.filter(p => !p.q.defaulted).map(p => {
      const dy = E.parAt(after, Math.max(0.01, p.q.years)) - E.parAt(s.market.curve, Math.max(0.01, p.q.years));
      const full = E.priceOnCurve(p.bond, s.market.date, E.bootstrap(after), p.q.z, { index: p.q.index }).full;
      return { p, dy, dur: p.mv * -p.mod * dy, cvx: p.mv * (-p.mod * dy + 0.5 * p.cvx * dy * dy), act: p.qty * M.FACE * full / 100 - p.mv };
    });
    shell("risk", hd("Duration Risk Center", "Trung tâm rủi ro lãi suất", "Đo độ nhạy danh mục và thử cú sốc đường cong: so sánh ước tính bằng duration/convexity với định giá lại đầy đủ."),
      `<section class="be-card"><div class="be-seg">${ids.map(k => `<button type="button" data-be="rslot" data-v="${k}" class="${k === BE.riskSlot ? "on" : ""}">${esc(SLOT_NAME[k] || (Q.CHALLENGES.find(c => "ch-" + c.id === k) || {}).name || k)}</button>`).join("")}</div>
        <div class="be-kpis">${[["NAV", mil(r.nav)], ["Macaulay (trái phiếu)", r.mac.toFixed(2)], ["Modified (trái phiếu)", r.dur.toFixed(2)], ["Modified theo NAV", r.durNav.toFixed(2)], ["Convexity", r.cvx.toFixed(2)], ["Money duration", vnd(r.money)], ["PVBP", vnd(r.pvbp)], ["Tiền mặt", pct(r.cashPct, 1)]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
        <h3>Key rate duration theo NAV (tổng ≈ duration hiệu dụng)</h3>${krdBars(r.krd)}</section>
      <section class="be-card"><h3>Mô phỏng cú sốc</h3><div class="be-seg">${Object.entries(SCEN).map(([k, v]) => `<button type="button" data-be="scen" data-v="${k}" class="${BE.scen === k ? "on" : ""}">${v[0]}</button>`).join("")}</div>
        <div class="be-kpis">${[["Thay đổi thực tế (định giá lại)", vnd(sh.actual)], ["Ước tính duration + convexity", vnd(sh.estimate)], ["Sai số ước tính", vnd(sh.error)], ["% NAV", pct(sh.actual / (r.nav || 1))]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
        ${per.length ? `<div class="be-tw"><table class="be-t"><thead><tr><th>Trái phiếu</th><th class="n">Δy tại kỳ hạn</th><th class="n">Chỉ duration</th><th class="n">+ convexity</th><th class="n">Định giá lại</th><th class="n">Sai số</th></tr></thead><tbody>${per.map(x => `<tr><td>${x.p.id}</td><td class="n">${bp(x.dy)}</td><td class="n">${vnd(x.dur)}</td><td class="n">${vnd(x.cvx)}</td><td class="n ${tone(x.act)}">${vnd(x.act)}</td><td class="n">${vnd(x.cvx - x.act)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="be-muted">Danh mục chưa có trái phiếu. <a href="#/bond/terminal/${BE.riskSlot}">Mở Terminal</a></p>`}
        <p class="be-muted">Spread tín dụng giữ nguyên; Δy lấy tại kỳ hạn còn lại của từng trái phiếu trên đường par. Định giá lại dùng đường spot bootstrap từ đường par mới.</p></section>`);
  }

  // ================= CREDIT OFFICE =================
  function creditOffice() {
    const s = slot("free"), m = s.market;
    shell("credit", hd("Credit Investigation Office", "Văn phòng điều tra tín dụng", "Theo dõi các tổ chức phát hành (hư cấu) trên thị trường mô phỏng và mở hồ sơ điều tra."),
      `<section class="be-card"><h3>Theo dõi tổ chức phát hành</h3><div class="be-tw"><table class="be-t"><thead><tr><th>Tổ chức</th><th>Ngành</th><th>Hạng</th><th>Triển vọng</th><th class="n">Spread hạng</th><th class="n">PD/năm (mô hình)</th><th class="n">Spread ≈ PD × LGD</th><th>Trạng thái</th></tr></thead><tbody>${M.ISSUERS.filter(x => !x.gov).map(x => {
        const st = m.issuers[x.id], R = M.RATING[st.rating], pd = R.pd * m.macro.risk * Math.exp(1.5 * Math.max(0, st.stress));
        return `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.sector)}</td><td>${st.defaulted ? "D" : st.rating}</td><td>${st.stress > 0.4 ? "Tiêu cực" : st.stress < -0.3 ? "Tích cực" : "Ổn định"}</td><td class="n">${bp(R.s * m.macro.risk)}</td><td class="n">${pct(pd, 2)}</td><td class="n">${bp(E.spreadApprox(pd, 0.4))}</td><td>${st.defaulted ? chip("Vỡ nợ " + dmy(st.defaulted), "red") : chip("Đang trả nợ", "green")}</td></tr>`;
      }).join("")}</tbody></table></div><p class="be-muted">PD theo mô hình mô phỏng (hạng × khẩu vị rủi ro thị trường × căng thẳng riêng). Cột cuối cho thấy phần spread giải thích được bởi tổn thất kỳ vọng với RR 40%; phần còn lại là bù thanh khoản và bất định.</p></section>
      <section class="be-grid2"><a class="be-card be-case-card" href="#/bond/m/c5-detective"><p class="be-kicker">Hồ sơ điều tra · Chương 5</p><h2>Lotus Crest Land</h2><p>Báo cáo tài chính 3 năm, bản công bố thông tin, báo cáo xếp hạng, lịch đáo hạn, lịch sử trả lãi, tin doanh nghiệp, tài sản bảo đảm. Ghim bằng chứng, tính chỉ số, ước tính thu hồi, đề xuất.</p>${Q.chapterOpen(H().progress, 5) ? chip("Mở hồ sơ", "gold") : chip("Mở ở chương 5", "")}</a>
        <div class="be-card"><p class="be-kicker">Máy tính</p><h2>Thu hồi theo thứ tự ưu tiên</h2><p>Dùng Curve Lab → Máy tính Fixed Income → Thu hồi để thử các cấu trúc nợ khác nhau.</p><a class="be-btn" href="#/bond/curve">Mở máy tính</a></div></section>`);
  }

  // ================= STRUCTURED FINANCE FACTORY =================
  function factory() {
    BE.fac = BE.fac || { balance: 1000, wac: 11, term: 48, cdr: 4, cpr: 6, recovery: 40, fee: 0.5, s: 800, sc: 5.5, mz: 150, mc: 8.5, e: 50 };
    BE.mbs = BE.mbs || { balance: 500, wac: 8, rate: 7.5, psa: 150, a: 200, b: 200, c: 100 };
    shell("factory", hd("Structured Finance Factory", "Xưởng chứng khoán hóa", "Đưa tài sản vào SPE, phân lớp, thiết lập thứ tự thanh toán và mô phỏng vỡ nợ, trả trước. Thác thanh toán: phí → lãi theo thứ tự ưu tiên → gốc cho lớp ưu tiên trước → phần còn lại cho Equity; tổn thất xóa từ lớp thấp nhất."),
      `<section class="be-card"><h3>ABS / CLO — thác thanh toán</h3><form id="fac-abs" class="be-inputs">${[["balance", "Pool (tỷ ₫)"], ["wac", "Lãi suất pool (%)"], ["term", "Kỳ hạn (tháng)"], ["cdr", "CDR vỡ nợ (%/năm)"], ["cpr", "CPR trả trước (%/năm)"], ["recovery", "Thu hồi (%)"], ["fee", "Phí dịch vụ (%/năm)"], ["s", "Senior (tỷ)"], ["sc", "Coupon Senior (%)"], ["mz", "Mezzanine (tỷ)"], ["mc", "Coupon Mezz (%)"], ["e", "Equity (tỷ)"]]
        .map(([k, l]) => `<label class="be-f"><span>${l}</span><input name="${k}" value="${BE.fac[k]}"></label>`).join("")}</form><div id="fac-abs-out"></div></section>
      <section class="be-card"><h3>MBS chuyển tiếp và CMO trả tuần tự</h3><form id="fac-mbs" class="be-inputs">${[["balance", "Pool (tỷ ₫)"], ["wac", "Lãi suất vay (%)"], ["rate", "Nhà đầu tư nhận (%)"], ["psa", "Tốc độ trả trước (PSA)"], ["a", "Lớp A (tỷ)"], ["b", "Lớp B (tỷ)"], ["c", "Lớp C (tỷ)"]]
        .map(([k, l]) => `<label class="be-f"><span>${l}</span><input name="${k}" value="${BE.mbs[k]}"></label>`).join("")}</form><div id="fac-mbs-out"></div></section>`);
    const fa = document.getElementById("fac-abs"), fm = document.getElementById("fac-mbs");
    fa.oninput = () => { for (const k of Object.keys(BE.fac)) { const v = num(fa.elements[k].value); if (v != null) BE.fac[k] = v; } paintAbs(); };
    fm.oninput = () => { for (const k of Object.keys(BE.mbs)) { const v = num(fm.elements[k].value); if (v != null) BE.mbs[k] = v; } paintMbs(); };
    paintAbs(); paintMbs();
  }
  function absResult(f) {
    return E.absWaterfall({ pool: { balance: f.balance, wac: f.wac / 100, term: Math.round(f.term), cdr: f.cdr / 100, cpr: f.cpr / 100, recovery: f.recovery / 100, fee: f.fee / 100 },
      tranches: [{ name: "Senior", size: f.s, coupon: f.sc / 100 }, { name: "Mezzanine", size: f.mz, coupon: f.mc / 100 }, { name: "Equity", size: f.e, coupon: 0 }] });
  }
  function absHtml(r, f) {
    const months = r.rows.map(x => x.month);
    return `<div class="be-kpis">${[["Tổng vỡ nợ", px(r.totalDefault, 1) + " tỷ"], ["Tổng tổn thất", px(r.totalLoss, 1) + " tỷ"], ["Trả trước", px(r.totalPrepay, 1) + " tỷ"], ["Thế chấp vượt (OC)", px(r.oc, 1) + " tỷ"], ["Equity nhận tiền mặt", px(r.equityCash, 1) + " tỷ"], ["Số tháng", r.months]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
      <table class="be-t"><thead><tr><th>Lớp</th><th class="n">Quy mô</th><th class="n">Lãi nhận</th><th class="n">Gốc nhận</th><th class="n">Bị xóa nợ</th><th class="n">% tổn thất</th><th class="n">Lãi thiếu</th><th class="n">WAL (năm)</th></tr></thead><tbody>${r.tranches.map(t => `<tr><td><b>${t.name}</b></td><td class="n">${px(t.size, 1)}</td><td class="n">${px(t.interest, 1)}</td><td class="n">${px(t.principal, 1)}</td><td class="n ${t.writedown > 0.01 ? "down" : ""}">${px(t.writedown, 1)}</td><td class="n ${t.lossPct > 0 ? "down" : ""}">${pct(t.lossPct, 1)}</td><td class="n">${px(t.shortfall, 2)}</td><td class="n">${t.wal ? t.wal.toFixed(2) : "—"}</td></tr>`).join("")}</tbody></table>
      ${lineChart(months, [["Pool", r.rows.map(x => x.pool), "gold"], ["Senior", r.rows.map(x => x.notes[0]), "green"], ["Mezzanine", r.rows.map(x => x.notes[1]), "blue"], ["Equity", r.rows.map(x => x.notes[2]), "red"]], v => px(v, 0))}`;
  }
  function paintAbs() {
    const f = BE.fac, el = document.getElementById("fac-abs-out");
    if (Math.abs(f.s + f.mz + f.e - f.balance) > f.balance * 0.5) { el.innerHTML = `<p class="be-warn">Tổng các lớp cách xa quy mô pool.</p>`; return; }
    el.innerHTML = absHtml(absResult(f), f);
  }
  function paintMbs() {
    const f = BE.mbs, el = document.getElementById("fac-mbs-out"), pt = E.passThrough({ balance: f.balance, wac: f.wac / 100, rate: f.rate / 100, term: 360, psa: f.psa });
    const cmo = E.cmoSequential(pt, [f.a, f.b, f.c]), speeds = [50, 100, 150, 200, 300, 500].map(p => [p, E.passThrough({ balance: f.balance, wac: f.wac / 100, rate: f.rate / 100, term: 360, psa: p }).wal]);
    const yrs = pt.rows.filter((_, i) => i % 12 === 0);
    el.innerHTML = `<div class="be-kpis"><div><span>WAL pool ở ${f.psa} PSA</span><b>${pt.wal.toFixed(2)} năm</b></div>${speeds.map(([p, w]) => `<div><span>WAL ở ${p} PSA</span><b>${w.toFixed(2)}</b></div>`).join("")}</div>
      <table class="be-t"><thead><tr><th>Lớp CMO</th><th class="n">Quy mô</th><th class="n">WAL</th><th class="n">Nhận gốc từ tháng</th><th class="n">đến tháng</th></tr></thead><tbody>${cmo.map((t, i) => `<tr><td>${"ABC"[i]}</td><td class="n">${px(t.size, 1)}</td><td class="n">${t.wal ? t.wal.toFixed(2) : "—"}</td><td class="n">${t.firstMonth || "—"}</td><td class="n">${t.lastMonth || "—"}</td></tr>`).join("")}</tbody></table>
      ${lineChart(yrs.map((_, i) => i), [["Dư nợ pool", yrs.map(x => x.bal), "gold"]], v => px(v, 0))}<p class="be-muted">Trả trước càng nhanh thì WAL càng ngắn (rủi ro rút ngắn khi lãi suất giảm); chậm thì kéo dài (rủi ro kéo dài khi lãi suất tăng).</p>`;
  }
  function bindFactoryMission(m) {
    const f = document.getElementById("be-mform"), out = document.getElementById("fm-out");
    const run = () => {
      if (m.mode === "abs") {
        const cdr = parseFloat(document.getElementById("fm-cdr").value);
        const s = [num(f.elements.s.value), num(f.elements.m.value), num(f.elements.e.value)];
        if (s.some(x => x == null)) return;
        const r = Q.absRun(s, cdr / 100);
        out.innerHTML = `<p class="be-muted">Kịch bản thử: CDR ${cdr}%/năm (nộp bài sẽ chấm ở CDR 8%). Tổng các lớp: ${px(s[0] + s[1] + s[2], 1)} tỷ.</p>${absHtml(r, {})}`;
      } else {
        const s = [num(f.elements.a.value), num(f.elements.b.value), num(f.elements.c.value)];
        if (s.some(x => x == null || x <= 0)) return;
        const t = E.cmoSequential(E.passThrough({ balance: 500, wac: 0.08, rate: 0.075, term: 360, psa: 150 }), s);
        out.innerHTML = `<table class="be-t"><thead><tr><th>Lớp</th><th class="n">Quy mô</th><th class="n">WAL (năm)</th></tr></thead><tbody>${t.map((x, i) => `<tr><td>${"ABC"[i]}</td><td class="n">${px(x.size, 1)}</td><td class="n">${x.wal ? x.wal.toFixed(2) : "—"}</td></tr>`).join("")}</tbody></table><p class="be-muted">Tổng: ${px(s[0] + s[1] + s[2], 1)} tỷ (phải bằng 500).</p>`;
      }
    };
    f.addEventListener("input", run); run();
  }

  // ================= INVESTMENT COMMITTEE =================
  function committeeForm(market) {
    const opts = M.universe(market).map(q => `<option value="${q.bond.id}">${esc(q.bond.name)} · ${q.rating}${q.defaulted ? " (vỡ nợ)" : ""}</option>`).join("");
    return `<div class="be-inputs"><label class="be-f"><span>Trái phiếu (vị thế 200 trái phiếu = 20.000.000 ₫ mệnh giá)</span><select name="bondId" id="cm-bond"><option value="">— chọn —</option>${opts}</select></label></div>
      <div id="cm-facts"></div>
      <div class="be-inputs"><label class="be-f"><span>Khuyến nghị</span><select name="rec"><option value="hold">Giữ</option><option value="buy">Mua thêm</option><option value="sell">Bán</option></select></label>
        <label class="be-f"><span>Giá trị hợp lý (giá sạch / 100)</span><input name="fair" inputmode="decimal"></label>
        <label class="be-f"><span>Thời hạn đầu tư</span><select name="horizon"><option value="">—</option><option value="short">≤ 1 năm</option><option value="medium">1–5 năm</option><option value="long">Tới đáo hạn</option></select></label>
        <label class="be-f"><span>Rủi ro lớn nhất</span><select name="risk"><option value="">—</option>${Q.RISKS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label>
        <label class="be-f"><span>Nếu lợi suất +100 bp, vị thế thay đổi (₫)</span><input name="shock" inputmode="decimal" placeholder="vd -1200000"></label>
        <label class="be-f"><span>Nếu vỡ nợ hôm nay, khoản lỗ (₫, số dương)</span><input name="defaultLoss" inputmode="decimal"></label></div>
      <fieldset class="be-choice"><legend>Kế hoạch quản trị rủi ro</legend>${Q.PLANS.map(([k, l]) => `<label><input type="checkbox" name="plan-${k}"> ${esc(l)}</label>`).join("")}</fieldset>`;
  }
  function committeeRead(fd) {
    const a = { plan: {} };
    for (const k of ["bondId", "rec", "fair", "horizon", "risk", "shock", "defaultLoss"]) a[k] = fd.get(k);
    for (const [k] of Q.PLANS) a.plan[k] = fd.get(`plan-${k}`) === "on";
    return a;
  }
  function committeeFacts(market) {
    const sel = document.getElementById("cm-bond"), box = document.getElementById("cm-facts");
    if (!sel || !box) return;
    const show = () => {
      const q = M.quote(market, sel.value);
      if (!q) { box.innerHTML = ""; return; }
      const b = q.bond, rat = q.rating === "GOV" ? "Chính phủ (spread 0)" : `${q.rating}: spread trung bình hạng ${bp(M.RATING[q.rating === "D" ? "CCC" : q.rating].s)}, điều chỉnh thứ tự ưu tiên ${bp(M.SENIORITY[b.seniority].add)}`;
      box.innerHTML = `<dl class="be-givens"><div><dt>Ngày định giá</dt><dd>${dmy(market.date)}</dd></div><div><dt>Đường par TPCP</dt><dd>${market.curve.par.map((p, i) => `${M.TENORS[i]}Y ${pct(p)}`).join(" · ")}</dd></div><div><dt>Giá thị trường</dt><dd>bid ${px(q.bid)} / ask ${px(q.ask)} · lãi dồn tích ${px(q.ai, 4)} · YTM ${pct(q.ytm)}</dd></div>
        <div><dt>Điều khoản</dt><dd>${b.frn ? "Thả nổi" : "Coupon " + pct(b.coupon)} · đáo hạn ${dmy(b.maturity)} · ${M.SENIORITY[b.seniority].name} · thu hồi giả định khi vỡ nợ ${pct(M.SENIORITY[b.seniority].rr, 0)}</dd></div><div><dt>Spread tham chiếu cho giá trị hợp lý</dt><dd>${rat}</dd></div></dl>
        <p class="be-muted">Gợi ý: giá trị hợp lý = định giá trên đường spot với spread tham chiếu (Curve Lab). Tác động +100 bp = định giá lại ở YTM + 1%.</p>`;
    };
    sel.onchange = show; show();
  }
  function committee() {
    const s = slot("free");
    shell("committee", hd("Investment Committee", "Hội đồng đầu tư", "Bảo vệ một vị thế 200 trái phiếu trên thị trường Giao dịch tự do. Hội đồng chấm theo tiêu chí công khai: độ chính xác (đối chiếu engine), lập luận, quản trị rủi ro, tuân thủ (quỹ chỉ mua mới hạng đầu tư), chất lượng quyết định."),
      `<form class="be-card be-form" id="cm-form" autocomplete="off">${committeeForm(s.market)}<div class="be-actions"><button type="submit" class="be-btn gold">Trình Hội đồng</button></div></form><section id="be-result"></section>`);
    committeeFacts(s.market);
    const f = document.getElementById("cm-form");
    f.onsubmit = e => { e.preventDefault(); const r = Q.committeeCheck(committeeRead(new FormData(f)), s.market); document.getElementById("be-result").innerHTML = resultHtml(r, null, null, 0); };
  }

  // ================= CAREER =================
  function career() {
    const h = H(), L = Q.level(h.progress, endingScore()), ds = dataset(), wk = isoWeek(new Date());
    const rows = leaderboard(wk.id);
    shell("career", hd("Career Progression", "Sự nghiệp, thử thách và bảng xếp hạng", "XP chỉ tính từ điểm cao nhất của mỗi nhiệm vụ, theo sáu tiêu chí — không dựa riêng vào lợi nhuận."),
      `<section class="be-grid2"><div class="be-card"><h3>Lộ trình nghề nghiệp</h3><ol class="be-ladder">${Q.LEVELS.map(x => `<li class="${x.lv <= L.lv ? "ok" : ""} ${x.lv === L.lv ? "cur" : ""}"><b>Cấp ${x.lv} · ${esc(x.name)}</b><span>${x.xp} XP${x.ch ? ` · hoàn thành chương ${x.lv >= 7 ? x.ch - 1 : x.ch}` : ""}${x.ending ? " · kết thúc chương 7 từ “CIO vững vàng” trở lên" : ""}</span></li>`).join("")}</ol></div>
        <div class="be-card"><h3>Tiêu chí chấm điểm</h3><ul class="be-fb">${Object.values(Q.PARTS).map(p => `<li>${esc(p)}</li>`).join("")}</ul><p class="be-muted">Mỗi nhiệm vụ chỉ dùng những tiêu chí liên quan. Đạt khi trung bình ≥ 60%.</p>
          <h3>Dữ liệu thật (Replay)</h3>${ds ? `<p class="be-ok">${icon("check", 14)} ${esc(ds.meta.title)} · ${ds.points.length} tuần · ${esc(ds.meta.source)}</p>` : `<p class="be-muted">Chưa có dữ liệu. Nhập tệp đường cong TPCP (WiData) để chơi Replay lịch sử. Tệp chỉ lưu trên trình duyệt này.</p>`}
          <label class="be-btn ghost">${icon("upload", 15)} ${ds ? "Thay dữ liệu" : "Nhập dữ liệu WiData"}<input type="file" accept=".json" id="be-file" hidden></label><div id="be-import"></div></div></section>
      <section class="be-card"><h3>Thử thách danh mục</h3><div class="be-chs">${Q.CHALLENGES.map(c => { const s = h.slots["ch-" + c.id], run = s && s.account.meta.run, best = h.results.filter(r => r.slot === "ch-" + c.id).sort((a, b) => b.ret - a.ret)[0];
        return `<div class="be-chal"><b>${esc(c.name)}</b><p>${esc(c.desc)}</p><p class="be-muted">${run ? `Tuần ${run.week}/${run.weeks}${run.done ? " · đã kết thúc" : ""}` : "Chưa chơi"}${best ? ` · tốt nhất ${pct(best.ret)}${best.passed ? " ✓" : ""}` : ""}</p>
          <a class="be-btn sm" href="#/bond/terminal/ch-${c.id}">${run && !run.done ? "Tiếp tục" : "Vào chơi"}</a>${run ? ` <button type="button" class="be-btn sm ghost" data-be="resetslot" data-v="ch-${c.id}">Chơi lại</button>` : ""}</div>`; }).join("")}</div></section>
      <section class="be-card"><h3>Bảng xếp hạng (thiết bị này)</h3><div class="be-seg">${[["free", "Giao dịch tự do"], ["cup", "Giải đấu tuần " + wk.id], ["fund", "Quỹ CIO"], ["ch", "Thử thách"]].map(([k, l]) => `<button type="button" data-be="lb" data-v="${k}" class="${BE.lb === k ? "on" : ""}">${esc(l)}</button>`).join("")}</div>
        ${rows.length ? `<table class="be-t"><thead><tr><th>#</th><th>Người chơi</th><th>Vòng</th><th class="n">Lợi nhuận</th><th class="n">Sụt giảm tối đa</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.user === BE.pid ? "me" : ""}"><td>${r.ok ? i + 1 : "—"}</td><td>${esc(r.name)}</td><td>${esc(r.label)}</td><td class="n ${tone(r.ret)}">${pct(r.ret)}</td><td class="n">${pct(r.maxDD)}</td><td>${r.ok ? "" : chip("dữ liệu bị sửa", "red")}</td></tr>`).join("")}</tbody></table>` : `<p class="be-muted">Chưa có kết quả.</p>`}
        <p class="be-muted">Giải đấu tuần dùng cùng một hạt giống thị trường cho mọi người trong tuần và cùng luật chấm. Thi đấu trực tuyến nhiều người cần máy chủ — website tĩnh này chưa có.</p></section>
      <section class="be-card"><h3>Kết quả nhiệm vụ</h3><table class="be-t"><thead><tr><th>Nhiệm vụ</th><th class="n">Điểm cao nhất</th><th class="n">XP</th><th class="n">Lần nộp</th></tr></thead><tbody>${Q.MISSIONS.map(m => { const p = h.progress[m.id]; return `<tr><td>Ch.${m.ch} · ${esc(m.title)}</td><td class="n">${p && p.best != null ? Math.round(p.best * 100) + "%" : "—"}</td><td class="n">${p && p.best ? Math.round(m.xp * p.best) : 0}/${m.xp}</td><td class="n">${p ? p.tries || 0 : 0}</td></tr>`; }).join("")}</tbody></table></section>`);
    const file = document.getElementById("be-file");
    if (file) file.onchange = async () => {
      const box = document.getElementById("be-import"), f = file.files[0];
      if (!f) return;
      let v;
      try { v = M.validateCurveDataset(JSON.parse(await f.text())); } catch (e) { v = { ok: false, problems: ["Tệp không phải JSON hợp lệ"] }; }
      if (v.ok) { try { localStorage.setItem(DATA_KEY, await f.text()); } catch (e) { v = { ok: false, problems: ["Bộ nhớ trình duyệt đầy"] }; } }
      box.innerHTML = v.ok ? `<p class="be-ok">Đã nhập ${v.points.length} tuần: ${esc(v.meta.title)}${v.problems.length ? " · " + esc(v.problems.join("; ")) : ""}</p>` : `<p class="be-warn">${esc(v.problems.join("; "))}</p>`;
      if (v.ok) { delete H().slots.replay; save(); setTimeout(career, 800); }
    };
  }
  function leaderboard(week) {
    const out = [];
    for (const p of PROFILES.list) {
      let st = null;
      try { st = JSON.parse(localStorage.getItem(KEY(p.id)) || "null"); } catch (e) { st = null; }
      if (!st || !st.slots) continue;
      const add = (id, label) => { const s = st.slots[id]; if (!s || !s.account) return; const ok = s.account.userId === p.id && K.verify(s.account).ok;
        const perf = K.performance(s.account, s.market); out.push({ user: p.id, name: p.name, label, ret: perf.ret, maxDD: perf.maxDD, ok }); };
      if (BE.lb === "free") add("free", "Giao dịch tự do");
      if (BE.lb === "cup" && st.slots.cup && (st.slots.cup.account.label || "").includes(week)) add("cup", "Giải đấu tuần " + week);
      if (BE.lb === "fund") add("fund", "Quỹ CIO");
      if (BE.lb === "ch") for (const r of st.results || []) if (r.slot.startsWith("ch-")) out.push({ user: p.id, name: p.name, label: r.name + (r.passed ? " ✓" : ""), ret: r.ret, maxDD: r.maxDD, ok: r.ok !== false });
    }
    return out.sort((a, b) => (b.ok - a.ok) || (b.ret - a.ret));
  }

  // ---------- Clicks ----------
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-be]");
    if (!b || !b.closest(".be")) return;
    const act = b.dataset.be, v = b.dataset.v;
    if (act === "seen") { H().seen = true; save(); return hq(); }
    if (act === "calcopen") { if (typeof calcMount === "function") calcMount(); if (typeof calcOpen === "function") calcOpen(); return; }
    if (act === "filter") { BE.filter = v; document.querySelectorAll('[data-be="filter"]').forEach(x => x.classList.toggle("on", x.dataset.v === v)); return paintList(); }
    if (act === "sel") { BE.sel = v; BE.cid = null; paintList(); paintDetail(); return paintTicket(); }
    if (act === "tab") { BE.tab = v; document.querySelectorAll('[data-be="tab"]').forEach(x => x.classList.toggle("on", x.dataset.v === v)); return paintTab(); }
    if (act === "side") { BE.side = v; BE.cid = null; return paintTicket(); }
    if (act === "qty") { BE.qty = +v; BE.cid = null; const q = document.getElementById("bt-qty"); if (q) q.value = v; return paintEst(); }
    if (act === "order") return placeOrder();
    if (act === "step") return step(+v);
    if (act === "auto") {
      if (BE.auto) { clearInterval(BE.auto); BE.auto = null; }
      else BE.auto = setInterval(() => { if (!document.getElementById("bt-top")) return window.bondStop(); const s = slot(BE.slot), run = s.account.meta.run; if ((run && run.done) || (s.market.kind === "replay" && M.replayDone(s.market))) { window.bondStop(); return paintTerminal(false); } step(1); }, 1300);
      return paintTerminal(false);
    }
    if (act === "resetslot") {
      return confirmDialog({ title: "Đặt lại tài khoản này?", message: "Tài khoản và thị trường của chế độ này được tạo mới với 100.000.000 ₫. Kết quả các vòng đã hoàn thành vẫn được giữ.", confirmText: "Đặt lại", danger: true }).then(ok => {
        if (!ok) return; delete H().slots[v]; delete BE.flags[v]; makeSlot(v); save();
        if (v === "free" || location.hash.includes("/terminal/")) terminal(v); else career();
      });
    }
    if (act === "lab") {
      const L = BE.lab, p = L.cur.par;
      const ops = { up: () => p.map(x => x + 0.0025), down: () => p.map(x => x - 0.0025), steep: () => p.map((x, i) => x + [-0.002, -0.001, 0, 0.0015, 0.0025][i]), flat: () => p.map((x, i) => x + [0.002, 0.001, 0, -0.0015, -0.0025][i]),
        inv: () => { const m = (p[0] + p[4]) / 2; return p.map((x, i) => m + (m - x) * (i === 2 ? 0.5 : 1)); }, bfly: () => p.map((x, i) => x + [0, 0.002, 0.004, 0.002, 0][i]), reset: () => L.base.par.slice(),
        real: () => { const ds = dataset(); return ds ? ds.points[ds.points.length - 1].y.slice() : p; } };
      L.cur.par = ops[v]();
      return paintLab(true);
    }
    if (act === "calc") { BE.calc = v; document.querySelectorAll('[data-be="calc"]').forEach(x => x.classList.toggle("on", x.dataset.v === v)); return paintCalc(); }
    if (act === "rslot") return riskCenter(v);
    if (act === "scen") { BE.scen = v; return riskCenter(BE.riskSlot); }
    if (act === "lb") { BE.lb = v; return career(); }
  });
  // the mission form for the committee shows the bond's facts when one is chosen
  document.addEventListener("change", e => { if (e.target.id === "cm-bond" && BE.mid === "c7-committee") committeeFacts(slot("story").market); });
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches && e.target.matches('.be-mt tr[data-be="sel"]')) e.target.click(); });
})();

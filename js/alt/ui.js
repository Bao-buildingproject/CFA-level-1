// ============================================================
// alt/ui.js — Alternative Empire: The Capital Game (route #/alt)
// Main menu, new game, characters, headquarters, world map, portfolio, deal room,
// term-sheet negotiation, missions, risk centre, markets, performance report, academy,
// calculator, achievements, settings and saved games. Every number comes from the
// engine through alt/game.js; every button changes the saved game state.
// ============================================================
(function () {
  "use strict";
  const E = window.AltEngine, W = window.AltWorld, A = window.AltAssets, F = window.AltFund, C = window.AltContent, G = window.AltGame;
  const SLOTS = ["s1", "s2", "s3"];
  const KEY = (pid, k) => `cfaStudy_alt_${pid}_${k}`;
  const AE = { pid: null, G: null, slot: null, stamp: null, prefs: null, ui: { tab: {}, qi: 0, calc: "fee", lm: 1, nego: {}, prac: null, practiceQ: null } };

  // ---------- Formatting ----------
  const m$ = c => c == null || !isFinite(c) ? "—" : `${c < 0 ? "−" : ""}$${Math.abs(c / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  const pct = (x, d) => x == null || !isFinite(x) ? "—" : `${(x * 100).toFixed(d == null ? 2 : d)}%`;
  const fx = (x, d) => x == null || !isFinite(x) ? "—" : x.toFixed(d == null ? 2 : d);
  const tone = x => x > 0 ? "up" : x < 0 ? "down" : "";
  const chip = (t, cls, title) => `<span class="ae-chip ${cls || ""}"${title ? ` title="${esc(title)}"` : ""}>${t}</span>`;
  const SIM = () => chip("MÔ PHỎNG", "amber", "Kinh tế, giá và doanh nghiệp đều do mô hình tạo ra; tên doanh nghiệp, quỹ và nhân vật là hư cấu. Không phải dữ liệu thị trường thật.");
  const EST = chip("ƯỚC TÍNH", "violet", "Không có giá quan sát được: giá trị theo mô hình/thẩm định (Level 3), chưa thực hiện");
  const MKT = chip("GIÁ THỊ TRƯỜNG MÔ PHỎNG", "blue", "Tài sản có giá giao dịch (mô phỏng)");
  const person = id => C.PEOPLE[id] || { name: id, role: "", color: "#888" };
  const avatar = (id, s) => { const p = person(id), ini = p.name.split(" ").map(x => x[0]).join(""); return `<span class="ae-av" style="--c:${p.color};width:${s || 36}px;height:${s || 36}px" aria-hidden="true">${ini}</span>`; };
  const bar = (v, max, color) => `<span class="ae-bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;${color ? `background:${color}` : ""}"></i></span>`;
  const GLOSS = {
    "NAV": "Net asset value: tiền mặt + giá trị tài sản − nợ vay",
    "Unfunded": "Phần vốn đã cam kết nhưng GP chưa gọi — nghĩa vụ tương lai, không phải tài sản",
    "TVPI": "Total value to paid-in: (phân phối + NAV còn lại) / vốn đã góp",
    "DPI": "Distributions to paid-in: phân phối / vốn đã góp",
    "MOIC": "Multiple of invested capital: (giá trị đã thực hiện + chưa thực hiện) / vốn đầu tư",
    "IRR": "Lãi suất làm NPV các dòng tiền bằng 0; có thể không có hoặc có nhiều nghiệm",
    "TWR": "Time-weighted return: lợi nhuận theo thời gian, loại bỏ ảnh hưởng của dòng vốn vào/ra",
    "Coverage": "Độ phủ thanh khoản = (tiền mặt + tài sản thanh khoản + 50% bán thanh khoản + hạn mức còn lại) / gọi vốn dự kiến 4 quý"
  };
  const tip = k => `<abbr class="ae-tip" title="${esc(GLOSS[k] || "")}">${k}</abbr>`;
  const askAI = o => typeof tutorCtxId === "function" ? `<button type="button" class="ae-btn sm" data-tutor-ask="${tutorCtxId(o)}">${icon("chat", 14)} Hỏi CFA Tutor (AI)</button>` : "";

  // ---------- Saved games ----------
  function P() {
    const pid = PROFILES.active;
    if (AE.pid !== pid) {
      AE.pid = pid; AE.G = null; AE.slot = null;
      let p = null; try { p = JSON.parse(localStorage.getItem(KEY(pid, "prefs")) || "null"); } catch (e) { p = null; }
      AE.prefs = Object.assign({ sound: false, motion: "auto", tips: true, confirmEnd: true, cur: null }, p || {});
    }
    return AE.prefs;
  }
  function savePrefs() { try { localStorage.setItem(KEY(AE.pid, "prefs"), JSON.stringify(AE.prefs)); } catch (e) { /* ignore */ } }
  function raw(k) { try { return localStorage.getItem(KEY(AE.pid, k)); } catch (e) { return null; } }
  function loadSlot(k) {
    const r = raw(k); if (!r) return { ok: false, msg: "Ô lưu trống" };
    const res = G.deserialize(r);
    if (!res.ok) return res;
    AE.G = res.G; AE.slot = k; AE.stamp = res.G.updatedAt || 0; P().cur = k; savePrefs();
    if (res.G.tampered) toast("Tệp lưu không khớp mã kiểm tra hoặc sổ cái: ván này được đánh dấu đã chỉnh sửa", "error");
    return { ok: true };
  }
  function current() {
    P();
    if (!AE.G && AE.prefs.cur && raw(AE.prefs.cur)) loadSlot(AE.prefs.cur);
    return AE.G;
  }
  function save() {
    const g = AE.G; if (!g || !AE.slot) return false;
    const r = raw(AE.slot);
    if (r) { let st = null; try { st = JSON.parse(r).updatedAt; } catch (e) { st = null; } if (st && st !== AE.stamp) { AE.G = null; loadSlot(AE.slot); toast("Ván chơi vừa được lưu ở tab khác — đã tải bản mới nhất", "error"); return false; } }
    g.updatedAt = Date.now();
    try { localStorage.setItem(KEY(AE.pid, AE.slot), G.serialize(g)); AE.stamp = g.updatedAt; return true; }
    catch (e) { toast("Không lưu được: bộ nhớ trình duyệt đầy. Xóa bớt một ô lưu.", "error"); return false; }
  }
  window.altClearProfile = pid => { try { ["prefs", ...SLOTS].forEach(k => localStorage.removeItem(KEY(pid, k))); } catch (e) { /* ignore */ } if (AE.pid === pid) { AE.pid = null; AE.G = null; } };
  window.altStop = function () { closeModal(); };

  // ---------- Sound (off by default) ----------
  let actx = null;
  function blip(kind) {
    if (!P().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = kind === "bad" ? 220 : kind === "good" ? 660 : 440; g.gain.value = 0.04;
      o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.18); o.stop(actx.currentTime + 0.2);
    } catch (e) { /* no audio */ }
  }

  // ---------- Shell ----------
  const NAV = [["hq", "home", "Trụ sở"], ["missions", "flag", "Nhiệm vụ"], ["map", "globe", "Bản đồ"], ["deals", "search", "Deal Room"], ["portfolio", "layers", "Danh mục"],
    ["risk", "pulse", "Rủi ro"], ["events", "trend", "Thị trường"], ["report", "grid", "Báo cáo"], ["academy", "book", "Học viện"], ["calc", "calc", "Máy tính"],
    ["achievements", "star", "Thành tựu"], ["saves", "save", "Lưu/Tải"], ["settings", "settings", "Cài đặt"]];
  function still() { const m = P().motion; return m === "reduce" || (m === "auto" && window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function shell(page, body) {
    const g = AE.G;
    view.innerHTML = `<div class="ae ${still() ? "ae-still" : ""}" id="ae-root"><nav class="ae-rail" aria-label="Alternative Empire">
        <a class="ae-logo" href="#/alt" title="Menu chính">${logo(34)}</a>
        ${NAV.map(([p, ic, l]) => `<a class="ae-nav ${page === p ? "on" : ""}" href="#/alt/${p}"><span>${icon(ic, 18)}</span><em>${l}</em></a>`).join("")}
        <a class="ae-nav ae-exit" href="#/dashboard" title="Về trang học"><span>${icon("back", 18)}</span><em>Thoát</em></a>
      </nav><main class="ae-main">${g ? topbar(g) : ""}${body}</main></div>`;
  }
  function topbar(g) {
    const ch = C.CHAPTERS[g.chapter - 1], nav = F.nav(g.fund), cr = C.CAREER[g.career - 1];
    const ret = nav / g.fund.initial - 1;
    return `<header class="ae-top">
      <div class="ae-when"><b>${W.label(g.q)}</b><span>Chương ${ch.n} · ${esc(ch.title)}</span></div>
      <div class="ae-kpis"><div><small>${tip("NAV")}</small><b>${m$(nav)}</b><em class="${tone(ret)}">${ret >= 0 ? "+" : ""}${pct(ret, 1)}</em></div>
        <div class="hide-sm"><small>Tiền mặt</small><b>${m$(g.fund.cash)}</b></div>
        <div class="hide-sm"><small>${tip("Unfunded")}</small><b>${m$(F.unfunded(g.fund))}</b></div>
        <div class="hide-sm"><small>Niềm tin HĐQT</small><b>${Math.round(g.trust)}</b>${bar(g.trust, 100, g.trust < 30 ? "var(--red)" : "")}</div>
        <a class="ae-rank hide-md" href="#/alt/achievements"><small>Cấp ${g.career}</small><b>${esc(cr.name)}</b></a></div>
      ${g.status === "lost" ? `<a class="ae-btn danger" href="#/alt/hq">Ván đã kết thúc</a>` : `<button type="button" class="ae-btn gold" data-ae="endq">${icon("next", 16)} Kết thúc quý</button>`}
    </header>`;
  }
  function logo(s) {
    return `<svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#0B1220"/><path d="M8 30 20 8l12 22" fill="none" stroke="#C9A86A" stroke-width="2.6" stroke-linejoin="round"/><path d="M13 22h14" stroke="#F6F4F0" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="8" r="2.6" fill="#E2C995"/></svg>`;
  }
  const hd = (kicker, title, sub, right) => `<section class="ae-hd"><div><p class="ae-kicker">${kicker}</p><h1>${title}</h1>${sub ? `<p class="ae-sub">${sub}</p>` : ""}</div>${right || ""}</section>`;
  function need() { if (current()) return true; location.hash = "#/alt"; toast("Hãy bắt đầu ván mới hoặc tải một ván đã lưu", "error"); return false; }

  // ---------- Modal ----------
  function modal(html, wide) {
    closeModal();
    const o = document.createElement("div");
    o.className = "ae-modal-wrap"; o.id = "ae-modal";
    o.innerHTML = `<div class="ae-modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}<button type="button" class="ae-x" data-ae="close" aria-label="Đóng">${icon("x", 18)}</button></div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add("show"));
    const f = o.querySelector("button, a, input"); if (f) f.focus();
  }
  function closeModal() { const o = document.getElementById("ae-modal"); if (o) o.remove(); }

  // ---------- Charts (inline SVG; points carry a tooltip) ----------
  function line(series, o) {
    o = o || {};
    const Wd = 640, H = o.h || 200, pl = 56, pr = 12, pt = 12, pb = 26;
    const all = series.flatMap(s => s.pts.map(p => p[1])).filter(isFinite);
    if (!all.length) return `<p class="ae-muted">Chưa có dữ liệu — kết thúc vài quý để thấy biểu đồ.</p>`;
    let lo = Math.min(...all, o.zero ? 0 : Infinity), hi = Math.max(...all, o.zero ? 0 : -Infinity); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const xs = series.flatMap(s => s.pts.map(p => p[0])), x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1);
    const X = x => pl + (x - x0) / (x1 - x0) * (Wd - pl - pr), Y = y => pt + (hi - y) / (hi - lo) * (H - pt - pb);
    const fy = o.fy || (v => fx(v)), fxl = o.fx || (x => W.label(x));
    const ticks = [lo, (lo + hi) / 2, hi];
    return `<figure class="ae-chart"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(o.label || "Biểu đồ")}">
      ${ticks.map(t => `<line x1="${pl}" x2="${Wd - pr}" y1="${Y(t)}" y2="${Y(t)}" class="ae-gl"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end" class="ae-axis">${esc(fy(t))}</text>`).join("")}
      ${o.zero && lo < 0 && hi > 0 ? `<line x1="${pl}" x2="${Wd - pr}" y1="${Y(0)}" y2="${Y(0)}" class="ae-zero"/>` : ""}
      <text x="${pl}" y="${H - 6}" class="ae-axis">${esc(fxl(x0))}</text><text x="${Wd - pr}" y="${H - 6}" text-anchor="end" class="ae-axis">${esc(fxl(x1))}</text>
      ${series.map(s => `<polyline fill="none" stroke="${s.color}" stroke-width="2.2" ${s.dash ? 'stroke-dasharray="5 4"' : ""} points="${s.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}"/>
        ${s.pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.2" fill="${s.color}" class="ae-pt"><title>${esc(s.name)} · ${esc(fxl(p[0]))}: ${esc(fy(p[1]))}</title></circle>`).join("")}`).join("")}
      </svg><figcaption>${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</figcaption></figure>`;
  }
  function hbars(items, fmt) {
    const max = Math.max(1e-9, ...items.map(i => Math.abs(i.v)));
    return `<div class="ae-hbars">${items.map(i => `<div class="ae-hb"><span class="l">${esc(i.l)}</span><span class="b"><i style="width:${Math.abs(i.v) / max * 100}%;background:${i.c || "var(--gold)"}"></i></span><span class="v ${i.tone || ""}">${fmt(i.v)}</span></div>`).join("")}</div>`;
  }

  // ======================= Entry =======================
  window.renderAlt = function (a, b) {
    document.body.classList.add("ae-mode");
    if (!E || !W || !A || !F || !C || !G) { view.innerHTML = `<div class="callout danger">Không tải được Alternative Empire. Hãy tải lại trang.</div>`; return; }
    P(); current();
    const pages = { new: newGameScreen, intro, hq, missions, m: () => mission(b), map, deals, deal: () => deal(b), negotiate: () => negotiate(b), portfolio, h: () => holdingScreen(b),
      risk, events, report, academy, calc, achievements, saves, settings };
    if (!a) return menu();
    const fn = pages[a];
    if (!fn) return menu();
    if (["academy", "calc", "saves", "settings", "new"].includes(a)) return fn();
    if (!need()) return;
    fn();
  };

  // ======================= 1. Main menu =======================
  function menu() {
    const g = current();
    view.innerHTML = `<div class="ae ae-menu ${still() ? "ae-still" : ""}" id="ae-root"><div class="ae-sky" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--d:${6 + (i % 5) * 2}s;--s:${(i % 3) + 1}px"></i>`).join("")}</div>
      <div class="ae-menu-in">
        <div class="ae-brand">${logo(64)}<div><p class="ae-kicker">Aurelion Capital · 2027</p><h1>ALTERNATIVE EMPIRE</h1><p class="ae-tag">THE CAPITAL GAME</p></div></div>
        <p class="ae-lead">Trò chơi quản lý quỹ đầu tư thay thế dựa trên 7 module Alternative Investments của CFA Level I (2027). 100 triệu USD vốn mô phỏng, bảy chương, năm năm thị trường — và một Hội đồng chấm cả lợi nhuận, rủi ro, thanh khoản lẫn hiểu biết.</p>
        <div class="ae-menu-btns">
          ${g ? `<a class="ae-btn gold lg" href="#/alt/hq">${icon("play", 18)} Tiếp tục — ${esc(g.name)}, ${W.label(g.q)}, chương ${g.chapter}${g.status === "lost" ? " (đã kết thúc)" : ""}</a>` : ""}
          <a class="ae-btn ${g ? "" : "gold"} lg" href="#/alt/new">${icon("plus", 18)} Ván mới</a>
          <a class="ae-btn lg" href="#/alt/saves">${icon("save", 18)} Tải game</a>
          <a class="ae-btn lg" href="#/alt/academy">${icon("book", 18)} Học viện</a>
          <a class="ae-btn lg" href="#/alt/settings">${icon("settings", 18)} Cài đặt</a>
          ${g ? `<a class="ae-btn lg" href="#/alt/achievements">${icon("star", 18)} Thành tựu</a>` : ""}
        </div>
        <p class="ae-fine">Không dùng tiền thật, không giao dịch thật. Doanh nghiệp, quỹ và nhân vật là hư cấu; kinh tế và giá là mô phỏng. Không được CFA Institute tài trợ hay công nhận. <a href="#/dashboard">Về trang học</a></p>
      </div></div>`;
  }

  // ======================= 2. New game =======================
  function newGameScreen() {
    P();
    const seed = AE.ui.seed || (Math.floor(Math.random() * 900000) + 100000);
    AE.ui.seed = seed;
    const used = SLOTS.map(k => ({ k, r: raw(k) }));
    shell("", `${hd("Ván mới", "Nhận nhiệm vụ tại Aurelion Capital", "Chọn tên, độ khó và ô lưu. Cùng một mã ngẫu nhiên (seed) và cùng quyết định sẽ cho cùng kết quả.")}
      <form class="ae-card ae-form" id="ae-newform">
        <label><span>Tên người chơi</span><input name="name" maxlength="40" value="${esc(activeProfile().name || "Portfolio Manager")}" required></label>
        <fieldset><legend>Độ khó</legend>${Object.entries(W.DIFFICULTY).map(([k, d], i) => `<label class="ae-radio"><input type="radio" name="diff" value="${k}" ${i === 1 ? "checked" : ""}><b>${esc(d.name)}</b><small>${k === "analyst" ? "Cú sốc nhẹ hơn, ít sự kiện" : k === "crisis" ? "Suy thoái và đình lạm nhiều hơn, sự kiện dày" : "Cân bằng"}</small></label>`).join("")}</fieldset>
        <label><span>Seed (mã ngẫu nhiên)</span><input name="seed" inputmode="numeric" pattern="[0-9]{1,9}" value="${seed}"></label>
        <fieldset><legend>Ô lưu</legend>${used.map(({ k, r }, i) => `<label class="ae-radio"><input type="radio" name="slot" value="${k}" ${k === ((used.find(x => !x.r) || used[0]).k) ? "checked" : ""}><b>Ô ${i + 1}</b><small>${r ? "Đang có ván — sẽ bị ghi đè" : "Trống"}</small></label>`).join("")}</fieldset>
        <div class="ae-row"><button class="ae-btn gold" type="submit">${icon("play", 16)} Bắt đầu</button><a class="ae-btn" href="#/alt">Hủy</a></div>
      </form>`);
  }
  async function startGame(fd) {
    const seed = parseInt(fd.get("seed"), 10), slot = fd.get("slot"), name = String(fd.get("name") || "").trim();
    if (!name) return toast("Hãy nhập tên", "error");
    if (!(seed > 0 && seed < 1e9)) return toast("Seed là số nguyên dương tối đa 9 chữ số", "error");
    if (!SLOTS.includes(slot)) return toast("Chọn ô lưu", "error");
    if (raw(slot) && !(await confirmDialog({ title: "Ghi đè ô lưu?", message: "Ván đang có trong ô này sẽ bị thay thế.", confirmText: "Ghi đè", danger: true }))) return;
    const g = G.newGame({ seed, difficulty: fd.get("diff"), name, now: Date.now() });
    g.updatedAt = Date.now();
    AE.G = g; AE.slot = slot; AE.stamp = null; P().cur = slot; savePrefs();
    try { localStorage.removeItem(KEY(AE.pid, slot)); } catch (e) { /* ignore */ }
    save(); AE.ui.seed = null; blip("good");
    location.hash = "#/alt/intro";
  }

  // ======================= 3. Characters =======================
  function intro() {
    const g = AE.G, ch = C.CHAPTERS[g.chapter - 1];
    shell("", `${hd("Năm 2027 · Aurelion Capital", "Những người bạn sẽ làm việc cùng", "Mỗi người có mục tiêu riêng — và đôi khi xung đột lợi ích. Quyết định cuối cùng thuộc về bạn.")}
      <section class="ae-people">${Object.entries(C.PEOPLE).map(([id, p]) => `<article class="ae-card ae-person">${avatar(id, 54)}<div><h3>${esc(p.name)}</h3><p class="ae-role">${esc(p.role)}</p><p>${esc(p.line)}</p><p class="ae-muted"><b>Muốn:</b> ${esc(p.wants)}</p></div></article>`).join("")}</section>
      <section class="ae-card"><h2>Chương ${ch.n}: ${esc(ch.title)} <small>${esc(ch.vi)}</small></h2>${talk(ch.intro)}
        <a class="ae-btn gold" href="#/alt/hq">${icon("next", 16)} Vào trụ sở</a></section>`);
  }
  const talk = lines => `<div class="ae-talk">${lines.map(([who, t]) => `<div class="ae-say">${avatar(who, 38)}<div><b>${esc(person(who).name)}</b><span>${esc(person(who).role)}</span><p>${esc(t)}</p></div></div>`).join("")}</div>`;

  // ======================= 4. Headquarters =======================
  function hq() {
    const g = AE.G, ch = C.CHAPTERS[g.chapter - 1], cr = G.chapterReady(g), b = g.board || G.scorecard(g);
    const ms = C.MISSIONS.filter(m => m.ch === g.chapter);
    const open = g.decisions.filter(d => !d.done);
    const nav = F.nav(g.fund), liq = F.liquidity(g.fund);
    const navPts = g.fund.navHist.map(r => [r.q, r.idx * 100]), bPts = g.fund.navHist.map(r => [r.q, (r.benchIdx || 1) * 100]);
    const lost = g.status === "lost", fin = g.status === "finished";
    const nextM = ms.find(m => !(g.missions[m.id] && g.missions[m.id].done) && G.missionOpen(g, m).ok);
    shell("hq", `${hd(`Trụ sở · ${W.label(g.q)}`, `Xin chào, ${esc(g.name)}`, `${esc(C.CAREER[g.career - 1].name)} · Độ khó ${esc(W.DIFFICULTY[g.difficulty].name)} · seed ${g.seed}`, SIM())}
      ${lost ? `<section class="ae-card ae-alert"><h2>${icon("alert", 18)} Ván chơi kết thúc</h2><p>${esc(g.lost.text)}</p><div class="ae-row"><a class="ae-btn gold" href="#/alt/new">Ván mới</a><a class="ae-btn" href="#/alt/saves">Tải ván đã lưu</a><a class="ae-btn" href="#/alt/report">Xem báo cáo</a></div></section>` : ""}
      ${fin ? endingCard(g) : ""}
      ${open.length ? `<section class="ae-card ae-decisions"><h2>${icon("flag", 18)} Cần quyết định (${open.length})</h2>${open.map(decisionCard).join("")}</section>` : ""}
      <section class="ae-grid ae-g3">
        <article class="ae-card ae-chap"><p class="ae-kicker">Chương ${ch.n} · LM${ch.lm}</p><h2>${esc(ch.title)}</h2><p class="ae-muted">${esc(ch.vi)} — ${esc(C.LMS[ch.lm].title)}</p>
          <ul class="ae-mlist">${ms.map(m => { const s = g.missions[m.id], op = G.missionOpen(g, m); return `<li class="${s && s.done ? "done" : op.ok ? "" : "lock"}"><a href="#/alt/m/${m.id}">${icon(s && s.done ? "check" : op.ok ? "target" : "lock", 16)}<span>${esc(m.title)}</span>${s && s.done ? `<em>${Math.round(s.score * 100)}</em>` : op.ok ? "" : `<small>${esc(op.reason)}</small>`}</a></li>`; }).join("")}</ul>
          <p class="ae-muted">Thời gian trong chương: ${cr.qs}/${cr.minQ} quý tối thiểu. ${cr.left.length ? `Còn ${cr.left.length} nhiệm vụ.` : cr.qs < cr.minQ ? "Kết thúc thêm quý để Hội đồng họp." : "Hội đồng sẽ họp cuối quý này."}</p>
          ${nextM ? `<a class="ae-btn gold" href="#/alt/m/${nextM.id}">${icon("play", 16)} ${esc(nextM.title)}</a>` : ""}</article>
        <article class="ae-card"><p class="ae-kicker">Hội đồng quản trị</p><h2 class="ae-big">${Math.round(b.total)}<small>/100</small></h2>
          ${[["Hiệu quả (so với chuẩn 60/40)", b.perf], ["Rủi ro", b.risk], ["Thanh khoản", b.liq], ["Tuân thủ mandate", b.comp], ["Uy tín", b.rep], ["Hiểu biết CFA", b.know]].map(([l, v]) => `<div class="ae-score"><span>${l}</span>${bar(v, 100, v < 40 ? "var(--red)" : v < 60 ? "var(--amber)" : "")}<b>${Math.round(v)}</b></div>`).join("")}
          <p class="ae-muted">Niềm tin: ${Math.round(g.trust)} · Uy tín: ${g.rep} · Vay khẩn cấp: ${g.emergencies}/2</p>
          ${b.d.breaches.length ? `<p class="ae-warn">${icon("alert", 14)} ${b.d.breaches.map(esc).join("<br>")}</p>` : `<p class="ae-ok">${icon("check", 14)} Không vi phạm mandate</p>`}</article>
        <article class="ae-card"><p class="ae-kicker">Quỹ · ${tip("NAV")}</p><h2 class="ae-big">${m$(nav)}</h2>
          <dl class="ae-dl"><div><dt>${tip("TWR")} từ đầu</dt><dd class="${tone(b.d.twr)}">${pct(b.d.twr)}</dd></div><div><dt>Chuẩn 60/40</dt><dd>${pct(b.d.bench)}</dd></div>
            <div><dt>Tiền mặt</dt><dd>${m$(g.fund.cash)}</dd></div><div><dt>${tip("Unfunded")}</dt><dd>${m$(liq.unfunded)}</dd></div>
            <div><dt>${tip("Coverage")}</dt><dd class="${liq.coverage < 1 ? "down" : ""}">${isFinite(liq.coverage) ? fx(liq.coverage) + "×" : "∞"}</dd></div><div><dt>Hạn mức tín dụng</dt><dd>${m$(g.fund.debt)} / ${m$(g.fund.credit.limit)}</dd></div></dl>
          ${line([{ name: "Aurelion (TWR)", color: "#C9A86A", pts: navPts }, { name: "Chuẩn 60/40", color: "#7FA8E6", pts: bPts, dash: true }], { h: 150, fy: v => v.toFixed(0), label: "Chỉ số NAV" })}</article>
      </section>
      ${advisor(g, liq, b, nextM)}
      <section class="ae-card"><h2>${icon("chat", 18)} Hộp thư</h2><ul class="ae-inbox">${g.inbox.slice(0, 10).map(m => `<li class="k-${m.kind}">${avatar(m.from, 30)}<div><b>${esc(m.title)}</b><small>${W.label(m.q)} · ${esc(person(m.from).name)}</small><p>${esc(m.text)}</p></div></li>`).join("")}</ul></section>`);
  }
  // Adviser: rules over the current state (not AI); the CFA Tutor buttons in questions are the AI.
  function advisor(g, liq, b, nextM) {
    if (g.status === "lost") return "";
    const f = g.fund, nav = F.nav(f), tips = [], next = F.forecastCalls(f, 1)[0];
    if (next > f.cash) tips.push(["sophia", `Quý tới dự kiến bị gọi vốn ${m$(next)} nhưng tiền mặt chỉ ${m$(f.cash)}. Bán bớt tài sản thanh khoản hoặc dùng hạn mức trước khi kết thúc quý.`, "#/alt/risk"]);
    else if (liq.need > 0 && liq.coverage < 1) tips.push(["sophia", `Độ phủ thanh khoản ${fx(liq.coverage)}× < 1: nguồn sẵn có không đủ cho nghĩa vụ góp vốn 4 quý tới.`, "#/alt/risk"]);
    if (b.d.breaches.length) tips.push(["sophia", `Đang vi phạm mandate: ${b.d.breaches[0]}.`, "#/alt/risk"]);
    const open = g.decisions.filter(d => !d.done).length;
    if (open) tips.push(["eleanor", `Có ${open} quyết định đang chờ — nếu không chọn, phương án mặc định sẽ được áp dụng cuối quý.`, "#/alt/hq"]);
    const weak = G.weaknesses(g).find(w => w.m < 0.6);
    if (weak) tips.push(["marcus", `Mức thành thạo LM${weak.lm} mới ${pct(weak.m, 0)}. Ôn trong Học viện trước khi Hội đồng đánh giá — kiến thức là điều kiện thăng chức.`, "#/alt/academy"]);
    if (g.chapter >= 2 && nav > 0 && f.cash / nav > 0.45) tips.push(["marcus", `Tiền mặt chiếm ${pct(f.cash / nav, 0)} NAV: lợi nhuận bị kéo xuống (cash drag). Cân nhắc cơ hội phù hợp mandate.`, "#/alt/deals"]);
    const cr = G.chapterReady(g);
    if (nextM) tips.push(["marcus", `Việc tiếp theo: “${nextM.title}”.`, `#/alt/m/${nextM.id}`]);
    else if (!cr.ready && cr.qs < cr.minQ && g.status === "active") tips.push(["eleanor", `Nhiệm vụ chương đã xong. Hội đồng họp sau ${cr.minQ - cr.qs} quý nữa — hãy kết thúc quý.`, "#/alt/hq"]);
    if (!tips.length) return "";
    return `<section class="ae-card"><h2>${icon("target", 18)} Cố vấn <small>gợi ý theo quy tắc của game, không phải AI</small></h2><ul class="ae-inbox">${tips.slice(0, 5).map(([who, t, href]) => `<li>${avatar(who, 28)}<div><p>${esc(t)}</p><a href="${href}">Mở</a></div></li>`).join("")}</ul></section>`;
  }
  function decisionCard(d) {
    return `<div class="ae-dec">${avatar(d.from, 34)}<div><b>${esc(d.title)}</b><p>${esc(d.text)}</p><div class="ae-opts">${d.options.map(o => `<button type="button" class="ae-opt" data-ae="decide" data-d="${esc(d.id)}" data-o="${esc(o.id)}"><b>${esc(o.label)}</b><small>${esc(o.desc)}</small>${o.id === d.def ? `<em>mặc định nếu không chọn</em>` : ""}</button>`).join("")}</div></div></div>`;
  }
  function endingCard(g) {
    const e = C.ENDINGS.find(x => x.id === g.ending) || C.ENDINGS[3];
    return `<section class="ae-card ae-ending"><p class="ae-kicker">Kết thúc chiến dịch · điểm ${g.finalScore}/100</p><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><p class="ae-muted">Bạn có thể tiếp tục quản lý quỹ tự do (kết thúc quý), xem báo cáo hoặc bắt đầu ván mới với độ khó cao hơn.</p></section>`;
  }

  // ======================= Quarter end =======================
  async function endQuarter() {
    const g = AE.G; if (!g || g.status === "lost") return;
    const warn = G.preflight(g);
    if (warn.length && P().confirmEnd && !(await confirmDialog({ title: `Kết thúc ${W.label(g.q)}?`, message: warn.map(esc).join("<br><br>"), confirmText: "Kết thúc quý" }))) return;
    const btn = document.querySelector('[data-ae="endq"]'); if (btn) { btn.disabled = true; btn.textContent = "Đang mô phỏng…"; }
    let r;
    try { r = G.endQuarter(g); } catch (e) { toast("Lỗi mô phỏng: " + e.message, "error"); if (btn) btn.disabled = false; return; }
    save();
    blip(r.nav && r.nav.ret >= 0 ? "good" : "bad");
    rerender();
    const b = r.board;
    modal(`<p class="ae-kicker">Báo cáo quý ${W.label(r.q)}</p><h2>${m$(r.nav.nav)} <small class="${tone(r.nav.ret)}">${r.nav.ret >= 0 ? "+" : ""}${pct(r.nav.ret)}</small></h2>
      <p class="ae-muted">Chuẩn 60/40 quý này: ${pct(r.nav.bench)} · Điểm Hội đồng ${Math.round(b.total)} · Niềm tin ${Math.round(g.trust)} · Kinh tế: ${esc(W.REGIMES[g.world.regime].name)} ${SIM()}</p>
      ${r.review ? `<div class="ae-callout ${r.review.pass ? "ok" : "bad"}"><b>Đánh giá chương ${r.review.ch}: ${r.review.pass ? "Đạt" : "Cảnh cáo"}</b> — điểm ${Math.round(r.review.sc.total)}/100. ${r.review.pass ? `Chương ${r.review.ch + 1} đã mở.` : "Hai lần cảnh cáo liên tiếp sẽ bị thay thế."}</div>` : ""}
      ${g.status === "lost" ? `<div class="ae-callout bad"><b>Kết thúc:</b> ${esc(g.lost.text)}</div>` : ""}
      ${r.events.length ? `<h3>Sự kiện</h3>${r.events.map(e => `<div class="ae-say">${avatar(e.from, 32)}<div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div></div>`).join("")}` : `<p class="ae-muted">Không có sự kiện lớn trong quý.</p>`}
      ${r.auto.length ? `<h3>Áp dụng mặc định</h3><ul>${r.auto.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${r.news.length ? `<h3>Diễn biến danh mục</h3><ul class="ae-news">${r.news.slice(0, 14).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <p class="${r.verify ? "ae-ok" : "ae-warn"}">${r.verify ? `${icon("check", 14)} <span>Sổ cái đối soát khớp</span>` : `${icon("alert", 14)} <span>Sổ cái không khớp</span>`}</p>
      <div class="ae-row"><button type="button" class="ae-btn gold" data-ae="close">Tiếp tục</button><a class="ae-btn" href="#/alt/report" data-ae="close">Báo cáo chi tiết</a></div>`, true);
  }
  function rerender() { if (typeof router === "function") router(); }

  // ======================= Missions =======================
  function missions() {
    const g = AE.G;
    shell("missions", `${hd("Nhiệm vụ", "Bảy chương, 30 nhiệm vụ", "Mỗi nhiệm vụ gắn với một Learning Module, một Learning Outcome và một khái niệm. Chương sau mở khi Hội đồng đánh giá chương trước.")}
      ${C.CHAPTERS.map(ch => `<section class="ae-card ${ch.n > g.chapter ? "ae-locked" : ""}"><div class="ae-split"><div><p class="ae-kicker">Chương ${ch.n} · LM${ch.lm} · ${esc(C.LMS[ch.lm].title)}</p><h2>${esc(ch.title)} <small>${esc(ch.vi)}</small></h2></div>${g.chapterDone[ch.n] != null ? chip("Hoàn thành", "green") : ch.n === g.chapter ? chip("Đang diễn ra", "gold") : ch.n > g.chapter ? chip("Chưa mở", "") : ""}</div>
        <div class="ae-mgrid">${C.MISSIONS.filter(m => m.ch === ch.n).map(m => { const s = g.missions[m.id], op = G.missionOpen(g, m); return `<a class="ae-mcard ${s && s.done ? "done" : op.ok ? "" : "lock"}" href="#/alt/m/${m.id}"><b>${esc(m.title)}</b><small>${esc(m.concept)}</small><span>${"★".repeat(m.diff)}${"☆".repeat(3 - m.diff)} ${s && s.done ? `· ${Math.round(s.score * 100)} điểm` : op.ok ? "· mở" : "· " + esc(op.reason)}</span></a>`; }).join("")}</div></section>`).join("")}`);
  }
  function mission(id) {
    const g = AE.G, m = C.MISSIONS.find(x => x.id === id);
    if (!m) return missions();
    const op = G.missionOpen(g, m), s = G.mstate(g, id), cur = G.stepIndex(g, m), lmo = C.LMS[m.lm];
    const head = hd(`Chương ${m.ch} · LM${m.lm} · ${"★".repeat(m.diff)}`, esc(m.title), `${esc(m.concept)}${m.lo != null ? ` · LO: ${esc(lmo.los[m.lo])}` : ""}`, s.done ? chip(`Hoàn thành · ${Math.round(s.score * 100)} điểm`, "green") : "");
    if (!op.ok) return shell("missions", `${head}<section class="ae-card"><p>${icon("lock", 16)} ${esc(op.reason)}</p><a class="ae-btn" href="#/alt/missions">Danh sách nhiệm vụ</a></section>`);
    const body = m.steps.map((st, i) => {
      const done = s.steps[i] && s.steps[i].done;
      if (i !== cur && !done) return `<section class="ae-card ae-step lock"><p class="ae-muted">${icon("lock", 14)} Bước ${i + 1}: ${stepName(st)}</p></section>`;
      return `<section class="ae-card ae-step ${done ? "done" : "now"}" id="ae-step-${i}"><p class="ae-kicker">Bước ${i + 1}/${m.steps.length} · ${stepName(st)}${done ? " · xong" : ""}</p>${stepBody(g, m, st, i, done)}</section>`;
    }).join("");
    const nextM = C.MISSIONS[C.MISSIONS.indexOf(m) + 1];
    shell("missions", `${head}${body}${s.done ? `<section class="ae-row">${nextM && nextM.ch <= g.chapter ? `<a class="ae-btn gold" href="#/alt/m/${nextM.id}">Nhiệm vụ tiếp: ${esc(nextM.title)}</a>` : ""}<a class="ae-btn" href="#/alt/hq">Về trụ sở</a></section>` : ""}`);
  }
  const stepName = st => ({ talk: "Hội thoại", classify: "Phân loại", choice: "Quyết định", deals: "Đầu tư thật", compute: "Tính toán", quiz: "Kiểm tra A/B/C", review: "Hội đồng tổng kết" })[st.type];
  function stepBody(g, m, st, i, done) {
    const saved = G.mstate(g, m.id).steps[i] || {};
    if (st.type === "talk") return `${talk(st.lines)}${done ? "" : `<button type="button" class="ae-btn gold" data-ae="step" data-m="${m.id}" data-i="${i}">Tiếp tục</button>`}`;
    if (st.type === "classify") {
      const ans = saved.ans || {};
      return `<p>${esc(st.prompt)}</p><div class="ae-classify">${st.items.map((it, k) => `<div class="ae-cl ${done ? (ans[k] === it[1] ? "ok" : "bad") : ""}"><span>${esc(it[0])}</span>
        ${done ? `<b>${esc((st.options.find(o => o[0] === ans[k]) || ["", "—"])[1])}</b>${ans[k] === it[1] ? "" : `<em>Đúng: ${esc(st.options.find(o => o[0] === it[1])[1])}</em>`}` : `<select data-k="${k}" aria-label="${esc(it[0])}"><option value="">— chọn —</option>${st.options.map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select>`}</div>`).join("")}</div>
        ${done ? `<div class="ae-callout"><b>Giải thích.</b> ${esc(st.explain)}</div>` : `<button type="button" class="ae-btn gold" data-ae="classify" data-m="${m.id}" data-i="${i}">Nộp</button>`}`;
    }
    if (st.type === "choice") {
      return `<p>${esc(st.prompt)}</p><div class="ae-opts">${st.options.map(o => `<button type="button" class="ae-opt ${done ? (o.id === saved.ans ? "picked" : "") + (o.ok ? " right" : "") : ""}" ${done ? "disabled" : `data-ae="choice" data-m="${m.id}" data-i="${i}" data-o="${o.id}"`}><b>${esc(o.label)}</b>${done && (o.id === saved.ans || o.ok) ? `<small>${esc(o.fb || "")}</small>` : ""}</button>`).join("")}</div>`;
    }
    if (st.type === "deals") {
      return `<p>${esc(st.prompt)}</p><div class="ae-dlist">${st.deals.map(id => dealRow(g, id)).join("")}</div>
        ${done ? "" : `<button type="button" class="ae-btn gold" data-ae="step" data-m="${m.id}" data-i="${i}">${st.min ? "Hoàn tất bước" : "Hoàn tất (có thể không đầu tư)"}</button>`}`;
    }
    if (st.type === "compute") {
      const t = done && saved.task ? saved.task : G.computeTask(g, m.id, i);
      const ans = saved.ans || {};
      return `<p>${esc(st.prompt)}</p><dl class="ae-givens">${t.givens.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="ae-fields">${t.fields.map(f => `<label class="ae-field ${done ? (G.checkField(f, ans[f.id]) ? "ok" : "bad") : ""}"><span>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</span>
          ${f.select ? `<select data-f="${f.id}" ${done ? "disabled" : ""}><option value="">— chọn —</option>${f.select.map(o => `<option value="${o[0]}" ${ans[f.id] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`
            : `<input data-f="${f.id}" inputmode="decimal" autocomplete="off" value="${done ? esc(ans[f.id] || "") : ""}" ${done ? "disabled" : ""}>`}
          ${done ? `<em>Đáp án: ${f.select ? esc(f.select.find(o => o[0] === f.ans)[1]) : fx(f.ans, f.unit === "tấn" ? 0 : 2)}</em>` : ""}</label>`).join("")}</div>
        ${done ? `<div class="ae-callout"><b>Công thức.</b> ${esc(t.formula)}<ol>${t.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
          ${askAI({ label: `Alternative Empire · ${m.title}`, topic: "Alternative Investments", where: `Alternative Empire — ${m.title} (LM${m.lm})`, stem: `${st.prompt}\n${t.givens.map(([k, v]) => `${k}: ${v}`).join("\n")}\nYêu cầu: ${t.fields.map(f => f.label).join("; ")}`, answer: t.fields.map(f => `${f.label} = ${f.select ? f.ans : fx(f.ans, 4)}`).join("; "), expl: `${t.formula}\n${t.steps.join("\n")}` })}</div>` : `<p class="ae-muted">Nhập số thập phân bằng dấu chấm hoặc phẩy. Dùng <a href="#/alt/calc">Máy tính</a> hoặc BA II Plus nếu cần.</p><button type="button" class="ae-btn gold" data-ae="compute" data-m="${m.id}" data-i="${i}">Nộp kết quả</button>`}`;
    }
    if (st.type === "quiz") {
      if (done) return `<p class="ae-ok">${icon("check", 16)} Đạt ${Math.round((saved.score || 0) * 100)}%. Xem lại câu sai trong <a href="#/alt/academy">Học viện</a>.</p>`;
      const qz = G.missionQuiz(g, m.id), ids = qz.ids;
      if (AE.ui.qm !== m.id || AE.ui.qset !== ids.join()) { AE.ui.qm = m.id; AE.ui.qset = ids.join(); const f = ids.findIndex(x => qz.answers[x] == null); AE.ui.qi = f < 0 ? ids.length - 1 : f; }
      const k = Math.min(AE.ui.qi || 0, ids.length - 1), q = C.QUESTIONS.find(x => x.id === ids[k]), a = qz.answers[q.id];
      return `<p class="ae-muted">Câu ${k + 1}/${ids.length} · cần đúng ít nhất ${st.pass}. Đáp án chỉ hiện sau khi bạn chọn.</p>${questionHtml(q, a, `data-ae="qans" data-m="${m.id}"`)}
        <div class="ae-row">${a != null && k < ids.length - 1 ? `<button type="button" class="ae-btn gold" data-ae="qnext">Câu tiếp</button>` : ""}${a != null && k === ids.length - 1 ? `<button type="button" class="ae-btn gold" data-ae="step" data-m="${m.id}" data-i="${i}">Nộp bài</button>` : ""}</div>`;
    }
    if (st.type === "review") {
      if (done || AE.G.status === "finished") return endingCard(AE.G);
      const b = G.scorecard(g);
      return `<p>Hội đồng sẽ chấm: danh mục và hiệu quả (${Math.round(b.perf)}), rủi ro (${Math.round(b.risk)}), thanh khoản (${Math.round(b.liq)}), tuân thủ (${Math.round(b.comp)}), uy tín (${Math.round(b.rep)}), hiểu biết (${Math.round(b.know)}), cùng điểm các nhiệm vụ.</p><button type="button" class="ae-btn gold" data-ae="step" data-m="${m.id}" data-i="${i}">Trình bày trước Hội đồng</button>`;
    }
    return "";
  }
  function questionHtml(q, a, attrs) {
    const L = ["A", "B", "C"];
    return `<div class="ae-q"><p class="ae-qtext">${esc(q.q)}</p><div class="ae-qopts">${q.opts.map((o, i) => `<button type="button" class="ae-qopt ${a != null ? (i === q.ans ? "right" : i === a ? "wrong" : "") : ""}" ${a != null ? "disabled" : `${attrs} data-q="${q.id}" data-c="${i}"`}><b>${L[i]}</b><span>${esc(o)}</span></button>`).join("")}</div>
      ${a != null ? `<div class="ae-callout ${a === q.ans ? "ok" : "bad"}"><b>${a === q.ans ? "Đúng." : `Chưa đúng — đáp án ${L[q.ans]}.`}</b><ul>${q.why.map((w, i) => `<li><b>${L[i]}.</b> ${esc(w)}</li>`).join("")}</ul>${q.formula ? `<p><b>Công thức:</b> ${esc(q.formula)}</p>` : ""}${q.steps ? `<p><b>Từng bước:</b> ${esc(q.steps)}</p>` : ""}${q.mis ? `<p><b>Hiểu lầm thường gặp:</b> ${esc(q.mis)}</p>` : ""}<p class="ae-muted">LM${q.lm}: ${esc(C.LMS[q.lm].title)}</p>
      ${askAI({ label: `Alternative Empire · LM${q.lm}`, topic: "Alternative Investments", where: `Alternative Empire (câu hỏi tự soạn) — LM${q.lm} ${C.LMS[q.lm].title}`, stem: q.q, choices: { A: q.opts[0], B: q.opts[1], C: q.opts[2] }, answer: L[q.ans], picked: L[a], expl: q.why.map((w, i) => `${L[i]}. ${w}`).join("\n") + (q.formula ? `\nCông thức: ${q.formula}` : "") + (q.steps ? `\nCác bước: ${q.steps}` : "") })}</div>` : ""}</div>`;
  }

  // ======================= 5. Map =======================
  function map() {
    const g = AE.G, ids = Object.keys(C.DEALS);
    const held = new Set(g.fund.holdings.filter(h => h.status === "active").map(h => h.deal));
    const land = ["M8,14 C14,6 30,6 36,12 C40,18 34,26 30,30 C26,34 22,30 18,28 C12,26 6,20 8,14Z", "M26,34 C30,32 36,34 36,40 C36,48 32,56 28,56 C26,50 24,42 26,34Z",
      "M42,10 C50,6 60,8 58,14 C56,18 48,20 44,18 C40,16 40,12 42,10Z", "M44,22 C52,20 58,24 58,32 C58,42 52,48 48,46 C44,40 42,30 44,22Z", "M60,8 C72,4 90,8 92,16 C94,24 86,30 76,30 C68,30 60,26 58,18 C58,12 58,10 60,8Z", "M80,42 C86,40 92,42 92,48 C90,52 84,52 80,50 C78,46 78,44 80,42Z"];
    const mk = id => { const d = C.DEALS[id], st = G.dealState(g, id), c = A.CLASSES[d.cls].color, on = held.has(id);
      return `<a href="#/alt/deal/${id}" class="ae-mk ${st.ok ? "open" : ""} ${on ? "held" : ""} ${st.locked ? "future" : ""}" aria-label="${esc(d.name)}"><circle cx="${d.map[0]}" cy="${d.map[1]}" r="${on ? 1.35 : 0.95}" fill="${c}"/>${st.ok && !still() ? `<circle cx="${d.map[0]}" cy="${d.map[1]}" r="0.95" fill="none" stroke="${c}" class="ae-pulse"/>` : ""}<title>${esc(d.name)} — ${esc(d.kind)} (${st.ok ? "đang mở" : esc(st.reason)})</title></a>`; };
    shell("map", `${hd("Bản đồ đầu tư toàn cầu", "Thế giới của Aurelion", "Điểm sáng: cơ hội đang mở. Điểm lớn: tài sản bạn đang nắm giữ. Bản đồ và dự án đều hư cấu.", SIM())}
      <section class="ae-card ae-mapcard"><svg viewBox="0 0 100 60" class="ae-map" role="img" aria-label="Bản đồ dự án">${land.map(p => `<path d="${p}" class="ae-land"/>`).join("")}${ids.map(mk).join("")}</svg>
        <div class="ae-legend">${Object.entries(A.CLASSES).map(([k, c]) => `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join("")}</div></section>
      <section class="ae-card"><h2>Các cơ hội chương ${g.chapter}</h2><div class="ae-dlist">${ids.filter(id => C.DEALS[id].ch === g.chapter || (G.dealState(g, id).ok)).map(id => dealRow(g, id)).join("") || `<p class="ae-muted">Không có cơ hội mới ở chương này.</p>`}</div></section>`);
  }
  function dealRow(g, id) {
    const d = C.DEALS[id], st = G.dealState(g, id), cls = A.CLASSES[d.cls];
    return `<a class="ae-deal ${st.ok ? "" : "off"}" href="#/alt/deal/${id}"><i style="background:${cls.color}"></i><div><b>${esc(d.name)}</b><small>${esc(d.kind)} · ${esc(d.region)}</small></div>${st.taken ? chip("Đã đầu tư", "green") : st.ok ? chip("Đang mở", "gold") : chip(esc(st.reason), "")}</a>`;
  }

  // ======================= 6. Deal room =======================
  function deals() {
    const g = AE.G, ids = Object.keys(C.DEALS), tab = AE.ui.tab.deals || "open";
    const groups = { open: ids.filter(id => G.dealState(g, id).ok), soon: ids.filter(id => G.dealState(g, id).locked), done: ids.filter(id => { const s = G.dealState(g, id); return !s.ok && !s.locked; }) };
    shell("deals", `${hd("Investment Deal Room", "Phòng thương vụ", "Mỗi hồ sơ có luận điểm đầu tư, dữ kiện, rủi ro, thanh khoản và mức kiểm soát. Ký là thay đổi danh mục thật.", SIM())}
      <div class="ae-tabs">${[["open", "Đang mở"], ["soon", "Sắp mở"], ["done", "Đã đóng / đã thực hiện"]].map(([k, l]) => `<button type="button" class="${tab === k ? "on" : ""}" data-ae="tab" data-t="deals" data-v="${k}">${l} (${groups[k].length})</button>`).join("")}</div>
      <section class="ae-cards">${groups[tab].map(id => { const d = C.DEALS[id], st = G.dealState(g, id); return `<a class="ae-card ae-dealcard" href="#/alt/deal/${id}"><p class="ae-kicker" style="color:${A.CLASSES[d.cls].color}">${esc(A.CLASSES[d.cls].name)} · chương ${d.ch}</p><h3>${esc(d.name)}</h3><p class="ae-muted">${esc(d.kind)} · ${esc(d.method === "fund" ? "qua quỹ" : d.method === "coinvest" ? "đồng đầu tư" : "trực tiếp")} · ${esc(d.region)}</p><p>${esc(d.pitch)}</p>${st.ok ? chip("Đang mở", "gold") : chip(esc(st.reason), st.taken ? "green" : "")}</a>`; }).join("") || `<p class="ae-muted">Không có hồ sơ.</p>`}</section>`);
  }
  function deal(id) {
    const g = AE.G, d = C.DEALS[id];
    if (!d) return deals();
    const st = G.dealState(g, id), n = g.nego[id];
    const vals = AE.ui.form && AE.ui.form.id === id ? AE.ui.form.v : Object.fromEntries(d.form.map(f => [f.id, n && n.accepted && f.id === "commit" ? Math.min(f.def, n.maxCommit) : f.def]));
    AE.ui.form = { id, v: vals };
    const pv = G.preview(g, id, vals);
    shell("deals", `${hd(`${esc(A.CLASSES[d.cls].name)} · ${esc(d.kind)}`, esc(d.name), esc(d.pitch), SIM())}
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Hồ sơ thẩm định</h2><dl class="ae-givens">${d.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          <h3>Rủi ro chính</h3><ul>${d.risks.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
          <p class="ae-muted">Phương thức: <b>${d.method === "fund" ? "Fund investment / sản phẩm quỹ" : d.method === "coinvest" ? "Co-investment" : "Direct investment"}</b> · Thanh khoản: <b>${esc({ liquid: "cao", semi: "trung bình (theo quý)", illiquid: "thấp" }[A.TYPES[pv.spec ? pv.spec.type : "pefund"].liq])}</b> · Định giá: ${A.TYPES[pv.spec ? pv.spec.type : "pefund"].basis === "market" ? MKT : EST}</p></article>
        <article class="ae-card"><h2>Quyết định</h2>
          ${st.ok ? `<form id="ae-dealform" data-id="${id}" class="ae-form">${d.form.map(f => f.options ? `<label><span>${esc(f.label)}</span><select name="${f.id}">${f.options.map(o => `<option value="${o.v}" ${String(vals[f.id]) === o.v ? "selected" : ""}>${esc(o.l)}</option>`).join("")}</select></label>`
              : `<label><span>${esc(f.label)} ($M)</span><input type="range" name="${f.id}" min="${f.min}" max="${d.negotiate && n && n.maxCommit ? n.maxCommit : f.max}" step="${f.step}" value="${vals[f.id]}"><output>$${vals[f.id]}M</output></label>`).join("")}</form>` : `<p>${icon("lock", 14)} ${esc(st.reason)}</p>`}
          ${st.ok ? `<div id="ae-dealpv">${dealPreview(g, d, id, pv)}</div>` : ""}
        </article></section>`);
  }
  function dealPreview(g, d, id, pv) {
    const n = g.nego[id];
    return `<div class="ae-preview">${pv.cash ? `<p>Tiền mặt cần: <b>${m$(pv.cash)}</b> (có ${m$(g.fund.cash)})</p>` : ""}${pv.commit ? `<p>Cam kết: <b>${m$(pv.commit)}</b> — chưa giải ngân, sẽ bị gọi dần.</p>` : ""}
        ${pv.spec && pv.spec.borrow ? `<p>Vay thế chấp: <b>${m$(pv.spec.borrow)}</b> — tài sản và nợ cùng tăng; NAV không đổi khi vay.</p>` : ""}
        ${pv.errors.length ? `<div class="ae-callout bad">${pv.errors.map(esc).join("<br>")}</div>` : ""}${pv.warnings.length ? `<div class="ae-callout warn">${icon("alert", 14)} ${pv.warnings.map(esc).join("<br>")}</div>` : ""}
        ${pv.scenarios ? scenarioTable(pv) : ""}</div>
      <div class="ae-row">${d.negotiate ? `<a class="ae-btn ${n && n.accepted ? "" : "gold"}" href="#/alt/negotiate/${id}">${icon("chat", 16)} ${n && n.accepted ? "Xem/đàm phán lại term sheet" : "Đàm phán term sheet"}</a>` : ""}
        <button type="button" class="ae-btn ${d.negotiate && !(n && n.accepted) ? "" : "gold"}" data-ae="invest" data-id="${id}" ${pv.ok ? "" : "disabled"}>${icon("check", 16)} Ký và ${pv.commit ? "cam kết" : "đầu tư"}</button></div>`;
  }
  function refreshDeal(id) {
    const box = document.getElementById("ae-dealpv"); if (!box || !AE.G) return;
    box.innerHTML = dealPreview(AE.G, C.DEALS[id], id, G.preview(AE.G, id, AE.ui.form.v));
  }
  function scenarioTable(pv) {
    return `<h3>Kịch bản nhu cầu (dòng tiền năm, chiết khấu ${pct(pv.rate)})</h3><table class="ae-table"><thead><tr><th>Kịch bản</th><th>NPV</th><th>IRR</th></tr></thead><tbody>${pv.scenarios.map(s => `<tr><td>${esc(s.label)}</td><td class="${tone(s.npv)}">$${s.npv.toFixed(2)}M</td><td>${s.irr != null ? pct(s.irr) : esc(s.irrStatus)}</td></tr>`).join("")}</tbody></table>
      ${line(pv.scenarios.map((s, i) => ({ name: s.label, color: ["#E07A6F", "#C9A86A", "#5CC9A7"][i], pts: s.cfs.map((c, t) => [t, c]) })), { h: 150, fx: t => `Năm ${t}`, fy: v => v.toFixed(1), zero: true, label: "Dòng tiền theo năm" })}
      <p class="ae-muted">Bảng dùng dòng tiền năm đơn giản hóa; mô phỏng chạy theo quý và nhu cầu thực tế chỉ lộ ra dần sau khi khai thác.</p>`;
  }

  // ======================= 9. Negotiation =======================
  function negotiate(id) {
    const g = AE.G, d = C.DEALS[id];
    if (!d || !d.negotiate) return deals();
    const st = G.dealState(g, id), n = g.nego[id];
    const asks = AE.ui.nego[id] || (n && n.asks) || {};
    AE.ui.nego[id] = asks;
    const commit = AE.ui.form && AE.ui.form.id === id ? AE.ui.form.v.commit : d.form[0].def;
    const info = G.negoInfo(g, id, commit), tm = G.termsOf(asks);
    const last = AE.ui.negoRes && AE.ui.negoRes.id === id ? AE.ui.negoRes.r : null;
    shell("deals", `${hd("Contract Negotiation", `Term sheet: ${esc(d.name)}`, "Mỗi điều khoản có lợi cho LP tốn “điểm đàm phán”; nhượng bộ thì được thêm điểm. Đòn bẩy của bạn đến từ quy mô cam kết và uy tín.")}
      ${!st.ok ? `<section class="ae-card"><p>${esc(st.reason)}</p></section>` : `<section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Điều khoản</h2><form id="ae-negoform" data-id="${id}">${C.CLAUSES.map(cl => `<fieldset class="ae-clause"><legend>${esc(cl.label)}</legend>${cl.options.map((o, i) => `<label class="ae-radio sm"><input type="radio" name="${cl.id}" value="${i}" ${+(asks[cl.id] || 0) === i ? "checked" : ""}><b>${esc(o.l)}</b><small>${o.c > 0 ? `tốn ${o.c} điểm` : o.c < 0 ? `nhượng bộ +${-o.c}` : "chuẩn"}</small></label>`).join("")}</fieldset>`).join("")}</form></article>
        <article class="ae-card"><h2>Đòn bẩy đàm phán</h2>
          <p>Quy mô cam kết dự kiến: <b>$${commit}M</b> (chỉnh ở trang thương vụ) · tối đa GP phân bổ: <b>$${info.maxCommit}M</b></p>
          <div class="ae-score"><span>Điểm đã dùng</span>${bar(Math.max(0, tm.cost), Math.max(info.budget, tm.cost, 1), tm.cost > info.budget ? "var(--red)" : "")}<b>${tm.cost}/${info.budget}</b></div>
          <p class="ae-muted">Ngân sách = 3 cơ bản + ${info.size} quy mô (≥ $20M: +1, ≥ $30M: +2) + ${info.rep} uy tín (≥ 60) − ${info.strikes} lần bị từ chối. Vượt ≤ 2 điểm: GP phản đề xuất. Vượt nhiều hơn: GP từ chối, bạn mất uy tín.</p>
          <h3>Điều khoản sẽ ký</h3><ul>${C.CLAUSES.map(cl => `<li>${esc(cl.label)}: <b>${esc(cl.options[+(asks[cl.id] || 0)].l)}</b></li>`).join("")}</ul>
          ${last ? `<div class="ae-callout ${last.status === "accepted" ? "ok" : last.status === "counter" ? "warn" : "bad"}"><b>GP:</b> ${esc(last.msg)}</div>` : ""}
          ${n && n.accepted ? `<div class="ae-callout ok">${icon("check", 14)} Term sheet đã thống nhất (${n.cost} điểm). Quay lại thương vụ để ký cam kết.</div>` : ""}
          <div class="ae-row"><button type="button" class="ae-btn gold" data-ae="nego" data-id="${id}" data-c="${commit}">${icon("send", 16)} Gửi đề xuất</button>
            ${last && last.status === "counter" ? `<button type="button" class="ae-btn" data-ae="counter" data-id="${id}" data-c="${commit}">Chấp nhận phản đề xuất</button>` : ""}
            <a class="ae-btn" href="#/alt/deal/${id}">Về thương vụ</a></div>
          <h3>Ý nghĩa</h3><p class="ae-muted">Phí quản lý tính trên committed capital (không phải NAV). Whole-of-fund (European) chỉ trả carry khi LP đã nhận lại toàn bộ vốn góp và hurdle; deal-by-deal (American) trả theo từng thương vụ — clawback cho LP đòi lại phần trả thừa. Không catch-up = hard hurdle.</p>
        </article></section>`}`);
  }

  // ======================= 7. Portfolio =======================
  function portfolio() {
    const g = AE.G, f = g.fund, nav = F.nav(f), ex = F.exposure(f), liq = F.liquidity(f);
    const act = f.holdings.filter(h => h.status === "active"), closed = f.holdings.filter(h => h.status !== "active");
    const pe = f.holdings.filter(h => h.type === "pefund");
    const jc = pe.length ? jcurve(f, pe, g.q) : "";
    shell("portfolio", `${hd("Portfolio Dashboard", `${tip("NAV")} ${m$(nav)}`, `Tiền mặt ${m$(f.cash)} · nợ cấp quỹ ${m$(f.debt)} · vốn cam kết chưa gọi ${m$(liq.unfunded)}`, SIM())}
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>NAV và chuẩn 60/40</h2>${line([{ name: "NAV ($M)", color: "#C9A86A", pts: f.navHist.map(r => [r.q, r.nav / 1e8]) }, { name: "Nếu đầu tư 60/40 ($M)", color: "#7FA8E6", dash: true, pts: f.navHist.map(r => [r.q, f.initial / 1e8 * (r.benchIdx || 1)]) }], { fy: v => "$" + v.toFixed(0) + "M" })}</article>
        <article class="ae-card"><h2>Phân bổ theo lớp tài sản</h2>${hbars(Object.entries(A.CLASSES).map(([k, c]) => ({ l: c.name, v: ex.by[k], c: c.color })).concat([{ l: "Tiền mặt (ròng nợ quỹ)", v: ex.by.cash, c: "#9AA3B5" }]).filter(x => x.v), v => `${m$(v)} · ${pct(nav ? v / nav : 0, 1)}`)}
          <h3>Gọi vốn dự kiến 4 quý tới</h3>${hbars(liq.calls.map((c, i) => ({ l: W.label(g.q + i + 1), v: c, c: "#E0A75C" })), m$)}</article></section>
      <section class="ae-card"><h2>Khoản đầu tư đang nắm giữ (${act.length})</h2>${holdTable(g, act)}</section>
      ${jc}
      ${closed.length ? `<section class="ae-card"><h2>Đã đóng (${closed.length})</h2>${holdTable(g, closed)}</section>` : ""}`);
  }
  // IRR over less than a year is not annualised (it would exaggerate a few quarters' result)
  function irrText(g, h, ir) {
    if (!ir) return "—";
    const held = (h.closedQ != null ? h.closedQ : g.q) - h.startQ;
    if (held < 4) return `<span title="Nắm giữ dưới 1 năm: không năm hóa IRR">&lt; 1 năm</span>`;
    return ir.status === "unique" ? pct(ir.irr) : ir.status === "multiple" ? "nhiều nghiệm" : "không có";
  }
  function holdTable(g, hs) {
    if (!hs.length) return `<p class="ae-muted">Chưa có khoản nào. Vào <a href="#/alt/deals">Deal Room</a>.</p>`;
    return `<div class="ae-tablewrap"><table class="ae-table"><thead><tr><th>Khoản đầu tư</th><th>Lớp</th><th>Định giá</th><th class="r">Giá trị</th><th class="r">Nợ</th><th class="r">${tip("Unfunded")}</th><th class="r">${tip("IRR")}</th><th class="r">${tip("TVPI")}</th><th>Trạng thái</th></tr></thead><tbody>${hs.map(h => {
      const s = F.holdingStats(g.fund, h, g.q), ir = s.irr;
      return `<tr data-ae="go" data-href="#/alt/h/${h.id}" tabindex="0"><td><a href="#/alt/h/${h.id}">${esc(h.name)}</a></td><td><i class="ae-dot" style="background:${A.CLASSES[h.cls].color}"></i>${esc(A.CLASSES[h.cls].short)}</td><td>${h.basis === "market" ? "Thị trường" : "Ước tính"}</td>
        <td class="r">${m$(h.value)}</td><td class="r">${h.debt ? m$(h.debt) : "—"}</td><td class="r">${h.unfunded ? m$(h.unfunded) : "—"}</td>
        <td class="r">${irrText(g, h, ir)}</td><td class="r">${s.mult.tvpi != null ? fx(s.mult.tvpi) + "×" : "—"}</td><td>${esc({ active: "Đang giữ", exited: "Đã thoái vốn", sold: "Đã bán", written_off: "Xóa sổ", lost: "Mất" }[h.status])}</td></tr>`; }).join("")}</tbody></table></div>`;
  }
  // cumulative net cash flow of the private equity commitments (the J-curve) and TVPI over time
  function jcurve(f, pe, qNow) {
    const ids = new Set(pe.map(h => h.id)), byQ = {}, valQ = {};
    let cum = 0, val = 0;
    for (const r of f.ledger) if (ids.has(r.h)) { byQ[r.q] = (byQ[r.q] || 0) + r.cf; valQ[r.q] = (valQ[r.q] || 0) + r.v; }
    const q0 = Math.min(...pe.map(h => h.startQ)), pts = [], tv = [];
    let paid = 0, dist = 0;
    for (let q = q0; q <= qNow; q++) {
      cum += byQ[q] || 0; val += valQ[q] || 0;
      for (const r of f.ledger) if (ids.has(r.h) && r.q === q) { if (r.t === "CALL") paid += -r.c; if (r.t === "DIST") dist += r.c; }
      pts.push([q, cum / 1e8]); if (paid > 0) tv.push([q, (dist + val) / paid]);
    }
    return `<section class="ae-card"><h2>J-curve của các cam kết private equity</h2><div class="ae-grid ae-g2">${line([{ name: "Dòng tiền ròng lũy kế ($M)", color: "#E0A75C", pts }], { zero: true, fy: v => v.toFixed(1), label: "J-curve" })}${line([{ name: "TVPI", color: "#5CC9A7", pts: tv }], { fy: v => v.toFixed(2) + "×", label: "TVPI" })}</div>
      <p class="ae-muted">Những quý đầu: phí quản lý trên committed capital và chi phí trả ngay, thương vụ giữ ở giá gốc ⇒ dòng tiền ròng âm, TVPI < 1. Khi thương vụ tạo giá trị và thoái vốn, đường cong đi lên.</p></section>`;
  }
  function holdingScreen(hid) {
    const g = AE.G, h = G.holding(g, hid);
    if (!h) return portfolio();
    const s = F.holdingStats(g.fund, h, g.q), T = A.TYPES[h.type], c = G.companyOfHolding(g, h), w = g.world;
    const posts = g.fund.ledger.filter(r => r.h === h.id);
    const vq = {}; let v = 0; for (const r of posts) { v += r.v; vq[r.q] = v; }
    const vpts = Object.entries(vq).map(([q, x]) => [+q, x / 1e8]);
    const disc = T.liq === "illiquid" ? A.secondaryDiscount(h, w) : (A.SELL_COST[h.type] || 0);
    const exits = G.exitOptions(g, hid);
    const ir = s.irr;
    shell("portfolio", `${hd(`${esc(A.CLASSES[h.cls].name)} · ${esc(T.name)}`, esc(h.name), `Mở từ ${W.label(h.startQ)} · ${esc({ active: "đang nắm giữ", exited: "đã thoái vốn", sold: "đã bán", written_off: "đã xóa sổ", lost: "đã mất" }[h.status])}`, h.basis === "market" ? MKT : EST)}
      <section class="ae-grid ae-g3">
        <article class="ae-card"><h2 class="ae-big">${m$(h.value)}</h2><dl class="ae-dl">
          <div><dt>Vốn cam kết</dt><dd>${h.commit ? m$(h.commit) : "—"}</dd></div><div><dt>Đã góp (paid-in)</dt><dd>${m$(h.paidIn)}</dd></div>
          <div><dt>${tip("Unfunded")}</dt><dd>${h.unfunded ? m$(h.unfunded) : "—"}</dd></div><div><dt>Giá vốn còn lại</dt><dd>${m$(h.cost)}</dd></div>
          <div><dt>Đã phân phối</dt><dd>${m$(h.dist)}</dd></div><div><dt>Thu nhập</dt><dd>${m$(h.inc)}</dd></div>
          <div><dt>Phí (quản lý + hiệu suất)</dt><dd>${m$(-h.fees)}</dd></div><div><dt>Nợ vay</dt><dd>${h.debt ? m$(h.debt) : "—"}</dd></div>
          <div><dt>Lãi/lỗ chưa thực hiện</dt><dd class="${tone(s.unrealized)}">${m$(s.unrealized)}</dd></div><div><dt>Đã thực hiện</dt><dd class="${tone(h.real)}">${m$(h.real)}</dd></div></dl></article>
        <article class="ae-card"><h2>Hiệu quả</h2><dl class="ae-dl">
          <div><dt>${tip("IRR")} (năm)</dt><dd>${irrText(g, h, ir)}</dd></div>
          <div><dt>${tip("MOIC")}</dt><dd>${s.moic != null ? fx(s.moic) + "×" : "—"}</dd></div><div><dt>${tip("DPI")}</dt><dd>${s.mult.dpi != null ? fx(s.mult.dpi) + "×" : "—"}</dd></div>
          <div><dt>RVPI</dt><dd>${s.mult.rvpi != null ? fx(s.mult.rvpi) + "×" : "—"}</dd></div><div><dt>${tip("TVPI")}</dt><dd>${s.mult.tvpi != null ? fx(s.mult.tvpi) + "×" : "—"}</dd></div></dl>
          ${ir && ir.status !== "unique" ? `<p class="ae-muted">${esc(ir.reason)}</p>` : ""}
          <p class="ae-muted">IRR tính trên dòng tiền theo quý của Aurelion (gọi vốn, phân phối, thu nhập, chi phí) cộng giá trị hiện tại; giá trị chưa thực hiện là ước tính.</p></article>
        <article class="ae-card"><h2>Hành động</h2>${h.status !== "active" ? `<p class="ae-muted">Khoản đầu tư đã đóng.</p>` : holdActions(g, h, disc, exits)}</article></section>
      ${modelPanel(g, h, c)}
      <section class="ae-card"><h2>Giá trị theo quý</h2>${line([{ name: "Giá trị ($M)", color: A.CLASSES[h.cls].color, pts: vpts }], { fy: v => "$" + v.toFixed(2) + "M" })}</section>
      <section class="ae-card"><h2>Sổ cái của khoản đầu tư (${posts.length} bút toán)</h2><div class="ae-tablewrap"><table class="ae-table sm"><thead><tr><th>Quý</th><th>Loại</th><th class="r">Tiền mặt</th><th class="r">Giá trị</th><th>Diễn giải</th></tr></thead><tbody>${posts.slice(-40).reverse().map(r => `<tr><td>${W.label(r.q)}</td><td>${esc(r.t)}</td><td class="r ${tone(r.c)}">${r.c ? m$(r.c) : ""}</td><td class="r ${tone(r.v)}">${r.v ? m$(r.v) : ""}</td><td>${esc(r.n)}</td></tr>`).join("")}</tbody></table></div></section>`);
  }
  function holdActions(g, h, disc, exits) {
    const T = A.TYPES[h.type], locked = h.lockUntil != null && g.q < h.lockUntil;
    let out = `<p>${T.liq === "illiquid" ? `Bán trên thị trường thứ cấp: chiết khấu ước tính <b>${pct(disc, 1)}</b>${h.unfunded ? "; bên mua nhận luôn phần vốn cam kết chưa gọi" : ""}.` : T.liq === "semi" ? "Rút vốn theo quý (khi thanh khoản thị trường cạn có thể chịu chi phí)." : `Bán theo giá thị trường, chi phí ${pct(disc, 1)}.`}</p>
      ${locked ? `<p class="ae-warn">Đang khóa vốn tới ${W.label(h.lockUntil)}</p>` : `<div class="ae-row">${[0.25, 0.5, 1].map(fr => `<button type="button" class="ae-btn sm" data-ae="sell" data-h="${h.id}" data-f="${fr}">Bán ${fr * 100}%</button>`).join("")}</div>`}`;
    if (h.type === "farm" && h.terms.model === "operate") out += `<h3>Phòng hộ vụ tới</h3><p class="ae-muted">Bán futures khóa giá hiện tại cho một phần sản lượng kỳ vọng. Không bảo vệ khi sản lượng giảm.</p><div class="ae-row">${[0, 0.4, 0.8].map(x => `<button type="button" class="ae-btn sm ${Math.round((h.terms.hedgeTons || 0) / (h.terms.acres * h.terms.yieldPerAcre) * 10) / 10 === x ? "on" : ""}" data-ae="policy" data-h="${h.id}" data-k="hedge" data-v="${x}">${x * 100}%</button>`).join("")}</div>`;
    if (h.type === "timber") out += `<h3>Chính sách khai thác</h3><div class="ae-row">${[0, 0.04, 0.08, 0.12].map(x => `<button type="button" class="ae-btn sm ${h.terms.harvest === x ? "on" : ""}" data-ae="policy" data-h="${h.id}" data-k="harvest" data-v="${x}">${x * 100}%/năm</button>`).join("")}</div>`;
    if (h.type === "hf") out += `<h3>Đòn bẩy</h3><div class="ae-row">${[1, 1.5, 2, 3].map(x => `<button type="button" class="ae-btn sm ${h.terms.lev === x ? "on" : ""}" data-ae="policy" data-h="${h.id}" data-k="lev" data-v="${x}">${x}×</button>`).join("")}</div>`;
    if (exits.length) out += `<h3>Thoái vốn doanh nghiệp</h3><div class="ae-row">${exits.map(r => `<button type="button" class="ae-btn sm gold" data-ae="exit" data-h="${h.id}" data-r="${r}">${{ ipo: "IPO", trade: "Trade sale", sbo: "Secondary buyout", recap: "Dividend recap" }[r]}</button>`).join("")}</div><p class="ae-muted">Tiền về quỹ cuối quý; IPO cần thị trường thanh khoản.</p>`;
    return out;
  }
  function modelPanel(g, h, c) {
    const m = h.m, t = h.terms;
    if (h.type === "pefund") return `<section class="ae-card"><h2>Bên trong quỹ</h2><p class="ae-muted">Điều khoản: phí quản lý ${pct(t.mgmt)} trên committed capital · carry ${pct(t.carry, 1)} · hurdle ${pct(t.pref, 0)} · ${t.catchUp ? "catch-up toàn phần" : "không catch-up (hard hurdle)"} · ${t.waterfall === "european" ? "whole-of-fund (European)" : "deal-by-deal (American)"} · ${t.clawback ? "có" : "không"} clawback · ${t.keyPerson ? "có" : "không"} key person${m.suspended ? " · <b>đang tạm dừng đầu tư</b>" : ""}</p>
      <dl class="ae-dl"><div><dt>Carry đã trả GP</dt><dd>${m$(m.gpPaid)}</dd></div><div><dt>Carry tích lũy (chưa trả, trừ vào NAV)</dt><dd>${m$(m.accrued)}</dd></div><div><dt>Clawback ước tính LP được đòi</dt><dd>${m$(m.recv)}</dd></div><div><dt>Tổng tiền thoái vốn</dt><dd>${m$(m.cumProceeds)}</dd></div></dl>
      <table class="ae-table sm"><thead><tr><th>Thương vụ</th><th>Vào (tuổi quỹ)</th><th class="r">Giá vốn</th><th class="r">Định giá báo cáo</th><th>Trạng thái</th></tr></thead><tbody>${m.deals.map(d => `<tr><td>Thương vụ ${d.i + 1}</td><td>quý ${d.entry}</td><td class="r">${m$(d.cost)}</td><td class="r">${d.live ? m$(d.rep) : d.done ? m$(d.realized || 0) + " (thực hiện)" : "—"}</td><td>${d.done ? "Đã thoái vốn" : d.live ? (m.age - d.entry < 4 ? "Giữ giá gốc" : "Đang định giá") : "Chưa đầu tư"}</td></tr>`).join("")}</tbody></table></section>`;
    if (c) return `<section class="ae-card"><h2>${esc(c.name)}</h2><dl class="ae-dl"><div><dt>Trạng thái</dt><dd>${esc({ active: "Hoạt động", exited: "Đã thoái vốn", default: "Vỡ nợ", failed: "Thất bại", resolved: "Đã giải quyết" }[c.status])}</dd></div>
      ${c.kind === "mature" ? `<div><dt>EBITDA</dt><dd>${m$(c.ebitda)}</dd></div><div><dt>Hệ số EV/EBITDA</dt><dd>${fx(c.mult)}×</dd></div><div><dt>Nợ ròng</dt><dd>${m$(c.netDebt)}</dd></div><div><dt>Nợ ròng / EBITDA</dt><dd class="${c.lev > c.covenant ? "down" : ""}">${fx(c.lev)}× (covenant ${fx(c.covenant, 1)}×)</dd></div><div><dt>Giá trị vốn cổ phần</dt><dd>${m$(c.equity)}</dd></div>` : ""}
      ${c.kind === "startup" ? `<div><dt>Định giá</dt><dd>${m$(c.val)}</dd></div><div><dt>Mốc đã đạt</dt><dd>${c.stage}/3</dd></div><div><dt>Lần trượt</dt><dd>${c.fails}/2</dd></div>` : ""}
      ${c.kind === "distressed" ? `<div><dt>Giá trị doanh nghiệp / nợ</dt><dd>${pct(c.ev / c.face, 1)}</dd></div><div><dt>Thu hồi ước tính</dt><dd>${pct(c.recoveryEst, 1)}</dd></div><div><dt>Quyết định tái cấu trúc</dt><dd>${c.status === "resolved" ? esc(c.outcome) + " · " + pct(c.recovery, 1) : `sau ${Math.max(0, c.resolveAge - c.age)} quý`}</dd></div>` : ""}
      ${h.type === "loan" ? `<div><dt>Lãi suất</dt><dd>${pct(t.rate, 1)}</dd></div><div><dt>Thứ tự</dt><dd>${esc(t.seniority)}</dd></div><div><dt>Tỷ lệ sở hữu qua warrants</dt><dd>${pct(t.warrants, 2)}</dd></div>` : ""}
      ${h.type === "equity" ? `<div><dt>Tỷ lệ sở hữu</dt><dd>${pct(t.stake, 1)}</dd></div>` : ""}</dl></section>`;
    if (h.type === "farm" && m.last) return `<section class="ae-card"><h2>Vụ thu hoạch gần nhất (${W.label(m.last.q)})</h2><dl class="ae-dl"><div><dt>Sản lượng</dt><dd>${Math.round(m.last.tons).toLocaleString("en-US")} tấn (thời tiết ${fx(m.last.weather)})</dd></div><div><dt>Giá</dt><dd>$${(m.last.cropPx / 100).toFixed(2)}/tấn</dd></div><div><dt>Doanh thu</dt><dd>${m$(m.last.rev)}</dd></div><div><dt>Lãi/lỗ phòng hộ</dt><dd>${m$(m.last.hedge)}</dd></div><div><dt>Chi phí</dt><dd>${m$(m.last.cost)}</dd></div></dl><p class="ae-muted">Ba nguồn lợi nhuận: sản lượng × giá (thu nhập khai thác), giá nông sản, và giá đất (định giá lại ở trên).</p></section>`;
    if (h.type === "timber" && m.parts) return `<section class="ae-card"><h2>Tách lợi nhuận rừng quý này</h2>${hbars([{ l: "Tăng trưởng sinh học", v: m.parts.growth, c: "#5CC9A7" }, { l: "Thay đổi giá gỗ", v: m.parts.price, c: "#E0A75C", tone: tone(m.parts.price) }, { l: "Thay đổi giá đất", v: m.parts.landChg, c: "#C9A86A", tone: tone(m.parts.landChg) }], m$)}<p class="ae-muted">Gỗ đứng ${Math.round(m.parts.vol).toLocaleString("en-US")} m³ · giá gỗ tròn $${(m.parts.px / 100).toFixed(0)}/m³ · đất ${m$(m.parts.land)}.</p></section>`;
    if (h.type === "futures" && m.parts) return `<section class="ae-card"><h2>Tách lợi nhuận futures quý này <small>mô hình của game</small></h2>${hbars([{ l: "Giá giao ngay", v: m.parts.spot, c: "#E0A75C", tone: tone(m.parts.spot) }, { l: "Roll (contango −, backwardation +)", v: m.parts.roll, c: "#B49AF0", tone: tone(m.parts.roll) }, { l: "Lãi tài sản ký quỹ", v: m.parts.collateral, c: "#5CC9A7" }], x => pct(x))}<p class="ae-muted">Đường cong hiện tại: năng lượng ${g.world.kE > 0 ? "contango" : "backwardation"}, kim loại ${g.world.kM > 0 ? "contango" : "backwardation"}, nông sản ${g.world.kA > 0 ? "contango" : "backwardation"}.</p></section>`;
    if (h.type === "hf") {
      const lev = t.lev, L = Object.entries(A.STRATS).reduce((s, [k, st]) => s + (t.w[k] || 0) * st.long, 0) * lev, S = Object.entries(A.STRATS).reduce((s, [k, st]) => s + (t.w[k] || 0) * st.short, 0) * lev;
      const ex = E.exposure({ equity: 1, long: L, short: S });
      return `<section class="ae-card"><h2>Exposure và chiến lược</h2><dl class="ae-dl"><div><dt>Gross exposure</dt><dd>${pct(ex.gross, 0)}</dd></div><div><dt>Net exposure</dt><dd>${pct(ex.net, 0)}</dd></div><div><dt>Đòn bẩy</dt><dd>${lev}×</dd></div></dl>
        ${hbars(Object.entries(A.STRATS).map(([k, st]) => ({ l: `${st.name} (${pct(t.w[k] || 0, 0)})`, v: m.last ? m.last.rs[k] : 0, tone: tone(m.last ? m.last.rs[k] : 0), c: "#B49AF0" })), x => pct(x))}<p class="ae-muted">Lợi nhuận từng chiến lược trong quý gần nhất (trước đòn bẩy).</p></section>`;
    }
    if (h.type === "fof" && m.last) return `<section class="ae-card"><h2>Hai tầng phí quý gần nhất</h2><dl class="ae-dl"><div><dt>Lợi nhuận gộp</dt><dd>${pct(m.last.gross)}</dd></div><div><dt>Phí quỹ thành phần</dt><dd>${m$(m.last.innerFees)}</dd></div><div><dt>Phí fund of funds</dt><dd>${m$(m.last.outerFees)}</dd></div><div><dt>Lợi nhuận ròng</dt><dd>${pct(m.last.net)}</dd></div></dl></section>`;
    if (h.type === "re") return `<section class="ae-card"><h2>Bất động sản</h2><dl class="ae-dl"><div><dt>NOI năm</dt><dd>${m$(m.noi)}</dd></div><div><dt>Tỷ suất thu nhập</dt><dd>${pct(m.y || t.y0)}</dd></div><div><dt>LTV</dt><dd>${pct(h.debt / Math.max(1, h.value), 1)}</dd></div><div><dt>Lãi vay</dt><dd>${pct(t.debtRate)}</dd></div></dl><p class="ae-muted">Mô hình của game: giá trị = NOI năm tới / tỷ suất thu nhập; tỷ suất thay đổi theo lãi suất và spread; thẩm định có độ trễ.</p></section>`;
    if (h.type === "infra") return `<section class="ae-card"><h2>Hạ tầng</h2><dl class="ae-dl"><div><dt>Giai đoạn</dt><dd>${m.built ? `Khai thác năm ${fx(m.opYears, 2)}/${t.years}` : `Xây dựng (${m.age}/${t.buildQ} quý)`}</dd></div><div><dt>Doanh thu năm hiện tại</dt><dd>${m$(m.rev)}</dd></div><div><dt>Loại doanh thu</dt><dd>${t.availability ? "Availability payments" : "Theo sử dụng"}</dd></div><div><dt>Vượt chi phí</dt><dd>${m.overrun} lần</dd></div></dl><p class="ae-muted">Không có giá trị cuối kỳ: hết nhượng quyền, tài sản chuyển giao cho nhà nước.</p></section>`;
    if (h.type === "token") return `<section class="ae-card"><h2>Tài sản số</h2><p>Lưu ký: <b>${esc({ custodian: "tổ chức lưu ký", self: "ví tự quản lý", exchange: "trên sàn" }[t.custody])}</b> · staking: ${t.staking ? "có (Proof of Stake)" : "không"}.</p><p class="ae-muted">Rủi ro mất token mỗi quý: sàn cao nhất, ví tự quản lý trung bình, tổ chức lưu ký thấp nhất (mô hình của game).</p></section>`;
    return "";
  }

  // ======================= 11. Risk centre =======================
  function risk() {
    const g = AE.G, f = g.fund, nav = F.nav(f), liq = F.liquidity(f), ex = F.exposure(f), br = G.breaches(g), L = C.MANDATE;
    const act = f.holdings.filter(h => h.status === "active").sort((a, b) => (b.value - b.debt + b.unfunded) - (a.value - a.debt + a.unfunded));
    const hfs = act.filter(h => h.type === "hf");
    // stress tests: simple sensitivities by asset type (game model, labelled)
    const SENS = { eq: { pefund: 1.1, coinv: 1.2, equity: 1.1, reit: 0.7, hf: 0.3, fof: 0.3, dlteq: 0.9, token: 1.6, dfund: 1.6, infra: 0.2, re: 0.3, loan: 0.1 }, rate: { re: -6, reit: -5, infra: -8, farm: -3, timber: -2, loan: -1, distressed: -2, pefund: -2 }, credit: { loan: -2, distressed: -3, equity: -2, pefund: -1.5, coinv: -1.5, hf: -1, fof: -0.8 }, re: { re: 1, reit: 0.8 }, cmd: { futures: 1, gold: 0.5, farm: 0.2 }, crypto: { token: 1, dfund: 1, dlteq: 0.5 } };
    const scen = [["Cổ phiếu −25%", "eq", -0.25], ["Lãi suất +2%", "rate", 0.02], ["Spread tín dụng +3%", "credit", 0.03], ["Bất động sản −15%", "re", -0.15], ["Hàng hóa −30%", "cmd", -0.3], ["Tài sản số −60%", "crypto", -0.6]];
    const stress = scen.map(([l, k, s]) => { let d = 0; for (const h of act) d += h.value * (SENS[k][h.type] || 0) * s; return { l, v: Math.round(d) }; });
    shell("risk", `${hd("Risk Management Center", "Trung tâm rủi ro", "Sophia Laurent theo dõi mandate, thanh khoản, tập trung và đòn bẩy. Vi phạm làm giảm điểm Hội đồng.", SIM())}
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Giới hạn mandate</h2><table class="ae-table"><thead><tr><th>Quy tắc</th><th class="r">Hiện tại</th><th class="r">Giới hạn</th><th></th></tr></thead><tbody>
          ${[["Một khoản (giá trị ròng + vốn chưa gọi)", act.length ? (act[0].value - act[0].debt + act[0].unfunded) / nav : 0, L.single, "max"], ["Tài sản kém thanh khoản", liq.illiquidPct, L.illiquid, "max"], ["Tài sản số", ex.by.digital / nav, L.digital, "max"], ["Nợ cấp quỹ", f.debt / nav, L.fundDebt, "max"], ["Tiền mặt + thanh khoản", (liq.buckets.cash + liq.buckets.liquid) / nav, L.minLiquid, "min"]].map(([l, v, lim, k]) => { const bad = k === "max" ? v > lim + 1e-9 : v < lim; return `<tr><td>${l}</td><td class="r ${bad ? "down" : ""}">${pct(v, 1)}</td><td class="r">${k === "max" ? "≤" : "≥"} ${pct(lim, 0)}</td><td>${bad ? icon("alert", 14) : icon("check", 14)}</td></tr>`; }).join("")}
          <tr><td>Đòn bẩy hedge fund</td><td class="r">${hfs.length ? Math.max(...hfs.map(h => h.terms.lev)) + "×" : "—"}</td><td class="r">≤ ${L.hfLev}×</td><td>${icon("check", 14)}</td></tr></tbody></table>
          ${br.length ? `<div class="ae-callout bad">${br.map(esc).join("<br>")}</div>` : `<p class="ae-ok">${icon("check", 14)} Không vi phạm.</p>`}</article>
        <article class="ae-card"><h2>Thang thanh khoản</h2>${hbars([{ l: "Tiền mặt", v: liq.buckets.cash, c: "#9AA3B5" }, { l: "Thanh khoản cao", v: liq.buckets.liquid, c: "#5CC9A7" }, { l: "Theo quý (hedge fund, nợ khó đòi)", v: liq.buckets.semi, c: "#B49AF0" }, { l: "Kém thanh khoản", v: liq.buckets.illiquid, c: "#E0A75C" }], v => `${m$(v)} · ${pct(nav ? v / nav : 0, 0)}`)}
          <dl class="ae-dl"><div><dt>Gọi vốn dự kiến 4 quý</dt><dd>${m$(liq.need)}</dd></div><div><dt>Nguồn sẵn có</dt><dd>${m$(liq.avail)}</dd></div><div><dt>${tip("Coverage")}</dt><dd class="${liq.coverage < 1 ? "down" : "up"}">${isFinite(liq.coverage) ? fx(liq.coverage) + "×" : "∞"}</dd></div><div><dt>Vốn cam kết chưa gọi</dt><dd>${m$(liq.unfunded)}</dd></div></dl>
          <h3>Hạn mức tín dụng của quỹ</h3><p>Đã dùng ${m$(f.debt)} / ${m$(f.credit.limit)} · lãi ${pct(f.credit.rate)}</p>
          <div class="ae-row"><button type="button" class="ae-btn sm" data-ae="credit" data-op="draw" ${f.credit.limit - f.debt >= E.M(1) ? "" : "disabled"}>Rút $1M</button><button type="button" class="ae-btn sm" data-ae="credit" data-op="repay" ${f.debt > 0 ? "" : "disabled"}>Trả $1M</button></div></article></section>
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Kiểm tra sức chịu đựng <small>mô hình độ nhạy của game</small></h2>${hbars(stress.map(s => ({ l: s.l, v: s.v, tone: tone(s.v), c: s.v < 0 ? "#E07A6F" : "#5CC9A7" })), v => `${m$(v)} · ${pct(nav ? v / nav : 0, 1)}`)}<p class="ae-muted">Ước tính tác động tức thời lên giá trị tài sản theo độ nhạy giả định cho từng loại tài sản; không phải dự báo.</p></article>
        <article class="ae-card"><h2>Tập trung</h2>${hbars(act.slice(0, 6).map(h => ({ l: h.name, v: (h.value - h.debt + h.unfunded) / nav, c: A.CLASSES[h.cls].color, tone: (h.value - h.debt + h.unfunded) / nav > L.single ? "down" : "" })), x => pct(x, 1))}
          ${hfs.map(h => { const lev = h.terms.lev, Lg = Object.entries(A.STRATS).reduce((s, [k, st]) => s + (h.terms.w[k] || 0) * st.long, 0) * lev, Sh = Object.entries(A.STRATS).reduce((s, [k, st]) => s + (h.terms.w[k] || 0) * st.short, 0) * lev, x = E.exposure({ equity: 1, long: Lg, short: Sh }); return `<p>${esc(h.name)}: gross ${pct(x.gross, 0)}, net ${pct(x.net, 0)}, đòn bẩy ${lev}×</p>`; }).join("")}</article></section>`);
  }

  // ======================= 12. Market events =======================
  function events() {
    const g = AE.G, w = g.world, hs = w.hist;
    const s = (k, mult) => hs.map(r => [r.q, r[k] * (mult || 1)]);
    shell("events", `${hd("Market Events", `Kinh tế: ${esc(W.REGIMES[w.regime].name)}`, "Mọi biến kinh tế liên quan với nhau nhưng mỗi loại tài sản phản ứng khác nhau. Cùng seed và cùng sự kiện cho cùng diễn biến.", SIM())}
      <section class="ae-kgrid">${[["Tăng trưởng", pct(w.gdp, 1)], ["Lạm phát", pct(w.infl, 1)], ["Lãi suất chính sách", pct(w.rate)], ["Spread tín dụng", pct(w.spread)], ["Biến động", pct(w.vol, 0)], ["Thanh khoản", pct(w.liq, 0)], ["Cổ phiếu (chỉ số)", fx(w.eqIdx, 1)], ["Năng lượng", fx(w.energy, 1)], ["Kim loại", fx(w.metals, 1)], ["Nông sản", fx(w.ags, 1)], ["Văn phòng", fx(w.office, 1)], ["Nhà ở", fx(w.resi, 1)], ["Lưu lượng giao thông", fx(w.traffic, 1)], ["Giá gỗ", fx(w.timber, 1)], ["Giá đất", fx(w.land, 1)], ["Token", fx(w.token, 1)]].map(([l, v]) => `<div class="ae-k"><small>${l}</small><b>${v}</b></div>`).join("")}</section>
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Lãi suất, lạm phát, spread</h2>${line([{ name: "Lãi suất", color: "#C9A86A", pts: s("rate", 100) }, { name: "Lạm phát", color: "#E07A6F", pts: s("infl", 100) }, { name: "Spread", color: "#7FA8E6", pts: s("spread", 100) }], { fy: v => v.toFixed(1) + "%" })}</article>
        <article class="ae-card"><h2>Chỉ số tài sản (100 = đầu game)</h2>${line([{ name: "Cổ phiếu", color: "#7FA8E6", pts: s("eqIdx") }, { name: "Văn phòng", color: "#5CC9A7", pts: s("office") }, { name: "Năng lượng", color: "#E0A75C", pts: s("energy") }, { name: "Token", color: "#E57FB0", pts: s("token") }], { fy: v => v.toFixed(0) })}</article></section>
      <section class="ae-card"><h2>Nhật ký sự kiện</h2>${g.events.length ? `<ul class="ae-inbox">${g.events.map(e => `<li class="k-event">${avatar((C.EVENTS[e.id] || {}).from || "marcus", 30)}<div><b>${esc(e.title)}</b><small>${W.label(e.q)}</small><p>${esc(e.text)}</p></div></li>`).join("")}</ul>` : `<p class="ae-muted">Chưa có sự kiện.</p>`}</section>`);
  }

  // ======================= 14. Performance report =======================
  function report() {
    const g = AE.G, f = g.fund, rng = AE.ui.tab.rep || "all", nh = f.navHist;
    const q0 = rng === "q" ? g.q : rng === "y" ? Math.max(1, g.q - 3) : 1;
    const p = F.pnl(f, q0, g.q), v = F.verify(f), fi = F.fundIrr(f, g.q), b = g.board || G.scorecard(g);
    const gross = p.income + p.realized + p.unrealized, fees = p.mgmtFee + p.perfFee;
    shell("report", `${hd("Performance Report", "Báo cáo hiệu quả", "Lợi nhuận gộp → phí → chi phí → lợi nhuận ròng. Mỗi con số cộng lại từ sổ cái đã đối soát.", SIM())}
      <div class="ae-tabs">${[["q", "Quý này"], ["y", "4 quý gần nhất"], ["all", "Từ đầu"]].map(([k, l]) => `<button type="button" class="${rng === k ? "on" : ""}" data-ae="tab" data-t="rep" data-v="${k}">${l}</button>`).join("")}<button type="button" data-ae="csv">${icon("download", 14)} Tải sổ cái CSV</button></div>
      <section class="ae-grid ae-g2">
        <article class="ae-card"><h2>Từ gộp tới ròng (${rng === "all" ? "từ đầu" : W.label(q0) + " – " + W.label(g.q)})</h2>
          <table class="ae-table"><tbody>${[["income", 0], ["realized", 0], ["unrealized", 0]].map(([k]) => `<tr><td>${esc(F.CAT_NAME[k])}</td><td class="r ${tone(p[k])}">${m$(p[k])}</td></tr>`).join("")}
            <tr class="sum"><td>Lợi nhuận gộp từ tài sản</td><td class="r ${tone(gross)}">${m$(gross)}</td></tr>
            ${["mgmtFee", "perfFee"].map(k => `<tr><td>${esc(F.CAT_NAME[k])}</td><td class="r ${tone(p[k])}">${m$(p[k])}</td></tr>`).join("")}
            ${["expense", "interest"].map(k => `<tr><td>${esc(F.CAT_NAME[k])}</td><td class="r ${tone(p[k])}">${m$(p[k])}</td></tr>`).join("")}
            <tr class="sum"><td>Lợi nhuận ròng</td><td class="r ${tone(gross + fees + p.expense + p.interest)}">${m$(gross + fees + p.expense + p.interest)}</td></tr>
            <tr><td>${esc(F.CAT_NAME.flow)}</td><td class="r">${m$(p.flow)}</td></tr></tbody></table>
          <p class="ae-muted">Vay nợ không phải lợi nhuận; phân phối chỉ chuyển giá trị thành tiền mặt (không tính hai lần). Phí của quỹ PE nằm trong capital call.</p></article>
        <article class="ae-card"><h2>Chỉ số</h2><dl class="ae-dl"><div><dt>${tip("TWR")} từ đầu</dt><dd class="${tone(b.d.twr)}">${pct(b.d.twr)}</dd></div><div><dt>TWR năm hóa</dt><dd>${pct(b.d.ann)}</dd></div><div><dt>Chuẩn 60/40 năm hóa</dt><dd>${pct(b.d.annB)}</dd></div>
          <div><dt>IRR của quỹ (theo tiền)</dt><dd>${fi && fi.status === "unique" ? pct(fi.irr) : "—"}</dd></div><div><dt>Sụt giảm tối đa</dt><dd class="down">${pct(b.d.dd)}</dd></div><div><dt>Biến động năm hóa</dt><dd>${pct(E.stdev(nh.slice(1).map(r => r.ret)) * 2)}</dd></div></dl>
          <h3>Đối soát</h3><p class="${v.ok ? "ae-ok" : "ae-warn"}">${icon(v.ok ? "check" : "alert", 14)} ${v.ok ? `Sổ cái khớp: ${f.ledger.length} bút toán, mã băm ${esc(f.hash)}. NAV = vốn ban đầu + tổng các khoản = ${m$(v.nav)}.` : esc(v.errors.slice(0, 3).join("; "))}</p>
          ${g.tampered ? `<p class="ae-warn">${icon("alert", 14)} Ván này từng được tải từ tệp không khớp mã kiểm tra.</p>` : ""}</article></section>
      <section class="ae-card"><h2>Theo quý</h2><div class="ae-tablewrap"><table class="ae-table sm"><thead><tr><th>Quý</th><th class="r">NAV</th><th class="r">Lợi nhuận</th><th class="r">Chuẩn 60/40</th><th class="r">Điểm HĐQT</th><th>Sự kiện</th></tr></thead><tbody>${g.reports.map(r => `<tr><td>${W.label(r.q)}</td><td class="r">${m$(r.nav)}</td><td class="r ${tone(r.ret)}">${pct(r.ret)}</td><td class="r">${pct(r.bench)}</td><td class="r">${Math.round(r.total)}</td><td>${esc(r.events.join(", "))}${r.review ? ` · Đánh giá chương ${r.review.ch}: ${r.review.pass ? "đạt" : "cảnh cáo"}` : ""}</td></tr>`).join("") || `<tr><td colspan="6">Chưa có quý nào kết thúc.</td></tr>`}</tbody></table></div></section>
      <section class="ae-card"><h2>Đánh giá chương</h2>${g.reviews.length ? `<table class="ae-table"><thead><tr><th>Chương</th><th>Quý</th><th class="r">Điểm</th><th>Kết quả</th></tr></thead><tbody>${g.reviews.map(r => `<tr><td>${r.ch}. ${esc(C.CHAPTERS[r.ch - 1].title)}</td><td>${W.label(r.q)}</td><td class="r">${Math.round(r.sc.total)}</td><td>${r.pass ? "Đạt" : "Cảnh cáo"}</td></tr>`).join("")}</tbody></table>` : `<p class="ae-muted">Chưa có.</p>`}</section>`);
  }
  function csv() {
    const g = AE.G; if (!g) return;
    const rows = [["seq", "quarter", "type", "holding", "cash_usd", "value_usd", "debt_usd", "note"]].concat(g.fund.ledger.map(r => [r.s, W.label(r.q), r.t, r.h || "", (r.c / 100).toFixed(2), (r.v / 100).toFixed(2), ((r.d + r.fd) / 100).toFixed(2), `"${String(r.n).replace(/"/g, "'")}"`]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `alternative-empire-ledger-${W.label(g.q).replace("/", "-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ======================= 13. Academy =======================
  function academy() {
    const g = current(), lm = AE.ui.lm || 1, L = C.LMS[lm];
    const pq = AE.ui.practiceQ && C.QUESTIONS.find(q => q.id === AE.ui.practiceQ.id);
    const wrong = g ? g.wrong.map(id => C.QUESTIONS.find(q => q.id === id)).filter(Boolean) : [];
    const weak = g ? G.weaknesses(g) : [];
    shell("academy", `${hd("Learning Academy", "Học viện Aurelion", "Khái niệm, công thức và hiểu lầm thường gặp của 7 Learning Modules; luyện câu hỏi A/B/C và bài tính toán. Nội dung biên soạn riêng cho game.")}
      <div class="ae-tabs">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" class="${lm === n ? "on" : ""}" data-ae="lm" data-v="${n}">LM${n}${g ? ` · ${Math.round(G.mastery(g, n) * 100)}%` : ""}</button>`).join("")}</div>
      <section class="ae-grid ae-g2">
        <article class="ae-card"><p class="ae-kicker">Learning Module ${lm}</p><h2>${esc(L.title)}</h2><p class="ae-muted">${esc(L.vi)}</p><h3>Learning outcomes</h3><ul>${L.los.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
          ${C.CONCEPTS[lm].map(([t, b, fm]) => `<div class="ae-concept"><b>${esc(t)}</b><p>${esc(b)}</p>${fm ? `<code>${esc(fm)}</code>` : ""}</div>`).join("")}</article>
        <article class="ae-card"><h2>Luyện tập A/B/C</h2>${pq ? questionHtml(pq, AE.ui.practiceQ.a, 'data-ae="pans"') : `<p class="ae-muted">Chọn “Câu hỏi mới”. Đáp án chỉ hiện sau khi trả lời${g ? "; kết quả được tính vào mức thành thạo" : " (chưa có ván chơi: không lưu kết quả)"}.</p>`}
          <div class="ae-row"><button type="button" class="ae-btn gold" data-ae="pnew">${icon("plus", 14)} Câu hỏi mới (LM${lm})</button></div>
          <h3>Bài tính toán</h3>${AE.ui.prac ? practiceHtml() : `<p class="ae-muted">Sinh bài mới với số liệu ngẫu nhiên, chấm bằng engine.</p>`}
          <div class="ae-row">${[["hffee", "Phí hedge fund"], ["waterfall", "Waterfall"], ["irr", "IRR/MOIC"], ["lev", "Đòn bẩy"], ["forward", "Giá kỳ hạn"], ["exposure", "Exposure"], ["fof", "Fund of funds"]].map(([k, l]) => `<button type="button" class="ae-btn sm" data-ae="prac" data-v="${k}">${l}</button>`).join("")}</div></article></section>
      ${g ? `<section class="ae-grid ae-g2"><article class="ae-card"><h2>Mức thành thạo theo module</h2>${hbars([1, 2, 3, 4, 5, 6, 7].map(n => ({ l: `LM${n} (${g.know[n].r}/${g.know[n].n})`, v: G.mastery(g, n), c: G.mastery(g, n) < 0.6 ? "#E07A6F" : "#5CC9A7" })), x => pct(x, 0))}
          ${weak.length && weak[0].m < 0.7 ? `<p class="ae-warn">Điểm yếu: LM${weak[0].lm} — ${esc(C.LMS[weak[0].lm].title)} (${pct(weak[0].m, 0)})</p>` : ""}</article>
        <article class="ae-card"><h2>Câu đã sai (${wrong.length})</h2>${wrong.length ? `<ul class="ae-wrong">${wrong.slice(0, 15).map(q => `<li><button type="button" class="ae-link" data-ae="pretry" data-q="${q.id}">LM${q.lm}: ${esc(q.q.slice(0, 110))}${q.q.length > 110 ? "…" : ""}</button></li>`).join("")}</ul>` : `<p class="ae-muted">Chưa có câu sai.</p>`}</article></section>` : ""}`);
  }
  function practiceHtml() {
    const p = AE.ui.prac, t = p.task;
    return `<dl class="ae-givens">${t.givens.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <div class="ae-fields" id="ae-prac">${t.fields.map(f => `<label class="ae-field ${p.done ? (G.checkField(f, p.ans[f.id]) ? "ok" : "bad") : ""}"><span>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</span>${f.select ? `<select data-f="${f.id}" ${p.done ? "disabled" : ""}><option value="">— chọn —</option>${f.select.map(o => `<option value="${o[0]}" ${p.ans && p.ans[f.id] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : `<input data-f="${f.id}" inputmode="decimal" value="${p.done ? esc(p.ans[f.id] || "") : ""}" ${p.done ? "disabled" : ""}>`}${p.done ? `<em>Đáp án: ${f.select ? esc(f.select.find(o => o[0] === f.ans)[1]) : fx(f.ans)}</em>` : ""}</label>`).join("")}</div>
      ${p.done ? `<div class="ae-callout"><b>Công thức.</b> ${esc(t.formula)}<ol>${t.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>` : `<button type="button" class="ae-btn gold" data-ae="pcheck">Chấm</button>`}`;
  }
  const PRAC_LM = { hffee: 2, waterfall: 2, irr: 2, lev: 2, forward: 5, exposure: 6, fof: 6 };

  // ======================= 8. Calculator =======================
  const CALCS = [["fee", "Phí hedge fund"], ["hwm", "High-water mark nhiều năm"], ["wf", "Waterfall"], ["ae", "American vs European"], ["irr", "IRR / NPV / MOIC"], ["lev", "Đòn bẩy"], ["fwd", "Giá kỳ hạn"], ["gp", "Lợi nhuận GP (catch-up)"]];
  const CALC_FORMS = {
    fee: [["P0", "Giá trị đầu kỳ ($M)", 100], ["P1", "Giá trị cuối kỳ trước phí ($M)", 130], ["rm", "Phí quản lý (%)", 2], ["basis", "Cơ sở phí quản lý", "end", [["end", "Giá trị cuối kỳ"], ["begin", "Giá trị đầu kỳ"]]], ["p", "Phí hiệu suất (%)", 20], ["pb", "Phí hiệu suất tính", "independent", [["independent", "Độc lập"], ["net", "Sau phí quản lý"]]], ["rh", "Hurdle (%)", 0], ["ht", "Loại hurdle", "none", [["none", "Không"], ["hard", "Hard"], ["soft", "Soft"]]], ["hwm", "High-water mark ($M, để trống nếu không)", ""]],
    hwm: [["start", "Vốn ban đầu ($M)", 100], ["rets", "Lợi nhuận gộp từng năm (%, cách nhau bằng dấu phẩy)", "30, -10, 15"], ["rm", "Phí quản lý (%) trên cuối kỳ", 1], ["p", "Phí hiệu suất (%)", 20], ["pb", "Tính", "net", [["independent", "Độc lập"], ["net", "Sau phí quản lý"]]]],
    wf: [["cap", "Vốn góp ($M)", 100], ["proc", "Tiền thu về ($M)", 160], ["pref", "Preferred return (%/năm)", 8], ["yrs", "Số năm", 2], ["mode", "Cách tính pref", "simple", [["simple", "Lãi đơn"], ["compound", "Lãi kép"]]], ["carry", "Carried interest (%)", 20], ["cu", "Catch-up cho GP (%; 0 = hard hurdle)", 100]],
    ae: [["deals", "Thương vụ: vốn:thu về, cách nhau bằng dấu chấm phẩy ($M)", "10:20; 20:35; 40:80; 35:25; 30:0"], ["carry", "Carried interest (%)", 20], ["claw", "Clawback", "yes", [["yes", "Có"], ["no", "Không"]]]],
    irr: [["cfs", "Dòng tiền (năm 0, 1, 2…; $M, cách nhau bằng dấu phẩy)", "-2.5, -4, -1.7, -0.5, 1, 3, 12.5"], ["rate", "Lãi suất chiết khấu cho NPV (%)", 10]],
    lev: [["r", "Lợi nhuận danh mục (%)", 8], ["vc", "Vốn chủ sở hữu ($M)", 100], ["vb", "Vốn vay ($M)", 50], ["rb", "Lãi vay (%)", 4]],
    fwd: [["S0", "Giá giao ngay", 80], ["r", "Lãi suất phi rủi ro (%)", 4], ["c", "Chi phí lưu kho (%)", 2], ["i", "Convenience yield (%)", 1], ["T", "Kỳ hạn (năm)", 1]],
    gp: [["r", "Lợi nhuận quỹ trong kỳ (%)", 18], ["rh", "Hurdle (%)", 8], ["p", "Phí hiệu suất (%)", 20], ["cu", "Catch-up", "no", [["no", "Không"], ["yes", "Toàn phần"]]]]
  };
  function calc() {
    const k = AE.ui.calc || "fee", form = CALC_FORMS[k], vals = AE.ui.cv && AE.ui.cv[k] || Object.fromEntries(form.map(f => [f[0], f[2]]));
    AE.ui.cv = AE.ui.cv || {}; AE.ui.cv[k] = vals;
    shell("calc", `${hd("Financial Calculator", "Máy tính tài chính", "Cùng engine với game: mỗi kết quả có công thức, giá trị đầu vào và từng bước. Nhập sai sẽ báo lỗi thay vì ra số giả.")}
      <div class="ae-tabs">${CALCS.map(([id, l]) => `<button type="button" class="${k === id ? "on" : ""}" data-ae="calc" data-v="${id}">${l}</button>`).join("")}<button type="button" data-ae="baii">${icon("calc", 14)} BA II Plus</button></div>
      <section class="ae-grid ae-g2"><form class="ae-card ae-form" id="ae-calcform" data-k="${k}">${form.map(f => f[3] ? `<label><span>${esc(f[1])}</span><select name="${f[0]}">${f[3].map(o => `<option value="${o[0]}" ${vals[f[0]] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select></label>` : `<label><span>${esc(f[1])}</span><input name="${f[0]}" value="${esc(String(vals[f[0]]))}" autocomplete="off"></label>`).join("")}</form>
        <article class="ae-card" id="ae-calcout">${calcOut(k, vals)}</article></section>`);
  }
  const nums = s => String(s).split(",").map(x => x.trim()).filter(x => x !== "").map(Number);
  function calcOut(k, v) {
    try {
      const n = x => { const y = parseFloat(String(x).replace(",", ".")); E.need(isFinite(y), "Giá trị không phải số"); return y; };
      if (k === "fee") {
        const r = E.hfFees({ P0: E.M(n(v.P0)), P1: E.M(n(v.P1)), mgmtRate: n(v.rm) / 100, mgmtBasis: v.basis, perfRate: n(v.p) / 100, perfBasis: v.pb, hurdle: n(v.rh) / 100, hurdleType: v.ht, hwm: String(v.hwm).trim() ? E.M(n(v.hwm)) : null });
        return `<h2>Lợi nhuận ròng ${pct(r.ret)}</h2><p class="ae-muted">Gộp ${pct(r.gross)} · tổng phí ${m$(r.fees)}</p><ol>${r.steps.map(s => `<li>${esc(s.k)} = ${esc(s.f)} = <b>${m$(s.v)}</b></li>`).join("")}</ol><p class="ae-muted">Công thức (dạng giáo trình): R<sub>GP</sub> = P1·rm + max{0, [P1(1 − rm) − P0(1 + rh)]·p}. Kết hợp hurdle với high-water mark: ngưỡng = max(HWM, P0(1 + rh)) — quy ước của game.</p>`;
      }
      if (k === "hwm") {
        const rets = nums(v.rets).map(x => x / 100); E.need(rets.length > 0 && rets.length <= 10, "Nhập 1–10 năm");
        const r = E.hfSeries({ start: E.M(n(v.start)), grossReturns: rets, mgmtRate: n(v.rm) / 100, perfRate: n(v.p) / 100, perfBasis: v.pb, useHwm: true });
        return `<h2>Lũy kế ròng ${pct(r.cumNet)} <small>gộp ${pct(r.cumGross)}</small></h2><table class="ae-table sm"><thead><tr><th>Năm</th><th class="r">Đầu kỳ</th><th class="r">Cuối kỳ trước phí</th><th class="r">HWM</th><th class="r">Phí QL</th><th class="r">Phí HS</th><th class="r">Ròng</th></tr></thead><tbody>${r.rows.map((x, i) => `<tr><td>${i + 1}</td><td class="r">${m$(x.P0)}</td><td class="r">${m$(x.P1)}</td><td class="r">${m$(x.hwm)}</td><td class="r">${m$(x.mgmt)}</td><td class="r">${m$(x.perf)}</td><td class="r ${tone(x.ret)}">${pct(x.ret)}</td></tr>`).join("")}</tbody></table><p class="ae-muted">High-water mark = giá trị cao nhất sau phí ở cuối các kỳ trước; không thu phí hiệu suất cho phần chỉ bù lỗ.</p>`;
      }
      if (k === "wf") {
        const r = E.waterfall({ capital: E.M(n(v.cap)), proceeds: E.M(n(v.proc)), pref: n(v.pref) / 100, years: n(v.yrs), prefMode: v.mode, carry: n(v.carry) / 100, catchUp: n(v.cu) / 100 });
        return `<h2>LP ${m$(r.lp)} · GP ${m$(r.gp)}</h2><table class="ae-table"><thead><tr><th>Tầng</th><th class="r">LP</th><th class="r">GP</th></tr></thead><tbody>${r.tiers.map(t => `<tr><td>${esc(t.k)}</td><td class="r">${m$(t.lp)}</td><td class="r">${m$(t.gp)}</td></tr>`).join("")}</tbody></table><p class="ae-muted">Preferred return ${m$(r.prefAmt)}. Catch-up đưa GP tới đúng tỷ lệ carry trên phần lợi nhuận đã chia; không catch-up = hard hurdle.</p>`;
      }
      if (k === "ae") {
        const ds = String(v.deals).split(";").map(x => x.trim()).filter(Boolean).map((x, i) => { const [a, b] = x.split(":").map(y => n(y)); return { name: "D" + (i + 1), invested: E.M(a), proceeds: E.M(b) }; });
        const r = E.dealWaterfalls(ds, { carry: n(v.carry) / 100, clawback: v.claw === "yes" });
        return `<h2>Lợi nhuận toàn quỹ ${m$(r.profit)}</h2><table class="ae-table sm"><thead><tr><th>Thương vụ</th><th class="r">Vốn</th><th class="r">Thu về</th><th class="r">Carry theo deal</th></tr></thead><tbody>${r.per.map(x => `<tr><td>${x.name}</td><td class="r">${m$(x.invested)}</td><td class="r">${m$(x.proceeds)}</td><td class="r">${m$(x.gpAmerican)}</td></tr>`).join("")}</tbody></table>
          <dl class="ae-dl"><div><dt>American: GP đã nhận</dt><dd>${m$(r.american.gpPaid)}</dd></div><div><dt>Clawback</dt><dd>${m$(r.american.clawback)}</dd></div><div><dt>American: GP giữ lại</dt><dd>${m$(r.american.gpKept)}</dd></div><div><dt>European: GP nhận</dt><dd>${m$(r.european.gp)}</dd></div></dl>${r.american.lost ? `<p class="ae-warn">Không có clawback: LP mất ${m$(r.american.lost)} carry trả thừa.</p>` : ""}`;
      }
      if (k === "irr") {
        const cfs = nums(v.cfs); E.need(cfs.length >= 2, "Cần ít nhất 2 dòng tiền");
        const r = E.irr(cfs), npv = E.npv(n(v.rate) / 100, cfs), out = cfs.filter(c => c < 0).reduce((s, c) => s - c, 0), inn = cfs.filter(c => c > 0).reduce((s, c) => s + c, 0);
        return `<h2>${r.status === "unique" ? `IRR ${pct(r.irr, 3)}` : r.status === "multiple" ? `Nhiều IRR: ${r.roots.map(x => pct(x, 2)).join(", ")}` : "Không có IRR"}</h2>${r.reason ? `<p class="ae-warn">${esc(r.reason)}</p>` : ""}
          <dl class="ae-dl"><div><dt>NPV tại ${pct(n(v.rate) / 100, 1)}</dt><dd class="${tone(npv)}">${fx(npv, 3)}</dd></div><div><dt>Số lần đổi dấu</dt><dd>${r.signChanges}</dd></div><div><dt>MOIC (thu về / chi ra)</dt><dd>${out > 0 ? fx(inn / out) + "×" : "—"}</dd></div></dl>
          ${line([{ name: "NPV theo lãi suất", color: "#C9A86A", pts: Array.from({ length: 41 }, (_, i) => [i, E.npv(i / 100, cfs)]) }], { fx: x => x + "%", fy: y => y.toFixed(1), zero: true, h: 160 })}<p class="ae-muted">IRR là nơi đường NPV cắt 0. Nhiều điểm cắt ⇒ nhiều IRR — khi đó không dùng IRR để xếp hạng.</p>`;
      }
      if (k === "lev") { const r = E.leveredReturn({ r: n(v.r) / 100, Vc: n(v.vc), Vb: n(v.vb), rb: n(v.rb) / 100 }); return `<h2>r<sub>L</sub> = ${pct(r.rL)}</h2><p>r<sub>L</sub> = r + (V<sub>b</sub>/V<sub>c</sub>)(r − r<sub>b</sub>) = ${pct(n(v.r) / 100)} + (${n(v.vb)}/${n(v.vc)}) × (${pct(n(v.r) / 100)} − ${pct(n(v.rb) / 100)})</p><p class="ae-muted">Đòn bẩy có lợi khi r > r<sub>b</sub>; hòa vốn khi lãi vay bằng ${pct(r.breakEvenRb)}.</p>`; }
      if (k === "fwd") { const r = E.forwardPrice({ S0: n(v.S0), r: n(v.r) / 100, c: n(v.c) / 100, i: n(v.i) / 100, T: n(v.T) }); return `<h2>F = ${fx(r.F, 4)} · ${r.shape}</h2><p>F<sub>0</sub>(T) = S<sub>0</sub> · e<sup>(r + c − i)T</sup></p><p class="ae-muted">Contango (F > S) thường làm giảm lợi nhuận của vị thế long khi cuộn hợp đồng; backwardation thường làm tăng.</p>`; }
      if (k === "gp") { const r = E.gpReturn({ r: n(v.r) / 100, rh: n(v.rh) / 100, p: n(v.p) / 100, catchUp: v.cu === "yes" }); return `<h2>r<sub>GP</sub> = ${pct(r.rGP)}</h2><p>${v.cu === "yes" ? `Catch-up r<sub>cu</sub> = p·r<sub>h</sub>/(1 − p) = ${pct(r.rcu)}; sau đó r<sub>GP</sub> = r<sub>cu</sub> + p(r − r<sub>h</sub> − r<sub>cu</sub>).` : "r<sub>GP</sub> = max[0, p(r − r<sub>h</sub>)] (hard hurdle, không catch-up)."}</p><p class="ae-muted">LP nhận ${pct(n(v.r) / 100 - r.rGP)}.</p>`; }
    } catch (e) { return `<div class="ae-callout bad">${icon("alert", 14)} ${esc(e.message)}</div>`; }
    return "";
  }

  // ======================= 15. Achievements & career =======================
  function achievements() {
    const g = AE.G, nx = G.careerNext(g);
    shell("achievements", `${hd("Sự nghiệp & Thành tựu", esc(C.CAREER[g.career - 1].name), "Thăng chức dựa trên kiến thức, quản trị rủi ro và kết quả — không chỉ NAV.")}
      <section class="ae-card"><h2>Bậc thang sự nghiệp</h2><ol class="ae-ladder">${C.CAREER.map(c => `<li class="${c.lv <= g.career ? "on" : ""}"><b>${c.lv}. ${esc(c.name)}</b><small>${esc(c.need)}</small>${c.lv <= g.career ? chip("Đạt", "green") : c === nx ? chip("Tiếp theo", "gold") : ""}</li>`).join("")}</ol>
        <p class="ae-muted">Hiện tại: thành thạo trung bình ${pct(G.avgMastery(g), 0)} · uy tín ${g.rep} · niềm tin ${Math.round(g.trust)} · điểm rủi ro ${Math.round((g.board || G.scorecard(g)).risk)}${g.finalScore != null ? ` · điểm tổng kết ${g.finalScore}` : ""}</p></section>
      <section class="ae-cards">${Object.entries(C.ACHIEVEMENTS).map(([id, [t, d]]) => `<article class="ae-card ae-ach ${g.ach[id] != null ? "on" : ""}">${icon(g.ach[id] != null ? "star" : "lock", 22)}<b>${esc(t)}</b><p>${esc(d)}</p>${g.ach[id] != null ? `<small>${W.label(g.ach[id])}</small>` : ""}</article>`).join("")}</section>`);
  }

  // ======================= 16. Settings =======================
  function settings() {
    const p = P();
    shell("settings", `${hd("Settings", "Cài đặt", "Áp dụng cho tài khoản này trên trình duyệt này.")}
      <form class="ae-card ae-form" id="ae-settings">
        <label class="ae-switch"><input type="checkbox" name="sound" ${p.sound ? "checked" : ""}><span>Âm thanh hiệu ứng (tiếng bíp nhỏ khi kết thúc quý, ký thương vụ)</span></label>
        <label><span>Chuyển động</span><select name="motion"><option value="auto" ${p.motion === "auto" ? "selected" : ""}>Theo hệ thống</option><option value="reduce" ${p.motion === "reduce" ? "selected" : ""}>Giảm chuyển động</option><option value="full" ${p.motion === "full" ? "selected" : ""}>Đầy đủ</option></select></label>
        <label class="ae-switch"><input type="checkbox" name="confirmEnd" ${p.confirmEnd ? "checked" : ""}><span>Hỏi lại trước khi kết thúc quý khi có cảnh báo</span></label>
      </form>
      <section class="ae-card"><h2>Dữ liệu</h2><p class="ae-muted">Ván chơi lưu trong trình duyệt (localStorage) theo từng tài khoản: 3 ô lưu, mỗi ô ~150 KB. Không gửi lên máy chủ.</p>
        <button type="button" class="ae-btn danger" data-ae="wipe">${icon("trash", 14)} Xóa toàn bộ dữ liệu Alternative Empire</button></section>`);
  }

  // ======================= 17. Save / load =======================
  function saves() {
    P(); current();
    const rows = SLOTS.map((k, i) => {
      const r = raw(k);
      let s = null, err = null;
      if (r) { const d = G.deserialize(r); if (d.ok) s = Object.assign(G.summary(d.G), { at: d.G.updatedAt, seal: d.sealOk && d.ledgerOk }); else err = d.msg; }
      return { k, i, s, err, size: r ? r.length : 0 };
    });
    shell("saves", `${hd("Save / Load", "Lưu và tải game", "Ván đang chơi tự lưu vào ô của nó sau mỗi hành động. Có thể lưu sang ô khác, xuất ra tệp JSON hoặc nhập lại.")}
      <section class="ae-cards">${rows.map(({ k, i, s, err, size }) => `<article class="ae-card ae-slot ${AE.slot === k ? "cur" : ""}"><p class="ae-kicker">Ô ${i + 1}${AE.slot === k ? " · đang chơi" : ""}</p>
        ${s ? `<h3>${esc(s.name)}</h3><p>${s.label} · chương ${s.chapter} · ${m$(s.nav)}</p><p class="ae-muted">${esc(s.career)} · ${esc(W.DIFFICULTY[s.difficulty].name)} · seed ${s.seed} · ${s.at ? new Date(s.at).toLocaleString("vi-VN") : ""} · ${Math.round(size / 1024)} KB</p>${s.status !== "active" ? chip(s.status === "lost" ? "Đã thua" : "Đã kết thúc", "") : ""}${s.seal ? "" : chip("Không khớp mã kiểm tra", "red")}` : err ? `<p class="ae-warn">${esc(err)}</p>` : `<p class="ae-muted">Trống</p>`}
        <div class="ae-row">${s && AE.slot !== k ? `<button type="button" class="ae-btn sm gold" data-ae="load" data-k="${k}">Tải</button>` : ""}${AE.G && AE.slot !== k ? `<button type="button" class="ae-btn sm" data-ae="saveas" data-k="${k}">Lưu ván hiện tại vào đây</button>` : ""}
          ${s ? `<button type="button" class="ae-btn sm" data-ae="export" data-k="${k}">${icon("download", 14)} Xuất</button>` : ""}<label class="ae-btn sm">${icon("upload", 14)} Nhập<input type="file" accept="application/json,.json" data-ae-import="${k}" hidden></label>
          ${s || err ? `<button type="button" class="ae-btn sm danger" data-ae="delslot" data-k="${k}">Xóa</button>` : ""}</div></article>`).join("")}</section>`);
  }

  // ======================= Events =======================
  function formVals(form) { const o = {}; new FormData(form).forEach((v, k) => { o[k] = v; }); return o; }
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-ae]");
    if (!b || !(b.closest(".ae") || b.closest("#ae-modal"))) return;
    const act = b.dataset.ae, g = AE.G;
    if (act === "close") { closeModal(); if (b.tagName !== "A") e.preventDefault(); return; }
    if (act === "go") { if (!e.target.closest("a")) location.hash = b.dataset.href; return; }
    if (act === "endq") return endQuarter();
    if (act === "tab") { AE.ui.tab[b.dataset.t] = b.dataset.v; return rerender(); }
    if (act === "decide") { const r = G.resolve(g, b.dataset.d, b.dataset.o); if (!r.ok) return toast(r.msg, "error"); save(); toast(r.msg || "Đã quyết định"); return rerender(); }
    if (act === "step") {
      const r = G.submitStep(g, b.dataset.m, +b.dataset.i);
      if (!r.ok) return toast(r.msg, "error");
      if (r.retry) toast(r.msg, "error");
      AE.ui.qi = 0; save(); blip(r.score == null || r.score >= 0.6 ? "good" : "bad"); return rerender();
    }
    if (act === "classify") {
      const sec = b.closest(".ae-step"), ans = {};
      sec.querySelectorAll("select[data-k]").forEach(s => { ans[s.dataset.k] = s.value; });
      if (Object.values(ans).some(x => !x)) return toast("Hãy chọn cho mọi mục", "error");
      const r = G.submitStep(g, b.dataset.m, +b.dataset.i, ans); if (!r.ok) return toast(r.msg, "error");
      save(); blip(r.score >= 0.6 ? "good" : "bad"); toast(`Đúng ${Math.round(r.score * 100)}%`, r.score >= 0.6 ? "success" : "error"); return rerender();
    }
    if (act === "choice") { const r = G.submitStep(g, b.dataset.m, +b.dataset.i, b.dataset.o); if (!r.ok) return toast(r.msg, "error"); save(); return rerender(); }
    if (act === "compute") {
      const sec = b.closest(".ae-step"), ans = {};
      sec.querySelectorAll("[data-f]").forEach(x => { ans[x.dataset.f] = x.value.trim(); });
      if (Object.values(ans).some(x => x === "")) return toast("Hãy nhập đủ các ô", "error");
      const r = G.submitStep(g, b.dataset.m, +b.dataset.i, ans); if (!r.ok) return toast(r.msg, "error");
      save(); blip(r.score >= 0.6 ? "good" : "bad"); toast(`Đúng ${r.marks.filter(Boolean).length}/${r.marks.length}`, r.score >= 0.6 ? "success" : "error"); return rerender();
    }
    if (act === "qans") { const r = G.answer(g, b.dataset.q, +b.dataset.c, b.dataset.m); if (!r.ok) return toast(r.msg, "error"); save(); blip(r.correct ? "good" : "bad"); return rerender(); }
    if (act === "qnext") { AE.ui.qi = (AE.ui.qi || 0) + 1; return rerender(); }
    if (act === "invest") {
      const d = C.DEALS[b.dataset.id], pv = G.preview(g, b.dataset.id, AE.ui.form.v);
      if (!pv.ok) return toast(pv.errors.join("; "), "error");
      if (pv.warnings.length && !(await confirmDialog({ title: "Sophia cảnh báo", message: pv.warnings.map(esc).join("<br>") + "<br><br>Vẫn ký?", confirmText: "Ký" }))) return;
      const r = G.invest(g, b.dataset.id, AE.ui.form.v);
      if (!r.ok) return toast(r.msg, "error");
      save(); blip("good"); toast(`Đã ký: ${d.name}`); AE.ui.form = null;
      const back = C.MISSIONS.find(m => m.ch === g.chapter && m.steps.some(s => s.type === "deals" && s.deals.includes(b.dataset.id)) && !(g.missions[m.id] && g.missions[m.id].done));
      location.hash = back ? `#/alt/m/${back.id}` : `#/alt/h/${r.holding.id}`; return;
    }
    if (act === "nego" || act === "counter") {
      const id = b.dataset.id, asks = act === "counter" ? AE.ui.negoRes.r.counter : AE.ui.nego[id] || {};
      AE.ui.nego[id] = Object.assign({}, asks);
      const r = G.negotiate(g, id, asks, +b.dataset.c);
      AE.ui.negoRes = { id, r }; save(); blip(r.status === "accepted" ? "good" : "bad"); return rerender();
    }
    if (act === "sell") {
      const h = G.holding(g, b.dataset.h), fr = +b.dataset.f;
      if (!(await confirmDialog({ title: `Bán ${fr * 100}% ${h.name}?`, message: A.TYPES[h.type].liq === "illiquid" ? `Bán trên thị trường thứ cấp với chiết khấu ước tính ${pct(A.secondaryDiscount(h, g.world), 1)}.` : "Bán theo giá thị trường mô phỏng.", confirmText: "Bán", danger: true }))) return;
      const r = G.sellHolding(g, b.dataset.h, fr); if (!r.ok) return toast(r.msg, "error"); save(); toast(`Thu về ${m$(r.price)}`); return rerender();
    }
    if (act === "policy") { try { const r = G.setPolicy(g, b.dataset.h, b.dataset.k, +b.dataset.v); if (!r.ok) return toast(r.msg, "error"); save(); toast(r.msg || "Đã cập nhật"); } catch (err) { toast(err.message, "error"); } return rerender(); }
    if (act === "exit") { const r = G.exitHolding(g, b.dataset.h, b.dataset.r); if (!r.ok) return toast(r.msg, "error"); save(); toast(r.msg); return rerender(); }
    if (act === "credit") { const r = G.credit(g, b.dataset.op, E.M(1)); if (!r.ok) return toast(r.msg, "error"); save(); return rerender(); }
    if (act === "csv") return csv();
    if (act === "lm") { AE.ui.lm = +b.dataset.v; AE.ui.practiceQ = null; return rerender(); }
    if (act === "pnew") {
      const pool = C.QUESTIONS.filter(q => q.lm === (AE.ui.lm || 1)), pick = pool[Math.floor(Math.random() * pool.length)];
      AE.ui.practiceQ = { id: pick.id, a: null }; return rerender();
    }
    if (act === "pretry") { const q = C.QUESTIONS.find(x => x.id === b.dataset.q); AE.ui.lm = q.lm; AE.ui.practiceQ = { id: q.id, a: null }; rerender(); window.scrollTo(0, 0); return; }
    if (act === "pans") {
      const q = C.QUESTIONS.find(x => x.id === b.dataset.q), c = +b.dataset.c;
      AE.ui.practiceQ.a = c;
      if (g) { G.answer(g, q.id, c); save(); }
      blip(c === q.ans ? "good" : "bad"); return rerender();
    }
    if (act === "prac") {
      const gg = g || G.newGame({ seed: 1 });
      AE.ui.pracN = (AE.ui.pracN || 0) + 1;
      AE.ui.prac = { gen: b.dataset.v, task: G.GEN[b.dataset.v](gg, 1000 + AE.ui.pracN + Math.floor(Math.random() * 1e6)), done: false, ans: {} };
      return rerender();
    }
    if (act === "pcheck") {
      const p = AE.ui.prac, ans = {};
      document.querySelectorAll("#ae-prac [data-f]").forEach(x => { ans[x.dataset.f] = x.value.trim(); });
      if (Object.values(ans).some(x => x === "")) return toast("Hãy nhập đủ các ô", "error");
      p.ans = ans; p.done = true;
      const right = p.task.fields.filter(f => G.checkField(f, ans[f.id])).length;
      if (g) { G.learn(g, PRAC_LM[p.gen], p.task.fields.length, right); save(); }
      toast(`Đúng ${right}/${p.task.fields.length}`, right === p.task.fields.length ? "success" : "error"); return rerender();
    }
    if (act === "calc") { AE.ui.calc = b.dataset.v; return rerender(); }
    if (act === "baii") { if (typeof calcMount === "function") calcMount(); if (typeof calcOpen === "function") calcOpen(); return; }
    if (act === "load") { const r = loadSlot(b.dataset.k); if (!r.ok) return toast(r.msg, "error"); toast("Đã tải ván chơi"); location.hash = "#/alt/hq"; return; }
    if (act === "saveas") {
      const k = b.dataset.k;
      if (raw(k) && !(await confirmDialog({ title: "Ghi đè ô lưu?", message: "Ván trong ô này sẽ bị thay thế.", confirmText: "Ghi đè", danger: true }))) return;
      try { localStorage.removeItem(KEY(AE.pid, k)); } catch (err) { /* ignore */ }
      AE.slot = k; AE.stamp = null; P().cur = k; savePrefs(); save(); toast("Đã lưu"); return rerender();
    }
    if (act === "export") {
      const r = raw(b.dataset.k); if (!r) return;
      const blob = new Blob([r], { type: "application/json" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `alternative-empire-${b.dataset.k}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
    }
    if (act === "delslot") {
      if (!(await confirmDialog({ title: "Xóa ô lưu?", message: "Không thể hoàn tác.", confirmText: "Xóa", danger: true }))) return;
      try { localStorage.removeItem(KEY(AE.pid, b.dataset.k)); } catch (err) { /* ignore */ }
      if (AE.slot === b.dataset.k) { AE.G = null; AE.slot = null; P().cur = null; savePrefs(); }
      return rerender();
    }
    if (act === "wipe") {
      if (!(await confirmDialog({ title: "Xóa toàn bộ dữ liệu game?", message: "Mọi ô lưu và cài đặt của Alternative Empire trên tài khoản này sẽ bị xóa.", confirmText: "Xóa", danger: true, requireText: "XOA" }))) return;
      window.altClearProfile(AE.pid); P(); location.hash = "#/alt"; return;
    }
  });
  document.addEventListener("submit", e => {
    if (e.target.id === "ae-newform") { e.preventDefault(); startGame(new FormData(e.target)); }
    if (e.target.closest && e.target.closest(".ae")) e.preventDefault();
  });
  document.addEventListener("input", e => {
    const f = e.target.form || e.target.closest("form");
    if (!f) return;
    if (f.id === "ae-dealform") {
      const d = C.DEALS[f.dataset.id], v = formVals(f);
      for (const fl of d.form) if (!fl.options) v[fl.id] = +v[fl.id];
      AE.ui.form = { id: f.dataset.id, v };
      const out = e.target.parentElement.querySelector("output"); if (out) out.textContent = `$${e.target.value}M`;
      clearTimeout(AE.ui.dt); AE.ui.dt = setTimeout(() => refreshDeal(f.dataset.id), 120);
    }
    if (f.id === "ae-calcform") {
      AE.ui.cv[f.dataset.k] = formVals(f);
      const o = document.getElementById("ae-calcout"); if (o) o.innerHTML = calcOut(f.dataset.k, AE.ui.cv[f.dataset.k]);
    }
  });
  document.addEventListener("change", e => {
    const f = e.target.form;
    if (e.target.matches && e.target.matches("[data-ae-import]")) {
      const k = e.target.dataset.aeImport, file = e.target.files && e.target.files[0]; if (!file) return;
      if (file.size > 3e6) return toast("Tệp quá lớn", "error");
      const rd = new FileReader();
      rd.onload = async () => {
        const d = G.deserialize(String(rd.result));
        if (!d.ok) return toast(d.msg, "error");
        if (raw(k) && !(await confirmDialog({ title: "Ghi đè ô lưu?", message: "Ván trong ô này sẽ bị thay thế bằng tệp nhập.", confirmText: "Nhập", danger: true }))) return;
        try { localStorage.setItem(KEY(AE.pid, k), G.serialize(d.G)); } catch (err) { return toast("Bộ nhớ đầy", "error"); }
        if (!d.sealOk || !d.ledgerOk) toast("Tệp không khớp mã kiểm tra: ván được đánh dấu đã chỉnh sửa", "error"); else toast("Đã nhập");
        if (AE.slot === k) { AE.G = null; loadSlot(k); }
        rerender();
      };
      rd.readAsText(file); return;
    }
    if (!f) return;
    if (f.id === "ae-negoform") {
      const id = f.dataset.id, v = formVals(f); AE.ui.nego[id] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, +x])); AE.ui.negoRes = null; return rerender();
    }
    if (f.id === "ae-dealform") {
      const d = C.DEALS[f.dataset.id], v = formVals(f); for (const fl of d.form) if (!fl.options) v[fl.id] = +v[fl.id];
      AE.ui.form = { id: f.dataset.id, v }; refreshDeal(f.dataset.id); return;
    }
    if (f.id === "ae-calcform") { AE.ui.cv[f.dataset.k] = formVals(f); const o = document.getElementById("ae-calcout"); if (o) o.innerHTML = calcOut(f.dataset.k, AE.ui.cv[f.dataset.k]); return; }
    if (f.id === "ae-settings") {
      const p = P(); p.sound = f.sound.checked; p.motion = f.motion.value; p.confirmEnd = f.confirmEnd.checked; savePrefs(); toast("Đã lưu cài đặt");
      const r = document.getElementById("ae-root"); if (r) r.classList.toggle("ae-still", still());
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("ae-modal")) closeModal();
    if (e.key === "Enter" && e.target.matches && e.target.matches('tr[data-ae="go"]')) location.hash = e.target.dataset.href;
  });
})();

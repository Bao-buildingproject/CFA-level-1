// ============================================================
// coach/ui.js — Hoa Tiêu · CFA Compass v2 (route #/coach), in the Plan group.
//   (no profile)     welcome → setup (5 steps) → "Kế hoạch của bạn" (shown right after the plan is made)
//   #/coach          dashboard: countdown, readiness, latest result and current plan, today, topics, radar,
//                    history, recommendations, the CFA Tutor
//   #/coach/plan     today / week / month / whole period / versions;  plan/ready: the full plan, explained;
//                    plan/print: printable plan (PDF);  calendar (.ics) and spreadsheet (.csv) export
//   #/coach/test     diagnostics 45/90, 180-question mock, confirmation and topic tests, history
//   #/coach/analysis five levels: topic, module, skill, error classes, personal feedback
//   #/coach/review   spaced repetition ·  #/coach/bank  question bank integration ·  #/coach/method  method & status
//   #/coach/solutions/<module>  worked solutions of the questions you got wrong (remediation)
// Sessions (start, run, report) are in coach/run.js; data in coach/store.js; decisions in coach/engine.js.
// ============================================================
(function () {
  "use strict";
  const HT = window.HT, CE = window.CoachEngine;
  const C = () => HT.CO();
  const UI = { tab: "today", topic: null, step: 1, qbTried: null, month: null, delegated: false };
  const today = () => HT.today();
  const dmy = s => s ? s.split("-").reverse().join("/") : "";
  const fmtH = min => { const h = Math.round(min / 6) / 10; return `${String(h).replace(".", ",")} giờ`; };
  const DOWS = [["1", "T2"], ["2", "T3"], ["3", "T4"], ["4", "T5"], ["5", "T6"], ["6", "T7"], ["0", "CN"]];
  const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const BAND = { strong: ["Vững", "success"], developing: ["Đang tiến bộ", "application"], needs: ["Cần cải thiện", "warning"], weak: ["Yếu", "danger"], unknown: ["Chưa đủ bằng chứng", ""] };
  const CONF = { insufficient: "chưa đủ dữ liệu", low: "độ tin cậy thấp", medium: "độ tin cậy vừa", high: "độ tin cậy cao" };
  const chip = (txt, cls) => `<span class="badge ${cls ? "badge-" + cls : ""}">${esc(txt)}</span>`;
  const bandChip = b => chip(BAND[b][0], BAND[b][1]);
  const PHASE = ["Nền tảng & lấp lỗ hổng", "Học nội dung chính", "Củng cố & luyện tập", "Thi thử & ôn cuối"];
  const PHASE_TXT = ["Bài chẩn đoán, xác nhận các topic bạn tự nhận đã vững, khắc phục lỗi lặp lại và công cụ định lượng (QM-01 → QM-05).",
    "Học từng topic theo thứ tự giáo trình; luyện ngay sau mỗi module; kiểm tra cuối mỗi topic; ôn ngắt quãng các phần đã học.",
    "Luyện câu chưa làm theo mức ưu tiên, ôn lỗi sai, ôn công thức, giữ lịch ôn ngắt quãng.",
    "Thi thử 180 câu (2 phiên × 135 phút), phân tích kết quả, ôn phần yếu, ngày cuối ôn nhẹ."];

  // ---------- shared pieces ----------
  function subnav(active) {
    const items = [["", "Tổng quan", "home"], ["plan", "Kế hoạch", "calendar"], ["test", "Đánh giá", "clock"], ["analysis", "Phân tích", "pulse"], ["review", "Ôn tập", "cards"], ["bank", "Ngân hàng câu hỏi", "layers"], ["method", "Phương pháp", "book"]];
    return `<nav class="co-subnav" aria-label="Hoa Tiêu">${items.map(([r, l, ic]) => `<a href="#/coach${r ? "/" + r : ""}" class="${active === r ? "active" : ""}" ${active === r ? 'aria-current="page"' : ""}>${icon(ic, 16)}<span>${l}</span></a>`).join("")}</nav>`;
  }
  // the "plan was updated" notice stays (stored in the account) until the plan is opened or it is closed
  function head(title, sub, actions, active, o) {
    const c = C(), n = c.notice; o = o || {};
    return `${pageHeader(title, sub || "", actions || "", "Hoa Tiêu · CFA Compass")}${subnav(active)}
      ${!HT.saveOk() ? `<div class="callout warn">${icon("alert", 16)} <b>Không lưu được vào trình duyệt</b> (bộ nhớ có thể đã đầy). Thay đổi gần đây chỉ còn trong trang đang mở. Hãy <a href="#/settings">xuất bản sao lưu</a> và xóa bớt dữ liệu không cần.</div>` : ""}
      ${n && n.text ? `<div class="callout ht-notice" role="status">${icon("calendar", 16)} <span>${esc(n.text)}</span>${o.onPlan ? "" : ` <a href="#/coach/plan/ready">Xem kế hoạch</a>`}<button class="ht-notice-x" type="button" data-ht-notice-close aria-label="Đóng thông báo">×</button></div>` : ""}
      ${c.sess && c.sess.submittedAt == null ? `<div class="callout">${icon("clock", 16)} Bạn có một bài đang làm dở. <a class="btn btn-sm btn-primary" href="#/coach/run">Tiếp tục</a></div>` : ""}`;
  }
  function bars(rows) { return rows.map(r => `<div class="bar-row"><span>${esc(r.label)}</span>${progressBar(r.pct, r.tone || "")}<span class="num">${esc(r.text)}</span></div>`).join(""); }
  function radar(values) {
    const n = values.length, R = 92, cx = 130, cy = 120, pt = (i, r) => [cx + r * Math.sin(2 * Math.PI * i / n), cy - r * Math.cos(2 * Math.PI * i / n)];
    const ring = f => values.map((_, i) => pt(i, R * f).join(",")).join(" ");
    return `<svg class="co-radar" viewBox="0 0 260 240" role="img" aria-label="Mức nắm vững theo topic">
      ${[0.25, 0.5, 0.75, 1].map(f => `<polygon points="${ring(f)}" fill="none" stroke="currentColor" stroke-opacity="${f === 1 ? 0.28 : 0.12}"/>`).join("")}
      ${values.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="currentColor" stroke-opacity="0.1"/>`).join("")}
      <polygon points="${values.map((x, i) => pt(i, R * Math.max(0.04, x.v)).join(",")).join(" ")}" class="co-radar-fill"/>
      ${values.map((x, i) => { const [px, py] = pt(i, R + 14); return `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" font-size="9.5" fill="currentColor" opacity="${x.known ? 0.85 : 0.4}">${esc(x.label)}</text>`; }).join("")}</svg>`;
  }
  function historyChart() {
    const c = C(), days = []; for (let i = 13; i >= 0; i--) days.push(CE.addDays(today(), -i));
    const max = Math.max(60, ...days.map(d => c.log[d] || 0));
    return `<div class="co-hist" role="img" aria-label="Số phút học 14 ngày gần nhất">${days.map(d => { const m = c.log[d] || 0, q = (DATA.dailyLog[d] || {}).questionsDone || 0;
      return `<div class="co-hist-col" title="${dmy(d)}: ${m} phút · ${q} câu"><i style="height:${Math.round(m / max * 100)}%"></i><span>${d.slice(8)}</span></div>`; }).join("")}</div>`;
  }

  // ---------- tasks ----------
  const TYPE = { diag: "Chẩn đoán", confirm: "Xác nhận", learn: "Học", practice: "Luyện", qb: "Q. Bank", test: "Kiểm tra", check: "Kiểm tra", review: "Ôn", reread: "Ôn", mistakes: "Lỗi sai", formula: "Công thức", mock: "Thi thử", mockReview: "Phân tích", fixStudy: "Khắc phục", buffer: "Dự phòng", final: "Ôn nhẹ" };
  const enc = encodeURIComponent;
  function taskActions(t) {
    if (t.status !== "todo") return t.status === "verified" ? chip("Đã xác nhận", "success") : chip("Đã ghi nhận (tự báo)", "warning");
    const start = (kind, target) => `<a class="btn btn-sm btn-primary" href="#/coach/start/${kind}/${enc(target || "-")}/${enc(t.id)}">${icon("play", 14)} Bắt đầu</a>`;
    const self = txt => `<button class="btn btn-sm btn-ghost" data-ht-done="${t.id}">${txt || "Đã làm xong"}</button>`;
    switch (t.type) {
      case "diag": return start("quick45");
      case "confirm": return start("confirm", t.topic);
      case "test": return start("test", t.topic);
      case "check": return start("check", t.module);
      case "practice": return start("practice", t.module);
      case "review": return start("review", t.module);
      case "mistakes": return start("mistakes", "all");
      case "mock": return t.part === "2" ? `<a class="btn btn-sm btn-primary" href="#/coach/start/mock/2/${enc(t.id)}">${icon("play", 14)} Bắt đầu phiên 2</a>` : start("mock", "1");
      case "learn": return `<a class="btn btn-sm btn-primary" href="#/module/${t.module}">${icon("book", 14)} Mở bài học</a><a class="btn btn-sm btn-secondary" href="#/coach/start/check/${t.module}/${enc(t.id)}" title="5 câu: xác nhận bạn đã nắm">Kiểm tra 5 câu</a>${self("Tôi đã học xong")}`;
      case "qb": return `<a class="btn btn-sm btn-primary" href="#/qbank/do/${t.fileId}" data-ht-qb="${t.id}">${icon("flag", 14)} Mở set</a><button class="btn btn-sm btn-ghost" data-ht-done="${t.id}">Kiểm tra hoàn thành</button>`;
      case "reread": return `<a class="btn btn-sm btn-secondary" href="#/module/${t.module}">Mở module</a>${self("Đã ôn xong")}`;
      case "formula": return `<a class="btn btn-sm btn-secondary" href="#/cards">Mở flashcards</a>${self()}`;
      case "fixStudy": return `<a class="btn btn-sm btn-primary" href="#/coach/solutions/${t.module}/${enc(t.id)}">Xem lời giải từng bước</a><a class="btn btn-sm btn-secondary" href="#/module/${t.module}">Mở bài học</a>`;
      case "mockReview": { const m = C().hist.filter(h => h.kind === "mock" && h.part === 2).slice(-1)[0]; return `${m ? `<a class="btn btn-sm btn-secondary" href="#/coach/report/${m.id}">Mở kết quả thi thử</a>` : ""}<a class="btn btn-sm btn-secondary" href="#/coach/start/mistakes/all">Ôn lỗi sai</a>${self()}`; }
      case "buffer": return `${HT.missedTasks().length ? `<a class="btn btn-sm btn-secondary" href="#/coach/plan">Xem việc trễ</a>` : ""}${self()}`;
      case "final": return `<a class="btn btn-sm btn-secondary" href="#/cards">Ôn công thức</a>${self()}`;
      default: return self();
    }
  }
  function taskRow(t, o) {
    o = o || {};
    return `<div class="co-task ${t.status !== "todo" ? "done" : ""}">
      <div class="co-task-main"><span class="badge co-type co-type-${t.type}">${TYPE[t.type] || t.type}</span><div><strong>${esc(HT.label(t))}</strong>
        <div class="text-3 small">${t.min} phút${o.time ? ` · ${o.time}` : ""} · ${esc(HT.reason(t))}</div></div></div>
      <div class="co-task-act">${taskActions(t)}</div></div>`;
  }
  function dayHtml(day, o) {
    o = o || {};
    if (!day) return `<p class="text-2">Không có ngày này trong kế hoạch.</p>`;
    if (!day.minutes) return `${o.title ? `<h3>${o.title}</h3>` : ""}<p class="text-2">Ngày nghỉ hoặc ngày bận theo lịch của bạn.</p>`;
    const ss = CE.daySessions(day, HT.engineProfile()), p = C().profile;
    return `${o.title ? `<h3>${o.title}</h3>` : ""}<p class="text-3 small">${day.tasks.reduce((s, t) => s + t.min, 0)}/${day.minutes} phút · ${ss.length} phiên · tối đa ${p.maxSession} phút/phiên, nghỉ ${p.breakMin} phút${day.free >= 20 ? ` · ${day.free} phút trống` : ""}</p>
      ${ss.map((s, i) => `<div class="co-session"><div class="co-session-h">Phiên ${i + 1} · ${s.start}–${s.end} · ${s.minutes} phút</div><div class="co-tasks">${s.tasks.map(t => taskRow(t)).join("")}</div></div>`).join("")}`;
  }
  function bindTasks(rerender) {
    view.querySelectorAll("[data-ht-done]").forEach(b => b.onclick = () => {
      const r = HT.completeTask(b.dataset.htDone, { selfReport: true });
      if (r.status === "todo") return toast(r.reason || "Chưa có bằng chứng hoàn thành", "error");
      toast(r.status === "verified" ? "Đã xác nhận hoàn thành" : "Đã ghi nhận bạn tự báo (không tính là nắm vững)");
      rerender();
    });
    view.querySelectorAll("[data-ht-qb]").forEach(a => a.addEventListener("click", () => HT.startQbTask(a.dataset.htQb)));
  }

  // ---------- routing ----------
  window.coachStop = function () { if (typeof coachRunStop === "function") coachRunStop(); };
  window.renderCoach = function (sub, a, b, c3) {
    coachStop();
    document.body.classList.add("co-page");
    const c = C();
    if (sub === "run") return renderCoachRun();
    if (sub === "start") return renderCoachStart(a, b && b !== "-" ? decodeURIComponent(b) : null, c3 ? decodeURIComponent(c3) : null);
    if (sub === "report") return renderCoachReport(a);
    if (!c.profile) return sub === "setup" ? setup() : welcome();
    if (sub === "setup") return setup();
    // Question Bank sets load from this device once; the plan waits for them so it can use them
    if (UI.qbTried !== PROFILES.active && typeof qbiReady === "function" && !qbiReady() && typeof qbiLoad === "function") {
      UI.qbTried = PROFILES.active;
      view.innerHTML = `${pageHeader("Hoa Tiêu", "Đang đọc dữ liệu học tập…", "", "Hoa Tiêu · CFA Compass")}`;
      const h = location.hash;
      qbiLoad().catch(() => {}).then(() => { HT.touch(); if (location.hash === h) router(); });
      return;
    }
    const up = HT.autoUpdate();
    if (up) {
      c.notice = { v: up.version, date: today(), text: up.reason === "missed-days" ? `Có ${up.missed} nhiệm vụ trễ: kế hoạch đã được lập lại từ hôm nay (phiên bản ${up.version}). Nhiệm vụ trễ không bị tính là hoàn thành và điểm năng lực không bị trừ.`
        : up.reason === "upgrade" ? `Hoa Tiêu đã được nâng cấp: kế hoạch mới đã được tạo từ hồ sơ và kết quả của bạn (phiên bản ${up.version}).`
        : up.reason === "profile" ? `Ngày thi trong hồ sơ đã đổi: kế hoạch đã được lập lại (phiên bản ${up.version}).`
        : `Kế hoạch đã được cập nhật theo kết quả mới của bạn (phiên bản ${up.version}).` };
      HT.save();
    }
    if (!UI.delegated) {
      UI.delegated = true;
      view.addEventListener("click", e => {
        const x = e.target.closest && e.target.closest("[data-ht-notice-close]"); if (!x) return;
        delete C().notice; HT.save();
        const box = x.closest(".ht-notice"); if (box) box.remove();
      });
    }
    const pages = { "": dashboard, plan: () => a === "ready" ? planReady() : a === "print" ? planPrint() : planPage(), test: testHub, analysis: analysisPage, review: reviewPage, bank: bankPage, method: methodPage, solutions: () => solutions(a, b ? decodeURIComponent(b) : null) };
    (pages[sub || ""] || dashboard)();
  };

  // ======================= welcome =======================
  function welcome() {
    view.innerHTML = `${pageHeader("Hoa Tiêu · CFA Compass", "Huấn luyện viên học tập: đo trình độ bằng bài làm thật và lập lộ trình riêng cho tài khoản này đến ngày thi.", "", "Plan")}
      <section class="card ht-welcome"><div class="ht-steps-4">
        ${[["user", "1. Hồ sơ", "Ngày thi, số giờ học, ngày bận, khung giờ ưa thích."], ["layers", "2. Bạn đã học gì", "Đánh dấu 10 môn và từng module; mức tự tin 1–5."], ["clock", "3. Đánh giá", "Bài chẩn đoán 45 hoặc 90 phút (hoặc chỉ tự đánh giá)."], ["calendar", "4. Kế hoạch", "Lộ trình theo ngày, tuần, tháng — hiện ngay sau khi tạo, in được, thêm vào lịch."]]
          .map(([ic, t, s]) => `<div class="ht-step"><span class="stat-icon">${icon(ic, 18)}</span><b>${t}</b><span class="text-2 small">${s}</span></div>`).join("")}</div>
        <p class="text-2">Mất khoảng 3 phút để thiết lập. Kế hoạch tự điều chỉnh khi bạn làm bài, bỏ lỡ ngày học hoặc tiến bộ. Dữ liệu chỉ lưu trong tài khoản này trên thiết bị này.</p>
        <div class="form-actions" style="justify-content:flex-start"><a class="btn btn-primary btn-lg" href="#/coach/setup">${icon("play", 18)} Bắt đầu thiết lập</a></div></section>`;
  }

  // ======================= setup =======================
  const STATUS = HT.STATUS;
  function setupDefaults() {
    return { name: activeProfile().name || "", level: "I", year: CURRICULUM_YEAR, examDate: DATA.settings.examDate || "", goal: "pass", lang: "vi", finLevel: "some", tookBefore: "no",
      hoursPerDay: 3, byDayOn: false, byDay: null, studyDays: ["1", "2", "3", "4", "5", "6", "0"], busy: "", slot: "evening", maxSession: 90, breakMin: 10, assess: "hybrid" };
  }
  function setup() {
    const c = C(); document.body.classList.add("co-page");
    const d = c.draft = Object.assign(setupDefaults(), c.profile ? { ...c.profile, studyDays: (c.profile.studyDays || []).map(String), byDayOn: !!c.profile.byDay } : {}, c.draft || {});
    const step = UI.step = Math.min(5, Math.max(1, UI.step || 1));
    const titles = ["Thông tin cá nhân", "Thời gian học", "Kiến thức đã học", "Cách đánh giá", "Xác nhận"];
    const sel = (name, opts, cur) => `<select class="select" name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    let body = "";
    if (step === 1) body = `<div class="form-grid">
      <label class="field"><span class="field-label">Tên hiển thị</span><input class="input" name="name" value="${esc(d.name)}" maxlength="40"></label>
      <label class="field"><span class="field-label">Cấp CFA</span><select class="select" disabled><option>Level I</option></select><span class="text-3 small">Hiện hỗ trợ Level I.</span></label>
      <label class="field"><span class="field-label">Năm curriculum</span><select class="select" disabled><option>${CURRICULUM_YEAR}</option></select><span class="text-3 small">102 module, trọng số topic ${CURRICULUM_YEAR} của website.</span></label>
      <label class="field"><span class="field-label">Ngày dự thi dự kiến</span><input class="input" type="date" name="examDate" value="${esc(d.examDate)}"><span class="field-error" id="ht-err-exam"></span></label>
      <label class="field"><span class="field-label">Mục tiêu</span>${sel("goal", [["pass", "Đỗ ngay lần này"], ["score", "Đạt điểm cao"], ["review", "Ôn lại sau khi đã học"], ["other", "Khác"]], d.goal)}</label>
      <label class="field"><span class="field-label">Ngôn ngữ học tập</span>${sel("lang", [["vi", "Tiếng Việt"], ["en", "English"], ["both", "Song ngữ"]], d.lang)}<span class="text-3 small">Dùng cho phần giải thích của CFA Tutor.</span></label>
      <label class="field"><span class="field-label">Trình độ tài chính hiện tại</span>${sel("finLevel", [["none", "Mới bắt đầu"], ["some", "Có nền tảng cơ bản"], ["good", "Làm trong ngành tài chính / kinh tế"]], d.finLevel)}</label>
      <label class="field"><span class="field-label">Đã thi CFA trước đây?</span>${sel("tookBefore", [["no", "Chưa"], ["yes", "Đã thi Level I (chưa đỗ)"], ["passed", "Đã đỗ cấp khác"]], d.tookBefore)}</label></div>`;
    if (step === 2) {
      const bd = d.byDay || {};
      const busy = String(d.busy || "").split(/[\s,;]+/).filter(Boolean);
      body = `<div class="form-grid">
      <label class="field"><span class="field-label">Số giờ học mỗi ngày</span><input class="input" type="number" name="hoursPerDay" min="0.5" max="12" step="0.5" value="${d.hoursPerDay}"><span class="field-error" id="ht-err-hours"></span></label>
      <label class="field"><span class="field-label">Khung giờ ưa thích</span>${sel("slot", [["morning", "Buổi sáng (từ 7:00)"], ["afternoon", "Buổi chiều (từ 14:00)"], ["evening", "Buổi tối (từ 19:30)"], ["flex", "Linh hoạt (từ 19:00)"]], d.slot)}</label>
      <label class="field"><span class="field-label">Thời lượng tối đa mỗi phiên</span>${sel("maxSession", [["45", "45 phút"], ["60", "60 phút"], ["90", "90 phút"], ["120", "120 phút"], ["180", "180 phút"]], d.maxSession)}</label>
      <label class="field"><span class="field-label">Nghỉ giữa các phiên</span>${sel("breakMin", [["5", "5 phút"], ["10", "10 phút"], ["15", "15 phút"], ["30", "30 phút"]], d.breakMin)}</label>
      <div class="field full"><span class="field-label">Những ngày có thể học</span><div class="co-dows">${DOWS.map(([v, l]) => `<label class="check-chip"><input type="checkbox" name="studyDays" value="${v}" ${d.studyDays.includes(v) ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
      <div class="field full"><label class="check-row"><input type="checkbox" name="byDayOn" ${d.byDayOn ? "checked" : ""}> <span>Số giờ khác nhau theo từng ngày (ví dụ cuối tuần học nhiều hơn)</span></label>
        ${d.byDayOn ? `<div class="ht-byday">${DOWS.map(([v, l]) => `<label class="field"><span class="field-label">${l} (giờ)</span><input class="input" type="number" min="0" max="14" step="0.5" name="bd${v}" value="${bd[v] != null ? bd[v] / 60 : d.hoursPerDay}"></label>`).join("")}</div>` : ""}</div>
      <div class="field full"><span class="field-label">Ngày bận / nghỉ / sự kiện cá nhân</span>
        <div class="ht-busy-add"><input class="input" type="date" id="ht-busy-from" aria-label="Từ ngày"><span>đến</span><input class="input" type="date" id="ht-busy-to" aria-label="Đến ngày (không bắt buộc)"><button type="button" class="btn btn-secondary btn-sm" id="ht-busy-add">${icon("plus", 14)} Thêm</button></div>
        <div class="ht-busy-list">${busy.length ? busy.map((x, i) => `<span class="ht-busy">${esc(x.split("..").map(dmy).join(" → "))}<button type="button" data-busy-del="${i}" aria-label="Xóa">${icon("x", 12)}</button></span>`).join("") : `<span class="text-3 small">Chưa có ngày bận.</span>`}</div>
        <span class="field-error" id="ht-err-busy"></span></div></div>
      <p class="text-3 small">Kế hoạch không bao giờ xếp quá số giờ bạn khai cho mỗi ngày, và không xếp gì vào ngày bận.</p>`;
    }
    if (step === 3) {
      const r = c.self.rating, ts = c.self.topic, ms = c.self.module;
      body = `<p class="text-2">Đánh dấu mức độ đã học. <b>Đây là thông tin chủ quan:</b> hệ thống chỉ dùng nó làm điểm xuất phát, và kết quả bài làm sẽ dần thay thế nó. Tự nhận đã vững mà chưa có bài làm thì kế hoạch sẽ có một bài xác nhận 10 câu.</p>
      <div class="co-topics">${TOPICS.map(t => `<div class="co-topic"><div class="row-between"><strong>${esc(t.name)}</strong><span class="text-3 small">${t.weight}</span></div>
        <div class="co-topic-row"><select class="select" data-ht-tstatus="${t.id}" aria-label="Mức đã học ${esc(t.name)}">${STATUS.map(([v, l]) => `<option value="${v}" ${(ts[t.id] || "none") === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="co-rate">Tự tin <select class="select" data-ht-rating="${t.id}">${[1, 2, 3, 4, 5].map(n => `<option ${(r[t.id] || 3) === n ? "selected" : ""}>${n}</option>`).join("")}</select> / 5</label></div>
        <details class="co-det"><summary>Chi tiết từng module (${modulesOf(t.id).length})</summary>
          ${modulesOf(t.id).map(m => `<div class="co-modrow"><span>${m.n}. ${esc(m.title)}</span><select class="select" data-ht-mstatus="${m.id}"><option value="">Theo topic</option>${STATUS.map(([v, l]) => `<option value="${v}" ${ms[m.id] === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("")}</details></div>`).join("")}</div>`;
    }
    if (step === 4) {
      const rec = (+d.hoursPerDay || 0) >= 2 ? "hybrid" : "self";
      const opts = [["self", "A. Tự đánh giá", "Nhanh nhất; kế hoạch dựa hoàn toàn vào cảm nhận của bạn (kém chính xác nhất). Bài chẩn đoán vẫn được xếp vào ngày đầu để bạn làm khi sẵn sàng."],
        ["quick", "B. Chẩn đoán nhanh · 45 phút", "30 câu, đủ 10 môn: bức tranh sơ bộ."], ["full", "C. Chẩn đoán toàn diện · 90 phút", "60 câu, phủ rộng hơn, ước lượng đáng tin hơn."],
        ["hybrid", "D. Kết hợp", "Tự đánh giá làm điểm xuất phát, rồi bài 45 phút để hiệu chỉnh."]];
      body = `<div class="co-assess">${opts.map(([v, t, s]) => `<label class="co-assess-card ${d.assess === v ? "on" : ""}"><input type="radio" name="assess" value="${v}" ${d.assess === v ? "checked" : ""}><b>${t}${v === rec ? " · khuyến nghị cho bạn" : ""}</b><small>${s}</small></label>`).join("")}</div>
      <p class="text-3 small">Bài chẩn đoán là bài kiểm tra nội bộ của website, không phải bài thi CFA chính thức. Kế hoạch được tạo ngay sau bước tiếp theo; bạn làm bài chẩn đoán khi sẵn sàng và kế hoạch sẽ tự cập nhật.</p>`;
    }
    if (step === 5) {
      const prof = { examDate: d.examDate, hoursPerDay: +d.hoursPerDay, minutesByWeekday: d.byDayOn ? d.byDay : null, studyDays: d.studyDays.map(Number), busyDates: HT.parseBusy(d.busy).dates };
      const days = Math.max(0, CE.daysBetween(today(), d.examDate)); let cap = 0;
      for (let i = 0; i < days; i++) cap += CE.dayMinutes(prof, CE.addDays(today(), i));
      const strong = TOPICS.filter(t => ["solid", "confident"].includes(c.self.topic[t.id])).map(t => t.id);
      body = `<dl class="ht-dl ht-dl-wide">
        <div><dt>Tên</dt><dd>${esc(d.name)}</dd></div><div><dt>Ngày thi</dt><dd>${dmy(d.examDate)} · còn ${days} ngày</dd></div>
        <div><dt>Giờ học</dt><dd>${d.byDayOn ? "khác nhau theo ngày" : `${d.hoursPerDay} giờ/ngày`} · ${d.studyDays.length} ngày/tuần · ${HT.parseBusy(d.busy).dates.length} ngày bận</dd></div>
        <div><dt>Phiên học</dt><dd>tối đa ${d.maxSession} phút, nghỉ ${d.breakMin} phút, ${({ morning: "buổi sáng", afternoon: "buổi chiều", evening: "buổi tối", flex: "linh hoạt" })[d.slot]}</dd></div>
        <div><dt>Thời gian khả dụng</dt><dd><b>${fmtH(cap)}</b> đến ngày thi (tham khảo cho cả chương trình: khoảng ${CE.CONFIG.recommendedHours} giờ)</dd></div>
        <div><dt>Tự đánh giá</dt><dd>${strong.length ? `Đã học kỹ: ${strong.join(", ")}` : "Chưa có topic nào đã học kỹ"}</dd></div>
        <div><dt>Đánh giá đầu vào</dt><dd>${({ self: "Tự đánh giá", quick: "Chẩn đoán 45 phút", full: "Chẩn đoán 90 phút", hybrid: "Kết hợp" })[d.assess]}</dd></div></dl>
      ${cap < 60 ? `<div class="callout warn">${icon("alert", 16)} Không còn thời gian học khả dụng: kiểm tra lại ngày thi, ngày học và ngày bận.</div>` : cap < 150 * 60 ? `<div class="callout warn">${icon("alert", 16)} Thời gian khả dụng khá ít so với khối lượng Level I: kế hoạch sẽ ưu tiên phần quan trọng nhất của mỗi môn và nói rõ phần chưa xếp được.</div>` : ""}`;
    }
    view.innerHTML = `${pageHeader(c.profile ? "Sửa hồ sơ học tập" : "Thiết lập hồ sơ học tập", `Bước ${step}/5 · ${titles[step - 1]}`, c.profile ? `<a class="btn btn-ghost" href="#/coach">Huỷ</a>` : "", "Hoa Tiêu · CFA Compass")}
      <div class="co-steps-bar">${titles.map((t, i) => `<span class="${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}">${i + 1}. ${t}</span>`).join("")}</div>
      <form class="card section" id="ht-form" novalidate>${body}
        <div class="form-actions" style="justify-content:space-between"><button type="button" class="btn btn-secondary" id="ht-back" ${step === 1 ? "disabled" : ""}>${icon("prev", 16)} Quay lại</button>
          <button type="submit" class="btn btn-primary" id="ht-next">${step === 5 ? (c.profile ? "Lưu và lập lại kế hoạch" : "Tạo kế hoạch") : "Tiếp tục"} ${icon("next", 16)}</button></div></form>`;
    const form = document.getElementById("ht-form");
    const read = () => {
      const f = new FormData(form);
      if (step === 1) ["name", "examDate", "goal", "lang", "finLevel", "tookBefore"].forEach(k => { d[k] = String(f.get(k) || "").trim(); });
      if (step === 2) {
        d.hoursPerDay = +f.get("hoursPerDay"); d.slot = f.get("slot"); d.maxSession = +f.get("maxSession"); d.breakMin = +f.get("breakMin"); d.studyDays = f.getAll("studyDays"); d.byDayOn = !!f.get("byDayOn");
        if (d.byDayOn && form.querySelector("[name=bd1]")) { d.byDay = {}; DOWS.forEach(([v]) => { const x = +f.get("bd" + v); d.byDay[v] = Math.round(Math.max(0, Math.min(14, isFinite(x) ? x : 0)) * 60); }); }
        if (!d.byDayOn) d.byDay = null;
      }
      if (step === 4) d.assess = f.get("assess") || d.assess;
    };
    view.querySelectorAll("[data-ht-tstatus]").forEach(s => s.onchange = () => { c.self.topic[s.dataset.htTstatus] = s.value; HT.save(); });
    view.querySelectorAll("[data-ht-rating]").forEach(s => s.onchange = () => { c.self.rating[s.dataset.htRating] = +s.value; HT.save(); });
    view.querySelectorAll("[data-ht-mstatus]").forEach(s => s.onchange = () => { if (s.value) c.self.module[s.dataset.htMstatus] = s.value; else delete c.self.module[s.dataset.htMstatus]; HT.save(); });
    view.querySelectorAll(".co-assess-card input, [name=byDayOn]").forEach(r => r.onchange = () => { read(); HT.save(); setup(); });
    const add = document.getElementById("ht-busy-add");
    if (add) add.onclick = () => {
      read(); const a = document.getElementById("ht-busy-from").value, b = document.getElementById("ht-busy-to").value;
      if (!CE.validDate(a)) return void (document.getElementById("ht-err-busy").textContent = "Chọn ngày bắt đầu.");
      if (b && b < a) return void (document.getElementById("ht-err-busy").textContent = "Ngày kết thúc phải sau ngày bắt đầu.");
      d.busy = [String(d.busy || "").trim(), b && b !== a ? `${a}..${b}` : a].filter(Boolean).join(", "); HT.save(); setup();
    };
    view.querySelectorAll("[data-busy-del]").forEach(b => b.onclick = () => { read(); const list = String(d.busy).split(/[\s,;]+/).filter(Boolean); list.splice(+b.dataset.busyDel, 1); d.busy = list.join(", "); HT.save(); setup(); });
    document.getElementById("ht-back").onclick = () => { read(); HT.save(); UI.step = step - 1; setup(); };
    form.onsubmit = e => {
      e.preventDefault(); read();
      if (step === 1) {
        if (!d.name) d.name = activeProfile().name;
        const err = document.getElementById("ht-err-exam");
        if (!CE.validDate(d.examDate)) return void (err.textContent = "Chọn một ngày thi hợp lệ.");
        if (CE.daysBetween(today(), d.examDate) < 7) return void (err.textContent = "Ngày thi phải cách hôm nay ít nhất 7 ngày để lập kế hoạch có ý nghĩa.");
      }
      if (step === 2) {
        const eh = document.getElementById("ht-err-hours");
        if (!(d.hoursPerDay >= 0.5 && d.hoursPerDay <= 12)) return void (eh.textContent = "Nhập từ 0,5 đến 12 giờ.");
        if (!d.studyDays.length) return void (eh.textContent = "Chọn ít nhất một ngày có thể học.");
      }
      HT.save();
      if (step < 5) { UI.step = step + 1; window.scrollTo(0, 0); return setup(); }
      const wasNew = !c.profile;
      c.profile = { name: d.name, level: "I", year: CURRICULUM_YEAR, examDate: d.examDate, goal: d.goal, lang: d.lang, finLevel: d.finLevel, tookBefore: d.tookBefore, hoursPerDay: d.hoursPerDay,
        byDay: d.byDayOn ? d.byDay : null, studyDays: d.studyDays.map(Number), busy: d.busy, slot: d.slot, maxSession: d.maxSession, breakMin: d.breakMin, assess: d.assess, createdAt: (c.profile && c.profile.createdAt) || today() };
      c.draft = null; DATA.settings.examDate = d.examDate; UI.step = 1;
      const p = HT.newPlan(wasNew ? "setup" : "profile");
      if (p.error) { toast(p.error, "error"); return; }
      location.hash = "#/coach/plan/ready";
    };
  }

  // ======================= dashboard =======================
  function dashboard() {
    const c = C(), P = HT.pool(), an = HT.analysis(), p = c.profile, plan = HT.plan();
    const left = CE.daysBetween(today(), p.examDate), rd = CE.readiness(an, P.weights, c.self.rating);
    const remaining = plan ? plan.days.filter(d => d.date >= today()).reduce((s, d) => s + d.tasks.filter(t => t.status === "todo").reduce((x, t) => x + t.min, 0), 0) : 0;
    const t0 = plan && plan.days.find(d => d.date === today());
    const st = HT.plannerState(an), reco = CE.recommendations(st, today(), p.examDate, 4);
    const lastTest = c.hist.filter(h => !["practice", "review", "mistakes"].includes(h.kind)).slice(-1)[0];
    const ver = c.ver[c.ver.length - 1];
    const learnedPct = t => { const ms = modulesOf(t); return Math.round(100 * ms.filter(m => c.learned[m.id] || CE.moduleKnowledge({ id: m.id, topic: t }, st).k >= CE.CONFIG.learnedAt).length / ms.length); };
    const rows = TOPICS.map(t => { const a = an.topics[t.id]; const ok = a.nEff >= CE.CONFIG.evidence.insufficient; return { label: `${t.id} · ${t.name.replace(/ and /g, " & ")}`, pct: ok ? Math.round(a.wAcc * 100) : 0, text: a.n ? `${Math.round(a.acc * 100)}% · ${a.n} câu${ok ? "" : " · chưa đủ"}` : "chưa đo", tone: a.band === "weak" ? "danger" : a.band === "needs" ? "warning" : "" }; });
    const weakMods = Object.entries(an.modules).filter(([, m]) => m.n >= 2 && m.acc < 0.6).sort((a, b) => a[1].acc - b[1].acc).slice(0, 6);
    const KN = { quick45: "Chẩn đoán nhanh", full90: "Chẩn đoán toàn diện", confirm: "Kiểm tra xác nhận", test: "Kiểm tra cuối topic", check: "Kiểm tra module", mock: "Thi thử" };
    view.innerHTML = `${head(`Chào ${esc(p.name || activeProfile().name)}`, "Hoa Tiêu đo năng lực bằng bài làm thật và điều chỉnh lộ trình riêng cho tài khoản này.", `<a class="btn btn-secondary" href="#/coach/setup">${icon("settings", 16)} Sửa hồ sơ</a>`, "")}
      ${an.remediation.length ? `<div class="callout warn">${icon("alert", 16)} Bạn sai ${an.remediation[0].wrong}/5 câu gần nhất ở <b>${esc(an.remediation[0].skill)}</b> (${esc(an.remediation[0].module)}). Kế hoạch có chuỗi khắc phục: xem lời giải → luyện câu mới → kiểm tra lại. <a href="#/coach/solutions/${an.remediation[0].module}">Xem lời giải</a></div>` : ""}
      <div class="grid grid-stats">
        <div class="card stat"><div class="stat-icon">${icon("calendar", 18)}</div><span class="stat-label">Đếm ngược kỳ thi</span><span class="stat-value">${Math.max(0, left)}<small> ngày</small></span><span class="stat-hint">${dmy(p.examDate)} · còn ${fmtH(remaining)} trong kế hoạch</span></div>
        <div class="card stat"><div class="stat-icon accent">${icon("clock", 18)}</div><span class="stat-label">Giờ đã học</span><span class="stat-value">${fmtH(HT.studied())}</span><span class="stat-hint">từ bài làm và nhiệm vụ đã ghi nhận</span></div>
        <div class="card stat"><div class="stat-icon warning">${icon("target", 18)}</div><span class="stat-label">Câu đã làm (lần đầu)</span><span class="stat-value">${an.evidenceTotal}</span><span class="stat-hint">${an.total.n ? `${Math.round(an.total.acc * 100)}% đúng` : "chưa có bài làm"}</span></div>
        <div class="card stat"><div class="stat-icon danger">${icon("pulse", 18)}</div><span class="stat-label">Độ sẵn sàng (nội bộ)</span><span class="stat-value">${rd.enough ? rd.value + "%" : "—"}</span><span class="stat-hint">${esc(rd.label)}${rd.enough ? ` · khoảng ${rd.low}–${rd.high}%` : ""}</span></div>
      </div>
      <section class="card section ht-results"><div class="ht-results-col"><h2>Kết quả đánh giá</h2>
          ${lastTest ? `<p><b>${esc(KN[lastTest.kind] || lastTest.kind)}</b> · ${dmy(lastTest.date)} · ${lastTest.k}/${lastTest.n} đúng</p><div class="row-gap"><a class="btn btn-sm btn-secondary" href="#/coach/report/${lastTest.id}">Xem kết quả</a><a class="btn btn-sm btn-ghost" href="#/coach/analysis">Phân tích</a></div>`
            : `<p class="text-2">Chưa có bài đánh giá. Kế hoạch hiện dựa trên tự đánh giá của bạn.</p><a class="btn btn-sm btn-primary" href="#/coach/start/quick45">Làm bài chẩn đoán 45 phút</a>`}</div>
        <div class="ht-results-col"><h2>Kế hoạch học</h2>
          ${plan ? `<p><b>Phiên bản ${c.ver.length}</b> · tạo ${dmy(plan.createdAt)} · ${esc(HT.REASON_LABEL[(ver || {}).reason] || "")}</p><div class="row-gap"><a class="btn btn-sm btn-primary" href="#/coach/plan/ready">Xem kế hoạch đầy đủ</a><a class="btn btn-sm btn-ghost" href="#/coach/plan">Theo ngày / tuần</a></div>`
            : `<p class="text-2">Chưa có kế hoạch.</p><button class="btn btn-sm btn-primary" id="ht-mkplan">Tạo kế hoạch</button>`}</div></section>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Hôm nay</h2><a class="card-link" href="#/coach/plan">Cả lịch</a></div>${t0 ? dayHtml(t0) : `<p class="text-2">Không có nhiệm vụ hôm nay.</p>`}</section>
        <section class="card"><div class="card-head"><h2>Độ sẵn sàng</h2></div>
          <div class="co-ready">${progressRing(rd.enough ? rd.value : 0, 112, 10, rd.enough ? "nội bộ" : "chưa đủ")}<div>
            <p class="text-2 small" style="margin:0 0 6px">${rd.enough ? `Ước tính <b>${rd.value}%</b>, khoảng tin cậy 90%: ${rd.low}–${rd.high}%.` : `Mới có ${rd.covered}/${rd.topics} topic đủ dữ liệu và ${an.evidenceTotal} câu: chưa đủ để đưa ra con số.`}</p>
            <p class="text-3 small" style="margin:0">Chỉ số nội bộ = tổng theo tỷ trọng topic của mức nắm vững ước tính (câu khó tính nặng hơn; topic thiếu dữ liệu được tính thận trọng). Không phải xác suất đỗ CFA.</p></div></div></section>
      </div>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Hiệu quả theo topic</h2><a class="card-link" href="#/coach/analysis">Chi tiết</a></div>${bars(rows)}
          <p class="text-3 small">Thanh = độ chính xác có trọng số độ khó (chỉ khi có ≥ ${CE.CONFIG.evidence.insufficient} câu). Đã học (đã xác nhận hoặc ước tính vững): ${TOPICS.map(t => `${t.id} ${learnedPct(t.id)}%`).join(" · ")}.</p></section>
        <section class="card"><div class="card-head"><h2>Điểm yếu</h2></div>${radar(TOPICS.map(t => { const a = an.topics[t.id]; const known = a.nEff >= CE.CONFIG.evidence.insufficient; return { label: t.id, v: known ? a.mastery : 0, known }; }))}
          ${weakMods.length ? `<div class="list">${weakMods.map(([id, m]) => `<a class="list-item" href="#/module/${id}"><div class="list-main"><div class="list-title">${esc(id)} ${esc(HT.modTitle(id))}</div><div class="list-meta">${m.k}/${m.n} đúng${m.nEff < 4 ? " · sơ bộ" : ""}</div></div></a>`).join("")}</div>` : `<p class="text-3 small">Chưa có module nào đủ bằng chứng là yếu. Topic mờ trên biểu đồ là chưa đo được.</p>`}</section>
      </div>
      <section class="card section"><div class="card-head"><h2>Nhiệm vụ ưu tiên</h2><span class="text-3 small">Theo quy tắc và dữ liệu của bạn; CFA Tutor giải thích</span></div><div class="co-recos">${reco.map(recoHtml).join("")}</div></section>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Lịch sử học (14 ngày)</h2></div>${historyChart()}
          <p class="text-3 small">${c.hist.filter(h => CE.DIAG_KINDS.includes(h.kind) || (h.kind === "mock" && h.part === 2)).slice(-5).map(h => `${dmy(h.date)}: ${h.k}/${h.n}`).join(" → ") || "Chưa có bài chẩn đoán hay thi thử."}</p></section>
        <section class="card"><div class="card-head"><h2>Hỏi CFA Tutor</h2></div>${tutorBox()}</section>
      </div>`;
    bindTasks(dashboard); bindTutor();
    const mk = document.getElementById("ht-mkplan"); if (mk) mk.onclick = () => { const r = HT.newPlan("manual"); if (r.error) return toast(r.error, "error"); location.hash = "#/coach/plan/ready"; };
  }
  function recoHtml(r, i) {
    const ev = r.evidence;
    const evTxt = ev.scope === "module" ? `${ev.k}/${ev.n} câu đúng ở module này${ev.preliminary ? " — tín hiệu sơ bộ" : ""}` : ev.scope === "topic" ? `${ev.k}/${ev.n} câu đúng ở topic ${r.topic}; module này chưa có câu riêng${ev.preliminary ? " (sơ bộ)" : ""}` : `chưa có bài làm; theo tự đánh giá “${(STATUS.find(s => s[0] === ev.status) || ["", "chưa học"])[1]}”`;
    return `<article class="co-reco card"><div class="row-between"><strong>${i + 1}. ${esc(r.module)} ${esc(r.title)}</strong>${chip(r.topic)}</div>
      <p class="text-2 small"><b>Bằng chứng:</b> ${esc(evTxt)}.${r.skill && r.skill !== r.module ? ` Kỹ năng yếu: <i>${esc(r.skill)}</i>.` : ""}</p>
      ${r.prereq ? `<p class="text-2 small"><b>Có thể thiếu nền tảng:</b> <a href="#/module/${r.prereq}">${esc(r.prereq)} ${esc(HT.modTitle(r.prereq))}</a>.</p>` : ""}
      <p class="text-3 small">Ưu tiên ${Math.round(r.score * 100)}/100 = lỗ hổng ${Math.round(r.components.gap * 100)}% · tỷ trọng đề ${Math.round(r.components.exam * 100)}% · nguy cơ quên ${Math.round(r.components.forget * 100)}% · nền tảng ${Math.round(r.components.prereq * 100)}% · khẩn cấp ${Math.round(r.components.urgency * 100)}%.</p>
      <ol class="co-steps small">${r.learnMinutes ? `<li><a href="#/module/${r.module}">Học lại module</a> (~${r.learnMinutes} phút)</li>` : ""}
        ${r.fresh >= 3 ? `<li><a href="#/coach/start/practice/${r.module}">Luyện ${Math.min(10, r.fresh)} câu chưa làm</a></li><li><a href="#/coach/start/check/${r.module}">Kiểm tra lại 5 câu</a></li>` : r.qbSets.length ? `<li><a href="#/qbank/do/${r.qbSets[0]}">Luyện set Question Bank</a></li>` : `<li class="text-3">Resource not available — chưa có câu hỏi chưa làm cho module này</li>`}</ol>
      <p class="text-3 small"><b>Đạt khi:</b> ≥ 80% (có trọng số độ khó) trên ≥ 10 câu chưa làm của topic (bài xác nhận).</p></article>`;
  }
  function tutorContext() {
    const c = C(), P = HT.pool(), an = HT.analysis(), p = c.profile, plan = HT.plan(), rd = CE.readiness(an, P.weights, c.self.rating);
    const t0 = plan && plan.days.find(d => d.date === today());
    const reco = CE.recommendations(HT.plannerState(an), today(), p.examDate, 4);
    const week = plan ? plan.days.filter(d => d.date >= today()).slice(0, 7).map(d => `${dmy(d.date)}: ${d.tasks.map(t => HT.label(t)).join("; ") || "nghỉ"}`).join(" | ") : "";
    return [`Hoa Tiêu (CFA Level I ${CURRICULUM_YEAR}) — hồ sơ học viên: thi ngày ${p.examDate} (còn ${CE.daysBetween(today(), p.examDate)} ngày), ${p.hoursPerDay} giờ/ngày, mục tiêu ${p.goal}.`,
      `Độ sẵn sàng nội bộ: ${rd.enough ? `${rd.value}% (khoảng ${rd.low}–${rd.high}%)` : "chưa đủ dữ liệu"}. ${an.evidenceTotal} câu đã làm.`,
      "Theo topic: " + TOPICS.map(t => { const a = an.topics[t.id]; return `${t.id} ${a.n ? Math.round(a.acc * 100) + "% (" + a.n + " câu, " + CONF[a.confidence] + ")" : "chưa đo"}${c.self.topic[t.id] ? ", tự đánh giá " + c.self.topic[t.id] : ""}${c.confirmed[t.id] ? ", đã xác nhận" : ""}`; }).join("; ") + ".",
      "Ưu tiên: " + reco.map((r, i) => `${i + 1}) ${r.module} ${r.title} [${r.evidence.scope === "self" ? "theo tự đánh giá" : r.evidence.k + "/" + r.evidence.n + " đúng"}]`).join(" "),
      plan ? `Kế hoạch phiên bản ${c.ver.length}: ${plan.phases.map(ph => `${PHASE[ph.id - 1]} ${ph.from ? dmy(ph.from) + "–" + dmy(ph.to) : "(không cần)"}`).join("; ")}. Hôm nay: ${t0 ? t0.tasks.map(t => HT.label(t)).join("; ") : "không có"}. 7 ngày tới: ${week}.` : "Chưa có kế hoạch.",
      "Quy tắc: bạn chỉ giải thích và gợi ý. Không tự sửa tiến độ hay đánh dấu hoàn thành. Nếu học viên nói đã thành thạo một topic, đề nghị bài kiểm tra xác nhận 10 câu (trang Đánh giá của Hoa Tiêu) thay vì học lại toàn bộ. Nếu học viên bận, gợi ý sửa giờ học trong hồ sơ để kế hoạch tự lập lại."].join("\n");
  }
  const TUTOR_Q = ["Vì sao kế hoạch ưu tiên các nội dung này?", "Giải thích kế hoạch tuần này của tôi.", "Tôi đã thành thạo một topic, có cần học lại không?", "Tuần này tôi bận, nên điều chỉnh thế nào?"];
  function tutorBox() { return `<div class="ht-tq">${TUTOR_Q.map((q, i) => `<button class="btn btn-sm btn-secondary" data-ht-tutor="${i}">${esc(q)}</button>`).join("")}</div><p class="text-3 small">CFA Tutor đọc bản tóm tắt hồ sơ và kế hoạch của bạn. Tutor không thay đổi tiến độ.</p>`; }
  function bindTutor() {
    view.querySelectorAll("[data-ht-tutor]").forEach(b => b.onclick = () => {
      if (typeof tutorOpen !== "function" || typeof TUTOR === "undefined") return toast("CFA Tutor chưa sẵn sàng", "error");
      TUTOR.ctx = { label: "Hoa Tiêu · hồ sơ và kế hoạch", text: tutorContext() }; tutorOpen();
      const lang = C().profile.lang === "en" ? "Answer in English." : C().profile.lang === "both" ? "Trả lời song ngữ Việt – Anh ngắn gọn." : "Trả lời bằng tiếng Việt.";
      if (typeof tutorCfg === "function" && tutorCfg().key && !TUTOR.busy && typeof tutorSend === "function") tutorSend(`${TUTOR_Q[+b.dataset.htTutor]} ${lang}`, TUTOR.ctx);
    });
  }

  // ======================= plan =======================
  function noPlan(title) {
    view.innerHTML = `${head(title, "", "", "plan")}${emptyState("calendar", "Chưa có kế hoạch", "Hoàn tất hồ sơ để tạo kế hoạch.", `<a class="btn btn-primary" href="#/coach/setup">Thiết lập hồ sơ</a>`)}`;
  }
  const exportBtns = () => `<div class="ht-export"><a class="btn btn-secondary btn-sm" href="#/coach/plan/print">${icon("download", 14)} In / lưu PDF</a><button class="btn btn-secondary btn-sm" data-ht-export="ics">${icon("calendar", 14)} Thêm vào lịch (.ics)</button><button class="btn btn-secondary btn-sm" data-ht-export="csv">${icon("grid", 14)} Bảng tính (.csv)</button></div>`;
  function bindExport() {
    view.querySelectorAll("[data-ht-export]").forEach(b => b.onclick = () => {
      const plan = HT.plan(), prof = HT.engineProfile(), name = (C().profile.name || "hoa-tieu").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").slice(0, 20);
      if (b.dataset.htExport === "ics") { downloadFile(`hoa-tieu-${name}.ics`, CE.toICS(plan, prof, HT.label), "text/calendar;charset=utf-8"); toast("Đã tải tệp lịch: mở bằng Google Calendar, Outlook hoặc Lịch để thêm các buổi học"); }
      else downloadFile(`hoa-tieu-${name}.csv`, "﻿" + CE.toCSV(plan, prof, HT.label), "text/csv;charset=utf-8");
    });
  }
  // the plan, explained: shown right after it is made, and any time from the dashboard
  function planReady() {
    const c = C(), plan = HT.plan(); if (!plan) return noPlan("Kế hoạch của bạn");
    const an = HT.analysis(), ver = c.ver[c.ver.length - 1] || {};
    const firstDays = plan.days.filter(d => d.date >= today()).slice(0, 7);
    const byTopic = plan.summary.byTopic, totT = Object.values(byTopic).reduce((s, x) => s + x, 0) || 1;
    const lastDiag = c.hist.filter(h => CE.DIAG_KINDS.includes(h.kind)).slice(-1)[0];
    const sure = t => !["insufficient", "low"].includes(an.topics[t].confidence);
    const weak = TOPICS.filter(t => ["weak", "needs"].includes(an.topics[t.id].band)).map(t => t.id);
    const strong = TOPICS.filter(t => (an.topics[t.id].band === "strong" && sure(t.id)) || c.confirmed[t.id]).map(t => t.id);
    const goodPrelim = TOPICS.filter(t => an.topics[t.id].band === "strong" && !sure(t.id) && !c.confirmed[t.id]).map(t => t.id);
    const all = plan.days.flatMap(d => d.tasks);
    const claimed = [...new Set(all.filter(t => t.type === "confirm").map(t => t.topic))];
    const fix = [...new Set(all.filter(t => t.type === "fixStudy").map(t => t.module))];
    const months = {}; plan.days.forEach(d => { const k = d.date.slice(0, 7); const m = months[k] || (months[k] = { min: 0, learn: 0, practice: 0, review: 0, mock: 0 }); d.tasks.forEach(t => { m.min += t.min; const g = t.type === "learn" || t.type === "fixStudy" ? "learn" : ["practice", "qb", "test", "check", "confirm", "diag", "mistakes"].includes(t.type) ? "practice" : t.type === "mock" || t.type === "mockReview" ? "mock" : "review"; m[g] += t.min; }); });
    const why = [
      lastDiag ? `Dựa trên bài ${lastDiag.kind === "full90" ? "chẩn đoán 90 phút" : "chẩn đoán 45 phút"} ngày ${dmy(lastDiag.date)} (${lastDiag.k}/${lastDiag.n} đúng) và tổng cộng ${an.evidenceTotal} câu bạn đã làm.` : "Chưa có bài chẩn đoán: kế hoạch đang dựa trên tự đánh giá của bạn; bài chẩn đoán 45 phút được xếp vào ngày đầu để hiệu chỉnh.",
      weak.length ? `Cần cải thiện (theo bài làm${weak.some(t => !sure(t)) ? ", một số mới là tín hiệu sơ bộ vì ít câu" : ""}): ${weak.join(", ")} — được dành nhiều thời gian hơn.` : "",
      strong.length ? `Đã vững hoặc đã xác nhận: ${strong.join(", ")} — ${strong.every(t => !all.some(x => x.type === "learn" && x.topic === t)) ? "chỉ ôn và duy trì, không học lại từ đầu" : "học lại ít, chủ yếu ôn và duy trì"}.` : "",
      goodPrelim.length ? `Kết quả tốt nhưng mới có ít câu (chưa kết luận): ${goodPrelim.join(", ")}.` : "",
      claimed.length ? `Bạn tự nhận đã học kỹ ${claimed.join(", ")} nhưng chưa có đủ bài làm: có bài xác nhận 10 câu ở đầu kế hoạch.` : "",
      fix.length ? `Khắc phục lỗi lặp lại ở ${fix.join(", ")}: xem lời giải → luyện câu mới → kiểm tra lại.` : "",
      plan.depth > 1.05 ? `Bạn có nhiều thời gian hơn nhu cầu ước tính: mỗi module được học sâu hơn (×${String(plan.depth).replace(".", ",")})${plan.freeMinutes >= 60 ? ` và còn ${fmtH(plan.freeMinutes)} để trống` : ""}.` : plan.depth < 0.95 ? `Thời gian eo hẹp: mỗi module được rút gọn (×${String(plan.depth).replace(".", ",")}); mỗi môn vẫn giữ phần quan trọng nhất.` : "",
      "Thứ tự học: công cụ định lượng trước, rồi từng topic theo thứ tự giáo trình; mỗi module có buổi luyện ngay sau khi học và được ôn lại sau 1, 3, 7, 14, 30 ngày."
    ].filter(Boolean);
    view.innerHTML = `${head(`Kế hoạch học của ${esc(c.profile.name || activeProfile().name)}`, `Phiên bản ${c.ver.length} · tạo ${dmy(plan.createdAt)} · ${esc(HT.REASON_LABEL[ver.reason] || "")} · thi ngày ${dmy(plan.examDate)}`, exportBtns(), "plan", { onPlan: true })}
      <div class="grid grid-stats">
        <div class="card stat"><span class="stat-label">Còn</span><span class="stat-value">${plan.daysLeft}<small> ngày</small></span><span class="stat-hint">${plan.days.filter(d => d.minutes).length} ngày học</span></div>
        <div class="card stat"><span class="stat-label">Thời gian khả dụng</span><span class="stat-value">${fmtH(plan.capacity)}</span><span class="stat-hint">nhu cầu ước tính ${fmtH(plan.neededMinutes || 0)}</span></div>
        <div class="card stat"><span class="stat-label">Đã xếp lịch</span><span class="stat-value">${fmtH(plan.placedMinutes)}</span><span class="stat-hint">${plan.freeMinutes >= 60 ? `${fmtH(plan.freeMinutes)} để trống` : "gần như dùng hết thời gian"}</span></div>
        <div class="card stat"><span class="stat-label">Thi thử 180 câu</span><span class="stat-value">${plan.mocks}</span><span class="stat-hint">${plan.deferredMinutes ? `${fmtH(plan.deferredMinutes)} chưa xếp được` : "đủ nội dung"}</span></div>
      </div>
      ${plan.warnings.map(w => `<div class="callout warn">${icon("alert", 16)} ${esc(w)}</div>`).join("")}${plan.notes.map(w => `<div class="callout">${icon("flag", 16)} ${esc(w)}</div>`).join("")}
      <section class="card section"><div class="card-head"><h2>Vì sao kế hoạch như vậy</h2></div><ul class="ht-why">${why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
        ${ver.diff && ver.diff.length && c.ver.length > 1 ? `<p class="text-2 small"><b>Thay đổi so với phiên bản trước:</b> ${ver.diff.map(esc).join(" ")}</p>` : ""}</section>
      <section class="card section"><div class="card-head"><h2>Bốn giai đoạn</h2></div><div class="ht-phases">${plan.phases.map((ph, i) => `<div class="ht-phase ${ph.from ? "" : "off"}">
          <div class="ht-phase-head"><span class="ht-key ph${i + 1}"></span><b>${i + 1}. ${PHASE[i]}</b></div><span class="text-3 small">${ph.from ? `${dmy(ph.from)} → ${dmy(ph.to)} · ${fmtH(ph.minutes)}` : "không cần giai đoạn này"}</span><span class="text-2 small">${PHASE_TXT[i]}</span></div>`).join("")}</div>
        <div class="ht-phase-strip">${plan.phases.map((ph, i) => ph.minutes ? `<i class="ph${i + 1}" style="flex-grow:${ph.minutes}" title="${PHASE[i]}"></i>` : "").join("")}</div></section>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Thời gian theo topic</h2></div>${bars(TOPICS.map(t => ({ label: `${t.id} (đề ${t.weight})`, pct: 100 * (byTopic[t.id] || 0) / totT, text: fmtH(byTopic[t.id] || 0) })))}
          <p class="text-3 small">Theo tỷ trọng đề ${CURRICULUM_YEAR} và lỗ hổng của bạn; mọi môn đều có thời gian.</p></section>
        <section class="card"><div class="card-head"><h2>Theo tháng</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Tháng</th><th class="num">Tổng</th><th class="num">Học</th><th class="num">Luyện/KT</th><th class="num">Ôn</th><th class="num">Thi thử</th></tr></thead><tbody>
          ${Object.entries(months).map(([k, v]) => `<tr><td>${k.slice(5)}/${k.slice(0, 4)}</td><td class="num">${fmtH(v.min)}</td><td class="num">${fmtH(v.learn)}</td><td class="num">${fmtH(v.practice)}</td><td class="num">${fmtH(v.review)}</td><td class="num">${fmtH(v.mock)}</td></tr>`).join("")}</tbody></table></div></section>
      </div>
      <section class="card section"><div class="card-head"><h2>7 ngày tới</h2><a class="card-link" href="#/coach/plan">Theo ngày</a></div><div class="co-week">${firstDays.map(d => `<div class="co-daycard ${d.date === today() ? "now" : ""}"><b>${WD[CE.weekday(d.date)]} ${dmy(d.date).slice(0, 5)}</b><span class="text-3 small">${d.minutes ? `${d.tasks.reduce((s, t) => s + t.min, 0)} phút` : "nghỉ"}</span>${d.tasks.map(t => `<div class="co-mini co-type-${t.type} ${t.status !== "todo" ? "done" : ""}">${esc(HT.label(t))}</div>`).join("")}</div>`).join("")}</div></section>
      <section class="card section"><div class="card-head"><h2>Hôm nay · ${WD[CE.weekday(today())]} ${dmy(today())}</h2></div>${dayHtml(plan.days.find(d => d.date === today()))}</section>
      ${plan.deferred.length ? `<section class="card section"><div class="card-head"><h2>Chưa xếp được (${plan.deferred.length})</h2></div><div class="list">${plan.deferred.slice(0, 15).map(t => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(HT.label(t))}</div><div class="list-meta">${t.min} phút · ưu tiên thấp hơn các mục đã xếp</div></div></div>`).join("")}</div></section>` : ""}
      <div class="form-actions"><a class="btn btn-secondary" href="#/coach/setup">Sửa hồ sơ / giờ học</a><button class="btn btn-secondary" data-ht-tutor="0">${icon("chat", 16)} Hỏi CFA Tutor về kế hoạch</button>
        ${!lastDiag ? `<a class="btn btn-primary" href="#/coach/start/quick45">Làm bài chẩn đoán để hiệu chỉnh</a>` : `<a class="btn btn-primary" href="#/coach/plan">Nhiệm vụ hôm nay</a>`}</div>`;
    c.planNew = false; delete c.notice; HT.save();
    bindTasks(planReady); bindExport(); bindTutor();
  }
  function planPrint() {
    const c = C(), plan = HT.plan(); if (!plan) return noPlan("In kế hoạch");
    const prof = HT.engineProfile(), weeks = [];
    plan.days.forEach(d => { const w = CE.addDays(d.date, -((CE.weekday(d.date) + 6) % 7)); let wk = weeks[weeks.length - 1]; if (!wk || wk.start !== w) weeks.push(wk = { start: w, days: [] }); wk.days.push(d); });
    view.innerHTML = `<div class="ht-print">
      <div class="ht-noprint form-actions" style="justify-content:space-between"><a class="btn btn-ghost" href="#/coach/plan/ready">${icon("prev", 16)} Quay lại</a><button class="btn btn-primary" id="ht-print">${icon("download", 16)} In / lưu PDF</button></div>
      <h1>Kế hoạch học CFA Level I — ${esc(c.profile.name || activeProfile().name)}</h1>
      <p>Hoa Tiêu · phiên bản ${c.ver.length} · tạo ${dmy(plan.createdAt)} · thi ngày ${dmy(plan.examDate)} · ${fmtH(plan.capacity)} khả dụng, ${fmtH(plan.placedMinutes)} đã xếp.</p>
      <table class="ht-ptable"><thead><tr><th>Giai đoạn</th><th>Từ</th><th>Đến</th><th>Giờ</th></tr></thead><tbody>${plan.phases.map((ph, i) => `<tr><td>${i + 1}. ${PHASE[i]}</td><td>${dmy(ph.from) || "—"}</td><td>${dmy(ph.to) || "—"}</td><td>${fmtH(ph.minutes)}</td></tr>`).join("")}</tbody></table>
      ${plan.warnings.map(w => `<p class="ht-pwarn">⚠ ${esc(w)}</p>`).join("")}
      ${weeks.map(w => `<section class="ht-pweek"><h2>Tuần từ ${dmy(w.start)}</h2>${w.days.map(d => `<div class="ht-pday"><b>${WD[CE.weekday(d.date)]} ${dmy(d.date)}</b>${d.minutes ? CE.daySessions(d, prof).map(s => `<div class="ht-psess"><span>${s.start}–${s.end}</span><ul>${s.tasks.map(t => `<li>☐ ${esc(HT.label(t))} <i>(${t.min}′)</i></li>`).join("")}</ul></div>`).join("") : `<span class="text-3"> — nghỉ</span>`}</div>`).join("")}</section>`).join("")}
      <p class="text-3 small">Kế hoạch được tạo tự động từ dữ liệu học tập của bạn; Hoa Tiêu sẽ điều chỉnh khi có kết quả mới. Không phải tài liệu của CFA Institute.</p></div>`;
    document.getElementById("ht-print").onclick = () => window.print();
  }
  function planPage() {
    const c = C(), plan = HT.plan(); if (!plan) return noPlan("Kế hoạch");
    const tab = UI.tab, days = plan.days, prof = HT.engineProfile();
    const tabs = [["today", "Hôm nay"], ["week", "Tuần"], ["month", "Tháng"], ["all", "Toàn kỳ"], ["versions", `Phiên bản (${c.ver.length})`]];
    let body = "";
    const missed = HT.missedTasks();
    if (tab === "today") {
      body = `<section class="card">${dayHtml(days.find(d => d.date === today()), { title: `Hôm nay · ${WD[CE.weekday(today())]} ${dmy(today())}` })}</section>
        ${missed.length ? `<section class="card section"><div class="card-head"><h2>Nhiệm vụ trễ (${missed.length})</h2><button class="btn btn-sm btn-secondary" id="ht-replan2">Lập lại lịch từ hôm nay</button></div><div class="co-tasks">${missed.slice(0, 8).map(t => taskRow(t, { time: dmy(t.date) })).join("")}</div><p class="text-3 small">Nhiệm vụ trễ không được tính là hoàn thành và không làm giảm điểm năng lực.</p></section>` : ""}
        <section class="card section"><div class="card-head"><h2>Các ngày tới</h2></div>${days.filter(d => d.date > today() && d.minutes).slice(0, 3).map(d => dayHtml(d, { title: `${WD[CE.weekday(d.date)]} ${dmy(d.date)}` })).join("") || `<p class="text-2">Không còn ngày học nào.</p>`}</section>`;
    }
    if (tab === "week") {
      const i0 = Math.max(0, days.findIndex(d => d.date >= today()));
      body = `<section class="card"><div class="co-week">${days.slice(i0, i0 + 7).map(d => `<div class="co-daycard ${d.date === today() ? "now" : ""}"><b>${WD[CE.weekday(d.date)]} ${dmy(d.date).slice(0, 5)}</b><span class="text-3 small">${d.minutes ? `${d.tasks.reduce((s, t) => s + t.min, 0)}/${d.minutes} phút` : "nghỉ"}</span>${CE.daySessions(d, prof).map(s => `<span class="co-mini-time">${s.start}–${s.end}</span>${s.tasks.map(t => `<div class="co-mini co-type-${t.type} ${t.status !== "todo" ? "done" : ""}">${esc(HT.label(t))}</div>`).join("")}`).join("")}</div>`).join("")}</div></section>`;
    }
    if (tab === "month") {
      const monthsList = [...new Set(days.map(d => d.date.slice(0, 7)))];
      const mm = monthsList.includes(UI.month) ? UI.month : monthsList[0], mdays = days.filter(d => d.date.slice(0, 7) === mm);
      const lead = mdays.length ? (CE.weekday(mdays[0].date) + 6) % 7 : 0;
      body = `<section class="card"><div class="segmented" style="flex-wrap:wrap">${monthsList.map(m => `<button data-month="${m}" class="${mm === m ? "active" : ""}">${m.slice(5)}/${m.slice(2, 4)}</button>`).join("")}</div>
        <div class="ht-cal">${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(x => `<b>${x}</b>`).join("")}${"<span></span>".repeat(lead)}${mdays.map(d => { const mins = d.tasks.reduce((s, t) => s + t.min, 0); return `<div class="ht-cal-day ph${d.phase + 1} ${d.date === today() ? "now" : ""}" title="${esc(dmy(d.date) + ": " + d.tasks.map(t => HT.label(t)).join("; "))}"><span>${+d.date.slice(8)}</span>${d.minutes ? `<em>${mins}′</em><i>${[...new Set(d.tasks.map(t => t.topic).filter(Boolean))].slice(0, 3).join(" ")}</i>` : `<em>—</em>`}</div>`; }).join("")}</div>
        <p class="text-3 small">Màu theo giai đoạn: ${PHASE.map((p, i) => `<span class="ht-key ph${i + 1}"></span>${p}`).join(" · ")}. Di chuột (hoặc chạm) để xem nhiệm vụ.</p></section>`;
    }
    if (tab === "all") {
      const bt = plan.summary.byType, lbl = { learn: "Học", practice: "Luyện", qb: "Question Bank", review: "Ôn ngắt quãng", reread: "Ôn ghi chú", mistakes: "Ôn lỗi sai", formula: "Công thức", test: "Kiểm tra topic", check: "Kiểm tra module", confirm: "Xác nhận", diag: "Chẩn đoán", mock: "Thi thử", mockReview: "Phân tích thi thử", fixStudy: "Khắc phục", buffer: "Dự phòng", final: "Ngày cuối" };
      const tot = Object.values(bt).reduce((s, x) => s + x, 0) || 1;
      body = `<section class="card"><div class="card-head"><h2>Phân bổ theo loại việc</h2></div>${bars(Object.entries(bt).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: lbl[k] || k, pct: 100 * v / tot, text: fmtH(v) })))}</section>
        <section class="card section"><div class="card-head"><h2>Giả định của kế hoạch</h2></div><ul class="ht-why small">
          <li>Thời gian tham khảo cho cả chương trình: khoảng ${CE.CONFIG.recommendedHours} giờ (một nửa để học lần đầu, chia theo tỷ trọng topic và số module); thời gian học mỗi module nhân hệ số ×${String(plan.depth || 1).replace(".", ",")} theo thời gian bạn có.</li>
          <li>${String(CE.CONFIG.minutesPerQuestion).replace(".", ",")} phút/câu luyện; ôn ngắt quãng 5 câu ≈ ${CE.CONFIG.reviewMinutes} phút, tối đa ${Math.round(CE.CONFIG.reviewCap * 100)}% thời gian mỗi ngày; dự phòng khoảng ${Math.round(CE.CONFIG.bufferShare * 100)}% mỗi tuần.</li>
          <li>Điểm ưu tiên = 0,30 × lỗ hổng + 0,25 × tỷ trọng đề + 0,20 × nguy cơ quên + 0,15 × nền tảng + 0,10 × khẩn cấp (mỗi thành phần 0–1). Đây là công thức heuristic ban đầu, không phải mô hình được CFA Institute xác nhận.</li>
          <li>Thi thử: 2 phiên × 90 câu × 135 phút, trước ngày thi ít nhất 2 ngày; ngày trước kỳ thi chỉ ôn nhẹ.</li></ul></section>
        ${plan.deferred.length ? `<section class="card section"><div class="card-head"><h2>Chưa xếp được</h2></div><div class="list">${plan.deferred.map(t => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(HT.label(t))}</div><div class="list-meta">${t.min} phút</div></div></div>`).join("")}</div></section>` : ""}`;
    }
    if (tab === "versions") {
      body = `<section class="card"><p class="text-3 small">Mỗi lần kế hoạch thay đổi, một phiên bản mới được thêm cùng danh sách thay đổi; lịch sử không bị xóa.</p><div class="list">${c.ver.slice().reverse().map(v => `<div class="list-item"><div class="list-main">
        <div class="list-title">Phiên bản ${v.v} · ${dmy(v.date)} · ${esc(HT.REASON_LABEL[v.reason] || v.reason)}</div>
        <div class="list-meta">${v.sum ? `${fmtH(v.sum.capacity)} khả dụng · ${fmtH(v.sum.placedMinutes)} đã xếp${v.sum.deferredMinutes ? ` · ${fmtH(v.sum.deferredMinutes)} chưa xếp` : ""} · thi ${dmy(v.sum.examDate)}` : ""}</div>
        ${v.diff && v.diff.length ? `<ul class="ht-diff small">${v.diff.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></div>`).join("")}</div></section>`;
    }
    view.innerHTML = `${head("Kế hoạch học", `Phiên bản ${c.ver.length} · ${plan.daysLeft} ngày đến kỳ thi ${dmy(plan.examDate)} · ${fmtH(plan.capacity)} khả dụng`, `<a class="btn btn-primary" href="#/coach/plan/ready">Xem kế hoạch đầy đủ</a><button class="btn btn-secondary" id="ht-replan">${icon("calendar", 16)} Lập lại lịch</button>`, "plan", { onPlan: true })}
      ${exportBtns()}
      <div class="segmented co-tabs" style="margin-top:12px">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</button>`).join("")}</div>
      <div style="margin-top:14px">${body}</div>`;
    if (c.notice) { delete c.notice; HT.save(); }
    bindTasks(planPage); bindExport();
    view.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; planPage(); });
    view.querySelectorAll("[data-month]").forEach(b => b.onclick = () => { UI.month = b.dataset.month; planPage(); });
    const rp = () => { const r = HT.newPlan("manual"); if (r.error) return toast(r.error, "error"); toast("Đã lập lại lịch từ hôm nay; phiên bản cũ vẫn được lưu"); location.hash = "#/coach/plan/ready"; };
    document.getElementById("ht-replan").onclick = rp;
    const rp2 = document.getElementById("ht-replan2"); if (rp2) rp2.onclick = rp;
  }

  // ======================= assessments =======================
  function testHub() {
    const c = C(), hist = c.hist.slice().reverse();
    const KN = { quick45: "Chẩn đoán nhanh", full90: "Chẩn đoán toàn diện", confirm: "Xác nhận", test: "Kiểm tra cuối topic", check: "Kiểm tra module", mock: "Thi thử", practice: "Luyện", review: "Ôn ngắt quãng", mistakes: "Ôn lỗi sai" };
    const mockOpen = c.mock && c.mock.sess && c.mock.sess[0] && !c.mock.sess[1];
    view.innerHTML = `${head("Đánh giá", "Bài kiểm tra nội bộ để đo trình độ từng topic. Không phải bài thi CFA chính thức.", "", "test")}
      <div class="grid grid-3">
        ${[["quick45", "Chẩn đoán nhanh", "30 câu · 45 phút", "Mỗi môn ít nhất 2 câu, phân bổ theo trọng số 2027; dễ–vừa–khó trộn lẫn; có câu tính toán và lý thuyết."],
          ["full90", "Chẩn đoán toàn diện", "60 câu · 90 phút", "Phủ rộng hơn, độ khó cân bằng; kết luận theo topic đáng tin hơn."],
          ["mock", "Thi thử 180 câu", "2 phiên × 90 câu × 135 phút", "Phân bổ theo trọng số; phân tích thời gian, topic, so sánh với lần trước."]].map(([k, t, s, d]) => `<article class="card"><h3>${t}</h3><p class="text-3 small">${s}</p><p class="text-2 small">${d}</p>
          ${k === "mock" && mockOpen ? `<a class="btn btn-primary" href="#/coach/start/mock/2">Làm phiên 2</a>` : `<a class="btn btn-primary" href="#/coach/start/${k}${k === "mock" ? "/1" : ""}">Bắt đầu</a>`}</article>`).join("")}
      </div>
      <section class="card section"><div class="card-head"><h2>Xác nhận đã thành thạo một topic</h2></div>
        <p class="text-2 small">Đã học kỹ một topic? Làm 10 câu chưa làm. Đạt ≥ 80% (có trọng số độ khó) thì topic chuyển sang duy trì và kế hoạch bỏ phần học lại (vẫn giữ ôn tập).</p>
        <div class="row-gap">${TOPICS.map(t => `<a class="btn btn-sm ${c.confirmed[t.id] ? "btn-soft-success" : "btn-secondary"}" href="#/coach/start/confirm/${t.id}">${t.id}${c.confirmed[t.id] ? " ✓" : ""}</a>`).join("")}</div></section>
      <section class="card section"><div class="card-head"><h2>Kiểm tra cuối topic (15 câu · 25 phút)</h2></div><div class="row-gap">${TOPICS.map(t => `<a class="btn btn-sm btn-secondary" href="#/coach/start/test/${t.id}">${t.id}</a>`).join("")}</div></section>
      <section class="card section"><div class="card-head"><h2>Lịch sử</h2></div>${hist.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th class="num">Đúng</th><th class="num">Phút</th><th></th></tr></thead><tbody>
        ${hist.slice(0, 40).map(h => `<tr><td>${dmy(h.date)}</td><td>${esc(KN[h.kind] || h.kind)}${h.kind === "mock" ? ` · phiên ${h.part}` : ""}</td><td>${esc(h.target && !["-", "all", "1", "2"].includes(h.target) ? h.target : "")}</td><td class="num">${h.k}/${h.n}${h.expired ? " ⏱" : ""}</td><td class="num">${Math.round((h.secs || 0) / 60)}</td><td><a href="#/coach/report/${h.id}">Xem</a></td></tr>`).join("")}</tbody></table></div>` : `<p class="text-2">Chưa có bài nào.</p>`}</section>`;
  }

  // ======================= analysis =======================
  function analysisPage() {
    const c = C(), an = HT.analysis(), ev = CE.evidenceSummary(an), src = HT.sources();
    const topic = UI.topic || (TOPICS.find(t => an.topics[t.id].n && an.topics[t.id].band !== "strong") || TOPICS[0]).id;
    const mods = modulesOf(topic), P = HT.pool(), st = HT.plannerState(an);
    const ci = a => `${Math.round(a.ci[0] * 100)}–${Math.round(a.ci[1] * 100)}%`;
    const trendTxt = t => ({ improving: "↗ tiến bộ", declining: "↘ giảm", stable: "→ ổn định", "not-comparable": "khác độ khó", insufficient: "" })[t.status] || "";
    const calTxt = { over: "tự đánh giá cao hơn kết quả", under: "kết quả tốt hơn tự đánh giá", ok: "khớp" };
    view.innerHTML = `${head("Phân tích năng lực", "Năm cấp: topic → module → kỹ năng (LOS) → loại lỗi → phản hồi riêng. Mọi nhận định có kèm số câu và độ tin cậy.", "", "analysis")}
      <p class="text-3 small">Nguồn dữ liệu: ${src.coach} câu từ bài làm Hoa Tiêu · ${src.site} câu từ Practice/Mock exams · ${src.qb} đánh dấu Question Bank (mỗi đánh dấu tính 0,6 câu vì là kết quả gần nhất, có thể gồm câu làm lại). Chỉ lần làm đầu tiên của mỗi câu được tính.</p>
      <section class="card"><div class="card-head"><h2>Cấp 1 · Theo topic</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Câu</th><th class="num">Đúng</th><th class="num">Có trọng số</th><th>Khoảng 90%</th><th>Nhận định</th><th>Dễ · vừa · khó</th><th>Xu hướng</th><th>Tự đánh giá</th></tr></thead><tbody>
        ${TOPICS.map(t => { const a = an.topics[t.id]; return `<tr class="${t.id === topic ? "co-sel" : ""}"><td><a href="#/coach/analysis" data-ht-topic="${t.id}">${esc(t.name)}</a></td><td class="num">${a.n}</td><td class="num">${a.n ? Math.round(a.acc * 100) + "%" : "–"}</td><td class="num">${a.n ? Math.round(a.wAcc * 100) + "%" : "–"}</td><td>${a.n ? ci(a) : "–"}</td>
          <td>${bandChip(a.band)} <span class="text-3 small">${CONF[a.confidence]}</span></td><td class="small">${[1, 2, 3].map(d => a.byDiff[d].n ? `${a.byDiff[d].k}/${a.byDiff[d].n}` : "–").join(" · ")}</td><td class="small">${trendTxt(a.trend)}</td>
          <td class="small">${a.selfRating ? a.selfRating + "/5" : "–"}${a.calibration && a.calibration !== "ok" ? ` · <span class="text-warning">${calTxt[a.calibration]}</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="text-3 small">Ngưỡng (chỉnh được trong CONFIG): Vững ≥ 80% · Đang tiến bộ 65–79% · Cần cải thiện 50–64% · Yếu &lt; 50%, tính trên độ chính xác có trọng số độ khó. Dưới ${CE.CONFIG.evidence.insufficient} câu không kết luận. ${ev.insufficient.length ? `<b>Thiếu dữ liệu:</b> ${ev.insufficient.join(", ")} — nên <a href="#/coach/test">làm thêm bài kiểm tra</a>.` : ""} Xu hướng chỉ so các bài có ≥ 5 câu của topic và độ khó tương đương.</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 2 · Module của ${esc(HT.topicName(topic))}</h2></div>
        <div class="segmented" style="flex-wrap:wrap">${TOPICS.map(t => `<button data-t="${t.id}" class="${t.id === topic ? "active" : ""}">${t.id}</button>`).join("")}</div>
        <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Module</th><th class="num">Câu</th><th class="num">Đúng</th><th>Nhận định</th><th class="num">Nắm vững (ước tính)</th><th class="num">Câu chưa làm</th><th></th></tr></thead><tbody>
          ${mods.map(m => { const a = an.modules[m.id], k = CE.moduleKnowledge({ id: m.id, topic }, st).k, fresh = Math.max(0, (P.supply[m.id] || 0) - (st.seen[m.id] || 0)); return `<tr><td><a href="#/module/${m.id}">${m.n}. ${esc(m.title)}</a></td><td class="num">${a ? a.n : 0}</td><td class="num">${a ? Math.round(a.acc * 100) + "%" : "–"}</td>
            <td>${a ? (a.nEff < 4 ? chip("Sơ bộ") + ` <span class="text-3 small">${a.k}/${a.n}</span>` : bandChip(a.band)) : chip("Chưa đo")}</td><td class="num">${Math.round(k * 100)}%</td><td class="num">${fresh}</td>
            <td>${fresh >= 3 ? `<a class="btn btn-sm btn-ghost" href="#/coach/start/practice/${m.id}">Luyện</a>` : `<span class="text-3 small">Resource not available</span>`}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="text-3 small">Mức nắm vững ước tính kết hợp tự đánh giá, kết quả của topic và kết quả riêng của module (module càng nhiều câu thì càng dựa vào chính nó).</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 3 · Kỹ năng (LOS) chưa đạt</h2></div>
        ${an.weakSkills.length ? `<div class="list">${an.weakSkills.map(w => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(w.skill)}</div><div class="list-meta">${w.topic} · ${esc(w.module)} ${esc(HT.modTitle(w.module))} · ${w.k}/${w.n} đúng${w.preliminary ? " · tín hiệu sơ bộ" : ""}</div></div><a class="btn btn-sm btn-secondary" href="#/coach/solutions/${w.module}">Xem lời giải</a></div>`).join("")}</div>` : `<p class="text-2">Chưa có kỹ năng nào có đủ bằng chứng là yếu (cần ≥ 2 câu cùng kỹ năng, &lt; 60% đúng).</p>`}
        <p class="text-3 small">Thẻ kỹ năng lấy từ ngân hàng câu hỏi: câu của Hoa Tiêu có tên kỹ năng; ${STARTER_QUESTIONS.filter(q => /^LOS\s*\d+\.[a-z]$/i.test(q.los || "")).length} câu có sẵn mang số LOS theo danh mục SchweserNotes 2026 (đánh số cũ, chưa đối chiếu với LOS ${CURRICULUM_YEAR}); câu chỉ ghi “Vol · LM” được phân tích ở cấp module. Hoa Tiêu không tự gắn mã LOS.</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 4 · Loại lỗi (giả thuyết)</h2></div>${an.errors.total ? coachErrorList(an.errors) : `<p class="text-2">Chưa có câu sai để phân loại.</p>`}</section>
      <section class="card section"><div class="card-head"><h2>Cấp 5 · Phản hồi riêng</h2></div>
        ${an.remediation.length ? `<div class="callout warn">${an.remediation.map(r => `Sai ${r.wrong}/5 câu gần nhất ở <b>${esc(r.skill)}</b> (${esc(r.module)}): <a href="#/coach/solutions/${r.module}">xem lời giải từng bước</a>, rồi luyện câu mới và kiểm tra lại (đã có trong kế hoạch).`).join("<br>")}</div>` : ""}
        <div class="co-recos">${CE.recommendations(st, today(), c.profile.examDate, 5).map(recoHtml).join("")}</div></section>`;
    view.querySelectorAll("[data-ht-topic]").forEach(a => a.onclick = e => { e.preventDefault(); UI.topic = a.dataset.htTopic; analysisPage(); });
    view.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { UI.topic = b.dataset.t; analysisPage(); });
  }

  // worked solutions of the questions you got wrong in a module (remediation step 2)
  function solutions(mod, taskId) {
    if (!moduleById(mod)) return void (location.hash = "#/coach/analysis");
    const ids = HT.mistakeIds().filter(id => (HT.metaOf(id) || {}).module === mod).slice(0, 8);
    const Q = new Map(DATA.questions.map(q => [q.id, q]));
    const last = new Map(); HT.coachRows().forEach(a => { if (a.m === mod) last.set(a.q, a.pick); });
    DATA.questions.forEach(q => { if (q.chapter === mod && q.attempts && q.attempts.length && !last.has(q.id)) last.set(q.id, q.attempts[q.attempts.length - 1].picked); });
    const pre = CE.PRE_MODULE[moduleById(mod).topic];
    view.innerHTML = `${head(`Lời giải: ${esc(mod)} ${esc(HT.modTitle(mod))}`, "Xem lại các câu bạn đã làm sai, từng bước, trước khi luyện câu mới.", "", "analysis")}
      <section class="card"><ol class="co-steps small"><li>Đọc lại bài học: <a href="#/module/${mod}">${esc(mod)} ${esc(HT.modTitle(mod))}</a>${pre && pre !== mod ? ` (nền tảng: <a href="#/module/${pre}">${esc(pre)} ${esc(HT.modTitle(pre))}</a>)` : ""}.</li>
        <li>Xem lời giải từng câu dưới đây; với câu tính toán, làm lại bằng BA II Plus. Nút hỏi CFA Tutor giải thích từng bước.</li><li>Sau đó <a href="#/coach/start/practice/${mod}">luyện câu mới</a> và <a href="#/coach/start/check/${mod}">kiểm tra lại 5 câu</a>.</li></ol></section>
      ${ids.length ? ids.map((id, i) => { const q = Q.get(id); return q ? `<section class="card section"><div class="text-3 small">Câu ${i + 1} · ${esc((HT.metaOf(id) || {}).skill || "")}</div>${questionBodyHtml(q)}${choicesHtml(q, last.get(id) || null, true)}${explanationHtml(q, last.get(id) || null)}</section>` : ""; }).join("")
        : `<section class="card section"><p class="text-2">Không có câu sai nào đang mở ở module này.</p></section>`}
      ${taskId ? `<div class="form-actions"><button class="btn btn-primary" id="ht-sol-done">Đã xem xong lời giải</button></div>` : ""}`;
    const b = document.getElementById("ht-sol-done");
    if (b) b.onclick = () => { const r = HT.completeTask(taskId, { selfReport: true }); toast(r.status === "todo" ? (r.reason || "Không ghi nhận được") : "Đã ghi nhận", r.status === "todo" ? "error" : "success"); location.hash = "#/coach/plan"; };
  }

  // ======================= spaced repetition =======================
  function reviewPage() {
    const c = C(), rows = Object.entries(c.rev).map(([m, r]) => ({ m, r, ret: CE.retention(r, today()), due: r.next <= today() })).sort((a, b) => (b.due - a.due) || a.r.next.localeCompare(b.r.next));
    const due = rows.filter(x => x.due);
    view.innerHTML = `${head("Ôn ngắt quãng", "Nhắc ôn những module có nguy cơ quên. Một lần trả lời đúng chưa phải là nhớ lâu.", "", "review")}
      <section class="card"><div class="row-between"><p class="text-2 small" style="margin:0">Lịch mặc định 1 → 3 → 7 → 14 → 30 ngày; khoảng cách giãn khi bạn nhớ tốt (≥ 80%), co lại khi quên (&lt; 50%). Ghi nhớ ước tính = e^(−số ngày / độ bền), độ bền gắn với khoảng cách hiện tại — heuristic, chưa hiệu chỉnh bằng dữ liệu của bạn.</p>
        ${due.length ? `<a class="btn btn-primary" href="#/coach/start/review/due">Ôn ${Math.min(4, due.length)} module đến hạn</a>` : ""}</div>
      ${rows.length ? `<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Module</th><th>Lần ôn gần nhất</th><th>Lần ôn tới</th><th class="num">Ghi nhớ ước tính</th><th class="num">Mức</th><th></th></tr></thead><tbody>
        ${rows.map(({ m, r, ret, due: d }) => `<tr><td><a href="#/module/${m}">${esc(m)} ${esc(HT.modTitle(m))}</a></td><td>${dmy(r.last)}</td><td>${d ? chip("Đến hạn", "danger") : dmy(r.next)}</td><td class="num">${Math.round(ret * 100)}%</td><td class="num">${r.stage + 1}/5</td><td>${(HT.pool().supply[m] || 0) >= 3 ? `<a class="btn btn-sm btn-secondary" href="#/coach/start/review/${m}">Ôn 5 câu</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="text-2">Chưa có module nào trong lịch ôn. Module vào lịch sau khi bạn học xong (đã báo hoặc đã kiểm tra) hoặc có ≥ 2 câu trả lời trong một bài.</p>`}</section>`;
  }

  // ======================= question bank integration =======================
  function bankPage() {
    const P = HT.pool(), byT = {}, missing = { module: 0, skill: 0 };
    STARTER_QUESTIONS.forEach(q => { const t = byT[q.topic] || (byT[q.topic] = { n: 0, d: [0, 0, 0, 0] }); t.n++; const m = HT.metaOf(q.id); t.d[m.diff]++; if (!q.module) missing.module++; if (!(q.skill || q.los)) missing.skill++; });
    const own = DATA.questions.filter(q => !q.builtIn), ownMissing = own.filter(q => !q.chapter || !q.topic).length;
    const thin = MODULES.filter(m => (P.supply[m.id] || 0) < 3);
    const qb = HT.qbByModule(), qbSets = Object.values(qb).flat(), qbN = qbSets.reduce((s, x) => s + x.total, 0);
    let qbUnmapped = 0; if (typeof QBANK_FILES !== "undefined" && typeof QBI !== "undefined" && typeof qbSetModule === "function") TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => { if (QBI[f[2]] && !qbSetModule(f[2])) qbUnmapped++; }));
    const row = (name, st, txt) => `<tr><td>${esc(name)}</td><td>${st === true ? chip("Đang dùng", "success") : st === "partial" ? chip("Một phần", "warning") : chip("Chưa tích hợp", "danger")}</td><td class="text-2 small">${txt}</td></tr>`;
    view.innerHTML = `${head("Ngân hàng câu hỏi", "Nguồn câu hỏi Hoa Tiêu dùng, metadata và độ phủ.", "", "bank")}
      <section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nguồn</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>
        ${row("Ngân hàng tích hợp của website", true, `${STARTER_QUESTIONS.length} câu gốc (trong đó ${STARTER_QUESTIONS.filter(q => q.src === "coach").length} câu viết riêng cho Hoa Tiêu: 18 câu mỗi môn, dễ–vừa–khó trộn lẫn). Dùng cho chẩn đoán, luyện, kiểm tra, thi thử. Không có câu do AI tự bịa.`)}
        ${row("Question Bank trên thiết bị này", qbSets.length ? true : "partial", qbSets.length ? `${qbSets.length} set đã nạp (${qbN} câu) được gắn vào module: kế hoạch giao set khi câu tích hợp đã làm hết; đánh dấu của bạn được tính làm bằng chứng (0,6 câu mỗi đánh dấu).${qbUnmapped ? ` ${qbUnmapped} set chưa ghép được module.` : ""}` : `Chưa có set nào được nạp cho tài khoản này. <a href="#/qbank">Mở Question Bank</a> để nạp; sau đó kế hoạch sẽ dùng được.`)}
        ${row("Câu hỏi bạn tự thêm", "partial", `${own.length} câu; ${ownMissing} câu thiếu topic hoặc module. Được tính khi bạn làm trong Practice; không dùng cho chẩn đoán vì chưa có độ khó chuẩn hoá.`)}
        ${row("Kết nối API ngân hàng câu hỏi bên ngoài (Settings → Integrations)", false, "Website là trang tĩnh (GitHub Pages), không có máy chủ để giữ khóa API an toàn phía server. Theo yêu cầu bảo mật, khóa API không được nằm ở frontend, nên Hoa Tiêu không có ô nhập khóa. Cần một backend (ví dụ FastAPI + PostgreSQL) để kiểm tra kết nối, mã hóa khóa, đồng bộ metadata và phân quyền.")}</tbody></table></div></section>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Câu đủ điều kiện theo topic</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Tổng</th><th class="num">Dễ</th><th class="num">Vừa</th><th class="num">Khó</th></tr></thead><tbody>
          ${TOPICS.map(t => { const x = byT[t.id] || { n: 0, d: [0, 0, 0, 0] }; return `<tr><td>${t.id}</td><td class="num">${x.n}</td><td class="num">${x.d[1]}</td><td class="num">${x.d[2]}</td><td class="num">${x.d[3]}</td></tr>`; }).join("")}</tbody></table></div>
          <p class="text-3 small">Metadata: ${missing.module} câu thiếu module, ${missing.skill} thiếu thẻ kỹ năng. Mỗi câu có: mã, topic, module, thẻ kỹ năng, năm curriculum ${CURRICULUM_YEAR}, độ khó, thời gian ước tính, nguồn, đáp án, lời giải.</p></section>
        <section class="card"><div class="card-head"><h2>Module ít câu hỏi (&lt; 3)</h2></div>${thin.length ? `<div class="list">${thin.map(m => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(m.id)} ${esc(m.title)}</div><div class="list-meta">${P.supply[m.id] || 0} câu · Resource not available cho luyện và ôn${qb[m.id] ? " · có set Question Bank" : ""}</div></div></div>`).join("")}</div>` : `<p class="text-2">Mọi module đều có ít nhất 3 câu.</p>`}
          ${isOwner() ? `<p class="text-3 small">Chủ tài khoản có thể thêm câu ở Practice → Add question / Import CSV.</p>` : ""}</section></div>`;
  }

  // ======================= method, status, data =======================
  function methodPage() {
    const row = (name, st, txt) => `<tr><td>${esc(name)}</td><td>${st === true ? chip("Hoạt động", "success") : st === "partial" ? chip("Một phần", "warning") : chip("Chưa có", "danger")}</td><td class="text-2 small">${txt}</td></tr>`;
    view.innerHTML = `${head("Phương pháp & trạng thái", "Hoa Tiêu làm gì, dựa trên gì, và phần nào chưa có.", "", "method")}
      <section class="card"><div class="card-head"><h2>Cách hoạt động</h2></div><ol class="co-steps small">
        <li><b>Đo:</b> chỉ lần làm đầu tiên của mỗi câu là bằng chứng. Câu khó tính 1,3 · vừa 1,0 · dễ 0,8. Tự đánh giá là điểm xuất phát, có sức nặng như 3 câu và nhỏ dần khi có bài làm.</li>
        <li><b>Nói rõ độ tin cậy:</b> dưới ${CE.CONFIG.evidence.insufficient} câu không kết luận; luôn hiện khoảng tin cậy 90% (Wilson).</li>
        <li><b>Ưu tiên:</b> 0,30 lỗ hổng + 0,25 tỷ trọng đề + 0,20 nguy cơ quên + 0,15 nền tảng + 0,10 khẩn cấp, mỗi thành phần chuẩn hoá 0–1.</li>
        <li><b>Lập lịch:</b> theo giờ thật bạn khai; học theo khối topic và thứ tự giáo trình (QM trước các topic dùng nó, FSA trước Equity); module dài chia thành phần ≤ ${CE.CONFIG.chunkMinutes} phút; ôn ngắt quãng 1/3/7/14/30 ngày; dự phòng mỗi tuần; thi thử 180 câu ở giai đoạn cuối; ngày trước kỳ thi ôn nhẹ. Thiếu giờ: mọi môn vẫn có phần quan trọng nhất và phần chưa xếp được được nói rõ. Thừa giờ: để trống, không nhồi việc.</li>
        <li><b>Thích ứng:</b> sau mỗi bài đánh giá; mỗi ngày một lần khi có việc trễ hoặc ≥ 10 câu mới. Việc trễ không được tính là xong và không trừ điểm năng lực; sau ≥ 3 ngày nghỉ, 3 ngày tới nhẹ hơn 20%; nếu thường chỉ làm được &lt; 60% kế hoạch, lịch mới theo giờ bạn thật sự học. Sai ≥ 4/5 câu gần nhất của một kỹ năng → chuỗi khắc phục (kiểm tra nền tảng, lời giải từng bước, câu mới, kiểm tra lại) thay vì làm lại câu cũ.</li>
        <li><b>Hoàn thành có bằng chứng:</b> luyện/ôn cần trả lời ≥ 80% số câu trong Hoa Tiêu; set Question Bank cần thêm đánh dấu mới; học cần kiểm tra nhanh 5 câu (≥ 60%) hoặc ghi “tự báo” (không đổi mức nắm vững).</li>
        <li><b>AI:</b> CFA Tutor chỉ giải thích; điểm, ưu tiên và lịch do các quy tắc tất định ở trên quyết định và được kiểm thử tự động.</li></ol>
        <p class="text-3 small">Ngưỡng, trọng số và công thức là heuristic ban đầu của website, không phải mô hình được CFA Institute hay ai khác xác nhận. Chỉ số sẵn sàng không phải xác suất đỗ. Thời gian tham khảo ${CE.CONFIG.recommendedHours} giờ là giả định để chia thời gian, có thể chỉnh trong CONFIG.</p></section>
      <section class="card section"><div class="card-head"><h2>Trạng thái các thành phần</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Thành phần</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>
        ${row("Hồ sơ, thời gian, tự đánh giá 10 topic / 102 module", true, "Lưu trong tài khoản của website trên thiết bị này; theo tài khoản khi xuất / nhập sao lưu.")}
        ${row("Chẩn đoán 45 / 90 phút, kiểm tra xác nhận, kiểm tra topic & module", true, "Đồng hồ, tự lưu, tự nộp, xem lại trước khi nộp, không lộ đáp án trước khi nộp.")}
        ${row("Thi thử 180 câu", true, "2 phiên × 90 câu × 135 phút trong Hoa Tiêu; phân tích thời gian và so sánh với lần trước. Trang Mock exams cũ vẫn giữ nguyên.")}
        ${row("Phân tích 5 cấp, khuyến nghị, khắc phục", true, "Cấp LOS dùng thẻ kỹ năng theo module (chưa có mã LOS chính thức).")}
        ${row("Kế hoạch ngày / tuần / tháng / toàn kỳ, phiên bản, in, lịch .ics, .csv", true, "Liên kết tới bài học, bài làm và set Question Bank có thật.")}
        ${row("CFA Tutor", "partial", "Dùng Tutor có sẵn (cần khóa của bạn trong Tutor). Đọc bản tóm tắt do Hoa Tiêu gửi; không sửa tiến độ.")}
        ${row("API ngân hàng câu hỏi ngoài, PostgreSQL, phân quyền server-side, audit log, rate limit", false, "Cần backend. Xem trang Ngân hàng câu hỏi.")}
        ${row("Trang quản trị, thống kê tổng hợp nhiều người dùng", false, "Cần backend và vai trò người dùng.")}
        ${row("Đồng bộ nhiều thiết bị", false, "Dùng xuất / nhập sao lưu của website (Settings).")}</tbody></table></div></section>
      <section class="card section"><div class="card-head"><h2>Dữ liệu Hoa Tiêu của bạn</h2></div><div class="row-gap"><button class="btn btn-secondary" id="ht-export">${icon("download", 16)} Xuất dữ liệu (JSON)</button><button class="btn btn-soft-danger" id="ht-wipe">${icon("trash", 16)} Xóa dữ liệu Hoa Tiêu</button></div>
        <p class="text-3 small">Chỉ xóa hồ sơ, bài làm trong Hoa Tiêu, kế hoạch (mọi phiên bản) và lịch ôn. Tiến độ khác của website giữ nguyên. Dữ liệu Hoa Tiêu hiện chiếm khoảng ${Math.round(JSON.stringify(DATA.coach || {}).length / 1024)} KB.</p></section>`;
    document.getElementById("ht-export").onclick = () => downloadFile(`hoa-tieu-${today()}.json`, JSON.stringify({ app: "cfa-study-coach", version: 2, exportedAt: new Date().toISOString(), profile: activeProfile().name, coach: DATA.coach }, null, 2), "application/json");
    document.getElementById("ht-wipe").onclick = async () => {
      if (!(await confirmDialog({ title: "Xóa dữ liệu Hoa Tiêu?", message: "Hồ sơ học tập, bài làm, kế hoạch (mọi phiên bản) và lịch ôn sẽ bị xóa khỏi tài khoản này. Không thể hoàn tác.", confirmText: "Xóa", danger: true, requireText: "XOA" }))) return;
      delete DATA.coach; HT.save(); toast("Đã xóa dữ liệu Hoa Tiêu"); location.hash = "#/coach";
    };
  }
})();

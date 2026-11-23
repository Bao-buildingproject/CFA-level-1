// ============================================================
// coach/ui.js — Hoa Tiêu · CFA Compass (route #/coach), in the Plan group.
// Pages: dashboard · setup (onboarding) · exam (diagnostic 45/90, module check) · analysis ·
//        plan (today / week / month / whole / versions) · review (spaced repetition) · about (method, status).
// Everything is computed by coach/engine.js from the learner's own data, stored per account in DATA.coach
// (so it follows the account: export, delete and profile isolation are the site's own).
// The CFA Tutor only explains; it never changes progress.
// ============================================================
(function () {
  "use strict";
  const CE = window.CoachEngine;
  const LV = { foundation: 1, application: 2, exam: 3, challenge: 3 };
  const STATUS = [["none", "Chưa từng học"], ["partial", "Đã học một phần"], ["unclear", "Đã học hết nhưng chưa nhớ rõ"], ["solid", "Đã học kỹ"], ["confident", "Tự tin làm bài thi"]];
  const STATUS_LABEL = Object.fromEntries(STATUS);
  const DOW = [["1", "T2"], ["2", "T3"], ["3", "T4"], ["4", "T5"], ["5", "T6"], ["6", "T7"], ["0", "CN"]];
  const BAND = { strong: ["Vững", "success"], developing: ["Đang tiến bộ", "application"], needs: ["Cần cải thiện", "warning"], weak: ["Yếu", "danger"], unknown: ["Chưa đủ bằng chứng", ""] };
  const CONF = { insufficient: "chưa đủ dữ liệu", low: "độ tin cậy thấp", medium: "độ tin cậy vừa", high: "độ tin cậy cao" };
  const PRE_MODULE = { FI: "QM-04", DER: "QM-04", EQ: "QM-04", CI: "QM-04", PM: "QM-05", FSA: "FSA-03", ALT: "QM-04" };   // a foundation module to check first
  const ERR_LABEL = { time: "Quản lý thời gian (bỏ trống / hết giờ)", calc: "Tính toán hoặc nhớ công thức", concept: "Hiểu khái niệm" };
  const UI = { step: 1, timer: null, shownAt: 0, tab: "today", mod: null, topic: null, resultId: null };
  const today = () => todayStr();

  // ---------- data ----------
  let _pool = null;
  function pool() {
    if (_pool) return _pool;
    const rows = CE.normalizePool(STARTER_QUESTIONS);
    const supply = {}; rows.forEach(q => { supply[q.module] = (supply[q.module] || 0) + 1; });
    _pool = { rows, meta: new Map(rows.map(q => [q.id, q])), supply, weights: CE.weightsFromTopics(TOPICS), mods: MODULES.map(m => ({ id: m.id, topic: m.topic, title: m.title })) };
    return _pool;
  }
  const defaults = () => ({ v: 1, profile: null, draft: { step: 1 }, self: { topicStatus: {}, statuses: {}, rating: {} }, attempts: [], session: null, history: [], plan: null, versions: [], learned: {}, confirmed: {}, reviews: {}, log: {}, lastReplan: null });
  function CO() { if (!DATA.coach) DATA.coach = defaults(); return DATA.coach; }
  const save = () => saveData();
  const topicName = id => (topicById(id) || {}).name || id;
  const modTitle = id => (moduleById(id) || {}).title || id;
  const fmtH = min => `${Math.round(min / 6) / 10} giờ`;
  const dmy = s => s ? s.split("-").reverse().join("/") : "";

  function parseBusy(text) {
    const out = [], bad = [];
    String(text || "").split(/[\s,;]+/).filter(Boolean).forEach(tok => {
      const [a, b] = tok.split("..");
      if (!CE.validDate(a) || (b && !CE.validDate(b)) || (b && b < a)) { bad.push(tok); return; }
      for (let d = a; d <= (b || a) && out.length < 800; d = CE.addDays(d, 1)) out.push(d);
    });
    return { dates: out, bad };
  }
  function engineProfile() {
    const p = CO().profile;
    return { examDate: p.examDate, hoursPerDay: p.hoursPerDay, studyDays: p.studyDays.map(Number), busyDates: parseBusy(p.busy).dates, maxSessionMin: p.maxSession, breakMin: p.breakMin };
  }
  // all evidence: the Coach's own sessions + the first attempt at each question in Practice
  function allAttempts() {
    const c = CO(), P = pool(), rows = c.attempts.slice();
    DATA.questions.forEach(q => {
      if (!q.attempts.length || !q.topic) return;
      const a = q.attempts[0], meta = P.meta.get(q.id);
      rows.push({ q: q.id, t: q.topic, m: q.chapter || (meta && meta.module) || null, s: (meta && meta.skill) || q.los || q.chapter, d: (meta && meta.diff) || LV[q.level] || 2,
        ok: !!a.correct, pick: a.picked, sec: 0, est: null, calc: false, ts: a.date, src: "practice" });
    });
    return rows;
  }
  function analysis() { return CE.analyze(allAttempts(), { weights: pool().weights, selfRatings: CO().self.rating, topicIds: TOPICS.map(t => t.id) }); }
  function state(an) { const c = CO(), P = pool(); return { modules: P.mods, weights: P.weights, analysis: an || analysis(), statuses: c.self.statuses, topicStatus: c.self.topicStatus, learned: c.learned, confirmed: c.confirmed, reviews: c.reviews, supply: P.supply, done: {} }; }

  // ---------- plan lifecycle ----------
  function newPlan(reason) {
    const c = CO(), st = state(), prev = c.plan;
    let plan, extra = null;
    if (prev && !prev.error && prev.days) { const r = CE.replan(engineProfile(), st, today(), prev, c.log, reason); plan = r.plan; extra = r.adherence; }
    else plan = CE.buildPlan(engineProfile(), st, today());
    if (plan.error) { toast(plan.error, "error"); return plan; }
    // keep what was already done today
    if (prev && prev.days) { const t0 = prev.days.find(d => d.date === today()); if (t0 && plan.days[0]) { const keep = t0.tasks.filter(t => t.status !== "todo"); plan.days[0].tasks = keep.concat(plan.days[0].tasks.filter(t => !keep.some(k => k.module && k.module === t.module && k.type === t.type))); } }
    c.versions = CE.pushVersion(c.versions, plan, reason, today());
    c.plan = plan; c.lastReplan = today(); save();
    return Object.assign(plan, { _adherence: extra });
  }
  function missedTasks() {
    const p = CO().plan; if (!p || !p.days) return [];
    return p.days.filter(d => d.date < today()).flatMap(d => d.tasks.filter(t => t.status === "todo"));
  }
  const logMinutes = (min, date) => { const c = CO(); date = date || today(); c.log[date] = (c.log[date] || 0) + min; };

  // ---------- small UI parts ----------
  const chip = (txt, cls) => `<span class="badge ${cls ? "badge-" + cls : ""}">${esc(txt)}</span>`;
  const bandChip = b => chip(BAND[b][0], BAND[b][1]);
  function subnav(active) {
    const items = [["", "Tổng quan", "home"], ["exam", "Chẩn đoán", "clock"], ["plan", "Kế hoạch", "calendar"], ["analysis", "Phân tích", "pulse"], ["review", "Ôn ngắt quãng", "cards"], ["about", "Phương pháp", "book"]];
    return `<nav class="co-subnav" aria-label="Hoa Tiêu">${items.map(([r, l, ic]) => `<a href="#/coach${r ? "/" + r : ""}" class="${active === r ? "active" : ""}">${icon(ic, 16)}<span>${l}</span></a>`).join("")}</nav>`;
  }
  function bars(rows) {   // [{label, pct, text, tone}]
    return rows.map(r => `<div class="bar-row"><span>${esc(r.label)}</span>${progressBar(r.pct, r.tone || "")}<span class="num">${esc(r.text)}</span></div>`).join("");
  }
  function radar(values) {   // [{label, v 0..1}] → svg
    const n = values.length, R = 92, cx = 130, cy = 120, pt = (i, r) => [cx + r * Math.sin(2 * Math.PI * i / n), cy - r * Math.cos(2 * Math.PI * i / n)];
    const ring = f => values.map((_, i) => pt(i, R * f).join(",")).join(" ");
    const poly = values.map((x, i) => pt(i, R * Math.max(0.04, x.v)).join(",")).join(" ");
    return `<svg class="co-radar" viewBox="0 0 260 240" role="img" aria-label="Biểu đồ mức nắm vững theo topic">
      ${[0.25, 0.5, 0.75, 1].map(f => `<polygon points="${ring(f)}" fill="none" stroke="currentColor" stroke-opacity="${f === 1 ? 0.28 : 0.12}"/>`).join("")}
      ${values.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="currentColor" stroke-opacity="0.1"/>`).join("")}
      <polygon points="${poly}" class="co-radar-fill"/>
      ${values.map((x, i) => { const [px, py] = pt(i, R + 14); return `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" font-size="9.5" fill="currentColor" opacity="0.75">${esc(x.label)}</text>`; }).join("")}
    </svg>`;
  }
  function historyBars() {
    const c = CO(), days = []; for (let i = 13; i >= 0; i--) days.push(CE.addDays(today(), -i));
    const max = Math.max(60, ...days.map(d => c.log[d] || 0));
    return `<div class="co-hist" role="img" aria-label="Số phút học 14 ngày gần nhất">${days.map(d => { const m = c.log[d] || 0; return `<div class="co-hist-col" title="${dmy(d)}: ${m} phút"><i style="height:${Math.round(m / max * 100)}%"></i><span>${d.slice(8)}</span></div>`; }).join("")}</div>`;
  }

  // ---------- recommendations ----------
  function recommendations(an, limit) {
    const c = CO(), P = pool(), st = state(an), pri = CE.priorities(P.mods, st, today(), c.profile.examDate).sort((a, b) => b.score - a.score);
    const out = [], usedTopics = {};
    for (const m of pri) {
      if ((usedTopics[m.topic] || 0) >= 1 && out.length < limit - 1) continue;
      usedTopics[m.topic] = (usedTopics[m.topic] || 0) + 1;
      const mo = an.modules[m.id], tp = an.topics[m.topic], have = P.supply[m.id] || 0;
      const sk = an.weakSkills.filter(w => w.module === m.id)[0];
      const evidence = mo && mo.n ? `${mo.k}/${mo.n} câu đúng ở module này${mo.n < 4 ? " — tín hiệu sơ bộ, chưa đủ để kết luận" : ""}` : tp && tp.n ? `${tp.k}/${tp.n} câu đúng ở topic ${m.topic}; chưa có đủ câu hỏi riêng cho module này` : `Chưa có kết quả bài làm; ước tính từ tự đánh giá "${STATUS_LABEL[m.status]}"`;
      const pre = PRE_MODULE[m.topic] && PRE_MODULE[m.topic] !== m.id && (CE.moduleKnowledge(P.mods.find(x => x.id === PRE_MODULE[m.topic]), st).k < 0.6) ? PRE_MODULE[m.topic] : null;
      const mins = Math.min(120, Math.ceil(CE.CONFIG.moduleMinutes * (1 - m.k)));
      out.push({ module: m.id, topic: m.topic, title: m.title, score: m.score, evidence, skill: sk && sk.skill, prereq: pre, have, k: m.k, mins,
        reason: `Điểm ưu tiên ${Math.round(m.score * 100)}/100: lỗ hổng ${Math.round(m.gap * 100)}%, tỷ trọng đề ${Math.round(m.exam * 100)}%, nguy cơ quên ${Math.round(m.forget * 100)}%, nền tảng ${Math.round(m.prereq * 100)}%, khẩn cấp ${Math.round(m.urgency * 100)}%.` });
      if (out.length >= limit) break;
    }
    return out;
  }
  function recoHtml(r, i) {
    return `<article class="co-reco card">
      <div class="row-between"><strong>Ưu tiên ${i + 1}: ${esc(r.title)}</strong>${chip(r.topic)}</div>
      <p class="text-2 small" style="margin:6px 0"><b>Bằng chứng:</b> ${esc(r.evidence)}.${r.skill ? ` Kỹ năng yếu nhất: <i>${esc(r.skill)}</i>.` : ""}</p>
      ${r.prereq ? `<p class="text-2 small" style="margin:6px 0"><b>Có thể thiếu nền tảng:</b> <a href="#/module/${r.prereq}">${esc(modTitle(r.prereq))}</a> (kiến thức này chưa vững nên học trước).</p>` : ""}
      <p class="text-3 small" style="margin:6px 0">${esc(r.reason)}</p>
      <ol class="co-steps small">
        <li>Học lại nội dung: <a href="#/module/${r.module}">${esc(r.title)}</a> (~${r.mins} phút)</li>
        <li>${r.have ? `<a href="#/coach/exam/check/${r.module}">Làm bài kiểm tra nhanh ${Math.min(5, r.have)} câu</a> để đo lại` : `<span class="text-3">Resource not available — chưa có câu hỏi cho module này, nhờ chủ tài khoản bổ sung</span>`}</li>
        <li>${r.have > 5 ? `<button class="linklike" data-co-practice="${r.module}">Luyện thêm ${Math.min(10, r.have)} câu mới</button>` : "Luyện thêm khi có thêm câu hỏi"}</li>
      </ol>
      <p class="text-3 small" style="margin:6px 0"><b>Tiêu chí thành công:</b> đạt ≥ 80% (có tính trọng số độ khó) trên ≥ 10 câu chưa làm — dùng bài kiểm tra xác nhận của topic.</p>
    </article>`;
  }

  // ---------- routing ----------
  window.coachStop = function () { if (UI.timer) { clearInterval(UI.timer); UI.timer = null; } };
  window.renderCoach = function (sub, a, b) {
    coachStop();
    const c = CO();
    if (!c.profile || sub === "setup") return renderSetup();
    document.body.classList.add("co-page");
    const pages = { "": dashboard, exam: () => examPage(a, b), plan: planPage, analysis: analysisPage, review: reviewPage, about: aboutPage, result: () => resultPage(a) };
    (pages[sub || ""] || dashboard)();
  };

  // ======================= setup (onboarding) =======================
  function setupDefaults() {
    const prof = activeProfile();
    return { displayName: prof.name || "", level: "I", year: CURRICULUM_YEAR, examDate: DATA.settings.examDate || "", goal: "pass", lang: "vi", finLevel: "some", tookBefore: "no",
      hoursPerDay: 3, studyDays: ["1", "2", "3", "4", "5", "6", "0"], busy: "", slot: "evening", maxSession: 90, breakMin: 10, assess: "hybrid" };
  }
  function renderSetup() {
    const c = CO(); document.body.classList.add("co-page");
    const d = c.draft = Object.assign(setupDefaults(), c.profile || {}, c.draft || {});
    const step = UI.step = Math.min(4, Math.max(1, UI.step || 1));
    const titles = ["Thông tin cá nhân", "Thời gian học", "Kiến thức đã học", "Cách đánh giá đầu vào"];
    const sel = (name, opts, cur) => `<select class="select" name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    let body = "";
    if (step === 1) body = `<div class="form-grid">
      <label class="field"><span class="field-label">Tên hiển thị</span><input class="input" name="displayName" value="${esc(d.displayName)}" maxlength="40"></label>
      <label class="field"><span class="field-label">Cấp CFA đang học</span><select class="select" name="level" disabled><option>Level I</option></select><span class="text-3 small">Hiện chỉ hỗ trợ Level I.</span></label>
      <label class="field"><span class="field-label">Năm curriculum</span><select class="select" name="year" disabled><option>${CURRICULUM_YEAR}</option></select><span class="text-3 small">Dữ liệu module theo phiên bản ${CURRICULUM_YEAR} của website.</span></label>
      <label class="field"><span class="field-label">Ngày dự thi dự kiến</span><input class="input" type="date" name="examDate" value="${esc(d.examDate)}"><span class="field-error" id="co-err-exam"></span></label>
      <label class="field"><span class="field-label">Mục tiêu</span>${sel("goal", [["pass", "Đỗ ngay lần này"], ["score", "Đạt điểm cao (vượt MPS rõ rệt)"], ["review", "Ôn lại sau khi đã học"], ["other", "Khác"]], d.goal)}</label>
      <label class="field"><span class="field-label">Ngôn ngữ học tập</span>${sel("lang", [["vi", "Tiếng Việt"], ["en", "English"], ["both", "Song ngữ"]], d.lang)}<span class="text-3 small">Dùng cho phần giải thích của CFA Tutor; giao diện và câu hỏi giữ nguyên.</span></label>
      <label class="field"><span class="field-label">Trình độ tài chính hiện tại</span>${sel("finLevel", [["none", "Mới bắt đầu"], ["some", "Có nền tảng cơ bản"], ["good", "Làm việc trong tài chính / kinh tế"]], d.finLevel)}</label>
      <label class="field"><span class="field-label">Đã thi CFA trước đây?</span>${sel("tookBefore", [["no", "Chưa"], ["yes", "Đã thi (chưa đỗ)"], ["passed", "Đã đỗ cấp khác"]], d.tookBefore)}</label></div>`;
    if (step === 2) body = `<div class="form-grid">
      <label class="field"><span class="field-label">Số giờ học mỗi ngày</span><input class="input" type="number" name="hoursPerDay" min="0.5" max="12" step="0.5" value="${d.hoursPerDay}"><span class="field-error" id="co-err-hours"></span></label>
      <label class="field"><span class="field-label">Khung giờ ưa thích</span>${sel("slot", [["morning", "Buổi sáng"], ["afternoon", "Buổi chiều"], ["evening", "Buổi tối"], ["flex", "Linh hoạt"]], d.slot)}</label>
      <label class="field"><span class="field-label">Thời lượng tối đa mỗi phiên</span>${sel("maxSession", [["45", "45 phút"], ["60", "60 phút"], ["90", "90 phút"], ["120", "120 phút"], ["180", "180 phút"]], d.maxSession)}</label>
      <label class="field"><span class="field-label">Nghỉ giữa các phiên</span>${sel("breakMin", [["5", "5 phút"], ["10", "10 phút"], ["15", "15 phút"], ["30", "30 phút"]], d.breakMin)}</label>
      <div class="field full"><span class="field-label">Những ngày có thể học</span><div class="co-dows">${DOW.map(([v, l]) => `<label class="check-chip"><input type="checkbox" name="studyDays" value="${v}" ${d.studyDays.includes(v) ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
      <label class="field full"><span class="field-label">Ngày bận / ngày nghỉ / sự kiện cá nhân</span><textarea class="input" name="busy" rows="2" placeholder="2027-01-20..2027-02-02, 2026-12-25">${esc(d.busy)}</textarea><span class="text-3 small">Định dạng YYYY-MM-DD; khoảng ngày viết YYYY-MM-DD..YYYY-MM-DD; cách nhau bằng dấu phẩy.</span><span class="field-error" id="co-err-busy"></span></label></div>
      <p class="text-3 small">Hai tài khoản có giờ học và ngày thi khác nhau sẽ nhận lịch khác nhau. Kế hoạch không bao giờ xếp quá số giờ bạn khai.</p>`;
    if (step === 3) {
      const rating = c.self.rating, ts = c.self.topicStatus, ms = c.self.statuses;
      body = `<p class="text-2">Đánh dấu mức độ đã học. <b>Đây chỉ là thông tin chủ quan</b>: hệ thống dùng nó làm ước tính ban đầu có trọng số thấp và sẽ điều chỉnh theo kết quả bài làm thật; tự nhận giỏi không đồng nghĩa với thành thạo.</p>
      <div class="co-topics">${TOPICS.map(t => `<div class="co-topic"><div class="row-between"><strong>${esc(t.name)}</strong><span class="text-3 small">${t.weight}</span></div>
        <div class="co-topic-row"><select class="select" data-co-tstatus="${t.id}">${STATUS.map(([v, l]) => `<option value="${v}" ${(ts[t.id] || "none") === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="co-rate">Tự tin <select class="select" data-co-rating="${t.id}">${[1, 2, 3, 4, 5].map(n => `<option ${((rating[t.id]) || 3) === n ? "selected" : ""}>${n}</option>`).join("")}</select> / 5</label></div>
        <details class="co-det"><summary>Chọn chi tiết từng module (${modulesOf(t.id).length})</summary>
          ${modulesOf(t.id).map(m => `<div class="co-modrow"><span>${m.n}. ${esc(m.title)}</span><select class="select" data-co-mstatus="${m.id}"><option value="">Theo topic</option>${STATUS.map(([v, l]) => `<option value="${v}" ${ms[m.id] === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("")}</details></div>`).join("")}</div>`;
    }
    if (step === 4) {
      const hrs = +d.hoursPerDay || 0, rec = hrs >= 2 ? "hybrid" : "self";
      const opts = [["self", "A. Tự đánh giá", "Nhanh nhất, nhưng kế hoạch dựa hoàn toàn vào cảm nhận của bạn (độ chính xác thấp nhất)."], ["quick", "B. Chẩn đoán nhanh · 45 phút", "30 câu, đủ 10 topic, cho bức tranh sơ bộ."], ["full", "C. Chẩn đoán toàn diện · 90 phút", "60 câu, phủ rộng hơn, ước lượng đáng tin hơn."], ["hybrid", "D. Kết hợp (khuyến nghị nếu có đủ thời gian)", "Dùng tự đánh giá làm ước tính ban đầu, rồi làm bài 45 phút để hiệu chỉnh."]];
      body = `<div class="co-assess">${opts.map(([v, t, s]) => `<label class="co-assess-card ${d.assess === v ? "on" : ""}"><input type="radio" name="assess" value="${v}" ${d.assess === v ? "checked" : ""}><b>${t}${v === rec ? " · khuyến nghị cho bạn" : ""}</b><small>${s}</small></label>`).join("")}</div>
      <p class="text-3 small">Các bài chẩn đoán là bài kiểm tra nội bộ của website, không phải bài thi CFA chính thức. Bạn luôn có thể làm thêm sau.</p>`;
    }
    view.innerHTML = `${pageHeader("Thiết lập hồ sơ học tập", `Bước ${step}/4 · ${titles[step - 1]}`, "", "Hoa Tiêu · CFA Compass")}
      <div class="co-steps-bar">${titles.map((t, i) => `<span class="${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}">${i + 1}. ${t}</span>`).join("")}</div>
      <form class="card section" id="co-form" novalidate>${body}
        <div class="form-actions" style="justify-content:space-between">
          <button type="button" class="btn btn-secondary" id="co-back" ${step === 1 ? "disabled" : ""}>${icon("prev", 16)} Quay lại</button>
          <button type="submit" class="btn btn-primary">${step === 4 ? "Hoàn tất và tạo kế hoạch" : "Tiếp tục"} ${icon("next", 16)}</button></div></form>`;
    const form = document.getElementById("co-form");
    const read = () => {
      const f = new FormData(form);
      if (step === 1) ["displayName", "examDate", "goal", "lang", "finLevel", "tookBefore"].forEach(k => { d[k] = String(f.get(k) || "").trim(); });
      if (step === 2) { d.hoursPerDay = +f.get("hoursPerDay"); d.slot = f.get("slot"); d.maxSession = +f.get("maxSession"); d.breakMin = +f.get("breakMin"); d.studyDays = f.getAll("studyDays"); d.busy = String(f.get("busy") || ""); }
      if (step === 4) d.assess = f.get("assess") || d.assess;
    };
    view.querySelectorAll("[data-co-tstatus]").forEach(s => s.onchange = () => { c.self.topicStatus[s.dataset.coTstatus] = s.value; save(); });
    view.querySelectorAll("[data-co-rating]").forEach(s => s.onchange = () => { c.self.rating[s.dataset.coRating] = +s.value; save(); });
    view.querySelectorAll("[data-co-mstatus]").forEach(s => s.onchange = () => { if (s.value) c.self.statuses[s.dataset.coMstatus] = s.value; else delete c.self.statuses[s.dataset.coMstatus]; save(); });
    view.querySelectorAll(".co-assess-card input").forEach(r => r.onchange = () => { read(); save(); renderSetup(); });
    document.getElementById("co-back").onclick = () => { read(); save(); UI.step = step - 1; renderSetup(); };
    form.onsubmit = e => {
      e.preventDefault(); read();
      if (step === 1) {
        if (!d.displayName) d.displayName = activeProfile().name;
        const err = document.getElementById("co-err-exam");
        if (!CE.validDate(d.examDate)) { err.textContent = "Chọn một ngày thi hợp lệ."; return; }
        if (CE.daysBetween(today(), d.examDate) < 7) { err.textContent = "Ngày thi phải cách hôm nay ít nhất 7 ngày để lập kế hoạch có ý nghĩa."; return; }
      }
      if (step === 2) {
        const eh = document.getElementById("co-err-hours"), eb = document.getElementById("co-err-busy");
        if (!(d.hoursPerDay >= 0.5 && d.hoursPerDay <= 12)) { eh.textContent = "Nhập từ 0,5 đến 12 giờ."; return; }
        if (!d.studyDays.length) { eh.textContent = "Chọn ít nhất một ngày có thể học."; return; }
        const pb = parseBusy(d.busy); if (pb.bad.length) { eb.textContent = "Không đọc được: " + pb.bad.slice(0, 3).join(", "); return; }
      }
      save();
      if (step < 4) { UI.step = step + 1; return renderSetup(); }
      c.profile = Object.assign({}, d); c.draft = { step: 1 }; DATA.settings.examDate = d.examDate; UI.step = 1;
      const p = newPlan("setup");
      toast(p && !p.error ? (d.assess === "self" ? "Đã tạo kế hoạch từ tự đánh giá" : "Đã tạo kế hoạch tạm thời — làm bài chẩn đoán để hiệu chỉnh") : "Không tạo được kế hoạch", p && p.error ? "error" : "success");
      location.hash = d.assess === "quick" || d.assess === "hybrid" ? "#/coach/exam/start/quick45" : d.assess === "full" ? "#/coach/exam/start/full90" : "#/coach";
    };
  }

  // ======================= dashboard =======================
  function dashboard() {
    const c = CO(), P = pool(), an = analysis(), p = c.profile, plan = c.plan;
    const left = CE.daysBetween(today(), p.examDate), rd = CE.readiness(an, P.weights, c.self.rating);
    const planned = plan && plan.days ? plan.days.reduce((s, d) => s + d.tasks.reduce((x, t) => x + t.min, 0), 0) : 0;
    const doneMin = Object.values(c.log).reduce((s, x) => s + x, 0);
    const todayDay = plan && plan.days && plan.days.find(d => d.date === today());
    const reco = recommendations(an, 4);
    const missed = missedTasks();
    const learnedBy = t => { const ms = modulesOf(t); return Math.round(100 * ms.filter(m => c.learned[m.id]).length / ms.length); };
    const rows = TOPICS.map(t => { const a = an.topics[t.id]; return { label: t.id + " · " + t.name.replace(/ and /g, " & "), pct: a.n >= CE.CONFIG.evidence.insufficient ? Math.round(a.wAcc * 100) : 0, text: a.n ? `${Math.round(a.acc * 100)}% · ${a.n} câu` : "chưa có", tone: a.band === "weak" ? "danger" : a.band === "needs" ? "warning" : "" }; });
    const pending = c.session && !c.session.submittedAt;
    view.innerHTML = `${pageHeader(`Chào ${esc(p.displayName || activeProfile().name)}`, "Hoa Tiêu đo năng lực bằng bài làm thật và điều chỉnh lộ trình riêng cho tài khoản này.", `<a class="btn btn-secondary" href="#/coach/setup">${icon("settings", 16)} Sửa hồ sơ</a>`, "Hoa Tiêu · CFA Compass")}
      ${subnav("")}
      ${pending ? `<div class="callout"><b>Bạn có bài thi đang làm dở.</b> <a href="#/coach/exam/run">Tiếp tục</a></div>` : ""}
      ${missed.length ? `<div class="callout warn">${icon("alert", 16)} Có ${missed.length} nhiệm vụ trễ. Chúng <b>không</b> được đánh dấu hoàn thành và không ảnh hưởng điểm năng lực. <button class="btn btn-sm btn-secondary" id="co-replan">Lập lại lịch</button></div>` : ""}
      <div class="grid grid-stats">
        <div class="card stat"><div class="stat-icon">${icon("calendar", 18)}</div><span class="stat-label">Đếm ngược kỳ thi</span><span class="stat-value">${left >= 0 ? left : 0}<small> ngày</small></span><span class="stat-hint">${dmy(p.examDate)} · ${plan && plan.capacity ? fmtH(plan.capacity) + " khả dụng" : "chưa có kế hoạch"}</span></div>
        <div class="card stat"><div class="stat-icon accent">${icon("clock", 18)}</div><span class="stat-label">Giờ học</span><span class="stat-value">${fmtH(doneMin)}</span><span class="stat-hint">đã ghi nhận · ${fmtH(planned)} đã xếp lịch</span></div>
        <div class="card stat"><div class="stat-icon warning">${icon("target", 18)}</div><span class="stat-label">Số câu đã làm</span><span class="stat-value">${an.evidenceTotal}</span><span class="stat-hint">${an.total.n ? `${Math.round(an.total.acc * 100)}% đúng (lần đầu)` : "chưa có bài làm"}</span></div>
        <div class="card stat"><div class="stat-icon danger">${icon("pulse", 18)}</div><span class="stat-label">Độ sẵn sàng (nội bộ)</span><span class="stat-value">${rd.enough ? rd.value + "%" : "—"}</span><span class="stat-hint">${esc(rd.label)}${rd.enough ? ` · khoảng ${rd.low}–${rd.high}%` : ""}</span></div>
      </div>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Kế hoạch hôm nay</h2><a class="card-link" href="#/coach/plan">Xem lịch</a></div>${todayHtml(todayDay)}</section>
        <section class="card"><div class="card-head"><h2>Độ sẵn sàng</h2></div>
          <div class="co-ready">${progressRing(rd.enough ? rd.value : 0, 112, 10, rd.enough ? "nội bộ" : "chưa đủ")}<div><p class="text-2 small" style="margin:0 0 6px">${rd.enough ? `Ước tính <b>${rd.value}%</b>, khoảng tin cậy 90%: ${rd.low}–${rd.high}%. ` : `Mới có ${rd.covered}/${rd.topics} topic đủ dữ liệu và ${an.evidenceTotal} câu: chưa đủ để đưa ra con số. `}</p>
          <p class="text-3 small" style="margin:0">${esc(rd.note)}</p></div></div>
          ${!rd.enough ? `<a class="btn btn-primary btn-sm" href="#/coach/exam" style="margin-top:12px">Làm bài chẩn đoán</a>` : ""}</section>
      </div>
      <div class="grid grid-2 section">
        <section class="card"><div class="card-head"><h2>Hiệu quả theo topic</h2><a class="card-link" href="#/coach/analysis">Chi tiết</a></div>${bars(rows)}
          <p class="text-3 small">Thanh = độ chính xác có trọng số độ khó; chỉ hiện khi có ≥ ${CE.CONFIG.evidence.insufficient} câu. Hoàn thành giáo trình (đã học và được xác nhận): ${TOPICS.map(t => `${t.id} ${learnedBy(t.id)}%`).join(" · ")}.</p></section>
        <section class="card"><div class="card-head"><h2>Radar mức nắm vững</h2></div>${radar(TOPICS.map(t => ({ label: t.id, v: an.topics[t.id].n >= CE.CONFIG.evidence.insufficient ? an.topics[t.id].mastery : 0 })))}
          <p class="text-3 small">Chỉ vẽ topic có đủ bằng chứng; điểm 0 nghĩa là chưa đo được, không phải bằng 0.</p></section>
      </div>
      <section class="card section"><div class="card-head"><h2>Nhiệm vụ ưu tiên (AI + quy tắc)</h2><button class="btn btn-sm btn-secondary" id="co-ask">${icon("chat", 14)} Hỏi CFA Tutor về kế hoạch</button></div>
        <div class="co-recos">${reco.map(recoHtml).join("")}</div></section>
      <section class="card section"><div class="card-head"><h2>Lịch sử học</h2></div>${historyBars()}
        <p class="text-3 small">Số phút học mỗi ngày (14 ngày gần nhất). ${c.history.length ? "Bài chẩn đoán: " + c.history.slice(-5).map(h => `${dmy(h.date)} ${h.k}/${h.n}`).join(" → ") : "Chưa có bài chẩn đoán nào."}</p></section>`;
    bind();
    const rp = document.getElementById("co-replan"); if (rp) rp.onclick = () => { newPlan("missed-days"); toast("Đã lập lại lịch; phiên bản cũ vẫn được lưu"); renderCoach(""); };
    document.getElementById("co-ask").onclick = () => askTutor(an, rd, reco);
  }
  function askTutor(an, rd, reco) {
    if (typeof tutorOpen !== "function" || typeof TUTOR === "undefined") return toast("CFA Tutor chưa sẵn sàng", "error");
    const c = CO(), p = c.profile;
    const text = [`Hoa Tiêu (CFA Level I ${CURRICULUM_YEAR}): hồ sơ học viên — ngày thi ${p.examDate} (còn ${CE.daysBetween(today(), p.examDate)} ngày), ${p.hoursPerDay} giờ/ngày, mục tiêu ${p.goal}.`,
      `Độ sẵn sàng nội bộ: ${rd.enough ? `${rd.value}% (khoảng ${rd.low}–${rd.high}%)` : "chưa đủ dữ liệu"}.`,
      "Kết quả theo topic: " + TOPICS.map(t => { const a = an.topics[t.id]; return `${t.id} ${a.n ? Math.round(a.acc * 100) + "% (" + a.n + " câu, " + CONF[a.confidence] + ")" : "chưa đo"}`; }).join("; ") + ".",
      "Ưu tiên hiện tại: " + reco.map((r, i) => `${i + 1}) ${r.title} [${r.evidence}]`).join(" ") ,
      "Quy tắc: chỉ giải thích; không tự sửa tiến độ hay đánh dấu hoàn thành. Nếu học viên nói đã thành thạo một topic, đề nghị làm bài kiểm tra xác nhận thay vì học lại toàn bộ."].join("\n");
    TUTOR.ctx = { label: "Hoa Tiêu · kế hoạch học tập", text }; tutorOpen();
    if (typeof tutorCfg === "function" && tutorCfg().key && !TUTOR.busy && typeof tutorSend === "function")
      tutorSend("Dựa trên hồ sơ và kết quả đính kèm, giải thích ngắn gọn vì sao kế hoạch ưu tiên các nội dung trên và gợi ý cách điều chỉnh nếu cần. Trả lời bằng tiếng Việt.", TUTOR.ctx);
  }

  // ---------- tasks ----------
  function taskLink(t) {
    if (t.type === "learn") return `#/module/${t.module}`;
    if (t.type === "mock") return "#/mock";
    if (t.link) return t.link;
    return null;
  }
  const TYPE_LABEL = { learn: "Học", practice: "Luyện", review: "Ôn", mock: "Thi thử", confirm: "Xác nhận" };
  function taskHtml(t) {
    const done = t.status !== "todo", link = taskLink(t);
    const st = t.status === "verified" ? chip("Đã xác nhận", "success") : t.status === "reported" ? chip("Tự báo cáo", "warning") : "";
    return `<div class="co-task ${done ? "done" : ""}" data-task="${t.id}">
      <div class="co-task-main"><span class="badge">${TYPE_LABEL[t.type] || t.type}</span><div><strong>${esc(t.title)}</strong><div class="text-3 small">${t.min} phút · ${esc(t.reason || "")}</div></div></div>
      <div class="co-task-act">${st}
        ${!done && t.type === "learn" ? `<a class="btn btn-sm btn-secondary" href="${link}">Bắt đầu</a><a class="btn btn-sm btn-secondary" href="#/coach/exam/check/${t.module}" title="5 câu: xác nhận bạn đã nắm">Kiểm tra 5 câu</a><button class="btn btn-sm btn-ghost" data-co-done="${t.id}" data-how="self">Tôi đã học xong</button>` : ""}
        ${!done && (t.type === "practice") ? `<button class="btn btn-sm btn-secondary" data-co-practice="${t.module}" data-n="${t.n}">Bắt đầu</button><button class="btn btn-sm btn-ghost" data-co-done="${t.id}" data-how="verify">Kiểm tra hoàn thành</button>` : ""}
        ${!done && t.type === "review" && t.module ? `<a class="btn btn-sm btn-secondary" href="#/coach/exam/review/${t.module}">Ôn ${t.n || 5} câu</a>` : ""}
        ${!done && t.type === "review" && !t.module ? `${link ? `<a class="btn btn-sm btn-secondary" href="${link}">Mở</a>` : ""}<button class="btn btn-sm btn-ghost" data-co-done="${t.id}" data-how="self">Đã làm xong</button>` : ""}
        ${!done && t.type === "confirm" ? `<a class="btn btn-sm btn-secondary" href="#/coach/exam/confirm/${t.topic}">Làm bài 10 câu</a>` : ""}
        ${!done && t.type === "mock" ? `<a class="btn btn-sm btn-secondary" href="${link}">Mở Mock exams</a><button class="btn btn-sm btn-ghost" data-co-done="${t.id}" data-how="verify">Kiểm tra hoàn thành</button>` : ""}</div></div>`;
  }
  function todayHtml(day) {
    if (!day || !day.tasks.length) return `<p class="text-2">${day && !day.minutes ? "Hôm nay là ngày nghỉ hoặc ngày bận theo lịch của bạn." : "Chưa có nhiệm vụ cho hôm nay."}</p>`;
    const tot = day.tasks.reduce((s, t) => s + t.min, 0);
    return `<p class="text-3 small">${tot} phút · ${day.sessions.length} phiên (tối đa ${CO().profile.maxSession} phút/phiên, nghỉ ${CO().profile.breakMin} phút giữa các phiên)</p><div class="co-tasks">${day.tasks.map(taskHtml).join("")}</div>`;
  }
  function answeredToday(module) {
    const d = today(), c = CO(), P = pool();
    const mine = c.attempts.filter(a => a.m === module && a.ts === d).map(a => a.q);
    DATA.questions.forEach(q => { if (q.chapter === module) q.attempts.forEach(a => { if (a.date === d) mine.push(q.id); }); });
    return new Set(mine).size;
  }
  function bind() {
    view.querySelectorAll("[data-co-practice]").forEach(b => b.onclick = () => startPractice(b.dataset.coPractice, +b.dataset.n || 10));
    view.querySelectorAll("[data-co-done]").forEach(b => b.onclick = () => completeTask(b.dataset.coDone, b.dataset.how));
  }
  function startPractice(module, n) {
    const list = DATA.questions.filter(q => q.chapter === module);
    if (!list.length) return toast("Resource not available: module này chưa có câu hỏi", "error");
    const fresh = list.filter(q => !q.attempts.length), rest = list.filter(q => q.attempts.length);
    const pick = shuffle(fresh).concat(shuffle(rest)).slice(0, n);
    pick.sort((a, b) => LV[a.level] - LV[b.level]);        // easy to hard
    startQuiz(shuffle(pick.length > 6 ? pick : pick));
  }
  function findTask(id) { const p = CO().plan; if (!p) return null; for (const d of p.days) { const t = d.tasks.find(x => x.id === id); if (t) return t; } return null; }
  function completeTask(id, how) {
    const t = findTask(id); if (!t) return;
    const ev = how === "self" ? { selfReport: true } : { answered: answeredToday(t.module), mockFinished: (DATA.mocks || []).some(m => m.date === today()) };
    const r = CE.completeTask(t, ev);
    if (r.status === "todo") return toast(r.reason || "Chưa có bằng chứng hoàn thành", "error");
    t.status = r.status; t.doneAt = today();
    if (t.type === "learn" && t.module && !CO().learned[t.module]) { CO().learned[t.module] = r.status; if (!CO().reviews[t.module]) CO().reviews[t.module] = CE.startReview(today()); }
    logMinutes(t.min); save(); toast(r.status === "verified" ? "Đã xác nhận hoàn thành" : "Đã ghi nhận bạn tự báo cáo (chưa tính là nắm vững)"); renderCoach(location.hash.split("/")[2] || "");
  }

  // ======================= exam =======================
  const KIND_TXT = { quick45: "Chẩn đoán nhanh · 45 phút · 30 câu", full90: "Chẩn đoán toàn diện · 90 phút · 60 câu", confirm: "Kiểm tra xác nhận thành thạo · 10 câu", check: "Kiểm tra nhanh module · 5 câu", targeted: "Bài luyện theo điểm yếu" };
  function seenIds() { return new Set(allAttempts().map(a => a.q)); }
  function examPage(a, b) {
    const c = CO();
    if (a === "run") return examRun();
    if (a === "start") return examStart(b, null);
    if (a === "check" || a === "review") return examStart(a, b);
    if (a === "confirm") return examStart("confirm", b);
    const pending = c.session && !c.session.submittedAt;
    const hist = c.history.slice().reverse().slice(0, 8);
    view.innerHTML = `${pageHeader("Chẩn đoán năng lực", "Bài kiểm tra nội bộ để đo trình độ từng topic. Không phải bài thi CFA chính thức.", "", "Hoa Tiêu · CFA Compass")}${subnav("exam")}
      ${pending ? `<div class="callout"><b>Bạn có bài thi đang làm dở</b> (${KIND_TXT[c.session.kind] || c.session.kind}). <a class="btn btn-sm btn-primary" href="#/coach/exam/run">Tiếp tục</a></div>` : ""}
      <div class="grid grid-2">
        ${["quick45", "full90"].map(k => `<article class="card"><h3>${KIND_TXT[k]}</h3><p class="text-2 small">${k === "quick45" ? "Mỗi topic có tối thiểu 2 câu, phân bổ theo trọng số 2027; câu dễ, vừa, khó trộn lẫn." : "Phủ rộng hơn, độ khó cân bằng, có cả câu tính toán và lý thuyết."} Trung bình 90 giây mỗi câu. Đáp án không hiện trước khi nộp bài; hết giờ bài tự nộp.</p>
          <a class="btn btn-primary" href="#/coach/exam/start/${k}">Bắt đầu</a></article>`).join("")}
      </div>
      <section class="card section"><div class="card-head"><h2>Xác nhận đã thành thạo một topic</h2></div>
        <p class="text-2 small">Nếu bạn đã học kỹ một topic, làm bài 10 câu để xác nhận. Đạt ≥ 80% (tính trọng số độ khó) thì topic chuyển sang chế độ duy trì và kế hoạch rút ngắn phần học lại — nhưng vẫn giữ thời gian ôn tập.</p>
        <div class="row-gap">${TOPICS.map(t => `<a class="btn btn-sm btn-secondary" href="#/coach/exam/confirm/${t.id}">${t.id}${c.confirmed[t.id] ? " ✓" : ""}</a>`).join("")}</div></section>
      <section class="card section"><div class="card-head"><h2>Các bài đã làm</h2></div>${hist.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Ngày</th><th>Loại</th><th class="num">Đúng</th><th></th></tr></thead><tbody>${hist.map(h => `<tr><td>${dmy(h.date)}</td><td>${esc(KIND_TXT[h.kind] || h.kind)}</td><td class="num">${h.k}/${h.n}${h.expired ? " · hết giờ" : ""}</td><td><a href="#/coach/result/${h.id}">Xem</a></td></tr>`).join("")}</tbody></table></div>` : `<p class="text-2">Chưa có bài nào.</p>`}</section>`;
  }
  function examStart(kind, target) {
    const c = CO(), P = pool();
    if (c.session && !c.session.submittedAt) { toast("Bạn đang có bài làm dở"); return void (location.hash = "#/coach/exam/run"); }
    let ids = [], opts = { seed: `${activeProfile().id}|${today()}|${c.history.length}|${target || ""}`, weights: P.weights, seen: kind === "review" ? [] : seenIds() };
    let k = kind;
    if (kind === "check" || kind === "review") { if (!moduleById(target)) return void (location.hash = "#/coach/exam"); opts.module = target; opts.topic = moduleById(target).topic; opts.n = 5; k = "check"; if (kind === "review") { const recent = new Set(c.attempts.filter(x => CE.daysBetween(x.ts, today()) < 3).map(x => x.q)); opts.seen = [...recent]; } }
    if (kind === "confirm") { if (!topicById(target)) return void (location.hash = "#/coach/exam"); opts.topic = target; opts.n = 10; opts.mix = { 1: 0.2, 2: 0.5, 3: 0.3 }; }
    if (!CE.KINDS[k]) return void (location.hash = "#/coach/exam");
    ids = CE.buildAssessment(P.rows, k, opts);
    if (!ids.length || (kind !== "quick45" && kind !== "full90" && ids.length < Math.min(3, opts.n || 3))) { toast("Resource not available: chưa đủ câu hỏi cho bài này", "error"); return void (location.hash = "#/coach/exam"); }
    const s = CE.newSession(k, ids, Date.now(), "s" + Date.now().toString(36));
    s.meta = { target: target || null, src: kind === "review" ? "review" : k === "check" ? "check" : k }; c.session = s; save();
    UI.shownAt = Date.now(); location.hash = "#/coach/exam/run";
  }
  function spent() { const t = Date.now(), d = Math.max(0, Math.min(300, Math.round((t - UI.shownAt) / 1000))); UI.shownAt = t; return d; }
  function examRun() {
    const c = CO(), s = c.session;
    if (!s) return void (location.hash = "#/coach/exam");
    if (s.submittedAt) return void (location.hash = "#/coach/result/" + s.id);
    if (CE.remainingSec(s, Date.now()) <= 0) return finishExam(true);
    const q = DATA.questions.find(x => x.id === s.ids[s.current]), flagged = !!s.flags[s.ids[s.current]];
    const answered = Object.keys(s.answers).length;
    if (!UI.shownAt) UI.shownAt = Date.now();
    view.innerHTML = `<div class="mock-top"><div><div style="font-weight:600">${esc(KIND_TXT[s.kind] || s.kind)}</div><div class="text-3 small">${answered}/${s.ids.length} đã trả lời · bài nội bộ, không phải đề CFA chính thức</div></div>
        <div class="row-gap"><div class="timer" id="co-timer" role="timer" aria-label="Thời gian còn lại">${icon("clock", 18)}<span></span></div><button class="btn btn-primary" id="co-submit">Nộp bài</button></div></div>
      <div class="mock-layout"><div><div class="card">
        ${q ? `<div class="row-between" style="margin-bottom:12px"><span class="text-2 small" style="font-weight:600">Câu ${s.current + 1}/${s.ids.length}</span>
            <button class="btn btn-ghost btn-sm" id="co-flag" aria-pressed="${flagged}" style="${flagged ? "color:var(--warning)" : ""}">${icon("flag", 16)} ${flagged ? "Đã gắn cờ" : "Gắn cờ xem lại"}</button></div>
          ${questionBodyHtml(q)}${choicesHtml(q, s.answers[q.id] || null, false)}` : `<p>Câu hỏi này không còn trong ngân hàng; sẽ tính là chưa trả lời.</p>`}
        <div class="mock-nav"><button class="btn btn-secondary" id="co-prev" ${s.current === 0 ? "disabled" : ""}>${icon("prev", 18)} Trước</button><button class="btn btn-secondary" id="co-next" ${s.current === s.ids.length - 1 ? "disabled" : ""}>Sau ${icon("next", 18)}</button></div></div>
        <p class="text-3 small hide-mobile" style="margin-top:12px">Phím tắt: <span class="kbd">1</span>–<span class="kbd">3</span> chọn · <span class="kbd">←</span> <span class="kbd">→</span> chuyển câu · <span class="kbd">F</span> gắn cờ. Bài được lưu tự động; tải lại trang vẫn tiếp tục, đồng hồ chạy theo giờ thật.</p></div>
        <aside class="card mock-side" aria-label="Danh sách câu hỏi"><div class="row-between" style="margin-bottom:12px"><h3>Câu hỏi</h3><span class="text-3 small">${Object.values(s.flags).filter(Boolean).length} gắn cờ · ${s.ids.length - answered} chưa trả lời</span></div>
          <div class="palette">${s.ids.map((id, i) => `<button class="pal-btn ${s.answers[id] ? "answered" : ""} ${s.flags[id] ? "flagged" : ""} ${i === s.current ? "current" : ""}" data-go="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join("")}</div></aside></div>`;
    const tick = () => { const left = CE.remainingSec(s, Date.now()), el = document.getElementById("co-timer"); if (!el) return coachStop(); el.querySelector("span").textContent = formatTime(left); el.classList.toggle("warn", left <= 300 && left > 60); el.classList.toggle("danger", left <= 60); if (left <= 0) { coachStop(); finishExam(true); } };
    tick(); UI.timer = setInterval(tick, 1000);
    const go = i => { const sec = spent(); const id = s.ids[s.current]; if (!s.answers[id]) s.secs[id] = (s.secs[id] || 0) + sec; s.current = Math.max(0, Math.min(s.ids.length - 1, i)); save(); examRun(); };
    view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { const r = CE.answer(s, q.id, b.dataset.pick, Date.now(), spent()); if (!r.ok) { toast(r.reason === "expired" ? "Đã hết giờ — không thể sửa đáp án" : "Không ghi được đáp án", "error"); return finishExam(true); } save(); examRun(); });
    view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
    document.getElementById("co-prev").onclick = () => go(s.current - 1); document.getElementById("co-next").onclick = () => go(s.current + 1);
    const fl = document.getElementById("co-flag"); if (fl) fl.onclick = () => { s.flags[q.id] = !s.flags[q.id]; save(); examRun(); };
    document.getElementById("co-submit").onclick = async () => {
      const un = s.ids.length - Object.keys(s.answers).length;
      if (un && !(await confirmDialog({ title: "Nộp bài?", message: `Còn ${un} câu chưa trả lời. Sau khi nộp, bạn không thể sửa đáp án.`, confirmText: "Nộp bài" }))) return;
      finishExam(false);
    };
    window.onkeydown = e => { if (!UI.timer || /input|textarea|select/i.test(e.target.tagName)) return; const k = e.key; if (k === "ArrowRight") go(s.current + 1); else if (k === "ArrowLeft") go(s.current - 1); else if (/^[1-3]$/.test(k) && q) { CE.answer(s, q.id, "ABC"[+k - 1], Date.now(), spent()); save(); examRun(); } else if ((k === "f" || k === "F") && q) { s.flags[q.id] = !s.flags[q.id]; save(); examRun(); } };
  }
  // grade, store the evidence, update reviews, rebuild the plan
  function finishExam(expired) {
    coachStop(); window.onkeydown = null;
    const c = CO(), s = c.session; if (!s || s.submittedAt) return void (location.hash = "#/coach/exam");
    const id = s.ids[s.current]; if (!s.answers[id] && !expired) s.secs[id] = (s.secs[id] || 0) + spent();
    CE.submit(s, Date.now());
    const P = pool(), byId = {}; s.ids.forEach(i => { const m = P.meta.get(i), q = DATA.questions.find(x => x.id === i); if (m && q) byId[i] = { ...m, ans: q.answer }; });
    const rows = CE.attemptsFromSession(s, byId, today(), s.meta && s.meta.src || s.kind);
    c.attempts.push(...rows);
    // mirror into the site's own question records so Weak spots and the mistake log stay consistent
    rows.forEach(r => { if (r.ok !== null) { const q = DATA.questions.find(x => x.id === r.q); if (q) { q.attempts.push({ date: today(), picked: r.pick, correct: r.ok }); if (r.ok) { q.correctStreak++; if (q.inMistakeLog && q.correctStreak >= 2) q.inMistakeLog = false; } else { q.correctStreak = 0; q.inMistakeLog = true; } const log = DATA.dailyLog[today()] || (DATA.dailyLog[today()] = {}); log.questionsDone = (log.questionsDone || 0) + 1; log.questionsRight = (log.questionsRight || 0) + (r.ok ? 1 : 0); } } });
    const k = rows.filter(r => r.ok).length, n = rows.length;
    const spentMin = Math.max(1, Math.round(rows.reduce((x, r) => x + r.sec, 0) / 60)); logMinutes(spentMin);
    const rec = { id: s.id, date: today(), kind: s.kind, src: s.meta && s.meta.src, target: s.meta && s.meta.target, n, k, expired: !!s.expired, secs: s.secs };
    // per-module reviews
    const byMod = {}; rows.forEach(r => { if (r.m) (byMod[r.m] = byMod[r.m] || []).push(r); });
    Object.keys(byMod).forEach(m => { const rr = byMod[m]; if (rr.length >= 2) { const ratio = rr.filter(x => x.ok).length / rr.length; c.reviews[m] = c.reviews[m] ? CE.recordReview(c.reviews[m], ratio, rr.length, today()) : CE.recordReview(CE.startReview(today()), ratio, rr.length, today()); } });
    // learn-task checks and topic confirmation
    if (s.meta && s.meta.src === "check" && s.meta.target && rows.length >= 3) {
      const ok = rows.filter(r => r.ok).length / rows.length;
      c.learned[s.meta.target] = ok >= 0.6 ? "verified" : (c.learned[s.meta.target] || "reported");
      const t = c.plan && c.plan.days.flatMap(d => d.tasks).find(x => x.type === "learn" && x.module === s.meta.target && x.status === "todo");
      if (t && ok >= 0.6) { t.status = "verified"; t.doneAt = today(); logMinutes(t.min); }
      rec.checkOk = ok >= 0.6;
    }
    if (s.kind === "confirm") {
      const ev = CE.evaluateConfirm(rows); rec.confirm = ev.passed; if (ev.passed) c.confirmed[s.meta.target] = true;
      const ct = c.plan && c.plan.days.flatMap(d => d.tasks).find(x => x.type === "confirm" && x.topic === s.meta.target && x.status === "todo");
      if (ct) { ct.status = "verified"; ct.doneAt = today(); logMinutes(ct.min); }
    }
    c.history.push(rec); c.session = null; save();
    if (["quick45", "full90", "confirm", "check"].includes(s.kind) || s.kind === "review") { const p = newPlan(s.kind === "quick45" || s.kind === "full90" ? "assessment" : "progress"); rec.planV = p && p.error ? null : c.versions.length; save(); }
    UI.resultId = s.id; location.hash = "#/coach/result/" + s.id;
  }
  function resultPage(id) {
    const c = CO(), rec = c.history.find(h => h.id === id);
    if (!rec) return void (location.hash = "#/coach/exam");
    const P = pool(), rows = c.attempts.filter(a => a.sess === id);
    const t = CE.tally(rows, null), expl = DATA.questions;
    const byTopic = TOPICS.map(tp => ({ tp, r: CE.tally(rows.filter(x => x.t === tp.id), null) })).filter(x => x.r.n);
    view.innerHTML = `${pageHeader("Kết quả", `${KIND_TXT[rec.kind] || rec.kind} · ${dmy(rec.date)}${rec.expired ? " · tự nộp khi hết giờ" : ""}`, `<a class="btn btn-secondary" href="#/coach/exam">Quay lại</a>`, "Hoa Tiêu · CFA Compass")}${subnav("exam")}
      <div class="grid grid-stats"><div class="card stat"><span class="stat-label">Đúng</span><span class="stat-value">${rec.k}/${rec.n}</span><span class="stat-hint">${rec.n ? Math.round(100 * rec.k / rec.n) : 0}% · có trọng số độ khó ${t.wAcc == null ? "—" : Math.round(t.wAcc * 100) + "%"}</span></div>
        <div class="card stat"><span class="stat-label">Chưa trả lời</span><span class="stat-value">${rows.filter(r => r.ok === null).length}</span></div>
        <div class="card stat"><span class="stat-label">Thời gian TB/câu</span><span class="stat-value">${rows.length ? Math.round(rows.reduce((s, r) => s + r.sec, 0) / rows.length) : 0}s</span><span class="stat-hint">ước tính ${Math.round(rows.reduce((s, r) => s + (r.est || 0), 0) / Math.max(1, rows.length))}s</span></div>
        <div class="card stat"><span class="stat-label">Kế hoạch</span><span class="stat-value">v${rec.planV || c.versions.length}</span><span class="stat-hint">đã cập nhật theo kết quả này</span></div></div>
      ${rec.kind === "confirm" ? `<div class="callout ${rec.confirm ? "" : "warn"}">${rec.confirm ? "Đã xác nhận thành thạo: topic chuyển sang chế độ duy trì, kế hoạch rút ngắn phần học lại." : "Chưa đạt ngưỡng xác nhận (≥ 10 câu, ≥ 80% có trọng số độ khó). Kế hoạch giữ nguyên phần học cho topic này."}</div>` : ""}
      ${rec.checkOk != null ? `<div class="callout ${rec.checkOk ? "" : "warn"}">${rec.checkOk ? "Bài kiểm tra nhanh đạt: nhiệm vụ học module được xác nhận." : "Chưa đạt: module vẫn cần học thêm (không bị tính là hoàn thành)."}</div>` : ""}
      <section class="card section"><div class="card-head"><h2>Theo topic</h2></div>${byTopic.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Đúng</th><th>Nhận định</th></tr></thead><tbody>${byTopic.map(({ tp, r }) => `<tr><td>${esc(tp.name)}</td><td class="num">${r.k}/${r.n}</td><td>${r.n < CE.CONFIG.evidence.insufficient ? `${chip("Chưa đủ bằng chứng")} <span class="text-3 small">chỉ ${r.n} câu trong bài này</span>` : bandChip(r.band)}</td></tr>`).join("")}</tbody></table></div>` : ""}
        <p class="text-3 small">Nhận định chính thức theo topic dựa trên toàn bộ bài làm của bạn, xem ở trang <a href="#/coach/analysis">Phân tích</a>.</p></section>
      <section class="card section"><div class="card-head"><h2>Xem lại từng câu</h2></div>${rows.map((r, i) => { const q = DATA.questions.find(x => x.id === r.q); if (!q) return ""; return `<details class="co-review"><summary><span class="badge ${r.ok ? "badge-success" : r.ok === false ? "badge-danger" : ""}">${r.ok ? "Đúng" : r.ok === false ? "Sai" : "Bỏ trống"}</span> Câu ${i + 1} · ${esc(q.topic)} · ${esc(P.meta.get(q.id) ? P.meta.get(q.id).skill : "")}</summary>${questionBodyHtml(q)}${choicesHtml(q, r.pick, true)}${explanationHtml(q, r.pick)}</details>`; }).join("")}</section>
      <div class="form-actions"><a class="btn btn-primary" href="#/coach/plan">Xem kế hoạch đã cập nhật</a><a class="btn btn-secondary" href="#/coach/analysis">Phân tích chi tiết</a></div>`;
  }

  // ======================= analysis =======================
  function analysisPage() {
    const c = CO(), P = pool(), an = analysis(), ev = CE.evidenceSummary(an);
    const topic = UI.topic || (TOPICS.find(t => an.topics[t.id].n && an.topics[t.id].band !== "strong") || TOPICS[0]).id;
    const tp = an.topics[topic], mods = modulesOf(topic);
    const err = (all => { const t = { time: 0, calc: 0, concept: 0 }; Object.values(all).forEach(a => Object.keys(t).forEach(k => { t[k] += a.errors.types[k]; })); return t; })(an.topics);
    const ci = a => `${Math.round(a.ci[0] * 100)}–${Math.round(a.ci[1] * 100)}%`;
    view.innerHTML = `${pageHeader("Phân tích năng lực", "Ba cấp: topic → module → kỹ năng (LOS). Mọi nhận định đi kèm số câu và độ tin cậy.", "", "Hoa Tiêu · CFA Compass")}${subnav("analysis")}
      <section class="card"><div class="card-head"><h2>Cấp 1 · Theo topic</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Câu</th><th class="num">Chính xác</th><th class="num">Có trọng số</th><th>Khoảng 90%</th><th>Nhận định</th><th class="num">Tự đánh giá</th></tr></thead><tbody>
        ${TOPICS.map(t => { const a = an.topics[t.id]; return `<tr class="${t.id === topic ? "co-sel" : ""}"><td><a href="#/coach/analysis" data-co-topic="${t.id}">${esc(t.name)}</a></td><td class="num">${a.n}</td><td class="num">${a.n ? Math.round(a.acc * 100) + "%" : "–"}</td><td class="num">${a.n ? Math.round(a.wAcc * 100) + "%" : "–"}</td><td>${a.n ? ci(a) : "–"}</td><td>${bandChip(a.band)} <span class="text-3 small">${CONF[a.confidence]}</span></td><td class="num">${a.selfRating ? a.selfRating + "/5" : "–"}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="text-3 small">Ngưỡng (có thể chỉnh trong CONFIG): Vững ≥ 80% · Đang tiến bộ 65–79% · Cần cải thiện 50–64% · Yếu < 50%. Dưới ${CE.CONFIG.evidence.insufficient} câu hệ thống không kết luận. ${ev.insufficient.length ? `<b>Thiếu dữ liệu:</b> ${ev.insufficient.join(", ")} — nên làm thêm bài kiểm tra.` : ""} Chỉ lần làm đầu tiên của mỗi câu tính là bằng chứng; làm lại câu đã biết không làm tăng điểm.</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 2 · Module của ${esc(topicName(topic))}</h2></div>
        <div class="segmented" id="co-topicsel" style="flex-wrap:wrap">${TOPICS.map(t => `<button data-t="${t.id}" class="${t.id === topic ? "active" : ""}">${t.id}</button>`).join("")}</div>
        <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Module</th><th class="num">Câu</th><th class="num">Chính xác</th><th>Nhận định</th><th class="num">Câu có sẵn</th></tr></thead><tbody>
        ${mods.map(m => { const a = an.modules[m.id]; return `<tr><td><a href="#/module/${m.id}">${m.n}. ${esc(m.title)}</a></td><td class="num">${a ? a.n : 0}</td><td class="num">${a ? Math.round(a.acc * 100) + "%" : "–"}</td><td>${a ? (a.n < 4 ? chip("Sơ bộ") + ` <span class="text-3 small">${a.k}/${a.n}</span>` : bandChip(a.band)) : chip("Chưa đo")}</td><td class="num">${P.supply[m.id] || 0}</td></tr>`; }).join("")}</tbody></table></div></section>
      <section class="card section"><div class="card-head"><h2>Cấp 3 · Kỹ năng (LOS) chưa đạt</h2></div>
        ${an.weakSkills.length ? `<div class="list">${an.weakSkills.map(w => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(w.skill)}</div><div class="list-meta">${w.topic} · ${esc(modTitle(w.module))} · ${w.k}/${w.n} đúng${w.preliminary ? " · tín hiệu sơ bộ" : ""}</div></div><a class="btn btn-sm btn-secondary" href="#/module/${w.module}">Ôn lại</a></div>`).join("")}</div>` : `<p class="text-2">Chưa có kỹ năng nào có đủ bằng chứng là yếu (cần ≥ 2 câu cùng kỹ năng).</p>`}
        <p class="text-3 small">“Kỹ năng” là thẻ mô tả theo module trong ngân hàng câu hỏi của website; kho dữ liệu hiện chưa có mã LOS chính thức của CFA Institute nên chưa liên kết tới mã LOS.</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 4 · Phân loại lỗi (giả thuyết)</h2></div>
        ${err.time + err.calc + err.concept ? `<div class="grid grid-3">${Object.keys(ERR_LABEL).map(k => `<div class="card stat"><span class="stat-label">${ERR_LABEL[k]}</span><span class="stat-value">${err[k]}</span><span class="stat-hint">${err[k] >= 3 ? "đủ để cân nhắc" : err[k] >= 2 ? "bằng chứng yếu" : "chưa đủ bằng chứng"}</span></div>`).join("")}</div>` : `<p class="text-2">Chưa có câu sai để phân loại.</p>`}
        <p class="text-3 small">${esc(tp.errors.note)} Hệ thống không suy đoán “bất cẩn” hay tâm lý chỉ từ một câu sai; ${tp.errors.rushedWrong} câu sai của ${topic} được trả lời rất nhanh (${tp.errors.rushedEvidence === "weak" ? "bằng chứng yếu" : "chưa đủ bằng chứng"}).</p></section>
      <section class="card section"><div class="card-head"><h2>Cấp 5 · Phản hồi cá nhân hóa</h2></div><div class="co-recos">${recommendations(an, 5).map(recoHtml).join("")}</div></section>`;
    bind();
    view.querySelectorAll("[data-co-topic]").forEach(a => a.onclick = e => { e.preventDefault(); UI.topic = a.dataset.coTopic; analysisPage(); });
    view.querySelectorAll("#co-topicsel [data-t]").forEach(b => b.onclick = () => { UI.topic = b.dataset.t; analysisPage(); });
  }

  // ======================= plan =======================
  function planPage() {
    const c = CO(), plan = c.plan, tab = UI.tab;
    if (!plan || plan.error) return void (view.innerHTML = `${pageHeader("Kế hoạch học", "", "", "Hoa Tiêu · CFA Compass")}${subnav("plan")}${emptyState("calendar", "Chưa có kế hoạch", plan && plan.error ? esc(plan.error) : "Hoàn tất thiết lập hồ sơ để tạo kế hoạch.", `<a class="btn btn-primary" href="#/coach/setup">Thiết lập hồ sơ</a>`)}`);
    // an automatic re-plan once a day when tasks were missed
    if (c.lastReplan !== today() && missedTasks().length) { const r = newPlan("missed-days"); if (r && !r.error) toast("Đã tự lập lại lịch vì có nhiệm vụ trễ; bản cũ được lưu trong Phiên bản"); return planPage(); }
    const days = plan.days, t0 = days.find(d => d.date === today());
    const tabs = [["today", "Hôm nay"], ["week", "Tuần"], ["month", "Tháng"], ["all", "Toàn kỳ"], ["versions", "Phiên bản"]];
    let body = "";
    if (tab === "today") body = `<section class="card"><div class="card-head"><h2>Hôm nay · ${dmy(today())}</h2></div>${todayHtml(t0)}</section>
      <section class="card section"><div class="card-head"><h2>Các ngày tới</h2></div>${days.filter(d => d.date > today() && d.minutes).slice(0, 4).map(d => `<div class="co-day"><b>${dmy(d.date)}</b> <span class="text-3 small">${d.minutes} phút · ${d.sessions.length} phiên</span><ul>${d.tasks.map(t => `<li>${esc(t.title)} <span class="text-3 small">(${t.min}′)</span></li>`).join("")}</ul></div>`).join("")}</section>`;
    if (tab === "week") {
      const start = days.findIndex(d => d.date >= today()), wk = days.slice(start, start + 7);
      body = `<section class="card"><div class="card-head"><h2>7 ngày tới</h2></div><div class="co-week">${wk.map(d => `<div class="co-daycard ${d.date === today() ? "now" : ""}"><b>${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][CE.weekday(d.date)]} ${d.date.slice(8)}/${d.date.slice(5, 7)}</b><span class="text-3 small">${d.minutes ? d.minutes + " phút" : "nghỉ"}</span>${d.tasks.map(t => `<div class="co-mini ${t.status !== "todo" ? "done" : ""}">${TYPE_LABEL[t.type]}: ${esc(t.title.replace(/^[^:]+: /, ""))}</div>`).join("")}</div>`).join("")}</div></section>`;
    }
    if (tab === "month") {
      const byM = {}; days.forEach(d => { const k = d.date.slice(0, 7); (byM[k] = byM[k] || { min: 0, learn: 0, practice: 0, mock: 0, review: 0 }); byM[k].min += d.tasks.reduce((s, t) => s + t.min, 0); d.tasks.forEach(t => { byM[k][t.type] = (byM[k][t.type] || 0) + t.min; }); });
      body = `<section class="card"><div class="card-head"><h2>Theo tháng</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Tháng</th><th class="num">Tổng</th><th class="num">Học</th><th class="num">Luyện</th><th class="num">Ôn</th><th class="num">Thi thử</th></tr></thead><tbody>${Object.entries(byM).map(([k, v]) => `<tr><td>${k.slice(5)}/${k.slice(0, 4)}</td><td class="num">${fmtH(v.min)}</td><td class="num">${fmtH(v.learn)}</td><td class="num">${fmtH(v.practice)}</td><td class="num">${fmtH(v.review)}</td><td class="num">${fmtH(v.mock)}</td></tr>`).join("")}</tbody></table></div></section>`;
    }
    if (tab === "all") {
      body = `<section class="card"><div class="card-head"><h2>Toàn bộ thời gian đến kỳ thi</h2></div>${plan.phases.map(p => `<div class="co-phase"><div class="row-between"><strong>Giai đoạn ${p.id} · ${esc(["Nền tảng & lấp lỗ hổng", "Học nội dung chính", "Củng cố & luyện tập", "Thi thử & ôn cuối"][p.id - 1])}</strong><span class="text-3 small">${p.from ? `${dmy(p.from)} → ${dmy(p.to)} · ${fmtH(p.minutes)}` : "không cần giai đoạn này"}</span></div>${progressBar(plan.capacity ? 100 * p.minutes / plan.capacity : 0)}</div>`).join("")}
        <h3 style="margin-top:16px">Phân bổ thời gian theo topic</h3>${(() => { const bt = {}; days.forEach(d => d.tasks.forEach(t => { if (t.topic) bt[t.topic] = (bt[t.topic] || 0) + t.min; })); const tot = Object.values(bt).reduce((s, x) => s + x, 0) || 1; return bars(TOPICS.map(t => ({ label: t.id, pct: 100 * (bt[t.id] || 0) / tot, text: fmtH(bt[t.id] || 0) }))); })()}
        <p class="text-3 small">Giả định: một module chưa biết gì cần ~${plan.assumptions.moduleMinutes} phút; ${plan.assumptions.practiceQuestions} câu luyện ≈ ${plan.assumptions.practiceQuestions * plan.assumptions.minutesPerQuestion} phút; ngày cuối trước kỳ thi chỉ ôn nhẹ. Điểm ưu tiên = ${Object.entries(plan.assumptions.priorityWeights).map(([k, v]) => `${v} × ${({ gap: "lỗ hổng", exam: "tỷ trọng đề", forget: "nguy cơ quên", prereq: "nền tảng", urgency: "khẩn cấp" })[k]}`).join(" + ")} (công thức heuristic ban đầu, không phải mô hình được CFA Institute xác nhận).</p></section>
        ${plan.deferred.length ? `<section class="card section"><div class="card-head"><h2>Chưa xếp được vào lịch (${plan.deferred.length})</h2></div><div class="list">${plan.deferred.slice(0, 12).map(d => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(d.title)}</div><div class="list-meta">${d.min} phút · ưu tiên thấp hơn các mục đã xếp</div></div></div>`).join("")}</div></section>` : ""}`;
    }
    if (tab === "versions") {
      body = `<section class="card"><div class="card-head"><h2>Phiên bản kế hoạch</h2></div><p class="text-3 small">Mỗi lần kế hoạch thay đổi, bản cũ được giữ lại để so sánh; không bao giờ xóa lịch sử.</p><div class="table-wrap"><table class="table"><thead><tr><th>v</th><th>Ngày tạo</th><th>Lý do</th><th class="num">Thời gian khả dụng</th><th class="num">Đã xếp</th><th class="num">Chưa xếp</th></tr></thead><tbody>${c.versions.slice().reverse().map(v => `<tr><td>${v.v}</td><td>${dmy(v.createdAt)}</td><td>${({ setup: "Thiết lập hồ sơ", assessment: "Sau bài chẩn đoán", progress: "Sau bài kiểm tra", "missed-days": "Bỏ lỡ nhiệm vụ", manual: "Bạn yêu cầu", update: "Cập nhật" })[v.reason] || esc(v.reason)}</td><td class="num">${fmtH(v.summary.capacity)}</td><td class="num">${fmtH(v.summary.placedMinutes)}</td><td class="num">${fmtH(v.summary.deferredMinutes)}</td></tr>`).join("")}</tbody></table></div></section>`;
    }
    const adh = plan._adherence;
    view.innerHTML = `${pageHeader("Kế hoạch học cá nhân", `${plan.daysLeft} ngày đến kỳ thi ${dmy(plan.examDate)} · ${fmtH(plan.capacity)} khả dụng · phiên bản ${c.versions.length}`, `<button class="btn btn-secondary" id="co-replan">${icon("calendar", 16)} Lập lại lịch</button>`, "Hoa Tiêu · CFA Compass")}${subnav("plan")}
      ${plan.warnings.map(w => `<div class="callout warn">${icon("alert", 16)} ${esc(w)}</div>`).join("")}
      <div class="co-tabs segmented">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</button>`).join("")}</div>
      <div style="margin-top:14px">${body}</div>`;
    bind();
    view.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; planPage(); });
    document.getElementById("co-replan").onclick = () => { const r = newPlan("manual"); if (r && !r.error) toast("Đã lập lại lịch từ hôm nay; bản cũ vẫn được lưu"); planPage(); };
  }

  // ======================= spaced repetition =======================
  function reviewPage() {
    const c = CO(), rows = Object.entries(c.reviews).map(([m, r]) => ({ m, r, ret: CE.retention(r, today()), due: r.next <= today() })).sort((a, b) => (b.due - a.due) || a.r.next.localeCompare(b.r.next));
    view.innerHTML = `${pageHeader("Ôn ngắt quãng", "Nhắc ôn những module có nguy cơ quên. Một lần trả lời đúng chưa phải là nhớ lâu.", "", "Hoa Tiêu · CFA Compass")}${subnav("review")}
      <section class="card"><p class="text-2 small">Lịch mặc định: sau 1 → 3 → 7 → 14 → 30 ngày. Hệ thống kéo dài khoảng cách khi bạn nhớ tốt (≥ 80%) và rút ngắn khi quên (< 50%). Ước tính ghi nhớ = e^(−số ngày / độ bền), độ bền gắn với khoảng cách hiện tại — là heuristic, chưa được hiệu chỉnh bằng dữ liệu của bạn.</p>
      ${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Module</th><th>Lần ôn gần nhất</th><th>Lần ôn tới</th><th class="num">Ghi nhớ ước tính</th><th class="num">Mức</th><th></th></tr></thead><tbody>${rows.map(({ m, r, ret, due }) => `<tr><td><a href="#/module/${m}">${esc(modTitle(m))}</a></td><td>${dmy(r.last)}</td><td>${due ? chip("Đến hạn", "danger") : dmy(r.next)}</td><td class="num">${Math.round(ret * 100)}%</td><td class="num">${r.stage + 1}/5</td><td>${pool().supply[m] >= 3 ? `<a class="btn btn-sm btn-secondary" href="#/coach/exam/review/${m}">Ôn 5 câu</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="text-2">Chưa có module nào trong lịch ôn. Module xuất hiện ở đây sau khi bạn được xác nhận đã học (bài kiểm tra nhanh) hoặc có ≥ 2 câu trả lời trong bài chẩn đoán.</p>`}</section>`;
  }

  // ======================= about / status =======================
  function aboutPage() {
    const P = pool(), coachQ = STARTER_QUESTIONS.filter(q => q.src === "coach").length;
    const row = (name, ok, text) => `<tr><td>${esc(name)}</td><td>${ok === true ? chip("Hoạt động", "success") : ok === "partial" ? chip("Một phần", "warning") : chip("Chưa tích hợp", "danger")}</td><td class="text-2">${text}</td></tr>`;
    view.innerHTML = `${pageHeader("Phương pháp & trạng thái", "Hoa Tiêu làm gì, dựa trên gì, và phần nào chưa có.", "", "Hoa Tiêu · CFA Compass")}${subnav("about")}
      <section class="card"><div class="card-head"><h2>Cách hoạt động</h2></div><ol class="co-steps small">
        <li><b>Đo:</b> chỉ lần làm đầu tiên của mỗi câu là bằng chứng. Câu khó có trọng số 1,3 · vừa 1,0 · dễ 0,8. Tự đánh giá chỉ là ước tính ban đầu có trọng số bằng 2 câu hỏi.</li>
        <li><b>Nói rõ độ tin cậy:</b> dưới ${CE.CONFIG.evidence.insufficient} câu, không kết luận; khoảng tin cậy 90% (Wilson) luôn được hiển thị.</li>
        <li><b>Ưu tiên:</b> 0,30 lỗ hổng + 0,25 tỷ trọng đề + 0,20 nguy cơ quên + 0,15 nền tảng + 0,10 khẩn cấp, mỗi thành phần chuẩn hóa 0–1.</li>
        <li><b>Lập lịch:</b> xếp theo giờ thật bạn khai, tối đa ${CO().profile ? CO().profile.maxSession : 90} phút/phiên; chia 4 giai đoạn theo hồ sơ; giữ một phần thời gian tối thiểu cho mọi topic; nếu không đủ giờ thì báo phần chưa xếp thay vì nhồi nhét.</li>
        <li><b>Thích ứng:</b> bỏ lỡ nhiệm vụ không làm giảm điểm năng lực và không tự đánh dấu hoàn thành; lịch được tính lại, nhẹ hơn 20% trong 3 ngày sau ≥ 3 ngày nghỉ; nếu liên tục chỉ hoàn thành &lt; 60% thì lịch mới theo giờ bạn thật sự học.</li>
        <li><b>Hoàn thành có bằng chứng:</b> nhiệm vụ luyện/ôn cần trả lời ≥ 80% số câu; nhiệm vụ học cần kiểm tra nhanh 5 câu (≥ 60%) hoặc ghi là “tự báo cáo” (không đổi mức nắm vững).</li>
        <li><b>LLM:</b> CFA Tutor chỉ giải thích; điểm, ưu tiên và lịch do quy tắc tất định ở trên quyết định.</li></ol>
        <p class="text-3 small">Các ngưỡng, trọng số và công thức là heuristic ban đầu của website này, không phải mô hình đã được CFA Institute hay ai khác xác nhận. Chỉ số sẵn sàng không phải xác suất đỗ.</p></section>
      <section class="card section"><div class="card-head"><h2>Trạng thái các thành phần</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Thành phần</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>
        ${row("Hồ sơ, tự đánh giá 10 topic / ${P.mods.length} module".replace("${P.mods.length}", P.mods.length), true, "Lưu riêng cho từng tài khoản của website (cùng cơ chế xuất / xóa dữ liệu).")}
        ${row("Chẩn đoán 45 / 90 phút", true, `Dùng ${P.rows.length} câu của ngân hàng tích hợp (trong đó ${coachQ} câu viết riêng cho Hoa Tiêu, 18 câu/topic, đủ dễ–vừa–khó). Không có câu do AI tự bịa.`)}
        ${row("Phân tích 3 cấp + phân loại lỗi + khuyến nghị", true, "Cấp LOS dùng thẻ kỹ năng theo module; chưa có mã LOS chính thức.")}
        ${row("Kế hoạch ngày / tuần / tháng / toàn kỳ, phiên bản", true, "Liên kết tới module, bài luyện và Mock exams có thật.")}
        ${row("Ôn ngắt quãng", true, "Khoảng cách thích ứng theo kết quả; mô hình quên là heuristic.")}
        ${row("CFA Tutor", "partial", "Dùng Tutor sẵn có của website (cần khóa API của bạn trong Tutor). Tutor đọc bản tóm tắt hồ sơ do nút “Hỏi CFA Tutor” gửi; không tự đọc dữ liệu và không sửa tiến độ.")}
        ${row("Mock exam 180 câu", "partial", "Dùng trang Mock exams sẵn có; kết quả mock chưa được đưa vào phân tích Hoa Tiêu (chưa tích hợp).")}
        ${row("Kết nối ngân hàng câu hỏi bằng API / khóa API", false, "Website là trang tĩnh (GitHub Pages), không có máy chủ nên không thể lưu khóa API an toàn phía server. Ngân hàng nội bộ đã dùng trực tiếp; kết nối API ngoài cần một backend.")}
        ${row("Cơ sở dữ liệu PostgreSQL, phân quyền server-side, audit log", false, "Chưa có backend. Cô lập tài khoản dựa trên hồ sơ trình duyệt của website, không phải bảo mật máy chủ.")}
        ${row("Trang quản trị, thống kê tổng hợp, quản lý phiên bản AI Planner", false, "Chưa có; yêu cầu backend và vai trò người dùng.")}
        ${row("Đồng bộ nhiều thiết bị", false, "Dữ liệu nằm trong trình duyệt; dùng xuất / nhập bản sao lưu của website để chuyển máy.")}</tbody></table></div></section>
      <section class="card section"><div class="card-head"><h2>Dữ liệu của bạn</h2></div><div class="row-gap"><button class="btn btn-secondary" id="co-export">${icon("download", 16)} Xuất dữ liệu Hoa Tiêu (JSON)</button><button class="btn btn-soft-danger" id="co-wipe">${icon("trash", 16)} Xóa dữ liệu Hoa Tiêu</button></div>
        <p class="text-3 small">Chỉ xóa hồ sơ, bài chẩn đoán, kế hoạch và lịch ôn của Hoa Tiêu. Tiến độ học và câu hỏi khác của website được giữ nguyên.</p></section>`;
    document.getElementById("co-export").onclick = () => downloadFile(`hoa-tieu-${today()}.json`, JSON.stringify({ app: "cfa-study-coach", exportedAt: new Date().toISOString(), profile: activeProfile().name, coach: { ...CO(), session: null } }, null, 2), "application/json");
    document.getElementById("co-wipe").onclick = async () => { if (!(await confirmDialog({ title: "Xóa dữ liệu Hoa Tiêu?", message: "Hồ sơ học tập, bài chẩn đoán, kế hoạch (mọi phiên bản) và lịch ôn sẽ bị xóa khỏi tài khoản này. Không thể hoàn tác; hãy xuất dữ liệu trước nếu cần.", confirmText: "Xóa", danger: true, requireText: "XOA" }))) return; delete DATA.coach; save(); toast("Đã xóa dữ liệu Hoa Tiêu"); location.hash = "#/coach"; };
  }
})();

// ============================================================
// coach/run.js — Hoa Tiêu sessions.
//   #/coach/start/<kind>/<target>/<task>  the page before a session: rules; the clock starts only on "Bắt đầu"
//   #/coach/run                           the runner. Exam mode: timed, no feedback until submitted, a review
//                                         screen before submitting. Practice mode: untimed, the answer and the
//                                         worked solution after each question.
//   #/coach/report/<id>                   result, analysis and the updated plan (what changed and a link to it)
// Every answer is stored with the time spent on it. Answers are also written to the site's own question records,
// so Weak spots, the mistake log and the daily count stay consistent.
// ============================================================
(function () {
  "use strict";
  const HT = window.HT, CE = window.CoachEngine;
  const C = () => HT.CO();
  let timer = null, keyHandler = null;
  const UI = { filter: "all", reviewing: false };

  window.coachRunStop = function () {
    if (timer) { clearInterval(timer); timer = null; }
    if (keyHandler) { window.removeEventListener("keydown", keyHandler); keyHandler = null; }
  };
  // the CFA Tutor stays closed during a timed test
  window.coachExamRunning = function () { const s = DATA.coach && DATA.coach.sess; return !!(s && s.mode === "exam" && s.submittedAt == null) && location.hash.startsWith("#/coach/run"); };

  const qIndex = () => { const m = new Map(); DATA.questions.forEach(q => m.set(q.id, q)); return m; };
  const fmt = sec => formatTime(sec);
  const KIND = {
    quick45: { title: "Chẩn đoán nhanh", sub: "30 câu · 45 phút · đủ 10 môn" },
    full90: { title: "Chẩn đoán toàn diện", sub: "60 câu · 90 phút · đủ 10 môn" },
    confirm: { title: "Kiểm tra xác nhận thành thạo", sub: "10 câu · 15 phút" },
    test: { title: "Kiểm tra cuối topic", sub: "15 câu · 25 phút" },
    check: { title: "Kiểm tra nhanh module", sub: "5 câu · 8 phút" },
    mock: { title: "Thi thử 180 câu", sub: "2 phiên · 90 câu · 135 phút mỗi phiên" },
    practice: { title: "Luyện tập", sub: "Có lời giải sau mỗi câu · không tính giờ" },
    review: { title: "Ôn ngắt quãng", sub: "Có lời giải sau mỗi câu · không tính giờ" },
    mistakes: { title: "Ôn lỗi sai", sub: "Làm lại câu đã sai · có lời giải" }
  };
  const targetName = (kind, target) => {
    if (!target) return "";
    if (kind === "confirm" || kind === "test") return HT.topicName(target);
    if (kind === "review" && target === "due") return "các module đến hạn";
    if (moduleById(target)) return `${target} ${HT.modTitle(target)}`;
    return "";
  };

  // ---------- the page before a session ----------
  window.renderCoachStart = function (kind, target, taskId) {
    const c = C(), K = KIND[kind];
    if (!K) return void (location.hash = "#/coach/test");
    if (c.sess && c.sess.submittedAt == null) {
      view.innerHTML = `${pageHeader("Bạn đang có bài làm dở", "", "", "Hoa Tiêu · CFA Compass")}
        <div class="card"><p>${esc((KIND[c.sess.kind] || {}).title || c.sess.kind)}${c.sess.target ? " · " + esc(targetName(c.sess.kind, c.sess.target)) : ""}: đã trả lời ${Object.keys(c.sess.answers).length}/${c.sess.ids.length} câu.</p>
        <div class="form-actions" style="justify-content:flex-start"><a class="btn btn-primary" href="#/coach/run">Tiếp tục bài này</a>
        <button class="btn btn-secondary" id="ht-submit-old">Nộp bài này</button><button class="btn btn-ghost" id="ht-drop-old">Huỷ bài này (không lưu kết quả)</button></div></div>`;
      document.getElementById("ht-submit-old").onclick = () => finish(false);
      document.getElementById("ht-drop-old").onclick = async () => { if (!(await confirmDialog({ title: "Huỷ bài đang làm?", message: "Các câu đã trả lời trong bài này sẽ không được lưu.", confirmText: "Huỷ bài", danger: true }))) return; c.sess = null; HT.save(); renderCoachStart(kind, target, taskId); };
      return;
    }
    const exam = CE.KINDS[kind] ? CE.KINDS[kind].mode === "exam" : true;
    const part2 = kind === "mock" && target === "2";
    const task = taskId ? HT.findTask(taskId) : null;
    if (kind === "mock" && part2 && !(c.mock && c.mock.parts)) return void (location.hash = "#/coach/test");
    const rules = exam ? [
      "Đồng hồ chỉ bắt đầu khi bạn bấm “Bắt đầu”; sau đó không tạm dừng được, giống phòng thi.",
      "Bài được lưu sau mỗi thao tác: tải lại trang hoặc mất mạng vẫn làm tiếp được, đồng hồ vẫn chạy theo giờ thật.",
      "Hết giờ bài tự nộp; sau khi nộp không sửa được đáp án.",
      "Đáp án và lời giải chỉ hiện sau khi nộp. CFA Tutor tạm ẩn trong lúc làm bài; máy tính BA II Plus vẫn dùng được.",
      "Đây là bài kiểm tra nội bộ của website, không phải đề thi CFA chính thức."
    ] : [
      "Không tính giờ. Sau mỗi câu, đáp án và lời giải hiện ra; câu đã trả lời không sửa được.",
      "Bạn có thể dừng bất cứ lúc nào: các câu đã trả lời được lưu.",
      "Chỉ lần làm đầu tiên của mỗi câu được tính là bằng chứng năng lực; làm lại câu cũ không làm tăng điểm."
    ];
    const n = kind === "mock" ? 90 : (task && task.n) || (CE.KINDS[kind] || {}).n;
    view.innerHTML = `${pageHeader(K.title + (part2 ? " — phiên 2" : kind === "mock" ? " — phiên 1" : ""), esc(targetName(kind, target) || K.sub), "", "Hoa Tiêu · CFA Compass")}
      <div class="grid grid-2">
        <section class="card"><div class="card-head"><h2>Bài này</h2></div>
          <dl class="ht-dl"><div><dt>Số câu</dt><dd>${n}</dd></div><div><dt>Thời gian</dt><dd>${exam ? `${kind === "mock" ? 135 : CE.KINDS[kind].minutes} phút` : "Không giới hạn"}</dd></div>
            <div><dt>Hình thức</dt><dd>${exam ? "Thi (không có đáp án đến khi nộp)" : "Luyện (có lời giải sau mỗi câu)"}</dd></div>
            <div><dt>Câu hỏi</dt><dd>${kind === "mistakes" ? "Câu bạn đã làm sai" : kind === "review" ? "Câu trong module cần ôn (có thể gặp lại câu cũ)" : "Ưu tiên câu bạn chưa làm; dễ, vừa, khó trộn lẫn"}</dd></div></dl>
          ${task ? `<p class="text-3 small">Nhiệm vụ trong kế hoạch: ${esc(HT.label(task))}. Hoàn thành bài này sẽ được tính cho nhiệm vụ.</p>` : ""}</section>
        <section class="card"><div class="card-head"><h2>Quy tắc</h2></div><ul class="ht-rules">${rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul></section>
      </div>
      <div class="form-actions"><a class="btn btn-ghost" href="#/coach">Để sau</a><button class="btn btn-primary btn-lg" id="ht-go">${icon("play", 18)} Bắt đầu</button></div>`;
    document.getElementById("ht-go").onclick = () => createSession(kind, target, taskId);
  };

  function createSession(kind, target, taskId) {
    const c = C(), P = HT.pool(), seen = [...HT.seenIds()], seed = `${PROFILES.active}|${Date.now()}`;
    const task = taskId ? HT.findTask(taskId) : null;
    const base = { seed, weights: P.weights, seen };
    let ids = [], extra = {};
    if (kind === "quick45" || kind === "full90") ids = CE.buildAssessment(P.rows, kind, base);
    else if (kind === "confirm") ids = CE.buildAssessment(P.rows, "confirm", { ...base, topic: target, n: 10, mix: { 1: 0.2, 2: 0.5, 3: 0.3 } });
    else if (kind === "test") ids = CE.buildAssessment(P.rows, "test", { ...base, topic: target, n: (task && task.n) || 15 });
    else if (kind === "check") ids = CE.buildAssessment(P.rows, "check", { ...base, module: target, n: (task && task.n) || 5 });
    else if (kind === "practice") {
      // harder questions as the module is mastered ("bài tập nâng cao hơn" when the learner improves)
      const an = HT.analysis(), m = moduleById(target), mo = an.modules[target], tp = m && an.topics[m.topic];
      const k = mo && mo.n >= 3 ? mo.wAcc : tp && tp.n >= 4 ? tp.wAcc : 0.5;
      const mix = k < 0.4 ? { 1: 0.5, 2: 0.4, 3: 0.1 } : k < 0.7 ? { 1: 0.3, 2: 0.5, 3: 0.2 } : { 1: 0.1, 2: 0.5, 3: 0.4 };
      ids = CE.buildAssessment(P.rows, "practice", { ...base, module: target, n: (task && task.n) || 10, mix });
    } else if (kind === "review") {
      const mods = target === "due" ? Object.entries(c.rev).filter(([, r]) => r.next <= HT.today()).map(([m]) => m).slice(0, 4) : [target];
      const recent = HT.coachRows().filter(a => CE.daysBetween(a.ts, HT.today()) < 3).map(a => a.q);
      ids = mods.length ? CE.buildAssessment(P.rows, "review", { seed, modules: mods, n: Math.min(15, 5 * mods.length), seen: recent }) : [];
    } else if (kind === "mistakes") {
      const r = CE.rng(seed); ids = HT.mistakeIds().slice(0, (task && task.n) || 10).sort(() => r() - 0.5);
    } else if (kind === "mock") {
      if (target === "2") { ids = (c.mock && c.mock.parts[1]) || []; extra = { mock: c.mock.id, part: 2 }; }
      else {
        const m = CE.buildMock(P.rows, { seed, weights: P.weights, order: P.topicIds, seen });
        const no = c.hist.filter(h => h.kind === "mock" && h.part === 1).length + 1;
        c.mock = { id: "m" + Date.now().toString(36), no, parts: m.parts, started: HT.today(), task1: taskId || null };
        ids = m.parts[0]; extra = { mock: c.mock.id, part: 1 };
      }
    }
    if (!ids.length) { toast(kind === "mistakes" ? "Chưa có câu sai nào để ôn — tốt!" : "Resource not available: chưa đủ câu hỏi cho bài này", "error"); return void (location.hash = "#/coach"); }
    const s = CE.newSession(kind, ids, { id: "s" + Date.now().toString(36), target: target || null, task: taskId || null, ...extra });
    CE.startSession(s, Date.now());
    c.sess = s; UI.filter = "all"; UI.reviewing = false; HT.save();
    location.hash = "#/coach/run";
  }

  // ---------- the runner ----------
  window.renderCoachRun = function () {
    coachRunStop();
    const c = C(), s = c.sess;
    if (!s) return void (location.hash = "#/coach/test");
    if (s.submittedAt != null) return void (location.hash = "#/coach/report/" + s.id);
    if (s.mode === "exam" && CE.remainingSec(s, Date.now()) <= 0) return finish(true);
    const Q = qIndex(), q = Q.get(s.ids[s.current]);
    const answered = Object.keys(s.answers).length, total = s.ids.length;
    const K = KIND[s.kind] || { title: s.kind };
    const title = `${K.title}${s.kind === "mock" ? ` — phiên ${s.part}/2` : ""}${s.target && s.kind !== "mock" ? " · " + targetName(s.kind, s.target) : ""}`;
    if (s.mode === "practice") return drawPractice(s, q, Q, title, answered, total);
    const flagged = s.ids.filter(id => s.flags[id]).length;
    const list = s.ids.map((id, i) => ({ id, i })).filter(x => UI.filter === "all" || (UI.filter === "open" ? !s.answers[x.id] : s.flags[x.id]));
    view.innerHTML = `<div class="mock-top ht-top"><div class="ht-top-main"><div style="font-weight:600">${esc(title)}</div>
        <div class="text-3 small">${answered}/${total} đã trả lời · ${flagged} gắn cờ</div>${progressBar(100 * answered / total)}</div>
        <div class="row-gap"><div class="timer" id="ht-timer" role="timer" aria-label="Thời gian còn lại">${icon("clock", 18)}<span></span></div>
        <button class="btn btn-secondary" id="ht-review">${UI.reviewing ? "Quay lại làm bài" : "Xem lại & nộp"}</button></div></div>
      <div class="mock-layout"><div>
        ${UI.reviewing ? reviewScreen(s) : `<div class="card">
          ${q ? `<div class="row-between" style="margin-bottom:12px"><span class="text-2 small" style="font-weight:600">Câu ${s.current + 1}/${total} · ${esc(q.topic)}</span>
            <button class="btn btn-ghost btn-sm" id="ht-flag" aria-pressed="${!!s.flags[q.id]}" style="${s.flags[q.id] ? "color:var(--warning)" : ""}">${icon("flag", 16)} ${s.flags[q.id] ? "Đã gắn cờ" : "Gắn cờ xem lại"}</button></div>
            ${questionBodyHtml(q)}${choicesHtml(q, s.answers[q.id] || null, false)}` : `<p>Câu hỏi này không còn trong ngân hàng; sẽ tính là chưa trả lời.</p>`}
          <div class="mock-nav"><button class="btn btn-secondary" id="ht-prev" ${s.current === 0 ? "disabled" : ""}>${icon("prev", 18)} Trước</button>
            <button class="btn btn-secondary" id="ht-next" ${s.current === total - 1 ? "disabled" : ""}>Sau ${icon("next", 18)}</button></div></div>
          <p class="text-3 small hide-mobile" style="margin-top:12px">Phím tắt: <span class="kbd">1</span>–<span class="kbd">3</span> chọn · <span class="kbd">←</span> <span class="kbd">→</span> chuyển câu · <span class="kbd">F</span> gắn cờ. Bài được lưu sau mỗi thao tác.</p>`}
      </div>
      <aside class="card mock-side" aria-label="Danh sách câu hỏi">
        <div class="segmented ht-filter">${[["all", `Tất cả`], ["open", `Chưa trả lời (${total - answered})`], ["flag", `Gắn cờ (${flagged})`]].map(([k, l]) => `<button data-filter="${k}" class="${UI.filter === k ? "active" : ""}">${l}</button>`).join("")}</div>
        <div class="palette" style="margin-top:10px">${list.map(({ id, i }) => `<button class="pal-btn ${s.answers[id] ? "answered" : ""} ${s.flags[id] ? "flagged" : ""} ${i === s.current && !UI.reviewing ? "current" : ""}" data-go="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join("") || `<p class="text-3 small">Không có câu nào.</p>`}</div>
        <div class="legend"><span><i style="background:var(--primary);border-color:transparent"></i>Đã trả lời</span><span><i></i>Chưa trả lời</span><span><i style="background:var(--brass);border-color:transparent;border-radius:50%"></i>Gắn cờ</span></div>
      </aside></div>`;
    const tick = () => {
      const el = document.getElementById("ht-timer"); if (!el) return coachRunStop();
      const left = CE.remainingSec(s, Date.now());
      el.querySelector("span").textContent = fmt(left);
      el.classList.toggle("warn", left <= 300 && left > 60); el.classList.toggle("danger", left <= 60);
      if (left <= 0) { coachRunStop(); finish(true); }
    };
    tick(); timer = setInterval(tick, 1000);
    const go = i => { CE.visit(s, i, Date.now()); UI.reviewing = false; HT.save(); renderCoachRun(); };
    view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pick(s, q, b.dataset.pick));
    view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
    view.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; renderCoachRun(); });
    const prev = document.getElementById("ht-prev"), next = document.getElementById("ht-next"), flag = document.getElementById("ht-flag");
    if (prev) prev.onclick = () => go(s.current - 1);
    if (next) next.onclick = () => go(s.current + 1);
    if (flag) flag.onclick = () => { s.flags[q.id] = !s.flags[q.id]; if (!s.flags[q.id]) delete s.flags[q.id]; HT.save(); renderCoachRun(); };
    document.getElementById("ht-review").onclick = () => { UI.reviewing = !UI.reviewing; renderCoachRun(); };
    const sub = document.getElementById("ht-submit"); if (sub) sub.onclick = () => askSubmit(s);
    keyHandler = e => {
      if (/input|textarea|select/i.test(e.target.tagName) || document.querySelector(".modal-overlay")) return;
      if (e.key === "ArrowRight" && s.current < total - 1) go(s.current + 1);
      else if (e.key === "ArrowLeft" && s.current > 0) go(s.current - 1);
      else if (/^[1-3]$/.test(e.key) && q && !UI.reviewing) pick(s, q, "ABC"[+e.key - 1]);
      else if ((e.key === "f" || e.key === "F") && q && !UI.reviewing) { s.flags[q.id] = !s.flags[q.id]; if (!s.flags[q.id]) delete s.flags[q.id]; HT.save(); renderCoachRun(); }
    };
    window.addEventListener("keydown", keyHandler);
  };
  function reviewScreen(s) {
    const answered = s.ids.filter(id => s.answers[id]).length, flagged = s.ids.filter(id => s.flags[id]);
    return `<div class="card"><h2>Xem lại trước khi nộp</h2>
      <div class="grid grid-3" style="margin:12px 0"><div class="stat"><span class="stat-label">Đã trả lời</span><span class="stat-value">${answered}</span></div>
        <div class="stat"><span class="stat-label">Chưa trả lời</span><span class="stat-value">${s.ids.length - answered}</span></div><div class="stat"><span class="stat-label">Gắn cờ</span><span class="stat-value">${flagged.length}</span></div></div>
      <div class="palette ht-review-grid">${s.ids.map((id, i) => `<button class="pal-btn ${s.answers[id] ? "answered" : ""} ${s.flags[id] ? "flagged" : ""}" data-go="${i}">${i + 1}</button>`).join("")}</div>
      <p class="text-2 small" style="margin-top:12px">${s.ids.length - answered ? `Còn ${s.ids.length - answered} câu chưa trả lời: nếu nộp bây giờ, các câu đó tính là sai.` : "Bạn đã trả lời tất cả các câu."} Sau khi nộp không sửa được đáp án.</p>
      <div class="form-actions"><button class="btn btn-primary" id="ht-submit">Nộp bài</button></div></div>`;
  }
  async function askSubmit(s) {
    const left = s.ids.length - Object.keys(s.answers).length;
    if (!(await confirmDialog({ title: "Nộp bài?", message: left ? `Còn ${left} câu chưa trả lời. Sau khi nộp không sửa được đáp án.` : "Sau khi nộp không sửa được đáp án.", confirmText: "Nộp bài" }))) return;
    finish(false);
  }
  function pick(s, q, L) {
    const r = CE.answer(s, q.id, L, Date.now());
    if (!r.ok) { if (r.reason === "expired") { toast("Đã hết giờ — bài được nộp tự động", "error"); return finish(true); } if (r.reason !== "revealed") toast("Không ghi được đáp án", "error"); return; }
    HT.save(); renderCoachRun();
  }

  // practice: one question at a time, the answer and the worked solution right after
  function drawPractice(s, q, Q, title, answered, total) {
    const picked = q ? s.answers[q.id] || null : null, right = s.ids.filter(id => s.answers[id] && Q.get(id) && s.answers[id] === Q.get(id).answer).length;
    const last = s.current >= total - 1;
    view.innerHTML = `<div class="mock-top ht-top"><div class="ht-top-main"><div style="font-weight:600">${esc(title)}</div>
        <div class="text-3 small">Câu ${s.current + 1}/${total} · đúng ${right}/${answered} · không tính giờ</div>${progressBar(100 * answered / total)}</div>
        <div class="row-gap"><button class="btn btn-secondary" id="ht-stop">Kết thúc</button></div></div>
      <div style="max-width:780px;margin:0 auto"><div class="card">
        ${q ? `${questionMetaHtml(q)}${questionBodyHtml(q)}${choicesHtml(q, picked, !!picked)}${picked ? explanationHtml(q, picked) : ""}` : `<p>Câu hỏi này không còn trong ngân hàng.</p>`}
        <div class="mock-nav"><span></span>${picked || !q ? `<button class="btn btn-primary" id="ht-next">${last ? "Xem kết quả" : "Câu tiếp"} ${icon("next", 18)}</button>` : `<button class="btn btn-ghost" id="ht-skip">Bỏ qua</button>`}</div></div>
        <p class="text-3 small hide-mobile" style="margin-top:12px">Phím tắt: <span class="kbd">1</span>–<span class="kbd">3</span> chọn · <span class="kbd">Enter</span> câu tiếp.</p></div>`;
    const next = () => { if (last) return finish(false); CE.visit(s, s.current + 1, Date.now()); HT.save(); renderCoachRun(); window.scrollTo(0, 0); };
    view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pick(s, q, b.dataset.pick));
    const nb = document.getElementById("ht-next"); if (nb) nb.onclick = next;
    const sk = document.getElementById("ht-skip"); if (sk) sk.onclick = next;
    document.getElementById("ht-stop").onclick = async () => {
      if (answered < total && !(await confirmDialog({ title: "Kết thúc bài luyện?", message: `Bạn đã trả lời ${answered}/${total} câu. Các câu đã trả lời được lưu.`, confirmText: "Kết thúc" }))) return;
      finish(false);
    };
    keyHandler = e => {
      if (/input|textarea|select/i.test(e.target.tagName) || document.querySelector(".modal-overlay")) return;
      if (/^[1-3]$/.test(e.key) && q && !picked) pick(s, q, "ABC"[+e.key - 1]);
      else if (e.key === "Enter" && (picked || !q)) next();
    };
    window.addEventListener("keydown", keyHandler);
  }

  // ---------- grading ----------
  const REPLAN = { quick45: "assessment", full90: "assessment", confirm: "test", test: "test", check: "progress" };
  function finish(expired) {
    coachRunStop();
    const c = C(), s = c.sess; if (!s || s.submittedAt != null) return void (location.hash = "#/coach/test");
    CE.submit(s, Date.now());
    const t0 = HT.today(), Q = qIndex();
    const rows = CE.attemptsFromSession(s, HT.metaOf, t0);
    c.att.push(...rows.map(CE.packAttempt));
    // the site's own records: attempts, mistake log, daily count
    rows.forEach(r => {
      if (r.ok === null) return;
      const q = Q.get(r.q); if (!q) return;
      q.attempts.push({ date: t0, picked: r.pick, correct: r.ok });
      if (r.ok) { q.correctStreak = (q.correctStreak || 0) + 1; if (q.inMistakeLog && q.correctStreak >= 2) q.inMistakeLog = false; } else { q.correctStreak = 0; q.inMistakeLog = true; }
      const log = DATA.dailyLog[t0] || (DATA.dailyLog[t0] = {});
      log.questionsDone = (log.questionsDone || 0) + 1; log.questionsRight = (log.questionsRight || 0) + (r.ok ? 1 : 0);
    });
    const secs = rows.reduce((a, r) => a + (r.sec || 0), 0);
    HT.logMinutes(Math.round(secs / 60));
    // spaced repetition: every module with 2+ answers in this session
    const byMod = {}; rows.forEach(r => { if (r.m && r.ok !== null) (byMod[r.m] = byMod[r.m] || []).push(r); });
    Object.entries(byMod).forEach(([m, rr]) => { if (rr.length >= 2) c.rev[m] = CE.recordReview(c.rev[m] || CE.startReview(t0), rr.filter(x => x.ok).length / rr.length, rr.length, t0); });
    const answered = rows.filter(r => r.ok !== null).length, k = rows.filter(r => r.ok).length;
    const rec = { id: s.id, kind: s.kind, date: t0, n: s.mode === "practice" ? answered : s.ids.length, k, answered, expired: !!s.expired, target: s.target || null, task: s.task || null,
      mock: s.mock || null, part: s.part || null, secs, wAcc: rows.length ? CE.tally(rows, null).wAcc : null };
    // the task this session was started from
    const task = s.task ? HT.findTask(s.task) : null;
    if (task && task.status === "todo") {
      let r;
      if (task.type === "learn") { r = CE.completeTask(task, { checkTotal: rows.length, checkCorrect: k }); if (r.status !== "todo") { c.progress[task.module] = (c.progress[task.module] || 0) + task.min; } }
      else r = CE.completeTask(task, { session: { submitted: true, answered, total: s.ids.length } });
      if (r.status !== "todo") { task.status = r.status; task.doneAt = t0; rec.taskDone = r.status; HT.commitPlan(HT.plan()); }
    }
    // a module check: verified learning when 60%+ of 3+ questions are right
    if (s.kind === "check" && s.target && rows.length >= 3) { const okc = k / rows.length >= 0.6; rec.checkOk = okc; if (okc) HT.markLearned(s.target, "verified"); }
    if (s.kind === "confirm") { const ev = CE.evaluateConfirm(rows); rec.confirm = ev.passed; if (ev.passed) c.confirmed[s.target] = t0; }
    if (s.kind === "mock" && c.mock && c.mock.id === s.mock) { (c.mock.sess = c.mock.sess || [])[s.part - 1] = s.id; rec.mockNo = c.mock.no; }
    c.hist.push(rec); c.sess = null; HT.touch();
    let reason = REPLAN[s.kind] || (s.kind === "mock" && s.part === 2 ? "mock" : null);
    if (reason) { const p = HT.newPlan(reason); rec.planV = p && !p.error ? c.ver.length : null; }
    HT.save();
    location.hash = "#/coach/report/" + s.id;
  }
  window.coachFinishSession = finish;

  // ---------- the report ----------
  window.renderCoachReport = function (id) {
    const c = C(), rec = c.hist.find(h => h.id === id);
    if (!rec) return void (location.hash = "#/coach/test");
    const Q = qIndex(), K = KIND[rec.kind] || { title: rec.kind };
    const mockSess = rec.kind === "mock" && c.mock && c.mock.id === rec.mock ? (c.mock.sess || []) : rec.kind === "mock" ? c.hist.filter(h => h.mock === rec.mock).map(h => h.id) : [];
    const ids = rec.kind === "mock" && rec.part === 2 ? mockSess.filter(Boolean) : [rec.id];
    const rows = HT.coachRows().filter(a => ids.includes(a.sess));
    const t = CE.tally(rows, null), an = HT.analysis(), practice = ["practice", "review", "mistakes"].includes(rec.kind);
    const unanswered = rows.filter(r => r.ok === null).length;
    const err = CE.classifyErrors(rows, t.acc);
    const byTopic = TOPICS.map(tp => ({ tp, r: CE.tally(rows.filter(x => x.t === tp.id), null), time: rows.filter(x => x.t === tp.id && x.sec > 0) })).filter(x => x.r.n);
    const ver = rec.planV ? c.ver[rec.planV - 1] : null;
    const title = `${K.title}${rec.kind === "mock" ? ` ${rec.mockNo || ""} — ${rec.part === 2 ? "cả 2 phiên" : "phiên 1"}` : ""}${rec.target && rec.kind !== "mock" ? " · " + targetName(rec.kind, rec.target) : ""}`;
    const pct_ = x => x == null ? "–" : Math.round(x * 100) + "%";
    const nQ = rows.length;
    const minutes = Math.round(rec.secs / 60);
    const mockPart1Only = rec.kind === "mock" && rec.part === 1;
    const prevMock = rec.kind === "mock" && rec.part === 2 ? c.hist.filter(h => h.kind === "mock" && h.part === 2 && h.date <= rec.date && h.id !== rec.id).slice(-1)[0] : null;
    view.innerHTML = `${pageHeader("Kết quả", `${esc(title)} · ${esc(rec.date.split("-").reverse().join("/"))}${rec.expired ? " · tự nộp khi hết giờ" : ""}`, `<a class="btn btn-secondary" href="#/coach">Tổng quan</a>`, "Hoa Tiêu · CFA Compass")}
      ${mockPart1Only ? `<div class="callout">${icon("clock", 16)} Đã xong phiên 1. Nghỉ giữa giờ rồi làm phiên 2 (90 câu, 135 phút); kết quả đầy đủ của bài thi thử có sau phiên 2. <a class="btn btn-sm btn-primary" href="#/coach/start/mock/2">Làm phiên 2</a></div>` : ""}
      <div class="grid grid-stats">
        <div class="card stat"><span class="stat-label">Đúng</span><span class="stat-value">${t.k}/${nQ}</span><span class="stat-hint">${pct_(t.acc)} · có trọng số độ khó ${pct_(t.wAcc)}</span></div>
        <div class="card stat"><span class="stat-label">${practice ? "Câu đã làm" : "Chưa trả lời"}</span><span class="stat-value">${practice ? nQ : unanswered}</span><span class="stat-hint">${practice ? "câu đã trả lời được lưu" : unanswered ? "tính là sai" : "trả lời đủ"}</span></div>
        <div class="card stat"><span class="stat-label">Thời gian</span><span class="stat-value">${minutes} phút</span><span class="stat-hint">TB ${nQ ? Math.round(rec.secs / nQ) : 0}s/câu · ước tính ${nQ ? Math.round(rows.reduce((s, r) => s + (r.est || 0), 0) / nQ) : 0}s</span></div>
        <div class="card stat"><span class="stat-label">Theo độ khó</span><span class="stat-value ht-small">${[1, 2, 3].map(d => `${["", "Dễ", "Vừa", "Khó"][d]} ${t.byDiff[d].n ? `${t.byDiff[d].k}/${t.byDiff[d].n}` : "–"}`).join(" · ")}</span></div>
      </div>
      ${rec.kind === "confirm" ? `<div class="callout ${rec.confirm ? "" : "warn"}">${rec.confirm ? `Đã xác nhận thành thạo ${esc(HT.topicName(rec.target))}: topic chuyển sang chế độ duy trì, phần học lại trong kế hoạch được rút ngắn (vẫn giữ ôn tập).` : "Chưa đạt ngưỡng xác nhận (≥ 10 câu, ≥ 80% có trọng số độ khó). Kế hoạch giữ phần học cho topic này."}</div>` : ""}
      ${rec.checkOk != null ? `<div class="callout ${rec.checkOk ? "" : "warn"}">${rec.checkOk ? "Đạt (≥ 60%): module được xác nhận đã học." : "Chưa đạt: module vẫn cần học thêm; không tính là đã nắm vững."}</div>` : ""}
      ${rec.taskDone ? `<div class="callout">${icon("check", 16)} Nhiệm vụ trong kế hoạch đã được ${rec.taskDone === "verified" ? "xác nhận hoàn thành" : "ghi nhận"}.</div>` : ""}
      ${ver ? planUpdateCard(ver) : ""}
      ${rec.kind === "mock" && rec.part === 2 ? mockExtras(rows, prevMock) : ""}
      ${byTopic.length && !practice ? `<section class="card section"><div class="card-head"><h2>Theo topic</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Đúng</th><th class="num">%</th><th class="num">TB giây/câu</th><th>Nhận định trong bài này</th></tr></thead><tbody>
        ${byTopic.map(({ tp, r, time }) => `<tr><td>${esc(tp.name)}</td><td class="num">${r.k}/${r.n}</td><td class="num">${pct_(r.acc)}</td><td class="num">${time.length ? Math.round(time.reduce((s, x) => s + x.sec, 0) / time.length) : "–"}</td><td>${r.n < CE.CONFIG.evidence.insufficient ? `<span class="badge">Chưa đủ bằng chứng</span> <span class="text-3 small">chỉ ${r.n} câu</span>` : `${bandBadge(r.band)}${r.n < CE.CONFIG.evidence.low ? ` <span class="text-3 small">${r.n} câu · độ tin cậy thấp</span>` : ""}`}</td></tr>`).join("")}</tbody></table></div>
        <p class="text-3 small">Nhận định chính thức dựa trên mọi bài làm của bạn: xem <a href="#/coach/analysis">Phân tích</a>. ${an.evidenceTotal} câu đã được tính.</p></section>` : ""}
      ${err.total ? `<section class="card section"><div class="card-head"><h2>Loại lỗi trong bài này (giả thuyết)</h2></div>${errorList(err)}</section>` : ""}
      <section class="card section"><div class="card-head"><h2>Xem lại từng câu</h2><span class="text-3 small">Có lời giải và nút hỏi CFA Tutor</span></div>
        ${rows.map((r, i) => { const q = Q.get(r.q); if (!q) return ""; return `<details class="ht-qreview"><summary><span class="badge ${r.ok ? "badge-success" : r.ok === false ? "badge-danger" : ""}">${r.ok ? "Đúng" : r.ok === false ? (r.trap ? "Sai · đáp án bẫy" : "Sai") : "Bỏ trống"}</span> Câu ${i + 1} · ${esc(q.topic)} · ${esc((HT.metaOf(q.id) || {}).skill || "")}${r.sec ? ` · ${r.sec}s` : ""}</summary>${questionBodyHtml(q)}${choicesHtml(q, r.pick, true)}${explanationHtml(q, r.pick)}</details>`; }).join("")}</section>
      <div class="form-actions">${ver ? `<a class="btn btn-primary" href="#/coach/plan/ready">Xem kế hoạch của bạn</a>` : `<a class="btn btn-primary" href="#/coach/plan">Về kế hoạch</a>`}<a class="btn btn-secondary" href="#/coach/analysis">Phân tích chi tiết</a></div>`;
  };
  function bandBadge(b) {
    const B = { strong: ["Vững", "success"], developing: ["Đang tiến bộ", "application"], needs: ["Cần cải thiện", "warning"], weak: ["Yếu", "danger"], unknown: ["Chưa đủ bằng chứng", ""] };
    return `<span class="badge ${B[b][1] ? "badge-" + B[b][1] : ""}">${B[b][0]}</span>`;
  }
  const ERR = { time: "Bỏ trống / hết giờ (quản lý thời gian)", trapCalc: "Chọn đáp án bẫy của lỗi tính hoặc nhớ sai công thức", trapConcept: "Chọn đáp án bẫy do nhầm khái niệm", calc: "Sai ở câu tính toán (khác đáp án bẫy)", concept: "Sai ở câu khái niệm" };
  const EV = { moderate: "đủ để cân nhắc", weak: "bằng chứng yếu", insufficient: "chưa đủ bằng chứng" };
  function errorList(e) {
    return `<div class="ht-errs">${Object.keys(ERR).filter(k => e.types[k]).map(k => `<div class="ht-err"><strong>${e.types[k]}</strong><span>${ERR[k]}</span><em>${EV[e.evidence[k]]}</em></div>`).join("")}</div>
      <p class="text-3 small">${e.timeSink ? `${e.timeSink} câu sai mất hơn gấp đôi thời gian ước tính. ` : ""}${e.carelessEvidence === "weak" ? `${e.rushed} câu dễ sai khi trả lời rất nhanh trong topic bạn đang làm tốt: có thể do vội (bằng chứng yếu). ` : ""}Phân loại dựa trên loại câu, đáp án bạn chọn và thời gian; hệ thống không suy đoán tâm lý từ một câu sai.</p>`;
  }
  window.coachErrorList = errorList;
  window.coachBandBadge = bandBadge;
  function planUpdateCard(ver) {
    return `<section class="card section ht-plan-updated"><div class="card-head"><h2>${icon("calendar", 18)} Kế hoạch đã được cập nhật · phiên bản ${ver.v}</h2></div>
      <ul class="ht-diff">${(ver.diff || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      <div class="form-actions" style="justify-content:flex-start"><a class="btn btn-primary" href="#/coach/plan/ready">Xem kế hoạch đầy đủ</a><a class="btn btn-secondary" href="#/coach/plan">Nhiệm vụ hôm nay</a></div></section>`;
  }
  window.coachPlanUpdateCard = planUpdateCard;
  // a mock: pacing against the 90-seconds-per-question line, and the change since the previous mock
  function mockExtras(rows, prev) {
    const parts = [rows.filter(r => r.sess === rows[0].sess), rows.filter(r => r.sess !== rows[0].sess)].filter(p => p.length);
    const chart = p => {
      let cum = 0; const pts = p.map((r, i) => { cum += r.sec; return [i + 1, cum / 60]; });
      const maxY = Math.max(135, cum / 60), W = 300, H = 120, x = i => 30 + (i / 90) * (W - 40), y = v => H - 18 - (v / maxY) * (H - 30);
      return `<svg viewBox="0 0 ${W} ${H}" class="ht-pace" role="img" aria-label="Tiến độ thời gian"><line x1="${x(0)}" y1="${y(0)}" x2="${x(90)}" y2="${y(135)}" class="ht-pace-ideal"/>
        <polyline points="${pts.map(([i, v]) => `${x(i)},${y(v)}`).join(" ")}" class="ht-pace-line"/><text x="${x(90)}" y="${y(135) - 4}" text-anchor="end" font-size="9" fill="currentColor" opacity=".6">135′</text>
        <text x="${x(0)}" y="${H - 4}" font-size="9" fill="currentColor" opacity=".6">câu 1</text><text x="${x(90)}" y="${H - 4}" text-anchor="end" font-size="9" fill="currentColor" opacity=".6">câu 90</text></svg>`;
    };
    let cmp = "";
    if (prev) {
      const prevRows = HT.coachRows().filter(a => C().hist.filter(h => h.mock === prev.mock).map(h => h.id).includes(a.sess));
      const a = CE.tally(prevRows, null), b = CE.tally(rows, null);
      cmp = `<p>So với bài thi thử trước (${esc(prev.date.split("-").reverse().join("/"))}): ${Math.round(a.acc * 100)}% → <b>${Math.round(b.acc * 100)}%</b>. ${TOPICS.map(tp => { const x = CE.tally(prevRows.filter(r => r.t === tp.id), null), y = CE.tally(rows.filter(r => r.t === tp.id), null); return x.n && y.n ? `${tp.id} ${Math.round(x.acc * 100)}→${Math.round(y.acc * 100)}%` : ""; }).filter(Boolean).join(" · ")}</p>`;
    }
    return `<section class="card section"><div class="card-head"><h2>Thời gian và so sánh</h2></div>
      <div class="grid grid-2">${parts.map((p, i) => `<div><h3>Phiên ${i + 1}: ${Math.round(p.reduce((s, r) => s + r.sec, 0) / 60)} phút</h3>${chart(p)}<p class="text-3 small">Đường nét đứt: nhịp 90 giây/câu. Đường liền trên nét đứt là chậm hơn nhịp.</p></div>`).join("")}</div>
      ${cmp}<p class="text-3 small">Website không công bố điểm đỗ (MPS) chính thức và không dự đoán xác suất đỗ.</p></section>`;
  }
})();

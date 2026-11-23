// ============================================================
// coach/store.js — Hoa Tiêu data layer (window.HT).
// The learner's Hoa Tiêu data lives inside the account (DATA.coach, version 2), so it follows the account:
// backups, deletion and profile isolation are the site's own. This file turns that data and the rest of the
// account (Practice answers, Question Bank marks) into what the engine reads, keeps the current plan and its
// versions, and records task completion. Pages are in coach/ui.js and coach/run.js.
// ============================================================
window.HT = (function () {
  "use strict";
  const CE = window.CoachEngine;
  const today = () => todayStr();
  const LV = { foundation: 1, application: 2, exam: 3, challenge: 3 };

  // ---------- the question pool (built-in questions + the Hoa Tiêu diagnostic bank) ----------
  let _pool = null;
  function pool() {
    if (_pool) return _pool;
    const rows = CE.normalizePool(STARTER_QUESTIONS), meta = new Map();
    STARTER_QUESTIONS.forEach((q, i) => meta.set(q.id, { ...rows[i], ans: q.ans }));
    const supply = {}; rows.forEach(q => { if (q.module) supply[q.module] = (supply[q.module] || 0) + 1; });
    _pool = { rows, meta, supply, weights: CE.weightsFromTopics(TOPICS), topicIds: TOPICS.map(t => t.id), mods: MODULES.map(m => ({ id: m.id, topic: m.topic, title: m.title })) };
    return _pool;
  }
  const metaOf = id => pool().meta.get(id) || null;

  // ---------- the stored data ----------
  function blank() {
    return { v: 2, profile: null, draft: null, self: { topic: {}, module: {}, rating: {} }, att: [], sess: null, mock: null, hist: [], plan: null, ver: [],
      learned: {}, confirmed: {}, rev: {}, log: {}, progress: {}, qbSnap: {}, lastAuto: null, attAtPlan: 0 };
  }
  function CO() {
    let c = DATA.coach;
    if (!c) c = DATA.coach = blank();
    else if (c.v !== 2) { c = DATA.coach = Object.assign(blank(), CE.migrateV1(c), { upgraded: today() }); }
    return c;
  }
  let gen = 0, saveOk = true;
  function save() { gen++; const ok = saveData(); saveOk = ok !== false; return saveOk; }
  const memo = {};
  function cached(key, fn) { if (memo[key] && memo[key].gen === gen && memo[key].pid === PROFILES.active) return memo[key].v; const v = fn(); memo[key] = { gen, pid: PROFILES.active, v }; return v; }
  function touch() { gen++; }

  // ---------- evidence ----------
  // Hoa Tiêu sessions (with time per question), the first answer to each question in Practice / Mock exams,
  // and Question Bank marks (latest mark per question, weight 0.6 in the engine)
  function siteRows() {
    const out = [];
    DATA.questions.forEach(q => {
      if (!q.attempts || !q.attempts.length || !q.topic) return;
      const a = q.attempts[0], m = metaOf(q.id);
      out.push({ q: q.id, t: q.topic, m: q.chapter || (m && m.module) || null, s: (m && m.skill) || q.los || q.chapter || q.topic, d: (m && m.diff) || LV[q.level] || 2,
        ok: !!a.correct, pick: a.picked || null, sec: 0, est: m ? m.est : null, calc: !!(m && m.isCalc), trap: false, ts: a.date || "", src: "site", sess: null });
    });
    return out;
  }
  function qbRows() {
    if (typeof QBANK_FILES === "undefined" || typeof qbSetModule !== "function") return [];
    const out = [];
    TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => {
      const fileId = f[2]; if (typeof qbSkipped === "function" && qbSkipped(fileId)) return;
      const st = (DATA.qbt || {})[fileId]; if (!st || !st.marks) return;
      const mod = qbSetModule(fileId);
      Object.entries(st.marks).forEach(([n, v]) => { if (v) out.push({ q: `qb|${fileId}|${n}`, t: t.id, m: mod, s: mod || t.id, d: null, ok: v === "r", pick: null, sec: 0, est: null, calc: false, trap: false, ts: "", src: "qb", sess: null }); });
    }));
    return out;
  }
  const coachRows = () => cached("coachRows", () => CO().att.map(p => CE.unpackAttempt(p, metaOf)).filter(Boolean));
  const rows = () => cached("rows", () => coachRows().concat(siteRows(), qbRows()));
  const analysis = () => cached("analysis", () => { const c = CO(), P = pool(); return CE.analyze(rows(), { weights: P.weights, topicIds: P.topicIds, selfRatings: c.self.rating }); });
  function sources() {
    const r = rows(), first = CE.firstAttempts(r), by = { coach: 0, site: 0, qb: 0 };
    first.forEach(a => { by[a.src === "qb" ? "qb" : a.src === "site" ? "site" : "coach"]++; });
    return by;
  }
  // questions already answered (any source), for picking fresh ones
  function seenIds() { const s = new Set(); DATA.questions.forEach(q => { if (q.attempts && q.attempts.length) s.add(q.id); }); CO().att.forEach(p => s.add(p[0])); return s; }
  function seenByModule() { const by = {}; seenIds().forEach(id => { const m = metaOf(id); if (m && m.module) by[m.module] = (by[m.module] || 0) + 1; }); return by; }
  // questions whose latest answer was wrong (for error reviews), newest first
  function mistakeIds() {
    const last = new Map();
    DATA.questions.forEach(q => { if (q.attempts && q.attempts.length && metaOf(q.id)) last.set(q.id, { ok: q.attempts[q.attempts.length - 1].correct, ts: q.attempts[q.attempts.length - 1].date || "" }); });
    coachRows().forEach(a => { const cur = last.get(a.q); if (a.ok !== null && (!cur || a.ts >= cur.ts)) last.set(a.q, { ok: a.ok, ts: a.ts }); });
    return [...last.entries()].filter(([, v]) => v.ok === false).sort((a, b) => (a[1].ts < b[1].ts ? 1 : -1)).map(([id]) => id);
  }

  // ---------- Question Bank sets on this device, by module ----------
  function qbReady() { return typeof qbiReady !== "function" || qbiReady(); }
  function qbByModule() {
    const out = {};
    if (typeof QBANK_FILES === "undefined" || typeof QBI === "undefined" || typeof qbSetModule !== "function" || !qbReady()) return out;
    TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => {
      const fileId = f[2], rec = QBI[fileId];
      if (!rec || !rec.questions || (typeof qbSkipped === "function" && qbSkipped(fileId))) return;
      const mod = qbSetModule(fileId); if (!mod) return;
      const st = typeof qbStats === "function" ? qbStats(fileId) : { done: 0 };
      (out[mod] = out[mod] || []).push({ fileId, title: f[1], total: rec.questions.length, done: st.done });
    }));
    return out;
  }
  function qbSetTitle(fileId) {
    if (typeof QBANK_FILES === "undefined") return fileId;
    for (const t of TOPICS) { const f = (QBANK_FILES[t.id] || []).find(x => x[2] === fileId); if (f) return `${t.id} · ${f[1]}`; }
    return fileId;
  }
  const qbDone = fileId => (typeof qbStats === "function" ? qbStats(fileId).done : 0);

  // ---------- profile ----------
  function parseBusy(text) {
    const out = [], bad = [];
    String(text || "").split(/[\s,;]+/).filter(Boolean).forEach(tok => {
      const [a, b] = tok.split("..");
      if (!CE.validDate(a) || (b && !CE.validDate(b)) || (b && b < a)) { bad.push(tok); return; }
      for (let d = a; d <= (b || a) && out.length < 1000; d = CE.addDays(d, 1)) out.push(d);
    });
    return { dates: out, bad };
  }
  function engineProfile() {
    const p = CO().profile;
    return { examDate: p.examDate, hoursPerDay: +p.hoursPerDay || 2, minutesByWeekday: p.byDay || null, studyDays: (p.studyDays || []).map(Number),
      busyDates: parseBusy(p.busy).dates, maxSessionMin: +p.maxSession || 90, breakMin: p.breakMin == null ? 10 : +p.breakMin, slot: p.slot || "evening" };
  }

  // ---------- the plan ----------
  let _plan = null, _planRef = null;
  function plan() { const c = CO(); if (!c.plan) return null; if (_planRef !== c.plan) { _plan = CE.unpackPlan(c.plan); _planRef = c.plan; } return _plan; }
  function commitPlan(p) { const c = CO(); c.plan = CE.packPlan(p); _plan = p; _planRef = c.plan; }
  function allTasks() { const p = plan(); return p ? p.days.flatMap(d => d.tasks) : []; }
  function findTask(id) { return allTasks().find(t => t.id === id) || null; }
  function doneKeys() { const o = {}; allTasks().forEach(t => { if (t.status !== "todo") o[t.key] = t.status; }); return o; }
  function missedTasks() { const t0 = today(); return allTasks().filter(t => t.date < t0 && t.status === "todo" && !["buffer", "final"].includes(t.type)); }
  function plannerState(an) {
    const c = CO(), P = pool(); an = an || analysis();
    return { modules: P.mods, weights: P.weights, analysis: an, statuses: c.self.module, topicStatus: c.self.topic, learned: c.learned, confirmed: c.confirmed, reviews: c.rev,
      progress: c.progress, supply: P.supply, seen: seenByModule(), qb: qbByModule(), remediation: an.remediation || [],
      hasDiagnostic: c.hist.some(h => CE.DIAG_KINDS.includes(h.kind)), done: doneKeys() };
  }
  // build a new plan (a re-plan when there is one already), keep today's finished tasks, add a version
  function newPlan(reason) {
    const c = CO(); if (!c.profile) return { error: "Chưa có hồ sơ học tập" };
    const prev = plan(), st = plannerState();
    let p = prev && !prev.error ? CE.replan(engineProfile(), st, today(), prev, c.log, reason).plan : CE.buildPlan(engineProfile(), st, today());
    if (p.error) return p;
    if (prev) {
      const t0 = prev.days.find(d => d.date === today()), d0 = p.days[0];
      if (t0 && d0 && d0.date === today()) {
        const keep = t0.tasks.filter(t => t.status !== "todo");
        if (keep.length) {
          d0.tasks = keep.concat(d0.tasks.filter(t => !keep.some(k => k.key === t.key)));
          d0.tasks.forEach((t, i) => { t.id = `${d0.date}_${i + 1}`; });
        }
      }
    }
    commitPlan(p);
    c.ver = CE.pushVersion(c.ver, p, reason, today());
    c.attAtPlan = c.att.length; c.lastAuto = today(); c.planNew = true;
    save();
    return p;
  }
  // once a day: re-plan when tasks were missed, when there are 10+ new answers, or when the profile changed
  function autoUpdate() {
    const c = CO(); if (!c.profile || c.sess) return null;
    if (c.lastAuto === today() && plan()) return null;
    const p = plan(), missed = missedTasks().length, fresh = c.att.length - (c.attAtPlan || 0) >= 10;
    const reason = !p ? "upgrade" : p.examDate !== c.profile.examDate ? "profile" : missed ? "missed-days" : fresh ? "progress" : null;
    c.lastAuto = today();
    if (!reason) { save(); return null; }
    const np = newPlan(reason);
    return np && !np.error ? { reason, missed, version: c.ver.length } : null;
  }

  // ---------- study log and history ----------
  function logMinutes(min, date) { const c = CO(); date = date || today(); c.log[date] = Math.round((c.log[date] || 0) + Math.max(0, min)); }
  const studied = () => Object.values(CO().log).reduce((s, x) => s + x, 0);

  // ---------- task completion ----------
  // session tasks are completed by their session (run.js); learn, Question Bank and self-directed tasks here
  function completeTask(id, ev) {
    const c = CO(), t = findTask(id);
    if (!t) return { status: "todo", reason: "Không tìm thấy nhiệm vụ (kế hoạch có thể vừa được cập nhật)" };
    if (t.status !== "todo") return { status: t.status };
    if (t.type === "qb") ev = { ...ev, qbDone: qbDone(t.fileId) - (c.qbSnap[id] != null ? c.qbSnap[id] : qbDone(t.fileId)) };
    const r = CE.completeTask(t, ev || {});
    if (r.status === "todo") return r;
    t.status = r.status; t.doneAt = today();
    if (t.type === "learn" && t.module) {
      c.progress[t.module] = (c.progress[t.module] || 0) + t.min;
      if (t.last !== false && !t.cont && t.part && t.part.split("/")[0] === t.part.split("/")[1]) markLearned(t.module, r.status);
    }
    if (!CE.SESSION_TASKS.includes(t.type)) logMinutes(t.min);
    commitPlan(plan()); save();
    return r;
  }
  function markLearned(mod, status) {
    const c = CO();
    if (c.learned[mod] !== "verified") c.learned[mod] = status;
    if (!c.rev[mod]) c.rev[mod] = CE.startReview(today());
  }
  function startQbTask(id) { const t = findTask(id); if (!t || t.type !== "qb") return; CO().qbSnap[id] = qbDone(t.fileId); save(); }

  // ---------- labels (Vietnamese) ----------
  const STATUS = [["none", "Chưa từng học"], ["partial", "Đã học một phần"], ["unclear", "Đã học hết nhưng chưa nhớ rõ"], ["solid", "Đã học kỹ"], ["confident", "Tự tin làm bài thi"]];
  const topicName = id => (topicById(id) || {}).name || id;
  const modTitle = id => (moduleById(id) || {}).title || id;
  const ROUND = { mini: "Luyện ngay sau khi học", r1: "Luyện", r2: "Luyện thêm", extra: "Luyện bổ sung", fix: "Luyện câu mới (khắc phục)" };
  function label(t) {
    const m = t.module ? `${t.module} ${modTitle(t.module)}` : "", part = t.part && t.part !== "1/1" ? ` — phần ${t.part}` : "";
    switch (t.type) {
      case "diag": return "Bài chẩn đoán 45 phút (30 câu, đủ 10 môn)";
      case "confirm": return `Kiểm tra xác nhận ${t.topic} (10 câu)`;
      case "learn": return `Học ${m}${part}${t.cont ? " (chưa xong)" : ""}`;
      case "practice": return `${ROUND[t.round] || "Luyện"}: ${m} (${t.n} câu)`;
      case "qb": return `Question Bank: ${qbSetTitle(t.fileId)} (${t.n} câu)`;
      case "test": return `Kiểm tra cuối topic ${t.topic} (${t.n} câu, 25 phút)`;
      case "check": return t.round === "fix" ? `Kiểm tra lại sau khắc phục: ${m} (${t.n} câu)` : t.round === "pre" ? `Kiểm tra kiến thức nền: ${m} (${t.n} câu)` : `Kiểm tra nhanh: ${m} (${t.n} câu)`;
      case "review": return `Ôn ngắt quãng: ${m} (${t.n || 5} câu)`;
      case "reread": return `Ôn lại ghi chú: ${m}`;
      case "mistakes": return `Ôn lỗi sai (tối đa ${t.n || 10} câu đã làm sai)`;
      case "formula": return "Ôn công thức bằng flashcards";
      case "mock": return `Thi thử ${t.mock || ""} — phiên ${t.part}/2 (90 câu, 135 phút)`;
      case "mockReview": return `Phân tích bài thi thử ${t.mock || ""} và ôn lỗi sai`;
      case "fixStudy": return `Khắc phục ${m}: học lại và xem lời giải từng bước${t.skill && t.skill !== t.module ? ` (${t.skill})` : ""}`;
      case "buffer": return "Dự phòng trong tuần: làm bù nhiệm vụ trễ hoặc ôn phần yếu";
      case "final": return "Ngày trước kỳ thi: ôn nhẹ công thức, xem lỗi đã gắn cờ, nghỉ ngơi sớm";
      default: return t.type;
    }
  }
  function reason(t) {
    switch (t.type) {
      case "diag": return "Đo trình độ thật của 10 môn để hiệu chỉnh kế hoạch";
      case "confirm": return "Bạn tự đánh giá đã học kỹ nhưng chưa có đủ bài làm: xác nhận thay vì học lại hoặc bỏ qua";
      case "learn": return "Còn khoảng trống kiến thức ở module này";
      case "practice": return t.round === "mini" ? "Củng cố ngay sau khi học bằng câu chưa làm" : "Đo lại và củng cố bằng câu chưa làm";
      case "qb": return "Luyện thêm bằng bộ câu hỏi của bạn trên thiết bị này";
      case "test": return "Kiểm tra cả topic sau khi học xong";
      case "check": return t.round === "fix" ? "Đo lại sau khi khắc phục, bằng câu mới" : t.round === "pre" ? "Kiểm tra kiến thức nền trước khi học lại" : "Xác nhận phần bạn đã báo là học xong";
      case "review": return "Đến hạn ôn để chống quên (1 → 3 → 7 → 14 → 30 ngày)";
      case "reread": return "Ôn lại kiến thức đã học";
      case "mistakes": return "Làm lại câu đã sai sau khi đã xem lời giải";
      case "formula": return "Giữ công thức trong trí nhớ";
      case "mock": return "Luyện điều kiện thi thật: 90 câu trong 135 phút";
      case "mockReview": return "Rút kinh nghiệm theo topic và cách phân bổ thời gian";
      case "fixStudy": return "Bạn sai nhiều câu liên tiếp ở phần này: học lại và xem lời giải trước khi luyện tiếp";
      case "buffer": return "Khoảng trống để lịch luôn khả thi";
      case "final": return "Không học nội dung mới trước ngày thi";
      default: return "";
    }
  }
  const REASON_LABEL = { setup: "Tạo từ hồ sơ", assessment: "Sau bài chẩn đoán", progress: "Có kết quả mới", "missed-days": "Bỏ lỡ nhiệm vụ", manual: "Bạn yêu cầu", profile: "Hồ sơ thay đổi", upgrade: "Nâng cấp Hoa Tiêu", update: "Cập nhật", mock: "Sau bài thi thử", test: "Sau bài kiểm tra" };

  return { CE, today, pool, metaOf, CO, blank, save, touch, saveOk: () => saveOk, cached, rows, coachRows, siteRows, qbRows, analysis, sources, seenIds, seenByModule, mistakeIds,
    qbReady, qbByModule, qbSetTitle, qbDone, parseBusy, engineProfile, plan, commitPlan, allTasks, findTask, missedTasks, plannerState, newPlan, autoUpdate,
    logMinutes, studied, completeTask, markLearned, startQbTask, STATUS, topicName, modTitle, label, reason, REASON_LABEL };
})();

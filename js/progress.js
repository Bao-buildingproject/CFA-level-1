// ============================================================
// progress.js — study plan: chapters, pace, Learning Ecosystem log
// ============================================================

const LES_URL = "https://learn.cfainstitute.org/accounts/1/external_tools/261?launch_type=global_navigation&toolId=practice-261";

const STATUS_ORDER = ["not_started", "learning", "done", "reviewed"];
const STATUS_LABEL = { not_started: "Not started", learning: "Learning", done: "Done", reviewed: "Reviewed" };

// ---------- Chapter logic ----------
function chaptersOf(topicId) {
  return DATA.chapters.filter(c => c.topic === topicId).sort((a, b) => a.order - b.order);
}

function addChaptersFromText(topicId, text) {
  const titles = text.split("\n").map(s => s.trim()).filter(Boolean);
  let order = chaptersOf(topicId).reduce((m, c) => Math.max(m, c.order), 0);
  titles.forEach(title => {
    order++;
    DATA.chapters.push({
      id: `${topicId}-${String(order).padStart(2, "0")}`,
      topic: topicId, order, title,
      status: "not_started", startedAt: null, doneAt: null
    });
  });
  saveData();
  return titles.length;
}

function cycleStatus(chapterId) {
  const ch = DATA.chapters.find(c => c.id === chapterId);
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(ch.status) + 1) % STATUS_ORDER.length];
  ch.status = next;
  if (next === "learning" && !ch.startedAt) ch.startedAt = todayStr();
  if (next === "done") ch.doneAt = todayStr();
  if (next === "not_started") { ch.startedAt = null; ch.doneAt = null; }
  saveData();
}

function topicProgress(topicId) {
  const chs = DATA.chapters.filter(c => c.topic === topicId);
  const done = chs.filter(c => c.status === "done" || c.status === "reviewed").length;
  return { total: chs.length, done, pct: pct(done, chs.length) };
}

function overallProgress() {
  const total = DATA.chapters.length;
  const done = DATA.chapters.filter(c => c.status === "done" || c.status === "reviewed").length;
  return { total, done, pct: pct(done, total) };
}

// ---------- Pace vs. the 15-week learning plan ----------
function expectedTopic() {
  const elapsedWeeks = daysBetween(DATA.settings.startDate, todayStr()) / 7;
  if (elapsedWeeks < 0) return TOPICS[0];
  let end = 0;
  for (const t of TOPICS) {
    end += t.plannedWeeks;
    if (elapsedWeeks < end) return t;
  }
  return null;
}

function currentTopic() {
  return TOPICS.find(t => {
    const p = topicProgress(t.id);
    return p.total === 0 || p.done < p.total;
  }) || null;
}

// Returns { tone, text } for a callout
function paceStatus() {
  const exp = expectedTopic();
  const cur = currentTopic();
  if (!exp) return { tone: "success", text: "Learning phase complete — focus on review and mock exams." };
  if (!cur) return { tone: "success", text: "All chapters done. Great work!" };
  if (topicProgress(cur.id).total === 0) {
    return { tone: "info", text: `Add the chapters of <a href="#/topic/${cur.id}">${cur.name}</a> to start tracking your pace.` };
  }
  if (cur.order < exp.order) return { tone: "warning", text: `Behind plan — the schedule says <strong>${exp.name}</strong>, you are on <strong>${cur.name}</strong>.` };
  if (cur.order > exp.order) return { tone: "success", text: `Ahead of plan — now on <strong>${cur.name}</strong>.` };
  return { tone: "success", text: `On track — current topic: <strong>${cur.name}</strong>.` };
}

// ---------- Learning Ecosystem logs ----------
function practiceSummary(topicId) {
  const logs = DATA.practiceLog.filter(p => p.topic === topicId);
  const c = logs.reduce((s, p) => s + p.correct, 0);
  const t = logs.reduce((s, p) => s + p.total, 0);
  return { sets: logs.length, correct: c, total: t, pct: t ? pct(c, t) : null };
}

// ================= STUDY PLAN PAGE (#/study) =================
function renderStudy() {
  const all = overallProgress();
  const pace = paceStatus();
  const exp = expectedTopic();
  let weekStart = 0;

  const rows = TOPICS.map(t => {
    const p = topicModuleProgress(t.id);
    const from = weekStart + 1;
    weekStart += t.plannedWeeks;
    const isNow = exp && exp.id === t.id;
    return `
      <a class="list-item" href="#/topic/${t.id}">
        <div class="list-main">
          <div class="row-gap">
            <span class="list-title">${t.order}. ${t.name}</span>
            ${isNow ? `<span class="badge badge-application">This week</span>` : ""}
          </div>
          <div class="list-meta">Weeks ${Math.ceil(from)}–${Math.ceil(weekStart)} · ${p.modules} modules · exam weight ${t.weight}</div>
          <div style="margin-top:8px">${progressBar(p.pct, p.pct === 100 ? "success" : "")}</div>
        </div>
        <div class="text-2 small mono" style="text-align:right;min-width:64px">${p.done}/${p.modules}<br>${p.pct}%</div>
        <span class="text-3">${icon("chevron", 18)}</span>
      </a>`;
  }).join("");

  view.innerHTML = `
    ${pageHeader("Study plan", "10 topics · 15 weeks of new material, then review and mock exams")}
    <div class="callout ${pace.tone}">${icon(pace.tone === "warning" ? "alert" : "target", 18)}<div>${pace.text}</div></div>

    <div class="grid grid-3 section">
      <div class="card stat"><span class="stat-label">Modules done</span><span class="stat-value">${all.done}<span class="text-3" style="font-size:1rem"> / ${all.total}</span></span>${progressBar(all.pct)}</div>
      <div class="card stat"><span class="stat-label">Current week</span><span class="stat-value">${Math.min(Math.max(countdownInfo().week, 1), 25)}<span class="text-3" style="font-size:1rem"> / 25</span></span><span class="stat-hint">${countdownInfo().phase}</span></div>
      <div class="card stat"><span class="stat-label">Days to exam</span><span class="stat-value">${Math.max(countdownInfo().daysLeft, 0)}</span><span class="stat-hint">${prettyDate(DATA.settings.examDate)}</span></div>
    </div>

    <div class="card section">
      <div class="card-head"><div><h2>Topics</h2><p class="text-2 small">Tap a topic to add chapters and update status.</p></div></div>
      <div class="list">${rows}</div>
    </div>

    <div class="card section">
      <div class="card-head"><h2>25-week roadmap</h2></div>
      <div class="list">
        <div class="list-item"><span class="badge badge-application">Weeks 1–15</span><div class="list-main">Learn new material, topic by topic</div></div>
        <div class="list-item"><span class="badge badge-foundation">Weeks 16–20</span><div class="list-main">Review everything · topic question practice</div></div>
        <div class="list-item"><span class="badge badge-exam">Weeks 21–25</span><div class="list-main">Full mock exams · fix weak areas</div></div>
      </div>
    </div>`;
}

// ================= TOPIC PAGE (#/topic/ETH) =================
let topicTab = "chapters";

function renderTopic(topicId) {
  const t = topicById(topicId);
  if (!t) return renderStudy();
  const p = topicProgress(t.id);
  const ps = practiceSummary(t.id);
  const qs = DATA.questions.filter(q => q.topic === t.id);
  const qStats = quizStats(qs);
  const openLes = DATA.lesMistakes.filter(m => m.topic === t.id && !m.resolved).length;

  view.innerHTML = `
    <a href="#/study" class="btn btn-ghost btn-sm" style="margin-bottom:12px;padding-left:6px">${icon("back", 18)} Study plan</a>
    ${pageHeader(`${t.order}. ${t.name}`, `Exam weight ${t.weight} · planned ${t.plannedWeeks} weeks`,
      `${testsHidden() ? "" : `<button class="btn btn-primary" id="btn-topic-mock" ${DATA.questions.some(q => q.topic === t.id) && !DATA.activeMock ? "" : "disabled"}>${icon("clock", 18)} ${t.id} mock test</button>`}
       ${t.id === "QM" ? `<a class="btn btn-secondary" href="#/dist">${icon("target", 18)} Distributions</a>` : ""}
       <a class="btn btn-secondary" href="#/analysis/${t.id}">${icon("alert", 18)} Weak spots</a>
       <a class="btn btn-secondary" href="${LES_URL}" target="_blank" rel="noopener">${icon("external", 18)} CFA Practice</a>`)}

    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">Modules done</span><span class="stat-value">${p.done}/${p.total}</span>${progressBar(p.pct, "success")}</div>
      <div class="card stat"><span class="stat-label">My question bank</span><span class="stat-value">${qStats.pct === null ? "–" : qStats.pct + "%"}</span><span class="stat-hint">${qs.length} questions</span></div>
      <div class="card stat"><span class="stat-label">CFA Practice</span><span class="stat-value">${ps.pct === null ? "–" : ps.pct + "%"}</span><span class="stat-hint">${ps.sets} set(s) logged</span></div>
      <div class="card stat"><span class="stat-label">To retry</span><span class="stat-value">${qStats.mistakes + openLes}</span><span class="stat-hint">mistakes</span></div>
    </div>

    <div class="card section">
      <div class="tabs" role="tablist">
        <button class="tab ${topicTab === "chapters" ? "active" : ""}" data-tab="chapters" role="tab">Modules</button>
        <button class="tab ${topicTab === "scores" ? "active" : ""}" data-tab="scores" role="tab">CFA Practice scores</button>
        <button class="tab ${topicTab === "les" ? "active" : ""}" data-tab="les" role="tab">Missed CFA questions ${openLes ? `<span class="badge badge-danger">${openLes}</span>` : ""}</button>
      </div>
      <div id="topic-tab"></div>
    </div>`;

  view.querySelectorAll(".tab").forEach(b => b.onclick = () => { topicTab = b.dataset.tab; renderTopic(topicId); });
  const tm = document.getElementById("btn-topic-mock"); if (tm) tm.onclick = () => confirmTopicMock(t.id, 30);
  ({ chapters: drawChaptersTab, scores: drawScoresTab, les: drawLesTab }[topicTab] || drawChaptersTab)(t);
}

function drawChaptersTab(t) {
  const box = document.getElementById("topic-tab");
  const mods = modulesOf(t.id);
  box.innerHTML = `
    <p class="text-2 small" style="margin-bottom:14px">Shaded area under each curve = how much of the module you've completed (status, practice questions and reading). Tap a module for details and its module test.</p>
    <div class="module-grid">${mods.map(m => moduleCardHtml(m)).join("")}</div>`;
  bindModuleCards(box, () => renderTopic(t.id));
}

function drawScoresTab(t) {
  const box = document.getElementById("topic-tab");
  const logs = DATA.practiceLog.filter(x => x.topic === t.id).slice().reverse();
  box.innerHTML = `
    <p class="text-2 small" style="margin-bottom:12px">After a practice set on CFA Learning Ecosystem, log your score here. The app can't read your CFA account, so this is entered by hand.</p>
    <div class="form-grid">
      <label class="field"><span class="field-label">Correct</span><input class="input" type="number" id="ps-correct" min="0" inputmode="numeric" placeholder="14"></label>
      <label class="field"><span class="field-label">Total questions</span><input class="input" type="number" id="ps-total" min="1" inputmode="numeric" placeholder="20"></label>
      <label class="field full"><span class="field-label">Note (optional)</span><input class="input" id="ps-note" placeholder="e.g. Chapter 2 practice set"></label>
    </div>
    <div class="form-actions"><button class="btn btn-primary" id="btn-add-ps">${icon("save", 18)} Save score</button></div>
    ${logs.length ? `<div class="table-wrap section"><table class="table">
      <thead><tr><th>Date</th><th>Note</th><th class="num">Score</th><th class="num">%</th></tr></thead>
      <tbody>${logs.map(x => `<tr><td>${prettyDate(x.date)}</td><td>${esc(x.note) || '<span class="text-3">—</span>'}</td>
        <td class="num">${x.correct}/${x.total}</td><td class="num"><strong>${pct(x.correct, x.total)}%</strong></td></tr>`).join("")}</tbody>
    </table></div>` : ""}`;

  document.getElementById("btn-add-ps").onclick = () => {
    const cEl = document.getElementById("ps-correct"), tEl = document.getElementById("ps-total");
    const c = parseInt(cEl.value, 10), tot = parseInt(tEl.value, 10);
    cEl.classList.toggle("invalid", isNaN(c) || c < 0 || (tot && c > tot));
    tEl.classList.toggle("invalid", isNaN(tot) || tot < 1);
    if (isNaN(c) || isNaN(tot) || tot < 1 || c < 0 || c > tot) { toast("Enter a valid score, e.g. 14 / 20", "error"); return; }
    DATA.practiceLog.push({ id: makeId("p"), date: todayStr(), topic: t.id, correct: c, total: tot, note: document.getElementById("ps-note").value.trim() });
    saveData(); renderTopic(t.id); toast("Score saved");
  };
}

function drawLesTab(t) {
  const box = document.getElementById("topic-tab");
  const open = DATA.lesMistakes.filter(m => m.topic === t.id && !m.resolved);
  const fixed = DATA.lesMistakes.filter(m => m.topic === t.id && m.resolved).length;
  box.innerHTML = `
    <div class="callout info">${icon("alert", 18)}<div>Write <strong>where</strong> the question is and, in your own words, <strong>why</strong> you missed it. Don't copy the question text. Retry it on Learning Ecosystem, then mark the result. Right twice in a row = fixed.</div></div>
    ${open.length ? `<div class="list section">${open.map(m => `
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${esc(m.ref)}</div>
          ${m.note ? `<div class="text-2 small" style="margin-top:2px">${esc(m.note)}</div>` : ""}
          <div class="list-meta">Logged ${prettyDate(m.date)} · right in a row: ${m.correctStreak}/2</div>
        </div>
        <button class="btn btn-sm btn-soft-success" data-right="${m.id}">Right</button>
        <button class="btn btn-sm btn-soft-danger" data-wrong="${m.id}">Wrong</button>
      </div>`).join("")}</div>`
      : emptyState("check", "Nothing to retry", fixed ? `${fixed} mistake(s) already fixed.` : "Log a missed CFA Practice question below.")}
    <details class="disclosure">
      <summary>${icon("chevron", 16)} Log a missed question</summary>
      <div class="form-grid">
        <label class="field full"><span class="field-label">Where is it?</span><input class="input" id="lm-ref" placeholder="Practice · Code and Standards · Q12"></label>
        <label class="field full"><span class="field-label">Why I missed it (your own words)</span><textarea class="textarea" id="lm-note" rows="3" placeholder="Mixed up Standard I(B) and I(C)"></textarea></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="btn-add-lm">${icon("save", 18)} Save</button></div>
    </details>`;

  const mark = (id, right) => {
    const m = DATA.lesMistakes.find(x => x.id === id);
    m.correctStreak = right ? m.correctStreak + 1 : 0;
    m.resolved = m.correctStreak >= 2;
    saveData(); renderTopic(t.id);
    toast(m.resolved ? "Fixed — removed from the list" : right ? "Nice — once more to fix it" : "Reset — try again later", right ? "success" : "error");
  };
  box.querySelectorAll("[data-right]").forEach(b => b.onclick = () => mark(b.dataset.right, true));
  box.querySelectorAll("[data-wrong]").forEach(b => b.onclick = () => mark(b.dataset.wrong, false));
  document.getElementById("btn-add-lm").onclick = () => {
    const ref = document.getElementById("lm-ref");
    if (!ref.value.trim()) { ref.classList.add("invalid"); ref.focus(); toast("Write where the question is", "error"); return; }
    DATA.lesMistakes.push({ id: makeId("m"), date: todayStr(), topic: t.id, chapter: null, ref: ref.value.trim(),
      note: document.getElementById("lm-note").value.trim(), correctStreak: 0, resolved: false });
    saveData(); renderTopic(t.id); toast("Mistake logged");
  };
}

// ================= MODULES =================
const STATUS_WEIGHT = { not_started: 0, learning: 0.35, done: 0.75, reviewed: 1 };

function chapterOf(moduleId) { return DATA.chapters.find(c => c.id === moduleId); }
function readingOf(moduleId) { return DATA.reading[moduleId] || (DATA.reading[moduleId] = { schweser: false, curriculum: false }); }

// Module completion (0–100) = 40% study status + 40% question mastery + 10% SchweserNotes + 10% curriculum
function moduleProgress(moduleId) {
  const ch = chapterOf(moduleId);
  const status = ch ? STATUS_WEIGHT[ch.status] || 0 : 0;
  const qs = DATA.questions.filter(q => q.chapter === moduleId);
  const mastered = qs.filter(q => q.attempts.length && q.attempts[q.attempts.length - 1].correct).length;
  const tried = qs.filter(q => q.attempts.length).length;
  const mastery = qs.length ? mastered / qs.length : 0;
  const rd = DATA.reading[moduleId] || {};
  const pctDone = Math.round(100 * (0.4 * status + 0.4 * mastery + 0.1 * (rd.schweser ? 1 : 0) + 0.1 * (rd.curriculum ? 1 : 0)));
  return { pct: pctDone, status: ch ? ch.status : "not_started", statusPct: Math.round(status * 100),
    questions: qs.length, tried, mastered, masteryPct: Math.round(mastery * 100), schweser: !!rd.schweser, curriculum: !!rd.curriculum };
}

function topicModuleProgress(topicId) {
  const mods = modulesOf(topicId);
  const avg = mods.length ? mods.reduce((s, m) => s + moduleProgress(m.id).pct, 0) / mods.length : 0;
  return { pct: Math.round(avg), modules: mods.length, done: mods.filter(m => ["done", "reviewed"].includes((chapterOf(m.id) || {}).status)).length };
}

function moduleTip(m, mp) {
  return `${m.id} · ${m.title}\nCompleted: ${mp.pct}%\nStatus: ${STATUS_LABEL[mp.status]}\nQuestions mastered: ${mp.mastered}/${mp.questions}\nSchweserNotes: ${mp.schweser ? "read" : "not yet"} · Curriculum: ${mp.curriculum ? "read" : "not yet"}`;
}

function moduleCardHtml(m) {
  const mp = moduleProgress(m.id);
  return `
    <div class="card module-card">
      <div class="mc-top">
        <a href="#/module/${m.id}" style="color:inherit"><div class="mc-num">MODULE ${m.n} · VOL ${m.vol}</div><h3>${esc(m.title)}</h3></a>
      </div>
      ${bellCurve(mp.pct, { width: 280, height: 74, compact: true, tip: moduleTip(m, mp) })}
      <div class="mc-foot">
        <button class="status-pill ${mp.status}" data-cycle="${m.id}" title="Change status">${STATUS_LABEL[mp.status]}</button>
        <span>${mp.mastered}/${mp.questions} Q</span>
        <a class="btn btn-ghost btn-sm" href="#/module/${m.id}">Open ${icon("chevron", 14)}</a>
      </div>
    </div>`;
}

function bindModuleCards(root, rerender) {
  root.querySelectorAll("[data-cycle]").forEach(b => b.onclick = () => { cycleStatus(b.dataset.cycle); rerender(); refreshShell(); });
  root.querySelectorAll("[data-read]").forEach(cb => cb.onchange = () => {
    const [id, kind] = cb.dataset.read.split("|");
    readingOf(id)[kind] = cb.checked; saveData();
    toast(cb.checked ? "Marked as read" : "Unmarked");
    rerender();
  });
}

// ================= MODULE PAGE (#/module/QM-01) =================
function renderModule(moduleId) {
  const m = moduleById(moduleId);
  if (!m) return renderStudy();
  const t = topicById(m.topic);
  const mp = moduleProgress(m.id);
  const book = SCHWESER_BOOKS.find(b => b.n === m.book);
  const qs = DATA.questions.filter(q => q.chapter === m.id);
  const mods = modulesOf(m.topic);
  const prev = mods[m.n - 2], next = mods[m.n];
  const byLevel = ["foundation", "application", "exam"].map(lv => {
    const l = qs.filter(q => q.level === lv);
    return { lv, n: l.length, ok: l.filter(q => q.attempts.length && q.attempts.at(-1).correct).length };
  });
  const testMinutes = Math.max(1, Math.ceil(qs.length * 1.5));

  view.innerHTML = `
    <a href="#/topic/${m.topic}" class="btn btn-ghost btn-sm" style="margin-bottom:12px;padding-left:6px">${icon("back", 18)} ${t.name}</a>
    ${pageHeader(esc(m.title), `${t.name} · Learning Module ${m.n} of ${mods.length} · Curriculum Vol ${m.vol} · SchweserNotes Book ${m.book}`,
      ["QM-05", "QM-06", "QM-07", "QM-09"].includes(m.id) ? `<a class="btn btn-primary" href="#/dist">${icon("target", 18)} Distributions lab</a>` : "")}

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h2>Completion</h2><button class="status-pill ${mp.status}" data-cycle="${m.id}">${STATUS_LABEL[mp.status]}</button></div>
        ${bellCurve(mp.pct, { width: 420, height: 150, tip: moduleTip(m, mp) })}
        <p class="text-3 small" style="margin-top:6px">Shaded area under the normal curve = share of the module completed.</p>
      </div>
      <div class="card">
        <div class="card-head"><h2>What counts</h2><span class="text-3 small">${mp.pct}% total</span></div>
        <div class="breakdown">
          <div class="bd-row"><span>Study status (40%)</span>${progressBar(mp.statusPct)}<span class="num">${mp.statusPct}%</span></div>
          <div class="bd-row"><span>Questions (40%)</span>${progressBar(mp.masteryPct, "accent")}<span class="num">${mp.mastered}/${mp.questions}</span></div>
          <div class="bd-row"><span>SchweserNotes (10%)</span>${progressBar(mp.schweser ? 100 : 0, "success")}<span class="num">${mp.schweser ? "Read" : "–"}</span></div>
          <div class="bd-row"><span>Curriculum (10%)</span>${progressBar(mp.curriculum ? 100 : 0, "success")}<span class="num">${mp.curriculum ? "Read" : "–"}</span></div>
        </div>
        <div class="row-gap" style="margin-top:16px">
          <label class="check-chip"><input type="checkbox" data-read="${m.id}|schweser" ${mp.schweser ? "checked" : ""}> Read in SchweserNotes</label>
          <label class="check-chip"><input type="checkbox" data-read="${m.id}|curriculum" ${mp.curriculum ? "checked" : ""}> Read in Curriculum</label>
        </div>
      </div>
    </div>

    ${testsHidden() ? "" : `<div class="card section">
      <div class="card-head"><div><h2>Module test</h2><p class="text-2 small">${qs.length} questions · ${testMinutes} min · exam conditions, answers shown after you submit</p></div></div>
      <div class="grid grid-3" style="gap:12px">
        ${byLevel.map(x => `<div class="stat"><span class="stat-label">${LEVELS[x.lv]}</span><span class="stat-value" style="font-size:1.3rem">${x.ok}/${x.n}</span><span class="stat-hint">mastered</span></div>`).join("")}
      </div>
      <div class="row-gap" style="margin-top:18px">
        <button class="btn btn-primary" id="btn-mod-test" ${qs.length && !DATA.activeMock ? "" : "disabled"}>${icon("clock", 18)} Start module test</button>
        <button class="btn btn-secondary" id="btn-mod-practice" ${qs.length ? "" : "disabled"}>${icon("check", 18)} Practice with feedback</button>
      </div>
      ${DATA.activeMock ? `<p class="text-3 small" style="margin-top:8px">Finish or discard the mock in progress first.</p>` : ""}
    </div>`}

    <div class="grid grid-2 section">
      <a class="card card-link" href="${book.url}" target="_blank" rel="noopener">
        <div class="row-gap"><div class="book-n">${book.n}</div><div><div class="stat-label">SchweserNotes Book ${book.n}</div><h3>${esc(book.title)}</h3><p class="text-3 small">Opens in Google Drive</p></div></div>
      </a>
      <a class="card card-link" href="${(CURRICULUM_VOLUMES.find(v => v.vol === m.vol) || {}).url || LES_URL}" target="_blank" rel="noopener">
        <div class="row-gap"><div class="book-n" style="background:var(--accent-soft);color:var(--accent)">V${m.vol}</div><div><div class="stat-label">CFA Institute curriculum</div><h3>Curriculum 2027 · Vol ${m.vol}, LM ${m.n}</h3><p class="text-3 small">Opens the volume PDF in Google Drive</p></div></div>
      </a>
    </div>

    <div class="row-between section">
      ${prev ? `<a class="btn btn-secondary" href="#/module/${prev.id}">${icon("prev", 18)} Module ${prev.n}</a>` : "<span></span>"}
      ${next ? `<a class="btn btn-secondary" href="#/module/${next.id}">Module ${next.n} ${icon("next", 18)}</a>` : "<span></span>"}
    </div>`;

  bindModuleCards(view, () => renderModule(m.id));
  const mt = document.getElementById("btn-mod-test"), mp2 = document.getElementById("btn-mod-practice");
  if (mt) mt.onclick = async () => {
    if (!await confirmDialog({ title: "Start module test?", message: `${qs.length} questions · ${testMinutes} minutes. The timer starts right away.`, confirmText: "Start now" })) return;
    startMock("module", { name: `Module test · ${m.id} ${m.title}`, modules: [m.id], sessions: [{ count: qs.length, minutes: testMinutes }] });
  };
  if (mp2) mp2.onclick = () => startQuiz(shuffle(qs));
}

// ================= SCHWESERNOTES (#/schweser) =================
function readingTable(kind) {
  return TOPICS.map(t => {
    const mods = modulesOf(t.id);
    const read = mods.filter(m => (DATA.reading[m.id] || {})[kind]).length;
    return { t, mods, read };
  });
}

function moduleChecklistHtml(mods, kind) {
  return `<div class="list">${mods.map(m => {
    const rd = DATA.reading[m.id] || {};
    const mp = moduleProgress(m.id);
    return `<div class="list-item">
      <label class="check-chip" style="padding:6px"><input type="checkbox" data-read="${m.id}|${kind}" ${rd[kind] ? "checked" : ""} aria-label="Mark ${esc(m.title)} as read"></label>
      <a class="list-main" href="#/module/${m.id}" style="color:inherit">
        <div class="list-title">${m.n}. ${esc(m.title)}</div>
        <div class="list-meta">${moduleLabel(m)} · ${mp.pct}% complete</div>
      </a>
      <div style="width:90px" class="hide-mobile">${bellCurve(mp.pct, { width: 90, height: 34, compact: true, showLabel: false, tip: moduleTip(m, mp) })}</div>
    </div>`;
  }).join("")}</div>`;
}

function renderSchweser() {
  const rows = readingTable("schweser");
  const total = MODULES.length, read = rows.reduce((s, r) => s + r.read, 0);
  view.innerHTML = `
    ${pageHeader("SchweserNotes", `2026 Level I · 4 books · ${read}/${total} readings marked as read`)}
    <div class="grid grid-2">
      ${SCHWESER_BOOKS.map(b => {
        const bm = MODULES.filter(m => m.book === b.n);
        const br = bm.filter(m => (DATA.reading[m.id] || {}).schweser).length;
        return `<div class="card book-card">
          <div class="row-gap" style="align-items:flex-start;flex-wrap:nowrap"><div class="book-n">${b.n}</div>
            <div style="flex:1;min-width:0"><div class="stat-label">Book ${b.n} · ${b.topics.join(", ")} · 2026 edition</div><h3 style="margin:2px 0 10px">${esc(b.title)}</h3>
              ${progressBar(pct(br, bm.length), "success")}<div class="text-2 small" style="margin-top:6px">${br}/${bm.length} readings read</div></div></div>
          <a class="btn btn-secondary btn-sm" style="margin-top:14px" href="${b.url}" target="_blank" rel="noopener">${icon("external", 16)} Open PDF in Drive</a>
        </div>`;
      }).join("")}
    </div>
    ${SCHWESER_BOOKS.map(b => `
      <div class="card section">
        <div class="card-head"><h2>Book ${b.n}</h2><a class="small" href="${b.url}" target="_blank" rel="noopener">Open PDF</a></div>
        ${b.topics.map(tid => { const t = topicById(tid); return `<div class="section-title" style="margin-top:10px">${t.name}</div>${moduleChecklistHtml(modulesOf(tid), "schweser")}`; }).join("")}
      </div>`).join("")}
    <p class="text-3 small section">The PDFs stay in your Google Drive; only you can open these links.</p>`;
  bindModuleCards(view, renderSchweser);
}

// ================= CURRICULUM (#/curriculum) =================
function renderCurriculum() {
  const rows = readingTable("curriculum");
  const total = MODULES.length, read = rows.reduce((s, r) => s + r.read, 0);
  view.innerHTML = `
    ${pageHeader("Curriculum", `CFA Program 2027 Level I · 10 volumes · 102 learning modules · ${read}/${total} read`,
      `<a class="btn btn-secondary" href="${LES_URL}" target="_blank" rel="noopener">${icon("external", 18)} Learning Ecosystem</a>`)}
    <div class="section-title">2027 curriculum volumes</div>
    <div class="grid grid-3" style="margin-bottom:16px">${CURRICULUM_VOLUMES.map(v => {
      const mods = modulesOf(v.topic); const rd = mods.filter(m => (DATA.reading[m.id] || {}).curriculum).length;
      return `<a class="card card-link" href="${v.url}" target="_blank" rel="noopener">
        <div class="row-gap" style="flex-wrap:nowrap;align-items:flex-start"><div class="book-n" style="background:var(--accent-soft);color:var(--accent)">V${v.vol}</div>
          <div style="flex:1;min-width:0"><div class="stat-label">Volume ${v.vol} · ${mods.length} modules</div><h3 style="margin:2px 0 8px">${esc(v.title)}</h3>
            ${progressBar(pct(rd, mods.length), "success")}<div class="text-3 small" style="margin-top:4px">${rd}/${mods.length} read · opens PDF</div></div></div></a>`;
    }).join("")}</div>
    <div class="card">
      <div class="card-head"><h2>Topics</h2><span class="text-3 small">exam weight · modules read</span></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Topic</th><th class="num">Weight 2027</th><th class="num hide-mobile">2026</th><th class="num">Modules</th><th>Read</th><th class="num">Complete</th></tr></thead>
        <tbody>${rows.map(r => { const tp = topicModuleProgress(r.t.id); return `<tr>
          <td><a href="#/topic/${r.t.id}">${r.t.name}</a></td><td class="num"><strong>${r.t.weight}</strong></td><td class="num hide-mobile text-3">${r.t.weight2026}</td><td class="num">${r.mods.length}</td>
          <td style="min-width:120px">${progressBar(pct(r.read, r.mods.length), "success")}</td><td class="num">${tp.pct}%</td></tr>`; }).join("")}</tbody>
      </table></div>
    </div>
    ${rows.map(r => `
      <div class="card section">
        <div class="card-head"><div><h2>${r.t.name}</h2><p class="text-2 small">${r.mods.length} modules · exam weight ${r.t.weight} · ${r.read} read</p></div>
          <a class="btn btn-ghost btn-sm" href="#/topic/${r.t.id}">Topic ${icon("chevron", 14)}</a></div>
        ${moduleChecklistHtml(r.mods, "curriculum")}
      </div>`).join("")}`;
  bindModuleCards(view, renderCurriculum);
}

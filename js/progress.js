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
    const p = topicProgress(t.id);
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
          <div class="list-meta">Weeks ${Math.ceil(from)}–${Math.ceil(weekStart)} · exam weight ${t.weight}</div>
          <div style="margin-top:8px">${progressBar(p.pct, p.pct === 100 ? "success" : "")}</div>
        </div>
        <div class="text-2 small mono" style="text-align:right;min-width:64px">${p.done}/${p.total}<br>${p.pct}%</div>
        <span class="text-3">${icon("chevron", 18)}</span>
      </a>`;
  }).join("");

  view.innerHTML = `
    ${pageHeader("Study plan", "10 topics · 15 weeks of new material, then review and mock exams")}
    <div class="callout ${pace.tone}">${icon(pace.tone === "warning" ? "alert" : "target", 18)}<div>${pace.text}</div></div>

    <div class="grid grid-3 section">
      <div class="card stat"><span class="stat-label">Chapters done</span><span class="stat-value">${all.done}<span class="text-3" style="font-size:1rem"> / ${all.total}</span></span>${progressBar(all.pct)}</div>
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
      `<a class="btn btn-secondary" href="${LES_URL}" target="_blank" rel="noopener">${icon("external", 18)} CFA Practice</a>`)}

    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">Chapters</span><span class="stat-value">${p.done}/${p.total}</span>${progressBar(p.pct, "success")}</div>
      <div class="card stat"><span class="stat-label">My question bank</span><span class="stat-value">${qStats.pct === null ? "–" : qStats.pct + "%"}</span><span class="stat-hint">${qs.length} questions</span></div>
      <div class="card stat"><span class="stat-label">CFA Practice</span><span class="stat-value">${ps.pct === null ? "–" : ps.pct + "%"}</span><span class="stat-hint">${ps.sets} set(s) logged</span></div>
      <div class="card stat"><span class="stat-label">To retry</span><span class="stat-value">${qStats.mistakes + openLes}</span><span class="stat-hint">mistakes</span></div>
    </div>

    <div class="card section">
      <div class="tabs" role="tablist">
        <button class="tab ${topicTab === "chapters" ? "active" : ""}" data-tab="chapters" role="tab">Chapters</button>
        <button class="tab ${topicTab === "scores" ? "active" : ""}" data-tab="scores" role="tab">CFA Practice scores</button>
        <button class="tab ${topicTab === "les" ? "active" : ""}" data-tab="les" role="tab">Missed CFA questions ${openLes ? `<span class="badge badge-danger">${openLes}</span>` : ""}</button>
      </div>
      <div id="topic-tab"></div>
    </div>`;

  view.querySelectorAll(".tab").forEach(b => b.onclick = () => { topicTab = b.dataset.tab; renderTopic(topicId); });
  ({ chapters: drawChaptersTab, scores: drawScoresTab, les: drawLesTab }[topicTab] || drawChaptersTab)(t);
}

function drawChaptersTab(t) {
  const box = document.getElementById("topic-tab");
  const chs = chaptersOf(t.id);
  box.innerHTML = `
    ${chs.length ? `<div class="list">${chs.map(c => `
      <div class="list-item">
        <span class="text-3 mono small" style="width:22px">${c.order}</span>
        <div class="list-main">
          <div class="list-title">${esc(c.title)}</div>
          ${c.doneAt ? `<div class="list-meta">Completed ${prettyDate(c.doneAt)}</div>` : c.startedAt ? `<div class="list-meta">Started ${prettyDate(c.startedAt)}</div>` : ""}
        </div>
        <button class="status-pill ${c.status}" data-cycle="${c.id}" title="Change status">${STATUS_LABEL[c.status]}</button>
        <button class="icon-btn danger" data-del="${c.id}" aria-label="Delete chapter">${icon("trash", 18)}</button>
      </div>`).join("")}</div>`
      : emptyState("book", "No chapters yet", "Open your curriculum's table of contents and paste the chapter (Learning Module) names below.")}
    <details class="disclosure" ${chs.length ? "" : "open"}>
      <summary>${icon("chevron", 16)} Add chapters</summary>
      <div>
        <label class="field"><span class="field-label">One chapter per line, in curriculum order</span>
          <textarea class="textarea" id="ch-input" rows="5" placeholder="Rates and Returns&#10;Time Value of Money in Finance"></textarea></label>
        <div class="form-actions"><button class="btn btn-primary" id="btn-add-ch">${icon("plus", 18)} Add chapters</button></div>
      </div>
    </details>
    <p class="text-3 small" style="margin-top:12px">Status cycles: Not started → Learning → Done → Reviewed.</p>`;

  box.querySelectorAll("[data-cycle]").forEach(b => b.onclick = () => { cycleStatus(b.dataset.cycle); renderTopic(t.id); });
  box.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "Delete chapter?", message: "This removes the chapter from your plan.", confirmText: "Delete", danger: true })) return;
    DATA.chapters = DATA.chapters.filter(c => c.id !== b.dataset.del);
    saveData(); renderTopic(t.id); toast("Chapter deleted");
  });
  document.getElementById("btn-add-ch").onclick = () => {
    const input = document.getElementById("ch-input");
    const n = addChaptersFromText(t.id, input.value);
    if (!n) { input.classList.add("invalid"); input.focus(); return; }
    renderTopic(t.id); toast(`${n} chapter(s) added`);
  };
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

// ============================================================
// progress.js — chapters, study pace, Learning Ecosystem log
// ============================================================

// Link to CFA Institute Learning Ecosystem practice (you log in there)
const LES_URL = "https://learn.cfainstitute.org/accounts/1/external_tools/261?launch_type=global_navigation&toolId=practice-261";

const STATUS_ORDER = ["not_started", "learning", "done", "reviewed"];
const STATUS_LABEL = {
  not_started: "⚪ Not started",
  learning: "🔵 Learning",
  done: "🟢 Done",
  reviewed: "⭐ Reviewed"
};

// ---------- Chapter helpers ----------
function chaptersOf(topicId) {
  return DATA.chapters
    .filter(c => c.topic === topicId)
    .sort((a, b) => a.order - b.order);
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

function deleteChapter(chapterId) {
  DATA.chapters = DATA.chapters.filter(c => c.id !== chapterId);
  saveData();
}

function overallProgress() {
  const total = DATA.chapters.length;
  const done = DATA.chapters.filter(c => c.status === "done" || c.status === "reviewed").length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ---------- Study pace: compare with the 15-week plan ----------
function expectedTopic() {
  const elapsedWeeks = daysBetween(DATA.settings.startDate, todayStr()) / 7;
  let end = 0;
  for (const t of TOPICS) {
    end += t.plannedWeeks;
    if (elapsedWeeks < end) return t;
  }
  return null; // past week 15: review phase
}

function currentTopic() {
  // First topic (in study order) that is not fully done yet
  return TOPICS.find(t => {
    const p = topicProgress(t.id);
    return p.total === 0 || p.done < p.total;
  }) || null;
}

function paceNotice() {
  const exp = expectedTopic();
  const cur = currentTopic();
  if (!exp) return `<div class="notice ok">📚 Learning phase is over — time to review!</div>`;
  if (!cur) return `<div class="notice ok">🎉 All chapters done!</div>`;
  if (topicProgress(cur.id).total === 0) {
    return `<div class="notice warn">➕ Add chapters for <a href="#topic/${cur.id}">${cur.name}</a> to start tracking.</div>`;
  }
  if (cur.order < exp.order) {
    return `<div class="notice warn">⏰ Behind plan: you should be on <strong>${exp.name}</strong>, you are on <strong>${cur.name}</strong>.</div>`;
  }
  if (cur.order > exp.order) {
    return `<div class="notice ok">🚀 Ahead of plan! Now on <strong>${cur.name}</strong>.</div>`;
  }
  return `<div class="notice ok">✅ On track: <strong>${cur.name}</strong>.</div>`;
}

// ---------- Learning Ecosystem: practice scores ----------
function addPracticeScore(topicId, correct, total, note) {
  DATA.practiceLog.push({ id: makeId("p"), date: todayStr(), topic: topicId, correct, total, note });
  saveData();
}

function practiceSummary(topicId) {
  const logs = DATA.practiceLog.filter(p => p.topic === topicId);
  const c = logs.reduce((s, p) => s + p.correct, 0);
  const t = logs.reduce((s, p) => s + p.total, 0);
  return { sets: logs.length, correct: c, total: t, pct: t ? Math.round((c / t) * 100) : null };
}

// ---------- Learning Ecosystem: missed questions ----------
// Correct 2 times in a row on re-try => removed from the open list
function addLesMistake(topicId, chapterId, ref, note) {
  DATA.lesMistakes.push({
    id: makeId("m"), date: todayStr(), topic: topicId, chapter: chapterId || null,
    ref, note, correctStreak: 0, resolved: false
  });
  saveData();
}

function retryLesMistake(id, gotItRight) {
  const m = DATA.lesMistakes.find(x => x.id === id);
  m.correctStreak = gotItRight ? m.correctStreak + 1 : 0;
  m.resolved = m.correctStreak >= 2;
  saveData();
}

// ================= TOPIC PAGE (#topic/ETH) =================
function renderTopic(topicId) {
  const t = topicById(topicId);
  if (!t) return renderDashboard();
  const p = topicProgress(t.id);
  const chs = chaptersOf(t.id);
  const ps = practiceSummary(t.id);
  const openMistakes = DATA.lesMistakes.filter(m => m.topic === t.id && !m.resolved);
  const closed = DATA.lesMistakes.filter(m => m.topic === t.id && m.resolved).length;

  const chapterList = chs.length ? chs.map(c => `
      <div class="row">
        <div class="row-main">
          <div><strong>${c.order}.</strong> ${esc(c.title)}</div>
          ${c.doneAt ? `<div class="muted">done ${c.doneAt}</div>` : ""}
        </div>
        <button class="btn secondary status-btn" data-cycle="${c.id}">${STATUS_LABEL[c.status]}</button>
        <button class="icon-btn" data-del="${c.id}" title="Delete">🗑</button>
      </div>`).join("")
    : `<p class="muted">No chapters yet. Paste them below from your curriculum's table of contents.</p>`;

  const chapterOptions = chs.map(c => `<option value="${c.id}">${c.order}. ${esc(c.title)}</option>`).join("");

  const practiceRows = DATA.practiceLog.filter(x => x.topic === t.id).slice(-5).reverse().map(x =>
    `<div class="muted">${x.date} · <strong>${x.correct}/${x.total}</strong> (${Math.round(x.correct / x.total * 100)}%) ${esc(x.note)}</div>`
  ).join("");

  const mistakeRows = openMistakes.map(m => `
      <div class="row">
        <div class="row-main">
          <div><strong>${esc(m.ref)}</strong> <span class="muted">· ${m.date}</span></div>
          <div>${esc(m.note)}</div>
          <div class="muted">Correct in a row: ${m.correctStreak}/2</div>
        </div>
        <div style="display:flex;flex-direction:column">
          <button class="btn good small" data-right="${m.id}">✔ Right</button>
          <button class="btn bad small" data-wrong="${m.id}">✘ Wrong</button>
        </div>
      </div>`).join("");

  view.innerHTML = `
    <a href="#dashboard" class="back">← Home</a>
    <section class="card">
      <h2>${t.order}. ${t.name}</h2>
      <div class="muted">Exam weight ${t.weight} · plan ${t.plannedWeeks} weeks</div>
      <div class="bar"><div style="width:${p.pct}%"></div></div>
      <div class="muted">${p.done}/${p.total} chapters done · ${p.pct}%</div>
    </section>

    <section class="card">
      <h2>Chapters</h2>
      <p class="muted">Tap the status button to change it.</p>
      ${chapterList}
      <details ${chs.length ? "" : "open"} style="margin-top:12px">
        <summary><strong>➕ Add chapters</strong></summary>
        <p class="muted">One chapter per line, in curriculum order.</p>
        <textarea id="ch-input" rows="6" placeholder="Rates and Returns&#10;Time Value of Money in Finance&#10;..."></textarea>
        <button class="btn" id="btn-add-ch">Add</button>
      </details>
    </section>

    <section class="card">
      <h2>CFA Practice scores</h2>
      <a class="btn secondary" href="${LES_URL}" target="_blank" rel="noopener">🔗 Open CFA Practice</a>
      <p>${ps.sets ? `Total: <strong>${ps.correct}/${ps.total} (${ps.pct}%)</strong> in ${ps.sets} set(s)` : `<span class="muted">No scores yet.</span>`}</p>
      ${practiceRows}
      <div class="form-line">
        <input type="number" id="ps-correct" min="0" placeholder="Correct" inputmode="numeric">
        <span>/</span>
        <input type="number" id="ps-total" min="1" placeholder="Total" inputmode="numeric">
      </div>
      <input type="text" id="ps-note" placeholder="Note (optional), e.g. chapter 2 set">
      <button class="btn" id="btn-add-ps">Save score</button>
    </section>

    <section class="card">
      <h2>Missed CFA Practice questions</h2>
      <p class="muted">Write WHERE the question is and, in your own words, WHY you missed it.
      Do not copy the question text. Re-try it on Learning Ecosystem, then tap Right/Wrong.</p>
      ${mistakeRows || `<p class="muted">No open mistakes. 👍</p>`}
      ${closed ? `<p class="muted">${closed} mistake(s) fixed (right 2× in a row).</p>` : ""}
      <details style="margin-top:12px">
        <summary><strong>➕ Log a missed question</strong></summary>
        <select id="lm-chapter"><option value="">— chapter (optional) —</option>${chapterOptions}</select>
        <input type="text" id="lm-ref" placeholder="Where? e.g. Practice · Rates and Returns · Q12">
        <textarea id="lm-note" rows="3" placeholder="Why I missed it / key point to remember (your own words)"></textarea>
        <button class="btn" id="btn-add-lm">Save mistake</button>
      </details>
    </section>`;

  // ----- wire up buttons -----
  view.querySelectorAll("[data-cycle]").forEach(b =>
    b.onclick = () => { cycleStatus(b.dataset.cycle); renderTopic(topicId); });

  view.querySelectorAll("[data-del]").forEach(b =>
    b.onclick = () => {
      if (confirm("Delete this chapter?")) { deleteChapter(b.dataset.del); renderTopic(topicId); }
    });

  document.getElementById("btn-add-ch").onclick = () => {
    const n = addChaptersFromText(topicId, document.getElementById("ch-input").value);
    if (n) renderTopic(topicId);
  };

  document.getElementById("btn-add-ps").onclick = () => {
    const c = parseInt(document.getElementById("ps-correct").value, 10);
    const tot = parseInt(document.getElementById("ps-total").value, 10);
    if (isNaN(c) || isNaN(tot) || tot < 1 || c < 0 || c > tot) {
      alert("Please enter a valid score, e.g. 14 / 20.");
      return;
    }
    addPracticeScore(topicId, c, tot, document.getElementById("ps-note").value.trim());
    renderTopic(topicId);
  };

  document.getElementById("btn-add-lm").onclick = () => {
    const ref = document.getElementById("lm-ref").value.trim();
    const note = document.getElementById("lm-note").value.trim();
    if (!ref) { alert("Please write where the question is."); return; }
    addLesMistake(topicId, document.getElementById("lm-chapter").value, ref, note);
    renderTopic(topicId);
  };

  view.querySelectorAll("[data-right]").forEach(b =>
    b.onclick = () => { retryLesMistake(b.dataset.right, true); renderTopic(topicId); });
  view.querySelectorAll("[data-wrong]").forEach(b =>
    b.onclick = () => { retryLesMistake(b.dataset.wrong, false); renderTopic(topicId); });
}

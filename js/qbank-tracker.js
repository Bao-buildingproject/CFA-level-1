// ============================================================
// qbank-tracker.js — the Question Bank page: sets, marks, redo lists and mocks
// ============================================================

const QB_MARKS = ["", "r", "w", "g"];               // none → right → wrong → guessed
const QB_LABEL = { r: "Right", w: "Wrong", g: "Guessed" };

function qbState(fileId) {
  DATA.qbt = DATA.qbt || {};
  return DATA.qbt[fileId] || (DATA.qbt[fileId] = { count: 0, marks: {} });
}

// A set is skipped if it's outside the 2027 curriculum (unless you un-skip it) or you skipped it
function qbSkipped(fileId) {
  const st = (DATA.qbt || {})[fileId];
  if (st && typeof st.skip === "boolean") return st.skip;
  return QBANK_NOT_2027.has(fileId);
}
let qbShowSkipped = false;

function qbStats(fileId) {
  const s = (DATA.qbt || {})[fileId] || { count: 0, marks: {} };
  const vals = Object.values(s.marks);
  const right = vals.filter(v => v === "r").length;
  const done = vals.filter(Boolean).length;
  const redo = Object.entries(s.marks).filter(([, v]) => v === "w" || v === "g").map(([k]) => +k).sort((a, b) => a - b);
  return { count: s.count, done, right, pct: done ? pct(right, done) : null, redo };
}

function qbTopicStats(topic) {
  const files = QBANK_FILES[topic] || [];
  let count = 0, done = 0, right = 0;
  const active = files.filter(f => !qbSkipped(f[2]));
  active.forEach(f => { const s = qbStats(f[2]); count += s.count; done += s.done; right += s.right; });
  return { files: active.length, skipped: files.length - active.length, count, done, right, pct: done ? pct(right, done) : null };
}

// Share of practice per topic, from the 2027 weights (midpoints, scaled to 100)
function weightShare(t) {
  const mid = x => { const [a, b] = x.weight.replace("%", "").split("–").map(Number); return (a + b) / 2; };
  const total = TOPICS.reduce((s, x) => s + mid(x), 0);
  return Math.round((mid(t) / total) * 100);
}

// Shown only while this device has no sets to answer
function qbImportButtonHtml() {
  return `<label class="btn btn-primary" style="margin-top:16px">${icon("upload", 18)} Import question pack<input type="file" id="qb-pack" accept=".json,application/json" multiple hidden></label>`;
}
const QB_EMPTY_HINT = "Press <strong>Import question pack</strong> and choose the <code>.cfaqb.json</code> files (you can pick all ten at once). The sets then show up here with a <strong>Do it</strong> button. They stay in this browser and every account on it can use them, so import them once on each device.";
let qbOpen = null;
let qbBulkReport = null;

// Sets of the last import, grouped by topic: { topicId: { t, sets, q, noKey } }
function qbReportByTopic(r) {
  const by = {};
  (r ? r.sets : []).forEach(x => {
    const info = qbFileInfo(x.fileId);
    if (!info) return;
    const g = by[info.topic.id] = by[info.topic.id] || { t: info.topic, sets: 0, q: 0, noKey: 0 };
    g.sets++; g.q += x.n; g.noKey += x.missingAns || 0;
  });
  return by;
}
function qbReportHtml(r) {
  const q = r.sets.reduce((a, x) => a + x.n, 0);
  const by = qbReportByTopic(r), groups = TOPICS.filter(t => by[t.id]).map(t => by[t.id]);
  const noKey = groups.reduce((n, g) => n + g.noKey, 0);
  return `<div class="callout ${r.sets.length ? "success" : "danger"} qb-report">${icon(r.sets.length ? "check" : "alert", 18)}<div style="flex:1;min-width:0">
      <strong>Import finished · ${r.sets.length} sets · ${q.toLocaleString("en-US")} questions.</strong> ${r.sets.length ? "Each set went into its topic — open a topic below to answer it." : ""}
      ${groups.length ? `<div class="qb-chips">${groups.map(g => `<a class="qb-chip" href="#/qbank/topic/${g.t.id}"><span class="mono">${String(TOPICS.indexOf(g.t) + 1).padStart(2, "0")}</span>${g.t.name}<span class="qb-chip-n">${g.sets} set${g.sets === 1 ? "" : "s"}</span></a>`).join("")}</div>` : ""}
      ${noKey ? `<div class="text-2 small" style="margin-top:8px">${noKey} question${noKey === 1 ? " has" : "s have"} ${r.pack ? "no answer key in the source — shown, not scored" : "no answer mark and were left out"}.</div>` : ""}
      ${r.failed.length ? `<div style="margin-top:8px"><strong>Not imported:</strong><br>${r.failed.map(esc).join("<br>")}</div>` : ""}
      ${r.skipped.length ? `<p class="text-3 small" style="margin-top:8px">Skipped: ${r.skipped.map(esc).join(", ")}</p>` : ""}
    </div>
    <button class="btn btn-ghost btn-sm" id="qb-report-close">Close</button>
  </div>`;
}

function renderQBank(sub, fileId, mode) {
  if (!qbiReady()) {
    view.innerHTML = `${pageHeader("Question Bank")}<p class="text-2">Loading…</p>`;
    const h = location.hash;
    qbiLoad().then(() => { if (location.hash === h) renderQBank(sub, fileId, mode); });
    return;
  }
  if (sub === "import" && fileId) return renderQBImport(fileId);
  if (sub === "do" && fileId) return renderQBDo(fileId, mode);
  qbRun = null;
  if (sub === "topic" && fileId) return renderQBTopic(fileId);
  const all = TOPICS.reduce((a, t) => { const s = qbTopicStats(t.id); a.done += s.done; a.right += s.right; return a; }, { done: 0, right: 0 });
  const added = qbReportByTopic(qbBulkReport);
  const tiles = TOPICS.map((t, i) => ({ ...qbTopicSummary(t, i), added: added[t.id] ? added[t.id].sets : 0 }));
  const sets = tiles.reduce((n, x) => n + x.sets, 0), redo = tiles.reduce((n, x) => n + x.redo, 0);

  view.innerHTML = `
    ${pageHeader("Question Bank", sets ? `10 topics · ${sets} sets on this device · pick a topic to see its sets` : "Your question sets, answered right here")}
    <div id="qb-progress"></div>
    ${qbBulkReport ? qbReportHtml(qbBulkReport) : ""}
    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">Questions marked</span><span class="stat-value">${all.done}</span></div>
      <div class="card stat"><span class="stat-label">Accuracy</span><span class="stat-value">${all.done ? pct(all.right, all.done) + "%" : "–"}</span></div>
      <div class="card stat"><span class="stat-label">To redo</span><span class="stat-value">${redo}</span></div>
      <div class="card stat"><span class="stat-label">Answer on this site</span><span class="stat-value">${qbiQuestionCount()}</span><span class="stat-hint">questions imported</span></div>
    </div>
    ${sets ? `
      <div class="section-title section">Topics</div>
      <div class="qbt-grid">${tiles.map(qbTileHtml).join("")}</div>`
      : `<div class="card section">${emptyState("flag", "No question sets on this device yet", QB_EMPTY_HINT, qbImportButtonHtml())}</div>`}
    ${qbMockCardHtml()}`;

  bindQBank();
}

// Sets of a topic that can be opened on this device (skipped ones only when asked)
function qbTopicFiles(topicId, withSkipped = qbShowSkipped) {
  return (QBANK_FILES[topicId] || []).filter(f => QBI[f[2]] && (withSkipped || !qbSkipped(f[2])));
}
function qbTopicSummary(t, i) {
  const files = qbTopicFiles(t.id, false);
  const questions = files.reduce((n, f) => n + QBI[f[2]].questions.length, 0);
  let done = 0, right = 0, redo = 0;
  files.forEach(f => { const s = qbStats(f[2]); done += s.done; right += s.right; redo += s.redo.length; });
  return { t, i, sets: files.length, questions, done, right, redo };
}
function qbTileHtml(x) {
  const { t, i } = x;
  const p = x.questions ? Math.min(100, pct(x.done, x.questions)) : 0;
  return `<a class="card card-link qbt" href="#/qbank/topic/${t.id}">
    <span class="qbt-num">${String(i + 1).padStart(2, "0")}</span>
    <span class="qbt-name">${t.name}${x.added ? ` <span class="badge badge-success qbt-added">+${x.added} set${x.added === 1 ? "" : "s"}</span>` : ""}</span>
    <span class="qbt-meta">${x.sets ? `${x.sets} set${x.sets === 1 ? "" : "s"} · ${x.questions} questions` : "No sets on this device"} · weight ${t.weight}</span>
    <span class="qbt-bar">${progressBar(p)}</span>
    <span class="qbt-foot">${x.done ? `${x.done} answered · ${pct(x.right, x.done)}% right${x.redo ? ` · <span class="qbt-redo">${x.redo} to redo</span>` : ""}` : "Not started"}</span>
    <span class="qbt-chev">${icon("chevron", 18)}</span>
  </a>`;
}

// ---------- One topic: its sets (#/qbank/topic/<topicId>) ----------
function renderQBTopic(topicId) {
  const idx = TOPICS.findIndex(t => t.id === topicId);
  if (idx < 0) { location.hash = "#/qbank"; return; }
  const t = TOPICS[idx], files = qbTopicFiles(t.id), ts = qbTopicStats(t.id);
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  view.innerHTML = `
    <a href="#/qbank" class="back-link">${icon("back", 16)} Question Bank</a>
    ${pageHeader(t.name, `2027 weight ${t.weight} · aim for about <strong>${weightShare(t)} of every 100</strong> practice questions · ${ts.done} marked${ts.pct !== null ? ` · ${ts.pct}% right` : ""}${ts.skipped ? ` · ${ts.skipped} skipped` : ""}`,
      `<label class="check-chip"><input type="checkbox" id="qb-show-skipped" ${qbShowSkipped ? "checked" : ""}> Show skipped</label>`,
      `Topic ${idx + 1} of ${TOPICS.length}`)}
    ${files.length ? `<div class="card"><div class="list">${files.map(f => qbRowHtml(t, f)).join("")}</div></div>`
      : `<div class="card">${emptyState("flag", "No sets of this topic on this device", QB_EMPTY_HINT, qbImportButtonHtml())}</div>`}
    <div class="qbt-pager section">
      ${prev ? `<a class="btn btn-ghost" href="#/qbank/topic/${prev.id}">${icon("prev", 16)} ${prev.name}</a>` : "<span></span>"}
      ${next ? `<a class="btn btn-ghost" href="#/qbank/topic/${next.id}">${next.name} ${icon("next", 16)}</a>` : "<span></span>"}
    </div>`;
  bindQBank();
}
// Re-draw whichever Question Bank screen is open
function qbRerender() { const [, a, b, c] = currentRoute(); renderQBank(a, b, c); }

function qbRowHtml(t, f) {
  const [n, title, id] = f;
  const s = qbStats(id);
  const st = qbState(id);
  const open = qbOpen === id;
  const skipped = qbSkipped(id);
  return `
    <div class="qb-row${skipped ? " qb-skipped" : ""}">
      <div class="list-item">
        <div class="list-main">
          <button class="qb-title" data-qbtoggle="${id}" aria-expanded="${open}">${n}. ${esc(title)}</button>
          <div class="list-meta">${skipped ? `<span class="badge">Skipped${QBANK_NOT_2027.has(id) ? " · not in 2027" : ""}</span> ` : ""}${s.count ? `${s.done}/${s.count} marked${s.pct !== null ? ` · ${s.pct}% right` : ""}${s.redo.length ? ` · <span style="color:var(--danger)">redo ${s.redo.length}</span>` : ""}` : "Not started"}</div>
        </div>
        ${QBI[id] ? `<a class="btn btn-primary btn-sm" href="#/qbank/do/${id}">${icon("play", 14)} Do it</a>` : ""}
        <button class="icon-btn" data-qbtoggle="${id}" aria-label="Open tracker">${icon("chevron", 18)}</button>
      </div>
      ${open ? `<div class="qb-panel">
        <div class="row-gap" style="margin-bottom:12px">
          ${QBI[id] && s.redo.length ? `<a class="btn btn-ghost btn-sm" href="#/qbank/do/${id}/redo">Redo ${s.redo.length} wrong</a>` : ""}
          <button class="btn btn-ghost btn-sm" data-qbskip="${id}">${skipped ? "Unskip set" : "Skip set"}</button>
        </div>
        ${st.count ? `
          <div class="qb-grid">${Array.from({ length: st.count }, (_, i) => i + 1).map(k => {
            const m = st.marks[k] || "";
            return `<button class="pal-btn qb-${m || "none"}" data-qbmark="${id}|${k}" title="${m ? QB_LABEL[m] : "Not answered"}">${k}</button>`;
          }).join("")}</div>
          <div class="legend"><span><i style="background:var(--success-soft);border-color:transparent"></i>Right</span><span><i style="background:var(--danger-soft);border-color:transparent"></i>Wrong</span><span><i style="background:var(--warning-soft);border-color:transparent"></i>Guessed</span></div>
          ${s.redo.length ? `<div class="callout warning" style="margin-top:12px">${icon("alert", 18)}<div>Redo these questions: <strong>${s.redo.join(", ")}</strong></div></div>` : ""}
          <div class="row-gap" style="margin-top:12px">
            <button class="btn btn-ghost btn-sm" data-qbcount="${id}">Change number of questions</button>
            <button class="btn btn-ghost btn-sm" data-qbreset="${id}">Clear marks</button>
          </div>`
        : `<div class="form-grid"><label class="field"><span class="field-label">How many questions are in this set?</span>
            <input class="input" type="number" min="1" max="200" inputmode="numeric" id="qbc-${id}" placeholder="e.g. 20"></label></div>
           <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-primary btn-sm" data-qbsave="${id}">Start tracking</button></div>`}
      </div>` : ""}
    </div>`;
}

// ---------- Mock test built only from your Question Bank ----------
let qbMockTopic = "";
function qbMockCardHtml() {
  const pool = typeof qbMockPool === "function" ? qbMockPool() : [];
  if (!pool.length) return "";
  const active = DATA.activeMock;
  const nTopic = t => pool.filter(q => q.topic === t).length;
  const avail = qbMockTopic ? nTopic(qbMockTopic) : pool.length;
  const sizes = qbMockTopic ? [[15, "15 questions"], [30, "30 questions"], [0, `All ${avail}`]] : [[30, "Mini · 30"], [90, "Session · 90"], [180, "Full exam · 180"]];
  return `
    <div class="card section">
      <div class="card-head" style="flex-wrap:wrap"><div><h2>Mock test from your Question Bank</h2>
        <p class="text-2 small">${pool.length} questions with answers · timed at ${SECONDS_PER_QUESTION}s per question like the real exam · scored only when you submit · weighted by 2027 exam weights</p></div></div>
      ${active ? `<div class="callout warning">${icon("clock", 18)}<div style="flex:1"><strong>${esc(active.name)}</strong> is in progress.</div><a class="btn btn-primary btn-sm" href="#/mock/run">Resume</a></div>` : `
      <div class="form-grid">
        <label class="field"><span class="field-label">Topics</span><select class="select" id="qbm-topic">
          <option value="">All topics (${pool.length})</option>${TOPICS.map(t => `<option value="${t.id}" ${qbMockTopic === t.id ? "selected" : ""} ${nTopic(t.id) ? "" : "disabled"}>${t.name} (${nTopic(t.id)})</option>`).join("")}</select></label>
        <div class="field"><span class="field-label">Length</span><div class="row-gap">${sizes.map(([n, l]) => {
          const k = n || avail, min = Math.ceil(k * SECONDS_PER_QUESTION / 60);
          return `<button class="btn btn-secondary" data-qbmock="${n}" ${k <= avail && k > 0 ? "" : "disabled"}>${icon("play", 16)} ${l}<span class="text-3 small" style="font-weight:500">&nbsp;· ${formatMinutes(min)}</span></button>`;
        }).join("")}</div></div>
      </div>`}
    </div>`;
}
async function startQBMock(n) {
  const pool = qbMockPool();
  if (qbMockTopic) {
    const t = topicById(qbMockTopic);
    const ids = pickTopicQuestions(qbMockTopic, n, "qbank");
    const min = Math.ceil(ids.length * SECONDS_PER_QUESTION / 60);
    if (!await confirmDialog({ title: `Start ${t.name} mock?`, message: `${ids.length} Question Bank questions · ${formatMinutes(min)}. The timer starts right away; answers are shown after you submit.`, confirmText: "Start now" })) return;
    return startMock("topic", { name: `${t.name} · Question Bank mock`, topic: t.id, ids, source: "qbank", sessions: [{ count: ids.length, minutes: min }] });
  }
  const sessions = n === 180 ? MOCK_TYPES.full.sessions : n === 90 ? MOCK_TYPES.session.sessions : MOCK_TYPES.mini.sessions;
  const name = n === 180 ? "Full mock · Question Bank" : n === 90 ? "Session mock · Question Bank" : "Mini mock · Question Bank";
  if (pool.length < n) { toast(`Not enough questions — need ${n}`, "error"); return; }
  if (!await confirmDialog({ title: `Start ${name}?`, message: `${n} questions · ${formatMinutes(sessions.reduce((s, x) => s + x.minutes, 0))}${sessions.length > 1 ? " in 2 sessions" : ""}. The timer starts right away; answers are shown after you submit.`, confirmText: "Start now" })) return;
  startMock(n === 180 ? "full" : n === 90 ? "session" : "mini", { name, sessions, source: "qbank" });
}

function bindQBank() {
  const tsel = document.getElementById("qbm-topic");
  if (tsel) tsel.onchange = () => { qbMockTopic = tsel.value; qbRerender(); };
  view.querySelectorAll("[data-qbmock]").forEach(b => b.onclick = () => startQBMock(+b.dataset.qbmock));
  const pack = document.getElementById("qb-pack");
  if (pack) pack.onchange = async () => {
    const files = [...pack.files]; pack.value = "";
    if (!files.length) return;
    const box = document.getElementById("qb-progress");
    const report = await qbImportPackages(files, (i, n, name) => {
      box.innerHTML = `<div class="callout info section">${icon("upload", 18)}<div>Importing ${i} of ${n}: <strong>${esc(name)}</strong>…<div style="margin-top:8px">${progressBar(pct(i - 1, n))}</div></div></div>`;
    });
    qbBulkReport = report;
    toast(`Imported ${report.sets.length} set${report.sets.length === 1 ? "" : "s"}`, report.sets.length ? "success" : "error");
    qbRerender();
  };
  const bulk = document.getElementById("qb-bulk");
  if (bulk) bulk.onchange = async () => {
    const files = [...bulk.files]; bulk.value = "";
    if (!files.length) return;
    const box = document.getElementById("qb-progress");
    const report = await qbImportPdfs(files, (i, n, name) => {
      box.innerHTML = `<div class="callout info section">${icon("upload", 18)}<div>Reading ${i} of ${n}: <strong>${esc(name)}</strong>…<div style="margin-top:8px">${progressBar(pct(i - 1, n))}</div></div></div>`;
    });
    qbBulkReport = report;
    toast(`Imported ${report.sets.length} set${report.sets.length === 1 ? "" : "s"}`, report.sets.length ? "success" : "error");
    qbRerender();
  };
  const rc = document.getElementById("qb-report-close");
  if (rc) rc.onclick = () => { qbBulkReport = null; qbRerender(); };
  const sk = document.getElementById("qb-show-skipped");
  if (sk) sk.onchange = () => { qbShowSkipped = sk.checked; qbRerender(); };
  view.querySelectorAll("[data-qbskip]").forEach(b => b.onclick = () => {
    const id = b.dataset.qbskip, now = !qbSkipped(id);
    qbState(id).skip = now; saveData(); qbRerender();
    toast(now ? "Set skipped" : "Set restored");
  });
  view.querySelectorAll("[data-qbtoggle]").forEach(b => b.onclick = () => { qbOpen = qbOpen === b.dataset.qbtoggle ? null : b.dataset.qbtoggle; qbRerender(); });
  view.querySelectorAll("[data-qbsave]").forEach(b => b.onclick = () => {
    const id = b.dataset.qbsave, el = document.getElementById("qbc-" + id), n = parseInt(el.value, 10);
    if (!(n >= 1 && n <= 200)) { el.classList.add("invalid"); toast("Enter the number of questions (1–200)", "error"); return; }
    qbState(id).count = n; saveData(); qbRerender();
  });
  view.querySelectorAll("[data-qbmark]").forEach(b => b.onclick = () => {
    const [id, k] = b.dataset.qbmark.split("|");
    const st = qbState(id), cur = st.marks[k] || "";
    const next = QB_MARKS[(QB_MARKS.indexOf(cur) + 1) % QB_MARKS.length];
    if (next) st.marks[k] = next; else delete st.marks[k];
    saveData(); qbRerender();
  });
  view.querySelectorAll("[data-qbcount]").forEach(b => b.onclick = async () => {
    const st = qbState(b.dataset.qbcount);
    const v = await promptDialog({ title: "Number of questions", label: "Questions in this set", type: "number", inputmode: "numeric", value: String(st.count), confirmText: "Save", validate: x => (+x >= 1 && +x <= 200) ? "" : "Enter 1–200" });
    if (v === null) return;
    st.count = +v; Object.keys(st.marks).forEach(k => { if (+k > st.count) delete st.marks[k]; }); saveData(); qbRerender();
  });
  view.querySelectorAll("[data-qbreset]").forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "Clear all marks for this set?", confirmText: "Clear", danger: true })) return;
    qbState(b.dataset.qbreset).marks = {}; saveData(); qbRerender(); toast("Marks cleared");
  });
}

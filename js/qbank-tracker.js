// ============================================================
// qbank-tracker.js — track your answers to the Question Bank PDFs
// (questions stay in your Drive; this page stores only your marks)
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

let qbOpen = null;   // file id currently expanded

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
  const topics = TOPICS.slice().sort((a, b) => weightShare(b) - weightShare(a));
  const all = topics.reduce((a, t) => { const s = qbTopicStats(t.id); a.done += s.done; a.right += s.right; a.files += s.files; return a; }, { done: 0, right: 0, files: 0 });

  view.innerHTML = `
    ${pageHeader("Question Bank", `Your PDF question sets · sorted by 2027 exam weight · ${all.files} active sets`,
      `<label class="check-chip"><input type="checkbox" id="qb-show-skipped" ${qbShowSkipped ? "checked" : ""}> Show skipped</label>`)}
    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">Questions marked</span><span class="stat-value">${all.done}</span></div>
      <div class="card stat"><span class="stat-label">Accuracy</span><span class="stat-value">${all.done ? pct(all.right, all.done) + "%" : "–"}</span></div>
      <div class="card stat"><span class="stat-label">To redo</span><span class="stat-value">${topics.reduce((s, t) => s + (QBANK_FILES[t.id] || []).filter(f => !qbSkipped(f[2])).reduce((x, f) => x + qbStats(f[2]).redo.length, 0), 0)}</span></div>
      <div class="card stat"><span class="stat-label">Answer on this site</span><span class="stat-value">${qbiQuestionCount()}</span><span class="stat-hint">questions imported</span></div>
    </div>
    <div class="callout info section">${icon("play", 18)}<div><strong>Answer directly here:</strong> sets with a <strong>Do it</strong> button open as interactive questions — pick A/B/C and see why it is right or wrong.${isOwner() ? " To add a set, press <strong>Import</strong> and paste the text of its Answers PDF (once per set)." : ""} Imported questions stay only in this browser.</div></div>
    ${topics.map(t => {
      const files = (QBANK_FILES[t.id] || []).filter(f => qbShowSkipped || !qbSkipped(f[2]));
      const ts = qbTopicStats(t.id);
      const folder = `https://drive.google.com/drive/folders/${QBANK_FOLDERS[t.id]}`;
      return `
      <div class="card section">
        <div class="card-head" style="flex-wrap:wrap">
          <div><h2>${t.name}</h2>
            <p class="text-2 small">2027 weight ${t.weight} · aim for about <strong>${weightShare(t)} of every 100</strong> practice questions · ${ts.done} marked${ts.pct !== null ? ` · ${ts.pct}% right` : ""}${ts.skipped ? ` · ${ts.skipped} skipped` : ""}</p></div>
          <a class="btn btn-ghost btn-sm" href="${folder}" target="_blank" rel="noopener">${icon("external", 16)} Folder (answers)</a>
        </div>
        ${files.length ? `<div class="list">${files.map(f => qbRowHtml(t, f)).join("")}</div>`
          : `<p class="text-2 small">No question files found in this folder yet. Upload them to the Drive folder and tell Claude to refresh the list.</p>`}
      </div>`;
    }).join("")}
    <p class="text-3 small section">Only your marks are stored in this app. The PDFs stay in your Google Drive.</p>`;

  bindQBank();
}

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
        ${QBI[id] ? `<a class="btn btn-primary btn-sm" href="#/qbank/do/${id}">${icon("play", 14)} Do it</a>`
          : isOwner() && !skipped ? `<a class="btn btn-secondary btn-sm" href="#/qbank/import/${id}">${icon("upload", 14)} Import</a>`
          : `<a class="btn btn-secondary btn-sm" href="https://drive.google.com/file/d/${id}/view" target="_blank" rel="noopener">${icon("external", 14)} PDF</a>`}
        <button class="icon-btn" data-qbtoggle="${id}" aria-label="Open tracker">${icon("chevron", 18)}</button>
      </div>
      ${open ? `<div class="qb-panel">
        <div class="row-gap" style="margin-bottom:12px">
          <a class="btn btn-ghost btn-sm" href="https://drive.google.com/file/d/${id}/view" target="_blank" rel="noopener">${icon("external", 14)} Questions PDF</a>
          ${QBI[id] && s.redo.length ? `<a class="btn btn-ghost btn-sm" href="#/qbank/do/${id}/redo">Redo ${s.redo.length} wrong</a>` : ""}
          ${QBI[id] && isOwner() ? `<a class="btn btn-ghost btn-sm" href="#/qbank/import/${id}">Re-import</a>` : ""}
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

function bindQBank() {
  const sk = document.getElementById("qb-show-skipped");
  if (sk) sk.onchange = () => { qbShowSkipped = sk.checked; renderQBank(); };
  view.querySelectorAll("[data-qbskip]").forEach(b => b.onclick = () => {
    const id = b.dataset.qbskip, now = !qbSkipped(id);
    qbState(id).skip = now; saveData(); renderQBank();
    toast(now ? "Set skipped" : "Set restored");
  });
  view.querySelectorAll("[data-qbtoggle]").forEach(b => b.onclick = () => { qbOpen = qbOpen === b.dataset.qbtoggle ? null : b.dataset.qbtoggle; renderQBank(); });
  view.querySelectorAll("[data-qbsave]").forEach(b => b.onclick = () => {
    const id = b.dataset.qbsave, el = document.getElementById("qbc-" + id), n = parseInt(el.value, 10);
    if (!(n >= 1 && n <= 200)) { el.classList.add("invalid"); toast("Enter the number of questions (1–200)", "error"); return; }
    qbState(id).count = n; saveData(); renderQBank();
  });
  view.querySelectorAll("[data-qbmark]").forEach(b => b.onclick = () => {
    const [id, k] = b.dataset.qbmark.split("|");
    const st = qbState(id), cur = st.marks[k] || "";
    const next = QB_MARKS[(QB_MARKS.indexOf(cur) + 1) % QB_MARKS.length];
    if (next) st.marks[k] = next; else delete st.marks[k];
    saveData(); renderQBank();
  });
  view.querySelectorAll("[data-qbcount]").forEach(b => b.onclick = async () => {
    const st = qbState(b.dataset.qbcount);
    const v = await promptDialog({ title: "Number of questions", label: "Questions in this set", type: "number", inputmode: "numeric", value: String(st.count), confirmText: "Save", validate: x => (+x >= 1 && +x <= 200) ? "" : "Enter 1–200" });
    if (v === null) return;
    st.count = +v; Object.keys(st.marks).forEach(k => { if (+k > st.count) delete st.marks[k]; }); saveData(); renderQBank();
  });
  view.querySelectorAll("[data-qbreset]").forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "Clear all marks for this set?", confirmText: "Clear", danger: true })) return;
    qbState(b.dataset.qbreset).marks = {}; saveData(); renderQBank(); toast("Marks cleared");
  });
}

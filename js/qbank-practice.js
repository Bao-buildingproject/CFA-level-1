// ============================================================
// qbank-practice.js — answer your Question Bank sets directly on the site
//
// You paste the text of an "Answers" PDF (Ctrl+A, Ctrl+C) once; the site
// reads the questions, choices, correct answer and explanation and saves
// them ONLY in this browser (IndexedDB, per profile). Nothing is uploaded
// and nothing is added to the public website code.
// ============================================================

const QBI_DB = "cfaStudy_qbank", QBI_STORE = "sets";
let QBI = {};                // fileId -> imported set (active profile)
let QBI_PROFILE = null;      // profile the in-memory sets belong to
let qbRun = null;            // current practice run

// ---------- IndexedDB (falls back to memory if unavailable) ----------
function qbiOpen() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("no IndexedDB"));
    const req = indexedDB.open(QBI_DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(QBI_STORE, { keyPath: "key" });
      s.createIndex("profile", "profile");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function qbiTx(mode, fn) {
  const db = await qbiOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QBI_STORE, mode), st = tx.objectStore(QBI_STORE);
    const out = fn(st);
    tx.oncomplete = () => { db.close(); resolve(out && "result" in out ? out.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function qbiLoad() {
  const pid = PROFILES.active;
  try {
    const all = await qbiTx("readonly", st => st.index("profile").getAll(pid));
    QBI = {};
    (all || []).forEach(r => { QBI[r.fileId] = r; });
  } catch (e) { if (QBI_PROFILE !== pid) QBI = {}; }
  QBI_PROFILE = pid;
}
async function qbiPut(rec) {
  rec.profile = PROFILES.active; rec.key = `${rec.profile}|${rec.fileId}`;
  QBI[rec.fileId] = rec;
  try { await qbiTx("readwrite", st => st.put(rec)); return true; } catch (e) { return false; }
}
async function qbiDelete(fileId) {
  delete QBI[fileId];
  try { await qbiTx("readwrite", st => st.delete(`${PROFILES.active}|${fileId}`)); } catch (e) { /* ignore */ }
}
async function qbiClearProfile(pid) {
  try {
    const keys = await qbiTx("readonly", st => st.index("profile").getAllKeys(pid));
    await qbiTx("readwrite", st => (keys || []).forEach(k => st.delete(k)));
  } catch (e) { /* ignore */ }
  if (pid === PROFILES.active) QBI = {};
}
async function qbiReplaceAll(list) {
  await qbiClearProfile(PROFILES.active);
  for (const r of list || []) if (r && r.fileId && Array.isArray(r.questions)) await qbiPut({ ...r });
}
function qbiReady() { return QBI_PROFILE === PROFILES.active; }
function qbiQuestionCount() { return Object.values(QBI).reduce((s, r) => s + r.questions.length, 0); }

// ---------- Parser for the "Answers" PDF text ----------
const QB_TICK = /\s*[✔✓✅☑√]️?\s*/;

function qbParse(raw) {
  const text = String(raw || "").replace(/\r\n?/g, "\n").replace(/ /g, " ");
  const heads = [...text.matchAll(/Question\s+(\d+)\s+of\s+(\d+)/gi)];
  const questions = [];
  let total = 0;
  heads.forEach((m, i) => {
    const body = text.slice(m.index + m[0].length, i + 1 < heads.length ? heads[i + 1].index : text.length);
    total = Math.max(total, +m[2]);
    const q = qbParseOne(body);
    if (q) { q.n = +m[1]; questions.push(q); }
  });
  // keep the last copy of each number (the Answers PDF repeats nothing, but be safe)
  const byN = new Map(questions.map(q => [q.n, q]));
  return { total: total || byN.size, questions: [...byN.values()].sort((a, b) => a.n - b.n) };
}

function qbClean(s) {
  return s.split("\n").map(l => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n")
    .replace(/([^.:?!\n])\n(?=[a-z(])/g, "$1 ").trim();   // re-join lines a PDF copy wrapped mid-sentence
}

function qbParseOne(body) {
  const ex = body.search(/(^|\n)\s*Explanation\s*:?/i);
  const pre = ex >= 0 ? body.slice(0, ex) : body;
  let post = ex >= 0 ? body.slice(ex).replace(/^\s*Explanation\s*:?/i, "") : "";
  const lines = pre.split("\n");
  const order = ["A", "B", "C"], at = {};
  let want = 0;
  lines.forEach((l, i) => {
    if (want < 3 && new RegExp(`^\\s*\\(?${order[want]}[.)]\\s+\\S`).test(l)) { at[order[want]] = i; want++; }
  });
  if (want < 3) return null;
  const stem = qbClean(lines.slice(0, at.A).join("\n"));
  const choices = {};
  let ans = "";
  order.forEach((L, k) => {
    const end = k < 2 ? at[order[k + 1]] : lines.length;
    let t = lines.slice(at[L], end).join(" ").replace(new RegExp(`^\\s*\\(?${L}[.)]\\s+`), "");
    if (QB_TICK.test(t)) { ans = L; t = t.replace(new RegExp(QB_TICK.source, "g"), " "); }
    choices[L] = t.replace(/\s+/g, " ").trim();
  });
  let remember = "";
  const tr = post.search(/Things to remember\s*:?/i);
  if (tr >= 0) { remember = post.slice(tr).replace(/^Things to remember\s*:?/i, ""); post = post.slice(0, tr); }
  return { q: stem, choices, ans, expl: qbClean(post), remember: qbClean(remember).replace(/\n(?!\n)/g, " ") };
}

// Sentences of the explanation that talk about a given choice, e.g. "(Choice B) ..."
function qbWhyNot(q, L) {
  const text = (q.expl || "").replace(/\n+/g, " ");
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z(])/);
  return parts.filter(s => new RegExp(`Choices?\\s+(?:[ABC]\\s*(?:,|and)\\s*)*${L}\\b`).test(s)).map(s => s.trim()).join(" ");
}

function qbParas(s) {
  return esc(s).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

function qbFileInfo(fileId) {
  for (const t of TOPICS) {
    const f = (QBANK_FILES[t.id] || []).find(x => x[2] === fileId);
    if (f) return { topic: t, n: f[0], title: f[1] };
  }
  return null;
}

// ---------- Import page (#/qbank/import/<fileId>) ----------
let qbDraft = null;

function renderQBImport(fileId) {
  const info = qbFileInfo(fileId);
  if (!info) { location.hash = "#/qbank"; return; }
  if (!isOwner()) {
    view.innerHTML = `${pageHeader("Import set")}<div class="card">${emptyState("settings", "Owner only", "Unlock owner mode in Settings to import question sets.")}</div>`;
    return;
  }
  const folder = `https://drive.google.com/drive/folders/${QBANK_FOLDERS[info.topic.id]}`;
  const existing = QBI[fileId];
  if (!qbDraft || qbDraft.fileId !== fileId) qbDraft = { fileId, text: "", parsed: null };
  const p = qbDraft.parsed;

  view.innerHTML = `
    ${pageHeader(`Import · ${esc(info.title)}`, `${info.topic.name} · set ${info.n}`,
      `<a class="btn btn-ghost" href="#/qbank">${icon("prev", 18)} Back</a>`)}
    ${existing ? `<div class="callout info">${icon("alert", 18)}<div>This set is already imported (${existing.questions.length} questions). Importing again replaces it; your marks are kept.</div></div>` : ""}
    <div class="card section">
      <h2>1 · Copy the Answers PDF</h2>
      <ol class="qb-steps">
        <li>Open the folder and open <strong>${info.n}. ${esc(info.title)} - Answers.pdf</strong> <a href="${folder}" target="_blank" rel="noopener">(open folder ${icon("external", 14)})</a>.</li>
        <li>On a computer: click inside the PDF, press <span class="kbd">Ctrl</span> + <span class="kbd">A</span>, then <span class="kbd">Ctrl</span> + <span class="kbd">C</span>.</li>
        <li>Paste it below with <span class="kbd">Ctrl</span> + <span class="kbd">V</span> and press <strong>Read questions</strong>.</li>
      </ol>
      <p class="text-3 small">Use the <strong>Answers</strong> file (it has ✔ and the explanations). Everything stays in this browser only — it is not uploaded or published.</p>
      <label class="field full" style="margin-top:12px"><span class="field-label">Answers PDF text</span>
        <textarea class="textarea" id="qbi-text" rows="8" placeholder="Question 1 of 5&#10;...&#10;A. ...&#10;B. ... ✔&#10;C. ...&#10;Explanation: ...">${esc(qbDraft.text)}</textarea></label>
      <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-primary" id="qbi-parse">Read questions</button></div>
    </div>
    ${p ? `<div class="card section">
      <div class="card-head"><div><h2>2 · Check and save</h2>
        <p class="text-2 small">Found <strong>${p.questions.length}</strong> of ${p.total} questions${p.questions.filter(q => !q.ans).length ? ` · <span style="color:var(--danger)">${p.questions.filter(q => !q.ans).length} without a ✔ — choose the answer</span>` : " · all answers found"}</p></div>
        <button class="btn btn-primary" id="qbi-save" ${p.questions.length ? "" : "disabled"}>${icon("check", 18)} Save set</button></div>
      ${p.questions.length < p.total ? `<div class="callout warning">${icon("alert", 18)}<div>Some questions were not recognised (missing: ${Array.from({ length: p.total }, (_, i) => i + 1).filter(n => !p.questions.some(q => q.n === n)).join(", ")}). Make sure you copied the whole PDF.</div></div>` : ""}
      <div class="list">${p.questions.map((q, i) => `
        <div class="list-item">
          <div class="list-main"><div class="list-title">${q.n}. ${esc(q.q.slice(0, 140))}${q.q.length > 140 ? "…" : ""}</div>
            <div class="list-meta">${q.expl ? "Explanation ✓" : "<span style='color:var(--warning)'>No explanation found</span>"}</div></div>
          <label class="field" style="margin:0"><span class="sr-only">Answer for ${q.n}</span>
            <select class="select${q.ans ? "" : " invalid"}" data-qbians="${i}" style="width:auto">
              <option value="">?</option>${LETTERS.map(L => `<option ${q.ans === L ? "selected" : ""}>${L}</option>`).join("")}</select></label>
        </div>`).join("")}</div>
    </div>` : ""}
    ${existing ? `<button class="btn btn-soft-danger section" id="qbi-remove">${icon("trash", 18)} Remove imported set</button>` : ""}`;

  const ta = document.getElementById("qbi-text");
  ta.oninput = () => { qbDraft.text = ta.value; };
  document.getElementById("qbi-parse").onclick = () => {
    qbDraft.text = ta.value;
    qbDraft.parsed = qbParse(ta.value);
    if (!qbDraft.parsed.questions.length) toast("No questions found — copy the Answers PDF text (it starts with “Question 1 of …”)", "error");
    renderQBImport(fileId);
  };
  view.querySelectorAll("[data-qbians]").forEach(s => s.onchange = () => {
    qbDraft.parsed.questions[+s.dataset.qbians].ans = s.value; s.classList.toggle("invalid", !s.value);
  });
  const save = document.getElementById("qbi-save");
  if (save) save.onclick = async () => {
    const qs = qbDraft.parsed.questions;
    if (qs.some(q => !q.ans)) { toast("Choose the answer for every question first", "error"); return; }
    const ok = await qbiPut({ fileId, topic: info.topic.id, title: info.title, total: qbDraft.parsed.total, questions: qs, importedAt: todayStr() });
    const st = qbState(fileId);
    if (st.count < qbDraft.parsed.total) st.count = qbDraft.parsed.total;
    saveData();
    qbDraft = null;
    toast(ok ? `Saved ${qs.length} questions` : "Saved for this visit only (browser storage blocked)", ok ? "success" : "error");
    location.hash = `#/qbank/do/${fileId}`;
  };
  const rm = document.getElementById("qbi-remove");
  if (rm) rm.onclick = async () => {
    if (!await confirmDialog({ title: "Remove this imported set?", message: "Your right/wrong marks stay.", confirmText: "Remove", danger: true })) return;
    await qbiDelete(fileId); qbDraft = null; toast("Set removed"); location.hash = "#/qbank";
  };
}

// ---------- Practice run (#/qbank/do/<fileId>[/redo]) ----------
function renderQBDo(fileId, mode) {
  const rec = QBI[fileId];
  const info = qbFileInfo(fileId);
  if (!rec || !info) {
    view.innerHTML = `${pageHeader("Question set")}<div class="card">${emptyState("flag", "Not imported yet",
      isOwner() ? "Import this set once, then you can answer it here." : "Ask the owner to import this set.")}
      <div class="form-actions" style="justify-content:center">${isOwner() && info ? `<a class="btn btn-primary" href="#/qbank/import/${fileId}">Import set</a>` : ""}<a class="btn btn-ghost" href="#/qbank">Back</a></div></div>`;
    return;
  }
  let list = rec.questions;
  if (mode === "redo") {
    const redo = new Set(qbStats(fileId).redo);
    list = list.filter(q => redo.has(q.n));
    if (!list.length) { toast("Nothing to redo in this set"); list = rec.questions; mode = ""; }
  }
  qbRun = { fileId, info, list, i: 0, picked: null, results: [], mode };
  qbDraw();
}

function qbDraw() {
  const r = qbRun;
  if (!r) return;
  if (r.i >= r.list.length) return qbDrawResult();
  const q = r.list[r.i];
  const answered = r.picked !== null;
  const ok = r.picked === q.ans;
  const why = answered && !ok ? qbWhyNot(q, r.picked) : "";
  const qq = { answer: q.ans, choices: q.choices };

  view.innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <div class="session-bar">
        <button class="icon-btn" id="qb-quit" aria-label="Stop">${icon("x", 20)}</button>
        ${progressBar(pct(r.i, r.list.length))}
        <span class="text-2 small mono">${r.i + 1}/${r.list.length}</span>
      </div>
      <div class="card">
        <div class="q-meta"><span class="badge">${r.info.topic.id}</span><span class="text-3 small">${esc(r.info.title)} · Question ${q.n} of ${QBI[r.fileId].total}${r.mode === "redo" ? " · redo" : ""}</span></div>
        <div class="q-text">${esc(q.q)}</div>
        ${choicesHtml(qq, r.picked, answered)}
        ${answered ? `
          <div class="explain">
            <div class="explain-head ${ok ? "ok" : "bad"}">${icon(ok ? "check" : "alert", 18)} ${ok ? `Correct — ${q.ans} is right` : `Incorrect — you chose ${r.picked}, the answer is ${q.ans}`}</div>
            <div class="explain-body">
              ${why ? `<div class="explain-block"><h4>Why ${r.picked} is wrong</h4><p>${esc(why)}</p></div>` : ""}
              ${q.expl ? `<div class="explain-block"><h4>${ok ? `Why ${q.ans} is correct` : "Explanation"}</h4>${qbParas(q.expl)}</div>` : ""}
              ${q.remember ? `<div class="explain-block"><h4>Things to remember</h4><p>${esc(q.remember)}</p></div>` : ""}
            </div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" id="qb-next" style="margin-top:20px">${r.i + 1 < r.list.length ? "Next question" : "See results"} ${icon("next", 18)}</button>`
        : `<p class="text-3 small hide-mobile" style="margin-top:14px">Keyboard: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> or <span class="kbd">A</span> <span class="kbd">B</span> <span class="kbd">C</span> · <span class="kbd">Enter</span> next</p>`}
      </div>
    </div>`;

  document.getElementById("qb-quit").onclick = async () => {
    if (r.results.length && r.i < r.list.length && !await confirmDialog({ title: "Stop this set?", message: "Answers so far are already saved as marks.", confirmText: "Stop" })) return;
    qbRun = null; location.hash = "#/qbank";
  };
  view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => qbPick(b.dataset.pick));
  const next = document.getElementById("qb-next");
  if (next) { next.onclick = qbNext; next.focus(); }
}

function qbPick(L) {
  const r = qbRun;
  if (!r || r.picked !== null) return;
  const q = r.list[r.i];
  r.picked = L;
  const correct = L === q.ans;
  r.results.push({ n: q.n, picked: L, correct });
  const st = qbState(r.fileId);
  if (st.count < q.n) st.count = Math.max(q.n, QBI[r.fileId].total || 0);
  st.marks[q.n] = correct ? "r" : "w";
  DATA.dailyLog = DATA.dailyLog || {};
  const d = DATA.dailyLog[todayStr()] = DATA.dailyLog[todayStr()] || {};
  d.questionsDone = (d.questionsDone || 0) + 1;
  d.questionsRight = (d.questionsRight || 0) + (correct ? 1 : 0);
  saveData();
  qbDraw();
}
function qbNext() { qbRun.i++; qbRun.picked = null; qbDraw(); window.scrollTo(0, 0); }

function qbDrawResult() {
  const r = qbRun;
  const right = r.results.filter(x => x.correct).length, wrong = r.results.filter(x => !x.correct);
  view.innerHTML = `
    <div style="max-width:640px;margin:0 auto">
      <div class="card" style="text-align:center">
        <h1 style="margin-bottom:6px">${pct(right, r.results.length)}%</h1>
        <p class="text-2">${right} of ${r.results.length} correct · ${esc(r.info.title)}</p>
        ${wrong.length ? `<div class="callout warning" style="margin-top:16px;text-align:left">${icon("alert", 18)}<div>Wrong: <strong>${wrong.map(x => x.n).join(", ")}</strong> — saved to the redo list.</div></div>` : `<div class="callout success" style="margin-top:16px;text-align:left">${icon("check", 18)}<div>All correct!</div></div>`}
        <div class="row-gap" style="justify-content:center;margin-top:20px">
          ${qbStats(r.fileId).redo.length ? `<button class="btn btn-primary" id="qb-redo">Redo wrong answers</button>` : ""}
          <button class="btn btn-secondary" id="qb-again">Do the whole set again</button>
          <a class="btn btn-ghost" href="#/qbank">Back to Question Bank</a>
        </div>
      </div>
    </div>`;
  const fid = r.fileId;
  const redo = document.getElementById("qb-redo");
  if (redo) redo.onclick = () => renderQBDo(fid, "redo");
  document.getElementById("qb-again").onclick = () => renderQBDo(fid, "");
}

document.addEventListener("keydown", e => {
  if (!qbRun || currentRoute()[0] !== "qbank" || currentRoute()[1] !== "do") return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || document.querySelector(".modal-overlay.show")) return;
  if (qbRun.i >= qbRun.list.length) return;
  const map = { "1": "A", "2": "B", "3": "C", a: "A", b: "B", c: "C" };
  const k = e.key.toLowerCase();
  if (qbRun.picked === null && map[k]) qbPick(map[k]);
  else if (qbRun.picked !== null && e.key === "Enter" && e.target.id !== "qb-next") { e.preventDefault(); qbNext(); }
});

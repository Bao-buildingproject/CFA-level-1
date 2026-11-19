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
  qbIndexReset();
}
async function qbiPut(rec) {
  rec.profile = PROFILES.active; rec.key = `${rec.profile}|${rec.fileId}`;
  QBI[rec.fileId] = rec;
  qbIndexReset();
  try { await qbiTx("readwrite", st => st.put(rec)); return true; } catch (e) { return false; }
}
async function qbiDelete(fileId) {
  delete QBI[fileId];
  qbIndexReset();
  try { await qbiTx("readwrite", st => st.delete(`${PROFILES.active}|${fileId}`)); } catch (e) { /* ignore */ }
}
async function qbiClearProfile(pid) {
  try {
    const keys = await qbiTx("readonly", st => st.index("profile").getAllKeys(pid));
    await qbiTx("readwrite", st => (keys || []).forEach(k => st.delete(k)));
  } catch (e) { /* ignore */ }
  if (pid === PROFILES.active) { QBI = {}; qbIndexReset(); }
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
  let pre = ex >= 0 ? body.slice(0, ex) : body;
  // "...closest to:A. 98.40" — choice A glued to the end of the stem
  if (!/(^|\n)\s*A[.)]\s/.test(pre)) pre = pre.replace(/([:?])\s*A\.\s/, "$1\nA. ");
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
  // No ✔ found: the explanation names the wrong choices "(Choice A)", "(Choices B and C)"
  if (!ans) {
    const wrong = new Set();
    for (const m of post.matchAll(/\(Choices?\s+([ABC](?:\s*(?:,|and)\s*[ABC])*)\)/g)) m[1].match(/[ABC]/g).forEach(L => wrong.add(L));
    if (wrong.size === 2) ans = order.find(L => !wrong.has(L));
  }
  return { q: stem, choices, ans, expl: qbClean(post), remember: qbClean(remember).replace(/\n(?!\n)/g, " ") };
}

// ---------- Read PDF files in the browser (pdf.js, bundled in js/vendor) ----------
async function qbLoadPdfjs() {
  if (window.pdfjsLib) return;
  await new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = "js/vendor/pdf.min.js"; sc.onload = res;
    sc.onerror = () => rej(new Error("Could not load the PDF reader"));
    document.head.appendChild(sc);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
}

async function qbPdfText(file) {
  await qbLoadPdfjs();
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    let lastY = null, lastH = 10;
    for (const it of tc.items) {
      if (typeof it.str !== "string") continue;
      const y = it.transform[5], h = Math.abs(it.transform[3]) || lastH;
      if (lastY !== null && Math.abs(y - lastY) > 2) out += (lastY - y > 1.8 * h) ? "\n\n" : "\n";
      out += it.str;
      if (it.str.trim() || lastY === null) { lastY = y; lastH = h; }
    }
    out += "\n\n";
  }
  return out;
}

const qbNorm = s => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
function qbTokenScore(a, b) {
  const A = new Set(qbNorm(a).split(" ").filter(w => w.length > 2)), B = new Set(qbNorm(b).split(" ").filter(w => w.length > 2));
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(w => { if (B.has(w)) n++; });
  return n / Math.max(A.size, B.size);
}

// "6. Simulation Methods - Answers.pdf" -> the matching Question Bank set
function qbMatchFile(name, firstLine) {
  const base = name.replace(/\.pdf$/i, "").replace(/\s*[-–]\s*(answers?|questions?)\s*$/i, "");
  const m = base.match(/^\s*(\d+)\s*[.)-]?\s*(.*)$/);
  const n = m ? +m[1] : null, title = m ? m[2] : base;
  const cands = [];
  TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => {
    const clean = f[1].replace(/\s*\(.*?\)\s*$/, "");
    let score = qbNorm(clean) === qbNorm(title) ? 1 : qbTokenScore(clean, title);
    if (firstLine) score = Math.max(score, qbNorm(firstLine).startsWith(qbNorm(clean)) ? 0.95 : 0);
    if (n !== null && f[0] === n) score += 0.05;
    cands.push([score, f[2]]);
  }));
  cands.sort((a, b) => b[0] - a[0]);
  return cands[0] && cands[0][0] >= 0.6 ? cands[0][1] : null;
}

// Import many Answers PDFs at once. onStep(i, total, name) reports progress.
async function qbImportPdfs(files, onStep) {
  const report = { sets: [], skipped: [], failed: [] };
  const list = [...files];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    onStep && onStep(i + 1, list.length, f.name);
    if (/questions?\s*\.pdf$/i.test(f.name)) { report.skipped.push(`${f.name} (use the Answers file)`); continue; }
    try {
      const text = await qbPdfText(f);
      const firstLine = (text.trim().split("\n")[0] || "").replace(/\s*-\s*Answers.*$/i, "");
      const fileId = qbMatchFile(f.name, firstLine);
      if (!fileId) { report.failed.push(`${f.name} — no matching set`); continue; }
      const parsed = qbParse(text);
      if (!parsed.questions.length) { report.failed.push(`${f.name} — no questions found`); continue; }
      const info = qbFileInfo(fileId);
      const missingAns = parsed.questions.filter(q => !q.ans).length;
      const keep = parsed.questions.filter(q => q.ans);
      await qbiPut({ fileId, topic: info.topic.id, title: info.title, total: parsed.total, questions: keep, importedAt: todayStr() });
      const st = qbState(fileId);
      if (st.count < parsed.total) st.count = parsed.total;
      report.sets.push({ fileId, title: `${info.topic.id} · ${info.n}. ${info.title}`, n: keep.length, total: parsed.total, missingAns });
    } catch (e) { report.failed.push(`${f.name} — ${e.message || "could not read"}`); }
  }
  saveData();
  return report;
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
      <h2>1 · Choose the Answers PDF</h2>
      <p class="text-2">Download <strong>${info.n}. ${esc(info.title)} - Answers.pdf</strong> from the <a href="${folder}" target="_blank" rel="noopener">folder</a>, then pick it here:</p>
      <label class="btn btn-primary" style="margin:10px 0 18px">${icon("upload", 18)} Choose PDF file<input type="file" id="qbi-file" accept="application/pdf,.pdf" hidden></label>
      <p class="text-3 small">Or copy and paste the text instead:</p>
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

  const fileIn = document.getElementById("qbi-file");
  fileIn.onchange = async () => {
    const f = fileIn.files[0]; if (!f) return;
    toast("Reading PDF…");
    try {
      qbDraft.text = await qbPdfText(f);
      qbDraft.parsed = qbParse(qbDraft.text);
      if (!qbDraft.parsed.questions.length) toast("No questions found in this PDF", "error");
    } catch (e) { toast(e.message || "Could not read the PDF", "error"); }
    renderQBImport(fileId);
  };
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


// ---------- Question packs (.cfaqb.json): whole topics with the full explanations ----------
// A pack holds sets in the same shape as above plus "rich" content (formatted text, tables,
// pictures). It is imported into this browser only — nothing is uploaded.
async function qbImportPackages(files, onStep) {
  const report = { sets: [], skipped: [], failed: [], pack: true };
  const list = [...files];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    onStep && onStep(i + 1, list.length, f.name);
    try {
      const pkg = JSON.parse(await f.text());
      if (!pkg || pkg.kind !== "qbank-package" || !Array.isArray(pkg.sets)) { report.failed.push(`${f.name} — not a question pack`); continue; }
      for (const rec of pkg.sets) {
        const info = qbFileInfo(rec.fileId);
        if (!info || !Array.isArray(rec.questions)) { report.failed.push(`${f.name} — unknown set ${rec.title || ""}`); continue; }
        await qbiPut({ ...rec, importedAt: todayStr() });
        const st = qbState(rec.fileId);
        if (st.count < rec.total) st.count = rec.total;
        report.sets.push({ fileId: rec.fileId, title: `${info.topic.id} · ${info.n}. ${info.title}`, n: rec.questions.length, total: rec.total, missingAns: rec.questions.filter(q => !q.ans).length });
      }
    } catch (e) { report.failed.push(`${f.name} — ${e.message || "could not read"}`); }
  }
  saveData();
  qbIndexReset();
  return report;
}

// Formatted runs: bold, italic, sub- and superscripts
function qbRuns(rs) {
  return (rs || []).map(r => {
    let h = esc(r.t);
    if (r.sup) h = `<sup>${h}</sup>`; else if (r.sub) h = `<sub>${h}</sub>`;
    if (r.i) h = `<em>${h}</em>`;
    if (r.b) h = `<strong>${h}</strong>`;
    return h;
  }).join("");
}
function qbTableHtml(b) {
  const rows = [];
  for (let r = 0; r < b.rows; r++) {
    const cells = b.cells.filter(c => c.r === r);
    if (!cells.length) continue;
    rows.push(`<tr>${cells.map(c => {
      let inner = "", ul = [];
      const flush = () => { if (ul.length) { inner += `<ul>${ul.join("")}</ul>`; ul = []; } };
      (c.p || []).forEach(p => { if (p.bullet) ul.push(`<li>${qbRuns(p.runs)}</li>`); else { flush(); inner += `<div>${qbRuns(p.runs)}</div>`; } });
      flush();
      return `<td${c.cs > 1 ? ` colspan="${c.cs}"` : ""}${c.rs > 1 ? ` rowspan="${c.rs}"` : ""}>${inner}</td>`;
    }).join("")}</tr>`);
  }
  return `<div class="table-wrap"><table class="qb-table">${rows.join("")}</table></div>`;
}
function qbBlocksHtml(blocks, rec) {
  let html = "", ul = [];
  const flush = () => { if (ul.length) { html += `<ul class="qb-ul">${ul.join("")}</ul>`; ul = []; } };
  for (const b of blocks || []) {
    if (b.k === "bullet") { ul.push(`<li>${qbRuns(b.runs)}</li>`); continue; }
    flush();
    if (b.k === "img") {
      const src = rec && rec.images && rec.images[b.id];
      html += src ? `<img class="qb-img" src="${src}" alt="" loading="lazy" style="width:${Math.round(b.w * 1.333)}px">` : "";
    } else if (b.k === "table") html += qbTableHtml(b);
    else if (b.k === "h") html += `<h4 class="qb-h">${qbRuns(b.runs)}</h4>`;
    else html += `<p>${qbRuns(b.runs)}</p>`;
  }
  flush();
  return html;
}

// ---------- Question Bank questions inside mock exams ----------
// Each answered question of an imported set becomes a mock question with the id "qb|<fileId>|<n>".
let QB_INDEX = null;
function qbIndexReset() { QB_INDEX = null; }
function qbIndex() {
  if (QB_INDEX) return QB_INDEX;
  QB_INDEX = new Map();
  Object.values(QBI).forEach(rec => {
    const info = qbFileInfo(rec.fileId);
    if (!info) return;
    const mod = typeof qbSetModule === "function" ? qbSetModule(rec.fileId) : null;
    rec.questions.forEach(q => {
      if (!q.ans) return;
      const id = `qb|${rec.fileId}|${q.n}`;
      QB_INDEX.set(id, { id, qb: true, fileId: rec.fileId, n: q.n, topic: info.topic.id, chapter: mod, level: "exam",
        setTitle: info.title, setN: info.n, question: q.q, choices: q.choices, answer: q.ans, rich: q.rich || null, src: q,
        get attempts() { const st = (DATA.qbt || {})[rec.fileId]; return st && st.marks[q.n] ? [1] : []; } });
    });
  });
  return QB_INDEX;
}
// Questions from sets you have not skipped
function qbMockPool() { return [...qbIndex().values()].filter(q => !qbSkipped(q.fileId)); }
function qbRecordAnswer(q, picked) {
  const correct = picked === q.answer;
  const st = qbState(q.fileId);
  if (st.count < q.n) st.count = Math.max(q.n, (QBI[q.fileId] || {}).total || 0);
  st.marks[q.n] = correct ? "r" : "w";
  const log = DATA.dailyLog[todayStr()] || (DATA.dailyLog[todayStr()] = {});
  log.questionsDone = (log.questionsDone || 0) + 1;
  log.questionsRight = (log.questionsRight || 0) + (correct ? 1 : 0);
  return correct;
}

// ---------- Practice run (#/qbank/do/<fileId>[/redo]) ----------
function renderQBDo(fileId, mode) {
  const rec = QBI[fileId];
  const info = qbFileInfo(fileId);
  if (!rec || !info) {
    view.innerHTML = `${pageHeader("Question set")}<div class="card">${emptyState("flag", "Not on this device yet",
      "Load the question sets on the Question Bank page first, then you can answer this set here.")}
      <div class="form-actions" style="justify-content:center"><a class="btn btn-primary" href="#/qbank">Go to Question Bank</a></div></div>`;
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
  const rec = QBI[r.fileId];
  const why = answered && !ok && !q.rich ? qbWhyNot(q, r.picked) : "";
  const qq = { answer: q.ans, choices: q.choices, qb: !!q.rich, rich: q.rich };
  const noKey = !q.ans;

  view.innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <div class="session-bar">
        <button class="icon-btn" id="qb-quit" aria-label="Stop">${icon("x", 20)}</button>
        ${progressBar(pct(r.i, r.list.length))}
        <span class="text-2 small mono">${r.i + 1}/${r.list.length}</span>
      </div>
      <div class="card">
        <div class="q-meta"><span class="badge">${r.info.topic.id}</span><span class="text-3 small">${esc(r.info.title)} · Question ${q.n} of ${QBI[r.fileId].total}${r.mode === "redo" ? " · redo" : ""}</span></div>
        ${q.rich ? `<div class="q-rich">${qbBlocksHtml(q.rich.stem, rec)}</div>` : `<div class="q-text">${esc(q.q)}</div>`}
        ${choicesHtml(qq, r.picked, answered && !noKey)}
        ${answered ? `
          <div class="explain">
            <div class="explain-head ${noKey ? "" : ok ? "ok" : "bad"}">${icon(noKey ? "alert" : ok ? "check" : "alert", 18)} ${noKey ? `You chose ${r.picked} · the source has no answer key for this question` : ok ? `Correct — ${q.ans} is right` : `Incorrect — you chose ${r.picked}, the answer is ${q.ans}`}</div>
            <div class="explain-body">
              ${q.rich ? (q.rich.expl.length ? `<div class="qb-rich-expl">${qbBlocksHtml(q.rich.expl, rec)}</div>` : `<p class="text-3">Explanation: not provided in the source.</p>`) : `
              ${why ? `<div class="explain-block"><h4>Why ${r.picked} is wrong</h4><p>${esc(why)}</p></div>` : ""}
              ${q.expl ? `<div class="explain-block"><h4>${ok ? `Why ${q.ans} is correct` : "Explanation"}</h4>${qbParas(q.expl)}</div>` : ""}
              ${q.remember ? `<div class="explain-block"><h4>Things to remember</h4><p>${esc(q.remember)}</p></div>` : ""}`}
            </div>
            ${typeof tutorButtonHtml === "function" ? `<div class="explain-ask">${tutorButtonHtml({ label: `${r.info.topic.id} · ${r.info.title} · Q${q.n}`, topic: r.info.topic.name, where: `${r.info.title}, question ${q.n}`,
              stem: q.q, choices: q.choices, answer: q.ans, picked: r.picked, expl: [q.expl, q.remember && `Things to remember: ${q.remember}`].filter(Boolean).join("\n\n") })}</div>` : ""}
          </div>
          <button class="btn btn-primary btn-lg btn-block" id="qb-next" style="margin-top:20px">${r.i + 1 < r.list.length ? "Next question" : "See results"} ${icon("next", 18)}</button>`
        : `<p class="text-3 small hide-mobile" style="margin-top:14px">Keyboard: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> or <span class="kbd">A</span> <span class="kbd">B</span> <span class="kbd">C</span> · <span class="kbd">Enter</span> next</p>`}
      </div>
    </div>`;

  document.getElementById("qb-quit").onclick = async () => {
    if (r.results.length && r.i < r.list.length && !await confirmDialog({ title: "Stop this set?", message: "Answers so far are already saved as marks.", confirmText: "Stop" })) return;
    qbRun = null; location.hash = `#/qbank/topic/${r.info.topic.id}`;
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
  if (!q.ans) { qbDraw(); return; }
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
        <h1 style="margin-bottom:6px">${r.results.length ? pct(right, r.results.length) : 0}%</h1>
        <p class="text-2">${right} of ${r.results.length} correct · ${esc(r.info.title)}</p>
        ${wrong.length ? `<div class="callout warning" style="margin-top:16px;text-align:left">${icon("alert", 18)}<div>Wrong: <strong>${wrong.map(x => x.n).join(", ")}</strong> — saved to the redo list.</div></div>` : `<div class="callout success" style="margin-top:16px;text-align:left">${icon("check", 18)}<div>All correct!</div></div>`}
        <div class="row-gap" style="justify-content:center;margin-top:20px">
          ${qbStats(r.fileId).redo.length ? `<button class="btn btn-primary" id="qb-redo">Redo wrong answers</button>` : ""}
          <button class="btn btn-secondary" id="qb-again">Do the whole set again</button>
          <a class="btn btn-ghost" href="#/qbank/topic/${r.info.topic.id}">Back to ${r.info.topic.name}</a>
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

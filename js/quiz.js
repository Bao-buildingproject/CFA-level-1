// ============================================================
// quiz.js — question bank (A/B/C), practice mode, mistake log
// Wrong → Mistake log. Right twice in a row → leaves the log.
// ============================================================

const LETTERS = ["A", "B", "C"];
const LEVELS = { foundation: "Foundation", application: "Application", exam: "Exam style" };

// ---------- Stats ----------
function quizStats(list) {
  list = list || DATA.questions;
  const attempts = list.flatMap(q => q.attempts);
  const right = attempts.filter(a => a.correct).length;
  return {
    total: list.length,
    tried: list.filter(q => q.attempts.length).length,
    attempts: attempts.length,
    pct: attempts.length ? pct(right, attempts.length) : null,
    mistakes: list.filter(q => q.inMistakeLog).length,
    flagged: list.filter(q => q.flagged).length
  };
}

// ---------- Record an answer (used by practice AND mock exams) ----------
function recordAnswer(q, picked) {
  const correct = picked === q.answer;
  const today = todayStr();
  q.attempts.push({ date: today, picked, correct });
  if (correct) {
    q.correctStreak++;
    if (q.inMistakeLog && q.correctStreak >= 2) q.inMistakeLog = false;
  } else {
    q.correctStreak = 0;
    q.inMistakeLog = true;
  }
  const log = DATA.dailyLog[today] || (DATA.dailyLog[today] = {});
  log.questionsDone = (log.questionsDone || 0) + 1;
  log.questionsRight = (log.questionsRight || 0) + (correct ? 1 : 0);
  return correct;
}

// ---------- Create ----------
function newQuestionObject(f) {
  return normalizeQuestion({
    id: makeId("q"), topic: f.topic, chapter: f.chapter || null, los: f.los || "",
    level: LEVELS[f.level] ? f.level : "exam",
    question: f.question, choices: { A: f.A, B: f.B, C: f.C }, answer: f.answer,
    explanation: f.explanation || "", whyNot: f.whyNot || "", trap: f.trap || "", calc: f.calc || "",
    source: f.source || "self", createdAt: todayStr()
  });
}

const Q_CSV_HEADER = "topic,chapter,los,level,question,A,B,C,answer,explanation,whynot,trap,calc,source";

function importQuestionsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { added: 0, skipped: 0, errors: ["File is empty."] };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = name => header.indexOf(name);
  for (const need of ["topic", "question", "a", "b", "c", "answer"]) {
    if (col(need) < 0) return { added: 0, skipped: 0, errors: [`Missing column "${need}". First row must be: ${Q_CSV_HEADER}`] };
  }
  const get = (r, name) => (col(name) >= 0 ? (r[col(name)] || "").trim() : "");
  const existing = new Set(DATA.questions.map(q => q.topic + "|" + q.question.trim().toLowerCase()));
  let added = 0, skipped = 0;
  const errors = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const topic = get(r, "topic").toUpperCase();
    const question = get(r, "question"), answer = get(r, "answer").toUpperCase();
    const A = get(r, "a"), B = get(r, "b"), C = get(r, "c");
    const level = get(r, "level").toLowerCase();
    if (!topicById(topic)) { errors.push(`Row ${line}: unknown topic "${topic}"`); return; }
    if (!question) { errors.push(`Row ${line}: question is empty`); return; }
    if (!A || !B || !C) { errors.push(`Row ${line}: choices A, B and C must all be filled`); return; }
    if (!LETTERS.includes(answer)) { errors.push(`Row ${line}: answer must be A, B or C (got "${answer}")`); return; }
    if (level && !LEVELS[level]) { errors.push(`Row ${line}: level must be foundation, application or exam`); return; }
    const key = topic + "|" + question.toLowerCase();
    if (existing.has(key)) { skipped++; return; }
    existing.add(key);
    DATA.questions.push(newQuestionObject({
      topic, question, A, B, C, answer, level: level || "exam",
      chapter: chapterIdFrom(topic, get(r, "chapter")), los: get(r, "los"),
      explanation: get(r, "explanation"), whyNot: get(r, "whynot"), trap: get(r, "trap"),
      calc: get(r, "calc"), source: get(r, "source")
    }));
    added++;
  });
  saveData();
  return { added, skipped, errors };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Shared question UI (practice + mock review) ----------
// state: { picked, reveal } — reveal shows right/wrong colours + explanation
function choicesHtml(q, picked, reveal) {
  return `<div class="choices" role="radiogroup" aria-label="Answer choices">${LETTERS.map(L => {
    let cls = "choice";
    if (reveal) {
      if (L === q.answer) cls += " correct";
      else if (L === picked) cls += " wrong";
      else cls += " dim";
    } else if (L === picked) cls += " selected";
    return `<button class="${cls}" data-pick="${L}" role="radio" aria-checked="${L === picked}" ${reveal ? "disabled" : ""}>
      <span class="letter">${L}</span><span class="choice-text">${esc(q.choices[L])}</span></button>`;
  }).join("")}</div>`;
}

function explanationHtml(q, picked) {
  const ok = picked === q.answer;
  const blocks = [
    q.explanation && `<div class="explain-block"><h4>Why ${q.answer} is correct</h4><p>${esc(q.explanation)}</p></div>`,
    q.whyNot && `<div class="explain-block"><h4>Why not the others</h4><p>${esc(q.whyNot)}</p></div>`,
    q.trap && `<div class="explain-block"><h4>Exam trap</h4><p>${esc(q.trap)}</p></div>`,
    q.calc && `<div class="explain-block"><h4>BA II Plus</h4><div class="calc-box">${esc(q.calc)}</div></div>`,
    q.vi && `<div class="explain-block"><h4>Tóm tắt</h4><p>${esc(q.vi)}</p></div>`
  ].filter(Boolean).join("");
  return `<div class="explain">
    <div class="explain-head ${ok ? "ok" : "bad"}">${icon(ok ? "check" : "alert", 18)} ${ok ? "Correct" : picked ? `Incorrect — the answer is ${q.answer}` : `Not answered — the answer is ${q.answer}`}</div>
    ${blocks ? `<div class="explain-body">${blocks}</div>` : ""}
  </div>`;
}

function questionMetaHtml(q) {
  const t = topicById(q.topic);
  return `<div class="q-meta">
    <span class="badge">${t ? t.id : q.topic}</span>${levelBadge(q.level)}
    ${q.los ? `<span class="text-3 small">${esc(q.los)}</span>` : ""}
  </div>`;
}

// ================= PRACTICE PAGE (#/practice) =================
const practiceCfg = { topic: "", module: "", mode: "all", level: "", count: 20 };
let bankFilter = "";

function renderQuestions() {
  const s = quizStats();
  const log = DATA.dailyLog[todayStr()] || {};
  const modes = [["all", "All"], ["new", "Not tried"], ["mistakes", `Mistakes (${s.mistakes})`], ["flagged", `Flagged (${s.flagged})`]];

  const perTopic = TOPICS.map(t => {
    const ts = quizStats(DATA.questions.filter(q => q.topic === t.id));
    if (!ts.total) return "";
    return `<tr><td>${t.name}</td><td class="num">${ts.total}</td><td class="num">${ts.tried}</td>
      <td class="num">${ts.pct === null ? "–" : `<strong>${ts.pct}%</strong>`}</td>
      <td class="num">${ts.mistakes ? `<span class="badge badge-danger">${ts.mistakes}</span>` : "–"}</td></tr>`;
  }).join("");

  view.innerHTML = `
    ${pageHeader("Practice", "Instant feedback after each question · mistakes are saved automatically")}

    <div class="grid grid-stats">
      <div class="card stat"><div class="stat-icon">${icon("grid", 18)}</div><span class="stat-label">Questions in bank</span><span class="stat-value">${s.total}</span></div>
      <div class="card stat"><div class="stat-icon accent">${icon("target", 18)}</div><span class="stat-label">Accuracy</span><span class="stat-value">${s.pct === null ? "–" : s.pct + "%"}</span></div>
      <div class="card stat"><div class="stat-icon danger">${icon("alert", 18)}</div><span class="stat-label">Mistake log</span><span class="stat-value">${s.mistakes}</span></div>
      <div class="card stat"><div class="stat-icon warning">${icon("check", 18)}</div><span class="stat-label">Done today</span><span class="stat-value">${log.questionsDone || 0}</span><span class="stat-hint">${log.questionsRight || 0} right</span></div>
    </div>

    <div class="card section">
      <div class="card-head"><h2>Start a practice set</h2></div>
      <div class="form-grid">
        <label class="field"><span class="field-label">Topic</span><select class="select" id="qz-topic">${topicOptions(practiceCfg.topic, true)}</select></label>
        <label class="field"><span class="field-label">Module</span><select class="select" id="qz-module"></select></label>
        <label class="field"><span class="field-label">Level</span><select class="select" id="qz-level">
          <option value="">All levels</option>${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${practiceCfg.level === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <div class="field full"><span class="field-label">Questions</span>
          <div class="segmented" id="qz-mode">${modes.map(([k, v]) => `<button data-mode="${k}" class="${practiceCfg.mode === k ? "active" : ""}">${v}</button>`).join("")}</div></div>
        <div class="field full"><span class="field-label">How many</span>
          <div class="segmented" id="qz-count">${[10, 20, 30, 0].map(n => `<button data-count="${n}" class="${practiceCfg.count === n ? "active" : ""}">${n || "All"}</button>`).join("")}</div></div>
      </div>
      <div class="form-actions" style="justify-content:space-between;align-items:center">
        <span class="text-2 small" id="qz-available"></span>
        <button class="btn btn-primary btn-lg" id="btn-qz-start">${icon("play", 18)} Start</button>
      </div>
    </div>

    ${perTopic ? `<div class="card section"><div class="card-head"><h2>By topic</h2></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th class="num">Qs</th><th class="num">Tried</th><th class="num">Accuracy</th><th class="num">Mistakes</th></tr></thead><tbody>${perTopic}</tbody></table></div></div>` : ""}

    <div class="card section">
      <div class="tabs">
        <button class="tab active" data-pane="add">Add question</button>
        <button class="tab" data-pane="import">Import CSV</button>
        <button class="tab" data-pane="bank">Question bank (${s.total})</button>
      </div>
      <div data-panel="add">${addQuestionFormHtml()}</div>
      <div data-panel="import" hidden>
        <p class="text-2 small">Required columns: <code>topic, question, A, B, C, answer</code>. Optional: <code>chapter, los, level, explanation, whynot, trap, calc, source</code>. <code>level</code> = foundation / application / exam.</p>
        <div class="row-gap" style="margin-top:16px">
          <button class="btn btn-secondary" id="btn-q-template">${icon("download", 18)} Template</button>
          <label class="btn btn-primary">${icon("upload", 18)} Choose CSV file<input type="file" id="q-csv" accept=".csv,text/csv" hidden></label>
        </div>
        <div id="qcsv-msg"></div>
      </div>
      <div data-panel="bank" hidden>
        <select class="select" id="q-filter" style="max-width:320px">${topicOptions(bankFilter, true)}</select>
        <div id="q-list" class="list" style="margin-top:8px"></div>
      </div>
    </div>`;

  // ---- practice config ----
  const pool = () => {
    let p = DATA.questions.filter(q => (!practiceCfg.topic || q.topic === practiceCfg.topic) && (!practiceCfg.module || q.chapter === practiceCfg.module) && (!practiceCfg.level || q.level === practiceCfg.level));
    if (practiceCfg.mode === "new") p = p.filter(q => !q.attempts.length);
    if (practiceCfg.mode === "mistakes") p = p.filter(q => q.inMistakeLog);
    if (practiceCfg.mode === "flagged") p = p.filter(q => q.flagged);
    return p;
  };
  const updateAvail = () => {
    const n = pool().length;
    document.getElementById("qz-available").textContent = `${n} matching question${n === 1 ? "" : "s"}`;
    document.getElementById("btn-qz-start").disabled = n === 0;
  };
  const modSel = document.getElementById("qz-module");
  const fillModules = () => {
    const mods = practiceCfg.topic ? modulesOf(practiceCfg.topic) : [];
    if (!mods.some(m => m.id === practiceCfg.module)) practiceCfg.module = "";
    modSel.innerHTML = `<option value="">${practiceCfg.topic ? "All modules" : "Pick a topic first"}</option>` +
      mods.map(m => `<option value="${m.id}" ${m.id === practiceCfg.module ? "selected" : ""}>${m.n}. ${esc(m.title)}</option>`).join("");
    modSel.disabled = !practiceCfg.topic;
  };
  fillModules();
  modSel.onchange = e => { practiceCfg.module = e.target.value; updateAvail(); };
  document.getElementById("qz-topic").onchange = e => { practiceCfg.topic = e.target.value; fillModules(); updateAvail(); };
  document.getElementById("qz-level").onchange = e => { practiceCfg.level = e.target.value; updateAvail(); };
  view.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    practiceCfg.mode = b.dataset.mode;
    view.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("active", x === b));
    updateAvail();
  });
  view.querySelectorAll("[data-count]").forEach(b => b.onclick = () => {
    practiceCfg.count = +b.dataset.count;
    view.querySelectorAll("[data-count]").forEach(x => x.classList.toggle("active", x === b));
  });
  document.getElementById("btn-qz-start").onclick = () => {
    let list = shuffle(pool());
    if (practiceCfg.count) list = list.slice(0, practiceCfg.count);
    if (list.length) startQuiz(list);
  };
  updateAvail();

  // ---- tabs ----
  view.querySelectorAll("[data-pane]").forEach(tab => tab.onclick = () => {
    view.querySelectorAll("[data-pane]").forEach(t => t.classList.toggle("active", t === tab));
    view.querySelectorAll("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== tab.dataset.pane);
  });

  bindAddQuestionForm();

  document.getElementById("btn-q-template").onclick = () => downloadFile("questions-template.csv",
    "﻿" + Q_CSV_HEADER + "\n" +
    'QM,1,Calculate EAR,application,"A deposit pays 8% a year, compounded quarterly. Its EAR is closest to:",8.00%,8.24%,8.33%,B,"Quarterly rate 2%. 1.02^4 - 1 = 8.24%.","A ignores compounding. C is too high.",Stated rate ≠ effective rate,"2ND ICONV: NOM=8, C/Y=4, CPT EFF",self\n',
    "text/csv;charset=utf-8");

  document.getElementById("q-csv").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const res = importQuestionsCSV(await file.text());
    document.getElementById("qcsv-msg").innerHTML = importResultHtml(res);
    e.target.value = "";
    if (res.added) { toast(`${res.added} question(s) imported`); updateAvail(); refreshShell(); }
  };

  const filter = document.getElementById("q-filter");
  const drawList = () => {
    bankFilter = filter.value;
    const list = DATA.questions.filter(q => !bankFilter || q.topic === bankFilter);
    document.getElementById("q-list").innerHTML = list.length ? list.map(q => {
      const right = q.attempts.filter(a => a.correct).length;
      return `<div class="list-item">
        <div class="list-main">
          <div class="list-title">${esc(q.question)}</div>
          <div class="list-meta">${q.chapter || q.topic} · ${LEVELS[q.level]}${q.builtIn ? " · built-in" : ""} · answer ${q.answer} · ${right}/${q.attempts.length} right
            ${q.inMistakeLog ? ` · <span style="color:var(--danger)">in mistake log</span>` : ""}${q.flagged ? " · flagged" : ""}</div>
        </div>
        <button class="icon-btn danger" data-delq="${q.id}" aria-label="Delete question">${icon("trash", 18)}</button>
      </div>`;
    }).join("") : emptyState("grid", "No questions yet", "Add your own questions or import a CSV.");
    document.querySelectorAll("[data-delq]").forEach(b => b.onclick = async () => {
      if (!await confirmDialog({ title: "Delete question?", message: "Its attempt history will be lost.", confirmText: "Delete", danger: true })) return;
      DATA.questions = DATA.questions.filter(q => q.id !== b.dataset.delq);
      saveData(); drawList(); updateAvail(); toast("Question deleted"); refreshShell();
    });
  };
  filter.onchange = drawList;
  drawList();
}

function addQuestionFormHtml() {
  return `
    <div class="form-grid">
      <label class="field"><span class="field-label">Topic</span><select class="select" id="aq-topic">${topicOptions()}</select></label>
      <label class="field"><span class="field-label">Level</span><select class="select" id="aq-level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === "exam" ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="field"><span class="field-label">Chapter no. (optional)</span><input class="input" type="number" id="aq-chapter" min="1" inputmode="numeric"></label>
      <label class="field"><span class="field-label">LOS (optional)</span><input class="input" id="aq-los" placeholder="Calculate EAR"></label>
      <label class="field full"><span class="field-label">Question (your own words)</span><textarea class="textarea" id="aq-question" rows="3"></textarea></label>
      <label class="field full"><span class="field-label">A</span><input class="input" id="aq-A"></label>
      <label class="field full"><span class="field-label">B</span><input class="input" id="aq-B"></label>
      <label class="field full"><span class="field-label">C</span><input class="input" id="aq-C"></label>
      <div class="field full"><span class="field-label">Correct answer</span>
        <div class="segmented" id="aq-answer">${LETTERS.map((L, i) => `<button data-ans="${L}" class="${i === 0 ? "active" : ""}">${L}</button>`).join("")}</div></div>
      <label class="field full"><span class="field-label">Why it's correct</span><textarea class="textarea" id="aq-expl" rows="2"></textarea></label>
      <label class="field full"><span class="field-label">Why the others are wrong (optional)</span><textarea class="textarea" id="aq-whynot" rows="2"></textarea></label>
      <label class="field"><span class="field-label">Exam trap (optional)</span><input class="input" id="aq-trap"></label>
      <label class="field"><span class="field-label">BA II Plus steps (optional)</span><input class="input" id="aq-calc"></label>
    </div>
    <div class="form-actions"><button class="btn btn-primary" id="btn-aq-save">${icon("save", 18)} Save question</button></div>`;
}

function bindAddQuestionForm() {
  let answer = "A";
  view.querySelectorAll("[data-ans]").forEach(b => b.onclick = () => {
    answer = b.dataset.ans;
    view.querySelectorAll("[data-ans]").forEach(x => x.classList.toggle("active", x === b));
  });
  document.getElementById("btn-aq-save").onclick = () => {
    const el = id => document.getElementById(id);
    const required = ["aq-question", "aq-A", "aq-B", "aq-C"];
    let ok = true;
    required.forEach(id => { const bad = !el(id).value.trim(); el(id).classList.toggle("invalid", bad); if (bad) ok = false; });
    if (!ok) { toast("Question and all three choices are required", "error"); return; }
    const topic = el("aq-topic").value;
    DATA.questions.push(newQuestionObject({
      topic, level: el("aq-level").value, chapter: chapterIdFrom(topic, el("aq-chapter").value), los: el("aq-los").value.trim(),
      question: el("aq-question").value.trim(), A: el("aq-A").value.trim(), B: el("aq-B").value.trim(), C: el("aq-C").value.trim(),
      answer, explanation: el("aq-expl").value.trim(), whyNot: el("aq-whynot").value.trim(),
      trap: el("aq-trap").value.trim(), calc: el("aq-calc").value.trim()
    }));
    saveData();
    ["aq-question", "aq-A", "aq-B", "aq-C", "aq-expl", "aq-whynot", "aq-trap", "aq-calc", "aq-los"].forEach(id => el(id).value = "");
    toast("Question saved");
    renderQuestions();
  };
}

// ================= PRACTICE SESSION =================
let quiz = null;

function startQuiz(list) {
  quiz = { list, i: 0, picked: null, results: [] };
  drawQuiz();
}

function drawQuiz() {
  if (!quiz) return renderQuestions();
  if (quiz.i >= quiz.list.length) return drawQuizResult();
  const q = quiz.list[quiz.i];
  const answered = quiz.picked !== null;

  view.innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <div class="session-bar">
        <button class="icon-btn" id="btn-qz-quit" aria-label="Stop practice">${icon("x", 20)}</button>
        ${progressBar(pct(quiz.i, quiz.list.length))}
        <span class="text-2 small mono">${quiz.i + 1}/${quiz.list.length}</span>
      </div>
      <div class="card">
        <div class="row-between">${questionMetaHtml(q)}
          <button class="btn btn-ghost btn-sm" id="btn-flag" aria-pressed="${q.flagged}" style="${q.flagged ? "color:var(--warning)" : ""}">${icon("flag", 16)} ${q.flagged ? "Flagged" : "Flag"}</button>
        </div>
        <div class="q-text">${esc(q.question)}</div>
        ${choicesHtml(q, quiz.picked, answered)}
        ${answered ? explanationHtml(q, quiz.picked) + `
          <button class="btn btn-primary btn-lg btn-block" id="btn-qz-next" style="margin-top:20px">${quiz.i + 1 < quiz.list.length ? "Next question" : "See results"} ${icon("next", 18)}</button>`
          : `<p class="text-3 small hide-mobile" style="margin-top:14px">Keyboard: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> or <span class="kbd">A</span> <span class="kbd">B</span> <span class="kbd">C</span> · <span class="kbd">Enter</span> next</p>`}
      </div>
    </div>`;

  document.getElementById("btn-qz-quit").onclick = async () => {
    if (quiz.results.length && !await confirmDialog({ title: "Stop practice?", message: "Answers so far are already saved.", confirmText: "Stop" })) return;
    quiz = null; renderQuestions(); refreshShell();
  };
  document.getElementById("btn-flag").onclick = () => { q.flagged = !q.flagged; saveData(); drawQuiz(); toast(q.flagged ? "Flagged for review" : "Flag removed"); };
  view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pickAnswer(b.dataset.pick));
  const next = document.getElementById("btn-qz-next");
  if (next) { next.onclick = nextQuestion; next.focus(); }
}

function pickAnswer(letter) {
  if (!quiz || quiz.picked !== null) return;
  const q = quiz.list[quiz.i];
  quiz.picked = letter;
  quiz.results.push({ q, picked: letter, correct: recordAnswer(q, letter) });
  saveData();
  drawQuiz();
}

function nextQuestion() {
  quiz.i++;
  quiz.picked = null;
  drawQuiz();
  window.scrollTo(0, 0);
}

function drawQuizResult() {
  const right = quiz.results.filter(r => r.correct).length, total = quiz.results.length;
  const wrong = quiz.results.filter(r => !r.correct);
  quiz = null;
  view.innerHTML = `
    <div style="max-width:760px;margin:0 auto">
      <div class="card" style="text-align:center;padding:32px">
        ${progressRing(pct(right, total), 120, 10, "correct")}
        <h1 style="margin-top:16px">${right} / ${total}</h1>
        <p class="text-2" style="margin-top:4px">${wrong.length ? `${wrong.length} question(s) added to your mistake log.` : "Perfect set!"}</p>
        <div class="row-gap" style="justify-content:center;margin-top:20px">
          <button class="btn btn-secondary" id="btn-qz-back">Back to practice</button>
          ${wrong.length ? `<button class="btn btn-primary" id="btn-qz-redo">Retry the ${wrong.length} missed</button>` : ""}
        </div>
      </div>
      ${wrong.length ? `<div class="card section"><div class="card-head"><h2>Missed questions</h2></div><div class="list">
        ${wrong.map(r => `<div class="list-item"><div class="list-main"><div class="list-title">${esc(r.q.question)}</div>
          <div class="list-meta">You chose ${r.picked} · correct ${r.q.answer}</div></div></div>`).join("")}</div></div>` : ""}
    </div>`;
  document.getElementById("btn-qz-back").onclick = renderQuestions;
  const redo = document.getElementById("btn-qz-redo");
  if (redo) redo.onclick = () => startQuiz(shuffle(wrong.map(r => r.q)));
  refreshShell();
}

document.addEventListener("keydown", e => {
  if (!quiz || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || document.querySelector(".modal-overlay.show")) return;
  const map = { "1": "A", "2": "B", "3": "C", a: "A", b: "B", c: "C" };
  const k = e.key.toLowerCase();
  if (quiz.picked === null && map[k]) pickAnswer(map[k]);
  else if (quiz.picked !== null && e.key === "Enter" && e.target.id !== "btn-qz-next") { e.preventDefault(); nextQuestion(); }
});

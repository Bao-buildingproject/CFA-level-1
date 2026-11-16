// ============================================================
// quiz.js — question bank (A/B/C), practice session, mistake log
// Wrong answer -> goes into the Mistake log.
// Right 2 times in a row -> leaves the Mistake log.
// ============================================================

const LETTERS = ["A", "B", "C"];

// ---------- Stats ----------
function quizStats(list) {
  list = list || DATA.questions;
  const tried = list.filter(q => q.attempts.length);
  const attempts = list.flatMap(q => q.attempts);
  const right = attempts.filter(a => a.correct).length;
  return {
    total: list.length,
    tried: tried.length,
    attempts: attempts.length,
    pct: attempts.length ? Math.round((right / attempts.length) * 100) : null,
    mistakes: list.filter(q => q.inMistakeLog).length
  };
}

// ---------- Record an answer ----------
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
  saveData();
  return correct;
}

// ---------- Create a question ----------
function newQuestionObject({ topic, chapter, los, question, A, B, C, answer, explanation, source }) {
  return {
    id: makeId("q"), topic, chapter, los: los || "",
    question, choices: { A, B, C }, answer,
    explanation: explanation || "", source: source || "self",
    attempts: [], inMistakeLog: false, correctStreak: 0,
    createdAt: todayStr()
  };
}

// Returns { added, skipped, errors[] }  (uses parseCSV from flashcards.js)
function importQuestionsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { added: 0, skipped: 0, errors: ["File is empty."] };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = name => header.indexOf(name);
  for (const need of ["topic", "question", "a", "b", "c", "answer"]) {
    if (col(need) < 0) return { added: 0, skipped: 0, errors: [`Missing column "${need}". First row must be: topic,chapter,los,question,A,B,C,answer,explanation,source`] };
  }
  const get = (r, name) => (col(name) >= 0 ? (r[col(name)] || "").trim() : "");
  const existing = new Set(DATA.questions.map(q => q.topic + "|" + q.question.trim().toLowerCase()));
  let added = 0, skipped = 0;
  const errors = [];

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const topic = get(r, "topic").toUpperCase();
    const question = get(r, "question");
    const answer = get(r, "answer").toUpperCase();
    const A = get(r, "a"), B = get(r, "b"), C = get(r, "c");
    if (!topicById(topic)) { errors.push(`Row ${line}: unknown topic "${topic}"`); return; }
    if (!question) { errors.push(`Row ${line}: question is empty`); return; }
    if (!A || !B || !C) { errors.push(`Row ${line}: choices A, B, C must all be filled`); return; }
    if (!LETTERS.includes(answer)) { errors.push(`Row ${line}: answer must be A, B or C (got "${answer}")`); return; }
    const key = topic + "|" + question.toLowerCase();
    if (existing.has(key)) { skipped++; return; }
    existing.add(key);
    DATA.questions.push(newQuestionObject({
      topic, question, A, B, C, answer,
      chapter: chapterIdFrom(topic, get(r, "chapter")),
      los: get(r, "los"), explanation: get(r, "explanation"), source: get(r, "source")
    }));
    added++;
  });
  saveData();
  return { added, skipped, errors };
}

function downloadQuestionTemplate() {
  const csv = "topic,chapter,los,question,A,B,C,answer,explanation,source\n" +
    'QM,1,Calculate EAR,"A deposit pays 8% a year, compounded quarterly. Its EAR is closest to:",8.00%,8.24%,8.33%,B,"Quarterly rate 2%. 1.02^4 - 1 = 8.24%. A ignores compounding; C is too high.",self\n';
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "questions-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= QUESTIONS HOME (#questions) =================
function renderQuestions() {
  const s = quizStats();
  const log = DATA.dailyLog[todayStr()] || {};
  const topicOptions = TOPICS.map(t => `<option value="${t.id}">${t.id} · ${t.name}</option>`).join("");

  const perTopic = TOPICS.map(t => {
    const ts = quizStats(DATA.questions.filter(q => q.topic === t.id));
    if (!ts.total) return "";
    return `<div class="row"><div class="row-main"><strong>${t.id}</strong> · ${ts.total} Qs · tried ${ts.tried}</div>
      <span class="muted">${ts.pct === null ? "–" : ts.pct + "%"}${ts.mistakes ? ` · ❌ ${ts.mistakes}` : ""}</span></div>`;
  }).join("");

  view.innerHTML = `
    <section class="card">
      <h2>Question bank</h2>
      <div class="stat-grid">
        <div><div class="stat">${s.total}</div><div class="muted">questions</div></div>
        <div><div class="stat">${s.pct === null ? "–" : s.pct + "%"}</div><div class="muted">accuracy</div></div>
        <div><div class="stat">${s.mistakes}</div><div class="muted">mistakes</div></div>
      </div>
      <div class="muted" style="text-align:center">Today: ${log.questionsDone || 0} done · ${log.questionsRight || 0} right</div>
    </section>

    <section class="card">
      <h2>Practice</h2>
      <select id="qz-topic"><option value="">All topics</option>${topicOptions}</select>
      <select id="qz-mode">
        <option value="all">All questions</option>
        <option value="new">Not tried yet</option>
        <option value="mistakes">Mistake log only</option>
      </select>
      <select id="qz-count">
        <option value="10">10 questions</option>
        <option value="20" selected>20 questions</option>
        <option value="30">30 questions</option>
        <option value="0">All matching</option>
      </select>
      <button class="btn" id="btn-qz-start" style="width:100%">▶ Start</button>
      ${s.mistakes ? `<button class="btn bad" id="btn-qz-mistakes" style="width:100%">❌ Redo mistake log (${s.mistakes})</button>` : ""}
      <div id="qz-msg"></div>
    </section>

    ${perTopic ? `<section class="card"><h2>By topic</h2>${perTopic}</section>` : ""}

    <section class="card">
      <details>
        <summary><strong>➕ Add a question</strong></summary>
        <select id="aq-topic">${topicOptions}</select>
        <input type="number" id="aq-chapter" min="1" placeholder="Chapter number (optional)" inputmode="numeric">
        <input type="text" id="aq-los" placeholder="LOS (optional), e.g. Calculate EAR">
        <textarea id="aq-question" rows="3" placeholder="Question (your own words)"></textarea>
        <input type="text" id="aq-A" placeholder="A.">
        <input type="text" id="aq-B" placeholder="B.">
        <input type="text" id="aq-C" placeholder="C.">
        <select id="aq-answer"><option>A</option><option>B</option><option>C</option></select>
        <textarea id="aq-expl" rows="3" placeholder="Explanation: why the answer is right AND why the others are wrong"></textarea>
        <button class="btn" id="btn-aq-save">Save question</button>
      </details>
    </section>

    <section class="card">
      <details>
        <summary><strong>⬆️ Import from CSV (Google Sheets)</strong></summary>
        <p class="muted">Columns: <code>topic,chapter,los,question,A,B,C,answer,explanation,source</code>.
        <code>answer</code> must be A, B or C. Duplicates are skipped.</p>
        <button class="btn secondary" id="btn-q-template">⬇️ Download template</button>
        <label class="btn">
          Choose CSV file
          <input type="file" id="q-csv" accept=".csv,text/csv" hidden>
        </label>
        <div id="qcsv-msg"></div>
      </details>
    </section>

    <section class="card">
      <details>
        <summary><strong>📋 All questions (${s.total})</strong></summary>
        <select id="q-filter"><option value="">All topics</option>${topicOptions}</select>
        <div id="q-list"></div>
      </details>
    </section>`;

  // ----- start practice -----
  document.getElementById("btn-qz-start").onclick = () => {
    const topic = document.getElementById("qz-topic").value;
    const mode = document.getElementById("qz-mode").value;
    const count = parseInt(document.getElementById("qz-count").value, 10);
    let pool = DATA.questions.filter(q => !topic || q.topic === topic);
    if (mode === "new") pool = pool.filter(q => !q.attempts.length);
    if (mode === "mistakes") pool = pool.filter(q => q.inMistakeLog);
    pool = shuffle(pool);
    if (count) pool = pool.slice(0, count);
    if (!pool.length) {
      document.getElementById("qz-msg").innerHTML = `<div class="notice warn">No questions match. Add or import some first.</div>`;
      return;
    }
    startQuiz(pool);
  };
  const redo = document.getElementById("btn-qz-mistakes");
  if (redo) redo.onclick = () => startQuiz(shuffle(DATA.questions.filter(q => q.inMistakeLog)));

  // ----- add one question -----
  document.getElementById("btn-aq-save").onclick = () => {
    const v = id => document.getElementById(id).value.trim();
    const topic = v("aq-topic");
    if (!v("aq-question") || !v("aq-A") || !v("aq-B") || !v("aq-C")) {
      alert("Question and all 3 choices are required.");
      return;
    }
    DATA.questions.push(newQuestionObject({
      topic, chapter: chapterIdFrom(topic, v("aq-chapter")), los: v("aq-los"),
      question: v("aq-question"), A: v("aq-A"), B: v("aq-B"), C: v("aq-C"),
      answer: v("aq-answer"), explanation: v("aq-expl"), source: "self"
    }));
    saveData();
    renderQuestions();
    alert("Question saved ✅");
  };

  // ----- CSV import -----
  document.getElementById("btn-q-template").onclick = downloadQuestionTemplate;
  document.getElementById("q-csv").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = importQuestionsCSV(await file.text());
    document.getElementById("qcsv-msg").innerHTML = `<div class="notice ${res.errors.length ? "warn" : "ok"}">
      ✅ Added ${res.added} · skipped ${res.skipped} duplicate(s)
      ${res.errors.length ? "<br>⚠️ " + res.errors.slice(0, 10).map(esc).join("<br>⚠️ ") : ""}
    </div>`;
    e.target.value = "";
  };

  // ----- list -----
  const filter = document.getElementById("q-filter");
  const drawList = () => {
    const list = DATA.questions.filter(q => !filter.value || q.topic === filter.value);
    document.getElementById("q-list").innerHTML = list.length ? list.map(q => {
      const right = q.attempts.filter(a => a.correct).length;
      return `
      <div class="row">
        <div class="row-main">
          <div>${esc(q.question)}</div>
          <div class="muted">${q.topic}${q.chapter ? " · ch " + parseInt(q.chapter.split("-")[1], 10) : ""} · ans ${q.answer} · ${right}/${q.attempts.length} right${q.inMistakeLog ? " · ❌ in log" : ""}</div>
        </div>
        <button class="icon-btn" data-delq="${q.id}" title="Delete">🗑</button>
      </div>`;
    }).join("") : `<p class="muted">No questions.</p>`;
    document.querySelectorAll("[data-delq]").forEach(b => b.onclick = () => {
      if (!confirm("Delete this question?")) return;
      DATA.questions = DATA.questions.filter(q => q.id !== b.dataset.delq);
      saveData();
      drawList();
    });
  };
  filter.onchange = drawList;
  drawList();
}

// ================= QUIZ SESSION =================
let quiz = null;

function startQuiz(list) {
  quiz = { list, i: 0, picked: null, results: [] };
  drawQuiz();
}

function drawQuiz() {
  if (!quiz) return renderQuestions();
  if (quiz.i >= quiz.list.length) return drawQuizResult();

  const q = quiz.list[quiz.i];
  const t = topicById(q.topic);
  const answered = quiz.picked !== null;

  const choiceBtns = LETTERS.map((L, idx) => {
    let cls = "choice";
    if (answered) {
      if (L === q.answer) cls += " right";
      else if (L === quiz.picked) cls += " wrong";
      else cls += " dim";
    }
    return `<button class="${cls}" data-pick="${L}" ${answered ? "disabled" : ""}>
      <span class="letter">${L}</span><span>${esc(q.choices[L])}</span></button>`;
  }).join("");

  view.innerHTML = `
    <div class="muted" style="display:flex;justify-content:space-between">
      <span>Question ${quiz.i + 1}/${quiz.list.length}</span>
      <a href="#questions" id="btn-qz-quit">✕ Stop</a>
    </div>
    <div class="bar"><div style="width:${quiz.i / quiz.list.length * 100}%"></div></div>
    <section class="card" style="margin-top:12px">
      <div class="muted">${t ? t.name : q.topic}${q.los ? " · " + esc(q.los) : ""}${q.inMistakeLog && !answered ? " · ❌ from mistake log" : ""}</div>
      <div class="q-text">${esc(q.question)}</div>
      ${choiceBtns}
      ${answered ? `
        <div class="notice ${quiz.picked === q.answer ? "ok" : "err"}">
          ${quiz.picked === q.answer ? "✅ Correct!" : `❌ Wrong — correct answer is <strong>${q.answer}</strong>`}
          ${q.explanation ? `<div style="margin-top:6px;white-space:pre-wrap">${esc(q.explanation)}</div>` : ""}
        </div>
        <button class="btn" id="btn-qz-next" style="width:100%">${quiz.i + 1 < quiz.list.length ? "Next →" : "See result"}</button>
      ` : `<div class="muted">Laptop: press 1 / 2 / 3 or A / B / C</div>`}
    </section>`;

  document.getElementById("btn-qz-quit").onclick = () => { quiz = null; renderQuestions(); };
  view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => pick(b.dataset.pick));
  const next = document.getElementById("btn-qz-next");
  if (next) next.onclick = nextQuestion;
}

function pick(letter) {
  if (!quiz || quiz.picked !== null) return;
  const q = quiz.list[quiz.i];
  quiz.picked = letter;
  quiz.results.push({ q, picked: letter, correct: recordAnswer(q, letter) });
  drawQuiz();
}

function nextQuestion() {
  quiz.i++;
  quiz.picked = null;
  drawQuiz();
  window.scrollTo(0, 0);
}

function drawQuizResult() {
  const right = quiz.results.filter(r => r.correct).length;
  const total = quiz.results.length;
  const wrongList = quiz.results.filter(r => !r.correct).map(r => `
    <div class="row"><div class="row-main">
      <div>${esc(r.q.question)}</div>
      <div class="muted">You: ${r.picked} · Correct: ${r.q.answer}</div>
    </div></div>`).join("");
  view.innerHTML = `
    <section class="card" style="text-align:center">
      <h2>Result</h2>
      <div class="big-number">${right}/${total}</div>
      <div class="muted">${total ? Math.round(right / total * 100) : 0}% correct · CFA pass mark is unknown, aim for 70%+</div>
    </section>
    ${wrongList ? `<section class="card"><h2>Missed (added to mistake log)</h2>${wrongList}</section>` : ""}
    <button class="btn" id="btn-qz-back" style="width:100%">Back to questions</button>`;
  quiz = null;
  document.getElementById("btn-qz-back").onclick = renderQuestions;
}

// Laptop shortcuts: 1/2/3 or A/B/C to answer, Enter = next
document.addEventListener("keydown", e => {
  if (!quiz || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  const map = { "1": "A", "2": "B", "3": "C", a: "A", b: "B", c: "C" };
  if (quiz.picked === null && map[e.key.toLowerCase()]) pick(map[e.key.toLowerCase()]);
  else if (quiz.picked !== null && e.key === "Enter") nextQuestion();
});

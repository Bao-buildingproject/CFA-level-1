// ============================================================
// mock.js — timed mock exams built from YOUR question bank
// Real CFA Level I format: 180 questions in 2 sessions of 2h15m.
// No feedback until you submit. Unanswered = wrong (like the real exam).
// ============================================================

const MOCK_TYPES = {
  mini:    { name: "Mini mock",    desc: "Quick timed check",                 sessions: [{ count: 30, minutes: 45 }] },
  session: { name: "Session mock", desc: "One real exam session",             sessions: [{ count: 90, minutes: 135 }] },
  full:    { name: "Full mock",    desc: "Full exam · 2 sessions with break", sessions: [{ count: 90, minutes: 135 }, { count: 90, minutes: 135 }] },
  hard:    { name: "Hard mock",    desc: "Exam-style and Hard questions only", sessions: [{ count: 30, minutes: 45 }], levels: ["exam", "challenge"] }
};
const SECONDS_PER_QUESTION = 90; // 135 min / 90 questions

// Topic weights = midpoint of the published ranges (used to mix questions)
function topicWeight(t) {
  const [lo, hi] = t.weight.replace("%", "").split("–").map(Number);
  return (lo + hi) / 2;
}

function formatTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
function formatMinutes(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m} min`;
}

// ---------- Pick questions, weighted by exam topic weights ----------
// Prefers questions you've tried least; never repeats a question in one mock.
function pickMockQuestions(count, topicIds, moduleIds, levels) {
  const topics = TOPICS.filter(t => !topicIds || topicIds.includes(t.id));
  const pools = {};
  topics.forEach(t => {
    pools[t.id] = shuffle(DATA.questions.filter(q => q.topic === t.id && (!moduleIds || moduleIds.includes(q.chapter)) && (!levels || levels.includes(q.level))))
      .sort((a, b) => (levels ? (b.level === "challenge") - (a.level === "challenge") : 0) || a.attempts.length - b.attempts.length);
  });
  const available = topics.reduce((s, t) => s + pools[t.id].length, 0);
  count = Math.min(count, available);

  // Largest-remainder allocation, then hand leftovers to topics that still have questions
  const totalW = topics.reduce((s, t) => s + topicWeight(t), 0);
  const alloc = {};
  let used = 0;
  const rema = topics.map(t => {
    const exact = (count * topicWeight(t)) / totalW;
    alloc[t.id] = Math.min(Math.floor(exact), pools[t.id].length);
    used += alloc[t.id];
    return { id: t.id, r: exact - Math.floor(exact) };
  }).sort((a, b) => b.r - a.r);
  // Round-robin over topics (largest remainder first) so leftovers spread out
  const order = rema.map(x => x.id);
  let idx = 0;
  while (used < count) {
    let tried = 0;
    while (tried < order.length && alloc[order[idx % order.length]] >= pools[order[idx % order.length]].length) { idx++; tried++; }
    if (tried >= order.length) break;
    alloc[order[idx % order.length]]++;
    used++; idx++;
  }
  return shuffle(topics.flatMap(t => pools[t.id].slice(0, alloc[t.id]))).map(q => q.id);
}

function questionById(id) { return DATA.questions.find(q => q.id === id); }

// ---------- Topic mocks (one subject at a time) ----------
const TOPIC_MOCK_SIZES = [15, 30, 0];   // 0 = every question in the topic

// Spread questions evenly across the topic's modules (round robin),
// preferring the questions you have tried least.
function pickTopicQuestions(topicId, count) {
  const pools = modulesOf(topicId).map(m =>
    shuffle(DATA.questions.filter(q => q.chapter === m.id)).sort((a, b) => a.attempts.length - b.attempts.length));
  const own = shuffle(DATA.questions.filter(q => q.topic === topicId && !MODULES.some(m => m.id === q.chapter)));
  if (own.length) pools.push(own);
  const total = pools.reduce((s, p) => s + p.length, 0);
  count = count ? Math.min(count, total) : total;
  const picked = [];
  let round = 0;
  while (picked.length < count) {
    let added = false;
    for (const p of pools) {
      if (picked.length >= count) break;
      if (p[round]) { picked.push(p[round].id); added = true; }
    }
    if (!added) break;
    round++;
  }
  return shuffle(picked);
}

function startTopicMock(topicId, size) {
  const t = topicById(topicId);
  const ids = pickTopicQuestions(topicId, size);
  if (!ids.length) { toast("No questions in this topic yet", "error"); return; }
  const minutes = Math.ceil((ids.length * SECONDS_PER_QUESTION) / 60);
  startMock("topic", { name: `${t.name} mock`, topic: topicId, ids, sessions: [{ count: ids.length, minutes }] });
}

function topicMockHistory(topicId) {
  const list = DATA.mocks.filter(r => r.topic === topicId && r.type === "topic");
  const scores = list.map(r => pct(r.correct, r.total));
  return { count: list.length, last: scores.length ? scores.at(-1) : null, best: scores.length ? Math.max(...scores) : null };
}

async function confirmTopicMock(topicId, size) {
  const t = topicById(topicId);
  const n = pickTopicQuestions(topicId, size).length;
  const min = Math.ceil((n * SECONDS_PER_QUESTION) / 60);
  if (await confirmDialog({ title: `Start ${t.name} mock?`, message: `${n} questions across all ${modulesOf(topicId).length} modules · ${formatMinutes(min)}. The timer starts right away; answers are shown after you submit.`, confirmText: "Start now" }))
    startTopicMock(topicId, size);
}

let topicMockSize = 30;
function topicMocksHtml() {
  return `
    <div class="card section">
      <div class="card-head" style="flex-wrap:wrap"><div><h2>Topic mocks</h2><p class="text-2 small">One subject at a time · questions spread over every module · ${SECONDS_PER_QUESTION}s per question</p></div>
        <div class="segmented" id="tm-size">${TOPIC_MOCK_SIZES.map(n => `<button data-size="${n}" class="${topicMockSize === n ? "active" : ""}">${n ? n + " Q" : "All"}</button>`).join("")}</div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Topic</th><th class="num hide-mobile">Weight</th><th class="num">Questions</th><th class="num hide-mobile">Time</th><th class="num">Last</th><th class="num">Best</th><th></th></tr></thead>
        <tbody>${TOPICS.map(t => {
          const avail = DATA.questions.filter(q => q.topic === t.id).length;
          const n = topicMockSize ? Math.min(topicMockSize, avail) : avail;
          const h = topicMockHistory(t.id);
          const badge = v => v === null ? '<span class="text-3">–</span>' : `<span class="badge ${v >= 70 ? "badge-success" : v >= 60 ? "badge-warning" : "badge-danger"}">${v}%</span>`;
          return `<tr>
            <td><strong>${t.name}</strong><div class="text-3 small">${modulesOf(t.id).length} modules</div></td>
            <td class="num hide-mobile">${t.weight}</td>
            <td class="num">${n}</td>
            <td class="num hide-mobile">${formatMinutes(Math.ceil((n * SECONDS_PER_QUESTION) / 60))}</td>
            <td class="num">${badge(h.last)}</td><td class="num">${badge(h.best)}</td>
            <td class="num"><button class="btn btn-primary btn-sm" data-topic-mock="${t.id}" ${n && !DATA.activeMock ? "" : "disabled"}>${icon("play", 14)} Start</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>`;
}

function bindTopicMocks(rerender) {
  view.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { topicMockSize = +b.dataset.size; rerender(); });
  view.querySelectorAll("[data-topic-mock]").forEach(b => b.onclick = () => confirmTopicMock(b.dataset.topicMock, topicMockSize));
}

// ---------- Start / persist ----------
function startMock(typeKey, custom) {
  const def = custom || MOCK_TYPES[typeKey];
  const need = def.sessions.reduce((s, x) => s + x.count, 0);
  const ids = custom && custom.ids ? custom.ids : pickMockQuestions(need, custom && custom.topics, custom && custom.modules, def.levels);
  if (ids.length < need) { toast(`Not enough questions — need ${need}, you have ${ids.length}`, "error"); return; }
  let offset = 0;
  DATA.activeMock = {
    id: makeId("mock"), type: typeKey, name: def.name, topic: (custom && custom.topic) || null, startedDate: todayStr(),
    sessionIdx: 0, phase: "running", i: 0,
    sessions: def.sessions.map(s => {
      const qids = ids.slice(offset, offset + s.count);
      offset += s.count;
      return { qids, minutes: s.minutes, answers: {}, flags: [], startedAt: null, endsAt: null, usedSec: 0 };
    })
  };
  beginSession();
  location.hash = "#/mock/run";
}

function beginSession() {
  const m = DATA.activeMock, s = m.sessions[m.sessionIdx];
  s.startedAt = Date.now();
  s.endsAt = s.startedAt + s.minutes * 60000;
  m.phase = "running";
  m.i = 0;
  saveData();
}

// ---------- Timer ----------
let mockTimer = null;
function stopMockTimer() { if (mockTimer) { clearInterval(mockTimer); mockTimer = null; } }

function tickMock() {
  const m = DATA.activeMock;
  if (!m || m.phase !== "running") return stopMockTimer();
  const s = m.sessions[m.sessionIdx];
  const left = (s.endsAt - Date.now()) / 1000;
  const el = document.getElementById("mock-timer");
  if (el) {
    el.querySelector("span").textContent = formatTime(left);
    el.classList.toggle("warn", left <= 600 && left > 120);
    el.classList.toggle("danger", left <= 120);
  }
  if (left <= 0) {
    stopMockTimer();
    toast("Time is up — session submitted", "error");
    submitSession();
  }
}

// ---------- Submit ----------
function submitSession() {
  const m = DATA.activeMock;
  if (!m) return;
  const s = m.sessions[m.sessionIdx];
  s.usedSec = Math.min((Date.now() - s.startedAt) / 1000, s.minutes * 60);
  stopMockTimer();
  if (m.sessionIdx < m.sessions.length - 1) {
    m.phase = "break";
    saveData();
    renderMockRun();
  } else finishMock();
}

function finishMock() {
  const m = DATA.activeMock;
  const items = [];
  const byTopic = {}, byModule = {};
  let correct = 0, timeUsed = 0, timeAllowed = 0;
  m.sessions.forEach((s, si) => {
    timeUsed += s.usedSec;
    timeAllowed += s.minutes * 60;
    s.qids.forEach(id => {
      const q = questionById(id);
      if (!q) return;
      const picked = s.answers[id] || null;
      const ok = recordAnswer(q, picked);
      if (ok) correct++;
      const bt = byTopic[q.topic] || (byTopic[q.topic] = { correct: 0, total: 0 });
      bt.total++; if (ok) bt.correct++;
      if (q.chapter) { const bm = byModule[q.chapter] || (byModule[q.chapter] = { correct: 0, total: 0 }); bm.total++; if (ok) bm.correct++; }
      items.push({ id, picked, session: si, flagged: s.flags.includes(id) });
    });
  });
  const result = {
    id: m.id, date: todayStr(), type: m.type, name: m.name, topic: m.topic || null, byModule,
    total: items.length, correct, answered: items.filter(x => x.picked).length,
    timeUsed: Math.round(timeUsed), timeAllowed, byTopic, items
  };
  DATA.mocks.push(result);
  DATA.activeMock = null;
  saveData();
  location.hash = `#/mock/result/${result.id}`;
}

// ================= MOCK HOME (#/mock) =================
function renderMock() {
  const total = DATA.questions.length;
  const active = DATA.activeMock;
  const history = DATA.mocks.slice().reverse();

  const typeCard = (key, def) => {
    const need = def.sessions.reduce((s, x) => s + x.count, 0);
    const minutes = def.sessions.reduce((s, x) => s + x.minutes, 0);
    const avail = def.levels ? DATA.questions.filter(q => def.levels.includes(q.level)).length : total;
    const ok = avail >= need;
    return `
      <div class="card mock-type">
        <div class="row-between"><h2>${def.name}</h2>${def.sessions.length > 1 ? `<span class="badge badge-exam">2 sessions</span>` : ""}</div>
        <p class="text-2 small">${def.desc}</p>
        <div class="row-gap" style="gap:20px">
          <div class="stat"><span class="stat-label">Questions</span><span class="stat-value">${need}</span></div>
          <div class="stat"><span class="stat-label">Time</span><span class="stat-value">${formatMinutes(minutes)}</span></div>
        </div>
        ${ok ? "" : `<div class="text-2 small">${progressBar(pct(avail, need), "warning")}<div style="margin-top:6px">You have ${avail} of ${need} questions needed.</div></div>`}
        <button class="btn ${ok ? "btn-primary" : "btn-secondary"} btn-block" data-start="${key}" ${ok && !active ? "" : "disabled"}>${icon("play", 18)} Start</button>
      </div>`;
  };

  view.innerHTML = `
    ${pageHeader("Mock exams", "Timed, exam-style tests from your question bank · results only after you submit")}

    ${active ? `<div class="callout warning">${icon("clock", 18)}<div style="flex:1"><strong>${esc(active.name)} in progress</strong> — session ${active.sessionIdx + 1} of ${active.sessions.length}.</div>
      <a class="btn btn-primary btn-sm" href="#/mock/run">Resume</a><button class="btn btn-ghost btn-sm" id="btn-abandon">Discard</button></div>` : ""}

    ${total === 0 ? `<div class="card section">${emptyState("clock", "Your question bank is empty", "Mock exams are built from your own questions. Add or import questions first — the more you add, the bigger the mock you can take.", `<a class="btn btn-primary" href="#/practice">${icon("plus", 18)} Add questions</a>`)}</div>` : ""}

    <div class="grid grid-4 section">
      ${Object.entries(MOCK_TYPES).map(([k, d]) => typeCard(k, d)).join("")}
    </div>

    ${topicMocksHtml()}

    <div class="card section">
      <div class="card-head"><div><h2>Custom mock</h2><p class="text-2 small">Pick topics and length · ${SECONDS_PER_QUESTION}s per question, the real exam pace</p></div></div>
      <div class="field"><span class="field-label">Topics</span>
        <div class="row-gap" id="cm-topics">${TOPICS.map(t => {
          const n = DATA.questions.filter(q => q.topic === t.id).length;
          return `<button class="btn btn-sm btn-secondary cm-topic" data-topic="${t.id}" aria-pressed="true" ${n ? "" : "disabled"} title="${t.name}">${t.id} <span class="text-3">${n}</span></button>`;
        }).join("")}</div></div>
      <div class="form-grid" style="margin-top:12px">
        <label class="field"><span class="field-label">Number of questions</span><input class="input" type="number" id="cm-count" min="1" value="20" inputmode="numeric"></label>
        <div class="field"><span class="field-label">Time allowed</span><div class="input" id="cm-time" style="display:flex;align-items:center;background:var(--surface-2)"></div></div>
      </div>
      <div class="form-actions" style="justify-content:space-between;align-items:center">
        <span class="text-2 small" id="cm-avail"></span>
        <button class="btn btn-primary" id="btn-cm-start" ${active ? "disabled" : ""}>${icon("play", 18)} Start custom mock</button>
      </div>
    </div>

    <div class="card section">
      <div class="card-head"><h2>History</h2>${history.length ? `<span class="text-3 small">${history.length} mock(s)</span>` : ""}</div>
      ${history.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Date</th><th>Mock</th><th class="num">Score</th><th class="num">%</th><th class="num hide-mobile">Time</th><th></th></tr></thead>
        <tbody>${history.map(r => {
          const p = pct(r.correct, r.total);
          return `<tr><td>${prettyDate(r.date)}</td><td>${esc(r.name)}</td><td class="num">${r.correct}/${r.total}</td>
            <td class="num"><span class="badge ${p >= 70 ? "badge-success" : p >= 60 ? "badge-warning" : "badge-danger"}">${p}%</span></td>
            <td class="num hide-mobile">${formatTime(r.timeUsed)}</td>
            <td class="num"><a href="#/mock/result/${r.id}" class="btn btn-ghost btn-sm">Review</a></td></tr>`;
        }).join("")}</tbody></table></div>`
        : `<p class="text-2 small">No mock exams yet. Your results and trends will appear here.</p>`}
    </div>

    <p class="text-3 small section">Practice benchmark: many candidates aim for 70%+ on mocks. CFA Institute does not publish the actual passing score.</p>`;

  bindTopicMocks(renderMock);
  view.querySelectorAll("[data-start]").forEach(b => b.onclick = async () => {
    const def = MOCK_TYPES[b.dataset.start];
    const n = def.sessions.reduce((s, x) => s + x.count, 0);
    if (await confirmDialog({ title: `Start ${def.name}?`, message: `${n} questions · ${formatMinutes(def.sessions.reduce((s, x) => s + x.minutes, 0))}. The timer starts right away and answers are only scored when you submit.`, confirmText: "Start now" })) startMock(b.dataset.start);
  });

  const abandon = document.getElementById("btn-abandon");
  if (abandon) abandon.onclick = async () => {
    if (!await confirmDialog({ title: "Discard this mock?", message: "Your answers in this mock will not be saved.", confirmText: "Discard", danger: true })) return;
    DATA.activeMock = null; saveData(); renderMock(); refreshShell(); toast("Mock discarded");
  };

  // custom mock
  const selected = new Set(TOPICS.filter(t => DATA.questions.some(q => q.topic === t.id)).map(t => t.id));
  const countEl = document.getElementById("cm-count");
  const updateCustom = () => {
    const avail = DATA.questions.filter(q => selected.has(q.topic)).length;
    const n = parseInt(countEl.value, 10) || 0;
    document.getElementById("cm-time").textContent = n > 0 ? formatMinutes(Math.ceil((n * SECONDS_PER_QUESTION) / 60)) : "–";
    document.getElementById("cm-avail").textContent = `${avail} question(s) available in the selected topics`;
    const valid = n > 0 && n <= avail;
    countEl.classList.toggle("invalid", n > avail);
    document.getElementById("btn-cm-start").disabled = !valid || !!DATA.activeMock;
  };
  view.querySelectorAll(".cm-topic").forEach(b => {
    const on = selected.has(b.dataset.topic);
    b.setAttribute("aria-pressed", on);
    b.className = `btn btn-sm cm-topic ${on ? "btn-primary" : "btn-secondary"}`;
    b.onclick = () => {
      selected.has(b.dataset.topic) ? selected.delete(b.dataset.topic) : selected.add(b.dataset.topic);
      const now = selected.has(b.dataset.topic);
      b.setAttribute("aria-pressed", now);
      b.className = `btn btn-sm cm-topic ${now ? "btn-primary" : "btn-secondary"}`;
      updateCustom();
    };
  });
  countEl.oninput = updateCustom;
  document.getElementById("btn-cm-start").onclick = () => {
    const n = parseInt(countEl.value, 10);
    startMock("custom", { name: `Custom mock (${n})`, topics: [...selected], sessions: [{ count: n, minutes: Math.ceil((n * SECONDS_PER_QUESTION) / 60) }] });
  };
  updateCustom();
}

// ================= EXAM SCREEN (#/mock/run) =================
function renderMockRun() {
  const m = DATA.activeMock;
  stopMockTimer();
  if (!m) { location.hash = "#/mock"; return; }
  const s = m.sessions[m.sessionIdx];

  // Time ran out while the page was closed → submit now
  if (m.phase === "running" && Date.now() >= s.endsAt) { submitSession(); return; }

  if (m.phase === "break") {
    const done = m.sessions[m.sessionIdx];
    view.innerHTML = `
      <div class="card" style="max-width:560px;margin:40px auto;text-align:center;padding:36px">
        <div class="empty-icon">${icon("check", 28)}</div>
        <h1>Session ${m.sessionIdx + 1} submitted</h1>
        <p class="text-2" style="margin-top:8px">${Object.keys(done.answers).length} of ${done.qids.length} answered · ${formatTime(done.usedSec)} used.
          Take an optional break, then start session ${m.sessionIdx + 2} when you're ready.</p>
        <button class="btn btn-primary btn-lg" id="btn-next-session" style="margin-top:24px">${icon("play", 18)} Start session ${m.sessionIdx + 2}</button>
      </div>`;
    document.getElementById("btn-next-session").onclick = () => {
      m.sessionIdx++;
      beginSession();
      renderMockRun();
    };
    return;
  }

  const q = questionById(s.qids[m.i]);
  const answered = Object.keys(s.answers).length;
  const flagged = s.flags.includes(s.qids[m.i]);

  view.innerHTML = `
    <div class="mock-top">
      <div>
        <div style="font-weight:600">${esc(m.name)}</div>
        <div class="text-3 small">${m.sessions.length > 1 ? `Session ${m.sessionIdx + 1} of ${m.sessions.length} · ` : ""}${answered}/${s.qids.length} answered</div>
      </div>
      <div class="row-gap">
        <div class="timer" id="mock-timer" role="timer" aria-label="Time remaining">${icon("clock", 18)}<span>${formatTime((s.endsAt - Date.now()) / 1000)}</span></div>
        <button class="btn btn-primary" id="btn-submit">Submit</button>
      </div>
    </div>

    <div class="mock-layout">
      <div>
        <div class="card">
          ${q ? `
            <div class="row-between" style="margin-bottom:12px">
              <span class="text-2 small" style="font-weight:600">Question ${m.i + 1} of ${s.qids.length}</span>
              <button class="btn btn-ghost btn-sm" id="btn-mflag" aria-pressed="${flagged}" style="${flagged ? "color:var(--warning)" : ""}">${icon("flag", 16)} ${flagged ? "Flagged" : "Flag for review"}</button>
            </div>
            <div class="q-text">${esc(q.question)}</div>
            ${exhibitHtml(q)}
            ${choicesHtml(q, s.answers[q.id] || null, false)}`
          : `<p class="text-2">This question was deleted from your bank. It will count as unanswered.</p>`}
          <div class="mock-nav">
            <button class="btn btn-secondary" id="btn-prev" ${m.i === 0 ? "disabled" : ""}>${icon("prev", 18)} Previous</button>
            <button class="btn btn-secondary" id="btn-next" ${m.i === s.qids.length - 1 ? "disabled" : ""}>Next ${icon("next", 18)}</button>
          </div>
        </div>
        <p class="text-3 small hide-mobile" style="margin-top:12px">Keyboard: <span class="kbd">1</span>–<span class="kbd">3</span> answer · <span class="kbd">←</span> <span class="kbd">→</span> move · <span class="kbd">F</span> flag</p>
      </div>

      <aside class="card mock-side" aria-label="Question navigator">
        <div class="row-between" style="margin-bottom:12px"><h3>Questions</h3><span class="text-3 small">${s.flags.length} flagged</span></div>
        <div class="palette">${s.qids.map((id, idx) => `
          <button class="pal-btn ${s.answers[id] ? "answered" : ""} ${s.flags.includes(id) ? "flagged" : ""} ${idx === m.i ? "current" : ""}" data-go="${idx}" aria-label="Question ${idx + 1}">${idx + 1}</button>`).join("")}</div>
        <div class="legend">
          <span><i style="background:var(--primary-soft);border-color:transparent"></i>Answered</span>
          <span><i></i>Not answered</span>
          <span><i style="background:var(--warning);border-color:transparent;border-radius:50%"></i>Flagged</span>
        </div>
      </aside>
    </div>`;

  const go = idx => { m.i = Math.max(0, Math.min(s.qids.length - 1, idx)); saveData(); renderMockRun(); };
  view.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { s.answers[q.id] = b.dataset.pick; saveData(); renderMockRun(); });
  view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
  document.getElementById("btn-prev").onclick = () => go(m.i - 1);
  document.getElementById("btn-next").onclick = () => go(m.i + 1);
  const flagBtn = document.getElementById("btn-mflag");
  if (flagBtn) flagBtn.onclick = () => toggleMockFlag();
  document.getElementById("btn-submit").onclick = async () => {
    const left = s.qids.length - Object.keys(s.answers).length;
    const last = m.sessionIdx === m.sessions.length - 1;
    const ok = await confirmDialog({
      title: last ? "Submit mock exam?" : `Submit session ${m.sessionIdx + 1}?`,
      message: `${left ? `<strong>${left} unanswered</strong> question(s) will be marked wrong. ` : "All questions answered. "}${s.flags.length ? `${s.flags.length} flagged. ` : ""}You can't change answers after submitting.`,
      confirmText: "Submit"
    });
    if (ok && DATA.activeMock) submitSession();
  };

  mockTimer = setInterval(tickMock, 1000);
}

function toggleMockFlag() {
  const m = DATA.activeMock, s = m.sessions[m.sessionIdx], id = s.qids[m.i];
  s.flags = s.flags.includes(id) ? s.flags.filter(x => x !== id) : [...s.flags, id];
  saveData();
  renderMockRun();
}

document.addEventListener("keydown", e => {
  const m = DATA.activeMock;
  if (!m || m.phase !== "running" || !location.hash.startsWith("#/mock/run")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || document.querySelector(".modal-overlay.show")) return;
  const s = m.sessions[m.sessionIdx];
  const map = { "1": "A", "2": "B", "3": "C", a: "A", b: "B", c: "C" };
  const k = e.key.toLowerCase();
  if (map[k] && questionById(s.qids[m.i])) { s.answers[s.qids[m.i]] = map[k]; saveData(); renderMockRun(); }
  else if (e.key === "ArrowRight" && m.i < s.qids.length - 1) { m.i++; saveData(); renderMockRun(); }
  else if (e.key === "ArrowLeft" && m.i > 0) { m.i--; saveData(); renderMockRun(); }
  else if (k === "f") toggleMockFlag();
});

// ================= RESULT (#/mock/result/:id) =================
let reviewFilter = "wrong";

function renderMockResult(id) {
  const r = DATA.mocks.find(x => x.id === id);
  if (!r) { location.hash = "#/mock"; return; }
  const p = pct(r.correct, r.total);
  const perModule = r.topic && r.byModule;
  const topicRows = (perModule
    ? Object.entries(r.byModule).map(([mid, v]) => { const mm = moduleById(mid); return { t: { id: mm ? mm.topic : r.topic, name: mm ? `${mm.n}. ${mm.title}` : mid }, mid, ...v, p: pct(v.correct, v.total) }; })
    : Object.entries(r.byTopic).map(([tid, v]) => ({ t: topicById(tid), ...v, p: pct(v.correct, v.total) })))
    .sort((a, b) => a.p - b.p);
  const weak = topicRows.filter(x => x.p < 70).slice(0, 3);
  const tone = p >= 70 ? "success" : p >= 60 ? "warning" : "danger";

  const filters = {
    wrong: r.items.filter(it => { const q = questionById(it.id); return q && it.picked !== q.answer; }),
    flagged: r.items.filter(it => it.flagged),
    all: r.items
  };
  const list = filters[reviewFilter] || filters.wrong;

  view.innerHTML = `
    <a href="#/mock" class="back-link">${icon("back", 16)} Mock exams</a>
    ${pageHeader(esc(r.name), `${prettyDate(r.date)} · ${r.total} questions`)}

    <div class="grid grid-3">
      <div class="card" style="display:flex;align-items:center;gap:20px">
        ${progressRing(p, 104, 9, "score")}
        <div><div class="stat-label">Correct</div><div class="score-big" style="font-size:2.2rem">${r.correct}<span class="text-3" style="font-size:1rem"> / ${r.total}</span></div>
          <span class="badge badge-${tone}">${p >= 70 ? "Above 70% benchmark" : p >= 60 ? "Close — keep going" : "Needs work"}</span></div>
      </div>
      <div class="card stat"><span class="stat-label">Time used</span><span class="stat-value">${formatTime(r.timeUsed)}</span>
        <span class="stat-hint">of ${formatTime(r.timeAllowed)} · ${r.answered ? Math.round(r.timeUsed / r.total) : 0}s per question (target ${SECONDS_PER_QUESTION}s)</span></div>
      <div class="card stat"><span class="stat-label">Answered</span><span class="stat-value">${r.answered}/${r.total}</span>
        <span class="stat-hint">${r.total - r.answered} left blank · counted wrong</span></div>
    </div>

    <div class="grid grid-2 section">
      <div class="card">
        <div class="card-head"><h2>Score by ${perModule ? "module" : "topic"}</h2><span class="text-3 small">weakest first</span></div>
        ${topicRows.map(x => `
          <div class="bar-row">
            <span>${x.t ? x.t.name : "?"}</span>
            ${progressBar(x.p, x.p >= 70 ? "success" : x.p >= 60 ? "warning" : "danger")}
            <span class="num">${x.correct}/${x.total} · ${x.p}%</span>
          </div>`).join("")}
      </div>
      <div class="card">
        <div class="card-head"><h2>What to do next</h2></div>
        ${weak.length ? `<div class="list">${weak.map(x => `
          <div class="list-item"><div class="list-main"><div class="list-title">${x.t.name}</div>
            <div class="list-meta">${x.p}% — review ${x.mid ? "this module" : "the modules"}, then redo your mistakes</div></div>
            <a class="btn btn-sm btn-secondary" href="${x.mid ? `#/module/${x.mid}` : `#/topic/${x.t.id}`}">Review</a></div>`).join("")}</div>`
          : `<div class="callout success">${icon("check", 18)}<div>Every topic is at 70% or above. Keep the streak going with another mock in a few days.</div></div>`}
        <p class="text-2 small" style="margin-top:12px">Every missed or blank question is now in your <a href="#/practice">mistake log</a>.</p>
      </div>
    </div>

    <div class="card section">
      <div class="card-head" style="flex-wrap:wrap">
        <h2>Review answers</h2>
        <div class="segmented" id="rv-filter">
          ${[["wrong", `Wrong (${filters.wrong.length})`], ["flagged", `Flagged (${filters.flagged.length})`], ["all", `All (${r.total})`]]
            .map(([k, v]) => `<button data-f="${k}" class="${reviewFilter === k ? "active" : ""}">${v}</button>`).join("")}
        </div>
      </div>
      ${list.length ? list.map(it => {
        const q = questionById(it.id);
        const n = r.items.indexOf(it) + 1;
        if (!q) return `<details class="disclosure"><summary>${icon("chevron", 16)} Q${n} · deleted from bank</summary></details>`;
        const ok = it.picked === q.answer;
        return `<details class="disclosure">
          <summary>${icon("chevron", 16)} <span style="color:var(--${ok ? "success" : "danger"})">Q${n}</span>
            <span class="text-2" style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(q.question)}</span></summary>
          <div>${questionMetaHtml(q)}<div class="q-text">${esc(q.question)}</div>${exhibitHtml(q)}${choicesHtml(q, it.picked, true)}${explanationHtml(q, it.picked)}</div>
        </details>`;
      }).join("") : `<p class="text-2 small">Nothing here.</p>`}
    </div>`;

  view.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { reviewFilter = b.dataset.f; renderMockResult(id); });
}

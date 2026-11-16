// ============================================================
// flashcards.js — Leitner boxes, review session, add & import
// Box 0 = new card. Boxes 1..5 = learning.
// Right → next box. Wrong → back to box 1.
// ============================================================

const BOX_INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }; // days until next review

// ---------- Queues ----------
function dueCards() {
  const today = todayStr();
  return DATA.flashcards
    .filter(c => c.box > 0 && c.due <= today)
    .sort((a, b) => a.box - b.box || a.due.localeCompare(b.due)); // weakest first
}
function newCards() { return DATA.flashcards.filter(c => c.box === 0); }
function todayQueue() {
  const s = DATA.settings;
  let due = dueCards(), fresh = newCards();
  if (s.dailyReviewLimit) due = due.slice(0, s.dailyReviewLimit);
  if (s.dailyNewLimit) fresh = fresh.slice(0, s.dailyNewLimit);
  return [...due, ...fresh];
}

// ---------- Grade one card ----------
function gradeCard(card, right) {
  const today = todayStr();
  card.box = right ? Math.min(Math.max(card.box, 1) + 1, 5) : 1;
  card.due = addDays(today, BOX_INTERVAL[card.box]);
  card.lastReviewed = today;
  card.stats = card.stats || { right: 0, wrong: 0 };
  right ? card.stats.right++ : card.stats.wrong++;
  const log = DATA.dailyLog[today] || (DATA.dailyLog[today] = {});
  log.cardsReviewed = (log.cardsReviewed || 0) + 1;
  log.cardsRight = (log.cardsRight || 0) + (right ? 1 : 0);
  saveData();
}

// ---------- Create ----------
function chapterIdFrom(topic, chapterNo) {
  const n = parseInt(chapterNo, 10);
  return n > 0 ? `${topic}-${String(n).padStart(2, "0")}` : null;
}
function chapterNumber(chapterId) {
  return chapterId ? parseInt(chapterId.split("-")[1], 10) : null;
}
function newCardObject({ topic, chapter, front, back, note, tags }) {
  return {
    id: makeId("c"), topic, chapter, front, back,
    note: note || "", tags: tags || [],
    box: 0, due: null, lastReviewed: null,
    stats: { right: 0, wrong: 0 }, createdAt: todayStr()
  };
}

// ---------- CSV reader (quoted fields, commas and line breaks inside quotes) ----------
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

function importCardsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { added: 0, skipped: 0, errors: ["File is empty."] };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = name => header.indexOf(name);
  for (const need of ["topic", "front", "back"]) {
    if (col(need) < 0) return { added: 0, skipped: 0, errors: [`Missing column "${need}". First row must be: topic,chapter,front,back,note,tags`] };
  }
  const existing = new Set(DATA.flashcards.map(c => c.topic + "|" + c.front.trim().toLowerCase()));
  const get = (r, name) => (col(name) >= 0 ? (r[col(name)] || "").trim() : "");
  let added = 0, skipped = 0;
  const errors = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const topic = get(r, "topic").toUpperCase();
    const front = get(r, "front"), back = get(r, "back");
    if (!topicById(topic)) { errors.push(`Row ${line}: unknown topic "${topic}"`); return; }
    if (!front || !back) { errors.push(`Row ${line}: front or back is empty`); return; }
    const key = topic + "|" + front.toLowerCase();
    if (existing.has(key)) { skipped++; return; }
    existing.add(key);
    DATA.flashcards.push(newCardObject({
      topic, front, back,
      chapter: chapterIdFrom(topic, get(r, "chapter")),
      note: get(r, "note"),
      tags: get(r, "tags").split(";").map(s => s.trim()).filter(Boolean)
    }));
    added++;
  });
  saveData();
  return { added, skipped, errors };
}

function importResultHtml(res) {
  const tone = res.errors.length ? "warning" : "success";
  return `<div class="callout ${tone}" style="margin-top:12px">${icon(res.errors.length ? "alert" : "check", 18)}<div>
    <strong>Added ${res.added}</strong> · skipped ${res.skipped} duplicate(s)
    ${res.errors.length ? `<div class="small" style="margin-top:6px">${res.errors.slice(0, 10).map(esc).join("<br>")}${res.errors.length > 10 ? `<br>…and ${res.errors.length - 10} more` : ""}</div>` : ""}
  </div></div>`;
}

// ================= FLASHCARDS PAGE (#/cards) =================
let cardsFilter = "";

function renderFlashcards() {
  const due = dueCards().length, fresh = newCards().length, queue = todayQueue().length;
  const total = DATA.flashcards.length;
  const boxCounts = [0, 1, 2, 3, 4, 5].map(b => DATA.flashcards.filter(c => c.box === b).length);
  const maxBox = Math.max(...boxCounts, 1);
  const log = DATA.dailyLog[todayStr()] || {};

  view.innerHTML = `
    ${pageHeader("Flashcards", "Leitner spaced repetition · weakest cards first")}

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h2>Today's review</h2><span class="badge">${log.cardsReviewed || 0} done today</span></div>
        <div class="grid grid-2" style="gap:12px">
          <div class="stat"><span class="stat-label">Due</span><span class="stat-value">${due}</span></div>
          <div class="stat"><span class="stat-label">New</span><span class="stat-value">${fresh}</span></div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" id="btn-start" style="margin-top:20px" ${queue ? "" : "disabled"}>
          ${queue ? `${icon("play", 18)} Start review · ${queue} cards` : "All caught up for today"}
        </button>
      </div>

      <div class="card">
        <div class="card-head"><h2>Leitner boxes</h2><span class="text-3 small">${total} cards</span></div>
        <div class="boxes">
          ${boxCounts.map((n, b) => `
            <div class="box-col" title="${b === 0 ? "New cards" : `Box ${b}: review every ${BOX_INTERVAL[b]} day(s)`}">
              <div class="box-bar"><div style="height:${n ? Math.max(6, (n / maxBox) * 100) : 0}%"></div></div>
              <strong>${n}</strong>
              <div class="text-3 small">${b === 0 ? "New" : `${BOX_INTERVAL[b]}d`}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>

    <div class="card section">
      <div class="tabs" role="tablist">
        <button class="tab active" data-pane="add">Add card</button>
        <button class="tab" data-pane="import">Import CSV</button>
        <button class="tab" data-pane="list">All cards (${total})</button>
      </div>

      <div data-panel="add">
        <div class="form-grid">
          <label class="field"><span class="field-label">Topic</span><select class="select" id="fc-topic">${topicOptions()}</select></label>
          <label class="field"><span class="field-label">Chapter no. (optional)</span><input class="input" type="number" id="fc-chapter" min="1" inputmode="numeric"></label>
          <label class="field full"><span class="field-label">Front — question or term</span><textarea class="textarea" id="fc-front" rows="2" placeholder="What does EAR measure?"></textarea></label>
          <label class="field full"><span class="field-label">Back — answer in your own words</span><textarea class="textarea" id="fc-back" rows="3"></textarea></label>
          <label class="field full"><span class="field-label">Note (optional, Vietnamese OK)</span><input class="input" id="fc-note"></label>
        </div>
        <div class="form-actions"><button class="btn btn-primary" id="btn-add-card">${icon("plus", 18)} Save card</button></div>
      </div>

      <div data-panel="import" hidden>
        <p class="text-2 small">Columns: <code>topic,chapter,front,back,note,tags</code> · topic codes: ${TOPICS.map(t => `<code>${t.id}</code>`).join(" ")} · duplicates are skipped.</p>
        <div class="row-gap" style="margin-top:16px">
          <button class="btn btn-secondary" id="btn-template">${icon("download", 18)} Template</button>
          <label class="btn btn-primary">${icon("upload", 18)} Choose CSV file<input type="file" id="fc-csv" accept=".csv,text/csv" hidden></label>
        </div>
        <div id="csv-msg"></div>
      </div>

      <div data-panel="list" hidden>
        <select class="select" id="fc-filter" style="max-width:320px">${topicOptions(cardsFilter, true)}</select>
        <div id="card-list" class="list" style="margin-top:8px"></div>
      </div>
    </div>`;

  // tabs
  view.querySelectorAll("[data-pane]").forEach(tab => tab.onclick = () => {
    view.querySelectorAll("[data-pane]").forEach(t => t.classList.toggle("active", t === tab));
    view.querySelectorAll("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== tab.dataset.pane);
  });

  document.getElementById("btn-start").onclick = () => startReview(todayQueue());

  document.getElementById("btn-add-card").onclick = () => {
    const frontEl = document.getElementById("fc-front"), backEl = document.getElementById("fc-back");
    const front = frontEl.value.trim(), back = backEl.value.trim();
    frontEl.classList.toggle("invalid", !front);
    backEl.classList.toggle("invalid", !back);
    if (!front || !back) { toast("Front and back are required", "error"); return; }
    const topic = document.getElementById("fc-topic").value;
    DATA.flashcards.push(newCardObject({
      topic, front, back,
      chapter: chapterIdFrom(topic, document.getElementById("fc-chapter").value),
      note: document.getElementById("fc-note").value.trim()
    }));
    saveData();
    frontEl.value = ""; backEl.value = ""; document.getElementById("fc-note").value = "";
    frontEl.focus();
    toast("Card saved");
    refreshShell();
  };

  document.getElementById("btn-template").onclick = () => downloadFile("flashcards-template.csv",
    "﻿topic,chapter,front,back,note,tags\nQM,1,\"Define \"\"compounding\"\"\",Earning interest on previously earned interest.,lãi kép,vocab\n",
    "text/csv;charset=utf-8");

  document.getElementById("fc-csv").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const res = importCardsCSV(await file.text());
    document.getElementById("csv-msg").innerHTML = importResultHtml(res);
    e.target.value = "";
    if (res.added) { toast(`${res.added} card(s) imported`); refreshShell(); }
  };

  const filter = document.getElementById("fc-filter");
  const drawList = () => {
    cardsFilter = filter.value;
    const list = DATA.flashcards.filter(c => !cardsFilter || c.topic === cardsFilter);
    document.getElementById("card-list").innerHTML = list.length ? list.map(c => `
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${esc(c.front)}</div>
          <div class="list-meta">${c.topic}${c.chapter ? ` · ch ${chapterNumber(c.chapter)}` : ""} · ${c.box === 0 ? "new" : `box ${c.box} · due ${prettyDate(c.due)}`}</div>
        </div>
        <button class="icon-btn danger" data-delcard="${c.id}" aria-label="Delete card">${icon("trash", 18)}</button>
      </div>`).join("") : emptyState("cards", "No cards yet", "Add a card or import a CSV from Google Sheets.");
    document.querySelectorAll("[data-delcard]").forEach(b => b.onclick = async () => {
      if (!await confirmDialog({ title: "Delete card?", message: "Its review history will be lost.", confirmText: "Delete", danger: true })) return;
      DATA.flashcards = DATA.flashcards.filter(c => c.id !== b.dataset.delcard);
      saveData(); drawList(); toast("Card deleted"); refreshShell();
    });
  };
  filter.onchange = drawList;
  drawList();
}

// ================= REVIEW SESSION =================
// Wrong cards return at the end for extra practice; only the FIRST
// answer of the session moves the card between boxes.
let session = null;

function startReview(cards) {
  session = { queue: cards.slice(), graded: new Set(), right: 0, total: cards.length, showBack: false };
  drawReview();
}

function drawReview() {
  if (!session) return renderFlashcards();
  const card = session.queue[0];
  if (!card) {
    const r = session.right, t = session.total;
    session = null;
    view.innerHTML = `
      <div class="card" style="max-width:520px;margin:40px auto;text-align:center">
        ${progressRing(pct(r, t), 120, 10, "first try")}
        <h1 style="margin-top:20px">Session complete</h1>
        <p class="text-2" style="margin-top:6px">${r} of ${t} cards right on the first try.</p>
        <button class="btn btn-primary btn-lg" id="btn-done" style="margin-top:24px">Back to flashcards</button>
      </div>`;
    document.getElementById("btn-done").onclick = renderFlashcards;
    refreshShell();
    return;
  }
  const t = topicById(card.topic);
  const done = session.graded.size;
  view.innerHTML = `
    <div style="max-width:680px;margin:0 auto">
      <div class="session-bar">
        <button class="icon-btn" id="btn-quit" aria-label="Stop review">${icon("x", 20)}</button>
        ${progressBar(pct(done, session.total))}
        <span class="text-2 small mono">${done}/${session.total}</span>
      </div>
      <div class="card flashcard" id="fc-card" role="button" tabindex="0" aria-label="Flashcard, press Space to reveal">
        <div class="fc-topic">${t ? t.name : card.topic} · ${card.box === 0 ? "New" : "Box " + card.box}</div>
        <div class="fc-front">${esc(card.front)}</div>
        ${session.showBack ? `
          <div class="fc-divider"></div>
          <div class="fc-back">${esc(card.back)}</div>
          ${card.note ? `<div class="fc-note">${esc(card.note)}</div>` : ""}
        ` : `<div class="fc-hint">Tap the card or press <span class="kbd">Space</span> to reveal</div>`}
      </div>
      ${session.showBack ? `
        <div class="grade-row">
          <button class="btn btn-soft-danger" id="btn-wrong">Again <span class="kbd hide-mobile">1</span></button>
          <button class="btn btn-soft-success" id="btn-right">Got it <span class="kbd hide-mobile">2</span></button>
        </div>` : `
        <button class="btn btn-primary btn-lg btn-block" id="btn-show" style="margin-top:16px">Show answer</button>`}
    </div>`;

  document.getElementById("btn-quit").onclick = () => { session = null; renderFlashcards(); refreshShell(); };
  if (session.showBack) {
    document.getElementById("btn-wrong").onclick = () => answerCard(false);
    document.getElementById("btn-right").onclick = () => answerCard(true);
  } else {
    document.getElementById("btn-show").onclick = reveal;
    document.getElementById("fc-card").onclick = reveal;
  }
}

function reveal() { session.showBack = true; drawReview(); }

function answerCard(right) {
  const card = session.queue.shift();
  if (!session.graded.has(card.id)) {
    session.graded.add(card.id);
    gradeCard(card, right);
    if (right) session.right++;
  }
  if (!right) session.queue.push(card);
  session.showBack = false;
  drawReview();
}

document.addEventListener("keydown", e => {
  if (!session || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || document.querySelector(".modal-overlay.show")) return;
  if (!session.showBack && (e.code === "Space" || e.key === "Enter")) { e.preventDefault(); reveal(); }
  else if (session.showBack && e.key === "1") answerCard(false);
  else if (session.showBack && e.key === "2") answerCard(true);
});

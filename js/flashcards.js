// ============================================================
// flashcards.js — Leitner boxes, review session, add & import
// Box 0 = new card (never reviewed). Boxes 1..5 = learning.
// Right answer -> next box. Wrong answer -> back to box 1.
// ============================================================

const BOX_INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }; // days until next review

// ---------- Which cards to study today ----------
function dueCards() {
  const today = todayStr();
  return DATA.flashcards
    .filter(c => c.box > 0 && c.due <= today)
    .sort((a, b) => a.box - b.box || a.due.localeCompare(b.due)); // weakest first
}
function newCards() {
  return DATA.flashcards.filter(c => c.box === 0);
}
function todayQueue() {
  const s = DATA.settings;
  let due = dueCards();
  let fresh = newCards();
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

// ---------- Create a card ----------
function chapterIdFrom(topic, chapterNo) {
  const n = parseInt(chapterNo, 10);
  return n > 0 ? `${topic}-${String(n).padStart(2, "0")}` : null;
}
function newCardObject({ topic, chapter, front, back, note, tags }) {
  return {
    id: makeId("c"), topic, chapter,
    front, back, note: note || "",
    tags: tags || [],
    box: 0, due: null, lastReviewed: null,
    stats: { right: 0, wrong: 0 },
    createdAt: todayStr()
  };
}

// ---------- CSV reader (handles "quoted, text" and line breaks in quotes) ----------
function parseCSV(text) {
  text = text.replace(/^﻿/, ""); // remove Excel's invisible BOM mark
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

// Returns { added, skipped, errors[] }
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
    const line = i + 2; // row number as seen in Google Sheets
    const topic = get(r, "topic").toUpperCase();
    const front = get(r, "front");
    const back = get(r, "back");
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

function downloadCardTemplate() {
  const csv = "topic,chapter,front,back,note,tags\n" +
    'QM,1,"Define ""compounding""",Earning interest on previously earned interest.,lãi kép,vocab\n';
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flashcards-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ================= CARDS HOME (#flashcards) =================
function renderFlashcards() {
  const due = dueCards().length;
  const fresh = newCards().length;
  const queue = todayQueue().length;
  const boxCounts = [0, 1, 2, 3, 4, 5].map(b => DATA.flashcards.filter(c => c.box === b).length);
  const log = DATA.dailyLog[todayStr()] || {};

  const topicOptions = TOPICS.map(t => `<option value="${t.id}">${t.id} · ${t.name}</option>`).join("");

  view.innerHTML = `
    <section class="card">
      <h2>Today</h2>
      <div class="stat-grid">
        <div><div class="stat">${due}</div><div class="muted">due</div></div>
        <div><div class="stat">${fresh}</div><div class="muted">new</div></div>
        <div><div class="stat">${log.cardsReviewed || 0}</div><div class="muted">done today</div></div>
      </div>
      <button class="btn" id="btn-start" style="width:100%" ${queue ? "" : "disabled"}>
        ${queue ? `▶ Start review (${queue} cards)` : "Nothing to review 🎉"}
      </button>
    </section>

    <section class="card">
      <h2>Leitner boxes</h2>
      <div class="boxes">
        ${boxCounts.map((n, b) => `
          <div class="box-col">
            <div class="box-bar"><div style="height:${DATA.flashcards.length ? Math.max(4, n / DATA.flashcards.length * 100) : 4}%"></div></div>
            <strong>${n}</strong>
            <div class="muted">${b === 0 ? "New" : "Box " + b}</div>
            <div class="muted small-txt">${b === 0 ? "" : "every " + BOX_INTERVAL[b] + "d"}</div>
          </div>`).join("")}
      </div>
    </section>

    <section class="card">
      <details>
        <summary><strong>➕ Add a card</strong></summary>
        <select id="fc-topic">${topicOptions}</select>
        <input type="number" id="fc-chapter" min="1" placeholder="Chapter number (optional)" inputmode="numeric">
        <textarea id="fc-front" rows="2" placeholder="Front: question / term (English)"></textarea>
        <textarea id="fc-back" rows="3" placeholder="Back: answer in your own words"></textarea>
        <input type="text" id="fc-note" placeholder="Note (optional, Vietnamese OK)">
        <button class="btn" id="btn-add-card">Save card</button>
      </details>
    </section>

    <section class="card">
      <details>
        <summary><strong>⬆️ Import from CSV (Google Sheets)</strong></summary>
        <p class="muted">Columns: <code>topic,chapter,front,back,note,tags</code>.
        Topic codes: ${TOPICS.map(t => t.id).join(", ")}. Duplicate cards are skipped.</p>
        <button class="btn secondary" id="btn-template">⬇️ Download template</button>
        <label class="btn">
          Choose CSV file
          <input type="file" id="fc-csv" accept=".csv,text/csv" hidden>
        </label>
        <div id="csv-msg"></div>
      </details>
    </section>

    <section class="card">
      <details>
        <summary><strong>📋 All cards (${DATA.flashcards.length})</strong></summary>
        <select id="fc-filter"><option value="">All topics</option>${topicOptions}</select>
        <div id="card-list"></div>
      </details>
    </section>`;

  document.getElementById("btn-start").onclick = () => startReview(todayQueue());

  document.getElementById("btn-add-card").onclick = () => {
    const topic = document.getElementById("fc-topic").value;
    const front = document.getElementById("fc-front").value.trim();
    const back = document.getElementById("fc-back").value.trim();
    if (!front || !back) { alert("Front and back are required."); return; }
    DATA.flashcards.push(newCardObject({
      topic, front, back,
      chapter: chapterIdFrom(topic, document.getElementById("fc-chapter").value),
      note: document.getElementById("fc-note").value.trim()
    }));
    saveData();
    renderFlashcards();
    alert("Card saved ✅");
  };

  document.getElementById("btn-template").onclick = downloadCardTemplate;

  document.getElementById("fc-csv").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = importCardsCSV(await file.text());
    const box = document.getElementById("csv-msg");
    box.innerHTML = `<div class="notice ${res.errors.length ? "warn" : "ok"}">
      ✅ Added ${res.added} · skipped ${res.skipped} duplicate(s)
      ${res.errors.length ? "<br>⚠️ " + res.errors.slice(0, 10).map(esc).join("<br>⚠️ ") : ""}
    </div>`;
    e.target.value = "";
  };

  const filter = document.getElementById("fc-filter");
  const drawList = () => {
    const list = DATA.flashcards.filter(c => !filter.value || c.topic === filter.value);
    document.getElementById("card-list").innerHTML = list.length ? list.map(c => `
      <div class="row">
        <div class="row-main">
          <div><strong>${esc(c.front)}</strong></div>
          <div class="muted">${c.topic}${c.chapter ? " · ch " + parseInt(c.chapter.split("-")[1], 10) : ""} · ${c.box === 0 ? "new" : "box " + c.box + " · due " + c.due}</div>
        </div>
        <button class="icon-btn" data-delcard="${c.id}" title="Delete">🗑</button>
      </div>`).join("") : `<p class="muted">No cards.</p>`;
    document.querySelectorAll("[data-delcard]").forEach(b => b.onclick = () => {
      if (!confirm("Delete this card?")) return;
      DATA.flashcards = DATA.flashcards.filter(c => c.id !== b.dataset.delcard);
      saveData();
      drawList();
    });
  };
  filter.onchange = drawList;
  drawList();
}

// ================= REVIEW SESSION =================
// Wrong cards come back at the end of the session for extra practice
// (only the FIRST answer of the day changes the box).
let session = null;

function startReview(cards) {
  session = { queue: cards.slice(), graded: new Set(), right: 0, total: cards.length, showBack: false };
  drawReview();
}

function drawReview() {
  if (!session) return renderFlashcards();
  const card = session.queue[0];
  if (!card) {
    view.innerHTML = `
      <section class="card" style="text-align:center">
        <h2>Session complete 🎉</h2>
        <div class="big-number">${session.right}/${session.total}</div>
        <div class="muted">right on first try</div>
        <a class="btn" href="#flashcards" id="btn-done">Back to cards</a>
      </section>`;
    session = null;
    document.getElementById("btn-done").onclick = () => renderFlashcards();
    return;
  }
  const t = topicById(card.topic);
  const done = session.graded.size;
  view.innerHTML = `
    <div class="muted" style="display:flex;justify-content:space-between">
      <span>${done}/${session.total} · ${card.box === 0 ? "NEW" : "Box " + card.box}</span>
      <a href="#flashcards" id="btn-quit">✕ Stop</a>
    </div>
    <div class="bar"><div style="width:${session.total ? done / session.total * 100 : 0}%"></div></div>
    <section class="card flashcard" id="fc-card">
      <div class="muted">${t ? t.name : card.topic}</div>
      <div class="fc-front">${esc(card.front)}</div>
      ${session.showBack ? `
        <hr>
        <div class="fc-back">${esc(card.back)}</div>
        ${card.note ? `<div class="muted fc-note">🇻🇳 ${esc(card.note)}</div>` : ""}
      ` : `<div class="muted" style="margin-top:24px">Tap card or press Space to show answer</div>`}
    </section>
    ${session.showBack ? `
      <div class="grade-btns">
        <button class="btn bad" id="btn-wrong">✘ Again <span class="kbd">1</span></button>
        <button class="btn good" id="btn-right">✔ Got it <span class="kbd">2</span></button>
      </div>` : `
      <button class="btn" id="btn-show" style="width:100%">Show answer</button>`}`;

  document.getElementById("btn-quit").onclick = () => { session = null; renderFlashcards(); };
  if (session.showBack) {
    document.getElementById("btn-wrong").onclick = () => answer(false);
    document.getElementById("btn-right").onclick = () => answer(true);
  } else {
    document.getElementById("btn-show").onclick = reveal;
    document.getElementById("fc-card").onclick = reveal;
  }
}

function reveal() { session.showBack = true; drawReview(); }

function answer(right) {
  const card = session.queue.shift();
  if (!session.graded.has(card.id)) {
    session.graded.add(card.id);
    gradeCard(card, right);
    if (right) session.right++;
  }
  if (!right) session.queue.push(card); // see it again before the session ends
  session.showBack = false;
  drawReview();
}

// Laptop shortcuts: Space = show, 1 = again, 2 = got it
document.addEventListener("keydown", e => {
  if (!session || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (!session.showBack && (e.code === "Space" || e.key === "Enter")) { e.preventDefault(); reveal(); }
  else if (session.showBack && e.key === "1") answer(false);
  else if (session.showBack && e.key === "2") answer(true);
});

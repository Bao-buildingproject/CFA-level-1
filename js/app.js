// ============================================================
// app.js — tab navigation, countdown, dashboard, settings
// ============================================================

const view = document.getElementById("view");

// ---------- Study plan phases (by week number) ----------
function studyPhase(week) {
  if (week < 1) return "Not started yet";
  if (week <= 15) return "Phase 1 · Learn new material";
  if (week <= 20) return "Phase 2 · Review by topic";
  if (week <= 25) return "Phase 3 · Mock exams & fix weak spots";
  return "Exam time!";
}

function countdownInfo() {
  const today = todayStr();
  const daysLeft = daysBetween(today, DATA.settings.examDate);
  const week = Math.floor(daysBetween(DATA.settings.startDate, today) / 7) + 1;
  return { daysLeft, week, phase: studyPhase(week) };
}

function updateMiniCountdown() {
  const { daysLeft } = countdownInfo();
  document.getElementById("countdown-mini").textContent =
    daysLeft >= 0 ? `${daysLeft} days left` : "Exam passed";
}

// ---------- Backup reminder ----------
function backupNotice() {
  const last = DATA.settings.lastBackup;
  if (!last) {
    return `<div class="notice warn">💾 You have never backed up. Go to <a href="#settings">Settings</a> → Export.</div>`;
  }
  const ago = daysBetween(last, todayStr());
  const cls = ago >= 3 ? "warn" : "ok";
  return `<div class="notice ${cls}">💾 Last backup: ${ago === 0 ? "today" : ago + " day(s) ago"}</div>`;
}

// ---------- Topic progress (computed from chapter status) ----------
function topicProgress(topicId) {
  const chs = DATA.chapters.filter(c => c.topic === topicId);
  const done = chs.filter(c => c.status === "done" || c.status === "reviewed").length;
  return { total: chs.length, done, pct: chs.length ? Math.round((done / chs.length) * 100) : 0 };
}

// ================= VIEWS =================

function renderDashboard() {
  const { daysLeft, week, phase } = countdownInfo();
  const weekText = week < 1 ? "Starts " + DATA.settings.startDate : `Week ${Math.min(week, 25)} / 25`;

  const topicRows = TOPICS.map(t => {
    const p = topicProgress(t.id);
    return `
      <div style="margin:10px 0">
        <div style="display:flex;justify-content:space-between">
          <strong>${t.order}. ${t.name}</strong>
          <span class="muted" style="white-space:nowrap;margin-left:8px">${p.done}/${p.total} · ${p.pct}%</span>
        </div>
        <div class="bar"><div style="width:${p.pct}%"></div></div>
        <div class="muted">Exam weight ${t.weight} · plan ${t.plannedWeeks} wk</div>
      </div>`;
  }).join("");

  view.innerHTML = `
    <section class="card">
      <h2>Exam countdown</h2>
      <div class="big-number">${Math.max(daysLeft, 0)}</div>
      <div>days until <strong>${DATA.settings.examDate}</strong></div>
      <div class="muted">${weekText} · ${phase}</div>
    </section>
    ${backupNotice()}
    <section class="card">
      <h2>Progress by topic</h2>
      <p class="muted">Chapters will be added in Phase 2.</p>
      ${topicRows}
    </section>`;
}

function renderComingSoon(title, phase) {
  view.innerHTML = `
    <section class="card">
      <h2>${title}</h2>
      <p class="muted">Coming in ${phase}.</p>
    </section>`;
}

function renderSettings() {
  view.innerHTML = `
    <section class="card">
      <h2>Backup</h2>
      <p class="muted">Export after studying, then upload the file to Google Drive.
      To move data to another device, Import the newest file there.</p>
      <button class="btn" id="btn-export">⬇️ Export backup (.json)</button>
      <label class="btn secondary">
        ⬆️ Import backup
        <input type="file" id="file-import" accept=".json,application/json" hidden>
      </label>
      <div id="import-msg"></div>
    </section>

    <section class="card">
      <h2>Exam date</h2>
      <p class="muted">Confirm your real date on cfainstitute.org after scheduling.</p>
      <input type="date" id="exam-date" value="${DATA.settings.examDate}"
             style="font-size:1rem;padding:8px;border-radius:8px">
      <button class="btn" id="btn-save-date">Save</button>
    </section>

    <section class="card">
      <h2>Data summary</h2>
      <p>${DATA.chapters.length} chapters · ${DATA.flashcards.length} cards · ${DATA.questions.length} questions</p>
      <button class="btn bad" id="btn-reset">Delete all data</button>
    </section>`;

  document.getElementById("btn-export").onclick = () => {
    exportData();
    showMsg("ok", "Backup downloaded. Upload it to Google Drive.");
  };

  document.getElementById("file-import").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Importing will REPLACE all data on this device. Continue?")) return;
    try {
      const summary = await importData(file);
      updateMiniCountdown();
      renderSettings();
      showMsg("ok", "✅ Imported: " + summary);
    } catch (err) {
      showMsg("err", "❌ " + err.message);
    }
  };

  document.getElementById("btn-save-date").onclick = () => {
    const v = document.getElementById("exam-date").value;
    if (!v) return;
    DATA.settings.examDate = v;
    saveData();
    updateMiniCountdown();
    alert("Exam date saved: " + v);
  };

  document.getElementById("btn-reset").onclick = () => {
    if (!confirm("Delete ALL data on this device? Export a backup first!")) return;
    if (prompt('Type DELETE to confirm') !== "DELETE") return;
    DATA = defaultData();
    saveData();
    renderSettings();
  };
}

function showMsg(type, text) {
  const box = document.getElementById("import-msg");
  if (box) box.innerHTML = `<div class="notice ${type}">${text}</div>`;
}

// ================= ROUTER (switch tabs by #hash) =================
const ROUTES = {
  dashboard: renderDashboard,
  flashcards: () => renderComingSoon("Flashcards", "Phase 3"),
  questions: () => renderComingSoon("Question bank", "Phase 4"),
  settings: renderSettings
};

function router() {
  const tab = location.hash.replace("#", "") || "dashboard";
  (ROUTES[tab] || renderDashboard)();
  document.querySelectorAll(".tabs a").forEach(a =>
    a.classList.toggle("active", a.dataset.tab === tab)
  );
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);
updateMiniCountdown();
router();

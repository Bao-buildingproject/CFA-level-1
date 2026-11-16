// ============================================================
// app.js — navigation shell, router, dashboard, settings
// ============================================================

const view = document.getElementById("view");

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard", icon: "home" },
  { route: "study", label: "Study plan", icon: "book" },
  { route: "cards", label: "Flashcards", icon: "cards" },
  { route: "practice", label: "Practice", icon: "check" },
  { route: "mock", label: "Mock exams", icon: "clock" },
  { route: "settings", label: "Settings", icon: "settings" }
];
const MOBILE_NAV = ["dashboard", "study", "cards", "practice", "mock"];
const MOBILE_LABEL = { dashboard: "Home", study: "Study", cards: "Cards", practice: "Practice", mock: "Mock" };

// ---------- Countdown ----------
function studyPhase(week) {
  if (week < 1) return "Not started yet";
  if (week <= 15) return "Phase 1 · Learn";
  if (week <= 20) return "Phase 2 · Review";
  if (week <= 25) return "Phase 3 · Mock exams";
  return "Exam time";
}
function countdownInfo() {
  const today = todayStr();
  const daysLeft = daysBetween(today, DATA.settings.examDate);
  const week = Math.floor(daysBetween(DATA.settings.startDate, today) / 7) + 1;
  return { daysLeft, week, phase: studyPhase(week) };
}

// ---------- Shell: nav + badges ----------
function navBadge(route) {
  if (route === "cards") return todayQueue().length;
  if (route === "practice") return DATA.questions.filter(q => q.inMistakeLog).length;
  if (route === "mock") return DATA.activeMock ? "•" : 0;
  return 0;
}

function currentRoute() {
  return (location.hash.replace(/^#\/?/, "") || "dashboard").split("/");
}

function refreshShell() {
  const [route] = currentRoute();
  const active = route === "topic" ? "study" : route;
  const { daysLeft, week, phase } = countdownInfo();

  document.getElementById("side-nav").innerHTML = NAV_ITEMS.map(n => {
    const b = navBadge(n.route);
    return `<a class="nav-link ${active === n.route ? "active" : ""}" href="#/${n.route}" ${active === n.route ? 'aria-current="page"' : ""}>
      ${icon(n.icon, 20)}<span>${n.label}</span>${b ? `<span class="nav-badge">${b}</span><i class="dot"></i>` : ""}</a>`;
  }).join("");

  document.getElementById("bottom-nav").innerHTML = MOBILE_NAV.map(r => {
    const n = NAV_ITEMS.find(x => x.route === r);
    const b = navBadge(r);
    return `<a href="#/${r}" class="${active === r ? "active" : ""}" ${active === r ? 'aria-current="page"' : ""}>${icon(n.icon, 22)}${MOBILE_LABEL[r]}${b ? '<i class="dot"></i>' : ""}</a>`;
  }).join("");

  document.getElementById("mobile-settings").innerHTML = icon("settings", 20);
  document.getElementById("side-days").textContent = daysLeft >= 0 ? `${daysLeft} days` : "Done";
  document.getElementById("side-week").textContent = week >= 1 ? `Week ${Math.min(week, 25)} · ${phase}` : phase;
  document.getElementById("mobile-days").textContent = daysLeft >= 0 ? `${daysLeft} days left` : "";
}

// ================= DASHBOARD =================
function renderDashboard() {
  const { daysLeft, week, phase } = countdownInfo();
  const all = overallProgress();
  const pace = paceStatus();
  const queue = todayQueue().length;
  const qs = quizStats();
  const log = DATA.dailyLog[todayStr()] || {};
  const lastMock = DATA.mocks[DATA.mocks.length - 1];
  const backupAgo = DATA.settings.lastBackup ? daysBetween(DATA.settings.lastBackup, todayStr()) : null;

  const topicCards = TOPICS.map(t => {
    const p = topicProgress(t.id);
    const ts = quizStats(DATA.questions.filter(q => q.topic === t.id));
    return `
      <a class="card card-link topic-card" href="#/topic/${t.id}">
        <div class="topic-code">${t.id} · ${t.weight}</div>
        <h3>${t.name}</h3>
        ${progressBar(p.pct, p.pct === 100 ? "success" : "")}
        <div class="row-between small">
          <span class="text-2">${p.done}/${p.total} chapters</span>
          <span class="text-3">${ts.pct === null ? "" : `${ts.pct}% acc.`}</span>
        </div>
      </a>`;
  }).join("");

  view.innerHTML = `
    ${pageHeader("Dashboard", new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}

    <div class="card hero">
      <div>
        <div class="text-2 small" style="font-weight:600">CFA Level I exam · ${prettyDate(DATA.settings.examDate)}</div>
        <div class="hero-days" style="margin-top:6px">${Math.max(daysLeft, 0)}<span>days left</span></div>
        <div class="hero-meta">
          <span class="badge badge-application">${week >= 1 ? `Week ${Math.min(week, 25)} of 25` : `Starts ${prettyDate(DATA.settings.startDate)}`}</span>
          <span class="badge">${phase}</span>
        </div>
      </div>
      ${progressRing(all.pct, 112, 10, "syllabus")}
    </div>

    <div class="callout ${pace.tone} section">${icon(pace.tone === "warning" ? "alert" : "target", 18)}<div>${pace.text}</div></div>

    <div class="section-title section">Today</div>
    <div class="grid grid-stats">
      <a class="card card-link stat" href="#/cards">
        <div class="stat-icon">${icon("cards", 18)}</div>
        <span class="stat-label">Cards to review</span><span class="stat-value">${queue}</span>
        <span class="stat-hint">${log.cardsReviewed || 0} reviewed today</span>
      </a>
      <a class="card card-link stat" href="#/practice">
        <div class="stat-icon danger">${icon("alert", 18)}</div>
        <span class="stat-label">Mistakes to redo</span><span class="stat-value">${qs.mistakes}</span>
        <span class="stat-hint">${log.questionsDone || 0} questions today</span>
      </a>
      <a class="card card-link stat" href="#/practice">
        <div class="stat-icon accent">${icon("target", 18)}</div>
        <span class="stat-label">Question accuracy</span><span class="stat-value">${qs.pct === null ? "–" : qs.pct + "%"}</span>
        <span class="stat-hint">${qs.total} in your bank</span>
      </a>
      <a class="card card-link stat" href="${lastMock ? `#/mock/result/${lastMock.id}` : "#/mock"}">
        <div class="stat-icon warning">${icon("clock", 18)}</div>
        <span class="stat-label">Last mock</span><span class="stat-value">${lastMock ? pct(lastMock.correct, lastMock.total) + "%" : "–"}</span>
        <span class="stat-hint">${lastMock ? prettyDate(lastMock.date) : "No mock yet"}</span>
      </a>
    </div>

    ${DATA.activeMock ? `<div class="callout warning section">${icon("clock", 18)}<div style="flex:1"><strong>${esc(DATA.activeMock.name)}</strong> is in progress.</div><a class="btn btn-primary btn-sm" href="#/mock/run">Resume</a></div>` : ""}

    <div class="row-between section">
      <div class="section-title" style="margin:0">Topics</div>
      <a href="#/study" class="small" style="font-weight:600">View study plan →</a>
    </div>
    <div class="grid grid-3" style="margin-top:12px">${topicCards}</div>

    <div class="grid grid-2 section">
      <div class="card">
        <div class="card-head"><h2>CFA Learning Ecosystem</h2></div>
        <p class="text-2 small">Official practice questions. Log scores and missed questions on each topic page.</p>
        <a class="btn btn-secondary" style="margin-top:14px" href="${LES_URL}" target="_blank" rel="noopener">${icon("external", 18)} Open CFA Practice</a>
      </div>
      <div class="card">
        <div class="card-head"><h2>Backup</h2>
          <span class="badge ${backupAgo === null || backupAgo >= 3 ? "badge-warning" : "badge-success"}">${backupAgo === null ? "Never" : backupAgo === 0 ? "Today" : `${backupAgo}d ago`}</span></div>
        <p class="text-2 small">Your data lives in this browser. Export a backup to Google Drive regularly.</p>
        <button class="btn btn-secondary" style="margin-top:14px" id="dash-export">${icon("download", 18)} Export backup</button>
      </div>
    </div>`;

  document.getElementById("dash-export").onclick = () => { exportData(); toast("Backup downloaded — upload it to Google Drive"); renderDashboard(); };
}

// ================= SETTINGS =================
function renderSettings() {
  const s = DATA.settings;
  view.innerHTML = `
    ${pageHeader("Settings", "Backup, exam date and appearance")}

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><h2>Backup & restore</h2><p class="text-2 small">Last backup: ${s.lastBackup ? prettyDate(s.lastBackup) : "never"}</p></div></div>
        <p class="text-2 small">Export after each study session and upload the file to Google Drive. To move to another device, import the newest file there.</p>
        <div class="row-gap" style="margin-top:16px">
          <button class="btn btn-primary" id="btn-export">${icon("download", 18)} Export</button>
          <label class="btn btn-secondary">${icon("upload", 18)} Import<input type="file" id="file-import" accept=".json,application/json" hidden></label>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2>Exam date</h2><p class="text-2 small">Confirm on cfainstitute.org after you schedule.</p></div></div>
        <div class="form-grid">
          <label class="field"><span class="field-label">Exam date</span><input class="input" type="date" id="exam-date" value="${s.examDate}"></label>
          <label class="field"><span class="field-label">Study start</span><input class="input" type="date" id="start-date" value="${s.startDate}"></label>
        </div>
        <div class="form-actions"><button class="btn btn-primary" id="btn-save-date">${icon("save", 18)} Save dates</button></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Appearance</h2></div>
        <div class="segmented" id="theme-seg">
          ${[["light", "Light"], ["dark", "Dark"], ["system", "Match device"]].map(([k, v]) => `<button data-theme="${k}" class="${s.theme === k ? "active" : ""}">${v}</button>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Your data</h2></div>
        <div class="grid grid-2" style="gap:8px">
          <div class="stat"><span class="stat-label">Chapters</span><span class="stat-value" style="font-size:1.3rem">${DATA.chapters.length}</span></div>
          <div class="stat"><span class="stat-label">Flashcards</span><span class="stat-value" style="font-size:1.3rem">${DATA.flashcards.length}</span></div>
          <div class="stat"><span class="stat-label">Questions</span><span class="stat-value" style="font-size:1.3rem">${DATA.questions.length}</span></div>
          <div class="stat"><span class="stat-label">Mock exams</span><span class="stat-value" style="font-size:1.3rem">${DATA.mocks.length}</span></div>
        </div>
        <button class="btn btn-soft-danger" id="btn-reset" style="margin-top:16px">${icon("trash", 18)} Delete all data</button>
      </div>
    </div>`;

  document.getElementById("btn-export").onclick = () => { exportData(); toast("Backup downloaded — upload it to Google Drive"); renderSettings(); };

  document.getElementById("file-import").onchange = async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!await confirmDialog({ title: "Replace data on this device?", message: "Importing replaces ALL current data on this device with the backup file.", confirmText: "Import", danger: true })) return;
    try {
      const summary = await importData(file);
      applyTheme(); refreshShell(); renderSettings();
      toast("Imported: " + summary);
    } catch (err) { toast(err.message, "error"); }
  };

  document.getElementById("btn-save-date").onclick = () => {
    const ex = document.getElementById("exam-date").value, st = document.getElementById("start-date").value;
    if (!ex || !st || st >= ex) { toast("Start date must be before the exam date", "error"); return; }
    s.examDate = ex; s.startDate = st;
    saveData(); refreshShell(); toast("Dates saved");
  };

  view.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => {
    s.theme = b.dataset.theme; saveData(); applyTheme();
    view.querySelectorAll("[data-theme]").forEach(x => x.classList.toggle("active", x === b));
  });

  document.getElementById("btn-reset").onclick = async () => {
    if (!await confirmDialog({ title: "Delete all data?", message: "This erases chapters, cards, questions and mock history on this device. Export a backup first.", confirmText: "Delete everything", danger: true, requireText: "DELETE" })) return;
    DATA = upgrade({}); saveData(); applyTheme(); refreshShell(); renderSettings(); toast("All data deleted");
  };
}

// ================= ROUTER =================
const ROUTES = {
  dashboard: renderDashboard,
  study: renderStudy,
  topic: id => renderTopic(id),
  cards: renderFlashcards,
  flashcards: renderFlashcards,      // old link
  practice: renderQuestions,
  questions: renderQuestions,        // old link
  mock: (sub, id) => sub === "run" ? renderMockRun() : sub === "result" ? renderMockResult(id) : renderMock(),
  settings: renderSettings
};

function router() {
  stopMockTimer();
  session = null;   // leave any flashcard session
  quiz = null;      // leave any practice session
  const [route, a, b] = currentRoute();
  (ROUTES[route] || renderDashboard)(a, b);
  refreshShell();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);
applyTheme();
router();

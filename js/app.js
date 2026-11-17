// ============================================================
// app.js — navigation shell, router, dashboard, settings
// ============================================================

const view = document.getElementById("view");

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard", icon: "home" },
  { route: "study", label: "Study plan", icon: "target" },
  { route: "schweser", label: "SchweserNotes", icon: "book" },
  { route: "curriculum", label: "Curriculum", icon: "grid" },
  { route: "cards", label: "Flashcards", icon: "cards" },
  { route: "practice", label: "Practice", icon: "check" },
  { route: "qbank", label: "Question Bank", icon: "flag" },
  { route: "analysis", label: "Weak spots", icon: "alert" },
  { route: "mock", label: "Mock exams", icon: "clock" },
  { route: "settings", label: "Settings", icon: "settings" }
];
const MOBILE_NAV = ["dashboard", "study", "practice", "mock", "more"];
const MOBILE_LABEL = { dashboard: "Home", study: "Study", practice: "Practice", mock: "Mock", more: "More", qbank: "Bank", cards: "Cards" };
const MOBILE_NAV_LIMITED = ["dashboard", "study", "qbank", "cards", "more"];
const TEST_ROUTES = ["practice", "mock"];          // hidden for profiles created with "hide Practice and Mock exams"
function testsHidden() { try { return activeProfile().hideTests === true; } catch (e) { return false; } }
const navItems = () => testsHidden() ? NAV_ITEMS.filter(n => !TEST_ROUTES.includes(n.route)) : NAV_ITEMS;
const mobileNav = () => testsHidden() ? MOBILE_NAV_LIMITED : MOBILE_NAV;

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
  const active = route === "topic" || route === "module" || route === "dist" ? "study" : route;
  const { daysLeft, week, phase } = countdownInfo();

  document.getElementById("side-nav").innerHTML = navItems().map(n => {
    const b = navBadge(n.route);
    return `<a class="nav-link ${active === n.route ? "active" : ""}" href="#/${n.route}" ${active === n.route ? 'aria-current="page"' : ""}>
      ${icon(n.icon, 20)}<span>${n.label}</span>${b ? `<span class="nav-badge">${b}</span><i class="dot"></i>` : ""}</a>`;
  }).join("");

  const moreActive = !mobileNav().includes(active) && !["dashboard", "study", "practice", "mock"].includes(active) || active === "more";
  document.getElementById("bottom-nav").innerHTML = mobileNav().map(r => {
    const n = NAV_ITEMS.find(x => x.route === r) || { icon: "grid" };
    const b = r === "more" ? navBadge("cards") : navBadge(r);
    if (r === "more") return `<a href="#/more" class="${moreActive ? "active" : ""}">${icon("grid", 22)}More${b ? '<i class="dot"></i>' : ""}</a>`;
    return `<a href="#/${r}" class="${active === r ? "active" : ""}" ${active === r ? 'aria-current="page"' : ""}>${icon(n.icon, 22)}${MOBILE_LABEL[r]}${b ? '<i class="dot"></i>' : ""}</a>`;
  }).join("");

  document.getElementById("mobile-settings").innerHTML = icon("settings", 20);
  const prof = activeProfile();
  document.getElementById("profile-chip").innerHTML = `${avatarHtml(prof, 30)}<span class="pc-text"><span class="pc-name">${esc(prof.name)}</span><br><span class="pc-sub">${PROFILES.list.length > 1 ? "Switch profile" : "Profile"}</span></span>`;
  document.getElementById("mobile-profile").innerHTML = avatarHtml(prof, 30);
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
    const tp = topicModuleProgress(t.id);
    const ts = quizStats(DATA.questions.filter(q => q.topic === t.id));
    return `
      <a class="card card-link topic-card" href="#/topic/${t.id}">
        <div class="topic-code">${t.id} · ${t.weight}</div>
        <h3>${t.name}</h3>
        ${bellCurve(tp.pct, { width: 280, height: 60, compact: true, tip: `${t.name}\nAverage module completion: ${tp.pct}%\n${tp.done}/${tp.modules} modules done` })}
        <div class="row-between small">
          <span class="text-2">${tp.done}/${tp.modules} modules</span>
          <span class="text-3">${ts.pct === null ? `${ts.total} Q` : `${ts.pct}% acc.`}</span>
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
      ${testsHidden() ? "" : `<a class="card card-link stat" href="#/practice">
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
      </a>`}
    </div>

    ${DATA.activeMock && !testsHidden() ? `<div class="callout warning section">${icon("clock", 18)}<div style="flex:1"><strong>${esc(DATA.activeMock.name)}</strong> is in progress.</div><a class="btn btn-primary btn-sm" href="#/mock/run">Resume</a></div>` : ""}

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
          ${isOwner() ? `<label class="btn btn-secondary">${icon("upload", 18)} Import<input type="file" id="file-import" accept=".json,application/json" hidden></label>` : ""}
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
        ${isOwner() ? `<button class="btn btn-soft-danger" id="btn-reset" style="margin-top:16px">${icon("trash", 18)} Delete all data</button>` : ""}
      </div>

      <div class="card">
        <div class="card-head"><div><h2>Owner mode</h2><p class="text-2 small">${isOwner() ? "Unlocked — editing tools are visible" : ownerHash() ? "Locked — editing tools are hidden" : "Not set up yet"}</p></div>
          <span class="badge ${isOwner() ? "badge-success" : ""}">${isOwner() ? "Unlocked" : "Locked"}</span></div>
        <p class="text-2 small">Adding, importing or deleting questions and flashcards, restoring backups and deleting data are hidden unless the owner unlocks them.</p>
        <div class="row-gap" style="margin-top:14px">
          ${!ownerHash() ? `<button class="btn btn-primary" id="btn-owner-setup">Set owner password</button>`
            : isOwner() ? `<button class="btn btn-secondary" id="btn-owner-lock">Lock</button><button class="btn btn-ghost" id="btn-owner-change">Change password</button>`
            : `<button class="btn btn-primary" id="btn-owner-unlock">Owner login</button>`}
        </div>
      </div>
    </div>`;

  document.getElementById("btn-export").onclick = () => { exportData(); toast("Backup downloaded — upload it to Google Drive"); renderSettings(); };

  const ob = id => document.getElementById(id);
  if (ob("btn-owner-setup")) ob("btn-owner-setup").onclick = async () => { if (await setupOwner()) renderSettings(); };
  if (ob("btn-owner-unlock")) ob("btn-owner-unlock").onclick = async () => { if (await unlockOwner()) renderSettings(); };
  if (ob("btn-owner-lock")) ob("btn-owner-lock").onclick = () => { lockOwner(); renderSettings(); };
  if (ob("btn-owner-change")) ob("btn-owner-change").onclick = async () => { if (await unlockOwner() && await setupOwner()) renderSettings(); };

  if (ob("file-import")) ob("file-import").onchange = async e => {
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

  if (ob("btn-reset")) ob("btn-reset").onclick = async () => {
    if (!await confirmDialog({ title: "Delete all data?", message: "This erases chapters, cards, questions and mock history on this device. Export a backup first.", confirmText: "Delete everything", danger: true, requireText: "DELETE" })) return;
    DATA = upgrade({}); saveData(); if (typeof qbiClearProfile === "function") qbiClearProfile(PROFILES.active); applyTheme(); refreshShell(); renderSettings(); toast("All data deleted");
  };
}

// ================= ROUTER =================
const ROUTES = {
  dashboard: renderDashboard,
  study: renderStudy,
  topic: id => renderTopic(id),
  module: id => renderModule(id),
  schweser: renderSchweser,
  curriculum: renderCurriculum,
  cards: renderFlashcards,
  flashcards: renderFlashcards,      // old link
  practice: renderQuestions,
  questions: renderQuestions,        // old link
  mock: (sub, id) => sub === "run" ? renderMockRun() : sub === "result" ? renderMockResult(id) : renderMock(),
  settings: renderSettings,
  more: renderMore,
  signout: signOut,
  qbank: renderQBank,
  analysis: renderAnalysis,
  dist: renderDist,
  profiles: renderProfiles
};

// ================= MORE (mobile menu) =================
function renderMore() {
  const items = [
    ["schweser", "book", "SchweserNotes", "4 books · reading checklist"],
    ["curriculum", "grid", "Curriculum", "93 learning modules"],
    ["qbank", "flag", "Question Bank", "Your PDF question sets · answer them here"],
    ["analysis", "alert", "Weak spots", "Accuracy by topic and module"],
    ["dist", "target", "Distributions (Quant)", "Normal, t, chi-square, lognormal · z-table"],
    ["cards", "cards", "Flashcards", `${todayQueue().length} to review today`],
    ["profiles", "home", "Profiles", `${PROFILES.list.length} profile(s) · switch user`],
    ["settings", "settings", "Settings", "Backup, exam date, theme"],
    ["signout", "back", "Sign out", "Lock the site until you sign in again"]
  ];
  view.innerHTML = `${pageHeader("More")}
    <div class="card"><div class="list">${items.map(([r, ic, label, sub]) => `
      <a class="list-item" href="#/${r}"><div class="stat-icon" style="margin:0">${icon(ic, 18)}</div>
        <div class="list-main"><div class="list-title">${label}</div><div class="list-meta">${sub}</div></div>${icon("chevron", 18)}</a>`).join("")}</div></div>
    <p class="text-3 small section">Site version <strong>${APP_VERSION}</strong> · <button class="btn btn-ghost btn-sm" id="btn-update">Check for updates</button></p>`;
  document.getElementById("btn-update").onclick = () => checkForUpdate(true);
}

function router() {
  if (isLocked()) { renderGate(); return; }
  document.body.classList.remove("gated");
  stopMockTimer();
  session = null;   // leave any flashcard session
  quiz = null;      // leave any practice session
  const [route, a, b, c] = currentRoute();
  if (testsHidden() && TEST_ROUTES.includes(route)) { location.hash = "#/dashboard"; return; }
  (ROUTES[route] || renderDashboard)(a, b, c);
  refreshShell();
  window.scrollTo(0, 0);
}



// ================= PROFILES (#/profiles) =================
const UNLOCK_KEY = "cfaStudy_unlocked";
function isUnlocked(id) { try { return sessionStorage.getItem(UNLOCK_KEY) === id; } catch (e) { return false; } }
function markUnlocked(id) { try { sessionStorage.setItem(UNLOCK_KEY, id); } catch (e) { /* ignore */ } }
function isLocked() { return gateNeeded(); }
const PIN_RULE = v => (v && v.length >= 4) ? "" : "Use at least 4 characters";

async function askPinFor(profile) {
  const pin = await promptDialog({ title: `Unlock ${profile.name}`, label: "Password", type: "password", inputmode: "text", maxlength: 40, confirmText: "Unlock", validate: PIN_RULE });
  if (pin === null) return false;
  if (await hashPin(pin) !== profile.pinHash) { toast("Wrong PIN", "error"); return false; }
  return true;
}

async function goToProfile(id) {
  const p = PROFILES.list.find(x => x.id === id);
  if (!p) return;
  if (p.pinHash && !(await askPinFor(p))) return;
  switchProfile(id);
  markUnlocked(id);
  applyTheme();
  toast(`Switched to ${p.name}`);
  location.hash = "#/dashboard";
  router();
}

function profileSummary(id) {
  try {
    const d = id === PROFILES.active ? DATA : JSON.parse(localStorage.getItem(profileKey(id)) || "{}");
    const qs = (d.questions || []).filter(q => (q.attempts || []).length).length;
    return `${qs} questions practised · ${(d.mocks || []).length} mock(s)`;
  } catch (e) { return ""; }
}

function renderProfiles() {
  const cur = activeProfile();
  view.innerHTML = `
    ${pageHeader("Profiles", "Each person gets separate progress, questions, flashcards and mock history on this device", `<button class="btn btn-secondary" id="btn-signout">Sign out</button>`)}
    <div class="card">
      <div class="list">${PROFILES.list.map(p => `
        <div class="list-item">
          ${avatarHtml(p, 40)}
          <div class="list-main">
            <div class="list-title">${esc(p.name)} ${p.id === cur.id ? '<span class="badge badge-success">Active</span>' : ""} ${p.pinHash ? '<span class="badge">PIN</span>' : ""} ${p.hideTests ? '<span class="badge">Practice &amp; Mock hidden</span>' : ""}</div>
            <div class="list-meta">${profileSummary(p.id)}</div>
          </div>
          ${p.id === cur.id ? "" : `<button class="btn btn-primary btn-sm" data-switch="${p.id}">Switch</button>`}
          ${isOwner() ? `<button class="btn btn-ghost btn-sm" data-hidetests="${p.id}">${p.hideTests ? "Show Practice &amp; Mock" : "Hide Practice &amp; Mock"}</button>` : ""}
          <button class="icon-btn" data-rename="${p.id}" aria-label="Rename ${esc(p.name)}" title="Rename">${icon("settings", 18)}</button>
          ${PROFILES.list.length > 1 && isOwner() ? `<button class="icon-btn danger" data-delprof="${p.id}" aria-label="Delete ${esc(p.name)}" title="Delete">${icon("trash", 18)}</button>` : ""}
        </div>`).join("")}</div>
    </div>

    <div class="grid grid-2 section">
      <div class="card">
        <div class="card-head"><h2>Add a profile</h2></div>
        <label class="field"><span class="field-label">Name</span><input class="input" id="np-name" maxlength="30" placeholder="e.g. Minh"></label>
        <label class="field"><span class="field-label">Password (at least 4 characters, optional here)</span><input class="input" id="np-pin" type="password" maxlength="40" autocomplete="new-password"></label>
        <label class="check-chip" style="margin-top:6px"><input type="checkbox" id="np-hide" checked> Hide Practice and Mock exams</label>
        <div class="form-actions"><button class="btn btn-primary" id="btn-np">${icon("plus", 18)} Create profile</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>PIN for ${esc(cur.name)}</h2></div>
        <p class="text-2 small">A PIN stops others on this device from opening your profile by accident. It is a simple lock, not strong security — anyone with access to the browser's storage could still read the data.</p>
        <div class="row-gap" style="margin-top:14px">
          <button class="btn btn-secondary" id="btn-setpin">${cur.pinHash ? "Change PIN" : "Set PIN"}</button>
          ${cur.pinHash ? `<button class="btn btn-ghost" id="btn-rmpin">Remove PIN</button>` : ""}
        </div>
      </div>
    </div>

    <div class="callout info section">${icon("alert", 18)}<div>Profiles live in this browser only. To use a profile on another device, export a backup in Settings and import it there into a profile. Online accounts with automatic sync need the Firebase setup.</div></div>`;

  view.querySelectorAll("[data-switch]").forEach(b => b.onclick = () => goToProfile(b.dataset.switch));
  document.getElementById("btn-signout").onclick = signOut;

  view.querySelectorAll("[data-hidetests]").forEach(b => b.onclick = () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.hidetests);
    p.hideTests = !p.hideTests; saveProfiles(); renderProfiles(); refreshShell();
    toast(p.hideTests ? `Practice and Mock exams hidden for ${p.name}` : `Practice and Mock exams shown for ${p.name}`);
  });

  view.querySelectorAll("[data-rename]").forEach(b => b.onclick = async () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.rename);
    const name = await promptDialog({ title: "Rename profile", label: "Name", value: p.name, maxlength: 30, confirmText: "Save", validate: v => v ? "" : "Name can't be empty" });
    if (name === null) return;
    p.name = name; saveProfiles(); renderProfiles(); refreshShell(); toast("Profile renamed");
  });

  view.querySelectorAll("[data-delprof]").forEach(b => b.onclick = async () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.delprof);
    if (p.pinHash && !(await askPinFor(p))) return;
    if (!await confirmDialog({ title: `Delete ${p.name}?`, message: "All progress, questions, flashcards and mock history in this profile will be erased from this device. Export a backup first if needed.", confirmText: "Delete profile", danger: true, requireText: "DELETE" })) return;
    deleteProfile(p.id); applyTheme(); renderProfiles(); refreshShell(); toast("Profile deleted");
  });

  document.getElementById("btn-np").onclick = async () => {
    const nameEl = document.getElementById("np-name"), pinEl = document.getElementById("np-pin");
    const name = nameEl.value.trim(), pin = pinEl.value.trim();
    nameEl.classList.toggle("invalid", !name);
    if (!name) { toast("Enter a name", "error"); return; }
    if (pin && PIN_RULE(pin)) { pinEl.classList.add("invalid"); toast(PIN_RULE(pin), "error"); return; }
    const id = createProfile(name, pin ? await hashPin(pin) : null, document.getElementById("np-hide").checked);
    switchProfile(id); markUnlocked(id); applyTheme();
    toast(`Profile ${name} created`);
    location.hash = "#/dashboard"; router();
  };

  document.getElementById("btn-setpin").onclick = async () => {
    if (cur.pinHash && !(await askPinFor(cur))) return;
    const pin = await promptDialog({ title: "Set a password", label: "New password", type: "password", inputmode: "text", maxlength: 40, confirmText: "Save", validate: PIN_RULE });
    if (pin === null) return;
    cur.pinHash = await hashPin(pin); saveProfiles(); markUnlocked(cur.id); renderProfiles(); toast("PIN saved");
  };
  const rm = document.getElementById("btn-rmpin");
  if (rm) rm.onclick = async () => {
    if (!(await askPinFor(cur))) return;
    cur.pinHash = null; saveProfiles(); renderProfiles(); toast("PIN removed");
  };
}

// ---------- Lock screen ----------
// ================= ACCESS GATE (sign in / create account) =================
const INVITE_FROM_LINK = (() => {
  try {
    const u = new URL(location.href), c = u.searchParams.get("invite");
    if (c) { u.searchParams.delete("invite"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    return c || "";
  } catch (e) { return ""; }
})();
const normInvite = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function hashInvite(v) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cfa-invite:" + normInvite(v)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const hasStoredData = id => { try { return localStorage.getItem(profileKey(id)) !== null; } catch (e) { return false; } };
const gateAccounts = () => PROFILES.list.filter(p => p.pinHash || hasStoredData(p.id));
const isPhantom = p => !p.pinHash && !hasStoredData(p.id) && PROFILES.list.length === 1;
function gateNeeded() { const p = activeProfile(); return !(p.pinHash && isUnlocked(p.id)); }
const gate = { tab: null, sel: null, fails: 0, until: 0, err: "" };

function signOut() {
  try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ }
  if (typeof lockOwner === "function") lockOwner();
  location.hash = "#/dashboard"; router();
}

function gateWait() { return Math.max(0, Math.ceil((gate.until - Date.now()) / 1000)); }
function gateFail() { gate.fails++; if (gate.fails >= 5) { gate.until = Date.now() + 30000; gate.fails = 0; } }

async function gateEnter(id) {
  if (PROFILES.active !== id) switchProfile(id);
  markUnlocked(id); applyTheme();
  document.body.classList.remove("gated");
  gate.err = ""; gate.tab = null;
  location.hash = "#/dashboard"; router(); refreshShell();
}

function renderGate() {
  document.body.classList.add("gated");
  const accts = gateAccounts(), needCode = !!(typeof ACCESS !== "undefined" && ACCESS.inviteHash);
  if (!accts.length) gate.tab = "create"; else if (!gate.tab) gate.tab = INVITE_FROM_LINK ? "create" : "signin";
  if (!gate.sel || !accts.some(p => p.id === gate.sel)) gate.sel = (accts.find(p => p.id === PROFILES.active) || accts[0] || {}).id;
  const sel = accts.find(p => p.id === gate.sel);
  const noPw = sel && !sel.pinHash;

  view.innerHTML = `
    <div class="gate">
      <div class="gate-brand"><div class="brand-mark">L1</div><div><div class="brand-name">CFA Study</div><div class="brand-sub">Level I · May 2027</div></div></div>
      <div class="card gate-card">
        ${accts.length ? `<div class="tabs"><button class="tab ${gate.tab === "signin" ? "active" : ""}" data-gtab="signin">Sign in</button><button class="tab ${gate.tab === "create" ? "active" : ""}" data-gtab="create">Create account</button></div>` : `<h1 style="margin-bottom:4px">Welcome</h1><p class="text-2" style="margin-bottom:14px">Create your account to start studying.</p>`}
        ${gate.err ? `<div class="callout danger" style="margin-bottom:12px">${icon("alert", 18)}<div>${esc(gate.err)}</div></div>` : ""}
        ${gate.tab === "signin" ? `
          <p class="sm-cap">Who is studying?</p>
          <div class="gate-accts">${accts.map(a => `<button class="gate-acct ${a.id === gate.sel ? "on" : ""}" data-gsel="${a.id}">${avatarHtml(a, 32)}<span>${esc(a.name)}</span></button>`).join("")}</div>
          <label class="field" style="margin-top:14px"><span class="field-label">${noPw ? `This profile has no password yet — create one for ${esc(sel.name)}` : "Password"}</span>
            <input class="input" id="g-pw" type="password" maxlength="40" autocomplete="${noPw ? "new-password" : "current-password"}"></label>
          ${noPw ? `<label class="field"><span class="field-label">Repeat password</span><input class="input" id="g-pw2" type="password" maxlength="40" autocomplete="new-password"></label>` : ""}
          <button class="btn btn-primary btn-lg btn-block" id="g-go">${noPw ? "Set password & enter" : "Sign in"}</button>`
        : `
          <label class="field"><span class="field-label">Your name</span><input class="input" id="g-name" maxlength="30" autocomplete="nickname" placeholder="e.g. Minh"></label>
          <label class="field"><span class="field-label">Password (at least 4 characters)</span><input class="input" id="g-pw" type="password" maxlength="40" autocomplete="new-password"></label>
          <label class="field"><span class="field-label">Repeat password</span><input class="input" id="g-pw2" type="password" maxlength="40" autocomplete="new-password"></label>
          ${needCode ? `<label class="field"><span class="field-label">Invitation code</span><input class="input" id="g-code" maxlength="30" autocomplete="off" autocapitalize="characters" value="${esc(INVITE_FROM_LINK)}" placeholder="CFA-XXXX-XXXX-XXXX"></label>` : ""}
          <label class="check-chip" style="margin:4px 0 14px"><input type="checkbox" id="g-hide" checked> Hide Practice and Mock exams</label>
          <button class="btn btn-primary btn-lg btn-block" id="g-go">Create account & start</button>`}
        <p class="text-3 small" style="margin-top:14px">Accounts are stored on this device. Your progress stays in this browser; use Settings → Backup to move it to another device.</p>
      </div>
    </div>`;

  view.querySelectorAll("[data-gtab]").forEach(b => b.onclick = () => { gate.tab = b.dataset.gtab; gate.err = ""; renderGate(); });
  view.querySelectorAll("[data-gsel]").forEach(b => b.onclick = () => { gate.sel = b.dataset.gsel; gate.err = ""; renderGate(); });
  const go = document.getElementById("g-go");
  view.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); }));
  const fail = msg => { gate.err = msg; renderGate(); };

  go.onclick = async () => {
    if (gateWait()) return fail(`Too many attempts. Try again in ${gateWait()} seconds.`);
    const pw = document.getElementById("g-pw").value;
    if (gate.tab === "signin") {
      if (noPw) {
        if (PIN_RULE(pw)) return fail(PIN_RULE(pw));
        if (pw !== document.getElementById("g-pw2").value) return fail("The two passwords do not match.");
        sel.pinHash = await hashPin(pw); saveProfiles(); return gateEnter(sel.id);
      }
      if (await hashPin(pw) !== sel.pinHash) { gateFail(); return fail(gateWait() ? `Too many attempts. Try again in ${gateWait()} seconds.` : "Wrong password."); }
      return gateEnter(sel.id);
    }
    // create account
    const name = document.getElementById("g-name").value.trim();
    if (!name) return fail("Enter your name.");
    if (accts.some(a => a.name.toLowerCase() === name.toLowerCase())) return fail("That name is already used on this device. Choose another or sign in.");
    if (PIN_RULE(pw)) return fail(PIN_RULE(pw));
    if (pw !== document.getElementById("g-pw2").value) return fail("The two passwords do not match.");
    if (needCode) {
      const code = document.getElementById("g-code").value;
      if (await hashInvite(code) !== ACCESS.inviteHash) { gateFail(); return fail(gateWait() ? `Too many attempts. Try again in ${gateWait()} seconds.` : "The invitation code is not valid. Ask the course owner for it."); }
    }
    const hide = document.getElementById("g-hide").checked, ph = await hashPin(pw);
    let id;
    const first = PROFILES.list[0];
    if (isPhantom(first)) { first.name = name; first.pinHash = ph; first.hideTests = hide; first.createdAt = todayStr(); id = first.id; saveProfiles(); saveData(); }
    else id = createProfile(name, ph, hide);
    toast(`Welcome, ${name}!`);
    gateEnter(id);
  };
}
async function goToProfile(id) {
  const p = PROFILES.list.find(x => x.id === id);
  if (!p) return;
  if (p.pinHash && !(await askPinFor(p))) return;
  switchProfile(id);
  markUnlocked(id);
  applyTheme();
  toast(`Switched to ${p.name}`);
  location.hash = "#/dashboard";
  router();
}

function profileSummary(id) {
  try {
    const d = id === PROFILES.active ? DATA : JSON.parse(localStorage.getItem(profileKey(id)) || "{}");
    const qs = (d.questions || []).filter(q => (q.attempts || []).length).length;
    return `${qs} questions practised · ${(d.mocks || []).length} mock(s)`;
  } catch (e) { return ""; }
}

function renderProfiles() {
  const cur = activeProfile();
  view.innerHTML = `
    ${pageHeader("Profiles", "Each person gets separate progress, questions, flashcards and mock history on this device")}
    <div class="card">
      <div class="list">${PROFILES.list.map(p => `
        <div class="list-item">
          ${avatarHtml(p, 40)}
          <div class="list-main">
            <div class="list-title">${esc(p.name)} ${p.id === cur.id ? '<span class="badge badge-success">Active</span>' : ""} ${p.pinHash ? '<span class="badge">PIN</span>' : ""} ${p.hideTests ? '<span class="badge">Practice &amp; Mock hidden</span>' : ""}</div>
            <div class="list-meta">${profileSummary(p.id)}</div>
          </div>
          ${p.id === cur.id ? "" : `<button class="btn btn-primary btn-sm" data-switch="${p.id}">Switch</button>`}
          ${isOwner() ? `<button class="btn btn-ghost btn-sm" data-hidetests="${p.id}">${p.hideTests ? "Show Practice &amp; Mock" : "Hide Practice &amp; Mock"}</button>` : ""}
          <button class="icon-btn" data-rename="${p.id}" aria-label="Rename ${esc(p.name)}" title="Rename">${icon("settings", 18)}</button>
          ${PROFILES.list.length > 1 && isOwner() ? `<button class="icon-btn danger" data-delprof="${p.id}" aria-label="Delete ${esc(p.name)}" title="Delete">${icon("trash", 18)}</button>` : ""}
        </div>`).join("")}</div>
    </div>

    <div class="grid grid-2 section">
      <div class="card">
        <div class="card-head"><h2>Add a profile</h2></div>
        <label class="field"><span class="field-label">Name</span><input class="input" id="np-name" maxlength="30" placeholder="e.g. Minh"></label>
        <label class="field"><span class="field-label">Password (at least 4 characters, optional here)</span><input class="input" id="np-pin" type="password" maxlength="40" autocomplete="new-password"></label>
        <label class="check-chip" style="margin-top:6px"><input type="checkbox" id="np-hide" checked> Hide Practice and Mock exams</label>
        <div class="form-actions"><button class="btn btn-primary" id="btn-np">${icon("plus", 18)} Create profile</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>PIN for ${esc(cur.name)}</h2></div>
        <p class="text-2 small">A PIN stops others on this device from opening your profile by accident. It is a simple lock, not strong security — anyone with access to the browser's storage could still read the data.</p>
        <div class="row-gap" style="margin-top:14px">
          <button class="btn btn-secondary" id="btn-setpin">${cur.pinHash ? "Change PIN" : "Set PIN"}</button>
          ${cur.pinHash ? `<button class="btn btn-ghost" id="btn-rmpin">Remove PIN</button>` : ""}
        </div>
      </div>
    </div>

    <div class="callout info section">${icon("alert", 18)}<div>Profiles live in this browser only. To use a profile on another device, export a backup in Settings and import it there into a profile. Online accounts with automatic sync need the Firebase setup.</div></div>`;

  view.querySelectorAll("[data-switch]").forEach(b => b.onclick = () => goToProfile(b.dataset.switch));

  view.querySelectorAll("[data-hidetests]").forEach(b => b.onclick = () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.hidetests);
    p.hideTests = !p.hideTests; saveProfiles(); renderProfiles(); refreshShell();
    toast(p.hideTests ? `Practice and Mock exams hidden for ${p.name}` : `Practice and Mock exams shown for ${p.name}`);
  });

  view.querySelectorAll("[data-rename]").forEach(b => b.onclick = async () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.rename);
    const name = await promptDialog({ title: "Rename profile", label: "Name", value: p.name, maxlength: 30, confirmText: "Save", validate: v => v ? "" : "Name can't be empty" });
    if (name === null) return;
    p.name = name; saveProfiles(); renderProfiles(); refreshShell(); toast("Profile renamed");
  });

  view.querySelectorAll("[data-delprof]").forEach(b => b.onclick = async () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.delprof);
    if (p.pinHash && !(await askPinFor(p))) return;
    if (!await confirmDialog({ title: `Delete ${p.name}?`, message: "All progress, questions, flashcards and mock history in this profile will be erased from this device. Export a backup first if needed.", confirmText: "Delete profile", danger: true, requireText: "DELETE" })) return;
    deleteProfile(p.id); applyTheme(); renderProfiles(); refreshShell(); toast("Profile deleted");
  });

  document.getElementById("btn-np").onclick = async () => {
    const nameEl = document.getElementById("np-name"), pinEl = document.getElementById("np-pin");
    const name = nameEl.value.trim(), pin = pinEl.value.trim();
    nameEl.classList.toggle("invalid", !name);
    if (!name) { toast("Enter a name", "error"); return; }
    if (pin && PIN_RULE(pin)) { pinEl.classList.add("invalid"); toast(PIN_RULE(pin), "error"); return; }
    const id = createProfile(name, pin ? await hashPin(pin) : null, document.getElementById("np-hide").checked);
    switchProfile(id); markUnlocked(id); applyTheme();
    toast(`Profile ${name} created`);
    location.hash = "#/dashboard"; router();
  };

  document.getElementById("btn-setpin").onclick = async () => {
    if (cur.pinHash && !(await askPinFor(cur))) return;
    const pin = await promptDialog({ title: "Set a password", label: "New password", type: "password", inputmode: "text", maxlength: 40, confirmText: "Save", validate: PIN_RULE });
    if (pin === null) return;
    cur.pinHash = await hashPin(pin); saveProfiles(); markUnlocked(cur.id); renderProfiles(); toast("PIN saved");
  };
  const rm = document.getElementById("btn-rmpin");
  if (rm) rm.onclick = async () => {
    if (!(await askPinFor(cur))) return;
    cur.pinHash = null; saveProfiles(); renderProfiles(); toast("PIN removed");
  };
}

// ---------- Lock screen ----------
function renderLock() {
  const p = activeProfile();
  const others = PROFILES.list.filter(x => x.id !== p.id);
  view.innerHTML = `
    <div class="card lock-screen">
      ${avatarHtml(p, 64)}
      <h1>${esc(p.name)}</h1>
      <p class="text-2" style="margin-top:6px">This profile is locked.</p>
      <button class="btn btn-primary btn-lg" id="btn-unlock" style="margin-top:20px">Enter PIN</button>
      ${others.length ? `<div class="section-title section">Other profiles</div>
        <div class="row-gap" style="justify-content:center">${others.map(o => `<button class="btn btn-secondary btn-sm" data-switch="${o.id}">${avatarHtml(o, 20)} ${esc(o.name)}</button>`).join("")}</div>` : ""}
    </div>`;
  document.getElementById("btn-unlock").onclick = async () => {
    if (await askPinFor(p)) { markUnlocked(p.id); router(); }
  };
  view.querySelectorAll("[data-switch]").forEach(b => b.onclick = () => goToProfile(b.dataset.switch));
}


// ================= VERSION CHECK =================
// Phones often keep old copies of the site. The page version comes from the ?v= on this script;
// version.json (never cached) holds the newest version. If they differ, offer a one-tap update.
const APP_VERSION = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || "dev"; } catch (e) { return "dev"; } })();

function reloadLatest() {
  const go = () => location.replace(location.pathname + "?u=" + Date.now() + location.hash);
  try {
    if ("caches" in window) caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(go, go); else go();
  } catch (e) { go(); }
}

async function latestVersion() {
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    return (await r.json()).v || null;
  } catch (e) { return null; }
}

function showUpdateBanner(v) {
  if (document.getElementById("update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "update-bar"; bar.setAttribute("role", "status");
  bar.innerHTML = `<span>A newer version of the site is available.</span><button class="btn btn-sm" id="update-now">Update now</button>`;
  document.body.appendChild(bar);
  document.getElementById("update-now").onclick = reloadLatest;
}

async function checkForUpdate(manual) {
  const v = await latestVersion();
  if (v && v !== APP_VERSION) showUpdateBanner(v);
  else if (manual) toast(v ? "You already have the latest version" : "Could not check for updates (offline?)", v ? "success" : "error");
  return v;
}
checkForUpdate(false);

(() => { const b = document.getElementById("side-version"); if (b) { b.textContent = "v" + APP_VERSION; b.onclick = () => checkForUpdate(true); } })();

// ================= START =================
// (runs last so every const above — gate, profiles, version — is already defined)
window.addEventListener("hashchange", router);
applyTheme();
router();

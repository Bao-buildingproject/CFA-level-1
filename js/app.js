// ============================================================
// app.js — navigation shell, router, dashboard, settings
// ============================================================

const view = document.getElementById("view");

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard", icon: "home", group: "Plan" },
  { route: "study", label: "Study plan", icon: "calendar", group: "Plan" },
  { route: "analysis", label: "Weak spots", icon: "pulse", group: "Plan" },
  { route: "schweser", label: "SchweserNotes", icon: "book", group: "Learn" },
  { route: "curriculum", label: "Curriculum", icon: "layers", group: "Learn" },
  { route: "cards", label: "Flashcards", icon: "cards", group: "Learn" },
  { route: "dist", label: "Distributions", icon: "curve", group: "Learn" },
  { route: "trade", label: "Giả lập chứng khoán", icon: "trend", group: "Learn" },
  { route: "game", label: "Game", icon: "target", group: "Learn" },
  { route: "practice", label: "Practice", icon: "check", group: "Test" },
  { route: "qbank", label: "Question Bank", icon: "flag", group: "Test" },
  { route: "mock", label: "Mock exams", icon: "clock", group: "Test" },
  { route: "settings", label: "Settings", icon: "settings", group: "" }
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
  const active = route === "topic" || route === "module" ? "study" : route;
  const { daysLeft, week, phase } = countdownInfo();

  let group = null;
  document.getElementById("side-nav").innerHTML = navItems().map(n => {
    const b = navBadge(n.route);
    const head = n.group !== group ? (group = n.group, n.group ? `<div class="nav-label">${n.group}</div>` : `<div class="nav-sep"></div>`) : "";
    return `${head}<a class="nav-link ${active === n.route ? "active" : ""}" href="#/${n.route}" ${active === n.route ? 'aria-current="page"' : ""}>
      ${icon(n.icon, 19)}<span>${n.label}</span>${b ? `<span class="nav-badge">${b}</span><i class="dot"></i>` : ""}</a>`;
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
  document.getElementById("profile-chip").innerHTML = `${avatarHtml(prof, 32)}<span class="pc-text"><span class="pc-name">${esc(prof.name)}</span><span class="pc-sub">${PROFILES.list.length > 1 && isOwner() ? "Switch profile" : "Account"}</span></span>`;
  document.getElementById("mobile-profile").innerHTML = avatarHtml(prof, 30);
  document.getElementById("side-days").innerHTML = daysLeft >= 0 ? `${daysLeft}<small>days</small>` : "Exam day";
  document.getElementById("side-week").textContent = week >= 1 ? `Week ${Math.min(week, 25)} of 25 · ${phase.replace(/^Phase \d · /, "")}` : phase;
  document.getElementById("mobile-days").textContent = daysLeft >= 0 ? `${daysLeft} days` : "";
  // Brand logo and the engraved ribbon behind the countdown are drawn once
  document.querySelectorAll(".brand-mark:empty").forEach((el, i) => { el.innerHTML = gateLogoSvg(40, "bl" + i); });
  const foot = document.querySelector(".sidebar-foot");
  if (foot && !foot.querySelector(".wave-band")) foot.insertAdjacentHTML("afterbegin", waveBand({ width: 240, height: 70, lines: 9, waves: 3, stroke: 0.7 }));
}

// ================= DASHBOARD =================
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
// Vietnamese full names end with the given name: "Nguyễn Ngô Gia Bảo" → "Bảo"
function callName() {
  const n = (activeProfile().name || "").trim();
  return !n || n === "Me" ? "" : n.split(/\s+/).pop();
}
// First module of the current topic that is not done yet
function nextModuleInfo() {
  const t = currentTopic();
  if (!t) return null;
  const m = modulesOf(t.id).find(x => !["done", "reviewed"].includes((chapterOf(x.id) || {}).status));
  return m ? { m, t } : null;
}
// Average module completion over the whole syllabus, and the same weighted by 2027 exam weight
function syllabusCompletion() {
  const byTopic = TOPICS.map(t => ({ t, tp: topicModuleProgress(t.id), share: weightShare(t) }));
  const plain = Math.round(byTopic.reduce((s, x) => s + x.tp.pct * x.tp.modules, 0) / Math.max(1, MODULES.length));
  const wsum = byTopic.reduce((s, x) => s + x.share, 0);
  const weighted = Math.round(byTopic.reduce((s, x) => s + x.tp.pct * x.share, 0) / Math.max(1, wsum));
  return { plain, weighted, byTopic };
}
function qbRedoTotal() {
  return TOPICS.reduce((s, t) => s + (QBANK_FILES[t.id] || []).filter(f => !qbSkipped(f[2])).reduce((x, f) => x + qbStats(f[2]).redo.length, 0), 0);
}

// Exam-weight allocation: width = weight, fill = completion
function allocationHtml(byTopic) {
  return `<div class="alloc" role="img" aria-label="Exam weight of each topic, filled by how much of it you have completed">${byTopic.map(({ t, tp, share }) => `
    <a class="alloc-seg" href="#/topic/${t.id}" style="flex:${share}" data-tip="${esc(`${t.name}\nExam weight ${t.weight}\n${tp.pct}% complete`)}">
      <span class="alloc-bar"><span class="alloc-fill" style="height:${tp.pct}%"></span></span><span class="alloc-code">${t.id}</span></a>`).join("")}</div>`;
}

// The ten topics as a ledger: code · topic · module strip · weight · accuracy · completion
function topicLedgerHtml(opts = {}) {
  const WK = weakStats(), exp = expectedTopic();
  let weekEnd = 0;
  const chev = icon("chevron", 16).replace('class="icon"', 'class="icon chev"');
  const rows = TOPICS.map((t, i) => {
    const tp = topicModuleProgress(t.id), ws = WK.topic[t.id];
    const mods = modulesOf(t.id);
    const reads = mods.filter(m => { const r = DATA.reading[m.id] || {}; return r.schweser || r.curriculum; }).length;
    const from = weekEnd + 1; weekEnd += t.plannedWeeks;
    const now = exp && exp.id === t.id;
    const acc = ws.pct === null ? `<span class="acc acc-none">—</span>` : `<span class="acc acc-${ws.status}">${ws.pct}%</span>`;
    const wa = Math.ceil(from), wb = Math.ceil(weekEnd);
    const sub = [`${tp.done}/${tp.modules} done`, `${reads}/${tp.modules} read`, opts.weeks ? (wa === wb ? `week ${wa}` : `weeks ${wa}–${wb}`) : ""].filter(Boolean).join(" · ");
    return `<a class="lg-row${now ? " now" : ""}" href="#/topic/${t.id}" style="--i:${i}">
      <span class="lg-code">${t.id}</span>
      <span class="lg-main"><span class="lg-name">${t.name}${now ? ` <span class="badge badge-application">This week</span>` : ""}</span><span class="lg-sub">${sub}</span></span>
      ${statusStrip(t.id)}
      <span class="lg-weight r">${t.weight}</span>
      <span class="lg-acc r">${acc}</span>
      <span class="lg-pct r">${tp.pct}%</span>
      <span class="lg-sub-m"><span>Weight ${t.weight}</span><span>${ws.pct === null ? "No answers yet" : `${acc} accuracy`}</span></span>
      ${chev}
    </a>`;
  }).join("");
  return `<div class="ledger">
    <div class="lg-head"><span>Code</span><span>Topic</span><span>Modules</span><span class="r">Weight</span><span class="r">Accuracy</span><span class="r">Complete</span><span></span></div>
    ${rows}</div>`;
}

let ROUTE_ENTER = false;   // true while the router draws a page it has just navigated to

function renderDashboard() {
  const { daysLeft, week, phase } = countdownInfo();
  const all = overallProgress();
  const pace = paceStatus();
  const queue = todayQueue().length;
  const qs = quizStats();
  const log = DATA.dailyLog[todayStr()] || {};
  const lastMock = DATA.mocks[DATA.mocks.length - 1];
  const tests = !testsHidden();
  const WK = weakStats();
  const tot = Object.values(WK.topic).reduce((a, x) => ({ answered: a.answered + x.answered, right: a.right + x.right }), { answered: 0, right: 0 });
  const redo = qbRedoTotal();
  const syl = syllabusCompletion();
  const nx = nextModuleInfo();
  const name = callName();
  const days = Math.max(daysLeft, 0);
  const wk = Math.min(Math.max(week, 0), 25);
  const now = new Date();

  const agenda = [
    { ic: "cards", href: "#/cards", label: "Flashcards due", sub: `${log.cardsReviewed || 0} reviewed today`, val: queue, hot: queue > 0 },
    tests && { ic: "alert", href: "#/practice", label: "Mistakes to redo", sub: `${log.questionsDone || 0} questions answered today`, val: qs.mistakes, hot: qs.mistakes > 0 },
    { ic: "flag", href: "#/qbank", label: "Question Bank to redo", sub: "Wrong or guessed answers", val: redo, hot: redo > 0 },
    { ic: "pulse", href: "#/analysis", label: "Overall accuracy", sub: `${tot.answered} answers so far`, val: tot.answered ? pct(tot.right, tot.answered) + "%" : "—" },
    tests && { ic: "clock", href: lastMock ? `#/mock/result/${lastMock.id}` : "#/mock", label: "Last mock exam", sub: lastMock ? prettyDate(lastMock.date) : "No mock yet", val: lastMock ? pct(lastMock.correct, lastMock.total) + "%" : "—" }
  ].filter(Boolean);

  const mp = nx ? moduleProgress(nx.m.id) : null;
  const nextUp = nx ? `
      <div class="kicker">Next module</div>
      <div class="nu-code">${nx.m.id} · ${moduleLabel(nx.m)}</div>
      <h2 class="nu-title">${esc(nx.m.title)}</h2>
      <p class="nu-meta">${nx.t.name} · module ${nx.m.n} of ${modulesOf(nx.t.id).length}</p>
      <div class="nu-meter">
        <div class="nu-meter-head"><span>Module completion</span><strong>${mp.pct}%</strong></div>
        ${meterHtml(mp, { labels: true, tip: moduleTip(nx.m, mp) })}
      </div>
      <div class="pace ${pace.tone}"><div>${pace.text}</div></div>
      <div class="nu-actions">
        <a class="btn btn-primary" href="#/module/${nx.m.id}">Open module ${icon("next", 16).replace('class="icon"', 'class="icon icon-next"')}</a>
        <a class="btn btn-secondary" href="#/topic/${nx.t.id}">All ${nx.t.id} modules</a>
      </div>`
    : `
      <div class="kicker">Up next</div>
      <h2 class="nu-title">Every module is marked done.</h2>
      <p class="nu-meta">Now review each topic and sit full mock exams.</p>
      <div class="pace ${pace.tone}"><div>${pace.text}</div></div>
      <div class="nu-actions"><a class="btn btn-primary" href="#/analysis">Open weak spots ${icon("next", 16).replace('class="icon"', 'class="icon icon-next"')}</a></div>`;

  view.innerHTML = `
    <header class="greet">
      <div class="kicker">${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <h1>${greeting()}${name ? `, <em>${esc(name)}.</em>` : "."}</h1>
    </header>

    <section class="cert" aria-label="Exam countdown">
      ${waveBand({ width: 900, height: 40, lines: 9, waves: 9 })}
      <div class="kicker cert-kick">CFA Level I · exam ${prettyDate(DATA.settings.examDate)}</div>
      <div class="cert-main">
        <div class="cert-days"><span class="cert-num" id="cert-num">${days}</span><span class="cert-unit">days <br>to the exam</span></div>
      </div>
      <div class="cert-meta">
        <span>${wk >= 1 ? `<strong>Week ${wk}</strong> of 25` : `Starts <strong>${prettyDate(DATA.settings.startDate)}</strong>`}</span>
        <span>${phase}</span>
        <span><strong>${all.done}</strong> of ${all.total} modules done</span>
      </div>
      <div class="cert-seal">${rosette(syl.plain, { label: `${syl.plain}% of the syllabus complete` })}
        <div class="cert-seal-label"><strong>${syl.plain}%</strong><span>Syllabus</span></div></div>
      <div class="cert-time">${phaseTimeline(wk)}</div>
    </section>

    ${DATA.activeMock && tests ? `<div class="callout warning section">${icon("clock", 18)}<div style="flex:1"><strong>${esc(DATA.activeMock.name)}</strong> is in progress.</div><a class="btn btn-primary btn-sm" href="#/mock/run">Resume</a></div>` : ""}

    <div class="today">
      <article class="card next-up">${nextUp}</article>
      <section class="card agenda" aria-label="Today">
        <div class="agenda-head"><h2>Today</h2><span class="kicker">${now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span></div>
        ${agenda.map(r => `
          <a class="ag-row" href="${r.href}">
            <span class="ag-ico${r.hot ? " hot" : ""}">${icon(r.ic, 16)}</span>
            <span><span class="ag-label">${r.label}</span><br><span class="ag-sub">${r.sub}</span></span>
            <span class="ag-val${r.val === 0 || r.val === "—" ? " muted" : ""}">${r.val}</span>
          </a>`).join("")}
      </section>
    </div>

    <div class="syl-head">
      <div>
        <div class="kicker">The syllabus</div>
        <h2>Ten topics, weighted for 2027</h2>
        <p>Each block is as wide as the topic's exam weight and fills up as you complete it. Tap a topic to open its modules.</p>
      </div>
      <div class="syl-weighted"><strong>${syl.weighted}%</strong><span>Weighted by exam weight</span></div>
    </div>
    ${allocationHtml(syl.byTopic)}
    ${topicLedgerHtml()}
    <div class="ledger-foot">${STRIP_LEGEND}<a href="#/study" class="small" style="font-weight:600">Open the study plan →</a></div>

    <div class="slips">
      <div class="card slip slip-wide">
        <div class="slip-ico">${icon("external", 19)}</div>
        <div class="slip-text"><h2>CFA Learning Ecosystem</h2>
          <p class="text-2 small">Official practice questions. Log your scores and missed questions on each topic page.</p></div>
        <a class="btn btn-secondary btn-sm" href="${LES_URL}" target="_blank" rel="noopener">Open CFA Practice</a>
      </div>
    </div>`;

  if (ROUTE_ENTER) countDown(document.getElementById("cert-num"), days);
}

// The day count rolls down to today's value — a countdown that visibly ticks
function countDown(el, to) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = to + Math.min(60, Math.max(12, Math.round(to * 0.25))), t0 = performance.now(), dur = 1100;
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from - (from - to) * e);
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  el.textContent = from; requestAnimationFrame(step);
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
  trade: (sub, sym) => renderTrade(sub, sym),
  game: renderGame,
  profiles: renderProfiles
};

// ================= MORE (mobile menu) =================
function renderMore() {
  const items = [
    ["schweser", "book", "SchweserNotes", "4 books · reading checklist"],
    ["curriculum", "layers", "Curriculum", "102 learning modules · 10 volumes"],
    ["qbank", "flag", "Question Bank", "Your question sets · answer them here"],
    ["analysis", "pulse", "Weak spots", "Accuracy by topic and module"],
    ["dist", "curve", "Distributions", "Normal, t, chi-square, lognormal · z-table"],
    ["trade", "trend", "Giả lập chứng khoán", "Tiền ảo · giá thật cổ phiếu Việt Nam"],
    ["game", "target", "Game", "Financial World · đang xây dựng"],
    ["cards", "cards", "Flashcards", `${todayQueue().length} to review today`],
    ["profiles", "user", "Account", activeProfile().name],
    ["settings", "settings", "Settings", "Backup, exam date, theme"],
    ["signout", "logout", "Log out", "Sign out of this device"]
  ];
  view.innerHTML = `${pageHeader("More", "Everything else in your study kit")}
    <div class="card"><div class="list more-list">${items.map(([r, ic, label, sub]) => `
      <a class="list-item" href="#/${r}"><span class="more-ico">${icon(ic, 18)}</span>
        <div class="list-main"><div class="list-title">${label}</div><div class="list-meta">${esc(sub)}</div></div>${icon("chevron", 18)}</a>`).join("")}</div></div>
    <p class="text-3 small section">Site version <span class="mono">${APP_VERSION}</span> · <button class="btn btn-ghost btn-sm" id="btn-update">Check for updates</button></p>`;
  document.getElementById("btn-update").onclick = () => checkForUpdate(true);
}

function router() {
  if (isLocked()) { renderGate(); return; }
  document.body.classList.remove("gated");
  stopMockTimer();
  if (typeof tradeStop === "function") tradeStop();   // price refresh of the stock simulator
  session = null;   // leave any flashcard session
  quiz = null;      // leave any practice session
  const [route, a, b, c] = currentRoute();
  // Practice and the Mock exams page can be hidden; a mock started from the Question Bank still runs
  if (testsHidden() && TEST_ROUTES.includes(route) && !(route === "mock" && (a === "run" || a === "result"))) { location.hash = "#/dashboard"; return; }
  ROUTE_ENTER = true;
  try { (ROUTES[route] || renderDashboard)(a, b, c); } finally { ROUTE_ENTER = false; }
  refreshShell();
  if (typeof tutorRoute === "function") tutorRoute();   // CFA Tutor button (off during a timed mock)
  window.scrollTo(0, 0);
  const mainEl = document.getElementById("main");
  if (mainEl) { mainEl.classList.remove("enter"); void mainEl.offsetWidth; mainEl.classList.add("enter"); }
}



// ================= PROFILES (#/profiles) =================
const UNLOCK_KEY = "cfaStudy_unlocked";
// "Remember me": stay signed in on this device for 30 days (otherwise until the tab is closed)
const REMEMBER_KEY = "cfaStudy_remember", REMEMBER_DAYS = 30;
function rememberedId() {
  try {
    const r = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
    if (r && r.id && r.until > Date.now()) return r.id;
    if (r) localStorage.removeItem(REMEMBER_KEY);
  } catch (e) { /* ignore */ }
  return null;
}
function setRemember(id, on) {
  try {
    localStorage.setItem("cfaStudy_rememberPref", on ? "1" : "0");
    if (on) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ id, until: Date.now() + REMEMBER_DAYS * 86400000 }));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch (e) { /* ignore */ }
}
const rememberPref = () => { try { return localStorage.getItem("cfaStudy_rememberPref") === "1"; } catch (e) { return false; } };
function isUnlocked(id) {
  try {
    if (sessionStorage.getItem(UNLOCK_KEY) === id) return true;
    if (rememberedId() === id) { sessionStorage.setItem(UNLOCK_KEY, id); return true; }
  } catch (e) { /* ignore */ }
  return false;
}
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
  const cur = activeProfile(), owner = isOwner();
  const syl = syllabusCompletion();
  const account = `
    <div class="member">
      ${rosette(syl.plain, { decorative: true, micro: "CFA STUDY · LEVEL I · " })}
      <div class="kicker">CFA Study · Level I candidate</div>
      <div class="member-name">${esc(cur.name)}</div>
      <div class="member-sub">Logged in on this device · ${syl.plain}% of the syllabus complete</div>
      <div class="member-row">
        <dl><div><dt>Member since</dt><dd>${cur.createdAt ? prettyDate(cur.createdAt) : "—"}</dd></div><div><dt>Exam</dt><dd>${prettyDate(DATA.settings.examDate)}</dd></div></dl>
        <button class="btn btn-primary" id="btn-signout">${icon("logout", 16)} Log out</button>
      </div>
    </div>`;
  // Managing other profiles (switch, add, delete, password) is for the owner only
  const manage = !owner ? "" : `
    <div class="card section">
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
  view.innerHTML = `${pageHeader("Account", owner ? "Owner tools are shown below" : "Your sign-in on this device", "", "Profile")}${account}${manage}`;

  document.getElementById("btn-signout").onclick = signOut;
  if (!owner) return;
  view.querySelectorAll("[data-switch]").forEach(b => b.onclick = () => goToProfile(b.dataset.switch));
  view.querySelectorAll("[data-hidetests]").forEach(b => b.onclick = () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.hidetests);
    p.hideTests = !p.hideTests; saveProfiles(); renderProfiles(); refreshShell();
    toast(p.hideTests ? `Practice and Mock exams hidden for ${p.name}` : `Practice and Mock exams shown for ${p.name}`);
  });

  view.querySelectorAll("[data-rename]").forEach(b => b.onclick = async () => {
    const p = PROFILES.list.find(x => x.id === b.dataset.rename);
    const name = await promptDialog({ title: "Rename profile", label: "Name", value: p.name, maxlength: 30, confirmText: "Save", validate: v => !v ? "Name can't be empty" : nameTaken(v, p.id) ? "That name is already taken" : "" });
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
    if (nameTaken(name)) { nameEl.classList.add("invalid"); toast(`The name “${name}” is already taken`, "error"); return; }
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
// Creating an account needs no invitation code any more. Links that still carry ?invite=… open normally (the
// parameter is removed from the address bar), and a code stored by an older version is forgotten.
(() => {
  try {
    const u = new URL(location.href);
    if (u.searchParams.has("invite")) { u.searchParams.delete("invite"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
  } catch (e) { /* ignore */ }
  try { localStorage.removeItem("cfaStudy_invite"); sessionStorage.removeItem("cfaStudy_invite"); } catch (e) { /* ignore */ }
})();
// "Minh", "minh ", "Mình" and "MINH" all count as the same name
const nameKey = n => String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
function nameTaken(name, exceptId) {
  const k = nameKey(name);
  return PROFILES.list.some(p => p.id !== exceptId && !isPhantom(p) && nameKey(p.name) === k);
}
const hasStoredData = id => { try { return localStorage.getItem(profileKey(id)) !== null; } catch (e) { return false; } };
const gateAccounts = () => PROFILES.list.filter(p => p.pinHash || hasStoredData(p.id));
const isPhantom = p => !p.pinHash && !hasStoredData(p.id) && PROFILES.list.length === 1;
function gateNeeded() { const p = activeProfile(); return !(p.pinHash && isUnlocked(p.id)); }
const gate = { tab: null, sel: null, fails: 0, until: 0, err: "" };

function signOut() {
  try { sessionStorage.removeItem(UNLOCK_KEY); localStorage.removeItem(REMEMBER_KEY); } catch (e) { /* ignore */ }
  if (typeof lockOwner === "function") lockOwner();
  location.hash = "#/dashboard"; router();
}

function gateWait() { return Math.max(0, Math.ceil((gate.until - Date.now()) / 1000)); }
function gateFail() { gate.fails++; if (gate.fails >= 5) { gate.until = Date.now() + 30000; gate.fails = 0; } }

async function gateEnter(id) {
  if (PROFILES.active !== id) switchProfile(id);
  const rm = document.getElementById("g-remember");
  setRemember(id, !!(rm && rm.checked));
  markUnlocked(id); applyTheme();
  document.body.classList.remove("gated");
  gate.err = ""; gate.tab = null;
  location.hash = "#/dashboard"; router(); refreshShell();
}

function findAccount(idv) {
  const k = nameKey(idv);
  return k ? gateAccounts().find(a => nameKey(a.name) === k) : null;
}

function gateField(icon, inner, extra = "") {
  return `<div class="gate-field">${GATE_ICONS[icon]}${inner}${extra}</div>`;
}
const gatePw = (id, ph, auto) => gateField("lock", `<input id="${id}" type="password" placeholder="${ph}" maxlength="40" autocomplete="${auto}" aria-label="${ph}">`,
  `<button type="button" class="gate-eye" data-eye="${id}" aria-label="Show or hide password">${GATE_ICONS.eye}</button>`);

function renderGate() {
  document.body.classList.add("gated");
  const accts = gateAccounts();
  if (!accts.length) gate.tab = "create"; else if (!gate.tab) gate.tab = "signin";
  let last = ""; try { last = localStorage.getItem("cfaStudy_last") || ""; } catch (e) { /* ignore */ }
  const setP = gate.tab === "setpw" ? PROFILES.list.find(p => p.id === gate.sel) : null;
  if (gate.tab === "setpw" && !setP) gate.tab = "signin";

  const err = gate.err ? `<div class="gate-err" role="alert">${esc(gate.err)}</div>` : "";
  let body;
  if (gate.tab === "create") {
    body = `
      <h1 class="gate-serif gate-h">Sign Up</h1>
      <div class="gate-orn"><i></i><b></b><i></i></div>
      ${err}
      ${gateField("user", `<input id="g-name" maxlength="30" placeholder="Username" autocomplete="username" aria-label="Username">`)}
      ${gatePw("g-pw", "Password (4+ characters)", "new-password")}
      <label class="gate-check"><input type="checkbox" id="g-hide" checked><span>Hide Practice and Mock exams</span></label>
      <label class="gate-check gate-remember"><input type="checkbox" id="g-remember" ${rememberPref() ? "checked" : ""}><span>Remember me</span></label>
      <button class="gate-btn gold" id="g-go">Sign Up</button>
      ${accts.length ? `<p class="gate-alt">Already have an account? <button class="gate-link" data-gtab="signin">Sign in</button></p>` : ""}`;
  } else if (gate.tab === "setpw") {
    body = `
      <h1 class="gate-serif gate-h" style="font-size:2rem">Create a password</h1>
      <div class="gate-orn"><i></i><b></b><i></i></div>
      <p class="gate-sub">Hi <strong>${esc(setP.name)}</strong> — your profile has no password yet. Choose one to protect it.</p>
      ${err}
      ${gatePw("g-pw", "New password (min. 4)", "new-password")}
      <label class="gate-check gate-remember"><input type="checkbox" id="g-remember" ${rememberPref() ? "checked" : ""}><span>Remember me</span></label>
      <button class="gate-btn navy" id="g-go">Save &amp; enter ${GATE_ICONS.arrow}</button>
      <p class="gate-alt"><button class="gate-link" data-gtab="signin">Back</button></p>`;
  } else {
    body = `
      <div class="gate-laurel-row">${gateLaurel(false)}<h1 class="gate-serif gate-h gate-h1">Learning CFA Level 1</h1>${gateLaurel(true)}</div>
      <p class="gate-sub">Your Professional Learning Platform for CFA® Level I</p>
      ${err}
      ${gateField("user", `<input id="g-id" placeholder="Username" autocomplete="username" value="${esc(last)}" aria-label="Username">`)}
      ${gatePw("g-pw", "Password", "current-password")}
      <label class="gate-check gate-remember"><input type="checkbox" id="g-remember" ${rememberPref() ? "checked" : ""}><span>Remember me</span></label>
      <button class="gate-btn navy" id="g-go">Sign In ${GATE_ICONS.arrow}</button>
      <div class="gate-or"><span>or</span></div>
      <button class="gate-btn outline" data-gtab="create">Create Account</button>`;
  }

  const brand = `<div class="gate-brand">${gateLogoSvg(80)}<div class="gate-serif gate-name">CFA Study</div></div>`;
  view.innerHTML = `
    <div class="gate gate-${gate.tab}">
      <div class="gate-stage">
        ${gate.tab === "create" ? `<div class="gate-ext">${brand}</div>` : ""}
        <div class="gate-card">
          ${gate.tab === "create" ? "" : brand}
          ${body}
        </div>
      </div>
      <p class="gate-foot">Your account is stored on this device only.</p>
    </div>`;

  view.querySelectorAll("[data-gtab]").forEach(b => b.onclick = () => { gate.tab = b.dataset.gtab; gate.err = ""; renderGate(); });
  view.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => {
    const i = document.getElementById(b.dataset.eye), show = i.type === "password";
    i.type = show ? "text" : "password"; b.innerHTML = show ? GATE_ICONS.eyeOff : GATE_ICONS.eye;
  });
  const go = document.getElementById("g-go");
  view.querySelectorAll(".gate-field input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); }));
  const first = view.querySelector(".gate-field input:not([value=''])") ? null : view.querySelector(".gate-field input");
  if (first && window.matchMedia("(min-width: 700px)").matches) first.focus();
  const fail = msg => { gate.err = msg; renderGate(); };
  const waitMsg = () => `Too many attempts. Try again in ${gateWait()} seconds.`;

  go.onclick = async () => {
    if (gateWait()) return fail(waitMsg());
    const pw = document.getElementById("g-pw").value;

    if (gate.tab === "setpw") {
      if (PIN_RULE(pw)) return fail(PIN_RULE(pw));
      setP.pinHash = await hashPin(pw); saveProfiles(); return gateEnter(setP.id);
    }
    if (gate.tab === "signin") {
      const idv = document.getElementById("g-id").value.trim(), acct = idv && findAccount(idv);
      if (!idv || !pw && acct && acct.pinHash) return fail("Enter your username and your password.");
      if (acct && !acct.pinHash) { gate.tab = "setpw"; gate.sel = acct.id; gate.err = ""; return renderGate(); }
      if (!acct || await hashPin(pw) !== acct.pinHash) { gateFail(); return fail(gateWait() ? waitMsg() : "Username or password is incorrect."); }
      try { localStorage.setItem("cfaStudy_last", acct.name); } catch (e) { /* ignore */ }
      return gateEnter(acct.id);
    }
    // create account
    const name = document.getElementById("g-name").value.trim();
    if (!name || !nameKey(name)) return fail("Enter a username (letters or numbers).");
    if (nameTaken(name)) return fail(`The username “${name}” is already taken. Choose another, or sign in if it is yours.`);
    if (PIN_RULE(pw)) return fail(PIN_RULE(pw));
    const hide = document.getElementById("g-hide").checked, ph = await hashPin(pw);
    let id;
    const firstP = PROFILES.list[0];
    if (isPhantom(firstP)) { firstP.name = name; firstP.pinHash = ph; firstP.hideTests = hide; firstP.createdAt = todayStr(); id = firstP.id; saveProfiles(); saveData(); }
    else { id = createProfile(name, ph, hide); }
    try { localStorage.setItem("cfaStudy_last", name); } catch (e) { /* ignore */ }
    toast(`Welcome, ${name}!`);
    gateEnter(id);
  };
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

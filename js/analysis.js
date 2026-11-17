// ============================================================
// analysis.js — "Weak spots": where you lose points, per topic and module
// Sources: Practice + Mock answers (built-in / own questions) and
// Question Bank marks (each set is matched to a 2027 module by title).
// ============================================================

const WEAK_TARGET = 70;            // aim: 70%+ in every module
const WEAK_MIN = 5;                // fewer answers than this = "too few to tell"

// Question Bank set -> 2027 module (best title match inside the same topic)
// Sets whose 2026 title does not match a 2027 module title closely enough
const QB_SET_MODULE = {
  "Guidance for Standards I–VII": null, "Ethics Application": "ETH-10",
  "Rates and Returns": "QM-01", "Probability Trees and Conditional Expectations": "QM-05", "Portfolio Mathematics": "QM-08",
  "Simulation Methods": "QM-09", "Parametric and Non-Parametric Tests of Independence": "QM-07",
  "Corporate Governance": "CI-03",
  "Market Organization and Structure": "EQ-03", "Security Market Indexes": "EQ-04", "Market Efficiency": "EQ-05",
  "Overview of Equity Securities": "EQ-01", "Company Analysis: Forecasting": "EQ-08", "Equity Valuation: Concepts and Basic Tools": "EQ-05",
  "Analyzing Statements of Cash Flows II": "FSA-05", "Pricing and Valuation of Forward Contracts": "DER-05", "Portfolio Risk and Return: Part II": "PM-02"
};
let QB_MODULE_CACHE = null;
function qbSetModule(fileId) {
  if (!QB_MODULE_CACHE) {
    QB_MODULE_CACHE = {};
    TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => {
      const title = f[1].replace(/\s*\(.*?\)\s*$/, "");
      if (title in QB_SET_MODULE) { QB_MODULE_CACHE[f[2]] = QB_SET_MODULE[title]; return; }
      let best = null, bestScore = 0;
      modulesOf(t.id).forEach(m => {
        const s = qbNorm(m.title) === qbNorm(title) ? 1 : qbTokenScore(m.title, title);
        if (s > bestScore) { best = m.id; bestScore = s; }
      });
      QB_MODULE_CACHE[f[2]] = bestScore >= 0.5 ? best : null;
    }));
  }
  return QB_MODULE_CACHE[fileId] || null;
}

function weakStats() {
  const mod = {}, topic = {};
  const blank = () => ({ answered: 0, right: 0, tried: 0, available: 0 });
  MODULES.forEach(m => { mod[m.id] = blank(); });
  TOPICS.forEach(t => { topic[t.id] = { ...blank(), modules: 0, practiced: 0 }; });
  const add = (mid, tid, a, r, tried, avail) => {
    [mid && mod[mid], topic[tid]].forEach(x => { if (x) { x.answered += a; x.right += r; x.tried += tried; x.available += avail; } });
  };
  DATA.questions.forEach(q => {
    const r = q.attempts.filter(a => a.correct).length;
    add(q.chapter, q.topic, q.attempts.length, r, q.attempts.length ? 1 : 0, 1);
  });
  TOPICS.forEach(t => (QBANK_FILES[t.id] || []).forEach(f => {
    if (qbSkipped(f[2])) return;
    const st = (DATA.qbt || {})[f[2]];
    const total = (QBI[f[2]] && QBI[f[2]].total) || (st && st.count) || 0;
    const marks = st ? Object.values(st.marks) : [];
    add(qbSetModule(f[2]), t.id, marks.length, marks.filter(v => v === "r").length, marks.length, total);
  }));
  MODULES.forEach(m => {
    const s = mod[m.id];
    s.pct = s.answered ? pct(s.right, s.answered) : null;
    s.wrong = s.answered - s.right;
    s.status = weakStatus(s);
    topic[m.topic].modules++;
    if (s.answered) topic[m.topic].practiced++;
  });
  TOPICS.forEach(t => { const s = topic[t.id]; s.pct = s.answered ? pct(s.right, s.answered) : null; s.wrong = s.answered - s.right; s.status = weakStatus(s); });
  return { mod, topic };
}

function weakStatus(s) {
  if (!s.answered) return "none";
  if (s.answered < WEAK_MIN) return "few";
  if (s.pct < 60) return "weak";
  if (s.pct < WEAK_TARGET) return "fair";
  return "strong";
}
const WEAK_LABEL = { none: "Not practiced", few: "Too few answers", weak: "Weak", fair: "Almost there", strong: "Strong" };
const WEAK_ICON = { none: "x", few: "clock", weak: "alert", fair: "target", strong: "check" };

function weakBadge(st) {
  return `<span class="wk-badge wk-${st}">${icon(WEAK_ICON[st], 14)} ${WEAK_LABEL[st]}</span>`;
}

// One horizontal bar: accuracy 0–100, with the 70% target line
function weakBarRow(label, sub, s, href) {
  const tip = s.answered ? `${label}\n${s.pct}% right · ${s.right} right, ${s.wrong} wrong (${s.answered} answers)\n${WEAK_LABEL[s.status]}` : `${label}\nNot practiced yet`;
  return `<a class="wk-row" href="${href}" data-tip="${esc(tip)}">
    <span class="wk-label"><strong>${esc(label)}</strong><span>${esc(sub)}</span></span>
    <span class="wk-track">${s.answered ? `<span class="wk-fill wk-${s.status}" style="width:${Math.max(s.pct, 2)}%"></span>` : `<span class="wk-empty">Not practiced</span>`}
      <span class="wk-target" style="left:${WEAK_TARGET}%"></span></span>
    <span class="wk-val">${s.answered ? `${s.pct}%` : "–"}<span>${s.answered ? `${s.wrong} wrong` : ""}</span></span>
  </a>`;
}

function weakChartHead() {
  return `<div class="wk-legend">
    <span><i class="wk-weak"></i>Weak &lt;60%</span><span><i class="wk-fair"></i>60–69%</span><span><i class="wk-strong"></i>70%+</span>
    <span><i class="wk-few"></i>Fewer than ${WEAK_MIN} answers</span><span><i class="wk-line"></i>Target ${WEAK_TARGET}%</span></div>`;
}

let weakTopic = "";

function renderAnalysis(topicId) {
  if (typeof qbiReady === "function" && !qbiReady()) {
    view.innerHTML = `${pageHeader("Weak spots")}<p class="text-2">Loading…</p>`;
    const h = location.hash;
    qbiLoad().then(() => { if (location.hash === h) renderAnalysis(topicId); });
    return;
  }
  weakTopic = topicId && topicById(topicId) ? topicId : "";
  const S = weakStats();
  const chips = `<div class="tabs" role="tablist">
    <a class="tab ${!weakTopic ? "active" : ""}" href="#/analysis">All topics</a>
    ${TOPICS.map(t => `<a class="tab ${weakTopic === t.id ? "active" : ""}" href="#/analysis/${t.id}">${t.id}</a>`).join("")}</div>`;

  view.innerHTML = `
    ${pageHeader("Weak spots", "Which modules you have practised, which are missing and where you get the most wrong — from Practice, Mock exams and Question Bank.")}
    ${chips}
    ${weakTopic ? weakTopicHtml(topicById(weakTopic), S) : weakOverviewHtml(S)}`;
}

function weakOverviewHtml(S) {
  const all = Object.values(S.topic).reduce((a, s) => ({ answered: a.answered + s.answered, right: a.right + s.right }), { answered: 0, right: 0 });
  const mods = MODULES.map(m => ({ m, s: S.mod[m.id] }));
  const weakest = mods.filter(x => x.s.answered >= WEAK_MIN).sort((a, b) => a.s.pct - b.s.pct || b.s.wrong - a.s.wrong).slice(0, 8);
  const missing = mods.filter(x => !x.s.answered).length;
  const weakN = mods.filter(x => x.s.status === "weak").length;

  return `
    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">Overall accuracy</span><span class="stat-value">${all.answered ? pct(all.right, all.answered) + "%" : "–"}</span><span class="stat-hint">${all.answered} answers</span></div>
      <div class="card stat"><span class="stat-label">Weak modules</span><span class="stat-value" style="color:var(--danger)">${weakN}</span><span class="stat-hint">below 60%</span></div>
      <div class="card stat"><span class="stat-label">Not practiced</span><span class="stat-value">${missing}</span><span class="stat-hint">of ${MODULES.length} modules</span></div>
      <div class="card stat"><span class="stat-label">Target</span><span class="stat-value">${WEAK_TARGET}%</span><span class="stat-hint">in every module</span></div>
    </div>
    <div class="card section">
      <div class="card-head"><div><h2>Accuracy by topic</h2><p class="text-2 small">Sorted by 2027 exam weight · tap a topic to see its modules</p></div></div>
      ${weakChartHead()}
      <div class="wk-chart">${TOPICS.slice().sort((a, b) => weightShare(b) - weightShare(a)).map(t => {
        const s = S.topic[t.id];
        return weakBarRow(t.name, `${t.weight} · ${s.practiced}/${s.modules} modules practiced`, s, `#/analysis/${t.id}`);
      }).join("")}</div>
    </div>
    <div class="card section">
      <div class="card-head"><div><h2>Weakest modules</h2><p class="text-2 small">At least ${WEAK_MIN} answers · lowest accuracy first</p></div></div>
      ${weakest.length ? `<div class="wk-chart">${weakest.map(({ m, s }) => weakBarRow(`${m.id} · ${m.title}`, `${topicById(m.topic).name}`, s, `#/module/${m.id}`)).join("")}</div>`
        : emptyState("target", "Not enough answers yet", `Answer at least ${WEAK_MIN} questions in a module (Practice, Mock exams or Question Bank) and it shows up here.`)}
    </div>`;
}

function weakTopicHtml(t, S) {
  const mods = modulesOf(t.id);
  const ts = S.topic[t.id];
  const missing = mods.filter(m => !S.mod[m.id].answered);
  const rank = { weak: 0, fair: 1, few: 2, strong: 3, none: 4 };
  const focus = mods.filter(m => ["weak", "fair"].includes(S.mod[m.id].status)).sort((a, b) => rank[S.mod[a.id].status] - rank[S.mod[b.id].status] || S.mod[a.id].pct - S.mod[b.id].pct);

  return `
    <div class="grid grid-stats">
      <div class="card stat"><span class="stat-label">${t.id} accuracy</span><span class="stat-value">${ts.pct === null ? "–" : ts.pct + "%"}</span><span class="stat-hint">${ts.answered} answers · ${ts.wrong} wrong</span></div>
      <div class="card stat"><span class="stat-label">Modules practiced</span><span class="stat-value">${ts.practiced}/${ts.modules}</span>${progressBar(pct(ts.practiced, ts.modules), "success")}</div>
      <div class="card stat"><span class="stat-label">Weak modules</span><span class="stat-value" style="color:var(--danger)">${mods.filter(m => S.mod[m.id].status === "weak").length}</span><span class="stat-hint">below 60%</span></div>
      <div class="card stat"><span class="stat-label">Exam weight</span><span class="stat-value">${t.weight}</span><span class="stat-hint">2027</span></div>
    </div>
    ${focus.length || missing.length ? `<div class="callout warning section">${icon("alert", 18)}<div>
      ${focus.length ? `<strong>Fix first:</strong> ${focus.slice(0, 4).map(m => `<a href="#/module/${m.id}">${m.id}</a> (${S.mod[m.id].pct}%)`).join(", ")}.` : ""}
      ${missing.length ? ` <strong>Not practiced yet:</strong> ${missing.map(m => `<a href="#/module/${m.id}">${m.id}</a>`).join(", ")}.` : ""}</div></div>` : ""}
    <div class="card section">
      <div class="card-head"><div><h2>${esc(t.name)} — accuracy by module</h2><p class="text-2 small">Bar = % right · line = ${WEAK_TARGET}% target · hover for details</p></div></div>
      ${weakChartHead()}
      <div class="wk-chart">${mods.map(m => weakBarRow(`${m.id} · ${m.title}`, `${S.mod[m.id].tried} of ${S.mod[m.id].available || 0} questions tried`, S.mod[m.id], `#/module/${m.id}`)).join("")}</div>
    </div>
    <div class="card section">
      <h2>Table</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Module</th><th class="num">Tried</th><th class="num">Right</th><th class="num">Wrong</th><th class="num">Accuracy</th><th>Status</th></tr></thead>
        <tbody>${mods.map(m => { const s = S.mod[m.id]; return `<tr>
          <td><a href="#/module/${m.id}"><strong>${m.id}</strong></a> ${esc(m.title)}</td>
          <td class="num">${s.tried}/${s.available}</td><td class="num">${s.right}</td><td class="num">${s.wrong}</td>
          <td class="num">${s.pct === null ? "–" : s.pct + "%"}</td><td>${weakBadge(s.status)}</td></tr>`; }).join("")}</tbody>
      </table></div>
      <p class="text-3 small" style="margin-top:10px">Tried = questions answered at least once / questions available (built-in + your Question Bank sets for this module). Question Bank sets are matched to 2027 modules by title.</p>
    </div>`;
}

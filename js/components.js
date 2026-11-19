// ============================================================
// components.js — reusable UI pieces: icons, toast, dialog,
// progress ring, empty state, theme
// ============================================================

// ---------- Icons (inline SVG, 24×24, stroke = currentColor) ----------
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20"/><path d="M8 7h8M8 11h6"/>',
  cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h0"/>',
  save: '<path d="M5 3h11l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  curve: '<path d="M2 20h20"/><path d="M3 18c2.6 0 3.6-2.8 5-6.2S10.5 5 12 5s2.6 3.4 4 6.8 2.4 6.2 5 6.2"/>',
  layers: '<path d="m12 3 9 4.6-9 4.6-9-4.6z"/><path d="m3 12.2 9 4.6 9-4.6"/><path d="m3 16.6 9 4.6 9-4.6"/>',
  pulse: '<path d="M3 12h4l2.5-6.5 5 13 2.5-6.5h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  logout: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M9 8l-4 4 4 4M5 12h11"/>',
  chat: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4V16h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 9h7M8.5 12h4"/>',
  send: '<path d="M4.5 12 19.5 4.5 15 19.5l-3.2-6.3z"/><path d="M11.8 13.2 19.5 4.5"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>'
};

function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

// ---------- Toast notifications ----------
function toast(message, type = "success") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(type === "error" ? "alert" : "check", 18)}<span>${esc(message)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

// ---------- Confirm dialog (returns a Promise<boolean>) ----------
// options: { title, message, confirmText, danger, requireText }
function confirmDialog(options) {
  const { title = "Are you sure?", message = "", confirmText = "Confirm", danger = false, requireText = "" } = options;
  return new Promise(resolve => {
    const lastFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${esc(title)}</h2>
        <p class="text-2">${message}</p>
        ${requireText ? `<label class="field"><span class="field-label">Type <strong>${esc(requireText)}</strong> to confirm</span>
          <input class="input" id="modal-input" autocomplete="off"></label>` : ""}
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok" ${requireText ? "disabled" : ""}>${esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    const okBtn = overlay.querySelector('[data-act="ok"]');
    const input = overlay.querySelector("#modal-input");
    if (input) {
      input.addEventListener("input", () => { okBtn.disabled = input.value !== requireText; });
      input.focus();
    } else okBtn.focus();

    const close = result => {
      overlay.classList.remove("show");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => overlay.remove(), 180);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      resolve(result);
    };
    const onKey = e => {
      if (e.key === "Escape") { e.stopPropagation(); close(false); }
      if (e.key === "Enter" && !okBtn.disabled && document.activeElement !== overlay.querySelector('[data-act="cancel"]')) {
        e.preventDefault(); e.stopPropagation(); close(true);
      }
    };
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close(false);
      const act = e.target.closest("[data-act]");
      if (act) close(act.dataset.act === "ok");
    });
  });
}

// ---------- Progress ring (SVG) ----------
function progressRing(pct, size = 96, stroke = 8, label = "") {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return `
    <div class="ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track" fill="none"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-value" fill="none"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>
      </svg>
      <div class="ring-label"><strong>${Math.round(pct)}%</strong>${label ? `<span>${label}</span>` : ""}</div>
    </div>`;
}

function progressBar(pct, tone = "") {
  return `<div class="progress ${tone}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${Math.min(Math.max(pct, 0), 100)}%"></div></div>`;
}

// ---------- Small building blocks ----------
// kicker = small capitals line above the title (e.g. "Topic 2 of 10")
function pageHeader(title, subtitle = "", actions = "", kicker = "") {
  return `
    <header class="page-header">
      <div class="ph-text">
        ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
        <h1>${title}</h1>
        ${subtitle ? `<p class="ph-sub">${subtitle}</p>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
}

function emptyState(iconName, title, text, action = "") {
  return `
    <div class="empty">
      <div class="empty-icon">${icon(iconName, 28)}</div>
      <h3>${title}</h3>
      <p class="text-2">${text}</p>
      ${action}
    </div>`;
}

function levelBadge(level) {
  const map = { foundation: "Foundation", application: "Application", exam: "Exam style", challenge: "Hard" };
  return `<span class="badge badge-${level}">${map[level] || level}</span>`;
}

function topicOptions(selected = "", includeAll = false) {
  return (includeAll ? `<option value="">All topics</option>` : "") +
    TOPICS.map(t => `<option value="${t.id}" ${t.id === selected ? "selected" : ""}>${t.name}</option>`).join("");
}

// ---------- Theme ----------
function applyTheme() {
  const t = DATA.settings.theme || "light";
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

// ---------- Normal-distribution progress chart ----------
// The shaded area under the bell curve = share of the module completed.
// (A 50% module fills the curve up to the mean; 84% fills to +1σ; etc.)
function normPdf(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
function normInv(p) {                       // Acklam's approximation
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

// ---------- Guilloché rosette ----------
// The engraved lace of banknotes and certificates: each band is one sine-modulated
// circle repeated with a small rotation. pct (0–100) of the seal is printed in brass,
// the rest stays as faint ink. Used as the syllabus progress "seal".
let ROSETTE_N = 0, ROSETTE_PATHS = null;
const ROSETTE_BANDS = [   // [radius, amplitude, lobes, copies]  (viewBox −100…100)
  [81, 6.5, 24, 9],
  [64, 6, 15, 8],
  [48.5, 4.5, 9, 6]
];
function rosettePaths() {
  if (ROSETTE_PATHS) return ROSETTE_PATHS;
  ROSETTE_PATHS = ROSETTE_BANDS.map(([R, A, m]) => {
    const steps = m * 14;
    let d = "";
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2, r = R + A * Math.sin(m * t);
      d += (i ? "L" : "M") + (r * Math.cos(t)).toFixed(2) + " " + (r * Math.sin(t)).toFixed(2);
    }
    return d + "Z";
  });
  return ROSETTE_PATHS;
}
// opts: { label: aria label, micro: text printed around the rim }
function rosette(pct, opts = {}) {
  const id = "ro" + (++ROSETTE_N);
  const p = Math.min(Math.max(+pct || 0, 0), 100);
  const paths = rosettePaths();
  const lace = ROSETTE_BANDS.map(([, , m, k], i) => {
    const step = 360 / m / k;
    return `<path id="${id}b${i}" d="${paths[i]}"/>` +
      Array.from({ length: k - 1 }, (_, j) => `<use href="#${id}b${i}" transform="rotate(${((j + 1) * step).toFixed(2)})"/>`).join("");
  }).join("");
  const micro = (opts.micro || "CFA PROGRAM · LEVEL I · ").repeat(6);
  const ang = (-90 + 3.6 * p) * Math.PI / 180;
  const tip = p > 0 && p < 100 ? `<circle class="ro-tip" cx="${(91 * Math.cos(ang)).toFixed(2)}" cy="${(91 * Math.sin(ang)).toFixed(2)}" r="2.6"/>` : "";
  const a11y = opts.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${esc(opts.label || p + "% complete")}"`;
  return `<svg class="rosette" viewBox="-100 -100 200 200" ${a11y}>
    <defs>
      <g id="${id}l" fill="none" stroke-width=".5">${lace}</g>
      <path id="${id}t" d="M-91 0a91 91 0 1 1 182 0a91 91 0 1 1-182 0"/>
      <mask id="${id}m"><circle class="ro-mask-c" r="50" fill="none" stroke="#fff" stroke-width="101" pathLength="100" style="stroke-dasharray:${p} 100" transform="rotate(-90)"/></mask>
    </defs>
    <circle class="ro-rule" r="97"/><circle class="ro-rule" r="86.5"/><circle class="ro-rule" r="39"/>
    <text class="ro-micro"><textPath href="#${id}t" textLength="570" lengthAdjust="spacing">${micro}</textPath></text>
    <use class="ro-base" href="#${id}l"/>
    <use class="ro-fill" href="#${id}l" mask="url(#${id}m)"/>
    ${tip}
  </svg>`;
}

// ---------- Woven wave band (decorative security-print ribbon) ----------
function waveBand(opts = {}) {
  const W = opts.width || 600, H = opts.height || 60, n = opts.lines || 9, waves = opts.waves || 5;
  let d = "";
  for (let k = 0; k < n; k++) {
    const ph = (k / n) * Math.PI, amp = H * 0.34 * (0.55 + 0.45 * Math.cos((k / n) * Math.PI * 2));
    let s = "";
    for (let i = 0; i <= 160; i++) {
      const x = (i / 160) * W, y = H / 2 + amp * Math.sin((x / W) * Math.PI * 2 * waves + ph);
      s += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    d += `<path d="${s}" vector-effect="non-scaling-stroke"/>`;
  }
  return `<svg class="wave-band ${opts.cls || ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${opts.stroke || 0.75}">${d}</g></svg>`;
}

// ---------- 25-week roadmap: Learn 1–15 · Review 16–20 · Mock exams 21–25 ----------
const PLAN_PHASES = [["Learn", 1, 15, "New material, topic by topic"], ["Review", 16, 20, "Everything again · topic questions"], ["Mock exams", 21, 25, "Full mocks · fix weak areas", "Mocks"]];
function phaseTimeline(week, opts = {}) {
  const w = Math.min(Math.max(week, 0), 25);
  const at = w <= 0 ? 0 : ((w - 0.5) / 25) * 100;
  return `<div class="timeline${opts.detail ? " tl-detail" : ""}" role="img" aria-label="${w >= 1 ? `Week ${w} of 25` : "The plan has not started yet"}">
    <div class="tl-flag" style="left:${at.toFixed(2)}%;transform:translateX(-${at.toFixed(2)}%)">${w >= 1 ? `Week ${w}` : "Start"}</div>
    <div class="tl-stem" style="left:${at.toFixed(2)}%"></div>
    <div class="tl-ruler"></div>
    <div class="tl-phases">${PLAN_PHASES.map(([n, a, b, d, short]) => {
      const fill = w > b ? 100 : w >= a ? ((w - a + 0.5) / (b - a + 1)) * 100 : 0;
      return `<div class="tl-phase${w >= a && w <= b ? " now" : w > b ? " past" : ""}" style="flex:${b - a + 1}">
        <span class="tl-bar"><i style="width:${fill.toFixed(1)}%"></i></span>
        <span class="tl-name">${short ? `<span class="hide-mobile">${n}</span><span class="only-mobile">${short}</span>` : n}</span><span class="tl-weeks"><span class="hide-mobile">Weeks </span>${a}–${b}</span>${opts.detail ? `<span class="tl-desc">${d}</span>` : ""}
      </div>`;
    }).join("")}</div>
  </div>`;
}

// ---------- Module completion meter ----------
// The four parts of a module's score, each sized by its weight (40/40/10/10).
// opts.labels adds a caption under each part.
function meterHtml(mp, opts = {}) {
  const parts = [["st", 40, mp.statusPct], ["qs", 40, mp.masteryPct], ["sw", 10, mp.schweser ? 100 : 0], ["cu", 10, mp.curriculum ? 100 : 0]];
  const bar = `<div class="meter${opts.big ? " meter-big" : ""}" ${opts.tip ? `data-tip="${esc(opts.tip)}"` : ""} role="img" aria-label="${mp.pct}% complete">${parts.map(([k, w, v]) =>
    `<span class="mt-seg mt-${k}" style="flex:${w}"><i style="width:${v}%"></i></span>`).join("")}</div>`;
  if (!opts.labels) return bar;
  // SchweserNotes + Curriculum share one caption: both are reading
  return `<div class="meter-wrap">${bar}<div class="mt-labels"><span style="flex:40">Status</span><span style="flex:40">Questions</span><span style="flex:20">Reading</span></div></div>`;
}
const METER_LEGEND = `<div class="mt-legend"><span><i class="mt-st"></i>Study status 40%</span><span><i class="mt-qs"></i>Questions 40%</span><span><i class="mt-sw"></i>SchweserNotes 10%</span><span><i class="mt-cu"></i>Curriculum 10%</span></div>`;

// ---------- Module status strip: one cell per module of a topic ----------
function statusStrip(topicId) {
  return `<div class="strip" aria-hidden="true">${modulesOf(topicId).map(m => {
    const st = (DATA.chapters.find(c => c.id === m.id) || {}).status || "not_started";
    return `<i class="st-${st}" title="${esc(`${m.id} · ${m.title} — ${STATUS_LABEL[st]}`)}"></i>`;
  }).join("")}</div>`;
}
const STRIP_LEGEND = `<div class="strip-legend"><span><i class="st-not_started"></i>Not started</span><span><i class="st-learning"></i>Learning</span><span><i class="st-done"></i>Done</span><span><i class="st-reviewed"></i>Reviewed</span></div>`;

// ---------- Hover tooltip for any element with data-tip ----------
(function initTooltips() {
  let tip;
  document.addEventListener("mouseover", e => {
    const el = e.target.closest("[data-tip]");
    if (!el) return;
    if (!tip) { tip = document.createElement("div"); tip.className = "tooltip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = el.dataset.tip.replace(/\n/g, "<br>");
    tip.classList.add("show");
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + "px";
    tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 8) + "px";
  });
  window.hideTooltip = () => tip && tip.classList.remove("show");
  window.addEventListener("hashchange", () => window.hideTooltip());
  window.addEventListener("scroll", () => window.hideTooltip(), { passive: true });
  document.addEventListener("mouseout", e => {
    if (tip && e.target.closest("[data-tip]") && !e.relatedTarget?.closest?.("[data-tip]")) tip.classList.remove("show");
  });
})();

// ---------- Prompt dialog (returns Promise<string|null>) ----------
// options: { title, message, label, type, inputmode, maxlength, confirmText, value, validate }
function promptDialog(options) {
  const { title = "", message = "", label = "", type = "text", inputmode = "text", maxlength = 40, confirmText = "OK", value = "", validate } = options;
  return new Promise(resolve => {
    const lastFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pd-title">
        <h2 id="pd-title">${esc(title)}</h2>
        ${message ? `<p class="text-2">${message}</p>` : ""}
        <label class="field"><span class="field-label">${esc(label)}</span>
          <input class="input" id="pd-input" type="${type}" inputmode="${inputmode}" maxlength="${maxlength}" autocomplete="off" value="${esc(value)}"></label>
        <div class="field-error" id="pd-error" hidden></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button class="btn btn-primary" data-act="ok">${esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    const input = overlay.querySelector("#pd-input");
    const err = overlay.querySelector("#pd-error");
    input.focus(); input.select();
    const close = result => {
      overlay.classList.remove("show");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => overlay.remove(), 180);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      resolve(result);
    };
    const submit = () => {
      const v = input.value.trim();
      const problem = validate ? validate(v) : "";
      if (problem) { err.textContent = problem; err.hidden = false; input.classList.add("invalid"); input.focus(); return; }
      close(v);
    };
    const onKey = e => {
      if (e.key === "Escape") { e.stopPropagation(); close(null); }
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); submit(); }
    };
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close(null);
      const act = e.target.closest("[data-act]");
      if (act) act.dataset.act === "ok" ? submit() : close(null);
    });
  });
}

// ---------- Profile avatar ----------
const AVATAR_COLORS = ["#24386d", "#2e6b4e", "#8c5a17", "#6b3e5e", "#2f5d7c", "#8a3b2e"];
function avatarHtml(profile, size = 32) {
  const initials = (profile.name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px;background:${AVATAR_COLORS[profile.color % AVATAR_COLORS.length]}" aria-hidden="true">${esc(initials)}</span>`;
}


// ---------- Owner mode ----------
// Editing tools (add / import / delete questions and cards, restore or wipe
// data) are hidden until the owner unlocks them with a password.
// The password is stored only as a SHA-256 hash in this browser.
const OWNER_KEY = "cfaStudy_owner";
const OWNER_SESSION = "cfaStudy_owner_unlocked";
function ownerHash() { try { return localStorage.getItem(OWNER_KEY); } catch (e) { return null; } }
function isOwner() { try { return !!ownerHash() && sessionStorage.getItem(OWNER_SESSION) === ownerHash(); } catch (e) { return false; } }
async function hashOwnerPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cfa-owner:" + pw));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function setupOwner() {
  const pw = await promptDialog({ title: "Create owner password", message: "Only someone with this password can see and use the editing tools on this browser.", label: "Password (at least 6 characters)", type: "password", maxlength: 64, confirmText: "Continue", validate: v => v.length >= 6 ? "" : "Use at least 6 characters" });
  if (pw === null) return false;
  const again = await promptDialog({ title: "Confirm password", label: "Type it again", type: "password", maxlength: 64, confirmText: "Save", validate: v => v === pw ? "" : "Passwords do not match" });
  if (again === null) return false;
  const h = await hashOwnerPassword(pw);
  try { localStorage.setItem(OWNER_KEY, h); sessionStorage.setItem(OWNER_SESSION, h); } catch (e) { return false; }
  toast("Owner password set — editing tools unlocked");
  return true;
}
async function unlockOwner() {
  const pw = await promptDialog({ title: "Owner login", label: "Owner password", type: "password", maxlength: 64, confirmText: "Unlock" });
  if (pw === null) return false;
  const h = await hashOwnerPassword(pw);
  if (h !== ownerHash()) { toast("Wrong password", "error"); return false; }
  try { sessionStorage.setItem(OWNER_SESSION, h); } catch (e) { /* ignore */ }
  toast("Editing tools unlocked");
  return true;
}
function lockOwner() { try { sessionStorage.removeItem(OWNER_SESSION); } catch (e) { /* ignore */ } toast("Editing tools locked"); }

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
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
};

function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
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
function pageHeader(title, subtitle = "", actions = "") {
  return `
    <header class="page-header">
      <div>
        <h1>${title}</h1>
        ${subtitle ? `<p class="text-2">${subtitle}</p>` : ""}
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
  const map = { foundation: "Foundation", application: "Application", exam: "Exam style" };
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

// pctDone: 0–100. opts: { width, height, tip, showLabel, compact }
function bellCurve(pctDone, opts = {}) {
  const W = opts.width || 320, H = opts.height || 110, pad = 6, base = H - (opts.compact ? 6 : 22);
  const X0 = -3.5, X1 = 3.5, peak = normPdf(0);
  const sx = x => pad + ((x - X0) / (X1 - X0)) * (W - 2 * pad);
  const sy = y => base - (y / peak) * (base - 8);
  const pts = [];
  for (let i = 0; i <= 120; i++) { const x = X0 + (i / 120) * (X1 - X0); pts.push([sx(x), sy(normPdf(x))]); }
  const curve = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const p = Math.min(Math.max(pctDone, 0), 100) / 100;
  const z = p >= 1 ? X1 : p <= 0 ? X0 : Math.max(X0, Math.min(X1, normInv(p)));
  const fillPts = pts.filter(pt => pt[0] <= sx(z) + 0.01);
  const fill = p > 0 ? `M${sx(X0)},${base}` + fillPts.map(pt => `L${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join("") + `L${sx(z).toFixed(1)},${sy(normPdf(z)).toFixed(1)}L${sx(z).toFixed(1)},${base}Z` : "";
  const ticks = opts.compact ? "" : [-2, -1, 0, 1, 2].map(t =>
    `<line x1="${sx(t)}" x2="${sx(t)}" y1="${base}" y2="${base + 4}" class="bell-tick"/><text x="${sx(t)}" y="${base + 16}" class="bell-axis">${t === 0 ? "μ" : (t > 0 ? "+" : "−") + Math.abs(t) + "σ"}</text>`).join("");
  const marker = p > 0 && p < 1 ? `<line x1="${sx(z)}" x2="${sx(z)}" y1="${sy(normPdf(z)) - 6}" y2="${base}" class="bell-marker"/>` : "";
  const label = Math.round(p * 100);
  return `
    <div class="bell" ${opts.tip ? `data-tip="${esc(opts.tip)}"` : ""} role="img" aria-label="${label}% complete">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" aria-hidden="true">
        <line x1="${pad}" x2="${W - pad}" y1="${base}" y2="${base}" class="bell-base"/>
        ${fill ? `<path d="${fill}" class="bell-fill"/>` : ""}
        <path d="${curve}" class="bell-line"/>
        ${marker}${ticks}
      </svg>
      ${opts.showLabel === false ? "" : `<div class="bell-label"><strong>${label}%</strong></div>`}
    </div>`;
}

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
const AVATAR_COLORS = ["#2952cc", "#0e9384", "#b54708", "#7a5af8", "#c11574", "#027a48"];
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

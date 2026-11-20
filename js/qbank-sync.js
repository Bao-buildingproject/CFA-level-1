// ============================================================
// qbank-sync.js — load the Question Bank sets straight from the site
//
// The sets are published only in encrypted form (qb/*.bin, AES-256-GCM).
// Someone with the access key enters it once on a device; the site then
// downloads, decrypts and stores the sets in this browser (IndexedDB), where
// every account on the device can answer them, and keeps them up to date.
// Without the key the files are unreadable.
// ============================================================

const QBK_KEY = "cfaStudy_qbkey";        // the access key (device-wide)
const QBK_MARKS = "cfaStudy_qbsync";     // { packId: hash } — packs this device already has (the sets are shared by all accounts)
let QBS = { running: false, step: null, error: null, manifest: null, checked: null, done: 0, total: 0 };

function qbkGet() { try { return localStorage.getItem(QBK_KEY) || ""; } catch (e) { return ""; } }
function qbkSet(v) { try { v ? localStorage.setItem(QBK_KEY, v) : localStorage.removeItem(QBK_KEY); } catch (e) { /* ignore */ } }
const qbkNorm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function qbkSupported() { return !!(window.fetch && window.crypto && crypto.subtle && window.DecompressionStream); }
const qbkBytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function qbkManifest() {
  const r = await fetch("qb/manifest.json?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}
async function qbkDerive(pass, m, usages = ["decrypt"]) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(qbkNorm(pass)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: qbkBytes(m.salt), iterations: m.iter },
    base, { name: "AES-GCM", length: 256 }, false, usages);
}
function qbkDecrypt(key, buf) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12)); }
function qbkGunzip(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); }
// Returns the decryption key if the passphrase is right, otherwise null
async function qbkCheck(pass, m) {
  try {
    const key = await qbkDerive(pass, m);
    return new TextDecoder().decode(await qbkDecrypt(key, qbkBytes(m.check))) === "cfa-qbank-ok" ? key : null;
  } catch (e) { return null; }
}

function qbkMarks() {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(QBK_MARKS) || "{}") || {}; } catch (e) { all = {}; }
  // older format kept one map per account ({ accountId: { packId: hash } }); the packs now belong to the device
  if (Object.values(all).some(v => v && typeof v === "object")) {
    const flat = {};
    Object.values(all).forEach(v => { if (v && typeof v === "object") Object.assign(flat, v); });
    all = flat;
    try { localStorage.setItem(QBK_MARKS, JSON.stringify(all)); } catch (e) { /* ignore */ }
  }
  return all;
}
function qbkMark(p) {
  const all = qbkMarks();
  all[p.id] = p.hash;
  try { localStorage.setItem(QBK_MARKS, JSON.stringify(all)); } catch (e) { /* ignore */ }
}
// Packs this device still needs: new or changed on the site, or sets missing from this browser
function qbkTodo(m) {
  const have = qbkMarks();
  return m.packs.filter(p => have[p.id] !== p.hash || p.sets.some(id => !QBI[id]));
}
const qbkMB = b => (b / 1e6).toFixed(b < 1e7 ? 1 : 0);
const qbkSizeText = () => QBS.manifest ? `about ${qbkMB(QBS.manifest.packs.reduce((s, p) => s + p.bytes, 0))} MB` : "about 20 MB";

async function qbkFetch(p) {
  const r = await fetch(`qb/${p.file}?v=${p.hash}`);
  if (!r.ok) throw new Error("http " + r.status);
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); QBS.done += b.length; return b; }
  const reader = r.body.getReader(), parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length; QBS.done += value.length;
    qbkPaint();
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const v of parts) { out.set(v, o); o += v.length; }
  return out;
}

// Download whatever this profile is missing. Quiet when everything is current.
async function qbkSync(opts = {}) {
  if (QBS.running || !qbkGet() || !qbkSupported()) return;
  const pid = PROFILES.active;
  Object.assign(QBS, { running: true, step: null, error: null, checked: pid, done: 0, total: 0 });
  try {
    if (!qbiReady()) await qbiLoad();
    const m = opts.manifest || await qbkManifest();
    QBS.manifest = m;
    const todo = qbkTodo(m);
    if (todo.length) {
      const key = opts.key || await qbkCheck(qbkGet(), m);
      if (!key) throw new Error("bad-key");
      QBS.total = todo.reduce((s, p) => s + p.bytes, 0);
      const report = { sets: [], skipped: [], failed: [], pack: true };
      for (let i = 0; i < todo.length; i++) {
        const p = todo[i];
        QBS.step = { i: i + 1, n: todo.length, title: p.title };
        qbkPaint(true);
        const pkg = JSON.parse(await qbkGunzip(await qbkDecrypt(key, await qbkFetch(p))));
        await qbImportPackObject(pkg, p.title, report);      // shared sets: switching account meanwhile is fine
        qbkMark(p);
      }
      saveData();
      qbIndexReset();
      if (report.failed.length) console.warn("Question Bank:", report.failed);
      toast(`Question Bank ready · ${qbiQuestionCount().toLocaleString("en-US")} questions`);
    }
    await qbkTutorSync(m, opts.key);
  } catch (e) {
    QBS.error = e.message === "bad-key" ? "bad-key" : e.message === "profile" ? null : "network";
    if (e.message === "profile") QBS.checked = null;
  }
  QBS.running = false; QBS.step = null;
  qbkPaint(true, true);
  if (PROFILES.active !== pid) qbkAuto();
}

// ---------- CFA Tutor key, sealed with the same access key ----------
// The owner can publish the tutor's Gemini key in the manifest ("tutor"), encrypted like the packs.
// A browser that unlocks the Question Bank then sets up the tutor too, for every account in it.
// A key someone pasted in this browser wins, and a published key removed here is not put back.
const QBK_TUTOR_SKIP = "cfaStudy_tutor_skip";
async function qbkTutorSync(m, key) {
  const t = m && m.tutor;
  if (!t || !t.blob || typeof tutorCfg !== "function" || !qbkGet()) return false;
  const cfg = tutorCfg();
  if (cfg.key && (!cfg.from || cfg.from === t.hash)) return false;
  try { if (localStorage.getItem(QBK_TUTOR_SKIP) === t.hash) return false; } catch (e) { /* ignore */ }
  try {
    key = key || await qbkCheck(qbkGet(), m);
    if (!key) return false;
    const c = JSON.parse(new TextDecoder().decode(await qbkDecrypt(key, qbkBytes(t.blob))));
    if (!c || typeof c.key !== "string" || c.key.length < 20) return false;
    tutorSaveCfg({ ...cfg, key: c.key, model: c.model || "gemini-2.5-flash", models: [], from: t.hash });
    // the model list comes from Google in the background; the tutor works with the saved model meanwhile
    tutorListModels(c.key).then(models => {
      const cur = tutorCfg();
      if (cur.key !== c.key || !models.length) return;
      cur.models = models;
      if (!models.some(x => x.id === cur.model)) cur.model = models[0].id;
      tutorSaveCfg(cur);
    }).catch(() => { /* ignore */ });
    if (typeof TUTOR !== "undefined" && TUTOR.open) { TUTOR.view = "chat"; tutorRender(); }
    return true;
  } catch (e) { return false; }
}
// Seal this browser's tutor key with the access key, for the owner to publish in qb/manifest.json
async function qbkSealTutor() {
  const cfg = tutorCfg(), m = await qbkManifest();
  if (!cfg.key) throw new Error("no-tutor-key");
  if (!qbkGet() || !(await qbkCheck(qbkGet(), m))) throw new Error("bad-key");
  const ek = await qbkDerive(qbkGet(), m, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, ek, new TextEncoder().encode(JSON.stringify({ key: cfg.key, model: cfg.model || "" }))));
  const blob = new Uint8Array(12 + ct.length);
  blob.set(iv); blob.set(ct, 12);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", blob))).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
  let bin = "";
  blob.forEach(b => { bin += String.fromCharCode(b); });
  return { app: "cfa-study", kind: "tutor-key", version: 1, blob: btoa(bin), hash };
}

// One-tap link #/qbank/key/<access key>: remember the key until the user is signed in
const QBK_PENDING = "cfaStudy_qbkey_pending";
function qbkTakeLink() {
  const m = location.hash.match(/^#\/qbank\/key\/([^/?#]+)/);
  if (!m) return;
  try { sessionStorage.setItem(QBK_PENDING, decodeURIComponent(m[1])); } catch (e) { /* ignore */ }
  history.replaceState(null, "", location.pathname + location.search + "#/qbank");
}
qbkTakeLink();

// Called on every page change: checks once per profile and page load
function qbkAuto() {
  let pend = "";
  try { pend = sessionStorage.getItem(QBK_PENDING) || ""; sessionStorage.removeItem(QBK_PENDING); } catch (e) { /* ignore */ }
  if (pend) { qbkUnlock(pend); return; }
  // no key yet: fetch the (small, public) list once so the Question Bank page can show the real download size
  if (!qbkGet() && !QBS.manifest && !QBS.listing && currentRoute()[0] === "qbank" && window.fetch) {
    QBS.listing = true;
    qbkManifest().then(m => { QBS.manifest = m; qbkPaint(true); }).catch(() => { /* ignore */ });
  }
  if (!qbkGet() || QBS.running || QBS.checked === PROFILES.active || !qbkSupported()) return;
  qbkSync();
}

async function qbkUnlock(code) {
  if (!qbkSupported()) { toast("This browser is too old to load the Question Bank — update it first", "error"); return false; }
  let m;
  try { m = await qbkManifest(); } catch (e) { toast("Could not reach the site — check your connection", "error"); return false; }
  QBS.manifest = m;
  const key = await qbkCheck(code, m);
  if (!key) { toast("That access key is not right", "error"); return false; }
  qbkSet(qbkNorm(code));
  QBS.error = null; QBS.checked = null;
  toast("Access key saved on this device");
  qbkSync({ key, manifest: m });
  return true;
}
// the key as typed, or taken from a one-tap link pasted whole (…/#/qbank/key/XXXX-XXXX-XXXX-XXXX)
function qbkFromInput(s) {
  const t = String(s || "").trim(), m = t.match(/qbank\/key\/([^/?#\s]+)/i);
  if (!m) return t;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}
async function qbkAsk() {
  const v = await promptDialog({
    title: "Question Bank access key",
    message: `Paste the key you were given, or the whole one-tap link. It is saved on this device only, for every account on it. The question sets then download by themselves (${qbkSizeText()}, once) and stay in this browser.`,
    label: "Access key or link", maxlength: 300, confirmText: "Unlock",
    validate: x => qbkNorm(qbkFromInput(x)).length >= 12 ? "" : "Paste the whole key or link"
  });
  if (v !== null) await qbkUnlock(qbkFromInput(v));
}
// Step-by-step help shown under the buttons. The key itself never appears on the page: the site is public.
function qbkGuideHtml() {
  return `<div class="qbk-guide" id="qbk-guide">
    <strong>How to get the question sets</strong>
    <ol>
      <li>Ask the person who runs this site for the <strong>access key</strong>. It looks like <span class="mono">XXXX-XXXX-XXXX-XXXX</span> and usually comes with a one-tap link.</li>
      <li><strong>With the one-tap link:</strong> open it on this phone or computer and sign in. The sets download by themselves (${qbkSizeText()}, a few seconds on Wi-Fi). Nothing to type.</li>
      <li><strong>With the key only:</strong> press <strong>Enter access key</strong> and paste the key, or paste the whole link.</li>
      <li>Do it once per browser: every account in this browser can then answer the sets, each with its own marks. On another phone or browser, do it once there too.</li>
    </ol>
    <p class="text-3 small">Keep the key and the link private: anyone who has them can read the question sets.</p>
  </div>`;
}
const qbkHelpBtn = () => `<button class="btn btn-ghost btn-sm" data-qbhelp aria-expanded="${!!QBS.help}" aria-controls="qbk-guide">${icon(QBS.help ? "x" : "flag", 15)} ${QBS.help ? "Hide the guide" : "How to get the key"}</button>`;

// ---------- Status panel on the Question Bank page ----------
function qbkStatusHtml() {
  if (!qbkSupported()) return `<div class="callout warning section">${icon("alert", 18)}<div><strong>This browser cannot load the Question Bank.</strong> Update it (Safari 16.4+, Chrome or Edge 80+, Firefox 113+) or use another browser.</div></div>`;
  if (!qbkGet()) return `<div class="callout info section">${icon("play", 18)}<div style="flex:1"><strong>Load the question sets on this device.</strong> Enter the access key once — all sets download by themselves (${qbkSizeText()}) and open here with the full explanations, tables and figures.<div class="qbk-act"><button class="btn btn-primary btn-sm" data-qbkey>Enter access key</button>${qbkHelpBtn()}</div>${QBS.help ? qbkGuideHtml() : ""}</div></div>`;
  if (QBS.running && QBS.step) {
    const p = QBS.total ? pct(QBS.done, QBS.total) : 0;
    return `<div class="callout info section">${icon("download", 18)}<div style="flex:1"><strong>Downloading the Question Bank</strong> · ${QBS.step.i} of ${QBS.step.n}: ${esc(QBS.step.title)}
      <div style="margin-top:8px">${progressBar(p)}</div><div class="text-3 small" style="margin-top:6px">${qbkMB(QBS.done)} of ${qbkMB(QBS.total)} MB · keep this page open</div></div></div>`;
  }
  if (QBS.error === "bad-key") return `<div class="callout danger section">${icon("alert", 18)}<div style="flex:1"><strong>The saved access key no longer opens the question sets.</strong> Ask for the new key.<div class="qbk-act"><button class="btn btn-primary btn-sm" data-qbkey>Enter access key</button>${qbkHelpBtn()}</div>${QBS.help ? qbkGuideHtml() : ""}</div></div>`;
  if (QBS.error === "network") return `<div class="callout warning section">${icon("alert", 18)}<div style="flex:1"><strong>Could not download the question sets.</strong> Check your connection and try again.<div class="qbk-act"><button class="btn btn-secondary btn-sm" data-qbsync>Try again</button></div></div></div>`;
  const n = qbiQuestionCount();
  const current = QBS.manifest && !qbkTodo(QBS.manifest).length;
  return `<div class="callout success section">${icon("check", 18)}<div><strong>${n.toLocaleString("en-US")} questions on this device${current ? " · up to date" : QBS.running ? " · checking for updates…" : ""}.</strong> Pick a topic below and press <strong>Do it</strong> on a set, or start a mock test. New or corrected sets load by themselves.</div></div>`;
}
let qbkPainted = 0;
function qbkPaint(force, finished) {
  const now = Date.now();
  if (!force && now - qbkPainted < 150) return;
  qbkPainted = now;
  const [route, sub] = currentRoute();
  if (finished && route === "qbank" && (!sub || sub === "topic")) { qbRerender(); return; }
  const box = document.getElementById("qb-sync");
  if (box) { box.innerHTML = qbkStatusHtml(); qbkBind(box); }
}
function qbkBind(root) {
  root.querySelectorAll("[data-qbkey]").forEach(b => b.onclick = () => qbkAsk());
  root.querySelectorAll("[data-qbhelp]").forEach(b => b.onclick = () => { QBS.help = !QBS.help; qbkPaint(true); });
  root.querySelectorAll("[data-qbsync]").forEach(b => b.onclick = () => { QBS.checked = null; QBS.error = null; qbkSync(); qbkPaint(true); });
}

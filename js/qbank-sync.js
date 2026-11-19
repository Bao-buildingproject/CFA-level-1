// ============================================================
// qbank-sync.js — load the Question Bank sets straight from the site
//
// The sets are published only in encrypted form (qb/*.bin, AES-256-GCM).
// Someone with the access key enters it once on a device; the site then
// downloads, decrypts and stores the sets in this browser (IndexedDB, per
// profile) and keeps them up to date. Without the key the files are unreadable.
// ============================================================

const QBK_KEY = "cfaStudy_qbkey";        // the access key (device-wide)
const QBK_MARKS = "cfaStudy_qbsync";     // { profileId: { packId: hash } } — what each profile already has
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
async function qbkDerive(pass, m) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(qbkNorm(pass)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: qbkBytes(m.salt), iterations: m.iter },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
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

function qbkMarks() { try { return JSON.parse(localStorage.getItem(QBK_MARKS) || "{}"); } catch (e) { return {}; } }
function qbkMark(pid, p) {
  const all = qbkMarks();
  (all[pid] = all[pid] || {})[p.id] = p.hash;
  try { localStorage.setItem(QBK_MARKS, JSON.stringify(all)); } catch (e) { /* ignore */ }
}
// Packs this profile still needs: new or changed on the site, or sets missing from this browser
function qbkTodo(m) {
  const have = qbkMarks()[PROFILES.active] || {};
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
        if (PROFILES.active !== pid) throw new Error("profile");
        await qbImportPackObject(pkg, p.title, report);
        qbkMark(pid, p);
      }
      saveData();
      qbIndexReset();
      if (report.failed.length) console.warn("Question Bank:", report.failed);
      toast(`Question Bank ready · ${qbiQuestionCount().toLocaleString("en-US")} questions`);
    }
  } catch (e) {
    QBS.error = e.message === "bad-key" ? "bad-key" : e.message === "profile" ? null : "network";
    if (e.message === "profile") QBS.checked = null;
  }
  QBS.running = false; QBS.step = null;
  qbkPaint(true, true);
  if (PROFILES.active !== pid) qbkAuto();
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
async function qbkAsk() {
  const v = await promptDialog({
    title: "Question Bank access key",
    message: `Enter the key you were given. It is saved on this device only. The question sets then download by themselves (${qbkSizeText()}, once) and stay in this browser.`,
    label: "Access key", maxlength: 40, confirmText: "Unlock",
    validate: x => qbkNorm(x).length >= 12 ? "" : "Enter the whole key"
  });
  if (v !== null) await qbkUnlock(v);
}

// ---------- Status panel on the Question Bank page ----------
function qbkStatusHtml() {
  if (!qbkSupported()) return `<div class="callout warning section">${icon("alert", 18)}<div><strong>This browser cannot load the Question Bank.</strong> Update it (Safari 16.4+, Chrome or Edge 80+, Firefox 113+) or use another browser.</div></div>`;
  if (!qbkGet()) return `<div class="callout info section">${icon("play", 18)}<div style="flex:1"><strong>Load the question sets on this device.</strong> Enter the access key once — all sets download by themselves (${qbkSizeText()}) and open here with the full explanations, tables and figures.<div class="qbk-act"><button class="btn btn-primary btn-sm" data-qbkey>Enter access key</button></div></div></div>`;
  if (QBS.running && QBS.step) {
    const p = QBS.total ? pct(QBS.done, QBS.total) : 0;
    return `<div class="callout info section">${icon("download", 18)}<div style="flex:1"><strong>Downloading the Question Bank</strong> · ${QBS.step.i} of ${QBS.step.n}: ${esc(QBS.step.title)}
      <div style="margin-top:8px">${progressBar(p)}</div><div class="text-3 small" style="margin-top:6px">${qbkMB(QBS.done)} of ${qbkMB(QBS.total)} MB · keep this page open</div></div></div>`;
  }
  if (QBS.error === "bad-key") return `<div class="callout danger section">${icon("alert", 18)}<div style="flex:1"><strong>The saved access key no longer opens the question sets.</strong> Ask for the new key.<div class="qbk-act"><button class="btn btn-primary btn-sm" data-qbkey>Enter access key</button></div></div></div>`;
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
  root.querySelectorAll("[data-qbsync]").forEach(b => b.onclick = () => { QBS.checked = null; QBS.error = null; qbkSync(); qbkPaint(true); });
}

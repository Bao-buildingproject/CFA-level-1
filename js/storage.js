// ============================================================
// storage.js — save / load / export / import all study data
// All data lives in ONE object, stored under ONE key in localStorage.
// ============================================================

// ---------- Profiles (several people on one device) ----------
// The first profile keeps the original key so existing data is not lost.
const PROFILES_KEY = "cfaStudy_profiles";
const DEFAULT_PROFILE = { id: "default", name: "Me", color: 0, pinHash: null, createdAt: null };

function loadProfiles() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");
    if (p && Array.isArray(p.list) && p.list.length) return p;
  } catch (e) { /* ignore */ }
  return { active: "default", list: [{ ...DEFAULT_PROFILE, createdAt: dateToStrSafe() }] };
}
function dateToStrSafe() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function saveProfiles() { try { localStorage.setItem(PROFILES_KEY, JSON.stringify(PROFILES)); } catch (e) { /* ignore */ } }
function profileKey(id) { return id === "default" ? "cfaStudy_v1" : `cfaStudy_p_${id}`; }
function activeProfile() { return PROFILES.list.find(p => p.id === PROFILES.active) || PROFILES.list[0]; }

let PROFILES = loadProfiles();
if (!PROFILES.list.some(p => p.id === PROFILES.active)) PROFILES.active = PROFILES.list[0].id;
let STORAGE_KEY = profileKey(PROFILES.active);
const DATA_VERSION = 4;

// ---------- Date helpers (local time, "YYYY-MM-DD") ----------
function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() { return dateToStr(new Date()); }
function strToDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = strToDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}
function daysBetween(a, b) {
  return Math.round((strToDate(b) - strToDate(a)) / 86400000);
}
function prettyDate(s) {
  if (!s) return "";
  return strToDate(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------- Empty data for a first-time user ----------
function defaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      examDate: "2027-05-13",
      startDate: "2026-11-16",
      dailyNewLimit: null,     // null = no limit
      dailyReviewLimit: null,
      lastBackup: null,
      theme: "light"           // "light" (default) | "dark" | "system"
    },
    chapters: [],
    flashcards: [],
    questions: [],
    practiceLog: [],          // scores from CFA Learning Ecosystem
    lesMistakes: [],          // missed Learning Ecosystem questions (references only)
    reading: {},              // per module: { schweser: bool, curriculum: bool }
    qbt: {},                  // Question Bank tracker: { fileId: { count, marks } }
    mocks: [],                // finished mock exams
    activeMock: null,         // mock in progress (survives a page reload)
    dailyLog: {}
  };
}

// Make sure every question has all fields (older data had fewer)
function normalizeQuestion(q) {
  return {
    level: "exam", los: "", explanation: "", whyNot: "", trap: "", calc: "", vi: "",
    source: "self", builtIn: false, flagged: false,
    attempts: [], inMistakeLog: false, correctStreak: 0, chapter: null,
    ...q
  };
}

// Built-in (starter) questions: add new ones, update the TEXT of existing
// ones (so corrections reach you) but keep YOUR attempts and progress.
function syncBuiltinQuestions(data) {
  if (typeof STARTER_QUESTIONS === "undefined") return;
  const starterIds = new Set(STARTER_QUESTIONS.map(s => s.id));
  // Remove built-in questions that were retired (e.g. GIPS, no longer in Level I 2027)
  data.questions = data.questions.filter(q => !q.builtIn || starterIds.has(q.id));
  const byId = new Map(data.questions.map(q => [q.id, q]));
  STARTER_QUESTIONS.forEach(s => {
    const content = {
      id: s.id, topic: s.topic, level: s.level, los: s.los || "", chapter: s.module || null,
      question: s.q, choices: { A: s.A, B: s.B, C: s.C }, answer: s.ans,
      explanation: s.why, whyNot: s.whyNot || "", trap: s.trap || "",
      calc: s.calc || "", vi: s.vi || "", exhibit: s.exhibit || null, source: "starter", builtIn: true
    };
    const existing = byId.get(s.id);
    if (existing) Object.assign(existing, content);
    else data.questions.push(normalizeQuestion({ ...content, createdAt: todayStr() }));
  });
}

// The official Learning Modules become the chapter list of every topic.
// Your status on a module is kept; extra chapters you added yourself stay too.
const STATUS_RANK = { not_started: 0, learning: 1, done: 2, reviewed: 3 };

// One-time move from the 2026 module list to the 2027 one
function migrateTo2027(data) {
  const old = data.chapters.filter(c => c.module);
  const keep = data.chapters.filter(c => !c.module);
  const status = {}, reading = {};
  old.forEach(c => newModulesForOld(c.id).forEach(nid => {
    if (!status[nid] || STATUS_RANK[c.status] > STATUS_RANK[status[nid].status]) status[nid] = c;
  }));
  Object.entries(data.reading || {}).forEach(([oid, r]) => newModulesForOld(oid).forEach(nid => {
    reading[nid] = { schweser: !!(r.schweser || (reading[nid] || {}).schweser), curriculum: !!(r.curriculum || (reading[nid] || {}).curriculum) };
  }));
  data.chapters = keep.concat(Object.entries(status).map(([nid, c]) => ({ ...c, id: nid })));
  data.reading = reading;
  data.curriculumYear = CURRICULUM_YEAR;
}

function syncModules(data) {
  if (typeof MODULES === "undefined") return;
  if (data.curriculumYear !== CURRICULUM_YEAR && data.chapters.some(c => c.module)) migrateTo2027(data);
  data.curriculumYear = CURRICULUM_YEAR;
  const valid = new Set(MODULES.map(m => m.id));
  data.chapters = data.chapters.filter(c => !c.module || valid.has(c.id));
  const byId = new Map(data.chapters.map(c => [c.id, c]));
  MODULES.forEach(m => {
    const c = byId.get(m.id);
    if (c) { c.title = m.title; c.order = m.n; c.topic = m.topic; c.module = true; }
    else data.chapters.push({ id: m.id, topic: m.topic, order: m.n, title: m.title, status: "not_started", startedAt: null, doneAt: null, module: true });
  });
  data.reading = data.reading || {};
}

function upgrade(parsed) {
  const base = defaultData();
  const data = {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...(parsed.settings || {}) },
    version: DATA_VERSION
  };
  // v3: bright light theme becomes the default (was "follow the device")
  if ((parsed.version || 1) < 3 && data.settings.theme === "system") data.settings.theme = "light";
  data.questions = (data.questions || []).map(normalizeQuestion);
  syncBuiltinQuestions(data);
  syncModules(data);
  return data;
}

// ---------- Load & save ----------
let DATA = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return upgrade(raw ? JSON.parse(raw) : {});
  } catch (e) {
    console.error("Could not read saved data:", e);
    return upgrade({});
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
    return true;
  } catch (e) {
    if (typeof toast === "function") toast("Could not save — storage may be full. Export a backup now.", "error");
    return false;
  }
}

// ---------- Export: download a .json backup file ----------
function exportData() {
  DATA.settings.lastBackup = todayStr();
  saveData();
  const backup = { app: "cfa-study", profile: activeProfile().name, exportedAt: new Date().toISOString(), data: DATA };
  // Question packs are not copied into the backup (they are large and can be imported again)
  if (typeof QBI !== "undefined") { const own = Object.values(QBI).filter(r => r.source !== "package"); if (own.length) backup.qbImport = own; }
  const safeName = activeProfile().name.replace(/[^\w-]+/g, "_").slice(0, 20);
  downloadFile(`cfa-backup-${safeName}-${todayStr()}.json`, JSON.stringify(backup, null, 2), "application/json");
}

function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Import: read a .json backup file ----------
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JSON.parse(reader.result);
        if (backup.app !== "cfa-study" || !backup.data) throw new Error("This is not a CFA Study backup file.");
        const d = backup.data;
        if (!Array.isArray(d.flashcards) || !Array.isArray(d.questions) || !Array.isArray(d.chapters)) {
          throw new Error("Backup file is damaged (missing lists).");
        }
        DATA = upgrade(d);
        saveData();
        if (Array.isArray(backup.qbImport) && typeof qbiReplaceAll === "function") await qbiReplaceAll(backup.qbImport);
        resolve(`${DATA.chapters.length} chapters, ${DATA.flashcards.length} cards, ${DATA.questions.length} questions restored.`);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

// ---------- Small utilities ----------
function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


// ---------- Profile actions ----------
async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cfa-study:" + pin));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function switchProfile(id) {
  saveData();
  PROFILES.active = id;
  saveProfiles();
  STORAGE_KEY = profileKey(id);
  DATA = loadData();
  saveData();
}

function createProfile(name, pinHash, hideTests) {
  const id = makeId("u").replace(/^u_/, "");
  PROFILES.list.push({ id, name, color: PROFILES.list.length % 6, pinHash: pinHash || null, createdAt: todayStr(), hideTests: !!hideTests });
  saveProfiles();
  return id;
}

function deleteProfile(id) {
  if (PROFILES.list.length <= 1) return false;
  try { localStorage.removeItem(profileKey(id)); } catch (e) { /* ignore */ }
  if (typeof qbiClearProfile === "function") qbiClearProfile(id);
  if (typeof fwClearProfile === "function") fwClearProfile(id);
  PROFILES.list = PROFILES.list.filter(p => p.id !== id);
  if (PROFILES.active === id) switchProfile(PROFILES.list[0].id);
  saveProfiles();
  return true;
}

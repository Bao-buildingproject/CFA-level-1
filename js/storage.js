// ============================================================
// storage.js — save / load / export / import all study data
// All data lives in ONE object, stored under ONE key in localStorage.
// ============================================================

const STORAGE_KEY = "cfaStudy_v1";
const DATA_VERSION = 3;

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
  const byId = new Map(data.questions.map(q => [q.id, q]));
  STARTER_QUESTIONS.forEach(s => {
    const content = {
      id: s.id, topic: s.topic, level: s.level, los: s.los,
      question: s.q, choices: { A: s.A, B: s.B, C: s.C }, answer: s.ans,
      explanation: s.why, whyNot: s.whyNot || "", trap: s.trap || "",
      calc: s.calc || "", vi: s.vi || "", source: "starter", builtIn: true
    };
    const existing = byId.get(s.id);
    if (existing) Object.assign(existing, content);
    else data.questions.push(normalizeQuestion({ ...content, createdAt: todayStr() }));
  });
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
  const backup = { app: "cfa-study", exportedAt: new Date().toISOString(), data: DATA };
  downloadFile(`cfa-backup-${todayStr()}.json`, JSON.stringify(backup, null, 2), "application/json");
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
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        if (backup.app !== "cfa-study" || !backup.data) throw new Error("This is not a CFA Study backup file.");
        const d = backup.data;
        if (!Array.isArray(d.flashcards) || !Array.isArray(d.questions) || !Array.isArray(d.chapters)) {
          throw new Error("Backup file is damaged (missing lists).");
        }
        DATA = upgrade(d);
        saveData();
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

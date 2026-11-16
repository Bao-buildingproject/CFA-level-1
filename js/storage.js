// ============================================================
// storage.js — save / load / export / import all study data
// All data lives in ONE object, stored under ONE key in localStorage.
// ============================================================

const STORAGE_KEY = "cfaStudy_v1";
const DATA_VERSION = 1;

// ---------- Date helpers (local time, "YYYY-MM-DD") ----------
function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() {
  return dateToStr(new Date());
}
function strToDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight
}
function addDays(s, n) {
  const d = strToDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}
// Whole days from date string a to date string b
function daysBetween(a, b) {
  return Math.round((strToDate(b) - strToDate(a)) / 86400000);
}

// ---------- Empty data for a first-time user ----------
function defaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      examDate: "2027-05-13",   // change here if your real exam date differs
      startDate: "2026-11-16",
      dailyNewLimit: null,      // null = no limit
      dailyReviewLimit: null,   // null = no limit
      lastBackup: null
    },
    chapters: [],
    flashcards: [],
    questions: [],
    practiceLog: [],   // scores from CFA Learning Ecosystem practice sets
    lesMistakes: [],   // references to questions missed on Learning Ecosystem
    dailyLog: {}
  };
}

// Make user text safe to show inside HTML (stops "<" breaking the page)
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- Load & save ----------
let DATA = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Fill in any missing parts (useful when the app gets new features)
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) }
    };
  } catch (e) {
    console.error("Could not read saved data:", e);
    return defaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
    return true;
  } catch (e) {
    alert("Could not save! Storage may be full. Please export a backup now.");
    return false;
  }
}

// ---------- Export: download a .json backup file ----------
function exportData() {
  DATA.settings.lastBackup = todayStr();
  saveData();
  const backup = {
    app: "cfa-study",
    exportedAt: new Date().toISOString(),
    data: DATA
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cfa-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Import: read a .json backup file ----------
// Returns a Promise that resolves to a short summary text.
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        if (backup.app !== "cfa-study" || !backup.data) {
          throw new Error("This is not a CFA Study backup file.");
        }
        const d = backup.data;
        if (!Array.isArray(d.flashcards) || !Array.isArray(d.questions) || !Array.isArray(d.chapters)) {
          throw new Error("Backup file is damaged (missing lists).");
        }
        DATA = { ...defaultData(), ...d, settings: { ...defaultData().settings, ...d.settings } };
        saveData();
        resolve(`${DATA.chapters.length} chapters, ${DATA.flashcards.length} cards, ${DATA.questions.length} questions restored.`);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

// ---------- Simple unique id, e.g. "c_1731745200000_k3" ----------
function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

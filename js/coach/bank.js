// ============================================================
// coach/bank.js — loader for the Hoa Tiêu (Compass) diagnostic questions.
// Written for this app (original, not copied from CFA Institute or any provider).
// One file per topic: js/coach/q-<topic>.js. Rows are listed in MIXED order of difficulty.
// Row: [difficulty 1|2|3, module number, skill tag, question, CORRECT, wrong1, wrong2, why, "c" if a calculation]
//   wrong1 is the typical trap (a formula slip for "c" rows, a conceptual mix-up otherwise).
// Each row is registered in STARTER_QUESTIONS (so Practice and Mock exams can use it too) with
// extra fields the Coach reads: skill, diff, est (seconds), isCalc, src = "coach", trapKey (letter of wrong1).
// ============================================================
const COACH_LEVEL = { 1: "foundation", 2: "application", 3: "exam" };
const COACH_EST = { 1: 60, 2: 90, 3: 130 };          // estimated seconds per question
const COACH_COUNT = {};
function coachAddQ(topic, rows) {
  rows.forEach(r => {
    const [diff, mod, skill, q, good, bad1, bad2, why, flag] = r;
    const moduleId = `${topic}-${String(mod).padStart(2, "0")}`;
    const n = (COACH_COUNT[moduleId] = (COACH_COUNT[moduleId] || 0) + 1);
    const id = `cq-${moduleId}-${String(n).padStart(2, "0")}`;
    const p = placeAnswer(id, [good, bad1, bad2], "A", "");
    STARTER_QUESTIONS.push({
      id, module: moduleId, topic, level: COACH_LEVEL[diff], los: skill,
      q, A: p.choices[0], B: p.choices[1], C: p.choices[2], ans: p.ans, why, whyNot: "", trap: "", calc: "",
      skill, diff, est: COACH_EST[diff] + (flag === "c" ? 25 : 0), isCalc: flag === "c", src: "coach",
      trapKey: "ABC"[p.choices.indexOf(bad1)]          // the letter of the typical-mistake answer, for error analysis
    });
  });
}
if (typeof globalThis !== "undefined") globalThis.coachAddQ = coachAddQ;

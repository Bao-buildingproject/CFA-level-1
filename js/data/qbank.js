// ============================================================
// qbank.js — loader for the built-in question bank.
// All questions are ORIGINAL practice questions written for this
// app (not copied from CFA Institute or Kaplan Schweser materials).
// Row format: [level, question, A, B, C, answer, why, whyNot, trap, calc]
// level: f = Foundation, a = Application, e = Exam style
// ============================================================

const STARTER_QUESTIONS = [];
const LEVEL_CODE = { f: "foundation", a: "application", e: "exam" };

// Small stable hash so every question always gets the same answer position
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Spread correct answers evenly over A/B/C (deterministic per question id).
// The letters mentioned in "whyNot" are remapped to the new positions.
// Questions whose choices use letters as names (e.g. "Portfolio A") keep their order.
function placeAnswer(id, choices, ans, whyNot) {
  const letters = ["A", "B", "C"];
  const usesLetterNames = c => /\b(Portfolio|Fund|Country|Asset|Stock|Project|Bond|Firm|Company)\s[ABC]\b/.test(c) || /^[ABC] (has|is|and)\b/.test(c);
  if (choices.some(usesLetterNames)) return { choices, ans, whyNot };
  const target = hashStr(id) % 3;
  const from = letters.indexOf(ans);
  const others = [0, 1, 2].filter(i => i !== from);
  const order = [];               // order[newPos] = oldPos
  let k = 0;
  for (let pos = 0; pos < 3; pos++) order[pos] = pos === target ? from : others[k++];
  const map = {};                 // old letter -> new letter
  order.forEach((oldPos, newPos) => { map[letters[oldPos]] = letters[newPos]; });
  return {
    choices: order.map(i => choices[i]),
    ans: letters[target],
    whyNot: (whyNot || "").replace(/(?<![\w(])([ABC])(?![\w)])/g, m => map[m])
  };
}

function addQ(moduleId, rows) {
  const topic = moduleId.split("-")[0];
  const start = STARTER_QUESTIONS.filter(q => q.module === moduleId).length;
  rows.forEach((r, i) => {
    const [lv, q, A, B, C, ans, why, whyNot, trap, calc] = r;
    const id = `b-${moduleId}-${String(start + i + 1).padStart(2, "0")}`;
    const p = placeAnswer(id, [A, B, C], ans, whyNot);
    STARTER_QUESTIONS.push({
      id, module: moduleId, topic, level: LEVEL_CODE[lv] || "exam",
      q, A: p.choices[0], B: p.choices[1], C: p.choices[2], ans: p.ans,
      why, whyNot: p.whyNot, trap: trap || "", calc: calc || ""
    });
  });
}

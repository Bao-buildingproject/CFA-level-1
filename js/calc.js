// ============================================================
// calc.js — the BA II Plus on screen.
//   #/calc: the calculator, the values it has stored, the keys you pressed,
//           worked CFA examples that press the keys for you, and a worksheet map.
//   Every other page: a small calculator button that opens it in a panel.
// The logic is js/baii.js. Like a real calculator on the desk, it keeps its
// memory on this device for every account (localStorage), until you reset it.
// ============================================================

const CALC_KEY = "cfaStudy_baii", CALC_POS = "cfaStudy_baii_pos";   // memory; where the window was dragged to
const CALC = { eng: null, tape: [], running: false, saveT: 0, mounted: false };

function calcEng() {
  if (!CALC.eng) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(CALC_KEY) || "null"); } catch (e) { /* ignore */ }
    CALC.eng = BAII.create(saved);
  }
  return CALC.eng;
}
function calcSave() {
  clearTimeout(CALC.saveT);
  CALC.saveT = setTimeout(() => { try { localStorage.setItem(CALC_KEY, JSON.stringify(calcEng().save())); } catch (e) { /* ignore */ } }, 200);
}

// ---------- the device ----------
const CALC_IND = [["second", "2ND"], ["inv", "INV"], ["hyp", "HYP"], ["compute", "COMPUTE"], ["enter", "ENTER"], ["set", "SET"], ["del", "DEL"], ["ins", "INS"], ["bgn", "BGN"], ["rad", "RAD"]];
function calcKeyClass(id) {
  if ("0123456789".includes(id) || id === "." || id === "neg") return "ba-num";
  if (["n", "iy", "pv", "pmt", "fv"].includes(id)) return "ba-tvm";
  if (["+", "-", "*", "/"].includes(id)) return "ba-op";
  if (id === "=") return "ba-op ba-eq";
  if (id === "2nd") return "ba-sec";
  if (id === "cpt") return "ba-cpt";
  return "";
}
function calcDeviceHtml(where) {
  const keys = BAII.LAYOUT.map(row => row.map(([id, label, sec]) => {
    const aria = `${label.replace("|", " ")}${sec ? `, second function ${sec}` : ""}`;
    return `<button type="button" class="ba-k ${calcKeyClass(id)}" data-k="${esc(id)}" aria-label="${esc(aria)}"><span class="ba-2">${sec ? esc(sec) : ""}</span><span class="ba-cap">${esc(label)}</span></button>`;
  }).join("")).join("");
  const head = where === "pop"
    ? `<div class="ba-head ba-drag" data-drag><span class="ba-name">BA II Plus</span>
        <button type="button" class="ba-hbtn ba-x ba-fold" data-calcmini>${icon("chevron", 15)}</button>
        <a class="ba-hbtn" href="#/calc" data-calcfull title="Open the full page">${icon("expand", 14)}<span>Full page</span></a>
        <button type="button" class="ba-hbtn ba-x" data-calcclose aria-label="Close the calculator" title="Close">${icon("x", 16)}</button></div>`
    : `<div class="ba-head"><span class="ba-name">BA II Plus</span><span class="ba-sub">CFA exam keystrokes</span></div>`;
  return `<div class="ba" data-ba="${where}">
    ${head}
    <div class="ba-lcd">
      <div class="ba-ind" aria-hidden="true">${CALC_IND.map(([k, t]) => `<i data-i="${k}">${t}</i>`).join("")}</div>
      <div class="ba-main" role="status" aria-live="polite"><span class="ba-lab"></span><span class="ba-val">0.00</span></div>
      <div class="ba-foot" aria-hidden="true"><i data-i="up">▲</i><i data-i="down">▼</i><i data-i="star">✱</i><span class="ba-msg"></span></div>
    </div>
    <div class="ba-keys">${keys}</div>
  </div>`;
}

function calcPaint() {
  const d = calcEng().display();
  document.querySelectorAll(".ba").forEach(el => {
    el.querySelector(".ba-lab").textContent = d.label;
    el.querySelector(".ba-val").textContent = d.value;
    Object.entries(d.ind).forEach(([k, on]) => el.querySelectorAll(`[data-i="${k}"]`).forEach(i => i.classList.toggle("on", !!on)));
    el.querySelector('[data-i="star"]').classList.toggle("on", !!d.computed);
    el.querySelector(".ba-msg").textContent = d.err ? d.errText : "";
    el.querySelector('[data-k="2nd"]').classList.toggle("armed", !!d.ind.second);
    el.classList.toggle("ba-error", !!d.err);
  });
  const regs = document.getElementById("calc-regs");
  if (regs) regs.innerHTML = calcRegsHtml();
  const tape = document.getElementById("calc-tape");
  if (tape) tape.innerHTML = calcTapeHtml();
}

// ---------- pressing keys ----------
function calcPress(k) {
  const eng = calcEng(), sec = eng.display().ind.second && k !== "2nd";
  eng.press(k);
  calcLog(k, sec);
  calcPaint();
  calcSave();
}
function calcFlash(k) {
  document.querySelectorAll(`.ba [data-k="${CSS.escape(k)}"]`).forEach(b => { b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 140); });
}
// the keys pressed, as the chips a textbook prints: numbers grouped, 2nd functions by their name
function calcLog(k, sec) {
  const t = CALC.tape, last = t[t.length - 1], K = BAII.KEY[k];
  if (k === "2nd") return;
  if (!sec && ("0123456789".includes(k) || k === ".")) {
    if (last && last.num && last.open) last.t += k; else t.push({ t: k, num: true, open: true });
  } else {
    if (last) last.open = false;
    t.push({ t: sec ? (K.second || K.label) : K.label, sec });
  }
  if (t.length > 80) t.splice(0, t.length - 80);
}
const calcKbd = (t, cls) => `<kbd${cls ? ` class="${cls}"` : ""}>${esc(t)}</kbd>`;
function calcTapeHtml() {
  if (!CALC.tape.length) return `<p class="text-3 small">The keys you press appear here, in the order you pressed them.</p>`;
  return `<div class="calc-chips">${CALC.tape.map(x => x.sec ? `<span class="calc-pair">${calcKbd("2ND", "sec")}${calcKbd(x.t)}</span>` : calcKbd(x.t, x.num ? "num" : "")).join("")}</div>`;
}

// ---------- what is stored ----------
function calcRegsHtml() {
  const R = calcEng().registers(), f = R.f, t = R.tvm;
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const flows = R.cf.list.length
    ? R.cf.list.slice(0, 8).map((g, j) => `C${String(j + 1).padStart(2, "0")} ${f(g.c)}${g.f !== 1 ? ` × ${g.f}` : ""}`).join(" · ") + (R.cf.list.length > 8 ? ` · +${R.cf.list.length - 8} more` : "")
    : "none";
  return `<div class="calc-regs">
    <div class="calc-reg"><div class="stat-label">TVM</div><dl>
      ${row("N", f(t.N))}${row("I/Y", f(t.IY))}${row("PV", f(t.PV))}${row("PMT", f(t.PMT))}${row("FV", f(t.FV))}
      ${row("P/Y", f(t.PY))}${row("C/Y", f(t.CY))}${row("Mode", t.bgn ? "BGN" : "END")}</dl></div>
    <div class="calc-reg"><div class="stat-label">Cash flows</div><dl>
      ${row("CF0", f(R.cf.CF0))}${row("I", f(R.cf.I))}${row("NPV", f(R.cf.NPV))}${row("IRR", f(R.cf.IRR))}</dl>
      <p class="calc-flows">${esc(flows)}</p></div>
    <div class="calc-reg"><div class="stat-label">Memories</div><dl class="calc-mem">${R.mem.map((v, i) => row(`M${i}`, f(v))).join("")}</dl></div>
    <div class="calc-reg"><div class="stat-label">Settings</div><dl>
      ${row("DEC", R.fmt.dec === 9 ? "floating" : R.fmt.dec)}${row("Order", R.fmt.aos ? "AOS" : "Chain")}${row("Angle", R.fmt.rad ? "RAD" : "DEG")}${row("Data points", R.data.length)}</dl></div>
  </div>`;
}

// ---------- worked examples ----------
// steps: key ids separated by spaces; "2nd:x" is 2ND then x; numbers are typed digit by digit;
// "set:X" presses 2ND SET until the display shows X (so it works whatever the setting was)
const CALC_RECIPES = [
  { id: "setup", title: "Set up for the exam", q: "Show more decimals and use the usual order of operations (AOS), as many candidates do.",
    steps: "2nd:. 9 enter down down down down set:AOS 2nd:cpt", ans: "DEC = 9 (floating decimals) and AOS: 2 + 3 × 4 = 14." },
  { id: "pv", title: "Present value of a single sum", q: "How much must you invest today to have 1,000 in 10 years at 5% a year?",
    steps: "2nd:fv 10 n 5 iy 0 pmt 1000 fv cpt pv", ans: "PV = −613.91: negative because you pay it out today." },
  { id: "pmt", title: "Mortgage payment", q: "A 200,000 loan over 30 years at 6% a year, paid monthly. What is the payment?",
    steps: "2nd:fv 360 n 0.5 iy 200000 pv 0 fv cpt pmt", ans: "PMT = −1,199.10, with N = 30 × 12 and I/Y = 6 ÷ 12 (P/Y left at 1)." },
  { id: "bgn", title: "Annuity due", q: "Five payments of 100, the first one today, at 10%. Present value?",
    steps: "2nd:pmt set:BGN 2nd:cpt 2nd:fv 5 n 10 iy 100 neg pmt 0 fv cpt pv 2nd:pmt set:END 2nd:cpt rcl pv", ans: "PV = 416.99. Then switch back to END payments; RCL PV shows the answer again." },
  { id: "iy", title: "Rate of return", q: "1,000 grows to 2,000 in 10 years. What is the annual rate?",
    steps: "2nd:fv 10 n 1000 neg pv 0 pmt 2000 fv cpt iy", ans: "I/Y = 7.18% a year." },
  { id: "ytm", title: "Bond yield to maturity", q: "A 10-year bond with a 5% annual coupon (par 1,000) trades at 950. Yield to maturity?",
    steps: "2nd:fv 10 n 950 neg pv 50 pmt 1000 fv cpt iy", ans: "I/Y = 5.67%." },
  { id: "npv", title: "NPV and IRR", q: "Pay 100 today, receive 50 a year for 3 years. NPV at 10%, and IRR?",
    steps: "cf 2nd:ce 100 neg enter down 50 enter down 3 enter npv 10 enter down cpt irr cpt", ans: "NPV = 24.34 and IRR = 23.38%. F01 = 3 repeats the 50 three times." },
  { id: "ear", title: "Effective annual rate", q: "12% a year compounded monthly. What is the effective annual rate?",
    steps: "2nd:2 12 enter down down 12 enter up cpt", ans: "EFF = 12.68%." },
  { id: "amort", title: "Loan amortization", q: "For the 200,000 mortgage: balance after the first year, and the principal and interest paid in it?",
    steps: "2nd:fv 360 n 0.5 iy 200000 pv 0 fv cpt pmt 2nd:pv 1 enter down 12 enter down down down", ans: "BAL = 197,543.98, PRN = −2,456.02, INT = −11,933.19 for payments 1 to 12." },
  { id: "stat", title: "Mean and standard deviation", q: "Data: 2, 4, 4, 4, 5, 5, 7, 9. Mean, and sample and population standard deviation?",
    steps: "2nd:7 2nd:ce 2 enter down down 4 enter down 3 enter down 5 enter down 2 enter down 7 enter down down 9 enter 2nd:8 set:1-V down down down down", ans: "n = 8, x̄ = 5, Sx = 2.14, σx = 2.00. Y is the frequency: 4 appears 3 times." },
  { id: "reg", title: "Linear regression", q: "Fit y = a + bx to (1, 2), (2, 4), (3, 5), (4, 4), (5, 5).",
    steps: "2nd:7 2nd:ce 1 enter down 2 enter down 2 enter down 4 enter down 3 enter down 5 enter down 4 enter down 4 enter down 5 enter down 5 enter 2nd:8 set:LIN down down down down down down down down down down", ans: "a = 2.20, b = 0.60, r = 0.77 (press ↑ to read a and b)." },
  { id: "growth", title: "Compound growth rate", q: "Sales grew from 100 to 150 over 5 years. Annual growth rate?",
    steps: "2nd:5 2nd:ce 100 enter down 150 enter down down 5 enter up cpt", ans: "%CH = 8.45% a year." }
];
function calcStepsHtml(steps) {
  return steps.split(/\s+/).map(t => {
    if (t.startsWith("2nd:")) { const k = BAII.KEY[t.slice(4)]; return `<span class="calc-pair">${calcKbd("2ND", "sec")}${calcKbd(k.second || k.label)}</span>`; }
    if (t.startsWith("set:")) return `<span class="calc-pair">${calcKbd("2ND", "sec")}${calcKbd("SET")}<span class="calc-to">→ ${esc(t.slice(4))}</span></span>`;
    if (/^[0-9.]+$/.test(t)) return calcKbd(t, "num");
    return calcKbd(BAII.KEY[t] ? BAII.KEY[t].label : t);
  }).join("");
}
function calcActions(steps) {
  const out = [];
  steps.split(/\s+/).forEach(t => {
    if (t.startsWith("2nd:")) out.push("2nd", t.slice(4));
    else if (t.startsWith("set:")) out.push({ until: t.slice(4) });
    else if (/^[0-9.]+$/.test(t)) out.push(...t);
    else out.push(t);
  });
  return out;
}
const calcSleep = ms => new Promise(r => setTimeout(r, ms));
async function calcRun(id, btn) {
  const r = CALC_RECIPES.find(x => x.id === id);
  if (!r || CALC.running) return;
  CALC.running = true;
  document.querySelectorAll("[data-run]").forEach(b => { b.disabled = true; });
  if (btn) btn.closest(".calc-rec").classList.add("running");
  const dev = document.querySelector('.ba[data-ba="page"]');
  if (dev && window.matchMedia("(max-width: 900px)").matches) dev.scrollIntoView({ behavior: "smooth", block: "start" });
  const tap = async k => { calcFlash(k); calcPress(k); await calcSleep(150); };
  try {
    await tap("ce"); await tap("ce");
    for (const a of calcActions(r.steps)) {
      if (!document.body.contains(btn)) break;          // the page was left
      if (typeof a === "object") {
        for (let i = 0; i < 6 && calcEng().display().label !== a.until; i++) { await tap("2nd"); await tap("enter"); }
      } else await tap(a);
    }
  } finally {
    CALC.running = false;
    document.querySelectorAll("[data-run]").forEach(b => { b.disabled = false; });
    if (btn && btn.isConnected) btn.closest(".calc-rec").classList.remove("running");
  }
}

// ---------- the page ----------
const CALC_SHEETS = [
  ["N, I/Y, PV, PMT, FV", "", "Time value of money: key in a value then the key to store it; CPT then a key to solve it."],
  ["P/Y", "I/Y", "Payments and compounding periods per year (P/Y, C/Y). Most CFA work keeps both at 1."],
  ["BGN", "PMT", "END or BGN payments; 2ND SET switches."],
  ["CLR TVM", "FV", "Sets N, I/Y, PV, PMT and FV to 0. Do it before every new problem."],
  ["CF · NPV · IRR", "", "CF0, C01, F01…; NPV asks for I then CPT; IRR: CPT."],
  ["AMORT", "PV", "P1, P2, then BAL, PRN, INT for those payments."],
  ["ICONV", "2", "NOM, EFF, C/Y: enter two, CPT the third."],
  ["DATA · STAT", "7 · 8", "X01, Y01… then LIN, Ln, EXP, PWR or 1-V; n, x̄, Sx, σx, ȳ, Sy, σy, a, b, r, X', Y'."],
  ["Δ%", "5", "OLD, NEW, %CH, #PD: growth over several periods."],
  ["DATE", "1", "DT1, DT2, DBD (days between), ACT or 360. Dates as MM.DDYY."],
  ["PROFIT · BRKEVN", "3 · 6", "Cost, selling price, margin; fixed and variable cost, price, profit, quantity."],
  ["MEM · STO · RCL", "0", "Ten memories M0–M9; STO 1 stores, RCL 1 recalls; RCL PV shows a TVM value."],
  ["FORMAT", ".", "Decimals (9 = floating), DEG/RAD, date and number styles, Chain or AOS."],
  ["CLR WORK · QUIT · RESET", "CE|C · CPT · +|−", "Clear the open worksheet; leave it; reset everything (then ENTER)."]
];
function renderCalc() {
  CALC.running = false;
  view.innerHTML = `
    ${pageHeader("BA II Plus", "The financial calculator allowed in the CFA exam, key for key. Practise the keystrokes here; it keeps its memory on this device, like the real one.", `<button class="btn btn-ghost btn-sm" id="calc-reset">${icon("trash", 15)} Reset calculator</button>`, "Calculator")}
    <div class="calc-page">
      <div class="calc-dev">
        ${calcDeviceHtml("page")}
        <p class="text-3 small calc-kbd-hint">On a keyboard: digits, + − * /, ( ), ^ for yˣ, Enter, Backspace for →, Delete for CE|C, ↑ ↓.</p>
      </div>
      <div class="calc-side">
        <section class="card"><div class="card-head"><div><h2>Stored values</h2><p class="text-2 small">What the calculator holds right now.</p></div></div><div id="calc-regs"></div></section>
        <section class="card"><div class="card-head"><div><h2>Keys pressed</h2><p class="text-2 small">Check your keystrokes against the worked examples.</p></div>
          <button class="btn btn-ghost btn-sm" id="calc-tape-clear">Clear</button></div><div id="calc-tape"></div></section>
      </div>
    </div>
    <h2 class="section-title section">Worked examples</h2>
    <div class="calc-recipes">${CALC_RECIPES.map(r => `
      <article class="card calc-rec">
        <h3>${esc(r.title)}</h3>
        <p class="text-2 small">${esc(r.q)}</p>
        <div class="calc-steps">${calcStepsHtml(r.steps)}</div>
        <p class="calc-ans">${esc(r.ans)}</p>
        <button class="btn btn-secondary btn-sm" data-run="${r.id}">${icon("play", 14)} Press the keys for me</button>
      </article>`).join("")}</div>
    <section class="card section calc-ref">
      <div class="card-head"><div><h2>Worksheets at a glance</h2><p class="text-2 small">2ND functions are printed above the keys. BOND and DEPR are not included here.</p></div></div>
      <div class="table-wrap"><table class="calc-table"><thead><tr><th>Function</th><th>2ND over</th><th>What it does</th></tr></thead>
        <tbody>${CALC_SHEETS.map(([a, b, c]) => `<tr><td><strong>${esc(a)}</strong></td><td class="mono">${esc(b || "—")}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  calcPaint();
  document.getElementById("calc-tape-clear").onclick = () => { CALC.tape = []; calcPaint(); };
  document.getElementById("calc-reset").onclick = async () => {
    if (!await confirmDialog({ title: "Reset the calculator?", message: "Every stored value, memory, cash flow, data point and setting goes back to the factory state (2ND RESET, ENTER).", confirmText: "Reset" })) return;
    ["ce", "2nd", "neg", "enter"].forEach(calcPress); CALC.tape = []; calcPaint(); toast("Calculator reset");
  };
  view.querySelectorAll("[data-run]").forEach(b => b.onclick = () => calcRun(b.dataset.run, b));
}

// ---------- the floating calculator on other pages ----------
// Like the CFA Tutor's owl: the button can be dragged anywhere and lands on the nearest side; the
// calculator opens in a small window that can be moved around (on phones too) and folded down to
// its display, and it stays open while you move from page to page.
const CALC_FAB = "cfaStudy_baii_fab";      // { side: "left" | "right", y: share of the window height }
const CALC_MINI = "cfaStudy_baii_mini";    // "1" when the window is folded down to its display
const calcClamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));
function calcGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function calcPut(k, v) { try { v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k); } catch (e) { /* ignore */ } }
const calcIsPhone = () => window.matchMedia("(max-width: 767px)").matches;

function calcMount() {
  if (CALC.mounted) return;
  CALC.mounted = true;
  const fab = document.createElement("button");
  fab.className = "calc-fab"; fab.id = "calc-fab"; fab.type = "button";
  fab.setAttribute("aria-label", "Open the BA II Plus calculator (drag to move)"); fab.title = "BA II Plus — drag to move";
  fab.innerHTML = icon("calc", 22);
  const pop = document.createElement("div");
  pop.className = "calc-pop"; pop.id = "calc-pop"; pop.hidden = true;
  pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "BA II Plus calculator");
  pop.innerHTML = calcDeviceHtml("pop");
  pop.classList.toggle("mini", calcGet(CALC_MINI) === 1);
  document.body.append(fab, pop);
  calcDragFab(fab);
  pop.querySelector("[data-calcclose]").onclick = calcClose;
  pop.querySelector("[data-calcfull]").onclick = () => calcClose();
  pop.querySelector("[data-calcmini]").onclick = () => {
    const mini = pop.classList.toggle("mini");
    calcPut(CALC_MINI, mini ? 1 : null);
    calcMiniLabel(pop);
    calcPlace(pop);
  };
  calcMiniLabel(pop);
  calcDrag(pop);
  // one listener for every key of every calculator on the page
  document.addEventListener("click", e => {
    const k = e.target.closest(".ba [data-k]");
    if (!k || CALC.running) return;
    calcPress(k.dataset.k);
  });
  document.addEventListener("keydown", calcOnKey);
  window.addEventListener("resize", () => { calcPlaceFab(); if (!pop.hidden) calcPlace(pop); });
}
function calcMiniLabel(pop) {
  const b = pop.querySelector("[data-calcmini]"), mini = pop.classList.contains("mini");
  b.setAttribute("aria-label", mini ? "Show the keys" : "Fold down to the display");
  b.title = mini ? "Show the keys" : "Fold down to the display";
}
function calcOpen() {
  const pop = document.getElementById("calc-pop");
  pop.hidden = false; document.getElementById("calc-fab").hidden = true;
  calcPlace(pop); calcPaint();
  if (!calcIsPhone()) pop.querySelector('[data-k="cpt"]').focus({ preventScroll: true });
}
function calcClose() {
  const pop = document.getElementById("calc-pop");
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  calcRoute();
}

// the button: where it was dragged to, kept clear of the phone's header and tab bar
function calcPlaceFab() {
  const fab = document.getElementById("calc-fab"), s = calcGet(CALC_FAB);
  if (!fab) return;
  if (!s) { fab.style.left = fab.style.top = fab.style.right = fab.style.bottom = ""; return; }
  const ph = calcIsPhone(), w = fab.offsetWidth || 46, h = fab.offsetHeight || 46, m = ph ? 10 : 18;
  fab.style.top = calcClamp(s.y * window.innerHeight, ph ? 64 : 12, window.innerHeight - (ph ? 84 : 12) - h) + "px";
  fab.style.left = (s.side === "left" ? m : window.innerWidth - w - m) + "px";
  fab.style.right = fab.style.bottom = "auto";
}
function calcDragFab(fab) {
  let st = null;
  fab.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const r = fab.getBoundingClientRect();
    st = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, moved: false };
    try { fab.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  fab.addEventListener("pointermove", e => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.moved) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return;
      st.moved = true; fab.classList.add("dragging");
    }
    fab.style.left = calcClamp(e.clientX - st.dx, 4, window.innerWidth - fab.offsetWidth - 4) + "px";
    fab.style.top = calcClamp(e.clientY - st.dy, 4, window.innerHeight - fab.offsetHeight - 4) + "px";
    fab.style.right = fab.style.bottom = "auto";
  });
  const end = () => {
    if (!st) return;
    if (st.moved) {
      fab.classList.remove("dragging");
      fab._dragEnd = Date.now();
      const r = fab.getBoundingClientRect();
      calcPut(CALC_FAB, { side: r.left + r.width / 2 < window.innerWidth / 2 ? "left" : "right", y: +(r.top / window.innerHeight).toFixed(4) });
      fab.classList.add("settling");
      calcPlaceFab();
      setTimeout(() => fab.classList.remove("settling"), 450);
    }
    st = null;
  };
  fab.addEventListener("pointerup", end);
  fab.addEventListener("pointercancel", end);
  fab.addEventListener("click", e => {
    if (fab._dragEnd && Date.now() - fab._dragEnd < 500) { e.preventDefault(); return; }
    calcOpen();
  });
}

// the window: where it was last dragged to on this kind of screen, kept inside the window
function calcPlace(pop) {
  const kind = calcIsPhone() ? "phone" : "desk", all = calcGet(CALC_POS) || {};
  const p = all[kind] || (kind === "desk" && typeof all.x === "number" ? all : null);
  pop.style.left = pop.style.top = pop.style.right = pop.style.bottom = "";
  if (!p) {                                  // not moved yet: open on the button's side
    const side = (calcGet(CALC_FAB) || {}).side;
    if (side === "left" && kind === "phone") { pop.style.left = "8px"; pop.style.right = "auto"; }
    if (side === "right" && kind === "desk") { pop.style.right = "24px"; pop.style.left = "auto"; }
    return;
  }
  const r = pop.getBoundingClientRect();
  pop.style.left = calcClamp(p.x, 4, window.innerWidth - r.width - 4) + "px";
  pop.style.top = calcClamp(p.y, 4, window.innerHeight - r.height - 4) + "px";
  pop.style.right = pop.style.bottom = "auto";
}
function calcDrag(pop) {
  const handle = pop.querySelector("[data-drag]");
  handle.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest("a, button")) return;
    const r = pop.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    pop.classList.add("dragging");
    const move = ev => {
      pop.style.left = calcClamp(ev.clientX - dx, 4, window.innerWidth - r.width - 4) + "px";
      pop.style.top = calcClamp(ev.clientY - dy, 4, window.innerHeight - r.height - 4) + "px";
      pop.style.right = pop.style.bottom = "auto";
    };
    const up = () => {
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      pop.classList.remove("dragging");
      const rr = pop.getBoundingClientRect(), all = calcGet(CALC_POS) || {};
      if (typeof all.x === "number") { all.desk = { x: all.x, y: all.y }; delete all.x; delete all.y; }
      all[calcIsPhone() ? "phone" : "desk"] = { x: Math.round(rr.left), y: Math.round(rr.top) };
      calcPut(CALC_POS, all);
    };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
  // double-click the title bar: back to the starting corner
  handle.addEventListener("dblclick", e => {
    if (e.target.closest("a, button")) return;
    const all = calcGet(CALC_POS) || {};
    delete all[calcIsPhone() ? "phone" : "desk"]; delete all.x; delete all.y;
    calcPut(CALC_POS, Object.keys(all).length ? all : null);
    calcPlace(pop);
  });
}

// keyboard: only while the calculator is on screen and you are not typing in a form
const CALC_KEYS = { "+": "+", "-": "-", "*": "*", "x": "*", "/": "/", "^": "pow", "(": "(", ")": ")", "%": "pct", "=": "=", ".": ".", ",": ".",
  Backspace: "back", Delete: "ce", ArrowUp: "up", ArrowDown: "down" };
function calcOnKey(e) {
  const onPage = currentRoute()[0] === "calc", pop = document.getElementById("calc-pop"), popOpen = pop && !pop.hidden;
  if ((!onPage && !popOpen) || e.ctrlKey || e.metaKey || e.altKey || CALC.running || document.body.classList.contains("gated")) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) || document.querySelector(".modal-overlay")) return;
  if (e.key === "Escape") { if (popOpen) { e.preventDefault(); calcClose(); } return; }
  let k = /^[0-9]$/.test(e.key) ? e.key : CALC_KEYS[e.key];
  if (e.key === "Enter") {
    if (t && t.closest && t.closest("button, a") && !t.closest(".ba")) return;    // Enter on a page button keeps its job
    k = calcEng().state().ui.mode ? "enter" : "=";
  }
  if (!k) return;
  e.preventDefault();
  calcFlash(k); calcPress(k);
}

// after every route: the button shows on pages without their own calculator
function calcRoute() {
  if (typeof BAII === "undefined") return;
  calcMount();
  const [route] = currentRoute(), gated = document.body.classList.contains("gated");
  const pop = document.getElementById("calc-pop"), fab = document.getElementById("calc-fab");
  if (route === "calc" || gated) pop.hidden = true;
  fab.hidden = gated || route === "calc" || !pop.hidden;
  if (!fab.hidden) calcPlaceFab();
}

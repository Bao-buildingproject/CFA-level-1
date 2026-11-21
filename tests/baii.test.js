// BA II Plus engine: keystrokes from CFA study material give the textbook answers.
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../js/baii.js");

// press a keystroke string on a calculator and return what the display shows
function calc(saved) {
  const c = B.create(saved);
  const run = str => { B.keys(str).forEach(k => c.press(k)); const d = c.display(); return [d.label, d.value].filter(Boolean).join(" "); };
  return { c, run, d: () => c.display() };
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
// an independent root finder for checking rates
function bisect(f, lo, hi) { let flo = f(lo); for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo <= 0) hi = m; else { lo = m; flo = fm; } } return (lo + hi) / 2; }

test("time value of money: the five keys and CPT", () => {
  const { run, c } = calc();
  assert.equal(run("2nd fv 10 n 5 iy 0 pmt 1000 fv cpt pv"), "PV= -613.91");
  assert.equal(c.display().computed, true);
  assert.equal(run("2nd fv 360 n 0.5 iy 200000 pv 0 fv cpt pmt"), "PMT= -1,199.10");
  assert.equal(run("2nd fv 10 n 1000 neg pv 0 pmt 2000 fv cpt iy"), "I/Y= 7.18");
  assert.equal(run("2nd fv 8 iy 100 neg pv 0 pmt 200 fv cpt n"), "N= 9.01");
  assert.equal(run("2nd fv 5 n 6 iy 0 pv 100 neg pmt cpt fv"), "FV= 563.71");
  // a bond's yield: 10 years, 5% annual coupon, price 950
  run("2nd fv 10 n 950 neg pv 50 pmt 1000 fv cpt iy");
  const ytm = bisect(r => -950 + 50 * (1 - (1 + r) ** -10) / r + 1000 * (1 + r) ** -10, 0.001, 0.5);
  near(c.state().tvm.IY, ytm * 100, 1e-9, "yield");
  // RCL shows a stored value
  assert.equal(run("rcl pv"), "PV= -950.00");
});

test("payments per year, xP/Y and BGN", () => {
  const { run, c } = calc();
  assert.equal(run("2nd iy 12 enter"), "P/Y= 12.00");
  assert.equal(run("down"), "C/Y= 12.00");
  run("2nd cpt");
  assert.equal(run("2nd fv 30 2nd n"), "360.00");
  assert.equal(run("n 6 iy 200000 pv 0 fv cpt pmt"), "PMT= -1,199.10");
  run("2nd iy 1 enter 2nd cpt");
  assert.equal(c.state().tvm.CY, 1);
  // annuity due
  assert.equal(run("2nd pmt"), "END");
  assert.equal(run("2nd enter"), "BGN");
  assert.equal(c.display().ind.bgn, true);
  assert.equal(run("2nd cpt 2nd fv 5 n 10 iy 100 neg pmt 0 fv cpt pv"), "PV= 416.99");
  run("2nd pmt 2nd enter 2nd cpt");
  assert.equal(c.state().tvm.bgn, false);
  // CLR TVM leaves P/Y and BGN alone
  run("2nd iy 4 enter 2nd cpt 2nd fv");
  assert.deepEqual([c.state().tvm.N, c.state().tvm.PV, c.state().tvm.PY], [0, 0, 4]);
});

test("cash flows: NPV and IRR", () => {
  const { run, c } = calc();
  assert.equal(run("cf 2nd ce 100 neg enter"), "CF0= -100.00");
  assert.equal(run("down 50 enter"), "C01= 50.00");
  assert.equal(run("down 3 enter"), "F01= 3.00");
  assert.equal(run("npv 10 enter"), "I= 10.00");
  assert.equal(run("down cpt"), "NPV= 24.34");
  assert.equal(run("irr cpt"), "IRR= 23.38");
  // uneven flows
  run("cf 2nd ce 1000 neg enter down 300 enter down down 400 enter down down 500 enter npv 8 enter down cpt");
  near(c.state().cf.NPV, -1000 + 300 / 1.08 + 400 / 1.08 ** 2 + 500 / 1.08 ** 3, 1e-9, "npv");
  run("irr cpt");
  const r = bisect(x => -1000 + 300 / (1 + x) + 400 / (1 + x) ** 2 + 500 / (1 + x) ** 3, 0, 0.5);
  near(c.state().cf.IRR, r * 100, 1e-9, "irr");
  // insert and delete a flow
  run("cf down 2nd down");
  assert.equal(c.state().cf.list.length, 4);
  run("2nd up");
  assert.equal(c.state().cf.list.length, 3);
  // no sign change: no IRR
  run("cf 2nd ce 100 enter down 50 enter irr cpt");
  assert.equal(c.display().value, "Error 5");
  assert.equal(run("ce"), "IRR= 0.00");
});

test("amortization from the TVM values", () => {
  const { run, c } = calc();
  run("2nd fv 360 n 0.5 iy 200000 pv 0 fv cpt pmt");
  const pmt = c.state().tvm.PMT;
  assert.equal(run("2nd pv 1 enter"), "P1= 1.00");
  run("down 12 enter");
  let bal = 200000, prn = 0, int = 0;
  for (let k = 1; k <= 12; k++) { const i = -bal * 0.005, p = pmt - i; bal += p; prn += p; int += i; }
  run("down"); near(c.state().ui.x, bal, 1e-6, "BAL");
  run("down"); near(c.state().ui.x, prn, 1e-6, "PRN");
  run("down"); near(c.state().ui.x, int, 1e-6, "INT");
  near(prn + int, 12 * pmt, 1e-6, "PRN + INT = 12 payments");
  // CPT on P1 moves to the next twelve payments
  assert.equal(run("down cpt"), "P1= 13.00");
  assert.equal(run("down"), "P2= 24.00");
});

test("interest conversion, percent change, profit and breakeven", () => {
  const { run } = calc();
  assert.equal(run("2nd 2 12 enter down down 12 enter up cpt"), "EFF= 12.68");
  assert.equal(run("2nd ce 2nd 2 down 10 enter down 4 enter up up cpt"), "NOM= 9.65");
  assert.equal(run("2nd 5 2nd ce 100 enter down 150 enter down down 5 enter up cpt"), "%CH= 8.45");
  assert.equal(run("2nd 3 2nd ce 80 enter down 100 enter down cpt"), "MAR= 20.00");
  assert.equal(run("2nd 6 2nd ce 1000 enter down 6 enter down 10 enter down 0 enter down cpt"), "Q= 250.00");
});

test("statistics: one variable with frequencies, and a linear regression", () => {
  const { run, c } = calc();
  run("2nd 7 2nd ce 2 enter down down 4 enter down 3 enter down 5 enter down 2 enter down 7 enter down down 9 enter");
  assert.equal(c.state().data.length, 5);
  run("2nd 8");
  while (c.display().label !== "1-V") run("2nd enter");
  assert.equal(run("down"), "n= 8.00");
  assert.equal(run("down"), "x̄= 5.00");
  assert.equal(run("down"), "Sx= 2.14");
  assert.equal(run("down"), "σx= 2.00");
  // y = a + bx on (1,2) (2,4) (3,5) (4,4) (5,5)
  run("2nd 7 2nd ce 1 enter down 2 enter down 2 enter down 4 enter down 3 enter down 5 enter down 4 enter down 4 enter down 5 enter down 5 enter");
  run("2nd 8");
  while (c.display().label !== "LIN") run("2nd enter");
  const R = B.stats(c.state());
  near(R.b, 0.6, 1e-12); near(R.a, 2.2, 1e-12); near(R.r, 0.6 * Math.sqrt(10 / 6), 1e-12);
  // predict Y' for X' = 6
  for (let i = 0; i < 11; i++) run("down");
  assert.equal(c.display().label, "X'=");
  assert.equal(run("6 enter down cpt"), "Y'= 5.80");
});

test("dates", () => {
  const { run, c } = calc();
  assert.equal(run("2nd 1 1.012 enter"), "DT1= 1-01-2020");
  assert.equal(run("down 3.012 enter"), "DT2= 3-01-2020");
  assert.equal(run("down cpt"), "DBD= 60.00");
  run("2nd 1 12.3119 enter down 12.312 enter down cpt");
  assert.equal(c.state().date.DBD, 366);
  assert.equal(run("2nd 1 2.3021 enter"), "Error 6");
});

test("standard calculations: chain and AOS, percent, memories, functions", () => {
  const { run, c } = calc();
  assert.equal(run("2 + 3 * 4 ="), "20.00");
  assert.equal(run("2nd . down down down down 2nd enter 2nd cpt 2 + 3 * 4 ="), "14.00");
  assert.equal(c.state().fmt.aos, true);
  run("2nd . down down down down 2nd enter 2nd cpt");
  assert.equal(run("2 * ( 3 + 4 ) ="), "14.00");
  assert.equal(run("453 * 4 pct ="), "18.12");
  assert.equal(run("498 + 7 pct ="), "532.86");
  assert.equal(run("2 pow 10 ="), "1,024.00");
  assert.equal(run("27 inv pow 3 ="), "3.00");
  assert.equal(run("5 2nd *"), "120.00");
  assert.equal(run("5 2nd + 2 ="), "10.00");
  assert.equal(run("5 2nd - 2 ="), "20.00");
  assert.equal(run("2 ln 2nd ln"), "2.00");
  assert.equal(run("1.005 ="), "1.01");
  assert.equal(run("123 back"), "12");
  assert.equal(run("ce 5 sto 1 7 sto 2 rcl 1 + rcl 2 ="), "12.00");
  run("3 sto + 1");
  assert.equal(c.state().mem[1], 8);
  assert.equal(run("2nd ="), "12.00");          // ANS
  assert.equal(run("1 / 0 ="), "Error 2");
  assert.equal(run("5"), "Error 2");            // only CE|C clears an error
  assert.equal(run("ce"), "0.00");
  assert.equal(run("1 neg ln"), "Error 2");
  run("ce");
});

test("format settings, reset and saved state", () => {
  const { run, c } = calc();
  assert.equal(run("2nd . 4 enter"), "DEC= 4");
  assert.equal(run("2nd cpt 2 / 3 ="), "0.6667");
  run("2nd . 9 enter 2nd cpt");
  assert.equal(run("1 / 3 ="), "0.333333333");
  run("2nd . 2 enter down down down 2nd enter 2nd cpt");
  assert.equal(run("1234.567 ="), "1.234,57");
  // the state survives a reload
  run("2nd fv 10 n");
  const again = calc(c.save());
  assert.equal(again.c.state().tvm.N, 10);
  assert.equal(again.c.state().fmt.eurSep, true);
  // reset
  assert.equal(run("2nd neg"), "RST?");
  assert.equal(run("enter"), "RST 0.00");
  assert.equal(c.state().tvm.N, 0);
  assert.equal(c.state().fmt.eurSep, false);
});

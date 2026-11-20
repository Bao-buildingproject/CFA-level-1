// Sample case integrity, mission rules, link checks, workpapers, scoring, ranks.
// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/game/engine.js");
const S = require("../js/game/sample.js");
const M = require("../js/game/missions.js");
const { fixture, load } = require("./helpers.js");

const sample = () => load(S.dataset());

// what a careful analyst would do on the board: every decisive card linked the way the data points,
// verdicts as the data says, workpapers exact, committee answered from the evidence
function perfectPlay(cs) {
  const links = [], pins = new Set();
  cs.hyps.forEach(h => h.refs.forEach(r => {
    if (r.t === "for" || r.t === "against") { links.push({ h: h.id, c: r.card, r: r.t === "for" ? "supports" : "contradicts" }); pins.add(r.card); }
  }));
  const dp = M.DECISIONS[cs.reference.decision].pol;
  const cards = Object.values(cs.cards).filter(e => e.decisive).sort((a, b) => b.s - a.s);
  const c1 = cards.filter(e => (dp ? e.pol === dp : true)).slice(0, 3).map(e => e.id);
  const counter = cards.filter(e => (dp ? e.pol === -dp : e.s >= 2 && !c1.includes(e.id)));
  return {
    links, pins: [...pins], verdicts: { ...cs.reference.statuses },
    wp: Object.fromEntries(cs.workpapers.map(w => [w.id, { input: M.shownValue(w), checked: true }])),
    decision: cs.reference.decision, confidence: cs.reference.confidence,
    c1, c2: counter.length ? counter[0].id : "none", c3: cs.limits.filter(l => l.truth).map(l => l.id),
    viewedChecks: true, inspected: ["i:rev|2025", "m:dso|2025"]
  };
}

test("the sample case is fictional, labelled SIMULATED and passes every check", () => {
  const ds = sample();
  assert.equal(ds.class, "SIMULATED");
  assert.equal(ds.company.fictional, true);
  const v = E.validate(ds);
  assert.equal(v.publishable, true);
  v.checks.forEach(c => assert.equal(c.status, "pass", `${c.id}: ${c.detail}`));
  ds.years.forEach(y => assert.ok(ds.values[y].cash > 0, `cash ${y} must stay positive`));
  assert.match(ds.story.epilogue, /mô phỏng/);
});

test("the sample statements are built from their drivers", () => {
  const ds = sample(), d = S.DRIVERS;
  ds.years.forEach((y, i) => {
    assert.equal(ds.values[y].rev, d.rev[i] * 1e6);
    assert.equal(ds.values[y].std, d.std[i] * 1e6);
    assert.equal(ds.values[y].ar, Math.round(d.rev[i] * d.arDays[i] / 365) * 1e6);
  });
});

test("Earnings Quality on the sample: the reference view", () => {
  const cs = M.buildCase(sample(), "EQ");
  assert.equal(cs.playable, true, cs.notPlayable.join("; "));
  assert.deepEqual(cs.reference.statuses, { H1: "SUPPORTED", H2: "SUPPORTED", H3: "SUPPORTED", H4: "CONTRADICTED" });
  assert.equal(cs.reference.decision, "AVOID");
  assert.equal(cs.reference.confidence, "high");
  assert.deepEqual(cs.workpapers.map(w => w.id), ["dso", "cfo_ni", "ar_g"]);
});

test("Liquidity Clock on the sample: headline ratios look fine, the reference still sees the risk", () => {
  const cs = M.buildCase(sample(), "LIQ");
  assert.equal(cs.playable, true);
  const ref = id => cs.hyps.find(h => h.id === "L1").refs.find(r => r.card === id);
  assert.equal(ref("m:cur").t, "against");     // the current ratio improves…
  assert.equal(ref("m:cash_r").t, "for");      // …because receivables swell while cash shrinks
  assert.equal(cs.reference.statuses.L1, "PLAUSIBLE");
  assert.equal(cs.reference.statuses.L3, "CONTRADICTED");
  assert.equal(cs.reference.statuses.L4, "SUPPORTED");
  assert.equal(cs.reference.decision, "HOLD");
  assert.deepEqual(cs.workpapers.map(w => w.id), ["cur", "de", "int_cov"]);
});

test("workpapers hold the engine's value for the latest year", () => {
  const ds = sample(), res = E.computeMetrics(ds);
  M.buildCase(ds, "EQ").workpapers.forEach(w => {
    assert.equal(w.year, 2025);
    assert.equal(w.value, res.results[w.id].byYear[2025].v);
  });
});

test("every data test explains itself with real numbers", () => {
  for (const ds of [sample(), load(fixture())]) {
    for (const a of M.ARCHETYPE_IDS) {
      M.buildCase(ds, a).hyps.forEach(h => h.refs.forEach(r => {
        assert.ok(["for", "against", "neutral", "na"].includes(r.t));
        assert.ok(r.why && !/NaN|undefined|Infinity/.test(r.why), `${h.id} ${r.card}: ${r.why}`);
        if (r.t === "for" || r.t === "against") assert.ok(r.s >= 1 && r.s <= 3);
      }));
    }
  }
});

test("link checks follow the data", () => {
  const cs = M.buildCase(sample(), "EQ");
  const ok = (h, c, r) => M.linkCheck(cs, { h, c, r }).ok;
  assert.equal(ok("H1", "m:dso", "supports"), true);
  assert.equal(ok("H1", "m:dso", "contradicts"), false);
  assert.equal(ok("H1", "m:inv_cogs_gap", "explains"), true);     // neutral evidence can explain
  assert.equal(ok("H1", "m:inv_cogs_gap", "needs"), true);
  assert.equal(ok("H1", "m:inv_cogs_gap", "supports"), false);
  assert.equal(ok("H4", "m:dso", "contradicts"), true);           // the same card cuts against the positive story
  assert.equal(ok("H4", "m:dso", "explains"), false);
  const unrelated = M.linkCheck(cs, { h: "H1", c: "i:tle", r: "supports" });
  assert.equal(unrelated.ok, false);
  assert.match(unrelated.why, /không liên quan/);
});

test("workpaper tolerance by unit", () => {
  const x = { unit: "x", value: 2 }, d = { unit: "days", value: 80 }, p = { unit: "pct", value: 0.4455 };
  assert.equal(M.gradeWorkpaper(x, 2).frac, 1);
  assert.equal(M.gradeWorkpaper(x, 2.04).frac, 0.6);
  assert.equal(M.gradeWorkpaper(x, 2.1).frac, 0.3);
  assert.equal(M.gradeWorkpaper(x, 2.4).frac, 0);
  assert.equal(M.gradeWorkpaper(d, 80.4).frac, 1);
  assert.equal(M.gradeWorkpaper({ unit: "x", value: 0.1672 }, 0.17).frac, 1, "rounding to two decimals is not an error");
  assert.equal(M.gradeWorkpaper({ unit: "x", value: 0.1672 }, 0.18).frac, 0.6);
  assert.equal(M.gradeWorkpaper({ unit: "x", value: 0.1672 }, 0.25).frac, 0);
  assert.equal(M.gradeWorkpaper(p, 44.6).frac, 1);                 // typed as a percentage
  assert.equal(M.gradeWorkpaper(p, 45).frac, 0.6);
  assert.equal(M.gradeWorkpaper(p, 46.5).frac, 0.3);
  assert.equal(M.gradeWorkpaper(p, 50).frac, 0);
  assert.equal(M.gradeWorkpaper(p, NaN).frac, 0);
});

test("status of a hypothesis from weighted evidence", () => {
  const r = (t, s) => ({ t, s });
  assert.equal(M.refStatusOf([r("for", 3), r("for", 2), r("neutral", 0)]).status, "SUPPORTED");
  assert.equal(M.refStatusOf([r("for", 3), r("against", 2)]).status, "PLAUSIBLE");
  assert.equal(M.refStatusOf([r("for", 2), r("against", 2)]).status, "CONTRADICTED");
  assert.equal(M.refStatusOf([r("neutral", 0), r("neutral", 0)]).status, "UNTESTED");
  assert.equal(M.refStatusOf([r("for", 3), r("na", 0)]).status, "UNTESTED", "one available card is not enough");
});

test("decision implied by verdicts", () => {
  const arch = M.ARCHETYPES.EQ;
  assert.equal(M.decide(arch, { H1: "SUPPORTED", H2: "SUPPORTED", H3: "PLAUSIBLE", H4: "CONTRADICTED" }).decision, "AVOID");
  assert.equal(M.decide(arch, { H1: "CONTRADICTED", H2: "CONTRADICTED", H3: "PLAUSIBLE", H4: "SUPPORTED" }).decision, "INVEST");
  assert.equal(M.decide(arch, { H1: "SUPPORTED", H2: "CONTRADICTED", H3: "PLAUSIBLE", H4: "PLAUSIBLE" }).decision, "HOLD");
  assert.equal(M.decide(arch, { H1: "SUPPORTED", H2: "UNTESTED", H3: "UNTESTED", H4: "PLAUSIBLE" }).decision, "REQUEST");
});

test("score: a careful analyst gets 100, an empty board gets 0", () => {
  for (const a of M.ARCHETYPE_IDS) {
    const cs = M.buildCase(sample(), a);
    const top = M.score(cs, perfectPlay(cs));
    assert.equal(top.total, 100, `${a}: ${top.parts.map(p => `${p.id} ${p.score}`).join(", ")}`);
    top.parts.forEach(p => assert.equal(p.score, p.max, p.id));
    assert.deepEqual(top.parts.map(p => p.max), [25, 25, 25, 15, 10]);
    assert.equal(M.score(cs, {}).total, 0);
  }
});

test("score: cherry-picking and an inconsistent decision cost points", () => {
  const cs = M.buildCase(sample(), "EQ");
  const base = perfectPlay(cs);
  // only the evidence that flatters the positive hypothesis
  const cherry = { ...base, links: base.links.filter(l => l.h === "H4" && l.r === "supports"), verdicts: { H4: "SUPPORTED" }, decision: "INVEST", confidence: "high" };
  const s = M.score(cs, cherry);
  const part = id => s.parts.find(p => p.id === id);
  assert.ok(part("evidence").items[0].score < 5, "coverage must drop");
  assert.equal(part("discipline").items[1].score, 0, "INVEST against an AVOID reference");
  assert.ok(s.total < 70);
  assert.ok(s.missed.length > 0);
  // the right call, but against your own verdicts
  const inconsistent = M.score(cs, { ...base, verdicts: { H1: "CONTRADICTED", H2: "CONTRADICTED", H3: "CONTRADICTED", H4: "SUPPORTED" } });
  assert.equal(inconsistent.implied, "INVEST");
  assert.equal(inconsistent.parts.find(p => p.id === "discipline").items[0].score, 0);
  // a wrong link is listed with the reason from the data
  const wrong = M.score(cs, { ...base, links: [...base.links, { h: "H1", c: "m:dso", r: "contradicts" }] });
  assert.equal(wrong.invalid.length, 1);
  assert.match(wrong.invalid[0].why, /DSO/);
});

test("committee 3: false limits cancel true ones", () => {
  const cs = M.buildCase(sample(), "EQ");
  const base = perfectPlay(cs);
  const c3 = st => M.score(cs, { ...base, c3: st }).parts.find(p => p.id === "source").items[2].score;
  const truths = cs.limits.filter(l => l.truth).map(l => l.id);
  assert.equal(c3(truths), 4);
  assert.ok(c3([...truths, "unbalanced"]) < 4);
  assert.equal(c3(["unbalanced", "quarterly"]), 0);
});

test("missing lines make tests unavailable instead of guessing", () => {
  const raw = S.dataset();
  const copy = JSON.parse(JSON.stringify(raw));
  copy.years.forEach(y => { delete copy.values[y].int_exp; });
  const cs = M.buildCase(load(copy), "LIQ");
  const l3 = cs.hyps.find(h => h.id === "L3");
  assert.equal(l3.refs.find(r => r.card === "m:int_cov").t, "na");
  assert.equal(l3.refs.find(r => r.card === "i:int_exp").t, "na");
  assert.ok(l3.available < 4);
});

test("a dataset that fails a blocking check cannot be played", () => {
  const raw = fixture(); raw.values[2024].ta = 116;
  const cs = M.buildCase(load(raw), "EQ");
  assert.equal(cs.playable, false);
  assert.match(cs.notPlayable.join(" "), /NOT PUBLISHABLE/);
});

test("unaudited data lowers the reference confidence and shows up as a limit", () => {
  const raw = S.dataset(); const copy = JSON.parse(JSON.stringify(raw));
  copy.periodMeta[2025] = { audit: "unaudited" };
  const a = M.buildCase(sample(), "EQ"), b = M.buildCase(load(copy), "EQ");
  assert.ok(M.CONF_ORDER.indexOf(b.reference.confidence) < M.CONF_ORDER.indexOf(a.reference.confidence));
  assert.equal(b.limits.find(l => l.id === "unaudited").truth, true);
  assert.equal(a.limits.find(l => l.id === "unaudited").truth, false);
});

test("ranks and unlocks", () => {
  assert.equal(M.rankOf(0).name, "Analyst Intern");
  assert.equal(M.rankOf(79).name, "Analyst Intern");
  assert.equal(M.rankOf(80).name, "Junior Analyst");
  assert.equal(M.rankOf(700).name, "Chief Investment Officer");
  assert.equal(M.rankOf(700).next, null);
  assert.equal(M.rankOf(120).progress, 0.5);
  assert.equal(M.unlocked("EQ", {}), true);
  assert.equal(M.unlocked("LIQ", {}), false);
  assert.equal(M.unlocked("LIQ", { "sim-lotus-harvest|EQ": 40 }), true);
});

test("the same data always gives the same reference view", () => {
  const a = M.buildCase(sample(), "EQ"), b = M.buildCase(sample(), "EQ");
  assert.deepEqual(a.reference, b.reference);
  assert.deepEqual(a.hyps.map(h => h.refs.map(r => r.t)), b.hyps.map(h => h.refs.map(r => r.t)));
});

test("number formatting is Vietnamese", () => {
  assert.equal(M.fmt(0.1234, "pct"), "12,3%");
  assert.equal(M.fmt(82.9, "days"), "82,9 ngày");
  assert.equal(M.fmt(1954.08e9, "vnd"), "1.954 tỷ");
  assert.equal(M.fmt(-59.3e9, "vnd"), "−59,3 tỷ");
  assert.equal(M.fmt(null, "x"), "—");
});

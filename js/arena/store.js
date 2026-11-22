// ============================================================
// arena/store.js — Derivatives Trading Arena: wallets, saving, modes and the leaderboard
//
// Each signed-in account of the site has its own arena wallet, stored in this browser under
// cfaStudy_arena_<account id>. Saving is guarded by a revision number: if another tab saved
// in the meantime, the save is refused and the page reloads the newer state instead of
// overwriting it. On loading, every virtual account is re-checked (hash chains, ledger rebuilt
// from the fills); an account edited outside the game is flagged and kept off the leaderboard.
// An imported dataset (e.g. WiData) is kept once per browser under cfaStudy_arena_data and is
// never sent anywhere.
// ============================================================
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./engine.js") : root.ArenaEngine, node ? require("./market.js") : root.ArenaMarket);
  if (node) module.exports = api;
  else root.ArenaStore = api;
})(typeof self !== "undefined" ? self : this, function (E, M) {
  "use strict";

  const KEY = pid => `cfaStudy_arena_${pid}`;
  const DATA_KEY = "cfaStudy_arena_data";

  // Challenges: a fixed seed and fixed conditions, so every player meets the same market
  const CHALLENGES = [
    { id: "warmup", name: "Khởi động", desc: "Lãi ít nhất +3% sau 3 phiên, sụt giảm tối đa không quá 4%.", seed: 1101, sessions: 3, target: 0.03, maxDD: 0.04, vol: 1, drift: 0 },
    { id: "storm", name: "Bão biến động", desc: "5 phiên biến động gấp đôi: không bị thanh lý, kết thúc lỗ không quá 2%.", seed: 2207, sessions: 5, target: -0.02, maxDD: 0.12, vol: 2, drift: 0, noLiq: true },
    { id: "bear", name: "Thị trường giá xuống", desc: "Xu hướng giảm: lãi ít nhất +4% sau 5 phiên, sụt giảm tối đa 5%.", seed: 3313, sessions: 5, target: 0.04, maxDD: 0.05, vol: 1, drift: -1.2 },
    { id: "discipline", name: "Kỷ luật Stop Loss", desc: "Ít nhất 4 giao dịch, vị thế nào cũng có Stop Loss, kết thúc có lãi sau 4 phiên.", seed: 4421, sessions: 4, target: 0.0001, maxDD: 0.06, vol: 1.2, drift: 0, rule: "sl", minTrades: 4 }
  ];
  const CUP = { sessions: 5, vol: 1.2 };
  // The weekly cup: the seed is the ISO week, so the market is the same for every player that week
  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return { y, w, id: `${y}-W${String(w).padStart(2, "0")}`, seed: y * 100 + w };
  }

  function blank() { return { v: 1, rev: 0, accounts: {}, markets: {}, results: [], prefs: {} }; }
  function parse(raw) {
    if (!raw) return blank();
    try { const s = JSON.parse(raw); if (s && s.v === 1 && s.accounts && s.markets) return s; } catch (e) { /* fall through */ }
    return null;
  }

  // ---------- A handle on one user's arena ----------
  function open(storage, userId) {
    const h = { storage, userId, state: blank(), rev: 0, broken: false, flags: {}, recent: [] };
    load(h);
    return h;
  }
  function load(h) {
    let raw = null;
    try { raw = h.storage.getItem(KEY(h.userId)); } catch (e) { /* storage blocked */ }
    const st = parse(raw);
    if (!st) {                                   // unreadable: keep a copy for the record and start over
      h.broken = true;
      try { h.storage.setItem(KEY(h.userId) + "_broken", raw); } catch (e) { /* ignore */ }
      h.state = blank(); h.rev = 0;
    } else { h.state = st; h.rev = st.rev || 0; }
    h.flags = {};
    for (const [slot, a] of Object.entries(h.state.accounts)) {
      if (a.userId !== h.userId) { h.flags[slot] = ["Tài khoản thuộc về người dùng khác"]; continue; }
      const v = E.verify(a);
      if (!v.ok) h.flags[slot] = v.problems;
    }
    return h;
  }
  // Refuses to overwrite a newer save from another tab
  function save(h) {
    for (const a of Object.values(h.state.accounts)) if (a && a.userId === h.userId && !h.flags[a.id]) E.compact(a);
    let cur = null;
    try { cur = parse(h.storage.getItem(KEY(h.userId))); } catch (e) { /* ignore */ }
    if (cur && (cur.rev || 0) !== h.rev) return { ok: false, conflict: true };
    h.state.rev = h.rev + 1;
    try { h.storage.setItem(KEY(h.userId), JSON.stringify(h.state)); }
    catch (e) { h.state.rev = h.rev; return { ok: false, error: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn" }; }
    h.rev += 1;
    return { ok: true };
  }
  const ctxOf = (h, t) => ({ userId: h.userId, t });
  // Spam guard: at most 8 orders in 5 seconds from one page
  function allowOrder(h, now) {
    h.recent = h.recent.filter(x => now - x < 5000);
    if (h.recent.length >= 8) return false;
    h.recent.push(now);
    return true;
  }

  // ---------- Modes ----------
  function slotOf(mode, id) { return mode === "challenge" ? `ch-${id}` : mode; }
  function account(h, slot) { return h.state.accounts[slot] || null; }
  function market(h, slot) { return h.state.markets[slot] || null; }
  function startPractice(h, opt) {
    opt = opt || {};
    const ds = opt.calibration;
    const mk = M.createSynthetic({ seed: opt.seed || ((Date.now() % 2147483647) >>> 0), start: opt.start || "2026-11-23",
      sigma: ds ? ds.sigma : 0.2, startPx: ds ? { VN30F1M: ds.px, VN100F1M: Math.round(ds.px * 0.97) } : null, volMult: opt.volMult || 1 });
    h.state.markets.practice = mk;
    h.state.accounts.practice = E.createAccount({ id: "practice", userId: h.userId, kind: "practice", t: mk.lastT });
    return slotOf("practice");
  }
  function startChallenge(h, id) {
    const ch = CHALLENGES.find(c => c.id === id);
    if (!ch) throw new Error("Không có thử thách này");
    const slot = slotOf("challenge", id);
    const mk = M.createSynthetic({ seed: ch.seed, start: "2027-03-01", volMult: ch.vol, drift: ch.drift });
    h.state.markets[slot] = mk;
    h.state.accounts[slot] = E.createAccount({ id: slot, userId: h.userId, kind: "challenge", label: ch.name, t: mk.lastT });
    h.state.accounts[slot].meta = { challenge: id, startDay: mk.day, sessions: 0 };
    return slot;
  }
  function startCup(h, now) {
    const wk = isoWeek(now || new Date());
    const mk = M.createSynthetic({ seed: wk.seed, start: "2027-06-07", volMult: CUP.vol });
    h.state.markets.cup = mk;
    h.state.accounts.cup = E.createAccount({ id: "cup", userId: h.userId, kind: "cup", label: `Giải tuần ${wk.id}`, t: mk.lastT });
    h.state.accounts.cup.meta = { week: wk.id, sessions: 0 };
    return "cup";
  }
  function startReplay(h, ds, opt) {
    opt = opt || {};
    const mk = M.createReplay(ds, { blind: opt.blind !== false, length: opt.length || 20, start: opt.start, seed: opt.seed || ((Date.now() % 2147483647) >>> 0) });
    h.state.markets.replay = mk;
    const q = M.replayQuote(mk, ds.bars);
    h.state.accounts.replay = E.createAccount({ id: "replay", userId: h.userId, kind: "replay", label: ds.meta.title, t: q.t });
    E.setMark(h.state.accounts.replay, ds.sym, q.q[ds.sym].mark);
    h.state.accounts.replay.meta = { dataset: ds.meta.id, sessions: 0 };
    return "replay";
  }
  // A finished round (challenge, cup, replay) is written to the results list; the market is dropped
  function finishRound(h, slot, extra) {
    const a = account(h, slot);
    if (!a) return null;
    const an = E.analytics(a, {});
    const r = { mode: a.kind, slot, name: a.label || a.kind, at: new Date().toISOString(), ret: an.ret, maxDD: an.maxDD, trades: an.n,
      liq: a.stats.liq, ok: !h.flags[slot], ...(extra || {}) };
    h.state.results.push(r);
    if (h.state.results.length > 200) h.state.results.shift();
    a.meta = { ...(a.meta || {}), finished: r };
    return r;
  }
  function evalChallenge(h, slot) {
    const a = account(h, slot), ch = a && CHALLENGES.find(c => c.id === (a.meta || {}).challenge);
    if (!ch) return null;
    const an = E.analytics(a, {}), sessions = (a.meta || {}).sessions || 0;
    const fails = [];
    if (an.maxDD > ch.maxDD) fails.push(`Sụt giảm tối đa ${(an.maxDD * 100).toFixed(1)}% vượt ${(ch.maxDD * 100).toFixed(0)}%`);
    if (ch.noLiq && a.stats.liq > 0) fails.push("Tài khoản bị thanh lý bắt buộc");
    const done = sessions >= ch.sessions || fails.length > 0;
    if (sessions >= ch.sessions) {
      if (an.ret < ch.target) fails.push(`Lợi nhuận ${(an.ret * 100).toFixed(2)}% chưa đạt ${(ch.target * 100).toFixed(ch.target < 0.001 && ch.target > 0 ? 2 : 0)}%`);
      if (ch.minTrades && an.n < ch.minTrades) fails.push(`Mới có ${an.n}/${ch.minTrades} giao dịch`);
      if (ch.rule === "sl" && a.positions.some(p => !p.hadSL)) fails.push("Có vị thế không đặt Stop Loss");
    }
    return { done, passed: done && !fails.length, fails, ret: an.ret, maxDD: an.maxDD, sessions, need: ch.sessions };
  }

  // ---------- Leaderboard: the accounts on this device ----------
  function leaderboard(storage, profiles, week) {
    const rows = [];
    for (const p of profiles) {
      let st = null;
      try { st = parse(storage.getItem(KEY(p.id))); } catch (e) { /* ignore */ }
      if (!st) continue;
      for (const [slot, a] of Object.entries(st.accounts)) {
        if (!a || a.userId !== p.id) continue;
        if (slot === "cup" && (a.meta || {}).week !== week) continue;
        const ok = E.verify(a).ok, an = E.analytics(a, {});
        rows.push({ user: p.id, name: p.name, slot, mode: a.kind, label: a.label, ret: an.ret, maxDD: an.maxDD, trades: an.n, ok, liq: a.stats.liq });
      }
      for (const r of st.results || []) if (r.mode === "challenge" && r.passed) rows.push({ user: p.id, name: p.name, slot: r.slot, mode: "badge", label: r.name, ret: r.ret, ok: r.ok });
    }
    return rows;
  }

  // ---------- The imported dataset ----------
  let dsCache = null;
  function getDataset(storage) {
    let raw = null;
    try { raw = storage.getItem(DATA_KEY); } catch (e) { return null; }
    if (!raw) return null;
    if (dsCache && dsCache.raw === raw) return dsCache.ds;
    let ds = null;
    try { const v = M.validateDataset(JSON.parse(raw)); if (v.ok) ds = v; } catch (e) { /* ignore */ }
    dsCache = { raw, ds };
    return ds;
  }
  function setDataset(storage, text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, problems: ["Tệp không phải JSON hợp lệ"] }; }
    const v = M.validateDataset(obj);
    if (!v.ok) return v;
    try { storage.setItem(DATA_KEY, JSON.stringify({ ...obj, bars: v.bars })); } catch (e) { return { ok: false, problems: ["Bộ nhớ trình duyệt đã đầy"] }; }
    dsCache = null;
    return v;
  }
  function clearProfile(storage, pid) { try { storage.removeItem(KEY(pid)); storage.removeItem(KEY(pid) + "_broken"); } catch (e) { /* ignore */ } }

  return { KEY, DATA_KEY, CHALLENGES, CUP, isoWeek, open, load, save, ctxOf, allowOrder, slotOf, account, market,
    startPractice, startChallenge, startCup, startReplay, finishRound, evalChallenge, leaderboard, getDataset, setDataset, clearProfile };
});

// ============================================================
// js/game/ui.js — "Financial Empire: Beyond the Numbers" (Game, under Learn; codename Project Ledger)
//
// The game is a console of its own: while a game page is open the study site's navigation steps
// aside (body.fx-mode) and the game draws its rail (computer) or tab bar (phone).
//   Title screen (intro) · HQ · Story "The Black Ledger" · Case files · Career · modules still to come
//   Case investigation: Hồ sơ → Terminal → Bằng chứng → Workpapers → Quyết định → Committee → Kết quả
// Numbers come from engine.js, rules and score from missions.js; this file only draws them and keeps
// the player's progress in DATA.game. Company files added once are shared by every account on this
// device (localStorage); each account keeps its own missions, scores and rank. Data from a provider
// such as WiData is for personal use and never goes online.
// ============================================================
(function () {
  "use strict";
  const E = window.FWEngine, M = window.FWMissions, SAMPLE = window.FWSample;

  const STEPS = [
    { id: "brief", vi: "Hồ sơ", en: "Case file" }, { id: "terminal", vi: "Terminal", en: "Financial terminal" },
    { id: "board", vi: "Bằng chứng", en: "Evidence board" }, { id: "work", vi: "Workpapers", en: "Calculations" },
    { id: "decide", vi: "Quyết định", en: "Decision" }, { id: "committee", vi: "Committee", en: "Risk review" },
    { id: "result", vi: "Kết quả", en: "The Board" }
  ];
  const DECISION_TEXT = {
    INVEST: "Bằng chứng ủng hộ; các rủi ro chính đã được kiểm tra và bác bỏ.",
    HOLD: "Tín hiệu trái chiều: theo dõi thêm trước khi tăng hay giảm vị thế.",
    AVOID: "Rủi ro được bằng chứng ủng hộ: không giải ngân.",
    REQUEST: "Hồ sơ chưa đủ để kết luận: cần thêm tài liệu trước khi quyết định."
  };
  const DECISION_ICON = { INVEST: "trend", HOLD: "pulse", AVOID: "shield", REQUEST: "inspect" };
  const LABELS = { REAL: "Dữ liệu thật, có nguồn", CALCULATED: "Engine tính từ dữ liệu trong hồ sơ", SIMULATED: "Dữ liệu mô phỏng, doanh nghiệp hư cấu" };
  const UNIT = { pct: "%", pp: "điểm %", x: "lần", days: "ngày", vnd: "tỷ đồng" };
  const SEC_NAME = { bs: "Bảng cân đối kế toán", is: "Kết quả kinh doanh", cf: "Lưu chuyển tiền tệ" };
  // VN30 basket in effect from 16/11/2026 (HOSE). Banks and securities firms file a different statement format.
  const VN30 = {
    asOf: "16/11/2026",
    nonfin: ["BSR", "FPT", "GAS", "GVR", "HPG", "MCH", "MSN", "MWG", "SAB", "VHM", "VIC", "VJC", "VNM", "VPL", "VRE"],
    fin: ["ACB", "BID", "CTG", "HDB", "LPB", "MBB", "SHB", "SSB", "SSI", "STB", "TCB", "TCX", "VCB", "VIB", "VPB"]
  };
  const G = { lib: null, all: null, cases: {}, tab: "fs", cur: null, saveT: 0, sel: null, filter: "all", imp: undefined };

  // Story Mode: The Black Ledger (GDD §5). A chapter is played on the training case; chapters without a
  // mission yet are shown as being written. [number, title, focus, mission, synopsis, cast]
  const STORY_CASE = "sim-lotus-harvest";
  const CHAPTERS = [
    [1, "The First Red Flag", "Income Statement, Balance Sheet", "EQ", "Ngày đầu ở Aurora Capital. Lợi nhuận của một doanh nghiệp tăng nhanh, một analyst khác muốn mua ngay; Daniel Ross thấy dòng tiền đi xuống. Dấu hiệu đầu tiên, hay chỉ là doanh nghiệp đang lớn?", ["Maya Chen", "Daniel Ross", "Alex Morgan"]],
    [2, "Where Is the Cash?", "Cash Flow, Working Capital", null, "Tiền đi đâu? Lần theo vốn lưu động: phải thu, tồn kho, phải trả, và chu kỳ chuyển đổi tiền.", ["Maya Chen", "EVA"]],
    [3, "The Debt Spiral", "Debt, Liquidity, Solvency", "LIQ", "Nợ ngắn hạn tăng, tiền mặt mỏng dần. Daniel Ross muốn biết đồng hồ thanh khoản còn bao lâu trước kỳ đáo hạn.", ["Daniel Ross", "Alex Morgan"]],
    [4, "The Inventory Mystery", "Inventory, Cost Accounting", null, "Kho hàng phình to: chuẩn bị mở rộng, hay hàng không bán được?", ["Maya Chen", "EVA"]],
    [5, "The Earnings Illusion", "Earnings Quality, Accruals", null, "Lợi nhuận đẹp nhờ dồn tích. Phân biệt tăng trưởng thật với một ảo ảnh kế toán.", ["Maya Chen", "Daniel Ross"]],
    [6, "The Hidden Commitments", "Notes, Contingencies, Related Parties", null, "Thuyết minh, nghĩa vụ tiềm tàng, giao dịch bên liên quan: những gì không nằm trên mặt báo cáo.", ["Daniel Ross", "EVA"]],
    [7, "The Price of a Business", "Valuation, DCF, Multiples", null, "DCF, bội số, và những giả định quyết định con số cuối cùng.", ["Alex Morgan", "EVA"]],
    [8, "The Investment Committee", "Thesis, Risk, Portfolio", null, "Bảo vệ luận điểm, rủi ro và tỷ trọng danh mục trước hội đồng.", ["Alex Morgan", "The Board"]],
    [9, "The Market Shock", "Scenario Analysis, Stress Testing", null, "Cú sốc lãi suất và thanh khoản: kiểm tra sức chịu đựng bằng kịch bản.", ["Daniel Ross", "Alex Morgan"]],
    [10, "The Black Ledger", "Integrated Financial Investigation", null, "Mọi manh mối trong chuỗi cung ứng hội tụ. Cuộc điều tra tổng hợp cuối cùng.", ["Maya Chen", "Daniel Ross", "Alex Morgan", "The Board"]]
  ];
  const CAST = [
    ["Maya Chen", "Head of Research", "Giao vụ án, đánh giá chất lượng lập luận."],
    ["Daniel Ross", "Chief Risk Officer", "Đặt câu hỏi phản biện, đòi bằng chứng."],
    ["Alex Morgan", "Portfolio Manager", "Chịu trách nhiệm quyết định đầu tư."],
    ["EVA", "Research Assistant", "Giải thích công thức và nguồn của từng con số."],
    ["The Board", "Hội đồng đầu tư", "Chấp nhận hay trả báo cáo của bạn."]
  ];
  const chapterOf = (dsId, arch) => dsId === STORY_CASE ? CHAPTERS.find(c => c[3] === arch) || null : null;

  // ---------- storage ----------
  const libKey = () => "cfaStudy_fw_shared";                 // one library for every account on the device
  const oldLibKey = id => `cfaStudy_fw_${id}`;               // before: one library per account
  const readJson = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  function lib() {
    if (G.lib && G.lib.key === libKey()) return G.lib;
    const raw = readJson(libKey());
    G.lib = { key: libKey(), datasets: raw && Array.isArray(raw.datasets) ? raw.datasets : [], quarantine: raw && Array.isArray(raw.quarantine) ? raw.quarantine : [] };
    // files an account loaded before sharing join the shared library once (same file: the shared copy stays)
    let moved = false;
    PROFILES.list.forEach(p => {
      const old = readJson(oldLibKey(p.id));
      if (!old) return;
      (Array.isArray(old.datasets) ? old.datasets : []).forEach(d => { if (d && d.id && !G.lib.datasets.some(x => x.id === d.id)) G.lib.datasets.push(d); });
      (Array.isArray(old.quarantine) ? old.quarantine : []).forEach(q => G.lib.quarantine.push(q));
      try { localStorage.removeItem(oldLibKey(p.id)); } catch (e) { /* ignore */ }
      moved = true;
    });
    if (moved) { G.lib.quarantine = G.lib.quarantine.sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-12); saveLib(); }
    return G.lib;
  }
  function saveLib() {
    try { localStorage.setItem(libKey(), JSON.stringify({ v: 1, datasets: G.lib.datasets, quarantine: G.lib.quarantine })); return true; }
    catch (e) { toast("Không lưu được: bộ nhớ trình duyệt đã đầy", "error"); return false; }
  }
  function prog() {
    if (!DATA.game || typeof DATA.game !== "object") DATA.game = {};
    const g = DATA.game;
    g.v = 1; g.runs = g.runs || {}; g.best = g.best || {};
    return g;
  }
  const freshRun = () => ({ v: 1, step: "brief", pins: [], links: [], verdicts: {}, wp: {}, inspected: [], viewedChecks: false, viewedSource: false,
    decision: null, confidence: null, thesis: "", c1: [], c2: null, c3: [], done: false, total: null, startedAt: Date.now(), finishedAt: null });
  function runOf(key) { const g = prog(); if (!g.runs[key] || g.runs[key].v !== 1) g.runs[key] = freshRun(); return g.runs[key]; }
  const save = () => saveData();
  const xpTotal = () => Object.values(prog().best).reduce((s, b) => s + ((b && b.score) || 0), 0);
  const started = r => !!(r && !r.done && ((r.pins || []).length || (r.step && r.step !== "brief")));

  // every company file the player can open: the training case first, then imported files by ticker
  function datasets() {
    if (G.all && G.all.key === libKey()) return G.all.list;
    const list = [];
    const add = (raw, builtin) => { const n = E.normalize(raw); if (n.ok) list.push({ ds: n.ds, val: E.validate(n.ds), builtin }); };
    add(SAMPLE.dataset(), true);
    lib().datasets.slice().sort((a, b) => String((a.company || {}).ticker).localeCompare(String((b.company || {}).ticker))).forEach(r => add(r, false));
    G.all = { key: libKey(), list }; G.cases = {};
    return list;
  }
  const findDs = id => datasets().find(e => e.ds.id === id);
  function caseFor(entry, archId) { const k = `${entry.ds.id}|${archId}`; return G.cases[k] || (G.cases[k] = M.buildCase(entry.ds, archId)); }

  // ---------- small formatters ----------
  const ty = v => (v === null || v === undefined) ? "—" : M.num(v / 1e9, 1);       // tỷ đồng
  const yrs = ds => `${ds.years[0]}–${ds.years[ds.years.length - 1]}`;
  const dateVi = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(s || ""); };
  const chip = c => `<span class="fw-label fw-label-${c.toLowerCase()}" title="${LABELS[c] || ""}">${c}</span>`;
  const statusChip = s => `<span class="fw-status fw-st-${s.toLowerCase()}" title="${M.STATUS[s].vi}">${M.STATUS[s].en}</span>`;
  const relChip = r => `<span class="fw-rel fw-rel-${r}">${M.RELATIONS[r].vi}</span>`;
  const cardTitle = (cs, id) => { const c = M.cardInfo(cs.c, id); return c ? c.title : esc(id); };
  const auditVi = a => ({ audited: "Đã kiểm toán", reviewed: "Đã soát xét", unaudited: "Chưa kiểm toán", restated: "Đã kiểm toán, số điều chỉnh hồi tố", simulated: "Mô phỏng" }[a] || esc(a));
  const cell = (v, unit) => unit === "vnd" ? M.num(v / 1e9, 1) : unit === "pct" ? M.fmt(v, "pct") : unit === "pp" ? `${v >= 0 ? "+" : "−"}${M.num(Math.abs(v * 100), 1)}` : unit === "x" ? M.num(v, 2) : unit === "days" ? M.num(v, 1) : M.num(v, 2);
  const pad3 = n => String(n).padStart(3, "0");
  const nextBtn = (id, label) => `<div class="fx-next"><button class="fx-btn gold" data-go="${id}">${label} ${icon("next", 16)}</button></div>`;
  const pinBtn = (id, on) => `<button class="fw-pin ${on ? "on" : ""}" data-pin="${id}" aria-pressed="${on}" title="${on ? "Bỏ ghim" : "Ghim làm bằng chứng"}" aria-label="${on ? "Bỏ ghim" : "Ghim làm bằng chứng"}">${icon("pin", 15)}</button>`;
  const requestText = (tk, has) => `${has ? "Cập nhật" : "Lấy"} BCTC hợp nhất năm (5 năm gần nhất) của ${tk} từ WiData cho game Financial Empire`;

  // ---------- icons and art of the game ----------
  const GI = {
    map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2h8.8A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 13v4M8.5 20h7M10 17h4"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5.2l-5.1 8.9A1.7 1.7 0 0 0 6.9 20h10.2a1.7 1.7 0 0 0 1.5-2.4l-5.1-8.9V3.5"/><path d="M7.6 14h8.8"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 13.9c1.9.6 3 2.4 3 5.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/>',
    exit: '<path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>',
    board: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/><path d="M10 7.5h3.5A1.5 1.5 0 0 1 15 9v4"/>',
    inspect: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/><path d="M8 10.5h5M10.5 8v5"/>',
    workpaper: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12h7M9 15.5h7M9 19h4"/>',
    scale: '<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.5 6a2.8 2.8 0 0 0 5 0zM19 8l-2.5 6a2.8 2.8 0 0 0 5 0z"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    quote: '<path d="M9.5 7.5C6.5 8.5 5 10.6 5 13.5V17h4.5v-4.5H7c0-1.6.9-2.8 2.5-3.4zM18.5 7.5c-3 1-4.5 3.1-4.5 6V17h4.5v-4.5H16c0-1.6.9-2.8 2.5-3.4z"/>'
  };
  const gi = (n, s = 20) => `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GI[n] || ICON_PATHS[n] || ""}</svg>`;
  const appIcon = s => typeof playIcon === "function" ? playIcon("fw", s) : gi("inspect", s);

  // rank insignia: a gold hexagon with the rank number, a star from Portfolio Manager up
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  function insignia(idx, size = 48) {
    const pts = k => [...Array(6)].map((_, i) => { const a = Math.PI / 3 * i - Math.PI / 2; return `${(32 + k * Math.cos(a)).toFixed(1)},${(32 + k * Math.sin(a)).toFixed(1)}`; }).join(" ");
    const star = idx >= 5 ? `<path d="M32 8.6l1.7 3.4 3.7.5-2.7 2.6.6 3.7-3.3-1.7-3.3 1.7.6-3.7-2.7-2.6 3.7-.5z" fill="#EBD29C"/>` : "";
    const t = ROMAN[idx] || "I";
    return `<svg class="fx-ins" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="fxg${idx}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DDAE"/><stop offset="1" stop-color="#A7803F"/></linearGradient>
        <linearGradient id="fxb${idx}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#21395C"/><stop offset="1" stop-color="#0D1A2C"/></linearGradient></defs>
      <polygon points="${pts(28)}" fill="url(#fxb${idx})" stroke="url(#fxg${idx})" stroke-width="2.6"/>
      <polygon points="${pts(22)}" fill="none" stroke="#F3DDAE" stroke-opacity=".22"/>
      ${star}
      <text x="32" y="${idx >= 5 ? 42 : 39.5}" text-anchor="middle" font-family="Newsreader, Georgia, serif" font-size="${t.length > 2 ? 15 : 19}" font-weight="600" fill="url(#fxg${idx})">${t}</text>
    </svg>`;
  }
  function ring(frac, size, stroke, inner) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0)), h = size / 2;
    return `<span class="fx-ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${stroke}" class="fx-ring-bg"/>
      <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${stroke}" class="fx-ring-fg" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - f)).toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg>
      <span class="fx-ring-in">${inner || ""}</span></span>`;
  }
  // the cast: initials on their own colours (all characters are fictional)
  const AV = { "Maya Chen": ["MC", "#E7BE85", "#8F4E3E"], "Daniel Ross": ["DR", "#95B8EC", "#2C4A80"], "Alex Morgan": ["AM", "#86D1BB", "#245F52"], "EVA": ["EVA", "#C9AEF4", "#55389A"], "The Board": ["TB", "#EBD29C", "#715A2F"] };
  function avatar(name, size = 40) {
    const [t, a, b] = AV[name] || [String(name).slice(0, 2).toUpperCase(), "#AAB5C2", "#33435A"];
    return `<span class="fx-av" style="--a:${a};--b:${b};width:${size}px;height:${size}px;font-size:${Math.round(size * (t.length > 2 ? 0.29 : 0.36))}px" aria-hidden="true">${t}</span>`;
  }
  // a chart banner drawn from the ticker: the same company always gets the same picture
  function caseArt(seed, cls) {
    const id = "fa" + String(seed).replace(/[^A-Za-z0-9]/g, "");
    let s = 7; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const n = 18, pts = []; let v = 40 + rnd() * 20;
    for (let i = 0; i < n; i++) { v = Math.max(16, Math.min(84, v + (rnd() - 0.42) * 16)); pts.push([i * (400 / (n - 1)), 100 - v]); }
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const bars = pts.map(p => { const hgt = 6 + rnd() * 20, up = rnd() > 0.4; return `<rect class="${up ? "up" : "dn"}" x="${(p[0] - 3.5).toFixed(1)}" y="${(p[1] - hgt / 2).toFixed(1)}" width="7" height="${hgt.toFixed(1)}" rx="1.4"/>`; }).join("");
    return `<svg class="fx-art ${cls || ""}" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C7A46C" stop-opacity=".34"/><stop offset="1" stop-color="#C7A46C" stop-opacity="0"/></linearGradient></defs>
      <g class="fx-art-grid">${[20, 40, 60, 80].map(y => `<path d="M0 ${y}H400"/>`).join("")}</g>
      <g class="fx-art-bars">${bars}</g>
      <path d="${line} L400 100 L0 100Z" fill="url(#${id})"/>
      <path d="${line}" class="fx-art-line" fill="none" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  // ---------- the console around every game page ----------
  const NAV = [["hq", "#/game", "home", "HQ"], ["story", "#/game/story", "map", "Cốt truyện"], ["cases", "#/game/cases", "folder", "Hồ sơ"], ["career", "#/game/career", "trophy", "Sự nghiệp"]];
  const SOON_NAV = [["lab", "#/game/lab", "flask", "Valuation"], ["sim", "#/game/sim", "trend", "Simulator"], ["league", "#/game/league", "users", "League"]];
  function navItem([id, href, ic, label], active, lock) {
    return `<a class="fx-nav ${active === id ? "on" : ""} ${lock ? "lock" : ""}" href="${href}" ${active === id ? 'aria-current="page"' : ""} title="${label}">${gi(ic, 21)}<span>${label}</span>${lock ? `<i class="fx-nav-lock">${icon("lock", 9)}</i>` : ""}</a>`;
  }
  function rail(active) {
    return `<aside class="fx-rail" aria-label="Financial Empire">
      <a class="fx-logo" href="#/game" aria-label="Financial Empire, HQ">${appIcon(40)}</a>
      <nav class="fx-rail-nav">${NAV.map(n => navItem(n, active)).join("")}<div class="fx-rail-sep"></div>${SOON_NAV.map(n => navItem(n, active, true)).join("")}</nav>
      <div class="fx-rail-foot"><button type="button" class="fx-nav" data-calc-open title="Máy tính BA II Plus">${icon("calc", 21)}<span>BA II Plus</span></button>${navItem(["intro", "#/game/intro", "help", "Luật chơi"], active)}${navItem(["exit", "#/dashboard", "exit", "Thoát"], active)}</div>
    </aside>`;
  }
  function tabbar(active) {
    return `<nav class="fx-tabbar" aria-label="Financial Empire">${[...NAV, ["exit", "#/dashboard", "exit", "Thoát"]].map(([id, href, ic, label]) =>
      `<a class="${active === id ? "on" : ""}" href="${href}" ${active === id ? 'aria-current="page"' : ""}>${gi(ic, 21)}<span>${label}</span></a>`).join("")}</nav>`;
  }
  function meChip() {
    const r = M.rankOf(xpTotal());
    return `<a class="fx-me" href="#/game/career" title="Sự nghiệp của bạn">${insignia(r.idx, 34)}<span class="fx-me-t"><b>${r.name}</b><small>Lv ${r.level} · ${r.xp} REP</small><i class="fx-me-bar"><i style="width:${Math.round(r.progress * 100)}%"></i></i></span></a>`;
  }
  function shell(active, head, body) {
    return `<div class="fx" id="fw-root">
      ${rail(active)}
      <div class="fx-main">
        <header class="fx-top">
          <a class="fx-brand-m" href="#/game">${appIcon(28)}<span>Financial Empire</span></a>
          <div class="fx-top-t">${head}</div>
          <div class="fx-top-r">${meChip()}</div>
        </header>
        ${body}
      </div>
      ${tabbar(active)}
    </div>`;
  }
  const head = (kicker, title, sub) => `<div class="fx-kicker">${kicker}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}`;

  // ================= HQ =================
  // the case to go on with: one in progress, else the next story chapter, else a real company not yet played
  function activeCase() {
    const g = prog();
    const runs = Object.entries(g.runs).filter(([, r]) => started(r)).sort((a, b) => (b[1].startedAt || 0) - (a[1].startedAt || 0));
    for (const [k, run] of runs) { const [dsId, arch] = k.split("|"), e = findDs(dsId); if (e && e.val.publishable && M.ARCHETYPES[arch]) return { e, arch, run }; }
    for (const ch of CHAPTERS) { const arch = ch[3]; if (arch && !g.best[M.caseKey(STORY_CASE, arch)] && M.unlocked(arch, g.best)) return { e: findDs(STORY_CASE), arch }; }
    for (const e of datasets()) if (!e.builtin && e.val.publishable) for (const a of M.ARCHETYPE_IDS) if (M.unlocked(a, g.best) && !g.best[M.caseKey(e.ds.id, a)]) return { e, arch: a };
    return null;
  }
  function pendingList(skip) {
    const g = prog(), out = [];
    datasets().forEach(e => {
      if (!e.val.publishable) return;
      M.ARCHETYPE_IDS.forEach(a => {
        const key = M.caseKey(e.ds.id, a);
        if (key === skip || g.best[key] || !M.unlocked(a, g.best)) return;
        const run = started(g.runs[key]) ? g.runs[key] : null;
        out.push({ e, a, run, t: run ? run.startedAt || 0 : 0 });
      });
    });
    return out.sort((x, y) => (y.run ? 1 : 0) - (x.run ? 1 : 0) || y.t - x.t).slice(0, 4);
  }
  const stepNo = run => Math.max(0, STEPS.findIndex(s => s.id === run.step)) + 1;

  function renderHQ() {
    const g = prog(), list = datasets(), best = g.best, r = M.rankOf(xpTotal()), act = activeCase();
    const scores = Object.values(best).map(b => b.score);
    const name = typeof callName === "function" ? callName() : "";
    const kpis = [
      ["briefcase", "Vụ án đã phá", scores.length, "mỗi công ty × nhiệm vụ"],
      ["trophy", "Điểm cao nhất", scores.length ? Math.max(...scores) : "—", "trên 100"],
      ["pulse", "Điểm trung bình", scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "—", "các vụ đã phá"],
      ["folder", "Hồ sơ doanh nghiệp", list.length, `${list.length - 1} công ty thật`]
    ];
    const pend = pendingList(act ? M.caseKey(act.e.ds.id, act.arch) : null);
    const tools = [
      ["terminal", "Financial Terminal", "Ba báo cáo, 31 chỉ số", 1], ["board", "Evidence Board", "Bằng chứng và giả thuyết", 1],
      ["inspect", "Formula Inspector", "EVA: công thức và nguồn", 1], ["workpaper", "Workpapers", "Tự tính, đối chiếu engine", 1],
      ["flask", "Valuation Lab", "DCF, WACC, bội số", 0, "#/game/lab"], ["trend", "Investment Simulator", "100 triệu VNĐ tiền ảo", 0, "#/game/sim"],
      ["users", "Analyst League", "Co-op và thi đấu", 0, "#/game/league"]
    ];
    const body = `<div class="fx-hq">
      ${heroHtml(act)}
      ${agentHtml(r)}
      <div class="fx-kpis">${kpis.map(([ic, l, v, s]) => `<div class="fx-kpi"><span class="fx-kpi-ic">${gi(ic, 18)}</span><div><b>${v}</b><span>${l}</span><small>${s}</small></div></div>`).join("")}</div>
      <section class="fx-panel fx-pend">
        <div class="fx-ph"><h2>Nhiệm vụ đang chờ</h2><a class="fx-link" href="#/game/cases">Tất cả hồ sơ ${icon("chevron", 14)}</a></div>
        ${pend.length ? `<div class="fx-mcards">${pend.map(p => {
          const A = M.ARCHETYPES[p.a], co = p.e.ds.company, ch = chapterOf(p.e.ds.id, p.a);
          return `<a class="fx-mcard" href="#/game/m/${esc(p.e.ds.id)}/${p.a}"><span class="fx-tk">${esc(co.ticker)}</span>
            <span class="fx-mcard-t"><b>${ch ? `Chương ${ch[0]} · ${ch[1]}` : `${A.code} · ${A.title}`}</b><small>${esc(co.name)}</small></span>
            <span class="fx-mcard-s ${p.run ? "on" : ""}">${p.run ? `Bước ${stepNo(p.run)}/7` : "Mới"}</span></a>`;
        }).join("")}</div>` : `<p class="fx-muted">Không còn nhiệm vụ nào đang chờ. Nạp thêm công ty ở mục Hồ sơ, hoặc chơi lại để nâng điểm.</p>`}
      </section>
      <section class="fx-panel fx-tools">
        <div class="fx-ph"><h2>Công cụ</h2></div>
        <div class="fx-tool-grid">${tools.map(([ic, t, d, on, href]) => {
          const inner = `<span class="fx-tool-ic">${gi(ic, 19)}</span><span class="fx-tool-t"><b>${t}</b><small>${d}</small></span><span class="fx-tool-s">${on ? "Sẵn sàng" : icon("lock", 12)}</span>`;
          return on ? `<div class="fx-tool on">${inner}</div>` : `<a class="fx-tool" href="${href}">${inner}</a>`;
        }).join("")}</div>
      </section>
      <section class="fx-panel fx-strip">
        <div class="fx-ph"><h2>The Black Ledger</h2><a class="fx-link" href="#/game/story">Cốt truyện ${icon("chevron", 14)}</a></div>
        ${miniPath(best)}
      </section>
    </div>`;
    view.innerHTML = shell("hq", head("Aurora Capital · Headquarters", `Chào buổi làm việc${name ? `, <em>${esc(name)}</em>` : ""}.`, "Numbers tell a story. Your job is to find what they are hiding."), body);
  }
  function heroHtml(act) {
    if (!act) return `<section class="fx-hero fx-hero-empty"><div class="fx-hero-body">
        <div class="fx-kicker">Mọi vụ án đang mở đã được phá</div><h2>Bàn làm việc đang trống</h2>
        <p class="fx-hero-blurb">Nạp thêm công ty VN30 để có vụ án mới, hoặc chơi lại một vụ để nâng điểm.</p>
        <div class="fx-hero-cta"><a class="fx-btn gold" href="#/game/cases">Mở hồ sơ ${icon("next", 16)}</a><a class="fx-btn ghost" href="#/game/story">Cốt truyện</a></div></div></section>`;
    const { e, arch, run } = act, A = M.ARCHETYPES[arch], ch = chapterOf(e.ds.id, arch), co = e.ds.company;
    const k = run ? stepNo(run) - 1 : -1;
    return `<section class="fx-hero">
      ${caseArt(co.ticker || e.ds.id, "fx-hero-art")}
      <div class="fx-hero-body">
        <div class="fx-kicker">${run ? "Vụ án đang điều tra" : "Vụ án tiếp theo"}${ch ? ` · Chương ${ch[0]}` : ""}</div>
        <h2>${ch ? ch[1] : A.title}</h2>
        <p class="fx-hero-blurb">${esc(ch ? ch[4] : A.question)}</p>
        <div class="fx-hero-meta"><span class="fx-tk">${esc(co.ticker)}</span><span>${esc(co.name)}</span><span class="fx-sep"></span><span class="fx-code">${A.code}</span><span>${A.vi}</span></div>
        <div class="fx-prog" aria-label="${run ? `Bước ${k + 1} trên 7` : "Chưa bắt đầu"}">${STEPS.map((s, i) => `<i class="${i < k ? "done" : i === k ? "now" : ""}" title="${s.vi}"></i>`).join("")}<span>${run ? `Bước ${k + 1}/7 · ${STEPS[k].vi}` : "Chưa bắt đầu"}</span></div>
        <div class="fx-hero-cta"><a class="fx-btn gold" href="#/game/m/${esc(e.ds.id)}/${arch}">${run ? "Tiếp tục điều tra" : "Nhận vụ án"} ${icon("next", 16)}</a>
          <a class="fx-btn ghost" href="${ch ? `#/game/story/${ch[0]}` : "#/game/cases"}">${ch ? "Xem chương" : "Hồ sơ"}</a></div>
      </div>
    </section>`;
  }
  function agentHtml(r) {
    const n = r.next;
    return `<section class="fx-panel fx-agent">
      <div class="fx-agent-top">${ring(r.progress, 112, 5, insignia(r.idx, 70))}
        <div><div class="fx-kicker">Analyst · Aurora Capital</div><div class="fx-agent-rank">${r.name}</div><div class="fx-agent-sub">Cấp ${r.level} · ${r.xp} Reputation</div></div></div>
      <div class="fx-agent-next">${n ? `<span class="fx-kicker">Cấp bậc kế tiếp</span><b>${n.name}</b><small>Cấp ${n.level} · còn ${n.xp - r.xp} REP · mở: ${esc(n.unlock)}</small>` : `<span class="fx-kicker">Cấp cao nhất</span><b>${r.name}</b>`}</div>
      <a class="fx-link" href="#/game/career">Lộ trình sự nghiệp ${icon("chevron", 14)}</a>
    </section>`;
  }
  function chState(ch, best) {
    const arch = ch[3];
    if (!arch) return "soon";
    if (best[M.caseKey(STORY_CASE, arch)]) return "done";
    return M.unlocked(arch, best) ? "open" : "lock";
  }
  function miniPath(best) {
    return `<ol class="fx-mini">${CHAPTERS.map(c => { const s = chState(c, best); return `<li class="${s}"><a href="#/game/story/${c[0]}" title="Chương ${c[0]} · ${c[1]}"><span>${s === "done" ? icon("check", 12) : c[0]}</span></a></li>`; }).join("")}</ol>
      <p class="fx-muted">${CHAPTERS.filter(c => chState(c, best) === "done").length}/10 chương hoàn thành · chương 1 và 3 chơi được, các chương khác đang được viết.</p>`;
  }

  // ================= STORY =================
  function renderStory(n) {
    const best = prog().best;
    const sel = CHAPTERS.find(c => String(c[0]) === String(n)) || CHAPTERS.find(c => chState(c, best) === "open") || CHAPTERS[0];
    const s = chState(sel, best), arch = sel[3], b = arch && best[M.caseKey(STORY_CASE, arch)];
    const stLine = { done: `Hoàn thành · điểm cao nhất ${b && b.score}/100`, open: "Sẵn sàng", lock: "Hoàn thành chương 1 để mở", soon: "Đang được viết" }[s];
    const cta = s === "done" || s === "open"
      ? `<a class="fx-btn gold" href="#/game/m/${STORY_CASE}/${arch}">${s === "done" ? "Chơi lại chương" : "Bắt đầu chương"} ${icon("next", 16)}</a>`
      : `<span class="fx-btn quiet" aria-disabled="true">${icon(s === "lock" ? "lock" : "clock", 15)} ${stLine}</span>`;
    const body = `<section class="fx-panel fx-mapcard">
        <ol class="fx-path">${CHAPTERS.map(c => {
          const cs = chState(c, best);
          return `<li class="fx-node ${cs} ${c === sel ? "sel" : ""}"><a href="#/game/story/${c[0]}" ${c === sel ? 'aria-current="true"' : ""}>
            <span class="fx-node-dot">${cs === "done" ? icon("check", 16) : cs === "soon" ? `<em>${c[0]}</em>` : cs === "lock" ? icon("lock", 14) : c[0]}</span>
            <span class="fx-node-t"><small>Chương ${c[0]}</small><b>${c[1]}</b></span></a></li>`;
        }).join("")}</ol>
      </section>
      <section class="fx-panel fx-chapter ${s}">
        ${caseArt("ch" + sel[0], "fx-chapter-art")}
        <div class="fx-chapter-body">
          <div class="fx-kicker">Chương ${sel[0]} / 10 · ${stLine}</div>
          <h2>${sel[1]}</h2>
          <p class="fx-chapter-syn">${esc(sel[4])}</p>
          <div class="fx-tags">${sel[2].split(", ").map(f => `<span class="fx-tag">${f}</span>`).join("")}${arch ? `<span class="fx-tag gold">${M.ARCHETYPES[arch].code} · ${M.ARCHETYPES[arch].title}</span>` : ""}</div>
          <div class="fx-chapter-cast">${sel[5].map(p => `<span title="${p}">${avatar(p, 34)}<small>${p}</small></span>`).join("")}</div>
          <div class="fx-hero-cta">${cta}</div>
        </div>
      </section>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Nhân vật</h2><span class="fx-muted">Mọi công ty và nhân vật trong truyện là hư cấu</span></div>
        <div class="fx-cast">${CAST.map(([nm, role, d]) => `<article class="fx-person">${avatar(nm, 52)}<b>${nm}</b><span>${role}</span><small>${d}</small></article>`).join("")}</div>
      </section>`;
    view.innerHTML = shell("story", head("Story Mode", "The Black Ledger", "Ngày đầu ở Aurora Capital, Maya Chen giao bạn hồ sơ một doanh nghiệp có lợi nhuận tăng nhanh. Qua mười chương, bạn phải phân biệt biến động kinh doanh bình thường, vốn lưu động yếu và những trường hợp nghiêm trọng hơn."), body);
  }

  // ================= CASE FILES =================
  function renderCases() {
    const list = datasets(), best = prog().best, real = list.filter(e => !e.builtin);
    if (G.imp === undefined) G.imp = real.length === 0;
    const f = G.filter;
    const filters = [["all", `Tất cả · ${list.length}`], ["real", `Công ty thật · ${real.length}`], ["sim", "Huấn luyện · 1"]];
    const body = `<div class="fx-toolbar">
        <div class="fx-seg" role="group" aria-label="Lọc hồ sơ">${filters.map(([k, l]) => `<button class="${f === k ? "on" : ""}" data-filter="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
        <label class="fx-search">${icon("search", 16)}<input id="fw-q" type="search" placeholder="Tìm mã hoặc tên công ty" aria-label="Tìm hồ sơ"></label>
        <button class="fx-btn ${G.imp ? "quiet" : "ghost"}" id="fw-imp" aria-expanded="${G.imp}">${icon(G.imp ? "x" : "upload", 15)} ${G.imp ? "Đóng" : "Nạp hồ sơ"}</button>
      </div>
      ${G.imp ? importPanel(list) : ""}
      <div class="fx-dossiers" id="fw-cos">${list.map(e => dossierCard(e, best)).join("")}</div>
      <p class="fx-muted fx-noq" id="fw-noq" hidden>Không có hồ sơ khớp.</p>
      <input type="file" id="fw-file" accept=".json,application/json" multiple hidden>`;
    view.innerHTML = shell("cases", head("Case files", "Hồ sơ doanh nghiệp", "Mỗi công ty có hai vụ án. Nạp một lần là mọi tài khoản trên máy này đều chơi được; điểm và cấp bậc riêng từng tài khoản."), body);
    bindCases();
  }
  function dossierCard(e, best) {
    const ds = e.ds, co = ds.company, passed = e.val.checks.filter(c => c.status === "pass").length;
    const src = ds.class === "SIMULATED" ? "Case huấn luyện · hư cấu" : `${esc(ds.source.attribution || ds.source.provider)}${ds.source.retrievedAt ? ` · ${dateVi(ds.source.retrievedAt)}` : ""}`;
    return `<article class="fx-dossier" data-q="${esc(`${co.ticker} ${co.name} ${co.sector}`.toLowerCase())}" data-kind="${e.builtin ? "sim" : "real"}" ${G.filter !== "all" && G.filter !== (e.builtin ? "sim" : "real") ? "hidden" : ""}>
      ${caseArt(co.ticker || ds.id, "fx-dossier-art")}
      <div class="fx-dossier-head"><span class="fx-tk big">${esc(co.ticker || "—")}</span>${chip(ds.class)}
        ${e.builtin ? "" : `<button class="fx-icon-btn" data-del="${esc(ds.id)}" title="Xoá hồ sơ" aria-label="Xoá hồ sơ ${esc(co.ticker)}">${icon("trash", 15)}</button>`}</div>
      <h3>${esc(co.name)}</h3>
      <p class="fx-dossier-sub">${[co.sector, yrs(ds)].filter(Boolean).map(esc).join(" · ")}</p>
      <div class="fx-dossier-meta"><span>${e.val.publishable ? `${icon("check", 13)} ${passed}/${e.val.checks.length} kiểm tra đạt` : `<b class="fx-bad">NOT PUBLISHABLE</b>`}</span><span>${src}</span></div>
      <div class="fx-dossier-ms">${e.val.publishable ? M.ARCHETYPE_IDS.map(a => missionRow(e, a, best)).join("") : `<p class="fx-bad small">${e.val.checks.filter(c => c.level === "block" && c.status === "fail").map(c => esc(c.label)).join(" · ")}</p>`}</div>
    </article>`;
  }
  function missionRow(e, archId, best) {
    const A = M.ARCHETYPES[archId], key = M.caseKey(e.ds.id, archId), open = M.unlocked(archId, best), b = best[key], run = prog().runs[key];
    let right, sub;
    if (!open) { right = icon("lock", 14); sub = `Mở khi xong ${M.ARCHETYPES[A.requires].code}`; }
    else if (b) { right = ring(b.score / 100, 38, 3.5, `<b>${b.score}</b>`); sub = "Điểm cao nhất"; }
    else if (started(run)) { right = `<span class="fx-pill on">Bước ${stepNo(run)}/7</span>`; sub = "Đang điều tra"; }
    else { right = `<span class="fx-pill">Mới</span>`; sub = A.vi; }
    const inner = `<span class="fx-code">${A.code}</span><span class="fx-mrow-t"><b>${A.title}</b><small>${sub}</small></span><span class="fx-mrow-r">${right}</span>`;
    return open ? `<a class="fx-mrow" href="#/game/m/${esc(e.ds.id)}/${archId}">${inner}</a>` : `<div class="fx-mrow off" aria-disabled="true">${inner}</div>`;
  }
  function importPanel(list) {
    const have = new Set(list.filter(e => !e.builtin).map(e => e.ds.company.ticker)), q = lib().quarantine;
    return `<section class="fx-panel fx-import">
      <div class="fx-ph"><h2>Nạp hoặc cập nhật công ty</h2><span class="fx-muted">Ai cần công ty nào thì lấy báo cáo của công ty đó</span></div>
      <div class="fx-import-grid">
        <div>
          <div class="fx-kicker">VN30 · rổ áp dụng từ ${VN30.asOf}</div>
          <div class="fx-tks">${VN30.nonfin.map(t => `<button class="fx-tkchip ${have.has(t) ? "have" : ""}" data-tk="${t}" title="${have.has(t) ? "Đã có; bấm để lấy câu cập nhật" : "Bấm để lấy câu yêu cầu"}">${have.has(t) ? icon("check", 11) : ""}${t}</button>`).join("")}
            ${VN30.fin.map(t => `<span class="fx-tkchip off" title="Ngân hàng, chứng khoán: mẫu BCTC khác, bản này chưa hỗ trợ">${t}</span>`).join("")}</div>
          <p class="fx-muted small">Mã gạch mờ là ngân hàng và công ty chứng khoán: mẫu báo cáo khác, chưa chơi được.</p>
        </div>
        <ol class="fx-howto">
          <li><b>Chọn mã, hoặc nhập mã khác</b><input class="fx-input" id="fw-tk" maxlength="10" placeholder="VD: HPG" autocomplete="off" spellcheck="false"></li>
          <li><b>Gửi cho Claude (đã kết nối WiData MCP) câu sau</b><div class="fx-req"><code id="fw-req">${requestText("HPG", have.has("HPG"))}</code><button class="fx-btn quiet sm" id="fw-copy">Sao chép</button></div></li>
          <li><b>Claude gửi lại file .json; nạp vào đây</b><div class="fx-row"><button class="fx-btn gold sm" id="fw-pick">${icon("upload", 15)} Nạp file</button><button class="fx-btn ghost sm" id="fw-paste">Dán nội dung</button></div></li>
        </ol>
      </div>
      <p class="fx-muted small">Nhận báo cáo năm, hợp nhất, của doanh nghiệp phi tài chính; một file có thể chứa nhiều công ty. File phải qua mọi kiểm tra bắt buộc mới được chơi; file không đạt bị cách ly kèm lý do. Nạp lại cùng công ty và cùng kỳ thì số mới thay số cũ. Số liệu WiData chỉ dùng cá nhân: file nằm trên thiết bị này, không đưa lên web.</p>
      ${q.length ? `<div class="fx-quar"><div class="fx-ph"><h3>Bị cách ly · NOT PUBLISHABLE</h3><button class="fx-btn quiet sm" id="fw-qclear">Xoá danh sách</button></div>
        <ul>${q.slice().reverse().map(x => `<li><b>${esc(x.company || x.name || "File")}</b> <span class="fx-muted small">${esc(x.name || "")} · ${new Date(x.at).toLocaleString("vi-VN")}</span>
          <ul>${(x.errors || []).slice(0, 6).map(er => `<li>${esc(er)}</li>`).join("")}</ul></li>`).join("")}</ul></div>` : ""}
    </section>`;
  }
  function bindCases() {
    const root = document.getElementById("fw-root");
    const apply = () => {
      const t = (document.getElementById("fw-q").value || "").trim().toLowerCase();
      let shown = 0;
      root.querySelectorAll(".fx-dossier").forEach(el => {
        el.hidden = (!!t && !el.dataset.q.includes(t)) || (G.filter !== "all" && el.dataset.kind !== G.filter);
        if (!el.hidden) shown++;
      });
      document.getElementById("fw-noq").hidden = shown > 0;
    };
    document.getElementById("fw-q").oninput = apply;
    root.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => {
      G.filter = b.dataset.filter;
      root.querySelectorAll("[data-filter]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
      apply();
    });
    document.getElementById("fw-imp").onclick = () => { G.imp = !G.imp; renderCases(); };
    const tk = document.getElementById("fw-tk"), req = document.getElementById("fw-req");
    if (tk) {
      const have = new Set(datasets().filter(e => !e.builtin).map(e => e.ds.company.ticker));
      const setTk = v => { req.textContent = requestText(v || "HPG", have.has(v)); };
      tk.oninput = () => { tk.value = tk.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); setTk(tk.value); };
      root.querySelectorAll("[data-tk]").forEach(b => b.onclick = () => { tk.value = b.dataset.tk; setTk(b.dataset.tk); const box = req.closest(".fx-req"); box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash"); });
      document.getElementById("fw-copy").onclick = () => copyText(req.textContent);
      const file = document.getElementById("fw-file");
      document.getElementById("fw-pick").onclick = () => file.click();
      file.onchange = async () => {
        for (const f of Array.from(file.files)) {
          if (f.size > 3e6) { addQuarantine({ name: f.name, errors: ["File lớn hơn 3 MB"] }); continue; }
          importText(await f.text(), f.name);
        }
        file.value = "";
        renderCases();
      };
      document.getElementById("fw-paste").onclick = pasteDialog;
      const qc = document.getElementById("fw-qclear");
      if (qc) qc.onclick = () => { lib().quarantine = []; saveLib(); renderCases(); };
    }
    root.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      const id = b.dataset.del, e = findDs(id);
      const ok = await confirmDialog({ title: "Xoá hồ sơ này?", message: `${esc(e ? `${e.ds.company.ticker} · ${e.ds.company.name}` : id)}: file dữ liệu bị xoá khỏi thiết bị, với mọi tài khoản. Điểm cao nhất vẫn được giữ.`, confirmText: "Xoá", danger: true });
      if (!ok) return;
      lib().datasets = lib().datasets.filter(d => d.id !== id); saveLib(); G.all = null;
      Object.keys(prog().runs).forEach(k => { if (k.startsWith(id + "|")) delete prog().runs[k]; });
      save(); toast("Đã xoá hồ sơ"); renderCases();
    });
  }

  function copyText(t) {
    const fallback = () => {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Đã sao chép"); } catch (e) { toast("Không sao chép được; hãy chọn và sao chép tay", "error"); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast("Đã sao chép"), fallback);
    else fallback();
  }

  // ---------- import ----------
  // keep only what the game reads; values stay in the file's own unit
  function cleanRaw(raw, ds) {
    const values = {};
    (raw.years || []).forEach(y => {
      const row = (raw.values || {})[y] || (raw.values || {})[String(y)] || {};
      values[y] = Object.fromEntries(Object.keys(E.ITEMS).filter(k => row[k] !== undefined).map(k => [k, row[k]]));
    });
    return { schema: raw.schema, id: ds.id, class: raw.class, company: raw.company, scope: raw.scope, years: raw.years, values, periodMeta: raw.periodMeta || {},
      lineage: raw.lineage || {}, source: raw.source || {}, exceptions: raw.exceptions || [], story: raw.story || null };
  }
  function addQuarantine(x) { lib().quarantine.push({ at: Date.now(), ...x }); lib().quarantine = lib().quarantine.slice(-12); saveLib(); }
  function importText(text, name) {
    let j;
    try { j = JSON.parse(text); } catch (e) { addQuarantine({ name, errors: ["Không đọc được: nội dung không phải JSON hợp lệ."] }); toast("File bị cách ly: không phải JSON", "error"); return { added: 0, held: 1 }; }
    const list = Array.isArray(j) ? j : j && j.schema === "fw-pack/1" && Array.isArray(j.datasets) ? j.datasets : [j];
    let added = 0, updated = 0, held = 0;
    list.slice(0, 60).forEach(raw => {
      const who = raw && raw.company ? `${raw.company.ticker || ""} ${raw.company.name || ""}`.trim() : "";
      const n = E.normalize(raw);
      if (!n.ok) { addQuarantine({ name, company: who, errors: n.errors }); held++; return; }
      if (n.ds.id === SAMPLE.dataset().id) { addQuarantine({ name, company: who, errors: ["Trùng mã hồ sơ của case huấn luyện."] }); held++; return; }
      const val = E.validate(n.ds);
      if (!val.publishable) { addQuarantine({ name, company: `${who} · ${yrs(n.ds)}`, errors: val.checks.filter(c => c.level === "block" && c.status === "fail").map(c => `${c.label}: ${c.detail}`) }); held++; return; }
      const clean = cleanRaw(raw, n.ds), i = lib().datasets.findIndex(d => d.id === clean.id);
      if (i >= 0) { lib().datasets[i] = clean; updated++; } else { lib().datasets.push(clean); added++; }
    });
    saveLib(); G.all = null;
    const parts = [added ? `thêm ${added}` : "", updated ? `cập nhật ${updated}` : "", held ? `${held} bị cách ly` : ""].filter(Boolean);
    if (added || updated) toast(`Hồ sơ: ${parts.join(", ")}`);
    else if (held) toast("File bị cách ly: không qua kiểm tra bắt buộc", "error");
    return { added, updated, held };
  }
  function pasteDialog() {
    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal fw-paste" role="dialog" aria-modal="true" aria-labelledby="fw-paste-t">
      <h2 id="fw-paste-t">Dán nội dung file</h2>
      <p class="text-2 small">Dán toàn bộ nội dung file <span class="mono">.json</span> mà Claude gửi.</p>
      <textarea class="textarea mono" id="fw-paste-text" rows="9" spellcheck="false" aria-label="Nội dung file"></textarea>
      <div class="modal-actions"><button class="btn btn-ghost" data-act="cancel">Huỷ</button><button class="btn btn-primary" data-act="ok">Nạp</button></div></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("show"));
    const ta = ov.querySelector("textarea");
    ta.focus();
    const close = () => { ov.classList.remove("show"); document.removeEventListener("keydown", onKey, true); setTimeout(() => ov.remove(), 180); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey, true);
    ov.addEventListener("click", e => {
      if (e.target === ov) { close(); return; }
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act !== "ok") { close(); return; }
      if (!ta.value.trim()) { ta.focus(); return; }
      if (ta.value.length > 3e6) { toast("Nội dung quá lớn", "error"); return; }
      importText(ta.value, "Nội dung dán");
      close(); renderCases();
    });
  }

  // ================= CAREER =================
  function renderCareer() {
    const g = prog(), r = M.rankOf(xpTotal());
    const rows = Object.entries(g.best).map(([k, b]) => {
      const [dsId, a] = k.split("|"), e = findDs(dsId), A = M.ARCHETYPES[a];
      return { k, b, co: e ? e.ds.company : { ticker: dsId.toUpperCase(), name: "Hồ sơ đã xoá khỏi máy" }, A, link: e && A ? `#/game/m/${esc(dsId)}/${a}` : "" };
    }).sort((x, y) => (y.b.at || 0) - (x.b.at || 0));
    const body = `<section class="fx-panel fx-career-hero">
        ${ring(r.progress, 164, 7, insignia(r.idx, 104))}
        <div><div class="fx-kicker">Cấp ${r.level} / 50 · ${r.xp} Reputation</div><h2>${r.name}</h2>
          <p class="fx-muted">${r.next ? `Còn ${r.next.xp - r.xp} Reputation để lên <b>${r.next.name}</b> (cấp ${r.next.level}), mở: ${esc(r.next.unlock)}.` : "Bạn đã ở cấp bậc cao nhất."}</p>
          <div class="fx-bar"><i style="width:${Math.round(r.progress * 100)}%"></i></div>
          <p class="fx-muted small">Đây là tiến trình trong game, không phải chứng nhận năng lực nghề nghiệp.</p></div>
      </section>
      <div class="fx-career-grid">
        <section class="fx-panel">
          <div class="fx-ph"><h2>Lộ trình</h2><span class="fx-muted">20 Reputation lên một cấp</span></div>
          <ol class="fx-ladder">${M.RANKS.map((x, i) => `<li class="${i < r.idx ? "past" : i === r.idx ? "now" : ""}">${insignia(i, 40)}
            <span class="fx-ladder-t"><b>${x.name}</b><small>Cấp ${x.level} · ${x.xp} REP · mở: ${esc(x.unlock)}</small></span>
            <span class="fx-ladder-s">${i < r.idx ? icon("check", 15) : i === r.idx ? "Hiện tại" : icon("lock", 13)}</span></li>`).join("")}</ol>
        </section>
        <div class="fx-col">
          <section class="fx-panel">
            <div class="fx-ph"><h2>Reputation theo vụ án</h2><span class="fx-muted">${rows.length} vụ</span></div>
            ${rows.length ? `<ul class="fx-rep">${rows.map(x => `<li>${x.link ? `<a href="${x.link}">` : "<div>"}<span class="fx-tk">${esc(x.co.ticker)}</span>
              <span class="fx-rep-t"><b>${x.A ? `${x.A.code} · ${x.A.title}` : esc(x.k)}</b><small>${esc(x.co.name)}</small></span>${ring(x.b.score / 100, 40, 3.5, `<b>${x.b.score}</b>`)}${x.link ? "</a>" : "</div>"}</li>`).join("")}</ul>`
              : `<p class="fx-muted">Chưa có vụ án nào được phá. Điểm cao nhất của mỗi vụ án được cộng vào Reputation.</p>`}
          </section>
          <section class="fx-panel">
            <div class="fx-ph"><h2>Quy tắc thăng tiến</h2></div>
            <ul class="fx-rules">${["Reputation là tổng điểm cao nhất của từng vụ án (một công ty × một nhiệm vụ, tối đa 100).", "Chơi lại chỉ giữ lần cao nhất: không thể farm vụ án đã xong.", "Không có điểm cho tốc độ hay số lần bấm: chỉ chất lượng lập luận được tính.", "Công cụ cơ bản luôn có sẵn; người mới không phải thắng ai để mở cốt truyện."].map(t => `<li>${icon("check", 15)}<span>${t}</span></li>`).join("")}</ul>
          </section>
        </div>
      </div>`;
    view.innerHTML = shell("career", head("Career", "Sự nghiệp tại Aurora Capital", "Junior Analyst → Senior Analyst → Head of Research → Portfolio Manager → Investment Director → Fund Founder."), body);
  }

  // ================= MODULES STILL TO COME =================
  const SOON = {
    lab: { ic: "flask", title: "Valuation Lab", kicker: "Mở ở Investment Director · cấp 40", state: "Đang xây dựng",
      text: "Phòng thí nghiệm định giá: lập mô hình, rồi bảo vệ từng giả định trước Daniel Ross.",
      items: ["DCF: FCFF, WACC, CAPM, Terminal Value", "Cầu nối Enterprise Value → Equity Value → giá trị mỗi cổ phiếu", "Bội số: P/E, P/B, EV/EBITDA, EV/EBIT, EV/Sales", "Kiểm soát chất lượng: WACC ≤ g, Terminal Value quá lớn, CAPEX bất thường"] },
    sim: { ic: "trend", title: "Investment Simulator", kicker: "100.000.000 VNĐ tiền ảo", state: "Đang xây dựng",
      text: "Biến kết luận phân tích thành quyết định danh mục và nhìn thấy hệ quả. Không nạp, rút hay giao dịch tiền thật.",
      items: ["Phân bổ danh mục, mua bán cổ phiếu mô phỏng, giữ tiền mặt", "Lãi lỗ, đóng góp lợi nhuận, drawdown, Sharpe", "Historical Replay chỉ dùng thông tin đã công bố tại thời điểm mô phỏng", "Kịch bản: Base, Bull, Bear, khủng hoảng thanh khoản, sốc lãi suất"],
      extra: `<p class="fx-muted small">Trong lúc chờ, trang <a href="#/trade">Giả lập chứng khoán</a> của CFA Study cho bạn luyện mua bán với giá thật và tiền ảo (ngoài game).</p>` },
    league: { ic: "users", title: "Analyst League", kicker: "Chơi nhiều người", state: "Cần máy chủ",
      text: "Co-op điều tra, Analyst Battle, Investment Committee và Fund Wars. Mọi người phải nhận cùng dữ liệu, cùng lúc, và điểm phải được chấm ở máy chủ để không ai sửa được từ trình duyệt.",
      items: ["Financial Detective Co-op: 2–4 người, chung một bảng bằng chứng", "Analyst Battle: 2–8 người, cùng dữ liệu, có giới hạn thời gian", "Investment Committee: trình bày và phản biện", "Fund Wars: quỹ tiền ảo, cùng nguồn giá và quy tắc khớp lệnh"],
      extra: `<p class="fx-muted small">Website này là trang tĩnh, chưa có máy chủ, nên phần chơi nhiều người chưa thể mở.</p>` }
  };
  function renderSoon(id) {
    const s = SOON[id];
    const body = `<section class="fx-panel fx-soon">
      <div class="fx-soon-ic">${gi(s.ic, 40)}</div>
      <div class="fx-kicker">${s.kicker}</div><h2>${s.title}</h2><span class="fx-pill">${icon("lock", 12)} ${s.state}</span>
      <p>${s.text}</p>
      <ul class="fx-rules">${s.items.map(t => `<li>${icon("check", 15)}<span>${t}</span></li>`).join("")}</ul>
      ${s.extra || ""}
      <div class="fx-hero-cta"><a class="fx-btn gold" href="#/game">Về HQ ${icon("next", 16)}</a></div>
    </section>`;
    view.innerHTML = shell(id, head("Module", s.title, ""), body);
  }

  // ================= CASE INVESTIGATION =================
  // computer: the case file (steps, question, hypotheses) on the left, the step on the right;
  // phone: the steps scroll across the top
  function renderMission(dsId, archId) {
    const e = findDs(dsId), arch = M.ARCHETYPES[archId];
    const fail = (title, text) => { G.cur = null; view.innerHTML = shell("cases", head("Case files", "Hồ sơ", ""), `<section class="fx-panel">${emptyState("alert", title, text, `<a class="fx-btn gold" href="#/game/cases">Về hồ sơ</a>`)}</section>`); };
    if (!e || !arch) return fail("Không tìm thấy hồ sơ", "Hồ sơ hoặc nhiệm vụ này không có trên thiết bị.");
    if (!e.val.publishable) return fail("NOT PUBLISHABLE", "Bộ dữ liệu này không qua kiểm tra bắt buộc nên không dùng để chơi.");
    if (!M.unlocked(archId, prog().best)) return fail("Nhiệm vụ chưa mở", `Hoàn thành ${M.ARCHETYPES[arch.requires].code} ở một hồ sơ bất kỳ để mở nhiệm vụ này.`);
    const cs = caseFor(e, archId);
    if (!cs.playable) return fail("Chưa đủ dữ liệu cho nhiệm vụ này", cs.notPlayable.map(esc).join(" "));
    const key = M.caseKey(e.ds.id, archId), st = runOf(key), co = e.ds.company, ch = chapterOf(e.ds.id, archId);
    G.cur = { key, cs, st, e, ch };
    if (!G.sel || !st.pins.includes(G.sel)) G.sel = null;
    view.innerHTML = `<div class="fx fx-is-mission" id="fw-root">
      ${rail(ch ? "story" : "cases")}
      <div class="fx-main">
        <header class="fx-mtop">
          <a class="fx-back" href="${ch ? `#/game/story/${ch[0]}` : "#/game/cases"}" aria-label="Quay lại">${icon("back", 18)}</a>
          <div class="fx-mtop-t"><div class="fx-kicker">${arch.code} · ${arch.title}${ch ? ` · Chương ${ch[0]}` : ""}</div>
            <h1>${esc(co.name)} <span class="fx-tk">${esc(co.ticker)}</span></h1></div>
          <div class="fx-mtop-r">${chip(e.ds.class)}<span class="fx-pins" title="Bằng chứng đã ghim">${icon("pin", 15)}<b id="fw-pin-count">${st.pins.length}</b></span></div>
        </header>
        <div class="fx-case">
          <aside class="fx-casefile">
            <nav class="fx-steps-wrap" id="fw-stepper" aria-label="Các bước của vụ án"></nav>
            <div class="fx-cf"><div class="fx-kicker">Câu hỏi của vụ án</div><p>${esc(arch.question)}</p></div>
            <div class="fx-cf"><div class="fx-kicker">Giả thuyết</div><ul class="fx-cf-hyps" id="fw-side-hyps"></ul></div>
            <div class="fx-cf fx-cf-help">${gi("inspect", 16)}<span>Bấm vào bất kỳ con số nào để EVA mở <b>Formula Inspector</b>: công thức, đầu vào và nguồn.</span></div>
          </aside>
          <section class="fx-stage" id="fw-step"></section>
        </div>
      </div>
    </div>`;
    const root = document.getElementById("fw-root");
    root.addEventListener("click", onMissionClick);
    root.addEventListener("submit", onMissionSubmit);
    root.addEventListener("input", onMissionInput);
    drawStep();
  }

  function canGo(id) {
    const st = G.cur.st;
    if (id === "result") return st.done;
    if (id === "committee") return st.done || !!(st.decision && st.confidence);
    return true;
  }
  function stepDone(id) {
    const { cs, st } = G.cur;
    switch (id) {
      case "brief": return st.done || st.step !== "brief" || st.pins.length > 0;
      case "terminal": return st.pins.length > 0;
      case "board": return cs.hyps.every(h => st.verdicts[h.id]);
      case "work": return cs.workpapers.every(w => st.wp[w.id] && st.wp[w.id].checked);
      case "decide": return !!(st.decision && st.confidence);
      default: return st.done;
    }
  }
  function stepper() {
    const st = G.cur.st;
    return `<ol class="fx-steps">${STEPS.map((s, i) => {
      const cur = st.step === s.id, done = stepDone(s.id);
      return `<li><button class="fx-step ${cur ? "on" : ""} ${done ? "done" : ""}" data-step="${s.id}" ${canGo(s.id) ? "" : "disabled"} ${cur ? 'aria-current="step"' : ""}>
        <span class="fx-step-n">${done && !cur ? icon("check", 13) : i + 1}</span><span class="fx-step-t"><b>${s.vi}</b><small>${s.en}</small></span></button></li>`;
    }).join("")}</ol>`;
  }
  function sideHyps() {
    const { cs, st } = G.cur;
    return cs.hyps.map(h => { const v = st.verdicts[h.id]; return `<li><span class="fx-hid">${h.id}</span><span class="fx-cf-ht">${esc(h.tag)}</span>${v ? `<i class="fx-sdot fw-st-${v.toLowerCase()}" title="${M.STATUS[v].vi}"></i>` : `<i class="fx-sdot" title="Chưa kết luận"></i>`}</li>`; }).join("");
  }
  function drawStep(scroll) {
    if (!G.cur) return;
    const st = G.cur.st;
    if (!STEPS.some(s => s.id === st.step) || !canGo(st.step)) st.step = st.done ? "result" : "brief";
    document.getElementById("fw-stepper").innerHTML = stepper();
    document.getElementById("fw-side-hyps").innerHTML = sideHyps();
    document.getElementById("fw-step").innerHTML = ({ brief: briefHtml, terminal: terminalHtml, board: boardHtml, work: workHtml, decide: decideHtml, committee: committeeHtml, result: resultHtml })[st.step]();
    const nav = document.querySelector(".fx-steps"), on = nav && nav.querySelector(".fx-step.on");
    if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.parentElement.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2);
    if (scroll) {
      const top = document.getElementById("fw-step").getBoundingClientRect().top + window.scrollY - 84;
      if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

  function onMissionClick(ev) {
    const t = ev.target.closest("button, a, [data-close]");
    if (!t || !G.cur) return;
    const { st } = G.cur, d = t.dataset;
    if (d.step) { if (canGo(d.step)) { st.step = d.step; save(); drawStep(true); } return; }
    if (d.go) { if (canGo(d.go)) { st.step = d.go; save(); drawStep(true); } return; }
    if (d.tab) {
      G.tab = d.tab;
      if (!st.done && d.tab === "checks" && !st.viewedChecks) { st.viewedChecks = true; save(); }
      if (!st.done && d.tab === "source" && !st.viewedSource) { st.viewedSource = true; save(); }
      drawStep(); return;
    }
    if (d.insp) { openInspector(d.insp); return; }
    if (d.close !== undefined) { closeDrawer(); return; }
    if (d.replay !== undefined) { replay(); return; }
    if (d.sel) { if (st.done) return; G.sel = G.sel === d.sel ? null : d.sel; drawStep(); return; }
    const edits = ["pin", "unpin", "unlink", "attach", "verdict", "decision", "conf", "c1", "c2", "c3", "submit"];
    if (!edits.some(k => d[k] !== undefined)) return;
    if (st.done) { toast("Hồ sơ đã nộp. Bấm Chơi lại để làm lại từ đầu.", "error"); return; }
    if (d.pin) { togglePin(d.pin); return; }
    if (d.unpin) { unpin(d.unpin); if (G.sel === d.unpin) G.sel = null; save(); drawStep(); return; }
    if (d.unlink) { const [h, c, r] = d.unlink.split("~"); st.links = st.links.filter(l => !(l.h === h && l.c === c && l.r === r)); save(); drawStep(); return; }
    if (d.attach) {                                         // the selected evidence → this hypothesis, with this relation
      const [h, r] = d.attach.split("~"), c = G.sel;
      if (!c || !G.cur.cs.hyps.some(x => x.id === h) || !M.RELATIONS[r]) return;
      const had = st.links.find(l => l.h === h && l.c === c);
      st.links = st.links.filter(l => !(l.h === h && l.c === c));      // one relation per card and hypothesis
      if (!had || had.r !== r) st.links.push({ h, c, r });
      save(); drawStep(); return;
    }
    if (d.verdict) { const [h, v] = d.verdict.split("~"); if (st.verdicts[h] === v) delete st.verdicts[h]; else st.verdicts[h] = v; save(); drawStep(); return; }
    if (d.decision) { st.decision = d.decision; save(); drawStep(); return; }
    if (d.conf) { st.confidence = d.conf; save(); drawStep(); return; }
    if (d.c1) {
      const i = st.c1.indexOf(d.c1);
      if (i >= 0) st.c1.splice(i, 1); else if (st.c1.length < 3) st.c1.push(d.c1); else { toast("Chọn tối đa 3 bằng chứng", "error"); return; }
      save(); drawStep(); return;
    }
    if (d.c2) { st.c2 = st.c2 === d.c2 ? null : d.c2; save(); drawStep(); return; }
    if (d.c3) { const i = st.c3.indexOf(d.c3); if (i >= 0) st.c3.splice(i, 1); else st.c3.push(d.c3); save(); drawStep(); return; }
    if (d.submit !== undefined) submit();
  }
  function onMissionSubmit(ev) {
    const f = ev.target;
    if (!f.matches("form") || !G.cur) return;
    ev.preventDefault();
    if (G.cur.st.done) return;
    if (f.dataset.wp) checkWorkpaper(f.dataset.wp, f.elements.v.value);
  }
  function onMissionInput(ev) {
    if (ev.target.id === "fw-thesis" && G.cur && !G.cur.st.done) {
      G.cur.st.thesis = ev.target.value.slice(0, 600);
      clearTimeout(G.saveT); G.saveT = setTimeout(save, 400);
    }
  }
  function togglePin(id) {
    const st = G.cur.st, on = !st.pins.includes(id);
    if (on) st.pins.push(id); else { unpin(id); if (G.sel === id) G.sel = null; }
    save();
    document.querySelectorAll(`[data-pin="${id}"]`).forEach(b => {
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
      const label = on ? "Bỏ ghim" : "Ghim làm bằng chứng";
      b.title = label; b.setAttribute("aria-label", label);
      if (b.classList.contains("fw-pin-wide")) b.innerHTML = `${icon("pin", 15)} ${on ? "Đã ghim · bấm để bỏ" : "Ghim làm bằng chứng"}`;
      const row = b.closest("tr"); if (row) row.classList.toggle("pinned", on);
    });
    const n = document.getElementById("fw-pin-count");
    if (n) { n.textContent = st.pins.length; const box = n.parentElement; box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
    const sn = document.getElementById("fw-stepper");
    if (sn) sn.innerHTML = stepper();
    if (st.step === "board") drawStep();
  }
  function unpin(id) {
    const st = G.cur.st;
    st.pins = st.pins.filter(p => p !== id);
    st.links = st.links.filter(l => l.c !== id);
    st.c1 = st.c1.filter(p => p !== id);
    if (st.c2 === id) st.c2 = null;
  }
  // the latest-year value of a workpaper ratio stays hidden until the player has done it
  function locked(metricId, year) {
    const { cs, st } = G.cur;
    return !st.done && cs.workpapers.some(w => w.id === metricId && w.year === year) && !(st.wp[metricId] && st.wp[metricId].checked);
  }
  const from = (name, role, text) => `<div class="fx-from">${avatar(name, 44)}<div class="fx-from-t"><b>${name}</b><small>${role}</small>${text ? `<p>${text}</p>` : ""}</div></div>`;

  // ---------- 1. Case file ----------
  function briefHtml() {
    const { cs, e, ch } = G.cur, ds = e.ds, co = ds.company, man = cs.c.man;
    return `<div class="fx-brief">
      <article class="fx-panel fx-memo">
        ${from("Maya Chen", "Head of Research → bạn", "")}
        <div class="fx-memo-text">${esc(cs.memo)}</div>
        ${ds.story && ds.story.brief ? `<p class="fx-memo-story">${esc(ds.story.brief)} <span class="fx-muted">(kịch bản mô phỏng)</span></p>` : ""}
        ${ch ? `<p class="fx-memo-story">${gi("map", 15)} Chương ${ch[0]} · ${ch[1]}: ${esc(ch[4])}</p>` : ""}
        <div class="fx-ask"><div class="fx-kicker">Câu hỏi bạn phải trả lời</div><p>${esc(cs.question)}</p></div>
      </article>
      <article class="fx-panel fx-file">
        ${caseArt(co.ticker || ds.id, "fx-file-art")}
        <div class="fx-file-head"><span class="fx-tk big">${esc(co.ticker)}</span>${chip(ds.class)}</div>
        <h3>${esc(co.name)}</h3>
        <dl class="fx-dl">
          <dt>Sàn</dt><dd>${esc(co.exchange || "—")}</dd>
          <dt>Ngành</dt><dd>${esc(co.sector || "—")}</dd>
          <dt>Kỳ</dt><dd>${yrs(ds)} · báo cáo năm</dd>
          <dt>Phạm vi</dt><dd>${ds.scope.basis === "consolidated" ? "Hợp nhất" : "Riêng lẻ"} · ${esc(ds.scope.framework)}</dd>
          <dt>Nguồn</dt><dd>${esc(ds.source.attribution || ds.source.provider)}</dd>
        </dl>
      </article>
    </div>
    <article class="fx-panel">
      <div class="fx-ph"><h2>Hồ sơ gồm những gì</h2>${man.reconciled ? `<span class="fx-pill ok">${icon("check", 12)} Đã đối chiếu</span>` : `<span class="fx-pill bad">Chưa đối chiếu</span>`}</div>
      <ul class="fx-manifest">${man.rows.map(r => `<li class="${r.qa === "PASS" ? "ok" : "bad"}">${icon(r.qa === "PASS" ? "check" : "alert", 16)}<b>${r.name}</b><span>${r.retrieved}/${r.expected} năm</span><span class="fx-pill ${r.qa === "PASS" ? "ok" : "bad"}">${r.qa}</span></li>`).join("")}</ul>
      <p class="fx-muted small"><b>Không có trong hồ sơ:</b> ${man.outOfScope.map(o => o.name).join(" · ")}.</p>
    </article>
    <article class="fx-panel">
      <div class="fx-ph"><h2>Giả thuyết cần kiểm định</h2><span class="fx-muted">Giả thuyết tích cực cũng cần bằng chứng</span></div>
      <div class="fx-hyp-grid">${cs.hyps.map(h => `<div class="fx-hcard ${h.pol > 0 ? "pos" : "risk"}"><div class="fx-hcard-h"><span class="fx-hid">${h.id}</span><span class="fx-tag">${esc(h.tag)}</span><span class="fx-pol">${h.pol > 0 ? "Tích cực" : "Rủi ro"}</span></div><p>${esc(h.title)}</p></div>`).join("")}</div>
      <p class="fx-muted small">CFA Level I · ${cs.arch.los.map(k => E.LOS[k]).join(" · ")}</p>
    </article>
    ${nextBtn("terminal", "Mở Financial Terminal")}`;
  }

  // ---------- 2. Financial Terminal ----------
  function terminalHtml() {
    const tabs = [["fs", "Báo cáo tài chính"], ["ratios", "Chỉ số"], ["checks", "Kiểm tra dữ liệu"], ["source", "Nguồn & lineage"]];
    const body = ({ fs: fsHtml, ratios: ratiosHtml, checks: checksHtml, source: sourceHtml })[G.tab] || fsHtml;
    return `<div class="fx-term-bar"><div class="fx-seg" role="tablist">${tabs.map(([k, v]) => `<button class="${G.tab === k ? "on" : ""}" role="tab" aria-selected="${G.tab === k}" data-tab="${k}">${v}</button>`).join("")}</div></div>
      ${body()}
      ${nextBtn("board", "Sang Evidence Board")}`;
  }
  function fsHtml() {
    const { e, st } = G.cur, ds = e.ds;
    const notes = { bs: "Số dư cuối năm", is: "Cả năm", cf: "Cả năm · số âm là tiền chi ra" };
    return `<p class="fx-hint">${chip(ds.class)} Đơn vị: tỷ đồng · bấm một con số để xem nguồn · bấm ${icon("pin", 13)} để ghim cả dòng làm bằng chứng</p>` +
      Object.keys(SEC_NAME).map(sec => `<section class="fx-panel fx-sheet">
        <div class="fx-ph"><h2>${SEC_NAME[sec]}</h2><span class="fx-muted">${notes[sec]}</span></div>
        <div class="fx-table-wrap"><table class="fx-table"><thead><tr><th scope="col">Khoản mục</th>${ds.years.map(y => `<th class="num" scope="col">${y}</th>`).join("")}<th class="fx-pin-col"><span class="sr-only">Ghim</span></th></tr></thead><tbody>
        ${E.ORDER[sec].map(k => {
          const it = E.ITEMS[k], id = "i:" + k, on = st.pins.includes(id);
          return `<tr class="${E.SUBTOTALS.includes(k) ? "sub" : ""} ${on ? "pinned" : ""}"><th scope="row"><span>${it.vi}</span><small>${it.en}</small></th>
            ${ds.years.map(y => { const v = ds.values[y][k]; return v === null ? `<td class="num na" title="Không có trong dữ liệu">—</td>` : `<td class="num ${v < 0 ? "neg" : ""}"><button class="fw-cell" data-insp="${id}|${y}">${ty(v)}</button></td>`; }).join("")}
            <td class="fx-pin-col">${pinBtn(id, on)}</td></tr>`;
        }).join("")}
        </tbody></table></div></section>`).join("");
  }
  function ratiosHtml() {
    const { cs, st } = G.cur, res = cs.c.res;
    return `<p class="fx-hint">${chip("CALCULATED")} Engine tính từ báo cáo · bấm vào số để xem công thức và đầu vào · ${icon("lock", 13)} là số bạn tự tính ở Workpapers</p>` +
      Object.keys(E.GROUPS).map(g => `<section class="fx-panel fx-sheet"><div class="fx-ph"><h2>${E.GROUPS[g]}</h2></div>
        <div class="fx-table-wrap"><table class="fx-table"><thead><tr><th scope="col">Chỉ số</th>${res.years.map(y => `<th class="num" scope="col">${y}</th>`).join("")}<th class="fx-pin-col"><span class="sr-only">Ghim</span></th></tr></thead><tbody>
        ${E.METRICS.filter(m => m.group === g).map(m => {
          const id = "m:" + m.id, on = st.pins.includes(id);
          return `<tr class="${on ? "pinned" : ""}"><th scope="row"><span>${m.vi} <em class="fx-unit">${UNIT[m.unit]}</em>${m.proxy ? ` <em class="fx-proxy">ước tính</em>` : ""}</span><small>${esc(m.formula)}</small></th>
            ${res.years.map(y => {
              const b = res.results[m.id].byYear[y];
              if (locked(m.id, y)) return `<td class="num"><button class="fw-cell locked" data-insp="${id}|${y}" title="Tự tính ở Workpapers" aria-label="Tự tính ở Workpapers">${icon("lock", 13)}</button></td>`;
              return b.v === null ? `<td class="num na"><button class="fw-cell" data-insp="${id}|${y}" title="${esc(b.reason)}">—</button></td>` : `<td class="num"><button class="fw-cell" data-insp="${id}|${y}">${cell(b.v, m.unit)}</button></td>`;
            }).join("")}
            <td class="fx-pin-col">${pinBtn(id, on)}</td></tr>`;
        }).join("")}
        </tbody></table></div></section>`).join("");
  }
  function checksHtml() {
    const val = G.cur.cs.c.val;
    const stTxt = c => c.status === "pass" ? "ĐẠT" : c.status === "fail" ? (c.level === "block" ? "KHÔNG ĐẠT" : "CẢNH BÁO") : "KHÔNG ÁP DỤNG";
    return `<section class="fx-panel">
      <div class="fx-pub ${val.publishable ? "ok" : "bad"}">${icon(val.publishable ? "check" : "alert", 22)}<div><b>${val.publishable ? "PUBLISHABLE" : "NOT PUBLISHABLE"}</b><p>${val.publishable ? "Mọi kiểm tra bắt buộc đều đạt. Cảnh báo không chặn, nhưng là giới hạn bạn cần nêu." : "Có kiểm tra bắt buộc không đạt."}</p></div></div>
      <ul class="fx-checks">${val.checks.map(c => `<li class="${c.status} ${c.level}"><span class="fx-chk-i">${icon(c.status === "pass" ? "check" : c.status === "fail" ? "alert" : "x", 15)}</span>
        <div><b>${esc(c.label)}</b> <span class="fx-pill ${c.level === "block" ? "" : "warn"}">${c.level === "block" ? "Bắt buộc" : "Cảnh báo"}</span><p>${esc(c.detail)}</p></div>
        <span class="fx-chk-s">${stTxt(c)}</span></li>`).join("")}</ul>
    </section>`;
  }
  function sourceHtml() {
    const ds = G.cur.e.ds, s = ds.source;
    const rows = [["Nhà cung cấp", esc(s.provider)], ["Ghi nguồn", esc(s.attribution)], ["Endpoint", esc(s.endpoint)], ["Ngày lấy", s.retrievedAt ? dateVi(s.retrievedAt) : ""],
      ["Phạm vi lấy", esc(s.version)], ["Điều kiện dùng", esc(s.license)], ["Ghi chú", esc(s.note)]].filter(r => r[1]);
    return `<div class="fx-two">
      <section class="fx-panel"><div class="fx-ph"><h2>Nguồn dữ liệu</h2>${chip(ds.class)}</div>
        <dl class="fx-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
          <dt>Báo cáo</dt><dd>${ds.scope.basis === "consolidated" ? "Hợp nhất" : "Riêng lẻ"} · ${esc(ds.scope.framework)} · năm · VND (nguồn tính bằng ${esc(ds.scope.sourceUnit)})</dd></dl></section>
      <section class="fx-panel"><div class="fx-ph"><h2>Kiểm toán theo năm</h2></div>
        <ul class="fx-audit">${ds.years.map(y => `<li><span class="fx-code">${y}</span><span>${auditVi(ds.periodMeta[y].audit)}</span></li>`).join("")}</ul>
        <div class="fx-legend"><p>${chip("REAL")} ${LABELS.REAL}</p><p>${chip("CALCULATED")} ${LABELS.CALCULATED}</p><p>${chip("SIMULATED")} ${LABELS.SIMULATED}</p></div></section>
    </div>
    <section class="fx-panel"><div class="fx-ph"><h2>Lineage</h2><span class="fx-muted">Mỗi khoản mục của game lấy từ cột nào của nguồn</span></div>
      <div class="fx-table-wrap"><table class="fx-table fx-lineage"><thead><tr><th>Khoản mục trong game</th><th>Cột nguồn</th><th>Tên ở nguồn</th><th>Xử lý</th></tr></thead><tbody>
      ${Object.keys(E.ITEMS).map(k => { const l = ds.lineage[k] || {}; return `<tr><td>${E.ITEMS[k].vi}</td><td class="mono">${esc(l.column || "—")}</td><td>${esc(l.label || (ds.class === "SIMULATED" ? "Sinh từ tham số mô phỏng" : "—"))}</td><td class="fx-muted">${esc(l.transform || "")}</td></tr>`; }).join("")}
      </tbody></table></div></section>`;
  }

  // ---------- Formula Inspector (EVA) ----------
  function openInspector(ref) {
    const { cs, st, e } = G.cur, ds = e.ds, [card, ys] = ref.split("|"), year = Number(ys), info = M.cardInfo(cs.c, card);
    if (!info || !ds.values[year] && info.kind === "i") return;
    let body;
    if (info.kind === "i") {
      const v = ds.values[year][info.key], l = ds.lineage[info.key] || {};
      body = `<div class="fx-insp-top">${chip(ds.class)}<span class="fx-code">${year}</span><span class="fx-muted">${SEC_NAME[info.sec] || ""}</span></div>
        <h2 id="fw-drawer-title">${info.title}</h2><p class="fx-muted small">${info.en}</p>
        <div class="fx-insp-val">${v === null ? "Không có trong dữ liệu" : `${M.fmt(v, "vnd")}<small>${M.num(v, 0)} đồng</small>`}</div>
        <dl class="fx-dl">
          <dt>Nguồn</dt><dd>${esc(ds.source.provider || "—")}</dd>
          ${ds.source.endpoint ? `<dt>Endpoint</dt><dd>${esc(ds.source.endpoint)}</dd>` : ""}
          <dt>Cột</dt><dd>${l.column ? `<span class="mono">${esc(l.column)}</span> · ${esc(l.label)}` : ds.class === "SIMULATED" ? "Sinh từ tham số mô phỏng (js/game/sample.js)" : "—"}</dd>
          ${l.transform ? `<dt>Xử lý</dt><dd>${esc(l.transform)}</dd>` : ""}
          <dt>Đơn vị</dt><dd>Nguồn tính bằng ${esc(ds.scope.sourceUnit)}; game quy về đồng</dd>
          <dt>Kiểm toán</dt><dd>${auditVi(ds.periodMeta[year].audit)}</dd>
          ${ds.source.retrievedAt ? `<dt>Ngày lấy</dt><dd>${dateVi(ds.source.retrievedAt)}</dd>` : ""}
        </dl>`;
    } else {
      const b = cs.c.res.results[info.key].byYear[year];
      if (!b) return;
      const lock = locked(info.key, year);
      body = `<div class="fx-insp-top">${chip("CALCULATED")}<span class="fx-code">${year}</span><span class="fx-muted">${esc(info.group)}</span></div>
        <h2 id="fw-drawer-title">${info.title}</h2><p class="fx-muted small">${esc(info.los)}</p>
        <div class="fx-insp-val">${lock ? `<span class="fx-insp-lock">${icon("lock", 18)} Tự tính ở Workpapers</span>` : b.v === null ? `Không khả dụng<small>${esc(b.reason)}</small>` : M.fmt(b.v, info.unit)}</div>
        <div class="fx-formula"><div class="fx-kicker">Công thức</div><code>${esc(info.formula)}</code></div>
        ${b.inputs && b.inputs.length ? `<div class="fx-kicker">Đầu vào ${chip(ds.class)}</div><ul class="fx-inputs">${b.inputs.map(i => `<li><button class="fw-cell" data-insp="i:${i.item}|${i.year}"><span>${E.ITEMS[i.item].vi} <em>${i.year} · ${i.how}</em></span><span class="mono">${lock ? "?" : ty(i.v)}</span></button></li>`).join("")}</ul>` : ""}
        ${b.notes && b.notes.length ? `<div class="fx-kicker">Quy ước</div><ul class="fx-notes">${b.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="fx-muted small">Engine ${E.ENGINE_VERSION} · bộ quy tắc ${M.RULES_VERSION}</p>`;
    }
    const on = st.pins.includes(card);
    const { back, dr } = drawerEls();
    if (dr.hidden) G.lastFocus = document.activeElement;
    dr.innerHTML = `<div class="fw-drawer-head">${avatar("EVA", 30)}<div><b>EVA</b><small>Formula Inspector</small></div><button class="fx-icon-btn" data-close aria-label="Đóng">${icon("x", 16)}</button></div>
      <div class="fw-drawer-body">${body}</div>
      ${st.done ? "" : `<div class="fw-drawer-foot"><button class="fx-btn ${on ? "quiet" : "gold"} fw-pin-wide ${on ? "on" : ""}" data-pin="${card}" aria-pressed="${on}">${icon("pin", 15)} ${on ? "Đã ghim · bấm để bỏ" : "Ghim làm bằng chứng"}</button></div>`}`;
    dr.hidden = false; back.hidden = false;
    requestAnimationFrame(() => dr.classList.add("open"));
    document.addEventListener("keydown", onDrawerKey, true);
    dr.querySelector("[data-close]").focus();
    if (!st.done && !st.inspected.includes(ref)) { st.inspected.push(ref); save(); }
  }
  function drawerEls() {
    let back = document.getElementById("fw-drawer-back"), dr = document.getElementById("fw-drawer");
    if (!dr) {
      back = document.createElement("div"); back.id = "fw-drawer-back"; back.className = "fw-drawer-back"; back.hidden = true;
      dr = document.createElement("aside"); dr.id = "fw-drawer"; dr.className = "fw-drawer"; dr.hidden = true;
      dr.setAttribute("role", "dialog"); dr.setAttribute("aria-modal", "true"); dr.setAttribute("aria-labelledby", "fw-drawer-title");
      back.addEventListener("click", closeDrawer);
      dr.addEventListener("click", onMissionClick);
      document.body.append(back, dr);
    }
    return { back, dr };
  }
  function onDrawerKey(ev) { if (ev.key === "Escape") { ev.stopPropagation(); ev.preventDefault(); closeDrawer(); } }
  function closeDrawer() {
    const dr = document.getElementById("fw-drawer"), back = document.getElementById("fw-drawer-back");
    document.removeEventListener("keydown", onDrawerKey, true);
    if (!dr || dr.hidden) return;
    dr.classList.remove("open");
    if (back) back.hidden = true;
    setTimeout(() => { if (!dr.classList.contains("open")) dr.hidden = true; }, 220);
    if (G.lastFocus && document.contains(G.lastFocus)) G.lastFocus.focus();
  }
  function removeDrawer() {
    document.removeEventListener("keydown", onDrawerKey, true);
    ["fw-drawer", "fw-drawer-back"].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  }
  window.addEventListener("hashchange", removeDrawer);
  // the rail's BA II Plus button opens the floating calculator (js/calc.js)
  document.addEventListener("click", e => {
    if (!e.target.closest("[data-calc-open]")) return;
    if (typeof calcMount === "function") calcMount();
    if (typeof calcOpen === "function") calcOpen();
  });

  // ---------- 3. Evidence Board ----------
  // choose a piece of evidence on the left, then press a relation on a hypothesis to link them
  function boardHtml() {
    const { cs, st } = G.cur, selIdx = G.sel ? st.pins.indexOf(G.sel) : -1;
    const tip = st.done ? "Hồ sơ đã nộp: bảng bằng chứng chỉ để xem."
      : selIdx >= 0 ? `Đã chọn <b>EV-${pad3(selIdx + 1)}</b> · ${cardTitle(cs, G.sel)}. Bấm một quan hệ ở giả thuyết (bên phải, hoặc bên dưới trên điện thoại) để gắn; bấm lại thẻ để bỏ chọn.`
      : "Chọn một bằng chứng, rồi bấm quan hệ ở giả thuyết để gắn: Ủng hộ, Mâu thuẫn, Bối cảnh hoặc Cần thêm.";
    return `<div class="fx-board ${G.sel ? "selecting" : ""}">
      <section class="fx-ev-col">
        <div class="fx-col-h"><h2>Bằng chứng <span>${st.pins.length}</span></h2>${st.done ? "" : `<button class="fx-btn quiet sm" data-go="terminal">${icon("plus", 14)} Ghim thêm</button>`}</div>
        <p class="fx-tip ${G.sel ? "on" : ""}">${icon(G.sel ? "link" : "pin", 15)}<span>${tip}</span></p>
        ${st.pins.length ? `<div class="fx-evs">${st.pins.map(evCard).join("")}</div>` : `<div class="fx-empty">${icon("pin", 26)}<b>Chưa có bằng chứng</b><p>Mở Terminal, ghim các dòng báo cáo và chỉ số bạn cho là liên quan.</p><button class="fx-btn gold sm" data-go="terminal">Mở Terminal</button></div>`}
      </section>
      <section class="fx-hyp-col">
        <div class="fx-col-h"><h2>Giả thuyết</h2><span class="fx-muted">${cs.hyps.filter(h => st.verdicts[h.id]).length}/${cs.hyps.length} đã kết luận</span></div>
        ${cs.hyps.map(hypPanel).join("")}
      </section>
    </div>
    ${nextBtn("work", "Sang Workpapers")}`;
  }
  // what the numbers did, first year to last (a fact, not a judgement)
  function observation(info, pts) {
    const ok = pts.filter(p => p.v !== null && !p.lock);
    if (ok.length < 2) return "";
    const a = ok[0], b = ok[ok.length - 1], up = b.v > a.v;
    return `<span class="fx-obs ${b.v === a.v ? "" : up ? "up" : "down"}">${b.v === a.v ? "→" : up ? "▲" : "▼"} ${a.year}: ${cell(a.v, info.unit)} → ${b.year}: ${cell(b.v, info.unit)}</span>`;
  }
  function evCard(id, i) {
    const { cs, st } = G.cur, info = M.cardInfo(cs.c, id);
    if (!info) return "";
    const pts = info.points.map(p => ({ ...p, lock: info.kind === "m" && locked(info.key, p.year) }));
    const links = st.links.filter(l => l.c === id), sel = G.sel === id;
    const src = info.kind === "i" ? SEC_NAME[info.sec] : info.group;
    return `<article class="fx-ev ${sel ? "sel" : ""} ${links.length ? "linked" : ""}">
      <button class="fx-ev-main" data-sel="${id}" aria-pressed="${sel}" ${st.done ? "disabled" : ""}>
        <span class="fx-ev-top"><span class="fx-ev-id">EV-${pad3(i + 1)}</span>${chip(info.label)}</span>
        <span class="fx-ev-title">${info.title} <em>${UNIT[info.unit]}</em></span>
        <span class="fx-ev-src">${esc(src || "")}</span>
        ${spark(pts)}
        ${observation(info, pts)}
      </button>
      ${links.length ? `<div class="fx-ev-links">${links.map(l => `<span class="fx-ev-link fw-rel-${l.r}"><b>${l.h}</b>${M.RELATIONS[l.r].vi}</span>`).join("")}</div>` : ""}
      ${st.done ? "" : `<button class="fx-ev-x" data-unpin="${id}" title="Bỏ ghim" aria-label="Bỏ ghim ${info.title}">${icon("x", 13)}</button>`}
    </article>`;
  }
  function spark(pts) {
    const ok = pts.filter(p => p.v !== null && !p.lock);
    if (ok.length < 2) return `<span class="fw-spark empty" aria-hidden="true"></span>`;
    const w = 120, h = 30, span = Math.max(pts.length - 1, 1), vs = ok.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
    const xy = p => [(pts.indexOf(p) / span) * (w - 6) + 3, h - 4 - ((p.v - lo) / rng) * (h - 8)];
    const d = ok.map((p, i) => `${i ? "L" : "M"}${xy(p).map(n => n.toFixed(1)).join(" ")}`).join(" ");
    const last = xy(ok[ok.length - 1]);
    // the end dot is a zero-length stroke, so it stays round however wide the card is
    return `<svg class="fw-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="M${last[0].toFixed(1)} ${last[1].toFixed(1)}h0" stroke="currentColor" stroke-width="6" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function hypPanel(h) {
    const { cs, st } = G.cur, links = st.links.filter(l => l.h === h.id), bal = M.balance(st.links, h.id), v = st.verdicts[h.id];
    const cur = G.sel && links.find(l => l.c === G.sel);
    return `<article class="fx-hyp ${v ? "has-v" : ""} ${h.pol > 0 ? "pos" : "risk"}">
      <div class="fx-hyp-h"><span class="fx-hid">${h.id}</span><span class="fx-tag">${esc(h.tag)}</span>${v ? statusChip(v) : `<span class="fx-muted small">Chưa kết luận</span>`}</div>
      <p class="fx-hyp-t">${esc(h.title)}</p>
      ${G.sel && !st.done ? `<div class="fx-attach" role="group" aria-label="Gắn bằng chứng đã chọn vào ${h.id}">${Object.keys(M.RELATIONS).map(r => `<button class="fw-rel-${r} ${cur && cur.r === r ? "on" : ""}" data-attach="${h.id}~${r}" aria-pressed="${!!(cur && cur.r === r)}">${M.RELATIONS[r].vi}</button>`).join("")}</div>` : ""}
      ${links.length ? `<ul class="fx-hlinks">${links.map(l => `<li class="${G.sel === l.c ? "sel" : ""}">${relChip(l.r)}<span>${cardTitle(cs, l.c)}</span>${st.done ? "" : `<button class="fx-x" data-unlink="${l.h}~${l.c}~${l.r}" aria-label="Gỡ liên kết">${icon("x", 12)}</button>`}</li>`).join("")}</ul>` : `<p class="fx-muted small fx-hyp-none">Chưa gắn bằng chứng nào.</p>`}
      <div class="fx-bal"><span class="s">${bal.supports} ủng hộ</span><span class="c">${bal.contradicts} mâu thuẫn</span><span class="e">${bal.explains} bối cảnh</span><span class="n">${bal.needs} cần thêm</span></div>
      <div class="fx-verdict"><span class="fx-kicker">Kết luận của bạn</span>
        <div class="fx-vopts" role="group" aria-label="Kết luận cho ${h.id}">${["SUPPORTED", "PLAUSIBLE", "CONTRADICTED", "UNTESTED"].map(s => `<button class="fw-st-${s.toLowerCase()} ${v === s ? "on" : ""}" data-verdict="${h.id}~${s}" aria-pressed="${v === s}" title="${M.STATUS[s].vi}" ${st.done ? "disabled" : ""}>${M.STATUS[s].en}</button>`).join("")}</div></div>
      <details class="fx-hint-d"><summary>${icon("help", 14)} Gợi ý của Maya</summary><p>${esc(h.hint)}</p></details>
    </article>`;
  }

  // ---------- 4. Workpapers ----------
  function workHtml() {
    const cs = G.cur.cs;
    return `<div class="fx-lead">${gi("workpaper", 20)}<p>Tự tính ba chỉ số của năm ${cs.c.lastYear} từ báo cáo (tab Báo cáo tài chính, đơn vị tỷ đồng). Mỗi workpaper chỉ đối chiếu một lần. Bình quân = (cuối năm trước + cuối năm nay) ÷ 2. Phần trăm nhập dạng 12,5 cho 12,5%. Máy tính BA II Plus ở góc màn hình.</p></div>
      <div class="fx-wps">${cs.workpapers.map(wpCard).join("")}</div>
      ${nextBtn("decide", "Sang Quyết định")}`;
  }
  function wpCard(w, i) {
    const st = G.cur.st, a = st.wp[w.id];
    const top = `<div class="fx-wp-h"><span class="fx-code">WP-${i + 1}</span><h3>${w.title}</h3><span class="fx-muted">${w.year}</span></div><div class="fx-formula"><div class="fx-kicker">Công thức</div><code>${esc(w.formula)}</code></div>`;
    if (!a || !a.checked) return `<article class="fx-panel fx-wp">${top}
      ${st.done ? `<p class="fx-muted">Không làm.</p>` : `<form class="fx-wp-form" data-wp="${w.id}"><label class="sr-only" for="wp-${w.id}">Kết quả ${w.title}</label><span class="fx-wp-in"><input class="fx-input" id="wp-${w.id}" name="v" inputmode="decimal" autocomplete="off" placeholder="${w.unit === "pct" ? "VD: 12,5" : "VD: 1,25"}"><em>${UNIT[w.unit]}</em></span><button class="fx-btn gold sm" type="submit">Đối chiếu</button></form>`}
    </article>`;
    const g = M.gradeWorkpaper(w, a.input), ok = g.frac === 1 ? "ok" : g.frac > 0 ? "near" : "bad";
    return `<article class="fx-panel fx-wp done ${ok}">${top}
      <div class="fx-wp-res"><div><span class="fx-kicker">Bạn</span><b>${M.wpFmt(w, a.input)}</b></div><div><span class="fx-kicker">Engine</span><b>${M.wpFmt(w, M.shownValue(w))}</b></div>
        <span class="fx-wp-badge">${ok === "ok" ? "Khớp" : ok === "near" ? "Gần đúng" : "Chưa đúng"} · ${Math.round(g.frac * 100)}%</span></div>
      <div class="fx-kicker">Đầu vào</div><ul class="fx-inputs">${w.inputs.map(x => `<li><button class="fw-cell" data-insp="i:${x.item}|${x.year}"><span>${E.ITEMS[x.item].vi} <em>${x.year} · ${x.how}</em></span><span class="mono">${ty(x.v)}</span></button></li>`).join("")}</ul>
      ${w.notes.length ? `<ul class="fx-notes">${w.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    </article>`;
  }
  function parseNum(s) {
    let t = String(s || "").trim().replace(/[\s%]/g, "").replace(/−/g, "-");
    if (!t) return NaN;
    if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(",", ".");
    return /^[-+]?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
  }
  function checkWorkpaper(id, raw) {
    const { cs, st } = G.cur, w = cs.workpapers.find(x => x.id === id), v = parseNum(raw);
    if (!w) return;
    if (!isFinite(v)) { toast("Nhập một con số, ví dụ 82,9", "error"); const inp = document.getElementById(`wp-${id}`); if (inp) inp.focus(); return; }
    st.wp[id] = { input: v, checked: true, at: Date.now() };
    save(); drawStep();
  }

  // ---------- 5. Decision ----------
  function decideHtml() {
    const { cs, st } = G.cur, ro = st.done, mine = M.playerStatuses(cs, st);
    return `<article class="fx-panel">
        <div class="fx-ph"><h2>Kết luận của bạn cho từng giả thuyết</h2>${ro ? "" : `<button class="fx-btn quiet sm" data-go="board">Sửa ở Evidence Board</button>`}</div>
        <ul class="fx-vlist">${cs.hyps.map(h => `<li><span class="fx-hid">${h.id}</span><span>${esc(h.title)}</span>${st.verdicts[h.id] ? statusChip(mine[h.id]) : `<span class="fx-muted small">Chưa kết luận</span>`}</li>`).join("")}</ul>
      </article>
      <article class="fx-panel">
        ${from("Alex Morgan", "Portfolio Manager", "Tôi sẽ hành động theo khuyến nghị của bạn. Quyết định nên đi ra từ chính các kết luận ở trên.")}
        <div class="fx-decs" role="radiogroup" aria-label="Quyết định">${M.DECISION_IDS.map(d => `<button class="fx-dec dec-${d.toLowerCase()} ${st.decision === d ? "on" : ""}" data-decision="${d}" role="radio" aria-checked="${st.decision === d}" ${ro ? "disabled" : ""}>
          <span class="fx-dec-ic">${gi(DECISION_ICON[d], 22)}</span><b>${M.DECISIONS[d].en}</b><span>${M.DECISIONS[d].vi}</span><small>${DECISION_TEXT[d]}</small></button>`).join("")}</div>
        <div class="fx-conf"><span class="fx-kicker">Mức tự tin</span><div class="fx-seg" role="radiogroup" aria-label="Mức tự tin">${["low", "medium", "high"].map(c => `<button class="${st.confidence === c ? "on" : ""}" data-conf="${c}" role="radio" aria-checked="${st.confidence === c}" ${ro ? "disabled" : ""}>${M.CONFIDENCE[c]}</button>`).join("")}</div></div>
        <label class="fx-field"><span class="fx-kicker">Luận điểm của bạn · không bắt buộc, không chấm điểm</span><textarea class="fx-input" id="fw-thesis" rows="3" maxlength="600" ${ro ? "disabled" : ""} placeholder="Một hai câu: vì sao bạn chọn quyết định này?">${esc(st.thesis || "")}</textarea></label>
      </article>
      <div class="fx-next"><button class="fx-btn gold" data-go="committee" ${st.decision && st.confidence ? "" : "disabled"}>Trình Daniel Ross ${icon("next", 16)}</button></div>`;
  }

  // ---------- 6. Risk review (Investment Committee) ----------
  function committeeHtml() {
    const { cs, st } = G.cur, ro = st.done;
    const pinned = st.pins.map((id, i) => ({ id, t: cardTitle(cs, id), n: `EV-${pad3(i + 1)}` }));
    const none = pinned.length ? "" : `<p class="fx-muted small">Bạn chưa ghim bằng chứng nào.</p>`;
    const chipBtn = (p, attr, on) => `<button class="fx-chip ${on ? "on" : ""}" data-${attr}="${p.id}" aria-pressed="${on}" ${ro ? "disabled" : ""}><em>${p.n}</em>${p.t}</button>`;
    return `<article class="fx-panel fx-review">
        ${from("Daniel Ross", "Chief Risk Officer", `Quyết định của bạn: <b>${M.DECISIONS[st.decision].en}</b>, tự tin ${M.CONFIDENCE[st.confidence].toLowerCase()}. Trước khi The Board duyệt, tôi có ba câu hỏi.`)}
      </article>
      <article class="fx-panel fx-q"><span class="fx-q-n">1</span><div><h3>Ba bằng chứng mạnh nhất cho quyết định của bạn là gì?</h3><p class="fx-muted small">Chọn tối đa 3 trong các bằng chứng đã ghim (${st.c1.length}/3).</p>
        <div class="fx-chips">${pinned.map(p => chipBtn(p, "c1", st.c1.includes(p.id))).join("")}</div>${none}</div></article>
      <article class="fx-panel fx-q"><span class="fx-q-n">2</span><div><h3>Bằng chứng mạnh nhất đi ngược quyết định của bạn là gì?</h3><p class="fx-muted small">Một analyst giỏi biết điều gì có thể làm mình sai.</p>
        <div class="fx-chips">${pinned.map(p => chipBtn(p, "c2", st.c2 === p.id)).join("")}
          <button class="fx-chip ${st.c2 === "none" ? "on" : ""}" data-c2="none" aria-pressed="${st.c2 === "none"}" ${ro ? "disabled" : ""}>Không có bằng chứng ngược chiều đáng kể</button></div></div></article>
      <article class="fx-panel fx-q"><span class="fx-q-n">3</span><div><h3>Hồ sơ này có những giới hạn nào?</h3><p class="fx-muted small">Chọn mọi câu đúng với hồ sơ này; chọn câu sai bị trừ điểm.</p>
        <ul class="fx-limits">${cs.limits.map(o => `<li><button class="fx-check ${st.c3.includes(o.id) ? "on" : ""}" data-c3="${o.id}" aria-pressed="${st.c3.includes(o.id)}" ${ro ? "disabled" : ""}><span class="fx-box">${icon("check", 13)}</span><span>${o.text}</span></button></li>`).join("")}</ul></div></article>
      ${ro ? "" : `<div class="fx-next"><button class="fx-btn gold lg" data-submit>Nộp báo cáo cho The Board ${icon("next", 16)}</button></div>`}`;
  }
  async function submit() {
    const { cs, st, key } = G.cur;
    const missing = [!st.c1.length && "câu 1", !st.c2 && "câu 2", !st.c3.length && "câu 3"].filter(Boolean);
    const ok = await confirmDialog({ title: "Nộp báo cáo cho The Board?", message: `${missing.length ? `Bạn chưa trả lời ${missing.join(", ")}. ` : ""}Sau khi nộp, câu trả lời được khoá; bạn có thể chơi lại từ đầu.`, confirmText: "Nộp" });
    if (!ok || !G.cur || G.cur.key !== key) return;
    const before = M.rankOf(xpTotal()), sc = M.score(cs, st);
    st.done = true; st.total = sc.total; st.finishedAt = Date.now(); st.step = "result";
    const g = prog(), prev = g.best[key];
    if (!prev || sc.total > prev.score) g.best[key] = { score: sc.total, at: Date.now() };
    save();
    G.sel = null;
    const after = M.rankOf(xpTotal());
    drawStep(true);
    toast(after.idx > before.idx ? `Thăng cấp: ${after.name}` : `Điểm: ${sc.total}/100`);
  }
  async function replay() {
    const key = G.cur.key;
    const ok = await confirmDialog({ title: "Chơi lại vụ án?", message: "Bảng bằng chứng, workpapers và câu trả lời được xoá. Điểm cao nhất vẫn giữ.", confirmText: "Chơi lại" });
    if (!ok || !G.cur || G.cur.key !== key) return;
    prog().runs[key] = freshRun(); G.cur.st = prog().runs[key]; G.sel = null;
    save(); drawStep(true);
  }

  // ---------- 7. The Board ----------
  function resultHtml() {
    const { cs, st, e, key } = G.cur, ds = e.ds, sc = M.score(cs, st), best = prog().best[key], ref = cs.reference, mine = sc.mineStatuses;
    const nextArch = M.ARCHETYPE_IDS.find(a => a !== cs.archId && M.unlocked(a, prog().best) && !prog().best[M.caseKey(ds.id, a)]);
    const n1 = x => M.num(x, x % 1 ? 1 : 0), r = M.rankOf(xpTotal());
    const tone = f => f >= 0.75 ? "ok" : f >= 0.5 ? "mid" : "low";
    const v = sc.total >= 75 ? ["ok", "APPROVED", "The Board chấp nhận báo cáo của bạn."] : sc.total >= 60 ? ["mid", "CONDITIONAL", "The Board chấp nhận có điều kiện: cần bổ sung những điểm bên dưới."] : ["low", "RETURNED", "The Board trả báo cáo về: lập luận chưa đủ bằng chứng."];
    return `<section class="fx-panel fx-verdict-hero ${v[0]}">
        ${ring(sc.total / 100, 150, 9, `<b>${sc.total}</b><small>/100</small>`)}
        <div class="fx-vh-t">
          <span class="fx-stamp">${v[1]}</span>
          <h2>${sc.grade}</h2>
          <p>${v[2]}</p>
          <div class="fx-vh-meta"><span>Cao nhất của vụ án <b>${best ? best.score : sc.total}</b></span><span>Reputation <b>${xpTotal()}</b></span><span>${insignia(r.idx, 22)} ${r.name} · cấp ${r.level}</span></div>
        </div>
      </section>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Điểm theo tiêu chí</h2><span class="fx-muted">Rubric của The Board · 100 điểm</span></div>
        <div class="fx-rubric">${sc.parts.map(p => `<details class="fx-part ${tone(p.score / p.max)}"><summary>
          <span class="fx-part-t"><b>${p.vi}</b><small>${p.name}</small></span><span class="fx-part-n">${n1(p.score)}<small>/${p.max}</small></span>
          <span class="fx-bar"><i style="width:${Math.round(p.score / p.max * 100)}%"></i></span></summary>
          <ul>${p.items.map(i => `<li><span>${i.label}<small>${esc(i.note)}</small></span><b>${n1(i.score)}/${n1(i.max)}</b></li>`).join("")}</ul></details>`).join("")}</div>
      </section>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Góc nhìn tham chiếu</h2><span class="fx-muted">Kết luận của bộ quy tắc trong game, không phải khuyến nghị đầu tư</span></div>
        <div class="fx-ref"><div><span class="fx-kicker">Tham chiếu</span><b>${M.DECISIONS[ref.decision].en}</b><small>tự tin ${M.CONFIDENCE[ref.confidence].toLowerCase()}</small></div>
          <div><span class="fx-kicker">Của bạn</span><b>${st.decision ? M.DECISIONS[st.decision].en : "—"}</b><small>tự tin ${st.confidence ? M.CONFIDENCE[st.confidence].toLowerCase() : "—"}</small></div></div>
        <ul class="fx-refh">${cs.hyps.map(h => {
          const top = h.refs.filter(x => x.t === "for" || x.t === "against").sort((a, b) => b.s - a.s).slice(0, 3);
          return `<li><div class="fx-refh-h"><span class="fx-hid">${h.id}</span><span>${esc(h.title)}</span></div>
            <div class="fx-refh-s"><span class="fx-muted small">Tham chiếu</span>${statusChip(h.refStatus)}<span class="fx-muted small">Bạn</span>${statusChip(mine[h.id])}</div>
            <ul class="fx-why">${top.length ? top.map(x => `<li class="${x.t}"><span class="fx-why-t">${x.t === "for" ? "Ủng hộ" : "Ngược"}</span><span><b>${cardTitle(cs, x.card)}:</b> ${esc(x.why)}</span></li>`).join("") : `<li><span>Không có bằng chứng quyết định cho giả thuyết này.</span></li>`}</ul></li>`;
        }).join("")}</ul>
      </section>
      ${sc.missed.length || sc.invalid.length ? `<section class="fx-panel">
        ${from("Maya Chen", "Head of Research", "Lần sau, hãy xem lại những điểm này.")}
        ${sc.missed.length ? `<div class="fx-kicker fx-gap">Bằng chứng then chốt bạn bỏ sót</div><ul class="fx-learn">${sc.missed.slice(0, 8).map(m => `<li><span class="fx-hid">${m.h}</span><span><b>${cardTitle(cs, m.card)}</b> (${m.t === "for" ? "ủng hộ" : "đi ngược"} giả thuyết): ${esc(m.why)}</span></li>`).join("")}</ul>` : ""}
        ${sc.invalid.length ? `<div class="fx-kicker fx-gap">Liên kết chưa khớp dữ liệu</div><ul class="fx-learn">${sc.invalid.slice(0, 8).map(l => `<li><span class="fx-hid">${l.h}</span><span><b>${cardTitle(cs, l.c)}</b> · bạn chọn “${M.RELATIONS[l.r].vi}”: ${esc(l.why)}</span></li>`).join("")}</ul>` : ""}
      </section>` : ""}
      <section class="fx-panel fx-epi">${ds.class === "SIMULATED" && ds.story && ds.story.epilogue
        ? `<div class="fx-kicker">Mười hai tháng sau · kịch bản mô phỏng ${chip("SIMULATED")}</div><p>${esc(ds.story.epilogue)}</p>`
        : `<div class="fx-kicker">Dữ liệu thật ${chip("REAL")}</div><p>Game không dự đoán tương lai của doanh nghiệp thật. Hãy đối chiếu kết luận với báo cáo của các năm sau khi có. Hồ sơ chỉ gồm ba báo cáo tài chính, không có thuyết minh, giá cổ phiếu hay định giá: đây là bài luyện phân tích, không phải khuyến nghị đầu tư. Nguồn số liệu: ${esc(ds.source.attribution || ds.source.provider)}.</p>`}</section>
      <div class="fx-next fx-result-actions"><button class="fx-btn quiet" data-replay>Chơi lại</button><a class="fx-btn ghost" href="#/game">Về HQ</a>${nextArch ? `<a class="fx-btn gold" href="#/game/m/${esc(ds.id)}/${nextArch}">${M.ARCHETYPES[nextArch].code} · ${M.ARCHETYPES[nextArch].title} ${icon("next", 16)}</a>` : ""}</div>`;
  }

  // ================= TITLE SCREEN =================
  // What the game is and how it is played. The Playground tile opens it, and an account that has never
  // opened the game sees it before the HQ. Counts and names come from the rules (missions.js).
  const introStarted = g => Object.keys((g && g.best) || {}).length > 0 || Object.values((g && g.runs) || {}).some(started);

  function renderIntro() {
    const g = prog(), xp = xpTotal(), r = M.rankOf(xp), list = datasets();
    const sample = list.find(e => e.builtin), going = introStarted(g);
    if (!g.intro) { g.intro = Date.now(); save(); }
    const EQ = M.ARCHETYPES.EQ, LIQ = M.ARCHETYPES.LIQ;
    const parts = M.score(caseFor(sample, "EQ"), {}).parts;
    const los = [...new Set(M.ARCHETYPE_IDS.flatMap(a => M.ARCHETYPES[a].los))].map(k => E.LOS[k]).filter(Boolean);
    const cta = going
      ? `<a class="fx-btn gold lg" href="#/game">Vào HQ ${icon("next", 16)}</a>`
      : `<a class="fx-btn gold lg" href="#/game/m/${esc(sample.ds.id)}/EQ">${icon("play", 15)} Bắt đầu chương 1</a><a class="fx-btn ghost lg" href="#/game">Vào HQ</a>`;
    const LOOP = ["Nhận vụ án", "Đọc hồ sơ", "Tìm bất thường", "Lập giả thuyết", "Thu thập bằng chứng", "Tính toán", "Nộp phát hiện", "Ra quyết định", "Nhận hệ quả"];
    const STEP_TEXT = {
      brief: "Maya Chen giao memo: yêu cầu của quỹ, phạm vi dữ liệu và bốn giả thuyết cần kiểm định.",
      terminal: `Ba báo cáo, 31 chỉ số, kiểm tra dữ liệu và nguồn của từng con số. Bấm ${icon("pin", 12)} để ghim; bấm số để EVA mở Formula Inspector.`,
      board: `Chọn một bằng chứng rồi gắn vào giả thuyết: <span class="fx-chips-inline">${Object.keys(M.RELATIONS).map(relChip).join("")}</span> Sau đó tự kết luận từng giả thuyết.`,
      work: "Tự tính ba chỉ số của năm gần nhất. Càng sát số của engine càng nhiều điểm.",
      decide: `Alex Morgan chờ khuyến nghị: <span class="fx-chips-inline">${M.DECISION_IDS.map(d => `<span class="fx-dtag dec-${d.toLowerCase()}">${M.DECISIONS[d].en}</span>`).join("")}</span> kèm mức tự tin.`,
      committee: "Daniel Ross hỏi ba câu: bằng chứng mạnh nhất, bằng chứng ngược chiều, và giới hạn của hồ sơ.",
      result: "The Board chấm 100 điểm theo sáu tiêu chí, cho thấy góc nhìn tham chiếu và những gì bạn bỏ sót."
    };
    const PART_NOTE = {
      accuracy: "Ba workpaper: tự tính đúng chỉ số từ báo cáo.",
      risk: "Tìm ra và gắn đúng bằng chứng then chốt của từng giả thuyết.",
      evidence: "Liên kết khớp dữ liệu, chỉ ghim thứ liên quan, xem kiểm tra dữ liệu, truy nguồn con số.",
      alternatives: "Kết luận cả những giả thuyết khác, kể cả giả thuyết tích cực; nêu bằng chứng ngược chiều.",
      impact: "Khuyến nghị đầu tư và những bằng chứng mạnh nhất đỡ cho nó.",
      decision: "Quyết định nhất quán với kết luận của bạn, mức tự tin tương xứng, nêu đúng giới hạn của dữ liệu."
    };
    const RULES = [
      "Evidence before judgment: đoán trúng kết quả mà thiếu bằng chứng không đạt điểm điều tra cao.",
      "Một Red Flag không có nghĩa là gian lận hay sắp phá sản; game không kết luận gian lận.",
      `${LIQ.code} mở khoá khi bạn hoàn thành ${EQ.code} ở một công ty bất kỳ.`,
      "Chơi lại không giới hạn; mỗi vụ án chỉ tính lần có điểm cao nhất. Không có điểm cho tốc độ.",
      "Ghim bừa không có lợi: thẻ không liên quan kéo điểm Chất lượng bằng chứng xuống.",
      "Hồ sơ không qua kiểm tra dữ liệu bắt buộc bị gắn NOT PUBLISHABLE và không chơi được.",
      "Điểm và cấp bậc riêng từng tài khoản; hồ sơ công ty dùng chung cho mọi tài khoản trên máy này."
    ];
    const body = `<section class="fx-title">
        <div class="fx-title-art">${caseArt("title-ledger", "fx-title-chart")}</div>
        <div class="fx-title-body">
          <div class="fx-title-icon">${appIcon(96)}</div>
          <div class="fx-kicker">Aurora Capital presents · Project Ledger</div>
          <h2 class="fx-logo-t">Financial Empire</h2>
          <div class="fx-logo-s">Beyond the Numbers</div>
          <p class="fx-title-q">“Numbers tell a story. Your job is to find what they are hiding.”</p>
          <p class="fx-title-p">Bạn là Junior Analyst ở Aurora Capital. Điều tra doanh nghiệp qua báo cáo tài chính, tìm dấu hiệu, lập giả thuyết, thu thập bằng chứng và bảo vệ quyết định trước The Board.</p>
          <div class="fx-hero-cta">${cta}</div>
          <div class="fx-title-facts"><span><b>10</b> chương cốt truyện</span><span><b>7</b> bước mỗi vụ án</span><span><b>100</b> điểm, 6 tiêu chí</span><span><b>${list.length}</b> hồ sơ trên máy</span><span>${insignia(r.idx, 22)} <b>${r.name}</b> · cấp ${r.level}</span></div>
        </div>
      </section>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Vòng điều tra</h2><span class="fx-muted">Investigate → Verify → Analyze → Decide → Observe consequences</span></div>
        <ol class="fx-loop">${LOOP.map((t, i) => `<li><span>${i + 1}</span><b>${t}</b></li>`).join("")}</ol>
      </section>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Một vụ án gồm ${STEPS.length} bước</h2><span class="fx-muted">Đi lại giữa các bước tuỳ ý; Committee mở khi đã có quyết định</span></div>
        <ol class="fx-howsteps">${STEPS.map((s, i) => `<li><span class="fx-step-n">${i + 1}</span><div><b>${s.vi}</b> <small>${s.en}</small><p>${STEP_TEXT[s.id]}</p></div></li>`).join("")}</ol>
      </section>
      <div class="fx-two">
        <section class="fx-panel">
          <div class="fx-ph"><h2>The Board chấm điểm</h2><span class="fx-muted">100 điểm</span></div>
          <ul class="fx-rub-mini">${parts.map(p => `<li><div><b>${p.vi}</b><span>${p.max}</span></div><span class="fx-bar"><i style="width:${p.max * 5}%"></i></span><small>${PART_NOTE[p.id] || ""}</small></li>`).join("")}</ul>
        </section>
        <section class="fx-panel">
          <div class="fx-ph"><h2>Luật cần nhớ</h2></div>
          <ul class="fx-rules">${RULES.map(t => `<li>${icon("check", 15)}<span>${t}</span></li>`).join("")}</ul>
          <div class="fx-legend"><p>${chip("REAL")} ${LABELS.REAL}</p><p>${chip("CALCULATED")} ${LABELS.CALCULATED}</p><p>${chip("SIMULATED")} ${LABELS.SIMULATED}</p></div>
        </section>
      </div>
      <section class="fx-panel">
        <div class="fx-ph"><h2>Sự nghiệp</h2><span class="fx-muted">20 Reputation lên một cấp · tiến trình trong game, không phải chứng nhận nghề nghiệp</span></div>
        <ol class="fx-ranks">${M.RANKS.map((x, i) => `<li class="${i === r.idx ? "now" : i < r.idx ? "past" : ""}">${insignia(i, 46)}<b>${x.name}</b><small>Cấp ${x.level}</small></li>`).join("")}</ol>
        <p class="fx-muted small">CFA Level I · Financial Statement Analysis: ${los.join(", ")}.</p>
      </section>
      <div class="fx-next">${cta}</div>`;
    view.innerHTML = shell("intro", head("Luật chơi", "Financial Empire", ""), body);
  }

  // ================= entry =================
  // Deleting an account (or its data) leaves the shared company files to the other accounts;
  // only a library that account kept before sharing is removed. Files are removed for everyone from Case files.
  window.fwClearProfile = function (pid) {
    try { localStorage.removeItem(oldLibKey(pid)); } catch (e) { /* ignore */ }
    G.lib = null; G.all = null; G.cases = {};
  };
  // For the Playground tile: this account's Reputation, and whether it has seen the intro (or already played)
  window.fwSummary = function () {
    const g = typeof DATA !== "undefined" && DATA && DATA.game && typeof DATA.game === "object" ? DATA.game : {};
    const xp = Object.values(g.best || {}).reduce((s, b) => s + ((b && b.score) || 0), 0);
    return { xp, seen: !!g.intro || introStarted(g) };
  };
  window.renderGame = function (sub, a, b) {
    document.body.classList.add("fx-mode");
    if (!E || !M || !SAMPLE) { G.cur = null; view.innerHTML = emptyState("alert", "Không tải được game", "Thiếu tệp của game. Tải lại trang.", ""); return; }
    if (sub === "m") { renderMission(a, b); return; }
    G.cur = null;
    if (sub === "intro") { renderIntro(); return; }
    // the first time an account opens the game, it sees the title screen
    const g = prog();
    if (!sub && !g.intro && !introStarted(g)) { history.replaceState(null, "", "#/game/intro"); renderIntro(); return; }
    if (sub === "story") return renderStory(a);
    if (sub === "cases") return renderCases();
    if (sub === "career") return renderCareer();
    if (SOON[sub]) return renderSoon(sub);
    renderHQ();
  };
})();

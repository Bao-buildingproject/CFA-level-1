// ============================================================
// js/game/ui.js — "Financial World: Evidence of Value" (Game, under Learn)
//
// HQ (rank, company files, add a company) → a mission:
//   Hồ sơ → Terminal → Bằng chứng → Workpapers → Quyết định → Committee → Kết quả
// Numbers come from engine.js, rules and score from missions.js; this file only
// draws them and keeps the player's progress in DATA.game.
// Company files the player adds stay on this device (localStorage, per profile):
// data from a provider such as WiData is for personal use and never goes online.
// ============================================================
(function () {
  "use strict";
  const E = window.FWEngine, M = window.FWMissions, SAMPLE = window.FWSample;

  const STEPS = [
    { id: "brief", vi: "Hồ sơ" }, { id: "terminal", vi: "Terminal" }, { id: "board", vi: "Bằng chứng" },
    { id: "work", vi: "Workpapers" }, { id: "decide", vi: "Quyết định" }, { id: "committee", vi: "Committee" }, { id: "result", vi: "Kết quả" }
  ];
  const DECISION_TEXT = {
    INVEST: "Bằng chứng ủng hộ; các rủi ro chính đã được kiểm tra và bác bỏ.",
    HOLD: "Tín hiệu trái chiều: theo dõi thêm trước khi tăng hay giảm vị thế.",
    AVOID: "Rủi ro được bằng chứng ủng hộ: không giải ngân.",
    REQUEST: "Hồ sơ chưa đủ để kết luận: cần thêm tài liệu trước khi quyết định."
  };
  const LABELS = { REAL: "Dữ liệu thật, có nguồn", CALCULATED: "Engine tính từ dữ liệu trong hồ sơ", SIMULATED: "Dữ liệu mô phỏng, doanh nghiệp hư cấu" };
  const UNIT = { pct: "%", pp: "điểm %", x: "lần", days: "ngày", vnd: "tỷ đồng" };
  // VN30 basket in effect from 16/11/2026 (HOSE). Banks and securities firms file a different statement format.
  const VN30 = {
    asOf: "16/11/2026",
    nonfin: ["BSR", "FPT", "GAS", "GVR", "HPG", "MCH", "MSN", "MWG", "SAB", "VHM", "VIC", "VJC", "VNM", "VPL", "VRE"],
    fin: ["ACB", "BID", "CTG", "HDB", "LPB", "MBB", "SHB", "SSB", "SSI", "STB", "TCB", "TCX", "VCB", "VIB", "VPB"]
  };
  const G = { lib: null, all: null, cases: {}, tab: "fs", cur: null, saveT: 0 };

  // ---------- storage ----------
  const libKey = () => `cfaStudy_fw_${PROFILES.active}`;
  function lib() {
    if (G.lib && G.lib.key === libKey()) return G.lib;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(libKey()) || "null"); } catch (e) { raw = null; }
    G.lib = { key: libKey(), datasets: raw && Array.isArray(raw.datasets) ? raw.datasets : [], quarantine: raw && Array.isArray(raw.quarantine) ? raw.quarantine : [] };
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
  const nextBtn = (id, label) => `<div class="fw-next"><button class="btn btn-primary" data-go="${id}">${label} ${icon("next", 16)}</button></div>`;
  const pinBtn = (id, on) => `<button class="fw-pin ${on ? "on" : ""}" data-pin="${id}" aria-pressed="${on}" title="${on ? "Bỏ ghim" : "Ghim làm bằng chứng"}" aria-label="${on ? "Bỏ ghim" : "Ghim làm bằng chứng"}">${icon("pin", 15)}</button>`;
  const requestText = (tk, has) => `${has ? "Cập nhật" : "Lấy"} BCTC hợp nhất năm (5 năm gần nhất) của ${tk} từ WiData cho game Financial World`;

  // ================= HQ =================
  function renderHQ() {
    const list = datasets(), rank = M.rankOf(xpTotal()), best = prog().best;
    view.innerHTML = `<div class="fw-root" id="fw-root">
      ${pageHeader("Financial World", "Axiom Capital Intelligence. Mỗi con số là một bằng chứng; mỗi quyết định có hậu quả.", "", "Game · Evidence of Value")}
      <div class="fw-hq">
        ${rankCard(rank)}
        <section class="card fw-files">
          <div class="card-head fw-files-head"><div><h2>Hồ sơ doanh nghiệp</h2><p class="text-2 small">Chọn một công ty, rồi chọn nhiệm vụ. ${list.length - 1 ? `${list.length - 1} công ty thật trên thiết bị này.` : "Chưa có công ty thật: xem mục Thêm công ty."}</p></div>
            ${list.length > 4 ? `<label class="fw-search">${icon("search", 16)}<input id="fw-q" type="search" placeholder="Tìm mã hoặc tên công ty" aria-label="Tìm hồ sơ"></label>` : ""}</div>
          <div class="fw-cos" id="fw-cos">${list.map(e => companyCard(e, best)).join("")}</div>
          <p class="text-3 small fw-empty-q" id="fw-noq" hidden>Không có hồ sơ khớp.</p>
        </section>
        ${addCard(list)}
        ${quarantineCard()}
        ${howCard()}
      </div>
      <input type="file" id="fw-file" accept=".json,application/json" multiple hidden>
    </div>`;
    bindHQ();
  }

  function rankCard(r) {
    const next = r.next ? `còn ${r.next.xp - r.xp} XP để lên <strong>${r.next.name}</strong>` : "cấp cao nhất";
    return `<section class="card fw-rank">
      <div class="fw-rank-main">
        <div class="stat-label">Cấp bậc tại Axiom Capital</div>
        <div class="fw-rank-name">${r.name}</div>
        <div class="text-2 small">${r.xp} XP · ${next}</div>
        ${progressBar(r.progress * 100, "accent")}
        <p class="text-3 small fw-rank-note">XP là tổng điểm cao nhất của từng nhiệm vụ; mỗi công ty × nhiệm vụ tối đa 100.</p>
      </div>
      <ol class="fw-ladder">${M.RANKS.map((x, i) => `<li class="${i < r.idx ? "past" : i === r.idx ? "now" : ""}"><span>${x.name}</span><span class="mono">${x.xp}</span></li>`).join("")}</ol>
    </section>`;
  }

  function companyCard(e, best) {
    const ds = e.ds, co = ds.company, passed = e.val.checks.filter(c => c.status === "pass").length;
    const src = ds.class === "SIMULATED" ? "Case huấn luyện của trò chơi" : `${esc(ds.source.attribution || ds.source.provider)}${ds.source.retrievedAt ? ` · lấy ngày ${dateVi(ds.source.retrievedAt)}` : ""}`;
    return `<article class="fw-co" data-q="${esc(`${co.ticker} ${co.name} ${co.sector}`.toLowerCase())}">
      <div class="fw-co-head">
        <span class="fw-ticker">${esc(co.ticker || "—")}</span>
        <div class="fw-co-id"><div class="fw-co-name">${esc(co.name)}</div><div class="text-3 small">${[co.sector, yrs(ds)].filter(Boolean).map(esc).join(" · ")}</div></div>
      </div>
      <div class="fw-co-meta text-3 small"><span>${chip(ds.class)} ${src}</span><span>${e.val.publishable ? `${icon("check", 13)} ${passed}/${e.val.checks.length} kiểm tra đạt` : `<span class="fw-bad">NOT PUBLISHABLE</span>`}</span></div>
      <div class="fw-co-missions">${e.val.publishable ? M.ARCHETYPE_IDS.map(a => missionLink(e, a, best)).join("") : `<p class="small fw-bad">${e.val.checks.filter(c => c.level === "block" && c.status === "fail").map(c => esc(c.label)).join(" · ")}</p>`}</div>
      ${e.builtin ? "" : `<div class="fw-co-foot"><button class="btn btn-ghost btn-sm" data-del="${esc(ds.id)}">${icon("trash", 14)} Xoá hồ sơ</button></div>`}
    </article>`;
  }

  function missionLink(e, archId, best) {
    const arch = M.ARCHETYPES[archId], key = M.caseKey(e.ds.id, archId), open = M.unlocked(archId, best), b = best[key], run = prog().runs[key];
    let status;
    if (!open) status = `${icon("lock", 13)} Hoàn thành ${M.ARCHETYPES[arch.requires].code} trước`;
    else if (b) status = `Tốt nhất <strong>${b.score}</strong>/100`;
    else if (run && !run.done && (run.pins.length || run.step !== "brief")) status = `Đang làm · bước ${STEPS.findIndex(s => s.id === run.step) + 1}/7`;
    else status = "Chưa chơi";
    const inner = `<span class="fw-code">${arch.code}</span><span class="fw-m-title"><span>${arch.title}</span><small>${arch.vi} · <span class="fw-m-status">${status}</span></small></span>`;
    return open ? `<a class="fw-mission" href="#/game/m/${esc(e.ds.id)}/${archId}">${inner}${icon("chevron", 16)}</a>` : `<div class="fw-mission locked" aria-disabled="true">${inner}</div>`;
  }

  function addCard(list) {
    const have = new Set(list.filter(e => !e.builtin).map(e => e.ds.company.ticker));
    return `<section class="card fw-add" id="fw-add">
      <div class="card-head"><div><h2>Thêm hoặc cập nhật công ty</h2><p class="text-2 small">Ai cần công ty nào thì lấy báo cáo của công ty đó, khi cần.</p></div></div>
      <div class="fw-vn30">
        <div class="stat-label">VN30 · rổ áp dụng từ ${VN30.asOf}</div>
        <div class="fw-tks">${VN30.nonfin.map(t => `<button class="fw-tk-chip ${have.has(t) ? "have" : ""}" data-tk="${t}" title="${have.has(t) ? "Đã có trên thiết bị; bấm để lấy câu cập nhật" : "Bấm để lấy câu yêu cầu"}">${have.has(t) ? icon("check", 12) : ""}${t}</button>`).join("")}
          ${VN30.fin.map(t => `<span class="fw-tk-chip off" title="Ngân hàng, chứng khoán: mẫu BCTC khác, bản này chưa hỗ trợ">${t}</span>`).join("")}</div>
        <p class="text-3 small">Mã gạch mờ là ngân hàng và công ty chứng khoán: mẫu báo cáo khác, bản này chưa chơi được.</p>
      </div>
      <ol class="fw-howto">
        <li><span>Chọn mã ở trên, hoặc nhập mã khác</span><input class="input fw-tk" id="fw-tk" maxlength="10" placeholder="VD: HPG" autocomplete="off" spellcheck="false"></li>
        <li><span>Gửi cho Claude (đã kết nối WiData MCP) câu sau</span>
          <div class="fw-req"><code id="fw-req">${requestText("HPG", have.has("HPG"))}</code><button class="btn btn-secondary btn-sm" id="fw-copy">Sao chép</button></div></li>
        <li><span>Claude gửi lại file <span class="mono">.json</span>; nạp vào đây</span>
          <div class="row-gap"><button class="btn btn-primary btn-sm" id="fw-pick">${icon("upload", 15)} Nạp file</button><button class="btn btn-ghost btn-sm" id="fw-paste">Dán nội dung</button></div></li>
      </ol>
      <p class="text-3 small fw-add-note">Nhận báo cáo năm, hợp nhất, của doanh nghiệp phi tài chính; một file có thể chứa nhiều công ty. File phải qua mọi kiểm tra bắt buộc mới được chơi, file không đạt bị cách ly kèm lý do. Nạp lại cùng công ty và cùng kỳ thì số mới thay số cũ. Số liệu WiData chỉ dùng cá nhân: file nằm trên thiết bị này, không đưa lên web.</p>
    </section>`;
  }

  function quarantineCard() {
    const q = lib().quarantine;
    if (!q.length) return "";
    return `<section class="card fw-quar">
      <div class="card-head"><div><h2>Bị cách ly</h2><p class="text-2 small">NOT PUBLISHABLE: không qua kiểm tra bắt buộc nên không dùng để chơi.</p></div>
        <button class="btn btn-ghost btn-sm" id="fw-qclear">Xoá danh sách</button></div>
      <ul class="fw-quar-list">${q.slice().reverse().map(x => `<li><div class="fw-quar-h"><strong>${esc(x.company || x.name || "File")}</strong><span class="text-3 small">${esc(x.name || "")} · ${new Date(x.at).toLocaleString("vi-VN")}</span></div>
        <ul>${(x.errors || []).slice(0, 6).map(er => `<li>${esc(er)}</li>`).join("")}</ul></li>`).join("")}</ul>
    </section>`;
  }

  function howCard() {
    return `<details class="card fw-how"><summary><h2>Cách chơi</h2><span class="text-3 small">Quy trình, nhãn dữ liệu, thang điểm</span>${icon("chevron", 16)}</summary>
      <ol class="fw-how-steps">
        <li><strong>Hồ sơ.</strong> Đọc yêu cầu của Investment Committee, phạm vi dữ liệu và bốn giả thuyết cần kiểm định.</li>
        <li><strong>Terminal.</strong> Xem ba báo cáo, các chỉ số, kết quả kiểm tra dữ liệu và nguồn của từng con số. Ghim những gì bạn coi là bằng chứng.</li>
        <li><strong>Bằng chứng.</strong> Gắn bằng chứng vào giả thuyết: Ủng hộ, Mâu thuẫn, Giải thích bối cảnh hoặc Cần thêm bằng chứng, rồi tự kết luận từng giả thuyết.</li>
        <li><strong>Workpapers.</strong> Tự tính ba chỉ số của năm gần nhất từ báo cáo; game đối chiếu với số của engine.</li>
        <li><strong>Quyết định.</strong> INVEST, HOLD, AVOID hoặc REQUEST MORE EVIDENCE, kèm mức tự tin.</li>
        <li><strong>Investment Committee.</strong> Ba câu hỏi: bằng chứng mạnh nhất, bằng chứng ngược chiều, giới hạn của dữ liệu.</li>
        <li><strong>Kết quả.</strong> Điểm theo năm tiêu chí, góc nhìn tham chiếu của bộ quy tắc và những gì bạn bỏ sót.</li>
      </ol>
      <div class="fw-how-grid">
        <div><div class="stat-label">Nhãn của mỗi con số</div>
          <p>${chip("REAL")} số từ nhà cung cấp dữ liệu, có cột nguồn.</p>
          <p>${chip("CALCULATED")} số engine tính, có công thức và đầu vào.</p>
          <p>${chip("SIMULATED")} số mô phỏng của doanh nghiệp hư cấu.</p></div>
        <div><div class="stat-label">Thang điểm 100</div>
          <p>Data Accuracy 25 · Evidence Quality 25 · Analytical Reasoning 25 · Decision Discipline 15 · Source Awareness 10</p>
          <p class="text-3 small">Bất thường → dấu hiệu cảnh báo → giả thuyết → bằng chứng → kết luận có căn cứ. Game không kết luận gian lận, và góc nhìn tham chiếu không phải khuyến nghị đầu tư.</p></div>
      </div>
    </details>`;
  }

  function bindHQ() {
    const root = document.getElementById("fw-root");
    const q = document.getElementById("fw-q");
    if (q) q.oninput = () => {
      const t = q.value.trim().toLowerCase();
      let shown = 0;
      root.querySelectorAll(".fw-co").forEach(el => { el.hidden = !!t && !el.dataset.q.includes(t); if (!el.hidden) shown++; });
      document.getElementById("fw-noq").hidden = shown > 0;
    };
    const tk = document.getElementById("fw-tk"), req = document.getElementById("fw-req");
    const have = new Set(datasets().filter(e => !e.builtin).map(e => e.ds.company.ticker));
    const setTk = v => { req.textContent = requestText(v || "HPG", have.has(v)); };
    tk.oninput = () => { tk.value = tk.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); setTk(tk.value); };
    root.querySelectorAll("[data-tk]").forEach(b => b.onclick = () => { tk.value = b.dataset.tk; setTk(b.dataset.tk); req.closest(".fw-req").classList.remove("flash"); void req.offsetWidth; req.closest(".fw-req").classList.add("flash"); });
    document.getElementById("fw-copy").onclick = () => copyText(req.textContent);
    const file = document.getElementById("fw-file");
    document.getElementById("fw-pick").onclick = () => file.click();
    file.onchange = async () => {
      for (const f of Array.from(file.files)) {
        if (f.size > 3e6) { addQuarantine({ name: f.name, errors: ["File lớn hơn 3 MB"] }); continue; }
        importText(await f.text(), f.name);
      }
      file.value = "";
      renderHQ();
    };
    document.getElementById("fw-paste").onclick = pasteDialog;
    const qc = document.getElementById("fw-qclear");
    if (qc) qc.onclick = () => { lib().quarantine = []; saveLib(); renderHQ(); };
    root.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      const id = b.dataset.del, e = findDs(id);
      const ok = await confirmDialog({ title: "Xoá hồ sơ này?", message: `${esc(e ? `${e.ds.company.ticker} · ${e.ds.company.name}` : id)}: file dữ liệu bị xoá khỏi thiết bị. Điểm cao nhất vẫn được giữ.`, confirmText: "Xoá", danger: true });
      if (!ok) return;
      lib().datasets = lib().datasets.filter(d => d.id !== id); saveLib(); G.all = null;
      Object.keys(prog().runs).forEach(k => { if (k.startsWith(id + "|")) delete prog().runs[k]; });
      save(); toast("Đã xoá hồ sơ"); renderHQ();
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
      close(); renderHQ();
    });
  }

  // ================= MISSION =================
  function renderMission(dsId, archId) {
    const e = findDs(dsId), arch = M.ARCHETYPES[archId];
    const back = `<a class="back-link" href="#/game">${icon("back", 16)} Financial World</a>`;
    const fail = (title, text) => { G.cur = null; view.innerHTML = `<div class="fw-root">${back}${emptyState("alert", title, text, `<a class="btn btn-primary" href="#/game">Về HQ</a>`)}</div>`; };
    if (!e || !arch) return fail("Không tìm thấy hồ sơ", "Hồ sơ hoặc nhiệm vụ này không có trên thiết bị.");
    if (!e.val.publishable) return fail("NOT PUBLISHABLE", "Bộ dữ liệu này không qua kiểm tra bắt buộc nên không dùng để chơi.");
    if (!M.unlocked(archId, prog().best)) return fail("Nhiệm vụ chưa mở", `Hoàn thành ${M.ARCHETYPES[arch.requires].code} ở một hồ sơ bất kỳ để mở nhiệm vụ này.`);
    const cs = caseFor(e, archId);
    if (!cs.playable) return fail("Chưa đủ dữ liệu cho nhiệm vụ này", cs.notPlayable.map(esc).join(" "));
    const key = M.caseKey(e.ds.id, archId), st = runOf(key), co = e.ds.company;
    G.cur = { key, cs, st, e };
    view.innerHTML = `<div class="fw-root fw-mission-page" id="fw-root">
      ${back}
      ${pageHeader(`${esc(co.name)} <span class="fw-h-ticker">${esc(co.ticker)}</span>`, esc(arch.question),
        `<div class="fw-h-label">${chip(e.ds.class)}<span class="text-3 small">${esc(e.ds.class === "SIMULATED" ? "Doanh nghiệp hư cấu" : (e.ds.source.attribution || e.ds.source.provider))}</span></div>`, `${arch.code} · ${arch.title}`)}
      <div id="fw-stepper"></div>
      <div id="fw-step" class="fw-step-body"></div>
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
    return `<nav class="fw-stepper" aria-label="Các bước của nhiệm vụ">${STEPS.map((s, i) => {
      const cur = st.step === s.id, done = stepDone(s.id);
      return `<button class="fw-step ${cur ? "active" : ""} ${done ? "done" : ""}" data-step="${s.id}" ${canGo(s.id) ? "" : "disabled"} ${cur ? 'aria-current="step"' : ""}><span class="fw-step-n">${done && !cur ? icon("check", 13) : i + 1}</span><span>${s.vi}</span></button>`;
    }).join("")}</nav>`;
  }
  function drawStep(scroll) {
    if (!G.cur) return;
    const st = G.cur.st;
    if (!STEPS.some(s => s.id === st.step) || !canGo(st.step)) st.step = st.done ? "result" : "brief";
    document.getElementById("fw-stepper").innerHTML = stepper();
    const body = document.getElementById("fw-step");
    body.innerHTML = ({ brief: briefHtml, terminal: terminalHtml, board: boardHtml, work: workHtml, decide: decideHtml, committee: committeeHtml, result: resultHtml })[st.step]();
    const active = document.querySelector(".fw-step.active");
    if (active && active.scrollIntoView) { const nav = active.parentElement; nav.scrollLeft = Math.max(0, active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2); }
    if (scroll) {
      const top = document.getElementById("fw-stepper").getBoundingClientRect().top + window.scrollY - 76;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
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
    const edits = ["pin", "unpin", "unlink", "verdict", "decision", "conf", "c1", "c2", "c3", "submit"];
    if (!edits.some(k => d[k] !== undefined)) return;
    if (st.done) { toast("Hồ sơ đã nộp. Bấm Chơi lại để làm lại từ đầu.", "error"); return; }
    if (d.pin) { togglePin(d.pin); return; }
    if (d.unpin) { unpin(d.unpin); save(); drawStep(); return; }
    if (d.unlink) { const [h, c, r] = d.unlink.split("~"); st.links = st.links.filter(l => !(l.h === h && l.c === c && l.r === r)); save(); drawStep(); return; }
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
    const { st, cs } = G.cur;
    if (st.done) return;
    if (f.dataset.wp) { checkWorkpaper(f.dataset.wp, f.elements.v.value); return; }
    if (f.dataset.link) {
      const c = f.dataset.link, h = f.elements.h.value, r = f.elements.r.value;
      if (!cs.hyps.some(x => x.id === h) || !M.RELATIONS[r]) return;
      st.links = st.links.filter(l => !(l.h === h && l.c === c));      // one relation per card and hypothesis
      st.links.push({ h, c, r });
      save(); drawStep();
    }
  }
  function onMissionInput(ev) {
    if (ev.target.id === "fw-thesis" && G.cur && !G.cur.st.done) {
      G.cur.st.thesis = ev.target.value.slice(0, 600);
      clearTimeout(G.saveT); G.saveT = setTimeout(save, 400);
    }
  }
  function togglePin(id) {
    const st = G.cur.st, on = !st.pins.includes(id);
    if (on) st.pins.push(id); else unpin(id);
    save();
    document.querySelectorAll(`[data-pin="${id}"]`).forEach(b => {
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
      const label = on ? "Bỏ ghim" : "Ghim làm bằng chứng";
      b.title = label; b.setAttribute("aria-label", label);
      if (b.classList.contains("fw-pin-wide")) b.innerHTML = `${icon("pin", 15)} ${on ? "Đã ghim · bấm để bỏ" : "Ghim làm bằng chứng"}`;
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

  // ---------- 1. Brief ----------
  function briefHtml() {
    const { cs, e } = G.cur, ds = e.ds, co = ds.company, man = cs.c.man;
    return `<div class="fw-grid-2">
      <section class="card fw-memo">
        <div class="kicker">Memo · Investment Committee</div>
        <p class="fw-memo-text">${esc(cs.memo)}</p>
        ${ds.story && ds.story.brief ? `<p class="fw-story">${esc(ds.story.brief)} <span class="text-3 small">(kịch bản mô phỏng)</span></p>` : ""}
        <div class="fw-question"><div class="stat-label">Câu hỏi bạn phải trả lời</div><p>${esc(cs.question)}</p></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Doanh nghiệp</h2>${chip(ds.class)}</div>
        <dl class="fw-dl">
          <dt>Tên</dt><dd>${esc(co.name)}</dd>
          <dt>Mã · sàn</dt><dd>${esc(co.ticker)}${co.exchange ? ` · ${esc(co.exchange)}` : ""}</dd>
          <dt>Ngành</dt><dd>${esc(co.sector || "—")}</dd>
          <dt>Kỳ</dt><dd>${yrs(ds)} · báo cáo năm · ${ds.scope.basis === "consolidated" ? "hợp nhất" : "riêng lẻ"} · ${esc(ds.scope.framework)}</dd>
          <dt>Nguồn</dt><dd>${esc(ds.source.attribution || ds.source.provider)}</dd>
        </dl>
      </section>
    </div>
    <section class="card section">
      <div class="card-head"><div><h2>Hồ sơ gồm những gì</h2><p class="text-2 small">Inventory manifest: phần trong phạm vi và phần không có.</p></div>${man.reconciled ? `<span class="badge badge-success">Đã đối chiếu</span>` : `<span class="badge badge-danger">Chưa đối chiếu</span>`}</div>
      <div class="fw-table-wrap"><table class="table fw-manifest"><thead><tr><th>Tài liệu</th><th class="num">Cần</th><th class="num">Có</th><th>QA</th></tr></thead><tbody>
        ${man.rows.map(r => `<tr><td>${r.name}</td><td class="num">${r.expected} năm</td><td class="num">${r.retrieved} năm</td><td>${r.qa === "PASS" ? `<span class="badge badge-success">PASS</span>` : `<span class="badge badge-danger">FAIL</span>`}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="text-2 small fw-oos"><strong>Không có trong hồ sơ:</strong> ${man.outOfScope.map(o => o.name).join(" · ")}.</p>
    </section>
    <section class="card section">
      <div class="card-head"><div><h2>Giả thuyết cần kiểm định</h2><p class="text-2 small">Giả thuyết nào cũng cần bằng chứng, kể cả giả thuyết tích cực.</p></div></div>
      <ol class="fw-hyp-list">${cs.hyps.map(h => `<li><span class="fw-hid">${h.id}</span><div><div>${esc(h.title)}</div><span class="badge">${esc(h.tag)}</span></div></li>`).join("")}</ol>
      <p class="text-3 small">CFA Level I · ${cs.arch.los.map(k => E.LOS[k]).join(" · ")}</p>
    </section>
    ${nextBtn("terminal", "Mở Terminal")}`;
  }

  // ---------- 2. Terminal ----------
  function terminalHtml() {
    const st = G.cur.st;
    const tabs = [["fs", "Báo cáo tài chính"], ["ratios", "Chỉ số"], ["checks", "Kiểm tra dữ liệu"], ["source", "Nguồn & lineage"]];
    const body = ({ fs: fsHtml, ratios: ratiosHtml, checks: checksHtml, source: sourceHtml })[G.tab] || fsHtml;
    return `<div class="fw-term-head"><div class="tabs fw-tabs" role="tablist">${tabs.map(([k, v]) => `<button class="tab ${G.tab === k ? "active" : ""}" role="tab" aria-selected="${G.tab === k}" data-tab="${k}">${v}</button>`).join("")}</div>
      <span class="fw-pins-n text-2 small">${icon("pin", 15)} <span id="fw-pin-count">${st.pins.length}</span> bằng chứng đã ghim</span></div>
      ${body()}
      ${nextBtn("board", "Sang Bảng bằng chứng")}`;
  }
  function fsHtml() {
    const { e, st } = G.cur, ds = e.ds;
    const names = { bs: "Bảng cân đối kế toán", is: "Báo cáo kết quả kinh doanh", cf: "Báo cáo lưu chuyển tiền tệ" };
    const notes = { bs: "Số dư cuối năm", is: "Cả năm", cf: "Cả năm; số âm là tiền chi ra" };
    return `<p class="text-2 small fw-hint-line">${chip(ds.class)} Đơn vị: tỷ đồng. Bấm một con số để xem nguồn; bấm ${icon("pin", 13)} để ghim cả dòng làm bằng chứng.</p>` +
      Object.keys(names).map(sec => `<section class="card fw-fs">
        <div class="fw-fs-head"><h3>${names[sec]}</h3><span class="text-3 small">${notes[sec]}</span></div>
        <div class="fw-table-wrap"><table class="table fw-table"><thead><tr><th scope="col">Khoản mục</th>${ds.years.map(y => `<th class="num" scope="col">${y}</th>`).join("")}<th class="fw-pin-col"><span class="sr-only">Ghim</span></th></tr></thead><tbody>
        ${E.ORDER[sec].map(k => {
          const it = E.ITEMS[k], id = "i:" + k;
          return `<tr class="${E.SUBTOTALS.includes(k) ? "fw-sub" : ""}"><th scope="row"><span>${it.vi}</span><small>${it.en}</small></th>
            ${ds.years.map(y => { const v = ds.values[y][k]; return v === null ? `<td class="num fw-na" title="Không có trong dữ liệu">—</td>` : `<td class="num"><button class="fw-cell" data-insp="${id}|${y}">${ty(v)}</button></td>`; }).join("")}
            <td class="fw-pin-col">${pinBtn(id, st.pins.includes(id))}</td></tr>`;
        }).join("")}
        </tbody></table></div></section>`).join("");
  }
  function ratiosHtml() {
    const { cs, st } = G.cur, res = cs.c.res;
    return `<p class="text-2 small fw-hint-line">${chip("CALCULATED")} Engine tính từ báo cáo; bấm vào số để xem công thức và đầu vào. ${icon("lock", 13)} là số bạn tự tính ở Workpapers.</p>` +
      Object.keys(E.GROUPS).map(g => `<section class="card fw-fs"><div class="fw-fs-head"><h3>${E.GROUPS[g]}</h3></div>
        <div class="fw-table-wrap"><table class="table fw-table"><thead><tr><th scope="col">Chỉ số</th>${res.years.map(y => `<th class="num" scope="col">${y}</th>`).join("")}<th class="fw-pin-col"><span class="sr-only">Ghim</span></th></tr></thead><tbody>
        ${E.METRICS.filter(m => m.group === g).map(m => {
          const id = "m:" + m.id;
          return `<tr><th scope="row"><span>${m.vi} <span class="fw-unit">${UNIT[m.unit]}</span>${m.proxy ? ` <span class="fw-proxy">ước tính</span>` : ""}</span><small>${esc(m.formula)}</small></th>
            ${res.years.map(y => {
              const b = res.results[m.id].byYear[y];
              if (locked(m.id, y)) return `<td class="num"><button class="fw-cell fw-locked" data-insp="${id}|${y}" title="Tự tính ở Workpapers" aria-label="Tự tính ở Workpapers">${icon("lock", 13)}</button></td>`;
              return b.v === null ? `<td class="num fw-na"><button class="fw-cell" data-insp="${id}|${y}" title="${esc(b.reason)}">—</button></td>` : `<td class="num"><button class="fw-cell" data-insp="${id}|${y}">${cell(b.v, m.unit)}</button></td>`;
            }).join("")}
            <td class="fw-pin-col">${pinBtn(id, st.pins.includes(id))}</td></tr>`;
        }).join("")}
        </tbody></table></div></section>`).join("");
  }
  function checksHtml() {
    const val = G.cur.cs.c.val;
    const stTxt = c => c.status === "pass" ? "ĐẠT" : c.status === "fail" ? (c.level === "block" ? "KHÔNG ĐẠT" : "CẢNH BÁO") : "KHÔNG ÁP DỤNG";
    return `<section class="card fw-checks">
      <div class="fw-pub ${val.publishable ? "ok" : "bad"}">${icon(val.publishable ? "check" : "alert", 18)}<div><strong>${val.publishable ? "PUBLISHABLE" : "NOT PUBLISHABLE"}</strong><p class="small">${val.publishable ? "Mọi kiểm tra bắt buộc đều đạt. Cảnh báo không chặn, nhưng là giới hạn bạn cần nêu." : "Có kiểm tra bắt buộc không đạt."}</p></div></div>
      <ul class="fw-check-list">${val.checks.map(c => `<li class="fw-chk fw-chk-${c.status} ${c.level}"><span class="fw-chk-i">${icon(c.status === "pass" ? "check" : c.status === "fail" ? "alert" : "x", 15)}</span>
        <div><div class="fw-chk-l">${esc(c.label)} <span class="badge ${c.level === "block" ? "" : "badge-warning"}">${c.level === "block" ? "Bắt buộc" : "Cảnh báo"}</span></div><div class="text-2 small">${esc(c.detail)}</div></div>
        <span class="fw-chk-s">${stTxt(c)}</span></li>`).join("")}</ul>
    </section>`;
  }
  function sourceHtml() {
    const ds = G.cur.e.ds, s = ds.source;
    const rows = [["Nhà cung cấp", esc(s.provider)], ["Ghi nguồn", esc(s.attribution)], ["Endpoint", esc(s.endpoint)], ["Ngày lấy", s.retrievedAt ? dateVi(s.retrievedAt) : ""],
      ["Phạm vi lấy", esc(s.version)], ["Điều kiện dùng", esc(s.license)], ["Ghi chú", esc(s.note)]].filter(r => r[1]);
    return `<div class="fw-grid-2">
      <section class="card"><div class="card-head"><h2>Nguồn dữ liệu</h2>${chip(ds.class)}</div>
        <dl class="fw-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
          <dt>Báo cáo</dt><dd>${ds.scope.basis === "consolidated" ? "Hợp nhất" : "Riêng lẻ"} · ${esc(ds.scope.framework)} · năm · VND (nguồn tính bằng ${esc(ds.scope.sourceUnit)})</dd></dl></section>
      <section class="card"><div class="card-head"><h2>Kiểm toán theo năm</h2></div>
        <ul class="fw-audit">${ds.years.map(y => `<li><span class="mono">${y}</span><span>${auditVi(ds.periodMeta[y].audit)}</span></li>`).join("")}</ul>
        <div class="fw-legend"><p>${chip("REAL")} ${LABELS.REAL}</p><p>${chip("CALCULATED")} ${LABELS.CALCULATED}</p><p>${chip("SIMULATED")} ${LABELS.SIMULATED}</p></div></section>
    </div>
    <section class="card section"><div class="card-head"><div><h2>Lineage</h2><p class="text-2 small">Mỗi khoản mục của game lấy từ cột nào của nguồn.</p></div></div>
      <div class="fw-table-wrap"><table class="table fw-lineage"><thead><tr><th>Khoản mục trong game</th><th>Cột nguồn</th><th>Tên ở nguồn</th><th>Xử lý</th></tr></thead><tbody>
      ${Object.keys(E.ITEMS).map(k => { const l = ds.lineage[k] || {}; return `<tr><td>${E.ITEMS[k].vi}</td><td class="mono">${esc(l.column || "—")}</td><td>${esc(l.label || (ds.class === "SIMULATED" ? "Sinh từ tham số mô phỏng" : "—"))}</td><td class="text-2">${esc(l.transform || "")}</td></tr>`; }).join("")}
      </tbody></table></div></section>`;
  }

  // ---------- Inspector ----------
  function openInspector(ref) {
    const { cs, st, e } = G.cur, ds = e.ds, [card, ys] = ref.split("|"), year = Number(ys), info = M.cardInfo(cs.c, card);
    if (!info || !ds.values[year] && info.kind === "i") return;
    let body;
    if (info.kind === "i") {
      const v = ds.values[year][info.key], l = ds.lineage[info.key] || {};
      body = `<div class="fw-insp-top">${chip(ds.class)}<span class="text-3 small mono">${year}</span></div>
        <h2 id="fw-drawer-title">${info.title}</h2><p class="text-3 small">${info.en}</p>
        <div class="fw-insp-val">${v === null ? "Không có trong dữ liệu" : `${M.fmt(v, "vnd")}<small>${M.num(v, 0)} đồng</small>`}</div>
        <dl class="fw-dl">
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
      body = `<div class="fw-insp-top">${chip("CALCULATED")}<span class="text-3 small mono">${year}</span></div>
        <h2 id="fw-drawer-title">${info.title}</h2><p class="text-3 small">${esc(info.group)} · ${esc(info.los)}</p>
        <div class="fw-insp-val">${lock ? `<span class="fw-insp-lock">${icon("lock", 18)} Tự tính ở Workpapers</span>` : b.v === null ? `Không khả dụng<small>${esc(b.reason)}</small>` : M.fmt(b.v, info.unit)}</div>
        <div class="fw-formula"><div class="stat-label">Công thức</div><p>${esc(info.formula)}</p></div>
        ${b.inputs && b.inputs.length ? `<div class="stat-label">Đầu vào ${chip(ds.class)}</div><ul class="fw-inputs">${b.inputs.map(i => `<li><button class="fw-cell" data-insp="i:${i.item}|${i.year}"><span>${E.ITEMS[i.item].vi} <span class="text-3">${i.year} · ${i.how}</span></span><span class="mono">${lock ? "?" : ty(i.v)}</span></button></li>`).join("")}</ul>` : ""}
        ${b.notes && b.notes.length ? `<div class="stat-label">Quy ước</div><ul class="fw-notes">${b.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="text-3 small">Engine ${E.ENGINE_VERSION} · bộ quy tắc ${M.RULES_VERSION}</p>`;
    }
    const on = st.pins.includes(card);
    const { back, dr } = drawerEls();
    if (dr.hidden) G.lastFocus = document.activeElement;
    dr.innerHTML = `<div class="fw-drawer-head"><span class="kicker">Inspector · lineage</span><button class="btn btn-ghost btn-sm" data-close aria-label="Đóng">${icon("x", 16)}</button></div>
      <div class="fw-drawer-body">${body}</div>
      ${st.done ? "" : `<div class="fw-drawer-foot"><button class="btn btn-secondary btn-sm fw-pin-wide ${on ? "on" : ""}" data-pin="${card}" aria-pressed="${on}">${icon("pin", 15)} ${on ? "Đã ghim · bấm để bỏ" : "Ghim làm bằng chứng"}</button></div>`}`;
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

  // ---------- 3. Evidence board ----------
  function boardHtml() {
    const { cs, st } = G.cur;
    return `<div class="fw-board">
      <section class="fw-board-cards">
        <div class="fw-col-head"><h2>Bằng chứng đã ghim <span class="text-3">(${st.pins.length})</span></h2>${st.done ? "" : `<button class="btn btn-ghost btn-sm" data-go="terminal">${icon("plus", 14)} Ghim thêm</button>`}</div>
        ${st.pins.length ? `<div class="fw-cards">${st.pins.map(evCard).join("")}</div>` : emptyState("pin", "Chưa có bằng chứng", "Mở Terminal, ghim các dòng báo cáo và chỉ số bạn cho là liên quan.", `<button class="btn btn-primary" data-go="terminal">Mở Terminal</button>`)}
      </section>
      <section class="fw-board-hyps">
        <div class="fw-col-head"><h2>Giả thuyết</h2><span class="text-3 small">${cs.hyps.filter(h => st.verdicts[h.id]).length}/${cs.hyps.length} đã kết luận</span></div>
        ${cs.hyps.map(hypPanel).join("")}
      </section>
    </div>
    ${nextBtn("work", "Sang Workpapers")}`;
  }
  function evCard(id) {
    const { cs, st } = G.cur, info = M.cardInfo(cs.c, id);
    if (!info) return "";
    const pts = info.points.map(p => ({ ...p, lock: info.kind === "m" && locked(info.key, p.year) }));
    const links = st.links.filter(l => l.c === id);
    return `<article class="fw-card">
      <header>${chip(info.label)}${st.done ? "" : `<button class="fw-x" data-unpin="${id}" title="Bỏ ghim" aria-label="Bỏ ghim">${icon("x", 14)}</button>`}</header>
      <h3>${info.title} <span class="fw-unit">${UNIT[info.unit]}</span></h3>
      ${spark(pts)}
      <dl class="fw-pts">${pts.map(p => `<div><dt>${p.year}</dt><dd>${p.lock ? icon("lock", 12) : p.v === null ? "—" : cell(p.v, info.unit)}</dd></div>`).join("")}</dl>
      ${links.length ? `<ul class="fw-card-links">${links.map(l => `<li><span class="mono">${l.h}</span>${relChip(l.r)}</li>`).join("")}</ul>` : ""}
      ${st.done ? "" : `<form class="fw-link-form" data-link="${id}">
        <select class="select" name="h" aria-label="Giả thuyết">${cs.hyps.map(h => `<option value="${h.id}">${h.id} · ${esc(h.tag)}</option>`).join("")}</select>
        <select class="select" name="r" aria-label="Quan hệ">${Object.keys(M.RELATIONS).map(r => `<option value="${r}">${M.RELATIONS[r].vi}</option>`).join("")}</select>
        <button class="btn btn-secondary btn-sm" type="submit">${icon("link", 14)} Gắn</button></form>`}
    </article>`;
  }
  function spark(pts) {
    const ok = pts.filter(p => p.v !== null && !p.lock);
    if (ok.length < 2) return `<div class="fw-spark empty" aria-hidden="true"></div>`;
    const w = 120, h = 32, span = Math.max(pts.length - 1, 1), vs = ok.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
    const xy = p => [(pts.indexOf(p) / span) * (w - 6) + 3, h - 4 - ((p.v - lo) / rng) * (h - 8)];
    const d = ok.map((p, i) => `${i ? "L" : "M"}${xy(p).map(n => n.toFixed(1)).join(" ")}`).join(" ");
    const last = xy(ok[ok.length - 1]);
    return `<svg class="fw-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.4" fill="currentColor"/></svg>`;
  }
  function hypPanel(h) {
    const { cs, st } = G.cur, links = st.links.filter(l => l.h === h.id), bal = M.balance(st.links, h.id), v = st.verdicts[h.id];
    return `<article class="fw-hyp">
      <div class="fw-hyp-head"><span class="fw-hid">${h.id}</span><span class="badge">${esc(h.tag)}</span>${v ? statusChip(v) : ""}</div>
      <p class="fw-hyp-title">${esc(h.title)}</p>
      ${links.length ? `<ul class="fw-hyp-links">${links.map(l => `<li>${relChip(l.r)}<span>${cardTitle(cs, l.c)}</span>${st.done ? "" : `<button class="fw-x" data-unlink="${l.h}~${l.c}~${l.r}" aria-label="Gỡ liên kết">${icon("x", 13)}</button>`}</li>`).join("")}</ul>` : `<p class="text-3 small">Chưa gắn bằng chứng nào.</p>`}
      <div class="fw-balance text-3 small">${bal.supports} ủng hộ · ${bal.contradicts} mâu thuẫn · ${bal.explains} bối cảnh · ${bal.needs} cần thêm</div>
      <div class="fw-verdict"><span class="stat-label">Kết luận của bạn</span>
        <div class="fw-verdict-opts" role="group" aria-label="Kết luận cho ${h.id}">${["SUPPORTED", "PLAUSIBLE", "CONTRADICTED", "UNTESTED"].map(s => `<button class="fw-vbtn fw-st-${s.toLowerCase()} ${v === s ? "on" : ""}" data-verdict="${h.id}~${s}" aria-pressed="${v === s}" title="${M.STATUS[s].vi}" ${st.done ? "disabled" : ""}>${M.STATUS[s].en}</button>`).join("")}</div></div>
      <details class="fw-hint"><summary>Gợi ý</summary><p class="small text-2">${esc(h.hint)}</p></details>
    </article>`;
  }

  // ---------- 4. Workpapers ----------
  function workHtml() {
    const cs = G.cur.cs;
    return `<p class="text-2 fw-lead">Tự tính ba chỉ số của năm ${cs.c.lastYear} từ báo cáo (tab Báo cáo tài chính, đơn vị tỷ đồng). Mỗi workpaper chỉ đối chiếu một lần. Bình quân = (cuối năm trước + cuối năm nay) ÷ 2. Phần trăm nhập dạng 12,5 cho 12,5%.</p>
      <div class="fw-wps">${cs.workpapers.map(wpCard).join("")}</div>
      ${nextBtn("decide", "Sang Quyết định")}`;
  }
  function wpCard(w, i) {
    const st = G.cur.st, a = st.wp[w.id];
    const head = `<div class="fw-wp-head"><span class="fw-code">WP-${i + 1}</span><h3>${w.title} · ${w.year}</h3></div><div class="fw-formula"><div class="stat-label">Công thức</div><p>${esc(w.formula)}</p></div>`;
    if (!a || !a.checked) return `<article class="card fw-wp">${head}
      ${st.done ? `<p class="text-3">Không làm.</p>` : `<form class="fw-wp-form" data-wp="${w.id}"><label class="sr-only" for="wp-${w.id}">Kết quả ${w.title}</label><input class="input" id="wp-${w.id}" name="v" inputmode="decimal" autocomplete="off" placeholder="${w.unit === "pct" ? "VD: 12,5" : "VD: 1,25"}"><span class="fw-wp-unit">${UNIT[w.unit]}</span><button class="btn btn-primary btn-sm" type="submit">Đối chiếu</button></form>`}
    </article>`;
    const g = M.gradeWorkpaper(w, a.input), ok = g.frac === 1 ? "ok" : g.frac > 0 ? "near" : "bad";
    return `<article class="card fw-wp done ${ok}">${head}
      <div class="fw-wp-res"><div><div class="stat-label">Bạn</div><strong>${M.wpFmt(w, a.input)}</strong></div><div><div class="stat-label">Engine</div><strong>${M.wpFmt(w, M.shownValue(w))}</strong></div>
        <span class="fw-wp-badge">${ok === "ok" ? "Khớp" : ok === "near" ? "Gần đúng" : "Chưa đúng"} · ${Math.round(g.frac * 100)}%</span></div>
      <div class="stat-label">Đầu vào</div><ul class="fw-inputs">${w.inputs.map(x => `<li><button class="fw-cell" data-insp="i:${x.item}|${x.year}"><span>${E.ITEMS[x.item].vi} <span class="text-3">${x.year} · ${x.how}</span></span><span class="mono">${ty(x.v)}</span></button></li>`).join("")}</ul>
      ${w.notes.length ? `<ul class="fw-notes">${w.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
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
    return `<section class="card">
        <div class="card-head"><div><h2>Kết luận của bạn cho từng giả thuyết</h2><p class="text-2 small">Quyết định nên đi ra từ các kết luận này. Sửa ở Bảng bằng chứng.</p></div>${ro ? "" : `<button class="btn btn-ghost btn-sm" data-go="board">Sửa</button>`}</div>
        <ul class="fw-verdicts">${cs.hyps.map(h => `<li><span class="fw-hid">${h.id}</span><span class="fw-v-title">${esc(h.title)}</span>${st.verdicts[h.id] ? statusChip(mine[h.id]) : `<span class="text-3 small">Chưa kết luận</span>`}</li>`).join("")}</ul>
      </section>
      <section class="card section">
        <div class="card-head"><h2>Quyết định của bạn</h2></div>
        <div class="fw-decisions" role="radiogroup" aria-label="Quyết định">${M.DECISION_IDS.map(d => `<button class="fw-dec ${st.decision === d ? "on" : ""}" data-decision="${d}" role="radio" aria-checked="${st.decision === d}" ${ro ? "disabled" : ""}><strong>${M.DECISIONS[d].en}</strong><span>${M.DECISIONS[d].vi}</span><small>${DECISION_TEXT[d]}</small></button>`).join("")}</div>
        <div class="fw-conf"><span class="stat-label">Mức tự tin</span><div class="segmented" role="radiogroup" aria-label="Mức tự tin">${["high", "medium", "low"].map(c => `<button class="${st.confidence === c ? "active" : ""}" data-conf="${c}" role="radio" aria-checked="${st.confidence === c}" ${ro ? "disabled" : ""}>${M.CONFIDENCE[c]}</button>`).join("")}</div></div>
        <label class="field fw-thesis"><span class="field-label">Luận điểm của bạn (không bắt buộc, không chấm điểm)</span><textarea class="textarea" id="fw-thesis" rows="3" maxlength="600" ${ro ? "disabled" : ""} placeholder="Một hai câu: vì sao bạn chọn quyết định này?">${esc(st.thesis || "")}</textarea></label>
      </section>
      <div class="fw-next"><button class="btn btn-primary" data-go="committee" ${st.decision && st.confidence ? "" : "disabled"}>Trình Investment Committee ${icon("next", 16)}</button></div>`;
  }

  // ---------- 6. Investment Committee ----------
  function committeeHtml() {
    const { cs, st } = G.cur, ro = st.done;
    const pinned = st.pins.map(id => ({ id, t: cardTitle(cs, id) }));
    const none = pinned.length ? "" : `<p class="text-3 small">Bạn chưa ghim bằng chứng nào.</p>`;
    return `<p class="text-2 fw-lead">Quyết định của bạn: <strong>${M.DECISIONS[st.decision].en}</strong> · tự tin ${M.CONFIDENCE[st.confidence].toLowerCase()}. Committee hỏi ba câu trước khi duyệt.</p>
      <section class="card fw-q"><div class="fw-q-n">1</div><div><h3>Ba bằng chứng mạnh nhất cho quyết định của bạn là gì?</h3><p class="text-3 small">Chọn tối đa 3 trong các bằng chứng đã ghim (${st.c1.length}/3).</p>
        <div class="fw-chips">${pinned.map(p => `<button class="fw-chip ${st.c1.includes(p.id) ? "on" : ""}" data-c1="${p.id}" aria-pressed="${st.c1.includes(p.id)}" ${ro ? "disabled" : ""}>${p.t}</button>`).join("")}</div>${none}</div></section>
      <section class="card fw-q"><div class="fw-q-n">2</div><div><h3>Bằng chứng mạnh nhất đi ngược quyết định của bạn là gì?</h3><p class="text-3 small">Một analyst giỏi biết điều gì có thể làm mình sai.</p>
        <div class="fw-chips">${pinned.map(p => `<button class="fw-chip ${st.c2 === p.id ? "on" : ""}" data-c2="${p.id}" aria-pressed="${st.c2 === p.id}" ${ro ? "disabled" : ""}>${p.t}</button>`).join("")}
          <button class="fw-chip ${st.c2 === "none" ? "on" : ""}" data-c2="none" aria-pressed="${st.c2 === "none"}" ${ro ? "disabled" : ""}>Không có bằng chứng ngược chiều đáng kể</button></div></div></section>
      <section class="card fw-q"><div class="fw-q-n">3</div><div><h3>Hồ sơ này có những giới hạn nào?</h3><p class="text-3 small">Chọn mọi câu đúng với hồ sơ này; chọn câu sai bị trừ điểm.</p>
        <ul class="fw-limits">${cs.limits.map(o => `<li><button class="fw-check ${st.c3.includes(o.id) ? "on" : ""}" data-c3="${o.id}" aria-pressed="${st.c3.includes(o.id)}" ${ro ? "disabled" : ""}><span class="fw-box">${icon("check", 13)}</span><span>${o.text}</span></button></li>`).join("")}</ul></div></section>
      ${ro ? "" : `<div class="fw-next"><button class="btn btn-primary btn-lg" data-submit>Nộp hồ sơ cho Committee</button></div>`}`;
  }
  async function submit() {
    const { cs, st, key } = G.cur;
    const missing = [!st.c1.length && "câu 1", !st.c2 && "câu 2", !st.c3.length && "câu 3"].filter(Boolean);
    const ok = await confirmDialog({ title: "Nộp hồ sơ?", message: `${missing.length ? `Bạn chưa trả lời ${missing.join(", ")}. ` : ""}Sau khi nộp, câu trả lời được khoá; bạn có thể chơi lại từ đầu.`, confirmText: "Nộp" });
    if (!ok || !G.cur || G.cur.key !== key) return;
    const before = M.rankOf(xpTotal()), sc = M.score(cs, st);
    st.done = true; st.total = sc.total; st.finishedAt = Date.now(); st.step = "result";
    const g = prog(), prev = g.best[key];
    if (!prev || sc.total > prev.score) g.best[key] = { score: sc.total, at: Date.now() };
    save();
    const after = M.rankOf(xpTotal());
    drawStep(true);
    toast(after.idx > before.idx ? `Thăng cấp: ${after.name}` : `Điểm: ${sc.total}/100`);
  }
  async function replay() {
    const key = G.cur.key;
    const ok = await confirmDialog({ title: "Chơi lại nhiệm vụ?", message: "Bảng bằng chứng, workpapers và câu trả lời được xoá. Điểm cao nhất vẫn giữ.", confirmText: "Chơi lại" });
    if (!ok || !G.cur || G.cur.key !== key) return;
    prog().runs[key] = freshRun(); G.cur.st = prog().runs[key];
    save(); drawStep(true);
  }

  // ---------- 7. Result ----------
  function resultHtml() {
    const { cs, st, e, key } = G.cur, ds = e.ds, sc = M.score(cs, st), best = prog().best[key], ref = cs.reference, mine = sc.mineStatuses;
    const nextArch = M.ARCHETYPE_IDS.find(a => a !== cs.archId && M.unlocked(a, prog().best) && !prog().best[M.caseKey(ds.id, a)]);
    const n1 = x => M.num(x, x % 1 ? 1 : 0);
    const tone = r => r >= 0.75 ? "success" : r >= 0.5 ? "accent" : "danger";
    return `<div class="fw-result">
      <section class="card fw-score-card">
        <div class="fw-score"><span class="fw-score-n">${sc.total}</span><span class="fw-score-of">/100</span></div>
        <div class="fw-score-txt"><div class="fw-grade">${sc.grade}</div><p class="text-2 small">Cao nhất của nhiệm vụ: ${best ? best.score : sc.total} · Tổng XP: ${xpTotal()} · ${M.rankOf(xpTotal()).name}</p></div>
      </section>
      <section class="card section"><div class="card-head"><h2>Điểm theo tiêu chí</h2></div>
        <div class="fw-parts">${sc.parts.map(p => `<div class="fw-part"><div class="row-between"><div><strong>${p.name}</strong> <span class="text-3 small">${p.vi}</span></div><span class="mono">${n1(p.score)}/${p.max}</span></div>${progressBar(p.score / p.max * 100, tone(p.score / p.max))}
          <ul class="fw-part-items">${p.items.map(i => `<li><span>${i.label}</span><span class="mono">${n1(i.score)}/${n1(i.max)}</span><small class="text-3">${esc(i.note)}</small></li>`).join("")}</ul></div>`).join("")}</div></section>
      <section class="card section"><div class="card-head"><div><h2>Góc nhìn tham chiếu</h2><p class="text-2 small">Kết luận của bộ quy tắc trong game, rút ra từ chính dữ liệu này. Không phải khuyến nghị đầu tư.</p></div></div>
        <div class="fw-ref-dec"><div><div class="stat-label">Tham chiếu</div><strong>${M.DECISIONS[ref.decision].en}</strong> <span class="text-2">· tự tin ${M.CONFIDENCE[ref.confidence].toLowerCase()}</span></div>
          <div><div class="stat-label">Của bạn</div><strong>${st.decision ? M.DECISIONS[st.decision].en : "—"}</strong> <span class="text-2">· tự tin ${st.confidence ? M.CONFIDENCE[st.confidence].toLowerCase() : "—"}</span></div></div>
        <ul class="fw-ref-hyps">${cs.hyps.map(h => {
          const top = h.refs.filter(r => r.t === "for" || r.t === "against").sort((a, b) => b.s - a.s).slice(0, 3);
          return `<li><div class="fw-ref-h"><span class="fw-hid">${h.id}</span><span>${esc(h.title)}</span></div>
            <div class="fw-ref-st"><span class="text-3 small">Tham chiếu</span>${statusChip(h.refStatus)}<span class="text-3 small">Bạn</span>${statusChip(mine[h.id])}</div>
            <ul class="fw-why">${top.length ? top.map(r => `<li class="${r.t}"><span class="fw-why-t">${r.t === "for" ? "Ủng hộ" : "Ngược"}</span><span><strong>${cardTitle(cs, r.card)}:</strong> ${esc(r.why)}</span></li>`).join("") : `<li class="neutral"><span>Không có bằng chứng quyết định cho giả thuyết này.</span></li>`}</ul></li>`;
        }).join("")}</ul>
      </section>
      ${sc.missed.length || sc.invalid.length ? `<section class="card section"><div class="card-head"><h2>Học từ lượt này</h2></div>
        ${sc.missed.length ? `<div class="stat-label">Bằng chứng then chốt bạn bỏ sót</div><ul class="fw-learn">${sc.missed.slice(0, 8).map(m => `<li><span class="fw-hid">${m.h}</span><span><strong>${cardTitle(cs, m.card)}</strong> (${m.t === "for" ? "ủng hộ" : "đi ngược"} giả thuyết): ${esc(m.why)}</span></li>`).join("")}</ul>` : ""}
        ${sc.invalid.length ? `<div class="stat-label">Liên kết chưa khớp dữ liệu</div><ul class="fw-learn">${sc.invalid.slice(0, 8).map(l => `<li><span class="fw-hid">${l.h}</span><span><strong>${cardTitle(cs, l.c)}</strong> · bạn chọn “${M.RELATIONS[l.r].vi}”: ${esc(l.why)}</span></li>`).join("")}</ul>` : ""}
      </section>` : ""}
      <section class="card section fw-epi">${ds.class === "SIMULATED" && ds.story && ds.story.epilogue
        ? `<div class="kicker">Kịch bản mô phỏng ${chip("SIMULATED")}</div><p>${esc(ds.story.epilogue)}</p>`
        : `<div class="kicker">Dữ liệu thật ${chip("REAL")}</div><p>Game không dự đoán tương lai của doanh nghiệp thật. Hãy đối chiếu kết luận với báo cáo của các năm sau khi có. Hồ sơ chỉ gồm ba báo cáo tài chính, không có thuyết minh, giá cổ phiếu hay định giá: đây là bài luyện phân tích, không phải khuyến nghị đầu tư. Nguồn số liệu: ${esc(ds.source.attribution || ds.source.provider)}.</p>`}</section>
      <div class="fw-next fw-result-actions"><button class="btn btn-secondary" data-replay>Chơi lại</button><a class="btn btn-ghost" href="#/game">Về HQ</a>${nextArch ? `<a class="btn btn-primary" href="#/game/m/${esc(ds.id)}/${nextArch}">${M.ARCHETYPES[nextArch].code} · ${M.ARCHETYPES[nextArch].title} ${icon("next", 16)}</a>` : ""}</div>
    </div>`;
  }

  // ================= entry =================
  // "Delete all data" and deleting an account also remove the company files kept on this device
  window.fwClearProfile = function (pid) {
    try { localStorage.removeItem(`cfaStudy_fw_${pid}`); } catch (e) { /* ignore */ }
    G.lib = null; G.all = null; G.cases = {};
  };
  window.renderGame = function (sub, a, b) {
    if (!E || !M || !SAMPLE) { G.cur = null; view.innerHTML = emptyState("alert", "Không tải được game", "Thiếu tệp của game. Tải lại trang.", ""); return; }
    if (sub === "m") renderMission(a, b);
    else { G.cur = null; renderHQ(); }
  };
})();

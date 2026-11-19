// ============================================================
// tutor.js — "CFA Tutor": a private chatbot powered by Google Gemini
//
// Each account pastes its own Gemini API key (Google AI Studio). The key and
// the chat stay in this browser only; messages go straight from the browser
// to Google's Gemini API. Nothing is stored on GitHub.
// ============================================================

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const TUTOR_CFG = () => `cfaStudy_tutor_${PROFILES.active}`;      // { key, model, models }
const TUTOR_LOG = () => `cfaStudy_tutorlog_${PROFILES.active}`;   // [{ role, text, ctx }]
const TUTOR_MAX_LOG = 40, TUTOR_SEND = 16;
let TUTOR = { open: false, view: "chat", busy: false, abort: null, msgs: null, ctx: null, profile: null, note: "" };

function tutorCfg() { try { return JSON.parse(localStorage.getItem(TUTOR_CFG()) || "{}"); } catch (e) { return {}; } }
function tutorSaveCfg(c) { try { localStorage.setItem(TUTOR_CFG(), JSON.stringify(c)); } catch (e) { /* ignore */ } }
function tutorMsgs() {
  if (TUTOR.msgs && TUTOR.profile === PROFILES.active) return TUTOR.msgs;
  TUTOR.profile = PROFILES.active;
  try { TUTOR.msgs = JSON.parse(localStorage.getItem(TUTOR_LOG()) || "[]"); } catch (e) { TUTOR.msgs = []; }
  return TUTOR.msgs;
}
function tutorSaveMsgs() {
  const m = tutorMsgs();
  if (m.length > TUTOR_MAX_LOG) m.splice(0, m.length - TUTOR_MAX_LOG);
  try { localStorage.setItem(TUTOR_LOG(), JSON.stringify(m)); } catch (e) { /* ignore */ }
}

// ---------- Gemini API ----------
function tutorErr(status, j) {
  const e = new Error((j && j.error && j.error.message) || `HTTP ${status}`);
  e.status = status; e.reason = (j && j.error && j.error.status) || "";
  return e;
}
function tutorErrText(e, setup) {
  if (!e.status) return "Could not reach Google. Check your connection and try again.";
  if (e.status === 400 && /api key/i.test(e.message)) return setup ? "Google says this key is not valid. Copy it again from AI Studio and paste the whole key." : "Google says this API key is not valid. Open Settings and paste the key again.";
  if (e.status === 401 || e.status === 403) return "This key is not allowed to use the Gemini API. Check it in Google AI Studio, or create a new key.";
  if (e.status === 429) return "The free limit for this model is used up for now. Wait a minute (or until tomorrow), or pick another model in Settings (⚙).";
  if (e.status === 404) return "This model is not available to your key. Pick another model in Settings (⚙).";
  if (e.status >= 500) return "Google's servers are busy. Try again in a moment.";
  return `Google returned an error: ${e.message}`;
}
// Models this key may use for chat, best first: Flash (generous free tier), then Pro, then Flash-Lite; newest first
function tutorRank(id) {
  const v = parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  const tier = /flash-lite/.test(id) ? 1 : /flash/.test(id) ? 3 : /pro/.test(id) ? 2 : 0;
  return tier * 1000 + v * 10 - (/preview|exp/.test(id) ? 5 : 0) - (/latest/.test(id) ? 1 : 0);
}
async function tutorListModels(key) {
  let r;
  try { r = await fetch(`${GEMINI_API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } }); }
  catch (e) { throw tutorErr(0, null); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw tutorErr(r.status, j);
  return (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => ({ id: String(m.name || "").replace(/^models\//, ""), name: m.displayName || m.name }))
    .filter(m => /^gemini-/.test(m.id) && /(flash|pro)/.test(m.id) && !/(image|tts|audio|live|embed|vision|robotics|computer|native|thinking-exp)/i.test(m.id))
    .sort((a, b) => tutorRank(b.id) - tutorRank(a.id));
}

function tutorSystem() {
  const c = countdownInfo();
  const weak = TOPICS.map(t => ({ t, s: typeof qbTopicStats === "function" ? qbTopicStats(t.id) : { done: 0 } }))
    .filter(x => x.s.done >= 5).sort((a, b) => a.s.pct - b.s.pct).slice(0, 3)
    .map(x => `${x.t.name} (${x.s.pct}% right of ${x.s.done})`);
  return [
    `You are "CFA Tutor", a private tutor inside a personal study site for the CFA Level I exam (2027 curriculum). The student's name is ${activeProfile().name}.`,
    `Today is ${todayStr()}. The exam is on ${DATA.settings.examDate} (${c.daysLeft} days left); the student is in week ${Math.max(c.week, 0)} of a 25-week plan (${c.phase}).`,
    weak.length ? `Weakest topics so far in the question bank: ${weak.join("; ")}.` : "",
    "How to answer:",
    "- Reply in Vietnamese by default; if the student writes in English, reply in English. Keep CFA terms in English (duration, free cash flow to equity, etc.), with a short Vietnamese gloss the first time when it helps.",
    "- Be accurate to the CFA Institute Level I curriculum. If you are not sure, say so. Never invent rules, standards, formulas or numbers.",
    "- Start with the key idea in one or two sentences, then the steps. For calculations show the formula, the numbers plugged in and the result; add BA II Plus keystrokes when they help.",
    "- When the student asks about a question: say why the correct answer is right, why each other choice is wrong, and the exam trap. If the source gives no answer key, work it out and say that you did.",
    "- Write formulas in plain text or Unicode (PV = FV / (1 + r)^n, σ², √n). Never use LaTeX or $…$.",
    "- Use short paragraphs, bullet lists and small Markdown tables when useful. Be concise; Level I questions have three choices (A, B, C).",
    "- If asked for practice questions, write original ones in the CFA style with answers and short explanations at the end."
  ].filter(Boolean).join("\n");
}

// The conversation for Gemini: failed exchanges and the empty reply being written are left out
function tutorContents() {
  const msgs = tutorMsgs(), out = [];
  msgs.forEach((m, i) => {
    if (m.role === "user") { if (!(msgs[i + 1] && msgs[i + 1].error)) out.push(m); }
    else if (m.text && !m.error) out.push(m);
  });
  let list = out.slice(-TUTOR_SEND);
  while (list.length && list[0].role !== "user") list = list.slice(1);
  return list.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.role === "user" && m.ctx ? `Here is the question I am asking about:\n${m.ctx.text}\n\n${m.text}` : m.text }]
  }));
}

async function tutorStream(key, model, contents, onText, signal) {
  const body = { systemInstruction: { parts: [{ text: tutorSystem() }] }, contents, generationConfig: { temperature: 0.4 } };
  let r;
  try {
    r = await fetch(`${GEMINI_API}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal });
  } catch (e) { if (e.name === "AbortError") throw e; throw tutorErr(0, null); }
  if (!r.ok) throw tutorErr(r.status, await r.json().catch(() => ({})));
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", text = "", finish = "";
  const take = line => {
    line = line.trim();
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let j;
    try { j = JSON.parse(data); } catch (e) { return; }
    if (j.error) throw tutorErr(j.error.code || 500, j);
    const c = (j.candidates || [])[0];
    if (c) {
      ((c.content && c.content.parts) || []).forEach(p => { if (p.text && !p.thought) text += p.text; });
      if (c.finishReason) finish = c.finishReason;
    }
    if (j.promptFeedback && j.promptFeedback.blockReason) finish = "BLOCKED";
    onText(text);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) { take(buf.slice(0, i)); buf = buf.slice(i + 1); }
  }
  if (buf) take(buf);
  return { text, finish };
}

// ---------- Sending ----------
async function tutorSend(text, ctx) {
  const cfg = tutorCfg();
  text = String(text || "").trim();
  if (!text || TUTOR.busy) return;
  if (!cfg.key) { TUTOR.view = "setup"; tutorRender(); return; }
  const msgs = tutorMsgs();
  msgs.push({ role: "user", text, ctx: ctx || null });
  const reply = { role: "model", text: "", model: "" };
  msgs.push(reply);
  TUTOR.ctx = null; TUTOR.busy = true; TUTOR.note = "";
  TUTOR.abort = new AbortController();
  tutorRender();
  const contents = tutorContents();
  // the chosen model first, then the next best ones if it is over its limit or missing
  // a model that just ran out of free requests is skipped for 10 minutes
  const now = Date.now(), cool = TUTOR.cool || (TUTOR.cool = {});
  let tryList = [cfg.model, ...(cfg.models || []).map(m => m.id)].filter((x, i, a) => x && a.indexOf(x) === i);
  if (tryList.some(m => !(cool[m] > now))) tryList = tryList.filter(m => !(cool[m] > now));
  tryList = tryList.slice(0, 3);
  if (!tryList.length) tryList.push("gemini-2.5-flash");
  let lastErr = null;
  for (const model of tryList) {
    try {
      reply.model = model;
      const out = await tutorStream(cfg.key, model, contents, t => { reply.text = t; tutorPaintLast(); }, TUTOR.abort.signal);
      reply.text = out.text;
      if (!out.text) { reply.error = true; reply.text = out.finish === "BLOCKED" || out.finish === "SAFETY" ? "Google blocked this answer. Try asking in a different way." : "No answer came back. Try again."; }
      else if (out.finish === "MAX_TOKENS") reply.text += "\n\n*(The answer was cut off — ask “tiếp tục” to continue.)*";
      if (model !== cfg.model) TUTOR.note = `Answered with ${model} because ${cfg.model} was not available.`;
      lastErr = null;
      break;
    } catch (e) {
      if (e.name === "AbortError") { lastErr = null; if (!reply.text) reply.text = "*(Stopped.)*"; break; }
      lastErr = e;
      if (e.status === 429) cool[model] = Date.now() + 10 * 60 * 1000;
      if (!(e.status === 429 || e.status === 404 || e.status >= 500) || reply.text) break;
    }
  }
  if (lastErr) { reply.error = true; reply.text = tutorErrText(lastErr); }
  TUTOR.busy = false; TUTOR.abort = null;
  tutorSaveMsgs();
  tutorRender();
}

// Ask about the question on screen (Practice, Question Bank, mock review)
const TUTOR_CTX = new Map();
let TUTOR_N = 0;
function tutorCtxId(o) {
  const id = "t" + (++TUTOR_N);
  TUTOR_CTX.set(id, o);
  if (TUTOR_CTX.size > 300) TUTOR_CTX.delete(TUTOR_CTX.keys().next().value);
  return id;
}
function tutorQuestionText(o) {
  const ch = o.choices || {};
  const clip = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
  return [
    o.topic && `Topic: ${o.topic}`,
    o.where && `Source: ${o.where}`,
    `Question: ${clip(o.stem, 4000)}`,
    o.exhibit && `Exhibit:\n${clip(o.exhibit, 2000)}`,
    ...["A", "B", "C"].filter(L => ch[L]).map(L => `${L}. ${clip(ch[L], 600)}`),
    o.answer ? `Correct answer (from the source): ${o.answer}` : "Correct answer: not given in the source",
    o.picked && `I chose: ${o.picked}`,
    o.expl && `Explanation from the source: ${clip(o.expl, 5000)}`
  ].filter(Boolean).join("\n");
}
// A button that opens the tutor with this question attached
function tutorButtonHtml(o) {
  return `<button class="btn btn-secondary btn-sm tutor-ask" data-tutor-ask="${tutorCtxId(o)}">${icon("chat", 16)} Ask the tutor</button>`;
}
function tutorAskFor(q, picked) {           // q from the Practice / mock engine
  if (q.qb) {
    const s = q.src || {};
    return tutorButtonHtml({ label: `${q.topic} · ${q.setTitle} · Q${q.n}`, topic: (topicById(q.topic) || {}).name, where: `${q.setTitle}, question ${q.n}`,
      stem: s.q || q.question, choices: q.choices, answer: q.answer, picked, expl: [s.expl, s.remember && `Things to remember: ${s.remember}`].filter(Boolean).join("\n\n") });
  }
  const x = q.exhibit;
  const ex = x ? [x.title, x.subtitle, x.head && x.head.join(" | "), ...(x.rows || []).map(r => r.join(" | ")), x.note].filter(Boolean).join("\n") : "";
  return tutorButtonHtml({ label: `${q.topic} · ${q.id}`, topic: (topicById(q.topic) || {}).name, where: q.los || "", stem: q.question, exhibit: ex,
    choices: q.choices, answer: q.answer, picked, expl: [q.explanation, q.whyNot && `Why not the others: ${q.whyNot}`, q.trap && `Exam trap: ${q.trap}`, q.calc && `BA II Plus: ${q.calc}`].filter(Boolean).join("\n\n") });
}
function tutorAsk(id) {
  const o = TUTOR_CTX.get(id);
  if (!o) return;
  TUTOR.ctx = { label: o.label, text: tutorQuestionText(o) };
  tutorOpen();
  if (tutorCfg().key && !TUTOR.busy) {
    const ask = o.picked && o.answer && o.picked !== o.answer
      ? `Mình chọn ${o.picked} nhưng đáp án là ${o.answer}. Giải thích giúp mình vì sao ${o.answer} đúng, vì sao ${o.picked} sai, và bẫy của câu này.`
      : "Giải thích giúp mình câu này: vì sao đáp án đúng, vì sao các lựa chọn khác sai, và bẫy của câu này.";
    tutorSend(ask, TUTOR.ctx);
  }
}

// ---------- Markdown (safe: everything is escaped first) ----------
function tutorInline(s) {
  return s.replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
}
function tutorMd(src) {
  const lines = esc(src).split("\n");
  let html = "", list = null, para = [], i = 0;
  const flushP = () => { if (para.length) { html += `<p>${tutorInline(para.join("<br>"))}</p>`; para = []; } };
  const flushL = () => { if (list) { html += `</${list}>`; list = null; } };
  while (i < lines.length) {
    const raw = lines[i], line = raw.trim();
    if (line.startsWith("```")) {                                   // code block
      flushP(); flushL();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      html += `<pre><code>${code.join("\n")}</code></pre>`;
      i++; continue;
    }
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {   // table
      flushP(); flushL();
      const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => tutorInline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(cells(lines[i++]));
      html += `<div class="tt-table-wrap"><table class="tt-table"><thead><tr>${head.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); html += `<h4>${tutorInline(m[2])}</h4>`; i++; continue; }
    if ((m = raw.match(/^\s*[-*•]\s+(.*)$/))) {
      flushP(); if (list !== "ul") { flushL(); html += "<ul>"; list = "ul"; }
      html += `<li>${tutorInline(m[1])}</li>`; i++; continue;
    }
    if ((m = raw.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flushP(); if (list !== "ol") { flushL(); html += `<ol start="${m[1]}">`; list = "ol"; }
      html += `<li>${tutorInline(m[2])}</li>`; i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flushP(); flushL(); html += "<hr>"; i++; continue; }
    if (!line) { flushP(); flushL(); i++; continue; }
    flushL(); para.push(line); i++;
  }
  flushP(); flushL();
  return html;
}

// ---------- Panel ----------
const TUTOR_SUGGEST = [
  "Giải thích duration và convexity thật dễ hiểu",
  "So sánh IFRS và US GAAP về hàng tồn kho",
  "Cho mình 3 câu hỏi ôn Standard III (Duties to Clients)",
  "Cách tính NPV và IRR trên BA II Plus"
];
function tutorMount() {
  if (document.getElementById("tutor-fab")) return;
  const fab = document.createElement("button");
  fab.id = "tutor-fab"; fab.className = "tutor-fab"; fab.type = "button";
  fab.setAttribute("aria-label", "Open CFA Tutor"); fab.title = "CFA Tutor";
  fab.innerHTML = icon("chat", 24);
  fab.onclick = () => tutorOpen();
  const panel = document.createElement("aside");
  panel.id = "tutor"; panel.className = "tutor"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "CFA Tutor");
  document.body.append(fab, panel);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-tutor-ask]");
    if (b) { e.preventDefault(); tutorAsk(b.dataset.tutorAsk); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && TUTOR.open && !document.querySelector(".modal-overlay")) tutorClose(); });
}
function tutorOpen() {
  tutorMount();
  TUTOR.open = true;
  if (!tutorCfg().key) TUTOR.view = "setup";
  else if (TUTOR.view === "setup") TUTOR.view = "chat";
  document.body.classList.add("tutor-open");
  tutorRender();
  const box = document.getElementById("tt-input") || document.getElementById("tt-key");
  if (box) box.focus();
}
function tutorClose() {
  TUTOR.open = false;
  document.body.classList.remove("tutor-open");
  const p = document.getElementById("tutor");
  if (p) p.hidden = true;
  const fab = document.getElementById("tutor-fab");
  if (fab) fab.focus();
}
// Called on every page change: the tutor is off while a timed mock is running
function tutorRoute() {
  tutorMount();
  const [route, a] = currentRoute();
  const hide = document.body.classList.contains("gated") || (route === "mock" && a === "run");
  document.body.classList.toggle("tutor-off", hide);
  if (hide && TUTOR.open) tutorClose();
  if (TUTOR.profile && TUTOR.profile !== PROFILES.active) { TUTOR.msgs = null; TUTOR.ctx = null; if (TUTOR.open) tutorRender(); }
}

function tutorMsgHtml(m, i) {
  if (m.role === "user") return `<div class="tt-msg tt-user">${m.ctx ? `<div class="tt-ctx-tag">${icon("flag", 12)} ${esc(m.ctx.label)}</div>` : ""}<div class="tt-bubble">${esc(m.text).replace(/\n/g, "<br>")}</div></div>`;
  const typing = TUTOR.busy && i === tutorMsgs().length - 1 && !m.text;
  return `<div class="tt-msg tt-bot${m.error ? " tt-error" : ""}" data-i="${i}"><div class="tt-bubble">${typing ? `<span class="tt-typing"><i></i><i></i><i></i></span>` : tutorMd(m.text)}</div></div>`;
}
function tutorHeadHtml(sub) {
  const cfg = tutorCfg();
  return `<header class="tt-head">
    <div class="tt-title"><span class="tt-mark">${icon("chat", 18)}</span><div><strong>CFA Tutor</strong><span>${sub || (cfg.model ? esc(cfg.model) : "Gemini")}</span></div></div>
    <div class="tt-tools">
      ${TUTOR.view === "chat" && cfg.key ? `<button class="icon-btn" data-tt="new" title="New chat" aria-label="New chat">${icon("plus", 18)}</button>` : ""}
      ${cfg.key ? `<button class="icon-btn" data-tt="${TUTOR.view === "settings" ? "chat" : "settings"}" title="Settings" aria-label="Settings">${icon(TUTOR.view === "settings" ? "back" : "settings", 18)}</button>` : ""}
      <button class="icon-btn" data-tt="close" title="Close" aria-label="Close">${icon("x", 18)}</button>
    </div>
  </header>`;
}
function tutorRender() {
  if (!TUTOR.open) return;
  const p = document.getElementById("tutor");
  if (!p) return;
  p.hidden = false;
  const cfg = tutorCfg();
  if (TUTOR.view === "setup" || !cfg.key) {
    p.innerHTML = `${tutorHeadHtml("Set up · one time")}
      <div class="tt-body tt-setup">
        <p class="tt-lead">Your own tutor for CFA Level I, powered by Google Gemini. It explains concepts, works through calculations and talks through any question you are stuck on.</p>
        <ol class="tt-steps">
          <li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> and sign in with your Google account.</li>
          <li>Press <strong>Create API key</strong>, then copy the key.</li>
          <li>Paste it here.</li>
        </ol>
        <label class="field"><span class="field-label">Gemini API key</span>
          <input class="input mono" id="tt-key" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…"></label>
        <div class="field-error" id="tt-key-err" hidden></div>
        <button class="btn btn-primary btn-block" id="tt-key-save">Save and start</button>
        <p class="text-3 small">The key is saved only in this browser, for this account. Messages go from your browser straight to Google; the free tier has a daily limit.</p>
      </div>`;
    tutorBind(p);
    return;
  }
  if (TUTOR.view === "settings") {
    const models = cfg.models || [];
    p.innerHTML = `${tutorHeadHtml("Settings")}
      <div class="tt-body tt-setup">
        <label class="field"><span class="field-label">Model</span>
          <select class="select" id="tt-model">${(models.length ? models : [{ id: cfg.model, name: cfg.model }]).map(m => `<option value="${esc(m.id)}" ${m.id === cfg.model ? "selected" : ""}>${esc(m.name)} · ${esc(m.id)}</option>`).join("")}</select></label>
        <p class="text-3 small">Flash is fast and has the largest free allowance. Pro thinks harder but its free allowance is small; if it runs out, the tutor falls back to the next model.</p>
        <div class="row-gap">
          <button class="btn btn-secondary btn-sm" id="tt-refresh">${icon("pulse", 16)} Refresh model list</button>
          <button class="btn btn-soft-danger btn-sm" id="tt-forget">${icon("trash", 16)} Remove key from this browser</button>
        </div>
        <p class="text-3 small">Key: <span class="mono">…${esc((cfg.key || "").slice(-4))}</span> · manage your keys at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a></p>
      </div>`;
    tutorBind(p);
    return;
  }
  const msgs = tutorMsgs();
  p.innerHTML = `${tutorHeadHtml()}
    <div class="tt-body" id="tt-log" aria-live="polite">
      ${msgs.length ? msgs.map(tutorMsgHtml).join("") : `
        <div class="tt-hello">
          <div class="tt-hello-mark">${icon("chat", 26)}</div>
          <h3>Chào ${esc(callName())}, mình là CFA Tutor</h3>
          <p>Hỏi mình bất cứ điều gì về CFA Level I — khái niệm, công thức, cách bấm máy, hay một câu hỏi bạn đang làm.</p>
          <div class="tt-suggest">${TUTOR_SUGGEST.map(s => `<button class="tt-chip" data-tt-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        </div>`}
      ${TUTOR.note ? `<p class="tt-note">${esc(TUTOR.note)}</p>` : ""}
    </div>
    <div class="tt-compose">
      ${TUTOR.ctx ? `<div class="tt-ctx">${icon("flag", 14)}<span>Question attached: ${esc(TUTOR.ctx.label)}</span><button class="icon-btn" data-tt="unctx" aria-label="Remove attached question">${icon("x", 14)}</button></div>` : ""}
      <div class="tt-row">
        <textarea id="tt-input" class="input" rows="1" placeholder="Hỏi về CFA… (Enter để gửi)" ${TUTOR.busy ? "disabled" : ""}></textarea>
        ${TUTOR.busy ? `<button class="btn btn-secondary tt-send" data-tt="stop" aria-label="Stop">${icon("stop", 18)}</button>`
          : `<button class="btn btn-primary tt-send" data-tt="send" aria-label="Send">${icon("send", 18)}</button>`}
      </div>
    </div>`;
  tutorBind(p);
  const log = document.getElementById("tt-log");
  if (log) log.scrollTop = log.scrollHeight;
  const ta = document.getElementById("tt-input");
  if (ta && !TUTOR.busy) ta.focus({ preventScroll: true });
}
let tutorPaintQueued = false;
function tutorPaintLast() {
  if (tutorPaintQueued) return;
  tutorPaintQueued = true;
  requestAnimationFrame(() => {
    tutorPaintQueued = false;
    const msgs = tutorMsgs(), i = msgs.length - 1;
    const el = document.querySelector(`#tt-log .tt-msg[data-i="${i}"] .tt-bubble`);
    if (!el) return tutorRender();
    const log = document.getElementById("tt-log");
    const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    el.innerHTML = tutorMd(msgs[i].text);
    if (stick) log.scrollTop = log.scrollHeight;
  });
}
function tutorBind(p) {
  p.querySelectorAll("[data-tt]").forEach(b => b.onclick = async () => {
    const act = b.dataset.tt;
    if (act === "close") tutorClose();
    else if (act === "settings" || act === "chat") { TUTOR.view = act; tutorRender(); }
    else if (act === "unctx") { TUTOR.ctx = null; tutorRender(); }
    else if (act === "stop") { if (TUTOR.abort) TUTOR.abort.abort(); }
    else if (act === "send") { const ta = document.getElementById("tt-input"); if (ta) tutorSend(ta.value, TUTOR.ctx); }
    else if (act === "new") {
      if (!tutorMsgs().length) return;
      if (!await confirmDialog({ title: "Start a new chat?", message: "This conversation will be cleared from this browser.", confirmText: "New chat" })) return;
      TUTOR.msgs = []; TUTOR.note = ""; tutorSaveMsgs(); tutorRender();
    }
  });
  p.querySelectorAll("[data-tt-suggest]").forEach(b => b.onclick = () => tutorSend(b.dataset.ttSuggest, TUTOR.ctx));
  const ta = document.getElementById("tt-input");
  if (ta) {
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; };
    ta.oninput = grow;
    ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); tutorSend(ta.value, TUTOR.ctx); } };
  }
  const save = document.getElementById("tt-key-save");
  if (save) save.onclick = async () => {
    const inp = document.getElementById("tt-key"), err = document.getElementById("tt-key-err");
    const key = inp.value.trim().replace(/\s+/g, "");
    const fail = m => { err.textContent = m; err.hidden = false; inp.classList.add("invalid"); save.disabled = false; save.textContent = "Save and start"; };
    if (key.length < 20) return fail("Paste the whole key (it usually starts with AIza).");
    save.disabled = true; save.textContent = "Checking the key…";
    try {
      const models = await tutorListModels(key);
      if (!models.length) return fail("This key works, but no chat models are available to it.");
      tutorSaveCfg({ key, model: models[0].id, models });
      TUTOR.view = "chat"; toast("CFA Tutor is ready");
      tutorRender();
      if (TUTOR.ctx && !TUTOR.busy) tutorSend("Giải thích giúp mình câu này: vì sao đáp án đúng, vì sao các lựa chọn khác sai, và bẫy của câu này.", TUTOR.ctx);
    } catch (e) { fail(tutorErrText(e, true)); }
  };
  const keyIn = document.getElementById("tt-key");
  if (keyIn) keyIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); save.click(); } };
  const sel = document.getElementById("tt-model");
  if (sel) sel.onchange = () => { const c = tutorCfg(); c.model = sel.value; tutorSaveCfg(c); TUTOR.note = ""; toast(`Model: ${sel.value}`); };
  const ref = document.getElementById("tt-refresh");
  if (ref) ref.onclick = async () => {
    const c = tutorCfg();
    try { c.models = await tutorListModels(c.key); if (!c.models.some(m => m.id === c.model) && c.models.length) c.model = c.models[0].id; tutorSaveCfg(c); toast(`${c.models.length} models available`); tutorRender(); }
    catch (e) { toast(tutorErrText(e), "error"); }
  };
  const fg = document.getElementById("tt-forget");
  if (fg) fg.onclick = async () => {
    if (!await confirmDialog({ title: "Remove the Gemini key?", message: "The tutor stops working in this browser until a key is pasted again. Your chat stays.", confirmText: "Remove", danger: true })) return;
    try { localStorage.removeItem(TUTOR_CFG()); } catch (e) { /* ignore */ }
    TUTOR.view = "setup"; tutorRender();
  };
}

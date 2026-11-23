// ============================================================
// fe/ui.js — Financial English flashcards, inside the Flashcards page.
//   #/cards                        your own Leitner cards (flashcards.js) — a tab leads here
//   #/cards/english                12 topics: flashcards, known, to review, progress, Start Learning, Quiz
//   #/cards/english/<topic>        study: 3D flip card; I Know / Study Again / Next Card; Previous, Next, Flip, Shuffle;
//                                  Review Mistakes; Restart Deck; multiple-choice cards answered with Submit
//   #/cards/english/<topic>/quiz   10 questions A–D, score, explanations in English and Vietnamese, results
// The decks (js/fe/data/<topic>.js) load on first use. Progress is saved in the account (DATA.fe), checked and
// repaired by FinEng (js/fe/engine.js) before use.
// ============================================================
(function () {
  "use strict";
  const FE = window.FinEng;
  const UI = { loading: null, failed: {}, checked: null, notice: "", flipped: false, pick: null, picked: {}, cardKey: null, qPick: null };
  const LETTERS = FE.LETTERS;
  const LV = { Beginner: "b", Intermediate: "i", Advanced: "a" };
  const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const two = i => String(i + 1).padStart(2, "0");
  const SVG = {
    flip: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/>',
    shuffle: '<path d="M3 6h3.5c2.2 0 3.4 1 4.6 3l1.8 3c1.2 2 2.4 3 4.6 3H21"/><path d="M18 12l3 3-3 3"/><path d="M3 18h3.5c1.4 0 2.4-.4 3.2-1.2"/><path d="M14.3 7.2C15 6.4 16 6 17.5 6H21"/><path d="M18 3l3 3-3 3"/>',
    restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    again: '<path d="M20 11a8 8 0 0 0-14.5-4.6L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.6L21 15"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    quiz: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
  };
  const svg = (n, s) => `<svg class="fe-ico" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[n]}</svg>`;

  // ---------- decks: loaded on first use ----------
  function load(only) {
    if (UI.loading) return UI.loading;
    const ver = typeof APP_VERSION === "string" ? APP_VERSION : "dev";
    const want = FE.TOPICS.filter(t => !FE.deck(t.id) && (!only || t.id === only));
    UI.loading = Promise.all(want.map(t => new Promise(resolve => {
      delete UI.failed[t.id];
      const s = document.createElement("script");
      s.src = `js/fe/data/${t.id}.js?v=${encodeURIComponent(ver)}`;
      s.onload = () => { if (!FE.deck(t.id)) UI.failed[t.id] = "The data file loaded but did not contain a deck."; resolve(); };
      s.onerror = () => { UI.failed[t.id] = "The data file could not be loaded. Check your connection and try again."; s.remove(); resolve(); };
      document.head.appendChild(s);
    }))).then(() => { UI.loading = null; });
    return UI.loading;
  }
  const allSettled = () => FE.TOPICS.every(t => FE.deck(t.id) || UI.failed[t.id]);
  const usable = id => { const d = FE.deck(id); return d && d.cards.length ? d : null; };
  function retry(id) { FE.forget(id); delete UI.failed[id]; const h = location.hash; load(id).then(() => { if (location.hash === h) router(); }); }

  // ---------- progress saved in the account ----------
  function S() {
    if (UI.checked !== DATA || !DATA.fe) {
      const r = FE.repairState(DATA.fe);
      DATA.fe = r.state; UI.checked = DATA;
      if (r.repaired) UI.notice = "Part of your saved Financial English progress was damaged and has been reset. Everything that could be read was kept.";
      saveData();
    }
    return DATA.fe;
  }
  const save = () => saveData();

  // ---------- shared pieces ----------
  window.flashTabs = function (active) {
    const tab = (k, href, ic, label) => `<a href="${href}" class="${active === k ? "active" : ""}" ${active === k ? 'aria-current="page"' : ""}>${ic}<span>${label}</span></a>`;
    return `<nav class="fe-tabs" aria-label="Flashcards">${tab("mine", "#/cards", icon("cards", 16), "My cards")}${tab("english", "#/cards/english", icon("globe", 16), "Financial English")}</nav>`;
  };
  function quietRender(html) {   // in-page updates: no page-enter animation
    const m = document.getElementById("main"); if (m) m.classList.remove("enter");
    view.innerHTML = html;
  }
  const lowerFirst = t => (/^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
  const askVocab = (c) => (c.topic === "acad" ? `What does “${c.term}” mean?` : `What does ${lowerFirst(c.term)} mean in finance?`);
  const isTyping = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const onControl = e => { const t = e.target; return t && /^(BUTTON|A)$/.test(t.tagName); };
  function topicNo(id) { return FE.TOPICS.findIndex(t => t.id === id); }

  // ---------- route ----------
  window.renderFinEnglish = function (topicId, sub) {
    document.body.classList.add("fe-page");
    window.onkeydown = null;
    if (!allSettled()) {
      view.innerHTML = `${hero()}<div class="fe"><div class="fe-loading" role="status"><span class="fe-spinner" aria-hidden="true"></span>Loading 12 decks…</div></div>`;
      const h = location.hash;
      load().then(() => { if (location.hash === h) router(); });
      return;
    }
    S();
    if (!topicId) return topics();
    const topic = FE.topicById(topicId);
    if (!topic) return notFound();
    if (!usable(topicId)) return broken(topic);
    if (sub === "quiz") return quiz(topic);
    if (sub) { location.replace(`#/cards/english/${topicId}`); return; }
    study(topic);
  };

  function hero() {
    return `<header class="fe-head"><div class="fe-head-text"><span class="fe-kicker">Flashcards</span><h1>Financial English</h1>
      <p>English for finance and CFA Level I: flip the card, check yourself, then take the quiz.</p></div></header>${flashTabs("english")}`;
  }

  // ======================= topics =======================
  function topics() {
    const st = S();
    let total = 0, known = 0, review = 0;
    const tiles = FE.TOPICS.map((t, i) => {
      const d = usable(t.id);
      if (!d) return `<article class="fe-topic fe-topic-bad"><div class="fe-topic-top"><span class="fe-topic-no">${two(i)}</span></div>
        <h3 class="fe-topic-name">${esc(t.name)}</h3><p class="fe-topic-vi" lang="vi">${esc(t.vi)}</p>
        <p class="fe-topic-err">${esc(UI.failed[t.id] || "This deck has no valid cards.")}</p>
        <div class="fe-topic-actions"><button class="fe-btn fe-btn-ghost" data-fe-retry="${t.id}">${svg("restart", 16)} Try again</button></div></article>`;
      const c = FE.counts(st, d.cards); total += c.total; known += c.known; review += c.review;
      const ds = st.decks[t.id], seq = ds ? FE.sequence(ds, d.cards) : d.cards, pos = ds ? Math.min(ds.pos, seq.length) : 0;
      const going = ds && pos > 0 && pos < seq.length, q = st.quiz[t.id], p = pctOf(c.known, c.total);
      const label = going ? `Continue · ${pos + 1}/${seq.length}` : c.known === c.total ? "Study again" : "Start Learning";
      return `<article class="fe-topic">
        <div class="fe-topic-top"><span class="fe-topic-no">${two(i)}</span><span class="fe-pill">${c.total} flashcards</span></div>
        <h3 class="fe-topic-name">${esc(t.name)}</h3>
        <p class="fe-topic-vi" lang="vi">${esc(t.vi)}</p>
        <div class="fe-bar" role="progressbar" aria-label="${esc(t.name)}: ${p}% known" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>
        <div class="fe-topic-stats"><span><b>${c.known}</b> known</span><span class="${c.review ? "fe-amber" : ""}"><b>${c.review}</b> to review</span><span>${q ? `Quiz best <b>${Math.round(q.best * 100)}%</b>` : `<b>${p}%</b> done`}</span></div>
        ${d.errors.length ? `<p class="fe-topic-err">${d.errors.length} damaged card(s) skipped.</p>` : ""}
        <div class="fe-topic-actions"><a class="fe-btn fe-btn-primary" href="#/cards/english/${t.id}">${esc(label)}</a><a class="fe-btn fe-btn-ghost" href="#/cards/english/${t.id}/quiz">${svg("quiz", 16)} Quiz</a></div>
      </article>`;
    }).join("");
    const last = st.last && usable(st.last) ? FE.topicById(st.last) : null, p = pctOf(known, total);
    view.innerHTML = `${hero()}<div class="fe">
      ${UI.notice ? `<div class="fe-alert" role="status">${esc(UI.notice)}</div>` : ""}
      <section class="fe-summary">
        <div class="fe-summary-main"><span class="fe-kicker">Your progress</span>
          <div class="fe-summary-num"><b>${known}</b><span>/ ${total} cards known</span></div>
          <div class="fe-bar fe-bar-lg" role="progressbar" aria-label="${p}% of all cards known" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>
          <p class="fe-muted">${review ? `${review} card${review === 1 ? "" : "s"} marked “Study Again” across all topics.` : "Mark cards with “I Know” or “Study Again” as you go; the topics below keep count."}</p></div>
        ${last ? `<a class="fe-continue" href="#/cards/english/${last.id}"><span class="fe-kicker">Continue</span><b>${esc(last.name)}</b><span class="fe-muted" lang="vi">${esc(last.vi)}</span>${icon("next", 18)}</a>` : `<div class="fe-continue fe-continue-tip"><span class="fe-kicker">How it works</span><span>Start Learning → read the term → Flip Card → I Know or Study Again → Next Card. Then try the Quiz.</span></div>`}
      </section>
      <div class="fe-topics">${tiles}</div>
      <p class="fe-foot fe-muted">12 topics written for CFA Level I candidates: vocabulary with IPA, definitions with formulas, Vietnamese → English and multiple-choice cards. Not CFA Institute material.</p>
    </div>`;
    UI.notice = "";
    view.querySelectorAll("[data-fe-retry]").forEach(b => b.onclick = () => retry(b.dataset.feRetry));
  }

  function notFound() {
    view.innerHTML = `${hero()}<div class="fe"><div class="fe-empty"><h2>This topic does not exist</h2><p class="fe-muted">The link may be out of date.</p>
      <a class="fe-btn fe-btn-primary" href="#/cards/english">All topics</a></div></div>`;
  }
  function broken(topic) {
    view.innerHTML = `${hero()}<div class="fe"><div class="fe-empty"><h2>${esc(topic.name)} could not be opened</h2>
      <p class="fe-muted">${esc(UI.failed[topic.id] || "This deck has no valid cards.")}</p>
      <div class="fe-row-btns"><button class="fe-btn fe-btn-primary" data-fe-retry="${topic.id}">${svg("restart", 16)} Try again</button><a class="fe-btn fe-btn-ghost" href="#/cards/english">All topics</a></div></div></div>`;
    view.querySelector("[data-fe-retry]").onclick = () => retry(topic.id);
  }

  // ======================= study =======================
  function study(topic) {
    const st = S(), cards = usable(topic.id).cards, ds = FE.deckState(st, topic.id);
    let dirty = FE.sanitize(ds, cards);
    if (st.last !== topic.id) { st.last = topic.id; dirty = true; }
    if (dirty) save();
    drawStudy(topic, cards, true);
  }
  function drawStudy(topic, cards, first) {
    const st = S(), ds = FE.deckState(st, topic.id), seq = FE.sequence(ds, cards), n = seq.length, i = Math.min(ds.pos, n);
    const card = seq[i], c = FE.counts(st, cards), review = ds.mode === "review";
    const key = `${topic.id}|${card ? card.id : "end"}|${ds.mode}|${i}`;
    if (UI.cardKey !== key) { UI.cardKey = key; UI.flipped = false; UI.pick = null; }
    const top = `<header class="fe-study-top">
        <a class="fe-backlink" href="#/cards/english">${icon("back", 16)}<span>Topics</span></a>
        <div class="fe-study-title"><span class="fe-kicker">Topic ${two(topicNo(topic.id))} · <span lang="vi">${esc(topic.vi)}</span></span><h1>${esc(topic.name)}</h1></div>
        <div class="fe-tools" role="toolbar" aria-label="Deck tools">
          <button class="fe-tool" data-fe="shuffle" title="Shuffle the cards">${svg("shuffle", 16)}<span>Shuffle</span></button>
          <button class="fe-tool" data-fe="restart" title="Back to card 1, original order">${svg("restart", 16)}<span>Restart Deck</span></button>
          ${review ? `<button class="fe-tool" data-fe="all" title="Study every card again">${icon("cards", 16)}<span>All cards</span></button>`
            : c.review ? `<button class="fe-tool fe-tool-amber" data-fe="review" title="Only the cards marked Study Again">${svg("again", 16)}<span>Review Mistakes (${c.review})</span></button>` : ""}
          <a class="fe-tool" href="#/cards/english/${topic.id}/quiz">${svg("quiz", 16)}<span>Quiz</span></a>
        </div></header>`;
    const stats = `<div class="fe-meta" id="fe-meta">
        <span class="fe-count">${card ? `Card ${i + 1}/${n}` : `${n}/${n} done`}${review ? ` <span class="fe-mode">Review Mistakes</span>` : ""}</span>
        <div class="fe-bar" role="progressbar" aria-label="Position in the deck" aria-valuenow="${pctOf(card ? i + 1 : n, n)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pctOf(card ? i + 1 : n, n)}%"></i></div>
        <span class="fe-stat fe-stat-ok" title="Cards marked I Know">${svg("check", 14)} Known <b>${c.known}</b></span>
        <span class="fe-stat fe-stat-amber" title="Cards marked Study Again">${svg("again", 14)} To review <b>${c.review}</b></span>
        <span class="fe-stat" title="Cards not marked yet">New <b>${c.fresh}</b></span>
      </div>`;
    if (!card) {
      const html = `<div class="fe fe-study">${top}${stats}
        <section class="fe-done" aria-live="polite">
          <div class="fe-done-badge">${svg("spark", 28)}</div>
          <h2>${review ? "Review finished" : "Deck finished"}</h2>
          <p>${review ? `You went through the ${n} card${n === 1 ? "" : "s"} you marked “Study Again”.` : `You went through all ${n} cards of ${esc(topic.name)}.`}</p>
          <div class="fe-done-stats"><span><b>${c.known}</b> known</span><span><b>${c.review}</b> to review</span><span><b>${c.fresh}</b> not marked</span></div>
          <div class="fe-row-btns">
            ${c.review ? `<button class="fe-btn fe-btn-amber" data-fe="review">${svg("again", 16)} Review Mistakes (${c.review})</button>` : ""}
            <button class="fe-btn fe-btn-ghost" data-fe="restart">${svg("restart", 16)} Restart Deck</button>
            <a class="fe-btn fe-btn-primary" href="#/cards/english/${topic.id}/quiz">${svg("quiz", 16)} Take the Quiz</a>
          </div>
          <a class="fe-link" href="#/cards/english">Choose another topic</a>
        </section>
        ${resetLine()}</div>`;
      first ? (view.innerHTML = html) : quietRender(html);
      bindStudy(topic, cards);
      return;
    }
    const mcqOpen = card.type === "mcq" && !UI.picked[card.id];
    const html = `<div class="fe fe-study">${top}${stats}
      <div class="fe-stage"><div class="fe-card ${UI.flipped ? "is-flipped" : ""} ${first ? "" : "fe-card-in"}" id="fe-card" data-type="${card.type}">${faces(card, st)}</div></div>
      <nav class="fe-nav" aria-label="Card navigation">
        <button class="fe-btn fe-btn-ghost" data-fe="prev" ${i === 0 ? 'style="visibility:hidden" tabindex="-1" aria-hidden="true"' : ""}>${icon("prev", 16)}<span>Previous</span></button>
        ${mcqOpen ? `<span class="fe-nav-hint">Choose A–D, then Submit</span>` : `<button class="fe-btn fe-btn-ghost" data-fe="flip" id="fe-flip-nav">${svg("flip", 16)}<span>${UI.flipped ? "Show front" : "Flip"}</span></button>`}
        <button class="fe-btn fe-btn-ghost" data-fe="next">${i === n - 1 ? "Finish" : "Next"}<span class="fe-sr"> card</span>${icon("next", 16)}</button>
      </nav>
      <p class="fe-keys fe-muted">Keyboard: <kbd>Space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> previous / next · <kbd>1</kbd> I Know · <kbd>2</kbd> Study Again · multiple choice: <kbd>A</kbd>–<kbd>D</kbd> then <kbd>Enter</kbd></p>
      ${resetLine()}</div>`;
    first ? (view.innerHTML = html) : quietRender(html);
    applyFlip(false);
    bindStudy(topic, cards);
  }
  const resetLine = () => `<p class="fe-reset"><button class="fe-link" data-fe="reset">Reset this topic's progress</button></p>`;

  function faces(card, st) {
    const top = `<div class="fe-face-top"><span class="fe-type">${FE.TYPE_LABEL[card.type]}</span><span class="fe-level fe-level-${LV[card.difficulty]}">${card.difficulty}</span></div>`;
    if (card.type === "mcq") return mcqFaces(card, top);
    let front;
    if (card.type === "vocabulary") front = `<h2 class="fe-term">${esc(card.term)}</h2><p class="fe-ipa">${esc(card.ipa)}</p><p class="fe-ask">${esc(askVocab(card))}</p>`;
    else if (card.type === "definition") front = `<p class="fe-ask-big">${esc(card.question)}</p><p class="fe-ask fe-muted">Recall the definition${card.formula ? " and the formula" : ""}, then flip the card.</p>`;
    else front = `<p class="fe-vi" lang="vi">${esc(card.vietnamese)}</p><p class="fe-ask">What is the English term?</p>`;
    const m = st.marks[card.id];
    const rows = [["English Definition", esc(card.definition)]];
    if (card.formula) rows.push(["Formula", `<code class="fe-formula">${esc(card.formula)}</code>${card.formulaNote ? `<span class="fe-note">${esc(card.formulaNote)}</span>` : ""}`]);
    rows.push(["Vietnamese Explanation", `<span lang="vi">${esc(card.explanation)}</span>`]);
    if (card.example) rows.push(["Example", `<span class="fe-example">${esc(card.example)}</span>`]);
    if (card.relatedTerms && card.relatedTerms.length) rows.push(["Related Terms", `<span class="fe-chips">${card.relatedTerms.map(r => `<span class="fe-chip">${esc(r)}</span>`).join("")}</span>`]);
    if (card.cfaApplication) rows.push(["CFA Application", esc(card.cfaApplication)]);
    return `<section class="fe-face fe-front" data-face="front" ${UI.flipped ? "hidden" : ""}>${top}<div class="fe-front-main">${front}</div>
        <div class="fe-face-actions"><button class="fe-btn fe-btn-primary fe-btn-lg" data-fe="flip">${svg("flip", 18)} Flip Card</button></div></section>
      <section class="fe-face fe-back" data-face="back" ${UI.flipped ? "" : "hidden"}>${top}
        <h2 class="fe-back-title">${esc(card.term)} <span class="fe-dash">–</span> <span class="fe-back-vi" lang="vi">${esc(card.vietnamese)}</span></h2>
        ${card.ipa ? `<p class="fe-ipa fe-ipa-sm">${esc(card.ipa)}</p>` : ""}
        <dl class="fe-rows">${rows.map(([k, v]) => `<div class="fe-row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <div class="fe-face-actions fe-grade">
          <button class="fe-btn fe-btn-ok ${m === "k" ? "is-on" : ""}" data-fe="know" aria-pressed="${m === "k"}">${svg("check", 17)} I Know</button>
          <button class="fe-btn fe-btn-amber ${m === "r" ? "is-on" : ""}" data-fe="again" aria-pressed="${m === "r"}">${svg("again", 17)} Study Again</button>
          <button class="fe-btn fe-btn-primary" data-fe="next">Next Card ${icon("next", 16)}</button>
        </div></section>`;
  }
  // a multiple-choice card holds no answer in the page until it has been submitted
  function mcqFaces(card, top) {
    const done = UI.picked[card.id];
    const opts = card.options.map((o, j) => {
      const L = LETTERS[j];
      if (!done) return `<button class="fe-opt ${UI.pick === j ? "is-picked" : ""}" role="radio" aria-checked="${UI.pick === j}" data-fe-opt="${j}"><span class="fe-opt-l">${L}</span><span class="fe-opt-t">${esc(o)}</span></button>`;
      const cls = L === card.correctAnswer ? "is-correct" : j === done.pick ? "is-wrong" : "is-dim";
      return `<div class="fe-opt ${cls}"><span class="fe-opt-l">${L}</span><span class="fe-opt-t">${esc(o)}</span>${L === card.correctAnswer ? svg("check", 16) : j === done.pick ? svg("x", 16) : ""}</div>`;
    }).join("");
    const front = `<section class="fe-face fe-front fe-front-mcq" data-face="front" ${UI.flipped && done ? "hidden" : ""}>${top}
      <div class="fe-mcq"><p class="fe-ask-big">${esc(card.question)}</p>
        <div class="fe-opts" ${done ? "" : 'role="radiogroup" aria-label="Answers"'}>${opts}</div>
        <p class="fe-msg" id="fe-msg" role="alert"></p></div>
      <div class="fe-face-actions">${done ? `<button class="fe-btn fe-btn-ghost" data-fe="flip">See the explanation</button><button class="fe-btn fe-btn-primary" data-fe="next">Next Question ${icon("next", 16)}</button>`
        : `<button class="fe-btn fe-btn-primary fe-btn-lg" data-fe="submit">Submit</button>`}</div></section>`;
    if (!done) return `${front}<section class="fe-face fe-back fe-back-empty" data-face="back" hidden></section>`;
    const right = LETTERS.indexOf(card.correctAnswer);
    return `${front}<section class="fe-face fe-back" data-face="back" ${UI.flipped ? "" : "hidden"}>${top}
      <div class="fe-verdict ${done.ok ? "ok" : "bad"}">${done.ok ? svg("check", 22) + " Correct" : svg("x", 22) + " Incorrect"}</div>
      <p class="fe-back-q">${esc(card.question)}</p>
      <dl class="fe-rows">
        <div class="fe-row"><dt>Correct answer</dt><dd><b>${card.correctAnswer}.</b> ${esc(card.options[right])}</dd></div>
        ${done.ok ? "" : `<div class="fe-row"><dt>Your answer</dt><dd><b>${LETTERS[done.pick]}.</b> ${esc(card.options[done.pick])}</dd></div>`}
        <div class="fe-row"><dt>Explanation</dt><dd>${esc(card.explanationEn)}</dd></div>
        <div class="fe-row"><dt>Giải thích</dt><dd lang="vi">${esc(card.explanationVi)}</dd></div>
      </dl>
      <div class="fe-face-actions"><button class="fe-btn fe-btn-primary" data-fe="next">Next Question ${icon("next", 16)}</button></div></section>`;
  }

  // Flip: the card turns to 90° (edge-on), the faces are swapped, and it turns back to 0°. Each face keeps its own
  // height (a long back no longer stretches the front on a phone); the face that is not showing is hidden.
  let flipToken = 0;
  function showFace(el) {
    el.classList.toggle("is-flipped", UI.flipped);
    el.querySelectorAll("[data-face]").forEach(f => { f.hidden = (f.dataset.face === "back") !== UI.flipped || f.classList.contains("fe-back-empty"); });
    const nav = document.getElementById("fe-flip-nav");
    if (nav) nav.querySelector("span").textContent = UI.flipped ? "Show front" : "Flip";
  }
  function focusFace(el) { const t = el.querySelector(`[data-face="${UI.flipped ? "back" : "front"}"] .fe-face-actions .fe-btn`); if (t) t.focus({ preventScroll: true }); }
  function applyFlip(toggle) {
    const el = document.getElementById("fe-card"); if (!el) return;
    if (!toggle) { showFace(el); return; }
    UI.flipped = !UI.flipped;
    const still = !el.animate || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) { showFace(el); focusFace(el); return; }
    const my = ++flipToken;
    el.getAnimations().forEach(a => a.cancel());
    el.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }], { duration: 190, easing: "cubic-bezier(0.5, 0, 1, 1)" }).onfinish = () => {
      if (my !== flipToken) return;               // a newer flip took over
      showFace(el);
      el.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }], { duration: 300, easing: "cubic-bezier(0, 0, 0.2, 1)" }).onfinish = () => { if (my === flipToken) focusFace(el); };
    };
  }

  function bindStudy(topic, cards) {
    const st = S(), ds = FE.deckState(st, topic.id);
    const seq = () => FE.sequence(ds, cards), cur = () => seq()[Math.min(ds.pos, seq().length)];
    const redraw = () => drawStudy(topic, cards, false);
    const go = d => { const n = seq().length; ds.pos = Math.max(0, Math.min(n, ds.pos + d)); save(); redraw(); };
    const markCard = v => {
      const c = cur(); if (!c || c.type === "mcq") return;
      FE.mark(st, c.id, st.marks[c.id] === v ? null : v); save();
      const m = st.marks[c.id];
      view.querySelectorAll('[data-fe="know"],[data-fe="again"]').forEach(b => { const on = (b.dataset.fe === "know" ? "k" : "r") === m; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
      refreshMeta(topic, cards);
      if (m) toast(m === "k" ? "Marked as known" : "Added to Review Mistakes");
    };
    const submit = () => {
      const c = cur(); if (!c || c.type !== "mcq" || UI.picked[c.id]) return;
      if (UI.pick == null) { const m = document.getElementById("fe-msg"); if (m) m.textContent = "Choose an answer (A, B, C or D) first."; return; }
      const ok = LETTERS[UI.pick] === c.correctAnswer;
      UI.picked[c.id] = { pick: UI.pick, ok };
      FE.mark(st, c.id, ok ? "k" : "r"); save();
      UI.flipped = true; redraw();
    };
    const act = {
      flip: () => { const c = cur(); if (c && c.type === "mcq" && !UI.picked[c.id]) return; applyFlip(true); },
      next: () => go(1), prev: () => go(-1), know: () => markCard("k"), again: () => markCard("r"), submit,
      shuffle: () => { FE.shuffleDeck(ds, cards, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); UI.picked = {}; save(); redraw(); toast(`Shuffled ${seq().length} cards`); },
      restart: () => { FE.restart(ds); UI.picked = {}; save(); redraw(); toast("Back to card 1"); },
      review: () => { if (FE.startReview(ds, st, cards)) { UI.picked = {}; save(); redraw(); toast(`Reviewing ${seq().length} card${seq().length === 1 ? "" : "s"}`); } else toast("No cards marked “Study Again”"); },
      all: () => { ds.mode = "all"; ds.list = null; ds.pos = 0; save(); redraw(); },
      reset: async () => {
        if (!(await confirmDialog({ title: `Reset ${topic.name}?`, message: "The I Know / Study Again marks, your place in the deck and the quiz score of this topic are cleared. Other topics are not affected.", confirmText: "Reset", danger: true }))) return;
        FE.resetDeck(st, topic.id, cards); UI.picked = {}; save(); study(topic); toast("Progress reset");
      }
    };
    view.querySelectorAll("[data-fe]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const f = act[b.dataset.fe]; if (f) f(); }));
    view.querySelectorAll("[data-fe-opt]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation(); UI.pick = +b.dataset.feOpt;
      view.querySelectorAll("[data-fe-opt]").forEach(o => { const on = +o.dataset.feOpt === UI.pick; o.classList.toggle("is-picked", on); o.setAttribute("aria-checked", String(on)); });
      const m = document.getElementById("fe-msg"); if (m) m.textContent = "";
    }));
    const front = view.querySelector('.fe-card:not([data-type="mcq"]) [data-face="front"]');
    if (front) front.addEventListener("click", e => { if (!e.target.closest("button,a")) act.flip(); });
    window.onkeydown = e => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".modal-overlay")) return;
      const c = cur(), k = e.key;
      if (c && c.type === "mcq" && !UI.picked[c.id]) {
        const j = "abcd".indexOf(k.toLowerCase()) >= 0 && k.length === 1 ? "abcd".indexOf(k.toLowerCase()) : "1234".indexOf(k);
        if (j >= 0) { e.preventDefault(); const b = view.querySelector(`[data-fe-opt="${j}"]`); if (b) b.click(); return; }
        if (k === "Enter" && !onControl(e)) { e.preventDefault(); submit(); return; }
      }
      if (k === "ArrowRight") { e.preventDefault(); act.next(); }
      else if (k === "ArrowLeft") { e.preventDefault(); act.prev(); }
      else if ((k === " " || k === "Enter") && !onControl(e)) { e.preventDefault(); if (c) act.flip(); }
      else if (k === "1" && UI.flipped) act.know();
      else if (k === "2" && UI.flipped) act.again();
    };
  }
  function refreshMeta(topic, cards) {
    const st = S(), c = FE.counts(st, cards), meta = document.getElementById("fe-meta");
    if (!meta) return;
    const set = (sel, v) => { const b = meta.querySelector(sel + " b"); if (b) b.textContent = v; };
    set(".fe-stat-ok", c.known); set(".fe-stat-amber", c.review); set(".fe-stat:not(.fe-stat-ok):not(.fe-stat-amber)", c.fresh);
  }

  // ======================= quiz =======================
  const KIND = { mcq: "Multiple choice", def: "Definition → term", vi: "English → Vietnamese", en: "Vietnamese → English" };
  function quiz(topic) {
    const st = S(), cards = usable(topic.id).cards;
    let run = st.runs[topic.id];
    if (!FE.validRun(run, topic.id, cards)) {
      run = FE.newRun(topic.id, cards, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
      if (!run.qs.length) {
        view.innerHTML = `${hero()}<div class="fe"><div class="fe-empty"><h2>Not enough cards for a quiz</h2><p class="fe-muted">${esc(topic.name)} needs at least four terms or one multiple-choice card.</p><a class="fe-btn fe-btn-primary" href="#/cards/english/${topic.id}">Back to the topic</a></div></div>`;
        return;
      }
      st.runs[topic.id] = run; UI.qPick = null;
    }
    if (st.last !== topic.id) st.last = topic.id;
    save();
    drawQuiz(topic, cards, true);
  }
  function drawQuiz(topic, cards, first) {
    const st = S(), run = st.runs[topic.id];
    if (run.i >= run.qs.length) return results(topic, cards, run, first);
    const q = run.qs[run.i], v = FE.questionView(q, cards), answered = Number.isInteger(run.picks[run.i]);
    const right = run.qs.slice(0, run.i + (answered ? 1 : 0)).filter((x, j) => run.picks[j] === x.ans).length;
    const n = run.qs.length, picked = answered ? run.picks[run.i] : UI.qPick;
    const opts = v.options.map((o, j) => {
      if (!answered) return `<button class="fe-opt ${picked === j ? "is-picked" : ""}" role="radio" aria-checked="${picked === j}" data-fq-opt="${j}"><span class="fe-opt-l">${LETTERS[j]}</span><span class="fe-opt-t" ${q.k === "vi" ? 'lang="vi"' : ""}>${esc(o)}</span></button>`;
      const cls = j === v.ans ? "is-correct" : j === picked ? "is-wrong" : "is-dim";
      return `<div class="fe-opt ${cls}"><span class="fe-opt-l">${LETTERS[j]}</span><span class="fe-opt-t" ${q.k === "vi" ? 'lang="vi"' : ""}>${esc(o)}</span>${j === v.ans ? svg("check", 16) : j === picked ? svg("x", 16) : ""}</div>`;
    }).join("");
    const ok = answered && picked === v.ans;
    const html = `<div class="fe fe-quiz">
      <header class="fe-study-top">
        <a class="fe-backlink" href="#/cards/english/${topic.id}">${icon("back", 16)}<span>${esc(topic.name)}</span></a>
        <div class="fe-study-title"><span class="fe-kicker">Quiz · Topic ${two(topicNo(topic.id))}</span><h1>${esc(topic.name)}</h1></div>
        <div class="fe-tools"><button class="fe-tool" data-fq="retake" title="Start a new set of questions">${svg("restart", 16)}<span>New quiz</span></button></div>
      </header>
      <div class="fe-meta"><span class="fe-count">Question ${run.i + 1}/${n}</span>
        <div class="fe-bar" role="progressbar" aria-label="Quiz progress" aria-valuenow="${pctOf(run.i + (answered ? 1 : 0), n)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pctOf(run.i + (answered ? 1 : 0), n)}%"></i></div>
        <span class="fe-stat fe-stat-ok">${svg("check", 14)} Correct <b>${right}</b></span></div>
      <article class="fe-qcard ${first ? "" : "fe-card-in"}">
        <div class="fe-face-top"><span class="fe-type">${KIND[q.k]}</span><span class="fe-level fe-level-${LV[v.card.difficulty]}">${v.card.difficulty}</span></div>
        <h2 class="fe-ask-big" ${q.k === "en" ? 'lang="vi"' : ""}>${esc(v.prompt)}</h2>
        ${v.sub ? `<blockquote class="fe-quote">${esc(v.sub)}</blockquote>` : ""}
        <div class="fe-opts" ${answered ? "" : 'role="radiogroup" aria-label="Answers"'}>${opts}</div>
        <p class="fe-msg" id="fe-msg" role="alert"></p>
        ${answered ? `<div class="fe-feedback ${ok ? "ok" : "bad"}" aria-live="polite">
            <div class="fe-verdict ${ok ? "ok" : "bad"}">${ok ? svg("check", 20) + " Correct" : svg("x", 20) + " Incorrect"}</div>
            <p><b>Correct answer:</b> ${LETTERS[v.ans]}. <span ${q.k === "vi" ? 'lang="vi"' : ""}>${esc(v.options[v.ans])}</span></p>
            <p><b>Explanation:</b> ${esc(v.explainEn)}</p>
            <p lang="vi"><b>Giải thích:</b> ${esc(v.explainVi)}</p></div>` : ""}
        <div class="fe-face-actions">${answered ? `<button class="fe-btn fe-btn-primary fe-btn-lg" data-fq="next">${run.i + 1 < n ? "Next Question" : "See Results"} ${icon("next", 16)}</button>`
          : `<button class="fe-btn fe-btn-primary fe-btn-lg" data-fq="submit">Submit</button>`}</div>
        <p class="fe-keys fe-muted">Keyboard: <kbd>A</kbd>–<kbd>D</kbd> choose · <kbd>Enter</kbd> submit / next</p>
      </article></div>`;
    first ? (view.innerHTML = html) : quietRender(html);
    bindQuiz(topic, cards);
  }
  function bindQuiz(topic, cards) {
    const st = S(), run = st.runs[topic.id];
    const redraw = () => drawQuiz(topic, cards, false);
    const submit = () => {
      if (run.i >= run.qs.length || Number.isInteger(run.picks[run.i])) return;
      if (UI.qPick == null) { const m = document.getElementById("fe-msg"); if (m) m.textContent = "Choose an answer (A, B, C or D) first."; return; }
      const q = run.qs[run.i];
      run.picks[run.i] = UI.qPick; UI.qPick = null;
      if (run.picks[run.i] === q.ans) { if (q.k === "mcq") FE.mark(st, q.c, "k"); }   // a right answer on a term card does not mean it is learned
      else FE.mark(st, q.c, "r");                                                        // a wrong one goes to Review Mistakes
      save(); redraw();
    };
    const next = () => {
      if (!Number.isInteger(run.picks[run.i])) return;
      run.i += 1;
      if (run.i >= run.qs.length) FE.recordQuiz(st, topic.id, FE.scoreRun(run), todayStr());
      save(); redraw();
    };
    const retake = () => { delete st.runs[topic.id]; UI.qPick = null; save(); quiz(topic); };
    view.querySelectorAll("[data-fq]").forEach(b => b.onclick = () => ({ submit, next, retake })[b.dataset.fq]());
    view.querySelectorAll("[data-fq-opt]").forEach(b => b.onclick = () => {
      UI.qPick = +b.dataset.fqOpt;
      view.querySelectorAll("[data-fq-opt]").forEach(o => { const on = +o.dataset.fqOpt === UI.qPick; o.classList.toggle("is-picked", on); o.setAttribute("aria-checked", String(on)); });
      const m = document.getElementById("fe-msg"); if (m) m.textContent = "";
    });
    window.onkeydown = e => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key, answered = Number.isInteger(run.picks[run.i]);
      if (!answered && k.length === 1) {
        const j = "abcd".indexOf(k.toLowerCase()) >= 0 ? "abcd".indexOf(k.toLowerCase()) : "1234".indexOf(k);
        if (j >= 0) { e.preventDefault(); const b = view.querySelector(`[data-fq-opt="${j}"]`); if (b) b.click(); return; }
      }
      if (k === "Enter" && !onControl(e)) { e.preventDefault(); answered ? next() : submit(); }
    };
  }
  function results(topic, cards, run, first) {
    const st = S(), res = FE.scoreRun(run), best = st.quiz[topic.id], p = Math.round(res.share * 100);
    const msg = p >= 80 ? "Excellent — you know this topic well." : p >= 60 ? "Good work. Review the questions you missed." : "Keep going: study the cards you missed, then try again.";
    const wrong = res.wrong.map(i => { const q = run.qs[i], v = FE.questionView(q, cards), pick = run.picks[i];
      return `<li class="fe-miss"><p class="fe-miss-q" ${q.k === "en" ? 'lang="vi"' : ""}>${esc(v.prompt)}${v.sub ? ` <span class="fe-muted">“${esc(v.sub)}”</span>` : ""}</p>
        <p><span class="fe-bad-text">${svg("x", 14)} Your answer:</span> ${Number.isInteger(pick) ? `${LETTERS[pick]}. ${esc(v.options[pick])}` : "—"}</p>
        <p><span class="fe-ok-text">${svg("check", 14)} Correct:</span> ${LETTERS[v.ans]}. ${esc(v.options[v.ans])}</p>
        <p class="fe-muted">${esc(v.explainEn)}</p><p class="fe-muted" lang="vi">${esc(v.explainVi)}</p></li>`; }).join("");
    const reviewN = FE.reviewIds(st, cards).length;
    const html = `<div class="fe fe-quiz">
      <header class="fe-study-top"><a class="fe-backlink" href="#/cards/english/${topic.id}">${icon("back", 16)}<span>${esc(topic.name)}</span></a>
        <div class="fe-study-title"><span class="fe-kicker">Quiz result</span><h1>${esc(topic.name)}</h1></div></header>
      <section class="fe-result">
        <div class="fe-score" style="--p:${p}"><b>${res.right}/${res.total}</b><span>${p}%</span></div>
        <div class="fe-result-text"><h2>${esc(msg)}</h2>
          <p class="fe-muted">Best score for this topic: <b>${best ? Math.round(best.best * 100) : p}%</b>. Every question you missed was added to Review Mistakes.</p>
          <div class="fe-row-btns">
            <button class="fe-btn fe-btn-primary" data-fq="retake">${svg("restart", 16)} Retake Quiz</button>
            ${reviewN ? `<button class="fe-btn fe-btn-amber" data-fq="review">${svg("again", 16)} Review Mistakes (${reviewN})</button>` : ""}
            <a class="fe-btn fe-btn-ghost" href="#/cards/english/${topic.id}">Study the cards</a>
            <a class="fe-btn fe-btn-ghost" href="#/cards/english">All topics</a>
          </div></div>
      </section>
      ${res.wrong.length ? `<section class="fe-misses"><h3>Questions to review (${res.wrong.length})</h3><ol>${wrong}</ol></section>` : `<p class="fe-allright">${svg("spark", 20)} No mistakes in this quiz.</p>`}
    </div>`;
    first ? (view.innerHTML = html) : quietRender(html);
    const retake = view.querySelector('[data-fq="retake"]'); if (retake) retake.onclick = () => { delete st.runs[topic.id]; UI.qPick = null; save(); quiz(topic); };
    const rv = view.querySelector('[data-fq="review"]');
    if (rv) rv.onclick = () => { const ds = FE.deckState(st, topic.id); if (FE.startReview(ds, st, cards)) { UI.picked = {}; save(); location.hash = `#/cards/english/${topic.id}`; } };
    window.onkeydown = null;
  }
})();

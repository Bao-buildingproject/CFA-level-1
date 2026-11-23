# CFA Level I Study

A personal study app for the CFA Level I exam (May 2027). Plain HTML, CSS and JavaScript — no build step, no server.

**Live site:** https://bao-buildingproject.github.io/CFA-level-1/

## Features
- **102 Learning Modules** (2027 Level I curriculum, 10 volumes) across 10 topics, each with a four-part completion meter (status 40% · questions 40% · reading 20%), a status stepper, reading checkboxes and a timed **module test**
- **Built-in question bank** — 642 original practice questions (Foundation / Application / Exam style) mapped to modules and tagged with LOS numbers from the SchweserNotes 2026 reading list. Written for this app; not copied from CFA Institute or Kaplan Schweser materials. Numeric answers verified by script
- **SchweserNotes** and **Curriculum** pages — reading checklists per module (book PDFs stay private in Google Drive)
- **Dashboard** — exam countdown with a guilloché progress seal and the 25-week roadmap, the next module to study, today's tasks, and a ledger of the ten topics (exam weight, module status strip, accuracy, completion)
- **Study plan** — 10 topics, chapters with status (Not started → Learning → Done → Reviewed), CFA Learning Ecosystem score and mistake log
- **Flashcards** — Leitner spaced repetition (5 boxes: 1/2/4/8/16 days), CSV import
- **Practice** — A/B/C questions with instant feedback (why correct, why not, exam trap, BA II Plus steps), mistake log, flags, CSV import
- **Question Bank** — your own question sets (about 1,900 questions in 92 sets over the 10 topics), answered on the site with explanations, tables and figures; mark, redo and build mock tests from them. The sets are published only in encrypted form (`qb/*.bin`, AES-256-GCM, key derived with PBKDF2): enter the private access key once per browser and they download by themselves, for every account in that browser. Without the key the files cannot be read; the key is not in this repository
- **Mock exams** — timed mocks built from your question bank, weighted by exam topic weights: Mini (30 Q / 45 min), Session (90 Q / 2h15), Full (180 Q, 2 sessions), Custom. Resume after reload, auto-submit at time-up, results by topic and answer review
- **CFA Tutor** — a private chatbot (Google Gemini). A Gemini API key is pasted once per browser and every account on it can use the tutor; each account keeps its own chat. The key and the chats stay in that browser and messages go straight to Google. Explains concepts and calculations, and an **Ask the tutor** button under every explanation sends the question on screen. Off during a timed mock
- **Giả lập chứng khoán** (Learn, in Vietnamese) — paper trading with 1 billion ₫ of virtual money on real Vietnamese prices. A price board in the standard Vietnamese layout (ceiling/floor/reference, three bids and offers, matched price, total volume, high/low, foreign buying and selling) with VN-Index, VN30, HNX and UPCoM. Every listed code: tabs for all stocks on HOSE (~410), HNX (~300) and UPCoM (~800), plus VN30 and a picker for the other index baskets (VN100, VNMidcap, VNSmallcap, VNX50, VNDiamond, VNFinLead, HNX30), sectors and the listed ETFs; search any code or company name (accents optional) and star it into Theo dõi; click a column to sort (e.g. by volume or %). Long lists refresh only the rows on screen. Click an offer to buy or a bid to sell from an order bar. HOSE rules: 100-share lots, tick sizes (10 ₫ for funds), the price band, LO and MP day orders, T+2 settlement, 0.15% fee and 0.1% tax on sales. Charts from VNDirect, portfolio P/L and performance against the VN-Index
- **Trading Arena · Phái sinh** (Learn, `#/trading/derivatives`, in Vietnamese) — a derivatives trading simulator with 100 million ₫ of virtual money per mode: VN30F1M and VN100F1M index futures, Long and Short, Market/Limit/Stop orders with Stop Loss and Take Profit, partial close and reverse, initial and maintenance margin, margin call and forced liquidation, the ±7% band, monthly expiry with cash settlement, fees, spread and slippage. A terminal with TradingView Lightweight Charts™ (1m–1D, volume, MA, EMA, Bollinger, RSI, MACD, trend and horizontal lines, entry/SL/TP/liquidation lines, fill markers), positions, pending orders, fills, trades, ledger, performance and margin tabs. Modes: Practice (synthetic market, clearly labelled), Challenges, Historical Replay of daily data the player imports (e.g. WiData; the file stays in the browser and is never committed) and a weekly Cup on a shared seed; achievements and an on-device leaderboard. Exact integer money, atomic actions, hash-chained ledger rebuilt from the fills on load. Design, assumptions and limits: [docs/derivatives-arena.md](docs/derivatives-arena.md)
- **Bond Empire: The Yield War** (Learn, `#/bond`, in Vietnamese) — a fixed income strategy game over the 19 CFA Level I Fixed Income modules: a 7-chapter campaign with 25 action missions (term sheet, cash flow schedule, offerings against a mandate, a government bond auction, funding and repo, pricing between coupon dates, YTM, spot/forward bootstrapping, FRN, rich/cheap trading, Duration Defense, key rate durations, a credit investigation with evidence pinning and a recovery waterfall, ABS tranche design under stress, MBS prepayment, a sequential CMO, a 12-week CIO crisis fund with four endings, an investment committee), all scored by the engine on six criteria with XP and eight career levels. A bond terminal on a simulated market (macro factors, policy rule, Nelson–Siegel curve, credit spreads, rating migration, defaults, weekly clock; coupons, principal and recoveries paid on business-day adjusted dates), a yield curve lab with six calculators, a duration risk center (estimate vs full revaluation), a structured finance factory, portfolio challenges, a weekly cup and replay of the real Vietnamese government curve the player imports (e.g. from WiData; never committed). Design document and limits: [docs/bond-empire.md](docs/bond-empire.md)
- **Game: Financial Empire — Beyond the Numbers** (Learn, in Vietnamese with English finance terms; built from the game design document "Project Ledger", Phase 1: Financial Detective) — you are a Junior Analyst at Aurora Capital, a fictional fund. Story Mode *The Black Ledger* has ten chapters (1 and 3 playable, the rest being written) with Maya Chen (Head of Research), Daniel Ross (Chief Risk Officer), Alex Morgan (Portfolio Manager), EVA (research assistant, in the Formula Inspector) and The Board. Each case: brief and data manifest → Terminal (three statements, 31 ratios, data checks, the source of every number) → evidence board (link each card to a hypothesis as supports / contradicts / explains / needs more evidence, then give your own verdict) → workpapers (compute three ratios) → decision (INVEST · HOLD · AVOID · REQUEST MORE EVIDENCE, with confidence) → three questions from the Chief Risk Officer → a score out of 100 on the design document's rubric (data and formula accuracy 20, key risk detection 20, evidence quality 20, alternative hypotheses 15, financial impact 15, decision and presentation 10), The Board's verdict, the reference view and what you missed. Career: Reputation (best score of each case) gives levels 1–50 and ranks from Junior Analyst to Fund Founder. Game pages are a console of their own in the design document's palette (midnight navy, champagne gold): the study site's navigation steps aside and the game has its own rail on a computer and tab bar on a phone (HQ, Story, Case files, Career, with Valuation Lab, Investment Simulator and Analyst League marked as still to come, and the BA II Plus). HQ shows the case to continue, the analyst's rank and level ring, results, pending missions and tools; Story is a ten-chapter map with the cast; the investigation screen keeps the steps, the question and the hypotheses beside each step; on the evidence board you pick a piece of evidence (EV-001…) and tap a relation on a hypothesis to link them. Multiplayer, server accounts and server-side scoring need a server and are not part of this static site
  - Every number is labelled **REAL** (from a data provider, with its column), **CALCULATED** (by the engine, with formula and inputs) or **SIMULATED** (the bundled training case, a fictional company). Missing inputs make a ratio "unavailable" with the reason; nothing is guessed
  - A company file must pass the blocking checks (assets = liabilities + equity, cash flow sections and cash roll-forward, cash ties to the balance sheet, three consecutive years, required lines, scope and label) or it is held in quarantine as NOT PUBLISHABLE
  - Company files are loaded once per browser and every account on it can play them; missions, scores and ranks stay per account
  - An introduction page (what the game is, the seven steps, scoring, ranks, the two missions, the rules) opens from the Playground tile and the first time an account opens the game; the HQ links back to it
- **BA II Plus** (Test) — an on-screen financial calculator with the keystrokes of the calculator allowed in the CFA exam: chain or AOS arithmetic, parentheses, memories (STO, RCL, M0–M9), TVM with P/Y, C/Y, xP/Y and BGN/END, cash flows (CF, NPV, IRR), AMORT, ICONV, DATA and STAT (1-V, LIN, Ln, EXP, PWR), DATE, Δ%, PROFIT, BRKEVN, FORMAT, CLR WORK, QUIT and RESET, with the calculator's error numbers. BOND and DEPR are not included. The page shows the stored values, the keys you pressed and 12 worked CFA examples that press the keys for you; on other pages a calculator button, dragged anywhere like the Tutor's owl, opens it in a small window that can be moved around (phones too), folded down to its display, and stays open from page to page. Works from the keyboard. Like a real one, it keeps its memory on the device for every account
- **Playground** (Dashboard and More) — app-style tiles with their own icons for the game, the stock simulator, the Trading Arena and Bond Empire; the game's tile shows "MỚI" until the account has seen the introduction, then its XP
  - Real companies are added one at a time, when someone needs them: ask Claude with the WiData MCP for a company's annual consolidated statements, then load the file in the game (VN30 picker included; banks and securities firms use another statement format and are not supported yet). `tools/widata-fw.js` turns the WiData `fs_nonfin` rows into a game file. **WiData data is for personal use: the files stay in the browser of the person who loaded them and are never committed here**
- **Backup** — export/import JSON; light/dark theme

All data is stored in the browser (`localStorage`, and IndexedDB for Question Bank sets). Each account keeps its own progress; three things are entered once and shared by every account in the same browser: the Question Bank (access key and sets), game company files and the CFA Tutor key. The BA II Plus also keeps one memory per browser. Export a backup regularly. With owner mode unlocked, Settings → **Reset all accounts** removes every account on that browser (the shared items stay) and the site opens on Sign Up.

## Design
"Charter" — the look of an engraved certificate: ivory paper, ink navy, brass details.
- Type: **Newsreader** (headings, large figures), **IBM Plex Sans** (interface), **IBM Plex Mono** (codes, timer). All three cover Vietnamese and have tabular figures.
- Tokens for colour, radius, shadow and motion live at the top of `css/style.css`; dark mode swaps them (night ink with gold).
- Signature pieces in `js/components.js`: `rosette()` (guilloché progress seal), `phaseTimeline()` (25-week roadmap), `meterHtml()` (module completion), `statusStrip()` (one cell per module).
- Motion is short and only on page change; it is switched off for people who ask for reduced motion.

## Run locally
Open `index.html` in a browser (double-click), or use VS Code's Live Server.

## Tests
The game's engine, rules and converter, and the BA II Plus engine, have tests (Node 18 or later, nothing to install):
```
node --test tests/*.test.js
```

## Structure
```
index.html
css/style.css        design tokens + components
css/responsive.css   breakpoints (mobile <768, tablet <1024, laptop, desktop ≥1440)
js/syllabus.js       10 topics and weights
js/modules.js        102 learning modules (2027) + book/volume links + 2026→2027 mapping
js/data/             built-in question bank (q-<topic>.js)
js/storage.js        data model, save/load, backup
js/components.js     icons, toast, dialog, rosette, roadmap, meters
js/progress.js       study plan & topic pages
js/flashcards.js     Leitner flashcards
js/quiz.js           question bank & practice
js/qbank-*.js        Question Bank: topics and sets, answering, encrypted auto-load (qbank-sync.js)
qb/                  encrypted Question Bank packs + manifest (unreadable without the access key)
js/mock.js           mock exams
js/game/engine.js    game: checks on a dataset and the ratio registry (formula, inputs, conventions)
js/game/missions.js  game: missions, hypotheses, data tests, reference view, score, ranks
js/game/sample.js    game: the training case (simulated, fictional company)
js/game/ui.js        game: intro, HQ, mission steps, inspector, import and quarantine
js/playground.js     Playground tiles and their icons (Dashboard, More)
js/arena/engine.js   Trading Arena engine: orders, matching, margin, liquidation, expiry, ledger, analytics
js/arena/market.js   Trading Arena market data: synthetic market, historical replay, indicators
js/arena/store.js    Trading Arena wallets per account, saving with revisions, challenges, cup, leaderboard
js/arena/ui.js       Trading Arena lobby and terminal
css/arena.css        Trading Arena styles
js/bond/engine.js    Bond Empire fixed income engine: schedules, pricing, YTM, curves, duration, convexity, KRD, money market, FRN, credit, recovery, ABS/MBS/CMO, auctions
js/bond/market.js    Bond Empire market simulation and the (fictional) bond universe; government curve replay
js/bond/book.js      Bond Empire portfolio engine and ledger: trades, coupons, principal, defaults, risk
js/bond/missions.js  Bond Empire campaign: chapters, missions, scoring, career, challenges, fund scenario
js/bond/ui.js        Bond Empire screens
css/bond.css         Bond Empire styles
js/vendor/lightweight-charts.min.js  TradingView Lightweight Charts 4.2.0 (Apache-2.0, licence alongside)
js/baii.js           BA II Plus engine: keys, worksheets, TVM, cash flows, statistics (no page code)
js/calc.js           BA II Plus page, floating calculator, worked examples
css/calc.css         calculator styles
css/game.css         game styles
tools/widata-fw.js   WiData fs_nonfin rows → game file (mapping only, no data)
tests/               node:test suites for the game
js/app.js            navigation, dashboard, settings, router
```

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
- **Mock exams** — timed mocks built from your question bank, weighted by exam topic weights: Mini (30 Q / 45 min), Session (90 Q / 2h15), Full (180 Q, 2 sessions), Custom. Resume after reload, auto-submit at time-up, results by topic and answer review
- **CFA Tutor** — a private chatbot (Google Gemini). Each account pastes its own Gemini API key once; the key and the chat stay in that browser and messages go straight to Google. Explains concepts and calculations, and an **Ask the tutor** button under every explanation sends the question on screen. Off during a timed mock
- **Stock simulator** (Learn) — paper trading with 1 billion ₫ of virtual money on real Vietnamese prices: VPS price board for quotes and the order book, VNDirect for charts and the VN-Index. HOSE rules: 100-share lots, tick sizes, ceiling/floor band, limit and market orders as day orders, T+2 settlement, 0.15% fee and 0.1% tax on sales. Portfolio P/L and performance against the VN-Index
- **Backup** — export/import JSON; light/dark theme

All data is stored in the browser (`localStorage`). Export a backup regularly.

## Design
"Charter" — the look of an engraved certificate: ivory paper, ink navy, brass details.
- Type: **Newsreader** (headings, large figures), **IBM Plex Sans** (interface), **IBM Plex Mono** (codes, timer). All three cover Vietnamese and have tabular figures.
- Tokens for colour, radius, shadow and motion live at the top of `css/style.css`; dark mode swaps them (night ink with gold).
- Signature pieces in `js/components.js`: `rosette()` (guilloché progress seal), `phaseTimeline()` (25-week roadmap), `meterHtml()` (module completion), `statusStrip()` (one cell per module).
- Motion is short and only on page change; it is switched off for people who ask for reduced motion.

## Run locally
Open `index.html` in a browser (double-click), or use VS Code's Live Server.

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
js/mock.js           mock exams
js/app.js            navigation, dashboard, settings, router
```

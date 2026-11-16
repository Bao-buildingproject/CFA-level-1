# CFA Level I Study

A personal study app for the CFA Level I exam (May 2027). Plain HTML, CSS and JavaScript — no build step, no server.

**Live site:** https://bao-buildingproject.github.io/CFA-level-1/

## Features
- **93 Learning Modules** (2026 Level I) across 10 topics, each with a normal-distribution completion chart, study status, reading checkboxes and a timed **module test**
- **Built-in question bank** — 496 original practice questions (Foundation / Application / Exam style) mapped to modules and tagged with LOS numbers from the SchweserNotes 2026 reading list. Written for this app; not copied from CFA Institute or Kaplan Schweser materials. Numeric answers verified by script
- **SchweserNotes** and **Curriculum** pages — reading checklists per module (book PDFs stay private in Google Drive)
- **Dashboard** — exam countdown, today's tasks, syllabus progress, pace vs. the 25-week plan
- **Study plan** — 10 topics, chapters with status (Not started → Learning → Done → Reviewed), CFA Learning Ecosystem score and mistake log
- **Flashcards** — Leitner spaced repetition (5 boxes: 1/2/4/8/16 days), CSV import
- **Practice** — A/B/C questions with instant feedback (why correct, why not, exam trap, BA II Plus steps), mistake log, flags, CSV import
- **Mock exams** — timed mocks built from your question bank, weighted by exam topic weights: Mini (30 Q / 45 min), Session (90 Q / 2h15), Full (180 Q, 2 sessions), Custom. Resume after reload, auto-submit at time-up, results by topic and answer review
- **Backup** — export/import JSON; light/dark theme

All data is stored in the browser (`localStorage`). Export a backup regularly.

## Run locally
Open `index.html` in a browser (double-click), or use VS Code's Live Server.

## Structure
```
index.html
css/style.css        design tokens + components
css/responsive.css   breakpoints (mobile <768, tablet <1024, laptop, desktop ≥1440)
js/syllabus.js       10 topics and weights
js/modules.js        93 learning modules + SchweserNotes book links
js/data/             built-in question bank (q-<topic>.js)
js/storage.js        data model, save/load, backup
js/components.js     icons, toast, dialog, progress ring
js/progress.js       study plan & topic pages
js/flashcards.js     Leitner flashcards
js/quiz.js           question bank & practice
js/mock.js           mock exams
js/app.js            navigation, dashboard, settings, router
```

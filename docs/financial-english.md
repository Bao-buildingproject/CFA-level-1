# Financial English flashcards

Inside **Flashcards** (`#/cards`), next to the Leitner tab *My cards*. Mở website → Flashcards → tab **Financial English** → chọn chủ đề → **Start Learning** → xem từ → **Flip Card** → đọc định nghĩa → **I Know** / **Study Again** → **Next Card** → **Quiz** → xem kết quả.

| Route | Page |
|---|---|
| `#/cards/english` | 12 topics: number of flashcards, cards known, cards to review, progress bar, best quiz score, **Start Learning** (or *Continue · n/22*), **Quiz** |
| `#/cards/english/<topic>` | Study: one large card with a 3D flip |
| `#/cards/english/<topic>/quiz` | Quiz: 10 questions A–D, then results |

Topic ids: `fund`, `fs`, `cf`, `eq`, `fi`, `der`, `pm`, `eco`, `bank`, `qm`, `risk`, `acad`. On phones the page is also reachable from More → *Financial English*, and from the *Cards* tab where the bottom bar has it.

## Content (264 cards)

| # | Topic | Cards | Vocabulary | Definition | Vietnamese → English | Multiple choice | Beginner / Intermediate / Advanced |
|---|---|---|---|---|---|---|---|
| 1 | Financial Fundamentals | 22 | 12 | 3 | 3 | 4 | 14 / 6 / 2 |
| 2 | Financial Statements | 22 | 12 | 3 | 3 | 4 | 13 / 7 / 2 |
| 3 | Corporate Finance | 22 | 12 | 3 | 3 | 4 | 9 / 9 / 4 |
| 4 | Equity Investments | 22 | 12 | 3 | 3 | 4 | 13 / 7 / 2 |
| 5 | Fixed Income | 22 | 12 | 3 | 3 | 4 | 9 / 10 / 3 |
| 6 | Derivatives | 22 | 12 | 3 | 3 | 4 | 10 / 10 / 2 |
| 7 | Portfolio Management | 22 | 12 | 3 | 3 | 4 | 10 / 11 / 1 |
| 8 | Economics | 22 | 12 | 3 | 3 | 4 | 11 / 8 / 3 |
| 9 | Banking | 22 | 12 | 3 | 3 | 4 | 9 / 11 / 2 |
| 10 | Quantitative Methods | 22 | 12 | 3 | 3 | 4 | 8 / 11 / 3 |
| 11 | Risk Management | 22 | 12 | 3 | 3 | 4 | 5 / 9 / 8 |
| 12 | Academic Financial English | 22 | 12 | 3 | 3 | 4 | 10 / 10 / 2 |

Written for this site for CFA Level I candidates; nothing is copied from CFA Institute question banks. Every term appears once in the whole set, and no definition is reused under another name. Definitions never contain their own term (the quiz asks "which term matches this definition?"). The worked numbers in examples and multiple-choice questions are recomputed by the tests.

## Card format

One file per topic in `js/fe/data/<topic>.js`, which calls `FinEng.register("<topic>", [cards])`. Cards are shown beginner → advanced, keeping the file order within a level. `module` (the topic name) and `topic` are added on load. A card that fails the checks is skipped and reported on the topic tile; the rest of the deck still works.

```js
{ id: "fund-01", type: "vocabulary", difficulty: "Beginner",          // Beginner | Intermediate | Advanced
  term: "Liquidity", ipa: "/lɪˈkwɪdəti/", vietnamese: "Tính thanh khoản",
  definition: "The ability to convert an asset into cash quickly without significantly affecting its price.",
  explanation: "Khả năng chuyển đổi tài sản thành tiền mặt nhanh chóng mà không làm giảm đáng kể giá của tài sản.",
  example: "Cash is generally more liquid than real estate.",
  relatedTerms: ["Liquidity Risk", "Solvency", "Cash Flow"],
  cfaApplication: "Liquidity is important when assessing financial risks and investment decisions." }

{ id: "fs-13", type: "definition", difficulty: "Intermediate",
  term: "Return on Equity (ROE)", ipa: "/…/", vietnamese: "Tỷ suất sinh lời trên vốn chủ sở hữu",
  question: "What is Return on Equity?",
  definition: "…", formula: "ROE = Net income ÷ Average total equity", formulaNote: "conventions…",
  explanation: "… (Vietnamese)", example: "…", relatedTerms: ["…"], cfaApplication: "…" }

{ id: "fs-16", type: "vi-en", difficulty: "Beginner",
  vietnamese: "Tỷ suất sinh lời trên tài sản", term: "Return on Assets (ROA)", ipa: "/rɪˈtɜːn ɒn ˈæsets/",
  definition: "…", explanation: "… (Vietnamese)", example: "…", relatedTerms: ["…"] }

{ id: "fund-22", type: "mcq", difficulty: "Intermediate", term: "Liquidity versus solvency",
  question: "…", options: ["…", "…", "…", "…"], correctAnswer: "B",
  explanationEn: "…", explanationVi: "…" }          // explanations must not name a letter: options are shuffled in the quiz
```

To add cards: append to the topic's file with the next id, run `node --test tests/fe.test.js`, and bump the `?v=` of the site (the data files load with the site version).

## Study page

- **Front**: the term in large capitals, IPA and “What does … mean in finance?” (vocabulary); the question (definition); the Vietnamese term and “What is the English term?” (Vietnamese → English). **Flip Card**, or tap the card, or Space.
- **Back**: Term – Vietnamese meaning, IPA, English Definition, Formula (with conventions), Vietnamese Explanation, Example, Related Terms, CFA Application; **I Know**, **Study Again**, **Next Card**. Pressing a mark again removes it.
- **Multiple choice**: A–D and **Submit** (a message asks for an answer if none is chosen). Before Submit the page holds no answer or explanation and there is no Flip button. After Submit: Correct / Incorrect, the question, the correct answer, your answer, the explanation in English and in Vietnamese, **Next Question**. A right answer marks the card known, a wrong one puts it in Review Mistakes.
- **Navigation**: Previous (not shown on card 1), Flip, Next; **Shuffle** (new random order, kept after a reload), **Restart Deck** (card 1, original order, marks kept), **Review Mistakes (n)** (only the cards marked Study Again), **All cards** to leave the review, **Quiz**, and *Reset this topic's progress* (asks first).
- **Progress**: Card x/n with a bar; Known, To review and New counts. The end of the deck (or of a review) shows the counts with Review Mistakes, Restart Deck and Take the Quiz.
- The flip turns the card edge-on, swaps the face and turns it back, so each face keeps its own height (a long back does not push the front off a phone screen). With reduced motion the face changes without the turn.
- Keyboard: Space flip, ← → previous / next, 1 I Know, 2 Study Again, A–D then Enter for multiple choice.

## Quiz

10 questions per topic: the topic's 4 multiple-choice cards (options shuffled) and 6 questions built from its terms — *which term matches this definition*, *what is the Vietnamese meaning of …*, *which English term means …* — with three other terms of the same topic as wrong options. Submit, then Correct/Incorrect with the right answer and explanations in English and Vietnamese, then Next Question. Results: score and percentage, best score for the topic, every missed question with your answer, the right one and both explanations; **Retake Quiz**, **Review Mistakes**, **Study the cards**, **All topics**. Missed questions are added to Review Mistakes. A quiz in progress and the last result survive a reload.

## Saved progress

In the account's data (`DATA.fe`), so every account has its own progress and it is part of the site's backup:

```
{ v: 1, marks: { cardId: "k" | "r" }, decks: { topic: { pos, order, mode, list } },
  quiz: { topic: { best, last, n, date } }, runs: { topic: quiz in progress }, last: topic }
```

`FinEng.repairState` keeps what is valid and drops the rest (the page then says that part of the progress was reset); a saved place that no longer fits a deck (for example after cards are added) is reset to card 1; a saved quiz whose questions no longer match the deck is replaced by a new quiz.

## Tests

`node --test tests/fe.test.js` — 20 tests: 12 decks with no rejected card, ≥ 20 cards per topic and ≥ 240 in all, every type and every level in each topic, unique ids, terms, definitions and questions, no definition containing its own term, distinct Vietnamese meanings per topic, fields per card type, Vietnamese/English text in the right fields, no placeholder text, worked numbers; broken cards reported, shuffle, marks and review list, repair of a saved place and of damaged saved data, quiz questions (one right answer, four different options, repeatable with a seed, right-answer positions spread out), quiz resumed after a reload and dropped when the deck changed, score and best score.

Browser checks (Playwright, desktop 1366 px and phone 390 px, light and dark): flip many times (button, card, Space), previous/next, shuffle and reload, I Know / Study Again, multiple choice wrong and right (keyboard), answer not in the page before Submit, Review Mistakes, reload in the middle of a review and of a quiz, end of deck, quiz to results and Retake, switching topics and Continue, reset, damaged saved data, unknown topic, a deck file that fails to load (the other 11 still work; Try again loads it), no button without an action, nothing wider than a phone screen, no console errors.

## Not included

No audio pronunciation (IPA only), no spaced-repetition schedule for these cards (the Leitner tab has one for your own cards), and no server: progress stays in the browser of each account, like the rest of the site.

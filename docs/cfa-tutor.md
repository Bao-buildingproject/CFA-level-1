# CFA Tutor

The owl button on every page opens a private chatbot on Google Gemini. A Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) is pasted once per browser; every account in that browser can use it, and each account keeps its own chat. The key and the chats are saved only in the browser (`localStorage`); messages go from the browser straight to Google. The key is sent in the `x-goog-api-key` header (newer `AQ.` keys may go as a bearer token), never in a URL. The tutor is off during a timed mock.

## Speed

What made answers slow or fail: one model only (the newest Flash) with its default "medium" thinking before the first word; when Google answered *503 overloaded*, the fallback was a model of the same family, which was overloaded too; and nothing limited the wait.

What the tutor does now (`js/tutor-core.js`, used by `js/tutor.js`):

| | |
|---|---|
| Streaming | The answer appears as Gemini writes it (`streamGenerateContent?alt=sse`). |
| Model order | Stable Flash first, then Flash-Lite, then another Flash generation, one model per family (Google's capacity is per model, so an overloaded model's sibling is often overloaded too). Up to 5 models per question. For example, a key that can use 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 2.5 Flash and 2.5 Flash-Lite is asked in this order: `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-3.6-flash` → `gemini-2.5-flash-lite` → `gemini-2.5-flash` (the real list comes from Google for each key). Previews and `-latest` aliases only when nothing stable exists. |
| Least thinking | Thinking is what delays the first word. Fast mode asks for the least each model accepts: Gemini 3 Flash and Pro `thinkingLevel: "low"`, Flash-Lite `"minimal"`, Gemini 2.5 Flash and Flash-Lite `thinkingBudget: 0`, 2.5 Pro 128. If Google rejects a setting (400), the next one down is tried at once (minimal → low → none) and remembered for that model. |
| Temperature | Gemini 3 keeps its default (Google advises against lowering it: answers can loop); Gemini 2.x gets 0.4. |
| Overloaded model | A model that fails before writing (503, 500, 429, 404, network) hands over at once to the next model, without waiting. |
| Slow model | If no word has arrived after 3 s, a second model is asked as well; the first to write is kept and the other request is cancelled. At most two at a time. |
| Rest | A model that was overloaded or slow is asked last for 2 minutes, one out of free requests (429) for 10 minutes, one that no longer exists (404) is dropped from the list. When every model was busy, none is marked, so Try again starts from the best one. |
| Every model busy | One more round with the 3 best models after a 1.2 s pause, then a clear message and **Thử lại**. |
| First words | Fast mode gives up after 25 s without a word; an answer that goes quiet for 30 s after it started counts as cut off. |
| Short answers | Fast mode asks for the key idea and at most five short points (about 180 words), with a 2,048-token limit; a cut answer says to type “tiếp tục”. |
| Small requests | Only the last 10 messages are sent; older ones are shortened (2,500 characters for the student, 1,500 for the tutor); failed and stopped exchanges are left out. The new question goes in full. |
| Connection | The page opens a connection to Google early (`preconnect`), and again when the chat opens or the input gets focus (a tiny model-list request, at most every 45 s). The model list is refreshed in the background every 3 days. |

### Modes

The button in the chat header switches modes (saved for the browser):

| | ⚡ Nhanh (default) | 🎯 Kỹ |
|---|---|---|
| Thinking | the least the model accepts | the model's default |
| Answer | short, about 180 words | step by step: intuition, formula, worked example, exam traps |
| Token limit | 2,048 | 8,192 |
| Second model asked after | 3 s | 12 s |
| Gives up without a word after | 25 s | 60 s |
| Messages sent | last 10 | last 14 |
| Models | Flash, Flash-Lite, …; Pro last | one Pro model second |

### What the student sees

- While waiting: typing dots and one line saying what is happening: *Đang hỏi gemini-3.8-flash…*, *gemini-3.8-flash đang quá tải, chuyển sang gemini-3.5-flash-lite…*, *… trả lời chậm, hỏi thêm …*, *… đã hết lượt miễn phí, chuyển sang …*, *Gemini đang bận, thử lại sau 1 giây…*
- Under each answer: the mode, the time to the first words and the model that answered (`⚡ 0,9 s · gemini-3.8-flash`). The header shows the model that answered last.
- **Thử lại** under an error, a cut-off answer or a stopped one (it replaces that answer). The Stop button stops every request.

### Messages

| Case | Message |
|---|---|
| Every model overloaded | Máy chủ Gemini đang quá tải (đã thử N model). Bấm Thử lại sau vài giây. |
| Out of free requests | Đã hết lượt miễn phí của các model Gemini lúc này. Đợi khoảng một phút rồi bấm Thử lại. |
| No word in time | Gemini không bắt đầu trả lời trong thời gian chờ. Bấm Thử lại. |
| No connection | Không kết nối được tới Google. Kiểm tra mạng rồi bấm Thử lại. |
| Key not valid / not allowed | Google báo khóa API không hợp lệ… / Khóa này chưa được phép dùng Gemini API… (asked once, never retried on other models) |
| Cut off | the words so far, then *(Gemini bị ngắt giữa chừng — bấm Thử lại để trả lời lại.)* |
| Blocked | Google chặn câu trả lời này. Thử hỏi theo cách khác nhé. |

## Saved settings

`cfaStudy_tutor_shared` (one per browser):

```
{ key, auth: "header" | "bearer", models: [{ id, name }], listedAt, model,   // model = the first one asked, for display
  mode: "fast" | "deep", rest: { hot: { id: until }, cool: { id: until } }, fix: { id: "low" | "none" } }
```

Chats: `cfaStudy_tutorlog_<account>`, the last 40 messages. A key published with the Question Bank (sealed with its access key) installs itself on browsers that have that access key.

## Tests

`node --test tests/tutor-core.test.js` — 19 tests: model names, model order in both modes (one per family, stable before preview, Pro placement, resting models last), thinking and generation settings per model, error kinds, and the race (fast first model, immediate hand-over, backup after the delay, the slow first model kept when it writes first, at most two at a time, all busy, key problem stops at once, cut off, no first word in time, Stop, empty answer).

Browser checks (Playwright, desktop 1366 px and phone 390 px, light and dark) against a **simulated** Gemini API — the page's `fetch` is replaced for `generativelanguage.googleapis.com` by a fake that streams real SSE with delays, errors and cancellation; no real key and no request to Google: key setup (wrong key refused, chat models only), streaming with the speed line, the request body for each model family, the key only in the header, 503 hand-over at once (no 3 s wait), the backup asked at 3 s and the slow request cancelled, a slow first model kept, 429 rest, a rejected thinking level retried and remembered, cut off then Thử lại, every model busy (8 requests, error in under 2 s, Thử lại works and starts from the best model), Stop with and without words, history sent, thorough mode, Gemini 2.5 settings, bad key, background list refresh, warm-up, an answer that goes quiet for 30 s, layout, no console errors.

Not measured: the real speed of Google's servers and the free-tier limits of a given key. Those depend on Google; the tutor only makes sure a busy or slow model does not hold the answer up.

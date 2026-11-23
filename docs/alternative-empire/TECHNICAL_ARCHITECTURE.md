# Alternative Empire — Technical Architecture

## 1. Kiểm tra repository và lựa chọn kiến trúc

Website là ứng dụng **tĩnh** (vanilla JavaScript, không bước build) chạy trên **GitHub Pages**, có hash router trong `js/app.js`, tài khoản theo hồ sơ trong `localStorage`, và đã có ba game cùng kiểu (Financial Empire, Trading Arena, Bond Empire). Không có máy chủ, cơ sở dữ liệu hay backend xác thực.

Prompt gợi ý Next.js + React + TypeScript + PostgreSQL + Prisma. Thêm chúng sẽ cần hosting có server, quy trình build và hệ thống đăng nhập mới, tách game khỏi website hiện có. Vì yêu cầu là **đặt game vào website này**, game được viết theo cùng kiến trúc với các game khác, giữ các nguyên tắc cốt lõi của prompt:

| Yêu cầu | Cách đáp ứng |
|---|---|
| Tách Financial Engine khỏi UI để kiểm thử | `engine.js`, `world.js`, `assets.js`, `fund.js`, `content.js`, `game.js` là module UMD thuần, không DOM; chạy được trong Node |
| Vitest / Playwright | `node:test` (tương đương Vitest, không cần cài) — `tests/alt.test.js`; Playwright cho kiểm thử trình duyệt |
| Không dùng float cho tiền | Số nguyên cent; nhân tỷ lệ bằng BigInt; làm tròn xác định |
| Zod validation | Kiểm tra đầu vào thủ công ở engine (`need`, `assertCents`, `assertRate`), ở form thương vụ (`readForm`: khoảng, bước, lựa chọn) và khi tải tệp lưu (schema, phiên bản, mã kiểm tra, đối soát sổ cái) |
| Zustand state | Một đối tượng trạng thái JSON duy nhất (`G`), mọi thay đổi đi qua API của `game.js` rồi lưu |
| PostgreSQL + Prisma | Chưa có: lưu trong trình duyệt. Bảng ánh xạ bên dưới cho biết mỗi bảng sẽ tương ứng phần nào của tệp lưu, để chuyển lên server sau này |

## 2. Module

```
js/alt/engine.js   công thức: phí, GP return, waterfall, American/European, NPV/IRR, MOIC, đòn bẩy, FoF, forward, futures, dự án, exposure, thống kê
js/alt/world.js    kinh tế theo quý: trạng thái Markov, biến vĩ mô, giá, ngẫu nhiên thuần theo (seed, tên, quý)
js/alt/assets.js   mô hình 17 loại tài sản + doanh nghiệp (startup, trưởng thành, khó khăn) → sự kiện kế toán
js/alt/fund.js     sổ cái: bút toán cân, chuỗi băm, mở/bán/thanh lý, thiếu tiền, NAV, thanh khoản, hiệu quả, đối soát
js/alt/content.js  nhân vật, LM, chương, 25 thương vụ, điều khoản đàm phán, sự kiện, 30 nhiệm vụ, 64 câu hỏi, khái niệm, sự nghiệp, thành tựu, kết cục, mandate
js/alt/game.js     luật: ván mới, vòng quý, thương vụ, đàm phán, hành động, quyết định, nhiệm vụ/quiz/bài tính, Hội đồng, sự nghiệp, thắng/thua, lưu/tải/chuyển đổi
js/alt/ui.js       17 màn hình, một bộ xử lý sự kiện chung (data-ae), lưu tự động, biểu đồ SVG
css/alt.css        giao diện (body.ae-mode ẩn điều hướng của website)
tests/alt.test.js  23 test
```

Luồng một quý (`game.endQuarter`): quyết định mặc định → sự kiện (kịch bản chương + ngẫu nhiên theo seed) → `world.step` → `stepCompany` → `fund.stepQuarter` (mỗi khoản đầu tư sinh sự kiện → bút toán) → hệ quả trễ đến hạn → quyết định mới → bù thiếu tiền → đóng quý (TWR) → Hội đồng → đánh giá chương → thắng/thua → sự nghiệp, thành tựu → đối soát.

**Tính lặp lại**: mọi số ngẫu nhiên là hàm thuần của (seed, khóa, quý) — không có trạng thái RNG cần lưu. Cùng seed + cùng quyết định → cùng kết quả (test: lưu → tải → chạy tiếp 3 quý cho cùng NAV và cùng nền kinh tế).

## 3. Lưu game

- Khóa `localStorage`: `cfaStudy_alt_<profileId>_s1|s2|s3` (ô lưu) và `_prefs` (cài đặt, ô đang chơi). Xóa hồ sơ/đặt lại tài khoản xóa luôn dữ liệu game (`altClearProfile`).
- Lưu tự động sau mỗi hành động. Kiểm tra xung đột giữa các tab bằng `updatedAt`.
- Định dạng: `schema: "alt-save/1"`, `v: 1`, toàn bộ trạng thái (seed, quý, kinh tế + lịch sử, sổ cái, doanh nghiệp, nhiệm vụ, quyết định mở, hệ quả trễ, cú sốc kéo dài, sự kiện đã bắn, kiến thức, lịch sử quiz, sự nghiệp, thành tựu, báo cáo) + `check` (FNV-1a của phần còn lại).
- Tải: kiểm tra schema, phiên bản (không tải tệp từ phiên bản mới hơn), mã kiểm tra, `fund.verify()`; sai → vẫn tải nhưng đánh dấu `tampered` và hiển thị cảnh báo. `migrate()` điền trường thiếu từ ván mới (test chuyển đổi tệp v0).
- Xuất/nhập JSON; khoảng 110–150 KB mỗi ván 5 năm.

## 4. Ánh xạ sang cơ sở dữ liệu (khi có server)

| Bảng đề xuất | Trong tệp lưu hiện tại |
|---|---|
| Users | Hồ sơ tài khoản của website (`PROFILES`) |
| Game profiles / Save slots | Khóa `_s1.._s3`, `summary()` |
| Portfolio snapshots | `fund.navHist`, `boardHist`, `reports` |
| Investments | `fund.holdings` (loại, lớp, điều khoản, mô hình, trạng thái) |
| Transactions / Audit logs | `fund.ledger` (bút toán chuỗi băm), `inbox`, `events` |
| Capital commitments / Capital calls | `holding.commit/unfunded/paidIn`, bút toán `COMMIT`/`CALL`/`UNCOMMIT` |
| Fund contracts / Fee schedules | `holding.terms` (mgmt, carry, pref, catchUp, waterfall, clawback, keyPerson), `nego` |
| Scenario events | `events`, `fired`, `persist`, `pending` |
| Missions / Quiz attempts / Knowledge mastery | `missions`, `quizHist`, `wrong`, `know` |
| Achievements | `ach`, `career`, `careerHist` |

Lược đồ Prisma tương ứng có thể giữ nguyên tên trường; sổ cái nên là bảng chỉ-thêm (append-only) với khóa `(gameId, seq)`, và máy chủ chạy `endQuarter` (server-authoritative) để chống sửa số.

## 5. WiData

Theo danh sách công cụ WiData MCP có trong phiên làm việc: vĩ mô, hàng hóa, quỹ mở Việt Nam, trái phiếu, cổ phiếu, ngành, tin tức. **Không có dữ liệu private equity, hedge fund, hạ tầng hay giao dịch bất động sản tư nhân.** Game chạy hoàn toàn không cần WiData; mọi dữ liệu là mô phỏng có nhãn. Chưa tích hợp WiData ở giai đoạn này (đúng kế hoạch: “Giai đoạn 3 — mở WiData khi có quyền truy cập”). Nếu tích hợp sau: một adapter riêng nạp chuỗi vĩ mô/hàng hóa do người dùng tự nhập (như Bond Empire), có bộ nhớ đệm, xử lý lỗi, hiển thị nguồn và thời điểm; không đưa dữ liệu WiData vào repository công khai; không đặt khóa API ở frontend.

## 6. Multiplayer (mở rộng tương lai)

Thiết kế cho phép: (1) giải đấu danh mục — mọi người chơi dùng cùng seed và kịch bản, so sánh điểm Hội đồng; (2) đàm phán nhiều người — server giữ ngân sách điểm của từng bên; (3) hội đồng đầu tư hợp tác — các vai (CIO, CRO) bỏ phiếu cho quyết định. Cần server giữ trạng thái và chạy vòng quý. Không cá cược, không tiền thật, không phần thưởng đổi ra tiền. Chưa triển khai; single-player không phụ thuộc phần này.

## 7. Bảo mật và toàn vẹn

Không có khóa API hay bí mật trong mã. Dữ liệu chỉ nằm trong trình duyệt. Nội dung người dùng và tệp nhập được escape khi hiển thị; tệp nhập giới hạn 3 MB và phải qua kiểm tra schema. Chỉnh sửa tệp lưu được phát hiện (mã kiểm tra + đối soát sổ cái) nhưng không thể ngăn tuyệt đối khi không có server. Nút “Hỏi CFA Tutor (AI)” dùng trợ lý có sẵn của website với cấu hình khóa riêng của người dùng; game không lưu khóa.

## 8. Kiểm thử

- `node --test tests/*.test.js` — toàn site 144 test (23 của Alternative Empire): công thức so với số tính tay, IRR không nghiệm/nhiều nghiệm, waterfall, clawback, bất biến sổ cái trên 3 seed × 20 quý × 17 loại tài sản, J-curve, bán thứ cấp, lockup, thiếu tiền, luật thương vụ/đàm phán, nhiệm vụ/quiz/hệ quả trễ, lưu–tải–chạy tiếp, phát hiện chỉnh sửa, chuyển đổi tệp cũ, chiến dịch 7 chương, thua do cam kết quá sức.
- Playwright: chơi chương 1–2 qua giao diện, kiểm tra 17 màn hình, chương 6 với danh mục đầy đủ, quyết định, bán/chính sách/thoái vốn, xuất/nhập/lưu sang ô khác, CSV, CFA Tutor, tải lại trang, điện thoại 390 px không tràn ngang.

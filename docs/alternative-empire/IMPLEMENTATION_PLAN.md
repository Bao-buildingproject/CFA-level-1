# Alternative Empire — Implementation Plan và trạng thái

Trạng thái: ✅ xong và đã kiểm thử · ◐ có nhưng đơn giản hóa · ✗ chưa làm.

## Phase 1 — Foundation ✅
- ✅ Kiểm tra repository; chọn kiến trúc tĩnh giống các game hiện có (lý do: TECHNICAL_ARCHITECTURE.md §1).
- ✅ Đọc PDF Volume 8 (7 LM), lập bản đồ giáo trình → game (GDD §8), phân biệt nội dung giáo trình với giả định game (GDD §9).
- ✅ Layout chính: rail điều hướng, thanh trạng thái (quý, NAV, tiền mặt, unfunded, niềm tin, cấp), route `#/alt`, mục menu dưới Bond Empire, ô Playground.
- ✅ Game State Engine: trạng thái JSON, vòng quý, lưu có phiên bản.
- ✗ Database + authentication server: không có server (dùng tài khoản và bộ nhớ của website).

## Phase 2 — Playable MVP ✅
- ✅ Ván mới (tên, độ khó, seed, ô lưu), 100 triệu USD mô phỏng.
- ✅ Chương 1 đầy đủ; ba cơ hội đầu tư; chọn hợp đồng và đàm phán term sheet; danh mục cập nhật; thời gian trôi; sự kiện kinh tế; NAV và phí; lưu và tải lại; báo cáo cuối quý.

## Phase 3 — Financial Simulation ✅
- ✅ Chương 2; hệ thống lợi nhuận và phí (độc lập/sau phí QL, hard/soft hurdle, catch-up, HWM, either/or, American/European, clawback, IRR nhiều nghiệm, MOIC/TVPI/DPI/RVPI, J-curve, đòn bẩy, FoF); báo cáo từ gộp tới ròng; test.

## Phase 4 — Content Expansion ✅
- ✅ Chương 3–7 với dữ liệu nhiệm vụ và cơ chế riêng (doanh nghiệp nhiều kết cục, bản đồ dự án và kịch bản nhu cầu, thời tiết/mùa vụ/hàng hóa, hedge fund đòn bẩy và rút vốn, tài sản số và lưu ký), kết cục cuối game.
- ◐ “AI advisor”: cố vấn theo quy tắc ở Trụ sở (ghi rõ không phải AI) + nút “Hỏi CFA Tutor (AI)” mở trợ lý Gemini có sẵn của website với câu hỏi/bài tính đính kèm. Chưa có AI phân tích toàn bộ danh mục.

## Phase 5 — Polish ◐
- ✅ Menu có chuyển động, chuyển cảnh nhẹ, tôn trọng giảm chuyển động; âm thanh bật/tắt (mặc định tắt); responsive (desktop → điện thoại); trạng thái lỗi trong máy tính/form; tooltip thuật ngữ; biểu đồ SVG có giá trị khi rê chuột.
- ◐ Trạng thái “đang tải”: mô phỏng một quý chạy tức thời (< 50 ms) nên chỉ có trạng thái “Đang mô phỏng…” trên nút.
- ✗ Nhạc nền, minh họa nhân vật vẽ tay (đang dùng avatar chữ cái).

## Phase 6 — Quality Assurance ✅ (trong phạm vi không có server)
Đã kiểm thử: công thức tài chính; luồng giao dịch; vòng đời dự án (xây dựng → khai thác → định giá; startup → mốc → thoái vốn/thất bại; LBO → covenant → thoái vốn; distressed → tái cấu trúc); lưu/tải; tải lại trình duyệt; thiếu tiền mặt (hạn mức → bán → vay khẩn cấp); unfunded commitments; thay đổi định giá; nhiều sự kiện chồng nhau (cú sốc kéo dài + sự kiện mới + hệ quả trễ); biên (IRR không/nhiều nghiệm, dòng tiền âm, khoảng/bước nhập); responsive; phát hiện chỉnh sửa tệp lưu. Chưa có: kiểm thử bảo mật server (không có server), kiểm thử khả năng truy cập bằng trình đọc màn hình.

## Definition of Done — đối chiếu
| Tiêu chí | |
|---|---|
| Giao diện dùng thật, không nút vô dụng | ✅ mọi nút gọi API luật game; Playwright bấm qua các luồng chính |
| Business logic hoạt động | ✅ |
| Đầu vào/đầu ra chính xác | ✅ đối chiếu tính tay; sổ cái đối soát mỗi quý |
| Xử lý lỗi | ✅ AltError, kiểm tra form, tệp lưu hỏng/khác phiên bản |
| Kiểm thử | ✅ 31 test + Playwright (vòng 1 và vòng 2) |
| Lưu trạng thái | ✅ |
| Không placeholder quan trọng | ✅ |

## Hạn chế đã biết
1. Không có server: không PostgreSQL, không chống gian lận tuyệt đối, không multiplayer.
2. Kinh tế theo quý và các mô hình định giá là đơn giản hóa (ghi nhãn mô hình của game).
3. Một số khái niệm ngoài LOS 2027 (direct capitalization, gross/net exposure, roll yield) chỉ dùng làm cơ chế, ghi rõ là quy ước ngành/mô hình game.
4. WiData không có dữ liệu PE/hedge fund/hạ tầng nên các tài sản này luôn mô phỏng; replay chỉ thay biến vĩ mô, cổ phiếu và hàng hóa.
5. Hội đồng và cố vấn trong game chấm theo quy tắc công khai, không phải AI; cố vấn AI (CFA Tutor) là tùy chọn, cần khóa của người dùng.
6. Bảng xếp hạng chỉ trong một trình duyệt (không có server).

## Phase 7 — Giai đoạn 3 (vòng 2) ✅
- ✅ Chế độ chơi: Sandbox, 4 Thử thách danh mục (kịch bản cố định, điều kiện thắng, kỷ lục), Giải đấu tuần + bảng xếp hạng trên máy.
- ✅ Replay thị trường thật từ WiData (11 chuỗi, 2016Q4 → 2026Q3), năm thật trên nhãn, ô trống được điền bằng mô phỏng có nhãn.
- ✅ Cố vấn AI qua CFA Tutor với bản tóm tắt danh mục.
- ✅ Ngân hàng câu hỏi 84 câu (12/LM).
- ✗ Multiplayer giữa nhiều máy (cần server).

## Bước tiếp theo đề xuất
1. Server (nếu cần): Next.js API + PostgreSQL theo bảng ánh xạ, chạy vòng quý phía server, giải đấu giữa nhiều máy.
2. Thêm câu hỏi (mục tiêu 15/LM) và bài tình huống dài cho từng LM.
3. Thêm thử thách (ví dụ: vintage year diversification, clawback sau chu kỳ thoái vốn).

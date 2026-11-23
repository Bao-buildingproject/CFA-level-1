# Hoa Tiêu · CFA Compass — AI Adaptive Learning Coach

Route `#/coach`, nhóm **Plan** của website. Đo trình độ từng tài khoản bằng bài làm thật, rồi sinh và điều chỉnh lộ trình học riêng đến ngày thi.

## 1. Kết quả kiểm tra repository (Phase 1)

| Hạng mục | Hiện trạng | Quyết định |
|---|---|---|
| Stack | HTML + JS thuần, GitHub Pages, không backend, không build | Giữ nguyên; thêm module `js/coach/*`, không viết lại gì |
| Tài khoản | Nhiều hồ sơ trong `localStorage` (`cfaStudy_profiles`, dữ liệu từng hồ sơ ở `cfaStudy_p_<id>`), mật khẩu băm | Lưu ở `DATA.coach` của từng hồ sơ → tự cô lập, tự có xuất / xóa / sao lưu |
| Curriculum | `js/modules.js`: 10 topic, 102 module 2027; `js/syllabus.js`: trọng số topic 2027 | Dùng nguyên, không tự suy đoán trọng số |
| Ngân hàng câu hỏi | 710 câu gốc có mức độ (f/a/e/h), module, thẻ LOS (324 câu); ngân hàng UWorld-sealed (`qb/*.bin`, mã hóa) | Chẩn đoán chỉ dùng ngân hàng gốc; **không** đụng ngân hàng sealed |
| Luyện tập / Mock | `quiz.js`, `mock.js` | Tái dùng giao diện câu hỏi; bài làm Practice được tính là bằng chứng |
| Tutor AI | `tutor.js`, khóa của chính người dùng | Nút “Hỏi CFA Tutor” gửi bản tóm tắt hồ sơ; Tutor không sửa tiến độ |
| API / DB | Không có | Xem mục 6 (chưa tích hợp) |

## 2. Cấu trúc

```
js/coach/bank.js        loader câu hỏi chẩn đoán (đăng ký vào STARTER_QUESTIONS → Practice/Mock cũng dùng được)
js/coach/q-<topic>.js   10 file, mỗi môn một file; q-hard.js: 30 câu khó bổ sung
js/coach/engine.js      engine thuần, tất định, không DOM: chọn đề, phiên thi, phân tích, ưu tiên, kế hoạch, ôn ngắt quãng
js/coach/ui.js          giao diện (dashboard, setup, chẩn đoán, phân tích, kế hoạch, ôn ngắt quãng, phương pháp)
css/coach.css
tests/coach.test.js     34 test (engine + ngân hàng)
```

## 3. Ngân hàng câu hỏi chẩn đoán (10 môn, dễ → khó đan xen)

180 câu viết riêng, 18 câu / topic, tách thành 10 file theo môn; trong mỗi file thứ tự dễ–vừa–khó được trộn, không xếp tăng dần. Mỗi câu có: `id` (`cq-<module>-nn`), topic, module 2027, thẻ kỹ năng (LOS), độ khó 1–3, thời gian ước tính (60/90/130 giây, +25 giây cho câu tính toán), cờ tính toán, đáp án, giải thích, nguồn `coach`. Đáp án đúng được rải đều A/B/C theo băm của id. Đáp số các câu tính toán đã được kiểm lại bằng tính tay.

| Topic | Dễ | Vừa | Khó |
|---|---|---|---|
| mỗi topic | 5–8 | 5–8 | 4–6 (gồm q-hard) |

Ghi chú: “LOS” ở đây là thẻ kỹ năng theo module. Kho dữ liệu không có mã LOS chính thức của CFA Institute nên không gắn mã giả.

## 4. Luồng và thuật toán

1. **Thiết lập 4 bước**: thông tin, thời gian (giờ/ngày, ngày học, ngày bận dạng khoảng, giờ ưa thích, phiên tối đa, nghỉ), kiến thức đã học (10 topic và từng module, tự tin 1–5), cách đánh giá (A/B/C/D, mặc định khuyến nghị Hybrid khi ≥ 2 giờ/ngày).
2. **Chẩn đoán**: 45 phút = 30 câu, 90 phút = 60 câu; phân bổ theo trọng số 2027 (largest remainder), tối thiểu 2 câu/topic, tỷ lệ dễ/vừa/khó 30/45/25, rải đều module, ưu tiên câu chưa làm, thứ tự xáo trộn. Phiên thi chỉ lưu id, đáp án người học, cờ, thời gian — **không có khóa đáp án**; đồng hồ chạy theo giờ thật; tải lại trang vẫn tiếp tục; hết giờ tự nộp; sau khi hết giờ hoặc nộp không sửa được.
3. **Phân tích**: chỉ lần làm đầu tiên của mỗi câu là bằng chứng; độ chính xác có trọng số độ khó (0,8/1,0/1,3); khoảng tin cậy 90% (Wilson); dưới 4 câu → “chưa đủ bằng chứng”; ngưỡng Vững ≥ 80, Đang tiến bộ 65–79, Cần cải thiện 50–64, Yếu < 50 (chỉnh trong `CONFIG`). Mức nắm vững = bằng chứng co về ước tính ban đầu từ tự đánh giá (trọng số bằng 2 câu hỏi). Phân loại lỗi (thời gian / tính toán / khái niệm) là giả thuyết, có nhãn mức bằng chứng.
4. **Điểm ưu tiên** = 0,30 lỗ hổng + 0,25 tỷ trọng đề + 0,20 nguy cơ quên + 0,15 nền tảng + 0,10 khẩn cấp (mỗi thành phần 0–1). Heuristic ban đầu, cấu hình được, không phải mô hình đã được xác nhận.
5. **Kế hoạch**: ngày → phiên → nhiệm vụ, 4 giai đoạn (tỷ lệ phụ thuộc phần kiến thức chưa học), ngày cuối nhẹ, thi thử trong giai đoạn 4, ôn ngắt quãng 1/3/7/14/30 ngày sau khi học, thời gian tối thiểu cho mọi topic. Không xếp quá số giờ mỗi ngày; nếu thiếu thời gian thì liệt kê phần chưa xếp và gợi ý số giờ cần.
6. **Thích ứng**: bỏ lỡ không đánh dấu hoàn thành và không giảm điểm năng lực; bỏ ≥ 3 ngày → 3 ngày sau nhẹ hơn 20%; liên tục hoàn thành < 60% → lịch theo giờ thật; mỗi lần đổi lịch thêm một phiên bản (bản cũ giữ lại); topic tự nhận đã học kỹ nhưng ít bài làm → nhiệm vụ “kiểm tra xác nhận” 10 câu; đạt ≥ 80% (≥ 10 câu) thì chuyển sang duy trì.
7. **Hoàn thành có bằng chứng**: luyện/ôn cần trả lời ≥ 80% số câu; học cần kiểm tra nhanh 5 câu (≥ 60%) hoặc ghi “tự báo cáo” (không đổi mức nắm vững); thi thử cần Mock exam hoàn tất trong ngày.
8. **Ôn ngắt quãng**: khoảng cách giãn khi nhớ tốt, co khi quên; ước tính ghi nhớ e^(−ngày/độ bền).
9. **Sẵn sàng**: tổng có trọng số theo tỷ trọng topic, kèm khoảng tin cậy; không hiển thị khi < 5 topic đủ dữ liệu hoặc < 20 câu; không phải xác suất đỗ.

## 5. Kiểm thử

`node --test tests/*.test.js` (toàn site 186 test, 34 của Hoa Tiêu). Đối chiếu danh sách yêu cầu: hai tài khoản khác nhau → kế hoạch khác; không đọc chéo dữ liệu (engine thuần + lưu theo hồ sơ); xác nhận thành thạo rút ngắn kế hoạch; bỏ học 3 ngày → lịch khả thi; bài 45 phút tự kết thúc; bài 90 phút giữ đáp án sau khi tải lại; hết giờ không sửa được; môn ít câu gắn nhãn thiếu bằng chứng; phiên thi không lộ đáp án; không đánh dấu hoàn thành khi chưa học; đổi lịch không xóa lịch sử; múi giờ và đổi ngày thi; tính toán ngày qua DST. Playwright: thiết lập, thi 30 câu, tải lại giữa chừng, nộp, kết quả, dashboard, phân tích, 5 tab kế hoạch, hết giờ tự nộp, điện thoại 390 px không tràn ngang, tài khoản thứ hai không thấy dữ liệu.

## 6. Chưa làm được (không giả vờ)

| Yêu cầu | Trạng thái | Lý do / cần gì |
|---|---|---|
| Kết nối ngân hàng câu hỏi bằng API + khóa API, trạng thái đồng bộ | **Chưa** | Trang tĩnh, không server để giữ khóa an toàn; ngân hàng nội bộ đã dùng trực tiếp. Cần backend (FastAPI/Next.js) |
| PostgreSQL, migration, phân quyền server-side, audit log, rate limit | **Chưa** | Chưa có backend. Cô lập tài khoản dựa trên hồ sơ trình duyệt, không phải bảo mật máy chủ |
| Trang quản trị, thống kê tổng hợp, quản lý phiên bản AI Planner | **Chưa** | Cần backend và vai trò |
| Mock exam 180 câu có phân tích | Một phần | Dùng trang Mock exams sẵn có; kết quả mock chưa đi vào phân tích Hoa Tiêu; ngân hàng gốc chưa đủ để dựng đề 180 câu đúng trọng số |
| Mã LOS chính thức | **Chưa** | Kho dữ liệu không có danh sách LOS chính thức; dùng thẻ kỹ năng theo module |
| Đồng bộ nhiều thiết bị | **Chưa** | Dữ liệu trong trình duyệt; dùng xuất/nhập sao lưu |
| Học liệu RAG | **Chưa** | Không có học liệu được cấp phép để lập chỉ mục |

Khi có backend, bảng DB đề xuất (từ yêu cầu): users, user_study_profiles, exam_targets, curriculum_versions, topics, learning_modules, learning_outcomes, questions, question_versions, question_bank_integrations, assessments, assessment_questions, assessment_attempts, user_answers, topic/module/los_performance, mastery_history, study_plans, study_plan_versions, study_tasks, learning_sessions, review_schedule, ai_recommendations, user_feedback, activity_logs. Các cấu trúc trong `DATA.coach` (`profile`, `attempts`, `session`, `history`, `plan`, `versions`, `reviews`, `learned`, `confirmed`, `log`) ánh xạ gần một-một sang các bảng này.

## 7. Cấu hình và triển khai

Không cần cấu hình: đẩy lên GitHub Pages là chạy. Chỉnh ngưỡng/trọng số trong `CONFIG` của `js/coach/engine.js`. Tutor cần khóa API của chính người dùng (đặt trong Tutor, không có trong mã).

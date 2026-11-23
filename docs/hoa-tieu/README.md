# Hoa Tiêu · CFA Compass — huấn luyện viên học tập (v2)

Route `#/coach`, nhóm **Plan** của website. Trên điện thoại: thẻ **Hoa Tiêu** ở thanh dưới cùng, dòng đầu của mục *Today* ở trang Home và mục đầu tiên trong *More*. Đo trình độ từng tài khoản bằng bài làm thật, lập lộ trình học riêng đến ngày thi, **hiện kế hoạch ngay sau khi tạo** (`#/coach/plan/ready`) và tự điều chỉnh khi có kết quả mới hoặc khi bỏ lỡ ngày học.

## 1. Vì sao làm lại (v1 → v2)

Người dùng không tìm thấy kết quả đánh giá và kế hoạch sau khi làm. Nguyên nhân đã tìm ra:

| Nguyên nhân | Sửa trong v2 |
|---|---|
| Mỗi lần lưu, tài khoản ghi lại toàn bộ chữ của 890 câu hỏi có sẵn (~550 KB) cộng dữ liệu Hoa Tiêu v1 (~1,2 MB, kế hoạch lưu đầy đủ từng ngày). Bộ nhớ trình duyệt đầy → `localStorage` từ chối ghi mà không báo, kết quả và kế hoạch mất khi tải lại trang. | Câu hỏi có sẵn chỉ lưu tiến độ (id, lần làm, cờ, sổ lỗi sai), chữ câu hỏi dựng lại khi mở (`js/storage.js`). Dữ liệu Hoa Tiêu lưu dạng gọn (kế hoạch nén, bài làm nén). Sau một hành trình đầy đủ: ~51 KB Hoa Tiêu, ~101 KB cả tài khoản. Nếu vẫn không ghi được, trang báo ngay và nhắc xuất sao lưu. |
| Tài khoản bật “ẩn Practice/Mock” không thấy đường vào bài làm. | Bài chẩn đoán, luyện tập, ôn tập, kiểm tra và thi thử 180 câu đều chạy **bên trong** Hoa Tiêu (`js/coach/run.js`). |
| Tạo kế hoạch xong không có trang nào trình bày kế hoạch. | Bấm “Tạo kế hoạch” → mở thẳng trang **Kế hoạch của bạn**: số liệu, lý do, 4 giai đoạn, giờ theo topic, theo tháng, 7 ngày tới, hôm nay theo phiên có giờ bắt đầu, phần chưa xếp được, nút in/PDF, lịch `.ics`, bảng tính `.csv`. |
| Engine v1: ôn tập lặp mỗi ngày, bài học dài bị mất phần cuối, thứ tự topic sai (FI-06 trước FI-01), lịch nhồi 266 giờ “đọc lại”, thiếu thời gian thì bỏ cả topic. | Engine viết lại (mục 6), mỗi lỗi có test riêng. |

## 2. Cấu trúc

```
js/coach/bank.js        đăng ký câu hỏi Hoa Tiêu vào STARTER_QUESTIONS (kèm skill, độ khó, thời gian ước tính, đáp án bẫy)
js/coach/q-<topic>.js   10 file, mỗi môn một file; q-hard.js: câu khó bổ sung cho cả 10 môn
js/coach/engine.js      engine thuần (không DOM, tất định, UMD `CoachEngine`): chọn đề, phiên làm bài, phân tích,
                        mức nắm vững, ưu tiên, lập kế hoạch, lập lại kế hoạch, ôn ngắt quãng, xuất lịch, nén dữ liệu
js/coach/store.js       lớp dữ liệu (`window.HT`): đọc bằng chứng từ Hoa Tiêu + Practice/Mock + Question Bank,
                        giữ kế hoạch và các phiên bản, ghi nhận hoàn thành, tự cập nhật mỗi ngày
js/coach/run.js         trang giới thiệu bài, phòng thi / chế độ luyện, nộp bài, báo cáo kết quả
js/coach/ui.js          các trang: chào, thiết lập 5 bước, tổng quan, kế hoạch (+ in), đánh giá, phân tích,
                        lời giải, ôn tập, ngân hàng câu hỏi, phương pháp
css/coach.css
tests/coach.test.js     50 test engine + ngân hàng câu hỏi;  tests/storage.test.js  4 test lưu trữ gọn
```

## 3. Luồng người dùng

1. **Thiết lập 5 bước**: thông tin cá nhân (tên, ngày thi, mục tiêu, nền tảng) → thời gian học (giờ/ngày hoặc giờ riêng từng thứ, ngày học trong tuần, ngày bận dạng `2026-12-24..2026-12-26`, khung giờ ưa thích, phiên tối đa, nghỉ giữa phiên) → kiến thức đã học (10 topic, từng module, tự tin 1–5) → cách đánh giá → xác nhận (tóm tắt và số giờ khả dụng).
2. **Kế hoạch của bạn** hiện ngay. Kế hoạch đầu tiên dựa trên tự đánh giá; nếu chưa có bài chẩn đoán, ngày đầu có bài chẩn đoán 45 phút để hiệu chỉnh.
3. **Hôm nay**: nhiệm vụ theo phiên có giờ bắt đầu; mỗi nhiệm vụ có nút làm ngay (bài làm trong Hoa Tiêu, mở bài học, mở set Question Bank, xem lời giải…).
4. **Báo cáo** sau mỗi bài: điểm, theo độ khó, theo topic (có cảnh báo khi ít câu), danh sách lỗi theo loại, xem lại từng câu kèm giải thích, và thẻ **“Kế hoạch đã được cập nhật · phiên bản N”** kèm danh sách thay đổi.
5. Khi kế hoạch tự lập lại (bỏ lỡ nhiệm vụ, có ≥ 10 câu trả lời mới, đổi ngày thi, nâng cấp), một thông báo ở đầu mọi trang Hoa Tiêu **ở lại đến khi mở kế hoạch hoặc bấm đóng**.

## 4. Bài làm

| Loại | Số câu | Thời gian | Chế độ |
|---|---|---|---|
| Chẩn đoán nhanh | 30 (đủ 10 môn) | 45 phút | thi |
| Chẩn đoán toàn diện | 60 | 90 phút | thi |
| Xác nhận thành thạo (topic tự nhận đã vững) | 10 | 15 phút | thi |
| Kiểm tra nhanh module (sau khi học) | 5 | 8 phút | thi |
| Kiểm tra cuối topic | 15 | 25 phút | thi |
| Thi thử | 180 = 2 phiên × 90 câu | 2 × 135 phút | thi |
| Luyện tập / ôn ngắt quãng / ôn lỗi sai | 10 / 5 / 10 | không giới hạn | luyện |

- **Chế độ thi**: đồng hồ theo giờ thật, bắt đầu khi bấm “Bắt đầu” (trang giới thiệu chưa tính giờ); tự lưu từng câu; tải lại trang vẫn tiếp tục; hết giờ tự nộp; bảng câu hỏi, gắn cờ, lọc “chưa trả lời / gắn cờ”, màn hình xem lại trước khi nộp; phím tắt 1/2/3 chọn đáp án, ←/→ chuyển câu, F gắn cờ. Tutor bị ẩn trong lúc thi. Phiên làm bài chỉ lưu id câu, đáp án đã chọn, cờ, thời gian từng câu — **không có khóa đáp án**.
- **Chế độ luyện**: chọn xong thấy ngay đúng/sai và giải thích, không đổi được đáp án; Enter để sang câu tiếp.
- **Chọn câu**: phân bổ theo trọng số đề 2027 (largest remainder, tối thiểu 1–2 câu/topic), trộn dễ/vừa/khó (chẩn đoán 30/45/25, thi thử 25/50/25), rải đều module, xen kẽ câu tính toán và câu khái niệm, **ưu tiên câu chưa làm**. Nguồn: 890 câu của website (710 câu sẵn có + 180 câu viết riêng cho Hoa Tiêu), phủ 102 module.
- **Thi thử**: phiên 2 không trùng câu phiên 1; báo cáo chung sau phiên 2 có biểu đồ nhịp độ từng phiên và so sánh với lần thi thử trước.

## 5. Phân tích (5 cấp)

1. **Topic** → 2. **Module** → 3. **Kỹ năng** (thẻ kỹ năng theo module, không phải mã LOS chính thức) → 4. **Loại lỗi** → 5. **Phản hồi riêng**.

- Chỉ **lần làm đầu tiên** của mỗi câu là bằng chứng. Độ chính xác có trọng số độ khó (0,8 / 1,0 / 1,3). Khoảng tin cậy 90% (Wilson). Dưới 4 câu: “chưa đủ bằng chứng”; 4–7 thấp, 8–14 vừa, ≥ 15 cao. Ngưỡng: Vững ≥ 80%, Đang tiến bộ ≥ 65%, Cần cải thiện ≥ 50%, Yếu < 50%.
- **Mức nắm vững** theo tầng: tự đánh giá → topic → module (mỗi tầng co về tầng trên với trọng số 3 câu). Điểm Question Bank (lần chấm gần nhất, có thể là làm lại) tính 0,6 câu.
- **Loại lỗi** (giả thuyết, kèm mức bằng chứng — ≥ 3 lần “vừa”, 2 lần “yếu”, 1 lần “chưa đủ”): hết giờ/bỏ trống; chọn đúng đáp án bẫy điển hình (tính toán hoặc khái niệm); sai tính toán; sai khái niệm; câu tốn > 2× thời gian ước tính; “có thể do bất cẩn” chỉ khi ≥ 3 câu dễ trả lời < 30% thời gian ước tính và topic đó đúng ≥ 70%.
- **Xu hướng**: chỉ so các bài có ≥ 5 câu của topic và độ khó trung bình chênh ≤ 0,4; ±15 điểm mới gọi là tiến bộ/giảm.
- **Hiệu chỉnh tự đánh giá**: tự chấm ≥ 4 nhưng kết quả Cần cải thiện/Yếu → “đánh giá cao hơn thực tế”; ngược lại → “đánh giá thấp hơn”.
- **Cần khắc phục**: sai ≥ 4 trong 5 câu gần nhất (khác nhau) của một kỹ năng → chuỗi khắc phục: xem lời giải từng bước → luyện câu mới → kiểm tra lại; không xếp thêm câu cùng loại một cách máy móc.
- **Độ sẵn sàng**: chỉ hiện khi ≥ 5 topic đủ bằng chứng và ≥ 20 câu; là chỉ số nội bộ, **không phải xác suất đỗ**.

## 6. Lập kế hoạch

- **Nhu cầu**: 300 giờ tham chiếu cho Level I (giả định, ghi rõ trong trang Phương pháp), một nửa cho học lần đầu, chia cho từng module theo trọng số đề (40–240 phút/module), nhân với phần kiến thức còn thiếu. Module có mức nắm vững ≥ 0,8 không học lại từ đầu.
- **Độ sâu**: thời gian dư thì học sâu hơn (tối đa ×1,4), còn dư nữa thì **để trống** (không nhồi việc); thiếu thời gian thì rút gọn (tối thiểu ×0,75) và mỗi topic vẫn có phần học, phần còn lại liệt kê ở “Chưa xếp được” kèm số giờ cần thêm.
- **Thứ tự**: nền tảng định lượng QM-01 → QM-05 trước; topic theo thứ tự giáo trình, QM trước FI/DER/PM/EQ/CI, FSA trước EQ/CI; module trong topic theo thứ tự.
- **Mỗi module**: học theo khối ≤ 60 phút (và ≤ một phiên) → luyện 8 câu ngay sau phần cuối → ôn ngắt quãng 5 câu/10 phút sau 1, 3, 7, 14, 30 ngày (ôn ≤ 20% thời gian một ngày). Cuối mỗi topic: kiểm tra 15 câu. Module đã vững vẫn vào lịch ôn để duy trì.
- **Duy trì**: mỗi topic nhận ít nhất một nửa phần thời gian theo trọng số đề, kể cả topic đã vững.
- **Mỗi tuần**: 10% dự phòng để bắt kịp, ôn công thức và ôn lỗi sai định kỳ.
- **4 giai đoạn**: (1) nền tảng & lấp lỗ hổng — chẩn đoán, xác nhận topic tự nhận đã vững, khắc phục, QM-01→05; (2) học nội dung chính; (3) củng cố & luyện tập; (4) thi thử 180 câu (2 phiên × 135 phút, 60 phút phân tích sau mỗi lần) & ôn cuối; ngày trước ngày thi chỉ ôn nhẹ 60 phút.
- **Lịch ngày**: không vượt số giờ đã khai; chia phiên theo độ dài tối đa và thời gian nghỉ; giờ bắt đầu theo khung ưa thích (sáng 7:00, chiều 14:00, tối 19:30), lùi sớm hơn để kết thúc trước 23:30; tôn trọng ngày nghỉ và ngày bận.
- **Điểm ưu tiên** (dùng để chọn việc khi thiếu thời gian và cho gợi ý): 0,30 lỗ hổng + 0,25 tỷ trọng đề + 0,20 nguy cơ quên + 0,15 nền tảng + 0,10 khẩn cấp. Heuristic cấu hình được, không phải mô hình đã kiểm định.
- **Question Bank**: nếu thiết bị này đã mở khóa Question Bank, các set của module được giao làm nhiệm vụ luyện khi câu của website đã dùng hết; điểm set là bằng chứng (0,6). Hoa Tiêu chỉ đọc điểm, không hiển thị nội dung câu hỏi của Question Bank.

## 7. Thích ứng và phiên bản

- Tự kiểm tra **mỗi ngày một lần** khi mở Hoa Tiêu: có nhiệm vụ trễ, có ≥ 10 câu trả lời mới, đổi ngày thi, hoặc nâng cấp từ v1 → lập lại kế hoạch từ hôm nay. Sau bài chẩn đoán, kiểm tra xác nhận/cuối topic, kiểm tra nhanh module và phiên 2 thi thử cũng lập lại ngay.
- Nhiệm vụ trễ **không** tính là hoàn thành và **không** trừ điểm năng lực; phần học bị lỡ được xếp lại.
- Nghỉ ≥ 3 ngày liền → 3 ngày tới nhẹ hơn 20%. Hoàn thành < 60% trong ≥ 7 ngày → lịch mới theo nhịp thật (có cảnh báo, giữ quyền đặt lại số giờ).
- Mỗi lần lập lại thêm một **phiên bản** (lý do, ngày, tóm tắt, danh sách thay đổi như “FI: +16,5 giờ”); phiên bản cũ không bị xóa. Nhiệm vụ đã xong hôm nay được giữ nguyên.

## 8. Hoàn thành có bằng chứng

| Nhiệm vụ | Được tính khi |
|---|---|
| Bài thi (chẩn đoán, xác nhận, kiểm tra, thi thử) | đã nộp trong Hoa Tiêu |
| Luyện tập, ôn ngắt quãng, ôn lỗi sai | trả lời ≥ 80% số câu |
| Set Question Bank | có thêm ≥ 80% số câu được chấm trong set |
| Học module | kiểm tra nhanh 5 câu đạt ≥ 60% → **đã xác nhận**; bấm “Tôi đã học xong” → **tự báo** (không đổi mức nắm vững) |
| Ôn công thức, dự phòng, phân tích thi thử, đọc lại | tự báo |

Topic tự nhận đã vững được xác nhận khi bài xác nhận có ≥ 10 câu và đạt ≥ 80% (có trọng số độ khó) → chuyển sang duy trì.

## 9. Lưu trữ, cô lập, xuất

- Dữ liệu nằm trong `DATA.coach` (v2) của từng tài khoản → tách biệt giữa các tài khoản, theo sao lưu/xóa của website. Dữ liệu v1 được chuyển đổi tự động.
- Xuất: **In / lưu PDF** (bảng kiểm theo tuần, `#/coach/plan/print`), **lịch `.ics`** (mỗi phiên một sự kiện, giờ địa phương), **bảng tính `.csv`** (mỗi nhiệm vụ một dòng); xuất/xóa dữ liệu Hoa Tiêu dạng JSON ở trang Phương pháp.
- CFA Tutor: các câu hỏi nhanh gửi kèm tóm tắt hồ sơ; Tutor chỉ giải thích, không sửa tiến độ hay kế hoạch.

## 10. Kiểm thử

`node --test tests/*.test.js` — toàn site **206 test** đều đạt (Hoa Tiêu 50, lưu trữ 4). Nhóm test Hoa Tiêu: toàn vẹn ngân hàng câu hỏi; chọn đề và thi thử 180 câu; phiên làm bài (chưa bắt đầu, hết giờ, tải lại, không lộ đáp án, chế độ luyện, chấm đáp án bẫy); phân tích (ngưỡng, lần đầu, độ khó, trọng số Question Bank, loại lỗi, xu hướng, hiệu chỉnh, khắc phục); kế hoạch (giới hạn giờ, thứ tự giáo trình, luyện sau khi học, kiểm tra cuối topic, ôn 1/3/7/14 ngày không lặp, hai tài khoản khác nhau, tất định, thiếu/dư thời gian, ngày bận, đổi ngày thi, Question Bank thay câu đã hết, xác nhận topic, khắc phục, duy trì, nén < 70 KB); bỏ lỡ ngày; nhịp thật; phiên bản; quy tắc hoàn thành; ôn ngắt quãng; độ sẵn sàng; gợi ý; cô lập; chuyển đổi v1.

Kiểm tra trên trình duyệt (Playwright, máy tính và điện thoại 390 px, sáng/tối): thiết lập → kế hoạch hiện ngay; bài 30 câu, tải lại giữa chừng còn 29/30 câu, nộp, báo cáo, kế hoạch phiên bản 2; nhiệm vụ luyện được xác nhận qua bài làm; thi thử 90 + 90 câu không trùng và báo cáo chung; bài hết giờ tự nộp và không sửa được; nâng cấp từ v1; bỏ lỡ 5 ngày → lập lại, ngày đầu nhẹ hơn; thông báo cập nhật ở lại đến khi mở kế hoạch hoặc đóng; xuất `.ics`/`.csv`/PDF; không tràn ngang, không lỗi console.

## 11. Chưa làm được (không giả vờ)

| Yêu cầu | Trạng thái | Lý do / cần gì |
|---|---|---|
| Kết nối ngân hàng câu hỏi bên ngoài bằng API + khóa API | **Chưa** | Trang tĩnh, không có server để giữ khóa an toàn (khóa không được nằm ở frontend). Cần backend |
| Cơ sở dữ liệu server, phân quyền server-side, audit log, rate limit | **Chưa** | Chưa có backend; cô lập tài khoản dựa trên hồ sơ trình duyệt, không phải bảo mật máy chủ |
| Trang quản trị, thống kê nhiều người dùng | **Chưa** | Cần backend và vai trò |
| Đồng bộ nhiều thiết bị | **Chưa** | Dữ liệu ở trình duyệt; dùng xuất/nhập sao lưu |
| Mã LOS chính thức | **Chưa** | Không có danh sách LOS chính thức trong kho; dùng thẻ kỹ năng theo module |
| Học liệu RAG | **Chưa** | Không có học liệu được cấp phép để lập chỉ mục |

Khi có backend, các cấu trúc trong `DATA.coach` (`profile`, `att`, `sess`, `hist`, `plan`, `ver`, `rev`, `learned`, `confirmed`, `log`, `progress`) ánh xạ gần một-một sang các bảng đề xuất trong yêu cầu (users, study_profiles, assessments, user_answers, mastery_history, study_plans, study_plan_versions, study_tasks, review_schedule…).

## 12. Cấu hình

Không cần cấu hình: đẩy lên GitHub Pages là chạy. Ngưỡng, trọng số, thời lượng nằm trong `CONFIG` của `js/coach/engine.js`. Hoa Tiêu không phải sản phẩm của CFA Institute và không được CFA Institute tài trợ hay công nhận; câu hỏi là bài luyện nội bộ, không phải đề thi chính thức.

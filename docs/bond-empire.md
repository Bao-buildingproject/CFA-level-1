# Bond Empire: The Yield War — Game Design Document và tài liệu kỹ thuật

Bond Empire là trò chơi chiến lược trái phiếu theo phạm vi CFA Level I Fixed Income (19 Learning Module).
- Mở tại `#/bond`, ngay dưới mục **Phái sinh · Trading Arena** trong menu.
- Cũng có trong Playground và trang More.

Trò chơi dùng tiền ảo. Mọi tổ chức phát hành, nhân vật và tài liệu trong cốt truyện đều là hư cấu.
Nội dung nhiệm vụ do trò chơi tự viết, không chép câu chữ hay câu hỏi của tài liệu CFA.

## 1. Khái niệm

| Mục | Nội dung |
|---|---|
| Thể loại | Financial Strategy RPG × Bond Trading Simulation × Portfolio Management × Economic Simulation × Financial Detective |
| Điểm xuất phát | Junior Fixed Income Analyst tại Aurora Capital (hư cấu), 100.000.000 ₫ ảo, danh mục trống |
| Đích đến | Chief Investment Officer, rồi Founder of an Investment Fund |
| Vòng chơi | Nhận nhiệm vụ → dùng công cụ (Terminal, Curve Lab, Duration Center, Factory…) → hành động (định giá, đặt lệnh, tái cơ cấu, thiết kế cấu trúc, điều tra) → engine chấm điểm theo 6 tiêu chí → nhận XP, lên cấp, mở chương sau |
| Thất bại | Nhiệm vụ dưới 60% thì phải làm lại. Danh mục có thể lỗ thật trong mô phỏng: vỡ nợ, cú sốc lãi suất, bán tháo khi thiếu tiền chi trả. Chương 7 có kết thúc "Bị thay thế". |

**Nguyên tắc thiết kế:**
- Không có lợi nhuận được lập trình sẵn.
- Không có giao dịch trang trí.
- Giá được tính từ đường cong lợi suất cộng spread.
- Dữ liệu thật, dữ liệu mô phỏng và giả định luôn được gắn nhãn.

## 2. Chiến dịch: 7 chương, 25 nhiệm vụ

| Chương | LM | Nhiệm vụ (loại) |
|---|---|---|
| 1 · The Rookie Analyst | 1–3 | Giải phẫu bản điều khoản (phân loại) · Lịch dòng tiền có điều chỉnh ngày làm việc (tính toán) · Ba bản chào bán theo tiêu chí quỹ hưu trí (lựa chọn + đánh dấu vi phạm) · Đấu thầu TPCP một giá (đặt thầu) |
| 2 · The Debt Market | 4–5 | Huy động vốn ngắn hạn: CP / hạn mức / repo · Bàn repo · Hạng đầu tư hay lợi suất cao · Đọc kết quả đấu thầu TPCP |
| 3 · The Pricing Game | 6–9 | Định giá giữa hai kỳ coupon (giá bẩn, lãi dồn tích, giá sạch) · Giải YTM và lợi suất hiện hành · Bootstrap spot và forward · Định giá FRN · Rich hay cheap (giao dịch trên Terminal theo Z-spread) |
| 4 · Duration Wars | 10–13 | Đo rủi ro (Macaulay, Modified, PVBP, convexity) · Xấp xỉ hay định giá lại · Duration Defense (đưa danh mục vào dải duration, dự báo lỗ, kích hoạt cú sốc +150 bp) · Key rate duration: bullet và barbell |
| 5 · The Credit Collapse | 14–16 | Credit Detective: Lotus Crest Land (hồ sơ 7 loại tài liệu, ghim bằng chứng, tính chỉ số, thu hồi, đề xuất) · Spread và xác suất vỡ nợ · Giảm rủi ro trước cơn bão (danh mục được bàn giao; khi đạt, Lotus Crest Land vỡ nợ trong thị trường cốt truyện) |
| 6 · Structured Finance Factory | 17–19 | Thiết kế ABS cho vay mua xe (3 lớp, kiểm tra stress CDR 8%) · Rủi ro trả trước của MBS (PSA, WAL) · CMO trả tuần tự (WAL theo yêu cầu nhà đầu tư) |
| 7 · The Yield War | 1–19 | Quỹ CIO 12 tuần trong khủng hoảng (sốc lạm phát, vỡ nợ, rút vốn 20%, giải cứu; 4 kết thúc) · Hội đồng đầu tư |

Chỉ 13 trên 25 nhiệm vụ là nhập số. Các nhiệm vụ còn lại yêu cầu hành động: giao dịch, tái cơ cấu, đặt thầu, ghim bằng chứng, thiết kế tranche, điều hành quỹ, trình bày trước hội đồng.

**Mở khóa:**
- Mỗi chương mở khi chương trước có mọi nhiệm vụ ≥ 60%.
- Hệ thống không bao giờ chỉ đáp án trước. Sau khi nộp bài, phần phản hồi giải thích cách tính.

## 3. Sáu hệ thống gameplay

1. **Bond Trading Terminal** (`#/bond/terminal/<chế độ>`)
   - Màn hình:
     - Bảng thị trường có lọc và tìm kiếm.
     - Thẻ trái phiếu: tổ chức phát hành, điều khoản, bid/ask, lãi dồn tích, giá bẩn, YTM, lợi suất hiện hành, G-spread, Z-spread, các thước đo duration và lịch dòng tiền đã điều chỉnh ngày làm việc.
     - Phiếu lệnh mua/bán.
   - Các tab: danh mục, sổ cái, giao dịch, rủi ro, tin tức.
   - Đồng hồ: 1 tuần / 4 tuần / tự chạy. Coupon, gốc và tiền thu hồi được trả đúng ngày.
2. **Yield Curve Architect** (`#/bond/curve`)
   - Sửa đường par ở 5 kỳ hạn, hoặc dịch chuyển song song, dốc lên, phẳng đi, đảo ngược, butterfly, hay nạp đường TPCP thật.
   - Biểu đồ par/spot/forward; bảng par, spot, DF, forward và par suy ngược từ spot.
   - Tác động lên trái phiếu: định giá lại so với ước tính bằng KRD.
   - Máy tính Fixed Income gồm 6 công cụ: trái phiếu, thị trường tiền tệ, repo, FRN, tín dụng, thu hồi.
3. **Credit Detective** (`#/bond/credit` và nhiệm vụ 5.1)
   - Bảng theo dõi tổ chức phát hành (hạng, triển vọng, spread, PD mô hình, spread giải thích bằng PD × LGD).
   - Hồ sơ Lotus Crest Land: ghim bằng chứng, chấm theo precision/recall, nên ghim nhầm cũng bị trừ điểm.
4. **Duration Defense** (`#/bond/risk/<chế độ>`)
   - Các thước đo: Macaulay, Modified, convexity, money duration, PVBP, KRD theo NAV.
   - 7 kịch bản cú sốc. Mỗi trái phiếu so sánh ba cách: chỉ duration, có thêm convexity, và định giá lại đầy đủ.
5. **Structured Finance Factory** (`#/bond/factory`)
   - Thác thanh toán ABS/CLO: phí → lãi theo thứ tự ưu tiên → gốc tuần tự → equity. Excess spread bù lỗ, OC hấp thụ trước, xóa nợ từ lớp thấp nhất.
   - MBS chuyển tiếp với PSA, WAL theo 6 tốc độ trả trước; CMO trả tuần tự.
6. **Investment Committee** (`#/bond/committee` và nhiệm vụ 7.2)
   - Người chơi bảo vệ một vị thế 200 trái phiếu: giá trị hợp lý, khuyến nghị, thời hạn, rủi ro lớn nhất, tác động +100 bp, khoản lỗ nếu vỡ nợ, kế hoạch rủi ro.
   - "Hội đồng" là bộ chấm theo quy tắc công khai, không phải mô hình ngôn ngữ. Mọi con số được đối chiếu với engine; câu hỏi chất vấn sinh từ dữ liệu.

## 4. Financial Engine (`js/bond/engine.js`)

Quy ước chung:
- Giá tính trên 100 mệnh giá; lãi suất viết dạng thập phân.
- Lợi suất yết theo tần suất trả coupon.
- Tiền đồng chỉ làm tròn một lần, khi tiền đổi chủ (`book.js`).
- Mỗi công thức có ví dụ tính tay trong `tests/bond.test.js`.

| Công cụ | Định nghĩa | Giả định và trường hợp biên |
|---|---|---|
| Lịch dòng tiền | Ngày coupon đếm lùi từ ngày đáo hạn theo kỳ 12/m tháng. Ngày thanh toán điều chỉnh theo Following, Modified Following hoặc Preceding. | Kỳ đầu đều (chưa xử lý kỳ lẻ). Ngày cuối tháng giữ nguyên số ngày nếu tháng đủ ngày. Lịch nghỉ chỉ tính thứ Bảy, Chủ nhật, trừ khi truyền danh sách ngày nghỉ. Ngày thanh toán trùng ngày coupon thì coupon thuộc người bán. |
| Định giá theo YTM | PV_full = Σ CF_k / (1+y/m)^(k−1+w), với w = 1 − t/T. Lãi dồn tích AI = c/m × 100 × t/T. Giá sạch = giá bẩn − AI. | t/T theo quy ước ngày: 30/360 (kiểu US), ACT/ACT, hoặc ACT/365 (AI tính theo năm 365 ngày). |
| YTM | Newton; nếu Newton ra khỏi khoảng thì chuyển sang chia đôi. | Trả `null` nếu không có nghiệm hoặc trái phiếu đã đáo hạn. |
| Lợi suất hiện hành, quy đổi lợi suất | Coupon năm ÷ giá sạch; quy đổi giữa các tần suất ghép lãi theo cùng lợi suất hiệu dụng năm. | — |
| Spot, forward, par | Bootstrap từ par năm: DF_k = (1 − p_k ΣDF) / (1 + p_k). Forward: (1+z_b)^b = (1+z_a)^a (1+f)^(b−a). Par = (1 − DF_k)/ΣDF. | Par nội suy tuyến tính giữa các kỳ hạn chuẩn, đi ngang ngoài hai đầu. Spot nội suy tuyến tính theo năm. Có thêm hàm bootstrap theo kỳ bất kỳ cho bài tập. |
| Định giá trên đường cong, Z-spread, G-spread | PV = Σ CF / (1 + z(t) + Z)^t, t tính theo ACT/365. G-spread = YTM − par nội suy tại kỳ hạn còn lại. | Chưa có I-spread vì chưa có đường swap. |
| Duration, convexity | Macaulay = Σ t·PV/P (t theo năm); Modified = Mac/(1+y/m); bản xấp xỉ dùng ±1 bp. Convexity = Σ t(t+1/m)PV/[P(1+y/m)²]. Money duration = Mod × P. PVBP = (P₋ − P₊)/2. | Các thước đo trên tính theo lợi suất của trái phiếu. |
| Duration hiệu dụng, key rate | Dịch đường par ±1 bp (cả đường hoặc từng nút), bootstrap lại, định giá lại với Z-spread giữ nguyên. | Tổng các KRD xấp xỉ duration hiệu dụng (có test). |
| Thị trường tiền tệ | Chiết khấu (năm 360), lãi cộng thêm (năm 365 hoặc 360), lợi suất tương đương trái phiếu (BEY). | — |
| Repo | Tiền vay = giá trị tài sản đảm bảo × (1 − haircut); lãi = tiền vay × r × ngày/360. | — |
| FRN | Giá = Σ (I+QM)/m / (1+(I+DM)/m)^k + 100/(1+(I+DM)/m)^N. | Lãi suất tham chiếu giả định không đổi; định giá tại ngày xác định lãi suất. |
| Tín dụng | EL = PD × (1 − RR) × giá trị vị thế. Spread ≈ PD × LGD. PD tích lũy = 1 − (1 − h)^n. Các chỉ số Nợ/EBITDA, EBITDA/lãi vay, FFO/Nợ, Nợ/Vốn. | — |
| Thu hồi | Nợ có bảo đảm lấy tài sản bảo đảm trước. Phần thiếu ngang hàng với nợ không bảo đảm ưu tiên. Sau đó lần lượt nợ thứ cấp rồi cổ đông; mỗi nhóm chia theo tỷ lệ. | — |
| ABS | Khoản vay trả đều; CDR → MDR; CPR/PSA → SMM; thu hồi ngay khi vỡ nợ. | Không có độ trễ thu hồi. Không khớp một phần theo thanh khoản. |
| MBS, CMO | Pass-through có PSA (CPR = min(6%, 0,2% × tháng) × PSA/100); WAL. CMO trả gốc tuần tự. | — |
| Đấu thầu | Khớp từ lợi suất thấp lên. Các thầu tại mức lợi suất trúng thầu chia theo tỷ lệ. Một giá hoặc nhiều giá; có trần lợi suất. | — |

**Chưa hỗ trợ:**
- Trái phiếu có quyền chọn kèm (callable/putable): chưa có cây lãi suất nhị phân. Duration hiệu dụng chỉ áp cho trái phiếu không có quyền chọn.
- Trái phiếu trả gốc dần, kỳ coupon lẻ, I-spread, OAS.

## 5. Mô phỏng thị trường (`js/bond/market.js`)

- **Đồng hồ:** bước theo tuần; sự kiện xử lý theo thứ tự thời gian.
- **Lạm phát, tăng trưởng, nguồn cung TPCP:** mỗi biến tự quay về mức cân bằng, cộng thêm cú sốc ngẫu nhiên.
- **Ngân hàng trung ương:** họp mỗi 6 tuần, điều chỉnh theo quy tắc kiểu Taylor, mỗi bước 25 bp.
- **Đường par:** dạng Nelson–Siegel.
  - Đầu ngắn bám lãi suất điều hành.
  - Đầu dài = lãi suất thực + lạm phát kỳ vọng + phần bù kỳ hạn; phần bù tăng khi nguồn cung TPCP tăng.
- **Spread:** spread của hạng × khẩu vị rủi ro × (1 + mức căng thẳng của tổ chức) + điều chỉnh theo thứ tự ưu tiên + phần bù thanh khoản.
- **Hạng tín nhiệm:** chuyển hạng theo mức căng thẳng của tổ chức.
- **Vỡ nợ:** xác suất mỗi tuần phụ thuộc hạng, khẩu vị rủi ro và mức căng thẳng; khi vỡ nợ, tỷ lệ thu hồi áp theo thứ tự ưu tiên.
- **Sự kiện ngẫu nhiên:** lạm phát, tăng trưởng, phát hành TPCP, hoảng loạn tín dụng, thanh khoản.
- **Kịch bản có sẵn:** thử thách và quỹ CIO dùng kịch bản cố định thay cho sự kiện ngẫu nhiên.
- **Giá yết:** giá mua/bán = giá giữa ± nửa chênh lệch giá (phụ thuộc hạng và thanh khoản). Phí giao dịch 0,03% (giả định).
- **Lưu trạng thái:** trạng thái bộ sinh số ngẫu nhiên được lưu cùng thị trường, nên tải lại trang vẫn ra đúng thị trường cũ.
- **Historical Replay:**
  - Đường TPCP lấy từ dữ liệu người chơi nhập, tiến từng tuần. Lợi suất chuẩn 1/3/5/10/20 năm được dùng như lợi suất par (giả định).
  - Giá tính lại từ đường cong thật; spread doanh nghiệp vẫn là mô phỏng.
  - Chỉ những tuần đã tới mới được hiển thị.

## 6. Tích hợp WiData

Luồng thực tế:

> WiData MCP (trong phiên làm việc với trợ lý) → tệp JSON cá nhân → người chơi nhập ở trang Sự nghiệp → kiểm tra dữ liệu (`validateCurveDataset`: đúng kỳ hạn, giá trị hợp lệ, sắp xếp, bỏ trùng) → `localStorage` (`cfaStudy_bond_data`) → engine thị trường → Terminal và Curve Lab

- Đã kiểm tra endpoint thực tế: `bonds_gov_yield_curve` (Việt Nam: 234528 = 1Y, 234530 = 3Y, 234531 = 5Y, 234526 = 10Y, 234529 = 20Y). Dữ liệu ngày, đơn vị %/năm; lấy mỗi thứ Sáu từ 09/01 đến 20/11/2026, tổng 44 tuần.
- WiData MCP **không** phải API của website. Website tĩnh không có máy chủ để giữ thông tin xác thực, và không gọi API không công bố.
- Theo điều khoản WiData (chỉ dùng cá nhân, không phân phối lại), dữ liệu **không** được đưa lên repo công khai. Người chơi nhận tệp riêng và tự nhập; tệp có ghi nguồn, ngày lấy và điều kiện sử dụng.
- **Chưa tích hợp** các bảng `bonds_gov_primary` / `secondary`, các bảng trái phiếu doanh nghiệp (`bonds_corp_*`), báo cáo tài chính doanh nghiệp và số liệu vĩ mô.
  - Lý do: cần thiết kế chuẩn hóa và có máy chủ để cập nhật mà không phân phối lại dữ liệu.
  - Hiện các dữ liệu này dùng bản mô phỏng có gắn nhãn.

## 7. Nghề nghiệp và chấm điểm

- **Sáu tiêu chí:** độ chính xác tài chính, lập luận đầu tư, quản trị rủi ro, tuân thủ, chất lượng quyết định, hiệu quả danh mục. Mỗi nhiệm vụ chỉ dùng tiêu chí liên quan; đạt khi trung bình ≥ 60%.
- **XP:** tính bằng XP gốc × điểm *cao nhất* của mỗi nhiệm vụ. Làm lại không cộng dồn XP; lợi nhuận không phải nguồn XP duy nhất.
- **8 cấp:**

  | Cấp | Chức danh | Điều kiện |
  |---|---|---|
  | 1 | Junior Analyst | 0 XP |
  | 2 | Fixed Income Analyst | 250 XP |
  | 3 | Bond Trader | 650 XP + xong chương 2 |
  | 4 | Credit Analyst | 1.200 XP + xong chương 4 |
  | 5 | Portfolio Manager | 1.800 XP + xong chương 5 |
  | 6 | Head of Fixed Income | 2.500 XP + xong chương 6 |
  | 7 | Chief Investment Officer | 3.200 XP + xong chương 6 |
  | 8 | Founder of an Investment Fund | 3.800 XP + kết thúc chương 7 từ "CIO vững vàng" trở lên |

## 8. Chế độ chơi

| Chế độ | Nội dung |
|---|---|
| Story Campaign | 7 chương. Thị trường cốt truyện đứng yên trong lúc làm nhiệm vụ, chỉ thay đổi theo hành động hoặc kết quả nhiệm vụ. |
| Free Trading | 100 triệu ₫ trên thị trường mô phỏng, không giới hạn thời gian, có Reset. |
| Historical Replay | Đường TPCP thật từng tuần, không thấy tương lai. |
| Portfolio Challenge | 3 nhiệm vụ quản lý quỹ có hạn mức, kiểm tra mỗi tuần: Thu nhập ổn định, Lá chắn lãi suất, Săn lợi suất. |
| Multiplayer Championship | Giải đấu tuần: cùng hạt giống thị trường (theo số tuần ISO) và cùng luật cho mọi người. Bảng xếp hạng gồm các tài khoản trên thiết bị này. Thi đấu trực tuyến cần máy chủ, hiện chưa có. |

**Quỹ CIO (chương 7):**
- Hạn mức: duration 2–6 năm, lợi suất cao ≤ 15% NAV, mỗi tổ chức phát hành ≤ 25%, tiền mặt ≥ 3%.
- Danh mục chuẩn: giữ nguyên danh mục bàn giao, chạy song song trên cùng thị trường.
- Điểm = 35% hiệu quả so với danh mục chuẩn + 20% sụt giảm + 25% tuân thủ + 20% chi trả rút vốn (bán tháo bị trừ điểm).
- 4 kết thúc: Huyền thoại thị trường trái phiếu, CIO vững vàng, Sống sót, Bị thay thế.

## 9. Kiến trúc

Website là trang tĩnh trên GitHub Pages: JavaScript thuần, router hash, đăng nhập bằng tài khoản cục bộ.
Các "dịch vụ" trong đặc tả là module chạy trong trình duyệt:

| Dịch vụ | Module |
|---|---|
| Bond Pricing Engine, Cash Flow Engine, Risk Engine (trái phiếu) | `engine.js` |
| Market Simulation Service, Credit Event Engine, WiData Adapter (phần kiểm tra dữ liệu) | `market.js` |
| Portfolio Service, Ledger, Risk (danh mục), Analytics | `book.js` |
| Mission Service, User Progression | `missions.js` |
| Giao diện và lưu trữ | `ui.js`, `css/bond.css` |
| Authentication | Cổng đăng nhập của site; mỗi tài khoản có khóa lưu riêng `cfaStudy_bond_<id>` |

**Bảo đảm dữ liệu:**
- **Tiền và sổ cái:**
  - Tiền là số nguyên đồng. Tiền mặt = tổng sổ cái; sổ cái được nối chuỗi băm.
  - Mỗi thao tác chạy trên bản sao và chỉ ghi khi hoàn tất (tất cả hoặc không gì cả).
- **Lệnh:**
  - Lệnh có mã `cid` nên bấm hai lần chỉ xử lý một lần; tài khoản của người khác bị từ chối.
  - Giá khớp luôn lấy từ thị trường, không lấy từ trang.
- **Nhiều tab:** lưu có số phiên bản; tab cũ không ghi đè dữ liệu mới.
- **Sửa dữ liệu:** tài khoản bị sửa ngoài trò chơi bị khóa và loại khỏi bảng xếp hạng.

**Giới hạn thật sự:**
- Không có máy chủ, PostgreSQL, transaction phía máy chủ, kiểm tra phía máy chủ, WebSocket hay phân quyền phía máy chủ.
- Dữ liệu nằm trong trình duyệt, nên trò chơi phát hiện được việc sửa dữ liệu nhưng không chặn tuyệt đối.
- Thiết kế máy chủ dự kiến (cùng hướng với Trading Arena):
  - Đưa `engine.js`, `market.js`, `book.js` lên Node.js; client chỉ gửi ý định.
  - Các bảng: `bond_accounts`, `bond_trades (unique account_id + client_id)`, `bond_ledger`, `bond_holdings_lots`, `bond_market_states`, `bond_mission_progress`, `bond_audit`.
  - Thị trường chung cho giải đấu chạy phía máy chủ.

## 10. Mức độ hoàn thành (theo tiêu chí nghiệm thu)

| Module | Trạng thái |
|---|---|
| Engine tính toán, mô phỏng thị trường, danh mục và sổ cái, Terminal | Hoạt động, có test, lưu và khôi phục được |
| Curve Lab và 6 máy tính, Duration Center, Factory (ABS/MBS/CMO), Credit Office, Hội đồng | Hoạt động, có test engine |
| 7 chương, 25 nhiệm vụ, nghề nghiệp, 3 thử thách, quỹ CIO | Hoạt động. Mỗi nhiệm vụ đều có test đáp án đúng/sai (nhiệm vụ nhập số) hoặc test hành động |
| Historical Replay (đường TPCP WiData) | Hoạt động. Dữ liệu doanh nghiệp và vĩ mô của WiData chưa tích hợp |
| Giải đấu tuần | Bảng xếp hạng trên thiết bị. **Chưa có** thi đấu trực tuyến |
| Trái phiếu có quyền chọn, OAS, CMBS riêng | **Chưa làm.** CLO và CMBS được minh họa qua engine ABS chung |
| Máy chủ, cơ sở dữ liệu, backup, giám sát | **Chưa làm** (website tĩnh) |

## 11. Kiểm thử

- **Chạy:** `node --test tests/*.test.js`. Riêng `tests/bond.test.js` có 27 test:
  - **Định giá:**
    - Giá par, chiết khấu, phụ trội; giá giữa hai kỳ coupon; lãi dồn tích theo 3 quy ước.
    - YTM ngược; lịch dòng tiền và ngày làm việc.
  - **Rủi ro lãi suất:**
    - Duration, convexity, PVBP; so sánh xấp xỉ với định giá lại.
    - Bootstrap, forward, par; Z-spread, G-spread, KRD.
  - **Các công cụ khác:** thị trường tiền tệ, repo, FRN; tín dụng và thu hồi; ABS, PSA, đấu thầu.
  - **Thị trường và danh mục:**
    - Thị trường mô phỏng, giá yết.
    - Mua tính đúng tới từng đồng, gửi trùng lệnh, phân quyền.
    - Coupon và hoàn gốc đúng ngày, FIFO, vỡ nợ và thu hồi, rút vốn và bán tháo, rủi ro danh mục, phát hiện sửa sổ cái.
    - Replay; bàn giao chứng khoán.
  - **Chiến dịch:** phủ 19 LM; đáp án đúng/sai của mọi nhiệm vụ tính toán; các nhiệm vụ hành động; nghề nghiệp; điểm và kết thúc quỹ CIO.
- **Thử trên trình duyệt (Playwright)**, máy tính và iPhone:
  - HQ, nhiệm vụ 1.1/1.2/3.4/4.3/5.1/5.3/6.1.
  - Mua bán và chạy đồng hồ, Curve Lab, máy tính, cú sốc +200 bp, Factory, Hội đồng.
  - Nhập WiData rồi Replay (10Y tuần 06/02/2026 = 4,222% khớp dữ liệu), quỹ CIO 12 tuần.
  - Kết quả: không lỗi JavaScript, không cuộn ngang.

## 12. Triển khai và rollback

- **Triển khai:** đẩy `main` lên GitHub Pages; `version.json` tăng cùng tag `?v=` của `js/app.js`.
- **Rollback:** chạy `git revert <commit>`. Dữ liệu người chơi (`cfaStudy_bond_*`) nằm trong trình duyệt nên không bị ảnh hưởng.

# Alternative Empire: The Capital Game — Game Design Document

Trò chơi quản lý quỹ đầu tư thay thế (financial strategy, investment management, business simulation, educational RPG) dựa trên **CFA Program Curriculum 2027, Level I, Volume 8 — Alternative Investments** (7 Learning Modules). Route trên website: `#/alt`, nằm ngay dưới Bond Empire trong menu Learn và trong Playground.

> Không được CFA Institute tài trợ hay công nhận. Không dùng tiền thật, không giao dịch thật, không có phần thưởng đổi ra tiền. Mọi doanh nghiệp, quỹ, dự án và nhân vật là hư cấu; kinh tế và giá cả là **mô phỏng** và luôn được gắn nhãn “MÔ PHỎNG”. Câu hỏi và giải thích được viết riêng cho game; không chép ngân hàng câu hỏi, ví dụ dài hay hình minh họa của giáo trình.

## 1. Ý tưởng

Năm 2027, người chơi là Junior Investment Analyst tại **Aurelion Capital** (hư cấu). Hội đồng giao **100 triệu USD vốn mô phỏng** để chứng minh năng lực trước ba khách hàng tổ chức đang cân nhắc rời đi. Người chơi xây danh mục đầu tư thay thế qua bảy chương — mỗi chương là một Learning Module — trong năm năm thị trường mô phỏng (Q1/2027 → khoảng Q2/2032).

Mục tiêu học tập: **suy nghĩ như người quản lý quỹ**: mọi lựa chọn có chi phí, thanh khoản, quyền kiểm soát, rủi ro và hệ quả trễ. Hội đồng chấm **lợi nhuận so với chuẩn, rủi ro, thanh khoản, tuân thủ, uy tín và hiểu biết**, không chỉ NAV.

## 2. Nhân vật

| Nhân vật | Vai trò | Động cơ / xung đột |
|---|---|---|
| Eleanor Hayes | CEO | Giữ khách hàng, không muốn bất ngờ trước Hội đồng |
| Marcus Chen | CIO, người cố vấn | Lập luận có số liệu, lợi nhuận sau phí |
| Sophia Laurent | Chief Risk Officer | Hạn mức, thanh khoản, đòn bẩy |
| Adrian Cole | PE Director | Muốn thương vụ lớn, nhanh; từng làm ở Northgate → xung đột lợi ích khi đề xuất quỹ Northgate và co-investment |
| Naomi Park | Hedge Fund Strategist | Thích đòn bẩy, chiến lược phức tạp |
| Victor Reyes | Đại diện quỹ hưu trí Harborview | Minh bạch phí, rút vốn đúng hạn; khiếu nại phí ở chương 2, rút vốn giữa khủng hoảng ở chương 6 |

## 3. Vòng lặp gameplay (mỗi vòng = một quý)

RESEARCH → ANALYZE → NEGOTIATE → INVEST → MANAGE → FACE EVENTS → EVALUATE → LEARN → ADVANCE

1. **Báo cáo thị trường**: Thị trường (macro, chỉ số), Hộp thư, Cố vấn.
2. **Phân tích cơ hội**: Deal Room / Bản đồ — hồ sơ thẩm định, rủi ro, bảng kịch bản.
3. **Kiểm tra tiền mặt và nghĩa vụ vốn**: Rủi ro (thang thanh khoản, gọi vốn dự kiến 4 quý, độ phủ).
4. **Chọn khoản đầu tư** và **5. thương lượng** term sheet (quỹ PE).
6. **Phân bổ vốn**: ký → bút toán thật trong sổ cái.
7. **Sự kiện kinh tế**: theo kịch bản chương + ngẫu nhiên theo seed.
8. **Tính tài sản và lợi nhuận**: mỗi mô hình tài sản sinh bút toán (gọi vốn, định giá, thu nhập, phân phối, phí, carry, lãi vay).
9. **Báo cáo Hội đồng**: điểm 6 tiêu chí, niềm tin; cuối chương có đánh giá chính thức.
10. **Mở khóa hoặc hậu quả**: chương mới, thăng chức, thành tựu — hoặc cảnh cáo, vay khẩn cấp, bị thay thế.

Mọi lựa chọn thay đổi trạng thái thật (tiền mặt, tài sản, uy tín, niềm tin, cờ cốt truyện, hiệu ứng trễ). Không có lựa chọn “giả”.

## 4. Bảy chương

| Ch. | LM | Tên | Cơ chế chính | Nhiệm vụ |
|---|---|---|---|---|
| 1 | LM1 | Birth of the Fund | Phân loại tài sản; ba đề xuất A/B/C (quỹ Northgate VII, co-investment Helix chỉ mở cho LP ≥ $15M, mua trực tiếp Solace Health); đàm phán term sheet; lịch capital call | Bản đồ tài sản thay thế · Ba con đường đầu tư · Lịch gọi vốn · Kiểm tra |
| 2 | LM2 | The Return Engine | Phí hedge fund (độc lập/sau phí QL, hurdle, HWM); waterfall soft/hard; tranh chấp phí Harborview (hệ quả trễ 2 quý nếu bác bỏ sai); IRR/MOIC/J-curve; đòn bẩy → hạn mức tín dụng thật | 6 nhiệm vụ |
| 3 | LM3 | The Buyout War | NovaGrid (VC Series B hoặc venture debt; mốc sản phẩm, down round, thoái vốn), Brightwell (LBO 3×/5×/6,5×, unitranche, mezzanine; covenant, IPO/trade sale/SBO/recap), Harbor Steel (distressed debt; tái cấu trúc mạnh/tái cấu trúc/thanh lý); vintage | 4 nhiệm vụ, ≥ 3 kết cục mỗi doanh nghiệp |
| 4 | LM4 | Cities & Infrastructure | Bản đồ 6 dự án: văn phòng core-plus (vay LTV), nhà ở core, REIT, cao tốc PPP greenfield BOT (bảng NPV/IRR 3 kịch bản nhu cầu), sân bay brownfield, bệnh viện PPP availability payments; suy giảm văn phòng | 4 nhiệm vụ |
| 5 | LM5 | The Resource Frontier | Trang trại (tự vận hành/cho thuê, phòng hộ futures), rừng (tăng trưởng sinh học, chính sách khai thác, “làm kho”), futures hàng hóa (roll), vàng vật chất (không dòng tiền); hạn hán đúng vụ thu hoạch | 4 nhiệm vụ |
| 6 | LM6 | Shadow Strategies | Hedge fund nội bộ 4 chiến lược, đòn bẩy 1–3×, gọi ký quỹ; fund of funds phí hai tầng; khủng hoảng thanh khoản + yêu cầu rút vốn của Harborview | 4 nhiệm vụ |
| 7 | LM7 | The Digital Frontier | Phân loại tài sản số; thẩm định Meridian Chain (PoS, permissionless); đầu tư trực tiếp (lưu ký: sàn/ví/tổ chức; staking) hoặc gián tiếp (ETP, cổ phiếu công ty blockchain); mandate ≤ 5%; mùa đông crypto; trình bày trước Hội đồng → kết cục | 4 nhiệm vụ |

Tổng: **30 nhiệm vụ**, **25 thương vụ**, **64 câu hỏi A/B/C**, **13 sự kiện** (4 theo kịch bản), **6 loại quyết định** có hệ quả.

## 5. Hệ thống

- **Portfolio Management Engine** (`alt/fund.js`): tiền mặt, vốn đã đầu tư, vốn cam kết chưa gọi, giá trị tài sản, NAV, lãi/lỗ đã/chưa thực hiện, dòng tiền, phí quản lý, phí hiệu suất/carry, thanh khoản, tỷ trọng theo lớp tài sản. Mỗi giao dịch là bút toán cân; NAV luôn đối soát được. Xem FINANCIAL_ENGINE_SPEC.md.
- **Economic Simulation Engine** (`alt/world.js`): 5 trạng thái (mở rộng, giảm tốc, suy thoái, phục hồi, đình lạm) theo chuỗi Markov; tăng trưởng, lạm phát, lãi suất (quy tắc kiểu Taylor), spread, biến động, thanh khoản, cổ phiếu, trái phiếu, năng lượng/kim loại/nông sản và độ dốc đường cong kỳ hạn, văn phòng, nhà ở, lưu lượng giao thông, gỗ, đất, token, thời tiết. Mỗi lớp tài sản phản ứng khác nhau. Cùng seed + cùng sự kiện → cùng nền kinh tế.
- **Decision Consequence System**: mỗi lựa chọn có tác động ngay (tiền, uy tín, niềm tin), hệ quả trễ (`pending`, ví dụ kiểm toán sau 2 quý), tác động tài chính, rủi ro, uy tín và kết quả học tập (ghi vào mức thành thạo LM). Quyết định chưa chọn sẽ áp dụng phương án mặc định cuối quý và được ghi lại.
- **Career Progression**: 7 cấp, điều kiện gồm kiến thức (mức thành thạo LM), quản trị rủi ro (điểm rủi ro, độ phủ thanh khoản, không vi phạm) và kết quả (niềm tin, điểm tổng kết):

| Cấp | Chức danh | Điều kiện |
|---|---|---|
| 1 | Junior Investment Analyst | Bắt đầu |
| 2 | Investment Analyst | Xong chương 1, thành thạo LM1 ≥ 60% |
| 3 | Associate Portfolio Manager | Xong chương 2, LM2 ≥ 60%, không vi phạm ở lần đánh giá gần nhất |
| 4 | Portfolio Manager | Xong chương 3, uy tín ≥ 45, độ phủ thanh khoản ≥ 1,0 |
| 5 | Investment Director | Xong chương 5, thành thạo TB LM1–5 ≥ 65%, điểm rủi ro ≥ 50 |
| 6 | Chief Investment Officer | Xong chương 6, niềm tin ≥ 60, thành thạo TB ≥ 70% |
| 7 | Alternative Investment Empire Founder | Xong chương 7, điểm tổng kết ≥ 75, thành thạo TB ≥ 75% |

- **CFA Learning System**: mỗi nhiệm vụ gắn LM, Learning Outcome (diễn giải), khái niệm, công thức (nếu có), độ khó, giải thích tự viết, hiểu lầm thường gặp. Câu hỏi A/B/C: đáp án chỉ hiện sau khi trả lời; giải thích từng phương án, công thức, từng bước; lịch sử câu sai; điểm yếu theo module; nút “Hỏi CFA Tutor (AI)” mở trợ lý AI có sẵn của website với câu hỏi đính kèm. Bài tính toán sinh số ngẫu nhiên và được chấm bằng engine.
- **Hội đồng**: điểm = 25% hiệu quả so với chuẩn 60/40 + 20% rủi ro + 15% thanh khoản + 15% tuân thủ + 10% uy tín + 15% hiểu biết. Niềm tin = 75% niềm tin cũ + 25% điểm quý.

## 6. Thắng / thua

- **Thua**: NAV < 60% vốn ban đầu (đóng quỹ) · niềm tin ≤ 10 (sa thải) · hai lần vay khẩn cấp để trả capital call/chi phí (mất khả năng thanh toán) · hai lần đánh giá chương liên tiếp < 45 điểm.
- **Kết thúc**: nhiệm vụ “Trình bày trước Hội đồng” ở chương 7 (sau ít nhất 2 quý của chương). Điểm tổng kết = 60% điểm Hội đồng + 25% điểm nhiệm vụ + 15% thành thạo. Kết cục: Đế chế Alternative (≥ 80 và cấp ≥ 6) · CIO (≥ 65 và cấp ≥ 5) · Portfolio Manager đáng tin cậy (≥ 50) · Bị thay thế. Sau đó có thể tiếp tục quản lý tự do.
- Bot kiểm thử: chơi cẩn trọng và trả lời đúng → hoàn thành 7 chương; bot liều lĩnh (cam kết quá sức, đòn bẩy tối đa, trả lời sai) → thua ở chương 3 trên 10/10 thử nghiệm (5 seed × 2 độ khó).

## 7. Màn hình (17)

1 Menu chính có chuyển động · 2 Ván mới (tên, độ khó, seed, ô lưu) · 3 Giới thiệu nhân vật · 4 Trụ sở (chương, Hội đồng, quỹ, quyết định, cố vấn, hộp thư) · 5 Bản đồ đầu tư toàn cầu · 6 Danh mục (NAV vs chuẩn, phân bổ, gọi vốn dự kiến, bảng khoản đầu tư, J-curve, trang chi tiết từng khoản với sổ cái riêng và hành động) · 7 Deal Room · 8 Máy tính tài chính (8 công cụ + BA II Plus) · 9 Đàm phán hợp đồng · 10 Nhiệm vụ · 11 Trung tâm rủi ro (mandate, thang thanh khoản, hạn mức, stress test, tập trung, exposure) · 12 Thị trường (macro, biểu đồ, nhật ký sự kiện) · 13 Học viện · 14 Báo cáo hiệu quả (từ gộp tới ròng, TWR, IRR quỹ, đối soát, CSV sổ cái) · 15 Thành tựu & sự nghiệp · 16 Cài đặt (âm thanh, chuyển động, xác nhận) · 17 Lưu/Tải (3 ô, xuất/nhập JSON).

Thiết kế desktop-first, dùng được trên điện thoại (rail thành thanh ngang, lưới một cột, không tràn ngang). Màu: Deep Navy #0B1220, Midnight Blue #101B30, Champagne Gold #C9A86A, Ivory #F6F4F0; xanh/đỏ chỉ cho biến động tài chính. Tôn trọng “giảm chuyển động”.

## 8. Bản đồ giáo trình → game

| LM | Learning outcomes (diễn giải) | Trong game |
|---|---|---|
| 1 Features, Methods, Structures | Nhóm tài sản thay thế; fund vs co-investment vs direct; cấu trúc sở hữu (GP/LP) và thù lao (phí QL trên committed capital, phí hiệu suất, hurdle hard/soft, catch-up, HWM, clawback, waterfall) | c1-brief (phân loại), c1-methods (phân loại + 3 thương vụ thật), đàm phán 7 điều khoản, c1-calls (capital call, unfunded), câu q1-1…q1-9, công cụ “Lợi nhuận GP” |
| 2 Performance and Returns | Đánh giá hiệu quả (J-curve, IRR, MOIC, định giá Level 3/smoothing, đòn bẩy, thanh khoản, lockup/notice/gate, bias); tính lợi nhuận trước/sau phí | c2-fees, c2-waterfall, c2-dispute (HWM), c2-irr, c2-leverage → hạn mức thật; J-curve của chính quỹ người chơi; máy tính Phí/HWM/Waterfall/American vs European/IRR/Đòn bẩy/FoF; q2-1…q2-10 |
| 3 Private Capital | PE (LBO, VC, growth; thoái vốn IPO/trade sale/SBO/recap/write-off; rủi ro-lợi nhuận), private debt (direct lending, unitranche, mezzanine, venture debt, distressed), đa dạng hóa, vintage | c3-cases (6 công cụ trên 3 doanh nghiệp, vòng đời nhiều quý), c3-exit, c3-vintage + Northgate VIII, quyết định down round/covenant/thoái vốn; q3-1…q3-9 |
| 4 Real Estate and Infrastructure | Đặc điểm BĐS, hình thức, nguồn lợi nhuận (thu nhập + tăng giá), phổ core → opportunistic, LTV; hạ tầng kinh tế/xã hội, greenfield/secondary-stage/brownfield, PPP, BOT, availability vs usage payments | c4-map (6 dự án trên bản đồ), c4-toll (kịch bản nhu cầu, BOT), c4-spectrum; mô hình văn phòng/nhà ở/REIT/hạ tầng; q4-1…q4-9 |
| 5 Natural Resources | Đất thô, farmland, timberland (nguồn lợi nhuận, nhà máy + kho); hàng hóa (forward = S·e^{(r+c−i)T}, contango/backwardation, không dòng tiền); rủi ro, đa dạng hóa, phòng vệ lạm phát | c5-land, c5-futures, c5-drought (tách nguồn lợi nhuận); trang trại, rừng, futures, vàng; q5-1…q5-9 |
| 6 Hedge Funds | 4 nhóm chiến lược; hình thức (master-feeder, SMA, fund of one, FoF); rủi ro (đòn bẩy, thanh khoản, đuôi trái), đa dạng hóa | c6-launch, c6-fof, c6-redeem; quỹ nội bộ + FoF; khủng hoảng thanh khoản; q6-1…q6-9 |
| 7 Digital Assets | DLT, PoW/PoS, permissioned/permissionless; loại tài sản số; hình thức trực tiếp/gián tiếp; rủi ro, đa dạng hóa | c7-classify, c7-dd, token/ETP/cổ phiếu; rủi ro lưu ký, staking; q7-1…q7-9 |

## 9. Điều giáo trình xác nhận và giả định riêng của game

**Theo giáo trình (dạng công thức/khái niệm)**: phí quản lý trên AUM cuối kỳ, phí hiệu suất độc lập hoặc sau phí quản lý, hard hurdle trên P0(1 + rh), HWM tính sau phí; lợi nhuận GP có/không catch-up; waterfall soft/hard hurdle với preferred return tính đơn; deal-by-deal vs whole-of-fund và clawback; MOIC; IRR là thước đo chính cho tài sản dài hạn; J-curve; rL = r + (Vb/Vc)(r − rb); hai tầng phí FoF; F0(T) = S0·e^{(r+c−i)T}; quy tắc contango/backwardation; nguồn lợi nhuận farmland/timberland; phân loại hạ tầng; chiến lược và hình thức hedge fund; các loại tài sản số; survivorship/backfill bias; định giá Level 3 và smoothing; phí PE trên committed capital.

**Giả định riêng của game (ghi nhãn “mô hình của game” trên màn hình)**: kết hợp hurdle với HWM = max(HWM, P0(1+rh)); preferred return của quỹ PE tính đơn trên từng lần góp theo thời gian; lịch thương vụ, giữ giá gốc 4 quý, định giá trễ 50%; carry tích lũy và clawback ước tính theo cơ sở thanh lý; chiết khấu thị trường thứ cấp; định giá BĐS bằng NOI/tỷ suất thu nhập (direct capitalization — không thuộc LOS 2027); PV hợp đồng nhượng quyền; tách lợi nhuận futures thành spot/roll/collateral (quy ước ngành, giáo trình 2027 không có); gross/net exposure (thước đo ngành, không thuộc LOS); mô hình nhân tố cho lợi nhuận chiến lược hedge fund; xác suất mất token theo hình thức lưu ký; các trạng thái kinh tế; trọng số Hội đồng; hạn mức mandate; điểm đàm phán; ngưỡng thăng chức; TWR với dòng vốn đầu quý; IRR theo dòng tiền quý; độ phủ thanh khoản.

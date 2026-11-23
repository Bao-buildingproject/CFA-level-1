# Alternative Empire — Financial Engine Specification

Code: `js/alt/engine.js` (công thức), `js/alt/assets.js` (mô hình tài sản), `js/alt/fund.js` (sổ cái). Tests: `tests/alt.test.js`.

## 0. Quy ước chung

- **Tiền**: số nguyên **cent USD** (`$100M = 10,000,000,000`). Hàm `mul(cents, rate)` nhân chính xác bằng BigInt: tỷ lệ làm tròn tới 1e-6 (ppm), kết quả làm tròn **half away from zero** tới cent. `mulDiv(c, a, b)` cho tỷ lệ phân số. Mọi bút toán bị từ chối nếu không phải số nguyên.
- **Tỷ lệ**: số thập phân (0,02 = 2%). Lợi nhuận mô phỏng được làm tròn 6 chữ số để kết quả lặp lại được.
- **Thời gian**: một bước = một quý. IRR của khoản đầu tư dùng thời điểm tính bằng năm (quý/4) nên ra IRR năm; dưới 1 năm không năm hóa trên màn hình.
- **Lỗi đầu vào**: `AltError` với thông báo tiếng Việt; máy tính hiển thị lỗi thay vì ra số.
- **Nhãn**: “công thức giáo trình” = dạng dùng trong bài đọc CFA L1 2027; “mô hình của game” = quy ước riêng.

## 1. Phí hedge fund một kỳ — `hfFees` (giáo trình LM2, eq. 4–9)

Biến: P0 giá trị đầu kỳ (cent), P1 cuối kỳ trước phí (cent), rm phí quản lý, p phí hiệu suất, rh hurdle, HWM (cent, tùy chọn).

Thứ tự:
1. Phí QL = rm × P1 (`mgmtBasis: "end"`, mặc định như giáo trình) hoặc rm × P0 (`"begin"`).
2. Giá trị tính phí = P1 − phí QL (`perfBasis: "net"`) hoặc P1 (`"independent"`).
3. Mốc tham chiếu = max(HWM, P0) nếu có HWM, ngược lại P0.
4. Hurdle: mức = P0(1 + rh). *Mô hình của game:* ngưỡng = max(mốc tham chiếu, mức hurdle).
5. Hard: p × max(0, giá trị − ngưỡng). Soft: nếu giá trị > ngưỡng thì p × (giá trị − mốc tham chiếu), ngược lại 0. Không hurdle: p × max(0, giá trị − mốc).
6. Either/or (tùy chọn): lấy khoản lớn hơn giữa phí QL và phí hiệu suất.
7. Giá trị NĐT = P1 − tổng phí; r = (cuối − P0)/P0; HWM mới = max(mốc, cuối).

Kiểm thử (con số khớp tính tay): $100M → $130M, 2% cuối kỳ, 20%: độc lập 21,40%; sau phí QL 21,92%; hard hurdle 5% 22,92%. HWM qua 3 năm: phí hiệu suất năm 3 = 20% × (128 − 121,4) = $1,32M, HWM mới $124,12M. Biến thể 1%/20%: 22,7% · 22,96% · hurdle 6% 24,16%.

Edge cases: P0 ≤ 0, P1 < 0, tỷ lệ ngoài khoảng → lỗi; giá trị dưới HWM → phí hiệu suất 0.

`hfSeries`: chạy nhiều kỳ, HWM chuyển kỳ.

## 2. Lợi nhuận GP — `gpReturn` (giáo trình LM1, eq. 1–2)

Không catch-up: rGP = max[0, p(r − rh)]. Catch-up toàn phần: rcu = p·rh/(1 − p); r ≤ rh → 0; rh < r ≤ rh + rcu → r − rh (đang trong tầng catch-up); r > rh + rcu → rcu + p(r − rh − rcu).
Kiểm thử: 18%, 8%, 20% → 2,0% / 3,6%; 20%, 10%, 18% → 1,8%.

## 3. Waterfall một quỹ vốn — `waterfall`

Tầng: hoàn vốn LP → preferred return (đơn: vốn × rh × năm, như ví dụ soft/hard hurdle của giáo trình; hoặc kép) → catch-up GP (tỷ lệ c; quy mô tầng X = carry·pref/(c − carry), yêu cầu c > carry hoặc c = 0) → chia (1 − carry)/carry.
Kiểm thử: vốn $100M, thu $160M, 8%×2 năm, carry 20%: soft (catch-up 100%) LP $148M / GP $12M; hard LP $151,2M / GP $8,8M; thu $110M → GP 0; thu $70M → LP $70M. Tổng các tầng luôn bằng tiền thu về.

## 4. Deal-by-deal vs whole-of-fund, clawback — `dealWaterfalls`

American: carry tính từng thương vụ khi thoái vốn (không bù lỗ thương vụ sau). European: một waterfall trên tổng vốn và tổng tiền thu về (pref = tổng pref từng thương vụ). Clawback = max(0, GP đã nhận − GP được hưởng theo toàn quỹ) nếu có điều khoản; không có điều khoản thì phần đó LP mất.
Kiểm thử: 8 thương vụ tổng lãi 0 → American trả GP $13M sớm, clawback $13M, European 0. Hai thương vụ (+12, −10) → GP nhận 2,4, được hưởng 0,4, clawback 2,0.

## 5. NPV và IRR — `npv`, `irr`

NPV(r) = Σ CFt/(1+r)^t (t theo kỳ hoặc theo `times`). IRR: quét 6.000 điểm trên log(1+r) với r ∈ (−99%, 1000%], tìm mọi lần NPV đổi dấu, chia đôi tới 1e-14. Trả `status`:
- `unique` → một nghiệm;
- `multiple` → nhiều nghiệm, **không trả một con số** (`irr: null`) và giải thích nên dùng NPV/MOIC;
- `none` → không nghiệm (dòng tiền không đổi dấu hoặc NPV không cắt 0).
Kiểm thử: dòng tiền (−2,5; −4; −1,7; −0,5; 1; 3; 12,5) → 14,596%; (−100, 230, −132) → 10% và 20%; (100, 50) → none; thời điểm không đều.

## 6. Bội số

MOIC = (giá trị đã thực hiện + chưa thực hiện)/vốn đầu tư (giáo trình: vốn đầu tư = paid-in trừ phí QL và chi phí quỹ). Với từng khoản trong game, tính từ dòng tiền ròng theo quý của Aurelion: góp vào = tổng các quý ròng âm; nhận về = tổng các quý ròng dương (phân phối, thu nhập, tiền bán); NAV = giá trị − nợ. TVPI = (nhận về + NAV)/góp vào; DPI = nhận về/góp vào; RVPI = NAV/góp vào; MOIC dùng mẫu số = góp vào − phí QL trong capital call.

## 7. Đòn bẩy — `leveredReturn` (giáo trình LM2 eq. 2–3)

rL = [r(Vc + Vb) − Vb·rb]/Vc = r + (Vb/Vc)(r − rb). Hòa vốn khi rb = r. Kiểm thử: 8%/50/100/4% → 10%; −2% → −5%; 10%, Vb = Vc, 3% → 17%.

## 8. Fund of funds — `fofReturn`

Áp dụng `hfFees` của quỹ thành phần rồi của FoF lên kết quả. Kiểm thử: gộp 20%, 2/20 đầu kỳ → 14%; FoF 1/10 → 11,6%. Hai quỹ $200M → $220M, 1/10 độc lập → 7,9%.

## 9. Hàng hóa

- `forwardPrice` (giáo trình LM5 eq. 1): F0(T) = S0·e^{(r+c−i)T}; contango khi F > S0, backwardation khi F < S0.
- `futuresQuarter` (*mô hình của game*): vị thế long ký quỹ đủ, mua ở F0 = S0·e^{k/4}, đáo hạn ở S1, tài sản ký quỹ hưởng r/4. Lợi nhuận = spot (S1/S0 − 1) + roll ((S1/S0)(e^{−k/4} − 1)) + collateral (r/4), cộng chính xác. Contango (k > 0) → roll âm.
- Vàng vật chất: chỉ thay đổi giá, trừ phí lưu kho 0,4%/năm, không thu nhập.

## 10. Bất động sản và hạ tầng (*mô hình của game*)

- BĐS: NOI quý = NOI gốc × chỉ số nhu cầu × lạm phát^chỉ số hóa; thu nhập = NOI/4; giá trị hợp lý = NOI năm / tỷ suất thu nhập, tỷ suất = y0 + 0,6Δlãi suất + 0,25Δspread (≥ 2,5%); thẩm định đi 50% về giá trị hợp lý mỗi quý. LTV > 75% → ngân hàng buộc trả nợ về 65%. Vay thế chấp: tài sản và nợ cùng tăng, NAV không đổi.
- Hạ tầng: greenfield gọi vốn đều trong thời gian xây (10% mỗi quý có thể vượt chi phí +12%, tối đa 2 lần); khai thác: doanh thu = rev0 × nhu cầu thực (ẩn: 70%/100%/125% với xác suất 25/50/25) × ramp-up × lạm phát; giá trị = PV dòng tiền còn lại của hợp đồng (gồm ramp-up), chiết khấu lãi suất + phần bù, **không giá trị cuối kỳ** (BOT). Availability payments không phụ thuộc nhu cầu. `projectCashflows`/`scenarioTable` cho bảng kịch bản năm.

## 11. Quỹ PE (LP) — mô hình

Phí quản lý trên **committed capital** mỗi quý (gọi qua capital call). 6 thương vụ, mỗi thương vụ 85%/6 vốn cam kết, vào ở tuổi quỹ 0,1,2,3,5,7 (quý); giữ giá gốc 4 quý rồi định giá trễ (đi 50% về giá trị thật); 10% thương vụ thất bại; thoái vốn sau 10–15 quý (trì hoãn khi thanh khoản < 0,35). Giá trị thật mỗi quý: × (1 + β(rEq − r/4) + r/4 + α/4 + σz), β 1,1, α 11%, σ 8%. Thoái vốn trả qua waterfall hợp đồng (American theo thương vụ; European toàn quỹ trên paid-in gồm phí, pref đơn theo thời gian). Giá trị LP = NAV gộp − carry tích lũy (cơ sở thanh lý) + clawback ước tính (nếu có điều khoản). Hiệu chỉnh 120 seed, 5 năm: TVPI trung vị 1,28× (p10 0,67×, p90 1,82×), IRR ròng trung vị 8,4%; giai đoạn đầu TVPI < 1 (J-curve).

## 12. Sổ cái và đối soát — `fund.js`

Mỗi bút toán: Δtiền mặt, Δgiá trị khoản đầu tư, Δgiá vốn, Δnợ (khoản/quỹ), paid-in, unfunded, cam kết, phân phối, dòng tiền cho IRR, các hạng mục lãi/lỗ. **Ràng buộc**: Δtiền + Δgiá trị − Δnợ = Σ hạng mục; nên NAV_t = vốn ban đầu + thu nhập + đã thực hiện + chưa thực hiện + phí QL + phí hiệu suất + chi phí + lãi vay + dòng vốn khách hàng.

| Sự kiện | Tiền | Giá trị | Hạng mục |
|---|---|---|---|
| Cam kết | 0 | 0 | — (chỉ unfunded) |
| Capital call (đầu tư I, phí f) | −(I+f) | +I | phí QL −f |
| Mua trực tiếp | −P | +P | — |
| Vay / trả nợ | ±L | 0 | — (nợ ±L) |
| Định giá lại | 0 | ±Δ | chưa thực hiện |
| Thu nhập (thuê, lãi, thu hoạch) | +X | 0 | thu nhập |
| Phân phối D (giá vốn giảm theo tỷ lệ C·D/V) | +D | −D | đã thực hiện +(D − C·D/V), chưa thực hiện −(cùng số) |
| Carry trả GP / tích lũy | 0 | −Δ | phí hiệu suất |
| Bán thứ cấp với chiết khấu | +giá | −giá trị | chưa thực hiện (chiết khấu) + phân phối |
| Chi phí, lãi vay | −X | 0 | chi phí / lãi vay |

`verify()`: dựng lại tiền mặt, nợ quỹ, giá trị/giá vốn/nợ/paid-in/unfunded/phân phối/cam kết từng khoản từ sổ cái; kiểm tra chuỗi băm FNV-1a; kiểm tra NAV = tổng hạng mục. Test chạy 3 seed × 20 quý với đủ 17 loại tài sản: khớp mọi quý.

Thiếu tiền mặt: rút hạn mức → bán tài sản thanh khoản (có chi phí) → nếu vẫn thiếu, Hội đồng cho vay khẩn cấp (lãi phạt, mất uy tín/niềm tin; lần 2 thua). Tiền mặt không bao giờ âm sau một quý.

## 13. Hiệu quả và rủi ro

TWR quý = (NAV cuối − NAV đầu − dòng vốn)/(NAV đầu + dòng vốn) (dòng vốn đầu quý), nối chuỗi. IRR của quỹ: vốn ban đầu, dòng vốn khách hàng, NAV hiện tại. Sụt giảm tối đa trên chỉ số TWR. Độ phủ thanh khoản = (tiền mặt + 97% tài sản thanh khoản + 50% tài sản theo quý + hạn mức còn lại)/gọi vốn dự kiến 4 quý. Stress test trên trang Rủi ro dùng độ nhạy giả định theo loại tài sản (mô hình của game, không phải dự báo). NAV của tài sản không có giá quan sát được luôn gắn nhãn “ƯỚC TÍNH” và tách khỏi giá trị đã thực hiện.

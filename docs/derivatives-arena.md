# Derivatives Trading Arena

Trò chơi mô phỏng giao dịch hợp đồng tương lai chỉ số bằng **100.000.000 ₫ tiền ảo**.
Mở tại `#/trading/derivatives`; mục **Phái sinh · Trading Arena** nằm ngay dưới **Giả lập chứng khoán**.
Trang **Giả lập chứng khoán** có nút **Phái sinh**, và mục này cũng có trong Playground và trang More.

Arena không có giao dịch tiền thật, không nạp tiền và không gửi lệnh tới công ty chứng khoán.

## 1. Khảo sát dự án (Phase 1) và cách tích hợp

| Thành phần | Hiện trạng của website | Quyết định cho Arena |
|---|---|---|
| Frontend | JavaScript thuần, không build. Router dùng hash (`ROUTES` trong `js/app.js`). | Thêm module `js/arena/*` và route `trading`. Chế độ toàn màn hình `body.ta-mode` hoạt động giống `fx-mode` của game. |
| Backend | Không có. Website là GitHub Pages tĩnh. | Mọi phần chạy trong trình duyệt. Thiết kế máy chủ ghi ở mục 9. |
| Đăng nhập | Tài khoản cục bộ trong trình duyệt (`PROFILES`, có PIN). Cổng đăng nhập của site chặn route khi chưa đăng nhập. | Mỗi tài khoản site có một ví Arena riêng, lưu ở `cfaStudy_arena_<id>`. Engine kiểm tra `userId` ở mọi thao tác. |
| Lưu trữ | `localStorage` và IndexedDB. | Lưu bằng `localStorage`, có số phiên bản lưu (revision) để chống ghi đè giữa các tab. |
| Biểu đồ | Giả lập chứng khoán dùng SVG tự vẽ. | Dùng TradingView Lightweight Charts™ 4.2.0 (Apache-2.0), đặt sẵn trong `js/vendor/`, kèm giấy phép và dòng ghi công. |
| Thiết kế | Có design token của site. | Terminal dùng bộ token riêng: nền `#0B0F19`, thẻ `#151B2B`, xanh cho lãi, đỏ cho lỗ, có giao diện sáng. Hộp thoại dùng lại `confirmDialog` và `promptDialog` của site. |

Các module không liên quan không bị sửa. Chỉ có những chỗ nối sau:

- `index.html`: thẻ script và CSS.
- `js/app.js`: thêm mục điều hướng, route, `ta-mode` và `arenaStop`, mục trong trang More. Hàm reset mọi tài khoản cũng xóa ví Arena.
- `js/storage.js`: xóa ví Arena khi xóa một tài khoản.
- `js/components.js`: thêm icon `candles`.
- `js/playground.js`: thêm ô Trading Arena.
- `js/trade.js`: thêm nút **Phái sinh**.

## 2. Kiến trúc

| Dịch vụ trong đặc tả | Tệp và hàm |
|---|---|
| Market Data Service (adapter) | `js/arena/market.js`: `createSynthetic` / `advance` / `openDay` (Mode C), `validateDataset` / `createReplay` / `replayNext` (Mode A) |
| Order Management, Matching/Execution | `js/arena/engine.js`: `placeOrder`, `cancelOrder`, `closePosition`, `reversePosition`, `setProtection`, `onBar` |
| Risk & Margin Engine | `engine.js`: `metrics`, `imOf`/`mmFromIm`/`liqFromMm`, `updateStatus`, `liqLevel`, `liquidate` |
| Portfolio / Position Engine | `engine.js`: vị thế ròng theo sản phẩm, quản lý bằng lô FIFO |
| Accounting / Ledger | `engine.js`: sổ cái `ledger` (INITIAL, FEE, PNL, RESET), `verify`, `compact` |
| Analytics | `engine.js`: `analytics`, `tradesOf`, `achievements` |
| Leaderboard, Challenge, Cup | `js/arena/store.js`: `leaderboard`, `CHALLENGES`, `evalChallenge`, `startCup` |
| Auth & Authorization | Cổng đăng nhập của site. `ctx.userId` được kiểm tra trong `txn`. Ví nằm theo khóa riêng của từng tài khoản. |
| Giao diện | `js/arena/ui.js` và `css/arena.css` |

**Tính nguyên tử.** Mọi thao tác của người chơi và mọi sự kiện giá chạy trên **bản sao** của tài khoản. Bản sao chỉ được ghi đè lên tài khoản thật khi thao tác chạy hết và các bất biến vẫn đúng: tổng lô = khối lượng, mỗi sản phẩm tối đa một vị thế mở, mọi số tiền là số nguyên. Nếu có lỗi giữa chừng, toàn bộ thao tác được hoàn tác và một dòng `REJECT` được ghi vào nhật ký kiểm toán.

## 3. Mô hình tài chính

**Số học chính xác.** Tiền là số nguyên đồng. Giá là số nguyên **0,01 điểm** (180000 = 1.800,00 điểm). Với VN30F, 1 điểm = 100.000 ₫/hợp đồng, nên 1 đơn vị giá = 1.000 ₫. Không có phép tính tiền nào dùng số thực. Ký quỹ được làm tròn lên bằng `ceilDiv` trên số nguyên.

**Lãi/lỗ:**
- Long P&L = (giá hiện tại − giá vào) × 100.000 ₫ × số hợp đồng.
- Short P&L = (giá vào − giá hiện tại) × 100.000 ₫ × số hợp đồng.
- Vị thế gồm nhiều lô. Khi đóng, lô vào trước được đóng trước (FIFO), nên đóng một phần hay khớp nhiều lần đều cho lãi/lỗ chính xác.
- Lãi/lỗ đã thực hiện được ghi vào sổ cái đúng **một lần** cho mỗi lần khớp đóng vị thế.

**Các đại lượng tài khoản.** Mỗi đại lượng là một biến riêng:

| Đại lượng | Cách tính |
|---|---|
| Tiền mặt | Tổng sổ cái (không lưu thành một con số riêng) |
| Lãi/lỗ đã thực hiện | Tổng các dòng PNL |
| Phí | Tổng các dòng FEE |
| Lãi/lỗ chưa thực hiện | Tính theo từng lô với giá mark |
| Equity | Tiền mặt + lãi/lỗ chưa thực hiện |
| IM | Ký quỹ ban đầu theo giá mark |
| MM | Ký quỹ duy trì, bằng 80% IM |
| Ký quỹ giữ cho lệnh chờ | IM và phí giữ lại cho các lệnh chờ làm tăng vị thế |
| Khả dụng | Equity − IM − ký quỹ giữ cho lệnh chờ |
| Tỷ lệ sử dụng ký quỹ | IM ÷ Equity |
| Equity ÷ MM | Tỷ số ký quỹ duy trì |

**Quy tắc rủi ro.** Đây là toàn bộ quy tắc; ngoài các trường hợp này không có gì thanh lý tài khoản:
1. Mở hoặc tăng vị thế cần: khả dụng ≥ IM của phần tăng thêm + phí. Điều kiện này được kiểm tra **khi đặt lệnh** và **kiểm tra lại khi khớp**, vì giá có thể đã đổi. Ký quỹ đã giữ cho lệnh chờ không được dùng lại cho lệnh khác.
2. **Margin Call** khi Equity < MM. Khi đó chỉ được đặt lệnh giảm vị thế. Margin Call kết thúc khi Equity ≥ IM. Không có nạp thêm tiền.
3. **Thanh lý bắt buộc** khi Equity < 50% MM. Engine tính đúng mức giá chạm ngưỡng đó, rồi đóng **ít hợp đồng nhất** đủ để Equity ≥ IM của phần còn lại. Lệnh đóng là lệnh Market, có tính chênh lệch giá mua/bán và trượt giá. Mỗi lần thanh lý được ghi vào nhật ký kiểm toán.

**Thông số hợp đồng.**
- Theo HĐTL chỉ số trên HNX: hệ số nhân 100.000 ₫, bước giá 0,1 điểm, biên độ ±7% quanh giá tham chiếu (làm tròn vào trong theo bước giá). Biên độ đã được đối chiếu với toàn bộ 207 phiên dữ liệu WiData: không phiên nào vượt biên.
- Đáo hạn vào thứ Năm tuần thứ ba của tháng (lùi về ngày giao dịch trước đó nếu trùng ngày nghỉ). Vị thế được thanh toán bằng tiền theo giá đóng cửa của chỉ số VN30 ngày giao dịch cuối cùng; khi không có số này thì dùng giá đóng cửa của hợp đồng.

**Các giả định mô phỏng.** Tất cả đều được công khai trong trò chơi:
- Ký quỹ ban đầu 17%, ký quỹ duy trì 80% IM, ngưỡng thanh lý 50% MM.
- Phí 5.000 ₫ cho mỗi hợp đồng mỗi lần khớp. Không tính thuế. Thanh toán đáo hạn không mất phí.
- Không có sổ lệnh thật, nên lệnh không khớp ở giá hiển thị. Giá chào mua/chào bán = mark ∓ 0,1 điểm với VN30F và ∓ 0,2 điểm với VN100F.
- Lệnh Market và Stop trượt thêm 1 bước giá cho mỗi 50 hợp đồng (VN30F) hoặc 5 hợp đồng (VN100F). Mức trượt gấp đôi khi thị trường mô phỏng đang biến động mạnh.
- Limit khớp đúng giá đặt khi giá chào chạm tới.
- Khi giá mở cửa nhảy qua mức Stop, lệnh khớp ở giá mở cửa (kể cả khi đó là gap qua Stop Loss).
- Một nến được đi theo hướng bất lợi trước. Vì vậy nếu nến chạm cả SL và TP, SL được tính trước.
- Mỗi lệnh khớp toàn bộ một lần. Tối đa 500 hợp đồng/lệnh và 2.000 hợp đồng/vị thế.

**Phiên giao dịch.** Thị trường mô phỏng chạy theo phiên 08:45–11:30 và 13:00–14:45; phiên ATC được mô phỏng như khớp liên tục. Lịch nghỉ năm 2026 lấy theo các ngày không có giao dịch trong dữ liệu sàn; lịch âm lịch năm 2027 là ước tính. Khi thị trường đóng cửa, lệnh Market bị từ chối, còn Limit và Stop chờ phiên sau.

## 4. Dữ liệu thị trường

| Chế độ | Nhãn trên màn hình | Nguồn |
|---|---|---|
| A. Historical Replay | **LỊCH SỬ · WiData · 1D** | Dữ liệu ngày VN30F tháng gần do người chơi nhập. Tệp chỉ nằm trên máy người chơi. |
| B. Live | Chưa khả dụng | Website tĩnh chưa có nguồn dữ liệu thời gian thực được cấp phép. Arena không gọi API không công bố. |
| C. Synthetic | **MÔ PHỎNG · Synthetic** | Chuyển động Brown hình học, có nhảy giá, ba chế độ biến động, sự kiện ngẫu nhiên và tương quan 0,94 giữa VN30F và VN100F. Thị trường dùng seed nên tái lập được. Có thể hiệu chỉnh độ biến động và mức giá theo dữ liệu WiData, nhưng vẫn là giá mô phỏng. |

**Replay.** Mỗi vòng có 20 phiên, điểm bắt đầu ngẫu nhiên, mặc định ẩn ngày thật. Biểu đồ chỉ nhận các phiên đã mở. Giá tham chiếu của phiên sau chính là giá thanh toán của hôm nay, vốn được công bố cuối ngày nên không phải dữ liệu tương lai. Lệnh đặt giữa hai phiên sẽ khớp từ phiên kế tiếp; lệnh Market khớp ở giá mở cửa. Khi hết vòng, trò chơi cho biết giai đoạn thật vừa chơi.

**Biểu đồ và khớp lệnh dùng cùng một dữ liệu.** Mỗi bước 10 giây của thị trường mô phỏng, và mỗi phiên khi Replay, là một nến được đưa cho engine. Biểu đồ được dựng từ chính các nến đó.

**Bộ dữ liệu WiData.**
- Gồm 207 phiên từ 20/01 đến 20/11/2026, lấy qua WiData MCP: `eod_root_put` cho giá gốc hợp đồng tương lai, `index_eod` cho chỉ số VN30.
- Theo điều khoản WiData (dùng cá nhân, không phân phối lại), tệp **không bao giờ được đưa lên repo**. Người dùng nhập tệp ở sảnh Arena, và tệp chỉ lưu trong trình duyệt (`cfaStudy_arena_data`).
- Khi nhập, dữ liệu được kiểm tra: bỏ nến lỗi, sắp lại theo thứ tự thời gian, ngày bị lặp chỉ giữ dòng sau.
- Nguồn không có phiên 30/06/2026.

## 5. Chế độ chơi

| Chế độ | Luật |
|---|---|
| Luyện tập | Thị trường mô phỏng, không giới hạn thời gian. Chọn tốc độ 1×, 10×, 60× hoặc 300×. Có thể reset demo; mỗi lần reset được ghi dấu mốc vào sổ cái. |
| Thử thách | 4 kịch bản có seed cố định: Khởi động, Bão biến động, Thị trường giá xuống, Kỷ luật Stop Loss. Mỗi kịch bản có mục tiêu lợi nhuận và giới hạn sụt giảm, được chấm tự động từ tài khoản. |
| Replay lịch sử | Như mô tả ở mục 4. |
| Giải tuần | 5 phiên mô phỏng. Seed là số tuần ISO, nên mọi người chơi trong tuần gặp cùng một thị trường. |

Mỗi chế độ có ví 100 triệu ₫ riêng. Ngoài ra còn có 10 thành tích và 4 huy hiệu thử thách. Đây là phần thưởng ảo, không quy đổi được thành tiền.

## 6. Chống lỗi và gian lận

| Tình huống | Cách xử lý |
|---|---|
| Spam nút, gửi trùng | Mỗi phiếu lệnh có mã `cid`. Engine xử lý mỗi `cid` một lần, nên nhấn lại hoặc gửi lại không tạo lệnh thứ hai. Nút bị khóa khi lệnh đang xử lý. Mỗi trang giới hạn 8 lệnh trong 5 giây. |
| Nhiều tab | Lưu có số phiên bản: tab cũ không ghi đè được bản mới hơn mà sẽ tải lại. Các tab nghe sự kiện `storage` để cập nhật. Thị trường tạm dừng khi tab bị ẩn. |
| F5, tắt trang | Trạng thái được lưu sau mỗi lệnh, mỗi vài giây và khi trang ẩn hoặc đóng. Thị trường mô phỏng lưu trạng thái bộ sinh số ngẫu nhiên, nên chạy tiếp đúng như cũ. |
| Mất mạng | Arena chạy cục bộ nên không cần mạng sau khi đã tải trang. |
| Giá thiếu hoặc chậm | Lệnh Market bị từ chối khi giá được đánh dấu là cũ (`stale`). Nến lỗi bị bỏ qua. |
| Giá nhảy gap qua Stop Loss | Lệnh khớp ở giá mở cửa, kém hơn mức SL (có test). |
| Hai lệnh dùng chung ký quỹ | Ký quỹ của lệnh chờ được giữ lại; điều kiện ký quỹ được kiểm tra lại khi khớp (có test). |
| Đóng vị thế hai lần | Lần thứ hai không còn vị thế để đóng (có test). Hai tab cùng đóng cũng được xử lý (đã thử trên trình duyệt). |
| Đáo hạn | Vị thế được thanh toán và lệnh chờ của hợp đồng cũ bị hủy (có test). |
| Thị trường đóng cửa | Lệnh Market bị từ chối, Limit và Stop chờ phiên sau (có test). |
| Sửa số dư bằng DevTools | Không có ô "số dư" nào để sửa: tiền mặt luôn được tính lại từ sổ cái. Sổ cái và lịch sử khớp lệnh được nối chuỗi băm, và khi mở trang sổ cái được dựng lại từ lịch sử khớp lệnh để đối chiếu. Ví bị sửa sẽ bị khóa giao dịch, không được xếp hạng và phải reset. Sửa trong lúc trang đang mở sẽ bị chính trang ghi đè lại. Giá do trang gửi lên (`px`, `price`) bị bỏ qua: giá khớp luôn lấy từ thị trường. |
| Dữ liệu lịch sử lỗi hoặc sai thứ tự | Bộ kiểm tra khi nhập dữ liệu xử lý (có test). |
| Lỗi giữa chừng | Giao dịch được hoàn tác (có test với lỗi giả lập). |

**Giới hạn còn lại.** Website không có máy chủ, nên mọi thứ đều nằm trong trình duyệt và mã nguồn công khai. Người am hiểu kỹ thuật vẫn có thể dựng lại chuỗi băm. Vì vậy Arena **phát hiện** được việc sửa dữ liệu, nhưng không **ngăn tuyệt đối** như khi có máy chủ. Không có WebSocket, rate limit phía máy chủ hay phân quyền phía máy chủ.

## 7. Kiểm thử

Chạy bằng lệnh `node --test tests/*.test.js`. Riêng `tests/arena.test.js` có 42 test, gồm:

- **Lãi/lỗ và phí:** lãi/lỗ Long, lãi/lỗ Short, phí, IM, MM và mức thanh lý.
- **Lệnh:** từ chối lệnh vượt ký quỹ; hai lệnh chờ không dùng chung ký quỹ; Market khớp ở giá chào cộng trượt giá; Limit (kể cả gap); Stop (kể cả gap); SL gap và OCO; nến chạm cả SL và TP.
- **Vị thế:** đóng một phần theo FIFO, đảo vị thế.
- **Ký quỹ:** Margin Call; thanh lý bắt buộc với số hợp đồng tối thiểu; đáo hạn.
- **Thị trường:** thị trường đóng cửa, giá cũ, biên độ ±7%, bước giá.
- **An toàn:**
  - Chống trùng lệnh, đóng vị thế hai lần, hoàn tác khi lỗi giữa chừng.
  - Phân quyền giữa người dùng.
  - Đối chiếu sổ cái sau 30 thao tác.
  - Phát hiện ba kiểu sửa dữ liệu để tăng số dư.
  - Reset có dấu mốc.
  - Nén lịch sử vẫn đối chiếu được.
- **Thống kê:** phần thống kê lấy từ lịch sử giao dịch.
- **Dữ liệu thị trường:** thị trường mô phỏng tái lập được, đúng bước giá và biên độ, đúng phiên và lịch đáo hạn; tổng hợp khung 5 phút; kiểm tra bộ dữ liệu; Replay không lộ tương lai; Replay khớp Market ở giá mở cửa.
- **Chỉ báo:** SMA, EMA, RSI, MACD, Bollinger.
- **Store:** ví độc lập giữa người dùng; tab cũ không ghi đè; phát hiện ví bị sửa khi mở; chống spam; chấm thử thách.

Ngoài ra, Arena đã được thử bằng Playwright trên trình duyệt thật (máy tính 1440×900, máy tính bảng 1024, iPhone 13):
- Vào sàn và chạy thị trường.
- Đặt lệnh có xác nhận, SL và TP; đóng vị thế; lệnh vượt ký quỹ; đặt rồi hủy Limit.
- Đổi khung thời gian và chỉ báo; hết phiên rồi mở phiên mới; reset.
- Nhập dữ liệu WiData và chơi Replay; bắt đầu thử thách.
- F5 giữa phiên, hai tab, sửa dữ liệu bằng DevTools.

Kết quả: không có lỗi JavaScript và không có cuộn ngang ở cả ba kích thước. **Chưa kiểm thử WebSocket**, vì kiến trúc tĩnh này không có WebSocket.

## 8. Triển khai và rollback

- **Triển khai:** website tự lên GitHub Pages khi đẩy nhánh `main`. Mỗi bản phát hành tăng `version.json` cùng lúc với tag `?v=` của `js/app.js`.
- **Rollback:** chạy `git revert <commit>` rồi đẩy `main`. Dữ liệu người chơi nằm trong trình duyệt nên không bị ảnh hưởng. Khi gỡ Arena, khóa `cfaStudy_arena_*` chỉ còn nằm yên trong trình duyệt.
- Không có biến môi trường, migration hay máy chủ nào cần cấu hình.

## 9. Bước tiếp theo khi có máy chủ (chưa triển khai)

Bảng xếp hạng nhiều người qua mạng và việc **chống gian lận thật sự** cần chuyển engine lên máy chủ. Engine là các hàm thuần nên chạy được trên Node.js, với các nguyên tắc:
- Client chỉ gửi ý định đặt lệnh (`cid`, sản phẩm, chiều, loại, khối lượng, giá).
- Máy chủ khớp lệnh trên dữ liệu giá của chính nó, trong một transaction PostgreSQL.
- Máy chủ đẩy giá qua WSS.

Phác thảo các bảng:

```sql
create table arena_accounts (id uuid primary key, user_id uuid not null, kind text not null, initial bigint not null,
  status text not null default 'OK', created_at timestamptz not null default now());
create table arena_orders (id bigserial primary key, account_id uuid not null references arena_accounts,
  client_id text not null, symbol text not null, contract text not null, side char(1) not null, type text not null,
  qty int not null check (qty between 1 and 500), price bigint, stop bigint, reduce_only boolean not null, tag text,
  status text not null, reason text, created_at timestamptz not null default now(), unique (account_id, client_id));
create table arena_fills (id bigserial primary key, order_id bigint not null references arena_orders, position_id bigint not null,
  qty int not null, price bigint not null, fee bigint not null, pnl bigint not null, opening boolean not null, ts timestamptz not null);
create table arena_ledger (id bigserial primary key, account_id uuid not null references arena_accounts, type text not null,
  amount bigint not null, ref bigint, ts timestamptz not null default now());
create table arena_audit (id bigserial primary key, account_id uuid not null, action text not null, detail jsonb, ts timestamptz not null default now());
```

Các việc khác trong danh sách:
- Thanh toán lãi/lỗ hằng ngày (mark-to-market) như sàn thật.
- Khớp một phần theo thanh khoản của phiên.
- Thêm HĐTL trái phiếu chính phủ.
- Dữ liệu trong ngày (intraday) khi có nguồn được cấp phép.

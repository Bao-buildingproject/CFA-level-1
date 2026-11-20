// ============================================================
// game.js — "Game" section (under Learn). Placeholder hub only:
// no playable game yet, so nothing here pretends to be one.
// ============================================================
function renderGame() {
  view.innerHTML = `
    ${pageHeader("Financial World", "Every number is evidence. Every decision has consequences.", "", "Game · Evidence of Value")}
    <div class="card section">
      <div class="card-head"><h2>Đang xây dựng</h2><span class="badge">Chưa chơi được</span></div>
      <p class="text-2">Trò chơi phân tích báo cáo tài chính: bạn là Financial Analyst, tìm bằng chứng trong báo cáo và bảo vệ kết luận trước Investment Committee.</p>
      <ul class="text-2" style="margin:12px 0 0 18px;line-height:1.7">
        <li>Mọi con số sẽ có nhãn <strong>REAL</strong> (dữ liệu thật có nguồn), <strong>CALCULATED</strong> (tính từ dữ liệu) hoặc <strong>SIMULATED</strong> (mô phỏng).</li>
        <li>Bản đầu dùng công ty hư cấu; dữ liệu thật sẽ nhập từ file của bạn, WiData chỉ nối khi có quyền truy cập chính thức.</li>
      </ul>
    </div>
    <p class="text-3 small section">Mục này đã có trên menu để bạn theo dõi; phần chơi sẽ được thêm khi bạn yêu cầu triển khai.</p>`;
}

// ============================================================
// bond/missions.js — Bond Empire: the story campaign, missions, scoring and career
//
// Seven chapters over the 19 Fixed Income learning modules. Missions are actions —
// tag a term sheet, build a cash flow schedule, bid in an auction, price, trade,
// defend a duration target, investigate an issuer, design tranches, run a fund in a
// crisis, defend a position before the committee — and every answer is checked by the
// engine. Scores have six parts (accuracy, reasoning, risk, compliance, decision,
// performance); XP comes from the best score of each mission, never from profit alone.
// All companies, people and documents in the story are fictional.
// ============================================================
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./engine.js") : root.BondEngine, node ? require("./market.js") : root.BondMarket, node ? require("./book.js") : root.BondBook);
  if (node) module.exports = api;
  else root.BondMissions = api;
})(typeof self !== "undefined" ? self : this, function (E, M, K) {
  "use strict";

  const PARTS = { accuracy: "Độ chính xác tài chính", reasoning: "Lập luận đầu tư", risk: "Quản trị rủi ro", compliance: "Tuân thủ", decision: "Chất lượng quyết định", performance: "Hiệu quả danh mục" };
  const LEVELS = [
    { lv: 1, name: "Junior Analyst", xp: 0 }, { lv: 2, name: "Fixed Income Analyst", xp: 250 }, { lv: 3, name: "Bond Trader", xp: 650, ch: 2 },
    { lv: 4, name: "Credit Analyst", xp: 1200, ch: 4 }, { lv: 5, name: "Portfolio Manager", xp: 1800, ch: 5 }, { lv: 6, name: "Head of Fixed Income", xp: 2500, ch: 6 },
    { lv: 7, name: "Chief Investment Officer", xp: 3200, ch: 7 }, { lv: 8, name: "Founder of an Investment Fund", xp: 3800, ch: 7, ending: 70 }
  ];
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const r2 = x => Math.round(x * 100) / 100;
  const within = (v, a, tol) => v != null && isFinite(v) && Math.abs(v - a) <= tol;
  const num = v => { if (v == null || v === "") return null; const x = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(x) ? x : null; };

  // A finished check: average of the parts that apply, pass at 60%
  function result(parts, feedback, extra) {
    const vals = Object.values(parts).filter(v => v != null);
    const score = vals.length ? vals.reduce((n, v) => n + v, 0) / vals.length : 0;
    return { parts, score, pass: score >= 0.6, feedback, ...(extra || {}) };
  }
  // compute missions: numbered inputs checked against the engine, plus an optional reasoning choice
  function computeCheck(d, ans) {
    const fb = [];
    let ok = 0;
    for (const f of d.inputs) {
      const v = f.kind === "date" ? String(ans[f.key] || "").trim() : num(ans[f.key]);
      const good = f.kind === "date" ? v === f.answer : within(v, f.answer, f.tol);
      if (good) ok++;
      fb.push(`${good ? "✓" : "✗"} ${f.label}: ${f.kind === "date" ? f.answer : fmt(f.answer, f.dp)}${f.unit ? " " + f.unit : ""}${good ? "" : ` (bạn nhập ${v == null || v === "" ? "—" : v})`}`);
    }
    const parts = { accuracy: d.inputs.length ? ok / d.inputs.length : null, reasoning: null, decision: null };
    if (d.choice) {
      const good = ans.choice === d.choice.correct;
      parts[d.choice.part || "reasoning"] = good ? 1 : 0;
      fb.push(`${good ? "✓" : "✗"} ${d.choice.q} → ${d.choice.options.find(o => o[0] === d.choice.correct)[1]}`);
    }
    return result(parts, fb.concat(d.explain || []));
  }
  const fmt = (v, dp) => v == null ? "—" : Number(v).toLocaleString("vi-VN", { minimumFractionDigits: dp == null ? 2 : dp, maximumFractionDigits: dp == null ? 4 : dp });

  // ---------- Chapter 1 — The Rookie Analyst (LM1–LM3) ----------
  const TERMS = [
    ["Tổ chức phát hành: Công ty Cổ phần Mekong Grid Energy (nhân vật hư cấu)", "issuer"],
    ["Ngày đáo hạn: 01/07/2031 — kỳ hạn 7 năm kể từ ngày phát hành", "maturity"],
    ["Lãi suất cố định 5,2%/năm, trả sáu tháng một lần vào 01/01 và 01/07", "coupon"],
    ["Mệnh giá 100.000 ₫/trái phiếu; tổng giá trị phát hành 1.200 tỷ ₫", "par"],
    ["Tổ chức phát hành phải mua bảo hiểm cho các nhà máy và công bố báo cáo tài chính kiểm toán trong 120 ngày", "affirmative"],
    ["Không được cầm cố tài sản cho khoản nợ khác nếu không bảo đảm tương đương cho người sở hữu trái phiếu", "negative"],
    ["Không được chia cổ tức tiền mặt khi Nợ vay/EBITDA vượt 4,5 lần", "negative"],
    ["Trái phiếu không có tài sản bảo đảm, xếp hạng ngang các khoản nợ không bảo đảm khác của tổ chức phát hành", "seniority"],
    ["Đại diện người sở hữu trái phiếu: Aurora Trustee (hư cấu)", "trustee"],
    ["Trái phiếu được điều chỉnh bởi pháp luật Việt Nam", "law"]
  ];
  const TERM_CATS = [["issuer", "Tổ chức phát hành"], ["maturity", "Kỳ hạn / đáo hạn"], ["coupon", "Coupon"], ["par", "Mệnh giá / quy mô"], ["affirmative", "Cam kết khẳng định"],
    ["negative", "Cam kết hạn chế"], ["seniority", "Thứ tự ưu tiên / bảo đảm"], ["trustee", "Đại diện người sở hữu"], ["law", "Luật điều chỉnh"]];

  function cashflowData() {
    const b = { id: "X", coupon: 0.06, freq: 2, issue: "2026-08-18", maturity: "2029-08-18", dayCount: "30/360", bdc: "following" };
    const qty = 2000, cf = E.cashflows(b, "2026-08-18");
    const inputs = [];
    cf.forEach((c, i) => {
      inputs.push({ key: `d${i}`, label: `Kỳ ${i + 1} — ngày thanh toán (đã điều chỉnh ngày làm việc)`, kind: "date", answer: c.pay });
      inputs.push({ key: `a${i}`, label: `Kỳ ${i + 1} — số tiền nhận (₫)`, unit: "₫", answer: Math.round(qty * 100000 * c.amount / 100), tol: 0.5, dp: 0 });
    });
    return { givens: [["Trái phiếu", "Ironbay Steel 6% (hư cấu)"], ["Coupon", "6%/năm, trả 6 tháng/lần"], ["Phát hành / tính lãi từ", "18/08/2026"], ["Đáo hạn", "18/08/2029"],
      ["Quy ước ngày làm việc", "Following: rơi vào thứ Bảy/Chủ nhật thì trả ngày làm việc kế tiếp"], ["Vị thế", "2.000 trái phiếu × 100.000 ₫ = 200.000.000 ₫ mệnh giá"]],
      inputs, explain: ["Coupon mỗi kỳ = 200.000.000 × 6% / 2 = 6.000.000 ₫; kỳ cuối cộng thêm gốc 200.000.000 ₫. Ngày 18/02/2029 là Chủ nhật → 19/02/2029; 18/08/2029 là thứ Bảy → 20/08/2029."] };
  }
  const OFFERS = [
    { id: "A", name: "Silkroad Retail 8,5% 2028", rating: "BB", years: 1.3, type: "Cố định", seniority: "Không bảo đảm", price: 101.2, breaks: ["rating"] },
    { id: "B", name: "Ironbay Steel 6,8% 2030", rating: "BBB", years: 3.8, type: "Cố định", seniority: "Có bảo đảm", price: 100.8, breaks: [] },
    { id: "C", name: "Coastal Commerce Bank thả nổi 2029", rating: "A", years: 2.3, type: "Thả nổi", seniority: "Không bảo đảm", price: 99.9, breaks: ["fixed"] },
    { id: "D", name: "Pacific Logistics 6,6% 2032", rating: "BBB", years: 5.5, type: "Cố định", seniority: "Không bảo đảm", price: 103.4, breaks: ["price"] }
  ];
  const MANDATE_RULES = [["rating", "Chỉ hạng đầu tư (BBB trở lên)"], ["maturity", "Kỳ hạn còn lại ≤ 6 năm"], ["fixed", "Lãi suất cố định"], ["price", "Giá sạch ≤ 102"]];
  const AUCTION = { offered: 2000, format: "single", maxAmount: 400, need: 300,
    bids: [{ id: "Đại lý 1", yield: 0.0395, amount: 400 }, { id: "Đại lý 2", yield: 0.0400, amount: 500 }, { id: "Đại lý 3", yield: 0.0402, amount: 300 },
      { id: "Đại lý 4", yield: 0.0405, amount: 600 }, { id: "Đại lý 5", yield: 0.0408, amount: 400 }, { id: "Đại lý 6", yield: 0.0410, amount: 500 }, { id: "Đại lý 7", yield: 0.0415, amount: 300 }] };

  // ---------- Missions ----------
  const MISSIONS = [];
  const add = m => MISSIONS.push(m);
  add({ id: "c1-indenture", ch: 1, lm: "LM1", xp: 100, type: "tag", title: "Giải phẫu bản điều khoản",
    brief: "Ngày đầu ở Aurora Capital, trưởng phòng Linh Trần (hư cấu) đưa bạn bản điều khoản trái phiếu Mekong Grid Energy. Gắn mỗi điều khoản vào đúng nhóm trước buổi họp lúc 9 giờ.",
    data: () => ({ items: TERMS.map(t => t[0]), cats: TERM_CATS }),
    check: (ans) => { let ok = 0; const fb = TERMS.map((t, i) => { const g = ans[i] === t[1]; if (g) ok++; return `${g ? "✓" : "✗"} ${t[0].slice(0, 70)}… → ${TERM_CATS.find(c => c[0] === t[1])[1]}`; });
      return result({ accuracy: ok / TERMS.length }, fb.concat(["Cam kết khẳng định là việc tổ chức phát hành PHẢI làm; cam kết hạn chế là việc KHÔNG được làm."])); } });
  add({ id: "c1-cashflow", ch: 1, lm: "LM1–LM2", xp: 120, type: "compute", title: "Lịch dòng tiền của khách hàng",
    brief: "Một khách hàng vừa mua 2.000 trái phiếu Ironbay Steel. Lập lịch nhận tiền chính xác từng kỳ để bộ phận vận hành đối chiếu.",
    data: cashflowData, check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c1-offers", ch: 1, lm: "LM1–LM3", xp: 140, type: "choose", title: "Ba bản chào bán (và một bản thứ tư)",
    brief: "Quỹ hưu trí khách hàng đặt tiêu chí. Đánh dấu điều khoản nào của từng bản chào bán vi phạm tiêu chí, rồi chọn sản phẩm đáp ứng.",
    data: () => ({ offers: OFFERS, rules: MANDATE_RULES }),
    check: (ans) => {
      let ok = 0, tot = 0;
      for (const o of OFFERS) for (const [r] of MANDATE_RULES) { tot++; if (!!(ans.breaks && ans.breaks[o.id] && ans.breaks[o.id][r]) === o.breaks.includes(r)) ok++; }
      const pick = ans.pick === "B";
      return result({ reasoning: ok / tot, decision: pick ? 1 : 0, compliance: ans.pick && OFFERS.find(o => o.id === ans.pick).breaks.length === 0 ? 1 : 0 },
        [`${pick ? "✓" : "✗"} Sản phẩm phù hợp: Ironbay Steel 6,8% 2030 (BBB, cố định, có bảo đảm, giá 100,8)`, `Đánh dấu vi phạm đúng ${ok}/${tot} ô.`,
          "Silkroad là hạng BB (lợi suất cao); Coastal Bank là lãi suất thả nổi; Pacific Logistics giá 103,4 vượt 102."]);
    } });
  add({ id: "c1-auction", ch: 1, lm: "LM2–LM3", xp: 150, type: "auction", title: "Phiên đấu thầu trái phiếu chính phủ",
    brief: "Kho bạc (mô phỏng) gọi thầu 2.000 tỷ ₫ trái phiếu 5 năm theo phương thức một giá (mọi người trúng thầu nhận cùng lãi suất). Khách hàng cần mua ít nhất 300 tỷ, tối đa 400 tỷ. Bạn đặt lãi suất và khối lượng; bạn không thấy giá thầu của đại lý khác cho tới khi mở thầu.",
    data: () => ({ offered: AUCTION.offered, need: AUCTION.need, maxAmount: AUCTION.maxAmount }),
    check: (ans) => {
      const y = num(ans.yield) / 100, amt = num(ans.amount);
      if (!(y > 0) || !(amt > 0)) return result({ accuracy: 0 }, ["Nhập lãi suất đặt thầu và khối lượng"]);
      const r = E.auction({ offered: AUCTION.offered, format: "single", bids: AUCTION.bids.concat([{ id: "Bạn", yield: y, amount: amt }]) });
      const me = r.alloc.find(a => a.id === "Bạn"), got = me ? me.filled : 0;
      const perf = clamp01(got / AUCTION.need), comp = amt <= AUCTION.maxAmount ? 1 : 0;
      const yieldScore = got >= AUCTION.need ? clamp01((r.stopOut - 0.0395) / (0.0408 - 0.0395)) : 0;
      return result({ performance: perf, compliance: comp, decision: yieldScore },
        [`Lãi suất trúng thầu (stop-out): ${(r.stopOut * 100).toFixed(2)}% · bạn trúng ${fmt(got, 0)} tỷ ₫ · tỷ lệ đặt thầu/gọi thầu ${r.bidToCover.toFixed(2)} lần`,
          ...r.alloc.map(a => `${a.id}: đặt ${fmt(a.bid, 0)} @ ${(a.yield * 100).toFixed(2)}% → trúng ${fmt(a.filled, 1)}`),
          "Trong đấu thầu một giá, đặt lãi suất thấp hơn giúp chắc trúng mà vẫn nhận lãi suất trúng thầu chung — nhưng khối lượng của bạn lại có thể kéo lãi suất trúng thầu xuống."], { auction: r });
    } });

  // ---------- Chapter 2 — The Debt Market (LM4–LM5) ----------
  function fundingData() {
    const cpPV = E.mm.pvDiscountBasis(50, 90, 0.05), cpAor = E.mm.addOnFromPrice(cpPV, 50, 90, 365);
    const bankInt = 50 * 0.053 * 90 / 365, bankFee = 50 * 0.0015, bankEff = (bankInt + bankFee) / (50 - bankFee) * 365 / 90;
    const repoCash = 40 * (1 - 0.02);
    return { givens: [["Nhu cầu", "50 tỷ ₫ trong 90 ngày"], ["Thương phiếu (CP)", "lãi suất chiết khấu 5,0%/năm, cơ sở 360 ngày, mệnh giá 50 tỷ"],
      ["Hạn mức ngân hàng", "5,3%/năm lãi cộng thêm (cơ sở 365) + phí thu xếp 0,15% trừ ngay khi giải ngân"], ["Repo", "4,6%/năm (cơ sở 360), cần TPCP làm tài sản đảm bảo; công ty có 40 tỷ TPCP, haircut 2%"]],
      inputs: [{ key: "cp", label: "Chi phí CP quy đổi lãi cộng thêm, năm 365 ngày", unit: "%", answer: cpAor * 100, tol: 0.01 },
        { key: "bank", label: "Chi phí thực của hạn mức ngân hàng (năm 365 ngày)", unit: "%", answer: bankEff * 100, tol: 0.02 },
        { key: "repo", label: "Số tiền tối đa vay được qua repo", unit: "tỷ ₫", answer: repoCash, tol: 0.01 }],
      choice: { q: "Nguồn đơn lẻ rẻ nhất mà vẫn đủ 50 tỷ?", options: [["cp", "Thương phiếu"], ["bank", "Hạn mức ngân hàng"], ["repo", "Repo"]], correct: "cp", part: "decision" },
      explain: ["CP: PV = 50 × (1 − 90/360 × 5%) = 49,375 tỷ → lãi cộng thêm = 365/90 × 0,625/49,375. Repo rẻ nhất nhưng chỉ vay được 40 × 98% = 39,2 tỷ, không đủ."] };
  }
  add({ id: "c2-funding", ch: 2, lm: "LM4", xp: 130, type: "compute", title: "Huy động vốn ngắn hạn", brief: "Pacific Logistics (hư cấu) cần 50 tỷ ₫ trong 90 ngày để trả tiền hàng. So sánh chi phí thực của ba nguồn và chọn nguồn phù hợp.", data: fundingData, check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c2-repo", ch: 2, lm: "LM4", xp: 110, type: "compute", title: "Bàn repo", brief: "Aurora cầm cố 120 tỷ ₫ TPCP (giá thị trường) trong 14 ngày để lấy tiền. Tính các con số của hợp đồng repo.",
    data: () => { const r = E.repo(120, 0.03, 0.044, 14); return { givens: [["Giá trị TPCP", "120 tỷ ₫"], ["Haircut", "3%"], ["Lãi suất repo", "4,4%/năm, cơ sở 360"], ["Kỳ hạn", "14 ngày"]],
      inputs: [{ key: "cash", label: "Tiền nhận được hôm nay", unit: "tỷ ₫", answer: r.cash, tol: 0.001 }, { key: "int", label: "Tiền lãi repo", unit: "tỷ ₫", answer: r.interest, tol: 0.001 },
        { key: "rep", label: "Giá mua lại", unit: "tỷ ₫", answer: r.repurchase, tol: 0.001 }],
      choice: { q: "Nếu giá TPCP làm tài sản đảm bảo giảm mạnh, ai chịu rủi ro tín dụng trước?", options: [["lender", "Bên cho vay tiền (người nhận TPCP)"], ["borrower", "Bên vay tiền"]], correct: "lender" },
      explain: ["Tiền nhận = 120 × (1 − 3%) = 116,4 tỷ; lãi = 116,4 × 4,4% × 14/360. Haircut là đệm bảo vệ bên cho vay nếu giá tài sản đảm bảo giảm."] }; },
    check: (ans, d) => computeCheck(d, ans) });
  const IGHY = [["Kho bạc (mô phỏng) — chính phủ", "gov"], ["Mekong Grid Energy — AA", "ig"], ["Coastal Commerce Bank — A", "ig"], ["Pacific Logistics — BBB", "ig"],
    ["Ironbay Steel — BBB", "ig"], ["Silkroad Retail — BB", "hy"], ["Lotus Crest Land — B", "hy"], ["Harbor Shipping (hư cấu) — CCC", "hy"]];
  add({ id: "c2-ighy", ch: 2, lm: "LM5", xp: 90, type: "tag", title: "Hạng đầu tư hay lợi suất cao",
    brief: "Bộ phận quản trị rủi ro cần phân loại nhà phát hành trước khi cập nhật hạn mức. Xếp từng tổ chức vào đúng nhóm.",
    data: () => ({ items: IGHY.map(x => x[0]), cats: [["gov", "Chính phủ"], ["ig", "Hạng đầu tư (IG)"], ["hy", "Lợi suất cao (HY)"]] }),
    check: (ans) => { let ok = 0; const fb = IGHY.map((x, i) => { const g = ans[i] === x[1]; if (g) ok++; return `${g ? "✓" : "✗"} ${x[0]}`; });
      return result({ accuracy: ok / IGHY.length }, fb.concat(["Ranh giới hạng đầu tư là BBB− (thang S&P/Fitch) hay Baa3 (Moody's)."])); } });
  add({ id: "c2-govauction", ch: 2, lm: "LM5", xp: 100, type: "compute", title: "Đọc kết quả đấu thầu TPCP",
    brief: "Kho bạc (mô phỏng) gọi thầu 9.000 tỷ ₫, nhà đầu tư đặt 21.600 tỷ ₫, nhưng chỉ 7.500 tỷ ₫ trúng thầu. Đọc tín hiệu nhu cầu.",
    data: () => ({ givens: [["Gọi thầu", "9.000 tỷ ₫"], ["Tổng đặt thầu", "21.600 tỷ ₫"], ["Trúng thầu", "7.500 tỷ ₫"]],
      inputs: [{ key: "btc", label: "Tỷ lệ đặt thầu / gọi thầu (bid-to-cover)", unit: "lần", answer: 2.4, tol: 0.005 }, { key: "aw", label: "Tỷ lệ trúng thầu / gọi thầu", unit: "%", answer: 7500 / 9000 * 100, tol: 0.05 }],
      choice: { q: "Cách đọc hợp lý nhất?", options: [["a", "Nhu cầu yếu nên Kho bạc không bán hết"], ["b", "Nhu cầu mạnh nhưng nhiều mức lãi suất đặt thầu cao hơn mức Kho bạc chấp nhận"], ["c", "Kho bạc thiếu tiền"]], correct: "b" } }),
    check: (ans, d) => computeCheck(d, ans) });

  // ---------- Chapter 3 — The Pricing Game (LM6–LM9) ----------
  function priceData() {
    const b = { coupon: 0.07, freq: 2, issue: "2026-06-15", maturity: "2031-06-15", dayCount: "30/360" }, p = E.priceFromYield(b, "2027-04-10", 0.062);
    return { givens: [["Trái phiếu", "coupon 7%/năm, trả 6 tháng/lần, đáo hạn 15/06/2031"], ["Quy ước đếm ngày", "30/360"], ["Ngày thanh toán", "10/04/2027"], ["YTM (quy ước 6 tháng)", "6,2%"]],
      inputs: [{ key: "full", label: "Giá bẩn (full price) / 100 mệnh giá", answer: p.full, tol: 0.01 }, { key: "ai", label: "Lãi dồn tích", answer: p.ai, tol: 0.005 }, { key: "clean", label: "Giá sạch (flat price)", answer: p.clean, tol: 0.01 }],
      explain: [`Kỳ hiện tại 15/12/2026 → 15/06/2027: 30/360 cho 115 ngày trên 180 → t/T = ${(115 / 180).toFixed(4)}. Giá bẩn = PV tại 15/12/2026 × 1,031^(t/T).`] };
  }
  add({ id: "c3-price", ch: 3, lm: "LM6", xp: 140, type: "compute", title: "Định giá giữa hai kỳ coupon", brief: "Bàn giao dịch cần báo giá sạch và giá bẩn cho khách. Định giá chính xác tới 0,01.", data: priceData, check: (ans, d) => computeCheck(d, ans) });
  function ytmData() {
    const b = { coupon: 0.055, freq: 1, issue: "2023-03-10", maturity: "2033-03-10", dayCount: "ACT/ACT" }, y = E.ytm(b, "2027-03-10", 96.5);
    return { givens: [["Trái phiếu", "coupon 5,5%/năm, trả hằng năm, đáo hạn 10/03/2033"], ["Ngày thanh toán", "10/03/2027 (đúng ngày trả coupon)"], ["Giá sạch", "96,50"]],
      inputs: [{ key: "ytm", label: "YTM", unit: "%", answer: y * 100, tol: 0.005 }, { key: "cy", label: "Lợi suất hiện hành (current yield)", unit: "%", answer: 5.5 / 96.5 * 100, tol: 0.005 }],
      choice: { q: "Vì sao YTM lớn hơn lợi suất hiện hành?", options: [["a", "Vì trái phiếu được mua dưới mệnh giá: nhà đầu tư còn được khoản lãi vốn khi giá kéo về 100"], ["b", "Vì coupon được tái đầu tư ở lãi suất thấp hơn"], ["c", "Vì có lãi dồn tích"]], correct: "a" } };
  }
  add({ id: "c3-ytm", ch: 3, lm: "LM6–LM7", xp: 120, type: "compute", title: "Giải YTM", brief: "Khách hàng hỏi: mua ở 96,50 thì lợi suất bao nhiêu? Tính YTM và lợi suất hiện hành.", data: ytmData, check: (ans, d) => computeCheck(d, ans) });
  function curveData() {
    const bt = E.bootstrap({ tenors: [1, 2, 3], par: [0.032, 0.038, 0.043] }, 3);
    return { givens: [["Lợi suất par (trả lãi hằng năm)", "1 năm 3,2% · 2 năm 3,8% · 3 năm 4,3%"]],
      inputs: [{ key: "z2", label: "Lãi suất spot 2 năm", unit: "%", answer: bt.z[2] * 100, tol: 0.005 }, { key: "z3", label: "Lãi suất spot 3 năm", unit: "%", answer: bt.z[3] * 100, tol: 0.005 },
        { key: "f11", label: "Lãi suất kỳ hạn 1 năm, bắt đầu sau 1 năm (1y1y)", unit: "%", answer: E.forward(bt, 1, 2) * 100, tol: 0.005 },
        { key: "f21", label: "Lãi suất kỳ hạn 1 năm, bắt đầu sau 2 năm (2y1y)", unit: "%", answer: E.forward(bt, 2, 3) * 100, tol: 0.005 }],
      choice: { q: "Đường cong par dốc lên thì đường spot so với đường par thế nào?", options: [["above", "Nằm trên đường par"], ["below", "Nằm dưới đường par"], ["same", "Trùng nhau"]], correct: "above" },
      explain: ["Bootstrap: DF₁ = 1/1,032; DF₂ = (1 − 0,038·DF₁)/1,038; z₂ = DF₂^(−1/2) − 1. Kỳ hạn: (1+z₂)² = (1+z₁)(1+f₁,₁)."] };
  }
  add({ id: "c3-curve", ch: 3, lm: "LM9", xp: 160, type: "compute", title: "Dựng đường spot và forward", brief: "Trưởng phòng muốn kiểm tra mô hình định giá: dựng đường spot từ đường par và suy ra lãi suất kỳ hạn.", data: curveData, check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c3-frn", ch: 3, lm: "LM8", xp: 110, type: "compute", title: "Định giá trái phiếu thả nổi",
    brief: "Coastal Commerce Bank chào trái phiếu thả nổi. Nhà đầu tư đòi biên chiết khấu cao hơn biên niêm yết — trái phiếu đáng giá bao nhiêu?",
    data: () => ({ givens: [["Lãi suất tham chiếu", "4,0%/năm (giả định không đổi)"], ["Biên niêm yết (quoted margin)", "1,5%"], ["Biên chiết khấu yêu cầu (discount margin)", "2,0%"], ["Trả lãi", "hằng quý, còn 3 năm (12 kỳ), đang ở ngày xác định lãi suất"]],
      inputs: [{ key: "p", label: "Giá / 100 mệnh giá", answer: E.frnPrice(0.04, 0.015, 0.02, 4, 12), tol: 0.01 }],
      choice: { q: "Biên chiết khấu > biên niêm yết nghĩa là?", options: [["below", "Trái phiếu giao dịch dưới mệnh giá vì rủi ro tín dụng đã tăng"], ["above", "Trên mệnh giá"], ["par", "Đúng mệnh giá"]], correct: "below" } }),
    check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c3-richcheap", ch: 3, lm: "LM7", xp: 170, type: "desk", desk: "story", title: "Rich hay cheap?",
    brief: "Bạn được giao 100 triệu ₫ của bàn giao dịch. Trong các trái phiếu doanh nghiệp hạng đầu tư, tìm trái phiếu có Z-spread cao nhất (rẻ nhất so với đường cong) và mua ít nhất 300 trái phiếu. Không mua trái phiếu lợi suất cao.",
    data: () => ({}),
    check: (ans, d, ctx) => {
      const st = ctx.market, a = ctx.account, ig = M.universe(st).filter(q => q.rating !== "GOV" && M.isIG(q.rating) && !q.defaulted);
      const best = ig.reduce((x, q) => !x || q.z > x.z ? q : x, null), h = a.holdings[best.bond.id];
      const hy = Object.keys(a.holdings).some(id => { const q = M.quote(st, id); return q && q.rating !== "GOV" && !M.isIG(q.rating); });
      const held = h ? h.qty : 0;
      return result({ decision: held >= 300 ? 1 : held > 0 ? 0.5 : 0, accuracy: held > 0 ? 1 : Object.keys(a.holdings).length ? 0.3 : 0, compliance: hy ? 0 : 1 },
        [`Trái phiếu IG có Z-spread cao nhất: ${best.bond.name} — Z-spread ${(best.z * 100).toFixed(2)}%`, `Bạn đang nắm ${held} trái phiếu này.`, hy ? "✗ Danh mục có trái phiếu lợi suất cao, vi phạm hạn mức." : "✓ Không có trái phiếu lợi suất cao."]);
    } });

  // ---------- Chapter 4 — Duration Wars (LM10–LM13) ----------
  function measureData() {
    const b = { coupon: 0.06, freq: 2, issue: "2027-01-15", maturity: "2032-01-15", dayCount: "30/360" }, r = E.yieldRisk(b, "2027-01-15", 0.05);
    return { givens: [["Trái phiếu", "coupon 6%, trả 6 tháng/lần, còn đúng 5 năm"], ["YTM", "5% (quy ước 6 tháng)"], ["Vị thế", "10 tỷ ₫ mệnh giá"]],
      inputs: [{ key: "mac", label: "Macaulay duration (năm)", answer: r.mac, tol: 0.005 }, { key: "mod", label: "Modified duration (năm)", answer: r.mod, tol: 0.005 },
        { key: "pvbp", label: "PVBP của vị thế (₫ cho 1 điểm cơ bản)", unit: "₫", answer: r.pvbp / 100 * 10e9, tol: r.pvbp / 100 * 10e9 * 0.005, dp: 0 },
        { key: "cvx", label: "Convexity (năm²)", answer: r.cvx, tol: 0.2 }],
      explain: ["Macaulay = Σ t·PV(CF)/Giá (t tính theo năm); Modified = Macaulay/(1 + y/2); PVBP = Modified × giá trị vị thế × 0,0001."] };
  }
  add({ id: "c4-measure", ch: 4, lm: "LM12", xp: 140, type: "compute", title: "Đo rủi ro lãi suất", brief: "Thị trường đồn ngân hàng trung ương sắp tăng lãi suất. Đo độ nhạy của vị thế 10 tỷ ₫.", data: measureData, check: (ans, d) => computeCheck(d, ans) });
  function estimateData() {
    const b = { coupon: 0.04, freq: 1, issue: "2027-02-01", maturity: "2047-02-01", dayCount: "ACT/ACT" }, s = E.shock(b, "2027-02-01", 0.05, 0.01);
    return { givens: [["Trái phiếu", "coupon 4%, trả hằng năm, còn 20 năm"], ["YTM", "5%"], ["Cú sốc", "+100 điểm cơ bản"]],
      inputs: [{ key: "dur", label: "% thay đổi giá ước tính chỉ bằng duration", unit: "%", answer: s.durOnly * 100, tol: 0.05 },
        { key: "cvx", label: "% thay đổi ước tính có điều chỉnh convexity", unit: "%", answer: s.withCvx * 100, tol: 0.05 },
        { key: "act", label: "% thay đổi thực tế khi định giá lại toàn bộ", unit: "%", answer: s.actual * 100, tol: 0.02 }],
      choice: { q: "Vì sao ước tính bằng duration lỗ nhiều hơn thực tế?", options: [["a", "Convexity dương: giá giảm chậm dần khi lợi suất tăng"], ["b", "Do lãi dồn tích"], ["c", "Do thuế"]], correct: "a" } };
  }
  add({ id: "c4-estimate", ch: 4, lm: "LM12–LM13", xp: 140, type: "compute", title: "Xấp xỉ hay định giá lại", brief: "Ủy ban rủi ro hỏi: nếu lợi suất tăng 1%, trái phiếu 20 năm mất bao nhiêu? So sánh xấp xỉ với định giá lại đầy đủ.", data: estimateData, check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c4-defense", ch: 4, lm: "LM10–LM13", xp: 220, type: "desk", desk: "story", shock: 0.015, title: "Duration Defense",
    brief: "Ủy ban giao mục tiêu: duration của toàn bộ danh mục (tính cả tiền mặt) từ 3,5 đến 4,5 năm, đầu tư ít nhất 85% NAV. Dùng Terminal (chế độ Cốt truyện) để cơ cấu, nhập dự báo khoản lỗ khi lợi suất tăng 150 điểm cơ bản, rồi kích hoạt cú sốc.",
    data: () => ({ band: [3.5, 4.5], invested: 0.85, shockBp: 150 }),
    check: (ans, d, ctx) => {
      const r = K.risk(ctx.account, ctx.market), s = K.shockPortfolio(ctx.account, ctx.market, E.shiftCurve(ctx.market.curve, 0.015));
      const inBand = r.durNav >= 3.5 && r.durNav <= 4.5, inv = 1 - r.cashPct;
      const bench = -r.nav * (4 * 0.015 - 0.5 * 30 * 0.015 * 0.015);
      const guess = num(ans.guess);
      const acc = guess == null ? 0 : clamp01(1 - Math.abs(guess - s.actual) / Math.max(1, Math.abs(s.actual)) / 0.2);
      return result({ compliance: inBand && inv >= 0.85 ? 1 : inBand || inv >= 0.85 ? 0.5 : 0, risk: clamp01(1 - Math.abs(r.durNav - 4) / 1.5), accuracy: acc, performance: s.actual >= bench * 1.05 ? 1 : 0.5 },
        [`Duration danh mục (theo NAV): ${r.durNav.toFixed(2)} năm · đã đầu tư ${(inv * 100).toFixed(1)}% NAV`, `Cú sốc +150 bp: thay đổi thực tế ${Math.round(s.actual).toLocaleString("vi-VN")} ₫; ước tính duration + convexity ${Math.round(s.estimate).toLocaleString("vi-VN")} ₫`,
          `Dự báo của bạn: ${guess == null ? "—" : Math.round(guess).toLocaleString("vi-VN") + " ₫"}`, `Danh mục chuẩn duration 4: khoảng ${Math.round(bench).toLocaleString("vi-VN")} ₫`], { shock: s });
    } });
  function krdData(st) {
    const mk = st || M.createSynthetic({ seed: 404 });
    const bullet = [["GOV-33", 1]], barbell = [["GOV-28", 0.55], ["GOV-46", 0.45]];
    const krdOf = list => { const k = [0, 0, 0, 0, 0]; for (const [id, w] of list) { const q = M.quote(mk, id), r = E.curveRisk(q.bond, mk.date, mk.curve, q.z); r.krd.forEach((x, i) => { k[i] += x * w; }); } return k; };
    const kb = krdOf(bullet), kk = krdOf(barbell), move = [-0.0025, -0.001, 0, 0.003, 0.005];
    const loss = k => -k.reduce((n, x, i) => n + x * move[i], 0);
    return { givens: [["Bullet", "100% TPCP 2033"], ["Barbell", "55% TPCP 2028 + 45% TPCP 2046"], ["Kịch bản dốc lên", "1Y −25 bp · 3Y −10 bp · 5Y 0 · 10Y +30 bp · 20Y +50 bp"],
      ["KRD bullet (1·3·5·10·20)", kb.map(x => x.toFixed(2)).join(" · ")], ["KRD barbell (1·3·5·10·20)", kk.map(x => x.toFixed(2)).join(" · ")]],
      inputs: [{ key: "b", label: "% thay đổi giá trị bullet trong kịch bản", unit: "%", answer: loss(kb) * 100, tol: 0.03 }, { key: "k", label: "% thay đổi giá trị barbell", unit: "%", answer: loss(kk) * 100, tol: 0.03 }],
      choice: { q: "Danh mục nào chịu thiệt nhiều hơn khi đường cong dốc lên?", options: [["bullet", "Bullet"], ["barbell", "Barbell"]], correct: loss(kb) < loss(kk) ? "bullet" : "barbell", part: "decision" },
      explain: ["%ΔP ≈ −Σ KRDᵢ × Δyᵢ. Duration tổng có thể gần nhau, nhưng phân bổ theo kỳ hạn quyết định rủi ro đường cong."] };
  }
  add({ id: "c4-krd", ch: 4, lm: "LM13", xp: 160, type: "compute", title: "Key rate duration", brief: "Hai danh mục có duration gần bằng nhau. Dùng key rate duration để biết danh mục nào chịu thiệt khi đường cong dốc lên.", data: () => krdData(), check: (ans, d) => computeCheck(d, ans) });

  // ---------- Chapter 5 — The Credit Collapse (LM14–LM16) ----------
  const LCL_CASE = {
    years: [2024, 2025, 2026],
    fs: { revenue: [4200, 3100, 1900], ebitda: [1150, 820, 410], interest: [520, 610, 690], debt: [9800, 11600, 12900], cash: [1400, 700, 260], equity: [6100, 5900, 5200], cfo: [-300, -850, -1200], inventory: [12000, 14500, 16300] },
    maturities: [["2027", 4800, "gồm LCL thứ cấp 13% 2027: 1.500"], ["2028", 2100, ""], ["2029", 3200, "gồm LCL 11% 2029 có bảo đảm: 2.500"]],
    docs: [
      { id: "fs", title: "Báo cáo tài chính hợp nhất (tỷ ₫)" },
      { id: "prospectus", title: "Bản công bố thông tin trái phiếu LCL 11% 2029", text: "Trái phiếu có bảo đảm bằng quyền sử dụng đất dự án Lotus Riverside, định giá 3.000 tỷ ₫ (năm 2023). Cam kết: Nợ ròng/EBITDA không vượt 6 lần; tổ chức phát hành phải bổ sung tài sản bảo đảm khi giá trị bảo đảm thấp hơn 110% dư nợ." },
      { id: "rating", title: "Báo cáo xếp hạng (hư cấu)", text: "Hạng B, triển vọng tiêu cực. Khả năng trả nợ năm 2027 phụ thuộc vào việc bán tài sản và đàm phán gia hạn." },
      { id: "payments", title: "Lịch sử thanh toán lãi", text: "Hai kỳ lãi của một lô trái phiếu khác được trả chậm 12 và 19 ngày trong năm 2026; một kỳ được gia hạn theo thỏa thuận với trái chủ." },
      { id: "news", title: "Tin doanh nghiệp", text: "Giám đốc tài chính từ nhiệm tháng 8/2026; công ty đổi đơn vị kiểm toán; giấy phép xây dựng giai đoạn 2 bị chậm; công ty bán một khu đất cho bên liên quan với giá cao hơn thị trường 30%; khai trương văn phòng bán hàng mới tại trung tâm." },
      { id: "collateral", title: "Thông tin tài sản bảo đảm", text: "Định giá lại tháng 9/2026: 2.100 tỷ ₫ (giảm từ 3.000 tỷ ₫). Dư nợ LCL 11% 2029: 2.500 tỷ ₫." }
    ],
    facts: [
      ["f1", "EBITDA/chi phí lãi vay năm 2026 dưới 1 lần", true], ["f2", "Nợ vay/EBITDA tăng vọt lên hơn 30 lần", true], ["f3", "Dòng tiền kinh doanh âm ba năm liên tiếp và âm sâu dần", true],
      ["f4", "Tiền mặt 260 tỷ so với 4.800 tỷ nợ đến hạn năm 2027", true], ["f5", "Trả lãi chậm và xin gia hạn ở trái phiếu khác", true], ["f6", "Giám đốc tài chính từ nhiệm, đổi kiểm toán", true],
      ["f7", "Bán đất cho bên liên quan với giá cao bất thường", true], ["f8", "Tài sản bảo đảm 2.100 tỷ thấp hơn dư nợ 2.500 tỷ", true], ["f9", "Doanh thu năm 2024 cao", false],
      ["f10", "Khai trương văn phòng bán hàng mới", false], ["f11", "Lãi suất coupon 11% cao hơn thị trường", false], ["f12", "Hàng tồn kho (quỹ đất) tăng mỗi năm", true]
    ],
    estate: 6000, collateral: 2100, claims: [{ name: "LCL 11% 2029 (có bảo đảm)", rank: "secured", amount: 2500 }, { name: "Nợ không bảo đảm khác", rank: "senior", amount: 8900 }, { name: "LCL thứ cấp 13% 2027", rank: "sub", amount: 1500 }]
  };
  function detectiveTruth() {
    const f = LCL_CASE.fs, w = E.recoveryWaterfall(LCL_CASE.estate, LCL_CASE.collateral, LCL_CASE.claims);
    return { coverage: f.ebitda[2] / f.interest[2], lev: f.debt[2] / f.ebitda[2], rrSec: w.claims[0].rate, rrSub: w.claims[2].rate, w };
  }
  add({ id: "c5-detective", ch: 5, lm: "LM14–LM16", xp: 300, type: "detective", title: "Credit Detective: Lotus Crest Land",
    brief: "Giá trái phiếu Lotus Crest Land (hư cấu) giảm mạnh. Đọc hồ sơ, ghim những dấu hiệu rủi ro THẬT, tính chỉ số, ước tính tỷ lệ thu hồi nếu vỡ nợ, rồi đề xuất với Hội đồng. Hệ thống không chỉ ra đáp án trước.",
    data: () => LCL_CASE,
    check: (ans) => {
      const t = detectiveTruth(), pins = ans.pins || {}, flags = LCL_CASE.facts;
      const tp = flags.filter(x => x[2] && pins[x[0]]).length, fp = flags.filter(x => !x[2] && pins[x[0]]).length, real = flags.filter(x => x[2]).length;
      const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp / real;
      const acc = [within(num(ans.coverage), t.coverage, 0.01), within(num(ans.lev), t.lev, 0.1), within(num(ans.rrSec), t.rrSec * 100, 1), within(num(ans.rrSub), t.rrSub * 100, 1)];
      const sellSub = ans.sub === "sell", secDec = ans.sec === "sell" || ans.sec === "hold";
      return result({ reasoning: 2 * precision * recall / ((precision + recall) || 1), accuracy: acc.filter(Boolean).length / 4, decision: (sellSub ? 0.6 : 0) + (secDec ? 0.2 : 0) + (ans.pd === "high" ? 0.2 : 0),
        risk: ans.limit === "zero" || ans.limit === "cut" ? 1 : 0.3 },
        [`Dấu hiệu rủi ro: ghim đúng ${tp}/${real}, ghim nhầm ${fp}.`, `EBITDA/lãi vay 2026 = 410/690 = ${t.coverage.toFixed(2)} lần; Nợ/EBITDA = 12.900/410 = ${t.lev.toFixed(1)} lần.`,
          `Thu hồi nếu vỡ nợ: trái phiếu có bảo đảm ${(t.rrSec * 100).toFixed(1)}% (2.100 từ tài sản bảo đảm + phần thiếu hụt chia ngang hàng nợ không bảo đảm); thứ cấp ${(t.rrSub * 100).toFixed(1)}%.`,
          `${sellSub ? "✓" : "✗"} Trái phiếu thứ cấp gần như mất trắng khi vỡ nợ: nên bán.`, `${ans.pd === "high" ? "✓" : "✗"} Xác suất vỡ nợ: cao.`]);
    } });
  add({ id: "c5-pd", ch: 5, lm: "LM14", xp: 120, type: "compute", title: "Spread nói gì về xác suất vỡ nợ",
    brief: "Silkroad Retail đang có spread 6% so với TPCP. Giả định tỷ lệ thu hồi 40%. Suy ra xác suất vỡ nợ hằng năm mà thị trường đang ngầm định và khoản lỗ kỳ vọng.",
    data: () => ({ givens: [["Credit spread", "6,0%/năm"], ["Tỷ lệ thu hồi", "40%"], ["Vị thế", "10 tỷ ₫"]],
      inputs: [{ key: "pd", label: "Xác suất vỡ nợ hằng năm ngầm định ≈ spread / (1 − RR)", unit: "%", answer: 10, tol: 0.01 },
        { key: "el", label: "Khoản lỗ kỳ vọng 1 năm của vị thế", unit: "tỷ ₫", answer: E.expectedLoss(10, 0.1, 0.4), tol: 0.001 }],
      choice: { q: "Vì sao spread thực tế thường lớn hơn khoản lỗ kỳ vọng?", options: [["a", "Thêm phần bù thanh khoản và phần bù cho sự bất định của rủi ro"], ["b", "Vì thuế thu nhập"], ["c", "Vì lãi dồn tích"]], correct: "a" } }),
    check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c5-derisk", ch: 5, lm: "LM14–LM16", xp: 200, type: "desk", desk: "story", setup: "inherit", title: "Giảm rủi ro trước cơn bão",
    brief: "Bạn được bàn giao thêm danh mục của một đồng nghiệp gồm trái phiếu Lotus Crest Land và Silkroad Retail. Trước khi thị trường biết tin xấu, đưa tỷ trọng trái phiếu lợi suất cao về tối đa 5% NAV và không còn nắm Lotus Crest Land. Bán sớm có chi phí — giữ lại có thể mất nhiều hơn.",
    data: () => ({}),
    check: (ans, d, ctx) => {
      const r = K.risk(ctx.account, ctx.market), lcl = Object.keys(ctx.account.holdings).some(id => id.startsWith("LCL"));
      return result({ compliance: r.hy <= 0.05 ? 1 : clamp01(1 - (r.hy - 0.05) / 0.15), risk: lcl ? 0 : 1, decision: !lcl && r.hy <= 0.05 ? 1 : 0.3 },
        [`Tỷ trọng lợi suất cao: ${(r.hy * 100).toFixed(1)}% NAV`, lcl ? "✗ Vẫn nắm trái phiếu Lotus Crest Land" : "✓ Đã thoát Lotus Crest Land"]);
    } });

  // ---------- Chapter 6 — Structured Finance Factory (LM17–LM19) ----------
  const ABS_POOL = { balance: 1000, wac: 0.11, term: 48, cpr: 0.06, recovery: 0.4, fee: 0.005 };
  function absRun(sizes, stressCdr) {
    const tr = [{ name: "Senior", size: sizes[0], coupon: 0.055 }, { name: "Mezzanine", size: sizes[1], coupon: 0.085 }, { name: "Equity", size: sizes[2], coupon: 0 }];
    return E.absWaterfall({ pool: { ...ABS_POOL, cdr: stressCdr }, tranches: tr });
  }
  add({ id: "c6-abs", ch: 6, lm: "LM17–LM18", xp: 260, type: "factory", mode: "abs", title: "Thiết kế ABS cho vay mua xe",
    brief: "Aurora mua 1.000 tỷ ₫ khoản vay mua xe, đưa vào một SPE và phát hành chứng khoán. Thiết kế ba lớp (Senior/Mezzanine/Equity) sao cho trong kịch bản xấu (tỷ lệ vỡ nợ CDR 8%/năm): Senior không lỗ, Mezzanine lỗ không quá 25%, Equity ít nhất 3%. Senior càng lớn, chi phí vốn càng rẻ.",
    data: () => ({ pool: ABS_POOL, stress: 0.08 }),
    check: (ans) => {
      const s = [num(ans.s), num(ans.m), num(ans.e)];
      if (s.some(x => x == null || x < 0) || Math.abs(s[0] + s[1] + s[2] - 1000) > 0.5) return result({ compliance: 0 }, ["Tổng ba lớp phải đúng 1.000 tỷ ₫ (không lớp nào âm)."]);
      const r = absRun(s, 0.08), sen = r.tranches[0], mez = r.tranches[1];
      const ok = [sen.lossPct < 1e-9, mez.lossPct <= 0.25, s[2] >= 30];
      let best = 0; for (let x = 950; x >= 500; x -= 10) { const t = absRun([x, 1000 - x - 30, 30], 0.08); if (t.tranches[0].lossPct < 1e-9 && t.tranches[1].lossPct <= 0.25) { best = x; break; } }
      return result({ compliance: ok.filter(Boolean).length / 3, performance: ok.every(Boolean) ? clamp01(s[0] / best) : 0, risk: sen.lossPct < 1e-9 ? 1 : 0 },
        [`Kịch bản CDR 8%: tổng tổn thất pool ${fmt(r.totalLoss, 1)} tỷ ₫`, `Senior lỗ ${(sen.lossPct * 100).toFixed(2)}% · WAL ${sen.wal ? sen.wal.toFixed(2) : "—"} năm`,
          `Mezzanine lỗ ${(mez.lossPct * 100).toFixed(1)}% · Equity lỗ ${(r.tranches[2].lossPct * 100).toFixed(1)}%`, `Senior lớn nhất mà vẫn đạt mọi điều kiện (với equity 30 tỷ): khoảng ${best} tỷ ₫.`], { run: r });
    } });
  function mbsData() {
    const a = E.passThrough({ balance: 500, wac: 0.08, rate: 0.075, term: 360, psa: 100 }), b = E.passThrough({ balance: 500, wac: 0.08, rate: 0.075, term: 360, psa: 300 });
    return { givens: [["Pool thế chấp nhà ở", "500 tỷ ₫, lãi suất bình quân 8%, chuyển cho nhà đầu tư 7,5%, 30 năm"], ["Công cụ", "Dùng mục MBS trong Structured Finance Factory để chạy mô phỏng"]],
      inputs: [{ key: "w100", label: "WAL ở 100 PSA", unit: "năm", answer: a.wal, tol: 0.05 }, { key: "w300", label: "WAL ở 300 PSA", unit: "năm", answer: b.wal, tol: 0.05 }],
      choice: { q: "Lãi suất thị trường giảm mạnh thì nhà đầu tư MBS gặp rủi ro gì?", options: [["contraction", "Rủi ro rút ngắn (contraction): trả trước nhanh, phải tái đầu tư ở lãi suất thấp"], ["extension", "Rủi ro kéo dài (extension)"], ["none", "Không có rủi ro"]], correct: "contraction" } };
  }
  add({ id: "c6-mbs", ch: 6, lm: "LM19", xp: 150, type: "compute", title: "Rủi ro trả trước của MBS", brief: "Một quỹ hỏi mua chứng khoán thế chấp nhà ở. Chạy mô phỏng tốc độ trả trước và đo đời sống bình quân.", data: mbsData, check: (ans, d) => computeCheck(d, ans) });
  add({ id: "c6-cmo", ch: 6, lm: "LM19", xp: 200, type: "factory", mode: "cmo", title: "CMO trả tuần tự",
    brief: "Chia pool 500 tỷ ₫ (8%, 30 năm, 150 PSA) thành ba lớp trả gốc tuần tự A → B → C. Một ngân hàng muốn lớp A có WAL từ 2 đến 3,5 năm; một công ty bảo hiểm muốn lớp C có WAL trên 15 năm.",
    data: () => ({ balance: 500, psa: 150 }),
    check: (ans) => {
      const s = [num(ans.a), num(ans.b), num(ans.c)];
      if (s.some(x => x == null || x <= 0) || Math.abs(s[0] + s[1] + s[2] - 500) > 0.5) return result({ compliance: 0 }, ["Tổng ba lớp phải đúng 500 tỷ ₫."]);
      const pt = E.passThrough({ balance: 500, wac: 0.08, rate: 0.075, term: 360, psa: 150 }), t = E.cmoSequential(pt, s);
      const okA = t[0].wal >= 2 && t[0].wal <= 3.5, okC = t[2].wal > 15;
      return result({ compliance: (okA ? 0.5 : 0) + (okC ? 0.5 : 0), accuracy: null, performance: okA && okC ? 1 : 0.3 },
        [`WAL lớp A ${t[0].wal.toFixed(2)} năm ${okA ? "✓" : "✗"} · lớp B ${t[1].wal.toFixed(2)} năm · lớp C ${t[2].wal.toFixed(2)} năm ${okC ? "✓" : "✗"}`, "Trả tuần tự không làm biến mất rủi ro trả trước: nó chia lại rủi ro rút ngắn/kéo dài giữa các lớp."], { cmo: t });
    } });

  // ---------- Chapter 7 — The Yield War (all modules) ----------
  const FUND = {
    weeks: 12, mandate: { dur: [2, 6], hy: 0.15, issuer: 0.25, cash: 0.03 },
    start: [["LCL-29", 100], ["SRR-28", 150], ["GOV-41", 300], ["MGE-31", 200]],
    script: [
      { week: 2, text: "Lạm phát vượt xa dự báo: thị trường đặt cược ngân hàng trung ương tăng lãi suất", macro: { inflation: 0.012 }, curve: [0.008, 0.007, 0.006, 0.004, 0.003] },
      { week: 4, text: "Lotus Crest Land mất khả năng thanh toán; nhà đầu tư bán tháo trái phiếu doanh nghiệp", default: "LCL", macro: { risk: 0.6, liquidity: -0.35 }, stress: { SRR: 0.6, IBS: 0.3 }, kind: "default" },
      { week: 6, text: "Khách hàng tổ chức yêu cầu rút 20% giá trị quỹ, phải chi trả khi sang tuần 7", redeem: 0.2, kind: "redeem" },
      { week: 9, text: "Ngân hàng trung ương can thiệp: bơm thanh khoản, giảm lãi suất 50 điểm cơ bản", macro: { policy: -0.005, risk: -0.4, liquidity: 0.3, inflation: -0.006 }, curve: [-0.006, -0.005, -0.004, -0.003, -0.002] },
      { week: 12, text: "Kết thúc kỳ đánh giá: Hội đồng xem xét kết quả quỹ", kind: "end" }
    ]
  };
  const ENDINGS = [[85, "Huyền thoại thị trường trái phiếu", "Quỹ vượt chuẩn, giữ kỷ luật và trả tiền khách đúng hạn. Hội đồng đề nghị bạn lập quỹ riêng."], [70, "CIO vững vàng", "Bạn vượt qua khủng hoảng với tổn thất có kiểm soát. Hội đồng tín nhiệm bạn thêm nhiệm kỳ."],
    [50, "Sống sót", "Quỹ trụ được nhưng nhiều quyết định trễ. Hội đồng yêu cầu kế hoạch khắc phục."], [0, "Bị thay thế", "Tổn thất và vi phạm hạn mức quá lớn. Hội đồng thay CIO."]];
  // Mandate breaches at one point in time
  function mandateBreaches(a, st, mandate) {
    const r = K.risk(a, st), out = [];
    if (r.durNav < mandate.dur[0] || r.durNav > mandate.dur[1]) out.push(`Duration ${r.durNav.toFixed(2)} ngoài khoảng ${mandate.dur[0]}–${mandate.dur[1]}`);
    if (r.hy > mandate.hy) out.push(`Lợi suất cao ${(r.hy * 100).toFixed(1)}% > ${mandate.hy * 100}% NAV`);
    const byIssuer = {};
    for (const p of r.positions) if (p.bond.issuer !== "GOV") byIssuer[p.bond.issuer] = (byIssuer[p.bond.issuer] || 0) + p.mv / r.nav;
    for (const [k, v] of Object.entries(byIssuer)) if (v > mandate.issuer) out.push(`Tập trung ${k} ${(v * 100).toFixed(1)}% > ${mandate.issuer * 100}%`);
    if (mandate.cash != null && r.cashPct < mandate.cash) out.push(`Tiền mặt ${(r.cashPct * 100).toFixed(1)}% < ${mandate.cash * 100}%`);
    return out;
  }
  function fundScore(run) {
    const perf = clamp01(0.5 + (run.ret - run.benchRet) / 0.04), risk = clamp01(1 - run.maxDD / 0.08);
    const comp = clamp01(1 - run.breaches / (run.weeks * 2)), liq = run.redeemed ? (run.fireSale ? 0.4 : 1) : 0;
    const total = (perf * 0.35 + risk * 0.2 + comp * 0.25 + liq * 0.2) * 100;
    const ending = ENDINGS.find(e => total >= e[0]);
    return { parts: { performance: perf, risk, compliance: comp, decision: liq }, total, ending };
  }
  add({ id: "c7-fund", ch: 7, lm: "LM1–LM19", xp: 400, type: "desk", desk: "fund", title: "The Yield War",
    brief: "Bạn là CIO của Aurora Bond Fund (100 triệu ₫ ảo, danh mục được bàn giao). Trong 12 tuần có cú sốc lạm phát, một vụ vỡ nợ, yêu cầu rút vốn 20% và một đợt giải cứu. Giữ duration 2–6 năm, lợi suất cao ≤ 15% NAV, mỗi tổ chức phát hành ≤ 25%, tiền mặt ≥ 3%; vượt danh mục chuẩn (giữ nguyên danh mục ban đầu).",
    data: () => ({ fund: FUND }),
    check: (ans, d, ctx) => {
      const run = ctx.account && ctx.account.meta && ctx.account.meta.run;
      if (!run || !run.done) return result({ performance: 0 }, ["Hoàn tất đủ 12 tuần trong Terminal (chế độ Quỹ CIO) rồi kiểm tra."]);
      const s = fundScore(run);
      return result(s.parts, [`Kết thúc: ${s.ending[1]} — ${s.ending[2]}`, `Lợi nhuận quỹ ${(run.ret * 100).toFixed(2)}% · danh mục chuẩn ${(run.benchRet * 100).toFixed(2)}% · sụt giảm tối đa ${(run.maxDD * 100).toFixed(2)}%`,
        `Số lần vi phạm hạn mức (đếm theo tuần): ${run.breaches} · rút vốn: ${run.redeemed ? (run.fireSale ? "trả được nhưng phải bán tháo" : "trả đúng hạn") : "chưa trả"}`], { ending: s.ending, total: s.total });
    } });
  add({ id: "c7-committee", ch: 7, lm: "LM1–LM19", xp: 250, type: "committee", title: "Hội đồng đầu tư",
    brief: "Bảo vệ một vị thế 200 trái phiếu (20 triệu ₫ mệnh giá) trước Hội đồng. Hội đồng chấm theo tiêu chí công khai và đối chiếu từng con số với engine.",
    data: () => ({}), check: (ans, d, ctx) => committeeCheck(ans, ctx.market) });

  // ---------- Investment Committee (also used outside the story) ----------
  const RISKS = [["rate", "Lãi suất (duration)"], ["credit", "Tín dụng / vỡ nợ"], ["liquidity", "Thanh khoản"], ["reinvest", "Tái đầu tư"], ["prepay", "Trả trước"]];
  const PLANS = [["dur", "Giới hạn duration / phòng ngừa lãi suất"], ["spread", "Ngưỡng cắt lỗ khi spread nới rộng"], ["diversify", "Giới hạn tập trung theo tổ chức phát hành"], ["liquid", "Đệm tiền mặt / tài sản thanh khoản"], ["watch", "Theo dõi cam kết và báo cáo tài chính hằng quý"]];
  function committeeTruth(st, bondId) {
    const q = M.quote(st, bondId), b = M.bondById(bondId), qty = 200, par = qty * M.FACE;
    const mv = par * q.full / 100;
    const up = q.ytm != null ? E.priceFromYield(b, st.date, q.ytm + 0.01, { index: q.index }).full : q.full;
    const rr = M.SENIORITY[b.seniority].rr, iss = st.issuers[b.issuer];
    const rating = q.rating, fairZ = rating === "GOV" ? 0 : M.RATING[rating === "D" ? "CCC" : rating].s + M.SENIORITY[b.seniority].add;
    const fair = q.defaulted ? q.mid : E.priceOnCurve(b, st.date, M.bootOf(st), fairZ, { index: q.index }).clean;
    return { q, b, mv, shock: par * (up - q.full) / 100, defaultLoss: b.issuer === "GOV" ? 0 : mv - par * rr, fair, rr, years: q.years, defaulted: !!(iss && iss.defaulted), fairZ };
  }
  function committeeCheck(ans, st) {
    if (!ans.bondId || !M.bondById(ans.bondId)) return result({ accuracy: 0 }, ["Chọn trái phiếu cần bảo vệ."]);
    const t = committeeTruth(st, ans.bondId), fb = [], q = t.q;
    const shock = num(ans.shock), dl = num(ans.defaultLoss), fair = num(ans.fair);
    const accParts = [within(shock, t.shock, Math.max(20000, Math.abs(t.shock) * 0.1)), within(dl, t.defaultLoss, Math.max(20000, Math.abs(t.defaultLoss) * 0.05)), within(fair, t.fair, 0.5)];
    fb.push(`${accParts[0] ? "✓" : "✗"} +100 bp: vị thế thay đổi ${Math.round(t.shock).toLocaleString("vi-VN")} ₫ (định giá lại đầy đủ)`);
    fb.push(`${accParts[1] ? "✓" : "✗"} Vỡ nợ hôm nay (thu hồi ${(t.rr * 100).toFixed(0)}% theo thứ tự ưu tiên): lỗ ${Math.round(t.defaultLoss).toLocaleString("vi-VN")} ₫`);
    fb.push(`${accParts[2] ? "✓" : "✗"} Giá trị hợp lý (spread trung bình hạng ${(t.fairZ * 100).toFixed(2)}%): ${t.fair.toFixed(2)} so với giá chào bán ${q.ask.toFixed(2)}`);
    const gov = t.b.issuer === "GOV", hy = !gov && !M.isIG(q.rating === "D" ? "CCC" : q.rating), frn = !!t.b.frn;
    const okRisk = gov ? ["rate", "reinvest"].includes(ans.risk) : hy || t.defaulted ? ans.risk === "credit" : frn ? ["credit", "liquidity"].includes(ans.risk) : ["rate", "credit"].includes(ans.risk);
    fb.push(`${okRisk ? "✓" : "✗"} Rủi ro lớn nhất bạn nêu: ${(RISKS.find(r => r[0] === ans.risk) || ["", "—"])[1]}${okRisk ? "" : gov ? " — trái phiếu chính phủ chủ yếu chịu rủi ro lãi suất" : hy ? " — với trái phiếu lợi suất cao, rủi ro tín dụng chi phối" : frn ? " — lãi suất thả nổi làm duration rất thấp" : ""}`);
    const plan = ans.plan || {}, relevant = { rate: ["dur"], credit: ["spread", "diversify", "watch"], liquidity: ["liquid"], reinvest: ["dur"], prepay: ["dur"] }[ans.risk] || [];
    const nPlan = Object.values(plan).filter(Boolean).length, hasRel = relevant.some(k => plan[k]);
    const horizonOk = ans.horizon ? (ans.horizon === "short" ? t.years > 0 : true) : false;
    const rec = ans.rec, cheap = t.fair > q.ask, rich = t.fair < q.bid;
    const decOk = t.defaulted ? rec === "sell" : rec === "buy" ? cheap : rec === "sell" ? rich || hy : true;
    fb.push(`${decOk ? "✓" : "✗"} Khuyến nghị ${rec === "buy" ? "Mua" : rec === "sell" ? "Bán" : "Giữ"} ${decOk ? "nhất quán với giá trị hợp lý" : "không nhất quán với giá trị hợp lý và tình trạng tín dụng"}`);
    const comp = rec === "buy" && hy ? 0.4 : 1;
    if (comp < 1) fb.push("✗ Quỹ chỉ được mua mới trái phiếu hạng đầu tư.");
    const qs = [`Nếu lợi suất tăng 100 bp, vị thế mất bao nhiêu và vì sao?`, `Thứ tự ưu tiên của trái phiếu này là gì, thu hồi bao nhiêu nếu vỡ nợ?`, `Vì sao giá trị hợp lý ${t.fair > q.mid ? "cao" : "thấp"} hơn giá thị trường?`, `Kế hoạch của bạn nếu spread nới thêm 200 bp?`];
    return result({ accuracy: accParts.filter(Boolean).length / 3, reasoning: (okRisk ? 0.7 : 0) + (horizonOk ? 0.3 : 0), risk: clamp01((nPlan >= 2 ? 0.5 : nPlan * 0.25) + (hasRel ? 0.5 : 0)), compliance: comp, decision: decOk ? 1 : 0 }, fb, { questions: qs, truth: t });
  }

  // ---------- Chapters ----------
  const CHAPTERS = [
    { n: 1, title: "The Rookie Analyst", vi: "Chuyên viên tập sự", lms: "LM1–LM3", story: "Bạn gia nhập Aurora Capital (hư cấu) với vị trí Junior Fixed Income Analyst. Trước khi được giao dịch, bạn phải đọc hiểu một trái phiếu, dòng tiền của nó và cách nó được bán ra thị trường." },
    { n: 2, title: "The Debt Market", vi: "Thị trường nợ", lms: "LM4–LM5", story: "Aurora làm việc với các tổ chức phát hành: doanh nghiệp cần vốn ngắn hạn, ngân hàng dùng repo, Kho bạc gọi thầu. Bạn học cách đọc thị trường nợ từ cả hai phía." },
    { n: 3, title: "The Pricing Game", vi: "Trò chơi định giá", lms: "LM6–LM9", story: "Bạn được lên bàn giao dịch. Mỗi báo giá sai một chút cũng là tiền thật của khách hàng: giá sạch, giá bẩn, YTM, spread và đường cong lợi suất." },
    { n: 4, title: "Duration Wars", vi: "Cuộc chiến duration", lms: "LM10–LM13", story: "Lạm phát tăng, thị trường chờ cú sốc lãi suất. Bạn phải đo và điều chỉnh độ nhạy của danh mục trước khi quá muộn." },
    { n: 5, title: "The Credit Collapse", vi: "Sụp đổ tín dụng", lms: "LM14–LM16", story: "Một tập đoàn bất động sản có dấu hiệu mất khả năng thanh toán. Ai đọc đúng hồ sơ sẽ thoát; ai tin vào lãi suất coupon cao sẽ chịu lỗ." },
    { n: 6, title: "Structured Finance Factory", vi: "Xưởng chứng khoán hóa", lms: "LM17–LM19", story: "Aurora mở mảng chứng khoán hóa. Bạn thiết kế SPE, phân lớp, thứ tự thanh toán và đo rủi ro trả trước." },
    { n: 7, title: "The Yield War", vi: "Cuộc chiến lợi suất", lms: "LM1–LM19", story: "Bạn trở thành CIO của một quỹ trái phiếu giữa khủng hoảng. Mọi kiến thức của 19 module được thử thách cùng lúc." }
  ];
  CHAPTERS.forEach(c => { c.missions = MISSIONS.filter(m => m.ch === c.n).map(m => m.id); });
  const missionById = id => MISSIONS.find(m => m.id === id);

  // ---------- Career ----------
  function xpOf(progress) { let x = 0; for (const [id, p] of Object.entries(progress || {})) { const m = missionById(id); if (m && p.best) x += Math.round(m.xp * p.best); } return x; }
  function chapterDone(progress, n) { return CHAPTERS[n - 1].missions.every(id => progress[id] && progress[id].passed); }
  function chapterOpen(progress, n) { return n === 1 || chapterDone(progress, n - 1); }
  function level(progress, ending) {
    const xp = xpOf(progress);
    let cur = LEVELS[0];
    for (const L of LEVELS) {
      if (xp < L.xp) break;
      if (L.ch && !chapterDone(progress, L.ch - (L.lv >= 7 ? 1 : 0))) break;
      if (L.ending && !(ending >= L.ending)) break;
      cur = L;
    }
    const nx = LEVELS[cur.lv] || null;
    return { ...cur, xp, next: nx, progress: nx ? clamp01((xp - cur.xp) / (nx.xp - cur.xp)) : 1 };
  }

  // ---------- Portfolio challenges and the championship ----------
  const CHALLENGES = [
    { id: "income", name: "Quỹ thu nhập ổn định", weeks: 8, seed: 5101, desc: "8 tuần. Chỉ hạng đầu tư, duration 2–4 năm. Mục tiêu lợi nhuận ≥ 0,6% (≈ 4%/năm) và sụt giảm ≤ 1,5%.", mandate: { dur: [2, 4], hy: 0, issuer: 0.4, cash: 0 }, target: 0.006, maxDD: 0.015 },
    { id: "shield", name: "Lá chắn lãi suất", weeks: 8, seed: 5202, desc: "8 tuần, lợi suất tăng khoảng 150 bp. Duration 1–5 năm. Không lỗ quá 1% và vượt TPCP 2036 nắm giữ thụ động.", mandate: { dur: [1, 5], hy: 0.1, issuer: 0.3, cash: 0 }, target: -0.01, maxDD: 0.03,
      script: [{ week: 2, text: "Ngân hàng trung ương bất ngờ tăng lãi suất 50 bp", macro: { policy: 0.005, inflation: 0.004 }, curve: [0.005, 0.005, 0.004, 0.004, 0.003] }, { week: 5, text: "Lạm phát tiếp tục tăng, lợi suất dài hạn leo thang", curve: [0.002, 0.003, 0.005, 0.006, 0.006] }] },
    { id: "hunter", name: "Săn lợi suất", weeks: 10, seed: 5303, desc: "10 tuần. Lợi suất cao ≤ 30% NAV, duration 1–6. Mục tiêu ≥ 1,2% và sụt giảm ≤ 3%.", mandate: { dur: [1, 6], hy: 0.3, issuer: 0.25, cash: 0 }, target: 0.012, maxDD: 0.03 }
  ];

  return { PARTS, LEVELS, CHAPTERS, MISSIONS, missionById, TERM_CATS, MANDATE_RULES, OFFERS, AUCTION, LCL_CASE, FUND, ENDINGS, CHALLENGES, RISKS, PLANS,
    computeCheck, detectiveTruth, committeeTruth, committeeCheck, mandateBreaches, fundScore, absRun, krdData, xpOf, chapterDone, chapterOpen, level, result, num };
});

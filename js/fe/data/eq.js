// Financial English · Equity Investments — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("eq", [
  {
    id: "eq-01", type: "vocabulary", difficulty: "Beginner",
    term: "Common stock", ipa: "/ˈkɒmən stɒk/", vietnamese: "Cổ phiếu phổ thông",
    definition: "An equity security that represents ownership in a company, usually with voting rights and a residual claim on its assets and earnings.",
    explanation: "Chứng khoán vốn thể hiện quyền sở hữu doanh nghiệp, thường kèm quyền biểu quyết và quyền hưởng phần tài sản, lợi nhuận còn lại sau khi trả các bên khác.",
    example: "Holders of common stock vote for the board of directors and share in profits after creditors and preferred shareholders are paid.",
    relatedTerms: ["Preferred stock", "Voting rights", "Residual claim"],
    cfaApplication: "Common shareholders bear the most risk in the capital structure, so they require the highest expected return."
  },
  {
    id: "eq-02", type: "vocabulary", difficulty: "Beginner",
    term: "Preferred stock", ipa: "/prɪˈfɜːd stɒk/", vietnamese: "Cổ phiếu ưu đãi",
    definition: "A class of equity that ranks ahead of ordinary shares for dividends and liquidation proceeds, usually with a fixed dividend and no voting rights.",
    explanation: "Loại cổ phiếu được ưu tiên hơn cổ phiếu phổ thông khi chia cổ tức và khi thanh lý; thường có cổ tức cố định và không có quyền biểu quyết.",
    example: "A preferred share with a $100 par value and a 6% dividend rate pays $6 a year.",
    relatedTerms: ["Cumulative preferred", "Common stock", "Dividend"],
    cfaApplication: "Preferred stock has features of both debt and equity and, without a maturity, is valued like a perpetuity: V = D ÷ r."
  },
  {
    id: "eq-03", type: "vocabulary", difficulty: "Beginner",
    term: "Market capitalization", ipa: "/ˈmɑːkɪt ˌkæpɪtəlaɪˈzeɪʃn/", vietnamese: "Vốn hóa thị trường",
    definition: "The total market value of a company's outstanding shares, equal to the share price multiplied by the number of shares outstanding.",
    explanation: "Tổng giá trị thị trường của số cổ phiếu đang lưu hành: giá cổ phiếu nhân với số cổ phiếu lưu hành.",
    example: "A company with 50 million shares trading at $40 has a market capitalization of $2 billion.",
    relatedTerms: ["Large-cap", "Enterprise value", "Free float"],
    cfaApplication: "Most major equity indexes are weighted by market capitalization, often adjusted for free float."
  },
  {
    id: "eq-04", type: "vocabulary", difficulty: "Beginner",
    term: "Initial public offering (IPO)", ipa: "/ɪˌnɪʃl ˈpʌblɪk ˈɒfərɪŋ/", vietnamese: "Phát hành cổ phiếu lần đầu ra công chúng",
    definition: "The first sale of a company's shares to the general public, after which the shares can trade on a stock exchange.",
    explanation: "Lần đầu tiên doanh nghiệp bán cổ phiếu ra công chúng; sau đó cổ phiếu được niêm yết và giao dịch trên sở giao dịch chứng khoán.",
    example: "The company raised $300 million in its IPO and listed on the exchange the following week.",
    relatedTerms: ["Primary market", "Underwriter", "Listing"],
    cfaApplication: "IPO shares are sold in the primary market, usually with an investment bank acting as underwriter."
  },
  {
    id: "eq-05", type: "vocabulary", difficulty: "Beginner",
    term: "Primary market", ipa: "/ˈpraɪməri ˈmɑːkɪt/", vietnamese: "Thị trường sơ cấp",
    definition: "The market in which issuers sell newly created securities to investors and receive the proceeds.",
    explanation: "Thị trường nơi tổ chức phát hành bán chứng khoán mới cho nhà đầu tư và trực tiếp nhận tiền huy động.",
    example: "A government auctioning newly issued bonds is selling them in the primary market.",
    relatedTerms: ["Secondary market", "IPO", "Issuer"],
    cfaApplication: "The primary market raises new capital; the secondary market provides the liquidity that makes new issues attractive."
  },
  {
    id: "eq-06", type: "vocabulary", difficulty: "Beginner",
    term: "Secondary market", ipa: "/ˈsekəndri ˈmɑːkɪt/", vietnamese: "Thị trường thứ cấp",
    definition: "The market in which investors trade existing securities among themselves; the issuer receives no money from these trades.",
    explanation: "Thị trường nơi nhà đầu tư mua bán lại chứng khoán đã phát hành; tổ chức phát hành không nhận được tiền từ các giao dịch này.",
    example: "Buying shares of a listed company through a broker on the stock exchange is a secondary market trade.",
    relatedTerms: ["Primary market", "Liquidity", "Stock exchange"],
    cfaApplication: "A well-functioning secondary market offers liquidity, transparency and low transaction costs."
  },
  {
    id: "eq-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Short selling", ipa: "/ˌʃɔːt ˈselɪŋ/", vietnamese: "Bán khống",
    definition: "Selling securities you have borrowed, hoping to buy them back later at a lower price and return them to the lender.",
    explanation: "Bán chứng khoán đi vay với kỳ vọng mua lại sau với giá thấp hơn để trả cho bên cho vay, hưởng chênh lệch.",
    example: "An investor borrows and sells a share at $50, later buys it back at $40 and returns it, earning $10 before costs.",
    relatedTerms: ["Securities lending", "Margin", "Long position"],
    cfaApplication: "A short seller's potential loss is unlimited because the share price can rise without limit."
  },
  {
    id: "eq-08", type: "vocabulary", difficulty: "Intermediate",
    term: "Margin call", ipa: "/ˈmɑːdʒɪn kɔːl/", vietnamese: "Yêu cầu ký quỹ bổ sung",
    definition: "A broker's demand for an investor to deposit more money when the equity in a margin account falls below the maintenance margin requirement.",
    explanation: "Yêu cầu của công ty chứng khoán buộc nhà đầu tư nộp thêm tiền khi tỷ lệ vốn chủ trong tài khoản ký quỹ giảm dưới mức duy trì tối thiểu.",
    example: "After the share price fell 30%, the investor received a margin call and had to add $5,000 to the account.",
    relatedTerms: ["Initial margin", "Maintenance margin", "Leverage"],
    cfaApplication: "The price that triggers a margin call is P0 × (1 − initial margin) ÷ (1 − maintenance margin)."
  },
  {
    id: "eq-09", type: "vocabulary", difficulty: "Intermediate",
    term: "Market efficiency", ipa: "/ˈmɑːkɪt ɪˈfɪʃnsi/", vietnamese: "Tính hiệu quả của thị trường",
    definition: "The degree to which market prices quickly and fully reflect all available information.",
    explanation: "Mức độ mà giá trên thị trường phản ánh nhanh chóng và đầy đủ mọi thông tin hiện có.",
    example: "When a share price adjusts within minutes of an earnings announcement, prices are reflecting new information quickly.",
    relatedTerms: ["Weak form", "Semi-strong form", "Strong form"],
    cfaApplication: "The efficient market hypothesis has weak, semi-strong and strong forms, each ruling out a different source of abnormal returns."
  },
  {
    id: "eq-10", type: "vocabulary", difficulty: "Beginner",
    term: "Stock index", ipa: "/stɒk ˈɪndeks/", vietnamese: "Chỉ số chứng khoán",
    definition: "A measure of the combined value of a group of stocks that represents a market or a segment of it.",
    explanation: "Thước đo giá trị tổng hợp của một nhóm cổ phiếu, đại diện cho toàn thị trường hoặc một phân khúc.",
    example: "The VN-Index tracks the stocks listed on the Ho Chi Minh City Stock Exchange.",
    relatedTerms: ["Benchmark", "Index weighting", "Index fund"],
    cfaApplication: "Indexes can be price-weighted, equal-weighted, market-cap-weighted or fundamentally weighted, and each gives different results."
  },
  {
    id: "eq-11", type: "vocabulary", difficulty: "Beginner",
    term: "Dividend yield", ipa: "/ˈdɪvɪdend jiːld/", vietnamese: "Tỷ suất cổ tức",
    definition: "Annual dividends per share divided by the current share price.",
    explanation: "Cổ tức hằng năm trên mỗi cổ phiếu chia cho giá cổ phiếu hiện tại.",
    example: "A $2 annual dividend on a $50 share gives a dividend yield of 4%.",
    relatedTerms: ["Dividend", "Payout ratio", "Total return"],
    cfaApplication: "A stock's total return equals its dividend yield plus its capital gain yield."
  },
  {
    id: "eq-12", type: "vocabulary", difficulty: "Intermediate",
    term: "Intrinsic value", ipa: "/ɪnˈtrɪnsɪk ˈvæljuː/", vietnamese: "Giá trị nội tại",
    definition: "The value of an asset based on its fundamentals, such as expected cash flows and risk, which may differ from its market price.",
    explanation: "Giá trị của tài sản dựa trên các yếu tố cơ bản (dòng tiền kỳ vọng và rủi ro), có thể khác với giá thị trường.",
    example: "If an analyst estimates a stock is worth $60 while it trades at $45, the analyst considers it undervalued.",
    relatedTerms: ["Market price", "Discounted cash flow", "Margin of safety"],
    cfaApplication: "Equity valuation compares an estimate of intrinsic value with the market price to judge whether a stock is over- or undervalued."
  },
  {
    id: "eq-13", type: "definition", difficulty: "Beginner",
    term: "Price-to-earnings ratio (P/E)", ipa: "/ˌpraɪs tʊ ˈɜːnɪŋz ˈreɪʃiəʊ/", vietnamese: "Hệ số giá trên lợi nhuận",
    question: "What is the price-to-earnings ratio?",
    definition: "A valuation multiple that compares a company's share price with its profit attributable to each share.",
    formula: "P/E = Market price per share ÷ Earnings per share",
    formulaNote: "Trailing P/E uses the last 12 months' EPS; forward (leading) P/E uses expected EPS for the next 12 months.",
    explanation: "Cho biết nhà đầu tư sẵn sàng trả bao nhiêu đồng cho một đồng lợi nhuận của doanh nghiệp.",
    example: "A share priced at $60 with EPS of $4 has a P/E of 15.",
    relatedTerms: ["Earnings per share", "Price-to-book ratio", "Valuation multiples"],
    cfaApplication: "P/E ratios are compared with peers and history, but differences in growth, risk and accounting must be considered."
  },
  {
    id: "eq-14", type: "definition", difficulty: "Advanced",
    term: "Gordon growth model", ipa: "/ˈɡɔːdn ɡrəʊθ ˈmɒdl/", vietnamese: "Mô hình tăng trưởng Gordon",
    question: "What is the Gordon growth model?",
    definition: "A dividend discount model that values a stock as the present value of dividends expected to grow at a constant rate forever.",
    formula: "V0 = D1 ÷ (r − g)",
    formulaNote: "D1 = next year's dividend = D0 × (1 + g); r = required return on equity; g = constant long-term growth rate. Valid only if r > g.",
    explanation: "Mô hình chiết khấu cổ tức giả định cổ tức tăng trưởng đều mãi mãi; giá trị cổ phiếu bằng cổ tức năm tới chia cho (lợi suất yêu cầu − tốc độ tăng trưởng).",
    example: "With D1 = $2, r = 10% and g = 4%, the value is 2 ÷ 0.06 = $33.33.",
    relatedTerms: ["Dividend discount model", "Required return", "Sustainable growth rate"],
    cfaApplication: "The model suits mature, dividend-paying companies and is very sensitive to the gap between r and g."
  },
  {
    id: "eq-15", type: "definition", difficulty: "Intermediate",
    term: "Earnings per share (EPS)", ipa: "/ˈɜːnɪŋz pə ˈʃeə/", vietnamese: "Lợi nhuận trên mỗi cổ phiếu",
    question: "What is earnings per share?",
    definition: "The profit available to common shareholders divided by the number of common shares, showing the profit attributable to each share.",
    formula: "Basic EPS = (Net income − Preferred dividends) ÷ Weighted average number of common shares outstanding",
    formulaNote: "Diluted EPS also assumes the conversion or exercise of securities, such as convertible bonds and options, that would reduce EPS.",
    explanation: "Phần lợi nhuận dành cho cổ đông phổ thông tính trên mỗi cổ phiếu phổ thông đang lưu hành.",
    example: "Net income of $10 million, preferred dividends of $1 million and 3 million shares give basic EPS of $3.00.",
    relatedTerms: ["Diluted EPS", "Price-to-earnings ratio", "Net income"],
    cfaApplication: "Potential shares are included in diluted EPS only if they reduce it; antidilutive securities are excluded."
  },
  {
    id: "eq-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Cổ phiếu tăng trưởng", term: "Growth stock", ipa: "/ˈɡrəʊθ stɒk/",
    definition: "A share of a company expected to increase its earnings faster than the market average, usually with a high P/E ratio and low or no dividends.",
    explanation: "Cổ phiếu của doanh nghiệp được kỳ vọng tăng trưởng lợi nhuận nhanh hơn mức trung bình thị trường; thường có P/E cao, ít hoặc không chia cổ tức.",
    example: "Investors paid 60 times earnings for the software company because they expected rapid expansion.",
    relatedTerms: ["Value stock", "Price-to-earnings ratio", "Investment style"]
  },
  {
    id: "eq-17", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Cổ phiếu giá trị", term: "Value stock", ipa: "/ˈvæljuː stɒk/",
    definition: "A share that appears cheap relative to fundamentals such as earnings, book value or dividends, often with a low P/E or price-to-book ratio.",
    explanation: "Cổ phiếu có vẻ rẻ so với các chỉ tiêu cơ bản (lợi nhuận, giá trị sổ sách, cổ tức), thường có P/E hoặc P/B thấp.",
    example: "A bank trading at 0.8 times its book value may be considered a value stock.",
    relatedTerms: ["Growth stock", "Price-to-book ratio", "Investment style"]
  },
  {
    id: "eq-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Lệnh giới hạn", term: "Limit order", ipa: "/ˈlɪmɪt ˌɔːdə/",
    definition: "An order to buy or sell a security at a specified price or better; it is executed only if the market reaches that price.",
    explanation: "Lệnh mua hoặc bán với mức giá chỉ định hoặc tốt hơn; chỉ được khớp khi giá thị trường đạt mức đó.",
    example: "A buy limit order at $25 will not execute while the stock trades at $26.",
    relatedTerms: ["Market order", "Stop order", "Execution"]
  },
  {
    id: "eq-19", type: "mcq", difficulty: "Intermediate", term: "Weak-form efficiency",
    question: "If a market is weak-form efficient, which approach should NOT earn abnormal returns consistently?",
    options: [
      "Using material non-public information",
      "Technical analysis of past prices and trading volume",
      "Fundamental analysis of financial statements",
      "Analysing industry competition and management quality"
    ],
    correctAnswer: "B",
    explanationEn: "Weak-form efficiency means current prices already reflect all past market data, so technical analysis cannot earn abnormal returns. Fundamental analysis may still work if the market is not semi-strong-form efficient, and inside information is ruled out only by strong-form efficiency.",
    explanationVi: "Hiệu quả dạng yếu nghĩa là giá hiện tại đã phản ánh mọi dữ liệu giá và khối lượng trong quá khứ, nên phân tích kỹ thuật không tạo được lợi nhuận vượt trội. Phân tích cơ bản vẫn có thể hiệu quả nếu thị trường chưa đạt dạng trung bình, còn thông tin nội bộ chỉ bị loại trừ ở dạng mạnh."
  },
  {
    id: "eq-20", type: "mcq", difficulty: "Advanced", term: "Return on a margin purchase",
    question: "An investor buys a share at $50 with an initial margin of 50%. If the price rises to $60 (ignore interest, commissions and dividends), what is the return on the investor's equity?",
    options: ["10%", "20%", "40%", "50%"],
    correctAnswer: "C",
    explanationEn: "The investor puts up $25 of equity per share and borrows $25. The $10 gain on $25 of equity is a 40% return, twice the 20% price return because of leverage (1 ÷ 0.5 = 2).",
    explanationVi: "Nhà đầu tư bỏ 25 USD vốn tự có mỗi cổ phiếu và vay 25 USD. Lãi 10 USD trên 25 USD vốn là 40%, gấp đôi mức tăng giá 20% nhờ đòn bẩy (1 ÷ 0,5 = 2)."
  },
  {
    id: "eq-21", type: "mcq", difficulty: "Beginner", term: "Market-cap weighting",
    question: "In a market-capitalization-weighted index, which stocks have the greatest influence on the index value?",
    options: ["Stocks with the highest share price", "Stocks with the largest total market value", "All stocks equally", "Stocks with the highest dividend yield"],
    correctAnswer: "B",
    explanationEn: "Each stock's weight equals its market capitalization divided by the total market capitalization of the index. The highest share price matters most in a price-weighted index instead.",
    explanationVi: "Tỷ trọng mỗi cổ phiếu bằng vốn hóa của nó chia cho tổng vốn hóa của rổ chỉ số. Giá cổ phiếu cao nhất mới là yếu tố quan trọng nhất trong chỉ số tính theo giá (price-weighted)."
  },
  {
    id: "eq-22", type: "mcq", difficulty: "Beginner", term: "Rights of preferred shareholders",
    question: "Compared with common shareholders, preferred shareholders typically:",
    options: ["have stronger voting rights", "receive dividends before common shareholders", "share in unlimited dividend growth", "are repaid before bondholders in liquidation"],
    correctAnswer: "B",
    explanationEn: "Preferred dividends must be paid before any common dividends, and preferred shareholders rank ahead of common shareholders, but behind creditors, in liquidation. They usually have limited or no voting rights.",
    explanationVi: "Cổ tức ưu đãi phải được trả trước cổ tức phổ thông; khi thanh lý, cổ đông ưu đãi được ưu tiên hơn cổ đông phổ thông nhưng sau các chủ nợ. Họ thường không có hoặc có ít quyền biểu quyết."
  }
]);

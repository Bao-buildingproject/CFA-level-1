// Financial English · Portfolio Management — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("pm", [
  {
    id: "pm-01", type: "vocabulary", difficulty: "Beginner",
    term: "Portfolio", ipa: "/pɔːtˈfəʊliəʊ/", vietnamese: "Danh mục đầu tư",
    definition: "A collection of investments, such as stocks, bonds and cash, held by an investor or a fund.",
    explanation: "Tập hợp các khoản đầu tư (cổ phiếu, trái phiếu, tiền mặt…) do một nhà đầu tư hoặc một quỹ nắm giữ.",
    example: "The pension fund holds 60% stocks, 30% bonds and 10% cash.",
    relatedTerms: ["Asset allocation", "Diversification", "Portfolio return"],
    cfaApplication: "Portfolio management judges each investment by how it changes the risk and return of the whole, not one asset at a time."
  },
  {
    id: "pm-02", type: "vocabulary", difficulty: "Beginner",
    term: "Diversification", ipa: "/daɪˌvɜːsɪfɪˈkeɪʃn/", vietnamese: "Đa dạng hóa",
    definition: "Combining assets whose returns are not perfectly correlated in order to reduce risk without proportionally reducing expected return.",
    explanation: "Kết hợp các tài sản có lợi nhuận không biến động hoàn toàn cùng chiều để giảm rủi ro mà không làm giảm tương ứng lợi nhuận kỳ vọng.",
    example: "Holding shares in 30 companies from different industries is less risky than holding just one.",
    relatedTerms: ["Correlation", "Unsystematic risk", "Diversification ratio"],
    cfaApplication: "Diversification removes company-specific risk but cannot eliminate systematic risk."
  },
  {
    id: "pm-03", type: "vocabulary", difficulty: "Beginner",
    term: "Asset allocation", ipa: "/ˈæset ˌæləˈkeɪʃn/", vietnamese: "Phân bổ tài sản",
    definition: "Dividing a portfolio among asset classes, such as equities, bonds and cash, according to the investor's objectives and constraints.",
    explanation: "Việc chia danh mục vào các lớp tài sản (cổ phiếu, trái phiếu, tiền mặt…) theo mục tiêu và ràng buộc của nhà đầu tư.",
    example: "A young investor with a long horizon chooses 80% equities and 20% bonds.",
    relatedTerms: ["Strategic asset allocation", "Rebalancing", "Investment policy statement"],
    cfaApplication: "The long-term (strategic) split between asset classes explains most of the variation in a diversified portfolio's returns over time."
  },
  {
    id: "pm-04", type: "vocabulary", difficulty: "Beginner",
    term: "Benchmark", ipa: "/ˈbentʃmɑːk/", vietnamese: "Chỉ số tham chiếu",
    definition: "A standard, usually an index, against which the performance of a portfolio is measured.",
    explanation: "Tiêu chuẩn so sánh, thường là một chỉ số, dùng để đánh giá kết quả đầu tư của danh mục.",
    example: "A fund investing in large US companies may use the S&P 500 as its benchmark.",
    relatedTerms: ["Tracking error", "Active return", "Stock index"],
    cfaApplication: "A valid benchmark is specified in advance, investable, measurable and appropriate for the manager's style."
  },
  {
    id: "pm-05", type: "vocabulary", difficulty: "Intermediate",
    term: "Systematic risk", ipa: "/ˌsɪstəˈmætɪk rɪsk/", vietnamese: "Rủi ro hệ thống",
    definition: "Risk that affects the whole market and cannot be removed by holding many different assets; also called non-diversifiable risk.",
    explanation: "Rủi ro tác động lên toàn thị trường (như suy thoái, lãi suất) và không thể loại bỏ bằng đa dạng hóa.",
    example: "A global recession lowers the prices of almost all stocks, however many stocks a portfolio holds.",
    relatedTerms: ["Beta", "Unsystematic risk", "Market portfolio"],
    cfaApplication: "Only systematic risk is rewarded with higher expected returns in the CAPM."
  },
  {
    id: "pm-06", type: "vocabulary", difficulty: "Intermediate",
    term: "Unsystematic risk", ipa: "/ˌʌnsɪstəˈmætɪk rɪsk/", vietnamese: "Rủi ro phi hệ thống",
    definition: "Risk specific to a single company or industry that can be reduced or eliminated by holding many different assets.",
    explanation: "Rủi ro riêng của từng doanh nghiệp hoặc ngành, có thể giảm hoặc loại bỏ bằng đa dạng hóa.",
    example: "A product recall at one carmaker hurts its share price but has little effect on a broad portfolio.",
    relatedTerms: ["Company-specific risk", "Diversification", "Systematic risk"],
    cfaApplication: "Because investors can remove it at almost no cost, unsystematic risk earns no risk premium."
  },
  {
    id: "pm-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Beta", ipa: "/ˈbiːtə/", vietnamese: "Hệ số beta",
    definition: "A measure of an asset's market-related risk: how much its returns tend to move when the market's returns move.",
    explanation: "Thước đo rủi ro hệ thống của tài sản: mức độ lợi nhuận của tài sản biến động theo lợi nhuận thị trường.",
    example: "A stock with a beta of 1.3 tends to rise about 13% when the market rises 10%.",
    relatedTerms: ["Systematic risk", "CAPM", "Covariance"],
    cfaApplication: "β = Cov(Ri, Rm) ÷ Var(Rm); the market's beta is 1 and a risk-free asset's beta is 0."
  },
  {
    id: "pm-08", type: "vocabulary", difficulty: "Advanced",
    term: "Efficient frontier", ipa: "/ɪˈfɪʃnt ˈfrʌntɪə/", vietnamese: "Đường biên hiệu quả",
    definition: "The set of portfolios that offer the highest expected return for each level of risk.",
    explanation: "Tập hợp các danh mục có lợi nhuận kỳ vọng cao nhất ứng với mỗi mức rủi ro.",
    example: "A portfolio below the efficient frontier is inefficient because another portfolio offers a higher return for the same risk.",
    relatedTerms: ["Minimum-variance portfolio", "Capital allocation line", "Diversification"],
    cfaApplication: "Investors choose the point on the efficient frontier (or on the capital allocation line) that matches their risk aversion."
  },
  {
    id: "pm-09", type: "vocabulary", difficulty: "Beginner",
    term: "Risk tolerance", ipa: "/rɪsk ˈtɒlərəns/", vietnamese: "Mức chấp nhận rủi ro",
    definition: "The level of risk an investor is willing and able to bear.",
    explanation: "Mức độ rủi ro mà nhà đầu tư sẵn lòng và có khả năng chịu đựng.",
    example: "A retiree who depends on portfolio income usually has less ability to take risk than a young professional.",
    relatedTerms: ["Willingness to take risk", "Ability to take risk", "Investment policy statement"],
    cfaApplication: "When willingness and ability to take risk differ, the IPS normally uses the more conservative of the two."
  },
  {
    id: "pm-10", type: "vocabulary", difficulty: "Intermediate",
    term: "Investment policy statement (IPS)", ipa: "/ɪnˈvestmənt ˈpɒləsi ˈsteɪtmənt/", vietnamese: "Bản chính sách đầu tư",
    definition: "A written document that sets out a client's investment objectives and constraints and guides how the portfolio is managed.",
    explanation: "Văn bản nêu mục tiêu đầu tư (lợi nhuận, rủi ro) và các ràng buộc của khách hàng, làm căn cứ để quản lý danh mục.",
    example: "The IPS states a 6% return target, moderate risk, a 15-year horizon and a need for $50,000 of cash each year.",
    relatedTerms: ["Return objective", "Risk objective", "Constraints"],
    cfaApplication: "Objectives cover return and risk; constraints cover liquidity, time horizon, taxes, legal and regulatory factors and unique circumstances."
  },
  {
    id: "pm-11", type: "vocabulary", difficulty: "Intermediate",
    term: "Rebalancing", ipa: "/ˌriːˈbælənsɪŋ/", vietnamese: "Tái cân bằng danh mục",
    definition: "Buying and selling assets to bring a portfolio back to its target weights after market movements have changed them.",
    explanation: "Mua bán tài sản để đưa danh mục về tỷ trọng mục tiêu sau khi biến động thị trường làm lệch tỷ trọng.",
    example: "After a stock rally lifts equities from 60% to 70% of the portfolio, the manager sells stocks and buys bonds.",
    relatedTerms: ["Asset allocation", "Corridor", "Transaction costs"],
    cfaApplication: "Rebalancing keeps the portfolio's risk in line with the IPS, at the cost of transaction costs and taxes."
  },
  {
    id: "pm-12", type: "vocabulary", difficulty: "Beginner",
    term: "Active management", ipa: "/ˈæktɪv ˈmænɪdʒmənt/", vietnamese: "Quản lý chủ động",
    definition: "An investment approach that tries to beat a benchmark by selecting securities or timing the market.",
    explanation: "Phương pháp đầu tư tìm cách đạt kết quả tốt hơn chỉ số tham chiếu bằng việc chọn chứng khoán hoặc canh thời điểm thị trường.",
    example: "A fund manager overweights banks because they look undervalued relative to the index.",
    relatedTerms: ["Alpha", "Tracking error", "Passive management"],
    cfaApplication: "Active managers must earn enough excess return to cover their higher fees and trading costs."
  },
  {
    id: "pm-13", type: "definition", difficulty: "Intermediate",
    term: "Sharpe ratio", ipa: "/ˈʃɑːp ˌreɪʃiəʊ/", vietnamese: "Hệ số Sharpe",
    question: "What is the Sharpe ratio?",
    definition: "A measure of excess return per unit of total risk.",
    formula: "Sharpe ratio = (Rp − Rf) ÷ σp",
    formulaNote: "Rp = portfolio return, Rf = risk-free rate, σp = standard deviation of the portfolio's returns. It uses total risk, so it suits an investor's whole portfolio.",
    explanation: "Lợi nhuận vượt lãi suất phi rủi ro trên mỗi đơn vị rủi ro tổng thể (độ lệch chuẩn). Càng cao càng tốt.",
    example: "With Rp = 10%, Rf = 3% and σp = 14%, the Sharpe ratio is 0.5.",
    relatedTerms: ["Treynor ratio", "Standard deviation", "Excess return"],
    cfaApplication: "The Sharpe ratio is the slope of the capital allocation line; the higher it is, the better the risk-adjusted return."
  },
  {
    id: "pm-14", type: "definition", difficulty: "Intermediate",
    term: "Capital asset pricing model (CAPM)", ipa: "/ˈkæpɪtl ˈæset ˈpraɪsɪŋ ˌmɒdl/", vietnamese: "Mô hình định giá tài sản vốn",
    question: "What does the capital asset pricing model state?",
    definition: "A model in which an asset's expected (required) return equals the risk-free rate plus its beta multiplied by the market risk premium.",
    formula: "E(Ri) = Rf + βi × [E(Rm) − Rf]",
    formulaNote: "Only systematic risk (beta) is priced. The line plotting E(R) against beta is the security market line (SML).",
    explanation: "Mô hình xác định lợi nhuận yêu cầu của tài sản bằng lãi suất phi rủi ro cộng beta nhân phần bù rủi ro thị trường.",
    example: "With Rf = 3%, β = 1.2 and E(Rm) = 8%, the required return is 3% + 1.2 × 5% = 9%.",
    relatedTerms: ["Beta", "Security market line", "Market risk premium"],
    cfaApplication: "The CAPM is widely used to estimate the cost of equity for valuation and capital budgeting."
  },
  {
    id: "pm-15", type: "definition", difficulty: "Beginner",
    term: "Portfolio expected return", ipa: "/pɔːtˈfəʊliəʊ ɪkˈspektɪd rɪˈtɜːn/", vietnamese: "Lợi nhuận kỳ vọng của danh mục",
    question: "How is a portfolio's expected return calculated?",
    definition: "The weighted average of the expected returns of the assets held, using each asset's share of total value as its weight.",
    formula: "E(Rp) = w1 × E(R1) + w2 × E(R2) + … + wn × E(Rn)",
    formulaNote: "The weights sum to 1. Portfolio risk, unlike return, is not a simple weighted average because of correlation.",
    explanation: "Bình quân gia quyền lợi nhuận kỳ vọng của các tài sản trong danh mục, với trọng số là tỷ trọng giá trị của từng tài sản.",
    example: "60% in a fund expected to return 10% and 40% in one expected to return 5% gives E(Rp) = 8%.",
    relatedTerms: ["Asset allocation", "Portfolio variance", "Correlation"],
    cfaApplication: "Expected return is linear in the weights; the benefits of diversification appear only in the portfolio's risk."
  },
  {
    id: "pm-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Quản lý thụ động", term: "Passive management", ipa: "/ˈpæsɪv ˈmænɪdʒmənt/",
    definition: "An approach that aims to match the return of a benchmark index at low cost, usually by holding the index's securities.",
    explanation: "Cách đầu tư nhằm đạt lợi nhuận bằng chỉ số tham chiếu với chi phí thấp, thường bằng cách nắm giữ các chứng khoán trong chỉ số.",
    example: "An index fund that holds all 500 stocks in the S&P 500 in their index weights is passively managed.",
    relatedTerms: ["Index fund", "Tracking error", "Active management"]
  },
  {
    id: "pm-17", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Quỹ hoán đổi danh mục", term: "Exchange-traded fund (ETF)", ipa: "/ɪksˌtʃeɪndʒ ˈtreɪdɪd fʌnd/",
    definition: "An investment fund whose shares trade on a stock exchange throughout the day, usually tracking an index.",
    explanation: "Quỹ đầu tư có chứng chỉ quỹ được giao dịch trên sở giao dịch suốt phiên như cổ phiếu, thường mô phỏng một chỉ số.",
    example: "Investors can buy a VN30 ETF on the exchange to own the 30 stocks in the index with a single trade.",
    relatedTerms: ["Index fund", "Passive management", "Creation and redemption"]
  },
  {
    id: "pm-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Hệ số tương quan", term: "Correlation", ipa: "/ˌkɒrəˈleɪʃn/",
    definition: "A standardized measure, from −1 to +1, of how closely two variables move together.",
    explanation: "Thước đo chuẩn hóa (từ −1 đến +1) cho biết hai biến số biến động cùng nhau chặt chẽ đến mức nào.",
    example: "Two assets with a correlation of −0.3 tend to move in opposite directions, which improves diversification.",
    relatedTerms: ["Covariance", "Diversification", "Scatter plot"]
  },
  {
    id: "pm-19", type: "mcq", difficulty: "Beginner", term: "What diversification removes",
    question: "As more randomly chosen stocks are added to a portfolio, which type of risk declines?",
    options: ["Systematic risk", "Unsystematic risk", "Both systematic and unsystematic risk equally", "Neither type of risk"],
    correctAnswer: "B",
    explanationEn: "Company-specific (unsystematic) risk is averaged away as more stocks are added. Systematic risk affects all stocks and remains however many stocks are held.",
    explanationVi: "Rủi ro riêng của từng công ty (phi hệ thống) giảm dần khi thêm cổ phiếu vào danh mục. Rủi ro hệ thống tác động đến mọi cổ phiếu nên vẫn còn dù nắm giữ bao nhiêu cổ phiếu."
  },
  {
    id: "pm-20", type: "mcq", difficulty: "Intermediate", term: "Interpreting beta",
    question: "A stock has a beta of 1.5. Which statement is most accurate?",
    options: [
      "On average it moves about 1.5% for each 1% move in the market.",
      "Its total risk is 1.5 times the market's total risk.",
      "It always earns 1.5% more than the market.",
      "Its returns are unrelated to the market's returns."
    ],
    correctAnswer: "A",
    explanationEn: "Beta measures sensitivity to market movements (systematic risk). It says nothing directly about total risk, which also includes company-specific risk.",
    explanationVi: "Beta đo độ nhạy với biến động thị trường (rủi ro hệ thống), không trực tiếp cho biết rủi ro tổng thể vì rủi ro tổng thể còn gồm rủi ro riêng của doanh nghiệp."
  },
  {
    id: "pm-21", type: "mcq", difficulty: "Intermediate", term: "Comparing Sharpe ratios",
    question: "Fund X returned 12% with a standard deviation of 20%. Fund Y returned 9% with a standard deviation of 10%. The risk-free rate is 2%. Which fund has the higher Sharpe ratio?",
    options: ["Fund X", "Fund Y", "They are equal", "It cannot be determined"],
    correctAnswer: "B",
    explanationEn: "Sharpe X = (12 − 2) ÷ 20 = 0.50; Sharpe Y = (9 − 2) ÷ 10 = 0.70. Fund Y earned more excess return per unit of risk.",
    explanationVi: "Sharpe X = (12 − 2) ÷ 20 = 0,50; Sharpe Y = (9 − 2) ÷ 10 = 0,70. Quỹ Y tạo nhiều lợi nhuận vượt trội hơn trên mỗi đơn vị rủi ro."
  },
  {
    id: "pm-22", type: "mcq", difficulty: "Intermediate", term: "IPS constraints",
    question: "Which of the following is a constraint, rather than an objective, in an investment policy statement?",
    options: ["The required rate of return", "The investor's willingness to take risk", "The investor's liquidity needs", "The investor's ability to take risk"],
    correctAnswer: "C",
    explanationEn: "IPS objectives are return and risk (including willingness and ability to take risk). Constraints are liquidity, time horizon, taxes, legal and regulatory factors, and unique circumstances.",
    explanationVi: "Mục tiêu trong IPS gồm lợi nhuận và rủi ro (bao gồm mức sẵn lòng và khả năng chịu rủi ro). Ràng buộc gồm thanh khoản, thời hạn đầu tư, thuế, pháp lý và các hoàn cảnh riêng."
  }
]);

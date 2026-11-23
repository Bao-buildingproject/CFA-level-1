// Financial English · Financial Fundamentals — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
// Card format: docs/financial-english.md. Written for this site (not copied from CFA Institute material).
FinEng.register("fund", [
  {
    id: "fund-01", type: "vocabulary", difficulty: "Beginner",
    term: "Liquidity", ipa: "/lɪˈkwɪdəti/", vietnamese: "Tính thanh khoản",
    definition: "The ability to convert an asset into cash quickly without significantly affecting its price.",
    explanation: "Khả năng chuyển đổi tài sản thành tiền mặt nhanh chóng mà không làm giảm đáng kể giá của tài sản.",
    example: "Cash is generally more liquid than real estate.",
    relatedTerms: ["Liquidity Risk", "Solvency", "Cash Flow"],
    cfaApplication: "Liquidity is important when assessing financial risks and investment decisions."
  },
  {
    id: "fund-02", type: "vocabulary", difficulty: "Beginner",
    term: "Solvency", ipa: "/ˈsɒlvənsi/", vietnamese: "Khả năng thanh toán nợ dài hạn",
    definition: "The ability of a company or person to meet long-term financial obligations, because assets exceed liabilities and debt can be serviced over time.",
    explanation: "Khả năng đáp ứng các nghĩa vụ tài chính dài hạn: tài sản lớn hơn nợ phải trả và có thể trả nợ gốc, lãi theo thời gian.",
    example: "A firm with little debt and steady profits is highly solvent, even if it holds little cash.",
    relatedTerms: ["Liquidity", "Leverage", "Debt-to-equity ratio"],
    cfaApplication: "Solvency ratios such as debt-to-equity and interest coverage help analysts judge default risk."
  },
  {
    id: "fund-03", type: "vocabulary", difficulty: "Beginner",
    term: "Leverage", ipa: "/ˈliːvərɪdʒ/", vietnamese: "Đòn bẩy tài chính",
    definition: "The use of borrowed money or fixed costs to increase the potential return on an investment, which also increases its risk.",
    explanation: "Việc dùng vốn vay (hoặc chi phí cố định) để khuếch đại lợi nhuận tiềm năng; đồng thời làm tăng rủi ro thua lỗ.",
    example: "Buying a $500,000 house with $100,000 of your own money and a $400,000 loan is a leveraged investment.",
    relatedTerms: ["Debt", "Financial risk", "Margin"],
    cfaApplication: "Higher leverage raises both the expected return and the volatility of returns to shareholders, a key idea in corporate finance and credit analysis."
  },
  {
    id: "fund-04", type: "vocabulary", difficulty: "Beginner",
    term: "Opportunity cost", ipa: "/ˌɒpəˈtjuːnəti kɒst/", vietnamese: "Chi phí cơ hội",
    definition: "The value of the best alternative that is given up when a choice is made.",
    explanation: "Giá trị của phương án tốt nhất bị bỏ qua khi đưa ra một lựa chọn.",
    example: "If you keep money idle instead of earning 5% in a deposit, the opportunity cost is the 5% you could have earned.",
    relatedTerms: ["Required return", "Trade-off", "Discount rate"],
    cfaApplication: "Required returns and discount rates reflect investors' opportunity cost of capital."
  },
  {
    id: "fund-05", type: "vocabulary", difficulty: "Beginner",
    term: "Compounding", ipa: "/kəmˈpaʊndɪŋ/", vietnamese: "Lãi kép (ghép lãi)",
    definition: "Earning returns on both the original amount invested and the returns already earned.",
    explanation: "Cơ chế tiền lãi được cộng vào vốn để tiếp tục sinh lãi ở các kỳ sau (lãi sinh lãi).",
    example: "$1,000 growing at 10% a year becomes $1,100 after one year and $1,210 after two years.",
    relatedTerms: ["Future value", "Interest", "Effective annual rate"],
    cfaApplication: "Time value of money calculations in the CFA curriculum rely on compounding over discrete or continuous periods."
  },
  {
    id: "fund-06", type: "vocabulary", difficulty: "Beginner",
    term: "Principal", ipa: "/ˈprɪnsəpl/", vietnamese: "Tiền gốc (vốn gốc)",
    definition: "The original amount of money borrowed or invested, on which interest is calculated.",
    explanation: "Số tiền ban đầu được vay hoặc đầu tư, làm cơ sở để tính lãi.",
    example: "A $10,000 loan at 8% a year has a principal of $10,000.",
    relatedTerms: ["Interest", "Par value", "Amortizing loan"],
    cfaApplication: "Bond cash flows consist of coupon interest and the repayment of principal (par value)."
  },
  {
    id: "fund-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Discount rate", ipa: "/ˈdɪskaʊnt reɪt/", vietnamese: "Tỷ lệ chiết khấu",
    definition: "The rate used to convert future cash flows into their value today, reflecting the time value of money and the risk of the cash flows.",
    explanation: "Tỷ lệ dùng để quy đổi dòng tiền tương lai về giá trị hôm nay, phản ánh giá trị thời gian của tiền và mức rủi ro.",
    example: "At a 10% discount rate, $110 received in one year is worth $100 today.",
    relatedTerms: ["Present value", "Required return", "Cost of capital"],
    cfaApplication: "Choosing the right discount rate is central to valuing bonds, stocks and capital projects."
  },
  {
    id: "fund-08", type: "vocabulary", difficulty: "Intermediate",
    term: "Risk premium", ipa: "/rɪsk ˈpriːmiəm/", vietnamese: "Phần bù rủi ro",
    definition: "The additional expected return that investors require for bearing risk, above the return on a riskless investment.",
    explanation: "Phần lợi nhuận kỳ vọng tăng thêm mà nhà đầu tư đòi hỏi để chấp nhận rủi ro, cao hơn lợi nhuận của khoản đầu tư không rủi ro.",
    example: "If stocks are expected to return 9% and Treasury bills 4%, the equity risk premium is 5%.",
    relatedTerms: ["Risk-free rate", "Equity risk premium", "Required return"],
    cfaApplication: "In the CAPM, beta multiplied by the market risk premium gives an asset's risk premium."
  },
  {
    id: "fund-09", type: "vocabulary", difficulty: "Beginner",
    term: "Security", ipa: "/sɪˈkjʊərəti/", vietnamese: "Chứng khoán",
    definition: "A tradable financial instrument that represents ownership (such as a share), a creditor relationship (such as a bond), or rights to ownership (such as an option).",
    explanation: "Công cụ tài chính có thể giao dịch, thể hiện quyền sở hữu (cổ phiếu), quan hệ chủ nợ (trái phiếu) hoặc quyền đối với tài sản (quyền chọn).",
    example: "Shares of a listed company and government bonds are both securities.",
    relatedTerms: ["Stock", "Bond", "Issuer"],
    cfaApplication: "The curriculum groups securities into fixed income, equities and pooled investments when describing financial markets."
  },
  {
    id: "fund-10", type: "vocabulary", difficulty: "Beginner",
    term: "Issuer", ipa: "/ˈɪʃuːə/", vietnamese: "Tổ chức phát hành",
    definition: "An entity, such as a company or a government, that sells securities to investors to raise funds.",
    explanation: "Đơn vị (doanh nghiệp, chính phủ, tổ chức) bán chứng khoán cho nhà đầu tư để huy động vốn.",
    example: "When a government sells bonds to finance its budget deficit, it is the issuer.",
    relatedTerms: ["Security", "Primary market", "Underwriter"],
    cfaApplication: "An issuer's creditworthiness drives the credit spread on its bonds."
  },
  {
    id: "fund-11", type: "vocabulary", difficulty: "Intermediate",
    term: "Capital market", ipa: "/ˈkæpɪtl ˈmɑːkɪt/", vietnamese: "Thị trường vốn",
    definition: "The market for long-term financing instruments, such as stocks and bonds with maturities longer than one year.",
    explanation: "Thị trường của các công cụ tài chính dài hạn như cổ phiếu và trái phiếu có kỳ hạn trên một năm.",
    example: "A company issuing 10-year bonds raises funds in the capital market.",
    relatedTerms: ["Money market", "Stock market", "Bond market"],
    cfaApplication: "Capital markets channel long-term savings into investment, a basic function of the financial system."
  },
  {
    id: "fund-12", type: "vocabulary", difficulty: "Intermediate",
    term: "Money market", ipa: "/ˈmʌni ˈmɑːkɪt/", vietnamese: "Thị trường tiền tệ",
    definition: "The market for short-term debt instruments with maturities of one year or less, such as Treasury bills and commercial paper.",
    explanation: "Thị trường của các công cụ nợ ngắn hạn, kỳ hạn từ một năm trở xuống, như tín phiếu kho bạc và thương phiếu.",
    example: "A company with spare cash for three months may buy commercial paper.",
    relatedTerms: ["Treasury bill", "Commercial paper", "Repurchase agreement"],
    cfaApplication: "Money market yields are often quoted on a discount or add-on basis, which matters when comparing rates."
  },
  {
    id: "fund-13", type: "definition", difficulty: "Beginner",
    term: "Time value of money", ipa: "/taɪm ˈvæljuː əv ˈmʌni/", vietnamese: "Giá trị thời gian của tiền",
    question: "What is the time value of money?",
    definition: "The principle that money available today is worth more than the same amount in the future, because it can be invested to earn a return.",
    formula: "FV = PV × (1 + r)^n   and   PV = FV ÷ (1 + r)^n",
    formulaNote: "r is the rate per period and n the number of periods; both must use the same period (a monthly rate with a number of months).",
    explanation: "Một đồng hôm nay có giá trị hơn một đồng trong tương lai vì có thể đem đầu tư để sinh lời. FV là giá trị tương lai, PV là giá trị hiện tại.",
    example: "$1,000 invested at 6% a year for 3 years grows to $1,000 × 1.06³ = $1,191.02.",
    relatedTerms: ["Present value", "Future value", "Compounding"],
    cfaApplication: "Time value of money underpins bond pricing, stock valuation and capital budgeting."
  },
  {
    id: "fund-14", type: "definition", difficulty: "Advanced",
    term: "Effective annual rate (EAR)", ipa: "/ɪˈfektɪv ˈænjuəl reɪt/", vietnamese: "Lãi suất thực tế hằng năm",
    question: "What is the effective annual rate?",
    definition: "The annual rate of return that includes the effect of compounding within the year.",
    formula: "EAR = (1 + Stated annual rate ÷ m)^m − 1",
    formulaNote: "m = number of compounding periods per year. With continuous compounding, EAR = e^r − 1.",
    explanation: "Lãi suất năm đã tính đến việc ghép lãi nhiều lần trong năm; luôn cao hơn lãi suất niêm yết khi ghép lãi hơn một lần mỗi năm.",
    example: "A stated rate of 12% compounded monthly gives EAR = (1 + 0.12 ÷ 12)^12 − 1 = 12.68%.",
    relatedTerms: ["Stated annual rate", "Compounding", "Periodic rate"],
    cfaApplication: "Loans and deposits with different compounding frequencies can only be compared after converting them to EARs."
  },
  {
    id: "fund-15", type: "definition", difficulty: "Advanced",
    term: "Annuity", ipa: "/əˈnjuːəti/", vietnamese: "Niên kim (chuỗi tiền đều)",
    question: "What is an annuity, and how is its present value calculated?",
    definition: "A series of equal cash flows paid at regular intervals for a fixed number of periods.",
    formula: "PV = PMT × [1 − (1 + r)^−N] ÷ r",
    formulaNote: "Ordinary annuity: payments at the end of each period. For an annuity due (payments at the start of each period), multiply the result by (1 + r).",
    explanation: "Chuỗi các khoản tiền bằng nhau phát sinh đều đặn trong một số kỳ nhất định, ví dụ tiền trả góp hằng tháng.",
    example: "$100 a year for 3 years at 10% has a present value of $248.69.",
    relatedTerms: ["Perpetuity", "Annuity due", "Present value"],
    cfaApplication: "The coupons of a bond and the payments on a fixed-rate mortgage are valued as annuities."
  },
  {
    id: "fund-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Giá trị hiện tại", term: "Present value (PV)", ipa: "/ˈpreznt ˈvæljuː/",
    definition: "The current worth of a future cash flow or series of cash flows, discounted at an appropriate rate.",
    explanation: "Giá trị quy về thời điểm hiện tại của một hay nhiều dòng tiền tương lai, sau khi chiết khấu theo một tỷ lệ phù hợp.",
    example: "At 8% a year, $500 to be received in two years has a present value of about $428.67.",
    relatedTerms: ["Discount rate", "Future value", "Net present value"]
  },
  {
    id: "fund-17", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Lãi suất phi rủi ro", term: "Risk-free rate", ipa: "/ˌrɪsk ˈfriː reɪt/",
    definition: "The return on an investment with no risk of default, usually measured by the yield on short-term government securities such as Treasury bills.",
    explanation: "Lợi suất của khoản đầu tư không có rủi ro vỡ nợ, thường lấy theo lợi suất tín phiếu hoặc trái phiếu chính phủ ngắn hạn.",
    example: "If three-month Treasury bills yield 4%, analysts may use 4% as the risk-free rate.",
    relatedTerms: ["Risk premium", "Treasury bill", "Required return"]
  },
  {
    id: "fund-18", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Dòng tiền", term: "Cash flow", ipa: "/ˈkæʃ fləʊ/",
    definition: "The movement of money into (inflows) and out of (outflows) a business, project or investment over a period.",
    explanation: "Sự di chuyển của tiền vào (dòng tiền vào) và ra (dòng tiền ra) khỏi một doanh nghiệp, dự án hay khoản đầu tư trong một kỳ.",
    example: "A rental property produces monthly inflows from rent and outflows for repairs.",
    relatedTerms: ["Cash flow statement", "Free cash flow", "Net income"]
  },
  {
    id: "fund-19", type: "mcq", difficulty: "Intermediate", term: "Effect of leverage",
    question: "Which statement about financial leverage is most accurate?",
    options: [
      "Leverage reduces both the risk and the expected return for shareholders.",
      "Leverage magnifies both gains and losses for shareholders.",
      "Leverage affects only companies that have no debt.",
      "Leverage guarantees a higher return on equity."
    ],
    correctAnswer: "B",
    explanationEn: "Debt has a fixed cost. When assets earn more than the cost of debt, shareholders gain more; when they earn less, shareholders lose more. Leverage therefore increases the variability of equity returns and does not guarantee a higher return.",
    explanationVi: "Nợ vay có chi phí cố định. Khi tài sản sinh lời cao hơn chi phí nợ, cổ đông hưởng lợi nhiều hơn; khi thấp hơn, cổ đông chịu lỗ nhiều hơn. Vì vậy đòn bẩy làm tăng biến động lợi nhuận của vốn chủ chứ không bảo đảm lợi nhuận cao hơn."
  },
  {
    id: "fund-20", type: "mcq", difficulty: "Beginner", term: "Compound interest calculation",
    question: "You deposit $1,000 at 5% a year, compounded annually. How much will you have after 2 years?",
    options: ["$1,100.00", "$1,102.50", "$1,105.00", "$1,050.00"],
    correctAnswer: "B",
    explanationEn: "FV = 1,000 × 1.05² = $1,102.50. The $1,100.00 answer uses simple interest and ignores the interest earned on the first year's interest.",
    explanationVi: "FV = 1.000 × 1,05² = 1.102,50 USD. Con số 1.100,00 USD là lãi đơn, bỏ qua phần lãi sinh ra từ tiền lãi của năm đầu."
  },
  {
    id: "fund-21", type: "mcq", difficulty: "Beginner", term: "Opportunity cost of idle cash",
    question: "You keep $10,000 in a current account that pays no interest instead of a savings deposit paying 4% a year. What is the opportunity cost over one year?",
    options: ["$0", "$40", "$400", "$4,000"],
    correctAnswer: "C",
    explanationEn: "The opportunity cost is the return given up on the best alternative: $10,000 × 4% = $400.",
    explanationVi: "Chi phí cơ hội là lợi nhuận bị bỏ lỡ từ phương án tốt nhất: 10.000 USD × 4% = 400 USD."
  },
  {
    id: "fund-22", type: "mcq", difficulty: "Intermediate", term: "Liquidity versus solvency",
    question: "A company owns valuable factories but cannot pay suppliers whose invoices are due next week. What is its main problem?",
    options: ["Solvency", "Liquidity", "Diversification", "Inflation"],
    correctAnswer: "B",
    explanationEn: "Liquidity is the ability to meet short-term obligations with cash or assets that can quickly be turned into cash. A firm can be solvent (assets exceed liabilities) and still be illiquid.",
    explanationVi: "Thanh khoản là khả năng đáp ứng nghĩa vụ ngắn hạn bằng tiền hoặc tài sản dễ chuyển thành tiền. Doanh nghiệp có thể vẫn đủ khả năng trả nợ dài hạn (tài sản lớn hơn nợ) nhưng lại thiếu thanh khoản."
  }
]);

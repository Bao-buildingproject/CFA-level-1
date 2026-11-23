// Financial English · Risk Management — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("risk", [
  {
    id: "risk-01", type: "vocabulary", difficulty: "Beginner",
    term: "Risk management", ipa: "/ˈrɪsk ˌmænɪdʒmənt/", vietnamese: "Quản trị rủi ro",
    definition: "The process of identifying, measuring and controlling the risks an organization takes so that they stay in line with its goals and the level of risk it is willing to bear.",
    explanation: "Quy trình nhận diện, đo lường và kiểm soát các rủi ro của tổ chức để chúng phù hợp với mục tiêu và mức rủi ro tổ chức sẵn sàng chấp nhận.",
    example: "As part of its risk management, a bank sets limits on how much it can lend to any one industry.",
    relatedTerms: ["Risk governance", "Risk tolerance", "Risk budgeting"],
    cfaApplication: "The goal of risk management is not to minimize risk but to take the right risks for the organization's objectives."
  },
  {
    id: "risk-02", type: "vocabulary", difficulty: "Beginner",
    term: "Credit risk", ipa: "/ˈkredɪt rɪsk/", vietnamese: "Rủi ro tín dụng",
    definition: "The risk of loss because a borrower or counterparty fails to make promised payments.",
    explanation: "Rủi ro tổn thất do người vay hoặc đối tác không thực hiện các khoản thanh toán đã cam kết.",
    example: "A bank lending to a struggling company faces high credit risk.",
    relatedTerms: ["Default risk", "Credit spread", "Expected loss"],
    cfaApplication: "Credit risk has two parts: the probability of default and the loss given default."
  },
  {
    id: "risk-03", type: "vocabulary", difficulty: "Intermediate",
    term: "Market risk", ipa: "/ˈmɑːkɪt rɪsk/", vietnamese: "Rủi ro thị trường",
    definition: "The risk of losses from changes in prices and rates, such as interest rates, exchange rates, share prices and commodity prices.",
    explanation: "Rủi ro tổn thất do biến động giá và lãi suất: lãi suất, tỷ giá, giá cổ phiếu, giá hàng hóa.",
    example: "A fund holding foreign shares has market risk from both the share prices and the exchange rate.",
    relatedTerms: ["Interest rate risk", "Currency risk", "Value at risk"],
    cfaApplication: "Market risk is measured with sensitivities such as duration and beta, and with value at risk."
  },
  {
    id: "risk-04", type: "vocabulary", difficulty: "Intermediate",
    term: "Operational risk", ipa: "/ˌɒpəˈreɪʃənl rɪsk/", vietnamese: "Rủi ro hoạt động",
    definition: "The risk of loss from inadequate or failed internal processes, people and systems, or from external events.",
    explanation: "Rủi ro tổn thất do quy trình nội bộ, con người, hệ thống không đầy đủ hoặc gặp sự cố, hoặc do sự kiện bên ngoài.",
    example: "A computer failure that stops trading for a day is an operational risk event.",
    relatedTerms: ["Cyber risk", "Fraud", "Internal controls"],
    cfaApplication: "Operational risk includes errors, fraud, cyberattacks and natural disasters; banks hold capital against it under the Basel rules."
  },
  {
    id: "risk-05", type: "vocabulary", difficulty: "Intermediate",
    term: "Liquidity risk", ipa: "/lɪˈkwɪdəti rɪsk/", vietnamese: "Rủi ro thanh khoản",
    definition: "The risk that an asset cannot be sold quickly at a price close to its fair value, or that an organization cannot meet its payments when they fall due.",
    explanation: "Rủi ro không bán được tài sản nhanh với giá gần giá trị hợp lý, hoặc không đủ tiền để thanh toán các nghĩa vụ đến hạn.",
    example: "During a crisis, a fund holding thinly traded bonds could sell them only at deep discounts.",
    relatedTerms: ["Bid–ask spread", "Funding risk", "Bank run"],
    cfaApplication: "Illiquid assets require a liquidity premium, and liquidity needs are a key constraint in an investment policy statement."
  },
  {
    id: "risk-06", type: "vocabulary", difficulty: "Intermediate",
    term: "Stress testing", ipa: "/ˈstres ˌtestɪŋ/", vietnamese: "Kiểm tra sức chịu đựng",
    definition: "Analysing how a portfolio or institution would perform under extreme but plausible adverse conditions.",
    explanation: "Phân tích danh mục hoặc tổ chức sẽ chịu ảnh hưởng ra sao trong các điều kiện bất lợi cực đoan nhưng có thể xảy ra.",
    example: "In a stress test, regulators ask banks to show their capital would stay adequate if house prices fell 30% and unemployment doubled.",
    relatedTerms: ["Scenario analysis", "Tail risk", "Capital adequacy"],
    cfaApplication: "Stress tests complement VaR by focusing on rare, severe events that statistical models may miss."
  },
  {
    id: "risk-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Scenario analysis", ipa: "/səˈnɑːriəʊ əˌnæləsɪs/", vietnamese: "Phân tích kịch bản",
    definition: "Estimating the results of a portfolio or project under specific sets of assumptions in which several risk factors change together.",
    explanation: "Ước tính kết quả của danh mục hoặc dự án theo từng tập giả định cụ thể, trong đó nhiều yếu tố rủi ro cùng thay đổi.",
    example: "An analyst values a project under base, optimistic and pessimistic scenarios for sales, costs and interest rates.",
    relatedTerms: ["Sensitivity analysis", "Stress testing", "Simulation"],
    cfaApplication: "Unlike sensitivity analysis, scenario analysis changes several inputs at once."
  },
  {
    id: "risk-08", type: "vocabulary", difficulty: "Advanced",
    term: "Risk governance", ipa: "/ˈrɪsk ˌɡʌvənəns/", vietnamese: "Giám sát rủi ro cấp hội đồng quản trị",
    definition: "The top-down process, led by the board of directors, that sets how much risk an organization will take and oversees how its risks are handled.",
    explanation: "Quy trình từ trên xuống do hội đồng quản trị dẫn dắt, xác định mức rủi ro tổ chức chấp nhận và giám sát việc quản lý rủi ro.",
    example: "As part of its risk governance, the board approves the bank's risk appetite and receives quarterly risk reports.",
    relatedTerms: ["Risk management", "Risk committee", "Risk appetite"],
    cfaApplication: "Good risk governance gives an enterprise-wide view of risk instead of each department managing its own risks in isolation."
  },
  {
    id: "risk-09", type: "vocabulary", difficulty: "Advanced",
    term: "Tail risk", ipa: "/ˈteɪl rɪsk/", vietnamese: "Rủi ro đuôi",
    definition: "The risk of rare, extreme outcomes at the ends of a return distribution, which may occur more often than a normal distribution suggests.",
    explanation: "Rủi ro của các kết quả hiếm gặp và cực đoan ở hai đầu phân phối lợi nhuận, có thể xảy ra thường xuyên hơn mức phân phối chuẩn dự báo.",
    example: "The one-day fall of more than 20% in US stocks in October 1987 is an example of tail risk.",
    relatedTerms: ["Kurtosis", "Expected shortfall", "Black swan"],
    cfaApplication: "Because of fat tails, VaR based on a normal distribution can understate the risk of extreme losses."
  },
  {
    id: "risk-10", type: "vocabulary", difficulty: "Intermediate",
    term: "Risk transfer", ipa: "/ˈrɪsk ˌtrænsfɜː/", vietnamese: "Chuyển giao rủi ro",
    definition: "Shifting the financial consequences of a risk to another party, usually through insurance or a contract.",
    explanation: "Chuyển hậu quả tài chính của rủi ro sang một bên khác, thường thông qua bảo hiểm hoặc hợp đồng.",
    example: "A shipping company uses risk transfer when it buys insurance against losing cargo at sea.",
    relatedTerms: ["Insurance", "Risk shifting", "Hedging"],
    cfaApplication: "Ways to modify risk include prevention and avoidance, acceptance, transfer and shifting."
  },
  {
    id: "risk-11", type: "vocabulary", difficulty: "Intermediate",
    term: "Risk mitigation", ipa: "/ˈrɪsk ˌmɪtɪˈɡeɪʃn/", vietnamese: "Giảm thiểu rủi ro",
    definition: "Actions that reduce the probability that a loss event occurs or the size of the loss if it does.",
    explanation: "Các biện pháp làm giảm khả năng sự cố gây tổn thất xảy ra hoặc giảm mức tổn thất khi sự cố xảy ra.",
    example: "Backing up data every day is a risk mitigation measure against system failures.",
    relatedTerms: ["Internal controls", "Diversification", "Risk transfer"],
    cfaApplication: "Organizations compare the cost of mitigation with the expected loss it prevents."
  },
  {
    id: "risk-12", type: "vocabulary", difficulty: "Advanced",
    term: "Sovereign risk", ipa: "/ˈsɒvrɪn rɪsk/", vietnamese: "Rủi ro quốc gia (rủi ro chủ quyền)",
    definition: "The risk that a government defaults on its debt or takes actions, such as currency controls, that cause losses to investors.",
    explanation: "Rủi ro chính phủ vỡ nợ hoặc áp dụng các biện pháp (như kiểm soát ngoại hối) gây tổn thất cho nhà đầu tư.",
    example: "Holders of Greek government bonds suffered large losses in the 2012 debt restructuring.",
    relatedTerms: ["Country risk", "Sovereign rating", "Political risk"],
    cfaApplication: "Sovereign credit analysis considers political, economic, fiscal, monetary and external factors."
  },
  {
    id: "risk-13", type: "definition", difficulty: "Advanced",
    term: "Value at risk (VaR)", ipa: "/ˈvæljuː ət ˈrɪsk/", vietnamese: "Giá trị chịu rủi ro",
    question: "What is value at risk?",
    definition: "An estimate of the minimum loss that a portfolio will suffer with a given probability over a given period, under normal market conditions.",
    formula: "Parametric VaR (5%, one period) ≈ (1.65 × σ − μ) × Portfolio value",
    formulaNote: "μ and σ are the expected return and standard deviation for the period; 1.65 is the z-value for 5% in one tail (2.33 for 1%). The loss is stated as a positive amount.",
    explanation: "Ước tính mức lỗ tối thiểu mà danh mục có thể chịu với một xác suất nhất định trong một khoảng thời gian, trong điều kiện thị trường bình thường.",
    example: "A $10 million portfolio with a daily σ of 1% and a mean of about zero has a 5% one-day VaR of about $165,000.",
    relatedTerms: ["Conditional VaR", "Stress testing", "Tail risk"],
    cfaApplication: "VaR does not show how large losses can be beyond the threshold, so it is combined with conditional VaR and stress tests."
  },
  {
    id: "risk-14", type: "definition", difficulty: "Advanced",
    term: "Expected loss", ipa: "/ɪkˌspektɪd ˈlɒs/", vietnamese: "Tổn thất dự kiến",
    question: "How is the expected loss on a loan or a bond estimated?",
    definition: "The average credit loss a lender anticipates, combining the chance of default with the amount that would be lost if default happens.",
    formula: "Expected loss = Probability of default × Loss given default;   Loss given default = Exposure × (1 − Recovery rate)",
    formulaNote: "Exposure is the amount owed at the time of default; the recovery rate is the share recovered after default.",
    explanation: "Mức tổn thất tín dụng bình quân mà bên cho vay dự kiến, kết hợp xác suất vỡ nợ và mức tổn thất nếu vỡ nợ xảy ra.",
    example: "A 2% probability of default on a $1 million loan with 40% recovery gives an expected loss of 0.02 × $1,000,000 × 0.6 = $12,000.",
    relatedTerms: ["Probability of default", "Recovery rate", "Credit spread"],
    cfaApplication: "A bond's credit spread compensates investors at least for its expected loss, plus liquidity and risk premiums."
  },
  {
    id: "risk-15", type: "definition", difficulty: "Advanced",
    term: "Conditional value at risk (CVaR)", ipa: "/kənˌdɪʃənl ˈvæljuː ət ˈrɪsk/", vietnamese: "Tổn thất bình quân vượt ngưỡng VaR",
    question: "What is conditional value at risk (expected shortfall)?",
    definition: "The average loss in the cases where the loss is greater than the VaR threshold; also called expected shortfall.",
    formula: "CVaR = Average of the losses that are greater than or equal to VaR",
    formulaNote: "At the same probability level, CVaR is always at least as large as VaR; it captures how severe the tail losses are.",
    explanation: "Mức lỗ bình quân trong các trường hợp lỗ vượt ngưỡng VaR; cho biết mức độ nghiêm trọng của các tổn thất ở phần đuôi.",
    example: "If the 5% VaR is $165,000 and the losses worse than that average $240,000, the CVaR is $240,000.",
    relatedTerms: ["Value at risk", "Expected shortfall", "Tail risk"],
    cfaApplication: "Because it averages the tail, CVaR is often preferred to VaR for managing extreme risks."
  },
  {
    id: "risk-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Rủi ro tỷ giá", term: "Currency risk", ipa: "/ˈkʌrənsi rɪsk/",
    definition: "The risk that changes in exchange rates reduce the value of assets, liabilities or cash flows denominated in a foreign currency.",
    explanation: "Rủi ro biến động tỷ giá làm giảm giá trị tài sản, nợ phải trả hoặc dòng tiền bằng ngoại tệ.",
    example: "A Vietnamese importer that must pay in US dollars loses if the dong weakens before the payment date.",
    relatedTerms: ["Exchange rate", "Currency hedge", "Market risk"]
  },
  {
    id: "risk-17", type: "vi-en", difficulty: "Advanced",
    vietnamese: "Rủi ro mô hình", term: "Model risk", ipa: "/ˈmɒdl rɪsk/",
    definition: "The risk of loss from using a model that is wrong or from applying a model incorrectly.",
    explanation: "Rủi ro tổn thất do dùng mô hình sai hoặc áp dụng mô hình không đúng cách.",
    example: "A pricing model that assumed normally distributed returns underestimated the losses in the crisis.",
    relatedTerms: ["Model validation", "Assumptions", "Operational risk"]
  },
  {
    id: "risk-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Rủi ro pháp lý", term: "Legal risk", ipa: "/ˈliːɡl rɪsk/",
    definition: "The risk of loss from lawsuits, contracts that cannot be enforced, or changes in laws and regulations.",
    explanation: "Rủi ro tổn thất do kiện tụng, hợp đồng không thể thực thi hoặc thay đổi luật pháp, quy định.",
    example: "A derivative contract signed by a counterparty without legal authority may be unenforceable.",
    relatedTerms: ["Regulatory risk", "Compliance", "Counterparty risk"]
  },
  {
    id: "risk-19", type: "mcq", difficulty: "Beginner", term: "Classifying a trading error",
    question: "A trader accidentally enters an order for 10,000 shares instead of 1,000, causing a loss. This is best classified as:",
    options: ["market risk", "credit risk", "operational risk", "liquidity risk"],
    correctAnswer: "C",
    explanationEn: "Losses caused by human error or failed processes are operational risk, even though they show up as trading losses.",
    explanationVi: "Tổn thất do lỗi con người hoặc quy trình là rủi ro hoạt động, dù biểu hiện dưới dạng lỗ giao dịch."
  },
  {
    id: "risk-20", type: "mcq", difficulty: "Intermediate", term: "Interpreting VaR",
    question: "A portfolio's one-day 5% VaR is $2 million. Which statement is correct?",
    options: [
      "The largest possible one-day loss is $2 million.",
      "On about 5% of days, the loss is expected to be at least $2 million.",
      "The portfolio loses $2 million on 95% of days.",
      "The average daily loss is $2 million."
    ],
    correctAnswer: "B",
    explanationEn: "VaR is a minimum loss at a given probability: on about 1 day in 20, losses should equal or exceed $2 million. It is not the maximum possible loss.",
    explanationVi: "VaR là mức lỗ tối thiểu với một xác suất cho trước: khoảng 1 trong 20 ngày, mức lỗ sẽ bằng hoặc lớn hơn 2 triệu USD. VaR không phải mức lỗ tối đa có thể xảy ra."
  },
  {
    id: "risk-21", type: "mcq", difficulty: "Beginner", term: "Insurance as a risk tool",
    question: "A company buys insurance against fire damage to its factory. Which way of modifying risk is this?",
    options: ["Risk avoidance", "Risk acceptance", "Risk transfer", "Risk prevention"],
    correctAnswer: "C",
    explanationEn: "Insurance passes the financial cost of a loss to the insurer in exchange for a premium, which is risk transfer.",
    explanationVi: "Bảo hiểm chuyển chi phí tài chính của tổn thất sang công ty bảo hiểm để đổi lấy phí bảo hiểm, đó là chuyển giao rủi ro."
  },
  {
    id: "risk-22", type: "mcq", difficulty: "Advanced", term: "Measuring downside risk",
    question: "Which risk measure focuses only on returns that fall below a target return?",
    options: ["Standard deviation", "Target semideviation (downside deviation)", "Beta", "Range"],
    correctAnswer: "B",
    explanationEn: "Target semideviation uses only the returns below the target, so it measures downside risk. Standard deviation treats gains and losses alike.",
    explanationVi: "Độ lệch bán phần mục tiêu chỉ dùng các mức lợi nhuận thấp hơn mục tiêu nên đo rủi ro giảm giá. Độ lệch chuẩn tính cả biến động lên và xuống như nhau."
  }
]);

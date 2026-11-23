// Financial English · Banking — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("bank", [
  {
    id: "bank-01", type: "vocabulary", difficulty: "Beginner",
    term: "Deposit", ipa: "/dɪˈpɒzɪt/", vietnamese: "Tiền gửi",
    definition: "Money placed with a bank that the bank must repay to the customer on demand or at the end of an agreed term.",
    explanation: "Khoản tiền khách hàng gửi vào ngân hàng; ngân hàng phải hoàn trả khi khách yêu cầu (không kỳ hạn) hoặc khi hết kỳ hạn.",
    example: "A customer opens a 12-month deposit of 100 million VND at 5% a year.",
    relatedTerms: ["Demand deposit", "Time deposit", "Deposit insurance"],
    cfaApplication: "Deposits are a bank's main source of funding and appear as liabilities on its balance sheet."
  },
  {
    id: "bank-02", type: "vocabulary", difficulty: "Beginner",
    term: "Loan", ipa: "/ləʊn/", vietnamese: "Khoản vay (khoản cho vay)",
    definition: "Money lent by a bank or other lender to a borrower, to be repaid with interest according to agreed terms.",
    explanation: "Khoản tiền ngân hàng hoặc bên cho vay cấp cho người vay, phải hoàn trả kèm lãi theo điều kiện đã thỏa thuận.",
    example: "A small business takes a two-year loan of 500 million VND to buy equipment.",
    relatedTerms: ["Interest rate", "Collateral", "Amortization schedule"],
    cfaApplication: "Loans are a bank's main earning assets, and their credit quality drives the bank's risk."
  },
  {
    id: "bank-03", type: "vocabulary", difficulty: "Beginner",
    term: "Collateral", ipa: "/kəˈlætərəl/", vietnamese: "Tài sản bảo đảm",
    definition: "An asset that a borrower pledges to a lender to secure a debt, which the lender can take if the borrower fails to repay.",
    explanation: "Tài sản người vay cầm cố, thế chấp cho bên cho vay để bảo đảm khoản nợ; bên cho vay có quyền xử lý nếu người vay không trả nợ.",
    example: "The car serves as collateral for the car loan.",
    relatedTerms: ["Secured loan", "Mortgage", "Recovery rate"],
    cfaApplication: "Collateral raises the expected recovery rate and lowers the loss given default."
  },
  {
    id: "bank-04", type: "vocabulary", difficulty: "Beginner",
    term: "Mortgage", ipa: "/ˈmɔːɡɪdʒ/", vietnamese: "Khoản vay thế chấp bất động sản",
    definition: "A long-term loan used to buy real estate, secured by that property and usually repaid in regular instalments.",
    explanation: "Khoản vay dài hạn để mua bất động sản, được bảo đảm bằng chính bất động sản đó và thường trả góp đều đặn.",
    example: "A family takes a 20-year mortgage to buy an apartment.",
    relatedTerms: ["Collateral", "Amortizing loan", "Mortgage-backed securities"],
    cfaApplication: "Pools of mortgages are securitized into mortgage-backed securities, which expose investors to prepayment risk."
  },
  {
    id: "bank-05", type: "vocabulary", difficulty: "Intermediate",
    term: "Non-performing loan (NPL)", ipa: "/ˌnɒn pəˌfɔːmɪŋ ˈləʊn/", vietnamese: "Nợ xấu",
    definition: "A loan on which the borrower has stopped making payments or is close to default, usually with payments overdue by 90 days or more.",
    explanation: "Khoản vay mà người vay đã ngừng trả nợ hoặc có nguy cơ không trả được, thường quá hạn trên 90 ngày (ở Việt Nam là nợ nhóm 3 đến nhóm 5).",
    example: "A bank with 2 trillion VND of NPLs out of 100 trillion VND of loans has an NPL ratio of 2%.",
    relatedTerms: ["Loan loss provision", "Asset quality", "Default"],
    cfaApplication: "The NPL ratio is a key measure of asset quality when analysing banks (the A in CAMELS)."
  },
  {
    id: "bank-06", type: "vocabulary", difficulty: "Intermediate",
    term: "Reserve requirement", ipa: "/rɪˈzɜːv rɪˌkwaɪəmənt/", vietnamese: "Dự trữ bắt buộc",
    definition: "The minimum share of customer deposits that banks must keep as cash or at the central bank instead of lending it out.",
    explanation: "Tỷ lệ tối thiểu trên tiền gửi khách hàng mà ngân hàng phải giữ lại dưới dạng tiền mặt hoặc tiền gửi tại ngân hàng trung ương, không được cho vay.",
    example: "With a 3% reserve requirement, a bank holding 1,000 billion VND of deposits must keep 30 billion VND in reserves.",
    relatedTerms: ["Money multiplier", "Central bank", "Excess reserves"],
    cfaApplication: "In the simple model of money creation, the money multiplier is 1 ÷ the reserve requirement."
  },
  {
    id: "bank-07", type: "vocabulary", difficulty: "Advanced",
    term: "Capital adequacy ratio (CAR)", ipa: "/ˈkæpɪtl ˈædɪkwəsi ˌreɪʃiəʊ/", vietnamese: "Hệ số an toàn vốn",
    definition: "A bank's capital as a percentage of its risk-weighted assets, used by regulators to make sure the bank can absorb losses.",
    explanation: "Tỷ lệ vốn của ngân hàng trên tổng tài sản có rủi ro (đã nhân hệ số rủi ro); dùng để bảo đảm ngân hàng đủ vốn chống đỡ tổn thất.",
    example: "A bank with $12 billion of capital and $100 billion of risk-weighted assets has a CAR of 12%.",
    relatedTerms: ["Basel III", "Risk-weighted assets", "Tier 1 capital"],
    cfaApplication: "Under the Basel framework, banks must hold total capital of at least 8% of risk-weighted assets, plus buffers."
  },
  {
    id: "bank-08", type: "vocabulary", difficulty: "Intermediate",
    term: "Interbank market", ipa: "/ˌɪntəˈbæŋk ˌmɑːkɪt/", vietnamese: "Thị trường liên ngân hàng",
    definition: "The market in which banks lend money to and borrow money from each other, mostly for short periods.",
    explanation: "Thị trường nơi các ngân hàng cho nhau vay và đi vay, chủ yếu kỳ hạn ngắn.",
    example: "A bank short of cash at the end of the day borrows overnight in the interbank market.",
    relatedTerms: ["Overnight rate", "Liquidity", "Money market"],
    cfaApplication: "Interbank rates, such as overnight rates, are key reference rates for floating-rate loans and derivatives."
  },
  {
    id: "bank-09", type: "vocabulary", difficulty: "Advanced",
    term: "Loan loss provision", ipa: "/ˈləʊn lɒs prəˌvɪʒn/", vietnamese: "Dự phòng rủi ro tín dụng",
    definition: "An expense that a bank records to build a reserve against expected losses on the money it has lent.",
    explanation: "Khoản chi phí ngân hàng trích lập để tạo quỹ dự phòng cho các tổn thất dự kiến từ các khoản cho vay.",
    example: "Expecting more defaults, the bank raised its loan loss provisions, which cut quarterly profit by 20%.",
    relatedTerms: ["Allowance for loan losses", "Expected credit loss", "Non-performing loan"],
    cfaApplication: "Under IFRS 9, banks provide for expected credit losses rather than waiting for losses to occur."
  },
  {
    id: "bank-10", type: "vocabulary", difficulty: "Intermediate",
    term: "Bank run", ipa: "/ˈbæŋk rʌn/", vietnamese: "Rút tiền ồ ạt",
    definition: "A situation in which many depositors withdraw their money at the same time because they fear the bank will fail.",
    explanation: "Tình trạng nhiều người gửi tiền đồng loạt rút tiền vì lo sợ ngân hàng sẽ đổ vỡ.",
    example: "Rumours about bad loans triggered a bank run, and queues formed outside the branches.",
    relatedTerms: ["Liquidity risk", "Deposit insurance", "Lender of last resort"],
    cfaApplication: "Banks turn short-term deposits into long-term loans, which makes them vulnerable to runs."
  },
  {
    id: "bank-11", type: "vocabulary", difficulty: "Beginner",
    term: "Financial intermediary", ipa: "/faɪˌnænʃl ˌɪntəˈmiːdiəri/", vietnamese: "Trung gian tài chính",
    definition: "An institution, such as a bank or an insurance company, that channels funds from savers to borrowers.",
    explanation: "Tổ chức (ngân hàng, công ty bảo hiểm…) đứng giữa dẫn vốn từ người tiết kiệm đến người cần vay.",
    example: "A bank acts as a financial intermediary when it uses households' deposits to make loans to businesses.",
    relatedTerms: ["Bank", "Maturity transformation", "Capital market"],
    cfaApplication: "Intermediaries reduce transaction costs and pool risks, a basic function of the financial system."
  },
  {
    id: "bank-12", type: "vocabulary", difficulty: "Intermediate",
    term: "Letter of credit (L/C)", ipa: "/ˌletər əv ˈkredɪt/", vietnamese: "Thư tín dụng",
    definition: "A bank's written promise to pay a seller on behalf of a buyer once the seller presents the required documents.",
    explanation: "Cam kết bằng văn bản của ngân hàng sẽ thanh toán cho người bán thay cho người mua khi người bán xuất trình đủ chứng từ theo yêu cầu.",
    example: "A Vietnamese exporter ships coffee to Germany and is paid through a letter of credit issued by the buyer's bank.",
    relatedTerms: ["Trade finance", "Documentary credit", "Bank guarantee"],
    cfaApplication: "Letters of credit reduce counterparty risk in international trade by replacing the buyer's credit with the bank's."
  },
  {
    id: "bank-13", type: "definition", difficulty: "Intermediate",
    term: "Net interest margin (NIM)", ipa: "/ˌnet ˈɪntrəst ˌmɑːdʒɪn/", vietnamese: "Biên lãi ròng",
    question: "What is net interest margin?",
    definition: "A bank's interest income minus its interest expense, expressed as a percentage of its average interest-earning assets.",
    formula: "NIM = (Interest income − Interest expense) ÷ Average interest-earning assets",
    formulaNote: "It measures how profitably the bank lends and invests relative to what it pays for its funding.",
    explanation: "Thu nhập lãi thuần (thu lãi trừ chi lãi) chia cho tài sản sinh lãi bình quân; đo hiệu quả hoạt động cho vay và đầu tư so với chi phí huy động.",
    example: "Interest income of $80 million, interest expense of $50 million and average earning assets of $1 billion give a NIM of 3%.",
    relatedTerms: ["Net interest income", "Spread", "Cost of funds"],
    cfaApplication: "Rising rates can widen or narrow NIM, depending on how quickly a bank's assets and liabilities reprice."
  },
  {
    id: "bank-14", type: "definition", difficulty: "Intermediate",
    term: "Loan-to-deposit ratio (LDR)", ipa: "/ˌləʊn tə dɪˈpɒzɪt ˌreɪʃiəʊ/", vietnamese: "Tỷ lệ cho vay trên tiền gửi",
    question: "What is the loan-to-deposit ratio?",
    definition: "A bank's total lending divided by the money customers have placed with it, showing how much of that funding has been lent out.",
    formula: "LDR = Total loans ÷ Total deposits",
    formulaNote: "A high ratio means less liquidity and more reliance on other funding; regulators in some countries set a maximum.",
    explanation: "Tổng dư nợ cho vay chia cho tổng tiền gửi; cho biết ngân hàng đã dùng bao nhiêu phần tiền gửi để cho vay.",
    example: "Loans of $850 million and deposits of $1 billion give an LDR of 85%.",
    relatedTerms: ["Liquidity", "Funding", "Net stable funding ratio"],
    cfaApplication: "Analysts use the LDR together with liquidity coverage measures to judge a bank's funding risk."
  },
  {
    id: "bank-15", type: "definition", difficulty: "Beginner",
    term: "Simple interest", ipa: "/ˌsɪmpl ˈɪntrəst/", vietnamese: "Lãi đơn",
    question: "How is simple interest calculated?",
    definition: "Interest calculated only on the original principal, not on interest already earned.",
    formula: "Interest = Principal × Annual rate × Time (in years)",
    formulaNote: "Deposit and loan rates are usually quoted per year, so convert the term into years (3 months = 0.25 year).",
    explanation: "Tiền lãi chỉ tính trên số tiền gốc ban đầu, không tính trên tiền lãi đã phát sinh.",
    example: "100 million VND deposited at 6% a year for 3 months earns 100,000,000 × 0.06 × 0.25 = 1.5 million VND.",
    relatedTerms: ["Compound interest", "Principal", "Interest rate"],
    cfaApplication: "Money market instruments often use simple (add-on or discount) interest conventions for periods shorter than a year."
  },
  {
    id: "bank-16", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Bảo hiểm tiền gửi", term: "Deposit insurance", ipa: "/dɪˈpɒzɪt ɪnˌʃʊərəns/",
    definition: "A guarantee, usually backed by the government, that protects depositors' money up to a set limit if a bank fails.",
    explanation: "Cơ chế bảo đảm (thường do nhà nước đứng sau) bảo vệ tiền gửi của người gửi đến một hạn mức nhất định nếu ngân hàng đổ vỡ.",
    example: "Because deposits are insured up to a limit, small depositors have less reason to join a bank run.",
    relatedTerms: ["Bank run", "Moral hazard", "Deposit"]
  },
  {
    id: "bank-17", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Hạn mức tín dụng", term: "Line of credit", ipa: "/ˌlaɪn əv ˈkredɪt/",
    definition: "An arrangement that lets a borrower draw funds as needed up to a maximum amount, paying interest only on the amount used.",
    explanation: "Thỏa thuận cho phép người vay rút vốn khi cần trong một mức tối đa, chỉ trả lãi trên số tiền thực sự sử dụng.",
    example: "The retailer has a 10 billion VND line of credit but has drawn only 3 billion VND.",
    relatedTerms: ["Revolving credit", "Overdraft", "Working capital"]
  },
  {
    id: "bank-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Ngân hàng đầu tư", term: "Investment bank", ipa: "/ɪnˈvestmənt bæŋk/",
    definition: "A financial institution that helps companies and governments raise capital by underwriting securities, and advises on mergers and acquisitions.",
    explanation: "Tổ chức tài chính giúp doanh nghiệp, chính phủ huy động vốn qua bảo lãnh phát hành chứng khoán và tư vấn mua bán, sáp nhập.",
    example: "The company hired an investment bank to manage its IPO.",
    relatedTerms: ["Underwriting", "Commercial bank", "Mergers and acquisitions"]
  },
  {
    id: "bank-19", type: "mcq", difficulty: "Beginner", term: "Deposits on a bank's balance sheet",
    question: "On a bank's balance sheet, customer deposits are:",
    options: ["assets", "liabilities", "equity", "revenue"],
    correctAnswer: "B",
    explanationEn: "Deposits are money the bank owes to its customers, so they are liabilities. The loans the bank makes with that money are its assets.",
    explanationVi: "Tiền gửi là khoản ngân hàng nợ khách hàng nên là nợ phải trả. Các khoản cho vay ngân hàng cấp từ nguồn tiền đó mới là tài sản."
  },
  {
    id: "bank-20", type: "mcq", difficulty: "Beginner", term: "Rising NPL ratio",
    question: "A rising non-performing loan ratio at a bank most likely indicates:",
    options: ["improving asset quality", "deteriorating asset quality", "a higher capital adequacy ratio", "lower credit risk"],
    correctAnswer: "B",
    explanationEn: "More loans in or near default means the quality of the bank's loan book is getting worse; it usually requires more provisions and erodes capital.",
    explanationVi: "Nhiều khoản vay quá hạn hoặc có nguy cơ vỡ nợ hơn nghĩa là chất lượng danh mục cho vay đang xấu đi; ngân hàng thường phải trích lập dự phòng nhiều hơn và vốn bị bào mòn."
  },
  {
    id: "bank-21", type: "mcq", difficulty: "Intermediate", term: "Effect of a higher reserve requirement",
    question: "If the central bank raises the reserve requirement ratio, banks' capacity to lend will most likely:",
    options: ["increase", "decrease", "stay the same", "become unlimited"],
    correctAnswer: "B",
    explanationEn: "Banks must keep a larger share of deposits as reserves, leaving less to lend; it is a contractionary monetary policy tool.",
    explanationVi: "Ngân hàng phải giữ lại tỷ lệ tiền gửi lớn hơn làm dự trữ nên còn ít tiền để cho vay; đây là công cụ thắt chặt tiền tệ."
  },
  {
    id: "bank-22", type: "mcq", difficulty: "Intermediate", term: "Pricing secured loans",
    question: "Why do lenders usually charge lower interest rates on secured loans than on unsecured loans?",
    options: [
      "Secured loans have no default risk.",
      "Collateral reduces the lender's expected loss if the borrower defaults.",
      "Secured loans are always short-term.",
      "Regulators forbid higher rates on secured loans."
    ],
    correctAnswer: "B",
    explanationEn: "The borrower can still default, but the lender can sell the collateral and recover more, so the expected loss and the required interest rate are lower.",
    explanationVi: "Người vay vẫn có thể vỡ nợ, nhưng bên cho vay có thể xử lý tài sản bảo đảm để thu hồi nhiều hơn, nên tổn thất dự kiến và lãi suất yêu cầu thấp hơn."
  }
]);

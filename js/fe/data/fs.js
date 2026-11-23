// Financial English · Financial Statements — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("fs", [
  {
    id: "fs-01", type: "vocabulary", difficulty: "Beginner",
    term: "Balance sheet", ipa: "/ˈbæləns ʃiːt/", vietnamese: "Bảng cân đối kế toán",
    definition: "A financial statement that shows a company's assets, liabilities and equity at a specific point in time.",
    explanation: "Báo cáo tài chính thể hiện tài sản, nợ phải trả và vốn chủ sở hữu của doanh nghiệp tại một thời điểm nhất định.",
    example: "On 31 December, the company reported total assets of $5 million, funded by $3 million of liabilities and $2 million of equity.",
    relatedTerms: ["Assets", "Liabilities", "Shareholders' equity"],
    cfaApplication: "Analysts use the balance sheet to assess liquidity, solvency and capital structure; assets always equal liabilities plus equity."
  },
  {
    id: "fs-02", type: "vocabulary", difficulty: "Beginner",
    term: "Income statement", ipa: "/ˈɪnkʌm ˈsteɪtmənt/", vietnamese: "Báo cáo kết quả kinh doanh",
    definition: "A financial statement that reports a company's revenues, expenses and profit or loss over a period of time.",
    explanation: "Báo cáo thể hiện doanh thu, chi phí và lãi hoặc lỗ của doanh nghiệp trong một kỳ.",
    example: "For 2026, the company reported revenue of $80 million and net income of $6 million.",
    relatedTerms: ["Revenue", "Net income", "Earnings per share"],
    cfaApplication: "Gross, operating and net profit margins are all calculated from the income statement."
  },
  {
    id: "fs-03", type: "vocabulary", difficulty: "Beginner",
    term: "Cash flow statement", ipa: "/ˈkæʃ fləʊ ˈsteɪtmənt/", vietnamese: "Báo cáo lưu chuyển tiền tệ",
    definition: "A financial statement that shows the cash a company received and paid during a period, classified as operating, investing and financing activities.",
    explanation: "Báo cáo thể hiện các khoản tiền thu và chi trong kỳ, chia thành ba nhóm: hoạt động kinh doanh, đầu tư và tài chính.",
    example: "Buying new equipment appears as an investing outflow; paying dividends appears as a financing outflow.",
    relatedTerms: ["Operating cash flow", "Free cash flow", "Accrual accounting"],
    cfaApplication: "Comparing cash flow from operations with net income helps analysts judge the quality of earnings."
  },
  {
    id: "fs-04", type: "vocabulary", difficulty: "Beginner",
    term: "Revenue", ipa: "/ˈrevənjuː/", vietnamese: "Doanh thu",
    definition: "The amount a company earns from its ordinary activities, such as selling goods or providing services, before any expenses are deducted.",
    explanation: "Giá trị doanh nghiệp thu được từ hoạt động kinh doanh thông thường như bán hàng, cung cấp dịch vụ, trước khi trừ chi phí.",
    example: "A café that sells 20,000 cups of coffee at $3 each earns $60,000 of revenue.",
    relatedTerms: ["Sales", "Revenue recognition", "Gross profit"],
    cfaApplication: "Under IFRS 15 and ASC 606, revenue is recognized when (or as) the company satisfies its performance obligations to customers."
  },
  {
    id: "fs-05", type: "vocabulary", difficulty: "Intermediate",
    term: "Accrual accounting", ipa: "/əˈkruːəl əˈkaʊntɪŋ/", vietnamese: "Kế toán dồn tích",
    definition: "An accounting method that records revenues when they are earned and expenses when they are incurred, regardless of when cash is received or paid.",
    explanation: "Phương pháp ghi nhận doanh thu khi đã thực hiện và chi phí khi đã phát sinh, không phụ thuộc thời điểm thu hoặc chi tiền.",
    example: "Electricity used in December is recorded as a December expense even if the bill is paid in January.",
    relatedTerms: ["Accrued expenses", "Deferred revenue", "Matching principle"],
    cfaApplication: "Accruals explain why net income differs from operating cash flow; large or growing accruals can signal low earnings quality."
  },
  {
    id: "fs-06", type: "vocabulary", difficulty: "Beginner",
    term: "Depreciation", ipa: "/dɪˌpriːʃiˈeɪʃn/", vietnamese: "Khấu hao tài sản cố định hữu hình",
    definition: "The systematic allocation of the cost of a tangible long-lived asset, such as a machine or a building, over its useful life.",
    explanation: "Việc phân bổ có hệ thống nguyên giá của tài sản cố định hữu hình (máy móc, nhà xưởng) vào chi phí trong suốt thời gian sử dụng hữu ích.",
    example: "A $100,000 machine with a 10-year life and no residual value has straight-line depreciation of $10,000 a year.",
    relatedTerms: ["Straight-line method", "Accelerated depreciation", "Residual value"],
    cfaApplication: "Depreciation methods and useful-life estimates affect reported profit, so analysts adjust for them when comparing companies."
  },
  {
    id: "fs-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Amortization", ipa: "/əˌmɔːtaɪˈzeɪʃn/", vietnamese: "Phân bổ chi phí tài sản vô hình",
    definition: "The systematic allocation of the cost of an intangible asset with a finite useful life over that life.",
    explanation: "Việc phân bổ dần chi phí của tài sản vô hình có thời gian sử dụng hữu hạn (bằng sáng chế, giấy phép) vào chi phí.",
    example: "A patent bought for $50,000 with 5 years of remaining life is amortized at $10,000 a year.",
    relatedTerms: ["Intangible assets", "Depreciation", "Impairment"],
    cfaApplication: "Intangible assets with indefinite lives, such as goodwill, are not amortized but are tested for impairment."
  },
  {
    id: "fs-08", type: "vocabulary", difficulty: "Intermediate",
    term: "Goodwill", ipa: "/ˌɡʊdˈwɪl/", vietnamese: "Lợi thế thương mại",
    definition: "An intangible asset recognized in an acquisition, equal to the purchase price in excess of the fair value of the identifiable net assets acquired.",
    explanation: "Tài sản vô hình phát sinh khi mua một doanh nghiệp, bằng phần giá mua vượt quá giá trị hợp lý của tài sản thuần có thể xác định được.",
    example: "Paying $500 million for a company whose identifiable net assets are worth $400 million creates $100 million of goodwill.",
    relatedTerms: ["Acquisition", "Impairment", "Intangible assets"],
    cfaApplication: "Goodwill is not amortized under IFRS or US GAAP; it is tested for impairment, and large write-downs can reveal that the buyer overpaid."
  },
  {
    id: "fs-09", type: "vocabulary", difficulty: "Beginner",
    term: "Inventory", ipa: "/ˈɪnvəntri/", vietnamese: "Hàng tồn kho",
    definition: "Goods held for sale in the ordinary course of business, goods in production, and materials to be used in production.",
    explanation: "Hàng hóa giữ để bán, sản phẩm dở dang và nguyên vật liệu dùng cho sản xuất.",
    example: "A bookshop's unsold books at the end of the month are inventory.",
    relatedTerms: ["FIFO", "Cost of goods sold", "Inventory turnover"],
    cfaApplication: "Inventory methods (FIFO, weighted average cost, and LIFO under US GAAP only) change cost of sales and reported profit."
  },
  {
    id: "fs-10", type: "vocabulary", difficulty: "Beginner",
    term: "Accounts receivable", ipa: "/əˈkaʊnts rɪˈsiːvəbl/", vietnamese: "Khoản phải thu khách hàng",
    definition: "Money owed to a company by customers who bought goods or services on credit.",
    explanation: "Số tiền khách hàng còn nợ doanh nghiệp do mua hàng hóa, dịch vụ theo hình thức trả chậm.",
    example: "A wholesaler that ships goods today with payment due in 30 days records a receivable.",
    relatedTerms: ["Days sales outstanding", "Bad debt", "Working capital"],
    cfaApplication: "Receivables growing faster than revenue may signal aggressive revenue recognition or weak collections."
  },
  {
    id: "fs-11", type: "vocabulary", difficulty: "Beginner",
    term: "Accounts payable", ipa: "/əˈkaʊnts ˈpeɪəbl/", vietnamese: "Khoản phải trả người bán",
    definition: "Money a company owes to its suppliers for goods or services bought on credit.",
    explanation: "Số tiền doanh nghiệp còn nợ nhà cung cấp do mua hàng hóa, dịch vụ trả chậm.",
    example: "A restaurant that receives food supplies now and pays the supplier in 30 days records a payable.",
    relatedTerms: ["Days payables outstanding", "Current liabilities", "Trade credit"],
    cfaApplication: "Delaying payments to suppliers temporarily boosts operating cash flow, which analysts watch for when assessing cash flow quality."
  },
  {
    id: "fs-12", type: "vocabulary", difficulty: "Advanced",
    term: "Impairment", ipa: "/ɪmˈpeəmənt/", vietnamese: "Suy giảm giá trị tài sản",
    definition: "A reduction in the carrying amount of an asset when that amount is higher than the amount the company can recover from the asset.",
    explanation: "Việc ghi giảm giá trị sổ sách của tài sản khi giá trị này cao hơn giá trị có thể thu hồi từ tài sản.",
    example: "After demand for its product collapsed, the company wrote its factory down from $80 million to $50 million.",
    relatedTerms: ["Carrying amount", "Recoverable amount", "Write-down"],
    cfaApplication: "Under IFRS, the recoverable amount is the higher of fair value less costs to sell and value in use; the loss reduces net income."
  },
  {
    id: "fs-13", type: "definition", difficulty: "Intermediate",
    term: "Return on Equity (ROE)", ipa: "/rɪˈtɜːn ɒn ˈekwəti/", vietnamese: "Tỷ suất sinh lời trên vốn chủ sở hữu",
    question: "What is Return on Equity?",
    definition: "A profitability ratio that measures how much net income a company earns for each unit of shareholders' equity.",
    formula: "ROE = Net income ÷ Average total equity",
    formulaNote: "Use the average of beginning and ending equity for the period. DuPont: ROE = Net profit margin × Total asset turnover × Financial leverage (assets ÷ equity).",
    explanation: "Cho biết mỗi đồng vốn chủ sở hữu tạo ra bao nhiêu đồng lợi nhuận ròng. ROE cao có thể đến từ hiệu quả kinh doanh hoặc từ việc dùng nhiều nợ vay.",
    example: "Net income of $12 million and average equity of $100 million give an ROE of 12%.",
    relatedTerms: ["DuPont analysis", "Return on Assets", "Financial leverage"],
    cfaApplication: "DuPont analysis breaks ROE into margin, efficiency and leverage to show what drives a company's returns."
  },
  {
    id: "fs-14", type: "definition", difficulty: "Beginner",
    term: "Current ratio", ipa: "/ˈkʌrənt ˈreɪʃiəʊ/", vietnamese: "Hệ số thanh toán hiện hành",
    question: "What is the current ratio?",
    definition: "A liquidity ratio that compares a company's current assets with its current liabilities.",
    formula: "Current ratio = Current assets ÷ Current liabilities",
    formulaNote: "A higher ratio means more short-term liquidity; a very high ratio can mean cash or inventory is not used efficiently.",
    explanation: "Hệ số cho biết tài sản ngắn hạn có đủ để trang trải nợ ngắn hạn hay không. Lớn hơn 1 nghĩa là tài sản ngắn hạn nhiều hơn nợ ngắn hạn.",
    example: "Current assets of $300,000 and current liabilities of $200,000 give a current ratio of 1.5.",
    relatedTerms: ["Quick ratio", "Cash ratio", "Working capital"],
    cfaApplication: "Liquidity ratios are compared with peers and over time, because what is normal differs by industry."
  },
  {
    id: "fs-15", type: "definition", difficulty: "Beginner",
    term: "Gross profit margin", ipa: "/ɡrəʊs ˈprɒfɪt ˈmɑːdʒɪn/", vietnamese: "Biên lợi nhuận gộp",
    question: "What is gross profit margin?",
    definition: "The percentage of revenue that remains after deducting the direct cost of the goods or services sold.",
    formula: "Gross profit margin = (Revenue − Cost of goods sold) ÷ Revenue",
    formulaNote: "Expressed as a percentage of revenue; it reflects pricing power and production costs before operating expenses.",
    explanation: "Tỷ lệ phần trăm doanh thu còn lại sau khi trừ giá vốn hàng bán; phản ánh khả năng định giá và kiểm soát chi phí sản xuất.",
    example: "Revenue of $1,000 and cost of goods sold of $600 give a gross profit margin of 40%.",
    relatedTerms: ["Operating margin", "Net profit margin", "Cost of goods sold"],
    cfaApplication: "Common-size income statements show every line as a percentage of revenue, making margins comparable across companies."
  },
  {
    id: "fs-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Tỷ suất sinh lời trên tài sản", term: "Return on Assets (ROA)", ipa: "/rɪˈtɜːn ɒn ˈæsets/",
    definition: "A profitability ratio equal to net income divided by average total assets; it shows how efficiently a company uses its assets to earn profit.",
    explanation: "Lợi nhuận ròng chia cho tổng tài sản bình quân; cho biết doanh nghiệp sử dụng tài sản hiệu quả đến đâu để tạo ra lợi nhuận.",
    example: "A bank with net income of $5 million and average total assets of $500 million has an ROA of 1%.",
    relatedTerms: ["Return on Equity", "Asset turnover", "Net income"]
  },
  {
    id: "fs-17", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Lợi nhuận giữ lại", term: "Retained earnings", ipa: "/rɪˌteɪnd ˈɜːnɪŋz/",
    definition: "The cumulative net income a company has kept in the business instead of paying it out as dividends.",
    explanation: "Phần lợi nhuận ròng lũy kế được giữ lại để tái đầu tư thay vì chia cổ tức; là một phần của vốn chủ sở hữu.",
    example: "Net income of $8 million and dividends of $3 million increase retained earnings by $5 million.",
    relatedTerms: ["Shareholders' equity", "Dividends", "Net income"]
  },
  {
    id: "fs-18", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Giá vốn hàng bán", term: "Cost of goods sold (COGS)", ipa: "/ˌkɒst əv ˌɡʊdz ˈsəʊld/",
    definition: "The direct costs of producing or buying the goods that a company sold during the period.",
    explanation: "Chi phí trực tiếp để sản xuất hoặc mua số hàng hóa đã bán trong kỳ.",
    example: "A retailer that sells 1,000 shirts bought at $8 each records $8,000 of COGS.",
    relatedTerms: ["Gross profit", "Inventory", "FIFO"]
  },
  {
    id: "fs-19", type: "mcq", difficulty: "Intermediate", term: "Classifying interest paid",
    question: "Under US GAAP, interest paid by a company is classified in the statement of cash flows as:",
    options: ["an investing activity", "a financing activity", "an operating activity", "a non-cash item"],
    correctAnswer: "C",
    explanationEn: "US GAAP requires interest paid to be reported in operating activities. IFRS allows a choice between operating and financing activities.",
    explanationVi: "Theo US GAAP, tiền lãi vay đã trả được trình bày trong hoạt động kinh doanh. IFRS cho phép chọn trình bày ở hoạt động kinh doanh hoặc hoạt động tài chính."
  },
  {
    id: "fs-20", type: "mcq", difficulty: "Beginner", term: "When revenue is recognized",
    question: "A company provides a service in December and receives the cash in January. Under accrual accounting, the revenue is recognized in:",
    options: ["January, when the cash is received", "December, when the service is provided", "half in December and half in January", "the period in which the auditor approves it"],
    correctAnswer: "B",
    explanationEn: "Accrual accounting recognizes revenue when it is earned, that is, when the service is performed, not when the cash arrives.",
    explanationVi: "Kế toán dồn tích ghi nhận doanh thu khi đã thực hiện xong dịch vụ (tháng 12), không phụ thuộc thời điểm nhận tiền."
  },
  {
    id: "fs-21", type: "mcq", difficulty: "Intermediate", term: "Accelerated depreciation",
    question: "Compared with straight-line depreciation, an accelerated depreciation method in the early years of an asset's life results in:",
    options: ["higher net income", "lower depreciation expense", "lower net income", "a higher carrying amount for the asset"],
    correctAnswer: "C",
    explanationEn: "Accelerated methods charge more depreciation in the early years, which lowers net income and the asset's carrying amount in those years.",
    explanationVi: "Phương pháp khấu hao nhanh ghi nhận chi phí khấu hao lớn hơn trong những năm đầu, nên lợi nhuận ròng và giá trị còn lại của tài sản thấp hơn."
  },
  {
    id: "fs-22", type: "mcq", difficulty: "Advanced", term: "FIFO versus LIFO",
    question: "When prices are rising and inventory quantities are stable, a company using FIFO instead of LIFO will report:",
    options: ["higher cost of goods sold", "lower gross profit", "higher ending inventory", "lower net income"],
    correctAnswer: "C",
    explanationEn: "Under FIFO, the oldest (cheaper) costs go to cost of goods sold and the newest (more expensive) costs stay in ending inventory. So FIFO shows lower COGS, higher profit and higher ending inventory than LIFO. LIFO is allowed only under US GAAP.",
    explanationVi: "Với FIFO, giá vốn lấy theo hàng nhập trước (rẻ hơn) còn hàng tồn cuối kỳ mang giá mới (đắt hơn). Vì vậy so với LIFO, FIFO cho giá vốn thấp hơn, lợi nhuận cao hơn và hàng tồn kho cuối kỳ cao hơn. LIFO chỉ được phép theo US GAAP."
  }
]);

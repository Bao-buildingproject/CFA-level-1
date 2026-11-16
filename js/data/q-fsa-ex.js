// FSA exhibit-style questions — ORIGINAL questions with fictitious companies
// and made-up numbers, written to mirror the exam's case/exhibit format.
// Row: [level, question, A, B, C, answer, why, whyNot, trap, calc, los, exhibit]

addQ27("FSA-04", [
  ["a", "Based on Exhibit 1 for Lotus Trading Co., a fictitious company, cash flow from operations (indirect method) is closest to:",
    "USD45 million", "USD55 million", "USD35 million", "A",
    "CFO = NI 45 + depreciation 12 − gain 5 − ΔAR 8 + Δinventory 4 − ΔAP 3 = 45. The adjustments net to zero.",
    "B adds the gain instead of subtracting it. C subtracts the inventory decrease instead of adding it.",
    "Gains on asset sales are investing cash flows — remove them from net income.", "", "Vol 4 LM 4",
    { title: "Exhibit 1", subtitle: "Lotus Trading Co. — year ended 31 Dec 2026 (USD millions)",
      head: ["Item", "2025", "2026"],
      rows: [["§Income statement", "", ""], ["Net income", "", "45"], ["Depreciation", "", "12"], ["Gain on sale of equipment", "", "5"],
             ["§Balance sheet", "", ""], ["Accounts receivable", "20", "28"], ["Inventory", "35", "31"], ["Accounts payable", "18", "15"]] }],

  ["e", "Using Exhibit 1 for Mekong Retail, a fictitious company, cash collected from customers is closest to:",
    "USD509 million", "USD491 million", "USD479 million", "B",
    "Cash collected = revenue 500 − increase in receivables 15 + increase in unearned revenue 6 = 491.",
    "A adds the receivables increase. C subtracts the unearned revenue increase.",
    "More unearned revenue means customers paid before revenue was recognized — extra cash.", "", "Vol 4 LM 4",
    { title: "Exhibit 1", subtitle: "Mekong Retail — selected data (USD millions)",
      head: ["Item", "Beginning", "End"],
      rows: [["Revenue for the year", "", "500"], ["Accounts receivable", "60", "75"], ["Unearned revenue", "10", "16"]] }],

  ["a", "Using Exhibit 1 for Hanoi Foods, a fictitious company, cash paid to suppliers is closest to:",
    "USD308 million", "USD332 million", "USD292 million", "A",
    "Purchases = COGS 300 + increase in inventory 20 = 320. Cash paid = purchases 320 − increase in payables 12 = 308.",
    "B adds the payables increase. C ignores the inventory build-up and subtracts payables.",
    "", "", "Vol 4 LM 4",
    { title: "Exhibit 1", subtitle: "Hanoi Foods — selected data (USD millions)",
      head: ["Item", "Beginning", "End"],
      rows: [["Cost of goods sold for the year", "", "300"], ["Inventory", "80", "100"], ["Accounts payable", "40", "52"]] }],

  ["e", "Based on Exhibit 1 for Delta Components, a fictitious company, the total adjustment to net income to arrive at CFO is:",
    "Add USD6 million", "Subtract USD6 million", "Add USD10 million", "A",
    "+10 depreciation + 6 decrease in AR − 9 increase in inventory − 4 decrease in AP + 3 increase in accrued liabilities = +6. CFO = 56.",
    "B flips every working-capital sign. C counts only depreciation.",
    "Asset up → subtract; liability up → add.", "", "Vol 4 LM 4",
    { title: "Exhibit 1", subtitle: "Delta Components — year 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Net income", "50"], ["Depreciation", "10"], ["Change in accounts receivable", "(6)"], ["Change in inventory", "9"],
             ["Change in accounts payable", "(4)"], ["Change in accrued liabilities", "3"]],
      note: "Parentheses = decrease during the year." }]
]);

addQ27("FSA-05", [
  ["e", "Based on Exhibit 1 for Orchid Logistics, a fictitious company, free cash flow to the firm (FCFF) is closest to:",
    "USD35 million", "USD50 million", "USD70 million", "B",
    "FCFF = NI 80 + D&A 25 + interest × (1 − t) 15 − capex 60 − increase in working capital 10 = 50.",
    "A forgets to add back after-tax interest. C ignores working capital and uses pre-tax interest.",
    "", "", "Vol 4 LM 5",
    { title: "Exhibit 1", subtitle: "Orchid Logistics — 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Net income", "80"], ["Depreciation and amortization", "25"], ["Interest expense", "20"], ["Tax rate", "25%"],
             ["Capital expenditures", "60"], ["Increase in working capital", "10"], ["Net borrowing", "15"]] }],

  ["a", "Using Exhibit 1 for Orchid Logistics, free cash flow to equity (FCFE) is closest to:",
    "USD50 million", "USD65 million", "USD35 million", "A",
    "FCFE = FCFF 50 − after-tax interest 15 + net borrowing 15 = 50.",
    "B forgets to deduct after-tax interest. C forgets to add net borrowing.",
    "", "", "Vol 4 LM 5",
    { title: "Exhibit 1", subtitle: "Orchid Logistics — 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["FCFF", "50"], ["Interest expense", "20"], ["Tax rate", "25%"], ["Net borrowing", "15"]] }],

  ["a", "Based on Exhibit 1 for Kite Media, a fictitious company, the debt coverage ratio (CFO / total debt) is:",
    "0.30", "3.00", "0.10", "A",
    "90 / 300 = 0.30. The reinvestment ratio (CFO / capex) would be 3.0.",
    "B is the reinvestment ratio. C divides capex by debt.",
    "", "", "Vol 4 LM 5",
    { title: "Exhibit 1", subtitle: "Kite Media — 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Cash flow from operations", "90"], ["Capital expenditures", "30"], ["Total debt", "300"]] }]
]);

addQ27("FSA-11", [
  ["a", "Based on Exhibit 1 for Nam Pharma, a fictitious company, the quick ratio is closest to:",
    "1.67", "0.83", "0.33", "B",
    "Quick ratio = (cash 40 + receivables 60) / current liabilities 120 = 0.83.",
    "A is the current ratio (includes inventory). C is the cash ratio.",
    "", "", "Vol 4 LM 11",
    { title: "Exhibit 1", subtitle: "Nam Pharma — balance sheet extract (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Cash", "40"], ["Accounts receivable", "60"], ["Inventory", "100"], ["Total current liabilities", "120"]] }],

  ["e", "Based on Exhibit 1 for Bamboo Apparel, a fictitious company, the increase in ROE from Year 1 to Year 2 was driven by:",
    "Higher asset turnover and higher financial leverage; net margin unchanged", "A higher net profit margin only", "Lower financial leverage", "A",
    "Year 1: 5% × 1.2 × 2.0 = 12%. Year 2: 5% × 1.5 × 2.5 = 18.75%. Margin stayed at 5%; turnover and leverage rose.",
    "B: margin is 5% in both years. C: leverage rose from 2.0 to 2.5.",
    "Break ROE into margin × turnover × leverage before concluding.", "", "Vol 4 LM 11",
    { title: "Exhibit 1", subtitle: "Bamboo Apparel (USD millions)",
      head: ["Item", "Year 1", "Year 2"],
      rows: [["Revenue", "480", "600"], ["Net income", "24", "30"], ["Average total assets", "400", "400"], ["Average shareholders' equity", "200", "160"]] }],

  ["a", "Based on Exhibit 1 for Coral Electronics, a fictitious company, the cash conversion cycle is closest to:",
    "130 days", "70 days", "50 days", "B",
    "DSO = 80/730 × 365 = 40; DIO = 72/438 × 365 = 60; DPO = 36/438 × 365 = 30. CCC = 40 + 60 − 30 = 70 days.",
    "A adds DPO. C subtracts DIO instead of DPO.",
    "", "", "Vol 4 LM 11",
    { title: "Exhibit 1", subtitle: "Coral Electronics — 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Revenue", "730"], ["Cost of goods sold", "438"], ["Accounts receivable", "80"], ["Inventory", "72"], ["Accounts payable", "36"]],
      note: "Use year-end balances and a 365-day year; assume purchases ≈ COGS." }]
]);

addQ27("FSA-06", [
  ["a", "Based on Exhibit 1 for River Hardware, a fictitious company that uses FIFO, ending inventory is closest to:",
    "USD2,100", "USD1,600", "USD1,838", "A",
    "250 units sold leave 150 units: under FIFO the newest remain — 100 × 15 + 50 × 12 = 2,100.",
    "B is LIFO ending inventory (oldest units remain: 100 × 10 + 50 × 12). C uses weighted average cost (150 × 12.25).",
    "", "", "Vol 4 LM 6",
    { title: "Exhibit 1", subtitle: "River Hardware — inventory activity",
      head: ["Item", "Units", "Cost per unit (USD)"],
      rows: [["Beginning inventory", "100", "10"], ["Purchase 1", "200", "12"], ["Purchase 2", "100", "15"], ["Units sold", "250", ""]] }],

  ["e", "Using Exhibit 1 for River Hardware, if prices keep rising, switching from FIFO to weighted average cost would most likely:",
    "Increase COGS and decrease gross profit", "Decrease COGS", "Have no effect on COGS", "A",
    "FIFO COGS = 2,800; weighted average COGS = 250 × 12.25 = 3,062.5. Higher COGS → lower gross profit.",
    "B and C ignore rising unit costs.",
    "", "", "Vol 4 LM 6",
    { title: "Exhibit 1", subtitle: "River Hardware — inventory activity",
      head: ["Item", "Units", "Cost per unit (USD)"],
      rows: [["Beginning inventory", "100", "10"], ["Purchase 1", "200", "12"], ["Purchase 2", "100", "15"], ["Units sold", "250", ""]] }]
]);

addQ27("FSA-09", [
  ["e", "Based on Exhibit 1 for Pearl Shipping, a fictitious company with a 25% tax rate, the net deferred tax position is:",
    "Net deferred tax liability of USD12.5 million", "Net deferred tax asset of USD12.5 million", "Net deferred tax liability of USD20.0 million", "A",
    "Equipment: carrying 500 > tax base 420 → DTL = 80 × 25% = 20. Warranty provision (liability): carrying 30 > tax base 0 → DTA = 7.5. Net DTL = 12.5.",
    "B reverses the sign. C ignores the deferred tax asset.",
    "Asset carrying > tax base → DTL. Liability carrying > tax base → DTA.", "", "Vol 4 LM 9",
    { title: "Exhibit 1", subtitle: "Pearl Shipping — 31 Dec 2026 (USD millions)",
      head: ["Item", "Carrying amount", "Tax base"],
      rows: [["Equipment (asset)", "500", "420"], ["Warranty provision (liability)", "30", "0"]] }]
]);

addQ27("FSA-07", [
  ["a", "Based on Exhibit 1 for Lantern Mining, a fictitious company, year-1 depreciation under the units-of-production method is:",
    "USD200", "USD300", "USD450", "B",
    "Depreciable base 900 − 100 = 800; per unit 800/8,000 = 0.10; year 1: 3,000 × 0.10 = 300.",
    "A is straight-line (800/4). C is double-declining balance (900 × 50%).",
    "", "", "Vol 4 LM 7",
    { title: "Exhibit 1", subtitle: "Lantern Mining — new machine",
      head: ["Item", "Amount"],
      rows: [["Cost (USD)", "900"], ["Salvage value (USD)", "100"], ["Useful life (years)", "4"], ["Expected total production (units)", "8,000"], ["Year 1 production (units)", "3,000"]] }]
]);

addQ27("FSA-02", [
  ["a", "Based on Exhibit 1 for Lily Cosmetics, a fictitious company, net income and the operating margin are:",
    "USD120 million and 20%", "USD160 million and 20%", "USD120 million and 16%", "A",
    "Operating income = 1,000 − 600 − 150 − 50 = 200 (20%). Pre-tax = 200 − 40 = 160; NI = 160 × 0.75 = 120.",
    "B forgets tax. C confuses pre-tax margin (16%) with operating margin.",
    "", "", "Vol 4 LM 2",
    { title: "Exhibit 1", subtitle: "Lily Cosmetics — 2026 (USD millions)",
      head: ["Item", "Amount"],
      rows: [["Revenue", "1,000"], ["Cost of goods sold", "600"], ["Selling, general and administrative", "150"], ["Depreciation", "50"], ["Interest expense", "40"], ["Tax rate", "25%"]] }]
]);

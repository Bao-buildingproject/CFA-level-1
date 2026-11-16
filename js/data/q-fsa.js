// Financial Statement Analysis — original practice questions
addQ("FSA-01", [
  ["f", "The main purpose of financial statement analysis is to:", "Use financial information to support economic decisions", "Prepare financial statements for a company", "Audit a company's accounts", "A",
    "Analysts evaluate past performance and position to make decisions such as investing or lending.", "B is the company's job. C is the auditor's job.", ""],
  ["a", "An auditor issues an unmodified (unqualified) opinion. This means the auditor believes the statements:", "Are presented fairly in accordance with the applicable standards", "Contain no errors of any size", "Prove the company is a good investment", "A",
    "Audits give reasonable — not absolute — assurance about material misstatement.", "B: small errors may exist. C: an audit opinion isn't an investment opinion.", ""],
  ["f", "Management's discussion of results, trends and risks is mainly found in the:", "MD&A (management commentary)", "Auditor's report", "Statement of cash flows", "A",
    "MD&A explains the numbers from management's perspective; it is generally not audited.", "", ""],
  ["a", "Which statement shows changes in retained earnings, share capital and other comprehensive income over the period?", "Statement of changes in equity", "Income statement", "Balance sheet", "A",
    "It reconciles beginning and ending equity.", "", ""]
]);

addQ("FSA-02", [
  ["f", "A company receives cash today for services it will perform next year. Today it records the cash and:", "Revenue", "Unearned revenue (a liability)", "Accounts receivable", "B",
    "Revenue is recognized when the performance obligation is satisfied; until then the firm owes the service.", "A isn't earned yet. C means cash is owed TO the firm.", ""],
  ["a", "Under IFRS 15 / ASC 606, revenue is recognized:", "When (or as) a performance obligation is satisfied", "When cash is received", "When a contract is signed", "A",
    "The five-step model ends with recognizing revenue as control of goods or services transfers.", "B is cash-basis accounting. C is too early.", ""],
  ["a", "Net income is 1,000, preferred dividends are 100 and the weighted average number of common shares is 300. Basic EPS is:", "3.33", "3.00", "2.86", "B",
    "Basic EPS = (NI − preferred dividends) / weighted shares = 900 / 300 = 3.00.", "A forgets preferred dividends. C is diluted EPS if the preferred converts into 50 shares.", ""],
  ["e", "Net income 1,000; preferred dividends 100; 300 common shares. The preferred shares are convertible into 50 common shares. Diluted EPS is closest to:", "3.00", "2.86", "3.33", "B",
    "If converted, no preferred dividend is paid: 1,000 / (300 + 50) = 2.86 < 3.00, so the conversion is dilutive.", "A is basic EPS. C ignores the new shares.", "Only include securities that are dilutive."],
  ["f", "Results of a discontinued operation are reported on the income statement:", "Separately, net of tax, below income from continuing operations", "Within operating expenses", "Only in the notes", "A",
    "Separating them helps analysts forecast the continuing business.", "", ""]
]);

addQ("FSA-03", [
  ["f", "A liability that must be settled within one year (or the operating cycle) is classified as:", "Current", "Non-current", "Contingent", "A",
    "Current = due within 12 months or one operating cycle.", "", ""],
  ["a", "A company pays 500 to acquire a firm whose identifiable net assets have a fair value of 400. Goodwill recognized is:", "0", "100", "500", "B",
    "Goodwill = purchase price − fair value of identifiable net assets = 100.", "", ""],
  ["a", "Unrealized gains on debt securities measured at fair value through other comprehensive income (FVOCI) are reported in:", "Net income", "Other comprehensive income", "Retained earnings directly", "B",
    "FVOCI gains bypass net income and go to OCI until the asset is sold.", "A applies to FVPL assets.", ""],
  ["e", "When a company buys back its own shares and holds them as treasury shares, total shareholders' equity:", "Increases", "Decreases", "Is unchanged", "B",
    "Treasury shares are a deduction from equity; cash also falls.", "", ""]
]);

addQ("FSA-04", [
  ["f", "Under US GAAP, interest PAID is classified as:", "Operating", "Investing", "Financing", "A",
    "US GAAP requires operating classification.", "C is allowed under IFRS.", "IFRS offers a choice; US GAAP does not."],
  ["a", "Net income 100; depreciation 20; accounts receivable rose 15; accounts payable rose 10. Cash flow from operations (indirect method) is:", "115", "145", "95", "A",
    "CFO = 100 + 20 − 15 + 10 = 115. A rise in receivables uses cash; a rise in payables provides cash.", "B adds the receivables increase. C subtracts payables.", ""],
  ["f", "Buying new equipment for cash is reported in cash flow from:", "Operating activities", "Investing activities", "Financing activities", "B",
    "Purchases and sales of long-term assets are investing activities.", "", ""],
  ["e", "Using the indirect method, a gain on the sale of equipment is:", "Subtracted from net income", "Added to net income", "Ignored", "A",
    "The gain is in net income but the cash proceeds belong to investing activities, so it is removed from CFO.", "", ""]
]);

addQ("FSA-05", [
  ["a", "CFO is 500, interest paid is 50, the tax rate is 30% and capital expenditures are 200. Free cash flow to the firm (FCFF) is:", "300", "335", "350", "B",
    "FCFF = CFO + Int(1 − t) − FCInv = 500 + 35 − 200 = 335.", "A ignores interest. C adds interest before tax.", ""],
  ["a", "CFO is 500, capital expenditures are 200 and net borrowing is +40. Free cash flow to equity (FCFE) is:", "260", "300", "340", "C",
    "FCFE = CFO − FCInv + net borrowing = 500 − 200 + 40 = 340.", "A subtracts borrowing. B ignores it.", ""],
  ["e", "Which ratio measures a company's ability to repay its debt from operating cash flow?", "CFO / total debt", "CFO / revenue", "Net income / total assets", "A",
    "The debt coverage ratio compares cash generated to debt owed.", "B is cash flow to revenue. C is ROA.", ""],
  ["f", "In a common-size cash flow statement, each item is commonly expressed as a percentage of:", "Revenue", "Total assets", "Shareholders' equity", "A",
    "Revenue-based common-sizing shows cash generated per unit of sales.", "", ""]
]);

addQ("FSA-06", [
  ["e", "During rising prices, compared with FIFO, a company using LIFO reports:", "Higher gross profit", "Lower ending inventory", "Higher income taxes", "B",
    "LIFO expenses the newest (expensive) units; the oldest (cheap) units remain in inventory.", "A: COGS is higher, so gross profit is lower. C: lower profit means lower taxes.", "LIFO is not allowed under IFRS."],
  ["a", "Under IFRS, inventory with a cost of 100 has a net realizable value of 90. The company should:", "Keep it at 100", "Write it down to 90 and recognize a loss of 10", "Write it up to 110", "B",
    "Inventory is measured at the lower of cost and net realizable value.", "", "IFRS allows reversals of earlier write-downs (up to original cost)."],
  ["a", "A firm buys 100 units at 10 and 100 units at 14, then sells 150 units. Under weighted average cost, COGS is:", "1,500", "1,800", "2,100", "B",
    "Average cost = 2,400 / 200 = 12; COGS = 150 × 12 = 1,800.", "A uses the oldest price. C uses the newest price.", ""],
  ["a", "COGS is 1,200 and average inventory is 300. Days of inventory on hand is closest to:", "4 days", "91 days", "45 days", "B",
    "Turnover = 1,200/300 = 4; DOH = 365/4 = 91.25 days.", "A is the turnover ratio itself.", ""]
]);

addQ("FSA-07", [
  ["a", "Equipment costs 100,000, salvage 10,000, life 5 years. Annual straight-line depreciation is:", "20,000", "18,000", "22,000", "B",
    "(100,000 − 10,000)/5 = 18,000.", "A ignores salvage. C adds it.", ""],
  ["a", "Same asset (cost 100,000, life 5 years) using double-declining balance. Year 1 depreciation is:", "20,000", "36,000", "40,000", "C",
    "DDB rate = 2/5 = 40% of the beginning book value: 40,000. Salvage is ignored until the end.", "A is straight-line without salvage. B wrongly applies the rate to cost minus salvage.", ""],
  ["e", "Compared with expensing a cost, capitalizing it results in:", "Higher CFO and lower investing cash flow in the year incurred", "Lower net income in the year incurred", "Lower total assets", "A",
    "A capitalized cost is an investing outflow, not an operating one; it also raises current-year income and assets.", "B and C are reversed.", ""],
  ["e", "Under IFRS, an asset's carrying amount is 500. Fair value less costs to sell is 420 and value in use is 450. The impairment loss is:", "0", "50", "80", "B",
    "Recoverable amount = higher of 420 and 450 = 450. Loss = 500 − 450 = 50.", "C uses the lower value instead of the higher.", ""],
  ["f", "Under IFRS, research costs are:", "Expensed as incurred", "Always capitalized", "Capitalized only if successful", "A",
    "Research is expensed; development costs may be capitalized once criteria are met.", "", ""]
]);

addQ("FSA-08", [
  ["a", "A bond with face 100 and a 5% coupon is issued at 95 when the market rate is 6%. First-year interest expense (effective interest method) is closest to:", "5.00", "5.70", "6.00", "B",
    "Interest expense = carrying amount × market rate = 95 × 6% = 5.70. The excess over the coupon amortizes the discount.", "A is the coupon paid. C applies 6% to face value.", ""],
  ["a", "Under IFRS 16, a lessee recognizes for most leases:", "A right-of-use asset and a lease liability", "Only a lease expense", "Only a lease liability", "A",
    "Almost all leases now appear on the lessee's balance sheet.", "", ""],
  ["e", "A defined benefit plan has assets of 800 and a benefit obligation of 1,000. The balance sheet shows:", "A net pension liability of 200", "A net pension asset of 200", "Nothing", "A",
    "Funded status = assets − obligation = −200 → underfunded → net liability.", "", ""],
  ["f", "Under US GAAP, a lessee with an operating lease reports on the income statement:", "A single, straight-line lease cost", "Depreciation and interest expense separately", "No expense", "A",
    "Operating lease cost is straight-line; finance leases show depreciation and interest separately.", "", ""]
]);

addQ("FSA-09", [
  ["a", "A company uses faster depreciation for tax than for its financial statements. This creates a:", "Deferred tax liability", "Deferred tax asset", "Permanent difference", "A",
    "Taxable income is lower now than accounting income, so more tax will be paid later.", "", ""],
  ["a", "An asset's carrying amount is 100 and its tax base is 80. With a 25% tax rate, the deferred tax liability is:", "5", "20", "25", "A",
    "DTL = (100 − 80) × 25% = 5.", "B is the temporary difference itself.", ""],
  ["e", "Under US GAAP, a valuation allowance is recorded when:", "It is more likely than not that some deferred tax assets won't be realized", "Deferred tax liabilities exceed assets", "Tax rates rise", "A",
    "The allowance reduces DTAs to the amount expected to be used.", "", ""],
  ["f", "A permanent difference between taxable and accounting income:", "Does not create deferred tax", "Creates a deferred tax liability", "Creates a deferred tax asset", "A",
    "Permanent differences never reverse, so they affect the effective tax rate but not deferred taxes.", "", ""]
]);

addQ("FSA-10", [
  ["f", "Aggressive accounting choices typically:", "Increase current reported earnings", "Decrease current reported earnings", "Have no effect on earnings", "A",
    "Aggressive choices pull income forward or push expenses into the future.", "", ""],
  ["a", "Which is a warning sign of possible revenue manipulation?", "Receivables growing much faster than revenue", "Stable days sales outstanding", "Inventory growing in line with sales", "A",
    "It may signal channel stuffing or recognizing revenue too early.", "", ""],
  ["a", "A new CEO records very large restructuring charges in her first year, making later years look better. This is called a:", "Big bath", "Cookie jar reserve release", "Channel stuffing", "A",
    "Taking excessive charges now lowers future expenses.", "", ""],
  ["e", "Net income is persistently much higher than cash flow from operations. This most likely indicates:", "Lower earnings quality", "Higher earnings quality", "Conservative accounting", "A",
    "Large accruals are less persistent and can signal earnings management.", "", ""]
]);

addQ("FSA-11", [
  ["a", "Current assets 500 (cash 100, receivables 150, inventory 250); current liabilities 250. The quick ratio is:", "2.0", "1.0", "0.4", "B",
    "(100 + 150)/250 = 1.0. Inventory is excluded.", "A is the current ratio. C is the cash ratio.", ""],
  ["e", "Net margin 5%, asset turnover 2.0, assets/equity 1.5. ROE is:", "15.0%", "10.0%", "7.5%", "A",
    "ROE = 5% × 2.0 × 1.5 = 15%.", "B is ROA. C omits asset turnover.", "Leverage boosts ROE but adds risk."],
  ["a", "EBIT is 600 and interest expense is 150. The interest coverage ratio is:", "4.0×", "0.25×", "3.0×", "A",
    "600/150 = 4.0.", "B is inverted.", ""],
  ["a", "Total debt is 400 and total equity is 600. The debt-to-equity ratio is:", "0.40", "0.67", "1.50", "B",
    "400/600 = 0.67.", "A is debt/(debt + equity). C is equity/debt.", ""],
  ["e", "Inventory turnover is 8. Days of inventory on hand is closest to:", "8 days", "46 days", "91 days", "B",
    "365/8 = 45.6 days.", "", ""]
]);

addQ("FSA-12", [
  ["a", "Revenue is forecast at 1,100 and the gross margin is expected to be 40%. Forecast COGS is:", "440", "660", "1,100", "B",
    "COGS = revenue × (1 − gross margin) = 1,100 × 60% = 660.", "A is gross profit.", ""],
  ["f", "A common way to forecast revenue in a top-down approach is to:", "Link growth to GDP or industry growth", "Assume revenue is constant", "Use last year's net income", "A",
    "Top-down starts with the economy/industry and estimates market share.", "", ""],
  ["e", "A firm with mostly fixed operating costs will see operating income that is:", "More sensitive to changes in revenue", "Less sensitive to changes in revenue", "Unaffected by revenue", "A",
    "High operating leverage magnifies the effect of revenue changes on EBIT.", "", ""],
  ["f", "Testing a forecast under bull, base and bear assumptions is called:", "Scenario analysis", "Regression analysis", "Common-size analysis", "A",
    "Scenarios show the range of possible outcomes.", "", ""]
]);

// ---- Added to cover remaining LOS (SchweserNotes Book 2) ----
addQ("FSA-01", [
  ["f", "What is usually the FIRST step of a financial statement analysis project?", "State the purpose and context of the analysis", "Calculate ratios", "Write the conclusions", "A",
    "You first decide what question you're answering (e.g. lend or not?), then collect and process data, analyze, conclude and follow up.", "", "", "", "LOS 27.a"],
  ["a", "In the US, a company's annual report filed with the securities regulator that includes audited statements is the:", "Form 10-K", "Form 10-Q", "Proxy statement", "A",
    "10-Q is the quarterly report; the proxy statement covers matters for shareholder votes, such as executive pay.", "", "", "", "LOS 27.c"]
]);

addQ("FSA-02", [
  ["f", "Recording the cost of goods sold in the same period as the related revenue follows the:", "Matching principle", "Going-concern assumption", "Historical cost principle", "A",
    "Expenses are recognized when the related revenue is recognized.", "", "", "", "LOS 28.b"],
  ["a", "A company changes its accounting policy (not an estimate). Under IFRS and US GAAP the change is generally applied:", "Retrospectively, restating prior periods", "Only to future periods", "Only in the notes, without restating", "A",
    "Retrospective application keeps periods comparable. Changes in ESTIMATES are applied prospectively.", "", "Policy change → retrospective; estimate change → prospective.", "", "LOS 28.c"],
  ["a", "In a common-size income statement, each line item is shown as a percentage of:", "Revenue", "Total assets", "Net income", "A",
    "It makes companies of different sizes comparable and shows cost structure.", "", "", "", "LOS 28.e"]
]);

addQ("FSA-03", [
  ["a", "Under IFRS, costs of developing an internally generated brand are:", "Expensed as incurred", "Capitalized as an intangible asset", "Recorded as goodwill", "A",
    "Internally generated brands and goodwill can't be capitalized; purchased intangibles can.", "", "", "", "LOS 29.a"],
  ["a", "In a common-size balance sheet, each item is expressed as a percentage of:", "Total assets", "Revenue", "Shareholders' equity", "A",
    "Vertical common-sizing divides by total assets.", "", "", "", "LOS 29.e"]
]);

addQ("FSA-04", [
  ["a", "Revenue is 1,000 and accounts receivable increased by 50 during the year. Cash collected from customers is:", "1,050", "950", "1,000", "B",
    "Cash collected = revenue − increase in receivables = 950. Part of the sales hasn't been collected yet.", "A adds the increase. C ignores it.", "", "", "LOS 30.c"],
  ["e", "Under IFRS, dividends RECEIVED may be classified as:", "Operating or investing cash flow", "Financing only", "Operating only", "A",
    "IFRS allows a choice; US GAAP requires operating.", "", "", "", "LOS 30.d"],
  ["f", "The statement of cash flows links the income statement and balance sheet because it:", "Explains the change in cash between two balance sheet dates", "Replaces the income statement", "Shows only non-cash items", "A",
    "Net income and balance sheet changes are reconciled to the change in cash.", "", "", "", "LOS 30.a"]
]);

addQ("FSA-06", [
  ["f", "A company's inventory note should disclose:", "The cost formula used (e.g. FIFO) and any write-downs", "Only the auditor's name", "Its share price", "A",
    "Disclosures help analysts compare companies using different methods.", "", "", "", "LOS 32.c"]
]);

addQ("FSA-07", [
  ["a", "A machine with a carrying amount of 30 is sold for 35. The company reports:", "A gain of 5", "A loss of 5", "Revenue of 35", "A",
    "Gain on derecognition = proceeds − carrying amount = 5. It's not revenue.", "", "", "", "LOS 33.b"],
  ["f", "An intangible asset with an INDEFINITE useful life is:", "Not amortized but tested for impairment at least annually", "Amortized over 40 years", "Expensed immediately", "A",
    "Finite-life intangibles are amortized; indefinite-life ones are tested for impairment.", "", "", "", "LOS 33.a"]
]);

addQ("FSA-08", [
  ["a", "Share-based compensation granted to employees is generally measured at:", "Fair value at the grant date and expensed over the service period", "The share price on the day it vests", "Zero, because no cash is paid", "A",
    "Even though no cash is paid, the award is an expense.", "", "", "", "LOS 34.c"]
]);

addQ("FSA-09", [
  ["a", "Pre-tax income is 1,000 and income tax expense is 250. The statutory rate is 30%. The effective tax rate is:", "25%", "30%", "20%", "A",
    "ETR = tax expense / pre-tax income = 25%. The gap with 30% comes from permanent differences or different rates abroad.", "", "", "", "LOS 35.c"],
  ["f", "Income tax expense on the income statement equals:", "Taxes payable plus the change in deferred taxes", "Taxes payable only", "Pre-tax income × statutory rate always", "A",
    "Expense = current tax (payable) + deferred tax expense (ΔDTL − ΔDTA).", "", "", "", "LOS 35.a"]
]);

addQ("FSA-10", [
  ["a", "Which is a common motivation for management to issue low-quality financial reports?", "Meeting analysts' earnings expectations", "Paying lower audit fees", "Increasing disclosure", "A",
    "Pressure to hit targets, bonuses and debt covenants can motivate manipulation.", "", "", "", "LOS 36.d"],
  ["a", "A company highlights \"adjusted EBITDA\" that excludes many recurring costs. An analyst should:", "Reconcile it to the GAAP/IFRS figure and question the adjustments", "Use it instead of net income", "Ignore all reported numbers", "A",
    "Non-GAAP measures can flatter results; regulators require reconciliation to the nearest standard measure.", "", "", "", "LOS 36.f"],
  ["f", "Which is a mechanism that disciplines financial reporting quality?", "Independent external audits", "Higher executive bonuses", "Fewer disclosures", "A",
    "Auditors, regulators and private contracting (e.g. lenders) all discipline reporting.", "", "", "", "LOS 36.e"]
]);

addQ("FSA-11", [
  ["f", "Same-store sales growth is an industry-specific ratio mainly used for:", "Retailers", "Banks", "Insurance companies", "A",
    "It removes the effect of opening or closing stores.", "", "", "", "LOS 37.e"],
  ["a", "Net income is 50 and average total assets are 500. ROA is:", "10%", "5%", "50%", "A",
    "ROA = 50/500 = 10%.", "", "", "", "LOS 37.b"]
]);

addQ("FSA-12", [
  ["a", "An analyst who sticks too closely to management's guidance when forecasting is most likely showing:", "Anchoring bias", "Conservatism in accounting", "Survivorship bias", "A",
    "Behavioral biases such as anchoring and overconfidence can distort forecasts.", "", "", "", "LOS 38.b"],
  ["e", "When choosing the explicit forecast horizon, an analyst should generally forecast until:", "The company's growth and margins reach a sustainable, steady state", "Exactly one year ahead", "The next earnings release only", "A",
    "After the explicit period, a terminal value assumes steady growth.", "", "", "", "LOS 38.e"]
]);

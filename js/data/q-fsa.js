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

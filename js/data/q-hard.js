// HARD (exam-level and above) — original multi-step questions.
// Every number was re-computed independently before publishing.
// Row: [level, question, A, B, C, answer, why, whyNot, trap, calc, los, exhibit]

// ================= QUANT =================
addQ27("QM-03", [
  ["h", "An investor puts 1,000 into a fund. After one year the account is worth 1,100 and she adds 500. At the end of year 2 the account is worth 1,750. Which statement is MOST accurate?",
    "MWR ≈ 9.63% is slightly below the annualized TWR ≈ 9.69%", "MWR ≈ 9.69% is slightly above the annualized TWR ≈ 9.63%", "MWR and TWR both equal about 20.3%", "A",
    "TWR: 1.10 × (1,750/1,600) = 1.2031 → √1.2031 − 1 = 9.69%. MWR solves −1,000 − 500/(1+r) + 1,750/(1+r)² = 0 → 9.63%. More money was invested in year 2, which earned only 9.375%, so MWR < TWR.",
    "B swaps the two results. C is the 2-year cumulative TWR, not an annual rate.",
    "Compare the sub-period returns: money added before the weaker period pulls MWR down.", "CF0=−1000, C01=−500, C02=1750 → IRR = 9.63", "Vol 1 LM 3"]
]);
addQ27("QM-01", [
  ["h", "A stock rises from 40 to 46 over 9 months. Its annualized continuously compounded return is closest to:",
    "13.98%", "18.63%", "20.00%", "B",
    "ln(46/40) = 13.98% for 9 months; annualize by × 12/9 → 18.63% (cc returns scale linearly with time).",
    "A is not annualized. C annualizes the simple 15% HPR linearly.",
    "Continuously compounded returns are additive, so annualize by multiplying.", "46 ÷ 40 = LN → 0.13976 × 12 ÷ 9", "Vol 1 LM 1"]
]);
addQ27("QM-04", [
  ["h", "An investor deposits 5,000 at the BEGINNING of each year for 10 years into an account earning 6% annually. The balance at the end of year 10 is closest to:",
    "65,904", "69,858", "74,050", "B",
    "Annuity due: FV = 5,000 × [(1.06¹⁰ − 1)/0.06] × 1.06 = 69,858.",
    "A treats deposits as end-of-year (ordinary annuity). C compounds one extra year.",
    "Beginning-of-period payments → BGN mode (or multiply the ordinary result by 1 + r).", "2ND BGN; N=10, I/Y=6, PMT=−5000, PV=0, CPT FV", "Vol 1 LM 4"],
  ["h", "A 200,000 mortgage is repaid with level monthly payments over 30 years at 6% annual interest, compounded monthly. The principal repaid in the FIRST payment is closest to:",
    "199.10", "1,000.00", "1,199.10", "A",
    "Payment = 1,199.10 (N=360, I/Y=0.5). Interest in month 1 = 200,000 × 0.5% = 1,000; principal = 199.10.",
    "B is the interest part. C is the whole payment.",
    "Early payments are mostly interest.", "N=360, I/Y=0.5, PV=200000, FV=0 → PMT = −1,199.10", "Vol 1 LM 4"]
]);
addQ27("QM-06", [
  ["h", "Based on Exhibit 1, the covariance between the returns of X and Y (in %²) is closest to:",
    "52", "115", "26", "A",
    "E(X) = 9, E(Y) = 7. Cov = 0.3(11)(8) + 0.5(1)(−2) + 0.2(−19)(−7) = 26.4 − 1 + 26.6 = 52.",
    "B is E(XY) without subtracting E(X)E(Y) = 63. C is half the correct value.",
    "", "", "Vol 1 LM 6",
    { title: "Exhibit 1", subtitle: "Scenario returns (%)", head: ["Scenario", "Probability", "Return X", "Return Y"],
      rows: [["Boom", "0.30", "20", "15"], ["Normal", "0.50", "10", "5"], ["Recession", "0.20", "−10", "0"]] }]
]);
addQ27("QM-07", [
  ["h", "A sample of 25 monthly returns has a mean of 1.5% and a sample standard deviation of 4%. Testing H₀: μ ≤ 0 vs Hₐ: μ > 0 at 5% (critical t with 24 df: one-tailed 1.711, two-tailed 2.064), the analyst should:",
    "Reject H₀ because t = 1.875 > 1.711", "Fail to reject H₀ because t = 1.875 < 2.064", "Fail to reject H₀ because t = 0.375", "A",
    "SE = 4%/√25 = 0.8%; t = 1.5/0.8 = 1.875 > 1.711 (one-tailed test).",
    "B uses the two-tailed critical value for a one-tailed hypothesis. C forgets to divide by √n.",
    "Read Hₐ carefully: \">\" means one-tailed.", "", "Vol 1 LM 7"]
]);
addQ27("QM-10", [
  ["h", "A simple regression with 22 observations has a regression sum of squares of 64 and a sum of squared errors of 36. The F-statistic is closest to:",
    "1.78", "35.56", "64.00", "B",
    "MSR = 64/1; MSE = 36/(22 − 2) = 1.8. F = 64/1.8 = 35.56. (R² = 0.64; SEE = √1.8 = 1.34.)",
    "A divides SSR by SSE. C forgets to divide by MSE.",
    "Degrees of freedom: regression k = 1, error n − 2.", "", "Vol 1 LM 10"]
]);
addQ27("QM-08", [
  ["h", "A portfolio is 70% in asset A (σ = 18%) and 30% in asset B (σ = 10%). The correlation is 0.3. Portfolio standard deviation is closest to:",
    "15.60%", "13.80%", "12.95%", "B",
    "σ² = 0.49(0.0324) + 0.09(0.01) + 2(0.7)(0.3)(0.3)(0.18)(0.10) = 0.019044 → σ = 13.80%.",
    "A is the weighted average (correlation = +1). C drops the covariance term (correlation = 0).",
    "", "", "Vol 1 LM 8"]
]);

// ================= ECONOMICS =================
addQ27("ECO-08", [
  ["h", "Spot = 1.0850 USD per EUR. Annual interest rates: USD 5%, EUR 3% (actual/360). The 180-day forward points (×10,000) are closest to:",
    "+107", "−107", "+211", "A",
    "F = 1.0850 × (1 + 0.05 × 180/360)/(1 + 0.03 × 180/360) = 1.0957 → +107 pips.",
    "B has the wrong sign: the lower-rate currency (EUR) trades at a forward premium. C uses full-year rates instead of 180 days.",
    "Always scale rates by days/360 for periods under a year.", "", "Vol 2 LM 8"]
]);
addQ27("ECO-06", [
  ["h", "A small country faces a world price of 10. Domestic demand: Qd = 100 − 4P; supply: Qs = 6P − 20. It imposes a tariff of 2 per unit. The deadweight loss is closest to:",
    "8", "12", "20", "C",
    "At P = 10: Qd 60, Qs 40. At P = 12: Qd 52, Qs 52 — imports stop. DWL = ½ × 2 × (52 − 40) + ½ × 2 × (60 − 52) = 12 + 8 = 20.",
    "A is only the consumption loss. B is only the production loss.",
    "A tariff high enough can eliminate imports — then there is no tariff revenue.", "", "Vol 2 LM 6"]
]);
addQ27("ECO-01", [
  ["h", "A monopolist faces demand P = 100 − 2Q and constant marginal cost of 20. Its profit-maximizing price and quantity are:",
    "P = 60, Q = 20", "P = 20, Q = 40", "P = 50, Q = 25", "A",
    "MR = 100 − 4Q. Set MR = MC: 100 − 4Q = 20 → Q = 20; P = 100 − 40 = 60.",
    "B is the perfectly competitive outcome (P = MC). C sets MR = 0 (revenue maximization).",
    "", "", "Vol 2 LM 1"]
]);
addQ27("ECO-04", [
  ["h", "The neutral real rate is 1.5%, expected inflation and the inflation target are both 3%, and the policy rate is 5%. Policy is best described as:",
    "Contractionary, because 5% exceeds the neutral nominal rate of 4.5%", "Expansionary, because the real policy rate is positive", "Neutral, because inflation is on target", "A",
    "Neutral nominal rate = 1.5% + 3% = 4.5%. A 5% policy rate is above neutral.",
    "B: a positive real rate is not the test — compare with neutral. C ignores where the policy rate sits.",
    "", "", "Vol 2 LM 4"]
]);

// ================= FSA =================
addQ27("FSA-02", [
  ["h", "Net income is 1,200 and 1,000 common shares are outstanding all year. There are 100 options with an exercise price of 20; the average share price was 25. Diluted EPS is closest to:",
    "1.20", "1.18", "1.09", "B",
    "Treasury stock method: proceeds 2,000 buy back 80 shares at 25 → net new shares 20. Diluted EPS = 1,200/1,020 = 1.18.",
    "A is basic EPS. C adds all 100 option shares without the buyback.",
    "Options are dilutive only if the average price exceeds the exercise price.", "", "Vol 4 LM 2"],
  ["h", "Net income 500; 200 common shares. Convertible bonds paid interest of 40 and convert into 50 shares; tax rate 25%. Diluted EPS is closest to:",
    "2.50", "2.16", "2.12", "C",
    "If-converted: add after-tax interest 40 × 0.75 = 30 → (500 + 30)/(200 + 50) = 2.12 < 2.50, so dilutive.",
    "A is basic EPS. B adds back pre-tax interest.",
    "Add back AFTER-tax interest for convertible debt.", "", "Vol 4 LM 2"]
]);
addQ27("FSA-06", [
  ["h", "A LIFO company reports COGS of 900. Its LIFO reserve rose from 80 to 110 during the year. COGS on a FIFO basis would be:",
    "870", "930", "790", "A",
    "FIFO COGS = LIFO COGS − increase in LIFO reserve = 900 − 30 = 870.",
    "B adds the change. C subtracts the ending reserve instead of the change.",
    "Use the CHANGE in the reserve for COGS; use the ENDING reserve for inventory.", "", "Vol 4 LM 6"]
]);
addQ27("FSA-07", [
  ["h", "Under IFRS (revaluation model), land carried at 1,000 is first revalued to 1,150 and later to 900. The second revaluation results in:",
    "A 150 decrease in OCI (revaluation surplus) and a 100 loss in profit or loss", "A 250 loss in profit or loss", "A 250 decrease in OCI only", "A",
    "The decline first reverses the earlier surplus of 150 through OCI; the remaining 100 below original cost goes to P&L.",
    "B ignores the existing surplus. C puts the part below cost into OCI.",
    "", "", "Vol 4 LM 7"]
]);
addQ27("FSA-08", [
  ["h", "A 5-year, 4% annual-coupon bond with face 1,000 is issued when market yields are 5%. Using the effective interest method, its carrying amount at the end of year 1 is closest to:",
    "956.71", "964.54", "1,000.00", "B",
    "Issue price = 956.71. Interest expense = 956.71 × 5% = 47.84; coupon 40; discount amortization 7.84 → 964.54.",
    "A is the issue price. C ignores the discount.",
    "", "N=5, I/Y=5, PMT=40, FV=1000 → PV = 956.71", "Vol 4 LM 8"]
]);
addQ27("FSA-09", [
  ["h", "A company has taxable temporary differences of 800 creating a DTL of 200 at a 25% rate. The enacted tax rate is cut to 20%. The effect on the current year's income tax expense is:",
    "A decrease of 40", "An increase of 40", "No effect until the differences reverse", "A",
    "DTL is remeasured: 800 × 20% = 160. The 40 reduction lowers tax expense now.",
    "B reverses the direction. C ignores remeasurement at enactment.",
    "Lower tax rate → DTL falls → tax expense falls (DTA falls → expense rises).", "", "Vol 4 LM 9"]
]);
addQ27("FSA-11", [
  ["h", "A company's tax burden is 0.75, interest burden 0.80, EBIT margin 12%, asset turnover 1.25 and leverage (assets/equity) 2.0. Its ROE is closest to:",
    "22.5%", "24.0%", "18.0%", "C",
    "5-way DuPont: 0.75 × 0.80 × 12% × 1.25 × 2.0 = 18.0%.",
    "A omits the interest burden. B omits the tax burden.",
    "", "", "Vol 4 LM 11"]
]);
addQ27("FSA-04", [
  ["h", "Based on Exhibit 1 for Saigon Textiles, a fictitious company, cash flow from operations is closest to:",
    "USD142 million", "USD127 million", "USD166 million", "A",
    "120 + 30 + 8 (loss) + 6 (DTL increase) − 20 (AR) + 10 (inventory decrease) − 12 (AP decrease) = 142. Dividends paid are a financing flow.",
    "B wrongly deducts dividends. C adds the decrease in payables.",
    "Losses are added back; dividends paid never enter CFO under US GAAP.", "", "Vol 4 LM 4",
    { title: "Exhibit 1", subtitle: "Saigon Textiles — 2026 (USD millions)", head: ["Item", "Amount"],
      rows: [["Net income", "120"], ["Depreciation", "30"], ["Loss on sale of machinery", "8"], ["Increase in deferred tax liability", "6"],
             ["Increase in accounts receivable", "20"], ["Decrease in inventory", "10"], ["Decrease in accounts payable", "12"], ["Dividends paid", "15"]] }]
]);

// ================= CORPORATE ISSUERS =================
addQ27("CI-06", [
  ["h", "Debt: book value 500, market value 400, pre-tax cost 6%. Equity: 60 shares at 10 (book 300), cost 11%. Tax rate 30%. WACC using target market-value weights is closest to:",
    "7.91%", "8.28%", "9.00%", "B",
    "Market weights: D 400/1,000 = 40%, E 600/1,000 = 60%. WACC = 0.4 × 6% × 0.7 + 0.6 × 11% = 8.28%.",
    "A uses book debt with market equity. C ignores the tax shield.",
    "Use market values, not book values, for WACC weights.", "", "Vol 3 LM 6"],
  ["h", "An unlevered firm worth 1,000 has a cost of capital of 10%. It issues 400 of debt at 6% and the tax rate is 25%. Under MM with taxes, its cost of equity becomes closest to:",
    "10.00%", "11.71%", "12.29%", "B",
    "V_L = 1,000 + 0.25 × 400 = 1,100; E = 700. r_e = 10% + (10% − 6%)(1 − 0.25)(400/700) = 11.71%.",
    "A ignores leverage. C omits the (1 − t) factor.",
    "", "", "Vol 3 LM 6"]
]);
addQ27("CI-05", [
  ["h", "A project costs 100 and returns 30, 50 and 60 at the end of years 1–3. At a 10% cost of capital, its NPV is closest to:",
    "13.67", "40.00", "16.79", "A",
    "30/1.1 + 50/1.1² + 60/1.1³ − 100 = 27.27 + 41.32 + 45.08 − 100 = 13.67.",
    "B ignores discounting. C is the IRR (16.79%), not NPV.",
    "", "CF0=−100, C01=30, C02=50, C03=60; NPV I=10 → 13.67", "Vol 3 LM 5"]
]);
addQ27("CI-04", [
  ["h", "A firm has a 10 million credit line. It borrows 8 million for a year at 6% and pays a 0.5% commitment fee on the unused amount. Its effective annual cost of borrowing is closest to:",
    "6.000%", "6.125%", "6.250%", "B",
    "Interest 480,000 + fee 0.5% × 2,000,000 = 10,000 → 490,000 / 8,000,000 = 6.125%.",
    "A ignores the fee. C charges the fee on the whole line.",
    "", "", "Vol 3 LM 4"]
]);

// ================= EQUITY =================
addQ27("EQ-06", [
  ["h", "D₀ = 1.00. Dividends grow 15% for 3 years, then 5% forever. Required return is 11%. The intrinsic value today is closest to:",
    "22.68", "26.62", "17.50", "A",
    "D₁–D₃ = 1.150, 1.3225, 1.5209. P₃ = 1.5209 × 1.05/0.06 = 26.62. V₀ = PV(dividends) + 26.62/1.11³ = 22.68.",
    "B is P₃ not discounted to today. C applies 5% growth from today.",
    "Terminal value at t = 3 uses D₄ and must be discounted 3 years.", "", "Vol 5 LM 6"],
  ["h", "A firm has ROE of 12% and a dividend payout ratio of 40%. Next year's EPS is 4.00 and the required return is 10%. Using sustainable growth, the stock's value is closest to:",
    "57.14", "16.00", "32.00", "A",
    "g = ROE × retention = 12% × 0.6 = 7.2%. D₁ = 4 × 0.4 = 1.60. V = 1.60/(0.10 − 0.072) = 57.14.",
    "B divides by r only. C assumes g = 5%.",
    "", "", "Vol 5 LM 6"]
]);
addQ27("EQ-07", [
  ["h", "A company's sustainable ROE is 15%, growth is 5% and the required return is 10%. Its justified price-to-book ratio is:",
    "1.5", "2.0", "3.0", "B",
    "Justified P/B = (ROE − g)/(r − g) = 0.10/0.05 = 2.0.",
    "A uses ROE/r. C uses ROE/g.",
    "", "", "Vol 5 LM 7"]
]);
addQ27("EQ-03", [
  ["h", "An investor buys 200 shares at 40 with 50% initial margin; the call money rate is 6% a year. She receives a dividend of 1 per share and sells after one year at 44. Her return on equity is closest to:",
    "20.0%", "19.0%", "12.5%", "B",
    "Equity 4,000; loan 4,000 → interest 240. Gain 800 + dividends 200 − interest 240 = 760 → 760/4,000 = 19%.",
    "A ignores dividends and interest. C is the unlevered return.",
    "", "", "Vol 5 LM 3"]
]);
addQ27("EQ-12", [
  ["h", "An analyst forecasts a 13% return for a stock with beta 1.4. Rf = 3% and the equity risk premium is 6%. The stock is:",
    "Undervalued, alpha +1.6%", "Overvalued, alpha −1.6%", "Fairly valued", "A",
    "Required = 3% + 1.4 × 6% = 11.4%. Expected 13% > required → positive alpha of 1.6%.",
    "B reverses the sign.",
    "", "", "Vol 5 LM 12"]
]);

// ================= FIXED INCOME =================
addQ27("FI-06", [
  ["h", "A bond with a 5% annual coupon (face 100) has 3 years to maturity at the last coupon date. It yields 4%, and settlement is 40% of the way through the coupon period. The flat price is closest to:",
    "104.40", "102.40", "102.78", "B",
    "PV at last coupon = 102.78. Full price = 102.78 × 1.04^0.4 = 104.40. Accrued interest = 5 × 0.4 = 2.0. Flat = 102.40.",
    "A is the full (dirty) price. C is the price on the last coupon date.",
    "Quoted (flat) price = full price − accrued interest.", "", "Vol 6 LM 6"]
]);
addQ27("FI-09", [
  ["h", "Spot rates: 1-year 3.0%, 2-year 3.5%, 3-year 4.0%. The one-year rate two years from now (2y1y) is closest to:",
    "4.00%", "4.50%", "5.01%", "C",
    "(1.04)³ = (1.035)² × (1 + f) → f = 1.12486/1.07123 − 1 = 5.01%.",
    "A is the 3-year spot. B is a simple average.",
    "", "", "Vol 6 LM 9"]
]);
addQ27("FI-11", [
  ["h", "A 3-year, 10% annual-coupon bond yields 10%. Its modified duration is closest to:",
    "2.74", "2.49", "3.00", "B",
    "Macaulay duration = 2.7355; modified = 2.7355/1.10 = 2.49.",
    "A is Macaulay duration. C is maturity (true only for a zero).",
    "", "", "Vol 6 LM 11"]
]);
addQ27("FI-12", [
  ["h", "A bond has modified duration 6.5 and convexity 55. If yields FALL by 75 bp, the estimated percentage price change is closest to:",
    "+5.03%", "+4.88%", "+4.72%", "A",
    "−6.5 × (−0.0075) + ½ × 55 × (0.0075)² = 4.875% + 0.155% = +5.03%.",
    "B ignores convexity. C subtracts the convexity term.",
    "Convexity adds to price change whether yields rise or fall.", "", "Vol 6 LM 12"]
]);
addQ27("FI-14", [
  ["h", "A corporate bond has a spread duration of 5. If its credit spread widens by 40 bp while the benchmark yield is unchanged, its price will change by approximately:",
    "−2.0%", "−0.4%", "+2.0%", "A",
    "%ΔP ≈ −spread duration × Δspread = −5 × 0.004 = −2.0%.",
    "B ignores duration. C has the wrong sign.",
    "", "", "Vol 6 LM 14"]
]);
addQ27("FI-08", [
  ["h", "A 180-day bill trades at 98.5 per 100 face. Its bond equivalent yield (365-day add-on) is closest to:",
    "3.00%", "3.05%", "3.09%", "C",
    "BEY = (1.5/98.5) × (365/180) = 3.09%.",
    "A is the discount rate (360-day, based on face). B is the 360-day add-on yield.",
    "", "", "Vol 6 LM 8"]
]);
addQ27("FI-10", [
  ["h", "An investor buys a 3-year, 6% annual-coupon bond at par. One year later (after the first coupon) yields have risen to 7% and she sells. Her 1-year holding period return is closest to:",
    "6.00%", "4.19%", "−1.81%", "B",
    "Sale price (2 years left at 7%) = 98.19. Return = (6 + 98.19 − 100)/100 = 4.19%.",
    "A is the original yield. C ignores the coupon.",
    "", "N=2, I/Y=7, PMT=6, FV=100 → PV = 98.19", "Vol 6 LM 10"]
]);

// ================= DERIVATIVES =================
addQ27("DER-05", [
  ["h", "Six months ago you entered a 1-year long forward at 52 on a non-dividend stock. The stock now trades at 55 and the annual risk-free rate is 4%. The forward's value to you is closest to:",
    "3.00", "4.01", "2.92", "B",
    "V_t = S_t − F₀/(1 + r)^(T−t) = 55 − 52/1.04^0.5 = 55 − 50.99 = 4.01.",
    "A ignores discounting. C discounts the difference S − F₀ instead.",
    "", "", "Vol 7 LM 5"]
]);
addQ27("DER-07", [
  ["h", "Discount factors are 0.97 (1 year) and 0.93 (2 years). The fixed rate on a 2-year annual-pay interest rate swap is closest to:",
    "3.70%", "3.68%", "7.00%", "B",
    "Swap rate = (1 − DF₂)/(DF₁ + DF₂) = 0.07/1.90 = 3.68%.",
    "A is the 2-year spot rate. C is 1 − DF₂, not annualized.",
    "", "", "Vol 7 LM 7"]
]);
addQ27("DER-10", [
  ["h", "A stock at 100 can rise to 125 or fall to 80 in one period; the risk-free rate is 5%. A European put with strike 100 is worth closest to:",
    "8.47", "8.89", "10.00", "A",
    "π_up = (1.05 − 0.80)/(1.25 − 0.80) = 0.5556. Put pays 20 in the down state: (0.4444 × 20)/1.05 = 8.47.",
    "B doesn't discount. C uses 50/50 probabilities without discounting.",
    "", "", "Vol 7 LM 10"]
]);
addQ27("DER-09", [
  ["h", "S = 52, X = 50, PV(X) = 48, European call = 6, European put = 4 (same expiry). An arbitrageur would:",
    "Buy the call and the bond, sell the stock and the put, earning 2", "Buy the stock and the put, sell the call and the bond, earning 2", "Do nothing — parity holds", "A",
    "Protective put S + P = 56; fiduciary call C + PV(X) = 54. Buy the cheaper side (54) and sell the expensive side (56): profit 2.",
    "B buys the expensive side. C: 56 ≠ 54, so parity is violated.",
    "", "", "Vol 7 LM 9"]
]);

// ================= ALTERNATIVES =================
addQ27("ALT-02", [
  ["h", "A fund's high-water mark is 110m. It starts the year at 105m and ends at 125m gross. Management fee: 2% of beginning assets. Incentive: 20% of gains above the high-water mark, after the management fee. The investor's net return is closest to:",
    "14.59%", "13.64%", "17.05%", "A",
    "Mgmt fee = 2.1. Value after fee 122.9; above HWM by 12.9 → incentive 2.58. Net = 125 − 2.1 − 2.58 = 120.32 → 14.59%.",
    "B charges the incentive on all gains above 105 (ignores the HWM). C ignores the incentive fee.",
    "", "", "Vol 8 LM 2"]
]);
addQ27("ALT-04", [
  ["h", "A property's NOI next year is expected to be 2.0 million, growing 2.5% a year. Investors require 9%. Its value is closest to:",
    "22.2 million", "30.8 million", "80.0 million", "B",
    "Implied cap rate = r − g = 6.5%. Value = 2.0/0.065 = 30.8 million.",
    "A ignores growth. C divides by growth only.",
    "", "", "Vol 8 LM 4"]
]);
addQ27("ALT-05", [
  ["h", "Over a year a fully collateralized commodity futures position earns a spot price return of 5% and a roll return of −2%; collateral earns 3%. The total return is closest to:",
    "6%", "8%", "3%", "A",
    "Total = spot 5% + roll (−2%) + collateral 3% = 6%.",
    "B ignores the negative roll. C ignores the spot return.",
    "", "", "Vol 8 LM 5"]
]);

// ================= PORTFOLIO =================
addQ27("PM-01", [
  ["h", "An investor with risk aversion A = 3 uses U = E(R) − 0.5Aσ². Which portfolio should she choose?",
    "P1: E(R) 12%, σ 20%", "P2: E(R) 9%, σ 12%", "P3: E(R) 7%, σ 6%", "B",
    "U₁ = 12 − 1.5 × 4 = 6.00; U₂ = 9 − 1.5 × 1.44 = 6.84; U₃ = 7 − 1.5 × 0.36 = 6.46. P2 has the highest utility.",
    "A has the highest return but too much risk for A = 3. C is the safest but gives up too much return.",
    "Use σ² in decimals (0.20² = 0.04), or in %² with 0.005A.", "", "Vol 9 LM 1"]
]);
addQ27("PM-02", [
  ["h", "Fund X returned 12% with beta 1.2; Fund Y returned 10% with beta 0.8. Rf = 3%. Based on the Treynor ratio:",
    "Fund Y performed better (8.75 vs 7.50)", "Fund X performed better (7.50 vs 8.75)", "They performed equally", "A",
    "Treynor = (R − Rf)/β: X = 9/1.2 = 7.50; Y = 7/0.8 = 8.75.",
    "B reverses the comparison.",
    "", "", "Vol 9 LM 2"],
  ["h", "A portfolio is 60% in a stock with beta 1.2 and 40% in a stock with beta 0.7. Rf = 3% and the market risk premium is 6%. The portfolio's CAPM expected return is:",
    "9.0%", "10.2%", "7.2%", "A",
    "Portfolio beta = 0.6 × 1.2 + 0.4 × 0.7 = 1.0 → 3% + 1.0 × 6% = 9.0%.",
    "B uses beta 1.2 only. C uses beta 0.7 only.",
    "", "", "Vol 9 LM 2"]
]);
addQ27("PM-06", [
  ["h", "A desk's 1-day 99% VaR is 2 million. Assuming returns are independent and identically distributed, the 10-day 99% VaR is closest to:",
    "2.0 million", "6.3 million", "20.0 million", "B",
    "Scale by √time: 2 × √10 = 6.32 million.",
    "C scales linearly with time.",
    "", "", "Vol 9 LM 6"]
]);

// ================= ETHICS =================
addQ27("ETH-04", [
  ["h", "During a one-on-one meeting, a CFO tells an analyst that next quarter's sales will be \"a bit below\" consensus — information not yet public and enough to move the price. The analyst's BEST course of action is to:",
    "Refrain from acting and encourage the company to disclose it publicly", "Downgrade the stock immediately for all clients at once", "Trade only for clients, not for herself", "A",
    "It is material nonpublic information; fair dissemination to clients doesn't cure it. She should not act and should encourage public disclosure.",
    "B still acts on MNPI. C causes others to trade on MNPI.",
    "Fair dealing never makes MNPI usable.", "", "Vol 10 LM 4"]
]);
addQ27("ETH-06", [
  ["h", "Before resigning, a portfolio manager emails herself her employer's composite performance records to show prospective clients at her new firm, as proof of her own track record. This:",
    "Violates loyalty to her employer, because the records are employer property", "Is acceptable because she managed those portfolios", "Is acceptable if she cites the old firm as the source", "A",
    "Records belong to the employer; taking them breaches IV(A). She may describe her experience but may not take records without permission.",
    "B and C ignore ownership of the records.",
    "", "", "Vol 10 LM 6"]
]);
addQ27("ETH-03", [
  ["h", "An investment banking colleague asks a research analyst to keep a Buy rating on a client company \"to protect the relationship\", although her updated model now supports Hold. She should:",
    "Issue the Hold rating based on her independent analysis", "Keep the Buy rating but disclose the banking relationship", "Stop covering the company without explanation", "A",
    "I(B) Independence and Objectivity: recommendations must reflect the analyst's own judgment. Disclosure does not cure a biased rating.",
    "B: disclosure does not make a biased rating acceptable. C avoids the issue without addressing it.",
    "", "", "Vol 10 LM 3"]
]);
addQ27("ETH-09", [
  ["h", "Huy passed Level I last year but has NOT yet registered for Level II. On his CV he may state that he:",
    "Passed Level I of the CFA Program", "Is a Level II candidate in the CFA Program", "Is a CFA Level I holder", "A",
    "He may state facts about levels passed. He is a candidate only once registered for the next exam. There is no \"Level I\" designation.",
    "B: he is not registered. C implies a partial designation.",
    "", "", "Vol 10 LM 9"]
]);
addQ27("ETH-05", [
  ["h", "An analyst changes a rating and emails the change to all clients at the same moment. Fifteen minutes later she phones her ten largest clients to discuss it in detail. Under Fair Dealing, this is:",
    "Acceptable, because all clients received the change at the same time first", "A violation, because large clients got extra service", "A violation, because ratings may not be discussed by phone", "A",
    "Fair dealing requires fair dissemination of the recommendation itself; different levels of service after everyone has it are allowed.",
    "B: extra service is allowed once all clients have the information. C is not a rule.",
    "", "", "Vol 10 LM 5"]
]);
addQ27("ETH-08", [
  ["h", "A manager's spouse has a fee-paying discretionary account at the firm. In an oversubscribed IPO, the manager allocates shares pro rata to all eligible accounts, including her spouse's. This is:",
    "Acceptable, because the spouse is treated like any other client", "A violation, because family accounts must never get IPO shares", "A violation, because the spouse must receive priority", "A",
    "Family accounts that are regular fee-paying clients should be treated the same as other clients — neither favored nor excluded.",
    "B over-applies the rule. C favors a family member.",
    "", "", "Vol 10 LM 8"]
]);

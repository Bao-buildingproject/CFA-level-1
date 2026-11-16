// Original practice questions for Learning Modules that are new or
// reorganized in the 2027 Level I curriculum (Quant, Equity, Ethics).

addQ27("QM-02", [
  ["a", "You buy a bond at 98, receive a coupon of 5 and sell it at 101 one year later. Its total return is closest to:", "3.06%", "8.16%", "5.10%", "B",
    "(101 − 98 + 5)/98 = 8.16%: price return plus income.", "A is the price return only. C is the coupon yield only.", "", "", "Vol 1 LM 2"],
  ["a", "You buy EUR at 1.10 USD and later sell at 1.155 USD. Your return in USD on the currency position is:", "5.0%", "4.8%", "10.5%", "A",
    "1.155/1.10 − 1 = 5.0%.", "B inverts the ratio. C is an arithmetic slip.", "", "", "Vol 1 LM 2"],
  ["f", "Over long historical periods, which asset class has generally delivered the highest average return and highest volatility?", "Equities", "Government bonds", "Treasury bills", "A",
    "Higher risk has historically been compensated with higher average return.", "", "", "", "Vol 1 LM 2"],
  ["a", "A portfolio earns 8% before tax. If the tax rate on the return is 25%, the after-tax return is:", "6.0%", "8.0%", "2.0%", "A",
    "8% × (1 − 0.25) = 6%.", "B ignores taxes. C is the tax itself.", "", "", "Vol 1 LM 2"],
  ["e", "The total return on a fully collateralized long commodity futures position is best described as:", "Price return + roll return + collateral (interest) return", "Price return only", "Dividend yield + price return", "A",
    "Futures investors also earn interest on collateral and gain or lose when rolling contracts.", "B ignores roll and collateral. C applies to stocks.", "", "", "Vol 1 LM 2"]
]);

addQ27("QM-03", [
  ["a", "A portfolio's sub-period returns are +10% and −5%. Its time-weighted return over the two periods is:", "5.0%", "4.5%", "2.5%", "B",
    "(1.10 × 0.95) − 1 = 4.5%. TWR chains sub-period returns.", "A adds the returns. C averages them.", "", "", "Vol 1 LM 3"],
  ["a", "A portfolio returned 7% while its benchmark returned 5%. The active (excess) return is:", "2%", "12%", "1.4%", "A",
    "Active return = portfolio − benchmark = 2%.", "", "", "", "Vol 1 LM 3"],
  ["f", "A good benchmark should be:", "Specified in advance, investable and appropriate for the manager's style", "Chosen after results are known", "Impossible to replicate", "A",
    "A benchmark must be fair and known in advance to evaluate performance meaningfully.", "", "", "", "Vol 1 LM 3"],
  ["e", "Time-weighted return is preferred for evaluating a fund manager because it:", "Removes the effect of client deposits and withdrawals the manager doesn't control", "Always gives a higher return", "Weights periods by the money invested", "A",
    "MWR reflects the timing of cash flows; TWR measures the manager's skill.", "C describes MWR.", "", "", "Vol 1 LM 3"],
  ["a", "An equal-weighted index must be rebalanced periodically because:", "Price changes cause weights to drift away from equal", "Shares outstanding never change", "It has no constituents", "A",
    "Winners grow to larger weights unless trimmed back.", "", "", "", "Vol 1 LM 3"]
]);

addQ27("QM-09", [
  ["f", "Historical simulation generates scenarios by:", "Using actual past changes in the risk factors", "Drawing from an assumed normal distribution", "Solving a closed-form formula", "A",
    "It assumes the past distribution of changes is representative of the future.", "B describes parametric Monte Carlo.", "", "", "Vol 1 LM 9"],
  ["a", "A main limitation of historical simulation is that it:", "Cannot generate events that did not occur in the sample period", "Requires no data", "Always overstates risk", "A",
    "If the history lacks a crisis, the simulation won't show one.", "", "", "", "Vol 1 LM 9"],
  ["e", "Increasing the number of trials in a Monte Carlo simulation mainly:", "Improves the precision of the estimated result", "Changes the assumed distribution", "Removes model risk", "A",
    "More trials reduce sampling error, but wrong assumptions still give wrong answers.", "", "", "", "Vol 1 LM 9"]
]);

addQ27("EQ-01", [
  ["f", "Common shareholders have a claim on a company's assets that is:", "Residual — after creditors and preferred shareholders", "Senior to all creditors", "Fixed at par value", "A",
    "They are paid last but keep all remaining value.", "", "", "", "Vol 5 LM 1"],
  ["a", "Compared with publicly listed equity, private equity securities typically have:", "Less liquidity and less public disclosure", "Daily exchange trading", "Stricter public reporting", "A",
    "Private shares are not traded on exchanges and disclosure is limited.", "", "", "", "Vol 5 LM 1"],
  ["a", "A preferred share that the holder can exchange for a fixed number of common shares is:", "Convertible preferred", "Callable preferred", "Cumulative preferred", "A",
    "Conversion gives upside participation.", "B gives the issuer the right to redeem. C relates to missed dividends.", "", "", "Vol 5 LM 1"]
]);

addQ27("EQ-02", [
  ["a", "In a dual-class share structure, the founders' class most likely has:", "More votes per share than the public class", "No voting rights", "A fixed dividend only", "A",
    "Dual-class shares separate control from economic ownership.", "", "", "", "Vol 5 LM 2"],
  ["f", "A shareholder who authorizes someone else to vote her shares at the annual meeting is voting by:", "Proxy", "Cumulative ballot", "Tender offer", "A",
    "Proxy voting lets shareholders vote without attending.", "", "", "", "Vol 5 LM 2"],
  ["e", "A shareholder owns 100 shares and 3 directors are being elected. Under cumulative voting she can cast:", "300 votes for a single candidate", "100 votes per candidate only", "3 votes in total", "A",
    "Cumulative voting multiplies shares by seats and lets votes be concentrated.", "B describes statutory voting.", "", "", "Vol 5 LM 2"],
  ["a", "Buying shares of a foreign company through an ETF that holds them is an example of:", "Indirect investing", "Direct investing", "Private placement", "A",
    "Direct investing means buying the shares themselves on the foreign market.", "", "", "", "Vol 5 LM 2"]
]);

addQ27("EQ-04", [
  ["a", "A stock trades at 80 before a 2-for-1 split. All else equal, after the split it trades at:", "160", "40", "80", "B",
    "Shares double, so price halves; shareholder wealth is unchanged.", "", "", "", "Vol 5 LM 4"],
  ["a", "A stock rises from 50 to 53 and pays a dividend of 1 during the year. Its total return is:", "6%", "8%", "2%", "B",
    "(53 − 50 + 1)/50 = 8%.", "A is the price return. C is the dividend yield.", "", "", "Vol 5 LM 4"],
  ["e", "Net income is 100 with 50 shares outstanding. The firm buys back 10 shares using idle cash that earned nothing. EPS becomes:", "2.00", "2.50", "1.67", "B",
    "100/40 = 2.50. A buyback reduces shares; with no lost income, EPS rises.", "A ignores the buyback. C divides by 60.", "", "", "Vol 5 LM 4"],
  ["f", "A reverse stock split:", "Reduces the number of shares and raises the price per share", "Increases shareholder wealth", "Pays a cash dividend", "A",
    "It changes the number of shares, not total value.", "", "", "", "Vol 5 LM 4"]
]);

addQ27("EQ-06", [
  ["e", "A stock will pay dividends of 2.00 next year and 2.20 the year after; from then on dividends grow at 4%. With r = 10%, the value is closest to:", "35.15", "36.67", "38.13", "A",
    "P₂ = 2.20 × 1.04/0.06 = 38.13. V₀ = 2/1.1 + (2.20 + 38.13)/1.1² = 35.15.", "C is the year-2 price, not today's value. B is an arithmetic slip.", "", "", "Vol 5 LM 6"],
  ["a", "Next year's FCFE is expected to be 3, growing at 4% forever. The required return on equity is 9%. Equity value per share is:", "33.33", "60.00", "75.00", "B",
    "3/(0.09 − 0.04) = 60.", "A divides by r. C divides by 4%.", "", "", "Vol 5 LM 6"],
  ["a", "In a constant-growth model, when (r − g) becomes very small, the estimated value:", "Becomes very large and very sensitive to assumptions", "Becomes zero", "Is unaffected", "A",
    "Small changes in r or g cause big swings in value.", "", "", "", "Vol 5 LM 6"]
]);

addQ27("EQ-07", [
  ["a", "Peers trade at a median P/E of 15. The company's EPS is 3. Using the method of comparables, its estimated value is:", "45", "5", "18", "A",
    "15 × 3 = 45.", "", "", "", "Vol 5 LM 7"],
  ["f", "Price-to-book is especially popular for valuing:", "Banks and other financial firms", "Early-stage tech startups", "Companies with negative equity", "A",
    "Banks' assets are mostly financial and carried near market value.", "", "", "", "Vol 5 LM 7"],
  ["e", "The method of comparables relies mainly on the idea that:", "Similar assets should sell at similar multiples", "Every stock is fairly priced", "Dividends never change", "A",
    "It's an application of the law of one price; if peers are mispriced, so is the estimate.", "", "", "", "Vol 5 LM 7"]
]);

addQ27("EQ-11", [
  ["f", "A typical equity research report includes:", "An investment thesis, valuation, recommendation and key risks", "Only the share price chart", "The analyst's personal trades", "A",
    "Readers need the reasoning, the numbers and what could go wrong.", "", "", "", "Vol 5 LM 11"],
  ["a", "Compared with buy-side research, sell-side research is:", "Published by brokers for their clients and often widely distributed", "Used only inside an asset manager", "Never includes ratings", "A",
    "Buy-side reports support the analyst's own firm's investment decisions.", "", "", "", "Vol 5 LM 11"],
  ["a", "An analyst's report states a target price of 60 while the stock is 50 and the rating is \"Sell\". The main problem is:", "The rating is inconsistent with the valuation", "The report has too much detail", "Target prices are not allowed", "A",
    "Ratings, target prices and the thesis should agree, or the reasons must be explained.", "", "", "", "Vol 5 LM 11"],
  ["e", "Under the CFA Institute Standards, a research report must:", "Distinguish facts from opinions and disclose conflicts of interest", "Guarantee the forecast", "Avoid mentioning risks", "A",
    "Standards V(B) and VI(A) apply to research reports.", "", "", "", "Vol 5 LM 11"],
  ["f", "The \"investment thesis\" in a report is:", "The main argument for why the stock is mispriced and what will change it", "The company's history", "The list of directors", "A",
    "It links analysis to the recommendation.", "", "", "", "Vol 5 LM 11"]
]);

addQ27("EQ-12", [
  ["a", "Risk-free rate 3%, beta 1.1, equity market risk premium 5.5%. The CAPM cost of equity is closest to:", "8.50%", "9.05%", "6.05%", "B",
    "3% + 1.1 × 5.5% = 9.05%.", "A uses beta of 1. C omits the risk-free rate.", "", "", "Vol 5 LM 12"],
  ["f", "In the market model Rᵢ = αᵢ + βᵢRₘ + εᵢ, beta is estimated as the:", "Slope of a regression of the stock's returns on market returns", "Intercept of the regression", "Average stock return", "A",
    "The slope measures sensitivity to market moves.", "", "", "", "Vol 5 LM 12"],
  ["e", "A two-factor model: Rf = 3%, factor 1 sensitivity 1.2 with premium 4%, factor 2 sensitivity 0.5 with premium 2%. Expected return is:", "8.8%", "7.8%", "10.2%", "A",
    "3% + 1.2 × 4% + 0.5 × 2% = 8.8%.", "", "", "", "Vol 5 LM 12"],
  ["a", "A raw regression beta of 1.3 adjusted toward 1 using 2/3 × raw + 1/3 × 1 gives:", "1.20", "1.30", "1.10", "A",
    "2/3 × 1.3 + 1/3 = 1.20. Betas tend to drift toward 1 over time.", "", "", "", "Vol 5 LM 12"],
  ["f", "The equity market risk premium can be estimated using:", "Historical excess returns or forward-looking (e.g. dividend-based) methods", "Only the company's dividend", "The bond's coupon rate", "A",
    "Both approaches are used; each has limitations.", "", "", "", "Vol 5 LM 12"]
]);

addQ27("ETH-03", [
  ["a", "A member learns her employer is breaking securities law and she is asked to help. Under Standard I(A), she must:", "Dissociate from the activity", "Help, since it's her employer's decision", "Report only if she gets a reward", "A",
    "Members must not knowingly participate in violations and should dissociate.", "", "", "", "Vol 10 LM 3"],
  ["a", "A member is convicted of fraud unrelated to her job. This most likely violates:", "Misconduct (I(D))", "Fair Dealing", "Record Retention", "A",
    "Acts of dishonesty or fraud reflect adversely on professional integrity.", "", "", "", "Vol 10 LM 3"],
  ["f", "Standard I(E) Competence requires members to:", "Act with and maintain the competence needed for their professional activities", "Hold a PhD", "Avoid all new products", "A",
    "Competence includes keeping knowledge up to date.", "", "", "", "Vol 10 LM 3"]
]);

addQ27("ETH-04", [
  ["a", "To prevent misuse of material nonpublic information, firms commonly use:", "Information barriers (firewalls) between banking and research", "Shared offices for all departments", "Public posting of client orders", "A",
    "Barriers control the flow of sensitive information.", "", "", "", "Vol 10 LM 4"],
  ["a", "A company gives earnings guidance only to a few favored analysts before the public. This is:", "Selective disclosure, creating material nonpublic information", "Normal investor relations", "Required by law", "A",
    "Analysts receiving it must not act until it is public.", "", "", "", "Vol 10 LM 4"],
  ["e", "A trader buys large amounts of a thinly traded stock at the close each quarter-end to boost a fund's reported value. This is:", "Market manipulation (II(B))", "A legitimate strategy", "Required rebalancing", "A",
    "Trading intended to distort prices and mislead violates II(B).", "", "", "", "Vol 10 LM 4"]
]);

addQ27("ETH-06", [
  ["a", "An employee reports her firm's fraud on clients to regulators after internal channels fail. This is:", "Permitted whistleblowing that protects clients", "A breach of loyalty", "A violation of confidentiality", "A",
    "Loyalty to the employer doesn't require covering up illegal acts that harm clients.", "", "", "", "Vol 10 LM 6"],
  ["f", "Standard IV(A) Loyalty requires members to:", "Act for the benefit of their employer and not harm it", "Always obey every instruction", "Never change jobs", "A",
    "Loyalty is not blind obedience — clients and the law still come first.", "", "", "", "Vol 10 LM 6"]
]);

addQ27("ETH-08", [
  ["a", "A portfolio manager wants to buy shares in an IPO for her personal account. She should:", "Get pre-clearance from her firm and make sure clients aren't disadvantaged", "Buy before clients without telling anyone", "Never mention it", "A",
    "Personal participation in IPOs is a common conflict that needs approval.", "", "", "", "Vol 10 LM 8"],
  ["a", "A manager's father is a fee-paying client of the firm. His account should be:", "Treated like any other client account", "Given priority over other clients", "Excluded from all block trades", "A",
    "Family client accounts may not be favored or disadvantaged.", "", "", "", "Vol 10 LM 8"],
  ["e", "Disclosures of conflicts of interest under VI(A) should be:", "Prominent, in plain language, and specific enough to be understood", "Hidden in small print", "Given only if asked", "A",
    "Clients must be able to judge the conflict's effect.", "", "", "", "Vol 10 LM 8"]
]);

addQ27("ETH-09", [
  ["a", "A charterholder stops paying dues and her membership lapses. She:", "May not use the CFA designation until membership is reactivated", "May keep using it forever", "Must retake all exams", "A",
    "Use of the designation requires active membership.", "", "", "", "Vol 10 LM 9"],
  ["a", "Which statement is permitted?", "\"I passed all three CFA exams on my first attempt.\"", "\"As a CFA, I achieve superior returns.\"", "\"I am a CFA Level I.\"", "A",
    "Factual statements are allowed; implying superior performance or partial designations is not.", "", "", "", "Vol 10 LM 9"],
  ["e", "A candidate tells her study group that a particular formula did not appear on her exam. This:", "Violates VII(A) by revealing exam content", "Is acceptable because it is negative information", "Is required to help others", "A",
    "Disclosing what was or wasn't tested is not allowed.", "", "", "", "Vol 10 LM 9"]
]);

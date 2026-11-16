// Portfolio Management — original practice questions
addQ("PM-01", [
  ["e", "50% in asset X (σ = 20%) and 50% in Y (σ = 10%), correlation 0. Portfolio σ is closest to:", "15.00%", "11.18%", "5.00%", "B",
    "σp² = 0.25(0.04) + 0.25(0.01) = 0.0125 → 11.18%.", "A is true only if correlation = +1.", ""],
  ["e", "Along the same capital allocation line, a MORE risk-averse investor will hold:", "A larger weight in the risky portfolio", "A smaller weight in the risky portfolio", "The same weights", "B",
    "Higher risk aversion → more of the risk-free asset.", "", ""],
  ["a", "An investor with risk aversion A = 4 considers a portfolio with E(R) = 10% and σ = 20%. Using U = E(R) − 0.5Aσ², utility is:", "2.0%", "6.0%", "8.0%", "A",
    "U = 0.10 − 0.5 × 4 × 0.04 = 0.02 = 2%.", "", ""],
  ["f", "The efficient frontier contains portfolios that:", "Offer the highest expected return for each level of risk", "Have the lowest return", "Contain only one asset", "A",
    "Portfolios below the frontier are dominated.", "", ""]
]);

addQ("PM-02", [
  ["f", "Which risk is rewarded with a higher expected return in the CAPM?", "Unsystematic risk", "Systematic risk", "Total risk", "B",
    "Firm-specific risk can be diversified away, so only beta risk is priced.", "", ""],
  ["a", "Rf = 3%, E(Rm) = 8%, beta = 1.2. The CAPM required return is:", "9.0%", "12.6%", "9.6%", "A",
    "3% + 1.2 × 5% = 9.0%.", "B multiplies beta by the market return.", ""],
  ["a", "A portfolio returned 10% with σ = 16%; Rf = 2%. Its Sharpe ratio is:", "0.50", "0.625", "0.08", "A",
    "(10% − 2%)/16% = 0.50.", "B forgets Rf.", ""],
  ["a", "A stock's covariance with the market is 0.03 and the market's standard deviation is 15%. Its beta is closest to:", "0.20", "1.33", "2.00", "B",
    "β = Cov/σm² = 0.03/0.0225 = 1.33.", "A divides by σm instead of σm².", ""],
  ["e", "A stock is expected to return 12%, while the CAPM requires 10%. The stock plots:", "Above the SML — undervalued", "Below the SML — overvalued", "On the SML", "A",
    "Expected return > required return → positive alpha → undervalued.", "", ""],
  ["e", "A portfolio returned 12% with beta 1.25. Rf = 2% and the market returned 9%. Jensen's alpha is:", "+1.25%", "0%", "−1.25%", "A",
    "Required = 2% + 1.25 × 7% = 10.75%; alpha = 12% − 10.75% = 1.25%.", "", ""]
]);

addQ("PM-03", [
  ["f", "The portfolio management process consists of:", "Planning, execution and feedback", "Buying, selling and holding", "Forecasting only", "A",
    "Feedback (monitoring and rebalancing) closes the loop.", "", ""],
  ["a", "In a defined contribution pension plan, investment risk is borne by:", "The employee (participant)", "The employer", "The government", "A",
    "In a defined benefit plan, the employer bears it.", "", ""],
  ["a", "University endowments typically have:", "Very long time horizons and can accept illiquid assets", "Very short horizons", "No spending needs", "A",
    "They aim to support the institution in perpetuity.", "", ""],
  ["f", "An open-end mutual fund differs from a closed-end fund because it:", "Issues and redeems shares at NAV", "Has a fixed number of shares traded on an exchange", "Cannot hold stocks", "A",
    "Closed-end fund shares trade at market prices that can differ from NAV.", "", ""]
]);

addQ("PM-04", [
  ["f", "Which item is a CONSTRAINT in an IPS?", "Risk tolerance", "Liquidity needs", "Return objective", "B",
    "Constraints: liquidity, time horizon, tax, legal/regulatory, unique circumstances.", "A and C are objectives.", ""],
  ["a", "A 30-year-old with a high, stable income and a long horizon most likely has:", "High ability to take risk", "Low ability to take risk", "No need for an IPS", "A",
    "Ability depends on financial circumstances; willingness is psychological.", "", ""],
  ["e", "When a client's willingness to take risk is higher than her ability, the adviser should generally:", "Base risk tolerance on the lower ability", "Follow the higher willingness", "Ignore both", "A",
    "Use the more conservative of the two when they conflict (and educate the client).", "", ""],
  ["a", "Excluding tobacco companies from a portfolio is an example of:", "Negative screening", "Positive screening", "Thematic investing", "A",
    "Negative (exclusionary) screening removes sectors or companies.", "", ""]
]);

addQ("PM-05", [
  ["f", "Feeling the pain of a loss more strongly than the pleasure of an equal gain is:", "Loss aversion", "Overconfidence", "Anchoring", "A",
    "It can lead investors to hold losers too long.", "", ""],
  ["a", "An investor trades frequently because he believes his forecasts are better than they are. This is:", "Overconfidence bias", "Status quo bias", "Mental accounting", "A",
    "Overconfident investors underestimate risk and trade too much.", "", ""],
  ["a", "An analyst sticks too closely to her initial earnings estimate despite new information. This is:", "Anchoring", "Regret aversion", "Endowment bias", "A",
    "Adjustments from the anchor are too small.", "", ""],
  ["e", "Which bias is classified as COGNITIVE rather than emotional?", "Confirmation bias", "Endowment bias", "Self-control bias", "A",
    "Cognitive biases are reasoning errors; B and C are emotional.", "", ""]
]);

addQ("PM-06", [
  ["f", "Risk tolerance is best defined as:", "The level of risk an organization or person is willing and able to accept", "The total return target", "The amount of insurance purchased", "A",
    "It sets the boundaries for risk-taking.", "", ""],
  ["a", "A portfolio's 1-day 5% VaR is 1 million. This means:", "There is a 5% chance of losing at least 1 million in a day", "The maximum possible loss is 1 million", "The portfolio will lose 1 million 5% of the year for sure", "A",
    "VaR is a minimum loss at a given probability, not a maximum.", "", ""],
  ["a", "Buying insurance against property damage is an example of risk:", "Transfer", "Avoidance", "Acceptance", "A",
    "The risk is shifted to the insurer for a premium.", "", ""],
  ["e", "Allocating a firm's total risk tolerance across activities or managers is called:", "Risk budgeting", "Risk shifting", "Risk avoidance", "A",
    "It links risk-taking to expected return.", "", ""]
]);

// ---- Added to cover remaining LOS (SchweserNotes Book 4) ----
addQ("PM-01", [
  ["f", "Historically, which asset class has had the HIGHEST average return and the highest volatility?", "Small-cap stocks", "Treasury bills", "Long-term government bonds", "A",
    "Higher risk has been rewarded with higher average returns over long periods.", "", "", "", "LOS 83.a"],
  ["a", "The minimum-variance frontier shows:", "The portfolios with the lowest risk for each level of expected return", "Only portfolios containing the risk-free asset", "Portfolios with the highest risk", "A",
    "The upper half of it, above the global minimum-variance portfolio, is the efficient frontier.", "", "", "", "LOS 83.g"]
]);
addQ("PM-02", [
  ["a", "The capital market line (CML) is the capital allocation line that uses:", "The market portfolio as the risky portfolio", "Any single stock", "Only bonds", "A",
    "If investors share expectations, the optimal risky portfolio is the market portfolio.", "", "", "", "LOS 84.b"],
  ["a", "A company uses the CAPM to estimate the required return on a new project. This is an application in:", "Capital budgeting", "Inventory accounting", "Revenue recognition", "A",
    "The CAPM gives the discount rate for project cash flows.", "", "", "", "LOS 84.h"]
]);
addQ("PM-03", [
  ["f", "Compared with pension funds, property and casualty insurers generally have:", "Shorter time horizons and higher liquidity needs", "Longer horizons and no liquidity needs", "No regulation", "A",
    "Claims can arise suddenly, so they keep liquid portfolios.", "", "", "", "LOS 85.c"],
  ["a", "A major trend in the asset management industry has been the growth of:", "Passive investing", "Paper-based trading", "Fixed brokerage commissions", "A",
    "Low-cost index funds and ETFs have gained market share.", "", "", "", "LOS 85.e"]
]);
addQ("PM-04", [
  ["a", "When specifying asset classes for strategic asset allocation, assets within a class should be:", "Similar to each other, and classes should have low correlation with each other", "As different as possible within each class", "Perfectly correlated across classes", "A",
    "Homogeneous within, distinct between — so allocations are meaningful.", "", "", "", "LOS 86.f"],
  ["e", "Temporarily overweighting equities because they look cheap is an example of:", "Tactical asset allocation", "Strategic asset allocation", "Rebalancing to target", "A",
    "Tactical moves are short-term deviations from the strategic (long-term) mix.", "", "", "", "LOS 86.g"]
]);
addQ("PM-05", [
  ["e", "Investors following the crowd into rising stocks can contribute to:", "Momentum and asset bubbles", "Perfect market efficiency", "Lower volatility", "A",
    "Herding can push prices away from fundamental value.", "", "", "", "LOS 87.c"]
]);
addQ("PM-06", [
  ["f", "Effective risk governance starts with:", "The board setting risk tolerance and oversight from the top", "Each trader choosing their own limits", "The external auditor", "A",
    "Risk governance is a top-down process.", "", "", "", "LOS 88.c"],
  ["a", "Which is a NON-financial risk?", "Operational risk such as a system failure", "Market risk", "Credit risk", "A",
    "Non-financial risks include operational, legal, compliance and model risk.", "", "", "", "LOS 88.f"]
]);

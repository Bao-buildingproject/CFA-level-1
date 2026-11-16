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

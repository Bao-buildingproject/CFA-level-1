// Extra harder questions, all 10 topics (difficulty 3). Same row format as the topic files.
coachAddQ("QM", [
  [3, 8, "Portfolio return and risk", "Asset X has an expected return of 12% and σ = 20%; asset Y 6% and σ = 10%. With 25% in X and 75% in Y and a correlation of 0, the portfolio expected return and standard deviation are closest to:", "7.5% and 9.0%", "7.5% and 12.5%", "9.0% and 8.5%", "E(R) = 0.25 × 12 + 0.75 × 6 = 7.5%. Variance = 0.0625(0.04) + 0.5625(0.01) = 0.0025 + 0.005625 = 0.008125, so σ = 9.0%. 12.5% is the weighted average of the standard deviations (1 correlation).", "c"],
  [3, 7, "Confidence interval", "A sample of 36 returns has mean 8% and standard deviation 12%. A 95% confidence interval for the mean (z = 1.96) is closest to:", "4.1% to 11.9%", "−15.5% to 31.5%", "6.0% to 10.0%", "Standard error = 12/√36 = 2%; 8 ± 1.96 × 2 = 4.08% to 11.92%. The wide interval uses the standard deviation instead of the standard error.", "c"],
  [3, 10, "Regression slope interpretation", "In a regression of a stock's return on the market return, the slope is 1.3 and R² is 0.60. Which statement is correct?", "60% of the variation in the stock's return is explained by the market", "The stock's return rises 0.6% when the market rises 1%", "The market explains 130% of the stock's movements", "R² is the share of variation explained; the slope gives sensitivity (1.3% per 1%)."]
]);
coachAddQ("ECO", [
  [3, 8, "Forward premium", "Spot is 0.9000 EUR per USD. The 1-year forward is 0.9180 EUR per USD. The USD is trading at a forward:", "Premium of 2.0% against the EUR", "Discount of 2.0% against the EUR", "Premium of 1.8%", "0.9180/0.9000 − 1 = 2.0%: more EUR per USD forward, so the USD is at a forward premium.", "c"],
  [3, 4, "Monetary transmission", "A central bank unexpectedly raises its policy rate. All else equal, the currency of that country most likely:", "Appreciates, as higher yields attract capital inflows", "Depreciates, because borrowing costs increase", "Is unaffected in the short run", "Higher relative interest rates attract capital and raise demand for the currency."],
  [3, 3, "Fiscal multiplier", "The marginal propensity to consume is 0.80 and there are no taxes or imports. A $10 billion increase in government spending raises demand by up to:", "$50 billion", "$8 billion", "$12.5 billion", "Multiplier = 1/(1 − MPC) = 5, so 5 × 10 = $50 billion. $8 billion is only the first-round consumption.", "c"]
]);
coachAddQ("FSA", [
  [3, 6, "Inventory: LIFO reserve", "A LIFO company reports inventory of $400M and a LIFO reserve of $60M. Inventory on a FIFO basis is:", "$460M", "$340M", "$400M", "FIFO inventory = LIFO inventory + LIFO reserve = $460M.", "c"],
  [3, 8, "Debt covenants and leverage", "A company with a debt-to-equity ratio of 1.5 issues shares and uses the proceeds to repay debt. The debt-to-equity ratio and the interest coverage ratio will most likely:", "Fall and rise, respectively", "Rise and fall", "Both fall", "Less debt lowers leverage and interest expense, so coverage improves."],
  [3, 4, "Cash flow classification", "Under IFRS, interest paid by a non-financial company may be classified in operating or financing activities. Under US GAAP it must be classified in:", "Operating activities", "Financing activities", "Investing activities", "US GAAP puts interest paid and received in operating cash flows."]
]);
coachAddQ("CI", [
  [3, 6, "Levered cost of equity", "The unlevered cost of equity is 8%, the cost of debt is 4% and the tax rate is 0 (MM proposition II). With a debt-to-equity ratio of 0.5, the cost of equity is:", "10.0%", "8.0%", "6.0%", "r_e = r_0 + (r_0 − r_d) × D/E = 8% + 4% × 0.5 = 10%.", "c"],
  [3, 5, "Real options", "A company can wait one year before committing to a plant. The option to delay is most valuable when:", "Uncertainty is high and the investment is irreversible", "Returns are certain", "Competitors will certainly preempt the project", "Flexibility is worth more under high uncertainty and irreversible spending."],
  [3, 3, "Governance", "Which governance feature best protects minority shareholders from a controlling shareholder?", "A majority of independent directors on the board", "A longer director term", "Dual-class shares with differing votes", "Independent directors reduce the risk that decisions favor a controlling holder."]
]);
coachAddQ("EQ", [
  [3, 6, "Two-stage dividend model", "A company pays a next-year dividend of $1.00. It grows 10% for one more year and then 4% forever. The required return is 9%. The terminal value at the end of year 1 (based on the year-2 dividend) is closest to:", "$22.00", "$20.00", "$25.00", "D2 = 1.00 × 1.10 = 1.10; V1 = D2 /(r − g) = 1.10 / 0.05 = $22.00.", "c"],
  [3, 7, "PEG ratio", "A stock trades at a P/E of 24 and its expected earnings growth is 12% per year. The PEG ratio is:", "2.0", "0.5", "288", "PEG = P/E ÷ growth rate (in %) = 24 / 12 = 2.0.", "c"],
  [3, 4, "Equity risk premium", "A stock has a beta of 0.8, the risk-free rate is 3% and the equity risk premium is 5%. The expected return is:", "7.0%", "4.0%", "8.0%", "3% + 0.8 × 5% = 7.0%.", "c"]
]);
coachAddQ("FI", [
  [3, 6, "Accrued interest", "A semiannual 6% bond has 2 months since its last coupon (30/360). Per $100 par, accrued interest is closest to:", "$1.00", "$3.00", "$0.50", "Accrued interest = 6 × (60/360) = $1.00.", "c"],
  [3, 11, "Duration and coupon", "Two bonds have the same maturity and yield. Compared with the 4% coupon bond, the 8% coupon bond has:", "A lower duration", "A higher duration", "The same duration", "A larger share of cash flows arrives earlier, so duration is lower."],
  [3, 14, "Credit spread", "A corporate bond yields 6.5% and a comparable government bond yields 4.0%. The credit spread is:", "250 bps", "2.5 bps", "10.5%", "6.5% − 4.0% = 2.5% = 250 bps.", "c"]
]);
coachAddQ("DER", [
  [3, 6, "Futures margin", "A trader buys a futures contract with an initial margin of $5,000 and maintenance margin of $4,000. The contract loses $1,500 in value. The trader receives a margin call and must deposit:", "$1,500 to restore the initial margin", "$500 to restore the maintenance margin", "Nothing", "The account falls to $3,500, below $4,000, so funds must bring it back to the initial margin of $5,000 (a $1,500 deposit).", "c"],
  [3, 8, "Put payoff", "A European put has a strike of $60 and a premium of $4. At expiration the underlying is $52. The buyer's profit is:", "$4", "$8", "$12", "Payoff = 60 − 52 = 8; profit = 8 − 4 = $4.", "c"],
  [3, 5, "Cost of carry", "An asset provides a 3% dividend yield. The risk-free rate is 5% and T = 1. For spot $100 the continuous forward price is closest to:", "$102.02", "$105.13", "$98.02", "F = 100 × e^{(0.05 − 0.03) × 1} = 102.02.", "c"]
]);
coachAddQ("ALT", [
  [3, 3, "Carried interest waterfall", "An LP invested $100M. A fund has distributed $140M in total and the 8% hurdle has already been met. Carry is 20% of total profit. The GP's carry is closest to:", "$8M", "$28M", "$20M", "Profit = 140 − 100 = $40M; carry = 20% × 40 = $8M under the stated terms.", "c"],
  [3, 4, "Infrastructure risk", "Which risk is most characteristic of greenfield infrastructure compared with brownfield?", "Construction and ramp-up risk", "Mature demand risk", "Regulatory continuity risk only", "New projects face construction delays, cost overruns and demand uncertainty."],
  [3, 6, "Fund of funds fees", "A fund of hedge funds invests in funds that charge 2% management and 20% incentive. The FoF itself also charges fees. Compared with investing directly in one hedge fund, the investor has:", "Two layers of fees, with the FoF's fee in addition", "Only one layer of fees", "No fee layers", "FoFs diversify across managers but add a second layer of fees."]
]);
coachAddQ("PM", [
  [3, 2, "Treynor ratio", "A portfolio earns 11% with a beta of 1.25. The risk-free rate is 3%. The Treynor ratio is:", "6.4%", "8.0%", "0.64%", "(11 − 3)/1.25 = 6.4%.", "c"],
  [3, 5, "Prospect theory", "Prospect theory says that investors typically:", "Feel losses more strongly than equivalent gains", "Are always risk-neutral", "Evaluate wealth only in absolute terms", "Loss aversion: a loss hurts more than an equal gain pleases."],
  [3, 6, "Risk metrics", "Which statement about value at risk is correct?", "VaR does not describe how large losses beyond the threshold can be", "VaR states the worst possible loss", "VaR is the same as standard deviation", "VaR is a threshold, so tail losses are not captured."]
]);
coachAddQ("ETH", [
  [3, 7, "Record retention", "A member's recommendation was based on research she did not document. Standard V(C) says members should:", "Maintain records to support the recommendation", "Destroy notes after the trade", "Keep records only if a regulator asks", "Standard V(C) requires appropriate records to support analysis and recommendations."],
  [3, 9, "Participation in the CFA Program", "A candidate tells a friend the exam content he saw during the test. The member has most likely violated:", "Standard VII(A) Conduct as Participants in CFA Institute Programs", "Standard III(E) Preservation of Confidentiality", "Standard IV(A) Loyalty", "Disclosing confidential exam content compromises the integrity of the Program."],
  [3, 6, "Supervisory responsibility", "A supervisor is told about a possible violation by a subordinate. Under Standard IV(C) the supervisor should:", "Investigate promptly and take steps to stop it", "Ignore it until the subordinate's review", "Delegate the matter and take no further action", "Supervisors must act reasonably on a suspected violation."]
]);

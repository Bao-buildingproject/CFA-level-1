// Quantitative Methods — original practice questions
addQ("QM-01", [
  ["f", "You buy a share for 50, receive a dividend of 2, and sell it for 54. Your holding period return is closest to:", "8%", "12%", "4%", "B",
    "HPR = (P1 − P0 + income) / P0 = (54 − 50 + 2) / 50 = 12%.", "A ignores the dividend. C is the dividend yield only.", "Total return = price change + income."],
  ["a", "A bank quotes 6% per year, compounded monthly. The effective annual rate is closest to:", "6.00%", "6.17%", "6.09%", "B",
    "Monthly rate 0.5%; EAR = 1.005^12 − 1 = 6.17%.", "A is the stated rate. C is the EAR with semiannual compounding (1.03² − 1).", "More frequent compounding → higher EAR.", "2ND ICONV: NOM=6 ENTER, C/Y=12 ENTER, CPT EFF → 6.168"],
  ["a", "A fund returns +20% in year 1 and −10% in year 2. Its geometric mean annual return is closest to:", "5.00%", "3.92%", "8.00%", "B",
    "[(1.20)(0.90)]^(1/2) − 1 = 3.92%: the actual compound growth rate.", "A is the arithmetic mean. C is the 2-year total return.", "Geometric ≤ arithmetic; the gap grows with volatility."],
  ["f", "Which component of a required interest rate compensates investors for the risk that a bond cannot be sold quickly near its fair value?", "Maturity premium", "Liquidity premium", "Default risk premium", "B",
    "The liquidity premium compensates for the cost of converting an asset to cash quickly.", "A compensates for longer-term price sensitivity. C compensates for the risk the borrower does not pay.", ""],
  ["a", "An investor adds a large amount to her portfolio just before a period of very strong returns. Compared with the time-weighted return, her money-weighted return will most likely be:", "Lower", "Higher", "The same", "B",
    "MWR weights each period by the money invested; more money was invested in the strong period, so MWR exceeds TWR.", "A would happen if she added money before weak returns. C only if cash flows don't matter (no flows).", "TWR ignores the timing of cash flows — that's why it's used to evaluate managers."],
  ["a", "A stock rises from 50 to 55. Its continuously compounded return is closest to:", "10.00%", "9.53%", "10.52%", "B",
    "r(cc) = ln(55/50) = ln(1.10) = 9.53%.", "A is the holding period return. C is e^0.10 − 1 (the reverse conversion).", "", "55 ÷ 50 = 1.1, then LN → 0.0953"],
  ["e", "An investor buys one share at 100 at t = 0 and another share at 110 at t = 1. She sells both at 120 at t = 2. No dividends. Her annual money-weighted return is closest to:", "9.39%", "9.54%", "20.00%", "A",
    "Solve −100 − 110/(1+r) + 240/(1+r)² = 0 → r ≈ 9.39%. More money was invested in year 2, which earned only 9.1% (110→120).", "B is the time-weighted return: √(1.10 × 1.0909) − 1. C is the 2-year cumulative TWR.", "", "CF0=−100, C01=−110, C02=240; IRR CPT → 9.39"],
  ["a", "A 3-month holding period return is 2%. The annualized return (compounded) is closest to:", "8.00%", "8.24%", "0.50%", "B",
    "Annualized = (1.02)^4 − 1 = 8.24%.", "A ignores compounding. C de-annualizes instead of annualizing.", ""]
]);

addQ("QM-02", [
  ["e", "An investment pays 1,000 at the END of each year for 5 years. At 8%, its present value is closest to:", "3,992.71", "4,312.13", "5,866.60", "A",
    "Ordinary annuity: PV = 1,000 × [1 − 1.08⁻⁵] / 0.08 = 3,992.71.", "B treats it as an annuity due. C is the future value.", "\"End of year\" = END mode.", "N=5, I/Y=8, PMT=−1000, FV=0, CPT PV → 3,992.71"],
  ["a", "You deposit 10,000 at 6% compounded annually for 5 years. The future value is closest to:", "13,000.00", "13,382.26", "13,488.50", "B",
    "FV = 10,000 × 1.06⁵ = 13,382.26.", "A uses simple interest. C uses monthly compounding.", "", "N=5, I/Y=6, PV=−10000, PMT=0, CPT FV"],
  ["e", "A zero-coupon bond paying 1,000 in 4 years trades at 790. Its implied annual return is closest to:", "5.32%", "6.07%", "6.65%", "B",
    "r = (1,000 / 790)^(1/4) − 1 = 6.07%.", "A and C are calculation errors (e.g. simple averaging 26.6%/4 = 6.65%).", "", "N=4, PV=−790, PMT=0, FV=1000, CPT I/Y"],
  ["a", "A preferred share pays a fixed dividend of 3 forever. If the required return is 8%, its value is:", "24.00", "37.50", "40.50", "B",
    "Perpetuity: V = D / r = 3 / 0.08 = 37.50.", "A multiplies instead of dividing. C grows the dividend although there is no growth.", ""],
  ["e", "The 1-year spot rate is 3% and the 2-year spot rate is 4%. By cash flow additivity, the 1-year rate one year from now is closest to:", "3.50%", "5.01%", "4.50%", "B",
    "(1.04)² = (1.03)(1 + f) → f = 1.0816/1.03 − 1 = 5.01%. Investing for 2 years or 1 year + rolling must give the same result.", "A is a simple average. C is a guess between the rates.", "Forward rates come from the no-arbitrage condition."],
  ["f", "A stock trades at 50 and is expected to pay a dividend of 2 next year. If investors require 9%, the implied constant dividend growth rate is:", "4%", "5%", "13%", "B",
    "From P = D1/(r − g): g = r − D1/P = 9% − 4% = 5%.", "A is the dividend yield. C adds instead of subtracting.", ""]
]);

addQ("QM-03", [
  ["e", "Annual returns are normal with mean 8% and standard deviation 10%. The approximate 95% interval for next year's return is:", "−2.0% to 18.0%", "−11.6% to 27.6%", "−17.8% to 33.8%", "B",
    "Mean ± 1.96σ = 8% ± 19.6%.", "A is ±1σ (~68%). C is ±2.58σ (99%).", "68% ↔ 1σ, 90% ↔ 1.645σ, 95% ↔ 1.96σ, 99% ↔ 2.58σ."],
  ["f", "A data set of returns contains a few extreme outliers. Which measure of central tendency is LEAST affected?", "Arithmetic mean", "Median", "Range", "B",
    "The median depends only on the middle value(s), not on extreme values.", "A is pulled toward outliers. C is a dispersion measure, not central tendency.", ""],
  ["a", "Three annual returns are 2%, 4% and 6%. The SAMPLE standard deviation is:", "2.00%", "1.63%", "4.00%", "A",
    "Mean 4%; squared deviations 4 + 0 + 4 = 8; sample variance = 8/(3 − 1) = 4; s = 2%.", "B divides by n (population formula). C is the variance, not the standard deviation.", "Sample → divide by n − 1."],
  ["a", "In a positively skewed return distribution, which relationship most likely holds?", "Mean < median", "Mean > median", "Mean = median", "B",
    "A long right tail pulls the mean above the median (mean > median > mode).", "A describes negative skew. C describes a symmetric distribution.", ""],
  ["a", "A return distribution has excess kurtosis of +2.0. Compared with a normal distribution, it is:", "Platykurtic, with thinner tails", "Leptokurtic, with fatter tails", "Mesokurtic", "B",
    "Positive excess kurtosis = leptokurtic: more extreme outcomes than the normal distribution.", "A has negative excess kurtosis. C has zero excess kurtosis.", "Fat tails = more extreme gains AND losses."],
  ["a", "Fund X: mean return 10%, standard deviation 15%. Fund Y: mean 8%, standard deviation 10%. Which has LESS risk per unit of return?", "Fund X", "Fund Y", "They are equal", "B",
    "Coefficient of variation = σ / mean: X = 1.50, Y = 1.25. Lower CV = less risk per unit of return.", "", ""]
]);

addQ("QM-04", [
  ["a", "An analyst forecasts EPS of 2.00 (probability 30%), 1.50 (50%) or 1.00 (20%). Expected EPS is:", "1.50", "1.55", "1.60", "B",
    "E(EPS) = 0.3(2.00) + 0.5(1.50) + 0.2(1.00) = 1.55.", "A is the most likely value. C is a simple average-type error.", ""],
  ["a", "Using the same EPS forecast (2.00 at 30%, 1.50 at 50%, 1.00 at 20%), the standard deviation of EPS is:", "0.35", "0.1225", "0.50", "A",
    "Variance = 0.3(0.45²) + 0.5(0.05²) + 0.2(0.55²) = 0.1225; σ = √0.1225 = 0.35.", "B is the variance. C is the range divided by 2.", ""],
  ["e", "There is a 40% chance a firm beats earnings. If it beats, the stock rises with probability 80%; if not, with probability 30%. The stock rose. The updated probability that the firm beat earnings is:", "0.32", "0.64", "0.80", "B",
    "Bayes: P(beat | up) = (0.4 × 0.8) / (0.4 × 0.8 + 0.6 × 0.3) = 0.32 / 0.50 = 0.64.", "A is the joint probability P(beat and up). C is P(up | beat), the reverse conditional.", "Don't confuse P(A|B) with P(B|A)."],
  ["f", "By the total probability rule for expected value, an unconditional expected value equals:", "The sum of conditional expected values weighted by scenario probabilities", "The largest conditional expected value", "The simple average of the conditional expected values", "A",
    "E(X) = Σ E(X | Sᵢ) × P(Sᵢ).", "B ignores probabilities. C assumes equal probabilities.", ""]
]);

addQ("QM-05", [
  ["f", "Combining two risky assets gives the GREATEST risk reduction when their correlation is:", "+1.0", "0.0", "−1.0", "C",
    "At −1 the assets move in exactly opposite directions, so risks offset the most.", "A gives no diversification. B helps, but less than −1.", ""],
  ["a", "Two assets have standard deviations of 20% and 10% and a correlation of 0.5. Their covariance is:", "0.010", "0.020", "0.100", "A",
    "Cov = ρ × σ₁ × σ₂ = 0.5 × 0.20 × 0.10 = 0.010.", "B forgets the correlation. C is an arithmetic error.", ""],
  ["f", "A portfolio is 60% in a stock fund expected to return 10% and 40% in a bond fund expected to return 6%. Its expected return is:", "8.0%", "8.4%", "16.0%", "B",
    "E(Rp) = 0.6 × 10% + 0.4 × 6% = 8.4%.", "A is a simple average. C adds the returns.", ""],
  ["e", "An investor's minimum acceptable return is 3%. Portfolio A: E(R) 9%, σ 12%. Portfolio B: E(R) 7%, σ 6%. Using Roy's safety-first criterion, she should choose:", "Portfolio A", "Portfolio B", "Either — they are equal", "B",
    "SFRatio = (E(R) − threshold)/σ: A = 0.50, B = 0.67. Higher SFRatio = lower probability of falling below 3%.", "A has the higher return but a lower safety-first ratio.", "It's like a Sharpe ratio with the threshold replacing the risk-free rate."],
  ["a", "A 50/50 portfolio holds assets with σ = 20% and σ = 10%. If their correlation is +1, the portfolio standard deviation is:", "15.0%", "11.2%", "5.0%", "A",
    "With ρ = +1, portfolio σ is the weighted average: 0.5(20%) + 0.5(10%) = 15%.", "B is the answer if ρ = 0. C would require ρ = −1 and different weights.", ""]
]);

addQ("QM-06", [
  ["f", "The lognormal distribution is commonly used to model asset PRICES because it:", "Is bounded below by zero", "Is symmetric", "Allows negative values", "A",
    "Prices cannot fall below zero; a lognormal variable is always positive and right-skewed.", "B and C describe the normal distribution, which allows negative prices.", "Continuously compounded RETURNS are normal; PRICES are lognormal."],
  ["f", "Monte Carlo simulation is best described as:", "Repeatedly drawing random values from specified probability distributions", "Resampling the observed data with replacement", "Solving a pricing formula analytically", "A",
    "Monte Carlo generates thousands of scenarios from assumed distributions of the risk factors.", "B describes bootstrap resampling. C is the opposite of simulation.", ""],
  ["a", "The key difference between bootstrap resampling and Monte Carlo simulation is that bootstrap:", "Draws from the actual observed data rather than an assumed distribution", "Requires the data to be normally distributed", "Cannot be used for investment problems", "A",
    "Bootstrap treats the sample as the population and resamples it with replacement.", "B: no distribution needs to be assumed. C: it is widely used in finance.", ""],
  ["e", "Daily continuously compounded returns are +0.5%, −0.2% and +0.3%. The 3-day continuously compounded return is:", "0.60%", "0.20%", "0.10%", "A",
    "Continuously compounded returns are additive over time: 0.5 − 0.2 + 0.3 = 0.6%.", "B and C are arithmetic slips.", "Additivity is why cc returns are convenient for multi-period analysis."]
]);

addQ("QM-07", [
  ["f", "According to the central limit theorem, for a large sample (n ≥ 30) the distribution of the sample mean is approximately:", "Normal, regardless of the population's distribution", "Identical to the population distribution", "Uniform", "A",
    "The CLT says sample means are approximately normal with mean μ and variance σ²/n.", "B: the population may be skewed; the sampling distribution of the mean is still normal. C is wrong.", ""],
  ["a", "A population of returns has a standard deviation of 20%. For a sample of 100 observations, the standard error of the sample mean is:", "2.0%", "0.2%", "20.0%", "A",
    "SE = σ / √n = 20% / 10 = 2%.", "B divides by n. C ignores sample size.", ""],
  ["a", "An analyst divides a bond index into groups by sector and maturity and then randomly samples from each group in proportion to its weight. This is:", "Simple random sampling", "Stratified random sampling", "Cluster sampling", "B",
    "Stratified sampling draws from every subgroup (stratum) so the sample mirrors the population.", "A ignores the groups. C would sample entire groups, not from each group.", ""],
  ["e", "Which statement about resampling methods is MOST accurate?", "The jackknife leaves out one observation at a time and samples without replacement", "The bootstrap samples without replacement", "Both methods require a known population distribution", "A",
    "Jackknife: n subsamples of size n − 1, without replacement. Bootstrap: draws with replacement.", "B is reversed. C: neither requires a known distribution.", ""]
]);

addQ("QM-08", [
  ["f", "A Type I error occurs when a researcher:", "Rejects a true null hypothesis", "Fails to reject a false null hypothesis", "Rejects a false null hypothesis", "A",
    "Type I = false positive. Its probability is the significance level α.", "B is a Type II error. C is a correct decision.", ""],
  ["a", "The power of a test is:", "The probability of correctly rejecting a false null hypothesis", "The probability of a Type I error", "One minus the significance level", "A",
    "Power = 1 − P(Type II error).", "B is α. C is the confidence level.", ""],
  ["e", "H₀: mean return = 0. A sample of 64 months has a mean of 1.2% and a known σ of 4%. At the 5% significance level (two-tailed), the analyst should:", "Reject H₀, because z = 2.4 > 1.96", "Fail to reject H₀, because z = 0.3 < 1.96", "Fail to reject H₀, because z = 2.4 < 2.58", "A",
    "SE = 4%/√64 = 0.5%; z = 1.2/0.5 = 2.4 > 1.96 → reject.", "B forgets to divide σ by √n. C uses the 1% critical value.", ""],
  ["a", "A test statistic has a p-value of 0.03. The null hypothesis is rejected at the:", "5% level but not the 1% level", "1% level but not the 5% level", "1% and 5% levels", "A",
    "Reject when p-value < α: 0.03 < 0.05 but 0.03 > 0.01.", "", ""],
  ["f", "A nonparametric test is MOST appropriate when:", "The data are ranks and distribution assumptions are not met", "The population is known to be normal", "The sample is very large and normal", "A",
    "Nonparametric tests make few assumptions about the distribution and work with ranks or signs.", "B and C fit parametric tests.", ""]
]);

addQ("QM-09", [
  ["e", "A sample correlation of 0.40 is computed from 27 observations. Test H₀: ρ = 0 at 5% (critical t ≈ 2.06). The analyst should:", "Reject H₀ (t ≈ 2.18)", "Fail to reject H₀ (t ≈ 2.18)", "Fail to reject H₀ (t ≈ 0.44)", "A",
    "t = r√(n − 2) / √(1 − r²) = 0.4 × 5 / √0.84 = 2.18 > 2.06 → reject.", "B draws the wrong conclusion. C miscalculates t.", ""],
  ["f", "Which test is nonparametric?", "Spearman rank correlation test", "t-test of the Pearson correlation", "z-test of a mean", "A",
    "Spearman uses ranks, so it doesn't require normally distributed data.", "B and C are parametric.", ""],
  ["a", "An analyst wants to test whether a company's sector and whether it pays dividends are independent, using counts in a table. The appropriate test is:", "Chi-square test of independence", "Paired t-test", "F-test of variances", "A",
    "A contingency table of categorical counts is tested with the chi-square statistic.", "B compares paired means. C compares two variances.", ""],
  ["a", "A contingency table has 3 rows and 2 columns. The degrees of freedom for the chi-square test of independence is:", "2", "5", "6", "A",
    "df = (rows − 1)(columns − 1) = 2 × 1 = 2.", "B is cells − 1. C is the number of cells.", ""]
]);

addQ("QM-10", [
  ["f", "In the regression Y = b₀ + b₁X + ε, the slope b₁ measures:", "The change in Y for a one-unit change in X", "The value of Y when X = 0", "The correlation between X and Y", "A",
    "The slope is the sensitivity of Y to X.", "B is the intercept. C is a different (unitless) measure.", ""],
  ["a", "An estimated regression is Ŷ = 2 + 0.5X. When X = 6, the predicted Y is:", "3", "5", "8", "B",
    "Ŷ = 2 + 0.5 × 6 = 5.", "", ""],
  ["a", "In a regression, total sum of squares is 200 and the sum of squared errors is 50. The R² is:", "0.25", "0.75", "4.00", "B",
    "R² = (SST − SSE)/SST = 150/200 = 0.75: 75% of the variation in Y is explained by X.", "A is the unexplained share. C is SST/SSE.", ""],
  ["e", "A simple regression with 27 observations has SSE = 50. The standard error of estimate is closest to:", "1.41", "1.85", "2.00", "A",
    "SEE = √[SSE/(n − 2)] = √(50/25) = √2 = 1.41.", "C is the MSE (variance), not its square root.", ""],
  ["e", "A simple regression (27 observations) has a regression sum of squares of 150 and SSE of 50. The F-statistic is:", "3.0", "75.0", "150.0", "B",
    "F = MSR/MSE = (150/1) / (50/25) = 150/2 = 75.", "A is SSR/SSE. C forgets to divide by MSE.", ""],
  ["f", "Homoskedasticity in a linear regression means:", "The variance of the residuals is constant across observations", "The residuals are correlated with each other", "The independent variable is normally distributed", "A",
    "Constant residual variance is one of the key regression assumptions.", "B describes serial correlation. C is not a requirement.", ""]
]);

addQ("QM-11", [
  ["f", "The three classic characteristics of Big Data are:", "Volume, velocity and variety", "Validity, value and volatility", "Visibility, variance and volume", "A",
    "Big data is large (volume), arrives quickly (velocity) and comes in many forms (variety). Veracity is often added.", "", ""],
  ["f", "Training a model on loan data that is labeled \"defaulted\" or \"repaid\" is an example of:", "Supervised learning", "Unsupervised learning", "Deep reinforcement learning", "A",
    "Supervised learning uses labeled outcomes to learn a mapping from inputs to outputs.", "B finds structure in unlabeled data. C learns from rewards through trial and error.", ""],
  ["a", "A machine-learning model performs very well on training data but poorly on new data. The model is most likely:", "Overfitted", "Underfitted", "Well generalized", "A",
    "Overfitting = the model learned noise in the training data and doesn't generalize.", "B performs poorly even in-sample. C performs well out-of-sample.", ""],
  ["f", "Analyzing the tone of management's language in earnings call transcripts is an application of:", "Natural language processing", "Monte Carlo simulation", "Linear programming", "A",
    "NLP lets computers analyze and interpret human language, such as text and speech.", "", ""]
]);

// ---- Added to cover remaining LOS (SchweserNotes Book 1) ----
addQ("QM-01", [
  ["a", "An investor puts 1,000 into a fund each month. The unit price is 10 in month 1 and 20 in month 2. Her average cost per unit is closest to:", "15.00", "13.33", "14.14", "B",
    "Units bought: 100 + 50 = 150 for 2,000 → 13.33. This is the harmonic mean of the prices — the right average for cost averaging.", "A is the arithmetic mean. C is the geometric mean.", "Harmonic ≤ geometric ≤ arithmetic.", "", "LOS 1.b"],
  ["a", "A portfolio earned a nominal return of 8% while inflation was 3%. The real return is closest to:", "5.00%", "4.85%", "11.24%", "B",
    "(1.08 / 1.03) − 1 = 4.85%. Real return = growth in purchasing power.", "A is the approximation 8% − 3%. C multiplies instead of dividing.", "", "", "LOS 1.e"],
  ["e", "An investor has 100 of equity, borrows 50 at 4%, and invests all 150 in assets that return 10%. Her leveraged return on equity is:", "10%", "13%", "15%", "B",
    "Gain 15 − interest 2 = 13 on equity of 100 → 13%. Leverage helps because the asset return (10%) exceeds the borrowing cost (4%).", "A is the unlevered return. C ignores the interest cost.", "Leverage magnifies losses too.", "", "LOS 1.e"]
]);

addQ("QM-03", [
  ["e", "Monthly returns are 5%, −2%, 8% and −6%. Using a target of 0%, the target downside deviation (sample) is closest to:", "3.65%", "4.47%", "3.16%", "A",
    "Only returns below target count: (−2)² + (−6)² = 40. Divide by n − 1 = 3 → 13.33; √ = 3.65%.", "B divides by the number of below-target observations (2). C divides by n (4).", "Downside deviation ignores returns above the target.", "", "LOS 3.b"],
  ["a", "The correlation between ice-cream sales and stock returns in a sample is 0.6. The BEST conclusion is that:", "Correlation alone does not show that one causes the other", "Ice-cream sales cause higher stock returns", "The relationship must be nonlinear", "A",
    "Correlation measures linear co-movement only; it can be spurious or driven by a third variable.", "B confuses correlation with causation. C is not implied.", "", "", "LOS 3.d"]
]);

addQ("QM-10", [
  ["e", "A regression slope is estimated at 0.80 with a standard error of 0.25. The critical t-value is 2.0. Testing H₀: b₁ = 0, the analyst should:", "Reject H₀ because t = 3.2", "Fail to reject H₀ because t = 0.31", "Fail to reject H₀ because t = 3.2", "A",
    "t = (0.80 − 0)/0.25 = 3.2 > 2.0 → the slope is statistically significant.", "B inverts the ratio. C draws the wrong conclusion.", "", "", "LOS 10.c"],
  ["a", "In the log-lin model ln(Y) = b₀ + b₁X, the slope b₁ is interpreted as the:", "Relative (percentage) change in Y for a one-unit change in X", "Absolute change in Y for a one-unit change in X", "Absolute change in Y for a 1% change in X", "A",
    "Taking logs of Y turns the slope into a growth-rate effect — useful for data that grow exponentially.", "B is the lin-lin model. C is the lin-log model.", "", "", "LOS 10.f"]
]);

addQ("QM-11", [
  ["f", "Which is the BEST example of fintech applied to investment management?", "Using algorithms to execute trades automatically", "Printing quarterly reports", "Holding cash in a bank vault", "A",
    "Fintech covers technology-driven innovation in financial services, such as algorithmic trading and robo-advice.", "", "", "", "LOS 11.a"]
]);

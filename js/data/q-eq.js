// Equity Investments — original practice questions
addQ("EQ-01", [
  ["a", "An investor buys shares at 50 using 40% initial margin. The price rises to 60. Ignoring interest and dividends, her return on equity is:", "20%", "50%", "33.3%", "B",
    "Equity per share = 20; gain = 10; return = 10/20 = 50%. Leverage = 1/0.40 = 2.5×.", "A is the unlevered return.", ""],
  ["e", "Shares bought at 50 with 50% initial margin; maintenance margin 25%. A margin call occurs below:", "25.00", "33.33", "37.50", "B",
    "P = P0 × (1 − IM)/(1 − MM) = 50 × 0.5/0.75 = 33.33.", "A halves the price. C uses P0 × 0.75.", ""],
  ["f", "A limit order to buy at 20 will execute:", "Only at 20 or lower", "At the best available price, whatever it is", "Only when the price rises above 20", "A",
    "Limit orders set the worst acceptable price.", "B describes a market order.", ""],
  ["a", "An investor holds a stock at 40 and places a stop-loss sell order at 35. The order:", "Becomes a sell order if the price falls to 35", "Sells immediately at 35", "Buys more shares at 35", "A",
    "A stop order is triggered when the stop price is reached; execution may be below 35 in a fast market.", "", ""],
  ["f", "A company selling new shares to investors for the first time takes place in the:", "Primary market", "Secondary market", "Over-the-counter market only", "A",
    "Primary market = issuers raise new capital. Secondary market = investors trade existing securities.", "", ""],
  ["a", "A short seller profits when the stock price:", "Falls", "Rises", "Stays the same and pays dividends", "A",
    "Short sellers borrow and sell shares, hoping to buy them back cheaper. They must also pay any dividends to the lender.", "", ""]
]);

addQ("EQ-02", [
  ["e", "A price-weighted index has stocks priced 10, 20 and 90. If only the 90 stock rises 10%, the index rises by:", "3.33%", "7.50%", "10.00%", "B",
    "(10 + 20 + 90)/3 = 40 → (10 + 20 + 99)/3 = 43; +7.5%.", "A assumes equal weights. C assumes the index tracks that stock.", "High-priced stocks dominate."],
  ["a", "A market-cap-weighted index has stock A (cap 600) and stock B (cap 400). A rises 10%, B falls 5%. The index return is:", "2.5%", "4.0%", "5.0%", "B",
    "0.6 × 10% + 0.4 × (−5%) = 4.0%.", "A is the equal-weighted return.", ""],
  ["a", "Using the same two stocks (A +10%, B −5%), an EQUAL-weighted index returns:", "2.5%", "4.0%", "7.5%", "A",
    "(10% − 5%)/2 = 2.5%.", "", ""],
  ["f", "A total return index differs from a price return index because it also includes:", "Reinvested dividends and interest", "Only capital gains", "Management fees", "A",
    "Total return = price change + income.", "", ""],
  ["f", "Changing which securities are in an index (adding and removing constituents) is called:", "Reconstitution", "Rebalancing", "Indexing", "A",
    "Rebalancing adjusts weights; reconstitution changes membership.", "", ""]
]);

addQ("EQ-03", [
  ["f", "If a market is semi-strong form efficient, which approach CANNOT consistently earn abnormal returns?", "Fundamental analysis of public information", "Trading on genuine inside information", "Neither — all approaches work", "A",
    "Prices already reflect all public information.", "B: only strong form rules out private information.", ""],
  ["f", "Weak-form efficiency implies that investors cannot earn abnormal returns using:", "Past prices and trading volume (technical analysis)", "Inside information", "Any information at all", "A",
    "Weak form: prices reflect all past market data.", "", ""],
  ["a", "In a highly efficient market, the most sensible strategy for most investors is:", "Low-cost passive investing", "Frequent stock picking", "Market timing", "A",
    "If prices are fair, active strategies' costs reduce net returns.", "", ""],
  ["a", "A pattern of small-cap stocks outperforming in January is an example of a:", "Calendar anomaly", "Strong-form inefficiency", "Behavioral bias", "A",
    "Calendar anomalies are return patterns tied to time periods; many weaken once known.", "", ""]
]);

addQ("EQ-04", [
  ["f", "Compared with common shares, preferred shares typically:", "Have priority for dividends but no voting rights", "Have voting rights but no dividend priority", "Have unlimited upside", "A",
    "Preferred shareholders receive fixed dividends before common shareholders.", "", ""],
  ["a", "A company skipped preferred dividends last year. Before paying common dividends this year, it must pay arrears on:", "Cumulative preferred shares", "Non-cumulative preferred shares", "Common shares", "A",
    "Cumulative preferred dividends in arrears must be paid first.", "", ""],
  ["a", "A stock's market price is 30 and book value per share is 20. The price-to-book ratio is:", "0.67", "1.5", "10", "B",
    "P/B = 30/20 = 1.5 — the market values the firm above its accounting equity.", "", ""],
  ["e", "A sponsored depositary receipt (DR) differs from an unsponsored DR mainly because:", "The issuing company is involved and DR holders usually get voting rights", "It trades only in the home country", "It never pays dividends", "A",
    "In sponsored DRs the foreign company works with the depository bank.", "", ""]
]);

addQ("EQ-05", [
  ["f", "A company analysis typically starts by understanding the company's:", "Business model, revenue drivers and cost structure", "Share price chart", "Auditor's fees", "A",
    "You need to know how the company makes money before forecasting.", "", ""],
  ["a", "A coffee chain sells 2 million cups at 3 each. Revenue is best analyzed as:", "Volume × price", "Assets × turnover", "Equity × leverage", "A",
    "Breaking revenue into volume and price shows which driver changed.", "", ""],
  ["a", "A company's gross margin fell while revenue grew. The most likely cause is:", "Input costs rose faster than prices", "Lower interest expense", "Higher tax rate", "A",
    "Gross margin = (revenue − COGS)/revenue; it falls when COGS grows faster than revenue.", "B and C are below gross profit.", ""]
]);

addQ("EQ-06", [
  ["f", "Which is one of Porter's five competitive forces?", "Threat of substitute products", "Interest rate risk", "Currency risk", "A",
    "The five forces: rivalry, new entrants, substitutes, buyer power, supplier power.", "", ""],
  ["a", "An industry with slow growth, consolidation and stable market shares is most likely in the:", "Embryonic stage", "Growth stage", "Mature stage", "C",
    "Mature industries grow with the economy and compete on cost.", "", ""],
  ["a", "High barriers to entry in an industry most likely lead to:", "Greater pricing power for existing firms", "More price competition", "Lower profitability", "A",
    "Fewer new competitors protect margins.", "", ""],
  ["e", "Which industry is MOST likely classified as defensive?", "Electric utilities", "Luxury goods", "Automobile manufacturing", "A",
    "Demand for essential services is stable through the business cycle.", "B and C are cyclical.", ""]
]);

addQ("EQ-07", [
  ["a", "Revenue this year is 1,000 and is expected to grow 10%. The EBIT margin is forecast at 15%. Forecast EBIT is:", "150", "165", "110", "B",
    "Revenue = 1,100; EBIT = 1,100 × 15% = 165.", "A uses this year's revenue.", ""],
  ["f", "Unusually high profit margins in a competitive industry are expected over time to:", "Mean-revert toward the industry average", "Keep rising", "Stay fixed forever", "A",
    "Competition tends to erode excess margins.", "", ""],
  ["a", "Changing one input (for example, revenue growth) and observing the effect on the forecast is:", "Sensitivity analysis", "Scenario analysis", "Monte Carlo simulation", "A",
    "Sensitivity analysis varies one assumption at a time.", "B changes several assumptions together.", ""]
]);

addQ("EQ-08", [
  ["a", "A stock just paid a dividend of 2.00, growing at 5% forever; required return 10%. Its value is:", "40.00", "42.00", "21.00", "B",
    "V0 = D1/(r − g) = 2.10/0.05 = 42.", "A uses D0. C divides by r.", "\"Just paid\" = D0."],
  ["f", "A perpetual preferred share pays 5 per year; required return 8%. Its value is:", "62.50", "40.00", "54.00", "A",
    "V = D/r = 62.50.", "", ""],
  ["a", "A stock trades at 40 and EPS is 2.50. The P/E ratio is:", "16.0", "6.25%", "100", "A",
    "P/E = 40/2.5 = 16.", "B is the earnings yield.", ""],
  ["e", "Payout ratio 40%, required return 10%, growth 6%. The justified forward P/E is:", "4.0", "10.0", "6.7", "B",
    "P0/E1 = payout/(r − g) = 0.40/0.04 = 10.", "", ""],
  ["a", "Market cap 800, debt 300, cash 100, EBITDA 125. EV/EBITDA is:", "8.0×", "6.4×", "9.6×", "A",
    "EV = 800 + 300 − 100 = 1,000; 1,000/125 = 8.0.", "B uses market cap only. C forgets to subtract cash.", ""],
  ["f", "Asset-based valuation is MOST appropriate for:", "A company being liquidated or a holding company", "A fast-growing software company", "A company with mostly intangible assets", "A",
    "When assets can be valued reliably and are the main value source.", "", ""]
]);

// ---- Added to cover remaining LOS (SchweserNotes Book 2) ----
addQ("EQ-01", [
  ["f", "Which is a main function of the financial system?", "Allowing people to save, borrow and share risk", "Setting product prices", "Collecting income taxes", "A",
    "It also determines equilibrium interest rates and allocates capital.", "", "", "", "LOS 39.a"],
  ["a", "A \"good-till-cancelled\" order is an example of a:", "Validity instruction", "Execution instruction", "Clearing instruction", "A",
    "Validity instructions say WHEN an order may be filled; execution instructions say HOW (market, limit).", "", "", "", "LOS 39.g"],
  ["a", "A financial system is operationally efficient when:", "Trading costs are low", "Prices reflect all information", "There are no regulations", "A",
    "Informational efficiency is about prices; operational efficiency is about costs.", "B describes informational efficiency.", "", "", "LOS 39.k"],
  ["f", "A dealer differs from a broker because a dealer:", "Trades from its own inventory", "Only finds counterparties for clients", "Cannot hold securities", "A",
    "Brokers act as agents; dealers act as principals.", "", "", "", "LOS 39.d"]
]);

addQ("EQ-02", [
  ["a", "An index rises from 100 to 104 and its stocks pay dividends worth 1 index point. Price return and total return are:", "4% and 5%", "5% and 4%", "4% and 4%", "A",
    "Price return ignores income; total return adds the dividends.", "", "", "", "LOS 40.b"],
  ["a", "A float-adjusted market-cap index weights each stock by:", "Shares available to the public times price", "All shares outstanding times price", "Price only", "A",
    "Shares held by insiders or governments are excluded.", "", "", "", "LOS 40.d"],
  ["e", "Compared with equity indexes, fixed-income indexes are harder to build and replicate mainly because:", "There are very many issues that change frequently and trade rarely", "Bonds have no prices", "Bonds never mature", "A",
    "Large universes, high turnover and illiquidity make bond indexes costly to track.", "", "", "", "LOS 40.j"]
]);

addQ("EQ-03", [
  ["f", "If an analyst estimates a stock's intrinsic value at 50 and it trades at 42, the analyst believes the stock is:", "Undervalued", "Overvalued", "Fairly valued", "A",
    "Market value below estimated intrinsic value suggests a buying opportunity — if the estimate is right.", "", "", "", "LOS 41.b"],
  ["a", "Which factor most likely REDUCES market efficiency?", "Limits on short selling", "Many active, informed participants", "Low trading costs", "A",
    "Restrictions on arbitrage let mispricings persist.", "", "", "", "LOS 41.c"]
]);

addQ("EQ-04", [
  ["a", "Compared with common stock of the same company, preferred stock generally has:", "Lower risk and lower expected return", "Higher risk and higher expected return", "Identical risk", "A",
    "Preferred dividends are fixed and paid first, so return potential is limited.", "", "", "", "LOS 42.e"],
  ["e", "A company's ROE is 15% but investors require only 10%. This suggests that:", "The company is creating value for shareholders", "The company is destroying value", "The share price must fall", "A",
    "ROE is an accounting return; cost of equity is the market's required return. ROE above it signals value creation.", "", "", "", "LOS 42.h"]
]);

addQ("EQ-05", [
  ["a", "Working capital that grows much faster than revenue most likely indicates:", "Cash being tied up in receivables or inventory", "Better cash generation", "Lower capital needs", "A",
    "Analysts check whether growth is consuming cash.", "", "", "", "LOS 43.d"]
]);

addQ("EQ-06", [
  ["f", "Commercial industry classification systems such as GICS group companies mainly by:", "Their principal business activity", "Their share price", "Their country only", "A",
    "Companies are classified by the products or services that generate most of their revenue.", "", "", "", "LOS 44.b"],
  ["a", "When estimating an industry's size and growth, an analyst would most likely look at:", "Total industry revenue and its historical growth relative to GDP", "One company's dividend", "The CEO's salary", "A",
    "Industry size and growth set the context for each company's forecast.", "", "", "", "LOS 44.c"]
]);

addQ("EQ-07", [
  ["a", "When forecasting capital expenditures, analysts often separate:", "Maintenance capex from growth capex", "Revenue from taxes", "Dividends from interest", "A",
    "Maintenance capex keeps existing capacity; growth capex expands it.", "", "", "", "LOS 45.d"]
]);

addQ("EQ-08", [
  ["a", "A stock trades at 60 and the company pays a 20% stock dividend. All else equal, the share price should become:", "60", "50", "48", "B",
    "Shares rise by 20% with no change in company value: 60/1.2 = 50. Shareholders' wealth is unchanged.", "C applies a 20% price cut instead of dividing.", "", "", "LOS 46.c"],
  ["f", "An investor who buys a stock ON the ex-dividend date:", "Does not receive the upcoming dividend", "Receives the upcoming dividend", "Receives double the dividend", "A",
    "Buyers on or after the ex-dividend date aren't on the holder-of-record list in time.", "", "", "", "LOS 46.d"],
  ["e", "The constant-growth (Gordon) model is MOST appropriate for a company that:", "Is mature and pays dividends growing at a stable rate below the required return", "Pays no dividends", "Is growing at 40% a year", "A",
    "The model needs g < r and steady, sustainable growth.", "", "", "", "LOS 46.i"]
]);

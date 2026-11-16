// Derivatives — original practice questions
addQ("DER-01", [
  ["f", "Compared with exchange-traded derivatives, over-the-counter (OTC) derivatives are:", "Customized, with more counterparty risk", "Standardized and centrally cleared", "Always cheaper to trade", "A",
    "OTC contracts are tailored to each party and traditionally lack a clearinghouse guarantee.", "B describes exchange-traded contracts.", ""],
  ["a", "Central clearing of derivatives mainly reduces:", "Counterparty credit risk", "Market risk", "Basis risk", "A",
    "The clearinghouse becomes the counterparty to both sides and requires margin.", "", ""],
  ["f", "A derivative's value is derived from:", "An underlying asset, rate or index", "The issuer's credit rating only", "The derivative's own past prices", "A",
    "Underlyings include stocks, bonds, rates, currencies, commodities and credit.", "", ""]
]);

addQ("DER-02", [
  ["f", "Which contract gives its holder the right, but not the obligation, to buy an asset?", "Forward", "Futures", "Call option", "C",
    "Options are contingent claims; forwards and futures are firm commitments.", "", ""],
  ["a", "You buy a call (strike 50) for a premium of 3. At expiration the stock is 58. Your profit is:", "8", "5", "11", "B",
    "Payoff = max(0, 58 − 50) = 8; profit = 8 − 3 = 5.", "A is the payoff. C adds the premium.", "Payoff ≠ profit."],
  ["e", "You SELL a put (strike 40) for a premium of 2. Your maximum possible loss is:", "2", "38", "40", "B",
    "If the stock goes to 0: lose 40, keep 2 → 38.", "A is the maximum gain.", ""],
  ["a", "An interest rate swap can be viewed as:", "A series of forward contracts", "A single option", "A share of stock", "A",
    "Each exchange of payments is like a forward on the reference rate.", "", ""],
  ["f", "In a credit default swap, the protection BUYER:", "Pays a periodic premium and is compensated if a credit event occurs", "Receives premiums and pays if a credit event occurs", "Owns the reference bond's coupons", "A",
    "The CDS works like insurance against default.", "B describes the protection seller.", ""]
]);

addQ("DER-03", [
  ["f", "Which is a commonly cited benefit of derivatives markets?", "Lower transaction costs and better price discovery", "Elimination of all risk", "Guaranteed profits", "A",
    "Derivatives let investors transfer risk efficiently and reveal expected prices.", "", ""],
  ["a", "A company has fixed-rate debt but wants floating-rate exposure. It would most likely enter a swap to:", "Receive fixed and pay floating", "Pay fixed and receive floating", "Buy a call option", "A",
    "Receiving fixed offsets its fixed coupons, leaving it paying floating.", "B would convert floating debt into fixed.", ""],
  ["e", "A hedge using a futures contract whose underlying differs from the exposure being hedged creates:", "Basis risk", "No risk at all", "Only credit risk", "A",
    "The hedge and the exposure may not move together perfectly.", "", ""]
]);

addQ("DER-04", [
  ["a", "A non-dividend asset trades at 100; the risk-free rate is 5%. The no-arbitrage 1-year forward price is:", "100.00", "105.00", "95.24", "B",
    "F = S × (1 + r)^T = 105.", "A ignores carry. C discounts instead of compounding.", ""],
  ["a", "A stock trades at 100 and will pay dividends with a present value of 3 during the year. With r = 5%, the 1-year forward price is closest to:", "105.00", "101.85", "108.15", "B",
    "F = (S − PV of income) × (1 + r) = 97 × 1.05 = 101.85. Income lowers the forward price.", "A ignores dividends. C adds them.", ""],
  ["e", "The fair 1-year forward price is 105, but a dealer quotes 108. An arbitrageur would:", "Sell the forward, borrow to buy the asset now", "Buy the forward, short the asset now", "Do nothing", "A",
    "The forward is overpriced: buy spot (cost 105 with financing), deliver at 108, earn 3 riskless (cash-and-carry).", "B applies when the forward is underpriced.", ""],
  ["f", "All else equal, storage costs for a commodity make its forward price:", "Higher", "Lower", "Unchanged", "A",
    "Holding the asset costs money, so the forward must compensate the seller.", "", ""]
]);

addQ("DER-05", [
  ["f", "At initiation, the value of a forward contract to both parties is:", "Zero", "The forward price", "The spot price", "A",
    "The forward price is set so neither side pays anything upfront.", "", ""],
  ["e", "You entered a long forward at 105. Six months later the forward price for the same delivery date is 108 and the rate is 5% annually. The contract's value to you is closest to:", "3.00", "2.93", "3.15", "B",
    "Value = (108 − 105)/1.05^0.5 = 2.93: the gain is received at maturity, so discount it.", "A forgets to discount. C compounds.", ""],
  ["a", "A borrower who wants to lock in a future borrowing rate would:", "Buy (go long) a forward rate agreement", "Sell an FRA", "Buy a put on stocks", "A",
    "A long FRA gains if rates rise, offsetting higher borrowing costs.", "", ""]
]);

addQ("DER-06", [
  ["f", "Compared with forwards, futures contracts are:", "Customized and OTC", "Standardized, exchange-traded and marked to market daily", "Free of margin", "B",
    "Futures settle gains and losses daily through the clearinghouse.", "A describes forwards.", ""],
  ["a", "You are long one futures contract on 100 units. The futures price rises from 50 to 52 today. Your margin account:", "Is credited 200", "Is debited 200", "Doesn't change until expiration", "A",
    "Gain = (52 − 50) × 100 = 200, settled today.", "", ""],
  ["e", "Initial margin is 2,000 and maintenance margin is 1,500. After a loss of 700, the trader must deposit:", "200", "500", "700", "C",
    "Balance = 1,300 < 1,500, so the trader must restore the account to the INITIAL margin: 2,000 − 1,300 = 700.", "A tops up only to maintenance. B is the margin difference.", "Variation margin restores to initial margin."],
  ["f", "As expiration approaches, a futures price:", "Converges to the spot price", "Diverges from the spot price", "Becomes zero", "A",
    "Otherwise there would be an arbitrage at delivery.", "", ""]
]);

addQ("DER-07", [
  ["f", "At inception, a plain-vanilla interest rate swap's fixed rate is set so that:", "The PV of fixed payments equals the PV of expected floating payments", "The fixed rate equals today's floating rate", "One party pays an upfront fee", "A",
    "The swap has zero value at the start.", "", ""],
  ["a", "After entering a pay-fixed, receive-floating swap, interest rates rise. The swap's value to the fixed payer:", "Increases", "Decreases", "Stays zero", "A",
    "Floating receipts rise while the fixed payments stay the same.", "", ""],
  ["a", "A swap is most similar to:", "A portfolio of forward contracts", "A portfolio of call options", "A zero-coupon bond only", "A",
    "Each settlement date is like a forward on the reference rate.", "", ""]
]);

addQ("DER-08", [
  ["f", "A call has a strike of 50 and the stock is at 55. The call's intrinsic (exercise) value is:", "0", "5", "55", "B",
    "max(0, S − X) = 5.", "", ""],
  ["a", "The same call (S = 55, X = 50) trades at 7. Its time value is:", "2", "5", "7", "A",
    "Time value = premium − intrinsic value = 7 − 5 = 2.", "", ""],
  ["a", "An increase in the underlying's volatility will:", "Increase both call and put values", "Increase calls but decrease puts", "Decrease both", "A",
    "More volatility raises the chance of large favorable moves for option holders.", "", ""],
  ["e", "All else equal, a higher risk-free rate:", "Increases call values and decreases put values", "Decreases call values and increases put values", "Has no effect", "A",
    "It lowers the PV of the exercise price: good for call buyers, bad for put buyers.", "", ""]
]);

addQ("DER-09", [
  ["e", "Stock = 100, strike = 100, PV of strike = 95.24, European call = 10. The European put is worth:", "5.24", "14.76", "10.00", "A",
    "P = C + PV(X) − S = 10 + 95.24 − 100 = 5.24.", "B is a sign error.", "S + P = C + PV(X)."],
  ["a", "A protective put (long stock + long put) has the same payoff as:", "A long call plus a risk-free bond paying the strike", "A short call plus a short bond", "A long forward", "A",
    "S + P = C + PV(X): the fiduciary call.", "", ""],
  ["f", "Put–call parity as usually stated holds exactly for:", "European options on the same underlying, strike and expiration", "Any American options", "Options with different strikes", "A",
    "Early exercise of American options breaks the exact relationship.", "", ""]
]);

addQ("DER-10", [
  ["e", "A stock at 100 can move up to 120 or down to 80 in one period; the risk-free rate is 5%. A call with strike 100 is worth closest to:", "10.00", "11.90", "12.50", "B",
    "π = (1.05 − 0.8)/(1.2 − 0.8) = 0.625. C = (0.625 × 20 + 0.375 × 0)/1.05 = 11.90.", "A uses 50/50 probabilities without discounting. C doesn't discount.", ""],
  ["a", "In a one-period binomial model, the risk-neutral probability of an up move is:", "(1 + r − d)/(u − d)", "(u − d)/(1 + r)", "0.5 always", "A",
    "It makes the expected stock return equal the risk-free rate.", "", ""],
  ["a", "For the same stock (up 120, down 80) and call (strike 100), the hedge ratio is:", "0.25", "0.50", "1.00", "B",
    "Δ = (20 − 0)/(120 − 80) = 0.5 shares per call.", "", ""]
]);

// Fixed Income — original practice questions
addQ("FI-01", [
  ["f", "The legal contract that sets out a bond's terms and the issuer's obligations is the:", "Indenture (trust deed)", "Prospectus summary", "Credit rating report", "A",
    "The indenture lists the terms, covenants and rights of bondholders.", "", ""],
  ["a", "Which is a NEGATIVE (restrictive) covenant?", "A limit on issuing additional debt", "A promise to pay interest on time", "A promise to maintain insurance on assets", "A",
    "Negative covenants prohibit or restrict actions; affirmative covenants require actions.", "B and C are affirmative covenants.", ""],
  ["f", "Compared with an unsecured bond, a secured bond is backed by:", "Specific assets pledged as collateral", "Only the issuer's reputation", "A government guarantee", "A",
    "Collateral improves recovery if the issuer defaults.", "", ""]
]);

addQ("FI-02", [
  ["f", "Compared with an otherwise identical option-free bond, a callable bond's price is:", "Higher", "Lower", "The same", "B",
    "Callable = straight bond − call option (owned by the issuer).", "A is true for a putable bond.", ""],
  ["a", "A floating-rate note pays the market reference rate plus a 120 bp spread. If the reference rate resets to 3.5%, the coupon rate is:", "3.50%", "4.70%", "4.20%", "B",
    "3.5% + 1.2% = 4.7%.", "", ""],
  ["f", "A sinking fund provision requires the issuer to:", "Retire part of the bond issue over time", "Pay all principal at maturity", "Convert bonds into shares", "A",
    "Gradual repayment lowers credit risk but adds reinvestment risk for holders.", "", ""],
  ["e", "Compared with an otherwise identical straight bond, a putable bond's price is:", "Higher, because the investor owns the put option", "Lower, because the issuer owns the option", "The same", "A",
    "Putable = straight bond + put option.", "", ""]
]);

addQ("FI-03", [
  ["f", "In an underwritten bond offering, the investment bank:", "Buys the whole issue and resells it, bearing the risk of unsold bonds", "Only tries its best to sell the bonds", "Guarantees the issuer's coupon payments", "A",
    "Underwriting transfers the placement risk to the bank.", "B is a best-efforts offering.", ""],
  ["a", "Shelf registration allows an issuer to:", "Register once and issue bonds in tranches over time", "Avoid all disclosure", "Issue only to retail investors", "A",
    "It saves time and cost for frequent issuers.", "", ""],
  ["f", "Most bonds trade in:", "Over-the-counter dealer markets", "Centralized stock exchanges", "Private auctions only", "A",
    "Bond trading is mainly OTC through dealers.", "", ""]
]);

addQ("FI-04", [
  ["f", "Commercial paper is best described as:", "Short-term, unsecured debt issued by companies", "Long-term secured debt", "A type of preferred stock", "A",
    "CP finances working capital and is often backed by bank liquidity lines.", "", ""],
  ["a", "In a repurchase agreement (repo), the party that sells the security and agrees to buy it back is:", "Borrowing cash using the security as collateral", "Lending cash", "Buying a call option", "A",
    "A repo is a collateralized short-term loan; the repo rate is the interest.", "", ""],
  ["a", "Compared with issuing bonds, borrowing through bank loans typically gives companies:", "More flexibility but often floating rates and covenants monitored by the bank", "No covenants", "Fixed rates only", "A",
    "Bank loans are private and flexible, commonly floating-rate.", "", ""]
]);

addQ("FI-05", [
  ["f", "A government's bonds in its OWN currency generally have low default risk because the government can:", "Raise taxes or create money to repay", "Never borrow again", "Ignore inflation", "A",
    "Control over taxation and the currency supports repayment ability.", "", ""],
  ["a", "A municipal bond repaid only from a toll bridge's revenues is a:", "Revenue bond", "General obligation bond", "Sovereign bond", "A",
    "Revenue bonds depend on the project's cash flows; GO bonds rely on the issuer's taxing power.", "", ""],
  ["a", "In a single-price government bond auction, all winning bidders:", "Pay the same price (yield)", "Pay their own bid prices", "Receive bonds for free", "A",
    "Everyone pays the clearing price.", "", ""]
]);

addQ("FI-06", [
  ["f", "A bond's coupon rate is higher than its market yield. The bond trades at:", "A discount", "Par", "A premium", "C",
    "Investors pay extra for a coupon above the required yield.", "A: coupon < yield. B: coupon = yield.", ""],
  ["a", "A 3-year bond with a 5% annual coupon (face 100) yields 6%. Its price is closest to:", "97.33", "102.78", "100.00", "A",
    "5/1.06 + 5/1.06² + 105/1.06³ = 97.33.", "B is the price at 4%.", "", "N=3, I/Y=6, PMT=5, FV=100, CPT PV"],
  ["e", "A 5-year zero-coupon bond (face 1,000) yields 4% annually. Its price is closest to:", "821.93", "800.00", "1,216.65", "A",
    "1,000/1.04⁵ = 821.93.", "B uses simple interest. C is the future value.", "", "N=5, I/Y=4, PMT=0, FV=1000, CPT PV"],
  ["a", "A bond pays a 6% annual coupon on 100 face. 90 days (30/360 basis) have passed since the last coupon. Accrued interest is:", "1.50", "6.00", "0.50", "A",
    "AI = 6 × 90/360 = 1.50. Full (dirty) price = flat price + accrued interest.", "", ""],
  ["f", "Matrix pricing is used to value bonds that:", "Rarely trade, by using yields of comparable bonds", "Trade every second", "Have no coupons", "A",
    "It interpolates from similar, actively traded bonds.", "", ""]
]);

addQ("FI-07", [
  ["a", "A bond pays an annual coupon of 6 (face 100) and trades at 95. Its current yield is:", "6.00%", "6.32%", "5.70%", "B",
    "6/95 = 6.32%.", "A is the coupon rate.", ""],
  ["a", "A corporate bond yields 6.2% and a government bond of the same maturity yields 4.5%. The G-spread is:", "17 bp", "170 bp", "1.7 bp", "B",
    "6.2% − 4.5% = 1.70% = 170 bp.", "", ""],
  ["a", "A bond's semiannual yield is 3.0%. Its effective annual yield is:", "6.00%", "6.09%", "3.00%", "B",
    "(1.03)² − 1 = 6.09%. 6.00% is the stated (bond-equivalent) yield.", "", ""],
  ["e", "Compared with the G-spread, the Z-spread:", "Is added to every point on the government spot curve", "Uses only one benchmark yield", "Ignores the timing of cash flows", "A",
    "The Z-spread is the constant spread over the spot curve that prices the bond.", "B describes the G-spread.", ""]
]);

addQ("FI-08", [
  ["e", "A floating-rate note has a quoted margin of 100 bp. The market now requires a discount margin of 150 bp. The note most likely trades:", "Above par", "At par", "Below par", "C",
    "When required margin > quoted margin, the note pays too little, so its price falls below par.", "", ""],
  ["a", "A 90-day T-bill (face 100) is quoted at a 4% discount rate (360-day year). Its price is:", "99.00", "96.00", "99.01", "A",
    "Price = 100 × (1 − 0.04 × 90/360) = 99.00.", "", ""],
  ["e", "The T-bill bought at 99.00 matures at 100 in 90 days. Its add-on money market yield (360-day basis) is closest to:", "4.00%", "4.04%", "4.10%", "B",
    "(100/99 − 1) × 360/90 = 4.04%. Add-on yields exceed discount rates because they're based on price, not face.", "", ""]
]);

addQ("FI-09", [
  ["a", "The 1-year spot rate is 3% and the 2-year spot rate is 4%. A 2-year, 5% annual coupon bond (face 100) is worth about:", "101.93", "100.00", "102.83", "A",
    "5/1.03 + 105/1.04² = 4.85 + 97.08 = 101.93.", "", ""],
  ["f", "An upward-sloping yield curve means:", "Longer maturities have higher yields", "Short-term yields exceed long-term yields", "All maturities have the same yield", "A",
    "Normal shape; an inverted curve is the opposite.", "", ""],
  ["e", "A par rate for a given maturity is:", "The coupon rate at which a bond would be priced at par using the spot curve", "The same as the forward rate", "Always equal to the 1-year spot rate", "A",
    "Par rates are derived from spot rates so that the bond's price equals 100.", "", ""]
]);

addQ("FI-10", [
  ["f", "When interest rates rise, a bondholder faces lower prices but:", "Higher reinvestment income on coupons", "Lower coupon reinvestment income", "No change in returns", "A",
    "Price risk and reinvestment risk offset each other.", "", ""],
  ["e", "An investor's horizon is SHORTER than the bond's Macaulay duration. If rates rise right after purchase, the horizon return will most likely be:", "Lower than the original yield", "Higher than the original yield", "Equal to the original yield", "A",
    "With a short horizon, price risk dominates reinvestment gains.", "B occurs when the horizon is longer than duration.", ""],
  ["a", "If a bond is held to maturity and rates rise, the realized return will be:", "Higher than the original YTM, due to higher reinvestment rates", "Lower than the original YTM", "Exactly zero", "A",
    "At maturity price risk disappears; coupons are reinvested at higher rates.", "", ""]
]);

addQ("FI-11", [
  ["e", "A bond has modified duration of 7. If its yield rises 50 bp, its price changes by approximately:", "−3.5%", "−7.0%", "+3.5%", "A",
    "−7 × 0.005 = −3.5%.", "B uses 100 bp. C has the wrong sign.", ""],
  ["a", "A bond's Macaulay duration is 5.3 and its yield is 6% (annual). Modified duration is:", "5.00", "5.30", "5.62", "A",
    "ModDur = MacDur/(1 + y) = 5.3/1.06 = 5.00.", "C multiplies instead of dividing.", ""],
  ["a", "A bond position has a full price of 2,000,000 and modified duration of 6. Its PVBP (price value of a basis point) is:", "120", "1,200", "12,000", "B",
    "Money duration = 6 × 2,000,000 = 12,000,000; per 1 bp = × 0.0001 = 1,200.", "", ""],
  ["f", "The Macaulay duration of a zero-coupon bond equals:", "Its time to maturity", "Zero", "Half its maturity", "A",
    "There is only one cash flow, at maturity.", "", ""],
  ["e", "All else equal, which bond has the LONGEST duration?", "Long maturity, low coupon, low yield", "Short maturity, high coupon, high yield", "Long maturity, high coupon, high yield", "A",
    "Duration rises with maturity and falls with higher coupon and higher yield.", "", ""]
]);

addQ("FI-12", [
  ["e", "A bond has modified duration 7 and convexity 60. If yields rise 100 bp, the estimated price change is:", "−7.0%", "−6.7%", "−7.3%", "B",
    "−7 × 0.01 + ½ × 60 × (0.01)² = −7% + 0.3% = −6.7%.", "A ignores convexity. C subtracts the convexity term.", "Positive convexity always helps."],
  ["f", "For an option-free bond, positive convexity means that for equal up and down yield changes:", "Price gains exceed price losses", "Price losses exceed price gains", "Gains and losses are equal", "A",
    "The price–yield curve bends upward.", "", ""],
  ["a", "A portfolio is 60% in bonds with duration 4 and 40% in bonds with duration 9. Portfolio duration is:", "6.0", "6.5", "5.0", "A",
    "0.6 × 4 + 0.4 × 9 = 6.0.", "", ""]
]);

addQ("FI-13", [
  ["f", "For a bond with embedded options, the appropriate duration measure is:", "Effective duration", "Macaulay duration", "Modified duration", "A",
    "Effective duration uses prices from a model with shifted benchmark curves, so it captures how cash flows change.", "", ""],
  ["a", "A bond is priced at 100. If the curve shifts down 50 bp, the price is 103.0; up 50 bp, 97.2. Effective duration is:", "5.8", "2.9", "11.6", "A",
    "(103.0 − 97.2)/(2 × 100 × 0.005) = 5.8.", "", ""],
  ["a", "Key rate duration measures sensitivity to:", "A change in yield at a specific maturity", "A parallel shift of the whole curve", "Credit spread changes", "A",
    "It captures exposure to non-parallel curve shifts.", "", ""],
  ["e", "When rates fall sharply, a callable bond exhibits:", "Negative convexity, because its price is capped near the call price", "Higher convexity than a straight bond", "No change in price", "A",
    "Upside is limited because the issuer is likely to call.", "", ""]
]);

addQ("FI-14", [
  ["a", "A bond has a 2% annual probability of default and an expected recovery rate of 40%. The expected loss is:", "0.8%", "1.2%", "2.0%", "B",
    "EL = PD × LGD = 2% × (1 − 40%) = 1.2%.", "A multiplies by the recovery rate. C ignores recovery.", ""],
  ["f", "The traditional \"Cs\" of credit analysis include:", "Capacity, capital, collateral and covenants", "Coupon, call, currency and convexity", "Cash, cost, cap and credit", "A",
    "These (plus character) assess a borrower's credit quality.", "", ""],
  ["a", "If an issuer's credit spread widens, its bond price will:", "Fall", "Rise", "Not change", "A",
    "A higher required yield lowers the price.", "", ""],
  ["e", "A subordinated bond of an issuer rated BBB is likely to be rated:", "Below BBB (notched down)", "Above BBB", "Exactly BBB always", "A",
    "Notching reflects lower priority and recovery.", "", ""]
]);

addQ("FI-15", [
  ["f", "Sovereign credit analysis considers both a government's:", "Ability and willingness to pay", "Share price and dividends", "Market share and brand", "A",
    "Political willingness matters as much as economic capacity.", "", ""],
  ["a", "All else equal, which factor most weakens a sovereign's credit quality?", "A rising debt-to-GDP ratio", "Strong institutions", "Large foreign reserves", "A",
    "Higher debt relative to the economy reduces repayment capacity.", "", ""],
  ["a", "A general obligation municipal bond is backed by:", "The issuer's taxing power", "A single project's revenue", "Corporate guarantees", "A",
    "GO bonds rely on the full faith and taxing authority of the issuer.", "", ""]
]);

addQ("FI-16", [
  ["a", "Debt is 600 and EBITDA is 150. The debt/EBITDA ratio is:", "4.0×", "0.25×", "9.0×", "A",
    "600/150 = 4.0. Higher = more leverage and credit risk.", "", ""],
  ["f", "In bankruptcy, which claim usually has the highest priority?", "Senior secured debt", "Subordinated debt", "Common equity", "A",
    "Secured creditors are paid first from their collateral.", "", ""],
  ["e", "All else equal, which change most improves a company's credit quality?", "Higher interest coverage (EBIT/interest)", "Higher debt/EBITDA", "Lower free cash flow", "A",
    "More earnings per unit of interest = more cushion.", "", ""]
]);

addQ("FI-17", [
  ["f", "In a securitization, the assets are transferred to a special purpose entity mainly to:", "Make them bankruptcy-remote from the originator", "Avoid paying investors", "Increase the originator's tax rate", "A",
    "If the originator fails, its creditors can't claim the SPE's assets.", "", ""],
  ["a", "A key benefit of securitization for banks is that it:", "Frees up capital to make new loans", "Eliminates all credit risk in the economy", "Guarantees higher returns", "A",
    "Selling loans converts illiquid assets to cash.", "", ""],
  ["f", "In credit tranching, the SENIOR tranche:", "Absorbs losses last", "Absorbs losses first", "Has the highest yield", "A",
    "Losses hit the subordinated (junior) tranches first.", "", ""]
]);

addQ("FI-18", [
  ["a", "Credit card receivable ABS are typically:", "Non-amortizing, with a lockout period", "Fully amortizing from the first month", "Backed by mortgages", "A",
    "During the lockout, principal repayments buy new receivables.", "", ""],
  ["a", "When collateral value exceeds the value of the securities issued, the structure uses:", "Overcollateralization (internal credit enhancement)", "A bank letter of credit (external enhancement)", "A call option", "A",
    "The extra collateral absorbs losses.", "", ""],
  ["e", "Excess spread in an ABS structure refers to:", "Interest collected on the collateral above what is paid to investors and fees", "The difference between two tranches' ratings", "A fee paid to rating agencies", "A",
    "It can be used to absorb losses — an internal credit enhancement.", "", ""]
]);

addQ("FI-19", [
  ["a", "When mortgage rates fall sharply, MBS investors face:", "Contraction risk — faster prepayments", "Extension risk — slower prepayments", "No prepayment risk", "A",
    "Homeowners refinance, returning principal early when reinvestment rates are low.", "B occurs when rates rise.", ""],
  ["a", "In a sequential-pay CMO, the first tranche:", "Receives all principal payments first and has the shortest life", "Receives principal last", "Has no prepayment risk at all", "A",
    "Sequential structures redistribute prepayment risk across tranches.", "", ""],
  ["e", "A conditional prepayment rate (CPR) of 6% per year corresponds to a single monthly mortality (SMM) closest to:", "0.50%", "0.51%", "0.60%", "B",
    "SMM = 1 − (1 − 0.06)^(1/12) = 0.514%.", "A divides 6% by 12 (ignores compounding).", ""]
]);

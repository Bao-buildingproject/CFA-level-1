// Financial English · Fixed Income — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("fi", [
  {
    id: "fi-01", type: "vocabulary", difficulty: "Beginner",
    term: "Bond", ipa: "/bɒnd/", vietnamese: "Trái phiếu",
    definition: "A debt security in which the issuer borrows money and promises to pay interest and repay the principal on set dates.",
    explanation: "Chứng khoán nợ: tổ chức phát hành vay tiền và cam kết trả lãi, hoàn trả nợ gốc vào những ngày xác định.",
    example: "A company issues a 5-year bond with a 6% coupon to finance a new plant.",
    relatedTerms: ["Coupon", "Par value", "Issuer"],
    cfaApplication: "Fixed-income analysis covers bond features, pricing, yield measures, interest rate risk and credit risk."
  },
  {
    id: "fi-02", type: "vocabulary", difficulty: "Beginner",
    term: "Coupon rate", ipa: "/ˈkuːpɒn reɪt/", vietnamese: "Lãi suất coupon (lãi suất danh nghĩa)",
    definition: "The annual interest rate stated on a bond, which is applied to its par value to calculate the interest payments.",
    explanation: "Lãi suất năm ghi trên trái phiếu, nhân với mệnh giá để tính tiền lãi định kỳ trả cho trái chủ.",
    example: "A $1,000 bond with a 6% coupon rate paid semiannually pays $30 every six months.",
    relatedTerms: ["Coupon payment", "Par value", "Current yield"],
    cfaApplication: "When the coupon rate equals the market discount rate, the bond is priced at par."
  },
  {
    id: "fi-03", type: "vocabulary", difficulty: "Beginner",
    term: "Par value", ipa: "/ˌpɑː ˈvæljuː/", vietnamese: "Mệnh giá",
    definition: "The amount the issuer promises to repay to bondholders at maturity; also called face value or principal.",
    explanation: "Số tiền tổ chức phát hành cam kết hoàn trả cho trái chủ khi đáo hạn; còn gọi là giá trị danh nghĩa hay nợ gốc.",
    example: "Most corporate bonds in the United States have a par value of $1,000.",
    relatedTerms: ["Face value", "Premium", "Discount"],
    cfaApplication: "Bond prices are often quoted as a percentage of par value; a quote of 98.50 means 98.5% of par."
  },
  {
    id: "fi-04", type: "vocabulary", difficulty: "Beginner",
    term: "Maturity", ipa: "/məˈtʃʊərəti/", vietnamese: "Ngày đáo hạn (kỳ hạn còn lại)",
    definition: "The date on which a bond's principal must be repaid, or the time remaining until that date.",
    explanation: "Ngày tổ chức phát hành phải hoàn trả nợ gốc của trái phiếu, hoặc khoảng thời gian còn lại đến ngày đó.",
    example: "A bond issued in 2026 that repays its principal in 2036 has a maturity of 10 years at issue.",
    relatedTerms: ["Tenor", "Term to maturity", "Duration"],
    cfaApplication: "Other things equal, a longer maturity makes a bond's price more sensitive to interest rates."
  },
  {
    id: "fi-05", type: "vocabulary", difficulty: "Intermediate",
    term: "Credit spread", ipa: "/ˈkredɪt spred/", vietnamese: "Chênh lệch lợi suất tín dụng",
    definition: "The additional yield a risky bond offers over a government bond of similar maturity, compensating investors for credit and liquidity risk.",
    explanation: "Phần lợi suất cao hơn mà trái phiếu có rủi ro trả so với trái phiếu chính phủ cùng kỳ hạn, để bù đắp rủi ro tín dụng và thanh khoản.",
    example: "A corporate bond yielding 6.2% when a similar government bond yields 4.0% has a credit spread of 220 basis points.",
    relatedTerms: ["Credit risk", "Benchmark yield", "Default"],
    cfaApplication: "Spreads widen when default risk or illiquidity rises, which lowers the prices of corporate bonds."
  },
  {
    id: "fi-06", type: "vocabulary", difficulty: "Beginner",
    term: "Credit rating", ipa: "/ˈkredɪt ˈreɪtɪŋ/", vietnamese: "Xếp hạng tín nhiệm",
    definition: "An assessment by an independent agency of how likely an issuer is to repay its debt in full and on time.",
    explanation: "Đánh giá của tổ chức độc lập về khả năng tổ chức phát hành trả nợ đầy đủ và đúng hạn.",
    example: "A bond rated AA by S&P is considered high quality; one rated B is speculative.",
    relatedTerms: ["Investment grade", "High-yield bond", "Rating agency"],
    cfaApplication: "Bonds rated BBB− (Baa3) or higher are investment grade; analysts still perform their own credit analysis."
  },
  {
    id: "fi-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Zero-coupon bond", ipa: "/ˌzɪərəʊ ˈkuːpɒn bɒnd/", vietnamese: "Trái phiếu không trả lãi định kỳ (trái phiếu chiết khấu)",
    definition: "A bond that pays no periodic interest and is issued at a discount to par; the investor's return is the difference between the purchase price and par.",
    explanation: "Trái phiếu không trả lãi định kỳ, được bán với giá thấp hơn mệnh giá; lợi nhuận là phần chênh lệch giữa giá mua và mệnh giá.",
    example: "Buying a 3-year zero for $863.84 and receiving $1,000 at maturity gives a yield of 5%.",
    relatedTerms: ["Discount", "Reinvestment risk", "Spot rate"],
    cfaApplication: "A zero-coupon bond has no reinvestment risk, and its Macaulay duration equals its maturity."
  },
  {
    id: "fi-08", type: "vocabulary", difficulty: "Intermediate",
    term: "Callable bond", ipa: "/ˈkɔːləbl bɒnd/", vietnamese: "Trái phiếu có quyền mua lại trước hạn",
    definition: "A bond that gives the issuer the right to redeem it before maturity at a specified price.",
    explanation: "Trái phiếu cho phép tổ chức phát hành mua lại (thu hồi) trước ngày đáo hạn với mức giá định trước.",
    example: "When rates fell, the company called its 8% bonds and issued new ones at 5%.",
    relatedTerms: ["Call price", "Reinvestment risk", "Putable bond"],
    cfaApplication: "Because the call option benefits the issuer, a callable bond trades at a lower price and higher yield than a similar option-free bond."
  },
  {
    id: "fi-09", type: "vocabulary", difficulty: "Intermediate",
    term: "Covenant", ipa: "/ˈkʌvənənt/", vietnamese: "Điều khoản cam kết",
    definition: "A legally binding term in a bond indenture that requires the issuer to take certain actions (affirmative) or prohibits certain actions (negative).",
    explanation: "Điều khoản ràng buộc trong hợp đồng trái phiếu, buộc tổ chức phát hành phải làm (cam kết khẳng định) hoặc không được làm (cam kết phủ định) một số việc.",
    example: "A negative covenant may prohibit the issuer from borrowing more once debt exceeds three times EBITDA.",
    relatedTerms: ["Indenture", "Default", "Credit risk"],
    cfaApplication: "Covenants are one of the “four Cs” of credit analysis, together with capacity, collateral and character."
  },
  {
    id: "fi-10", type: "vocabulary", difficulty: "Intermediate",
    term: "Seniority", ipa: "/ˌsiːniˈɒrəti/", vietnamese: "Thứ tự ưu tiên trả nợ",
    definition: "The rank of a debt claim in the order of repayment if the issuer goes bankrupt; senior debt is repaid before subordinated debt.",
    explanation: "Thứ hạng của một khoản nợ trong thứ tự được hoàn trả khi tổ chức phát hành phá sản; nợ cấp cao được trả trước nợ thứ cấp.",
    example: "Senior secured bondholders usually recover more in bankruptcy than subordinated bondholders.",
    relatedTerms: ["Secured debt", "Subordinated debt", "Recovery rate"],
    cfaApplication: "Seniority and collateral drive the recovery rate, which affects a bond's loss given default."
  },
  {
    id: "fi-11", type: "vocabulary", difficulty: "Beginner",
    term: "Yield curve", ipa: "/ˈjiːld kɜːv/", vietnamese: "Đường cong lợi suất",
    definition: "A graph showing the yields of bonds with similar credit quality but different maturities.",
    explanation: "Đồ thị biểu diễn lợi suất của các trái phiếu có cùng chất lượng tín dụng nhưng kỳ hạn khác nhau.",
    example: "When long-term yields are lower than short-term yields, the yield curve is inverted.",
    relatedTerms: ["Term structure", "Inverted yield curve", "Spot rates"],
    cfaApplication: "The shape of the government yield curve reflects expectations about rates, growth and term premiums."
  },
  {
    id: "fi-12", type: "vocabulary", difficulty: "Advanced",
    term: "Convexity", ipa: "/kənˈveksəti/", vietnamese: "Độ lồi",
    definition: "A measure of the curvature in the relationship between a bond's price and its yield, which improves duration-based estimates of price changes.",
    explanation: "Thước đo độ cong của quan hệ giữa giá và lợi suất trái phiếu, giúp ước tính biến động giá chính xác hơn so với chỉ dùng duration.",
    example: "With positive convexity, a bond's price rises more when yields fall than it drops when yields rise by the same amount.",
    relatedTerms: ["Duration", "Price-yield curve", "Negative convexity"],
    cfaApplication: "%ΔPrice ≈ −ModDur × ΔYield + ½ × Convexity × (ΔYield)²."
  },
  {
    id: "fi-13", type: "definition", difficulty: "Intermediate",
    term: "Yield to maturity (YTM)", ipa: "/ˌjiːld tə məˈtʃʊərəti/", vietnamese: "Lợi suất đáo hạn",
    question: "What is yield to maturity?",
    definition: "The single discount rate that makes the present value of a bond's promised cash flows equal to its price; the bond's internal rate of return if it is held until it is repaid.",
    formula: "Price = C ÷ (1 + y) + C ÷ (1 + y)^2 + … + (C + Par) ÷ (1 + y)^N",
    formulaNote: "C = coupon per period, y = yield per period, N = number of periods. Assumes the bond is held to maturity, every payment is made, and coupons are reinvested at the same yield. For semiannual bonds the annual YTM is quoted as 2 × y.",
    explanation: "Mức lợi suất chiết khấu làm cho giá trị hiện tại của các dòng tiền trái phiếu bằng giá thị trường; tương đương IRR khi nắm giữ đến đáo hạn.",
    example: "A bond trading below par has a YTM higher than its coupon rate.",
    relatedTerms: ["Current yield", "Internal rate of return", "Spot rate"],
    cfaApplication: "Bond prices and YTMs move inversely, and YTM is the standard way to quote and compare bond yields."
  },
  {
    id: "fi-14", type: "definition", difficulty: "Advanced",
    term: "Modified duration", ipa: "/ˈmɒdɪfaɪd djuˈreɪʃn/", vietnamese: "Thời lượng điều chỉnh",
    question: "What is modified duration?",
    definition: "An estimate of the percentage change in a bond's price for a 1 percentage point (100 bp) change in its yield to maturity.",
    formula: "%ΔPrice ≈ −ModDur × ΔYield;   ModDur = MacDur ÷ (1 + y)",
    formulaNote: "y is the yield per period. The estimate is linear, so it is most accurate for small yield changes; add a convexity adjustment for larger ones.",
    explanation: "Ước tính phần trăm thay đổi giá trái phiếu khi lợi suất thay đổi 1 điểm phần trăm; dấu âm thể hiện giá và lợi suất ngược chiều.",
    example: "A bond with a modified duration of 7 loses about 3.5% of its value if its yield rises by 0.50%.",
    relatedTerms: ["Macaulay duration", "Convexity", "Interest rate risk"],
    cfaApplication: "Duration is the main measure of a bond's or a portfolio's interest rate risk."
  },
  {
    id: "fi-15", type: "definition", difficulty: "Beginner",
    term: "Current yield", ipa: "/ˈkʌrənt jiːld/", vietnamese: "Lợi suất hiện hành",
    question: "What is current yield?",
    definition: "A bond's annual coupon payment divided by its market price today.",
    formula: "Current yield = Annual coupon payment ÷ Bond price",
    formulaNote: "It ignores the gain or loss as the price moves toward par and the timing of cash flows, so it differs from YTM unless the bond trades at par.",
    explanation: "Tiền lãi coupon hằng năm chia cho giá thị trường hiện tại của trái phiếu.",
    example: "A bond paying $50 a year and priced at $950 has a current yield of 5.26%.",
    relatedTerms: ["Coupon rate", "Yield to maturity", "Running yield"],
    cfaApplication: "Current yield is a simple income measure; YTM is the more complete yield measure."
  },
  {
    id: "fi-16", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Rủi ro lãi suất", term: "Interest rate risk", ipa: "/ˈɪntrəst reɪt rɪsk/",
    definition: "The risk that a bond's price falls because market interest rates rise.",
    explanation: "Rủi ro giá trái phiếu giảm do lãi suất thị trường tăng.",
    example: "Long-maturity, low-coupon bonds carry the most interest rate risk.",
    relatedTerms: ["Duration", "Reinvestment risk", "Yield"]
  },
  {
    id: "fi-17", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Rủi ro tái đầu tư", term: "Reinvestment risk", ipa: "/ˌriːɪnˈvestmənt rɪsk/",
    definition: "The risk that coupons or principal received before the end of the investment horizon must be reinvested at lower rates than expected.",
    explanation: "Rủi ro tiền lãi hoặc nợ gốc nhận được phải tái đầu tư với lãi suất thấp hơn kỳ vọng.",
    example: "An investor whose callable bond is redeemed after rates fall must reinvest the money at the new, lower rates.",
    relatedTerms: ["Interest rate risk", "Callable bond", "Horizon yield"]
  },
  {
    id: "fi-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Trái phiếu lợi suất cao (trái phiếu rác)", term: "High-yield bond", ipa: "/ˌhaɪ ˈjiːld bɒnd/",
    definition: "A bond rated below investment grade (below BBB− or Baa3) that offers extra return to compensate for its higher credit risk; also called a junk bond.",
    explanation: "Trái phiếu có xếp hạng dưới mức đầu tư (thấp hơn BBB− hoặc Baa3), trả lợi suất cao để bù rủi ro tín dụng cao; còn gọi là trái phiếu rác.",
    example: "A highly leveraged company rated B issues bonds yielding 9% when government bonds yield 4%.",
    relatedTerms: ["Investment grade", "Credit spread", "Default risk"]
  },
  {
    id: "fi-19", type: "mcq", difficulty: "Beginner", term: "Bond prices and rates",
    question: "If market interest rates rise, the price of an existing fixed-rate bond will most likely:",
    options: ["rise", "fall", "stay the same", "move to par immediately"],
    correctAnswer: "B",
    explanationEn: "A fixed-rate bond's cash flows do not change, so a higher discount rate lowers their present value: bond prices and yields move in opposite directions.",
    explanationVi: "Dòng tiền của trái phiếu lãi suất cố định không đổi, nên khi tỷ lệ chiết khấu tăng thì giá trị hiện tại (giá trái phiếu) giảm: giá và lợi suất trái phiếu luôn ngược chiều."
  },
  {
    id: "fi-20", type: "mcq", difficulty: "Intermediate", term: "Premium bond",
    question: "A bond has a 6% coupon and a yield to maturity of 5%. The bond is trading at:",
    options: ["a discount to par", "par", "a premium to par", "a price that cannot be determined"],
    correctAnswer: "C",
    explanationEn: "When the coupon rate is above the market yield, investors pay more than par for the higher coupons, so the bond trades at a premium.",
    explanationVi: "Khi lãi suất coupon cao hơn lợi suất thị trường, nhà đầu tư sẵn sàng trả cao hơn mệnh giá để nhận coupon cao, nên trái phiếu giao dịch ở mức giá cao hơn mệnh giá."
  },
  {
    id: "fi-21", type: "mcq", difficulty: "Advanced", term: "Ranking interest rate risk",
    question: "All of these option-free bonds have the same yield. Which has the most interest rate risk?",
    options: ["A 2-year bond with an 8% coupon", "A 10-year bond with an 8% coupon", "A 10-year zero-coupon bond", "A 2-year zero-coupon bond"],
    correctAnswer: "C",
    explanationEn: "Duration rises with maturity and falls as the coupon rises. A long zero-coupon bond receives all its cash at maturity, so it has the longest duration and the most interest rate risk.",
    explanationVi: "Duration tăng theo kỳ hạn và giảm khi coupon tăng. Trái phiếu zero-coupon dài hạn nhận toàn bộ tiền khi đáo hạn nên có duration dài nhất và rủi ro lãi suất lớn nhất."
  },
  {
    id: "fi-22", type: "mcq", difficulty: "Intermediate", term: "Credit deterioration",
    question: "If an issuer's credit quality deteriorates, its bonds' credit spread will most likely ___ and their price will ___.",
    options: ["widen; fall", "narrow; rise", "widen; rise", "narrow; fall"],
    correctAnswer: "A",
    explanationEn: "Investors demand more compensation for higher default risk, so the spread widens; a higher yield means a lower price.",
    explanationVi: "Nhà đầu tư đòi bù đắp nhiều hơn cho rủi ro vỡ nợ cao hơn nên chênh lệch tín dụng nới rộng; lợi suất tăng thì giá giảm."
  }
]);

// Financial English · Derivatives — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("der", [
  {
    id: "der-01", type: "vocabulary", difficulty: "Beginner",
    term: "Derivative", ipa: "/dɪˈrɪvətɪv/", vietnamese: "Công cụ phái sinh",
    definition: "A financial contract whose value depends on the value of an underlying asset, rate or index.",
    explanation: "Hợp đồng tài chính có giá trị phụ thuộc vào giá trị của một tài sản, lãi suất hay chỉ số cơ sở.",
    example: "A futures contract on the VN30 index gains or loses value as the index moves.",
    relatedTerms: ["Underlying asset", "Forward contract", "Option"],
    cfaApplication: "Derivatives are used to hedge risk or gain exposure at low cost, and they are priced with no-arbitrage arguments."
  },
  {
    id: "der-02", type: "vocabulary", difficulty: "Beginner",
    term: "Underlying asset", ipa: "/ˌʌndəˈlaɪɪŋ ˈæset/", vietnamese: "Tài sản cơ sở",
    definition: "The asset, rate or index on which a derivative contract is based, such as a stock, bond, commodity, currency or interest rate.",
    explanation: "Tài sản, lãi suất hoặc chỉ số mà hợp đồng phái sinh dựa vào để xác định giá trị.",
    example: "For a gold futures contract, gold is the underlying asset.",
    relatedTerms: ["Derivative", "Spot price", "Contract size"],
    cfaApplication: "A derivative's payoff is defined by the price of the underlying at expiration or on settlement dates."
  },
  {
    id: "der-03", type: "vocabulary", difficulty: "Beginner",
    term: "Forward contract", ipa: "/ˈfɔːwəd ˈkɒntrækt/", vietnamese: "Hợp đồng kỳ hạn",
    definition: "A private, customized agreement to buy or sell an asset at a price agreed today, for delivery on a future date.",
    explanation: "Thỏa thuận riêng, tùy chỉnh giữa hai bên để mua hoặc bán một tài sản vào ngày tương lai với giá thỏa thuận hôm nay.",
    example: "An exporter agrees with its bank today to sell USD 1 million in three months at a fixed exchange rate.",
    relatedTerms: ["Futures contract", "Counterparty risk", "Forward price"],
    cfaApplication: "Forwards trade over the counter, so each party is exposed to the other party's credit risk."
  },
  {
    id: "der-04", type: "vocabulary", difficulty: "Intermediate",
    term: "Futures contract", ipa: "/ˈfjuːtʃəz ˈkɒntrækt/", vietnamese: "Hợp đồng tương lai",
    definition: "A standardized contract traded on an exchange to buy or sell an asset at a set price on a future date, with gains and losses settled daily.",
    explanation: "Hợp đồng chuẩn hóa giao dịch trên sở giao dịch để mua hoặc bán tài sản vào ngày tương lai với giá xác định; lãi lỗ được thanh toán hằng ngày.",
    example: "A trader buys one VN30 index contract on the Hanoi Stock Exchange's derivatives market.",
    relatedTerms: ["Mark-to-market", "Clearinghouse", "Margin"],
    cfaApplication: "Daily settlement through a clearinghouse almost eliminates counterparty risk."
  },
  {
    id: "der-05", type: "vocabulary", difficulty: "Beginner",
    term: "Option", ipa: "/ˈɒpʃn/", vietnamese: "Quyền chọn",
    definition: "A contract that gives the buyer the right, but not the obligation, to buy (call) or sell (put) an underlying asset at a set price on or before a set date.",
    explanation: "Hợp đồng cho người mua quyền (không phải nghĩa vụ) mua (quyền chọn mua) hoặc bán (quyền chọn bán) tài sản cơ sở ở mức giá định trước, vào hoặc trước một ngày định trước.",
    example: "A call lets its holder buy 100 shares at $50 each until June.",
    relatedTerms: ["Call option", "Put option", "Strike price"],
    cfaApplication: "Options have asymmetric payoffs: the buyer's loss is limited to the premium while the gain can be large."
  },
  {
    id: "der-06", type: "vocabulary", difficulty: "Intermediate",
    term: "Swap", ipa: "/swɒp/", vietnamese: "Hợp đồng hoán đổi",
    definition: "An agreement between two parties to exchange a series of cash flows over a period, for example fixed-rate for floating-rate interest payments.",
    explanation: "Thỏa thuận giữa hai bên trao đổi một chuỗi dòng tiền trong một thời gian, ví dụ đổi lãi suất cố định lấy lãi suất thả nổi.",
    example: "A company with a floating-rate loan agrees to pay a fixed 5% and receive the floating rate.",
    relatedTerms: ["Interest rate swap", "Notional principal", "Currency swap"],
    cfaApplication: "An interest rate swap can be viewed as a series of forward contracts on the floating rate."
  },
  {
    id: "der-07", type: "vocabulary", difficulty: "Beginner",
    term: "Strike price", ipa: "/ˈstraɪk praɪs/", vietnamese: "Giá thực hiện",
    definition: "The price at which the holder of an option can buy (call) or sell (put) the underlying asset; also called the exercise price.",
    explanation: "Mức giá mà người nắm quyền chọn được mua (quyền chọn mua) hoặc bán (quyền chọn bán) tài sản cơ sở.",
    example: "A put struck at $40 lets its holder sell the stock for $40 even if it trades at $30.",
    relatedTerms: ["Exercise", "Moneyness", "Option premium"],
    cfaApplication: "Comparing the strike price with the underlying price tells whether an option is in, at or out of the money."
  },
  {
    id: "der-08", type: "vocabulary", difficulty: "Beginner",
    term: "Option premium", ipa: "/ˈɒpʃn ˈpriːmiəm/", vietnamese: "Phí quyền chọn",
    definition: "The price that the buyer of an option pays to the seller (writer) for the rights the contract gives.",
    explanation: "Khoản tiền người mua quyền chọn trả cho người bán (người phát hành quyền chọn) để có các quyền theo hợp đồng.",
    example: "Paying $3 per share for a call on 100 shares costs a premium of $300.",
    relatedTerms: ["Exercise value", "Time value", "Option writer"],
    cfaApplication: "An option's premium equals its exercise value plus its time value."
  },
  {
    id: "der-09", type: "vocabulary", difficulty: "Beginner",
    term: "Hedging", ipa: "/ˈhedʒɪŋ/", vietnamese: "Phòng ngừa rủi ro",
    definition: "Taking a position that offsets the risk of an existing or expected exposure.",
    explanation: "Mở một vị thế để bù trừ rủi ro của một khoản tiếp xúc rủi ro hiện có hoặc dự kiến.",
    example: "A coffee importer buys coffee futures to lock in the cost of beans it must buy in six months.",
    relatedTerms: ["Hedge ratio", "Basis risk", "Futures contract"],
    cfaApplication: "Hedging reduces risk but also gives up potential gains, and an imperfect hedge leaves basis risk."
  },
  {
    id: "der-10", type: "vocabulary", difficulty: "Intermediate",
    term: "Arbitrage", ipa: "/ˈɑːbɪtrɑːʒ/", vietnamese: "Kinh doanh chênh lệch giá",
    definition: "Earning a risk-free profit by simultaneously buying and selling identical or equivalent assets at different prices.",
    explanation: "Kiếm lợi nhuận không rủi ro bằng cách đồng thời mua và bán cùng một tài sản (hoặc tài sản tương đương) ở hai mức giá khác nhau.",
    example: "If gold sells for $2,000 in London and $2,010 in New York with no costs, a trader buys in London and sells in New York.",
    relatedTerms: ["Law of one price", "No-arbitrage pricing", "Replication"],
    cfaApplication: "Derivative prices are set so that no arbitrage profit is possible."
  },
  {
    id: "der-11", type: "vocabulary", difficulty: "Intermediate",
    term: "Mark-to-market", ipa: "/ˌmɑːk tə ˈmɑːkɪt/", vietnamese: "Đánh giá lại theo giá thị trường hằng ngày",
    definition: "The daily process of settling gains and losses on futures positions using that day's settlement price.",
    explanation: "Quy trình hằng ngày ghi nhận và thanh toán lãi, lỗ của vị thế hợp đồng tương lai theo giá thanh toán cuối ngày.",
    example: "If a long futures position gains $1,200 today, that amount is added to the trader's margin account tonight.",
    relatedTerms: ["Variation margin", "Settlement price", "Futures contract"],
    cfaApplication: "Because of daily settlement, futures and forward prices can differ when interest rates are correlated with the underlying."
  },
  {
    id: "der-12", type: "vocabulary", difficulty: "Intermediate",
    term: "Clearinghouse", ipa: "/ˈklɪərɪŋhaʊs/", vietnamese: "Trung tâm thanh toán bù trừ",
    definition: "An organization that stands between the buyer and the seller of exchange-traded contracts and guarantees that each side's obligations will be met.",
    explanation: "Tổ chức đứng giữa bên mua và bên bán các hợp đồng giao dịch trên sở, bảo đảm nghĩa vụ của mỗi bên được thực hiện.",
    example: "Because the clearinghouse is the counterparty to every trade, futures traders do not need to check each other's credit.",
    relatedTerms: ["Central counterparty", "Margin", "Counterparty risk"],
    cfaApplication: "Central clearing has spread to many over-the-counter derivatives since the 2008 financial crisis."
  },
  {
    id: "der-13", type: "definition", difficulty: "Advanced",
    term: "Put–call parity", ipa: "/ˌpʊt ˈkɔːl ˈpærəti/", vietnamese: "Ngang giá quyền chọn mua – bán",
    question: "What is put–call parity?",
    definition: "A no-arbitrage relationship linking the prices of a European call and a European put on the same underlying with the same strike and expiration.",
    formula: "S0 + p0 = c0 + X ÷ (1 + r)^T",
    formulaNote: "S0 = price of the underlying today, p0 and c0 = put and call prices, X = strike price, r = annual risk-free rate, T = time to expiration in years. A protective put (stock + put) equals a fiduciary call (call + risk-free bond).",
    explanation: "Quan hệ phi chênh lệch giá giữa giá quyền chọn mua và quyền chọn bán kiểu châu Âu có cùng tài sản cơ sở, giá thực hiện và ngày đáo hạn.",
    example: "With S0 = $50, X = $50, r = 5%, T = 1 and c0 = $5, the put should cost 5 + 47.62 − 50 = $2.62.",
    relatedTerms: ["Protective put", "Fiduciary call", "Arbitrage"],
    cfaApplication: "Put–call parity lets you create a synthetic call, put, stock or bond from the other three instruments."
  },
  {
    id: "der-14", type: "definition", difficulty: "Advanced",
    term: "Forward price", ipa: "/ˈfɔːwəd praɪs/", vietnamese: "Giá kỳ hạn",
    question: "How is the no-arbitrage forward price calculated?",
    definition: "The price agreed today for delivery at a future date that leaves no riskless profit from buying the asset now and holding it instead.",
    formula: "F0(T) = S0 × (1 + r)^T",
    formulaNote: "For an asset with no income or carrying costs; r = annual risk-free rate, T = years. Subtract the present value of income (such as dividends) from S0, or add the present value of costs (such as storage).",
    explanation: "Mức giá thỏa thuận hôm nay cho việc giao nhận trong tương lai sao cho không thể kiếm lời chênh lệch giữa mua tài sản ngay và ký hợp đồng kỳ hạn.",
    example: "A non-dividend share priced at $100 with r = 5% has a one-year forward price of $105.",
    relatedTerms: ["Cost of carry", "Spot price", "Forward contract"],
    cfaApplication: "If the market forward price differs from S0 × (1 + r)^T, a cash-and-carry or reverse cash-and-carry arbitrage is possible."
  },
  {
    id: "der-15", type: "definition", difficulty: "Intermediate",
    term: "Call option payoff", ipa: "/ˈkɔːl ˌɒpʃn ˈpeɪɒf/", vietnamese: "Giá trị đáo hạn của quyền chọn mua",
    question: "What is the payoff of a call option at expiration?",
    definition: "The amount the holder of a call receives at expiration: the amount by which the underlying price exceeds the strike price, or zero.",
    formula: "cT = max(0, ST − X);   Profit = max(0, ST − X) − c0",
    formulaNote: "ST = price of the underlying at expiration, X = strike price, c0 = premium paid. The writer's payoff is the negative of the holder's.",
    explanation: "Số tiền người mua quyền chọn mua nhận được khi đáo hạn: phần giá tài sản cơ sở vượt giá thực hiện, hoặc bằng 0 nếu không vượt.",
    example: "With X = $50, ST = $58 and a $3 premium, the payoff is $8 and the profit is $5.",
    relatedTerms: ["Strike price", "Breakeven price", "Put option payoff"],
    cfaApplication: "The call buyer's breakeven price at expiration is X + c0."
  },
  {
    id: "der-16", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Quyền chọn kiểu Mỹ", term: "American option", ipa: "/əˈmerɪkən ˈɒpʃn/",
    definition: "An option that can be exercised at any time up to and including its expiration date.",
    explanation: "Quyền chọn có thể được thực hiện vào bất kỳ thời điểm nào cho đến hết ngày đáo hạn.",
    example: "Most options on individual US stocks are American options.",
    relatedTerms: ["European option", "Early exercise", "Option"]
  },
  {
    id: "der-17", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Ký quỹ ban đầu", term: "Initial margin", ipa: "/ɪˌnɪʃl ˈmɑːdʒɪn/",
    definition: "The deposit a trader must place with the broker or clearinghouse to open a futures position.",
    explanation: "Khoản tiền nhà đầu tư phải ký quỹ với công ty môi giới hoặc trung tâm thanh toán bù trừ để mở vị thế hợp đồng tương lai.",
    example: "To buy one futures contract, the exchange requires an initial margin of 10% of the contract value.",
    relatedTerms: ["Maintenance margin", "Variation margin", "Margin call"]
  },
  {
    id: "der-18", type: "vi-en", difficulty: "Beginner",
    vietnamese: "Vị thế mua", term: "Long position", ipa: "/ˌlɒŋ pəˈzɪʃn/",
    definition: "Owning an asset or having agreed to buy it, so that the position gains when the price rises.",
    explanation: "Trạng thái sở hữu tài sản hoặc đã cam kết mua tài sản, có lãi khi giá tăng.",
    example: "The buyer of a futures contract holds a long position in the underlying.",
    relatedTerms: ["Short position", "Futures contract", "Exposure"]
  },
  {
    id: "der-19", type: "mcq", difficulty: "Beginner", term: "Put payoff",
    question: "A put option has a strike price of $40. At expiration the stock trades at $32. What is the payoff to the put buyer?",
    options: ["$0", "$8", "$32", "$40"],
    correctAnswer: "B",
    explanationEn: "A put pays max(0, X − ST) = max(0, 40 − 32) = $8. The buyer's profit would be $8 minus the premium paid.",
    explanationVi: "Quyền chọn bán có giá trị đáo hạn max(0, X − ST) = max(0, 40 − 32) = 8 USD. Lợi nhuận của người mua bằng 8 USD trừ phí quyền chọn đã trả."
  },
  {
    id: "der-20", type: "mcq", difficulty: "Intermediate", term: "Futures versus forwards",
    question: "Which feature distinguishes futures contracts from forward contracts?",
    options: [
      "Futures are private agreements tailored to each client.",
      "Futures are standardized, exchange-traded and settled daily.",
      "Futures have no margin requirements.",
      "Futures always require physical delivery of the asset."
    ],
    correctAnswer: "B",
    explanationEn: "Futures are standardized and traded on exchanges, with margin and daily mark-to-market through a clearinghouse. Forwards are private, customized and usually settled only at expiration.",
    explanationVi: "Hợp đồng tương lai được chuẩn hóa, giao dịch trên sở, có ký quỹ và thanh toán lãi lỗ hằng ngày qua trung tâm bù trừ. Hợp đồng kỳ hạn là thỏa thuận riêng, tùy chỉnh và thường chỉ thanh toán khi đáo hạn."
  },
  {
    id: "der-21", type: "mcq", difficulty: "Intermediate", term: "Choosing a hedge",
    question: "A rice exporter will sell 1,000 tonnes in six months and fears prices will fall. Which position hedges this risk?",
    options: ["Buy rice futures", "Sell rice futures", "Buy call options on rice", "Hold more rice in storage"],
    correctAnswer: "B",
    explanationEn: "Selling futures (a short hedge) locks in the selling price: if prices fall, the gain on the futures offsets the lower price received for the rice.",
    explanationVi: "Bán hợp đồng tương lai (phòng ngừa bằng vị thế bán) giúp khóa giá bán: nếu giá giảm, khoản lãi trên hợp đồng tương lai bù cho giá bán gạo thấp hơn."
  },
  {
    id: "der-22", type: "mcq", difficulty: "Beginner", term: "Call buyer's maximum loss",
    question: "What is the maximum loss for the buyer of a call option?",
    options: ["Unlimited", "The strike price", "The premium paid", "The price of the underlying"],
    correctAnswer: "C",
    explanationEn: "If the option expires worthless, the buyer loses only the premium paid. The writer of an uncovered call, by contrast, faces a potentially unlimited loss.",
    explanationVi: "Nếu quyền chọn hết hạn vô giá trị, người mua chỉ mất phí quyền chọn đã trả. Ngược lại, người bán quyền chọn mua không có tài sản bảo đảm có thể chịu lỗ không giới hạn."
  }
]);

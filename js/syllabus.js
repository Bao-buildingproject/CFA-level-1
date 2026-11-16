// The 10 CFA Level I topics. Fixed list, not saved in the browser.
// Weights: Level I topic weights for exams from February 2027 (as reported by
// several prep providers after CFA Institute's May 2026 announcement).
// Changes vs 2026: ETH 15–20% → 10–15%, QM 6–9% → 11–14%,
// DER 5–8% → 6–9%, ALT 7–10% → 6–9%. Confirm on cfainstitute.org.
// weight2026 is kept for reference only.
const TOPICS = [
  { id: "ETH", name: "Ethical and Professional Standards", order: 1,  weight: "10–15%", weight2026: "15–20%", plannedWeeks: 1.5 },
  { id: "QM",  name: "Quantitative Methods",               order: 2,  weight: "11–14%", weight2026: "6–9%",   plannedWeeks: 2 },
  { id: "ECO", name: "Economics",                          order: 3,  weight: "6–9%", weight2026: "6–9%",   plannedWeeks: 1.5 },
  { id: "FSA", name: "Financial Statement Analysis",       order: 4,  weight: "11–14%", weight2026: "11–14%", plannedWeeks: 2.5 },
  { id: "CI",  name: "Corporate Issuers",                  order: 5,  weight: "6–9%", weight2026: "6–9%",   plannedWeeks: 1 },
  { id: "EQ",  name: "Equity Investments",                 order: 6,  weight: "11–14%", weight2026: "11–14%", plannedWeeks: 1.5 },
  { id: "FI",  name: "Fixed Income",                       order: 7,  weight: "11–14%", weight2026: "11–14%", plannedWeeks: 2 },
  { id: "DER", name: "Derivatives",                        order: 8,  weight: "6–9%", weight2026: "5–8%",   plannedWeeks: 1 },
  { id: "ALT", name: "Alternative Investments",            order: 9,  weight: "6–9%", weight2026: "7–10%",  plannedWeeks: 1 },
  { id: "PM",  name: "Portfolio Management",               order: 10, weight: "8–12%", weight2026: "8–12%",  plannedWeeks: 1 }
];

// Find a topic by its code, e.g. topicById("FSA")
function topicById(id) {
  return TOPICS.find(t => t.id === id);
}

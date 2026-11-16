// ============================================================
// modules.js — Learning Modules of the CFA Level I 2027 curriculum
// (102 modules in 10 volumes), grouped by topic.
// id = "<TOPIC>-<nn>" (module number within the topic volume).
// vol  = curriculum volume (1–10)
// book = SchweserNotes 2026 book that covers the topic (still useful
//        for unchanged topics; Quant, Equity and Ethics were reorganized in 2027).
// ============================================================

const CURRICULUM_YEAR = 2027;

const MODULES_RAW = {
  QM: { vol: 1, book: 1, titles: [
    "Returns of Financial Assets and Instruments",
    "Types of Financial Returns",
    "Benchmarking Returns",
    "The Time Value of Money in Finance",
    "Statistical Characteristics of Asset Returns",
    "Statistical Distributions for Financial Asset Prices and Returns",
    "Estimation and Hypothesis Testing",
    "The Return and Risk of a Financial Portfolio",
    "Simulation of Financial Asset Prices and Returns",
    "Applications of Simple Linear Regression in Finance",
    "Introduction to Financial Data Science"] },
  ECO: { vol: 2, book: 1, titles: [
    "The Firm and Market Structures",
    "Understanding Business Cycles",
    "Fiscal Policy",
    "Monetary Policy",
    "Introduction to Geopolitics",
    "International Trade",
    "Capital Flows and the FX Market",
    "Exchange Rate Calculations"] },
  CI: { vol: 3, book: 1, titles: [
    "Organizational Forms, Corporate Issuer Features, and Ownership",
    "Investors and Other Stakeholders",
    "Corporate Governance: Conflicts, Mechanisms, Risks, and Benefits",
    "Working Capital and Liquidity",
    "Capital Investments and Capital Allocation",
    "Capital Structure",
    "Business Models"] },
  FSA: { vol: 4, book: 2, titles: [
    "Introduction to Financial Statement Analysis",
    "Analyzing Income Statements",
    "Analyzing Balance Sheets",
    "Analyzing Statements of Cash Flows I",
    "Analyzing Statements of Cash Flows II",
    "Analysis of Inventories",
    "Analysis of Long-Term Assets",
    "Topics in Long-Term Liabilities and Equity",
    "Analysis of Income Taxes",
    "Financial Reporting Quality",
    "Financial Analysis Techniques",
    "Introduction to Financial Statement Modeling"] },
  EQ: { vol: 5, book: 2, titles: [
    "Equity Instrument Features",
    "Equity Jurisdictions, Classes, and the Voting Process",
    "Equity Issuance and Trading",
    "Sources of Equity Returns",
    "Introduction to Equity Valuation",
    "Discounted Cash Flow (DCF) and Growth Models",
    "Relative Value Equity Valuation Approaches",
    "Financial Statement Forecasting in Equity Valuation",
    "Industry and Competitive Analysis",
    "Company Analysis: Past, Present, and Future",
    "Equity Analyst Research Reports",
    "The Capital Asset Pricing Model, Market Model, and Other Factor-Based Equity Models"] },
  FI: { vol: 6, book: 3, titles: [
    "Fixed-Income Instrument Features",
    "Fixed-Income Cash Flows and Types",
    "Fixed-Income Issuance and Trading",
    "Fixed-Income Markets for Corporate Issuers",
    "Fixed-Income Markets for Government Issuers",
    "Fixed-Income Bond Valuation: Prices and Yields",
    "Yield and Yield Spread Measures for Fixed-Rate Bonds",
    "Yield and Yield Spread Measures for Floating-Rate Instruments",
    "The Term Structure of Interest Rates: Spot, Par, and Forward Curves",
    "Interest Rate Risk and Return",
    "Yield-Based Bond Duration Measures and Properties",
    "Yield-Based Bond Convexity and Portfolio Properties",
    "Curve-Based and Empirical Fixed-Income Risk Measures",
    "Credit Risk",
    "Credit Analysis for Government Issuers",
    "Credit Analysis for Corporate Issuers",
    "Fixed-Income Securitization",
    "Asset-Backed Security (ABS) Instrument and Market Features",
    "Mortgage-Backed Security (MBS) Instrument and Market Features"] },
  DER: { vol: 7, book: 3, titles: [
    "Derivative Instrument and Derivative Market Features",
    "Forward Commitment and Contingent Claim Features and Instruments",
    "Derivative Benefits, Risks, and Issuer and Investor Uses",
    "Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
    "Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities",
    "Pricing and Valuation of Futures Contracts",
    "Pricing and Valuation of Interest Rate and Other Swaps",
    "Pricing and Valuation of Options",
    "Option Replication Using Put–Call Parity",
    "Valuing a Derivative Using a One-Period Binomial Model"] },
  ALT: { vol: 8, book: 4, titles: [
    "Alternative Investment Features, Methods, and Structures",
    "Alternative Investment Performance and Returns",
    "Investments in Private Capital: Equity and Debt",
    "Real Estate and Infrastructure",
    "Natural Resources",
    "Hedge Funds",
    "Introduction to Digital Assets"] },
  PM: { vol: 9, book: 4, titles: [
    "Portfolio Risk and Return: Part I",
    "Portfolio Risk and Return: Part II",
    "Portfolio Management: An Overview",
    "Basics of Portfolio Planning and Construction",
    "The Behavioral Biases of Individuals",
    "Introduction to Risk Management"] },
  ETH: { vol: 10, book: 4, titles: [
    "Ethics and Trust in the Investment Profession",
    "Code of Ethics and Standards of Professional Conduct",
    "Guidance for Standard I: Professionalism",
    "Guidance for Standard II: Integrity of Capital Markets",
    "Guidance for Standard III: Duties to Clients",
    "Guidance for Standard IV: Duties to Employers",
    "Guidance for Standard V: Investment Analysis, Recommendations, and Actions",
    "Guidance for Standard VI: Conflicts of Interest",
    "Guidance for Standard VII: Responsibilities as a CFA Institute Member or CFA Candidate",
    "Application of the Code and Standards: Level I"] }
};

let _seq = 0;
const MODULES = Object.entries(MODULES_RAW).flatMap(([topic, d]) =>
  d.titles.map((title, i) => ({
    id: `${topic}-${String(i + 1).padStart(2, "0")}`,
    topic, n: i + 1, r: ++_seq, vol: d.vol, book: d.book, title
  })));

function modulesOf(topic) { return MODULES.filter(m => m.topic === topic); }
function moduleById(id) { return MODULES.find(m => m.id === id); }
function moduleLabel(m) { return `Vol ${m.vol} · LM ${m.n}`; }

// SchweserNotes 2026 books in your Google Drive (only you can open these links)
const SCHWESER_BOOKS = [
  { n: 1, title: "Quantitative Methods, Economics, and Corporate Issuers", topics: ["QM", "ECO", "CI"], url: "https://drive.google.com/file/d/1uMkb7pFGOdd9YcnKlEadMJHaz1ASgodf/view" },
  { n: 2, title: "Financial Statement Analysis and Equity Investments", topics: ["FSA", "EQ"], url: "https://drive.google.com/file/d/124ytdAusA9Iko2hqt5b-EBcWxYkriM19/view" },
  { n: 3, title: "Fixed Income and Derivatives", topics: ["FI", "DER"], url: "https://drive.google.com/file/d/13Vx019bh4LtXurL4DdUOObgeDjw0aUn1/view" },
  { n: 4, title: "Alternative Investments, Portfolio Management, and Ethical and Professional Standards", topics: ["ALT", "PM", "ETH"], url: "https://drive.google.com/file/d/15K99dhtPoqrSBOGB29cFfN2zh599I9bU/view" }
];

// CFA Program curriculum 2027 volumes in your Google Drive (private links)
const CURRICULUM_VOLUMES = [
  { vol: 1, topic: "QM",  title: "Quantitative Methods",          url: "https://drive.google.com/file/d/12H5r1Z9LCnuSbVd-4B0poJbzr1WeNCCy/view" },
  { vol: 2, topic: "ECO", title: "Economics",                     url: "https://drive.google.com/file/d/1Mo8z3Yg-Nw9PA6z_Xx_nJdr8YrSMtxQC/view" },
  { vol: 3, topic: "CI",  title: "Corporate Issuers",             url: "https://drive.google.com/file/d/1c5SUW8rg2xblly_2LEghDgwGIewCK30U/view" },
  { vol: 4, topic: "FSA", title: "Financial Statement Analysis",  url: "https://drive.google.com/file/d/1nqrakdZEa8l3UOvkvIf9zDeHgY6Hyz3F/view" },
  { vol: 5, topic: "EQ",  title: "Equity Investments",            url: "https://drive.google.com/file/d/18j1ZuPQ-XIwIljiUG-8QNhAAZEYI-R8q/view" },
  { vol: 6, topic: "FI",  title: "Fixed Income",                  url: "https://drive.google.com/file/d/1qNyZEjim5GF66o6XxtpukbIW8QnNa2ea/view" },
  { vol: 7, topic: "DER", title: "Derivatives",                   url: "https://drive.google.com/file/d/1LdH3t3OiZktBXozonmov_fPdY09eOa5F/view" },
  { vol: 8, topic: "ALT", title: "Alternative Investments",       url: "https://drive.google.com/file/d/1tXqyj9Gy31la5o05bNlcIwr0yOy05uu5/view" },
  { vol: 9, topic: "PM",  title: "Portfolio Construction",        url: "https://drive.google.com/file/d/1KW2MWIcPOi0o0fUe88w-xjjm9gj_KieE/view" },
  { vol: 10, topic: "ETH", title: "Ethical and Professional Standards", url: "https://drive.google.com/file/d/1fDmdszhUrMkdskjTaYqnA_YRLJMRDA8h/view" }
];

// ------------------------------------------------------------
// Moving content from the 2026 module list to the 2027 one.
// Questions keep their ids (so your attempt history is kept);
// only the module they belong to changes.
// ------------------------------------------------------------
const OLD_TO_NEW_MODULE = {
  // Quant 2026 → 2027
  "QM-01": "QM-01", "QM-02": "QM-04", "QM-03": "QM-05", "QM-04": "QM-06", "QM-05": "QM-08",
  "QM-06": "QM-09", "QM-07": "QM-07", "QM-08": "QM-07", "QM-09": "QM-07", "QM-10": "QM-10", "QM-11": "QM-11",
  // Equity 2026 → 2027
  "EQ-01": "EQ-03", "EQ-02": "EQ-03", "EQ-03": "EQ-05", "EQ-04": "EQ-01",
  "EQ-05": "EQ-10", "EQ-06": "EQ-09", "EQ-07": "EQ-08", "EQ-08": "EQ-06",
  // Ethics 2026 → 2027 (ETH-03 is split by Standard; GIPS was removed from Level I)
  "ETH-01": "ETH-01", "ETH-02": "ETH-02", "ETH-03": "ETH-03", "ETH-04": null, "ETH-05": "ETH-10"
};

// Individual questions whose topic fits a different 2027 module
const QUESTION_MODULE_OVERRIDE = {
  "b-QM-01-04": "QM-02", "b-QM-01-05": "QM-03", "b-QM-01-07": "QM-03", "b-QM-01-11": "QM-02",
  "b-QM-03-01": "QM-06", "b-QM-06-01": "QM-06", "b-QM-06-04": "QM-01",
  "b-EQ-04-03": "EQ-05", "b-EQ-04-04": "EQ-02", "b-EQ-04-06": "EQ-05",
  "b-EQ-08-03": "EQ-07", "b-EQ-08-04": "EQ-07", "b-EQ-08-05": "EQ-07", "b-EQ-08-06": "EQ-05",
  "b-EQ-08-07": "EQ-04", "b-EQ-08-08": "EQ-04"
};

// Ethics guidance questions are sorted into the Standard they test (I–VII → ETH-03…ETH-09)
function ethicsStandardModule(text) {
  const m = text.match(/\b(VII|VI|IV|V|III|II|I)\(([A-E])\)/);
  const roman = m ? m[1] : (
    /nonpublic|mosaic|manipulat|wash|rumor/i.test(text) ? "II" :
    /exam|designation|candidate|CFA Program|Level I|Level II|Level III|\bCFA\b(?! Institute)/i.test(text) ? "VII" :
    /referral|front-?run|personal (account|trade)|board of|conflict|priority/i.test(text) ? "VI" :
    /research|record|reasonable basis|forecast|fact|opinion|model/i.test(text) ? "V" :
    /employer|resign|supervis|consulting|leaving|whistle|compensation|bonus/i.test(text) ? "IV" :
    /client|suitab|fair|IPO|confidential|proxy|pension|brokerage|performance|composite|allocat/i.test(text) ? "III" : "I");
  return { I: "ETH-03", II: "ETH-04", III: "ETH-05", IV: "ETH-06", V: "ETH-07", VI: "ETH-08", VII: "ETH-09" }[roman];
}

// Returns the 2027 module for a built-in question, or null if retired
function mapQuestionModule(id, oldModule, text) {
  if (QUESTION_MODULE_OVERRIDE[id]) return QUESTION_MODULE_OVERRIDE[id];
  if (oldModule in OLD_TO_NEW_MODULE) {
    const target = OLD_TO_NEW_MODULE[oldModule];
    if (target === "ETH-03") return ethicsStandardModule(text);
    return target;
  }
  return oldModule;
}

// Old (2026) module → new (2027) modules, used once to carry over your study status
function newModulesForOld(oldId) {
  if (oldId === "ETH-03") return ["ETH-03", "ETH-04", "ETH-05", "ETH-06", "ETH-07", "ETH-08", "ETH-09"];
  if (oldId === "QM-01") return ["QM-01", "QM-02", "QM-03"];
  if (oldId in OLD_TO_NEW_MODULE) return OLD_TO_NEW_MODULE[oldId] ? [OLD_TO_NEW_MODULE[oldId]] : [];
  return [oldId];
}

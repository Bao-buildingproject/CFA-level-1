// ============================================================
// modules.js — the 93 Learning Modules of CFA Level I (2026),
// grouped by topic. Titles follow the 2026 reading list.
// id = "<TOPIC>-<nn>" (number within the topic); r = reading number.
// book = SchweserNotes book (1–4) that covers the module.
// ============================================================

const MODULES_RAW = {
  QM: { book: 1, r0: 1, titles: [
    "Rates and Returns",
    "Time Value of Money in Finance",
    "Statistical Measures of Asset Returns",
    "Probability Trees and Conditional Expectations",
    "Portfolio Mathematics",
    "Simulation Methods",
    "Estimation and Inference",
    "Hypothesis Testing",
    "Parametric and Non-Parametric Tests of Independence",
    "Simple Linear Regression",
    "Introduction to Big Data Techniques"] },
  ECO: { book: 1, r0: 12, titles: [
    "The Firm and Market Structures",
    "Understanding Business Cycles",
    "Fiscal Policy",
    "Monetary Policy",
    "Introduction to Geopolitics",
    "International Trade",
    "Capital Flows and the FX Market",
    "Exchange Rate Calculations"] },
  CI: { book: 1, r0: 20, titles: [
    "Organizational Forms, Corporate Issuer Features, and Ownership",
    "Investors and Other Stakeholders",
    "Corporate Governance: Conflicts, Mechanisms, Risks, and Benefits",
    "Working Capital and Liquidity",
    "Capital Investments and Capital Allocation",
    "Capital Structure",
    "Business Models"] },
  FSA: { book: 2, r0: 27, titles: [
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
  EQ: { book: 2, r0: 39, titles: [
    "Market Organization and Structure",
    "Security Market Indexes",
    "Market Efficiency",
    "Overview of Equity Securities",
    "Company Analysis: Past and Present",
    "Industry and Competitive Analysis",
    "Company Analysis: Forecasting",
    "Equity Valuation: Concepts and Basic Tools"] },
  FI: { book: 3, r0: 47, titles: [
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
  DER: { book: 3, r0: 66, titles: [
    "Derivative Instrument and Derivative Market Features",
    "Forward Commitment and Contingent Claim Features and Instruments",
    "Derivative Benefits, Risks, and Issuer and Investor Uses",
    "Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
    "Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities",
    "Pricing and Valuation of Futures Contracts",
    "Pricing and Valuation of Interest Rates and Other Swaps",
    "Pricing and Valuation of Options",
    "Option Replication Using Put–Call Parity",
    "Valuing a Derivative Using a One-Period Binomial Model"] },
  ALT: { book: 4, r0: 76, titles: [
    "Alternative Investment Features, Methods, and Structures",
    "Alternative Investment Performance and Returns",
    "Investments in Private Capital: Equity and Debt",
    "Real Estate and Infrastructure",
    "Natural Resources",
    "Hedge Funds",
    "Introduction to Digital Assets"] },
  PM: { book: 4, r0: 83, titles: [
    "Portfolio Risk and Return: Part I",
    "Portfolio Risk and Return: Part II",
    "Portfolio Management: An Overview",
    "Basics of Portfolio Planning and Construction",
    "The Behavioral Biases of Individuals",
    "Introduction to Risk Management"] },
  ETH: { book: 4, r0: 89, titles: [
    "Ethics and Trust in the Investment Profession",
    "Code of Ethics and Standards of Professional Conduct",
    "Guidance for Standards I–VII",
    "Introduction to the Global Investment Performance Standards (GIPS)",
    "Ethics Application"] }
};

const MODULES = Object.entries(MODULES_RAW).flatMap(([topic, d]) =>
  d.titles.map((title, i) => ({
    id: `${topic}-${String(i + 1).padStart(2, "0")}`,
    topic, n: i + 1, r: d.r0 + i, book: d.book, title
  })));

function modulesOf(topic) { return MODULES.filter(m => m.topic === topic); }
function moduleById(id) { return MODULES.find(m => m.id === id); }

// SchweserNotes books in your Google Drive (only you can open these links)
const SCHWESER_BOOKS = [
  { n: 1, title: "Quantitative Methods, Economics, and Corporate Issuers", topics: ["QM", "ECO", "CI"], url: "https://drive.google.com/file/d/1uMkb7pFGOdd9YcnKlEadMJHaz1ASgodf/view" },
  { n: 2, title: "Financial Statement Analysis and Equity Investments", topics: ["FSA", "EQ"], url: "https://drive.google.com/file/d/124ytdAusA9Iko2hqt5b-EBcWxYkriM19/view" },
  { n: 3, title: "Fixed Income and Derivatives", topics: ["FI", "DER"], url: "https://drive.google.com/file/d/13Vx019bh4LtXurL4DdUOObgeDjw0aUn1/view" },
  { n: 4, title: "Alternative Investments, Portfolio Management, and Ethical and Professional Standards", topics: ["ALT", "PM", "ETH"], url: "https://drive.google.com/file/d/15K99dhtPoqrSBOGB29cFfN2zh599I9bU/view" }
];

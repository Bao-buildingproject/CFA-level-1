// Financial English · Quantitative Methods — 12 vocabulary, 3 definition, 3 Vietnamese→English, 4 multiple choice.
FinEng.register("qm", [
  {
    id: "qm-01", type: "vocabulary", difficulty: "Beginner",
    term: "Arithmetic mean", ipa: "/ˌærɪθˈmetɪk ˈmiːn/", vietnamese: "Trung bình cộng",
    definition: "The sum of all observations divided by the number of observations.",
    explanation: "Tổng các giá trị quan sát chia cho số quan sát.",
    example: "Returns of 4%, 6% and 11% have an arithmetic mean of 7%.",
    relatedTerms: ["Median", "Weighted mean", "Geometric mean"],
    cfaApplication: "The arithmetic mean of past returns is used to estimate the expected return for a single future period."
  },
  {
    id: "qm-02", type: "vocabulary", difficulty: "Beginner",
    term: "Median", ipa: "/ˈmiːdiən/", vietnamese: "Trung vị",
    definition: "The middle value of a data set arranged in order; for an even number of observations it is the average of the two middle values.",
    explanation: "Giá trị nằm giữa của dãy số đã sắp xếp; nếu số quan sát chẵn thì là trung bình của hai giá trị ở giữa.",
    example: "For 2, 3, 7, 9 and 50, the median is 7, while the mean is 14.2.",
    relatedTerms: ["Arithmetic mean", "Mode", "Outlier"],
    cfaApplication: "The median is less affected by outliers than the mean, so it is useful for skewed data such as incomes."
  },
  {
    id: "qm-03", type: "vocabulary", difficulty: "Beginner",
    term: "Standard deviation", ipa: "/ˌstændəd ˌdiːviˈeɪʃn/", vietnamese: "Độ lệch chuẩn",
    definition: "The square root of the variance; a measure of how widely values are spread around their mean, in the same units as the data.",
    explanation: "Căn bậc hai của phương sai; đo mức độ phân tán của các giá trị quanh giá trị trung bình, cùng đơn vị với dữ liệu.",
    example: "A fund whose annual returns have a standard deviation of 18% is more volatile than one with 8%.",
    relatedTerms: ["Variance", "Volatility", "Coefficient of variation"],
    cfaApplication: "The standard deviation of returns is the most common measure of total investment risk."
  },
  {
    id: "qm-04", type: "vocabulary", difficulty: "Intermediate",
    term: "Variance", ipa: "/ˈveəriəns/", vietnamese: "Phương sai",
    definition: "The average of the squared deviations of observations from their mean.",
    explanation: "Trung bình của bình phương độ lệch giữa các giá trị quan sát và giá trị trung bình.",
    example: "For a sample variance, divide the sum of squared deviations by n − 1 instead of n.",
    relatedTerms: ["Standard deviation", "Covariance", "Dispersion"],
    cfaApplication: "Portfolio variance depends on the weights, the variances of the assets and the covariances between them."
  },
  {
    id: "qm-05", type: "vocabulary", difficulty: "Beginner",
    term: "Probability", ipa: "/ˌprɒbəˈbɪləti/", vietnamese: "Xác suất",
    definition: "A number from 0 to 1 that measures how likely an event is to occur.",
    explanation: "Con số từ 0 đến 1 đo khả năng một biến cố xảy ra.",
    example: "The probability of rolling a six with a fair die is 1/6.",
    relatedTerms: ["Odds", "Conditional probability", "Expected value"],
    cfaApplication: "Expected values, scenario analysis and Bayes' formula all rely on probabilities."
  },
  {
    id: "qm-06", type: "vocabulary", difficulty: "Intermediate",
    term: "Normal distribution", ipa: "/ˈnɔːml ˌdɪstrɪˈbjuːʃn/", vietnamese: "Phân phối chuẩn",
    definition: "A symmetric, bell-shaped probability distribution that is completely described by its mean and standard deviation.",
    explanation: "Phân phối xác suất đối xứng hình chuông, được xác định hoàn toàn bởi giá trị trung bình và độ lệch chuẩn.",
    example: "In a normal distribution, about 68% of outcomes fall within one standard deviation of the mean.",
    relatedTerms: ["Standard normal distribution", "z-score", "Lognormal distribution"],
    cfaApplication: "Many risk models assume normally distributed returns, although actual returns often have fat tails."
  },
  {
    id: "qm-07", type: "vocabulary", difficulty: "Intermediate",
    term: "Skewness", ipa: "/ˈskjuːnəs/", vietnamese: "Độ bất đối xứng (độ lệch của phân phối)",
    definition: "A measure of the asymmetry of a distribution around its mean.",
    explanation: "Thước đo mức độ bất đối xứng của phân phối quanh giá trị trung bình.",
    example: "A return distribution with positive skewness has many small losses and a few very large gains.",
    relatedTerms: ["Kurtosis", "Mean", "Median"],
    cfaApplication: "For a positively skewed distribution, mean > median > mode; investors generally prefer positive skewness."
  },
  {
    id: "qm-08", type: "vocabulary", difficulty: "Advanced",
    term: "Kurtosis", ipa: "/kɜːˈtəʊsɪs/", vietnamese: "Độ nhọn",
    definition: "A measure of how much of a distribution's probability lies in its tails compared with a normal distribution.",
    explanation: "Thước đo mức độ tập trung xác suất ở phần đuôi của phân phối so với phân phối chuẩn.",
    example: "Stock returns with excess kurtosis above zero show extreme moves more often than a normal distribution predicts.",
    relatedTerms: ["Excess kurtosis", "Fat tails", "Skewness"],
    cfaApplication: "Excess kurtosis = kurtosis − 3; a fat-tailed (leptokurtic) distribution has excess kurtosis above 0."
  },
  {
    id: "qm-09", type: "vocabulary", difficulty: "Intermediate",
    term: "Hypothesis testing", ipa: "/haɪˈpɒθəsɪs ˌtestɪŋ/", vietnamese: "Kiểm định giả thuyết",
    definition: "A statistical procedure that uses sample data to decide whether there is enough evidence to reject a statement about a population (the null hypothesis).",
    explanation: "Thủ tục thống kê dùng dữ liệu mẫu để quyết định có đủ bằng chứng bác bỏ một nhận định về tổng thể (giả thuyết H0) hay không.",
    example: "An analyst uses hypothesis testing to check whether a fund's mean monthly return is different from zero.",
    relatedTerms: ["Null hypothesis", "Significance level", "Type I error"],
    cfaApplication: "A test compares a test statistic with a critical value, or a p-value with the significance level."
  },
  {
    id: "qm-10", type: "vocabulary", difficulty: "Advanced",
    term: "p-value", ipa: "/ˈpiː ˌvæljuː/", vietnamese: "Giá trị p",
    definition: "The smallest level of significance at which the null hypothesis can be rejected.",
    explanation: "Mức ý nghĩa nhỏ nhất mà tại đó giả thuyết H0 có thể bị bác bỏ.",
    example: "With a p-value of 0.03, the null hypothesis is rejected at the 5% level but not at the 1% level.",
    relatedTerms: ["Significance level", "Test statistic", "Hypothesis testing"],
    cfaApplication: "Reject the null hypothesis when the p-value is less than the chosen significance level."
  },
  {
    id: "qm-11", type: "vocabulary", difficulty: "Intermediate",
    term: "Linear regression", ipa: "/ˌlɪniə rɪˈɡreʃn/", vietnamese: "Hồi quy tuyến tính",
    definition: "A statistical method that models the relationship between a dependent variable and one or more independent variables with a straight line.",
    explanation: "Phương pháp thống kê mô hình hóa quan hệ giữa biến phụ thuộc và một hay nhiều biến độc lập bằng một đường thẳng.",
    example: "A linear regression of a stock's returns on the market's returns gives an estimate of the stock's beta.",
    relatedTerms: ["Dependent variable", "Slope coefficient", "R-squared"],
    cfaApplication: "Simple linear regression estimates the intercept and slope by minimizing the sum of squared errors."
  },
  {
    id: "qm-12", type: "vocabulary", difficulty: "Beginner",
    term: "Sample", ipa: "/ˈsɑːmpl/", vietnamese: "Mẫu",
    definition: "A subset of a population, selected to draw conclusions about the whole population.",
    explanation: "Một nhóm được chọn ra từ tổng thể để rút ra kết luận về toàn bộ tổng thể.",
    example: "Surveying 500 investors to estimate the views of all investors in a country uses a sample.",
    relatedTerms: ["Population", "Sampling error", "Random sampling"],
    cfaApplication: "Sample statistics, such as the sample mean, estimate population parameters with sampling error."
  },
  {
    id: "qm-13", type: "definition", difficulty: "Beginner",
    term: "Holding period return (HPR)", ipa: "/ˈhəʊldɪŋ ˌpɪəriəd rɪˈtɜːn/", vietnamese: "Lợi nhuận trong thời gian nắm giữ",
    question: "What is holding period return?",
    definition: "The total return on an investment over the time it is owned, including both income and price change.",
    formula: "HPR = (P1 − P0 + D1) ÷ P0",
    formulaNote: "P0 = price at the start, P1 = price at the end, D1 = income received during the period. The result is not annualized.",
    explanation: "Tổng lợi nhuận của khoản đầu tư trong thời gian nắm giữ, gồm cả thu nhập (cổ tức, lãi) và chênh lệch giá.",
    example: "Buy at $40, receive a $1 dividend and sell at $43: HPR = (43 − 40 + 1) ÷ 40 = 10%.",
    relatedTerms: ["Total return", "Annualized return", "Capital gain"],
    cfaApplication: "Returns for several periods are linked by compounding: (1 + R1)(1 + R2)… − 1."
  },
  {
    id: "qm-14", type: "definition", difficulty: "Intermediate",
    term: "Coefficient of variation (CV)", ipa: "/ˌkəʊɪˈfɪʃnt əv ˌveəriˈeɪʃn/", vietnamese: "Hệ số biến thiên",
    question: "What is the coefficient of variation?",
    definition: "The ratio of the standard deviation to the mean, which measures risk per unit of return.",
    formula: "CV = Standard deviation ÷ Mean",
    formulaNote: "Useful for comparing the dispersion of data sets with different means; a lower CV means less risk per unit of mean return. It is not meaningful when the mean is close to zero or negative.",
    explanation: "Độ lệch chuẩn chia cho giá trị trung bình; cho biết rủi ro trên mỗi đơn vị lợi nhuận, giúp so sánh các tập dữ liệu có trung bình khác nhau.",
    example: "A mean return of 8% with a standard deviation of 12% gives a CV of 1.5.",
    relatedTerms: ["Standard deviation", "Sharpe ratio", "Relative dispersion"],
    cfaApplication: "CV is a measure of relative dispersion, while standard deviation measures absolute dispersion."
  },
  {
    id: "qm-15", type: "definition", difficulty: "Intermediate",
    term: "Geometric mean return", ipa: "/ˌdʒiːəˈmetrɪk ˌmiːn rɪˈtɜːn/", vietnamese: "Lợi nhuận bình quân hình học",
    question: "What is the geometric mean return?",
    definition: "The compound rate of return per period that links the beginning and ending values of an investment over several periods.",
    formula: "RG = [(1 + R1) × (1 + R2) × … × (1 + Rn)]^(1/n) − 1",
    formulaNote: "It is always less than or equal to the arithmetic mean, and it is the right measure of past compound performance.",
    explanation: "Tỷ suất sinh lời kép bình quân mỗi kỳ trong nhiều kỳ; phản ánh đúng mức tăng trưởng thực tế của khoản đầu tư.",
    example: "A return of +50% followed by −50% gives a geometric mean of −13.4% a year, although the arithmetic mean is 0%.",
    relatedTerms: ["Arithmetic mean", "Compound annual growth rate", "Holding period return"],
    cfaApplication: "Investment managers report compound (geometric) returns for multi-year performance."
  },
  {
    id: "qm-16", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Khoảng tin cậy", term: "Confidence interval", ipa: "/ˈkɒnfɪdəns ˌɪntəvl/",
    definition: "A range of values that is expected to contain an unknown population parameter with a stated level of confidence.",
    explanation: "Khoảng giá trị được kỳ vọng chứa tham số chưa biết của tổng thể với một mức độ tin cậy xác định.",
    example: "A 95% confidence interval for the mean annual return is 4% to 10%.",
    relatedTerms: ["Standard error", "Point estimate", "Significance level"]
  },
  {
    id: "qm-17", type: "vi-en", difficulty: "Advanced",
    vietnamese: "Sai số chuẩn", term: "Standard error", ipa: "/ˌstændəd ˈerə/",
    definition: "The standard deviation of a sample statistic; for the sample mean it equals the standard deviation divided by the square root of the sample size.",
    explanation: "Độ lệch chuẩn của một thống kê mẫu; với trung bình mẫu, bằng độ lệch chuẩn chia cho căn bậc hai của cỡ mẫu.",
    example: "With a standard deviation of 20% and 100 observations, the standard error of the mean is 2%.",
    relatedTerms: ["Sample mean", "Central limit theorem", "Confidence interval"]
  },
  {
    id: "qm-18", type: "vi-en", difficulty: "Intermediate",
    vietnamese: "Biến phụ thuộc", term: "Dependent variable", ipa: "/dɪˌpendənt ˈveəriəbl/",
    definition: "The variable that a regression model tries to explain; also called the explained variable.",
    explanation: "Biến mà mô hình hồi quy tìm cách giải thích; còn gọi là biến được giải thích.",
    example: "In a regression of a stock's returns on market returns, the stock's returns are the dependent variable.",
    relatedTerms: ["Independent variable", "Linear regression", "Residual"]
  },
  {
    id: "qm-19", type: "mcq", difficulty: "Beginner", term: "Typical value with outliers",
    question: "A data set of household incomes contains a few extremely high values. Which measure best represents a typical income?",
    options: ["Arithmetic mean", "Median", "Range", "Variance"],
    correctAnswer: "B",
    explanationEn: "The median is the middle value and is not pulled upward by a few extreme observations, unlike the arithmetic mean.",
    explanationVi: "Trung vị là giá trị nằm giữa nên không bị kéo lên bởi vài giá trị cực lớn, khác với trung bình cộng."
  },
  {
    id: "qm-20", type: "mcq", difficulty: "Intermediate", term: "Type I error",
    question: "A Type I error occurs when a researcher:",
    options: ["fails to reject a false null hypothesis", "rejects a true null hypothesis", "uses a sample that is too small", "rejects a false null hypothesis"],
    correctAnswer: "B",
    explanationEn: "A Type I error is rejecting a null hypothesis that is actually true; its probability equals the significance level. Failing to reject a false null is a Type II error.",
    explanationVi: "Sai lầm loại I là bác bỏ giả thuyết H0 trong khi H0 đúng; xác suất của nó bằng mức ý nghĩa. Không bác bỏ H0 khi H0 sai là sai lầm loại II."
  },
  {
    id: "qm-21", type: "mcq", difficulty: "Beginner", term: "Spread of a normal distribution",
    question: "For a normal distribution, about what percentage of observations lie within one standard deviation of the mean?",
    options: ["50%", "68%", "95%", "99%"],
    correctAnswer: "B",
    explanationEn: "About 68% of observations lie within ±1 standard deviation, about 95% within ±1.96 standard deviations and about 99% within ±2.58.",
    explanationVi: "Khoảng 68% quan sát nằm trong ±1 độ lệch chuẩn, khoảng 95% trong ±1,96 và khoảng 99% trong ±2,58 độ lệch chuẩn."
  },
  {
    id: "qm-22", type: "mcq", difficulty: "Intermediate", term: "Mean, median and mode under skew",
    question: "For a positively skewed distribution, which relationship is most likely?",
    options: ["Mean < median < mode", "Mean = median = mode", "Mode < median < mean", "Median < mode < mean"],
    correctAnswer: "C",
    explanationEn: "The long right tail pulls the mean above the median, and the median above the mode.",
    explanationVi: "Đuôi dài bên phải kéo giá trị trung bình lên cao hơn trung vị, và trung vị cao hơn yếu vị (mode)."
  }
]);

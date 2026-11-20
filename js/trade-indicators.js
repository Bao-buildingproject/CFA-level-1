// Indicators for chronological OHLCV bars. A null marks a period
// that needs more trading sessions before it can be calculated.
function trIndicatorSma(values, period) {
  let sum = 0;
  return values.map((value, index) => {
    sum += value;
    if (index >= period) sum -= values[index - period];
    return index >= period - 1 ? sum / period : null;
  });
}

function trIndicatorEma(values, period) {
  const weight = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let average = null;
  return values.map(value => {
    if (value === null) return null;
    if (average === null) {
      seedSum += value;
      seedCount++;
      if (seedCount === period) average = seedSum / period;
    } else {
      average += (value - average) * weight;
    }
    return average;
  });
}

function trIndicatorRsi(values, period) {
  let gain = 0;
  let loss = 0;
  return values.map((value, index) => {
    if (!index) return null;
    const change = value - values[index - 1];
    const up = Math.max(change, 0);
    const down = Math.max(-change, 0);
    if (index <= period) {
      gain += up / period;
      loss += down / period;
    } else {
      gain += (up - gain) / period;
      loss += (down - loss) / period;
    }
    if (index < period) return null;
    if (!loss) return gain ? 100 : 50;
    return 100 - 100 / (1 + gain / loss);
  });
}

function trTechnicalIndicators(bars) {
  const closes = bars.map(bar => bar.c);
  const fast = trIndicatorEma(closes, 12);
  const slow = trIndicatorEma(closes, 26);
  const macd = slow.map((value, index) => value === null ? null : fast[index] - value);
  const signal = trIndicatorEma(macd, 9);
  const histogram = signal.map((value, index) => value === null ? null : macd[index] - value);
  const levelPeriod = 20;
  let support = null;
  let resistance = null;
  let volumeRatio = null;
  if (bars.length >= levelPeriod) {
    const recent = bars.slice(-levelPeriod);
    support = Math.min(...recent.map(bar => bar.l));
    resistance = Math.max(...recent.map(bar => bar.h));
  }
  if (bars.length > levelPeriod) {
    const preceding = bars.slice(-levelPeriod - 1, -1);
    const averageVolume = preceding.reduce((sum, bar) => sum + bar.v, 0) / levelPeriod;
    if (averageVolume > 0) volumeRatio = bars[bars.length - 1].v / averageVolume;
  }
  return {
    ma20: trIndicatorSma(closes, 20),
    ma50: trIndicatorSma(closes, 50),
    rsi: trIndicatorRsi(closes, 14),
    macd,
    signal,
    histogram,
    support,
    resistance,
    volumeRatio
  };
}

// Aggregate chronological bars by the Vietnamese trading calendar.
function trAggregateTechnicalBars(bars, interval) {
  const result = [];
  let period;
  let summary;
  for (const bar of bars) {
    if (summary && bar.t === summary.end) continue;
    const local = new Date((bar.t + 7 * 3600) * 1000);
    const year = local.getUTCFullYear();
    let key = year;
    if (interval === "month") key = year * 12 + local.getUTCMonth();
    if (interval === "week") {
      const day = Math.floor(local.getTime() / 86400000);
      key = day - (local.getUTCDay() + 6) % 7;
    }
    if (key !== period) {
      period = key;
      summary = { ...bar, end: bar.t };
      result.push(summary);
    } else {
      summary.h = Math.max(summary.h, bar.h);
      summary.l = Math.min(summary.l, bar.l);
      summary.c = bar.c;
      summary.v += bar.v;
      summary.end = bar.t;
    }
  }
  return result;
}

const TR_INDICATORS = [
  ["ma20", "MA20"], ["ma50", "MA50"], ["levels", "Hỗ trợ / kháng cự"],
  ["rsi", "RSI(14)"], ["macd", "MACD(12, 26, 9)"]
];
const TR_INDICATOR_OPTIONS = { ma20: true };
const TR_TECHNICAL_CACHE = new WeakMap();
const TR_CALENDAR_CACHE = new WeakMap();

function trCalendarSeries(bars, interval) {
  let series = TR_CALENDAR_CACHE.get(bars);
  if (!series) {
    series = {};
    TR_CALENDAR_CACHE.set(bars, series);
  }
  return series[interval] ??= trAggregateTechnicalBars(bars, interval);
}
const TR_CHART_INTERVALS = [["auto", "Tự động"], ["hour", "Giờ"], ["day", "Ngày"], ["week", "Tuần"], ["month", "Tháng"], ["year", "Năm"]];

function trTechnicalControls() {
  return `<div class="tr-terminal-tools">
    <label class="tr-interval"><span>Loại nến</span><select id="tr-interval">${TR_CHART_INTERVALS.map(([value, label]) =>
      `<option value="${value}"${TRADE.interval === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
    <details class="tr-indicator-menu"><summary>Chỉ báo</summary>
      <div>${TR_INDICATORS.map(([key, label]) => `<label><input type="checkbox" data-tr-indicator="${key}"${TR_INDICATOR_OPTIONS[key] ? " checked" : ""}> ${label}</label>`).join("")}</div>
    </details>
  </div>`;
}

function trTechnicalPath({ key, values }, step, y) {
  let path = "", started = false;
  values.forEach((value, i) => {
    if (value === null) { started = false; return; }
    path += `${started ? "L" : "M"}${((i + 0.5) * step).toFixed(2)},${y(value).toFixed(2)}`;
    started = true;
  });
  return path ? `<path class="tr-indicator-line tr-indicator-${key}" d="${path}"/>` : "";
}

function trTechnicalLegend(overlays) {
  const names = { ma20: "MA20", ma50: "MA50", support: "Hỗ trợ", resistance: "Kháng cự" };
  return overlays.filter(s => s.values.some(value => value !== null)).map(({ key }) =>
    `<span class="tr-legend-${key}">${names[key]}</span>`).join("");
}

function trTechnicalPanel(title, series, w, bounds, histogram = []) {
  const values = series.flatMap(s => s.values).concat(histogram).filter(v => v !== null);
  if (!values.length) return `<section class="tr-indicator-panel"><h3>${title}</h3><p class="small">Chưa đủ dữ liệu trong khoảng này.</p></section>`;
  const plotW = w - 46, step = plotW / series[0].values.length;
  const [lo, hi] = bounds || [Math.min(0, ...values), Math.max(0, ...values)];
  const y = v => 8 + (hi - v) / (hi - lo || 1) * 66;
  const guides = bounds ? [30, 70] : [0];
  const grid = guides.map(v => `<line class="tr-grid" x1="0" x2="${plotW}" y1="${y(v)}" y2="${y(v)}"/><text class="tr-axis" x="${plotW + 6}" y="${y(v) + 4}">${v}</text>`).join("");
  const bars = histogram.map((v, i) => v === null ? "" :
    `<rect class="${v >= 0 ? "tr-vup" : "tr-vdown"}" x="${((i + 0.2) * step).toFixed(2)}" y="${Math.min(y(0), y(v))}" width="${(step * 0.6).toFixed(2)}" height="${Math.abs(y(0) - y(v))}"/>`).join("");
  return `<section class="tr-indicator-panel"><h3>${title}</h3><svg class="tr-chart" viewBox="0 0 ${w} 82" width="${w}" height="82" role="img" aria-label="${title}">${grid}${bars}${series.map(s => trTechnicalPath(s, step, y)).join("")}</svg></section>`;
}

function trTechnicalView(history, bars, interval, w) {
  if (!history?.length) {
    const message = history === null
      ? 'Chưa tải được dữ liệu phân tích. <button class="btn btn-secondary btn-sm" type="button" data-tr-tech-retry>Thử lại</button>'
      : "Chưa có dữ liệu để tính chỉ báo.";
    return { summary: `<p class="small" role="status">${message}</p>`, overlays: [], plots: "" };
  }
  let cached = TR_TECHNICAL_CACHE.get(history);
  if (!cached) {
    cached = { stats: trTechnicalIndicators(history), indexes: new Map(history.map((b, i) => [b.end ?? b.t, i])) };
    TR_TECHNICAL_CACHE.set(history, cached);
  }
  const { stats, indexes } = cached;
  const n = history.length, index = n - 1;
  const fmt = (v, suffix = "") => v == null ? "Chưa đủ dữ liệu" : v.toFixed(2) + suffix;
  const units = { hour: "giờ", day: "ngày", week: "tuần", month: "tháng", year: "năm" };
  const metrics = [
    ["MA20", fmt(stats.ma20[index])], ["MA50", fmt(stats.ma50[index])],
    ["RSI(14)", fmt(stats.rsi[index])], ["MACD / Tín hiệu", stats.signal[index] == null ? "Chưa đủ dữ liệu" : `${fmt(stats.macd[index])} / ${fmt(stats.signal[index])}`],
    ["Hỗ trợ · 20 nến", fmt(stats.support)], ["Kháng cự · 20 nến", fmt(stats.resistance)],
    ["Khối lượng / TB 20 nến trước", fmt(stats.volumeRatio, "×")]
  ];
  const summary = `<div class="tr-technical-title"><h3>Phân tích kỹ thuật</h3><span>${trInt(n)} nến ${units[interval]} · ${trChartDate(history[0].t)}–${trChartDate(history[index].end ?? history[index].t)} · VNDirect</span></div>
    <dl class="tr-technical-metrics">${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  const overlays = [];
  if (!bars.length) return { summary, overlays, plots: "" };
  const aligned = bars.map(b => indexes.get(b.end ?? b.t));
  const series = key => ({ key, values: aligned.map(i => stats[key][i] ?? null) });
  for (const key of ["ma20", "ma50"]) {
    if (TR_INDICATOR_OPTIONS[key]) overlays.push(series(key));
  }
  if (TR_INDICATOR_OPTIONS.levels) {
    for (const key of ["support", "resistance"]) {
      overlays.push({ key, values: bars.map(() => stats[key]) });
    }
  }
  let plots = "";
  if (TR_INDICATOR_OPTIONS.rsi) plots += trTechnicalPanel("RSI(14)", [series("rsi")], w, [0, 100]);
  if (TR_INDICATOR_OPTIONS.macd) plots += trTechnicalPanel("MACD(12, 26, 9)", [series("macd"), series("signal")], w, null, series("histogram").values);
  return { summary, overlays, plots };
}

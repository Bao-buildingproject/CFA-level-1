// Each endpoint stores an observed candle timestamp and a price in chart units.
let trDrawState = { symbol: "", active: false, first: null };
let trDrawBinding = null;

function trDrawingControls() {
  return `<div class="tr-draw-tools" role="group" aria-label="Vẽ trên biểu đồ">
    <button type="button" class="tr-draw-toggle" data-tr-draw aria-pressed="false" aria-label="Vẽ đường xu hướng" title="Vẽ đường xu hướng" disabled>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 14 15 6"/><circle cx="3.5" cy="15" r="2"/><circle cx="16.5" cy="5" r="2"/></svg><span>Vẽ đường</span>
    </button>
    <button type="button" class="tr-draw-undo" data-tr-undo aria-label="Hoàn tác đường vừa vẽ" title="Hoàn tác đường vừa vẽ" disabled>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m7 4-4 4 4 4M3 8h8a5 5 0 1 1 0 10" transform="translate(0 -1)"/></svg>
    </button>
  </div>`;
}

function trDrawingActive(sym) { return trDrawState.symbol === sym && trDrawState.active; }

function trStopDrawing() {
  trDrawBinding?.abort();
  trDrawBinding = null;
  trDrawState = { symbol: "", active: false, first: null };
}

function trStoredLines(sym) {
  const record = tradeData().trendLines?.[sym];
  return Array.isArray(record) ? record : [];
}

function trSaveLines(sym, lines) {
  const trade = tradeData();
  trade.trendLines = { ...trade.trendLines, [sym]: lines };
  saveData();
}

function trValidAnchor(point) {
  return point && Number.isFinite(point.t) && Number.isFinite(point.price);
}

// Candle slots are equidistant, even across weekends. A date within a grouped
// candle maps to that candle; between candles, interpolate between their slots.
function trDrawingEnd(bar, calendar) {
  const end = bar.end ?? bar.t;
  // Daily prices carry a date stamp; an hourly anchor later that same day
  // belongs to the closing daily/weekly/monthly/yearly candle too.
  return calendar ? (Math.floor((end + 7 * 3600) / 86400) + 1) * 86400 - 7 * 3600 - 1 : end;
}

function trDrawingIndex(bars, time, calendar) {
  let lo = 0, hi = bars.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bars[mid].t <= time) lo = mid;
    else hi = mid - 1;
  }
  const end = trDrawingEnd(bars[lo], calendar);
  if (time <= end || lo === bars.length - 1) return lo;
  return lo + (time - end) / (bars[lo + 1].t - end);
}

function trBindDrawingTools(sym, box, bars, allBars = bars, interval = "day") {
  if (sym !== trDrawState.symbol) {
    trStopDrawing();
    trDrawState.symbol = sym;
  }
  trDrawBinding?.abort();
  trDrawBinding = new AbortController();
  const { signal } = trDrawBinding;
  const terminal = box.closest(".tr-terminal");
  const toggle = terminal?.querySelector("[data-tr-draw]"), undo = terminal?.querySelector("[data-tr-undo]");
  if (!toggle || !undo) return;
  const svg = box.querySelector("svg.tr-price-chart");
  const lines = () => trStoredLines(sym);
  toggle.disabled = !svg || !bars.length;
  undo.disabled = !lines().length;
  const undoLast = () => {
    trSaveLines(sym, lines().slice(0, -1));
    undo.disabled = !lines().length;
  };
  if (toggle.disabled) {
    trDrawState.active = false;
    trDrawState.first = null;
    toggle.setAttribute("aria-pressed", "false");
    undo.onclick = undoLast;
    return;
  }
  const { priceMin, priceMax, priceTop, priceBottom } = svg.dataset;
  const min = Number(priceMin), max = Number(priceMax), top = Number(priceTop), bottom = Number(priceBottom);
  const step = Number(svg.dataset.step), width = step * bars.length;
  const calendar = ["day", "week", "month", "year"].includes(interval);
  const offset = trDrawingIndex(allBars, bars[0].t, calendar);
  const firstTime = bars[0].t, lastTime = trDrawingEnd(bars.at(-1), calendar);
  const fullStart = allBars[0].t, fullEnd = trDrawingEnd(allBars.at(-1), calendar);
  const x = time => (trDrawingIndex(allBars, time, calendar) - offset + 0.5) * step;
  const y = price => top + (max - price) / (max - min) * (bottom - top);
  const ns = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(ns, "g");
  overlay.setAttribute("pointer-events", "none");
  overlay.setAttribute("aria-hidden", "true");
  const clip = `<defs><clipPath id="tr-trend-clip"><rect x="0" y="${top}" width="${width}" height="${bottom - top}"/></clipPath></defs>`;
  overlay.innerHTML = clip;
  const segments = document.createElementNS(ns, "g");
  segments.setAttribute("clip-path", "url(#tr-trend-clip)");
  overlay.append(segments);
  svg.append(overlay);
  const status = document.createElement("span");
  status.id = "tr-draw-instruction";
  status.className = "tr-draw-status";
  status.setAttribute("role", "status");
  box.prepend(status);
  signal.addEventListener("abort", () => { status.remove(); overlay.remove(); }, { once: true });

  let cursor = null;
  const lineMarkup = (line, preview) => {
    if (!trValidAnchor(line?.a) || !trValidAnchor(line.b)) return "";
    const [a, b] = line.a.t <= line.b.t ? [line.a, line.b] : [line.b, line.a];
    if (b.t < firstTime || a.t > lastTime || a.t === b.t) return "";
    const start = Math.max(fullStart, a.t), end = Math.min(fullEnd, b.t);
    const priceAt = t => a.price + (b.price - a.price) * ((t - a.t) / (b.t - a.t));
    return `<line class="${preview ? "tr-trend-preview" : "tr-trend-line"}" x1="${x(start)}" y1="${y(priceAt(start))}" x2="${x(end)}" y2="${y(priceAt(end))}" stroke="var(--tr-drawing-ink, #24558a)" stroke-width="1.8" vector-effect="non-scaling-stroke"${preview ? ' stroke-dasharray="4 3"' : ""}/>`;
  };
  function render() {
    let markup = lines().map(line => lineMarkup(line, false)).join("");
    const first = trDrawState.first;
    if (trDrawState.active) {
      if (first && cursor) markup += lineMarkup({ a:first, b:cursor }, true);
      for (const p of [first, cursor]) {
        if (p && p.t >= firstTime && p.t <= lastTime) markup += `<circle class="tr-trend-anchor" cx="${x(p.t)}" cy="${y(p.price)}" r="4" stroke="var(--tr-drawing-ink, #24558a)" stroke-width="2" fill="var(--surface, #fbf9f4)"/>`;
      }
    }
    segments.innerHTML = markup;
  }
  function sync(message) {
    const { active, first } = trDrawState;
    svg.classList.toggle("tr-drawing", active);
    svg.setAttribute("tabindex", active ? "0" : "-1");
    if (active) svg.setAttribute("aria-describedby", status.id);
    else svg.removeAttribute("aria-describedby");
    toggle.setAttribute("aria-pressed", String(active));
    toggle.querySelector("span").textContent = active ? "Hủy vẽ" : "Vẽ đường";
    toggle.setAttribute("aria-label", active ? "Hủy vẽ đường xu hướng" : "Vẽ đường xu hướng");
    undo.disabled = !lines().length;
    status.hidden = !active;
    status.textContent = active ? message || `${first ? "Chọn điểm cuối" : "Chọn điểm đầu"} trên biểu đồ. Dùng phím mũi tên và Enter nếu vẽ bằng bàn phím.` : "";
    render();
  }
  const pick = point => {
    if (!trDrawState.first) trDrawState.first = point;
    else {
      if (point.t === trDrawState.first.t) { sync("Chọn một nến khác để đặt điểm cuối."); return; }
      trSaveLines(sym, [...lines(), { a: trDrawState.first, b: point }]);
      trDrawState.first = null;
    }
    sync();
  };
  const cancel = () => {
    trDrawState.active = false;
    trDrawState.first = null;
    cursor = null;
    sync();
    toggle.focus({ preventScroll: true });
  };
  toggle.onclick = () => {
    if (trDrawState.active) { cancel(); return; }
    trDrawState.active = true;
    const mid = bars[Math.floor(bars.length / 2)];
    cursor = { t: mid.t, price: mid.c };
    sync();
    svg.focus({ preventScroll: true });
  };
  undo.onclick = () => { undoLast(); render(); };
  const pointAt = event => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (p.x < 0 || p.x >= width || p.y < top || p.y > bottom) return null;
    return { t: bars[Math.min(bars.length - 1, Math.floor(p.x / step))].t, price: max - (p.y - top) / (bottom - top) * (max - min) };
  };
  let press = null;
  svg.addEventListener("pointerdown", event => {
    if (!trDrawState.active || event.button !== 0 || !event.isPrimary || !pointAt(event)) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { signal });
  svg.addEventListener("pointermove", event => {
    if (!trDrawState.active) return;
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press = null;
    cursor = pointAt(event);
    render();
  }, { signal });
  svg.addEventListener("pointercancel", () => { press = null; }, { signal });
  svg.addEventListener("pointerup", event => {
    const point = pointAt(event);
    if (trDrawState.active && press?.id === event.pointerId && point && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 7) {
      cursor = point;
      pick(point);
    }
    press = null;
  }, { signal });
  document.addEventListener("keydown", event => {
    if (trDrawState.active && event.key === "Escape") { event.preventDefault(); cancel(); }
  }, { signal });
  svg.addEventListener("keydown", event => {
    if (!trDrawState.active || !["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const mid = bars[Math.floor(bars.length / 2)];
    cursor ??= { t: mid.t, price: mid.c };
    if (event.key === "Enter" || event.key === " ") { pick(cursor); return; }
    const speed = event.shiftKey ? 10 : 1;
    const horizontal = event.key === "ArrowLeft" ? -speed : event.key === "ArrowRight" ? speed : 0;
    const vertical = event.key === "ArrowUp" ? speed : event.key === "ArrowDown" ? -speed : 0;
    const index = Math.round(trDrawingIndex(bars, cursor.t, calendar)) + horizontal;
    cursor = { t: bars[Math.max(0, Math.min(bars.length - 1, index))].t, price: Math.max(min, Math.min(max, cursor.price + vertical * (max - min) / 100)) };
    const date = new Date(cursor.t * 1000).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    sync(`${date}, giá ${cursor.price.toFixed(2)}. Nhấn Enter để đặt điểm ${trDrawState.first ? "cuối" : "đầu"}.`);
  }, { signal });
  sync();
}

// Each endpoint stores an observed candle timestamp and a price in chart units.
let trDrawState = { symbol: "", mode: null, first: null };
let trDrawBinding = null;

function trDrawingControls() {
  return `<div class="tr-draw-tools" role="group" aria-label="Vẽ trên biểu đồ">
    <button type="button" class="tr-draw-toggle" data-tr-draw aria-pressed="false" aria-label="Vẽ đường xu hướng" title="Vẽ đường xu hướng" disabled>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 14 15 6"/><circle cx="3.5" cy="15" r="2"/><circle cx="16.5" cy="5" r="2"/></svg><span>Vẽ đường</span>
    </button>
    <button type="button" class="tr-draw-delete" data-tr-delete aria-pressed="false" aria-label="Xóa đường xu hướng" title="Xóa đường xu hướng" disabled>
      ${icon("trash", 16)}<span>Xóa đường</span>
    </button>
    <button type="button" class="tr-draw-undo" data-tr-undo aria-label="Hoàn tác đường vừa vẽ" title="Hoàn tác đường vừa vẽ" disabled>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m7 4-4 4 4 4M3 8h8a5 5 0 1 1 0 10" transform="translate(0 -1)"/></svg>
    </button>
  </div>`;
}

function trDrawingActive(sym) { return trDrawState.symbol === sym && trDrawState.mode !== null; }

function trStopDrawing() {
  trDrawBinding?.abort();
  trDrawBinding = null;
  trDrawState = { symbol: "", mode: null, first: null };
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

// Clip to the price plot so off-screen lines cannot receive pointer or keyboard selection.
function trClipTrend(x1, y1, x2, y2, width, top, bottom) {
  let start = 0, end = 1;
  for (const [a, b, min, max] of [[x1, x2, 0, width], [y1, y2, top, bottom]]) {
    const delta = b - a;
    if (delta === 0) {
      if (a < min || a > max) return null;
      continue;
    }
    const t1 = (min - a) / delta, t2 = (max - a) / delta;
    start = Math.max(start, Math.min(t1, t2));
    end = Math.min(end, Math.max(t1, t2));
    if (start > end) return null;
  }
  return { x1: x1 + start * (x2 - x1), y1: y1 + start * (y2 - y1),
    x2: x1 + end * (x2 - x1), y2: y1 + end * (y2 - y1) };
}

function trDistanceToTrend(point, segment, scaleX, scaleY) {
  const dx = (segment.x2 - segment.x1) * scaleX, dy = (segment.y2 - segment.y1) * scaleY;
  const px = (point.x - segment.x1) * scaleX, py = (point.y - segment.y1) * scaleY;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
  return Math.hypot(px - t * dx, py - t * dy);
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
  const remove = terminal?.querySelector("[data-tr-delete]");
  if (!toggle || !undo || !remove) return;
  const svg = box.querySelector("svg.tr-price-chart");
  const lines = () => trStoredLines(sym);
  toggle.disabled = !svg || !bars.length;
  undo.disabled = !lines().length;
  const undoLast = () => {
    trSaveLines(sym, lines().slice(0, -1));
    undo.disabled = !lines().length;
  };
  function setDeleteControl(pressed) {
    remove.setAttribute("aria-pressed", String(pressed));
    remove.querySelector("span").textContent = pressed ? "Dừng xóa" : "Xóa đường";
    remove.title = pressed ? "Dừng xóa đường xu hướng" : "Xóa đường xu hướng";
    remove.setAttribute("aria-label", remove.title);
  }
  if (toggle.disabled) {
    trDrawState.mode = null;
    trDrawState.first = null;
    remove.disabled = true;
    setDeleteControl(false);
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

  let cursor = null, selected = -1;
  const project = line => {
    if (!trValidAnchor(line?.a) || !trValidAnchor(line.b)) return null;
    const [a, b] = line.a.t <= line.b.t ? [line.a, line.b] : [line.b, line.a];
    if (b.t < firstTime || a.t > lastTime || a.t === b.t) return null;
    const start = Math.max(fullStart, a.t), end = Math.min(fullEnd, b.t);
    const priceAt = t => a.price + (b.price - a.price) * ((t - a.t) / (b.t - a.t));
    return trClipTrend(x(start), y(priceAt(start)), x(end), y(priceAt(end)), width, top, bottom);
  };
  const visibleSegments = () => lines().flatMap((line, index) => {
    const position = project(line);
    return position ? [{ ...position, index }] : [];
  });
  let visible = visibleSegments();
  const lineMarkup = (segment, preview = false) => {
    if (!segment) return "";
    const highlight = !preview && trDrawState.mode === "delete" && selected === segment.index;
    const color = highlight ? "var(--px-down, #bb3044)" : "var(--tr-drawing-ink, #24558a)";
    return `<line class="${preview ? "tr-trend-preview" : "tr-trend-line"}" data-selected="${highlight}" x1="${segment.x1}" y1="${segment.y1}" x2="${segment.x2}" y2="${segment.y2}" stroke="${color}" stroke-width="${highlight ? 3.5 : 1.8}" vector-effect="non-scaling-stroke"${preview ? ' stroke-dasharray="4 3"' : ""}/>`;
  };
  function render() {
    let markup = visible.map(segment => lineMarkup(segment)).join("");
    const first = trDrawState.first;
    if (trDrawState.mode === "draw") {
      if (first && cursor) markup += lineMarkup(project({ a: first, b: cursor }), true);
      for (const p of [first, cursor]) {
        if (p && p.t >= firstTime && p.t <= lastTime) markup += `<circle class="tr-trend-anchor" cx="${x(p.t)}" cy="${y(p.price)}" r="4" stroke="var(--tr-drawing-ink, #24558a)" stroke-width="2" fill="var(--surface, #fbf9f4)"/>`;
      }
    }
    segments.innerHTML = markup;
  }
  const deleteHint = "Chạm vào đường muốn xóa. Dùng phím mũi tên để chọn đường rồi nhấn Enter hoặc Delete.";
  function sync(message) {
    visible = visibleSegments();
    if (!visible.length && trDrawState.mode === "delete") trDrawState.mode = null;
    const { mode, first } = trDrawState;
    const drawing = mode === "draw", deleting = mode === "delete";
    svg.classList.toggle("tr-drawing", Boolean(mode));
    svg.setAttribute("tabindex", mode ? "0" : "-1");
    if (mode) svg.setAttribute("aria-describedby", status.id);
    else svg.removeAttribute("aria-describedby");
    toggle.setAttribute("aria-pressed", String(drawing));
    toggle.querySelector("span").textContent = drawing ? "Hủy vẽ" : "Vẽ đường";
    toggle.setAttribute("aria-label", drawing ? "Hủy vẽ đường xu hướng" : "Vẽ đường xu hướng");
    remove.disabled = !visible.length;
    setDeleteControl(deleting);
    undo.disabled = !lines().length;
    status.hidden = !mode;
    if (deleting) status.textContent = message || deleteHint;
    else status.textContent = drawing ? message || `${first ? "Chọn điểm cuối" : "Chọn điểm đầu"} trên biểu đồ. Dùng phím mũi tên và Enter nếu vẽ bằng bàn phím.` : "";
    render();
  }
  const erase = index => {
    if (!visible.some(segment => segment.index === index)) return;
    trSaveLines(sym, lines().filter((line, i) => i !== index));
    selected = -1;
    sync(`Đã xóa đường. ${deleteHint}`);
    if (!trDrawState.mode) toggle.focus({ preventScroll: true });
  };
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
    const control = trDrawState.mode === "delete" ? remove : toggle;
    trDrawState.mode = null;
    trDrawState.first = null;
    selected = -1;
    cursor = null;
    sync();
    control.focus({ preventScroll: true });
  };
  const activate = mode => {
    if (trDrawState.mode === mode) { cancel(); return; }
    trDrawState.mode = mode;
    trDrawState.first = null;
    selected = -1;
    const mid = bars[Math.floor(bars.length / 2)];
    cursor = mode === "draw" ? { t: mid.t, price: mid.c } : null;
    sync();
    svg.focus({ preventScroll: true });
  };
  toggle.onclick = () => activate("draw");
  remove.onclick = () => activate("delete");
  undo.onclick = () => { undoLast(); selected = -1; sync(); };
  const pointAt = event => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return p.x >= 0 && p.x < width && p.y >= top && p.y <= bottom ? p : null;
  };
  const anchorAt = p => ({
    t: bars[Math.min(bars.length - 1, Math.floor(p.x / step))].t,
    price: max - (p.y - top) / (bottom - top) * (max - min)
  });
  const hitTest = (p, pointerType) => {
    if (!p) return -1;
    const matrix = svg.getScreenCTM();
    const scaleX = Math.hypot(matrix.a, matrix.b), scaleY = Math.hypot(matrix.c, matrix.d);
    let closest = -1, distance = pointerType === "touch" ? 14 : 8;
    for (const segment of visible) {
      const next = trDistanceToTrend(p, segment, scaleX, scaleY);
      if (next <= distance) { closest = segment.index; distance = next; }
    }
    return closest;
  };
  let press = null;
  svg.addEventListener("pointerdown", event => {
    if (!trDrawState.mode || event.button !== 0 || !event.isPrimary || !pointAt(event)) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { signal });
  svg.addEventListener("pointermove", event => {
    if (!trDrawState.mode) return;
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press = null;
    const p = pointAt(event);
    if (trDrawState.mode === "delete") {
      const hit = hitTest(p, event.pointerType);
      if (hit === selected) return;
      selected = hit;
    } else cursor = p ? anchorAt(p) : null;
    render();
  }, { signal });
  svg.addEventListener("pointercancel", () => { press = null; }, { signal });
  svg.addEventListener("pointerup", event => {
    const point = pointAt(event);
    if (trDrawState.mode && press?.id === event.pointerId && point && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 7) {
      if (trDrawState.mode === "delete") erase(hitTest(point, event.pointerType));
      else { cursor = anchorAt(point); pick(cursor); }
    }
    press = null;
  }, { signal });
  document.addEventListener("keydown", event => {
    if (trDrawState.mode && event.key === "Escape") { event.preventDefault(); cancel(); }
  }, { signal });
  svg.addEventListener("keydown", event => {
    const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (trDrawState.mode === "delete") {
      if (direction && visible.length) {
        event.preventDefault();
        const current = visible.findIndex(segment => segment.index === selected);
        const start = current < 0 && direction < 0 ? 0 : current;
        const next = (start + direction + visible.length) % visible.length;
        selected = visible[next].index;
        sync(`Đường ${next + 1} trong ${visible.length}. Nhấn Enter hoặc Delete để xóa.`);
      } else if (["Delete", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (!event.repeat) erase(selected);
      }
      return;
    }
    if (trDrawState.mode !== "draw" || !(direction || ["Enter", " "].includes(event.key))) return;
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

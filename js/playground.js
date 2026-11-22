// ============================================================
// playground.js — the Playground: app-style tiles for the site's games
// (Financial Empire, the stock simulator, the derivatives Trading Arena), shown on the Dashboard and on More.
// Each tile has its own icon, drawn here as inline SVG. The game's tile opens
// its introduction (what the game is, the rules) before the game itself.
// ============================================================

let PLAY_ICON_N = 0;   // every icon on a page needs its own gradient ids

const PLAY_ICONS = {
  // Financial Empire: a magnifier over a rising chart, in a night sky
  fw: p => `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3653a6"/><stop offset=".5" stop-color="#1a2a62"/><stop offset="1" stop-color="#0a1230"/></linearGradient>
      <radialGradient id="${p}g" cx="28" cy="28" r="25" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd978" stop-opacity=".5"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/></radialGradient>
      <linearGradient id="${p}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a6"/><stop offset="1" stop-color="#c38c2c"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="${p}c"><circle cx="28" cy="28" r="12"/></clipPath>
    </defs>
    <rect width="64" height="64" rx="15" fill="url(#${p}b)"/>
    <g fill="#fff"><circle cx="51" cy="11" r="1.3"/><circle cx="56.5" cy="24" r=".8" opacity=".7"/><circle cx="10" cy="51" r="1" opacity=".6"/><circle cx="8.5" cy="12" r=".9" opacity=".55"/><circle cx="45" cy="56.5" r=".8" opacity=".5"/><circle cx="21" cy="57" r=".6" opacity=".45"/></g>
    <circle cx="28" cy="28" r="25" fill="url(#${p}g)"/>
    <circle cx="28" cy="28" r="12" fill="#0c1636"/>
    <g clip-path="url(#${p}c)">
      <rect x="17.5" y="30" width="5" height="14" rx="1" fill="#3fae84"/>
      <rect x="25" y="25" width="5" height="19" rx="1" fill="#5cc99b"/>
      <rect x="32.5" y="20" width="5" height="24" rx="1" fill="#8fe0b9"/>
      <path d="M15 31.5 21 27l5 2 11-10" fill="none" stroke="#ffd774" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <circle cx="28" cy="28" r="12" fill="none" stroke="url(#${p}h)" stroke-width="3.6"/>
    <path d="M37 37 48 48" stroke="url(#${p}h)" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M20.6 21.6a10 10 0 0 1 5.6-3.6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>
    <rect width="64" height="64" rx="15" fill="url(#${p}s)"/>`,
  // Stock simulator: candlesticks and a rising arrow
  trade: p => `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36b585"/><stop offset=".55" stop-color="#1a7a56"/><stop offset="1" stop-color="#0b4733"/></linearGradient>
      <linearGradient id="${p}a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e9b949"/><stop offset="1" stop-color="#ffe7a1"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="64" height="64" rx="15" fill="url(#${p}b)"/>
    <path d="M9 18h46M9 30h46M9 42h46" stroke="#fff" stroke-opacity=".1"/>
    <path d="M19 21v22M31 15v20M43 10v20" stroke="#eafff4" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="15.5" y="26" width="7" height="12" rx="1.3" fill="#ff9b8a"/>
    <rect x="27.5" y="19" width="7" height="12" rx="1.3" fill="#fff"/>
    <rect x="39.5" y="14" width="7" height="11" rx="1.3" fill="#fff"/>
    <path d="M11 52 24 43l8 4 17-14" fill="none" stroke="url(#${p}a)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M41.5 33h8v8" fill="none" stroke="url(#${p}a)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect width="64" height="64" rx="15" fill="url(#${p}s)"/>`,
  // Trading Arena: long and short candles on a terminal-dark tile
  arena: p => `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#232C44"/><stop offset=".55" stop-color="#121829"/><stop offset="1" stop-color="#0B0F19"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="64" height="64" rx="15" fill="url(#${p}b)"/>
    <path d="M9 22h46M9 34h46M9 46h46" stroke="#fff" stroke-opacity=".07"/>
    <path d="M18 14v34M32 18v32M46 12v26" stroke="#9AA4B8" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="14.5" y="20" width="7" height="18" rx="1.4" fill="#22C58B"/>
    <rect x="28.5" y="27" width="7" height="16" rx="1.4" fill="#F0525C"/>
    <rect x="42.5" y="16" width="7" height="14" rx="1.4" fill="#22C58B"/>
    <circle cx="50" cy="48" r="6" fill="#E3B341"/><path d="M47.4 48h5.2M50 45.4v5.2" stroke="#0B0F19" stroke-width="1.8" stroke-linecap="round"/>
    <rect width="64" height="64" rx="15" fill="url(#${p}s)"/>`
};

function playIcon(kind, size = 56) {
  const p = `pi${++PLAY_ICON_N}-`;
  return `<svg class="play-svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${PLAY_ICONS[kind](p)}</svg>`;
}

// The tiles. The game shows "MỚI" until this account has opened its introduction, then its XP once it has some.
function playItems() {
  const fw = typeof fwSummary === "function" ? fwSummary() : null;
  return [
    { id: "fw", href: "#/game/intro", name: "Financial Empire", sub: "điều tra BCTC, cốt truyện",
      badge: !fw ? "" : fw.xp > 0 ? `${fw.xp} REP` : fw.seen ? "" : "MỚI" },
    { id: "trade", href: "#/trade", name: "Giả lập chứng khoán", sub: "tiền ảo, giá thật" },
    { id: "arena", href: "#/trading/derivatives", name: "Trading Arena", sub: "phái sinh, Long/Short" }
  ];
}

function playgroundHtml(cls = "") {
  return `<section class="card play ${cls}" aria-labelledby="play-h">
    <h2 class="play-h" id="play-h">Playground</h2>
    <div class="play-grid">${playItems().map(t => `
      <a class="play-tile" href="${t.href}">
        <span class="play-ico">${playIcon(t.id)}${t.badge ? `<span class="play-badge">${esc(t.badge)}</span>` : ""}</span>
        <span class="play-text"><span class="play-name">${t.name}</span><span class="play-sub">${t.sub}</span></span>
      </a>`).join("")}</div>
  </section>`;
}

// ============================================================
// gate-art.js — artwork for the sign-in / sign-up page (inline SVG, no images)
// ============================================================

const GOLD_STOPS = `<stop offset="0" stop-color="#f0d994"/><stop offset=".5" stop-color="#c8963e"/><stop offset="1" stop-color="#9a6b24"/>`;

function gateLogoSvg(w = 70, id = "gl") {
  return `<svg class="gate-logo" viewBox="0 0 76 64" width="${w}" role="img" aria-label="CFA Study">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient></defs>
    <rect x="12" y="34" width="11" height="16" rx="1.5" fill="url(#${id})"/><rect x="26" y="25" width="11" height="25" rx="1.5" fill="url(#${id})"/>
    <rect x="40" y="14" width="11" height="36" rx="1.5" fill="url(#${id})"/><rect x="54" y="3" width="11" height="47" rx="1.5" fill="url(#${id})"/>
    <path d="M3 50 Q38 66 73 50 Q38 58 3 50Z" fill="url(#${id})"/></svg>`;
}

function gateLaurel(flip) {
  let leaves = "";
  for (let i = 0; i < 7; i++) {
    const t = i / 6, x = 8 + t * 8 + Math.sin(t * 1.6) * 2, y = 52 - t * 44, a = -35 - t * 25;
    leaves += `<ellipse cx="${x - 5}" cy="${y}" rx="7" ry="2.8" transform="rotate(${a} ${x - 5} ${y})"/><ellipse cx="${x + 5}" cy="${y - 3}" rx="7" ry="2.8" transform="rotate(${-a - 80} ${x + 5} ${y - 3})"/>`;
  }
  return `<svg viewBox="0 0 34 60" width="30" class="gate-laurel ${flip ? "flip" : ""}" aria-hidden="true"><g fill="#b98a35">${leaves}</g><path d="M14 56 C12 40 14 20 22 6" stroke="#b98a35" stroke-width="1.4" fill="none"/></svg>`;
}

function gateCandles(n, seed, w = 14, gap = 10, h = 120) {
  let s = seed, out = "", v = 0;
  const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = 0; i < n; i++) {
    const x = i * (w + gap), up = r() > 0.4, body = 14 + r() * 38, wick = 10 + r() * 26;
    v += (up ? -1 : 1) * (6 + r() * 10); v = Math.max(-h, Math.min(0, v));
    const y = h + v, fill = up ? "#d6b06a" : "#1f3a68";
    out += `<line x1="${x + w / 2}" x2="${x + w / 2}" y1="${y - wick}" y2="${y + body + wick}" stroke="${fill}" stroke-width="1.6"/><rect x="${x}" y="${y}" width="${w}" height="${body}" rx="1.5" fill="${fill}"/>`;
  }
  return out;
}

function gateGlobe() {
  const meridians = [-.7, -.35, 0, .35, .7].map(k => `<ellipse rx="${300 * Math.abs(k) + 4}" ry="300" fill="none" stroke="#e5c372" stroke-opacity=".28"/>`).join("");
  const parallels = [-.6, -.3, 0, .3, .6].map(k => `<ellipse cy="${300 * k}" rx="${300 * Math.sqrt(1 - k * k)}" ry="${22 + 40 * (1 - Math.abs(k))}" fill="none" stroke="#e5c372" stroke-opacity=".22"/>`).join("");
  return `<defs>
      <radialGradient id="glb" cx=".35" cy=".28" r=".95"><stop offset="0" stop-color="#4a6aa0"/><stop offset=".55" stop-color="#1c3258"/><stop offset="1" stop-color="#0c1a36"/></radialGradient>
      <clipPath id="glc"><circle r="300"/></clipPath>
      <pattern id="gdots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.1" fill="#e8c978"/></pattern>
    </defs>
    <circle r="306" fill="#fff" opacity=".35"/><circle r="300" fill="url(#glb)"/>
    <g clip-path="url(#glc)">${meridians}${parallels}
      <path d="M-260 -170 C-210 -245 -90 -235 -15 -195 C40 -160 34 -95 -18 -62 C-52 -30 -92 -8 -104 42 C-134 22 -186 -18 -236 -58 C-262 -86 -270 -130 -260 -170Z" fill="url(#gdots)"/>
      <path d="M-124 86 C-72 62 -8 92 -4 152 C0 214 -40 262 -82 284 C-114 232 -146 160 -124 86Z" fill="url(#gdots)"/>
      <path d="M60 -150 C110 -190 190 -170 220 -110 C240 -60 190 -30 150 -40 C110 -50 90 -90 60 -150Z" fill="url(#gdots)"/>
      <path d="M90 10 C140 -5 200 20 200 80 C198 140 160 190 130 180 C100 150 70 60 90 10Z" fill="url(#gdots)"/>
    </g>`;
}

function gateBooks() {
  return `<defs><linearGradient id="gbk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14264a"/><stop offset="1" stop-color="#22407a"/></linearGradient></defs>
    <g transform="rotate(-2 200 190)"><rect x="-30" y="150" width="440" height="84" rx="8" fill="url(#gbk)"/><rect x="-30" y="150" width="440" height="9" fill="#e9d29a" opacity=".5"/>
      <rect x="-30" y="226" width="440" height="8" fill="#f3ead2"/><text x="190" y="206" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="34" font-weight="700" fill="#e2bd6a">Level I</text></g>
    <g transform="rotate(1 200 100)"><rect x="-10" y="68" width="390" height="82" rx="8" fill="url(#gbk)"/><rect x="-10" y="142" width="390" height="8" fill="#f3ead2"/>
      <text x="175" y="124" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="40" font-weight="700" fill="#e2bd6a">CFA<tspan font-size="18" dy="-14">®</tspan></text></g>`;
}

function gateSwooshTL() {
  return `<defs><linearGradient id="gsw" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient><linearGradient id="gnv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c1a36"/><stop offset="1" stop-color="#27457d"/></linearGradient></defs>
    <path d="M-20 0 L420 0 C300 60 150 90 -20 150Z" fill="url(#gnv)"/>
    <path d="M-20 160 C160 100 330 70 470 -10" stroke="url(#gsw)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M-20 205 C150 150 330 100 520 20" stroke="#d9b567" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M-20 232 C150 190 340 130 560 40" stroke="#e8d3a0" stroke-width="1" fill="none" opacity=".6"/>`;
}

function gateWavesBR() {
  return `<path d="M1700 340 C1520 380 1380 560 1180 660 C1040 730 880 790 760 900 L1700 900Z" fill="url(#gnv)" opacity=".95"/>
    <path d="M1700 420 C1500 450 1330 600 1150 695 C1020 760 880 820 790 900" stroke="url(#gsw)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M1700 300 C1560 300 1440 360 1300 460 C1160 560 1050 640 880 690" stroke="#e1c27c" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M1700 220 C1600 215 1500 250 1380 330" stroke="#d9b567" stroke-width="1.2" fill="none" opacity=".5"/>`;
}

// Whole background: a wide version (desktop) and a tall version (phone)
function gateArt() {
  const sky = `<defs><linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdfcf9"/><stop offset="1" stop-color="#e9edf4"/></linearGradient></defs>`;
  const wide = `<svg class="wide" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky}
    <rect width="1600" height="900" fill="url(#gbg)"/>
    <g opacity=".5" transform="translate(40 330)">${gateCandles(14, 7, 13, 14, 150)}</g>
    <g transform="translate(150 640)">${gateGlobe()}</g>
    <g opacity=".85" transform="translate(1180 160)">${gateCandles(24, 11, 12, 11, 330)}</g>
    <g opacity=".45" transform="translate(1180 160)"><polyline fill="none" stroke="#7a8aa8" stroke-width="2" points="0,260 90,200 150,230 230,130 300,170 380,70 470,20"/></g>
    ${gateSwooshTL()}${gateWavesBR()}
    <g transform="translate(-20 650) scale(.95)">${gateBooks()}</g></svg>`;
  const tall = `<svg class="tall" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky}
    <rect width="600" height="1000" fill="url(#gbg)"/>
    <g opacity=".7" transform="translate(300 700) scale(.9)">${gateCandles(14, 11, 12, 10, 200)}</g>
    <g transform="translate(40 960) scale(.62)">${gateGlobe()}</g>
    <g transform="scale(.62)">${gateSwooshTL()}</g>
    <g transform="translate(${600 - 1600 * .5} ${1000 - 900 * .5}) scale(.5)">${gateWavesBR()}</g></svg>`;
  // the two drawings are in one document: give the tall one its own ids so its gradients still work when the wide one is display:none
  const tallIds = tall.replace(/id="(\w+)"/g, 'id="$1T"').replace(/url\(#(\w+)\)/g, 'url(#$1T)');
  return `<div class="gate-bg" aria-hidden="true">${wide}${tallIds}</div>`;
}

const GATE_ICONS = {
  user: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,
  key: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.6 5.2 1.5M22 12s-3.6 7-10 7c-2 0-3.7-.6-5.2-1.5"/><path d="M3 3l18 18"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>`
};

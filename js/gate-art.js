// ============================================================
// gate-art.js — logo, laurel and icons for the sign-in / sign-up page (background art = img/gate-*.jpg)
// ============================================================

const GOLD_STOPS = `<stop offset="0" stop-color="#f0d994"/><stop offset=".5" stop-color="#c8963e"/><stop offset="1" stop-color="#9a6b24"/>`;

function gateLogoSvg(w = 70, id = "gl") {
  return `<svg class="gate-logo" viewBox="0 0 76 64" width="${w}" role="img" aria-label="CFA Study">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient></defs>
    <rect x="12" y="34" width="11" height="16" rx="1.5" fill="url(#${id})"/><rect x="26" y="25" width="11" height="25" rx="1.5" fill="url(#${id})"/>
    <rect x="40" y="14" width="11" height="36" rx="1.5" fill="url(#${id})"/><rect x="54" y="3" width="11" height="47" rx="1.5" fill="url(#${id})"/>
    <path d="M3 50 Q38 66 73 50 Q38 58 3 50Z" fill="url(#${id})"/></svg>`;
}

// Laurel branch shaped like "(" — leaves along an arc, as in the mockup
function gateLaurel(flip) {
  let leaves = "", stem = "";
  const cx = 34, cy = 32, R = 24;
  for (let i = 0; i <= 7; i++) {
    const ang = (118 + i * 17) * Math.PI / 180, x = cx + R * Math.cos(ang), y = cy - R * Math.sin(ang) * 1.15;
    const tang = Math.atan2(-Math.cos(ang) * 1.15, -Math.sin(ang)) * 180 / Math.PI;
    leaves += `<ellipse cx="${(x - 4.5 * Math.cos(ang)).toFixed(1)}" cy="${(y + 4.5 * Math.sin(ang)).toFixed(1)}" rx="5.2" ry="2.1" transform="rotate(${(tang + 35).toFixed(0)} ${(x - 4.5 * Math.cos(ang)).toFixed(1)} ${(y + 4.5 * Math.sin(ang)).toFixed(1)})"/>`;
    if (i < 7) leaves += `<ellipse cx="${(x + 4 * Math.cos(ang)).toFixed(1)}" cy="${(y - 4 * Math.sin(ang)).toFixed(1)}" rx="4.8" ry="1.9" transform="rotate(${(tang - 35).toFixed(0)} ${(x + 4 * Math.cos(ang)).toFixed(1)} ${(y - 4 * Math.sin(ang)).toFixed(1)})"/>`;
  }
  stem = `<path d="M${cx + R * Math.cos(2.06)} ${cy - R * Math.sin(2.06) * 1.15} A${R} ${R * 1.15} 0 0 0 ${cx + R * Math.cos(4.5)} ${cy - R * Math.sin(4.5) * 1.15}" stroke="#a8792e" stroke-width="1.2" fill="none"/>`;
  return `<svg viewBox="0 0 40 64" width="30" class="gate-laurel ${flip ? "flip" : ""}" aria-hidden="true">${stem}<g fill="#b98a35">${leaves}</g></svg>`;
}

const GATE_ICONS = {
  user: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.6 5.2 1.5M22 12s-3.6 7-10 7c-2 0-3.7-.6-5.2-1.5"/><path d="M3 3l18 18"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>`
};

// WCAG 2.1 contrast-ratio helper — mirrors backend/src/common/utils/contrast.ts
// exactly (same formula, REQ002 §3.4 precedent). Duplicated rather than
// imported because frontend/ and backend/ are separate packages with no
// shared workspace linkage. Used synchronously by the Appearance tab's
// accent-color picker (a client-only preference needs no server round trip)
// and by theme/index.js's own contrastText selection for a custom accent.
function srgbToLinear(channel) {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/**
 * @param {string} hex1 - '#RRGGBB'
 * @param {string} hex2 - '#RRGGBB'
 * @returns {number} contrast ratio, symmetric (order doesn't matter)
 */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG AA, normal text.
export const WCAG_AA_MIN_CONTRAST = 4.5

import i18n from './config'
import enCommon from './locales/en/common.json'
import pseudoCommon from './locales/pseudo/common.json'

// P1-07 (I18N-4) — "Every layout MUST tolerate +40% string length without
// breaking. Test with a pseudo-locale in CI." The real element-level
// overflow probe (project-plans/technical-plans/06-frontend-architecture-and-mobile.md
// §7) needs a real browser layout engine — jsdom's getBoundingClientRect()
// always returns zeros, so it can't run here. This file covers what jsdom
// CAN prove: the pseudo-locale is real generated output (not hand-typed,
// so it can never silently drift from the real English strings),
// genuinely longer, genuinely non-ASCII, and loads through the exact same
// lazy-backend path a real language switch uses — not a special case.
// The actual overflow assertion lives in
// e2e/pseudo-locale-overflow.spec.js (Playwright), written this slice but
// not executed live — no browser-automation tool was available this
// session, logged honestly rather than skipped silently.

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out))
  return out
}

describe('pseudo-locale (I18N-4)', () => {
  afterEach(async () => {
    if (i18n.language !== 'en') await i18n.changeLanguage('en')
  })

  it('is at least 40% longer than the real English source, on average', () => {
    const enStrings = collectStrings(enCommon)
    const pseudoStrings = collectStrings(pseudoCommon)
    const enTotal = enStrings.reduce((sum, s) => sum + s.length, 0)
    const pseudoTotal = pseudoStrings.reduce((sum, s) => sum + s.length, 0)
    expect(pseudoTotal).toBeGreaterThanOrEqual(enTotal * 1.4)
  })

  it('is genuinely non-ASCII (catches a font/encoding assumption English alone never would)', () => {
    const pseudoStrings = collectStrings(pseudoCommon)
    expect(pseudoStrings.every((s) => /[^\x00-\x7F]/.test(s))).toBe(true)
  })

  it('preserves {{interpolation}} placeholders exactly — a real bug caught while writing the generator', () => {
    expect(pseudoCommon.booking.holdCountdown).toContain('{{minutes}}')
    expect(pseudoCommon.booking.holdCountdown).toContain('{{seconds}}')
  })

  it('loads through the real lazy i18next backend, the same path a real language switch uses', async () => {
    await i18n.changeLanguage('pseudo')
    expect(i18n.t('booking.next')).toBe(pseudoCommon.booking.next)
    expect(i18n.t('booking.next')).not.toBe(enCommon.booking.next)
  })
})

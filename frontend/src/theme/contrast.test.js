import { contrastRatio, WCAG_AA_MIN_CONTRAST } from './contrast'

// Mirrors backend/src/common/utils/contrast.spec.ts — same formula, same
// cases, kept in sync deliberately since this file is a cited duplication
// of that one (see contrast.js's own header comment).
describe('contrastRatio', () => {
  it('black on white is the textbook maximum, ~21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  })

  it('white on white is 1:1 (no contrast)', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('is symmetric — argument order does not matter', () => {
    const a = contrastRatio('#006D77', '#FFFFFF')
    const b = contrastRatio('#FFFFFF', '#006D77')
    expect(a).toBeCloseTo(b, 10)
  })

  it('the platform default teal passes WCAG AA against white', () => {
    expect(contrastRatio('#006D77', '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
  })

  it('a pale yellow fails WCAG AA against white', () => {
    expect(contrastRatio('#FFFF00', '#FFFFFF')).toBeLessThan(WCAG_AA_MIN_CONTRAST)
  })
})

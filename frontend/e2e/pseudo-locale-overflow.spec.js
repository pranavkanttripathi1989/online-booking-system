import { test, expect } from '@playwright/test'

// P1-07 (I18N-4) — "Every layout MUST tolerate +40% string length without
// breaking. Test with a pseudo-locale in CI." This is the real check:
// the element-level overflow probe from
// project-plans/technical-plans/06-frontend-architecture-and-mobile.md §7
// (a plain page-level `scrollWidth` check reported clean on two
// live-confirmed truncation defects elsewhere in this codebase — this
// probe is what actually caught them), run against the two pages this
// slice extracted (PublicLayout's own nav/footer, and the booking wizard)
// with the generated pseudo-locale active (+40% length, non-ASCII —
// scripts/generate-pseudo-locale.mjs), at the three widths
// FRONTEND_RULES.md's own tiering table names for a mobile-first surface.
//
// Written this slice but NOT executed live — no browser-automation tool
// was available this session, matching this codebase's own established
// practice of logging that honestly (see e.g. REQ072's own account)
// rather than claiming a pass that never ran.

const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, seeded

const OVERFLOW_PROBE = () => {
  const de = document.documentElement
  const offenders = []
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.right <= de.clientWidth + 1) return
    let p = el.parentElement
    let scrollable = false
    while (p) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') {
        scrollable = true
        break
      }
      if (ox === 'hidden') break
      p = p.parentElement
    }
    if (!scrollable) offenders.push({ tag: el.tagName, cls: el.className, right: r.right, clientWidth: de.clientWidth })
  })
  return offenders
}

const WIDTHS = [360, 768, 1280]

async function activatePseudoLocale(page) {
  // Set BEFORE any app JS runs, so i18n/config.js's own detectInitialLanguage()
  // picks it up on first module evaluation — a post-load changeLanguage()
  // call would also work but this exercises the real cold-load path.
  await page.addInitScript(() => {
    window.localStorage.setItem('medibook_language', 'pseudo')
  })
}

test.describe('pseudo-locale overflow probe (I18N-4)', () => {
  for (const width of WIDTHS) {
    test(`public landing (PublicLayout nav/footer) has no clipped-and-unreachable content at ${width}px`, async ({ page }) => {
      await activatePseudoLocale(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await expect(page.getByTestId('language-switcher')).toBeVisible({ timeout: 15_000 })
      const offenders = await page.evaluate(OVERFLOW_PROBE)
      expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([])
    })

    test(`booking wizard (Select Time step) has no clipped-and-unreachable content at ${width}px`, async ({ page }) => {
      await activatePseudoLocale(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/appointments/book?doctor=${REAL_CLINICIAN_ID}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
      const offenders = await page.evaluate(OVERFLOW_PROBE)
      expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([])
    })
  }
})

import { axe } from 'jest-axe'

/**
 * P1-03 — CI-7. Runs a real axe-core scan against a rendered container and
 * asserts zero violations (jest-axe's own toHaveNoViolations, registered
 * globally in jest.setup.js). `container` is the element returned by
 * Testing Library's `render()`.
 *
 * `knownGapRuleIds` disables specific axe rules for this one call only —
 * never a blanket escape hatch. Use it ONLY for a violation that is real,
 * already identified, and deliberately not fixed in the same change that
 * added this check (logged in FRONTEND_RULES.md §22 or
 * context/open-questions.md, with a comment at the call site explaining
 * why) — never to make a test pass without understanding what it found.
 *
 * @param {HTMLElement} container
 * @param {string[]} [knownGapRuleIds]
 * @returns {Promise<void>}
 */
export async function expectNoA11yViolations(container, knownGapRuleIds = []) {
  const rules = Object.fromEntries(knownGapRuleIds.map((id) => [id, { enabled: false }]))
  const results = await axe(container, { rules })
  expect(results).toHaveNoViolations()
}

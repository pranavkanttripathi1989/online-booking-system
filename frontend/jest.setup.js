import '@testing-library/jest-dom'
// P1-03 — CI-7 (axe-core in the unit suite). Registered globally so any
// spec can call `expect(container).toHaveNoViolations()` (src/test/a11y.js
// wraps the run itself) without a per-file import.
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

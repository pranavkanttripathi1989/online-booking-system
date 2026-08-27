import '@testing-library/jest-dom'
// P1-03 — CI-7 (axe-core in the unit suite). Registered globally so any
// spec can call `expect(container).toHaveNoViolations()` (src/test/a11y.js
// wraps the run itself) without a per-file import.
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

// P1-07 — i18next must be initialized before any test renders a component
// using useTranslation(); registered globally (once) rather than per test
// file, matching this file's own established pattern for jest-axe above.
// Every test environment resolves to English (jsdom's default
// navigator.language, no localStorage override), so t() calls resolve to
// real text in every existing test unchanged — see i18n/config.js's own
// comment on why English is bundled synchronously, not lazy-loaded, for
// exactly this reason.
import './src/i18n/config'

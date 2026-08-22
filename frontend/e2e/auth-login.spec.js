import { test, expect } from '@playwright/test'

// Real-credentials login against the actual backend (not the "Demo Account"
// quick-login buttons other e2e specs use, which bypass the form entirely).
// Covers Priority 1's auth-domain e2e requirement in CLAUDE.md: this is the
// one user-facing flow that exercises the full real stack — LOGIN_MUTATION,
// GqlAuthGuard, JwtStrategy, AuthContext's token storage and role-based
// redirect — end to end, not against mocks/store.js.
// Seeded account: backend/prisma/seed.ts.
//
// Uses input[type=email]/input[type=password] rather than getByLabel — the
// email field sets inputProps={{ 'aria-label': 'Email address' }} (lowercase
// "address"), which doesn't match the visible "Email Address" label text.

test.setTimeout(60_000)

test('manager can sign in with real credentials and lands on the manager dashboard', async ({ page }) => {
  await page.goto('/login')

  await page.locator('input[type="email"]').fill('manager@medibook.dev')
  await page.locator('input[type="password"]').fill('Mgr1234!')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()

  await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 30_000 })
})

test('a wrong password is rejected without a stack trace or silent success', async ({ page }) => {
  await page.goto('/login')

  // F-02 fix (project-plans/02-findings-register.md): login.jsx used to fall
  // back, on any real login failure, to a client-side check accepting the
  // known demo password or the literal strings "password"/"demo" for any
  // seeded account — a full auth bypass. That fallback is gone; every
  // attempt is decided by the server now, so this test just needs some
  // error to surface, with no stack trace/internals leak and no redirect.
  await page.locator('input[type="email"]').fill('manager@medibook.dev')
  await page.locator('input[type="password"]').fill('DefinitelyWrongPassword!')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()

  const errorAlert = page.locator('[role="alert"]', { hasText: /invalid|incorrect|password|failed attempts/i })
  await expect(errorAlert).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/prisma|stack|internal server|unhandled/i)).toHaveCount(0)
  await expect(page).toHaveURL(/\/login/)
})

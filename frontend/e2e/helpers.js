// Shared demo-account login helper for e2e specs that don't need to test
// the login flow itself (see auth-login.spec.js for that). Uses the same
// "demo account" quick-login chips as admin-roles.spec.js — these submit
// real credentials against the real backend (login.jsx tries the real
// LOGIN_MUTATION first, MOCK_USERS is only a fallback on network failure).
export async function loginAs(page, roleLabel) {
  await page.goto('/login')
  await page.locator(`button:has-text("${roleLabel}")`).first().click()
  await page.locator('button[type="submit"]').click()
  // The submit click doesn't block on the async LOGIN_MUTATION — navigating
  // away immediately races the token write and lands back on a guarded
  // /login redirect. Wait for the real post-login redirect first.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}

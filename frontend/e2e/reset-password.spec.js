import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { registerDisposableAccount } from './helpers.js'

// BUG022 — forgot-password.jsx only ever called the first step
// (forgotPassword); there was no page that ever called the real, already-
// tested resetPassword mutation, so the account-recovery flow dead-ended
// at "check your inbox" for every account. This spec proves the new
// reset-password page actually completes the flow end to end against the
// real backend: a real token minted by forgotPassword, consumed by
// resetPassword, and the new password actually works at a real login.
//
// Uses a freshly-registered disposable account (same helper settings-2fa.spec.js
// already uses for an identical reason) rather than the shared demo
// clinician/manager accounts -- changing one of those accounts' real
// password mid-suite would break every other spec's loginAs() call racing
// against it.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const BACKEND_CONTAINER = process.env.E2E_BACKEND_CONTAINER || 'medibook_backend'

async function gql(request, query, variables) {
  const res = await request.post(GRAPHQL_URL, { data: { query, variables } })
  const body = await res.json()
  if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`)
  return body.data
}

// The real send goes through AWS SES once that pipeline exists; today it's
// a deliberate console-log stub (auth.service.ts's own comment), which is
// the only place the real, real raw token is ever observable end to end.
function extractResetTokenFromLogs(email) {
  const logs = execSync(`docker logs ${BACKEND_CONTAINER} --tail 200`, { encoding: 'utf8' })
  const line = logs
    .split('\n')
    .reverse()
    .find((l) => l.includes('[EMAIL STUB] Password reset token for') && l.includes(email))
  if (!line) throw new Error(`No reset-token log line found for ${email}`)
  const match = line.match(/token for [^:]+:\s*([0-9a-f]+)/)
  if (!match) throw new Error(`Could not parse token from log line: ${line}`)
  return match[1]
}

test('a real forgotPassword + resetPassword round trip actually changes the account password', async ({ page, request }) => {
  const { email, password } = await registerDisposableAccount(request, { firstName: 'E2E', lastName: 'ResetFlow' })

  await gql(
    request,
    `
    mutation($input: ForgotPasswordInput!) { forgotPassword(input: $input) { success } }
  `,
    { input: { email } },
  )

  const token = extractResetTokenFromLogs(email)
  const newPassword = 'NewE2ePass123'

  await page.goto(`/reset-password?token=${token}`)
  await page.getByLabel(/^New Password/).fill(newPassword)
  await page.getByLabel(/^Confirm New Password/).fill(newPassword)
  await page.getByRole('button', { name: 'Reset Password' }).click()
  await expect(page.getByText('Password updated')).toBeVisible({ timeout: 15_000 })

  // Prove the change was actually persisted, not just a UI success message —
  // a real login with the OLD password must now fail...
  const oldLoginRes = await request.post(GRAPHQL_URL, {
    data: { query: `mutation { login(input: {email: "${email}", password: "${password}"}) { ... on AuthPayload { access_token } } }` },
  })
  const oldLogin = await oldLoginRes.json()
  expect(oldLogin.errors).toBeTruthy()

  // ...and a real login with the NEW password must succeed.
  const newLoginRes = await request.post(GRAPHQL_URL, {
    data: { query: `mutation { login(input: {email: "${email}", password: "${newPassword}"}) { ... on AuthPayload { access_token } } }` },
  })
  const newLogin = await newLoginRes.json()
  expect(newLogin.errors).toBeFalsy()
  expect(newLogin.data.login.access_token).toBeTruthy()
})

test('a reset-password link with no token shows the invalid-link state', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByText('This link is invalid')).toBeVisible()
  await expect(page.getByLabel(/^New Password/)).toHaveCount(0)
})

test('submitting a garbage token surfaces the real backend rejection', async ({ page }) => {
  await page.goto('/reset-password?token=not-a-real-token')
  await page.getByLabel(/^New Password/).fill('SomePassword123')
  await page.getByLabel(/^Confirm New Password/).fill('SomePassword123')
  await page.getByRole('button', { name: 'Reset Password' }).click()
  await expect(page.getByText('Invalid or expired reset token')).toBeVisible({ timeout: 15_000 })
})

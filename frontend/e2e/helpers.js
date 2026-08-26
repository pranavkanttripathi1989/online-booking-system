import crypto from 'crypto'

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

  // ...and then wait for the token to actually be durably in storage before
  // returning. Waiting on the URL alone is NOT sufficient: the redirect is a
  // client-side navigate(), so it can win the race against the LOGIN_MUTATION
  // response being committed. A caller's subsequent hard page.goto() then
  // cancels the in-flight request (confirmed in a real run: the Login GraphQL
  // request shows as "canceled" in the network log), leaving no token. Every
  // query on the destination page is then unauthenticated and returns empty —
  // and because several pages still carry an `apiRows.length === 0 → render
  // MOCK_DATA` fallback (project-plans/02-findings-register.md F-18/F-21),
  // the page renders fabricated rows instead of failing loudly. That is how
  // this race surfaced: specs asserting on real seeded names (e.g. "MG Road
  // Clinic") timed out while the page confidently displayed London mock
  // clinics. Deterministic wait, so the failure mode can't recur.
  await page.waitForFunction(() => !!(localStorage.getItem('medibook_token') || sessionStorage.getItem('medibook_token')), null, {
    timeout: 15_000,
  })
}

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'

// PLAN016 Slice C — registers a real, disposable account via the real
// `register` mutation (register.jsx's own RegisterTab is 100% mock/
// simulated, not wired to a real mutation, so it can't be used for this).
// Used by settings-2fa.spec.js instead of the shared manager@medibook.dev
// account, since fullyParallel:true means enabling 2FA on a shared login
// account mid-suite would break every other spec's loginAs() call racing
// against it.
export async function registerDisposableAccount(request, { firstName = 'E2E', lastName = 'Totp' } = {}) {
  const email = `e2e-totp-${Date.now()}-${Math.floor(Math.random() * 1e6)}@medibook.dev`
  const password = 'E2eTotpTest1!'
  const res = await request.post(GRAPHQL_URL, {
    data: {
      query: `mutation Register($input: RegisterInput!) { register(input: $input) { access_token user { id email } } }`,
      variables: { input: { email, password, first_name: firstName, last_name: lastName } },
    },
  })
  const body = await res.json()
  if (body.errors) throw new Error(`registerDisposableAccount failed: ${JSON.stringify(body.errors)}`)
  return { email, password }
}

// RFC 6238 TOTP, matching backend's otplib (authenticator) defaults:
// SHA-1, 30s step, 6 digits. Used to compute a real code against a secret
// captured live from startTotpEnrollment's QR dialog — never hardcoded.
export function computeTotpCode(secretBase32, timeStep = 30, digits = 6) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of secretBase32.replace(/=+$/, '').toUpperCase()) {
    const idx = alphabet.indexOf(c)
    if (idx === -1) continue
    bits += idx.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  const key = Buffer.from(bytes)
  const counter = Math.floor(Date.now() / 1000 / timeStep)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) %
    10 ** digits
  return code.toString().padStart(digits, '0')
}

import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `products` and `rooms` backend domains —
// both verified real via Chrome MCP live inspection
// (context/qa-full-inventory.md §7).

test('admin sees real seeded products with generated SKUs', async ({ page }) => {
  // Logged in as admin (org-less, unscoped) rather than manager — the
  // "GP Consultation" seed product is clinic-less (context/open-questions.md
  // #2's create-time gap), so it's invisible to an org-scoped manager's
  // findAll() but visible to admin. Confirmed via Chrome MCP before writing
  // this test rather than assumed.
  await loginAs(page, 'Admin')
  await page.goto('/manager/products')

  await expect(page.getByText('GP Consultation')).toBeVisible({ timeout: 15_000 })
  // ProductsService.generateSku() slugifies the name and appends a base-36
  // timestamp — a real generated SKU looks like "gp-consultation-<base36>",
  // never the clean hand-picked "GPS-001" style codes the (still-broken,
  // mock-fallback) manager/services page shows.
  await expect(page.getByText(/^gp-consultation-[a-z0-9]+$/)).toBeVisible()
})

test('manager sees real seeded rooms scoped to their org clinics', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/rooms')

  await expect(page.getByText('Room 3A')).toBeVisible({ timeout: 15_000 })
  // Both seeded rooms belong to MG Road Clinic, so the clinic name renders
  // twice (once per room card) — assert at least one is visible rather than
  // requiring a single match.
  await expect(page.getByText('MG Road Clinic').first()).toBeVisible()
})

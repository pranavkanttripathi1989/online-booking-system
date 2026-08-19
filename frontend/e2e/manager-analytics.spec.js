import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `analytics` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7).
// The real analytics.resolver.ts (getAppointmentStats) is only exercised
// by manager/Dashboard.jsx — the standalone /analytics page is a separate,
// still-mock page (fictional clinicians, USD instead of ₹) and is
// deliberately not tested here since it isn't the real backend.

test('manager dashboard shows real analytics in rupees for a real clinic', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/dashboard')

  // "MG Road Clinic" also appears in a hidden recharts measurement span and
  // an SVG tspan — scope to the first (visible) match.
  await expect(page.getByText('MG Road Clinic').first()).toBeVisible({ timeout: 15_000 })
  // A real generated-revenue figure in rupees — the mock /analytics page
  // never shows ₹ (it's hardcoded to USD), so this alone distinguishes it.
  await expect(page.getByText('₹499').first()).toBeVisible()
})

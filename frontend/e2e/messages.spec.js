import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `messages` backend domain — verified real
// via Chrome MCP live inspection (context/qa-full-inventory.md §7 and an
// earlier session's live verification, both against the real sendMessage
// mutation and graphql-ws messageReceived subscription).

test('manager can send a real message in an existing thread', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/messages')

  // A thread is auto-selected on load (index.jsx defaults to the first
  // conversation) — the composer being visible confirms one is open.
  const composer = page.getByPlaceholder('Type a message…')
  await expect(composer).toBeVisible({ timeout: 15_000 })

  const body = `e2e message ${Date.now()}`
  await composer.fill(body)
  await composer.press('Enter')

  // The sent text also appears in the sidebar's thread-preview snippet, so
  // scope to the message bubble itself rather than matching either copy.
  await expect(page.getByRole('paragraph').filter({ hasText: body })).toBeVisible({ timeout: 15_000 })
})

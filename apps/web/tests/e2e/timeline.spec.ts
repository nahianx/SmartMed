import { test, expect } from '@playwright/test'

test('timeline page loads and shows activities', async ({ page }) => {
  await page.goto('/timeline')

  await expect(page.getByText('SmartMed')).toBeVisible()
  await expect(page.getByText('Date Range')).toBeVisible()

  // With seeded data, we expect at least one sample activity title
  await expect(
    page.getByText('Visit with Dr. Sarah Chen, Cardiology'),
  ).toBeVisible()
})

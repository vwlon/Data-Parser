const { test, expect } = require('@playwright/test');

test('Cashback CSV parsing', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Click the Cashback tab
  await page.click('button:has-text("Cashback")');

  // Upload the CSV file
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('#cashback button:has-text("Choose CSV File")').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('example data.csv');

  // Wait for a brief moment to ensure the file is processed
  await page.waitForTimeout(1000);

  // Check that the tables are populated in the DOM
  await page.waitForSelector('#cashbackTableBody1 tr', { state: 'attached' });

  // Verify the content of the first table
  const table1Rows = await page.locator('#cashbackTableBody1 tr').count();
  expect(table1Rows).toBeGreaterThan(0);

  // Verify the content of the second table
  const table2Rows = await page.locator('#cashbackTableBody2 tr').count();
  expect(table2Rows).toBeGreaterThan(0);

  // Verify the content of the third table
  const table3Rows = await page.locator('#cashbackTableBody3 tr').count();
  expect(table3Rows).toBeGreaterThan(0);

  // Take a screenshot
  await page.screenshot({ path: 'cashback-test.png' });
});

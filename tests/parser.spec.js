const { test, expect } = require('@playwright/test');

test.describe('Data Parser Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('should correctly parse and display admin data', async ({ page }) => {
    // Navigate to the Admin tab
    await page.click('button:has-text("Admin")');

    // Input data into the textarea
    const adminData = `
1		topjaya
Withdraw	2025-12-12 09:31:26	1,000,000 	601,433.50
G3
SEABANK, 901738613824, MUHAMMAD ROHIM S KOM
2		deawae
Withdraw	2025-12-13 22:08:21	5,000,000 	15,512,915
G4
BCA, 3300901394, M YUDA
    `;
    await page.fill('#adminInputText', adminData);

    // Click the parse button
    await page.click('button:has-text("Parse Admin Data")');

    // Wait for the results to be displayed
    await page.waitForSelector('#adminResultTable tbody tr');

    // Take a screenshot of the output
    await page.screenshot({ path: 'admin_parser_output_fixed.png' });

    // Verify the parsed data in the table
    const rows = await page.$$('#adminResultTable tbody tr');
    expect(rows.length).toBe(2);

    const firstRow = await rows[0].innerText();
    expect(firstRow).toContain('SEABANK');
    expect(firstRow).toContain('topjaya');
    expect(firstRow).toContain('1,000,000');
    expect(firstRow).toContain('MUHAMMAD ROHIM S KOM');

    const secondRow = await rows[1].innerText();
    expect(secondRow).toContain('BCA');
    expect(secondRow).toContain('deawae');
    expect(secondRow).toContain('5,000,000');
    expect(secondRow).toContain('M YUDA');
  });
});
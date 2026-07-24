import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Invoice PDF Upload Flow', () => {
  const dummyPdfPath = path.resolve(__dirname, '../fixtures/dummy.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices');
  });

  test('valid PDF success state', async ({ page }) => {
    // Route the API request to return a successful tokenization response
    await page.route('**/invoices', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tokenizationDelay: 0, success: true })
      });
    });

    const fileInput = page.locator('#invoice-file-input');
    await fileInput.setInputFiles(dummyPdfPath);

    const submitBtn = page.locator('#invoice-upload-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should display the success message
    await expect(page.getByText('Invoice queued for tokenization. Blockchain confirmation pending.')).toBeVisible();
  });

  test('network-failure error copy', async ({ page }) => {
    // Route the API request to return a 500 error with no specific JSON message
    await page.route('**/invoices', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    const fileInput = page.locator('#invoice-file-input');
    await fileInput.setInputFiles(dummyPdfPath);

    const submitBtn = page.locator('#invoice-upload-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify fallback error text for 500 status
    await expect(page.getByText('Upload failed (500)')).toBeVisible();
  });

  test('non-PDF rejection', async ({ page }) => {
    const fileInput = page.locator('#invoice-file-input');
    
    // Create a dummy non-pdf file in memory
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world')
    });

    // Check error text directly
    await expect(page.getByText('Invalid file type "text/plain". Only PDF files are accepted.')).toBeVisible();
  });

  test('oversized-file rejection', async ({ page }) => {
    const fileInput = page.locator('#invoice-file-input');
    
    // Create an 11 MB buffer
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); 
    
    await fileInput.setInputFiles({
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: oversizedBuffer
    });

    // Check size limit error text
    await expect(page.getByText('File is 11.0 MB — exceeds the 10 MB limit.')).toBeVisible();
  });
});

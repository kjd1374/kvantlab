const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:6001', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/Users/jungdookim/.gemini/antigravity/brain/e3284333-b43c-4c31-bd45-092289999a9a/landing_page_preview_fixed.webp', fullPage: true });
  await browser.close();
  console.log('Screenshot saved.');
})();

const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4200/account', { waitUntil: 'networkidle2' });
  
  try {
    await page.type('input[placeholder="your.email@example.com"]', 'test@test.com');
    await page.type('input[type="password"]', 'testtest');
    await Promise.all([
      page.click('button'),
      page.waitForSelector('.profile-card', { timeout: 5000 }),
    ]);
  } catch (e) {}

  const html = await page.evaluate(() => document.querySelector('.profile-card').innerHTML);
  console.log("PROFILE CARD HTML:", html);
  await browser.close();
})();

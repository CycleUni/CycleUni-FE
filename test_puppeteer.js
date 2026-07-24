const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/', { waitUntil: 'networkidle2' });
  const html = await page.evaluate(() => document.querySelector('.school-selector').innerHTML);
  console.log("HTML:", html);
  await browser.close();
})();

const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4200/', { waitUntil: 'networkidle2' });
  
  const html = await page.evaluate(() => {
    const el = document.querySelector('.waitlist-card');
    return el ? el.innerText : 'Not found';
  });
  console.log("WAITLIST:", html);
  
  await browser.close();
})();

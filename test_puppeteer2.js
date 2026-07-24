const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/', { waitUntil: 'networkidle2' });
  
  // Wait for listings to load
  await page.waitForSelector('.section-title');
  let html = await page.evaluate(() => document.querySelector('.flex-2').innerHTML);
  console.log("INITIAL LISTINGS HTML:", html.substring(0, 500));

  // Change school dropdown
  await page.select('select', '國立政治大學');
  await new Promise(r => setTimeout(r, 2000));
  
  html = await page.evaluate(() => document.querySelector('.flex-2').innerHTML);
  console.log("AFTER CHANGE HTML:", html.substring(0, 500));

  await browser.close();
})();

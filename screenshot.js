const puppeteer = require('puppeteer');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const viewports = [
    { width: 390, height: 1500, name: '390' },
    { width: 420, height: 1500, name: '420' },
    { width: 768, height: 1500, name: '768' }
  ];
  
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:4200', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `mobile_home_${vp.name}.png`, fullPage: true });
    console.log(`Screenshot saved: mobile_home_${vp.name}.png`);
  }
  
  await browser.close();
})();

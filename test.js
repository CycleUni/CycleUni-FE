const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:4200');
  await page.evaluate(() => {
    localStorage.setItem('lang', 'zh-TW');
    localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg0NzE2MDk4LCJpYXQiOjE3ODQ3MTUxOTgsImp0aSI6IjFiZTFhZTAyZTE5MDQxNDJhYWNmNjU0MzEyZDRjOWFjIiwidXNlcl9pZCI6Mn0.NDYDoj8IFkLgJRNLrNT1vJyKYs894MxmIc2r9Mesr-Y');
    localStorage.setItem('refresh_token', 'fake');
  });
  
  await page.goto('http://localhost:4200/seller/2', { waitUntil: 'networkidle0' });
  
  await page.evaluate(() => {
    // Navigate using history pushState to bypass full reload
    history.pushState(null, '', '/account');
    window.dispatchEvent(new Event('popstate'));
  });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    history.back();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  console.log('Is empty app-seller-page?', content.includes('<app-seller-page _nghost') && !content.includes('class=\"seller-page\"'));
  
  const fs = require('fs');
  fs.writeFileSync('page_content_real.html', content);
  
  await browser.close();
})();

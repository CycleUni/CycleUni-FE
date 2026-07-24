// Take a mobile-viewport screenshot of the homepage using Chrome's headless mode.
// Emulates iPhone 12 (390x844) which is the most common small phone viewport.
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const url = 'http://localhost:4200/';
const out = path.resolve(__dirname, 'mobile_home_before.png');

// Use Chrome's headless mode with --window-size and DPR=2 to mimic a phone.
// device-scale-factor = 2 to capture high-DPI mobile rendering.
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--virtual-time-budget=8000',  // wait for hydration + async data
  `--window-size=390,1500`,
  '--force-device-scale-factor=2',
  `--screenshot=${out}`,
  url,
];

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
console.log('launching chrome headless...', args.join(' '));
const child = spawn(chromePath, args, { stdio: 'inherit' });
child.on('exit', (code) => {
  console.log('exit', code);
  if (fs.existsSync(out)) {
    console.log('screenshot:', out, fs.statSync(out).size, 'bytes');
  } else {
    console.log('NO SCREENSHOT WRITTEN');
  }
});

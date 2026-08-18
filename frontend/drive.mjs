import { chromium } from 'playwright';
import fs from 'fs';

const shotDir = 'C:\\Users\\RITIKK~1\\AppData\\Local\\Temp\\claude\\e--LAUNDARY\\8ecd53b1-0075-4453-8395-b1bb23166b51\\scratchpad\\shots';
fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

async function shot(name) {
  await page.screenshot({ path: `${shotDir}/${name}.png` });
  console.log('shot:', name);
}

await page.goto('http://localhost:5174/');
await page.waitForSelector('text=Get started', { timeout: 15000 });
await shot('01-splash');

await page.click('text=Get started');
await page.waitForSelector('input[placeholder="98765 43210"]');
const phone = String(Math.floor(6000000000 + Math.random() * 900000000));
await page.fill('input[placeholder="98765 43210"]', phone);
await shot('02-phone');
await page.click('text=Continue');

await page.waitForSelector('text=demo — your code is', { timeout: 15000 });
const hintText = await page.textContent('text=demo — your code is');
const code = hintText.trim().split(' ').pop();
console.log('devCode:', code);
const otpInputs = await page.$$('input[maxlength="1"]');
for (let i = 0; i < 4; i++) {
  await otpInputs[i].fill(code[i]);
}
await shot('03-otp');
await page.click('text=Verify & continue');

await page.waitForSelector('input[placeholder="e.g. Aanya Sharma"]', { timeout: 15000 });
await page.fill('input[placeholder="e.g. Aanya Sharma"]', 'Playwright Tester');
await page.fill('input[placeholder="e.g. B-204"]', 'PW-1');
await shot('04-name');
await page.click('text=Create account');

await page.waitForSelector('text=Laundry room', { timeout: 15000 });
await shot('05-home');

const cardTexts = await page.$$eval('button:has-text("Tap to start")', (els) => els.length);
console.log('available machine cards:', cardTexts);

await page.click('button:has-text("Tap to start") >> nth=0');
await page.waitForSelector('text=Programs on this machine', { timeout: 10000 });
await shot('06-booking-sheet');

await page.click('text=/Start washing/');
await page.waitForSelector('text=Cycle started', { timeout: 10000 });
await shot('07-toast-started');

await page.waitForTimeout(500);
await shot('08-home-after-booking');

await page.click('a:has-text("My machine")');
await page.waitForSelector('text=remaining', { timeout: 10000 });
await shot('09-my-machine');

console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));

await browser.close();

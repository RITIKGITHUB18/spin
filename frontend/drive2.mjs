import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
page.on('requestfailed', (req) => console.log('REQFAILED', req.url(), req.failure()?.errorText));
page.on('response', (res) => {
  if (res.url().includes('/api/')) console.log('RESPONSE', res.status(), res.url());
});

await page.goto('http://localhost:5174/');
await page.click('text=Get started');
await page.waitForSelector('input[placeholder="98765 43210"]');
await page.fill('input[placeholder="98765 43210"]', '6577923380');
const btn = await page.$('button:has-text("Continue")');
const disabled = await btn.getAttribute('disabled');
const cls = await btn.getAttribute('class');
console.log('disabled attr:', disabled);
console.log('class:', cls);
await btn.click();
await page.waitForTimeout(2000);
console.log('URL after click:', page.url());
await browser.close();

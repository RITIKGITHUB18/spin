import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
page.on('request', (req) => console.log('REQUEST', req.method(), req.url()));
page.on('requestfailed', (req) => console.log('REQFAILED', req.url(), req.failure()?.errorText));
page.on('response', (res) => console.log('RESPONSE', res.status(), res.url()));

await page.goto('http://localhost:5174/');
await page.click('text=Get started');
await page.waitForSelector('input[placeholder="98765 43210"]');
await page.fill('input[placeholder="98765 43210"]', '6577923381');
await page.click('button:has-text("Continue")');
await page.waitForTimeout(3000);
console.log('URL after click:', page.url());
await browser.close();

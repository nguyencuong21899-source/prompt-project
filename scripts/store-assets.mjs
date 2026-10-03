import { chromium } from 'playwright';
import { readFile, mkdir, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Capture the packaged UI in an isolated profile, with public catalog data only.
const output = resolve('dist/store-assets');
const profile = await mkdtemp(join(tmpdir(), 'prompt-cnc-store-'));
await mkdir(output, { recursive: true });
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${resolve('extension')}`, `--load-extension=${resolve('extension')}`]
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const catalog = JSON.parse(await readFile('data/catalog.json', 'utf8'));
  await context.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: catalog }));
  // No external AI request is needed to photograph the input screen.
  await context.route('https://prompt-hub-api-yktt.onrender.com/**', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/popup.html?mode=tab`);
  await page.locator('#sync-label').filter({ hasText: 'Đã đồng bộ' }).waitFor();
  await page.locator('.card').first().waitFor();
  await page.screenshot({ path: join(output, '01-library.png') });
  await page.locator('[data-prompt-id="406"] .preview-action').click();
  await page.locator('#prompt-preview[open]').waitFor();
  await page.screenshot({ path: join(output, '02-preview.png') });
  await page.locator('#close-preview').click();
  await page.locator('#links-tab').click();
  await page.locator('#ai-links').click();
  await page.locator('a').filter({ hasText: 'ChatGPT' }).first().waitFor();
  await page.screenshot({ path: join(output, '03-links.png') });
  await page.locator('#prompt-main').click();
  await page.locator('#open-optimizer').click();
  await page.locator('#optimizer-input').fill('Viết một email ngắn mời đồng nghiệp tham dự cuộc họp lúc 9 giờ sáng thứ Hai. Giọng văn lịch sự, nêu rõ mục đích họp và đề nghị xác nhận tham dự.');
  await page.screenshot({ path: join(output, '04-optimizer.png') });
  if (errors.length) throw new Error(errors.join('\n'));
  await copyFile('extension/icons/128.png', join(output, 'icon-128.png'));
  const logo = (await readFile('extension/icons/128.png')).toString('base64');
  const promo = await context.newPage();
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:440px;height:280px;overflow:hidden;background:linear-gradient(130deg,#10285f,#2258dc);color:white;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center}
    img{width:76px;height:76px}h1{font-size:32px;letter-spacing:-1px;margin:14px 0 10px}p{font-size:15px;margin:0;color:#dce8ff}nav{display:flex;gap:9px;margin-top:22px}span{border:1px solid #ffffff40;border-radius:20px;padding:8px 14px;font-size:12px;background:#ffffff0d}
    </style></head><body><img alt="" src="data:image/png;base64,${logo}"><h1>Prompt CNC</h1><p>Thư viện prompt &amp; công cụ làm việc</p><nav><span>Tìm nhanh</span><span>Chèn vào AI</span><span>Lưu cá nhân</span></nav></body></html>`);
  await promo.locator('img').evaluate(img => img.decode());
  await promo.screenshot({ path: join(output, 'promo-440x280.png') });
  console.log('Created store icon, promotional tile and 4 screenshots in dist/store-assets');
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}

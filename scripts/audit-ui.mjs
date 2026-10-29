import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { issueAdminEmailSession, ADMIN_COOKIE } from '../lib/payments/admin-auth.ts';

const base = process.env.HOSTORA_E2E_BASE_URL;
if (!base || new URL(base).hostname !== '127.0.0.1') throw new Error('Run pnpm audit:ui to use an isolated local server.');
const output = process.env.HOSTORA_AUDIT_OUTPUT;
if (!output) throw new Error('An evidence output directory is required.');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOSTORA_CHROMIUM_PATH || '/snap/bin/chromium' });
const results = [];
try {
  for (const [viewportName, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const token = issueAdminEmailSession({ password: '', secret: process.env.HOSTORA_ADMIN_SESSION_SECRET || '' });
    if (!token) throw new Error('An isolated admin session secret is required.');
    await context.addCookies([{ name: ADMIN_COOKIE, value: token, url: base, httpOnly: true, sameSite: 'Strict' }]);
    for (const path of ['/', '/consultation', '/recommendations', '/admin', '/admin/orders', '/admin/support']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor({ state: 'visible' });
      if (path === '/recommendations') await page.getByRole('region', { name: 'Bảng so sánh ba gói' }).waitFor();
      if (path === '/admin') {
        await expect(page.getByText('Đang đồng bộ kho hóa đơn', { exact: true })).toHaveCount(0, { timeout: 20000 });
        await expect(page.getByText('Đang lấy trạng thái', { exact: true })).toHaveCount(0, { timeout: 20000 });
      }
      const slug = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-');
      const filename = `${viewportName}-${slug}`;
      writeFileSync(`${output}/${filename}.txt`, await page.locator('body').ariaSnapshot());
      await page.screenshot({ path: `${output}/${filename}.png`, animations: 'disabled' });
      const analysis = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const dimensions = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
      results.push({ path, viewport: viewportName, url: page.url(), screenshot: `${filename}.png`, dimensions, errors, violations: analysis.violations.map(({ id, impact, description, helpUrl, nodes }) => ({ id, impact, description, helpUrl, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })) });
      writeFileSync(`${output}/ui-audit.json`, JSON.stringify(results, null, 2));
      console.log(`${viewportName} ${path}: ${analysis.violations.length} automated accessibility findings, ${errors.length} page errors`);
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
if (results.some(result => result.violations.length || result.errors.length || result.dimensions.scroll > result.dimensions.client + 1)) process.exitCode = 1;

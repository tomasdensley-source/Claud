// Render build/print.html to the reading-edition PDF with headless Chromium.
// Usage: node writings/tools/make_pdf.js  (needs Playwright; Chromium path via CHROMIUM env if not bundled)
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'build', 'print.html'), { waitUntil: 'networkidle', timeout: 0 });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 0 });
  await page.pdf({
    path: path.join(root, 'The_Writings_of_Thomas_Densley_Reading_Edition.pdf'),
    width: '6in', height: '9in', preferCSSPageSize: true, printBackground: true, outline: true, tagged: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;text-align:center;font:7pt Georgia,serif;color:#777"><span class="pageNumber"></span></div>',
    timeout: 0,
  });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

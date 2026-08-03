/* ============================================================
   Padel Logan — social export
   Renders each HTML artboard to a pixel exact PNG at 2x.

   Setup (once):
     cd social && npm install playwright && npx playwright install chromium
   Run:
     node export.mjs            → PNGs land in ./build/
   ============================================================ */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, 'build');
mkdirSync(out, { recursive: true });

// [source html, output png, width, height]
const boards = [
  ['01-foundation-1080x1350.html',      'padel-logan-foundation-1080x1350.png',     1080, 1350],
  ['02-inclusions-1080x1350.html',      'padel-logan-inclusions-1080x1350.png',     1080, 1350],
  ['03-pricing-1080x1350.html',         'padel-logan-pricing-1080x1350.png',        1080, 1350],
  ['04-member-vs-casual-1080x1080.html','padel-logan-member-vs-casual-1080x1080.png',1080, 1080],
  ['05-story-1080x1920.html',           'padel-logan-story-1080x1920.png',          1080, 1920],
  ['06-cta-1080x1080.html',             'padel-logan-secure-cta-1080x1080.png',     1080, 1080],
];

const url = (f) => 'file://' + resolve(__dirname, f);

const browser = await chromium.launch();
try {
  for (const [src, name, w, h] of boards) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.goto(url(src), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // guard: content must not overflow the artboard
    const overflow = await page.evaluate(() => {
      const c = document.querySelector('.canvas');
      const i = c.querySelector('.inner');
      return Math.round(i.scrollHeight - i.clientHeight);
    });
    if (overflow > 1) console.warn(`  ! ${src} content overflows by ${overflow}px`);

    await (await page.$('.canvas')).screenshot({ path: resolve(out, name) });
    await page.close();
    console.log('OK  ', name, `(${w}x${h} @2x)`);
  }
} finally {
  await browser.close();
}
console.log('\nExported to social/build/');

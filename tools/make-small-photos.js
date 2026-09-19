// Makes the small copies of the gallery photos that the site loads
// (images/small/). Photos come off a camera at several megabytes each, but
// they're only ever shown a few hundred pixels across.
//
// To run it: have the site running on localhost:5000, then from a folder
// with playwright-core installed (npm install playwright-core):
//   node make-small-photos.js "C:/path/to/the_school_from_scratch_website" 900 0.72
// The last two are the longest side in pixels and the JPEG quality.
// Originals in images/ are never touched.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SITE = process.argv[2] || 'C:/Users/maxwe/Projects/The School From Scratch/the_school_from_scratch_website';
const MAX = Number(process.argv[3] || 900);   // longest side, in pixels
const QUALITY = Number(process.argv[4] || 0.72);

(async () => {
  const settings = fs.readFileSync(path.join(SITE, 'settings.md'), 'utf8');
  const code = [...settings.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]).join('\n');
  const ctx = { random: 'random' };
  require('vm').createContext(ctx);
  require('vm').runInContext(code, ctx);
  const files = ctx.PHOTOS;
  const outDir = path.join(SITE, 'images', 'small');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5000/');
  let before = 0, after = 0;
  for (const file of files) {
    const src = path.join(SITE, 'images', file);
    const bytes = fs.statSync(src).size;
    const data = await page.evaluate(async ({ file, MAX, QUALITY }) => {
      const img = new Image();
      img.src = 'images/' + encodeURIComponent(file);
      await img.decode();
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext('2d');
      c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, w, h);
      return { url: canvas.toDataURL('image/jpeg', QUALITY), w, h, ow: img.naturalWidth, oh: img.naturalHeight };
    }, { file, MAX, QUALITY });
    const buf = Buffer.from(data.url.split(',')[1], 'base64');
    // Keep the original name, but always a .jpg now.
    const out = path.join(outDir, file.replace(/\.[^.]+$/, '.jpg'));
    fs.writeFileSync(out, buf);
    before += bytes;
    after += buf.length;
    console.log(`${file}: ${data.ow}x${data.oh} ${(bytes / 1e6).toFixed(2)}MB -> ${data.w}x${data.h} ${(buf.length / 1e3).toFixed(0)}KB`);
  }
  console.log(`total ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(2)}MB`);
  await browser.close();
})();

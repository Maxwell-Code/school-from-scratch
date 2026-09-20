// Makes the small copies of the gallery photos that the site loads
// (images/small/). Photos come off a camera at several megabytes each, but
// they're only ever shown a few hundred pixels across, so the site loads
// these instead: about 1.4 MB for the whole gallery instead of 20 MB.
//
// This normally runs by itself: GitHub makes any missing copies whenever
// photos are pushed (.github/workflows/small-photos.yml). To run it here:
//   npm install sharp
//   node tools/make-small-photos.js
//
// It reads PHOTOS and PHOTO_SMALL_FOLDER from settings.md, makes a copy for
// any photo that hasn't got one (or whose photo has changed), and deletes
// copies of photos that are no longer listed. Originals are never touched.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const sharp = require('sharp');

const SITE = path.resolve(__dirname, '..');
const MAX = Number(process.env.PHOTO_MAX_SIDE || 900);   // longest side, pixels
const QUALITY = Number(process.env.PHOTO_QUALITY || 72);

// The settings are the `NAME = value` lines in settings.md's code blocks.
function readSettings() {
  const text = fs.readFileSync(path.join(SITE, 'settings.md'), 'utf8');
  const box = { random: 'random' };
  vm.createContext(box);
  for (const [, code] of text.replace(/\r\n?/g, '\n').matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)) {
    try { vm.runInContext(code, box); } catch { /* a broken block is skipped, as on the site */ }
  }
  return box;
}

const hash = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const smallName = (file) => file.replace(/\.[^.]+$/, '.jpg');

(async () => {
  const settings = readSettings();
  const photos = (settings.PHOTOS || []).map(String);
  const fromDir = path.join(SITE, settings.PHOTO_FOLDER || 'images/');
  const outDir = path.join(SITE, settings.PHOTO_SMALL_FOLDER || 'images/small/');
  if (!settings.PHOTO_SMALL_FOLDER) {
    console.log('PHOTO_SMALL_FOLDER is empty in settings.md: nothing to do.');
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });

  // What each copy was made from, so a replaced photo gets a new copy.
  const listFile = path.join(outDir, 'made-from.json');
  const madeFrom = fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : {};
  const nowMadeFrom = {};
  let made = 0, removed = 0;

  for (const file of photos) {
    const src = path.join(fromDir, file);
    if (!fs.existsSync(src)) {
      console.warn(`! ${file} is listed in PHOTOS but isn't in the images folder`);
      continue;
    }
    const out = path.join(outDir, smallName(file));
    const stamp = hash(src);
    nowMadeFrom[smallName(file)] = stamp;
    if (fs.existsSync(out) && madeFrom[smallName(file)] === stamp) continue;
    const image = sharp(src, { failOn: 'none' }).rotate(); // rotate: honour the camera's orientation
    const meta = await image.metadata();
    await image
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(out);
    const before = fs.statSync(src).size, after = fs.statSync(out).size;
    console.log(`${file}: ${meta.width}x${meta.height} ${(before / 1e6).toFixed(2)}MB -> ${(after / 1e3).toFixed(0)}KB`);
    made++;
  }

  // Copies of photos that are no longer listed.
  const wanted = new Set(photos.map(smallName));
  for (const name of fs.readdirSync(outDir)) {
    if (name === 'made-from.json' || wanted.has(name)) continue;
    fs.unlinkSync(path.join(outDir, name));
    console.log(`removed ${name} (no longer in PHOTOS)`);
    removed++;
  }

  fs.writeFileSync(listFile, JSON.stringify(nowMadeFrom, null, 1) + '\n');
  console.log(`${made} made, ${removed} removed, ${photos.length} photos in all.`);
})();

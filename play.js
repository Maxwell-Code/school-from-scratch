// The play's page (is_nirmal_normal.html).
//
// Behind the words, the person icon is repeated in an even grid across the
// page, with one of them drawn as an outline instead of filled in: the odd
// one out. The page can also use fonts of its own, different from the rest
// of the site. Everything here is set in settings.md.

window.settingsLoaded.then(() => {
  const root = document.documentElement.style;

  // ---- Fonts of its own ------------------------------------------------------
  // Empty means "the same as the rest of the site".
  const headingFont = String(setting('PLAY_HEADING_FONT', '')).trim();
  const bodyFont = String(setting('PLAY_BODY_FONT', '')).trim();
  const headingWeight = setting('PLAY_HEADING_FONT_WEIGHT', 600);
  const bodyWeight = setting('PLAY_BODY_FONT_WEIGHT', 500);
  const families = [];
  if (headingFont) {
    families.push(encodeURIComponent(headingFont) + ':wght@' + headingWeight);
    root.setProperty('--heading-font', `'${headingFont}', Georgia, serif`);
    root.setProperty('--heading-weight', headingWeight);
  }
  if (bodyFont) {
    families.push(encodeURIComponent(bodyFont) + ':wght@' + [...new Set([bodyWeight, 700])].sort((a, b) => a - b).join(';'));
    root.setProperty('--body-font', `'${bodyFont}', 'Segoe UI', sans-serif`);
    root.setProperty('--body-weight', bodyWeight);
  }
  if (families.length) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + families.join('&family=') + '&display=swap';
    document.head.appendChild(link);
  }

  // ---- The icons behind the words -------------------------------------------
  const layer = document.getElementById('icon-field');
  if (!layer) return;
  const file = String(setting('PLAY_BACKGROUND_ICON', 'assets/person_icon.svg')).trim();
  if (!file) return;

  const HEIGHT = Math.max(8, setting('PLAY_ICON_HEIGHT', 84));   // how tall each icon is
  const GAP = Math.max(0, setting('PLAY_ICON_GAP', 56));         // space left between them
  const COLOR = String(setting('PLAY_ICON_COLOR', '#dfeac0')).trim();
  const THICKNESS = Math.max(0.5, setting('PLAY_OUTLINE_THICKNESS', 3));
  const WHICH = setting('PLAY_OUTLINE_WHICH', 'random'); // 'middle', 'random', or a number
  let chosenSpot = null; // for 'random': where it landed, kept through a resize

  root.setProperty('--icon-height', HEIGHT + 'px');
  root.setProperty('--icon-gap', GAP + 'px');
  root.setProperty('--icon-color', COLOR);
  root.setProperty('--icon-outline', THICKNESS + 'px');
  root.setProperty('--icon-file', `url("${file}")`);

  // The outlined one is the same drawing with nothing filled in, so it's
  // fetched and put straight into the page, where its lines can be styled.
  let outlineSvg = null;
  const outlineReady = fetch(file, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      const holder = document.createElement('div');
      holder.innerHTML = text;
      outlineSvg = holder.querySelector('svg');
      if (outlineSvg) outlineSvg.classList.add('person', 'outline');
    })
    .catch((err) => console.warn(file + ' could not be read for the outline (' + err.message + ').'));

  // The icon's own proportions, so a row of them is spaced evenly across.
  let ratio = 340 / 621; // the drawing's width against its height
  function fillField() {
    const step = HEIGHT + GAP;                  // from one icon to the next, down the page
    const width = HEIGHT * ratio;
    const across = width + GAP;
    const cols = Math.ceil(window.innerWidth / across) + 1;
    const rows = Math.ceil(window.innerHeight / step) + 1;
    // Middled, so the grid doesn't start hard against a corner.
    const startX = (window.innerWidth - (cols * across - GAP)) / 2;
    const startY = (window.innerHeight - (rows * step - GAP)) / 2;

    const total = cols * rows;
    // Which one is the odd one out.
    let odd = Math.floor(rows / 2) * cols + Math.floor(cols / 2); // the middle of the grid
    if (typeof WHICH === 'number') {
      odd = ((Math.round(WHICH) % total) + total) % total;
    } else if (String(WHICH).toLowerCase() === 'random') {
      // Picked once, then kept in the same place as the window changes size.
      if (!chosenSpot) chosenSpot = { acrossPart: 0.15 + Math.random() * 0.7, downPart: 0.15 + Math.random() * 0.7 };
      const col = Math.min(cols - 1, Math.floor(chosenSpot.acrossPart * cols));
      const row = Math.min(rows - 1, Math.floor(chosenSpot.downPart * rows));
      odd = row * cols + col;
    }

    const pieces = [];
    for (let i = 0; i < total; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const left = startX + col * across;
      const top = startY + row * step;
      let piece;
      if (i === odd && outlineSvg) {
        piece = outlineSvg.cloneNode(true);
      } else {
        piece = document.createElement('div');
        piece.className = 'person';
      }
      piece.style.left = left.toFixed(1) + 'px';
      piece.style.top = top.toFixed(1) + 'px';
      pieces.push(piece);
    }
    layer.replaceChildren(...pieces);
  }

  outlineReady.then(() => {
    if (outlineSvg) {
      const box = outlineSvg.getAttribute('viewBox');
      const parts = box ? box.split(/[\s,]+/).map(Number) : null;
      if (parts && parts.length === 4 && parts[3]) ratio = parts[2] / parts[3];
    }
    fillField();
  });

  let again = 0;
  window.addEventListener('resize', () => {
    clearTimeout(again);
    again = setTimeout(fillField, 150);
  });
});

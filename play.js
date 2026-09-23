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

  const HEIGHT = Math.max(8, setting('PLAY_ICON_HEIGHT', 260));  // how tall each icon is
  const GAP = Math.max(0, setting('PLAY_ICON_GAP', 28));         // space left between them
  const COLOR = String(setting('PLAY_ICON_COLOR', '#000000')).trim();
  const THICKNESS = Math.max(0.5, setting('PLAY_OUTLINE_THICKNESS', 3));
  const TEXT_CLEARANCE = Math.max(0, setting('PLAY_TEXT_CLEARANCE', 24)); // space kept around the words
  const WHICH = setting('PLAY_OUTLINE_WHICH', 'middle'); // 'middle', 'random', or a number
  let chosenSpot = null; // for 'random': where it landed, kept through a resize

  root.setProperty('--icon-height', HEIGHT + 'px');
  root.setProperty('--icon-gap', GAP + 'px');
  root.setProperty('--icon-color', COLOR);
  root.setProperty('--icon-outline', THICKNESS + 'px');
  root.setProperty('--icon-file', `url("${file}")`);

  // The outlined one is the same drawing with only its edge drawn. The
  // drawing is made of separate pieces (head, arms, body, legs) which
  // overlap, so drawing the edge of each piece would leave lines criss-
  // crossing inside it. Instead the whole silhouette is taken as one shape:
  // a copy of it is shrunk from every side and cut out of the original,
  // which leaves just the band around the outside, however the pieces
  // happen to be arranged.
  const NS = 'http://www.w3.org/2000/svg';
  function outlinePiece() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'person outline');
    svg.setAttribute('viewBox', '0 0 ' + Math.round(100 * ratio) + ' 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const id = 'edge-only';
    // The drawing is 100 tall in its own terms, so the thickness asked for
    // in pixels is turned into that scale.
    const radius = (THICKNESS * 100 / HEIGHT).toFixed(3);
    // Every step is made all-or-nothing (a part-way shade is pushed to one
    // side or the other), otherwise the thinnest part of the figure - the
    // shoulders - comes out as a half-faded grey patch instead of a line.
    const solid = '<feComponentTransfer><feFuncA type="linear" slope="255" intercept="-0.5"/></feComponentTransfer>';
    svg.innerHTML =
      '<filter id="' + id + '" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
        '<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="shape"/>' +
        '<feComponentTransfer in="shape" result="whole">' +
          '<feFuncA type="linear" slope="255" intercept="-0.5"/>' +
        '</feComponentTransfer>' +
        '<feMorphology in="whole" operator="erode" radius="' + radius + '" result="eroded"/>' +
        '<feComponentTransfer in="eroded" result="inside">' +
          '<feFuncA type="linear" slope="255" intercept="-0.5"/>' +
        '</feComponentTransfer>' +
        '<feComposite in="whole" in2="inside" operator="out" result="edge"/>' +
        '<feFlood flood-color="' + COLOR + '" result="paint"/>' +
        '<feComposite in="paint" in2="edge" operator="in"/>' +
      '</filter>' +
      '<image href="' + file + '" x="0" y="0" width="100%" height="100%"' +
      ' preserveAspectRatio="none" filter="url(#' + id + ')"></image>';
    return svg;
  }

  // The drawing's own proportions, read once from the file.
  let outlineSvg = null;
  const outlineReady = fetch(file, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      const holder = document.createElement('div');
      holder.innerHTML = text;
      outlineSvg = holder.querySelector('svg');
    })
    .catch((err) => console.warn(file + ' could not be read (' + err.message + ').'));

  // The icon's own proportions, so a row of them is spaced evenly across.
  let ratio = 340 / 621; // the drawing's width against its height
  function fillField() {
    const step = HEIGHT + GAP;                  // from one icon to the next, down the page
    const width = HEIGHT * ratio;
    const across = width + GAP;
    // The grid is lined up so that one icon sits exactly in the middle of
    // the screen, and then reaches out from there in every direction.
    const middleX = window.innerWidth / 2 - width / 2;
    const middleY = window.innerHeight / 2 - HEIGHT / 2;
    const toLeft = Math.ceil(middleX / across);
    const above = Math.ceil(middleY / step);
    const startX = middleX - toLeft * across;
    const startY = middleY - above * step;
    const cols = toLeft + Math.ceil((window.innerWidth - middleX) / across) + 1;
    const rows = above + Math.ceil((window.innerHeight - middleY) / step) + 1;

    const total = cols * rows;
    // Where the words are, so no figure is put under them.
    const wordBoxes = wordsOnScreen();
    const clashes = (left, top) => wordBoxes.some((w) =>
      left < w.right + TEXT_CLEARANCE && left + width > w.left - TEXT_CLEARANCE &&
      top < w.bottom + TEXT_CLEARANCE && top + HEIGHT > w.top - TEXT_CLEARANCE);
    const spotOf = (i) => ({
      left: startX + (i % cols) * across,
      top: startY + Math.floor(i / cols) * step,
    });
    // Which one is the odd one out.
    // The one in the middle of the screen.
    let odd = above * cols + toLeft;
    if (typeof WHICH === 'number') {
      odd = ((Math.round(WHICH) % total) + total) % total;
    } else if (String(WHICH).toLowerCase() === 'random') {
      // Picked once, then kept in the same place as the window changes size.
      if (!chosenSpot) chosenSpot = { acrossPart: 0.15 + Math.random() * 0.7, downPart: 0.15 + Math.random() * 0.7 };
      const col = Math.min(cols - 1, Math.floor(chosenSpot.acrossPart * cols));
      const row = Math.min(rows - 1, Math.floor(chosenSpot.downPart * rows));
      odd = row * cols + col;
    }

    // If the words cover the one that would be outlined, the nearest clear
    // figure to the middle of the screen takes its place.
    if (clashes(spotOf(odd).left, spotOf(odd).top)) {
      const midX = window.innerWidth / 2, midY = window.innerHeight / 2;
      let best = -1, nearest = Infinity;
      for (let i = 0; i < total; i++) {
        const spot = spotOf(i);
        if (clashes(spot.left, spot.top)) continue;
        const away = Math.hypot(spot.left + width / 2 - midX, spot.top + HEIGHT / 2 - midY);
        if (away < nearest) { nearest = away; best = i; }
      }
      if (best >= 0) odd = best;
    }

    const pieces = [];
    for (let i = 0; i < total; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const left = startX + col * across;
      const top = startY + row * step;
      let piece;
      if (i === odd) {
        piece = outlinePiece();
      } else {
        piece = document.createElement('div');
        piece.className = 'person';
      }
      piece.style.left = left.toFixed(1) + 'px';
      piece.style.top = top.toFixed(1) + 'px';
      piece.dataset.left = left;
      piece.dataset.top = top;
      pieces.push(piece);
    }
    layer.replaceChildren(...pieces);
    keepClearOfWords();
  }

  // Where the words are on the screen at the moment.
  function wordsOnScreen() {
    return [...document.querySelectorAll('main h1, main .pay-content > *')]
      .filter((el) => el.offsetWidth && el.offsetHeight && el.textContent.trim())
      .map((el) => el.getBoundingClientRect());
  }

  // The words come first: any figure that would sit under them steps aside.
  // (The page can be scrolled, so this is worked out again as it moves.)
  function keepClearOfWords() {
    const wordBoxes = wordsOnScreen();
    const width = HEIGHT * ratio;
    for (const piece of layer.children) {
      const left = Number(piece.dataset.left), top = Number(piece.dataset.top);
      const clash = wordBoxes.some((w) =>
        left < w.right + TEXT_CLEARANCE && left + width > w.left - TEXT_CLEARANCE &&
        top < w.bottom + TEXT_CLEARANCE && top + HEIGHT > w.top - TEXT_CLEARANCE);
      piece.style.visibility = clash ? 'hidden' : '';
    }
  }

  let waiting = false;
  window.addEventListener('scroll', () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(() => { waiting = false; keepClearOfWords(); });
  }, { passive: true });

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

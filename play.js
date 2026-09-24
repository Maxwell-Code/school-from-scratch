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
  const main = document.querySelector('main');
  if (!layer) return;
  const file = String(setting('PLAY_BACKGROUND_ICON', 'assets/person_icon.svg')).trim();
  if (!file) return;

  const HEIGHT = Math.max(8, setting('PLAY_ICON_HEIGHT', 200));  // how tall each icon is
  const GAP = Math.max(0, setting('PLAY_ICON_GAP', 20));         // space left between them
  const COLOR = String(setting('PLAY_ICON_COLOR', '#000000')).trim();
  const THICKNESS = Math.max(0.5, setting('PLAY_OUTLINE_THICKNESS', 3));
  const TEXT_CLEARANCE = Math.max(0, setting('PLAY_TEXT_CLEARANCE', 24)); // space kept around the words
  const ROWS_AFTER_TEXT = Math.max(0, setting('PLAY_ROWS_AFTER_TEXT', 3)); // rows left under the last line
  // The title can be broken into two lines with the outlined figure standing
  // between them. An empty list leaves the title in one piece.
  const TITLE_LINES = setting('PLAY_TITLE_LINES', []).map((line) => String(line).trim()).filter(Boolean);
  const TITLE_FIGURE = Math.max(0, setting('PLAY_TITLE_FIGURE_HEIGHT', 200));
  const TITLE_FIGURE_PLACE = String(setting('PLAY_TITLE_FIGURE_PLACE', 'between')).trim().toLowerCase();
  const SPACE_ABOVE_HEADING = setting('PLAY_SPACE_ABOVE_HEADING', true) !== false;
  const ROWS_ABOVE_HEADING = Math.max(0, setting('PLAY_ROWS_ABOVE_HEADING', 1)); // rows left above the heading
  const WHICH = setting('PLAY_OUTLINE_WHICH', 'middle'); // 'middle', 'random', or a number
  let chosenSpot = null; // for 'random': where it landed, kept through a resize

  root.setProperty('--icon-color', COLOR);
  root.setProperty('--icon-outline', THICKNESS + 'px');

  // ---- A menu bar of its own --------------------------------------------------
  root.setProperty('--play-menu-bg', String(setting('PLAY_MENU_BACKGROUND', '#ffffff')).trim());
  root.setProperty('--play-menu-outline', String(setting('PLAY_MENU_OUTLINE_COLOR', '#000000')).trim());
  root.setProperty('--play-menu-outline-thickness', Math.max(0, setting('PLAY_MENU_OUTLINE_THICKNESS', 2)) + 'px');

  // Every figure on the page, filled or outlined, is a copy of the drawing's
  // own shapes. The outlined one is simply that shape drawn with a pen
  // instead of filled in, so its line is even the whole way round and stays
  // sharp however large the figure is. Which of the two a figure is, is left
  // to the stylesheet.
  const NS = 'http://www.w3.org/2000/svg';
  function piece(kind) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'person ' + kind);
    svg.setAttribute('viewBox', sourceViewBox);
    if (sourceSvg) {
      for (const child of sourceSvg.children) svg.appendChild(child.cloneNode(true));
    }
    return svg;
  }

  // The title, broken in two with the outlined figure standing between the
  // lines, front and centre.
  let figureInTitle = false;
  function buildTitle() {
    const heading = document.getElementById('title');
    if (!heading || !TITLE_LINES.length || !TITLE_FIGURE) return;
    // Standing between the lines takes two lines to stand between; with only
    // one, there is nowhere to stand and the title is left alone.
    const between = TITLE_FIGURE_PLACE !== 'below';
    if (between && TITLE_LINES.length < 2) return;
    const lineOf = (words) => {
      const line = document.createElement('span');
      line.className = 'title-line';
      line.textContent = words;
      return line;
    };
    const figure = piece('outline');
    figure.classList.add('in-title');
    figure.setAttribute('aria-hidden', 'true');
    figure.style.height = TITLE_FIGURE + 'px';
    figure.style.width = (TITLE_FIGURE * ratio).toFixed(1) + 'px';

    heading.textContent = '';
    heading.classList.add('split-by-figure');
    if (between) {
      heading.append(lineOf(TITLE_LINES[0]), figure, lineOf(TITLE_LINES.slice(1).join(' ')));
    } else {
      for (const words of TITLE_LINES) heading.append(lineOf(words));
      heading.append(figure);
    }
    figureInTitle = true;
  }

  // The drawing itself, read once from the file, along with the proportions
  // and coordinates every copy of it is cut to.
  let sourceSvg = null;
  let ratio = 1;                      // the figure's width against its height
  let sourceViewBox = '0 0 100 100';
  const drawingReady = fetch(file)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      const holder = document.createElement('div');
      holder.innerHTML = text;
      sourceSvg = holder.querySelector('svg');
      if (sourceSvg) measureDrawing();
    })
    .catch((err) => console.warn(file + ' could not be read (' + err.message + ').'));

  // A drawing often carries empty margin around the figure, which would show
  // up as extra space between the figures on the page. So the figure's own
  // bounds are measured and used instead: the gap set in settings.md is then
  // the gap that actually shows.
  function measureDrawing() {
    const box = (sourceSvg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (box.length === 4 && box[2] && box[3]) {
      sourceViewBox = box.join(' ');
      ratio = box[2] / box[3];
    }
    // Measuring means asking the browser, which means the drawing has to be
    // on the page: it goes somewhere out of sight and is taken away again.
    const hidden = document.createElement('div');
    hidden.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px;height:300px;visibility:hidden';
    const copy = sourceSvg.cloneNode(true);
    hidden.appendChild(copy);
    document.body.appendChild(hidden);
    try {
      const bounds = copy.getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        sourceViewBox = [bounds.x, bounds.y, bounds.width, bounds.height]
          .map((n) => Number(n.toFixed(3))).join(' ');
        ratio = bounds.width / bounds.height;
      }
    } catch (err) {
      // No matter: the drawing's own box will do.
    }
    hidden.remove();
  }

  // Where the top row begins: just under the menu bar, so the first figures
  // stand whole on the page instead of being cut off by it.
  function below(el) {
    if (!el || !el.offsetHeight) return 0;
    return getComputedStyle(el).position === 'fixed'
      ? el.getBoundingClientRect().height       // it hangs over the page
      : el.offsetTop + el.offsetHeight;         // it takes up room of its own
  }

  // The heading is pushed far enough down the page for whole rows of figures
  // to stand above it, each row spaced from the one before it as everywhere
  // else. The last of those rows needs the space the words keep around them
  // as well, or the row would stand there and then be hidden for coming too
  // close to the heading — a row with its middle missing.
  function spaceAboveHeading(startY, step) {
    const heading = document.getElementById('title');
    if (!heading || !main || !SPACE_ABOVE_HEADING || !ROWS_ABOVE_HEADING) return;
    const padding = parseFloat(getComputedStyle(main).paddingTop) || 0;
    const now = heading.getBoundingClientRect().top + window.scrollY;
    const wanted = startY + ROWS_ABOVE_HEADING * step + Math.max(0, TEXT_CLEARANCE - GAP);
    // Rounded up and left alone once it's within a pixel, so it settles
    // instead of creeping down the page a fraction at a time.
    if (Math.abs(wanted - now) > 1) {
      main.style.paddingTop = Math.max(0, Math.ceil(padding + (wanted - now))) + 'px';
    }
  }

  function fillField() {
    const step = HEIGHT + GAP;                  // from one icon to the next, down the page
    const width = HEIGHT * ratio;
    const across = width + GAP;
    // Everything below is measured with the field emptied out, or the page
    // would be measuring its own figures rather than the words on it.
    layer.style.height = '0px';
    // The top row stands clear of the menu bar by the same space that is
    // left between one row and the next.
    const startY = below(document.getElementById('quick-nav')) + GAP;
    spaceAboveHeading(startY, step);
    // Where the words are, so no figure is put under them, and where the
    // last of them ends.
    const wordBoxes = wordsOnScreen();
    const wordsEnd = wordBoxes.reduce((lowest, w) => Math.max(lowest, w.bottom), 0);
    // How far down the figures have to reach: past the end of the page, and
    // far enough past the last line of words to leave a few rows under it.
    const reach = Math.max(window.innerHeight, document.documentElement.scrollHeight,
      wordsEnd + ROWS_AFTER_TEXT * step);
    // Across, the grid is lined up so one figure sits in the middle of the
    // screen; down, it begins at the top and carries on to the end.
    const middleX = window.innerWidth / 2 - width / 2;
    const toLeft = Math.ceil(middleX / across);
    const startX = middleX - toLeft * across;
    const cols = toLeft + Math.ceil((window.innerWidth - middleX) / across) + 2;
    const rows = Math.max(1, Math.ceil((reach - startY + GAP) / step));
    // The page ends where the last row does, so the bottom row is whole too.
    layer.style.height = (startY + rows * step - GAP) + 'px';
    // Every other row is stepped half a place across, so each figure stands
    // between the two in the row below. The rows either side of the middle
    // one are the stepped ones, which keeps that figure where it is.
    const middleRow = Math.max(0, Math.round((window.innerHeight / 2 - HEIGHT / 2 - startY) / step));
    const shiftOf = (row) => ((row - middleRow) % 2 === 0 ? 0 : across / 2);

    const total = cols * rows;
    const clashes = (left, top) => wordBoxes.some((w) =>
      left < w.right + TEXT_CLEARANCE && left + width > w.left - TEXT_CLEARANCE &&
      top < w.bottom + TEXT_CLEARANCE && top + HEIGHT > w.top - TEXT_CLEARANCE);
    const spotOf = (i) => ({
      left: startX + (i % cols) * across - shiftOf(Math.floor(i / cols)),
      top: startY + Math.floor(i / cols) * step,
    });
    // Which one is the odd one out.
    // The one in the middle of the first screenful.
    let odd = middleRow * cols + toLeft;
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
      const midX = window.innerWidth / 2;
      const midY = startY + middleRow * step + HEIGHT / 2;
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
      const { left, top } = spotOf(i);
      const figure = piece(i === odd && !figureInTitle ? 'outline' : 'filled');
      figure.style.left = left.toFixed(1) + 'px';
      figure.style.top = top.toFixed(1) + 'px';
      figure.style.width = width.toFixed(1) + 'px';
      figure.style.height = HEIGHT + 'px';
      figure.dataset.left = left;
      figure.dataset.top = top;
      pieces.push(figure);
    }
    layer.replaceChildren(...pieces);
    keepClearOfWords();
  }

  // Where the words sit on the page. Measured from the top of the page
  // rather than the top of the window, like the figures themselves, so how
  // far the page has been scrolled makes no difference.
  function wordsOnScreen() {
    const downBy = window.scrollY, alongBy = window.scrollX;
    return [...document.querySelectorAll('main h1, main .pay-content > *')]
      .filter((el) => el.offsetWidth && el.offsetHeight && el.textContent.trim())
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { left: box.left + alongBy, right: box.right + alongBy,
          top: box.top + downBy, bottom: box.bottom + downBy };
      });
  }

  // The words come first: any figure that would sit under them steps aside.
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

  // The words arrive after the page does — the text is fetched, and the
  // fonts after that — and each time they do they take up a different amount
  // of room. The figures are worked out again whenever that happens, so none
  // of them is ever left sitting on top of the words.
  if (main && window.ResizeObserver) {
    let settling = 0;
    new ResizeObserver(() => {
      clearTimeout(settling);
      settling = setTimeout(fillField, 100);
    }).observe(main);
  }

  drawingReady.then(() => {
    buildTitle();
    fillField();
  });

  let again = 0;
  window.addEventListener('resize', () => {
    clearTimeout(again);
    again = setTimeout(fillField, 150);
  });
});

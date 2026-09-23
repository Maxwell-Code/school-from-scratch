// Shared by every menu page (people.html, cost.html, ...) and 404.html.
// Each page file names itself in <body data-page="...">; 404.html works it out
// from the address instead, so an option added in settings.md still gets a
// working page on a web server before its own file exists.

// A word settings.md can use: LAYOUT_SEED = random
window.random = 'random';

function loadSettings() {
  return fetch('settings.md', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      // Only the ``` code blocks are settings; the rest is notes. Each block
      // runs on its own, so a mistake in one only skips that block.
      const blocks = [...text.replace(/\r\n?/g, '\n').matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)];
      for (const [, code] of blocks) {
        try {
          (0, eval)(code); // runs as plain page-wide code: NAME = value sets NAME
        } catch (err) {
          console.error('settings.md: skipped a code block with a mistake (' + err.message + '):\n' + code);
        }
      }
    })
    .catch((err) => console.warn('settings.md could not be loaded (' + err.message + '); using the built-in defaults.'));
}

function setting(name, fallback) {
  const value = window[name];
  if (value === undefined || typeof value !== typeof fallback) return fallback;
  return value;
}

// "Parent-Learning" -> "parent-learning", "FAQs" -> "faqs". Must match
// pageSlug() in index.html.
function pageSlug(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Other scripts on a page (payments.js) wait on this before reading settings.
window.settingsLoaded = loadSettings();

window.settingsLoaded.then(() => {
  const root = document.documentElement.style;
  root.setProperty('--bg', setting('BACKGROUND_COLOR', '#000000'));
  root.setProperty('--fg', setting('TEXT_COLOR', '#ffffff'));
  root.setProperty('--accent', setting('ACCENT_COLOR', '#dfeac0'));

  const HEADING_FONT = setting('HEADING_FONT', 'Lora');
  const HEADING_WEIGHT = setting('HEADING_FONT_WEIGHT', 600);
  const BODY_FONT = setting('BODY_FONT', 'Quicksand');
  const BODY_WEIGHT = setting('BODY_FONT_WEIGHT', 500);
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(HEADING_FONT) + ':wght@' + HEADING_WEIGHT +
    '&family=' + encodeURIComponent(BODY_FONT) + ':wght@' + BODY_WEIGHT + '&display=swap';
  document.head.appendChild(fontLink);
  root.setProperty('--heading-font', `'${HEADING_FONT}', Georgia, serif`);
  root.setProperty('--heading-weight', HEADING_WEIGHT);
  root.setProperty('--body-font', `'${BODY_FONT}', 'Segoe UI', sans-serif`);
  root.setProperty('--body-weight', BODY_WEIGHT);
  root.setProperty('--heading-size', Math.max(8, setting('HEADING_FONT_SIZE', 64)) + 'px');
  root.setProperty('--body-size', Math.max(8, setting('BODY_FONT_SIZE', 24)) + 'px');
  // Two columns in a text file (Role — Name): how far apart they sit, and
  // whether the dash between them shows.
  root.setProperty('--pair-gap', Math.max(0, setting('TWO_COLUMN_GAP', 64)) + 'px');
  document.documentElement.classList.toggle('two-column-dash', setting('TWO_COLUMN_DASH', false) === true);

  // The menu bar across the top, on pages that have one (payments.html).
  // Its options lead to their section on the home page.
  const quickNav = document.getElementById('quick-nav');
  if (quickNav) {
    root.setProperty('--top-menu-height', Math.max(24, setting('TOP_MENU_HEIGHT', 64)) + 'px');
    root.setProperty('--top-menu-text-size', Math.max(8, setting('TOP_MENU_TEXT_SIZE', 17)) + 'px');
    root.setProperty('--top-menu-slide-ms', Math.max(0, setting('TOP_MENU_SLIDE_MS', 350)) + 'ms');
    root.setProperty('--top-menu-hover-spacing', setting('TOP_MENU_HOVER_LETTER_SPACING', 0.3) + 'em');
    root.setProperty('--top-menu-hover-ms', Math.max(0, setting('TOP_MENU_HOVER_SPEED_MS', 250)) + 'ms');
    root.setProperty('--menu-spacing-hover', setting('MENU_LETTER_SPACING_HOVER', 0.06) + 'em');
    root.setProperty('--top-underline-thickness', Math.max(0, setting('TOP_MENU_UNDERLINE_THICKNESS', 2)) + 'px');
    document.documentElement.classList.toggle('no-top-menu-animation', !setting('TOP_MENU_ANIMATION', true));
    const quickList = quickNav.querySelector('#quick-list');
    const home = document.createElement('a');
    home.href = 'index.html';
    home.textContent = String(setting('TOP_MENU_HOME_LABEL', 'Home')).trim() || 'Home';
    // The menu's options, then any that belong only to the bar.
    const inBar = [...setting('MENU_ITEMS', []), ...setting('TOP_MENU_EXTRA_ITEMS', [])];
    quickList.replaceChildren(home, ...inBar
      .map((item) => String(item).trim()).filter(Boolean).map((label) => {
        const link = document.createElement('a');
        // An option with its own address (MENU_LINKS) goes there; the rest
        // lead to their section on the home page.
        const own = String((setting('MENU_LINKS', {}) || {})[label] || '').trim();
        link.href = own || 'index.html#' + pageSlug(label);
        link.textContent = label;
        return link;
      }));
    quickList.classList.toggle('underline', setting('TOP_MENU_UNDERLINE_ON_HOVER', true));
    requestAnimationFrame(() => quickNav.classList.add('show'));
  }

  // Which page is this? The file's own name, or (on 404.html) the address.
  const own = document.body.dataset.page;
  const slug = own ? pageSlug(own) : pageSlug(decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/i, '')));
  const menuName = setting('MENU_ITEMS', []).find((item) => pageSlug(item) === slug);
  const name = menuName || own;

  const titleEl = document.getElementById('title');
  const statusEl = document.getElementById('status');
  if (!name) {
    titleEl.textContent = 'Page not found';
    statusEl.textContent = '';
    const digits = document.getElementById('digits');
    if (digits) digits.hidden = false; // notfound.js makes them pushable

    document.title = 'Page not found · ' + setting('MENU_TITLE', 'The School From Scratch');
    return;
  }
  titleEl.textContent = name;
  document.title = name + ' · ' + setting('MENU_TITLE', 'The School From Scratch');

  // Contact details (phone number and Venmo logo) on the pages named in
  // CONTACT_PAGES.
  const contactPages = setting('CONTACT_PAGES', ['Cost']).map(pageSlug);
  if (!contactPages.includes(slug)) return;
  const phone = setting('PHONE_NUMBER', '+1 (805) 798-5098').trim();
  const showVenmo = setting('SHOW_VENMO_LOGO', true);
  const venmoLink = setting('VENMO_LINK', '').trim();

  const phoneEl = document.getElementById('phone');
  if (phone) {
    phoneEl.textContent = phone;
    phoneEl.href = 'tel:' + phone.replace(/[^\d+]/g, '');
  } else {
    phoneEl.remove();
  }
  const venmoEl = document.getElementById('venmo-link');
  if (!showVenmo) {
    venmoEl.remove();
  } else if (/^https:\/\//i.test(venmoLink)) {
    venmoEl.href = venmoLink;
    venmoEl.target = '_blank';
    venmoEl.rel = 'noopener';
  }
  if (phone || showVenmo) document.getElementById('contact').hidden = false;
});

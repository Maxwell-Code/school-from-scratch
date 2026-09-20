// The payments page: the Zelle logo, then the words from the text file named
// in PAYMENTS_TEXT_FILE (sections/payments/payments.md), written in Markdown
// like the section files. {SETTING_NAME} in that file is replaced with the
// setting's value, so the Zelle tag only has to be written in one place.

window.settingsLoaded.then(() => {
  const root = document.documentElement.style;
  root.setProperty('--zelle-logo-width', Math.max(40, setting('ZELLE_LOGO_WIDTH', 240)) + 'px');
  // Same rounded corners as the gallery photos (PHOTO_CORNER_RADIUS).
  root.setProperty('--zelle-logo-radius', (setting('PHOTO_ROUNDED_CORNERS', true) ? Math.max(0, setting('PHOTO_CORNER_RADIUS', 12)) : 0) +
    (String(setting('PHOTO_CORNER_RADIUS_UNIT', 'pixels')).trim().toLowerCase().startsWith('percent') ? '%' : 'px'));
  root.setProperty('--step-circle', Math.max(16, setting('PAYMENT_STEP_CIRCLE_SIZE', 36)) + 'px');
  root.setProperty('--step-gap', Math.max(0, setting('PAYMENT_STEP_SPACING', 28)) + 'px');

  // The logo replaces the word "Zelle" once it has loaded. If the file is
  // missing, the word stays. SHOW_ZELLE_LOGO = false hides both.
  const file = String(setting('ZELLE_LOGO', '')).trim();
  if (!setting('SHOW_ZELLE_LOGO', true)) {
    document.querySelector('.zelle-mark').hidden = true;
  } else if (file) {
    const logo = document.getElementById('zelle-logo');
    logo.onload = () => {
      logo.hidden = false;
      document.getElementById('zelle-word').hidden = true;
    };
    logo.src = file;
  }

  // {SETTING_NAME} -> that setting's value (an unknown name is left alone).
  const fillIn = (text) => text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (all, name) =>
    (typeof window[name] === 'string' || typeof window[name] === 'number' ? String(window[name]) : all));

  const box = document.getElementById('pay-content');
  const textFile = String(setting('PAYMENTS_TEXT_FILE', 'sections/payments/payments.md')).trim();
  fetch(textFile, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => { box.innerHTML = markdownToHtml(fillIn(text)); })
    .catch((err) => {
      console.warn(textFile + ' could not be loaded (' + err.message + ').');
      box.innerHTML = '<p>Payment details are coming soon.</p>';
    });
});

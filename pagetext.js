// Fills a page with the words from a text file, for pages that are only
// words (contact.html). The page says which file in data-text-file, and the
// file is written the same way as the section files. {SETTING_NAME} in it is
// replaced with that setting's value, so something like a phone number is
// only written in one place.

window.settingsLoaded.then(() => {
  const box = document.querySelector('[data-text-file]');
  if (!box) return;
  const file = box.dataset.textFile;

  const fillIn = (text) => text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (all, name) =>
    (typeof window[name] === 'string' || typeof window[name] === 'number' ? String(window[name]) : all));

  fetch(file, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((text) => {
      box.innerHTML = withEmbeds(markdownToHtml(fillIn(text)),
        setting('EMBEDS', {}), setting('EMBED_HEIGHT', 420),
        setting('EMBEDS_YOU_CAN_TOUCH', []), setting('EMBED_WAKE_LABEL', 'Click to use'));
    })
    .catch((err) => {
      console.warn(file + ' could not be loaded (' + err.message + ').');
      box.innerHTML = '<p>Coming soon.</p>';
    });
});

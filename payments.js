// The payments page: the Zelle logo and the steps for sending a payment.
// The Zelle tag and the logo's file come from settings.md; details that are
// still empty show a [bracketed placeholder].

window.settingsLoaded.then(() => {
  const root = document.documentElement.style;
  root.setProperty('--zelle-logo-width', Math.max(40, setting('ZELLE_LOGO_WIDTH', 170)) + 'px');
  root.setProperty('--step-circle', Math.max(16, setting('PAYMENT_STEP_CIRCLE_SIZE', 36)) + 'px');
  root.setProperty('--step-gap', Math.max(0, setting('PAYMENT_STEP_SPACING', 28)) + 'px');

  // Fill in the details from settings.md, or a placeholder.
  document.querySelectorAll('[data-setting]').forEach((el) => {
    const value = String(setting(el.dataset.setting, '')).trim();
    el.textContent = value || el.dataset.placeholder;
    el.classList.toggle('placeholder', !value);
  });

  // The logo replaces the word "Zelle" once it has loaded. If the file is
  // missing, the word stays.
  const file = String(setting('ZELLE_LOGO', '')).trim();
  if (file) {
    const logo = document.getElementById('zelle-logo');
    logo.onload = () => {
      logo.hidden = false;
      document.getElementById('zelle-word').hidden = true;
    };
    logo.src = file;
  }
});

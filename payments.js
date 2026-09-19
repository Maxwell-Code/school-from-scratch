// The payments page. One accent-colored circle appears, then splits into
// three: Zelle, Card, and Bank billing. Choosing one gathers the circles
// back together with the chosen one on top, and that way's step appears
// below. "Choose a different way to pay" splits them again.
// Details (Zelle recipient, bill pay address) come from settings.md; any
// that are still empty show a [bracketed placeholder].

window.settingsLoaded.then(() => {
  const root = document.documentElement.style;
  // Devices can ask sites for less motion (on Windows, turning off
  // "Animation effects" does this). Only honored if the setting says so.
  const reduceMotion = setting('PAYMENT_RESPECT_REDUCED_MOTION', false) &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIMATE = setting('PAYMENT_ANIMATION', true) && !reduceMotion;
  const MOVE_MS = ANIMATE ? Math.max(0, setting('PAYMENT_ANIMATION_MS', 600)) : 0;
  // Pause between the circle finishing its appearance and splitting.
  const SPLIT_DELAY = ANIMATE ? Math.max(0, setting('PAYMENT_SPLIT_DELAY_MS', 150)) : 0;
  root.setProperty('--pay-circle', Math.max(60, setting('PAYMENT_CIRCLE_SIZE', 180)) + 'px');
  root.setProperty('--pay-ms', MOVE_MS + 'ms');

  // Fill in the details from settings.md, or a placeholder.
  document.querySelectorAll('[data-setting]').forEach((el) => {
    const value = String(setting(el.dataset.setting, '')).trim();
    el.textContent = value || el.dataset.placeholder;
    el.classList.toggle('placeholder', !value);
  });

  // The card form never sends anything (it's a preview).
  document.getElementById('card-form').addEventListener('submit', (e) => e.preventDefault());

  const stage = document.getElementById('pay-stage');
  const circles = [...stage.querySelectorAll('.pay-circle')];
  const change = document.getElementById('pay-change');
  const steps = [...document.querySelectorAll('.pay-step')];
  let stepTimer = 0, movingTimer = 0;
  // While the circles move, hovering them does nothing (see page.css).
  function markMoving() {
    stage.classList.add('moving');
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => stage.classList.remove('moving'), MOVE_MS);
  }

  function split() {
    clearTimeout(stepTimer);
    markMoving();
    stage.classList.remove('chosen');
    stage.classList.add('split');
    circles.forEach((c) => {
      c.classList.remove('picked');
      c.setAttribute('aria-checked', 'false');
      c.tabIndex = 0;
    });
    steps.forEach((s) => { s.hidden = true; s.classList.remove('shown'); });
    change.hidden = true;
  }

  function choose(circle) {
    clearTimeout(stepTimer);
    markMoving();
    stage.classList.remove('split');
    stage.classList.add('chosen');
    circles.forEach((c) => {
      const picked = c === circle;
      c.classList.toggle('picked', picked);
      c.setAttribute('aria-checked', String(picked));
      c.tabIndex = picked ? 0 : -1;
    });
    // Once the circles have gathered, show that way's step.
    stepTimer = setTimeout(() => {
      const step = document.getElementById('step-' + circle.dataset.method);
      steps.forEach((s) => { s.hidden = s !== step; });
      change.hidden = false;
      requestAnimationFrame(() => step.classList.add('shown'));
    }, MOVE_MS);
  }

  circles.forEach((c) => c.addEventListener('click', () => {
    if (stage.classList.contains('chosen')) {
      // Clicking the gathered circles opens the choice again.
      split();
    } else {
      choose(c);
    }
  }));
  change.addEventListener('click', () => {
    split();
    circles[0].focus();
  });

  // One circle appears almost straight away, then splits into three. It
  // waits for the fonts first (up to a second), since the heading changes
  // height when they arrive and would jolt the circles mid-movement.
  const fontsReady = new Promise((resolve) => {
    // The font stylesheet (added by page.js) first, then the fonts it names.
    const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
    const sheetLoaded = !link || link.sheet ? Promise.resolve()
      : new Promise((r) => { link.addEventListener('load', r); link.addEventListener('error', r); });
    sheetLoaded.then(() => {
      if (!document.fonts) return resolve();
      const heading = setting('HEADING_FONT_WEIGHT', 600) + ' 1em "' + setting('HEADING_FONT', 'Lora') + '"';
      const body = setting('BODY_FONT_WEIGHT', 500) + ' 1em "' + setting('BODY_FONT', 'Quicksand') + '"';
      Promise.all([document.fonts.load(heading), document.fonts.load(body), document.fonts.load('700 1em "' + setting('BODY_FONT', 'Quicksand') + '"')])
        .then(resolve, resolve);
    });
  });
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1000))]).then(() => {
    requestAnimationFrame(() => {
      markMoving();
      stage.classList.add('appear');
      // Split only once the circle has finished appearing: starting a new
      // movement halfway through another makes a visible hitch.
      setTimeout(split, MOVE_MS + SPLIT_DELAY);
    });
  });
});

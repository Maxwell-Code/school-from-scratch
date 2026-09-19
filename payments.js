// The payments page: pick a way to pay, see how to pay that way. Details
// (Zelle recipient, Stripe link, bill pay address) come from settings.txt;
// a way whose details are still empty says they're coming soon.

window.settingsLoaded.then(() => {
  const text = (name) => String(setting(name, '')).trim();
  const phone = text('PHONE_NUMBER');

  // Fill in the details from settings.txt.
  document.querySelectorAll('[data-setting]').forEach((el) => {
    el.textContent = text(el.dataset.setting);
  });
  const stripeLink = text('STRIPE_PAYMENT_LINK');
  document.querySelectorAll('[data-setting-href]').forEach((el) => {
    // Only a secure web address; anything else leaves the button unused.
    if (/^https:\/\//i.test(stripeLink)) el.href = stripeLink;
  });
  const phoneEl = document.getElementById('coming-soon-phone');
  if (phone) {
    phoneEl.textContent = phone;
    phoneEl.href = 'tel:' + phone.replace(/[^\d+]/g, '');
  }

  // Which ways to pay have their details filled in.
  const ready = {
    zelle: !!text('ZELLE_RECIPIENT'),
    stripe: /^https:\/\//i.test(stripeLink),
    bank: !!text('BANK_BILL_PAY_ADDRESS'),
  };

  const comingSoon = document.getElementById('coming-soon');
  const radios = [...document.querySelectorAll('input[name="method"]')];
  function show(method) {
    document.querySelectorAll('.method-details').forEach((el) => {
      el.hidden = el.id !== 'details-' + method;
    });
    const details = document.getElementById('details-' + method);
    if (details) details.querySelector('.ready').hidden = !ready[method];
    comingSoon.hidden = !method || ready[method];
    if (details && !ready[method]) details.appendChild(comingSoon);
  }
  radios.forEach((radio) => radio.addEventListener('change', () => show(radio.value)));
  const chosen = radios.find((r) => r.checked);
  if (chosen) show(chosen.value);
});

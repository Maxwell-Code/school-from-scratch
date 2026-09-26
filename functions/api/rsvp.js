// Takes an RSVP from the box on the play's page and sends two emails: one
// to whoever is running the show, and one back to the person who wrote in.
//
// This runs on Cloudflare, not in anyone's browser, which is the whole
// point: the key that sends the mail never leaves the server and is never
// in this repository. It is set in the Cloudflare dashboard instead, under
// the project's Settings -> Environment variables:
//
//   RESEND_API_KEY     the key from resend.com (mark it as a secret)
//   RSVP_FROM          who the mail comes from, on a domain verified with
//                      Resend: "The School From Scratch <rsvp@example.org>"
//   RSVP_ADMIN_EMAIL   where the RSVPs are sent; several addresses can be
//                      separated by commas
//   RSVP_SHOW          optional, the show these RSVPs are for, which goes
//                      in the subject line
//
// Cloudflare Pages turns every file under functions/ into an address on the
// site on its own, so this one answers at /api/rsvp with no wiring needed.

const MOST_SEATS = 10;

// The box is shown in a frame of its own with no origin of its own, so its
// requests arrive marked "null". This is a public form that carries no
// cookies and no sign-in, so it answers to anyone; there is nothing here
// that being asked by someone else could give away.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const reply = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', ...CORS },
});

// Enough to catch a slip of the keyboard. Anything stricter turns away real
// addresses, and the only way to truly know is to write to it — which is
// what happens next anyway.
const looksLikeAnAddress = (value) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function send(key, mail) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!response.ok) {
    // Read the reason for the log, but never hand it back to the browser:
    // it can name the account and the domain.
    const said = await response.text().catch(() => '');
    throw new Error('Resend answered ' + response.status + ': ' + said.slice(0, 300));
  }
  return response.json();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.RSVP_FROM || !env.RSVP_ADMIN_EMAIL) {
    console.error('RSVP: the mail settings are missing in the Cloudflare dashboard.');
    return reply(500, { ok: false, error: 'This form is not set up yet.' });
  }

  let sent;
  try {
    sent = await request.json();
  } catch (err) {
    return reply(400, { ok: false, error: 'We could not read that.' });
  }

  // A box no person can see. Anything that fills it in is not a person, and
  // is told everything went fine so it has no reason to try again.
  if (String(sent.website || '').trim()) return reply(200, { ok: true });

  const email = String(sent.email || '').trim().slice(0, 254);
  if (!looksLikeAnAddress(email)) {
    return reply(400, { ok: false, error: 'That email address does not look right.' });
  }

  const seats = Math.round(Number(sent.seats));
  if (!Number.isFinite(seats) || seats < 1 || seats > MOST_SEATS) {
    return reply(400, { ok: false, error: 'Please choose between 1 and ' + MOST_SEATS + ' seats.' });
  }

  const show = String(env.RSVP_SHOW || 'Is Nirmal Normal?');
  const people = seats === 1 ? '1 seat' : seats + ' seats';
  const safeShow = escapeHtml(show);
  const safeEmail = escapeHtml(email);

  try {
    // To whoever is running the show. Replying goes straight back to the
    // person who wrote in.
    await send(env.RESEND_API_KEY, {
      from: env.RSVP_FROM,
      to: env.RSVP_ADMIN_EMAIL.split(',').map((one) => one.trim()).filter(Boolean),
      reply_to: email,
      subject: 'RSVP: ' + people + ' for ' + show,
      text: 'A new RSVP for ' + show + '.\n\n'
        + 'Email: ' + email + '\n'
        + 'Seats: ' + seats + '\n\n'
        + 'Reply to this message to answer them directly.',
      html: '<p>A new RSVP for <strong>' + safeShow + '</strong>.</p>'
        + '<p>Email: <a href="mailto:' + safeEmail + '">' + safeEmail + '</a><br>'
        + 'Seats: <strong>' + seats + '</strong></p>'
        + '<p>Reply to this message to answer them directly.</p>',
    });

    // And back to the person who wrote in, so they know it arrived.
    await send(env.RESEND_API_KEY, {
      from: env.RSVP_FROM,
      to: [email],
      subject: 'Your RSVP for ' + show,
      text: 'Thank you — your RSVP is in.\n\n'
        + 'We have put you down for ' + people + ' at ' + show + '.\n\n'
        + 'We will write again with the details closer to the day. If your '
        + 'plans change, just reply to this message and let us know.\n\n'
        + 'The School From Scratch',
      html: '<p>Thank you — your RSVP is in.</p>'
        + '<p>We have put you down for <strong>' + people + '</strong> at <strong>' + safeShow + '</strong>.</p>'
        + '<p>We will write again with the details closer to the day. If your plans change, '
        + 'just reply to this message and let us know.</p>'
        + '<p>The School From Scratch</p>',
    });
  } catch (err) {
    console.error('RSVP could not be sent:', err && err.message);
    return reply(502, { ok: false, error: 'We could not send that just now. Please try again in a moment.' });
  }

  return reply(200, { ok: true });
}

// The numbers on the "page not found" page. Push one and all three come
// loose and behave like real objects: they fall, bounce off the edges of the
// page and off each other, and settle again. A push sends a number away from
// the spot it was pushed, so a push from below sends it up, and a push from
// the right sends it left.

window.settingsLoaded.then(() => {
  const box = document.getElementById('digits');
  // Only on the real "page not found" page (page.js shows the numbers then).
  if (!box || box.hidden || !setting('NOT_FOUND_PUSHABLE_NUMBERS', true)) return;

  const GRAVITY = setting('NOT_FOUND_GRAVITY', 2600);      // pixels per second, per second
  const BOUNCE = clamp01(setting('NOT_FOUND_BOUNCE', 0.55)); // how much speed is kept in a bounce
  const PUSH = Math.max(0, setting('NOT_FOUND_PUSH', 950));  // how hard a push is
  const RUB = clamp01(setting('NOT_FOUND_FLOOR_GRIP', 0.6)); // how quickly they stop rolling
  const EDGE = Math.max(0, setting('NOT_FOUND_EDGE_SPACE', 10)); // gap kept at the edges
  function clamp01(v) { return Math.min(1, Math.max(0, Number(v) || 0)); }

  const bar = document.getElementById('quick-nav');
  const digits = [...box.querySelectorAll('span')];
  const bodies = [];
  let loose = false, frame = 0, last = 0;

  const walls = () => ({
    left: EDGE,
    right: document.documentElement.clientWidth - EDGE,
    top: (bar ? bar.getBoundingClientRect().bottom : 0) + EDGE,
    bottom: document.documentElement.clientHeight - EDGE,
  });

  // Each number keeps the size and spot it already had on the page, then
  // starts falling from there.
  function comeLoose() {
    if (loose) return;
    loose = true;
    const w = walls();
    for (const el of digits) {
      const r = el.getBoundingClientRect();
      bodies.push({ el, x: r.left, y: r.top, w: r.width, h: r.height, vx: 0, vy: 0 });
      el.style.width = r.width + 'px';
      el.style.height = r.height + 'px';
    }
    box.classList.add('loose');
    for (const b of bodies) {
      b.y = Math.min(b.y, w.bottom - b.h);
      place(b);
    }
    frame = requestAnimationFrame(step);
  }

  const place = (b) => { b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`; };

  // A push sends a number away from the spot it was pushed: the further from
  // its middle, the more of a shove and the more sideways it goes.
  const TOP_SPEED = 2800; // fast enough to fly, slow enough to never skip an edge
  function push(b, pointX, pointY) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    let dx = cx - pointX, dy = cy - pointY;
    const reach = Math.max(b.w, b.h) / 2;
    const away = Math.hypot(dx, dy);
    if (away < 1) { dx = 0; dy = -1; } else { dx /= away; dy /= away; }
    // A push near the edge of a number is the strongest.
    const strength = PUSH * (0.55 + 0.45 * Math.min(1, away / reach));
    b.vx = Math.max(-TOP_SPEED, Math.min(TOP_SPEED, b.vx + dx * strength));
    b.vy = Math.max(-TOP_SPEED, Math.min(TOP_SPEED, b.vy + dy * strength));
  }

  digits.forEach((el) => el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const first = !loose;
    comeLoose();
    const b = bodies[digits.indexOf(el)];
    push(b, e.clientX, e.clientY);
    // The first push nudges the other two as well, so they all come alive.
    if (first) for (const other of bodies) if (other !== b) push(other, e.clientX, e.clientY);
    if (!frame) frame = requestAnimationFrame(step);
  }));

  // Keeps a number inside the page. The edges always win.
  function keepInside(b, w) {
    if (b.x < w.left) { b.x = w.left; if (b.vx < 0) b.vx = -b.vx * BOUNCE; }
    if (b.x + b.w > w.right) { b.x = Math.max(w.left, w.right - b.w); if (b.vx > 0) b.vx = -b.vx * BOUNCE; }
    if (b.y < w.top) { b.y = w.top; if (b.vy < 0) b.vy = -b.vy * BOUNCE; }
    if (b.y + b.h > w.bottom) {
      b.y = Math.max(w.top, w.bottom - b.h);
      if (b.vy > 0) b.vy = -b.vy * BOUNCE;
      b.vx *= 1 - RUB * 0.1;                 // rubs along the floor
      if (Math.abs(b.vy) < 40) b.vy = 0;      // stops jittering once it's settled
      if (Math.abs(b.vx) < 6) b.vx = 0;
    }
  }

  // Numbers bump into each other too: the overlap is shared between them and
  // they swap a little speed. Run a few times so a number squeezed into a
  // corner still ends up beside the others rather than inside one.
  function unstack(w) {
    for (let pass = 0; pass < 12; pass++) {
      let moved = false;
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i], c = bodies[j];
          const overlapX = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
          const overlapY = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
          if (overlapX <= 0 || overlapY <= 0) continue;
          moved = true;
          // Push apart the short way. On a screen too narrow for all of
          // them side by side, stack them instead.
          const roomSideways = w.right - w.left > bodies.reduce((s, b) => s + b.w, 0);
          if (roomSideways && overlapX < overlapY) {
            const dir = a.x < c.x ? -1 : 1;
            a.x += (dir * overlapX) / 2;
            c.x -= (dir * overlapX) / 2;
            const swap = (a.vx - c.vx) * BOUNCE;
            a.vx -= swap / 2;
            c.vx += swap / 2;
          } else {
            const dir = a.y < c.y ? -1 : 1;
            a.y += (dir * overlapY) / 2;
            c.y -= (dir * overlapY) / 2;
            const swap = (a.vy - c.vy) * BOUNCE;
            a.vy -= swap / 2;
            c.vy += swap / 2;
          }
        }
      }
      for (const b of bodies) keepInside(b, w);
      if (!moved) break;
    }
  }

  function step(now) {
    const passed = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    const w = walls();
    // Small steps: a fast number can't jump through an edge or another one.
    const steps = Math.min(8, Math.max(1, Math.ceil(passed / 0.004)));
    const dt = passed / steps;
    for (let n = 0; n < steps; n++) {
      for (const b of bodies) {
        b.vy = Math.min(TOP_SPEED, b.vy + GRAVITY * dt);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        keepInside(b, w);
      }
      unstack(w);
    }
    for (const b of bodies) place(b);

    const moving = bodies.some((b) => Math.abs(b.vx) > 1 || Math.abs(b.vy) > 1);
    frame = moving ? requestAnimationFrame(step) : 0;
    if (!moving) last = 0;
  }

  // A smaller window mustn't leave a number outside it.
  window.addEventListener('resize', () => {
    if (!loose) return;
    const w = walls();
    for (const b of bodies) keepInside(b, w);
    unstack(w); // a smaller page can squeeze two together
    for (const b of bodies) place(b);
    if (!frame) frame = requestAnimationFrame(step);
  });
});

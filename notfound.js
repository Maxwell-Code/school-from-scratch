// The "page not found" page. Push any letter or number and the whole page of
// text comes loose: every character becomes a real object that falls, spins,
// bounces off the edges of the page and piles up on the others.
//
// A character's shape is its own: each one is drawn onto its own small
// picture, and the shape handed to the physics is built from the inked parts
// of that picture. So a 4 collides like a 4, the tail of a p hangs below the
// line, and the hole in an o is really a hole. The physics itself is
// Matter.js (vendor/matter.min.js), kept with the site rather than fetched
// from anywhere.

window.settingsLoaded.then(() => {
  const digits = document.getElementById('digits');
  // Only on the real "page not found" page (page.js shows the numbers there).
  if (!digits || digits.hidden || !setting('NOT_FOUND_PUSHABLE_NUMBERS', true)) return;
  if (typeof Matter === 'undefined') return; // physics didn't load: leave the page as it is

  const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
  const GRAVITY = setting('NOT_FOUND_GRAVITY', 2600);
  const BOUNCE = clamp01(setting('NOT_FOUND_BOUNCE', 0.45));
  const PUSH = Math.max(0, setting('NOT_FOUND_PUSH', 700)); // pixels a second
  const GRIP = clamp01(setting('NOT_FOUND_FLOOR_GRIP', 0.6));
  const EDGE = Math.max(0, setting('NOT_FOUND_EDGE_SPACE', 10));
  const DETAIL = Math.max(2, setting('NOT_FOUND_SHAPE_DETAIL', 7)); // how finely a shape follows the character
  const REACH = Math.max(1, setting('NOT_FOUND_PUSH_REACH', 260));  // how far a push is felt
  const FIRST_BLAST = Math.max(0, setting('NOT_FOUND_FIRST_BLAST', 2.2)); // the opening burst
  const HOLD_MS = Math.max(0, setting('NOT_FOUND_HOLD_TO_PICK_UP_MS', 150)); // hold this long to pick one up
  const GRIP_ON_HAND = Math.min(1, Math.max(0.01, setting('NOT_FOUND_DRAG_GRIP', 0.2))); // how closely it follows
  const TOP_SPEED = 1800; // pixels a second: fast enough to fly, slow enough to stay in

  // ---- The characters -------------------------------------------------------
  // Every character of the heading gets its own span, like the numbers already
  // have, so each can move on its own.
  const heading = document.getElementById('title');
  if (heading && !heading.querySelector('span')) {
    const words = heading.textContent;
    heading.textContent = '';
    for (const ch of words) {
      if (ch === ' ') { heading.append(' '); continue; }
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      heading.appendChild(span);
    }
  }
  const pieces = [...digits.querySelectorAll('span'), ...(heading ? heading.querySelectorAll('span') : [])];
  if (!pieces.length) return;

  // ---- Drawing a character, and the shape of what was drawn -----------------
  // The character is drawn onto its own picture, a little larger than its
  // place on the page so that nothing is cut off. The picture is then read
  // back: the inked parts are gathered into a handful of blocks, and those
  // blocks are the character's shape. Building the shape from the picture the
  // page shows means the two can never drift apart.
  function drawCharacter(el, ch, w, h) {
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize) || h;
    const pad = Math.ceil(size * 0.5);
    const boxW = Math.max(2, Math.ceil(w) + pad * 2);
    const boxH = Math.max(2, Math.ceil(h) + pad * 2);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(boxW * dpr);
    canvas.height = Math.round(boxH * dpr);
    canvas.style.width = boxW + 'px';
    canvas.style.height = boxH + 'px';
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(dpr, dpr);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(ch);
    const ascent = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent || h * 0.8;
    const descent = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent || h * 0.2;
    ctx.fillText(ch, pad + (w - (m.width || w)) / 2, pad + ascent + (h - (ascent + descent)) / 2);

    let pixels;
    try {
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
      return { canvas, boxW, boxH, pad, blocks: null }; // reading is blocked (opened from a folder)
    }

    // Which squares of the picture have ink in them.
    const cell = Math.max(2, Math.round(DETAIL));
    const cols = Math.ceil(boxW / cell), rows = Math.ceil(boxH / cell);
    const inked = new Uint8Array(cols * rows);
    for (let y = 0; y < canvas.height; y++) {
      const row = Math.floor((y / dpr) / cell);
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 90) inked[row * cols + Math.floor((x / dpr) / cell)] = 1;
      }
    }

    // Gather those squares into as few blocks as possible: take a run of
    // squares across, then grow it downward while the rows below match.
    const blocks = [];
    const used = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!inked[r * cols + c] || used[r * cols + c]) continue;
        let wide = 0;
        while (c + wide < cols && inked[r * cols + c + wide] && !used[r * cols + c + wide]) wide++;
        let deep = 1;
        grow: while (r + deep < rows) {
          for (let k = 0; k < wide; k++) {
            const at = (r + deep) * cols + c + k;
            if (!inked[at] || used[at]) break grow;
          }
          deep++;
        }
        for (let dr = 0; dr < deep; dr++) for (let dc = 0; dc < wide; dc++) used[(r + dr) * cols + c + dc] = 1;
        blocks.push({ x: c * cell, y: r * cell, w: wide * cell, h: deep * cell });
      }
    }
    return { canvas, boxW, boxH, pad, blocks: blocks.length ? blocks : null };
  }

  // ---- The physics ----------------------------------------------------------
  const { Engine, Bodies, Body, Composite, Constraint, Vector, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = GRAVITY / 2600;
  // Worked over several times each frame, so characters rest against each
  // other rather than sinking in.
  engine.positionIterations = 14;
  engine.velocityIterations = 12;
  // Handy when looking at the shapes from the browser's console.
  window.notFoundPhysics = { engine, parts: [] };

  const bar = document.getElementById('quick-nav');
  const room = () => ({
    left: EDGE,
    right: document.documentElement.clientWidth - EDGE,
    top: (bar ? bar.getBoundingClientRect().bottom : 0) + EDGE,
    bottom: document.documentElement.clientHeight - EDGE,
  });

  const WALL = 400; // the edges are thick, so nothing can shoot through them
  const walls = [0, 1, 2, 3].map(() =>
    Bodies.rectangle(0, 0, 10, 10, { isStatic: true, friction: 0.9, restitution: BOUNCE }));
  Composite.add(engine.world, walls);
  function placeWalls() {
    const r = room();
    const w = r.right - r.left, h = r.bottom - r.top;
    const midX = (r.left + r.right) / 2, midY = (r.top + r.bottom) / 2;
    const set = (body, x, y, width, height) => {
      Body.setVertices(body, Matter.Vertices.fromPath(`0 0 ${width} 0 ${width} ${height} 0 ${height}`));
      Body.setPosition(body, { x, y });
    };
    set(walls[0], midX, r.bottom + WALL / 2, w + WALL * 2, WALL);  // floor
    set(walls[1], midX, r.top - WALL / 2, w + WALL * 2, WALL);     // ceiling
    set(walls[2], r.left - WALL / 2, midY, WALL, h + WALL * 2);    // left
    set(walls[3], r.right + WALL / 2, midY, WALL, h + WALL * 2);   // right
  }
  placeWalls();

  const parts = window.notFoundPhysics.parts;   // { el, body, originX, originY }
  let loose = false, frame = 0;

  function comeLoose() {
    if (loose) return;
    loose = true;
    const spots = pieces.map((el) => ({ el, r: el.getBoundingClientRect(), ch: el.textContent }));
    digits.classList.add('loose');
    if (heading) heading.classList.add('loose');
    for (const { el, r, ch } of spots) {
      const drawn = drawCharacter(el, ch, r.width, r.height);
      // The picture is larger than the character's place on the page, so it
      // hangs the same amount up and to the left of it.
      const spot = { left: r.left - drawn.pad, top: r.top - drawn.pad };
      el.style.width = drawn.boxW + 'px';
      el.style.height = drawn.boxH + 'px';
      el.textContent = '';
      el.setAttribute('aria-label', ch);
      el.appendChild(drawn.canvas);

      const options = {
        restitution: BOUNCE,
        friction: 0.4 + GRIP * 0.5,
        frictionAir: 0.008,
        frictionStatic: 0.6,
        sleepThreshold: 45,
        slop: 0.02, // how deeply things may rest into each other
      };
      let body;
      if (drawn.blocks) {
        // The blocks are in the picture's own coordinates, so the middle the
        // physics works out is in those coordinates too.
        const pieces2 = drawn.blocks.map((b) =>
          Bodies.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h));
        body = Body.create({ parts: pieces2, ...options });
      } else { // couldn't read the picture: fall back to a plain block
        body = Bodies.rectangle(drawn.boxW / 2, drawn.boxH / 2, r.width, r.height, options);
      }
      const middle = { x: body.position.x, y: body.position.y };
      Body.setPosition(body, { x: spot.left + middle.x, y: spot.top + middle.y });
      Composite.add(engine.world, body);
      // The character turns about the same point the physics turns it about.
      el.style.transformOrigin = `${middle.x}px ${middle.y}px`;
      parts.push({ el, body, originX: middle.x, originY: middle.y });
    }
    draw();
  }

  const draw = () => {
    for (const p of parts) {
      const { x, y } = p.body.position;
      p.el.style.transform =
        `translate(${(x - p.originX).toFixed(1)}px, ${(y - p.originY).toFixed(1)}px) rotate(${p.body.angle.toFixed(3)}rad)`;
    }
  };

  // A push sends the character away from the spot it was pushed, and
  // because the push lands on that spot rather than in the middle, it also
  // sets it spinning, the way shoving the corner of something spins it.
  //
  // NOT_FOUND_PUSH is how fast a push sends a character off, in pixels a
  // second, so the speed is given to the character directly rather than as a
  // force: a force would depend on how the physics chops up its time.
  const TOP_SPIN = 0.5; // turns of a character per frame, at most
  function push(body, pointX, pointY, share) {
    const away = Vector.sub(body.position, { x: pointX, y: pointY });
    const len = Math.hypot(away.x, away.y) || 1;
    const dir = { x: away.x / len, y: away.y / len };
    // A push near the edge of a character is a little stronger than one in
    // its middle.
    const speed = (PUSH * (share || 1) * (0.6 + 0.4 * Math.min(1, len / 60))) / 60; // pixels a frame
    Sleeping.set(body, false);
    Body.setVelocity(body, { x: body.velocity.x + dir.x * speed, y: body.velocity.y + dir.y * speed });
    // The spin a shove off the middle gives it: how far the push landed from
    // the middle, against how hard the character is to turn.
    const arm = { x: pointX - body.position.x, y: pointY - body.position.y };
    const shove = { x: dir.x * speed * body.mass, y: dir.y * speed * body.mass };
    const spin = (arm.x * shove.y - arm.y * shove.x) / body.inertia;
    Body.setAngularVelocity(body, Math.max(-TOP_SPIN, Math.min(TOP_SPIN, body.angularVelocity + spin)));
  }

  // A push isn't felt by one character alone: it spreads out from the spot
  // that was pushed and fades with distance, so the characters nearby are
  // shoved hard, those further off drift, and those beyond its reach stay
  // put. The very first push is a burst that reaches the whole page.
  function blast(pointX, pointY, reach, force) {
    for (const p of parts) {
      const b = p.body;
      // How far the push has to travel to reach the character: measured to
      // its edge, so a big character is pushed as its nearest part feels it.
      const toX = Math.max(b.bounds.min.x - pointX, 0, pointX - b.bounds.max.x);
      const toY = Math.max(b.bounds.min.y - pointY, 0, pointY - b.bounds.max.y);
      const away = Math.hypot(toX, toY);
      if (away >= reach) continue;
      // Full strength where it was pushed, fading off to nothing at the edge
      // of its reach.
      const share = (1 - away / reach) ** 1.6;
      if (share > 0.01) push(b, pointX, pointY, share * force);
    }
    if (!frame) frame = requestAnimationFrame(step);
  }

  function pushedAt(e, wasFirst) {
    const wholePage = Math.hypot(document.documentElement.clientWidth, document.documentElement.clientHeight);
    if (wasFirst) blast(e.clientX, e.clientY, wholePage, FIRST_BLAST);
    else blast(e.clientX, e.clientY, REACH, 1);
  }

  // ---- Pushing, and picking one up -----------------------------------------
  // A quick click pushes. Holding the click on a character, or dragging it,
  // picks it up instead: it hangs from the pointer, swinging under its own
  // weight, and is let go (and thrown) when the click ends.
  let held = null;      // { part, constraint }
  let waiting = null;   // a click that hasn't decided yet: push or pick up

  function pickUp(part, x, y) {
    const body = part.body;
    Sleeping.set(body, false);
    // Where on the character it was taken hold of, in the character's own
    // terms, so it hangs from that very spot however it turns.
    const grip = Vector.rotate({ x: x - body.position.x, y: y - body.position.y }, -body.angle);
    const constraint = Constraint.create({
      pointA: { x, y },
      bodyB: body,
      pointB: grip,
      length: 0,
      stiffness: GRIP_ON_HAND,
      damping: 0.2,
    });
    Composite.add(engine.world, constraint);
    held = { part, constraint };
    part.el.classList.add('held');
    if (!frame) frame = requestAnimationFrame(step);
  }

  function letGo() {
    if (!held) return;
    Composite.remove(engine.world, held.constraint);
    held.part.el.classList.remove('held');
    held = null;
  }

  pieces.forEach((el) => el.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    const first = !loose;
    comeLoose();
    const part = parts.find((p) => p.el === el);
    if (!part) return;
    // Wait a moment: a quick click is a push, a held one picks the
    // character up.
    waiting = {
      part, first, x: e.clientX, y: e.clientY, pointerId: e.pointerId,
      timer: setTimeout(() => {
        if (waiting) { pickUp(waiting.part, waiting.x, waiting.y); waiting = null; }
      }, HOLD_MS),
    };
  }));

  window.addEventListener('pointermove', (e) => {
    if (held) {
      held.constraint.pointA = { x: e.clientX, y: e.clientY };
      Sleeping.set(held.part.body, false);
      if (!frame) frame = requestAnimationFrame(step);
      return;
    }
    // Moving the pointer while the click is still down means a drag, so the
    // character is picked up straight away.
    if (waiting && Math.hypot(e.clientX - waiting.x, e.clientY - waiting.y) > 5) {
      clearTimeout(waiting.timer);
      pickUp(waiting.part, waiting.x, waiting.y);
      waiting = null;
    }
  });

  function ended(e) {
    if (held) { letGo(); return; }
    if (!waiting) return;
    clearTimeout(waiting.timer);
    const { first, x, y } = waiting;
    waiting = null;
    pushedAt({ clientX: x, clientY: y }, first); // it was a quick click: a push
  }
  window.addEventListener('pointerup', ended);
  window.addEventListener('pointercancel', ended);

  // Once the characters are loose, a push anywhere on the page is felt by
  // whatever is near it, not only by a character that was hit.
  document.addEventListener('pointerdown', (e) => {
    if (!loose || held || waiting) return;
    if (e.target.closest('#quick-nav')) return; // the menu is for using, not shoving
    if (pieces.some((el) => el === e.target || el.contains(e.target))) return; // already handled
    pushedAt(e, false);
  });

  // Nothing may leave the page, however hard it's pushed: anything that ends
  // up past an edge is put back against it.
  function keepInside() {
    const r = room();
    for (const p of parts) {
      const b = p.body;
      let dx = 0, dy = 0;
      if (b.bounds.min.x < r.left) dx = r.left - b.bounds.min.x;
      if (b.bounds.max.x > r.right) dx = r.right - b.bounds.max.x;
      if (b.bounds.min.y < r.top) dy = r.top - b.bounds.min.y;
      if (b.bounds.max.y > r.bottom) dy = r.bottom - b.bounds.max.y;
      if (!dx && !dy) continue;
      Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy });
      Body.setVelocity(b, {
        x: dx ? -b.velocity.x * BOUNCE : b.velocity.x,
        y: dy ? -b.velocity.y * BOUNCE : b.velocity.y,
      });
    }
  }

  function step() {
    for (const p of parts) {
      const v = p.body.velocity;
      const speed = Math.hypot(v.x, v.y) * 60; // pixels a second
      if (speed > TOP_SPEED) {
        const scale = TOP_SPEED / speed;
        Body.setVelocity(p.body, { x: v.x * scale, y: v.y * scale });
      }
    }
    // Two smaller steps a frame: characters meet each other halfway through
    // a movement instead of arriving already inside one another.
    Engine.update(engine, 1000 / 120);
    Engine.update(engine, 1000 / 120);
    keepInside();
    draw();
    const moving = held || parts.some((p) => !p.body.isSleeping);
    frame = moving ? requestAnimationFrame(step) : 0;
  }

  window.addEventListener('resize', () => {
    placeWalls();
    if (!loose) return;
    keepInside();
    draw();
    for (const p of parts) Sleeping.set(p.body, false);
    if (!frame) frame = requestAnimationFrame(step);
  });
});

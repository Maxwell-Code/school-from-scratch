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
  const PUSH = Math.max(0, setting('NOT_FOUND_PUSH', 950));
  const GRIP = clamp01(setting('NOT_FOUND_FLOOR_GRIP', 0.6));
  const EDGE = Math.max(0, setting('NOT_FOUND_EDGE_SPACE', 10));
  const DETAIL = Math.max(2, setting('NOT_FOUND_SHAPE_DETAIL', 7)); // how finely a shape follows the character
  const TOP_SPEED = 2600; // pixels a second: fast enough to fly, slow enough to stay in

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
  const { Engine, Bodies, Body, Composite, Vector, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = GRAVITY / 2600;
  engine.positionIterations = 10;
  engine.velocityIterations = 10;
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

  // A push sends the character away from the spot it was pushed. Because the
  // push lands on that spot rather than in the middle, it also sets it
  // spinning, the way shoving the corner of something spins it.
  function push(body, pointX, pointY) {
    const away = Vector.sub(body.position, { x: pointX, y: pointY });
    const len = Math.hypot(away.x, away.y) || 1;
    const dir = { x: away.x / len, y: away.y / len };
    const strength = (PUSH / 1000) * body.mass * (0.6 + 0.4 * Math.min(1, len / 60));
    Sleeping.set(body, false);
    Body.applyForce(body, { x: pointX, y: pointY }, { x: dir.x * strength, y: dir.y * strength });
  }

  pieces.forEach((el) => el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const first = !loose;
    comeLoose();
    const hit = parts.find((p) => p.el === el);
    if (hit) push(hit.body, e.clientX, e.clientY);
    // The first push wakes everything, so the whole page comes apart at once.
    if (first) for (const p of parts) if (p !== hit) push(p.body, e.clientX, e.clientY);
    if (!frame) frame = requestAnimationFrame(step);
  }));

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
    Engine.update(engine, 1000 / 60);
    keepInside();
    draw();
    const moving = parts.some((p) => !p.body.isSleeping);
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

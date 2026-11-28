// =====================================================
// LIVING BACKGROUND v2
// A computation graph (nodes, edges, pulses) behind the page, plus a string of paper bunting
// hung under the navbar that scrolls away with the page.
//   - Edges near the cursor light up in coral.
//   - Click or tap empty space: a pulse fans out through the graph, like gradients flowing backward.
//   - Brush the bunting and the flags swing; scrolling makes them flutter.
// Drop-in: load after script.js. Creates its own fixed <canvas> behind the page.
// =====================================================
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- knobs ----------
  const BLUR = 1.5;           // px of background blur: 0 = sharp, 2 = soft (navbar glass is 8)
  const PAD = 8;              // canvas overhangs the screen by this much so the blur never fades at the edges
  const GRAPH_ALPHA = 0.65;   // overall strength of the graph layer; lower = quieter behind text
  const BUNTING_ALPHA = 0.95; // overall strength of the bunting
  const BUNTING_TOP = 84;     // page-y of the string's anchor points (just under the navbar)

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;top:-' + PAD + 'px;left:-' + PAD + 'px;width:calc(100% + ' + (2 * PAD) + 'px);' +
    'height:calc(100% + ' + (2 * PAD) + 'px);z-index:-1;pointer-events:none;filter:blur(' + BLUR + 'px)';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');

  const INK = '#111111';
  const COL = ['#D6EFFF', '#FED18C', '#FED99B', '#FE654F']; // blue, peach, yellow, coral
  const TAU = Math.PI * 2;

  let W = 0, H = 0, lastW = 0, lastH = 0;
  let scrollY = window.scrollY;
  const mouse = { x: -999, y: -999 };

  // small seeded RNG so the graph layout is the same on every load
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    let u = ((px - ax) * dx + (py - ay) * dy) / l;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
  }

  // =====================================================
  // COMPUTATION GRAPH
  // Round nodes are "ops", rounded squares are "tensors". Topology is fixed; nodes just bob.
  // =====================================================
  let nodes = [], edges = [], adj = [], flash = [], pulses = [];
  let lastSpawn = 0;

  function buildGraph() {
    const rnd = rng(7);
    const count = Math.max(16, Math.min(56, Math.round((W * H) / 22000)));
    const cell = Math.sqrt((W * H) / count);
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);

    nodes = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = (c + 0.2 + rnd() * 0.6) * cell;
        const by = (r + 0.2 + rnd() * 0.6) * cell;
        nodes.push({
          bx, by, x: bx, y: by,
          ph: rnd() * TAU, amp: 3 + rnd() * 4,
          r: 7 + rnd() * 4, sq: rnd() < 0.34,
          c: COL[nodes.length % 4],
        });
      }
    }

    // link each node to its 3 nearest neighbours (within reach), without duplicates
    edges = [];
    adj = nodes.map(() => []);
    const seen = new Set();
    const reach = cell * 1.6;
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => [j, Math.hypot(a.bx - b.bx, a.by - b.by)])
        .filter(([j, d]) => j !== i && d < reach)
        .sort((p, q) => p[1] - q[1])
        .slice(0, 3)
        .forEach(([j]) => {
          const key = i < j ? i * 1000 + j : j * 1000 + i;
          if (seen.has(key)) return;
          seen.add(key);
          edges.push([i, j]);
          adj[i].push(j);
          adj[j].push(i);
        });
    });

    flash = nodes.map(() => 0);
    pulses = [];
  }

  function placeNodes(t) {
    for (const n of nodes) {
      n.x = n.bx + (reduced ? 0 : Math.sin(t * 0.0006 + n.ph) * n.amp);
      n.y = n.by + (reduced ? 0 : Math.cos(t * 0.0005 + n.ph * 1.3) * n.amp);
    }
  }

  // a wave of pulses fanning out from the nearest node, like gradients flowing backward
  function clickWave(x, y) {
    if (!nodes.length || pulses.length > 70) return;
    let best = 0, bd = 1e9;
    nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; best = i; }
    });
    const w = { seen: new Set([best]) };
    flash[best] = 1;
    adj[best].forEach((j) => pulses.push({ a: best, b: j, s: 0, w, gen: 0 }));
  }

  function stepGraph(t) {
    placeNodes(t);
    for (let i = 0; i < flash.length; i++) flash[i] *= 0.94;

    // ambient pulses: short random walks so the graph never sits still
    const ambient = pulses.filter((p) => !p.w).length;
    if (t - lastSpawn > 650 && ambient < Math.max(4, (nodes.length / 6) | 0) && edges.length) {
      lastSpawn = t;
      const e = edges[(Math.random() * edges.length) | 0];
      const fwd = Math.random() < 0.5;
      pulses.push({ a: fwd ? e[0] : e[1], b: fwd ? e[1] : e[0], s: 0, hops: 0 });
    }

    for (let q = pulses.length - 1; q >= 0; q--) {
      const p = pulses[q], a = nodes[p.a], b = nodes[p.b];
      p.s += (p.w ? 3.2 : 2.0) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
      if (p.s < 1) continue;

      pulses.splice(q, 1);
      flash[p.b] = Math.max(flash[p.b], p.w ? 1 : 0.5);

      if (p.w) {
        if (p.w.seen.has(p.b)) continue;
        p.w.seen.add(p.b);
        if (p.gen < 5 && pulses.length < 80) {
          adj[p.b].forEach((j) => { if (j !== p.a) pulses.push({ a: p.b, b: j, s: 0, w: p.w, gen: p.gen + 1 }); });
        }
      } else if (p.hops < 7) {
        const opts = adj[p.b].filter((j) => j !== p.a);
        if (opts.length) pulses.push({ a: p.b, b: opts[(Math.random() * opts.length) | 0], s: 0, hops: p.hops + 1 });
      }
    }
  }

  function nodePath(x, y, r, sq) {
    ctx.beginPath();
    if (!sq) { ctx.arc(x, y, r, 0, TAU); return; }
    if (ctx.roundRect) ctx.roundRect(x - r, y - r, 2 * r, 2 * r, r * 0.3);
    else ctx.rect(x - r, y - r, 2 * r, 2 * r);
  }

  function drawGraph() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // edges: faint ink, coral where the cursor is close
    edges.forEach(([i, j]) => {
      const a = nodes[i], b = nodes[j];
      ctx.globalAlpha = GRAPH_ALPHA * 0.3;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

      const near = Math.max(0, 1 - segDist(mouse.x, mouse.y, a.x, a.y, b.x, b.y) / 110);
      if (near > 0.02) {
        ctx.globalAlpha = GRAPH_ALPHA * near;
        ctx.strokeStyle = COL[3];
        ctx.lineWidth = 1.5 + near * 2.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    });

    // nodes: hard paper-cut shadow, fill, outline; flash overlay when a pulse arrives
    nodes.forEach((n, i) => {
      const near = Math.max(0, 1 - Math.hypot(n.x - mouse.x, n.y - mouse.y) / 90);
      const r = n.r * (1 + 0.35 * near + 0.25 * flash[i]);

      ctx.globalAlpha = GRAPH_ALPHA;
      ctx.fillStyle = 'rgba(17,17,17,0.12)';
      nodePath(n.x + 3, n.y + 3, r, n.sq); ctx.fill();

      ctx.fillStyle = n.c;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      nodePath(n.x, n.y, r, n.sq); ctx.fill(); ctx.stroke();

      if (flash[i] > 0.03) {
        ctx.globalAlpha = GRAPH_ALPHA * flash[i];
        ctx.fillStyle = COL[3];
        nodePath(n.x, n.y, r, n.sq); ctx.fill(); ctx.stroke();
      }
    });

    // pulses: coral waves leave a trail along the edge, ambient ones are small peach dots
    pulses.forEach((p) => {
      const a = nodes[p.a], b = nodes[p.b];
      const x = a.x + (b.x - a.x) * p.s, y = a.y + (b.y - a.y) * p.s;
      ctx.globalAlpha = GRAPH_ALPHA;
      if (p.w) {
        ctx.strokeStyle = COL[3];
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.fillStyle = p.w ? COL[3] : COL[1];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, p.w ? 5 : 3.5, 0, TAU); ctx.fill(); ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  // =====================================================
  // PAPER BUNTING
  // Verlet chain pinned at both ends. Each point is also pulled gently toward its resting
  // position on a parabola, so the string always settles into a nice droop and then sways.
  // Lives in page coordinates (drawn at -scrollY), so it scrolls away with the hero.
  // =====================================================
  let bunting = null;

  function buildBunting() {
    const N = Math.max(12, Math.min(60, Math.round(W / 30) + 1));
    const sag = Math.max(30, Math.min(64, W * 0.045));
    const pts = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const rx = -6 + (W + 12) * u;
      const ry = BUNTING_TOP + sag * 4 * u * (1 - u);
      pts.push({ rx, ry, x: rx, y: ry, px: rx, py: ry });
    }
    const len = [];
    for (let i = 0; i < N - 1; i++) len.push(Math.hypot(pts[i + 1].rx - pts[i].rx, pts[i + 1].ry - pts[i].ry));
    bunting = { pts, len, sag, flag: Math.max(16, Math.min(26, W * 0.017)) };
  }

  function buntingVisible() {
    return bunting && scrollY < BUNTING_TOP + bunting.sag + bunting.flag + 60;
  }

  function stepBunting(t) {
    if (!buntingVisible()) return;
    const P = bunting.pts, N = P.length, my = mouse.y + scrollY;

    for (let i = 1; i < N - 1; i++) {
      const q = P[i];
      let vx = (q.x - q.px) * 0.98 + (q.rx - q.x) * 0.012 + Math.sin(t * 0.0011 + i * 0.4) * 0.025;
      let vy = (q.y - q.py) * 0.98 + (q.ry - q.y) * 0.012 + Math.sin(t * 0.0013 + i * 0.55) * 0.035;

      const dx = q.x - mouse.x, dy = q.y - my, d = Math.hypot(dx, dy);
      if (d < 70 && d > 0.1) {
        const f = (70 - d) * 0.02;
        vx += (dx / d) * f;
        vy += (dy / d) * f;
      }
      q.px = q.x; q.py = q.y;
      q.x += vx; q.y += vy;
    }

    for (let k = 0; k < 10; k++) {
      for (let i = 0; i < N - 1; i++) {
        const a = P[i], b = P[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        const wa = i === 0 ? 0 : 1, wb = i === N - 2 ? 0 : 1;
        const f = (d - bunting.len[i]) / d / (wa + wb);
        a.x += dx * f * wa; a.y += dy * f * wa;
        b.x -= dx * f * wb; b.y -= dy * f * wb;
      }
    }
  }

  function drawBunting(t) {
    if (!buntingVisible()) return;
    const P = bunting.pts, N = P.length, fh = bunting.flag;

    ctx.save();
    ctx.translate(0, -scrollY);
    ctx.globalAlpha = BUNTING_ALPHA;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // flags hang straight down and swing with the string's motion
    for (let i = 0; i < N - 1; i++) {
      const a = P[i], b = P[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const ax = a.x + dx * 0.1, ay = a.y + dy * 0.1;
      const bx = a.x + dx * 0.9, by = a.y + dy * 0.9;
      const swing = Math.max(-fh * 0.6, Math.min(fh * 0.6, ((a.x - a.px) + (b.x - b.px)) * fh * 0.35));
      const tx = (ax + bx) / 2 + swing + (reduced ? 0 : Math.sin(t * 0.0014 + i) * 1.5);
      const ty = (ay + by) / 2 + fh;

      ctx.beginPath(); ctx.moveTo(ax + 3, ay + 3); ctx.lineTo(bx + 3, by + 3); ctx.lineTo(tx + 3, ty + 3); ctx.closePath();
      ctx.fillStyle = 'rgba(17,17,17,0.12)'; ctx.fill();

      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(tx, ty); ctx.closePath();
      ctx.fillStyle = COL[i % 4]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(P[i].x, P[i].y);
    ctx.stroke();

    ctx.restore();
  }

  // =====================================================
  // SIZING, INPUT, LOOP
  // =====================================================
  function draw(t) {
    ctx.clearRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);
    drawGraph();
    drawBunting(t);
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = (W + 2 * PAD) * dpr;
    cv.height = (H + 2 * PAD) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);

    // rebuild only on a real size change, not when a mobile address bar nudges the height
    if (!nodes.length || W !== lastW || Math.abs(H - lastH) > 150) {
      buildGraph();
      buildBunting();
      lastW = W;
      lastH = H;
    }
    if (reduced) draw(0);
  }

  // clicks on these should do their own thing, not start a pulse wave
  const BLOCK = 'a,button,input,textarea,select,.project-card,.contact-card,.navbar,.lightbox';

  if (!reduced) {
    const clearPointer = () => { mouse.x = mouse.y = -999; };
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest(BLOCK)) return;
      clickWave(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') clearPointer(); });
    window.addEventListener('pointercancel', clearPointer);
    document.documentElement.addEventListener('pointerleave', clearPointer);
  }

  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    scrollY = window.scrollY;
    if (reduced) { draw(0); return; }

    // scrolling makes the bunting flutter and occasionally fires a pulse
    if (bunting) {
      const kick = Math.max(-80, Math.min(80, dy)) * 0.05;
      for (let i = 1; i < bunting.pts.length - 1; i++) bunting.pts[i].py -= kick;
    }
    if (Math.abs(dy) > 6 && Math.random() < 0.15 && edges.length && pulses.length < 40) {
      const e = edges[(Math.random() * edges.length) | 0];
      pulses.push({ a: e[0], b: e[1], s: 0, hops: 0 });
    }
  }, { passive: true });

  window.addEventListener('resize', resize);

  // ---------- start ----------
  resize();

  if (reduced) {
    draw(0);
  } else {
    let last = 0, acc = 0;
    (function loop(t) {
      acc += Math.min(50, t - last);
      last = t;
      while (acc >= 16.7) { stepGraph(t); stepBunting(t); acc -= 16.7; }
      draw(t);
      requestAnimationFrame(loop);
    })(0);
  }
})();

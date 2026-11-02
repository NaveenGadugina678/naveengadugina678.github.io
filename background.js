// =====================================================
// LIVING BACKGROUND
// Golden-hour paper-cut sky: dawn -> day -> dusk as you scroll, hills slide with the cursor.
// Dopamine molecules (C8H11NO2) built from spring physics: drag an atom, fling it, watch it wobble.
// Drop-in: load after script.js. Creates its own fixed <canvas> behind the page.
// =====================================================
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BLUR = 2;  // px of background blur: 0 = sharp, 2 = a little, 4 = soft (navbar glass is 8)
  const PAD = 8;   // canvas overhangs the screen by this much so the blur never fades at the edges
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;top:-' + PAD + 'px;left:-' + PAD + 'px;width:calc(100% + ' + (2 * PAD) + 'px);' +
    'height:calc(100% + ' + (2 * PAD) + 'px);z-index:-1;pointer-events:none;filter:blur(' + BLUR + 'px)';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');

  let W = 0, H = 0, tp = 0, sp = 0, grab = null, pnx = 0.5;
  const mouse = { x: -999, y: -999, nx: 0.5 };

  // ---------- colour helpers (keyframes are [dawn, day, dusk]) ----------
  const ease = (t) => t * t * (3 - 2 * t);
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const x = rgb(a), y = rgb(b);
    return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')';
  };
  const at = (k, p) => (p < 0.5 ? mix(k[0], k[1], ease(p * 2)) : mix(k[1], k[2], ease(p * 2 - 1)));

  const SKY_TOP = ['#FFD9A8', '#CFEBFF', '#FFB8A6'];
  const SKY_BOT = ['#FFF1D6', '#F6FBFF', '#FFE2B8'];
  const SUN = ['#FED18C', '#FFE08A', '#FE654F'];
  // y = ridge height (fraction of viewport), a = bumpiness, par = cursor parallax in px
  const HILLS = [
    { y: 0.80, a: 0.035, f: [0.004, 0.011], ph: [0.5, 2.1], par: 14, c: ['#F7C9A0', '#BEE2F8', '#F59C8A'] },
    { y: 0.86, a: 0.030, f: [0.006, 0.015], ph: [2.4, 0.3], par: 28, c: ['#FED18C', '#FED99B', '#FE8F7A'] },
    { y: 0.92, a: 0.025, f: [0.009, 0.021], ph: [4.1, 1.7], par: 46, c: ['#FFDFA8', '#FFC77A', '#FF9A85'] },
  ];

  // ---------- dopamine skeleton (hydrogens omitted) ----------
  const S3 = Math.sqrt(3) / 2;
  const SHAPE = [
    ['C', S3, 0.5], ['C', 0, 1], ['C', -S3, 0.5], ['C', -S3, -0.5], ['C', 0, -1], ['C', S3, -0.5], // benzene ring 0-5
    ['O', -2 * S3, 1], ['O', -2 * S3, -1],                                                          // two hydroxyls 6-7
    ['C', 2 * S3, 1], ['C', 3 * S3, 0.5], ['N', 4 * S3, 1],                                         // ethylamine chain 8-10
  ];
  const BONDS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [3, 7], [0, 8], [8, 9], [9, 10]];
  const COL = { C: '#FED99B', O: '#FE654F', N: '#D6EFFF' };

  const mols = [];

  function spawn(cx, cy, s, rot) {
    const c = Math.cos(rot), n = Math.sin(rot);
    const m = { atoms: [], springs: [], ax: 0, ay: 0, ph: Math.random() * 6.28, r: s * 0.36 };

    function link(i, j, k) {
      const a = m.atoms[i], b = m.atoms[j];
      m.springs.push({ a, b, k, l: Math.hypot(a.x - b.x, a.y - b.y) });
    }

    SHAPE.forEach(([el, x, y]) => {
      x = (x - S3) * s;
      y = y * s;
      const X = cx + x * c - y * n, Y = cy + x * n + y * c;
      m.atoms.push({ el, x: X, y: Y, px: X, py: Y });
    });

    // bonds are stiff; atoms two bonds apart get softer springs, which acts as bond-angle stiffness
    const adj = m.atoms.map(() => new Set());
    BONDS.forEach(([i, j]) => { adj[i].add(j); adj[j].add(i); link(i, j, 1); });
    const seen = new Set();
    adj.forEach((ns, i) => ns.forEach((j) => adj[j].forEach((k) => {
      const key = i * 99 + k;
      if (k > i && !ns.has(k) && !seen.has(key)) { seen.add(key); link(i, k, 0.35); }
    })));

    mols.push(m);
  }

  function build() {
    const k = Math.min(1, Math.max(0.6, W / 1200));
    spawn(W * 0.78, H * 0.32, 44 * k, -0.4);
    spawn(W * 0.14, H * 0.28, 30 * k, 0.9);
    spawn(W * 0.50, H * 0.12, 24 * k, 2.3);
  }

  // ---------- sizing and scroll ----------
  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    tp = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (reduced) sp = tp;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = (W + 2 * PAD) * dpr;
    cv.height = (H + 2 * PAD) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    readScroll();
    if (reduced) draw();
  }

  // ---------- pointer: grab an atom and fling it ----------
  const BLOCK = 'a,button,input,.project-card,.photo-card,.contact-card,.navbar,.lightbox,.hero-art';

  function pick(e) {
    if (e.target.closest && e.target.closest(BLOCK)) return null;
    let best = null, bd = 1e9;
    for (const m of mols) {
      for (const a of m.atoms) {
        const d = Math.hypot(a.x - e.clientX, a.y - e.clientY);
        if (d < m.r + 12 && d < bd) { best = a; bd = d; }
      }
    }
    return best;
  }

  if (!reduced) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      pnx = e.clientX / W;
      if (!grab) document.body.style.cursor = pick(e) ? 'grab' : '';
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      grab = pick(e);
      if (grab) { e.preventDefault(); document.body.style.cursor = 'grabbing'; }
    });
    window.addEventListener('mouseup', () => { grab = null; document.body.style.cursor = ''; });
    document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });
  }

  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    // scrolling nudges the molecules so they feel like they float in the page
    if (!reduced) mols.forEach((m) => m.atoms.forEach((a) => { a.py += dy * 0.03; }));
    readScroll();
    if (reduced) draw();
  }, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('load', () => { readScroll(); sp = tp; if (reduced) draw(); });

  // ---------- physics (Verlet) ----------
  function step(t) {
    mouse.nx += (pnx - mouse.nx) * 0.06;
    sp += (tp - sp) * 0.08;

    for (const m of mols) {
      // slow wandering breeze so they never sit still, even on touch screens
      m.ax = Math.cos(t * 0.00031 + m.ph) * 0.010;
      m.ay = Math.sin(t * 0.00023 + m.ph * 2) * 0.008;

      for (const a of m.atoms) {
        if (a === grab) { a.px = a.x; a.py = a.y; a.x = mouse.x; a.y = mouse.y; continue; }
        let vx = (a.x - a.px) * 0.993 + m.ax;
        let vy = (a.y - a.py) * 0.993 + m.ay;
        const dx = a.x - mouse.x, dy = a.y - mouse.y, d = Math.hypot(dx, dy);
        if (!grab && d < 80 && d > 0.1) { vx += (dx / d) * (80 - d) * 0.004; vy += (dy / d) * (80 - d) * 0.004; }
        const v = Math.hypot(vx, vy);
        if (v > 26) { vx *= 26 / v; vy *= 26 / v; }
        a.px = a.x; a.py = a.y;
        a.x += vx; a.y += vy;
      }

      for (let i = 0; i < 5; i++) {
        for (const s of m.springs) {
          const a = s.a, b = s.b, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
          const wa = a === grab ? 0 : 1, wb = b === grab ? 0 : 1;
          if (!wa && !wb) continue;
          const f = ((d - s.l) / d) * s.k / (wa + wb);
          a.x += dx * f * wa; a.y += dy * f * wa;
          b.x -= dx * f * wb; b.y -= dy * f * wb;
        }
      }

      for (const a of m.atoms) {
        const r = m.r;
        let v;
        if (a.x < r || a.x > W - r) { v = a.x - a.px; a.x = a.x < r ? r : W - r; a.px = a.x + 0.6 * v; }
        if (a.y < r || a.y > H - r) { v = a.y - a.py; a.y = a.y < r ? r : H - r; a.py = a.y + 0.6 * v; }
      }
    }
  }

  // ---------- drawing ----------
  function ridge(h, dy, off) {
    ctx.beginPath();
    ctx.moveTo(-70, H + PAD + 10);
    for (let x = -70; x <= W + 70; x += 10) {
      const u = x - off;
      ctx.lineTo(x, H * h.y + dy + H * h.a * (Math.sin(u * h.f[0] + h.ph[0]) + 0.5 * Math.sin(u * h.f[1] + h.ph[1])));
    }
    ctx.lineTo(W + 70, H + PAD + 10);
    ctx.closePath();
  }

  function draw() {
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, at(SKY_TOP, sp));
    g.addColorStop(1, at(SKY_BOT, sp));
    ctx.fillStyle = g;
    ctx.fillRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);

    // sun: rises on the left, sets on the right as you scroll
    const R = Math.max(28, Math.min(56, Math.min(W, H) * 0.07));
    const sx = W * (0.12 + 0.76 * sp), sy = H * (0.76 - 0.58 * Math.sin(Math.PI * sp));
    ctx.fillStyle = 'rgba(17,17,17,0.14)';
    ctx.beginPath(); ctx.arc(sx + 4, sy + 4, R, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, 6.2832);
    ctx.fillStyle = at(SUN, sp); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();

    // paper-cut hills: hard offset shadow, then the layer itself
    HILLS.forEach((h) => {
      const off = (mouse.nx - 0.5) * -h.par;
      ridge(h, -5, off); ctx.fillStyle = 'rgba(17,17,17,0.10)'; ctx.fill();
      ridge(h, 0, off); ctx.fillStyle = at(h.c, sp); ctx.fill();
    });

    // molecules
    ctx.lineCap = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const m of mols) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = m.r * 0.5;
      ctx.beginPath();
      BONDS.forEach(([i, j]) => { ctx.moveTo(m.atoms[i].x, m.atoms[i].y); ctx.lineTo(m.atoms[j].x, m.atoms[j].y); });
      ctx.stroke();

      ctx.lineWidth = Math.max(2, m.r * 0.18);
      ctx.font = 'bold ' + Math.round(m.r * 1.1) + 'px "Baloo 2", system-ui, sans-serif';
      for (const a of m.atoms) {
        ctx.beginPath(); ctx.arc(a.x, a.y, m.r, 0, 6.2832);
        ctx.fillStyle = COL[a.el]; ctx.fill(); ctx.stroke();
        if (a.el !== 'C' && m.r >= 8) { ctx.fillStyle = a.el === 'O' ? '#FEFEFF' : '#111'; ctx.fillText(a.el, a.x, a.y + 1); }
      }
    }
  }

  // ---------- start ----------
  resize();
  sp = tp;
  build();

  if (reduced) {
    draw();
  } else {
    let last = 0, acc = 0;
    (function loop(t) {
      acc += Math.min(50, t - last);
      last = t;
      while (acc >= 16.7) { step(t); acc -= 16.7; }
      draw();
      requestAnimationFrame(loop);
    })(0);
  }
})();

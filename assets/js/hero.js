/* =============================================================
   Coruscantbytes — interactive hero
   A large "C" (the studio mark) drawn as a neural / circuit mesh:
   nodes wired to their nearest neighbours, drifting gently. Move
   the pointer over it and the mesh lights up under a soft glow.

   All shape + behaviour knobs live in CONFIG.
   Honors prefers-reduced-motion: renders a static frame and still
   lights up on hover, but nothing moves on its own.
   ============================================================= */
(function () {
  "use strict";

  const canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const CONFIG = {
    outerScaleW: 0.40,   // C outer radius relative to canvas width
    outerScaleH: 0.37,   // ...and relative to canvas height (smaller wins)
    thickness: 0.62,     // C-body thickness as a fraction of the outer radius
    gapDeg: 70,          // size of the C's opening (faces right)
    centerYFrac: 0.39,   // vertical centre of the C, as a fraction of height
    edgePad: 7,          // keep nodes this many px inside the C outline
    areaDensity: 0.0010, // nodes per px^2 of the C body
    minNodes: 70,
    maxNodes: 220,
    maxDegree: 3,        // max wires per node -> keeps the "neural" look tidy
    linkDistFrac: 0.34,  // wire length limit, as a fraction of the outer radius
    wanderAmp: 4.5,      // px of idle drift
    mouseRadius: 185,    // px of pointer influence
    cyan: [34, 211, 238],
    magenta: [232, 69, 196],
    node: [150, 225, 250]
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, R = 0, rInner = 0, rMid = 0, gapHalf = 0, linkDist = 0;
  let nodes = [], pairs = [], grad = null;
  let rafId = 0, running = false, startT = 0;
  const pointer = { x: -9999, y: -9999, active: false };

  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t))
    ];
  }

  // is (x, y) inside the C body? (pad > 0 keeps a margin from the outline)
  function inC(x, y, pad) {
    pad = pad || 0;
    const dx = x - cx, dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d < rInner + pad || d > R - pad) return false;
    // the opening on the right, with the pad narrowing it slightly
    const angPad = pad / Math.max(d, 1);
    if (Math.abs(Math.atan2(dy, dx)) < gapHalf + angPad) return false;
    return true;
  }

  // trace the outline of the C glyph as one closed path
  function traceC(ctx, inset) {
    const ro = R - inset;
    const ri = rInner + inset;
    ctx.beginPath();
    ctx.arc(cx, cy, ro, gapHalf, Math.PI * 2 - gapHalf, false);   // outer edge
    ctx.arc(cx, cy, ri, Math.PI * 2 - gapHalf, gapHalf, true);    // inner edge
    ctx.closePath();                                              // top end-cap
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = W / 2;
    cy = H * CONFIG.centerYFrac;
    R = Math.min(W * CONFIG.outerScaleW, H * CONFIG.outerScaleH);
    rInner = R * (1 - CONFIG.thickness);
    rMid = (R + rInner) / 2;
    gapHalf = (CONFIG.gapDeg * Math.PI / 180) / 2;
    linkDist = R * CONFIG.linkDistFrac;

    grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, `rgb(${CONFIG.cyan.join(",")})`);
    grad.addColorStop(1, `rgb(${CONFIG.magenta.join(",")})`);

    seed();
    if (reduceMotion) draw(0);
  }

  function seed() {
    const gapFrac = (2 * gapHalf) / (2 * Math.PI);
    const area = Math.PI * (R * R - rInner * rInner) * (1 - gapFrac);
    const target = Math.max(
      CONFIG.minNodes,
      Math.min(CONFIG.maxNodes, Math.round(area * CONFIG.areaDensity))
    );

    nodes = [];
    let guard = 0;
    while (nodes.length < target && guard < target * 80) {
      guard++;
      const x = cx + (Math.random() * 2 - 1) * R;
      const y = cy + (Math.random() * 2 - 1) * R;
      if (!inC(x, y, CONFIG.edgePad)) continue;
      nodes.push({
        ax: x, ay: y, x: x, y: y,
        ph: Math.random() * Math.PI * 2,
        sp: 0.0006 + Math.random() * 0.0010,
        amp: CONFIG.wanderAmp * (0.5 + Math.random() * 0.8),
        r: 1.4 + Math.random() * 1.2,
        t: (y - (cy - R)) / (2 * R) // colour ramp, cyan (top) -> magenta (bottom)
      });
    }

    // wire each node to its nearest neighbours, capped at maxDegree
    const cand = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].ax - nodes[j].ax, nodes[i].ay - nodes[j].ay);
        if (d <= linkDist) cand.push({ i: i, j: j, d: d });
      }
    }
    cand.sort((a, b) => a.d - b.d);
    const deg = new Array(nodes.length).fill(0);
    pairs = [];
    for (const c of cand) {
      if (deg[c.i] >= CONFIG.maxDegree || deg[c.j] >= CONFIG.maxDegree) continue;
      pairs.push(c);
      deg[c.i]++;
      deg[c.j]++;
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const pulse = reduceMotion ? 0 : Math.sin(t * 0.0012) * 0.06;
    const lit = pointer.active;

    // --- the C glyph: faint filled body + glowing neon outline ---
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    traceC(ctx, 0);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.06 + pulse * 0.5;
    ctx.fill();

    ctx.strokeStyle = grad;
    ctx.shadowColor = "rgba(80, 190, 255, 0.55)";
    // wide soft halo
    ctx.globalAlpha = 0.14 + pulse + (lit ? 0.08 : 0);
    ctx.shadowBlur = 26;
    ctx.lineWidth = 6;
    ctx.stroke();
    // crisp neon core
    ctx.globalAlpha = 0.85 + (lit ? 0.15 : 0);
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // wires
    for (const p of pairs) {
      const a = nodes[p.i];
      const b = nodes[p.j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      let alpha = (1 - d / linkDist) * 0.3 + pulse * 0.5;
      let white = 0;
      if (lit) {
        const md = Math.hypot((a.x + b.x) / 2 - pointer.x, (a.y + b.y) / 2 - pointer.y);
        if (md < CONFIG.mouseRadius) {
          const k = 1 - md / CONFIG.mouseRadius;
          alpha += k * 0.85;
          white = k;
        }
      }
      if (alpha <= 0.01) continue;
      const col = mix(CONFIG.cyan, CONFIG.magenta, (a.t + b.t) / 2);
      const fin = mix(col, [255, 255, 255], white * 0.7);
      ctx.strokeStyle = `rgba(${fin[0]},${fin[1]},${fin[2]},${Math.min(alpha, 1)})`;
      ctx.lineWidth = 1 + white * 1.3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodes
    for (const n of nodes) {
      let rad = n.r;
      let alpha = 0.5 + pulse;
      let white = 0;
      if (lit) {
        const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
        if (d < CONFIG.mouseRadius) {
          const k = 1 - d / CONFIG.mouseRadius;
          rad += k * 2.8;
          alpha = Math.min(1, alpha + k * 0.6);
          white = k;
        }
      }
      const col = mix(CONFIG.node, [255, 255, 255], white * 0.6);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // the light that "switches on" under the pointer
    if (lit) {
      const g = ctx.createRadialGradient(
        pointer.x, pointer.y, 0,
        pointer.x, pointer.y, CONFIG.mouseRadius * 1.15
      );
      g.addColorStop(0, "rgba(120,220,255,0.32)");
      g.addColorStop(0.35, "rgba(150,95,255,0.15)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, CONFIG.mouseRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  function frame(now) {
    if (!startT) startT = now;
    const t = now - startT;
    for (const n of nodes) {
      n.x = n.ax + Math.sin(t * n.sp + n.ph) * n.amp;
      n.y = n.ay + Math.cos(t * n.sp * 0.9 + n.ph) * n.amp;
    }
    draw(t);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    startT = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ---------- pointer (canvas sits behind the hero text) ---------- */
  function track(e) {
    const rect = canvas.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    pointer.active = inside;
    if (inside) {
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      if (reduceMotion) draw(performance.now()); // light responds without a loop
    } else if (reduceMotion) {
      draw(performance.now());
    }
  }
  window.addEventListener("pointermove", track, { passive: true });
  window.addEventListener("pointerdown", track, { passive: true });
  window.addEventListener("blur", () => {
    pointer.active = false;
    if (reduceMotion) draw(performance.now());
  });

  /* ---------- lifecycle ---------- */
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) start();
        else stop();
      }
    }, { threshold: 0.01 }).observe(canvas);
  }

  resize();
  start();
})();

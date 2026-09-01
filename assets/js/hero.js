/* =============================================================
   Coruscantbytes — interactive hero
   A large "C" (the studio mark) whose body is filled with
   PCB-style copper traces: concentric routed lanes, 45deg jogs,
   branch-offs and vias. A faint "current" flows along every
   trace; move the pointer over the C and the traces under it
   surge — brighter, faster, vias glowing — beneath a soft light.

   Shape + behaviour knobs live in CONFIG.
   Honors prefers-reduced-motion: draws a static frame and still
   lights up on hover, but nothing animates on its own.
   ============================================================= */
(function () {
  "use strict";

  const canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const CONFIG = {
    outerScaleW: 0.40,    // C outer radius relative to canvas width
    outerScaleH: 0.37,    // ...and relative to canvas height (smaller wins)
    thickness: 0.62,      // C-body thickness as a fraction of the outer radius
    gapDeg: 70,           // size of the C's opening (faces right)
    centerYFrac: 0.39,    // vertical centre of the C, as a fraction of height
    edgePad: 11,          // keep traces this many px inside the C outline
    laneGap: 14,          // px between concentric trace lanes
    traceMarginDeg: 11,   // keep traces back from the very tips of the C
    stepDeg: 3,           // polyline resolution along an arc
    jogChance: 0.22,      // chance a main trace steps a lane in/out mid-run
    branchChance: 0.32,   // chance a lane also spawns a diagonal branch
    viaSpacingDeg: 44,    // ~one extra via every N degrees along a trace
    flowSpeed: 0.04,      // px/ms of the travelling highlight at rest
    mouseRadius: 120,     // px of pointer influence
    attachRadius: 95,     // px: pointer "solders on" to traces within this range
    maxAttach: 5,         // max simultaneous solder wires from the pointer
    rigRadius: 46,        // px: pointer rig's stubs fade out past this
    cyan: [40, 210, 240],     // horizontal / concentric traces
    magenta: [235, 70, 190],  // vertical / radial cross-traces
    violet: [150, 110, 245]
  };

  const RAD = Math.PI / 180;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, R = 0, rInner = 0, gapHalf = 0;
  let traces = [], grad = null;
  // `elapsed` accumulates across stop/start (scrolling away and back), so the
  // flowing current and the chip's rotation pick up where they left off
  let rafId = 0, running = false, lastT = 0, elapsed = 0;

  // Pointer state. Client coords are the source of truth (they survive
  // scrolling); canvas-local x/y are re-derived every frame and eased, so the
  // rig glides instead of snapping. `presence` fades 0..1 as the cursor
  // enters/leaves the hero, so nothing ever pops in or out.
  const pointer = {
    clientX: -9999, clientY: -9999,
    x: -9999, y: -9999,       // eased, canvas-local
    tx: -9999, ty: -9999,     // target, canvas-local
    over: false,              // raw: is the cursor over the canvas right now
    presence: 0,              // eased 0..1
    seen: false,              // has the cursor ever been over the canvas
    get active() { return this.presence > 0.01; }
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // cyan -> violet -> magenta by k in [0, 1]
  const ramp = (k) => (k < 0.5
    ? mix(CONFIG.cyan, CONFIG.violet, k * 2)
    : mix(CONFIG.violet, CONFIG.magenta, (k - 0.5) * 2));
  const P = (rad, ang) => ({ x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) });

  // outline of the C glyph as one closed path
  function traceC(inset) {
    const ro = R - inset, ri = rInner + inset;
    ctx.beginPath();
    ctx.arc(cx, cy, ro, gapHalf, Math.PI * 2 - gapHalf, false);
    ctx.arc(cx, cy, ri, Math.PI * 2 - gapHalf, gapHalf, true);
    ctx.closePath();
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
    gapHalf = (CONFIG.gapDeg * RAD) / 2;

    grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, rgba(CONFIG.cyan, 1));
    grad.addColorStop(0.5, rgba(CONFIG.violet, 1));
    grad.addColorStop(1, rgba(CONFIG.magenta, 1));

    build();
    if (reduceMotion) draw(0);
  }

  function arcPoints(rad, a0, a1) {
    if (a1 < a0) { const t = a0; a0 = a1; a1 = t; }
    const step = CONFIG.stepDeg * RAD;
    const pts = [];
    for (let a = a0; a < a1; a += step) pts.push(P(rad, a));
    pts.push(P(rad, a1));
    return pts;
  }

  const centroidY = (pts) => {
    let s = 0;
    for (const p of pts) s += p.y;
    return s / pts.length;
  };
  const colorFor = (pts) => ramp((centroidY(pts) - (cy - R)) / (2 * R));

  function makeVias(pts) {
    const out = [pts[0], pts[pts.length - 1]];
    const every = Math.max(4, (CONFIG.viaSpacingDeg / CONFIG.stepDeg) | 0);
    for (let i = every; i < pts.length - every; i += every) {
      if (Math.random() < 0.6) out.push(pts[i]);
    }
    return out;
  }

  function build() {
    traces = [];
    const rLo = rInner + CONFIG.edgePad;
    const rHi = R - CONFIG.edgePad;
    const laneCount = Math.max(3, Math.floor((rHi - rLo) / CONFIG.laneGap));
    const laneW = (rHi - rLo) / laneCount;
    const m = CONFIG.traceMarginDeg * RAD;
    const A0 = gapHalf + m;
    const A1 = Math.PI * 2 - gapHalf - m;

    for (let k = 0; k < laneCount; k++) {
      const rad = rLo + (k + 0.5) * laneW;

      // --- main concentric trace, ends pulled in a little at random ---
      const aS = A0 + Math.random() * 0.06 * (A1 - A0);
      const aE = A1 - Math.random() * 0.06 * (A1 - A0);
      const pts = arcPoints(rad, aS, aE);

      // one lane jog somewhere in the middle (the "routed around a pin" look)
      if (Math.random() < CONFIG.jogChance && pts.length > 18) {
        const i0 = ((0.2 + Math.random() * 0.4) * pts.length) | 0;
        const i1 = Math.min(pts.length - 4, i0 + 6 + ((Math.random() * 10) | 0));
        const nr = Math.max(rLo, Math.min(rHi,
          rad + (Math.random() < 0.5 ? -1 : 1) * laneW * (0.5 + Math.random() * 0.35)));
        const edge = 3; // points spent easing in / out -> ~45deg corners
        for (let i = i0; i <= i1; i++) {
          const a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
          let f = 1;
          if (i - i0 < edge) f = (i - i0) / edge;
          else if (i1 - i < edge) f = (i1 - i) / edge;
          const p = P(lerp(rad, nr, f), a);
          pts[i].x = p.x;
          pts[i].y = p.y;
        }
      }

      traces.push({
        pts: pts,
        col: CONFIG.cyan,          // concentric = "horizontal" = blue
        axis: "h",
        vias: makeVias(pts),
        phase: Math.random() * 1000,
        w: 1.0 + Math.random() * 0.6
      });

      // --- diagonal branch peeling off an inner/outer lane ---
      if (k > 0 && k < laneCount - 1 && Math.random() < CONFIG.branchChance) {
        const baseA = lerp(A0, A1, 0.18 + Math.random() * 0.64);
        const angDir = Math.random() < 0.5 ? -1 : 1;
        const radDir = Math.random() < 0.5 ? -1 : 1;
        const steps = 9 + ((Math.random() * 9) | 0);
        const spanLanes = 1.4 + Math.random() * 1.6;
        const bpts = [];
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const a = baseA + angDir * f * (24 + Math.random() * 6) * RAD;
          const rr = Math.max(rLo, Math.min(rHi, rad + radDir * f * spanLanes * laneW));
          bpts.push(P(rr, a));
        }
        traces.push({
          pts: bpts,
          col: CONFIG.cyan,
          axis: "h",
          vias: [bpts[0], bpts[bpts.length - 1]],
          phase: Math.random() * 1000,
          w: 0.8
        });
      }
    }

    // --- radial "cross" traces: run across the lanes with 90deg turns,
    //     so the routing reads as a mix of horizontal + vertical, not just rings ---
    const radialCount = Math.round(laneCount * 1.25);
    for (let n = 0; n < radialCount; n++) {
      const pts = [];
      // spread them around the arc instead of clustering
      let a = lerp(A0, A1, (n + 0.15 + Math.random() * 0.7) / radialCount);
      let r = rLo + Math.random() * (rHi - rLo);
      const rDir = Math.random() < 0.5 ? 1 : -1;
      pts.push(P(r, a));

      const legs = 2 + ((Math.random() * 2) | 0);
      for (let leg = 0; leg < legs; leg++) {
        // radial leg (the "vertical" run)
        const r2 = Math.max(rLo, Math.min(rHi,
          r + rDir * laneW * (1 + Math.random() * 1.5)));
        const rSteps = Math.max(2, (Math.abs(r2 - r) / 6) | 0);
        for (let s = 1; s <= rSteps; s++) pts.push(P(lerp(r, r2, s / rSteps), a));
        r = r2;

        // short arc leg (the 90deg turn / "horizontal" run)
        if (leg < legs - 1) {
          const a2 = a + (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6) * RAD;
          const aSteps = Math.max(2, (Math.abs(a2 - a) / (CONFIG.stepDeg * RAD)) | 0);
          for (let s = 1; s <= aSteps; s++) pts.push(P(r, lerp(a, a2, s / aSteps)));
          a = a2;
        }
        if (r <= rLo + 1 || r >= rHi - 1) break;
      }
      if (pts.length < 3) continue;

      traces.push({
        pts: pts,
        col: CONFIG.magenta,       // radial = "vertical" = pink
        axis: "v",
        vias: [pts[0], pts[pts.length - 1], pts[(pts.length / 2) | 0]],
        phase: Math.random() * 1000,
        w: 0.9 + Math.random() * 0.5
      });
    }
  }

  function strokePolyline(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function heatOf(pts) {
    if (!pointer.active) return 0;
    let min = Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i].x - pointer.x;
      const dy = pts[i].y - pointer.y;
      const d = dx * dx + dy * dy;
      if (d < min) min = d;
    }
    min = Math.sqrt(min);
    if (min >= CONFIG.mouseRadius) return 0;
    return (1 - min / CONFIG.mouseRadius) * pointer.presence;
  }

  /* ---------- pointer "rig": its own little PCB that solders onto the C ---------- */

  const CHIP = {
    pinsPerSide: 3,      // pins on each edge of the chip
    edgeFrac: 0.62,      // spread of the pins along the edge (0..1)
    pinLen: 12           // how far the pins stick out
  };

  // 45deg diagonal off the cursor, then an axis-aligned run into the target
  function elbowPath(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const m = Math.min(Math.abs(dx), Math.abs(dy));
    return [
      { x: ax, y: ay },
      { x: ax + Math.sign(dx) * m, y: ay + Math.sign(dy) * m },
      { x: bx, y: by }
    ];
  }

  // one nearest point per trace, within attachRadius, spread apart
  function attachTargets(px, py) {
    const r2 = CONFIG.attachRadius * CONFIG.attachRadius;
    const hits = [];
    for (const tr of traces) {
      const pts = tr.pts;
      let bd = r2, bi = -1;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i].x - px, dy = pts[i].y - py;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi >= 0) hits.push({ x: pts[bi].x, y: pts[bi].y, d: Math.sqrt(bd), col: tr.col });
    }
    hits.sort((a, b) => a.d - b.d);
    const picked = [];
    for (const h of hits) {
      if (picked.length >= CONFIG.maxAttach) break;
      if (picked.some((p) => Math.hypot(p.x - h.x, p.y - h.y) < 24)) continue;
      picked.push(h);
    }
    return picked;
  }

  function flowStroke(pts, col, alpha, width, t, phase, speed) {
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = width;
    ctx.setLineDash([3, 22]);
    ctx.lineDashOffset = -(((t * speed) + phase) % 100000);
    strokePolyline(pts);
    ctx.setLineDash([]);
  }

  function drawPointerRig(t) {
    if (!pointer.active) return;
    const px = pointer.x, py = pointer.y;
    const baseAng = reduceMotion ? 0 : t * 0.00045;
    const targets = attachTargets(px, py);
    const wired = targets.length > 0;

    // everything below fades with `presence`, so the rig eases in and out
    // instead of popping when the cursor enters or leaves the hero
    ctx.save();
    ctx.globalAlpha = pointer.presence;

    // faint radial light (kept subtle now that there's structure)
    const g = ctx.createRadialGradient(px, py, 0, px, py, CONFIG.mouseRadius * 1.1);
    g.addColorStop(0, "rgba(120,220,255,0.16)");
    g.addColorStop(0.4, "rgba(150,100,255,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, CONFIG.mouseRadius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // solder wires from the cursor to nearby traces
    for (const tg of targets) {
      const path = elbowPath(px, py, tg.x, tg.y);
      const k = 1 - tg.d / CONFIG.attachRadius; // closer -> stronger
      ctx.strokeStyle = rgba(mix(tg.col, [255, 255, 255], 0.35), 0.3 + k * 0.45);
      ctx.lineWidth = 1.2;
      strokePolyline(path);
      ctx.globalCompositeOperation = "lighter";
      flowStroke(path, mix(tg.col, [255, 255, 255], 0.75), 0.45 + k * 0.5, 1.6,
        t, tg.x + tg.y, CONFIG.flowSpeed * 3.2);
      ctx.globalCompositeOperation = "source-over";
      // solder pad where it lands
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, 2.6 + k * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(7,9,16,0.9)";
      ctx.fill();
      ctx.strokeStyle = rgba(mix(tg.col, [255, 255, 255], 0.6), 0.6 + k * 0.4);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // the cursor is a tiny SMD "chip": a square body with pins on every
    // edge, turning slowly. Pins fade from bright (at the body) to nothing
    // at their tips, so the rig dies off with distance from the pointer.
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(baseAng);
    ctx.lineJoin = "miter";

    const sq = wired ? 9 : 7.5;
    const pins = CHIP.pinsPerSide;
    const pitch = (sq * 2 * CHIP.edgeFrac) / Math.max(1, pins - 1);
    const flowOff = -(((t * CONFIG.flowSpeed * 3)) % 100000);

    // 4 edges: outward normal + direction along the edge
    const EDGES = [
      [0, -1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [-1, 0, 0, 1]
    ];
    for (const [nx, ny, ex, ey] of EDGES) {
      for (let i = 0; i < pins; i++) {
        const off = (i - (pins - 1) / 2) * pitch;
        const bx = nx * sq + ex * off;
        const by = ny * sq + ey * off;
        const tx = bx + nx * CHIP.pinLen;
        const ty = by + ny * CHIP.pinLen;

        const gp = ctx.createLinearGradient(bx, by, tx, ty);
        gp.addColorStop(0, "rgba(210,242,255,0.9)");
        gp.addColorStop(1, "rgba(150,225,255,0)");
        ctx.strokeStyle = gp;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        if (wired) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = gp;
          ctx.setLineDash([2.5, 16]);
          ctx.lineDashOffset = flowOff + (i + nx + ny) * 7;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalCompositeOperation = "source-over";
        }

        ctx.beginPath();
        ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,232,255,0.4)";
        ctx.fill();
      }
    }

    // chip body: glow, outline, corner pads, notched core
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(150,225,255,0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "rgba(6,10,18,0.78)";
    ctx.fillRect(-sq, -sq, sq * 2, sq * 2);
    ctx.strokeStyle = "rgba(205,240,255,0.95)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);

    ctx.fillStyle = "rgba(150,225,255,0.9)";
    for (const [cxo, cyo] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.arc(cxo * (sq - 2.5), cyo * (sq - 2.5), 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // pin-1 marker + core dot
    ctx.fillStyle = "rgba(120,215,255,0.85)";
    ctx.beginPath();
    ctx.arc(-sq + 3.2, -sq + 3.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(210,245,255,0.95)";
    ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();       // chip transform
    ctx.restore();       // presence alpha
    ctx.lineJoin = "round";
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const pulse = reduceMotion ? 0 : (Math.sin(t * 0.0011) * 0.5 + 0.5);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // faint C body
    traceC(0);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.05;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 1) flat copper traces  (pink cross-traces sit a little brighter)
    for (const tr of traces) {
      const heat = heatOf(tr.pts);
      tr._heat = heat;
      const c = mix(tr.col, [255, 255, 255], heat * 0.55);
      const base = tr.axis === "v" ? 0.44 : 0.32;
      ctx.strokeStyle = rgba(c, base + 0.07 * pulse + heat * 0.6);
      ctx.lineWidth = (tr.axis === "v" ? tr.w + 0.3 : tr.w) + heat * 1.7;
      strokePolyline(tr.pts);
    }

    // 2) additive bloom + travelling current
    ctx.globalCompositeOperation = "lighter";
    for (const tr of traces) {
      const heat = tr._heat || 0;

      // soft glow around the trace (cheap substitute for shadowBlur)
      ctx.strokeStyle = rgba(tr.col, (tr.axis === "v" ? 0.11 : 0.07) + heat * 0.18);
      ctx.lineWidth = 3.5 + heat * 3;
      strokePolyline(tr.pts);

      // pips of "current" crawling along the copper
      const a = 0.16 + heat * 0.78;
      ctx.strokeStyle = rgba(mix(tr.col, [255, 255, 255], 0.45 + heat * 0.45), a);
      ctx.lineWidth = tr.w * 0.9 + heat * 1.3;
      ctx.setLineDash([3, 26]);
      const spd = CONFIG.flowSpeed * (1 + heat * 4.5);
      ctx.lineDashOffset = -((t * spd + tr.phase) % 100000);
      strokePolyline(tr.pts);
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = "source-over";

    // 3) vias / solder pads — each with a little bloom
    for (const tr of traces) {
      const heat = tr._heat || 0;
      for (const v of tr.vias) {
        const rr = 2.3 + heat * 1.8;
        // bloom
        ctx.globalCompositeOperation = "lighter";
        const bloom = rr * (2 + heat * 2);
        const gg = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, bloom);
        gg.addColorStop(0, rgba(tr.col, 0.18 + heat * 0.32));
        gg.addColorStop(1, rgba(tr.col, 0));
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(v.x, v.y, bloom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        // pad
        ctx.beginPath();
        ctx.arc(v.x, v.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(7,9,16,0.92)";
        ctx.fill();
        ctx.lineWidth = 1 + heat * 0.9;
        ctx.strokeStyle = rgba(mix(tr.col, [255, 255, 255], heat * 0.6), 0.62 + heat * 0.38);
        ctx.stroke();
      }
    }

    // 4) the C outline, neon
    traceC(0);
    ctx.strokeStyle = grad;
    ctx.shadowColor = "rgba(90,190,255,0.5)";
    ctx.globalAlpha = 0.14 + 0.06 * pulse;
    ctx.shadowBlur = 24;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // 5) the pointer rig (its own PCB, soldering onto the C)
    drawPointerRig(t);
  }

  function frame(now) {
    if (!lastT) lastT = now;
    const dt = Math.min(64, now - lastT);   // clamp: tab wake-ups shouldn't jump
    lastT = now;
    elapsed += dt;
    easePointer(dt);
    draw(elapsed);
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastT = 0;   // re-anchor to the next frame; `elapsed` carries on
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ---------- pointer (canvas sits behind the hero text) ---------- */

  // Record raw client coords only; the canvas-local position is derived each
  // frame so scrolling never teleports the rig.
  function track(e) {
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    syncPointer();
    if (reduceMotion) {
      // no rAF loop to ease things, so jump straight to the target
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      pointer.presence = pointer.over ? 1 : 0;
      draw(performance.now());
    }
  }

  // Re-derive canvas-local target + over-state from the live canvas rect.
  // A margin lets the rig start easing in just before the cursor arrives and
  // keeps it from cutting out the instant it crosses the edge.
  function syncPointer() {
    const rect = canvas.getBoundingClientRect();
    const m = 40;
    pointer.over =
      pointer.clientX >= rect.left - m && pointer.clientX <= rect.right + m &&
      pointer.clientY >= rect.top - m && pointer.clientY <= rect.bottom + m;
    pointer.tx = pointer.clientX - rect.left;
    pointer.ty = pointer.clientY - rect.top;
    if (pointer.over && !pointer.seen) {
      // first sighting: start the rig where the cursor already is
      pointer.seen = true;
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }
  }

  // Ease position + presence toward their targets. dt-normalised so the feel
  // is the same on 60Hz and 144Hz screens.
  function easePointer(dt) {
    syncPointer();
    const kPos = 1 - Math.pow(0.0016, dt / 1000);   // ~snappy but not instant
    const kFade = 1 - Math.pow(0.0000015, dt / 1000); // faster fade in/out
    pointer.x = lerp(pointer.x, pointer.tx, kPos);
    pointer.y = lerp(pointer.y, pointer.ty, kPos);
    pointer.presence = lerp(pointer.presence, pointer.over ? 1 : 0, kFade);
    if (pointer.presence < 0.004) pointer.presence = 0;
  }

  window.addEventListener("pointermove", track, { passive: true });
  window.addEventListener("pointerdown", track, { passive: true });
  window.addEventListener("blur", () => {
    pointer.over = false;
    if (reduceMotion) { pointer.presence = 0; draw(performance.now()); }
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

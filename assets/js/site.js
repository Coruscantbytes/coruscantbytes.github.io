/* =============================================================
   Coruscantbytes — site behaviour
   - renders the games grid from window.GAMES
   - pointer-follow glow + subtle parallax on the hero
   - footer year
   ============================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- games grid ---------- */
  const STATUS_LABEL = {
    released: "Released",
    "in-development": "In development",
    prototype: "Prototype"
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const COVER_FALLBACK = "assets/img/games/_placeholder.svg";

  // Mark external links so they open in a new tab.
  function wireLink(a, href) {
    a.href = href || "#";
    if (a.hostname && a.hostname !== location.hostname) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  function buildCard(game) {
    const li = el("li", "game-card");

    const media = el("div", "game-card__media");
    const img = document.createElement("img");
    img.className = "game-card__cover";
    img.alt = "";               // decorative: the title right below says it
    img.loading = "lazy";
    img.decoding = "async";
    img.src = game.cover || COVER_FALLBACK;
    // if the art isn't in the repo yet, don't leave a broken box
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      img.src = COVER_FALLBACK;
    });
    media.appendChild(img);

    const status = el("span", "game-card__status", STATUS_LABEL[game.status] || game.status);
    status.dataset.status = game.status;
    media.appendChild(status);

    const body = el("div", "game-card__body");
    const heading = el("h3", "game-card__title");
    const label = game.year ? `${game.title} · ${game.year}` : game.title;
    if (game.url) {
      // The anchor is stretched over the whole card in CSS, so the entire
      // card is clickable while staying a single, real link for a11y.
      const a = wireLink(el("a", "game-card__link", label), game.url);
      heading.appendChild(a);
      li.classList.add("game-card--linked");
    } else {
      heading.textContent = label;
    }
    body.appendChild(heading);
    if (game.tagline) body.appendChild(el("p", "game-card__tagline", game.tagline));

    if (Array.isArray(game.tags) && game.tags.length) {
      const tags = el("div", "game-card__tags");
      game.tags.forEach((t) => tags.appendChild(el("span", "game-card__tag", t)));
      body.appendChild(tags);
    }

    li.appendChild(media);
    li.appendChild(body);

    if (Array.isArray(game.links) && game.links.length) {
      const links = el("div", "game-card__links");
      game.links.forEach((l) => links.appendChild(wireLink(el("a", null, l.label), l.url)));
      li.appendChild(links);
    }
    return li;
  }

  const grid = document.getElementById("game-grid");
  if (grid && Array.isArray(window.GAMES)) {
    const frag = document.createDocumentFragment();
    window.GAMES.forEach((g) => frag.appendChild(buildCard(g)));
    grid.appendChild(frag);
  }

  /* ---------- hero pointer glow + parallax ---------- */
  const hero = document.getElementById("hero");
  const glow = document.getElementById("hero-glow");
  const parallax = document.getElementById("hero-parallax");

  if (hero && !reduceMotion) {
    // Targets the pointer sets, and the eased values actually rendered.
    // Everything is interpolated so leaving the hero (e.g. heading down to
    // the games panel) glides back to rest instead of snapping in one frame.
    let tx = 0.5, ty = 0.5, tStrength = 0;
    let vx = 0.5, vy = 0.5, vStrength = 0;
    let raf = 0;
    let last = 0;

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
      tStrength = 1;
      kick();
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      tx = 0.5;
      ty = 0.5;
      tStrength = 0;
      kick();
    }, { passive: true });

    function kick() {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      const dt = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.pow(0.002, dt / 1000);

      vx += (tx - vx) * k;
      vy += (ty - vy) * k;
      vStrength += (tStrength - vStrength) * k;

      if (glow) {
        glow.style.setProperty("--mx", (vx * 100).toFixed(2) + "%");
        glow.style.setProperty("--my", (vy * 100).toFixed(2) + "%");
        glow.style.opacity = vStrength.toFixed(3);
      }
      if (parallax) {
        const dx = (vx - 0.5) * 22 * vStrength;
        const dy = (vy - 0.5) * 22 * vStrength;
        parallax.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }

      // keep going until everything has settled, then release the loop
      const settled =
        Math.abs(tx - vx) < 0.0005 &&
        Math.abs(ty - vy) < 0.0005 &&
        Math.abs(tStrength - vStrength) < 0.002;
      raf = settled ? 0 : requestAnimationFrame(tick);
    }
  }
})();

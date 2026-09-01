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

  function buildCard(game) {
    const li = el("li", "game-card");

    const media = el("div", "game-card__media");
    if (game.cover) media.style.backgroundImage = `url("${game.cover}")`;
    const status = el("span", "game-card__status", STATUS_LABEL[game.status] || game.status);
    status.dataset.status = game.status;
    media.appendChild(status);

    const body = el("div", "game-card__body");
    body.appendChild(el("h3", "game-card__title", game.year ? `${game.title} · ${game.year}` : game.title));
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
      game.links.forEach((l) => {
        const a = el("a", null, l.label);
        a.href = l.url || "#";
        if (a.href && a.hostname !== location.hostname) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        links.appendChild(a);
      });
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
    let raf = 0;
    let px = 0.5;
    let py = 0.5;

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    hero.addEventListener("pointerleave", () => {
      px = 0.5;
      py = 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    function apply() {
      raf = 0;
      if (glow) {
        glow.style.setProperty("--mx", (px * 100).toFixed(2) + "%");
        glow.style.setProperty("--my", (py * 100).toFixed(2) + "%");
      }
      if (parallax) {
        const dx = (px - 0.5) * 22;
        const dy = (py - 0.5) * 22;
        parallax.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }
    }
  }
})();

/* =============================================================
   Haloward — game page behaviour
   - swaps the text wordmark for the logo art once it exists
   - the pointer pushes the seam between Heaven and Hell
   - footer year
   ============================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- logo art, if it has been added to the repo ---------- */
  // Set LOGO_ART to the path once the file is in the repo; the styled text
  // wordmark stands in until then. Left null so the
  // page doesn't fire a 404 on every visit just to discover it's still missing.
  const LOGO_ART = null; // "../assets/img/games/haloward-logo.png"

  const wordmark = document.getElementById("hw-wordmark");
  if (wordmark && LOGO_ART) {
    const probe = new Image();
    probe.onload = function () {
      const img = document.createElement("img");
      img.className = "hw-hero__logo";
      img.src = probe.src;
      img.alt = "Haloward";
      img.width = probe.naturalWidth;
      img.height = probe.naturalHeight;
      const h1 = document.createElement("h1");
      h1.style.margin = "0";
      h1.appendChild(img);
      wordmark.replaceWith(h1);
    };
    probe.src = LOGO_ART;
  }

  /* ---------- art that isn't in the repo yet ---------- */
  // Drop a figure whose image is missing, and hide the whole section once
  // nothing is left, rather than showing broken-image boxes.
  const mediaSection = document.getElementById("media");
  if (mediaSection) {
    const dropIfEmpty = () => {
      if (!mediaSection.querySelector("figure")) mediaSection.hidden = true;
    };
    mediaSection.querySelectorAll("figure img").forEach((img) => {
      img.addEventListener("error", () => {
        const fig = img.closest("figure");
        if (fig) fig.remove();
        dropIfEmpty();
      });
    });
    dropIfEmpty();   // nothing added yet -> don't show an empty section
  }

  /* ---------- the seam follows the pointer ---------- */
  const hero = document.getElementById("hw-hero");
  if (hero && !reduceMotion) {
    // `target` is where the pointer wants the seam; `value` is what we render,
    // eased toward it so the split glides instead of snapping.
    let target = 50;
    let value = 50;
    let raf = 0;
    let last = 0;

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      // clamp the travel so neither realm ever disappears completely
      target = 30 + f * 40;
      kick();
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      target = 50;
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
      value += (target - value) * (1 - Math.pow(0.004, dt / 1000));
      hero.style.setProperty("--split", value.toFixed(2) + "%");
      raf = Math.abs(target - value) < 0.05 ? 0 : requestAnimationFrame(tick);
    }
  }
})();

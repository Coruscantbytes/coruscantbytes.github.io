# coruscantbytes.github.io

Marketing / portfolio site for **Coruscantbytes**, an indie game studio.
Plain HTML/CSS/JS — no build step, no framework — served from GitHub Pages.

## Live

<https://coruscantbytes.github.io/>

## Project structure

```
.
├── index.html              # the whole page (semantic sections: hero, games, about, contact)
├── 404.html                # GitHub Pages custom not-found page
├── robots.txt
├── .nojekyll               # tell GitHub Pages to serve files as-is
└── assets/
    ├── css/
    │   └── main.css        # design tokens (:root) + all styles, sectioned with comments
    ├── js/
    │   ├── hero.js         # interactive mouse-reactive "circuit field" behind the hero
    │   └── site.js         # renders the games grid, hero glow/parallax, footer year
    ├── data/
    │   └── games.js        # ← EDIT THIS to add or change games
    └── img/
        ├── logo.svg        # brand mark (temporary — replace with the real logo, see below)
        └── games/          # game cover art
```

## Running locally

No tooling needed — open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Adding a game

Edit [`assets/data/games.js`](assets/data/games.js) and add an object to the `window.GAMES`
array. Drop a cover image (aim for ~16:10, e.g. 640×400) into `assets/img/games/`
and point `cover` at it. That's the only file you touch.

```js
{
  title: "My New Game",
  tagline: "One line that sells it.",
  status: "in-development",          // "released" | "in-development" | "prototype"
  year: 2026,
  cover: "assets/img/games/my-new-game.jpg",
  tags: ["Genre", "Platform"],
  links: [{ label: "Steam", url: "https://..." }]
}
```

## Replacing the logo

`assets/img/logo.svg` is a stand-in drawn to match the brand colours. To use the
real logo:

1. Save it as `assets/img/logo.png` (or `.svg`).
2. In `index.html`, change the three `src="assets/img/logo.svg"` references
   (header, hero, footer) and the `<link rel="icon">` to the new file.

## Social sharing image

For rich previews when the site is shared on Discord / X / etc., add a
**1200×630** image at `assets/img/og-cover.png`. The `<meta property="og:image">`
tags in `index.html` already point at it.

## Social links

The footer of `index.html` has a `<nav class="social">` block, wired to the
studio's real accounts: [X](https://x.com/coruscantbytes),
[Instagram](https://www.instagram.com/coruscantbytes/),
[TikTok](https://www.tiktok.com/@coruscantbytes),
[YouTube](https://www.youtube.com/@Coruscantbytes) and
[GitHub](https://github.com/Coruscantbytes).

To add another (itch.io, Steam, Discord…), copy one of the `<a>` blocks and
swap the `href`, `aria-label`, `title` and the inline `<svg>` path.

## Cache busting

CSS and JS are linked with a `?v=N` query string in `index.html`. **Bump that
number whenever you edit `main.css`, `site.js` or `hero.js`** — otherwise
returning visitors keep running the old cached copy.

## Theming

All colours, fonts, spacing and radii are CSS custom properties at the top of
`assets/css/main.css` under `:root`. Change them there and the whole site follows.

## Deploying

Push to `main`. GitHub Pages (Settings → Pages → Source: `main` / root) publishes
automatically within a minute.

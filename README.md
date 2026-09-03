# coruscantbytes.github.io

Marketing / portfolio site for **Coruscantbytes**, an indie game studio.
Plain HTML/CSS/JS — no build step, no framework — served from GitHub Pages.

## Live

<https://coruscantbytes.github.io/>

## Project structure

```
.
├── index.html              # home (hero, games, tools, about, contact)
├── 404.html                # GitHub Pages custom not-found page
├── robots.txt             # points search engines at sitemap.xml
├── sitemap.xml            # add a <url> block for each new page
├── .nojekyll               # tell GitHub Pages to serve files as-is
├── games/
│   └── haloward.html       # per-game detail page
└── assets/
    ├── css/
    │   ├── main.css        # design tokens (:root) + all shared styles
    │   └── haloward.css    # Haloward's own art direction, layered on main.css
    ├── js/
    │   ├── hero.js         # the interactive PCB "C" on the home page
    │   ├── site.js         # renders the games + tools grids, hero glow, footer year
    │   └── haloward.js     # Haloward page: heaven/hell seam, art fallbacks
    ├── data/
    │   ├── games.js        # ← EDIT THIS to add or change games
    │   └── tools.js        # ← ...and this for Asset Store / dev tools
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
  url: "games/my-new-game.html",     // optional — makes the whole card a link
  links: [{ label: "Steam", url: "https://..." }]
}
```

If the cover image is missing the card falls back to the placeholder, so a
half-finished entry never shows a broken image.

## Adding a tool

Games are for players; tools are for developers, so they get their own section
rather than sharing the games grid. Add an object to `window.TOOLS` in
[`assets/data/tools.js`](assets/data/tools.js):

```js
{
  name: "MyTool",
  subtitle: "What the store calls it",
  description: "A sentence or two on what it actually does.",
  price: "Free",                      // or "$19"
  store: "Unity Asset Store",
  tags: ["Unity 2022.3+", "Mobile"],
  url: "https://assetstore.unity.com/packages/..."
}
```

The whole card links to `url`, which opens in a new tab.

## Game detail pages

A game gets its own page when its entry in `games.js` has a `url`. The whole
card on the home page then links to it.

`games/haloward.html` is the pattern to copy: it loads `main.css` (site chrome,
header, footer, buttons) and then its own stylesheet for the game's palette, so
each game can look like itself without touching the shared styles. Note the
`../` prefix on every asset path — game pages live one level down.

## Art still to add

These are referenced in the code but not in the repo yet. Nothing 404s while
they're missing — each one is switched off with a single edit, listed below.

| File | Where | Switch it on |
| --- | --- | --- |
| `assets/img/games/haloward-cover.png` | Card art on the home page, ~640×400 | `cover:` in `assets/data/games.js` |
| `assets/img/games/haloward-logo.png` | Replaces the text wordmark on the game page | `LOGO_ART` at the top of `assets/js/haloward.js` |
| `assets/img/games/haloward-sword.png` | "From the world" section | Uncomment the `<figure>` in `games/haloward.html` |
| `assets/img/og-cover.png` | 1200×630 link preview | Already wired — just add the file |

## Checking the site's health

Deploy first, then run the live URL through:

- **[PageSpeed Insights](https://pagespeed.web.dev/)** — the main one. Performance /
  Accessibility / Best Practices / SEO, with a fix list.
- **Lighthouse in Chrome DevTools** (`F12` → Lighthouse) — same engine, and it
  works against `localhost`.
- **[Google Search Console](https://search.google.com/search-console)** — real
  data from real visitors once the site is indexed. `sitemap.xml` is ready to
  submit there.

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
number whenever you edit any file under `assets/css/` or `assets/js/`** — otherwise
returning visitors keep running the old cached copy.

## Theming

All colours, fonts, spacing and radii are CSS custom properties at the top of
`assets/css/main.css` under `:root`. Change them there and the whole site follows.

## Deploying

Push to `main`. GitHub Pages (Settings → Pages → Source: `main` / root) publishes
automatically within a minute.

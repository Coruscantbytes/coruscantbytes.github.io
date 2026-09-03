/* =============================================================
   Coruscantbytes — games catalogue
   -------------------------------------------------------------
   This is the ONLY file you edit to add / update a game.
   site.js reads window.GAMES and builds the cards on #games.

   Each entry:
     title    : string
     tagline  : short one-liner shown under the title
     status   : "released" | "in-development" | "prototype"
     year     : release / target year (string or number)
     cover    : path to a 16:10-ish image (jpg/png/webp/svg).
                Falls back to the placeholder if the file is missing.
     tags     : array of short strings (genre, platform, engine...)
     url      : OPTIONAL — a detail page for the game. When present the
                whole card becomes a link to it.
     links    : array of { label, url } — store pages, trailers, devlogs
   ============================================================= */

window.GAMES = [
  {
    title: "Haloward",
    tagline: "Hold the line between Heaven and Hell. A tower defense of light and fire.",
    status: "in-development",
    year: 2026,
    // TODO: swap to "assets/img/games/haloward-cover.png" once the art exists.
    // Pointing at a missing file would 404 on every visit.
    cover: "assets/img/games/_placeholder.svg",
    tags: ["Tower Defense", "Strategy", "PC"],
    url: "games/haloward.html",
    links: [
      { label: "About Haloward", url: "games/haloward.html" }
    ]
  }
];

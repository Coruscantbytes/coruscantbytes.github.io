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
     cover    : path to a 16:10-ish image (jpg/png/webp/svg)
     tags     : array of short strings (genre, platform, engine...)
     links    : array of { label, url } — store pages, trailers, devlogs
   ============================================================= */

window.GAMES = [
  {
    title: "Project Nova",
    tagline: "A slow-burn sci-fi mystery set on a dying station.",
    status: "in-development",
    year: 2026,
    cover: "assets/img/games/_placeholder.svg",
    tags: ["Narrative", "Exploration", "PC"],
    links: [
      { label: "Devlog", url: "#" },
      { label: "Wishlist", url: "#" }
    ]
  },
  {
    title: "Ashfall",
    tagline: "Survive one long night as the ash keeps falling.",
    status: "released",
    year: 2025,
    cover: "assets/img/games/_placeholder.svg",
    tags: ["Survival", "Atmospheric", "itch.io"],
    links: [
      { label: "Play", url: "#" },
      { label: "Trailer", url: "#" }
    ]
  },
  {
    title: "Untitled Byte",
    tagline: "An experiment in movement and light. Very early.",
    status: "prototype",
    year: 2026,
    cover: "assets/img/games/_placeholder.svg",
    tags: ["Prototype", "Platformer"],
    links: [
      { label: "Notes", url: "#" }
    ]
  }
];

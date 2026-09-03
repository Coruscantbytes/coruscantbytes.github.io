/* =============================================================
   Coruscantbytes — tools & assets we publish for other developers
   -------------------------------------------------------------
   Same idea as games.js: this is the ONLY file you edit to add or
   change a tool. site.js reads window.TOOLS and builds the cards
   in the #tools section.

   Each entry:
     name        : product name
     subtitle    : the rest of the store title, if it has one
     description : a sentence or two on what it actually does
     price       : "Free" or e.g. "$19" — shown as a badge
     store       : where it lives ("Unity Asset Store", "itch.io"...)
     tags        : array of short strings (engine version, pipeline, platform)
     url         : the store page
   ============================================================= */

window.TOOLS = [
  {
    name: "StepQuest",
    subtitle: "Active Pedometer & Reward Engine",
    description:
      "A drop-in pedometer for Unity. Tracks steps from the device accelerometer " +
      "and wires them into a reward loop, so a mobile app can turn real-world " +
      "movement into in-game progress.",
    price: "Free",
    store: "Unity Asset Store",
    tags: ["Unity 2022.3+", "Built-in + URP", "Mobile"],
    url: "https://assetstore.unity.com/packages/tools/integration/stepquest-active-pedometer-reward-engine-394852"
  }
];

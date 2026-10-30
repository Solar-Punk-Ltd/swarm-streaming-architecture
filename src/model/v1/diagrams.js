/* Diagrams for V1: two browser tabs with Swarm between them, in the order a
 * slice moves, left to right. Same grid rules as the V4 model: columns 270
 * units apart, rows at 60 and 280.
 */

export const V1_DIAGRAMS = {
  context: {
    name: "V1, Client side streaming (PoC)", level: "Context", parent: null, w: 1400, h: 400,
    nodes: [
      { id: "streamer",    x: 20,   y: 120, w: 215, h: 140 },
      { id: "streamerapp", x: 300,  y: 110, w: 240, h: 160 },
      { id: "swarm",       x: 600,  y: 115, w: 220, h: 150 },
      { id: "viewerapp",   x: 880,  y: 110, w: 240, h: 160 },
      { id: "viewers",     x: 1170, y: 120, w: 215, h: 140 }
    ],
    edges: [
      { from: "streamer",    to: "streamerapp", label: "camera", strong: true },
      { from: "streamerapp", to: "swarm",       label: "slices, feed", strong: true },
      { from: "swarm",       to: "viewerapp",   label: "reads", strong: true },
      { from: "viewerapp",   to: "viewers",     label: "plays", strong: true }
    ]
  },

  streamer: {
    name: "Streamer's browser", level: "Components", parent: "context", of: "streamerapp", w: 1400, h: 300,
    nodes: [
      { id: "camera",   x: 300, y: 80, w: 220, h: 140 },
      { id: "recorder", x: 570, y: 80, w: 220, h: 140 },
      { id: "writer",   x: 840, y: 80, w: 220, h: 140 },
      { id: "streamer", x: 30,  y: 80, w: 200, h: 140 },
      { id: "swarm",    x: 1110, y: 80, w: 220, h: 140 }
    ],
    edges: [
      { from: "streamer", to: "camera",   label: "allows", strong: true },
      { from: "camera",   to: "recorder", label: "live video", strong: true },
      { from: "recorder", to: "writer",   label: "2 s slices", strong: true },
      { from: "writer",   to: "swarm",    label: "slice, feed index", strong: true }
    ]
  },

  viewer: {
    // The reader and the fetcher both read from Swarm, one the feed and one
    // the slices, so they stack in one column and the player sits after both.
    name: "Viewer's browser", level: "Components", parent: "context", of: "viewerapp", w: 1100, h: 480,
    nodes: [
      { id: "reader",  x: 300, y: 60,  w: 220, h: 140 },
      { id: "fetcher", x: 300, y: 280, w: 220, h: 140 },
      { id: "player",  x: 570, y: 170, w: 220, h: 140 },
      { id: "swarm",   x: 30,  y: 170, w: 220, h: 140 },
      { id: "viewers", x: 840, y: 170, w: 220, h: 140 }
    ],
    edges: [
      { from: "swarm",   to: "reader",  label: "feed", strong: true },
      { from: "reader",  to: "fetcher", label: "address", strong: true },
      { from: "swarm",   to: "fetcher", label: "slice", strong: true },
      { from: "fetcher", to: "player",  label: "slices", strong: true },
      { from: "player",  to: "viewers", label: "plays", strong: true }
    ]
  }
};

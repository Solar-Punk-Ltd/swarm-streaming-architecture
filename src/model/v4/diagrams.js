/* Diagrams for the V4 stack as built.
 *
 * Grid rules: columns 270 units apart, rows at 60, 280
 * and 500, labels of about 14 characters, and an edge that crosses a column
 * routed through a row that column leaves empty. The nested canvas routes
 * every edge itself and reads no bend or anchor from here, so a clean view is
 * made by where the cards sit.
 *
 * Containment claims an object at the shallowest diagram that places it, and
 * between two diagrams at the same depth the one drilled first. So a detail
 * diagram repeats a neighbouring container rather than one of its components,
 * or that component would be drawn inside the wrong box. And an external the
 * context diagram claims, Swarm above all, is drawn where the context puts it
 * whatever a deeper diagram says: its cell there only keeps it in an occupied
 * column, so it adds no empty one.
 *
 * Bands are validated, not drawn in the nested view, so they only document
 * which machine each card sits on.
 */

export const V4_DIAGRAMS = {
  context: {
    // Swarm sits under the platform, in its column: opened, the platform
    // frame spans the whole media path, and Swarm beside it would send every
    // write and read arrow across it. Under it they drop and rise. Every edge
    // here touches the platform, so opening it replaces each one with the
    // finer edges inside rather than drawing both.
    name: "V4 streaming stack", level: "Context", parent: null, w: 1100, h: 660,
    nodes: [
      { id: "encoder",  x: 20,  y: 60,  w: 215, h: 140 },
      { id: "operator", x: 20,  y: 280, w: 215, h: 140 },
      { id: "infraop",  x: 20,  y: 500, w: 215, h: 140 },
      { id: "platform", x: 420, y: 80,  w: 270, h: 185 },
      { id: "swarm",    x: 435, y: 420, w: 240, h: 150 },
      { id: "viewers",  x: 820, y: 100, w: 240, h: 140 }
    ],
    edges: [
      { from: "encoder",  to: "platform", label: "SRT or RTMP", strong: true },
      { from: "operator", to: "platform", label: "streams, keys", kind: "control" },
      { from: "infraop",  to: "platform", label: "deploys", kind: "control" },
      { from: "platform", to: "swarm",    label: "writes", strong: true },
      { from: "swarm",    to: "platform", label: "reads", strong: true },
      { from: "platform", to: "viewers",  label: "plays", strong: true }
    ]
  },

  containers: {
    // The top row is the media path, left to right, in the order a segment
    // moves: stage host, Bee host, down into Swarm and back up through the
    // viewer's Swarm access into the streaming client. The bottom row holds
    // what sits beside it: the control host under the stage host it deploys,
    // chat and identity under the client they serve. The control host is
    // listed last, so the stage diagram is drilled first and its components
    // stay its own.
    name: "V4 streaming stack", level: "Containers", parent: "context", of: "platform", w: 1650, h: 680,
    groups: [
      { name: "Stage host",   x: 284, y: 40,  w: 262, h: 190, hint: "One stack deployment per stage." },
      { name: "Bee clients",  x: 554, y: 40,  w: 252, h: 190, hint: "Stock Bee nodes: one per quality level, and the catalog node." },
      { name: "Control host", x: 284, y: 480, w: 262, h: 190, hint: "The stream manager, the stream infra manager and the HTTPS proxy." }
    ],
    nodes: [
      { id: "stagehost", x: 300,  y: 60,  w: 230, h: 150 },
      { id: "beehost",   x: 570,  y: 60,  w: 220, h: 150 },
      { id: "access",    x: 840,  y: 60,  w: 230, h: 150 },
      { id: "client",    x: 1110, y: 60,  w: 230, h: 150 },
      { id: "chat",      x: 840,  y: 500, w: 230, h: 150 },
      { id: "identity",  x: 1110, y: 500, w: 230, h: 150 },
      { id: "control",   x: 300,  y: 500, w: 230, h: 150 },
      { id: "encoder",   x: 30,   y: 60,  w: 200, h: 140 },
      { id: "operator",  x: 30,   y: 280, w: 200, h: 140 },
      { id: "infraop",   x: 30,   y: 500, w: 200, h: 140 },
      { id: "swarm",     x: 570,  y: 500, w: 220, h: 150 },
      { id: "viewers",   x: 1400, y: 60,  w: 220, h: 140 }
    ],
    edges: [
      { from: "encoder",   to: "stagehost", label: "SRT or RTMP", strong: true },
      { from: "stagehost", to: "beehost",   label: "stamped", strong: true },
      { from: "beehost",   to: "swarm",     label: "chunks, feeds", strong: true },
      { from: "swarm",     to: "access",    label: "segments", strong: true },
      { from: "access",    to: "client",    label: "reads", strong: true },
      { from: "client",    to: "viewers",   label: "playback", strong: true },
      { from: "client",    to: "chat",      label: "messages", kind: "media" },
      { from: "chat",      to: "swarm",     label: "chat feed", kind: "media" },
      { from: "identity",  to: "client",    label: "guest key", kind: "control" },
      { from: "operator",  to: "control",   label: "streams, keys", kind: "control" },
      { from: "infraop",   to: "control",   label: "deploys", kind: "control" },
      { from: "control",   to: "stagehost", label: "deploys", kind: "control" },
      { from: "stagehost", to: "control",   label: "key, reports", kind: "control" },
      { from: "control",   to: "beehost",   label: "nodes, list", kind: "control" }
    ]
  },

  stage: {
    // One straight line in the order the video moves. The engine is one box
    // because it is one pluggable part, whatever runs inside it. The stream
    // manager calls are drawn in the control diagram, where they land on the
    // stream manager itself rather than on the closed control host.
    name: "Stage host", level: "Components", parent: "containers", of: "stagehost", w: 1100, h: 500,
    groups: [
      { name: "Stage host", x: 284, y: 180, w: 532, h: 180, hint: "One stack deployment per stage." }
    ],
    nodes: [
      { id: "engine",   x: 300, y: 200, w: 220, h: 140 },
      { id: "uploader", x: 580, y: 200, w: 220, h: 140 },
      { id: "encoder",  x: 30,  y: 200, w: 200, h: 140 },
      { id: "beehost",  x: 870, y: 200, w: 200, h: 140 }
    ],
    edges: [
      { from: "encoder",  to: "engine",   label: "SRT or RTMP", strong: true },
      { from: "engine",   to: "uploader", label: "segments", strong: true },
      { from: "uploader", to: "beehost",  label: "stamped", strong: true }
    ]
  },

  beehost: {
    // The level nodes carry video, the catalog node carries the list. They
    // share the machine and nothing else, so each takes its own column and
    // neither one's arrow to Swarm passes the other's card.
    name: "Bee clients", level: "Components", parent: "containers", of: "beehost", w: 1150, h: 520,
    nodes: [
      { id: "levelnodes",  x: 300, y: 60,  w: 220, h: 150 },
      { id: "catalognode", x: 570, y: 300, w: 220, h: 150 },
      { id: "stagehost",   x: 30,  y: 60,  w: 220, h: 140 },
      { id: "control",     x: 30,  y: 300, w: 220, h: 140 },
      { id: "swarm",       x: 870, y: 180, w: 220, h: 150 }
    ],
    edges: [
      { from: "stagehost",   to: "levelnodes",  label: "segments", strong: true },
      { from: "levelnodes",  to: "swarm",       label: "chunks, feeds", strong: true },
      { from: "control",     to: "levelnodes",  label: "deploys", kind: "control" },
      { from: "control",     to: "catalognode", label: "stream list", kind: "control" },
      { from: "catalognode", to: "swarm",       label: "list feed", kind: "media" }
    ]
  },

  access: {
    // Four ways from Swarm into the client, side by side, so the open box is
    // no taller than the stack's other rows and a slide can frame it with
    // Swarm below and the client beside it at a readable size.
    name: "Swarm access", level: "Components", parent: "containers", of: "access", w: 1670, h: 480,
    nodes: [
      { id: "freedom", x: 300,  y: 60,  w: 220, h: 140 },
      { id: "ownbee",  x: 570,  y: 60,  w: 220, h: 140 },
      { id: "weeb3",   x: 840,  y: 60,  w: 220, h: 140 },
      { id: "gateway", x: 1110, y: 60,  w: 220, h: 140 },
      { id: "swarm",   x: 30,   y: 280, w: 220, h: 140 },
      { id: "client",  x: 1410, y: 60,  w: 220, h: 140 }
    ],
    edges: [
      { from: "swarm",   to: "gateway", label: "segments", strong: true },
      { from: "swarm",   to: "weeb3",   label: "chunks", strong: true },
      { from: "swarm",   to: "ownbee",  label: "chunks", strong: true },
      { from: "swarm",   to: "freedom", label: "chunks", strong: true },
      { from: "gateway", to: "client",  label: "HTTP", strong: true },
      { from: "weeb3",   to: "client",  label: "own player", strong: true },
      { from: "ownbee",  to: "client",  label: "HTTP", strong: true },
      { from: "freedom", to: "client",  label: "bzz", strong: true }
    ]
  },

  chat: {
    // The library runs in the client and the aggregator on the gateway
    // server, and Swarm sits between them: messages go into a shared inbox
    // and come back out as each stream's chat feed.
    name: "Chat", level: "Components", parent: "containers", of: "chat", w: 860, h: 480,
    nodes: [
      { id: "chatlib",    x: 300, y: 60,  w: 220, h: 140 },
      { id: "aggregator", x: 300, y: 280, w: 220, h: 140 },
      { id: "client",     x: 30,  y: 60,  w: 220, h: 140 },
      { id: "swarm",      x: 600, y: 170, w: 220, h: 140 }
    ],
    edges: [
      { from: "client",     to: "chatlib",    label: "messages", kind: "media" },
      { from: "chatlib",    to: "aggregator", label: "via inbox", kind: "media" },
      { from: "aggregator", to: "swarm",      label: "chat feed", kind: "media" },
      { from: "swarm",      to: "chatlib",    label: "reads feed", kind: "media" }
    ]
  },

  identity: {
    // The guest key the browser keeps, which signs a viewer's chat messages.
    name: "Identity", level: "Components", parent: "containers", of: "identity", w: 860, h: 480,
    nodes: [
      { id: "tempid",  x: 300, y: 170, w: 220, h: 140 },
      { id: "client",  x: 600, y: 170, w: 220, h: 140 }
    ],
    edges: [
      { from: "tempid",  to: "client", label: "guest key", kind: "control" }
    ]
  },

  control: {
    // The proxy in front and the two consoles behind it, both operators
    // reaching it over HTTPS, the stream infra
    // manager on top so its deploy arrows leave level. Of the four arrows to
    // the stage host and the Bee host, the infra manager's to the Bee host
    // and the stage host's to the stream manager cross once: all four exist,
    // and no placement of four cards draws a closed loop of four without one
    // crossing.
    name: "Control host", level: "Components", parent: "containers", of: "control", w: 1100, h: 480,
    nodes: [
      { id: "proxy",     x: 300, y: 60,  w: 220, h: 140 },
      { id: "manager",   x: 570, y: 60,  w: 220, h: 140 },
      { id: "admin",     x: 570, y: 280, w: 220, h: 140 },
      { id: "operator",  x: 30,  y: 60,  w: 220, h: 140 },
      { id: "infraop",   x: 30,  y: 280, w: 220, h: 140 },
      { id: "stagehost", x: 840, y: 60,  w: 220, h: 140 },
      { id: "beehost",   x: 840, y: 280, w: 220, h: 140 }
    ],
    edges: [
      { from: "operator",  to: "proxy",     label: "HTTPS", kind: "control" },
      { from: "infraop",   to: "proxy",     label: "HTTPS", kind: "control" },
      { from: "proxy",     to: "manager",   label: "console", kind: "control" },
      { from: "proxy",     to: "admin",     label: "console", kind: "control" },
      { from: "manager",   to: "admin",     label: "stages", kind: "control" },
      { from: "manager",   to: "stagehost", label: "deploys", kind: "control" },
      { from: "manager",   to: "beehost",   label: "deploys", kind: "control" },
      { from: "stagehost", to: "admin",     label: "key, reports", kind: "control" },
      { from: "admin",     to: "beehost",   label: "stream list", kind: "control" }
    ]
  }
};

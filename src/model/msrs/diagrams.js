/* Diagrams for MSRS.
 *
 * Same grid rules as the V4 model. The top row is the media path in the
 * order a segment moves: encoder, ingestion server, gateway, client, viewer.
 * Swarm sits under the gateway, which both writes and reads it, and the
 * aggregators sit beside Swarm, under the client whose chat they carry, so
 * no line crosses another.
 */

export const MSRS_DIAGRAMS = {
  context: {
    name: "MSRS", level: "Context", parent: null, w: 1100, h: 660,
    nodes: [
      { id: "encoder",  x: 20,  y: 100, w: 215, h: 140 },
      { id: "platform", x: 420, y: 80,  w: 270, h: 185 },
      { id: "swarm",    x: 435, y: 420, w: 240, h: 150 },
      { id: "viewers",  x: 820, y: 100, w: 240, h: 140 }
    ],
    edges: [
      { from: "encoder",  to: "platform", label: "RTMP", strong: true },
      { from: "platform", to: "swarm",    label: "writes, reads", strong: true },
      { from: "platform", to: "viewers",  label: "plays", strong: true }
    ]
  },

  containers: {
    name: "MSRS instance", level: "Containers", parent: "context", of: "platform", w: 1400, h: 680,
    nodes: [
      { id: "ingest",   x: 300,  y: 60,  w: 230, h: 150 },
      { id: "gateway",  x: 570,  y: 60,  w: 230, h: 150 },
      { id: "client",   x: 840,  y: 60,  w: 230, h: 150 },
      { id: "aggs",     x: 840,  y: 500, w: 230, h: 150 },
      { id: "encoder",  x: 30,   y: 60,  w: 200, h: 140 },
      { id: "swarm",    x: 570,  y: 500, w: 230, h: 150 },
      { id: "viewers",  x: 1130, y: 60,  w: 220, h: 140 }
    ],
    edges: [
      { from: "encoder", to: "ingest",  label: "RTMP", strong: true },
      { from: "ingest",  to: "gateway", label: "segments", strong: true },
      { from: "gateway", to: "swarm",   label: "stamped, reads", strong: true },
      { from: "gateway", to: "client",  label: "app, segments", strong: true },
      { from: "client",  to: "viewers", label: "playback", strong: true },
      { from: "aggs",    to: "swarm",   label: "GSOC, feeds", kind: "media" },
      { from: "client",  to: "aggs",    label: "chat", kind: "media" }
    ]
  },

  aggs: {
    // The stream aggregator hears the ingestion server, the chat aggregator
    // hears the client, and both write their feeds to Swarm.
    name: "Aggregators", level: "Components", parent: "containers", of: "aggs", w: 900, h: 480,
    nodes: [
      { id: "streamagg", x: 300, y: 60,  w: 220, h: 140 },
      { id: "chatagg",   x: 300, y: 280, w: 220, h: 140 },
      { id: "ingest",    x: 30,  y: 60,  w: 220, h: 140 },
      { id: "client",    x: 30,  y: 280, w: 220, h: 140 },
      { id: "swarm",     x: 600, y: 170, w: 220, h: 140 }
    ],
    edges: [
      { from: "ingest",    to: "streamagg", label: "start, stop", kind: "control" },
      { from: "client",    to: "chatagg",   label: "messages", kind: "media" },
      { from: "streamagg", to: "swarm",     label: "stream list", kind: "media" },
      { from: "chatagg",   to: "swarm",     label: "chat feeds", kind: "media" }
    ]
  }
};

/**
 * One pass over the V4 stack as built, in the order a segment moves through
 * it, then the parts beside the path.
 *
 * Each step declares the exact set of boxes it wants open, so a step can
 * close what the last one opened rather than only ever accumulating.
 */

export const V4_TOUR = {
  name: "V4 as built, in seven steps",
  about: "The stack as deployed in October 2026: a pluggable stream engine, 4 quality levels, one Bee node per level, and a client that reads from Swarm.",
  steps: [
    {
      title: "Overview",
      text: "An encoder publishes SRT or RTMP to a stage host. The stack transcodes the feed into 4 quality levels and uploads every segment to Swarm. Viewers read from Swarm through the event gateway, another gateway, their own Bee node or an in-tab node, and in future through the Freedom browser. Tested at a scale of one stream.",
      open: [], focus: null,
    },
    {
      title: "The stream engine",
      text: "A pluggable engine ingests the feed, transcodes 4 quality levels from 1080p to 360p on a shared keyframe grid, and hands each segment to the uploader. This deployment runs a fork of SRS 6. On 2026-10-01 its encoder hold accepted 60 of 60 reconnects after drops of 0.3 to 70 s, where stock SRS accepted 0 of 10 after a 0.3 s drop, and its publisher takeover completed within 11 to 45 ms.",
      open: ["platform", "stagehost"], focus: ["engine"], light: ["engine", "uploader"], edge: "engine>uploader",
    },
    {
      title: "Per-level publishing",
      text: "A stamp is prepaid storage on Swarm, and every upload carries one. The uploader stamps each segment with its quality level's stamp, uploads it through that level's Bee node and updates the level's feed. 1080p consumes about 7 times the storage of 360p and exhausts its stamp first. When one level stops, the other 3 continue publishing.",
      open: ["platform", "stagehost", "beehost"], focus: ["uploader", "levelnodes"],
      light: ["uploader", "levelnodes"], edge: "uploader>beehost",
    },
    {
      title: "Swarm access",
      text: "The read path from Swarm into the client. The event gateway is the default: nginx with a response cache and a warmer that fetches each new segment once. Alternatives are another gateway, weeb-3, an in-tab Swarm node with its own player, and the viewer's own Bee node. Planned: the Freedom browser, whose integrated Swarm node loads the client and reads the stream with no gateway.",
      open: ["platform", "access"], focus: ["gateway", "weeb3", "ownbee", "freedom"],
      light: ["gateway", "weeb3", "ownbee", "freedom"], edge: "gateway>client",
    },
    {
      title: "The streaming client",
      text: "Any Swarm-connected client that reads the stream format can play the stream. The reference client, the event viewer, is served by the gateway server at the deployment's viewer domain. It is planned to be published to Swarm under an ENS name, loadable through an ENS gateway, a Swarm gateway or a local Bee node. It plays through hls.js with custom loaders and steps down one quality level after 8 s without a new segment.",
      open: ["platform"], focus: ["client"], light: ["client", "access"], edge: "access>client",
    },
    {
      title: "Chat and identity",
      text: "The chat library posts each message to a shared inbox on Swarm, and the aggregator writes each stream's chat feed. A viewer chats as a guest, with a key the browser keeps, and the event gateway stamps the messages.",
      open: ["platform", "chat", "identity"], focus: ["chatlib", "aggregator", "tempid"],
      light: ["chat", "chatlib", "aggregator", "identity", "tempid"], edge: "chatlib>aggregator",
    },
    {
      title: "Control plane",
      text: "The stream operator works in the stream manager, which issues stream keys and publishes the stream list. The infra operator works in the stream infra manager, which deploys the stack and maintains its nodes and stamps. An HTTPS proxy fronts both. None of these components handles segments. The uploader queries the stream manager on every new publish: with the control host down, streams already playing continue and new streams cannot start.",
      open: ["platform", "control"], focus: ["admin", "manager"], light: ["admin", "manager", "control"], edge: "stagehost>admin", overlay: "path",
    },
  ],
};

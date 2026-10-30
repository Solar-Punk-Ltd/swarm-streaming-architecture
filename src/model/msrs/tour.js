/**
 * MSRS's walkthroughs: the overview, and the story: publishing, the stream
 * list and the chat, then watching. The story's steps come in parts that each
 * keep one camera and one layout, the way the V4 model's story does.
 */

export const MSRS_TOUR = {
  name: "MSRS, in four steps",
  about: "The 2025 platform that ran one instance per brand, the successor of MSSD.",
  steps: [
    {
      title: "The whole system",
      text: "OBS pushes RTMP into an MSRS instance, which uploads the stream to Swarm and lists it. Viewers play it from Swarm through the instance's gateway.",
      open: [], focus: null,
    },
    {
      title: "Publishing",
      text: "The ingestion server takes RTMP, cuts HLS segments and uploads them through the gateway node, whose Bee nodes write them to Swarm with the stream's stamp.",
      open: ["platform"], focus: ["ingest", "gateway"], light: ["encoder", "ingest", "gateway"], edge: "ingest>gateway",
    },
    {
      title: "Listing and chat",
      text: "The stream aggregator hears each stream start and stop over GSOC and writes the stream list. The chat aggregator writes each stream's chat feed.",
      open: ["platform", "aggs"], focus: ["streamagg", "chatagg"], light: ["streamagg", "chatagg"], edge: "streamagg>swarm",
    },
    {
      title: "Watching",
      text: "The streaming client loads from Swarm, reads the stream list and plays the segments through hls.js and the gateway.",
      open: ["platform"], focus: ["client"], light: ["gateway", "client", "viewers"], edge: "gateway>client",
    },
  ],
};

export const MSRS_SCENARIOS = [
  {
    id: "talk",
    label: "The story",
    name: "The story: MSRS, publishing, listing, watching",
    about: "MSRS step by step, in parts that each keep one camera and one layout.",
    // The same picture rules as the V4 story. The gateway's line to Swarm
    // stands for both its writes and its reads.
    slides: {
      arrowheads: false,
      fadedNames: true,
      labels: false,
      tintBoxes: true,
      cards: {
        platform: "Ingests, uploads and lists every stream, for one brand.",
        encoder: "The streamer sends RTMP.",
        ingest: "Cuts the stream into HLS segments.",
        gateway: "Our Bee nodes. Upload with the stream's stamp, serve every read.",
        streamagg: "GSOC in, the stream list out.",
        chatagg: "GSOC in, the chat out.",
        client: "Loaded from Swarm. hls.js through the gateway.",
      },
    },
    steps: [
      {
        title: "The whole system",
        text: "OBS pushes RTMP into an MSRS instance, which uploads the stream to Swarm and lists it, and viewers play it from Swarm.",
        part: "all", open: [], focus: null,
      },
      {
        title: "Inside an MSRS instance",
        text: "Opened, the instance shows the ingestion server, the gateway node, the streaming client and the aggregators.",
        part: "open", open: ["platform"], focus: ["platform"],
      },
      {
        title: "OBS sends RTMP",
        text: "The streamer uses OBS and pushes RTMP to the ingestion server, just like to Twitch.",
        part: "publish", layoutOpen: ["platform"], open: ["platform"],
        focus: ["encoder", "ingest", "gateway", "swarm"], light: ["encoder", "ingest"], edge: "encoder>ingest",
      },
      {
        title: "Cut into HLS segments",
        text: "The ingestion server turns the stream into HLS segments and hands each one to the gateway.",
        part: "publish", layoutOpen: ["platform"], open: ["platform"],
        focus: ["encoder", "ingest", "gateway", "swarm"], light: ["ingest", "gateway"], edge: "ingest>gateway",
      },
      {
        title: "Uploaded through our gateway",
        text: "A gateway node of ours uploads each segment to Swarm with the stream's stamp.",
        part: "publish", layoutOpen: ["platform"], open: ["platform"],
        focus: ["encoder", "ingest", "gateway", "swarm"], light: ["gateway", "swarm"], edge: "gateway>swarm",
      },
      {
        title: "The aggregators",
        text: "Aggregators built on GSOC keep the stream list and the chat: the stream aggregator hears each start and stop, the chat aggregator each message, and both write feeds to Swarm.",
        part: "lists", layoutOpen: ["platform", "aggs"], open: ["platform", "aggs"],
        focus: ["aggs", "swarm"], light: ["streamagg", "chatagg", "swarm"], edge: "streamagg>swarm",
      },
      {
        title: "The app from Swarm",
        text: "The viewer's browser loads the app itself from Swarm, through the gateway, not from a web server.",
        part: "watch", layoutOpen: ["platform"], open: ["platform"],
        focus: ["swarm", "gateway", "client", "viewers"], light: ["swarm", "gateway", "client"], edge: "gateway>client",
      },
      {
        title: "Playing through the gateway",
        text: "The player, hls.js with a custom loader, fetches the segments through the gateway and plays them for the viewer.",
        part: "watch", layoutOpen: ["platform"], open: ["platform"],
        focus: ["swarm", "gateway", "client", "viewers"], light: ["gateway", "client", "viewers"], edge: "client>viewers",
      },
    ],
  },
];

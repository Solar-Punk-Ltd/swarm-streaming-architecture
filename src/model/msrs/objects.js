/* Objects: MSRS, the 2025 platform that ran one instance per brand, and the
   successor of MSSD. Read from its components' code and READMEs.

   Text follows the V4 model's rules: present tense, declarative, one
   responsibility per sentence. "Viewers" are people.

   `scale` is required on every object and checked by the schema. See
   ../scale.js for what the two enums mean. */

import { GROWS, RESILIENCE } from '../scale.js';

export const MSRS_OBJECTS = {
  /* ── Context ── */
  encoder: { name: "Broadcaster's encoder", type: "External actor", icon: "stream", external: true,
    tech: ["OBS", "RTMP"],
    desc: "OBS pushes RTMP, the way a streamer pushes to Twitch.",
    scale: { count: "1", unit: "one encoder per stream", grows: GROWS.STAGES, resilience: RESILIENCE.EXTERNAL,
      onLoss: "The stream stops. Segments already uploaded stay on Swarm." },
    blurb: "Publishes RTMP to the ingestion server with an encrypted token that carries the streamer's credentials." },

  platform: { name: "MSRS instance", type: "Software system", icon: "system", drill: "containers",
    tech: ["Swarm", "HLS", "GSOC"],
    desc: "Ingests a stream, uploads it to Swarm and lists it, with chat, for one brand.",
    scale: { count: "1", unit: "one instance per brand", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "New streams cannot start. Segments already on Swarm remain retrievable through any gateway." },
    blurb: "One deployment per brand: the ingestion server, a gateway of Bee nodes, the stream and chat aggregators, and the streaming client. MSSD, its predecessor, took SRT through SRS and announced streams through GSOC. MSRS added identity, stamp management and permissions, and ran one instance per brand.",
    metrics: [["Predecessor", "MSSD", ""]] },

  swarm: { name: "Swarm network", type: "External system", icon: "swarm", external: true,
    tech: ["Bee", "feeds", "GSOC"],
    desc: "Stores the segments, the playlists, the app, the stream list and the chat.",
    scale: { count: "many", unit: "independent nodes", grows: GROWS.COVERAGE, resilience: RESILIENCE.EXTERNAL,
      onLoss: "No single point of failure. Chunks are distributed across nodes by address." },
    blurb: "Segments are stored as content-addressed data, and each playlist names them by hash. The live playlist is a feed. GSOC, a single owner chunk anyone can write into, carries the messages the aggregators read. When a stream ends its playlist becomes the recording." },

  viewers: { name: "Viewers", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "People watching in a desktop or mobile browser.",
    scale: { count: "any", unit: "concurrent viewers", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "Open the brand's streaming client, pick a stream from the list, watch and chat." },

  /* ── Containers ── */
  ingest: { name: "Ingestion server", type: "Container", icon: "server",
    tech: ["node-media-server", "HLS"],
    desc: "Takes RTMP, cuts HLS segments and uploads them through the gateway.",
    scale: { count: "1", unit: "one server per instance", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "No stream can go live on the instance." },
    blurb: "Checks the streamer's token, turns RTMP into HLS segments with node-media-server, uploads each new segment to Swarm through the gateway, keeps the live and the recording playlists, and announces the stream's start and stop over GSOC." },

  gateway: { name: "Gateway node", type: "Container", icon: "gateway", shape: "cylinder",
    tech: ["Bee", "nginx"],
    desc: "Bee nodes behind nginx: they write with the stream's stamp and serve every read.",
    scale: { count: "1", unit: "one gateway per instance", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "Uploads stop and viewers lose their way into Swarm." },
    blurb: "Our Bee nodes behind nginx. They upload the segments with the stream's stamp, coupled to the instance's stamp pool, and serve the app, the playlists and the segments to every viewer." },

  aggs: { name: "Aggregators", type: "Container", icon: "queue", drill: "aggs",
    tech: ["GSOC", "feeds"],
    desc: "Read GSOC messages and write the stream list and the chat as feeds.",
    scale: { count: "2", unit: "stream and chat aggregator per instance", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "New streams are not listed and chat stops. Playback continues." },
    blurb: "Two services built on GSOC: the stream aggregator keeps the stream list, and the chat aggregator keeps each stream's chat." },

  client: { name: "Streaming client", type: "Container", icon: "player",
    tech: ["React", "hls.js"],
    desc: "The app, loaded from Swarm, playing through hls.js and the gateway.",
    scale: { count: "any", unit: "one instance per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "A React app served from Swarm through an ENS name. It reads the stream list, plays through hls.js with a custom loader through the gateway, and posts chat messages. Viewers get an ephemeral wallet, streamers sign in with password-encrypted credentials." },

  /* ── Components: the aggregators ── */
  streamagg: { name: "Stream aggregator", type: "Component", icon: "layers",
    tech: ["GSOC", "feeds"],
    desc: "Hears each stream start and stop, and writes the stream list.",
    scale: { count: "1", unit: "one per instance", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "New streams are not listed. Playing streams continue." },
    blurb: "Validates each token-authenticated GSOC message and keeps one authoritative stream list on a Swarm feed." },

  chatagg: { name: "Chat aggregator", type: "Component", icon: "chat",
    tech: ["GSOC", "feeds"],
    desc: "Reads chat messages from GSOC and writes each stream's chat feed.",
    scale: { count: "1", unit: "one per instance", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "Chat stops updating. Playback continues." },
    blurb: "Collects the messages viewers post into a shared GSOC chunk and writes them to the stream's chat feed, which every client reads." },
};

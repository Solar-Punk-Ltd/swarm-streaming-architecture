/* Objects: one entry per thing in the V4 streaming stack as it runs in
   October 2026, read from the stack's architecture docs and READMEs. A model
   of its own rather than a revision of the earlier generations' models.

   Every `scale.count` is read at the operating point the stack has been
   tested at: one stage, one stream, the 4 quality level ladder. The fault
   results in the metrics are single-stream results, and only those the
   current code still produces: a number measured under a rule the code has
   since changed is left out rather than kept with its date.

   Text is written as a specification: present tense, declarative, one
   responsibility per sentence. "Viewers" are people. "Streaming client" is
   the application they watch in.

   `scale` is required on every object and checked by the schema. See
   ../scale.js for what the two enums mean and why they are not prose. */

import { GROWS, RESILIENCE } from '../scale.js';

export const V4_OBJECTS = {
  /* ── Context ── */
  encoder: { name: "Broadcaster's encoder", type: "External actor", icon: "stream", external: true,
    tech: ["SRT", "RTMP"],
    desc: "SRT or RTMP sources such as OBS, ffmpeg or a hardware encoder.",
    scale: { count: "1", unit: "one encoder per stage", grows: GROWS.STAGES, resilience: RESILIENCE.EXTERNAL,
      onLoss: "Ingest for the stage stops. On an ABR stage the engine holds its encoders for about 12 s, so an encoder that reconnects within that window continues the same stream." },
    blurb: "Publishes one feed per stage to the stage's ingest port, authenticated by the stream key the stream manager issues. SRT is the default protocol. An SRS stage also accepts RTMP, which is unencrypted.",
    metrics: [["Protocols", "SRT, RTMP", ""], ["Feeds per stage", "1", ""]] },

  operator: { name: "Stream operator", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "Creates streams, assigns them to stages and issues stream keys in the stream manager.",
    scale: { count: "1", unit: "one team per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.EXTERNAL,
      onLoss: "No effect on running streams." },
    blurb: "Manages streams, stage assignment, users, stream keys and OBS settings in the stream manager." },

  infraop: { name: "Infra operator", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "Deploys stages and Bee nodes and maintains their stamps in the stream infra manager.",
    scale: { count: "1", unit: "one team per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.EXTERNAL,
      onLoss: "No effect on running streams." },
    blurb: "Deploys stack versions and Bee node pools to hosts, starts and stops stages, maintains each node's storage and stamps, and designates the catalog node's stamp in the stream infra manager." },

  platform: { name: "Streaming stack", type: "Software system", icon: "system", drill: "containers",
    tech: ["Swarm", "HLS"],
    desc: "Ingests a live feed, transcodes it into 4 quality levels, packages HLS segments and playlists, stamps and uploads them to Swarm, and plays them in the streaming client.",
    scale: { count: "1", unit: "one stack per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.SINGLE,
      onLoss: "New streams cannot start. Segments already on Swarm remain retrievable through any Swarm access." },
    blurb: "The stream engine on the stage host ingests the feed and encodes 4 quality levels. The stream uploader writes every segment to Swarm through one Bee node per quality level. The streaming client reads the stream back from Swarm through the Swarm access the viewer selects. The control host is outside the media path.",
    metrics: [["Quality levels", "4", ""], ["Segment duration", "configured per stage", ""], ["Bee nodes per stage", "4, one per quality level", ""], ["Tested scale", "1 stream", ""]] },

  swarm: { name: "Swarm network", type: "External system", icon: "swarm", external: true,
    tech: ["Bee", "feeds"],
    desc: "Stores every segment, playlist and feed, the stream list and the chat.",
    scale: { count: "many", unit: "independent nodes", grows: GROWS.COVERAGE, resilience: RESILIENCE.EXTERNAL,
      onLoss: "No single point of failure. Chunks are distributed across nodes by address." },
    blurb: "Segments are stored as content-addressed data, and each playlist references them by hash. Each quality level's playlist is published as a feed, a mutable pointer signed by a single key. A master feed lists the live quality levels. Chat messages pass through a shared inbox and are stored in each stream's chat feed. Every upload carries a postage stamp, which is prepaid storage, and content remains retrievable until its stamp expires.",
    metrics: [["Feeds per stream", "5: 4 quality levels and the master", ""], ["Retention", "until the stamp expires", ""]] },

  viewers: { name: "Viewers", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "People watching in a desktop or mobile browser.",
    scale: { count: "any", unit: "concurrent viewers", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "Open the streaming client, select a stream from the stream list and play it through the Swarm access of their choice." },

  /* ── Containers ── */
  stagehost: { name: "Stage host", type: "Container", icon: "server", drill: "stage",
    tech: ["stream engine", "uploader"],
    desc: "Runs ingest, encoding and upload for one stage.",
    scale: { count: "1", unit: "one deployment per stage", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "The stage is off air until redeployed. Other stages are unaffected." },
    blurb: "One stack deployment per stage, comprising the stream engine and the stream uploader, on one port slot of a Linux host running Docker. The stream infra manager deploys it to any host.",
    metrics: [["Deployments per stage", "1", ""], ["Quality levels", "4", ""], ["Segment duration", "configured per stage", ""]] },

  beehost: { name: "Bee clients", type: "Container", icon: "swarm", shape: "cylinder", drill: "beehost",
    tech: ["Bee"],
    desc: "Stock Bee clients that handle the Swarm operations during streaming: one node per quality level and the catalog node.",
    scale: { count: "1", unit: "one node pool per stage", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "Publishing for the stage stops. Chunks already pushed remain on Swarm." },
    blurb: "Stock Bee nodes on one host: the nodes the uploader publishes through, one per quality level with its own stamp, and the catalog node the stream manager writes the stream list through. The stream infra manager deploys and maintains them. Node APIs are not exposed to the internet. Only peer ports are public." },

  access: { name: "Swarm access", type: "Container", icon: "net", drill: "access",
    tech: ["Bee", "weeb-3", "Freedom"],
    desc: "The read path from Swarm to the client: event gateway, another gateway, weeb-3, the viewer's own Bee node or the Freedom browser.",
    scale: { count: "5", unit: "access types, selected per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.SINGLE,
      onLoss: "Viewers on the failed access stop. Viewers on another access continue." },
    blurb: "Every path from Swarm into the streaming client. The event gateway is the default. A viewer can add another gateway, their own Bee node or weeb-3, each validated before use, and assign a source per function: video, stream list and chat. The source changes only on the viewer's selection. Planned: the Freedom browser, whose integrated Swarm node serves the client loaded in it.",
    metrics: [["Default", "event gateway", ""], ["Alternatives", "another gateway, own Bee node, weeb-3", ""], ["Planned", "Freedom browser", ""]] },

  client: { name: "Streaming client", type: "Container", icon: "player",
    tech: ["hls.js", "Swarm"],
    desc: "Any Swarm-connected client that reads the stream format.",
    scale: { count: "any", unit: "one instance per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "Reads the stream list feed, the playlist feed of the selected quality level, the segments that playlist references, and the 10 s time markers. The reference client is the event viewer, stream-event-client: a static page in an nginx container on the gateway server, served by the gateway's nginx at the deployment's viewer domain. Planned: the client is published to Swarm under an ENS name, so it loads through an ENS gateway, a Swarm gateway or a local Bee node. It plays through hls.js with custom loaders, builds the master playlist from the stream list instead of reading the master feed, and steps down one quality level after 8 s without a new segment. With weeb-3 selected as the video source, weeb-3's own player replaces hls.js.",
    metrics: [["Hosting", "gateway server, viewer domain", ""], ["Hosting, planned", "Swarm under ENS: ENS gateway, Swarm gateway or local Bee node", ""], ["Stream list poll", "60 s, while browsing and before a stream starts", ""], ["Step-down trigger", "8 s without a new segment", ""], ["Reads the master feed", "no", ""]] },

  chat: { name: "Chat", type: "Container", icon: "chat", shape: "stack", drill: "chat",
    tech: ["swarm-chat-js"],
    desc: "Per-stream chat, published to Swarm as a feed.",
    scale: { count: "1", unit: "one chat per stream", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "Chat stops updating. Video playback is unaffected." },
    blurb: "The chat library in the client posts each message to a shared inbox on Swarm. The chat aggregator reads the inbox and writes each stream's chat feed, which all clients read." },

  identity: { name: "Identity", type: "Container", icon: "shield", drill: "identity",
    tech: ["guest key"],
    desc: "The viewer's chat identity: a guest key kept in the browser.",
    scale: { count: "any", unit: "one identity per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "A viewer chats as a guest, with a key the browser keeps. The key signs the viewer's messages, and the event gateway stamps them." },

  control: { name: "Control host", type: "Container", icon: "server", drill: "control",
    tech: ["Caddy", "Postgres"],
    desc: "Stream management, infrastructure management, ingest and node health monitoring, and Swarm resource management.",
    scale: { count: "1", unit: "one control host per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.DEGRADED,
      onLoss: "Streams already playing continue. New publishes are rejected until recovery." },
    blurb: "Assigns streams to stages, tracks ownership, monitors ingest and node health in the stream infra manager, and maintains the Bee nodes and their stamps. A deployment can also run a Grafana, Prometheus and Loki host. It never handles segments. The uploader queries the stream manager on every new publish and reports to it during a broadcast.",
    metrics: [["Handles segments", "no", ""], ["Queried on every publish", "yes", ""]] },

  /* ── Stage host components ── */
  engine: { name: "Stream engine", type: "Component", icon: "layers",
    tech: ["SRS fork", "ffmpeg"],
    desc: "Pluggable ingest and transcoding. Hands each segment to the uploader. SRS in this deployment.",
    scale: { count: "1", unit: "one engine per stage", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "Ingest for the stage stops and nothing is published." },
    blurb: "A pluggable component: the stack supports SRS and OvenMediaEngine, and this deployment runs a fork of SRS 6. It ingests the feed, transcodes 4 quality levels with one ffmpeg process each on a shared keyframe grid, segments them into HLS, writes each closed segment to a volume shared with the uploader, and announces it on the uploader's webhook. The fork adds an encoder hold, which keeps the ladder's encoders for about 12 s across a broadcaster reconnect, and publisher takeover, which lets a new encoder with a valid key replace the live one. SRS restarts a stalled encoder.",
    metrics: [["Quality levels", "1080p, 720p, 480p, 360p", ""], ["Bitrates", "5000, 2800, 1200, 700 kbps", ""], ["Segment duration", "per stage: 2 s default, 1 s ruled for the 4-level ladder", ""], ["Reconnect after a 0.3 s drop, stock SRS", "0 of 10 accepted", ""], ["Reconnect, SRS fork with hold", "60 of 60, drops of 0.3 to 70 s", ""], ["Takeover", "30 of 30, within 11 to 45 ms", ""]],
    note: "With 0.5 s segments the 1080p level failed 2 minutes into every broadcast: SRS announced about 6.7 segments per second against the 8 that 4 levels require. The ladder requires 1 s segments or longer. The fork also carries two upstream fixes: a new RTMP source dropped before start by stock SRS 6, and a crash on a malformed H.264 header." },

  uploader: { name: "Stream uploader", type: "Component", icon: "upload",
    tech: ["Bee API", "feeds"],
    desc: "Receives segment announcements, writes the playlists, and publishes both to Swarm through the Bee nodes.",
    scale: { count: "1", unit: "one uploader per stage", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "Publishing for the stage stops. Segments closed during the outage are lost and recorded as gaps. Publishing resumes after restart." },
    blurb: "Runs in admin mode in this deployment. On publish, resolves the stream from the stream manager and validates its key. For each announced segment: reads it from the shared volume, stamps it with the quality level's stamp, uploads it through that level's Bee node, rewrites the level's playlist and updates the level's feed. Maintains the master feed of live quality levels and removes a level that stops. Writes a time marker every 10 s naming each level's latest playlist. Reports renditions and live and ended state to the stream manager.",
    metrics: [["Per segment", "stamp, upload, playlist, feed update", ""], ["Time marker interval", "10 s", ""], ["Restart", "resumes publishing", ""]] },

  /* ── Bee host components ── */
  levelnodes: { name: "Quality level nodes", type: "Component", icon: "swarm", shape: "cylinder",
    tech: ["Bee", "own stamp"],
    desc: "One Bee node per quality level, each with a dedicated stamp.",
    scale: { count: "4", unit: "one node per quality level", grows: GROWS.STAGES, resilience: RESILIENCE.SINGLE,
      onLoss: "That quality level stops and viewers step down. Losing the 360p node also stops the master feed and the time markers, which have no fallback." },
    blurb: "Isolates stamp usage per quality level. 1080p consumes about 7 times the storage of 360p and exhausts its stamp first. When one level's stamp runs out, the other 3 continue. The 360p node is the coordinator: the master feed and the time markers are written through it.",
    metrics: [["Nodes", "4, one per quality level", ""], ["Coordinator", "360p node", ""], ["Node frozen", "0 segments lost", ""], ["Level stamp exhausted", "0 playback stops", ""]] },

  catalognode: { name: "Catalog node", type: "Component", icon: "swarm", shape: "cylinder",
    tech: ["Bee", "own stamp"],
    desc: "Writes the stream list feed, signed with the brand key, on a dedicated stamp.",
    scale: { count: "1", unit: "one node per brand", grows: GROWS.BRANDS, resilience: RESILIENCE.SINGLE,
      onLoss: "The stream list stops updating. Listed streams continue to play." },
    blurb: "The stream list is a feed of every stage's streams with titles and thumbnails, signed with the brand key held only by the stream manager and written only through this node. It uses a dedicated immutable stamp, never shared with a quality level and designated by the stream infra manager. The stream manager rejects publishing once that stamp expires.",
    metrics: [["Stamp", "dedicated, immutable", ""], ["Stamp expired", "publishing rejected", ""]] },

  /* ── Swarm access components ── */
  gateway: { name: "Event gateway", type: "Component", icon: "gateway",
    tech: ["nginx", "Bee"],
    desc: "Default access: nginx, a segment warmer and 4 Bee nodes on a dedicated server.",
    scale: { count: "1", unit: "one gateway server per deployment", grows: GROWS.VIEWERS, resilience: RESILIENCE.SINGLE,
      onLoss: "Gateway viewers stall and the event viewer page is unreachable for new visitors. Uploads continue. Open sessions on their own Bee node or weeb-3 continue." },
    blurb: "Runs on a dedicated server. nginx terminates HTTPS, serves the event viewer at the viewer domain, permits on the stream domain only reads of the stack's feeds and segments and chat posts, and caches responses. The warmer reads the stream list every 10 s and fetches each new segment once to populate the cache. nginx reaches three Bee nodes: video, chat read, and chat write, which stamps every post the event pays for. A fourth node receives the chat inbox and serves the aggregator.",
    metrics: [["Bee nodes", "video, chat read, chat write, chat inbox", ""], ["Also serves", "the event viewer page", ""], ["Warmer interval", "10 s", ""], ["Segment cache", "6 h", ""], ["Gateway outage", "uploads continue", ""]],
  },

  weeb3: { name: "weeb-3", type: "Component", icon: "swarm",
    tech: ["Rust", "WebAssembly"],
    desc: "A Swarm node running in the browser tab, with its own player.",
    scale: { count: "any", unit: "one node per viewer who selects it", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Video stops for that viewer. There is no automatic fallback to another source." },
    blurb: "A full Swarm node running in a shared worker in the browser tab. The client uses it for two functions: video playback in weeb-3's own player instead of hls.js, and sending chat messages on the viewer's own stamp. Its player runs about 16 s behind live and does not switch away from a stopped quality level.",
    metrics: [["Player", "weeb-3 built-in", ""], ["Latency behind live", "about 16 s", ""], ["Supported browsers", "desktop and Android, not iOS Safari", ""], ["Status", "experimental", ""]],
    note: "iOS Safari is not supported. iOS plays HLS natively, which bypasses JavaScript loaders." },

  ownbee: { name: "Own Bee node", type: "External system", icon: "swarm", shape: "cylinder", external: true,
    tech: ["Bee"],
    desc: "A viewer-operated Bee node, accessed over HTTP.",
    scale: { count: "any", unit: "one per viewer who operates one", grows: GROWS.VIEWERS, resilience: RESILIENCE.EXTERNAL,
      onLoss: "Affects that viewer only." },
    blurb: "Any Bee node the viewer operates, added in the client as a source. Serves video, the stream list and chat, and sends chat messages on the viewer's own stamp." },

  freedom: { name: "Freedom browser", type: "External system", icon: "browser", external: true,
    tech: ["Bee", "ENS"],
    desc: "A browser with an integrated Swarm node that resolves ENS names.",
    scale: { count: "any", unit: "one per viewer who uses it", grows: GROWS.VIEWERS, resilience: RESILIENCE.EXTERNAL,
      onLoss: "Affects that viewer only." },
    blurb: "A desktop browser for macOS, Linux and Windows that ships an integrated Swarm node and resolves bzz:// addresses and ENS names in the address bar. Planned as a Swarm access: the client, published to Swarm under an ENS name, loads and reads the stream through the browser's own node, with no gateway.",
    metrics: [["Platforms", "macOS, Linux, Windows", ""], ["Status", "planned", ""]] },

  /* ── Chat components ── */
  chatlib: { name: "Chat library", type: "Component", icon: "chat",
    tech: ["swarm-chat-js"],
    desc: "Client-side: reads the chat feed and posts messages to the inbox.",
    scale: { count: "any", unit: "one per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Chat is unavailable for that viewer." },
    blurb: "Reads each stream's chat feed through the source assigned to chat. Posts go through the event gateway, which stamps them." },

  aggregator: { name: "Chat aggregator", type: "Component", icon: "queue",
    tech: ["swarm-chat-aggregator-js"],
    desc: "Reads the shared inbox and writes each stream's chat feed.",
    scale: { count: "1", unit: "one aggregator per deployment, on the gateway server", grows: GROWS.FIXED, resilience: RESILIENCE.SINGLE,
      onLoss: "Chat stops updating. Video playback is unaffected." },
    blurb: "Reads the shared Swarm inbox through the gateway server's chat inbox node and writes messages into each stream's chat feed. It determines which messages the feed contains and their order." },

  /* ── Identity components ── */
  tempid: { name: "Guest ID", type: "Component", icon: "tag",
    tech: ["guest key"],
    desc: "A chat key stored in the browser, with a display name.",
    scale: { count: "any", unit: "one per guest", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "The default identity. The client generates a chat key, stores it in the browser's local storage until the viewer leaves the chat, and pairs it with a viewer-chosen display name. The event gateway stamps guest messages." },

  /* ── Control host components ── */
  admin: { name: "Stream manager", type: "Component", icon: "sliders",
    tech: ["web2-admin", "Postgres"],
    desc: "Stream management: streams, stages, users, stream keys and OBS settings.",
    scale: { count: "1", unit: "one per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.DEGRADED,
      onLoss: "Streams already playing continue. New publishes are rejected and the stream list stops updating." },
    blurb: "The brand console. Issues stream keys and OBS settings and publishes the stream list. Resolves the stream for each new publish on the uploader's request. During a broadcast, receives each quality level's rendition and returns the list the master feed is written from. Learns its stages from the stream infra manager and never connects to a host." },

  manager: { name: "Stream infra manager", type: "Component", icon: "wrench",
    tech: ["infra-manager", "ssh"],
    desc: "Full-stack management of the streaming infrastructure.",
    scale: { count: "1", unit: "one per deployment", grows: GROWS.FIXED, resilience: RESILIENCE.DEGRADED,
      onLoss: "Running stages continue. New deployments are unavailable, and once the catalog node's stamp expires every stream list write is rejected." },
    blurb: "Operator console and API. Deploys stack versions and Bee node pools to local or ssh hosts, creates single-rendition and ABR deployments, allocates port slots, maintains each node and its storage, designates the catalog node's stamp, and shows each stage's ingest health in its own console. Publishes the list of stages to the stream manager." },

  proxy: { name: "HTTPS proxy", type: "Component", icon: "lock",
    tech: ["Caddy"],
    desc: "Routes HTTPS traffic to the stream manager and the stream infra manager.",
    scale: { count: "1", unit: "one per control host", grows: GROWS.FIXED, resilience: RESILIENCE.DEGRADED,
      onLoss: "The consoles are unreachable externally. Streams are unaffected." },
    blurb: "A Caddy container on the control host. Obtains HTTPS certificates and fronts the stream manager and the stream infra manager, which listen on loopback only." }
};

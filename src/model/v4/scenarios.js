/**
 * Scenario walkthroughs for the V4 stack: one per thing a person does with
 * it, each following that person's request through the boxes it touches.
 *
 * Same step shape as the overview walkthrough. Every claim here is one the
 * object cards already make, so a scenario never says more than the model.
 */

export const V4_SCENARIOS = [
  {
    id: "golive",
    label: "Going live",
    name: "Going live: from encoder to Swarm",
    about: "A broadcaster publishes a stream and every segment ends up on Swarm, with the stream listed for viewers.",
    steps: [
      {
        title: "A stream key",
        text: "The stream operator creates the stream in the stream manager and assigns it to a stage. The stream manager issues the stream key and the OBS settings the broadcaster uses.",
        open: ["platform", "control"], focus: ["admin"], light: ["operator", "proxy", "admin"], edge: "proxy>admin",
      },
      {
        title: "Publish",
        text: "The broadcaster's encoder publishes one feed to the stage's ingest port over SRT, the protocol the stream manager shows broadcasters, authenticated by the stream key. An SRS stage also accepts RTMP.",
        open: ["platform", "stagehost"], focus: ["encoder", "engine"], edge: "encoder>engine",
      },
      {
        title: "Key check",
        text: "On publish, the uploader resolves the stream from the stream manager and validates its key. With the control host down, this check fails and the new stream does not start.",
        open: ["platform", "control"], focus: ["admin"], light: ["stagehost", "admin"], edge: "stagehost>admin",
      },
      {
        title: "Transcode and package",
        text: "The stream engine transcodes 4 quality levels, 1080p to 360p, on a shared keyframe grid and cuts them into HLS segments. It writes each closed segment to a volume shared with the uploader and announces it on the uploader's webhook.",
        open: ["platform", "stagehost"], focus: ["engine", "uploader"], edge: "engine>uploader",
      },
      {
        title: "Stamp and upload",
        text: "For each segment the uploader stamps it with its quality level's stamp, uploads it through that level's Bee node, rewrites the level's playlist and updates the level's feed.",
        open: ["platform", "stagehost", "beehost"], focus: ["uploader", "levelnodes"], light: ["uploader", "levelnodes"], edge: "uploader>beehost",
      },
      {
        title: "Feeds on Swarm",
        text: "The level nodes push the chunks to Swarm. The uploader keeps the master feed of live quality levels and writes a time marker every 10 s through the 360p node, which acts as coordinator.",
        open: ["platform", "beehost"], focus: ["levelnodes", "swarm"], edge: "levelnodes>swarm",
      },
      {
        title: "Listed for viewers",
        text: "The uploader reports the renditions and the live state to the stream manager, which writes the stream list feed through the catalog node, signed with the brand key. Viewers find the stream there.",
        open: ["platform", "beehost"], focus: ["catalognode"], light: ["control", "catalognode", "swarm"], edge: "control>catalognode",
      },
    ],
  },
  {
    id: "streams",
    label: "Managing streams",
    name: "Managing streams in the stream manager",
    about: "The stream operator's work: streams, stages, keys and the stream list.",
    steps: [
      {
        title: "Sign in",
        text: "The stream operator opens the stream manager over HTTPS. The HTTPS proxy on the control host terminates the connection and routes it to the stream manager, which listens on loopback only.",
        open: ["platform", "control"], focus: ["operator", "proxy"], edge: "operator>proxy",
      },
      {
        title: "Stages come from infra",
        text: "The stream manager learns its stages from the stream infra manager and never connects to a host itself.",
        open: ["platform", "control"], focus: ["manager", "admin"], edge: "manager>admin",
      },
      {
        title: "Streams and keys",
        text: "The operator creates streams, assigns each to a stage, manages users and issues the stream key and OBS settings the broadcaster needs.",
        open: ["platform", "control"], focus: ["admin"], light: ["proxy", "admin"], edge: "proxy>admin",
      },
      {
        title: "During a broadcast",
        text: "The uploader queries the stream manager on every new publish. During the broadcast it reports each quality level's rendition and the live and ended state, and the stream manager returns the list the master feed is written from.",
        open: ["platform", "control"], focus: ["admin"], light: ["stagehost", "admin"], edge: "stagehost>admin",
      },
      {
        title: "The stream list",
        text: "The stream manager publishes the stream list, every stage's streams with titles and thumbnails, through the catalog node. Publishing is rejected once the stream manager's last stamp reading says the catalog node's stamp has expired.",
        open: ["platform", "control"], focus: ["admin", "beehost"], edge: "admin>beehost",
      },
      {
        title: "If it goes down",
        text: "With the stream manager down, streams already playing continue. New publishes are rejected and the stream list stops updating.",
        open: ["platform", "control"], focus: ["admin"], light: ["admin", "stagehost"], down: ["admin"], overlay: "path",
      },
    ],
  },
  {
    id: "infra",
    label: "Managing infra",
    name: "Managing infrastructure in the stream infra manager",
    about: "The infra operator's work: hosts, Bee nodes, stamps and stages.",
    steps: [
      {
        title: "Sign in",
        text: "The infra operator opens the stream infra manager over HTTPS, through the same HTTPS proxy, which routes it to the stream infra manager on loopback.",
        open: ["platform", "control"], focus: ["infraop", "proxy"], light: ["infraop", "proxy", "manager"], edge: "proxy>manager",
      },
      {
        title: "Bee nodes",
        text: "It deploys the Bee node pool to a local or ssh host: stock Bee clients, one per quality level, each with its own stamp, and the catalog node. Node APIs stay off the internet, only peer ports are public.",
        open: ["platform", "control"], focus: ["manager", "beehost"], edge: "manager>beehost",
      },
      {
        title: "Stamps",
        text: "It maintains each node's storage and stamps, and designates the catalog node's dedicated stamp. 1080p consumes about 7 times the storage of 360p and exhausts its stamp first. When one level's stamp runs out, the other 3 continue.",
        open: ["platform", "beehost"], focus: ["levelnodes", "catalognode"], light: ["control", "levelnodes", "catalognode"], edge: "control>levelnodes",
      },
      {
        title: "Stages",
        text: "It deploys a stack version per stage on a port slot of a host running Docker, as a single-rendition or an ABR deployment, and starts and stops it.",
        open: ["platform", "control"], focus: ["manager", "stagehost"], edge: "manager>stagehost",
      },
      {
        title: "Stages to the stream manager",
        text: "It publishes the list of stages to the stream manager, which is how the stream operator can assign streams to them. Ingest health stays in its own console.",
        open: ["platform", "control"], focus: ["manager", "admin"], edge: "manager>admin",
      },
      {
        title: "If it goes down",
        text: "With the stream infra manager down, running stages continue. New deployments are unavailable, and nobody tops up the catalog node's stamp, so once it expires every stream list write is rejected.",
        open: ["platform", "control"], focus: ["manager"], light: ["manager", "stagehost"], down: ["manager"], overlay: "path",
      },
    ],
  },
  {
    id: "watch",
    label: "Watching",
    name: "Watching the stream, viewer by viewer",
    about: "Four viewers on four Swarm accesses, and what each one sees.",
    steps: [
      {
        title: "Open the client",
        text: "A viewer opens the event viewer, the reference streaming client, at the deployment's viewer domain. It is planned to be published to Swarm under an ENS name.",
        open: ["platform"], focus: ["client", "viewers"], edge: "client>viewers",
      },
      {
        title: "Pick a stream",
        text: "While the viewer browses, the client reads the stream list feed every 60 s through the source assigned to the stream list, and the viewer selects a stream.",
        open: ["platform"], focus: ["access", "client"], edge: "access>client",
      },
      {
        title: "Viewer 1: the event gateway",
        text: "By default video comes through the event gateway. nginx serves the stack's feeds and segments from its cache, and the warmer has already fetched each new segment once.",
        open: ["platform", "access"], focus: ["gateway"], light: ["gateway", "client"], edge: "gateway>client",
      },
      {
        title: "Adaptive quality",
        text: "The client plays through hls.js and builds the master playlist from the stream list. By the client's rule, if the playing quality level delivers no new segment for 8 s, it steps down one level.",
        open: ["platform"], focus: ["client"], light: ["client"],
      },
      {
        title: "Viewer 2: their own Bee node",
        text: "A viewer who runs a Bee node adds it in the client as a source, and video, the stream list and chat come from it over HTTP, with no gateway.",
        open: ["platform", "access"], focus: ["ownbee"], light: ["ownbee", "client"], edge: "ownbee>client",
      },
      {
        title: "Viewer 3: weeb-3",
        text: "A viewer who selects weeb-3 runs a Swarm node in the browser tab. Its own player replaces hls.js, runs about 16 s behind live, as the client's weeb-3 notes document, and does not switch away from a stopped quality level. Desktop and Android only.",
        open: ["platform", "access"], focus: ["weeb3"], light: ["weeb3", "client"], edge: "weeb3>client",
      },
      {
        title: "Viewer 4: Freedom, planned",
        text: "Planned: a viewer in the Freedom browser loads the client from Swarm by its ENS name, and the browser's integrated Swarm node reads the stream.",
        open: ["platform", "access"], focus: ["freedom"], light: ["freedom", "client"], edge: "freedom>client",
      },
      {
        title: "If the gateway server goes down",
        text: "Gateway viewers stall and new visitors cannot load the event viewer. By design, viewers on their own Bee node or weeb-3 keep their video, though this has not been tested under a gateway outage. Chat stops for everyone, because the aggregator runs on the gateway server. The source changes only when the viewer selects another one.",
        open: ["platform", "access"], focus: ["gateway", "ownbee", "weeb3"], light: ["gateway", "ownbee", "weeb3"], down: ["gateway"],
      },
    ],
  },
  {
    id: "chat",
    label: "Chatting",
    name: "Chatting in the client",
    about: "How a message gets from one viewer to every other viewer through Swarm.",
    steps: [
      {
        title: "Read the chat",
        text: "The chat library in the client reads the stream's chat feed through the source assigned to chat.",
        open: ["platform", "chat"], focus: ["chatlib"], light: ["swarm", "chatlib"], edge: "swarm>chatlib",
      },
      {
        title: "Write a message",
        text: "The viewer types a message in the client, and the chat library signs it with the viewer's identity.",
        open: ["platform", "chat"], focus: ["client", "chatlib"], edge: "client>chatlib",
      },
      {
        title: "Chatting as a guest",
        text: "The client generates a chat key, keeps it in the browser's local storage until the viewer leaves the chat, and pairs it with a display name the viewer picks. A guest needs nothing on Swarm of their own.",
        open: ["platform", "chat", "identity"], focus: ["tempid", "chatlib"], light: ["tempid", "client"], edge: "tempid>client",
      },
      {
        title: "Into the inbox",
        text: "The chat library posts the message into a shared inbox on Swarm, which the chat aggregator reads. The post goes through the event gateway, whose chat write node stamps it.",
        open: ["platform", "chat"], focus: ["chatlib", "aggregator"], edge: "chatlib>aggregator",
      },
      {
        title: "Into the chat feed",
        text: "The chat aggregator on the gateway server reads the inbox and writes each stream's chat feed. It decides which messages the feed holds and their order, and every client reads that feed.",
        open: ["platform", "chat"], focus: ["aggregator", "swarm"], edge: "aggregator>swarm",
      },
      {
        title: "If the aggregator goes down",
        text: "Chat stops updating for everyone. Video playback is unaffected.",
        open: ["platform", "chat"], focus: ["aggregator"], light: ["aggregator"], down: ["aggregator"],
      },
    ],
  },
  {
    id: "talk",
    label: "The story",
    name: "The story: from the whole stack to one Bee node per level",
    about: "The stack step by step, in parts that each keep one camera and one layout, so a deck can lay one step's picture over the last.",
    // The story's pictures in their own words, on bare lines with no heads,
    // one line between two boxes, and with every faded card keeping its name.
    // The explorer keeps its own.
    slides: {
      arrowheads: false,
      fadedNames: true,
      labels: false,
      hidden: ["chatlib>aggregator", "swarm>platform", "stagehost>control"],
      boxLines: ["access"],
      tintBoxes: true,
      cards: {
        platform: "Ingests, transcodes and uploads every stream to Swarm.",
        control: "Infra and stream management related service.",
        beehost: "Stock Bee images.",
        engine: "Pluggable component. Ingest, encode, transcode.",
        uploader: "Picks up each segment, writes the playlists and publishes both to Swarm.",
        levelnodes: "Uploading stream segments and playlists.",
      },
    },
    steps: [
      {
        title: "The whole stack",
        text: "An encoder publishes SRT or RTMP to a stage host. The stack transcodes the feed into 4 quality levels and uploads every segment to Swarm. Viewers read from Swarm through the event gateway, another gateway, their own Bee node or an in-tab node, and in future through the Freedom browser. Tested at a scale of one stream.",
        part: "stack", open: [], focus: null,
      },
      {
        title: "Inside the streaming stack",
        text: "Opened, the streaming stack shows its containers: the stage host, the Bee clients and the control host on the publishing side, and Swarm access, the streaming client, chat and identity on the viewing side.",
        part: "stack-open", open: ["platform"], focus: ["platform"],
      },
      {
        title: "Who starts a stream",
        text: "The stream operator creates streams, assigns them to stages and issues stream keys in the stream manager, which runs on the control host.",
        part: "create-1", layoutOpen: ["platform", "control"], open: ["platform"],
        focus: ["operator", "control"], light: ["operator", "control"], edge: "operator>control",
      },
      {
        title: "Two consoles",
        text: "Behind the HTTPS proxy the control host runs two consoles: the stream manager for streams, and the stream infra manager, where the infra operator deploys stages and Bee node pools and maintains their stamps.",
        part: "create-1", layoutOpen: ["platform", "control"], open: ["platform", "control"],
        focus: ["operator", "control"], light: ["operator", "proxy", "admin", "manager"],
      },
      {
        title: "Creating a stream",
        text: "The stream operator creates the stream in the stream manager and assigns it to a stage. The stream manager issues the stream key and the OBS settings the broadcaster uses.",
        part: "create-1", layoutOpen: ["platform", "control"], open: ["platform", "control"],
        focus: ["operator", "control"], light: ["operator", "proxy", "admin"], edge: "proxy>admin",
      },
      {
        title: "The stream manager",
        text: "The stream manager keeps the streams, stages, users, stream keys and OBS settings, and publishes the stream list: every stage's streams with titles and thumbnails.",
        part: "create-2", layoutOpen: ["platform", "control", "beehost"], open: ["platform", "control"],
        focus: ["admin", "beehost", "swarm"], light: ["admin"],
      },
      {
        title: "Publishing the stream list",
        text: "The stream manager writes the stream list feed through the catalog node, a dedicated Bee node that signs it with the brand key on its own stamp, and the feed goes to Swarm. Viewers find the stream there.",
        part: "create-2", layoutOpen: ["platform", "control", "beehost"], open: ["platform", "control", "beehost"],
        focus: ["admin", "beehost", "swarm"], light: ["admin", "catalognode", "swarm"], edge: "admin>beehost",
      },
      {
        title: "Going live",
        text: "The broadcaster's encoder publishes one feed to the stage host over SRT or RTMP, authenticated by the stream key the stream manager issued.",
        part: "live-1", layoutOpen: ["platform", "stagehost"], open: ["platform"],
        focus: ["encoder", "stagehost"], light: ["encoder", "stagehost"], edge: "encoder>stagehost",
      },
      {
        title: "Inside the stage host",
        text: "The broadcaster's encoder publishes one feed to the stage's ingest port over SRT, the protocol the stream manager shows broadcasters, authenticated by the stream key. An SRS stage also accepts RTMP.",
        part: "live-1", layoutOpen: ["platform", "stagehost"], open: ["platform", "stagehost"],
        focus: ["encoder", "stagehost"], edge: "encoder>engine",
      },
      {
        title: "Transcode, then upload",
        text: "The stream engine transcodes 4 quality levels, 1080p to 360p, on a shared keyframe grid and cuts them into HLS segments. It writes each closed segment to a volume shared with the uploader and announces it on the uploader's webhook.",
        part: "live-1", layoutOpen: ["platform", "stagehost"], open: ["platform", "stagehost"],
        focus: ["encoder", "stagehost"], light: ["encoder", "engine", "uploader"], edge: "engine>uploader",
      },
      {
        title: "The stream uploader",
        text: "The stream uploader receives the segment announcements, writes the playlists, and publishes both to Swarm through the Bee nodes.",
        part: "live-2", layoutOpen: ["platform", "stagehost", "beehost"], open: ["platform", "stagehost"],
        focus: ["uploader", "beehost", "swarm"], light: ["uploader"],
      },
      {
        title: "One Bee node per quality level",
        text: "For each segment the uploader stamps it with its quality level's stamp, uploads it through that level's Bee node, rewrites the level's playlist and updates the level's feed.",
        part: "live-2", layoutOpen: ["platform", "stagehost", "beehost"], open: ["platform", "stagehost", "beehost"],
        focus: ["uploader", "beehost", "swarm"], light: ["uploader", "levelnodes", "swarm"], edge: "uploader>beehost",
      },
      {
        title: "Finding the stream",
        text: "A viewer opens the streaming client, which reads the stream list feed from Swarm every 60 s through Swarm access, and picks a stream to play.",
        part: "watch-1", layoutOpen: ["platform"], open: ["platform"],
        focus: ["swarm", "access", "client", "viewers"], light: ["swarm", "access", "client", "viewers"], edge: "access>client",
      },
      {
        title: "Through the event gateway",
        text: "By default video comes through the event gateway. nginx serves the stream's feeds and segments from its cache, and the warmer has already fetched each new segment once. The client plays through hls.js and steps down one quality level when the playing one stalls.",
        part: "watch-2", layoutOpen: ["platform", "access"], open: ["platform", "access"],
        focus: ["swarm", "access", "client"], light: ["swarm", "access", "gateway", "client"],
      },
      {
        title: "Other ways in",
        text: "A viewer can read the same stream through their own Bee node, through weeb-3, a Swarm node running in the browser tab, or, planned, through the Freedom browser's own Swarm node. None of them needs the event gateway.",
        part: "watch-2", layoutOpen: ["platform", "access"], open: ["platform", "access"],
        focus: ["swarm", "access", "client"], light: ["swarm", "access", "ownbee", "weeb3", "freedom", "client"],
      },
      {
        title: "Chatting",
        text: "The chat library in the client signs a message with the viewer's identity and posts it into a shared inbox on Swarm, stamped by the event gateway's chat write node. The chat aggregator reads the inbox and writes each stream's chat feed, which every client reads.",
        part: "chat-1", layoutOpen: ["platform", "chat"], open: ["platform", "chat"],
        focus: ["client", "chat", "swarm", "viewers"], light: ["chatlib", "aggregator", "swarm", "client", "viewers"], edge: "aggregator>swarm",
      },
      {
        title: "Chatting as a guest",
        text: "The client makes a chat key, keeps it in the browser, and pairs it with a display name the viewer picks. The event gateway stamps guest messages.",
        part: "id-1", layoutOpen: ["platform", "identity"], open: ["platform", "identity"],
        focus: ["identity", "client"], light: ["tempid", "client"], edge: "tempid>client",
      },
      {
        title: "The whole system",
        text: "Every box open at once: the stage host, the Bee clients and the control host publishing, and Swarm access, the streaming client, chat and identity on the viewing side.",
        part: "full", open: ["platform", "stagehost", "beehost", "control", "access", "chat", "identity"], focus: null,
      },
    ],
  },
];

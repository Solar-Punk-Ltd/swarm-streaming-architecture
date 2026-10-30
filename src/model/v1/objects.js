/* Objects: V1, client side streaming, a proof of concept, as swarm-stream-js
   built it in 2024. A model of its own, because it shares nothing with the
   others: no server and no ingest, only two browser tabs and Swarm between
   them. Read from swarm-stream-js's README and its options.

   Text follows the V4 model's rules: present tense, declarative, one
   responsibility per sentence. "Viewers" are people.

   `scale` is required on every object and checked by the schema. See
   ../scale.js for what the two enums mean. */

import { GROWS, RESILIENCE } from '../scale.js';

export const V1_OBJECTS = {
  /* ── Context ── */
  streamer: { name: "Streamer", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "A person streaming from the camera of their own computer.",
    scale: { count: "1", unit: "one streamer per stream", grows: GROWS.STAGES, resilience: RESILIENCE.EXTERNAL,
      onLoss: "The stream stops. What was uploaded stays on Swarm." },
    blurb: "Opens the streaming page in Chrome, allows the camera and starts the stream." },

  streamerapp: { name: "Streamer's browser", type: "Software system", icon: "browser", drill: "streamer",
    tech: ["MediaRecorder", "swarm-stream-js"],
    desc: "Records the camera, cuts it into slices and writes them to Swarm.",
    scale: { count: "1", unit: "one tab per stream", grows: GROWS.STAGES, resilience: RESILIENCE.CLIENT,
      onLoss: "The stream stops. Slices already written stay on Swarm." },
    blurb: "Everything the streamer runs is one browser tab: the camera, the browser's own encoder and the library that writes to Swarm through a Bee node's API, a local node or a public gateway. One quality level, tested in Chrome.",
    metrics: [["Quality levels", "1", ""], ["Slice length", "2 s", ""], ["Format", "WebM, VP9 and Opus", ""]] },

  swarm: { name: "Swarm network", type: "External system", icon: "swarm", external: true,
    tech: ["Bee", "feeds"],
    desc: "Stores every slice, and the feed that names them in order.",
    scale: { count: "many", unit: "independent nodes", grows: GROWS.COVERAGE, resilience: RESILIENCE.EXTERNAL,
      onLoss: "No single point of failure. Chunks are distributed across nodes by address." },
    blurb: "Each slice is stored as content-addressed data. A feed, a mutable pointer signed by the streamer's key, names the slices in order, one index per slice, with index 0 holding the stream's metadata. Both browsers reach Swarm through a Bee node's HTTP API." },

  viewerapp: { name: "Viewer's browser", type: "Software system", icon: "browser", drill: "viewer",
    tech: ["MediaSource", "swarm-stream-js"],
    desc: "Reads the feed, fetches each slice and plays them in order.",
    scale: { count: "any", unit: "one tab per viewer", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "The player is the same library in another tab. It knows the streamer's address and the stream's topic, reads the feed index by index and appends each slice to a video element through Media Source Extensions." },

  viewers: { name: "Viewers", type: "External actor", icon: "person", external: true,
    tech: ["browser"],
    desc: "People watching in Chrome.",
    scale: { count: "any", unit: "concurrent viewers", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "Open the player page with the streamer's address and the stream's topic." },

  /* ── Components: the streamer's tab ── */
  camera: { name: "Camera", type: "Component", icon: "stream",
    tech: ["getUserMedia"],
    desc: "getUserMedia opens the camera and the microphone.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.STAGES, resilience: RESILIENCE.CLIENT,
      onLoss: "Nothing is recorded and the stream stops." },
    blurb: "The browser's MediaDevices API hands the page a live camera and microphone stream." },

  recorder: { name: "MediaRecorder", type: "Component", icon: "layers",
    tech: ["WebM", "VP9"],
    desc: "Encodes to WebM and cuts it into 2 s slices.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.STAGES, resilience: RESILIENCE.CLIENT,
      onLoss: "No new slices are made." },
    blurb: "The browser's own encoder records the camera stream as WebM with VP9 video and Opus audio, at one bitrate, and hands the page a slice every 2 s." },

  writer: { name: "Stream writer", type: "Component", icon: "upload",
    tech: ["swarm-stream-js", "feeds"],
    desc: "Uploads each slice with a stamp and writes it at the next feed index.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.STAGES, resilience: RESILIENCE.CLIENT,
      onLoss: "Slices stop reaching Swarm." },
    blurb: "Creates the stream's feed, writes the metadata at index 0, then uploads each slice with the streamer's stamp and writes it at the next feed index, counted by hand so no lookup slows it down." },

  /* ── Components: the viewer's tab ── */
  reader: { name: "Feed reader", type: "Component", icon: "queue",
    tech: ["feeds"],
    desc: "Reads the feed index by index. Each index names a slice.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "The player stops finding new slices." },
    blurb: "Reads the metadata at index 0, then polls the next index until it is written." },

  fetcher: { name: "Slice fetcher", type: "Component", icon: "net",
    tech: ["Bee API"],
    desc: "Fetches each slice from Swarm by its address.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Playback stalls for that viewer." },
    blurb: "Downloads the slice the feed names, from Swarm, through the viewer's Bee node or gateway." },

  player: { name: "MediaSource player", type: "Component", icon: "player",
    tech: ["MSE"],
    desc: "Appends each slice to the video, in order, so it plays.",
    scale: { count: "1", unit: "one per tab", grows: GROWS.VIEWERS, resilience: RESILIENCE.CLIENT,
      onLoss: "Affects that viewer only." },
    blurb: "Waits for a slice that starts on a keyframe, then appends the slices one after another to a SourceBuffer." },
};

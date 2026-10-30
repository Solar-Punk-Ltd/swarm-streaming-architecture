/**
 * V1's walkthroughs: the overview, and the story, the streamer's tab and then
 * the viewer's. The story's steps come in parts that each keep one camera and
 * one layout, so a deck can lay one step's picture over the last, the way the
 * V4 model's story does.
 */

export const V1_TOUR = {
  name: "V1, in three steps",
  about: "Client side streaming, a proof of concept, 2024: two browser tabs and Swarm between them, with no server of ours.",
  steps: [
    {
      title: "Two browsers and Swarm",
      text: "The streamer's tab records the camera and writes 2 s slices to Swarm, naming each in a feed. The viewer's tab reads the feed and plays the slices in order. Nothing runs on a server of ours.",
      open: [], focus: null,
    },
    {
      title: "The streamer's tab",
      text: "getUserMedia opens the camera, MediaRecorder encodes it to WebM in 2 s slices, and the stream writer uploads each slice and writes it at the next feed index.",
      open: ["streamerapp"], focus: ["camera", "recorder", "writer"], light: ["camera", "recorder", "writer"], edge: "writer>swarm",
    },
    {
      title: "The viewer's tab",
      text: "The feed reader reads the feed index by index, the slice fetcher fetches each slice from Swarm by its address, and MediaSource plays them in order.",
      open: ["viewerapp"], focus: ["reader", "fetcher", "player"], light: ["reader", "fetcher", "player"], edge: "fetcher>player",
    },
  ],
};

export const V1_SCENARIOS = [
  {
    id: "talk",
    label: "The story",
    name: "The story: V1 in two browsers",
    about: "V1 step by step, in parts that each keep one camera and one layout.",
    // The same picture rules as the V4 story: bare lines, no labels, every
    // faded card keeps its name, and open boxes washed in their place colour.
    slides: {
      arrowheads: false,
      fadedNames: true,
      labels: false,
      tintBoxes: true,
      cards: {
        camera: "getUserMedia opens it.",
        recorder: "WebM, cut into 2 s slices.",
        writer: "Uploads each slice, one feed index per slice.",
        reader: "Each index names a slice.",
        fetcher: "By its address, from Swarm.",
        player: "MediaSource plays them in order.",
      },
    },
    steps: [
      {
        title: "Two browsers and Swarm",
        text: "The streamer's tab writes to Swarm and the viewer's tab reads from it. Nothing runs on a server of ours.",
        part: "all", open: [], focus: null,
      },
      {
        title: "The camera",
        text: "The streamer's page opens the camera with getUserMedia.",
        part: "stream", layoutOpen: ["streamerapp"], open: ["streamerapp"],
        focus: ["streamer", "streamerapp", "swarm"], light: ["streamer", "camera"], edge: "streamer>camera",
      },
      {
        title: "Cut into slices",
        text: "The browser's own MediaRecorder encodes the camera to WebM and cuts it into slices of 2 s.",
        part: "stream", layoutOpen: ["streamerapp"], open: ["streamerapp"],
        focus: ["streamer", "streamerapp", "swarm"], light: ["camera", "recorder"], edge: "camera>recorder",
      },
      {
        title: "Upload, one feed index per slice",
        text: "The stream writer uploads each slice to Swarm and writes it at the next index of the stream's feed.",
        part: "stream", layoutOpen: ["streamerapp"], open: ["streamerapp"],
        focus: ["streamer", "streamerapp", "swarm"], light: ["recorder", "writer", "swarm"], edge: "writer>swarm",
      },
      {
        title: "Read the feed",
        text: "In the viewer's tab, the feed reader reads the feed index by index, and each index names the next slice.",
        part: "watch", layoutOpen: ["viewerapp"], open: ["viewerapp"],
        focus: ["swarm", "viewerapp", "viewers"], light: ["swarm", "reader"], edge: "swarm>reader",
      },
      {
        title: "Fetch the slice",
        text: "The slice fetcher fetches the slice the feed names from Swarm, by its address.",
        part: "watch", layoutOpen: ["viewerapp"], open: ["viewerapp"],
        focus: ["swarm", "viewerapp", "viewers"], light: ["swarm", "reader", "fetcher"], edge: "swarm>fetcher",
      },
      {
        title: "Play",
        text: "MediaSource appends each slice to the video, in order, so it plays for the viewer.",
        part: "watch", layoutOpen: ["viewerapp"], open: ["viewerapp"],
        focus: ["swarm", "viewerapp", "viewers"], light: ["fetcher", "player", "viewers"], edge: "player>viewers",
      },
    ],
  },
];

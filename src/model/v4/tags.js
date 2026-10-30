/* Overlay groups for the V4 model.
 *
 * The question this model is asked most is which boxes a playing stream
 * depends on, so that group comes first, in colours of its own: the place
 * colours are on every card all the time, and an overlay painted in them
 * would change nothing on screen.
 */

const PATH_MEMBERS = {
  // What a stream that is already playing passes through, encoder to screen.
  path: ['encoder', 'platform', 'stagehost', 'engine', 'uploader', 'beehost', 'levelnodes',
    'swarm', 'access', 'gateway', 'weeb3', 'ownbee', 'freedom', 'client', 'viewers'],
  // Stop any of these and a stream already playing keeps playing.
  beside: ['operator', 'infraop', 'control', 'admin', 'manager', 'proxy', 'catalognode'],
  chat: ['chat', 'chatlib', 'aggregator', 'identity', 'tempid'],
};

/** Where each thing runs. Also the always-on card colour for this model. */
export const V4_PLACE_MEMBERS = {
  broadcaster: ['encoder', 'operator', 'infraop'],
  stage: ['platform', 'stagehost', 'engine', 'uploader'],
  bee: ['beehost', 'levelnodes', 'catalognode'],
  gateway: ['gateway', 'aggregator', 'chat'],
  control: ['control', 'admin', 'manager', 'proxy'],
  swarm: ['swarm'],
  viewer: ['viewers', 'client', 'access', 'weeb3', 'ownbee', 'freedom', 'chatlib', 'identity', 'tempid'],
};

export const V4_PLACE_COLOUR = Object.freeze({
  broadcaster: '#B8763A',
  stage: '#3A7CB8',
  bee: '#17868C',
  gateway: '#4E8C4E',
  control: '#8465B8',
  swarm: '#B07A22',
  viewer: '#2E8B63',
});

/**
 * The overlay bar, in this order. A `derive` entry is filled in from the
 * objects rather than listed.
 */
export const V4_GROUP_DEFS = [
  {
    id: 'path',
    name: 'Media path',
    hint: 'Components on the media path, and components outside it.',
    tags: [
      { id: 'path', name: 'On the path', color: '#D9480F',
        hint: 'Encoder to screen. A segment reaches the client through one Swarm access.' },
      { id: 'beside', name: 'Beside it', color: '#868E96',
        hint: 'Outside the media path. A playing stream continues without them.' },
      { id: 'chat', name: 'Chat and identity', color: '#E8B931',
        hint: 'Chat and identity. Independent of video playback.' },
    ],
    members: PATH_MEMBERS,
  },
  {
    id: 'place',
    name: 'Where it runs',
    hint: 'The host each component runs on.',
    tags: [
      { id: 'broadcaster', name: 'Broadcaster and operators', color: V4_PLACE_COLOUR.broadcaster,
        hint: "The broadcaster's encoder, the stream operator and the infra operator." },
      { id: 'stage', name: 'Stage host', color: V4_PLACE_COLOUR.stage,
        hint: 'One stack deployment per stage: stream engine and uploader.' },
      { id: 'bee', name: 'Bee clients', color: V4_PLACE_COLOUR.bee,
        hint: 'Stock Bee nodes: one per quality level, and the catalog node.' },
      { id: 'gateway', name: 'Gateway server', color: V4_PLACE_COLOUR.gateway,
        hint: 'Event gateway, its 4 Bee nodes and the chat aggregator.' },
      { id: 'control', name: 'Control host', color: V4_PLACE_COLOUR.control,
        hint: 'Stream manager, stream infra manager and HTTPS proxy.' },
      { id: 'swarm', name: 'Swarm', color: V4_PLACE_COLOUR.swarm,
        hint: 'The network itself.' },
      { id: 'viewer', name: "Viewer's side", color: V4_PLACE_COLOUR.viewer,
        hint: "The viewer's browser, the viewer's own Bee node and the Freedom browser." },
    ],
    members: V4_PLACE_MEMBERS,
  },
  { derive: 'scale' },
  { derive: 'tech' },
];

/* Overlay groups for the V1 model: where each thing runs, in the V4 model's
 * place colours, so the two pictures read alike on one deck. */

import { V4_PLACE_COLOUR } from '../v4/tags.js';

export const V1_PLACE_MEMBERS = {
  streamer: ['streamer', 'streamerapp', 'camera', 'recorder', 'writer'],
  swarm: ['swarm'],
  viewer: ['viewers', 'viewerapp', 'reader', 'fetcher', 'player'],
};

export const V1_PLACE_COLOUR = Object.freeze({
  streamer: V4_PLACE_COLOUR.broadcaster,
  swarm: V4_PLACE_COLOUR.swarm,
  viewer: V4_PLACE_COLOUR.viewer,
});

export const V1_GROUP_DEFS = [
  {
    id: 'place',
    name: 'Where it runs',
    hint: 'The browser tab each component runs in.',
    tags: [
      { id: 'streamer', name: "Streamer's tab", color: V1_PLACE_COLOUR.streamer,
        hint: "The streamer and the streamer's browser tab." },
      { id: 'swarm', name: 'Swarm', color: V1_PLACE_COLOUR.swarm,
        hint: 'The network.' },
      { id: 'viewer', name: "Viewer's tab", color: V1_PLACE_COLOUR.viewer,
        hint: "The viewer and the viewer's browser tab." },
    ],
    members: V1_PLACE_MEMBERS,
  },
  { derive: 'scale' },
  { derive: 'tech' },
];

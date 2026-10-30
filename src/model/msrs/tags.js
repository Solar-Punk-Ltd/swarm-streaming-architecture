/* Overlay groups for the MSRS model: where each thing runs, in the V4
 * model's place colours, so the pictures read alike on one deck. */

import { V4_PLACE_COLOUR } from '../v4/tags.js';

export const MSRS_PLACE_MEMBERS = {
  broadcaster: ['encoder'],
  server: ['platform', 'ingest'],
  bee: ['gateway'],
  aggregator: ['aggs', 'streamagg', 'chatagg'],
  swarm: ['swarm'],
  viewer: ['viewers', 'client'],
};

export const MSRS_PLACE_COLOUR = Object.freeze({
  broadcaster: V4_PLACE_COLOUR.broadcaster,
  server: V4_PLACE_COLOUR.stage,
  bee: V4_PLACE_COLOUR.bee,
  aggregator: V4_PLACE_COLOUR.gateway,
  swarm: V4_PLACE_COLOUR.swarm,
  viewer: V4_PLACE_COLOUR.viewer,
});

export const MSRS_GROUP_DEFS = [
  {
    id: 'place',
    name: 'Where it runs',
    hint: 'The host each component runs on.',
    tags: [
      { id: 'broadcaster', name: 'Broadcaster', color: MSRS_PLACE_COLOUR.broadcaster,
        hint: "The broadcaster's encoder." },
      { id: 'server', name: 'Ingestion server', color: MSRS_PLACE_COLOUR.server,
        hint: 'The instance and its ingestion server.' },
      { id: 'bee', name: 'Gateway node', color: MSRS_PLACE_COLOUR.bee,
        hint: 'Our Bee nodes behind nginx.' },
      { id: 'aggregator', name: 'Aggregators', color: MSRS_PLACE_COLOUR.aggregator,
        hint: 'The stream and the chat aggregator.' },
      { id: 'swarm', name: 'Swarm', color: MSRS_PLACE_COLOUR.swarm,
        hint: 'The network.' },
      { id: 'viewer', name: "Viewer's side", color: MSRS_PLACE_COLOUR.viewer,
        hint: "The viewer and the streaming client in their browser." },
    ],
    members: MSRS_PLACE_MEMBERS,
  },
  { derive: 'scale' },
  { derive: 'tech' },
];

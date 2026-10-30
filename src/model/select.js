/**
 * Which version the page is showing.
 *
 * Three independent models live in this tree and in the one built file, one
 * per generation of live streaming over Swarm: V1, client side streaming in
 * two browser tabs, V2 and V3, MSSD and then MSRS, told through MSRS, and V4,
 * event stage streaming. A model is its objects, diagrams and tours plus its
 * overlay definitions, and nothing outside this file has to know there is
 * more than one.
 *
 * The choice is made once, synchronously, at module evaluation, from
 * `?model=` on the URL. It has to be synchronous because every derived index
 * downstream is a module-level constant, and it has to survive there being no
 * DOM at all, because the tests and the bundler evaluate this in Node.
 */

import { V4_OBJECTS } from './v4/objects.js';
import { V4_DIAGRAMS } from './v4/diagrams.js';
import { V4_TOUR } from './v4/tour.js';
import { V4_SCENARIOS } from './v4/scenarios.js';
import { V4_GROUP_DEFS, V4_PLACE_MEMBERS, V4_PLACE_COLOUR } from './v4/tags.js';
import { V1_OBJECTS } from './v1/objects.js';
import { V1_DIAGRAMS } from './v1/diagrams.js';
import { V1_TOUR, V1_SCENARIOS } from './v1/tour.js';
import { V1_GROUP_DEFS, V1_PLACE_MEMBERS, V1_PLACE_COLOUR } from './v1/tags.js';
import { MSRS_OBJECTS } from './msrs/objects.js';
import { MSRS_DIAGRAMS } from './msrs/diagrams.js';
import { MSRS_TOUR, MSRS_SCENARIOS } from './msrs/tour.js';
import { MSRS_GROUP_DEFS, MSRS_PLACE_MEMBERS, MSRS_PLACE_COLOUR } from './msrs/tags.js';

/** The models a link can ask for. */
export const V1_MODEL = 'v1';
export const MSRS_MODEL = 'msrs';
export const V4_MODEL = 'v4';

/** The newest version, shown when a link names none. */
export const DEFAULT_MODEL = V4_MODEL;

/**
 * Every model, keyed by what a link calls it.
 *
 * `version` and `title` are what the version selector shows, `mark` is the two
 * characters in the rail, `tours` the walkthroughs with the overview first,
 * and `open` is what is open on arrival, the one system worth being inside
 * rather than looking at.
 */
export const MODELS = {
  [V1_MODEL]: {
    id: V1_MODEL,
    version: 'V1',
    title: 'Client side streaming (PoC)',
    mark: 'V1',
    objects: V1_OBJECTS,
    diagrams: V1_DIAGRAMS,
    tours: [V1_TOUR, ...V1_SCENARIOS],
    groups: V1_GROUP_DEFS,
    places: V1_PLACE_MEMBERS,
    placeColour: V1_PLACE_COLOUR,
    open: [],
  },
  [MSRS_MODEL]: {
    id: MSRS_MODEL,
    version: 'V2–V3',
    title: 'MSSD, then MSRS',
    mark: 'MS',
    objects: MSRS_OBJECTS,
    diagrams: MSRS_DIAGRAMS,
    tours: [MSRS_TOUR, ...MSRS_SCENARIOS],
    groups: MSRS_GROUP_DEFS,
    places: MSRS_PLACE_MEMBERS,
    placeColour: MSRS_PLACE_COLOUR,
    open: ['platform'],
  },
  [V4_MODEL]: {
    id: V4_MODEL,
    version: 'V4',
    title: 'Event stage streaming',
    mark: 'V4',
    objects: V4_OBJECTS,
    diagrams: V4_DIAGRAMS,
    tours: [V4_TOUR, ...V4_SCENARIOS],
    groups: V4_GROUP_DEFS,
    places: V4_PLACE_MEMBERS,
    placeColour: V4_PLACE_COLOUR,
    open: ['platform'],
  },
};

/** The versions in the order they were built, the order the selector lists them in. */
export const VERSIONS = [V1_MODEL, MSRS_MODEL, V4_MODEL].map((id) => MODELS[id]);

/**
 * The model a query string asks for. Anything unknown is the default rather
 * than an error, the same way the store ignores query keys it does not know:
 * a mistyped link should show the usual thing, not a blank page.
 */
export function modelFrom(search) {
  const asked = new URLSearchParams(search || '').get('model');
  return asked && MODELS[asked] ? asked : DEFAULT_MODEL;
}

export const MODEL_ID = modelFrom(typeof location === 'undefined' ? '' : location.search);

export const MODEL = MODELS[MODEL_ID];

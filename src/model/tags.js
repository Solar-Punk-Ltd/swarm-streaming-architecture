/**
 * Overlay groups: filters painted on top of whatever diagram is open, rather
 * than a separate diagram per question. Turning a group on stripes every card
 * that carries one of its tags, and a tag can be soloed or hidden.
 *
 * Each model brings its own group definitions, in ./v1/tags.js, ./msrs/tags.js
 * and ./v4/tags.js, with membership listed explicitly there rather than as a
 * field on each object, so the whole answer to a question like "what runs
 * where" is readable in one place. Everything in this file is shared: the
 * builder takes an ordered list of definitions and fills in the two derived
 * groups, scale and technology, wherever that list asks for them.
 */

import { RESILIENCE_TAGS, resilienceMembers } from './scale.js';

/** Overlay group ids, referenced by walkthrough steps and by the filter bar. */
export const SCALE_GROUP = 'scale';

/**
 * Technology chips, one per distinct entry across every object's tech list,
 * sorted by how many objects use it. Colour is assigned from a fixed wheel by
 * rank so the busiest technologies get the most separable hues.
 */
// Starts at teal rather than amber: amber is selection and red is incident,
// and a categorical ramp that borrows either makes a stripe read as a state.
const TECH_WHEEL = [
  '#17868C', '#3A7CB8', '#2E8B63', '#8465B8', '#A33F5E',
  '#B07A22', '#5B7FA8', '#4E8C4E', '#9B5C8C', '#3E7F7A',
];

/**
 * Scale and redundancy, derived from each object's own `scale` rather than
 * listed here, so a component added without declaring how it survives a
 * failure is a validation error rather than a silent gap in the legend.
 */
export function resilienceGroup(objects) {
  return {
    id: SCALE_GROUP,
    name: 'Scale and redundancy',
    hint: 'How many of each there are, and what covers the loss of one.',
    tags: RESILIENCE_TAGS,
    members: resilienceMembers(objects),
  };
}

export function technologyGroup(objects) {
  const members = {};
  for (const [id, o] of Object.entries(objects)) {
    for (const t of o.tech || []) (members[t] ||= []).push(id);
  }
  const tags = Object.keys(members)
    .sort((a, b) => members[b].length - members[a].length || a.localeCompare(b))
    .map((name, i) => ({
      id: name,
      name,
      color: TECH_WHEEL[i % TECH_WHEEL.length],
      hint: `${members[name].length} object${members[name].length === 1 ? '' : 's'}`,
    }));
  return { id: 'tech', name: 'Technology', hint: 'What each piece is actually built from.', tags, members };
}

/** The groups a definition list can ask to have built for it. */
const DERIVED = { [SCALE_GROUP]: resilienceGroup, tech: technologyGroup };

/**
 * Group definitions with per-tag object sets resolved and counted, in the
 * order the definitions give them. A definition asking to `derive` a group is
 * filled in from the objects, so a model can say where the derived groups sit
 * without knowing how either one is built. A tag no object carries is dropped
 * rather than drawn as an empty chip.
 */
export function buildTagGroups(objects, defs) {
  return defs
    .map((g) => (g.derive ? DERIVED[g.derive](objects) : g))
    .map((g) => ({
      id: g.id,
      name: g.name,
      hint: g.hint,
      tags: g.tags
        .map((t) => ({ ...t, objects: (g.members[t.id] || []).filter((id) => objects[id]) }))
        .filter((t) => t.objects.length)
        .map((t) => ({ ...t, count: t.objects.length })),
    }));
}

/** Reverse index: object id to the tags it carries, per group. */
export function tagsByObject(groups) {
  const index = {};
  for (const g of groups) {
    for (const t of g.tags) {
      for (const id of t.objects) {
        (index[id] ||= []).push({ group: g.id, tag: t.id, name: t.name, color: t.color });
      }
    }
  }
  return index;
}

/** Object id to its place, given one model's membership lists. */
export function placeIndex(members) {
  const out = {};
  for (const [place, ids] of Object.entries(members)) for (const id of ids) out[id] = place;
  return (id) => out[id] || null;
}

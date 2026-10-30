/* The V1 model, checked the way the V4 one is: no errors, no warnings, every
 * object in the tree once, and its talk walkthrough's steps in parts. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containmentTree, flatten, indexModel } from '../src/model/index.js';
import { buildTagGroups } from '../src/model/tags.js';
import { validateModel, formatIssues } from '../src/model/schema.js';
import { V1_OBJECTS } from '../src/model/v1/objects.js';
import { V1_DIAGRAMS } from '../src/model/v1/diagrams.js';
import { V1_TOUR, V1_SCENARIOS } from '../src/model/v1/tour.js';
import { V1_GROUP_DEFS } from '../src/model/v1/tags.js';
import { MODELS, V1_MODEL, modelFrom } from '../src/model/select.js';

const TOURS = [V1_TOUR, ...V1_SCENARIOS];

test('the V1 model has no errors and no warnings', () => {
  const { errors, warnings, ok } = validateModel({
    objects: V1_OBJECTS,
    diagrams: V1_DIAGRAMS,
    tours: TOURS,
    overlays: new Set(buildTagGroups(V1_OBJECTS, V1_GROUP_DEFS).map((g) => g.id)),
  });
  assert.equal(ok, true, `errors:\n${formatIssues(errors)}`);
  assert.deepEqual(warnings, [], `warnings:\n${formatIssues(warnings)}`);
});

test('the V1 model is chosen by the query string', () => {
  assert.equal(modelFrom('?model=v1'), V1_MODEL);
  assert.equal(MODELS[V1_MODEL].objects, V1_OBJECTS);
  assert.deepEqual(MODELS[V1_MODEL].tours, TOURS);
});

test('the V1 containment tree holds every object exactly once', () => {
  const flat = flatten(containmentTree(indexModel(V1_OBJECTS, V1_DIAGRAMS)));
  assert.equal(flat.length, Object.keys(V1_OBJECTS).length);
  assert.equal(new Set(flat.map((n) => n.id)).size, flat.length);
});

test('every step of the V1 talk names its part', () => {
  const talk = V1_SCENARIOS.find((t) => t.id === 'talk');
  assert.ok(talk, 'the model has a talk walkthrough');
  for (const step of talk.steps) assert.ok(step.part, `${step.title} has no part`);
});

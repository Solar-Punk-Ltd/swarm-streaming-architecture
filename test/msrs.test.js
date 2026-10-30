/* The MSRS model, checked the way the V4 one is: no errors, no warnings, every
 * object in the tree once, and its talk walkthrough's steps in parts. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containmentTree, flatten, indexModel } from '../src/model/index.js';
import { buildTagGroups } from '../src/model/tags.js';
import { validateModel, formatIssues } from '../src/model/schema.js';
import { MSRS_OBJECTS } from '../src/model/msrs/objects.js';
import { MSRS_DIAGRAMS } from '../src/model/msrs/diagrams.js';
import { MSRS_TOUR, MSRS_SCENARIOS } from '../src/model/msrs/tour.js';
import { MSRS_GROUP_DEFS } from '../src/model/msrs/tags.js';
import { MODELS, MSRS_MODEL, modelFrom } from '../src/model/select.js';

const TOURS = [MSRS_TOUR, ...MSRS_SCENARIOS];

test('the MSRS model has no errors and no warnings', () => {
  const { errors, warnings, ok } = validateModel({
    objects: MSRS_OBJECTS,
    diagrams: MSRS_DIAGRAMS,
    tours: TOURS,
    overlays: new Set(buildTagGroups(MSRS_OBJECTS, MSRS_GROUP_DEFS).map((g) => g.id)),
  });
  assert.equal(ok, true, `errors:\n${formatIssues(errors)}`);
  assert.deepEqual(warnings, [], `warnings:\n${formatIssues(warnings)}`);
});

test('the MSRS model is chosen by the query string', () => {
  assert.equal(modelFrom('?model=msrs'), MSRS_MODEL);
  assert.equal(MODELS[MSRS_MODEL].objects, MSRS_OBJECTS);
  assert.deepEqual(MODELS[MSRS_MODEL].tours, TOURS);
});

test('the MSRS containment tree holds every object exactly once', () => {
  const flat = flatten(containmentTree(indexModel(MSRS_OBJECTS, MSRS_DIAGRAMS)));
  assert.equal(flat.length, Object.keys(MSRS_OBJECTS).length);
  assert.equal(new Set(flat.map((n) => n.id)).size, flat.length);
});

test('every step of the MSRS talk names its part', () => {
  const talk = MSRS_SCENARIOS.find((t) => t.id === 'talk');
  assert.ok(talk, 'the model has a talk walkthrough');
  for (const step of talk.steps) assert.ok(step.part, `${step.title} has no part`);
});

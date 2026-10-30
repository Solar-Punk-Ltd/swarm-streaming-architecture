/* The validator, checked against a copy of the V4 model broken one way at a
 * time: each broken copy has to fail with the error that names what broke. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModel, edgeKey, formatIssues } from '../src/model/schema.js';
import { V4_OBJECTS } from '../src/model/v4/objects.js';
import { V4_DIAGRAMS } from '../src/model/v4/diagrams.js';
import { V4_TOUR } from '../src/model/v4/tour.js';

const clone = (v) => structuredClone(v);
const base = () => ({ objects: clone(V4_OBJECTS), diagrams: clone(V4_DIAGRAMS), tour: clone(V4_TOUR) });

test('the model these tests break has no errors and no warnings', () => {
  const { errors, warnings, ok } = validateModel({ objects: V4_OBJECTS, diagrams: V4_DIAGRAMS, tour: V4_TOUR });
  assert.equal(ok, true, `errors:\n${formatIssues(errors)}`);
  assert.deepEqual(warnings, [], `warnings:\n${formatIssues(warnings)}`);
});

test('an edge naming an unplaced node fails', () => {
  const m = base();
  m.diagrams.context.edges.push({ from: 'encoder', to: 'engine', label: 'nonsense' });
  const { errors } = validateModel(m);
  assert.ok(errors.some((e) => e.includes('ends at an unplaced node')), errors.join('\n'));
});

test('a drill pointing at a missing diagram fails', () => {
  const m = base();
  m.objects.platform.drill = 'nowhere';
  assert.ok(validateModel(m).errors.some((e) => e.includes('drills to missing diagram')));
});

test('a walkthrough step highlighting a renamed edge fails', () => {
  // The silent-render bug this exists to catch: rename an edge and every step
  // that pointed at it quietly highlights nothing.
  const m = base();
  for (const d of Object.values(m.diagrams)) {
    const edge = d.edges.find((e) => e.from === 'engine' && e.to === 'uploader');
    if (edge) edge.to = 'levelnodes';
  }
  const { errors } = validateModel(m);
  assert.ok(errors.some((e) => e.includes('which no diagram has')), errors.join('\n'));
});

test('a step that lights a connection without opening its box fails', () => {
  // A step can name a connection several levels deep; if it does not open the
  // boxes between, the canvas narrates something that is not on screen.
  // Found by its edge rather than its index, so inserting a step upstream
  // does not quietly retarget the assertion at an unrelated one.
  const m = base();
  const step = m.tour.steps.find((s) => s.edge === 'engine>uploader');
  assert.ok(step, 'the walkthrough should still follow a segment out of the engine');
  step.open = ['platform'];
  const { errors } = validateModel(m);
  assert.ok(errors.some((e) => e.includes('does not open stagehost')), errors.join('\n'));
});

test('a node hanging off the canvas fails', () => {
  const m = base();
  m.diagrams.context.nodes[0].x = m.diagrams.context.w - 10;
  assert.ok(validateModel(m).errors.some((e) => e.includes('overflows the canvas')));
});

test('a node placed twice in one diagram fails', () => {
  const m = base();
  m.diagrams.context.nodes.push({ ...m.diagrams.context.nodes[0] });
  assert.ok(validateModel(m).errors.some((e) => e.includes('twice')));
});

test('an unknown object type fails', () => {
  const m = base();
  m.objects.encoder.type = 'Widget';
  assert.ok(validateModel(m).errors.some((e) => e.includes('unknown type')));
});

test('a step opening something with nothing inside it fails', () => {
  const m = base();
  m.tour.steps[0].open = ['viewers'];
  assert.ok(validateModel(m).errors.some((e) => e.includes('nothing inside it')));
});

test('a self loop fails', () => {
  const m = base();
  m.diagrams.context.edges.push({ from: 'encoder', to: 'encoder', label: 'loop' });
  assert.ok(validateModel(m).errors.some((e) => e.includes('self loop')));
});

test('an object in no diagram is a warning, not an error', () => {
  const m = base();
  m.objects.orphan = {
    name: 'Orphan', type: 'Component', icon: 'app', desc: '', tech: [],
    scale: { count: '1', unit: 'one of it', grows: 'fixed', resilience: 'single',
      onLoss: 'Nothing, since nothing points at it.' },
  };
  const { errors, warnings } = validateModel(m);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(warnings.some((w) => w.includes('appears in no diagram')));
});

test('an object that does not declare scale fails', () => {
  // Adding a box without saying how many there are and what covers the loss
  // of one is how a diagram implies a redundancy nobody designed.
  const m = base();
  delete m.objects.engine.scale;
  assert.ok(validateModel(m).errors.some((e) => e.includes('does not declare scale')));
});

test('an unknown resilience posture fails', () => {
  const m = base();
  m.objects.uploader.scale.resilience = 'probably-fine';
  assert.ok(validateModel(m).errors.some((e) => e.includes('unknown resilience')));
});

test('a scale that does not say what losing one costs fails', () => {
  const m = base();
  m.objects.uploader.scale.onLoss = 'bad';
  assert.ok(validateModel(m).errors.some((e) => e.includes('what losing one costs')));
});

test('a walkthrough step naming a dead overlay fails', () => {
  const m = base();
  m.tour.steps[0].overlay = 'nonsense';
  const { errors } = validateModel({ ...m, overlays: new Set(['path', 'scale']) });
  assert.ok(errors.some((e) => e.includes('unknown overlay')), errors.join('\n'));
});

test('edgeKey matches the scenario step format', () => {
  assert.equal(edgeKey('engine', 'uploader'), 'engine>uploader');
});

test('a second walkthrough without an id and a label fails', () => {
  const { objects, diagrams, tour } = base();
  const { errors } = validateModel({ objects, diagrams, tours: [tour, { name: 'Other', steps: clone(V4_TOUR.steps) }] });
  assert.ok(errors.some((e) => e.includes('needs an id and a label')), errors.join('\n'));
});

test('two walkthroughs with one id fail', () => {
  const { objects, diagrams, tour } = base();
  const twin = () => ({ id: 'twin', label: 'Twin', name: 'Twin', steps: clone(V4_TOUR.steps) });
  const { errors } = validateModel({ objects, diagrams, tours: [tour, twin(), twin()] });
  assert.ok(errors.some((e) => e.includes('share the id "twin"')), errors.join('\n'));
});

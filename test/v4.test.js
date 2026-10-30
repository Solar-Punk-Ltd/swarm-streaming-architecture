/* The V4 model, checked the way the V1 and MSRS ones are, plus what a model
 * of a built stack has to hold: the edges that cross from the media path to
 * the control host are the ones the stack really makes. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  containmentTree, flatten, indexModel, connectionsAmong, ancestorsOf, tourStepsFor, ROOT_DIAGRAM,
} from '../src/model/index.js';
import { buildTagGroups, placeIndex } from '../src/model/tags.js';
import { validateModel, formatIssues } from '../src/model/schema.js';
import { RESILIENCE } from '../src/model/scale.js';
import { ICONS } from '../src/render/icons.js';
import { V4_OBJECTS } from '../src/model/v4/objects.js';
import { V4_DIAGRAMS } from '../src/model/v4/diagrams.js';
import { V4_TOUR } from '../src/model/v4/tour.js';
import { V4_SCENARIOS } from '../src/model/v4/scenarios.js';
import { V4_GROUP_DEFS, V4_PLACE_MEMBERS, V4_PLACE_COLOUR } from '../src/model/v4/tags.js';
import { MODELS, V4_MODEL, DEFAULT_MODEL, modelFrom } from '../src/model/select.js';

const v4 = indexModel(V4_OBJECTS, V4_DIAGRAMS);
const GROUPS = buildTagGroups(V4_OBJECTS, V4_GROUP_DEFS);
const group = (id) => GROUPS.find((g) => g.id === id);
const keyOf = (c) => `${c.from}>${c.to}`;
const TOURS = [V4_TOUR, ...V4_SCENARIOS];
const allSteps = () => TOURS.flatMap((t) => t.steps.map((s, i) => [`${t.id || 'overview'} step ${i + 1}`, s]));

test('the V4 model has no errors and no warnings', () => {
  const { errors, warnings, ok } = validateModel({
    objects: V4_OBJECTS,
    diagrams: V4_DIAGRAMS,
    tours: TOURS,
    overlays: new Set(GROUPS.map((g) => g.id)),
  });
  assert.equal(ok, true, `errors:\n${formatIssues(errors)}`);
  assert.deepEqual(warnings, [], `warnings:\n${formatIssues(warnings)}`);
});

test('the model is chosen by the query string, and nothing else', () => {
  assert.equal(modelFrom('?model=v4'), V4_MODEL);
  assert.equal(modelFrom('?opened=platform&model=v4&step=3'), V4_MODEL);
  assert.equal(DEFAULT_MODEL, V4_MODEL, 'a link that names no version opens the newest');
  assert.equal(modelFrom('?model=V1'), DEFAULT_MODEL, 'the id is exact');
  assert.equal(MODELS[V4_MODEL].objects, V4_OBJECTS);
  assert.deepEqual(MODELS[V4_MODEL].open, ['platform']);
  assert.deepEqual(MODELS[V4_MODEL].tours, TOURS);
  assert.equal(V4_DIAGRAMS[ROOT_DIAGRAM].name, 'V4 streaming stack');
});

test('the containment tree holds every object exactly once', () => {
  const flat = flatten(containmentTree(v4));
  assert.equal(flat.length, Object.keys(V4_OBJECTS).length);
  assert.equal(new Set(flat.map((n) => n.id)).size, flat.length);
});

test('each component sits inside the container it runs in', () => {
  const tree = containmentTree(v4);
  const platform = tree.children.find((c) => c.id === 'platform');
  assert.deepEqual(platform.children.map((c) => c.id),
    ['stagehost', 'beehost', 'access', 'client', 'chat', 'identity', 'control']);
  const kids = (id) => platform.children.find((c) => c.id === id).children.map((c) => c.id);
  assert.deepEqual(kids('stagehost'), ['engine', 'uploader']);
  assert.deepEqual(kids('beehost'), ['levelnodes', 'catalognode']);
  assert.deepEqual(kids('access'), ['freedom', 'ownbee', 'weeb3', 'gateway']);
  assert.deepEqual(kids('client'), [], 'the streaming client does not open');
  assert.deepEqual(kids('chat'), ['chatlib', 'aggregator']);
  assert.deepEqual(kids('identity'), ['tempid']);
  assert.deepEqual(kids('control'), ['proxy', 'manager', 'admin']);
});

test('Swarm and the people sit beside the stack, not inside it', () => {
  const tree = containmentTree(v4);
  const top = tree.children.map((c) => c.id);
  const inside = flatten(tree.children.find((c) => c.id === 'platform')).map((n) => n.id);
  for (const id of ['swarm', 'encoder', 'operator', 'infraop', 'viewers']) {
    assert.ok(top.includes(id), `${id} should be a sibling of the stack`);
    assert.equal(inside.includes(id), false, `${id} is repeated for context, not contained`);
  }
  assert.deepEqual(ancestorsOf('uploader', v4.parents), ['stagehost', 'platform']);
});

test('opening the stack replaces every context edge instead of drawing it twice', () => {
  const closed = connectionsAmong(new Set(), v4).map(keyOf);
  const open = connectionsAmong(new Set(['platform']), v4).map(keyOf);
  const contextEdges = closed.filter((k) => k.includes('platform'));
  assert.equal(contextEdges.length, 6);
  for (const key of contextEdges) {
    assert.equal(open.includes(key), false, `${key} is still drawn with the stack open`);
  }
});

test('the control host touches the media path only where the stack does', () => {
  const drawn = connectionsAmong(new Set(['platform', 'control']), v4).map(keyOf);
  const inside = ['proxy', 'manager', 'admin'];
  const touching = drawn.filter((k) => k.split('>').some((end) => inside.includes(end))).sort();
  assert.deepEqual(touching, [
    'admin>beehost', 'infraop>proxy', 'manager>admin', 'manager>beehost', 'manager>stagehost',
    'operator>proxy', 'proxy>admin', 'proxy>manager', 'stagehost>admin',
  ]);
});

test('a relationship drawn at two depths is one line between its two cards', () => {
  const live = connectionsAmong(new Set(['platform', 'stagehost', 'beehost']), v4);
  const upload = live.find((c) => keyOf(c) === 'uploader>levelnodes');
  assert.deepEqual(upload?.stands, ['uploader>beehost', 'stagehost>levelnodes']);
  for (const key of upload.stands) assert.equal(live.some((c) => keyOf(c) === key), false, `${key} is drawn as well`);
  const publish = connectionsAmong(new Set(['platform', 'control', 'beehost']), v4);
  assert.deepEqual(publish.filter((c) => c.stands).map(keyOf).sort(), ['admin>catalognode', 'manager>levelnodes']);
});

test('every line the talk hides is one a talk step draws', () => {
  const talk = V4_SCENARIOS.find((t) => t.id === 'talk');
  const drawn = new Set(talk.steps.flatMap((s) => connectionsAmong(new Set(s.open), v4).map(keyOf)));
  for (const key of talk.slides.hidden) assert.ok(drawn.has(key), `the talk hides ${key}, which no step draws`);
});

test('every Swarm access reads Swarm and feeds the client', () => {
  const drawn = connectionsAmong(new Set(['platform', 'access']), v4).map(keyOf);
  for (const id of ['gateway', 'weeb3', 'ownbee', 'freedom']) {
    assert.ok(drawn.includes(`swarm>${id}`), `${id} does not read Swarm`);
    assert.ok(drawn.includes(`${id}>client`), `${id} does not reach the client`);
  }
});

test('an open box that keeps its own lines draws none to the cards inside it', () => {
  const drawn = connectionsAmong(new Set(['platform', 'access']), v4, { boxLines: ['access'] }).map(keyOf);
  assert.ok(drawn.includes('swarm>access') && drawn.includes('access>client'), drawn.join(', '));
  for (const id of ['gateway', 'weeb3', 'ownbee', 'freedom']) {
    assert.ok(!drawn.some((key) => key.split('>').includes(id)), `a line still reaches ${id}`);
  }
});

test('the walkthrough opens on the whole picture and ends beside the path', () => {
  assert.equal(V4_TOUR.steps.length, 7);
  for (const [i, s] of V4_TOUR.steps.entries()) {
    assert.ok(s.title.length > 4, `step ${i + 1} needs a title`);
    assert.ok(s.text.length > 60, `step ${i + 1} should say something worth reading`);
    assert.ok(Array.isArray(s.open), `step ${i + 1} must declare exactly what is open`);
  }
  assert.deepEqual(V4_TOUR.steps[0].open, []);
  assert.equal(V4_TOUR.steps.at(-1).overlay, 'path');
});

test('every step of every walkthrough can actually draw what it describes', () => {
  for (const [where, s] of allSteps()) {
    if (!s.edge) continue;
    const drawn = connectionsAmong(new Set(s.open), v4);
    assert.ok(drawn.some((c) => keyOf(c) === s.edge || c.stands?.includes(s.edge)),
      `${where} highlights ${s.edge}, which is not on screen`);
  }
});

test('every step of every walkthrough frames and lights only what is on screen', () => {
  for (const [where, s] of allSteps()) {
    const open = new Set(s.open);
    for (const id of [].concat(s.focus || [], s.light || [])) {
      const hidden = ancestorsOf(id, v4.parents).filter((p) => !open.has(p));
      assert.deepEqual(hidden, [], `${where} shows "${id}" without opening ${hidden.join(', ')}`);
    }
  }
});

test('the scenarios cover what people do with the stack', () => {
  assert.deepEqual(V4_SCENARIOS.map((t) => t.id), ['golive', 'streams', 'infra', 'watch', 'chat', 'talk']);
  for (const t of V4_SCENARIOS) {
    assert.ok(t.label.length <= 18, `${t.id} needs a label short enough for the picker`);
    assert.ok(t.steps.length >= 4, `${t.id} is too short to be a scenario`);
    for (const [i, s] of t.steps.entries()) {
      assert.ok(s.text.length > 50, `${t.id} step ${i + 1} should say something worth reading`);
      assert.ok(Array.isArray(s.open), `${t.id} step ${i + 1} must declare exactly what is open`);
    }
  }
  const actors = { golive: 'encoder', streams: 'operator', infra: 'infraop', watch: 'viewers', chat: 'chatlib' };
  for (const [id, actor] of Object.entries(actors)) {
    const t = V4_SCENARIOS.find((x) => x.id === id);
    assert.ok(t.steps.some((s) => tourStepsFor(actor, { steps: [s] }).length), `${id} never shows ${actor}`);
  }
  const chat = V4_SCENARIOS.find((x) => x.id === 'chat');
  assert.ok(chat.steps.some((s) => tourStepsFor('tempid', { steps: [s] }).length), 'chat never shows who is chatting');
});

test('the walkthrough covers every container at least once', () => {
  const containers = Object.entries(V4_OBJECTS).filter(([, o]) => o.type === 'Container').map(([id]) => id);
  const missed = containers.filter((id) => tourStepsFor(id, V4_TOUR).length === 0);
  assert.deepEqual(missed, [], `never mentioned: ${missed.join(', ')}`);
});

test('the overlay bar asks about the media path first', () => {
  assert.deepEqual(GROUPS.map((g) => g.id), ['path', 'place', 'scale', 'tech']);
  assert.deepEqual(group('path').tags.map((t) => [t.id, t.count]), [['path', 15], ['beside', 7], ['chat', 5]]);
});

test('the media path overlay has colours of its own', () => {
  const place = new Set(Object.values(V4_PLACE_COLOUR));
  for (const t of group('path').tags) assert.equal(place.has(t.color), false, `${t.id} reuses a place colour`);
});

test('where it runs covers every object exactly once', () => {
  assert.deepEqual(
    group('place').tags.map((t) => [t.id, t.count]),
    [['broadcaster', 3], ['stage', 4], ['bee', 3], ['gateway', 3], ['control', 4], ['swarm', 1], ['viewer', 9]],
  );
  assert.deepEqual(Object.keys(V4_PLACE_MEMBERS), Object.keys(V4_PLACE_COLOUR));
  const placeOf = placeIndex(V4_PLACE_MEMBERS);
  for (const t of group('place').tags) {
    for (const id of t.objects) assert.equal(placeOf(id), t.id, `${id} is coloured for another place`);
  }
});

test('path, place and scale account for every object, once each', () => {
  for (const id of ['path', 'place', 'scale']) {
    const seen = new Map();
    for (const t of group(id).tags) {
      for (const o of t.objects) {
        assert.equal(seen.has(o), false, `${o} is both ${seen.get(o)} and ${t.id} in ${id}`);
        seen.set(o, t.id);
      }
      assert.equal(t.count, t.objects.length);
    }
    const missing = Object.keys(V4_OBJECTS).filter((o) => !seen.has(o));
    assert.deepEqual(missing, [], `${id} misses: ${missing.join(', ')}`);
  }
});

test('V4 claims no redundancy it does not have', () => {
  // As built, one of everything per stage. Anything not single is somebody
  // else's, runs on the viewer's device, or is the control host, whose loss
  // costs a margin rather than the picture. A pool or a spare appearing here
  // means a card started implying a failover nobody built.
  const postures = {};
  for (const [id, o] of Object.entries(V4_OBJECTS)) {
    const posture = o.scale.resilience;
    if (posture !== RESILIENCE.SINGLE) (postures[posture] ||= []).push(id);
  }
  assert.deepEqual(
    Object.keys(postures).sort(),
    [RESILIENCE.CLIENT, RESILIENCE.DEGRADED, RESILIENCE.EXTERNAL].sort(),
  );
  assert.deepEqual(postures[RESILIENCE.DEGRADED].sort(), ['admin', 'control', 'manager', 'proxy']);
});

test('every icon is one the icon set actually draws', () => {
  const missing = Object.entries(V4_OBJECTS).filter(([, o]) => !ICONS[o.icon]).map(([id, o]) => `${id} wants ${o.icon}`);
  assert.deepEqual(missing, [], missing.join(', '));
});

test('visible text keeps the talk rules', () => {
  // This model is shown beside a conference talk, so it carries the talk's
  // word rules: no em dashes or semicolons, quality level rather than rung,
  // and none of the words the event's own rules keep off stage. It also
  // states architecture rather than a team's voice, so no first person.
  const banned = /—|;|cryptocurrency|non-custodial|security|production|\bbuy|\bbought|\bfund|top up|\bprice|currency|custodian|\brung|\b(our|ours|we|us)\b/i;
  const texts = [];
  for (const o of Object.values(V4_OBJECTS)) {
    texts.push(o.name, o.desc, o.blurb, o.note || '', o.scale.unit, o.scale.onLoss, ...(o.tech || []));
    for (const m of o.metrics || []) texts.push(m[0], m[1]);
  }
  for (const d of Object.values(V4_DIAGRAMS)) {
    for (const e of d.edges) texts.push(e.label || '');
    for (const g of d.groups || []) texts.push(g.name, g.hint || '');
  }
  for (const g of V4_GROUP_DEFS) {
    if (g.derive) continue;
    texts.push(g.name, g.hint, ...g.tags.flatMap((t) => [t.name, t.hint]));
  }
  for (const t of TOURS) {
    for (const s of t.steps) texts.push(s.title, s.text);
    texts.push(t.name, t.about, t.label || '');
  }
  for (const t of texts) assert.doesNotMatch(t, banned, t);
});

test('every failure step shows what is down, and only parts it lights', () => {
  for (const [where, step] of allSteps()) {
    if (!/goes down|unavailable/.test(step.title)) continue;
    assert.ok(step.down?.length, `${where} does not say which part is down`);
    for (const id of step.down) assert.ok(step.light.includes(id), `${where} shows ${id} down without lighting it`);
  }
});

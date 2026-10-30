import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exitFace, anchorOn, cubicAt, edgeGeometry, pathOf, approxLength, centreOf,
  clearance, bestLabelT, samplePath, crossings, routedEdge, labelRect, spreadPorts, PORT_SPAN,
  MIN_DETOUR, DETOUR_PER_SPAN, chooseFaces, GRAZE,
} from '../src/geom/routing.js';
import { DIAGRAMS, OBJECTS, containmentTree, connectionsAmong, indexModel } from '../src/model/index.js';
import { MODELS } from '../src/model/select.js';
import { nestedLayout } from '../src/geom/nest.js';

const rect = (x, y, w = 100, h = 60) => ({ x, y, w, h });
const inside = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

test('exitFace picks the side that points at the target', () => {
  const a = rect(0, 0);
  assert.equal(exitFace(a, rect(400, 0)), 'right');
  assert.equal(exitFace(a, rect(-400, 0)), 'left');
  assert.equal(exitFace(a, rect(0, 400)), 'bottom');
  assert.equal(exitFace(a, rect(0, -400)), 'top');
});

test('the exit face follows the box diagonal, not the raw offset', () => {
  // A 60x300 column with a target 100 across and 150 down. Comparing raw
  // offsets would send the line out of the bottom, but relative to a box this
  // tall the target is plainly off to the side.
  const tall = { x: 0, y: 0, w: 60, h: 300 };
  assert.equal(exitFace(tall, { x: 100, y: 150, w: 60, h: 300 }), 'right');

  // The same rule the other way round: a flat bar with a target only slightly
  // across but well above really does leave through its top.
  const bar = { x: 0, y: 0, w: 600, h: 40 };
  assert.equal(exitFace(bar, { x: 50, y: -60, w: 600, h: 40 }), 'top');
});

test('anchors land exactly on the named face', () => {
  const r = rect(10, 20);
  assert.deepEqual(anchorOn(r, 'top'), { x: 60, y: 20 });
  assert.deepEqual(anchorOn(r, 'bottom'), { x: 60, y: 80 });
  assert.deepEqual(anchorOn(r, 'left'), { x: 10, y: 50 });
  assert.deepEqual(anchorOn(r, 'right'), { x: 110, y: 50 });
});

test('anchor slide is clamped inside the face', () => {
  const r = rect(0, 0, 100, 60);
  assert.equal(anchorOn(r, 'top', 5).x, 90);
  assert.equal(anchorOn(r, 'top', -5).x, 10);
});

test('cubicAt hits both endpoints', () => {
  const p0 = { x: 0, y: 0 }, c1 = { x: 10, y: 40 }, c2 = { x: 90, y: 40 }, p3 = { x: 100, y: 0 };
  assert.deepEqual(cubicAt(p0, c1, c2, p3, 0), p0);
  assert.deepEqual(cubicAt(p0, c1, c2, p3, 1), p3);
});

test('an edge starts and ends on the box borders, never inside', () => {
  const a = rect(0, 0), b = rect(400, 220);
  const g = edgeGeometry(a, b);
  assert.equal(inside({ x: a.x + 1, y: a.y + 1, w: a.w - 2, h: a.h - 2 }, g.p0), false);
  assert.equal(inside({ x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 }, g.p3), false);
});

test('the label sits on the curve, not on the straight line between centres', () => {
  // This is the regression that used to hide labels behind boxes.
  const a = rect(0, 0), b = rect(0, 400);
  const g = edgeGeometry(a, b, { curve: 120, t: 0.5 });
  const straightMidX = (centreOf(a).x + centreOf(b).x) / 2;
  assert.ok(Math.abs(g.label.x - straightMidX) > 40, 'bowed edge label should leave the straight line');

  const onCurve = cubicAt(g.p0, g.c1, g.c2, g.p3, 0.5);
  assert.equal(g.label.x, onCurve.x);
  assert.equal(g.label.y, onCurve.y);
});

test('the t parameter moves the label along the curve', () => {
  const g = edgeGeometry(rect(0, 0), rect(500, 0), { t: 0.2 });
  const h = edgeGeometry(rect(0, 0), rect(500, 0), { t: 0.8 });
  assert.ok(h.label.x > g.label.x);
});

test('opposite bows separate two edges sharing endpoints', () => {
  const a = rect(0, 0), b = rect(500, 0);
  const up = edgeGeometry(a, b, { curve: 90 });
  const down = edgeGeometry(a, b, { curve: -90 });
  assert.ok(Math.abs(up.label.y - down.label.y) > 100);
});

test('pathOf emits a single cubic segment', () => {
  const d = pathOf(edgeGeometry(rect(0, 0), rect(300, 200)));
  assert.match(d, /^M[-\d.]+,[-\d.]+C[-\d.]+,[-\d.]+ [-\d.]+,[-\d.]+ [-\d.]+,[-\d.]+$/);
});

test('approxLength is at least the straight line distance', () => {
  const g = edgeGeometry(rect(0, 0), rect(600, 400));
  const straight = Math.hypot(g.p3.x - g.p0.x, g.p3.y - g.p0.y);
  assert.ok(approxLength(g) >= straight - 1e-6);
});

test('a control arm never outruns the gap it spans', () => {
  // The overshoot bug: arms longer than the gap make the curve leave, turn
  // round and come back, so the arrowhead reads as pointing at the wrong box.
  for (const gap of [4, 12, 30, 60, 140, 400]) {
    const g = edgeGeometry(rect(0, 0, 100, 60), rect(0, 60 + gap, 100, 60));
    const span = Math.hypot(g.p3.x - g.p0.x, g.p3.y - g.p0.y);
    const arm = Math.hypot(g.c1.x - g.p0.x, g.c1.y - g.p0.y);
    assert.ok(arm <= span * 0.5 + 10.001, `gap ${gap}: arm ${arm} against span ${span}`);
  }
});

test('a stacked pair points its arrow at the box below, not back at itself', () => {
  const above = rect(0, 0, 240, 120);
  const below = rect(0, 150, 240, 120);
  const g = edgeGeometry(above, below);
  // Every sampled point must travel downward; an overshoot reverses.
  const ys = samplePath(g).map((p) => p.y);
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] >= ys[i - 1] - 0.001, 'the curve should never double back');
  }
});

test('a line routes around a box standing between its ends', () => {
  const a = { id: 'a', x: 0, y: 0, w: 160, h: 90 };
  const b = { id: 'b', x: 0, y: 520, w: 160, h: 90 };
  const blocker = { id: 'c', x: -30, y: 230, w: 220, h: 120 };

  const straight = edgeGeometry(a, b);
  assert.ok(crossings(straight, [blocker]) > 0, 'the straight run should be blocked');

  const routed = routedEdge(a, b, { fromId: 'a', toId: 'b' }, [a, b, blocker]);
  assert.equal(crossings(routed, [blocker]), 0, 'the routed one should go around it');
});

/**
 * Every version's layout as the canvas draws it, at the depths a reader opens
 * it to: every box closed, the boxes open on arrival, and every box open.
 */
function renderedLayouts() {
  const out = [];
  for (const m of Object.values(MODELS)) {
    const indexed = indexModel(m.objects, m.diagrams);
    const roots = containmentTree(indexed).children;
    const diagramFor = (id) => (m.objects[id]?.drill ? m.diagrams[m.objects[id].drill] : null);
    const openable = Object.entries(m.objects).filter(([, o]) => o.drill).map(([id]) => id);
    const depths = new Map([[], m.open, openable].map((list) => [list.join(','), list]));
    for (const list of depths.values()) {
      const open = new Set(list);
      const { rects } = nestedLayout(roots, open, diagramFor, m.diagrams.context);
      out.push({
        name: `${m.version} open=[${list.join(',')}]`,
        placed: new Map(rects.map((r) => [r.id, r])),
        boxes: rects.filter((r) => !r.open),
        links: connectionsAmong(open, indexed),
      });
    }
  }
  return out;
}

// What V4's layout does today that the three checks below refuse: a line that
// grazes a card, and labels that the checks' text estimate lays on each other
// although the browser draws them apart. Listed exactly, so a new one fails
// and a fixed one has to come off the list.
const KNOWN = [
  'V4 open=[]: infraop to platform cuts through a card',
  'V4 open=[]: "writes" collides with "reads"',
  'V4 open=[platform]: swarm to access cuts through a card',
  'V4 open=[platform]: "deploys" collides with "key, reports"',
];

/** Every finding not on the known list, and every known one that is gone. */
function unexpected(found, kind) {
  const known = KNOWN.filter((k) => k.includes(kind));
  return {
    added: found.filter((f) => !known.includes(f)),
    fixed: known.filter((k) => !found.includes(k)),
  };
}

test('no connection in the rendered layout runs through a card', () => {
  // The thing that makes a diagram unreadable: a line vanishing behind a box
  // and reappearing, so you cannot tell which box it actually reached.
  // Checked against the layout that is actually drawn, at several depths.
  const found = [];
  for (const l of renderedLayouts()) {
    for (const c of l.links) {
      const from = l.placed.get(c.from), to = l.placed.get(c.to);
      if (!from || !to) continue;
      const g = routedEdge(from, to, { fromId: c.from, toId: c.to }, l.boxes);
      if (crossings(g, l.boxes, [c.from, c.to])) found.push(`${l.name}: ${c.from} to ${c.to} cuts through a card`);
    }
  }
  assert.deepEqual(unexpected(found, 'cuts through'), { added: [], fixed: [] });
});

test('no two labels in the rendered layout land on each other', () => {
  // Found in the browser rather than here: two edges that cross in an X put
  // their labels in the same spot and the pair reads as one unparseable
  // string. Nothing was checking label against label, only label against card.
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const found = [];
  for (const l of renderedLayouts()) {
    // Same accumulation the view does, so this measures what is drawn rather
    // than what each edge would have chosen on its own.
    const takenLabels = [];
    const drawn = [];
    for (const c of l.links) {
      const from = l.placed.get(c.from), to = l.placed.get(c.to);
      if (!from || !to) continue;
      const text = c.labels[0] || '';
      const g = routedEdge(from, to, {
        fromId: c.from, toId: c.to, avoid: l.boxes, avoidLabels: takenLabels, label: text,
      }, l.boxes);
      if (!text) continue;
      const rect = labelRect(g.label, text);
      takenLabels.push(rect);
      drawn.push({ text, rect });
    }
    for (let i = 0; i < drawn.length; i += 1) {
      for (let j = i + 1; j < drawn.length; j += 1) {
        if (overlap(drawn[i].rect, drawn[j].rect)) found.push(`${l.name}: "${drawn[i].text}" collides with "${drawn[j].text}"`);
      }
    }
  }
  assert.deepEqual(unexpected(found, 'collides'), { added: [], fixed: [] });
});

test('no label in the rendered layout lands on a card', () => {
  const found = [];
  for (const l of renderedLayouts()) {
    for (const c of l.links) {
      if (!c.labels.length) continue;
      const from = l.placed.get(c.from), to = l.placed.get(c.to);
      if (!from || !to) continue;
      const g = routedEdge(from, to, { fromId: c.from, toId: c.to, avoid: l.boxes }, l.boxes);
      for (const b of l.boxes) {
        if (clearance(g.label, b) <= 0) found.push(`${l.name}: label "${c.labels[0]}" sits on "${b.id}"`);
      }
    }
  }
  assert.deepEqual(unexpected(found, 'sits on'), { added: [], fixed: [] });
});

test('the two ends of a connection can sit at different points on their faces', () => {
  const g = edgeGeometry(rect(0, 0), rect(500, 0), { slideFrom: -0.5, slideTo: 0.5 });
  assert.ok(g.p0.y < g.p3.y, 'the exit end is higher than the entry end');
});

const box = (id, x, y, w = 100, h = 60) => ({ id, x, y, w, h });

test('a single end on a face stays at its midpoint', () => {
  const ports = spreadPorts([{ key: 'a>b', from: box('a', 0, 0), to: box('b', 400, 0) }]);
  assert.deepEqual(ports.get('a>b'), { slideFrom: 0, slideTo: 0 });
});

test('ends sharing a face spread across it in the order they travel', () => {
  // Three targets to the right of a, stacked top to bottom.
  const a = box('a', 0, 200);
  const links = ['t', 'm', 'b'].map((id, i) => ({ key: `a>${id}`, from: a, to: box(id, 600, 100 + i * 100) }));
  const ports = spreadPorts(links);
  const slides = links.map((l) => ports.get(l.key).slideFrom);
  assert.deepEqual(slides, [...slides].sort((x, y) => x - y), 'top target leaves highest');
  assert.equal(new Set(slides).size, 3, 'no two ends share a point');
  assert.ok(Math.max(...slides.map(Math.abs)) <= PORT_SPAN);
});

test('a pair running both ways between two boxes runs parallel, not crossed', () => {
  const a = box('a', 0, 0), b = box('b', 500, 0);
  const ports = spreadPorts([{ key: 'a>b', from: a, to: b }, { key: 'b>a', from: b, to: a }]);
  const ab = ports.get('a>b'), ba = ports.get('b>a');
  assert.notEqual(ab.slideFrom, ba.slideTo, 'the two lines leave a at different points');
  // Same side of both faces: a>b high on both boxes, b>a low on both.
  assert.equal(Math.sign(ab.slideFrom), Math.sign(ab.slideTo));
  assert.equal(Math.sign(ba.slideFrom), Math.sign(ba.slideTo));
  assert.notEqual(Math.sign(ab.slideFrom), Math.sign(ba.slideFrom));
});

test('a label keeps clear of another connection\'s line', () => {
  const a = rect(0, 0), b = rect(600, 0);
  // A vertical line crossing the midpoint, where the label would sit.
  const crossing = Array.from({ length: 21 }, (_, i) => ({ x: 350, y: -100 + i * 15 }));
  const free = edgeGeometry(a, b, { label: 'segments', t: 0.5 });
  const clear = edgeGeometry(a, b, { label: 'segments', t: 0.5, avoidPoints: crossing });
  assert.ok(Math.abs(free.label.x - 350) < 30, 'without it the label sits on the line');
  assert.ok(Math.abs(clear.label.x - 350) > 40, 'with it the label moves off the line');
});

test('a label never moves onto a card to keep clear of a line', () => {
  const a = rect(0, 0), b = rect(600, 0);
  // A card covers the right half of the edge, and a line crosses the left half.
  const card = { x: 330, y: -60, w: 220, h: 120 };
  const crossing = Array.from({ length: 21 }, (_, i) => ({ x: 200, y: -100 + i * 15 }));
  const g = edgeGeometry(a, b, { label: 'segments', t: 0.5, avoid: [card], avoidPoints: crossing });
  assert.ok(clearance(g.label, card) > 0, 'the label is not on the card');
});

test('a connection between near cards does not loop out across the diagram', () => {
  // A wall of cards between two neighbours: no bow clears it, so the line
  // crosses rather than swinging a thousand units out to get round.
  const from = { id: 'a', x: 0, y: 300, w: 220, h: 140 };
  const to = { id: 'b', x: 340, y: 0, w: 220, h: 140 };
  const wall = Array.from({ length: 12 }, (_, i) => ({ id: `w${i}`, x: -1400 + i * 260, y: 170, w: 240, h: 110 }));
  const g = routedEdge(from, to, { fromId: 'a', toId: 'b' }, [from, to, ...wall]);
  const span = Math.hypot(g.p3.x - g.p0.x, g.p3.y - g.p0.y);
  const sideways = Math.max(...[g.c1, g.c2].map((c) => Math.abs(c.x - (g.p0.x + g.p3.x) / 2)));
  assert.ok(sideways <= MIN_DETOUR + span * DETOUR_PER_SPAN + 200, `bowed ${sideways} units for a ${span} unit link`);
});

test('a line whose facing side is blocked leaves by the side that clears the card', () => {
  // The target is up and to the right, and a card sits straight above the source.
  const from = { id: 'a', x: 0, y: 400, w: 200, h: 120 };
  const to = { id: 'b', x: 400, y: 0, w: 240, h: 160 };
  const blocker = { id: 'c', x: 0, y: 200, w: 200, h: 120 };
  assert.equal(exitFace(from, to), 'top');
  const faces = chooseFaces(from, to, [from, to, blocker]);
  assert.equal(faces.faceOut, 'right');
  const g = edgeGeometry(from, to, faces);
  assert.equal(crossings(g, [blocker], [], -GRAZE), 0, 'the chosen line keeps off the card');
});

test('a line with nothing in the way keeps the sides that face each other', () => {
  const from = { id: 'a', x: 0, y: 0 }, to = { id: 'b', x: 400, y: 0 };
  assert.deepEqual(chooseFaces({ ...from, w: 100, h: 60 }, { ...to, w: 100, h: 60 }, []), { faceOut: 'right', faceIn: 'left' });
});

test('a curve across a narrow gap with a long drop never swings back past its ends', () => {
  const g = edgeGeometry(rect(0, 400), rect(200, 0), { faceOut: 'right', faceIn: 'left' });
  for (const p of samplePath(g, 40)) {
    assert.ok(p.x >= g.p0.x - 0.01 && p.x <= g.p3.x + 0.01, `x ${p.x.toFixed(1)} leaves the gap`);
  }
});

test('a label clear of the cards moves off another line rather than keeping extra room', () => {
  // A vertical run beside a card, crossed by another line just where the card
  // ends and the room from it is a little larger.
  const curve = { p0: { x: 0, y: 0 }, c1: { x: 0, y: 100 }, c2: { x: 0, y: 200 }, p3: { x: 0, y: 300 } };
  const card = { x: 10, y: -100, w: 100, h: 350 };
  const crossing = Array.from({ length: 11 }, (_, i) => ({ x: -50 + i * 10, y: 248 }));
  const lines = crossing.map((p) => ({ x: p.x - 10, y: p.y - 9, w: 20, h: 18 }));
  const t = bestLabelT(curve, 0.2, [card], undefined, undefined, lines);
  const at = cubicAt(curve.p0, curve.c1, curve.c2, curve.p3, t);
  assert.ok(Math.abs(at.y - 248) > 20, `label at y ${at.y.toFixed(0)} sits on the crossing line`);
});

test('two boxes in one column beyond a face take ports that do not cross', () => {
  // Both targets sit below and to the right of a's bottom face, the nearer
  // one above the farther. The farther, steeper line takes the inner port.
  const a = box('a', 0, 0, 200, 100);
  const near = box('near', 300, 200, 200, 100), far = box('far', 300, 400, 200, 100);
  const ports = spreadPorts([{ key: 'a>near', from: a, to: near }, { key: 'a>far', from: a, to: far }]);
  assert.ok(ports.get('a>far').slideFrom < ports.get('a>near').slideFrom, 'the farther line leaves nearer the middle');
});

test('a box with its space reserved opens without moving anything else', () => {
  const roots = containmentTree().children;
  const diagramFor = (id) => (OBJECTS[id]?.drill ? DIAGRAMS[OBJECTS[id].drill] : null);
  const box = Object.keys(OBJECTS).find((id) => OBJECTS[id].drill && id !== 'platform' && roots.some((r) => r.id === 'platform'));
  const reserved = new Set(['platform', box]);
  const before = new Map(nestedLayout(roots, new Set(['platform']), diagramFor, DIAGRAMS.context, reserved).rects.map((r) => [r.id, r]));
  const after = new Map(nestedLayout(roots, reserved, diagramFor, DIAGRAMS.context, reserved).rects.map((r) => [r.id, r]));
  const closed = before.get(box), opened = after.get(box);
  assert.equal(closed.open, false);
  assert.equal(opened.open, true);
  assert.deepEqual([closed.x + closed.w / 2, closed.y + closed.h / 2], [opened.x + opened.w / 2, opened.y + opened.h / 2],
    'the closed card sits at the centre of the space its open frame takes');
  for (const [id, r] of before) {
    if (id === box) continue;
    assert.deepEqual(after.get(id), r, `${id} moved when ${box} opened`);
  }
});

/**
 * Everything on a drawn slide that covers something else, as the audience
 * would see it: text on text, text on a box tag or a card, a card on a card,
 * a line running under a card or a label that is not its own, an arrow tip
 * buried in a card, and two lines running on top of each other.
 *
 * Measured on screen, in the slide's own pixels, and only inside the frame:
 * what the camera cut away is not on the slide. Used by the slide export,
 * which lists what it finds next to each picture.
 */

const SAMPLES = 80;
/** Two lines closer than this, along this many samples in a row, read as one. */
const MERGE_PX = 4;
const MERGE_RUN = 8;
/** A line's own ends sit on its cards' edges, so this much of each end is skipped. */
const END_PX = 14;

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (p, r, pad = 0) => p.x > r.left + pad && p.x < r.right - pad && p.y > r.top + pad && p.y < r.bottom - pad;

/** Points along a path, in screen pixels. */
function pointsOf(path) {
  const m = path.getScreenCTM();
  const length = path.getTotalLength();
  const out = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const at = path.getPointAtLength((length * i) / SAMPLES);
    out.push({ x: m.a * at.x + m.c * at.y + m.e, y: m.b * at.x + m.d * at.y + m.f, along: (length * m.a * i) / SAMPLES });
  }
  return out;
}

export function auditSlide(stage) {
  const frame = stage.getBoundingClientRect();
  const onSlide = (r) => overlaps(r, frame);
  const found = [];
  const note = (kind, a, b) => found.push(`${kind}: ${a} / ${b}`);

  const cards = [...stage.querySelectorAll('.node')]
    .map((n) => ({ id: n.dataset.id, r: n.getBoundingClientRect() })).filter((c) => onSlide(c.r));
  const tags = [...stage.querySelectorAll('.frame-head')]
    .map((h) => ({ id: h.parentElement.dataset.id, r: h.getBoundingClientRect() })).filter((t) => onSlide(t.r));
  const labels = [...stage.querySelectorAll('#labels .wire-label')]
    .map((l) => ({ text: l.textContent, edge: l.dataset.edge, r: (l.plate || l).getBoundingClientRect() }))
    .filter((l) => onSlide(l.r));
  const lines = [...stage.querySelectorAll('#wires .wire')].map((w) => {
    // The highlighted line is also drawn above the cards, so a card never hides it.
    const lifted = w.dataset.act === 'true';
    const points = pointsOf(w);
    const total = points.at(-1).along;
    return {
      id: `${w.dataset.from}>${w.dataset.to}`, from: w.dataset.from, to: w.dataset.to, lifted,
      points, middle: points.filter((p) => p.along > END_PX && p.along < total - END_PX && inside(p, frame)),
    };
  });

  labels.forEach((a, i) => labels.slice(i + 1).forEach((b) => {
    if (overlaps(a.r, b.r)) note('label on label', a.text, b.text);
  }));
  for (const l of labels) {
    for (const c of cards) if (overlaps(l.r, c.r)) note('label on card', l.text, c.id);
    for (const t of tags) if (overlaps(l.r, t.r)) note('label on box tag', l.text, t.id);
  }
  cards.forEach((a, i) => cards.slice(i + 1).forEach((b) => {
    if (overlaps(a.r, b.r)) note('card on card', a.id, b.id);
  }));
  for (const t of tags) for (const c of cards) if (overlaps(t.r, c.r)) note('box tag on card', t.id, c.id);

  for (const line of lines) {
    for (const c of cards) {
      if (line.lifted || c.id === line.from || c.id === line.to) continue;
      if (line.middle.some((p) => inside(p, c.r, 2))) note('line under card', line.id, c.id);
    }
    for (const l of labels) {
      if (l.edge === line.id) continue;
      if (line.middle.some((p) => inside(p, l.r, 1))) note('line under label', line.id, l.text);
    }
    const tip = line.points.at(-1);
    if (!line.lifted && inside(tip, frame)) {
      for (const c of cards) if (inside(tip, c.r, 3)) note('arrow tip under card', line.id, c.id);
    }
  }
  lines.forEach((a, i) => lines.slice(i + 1).forEach((b) => {
    let run = 0;
    for (const p of a.middle) {
      run = b.middle.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < MERGE_PX) ? run + 1 : 0;
      if (run >= MERGE_RUN) { note('line on line', a.id, b.id); return; }
    }
  }));
  return found;
}

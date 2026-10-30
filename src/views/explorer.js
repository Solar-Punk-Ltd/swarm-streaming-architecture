/**
 * The one view: every object on a single canvas, opened in place.
 *
 * Drilling used to be navigation, which meant the reader lost their place
 * every time they wanted detail. Here a box grows to hold its contents and its
 * neighbours move aside, so the thing you opened stays where you were looking
 * and the level above it stays on screen.
 */

import { OBJECTS, DIAGRAMS, containmentTree, connectionsAmong, CHILD_COUNTS } from '../model/index.js';
import { nestedLayout } from '../geom/nest.js';
import { labelRect, spreadPorts, routedEdge, samplePath, chooseFaces } from '../geom/routing.js';

/** An open box's name tag, in world units, at the slide export's larger type. */
const FRAME_TAG = { left: 12, top: 9, height: 30, perChar: 9.5, chrome: 46 };

/**
 * Where an open box's name tag sits, in world units. Sized from the name at
 * the largest type it is drawn in, the slide export's, so it is never short.
 */
function frameTagRect(r) {
  const name = OBJECTS[r.id].name;
  return {
    x: r.x + FRAME_TAG.left, y: r.y + FRAME_TAG.top,
    w: FRAME_TAG.chrome + name.length * FRAME_TAG.perChar, h: FRAME_TAG.height,
  };
}

export function createExplorerView(scene) {
  let placed = new Map();
  let edges = new Map();
  let cards = new Map();
  let frames = new Map();

  const diagramFor = (id) => (OBJECTS[id]?.drill ? DIAGRAMS[OBJECTS[id].drill] : null);

  /**
   * Draw the canvas with these boxes open. `words` puts other text in place of
   * the model's, as a walkthrough's slides do: `labels: false` leaves every
   * line bare, `hidden` the drawn
   * connections left out, `boxLines` the boxes that keep their own lines while
   * open, `tintBoxes` washes each open box inside the outermost one in its
   * place colour, and `cards` a description by object.
   */
  function render(openIds, { stripesFor, onToggle, reserved = [], words = null } = {}) {
    const open = new Set(openIds);
    const roots = containmentTree().children;

    const { rects, width, height } = nestedLayout(roots, open, diagramFor, DIAGRAMS.context, new Set(reserved));
    placed = new Map(rects.map((r) => [r.id, r]));

    scene.clear();
    scene.setSize(width, height);
    cards = new Map();
    frames = new Map();
    edges = new Map();

    // Edges first so cards sit above them, and obstacles are every visible box
    // so a label never lands on one.
    const obstacles = rects.filter((r) => !r.open);
    // Each label placed becomes an obstacle for the next one, so two crossing
    // edges cannot both claim the same clear gap. An open box's name tag is
    // one from the start: a label on it hides the box's first letters.
    const takenLabels = rects.filter((r) => r.open && OBJECTS[r.id]).map(frameTagRect);
    const links = connectionsAmong(open, undefined, { boxLines: words?.boxLines })
      .map((c) => ({ c, key: `${c.from}>${c.to}`, from: placed.get(c.from), to: placed.get(c.to) }))
      .filter((l) => l.from && l.to && !words?.hidden?.includes(l.key))
      .map((l) => ({ ...l, faces: chooseFaces(l.from, l.to, obstacles) }));
    const ports = spreadPorts(links);
    // Every line is routed once before any label is placed, so a label can
    // keep clear of lines drawn after it as well as before it.
    const lineOf = new Map(links.map(({ c, key, from, to }) => [key, samplePath(
      routedEdge(from, to, { ...ports.get(key), fromId: c.from, toId: c.to, avoid: obstacles }, obstacles),
    ).slice(2, -2)]));
    for (const { c, key, from, to } of links) {
      const text = words?.labels === false ? '' : c.labels[0] ?? '';
      const avoidPoints = text
        ? links.filter((l) => l.key !== key).flatMap((l) => lineOf.get(l.key))
        : null;
      const drawn = scene.edge(from, to, {
        label: text,
        strong: c.strong,
        kind: c.kind || 'media',
        ...ports.get(key),
        avoidPoints,
        fromId: c.from,
        toId: c.to,
        avoid: obstacles,
        avoidLabels: takenLabels,
        obstacles,
      });
      if (text) takenLabels.push(labelRect(drawn.geometry.label, text));
      // A line joined from two authored connections answers to either name.
      drawn.stands = c.stands || [key];
      edges.set(key, drawn);
    }

    for (const rect of rects) {
      const object = OBJECTS[rect.id];
      if (!object) continue;

      if (rect.open) {
        frames.set(rect.id, scene.frame(rect, {
          id: rect.id,
          icon: object.icon,
          title: object.name,
          count: `${CHILD_COUNTS[rect.id]}`,
          scale: object.scale,
          depth: rect.depth,
          tint: Boolean(words?.tintBoxes) && rect.depth > 0,
          onOpen: () => onToggle?.(rect.id),
        }));
      } else {
        const desc = words?.cards?.[rect.id];
        cards.set(rect.id, scene.node(desc ? { ...object, desc } : object, rect, {
          badge: CHILD_COUNTS[rect.id] || null,
          stripes: stripesFor ? stripesFor(rect.id) : null,
        }));
      }
    }

    return { width, height, open };
  }

  /**
   * Light a selection and everything it touches.
   *
   * Selecting a box and seeing only the box is the least useful thing a
   * diagram can do. What matters about a component is what it is wired to, so
   * that is what the selection shows.
   */
  function emphasise({ selected, spotlight, activeEdge, down = [] } = {}) {
    const wired = new Set();
    if (selected) {
      wired.add(selected);
      for (const key of edges.keys()) {
        const [from, to] = key.split('>');
        if (from === selected) wired.add(to);
        else if (to === selected) wired.add(from);
      }
    }

    const lit = spotlight || (selected && wired.size > 1 ? wired : null);
    const [actFrom, actTo] = activeEdge ? activeEdge.split('>') : [];

    for (const [id, card] of cards) {
      const active = id === actFrom || id === actTo;
      card.dataset.dim = String(Boolean(lit) && !lit.has(id) && !active);
      card.dataset.act = String(active);
      card.dataset.selected = String(id === selected);
      card.dataset.wired = String(Boolean(selected) && id !== selected && wired.has(id));
      // A part a step shows as failed says so in words, not in colour alone.
      const failed = down.includes(id);
      card.dataset.down = String(failed);
      let badge = card.querySelector('.n-down');
      if (failed && !badge) {
        badge = document.createElement('span');
        badge.className = 'n-down';
        badge.textContent = 'Down';
        card.append(badge);
      } else if (!failed && badge) badge.remove();
    }
    for (const [id, frame] of frames) {
      frame.dataset.dim = String(Boolean(lit) && !lit.has(id));
      frame.dataset.selected = String(id === selected);
    }

    for (const [key, drawn] of edges) {
      const [from, to] = key.split('>');
      const touches = Boolean(selected) && (from === selected || to === selected);
      const active = drawn.stands.includes(activeEdge);
      const dim = Boolean(lit) && !(lit.has(from) && lit.has(to));

      for (const part of [drawn.line, drawn.tip, drawn.label, drawn.label?.plate]) {
        if (!part) continue;
        part.dataset.dim = String(dim && !active && !touches);
        part.dataset.act = String(active);
        part.dataset.wired = String(touches && !active);
      }

      if ((active || touches) && !drawn.flow && active) {
        const flow = drawn.line.cloneNode();
        flow.setAttribute('class', 'wire-flow');
        delete flow.dataset.act;
        drawn.line.after(flow);
        drawn.flow = flow;
      } else if (!active && drawn.flow) {
        drawn.flow.remove();
        drawn.flow = null;
      }
    }
  }

  const rectOf = (id) => placed.get(id) || null;

  /** Everything that can be opened, for an expand-all affordance. */
  const openable = () => Object.keys(CHILD_COUNTS).filter((id) => CHILD_COUNTS[id] > 0);

  return { render, emphasise, rectOf, openable, get edges() { return edges; } };
}

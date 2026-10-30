/**
 * Wiring. One store, one scene, three views, and a single render pass that
 * every change funnels through, so there is exactly one place where state
 * becomes pixels.
 */

import { OBJECTS, TOURS, tourOf, VALIDATION, ancestorsOf, CHILD_COUNTS, MODEL_ID, ROOT_NAME, INITIAL_OPEN } from './model/index.js';
import { DEFAULT_MODEL } from './model/select.js';
import { createStore } from './state/store.js';
import { createScene } from './render/scene.js';
import { createExplorerView } from './views/explorer.js';
import { createTree } from './ui/tree.js';
import { createInspector } from './ui/inspector.js';
import { createOverlays, stripesFor, filterSpotlight } from './ui/overlays.js';
import { createTour, spotlightOf, focusOf } from './ui/tour.js';
import { createChrome, applyTheme, nextTheme, toast } from './ui/chrome.js';
import { glyph } from './render/icons.js';
import { fitRect, IDENTITY } from './geom/viewport.js';
import { slideCamera } from './geom/slides.js';
import { auditSlide } from './ui/slide-audit.js';

// A broken cross reference renders nothing and throws nothing, so it is worth
// saying out loud rather than leaving someone to wonder why a step is blank.
if (!VALIDATION.ok) {
  console.error(`Model validation failed:\n${VALIDATION.errors.join('\n')}`);
}

// index.html's title names the explorer, which opens on the default model and
// is what a search engine should see. Another version has to say so itself,
// or every tab claims to be the same one.
if (MODEL_ID !== DEFAULT_MODEL) document.title = ROOT_NAME;

const $ = (id) => document.getElementById(id);
const refs = {
  app: $('app'),
  rail: $('rail'),
  versions: $('versions'),
  crumbs: $('crumbs'),
  stage: $('stage'),
  tree: $('tree'),
  inspector: $('inspector'),
  overlays: $('overlays'),
  scenario: $('scenario'),
  palette: $('palette'),
  treeToggle: $('tree-toggle'),
};

/**
 * `?export=` turns the page into one slide picture for tools/slides.js: the
 * canvas alone, light and high contrast, on the deck's background. `step` is
 * the walkthrough step the link names, `stack-closed` and `stack-open` the
 * whole stack. Read once, and marked before the first render so labels are
 * measured in the slide's type sizes.
 */
const EXPORT_KINDS = new Set(['step', 'stack-closed', 'stack-open']);
const query = new URLSearchParams(location.search);
const asked = query.get('export');
const EXPORT = EXPORT_KINDS.has(asked) ? asked : null;
if (EXPORT) refs.app.dataset.export = EXPORT;
// The picture's size, from tools/slides.js. Headless Chrome lays the page out
// in a viewport shorter than the picture it takes, so a canvas sized to the
// viewport is framed for a shorter picture and leaves a band at the bottom.
const PICTURE = /^(\d+)x(\d+)$/.exec(query.get('size') || '');
if (EXPORT && PICTURE) Object.assign(refs.stage.style, { width: `${PICTURE[1]}px`, height: `${PICTURE[2]}px` });

/** A slide's margin in pixels, and the band its card names are drawn in, in pixels. */
const SLIDE_PAD = 48;
const SLIDE_NAME_PX = { floor: 42, cap: 48 };
/** The margin scene.contentRect adds around the cards, taken off for a slide that frames them all. */
const CONTENT_AIR = 34;
/**
 * A slide description's largest type size in world units, its smallest as a
 * share of the name's, the most lines it may take, and the card's bottom
 * padding.
 */
const SLIDE_DESC = { maxPx: 14.5, minShare: 0.6, lines: 3, bottom: 14 };
/** How much larger the highlighted arrow's head is drawn on a slide. */
const SLIDE_TIP_SCALE = 2.6;
/** Where along its line a lit label may sit, as shares of the line's length. */
const LABEL_STOPS = Array.from({ length: 15 }, (_, i) => 0.15 + i * 0.05);
/** The smallest a lit label is drawn to clear the cards, world units: the ordinary label size. */
const LIT_LABEL_MIN_PX = 13;
/** How far a lit label keeps from the ends of the lit lines, world units. */
const LABEL_END_CLEAR = 14;

const scene = createScene(refs.stage);
const explorerView = createExplorerView(scene);

const store = createStore(render, { opened: INITIAL_OPEN });

/* ── Navigation ───────────────────────────────────────────────────────── */

/**
 * Move to an object wherever it lives, switching diagram if the current one
 * does not hold it. Selecting something in the tree should never leave the
 * canvas showing a view that does not contain it.
 */
function goToObject(id) {
  tree.revealPath(id);
  // Selecting something buried has to open the boxes it is buried in, or the
  // canvas shows a selection that is not on screen.
  const opened = new Set(store.get().opened);
  for (const parent of ancestorsOf(id)) opened.add(parent);

  store.set({ selected: id, opened: [...opened], inspector: true });
  // revealPath mutated the tree's own state, which a no-op patch would never
  // flush. Searching for what you are already looking at still has to open
  // the branch it sits in.
  tree.render(store.get());
}

/** Open or close a box in place. */
function openInside(id) {
  if (!CHILD_COUNTS[id]) {
    const object = OBJECTS[id];
    if (object) toast(`${object.name} has nothing inside it.`);
    return;
  }

  const opened = new Set(store.get().opened);
  if (opened.has(id)) {
    // Closing takes everything under it with it, otherwise reopening later
    // springs back to a depth nobody asked for.
    for (const other of [...opened]) if (ancestorsOf(other).includes(id)) opened.delete(other);
    opened.delete(id);
  } else {
    for (const parent of ancestorsOf(id)) opened.add(parent);
    opened.add(id);
  }
  store.set({ opened: [...opened], selected: id });
}

/**
 * Enter the walkthrough, or jump to a step in it.
 *
 * A step declares the exact set of boxes it wants open rather than a set to
 * add, so the walkthrough closes what it is finished with. Following it should
 * feel like being shown around, not like watching things pile up.
 */
function goToStep(index, playing, tourId = store.get().tour) {
  const tour = tourOf(tourId);
  const count = tour.steps.length;
  const next = ((index % count) + count) % count;
  const step = tour.steps[next];

  store.set({
    touring: true,
    tour: tour === TOURS[0] ? null : tour.id,
    step: next,
    playing: playing ?? store.get().playing,
    opened: [...step.open],
    selected: null,
    overlay: step.overlay ?? null,
    solo: [],
    hidden: [],
  });
}

/**
 * Move to a step, carrying the canvas with it.
 *
 * Steps deliberately cross levels of detail, so the diagram is part of the
 * step rather than something the reader has to go and find. Without this the
 * dock happily advances to a step whose connection is on a diagram that is
 * not open, and nothing lights up.
 */


/* ── Components ───────────────────────────────────────────────────────── */

const chrome = createChrome(refs, {
  onSelect: goToObject,
  onExpandAll: () => store.set({ opened: explorerView.openable(), selected: null }),
  onCollapseAll: () => store.set({ opened: [], selected: null }),
  onZoom: (factor) => scene.zoomCentre(factor),
  onFit: () => scene.fit(true),
  onSearch: () => chrome.palette.open(),
  onToggleTheme: () => applyTheme(nextTheme()),
  onPick: (match) => {
    if (match.kind === 'step') {
      const [tourId, index] = match.id.split(':');
      return goToStep(Number(index), false, tourId);
    }
    return goToObject(match.id);
  },
});

const tree = createTree(refs.tree, {
  onSelect: (id) => goToObject(id, { keepView: true }),
  onOpen: openInside,
});

const inspector = createInspector(refs.inspector, {
  onSelect: goToObject,
  onOpenInside: openInside,
  onPlayStep: (index, tourId) => goToStep(index, false, tourId),
  onClose: () => store.set({ inspector: false }),
});

const overlays = createOverlays(refs.overlays, { onChange: (patch) => store.set(patch) });

const tour = createTour(refs.scenario, {
  onStep: goToStep,
  onStop: () => store.set({ touring: false, tour: null, step: 0, playing: false, overlay: null }),
});

scene.on('select', (id) => store.set({ selected: id, inspector: true }));
scene.on('drill', openInside);
/** True when the tree is an overlay rather than a column. Matches app.css. */
const treeFloats = () => matchMedia('(max-width: 900px)').matches;

scene.on('background', () => {
  // A floating tree covers the canvas, so touching the canvas dismisses it.
  // Docked, it is furniture and closing it on a stray click would be rude.
  store.set(treeFloats() && store.get().tree
    ? { selected: null, tree: false }
    : { selected: null });
});
scene.on('camera', (vp) => chrome.zoom.setReading(vp.k));

/* ── Render ───────────────────────────────────────────────────────────── */

let lastSignature = '';
let lastSize = '';

function render(state) {
  // Per render, not module level. Held across renders it keeps a stale true
  // and fits the canvas on some later change that never resized anything.
  let resized = false;
  refs.app.classList.toggle('tree-open', state.tree);
  // A walkthrough lists its steps in the inspector only where the inspector
  // docks beside the canvas. Floating, it would cover what the step shows.
  const inspectorFloats = matchMedia('(max-width: 1080px)').matches;
  refs.app.classList.toggle('inspector-open',
    state.inspector && Boolean(state.selected || (state.touring && !inspectorFloats)));
  // The filter bar and the walkthrough dock want the same strip of canvas, and a
  // walkthrough is a narration rather than a query, so the filters step aside.
  refs.app.classList.toggle('narrating', state.touring);
  refs.treeToggle.setAttribute('aria-pressed', String(state.tree));

  chrome.render(state);
  overlays.render(state);
  tree.render(state);

  scene.setInsets({
    right: inspectorFloats && refs.app.classList.contains('inspector-open')
      ? Math.min(352, innerWidth - 54)
      : 0,
  });

  const playing = tour.render(state);
  const step = playing?.current || null;

  // The canvas is rebuilt only when what it draws changed. Selection, dimming
  // and connection highlighting are restyles, so they never rebuild it and
  // never make the reader watch the whole thing flash.
  // A step may reserve the space of boxes it opens later, which changes the
  // layout as much as opening them does.
  const reserved = step?.layoutOpen || [];
  const signature = [state.opened.join('|'), state.overlay || '', reserved.join('|')].join('::');
  const redrew = signature !== lastSignature;
  if (redrew) {
    lastSignature = signature;
    explorerView.render(state.opened, {
      reserved,
      stripesFor: (id) => stripesFor(id, state.overlay),
      onToggle: openInside,
      // A walkthrough's slides may say things in their own words.
      words: EXPORT ? playing?.tour.slides : null,
    });

    const size = `${scene.size.w}x${scene.size.h}`;
    resized = size !== lastSize;
    lastSize = size;
  }

  explorerView.emphasise({
    selected: state.selected,
    spotlight: spotlightOf(step) || filterSpotlight(state, Object.keys(OBJECTS)),
    activeEdge: step?.edge || null,
    down: step?.down || [],
  });

  // A selection is the reader steering, so it takes the camera even while a
  // step is on screen. Letting the step win means clicking anything during the
  // walkthrough snaps the canvas back to whatever the step was framing, which
  // reads as the diagram yanking itself away from what you just asked to see.
  // Advancing a step clears the selection, so the step frames again by itself.
  //
  // A step that names nothing to look at wants the whole picture back, which
  // is what makes the opening and closing steps feel like breathing out.
  // Deferred a tick either way: the stage may not be laid out yet, and a fit
  // against a zero sized viewport clamps to minimum scale.
  //
  // An exported slide sets its own camera once every step has been measured.
  if (EXPORT) {
    renderInspector(state, playing);
    return;
  }
  const framed = rectsFor(state.selected ? [state.selected] : focusOf(step));
  if (framed) {
    setTimeout(() => scene.frameRect(scene.growRect(framed, 80), {
      animate: true, pad: 70, maxScale: 1.1,
    }), 0);
  } else if (resized || (step && redrew)) {
    setTimeout(() => scene.fit(true), 0);
  }

  renderInspector(state, playing);
}

function rectsFor(ids) {
  const rects = ids.map((id) => explorerView.rectOf(id)).filter(Boolean);
  return rects.length ? scene.boundsOf(rects) : null;
}

function renderInspector(state, playing) {
  if (state.selected) return inspector.renderObject(state.selected);
  if (playing) return inspector.renderTour(playing.tour, playing.step);
  return inspector.renderEmpty();
}

/* ── Keyboard ─────────────────────────────────────────────────────────── */

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) { if (e.key !== 'k' && e.key !== 'K') return; }
  const onControl = Boolean(e.target.closest('button, [role="button"]'));
  const state = store.get();

  if (e.key === 'k' || e.key === 'K') { e.preventDefault(); chrome.palette.open(); return; }

  switch (e.key) {
    case 'Escape':
      if (chrome.palette.isOpen) chrome.palette.close();
      else if (state.touring) store.set({ touring: false, tour: null, step: 0, playing: false, overlay: null });
      else store.set({ selected: null });
      break;
    case 'f': case 'F': scene.fit(true); break;
    case 't': case 'T': store.set({ tree: !state.tree }); break;
    case 'i': case 'I': store.set({ inspector: !state.inspector }); break;
    case 'e': case 'E': store.set({ opened: explorerView.openable(), selected: null }); break;
    case 'c': case 'C': store.set({ opened: [], selected: null }); break;
    case 'ArrowRight':
      if (state.touring) { e.preventDefault(); goToStep(state.step + 1, false); }
      break;
    case 'ArrowLeft':
      if (state.touring) { e.preventDefault(); goToStep(state.step - 1, false); }
      break;
    case ' ':
      // Only when nothing focusable would have used it: Space activates a
      // button, and stealing it would break every control on the page.
      if (state.touring && !onControl) { e.preventDefault(); store.set({ playing: !state.playing }); }
      break;
    default: break;
  }
});

$('scenario-open').addEventListener('click', () => {
  const state = store.get();
  if (state.touring) store.set({ touring: false, tour: null, playing: false, overlay: null });
  else goToStep(0, false, null);
});

refs.treeToggle.addEventListener('click', () => store.set({ tree: !store.get().tree }));
$('search-open').addEventListener('click', () => chrome.palette.open());

/* ── Go ───────────────────────────────────────────────────────────────── */

// A link may name a step, which decides what is open, so settle that before
// the first paint. This cannot rely on the store notifying: when the link
// already holds the right values the patch is a no-op.
const opening = store.get();
if (EXPORT) exportSlide(opening);
else {
  if (opening.touring) goToStep(opening.step, false);

  render(store.get());
  // Only when nothing has already asked for a camera. A link that opens on a
  // walkthrough step has framed what that step is about, and a blanket fit here
  // would throw it straight back out to the whole diagram.
  if (!store.get().touring && !store.get().selected) setTimeout(() => scene.fit(), 0);
}

/** Everything a walkthrough step is about: what it frames, lights and connects. */
function stepIds(step) {
  return [...new Set([...focusOf(step), ...(step.light || []), ...(step.edge ? step.edge.split('>') : [])])];
}

/**
 * What a step's camera frames. A lit open box with lit cards inside it is
 * there as context, and framing the whole box would shrink the cards the
 * step is about.
 */
function framedIds(ids) {
  return ids.filter((id) => !explorerView.rectOf(id)?.open
    || !ids.some((other) => ancestorsOf(other).includes(id)));
}

/** The closed cards one drawn line away from any of these, and not among them. */
function ringOf(ids) {
  const inner = new Set(ids);
  const ring = new Set();
  for (const key of explorerView.edges.keys()) {
    const [from, to] = key.split('>');
    if (inner.has(from) && !inner.has(to)) ring.add(to);
    if (inner.has(to) && !inner.has(from)) ring.add(from);
  }
  return [...ring].filter((id) => refs.stage.querySelector(`.node[data-id="${id}"]`));
}

/** Draw the one slide the link asks for and mark the page ready. */
function exportSlide({ tour: tourId, step: index }) {
  // Set here rather than with data-export: the chrome restores the reader's
  // saved theme when it starts, after that.
  document.documentElement.dataset.theme = 'light';
  // A step the link already names is a no-op patch, which draws nothing, so
  // draw once before anything is measured.
  render(store.get());
  const w = refs.stage.clientWidth, h = refs.stage.clientHeight;
  // The name's own size in world units, so the band is kept on the picture.
  const namePx = parseFloat(getComputedStyle(refs.stage.querySelector('.n-name')).fontSize);
  const band = { pad: SLIDE_PAD, minK: SLIDE_NAME_PX.floor / namePx, maxK: SLIDE_NAME_PX.cap / namePx };
  let camera;
  let look = {};
  if (EXPORT === 'stack-closed' || EXPORT === 'stack-open') {
    store.set({ opened: EXPORT === 'stack-open' ? explorerView.openable() : [], selected: null, overlay: null });
    camera = fitRect(scene.contentRect(), w, h, SLIDE_PAD, undefined, band.maxK) ?? IDENTITY;
  } else {
    const tour = tourOf(tourId);
    look = tour.slides || {};
    if (look.arrowheads === false) refs.app.dataset.arrowheads = 'none';
    const at = Math.min(Math.max(Number.isFinite(index) ? index : 0, 0), tour.steps.length - 1);
    const step = tour.steps[at];
    // The steps of one part share a camera, framed on what all of them are
    // about, so their pictures differ only in what is open and lit and can
    // be laid over each other. Their layout is the same by layoutOpen.
    const together = step.part
      ? tour.steps.map((s, i) => [s, i]).filter(([s]) => s.part === step.part)
      : [[step, at]];
    // A part frames what its steps name in focus, open boxes whole.
    const framed = together.map(([s, i]) => {
      goToStep(i, false, tourId);
      return rectsFor(s.part ? focusOf(s) : framedIds(stepIds(s)));
    }).filter(Boolean);
    goToStep(at, false, tourId);
    refs.stage.dataset.spotlit = String(Boolean(spotlightOf(step)));
    const ids = framedIds(stepIds(step));
    const lit = framed.length ? scene.boundsOf(framed) : scene.growRect(scene.contentRect(), -CONTENT_AIR);
    const ring = together.length > 1 ? [] : ringOf(ids).map((id) => explorerView.rectOf(id));
    camera = slideCamera(lit, ring, w, h, band);
  }
  scene.setView(camera);
  if (refs.stage.dataset.spotlit === 'true') {
    lightPath();
    markContext(look.fadedNames);
  }
  dropCutText(w, h);
  const descPx = fitDescriptions(namePx);
  fitLitLabels();
  // The sizes a card name and a description come out at on the picture, for
  // the deck to check.
  document.body.dataset.namePx = String(Math.round(namePx * camera.k));
  if (descPx) document.body.dataset.descPx = String(Math.round(descPx * camera.k));
  liftHighlightedWire();
  // What covers what on the finished picture, and where everything sits on
  // it, for tools/slides.js to report.
  publishJson('slide-audit', auditSlide(refs.stage));
  publishJson('slide-geometry', geometryOf(camera));
  document.body.dataset.slideReady = 'true';
}

/**
 * A step's path is every line between two lit parts, so all of them take the
 * highlight, not only the one line the step names, except a line to or from a
 * part the step shows as down: a path drawn half orange
 * and half grey says the grey hop is not part of it. An open box counts as lit
 * when a lit card sits inside it, which lights the hop from its edge to the
 * card a line into the box is really meant for.
 */
function lightPath() {
  const litCard = (id) => Boolean(refs.stage.querySelector(`.node[data-id="${id}"]:not([data-dim="true"])`));
  const litCards = [...refs.stage.querySelectorAll('.node:not([data-dim="true"])')].map((n) => n.dataset.id);
  const litBox = (id) => Boolean(refs.stage.querySelector(`.frame[data-id="${id}"]`))
    && litCards.some((card) => ancestorsOf(card).includes(id));
  const lit = (id) => litCard(id) || litBox(id);
  // A part shown as down carries nothing, so its lines fade whatever they join.
  const down = (id) => Boolean(refs.stage.querySelector(`.node[data-id="${id}"][data-down="true"]`));
  for (const [key, drawn] of explorerView.edges) {
    const [from, to] = key.split('>');
    const failed = down(from) || down(to);
    if (!failed && (!lit(from) || !lit(to))) continue;
    for (const part of [drawn.line, drawn.tip, drawn.label, drawn.label?.plate]) {
      if (!part) continue;
      part.dataset.dim = String(failed);
      part.dataset.act = String(!failed);
    }
  }
}

/**
 * A faded card one line away from a lit part keeps its name as context, so the
 * audience can tell what the lit part is wired to. The rest fade to shapes,
 * unless every faded card keeps its name, as a walkthrough's slides may ask.
 */
function markContext(everyName = false) {
  if (everyName) {
    for (const card of refs.stage.querySelectorAll('.node[data-dim="true"]')) card.dataset.context = 'true';
    return;
  }
  const lit = (id) => refs.stage.querySelector(`.node[data-id="${id}"]:not([data-dim="true"]), .frame[data-id="${id}"]:not([data-dim="true"])`);
  for (const key of explorerView.edges.keys()) {
    const [from, to] = key.split('>');
    for (const [near, far] of [[from, to], [to, from]]) {
      const card = refs.stage.querySelector(`.node[data-id="${far}"][data-dim="true"]`);
      if (card && lit(near)) card.dataset.context = 'true';
    }
  }
}

/**
 * Lines run under the cards, so a highlighted one can vanish behind a faded
 * card on its way. On a slide it is the one line the audience must follow, so
 * a copy goes into the label layer, which sits above the cards.
 */
function liftHighlightedWire() {
  const above = document.getElementById('labels');
  for (const part of refs.stage.querySelectorAll('#wires .wire[data-act="true"], #wires .wire-tip[data-act="true"]')) {
    const copy = part.cloneNode(true);
    // The head is drawn for a 1.5 px line. Under a 6 px orange line, against
    // an orange outline, it vanishes, and with it which way the data flows.
    if (copy.classList.contains('wire-tip')) {
      copy.setAttribute('transform', `${copy.getAttribute('transform')} scale(${SLIDE_TIP_SCALE})`);
      copy.classList.add('slide-tip');
    }
    // First in the label layer: above every card, below every label, so the
    // line never strikes through its own label.
    above.prepend(copy);
  }
}

/** Put a value in the page as JSON, for tools/slides.js to read from the dumped DOM. */
function publishJson(id, value) {
  const el = document.createElement('script');
  el.type = 'application/json';
  el.id = id;
  // Escaped, so a label holding "<" cannot end the script element early.
  el.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
  document.body.append(el);
}

/**
 * The camera and every card and open box in picture pixels, so the deck can
 * compose camera moves and zooms between pictures. A world point (wx, wy)
 * lands at (wx * k + x, wy * k + y) on the picture.
 */
function geometryOf(camera) {
  const round = (v) => Math.round(v * 100) / 100;
  const boxes = [...refs.stage.querySelectorAll('.node, .frame')].map((el) => {
    const [x, y, w, h] = ['left', 'top', 'width', 'height'].map((side) => parseFloat(el.style[side]));
    return {
      id: el.dataset.id,
      rect: [round(x * camera.k + camera.x), round(y * camera.k + camera.y), round(w * camera.k), round(h * camera.k)],
      open: el.classList.contains('frame'),
      lit: el.dataset.dim !== 'true',
    };
  });
  return { camera: { k: Math.round(camera.k * 1e6) / 1e6, x: round(camera.x), y: round(camera.y) }, boxes };
}

/**
 * Text the frame cuts reads as a broken screenshot, so a card or an open
 * box's title that crosses the picture's edge keeps its shape and loses its
 * words, and a line's label there goes. The camera keeps lit cards whole, so this only ever takes context.
 */
function dropCutText(w, h) {
  const frame = refs.stage.getBoundingClientRect();
  const cut = (el) => {
    const r = el.getBoundingClientRect();
    return r.left < frame.left || r.top < frame.top || r.right > frame.left + w || r.bottom > frame.top + h;
  };
  for (const card of refs.stage.querySelectorAll('.node')) {
    if (cut(card)) for (const part of card.querySelectorAll('*')) part.style.visibility = 'hidden';
  }
  for (const head of refs.stage.querySelectorAll('.frame-head')) if (cut(head)) head.style.visibility = 'hidden';
  for (const label of refs.stage.querySelectorAll('.wire-label')) {
    if (label.plate && cut(label.plate)) {
      label.remove();
      label.plate.remove();
    }
  }
}

/**
 * Descriptions are drawn only on lit cards, all at one size on a picture, and
 * only whole: a cut sentence reads as a broken one from the stage. The size is
 * the largest at which every description that fits at all fits, no smaller
 * than a share of the name's, and on at most a few lines. A description that
 * does not fit even then is left off rather than cut, because a card never
 * grows past its box and over the lines around it.
 *
 * @returns {number|null} the size used, world units, or null when none is drawn
 */
function fitDescriptions(namePx) {
  const descs = [];
  for (const card of refs.stage.querySelectorAll('.node')) {
    const desc = card.querySelector('.n-desc');
    if (!desc) continue;
    desc.style.webkitLineClamp = 'unset';
    if (card.dataset.dim === 'true' || desc.style.visibility === 'hidden' || !desc.textContent) {
      desc.style.display = 'none';
    } else descs.push({ card, desc });
  }
  const fits = ({ card, desc }) => {
    const line = parseFloat(getComputedStyle(desc).lineHeight);
    return desc.scrollHeight <= roomFor(card, desc) && Math.round(desc.scrollHeight / line) <= SLIDE_DESC.lines;
  };
  const fittingAt = (px) => {
    for (const d of descs) d.desc.style.fontSize = `${px}px`;
    return descs.filter(fits);
  };
  const floor = Math.ceil(namePx * SLIDE_DESC.minShare * 2) / 2;
  const most = fittingAt(floor).length;
  let size = floor;
  for (let px = SLIDE_DESC.maxPx; px > floor; px -= 0.5) {
    if (fittingAt(px).length === most) { size = px; break; }
  }
  const shown = new Set(fittingAt(size));
  for (const d of descs) if (!shown.has(d)) d.desc.style.display = 'none';
  return shown.size ? size : null;
}

/** Space left under a card's heading for its description, in world units. */
function roomFor(card, desc) {
  const scale = card.getBoundingClientRect().height / card.offsetHeight;
  return (card.getBoundingClientRect().bottom - desc.getBoundingClientRect().top) / scale - SLIDE_DESC.bottom;
}

/**
 * A lit line's label is the verb of the step, so it is drawn at the card
 * name's size. It was placed along its line at its ordinary size, so it is
 * placed again at this one: at the point along the line that keeps its pill
 * furthest from the cards, the open boxes' titles and the lit labels already
 * placed.
 */
function fitLitLabels() {
  const rectOf = (el) => ({
    x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height),
  });
  const blockers = [...refs.stage.querySelectorAll('.node')].map(rectOf);
  for (const frame of refs.stage.querySelectorAll('.frame')) {
    const head = frame.querySelector('.frame-head');
    if (head && head.style.visibility !== 'hidden') {
      const at = rectOf(frame);
      blockers.push({ x: at.x + head.offsetLeft, y: at.y + head.offsetTop, w: head.offsetWidth, h: head.offsetHeight });
    }
  }
  // Both ends of every lit line: a label on an arrowhead hides which way it points.
  for (const path of refs.stage.querySelectorAll('#wires .wire[data-act="true"]')) {
    for (const p of [path.getPointAtLength(0), path.getPointAtLength(path.getTotalLength())]) {
      blockers.push({ x: p.x - LABEL_END_CLEAR, y: p.y - LABEL_END_CLEAR, w: LABEL_END_CLEAR * 2, h: LABEL_END_CLEAR * 2 });
    }
  }
  const gap = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
  for (const label of refs.stage.querySelectorAll('.wire-label[data-act="true"]')) {
    const [from, to] = (label.dataset.edge || '').split('>');
    const path = refs.stage.querySelector(`#wires .wire[data-from="${from}"][data-to="${to}"]`);
    if (!path || !label.plate) continue;
    // A lit line leaving an open box's border carries on a lit line into that
    // box, so its label would name one hop twice beside the first.
    if (explorerView.rectOf(from)?.open) {
      label.remove();
      label.plate.remove();
      continue;
    }
    const length = path.getTotalLength();
    // Largest first: the name's size, and smaller only where the label
    // cannot clear the cards at it, because text on text is worse than a
    // smaller verb.
    const sizes = [];
    for (let px = parseFloat(getComputedStyle(label).fontSize); px >= LIT_LABEL_MIN_PX; px -= 1) sizes.push(px);
    const pillAt = (share) => {
      const p = path.getPointAtLength(length * share);
      label.setAttribute('x', p.x.toFixed(1));
      label.setAttribute('y', p.y.toFixed(1));
      const box = label.getBBox();
      const pad = box.height * 0.35;
      return { x: box.x - pad * 1.6, y: box.y - pad / 2, w: box.width + pad * 3.2, h: box.height + pad };
    };
    let best = null;
    for (const px of sizes) {
      label.style.fontSize = `${px}px`;
      best = null;
      for (const share of LABEL_STOPS) {
        const pill = pillAt(share);
        const room = Math.min(...blockers.map((r) => gap(pill, r)));
        // Ties go to the middle of the line, where a label reads as its own.
        if (!best || room > best.room + 0.5 || (Math.abs(room - best.room) <= 0.5 && Math.abs(share - 0.5) < Math.abs(best.share - 0.5))) {
          best = { share, room };
        }
      }
      if (best.room >= 0) break;
    }
    const pill = pillAt(best.share);
    Object.entries({ x: pill.x, y: pill.y, width: pill.w, height: pill.h, rx: pill.h / 2 })
      .forEach(([key, value]) => label.plate.setAttribute(key, value.toFixed(1)));
    blockers.push(pill);
  }
}

// Exposed so an end to end test can assert on real state rather than pixels.
window.explorer = { store, scene, model: { id: MODEL_ID, OBJECTS, TOURS, VALIDATION } };

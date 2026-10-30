/**
 * The walkthrough dock: the overview or one scenario, step by step.
 *
 * A step is not just a caption. It declares which boxes are open, what the
 * camera should frame and what stays lit, so playing it drives the canvas
 * rather than describing it. That is the difference between a narration and a
 * slide deck with a diagram behind it.
 */

import { TOURS, tourOf } from '../model/index.js';
import { glyph } from '../render/icons.js';

const STEP_MS = 8000;

export function createTour(mount, { onStep, onStop }) {
  let timer = null;
  let timerKey = '';

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    timerKey = '';
  }

  // Restart only when the step changed, so unrelated clicks do not reset the
  // countdown and quietly stop the walkthrough advancing.
  function startTimer(index, steps) {
    const key = String(index);
    if (timer && key === timerKey) return;
    if (timer) clearInterval(timer);
    timerKey = key;
    timer = setInterval(() => onStep(index + 1 >= steps ? 0 : index + 1, true), STEP_MS);
  }

  function render({ playing, step, touring, tour: tourId }) {
    if (!touring) { mount.hidden = true; stopTimer(); return null; }

    const tour = tourOf(tourId);
    const index = Math.min(Math.max(step, 0), tour.steps.length - 1);
    const current = tour.steps[index];

    mount.hidden = false;
    mount.dataset.kind = 'tour';

    if (playing) startTimer(index, tour.steps.length);
    else stopTimer();

    mount.replaceChildren(head(tour, index, playing), body(current), rail(tour, index));
    return { tour, step: index, current };
  }

  function head(tour, index, playing) {
    const bar = document.createElement('div');
    bar.className = 'sc-head';

    const kind = document.createElement('span');
    kind.className = 'sc-kind';
    kind.innerHTML = glyph('book', 10);
    kind.append(TOURS.length > 1 ? picker(tour, index) : Object.assign(document.createElement('span'), { textContent: 'Walkthrough' }));

    const name = document.createElement('span');
    name.className = 'sc-name';
    name.textContent = tour.steps[index].title;

    const tools = document.createElement('div');
    tools.className = 'sc-tools';

    const count = document.createElement('span');
    count.className = 'sc-count';
    count.textContent = `${index + 1} / ${tour.steps.length}`;

    tools.append(
      count,
      button('prev', 'Previous', () => onStep(index - 1, false)),
      button(playing ? 'pause' : 'play', playing ? 'Pause' : 'Play', () => onStep(index, !playing)),
      button('next', 'Next', () => onStep(index + 1, false)),
      button('close', 'Leave the walkthrough', () => onStop()),
    );

    bar.append(kind, name, tools);
    return bar;
  }

  function picker(tour, index) {
    const select = document.createElement('select');
    select.className = 'sc-pick';
    select.setAttribute('aria-label', 'Choose a walkthrough');
    for (const t of TOURS) {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.label || 'Overview';
      option.selected = t === tour;
      select.append(option);
    }
    // Autoplay rebuilds the dock, which would close the list mid-choice.
    select.addEventListener('focus', () => { if (timer) onStep(index, false); });
    select.addEventListener('change', () => onStep(0, false, select.value));
    return select;
  }

  function body(step) {
    const wrap = document.createElement('div');
    wrap.className = 'sc-body';
    const text = document.createElement('p');
    text.className = 'sc-text';
    text.textContent = step.text;
    wrap.append(text);
    return wrap;
  }

  function rail(tour, index) {
    const bar = document.createElement('div');
    bar.className = 'sc-steps';
    tour.steps.forEach((s, i) => {
      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'sc-step';
      tick.dataset.done = String(i < index);
      tick.dataset.current = String(i === index);
      tick.title = `${i + 1}. ${s.title}`;
      tick.setAttribute('aria-label', `${i + 1}. ${s.title}`);
      tick.addEventListener('click', () => onStep(i, false));
      bar.append(tick);
    });
    return bar;
  }

  function button(name, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dock-btn';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.innerHTML = glyph(name, 14);
    b.addEventListener('click', onClick);
    return b;
  }

  return { render, stop: stopTimer };
}

/** What a step keeps lit. Null means light everything. */
export function spotlightOf(step) {
  if (!step) return null;
  const ids = new Set(step.light || []);
  if (step.edge) for (const end of step.edge.split('>')) ids.add(end);
  return ids.size ? ids : null;
}

/** What the camera should frame, as a list of object ids. */
export function focusOf(step) {
  if (!step) return [];
  if (Array.isArray(step.focus)) return step.focus;
  if (step.focus) return [step.focus];
  if (step.edge) return step.edge.split('>');
  return [];
}

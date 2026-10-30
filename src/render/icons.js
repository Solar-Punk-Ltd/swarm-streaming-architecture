/**
 * Icon set. Every mark is drawn on a 16x16 grid with a 1.4 stroke so they sit
 * on the same optical weight next to 13px text.
 *
 * The set is deliberately shape-led rather than logo-led: a store reads as a
 * cylinder, a queue as stacked bars, a network as a hexagon. Someone scanning
 * the canvas should be able to tell a database from a service without reading
 * either label. The one logo is Swarm's own mark, on Swarm and its nodes,
 * because that mark is what the audience already knows them by.
 */

const svg = (body, size = 16) =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
  `stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  person: '<circle cx="8" cy="5.2" r="2.6"/><path d="M2.8 14a5.2 5.2 0 0 1 10.4 0"/>',
  system: '<rect x="2" y="3" width="12" height="10" rx="1.6"/><path d="M2 6.4h12"/><circle cx="4.2" cy="4.7" r=".5" fill="currentColor" stroke="none"/>',
  net: '<path d="M8 1.7 13.7 5v6L8 14.3 2.3 11V5z"/><path d="M8 1.7v6.4l5.7 3M8 8.1 2.3 11"/>',
  app: '<rect x="2" y="2.6" width="12" height="10.8" rx="1.6"/><path d="M5.4 6.6h5.2M5.4 9.4h3"/>',
  store: '<ellipse cx="8" cy="4" rx="5.4" ry="2.1"/><path d="M2.6 4v8c0 1.2 2.4 2.1 5.4 2.1s5.4-.9 5.4-2.1V4"/><path d="M2.6 8c0 1.2 2.4 2.1 5.4 2.1s5.4-.9 5.4-2.1"/>',
  stream: '<path d="M1.8 8h2.6l1.9-4.4L8.6 12l1.7-4h3.9"/>',
  shield: '<path d="M8 1.9 13.2 4v4.6c0 3.1-2.3 5-5.2 5.6C5.1 13.6 2.8 11.7 2.8 8.6V4z"/>',
  eye: '<path d="M1.4 8S4 3.6 8 3.6 14.6 8 14.6 8 12 12.4 8 12.4 1.4 8 1.4 8Z"/><circle cx="8" cy="8" r="1.9"/>',
  queue: '<rect x="2" y="3" width="12" height="3" rx="1"/><rect x="2" y="7.6" width="12" height="3" rx="1"/><path d="M4.6 13.4h6.8"/>',
  // An arch: a way in, not a shield, which read as security or first aid.
  gateway: '<path d="M2.4 14V7.6a5.6 5.6 0 0 1 11.2 0V14"/><path d="M5.6 14V8.4a2.4 2.4 0 0 1 4.8 0V14"/><path d="M1.6 14h12.8"/>',
  server: '<rect x="2.4" y="2.4" width="11.2" height="4.6" rx="1.2"/><rect x="2.4" y="9" width="11.2" height="4.6" rx="1.2"/><path d="M5 4.7h.1M5 11.3h.1"/>',
  layers: '<path d="M8 2 14 5.2 8 8.4 2 5.2z"/><path d="m2 8.4 6 3.2 6-3.2M2 11.2 8 14.4l6-3.2"/>',
  upload: '<path d="M8 10.4V2.6M5 5.6 8 2.6l3 3"/><path d="M2.6 10.2v2.4c0 .6.4 1 1 1h8.8c.6 0 1-.4 1-1v-2.4"/>',
  player: '<rect x="1.8" y="2.8" width="12.4" height="9" rx="1.4"/><path d="M6.6 5.4v3.8L9.8 7.3z" fill="currentColor"/><path d="M5 14h6"/>',
  // Swarm's mark, from the streaming client's logo, drawn 54 units square.
  swarm: '<g transform="translate(1.45 1.45) scale(.2433)" fill="currentColor" stroke="none"><path d="M12.5401 24.8118L25.0802 32.0366V46.4915L12.5401 53.7187L0 46.4919V32.039L12.5401 24.8118Z"/><path d="M41.2374 24.8118L53.7774 32.0362V46.4915L41.2374 53.7187L28.6974 46.4915V32.0384L41.2374 24.8118Z"/><path d="M26.8887 0L33.1482 3.61537L33.1545 10.8411L39.4202 14.4664V21.6802L26.8887 28.9068L14.3575 21.6802V7.22718L26.8887 0Z"/><path d="M39.4298 0L45.6858 3.61331V10.8386L39.4202 14.4664L39.4298 7.22042L33.1482 3.61537L39.4298 0Z"/></g>',
  browser: '<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="1.6"/><path d="M1.8 5.8h12.4"/><circle cx="8" cy="9.6" r="2.3"/><path d="M5.7 9.6h4.6"/>',
  chat: '<path d="M2.4 3.4h11.2c.5 0 .9.4.9.9v6.4c0 .5-.4.9-.9.9H7.2l-3 2.4v-2.4H2.4c-.5 0-.9-.4-.9-.9V4.3c0-.5.4-.9.9-.9z"/>',
  key: '<circle cx="5.2" cy="10.6" r="2.9"/><path d="M7.3 8.5 13.6 2.2M11.2 4.6l1.9 1.9M9.4 6.4l1.4 1.4"/>',
  tag: '<path d="M2.6 2.6h5l6 6-5 5-6-6z"/><circle cx="5.4" cy="5.4" r="1"/>',
  sliders: '<path d="M2.4 4.4h11.2M2.4 8h11.2M2.4 11.6h11.2"/><circle cx="5.4" cy="4.4" r="1.4" fill="currentColor"/><circle cx="10.4" cy="8" r="1.4" fill="currentColor"/><circle cx="7" cy="11.6" r="1.4" fill="currentColor"/>',
  wrench: '<path d="M10.6 2.3a3.3 3.3 0 0 0-4 4.1L2.5 10.5a1.5 1.5 0 0 0 2.1 2.1l4.1-4.1a3.3 3.3 0 0 0 4.1-4l-1.9 1.9-1.9-.3-.3-1.9z"/>',
  lock: '<rect x="3" y="7" width="10" height="7" rx="1.4"/><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7"/><path d="M8 10v1.4"/>',
};

/** Marks used in chrome rather than on the canvas. */
export const GLYPHS = {
  chevron: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  chevronDown: '<path d="M3.5 6 8 10.5 12.5 6"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  expand: '<path d="M9.6 2.4h4v4M6.4 13.6h-4v-4M13.6 2.4 9.4 6.6M2.4 13.6l4.2-4.2"/>',
  collapse: '<path d="M13.4 6.6h-4v-4M2.6 9.4h4v4M9.4 6.6l4-4M6.6 9.4l-4 4"/>',
  play: '<path d="M4.6 3.2 12.6 8l-8 4.8z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4.4" y="3.4" width="2.6" height="9.2" rx="1" fill="currentColor" stroke="none"/><rect x="9" y="3.4" width="2.6" height="9.2" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<path d="M10.4 3.4 5.6 8l4.8 4.6"/>',
  next: '<path d="M5.6 3.4 10.4 8l-4.8 4.6"/>',
  search: '<circle cx="7.2" cy="7.2" r="4.4"/><path d="M10.5 10.5 13.8 13.8"/>',
  layers: '<path d="M8 2 14 5.2 8 8.4 2 5.2z"/><path d="m2 8.4 6 3.2 6-3.2M2 11.2 8 14.4l6-3.2"/>',
  tree: '<path d="M3 4h10M6 8h7M6 12h7M3 4v8"/>',
  target: '<circle cx="8" cy="8" r="5.4"/><circle cx="8" cy="8" r="1.6"/><path d="M8 .8v2.2M8 13v2.2M.8 8H3M13 8h2.2"/>',
  tag: '<path d="M2.6 2.6h5l6 6-5 5-6-6z"/><circle cx="5.4" cy="5.4" r="1"/>',
  sun: '<circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3.1 3.1l1.3 1.3M11.6 11.6l1.3 1.3M12.9 3.1l-1.3 1.3M4.4 11.6l-1.3 1.3"/>',
  moon: '<path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z"/>',
  book: '<path d="M2.6 3.2h4.2c.9 0 1.2.6 1.2 1.3v9c0-.7-.3-1.3-1.2-1.3H2.6z"/><path d="M13.4 3.2H9.2c-.9 0-1.2.6-1.2 1.3v9c0-.7.3-1.3 1.2-1.3h4.2z"/>',
  warn: '<path d="M8 2.4 14.6 13.6H1.4z"/><path d="M8 6.6v3.2M8 11.8v.1"/>',
};

export const icon = (name, size) => svg(ICONS[name] || ICONS.app, size);
export const glyph = (name, size = 16) => svg(GLYPHS[name] || '', size);

/**
 * The shape a card takes, derived from what the object is rather than set by
 * hand, so a new object of a known type looks right without extra data. An
 * object may name its shape instead, when its icon says what it is and the
 * outline should still say how it behaves, as a Bee node keeps its cylinder.
 */
export function shapeOf(object) {
  if (object.shape) return object.shape;
  if (object.icon === 'store') return 'cylinder';
  if (object.icon === 'queue') return 'stack';
  if (object.type === 'External actor') return 'actor';
  if (object.type === 'Software system' || object.type === 'External system') return 'system';
  return 'box';
}

/**
 * The camera for one slide exported from a walkthrough step.
 *
 * A slide is read from the back of a hall, so the card names have a size
 * band: never larger than the cap, and never smaller than the floor while the
 * lit parts still fit at it. Within that band the frame takes the lit parts
 * and the cards one line away from them, which say what the lit parts are
 * wired to. When that ring does not fit at the floor, the lit parts are kept
 * whole and the ring is cut at the frame's edge.
 */

import { boundsOf } from './viewport.js';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * @param {{x,y,w,h}} lit        what the step is about, world units
 * @param {Array<{x,y,w,h}>} ring  the cards one line away from it
 * @param {number} minK  scale at which a card name reaches the floor
 * @param {number} maxK  scale at which a card name reaches the cap
 * @returns {{k:number,x:number,y:number}}
 */
export function slideCamera(lit, ring, viewW, viewH, { pad = 48, minK, maxK }) {
  const fit = (r) => Math.min((viewW - 2 * pad) / r.w, (viewH - 2 * pad) / r.h);
  const all = ring.length ? boundsOf([lit, ...ring]) : lit;
  // Never below what the lit parts need to stay whole, never above the cap.
  const k = Math.min(maxK, Math.max(fit(all), Math.min(minK, fit(lit))));
  const halfW = (viewW / 2 - pad) / k, halfH = (viewH / 2 - pad) / k;
  // Centred on everything framed, then slid so the lit parts stay whole.
  const cx = clamp(all.x + all.w / 2, lit.x + lit.w - halfW, lit.x + halfW);
  const cy = clamp(all.y + all.h / 2, lit.y + lit.h - halfH, lit.y + halfH);
  return { k, x: viewW / 2 - cx * k, y: viewH / 2 - cy * k };
}

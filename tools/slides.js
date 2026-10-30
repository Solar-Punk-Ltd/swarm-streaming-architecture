/**
 * Export every walkthrough step of a model as a slide picture.
 *
 *   npm run slides [-- --model v1]
 *
 * The model is V4 unless --model names another, and its pictures go into
 * slides/<model>/, which git ignores.
 *
 * Builds the single-file explorer, opens it once per step in headless Chrome
 * with `?export=step`, and writes one 1920 x 800 PNG per step. For V4, two
 * more show the whole stack, every box closed and every box open.
 * slides/<model>/index.json lists every picture with its walkthrough, step
 * title and step text, and its geometry: the camera and every card and open
 * box in picture pixels, lit or faded, so a deck can compose camera moves
 * between pictures. The story walkthrough is also shot at 3840 x 1600 into
 * slides/<model>/2x/, for a deck that zooms into its pictures.
 *
 * Chrome is the only thing it needs that this repository does not carry. It
 * looks in the usual macOS place, or wherever CHROME_BIN points.
 */

import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { MODELS, V4_MODEL } from '../src/model/select.js';
import { parseArgs } from 'node:util';

const run = promisify(execFile);

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = join(ROOT, 'dist', 'index.html');
const { values: ARGS } = parseArgs({ options: { model: { type: 'string', default: V4_MODEL } } });
const MODEL = ARGS.model;
if (!MODELS[MODEL]) throw new Error(`no model named "${MODEL}"`);
const OUT = join(ROOT, 'slides', MODEL);
// Pictures are taken here and moved into OUT only once every one succeeded,
// so a failed run leaves the last set as it was.
const STAGING = join(ROOT, 'slides', `.staging-${MODEL}`);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const WIDTH = 1920;
const HEIGHT = 800;
// Walkthroughs whose pictures a deck zooms into, also shot at twice the
// pixels with the same framing, into slides/<model>/2x/.
const SHARP = new Set(['talk']);
const SHARP_SCALE = 2;
const SHARP_DIR = '2x';
const PARALLEL = 4;
// Virtual time, not wall time: Chrome fast-forwards the page's timers, so the
// whole walkthrough is drawn and measured before the picture is taken.
const SETTLE_MS = 4000;

/** The overview's id is given when the model is indexed, not in its literal. */
const tourId = (tour) => tour.id ?? 'overview';

function slidesOf(tours) {
  const slides = [];
  for (const tour of tours) {
    tour.steps.forEach((step, index) => slides.push({
      file: `${tourId(tour)}-${index}.png`,
      query: `touring=1&tour=${tourId(tour)}&step=${index}&export=step`,
      entry: {
        walkthrough: tourId(tour),
        walkthroughName: tour.name,
        walkthroughLabel: tour.label || 'Overview',
        step: index,
        steps: tour.steps.length,
        ...(step.part ? { part: step.part } : {}),
        title: step.title,
        text: step.text,
      },
    }));
  }
  // The whole stack closed and open is a V4 picture only.
  for (const [kind, title, text] of MODEL !== V4_MODEL ? [] : [
    ['stack-closed', 'The whole stack, every box closed', 'Every container of the V4 streaming stack, closed.'],
    ['stack-open', 'The whole stack, every box open', 'Every container of the V4 streaming stack, open, with the components inside each.'],
  ]) {
    slides.push({ file: `${kind}.png`, query: `export=${kind}`, entry: { walkthrough: kind, title, text } });
  }
  return slides;
}

/** Width and height from a PNG's header, so a bad picture fails here. */
async function pngSize(path) {
  const head = (await readFile(path)).subarray(0, 24);
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
}

/** The JSON a drawn page published in the script element with this id, or null. */
function published(dom, id) {
  const found = new RegExp(`<script type="application/json" id="${id}">([^<]*)</script>`).exec(dom);
  return found ? JSON.parse(found[1]) : null;
}

/** Take one picture at a device scale. Returns the page's DOM once drawn. */
async function take(slide, path, scale) {
  const profile = await mkdtemp(join(tmpdir(), 'slides-'));
  const url = `${pathToFileURL(PAGE).href}?model=${MODEL}&size=${WIDTH}x${HEIGHT}&${slide.query}`;
  let dom;
  try {
    ({ stdout: dom } = await run(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${profile}`, `--force-device-scale-factor=${scale}`,
      `--window-size=${WIDTH},${HEIGHT}`, `--virtual-time-budget=${SETTLE_MS}`,
      `--screenshot=${path}`, '--dump-dom', url,
    ], { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 }));
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
  // The page marks itself ready once the slide is drawn. A picture taken
  // before that is of a half drawn canvas.
  if (!/data-slide-ready="true"/.test(dom)) throw new Error(`${slide.file}: the page never finished drawing`);
  const size = await pngSize(path);
  if (size.w !== WIDTH * scale || size.h !== HEIGHT * scale) {
    throw new Error(`${slide.file} at ${scale}x is ${size.w} x ${size.h}, not ${WIDTH * scale} x ${HEIGHT * scale}`);
  }
  return dom;
}

async function shoot(slide) {
  const dom = await take(slide, join(STAGING, slide.file), 1);
  slide.entry.namePx = Number(/data-name-px="(\d+)"/.exec(dom)?.[1]) || null;
  slide.entry.descPx = Number(/data-desc-px="(\d+)"/.exec(dom)?.[1]) || null;
  slide.entry.overlaps = published(dom, 'slide-audit');
  slide.entry.geometry = published(dom, 'slide-geometry');
  if (!SHARP.has(slide.entry.walkthrough)) return;
  // Same layout in CSS pixels, so the same framing and the same geometry,
  // each of it doubled on the sharp picture.
  const sharp = await take(slide, join(STAGING, SHARP_DIR, slide.file), SHARP_SCALE);
  if (JSON.stringify(published(sharp, 'slide-geometry')) !== JSON.stringify(slide.entry.geometry)) {
    throw new Error(`${slide.file}: the ${SHARP_SCALE}x picture is framed differently`);
  }
  slide.entry.file2x = `${SHARP_DIR}/${slide.file}`;
}

async function main() {
  await run(process.execPath, [join(ROOT, 'tools', 'bundle.js')]);
  await rm(STAGING, { recursive: true, force: true });
  await mkdir(join(STAGING, SHARP_DIR), { recursive: true });

  const slides = slidesOf(MODELS[MODEL].tours);
  const queue = [...slides];
  const failed = [];
  // Every worker runs to the end, so a failure stops no other Chrome halfway
  // and every failing picture is named, not just the first.
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let slide = queue.shift(); slide; slide = queue.shift()) {
      await shoot(slide).catch((error) => failed.push(error.message));
    }
  }));
  if (failed.length) {
    await rm(STAGING, { recursive: true, force: true });
    throw new Error(`no pictures were published:\n${failed.join('\n')}`);
  }

  await mkdir(join(OUT, SHARP_DIR), { recursive: true });
  // A step that no longer exists must not leave its old picture behind.
  for (const dir of [OUT, join(OUT, SHARP_DIR)]) {
    for (const name of await readdir(dir)) if (name.endsWith('.png')) await rm(join(dir, name));
  }
  for (const slide of slides) {
    await rename(join(STAGING, slide.file), join(OUT, slide.file));
    if (slide.entry.file2x) await rename(join(STAGING, slide.entry.file2x), join(OUT, slide.entry.file2x));
  }
  await rm(STAGING, { recursive: true, force: true });

  const index = {
    model: MODEL,
    width: WIDTH,
    height: HEIGHT,
    background: '#EEEFF1',
    // Geometry is in the 1x picture's pixels. On a 2x picture multiply it by sharpScale.
    sharpScale: SHARP_SCALE,
    images: slides.map((s) => ({ ...s.entry, file: s.file })),
  };
  await writeFile(join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`wrote ${slides.length} pictures and index.json to ${OUT}`);
  for (const s of slides) {
    for (const o of s.entry.overlaps || []) console.log(`  ${s.file}  ${o}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

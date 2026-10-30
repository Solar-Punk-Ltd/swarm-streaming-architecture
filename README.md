# Swarm streaming architecture

An interactive explorer of live streaming over Swarm, version by version. Each
version is one model on one canvas: boxes open in place to show what runs
inside them, guided walkthroughs carry the canvas with them, and every
component says how many of it run and what stops when it stops.

## The versions

| Version | What it is | Link |
| --- | --- | --- |
| V1, client side streaming (PoC), 2024 | Two browser tabs and Swarm between them. The streamer's tab records the camera and writes 2 s slices to Swarm, named in order in a feed. The viewer's tab reads the feed and plays the slices. Both reach Swarm through a Bee node's API, and nothing else runs on a server. | `?model=v1` |
| V2 and V3, MSSD then MSRS, 2025 | Built on standards: RTMP or SRT in, HLS out, OBS and hls.js at the two ends. An ingestion server cuts the stream into segments, a gateway of Bee nodes writes them to Swarm, and two aggregators keep the stream list and the chat on Swarm. Told through MSRS. | `?model=msrs` |
| V4, event stage streaming, 2026 | Built for event stages: a pluggable stream engine making 4 quality levels, one Bee node per level, management services, and a client that reads Swarm through the event gateway, the viewer's own Bee node or a Swarm node in the browser tab. | `?model=v4` |

The version selector in the top bar switches between them, and a link that
names no version opens V4.

## Run it

```bash
npm run dev
```

Then open http://127.0.0.1:4173. Native ES modules need a real origin, so
opening `index.html` off the filesystem will not work.

```bash
npm test      # no browser needed
npm run build # one self-contained file, dist/index.html
```

There are no dependencies. Not "few", none: no lockfile and no
`node_modules`. Node 20 or later is all it needs.

The built file carries all three versions and needs no server and no network,
so any host that serves a static file can serve it. Every push to main runs
the tests, builds that file and publishes it to GitHub Pages, at
https://solar-punk-ltd.github.io/swarm-streaming-architecture/.

## The canvas

One canvas over the whole model. Every container is a box that opens in place
to show what runs inside it, so context, containers and components are one
picture at whatever depth the reader opens, never separate diagrams to switch
between. Opening a box replaces each arrow that touched it with the finer arrows
inside. The tree on the left is the same containment as a list, and the
inspector on the right reads whatever is selected: what it is, how many run,
what stops when it stops, and what it is wired to.

## Walkthroughs

Every version has an overview and a story, which walks the version step by
step. V4 adds five scenarios: going live, managing streams, managing infra,
watching and chatting. A picker in the walkthrough dock switches between them.
A step declares exactly which boxes are open, what the camera frames and which
arrow lights, so playing one carries the canvas with it and nobody has to
navigate to follow it.

## Overlays

Filters painted on the canvas instead of a separate diagram per question. Click
a tag to solo it, shift click to hide it. Each version brings its own groups,
and every version has where it runs, scale and technology.

## Keys

| Key | Does |
| --- | --- |
| `K` | Search objects, views and walkthrough steps |
| `E` / `C` | Open every box / close every box |
| `F` | Fit to view |
| `T` / `I` | Tree / inspector |
| `←` `→` | Step the walkthrough |
| `Space` | Play or pause |
| `Esc` | Back out of whatever is open |

## Slides

`npm run slides -- --model v1`, or `msrs` or `v4`, exports every walkthrough
step of that version as a 1920 x 800 picture into `slides/<model>/`, with an
`index.json` that lists each picture with its walkthrough, step title, step
text and geometry: the camera and every card and open box in picture pixels,
so a deck can compose camera moves between pictures. Each picture is the
explorer itself opened with `?export=`: the canvas alone, light and high
contrast, with the step's parts and every line between them outlined. The story
walkthrough is also shot at 3840 x 1600 into `slides/<model>/2x/`. It needs
Chrome, found in the usual macOS place or at `CHROME_BIN`.

## Layout

```
src/
  model/     the three versions, validation and derived indexes
    v1/  msrs/  v4/   objects, diagrams, walkthroughs and tags per version
  geom/      viewport, edge routing, containment layout   (pure, unit tested)
  render/    the canvas engine, the icon set, three stylesheets
  views/     the nested explorer canvas
  ui/        tree, inspector, overlays, walkthrough dock, chrome
  state/     the store and the URL it serialises to
test/        node --test, no browser
tools/       dev server, single-file bundler, slide export
```

Three things are worth knowing before changing anything.

**A model is plain literals.** `objects.js`, `diagrams.js`, `tour.js` and
`tags.js` have no rendering knowledge at all. Replacing them replaces the
content without touching a view.

**Cross references are validated, not trusted.** An edge naming a node the
diagram does not place, a drill target that no longer exists, a walkthrough
step pointing at a renamed connection: none of those throw, they just silently
render nothing. `src/model/schema.js` turns every one into a failing test and
a refused build.

**Everything shareable is in the URL.** Version, selection, opened boxes,
overlay, solo and hidden tags, walkthrough and step. Sending "look at this"
should mean sending a link.

## Deliberate omissions

**Boxes do not move.** This is a reader, not an editor. A layout anyone can
drag is a layout nobody can trust, and there is nowhere to save it back to.

**No proven, designed or unproven status.** It was tried and cut. Amber does
one job here, which is selection and the drill affordance.

**No minimap.** Also tried and cut.

## Known limits

V4's layout has four spots that the rendered-layout checks in
`test/routing.test.js` would refuse, listed there exactly: with every box
closed, the infra operator's line grazes a card and the writes and reads
labels sit close together, and with the stack open, the line from Swarm to
Swarm access grazes a card and two labels by the control host sit close
together. The browser draws those labels apart. A new spot fails the tests,
and a fixed one has to come off the list.

## License

MIT, see [LICENSE](LICENSE).

## Browser notes, learned the hard way

`requestAnimationFrame` never fires in a hidden document, and an embedded
preview pane is a hidden document. Camera glides use `setInterval` so they land
regardless, and nothing correctness bearing waits for a frame.

`clientWidth` reads zero before the grid resolves, so `fitRect` returns `null`
rather than a scale clamped to the minimum with the diagram stranded in a
corner. The caller retries.

Grid regions carry an explicit `grid-column`. Auto-placement shifts the canvas
and the inspector one column left the moment a side column collapses, which
looks exactly like a bug in the canvas.

A collapsed grid column will not reach zero width while it still carries
padding and a border, so both are zeroed with it.

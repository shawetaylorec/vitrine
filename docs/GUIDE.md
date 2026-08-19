# Laying out a case

A walk through the whole job, in the order you would actually do it.

## 1. The case

Top left, set **W**, **H** and **D** in centimetres. Depth matters as much as the other
two — it is what the plan view is drawn against and what the overhang warnings check.

**Hanging rail height** is where wires attach at the top of the case. Everything hung
measures its wire lengths down from there, so getting it right once saves correcting
every object later.

Three toggles control the drawing furniture: **Grid** (the 10 cm squares),
**Dimensions** (the arrows, and the dashed witness lines off whatever is selected) and
**Rulers** (the cm scales down the side and across the top). Turning the rulers off
reclaims the gutter, so the case gets bigger rather than leaving an empty margin.

Under **Back wall** you can set a colour, or upload an image of the actual case
interior with **Whole wall**. It dresses the elevation only — the plan keeps its own
tone, because in plan you are looking down at the deck, not at the wall.

**+ Graphic on the wall** is for a single picture rather than the whole surface. It runs
the same cut-out and sizing steps as an object, then fixes the result flat to the back
at whatever height you set — so you can cut a photograph out of its background and hang
it on the wall like artwork.

## 2. Structure before objects

Add shelves and plinths first, so that objects have something to land on.

- **Shelf** — spans the case by default. Its **height** is the top surface, which is
  what objects rest on.
- **Plinth** — a block on the floor with its own width, depth and height.

Anything new steps clear of whatever is already there rather than landing on top of it,
so a second plinth never hides behind the first.

Both can be dragged in either view, and the two views do different jobs:

- **In elevation**, moving a plinth takes everything standing on it — and anything stuck
  to its front — along with it. You are moving the plinth *and its contents* as a unit.
- **In plan**, things *resting* on the plinth stay where they are — that is how you slide
  an object about its top, or work out where on the deck the plinth itself should sit.
  Anything *stuck to a face* still travels with it: it is glued on, and it is barely more
  than a line in plan, so leaving it behind would only strand it off the plinth.

### A plinth's face

Select a plinth and there is an **Its face** section: a colour, a picture with a strength
slider, and **+ Graphic on this face** — which runs the same cut-out and sizing steps as
any object and then fixes the result to that plinth, so it can be moved and resized
afterwards. The same three things the back wall has.

A plinth with no colour or picture is drawn hatched. The hatch means "no material
given", so it disappears once you give it one.

## 3. Adding an object

Drop an image on the sheet, paste one with <kbd>Ctrl</kbd>+<kbd>V</kbd>, or press
**Add object**. Three steps follow, and you can jump between them with the numbered
chips at the top.

### Step 1 — Cut out

The background is removed automatically as soon as the picture opens. If it is not
right:

- **Tolerance** — raise it if flecks of background survive, lower it if the object is
  being eaten.
- **From edges / Everywhere** — *from edges* works inwards from the border, so anything
  enclosed by the object survives. That is right for solid objects. *Everywhere* keys
  the colour out of the entire picture, inside the object as well. That is what you
  need for openwork — a rete, a pierced mount, anything you can see through. It will
  bite into the object wherever the object shares the background colour.
- **Pick colour** — click the actual background in the picture. Both passes then work
  from that colour rather than guessing from the border average. Worth doing whenever
  the backdrop is dark.
- **Wand** — click a patch of background to clear just that patch.
- **Erase** / **Restore** — paint by hand. Scroll to zoom right in; the brushes work at
  any magnification.
- **Crop** — drag a box round what you want to keep, then **Apply crop**. Useful for
  getting rid of colour charts, rulers and label cards before anything else.
- **Orientation** — rotate 90° either way, flip either axis. This turns the picture
  itself, so the width and height swap with it. Use it when a photograph is on its
  side or upside down, or to choose which way up a circular object hangs.

<kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes a stroke. **Reset** goes back to the picture as it
arrived. If you are re-editing an object you added earlier, there is also *Start again
from the original photo*.

### Step 2 — Size

The dashed box is the cut-out, and that is what gets measured — the transparent margin
is trimmed off first, so the width you type is the object's real width.

Choose **by width**, **by height**, or **by line**. By line lets you drag across
something you have a measurement for — a scale bar, a known dimension — and type that
length instead.

Untick *keep the picture's proportions* if you deliberately want to set width and
height independently.

**Depth** cannot be read from a photograph, so type it. For a book this is the
thickness of the block. It drives the plan view, so a guess is much better than
leaving it at the default.

### Step 3 — Mounting

**Placed** — choose what it rests on. If you pick a plinth, the object is centred on it
automatically when you finish.

**On wires** — click the picture where each wire attaches. One point hangs it straight.
Two points let you tilt it by giving the wires different lengths.

**Fixed** — flat against a vertical surface. Pick the back wall or the front of any
plinth, and give the height of its bottom edge.

## 4. Stands and cradles

On the mounting page, or in the inspector afterwards.

| Type | Use it for | Dimensions |
| --- | --- | --- |
| Plain block | a simple riser | width, depth and height, all yours |
| V stand | acrylic stands for astrolabes, plates, retes | width, depth and height, all yours |
| Book cradle | manuscripts held open | height only — it takes the book's own width and depth |

Every kind raises the object by its **base height**.

Give a block or a V stand its own width and depth. This is the important part: a V stand
is usually deeper than the object it holds, and it is the *stand* that has to fit on the
plinth. The overhang warnings use whichever is bigger.

A V stand's splay runs front to back, so it only shows in the **plan** view, where it
points to the back and opens towards the glass. From the front you see its base and the
little notches that stop the object sliding off.

The stand is always centred under its object and moves with it. With no stand, nothing
at all is drawn beneath the object.

## 5. Manuscripts

Set **lean measured from** to **flat**, then give the angle the way a mount-maker would
— 15° means 15° up from lying flat.

What follows from that:

- the **elevation** foreshortens the height, so a 50 cm manuscript at 15° from flat
  stands about 13 cm tall;
- the **plan** shows the deck it actually covers, which is nearly its full length —
  this is where cases run out of room, and the warning will tell you;
- once it leans past halfway to flat, the plan draws **the picture itself** rather than
  a rectangle, because that is what you would see looking down.

Add a book cradle underneath and give the height of its base.

## 6. Moving things about

Drag in either view.

- Elevation, placed object: sideways moves it, and only sideways — an object worked
  along its plinth stays on that plinth even when it overhangs the edge, which is
  flagged rather than corrected. Dragging up or down by more than a couple of
  centimetres is what lifts it onto a different shelf or plinth.
- Elevation, hung object: sideways moves it; up and down changes both wire lengths at
  once.
- Plan: sideways and back-to-front.
- Arrow left and right nudge 1 cm, <kbd>Shift</kbd> 0.1 cm, <kbd>Ctrl</kbd> 5 cm.

**Arrow up and down step between surfaces** — from the floor to a plinth to a shelf and
back — rather than guessing from how far you nudged.

### Lining things up

Drag anything and it looks for a line to settle on: the centre or either edge of any
other item, and of the case itself. It matches the dragged item's own left, centre and
right against all of those and takes the nearest.

A dashed line appears across the case showing what it found, so you can see why it
stopped where it did. Centre-to-centre is given a deliberate nudge over the alternatives,
since that is nearly always the one you meant — a label on the centre line of its plinth,
an object on the centre line of the case.

The tolerance is a few *screen* pixels, so zooming in gives you finer control and zooming
out makes it grabbier. It works sideways in both views, front-to-back in plan, and
vertically in elevation for the things that can move vertically — shelves, wall-fixed
panels, and hung objects, which shorten or lengthen their wires to match.

**Snap** in the case panel governs all of this, along with the surface snapping above.
Turn it off and everything moves freely.

**Centre**, in the inspector, centres an object on whatever it belongs to — its plinth
face, the shelf it stands on — and only falls back to the case if it belongs to nothing.
In plan it centres front-to-back on that surface too.

To turn something, drag the round handle above it, press <kbd>R</kbd>, or type an angle
in **Turn**. A turned object still settles properly onto its support.

**Plan filter**, bottom left, limits both views to one level at a time. Working out
depth on a crowded shelf is much easier with everything else hidden.

Everything is drawn back to front, so what is nearer the glass covers what is behind it,
and clicking picks whatever is visually on top. Anything fixed to the **back wall** is
always behind everything else — it is the rearmost plane there is, so a graphic on the
wall can never end up in front of an object in the case.

## 7. Shapes and panels

**+ Shape** opens a picker of twelve stand-ins — box, disc, cylinder, sphere, cone,
bowl, triangle, hexagon, arched tablet, book, ring, tapered block. The thumbnails are
drawn by the same routine that draws them in the case, so what you pick is what you
get. Each arrives at a plausible size and already knows its own footprint: a cylinder
reads as a circle from above, a box as a rectangle.

Shapes sit in **Objects** alongside your photographs, since both are things in the case.
Use them to block one out before the photography is done, and swap them for the real
thing later. **Change shape…** in the inspector swaps one for another without losing
its position, and there are buttons to turn a shape into a panel and back.

Panels live in their own **Panels** section of the left rail, not among the objects —
an object is a real thing in the case, a panel is a caption for one, and casework is
casework. **+ Panel** adds an interpretation panel: a flat card stuck to a vertical
surface, so its mounting is **Fixed** (or **Wires**) — never *Placed*.

- With **a plinth selected**, the new panel goes straight onto that plinth's front face,
  sized to fit it and centred.
- With nothing selected it goes on the **back wall**.

Either way, **Fixed to** in the inspector moves it between surfaces afterwards. On a
plinth front it faces you in elevation and is barely a line in plan, and it travels with
the plinth.

Panel text is set in **real centimetres**, with the equivalent in points shown beside
it. This is the point of it: a 30 × 20 cm panel at 0.55 cm (16 pt) holds about ninety
words, and the panel will tell you when your wording runs past the bottom — a red
warning in the inspector and a red rule on the drawing. Shrink the type or grow the
panel until it stops complaining. When the type is too small to read on screen it is
drawn as grey rules, so a full panel still looks full; zoom in for the words.

To get wording in, either type into the box, or **select the panel and press
<kbd>Ctrl</kbd>+<kbd>V</kbd>** with text on the clipboard. Line breaks are kept.

## 8. Seen from above

Each object has a **plan shape**:

- **Automatic** — a rectangle, or the picture itself once it leans past halfway to flat
- **Rectangle** / **Circle or oval**
- **The picture itself** — force it
- **Top-view picture** — cut out a separate photograph taken from above

## 9. Undoing

<kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or
<kbd>Ctrl</kbd>+<kbd>Y</kbd> redoes, and there are ↶ ↷ buttons at the left of the
toolbar. Sixty steps, covering everything — deletions, moves, resizes, mounting changes,
case dimensions, panel text. Restoring a deleted object brings its cut-out back with it.

Selecting something is not an undo step, so <kbd>Ctrl</kbd>+<kbd>Z</kbd> never just
moves the highlight around. Opening a file clears the history.

The cut-out editor has its own separate <kbd>Ctrl</kbd>+<kbd>Z</kbd> for brush strokes.

## 10. Preview

**Preview** in the toolbar, or <kbd>P</kbd>. Full screen, with every drafting mark gone
— grid, rulers, dimensions, labels, selection handles — leaving the case as it would be
seen, lit against a dark surround.

Zoom and pan work as usual; nothing is selectable or draggable, so you can lean on the
mouse without moving anything. The controls sit in a bar at the bottom and fade back
after a couple of seconds of stillness — move the mouse and they return.
<kbd>Esc</kbd> or <kbd>P</kbd> leaves.

## 11. Cases, and starting a new one

**Cases** in the toolbar opens the library: every case you have worked on, as a
thumbnail with its name, object count, case size and when you last touched it. Click a
thumbnail to open it. The one you are on is outlined.

Each has **Rename**, **Copy** and **Delete**. Deleting asks first and cannot be undone —
the undo history is per-case and does not reach across.

**+ New case** starts a fresh one. There is nothing to save first: whatever you were on
is already filed, and it stays in the library. That is the whole point of it.

**Open a file…** takes a `.vitrine.json` and brings it in as a new case in the library,
leaving whatever you were on untouched.

### Where cases actually live

In the browser, not in `index.html`. The file is only the program.

- Replacing `index.html` with a newer build keeps everything. Deleting it loses nothing.
- Chrome treats all local files as one place, so a fresh copy of the file downloaded
  anywhere on the same machine finds the same cases.
- A different browser is a different drawer. Open it in Edge and the library looks
  empty — nothing is lost, Edge simply has its own.
- Clearing your browsing data **would** delete them.

So: the library is a convenience, not a backup. Use **Save file** for anything that
matters, and for moving a case to another machine or sending it to a colleague.

## 12. Getting it out

- **Export PNG** — the current view, at twice screen resolution, captioned with the
  case dimensions.
- **Schedule** — every object with its size, mount, support, stand, position, base and
  top heights, deck used, lean and wire lengths. **Copy as TSV** pastes straight into
  a spreadsheet.
- **Save file** — a `.vitrine.json` holding the entire case including the cut-outs.
  The library keeps your cases in the browser; this is the copy that leaves the machine.

## If something looks wrong

**An object will not sit where I want vertically.** Placed objects rest on supports —
that is the whole model. Add a plinth, or a block stand, or turn off **Snap** and set
the support explicitly.

**The wires are not vertical.** They will not be, once two wires have different
lengths: the object swings and the attachment points move with it. That is correct.
Press **Level** to make them equal again.

**My manuscript says it is past the case depth.** Almost certainly true. A manuscript
near flat is mostly depth. Either stand it up more, or it needs a deeper case.

**The cut-out ate part of my object.** Lower the tolerance, or switch back to *from
edges* if you are on *everywhere*, then tidy up with the restore brush.

**Something is hidden behind something else.** Check its **Z from back**. Things are
drawn in depth order, so an object with a small z sits behind one with a large z.

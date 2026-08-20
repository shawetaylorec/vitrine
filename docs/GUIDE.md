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
- **Orientation** — rotate 90° either way, flip either axis. This turns the picture
  itself, so the width and height swap with it. Use it when a photograph is on its
  side or upside down, or to choose which way up a circular object hangs.

<kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes a stroke. **Reset** goes back to the picture as it
arrived. If you are re-editing an object you added earlier, there is also *Start again
from the original photo*.

### Step 2 — Size

The dashed box is what gets measured — the transparent margin is trimmed off first, so
the width you type is the object's real width.

**The box is yours to adjust.** The automatic one is read from the pixels that are
still opaque, so a speck you missed erasing drags an edge out and the scale goes with
it. Drag any edge or corner to put it right, or drag inside the box to move the whole
thing. **Snap back to the cut-out** re-reads it from the picture.

**Crop to the box** throws away everything outside it for good &mdash; the tidy way to lose
a colour chart, a ruler, a label card, or a speck you keep missing. Cropping is here
rather than on the cut-out step because the box you measure and the box you keep are
the same box.

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

**On wires** — click the picture where each wire attaches. One point, or two. Marking
them never moves the object: you put it where you want it and turn it how you want it,
and the app works out how long each wire has to be to hold it there.

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

Give a block or a V stand its own width and depth. This is the important part: the stand
is what actually rests on the plinth, so the stand is what has to fit, and that is what
the overhang warnings measure. A V stand deeper than the object it holds is checked on
its own depth; equally, a plate much wider than its little easel is not called an
overhang as long as the easel sits well within the plinth.

A V stand's splay runs front to back, so it only shows in the **plan** view, where it
points to the back and opens towards the glass. From the front you see its base and the
little notches that stop the object sliding off.

The stand is always centred under its object and moves with it. With no stand, nothing
at all is drawn beneath the object.

### When the foot is smaller than the object

Plenty of things are widest well above the surface: a bowl on a stem, a bust on a socle,
a ewer with a spreading lip. Left alone, Vitrine assumes the whole footprint rests on
the plinth and warns you when the widest part hangs over the edge — which is not what
is happening at all.

**Base W** and **Base D** in the inspector let you say what actually touches down. Give
the foot's dimensions and the overhang warnings measure that instead; the rest may
project over the edge without complaint, which is exactly what it does in the case. In
plan the foot is drawn as a small dotted rectangle inside the footprint, so you can see
what is really carrying the weight.

Leave them empty and the whole footprint counts, which is the safe assumption. You never
have to fill them in. And if the object is on a stand or in a cradle, the stand is
already the thing in contact, so it governs and these are ignored.

## 5. Manuscripts

Set **lean measured from** to **flat**, then give the angle the way a mount-maker would
— 15° means 15° up from lying flat.

What follows from that:

- the **elevation** foreshortens the height, so a 50 cm manuscript at 15° from flat
  stands about 13 cm tall;
- the **plan** shows the deck it actually covers, which is nearly its full length —
  this is where cases run out of room, and the warning will tell you. Looking down, a
  lean is otherwise invisible, so the span is raked, the edge it touches down on is
  drawn heavier, and the angle is written beside it;
- once it leans past halfway to flat, the plan draws **the picture itself** rather than
  a rectangle, because that is what you would see looking down.

Add a book cradle underneath and give the height of its base.

## 6. Moving things about

Drag in either view. Clicking something to look at it will not shift it: the pointer has
to travel a few pixels before a drag starts at all, so a click that only means "what is
this?" leaves everything where it was.

### Locking it

The **padlock** at the top left of the drawing freezes the case. Nothing can be dragged,
turned, nudged or deleted, and the placement and size fields grey out — but you can still
click anything to read its dimensions, rename it, rewrite a panel, zoom, preview and
export. <kbd>L</kbd> does the same, as does the button in the toolbar.

This is mostly for handing a design to somebody else. They will want to click round the
case reading measurements, and locking it first means they cannot nudge your layout
while doing so. The lock is saved with the case, so it arrives locked.

- Elevation, placed object: sideways moves it, and only sideways — an object worked
  along its plinth stays on that plinth even when it overhangs the edge, which is
  flagged rather than corrected. Dragging up or down by more than a couple of
  centimetres is what lifts it onto a different shelf or plinth.
- Elevation, hung object: sideways and up and down, freely. The wire lengths follow.
- Plan: sideways and back-to-front.
- Arrow left and right nudge 1 cm, <kbd>Shift</kbd> 0.1 cm, <kbd>Ctrl</kbd> 5 cm.

**Arrow up and down step between surfaces** — from the floor to a plinth to a shelf and
back — rather than guessing from how far you nudged.

### Typing a position

Select anything and four orange lines are drawn: from its left edge to the left of the
case and from its base to the floor, hung off the bottom-left corner; from its right
edge and its top to the other two sides, hung off the top-right. Each carries its
measurement. In plan the same four give you left, back, right and front.

The **Position** section gives the same six clearances as numbers, each measured to the
case: from the left, right, back, front, floor and top. Type into any one of them and
the object moves so that edge sits where you said. They are six ways of saying the same
thing, so setting one changes the others.

They are measured to the object as it actually stands — turned, leaning, whatever — so
"12 cm from the left" means 12 cm of clear deck to its leftmost point, not to some
unrotated corner.

Two of them are shown but greyed for a placed object: its height above the floor is
decided by what it rests on, so typing it would only mean watching the number spring
back. Put it on a taller plinth, or add a block stand. Hung and fixed objects can be set
by any of the six. Shelves and plinths get the four horizontal ones, and carry their
contents when you use them.

### Lining things up

Drag anything and it looks for a line to settle on: the centre or either edge of any
other item, and of the case itself. It matches the dragged item's own left, centre and
right against all of those and takes the nearest.

A dashed line appears across the case showing what it found, so you can see why it
stopped where it did.

When more than one line is in reach, they are taken in a definite order: the middle of
the thing you are standing on first, then the middle of anything else, then an edge of
what you stand on, then everything else. Centring on your own plinth therefore wins
outright rather than by a whisker &mdash; which matters, because an object a shade wider
than its plinth has its edges lining up with the plinth's edges at exactly the moment
its centre reaches the middle, and those edge matches used to win and hold it there.

The tolerance is a few *screen* pixels, so zooming in gives you finer control and zooming
out makes it grabbier. It works sideways in both views, front-to-back in plan, and
vertically in elevation for the things that can move vertically — shelves, wall-fixed
panels, and hung objects, whose wires are recalculated to match.

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

**Set the type as large as it will go** finds the largest size the wording still fits
at and uses it. Useful for a short caption on a big board, and for seeing at once
whether a long text is ever going to work at a readable size.

**Titles are bold.** Put the caret on a line and press **B — Make this line a title**,
and the line is wrapped in `**` and drawn bold; press it again to undo. Select several
lines to mark them all at once. You can type the `**` yourself if you prefer. It works
by whole lines, because on a panel what wants weight is the heading.

To get wording in, either type into the box, or **select the panel and press
<kbd>Ctrl</kbd>+<kbd>V</kbd>** with text on the clipboard. Line breaks are kept.

## 8. Seen from above

Each object has a **plan shape**:

- **Automatic** — a rectangle, or the picture itself once it leans past halfway to flat
- **Rectangle** / **Circle or oval**
- **The picture itself** — force it
- **Top-view picture** — cut out a separate photograph taken from above

### Turning an object in plan

**Turn in plan °** swings the object about its vertical axis — an astrolabe set at an
angle to the glass, a book angled towards the corner. Drag the round handle beside a
selected object in plan view, or type the angle.

This is the mirror of a lean. A lean tips the object towards you and shortens what
elevation shows; turning it swings it round and *narrows* what elevation shows, by
exactly as much as it deepens the footprint. Both views stay in step, and the inspector
tells you the width the elevation is left with.

Note that **Turn °** is a different thing: that one rotates the picture where it
stands, in the plane you are looking at.

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

**Export image** opens a dialogue:

- **File** — **PNG** keeps every line crisp and is the one to print or draw over.
  **JPEG** is smaller, right for pasting into an email or a report. **Document** writes
  a `.doc` that opens in Word: the drawing, then a table of every object with its size,
  mount, support and position.
- **Look** — **Drawing** is the sheet as you see it, with whatever furniture you tick.
  **Just the case** is the Preview look: the case alone against a dark surround, no
  grid, rulers or labels.
- **View** — elevation, plan, or both as two files.
- **Size** — ×1 to ×4 of the drawing on screen. The dialogue tells you the pixel size
  you will actually get.
- **Measurements** — **Position of every object** marks the drawing up with the same
  four dimension lines you see when you select something, for every object, panel and
  plinth at once, so it can be installed from.

The picture is cropped to the case, plus the ruler marks when the rulers are on. You do
not get the grey drafting plane from round the outside.

Other ways out:
- **Schedule** — every object with its size, mount, support, stand, position, base and
  top heights, deck used, lean and wire lengths. **Copy as TSV** pastes straight into
  a spreadsheet.
- **Save file** — a `.vitrine.json` holding the entire case including the cut-outs.
  The library keeps your cases in the browser; this is the copy that leaves the machine.

## If something looks wrong

**An object will not sit where I want vertically.** Placed objects rest on supports —
that is the whole model. Add a plinth, or a block stand, or turn off **Snap** and set
the support explicitly.

**The two wires came out different lengths.** They will, as soon as the object is
tilted: each wire hangs plumb to wherever its attachment point has ended up, and a
tilted object puts them at different heights. That is the answer you want &mdash; it is
what to cut. Press **Hang level** to set the tilt back to zero and the two lengths
will agree again.

**My manuscript says it is past the case depth.** Almost certainly true. A manuscript
near flat is mostly depth. Either stand it up more, or it needs a deeper case.

**The cut-out ate part of my object.** Lower the tolerance, or switch back to *from
edges* if you are on *everywhere*, then tidy up with the restore brush.

**It says my object overhangs the plinth, but only the top does.** Give it a **Base W**
and **Base D** — see *When the foot is smaller than the object* above. Once Vitrine knows
what actually touches down it stops complaining about the part that hangs over.

**An object shows a dashed red box saying "picture not loaded".** Its photograph did not
come back. Reopen its cut-out from the inspector and the picture should return; if it
does not, the cut-out is lost and the object needs adding again. This is deliberately
loud — it used to draw as a plain grey rectangle, which looked like an ordinary shape
and told you nothing.

**Something is hidden behind something else.** Check its **Z from back**. Things are
drawn in depth order, so an object with a small z sits behind one with a large z.

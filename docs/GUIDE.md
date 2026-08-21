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
slider, and two ways of putting something on it — **+ Panel** for wording, and
**+ Graphic**, which runs the same cut-out and sizing steps as any object and then fixes
the result to that plinth, so it can be moved and resized afterwards.

**Whatever is on the face is shown right there, inside the same section** — its name, its
wording, its size, its margins. The plinth's own figures are above it. Clicking the panel
in the case, or in the Panels list, opens the same thing: a plinth and the board applied
to it are one job, and they are dragged as one, so they are inspected as one. With two
things on a face, a row of names picks which is open.

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
  any magnification. **Hold Shift or the space bar to drag the picture about** without
  putting the brush down &mdash; the pointer turns to a hand while you hold it.
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

**Base W** and **Base D** let you say what actually touches down. They are on the
mounting page under the lean slider when you add or re-edit an object, and in the
inspector afterwards &mdash; in both places only for a **placed** object, since a foot means
nothing when nothing is underneath.

Give the foot's dimensions and the overhang warnings measure that instead; the rest may
project over the edge without complaint, which is exactly what it does in the case. In
plan the foot is drawn as a small dotted rectangle inside the footprint, so you can see
what is really carrying the weight.

Leave them empty and the whole footprint counts, which is the safe assumption. You never
have to fill them in. And if the object is on a stand or in a cradle, the stand is
already the thing in contact, so it governs and these are ignored.

## 5. Manuscripts

Give the angle the way the view you are in states it. **In the plan that is degrees up
from flat**, which is how a mount-maker describes it: 15° means 15° up from lying flat.
Switch to the elevation and the same manuscript reads **75°**, because there the angle
is measured back from upright. Nothing has moved and there is no setting to check — the
drawing you are looking at is the datum, and the field says which it is using.

The mounting page in the wizard has no view of its own, so it names its datum outright:
**lean from upright**, the same as the elevation. A manuscript in a cradle is 70–80°
there.

What follows from the angle:

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
export. <kbd>L</kbd> does the same.

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

Two things get a fifth line, because for them the four miss the point. A **hung object**
gets its wire length, drawn down from the rail. A **plinth** gets its height, drawn up
its left-hand side — a plinth stands on the floor, so its from-the-floor clearance is
always nothing, and the height is the number you were actually after.

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

### Measuring anything to anything

Those four clearances answer "where is this in the case". For everything else — the gap
between two objects, the light above a plinth, how far a label sits below the thing it
describes — draw the dimension yourself.

Press <kbd>M</kbd> or **Measuring line** in the left rail, then drag from one point to
another. Two things make it a measurement rather than a sketch:

- **It holds to the square.** Come within a few pixels of the vertical or the horizontal
  and it locks there exactly. So a line from the middle of an object to the top of the
  case is genuinely vertical, and the number is genuinely the height above it.
- **Both ends land on something real.** Every edge and every centre line of every visible
  item, the four sides and the middle of the case, and the hanging rail. Dashed guides
  show what it caught, the same as when you drag an object.

Hold <kbd>Shift</kbd> to switch both off and put an end exactly where the pointer is.

**A line stops at the walls of the case.** Drag past one and the end stays on it. A
measurement that ran out over the drafting plane would be measured partly against
nothing, which is worse than useless on a drawing somebody else is going to build from.
<kbd>Shift</kbd> overrides the snapping, not the walls.

**When an end does reach a wall, the length is said again outside it** — larger, in
green, out on the plane past the edge it reached. A line run to a wall is measuring the
clearance to it, and that is usually the number the whole drawing is being made to
settle, so it is put somewhere you can read it at a glance. It is a working aid and does
not go into an exported picture: the export crops the plane it sits on, and the
dimension on the line itself carries the number into the file.

On the square you get one number. On the diagonal you get the length and, underneath,
the two components — *7 across · 26.5 up* in the elevation, *across* and *back* in the
plan — which is usually what a fabricator actually needs.

Measurements belong to the view they were drawn in, because "up" is height in the
elevation and depth in the plan. They stay where you put them, save with the case, undo
and redo like anything else, and appear in an exported picture. **Click a line to remove
it**; **Remove last** and **Clear all** are in the rail, and preview strips them along
with the rest of the drafting marks.

They also work with the case **locked** — reading a drawing without disturbing it is
what the lock is for, and a measurement disturbs nothing.

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

**Snap to 1 cm** in the case panel governs all of this: the alignment lines, the surface
snapping above, and the step a drag moves in. On, a drag rounds to whole centimetres and
lines itself up with its neighbours. Off, it moves freely, to the hundredth of a
centimetre. Hold <kbd>Shift</kbd> for tenths either way.

It is the only toggle there that changes how anything moves. **Grid**, **Dimensions**
and **Rulers** only change what is drawn — the grid's 10 cm squares have never had
anything to do with the step a drag takes.

**Centre it**, in the inspector, centres an object on whatever it belongs to — its
plinth face, the shelf it stands on — and only falls back to the case if it belongs to
nothing. It centres across *and* front-to-back, and does the same thing in both views.

If a centred object still reports itself as overhanging, it is telling you its foot is
wider than the surface it stands on, and it says so in those words — no amount of moving
will help, and the number it gives you is what will.

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
casework. Every panel is listed there whatever it is mounted on, with its home beside
its name. **+ Panel** adds an interpretation panel.

- With **a plinth selected** — or with a panel on a plinth selected — the new panel goes
  straight onto that plinth's front face, sized to sit comfortably on it and centred.
  **Fit the face**, below, takes the whole front if that is what you want.
- With nothing selected it goes on the **back wall**.

A panel takes all three mountings:

- **Fixed** — stuck flat to the back wall or to a plinth's front. This is the usual one,
  and **Fixed to** in the inspector moves it between surfaces afterwards. On a plinth
  front it faces you in elevation and is barely a line in plan.
- **Wires** — hung from the rail, like any other object.
- **On a stand** — stood upright on a deck, a shelf or a plinth top, in an object stand.
  It arrives 0.3 cm thick, in a V stand, reclined 10° — which is what a V does to a card
  — and from there it behaves like any placed object: choose what it rests on, set the
  angle, size the stand, and the overhang warnings measure the stand's own footprint.
  The angle reads the way the view states it, so 10° in the elevation is 80° in plan.

### A panel on a plinth face is glued to it

The two travel as one object. **Dragging the panel drags the plinth**, along with
everything else riding on it, in both views — which is what stops a panel sized to the
whole front from swallowing every click and leaving the plinth underneath ungrabbable.

They are **inspected as one** for the same reason. Click either and the panel on the
right shows the plinth — its width, depth, height and place in the case — with the board
itself under **Its face**: name, wording, type size, dimensions and margins. There is one
set of case clearances, and they are the plinth's, because a board glued to a face has no
position of its own.

**And they are drawn as one.** Pressing either outlines both and puts the same
dimensions on the sheet — the plinth's four clearances and, running down beside it, its
height. It makes no difference which of the two you reach, or whether you reach it in the
case or in the lists on the left. That matters most when a panel is sized to the whole
front: it takes every click on the plinth, so if the height only appeared for the plinth
there would be no way left to see it.

Its place on the face is *typed*, not dragged: four margins to the plinth's own front —
from its left, right, top and bottom.

**Each moves its own edge and nothing else.** Type 3 into the right margin and the right
edge goes 3 cm in; the left, top and bottom stay exactly where they were and the board
narrows to suit. Set all four and the panel is completely specified — which is how you
would describe a board applied to a plinth to whoever is making it. The Width and Height
fields above follow from the margins rather than fighting them.

Two buttons work on the whole board:

- **Centre on the face** puts it in the middle of the front, both ways.
- **Fit the face** takes the whole front with half a centimetre of plinth showing all
  round.

The **Position** fields, up in the plinth's own part of the panel, measure to the case as
always. Setting one of those moves the whole assembly — plinth, board, and whatever is
standing on top — so the board keeps its place on the face either way.

To take a board off a face, use **Fixed to** inside the same block and send it to the
back wall. There it is an ordinary panel again, with its own mounting, turn and plan
settings, and the inspector follows it. **Remove the panel**, in the same place, takes it
away altogether and leaves the plinth selected.

Panel text is set in **real centimetres**, with the equivalent in points shown beside
it. This is the point of it: a 30 × 20 cm panel at 0.55 cm (16 pt) holds about ninety
words, and the panel will tell you when your wording runs past the bottom — a red
warning in the inspector and a red rule on the drawing. Shrink the type or grow the
panel until it stops complaining.

When the type is too small to read it is drawn as grey rules instead, so a full panel
still looks full. That judgement is made about *the picture being drawn*, not about the
screen: zoom in and the words appear, and an export is measured against the file's own
scale, so a ×4 export sets as words what the screen was greeking.

### Solving for the type, or for the board

Two buttons, working in opposite directions from the same fit calculation.

**Set the type as large as it will go** holds the board and finds the largest type the
wording still fits at. Useful for a short caption on a big board, and for seeing at once
whether a long text is ever going to work at a readable size.

**Grow the panel to fit the text** is the reverse: it holds the type at the size you
chose and finds the board that suits it.

- On the **back wall** you get two: *keep proportions*, which is the smallest
  enlargement of the same shape that fits and may come out taller than strictly needed,
  and *grow taller only*, which keeps the width you drew.
- On a **plinth face** there is one, and it takes the plinth's width less half a
  centimetre each side — the measurement **Fit the face** uses — so only the height is
  free, capped by the plinth's own height.

It never shrinks a board you drew. And if the wording will not fit even at the largest
the case or the plinth allows, it grows as far as there is room and then tells you the
size it would actually have needed, rather than stopping at the limit without a word.

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
  **JPEG** is smaller, right for pasting into an email or a report.
- **Look** — **Drawing** is the sheet as you see it. **Just the case** is the Preview
  look: the case alone against a dark surround, with none of the labels.
- **View** — elevation, plan, or both as two files.
- **Size** — ×1 to ×4 of the drawing on screen. The dialogue tells you the pixel size
  you will actually get.
- **Drafting furniture** — the grid and the rulers, ticked independently of the look, so
  you can have a plain dark picture that is still to scale and readable.

The picture is cropped to the case, plus the ruler marks when the rulers are on. You do
not get the grey drafting plane from round the outside.

Other ways out:
- **Export TSV** — every object with its size, mount, support, stand, position, base and
  top heights, deck used, lean and wire lengths. **Copy as TSV** puts it on the
  clipboard, tab separated, which pastes straight into Excel or Sheets as columns.
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

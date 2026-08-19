# Laying out a case

A walk through the whole job, in the order you would actually do it.

## 1. The case

Top left, set **W**, **H** and **D** in centimetres. Depth matters as much as the other
two — it is what the plan view is drawn against and what the overhang warnings check.

**Hanging rail height** is where wires attach at the top of the case. Everything hung
measures its wire lengths down from there, so getting it right once saves correcting
every object later.

Under **Back wall** you can set a colour, or upload an image of the actual case
interior. It dresses the elevation only — the plan keeps its own tone, because in plan
you are looking down at the deck, not at the wall.

## 2. Structure before objects

Add shelves and plinths first, so that objects have something to land on.

- **Shelf** — spans the case by default. Its **height** is the top surface, which is
  what objects rest on.
- **Plinth** — a block on the floor with its own width, depth and height.

Both can be dragged in either view. Moving one takes everything standing on it along.

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

**On the wall** — flat against the back, at whatever height you give. This is what
interpretation panels use.

## 4. Stands and cradles

On the mounting page, or in the inspector afterwards.

| Type | Use it for | What the height means |
| --- | --- | --- |
| Plain block | a simple riser | how far it lifts the object |
| V stand | acrylic stands for astrolabes, plates, retes | how far it lifts the object |
| Book cradle | manuscripts held open | the height of the arms at each end |

A cradle holds the block in its valley, so the middle is treated as sitting on the deck
and only the arms stand proud — which is why a cradle adds no lift.

Give the stand its own width and depth. This is the important part: a V stand is
usually deeper than the object it holds, and it is the *stand* that has to fit on the
plinth. The overhang warnings use whichever is bigger.

The stand is always centred under its object and moves with it.

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

Add a book cradle underneath and give the arm height.

## 6. Moving things about

Drag in either view.

- Elevation, placed object: sideways moves it; up and down lifts it onto whichever
  shelf or plinth is nearest the height you let go at.
- Elevation, hung object: sideways moves it; up and down changes both wire lengths at
  once.
- Plan: sideways and back-to-front.
- Arrow keys nudge 1 cm, <kbd>Shift</kbd> 0.1 cm, <kbd>Ctrl</kbd> 5 cm.

To turn something, drag the round handle above it, press <kbd>R</kbd>, or type an angle
in **Turn**. A turned object still settles properly onto its support.

**Plan filter**, bottom left, limits both views to one level at a time. Working out
depth on a crowded shelf is much easier with everything else hidden.

## 7. Seen from above

Each object has a **plan shape**:

- **Automatic** — a rectangle, or the picture itself once it leans past halfway to flat
- **Rectangle** / **Circle or oval**
- **The picture itself** — force it
- **Top-view picture** — cut out a separate photograph taken from above

## 8. Getting it out

- **Export PNG** — the current view, at twice screen resolution, captioned with the
  case dimensions.
- **Schedule** — every object with its size, mount, support, stand, position, base and
  top heights, deck used, lean and wire lengths. **Copy as TSV** pastes straight into
  a spreadsheet.
- **Save file** — a `.vitrine.json` holding the entire case including the cut-outs.
  Autosave exists but is best-effort; this is the one to trust.

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

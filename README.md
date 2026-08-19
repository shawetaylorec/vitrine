# Vitrine

Schematic layout for museum display cases. You give it the case dimensions, drop in
photographs of the objects, tell it how big each one really is, and it draws the case
to scale in both **elevation** (looking at the back wall) and **plan** (looking down).

Everything is in centimetres. Everything runs in the browser — one HTML file, no
install, no server, no account, and nothing leaves your machine.

![The elevation view](docs/images/shot.png)

## Why

Exhibition design tools are 3D and want a model or a collections-management record
before you can place anything. Gallery-wall planners are 2D but only handle framed
pictures on a flat wall. Neither helps much with the thing a curator actually does
early on: work out whether four objects, a plinth and a cradle will physically fit
in a 140 × 160 cm case, and at what heights.

Vitrine sits in that gap. Its front door is a photograph, its output is a scale
drawing and an install schedule, and it is deliberately not 3D.

## What it does

**Objects come from photographs.** Drop, paste or pick an image and a three-step
panel opens: cut the background out, say how big it really is, say how it is mounted.
Background removal is a flood fill in plain JavaScript — no model download — with a
wand, erase and restore brushes, a crop tool and zoom for fine work. Two passes are
offered: *from edges* for solid objects, and *everywhere*, which keys a colour out of
the whole picture and is what openwork like an astrolabe rete needs.

**Scale comes from one measurement.** Type the real width or the real height and the
other follows from the picture. Or drag a line across something you know the length
of and give that. Depth you type, because a flat photograph cannot tell you.

**Mounting is modelled properly.**

| Mount | What it means |
| --- | --- |
| Placed | Rests on the case floor, a shelf or a plinth. Optional stand or book cradle. Can lean back. |
| On wires | Hangs from a rail at a given height. One wire hangs it straight; two wires of different lengths tilt it. |
| On the wall | Fixed flat to the back wall at a given height. |

**Stands and cradles belong to the object.** A V stand or a book cradle is always
centred underneath and travels with it. Its own footprint — usually deeper than the
object — is what has to fit on the plinth, and the overhang warnings use it.

**Lean can be measured from upright or from flat.** For a manuscript in a cradle,
"15° from flat" is the natural way to say it. The elevation shows the foreshortened
height, the plan shows the deeper footprint, and once something leans past halfway to
flat the plan draws the picture itself rather than a rectangle.

![The plan view](docs/images/shotplan.png)

**It tells you when things do not fit** — past the case sides, above the top, deeper
than the case, or overhanging whatever it stands on.

**It produces an install schedule** — every object's size, base height, top height,
distance from the left and back, lean and wire lengths, copyable straight into a
spreadsheet.

Also: shelves and plinths, plain shapes for things you have not photographed,
interpretation panels with text on them, a back wall colour or image, a plan-level
filter, a turn handle for rotating objects, PNG export of either view, light and dark,
and save/open to a `.vitrine.json` file that carries the cut-outs with it.

## Running it

Open `index.html` in Chrome. That is the whole thing.

Or use the hosted copy, which is the same file: <https://claude.ai/code/artifact/aea0ffb6-7857-461c-935e-525b52d39f8f>

### Keys

| | |
| --- | --- |
| <kbd>1</kbd> / <kbd>2</kbd> | elevation / plan |
| <kbd>F</kbd> | fit to window |
| arrows | nudge 1 cm — <kbd>Shift</kbd> 0.1 cm, <kbd>Ctrl</kbd> 5 cm |
| <kbd>R</kbd> | turn 90° |
| <kbd>Enter</kbd> | reopen the mounting page |
| <kbd>Ctrl</kbd>+<kbd>D</kbd> / <kbd>Del</kbd> | duplicate / remove |
| <kbd>Ctrl</kbd>+<kbd>V</kbd> | paste a picture straight in |
| double-click | reopen an object's cut-out, size and mounting pages |

## Known limits

- **No TIFF.** Chrome has no TIFF decoder. Vitrine detects them and says so rather
  than failing silently — convert to PNG or JPEG first.
- **Background removal is a flood fill, not a matting model.** It is excellent on
  plain studio backdrops and no use against clutter. The brushes are the fallback.
- **Lean is an orthographic tilt, not a perspective render.** A leaning object is
  foreshortened correctly but you will not see its face at an angle.
- **Autosave is best-effort.** It uses IndexedDB, falling back to `localStorage`,
  which image data can overflow. Use **Save file** for anything you want to keep.

## Documentation

- [User guide](docs/GUIDE.md) — laying out a case, start to finish
- [Developing](docs/DEVELOPING.md) — build, tests, architecture

## Licence

None. All rights reserved — this is a private working tool, not a released project.

# Handover — eight queued items

Written 2026-08-20 at the end of a long session, for whoever picks this up next.
Everything here is **queued, not started**. The tree is clean, pushed, and
shawetaylorec.github.io/vitrine serves a build byte-identical to `index.html`
(commit `e045506`, 201 assertions passing).

Read `CLAUDE.md` and `docs/DEVELOPING.md` first — this file assumes both.

## Before you touch anything

```sh
./build.sh          # index.html is GENERATED; never edit it by hand

{ cat _shell.html; echo '<script>'; cat _p1.js _p2.js _p3.js _p4.js _test.js; echo '</script>'; } > _t.html
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --window-size=1600,1000 --screenshot=shot.png --virtual-time-budget=25000 \
  --enable-logging=stderr --log-level=0 "file:///C:/Users/shawe/code/vitrine/_t.html"
```

Two things that will bite you:

- **Use the absolute `file:///C:/...` URL.** `file:///$PWD/...` from Git Bash yields
  `file:///c/...`, which Chrome cannot open, and you get a silent zero-assertion run
  that looks like a pass.
- **Never pipe JavaScript containing `$(` or `${` through `perl -pi -e` in a
  double-quoted shell string.** The shell expands it and writes garbage like
  `197609'#foo')` into the source. It has happened four times. Use the Edit tool for
  anything with a `$` in it.

The method that has repeatedly earned its keep: **reproduce the reported glitch with a
throwaway probe script before changing a line.** Twice it showed the data model was
innocent and the fault lay somewhere else entirely.

---

## 1. Size a panel to the plinth it is fixed to

Offer to fit a face panel to its plinth automatically, with roughly a **1 cm margin**
all round.

Build this together with **item 5** — the plinth case there is the same measurement.

Relevant: `landOnFace()` in `_p2.js`, `faceOf()` in `_p1.js`, and `addPanel()`, which
already sizes a new panel to fit when a plinth is selected.

## 2. "Centre it" does not centre properly

**Diagnosis started, not finished.** `on('iCentre', ...)` in `_p2.js`:

```js
o.x = rnd(o.x + (lo + (span - w) / 2 - b.x0), 1);
if (S.view === 'plan' && o.mount === 'placed' && host) { … o.z = … }
```

It centres **x only, unless you happen to be in plan view**. Press it in elevation and
`z` is never touched, so the object stays off-centre front-to-back on the plinth top —
which matches "it slightly misaligns it". The button quietly does two different things
depending on the view, with nothing saying so. Make it behave identically in both.
`rnd(…, 1)` also leaves up to 0.05 cm of error; drop to 2 decimals.

**Do not declare this fixed without checking the owner's actual case.** The object was
21 × 20.64 × 20 cm, `baseW`/`baseD` 15, on "Plinth 1" (top at 60), plan shape ellipse,
still reporting *"Sticks out: overhanging Plinth 1"* afterwards, at from-left 105,
from-right 14, from-back 4.5, from-front 18.5. The overhang message is the **x** test,
so check Plinth 1's width against the 15 cm foot — there may be a second fault here
that the z bug is hiding.

## 3. Real text in exports instead of greeked rules

Panel text below about four pixels is drawn as grey rules rather than words —
`paintBody` in `_p1.js`, `if (sizePx < 4)`. The threshold is measured against `T.sc`,
which is the **on-screen** scale, and `renderSheet` scales by canvas transform while
leaving `VW`/`VH` in CSS pixels. So a ×4 export greeks text that would be perfectly
legible in the finished file.

Fold the export scale into the threshold, or simply never greek while `EXPORTING` is
true. Small change, clear win.

## 4. Moving a plinth that carries a panel

With a face panel sized to the plinth, the panel takes every click and the plinth
cannot be grabbed at all.

The owner's suggestion, which is a good one: **always move plinth and panel together**,
and position the panel by typed clearances instead — from the top, left, right and
bottom of the plinth face.

Design this rather than patch it. It interacts with the existing plan-drag rule, which
deliberately carries face panels with a plinth but leaves things *resting on top* where
they are (see `childrenOf`, and the `stuck` flag in the drag snapshot). Whatever you do
must keep that distinction intact.

## 5. Grow the panel to fit the type — the reverse of auto-fit

"Make this panel as large as it needs to be for font size *x*." The same bisection as
`bestTextSize` in `_p1.js`, run the other way: hold `textSize`, solve for the board.

- **On a plinth face** — width is the plinth's (item 1, with its 1 cm margin), so only
  height is free, capped by the plinth's height.
- **On the back wall** — grow width and height together, keeping the aspect ratio.

Two things to get right. The text **reflows as the board widens**, so the fit is lumpy
in exactly the way `bestTextSize` is: bisect on a scale factor rather than stepping, and
round **up** then verify (the opposite of `bestTextSize`, where down is the safe
direction). And give it an **honest failure**: if the wording will not fit even at the
cap, say so and give the size it would need, rather than stopping silently at the cap.
That silent-stop is precisely the trap the auto-fit button fell into before.

Also confirm with the owner: on the back wall, keeping the aspect ratio means the result
is the smallest *proportional* enlargement that fits, which may be taller than strictly
necessary. Growing height only is a one-word change. Show both.

## 6. Dragging is jumpy even with the grid off

`_p2.js`, in the drag handler:

```js
const fine = e.shiftKey ? 0.1 : 1;
const q = v => Math.round(v / fine) * fine;
```

Every drag rounds to whole centimetres, and this consults **neither** `S.opt.grid` nor
`S.opt.snap`. Grid only draws the 10 cm squares; Snap only gates `alignSnap`, the guide
lines. So nothing in the interface restores free movement, and the owner's expectation
that turning the grid off would do it is entirely reasonable.

About two lines — let `fine` be 0 when snapping is off and quantise to 0.01 cm — but
settle the meaning first. Grid sits with Dimensions and Rulers, all of which are purely
visual, so **Snap** is the coherent home and its label should then say so. The owner
expected **Grid** to govern, so whichever you choose, the labels must make it obvious.
Keep Shift as the temporary fine override either way.

## 7. Wires should stay grey when the object is selected

`drawObjectFront` in `_p1.js`:

```js
ctx.strokeStyle = sel ? C.accent : C.ink3;
ctx.lineWidth = sel ? 1.6 : 1.1;
…
ctx.fillStyle = sel ? C.accent : C.ink3;
```

Selecting a hung object turns its wires accent orange — the same colour as the
dimension lines, so they read as measurements. Keep them grey whatever the selection.
Use the line weight alone to show selection if you want the feedback.

Three lines. Check the plan view too, and check the wire dimension arrow in
`drawDimsFor` still reads as a dimension (it should stay accent — it *is* one).

## 8. State angles by the view, not by a chosen datum

Today `lean` is stored as degrees from upright and `leanFrom` ('upright' | 'flat')
decides how it is *shown*, giving labels like "15° from flat".

The owner wants the datum to follow the **view** instead, and the wording dropped:

- **In elevation** — the angle from upright.
- **In plan** — the angle from flat.
- So 10° in elevation reads as 80° in plan.

Keep storing `lean` as degrees from upright; this is a display change. Places to touch:

| Where | What |
| --- | --- |
| `shownLean()` | `_p2.js` — the conversion everything funnels through |
| `leanText()` | `_p1.js` — the plan tag, currently "15° from flat" |
| `leanLabel()` | `_p1.js` — the elevation annotation and the schedule column |
| inspector | `_p2.js` — `iLeanFrom` select, `iLeanNum`, `iLean` slider, `leanHelp` |
| wizard | `_p3.js` — `syncLeanFields()`, `#leanFrom`, `#leanHelp` |
| schedule | `_p3.js` — the `Lean:` column |

**Decisions to settle before writing anything:**

- Does the **input** flip meaning with the view as well as the display? Consistency says
  yes, but then typing 80 means two different things in two views. The view is the only
  context — decide whether that is enough, or whether the field needs a quiet hint.
- The `leanFrom` selector presumably goes. Keep the **property** for file
  compatibility — `upgrade()` in `_p3.js` still reads it — but stop using it to decide
  the display.
- The wizard's mounting step has no view of its own. Decide which datum it uses, and
  say so there.

---

## When you are done

Rebuild, run the suite two or three times (a real race was found that way), regenerate
the screenshots if anything visual changed, update `README.md`, `docs/GUIDE.md` and
`docs/DEVELOPING.md` including the assertion count, then commit. **Do not push until
the owner has looked at it** — that has been the standing arrangement.

House rules worth repeating: no dependencies, ever; centimetres everywhere; commit
messages carry no `Co-Authored-By` trailer; and displayed scholarly content — object
names, dates, interpretation wording — is the owner's call, never invented or altered.

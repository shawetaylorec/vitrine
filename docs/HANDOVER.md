# Handover — the plinth and its face are one job now

Written 2026-08-21, replacing the handover that closed the queue of eight. Two things
were asked for and both are built, tested and documented. **Nothing has been pushed** —
that is the standing arrangement, and it is waiting on the owner.

342 assertions pass, run six times over. `index.html` is rebuilt from the sources.

Read `CLAUDE.md` and `docs/DEVELOPING.md` first — this file assumes both.

## Before you touch anything

```sh
./build.sh          # index.html is GENERATED; never edit it by hand

{ cat _shell.html; echo '<script>'; cat _p1.js _p2.js _p3.js _p4.js _test.js; echo '</script>'; } > _t.html
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --window-size=1600,1000 --virtual-time-budget=25000 \
  --enable-logging=stderr --log-level=0 "file:///C:/Users/shawe/code/vitrine/_t.html"
```

The three traps, all still live:

- **Use the absolute `file:///C:/...` URL.** `file:///$PWD/...` from Git Bash yields
  `file:///c/...`, which Chrome cannot open, and you get a silent zero-assertion run
  that looks like a pass.
- **Never pipe JavaScript containing `$(` or `${` through `perl -pi -e` in a
  double-quoted shell string.** The shell expands it and writes garbage into the source.
  Use the Edit tool for anything with a `$` in it.
- **`--screenshot=` cannot write into the repo** in the current sandbox — it fails with
  "Access is denied" and no file appears, which looks exactly like a screenshot that
  rendered nothing. Write them to a scratch directory outside the project.

One correction to the file this replaces: it claimed **267** assertions. The suite at
that commit actually reported **306**. The count here was taken from a real run.

---

## What was asked, and what landed

### 1. One inspector for a plinth and the board on its face

The complaint was that clicking a panel on a plinth showed the panel alone, which is not
how the pair behaves: dragging either already moves both. Now clicking **either** opens
the plinth — name, width, depth, height, its place in the case — with the board itself
nested inside the **Its face** section: its name, its wording, its type size, its
dimensions, the four margins, and *Fixed to*. `S.sel` is untouched, so the sheet still
outlines what you clicked, the arrow keys still nudge it and Delete still removes it.

`facePair()` in `_p2.js` is the whole idea; `faceItemBlock()` and `faceSection()` draw
it, `bindFaceItem()` wires it. The rule that matters if you touch it: **the plinth owns
the plain ids** (`iName`, `iW`, `iH`, `iD`, `iDup`, `iDel`) and the nested board answers
to `iPnl…`; everything with no collision keeps the id it always had, which is what lets
`bindPanelText()` and `bindFaceMargins()` serve both layouts rather than being copied.
`docs/DEVELOPING.md` §*One inspector for the pair* has the rest, including why
`facePair()` refuses a board stuck to a *shelf*.

A graphic on a face gets the same treatment. Two things on one face give a row of names
to pick between them. A bare face offers **+ Panel** and **+ Graphic**.

**The drawing was a second pass, after the owner tested it.** The inspector had been
unified but the sheet had not: pressing the panel outlined the panel and dimensioned the
panel, so the plinth's **height** — the one number a plinth contributes to a drawing —
disappeared exactly when a panel covered the front and took every click. `paint()` now
resolves `SELPAIR` once a frame, every selection test goes through `selected(id)`, and
`drawSelectionDims()` dimensions the plinth. Press either, in the case or in the lists,
and the sheet is identical. Hover was deliberately left alone: it reports what is under
the pointer, which really is the panel.

**The one behaviour change beyond the rearrangement**: the case clearances in the
combined view are the plinth's, not the panel's. Typing 20 into *From the left* puts the
*plinth's* edge at 20 and the board travels with it. It used to put the panel's edge
there, by moving the plinth by the difference. Two sets of clearances both claiming to
place one assembly was the confusion being removed, so this is deliberate — but it is the
thing to watch for in use, and the old assertion was rewritten rather than deleted.

### 2. A panel can stand in an object stand

*Placed* used to be hidden for panels. It is now offered, labelled **On a stand**, and a
panel arriving there is given what that mount implies: `PANEL_STAND_DEPTH` 0.3 cm — a
card, not a board — a V `stand`, and `PANEL_STAND_LEAN` 10°, since a V does not hold
anything dead upright. The card and the stand arrive once, keyed on the panel not having
a stand yet, so a stand you have sized is never overwritten; the recline comes back every
time it lands in a stand with no lean, because leaving `placed` is what zeroes `lean`.

After that it is an ordinary placed object: pick what it rests on, lean it further, size
the stand, and the overhang warnings measure the stand as the contact patch. `#stand` and
`#standplan` screenshot it.

---

## What is actually left

**Nothing is queued.** Three things want the owner's eye rather than more work:

1. **The case clearances in the combined inspector**, per the note above. It reads
   correctly and the panel keeps its place on the face either way, but it is the kind of
   change that lands differently after an hour of real work.
2. **What the nested block does not carry.** A board on a face no longer offers turn,
   flip, plan shape, top-view picture or duplicate — they are a plinth face's least
   likely needs and the block was going to be long enough. *Fixed to → the back wall*
   hands it back to its own full inspector and the inspector follows it there. If any of
   them turns out to be wanted in place, adding it back is a few lines in
   `faceItemBlock()` and `bindFaceItem()`.
3. **The lean datum in use** — still carried over from the last handover. The number
   changes when you switch views. That is what was asked for and it is coherent, but it
   is worth using before pushing. The new panel-on-a-stand inherits it: 10° in the
   elevation reads as 80° in plan.

## When you are done

Rebuild, run the suite two or three times, regenerate the screenshots if anything visual
changed, update `README.md`, `docs/GUIDE.md` and `docs/DEVELOPING.md` including the
assertion count, then commit. **Do not push until the owner has looked at it.**

House rules worth repeating: no dependencies, ever; centimetres everywhere; commit
messages carry no `Co-Authored-By` trailer; and displayed scholarly content — object
names, dates, interpretation wording — is the owner's call, never invented or altered.

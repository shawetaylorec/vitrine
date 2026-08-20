# Handover — the eight are done

Written 2026-08-20, replacing the queue of eight that this file carried before. All
eight are built, tested and documented. **Nothing has been pushed** — that is the
standing arrangement, and it is waiting on the owner.

267 assertions pass, run six times over. `index.html` is rebuilt from the sources.

Read `CLAUDE.md` and `docs/DEVELOPING.md` first — this file assumes both.

## Before you touch anything

```sh
./build.sh          # index.html is GENERATED; never edit it by hand

{ cat _shell.html; echo '<script>'; cat _p1.js _p2.js _p3.js _p4.js _test.js; echo '</script>'; } > _t.html
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --window-size=1600,1000 --screenshot=shot.png --virtual-time-budget=25000 \
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

The method that keeps earning its keep: **reproduce the reported glitch with a throwaway
probe before changing a line.** It paid twice more this session — see items 2 and 5.

---

## What was decided, and by whom

Four of the eight had decisions the old handover said to settle first. The owner chose:

| | Decision |
| --- | --- |
| 6 | **Snap** governs free movement, relabelled; Grid stays purely visual |
| 8 | The lean **input** flips with the view as well as the display, with the field naming its datum |
| 5 | **Both** growth modes offered on the back wall, proportional first |
| 4 | Dragging either the panel or the plinth moves both; the panel is placed on the face by typing |

Three smaller ones were taken here rather than asked, and are recorded in
`docs/DEVELOPING.md` with their reasoning: the wizard's mounting step states **lean from
upright**; the schedule's column is headed **`Lean from upright`**, since a document that
leaves the app cannot rely on which way somebody was looking; and for a face panel the
*case* clearance fields move the plinth, so typing and dragging agree.

## The eight, and where they landed

1. **Size a panel to its plinth.** `faceFit()` and `FACE_MARGIN` in `_p1.js`; the
   *Fit the face* button in the new face section of the inspector. One constant shared
   with item 5, so the two cannot disagree about the margin.
2. **"Centre it" does not centre properly.** It centred *x* always and *z* only in plan;
   it now does both axes in both views, at two decimals rather than one.
   **The suspected second fault does not exist.** A probe over 540 configurations of
   yaw, spin, lean, stands and feet found no case where centring left a contact patch
   that would have fitted — the geometry is concentric by construction. What the owner
   was seeing was a *true* message with no useful content: a foot wider than the plinth
   reported as "overhanging", which invites you to hunt for a position that is not there.
   `outOfCase()` now separates too-big from off-centre and gives both measurements.
3. **Real text in exports.** `greeked()` in `_p1.js` multiplies by `EXPORT_SC`, which
   `renderSheet` sets and restores. A ×4 export now writes words the screen was greeking.
4. **Moving a plinth that carries a panel.** `pointerdown` redirects the drag to the
   plinth via `faceOf(hit)` while the selection stays on the panel, so everything
   downstream sees an ordinary plinth drag. `faceFields()` gives the four typed
   clearances that replace the drag, plus *Centre on the face* and *Fit the face*.
5. **Grow the panel to fit the type.** `panelGrow(o, mode)` in `_p1.js`. Width-fixed
   growth is closed form, not bisection — with the width settled the line count is
   already decided, and bisecting would be a slower route to the same number. Only
   proportional growth is lumpy enough to need the bisection, and that one rounds **up**
   and verifies. It has the honest failure the old handover asked for.
6. **Dragging is jumpy even with the grid off.** `fine` is now `0.01` with Snap off, `1`
   with it on, `0.1` under Shift. The label reads **Snap to 1 cm** and the rail carries a
   line saying which toggles move things and which only draw.
7. **Wires stay grey.** `drawObjectFront` in `_p1.js`; weight alone carries the
   selection. The wire's dimension in `drawDimsFor` is still accent, because it is one.
8. **Angles stated by the view.** `shownLean()` / `storedLean()` / `leanDatum()` in
   `_p2.js`. `leanFrom` is still stored and still read by `upgrade()`, so older files
   open unchanged; it no longer decides anything.

One thing beyond the eight: **the suite had two long-standing flakes**, and running it
ten times to check this work is what finally pinned them. Both were the test's fault,
not the app's — PNG export racing the virtual clock, and `boot()`'s storage read landing
after the case-library test had swapped in its stub. `docs/DEVELOPING.md` has both
diagnoses. Ten consecutive clean runs since. The suite can now be trusted to mean what
it says when it is run repeatedly, which it could not before.

---

## What is actually left

**Nothing is queued.** Two things want the owner's eye rather than more work:

1. **Item 2 against the owner's real case.** The probe clears the geometry in general,
   but the specific case — a 21 × 20.64 × 20 cm object with a 15 cm foot on "Plinth 1" —
   was never in hand. If Plinth 1 is narrower than 15 cm across, the new message will now
   say so in as many words and the matter is closed. If it says something else, that is a
   genuine new finding and worth a probe.
2. **The lean datum in use.** The number changes when you switch views. That is what was
   asked for and it is coherent, but it is the kind of change that reads differently
   after an hour of real work than it does in a description. Worth using before pushing.

## When you are done

Rebuild, run the suite two or three times, regenerate the screenshots if anything visual
changed, update `README.md`, `docs/GUIDE.md` and `docs/DEVELOPING.md` including the
assertion count, then commit. **Do not push until the owner has looked at it.**

House rules worth repeating: no dependencies, ever; centimetres everywhere; commit
messages carry no `Co-Authored-By` trailer; and displayed scholarly content — object
names, dates, interpretation wording — is the owner's call, never invented or altered.

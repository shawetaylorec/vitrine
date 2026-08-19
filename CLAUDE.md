# Vitrine — working notes

Schematic layout tool for museum display cases. Single self-contained HTML file,
no dependencies, opened straight off disk.

## index.html is generated — never edit it by hand

It is built by concatenating the sources. Edit these instead:

| File | Contents |
| --- | --- |
| `_shell.html` | markup and all CSS, including the theme tokens |
| `_p1.js` | state, geometry, the renderer |
| `_p2.js` | hit testing, dragging, keyboard, preview, left rail, inspector |
| `_p3.js` | image wizard, background removal, undo, storage, export |
| `_p4.js` | event wiring and boot |
| `_test.js` | headless test — appended to a throwaway copy, never shipped |

```sh
./build.sh          # regenerates index.html
```

Any change to a source file needs a rebuild before the app reflects it. Rebuild
before opening the app to check something, or you will be looking at the old one.

## Always run the tests

The test file is appended to a copy of the app and driven by headless Chrome. It
calls the app's own functions rather than simulating clicks.

```sh
{ cat _shell.html; echo '<script>'; cat _p1.js _p2.js _p3.js _p4.js _test.js; echo '</script>'; } > _t.html

"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --window-size=1600,1000 --screenshot=shot.png --virtual-time-budget=15000 \
  --enable-logging=stderr --log-level=0 "file:///$PWD/_t.html"
```

Console lines are tagged `[PASS]` / `[FAIL]`. Add assertions for anything you
change. Run it more than once if a result looks marginal — a real race was found
that way. Delete `_t.html` afterwards; it is git-ignored.

Append a hash to the URL to screenshot a state: `#plan`, `#dark`, `#wiz`, `#wiz3`,
`#sched`, `#shapes`, `#preview`, `#shot` / `#shotplan` / `#shotpreview`.

## House rules

- **No dependencies, ever.** No npm, no CDN scripts, no build tooling. There is no
  Node or Python on this machine and the app must run from a `file://` URL. The one
  external request is Google Fonts, which degrades to a system stack offline.
- **Centimetres everywhere.** Elevation is x right, y up from the case floor. Plan
  is x right, z away from the viewer with 0 at the back wall.
- **Commit messages carry no `Co-Authored-By` trailer.** This is the owner's
  preference for this repository.
- Explain version-control steps rather than assuming familiarity.
- Displayed scholarly content — object names, dates, interpretation wording — is
  the owner's call. Do not invent or alter it.

## Where the thinking is written down

`docs/DEVELOPING.md` explains *why* the non-obvious parts are the way they are:
the projection maths, depth ordering, the sticky support model, how undo avoids
copying image data, and how preview reuses the renderer. Read it before changing
geometry or draw order, and update it when you do.

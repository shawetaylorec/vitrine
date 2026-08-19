/* ============================================================
   Interaction — hit testing, dragging, keyboard
   ============================================================ */

/* Nearest the glass first, which is the drawing order reversed — so a
   click lands on whatever is actually on top. A few pixels of slack,
   so something thin is still catchable at any zoom. */
function hitTest(px, py) {
  const pt = s2w(px, py);
  const tol = T ? 5 / T.sc : 0.5;
  const list = S.items.filter(visible).sort((a, b) => depthKey(b) - depthKey(a));

  for (const it of list) {
    if (it.type === 'object') {
      if (S.view === 'front') {
        const L = layout(it);
        const dx = pt.a - L.pivot.x, dy = pt.b - L.pivot.y;
        const c = Math.cos(-L.rot), s = Math.sin(-L.rot);
        const lx = dx * c - dy * s, ly = dx * s + dy * c;
        if (lx >= -L.u * L.w - tol && lx <= (1 - L.u) * L.w + tol &&
          ly <= L.v * L.h + tol && ly >= -(1 - L.v) * L.h - tol) return it;
      } else {
        const f = footprint(it);
        if (pt.a >= f.x - tol && pt.a <= f.x + f.w + tol &&
          pt.b >= f.z - tol && pt.b <= f.z + f.d + tol) return it;
      }
    } else if (S.view === 'front') {
      const y0 = it.type === 'shelf' ? it.y - it.t : 0;
      const y1 = it.type === 'shelf' ? it.y : it.h;
      if (pt.a >= it.x && pt.a <= it.x + it.w && pt.b >= y0 - 0.6 && pt.b <= y1 + 0.6) return it;
    } else {
      if (pt.a >= it.x && pt.a <= it.x + it.w && pt.b >= it.z && pt.b <= it.z + it.d) return it;
    }
  }
  return null;
}

let drag = null;

/* supports the object is standing over, low to high */
function supportsUnder(o) {
  const b = bbox(o);
  const cx = (b.x0 + b.x1) / 2;
  return supportList()
    .filter(s => cx >= s.x - 1 && cx <= s.x + s.w + 1)
    .sort((a, c) => a.top - c.top);
}

function bestSupport(o, wantTop) {
  let best = null, bd = Infinity;
  for (const s of supportsUnder(o)) {
    const d = Math.abs(s.top - wantTop);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { s: best, d: bd } : null;
}

/* Which support an object belongs on after being dragged `db` cm
   vertically away from `fromId`.

   Sliding sideways must never re-home it, or an object worked along
   its plinth drops to the floor the moment its centre passes the
   edge — and picks the plinth back up on the way in. Only a real
   vertical move counts, and if there is nothing under it to land on
   it stays where it was rather than falling. */
const REHOME_CM = 2;
function supportAfterDrag(o, fromId, db) {
  if (!S.opt.snap || Math.abs(db) < REHOME_CM) return fromId;
  const startTop = supportList().find(s => s.id === fromId)?.top ?? 0;
  const b = bestSupport(o, startTop + db);
  return b ? b.s.id : fromId;
}

/* the next support up or down from the one it is on */
function stepSupport(o, dir) {
  const cur = supportOf(o).top;
  const under = supportsUnder(o);
  const next = dir > 0
    ? under.find(s => s.top > cur + 0.01)
    : under.filter(s => s.top < cur - 0.01).pop();
  return next ? next.id : o.support;
}

/* Bring an object over a support if it is not already on it, and
   otherwise leave it exactly where it is — so anything can sit
   wherever you want on a plinth, not only in the middle. */
function landOn(o, s) {
  const e = envelope(o), f = footprint(o);
  if (e.x < s.x - 0.01 || e.x + e.w > s.x + s.w + 0.01) {
    o.x = rnd(o.x + (s.x + (s.w - e.w) / 2 - e.x), 1);
  }
  if (e.z < s.z - 0.01 || e.z + e.d > s.z + s.d + 0.01) {
    o.z = rnd(clamp(s.z + (s.d - f.d) / 2, s.z, Math.max(s.z, s.z + s.d - f.d)), 1);
  }
}

/* Bring a fixed panel onto the surface it is stuck to, if it has
   wandered off it. Leaves it alone when it is already on. */
function landOnFace(o) {
  const f = faceOf(o);
  if (!f) return;
  const b = bbox(o);
  if (b.x0 < f.x - 0.01 || b.x1 > f.x + f.w + 0.01) o.x = rnd(f.x + (f.w - o.w) / 2, 1);
  if ((o.wallY || 0) < 0 || (o.wallY || 0) + o.h > f.top + 0.01) {
    o.wallY = rnd(Math.max(0, (f.top - o.h) / 2), 1);
  }
}

/* everything that travels with a shelf or plinth — things standing on
   it, and anything stuck to its front */
function childrenOf(id) {
  return S.items.filter(i => i.type === 'object' &&
    ((i.mount === 'placed' && i.support === id) || (i.mount === 'wall' && i.face === id)));
}

function pick(it) {
  const k = { x: it.x, z: it.z };
  if (it.type === 'shelf') k.y = it.y;
  if (it.type === 'plinth') k.h = it.h;
  if (it.type === 'object') {
    k.support = it.support;
    k.wallY = it.wallY;
    k.spin = it.spin || 0;
    k.wires = JSON.parse(JSON.stringify(it.wires || []));
  }
  return k;
}

cvs.addEventListener('pointerdown', e => {
  cvs.setPointerCapture(e.pointerId);
  const r = cvs.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  T = calcT();

  /* preview is look-only: dragging pans, nothing selects or moves */
  if (PREVIEW) {
    drag = { pan: true, sx: px, sy: py, px: S.pan.x, py: S.pan.y };
    return;
  }

  /* the rotation handle sits on top of everything */
  const h = spinHandlePos();
  if (h && Math.hypot(px - h.x, py - h.y) < 11) {
    const o = byId(S.sel);
    const b = bbox(o);
    const c = w2s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
    drag = { spin: true, id: o.id, cx: c.x, cy: c.y, start: o.spin || 0, a0: Math.atan2(py - c.y, px - c.x) };
    return;
  }

  const hit = (e.button === 1 || e.shiftKey) ? null : hitTest(px, py);
  if (hit) {
    select(hit.id);
    const pt = s2w(px, py);
    drag = {
      id: hit.id, sx: px, sy: py, a0: pt.a, b0: pt.b,
      snap: pick(hit), moved: false,
      kids: hit.type !== 'object' ? childrenOf(hit.id).map(k => ({ id: k.id, x: k.x, z: k.z })) : []
    };
  } else {
    drag = { pan: true, sx: px, sy: py, px: S.pan.x, py: S.pan.y };
    if (!e.shiftKey && e.button === 0) select(null);
  }
});

cvs.addEventListener('dblclick', e => {
  if (PREVIEW) return;
  const r = cvs.getBoundingClientRect();
  T = calcT();
  const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
  if (hit && hit.type === 'object') openWizard({ edit: hit.id, step: hit.render === 'image' ? 1 : 2 });
});

cvs.addEventListener('pointermove', e => {
  const r = cvs.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  T = calcT();
  const pt = s2w(px, py);
  $('#hudPos').textContent = S.view === 'front'
    ? `x ${rnd(pt.a)}  y ${rnd(pt.b)}`
    : `x ${rnd(pt.a)}  z ${rnd(pt.b)}`;

  if (PREVIEW) nudgeBar();

  if (!drag) {
    if (PREVIEW) { cvs.style.cursor = 'default'; return; }
    const h = spinHandlePos();
    cvs.style.cursor = (h && Math.hypot(px - h.x, py - h.y) < 11) ? 'grab'
      : hitTest(px, py) ? 'grab' : 'default';
    return;
  }

  if (drag.pan) {
    S.pan.x = drag.px + (px - drag.sx);
    S.pan.y = drag.py + (py - drag.sy);
    cvs.style.cursor = 'grabbing';
    draw();
    return;
  }

  if (drag.spin) {
    const o = byId(drag.id); if (!o) return;
    const a = Math.atan2(py - drag.cy, px - drag.cx);
    let deg = drag.start - (a - drag.a0) / DEG;   /* screen y is down, world y is up */
    if (!e.shiftKey) deg = Math.round(deg / 5) * 5;
    o.spin = rnd(((deg % 360) + 360) % 360, 1);
    drag.moved = true;
    syncInspector(); draw();
    return;
  }

  const it = byId(drag.id); if (!it) return;
  cvs.style.cursor = 'grabbing';
  const fine = e.shiftKey ? 0.1 : 1;
  const q = v => Math.round(v / fine) * fine;
  const da = pt.a - drag.a0, db = pt.b - drag.b0;
  drag.moved = true;

  if (S.view === 'plan') {
    it.x = q(clamp(drag.snap.x + da, -50, S.cs.w + 50));
    it.z = q(clamp(drag.snap.z + db, -20, S.cs.d + 20));
    for (const k of drag.kids) {
      const kid = byId(k.id); if (!kid) continue;
      kid.x = q(k.x + da); kid.z = q(k.z + db);
    }
  } else if (it.type === 'shelf') {
    it.x = q(drag.snap.x + da);
    it.y = q(clamp(drag.snap.y + db, 0, S.cs.h));
    for (const k of drag.kids) { const kid = byId(k.id); if (kid) kid.x = q(k.x + da); }
  } else if (it.type === 'plinth') {
    it.x = q(drag.snap.x + da);
    for (const k of drag.kids) { const kid = byId(k.id); if (kid) kid.x = q(k.x + da); }
  } else if (it.mount === 'hanging') {
    it.x = q(drag.snap.x + da);
    it.wires.forEach((w, i) => { w.len = Math.max(0, rnd(drag.snap.wires[i].len - db, 1)); });
  } else if (it.mount === 'wall') {
    it.x = q(drag.snap.x + da);
    it.wallY = q((drag.snap.wallY || 0) + db);
  } else {
    it.x = q(drag.snap.x + da);
    it.support = supportAfterDrag(it, drag.snap.support, db);
  }
  syncInspector();
  draw();
});

function endDrag() {
  if (drag && !drag.pan && drag.moved) commit();
  drag = null;
  cvs.style.cursor = 'default';
}
cvs.addEventListener('pointerup', endDrag);
cvs.addEventListener('pointercancel', endDrag);

cvs.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cvs.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  T = calcT();
  const before = s2w(px, py);
  S.zoom = clamp(S.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.2, 12);
  T = calcT();
  const after = s2w(px, py);
  S.pan.x += (after.a - before.a) * T.sc;
  S.pan.y += S.view === 'front' ? -(after.b - before.b) * T.sc : (after.b - before.b) * T.sc;
  updateZoomLabel(); draw();
}, { passive: false });

document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  if (PREVIEW) {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { exitPreview(); return; }
    if (e.key === '1') { setView('front'); return; }
    if (e.key === '2') { setView('plan'); return; }
    if (e.key.toLowerCase() === 'f') { fitView(); return; }
    return;                       /* nothing is editable in preview */
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (e.key.toLowerCase() === 'p') { enterPreview(); return; }
  if (!$('#shapeBack').hidden) { if (e.key === 'Escape') closeShapePicker(); return; }
  if (!$('#wizBack').hidden) {
    if (e.key === 'Escape') minimiseWizard();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); wizUndo(); }
    return;
  }
  const o = byId(S.sel);
  const step = e.shiftKey ? 0.1 : (e.ctrlKey || e.metaKey) ? 5 : 1;

  if (e.key === 'Escape') { select(null); return; }
  if (e.key === '1') { setView('front'); return; }
  if (e.key === '2') { setView('plan'); return; }
  if (e.key.toLowerCase() === 'f') { fitView(); return; }
  if (!o) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(o.id); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(o.id); return; }
  if (e.key.toLowerCase() === 'r' && o.type === 'object') {
    o.spin = rnd((((o.spin || 0) + (e.shiftKey ? -90 : 90)) % 360 + 360) % 360, 1);
    commit(); return;
  }
  if (e.key === 'Enter' && o.type === 'object') { openWizard({ edit: o.id, step: 3 }); return; }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dv = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
    if (dx) {
      o.x = rnd(o.x + dx, 1);
      if (o.type !== 'object') for (const k of childrenOf(o.id)) k.x = rnd(k.x + dx, 1);
    }
    if (dv) {
      if (S.view === 'plan') {
        o.z = rnd(o.z - dv, 1);
        if (o.type !== 'object') for (const k of childrenOf(o.id)) k.z = rnd(k.z - dv, 1);
      }
      else if (o.type === 'shelf') o.y = rnd(o.y + dv, 1);
      else if (o.type === 'plinth') o.h = Math.max(0.5, rnd(o.h + dv, 1));
      else if (o.mount === 'hanging') o.wires.forEach(w => { w.len = Math.max(0, rnd(w.len - dv, 1)); });
      else if (o.mount === 'wall') o.wallY = rnd((o.wallY || 0) + dv, 1);
      else o.support = stepSupport(o, dv);   /* up and down step between supports */
    }
    commit(); return;
  }
});

/* ============================================================
   Items
   ============================================================ */

function addShelf() {
  const n = S.items.filter(i => i.type === 'shelf').length + 1;
  const it = { id: uid(), type: 'shelf', name: `Shelf ${n}`, x: 1, w: S.cs.w - 2, y: rnd(S.cs.h * 0.5), t: 2, z: 1, d: S.cs.d - 2 };
  S.items.push(it); select(it.id); commit(); toast('Shelf added');
}
function addPlinth() {
  const n = S.items.filter(i => i.type === 'plinth').length + 1;
  const it = { id: uid(), type: 'plinth', name: `Plinth ${n}`, x: rnd(S.cs.w / 2 - 15), w: 30, h: 20, z: 5, d: Math.min(25, S.cs.d - 6) };
  S.items.push(it); select(it.id); commit(); toast('Plinth added');
}

function blankObject(extra) {
  return Object.assign({
    id: uid(), type: 'object', render: 'rect',
    name: 'Object', text: '', textSize: 0.55, colour: '', face: 'back',
    png: null, raw: null, topPng: null, planShape: 'auto',
    w: 20, h: 15, depth: 5,
    x: rnd(S.cs.w / 2 - 10), z: 4, wallY: 100, spin: 0,
    mount: 'placed', support: 'floor', lean: 0, leanFrom: 'upright',
    stand: { kind: 'none', w: 0, d: 0, h: 0 },
    rail: S.rail, wires: [], flip: false, flipV: false, hide: false
  }, extra || {});
}

/* ---- the shape picker ---- */

const thumbCache = new Map();
function shapeThumb(id, px = 26) {
  if (!C.struct) readPalette();          /* the lists can run before the first paint */
  const theme = document.documentElement.getAttribute('data-theme') || 'sys';
  const key = `${id}|${px}|${theme}|${C.struct}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  shapeDraw(c, id, 3, 3, px - 6, px - 6, C.struct || '#cdc5b2', C.structEdge || '#8c8471');
  const url = cv.toDataURL();
  thumbCache.set(key, url);
  return url;
}

let shapePickMode = 'new';
function openShapePicker(mode) {
  readPalette();
  shapePickMode = mode || 'new';
  const cur = byId(S.sel);
  $('#shapeTitle').textContent = shapePickMode === 'change' ? 'Change shape' : 'Choose a shape';
  const grid = $('#shapeGrid');
  grid.innerHTML = '';
  for (const s of SHAPES) {
    const cell = document.createElement('button');
    cell.className = 'shapecell';
    cell.type = 'button';
    cell.dataset.shape = s.id;
    if (shapePickMode === 'change' && cur && cur.render === s.id) cell.setAttribute('aria-pressed', 'true');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 76;
    shapeDraw(cv.getContext('2d'), s.id, 8, 8, 60, 60, C.struct, C.structEdge);
    cell.appendChild(cv);
    const b = document.createElement('b'); b.textContent = s.name; cell.appendChild(b);
    const i = document.createElement('i'); i.textContent = `${s.w}×${s.h}×${s.d}`; cell.appendChild(i);
    cell.onclick = () => choseShape(s.id);
    grid.appendChild(cell);
  }
  $('#shapeBack').hidden = false;
  grid.querySelector('.shapecell')?.focus();
}
function closeShapePicker() { $('#shapeBack').hidden = true; }

function choseShape(id) {
  const s = shapeById(id);
  closeShapePicker();
  if (shapePickMode === 'change') {
    const o = byId(S.sel);
    if (o) {
      const wasPanel = o.render === 'panel';
      o.render = id;
      if (wasPanel) { o.w = s.w; o.h = s.h; o.depth = s.d; }
      commit(); toast(`Now a ${s.name.toLowerCase()}`);
    }
    return;
  }
  const n = S.items.filter(i => i.type === 'object' && isShape(i)).length + 1;
  const it = blankObject({ name: `${s.name} ${n}`, render: id, w: s.w, h: s.h, depth: s.d });
  S.items.push(it);
  select(it.id); commit();
  toast(`${s.name} added — set its size on the right`);
}

function addShape() { openShapePicker('new'); }
function addPanel() {
  const n = S.items.filter(i => i.render === 'panel').length + 1;
  /* with a plinth selected you almost certainly want the panel on it */
  const sel = byId(S.sel);
  const host = sel && sel.type === 'plinth' ? sel : null;
  const it = blankObject({
    name: `Panel ${n}`, render: 'panel', mount: 'wall', face: 'back',
    w: 30, h: 21, depth: 0.4, wallY: rnd(S.cs.h * 0.55), z: 0,
    text: 'Interpretation text goes here.', textSize: 0.55
  });
  if (host) {
    it.face = host.id;
    it.w = rnd(Math.min(it.w, host.w - 4));
    it.h = rnd(Math.min(it.h, host.h - 4));
  }
  S.items.push(it);
  if (host) landOnFace(it);
  select(it.id); commit();
  toast(host ? `Panel added to the front of ${host.name}` : 'Panel added to the back wall');
}

function removeItem(id) {
  const it = byId(id); if (!it) return;
  S.items = S.items.filter(i => i.id !== id);
  for (const o of S.items) if (o.type === 'object' && o.support === id) o.support = 'floor';
  BMP.delete(id); TOP.delete(id);
  if (S.sel === id) S.sel = null;
  commit(); toast(`${it.name} removed — Ctrl+Z to put it back`);
}
async function duplicate(id) {
  const it = byId(id); if (!it) return;
  const c = JSON.parse(JSON.stringify(it));
  c.id = uid(); c.name = it.name + ' copy';
  c.x = rnd(clamp(it.x + 5, 0, S.cs.w));
  S.items.push(c);
  if (c.png) BMP.set(c.id, await loadImage(c.png));
  if (c.topPng) TOP.set(c.id, await loadImage(c.topPng));
  select(c.id); commit();
}

function select(id) {
  if (S.sel === id) return;
  S.sel = id;
  renderLists(); renderInspector(); draw();
}

function setView(v) {
  S.view = v; S.pan = { x: 0, y: 0 };
  $$('#viewSeg button, #pvSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#viewNote').textContent = v === 'front' ? 'looking at the back wall' : 'looking down from above';
  renderInspector(); draw();
}
function fitView() { S.zoom = 1; S.pan = { x: 0, y: 0 }; updateZoomLabel(); draw(); }
function updateZoomLabel() {
  const pct = Math.round(S.zoom * 100) + '%';
  $('#zVal').textContent = pct;
  $('#pvZoom').textContent = pct;
}

/* ---------------- preview ----------------
   Full screen, none of the drafting furniture, so what is left is the
   case as it would be seen. Zoom and pan still work. */

let barIdleT = 0;
function nudgeBar() {
  const bar = $('#previewBar');
  bar.classList.remove('idle');
  clearTimeout(barIdleT);
  barIdleT = setTimeout(() => { if (PREVIEW) bar.classList.add('idle'); }, 2600);
}

function enterPreview() {
  if (PREVIEW) return;
  PREVIEW = true;
  select(null);
  document.body.classList.add('preview');
  $('#pvName').textContent = S.name;
  $$('#pvSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
  nudgeBar();
  requestAnimationFrame(() => { fitView(); draw(); });
}

function exitPreview() {
  if (!PREVIEW) return;
  PREVIEW = false;
  document.body.classList.remove('preview');
  clearTimeout(barIdleT);
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
  requestAnimationFrame(() => { fitView(); draw(); });
}
const togglePreview = () => PREVIEW ? exitPreview() : enterPreview();

let toastT = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}

/* ============================================================
   Left rail lists
   ============================================================ */

function objBadge(o) {
  if (o.mount === 'hanging') return 'wire ' + rnd(o.wires && o.wires[0] ? o.wires[0].len : 0);
  if (o.mount === 'wall') return rnd(o.wallY || 0) + ' cm';
  return rnd(bbox(o).y0) + ' cm';
}
function objGlyph(o) {
  if (o.png) return `<img src="${o.png}" alt="">`;
  if (o.render === 'panel') return '&#9646;';
  return `<img src="${shapeThumb(o.render)}" alt="">`;
}

function renderLists() {
  const structs = S.items.filter(i => i.type !== 'object');
  const objs = S.items.filter(i => i.type === 'object');

  $('#listStruct').innerHTML = structs.length ? structs.map(it => `
    <div class="item${it.hide ? ' off' : ''}" data-id="${it.id}" aria-selected="${it.id === S.sel}">
      <span class="sw">${it.type === 'shelf' ? '&#9473;' : '&#9646;'}</span>
      <span class="nm">${esc(it.name)}</span>
      <span class="mt">${it.type === 'shelf' ? rnd(it.y) + ' cm' : 'h ' + rnd(it.h)}</span>
      <button class="eye" data-eye="${it.id}" title="Show / hide">${it.hide ? '&#9676;' : '&#9679;'}</button>
    </div>`).join('') : '<p class="empty">No shelves or plinths yet.</p>';

  $('#listObj').innerHTML = objs.length ? objs.map(it => `
    <div class="item${it.hide ? ' off' : ''}" data-id="${it.id}" aria-selected="${it.id === S.sel}">
      <span class="sw">${objGlyph(it)}</span>
      <span class="nm">${esc(it.name)}</span>
      <span class="mt">${objBadge(it)}</span>
      <button class="eye" data-eye="${it.id}" title="Show / hide">${it.hide ? '&#9676;' : '&#9679;'}</button>
    </div>`).join('') : '<p class="empty">No objects yet &mdash; add one from an image, or drop a shape in.</p>';

  for (const el of $$('.item')) {
    el.onclick = ev => { if (ev.target.dataset.eye) return; select(el.dataset.id); };
    el.ondblclick = () => { const it = byId(el.dataset.id); if (it && it.type === 'object') openWizard({ edit: it.id, step: 1 }); };
  }
  for (const el of $$('[data-eye]')) {
    el.onclick = ev => { ev.stopPropagation(); const it = byId(el.dataset.eye); it.hide = !it.hide; commit(); };
  }

  const sel = $('#levelFilter');
  const opts = [['all', 'All levels'], ['floor', 'Case floor'], ['hung', 'Hung on wires'], ['wall', 'Fixed to the wall']]
    .concat(S.items.filter(i => i.type !== 'object').map(i => [i.id, i.name]));
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
  sel.value = opts.some(o => o[0] === S.level) ? S.level : 'all';
  S.level = sel.value;
}

/* ============================================================
   Inspector
   ============================================================ */

function fld(lab, id, value, { step = 0.5, min = null } = {}) {
  return `<label class="f"><span>${lab}</span><input type="number" id="${id}" value="${value}" step="${step}"${min !== null ? ` min="${min}"` : ''}></label>`;
}
const shownLean = o => o.leanFrom === 'flat' ? 90 - (o.lean || 0) : (o.lean || 0);

function renderInspector() {
  const box = $('#inspector');
  const o = byId(S.sel);
  $('#hudSel').textContent = o ? o.name : 'Nothing selected';

  if (!o) {
    const n = S.items.filter(i => i.type === 'object').length;
    box.innerHTML = `
      <section class="sect">
        <h2>Case</h2>
        <div class="readout">
          <span>W <b>${rnd(S.cs.w)}</b></span><span>H <b>${rnd(S.cs.h)}</b></span><span>D <b>${rnd(S.cs.d)}</b></span>
          <span>objects <b>${n}</b></span>
        </div>
        <p class="note">Select something in the case, or in the lists on the left, to edit it. Double-click an object to reopen its cut-out, size and mounting pages.</p>
      </section>
      <section class="sect">
        <h2>Keys</h2>
        <p class="note" style="line-height:1.75">
          <kbd>1</kbd> elevation &nbsp; <kbd>2</kbd> plan &nbsp; <kbd>F</kbd> fit<br>
          <kbd>&larr;&uarr;&rarr;&darr;</kbd> nudge 1 cm &middot; <kbd>Shift</kbd> 0.1 &middot; <kbd>Ctrl</kbd> 5<br>
          <kbd>R</kbd> turn 90&deg; &nbsp; <kbd>Enter</kbd> mounting page<br>
          <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate &nbsp; <kbd>Del</kbd> remove<br>
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo &nbsp; <kbd>Ctrl</kbd>+<kbd>Y</kbd> redo<br>
          <kbd>Ctrl</kbd>+<kbd>V</kbd> paste a picture straight in<br>
          Drag empty sheet to pan &middot; scroll to zoom
        </p>
      </section>
      <section class="sect">
        <h2>Project</h2>
        <label class="f full"><span>Name</span><input type="text" id="projName" value="${esc(S.name)}"></label>
      </section>`;
    $('#projName').onchange = e => { S.name = e.target.value || 'Untitled case'; commit(); };
    return;
  }

  const warn = outOfCase(o);
  let html = '';

  if (o.type === 'object') {
    const L = layout(o), b = bbox(o), f = footprint(o), st = standOf(o);
    const isImg = o.render === 'image';
    html += `
    <section class="sect">
      <h2>${o.render === 'panel' ? 'Panel' : isImg ? 'Object' : 'Shape'}</h2>
      ${isImg ? `<div class="thumb" id="iThumb" title="Click to reopen the cut-out">${o.png ? `<img src="${o.png}" alt="">` : ''}</div>` : ''}
      <label class="f full"><span>Name</span><input type="text" id="iName" value="${esc(o.name)}"></label>
      ${o.render === 'panel' ? `
        <label class="f full"><span>Text &mdash; paste straight in</span><textarea id="iText" rows="4" placeholder="Interpretation text">${esc(o.text || '')}</textarea></label>
        <div class="fields">
          ${fld('Text size cm', 'iTextSize', rnd(textSizeOf(o), 2), { step: 0.05, min: 0.1 })}
          <label class="f"><span>&asymp; points</span><input type="text" id="iTextPt" value="${ptOf(textSizeOf(o))} pt" disabled></label>
          <label class="f"><span>Fill</span><input type="color" id="iColour" value="${o.colour || '#ffffff'}"></label>
        </div>
        ${panelFits(o) ? '' : '<p class="warnbox">The text runs past the bottom of the panel. Make the panel taller, or the type smaller.</p>'}
        <button class="btn sm ghost" id="iToShape">Turn it into a shape&hellip;</button>` : ''}
      ${isShape(o) ? `<div class="row">
        <span class="sw" style="width:36px;height:36px;flex:none;border:1px solid var(--line);border-radius:4px;overflow:hidden;display:grid;place-items:center"><img src="${shapeThumb(o.render, 36)}" alt="" style="width:100%;height:100%"></span>
        <button class="btn" id="iShape" style="flex:1">Change shape&hellip;</button>
        <label class="f" style="width:56px"><span>Fill</span><input type="color" id="iColour" value="${o.colour || '#b9b2a0'}"></label>
      </div>
      <button class="btn sm ghost" id="iToPanel">Turn it into a panel</button>` : ''}
      <div class="readout">
        <span>occupies <b>${rnd(b.x1 - b.x0)} &times; ${rnd(b.y1 - b.y0)}</b> cm</span>
        <span>base <b>${rnd(b.y0)}</b> · top <b>${rnd(b.y1)}</b></span>
      </div>
      ${warn.length ? `<p class="warnbox">Sticks out: ${warn.join('; ')}.</p>` : ''}
      <div class="fields">
        ${fld('Width cm', 'iW', rnd(o.w, 2), { step: 0.1, min: 0.1 })}
        ${fld('Height cm', 'iH', rnd(o.h, 2), { step: 0.1, min: 0.1 })}
        ${fld('Depth cm', 'iD', rnd(o.depth, 2), { step: 0.1, min: 0.1 })}
      </div>
      <label class="chk"><input type="checkbox" id="iAspect" ${o.keepAspect === false ? '' : 'checked'}>Keep proportions when I change one</label>
      <div class="fields">
        ${fld('Turn &deg;', 'iSpin', rnd(o.spin || 0), { step: 1 })}
        <label class="f"><span>Quick</span><button class="btn" id="iSpin90" style="padding:4px">&#8635; 90&deg;</button></label>
        <label class="f"><span>Mirror</span><button class="btn" id="iFlip" style="padding:4px">${o.flip ? 'Flipped' : 'Normal'}</button></label>
      </div>
      <p class="note">Drag the round handle above a selected object to turn it by hand.</p>
    </section>

    <section class="sect">
      <h2>Mounting</h2>
      <div class="tools" id="iMount">
        ${o.render === 'panel' ? '' : `<button data-mount="placed" aria-pressed="${o.mount === 'placed'}">Placed</button>`}
        <button data-mount="hanging" aria-pressed="${o.mount === 'hanging'}">Wires</button>
        <button data-mount="wall" aria-pressed="${o.mount === 'wall'}">Fixed</button>
      </div>`;

    if (o.mount === 'placed') {
      html += `
      <label class="f full"><span>Rests on</span><select id="iSupport">
        ${supportList().map(s => `<option value="${s.id}"${s.id === o.support ? ' selected' : ''}>${esc(s.name)} &mdash; top at ${rnd(s.top)} cm</option>`).join('')}
      </select></label>
      <div class="row">
        <label class="f" style="flex:1"><span>Lean measured from</span><select id="iLeanFrom">
          <option value="upright"${o.leanFrom !== 'flat' ? ' selected' : ''}>Upright</option>
          <option value="flat"${o.leanFrom === 'flat' ? ' selected' : ''}>Flat</option>
        </select></label>
        <label class="f" style="width:70px"><span>Angle</span><input type="number" id="iLeanNum" min="0" max="90" step="1" value="${rnd(shownLean(o))}"></label>
      </div>
      <input type="range" id="iLean" min="0" max="90" value="${rnd(shownLean(o))}">
      <div class="readout"><span>base <b>${rnd(supportOf(o).top + standLift(o))}</b> cm</span><span>seen height <b>${rnd(L.h)}</b></span><span>deck used <b>${rnd(f.d)}</b> cm</span></div>`;
    } else if (o.mount === 'wall') {
      const f = faceOf(o);
      html += `
      <label class="f full"><span>Fixed to</span><select id="iFace">
        <option value="back"${!f ? ' selected' : ''}>The back wall</option>
        ${S.items.filter(i => i.type === 'plinth').map(p =>
        `<option value="${p.id}"${f && f.id === p.id ? ' selected' : ''}>Front of ${esc(p.name)}</option>`).join('')}
      </select></label>
      <div class="fields two">
        ${fld('Bottom edge cm', 'iWallY', rnd(o.wallY || 0), { step: 0.5 })}
        ${f ? '' : fld('Stands off cm', 'iZ2', rnd(o.z), { step: 0.1, min: 0 })}
      </div>
      <p class="note">${f
          ? `Stuck flat to the front of ${esc(f.name)}, ${rnd(o.wallY || 0)} cm up its face. Barely a line in plan, and it moves with the plinth.`
          : 'Stuck flat to the back wall.'}</p>`;
    } else {
      html += `
      <label class="f full"><span>Rail height cm</span><input type="number" id="iRail" value="${rnd(o.rail ?? S.rail)}" step="0.5"></label>
      <div class="list">
        ${(o.wires || []).map((w, i) => `
          <div class="fields two" style="align-items:end">
            <label class="f"><span>Wire ${i + 1} length</span><input type="number" data-wl="${i}" value="${rnd(w.len)}" step="0.5" min="0"></label>
            <label class="f"><span>Across image %</span><input type="number" data-wa="${i}" value="${Math.round(w.ax * 100)}" step="1" min="0" max="100"></label>
          </div>`).join('')}
      </div>
      <div class="row">
        ${(o.wires || []).length < 2 ? '<button class="btn ghost" id="iAddWire" style="flex:1">Add second wire</button>' : '<button class="btn ghost" id="iDropWire" style="flex:1">Use one wire</button>'}
        ${(o.wires || []).length > 1 ? '<button class="btn ghost" id="iLevelWires">Level</button>' : ''}
      </div>
      <div class="readout"><span>spacing <b>${(o.wires || []).length > 1 ? rnd(Math.abs(o.wires[1].ax - o.wires[0].ax) * o.w) : '—'}</b> cm</span><span>hangs at <b>${rnd(-L.rot / DEG)}&deg;</b></span></div>
      <p class="note">Drag the object up or down to change both wire lengths at once.</p>`;
    }
    html += `</section>`;

    if (o.mount === 'placed') {
      html += `
      <section class="sect">
        <h2>Stand or cradle</h2>
        <label class="f full"><span>Type</span><select id="iStandKind">
          ${[['none', 'None'], ['block', 'Plain block'], ['stand', 'V stand (acrylic)'], ['cradle', 'Book cradle']]
          .map(([v, l]) => `<option value="${v}"${(st ? st.kind : 'none') === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        ${!st ? '' : cradleFits(st.kind) ? `<div class="fields">
          ${fld('Base h cm', 'iStandH', rnd(st.h), { step: 0.5, min: 0 })}
        </div>
        <div class="readout"><span>takes the book&rsquo;s own <b>${rnd(standBox(o).w)} &times; ${rnd(standBox(o).d)}</b> cm</span></div>`
      : `<div class="fields">
          ${fld('W cm', 'iStandW', rnd(st.w), { step: 0.5, min: 0.5 })}
          ${fld('D cm', 'iStandD', rnd(st.d), { step: 0.5, min: 0.5 })}
          ${fld('Base h cm', 'iStandH', rnd(st.h), { step: 0.5, min: 0 })}
        </div>
        <div class="readout"><span>stand needs <b>${rnd(st.w)} &times; ${rnd(st.d)}</b> cm of deck</span></div>`}
        <p class="note">${st && cradleFits(st.kind)
        ? 'A cradle is made to fit its book, so it takes the object&rsquo;s own width and depth — you give only the height.'
        : 'Always centred under the object and moves with it. A V stand only reads as a V in the plan view.'}</p>
      </section>`;
    }

    html += `
    <section class="sect">
      <h2>Seen from above</h2>
      <label class="f full"><span>Plan shape</span><select id="iPlanShape">
        ${[['auto', 'Automatic'], ['rect', 'Rectangle'], ['ellipse', 'Circle / oval'], ['image', 'The picture itself'], ['top', 'Top-view picture']]
        .map(([v, l]) => `<option value="${v}"${(o.planShape || 'auto') === v ? ' selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <button class="btn sm" id="iTopView">${o.topPng ? 'Replace' : 'Add'} top-view picture&hellip;</button>
      <div class="readout"><span>drawn as <b>${planMode(o)}</b></span></div>
    </section>

    <section class="sect">
      <h2>Position</h2>
      <div class="fields">
        ${fld('X from left', 'iX', rnd(o.x), { step: 0.5 })}
        ${fld('Z from back', 'iZ', rnd(o.z), { step: 0.5 })}
        <label class="f"><span>&nbsp;</span><button class="btn" id="iCentre" style="padding:4px">Centre</button></label>
      </div>
    </section>

    <section class="sect">
      <h2>Rework</h2>
      ${isImg ? `<div class="row">
        <button class="btn" id="iEditCut" style="flex:1">Cut-out</button>
        <button class="btn" id="iEditScale" style="flex:1">Size</button>
        <button class="btn" id="iEditMount" style="flex:1">Mount</button>
      </div>
      <p class="note">Or double-click the object in the case.</p>` : ''}
      <div class="row">
        <button class="btn ghost" id="iDup" style="flex:1">Duplicate</button>
        <button class="btn ghost danger" id="iDel" style="flex:1">Remove</button>
      </div>
    </section>`;
  }

  if (o.type === 'shelf') {
    html += `
    <section class="sect">
      <h2>Shelf</h2>
      <label class="f full"><span>Name</span><input type="text" id="iName" value="${esc(o.name)}"></label>
      <div class="fields">
        ${fld('Height cm', 'iY', rnd(o.y), { step: 0.5, min: 0 })}
        ${fld('Thickness', 'iT', rnd(o.t), { step: 0.1, min: 0.1 })}
        ${fld('X from left', 'iX', rnd(o.x), { step: 0.5 })}
        ${fld('Width cm', 'iW', rnd(o.w), { step: 0.5, min: 1 })}
        ${fld('Z from back', 'iZ', rnd(o.z), { step: 0.5 })}
        ${fld('Depth cm', 'iD', rnd(o.d), { step: 0.5, min: 1 })}
      </div>
      <button class="btn ghost" id="iFull">Fill the case width and depth</button>
      <div class="readout"><span>carrying <b>${childrenOf(o.id).length}</b> objects</span></div>
      <p class="note">Moving it sideways takes whatever is standing on it along too.</p>
    </section>
    <section class="sect">
      <div class="row">
        <button class="btn ghost" id="iDup" style="flex:1">Duplicate</button>
        <button class="btn ghost danger" id="iDel" style="flex:1">Remove</button>
      </div>
    </section>`;
  }

  if (o.type === 'plinth') {
    html += `
    <section class="sect">
      <h2>Plinth</h2>
      <label class="f full"><span>Name</span><input type="text" id="iName" value="${esc(o.name)}"></label>
      <div class="fields">
        ${fld('Width cm', 'iW', rnd(o.w), { step: 0.5, min: 1 })}
        ${fld('Depth cm', 'iD', rnd(o.d), { step: 0.5, min: 1 })}
        ${fld('Height cm', 'iH', rnd(o.h), { step: 0.5, min: 0.5 })}
        ${fld('X from left', 'iX', rnd(o.x), { step: 0.5 })}
        ${fld('Z from back', 'iZ', rnd(o.z), { step: 0.5 })}
        <label class="f"><span>&nbsp;</span><button class="btn" id="iCentre" style="padding:4px">Centre</button></label>
      </div>
      <div class="readout"><span>top at <b>${rnd(o.h)}</b> cm</span><span>carrying <b>${childrenOf(o.id).length}</b> objects</span></div>
      <p class="note">Moving it takes whatever is standing on it along too.</p>
    </section>
    <section class="sect">
      <div class="row">
        <button class="btn ghost" id="iDup" style="flex:1">Duplicate</button>
        <button class="btn ghost danger" id="iDel" style="flex:1">Remove</button>
      </div>
    </section>`;
  }

  box.innerHTML = html;
  bindInspector(o);
}

function bindInspector(o) {
  const on = (id, ev, fn) => { const el = $('#' + id); if (el) el.addEventListener(ev, fn); };
  const setNum = (id, fn) => on(id, 'change', e => { fn(num(e.target.value)); commit(); });

  on('iName', 'change', e => { o.name = e.target.value || o.name; commit(); });
  /* live on input so a paste shows up at once, saved on blur —
     commit() rebuilds this panel and would steal the caret */
  on('iText', 'input', e => { o.text = e.target.value; draw(); });
  on('iText', 'change', () => commit());
  on('iTextSize', 'input', e => {
    o.textSize = Math.max(0.1, num(e.target.value));
    const pt = $('#iTextPt'); if (pt) pt.value = ptOf(o.textSize) + ' pt';
    draw();
  });
  on('iTextSize', 'change', () => commit());
  on('iColour', 'input', e => { o.colour = e.target.value; draw(); });
  on('iColour', 'change', () => commit());
  on('iShape', 'click', () => openShapePicker('change'));
  on('iToShape', 'click', () => openShapePicker('change'));
  on('iToPanel', 'click', () => {
    o.render = 'panel';
    if (!o.text) o.text = 'Interpretation text goes here.';
    o.depth = Math.min(o.depth, 1);
    commit();
  });
  setNum('iT', v => o.t = Math.max(0.1, v));
  setNum('iY', v => o.y = clamp(v, 0, S.cs.h));
  setNum('iRail', v => o.rail = v);
  setNum('iWallY', v => o.wallY = v);
  setNum('iZ2', v => o.z = Math.max(0, v));
  on('iFace', 'change', e => { o.face = e.target.value; landOnFace(o); commit(); });

  /* moving a support carries its objects */
  const moveWithKids = (axis) => (v) => {
    const d = v - o[axis];
    o[axis] = v;
    if (o.type !== 'object') for (const k of childrenOf(o.id)) k[axis] = rnd(k[axis] + d, 2);
  };
  setNum('iX', moveWithKids('x'));
  setNum('iZ', moveWithKids('z'));

  if (o.type === 'object') {
    const aspect = o.h / o.w;
    setNum('iW', v => {
      if (v <= 0) return;
      if ($('#iAspect')?.checked) o.h = rnd(v * aspect, 2);
      o.w = v;
    });
    setNum('iH', v => {
      if (v <= 0) return;
      if ($('#iAspect')?.checked) o.w = rnd(v / aspect, 2);
      o.h = v;
    });
    on('iAspect', 'change', e => { o.keepAspect = e.target.checked; });
    setNum('iD', v => o.depth = Math.max(0.1, v));
    setNum('iSpin', v => o.spin = rnd(((v % 360) + 360) % 360, 1));
    on('iSpin90', 'click', () => { o.spin = rnd((((o.spin || 0) + 90) % 360), 1); commit(); });
    on('iFlip', 'click', () => { o.flip = !o.flip; commit(); });
    on('iSupport', 'change', e => {
      o.support = e.target.value;
      landOn(o, supportOf(o));     /* bring it over, if it is not already */
      commit();
    });
    on('iThumb', 'click', () => openWizard({ edit: o.id, step: 1 }));

    const applyLean = shown => {
      const s = clamp(shown, 0, 90);
      o.lean = o.leanFrom === 'flat' ? 90 - s : s;
    };
    on('iLean', 'input', e => {
      applyLean(num(e.target.value));
      const n = $('#iLeanNum'); if (n) n.value = rnd(num(e.target.value));
      draw();
    });
    on('iLean', 'change', () => commit());
    on('iLeanNum', 'change', e => { applyLean(num(e.target.value)); commit(); });
    on('iLeanFrom', 'change', e => { o.leanFrom = e.target.value; commit(); });

    on('iStandKind', 'change', e => {
      const kind = e.target.value;
      if (kind === 'none') o.stand = { kind: 'none', w: 0, d: 0, h: 0 };
      else {
        const f = footprint(o);
        o.stand = {
          kind,
          w: rnd(o.stand && o.stand.w ? o.stand.w : Math.max(4, o.w * 0.6)),
          d: rnd(o.stand && o.stand.d ? o.stand.d : Math.max(4, f.d + 2)),
          h: o.stand && o.stand.h ? o.stand.h : (kind === 'cradle' ? 6 : 4)
        };
      }
      commit();
    });
    setNum('iStandW', v => o.stand.w = Math.max(0.5, v));
    setNum('iStandD', v => o.stand.d = Math.max(0.5, v));
    setNum('iStandH', v => o.stand.h = Math.max(0, v));

    on('iPlanShape', 'change', e => {
      o.planShape = e.target.value;
      if (e.target.value === 'top' && !o.topPng) pickTopView(o.id);
      else commit();
    });
    on('iTopView', 'click', () => pickTopView(o.id));

    for (const el of $$('[data-wl]')) el.addEventListener('change', () => { o.wires[+el.dataset.wl].len = Math.max(0, num(el.value)); commit(); });
    for (const el of $$('[data-wa]')) el.addEventListener('change', () => { o.wires[+el.dataset.wa].ax = clamp(num(el.value) / 100, 0, 1); commit(); });
    on('iAddWire', 'click', () => {
      const a = (o.wires && o.wires[0]) || { ax: 0.5, ay: 0.05, len: 20 };
      o.wires = [{ ...a, ax: 0.2 }, { ...a, ax: 0.8 }];
      commit();
    });
    on('iDropWire', 'click', () => { o.wires = [{ ...o.wires[0], ax: 0.5 }]; commit(); });
    on('iLevelWires', 'click', () => { const l = o.wires[0].len; o.wires.forEach(w => w.len = l); commit(); });
    on('iMount', 'click', e => {
      const b = e.target.closest('[data-mount]'); if (!b) return;
      setMount(o, b.dataset.mount); commit();
    });
    on('iCentre', 'click', () => { o.x = rnd((S.cs.w - o.w) / 2); commit(); });
    on('iEditCut', 'click', () => openWizard({ edit: o.id, step: 1 }));
    on('iEditScale', 'click', () => openWizard({ edit: o.id, step: 2 }));
    on('iEditMount', 'click', () => openWizard({ edit: o.id, step: 3 }));
  }

  if (o.type === 'shelf') {
    on('iFull', 'click', () => { o.x = 1; o.w = S.cs.w - 2; o.z = 1; o.d = S.cs.d - 2; commit(); });
    setNum('iW', v => o.w = Math.max(1, v));
    setNum('iD', v => o.d = Math.max(1, v));
  }
  if (o.type === 'plinth') {
    setNum('iW', v => o.w = Math.max(1, v));
    setNum('iD', v => o.d = Math.max(1, v));
    setNum('iH', v => o.h = Math.max(0.5, v));
    on('iCentre', 'click', () => { o.x = rnd((S.cs.w - o.w) / 2); commit(); });
  }

  on('iDup', 'click', () => duplicate(o.id));
  on('iDel', 'click', () => removeItem(o.id));
}

function setMount(o, mount) {
  if (o.mount === mount) return;
  const b = bbox(o);
  o.mount = mount;
  if (mount === 'hanging') {
    o.rail = o.rail || S.rail;
    if (!o.wires || !o.wires.length) o.wires = [{ ax: 0.5, ay: 0.05, len: 20 }];
    o.wires.forEach(w => { w.len = Math.max(0, rnd(o.rail - (b.y1 - w.ay * o.h), 1)); });
  } else if (mount === 'wall') {
    o.wallY = rnd(b.y0);
    o.face = o.face || 'back';
    landOnFace(o);
  } else {
    const best = bestSupport(o, b.y0);
    o.support = best ? best.s.id : 'floor';
    o.lean = o.lean || 0;
    landOn(o, supportOf(o));
  }
}

/* light-touch update of inspector numbers during a drag */
function syncInspector() {
  const o = byId(S.sel); if (!o) return;
  const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
  set('iX', rnd(o.x)); set('iZ', rnd(o.z));
  if (o.type === 'shelf') set('iY', rnd(o.y));
  if (o.type === 'plinth') set('iH', rnd(o.h));
  if (o.type === 'object') {
    set('iSpin', rnd(o.spin || 0));
    set('iWallY', rnd(o.wallY || 0));
    if (o.wires) for (const el of $$('[data-wl]')) if (document.activeElement !== el) el.value = rnd(o.wires[+el.dataset.wl].len);
  }
}

/* ============================================================
   Vitrine — schematic display-case layout
   Units: centimetres everywhere. Elevation looks at the back
   wall (x right, y up from the case floor). Plan looks down
   (x right, z away from the viewer, 0 = back wall).
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (v, n = 1) => { const p = 10 ** n; return Math.round(v * p) / p; };
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const DEG = Math.PI / 180;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
  name: 'Untitled case',
  cs: { w: 140, h: 160, d: 40 },
  rail: 156,
  bg: { colour: '', img: null, fade: 100 },
  items: [],
  sel: null,
  view: 'front',
  zoom: 1,
  pan: { x: 0, y: 0 },
  opt: { grid: true, dims: true, snap: true },
  level: 'all'
};

/* bitmap caches, keyed by item id */
const BMP = new Map();      // the cut-out
const TOP = new Map();      // optional top-view picture
let BGIMG = null;           // back-wall image

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('image failed to load'));
    i.src = src;
  });
}

/* ---------------- supports ---------------- */

function supportList() {
  const out = [{ id: 'floor', name: 'Case floor', top: 0, x: 0, w: S.cs.w, z: 0, d: S.cs.d }];
  for (const it of S.items) {
    if (it.type === 'shelf') out.push({ id: it.id, name: it.name, top: it.y, x: it.x, w: it.w, z: it.z, d: it.d });
    if (it.type === 'plinth') out.push({ id: it.id, name: it.name, top: it.h, x: it.x, w: it.w, z: it.z, d: it.d });
  }
  return out;
}
const supportOf = o => supportList().find(s => s.id === o.support) || supportList()[0];
const byId = id => S.items.find(i => i.id === id);

function levelKey(o) {
  if (o.type !== 'object') return o.id;
  if (o.mount === 'hanging') return 'hung';
  if (o.mount === 'wall') return 'wall';
  return o.support || 'floor';
}
function visible(o) {
  if (o.hide) return false;
  if (S.level === 'all') return true;
  if (o.type === 'object') return levelKey(o) === S.level;
  return o.id === S.level || S.level === 'floor';
}

/* ---------------- stands and cradles ----------------
   A stand belongs to its object: it is always centred under it
   and travels with it. `h` is the end height for a cradle (the
   V arms) and the lift for everything else. */

const STAND_NONE = { kind: 'none', w: 0, d: 0, h: 0 };
const standOf = o => (o.stand && o.stand.kind && o.stand.kind !== 'none') ? o.stand : null;

/* how far the stand raises the object's underside */
function standLift(o) {
  const st = standOf(o);
  if (!st) return 0;
  /* a book cradle holds the block in its valley, so the middle is
     effectively on the deck — only the arms stand proud */
  return st.kind === 'cradle' ? 0 : st.h;
}

function standBox(o) {
  const st = standOf(o);
  if (!st || o.mount !== 'placed') return null;
  const b = bbox(o), f = footprint(o);
  const cx = (b.x0 + b.x1) / 2, cz = f.z + f.d / 2;
  return {
    kind: st.kind,
    x: cx - st.w / 2, w: st.w,
    z: cz - st.d / 2, d: st.d,
    h: st.h,
    base: supportOf(o).top
  };
}

/* ---------------- object geometry ----------------
   layout() places the artwork in world space: the point (u,v) on
   the picture — u across, v down from the top, both normalised —
   is pinned to `pivot`, and the picture is rotated by `rot`. */

function layout(o) {
  const spin = (o.spin || 0) * DEG;

  if (o.mount === 'hanging') {
    const ws = (o.wires && o.wires.length) ? o.wires : [{ ax: 0.5, ay: 0.04, len: 20 }];
    const w1 = ws[0];
    const p1 = { x: o.x + w1.ax * o.w, y: (o.rail ?? S.rail) - w1.len };
    let rot = 0;
    if (ws.length > 1) {
      const w2 = ws[1];
      const dx = (w2.ax - w1.ax) * o.w;
      if (Math.abs(dx) > 1e-6) rot = Math.atan2(((o.rail ?? S.rail) - w2.len) - p1.y, dx);
    }
    return { w: o.w, h: o.h, rot: rot + spin, pivot: p1, u: w1.ax, v: w1.ay };
  }

  if (o.mount === 'wall') {
    return { w: o.w, h: o.h, rot: spin, pivot: { x: o.x + o.w / 2, y: o.wallY || 0 }, u: 0.5, v: 1 };
  }

  /* placed: lean foreshortens the height, spin turns it in the
     picture plane, then the whole thing drops until its lowest
     corner rests on the support */
  const lean = (o.lean || 0) * DEG;
  const hEff = o.h * Math.cos(lean);
  const base = supportOf(o).top + standLift(o);
  const c = Math.cos(spin), s = Math.sin(spin);
  let minY = Infinity;
  for (const [a, b] of [[-o.w / 2, 0], [o.w / 2, 0], [o.w / 2, hEff], [-o.w / 2, hEff]]) {
    minY = Math.min(minY, a * s + b * c);
  }
  return { w: o.w, h: hEff, rot: spin, pivot: { x: o.x + o.w / 2, y: base - minY }, u: 0.5, v: 1 };
}

function corners(o) {
  const L = layout(o);
  const left = -L.u * L.w, right = (1 - L.u) * L.w;
  const top = L.v * L.h, bot = -(1 - L.v) * L.h;
  const c = Math.cos(L.rot), s = Math.sin(L.rot);
  return [[left, bot], [right, bot], [right, top], [left, top]].map(([a, b]) => ({
    x: L.pivot.x + a * c - b * s,
    y: L.pivot.y + a * s + b * c
  }));
}

function bbox(o) {
  const p = corners(o);
  const xs = p.map(q => q.x), ys = p.map(q => q.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/* footprint in plan. Leaning back tips the top edge towards the
   back wall, so the patch of deck it covers grows: z is the back
   edge, z+d the front, and the object's own thickness sits at the
   front of that span. */
function footprint(o) {
  const b = bbox(o);
  const lean = o.mount === 'placed' ? (o.lean || 0) * DEG : 0;
  return { x: b.x0, w: b.x1 - b.x0, z: o.z, d: o.depth + o.h * Math.sin(lean) };
}

/* everything the object needs room for, stand included */
function envelope(o) {
  const f = footprint(o), st = standBox(o);
  if (!st) return f;
  const x0 = Math.min(f.x, st.x), x1 = Math.max(f.x + f.w, st.x + st.w);
  const z0 = Math.min(f.z, st.z), z1 = Math.max(f.z + f.d, st.z + st.d);
  return { x: x0, w: x1 - x0, z: z0, d: z1 - z0 };
}

function outOfCase(o) {
  const msgs = [];
  if (o.type !== 'object') return msgs;
  const b = bbox(o), e = envelope(o);
  if (b.x0 < -0.05 || b.x1 > S.cs.w + 0.05) msgs.push('past the side of the case');
  if (b.y1 > S.cs.h + 0.05) msgs.push('above the case top');
  if (b.y0 < -0.05) msgs.push('below the case floor');
  if (e.z < -0.05 || e.z + e.d > S.cs.d + 0.05) msgs.push('past the case depth');
  if (o.mount === 'placed') {
    const s = supportOf(o);
    if (e.x < s.x - 0.05 || e.x + e.w > s.x + s.w + 0.05) msgs.push('overhanging ' + s.name);
    if (e.z < s.z - 0.05 || e.z + e.d > s.z + s.d + 0.05) msgs.push('deeper than ' + s.name);
  }
  return msgs;
}

/* ---------------- view transform ---------------- */

const cvs = $('#sheet');
const mainCtx = cvs.getContext('2d');
/* ctx / VW / VH are swapped out when rendering to an export canvas */
let ctx = mainCtx;
let VW = 0, VH = 0;
const GUT = 26;   // ruler gutter, px
let T = null;

function fitScale() {
  const W = S.cs.w, H = S.view === 'front' ? S.cs.h : S.cs.d;
  return Math.min((VW - GUT - 64) / W, (VH - GUT - 74) / H);
}
function calcT() {
  if (ctx === mainCtx) { VW = cvs.clientWidth; VH = cvs.clientHeight; }
  const W = S.cs.w, H = S.view === 'front' ? S.cs.h : S.cs.d;
  const sc = fitScale() * S.zoom;
  return {
    sc, W, H,
    ox: GUT + (VW - GUT - W * sc) / 2 + S.pan.x,
    oy: GUT + (VH - GUT - H * sc) / 2 + S.pan.y
  };
}
/* world -> screen. In elevation b is y (up from floor); in plan b is z (back to front). */
function w2s(a, b) {
  return S.view === 'front'
    ? { x: T.ox + a * T.sc, y: T.oy + (S.cs.h - b) * T.sc }
    : { x: T.ox + a * T.sc, y: T.oy + b * T.sc };
}
function s2w(px, py) {
  return S.view === 'front'
    ? { a: (px - T.ox) / T.sc, b: S.cs.h - (py - T.oy) / T.sc }
    : { a: (px - T.ox) / T.sc, b: (py - T.oy) / T.sc };
}

/* ---------------- palette ---------------- */
let C = {};
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const g = n => cs.getPropertyValue(n).trim();
  C = {
    sheet: g('--sheet'), line: g('--sheet-line'), line2: g('--sheet-line-2'),
    ink: g('--ink'), ink2: g('--ink-2'), ink3: g('--ink-3'),
    accent: g('--accent'), plan: g('--plan'), warn: g('--warn'),
    caseFill: g('--case-fill'), caseEdge: g('--case-edge'),
    struct: g('--struct'), structEdge: g('--struct-edge'), panel: g('--panel')
  };
}
/* the back-wall colour dresses the elevation only — in plan you are
   looking down at the deck, which keeps its own tone */
const caseGround = () => (S.view === 'front' && S.bg.colour) ? S.bg.colour : C.caseFill;

const UIFONT = '"Barlow Semi Condensed",system-ui,sans-serif';
const MONO = '"IBM Plex Mono",ui-monospace,monospace';

function label(text, x, y, { size = 11, font = MONO, fill = C.ink2, align = 'center', base = 'middle', box = false, pad = 3, bg = null } = {}) {
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (box) {
    const wdt = ctx.measureText(text).width;
    const bx = align === 'center' ? x - wdt / 2 : align === 'right' ? x - wdt : x;
    ctx.fillStyle = bg || C.sheet;
    ctx.fillRect(bx - pad, y - size * 0.72, wdt + pad * 2, size * 1.44);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/* wrap to a width, keeping the line breaks the writer typed.
   ctx.font must already be set — the caller owns the measuring. */
function layoutText(text, maxW) {
  const lines = [];
  for (const para of String(text).split(/\r?\n/)) {
    if (!para.trim()) { lines.push(''); continue; }
    let cur = '';
    for (const wd of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; }
      else cur = test;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/* ---------------- the shape library ----------------
   One draw routine per shape, used both on the sheet and for the
   thumbnails in the picker, so what you choose is what you get. */

const SHAPES = [
  { id: 'rect', name: 'Box', plan: 'rect', w: 20, h: 25, d: 12 },
  { id: 'ellipse', name: 'Disc', plan: 'ellipse', w: 22, h: 22, d: 3 },
  { id: 'cylinder', name: 'Cylinder', plan: 'ellipse', w: 14, h: 24, d: 14 },
  { id: 'sphere', name: 'Sphere', plan: 'ellipse', w: 18, h: 18, d: 18 },
  { id: 'cone', name: 'Cone', plan: 'ellipse', w: 16, h: 22, d: 16 },
  { id: 'bowl', name: 'Bowl', plan: 'ellipse', w: 20, h: 9, d: 20 },
  { id: 'triangle', name: 'Triangle', plan: 'rect', w: 20, h: 18, d: 10 },
  { id: 'hex', name: 'Hexagon', plan: 'ellipse', w: 18, h: 18, d: 18 },
  { id: 'arch', name: 'Arched tablet', plan: 'rect', w: 20, h: 30, d: 5 },
  { id: 'book', name: 'Book', plan: 'rect', w: 18, h: 24, d: 5 },
  { id: 'ring', name: 'Ring', plan: 'ellipse', w: 24, h: 24, d: 3 },
  { id: 'taper', name: 'Tapered block', plan: 'rect', w: 24, h: 20, d: 18 }
];
const shapeById = id => SHAPES.find(s => s.id === id) || SHAPES[0];
const isShape = o => o.render !== 'image' && o.render !== 'panel';

function shapeDraw(c, id, x, y, w, h, fill, stroke) {
  const W = Math.abs(w), H = Math.abs(h);
  const cx = x + w / 2, cy = y + h / 2;
  c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 1.2;
  const solid = fn => { c.beginPath(); fn(); c.closePath(); c.fill(); c.stroke(); };

  switch (id) {
    case 'ellipse':
    case 'sphere':
      solid(() => c.ellipse(cx, cy, W / 2, H / 2, 0, 0, 7));
      if (id === 'sphere') {   /* a meridian, so it does not read as a flat disc */
        c.beginPath(); c.ellipse(cx, cy, W / 6, H / 2, 0, 0, 7); c.stroke();
      }
      break;

    case 'triangle':
      solid(() => { c.moveTo(cx, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); });
      break;

    case 'hex':
      solid(() => {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * W / 2, py = cy + Math.sin(a) * H / 2;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
      });
      break;

    case 'taper':
      solid(() => {
        const inset = W * 0.16;
        c.moveTo(x + inset, y); c.lineTo(x + w - inset, y);
        c.lineTo(x + w, y + h); c.lineTo(x, y + h);
      });
      break;

    case 'cylinder': {
      const ry = Math.min(H * 0.13, W * 0.36);
      c.beginPath(); c.rect(x, y + ry, w, h - 2 * ry); c.fill();
      c.beginPath(); c.ellipse(cx, y + h - ry, W / 2, ry, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(cx, y + ry, W / 2, ry, 0, 0, 7); c.fill();
      c.beginPath();
      c.moveTo(x, y + ry); c.lineTo(x, y + h - ry);
      c.moveTo(x + w, y + ry); c.lineTo(x + w, y + h - ry);
      c.stroke();
      c.beginPath(); c.ellipse(cx, y + ry, W / 2, ry, 0, 0, 7); c.stroke();
      c.beginPath(); c.ellipse(cx, y + h - ry, W / 2, ry, 0, 0, Math.PI); c.stroke();
      break;
    }

    case 'cone': {
      const ry = Math.min(H * 0.12, W * 0.34);
      c.beginPath();
      c.moveTo(cx, y); c.lineTo(x + w, y + h - ry);
      c.ellipse(cx, y + h - ry, W / 2, ry, 0, 0, Math.PI);
      c.lineTo(x, y + h - ry); c.closePath();
      c.fill(); c.stroke();
      c.beginPath(); c.ellipse(cx, y + h - ry, W / 2, ry, 0, Math.PI, 0); c.stroke();
      break;
    }

    case 'bowl': {
      const ry = Math.min(H * 0.42, W * 0.2);
      c.beginPath();
      c.moveTo(x, y + ry);
      c.ellipse(cx, y + ry, W / 2, h - ry, 0, 0, Math.PI);
      c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(cx, y + ry, W / 2, ry, 0, 0, 7); c.stroke();
      break;
    }

    case 'arch': {
      const r = Math.min(W / 2, H * 0.45);
      c.beginPath();
      c.moveTo(x, y + h); c.lineTo(x, y + r);
      c.ellipse(cx, y + r, W / 2, r, 0, Math.PI, 0);
      c.lineTo(x + w, y + h); c.closePath();
      c.fill(); c.stroke();
      break;
    }

    case 'ring': {
      c.beginPath();
      c.ellipse(cx, cy, W / 2, H / 2, 0, 0, Math.PI * 2);
      c.ellipse(cx, cy, W / 3.4, H / 3.4, 0, 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.beginPath(); c.ellipse(cx, cy, W / 2, H / 2, 0, 0, 7); c.stroke();
      c.beginPath(); c.ellipse(cx, cy, W / 3.4, H / 3.4, 0, 0, 7); c.stroke();
      break;
    }

    case 'book': {
      const sp = Math.max(2, W * 0.1);
      c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke();
      c.beginPath();
      c.moveTo(x + sp, y); c.lineTo(x + sp, y + h);
      c.moveTo(x + sp * 0.45, y + h * 0.06); c.lineTo(x + sp * 0.45, y + h * 0.94);
      c.stroke();
      break;
    }

    default:   /* rect, and anything unrecognised */
      c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke();
  }
}

function arrowDim(x1, y1, x2, y2, text, col) {
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1), a = 4.5;
  for (const [px, py, dir] of [[x1, y1, ang], [x2, y2, ang + Math.PI]]) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(dir - 0.4) * a * 2, py + Math.sin(dir - 0.4) * a * 2);
    ctx.lineTo(px + Math.cos(dir + 0.4) * a * 2, py + Math.sin(dir + 0.4) * a * 2);
    ctx.closePath(); ctx.fill();
  }
  if (text) label(text, (x1 + x2) / 2, (y1 + y2) / 2, { size: 11, fill: col, box: true });
  ctx.restore();
}

/* ---------------- render ---------------- */

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = cvs.clientWidth, h = cvs.clientHeight;
  if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
    cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
  }
  mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let rafId = 0;
function draw() { if (!rafId) rafId = requestAnimationFrame(render); }

function render() {
  rafId = 0;
  readPalette();
  resizeCanvas();
  ctx = mainCtx;
  VW = cvs.clientWidth; VH = cvs.clientHeight;
  T = calcT();
  paint();
}

function paint() {
  const cw = VW, ch = VH;
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = C.sheet; ctx.fillRect(0, 0, cw, ch);

  const isPlan = S.view === 'plan';
  const tl = w2s(0, isPlan ? 0 : S.cs.h);
  const br = w2s(S.cs.w, isPlan ? S.cs.d : 0);
  const cw2 = br.x - tl.x, ch2 = br.y - tl.y;

  ctx.fillStyle = caseGround();
  ctx.fillRect(tl.x, tl.y, cw2, ch2);

  if (!isPlan && BGIMG) {
    ctx.save();
    ctx.beginPath(); ctx.rect(tl.x, tl.y, cw2, ch2); ctx.clip();
    ctx.globalAlpha = clamp((S.bg.fade ?? 100) / 100, 0, 1);
    /* cover the wall without distorting the picture */
    const sc = Math.max(cw2 / BGIMG.width, ch2 / BGIMG.height);
    const dw = BGIMG.width * sc, dh = BGIMG.height * sc;
    ctx.drawImage(BGIMG, tl.x + (cw2 - dw) / 2, tl.y + (ch2 - dh) / 2, dw, dh);
    ctx.restore();
  }

  if (S.opt.grid) drawGrid(tl, br);

  ctx.save();
  ctx.beginPath(); ctx.rect(tl.x, tl.y, cw2, ch2); ctx.clip();
  if (isPlan) drawPlan(); else drawFront();
  ctx.restore();

  ctx.strokeStyle = C.caseEdge; ctx.lineWidth = 1.8;
  ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, cw2 - 1, ch2 - 1);
  if (isPlan) {
    ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(tl.x, tl.y + 1.5); ctx.lineTo(br.x, tl.y + 1.5); ctx.stroke();
    label('BACK WALL', (tl.x + br.x) / 2, tl.y - 10, { size: 9, font: UIFONT, fill: C.ink3 });
    label('GLASS FRONT', (tl.x + br.x) / 2, br.y + 11, { size: 9, font: UIFONT, fill: C.ink3 });
  }

  if (S.opt.dims) drawCaseDims(tl, br);
  drawSelectionDims();
  drawSpinHandle();
  drawRulers();
}

function drawGrid(tl, br) {
  const step = T.sc * 10 < 9 ? 50 : 10;
  ctx.save();
  ctx.beginPath(); ctx.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); ctx.clip();
  ctx.lineWidth = 1;
  ctx.globalAlpha = S.view === 'front' && (BGIMG || S.bg.colour) ? .4 : 1;
  for (let x = 0; x <= S.cs.w + 0.01; x += step) {
    const p = w2s(x, 0);
    ctx.strokeStyle = (x % 50 === 0) ? C.line2 : C.line;
    ctx.beginPath(); ctx.moveTo(Math.round(p.x) + .5, tl.y); ctx.lineTo(Math.round(p.x) + .5, br.y); ctx.stroke();
  }
  const vmax = S.view === 'front' ? S.cs.h : S.cs.d;
  for (let y = 0; y <= vmax + 0.01; y += step) {
    const p = w2s(0, y);
    ctx.strokeStyle = (y % 50 === 0) ? C.line2 : C.line;
    ctx.beginPath(); ctx.moveTo(tl.x, Math.round(p.y) + .5); ctx.lineTo(br.x, Math.round(p.y) + .5); ctx.stroke();
  }
  ctx.restore();
}

function drawCaseDims(tl, br) {
  const off = S.view === 'plan' ? 30 : 15;   /* clear of the GLASS FRONT caption */
  arrowDim(tl.x, br.y + off, br.x, br.y + off, `${rnd(S.cs.w)} cm`, C.ink3);
  const vlab = S.view === 'front' ? `${rnd(S.cs.h)} cm` : `${rnd(S.cs.d)} cm`;
  arrowDim(br.x + 15, tl.y, br.x + 15, br.y, vlab, C.ink3);
}

/* ---------------- elevation ---------------- */

function drawFront() {
  const structs = S.items.filter(i => i.type !== 'object' && visible(i));
  for (const p of structs.filter(i => i.type === 'plinth')) {
    const a = w2s(p.x, p.h), b = w2s(p.x + p.w, 0);
    ctx.fillStyle = C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
    hatch(a.x, a.y, b.x - a.x, b.y - a.y);
    if (p.id === S.sel) outline(a.x, a.y, b.x - a.x, b.y - a.y);
    label(p.name, (a.x + b.x) / 2, a.y + 12, { size: 10, font: UIFONT, fill: C.ink3 });
  }
  for (const s of structs.filter(i => i.type === 'shelf')) {
    const a = w2s(s.x, s.y), b = w2s(s.x + s.w, s.y - s.t);
    const hgt = Math.max(2, b.y - a.y);
    ctx.fillStyle = C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, hgt);
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, hgt - 1);
    if (s.id === S.sel) outline(a.x, a.y, b.x - a.x, hgt);
    label(`${s.name} · ${rnd(s.y)}`, b.x - 4, a.y - 8, { size: 10, font: MONO, fill: C.ink3, align: 'right' });
  }

  /* furthest from the glass drawn first */
  const objs = S.items.filter(i => i.type === 'object' && visible(i)).sort((a, b) => a.z - b.z);
  for (const o of objs) { drawStandFront(o); drawObjectFront(o); }
}

function hatch(x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = C.structEdge; ctx.globalAlpha = .3; ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 7) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
  ctx.restore();
}
function outline(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.restore();
}

function drawStandFront(o) {
  const st = standBox(o);
  if (!st) return;
  const l = w2s(st.x, st.base), r = w2s(st.x + st.w, st.base);
  const topY = w2s(st.x, st.base + st.h).y;
  ctx.save();
  ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1.4; ctx.fillStyle = C.struct;
  if (st.kind === 'block') {
    ctx.fillRect(l.x, topY, r.x - l.x, l.y - topY);
    ctx.strokeRect(l.x + .5, topY + .5, r.x - l.x - 1, l.y - topY - 1);
  } else if (st.kind === 'stand') {
    /* a V, open at the top, holding the object in its throat */
    ctx.beginPath();
    ctx.moveTo(l.x, topY); ctx.lineTo((l.x + r.x) / 2, l.y); ctx.lineTo(r.x, topY);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, l.y); ctx.stroke();
  } else if (st.kind === 'cradle') {
    /* arms rising to each end, valley on the deck */
    ctx.beginPath();
    ctx.moveTo(l.x, topY); ctx.lineTo((l.x + r.x) / 2, l.y); ctx.lineTo(r.x, topY);
    ctx.lineTo(r.x, l.y); ctx.lineTo(l.x, l.y); ctx.closePath();
    ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
  }
  ctx.restore();
}

function objectFill(o) {
  if (o.render === 'panel') return o.colour || C.panel;
  return o.colour || C.struct;
}

/* text on a panel is set in real centimetres, so what you see is
   whether that wording actually fits at that size */
const PANEL_PAD = 1.0;                    // cm of margin inside the panel
const textSizeOf = o => o.textSize || 0.55;
const ptOf = cm => Math.round(cm * 28.35);

function panelLines(o, wpx, sizePx) {
  ctx.font = `${sizePx}px ${UIFONT}`;
  const padPx = PANEL_PAD * (T ? T.sc : 1);
  return layoutText(o.text || '', Math.abs(wpx) - padPx * 2);
}
function panelFits(o) {
  if (!T || o.render !== 'panel' || !o.text) return true;
  const sizePx = textSizeOf(o) * T.sc;
  const lines = panelLines(o, o.w * T.sc, sizePx);
  const padPx = PANEL_PAD * T.sc;
  return lines.length * sizePx * 1.32 <= o.h * T.sc - padPx * 2 + 0.5;
}

/* draw the object's own body into a rect in its own rotated frame */
function paintBody(o, dx, dy, wpx, hpx, forPlan) {
  const img = forPlan ? (TOP.get(o.id) || BMP.get(o.id)) : BMP.get(o.id);
  if (o.render === 'image') {
    if (img) ctx.drawImage(img, dx, dy, wpx, hpx);
    else { ctx.fillStyle = C.struct; ctx.fillRect(dx, dy, wpx, hpx); }
    return;
  }

  if (o.render !== 'panel') {
    shapeDraw(ctx, o.render, dx, dy, wpx, hpx, objectFill(o), C.structEdge);
    return;
  }

  ctx.fillStyle = objectFill(o);
  ctx.fillRect(dx, dy, wpx, hpx);
  ctx.strokeStyle = C.ink3; ctx.lineWidth = 1;
  ctx.strokeRect(dx + .5, dy + .5, wpx - 1, hpx - 1);
  if (!o.text) return;

  const sizePx = Math.max(3, textSizeOf(o) * (T ? T.sc : 1));
  if (sizePx < 3.5) return;                       /* too small on screen to be worth it */
  const padPx = PANEL_PAD * (T ? T.sc : 1);
  const lineH = sizePx * 1.32;
  const lines = panelLines(o, wpx, sizePx);
  const room = Math.floor((Math.abs(hpx) - padPx * 2) / lineH);

  ctx.save();
  ctx.beginPath(); ctx.rect(dx, dy, wpx, hpx); ctx.clip();
  ctx.font = `${sizePx}px ${UIFONT}`;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.slice(0, Math.max(room, 0)).forEach((l, i) => ctx.fillText(l, dx + padPx, dy + padPx + i * lineH));
  if (lines.length > room) {
    ctx.fillStyle = C.warn;
    ctx.fillText('…', dx + padPx, dy + padPx + Math.max(room - 1, 0) * lineH + lineH);
  }
  ctx.restore();
}

function drawObjectFront(o) {
  const L = layout(o);
  const sel = o.id === S.sel;

  if (o.mount === 'hanging') {
    ctx.save();
    ctx.strokeStyle = sel ? C.accent : C.ink3;
    ctx.lineWidth = sel ? 1.6 : 1.1;
    for (const wr of (o.wires || [])) {
      const a = w2s(o.x + wr.ax * o.w, o.rail ?? S.rail);
      const att = attachWorld(o, wr);
      const b = w2s(att.x, att.y);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = sel ? C.accent : C.ink3;
      ctx.beginPath(); ctx.arc(a.x, a.y, 2.6, 0, 7); ctx.fill();
      if (sel) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  const p = w2s(L.pivot.x, L.pivot.y);
  const wpx = L.w * T.sc, hpx = L.h * T.sc;
  const dx = -L.u * wpx, dy = -L.v * hpx;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-L.rot);
  ctx.globalAlpha = o.hide ? .3 : 1;
  if (o.flip || o.flipV) {
    ctx.translate(dx + wpx / 2, dy + hpx / 2);
    ctx.scale(o.flip ? -1 : 1, o.flipV ? -1 : 1);
    ctx.translate(-(dx + wpx / 2), -(dy + hpx / 2));
  }
  paintBody(o, dx, dy, wpx, hpx, false);
  ctx.globalAlpha = 1;
  ctx.restore();

  if (sel) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(-L.rot);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.setLineDash([5, 3]);
    ctx.strokeRect(dx - 1, dy - 1, wpx + 2, hpx + 2);
    ctx.restore();
  }

  if (o.lean > 0 && o.mount === 'placed') {
    const b = bbox(o);
    const a1 = w2s(b.x1 + 1.2, b.y0), a2 = w2s(b.x1 + 1.2, b.y1);
    ctx.save(); ctx.strokeStyle = C.plan; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke(); ctx.restore();
    label(leanLabel(o), a2.x + 3, a2.y + 8, { size: 10, fill: C.plan, align: 'left' });
  }
}

function leanLabel(o) {
  const shown = o.leanFrom === 'flat' ? 90 - o.lean : o.lean;
  return `${rnd(shown)}° ${o.leanFrom === 'flat' ? 'from flat' : ''}`.trim();
}

function attachWorld(o, wr) {
  const L = layout(o);
  const lx = (wr.ax - L.u) * L.w, ly = (L.v - wr.ay) * L.h;
  const c = Math.cos(L.rot), s = Math.sin(L.rot);
  return { x: L.pivot.x + lx * c - ly * s, y: L.pivot.y + lx * s + ly * c };
}

/* ---------------- plan ---------------- */

function planMode(o) {
  const ps = o.planShape || 'auto';
  if (ps === 'top') return o.topPng ? 'top' : 'rect';
  if (ps !== 'auto') return ps;
  if (isShape(o)) return shapeById(o.render).plan;
  /* past halfway to flat you are looking at the object itself */
  if (o.render === 'image' && o.png && o.mount === 'placed' && (o.lean || 0) > 45) return 'image';
  return 'rect';
}

function drawPlan() {
  for (const it of S.items.filter(i => i.type === 'shelf' && visible(i))) {
    const a = w2s(it.x, it.z), b = w2s(it.x + it.w, it.z + it.d);
    ctx.save(); ctx.globalAlpha = .5;
    ctx.fillStyle = C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.restore();
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1; ctx.setLineDash([6, 3]);
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
    ctx.setLineDash([]);
    if (it.id === S.sel) outline(a.x, a.y, b.x - a.x, b.y - a.y);
    label(`${it.name} @ ${rnd(it.y)} cm`, a.x + 5, a.y + 11, { size: 10, font: MONO, fill: C.ink3, align: 'left', box: true, bg: caseGround() });
  }
  for (const it of S.items.filter(i => i.type === 'plinth' && visible(i))) {
    const a = w2s(it.x, it.z), b = w2s(it.x + it.w, it.z + it.d);
    ctx.fillStyle = C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    hatch(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
    if (it.id === S.sel) outline(a.x, a.y, b.x - a.x, b.y - a.y);
    label(it.name, a.x + 5, a.y + 11, { size: 10, font: UIFONT, fill: C.ink3, align: 'left', box: true, bg: caseGround() });
  }

  for (const o of S.items.filter(i => i.type === 'object' && visible(i))) {
    const st = standBox(o);
    if (st) {
      const a = w2s(st.x, st.z), b = w2s(st.x + st.w, st.z + st.d);
      ctx.save();
      ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
      ctx.restore();
    }

    const f = footprint(o);
    const a = w2s(f.x, f.z), b = w2s(f.x + f.w, f.z + f.d);
    const sel = o.id === S.sel;
    const w = b.x - a.x, h = Math.max(3, b.y - a.y);
    let mode = planMode(o);
    const planImg = mode === 'top' ? TOP.get(o.id) : mode === 'image' ? BMP.get(o.id) : null;
    /* the bitmap may still be decoding — fall back rather than blank out */
    if ((mode === 'image' || mode === 'top') && !planImg) mode = 'rect';
    const tint = o.mount === 'hanging' ? C.plan : o.mount === 'wall' ? C.ink3 : C.accent;

    ctx.save();
    ctx.globalAlpha = o.hide ? .3 : 1;
    if (mode === 'image' || mode === 'top') {
      const img = planImg;
      ctx.save();
      if (o.flip || o.flipV) {
        ctx.translate(a.x + w / 2, a.y + h / 2);
        ctx.scale(o.flip ? -1 : 1, o.flipV ? -1 : 1);
        ctx.translate(-(a.x + w / 2), -(a.y + h / 2));
      }
      ctx.drawImage(img, a.x, a.y, w, h);
      ctx.restore();
    } else if (mode === 'ellipse') {
      ctx.fillStyle = tint; ctx.globalAlpha *= .28;
      ctx.beginPath(); ctx.ellipse(a.x + w / 2, a.y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = o.hide ? .3 : 1;
      ctx.strokeStyle = tint; ctx.lineWidth = sel ? 2 : 1.2;
      ctx.beginPath(); ctx.ellipse(a.x + w / 2, a.y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = tint; ctx.globalAlpha *= .28;
      ctx.fillRect(a.x, a.y, w, h);
      ctx.globalAlpha = o.hide ? .3 : 1;
    }
    ctx.restore();

    if (mode === 'rect') {
      ctx.strokeStyle = tint; ctx.lineWidth = sel ? 2 : 1.2;
      if (o.mount !== 'placed') ctx.setLineDash([4, 3]);
      ctx.strokeRect(a.x + .5, a.y + .5, w - 1, h - 1);
      ctx.setLineDash([]);
    }

    /* where it actually touches down: the front edge of the span */
    if (o.mount === 'placed' && o.lean > 0) {
      const base = w2s(f.x, f.z + f.d);
      ctx.strokeStyle = tint; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(a.x, base.y - 1); ctx.lineTo(b.x, base.y - 1); ctx.stroke();
    }

    if (w > 26 && mode !== 'image' && mode !== 'top') {
      label(o.name, a.x + w / 2, a.y + h / 2, { size: 10, font: UIFONT, fill: C.ink2, box: true, bg: caseGround() });
    }
    if (sel) outline(a.x, a.y, w, h);
  }
}

/* ---------------- dimensions for the selection ---------------- */

function drawSelectionDims() {
  const o = byId(S.sel);
  if (!o || !S.opt.dims) return;
  ctx.save();
  ctx.setLineDash([2, 3]); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.globalAlpha = .8;

  if (S.view === 'front') {
    let x0, y0;
    if (o.type === 'object') { const b = bbox(o); x0 = b.x0; y0 = b.y0; }
    else if (o.type === 'shelf') { x0 = o.x; y0 = o.y - o.t; }
    else { x0 = o.x; y0 = 0; }
    const l = w2s(x0, y0);
    ctx.beginPath(); ctx.moveTo(w2s(0, y0).x, l.y); ctx.lineTo(l.x, l.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x, w2s(0, 0).y); ctx.lineTo(l.x, l.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([]);
    if (x0 > 1.5) arrowDim(w2s(0, y0).x, l.y, l.x, l.y, `${rnd(x0)}`, C.accent);
    if (y0 > 1.5) arrowDim(l.x, w2s(0, 0).y, l.x, l.y, `${rnd(y0)}`, C.accent);
    if (o.type === 'object' && o.mount === 'hanging' && o.wires && o.wires[0]) {
      const wr = o.wires[0];
      const a = w2s(o.x + wr.ax * o.w, o.rail ?? S.rail), b2 = w2s(o.x + wr.ax * o.w, (o.rail ?? S.rail) - wr.len);
      arrowDim(a.x - 14, a.y, a.x - 14, b2.y, `${rnd(wr.len)}`, C.accent);
    }
  } else {
    const f = o.type === 'object' ? envelope(o) : { x: o.x, w: o.w, z: o.z, d: o.d };
    const l = w2s(f.x, f.z);
    ctx.globalAlpha = 1; ctx.setLineDash([]);
    if (f.x > 1.5) arrowDim(w2s(0, f.z).x, l.y, l.x, l.y, `${rnd(f.x)}`, C.accent);
    if (f.z > 1.5) arrowDim(l.x, w2s(0, 0).y, l.x, l.y, `${rnd(f.z)}`, C.accent);
  }
  ctx.restore();
}

/* the little handle you drag to turn an object */
const SPIN_ARM = 26;
function spinHandlePos() {
  const o = byId(S.sel);
  if (!o || o.type !== 'object' || S.view !== 'front') return null;
  const b = bbox(o);
  const top = w2s((b.x0 + b.x1) / 2, b.y1);
  return { x: top.x, y: top.y - SPIN_ARM, anchor: top };
}
function drawSpinHandle() {
  const h = spinHandlePos();
  if (!h) return;
  ctx.save();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(h.anchor.x, h.anchor.y); ctx.lineTo(h.x, h.y); ctx.stroke();
  ctx.fillStyle = C.sheet;
  ctx.beginPath(); ctx.arc(h.x, h.y, 6, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(h.x, h.y, 3.2, 0.6, 5.2); ctx.stroke();
  ctx.restore();
}

/* ---------------- rulers ---------------- */

function drawRulers() {
  const cw = VW, ch = VH;
  ctx.save();
  ctx.fillStyle = C.panel; ctx.fillRect(0, 0, cw, GUT); ctx.fillRect(0, 0, GUT, ch);
  ctx.strokeStyle = C.line2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, GUT + .5); ctx.lineTo(cw, GUT + .5);
  ctx.moveTo(GUT + .5, 0); ctx.lineTo(GUT + .5, ch); ctx.stroke();

  const minor = T.sc * 10 < 8 ? 50 : 10;
  const major = minor * 5;
  ctx.strokeStyle = C.ink3; ctx.fillStyle = C.ink3;

  for (let x = 0; x <= S.cs.w + 0.01; x += minor) {
    const p = w2s(x, 0); if (p.x < GUT - 1 || p.x > cw) continue;
    const maj = x % major === 0;
    ctx.beginPath(); ctx.moveTo(p.x, GUT - (maj ? 9 : 4)); ctx.lineTo(p.x, GUT); ctx.stroke();
    if (maj) label(String(x), p.x, 9, { size: 9, fill: C.ink3 });
  }
  const vmax = S.view === 'front' ? S.cs.h : S.cs.d;
  for (let y = 0; y <= vmax + 0.01; y += minor) {
    const p = w2s(0, y); if (p.y < GUT - 1 || p.y > ch) continue;
    const maj = y % major === 0;
    ctx.beginPath(); ctx.moveTo(GUT - (maj ? 9 : 4), p.y); ctx.lineTo(GUT, p.y); ctx.stroke();
    if (maj) {
      ctx.save(); ctx.translate(10, p.y); ctx.rotate(-Math.PI / 2);
      label(String(y), 0, 0, { size: 9, fill: C.ink3 }); ctx.restore();
    }
  }
  ctx.fillStyle = C.ink3; ctx.font = `9px ${UIFONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('cm', GUT / 2, GUT / 2);
  ctx.restore();
}

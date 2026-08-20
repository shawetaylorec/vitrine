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
  projectId: null,
  cs: { w: 140, h: 160, d: 40 },
  rail: 156,
  bg: { colour: '', img: null, fade: 100 },
  items: [],
  sel: null,
  view: 'front',
  zoom: 1,
  pan: { x: 0, y: 0 },
  opt: { grid: true, dims: true, snap: true, rulers: true, lock: false },
  level: 'all'
};

/* bitmap caches, keyed by item id. The SRC maps record which data URL
   each decoded bitmap came from, so undo can tell whether it still
   holds the right picture without re-decoding everything. */
const BMP = new Map();      // the cut-out
const TOP = new Map();      // optional top-view picture
const BMPSRC = new Map();
const TOPSRC = new Map();
let BGIMG = null;           // back-wall image
let PREVIEW = false;        // full-screen, no drafting furniture
let HOVER = null;           // what the pointer is over, for a soft outline
let EXPORTING = false;      // true while painting offscreen for a file

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

/* A fixed panel is stuck flat to a vertical surface: the back wall, or
   the front face of a plinth. Same relationship either way — only the
   surface differs. Returns the plinth, or null for the back wall. */
function faceOf(o) {
  if (o.mount !== 'wall' || !o.face || o.face === 'back') return null;
  return supportList().find(s => s.id === o.face) || null;
}

function levelKey(o) {
  if (o.type !== 'object') return o.id;
  if (o.mount === 'hanging') return 'hung';
  if (o.mount === 'wall') return faceOf(o) ? o.face : 'wall';
  return o.support || 'floor';
}
function visible(o) {
  if (o.hide) return false;
  if (S.level === 'all') return true;
  if (o.type === 'object') return levelKey(o) === S.level;
  return o.id === S.level || S.level === 'floor';
}

/* ---------------- stands and cradles ----------------
   A stand belongs to its object: it is always centred under it and
   travels with it. `h` is the height of the base it stands the object
   on, whatever the kind. Only the plan view distinguishes them — a V
   stand splays front to back, so that is the only place a V shows. */

const STAND_NONE = { kind: 'none', w: 0, d: 0, h: 0 };
const standOf = o => (o.stand && o.stand.kind && o.stand.kind !== 'none') ? o.stand : null;

/* how far the stand raises the object's underside — for every kind
   this is simply the height of the base it sits on */
function standLift(o) {
  const st = standOf(o);
  return st ? st.h : 0;
}

/* A book cradle is made to fit its book, so it takes the object's own
   width and depth and you only give the height. A stand or a block is
   a separate thing with its own footprint. */
const cradleFits = kind => kind === 'cradle';

function standBox(o) {
  const st = standOf(o);
  if (!st || o.mount !== 'placed') return null;
  const b = bbox(o), f = footprint(o);
  const w = cradleFits(st.kind) ? b.x1 - b.x0 : st.w;
  const d = cradleFits(st.kind) ? f.d : st.d;
  const cx = (b.x0 + b.x1) / 2, cz = f.z + f.d / 2;
  return {
    kind: st.kind,
    x: cx - w / 2, w,
    z: cz - d / 2, d,
    h: st.h,
    base: supportOf(o).top
  };
}

/* ---------------- object geometry ----------------
   layout() places the artwork in world space: the point (u,v) on
   the picture — u across, v down from the top, both normalised —
   is pinned to `pivot`, and the picture is rotated by `rot`. */

/* A leaning object is a slab h tall and `depth` thick tipped back by
   `lean`. In elevation you see the foreshortened face and nothing
   else — drawing the block's edge as well just puts an unexplained
   bar under everything. On the deck it covers sin of its length plus
   cos of its thickness. */
function leanParts(o) {
  const th = (o.lean || 0) * DEG;
  return {
    height: o.h * Math.cos(th),
    deck: o.h * Math.sin(th) + (o.depth || 0) * Math.cos(th)
  };
}

/* Yaw is lean's mirror. Lean tips the object towards you about a
   horizontal axis; yaw swings it about the vertical one. The projection
   is the same sum in the other plane, so turning it narrows what
   elevation shows by exactly as much as it deepens the footprint. */
function yawParts(o) {
  const th = (o.yaw || 0) * DEG;
  const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  const spin = (o.spin || 0) * DEG;
  const placed = o.mount === 'placed';
  const deck = placed ? leanParts(o).deck : (o.depth || 0);
  const hEff = placed ? leanParts(o).height : o.h;
  /* how wide it lies looking down before yaw turns it — a spun object
     covers its turned width, not the width of the picture */
  const wPlan = o.w * Math.abs(Math.cos(spin)) + hEff * Math.abs(Math.sin(spin));
  return {
    width: o.w * c + deck * s,        // the face elevation still sees
    deck: deck * c + wPlan * s,       // the ground it covers in plan
    wPlan, thick: deck
  };
}
const isFlat = o => o.mount === 'placed' && (o.lean || 0) > 45;

function layout(o) {
  const spin = (o.spin || 0) * DEG;

  if (o.mount === 'hanging') {
    /* The object is placed and turned to where you want it; the wires are
       whatever length that orientation demands. It used to work the other
       way round — two lengths derived the tilt — which meant marking a
       second attachment point swung the object off its position. */
    return { w: yawParts(o).width, h: o.h, rot: spin, pivot: { x: o.x + o.w / 2, y: o.hangY ?? 60 }, u: 0.5, v: 1 };
  }

  if (o.mount === 'wall') {
    return { w: o.w, h: o.h, rot: spin, pivot: { x: o.x + o.w / 2, y: o.wallY || 0 }, u: 0.5, v: 1 };
  }

  /* placed: leaning back turns the object's face away and brings its
     thickness into view, so in elevation you see a foreshortened face
     with the edge of the block below it. Lying flat that is all edge —
     which is exactly what a label card on a plinth looks like. */
  const hEff = leanParts(o).height;
  const wEff = yawParts(o).width;
  const base = supportOf(o).top + standLift(o);
  const c = Math.cos(spin), s = Math.sin(spin);
  let minY = Infinity;
  for (const [a, b] of [[-wEff / 2, 0], [wEff / 2, 0], [wEff / 2, hEff], [-wEff / 2, hEff]]) {
    minY = Math.min(minY, a * s + b * c);
  }
  return { w: wEff, h: hEff, rot: spin, pivot: { x: o.x + o.w / 2, y: base - minY }, u: 0.5, v: 1 };
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
  const f = faceOf(o);
  /* stuck to a plinth front it sits at that face, proud by its own
     thickness — so from above it is barely a line */
  if (f) return { x: b.x0, w: b.x1 - b.x0, z: f.z + f.d, d: o.depth || 0.4 };
  return { x: b.x0, w: b.x1 - b.x0, z: o.z, d: yawParts(o).deck };
}

/* everything the object needs room for, stand included */
function envelope(o) {
  const f = footprint(o), st = standBox(o);
  if (!st) return f;
  const x0 = Math.min(f.x, st.x), x1 = Math.max(f.x + f.w, st.x + st.w);
  const z0 = Math.min(f.z, st.z), z1 = Math.max(f.z + f.d, st.z + st.d);
  return { x: x0, w: x1 - x0, z: z0, d: z1 - z0 };
}

/* What an object actually stands on. Plenty of things are widest well
   above the surface — a bowl on a foot, a sculpture on a socle, a
   framed panel on a narrow edge — and it is the foot that has to fit
   the plinth, not the widest part. Left unset it is the whole
   footprint, which is the safe assumption. */
function basePatch(o) {
  const bw = o.baseW || 0, bd = o.baseD || 0;
  if (!bw && !bd) return null;
  const b = bbox(o), f = footprint(o);
  const w = bw || (b.x1 - b.x0), d = bd || f.d;
  return { x: (b.x0 + b.x1) / 2 - w / 2, w, z: f.z + f.d / 2 - d / 2, d };
}

/* The patch that meets the surface underneath: the stand if there is
   one, since that is what is really in contact, otherwise the base you
   gave, otherwise everything. This is what the overhang warnings test
   — an object whose foot sits well within the plinth is not
   overhanging it, however far the top spreads. */
function contactPatch(o) {
  return standBox(o) || basePatch(o) || footprint(o);
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
    const c = contactPatch(o);
    if (c.x < s.x - 0.05 || c.x + c.w > s.x + s.w + 0.05) msgs.push('overhanging ' + s.name);
    if (c.z < s.z - 0.05 || c.z + c.d > s.z + s.d + 0.05) msgs.push('deeper than ' + s.name);
  }
  const f = faceOf(o);
  if (f) {
    if (b.x0 < f.x - 0.05 || b.x1 > f.x + f.w + 0.05) msgs.push('wider than the front of ' + f.name);
    if (b.y1 > f.top + 0.05) msgs.push('above the top of ' + f.name);
  }
  return msgs;
}

/* ---------------- view transform ---------------- */

const cvs = $('#sheet');
const mainCtx = cvs.getContext('2d');
/* ctx / VW / VH are swapped out when rendering to an export canvas */
let ctx = mainCtx;
let VW = 0, VH = 0;
let GUT = 26;   // ruler gutter, px — collapses when the rulers are off
let T = null;

function fitScale() {
  const W = S.cs.w, H = S.view === 'front' ? S.cs.h : S.cs.d;
  return Math.min((VW - GUT - 64) / W, (VH - GUT - 74) / H);
}
function calcT() {
  if (ctx === mainCtx) { VW = cvs.clientWidth; VH = cvs.clientHeight; }
  GUT = PREVIEW ? 0 : S.opt.rulers === false ? 8 : 26;
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
    struct: g('--struct'), structEdge: g('--struct-edge'), panel: g('--panel'),
    previewBg: g('--preview-bg'),
    lineStrong: g('--line-strong'), accentInk: g('--accent-ink')
  };
}
/* the back-wall colour dresses the elevation only — in plan you are
   looking down at the deck, which keeps its own tone */
const caseGround = () => (S.view === 'front' && S.bg.colour) ? S.bg.colour : C.caseFill;

const UIFONT = '"Barlow Semi Condensed",system-ui,sans-serif';
const MONO = '"IBM Plex Mono",ui-monospace,monospace';

function label(text, x, y, { size = 11, font = MONO, fill = C.ink2, align = 'center', base = 'middle', box = false, pad = 3, bg = null } = {}) {
  if (PREVIEW) return;          /* no annotation on the finished view */
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

/* A line wrapped in ** is a title and is set bold. Whole lines rather
   than words: on a panel what wants weight is the heading, and this way
   the writer can see at a glance which lines are titles. */
const BOLD_RE = /^\s*\*\*([\s\S]*?)\*\*\s*$/;
const boldFont = (sizePx, bold) => `${bold ? '600 ' : ''}${sizePx}px ${UIFONT}`;

/* wrap to a width, keeping the line breaks the writer typed. Returns
   {text, bold} per line. `sizePx` is needed because a bold line has to
   be measured in the bold face or it wraps a word short. */
function layoutText(text, maxW, sizePx) {
  const lines = [];
  for (const para of String(text).split(/\r?\n/)) {
    const m = para.match(BOLD_RE);
    const bold = !!m;
    const body = bold ? m[1] : para;
    if (!body.trim()) { lines.push({ text: '', bold }); continue; }
    if (sizePx) ctx.font = boldFont(sizePx, bold);
    let cur = '';
    for (const wd of body.split(/\s+/).filter(Boolean)) {
      const test = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(test).width > maxW && cur) { lines.push({ text: cur, bold }); cur = wd; }
      else cur = test;
    }
    if (cur) lines.push({ text: cur, bold });
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
  ctx.fillStyle = PREVIEW ? C.previewBg : C.sheet;
  ctx.fillRect(0, 0, cw, ch);

  const isPlan = S.view === 'plan';
  const tl = w2s(0, isPlan ? 0 : S.cs.h);
  const br = w2s(S.cs.w, isPlan ? S.cs.d : 0);
  const cw2 = br.x - tl.x, ch2 = br.y - tl.y;

  ctx.save();
  if (PREVIEW) {
    /* lift the case off the surround, the way a lit vitrine reads
       in a dim gallery */
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 14;
  }
  ctx.fillStyle = caseGround();
  ctx.fillRect(tl.x, tl.y, cw2, ch2);
  ctx.restore();

  if (!isPlan && BGIMG) coverImage(BGIMG, tl.x, tl.y, cw2, ch2, (S.bg.fade ?? 100) / 100);

  if (S.opt.grid && !PREVIEW) drawGrid(tl, br);

  ctx.save();
  ctx.beginPath(); ctx.rect(tl.x, tl.y, cw2, ch2); ctx.clip();
  if (isPlan) drawPlan(); else drawFront();
  ctx.restore();

  ctx.strokeStyle = C.caseEdge; ctx.lineWidth = 1.8;
  ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, cw2 - 1, ch2 - 1);
  if (isPlan && !PREVIEW) {
    ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(tl.x, tl.y + 1.5); ctx.lineTo(br.x, tl.y + 1.5); ctx.stroke();
    label('BACK WALL', (tl.x + br.x) / 2, tl.y - 10, { size: 9, font: UIFONT, fill: C.ink3 });
    label('GLASS FRONT', (tl.x + br.x) / 2, br.y + 11, { size: 9, font: UIFONT, fill: C.ink3 });
  }

  if (PREVIEW) {
    /* the faintest fall-off into the corners of the case */
    const g = ctx.createRadialGradient(
      tl.x + cw2 / 2, tl.y + ch2 / 2, Math.min(cw2, ch2) * 0.25,
      tl.x + cw2 / 2, tl.y + ch2 / 2, Math.hypot(cw2, ch2) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.save();
    ctx.beginPath(); ctx.rect(tl.x, tl.y, cw2, ch2); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(tl.x, tl.y, cw2, ch2);
    ctx.restore();
    return;
  }

  drawGuides(tl, br);
  if (S.opt.dims) drawCaseDims(tl, br);
  drawSelectionDims();
  drawSpinHandle();
  if (S.opt.rulers !== false) drawRulers();
  drawLockButton();
}

/* ---------------- the padlock ----------------
   On the sheet itself rather than in the toolbar, because the person
   who needs it most is whoever you sent the file to: they want to click
   round the case reading dimensions without nudging anything, and they
   will not go hunting for a control they have never seen. Top left, on
   the plane, where the eye lands first. */

let LOCKBTN = null;              // where it was last drawn, for hit testing
const LOCK_SIZE = 54;

function lockButtonRect() {
  return { x: GUT + 14, y: GUT + 14, w: LOCK_SIZE, h: LOCK_SIZE };
}

function drawLockButton() {
  if (EXPORTING) { LOCKBTN = null; return; }
  const r = lockButtonRect();
  LOCKBTN = r;
  const on = !!S.opt.lock;
  const hot = HOVER === 'lock';
  const cx = r.x + r.w / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = on ? C.accent : C.panel;
  ctx.shadowColor = 'rgba(20,22,26,.18)'; ctx.shadowBlur = hot ? 10 : 5; ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = on ? C.accent : (hot ? C.lineStrong : C.line);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  /* the padlock: a body, a shackle over it, a keyhole. Open, the
     shackle lifts and swings clear on one side. */
  const ink = on ? C.accentInk : C.ink2;
  const bodyW = 23, bodyH = 18;
  const bodyY = r.y + r.h / 2 - 1;
  ctx.strokeStyle = ink; ctx.fillStyle = ink;
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.roundRect(cx - bodyW / 2, bodyY, bodyW, bodyH, 3);
  ctx.fill();

  ctx.beginPath();
  if (on) ctx.arc(cx, bodyY - 1, 7.5, Math.PI, 0);
  else ctx.arc(cx + 7.5, bodyY - 4, 7.5, Math.PI, Math.PI * 1.85);
  ctx.stroke();

  ctx.fillStyle = on ? C.accent : C.panel;
  ctx.beginPath(); ctx.arc(cx, bodyY + bodyH / 2, 2.8, 0, 7); ctx.fill();

  ctx.fillStyle = on ? C.accent : C.ink3;
  label(on ? 'LOCKED' : 'LOCK', cx, r.y + r.h + 11,
    { size: 11, font: UIFONT, fill: on ? C.accent : C.ink2, box: true, bg: C.sheet });
  ctx.restore();
}

function overLockButton(px, py) {
  const r = LOCKBTN;
  return !!r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/* the lines something has just snapped to, so you can see why it stopped */
function drawGuides(tl, br) {
  if (!GUIDES || !GUIDES.length) return;
  ctx.save();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.globalAlpha = .95;
  for (const g of GUIDES) {
    ctx.beginPath();
    if (g.axis === 'x') {
      const x = w2s(g.v, 0).x;
      ctx.moveTo(x + .5, tl.y); ctx.lineTo(x + .5, br.y);
    } else {
      const y = w2s(0, g.v).y;
      ctx.moveTo(tl.x, y + .5); ctx.lineTo(br.x, y + .5);
    }
    ctx.stroke();
  }
  ctx.restore();
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

/* How near the glass a thing reaches. Everything in the case — plinths
   included — goes into one painter's-algorithm pass on this, so a panel
   on the back wall ends up behind a plinth and an object standing in
   front of a plinth ends up in front of whatever is stuck to its face.
   A shelf is a plane rather than a volume, so it is keyed by its back
   edge and stays behind what stands on it. */
const BEHIND_ALL = -1e6;
function depthKey(it) {
  if (it.type === 'shelf') return it.z;
  if (it.type === 'plinth') return it.z + it.d;
  /* Anything fixed to the back wall is on the rearmost plane there is.
     It cannot get in front of an object in the case, however small its
     stand-off, so it is not a matter of comparing depths — it is a rule.
     Among themselves they still order by how far they stand proud. */
  if (it.mount === 'wall' && !faceOf(it)) return BEHIND_ALL + (it.z || 0);
  const f = footprint(it);
  return f.z + f.d;
}

/* fill a rect with a picture, cropped to cover rather than squashed */
function coverImage(img, x, y, w, h, alpha) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = clamp(alpha ?? 1, 0, 1);
  const sc = Math.max(w / img.width, h / img.height);
  const dw = img.width * sc, dh = img.height * sc;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawPlinthFront(p) {
  const a = w2s(p.x, p.h), b = w2s(p.x + p.w, 0);
  const w = b.x - a.x, h = b.y - a.y;
  const img = BMP.get(p.id);
  ctx.fillStyle = p.colour || C.struct;
  ctx.fillRect(a.x, a.y, w, h);
  if (img) coverImage(img, a.x, a.y, w, h, (p.fade ?? 100) / 100);
  ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
  ctx.strokeRect(a.x + .5, a.y + .5, w - 1, h - 1);
  /* the hatch says "no material given" — once it has one, drop it */
  if (!p.colour && !img) hatch(a.x, a.y, w, h);
  if (p.id === S.sel) outline(a.x, a.y, w, h);
  else if (p.id === HOVER) frame(a.x, a.y, w, h, 'hover');
  label(p.name, (a.x + b.x) / 2, a.y + 12, { size: 10, font: UIFONT, fill: p.colour || img ? C.ink2 : C.ink3, box: !!(p.colour || img), bg: p.colour || C.struct });
}

function drawShelfFront(s) {
  const a = w2s(s.x, s.y), b = w2s(s.x + s.w, s.y - s.t);
  const hgt = Math.max(2, b.y - a.y);
  ctx.fillStyle = C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, hgt);
  ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
  ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, hgt - 1);
  if (s.id === S.sel) outline(a.x, a.y, b.x - a.x, hgt);
  else if (s.id === HOVER) frame(a.x, a.y, b.x - a.x, hgt, 'hover');
  label(`${s.name} · ${rnd(s.y)}`, b.x - 4, a.y - 8, { size: 10, font: MONO, fill: C.ink3, align: 'right' });
}

function drawFront() {
  const items = S.items.filter(visible).sort((a, b) => depthKey(a) - depthKey(b));
  for (const it of items) {
    if (it.type === 'plinth') drawPlinthFront(it);
    else if (it.type === 'shelf') drawShelfFront(it);
    else { drawStandFront(it); drawObjectFront(it); }
  }
}

/* the span a leaning object sweeps, raked back from the contact edge
   towards where its top overhangs — read it as "this is tipped, not
   thick" */
function leanRake(x, y, w, h, col, alpha) {
  if (h < 3) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = col; ctx.globalAlpha = alpha * .35; ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke();
  }
  ctx.restore();
}

/* worded the way it was typed in, so it matches the inspector */
function leanText(o) {
  return `${rnd(shownLean(o))}° from ${o.leanFrom === 'flat' ? 'flat' : 'upright'}`;
}

function hatch(x, y, w, h) {
  if (PREVIEW) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = C.structEdge; ctx.globalAlpha = .3; ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 7) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
  ctx.restore();
}
/* A drafting frame rather than a marching dash: a hairline box with
   corner ticks. Reads as precise, and does not crawl over the artwork.
   Hover uses the same shape, quieter and without the ticks. */
function frame(x, y, w, h, mode) {
  if (PREVIEW) return;
  const t = Math.max(4, Math.min(11, Math.abs(w) / 3, Math.abs(h) / 3));
  ctx.save();
  ctx.strokeStyle = C.accent;
  ctx.globalAlpha = mode === 'hover' ? .45 : 1;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  if (mode !== 'hover') {
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const [cx, cy, sx, sy] of [[x - 1.5, y - 1.5, 1, 1], [x + w + 1.5, y - 1.5, -1, 1],
    [x - 1.5, y + h + 1.5, 1, -1], [x + w + 1.5, y + h + 1.5, -1, -1]]) {
      ctx.moveTo(cx, cy + sy * t); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * t, cy);
    }
    ctx.stroke();
  }
  ctx.restore();
}
const outline = (x, y, w, h) => frame(x, y, w, h, 'sel');

/* From the front every stand is just the base it raises the object on.
   A V stand's splay runs front to back, so it only reads as a V from
   above — see drawStandPlan. */
function drawStandFront(o) {
  const st = standBox(o);
  if (!st || st.h <= 0) return;
  const l = w2s(st.x, st.base + st.h), r = w2s(st.x + st.w, st.base);
  const w = r.x - l.x, h = r.y - l.y;
  ctx.save();
  ctx.fillStyle = C.struct; ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1.2;
  ctx.fillRect(l.x, l.y, w, h);
  ctx.strokeRect(l.x + .5, l.y + .5, w - 1, h - 1);
  if (st.kind === 'stand' && w > 14) {
    /* the little notches that stop the object sliding off */
    const n = Math.min(6, h * 0.8);
    ctx.beginPath();
    for (const fx of [0.32, 0.68]) {
      ctx.moveTo(l.x + w * fx, l.y); ctx.lineTo(l.x + w * fx, l.y - n);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* Seen from above: a V stand splays, everything else is a plain base. */
/* the foot, when it is smaller than the object above it — drawn so you
   can see what is actually resting on the plinth */
function drawBasePlan(o) {
  if (PREVIEW || standOf(o) || o.mount !== 'placed') return;
  const bp = basePatch(o);
  if (!bp) return;
  const a = w2s(bp.x, bp.z), b = w2s(bp.x + bp.w, bp.z + bp.d);
  ctx.save();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
  ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
  ctx.restore();
}

function drawStandPlan(o) {
  const st = standBox(o);
  if (!st) return;
  const a = w2s(st.x, st.z), b = w2s(st.x + st.w, st.z + st.d);
  ctx.save();
  if (!PREVIEW) {
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
    ctx.setLineDash([]);
  }
  if (st.kind === 'stand') {
    /* the point is at the back, arms opening towards the glass */
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, b.y); ctx.lineTo((a.x + b.x) / 2, a.y); ctx.lineTo(b.x, b.y);
    ctx.stroke();
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

/* Whether a wording fits is a question about the real panel, not about
   the screen. Measured at whatever the current zoom happens to be, the
   same text would fit at one magnification and overflow at another —
   so all the fit maths runs at one fixed reference scale, and only the
   drawing uses the live one. */
const FIT_SC = 20;                        // px per cm, for fit maths only
const LINE_H = 1.32;

function panelLines(o, wpx, sizePx) {
  const padPx = PANEL_PAD * (T ? T.sc : 1);
  return layoutText(o.text || '', Math.abs(wpx) - padPx * 2, sizePx);
}

/* how the wording breaks at a given size, and how many lines the board
   has room for. One routine, so the warning in the inspector, the red
   rule on the drawing and the auto-fit can never disagree. */
function panelRoom(o, cm) {
  const sizePx = Math.max(1, cm * FIT_SC);
  const padPx = PANEL_PAD * FIT_SC;
  return {
    lines: layoutText(o.text || '', o.w * FIT_SC - padPx * 2, sizePx),
    room: Math.max(0, Math.floor((o.h * FIT_SC - padPx * 2) / (sizePx * LINE_H)))
  };
}
function panelFitsAt(o, cm) {
  const { lines, room } = panelRoom(o, cm);
  return lines.length <= room;
}
function panelFits(o) {
  if (o.render !== 'panel' || !o.text) return true;
  return panelFitsAt(o, textSizeOf(o));
}

/* The largest size the wording still fits at. Bisecting beats stepping
   because wrapping makes the fit lumpy — a hundredth smaller can save
   two lines — so there is no useful increment to walk.

   The answer is rounded *down* and then verified. Rounding to nearest
   was the bug: bisection converges onto the boundary from below, so
   rounding up crossed it about half the time and the button produced a
   size that immediately reported itself as overflowing. */
function bestTextSize(o) {
  if (o.render !== 'panel' || !o.text || !o.text.trim()) return textSizeOf(o);
  const floor2 = v => Math.floor(v * 100) / 100;
  let lo = 0.05, hi = Math.max(o.h, 1);
  if (panelFitsAt(o, hi)) return rnd(hi, 2);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (panelFitsAt(o, mid)) lo = mid; else hi = mid;
  }
  let cm = floor2(lo);
  while (cm > 0.05 && !panelFitsAt(o, cm)) cm = rnd(cm - 0.01, 2);
  return Math.max(0.05, cm);
}

/* A photograph that has not arrived — still decoding, or lost. It used
   to fall back to a plain grey slab, which is indistinguishable from a
   rectangular stand-in shape, so the only clue anything was wrong was
   that your object had turned into a grey square. Say so instead. */
function missingPicture(o, dx, dy, wpx, hpx) {
  const w = Math.abs(wpx), h = Math.abs(hpx);
  ctx.save();
  ctx.fillStyle = C.sheet;
  ctx.fillRect(dx, dy, wpx, hpx);
  ctx.strokeStyle = C.warn; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
  ctx.strokeRect(dx + .5, dy + .5, wpx - 1, hpx - 1);
  ctx.setLineDash([]);
  if (!PREVIEW && w > 46 && h > 22) {
    ctx.fillStyle = C.warn;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('picture not loaded', dx + wpx / 2, dy + hpx / 2);
  }
  ctx.restore();
}

/* draw the object's own body into a rect in its own rotated frame */
function paintBody(o, dx, dy, wpx, hpx, forPlan) {
  const img = forPlan ? (TOP.get(o.id) || BMP.get(o.id)) : BMP.get(o.id);
  if (o.render === 'image') {
    if (img) ctx.drawImage(img, dx, dy, wpx, hpx);
    else missingPicture(o, dx, dy, wpx, hpx);
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

  const sizePx = textSizeOf(o) * (T ? T.sc : 1);
  const padPx = PANEL_PAD * (T ? T.sc : 1);
  const lineH = sizePx * LINE_H;
  if (lineH < 1) return;
  /* the wrap is measured at the drawing size so the type sits right,
     but how many lines the board holds comes from the reference
     calculation — otherwise the red rule and the inspector's warning
     could disagree at some zooms and not others */
  const lines = panelLines(o, wpx, Math.max(sizePx, 1));
  const room = panelRoom(o, textSizeOf(o)).room;
  const shown = lines.slice(0, Math.max(room, 0));

  ctx.save();
  ctx.beginPath(); ctx.rect(dx, dy, wpx, hpx); ctx.clip();

  if (sizePx < 4) {
    /* too small to read at this zoom — greek it, so a full panel still
       looks full and you can see how much of it the wording uses */
    ctx.fillStyle = C.ink; ctx.globalAlpha = .45;
    const maxW = Math.abs(wpx) - padPx * 2;
    shown.forEach((l, i) => {
      const w = i === shown.length - 1 ? maxW * 0.62 : maxW;
      /* a title greeks heavier, so the shape of the panel still reads */
      ctx.fillRect(dx + padPx, dy + padPx + i * lineH, l.bold ? w * 0.7 : w, Math.max(0.8, sizePx * (l.bold ? 0.8 : 0.6)));
    });
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    shown.forEach((l, i) => {
      ctx.font = boldFont(sizePx, l.bold);
      ctx.fillText(l.text, dx + padPx, dy + padPx + i * lineH);
    });
  }

  if (lines.length > room) {
    ctx.fillStyle = C.warn;
    ctx.fillRect(dx + padPx, dy + Math.abs(hpx) - padPx * 0.7, Math.abs(wpx) - padPx * 2, Math.max(1, sizePx * 0.25));
  }
  ctx.restore();
}

function drawObjectFront(o) {
  const L = layout(o);
  const sel = !PREVIEW && o.id === S.sel;

  if (o.mount === 'hanging') {
    ctx.save();
    ctx.strokeStyle = sel ? C.accent : C.ink3;
    ctx.lineWidth = sel ? 1.6 : 1.1;
    for (const wr of (o.wires || [])) {
      const att = attachWorld(o, wr);
      const a = w2s(att.x, o.rail ?? S.rail);   /* plumb, so straight above */
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
  if (hpx > 0.6) paintBody(o, dx, dy, wpx, hpx, false);
  ctx.globalAlpha = 1;
  ctx.restore();

  if (sel || (!PREVIEW && o.id === HOVER)) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(-L.rot);
    frame(dx, dy, wpx, hpx, sel ? 'sel' : 'hover');
    ctx.restore();
  }

  if ((o.lean || 0) > 0 && o.mount === 'placed' && !PREVIEW && rnd(shownLean(o)) > 0) {
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

/* what the mount-maker needs to cut: a wire drops plumb from the rail to
   wherever its attachment point has ended up, so its length is simply the
   drop. This is the answer the app gives, never an input. */
function wireLen(o, wr) {
  return Math.max(0, (o.rail ?? S.rail) - attachWorld(o, wr).y);
}

/* an angle read as a tilt: ±180 rather than 0–360, so a slight
   anticlockwise lean reads −4° and not 356° */
function signedDeg(v) {
  const d = (((v || 0) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}
const tiltOf = o => signedDeg(o.spin);

/* ---------------- plan ---------------- */

function planMode(o) {
  const ps = o.planShape || 'auto';
  if (ps === 'top') return o.topPng ? 'top' : 'rect';
  if (o.render === 'panel') return 'rect';
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
    else if (it.id === HOVER) frame(a.x, a.y, b.x - a.x, b.y - a.y, 'hover');
    label(`${it.name} @ ${rnd(it.y)} cm`, a.x + 5, a.y + 11, { size: 10, font: MONO, fill: C.ink3, align: 'left', box: true, bg: caseGround() });
  }
  for (const it of S.items.filter(i => i.type === 'plinth' && visible(i))) {
    const a = w2s(it.x, it.z), b = w2s(it.x + it.w, it.z + it.d);
    ctx.fillStyle = it.colour || C.struct; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    if (!it.colour) hatch(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = C.structEdge; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + .5, a.y + .5, b.x - a.x - 1, b.y - a.y - 1);
    if (it.id === S.sel) outline(a.x, a.y, b.x - a.x, b.y - a.y);
    else if (it.id === HOVER) frame(a.x, a.y, b.x - a.x, b.y - a.y, 'hover');
    label(it.name, a.x + 5, a.y + 11, { size: 10, font: UIFONT, fill: C.ink3, align: 'left', box: true, bg: caseGround() });
  }

  for (const o of S.items.filter(i => i.type === 'object' && visible(i))) {
    drawStandPlan(o);
    const f = footprint(o);
    const a = w2s(f.x, f.z), b = w2s(f.x + f.w, f.z + f.d);
    const sel = o.id === S.sel;
    const w = b.x - a.x, h = Math.max(3, b.y - a.y);
    let mode = planMode(o);
    const planImg = mode === 'top' ? TOP.get(o.id) : mode === 'image' ? BMP.get(o.id) : null;
    /* the bitmap may still be decoding — fall back rather than blank out */
    if ((mode === 'image' || mode === 'top') && !planImg) mode = 'rect';
    const tint = o.mount === 'hanging' ? C.plan : o.mount === 'wall' ? C.ink3 : C.accent;

    /* Turned about the vertical axis, it is drawn turned: the footprint
       is a rectangle at an angle inside the box it occupies, not a wider
       box. Anything at yaw 0 keeps exactly the rectangle it had. */
    const yp = yawParts(o);
    const turn = faceOf(o) ? 0 : (o.yaw || 0) * DEG;
    const cen = w2s(f.x + f.w / 2, f.z + f.d / 2);
    const lw = turn ? yp.wPlan * T.sc : w;
    const lh = turn ? Math.max(3, yp.thick * T.sc) : h;
    const lx = turn ? -lw / 2 : a.x;
    const ly = turn ? -lh / 2 : a.y;
    const enter = () => {
      ctx.save();
      if (turn) { ctx.translate(cen.x, cen.y); ctx.rotate(turn); }
    };

    enter();
    ctx.globalAlpha = o.hide ? .3 : 1;
    if (mode === 'panel') {
      paintBody(o, lx, ly, lw, lh, false);
    } else if (mode === 'image' || mode === 'top') {
      const img = planImg;
      ctx.save();
      if (o.flip || o.flipV) {
        ctx.translate(lx + lw / 2, ly + lh / 2);
        ctx.scale(o.flip ? -1 : 1, o.flipV ? -1 : 1);
        ctx.translate(-(lx + lw / 2), -(ly + lh / 2));
      }
      ctx.drawImage(img, lx, ly, lw, lh);
      ctx.restore();
    } else if (mode === 'ellipse') {
      ctx.fillStyle = tint; ctx.globalAlpha *= .28;
      ctx.beginPath(); ctx.ellipse(lx + lw / 2, ly + lh / 2, Math.abs(lw) / 2, Math.abs(lh) / 2, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = o.hide ? .3 : 1;
      ctx.strokeStyle = tint; ctx.lineWidth = sel ? 2 : 1.2;
      ctx.beginPath(); ctx.ellipse(lx + lw / 2, ly + lh / 2, Math.abs(lw) / 2, Math.abs(lh) / 2, 0, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = tint; ctx.globalAlpha *= .28;
      ctx.fillRect(lx, ly, lw, lh);
      ctx.globalAlpha = o.hide ? .3 : 1;
    }
    ctx.restore();

    if (mode === 'rect') {
      enter();
      ctx.strokeStyle = tint; ctx.lineWidth = sel ? 2 : 1.2;
      if (o.mount !== 'placed') ctx.setLineDash([4, 3]);
      ctx.strokeRect(lx + .5, ly + .5, lw - 1, lh - 1);
      ctx.restore();
    }

    /* A lean is invisible looking down — all you see is that something
       0.5 cm thick is covering 7 cm of deck, with no clue why. So say so:
       rake the span it sweeps, weight the edge it actually touches down
       on, and put the angle beside it. */
    if (o.mount === 'placed' && o.lean > 0.5) {
      enter();
      /* not over a photograph: there the picture already says what it is,
         and raking it just muddies the one view where you can see it */
      if (mode !== 'image' && mode !== 'top') leanRake(lx, ly, lw, lh, tint, o.hide ? .3 : 1);
      ctx.strokeStyle = tint; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(lx, ly + lh - 1); ctx.lineTo(lx + lw, ly + lh - 1); ctx.stroke();
      ctx.restore();
      if (h > 9 && w > 30) {
        label(leanText(o), a.x + w / 2, w2s(f.x, f.z + f.d).y - 8,
          { size: 9, font: MONO, fill: tint, box: true, bg: caseGround() });
      }
    }
    if (turn && w > 26) {
      label(`${rnd(signedDeg(o.yaw))}° turned`, a.x + w / 2, a.y - 7,
        { size: 9, font: MONO, fill: tint, box: true, bg: caseGround() });
    }

    if (w > 26 && mode !== 'image' && mode !== 'top' && mode !== 'panel') {
      label(o.name, a.x + w / 2, a.y + h / 2, { size: 10, font: UIFONT, fill: C.ink2, box: true, bg: caseGround() });
    }
    drawBasePlan(o);
    if (sel) outline(a.x, a.y, w, h);
    else if (o.id === HOVER) frame(a.x, a.y, w, h, 'hover');
  }
}

/* ---------------- dimensions for the selection ---------------- */

/* Every object called out at once, for a drawing somebody else has to
   install from. One tag apiece rather than witness lines all round —
   a dozen sets of witness lines is an unreadable thicket, whereas a
   dozen tags is a schedule you can read off the picture. */
/* Marking everything is not a different drawing — it is the witness
   lines you already get on a selection, drawn for every item at once,
   as though you had selected the lot. */
let MARK_ALL = false;

function drawAllDims() {
  for (const it of S.items.filter(visible)) drawDimsFor(it);
}

function drawSelectionDims() {
  if (!S.opt.dims) return;
  if (MARK_ALL) { drawAllDims(); return; }
  const o = byId(S.sel);
  if (o) drawDimsFor(o);
}

/* All four clearances, not two: the near pair hung off the bottom-left
   corner and the far pair off the top-right, so the lines never double
   back over each other and every gap round the thing is dimensioned. */
function drawDimsFor(o) {
  ctx.save();

  /* one witness line and the dimension along it, in screen coordinates */
  const gap = (from, to, cm) => {
    ctx.save();
    ctx.setLineDash([2, 3]); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.restore();
    if (cm > 1.5) arrowDim(from.x, from.y, to.x, to.y, `${rnd(cm)}`, C.accent);
  };

  if (S.view === 'front') {
    let x0, y0, x1, y1;
    if (o.type === 'object') { const b = bbox(o); x0 = b.x0; y0 = b.y0; x1 = b.x1; y1 = b.y1; }
    else if (o.type === 'shelf') { x0 = o.x; y0 = o.y - o.t; x1 = o.x + o.w; y1 = o.y; }
    else { x0 = o.x; y0 = 0; x1 = o.x + o.w; y1 = o.h; }

    gap(w2s(0, y0), w2s(x0, y0), x0);                       /* from the left  */
    gap(w2s(x0, 0), w2s(x0, y0), y0);                       /* from the floor */
    gap(w2s(S.cs.w, y1), w2s(x1, y1), S.cs.w - x1);         /* from the right */
    gap(w2s(x1, S.cs.h), w2s(x1, y1), S.cs.h - y1);         /* from the top   */

    if (o.type === 'object' && o.mount === 'hanging' && o.wires && o.wires[0]) {
      const wr = o.wires[0];
      const att = attachWorld(o, wr);
      const a = w2s(att.x, o.rail ?? S.rail), b2 = w2s(att.x, att.y);
      arrowDim(a.x - 14, a.y, a.x - 14, b2.y, `${rnd(wireLen(o, wr))}`, C.accent);
    }
  } else {
    const f = o.type === 'object' ? envelope(o) : { x: o.x, w: o.w, z: o.z, d: o.d };
    const x1 = f.x + f.w, z1 = f.z + f.d;

    gap(w2s(0, f.z), w2s(f.x, f.z), f.x);                   /* from the left  */
    gap(w2s(f.x, 0), w2s(f.x, f.z), f.z);                   /* from the back  */
    gap(w2s(S.cs.w, z1), w2s(x1, z1), S.cs.w - x1);         /* from the right */
    gap(w2s(x1, S.cs.d), w2s(x1, z1), S.cs.d - z1);         /* from the front */
  }
  ctx.restore();
}

/* the little handle you drag to turn an object */
const SPIN_ARM = 26;
/* The same handle in both views, turning the object about whichever
   axis you are looking along: in elevation that is the picture plane
   (spin), looking down it is the vertical axis (yaw). */
function spinHandlePos() {
  const o = byId(S.sel);
  if (!o || o.type !== 'object') return null;
  if (S.view === 'front') {
    const b = bbox(o);
    const top = w2s((b.x0 + b.x1) / 2, b.y1);
    return { x: top.x, y: top.y - SPIN_ARM, anchor: top, prop: 'spin' };
  }
  if (faceOf(o) || o.mount === 'wall') return null;   /* flat to a face: nothing to turn */
  const f = footprint(o);
  const back = w2s(f.x + f.w / 2, f.z);
  return { x: back.x, y: back.y - SPIN_ARM, anchor: back, prop: 'yaw' };
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

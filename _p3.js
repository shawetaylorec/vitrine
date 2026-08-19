/* ============================================================
   Image wizard — cut out, size, mounting
   ============================================================ */

const MAXPX = 1600;               // working resolution cap
const wizCv = $('#wizCanvas');
const wizCtx = wizCv.getContext('2d');

const W = {
  open: false, live: false, mode: 'object', step: 1, editId: null, queue: [], topFor: null, pendingTopFor: null,
  base: null,     // canvas the Reset and Restore brush pull from
  raw: null,      // the original photo, if we still have it
  work: null,     // canvas being edited
  undo: [],
  tol: 32, erode: 1, brush: 36, tool: 'wand', cutMode: 'edges', bgColour: null,
  crop: null,
  scaleMode: 'width', keepAspect: true, widthCm: 20, heightCm: 15, lineCm: 10, calib: null,
  depthCm: 3, name: '',
  mount: 'placed', support: 'floor', lean: 0, leanFrom: 'upright', wallY: 100, face: 'back',
  stand: { kind: 'none', w: 0, d: 0, h: 0 },
  planShape: 'auto',
  points: [],     // wire attachment points, in work-canvas pixels
  zoom: 1, pan: { x: 0, y: 0 },
  bb: null,
  cursor: null, painting: false, panning: false
};

function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
function copyCanvas(src) { const c = newCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; }

function contentBBox(cv) {
  const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: cv.width, h: cv.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* ---- background removal ------------------------------------
   Two passes are offered. "From edges" floods inwards from the
   border, which keeps anything enclosed by the object. "Everywhere"
   keys out that colour across the whole picture, which is what an
   openwork object on a flat backdrop — a rete, a pierced mount —
   actually needs, because its background is mostly interior. */

function colDist(d, i, r, g, b) {
  const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

function borderSeeds(cv) {
  const W_ = cv.width, H_ = cv.height, out = [];
  for (let x = 0; x < W_; x++) { out.push(x); out.push((H_ - 1) * W_ + x); }
  for (let y = 0; y < H_; y++) { out.push(y * W_); out.push(y * W_ + W_ - 1); }
  return out;
}

function sampleBorder(cv) {
  const c = cv.getContext('2d', { willReadFrequently: true });
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (const p of borderSeeds(cv)) {
    const i = p * 4;
    if (d[i + 3] > 8) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  }
  return n ? [r / n, g / n, b / n] : [255, 255, 255];
}

function softAlpha(dist, hard, soft, a) {
  if (dist <= hard) return 0;
  if (dist >= soft) return a;
  return Math.round(a * ((dist - hard) / (soft - hard)));
}

function flood(cv, seeds, tolPct, col) {
  const c = cv.getContext('2d', { willReadFrequently: true });
  const W_ = cv.width, H_ = cv.height;
  const im = c.getImageData(0, 0, W_, H_);
  const d = im.data;
  const soft = tolPct * 1.9, hard = soft * 0.68;
  const [r, g, b] = col;

  const seen = new Uint8Array(W_ * H_);
  const stack = new Int32Array(W_ * H_);
  let sp = 0;
  for (const p of seeds) { if (p >= 0 && p < W_ * H_ && !seen[p]) { seen[p] = 1; stack[sp++] = p; } }

  while (sp > 0) {
    const p = stack[--sp];
    const i = p * 4;
    if (d[i + 3] !== 0) {
      const dist = colDist(d, i, r, g, b);
      if (dist > soft) continue;
      const na = softAlpha(dist, hard, soft, d[i + 3]);
      d[i + 3] = na;
      if (na !== 0) continue;          /* edge pixel: stop spreading here */
    }
    const x = p % W_, y = (p - x) / W_;
    if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1; }
    if (x < W_ - 1 && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1; }
    if (y > 0 && !seen[p - W_]) { seen[p - W_] = 1; stack[sp++] = p - W_; }
    if (y < H_ - 1 && !seen[p + W_]) { seen[p + W_] = 1; stack[sp++] = p + W_; }
  }
  c.putImageData(im, 0, 0);
}

function colourKey(cv, tolPct, col) {
  const c = cv.getContext('2d', { willReadFrequently: true });
  const im = c.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const soft = tolPct * 1.9, hard = soft * 0.68;
  const [r, g, b] = col;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const dist = colDist(d, i, r, g, b);
    if (dist < soft) d[i + 3] = softAlpha(dist, hard, soft, d[i + 3]);
  }
  c.putImageData(im, 0, 0);
}

function erodeAlpha(cv, px) {
  if (px <= 0) return;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const W_ = cv.width, H_ = cv.height;
  const im = c.getImageData(0, 0, W_, H_), d = im.data;
  for (let pass = 0; pass < px; pass++) {
    const a = new Uint8Array(W_ * H_);
    for (let i = 0; i < W_ * H_; i++) a[i] = d[i * 4 + 3];
    for (let y = 0; y < H_; y++) {
      for (let x = 0; x < W_; x++) {
        const p = y * W_ + x;
        let m = a[p];
        if (x > 0) m = Math.min(m, a[p - 1]);
        if (x < W_ - 1) m = Math.min(m, a[p + 1]);
        if (y > 0) m = Math.min(m, a[p - W_]);
        if (y < H_ - 1) m = Math.min(m, a[p + W_]);
        d[p * 4 + 3] = m;
      }
    }
  }
  c.putImageData(im, 0, 0);
}

function runAuto() {
  if (!W.base) return;
  pushUndo();
  W.work = copyCanvas(W.base);
  const col = W.bgColour || sampleBorder(W.base);
  if (W.cutMode === 'all') colourKey(W.work, W.tol, col);
  else flood(W.work, borderSeeds(W.work), W.tol, col);
  erodeAlpha(W.work, W.erode);
  W.bb = null; drawWiz(); refreshScale();
}

function pushUndo() {
  if (!W.work) return;
  W.undo.push(copyCanvas(W.work));
  if (W.undo.length > 14) W.undo.shift();
}
function wizUndo() {
  const c = W.undo.pop();
  if (!c) { toast('Nothing to undo'); return; }
  W.work = c; W.bb = null; drawWiz(); refreshScale();
}

/* ---- wizard canvas ---- */

function wizFitScale() {
  const st = $('#wizStage');
  if (!W.work) return 1;
  return Math.min((st.clientWidth - 30) / W.work.width, (st.clientHeight - 60) / W.work.height, 3);
}
function wizT() {
  const st = $('#wizStage');
  const s = wizFitScale() * W.zoom;
  return {
    s,
    ox: (st.clientWidth - W.work.width * s) / 2 + W.pan.x,
    oy: (st.clientHeight - W.work.height * s) / 2 + W.pan.y
  };
}
function wizPt(e) {
  const r = wizCv.getBoundingClientRect();
  const t = wizT();
  return { x: (e.clientX - r.left - t.ox) / t.s, y: (e.clientY - r.top - t.oy) / t.s };
}

function drawWiz() {
  if (!W.work) return;
  const st = $('#wizStage');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = st.clientWidth, ch = st.clientHeight;
  if (wizCv.width !== Math.round(cw * dpr) || wizCv.height !== Math.round(ch * dpr)) {
    wizCv.width = Math.round(cw * dpr); wizCv.height = Math.round(ch * dpr);
  }
  wizCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  wizCtx.clearRect(0, 0, cw, ch);

  const t = wizT();
  const cs = getComputedStyle(document.documentElement);
  const A = cs.getPropertyValue('--accent').trim();
  const P = cs.getPropertyValue('--plan').trim();
  const K = cs.getPropertyValue('--ink').trim();

  wizCtx.save();
  wizCtx.translate(t.ox, t.oy);
  wizCtx.scale(t.s, t.s);
  wizCtx.imageSmoothingEnabled = t.s < 2;
  wizCtx.drawImage(W.work, 0, 0);
  wizCtx.restore();

  const px = v => v / 1;   /* overlays are drawn in screen space */
  const toS = (x, y) => ({ x: t.ox + x * t.s, y: t.oy + y * t.s });

  if (W.step >= 2 && W.mode !== 'top') {
    const bb = W.bb || (W.bb = contentBBox(W.work));
    const a = toS(bb.x, bb.y), b = toS(bb.x + bb.w, bb.y + bb.h);
    wizCtx.save();
    wizCtx.strokeStyle = P; wizCtx.lineWidth = 1.5; wizCtx.setLineDash([6, 4]);
    wizCtx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    wizCtx.restore();
  }
  if (W.step === 2 && W.scaleMode === 'line' && W.calib) {
    const a = toS(W.calib.x1, W.calib.y1), b = toS(W.calib.x2, W.calib.y2);
    wizCtx.save();
    wizCtx.strokeStyle = A; wizCtx.lineWidth = 2;
    wizCtx.beginPath(); wizCtx.moveTo(a.x, a.y); wizCtx.lineTo(b.x, b.y); wizCtx.stroke();
    for (const q of [a, b]) { wizCtx.beginPath(); wizCtx.arc(q.x, q.y, 4, 0, 7); wizCtx.fillStyle = A; wizCtx.fill(); }
    wizCtx.restore();
  }
  if (W.step === 3 && W.mount === 'hanging') {
    const bb = W.bb || (W.bb = contentBBox(W.work));
    W.points.forEach((p, i) => {
      const q = toS(p.x, p.y);
      wizCtx.save();
      wizCtx.strokeStyle = A; wizCtx.lineWidth = 2;
      wizCtx.beginPath(); wizCtx.moveTo(q.x, q.y); wizCtx.lineTo(q.x, toS(0, bb.y).y - 24); wizCtx.stroke();
      wizCtx.fillStyle = A;
      wizCtx.beginPath(); wizCtx.arc(q.x, q.y, 7, 0, 7); wizCtx.fill();
      wizCtx.fillStyle = '#fff'; wizCtx.font = '10px "IBM Plex Mono",monospace';
      wizCtx.textAlign = 'center'; wizCtx.textBaseline = 'middle';
      wizCtx.fillText(String(i + 1), q.x, q.y);
      wizCtx.restore();
    });
  }
  if (W.crop) {
    const a = toS(Math.min(W.crop.x0, W.crop.x1), Math.min(W.crop.y0, W.crop.y1));
    const b = toS(Math.max(W.crop.x0, W.crop.x1), Math.max(W.crop.y0, W.crop.y1));
    wizCtx.save();
    wizCtx.fillStyle = 'rgba(0,0,0,.35)';
    wizCtx.fillRect(0, 0, cw, ch);
    wizCtx.clearRect(a.x, a.y, b.x - a.x, b.y - a.y);
    wizCtx.save();
    wizCtx.translate(t.ox, t.oy); wizCtx.scale(t.s, t.s);
    wizCtx.beginPath();
    wizCtx.rect((a.x - t.ox) / t.s, (a.y - t.oy) / t.s, (b.x - a.x) / t.s, (b.y - a.y) / t.s);
    wizCtx.clip();
    wizCtx.drawImage(W.work, 0, 0);
    wizCtx.restore();
    wizCtx.strokeStyle = A; wizCtx.lineWidth = 1.5; wizCtx.setLineDash([5, 4]);
    wizCtx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    wizCtx.restore();
  }
  if (W.step === 1 && W.cursor && (W.tool === 'erase' || W.tool === 'restore')) {
    const q = toS(W.cursor.x, W.cursor.y);
    wizCtx.save();
    wizCtx.strokeStyle = W.tool === 'erase' ? A : P; wizCtx.lineWidth = 1.5;
    wizCtx.beginPath(); wizCtx.arc(q.x, q.y, (W.brush / 2) * t.s, 0, 7); wizCtx.stroke();
    wizCtx.strokeStyle = 'rgba(255,255,255,.7)'; wizCtx.lineWidth = .8;
    wizCtx.beginPath(); wizCtx.arc(q.x, q.y, (W.brush / 2) * t.s + 1.2, 0, 7); wizCtx.stroke();
    wizCtx.restore();
  }
  $('#wzVal').textContent = Math.round(t.s * 100) + '%';
}

function paintBrush(p) {
  const c = W.work.getContext('2d');
  c.save();
  c.beginPath(); c.arc(p.x, p.y, W.brush / 2, 0, 7);
  if (W.tool === 'erase') {
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000'; c.fill();
  } else {
    c.clip();
    c.drawImage(W.base, 0, 0);
  }
  c.restore();
  W.bb = null;
}

function applyCrop() {
  if (!W.crop) { toast('Drag a box over the part you want to keep first'); return; }
  const x0 = Math.max(0, Math.round(Math.min(W.crop.x0, W.crop.x1)));
  const y0 = Math.max(0, Math.round(Math.min(W.crop.y0, W.crop.y1)));
  const x1 = Math.min(W.work.width, Math.round(Math.max(W.crop.x0, W.crop.x1)));
  const y1 = Math.min(W.work.height, Math.round(Math.max(W.crop.y0, W.crop.y1)));
  if (x1 - x0 < 8 || y1 - y0 < 8) { toast('That box is too small'); return; }
  pushUndo();
  const cut = (src) => {
    const c = newCanvas(x1 - x0, y1 - y0);
    c.getContext('2d').drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return c;
  };
  /* base has to follow so Reset and the Restore brush stay lined up */
  W.work = cut(W.work); W.base = cut(W.base);
  W.points = W.points.map(p => ({ x: p.x - x0, y: p.y - y0 }));
  if (W.calib) W.calib = { x1: W.calib.x1 - x0, y1: W.calib.y1 - y0, x2: W.calib.x2 - x0, y2: W.calib.y2 - y0 };
  W.crop = null; W.bb = null; W.zoom = 1; W.pan = { x: 0, y: 0 };
  drawWiz(); refreshScale();
  toast('Cropped');
}

function transformWork(fn) {
  pushUndo();
  W.work = fn(W.work); W.base = fn(W.base);
  W.points = []; W.calib = null; W.crop = null; W.bb = null;
  W.zoom = 1; W.pan = { x: 0, y: 0 };
  /* the picture turned, so the size fields swap meaning */
  const t = W.widthCm; W.widthCm = W.heightCm; W.heightCm = t;
  syncWizFields();
  drawWiz(); refreshScale();
}
const rotCanvas = dir => src => {
  const c = newCanvas(src.height, src.width);
  const x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2);
  x.rotate(dir * Math.PI / 2);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
};
const mirrorCanvas = vertical => src => {
  const c = newCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(vertical ? 0 : src.width, vertical ? src.height : 0);
  x.scale(vertical ? 1 : -1, vertical ? -1 : 1);
  x.drawImage(src, 0, 0);
  return c;
};

/* ---- pointer on the wizard canvas ---- */

wizCv.addEventListener('pointerdown', e => {
  if (!W.work) return;
  wizCv.setPointerCapture(e.pointerId);
  const p = wizPt(e);
  if (e.button === 1 || W.tool === 'pan' || e.shiftKey) {
    W.panning = { sx: e.clientX, sy: e.clientY, px: W.pan.x, py: W.pan.y };
    return;
  }
  if (W.step === 1) {
    if (W.tool === 'crop') { W.crop = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; W.painting = true; drawWiz(); return; }
    if (W.tool === 'pick') {
      const d = W.work.getContext('2d', { willReadFrequently: true }).getImageData(clamp(p.x | 0, 0, W.work.width - 1), clamp(p.y | 0, 0, W.work.height - 1), 1, 1).data;
      W.bgColour = [d[0], d[1], d[2]];
      toast(`Background colour picked — rgb(${d[0]}, ${d[1]}, ${d[2]})`);
      runAuto();
      return;
    }
    pushUndo();
    if (W.tool === 'wand') {
      const ix = clamp(p.x | 0, 0, W.work.width - 1), iy = clamp(p.y | 0, 0, W.work.height - 1);
      const d = W.work.getContext('2d', { willReadFrequently: true }).getImageData(ix, iy, 1, 1).data;
      const col = [d[0], d[1], d[2]];
      if (W.cutMode === 'all') colourKey(W.work, W.tol, col);
      else flood(W.work, [iy * W.work.width + ix], W.tol, col);
      W.bb = null; drawWiz(); refreshScale();
    } else { W.painting = true; paintBrush(p); drawWiz(); }
  } else if (W.step === 2 && W.scaleMode === 'line') {
    W.calib = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; W.painting = true; drawWiz();
  } else if (W.step === 3 && W.mount === 'hanging') {
    if (W.points.length >= 2) {
      let bi = 0, bd = Infinity;
      W.points.forEach((q, i) => { const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d2 < bd) { bd = d2; bi = i; } });
      W.points[bi] = p;
    } else W.points.push(p);
    W.points.sort((a, b) => a.x - b.x);
    drawWiz(); renderWirePanel();
  }
});

wizCv.addEventListener('pointermove', e => {
  if (!W.work) return;
  if (W.panning) {
    W.pan.x = W.panning.px + (e.clientX - W.panning.sx);
    W.pan.y = W.panning.py + (e.clientY - W.panning.sy);
    drawWiz();
    return;
  }
  const p = wizPt(e);
  W.cursor = p;
  if (W.painting) {
    if (W.step === 1 && W.tool === 'crop') { W.crop.x1 = p.x; W.crop.y1 = p.y; }
    else if (W.step === 1) paintBrush(p);
    else if (W.step === 2 && W.calib) { W.calib.x2 = p.x; W.calib.y2 = p.y; refreshScale(); }
  }
  drawWiz();
});
const wizStop = () => {
  if (W.painting && W.step === 1 && W.tool !== 'crop') refreshScale();
  W.painting = false; W.panning = false;
};
wizCv.addEventListener('pointerup', wizStop);
wizCv.addEventListener('pointercancel', wizStop);
wizCv.addEventListener('pointerleave', () => { W.cursor = null; drawWiz(); });
wizCv.addEventListener('wheel', e => {
  if (!W.work) return;
  e.preventDefault();
  const before = wizPt(e);
  W.zoom = clamp(W.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.15, 24);
  const t = wizT();
  const r = wizCv.getBoundingClientRect();
  W.pan.x += (e.clientX - r.left) - (t.ox + before.x * t.s);
  W.pan.y += (e.clientY - r.top) - (t.oy + before.y * t.s);
  drawWiz();
}, { passive: false });

/* ---- steps ---- */

const TOOLHELP = {
  wand: 'Click a patch of background to clear it. With “Everywhere” on, one click keys that colour out of the whole picture — which is how you get the gaps inside a rete.',
  erase: 'Paint away anything the passes left behind. Scroll to zoom right in for fine work.',
  restore: 'Paint back anything that was removed by mistake.',
  crop: 'Drag a box around what you want to keep, then Apply crop. Everything outside it goes for good.',
  pick: 'Click the actual background in the picture. The passes then work from that colour rather than guessing from the border.',
  pan: 'Drag to move the picture around. Scroll zooms at any time.'
};

function setStep(n) {
  if (W.mode === 'top') n = 1;
  W.step = n;
  if (n >= 2) W.bb = contentBBox(W.work);
  $$('#wizSteps button').forEach(b => b.dataset.on = b.dataset.step === String(n) ? '1' : '0');
  $$('#wizSide [data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== String(n)));
  $('#wizBack1').disabled = n === 1;
  $('#wizNext').textContent = W.mode === 'top' ? 'Use as top view' : n === 3 ? (W.editId ? 'Save object' : 'Add to case') : 'Next';
  $('#wizSteps').classList.toggle('hidden', W.mode === 'top');
  setWizCursor();
  updateHint();
  if (n === 2) refreshScale();
  if (n === 3) { renderSupportSel(); renderWirePanel(); syncStandFields(); }
  drawWiz();
}

function updateHint() {
  const h = $('#wizHint');
  if (W.mode === 'top') { h.textContent = 'Cut out the object as seen from above, then use it as the plan view.'; return; }
  if (W.step === 1) h.textContent = TOOLHELP[W.tool] || '';
  else if (W.step === 2) h.textContent = W.scaleMode === 'line'
    ? 'Drag a line across something you know the length of.'
    : 'The dashed box is the cut-out — that is what gets measured.';
  else h.textContent = W.mount === 'hanging'
    ? 'Click the picture where each wire attaches.'
    : W.mount === 'wall' ? 'Fixed flat to the back wall — set its height on the right.'
      : 'Set the support, any stand or cradle, and the lean on the right.';
}

/* the cursor is owned by the step, not by whichever brush was last used */
function setWizCursor() {
  const hideForBrush = W.step === 1 && (W.tool === 'erase' || W.tool === 'restore');
  wizCv.style.cursor = W.panning || W.tool === 'pan' ? 'grab' : hideForBrush ? 'none' : 'crosshair';
}

const calibLen = () => W.calib ? Math.hypot(W.calib.x2 - W.calib.x1, W.calib.y2 - W.calib.y1) : 0;

/* cm per pixel, separately for each axis so a deliberately
   non-proportional size is possible */
function scaleFactors() {
  const bb = W.bb || (W.bb = contentBBox(W.work));
  if (!W.keepAspect) {
    return { kx: bb.w ? W.widthCm / bb.w : 0, ky: bb.h ? W.heightCm / bb.h : 0, bb };
  }
  let k = 0;
  if (W.scaleMode === 'line') { const L = calibLen(); k = L > 2 ? W.lineCm / L : 0; }
  else if (W.scaleMode === 'height') k = bb.h ? W.heightCm / bb.h : 0;
  else k = bb.w ? W.widthCm / bb.w : 0;
  return { kx: k, ky: k, bb };
}

function refreshScale() {
  if (W.step !== 2 || !W.work) return;
  W.bb = contentBBox(W.work);
  const { kx, ky, bb } = scaleFactors();
  const out = $('#scaleReadout');
  if (!out) return;
  if (!kx || !ky) {
    out.innerHTML = '<span>Give it a measurement to work from.</span>';
    return;
  }
  if (W.keepAspect) {
    W.widthCm = rnd(bb.w * kx, 2);
    W.heightCm = rnd(bb.h * ky, 2);
    const wi = $('#objW'), hi = $('#objH');
    if (wi && document.activeElement !== wi) wi.value = W.widthCm;
    if (hi && document.activeElement !== hi) hi.value = W.heightCm;
  }
  out.innerHTML = `<span>cut-out <b>${bb.w}&times;${bb.h}</b> px</span>
    <span><b>${rnd(1 / kx, 2)}</b> px/cm</span>
    <span>object <b>${rnd(bb.w * kx, 2)} &times; ${rnd(bb.h * ky, 2)}</b> cm</span>`;
}

function renderSupportSel() {
  const sel = $('#supportSel');
  sel.innerHTML = supportList().map(s => `<option value="${s.id}"${s.id === W.support ? ' selected' : ''}>${esc(s.name)} &mdash; top at ${rnd(s.top)} cm</option>`).join('');
  $('#panelPlaced').classList.toggle('hidden', W.mount !== 'placed');
  $('#panelStand').classList.toggle('hidden', W.mount !== 'placed');
  $('#panelHanging').classList.toggle('hidden', W.mount !== 'hanging');
  $('#panelWall').classList.toggle('hidden', W.mount !== 'wall');
  const fs = $('#faceSel');
  fs.innerHTML = ['<option value="back">The back wall</option>']
    .concat(S.items.filter(i => i.type === 'plinth')
      .map(p => '<option value="' + p.id + '">Front of ' + esc(p.name) + '</option>'))
    .join('');
  fs.value = W.face || 'back';
  syncLeanFields();
}
function syncLeanFields() {
  const shown = W.leanFrom === 'flat' ? 90 - W.lean : W.lean;
  $('#lean').value = shown;
  $('#leanNum').value = rnd(shown);
  $('#leanFrom').value = W.leanFrom;
  $('#leanHelp').textContent = W.leanFrom === 'flat'
    ? 'Measured up from lying flat — 0° is flat on the deck, 90° is standing upright. This is the natural way to describe a manuscript in a cradle.'
    : 'Measured back from standing upright — 0° is vertical, 90° is flat on the deck.';
}
function syncStandFields() {
  const k = W.stand.kind;
  $('#standKind').value = k;
  $('#standFields').classList.toggle('hidden', k === 'none');
  $('#standW').value = rnd(W.stand.w);
  $('#standD').value = rnd(W.stand.d);
  $('#standH').value = rnd(W.stand.h);
  $('#standHLabel').textContent = 'Base h cm';
  /* a cradle is cut to fit its book, so only the height is yours to give */
  $('#standWF').classList.toggle('hidden', cradleFits(k));
  $('#standDF').classList.toggle('hidden', cradleFits(k));
  $('#standHelp').textContent =
    k === 'cradle' ? 'Made to fit its book, so it takes the object’s own width and depth — you give only the height.'
      : k === 'stand' ? 'Only splays into a V seen from above — from the front you get the base and its notches. Its footprint is usually deeper than the object, and that is what has to fit on the plinth.'
        : k === 'block' ? 'A plain block under the object. Its height is added to whatever it stands on.'
          : 'Nothing under the object.';
}
function renderWirePanel() {
  const l = $('#wireList');
  if (!l || !W.bb) return;
  l.innerHTML = W.points.length
    ? W.points.map((p, i) => `<div class="item"><span class="sw">${i + 1}</span><span class="nm">across ${Math.round(((p.x - W.bb.x) / W.bb.w) * 100)}% &middot; down ${Math.round(((p.y - W.bb.y) / W.bb.h) * 100)}%</span></div>`).join('')
    : '<p class="empty">No attachment points marked yet — one will be assumed at the top centre.</p>';
}

function syncWizFields() {
  $('#tol').value = W.tol; $('#tolVal').textContent = W.tol;
  $('#erode').value = W.erode; $('#erodeVal').textContent = W.erode + ' px';
  $('#brush').value = W.brush; $('#brushVal').textContent = W.brush + ' px';
  $('#objW').value = rnd(W.widthCm, 2); $('#objH').value = rnd(W.heightCm, 2);
  $('#objD').value = W.depthCm; $('#lineCm').value = W.lineCm;
  $('#objName').value = W.name;
  $('#keepAspect').checked = W.keepAspect;
  $('#wallYNum').value = rnd(W.wallY);
  $('#planShape').value = W.planShape;
  $$('#mountTools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mount === W.mount)));
  $$('#scaleTools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scale === W.scaleMode)));
  $$('#brushTools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.brush === W.tool)));
  $$('#cutMode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cut === W.cutMode)));
  $('#scaleLine').classList.toggle('hidden', W.scaleMode !== 'line');
  $('#cropRow').classList.toggle('hidden', W.tool !== 'crop');
  $('#brushSizeWrap').classList.toggle('hidden', W.tool !== 'erase' && W.tool !== 'restore');
  $('#scaleHelp').textContent = W.keepAspect
    ? 'Type either measurement and the other follows the picture.'
    : 'Width and height are set independently — the picture will be stretched to match.';
  $('#cutHelp').textContent = W.cutMode === 'all'
    ? 'Keys that colour out of the entire picture, inside the object as well as around it. Right for openwork on a plain backdrop; it will bite into the object if the object shares the colour.'
    : 'Works inwards from the four edges, so anything enclosed by the object survives. Right for solid objects.';
  $('#standKind').value = W.stand.kind;
}

/* ---- open, minimise, close ---- */

const TIFF_RE = /\.tiff?$/i;

async function openWizardFiles(files, preset) {
  const list = Array.from(files);
  const tiffs = list.filter(f => TIFF_RE.test(f.name) || f.type === 'image/tiff');
  if (tiffs.length) toast(`Chrome cannot read TIFF — save ${tiffs.length > 1 ? 'those' : 'that one'} as PNG or JPEG first`);
  W.preset = preset || null;
  W.queue = list.filter(f => !tiffs.includes(f));
  if (W.queue.length) nextFromQueue();
}

async function fileToCanvas(f) {
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  const img = await loadImage(url);
  const s = Math.min(1, MAXPX / Math.max(img.width, img.height));
  const cv = newCanvas(Math.round(img.width * s), Math.round(img.height * s));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

async function nextFromQueue() {
  const f = W.queue.shift();
  if (!f) return;
  try {
    const cv = await fileToCanvas(f);
    W.mode = 'object'; W.editId = null; W.topFor = null;
    W.raw = cv; W.base = cv; W.work = copyCanvas(cv);
    W.undo = []; W.calib = null; W.points = []; W.bb = null; W.crop = null;
    W.zoom = 1; W.pan = { x: 0, y: 0 }; W.bgColour = null; W.tool = 'wand'; W.cutMode = 'edges';
    W.name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60);
    W.widthCm = 20; W.heightCm = 15; W.depthCm = 3; W.keepAspect = true; W.scaleMode = 'width';
    W.mount = 'placed'; W.support = 'floor'; W.lean = 0; W.leanFrom = 'upright';
    W.wallY = rnd(S.cs.h * 0.55); W.planShape = 'auto'; W.face = 'back';
    W.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    if (W.preset) Object.assign(W, W.preset);
    showWizard(W.mount === 'wall' ? 'Add a graphic to the wall' : 'Add object');
    runAuto();
    setStep(1);
  } catch (err) { toast('Could not read that image'); }
}

async function openWizard({ edit, step = 1 }) {
  const o = byId(edit); if (!o) return;
  if (o.render !== 'image') { select(o.id); toast('Shapes and panels are edited on the right'); return; }
  W.mode = 'object'; W.editId = edit; W.topFor = null;
  const cut = await loadImage(o.png);
  const cv = newCanvas(cut.width, cut.height);
  cv.getContext('2d').drawImage(cut, 0, 0);
  W.base = cv; W.work = copyCanvas(cv);
  W.raw = null;
  if (o.raw) { try { const r = await loadImage(o.raw); const rc = newCanvas(r.width, r.height); rc.getContext('2d').drawImage(r, 0, 0); W.raw = rc; } catch (e) { } }
  W.undo = []; W.calib = null; W.crop = null; W.bb = contentBBox(cv);
  W.zoom = 1; W.pan = { x: 0, y: 0 }; W.bgColour = null; W.tool = 'wand'; W.cutMode = 'edges';
  W.name = o.name; W.widthCm = rnd(o.w, 2); W.heightCm = rnd(o.h, 2); W.depthCm = rnd(o.depth, 2);
  W.keepAspect = o.keepAspect !== false; W.scaleMode = 'width';
  W.mount = o.mount; W.support = o.support || 'floor';
  W.lean = o.lean || 0; W.leanFrom = o.leanFrom || 'upright';
  W.wallY = o.wallY || rnd(S.cs.h * 0.55); W.face = o.face || 'back';
  W.planShape = o.planShape || 'auto';
  W.stand = o.stand ? { ...o.stand } : { kind: 'none', w: 0, d: 0, h: 0 };
  W.points = (o.wires || []).map(wr => ({ x: W.bb.x + wr.ax * W.bb.w, y: W.bb.y + wr.ay * W.bb.h }));
  showWizard('Edit ' + o.name);
  setStep(step);
}

async function pickTopView(id) {
  W.pendingTopFor = id;
  $('#fileTop').click();
}
async function openTopWizard(id, file) {
  try {
    const cv = await fileToCanvas(file);
    W.mode = 'top'; W.topFor = id; W.editId = null;
    W.raw = cv; W.base = cv; W.work = copyCanvas(cv);
    W.undo = []; W.crop = null; W.calib = null; W.points = []; W.bb = null;
    W.zoom = 1; W.pan = { x: 0, y: 0 }; W.bgColour = null; W.tool = 'wand'; W.cutMode = 'edges';
    showWizard('Top view — ' + (byId(id)?.name || 'object'));
    runAuto();
    setStep(1);
  } catch (e) { toast('Could not read that image'); }
}

function showWizard(title) {
  W.open = true; W.live = true;
  $('#wizTitle').textContent = title;
  $('#wizBack').hidden = false;
  $('#btnResume').classList.add('hidden');
  syncWizFields();
  syncLeanFields();
  syncStandFields();
  $('#wizFoot').innerHTML = W.raw && W.editId ? '<button class="btn ghost sm" id="fromOrig">Start again from the original photo</button>' : '';
  const fo = $('#fromOrig');
  if (fo) fo.onclick = () => { pushUndo(); W.base = W.raw; W.work = copyCanvas(W.raw); W.bb = null; runAuto(); toast('Back to the original photo'); };
  requestAnimationFrame(() => { drawWiz(); setWizCursor(); });
}

/* keep everything, just get out of the way */
function minimiseWizard() {
  if (!W.open) return;
  W.open = false;
  $('#wizBack').hidden = true;
  const btn = $('#btnResume');
  btn.textContent = `Resume “${W.name || 'top view'}”`;
  btn.classList.remove('hidden');
  toast('Kept — pick it back up from the Resume button');
}
function resumeWizard() {
  if (!W.live) return;
  W.open = true;
  $('#wizBack').hidden = false;
  $('#btnResume').classList.add('hidden');
  requestAnimationFrame(() => { drawWiz(); setWizCursor(); });
}
function discardWizard() {
  if (W.live && !confirm('Throw away this cut-out and everything set on it?')) return;
  W.open = false; W.live = false; W.queue = [];
  W.work = W.base = W.raw = null; W.undo = [];
  $('#wizBack').hidden = true;
  $('#btnResume').classList.add('hidden');
}

function finishWizard() {
  const bb = contentBBox(W.work);
  const out = newCanvas(bb.w, bb.h);
  out.getContext('2d').drawImage(W.work, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
  const png = out.toDataURL('image/png');

  /* a top-view picture just attaches to an object that already exists */
  if (W.mode === 'top') {
    const target = byId(W.topFor);
    if (target) {
      target.topPng = png;
      target.planShape = 'top';
      loadImage(png).then(img => { TOP.set(target.id, img); draw(); });
      select(target.id);
      toast('Top view attached');
    }
    W.open = false; W.live = false;
    $('#wizBack').hidden = true; $('#btnResume').classList.add('hidden');
    commit();
    return;
  }

  const { kx, ky } = scaleFactors();
  if (!kx || !ky) { toast('Set the size first'); setStep(2); return; }
  const w = rnd(bb.w * kx, 2), h = rnd(bb.h * ky, 2);

  const wires = (W.mount === 'hanging'
    ? (W.points.length ? W.points : [{ x: bb.x + bb.w / 2, y: bb.y + bb.h * 0.04 }])
    : []
  ).map(p => ({ ax: clamp((p.x - bb.x) / bb.w, 0, 1), ay: clamp((p.y - bb.y) / bb.h, 0, 1), len: 0 }));

  let o = byId(W.editId);
  const isNew = !o;
  if (isNew) {
    o = blankObject({
      name: W.name || 'Object', render: 'image', png, w, h, depth: W.depthCm,
      mount: W.mount, support: W.support, lean: W.lean, leanFrom: W.leanFrom,
      wallY: W.wallY, planShape: W.planShape, keepAspect: W.keepAspect, face: W.face,
      stand: { ...W.stand }, rail: S.rail, wires, z: 2
    });
    if (W.raw) { const rc = copyCanvas(W.raw); o.raw = rc.toDataURL('image/jpeg', 0.82); }
    S.items.push(o);
  } else {
    Object.assign(o, {
      name: W.name || o.name, png, w, h, depth: W.depthCm,
      mount: W.mount, support: W.support, lean: W.lean, leanFrom: W.leanFrom,
      wallY: W.wallY, planShape: W.planShape, keepAspect: W.keepAspect, face: W.face,
      stand: { ...W.stand }
    });
    if (wires.length) o.wires = wires.map((nw, i) => ({ ...nw, len: (o.wires && o.wires[i]) ? o.wires[i].len : 0 }));
  }

  if (o.mount === 'hanging') {
    o.rail = o.rail || S.rail;
    for (const wr of o.wires) if (!wr.len) wr.len = rnd(10 + wr.ay * o.h, 1);
  } else if (o.mount === 'placed') {
    /* a new object lands centred on whatever it stands on; one you are
       re-editing keeps the place you put it unless it is now off it */
    const sup = supportOf(o);
    if (isNew) {
      o.x = rnd(sup.x + (sup.w - o.w) / 2, 1);
      const f = footprint(o);
      o.z = rnd(clamp(sup.z + (sup.d - f.d) / 2, sup.z, Math.max(sup.z, sup.z + sup.d - f.d)), 1);
      /* on the open floor, step clear of anything already centred there */
      if (sup.id === 'floor') freeSpot(o);
    } else {
      landOn(o, sup);
    }
    if (o.stand && o.stand.kind !== 'none' && !o.stand.w) {
      const f = footprint(o);
      o.stand.w = rnd(Math.max(4, o.w * 0.6));
      o.stand.d = rnd(Math.max(4, f.d + 2));
    }
  }

  loadImage(png).then(img => { BMP.set(o.id, img); draw(); });
  select(o.id);
  W.open = false; W.live = false;
  $('#wizBack').hidden = true; $('#btnResume').classList.add('hidden');
  commit();
  toast(isNew ? `${o.name} added` : `${o.name} updated`);
  if (W.queue.length) setTimeout(nextFromQueue, 150);
}

/* ============================================================
   Persistence
   ============================================================ */

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function idb() {
  return new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open('vitrine', 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
}
async function kvSet(k, v) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(v, k);
    t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
}
async function kvGet(k) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readonly');
    const q = t.objectStore('kv').get(k);
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}

async function kvDel(k) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').delete(k);
    t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
}

let autosaveWarned = false;
const store = {
  async del(k) {
    try { await withTimeout(kvDel(k), 3000); } catch (e) { }
    try { localStorage.removeItem('vitrine:' + k); } catch (e) { }
  },
  async get(k) {
    try { const v = await withTimeout(kvGet(k), 1500); if (v) return v; } catch (e) { }
    try { const s = localStorage.getItem('vitrine:' + k); return s ? JSON.parse(s) : undefined; } catch (e) { return undefined; }
  },
  async set(k, v) {
    try { await withTimeout(kvSet(k, v), 3000); return true; } catch (e) { }
    try { localStorage.setItem('vitrine:' + k, JSON.stringify(v)); return true; } catch (e) {
      if (!autosaveWarned) { autosaveWarned = true; toast('Too much image data to autosave here — use Save file'); }
      return false;
    }
  }
};

function snapshot() {
  return JSON.parse(JSON.stringify({ v: 3, name: S.name, cs: S.cs, rail: S.rail, bg: S.bg, opt: S.opt, items: S.items }));
}

/* ---------------- undo ----------------
   Every commit files the state as it was beforehand. The picture data
   is the bulk of a case, and it never changes when you move or delete
   something, so it is held once in ASSETS and the history stores only
   a key — which keeps sixty steps cheap however many photographs are
   in the case. */

const ASSETS = new Map();      // key -> data URL
const ASSET_KEY = new Map();   // data URL -> key
let assetSeq = 0;
function putAsset(url) {
  if (!url) return null;
  let k = ASSET_KEY.get(url);
  if (!k) { k = 'a' + (++assetSeq); ASSETS.set(k, url); ASSET_KEY.set(url, k); }
  return k;
}
const getAsset = k => (k ? ASSETS.get(k) || null : null);

const UNDO = [], REDO = [];
const UNDO_MAX = 60;
let lastState = null;

function undoState() {
  return JSON.stringify({
    name: S.name, cs: S.cs, rail: S.rail, level: S.level, sel: S.sel,
    bg: { ...S.bg, img: putAsset(S.bg.img) },
    items: S.items.map(i => ({ ...i, png: putAsset(i.png), raw: putAsset(i.raw), topPng: putAsset(i.topPng) }))
  });
}

/* only re-decode a bitmap whose picture actually changed */
async function syncBitmaps() {
  const live = new Set(S.items.map(i => i.id));
  for (const id of [...BMP.keys()]) if (!live.has(id)) { BMP.delete(id); BMPSRC.delete(id); }
  for (const id of [...TOP.keys()]) if (!live.has(id)) { TOP.delete(id); TOPSRC.delete(id); }
  await Promise.all(S.items.map(async i => {
    if (i.png && BMPSRC.get(i.id) !== i.png) {
      try { BMP.set(i.id, await loadImage(i.png)); BMPSRC.set(i.id, i.png); } catch (e) { }
    } else if (!i.png) { BMP.delete(i.id); BMPSRC.delete(i.id); }
    if (i.topPng && TOPSRC.get(i.id) !== i.topPng) {
      try { TOP.set(i.id, await loadImage(i.topPng)); TOPSRC.set(i.id, i.topPng); } catch (e) { }
    } else if (!i.topPng) { TOP.delete(i.id); TOPSRC.delete(i.id); }
  }));
}

async function applyState(str) {
  const d = JSON.parse(str);
  S.name = d.name; S.cs = d.cs; S.rail = d.rail; S.level = d.level ?? 'all';
  S.bg = { ...d.bg, img: getAsset(d.bg.img) };
  S.items = d.items.map(i => ({ ...i, png: getAsset(i.png), raw: getAsset(i.raw), topPng: getAsset(i.topPng) }));
  S.sel = S.items.some(i => i.id === d.sel) ? d.sel : null;
  BGIMG = null;
  if (S.bg.img) { try { BGIMG = await loadImage(S.bg.img); } catch (e) { } }
  await syncBitmaps();
  syncCaseFields(); renderLists(); renderInspector(); draw();
  scheduleSave();
}

async function undo() {
  if (!UNDO.length) { toast('Nothing left to undo'); return; }
  REDO.push(undoState());
  const s = UNDO.pop();
  await applyState(s);
  lastState = s;
  refreshUndoButtons();
  toast('Undone');
}
async function redo() {
  if (!REDO.length) { toast('Nothing to redo'); return; }
  UNDO.push(undoState());
  const s = REDO.pop();
  await applyState(s);
  lastState = s;
  refreshUndoButtons();
  toast('Redone');
}
function resetUndo() {
  UNDO.length = 0; REDO.length = 0;
  lastState = undoState();
  refreshUndoButtons();
}
function refreshUndoButtons() {
  const u = $('#btnUndoStep'), r = $('#btnRedoStep');
  if (u) { u.disabled = !UNDO.length; u.title = UNDO.length ? `Undo (${UNDO.length} step${UNDO.length > 1 ? 's' : ''})` : 'Nothing to undo'; }
  if (r) r.disabled = !REDO.length;
}

/* ============================================================
   The case library

   Each case is its own record; an index holds the names, dates and
   thumbnails so the picker can be drawn without loading every case.
   ============================================================ */

const caseKey = id => 'case:' + id;

async function loadIndex() {
  const ix = await store.get('index');
  return Array.isArray(ix) ? ix : [];
}
const saveIndex = ix => store.set('index', ix);

/* a small clean picture of the case, for the picker */
function renderThumb(w = 280) {
  const h = Math.round(w * 0.78);
  const off = newCanvas(w, h);
  const keep = { ctx, VW, VH, view: S.view, zoom: S.zoom, pan: S.pan, sel: S.sel, prev: PREVIEW };
  S.view = 'front'; S.zoom = 1; S.pan = { x: 0, y: 0 }; S.sel = null; PREVIEW = true;
  ctx = off.getContext('2d'); VW = w; VH = h;
  try { readPalette(); T = calcT(); paint(); } catch (e) { }
  ctx = keep.ctx; VW = keep.VW; VH = keep.VH;
  S.view = keep.view; S.zoom = keep.zoom; S.pan = keep.pan; S.sel = keep.sel; PREVIEW = keep.prev;
  return off.toDataURL('image/jpeg', 0.7);
}

async function persistCurrent() {
  if (!S.projectId) S.projectId = uid();
  await store.set(caseKey(S.projectId), snapshot());
  const ix = await loadIndex();
  const row = {
    id: S.projectId,
    name: S.name || 'Untitled case',
    updated: Date.now(),
    objects: S.items.filter(i => i.type === 'object').length,
    cs: { ...S.cs },
    thumb: renderThumb()
  };
  const at = ix.findIndex(r => r.id === S.projectId);
  if (at >= 0) ix[at] = row; else ix.push(row);
  await saveIndex(ix);
  await store.set('lastOpen', S.projectId);
}

async function openCase(id, quiet) {
  const data = await store.get(caseKey(id));
  if (!data) { toast('That case could not be found'); return false; }
  S.projectId = id;
  await restore(data);
  await store.set('lastOpen', id);
  if (!quiet) toast('Opened “' + S.name + '”');
  return true;
}

async function newCase() {
  await persistCurrent();          /* file the one you were on */
  S.projectId = uid();
  S.name = 'Untitled case';
  S.cs = { w: 140, h: 160, d: 40 };
  S.rail = 156;
  S.bg = { colour: '', img: null, fade: 100 };
  S.items = []; S.sel = null; S.level = 'all';
  BMP.clear(); TOP.clear(); BMPSRC.clear(); TOPSRC.clear(); BGIMG = null;
  syncCaseFields(); renderLists(); renderInspector(); fitView(); draw();
  resetUndo();
  await persistCurrent();
  toast('New case started — the last one is safe under Cases');
}

async function duplicateCase(id) {
  const data = await store.get(caseKey(id));
  if (!data) return;
  const copy = JSON.parse(JSON.stringify(data));
  copy.name = (copy.name || 'Untitled case') + ' copy';
  const nid = uid();
  await store.set(caseKey(nid), copy);
  const ix = await loadIndex();
  const src = ix.find(r => r.id === id) || {};
  ix.push({ ...src, id: nid, name: copy.name, updated: Date.now() });
  await saveIndex(ix);
  toast(`Copied as “${copy.name}”`);
}

async function deleteCase(id) {
  const ix = await loadIndex();
  const row = ix.find(r => r.id === id);
  if (!row) return;
  if (!confirm(`Delete “${row.name}” for good? This cannot be undone.`)) return;
  await store.del(caseKey(id));
  await saveIndex(ix.filter(r => r.id !== id));
  if (id === S.projectId) {
    const rest = (await loadIndex()).sort((a, b) => b.updated - a.updated);
    if (rest.length) await openCase(rest[0].id); else await newCase();
  }
  toast(`“${row.name}” deleted`);
}

async function renameCase(id, name) {
  const nm = (name || '').trim() || 'Untitled case';
  const ix = await loadIndex();
  const row = ix.find(r => r.id === id);
  if (row) { row.name = nm; row.updated = Date.now(); await saveIndex(ix); }
  const data = await store.get(caseKey(id));
  if (data) { data.name = nm; await store.set(caseKey(id), data); }
  if (id === S.projectId) { S.name = nm; renderInspector(); }
}

function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 90) return 'just now';
  const m = s / 60; if (m < 60) return `${Math.round(m)} min ago`;
  const h = m / 60; if (h < 24) return `${Math.round(h)} hr ago`;
  const d = h / 24; if (d < 7) return `${Math.round(d)} day${Math.round(d) > 1 ? 's' : ''} ago`;
  return new Date(ts).toLocaleDateString();
}

let saveT = 0;
function scheduleSave() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { persistCurrent(); }, 600);
}

function commit() {
  if (lastState !== null) {
    UNDO.push(lastState);
    if (UNDO.length > UNDO_MAX) UNDO.shift();
    REDO.length = 0;
  }
  lastState = undoState();
  refreshUndoButtons();
  renderLists(); renderInspector(); draw();
  scheduleSave();
}

/* fill in anything a file saved by an older build has not got */
function upgrade(o) {
  if (o.type !== 'object') return o;
  return Object.assign(blankObject({ id: o.id }), { render: o.png ? 'image' : 'rect' }, o, {
    stand: o.stand || { kind: 'none', w: 0, d: 0, h: 0 },
    leanFrom: o.leanFrom || 'upright',
    planShape: o.planShape || 'auto',
    spin: o.spin || 0,
    wallY: o.wallY ?? 100
  });
}

async function restore(data) {
  if (!data || !data.items) return false;
  S.name = data.name || 'Untitled case';
  S.cs = data.cs || S.cs;
  S.rail = data.rail ?? S.rail;
  S.bg = Object.assign({ colour: '', img: null, fade: 100 }, data.bg || {});
  S.opt = Object.assign({ grid: true, dims: true, snap: true, rulers: true }, data.opt || {});
  S.items = data.items.map(upgrade);
  S.sel = null;
  BMP.clear(); TOP.clear(); BMPSRC.clear(); TOPSRC.clear(); BGIMG = null;
  await syncBitmaps();
  if (S.bg.img) { try { BGIMG = await loadImage(S.bg.img); } catch (e) { } }
  syncCaseFields();
  renderLists(); renderInspector(); fitView(); draw();
  resetUndo();          /* a freshly opened case starts with clean history */
  return true;
}

/* Opened as a local file a plain link is the whole story. Published to
   claude.ai the page is sandboxed and links never download, so ask the
   host to hand the viewer the file instead. */
let saver;
async function download(blob, filename) {
  if (saver === undefined) {
    try { saver = (window.claude && claude.use) ? await claude.use('downloads') : null; }
    catch (e) { saver = null; }
  }
  if (saver) {
    try { await saver.save({ filename, data: blob }); toast('Saved'); return; }
    catch (err) {
      const code = err && err.code;
      if (code === 'declined') return;
      if (code === 'rate_limited') { toast('One save at a time — try again in a moment'); return; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Saved to your downloads');
}

/* ============================================================
   Export
   ============================================================ */

function exportPNG(scale = 2) {
  const w = cvs.clientWidth, h = cvs.clientHeight;
  const off = newCanvas(Math.round(w * scale), Math.round(h * scale));
  const oc = off.getContext('2d');
  oc.setTransform(scale, 0, 0, scale, 0, 0);
  const keepCtx = ctx, keepW = VW, keepH = VH;
  ctx = oc; VW = w; VH = h;
  readPalette();
  T = calcT();
  paint();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = C.ink3; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${S.name} — ${S.view === 'front' ? 'elevation' : 'plan'} — case ${rnd(S.cs.w)}×${rnd(S.cs.h)}×${rnd(S.cs.d)} cm`, GUT + 4, h - 8);
  ctx = keepCtx; VW = keepW; VH = keepH;
  off.toBlob(b => {
    download(b, `${S.name.replace(/[^\w -]+/g, '') || 'case'} ${S.view === 'front' ? 'elevation' : 'plan'}.png`);
  }, 'image/png');
  draw();
}

function buildSchedule() {
  const objs = S.items.filter(i => i.type === 'object');
  const rows = objs.map(o => {
    const b = bbox(o), f = footprint(o), st = standOf(o);
    return {
      Object: o.name,
      Kind: o.render === 'panel' ? 'panel' : o.render === 'image' ? 'object' : 'shape',
      'W cm': rnd(o.w, 1), 'H cm': rnd(o.h, 1), 'D cm': rnd(o.depth, 1),
      Turn: (o.spin || 0) + '°',
      Mount: o.mount === 'hanging' ? 'wire' : o.mount === 'wall' ? 'wall' : 'placed',
      Support: o.mount === 'hanging' ? `rail ${rnd(o.rail ?? S.rail)} cm` : o.mount === 'wall' ? 'back wall' : supportOf(o).name,
      Stand: st ? `${st.kind} ${rnd(st.w)}×${rnd(st.d)}×${rnd(st.h)}` : '—',
      'X cm': rnd(b.x0, 1),
      'Base cm': rnd(b.y0, 1),
      'Top cm': rnd(b.y1, 1),
      'Z cm': rnd(f.z, 1),
      'Deck cm': rnd(f.d, 1),
      Lean: o.mount === 'placed' ? leanLabel(o) || '0°' : '—',
      Wires: o.mount === 'hanging' ? o.wires.map(w => rnd(w.len, 1)).join(' / ') : '—'
    };
  });
  const cols = rows.length ? Object.keys(rows[0]) : [];
  $('#schedTable').innerHTML = rows.length
    ? `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
       <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '<tbody><tr><td style="padding:20px;color:var(--ink-3)">No objects in the case yet.</td></tr></tbody>';
  $('#schedTable').dataset.tsv = [cols.join('\t')].concat(rows.map(r => cols.map(c => r[c]).join('\t'))).join('\n');
}

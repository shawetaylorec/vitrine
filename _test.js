/* headless smoke test — appended to a throwaway copy of the app */
(async function () {
  const log = m => console.log('[TEST] ' + m);
  const ok = (c, m) => console.log((c ? '[PASS] ' : '[FAIL] ') + m);

  /* a studio-ish shot: soft backdrop, an object, optional pierced holes */
  function photo(w, h, o) {
    const c = newCanvas(w, h), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.bg0 || '#f4f2ee'); g.addColorStop(1, o.bg1 || '#e9e7e2');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = o.col;
    if (o.kind === 'ellipse') { x.beginPath(); x.ellipse(w / 2, h / 2, w * 0.3, h * 0.36, 0, 0, 7); x.fill(); }
    else { x.fillRect(w * 0.22, h * 0.18, w * 0.56, h * 0.64); }
    if (o.holes) {           /* openwork: the backdrop shows through the middle */
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = o.bg0;
      for (const [fx, fy] of [[.4, .38], [.6, .38], [.5, .58]]) {
        x.beginPath(); x.arc(w * fx, h * fy, w * .07, 0, 7); x.fill();
      }
    }
    x.fillStyle = 'rgba(255,255,255,.5)';
    x.fillRect(w * 0.3, h * 0.42, w * 0.4, 6);
    return c;
  }

  function stage(cv, name, mode) {
    W.mode = 'object'; W.editId = null; W.topFor = null;
    W.raw = cv; W.base = cv; W.work = copyCanvas(cv);
    W.undo = []; W.calib = null; W.points = []; W.bb = null; W.crop = null;
    W.name = name; W.bgColour = null; W.cutMode = mode || 'edges';
    W.keepAspect = true; W.scaleMode = 'width';
    W.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    W.planShape = 'auto'; W.leanFrom = 'upright'; W.lean = 0; W.spin = 0;
    runAuto();
    W.bb = contentBBox(W.work);
  }

  await new Promise(r => setTimeout(r, 300));

  S.name = 'Kepler case';
  S.cs = { w: 140, h: 160, d: 40 };
  S.rail = 156;
  syncCaseFields();

  /* --- 1. cut out, size by width --- */
  stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
  const bb1 = W.bb;
  ok(bb1.w > 300 && bb1.w < 420, `cut-out trimmed to content: ${bb1.w}x${bb1.h} px of 620x800`);
  W.widthCm = 34; W.depthCm = 4;
  W.mount = 'placed'; W.support = 'floor';
  W.leanFrom = 'flat'; W.lean = 90 - 15;          /* 15 degrees up from flat */
  W.stand = { kind: 'cradle', w: 30, d: 26, h: 6 };
  finishWizard();
  const man = S.items.find(i => i.name === 'Manuscript');
  ok(Math.abs(man.lean - 75) < .01, `lean stored from upright (${man.lean}°) while typed as 15° from flat`);
  ok(Math.abs(shownLean(man) - 15) < .01, 'and reads back as 15° from flat');
  ok(planMode(man) === 'image', 'a near-flat manuscript shows its picture in plan');
  ok(standOf(man) && standLift(man) === 0, 'a book cradle adds no lift — the block sits in the valley');

  /* --- 2. structure, and children travelling with it --- */
  addShelf();
  const shelf = S.items.find(i => i.type === 'shelf');
  shelf.y = 92; shelf.name = 'Upper shelf';
  addPlinth();
  const plinth = S.items.find(i => i.type === 'plinth');
  Object.assign(plinth, { x: 96, w: 32, d: 24, h: 46, z: 8, name: 'Plinth A' });

  /* --- 3. an object dropped straight onto the plinth --- */
  stage(photo(500, 520, { kind: 'rect', col: '#4a5b6b' }), 'Astrolabe');
  W.widthCm = 18; W.depthCm = 6;
  W.mount = 'placed'; W.support = plinth.id;
  W.stand = { kind: 'stand', w: 12, d: 14, h: 5 };
  finishWizard();
  const astro = S.items.find(i => i.name === 'Astrolabe');
  ok(Math.abs(bbox(astro).y0 - (46 + 5)) < 0.01, `lands on the plinth plus its stand (base ${rnd(bbox(astro).y0)} cm)`);
  const cx = astro.x + astro.w / 2, px = plinth.x + plinth.w / 2;
  ok(Math.abs(cx - px) < 0.6, `and is centred on the plinth (${rnd(cx)} vs ${rnd(px)})`);
  const sb = standBox(astro);
  ok(sb && Math.abs((sb.x + sb.w / 2) - cx) < 0.01, 'the stand is centred under the object');
  ok(envelope(astro).d >= sb.d - 0.01, `the envelope makes room for the deeper stand (${rnd(envelope(astro).d)} cm)`);

  /* --- 4. moving a plinth carries its objects --- */
  const before = astro.x;
  plinth.x += 10;
  for (const k of childrenOf(plinth.id)) k.x = rnd(k.x + 10, 2);
  ok(Math.abs(astro.x - (before + 10)) < 0.01, 'objects move with the plinth they stand on');
  plinth.x -= 10; for (const k of childrenOf(plinth.id)) k.x = rnd(k.x - 10, 2);

  /* --- 5. openwork on a dark backdrop --- */
  const rete = photo(600, 600, { kind: 'ellipse', col: '#b08d3a', bg0: '#0a0a0a', bg1: '#0a0a0a', holes: true });
  stage(rete, 'Rete', 'edges');
  const edgesKept = contentBBox(W.work);
  const edgesAlpha = countOpaque(W.work);
  stage(rete, 'Rete', 'all');
  const allAlpha = countOpaque(W.work);
  ok(allAlpha < edgesAlpha * 0.95, `"Everywhere" clears the interior too — ${allAlpha} opaque px vs ${edgesAlpha} from the edges alone`);
  W.widthCm = 22; W.depthCm = 1.5;
  W.mount = 'hanging';
  W.points = [{ x: W.bb.x + W.bb.w * 0.2, y: W.bb.y + W.bb.h * 0.05 }, { x: W.bb.x + W.bb.w * 0.8, y: W.bb.y + W.bb.h * 0.05 }];
  finishWizard();
  const hung = S.items.find(i => i.name === 'Rete');
  hung.wires[0].len = 26; hung.wires[1].len = 34;
  const tilt = -layout(hung).rot / DEG;
  ok(tilt > 12 && tilt < 32, `unequal wires tilt it ${rnd(tilt)}°`);
  const att = attachWorld(hung, hung.wires[0]);
  ok(Math.abs(att.y - (hung.rail - 26)) < 0.01, `wire 1 lands ${rnd(hung.rail - att.y)} cm below the rail`);

  function countOpaque(cv) {
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
    return n;
  }

  /* --- 6. turning an object --- */
  const w0 = bbox(astro).x1 - bbox(astro).x0, h0 = bbox(astro).y1 - bbox(astro).y0;
  astro.spin = 90;
  const w1 = bbox(astro).x1 - bbox(astro).x0, h1 = bbox(astro).y1 - bbox(astro).y0;
  ok(Math.abs(w1 - h0) < 0.05 && Math.abs(h1 - w0) < 0.05, `turning 90° swaps what it occupies: ${rnd(w0)}×${rnd(h0)} → ${rnd(w1)}×${rnd(h1)}`);
  ok(Math.abs(bbox(astro).y0 - (46 + 5)) < 0.05, 'and it still rests on its support');
  astro.spin = 0;

  /* --- 7. the shape picker --- */
  ok(SHAPES.length >= 12, `the picker offers ${SHAPES.length} shapes`);
  openShapePicker('new');
  ok($('#shapeBack').hidden === false && $$('#shapeGrid .shapecell').length === SHAPES.length,
    'the picker opens with a thumbnail for every shape');
  ok($('#shapeGrid canvas').width === 76, 'each one is drawn by the same routine that draws it in the case');
  choseShape('cylinder');
  const shape = S.items.find(i => i.render === 'cylinder');
  ok($('#shapeBack').hidden === true && shape, 'choosing one closes the picker and adds it');
  ok(shape.w === 14 && shape.h === 24 && shape.depth === 14, `it arrives at a sensible size (${shape.w}×${shape.h}×${shape.depth})`);
  ok(planMode(shape) === 'ellipse', 'a cylinder reads as a circle from above');
  select(shape.id);
  const wasAt = shape.x;
  shapePickMode = 'change';
  choseShape('sphere');
  ok(byId(shape.id).render === 'sphere' && byId(shape.id).x === wasAt,
    'and can be changed afterwards without losing its place');
  shape.render = 'cylinder';

  /* --- 7b. panels and their text --- */
  addPanel();
  const panel = S.items.find(i => i.render === 'panel');
  panel.wallY = 110; panel.x = 20;
  ok(panel.mount === 'wall' && Math.abs(bbox(panel).y0 - 110) < 0.01, 'a panel fixes flat to the wall at the height you give it');
  T = calcT();
  panel.w = 30; panel.h = 20; panel.textSize = 0.55;
  panel.text = new Array(90).fill('Rudolphine').join(' ');
  ok(panelFits(panel), 'ninety words fit a 30 by 20 cm panel at 16 pt');
  panel.w = 20; panel.h = 6;
  ok(!panelFits(panel), 'the same words on a 20 by 6 cm panel are reported as overflowing');
  panel.textSize = 0.3;
  ok(panelFits(panel), `and setting the type to ${ptOf(0.3)} pt brings them back inside`);
  panel.w = 30; panel.h = 20; panel.textSize = 0.55;
  panel.text = 'Line one.\nLine two.';
  ctx.font = `${panel.textSize * T.sc}px ${UIFONT}`;
  ok(layoutText(panel.text, 9999).length === 2, 'typed line breaks are kept, not collapsed');
  ok(ptOf(0.55) === 16, '0.55 cm reads as 16 pt');

  /* --- 8. out-of-case detection --- */
  const n0 = outOfCase(astro).length;
  astro.x = 132;
  ok(outOfCase(astro).length > n0, 'flags an object pushed past the case side: ' + outOfCase(astro).join('; '));
  astro.x = rnd(plinth.x + (plinth.w - astro.w) / 2);

  /* --- 9. back wall colour --- */
  S.bg.colour = '#402a18';
  ok(caseGround() === '#402a18', 'the back wall takes the colour you set');

  /* --- 10. round trip, including everything new --- */
  const snap = JSON.stringify(snapshot());
  await restore(JSON.parse(snap));
  ok(S.items.length === 7, 'round trip keeps all 7 items, got ' + S.items.length);
  ok(JSON.stringify(snapshot()) === snap, 'round trip is byte-identical');
  ok(BMP.size === 3, 'all 3 bitmaps reloaded, got ' + BMP.size);
  const man2 = S.items.find(i => i.name === 'Manuscript');
  ok(man2.stand.kind === 'cradle' && man2.leanFrom === 'flat', 'cradle and lean reference survive the round trip');

  /* --- 11. an old file with none of the new fields --- */
  await restore({
    v: 1, name: 'Old', cs: { w: 100, h: 100, d: 30 }, rail: 90,
    items: [{ id: 'x1', type: 'object', name: 'Legacy', png: null, w: 10, h: 10, depth: 2, x: 5, z: 5, mount: 'placed', support: 'floor', lean: 0, wires: [] }]
  });
  const legacy = byId('x1');
  ok(legacy.stand && legacy.leanFrom === 'upright' && legacy.spin === 0, 'a file from the old build opens with sensible defaults');
  await restore(JSON.parse(snap));

  /* --- 12. PNG export --- */
  const realDownload = download;
  let exported = null;
  download = (blob, name) => { exported = { size: blob.size, name }; };
  exportPNG(2);
  await new Promise(r => setTimeout(r, 800));
  download = realDownload;
  ok(exported && exported.size > 20000, `PNG export produced ${exported ? exported.size : 0} bytes`);

  buildSchedule();
  ok(($('#schedTable').dataset.tsv || '').split('\n').length === 6, 'schedule lists 5 objects + header');

  if (location.hash === '#dark') document.documentElement.setAttribute('data-theme', 'dark');

  /* tidy the scene up for the README screenshots */
  if (location.hash.startsWith('#shot')) {
    S.name = 'Kepler case';
    S.bg.colour = '#3b2a1c';
    byId(S.items.find(i => isShape(i)).id).hide = true;
    const m = S.items.find(i => i.name === 'Manuscript');
    m.x = 16; m.z = 2; m.stand.w = 36; m.stand.d = 30;
    const a = S.items.find(i => i.name === 'Astrolabe');
    a.z = 10;
    const r = S.items.find(i => i.name === 'Rete');
    r.x = 62; r.wires[0].len = 24; r.wires[1].len = 24;
    const p = S.items.find(i => i.render === 'panel');
    p.x = 8; p.wallY = 122; p.w = 34; p.h = 20;
    p.text = 'Instruments of the Rudolphine Tables, Prague, 1601–1627.';
    renderLists();
  }

  S.level = 'all';
  setView((location.hash === '#plan' || location.hash === '#shotplan') ? 'plan' : 'front');
  select(location.hash.startsWith('#shot') ? null : (location.hash === '#plan' ? S.items.find(i => i.name === 'Manuscript').id : S.items.find(i => i.name === 'Astrolabe').id));
  if (location.hash === '#wiz') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'placed'; W.tool = 'erase';
    showWizard('Add object'); setStep(1);
  }
  if (location.hash === '#wiz3') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'hanging'; W.points = [{ x: 200, y: 150 }, { x: 420, y: 150 }];
    showWizard('Add object'); setStep(3);
    ok(getComputedStyle(wizCv).cursor === 'crosshair', 'the wire step always shows a cursor, whatever brush was last used');
  }
  if (location.hash === '#sched') { buildSchedule(); $('#schedBack').hidden = false; }
  if (location.hash === '#shapes') { render(); openShapePicker('new'); }
  render();
  log('done');
})();

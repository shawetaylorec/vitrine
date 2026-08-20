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
    W.undo = []; W.calib = null; W.points = []; autoBB();
    W.name = name; W.bgColour = null; W.cutMode = mode || 'edges';
    W.keepAspect = true; W.scaleMode = 'width';
    W.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    W.planShape = 'auto'; W.leanFrom = 'upright'; W.lean = 0; W.spin = 0;
    runAuto();
    autoBB(); theBB();
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
  /* --- 1b. the measurement box is yours to adjust --- */
  {
    W.step = 2;
    W.widthCm = 34; W.keepAspect = true; W.scaleMode = 'width';
    const auto = { ...theBB() };
    const perCm = scaleFactors().kx;
    /* pull the left edge in 20 px, as if a speck out there had been
       caught by the automatic box */
    W.bbDrag = { part: 'w', px: 0, py: 0, box: { x0: auto.x, y0: auto.y, x1: auto.x + auto.w, y1: auto.y + auto.h } };
    bbDragTo({ x: 20, y: 0 });
    W.bbDrag = null;
    ok(W.bbManual && theBB().x === auto.x + 20 && theBB().w === auto.w - 20,
      `dragging the west edge moves only that edge: ${auto.w} → ${theBB().w} px`);
    ok(theBB().y === auto.y && theBB().h === auto.h, 'and leaves the other three alone');
    ok(scaleFactors().kx > perCm, 'a narrower box means more cm per pixel, so the scale follows it');
    /* moving the whole box keeps its size */
    W.bbDrag = { part: 'move', px: 0, py: 0, box: { x0: theBB().x, y0: theBB().y, x1: theBB().x + theBB().w, y1: theBB().y + theBB().h } };
    const wWas = theBB().w, hWas = theBB().h;
    bbDragTo({ x: 5, y: 7 });
    W.bbDrag = null;
    ok(theBB().w === wWas && theBB().h === hWas, 'dragging inside it moves the box without resizing it');
    /* and it survives a trip to another step */
    setStep(1); setStep(2);
    ok(W.bbManual && theBB().w === wWas, 'a box you set by hand is not silently recomputed');
    /* cropping to it trims the picture to exactly that box */
    const want = { ...theBB() };
    cropToBox();
    ok(W.work.width === want.w && W.work.height === want.h,
      `"Crop to the box" trims the picture to ${W.work.width}×${W.work.height} px`);
    ok(!W.bbManual, 'and the box goes back to following the new cut-out');
    /* start clean for the rest of the run */
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
  }

  W.widthCm = 34; W.depthCm = 4;
  W.mount = 'placed'; W.support = 'floor';
  /* the wizard names its datum rather than borrowing a view's: always
     degrees from upright, which is also how it is stored */
  W.leanFrom = 'flat'; W.lean = 75;               /* 15 degrees up from flat */
  W.stand = { kind: 'cradle', w: 30, d: 26, h: 6 };
  finishWizard();
  const man = S.items.find(i => i.name === 'Manuscript');
  ok(Math.abs(man.lean - 75) < .01, `lean stored from upright (${man.lean}°)`);

  /* --- 1b. the angle is stated by the view, not by a chosen datum --- */
  {
    const keepView = S.view;
    S.view = 'front';
    ok(Math.abs(shownLean(man) - 75) < .01, 'in elevation the angle reads from upright (75°)');
    ok(leanLabel(man) === '75°', 'and the label is the bare angle, with no "from flat" wording');
    ok(leanDatum() === 'upright', 'elevation names its datum as upright');
    ok(Math.abs(storedLean(75) - 75) < .01, 'and what you type in elevation is stored as it stands');
    S.view = 'plan';
    ok(Math.abs(shownLean(man) - 15) < .01, 'looking down the same lean reads from flat (15°)');
    ok(leanLabel(man) === '15°', 'the plan tag is the bare angle too');
    ok(leanDatum() === 'flat', 'plan names its datum as flat');
    ok(Math.abs(storedLean(15) - 75) < .01, 'and 15 typed in plan comes back as 75 from upright');
    /* leanFrom is carried for older files but no longer decides anything */
    const wasFrom = man.leanFrom;
    man.leanFrom = 'upright';
    ok(Math.abs(shownLean(man) - 15) < .01, 'leanFrom no longer changes what is shown');
    man.leanFrom = wasFrom;
    S.view = 'front';
    const upright = { ...man, lean: 10 };
    ok(Math.abs(shownLean(upright) - 10) < .01, '10° off upright shows as 10 in elevation');
    S.view = 'plan';
    ok(Math.abs(shownLean(upright) - 80) < .01, 'and as 80 in plan — the owner\'s worked example');

    /* the wizard has no view to take a datum from, so it names one */
    W.lean = 62; syncLeanFields();
    ok(!$('#leanFrom'), 'the wizard no longer asks you to choose a datum');
    ok(+$('#leanNum').value === 62 && +$('#lean').value === 62,
      'it states the lean from upright, whatever view the case happens to be in');
    ok(/from standing upright/.test($('#leanHelp').textContent) &&
      /follows the view/.test($('#leanHelp').textContent),
      'and says so, along with what happens once the object is in the case');
    S.view = keepView;
  }
  ok(planMode(man) === 'image', 'a near-flat manuscript shows its picture in plan');
  ok(standOf(man) && standLift(man) === 6 && Math.abs(bbox(man).y0 - 6) < 0.01,
    'a book cradle is a base under the book, raising it by the base height');

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

  /* --- 3b. what actually rests on the plinth is what has to fit --- */
  {
    const keep = { w: astro.w, x: astro.x, stand: astro.stand, baseW: astro.baseW, baseD: astro.baseD };
    astro.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    astro.w = rnd(plinth.w + 8, 2);                 /* wider than the plinth */
    astro.x = rnd(plinth.x + (plinth.w - astro.w) / 2, 2);
    ok(outOfCase(astro).some(m => /overhanging/.test(m)),
      'a wide object with no base given is reported as overhanging its plinth');
    astro.baseW = 6; astro.baseD = 6;               /* but it stands on a small foot */
    ok(!outOfCase(astro).some(m => /overhanging|deeper than/.test(m)),
      'give it a narrow foot that fits and the complaint goes away');
    const bp = basePatch(astro);
    ok(Math.abs((bp.x + bp.w / 2) - (bbox(astro).x0 + bbox(astro).x1) / 2) < 0.01,
      'the foot is centred under the object');
    astro.baseW = rnd(plinth.w + 4, 2);
    ok(outOfCase(astro).some(m => /overhanging/.test(m)),
      'and a foot that really is too wide is still reported');
    /* a stand is what touches down, so it governs instead */
    astro.baseW = 0; astro.baseD = 0;
    astro.stand = { kind: 'stand', w: 10, d: 10, h: 5 };
    ok(!outOfCase(astro).some(m => /overhanging/.test(m)),
      'a stand well inside the plinth stops the object above it being called an overhang');
    ok(contactPatch(astro).w === 10, 'because the stand is what meets the surface');
    Object.assign(astro, keep);
    ok(contactPatch(astro) && basePatch(astro) === null,
      'with nothing set, the whole footprint counts — the safe assumption');
  }

  /* --- 3c. the foot can be given on the mounting page too --- */
  {
    stage(photo(400, 700, { kind: 'rect', col: '#7a6a4a' }), 'Ewer');
    W.widthCm = 20; W.depthCm = 20;
    W.mount = 'placed'; W.support = plinth.id;
    W.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    W.baseW = 7; W.baseD = 7;
    setStep(3);
    ok($('#wizBaseW').value === '7', 'the foot fields show on the mounting page, with the support');
    finishWizard();
    const ewer = S.items.find(i => i.name === 'Ewer');
    ok(ewer.baseW === 7 && ewer.baseD === 7, 'and what you typed there reaches the object');
    ok(basePatch(ewer) && basePatch(ewer).w === 7, 'so it is the foot that counts');
    /* and it comes back when you reopen the object */
    W.baseW = 0; W.baseD = 0;
    await openWizard({ edit: ewer.id, step: 3 });
    ok(W.baseW === 7, 'reopening the object brings the foot back with it');
    W.open = false; W.live = false; W.editId = null;
    $('#wizBack').hidden = true;
    removeItem(ewer.id);
  }

  /* --- 3d. panning while a brush is in hand --- */
  {
    stage(photo(400, 400, { kind: 'rect', col: '#555' }), 'Probe');
    W.step = 1; W.tool = 'erase'; W.open = true;
    setWizCursor();
    ok(wizCv.style.cursor === 'none', 'the erase brush hides the pointer, as it should');
    setPanKey(true);
    ok(wizCv.style.cursor === 'grab',
      'but holding Shift or space turns it to a hand, so the pan is findable');
    setPanKey(false);
    ok(wizCv.style.cursor === 'none', 'and letting go gives the brush back');
    ok(/Shift/.test(TOOLHELP.erase), 'and the hint says so in words');
    W.open = false;
  }

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
  hung.hangY = 100;
  ok(Math.abs(layout(hung).pivot.y - 100) < 0.01, 'a hung object sits where it is put, not where the wires say');
  const lenLevel = hung.wires.map(w => rnd(wireLen(hung, w), 2));
  ok(Math.abs(lenLevel[0] - lenLevel[1]) < 0.01, `hanging level, both wires come out the same — ${lenLevel[0]} cm`);
  /* the inversion: turn the object and the wires follow it, and the
     object itself must not budge */
  const beforeX = layout(hung).pivot.x, beforeY = layout(hung).pivot.y;
  hung.spin = 15;
  ok(layout(hung).pivot.x === beforeX && layout(hung).pivot.y === beforeY,
    'turning it does not move it off its position');
  const lenTilt = hung.wires.map(w => wireLen(hung, w));
  ok(Math.abs(lenTilt[0] - lenTilt[1]) > 3, `tilted 15°, the two wires differ by ${rnd(Math.abs(lenTilt[0] - lenTilt[1]), 1)} cm`);
  for (const w of hung.wires) {
    const att = attachWorld(hung, w);
    ok(Math.abs((hung.rail - att.y) - wireLen(hung, w)) < 0.01, `wire drops plumb ${rnd(wireLen(hung, w), 1)} cm to its attachment`);
  }
  /* moving it up shortens both wires by the same amount */
  const up = hung.wires.map(w => wireLen(hung, w));
  hung.hangY = 110;
  const now = hung.wires.map(w => wireLen(hung, w));
  ok(Math.abs((up[0] - now[0]) - 10) < 0.01 && Math.abs((up[1] - now[1]) - 10) < 0.01,
    'raising it 10 cm takes 10 cm off every wire');
  hung.spin = 0; hung.hangY = 100;

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

  /* --- 6b. yaw: turning it in plan changes what elevation shows --- */
  {
    const wideBefore = bbox(astro).x1 - bbox(astro).x0;
    const deepBefore = footprint(astro).d;
    astro.yaw = 90;
    const wideAfter = bbox(astro).x1 - bbox(astro).x0;
    const deepAfter = footprint(astro).d;
    ok(Math.abs(wideAfter - deepBefore) < 0.05,
      `turned side on, elevation shows its depth: ${rnd(deepBefore)} → ${rnd(wideAfter)} cm wide`);
    ok(Math.abs(deepAfter - wideBefore) < 0.05,
      `and the footprint takes its width: ${rnd(wideBefore)} → ${rnd(deepAfter)} cm deep`);
    astro.yaw = 45;
    const mid = bbox(astro).x1 - bbox(astro).x0;
    ok(mid < wideBefore && mid > wideAfter, `half-turned it reads between the two — ${rnd(mid)} cm`);
    ok(Math.abs(bbox(astro).y0 - (46 + 5)) < 0.05, 'turning in plan never lifts it off its support');
    /* mirroring lean: the same sum in the other plane */
    ok(Math.abs(yawParts(astro).width - (astro.w * Math.cos(45 * DEG) + astro.depth * Math.cos(45 * DEG))) < 0.05,
      'the projection is w·cos + depth·sin, the mirror of the lean');
    astro.yaw = 0;
  }

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

  /* adding a panel with a plinth selected puts it on that plinth */
  select(plinth.id);
  addPanel();
  const onPlinthPanel = S.items[S.items.length - 1];
  ok(onPlinthPanel.face === plinth.id,
    'adding a panel with a plinth selected fixes it to that plinth');
  ok(onPlinthPanel.w <= plinth.w && onPlinthPanel.h <= plinth.h,
    `sized to fit the ${plinth.w} by ${plinth.h} cm face at ${onPlinthPanel.w} by ${onPlinthPanel.h}`);
  removeItem(onPlinthPanel.id);
  select(null);
  addPanel();
  const wallDefault = S.items[S.items.length - 1];
  ok(wallDefault.face === 'back', 'and with nothing selected it goes on the back wall as before');
  removeItem(wallDefault.id);
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

  /* auto-fit and titles */
  panel.w = 30; panel.h = 20;
  panel.text = new Array(90).fill('Rudolphine').join(' ');
  panel.textSize = 0.2;
  const fitted = bestTextSize(panel);
  panel.textSize = fitted;
  ok(panelFits(panel), `auto-fit picks ${rnd(fitted, 2)} cm, which fits`);
  panel.textSize = rnd(fitted + 0.03, 2);
  ok(!panelFits(panel), 'and a shade larger does not — so it really is the largest that goes in');
  panel.textSize = fitted;
  panel.text = '**Rudolphine Tables**\nPrague, 1627.';
  const tl = layoutText(panel.text, 9999, 12);
  ok(tl.length === 2 && tl[0].bold && !tl[1].bold, 'a line wrapped in ** is a title, the rest is not');
  ok(tl[0].text === 'Rudolphine Tables', 'and the markers themselves are not drawn');
  panel.text = 'Line one.\nLine two.'; panel.textSize = 0.55;
  ok(ptOf(0.55) === 16, '0.55 cm reads as 16 pt');

  /* --- 7c. a panel fixes to the FRONT FACE of a plinth --- */
  panel.w = 14; panel.h = 9; panel.depth = 0.4;
  setMount(panel, 'wall');
  panel.face = plinth.id;
  landOnFace(panel);
  ok(faceOf(panel) && faceOf(panel).id === plinth.id, 'a panel can be fixed to the front of a plinth');
  const pl = layout(panel);
  ok(Math.abs(pl.h - 9) < 0.01, `it faces you in elevation at its full ${rnd(pl.h)} cm height`);
  const pf = footprint(panel);
  ok(Math.abs(pf.d - 0.4) < 0.01, `and from above is only its own ${rnd(pf.d, 2)} cm thickness — barely a line`);
  ok(Math.abs(pf.z - (plinth.z + plinth.d)) < 0.01,
    `sitting on the plinth's front face at z ${rnd(pf.z)}, not on its top`);
  ok(panel.wallY >= 0 && panel.wallY + panel.h <= plinth.h + 0.01,
    `positioned ${rnd(panel.wallY)} cm up a ${plinth.h} cm plinth face`);
  const pb = bbox(panel);
  ok(pb.x0 >= plinth.x - 0.01 && pb.x1 <= plinth.x + plinth.w + 0.01, 'and centred across that face');
  ok(planMode(panel) === 'rect', 'in plan it is just that sliver, not a card face');
  ok(levelKey(panel) === plinth.id, 'and the level filter groups it with its plinth');

  /* an upright object is unchanged by the projection maths */
  const upright = { ...astro, lean: 0 };
  ok(Math.abs(leanParts(upright).height - astro.h) < 0.01 && Math.abs(leanParts(upright).deck - astro.depth) < 0.01,
    'an upright object still projects to exactly its own height and depth');

  /* the plinth carries whatever is stuck to it */
  const panelWasAt = panel.x, plinthWasAt = plinth.x;
  ok(childrenOf(plinth.id).some(k => k.id === panel.id), 'the plinth counts the fixed panel among its passengers');
  for (const k of childrenOf(plinth.id)) k.x = rnd(k.x + 12, 2);
  plinth.x += 12;
  ok(Math.abs(panel.x - (panelWasAt + 12)) < 0.01, 'so moving the plinth takes the panel with it');
  ok(Math.abs(footprint(panel).z - (plinth.z + plinth.d)) < 0.01, 'and it stays on the face wherever the plinth goes');
  plinth.x = plinthWasAt;
  for (const k of childrenOf(plinth.id)) k.x = rnd(k.x - 12, 2);

  /* objects genuinely placed on a plinth still behave */
  ok(supportAfterDrag(astro, plinth.id, 0) === plinth.id,
    'sliding a placed object sideways does not drop it to the floor');
  ok(supportAfterDrag(astro, plinth.id, 0.8) === plinth.id, 'nor does a small vertical wobble');
  ok(supportAfterDrag(astro, plinth.id, -40) === 'floor', 'but a proper downward drag does');
  ok(supportAfterDrag(astro, 'floor', 44) === plinth.id, 'and dragging up lifts it back onto the plinth');
  ok(stepSupport(astro, -1) === 'floor', 'down steps to the next surface below — the floor');
  ok(stepSupport(astro, 1) === shelf.id, 'up steps to the next surface above — the shelf');
  const onShelf = { ...astro, support: shelf.id };
  ok(stepSupport(onShelf, 1) === shelf.id, 'and stops at the top rather than wrapping round');

  /* --- 7c4. a panel is glued to its face: it drags the plinth, and is
     placed on the face by typing --- */
  {
    const press = id => { const el = $('#' + id); if (!el || el.disabled) return false; el.click(); return true; };
    const type = (id, v) => {
      const el = $('#' + id);
      if (!el || el.disabled) return false;
      el.value = String(v); el.dispatchEvent(new Event('change'));
      return true;
    };
    S.view = 'front'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();

    /* fit it to the face — the whole front, less the margin all round */
    select(panel.id); renderInspector();
    ok(press('iFaceFit'), 'a panel on a plinth face is offered a fit-the-face button');
    ok(Math.abs(panel.w - (plinth.w - FACE_MARGIN * 2)) < 0.02 &&
      Math.abs(panel.h - (plinth.h - FACE_MARGIN * 2)) < 0.02,
      `and it takes the face less ${FACE_MARGIN} cm each side (${rnd(panel.w, 2)} × ${rnd(panel.h, 2)} cm)`);
    const fb = bbox(panel);
    ok(Math.abs((fb.x0 - plinth.x) - FACE_MARGIN) < 0.02 &&
      Math.abs((plinth.x + plinth.w - fb.x1) - FACE_MARGIN) < 0.02 &&
      Math.abs(fb.y0 - FACE_MARGIN) < 0.02 &&
      Math.abs((plinth.h - fb.y1) - FACE_MARGIN) < 0.02,
      'with an even margin on all four sides');
    ok(!outOfCase(panel).some(m => /wider than|above the top/.test(m)),
      'a fitted panel does not report itself as off its own face');

    /* now it covers the plinth, which is the fault that started this */
    const cen = w2s(plinth.x + plinth.w / 2, plinth.h / 2);
    ok(hitTest(cen.x, cen.y).id === panel.id,
      'a fitted panel does take every click on the plinth front');

    /* so dragging it drags the plinth, and everything else riding on it.
       Snapping is off for this, both to make the arithmetic exact and
       because that is the case worth checking: with Snap off a drag is
       free rather than rounded to the nearest centimetre. */
    const rider = S.items.find(i => i.type === 'object' && i.mount === 'placed' && i.support === plinth.id);
    const rect = cvs.getBoundingClientRect();
    cvs.setPointerCapture = () => { };        /* headless has no real pointer */
    const wasSnap = S.opt.snap;
    /* Two moves, not one: the first only arms the drag, and the grab
       point is deliberately re-read there so the item does not jump by
       the slop. The travel that counts is measured from the second. */
    const dragBy = (dxCm) => {
      const arm = DRAG_SLOP + 2;
      cvs.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: rect.left + cen.x, clientY: rect.top + cen.y, bubbles: true, pointerId: 1, button: 0
      }));
      const armed = drag && drag.id;
      for (const px of [arm, arm + dxCm * T.sc]) {
        cvs.dispatchEvent(new PointerEvent('pointermove', {
          clientX: rect.left + cen.x + px, clientY: rect.top + cen.y, bubbles: true, pointerId: 1
        }));
      }
      cvs.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      return armed;
    };

    S.opt.snap = false;
    const p0 = plinth.x, n0 = panel.x, r0 = rider ? rider.x : 0;
    const armedOn = dragBy(6.37);
    ok(armedOn === plinth.id, 'pressing on the panel arms a drag of the plinth, not of the panel');
    ok(S.sel === panel.id, 'while the selection stays on what was actually clicked');
    ok(Math.abs(plinth.x - (p0 + 6.37)) < 0.06, `and the plinth actually moves (${rnd(plinth.x - p0, 2)} cm)`);
    ok(Math.abs((panel.x - n0) - (plinth.x - p0)) < 0.02, 'the panel travelling with it, unchanged on its face');
    if (rider) ok(Math.abs((rider.x - r0) - (plinth.x - p0)) < 0.02, 'as does whatever is standing on top');
    ok(rnd(plinth.x, 2) !== rnd(plinth.x, 0), 'with Snap off the drag is free, not rounded to the centimetre');

    /* Snap on and the same travel no longer arrives untouched — it is
       either rounded to the centimetre or pulled onto an alignment
       line, which is the whole of what Snap does. */
    S.opt.snap = true;
    const p1 = rnd(plinth.x, 2);
    dragBy(4.37);
    ok(Math.abs((plinth.x - p1) - 4.37) > 0.02,
      `with Snap on the drag is taken in hand rather than landing where the pointer did (${rnd(plinth.x - p1, 2)} cm, not 4.37)`);
    /* and the grid has nothing to do with it — it only draws squares */
    S.opt.snap = false; S.opt.grid = true;
    const p2 = rnd(plinth.x, 2);
    dragBy(3.21);
    ok(Math.abs((plinth.x - p2) - 3.21) < 0.06,
      'the grid being on does not round a drag — Grid is drawn, Snap is what moves things');
    S.opt.snap = wasSnap;

    /* Placing it on the face is typed, in the plinth's own frame, and
       the four are margins rather than a position: each moves its own
       edge and leaves the other three alone. */
    const marg = () => {
      const f = faceOf(panel), b = bbox(panel);
      return {
        L: b.x0 - f.x, R: (f.x + f.w) - b.x1,
        B: bbox(panel).y0, T: f.top - b.y1
      };
    };
    renderInspector();
    ok(type('iFaceL', 3), 'the face clearances are typeable');
    ok(Math.abs(marg().L - 3) < 0.05,
      `3 cm from the plinth's left puts it there (${rnd(marg().L, 2)} cm)`);
    renderInspector(); type('iFaceT', 2);
    ok(Math.abs(marg().T - 2) < 0.05,
      `and 2 cm from its top likewise (${rnd(marg().T, 2)} cm)`);

    /* the fault this replaced: with the board filling the face, setting
       one margin shoved the opposite one negative, because left, width
       and right cannot all be free at a fixed size. Moving the edge
       instead makes them genuinely independent. */
    renderInspector(); press('iFaceFit');
    const wide = rnd(panel.w, 2);
    renderInspector(); type('iFaceR', 3);
    ok(Math.abs(marg().R - 3) < 0.05, 'on a board fitted to the face, the right margin takes the value typed');
    ok(Math.abs(marg().L - FACE_MARGIN) < 0.05,
      `and the left margin stays where it was rather than going negative (${rnd(marg().L, 2)} cm)`);
    ok(rnd(panel.w, 2) < wide, `the board narrowed to suit (${wide} → ${rnd(panel.w, 2)} cm) rather than sliding`);

    /* all four at once, each holding the number it was given */
    for (const [id, want] of [['iFaceL', 2], ['iFaceR', 3], ['iFaceB', 6], ['iFaceT', 4]]) {
      renderInspector(); type(id, want);
    }
    const m4 = marg();
    ok(Math.abs(m4.L - 2) < 0.05 && Math.abs(m4.R - 3) < 0.05 &&
      Math.abs(m4.B - 6) < 0.05 && Math.abs(m4.T - 4) < 0.05,
      `all four margins hold what was typed (${rnd(m4.L, 2)}, ${rnd(m4.R, 2)}, ${rnd(m4.B, 2)}, ${rnd(m4.T, 2)})`);
    ok(Math.abs(panel.w - (plinth.w - 2 - 3)) < 0.05 && Math.abs(panel.h - (plinth.h - 6 - 4)) < 0.05,
      `and the board is exactly what they leave (${rnd(panel.w, 2)} × ${rnd(panel.h, 2)} cm)`);

    /* a margin too big to fit leaves a sliver rather than a negative */
    renderInspector(); type('iFaceR', plinth.w + 10);
    ok(panel.w >= 0.5 - 0.001 && panel.w < 1,
      `an impossible margin shrinks the board to its minimum (${rnd(panel.w, 2)} cm), never past zero`);
    renderInspector(); press('iFaceFit');

    renderInspector(); press('iFaceCentre');
    ok(Math.abs(((bbox(panel).x0 + bbox(panel).x1) / 2) - (plinth.x + plinth.w / 2)) < 0.05,
      'centre-on-the-face centres it across the front');
    ok(Math.abs(((bbox(panel).y0 + bbox(panel).y1) / 2) - plinth.h / 2) < 0.05,
      'and up it');

    /* the case clearances move the assembly, matching the drag */
    renderInspector();
    const onFace = panel.x - plinth.x;
    type('iFromL', 20);
    ok(Math.abs(bbox(panel).x0 - 20) < 0.05,
      `a case clearance still puts the panel's edge where you asked (${rnd(bbox(panel).x0, 2)} cm)`);
    ok(Math.abs((panel.x - plinth.x) - onFace) < 0.05,
      'by moving the plinth, so the panel keeps its place on the face');

    /* --- 7c5. grow the board to fit the type — the reverse of auto-fit --- */
    const LONG = 'Astrolabe, brass, Persian, dated 1073 AH. The rete carries twenty-eight star pointers and the plate is engraved for the latitude of Isfahan. Acquired 1897 from the collection of a Cambridge orientalist, and shown here with its original wooden case.';
    panel.w = 10; panel.h = 3; panel.text = LONG; panel.textSize = 0.5;
    const gFace = panelGrow(panel, 'face');
    ok(Math.abs(gFace.w - (plinth.w - FACE_MARGIN * 2)) < 0.02,
      `growing a face panel takes the plinth width, less the margin (${rnd(gFace.w, 2)} cm)`);
    ok(gFace.ok && panelFitsAt({ ...panel, w: gFace.w, h: gFace.h }, panel.textSize),
      `and the height it returns really does hold the wording (${rnd(gFace.h, 2)} cm)`);
    ok(!panelFitsAt({ ...panel, w: gFace.w, h: rnd(gFace.h - 0.05, 2) }, panel.textSize),
      'with nothing to spare — it is the size needed, not a generous guess');
    ok(gFace.h <= gFace.cap.h + 0.005, 'capped by the plinth height');

    /* on the back wall, both ways of growing */
    const wall = { ...panel, face: 'back', w: 10, h: 3, text: LONG, textSize: 0.5 };
    const gProp = panelGrow(wall, 'prop');
    ok(gProp.ok && panelFitsAt({ ...wall, w: gProp.w, h: gProp.h }, wall.textSize),
      `proportional growth fits (${rnd(gProp.w, 2)} × ${rnd(gProp.h, 2)} cm)`);
    ok(Math.abs((gProp.w / gProp.h) - (wall.w / wall.h)) < 0.02, 'and keeps the panel’s shape');
    ok(!panelFitsAt({ ...wall, w: rnd(gProp.w * 0.99, 2), h: rnd(gProp.h * 0.99, 2) }, wall.textSize),
      'and is the smallest such enlargement — a per cent smaller already overflows');
    const gTall = panelGrow(wall, 'tall');
    ok(Math.abs(gTall.w - wall.w) < 0.01, 'growing taller leaves the width alone');
    ok(gTall.ok && panelFitsAt({ ...wall, w: gTall.w, h: gTall.h }, wall.textSize),
      `and finds the height that holds it (${rnd(gTall.h, 2)} cm)`);
    ok(!panelFitsAt({ ...wall, w: gTall.w, h: rnd(gTall.h - 0.05, 2) }, wall.textSize),
      'exactly, not approximately');
    ok(gTall.h > gTall.cap.h * 0 + wall.h, 'it grows — it never shrinks the board you drew');
    ok(gTall.h > gProp.h, 'and holding the width costs height, as it must');

    /* the honest failure: too big for the cap, and it says what it needs */
    const huge = { ...panel, w: 12, h: 6, textSize: 4, text: LONG };
    const gBad = panelGrow(huge, 'face');
    ok(!gBad.ok, 'a wording too big for the plinth face is reported as not fitting');
    ok(gBad.need && gBad.need.h > gBad.cap.h,
      `and says the height it would actually need (${rnd(gBad.need.h, 1)} cm against a ${rnd(gBad.cap.h, 1)} cm face)`);
    ok(gBad.h <= gBad.cap.h + 0.005, 'while still growing as far as there is room, rather than stopping silently');
    panel.text = ''; panel.w = 14; panel.h = 9;
    landOnFace(panel);
    select(null);
  }

  /* --- 7c2. nothing is drawn under an object that has no stand --- */
  const bare = { ...man, stand: { kind: 'none', w: 0, d: 0, h: 0 } };
  ok(standBox(bare) === null, 'an object with no stand has nothing drawn beneath it');
  ok(Math.abs(layout(bare).h - man.h * Math.cos(man.lean * DEG)) < 0.01,
    `and a leaning object is just its foreshortened face — ${rnd(layout(bare).h)} cm, no extra bar`);

  /* a cradle is cut to fit its book */
  const cradled = { ...man, stand: { kind: 'cradle', w: 1, d: 1, h: 5 } };
  const cb = standBox(cradled);
  ok(Math.abs(cb.w - man.w) < 0.01, `a cradle takes the book's own ${rnd(cb.w)} cm width, not the number in the field`);
  ok(Math.abs(cb.d - footprint(cradled).d) < 0.01, `and its own ${rnd(cb.d)} cm depth`);
  ok(cb.h === 5, 'while the height stays yours to set');

  /* --- 7c3. what is in front covers what is behind --- */
  const wallPanel = { ...panel, mount: 'wall', face: 'back', z: 0 };
  ok(depthKey(wallPanel) < depthKey(plinth),
    `a panel on the back wall sits behind a plinth (${rnd(depthKey(wallPanel), 2)} vs ${rnd(depthKey(plinth))})`);

  /* the back wall is the rearmost plane, whatever the stand-off */
  const proudGraphic = { ...panel, mount: 'wall', face: 'back', z: 6 };
  const closeHung = { ...hung, z: 0.2, depth: 0.5 };
  ok(depthKey(proudGraphic) < depthKey(closeHung),
    'a graphic on the back wall stays behind an object hung right against the wall');
  ok(depthKey(proudGraphic) < depthKey(shelf) && depthKey(proudGraphic) < depthKey(astro),
    'and behind the shelves and everything standing in the case');
  ok(depthKey(proudGraphic) > depthKey(wallPanel),
    'while a graphic on stand-offs still reads in front of one flat on the wall');
  const facePanel = { ...panel, mount: 'wall', face: plinth.id };
  ok(depthKey(facePanel) > depthKey(plinth), 'a panel on a plinth front sits in front of that plinth');
  const inFront = { ...astro, mount: 'placed', support: 'floor', z: rnd(plinth.z + plinth.d + 1) };
  ok(depthKey(inFront) > depthKey(facePanel),
    'and an object standing in front of the plinth covers what is stuck to its face');
  ok(depthKey(shelf) < depthKey(astro), 'a shelf stays behind whatever stands on it');

  /* --- 7d. stands lift by their base height, whatever the kind --- */
  for (const kind of ['block', 'stand', 'cradle']) {
    astro.stand = { kind, w: 12, d: 14, h: 5 };
    ok(standLift(astro) === 5 && Math.abs(bbox(astro).y0 - (plinth.h + 5)) < 0.01,
      `a ${kind} raises the object by its base height (${rnd(bbox(astro).y0)} cm on a ${plinth.h} cm plinth)`);
  }
  astro.stand = { kind: 'cradle', w: 12, d: 14, h: 5 };
  ok(standLift(astro) === 5, 'a book cradle now lifts like everything else, rather than sitting flush');
  astro.stand = { kind: 'stand', w: 12, d: 14, h: 5 };

  /* --- 7e. rulers toggle collapses the gutter --- */
  S.opt.rulers = true; T = calcT();
  const gutOn = GUT, scaleOn = T.sc;
  S.opt.rulers = false; T = calcT();
  ok(GUT < gutOn && T.sc > scaleOn, `turning the rulers off reclaims the gutter (${gutOn} px to ${GUT} px)`);
  S.opt.rulers = true; T = calcT();

  /* --- 7f. a graphic is just an object fixed to the wall --- */
  stage(photo(400, 300, { kind: 'rect', col: '#8a6a4a' }), 'Wall graphic');
  W.widthCm = 24; W.depthCm = 0.3;
  Object.assign(W, { mount: 'wall', planShape: 'rect' });   /* what the preset does */
  W.wallY = 100;
  finishWizard();
  const graphic = S.items.find(i => i.name === 'Wall graphic');
  ok(graphic.mount === 'wall' && Math.abs(bbox(graphic).y0 - 100) < 0.01,
    'a wall graphic lands flat on the back at the height given');
  ok(graphic.render === 'image' && graphic.png, 'and is a normal cut-out object, so it can be resized and moved');

  /* --- 7g. preview mode --- */
  select(astro.id);
  enterPreview();
  ok(PREVIEW && document.body.classList.contains('preview'), 'preview hides the rails and the toolbar');
  ok(S.sel === null, 'and drops the selection, so no handles are left on the drawing');
  T = calcT();
  ok(GUT === 0, 'the ruler gutter goes entirely, so the case fills the screen');
  const beforePv = S.zoom;
  S.zoom = 2; updateZoomLabel();
  ok($('#pvZoom').textContent === '200%', 'the preview bar tracks the zoom');
  S.zoom = beforePv;
  render();
  ok(true, 'and it renders without the grid, rulers, dimensions or labels');
  setView('plan');
  ok($('#pvSeg button[data-view="plan"]').getAttribute('aria-pressed') === 'true',
    'the view toggle in the bar stays in step');
  setView('front');
  exitPreview();
  ok(!PREVIEW && !document.body.classList.contains('preview'), 'and Close puts everything back');
  T = calcT();
  ok(GUT === 26, 'including the rulers');

  /* --- 7h. undo --- */
  resetUndo();
  const countBefore = S.items.length;
  const victim = S.items.find(i => i.name === 'Astrolabe');
  const victimPng = victim.png;
  removeItem(victim.id);
  ok(S.items.length === countBefore - 1, 'deleting an object removes it');
  await undo();
  ok(S.items.length === countBefore, 'and undo brings it straight back');
  const back = S.items.find(i => i.name === 'Astrolabe');
  ok(back && back.png === victimPng, 'with its cut-out intact, not a blank');
  ok(BMP.get(back.id), 'and its bitmap reloaded ready to draw');
  await redo();
  ok(S.items.length === countBefore - 1,
    `redo takes it away again (${S.items.length} of ${countBefore - 1}, undo ${UNDO.length} redo ${REDO.length})`);
  await undo();

  /* moves are undoable too, and history is bounded */
  const mover = S.items.find(i => i.name === 'Rete');
  const wasX = mover.x;
  mover.x = rnd(wasX + 25); commit();
  await undo();
  ok(Math.abs(byId(mover.id).x - wasX) < 0.01, 'undo also steps back a move');
  ok(UNDO.length <= UNDO_MAX, `the history is capped at ${UNDO_MAX} steps`);

  /* the picture data is shared, not copied per step */
  const assetsBefore = ASSETS.size;
  for (let i = 0; i < 12; i++) { mover.x = rnd(wasX + i); commit(); }
  ok(ASSETS.size === assetsBefore, `twelve more steps added no new image copies (${ASSETS.size} held)`);
  mover.x = wasX; commit();
  resetUndo();

  /* --- 7i. the case library --- */
  {
    /* Kill any autosave still pending from the sections above. It is
       debounced by 600 ms, and if one lands in here it calls
       persistCurrent(), which mints a projectId when there is none —
       and then renameCase no longer matches the case under test. A slow
       flake that depends only on how long the earlier sections took. */
    clearTimeout(saveT);

    /* The other half of the same flake, and the one that survived: boot
       reads storage asynchronously, and if that read landed *after* the
       stub below was installed it found a non-empty index, saw an empty
       undo history, and dutifully opened a case over the one under test
       — so the rename assertion failed about three runs in eight. Wait
       for the opening read to be over before taking storage away. */
    await BOOTED;

    /* a private in-memory store, so the test never touches real storage */
    const mem = new Map();
    const realGet = store.get, realSet = store.set, realDel = store.del;
    store.get = async k => mem.get(k);
    store.set = async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); return true; };
    store.del = async k => { mem.delete(k); };

    S.projectId = 'p1'; S.name = 'Kepler case';
    await persistCurrent();
    let ix = await loadIndex();
    ok(ix.length === 1 && ix[0].name === 'Kepler case', 'saving files the case in the index');
    ok(ix[0].objects === S.items.filter(i => i.type === 'object').length,
      `with its object count (${ix[0].objects})`);
    ok(typeof ix[0].thumb === 'string' && ix[0].thumb.startsWith('data:image'),
      'and a thumbnail to recognise it by');

    const keptItems = S.items.length;
    await newCase();
    ok(S.items.length === 0 && S.projectId !== 'p1', 'a new case starts empty under a new id');
    ix = await loadIndex();
    ok(ix.length === 2, 'and the old one is still in the library, not replaced');
    ok(UNDO.length === 0, 'with a clean undo history');

    const back = ix.find(r => r.id === 'p1');
    await openCase(back.id, true);
    ok(S.items.length === keptItems && S.name === 'Kepler case',
      `reopening the old case brings all ${keptItems} items back`);
    ok(BMP.size > 0, 'with its cut-outs');

    await renameCase('p1', 'Rudolphine case');
    ok(S.name === 'Rudolphine case', 'renaming the open case renames it live');
    ok((await loadIndex()).find(r => r.id === 'p1').name === 'Rudolphine case', 'and in the library');

    await duplicateCase('p1');
    ix = await loadIndex();
    ok(ix.length === 3 && ix.some(r => r.name === 'Rudolphine case copy'), 'a case can be copied');

    const doomed = ix.find(r => r.name === 'Rudolphine case copy');
    const realConfirm = window.confirm; window.confirm = () => true;
    await deleteCase(doomed.id);
    window.confirm = realConfirm;
    ix = await loadIndex();
    ok(ix.length === 2 && !ix.some(r => r.id === doomed.id), 'and deleted');
    ok(await store.get(caseKey(doomed.id)) === undefined, 'taking its stored case with it');

    store.get = realGet; store.set = realSet; store.del = realDel;
    S.name = 'Kepler case';
  }

  /* --- 7j. plinths wear a colour, and keep their objects put in plan ---
     re-fetched from S.items: the library section above reopened the case,
     so every item is a fresh copy and the old handles are stale */
  const pl2 = S.items.find(i => i.type === 'plinth');
  const shelfNow = S.items.find(i => i.type === 'shelf');
  pl2.colour = '#5a4632';
  ok(byId(pl2.id).colour === '#5a4632', 'a plinth takes a colour of its own');
  pl2.png = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
  await syncBitmaps();
  ok(BMP.has(pl2.id), 'and a picture for its face, cached like any other bitmap');
  pl2.png = null; pl2.colour = '';
  await syncBitmaps();
  ok(!BMP.has(pl2.id), 'clearing it drops the bitmap again');

  /* the elevation drag carries passengers; the plan drag does not */
  const rider = S.items.find(i => i.name === 'Astrolabe');
  rider.mount = 'placed'; rider.support = pl2.id;
  const riderWasX = rider.x, riderWasZ = rider.z;
  S.view = 'front';
  for (const k of childrenOf(pl2.id)) k.x = rnd(k.x + 8, 2);   /* what the elevation drag does */
  ok(Math.abs(rider.x - (riderWasX + 8)) < 0.01, 'in elevation a plinth still takes its objects with it');
  rider.x = riderWasX;
  S.view = 'plan';
  pl2.z += 6;                                                  /* what the plan drag does */
  ok(Math.abs(rider.z - riderWasZ) < 0.01,
    'in plan things resting on the plinth stay put, so you can place them on its top');
  pl2.z -= 6;

  /* but anything stuck to a face is glued on and goes with it */
  const stuck = S.items.find(i => i.render === 'panel' && faceOf(i)) ||
    (select(pl2.id), addPanel(), S.items[S.items.length - 1]);
  stuck.mount = 'wall'; stuck.face = pl2.id;
  const stuckWasX = stuck.x;
  const kids = childrenOf(pl2.id).map(k => ({ id: k.id, x: k.x, stuck: k.mount === 'wall' }));
  ok(kids.some(k => k.stuck) && kids.some(k => !k.stuck),
    'the plinth is carrying both a resting object and a stuck panel');
  for (const k of kids) { if (k.stuck) byId(k.id).x = rnd(k.x + 9, 2); }   /* what the plan drag does */
  pl2.x += 9;
  ok(Math.abs(stuck.x - (stuckWasX + 9)) < 0.01, 'so the face panel travels with the plinth in plan');
  ok(Math.abs(rider.x - riderWasX) < 0.01, 'while the object on top still does not');
  pl2.x -= 9; stuck.x = stuckWasX;
  ok(Math.abs(footprint(stuck).z - (pl2.z + pl2.d)) < 0.01, 'and it stays on the face front to back');

  /* looking down, the thing standing on the plinth takes the click */
  S.view = 'plan'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
  rider.x = rnd(pl2.x + (pl2.w - rider.w) / 2);
  rider.z = rnd(pl2.z + 4);
  const over = w2s(rider.x + rider.w / 2, footprint(rider).z + footprint(rider).d / 2);
  ok(hitTest(over.x, over.y) === rider,
    'clicking an object on a plinth in plan picks the object, not the plinth beneath');
  const beside = w2s(pl2.x + 1, pl2.z + pl2.d - 1);
  ok(hitTest(beside.x, beside.y) === pl2, 'and clicking clear of it still picks the plinth');
  ok(planPickKey(rider) > planPickKey(pl2) && planPickKey(pl2) > planPickKey(shelfNow),
    'the plan pick order is objects, then plinths, then shelves');

  /* --- 7k. lining up --- */
  S.view = 'front'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
  const label2 = S.items.find(i => i.render === 'panel') ||
    (select(pl2.id), addPanel(), S.items[S.items.length - 1]);
  label2.mount = 'wall'; label2.face = pl2.id; label2.w = 14;
  const plinthMid = pl2.x + pl2.w / 2;

  /* nudge it a hair off centre, as a hand would */
  label2.x = rnd(plinthMid - label2.w / 2 + 0.6, 2);
  GUIDES = [];
  applyAlign(label2);
  ok(Math.abs((label2.x + label2.w / 2) - plinthMid) < 0.02,
    `a panel dropped near the plinth centre snaps onto it (${rnd(label2.x + label2.w / 2, 2)} vs ${rnd(plinthMid, 2)})`);
  ok(GUIDES.some(g => g.axis === 'x' && Math.abs(g.v - plinthMid) < 0.02),
    'and a guide is recorded so the line can be drawn');

  /* somewhere provably clear of every line, it is left alone */
  const lines = [0, S.cs.w / 2, S.cs.w];
  for (const o of S.items) {
    if (o.id === label2.id) continue;
    const [a, b] = itemExtent(o, 'x');
    lines.push(a, (a + b) / 2, b);
  }
  const clearOf = x => [x, x + label2.w / 2, x + label2.w]
    .every(m => lines.every(l => Math.abs(l - m) > 4));
  let freeX = null;
  for (let x = 0; x <= S.cs.w - label2.w; x += 0.5) if (clearOf(x)) { freeX = x; break; }
  ok(freeX !== null, `there is somewhere clear of every line to test against (x ${freeX})`);
  label2.x = freeX;
  GUIDES = [];
  applyAlign(label2);
  ok(Math.abs(label2.x - freeX) < 0.001 && !GUIDES.some(g => g.axis === 'x'),
    'but nothing is dragged sideways when there is no line nearby');

  /* the toggle governs it */
  S.opt.snap = false;
  label2.x = rnd(plinthMid - label2.w / 2 + 0.6, 2);
  const offX = label2.x;
  applyAlign(label2);
  ok(Math.abs(label2.x - offX) < 0.001, 'and turning Snap off stops it lining up at all');
  S.opt.snap = true;
  GUIDES = [];

  /* --- 7k2. centring on the thing you stand on beats an exact edge match ---
     An object a shade wider than its plinth used to lock to the plinth's
     edge, which is a perfect zero, and could never be centred on it. */
  {
    const wide = S.items.find(i => i.name === 'Manuscript');
    const keepX = wide.x, keepSup = wide.support, keepW = wide.w;
    wide.support = pl2.id;
    wide.w = rnd(pl2.w + 2, 2);            /* wider than the plinth it is on */
    const mid = pl2.x + pl2.w / 2;
    let worst = 0;
    for (const off of [-1, -0.5, 0.5, 1]) {
      const b0 = bbox(wide);
      wide.x = rnd(mid - (b0.x1 - b0.x0) / 2 + off, 2);
      GUIDES = [];
      applyAlign(wide);
      const b = bbox(wide);
      worst = Math.max(worst, Math.abs((b.x0 + b.x1) / 2 - mid));
    }
    ok(worst < 0.05,
      `an object wider than its plinth still centres on it from either side (worst ${rnd(worst, 3)} cm out)`);
    wide.x = keepX; wide.support = keepSup; wide.w = keepW;
    GUIDES = [];
  }

  S.view = 'front'; T = calcT();

  /* --- 7l. nothing lands on top of anything else --- */
  {
    const keep = S.items;
    S.items = []; S.sel = null;
    select(null); addPanel(); const q1 = S.items[S.items.length - 1];
    select(null); addPanel(); const q2 = S.items[S.items.length - 1];
    select(null); addPanel(); const q3 = S.items[S.items.length - 1];
    ok(!(q1.x === q2.x && q2.x === q3.x && q1.wallY === q2.wallY),
      `three new panels step clear of each other (x ${q1.x}/${q2.x}/${q3.x})`);
    addPlinth(); const b1 = S.items[S.items.length - 1];
    addPlinth(); const b2 = S.items[S.items.length - 1];
    ok(b1.x !== b2.x, `and two new plinths do too (x ${b1.x} vs ${b2.x})`);
    addShelf(); const h1 = S.items[S.items.length - 1];
    addShelf(); const h2 = S.items[S.items.length - 1];
    ok(h1.y !== h2.y, `and shelves stack up the case rather than on one line (${h1.y} vs ${h2.y})`);

    /* a click on a genuine stack must grab the one you can see */
    q3.x = 0; q3.wallY = 0;              /* get the third out of the way first */
    q2.x = q1.x; q2.wallY = q1.wallY;
    VW = cvs.clientWidth; VH = cvs.clientHeight; S.view = 'front'; T = calcT();
    const mid = w2s(q1.x + q1.w / 2, q1.wallY + q1.h / 2);
    ok(hitTest(mid.x, mid.y) === q2, 'and clicking a stack grabs the one drawn on top, not the one beneath');

    /* moving one leaves the rest alone */
    const wasQ1 = q1.x, wasQ3 = q3.x;
    q2.x = rnd(q2.x + 25, 2);
    ok(q1.x === wasQ1 && q3.x === wasQ3, 'moving one panel moves only that panel');

    S.items = keep; S.sel = null;
  }

  /* --- 7m. the six clearances, driven through the actual fields --- */
  {
    const type = (id, v) => {
      const el = $('#' + id);
      if (!el || el.disabled) return false;
      el.value = String(v);
      el.dispatchEvent(new Event('change'));
      return true;
    };
    S.view = 'front'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
    const m = S.items.find(i => i.name === 'Manuscript');
    m.spin = 12;                          /* turned, so o.x is not the left edge */
    select(m.id); renderInspector();
    ok(type('iFromR', 9), 'the from-the-right field is editable for a placed object');
    ok(Math.abs((S.cs.w - bbox(m).x1) - 9) < 0.05,
      `typing "from the right" moves it there even when it is turned (${rnd(S.cs.w - bbox(m).x1, 2)} cm)`);
    renderInspector();
    type('iFromL', 12);
    ok(Math.abs(bbox(m).x0 - 12) < 0.05, `and "from the left" likewise (${rnd(bbox(m).x0, 2)} cm)`);
    renderInspector();
    type('iFromFr', 5);
    const fp = footprint(m);
    ok(Math.abs((S.cs.d - (fp.z + fp.d)) - 5) < 0.05,
      `"from the front" leaves the gap you asked for (${rnd(S.cs.d - (fp.z + fp.d), 2)} cm)`);
    renderInspector();
    ok($('#iFromB').disabled && $('#iFromT').disabled,
      'a placed object shows its height but does not let you type it — that is the support’s job');
    m.spin = 0;

    /* a hung object can be placed by any of the four */
    const r = S.items.find(i => i.name === 'Rete');
    select(r.id); renderInspector();
    ok(!$('#iFromT').disabled, 'a hung object can be set from the top');
    type('iFromT', 20);
    ok(Math.abs((S.cs.h - bbox(r).y1) - 20) < 0.05,
      `and lands with that clearance (${rnd(S.cs.h - bbox(r).y1, 2)} cm), wires following`);

    /* a plinth moves its passengers when placed by a clearance */
    const p3 = S.items.find(i => i.type === 'plinth');
    const rider3 = childrenOf(p3.id)[0];
    if (rider3) {
      const gap = rider3.x - p3.x;
      select(p3.id); renderInspector();
      type('iFromL', 8);
      ok(Math.abs(p3.x - 8) < 0.05 && Math.abs((rider3.x - p3.x) - gap) < 0.05,
        'a plinth placed by a clearance carries what stands on it');
    }
    select(null);
  }

  /* --- 7n. duplicating never leaves an object without its picture --- */
  {
    const src = S.items.find(i => i.render === 'image');
    await duplicate(src.id);
    const copy = S.items[S.items.length - 1];
    ok(copy.id !== src.id && copy.png === src.png, 'a duplicate carries the same picture');
    ok(BMP.get(copy.id), 'and its bitmap is decoded, so it cannot draw as an anonymous grey rectangle');
    ok(BMPSRC.get(copy.id) === copy.png, 'with the source recorded, so it is not needlessly decoded again');
    removeItem(copy.id);
  }

  /* --- 7o. the lock --- */
  {
    S.view = 'front'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
    const a = S.items.find(i => i.name === 'Astrolabe');
    select(a.id);
    toggleLock(true);
    ok(locked() && S.opt.lock, 'the lock goes on');
    const wasX = a.x;
    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    ok(a.x === wasX, 'and an arrow key no longer nudges the selected object');
    renderInspector();
    ok($('#iFromL').disabled && $('#iW').disabled, 'placement and size fields are frozen');
    ok(!$('#iName').disabled, 'but naming still works — labelling is not moving');
    ok($('#iUnlock'), 'and there is a way out of it in the inspector');
    /* the padlock on the sheet is a real target, and it is where it says */
    draw();
    const r = lockButtonRect();
    ok(overLockButton(r.x + r.w / 2, r.y + r.h / 2), 'the padlock on the sheet takes a click');
    ok(!overLockButton(r.x - 30, r.y + r.h / 2), 'and does not swallow one beside it');
    ok(r.x > 0 && r.y > 0 && r.x < 120 && r.y < 120, `it sits at the top left of the plane (${r.x}, ${r.y})`);
    /* it saves with the case */
    const s = JSON.parse(JSON.stringify(snapshot()));
    toggleLock(false);
    await restore(s);
    ok(locked(), 'and the lock comes back with a reopened case');
    toggleLock(false);
    ok(!locked(), 'unlocking again lets go');
    /* and the same keystroke does move it once unlocked, so the test
       above is measuring the lock and not a dead event */
    const a2 = S.items.find(i => i.name === 'Astrolabe');
    select(a2.id);
    const freeX = a2.x;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    ok(a2.x !== freeX, `unlocked, the same arrow key moves it (${rnd(freeX)} → ${rnd(a2.x)})`);
    a2.x = freeX;
    select(null);
  }

  /* --- 7p. exporting is cropped to the case --- */
  {
    S.view = 'front'; VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
    const full = Math.round(cvs.clientWidth * 2);
    EXP.fmt = 'png'; EXP.scale = 2; EXP.style = 'sheet';
    EXP.rulers = true; EXP.grid = true;
    const sheet = renderSheet('front', 2, { rulers: true, grid: true, dims: false });
    ok(sheet.width < full, `the drawing is trimmed to the case, not the window (${sheet.width} of ${full} px)`);
    ok(sheet.width > full * 0.5, 'but not so tight that the case itself is cut');
    ok(exportSize('front').w === sheet.width, 'and the dialogue reports the size it will actually write');
    ok(!PREVIEW && !EXPORTING && !SHOW_FURNITURE, 'the flags it borrows are put back afterwards');
    ok(EXPORT_SC === 1, 'the export scale among them');

    /* --- 7p2. an export writes words, not greeked rules --- */
    ok(!EXPORTING && greeked(3) && !greeked(5),
      'on screen, type under four pixels is greeked as grey rules');
    EXPORTING = true; EXPORT_SC = 4;
    ok(!greeked(3),
      'but a ×4 export sets the same type as words — the threshold is measured in the pixels the file gets, not the ones the screen would have got');
    ok(greeked(0.9), 'while type that really would be illegible even at ×4 is still greeked there');
    EXPORTING = false; EXPORT_SC = 1;
    ok(greeked(3), 'and the screen judgement is unchanged once the export is over');

    /* "just the case" still answers to the grid and ruler tick boxes,
       because the surround and the drafting furniture are separate
       questions — which is the whole point of the SHOW_FURNITURE flag */
    EXP.style = 'plain';
    const bare = renderSheet('front', 2, { rulers: false, grid: false, dims: false });
    const ruled = renderSheet('front', 2, { rulers: true, grid: false, dims: false });
    ok(ruled.width > bare.width,
      `just the case keeps its rulers when asked (${ruled.width} px with, ${bare.width} without)`);
    EXP.style = 'sheet';
  }

  /* --- 7q. a selected object's wires stay grey ---
     Accent orange is the dimension colour, so wires drawn in it read as
     measurements. The selection shows in the line weight instead. */
  {
    S.view = 'front'; S.pan = { x: 0, y: 0 }; S.zoom = 1;
    VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
    const r = S.items.find(i => i.name === 'Rete');
    const wr = r.wires[0];
    const att = attachWorld(r, wr);
    const rail = r.rail ?? S.rail;
    /* a point on the wire itself, a little below the rail */
    const on = w2s(att.x, rail - Math.max(1, (rail - att.y) * 0.3));
    const at = (dx) => mainCtx.getImageData(Math.round(on.x) + dx - 1, Math.round(on.y), 3, 1).data;
    const warmest = d => {
      let m = -999;
      for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i] - d[i + 2]);
      return m;
    };
    const wasDims = S.opt.dims;
    S.opt.dims = false;
    select(r.id); draw();
    const onWire = at(0), offWire = at(30);
    ok(warmest(onWire) < 55,
      `a selected object's wire is grey, not accent orange (r−b ${warmest(onWire)}, where the accent runs past 100)`);
    ok(Math.abs(onWire[0] - offWire[0]) > 6 || Math.abs(onWire[2] - offWire[2]) > 6,
      'and the sample really is on the wire, not on empty ground');
    /* the wire's own dimension is a measurement, and keeps the accent */
    ok(/arrowDim\(.*wireLen.*C\.accent/.test(String(drawDimsFor)),
      'while the wire dimension stays accent — it genuinely is a dimension');
    S.opt.dims = wasDims;
    select(null); draw();
  }

  /* --- 7r. Centre it means the same thing in both views --- */
  {
    const p = S.items.find(i => i.type === 'plinth');
    const rider = S.items.find(i => i.type === 'object' && i.mount === 'placed' && i.support === p.id);
    if (rider) {
      const centred = () => {
        const c = contactPatch(rider);
        return {
          dx: (c.x + c.w / 2) - (p.x + p.w / 2),
          dz: (c.z + c.d / 2) - (p.z + p.d / 2)
        };
      };
      for (const view of ['front', 'plan']) {
        S.view = view;
        rider.x = p.x - 3; rider.z = p.z + 1;
        select(rider.id); renderInspector();
        $('#iCentre').click();
        const g = centred();
        ok(Math.abs(g.dx) < 0.05,
          `Centre it centres across the plinth in ${view === 'front' ? 'elevation' : 'plan'} (${rnd(g.dx, 2)} cm out)`);
        ok(Math.abs(g.dz) < 0.05,
          `and front to back too — the axis the elevation used to leave alone (${rnd(g.dz, 2)} cm out)`);
        ok(!outOfCase(rider).some(m => /overhanging|off the front or back/.test(m)),
          'so a centred object no longer reports itself as sticking off its plinth');
      }
      S.view = 'front'; select(null);
    }
  }

  /* --- 7s. too big to fit is a different complaint from off-centre --- */
  {
    const p = S.items.find(i => i.type === 'plinth');
    const wide = { ...S.items.find(i => i.name === 'Astrolabe') };
    wide.stand = { kind: 'none', w: 0, d: 0, h: 0 };
    wide.baseW = rnd(p.w + 6, 2); wide.baseD = 4;
    wide.support = p.id; wide.x = rnd(p.x + (p.w - wide.w) / 2, 2);
    const msg = outOfCase(wide).find(m => /overhanging/.test(m));
    ok(msg && /will not help/.test(msg),
      'a foot wider than the plinth says so, rather than sending you hunting for a position that does not exist');
    wide.baseW = 4;
    wide.x = rnd(wide.x - 30, 2);
    const msg2 = outOfCase(wide).find(m => /overhanging/.test(m));
    ok(msg2 && !/will not help/.test(msg2),
      'while a foot that would fit if you moved it gets the plain overhang message');

    /* the same distinction for something stuck to a plinth face */
    const pan = S.items.find(i => i.render === 'panel' && faceOf(i));
    if (pan) {
      const keep = { w: pan.w, x: pan.x };
      const face = faceOf(pan);
      pan.w = rnd(face.w + 5, 2);
      pan.x = rnd(face.x + (face.w - pan.w) / 2, 2);
      ok(outOfCase(pan).some(m => /wider than the front of .* and the face only/.test(m)),
        'a board wider than the plinth front says by how much');
      pan.w = keep.w;
      pan.x = rnd(face.x + face.w - 1, 2);
      ok(outOfCase(pan).some(m => /off the edge of/.test(m)),
        'while one that has simply slid off the side says that instead');
      Object.assign(pan, keep);
    }
  }

  /* --- 7t. measuring lines --- */
  {
    S.view = 'front'; S.pan = { x: 0, y: 0 }; S.zoom = 1; S.level = 'all';
    VW = cvs.clientWidth; VH = cvs.clientHeight; T = calcT();
    S.measures = [];
    select(null);
    cvs.setPointerCapture = () => { };
    const rect = cvs.getBoundingClientRect();
    const send = (type, px, py, opt) => cvs.dispatchEvent(new PointerEvent(type, {
      clientX: rect.left + px, clientY: rect.top + py,
      bubbles: true, pointerId: 1, button: 0, ...opt
    }));
    /* one press, an arming move, the real move, and let go */
    const drawLine = (from, to, opt) => {
      send('pointerdown', from.x, from.y, opt);
      send('pointermove', from.x + DRAG_SLOP + 2, from.y, opt);
      send('pointermove', to.x, to.y, opt);
      send('pointerup', to.x, to.y, opt);
      return S.measures[S.measures.length - 1];
    };

    setMeasuring(true);
    ok(MEASURING, 'the measuring mode goes on');
    ok($('#btnMeasure').getAttribute('aria-pressed') === 'true', 'and the button says so');

    const astro = S.items.find(i => i.name === 'Astrolabe');
    const ab = bbox(astro);
    const cx = (ab.x0 + ab.x1) / 2, cy = (ab.y0 + ab.y1) / 2;

    /* the case the owner asked for: middle of an object to the top,
       drawn deliberately off the vertical to prove it is caught */
    const start = w2s(cx, cy);
    const wonky = w2s(cx + 0.4, S.cs.h - 0.6);
    const m = drawLine(start, wonky);
    ok(m && S.measures.length === 1, 'dragging in the case leaves a measuring line');
    ok(Math.abs(m.ax - cx) < 0.05 && Math.abs(m.ay - cy) < 0.05,
      `it starts on the middle of the object it was begun from (${rnd(m.ax, 2)}, ${rnd(m.ay, 2)})`);
    ok(Math.abs(m.bx - m.ax) < 0.001,
      'and holds the vertical rather than the few tenths the pointer wandered');
    ok(Math.abs(m.by - S.cs.h) < 0.05,
      `the far end landing on the top of the case (${rnd(m.by, 2)} of ${S.cs.h})`);
    ok(Math.abs(measureLen(m) - (S.cs.h - cy)) < 0.05,
      `so it reads ${rnd(measureLen(m), 1)} cm, which is the height above the object's middle`);
    ok(m.view === 'front', 'and belongs to the view it was drawn in');

    /* the horizontal is caught the same way */
    const across = drawLine(w2s(cx, cy), w2s(S.cs.w - 0.5, cy + 0.4));
    ok(Math.abs(across.by - across.ay) < 0.001, 'a near-horizontal drag holds the horizontal');
    ok(Math.abs(across.bx - S.cs.w) < 0.05, 'and lands on the side of the case');

    /* an edge of something real, rather than the case */
    const plinth = S.items.find(i => i.type === 'plinth');
    const toEdge = drawLine(w2s(cx, cy), w2s(plinth.x + 0.3, cy + 0.3));
    ok(Math.abs(toEdge.bx - plinth.x) < 0.05,
      `the free end lands on a plinth edge when it is near one (${rnd(toEdge.bx, 2)} of ${plinth.x})`);

    /* Shift is the override, here as everywhere else */
    const freeM = drawLine(w2s(cx, cy), w2s(cx + 0.4, S.cs.h - 0.6), { shiftKey: true });
    ok(Math.abs(freeM.bx - freeM.ax) > 0.2 && Math.abs(freeM.by - (S.cs.h - 0.6)) < 0.05,
      'holding Shift puts both ends exactly where the pointer was');
    S.measures = S.measures.filter(x => x !== freeM);
    commit();                    /* or the undo below steps back past this */

    /* they are per view */
    ok(S.measures.every(x => x.view === 'front'), 'all of them are elevation lines');
    setView('plan');
    ok($('#mCount').textContent === '0', 'the plan counts none of them');
    setView('front');
    ok(+$('#mCount').textContent === S.measures.length, 'and the elevation counts them all');

    /* a click, rather than a drag, on a line removes it */
    const doomed = S.measures[S.measures.length - 1];
    const mid = measureEnds(doomed);
    const n0 = S.measures.length;
    send('pointerdown', (mid.a.x + mid.b.x) / 2, (mid.a.y + mid.b.y) / 2);
    send('pointerup', (mid.a.x + mid.b.x) / 2, (mid.a.y + mid.b.y) / 2);
    ok(S.measures.length === n0 - 1 && !S.measures.includes(doomed),
      'clicking a line without dragging removes it');
    await undo();
    ok(S.measures.length === n0, 'and undo puts it back — they are ordinary state');

    /* they survive being written out and read back */
    const snapM = JSON.stringify(snapshot());
    const keptM = S.measures.length;
    await restore(JSON.parse(snapM));
    ok(S.measures.length === keptM, `all ${keptM} measurements survive the save/open round trip`);
    ok(S.measures.every(x => isFinite(x.ax) && isFinite(x.by) && x.view),
      'with both ends and their view intact');

    /* and a file from before the tool existed simply has none */
    await restore({ v: 1, name: 'Old', cs: { w: 100, h: 100, d: 30 }, rail: 90, items: [] });
    ok(Array.isArray(S.measures) && S.measures.length === 0,
      'a file written before the tool opens with no measurements, not undefined');
    await restore(JSON.parse(snapM));

    /* preview strips them; an ordinary export keeps them */
    ok(!PREVIEW, 'preview is off to begin with');
    const withM = renderSheet('front', 2, { rulers: false, grid: false, dims: false });
    S.measures = [];
    const withoutM = renderSheet('front', 2, { rulers: false, grid: false, dims: false });
    ok(withM.width === withoutM.width && withM.height === withoutM.height,
      'measurements do not change the crop — the picture is still the case');
    await restore(JSON.parse(snapM));

    clearMeasures();
    ok(S.measures.length === 0, 'clear all empties them');
    await undo();
    ok(S.measures.length === keptM, 'and that is undoable too');
    S.measures = [];
    setMeasuring(false);
    ok(!MEASURING, 'and the mode goes off again');
    commit();
  }

  /* --- 7m. objects, panels and casework are listed apart --- */
  renderLists();
  const inObjects = $$('#listObj .item').length;
  const inPanels = $$('#listPanel .item').length;
  const realObjects = S.items.filter(i => i.type === 'object' && i.render !== 'panel').length;
  const realPanels = S.items.filter(i => i.render === 'panel').length;
  ok(inObjects === realObjects && realObjects > 0,
    `the objects list holds only photographs and shapes (${inObjects})`);
  ok(inPanels === realPanels, `panels have a list of their own (${inPanels})`);
  ok($$('#listStruct .item').length === S.items.filter(i => i.type !== 'object').length,
    'and shelves and plinths stay in Structure');

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
  ok(S.items.length === 8, 'round trip keeps all 8 items, got ' + S.items.length);
  ok(JSON.stringify(snapshot()) === snap, 'round trip is byte-identical');
  ok(BMP.size === 4, 'all 4 bitmaps reloaded, got ' + BMP.size);
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

  /* --- 12. exporting a picture --- */
  const realDownload = download;
  let exported = [];
  download = (blob, name) => { exported.push({ size: blob.size, name }); };
  /* toBlob is asynchronous, and under --virtual-time-budget the clock
     runs far faster than the encoder does: 120 sleeps of 50 ms is six
     seconds on paper and can be a fraction of a real one, which is why
     this test failed about one run in four with "0 bytes". So the wait
     is counted in event-loop turns rather than in milliseconds — every
     turn is another chance for the blob to arrive, whatever the clock
     is doing. */
  const waitFiles = async n => {
    for (let i = 0; i < 2000 && exported.length < n; i++) await new Promise(r => setTimeout(r, 10));
    return exported.length >= n;
  };
  EXP.fmt = 'png'; EXP.scale = 2; EXP.view = 'front'; EXP.style = 'sheet';
  saveSheet('front');
  ok(await waitFiles(1) && exported[0].size > 20000, `PNG export produced ${exported[0] ? exported[0].size : 0} bytes`);
  ok(/\.png$/.test(exported[0].name), `and is named for what it is — ${exported[0].name}`);

  exported = [];
  EXP.fmt = 'jpeg';
  saveSheet('plan');
  ok(await waitFiles(1) && /plan\.jpg$/.test(exported[0].name), `JPEG of the plan comes out as ${exported[0] ? exported[0].name : 'nothing'}`);
  ok(exported[0].size > 5000, `and holds ${exported[0].size} bytes`);

  exported = [];
  EXP.fmt = 'png'; EXP.view = 'both';
  runExport();
  ok(await waitFiles(2), `"Both" writes two files: ${exported.map(f => f.name).join(', ')}`);
  ok(S.view === 'front', 'and exporting the other view leaves the one on screen alone');
  EXP.view = 'front';
  download = realDownload;

  buildSchedule();
  ok(($('#schedTable').dataset.tsv || '').split('\n').length === 7, 'schedule lists 6 objects + header');

  if (location.hash === '#dark') document.documentElement.setAttribute('data-theme', 'dark');

  /* tidy the scene up for the README screenshots */
  if (location.hash.startsWith('#card')) {
    S.bg.colour = '';
    const p2 = S.items.find(i => i.render === 'panel');
    setMount(p2, 'wall'); p2.face = plinth.id;
    p2.w = 22; p2.h = 10; p2.depth = 0.4; p2.textSize = 0.5;
    p2.text = 'Astrolabe by Georg Hartmann, Nuremberg, 1537. Brass, 14 cm diameter.';
    landOnFace(p2);
    p2.wallY = rnd(plinth.h - p2.h - 6);
    S.items.filter(i => i.type === 'object' && i !== p2 && i.name !== 'Astrolabe').forEach(i => i.hide = true);
    plinth.w = 34; plinth.d = 26;
    select(p2.id);
    renderLists();
  }
  if (location.hash.startsWith('#shot')) {
    S.name = 'Kepler case';
    S.bg.colour = '#3b2a1c';
    byId(S.items.find(i => isShape(i)).id).hide = true;
    const m = S.items.find(i => i.name === 'Manuscript');
    m.x = 16; m.z = 2; m.stand.w = 36; m.stand.d = 30;
    const a = S.items.find(i => i.name === 'Astrolabe');
    a.z = 10;
    const r = S.items.find(i => i.name === 'Rete');
    r.x = 62; r.hangY = 108;
    const p = S.items.find(i => i.render === 'panel');
    setMount(p, 'wall');
    p.face = 'back';
    p.name = 'Wall panel';
    p.x = 8; p.wallY = 118; p.w = 36; p.h = 24; p.textSize = 0.55;
    p.text = 'Instruments of the Rudolphine Tables\nPrague, 1601–1627';
    /* and a label stuck to the front of the plinth */
    select(plinth.id);
    addPanel();
    const lab = S.items[S.items.length - 1];
    lab.name = 'Plinth label';
    lab.w = 26; lab.h = 11; lab.textSize = 0.45;
    lab.text = 'Astrolabe by Georg Hartmann, Nuremberg, 1537.';
    lab.wallY = 22;
    renderLists();
  }

  S.level = 'all';
  setView(/plan$/.test(location.hash) ? 'plan' : 'front');
  select(location.hash.startsWith('#shot') ? null : (location.hash === '#plan' ? S.items.find(i => i.name === 'Manuscript').id : S.items.find(i => i.name === 'Astrolabe').id));
  if (location.hash === '#wiz') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'placed'; W.tool = 'erase';
    showWizard('Add object'); setStep(1);
  }
  if (location.hash === '#wiz2') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'placed'; W.widthCm = 34;
    showWizard('Add object'); setStep(2);
  }
  if (location.hash === '#export') { openExport(); }
  if (location.hash === '#wiz3') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'hanging'; W.points = [{ x: 200, y: 150 }, { x: 420, y: 150 }];
    showWizard('Add object'); setStep(3);
    ok(getComputedStyle(wizCv).cursor === 'crosshair', 'the wire step always shows a cursor, whatever brush was last used');
  }
  /* the mounting step with a placed object, where the lean field is */
  if (location.hash === '#wiz3p') {
    stage(photo(620, 800, { kind: 'ellipse', col: '#6b4a2f' }), 'Manuscript');
    W.mount = 'placed'; W.lean = 72; W.stand = { kind: 'cradle', w: 30, d: 26, h: 6 };
    showWizard('Add object'); setStep(3);
  }
  /* a panel fixed to a plinth face, with its own clearances */
  if (location.hash === '#face') {
    const pl = S.items.find(i => i.type === 'plinth');
    const pan = S.items.find(i => i.render === 'panel' && i.face === pl.id)
      || S.items.find(i => i.render === 'panel');
    pan.mount = 'wall'; pan.face = pl.id;
    pan.text = '**Astrolabe**\nBrass, Persian, dated 1073 AH. The rete carries twenty-eight star pointers.';
    pan.textSize = 0.5; pan.w = 24; pan.h = 12; pan.wallY = 20;
    pan.x = rnd(pl.x + (pl.w - pan.w) / 2, 2);
    select(pan.id); renderInspector();
  }
  /* the measuring tool, with a few lines already drawn */
  if (/^#measure/.test(location.hash)) {
    const plan = /plan$/.test(location.hash);
    setView(plan ? 'plan' : 'front');
    select(null);
    const a = S.items.find(i => i.name === 'Astrolabe');
    const pl = S.items.find(i => i.type === 'plinth');
    const b = bbox(a), f = footprint(a);
    S.measures = plan
      ? [{ id: 'q1', view: 'plan', ax: f.x + f.w / 2, ay: f.z + f.d / 2, bx: f.x + f.w / 2, by: S.cs.d },
      { id: 'q2', view: 'plan', ax: pl.x, ay: pl.z, bx: pl.x + pl.w, by: pl.z }]
      : [{ id: 'q1', view: 'front', ax: (b.x0 + b.x1) / 2, ay: (b.y0 + b.y1) / 2, bx: (b.x0 + b.x1) / 2, by: S.cs.h },
      { id: 'q2', view: 'front', ax: b.x1, ay: b.y0, bx: S.cs.w, by: b.y0 },
      { id: 'q3', view: 'front', ax: pl.x, ay: pl.h, bx: b.x0, by: b.y1 }];
    setMeasuring(true);
    renderLists();
  }
  if (location.hash === '#sched') { buildSchedule(); $('#schedBack').hidden = false; }
  if (location.hash === '#cases') {
    const mem = new Map();
    store.get = async k => mem.get(k); store.set = async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); return true; };
    S.projectId = 'c1'; S.name = 'Kepler case'; S.bg.colour = '#3b2a1c';
    await persistCurrent();
    S.projectId = 'c2'; S.name = 'Ptolemy case'; S.bg.colour = '#26303a';
    S.items = S.items.slice(0, 3); await persistCurrent();
    S.projectId = 'c3'; S.name = 'Instruments, bay 4'; S.bg.colour = '';
    S.items = S.items.slice(0, 2); await persistCurrent();
    await openCase('c1', true);
    render(); await openCases();
  }
  if (location.hash === '#shapes') { render(); openShapePicker('new'); }
  if (/preview/.test(location.hash)) {
    setView(/plan$/.test(location.hash) ? 'plan' : 'front');
    enterPreview();
    $('#previewBar').classList.remove('idle');
    clearTimeout(barIdleT);
    render();
  }
  render();
  log('done');
})();

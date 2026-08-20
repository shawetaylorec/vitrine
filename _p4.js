/* ============================================================
   Wiring
   ============================================================ */

function syncCaseFields() {
  $('#caseW').value = S.cs.w; $('#caseH').value = S.cs.h; $('#caseD').value = S.cs.d;
  $('#railH').value = S.rail;
  $('#optGrid').checked = S.opt.grid; $('#optDims').checked = S.opt.dims;
  $('#optSnap').checked = S.opt.snap; $('#optRulers').checked = S.opt.rulers !== false;
  $('#bgColour').value = S.bg.colour || defaultCaseColour();
  $('#bgFade').value = S.bg.fade ?? 100;
  $('#bgFadeVal').textContent = (S.bg.fade ?? 100) + '%';
  syncLockChrome();
}
function defaultCaseColour() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--case-fill').trim();
  return /^#[0-9a-f]{6}$/i.test(c) ? c : '#efeade';
}

/* case */
$('#caseW').addEventListener('change', e => { S.cs.w = clamp(num(e.target.value) || 140, 10, 600); commit(); });
$('#caseH').addEventListener('change', e => { S.cs.h = clamp(num(e.target.value) || 160, 10, 500); commit(); });
$('#caseD').addEventListener('change', e => { S.cs.d = clamp(num(e.target.value) || 40, 5, 300); commit(); });
$('#railH').addEventListener('change', e => {
  S.rail = num(e.target.value);
  for (const o of S.items) if (o.type === 'object' && o.mount === 'hanging') o.rail = S.rail;
  commit();
});
$('#optGrid').addEventListener('change', e => { S.opt.grid = e.target.checked; draw(); });
$('#optDims').addEventListener('change', e => { S.opt.dims = e.target.checked; draw(); });
$('#optSnap').addEventListener('change', e => { S.opt.snap = e.target.checked; });
$('#optRulers').addEventListener('change', e => { S.opt.rulers = e.target.checked; draw(); });
$('#levelFilter').addEventListener('change', e => { S.level = e.target.value; draw(); });

/* back wall */
$('#bgColour').addEventListener('input', e => { S.bg.colour = e.target.value; draw(); });
$('#bgColour').addEventListener('change', () => commit());
$('#bgFade').addEventListener('input', e => { S.bg.fade = +e.target.value; $('#bgFadeVal').textContent = S.bg.fade + '%'; draw(); });
$('#bgFade').addEventListener('change', () => commit());
/* the same picker serves the back wall and any plinth face */
let structImgFor = null;
$('#btnBgImg').onclick = () => { structImgFor = null; $('#fileBg').click(); };
$('#fileBg').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  const target = structImgFor; structImgFor = null;
  if (!f) return;
  if (/\.tiff?$/i.test(f.name) || f.type === 'image/tiff') { toast('Chrome cannot read TIFF — save it as PNG or JPEG first'); return; }
  try {
    const cv = await fileToCanvas(f);
    const url = cv.toDataURL('image/jpeg', 0.85);
    if (target) {
      const p = byId(target);
      if (!p) return;
      p.png = url; p.fade = p.fade ?? 100;
      BMP.set(p.id, await loadImage(url)); BMPSRC.set(p.id, url);
      commit(); toast(`Picture set on ${p.name}`);
    } else {
      S.bg.img = url;
      BGIMG = await loadImage(url);
      commit(); toast('Back wall image set');
    }
  } catch (err) { toast('Could not read that image'); }
});
$('#btnBgClear').onclick = () => { S.bg.img = null; S.bg.colour = ''; BGIMG = null; syncCaseFields(); commit(); };
/* a graphic is an ordinary object that happens to be fixed to the wall,
   so it goes through the same cut-out and sizing steps */
let wallGraphicNext = null;
$('#btnWallGraphic').onclick = () => {
  wallGraphicNext = { mount: 'wall', face: 'back', planShape: 'rect' };
  $('#fileImg').click();
};

/* structure and objects */
$('#btnShelf').onclick = addShelf;
$('#btnPlinth').onclick = addPlinth;
$('#btnShape').onclick = addShape;
$('#btnPanel').onclick = addPanel;

/* view */
$('#viewSeg').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('#zIn').onclick = () => { S.zoom = clamp(S.zoom * 1.25, 0.2, 12); updateZoomLabel(); draw(); };
$('#zOut').onclick = () => { S.zoom = clamp(S.zoom / 1.25, 0.2, 12); updateZoomLabel(); draw(); };
$('#zFit').onclick = fitView;

/* theme */
$('#btnTheme').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('vitrine-theme', dark ? 'light' : 'dark');
  if (!S.bg.colour) syncCaseFields();
  draw();
};
{
  const saved = localStorage.getItem('vitrine-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}

/* images in — button, drop, or paste */
const pickImages = () => $('#fileImg').click();
$('#btnAddImg').onclick = pickImages;
$('#btnAddImg2').onclick = pickImages;
$('#fileImg').addEventListener('change', e => {
  const preset = wallGraphicNext;
  wallGraphicNext = null;
  if (e.target.files.length) openWizardFiles(e.target.files, preset);
  e.target.value = '';
});
$('#fileTop').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = '';
  if (f && W.pendingTopFor) openTopWizard(W.pendingTopFor, f);
  W.pendingTopFor = null;
});

const stage = $('#stage');
['dragenter', 'dragover'].forEach(t => stage.addEventListener(t, e => { e.preventDefault(); stage.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(t => stage.addEventListener(t, e => {
  e.preventDefault();
  if (t === 'dragleave' && e.relatedTarget && stage.contains(e.relatedTarget)) return;
  stage.classList.remove('dragging');
}));
stage.addEventListener('drop', e => {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || /\.tiff?$/i.test(f.name));
  if (files.length) openWizardFiles(files);
});

document.addEventListener('paste', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;   /* let fields paste normally */

  const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
  if (files.length) {
    e.preventDefault();
    if (W.pendingTopFor) { openTopWizard(W.pendingTopFor, files[0]); W.pendingTopFor = null; return; }
    openWizardFiles(files);
    return;
  }

  /* text goes into the selected panel, so you can lift wording
     straight out of a label document */
  const text = (e.clipboardData?.getData('text/plain') || '').trim();
  if (!text) return;
  const o = byId(S.sel);
  if (o && o.type === 'object' && o.render === 'panel') {
    e.preventDefault();
    o.text = text;
    commit();
    toast(panelFits(o) ? 'Text pasted into the panel' : 'Pasted — it runs past the bottom of the panel');
  } else {
    toast('Select a panel first to paste text into it');
  }
});

/* ---------- wizard ---------- */
$('#wizClose').onclick = discardWizard;
$('#wizMin').onclick = minimiseWizard;
$('#btnResume').onclick = resumeWizard;
$('#wizBack').addEventListener('pointerdown', e => { if (e.target.id === 'wizBack') minimiseWizard(); });
$('#wizBack1').onclick = () => setStep(Math.max(1, W.step - 1));
$('#wizNext').onclick = () => { if (W.step === 3 || W.mode === 'top') finishWizard(); else setStep(W.step + 1); };
$('#wizSteps').addEventListener('click', e => {
  const b = e.target.closest('[data-step]'); if (!b) return;
  setStep(+b.dataset.step);
});

$('#tol').addEventListener('input', e => { W.tol = +e.target.value; $('#tolVal').textContent = W.tol; });
$('#tol').addEventListener('change', runAuto);
$('#erode').addEventListener('input', e => { W.erode = +e.target.value; $('#erodeVal').textContent = W.erode + ' px'; });
$('#erode').addEventListener('change', runAuto);
$('#brush').addEventListener('input', e => { W.brush = +e.target.value; $('#brushVal').textContent = W.brush + ' px'; drawWiz(); });
$('#btnAuto').onclick = runAuto;
$('#btnUndo').onclick = wizUndo;
$('#btnReset').onclick = () => { pushUndo(); W.work = copyCanvas(W.base); autoBB(); drawWiz(); refreshScale(); };
$('#btnBBReset').onclick = () => { autoBB(); drawWiz(); refreshScale(); };
$('#btnBBCrop').onclick = cropToBox;
$('#rotL').onclick = () => transformWork(rotCanvas(-1));
$('#rotR').onclick = () => transformWork(rotCanvas(1));
$('#flipH').onclick = () => transformWork(mirrorCanvas(false));
$('#flipV').onclick = () => transformWork(mirrorCanvas(true));

$('#brushTools').addEventListener('click', e => {
  const b = e.target.closest('[data-brush]'); if (!b) return;
  W.tool = b.dataset.brush;
  syncWizFields(); setWizCursor(); updateHint(); drawWiz();
});
$('#cutMode').addEventListener('click', e => {
  const b = e.target.closest('[data-cut]'); if (!b) return;
  W.cutMode = b.dataset.cut;
  syncWizFields();
  runAuto();
});
$('#wzIn').onclick = () => { W.zoom = clamp(W.zoom * 1.3, 0.15, 24); drawWiz(); };
$('#wzOut').onclick = () => { W.zoom = clamp(W.zoom / 1.3, 0.15, 24); drawWiz(); };
$('#wzFit').onclick = () => { W.zoom = 1; W.pan = { x: 0, y: 0 }; drawWiz(); };

$('#scaleTools').addEventListener('click', e => {
  const b = e.target.closest('[data-scale]'); if (!b) return;
  W.scaleMode = b.dataset.scale;
  syncWizFields(); updateHint(); refreshScale(); drawWiz();
});
$('#keepAspect').addEventListener('change', e => {
  W.keepAspect = e.target.checked;
  $('#scaleHelp').textContent = W.keepAspect
    ? 'Type either measurement and the other follows the picture.'
    : 'Width and height are set independently — the picture will be stretched to match.';
  refreshScale();
});
$('#objW').addEventListener('input', e => {
  W.widthCm = num(e.target.value);
  if (W.keepAspect && W.bb && W.bb.w) {
    W.heightCm = rnd(W.bb.h * (W.widthCm / W.bb.w), 2);
    const hi = $('#objH'); if (document.activeElement !== hi) hi.value = W.heightCm;
  }
  refreshScale();
});
$('#objH').addEventListener('input', e => {
  W.heightCm = num(e.target.value);
  if (W.keepAspect && W.bb && W.bb.h) {
    W.widthCm = rnd(W.bb.w * (W.heightCm / W.bb.h), 2);
    const wi = $('#objW'); if (document.activeElement !== wi) wi.value = W.widthCm;
  }
  refreshScale();
});
$('#lineCm').addEventListener('input', e => { W.lineCm = num(e.target.value); refreshScale(); });
$('#objD').addEventListener('input', e => { W.depthCm = Math.max(0.1, num(e.target.value)); });
$('#objName').addEventListener('input', e => { W.name = e.target.value; });

$('#lean').addEventListener('input', e => {
  const shown = +e.target.value;
  W.lean = W.leanFrom === 'flat' ? 90 - shown : shown;
  $('#leanNum').value = shown;
});
$('#leanNum').addEventListener('change', e => {
  const shown = clamp(num(e.target.value), 0, 90);
  W.lean = W.leanFrom === 'flat' ? 90 - shown : shown;
  syncLeanFields();
});
$('#leanFrom').addEventListener('change', e => { W.leanFrom = e.target.value; syncLeanFields(); });
$('#wallYNum').addEventListener('change', e => { W.wallY = num(e.target.value); });
$('#faceSel').addEventListener('change', e => { W.face = e.target.value; });
$('#supportSel').addEventListener('change', e => { W.support = e.target.value; });
$('#planShape').addEventListener('change', e => { W.planShape = e.target.value; });
$('#btnTopView').onclick = () => {
  if (!W.editId) { toast('Add the object first, then attach a top view from the panel on the right'); return; }
  W.pendingTopFor = W.editId;
  minimiseWizard();
  $('#fileTop').click();
};

$('#standKind').addEventListener('change', e => {
  const kind = e.target.value;
  if (kind === 'none') W.stand = { kind: 'none', w: 0, d: 0, h: 0 };
  else W.stand = {
    kind,
    w: W.stand.w || rnd(Math.max(4, W.widthCm * 0.6)),
    d: W.stand.d || rnd(Math.max(4, W.depthCm + 2)),
    h: W.stand.h || (kind === 'cradle' ? 6 : 4)
  };
  syncStandFields();
});
$('#standW').addEventListener('change', e => { W.stand.w = Math.max(0.5, num(e.target.value)); });
$('#standD').addEventListener('change', e => { W.stand.d = Math.max(0.5, num(e.target.value)); });
$('#standH').addEventListener('change', e => { W.stand.h = Math.max(0, num(e.target.value)); });

$('#mountTools').addEventListener('click', e => {
  const b = e.target.closest('[data-mount]'); if (!b) return;
  W.mount = b.dataset.mount;
  syncWizFields(); renderSupportSel(); updateHint(); drawWiz();
});
$('#btnClearWires').onclick = () => { W.points = []; drawWiz(); renderWirePanel(); };

/* files */
$('#btnSave').onclick = () => {
  download(new Blob([JSON.stringify(snapshot())], { type: 'application/json' }), `${S.name.replace(/[^\w -]+/g, '') || 'case'}.vitrine.json`);
};
$('#fileJson').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    await persistCurrent();               /* keep whatever you were on */
    const ok = await restore(JSON.parse(await f.text()));
    if (!ok) { toast('That file has no case in it'); return; }
    S.projectId = uid();                  /* an opened file becomes its own case */
    await persistCurrent();
    closeCases();
    toast(`Opened “${S.name}” — it is now one of your cases`);
  } catch (err) { toast('Could not read that file'); }
});
$('#btnExportPng').onclick = openExport;
$('#expClose').onclick = closeExport;
$('#expBack').addEventListener('pointerdown', e => { if (e.target.id === 'expBack') closeExport(); });
$('#expGo').onclick = runExport;
$('#expFormat').addEventListener('click', e => {
  const b = e.target.closest('[data-fmt]'); if (!b) return;
  EXP.fmt = b.dataset.fmt; syncExport();
});
$('#expView').addEventListener('click', e => {
  const b = e.target.closest('[data-ev]'); if (!b) return;
  EXP.view = b.dataset.ev; syncExport();
});
$('#expScale').addEventListener('click', e => {
  const b = e.target.closest('[data-sc]'); if (!b) return;
  EXP.scale = +b.dataset.sc; syncExport();
});
$('#expStyle').addEventListener('click', e => {
  const b = e.target.closest('[data-st]'); if (!b) return;
  EXP.style = b.dataset.st; syncExport();
});
$('#expMarks').addEventListener('click', e => {
  const b = e.target.closest('[data-mk]'); if (!b) return;
  EXP.marks = b.dataset.mk; syncExport();
});
for (const [id, key] of [['expRulers', 'rulers'], ['expGrid', 'grid'], ['expCaption', 'caption']]) {
  $('#' + id).addEventListener('change', e => { EXP[key] = e.target.checked; syncExport(); });
}

/* ---------- the case library ---------- */
async function renderCases() {
  const ix = (await loadIndex()).sort((a, b) => b.updated - a.updated);
  const list = $('#caseList');
  if (!ix.length) {
    list.innerHTML = '<p class="empty" style="padding:6px">No saved cases yet. Whatever you draw is filed here automatically.</p>';
  } else {
    list.innerHTML = ix.map(r => `
      <div class="casecard" data-open="${r.id === S.projectId ? 1 : 0}">
        <img class="shot" data-open-id="${r.id}" src="${r.thumb || ''}" alt="${esc(r.name)}" title="Open this case">
        <div class="meta">
          <span class="nm">${esc(r.name)}${r.id === S.projectId ? ' — open' : ''}</span>
          <span class="sub">${r.objects || 0} object${r.objects === 1 ? '' : 's'} · ${r.cs ? `${rnd(r.cs.w)}&times;${rnd(r.cs.h)}` : ''} · ${ago(r.updated)}</span>
        </div>
        <div class="acts">
          <button data-rename="${r.id}">Rename</button>
          <button data-dup="${r.id}">Copy</button>
          <button class="del" data-del="${r.id}">Delete</button>
        </div>
      </div>`).join('');
  }
  $('#casesFoot').textContent = ix.length
    ? `${ix.length} case${ix.length === 1 ? '' : 's'} kept in this browser. Use Save file for anything you want off the machine.`
    : 'Cases live in this browser. Use Save file for anything you want off the machine.';

  for (const el of $$('[data-open-id]')) el.onclick = async () => {
    if (el.dataset.openId === S.projectId) { closeCases(); return; }
    await persistCurrent();
    await openCase(el.dataset.openId);
    closeCases();
  };
  for (const el of $$('[data-rename]')) el.onclick = async () => {
    const cur = (await loadIndex()).find(r => r.id === el.dataset.rename);
    const nm = prompt('Name for this case', cur ? cur.name : '');
    if (nm === null) return;
    await renameCase(el.dataset.rename, nm);
    renderCases();
  };
  for (const el of $$('[data-dup]')) el.onclick = async () => { await duplicateCase(el.dataset.dup); renderCases(); };
  for (const el of $$('[data-del]')) el.onclick = async () => { await deleteCase(el.dataset.del); renderCases(); };
}
async function openCases() { $('#casesBack').hidden = false; await persistCurrent(); renderCases(); }
function closeCases() { $('#casesBack').hidden = true; }

$('#btnCases').onclick = openCases;
$('#casesClose').onclick = closeCases;
$('#casesBack').addEventListener('pointerdown', e => { if (e.target.id === 'casesBack') closeCases(); });
$('#btnNewCase').onclick = async () => { await newCase(); renderCases(); };
$('#btnImportCase').onclick = () => $('#fileJson').click();

/* ---------- folding the left rail ---------- */
{
  const folded = new Set(JSON.parse(localStorage.getItem('vitrine-folded') || '[]'));
  $$('.rail-left .sect').forEach((sect, i) => {
    const h = sect.querySelector('h2');
    if (!h) return;
    const key = h.textContent.trim() || String(i);
    const chev = document.createElement('i');
    chev.className = 'chev';
    chev.textContent = '▼';
    h.insertBefore(chev, h.firstChild);
    if (folded.has(key)) sect.classList.add('folded');
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    const toggle = () => {
      sect.classList.toggle('folded');
      sect.classList.contains('folded') ? folded.add(key) : folded.delete(key);
      localStorage.setItem('vitrine-folded', JSON.stringify([...folded]));
    };
    h.addEventListener('click', toggle);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

/* undo */
$('#btnUndoStep').onclick = undo;
$('#btnRedoStep').onclick = redo;

/* preview */
$('#btnLock').onclick = () => toggleLock();
$('#btnPreview').onclick = enterPreview;
$('#pvExit').onclick = exitPreview;
$('#pvSeg').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('#pvIn').onclick = () => { S.zoom = clamp(S.zoom * 1.25, 0.2, 12); updateZoomLabel(); draw(); };
$('#pvOut').onclick = () => { S.zoom = clamp(S.zoom / 1.25, 0.2, 12); updateZoomLabel(); draw(); };
$('#pvFit').onclick = fitView;
$('#previewBar').addEventListener('pointerenter', nudgeBar);
/* leaving full screen by any other route — F11, the browser's own Esc —
   should drop the mode too, or the chrome stays hidden */
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) exitPreview(); });

/* shape picker */
$('#shapeClose').onclick = closeShapePicker;
$('#shapeBack').addEventListener('pointerdown', e => { if (e.target.id === 'shapeBack') closeShapePicker(); });

/* schedule */
$('#btnSchedule').onclick = () => { buildSchedule(); $('#schedBack').hidden = false; };
$('#schedClose').onclick = () => { $('#schedBack').hidden = true; };
$('#schedBack').addEventListener('pointerdown', e => { if (e.target.id === 'schedBack') $('#schedBack').hidden = true; });
$('#schedCopy').onclick = async () => {
  try { await navigator.clipboard.writeText($('#schedTable').dataset.tsv || ''); toast('Schedule copied — paste into a spreadsheet'); }
  catch (e) { toast('Clipboard blocked by the browser'); }
};

/* resize */
const ro = new ResizeObserver(() => { draw(); if (W.open) drawWiz(); });
ro.observe($('#stage'));
ro.observe($('#wizStage'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!S.bg.colour) syncCaseFields(); draw(); });

/* ============================================================
   Boot
   ============================================================ */

(async function boot() {
  syncCaseFields();
  updateZoomLabel();
  setView('front');
  renderLists(); renderInspector(); draw();
  window.addEventListener('resize', () => draw());
  resetUndo();                       /* history starts from the empty case */
  try {
    const ix = await loadIndex();
    /* Reading storage takes a moment — long enough to start working in an
       apparently empty case. If anything has been changed by the time it
       arrives, that is the real work: leave it alone. */
    if (UNDO.length) { S.projectId = S.projectId || uid(); return; }

    if (ix.length) {
      const last = await store.get('lastOpen');
      const pick = ix.find(r => r.id === last) || ix.sort((a, b) => b.updated - a.updated)[0];
      await openCase(pick.id, true);
    } else {
      /* one-off lift of the single case older builds kept */
      const legacy = await store.get('current');
      if (legacy) {
        await restore(legacy);
        S.projectId = uid();
        await persistCurrent();
        await store.del('current');
      } else {
        S.projectId = uid();
      }
    }
  } catch (e) { S.projectId = S.projectId || uid(); }
})();

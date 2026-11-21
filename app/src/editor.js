// NEON RAIN — editor wiring: pickers, photo tray, captions, panel gestures,
// mini previews, undo/redo. The preview canvas renders the live document.

import { SIZES, SAMPLE_CAST, cloneDoc } from './state.js';
import { GRADES } from './grades.js';
import { getLayout, LAYOUTS } from './layouts.js';
import { renderCover, panelAt } from './render.js';
import { registry, loadPhotoFromFile, loadSampleCast, autoFill, imageFilesFrom } from './photos.js';
import { scoreFace } from './face.js';
import { exportCoverPng, exportAllSizes } from './export.js';

export const TYPE_STYLES = [
  { id: 'anton', label: 'Rain Chrome', desc: 'Anton striped chrome', sw: 'linear-gradient(135deg,#fff,#22d3ee 55%,#e8318a)' },
  { id: 'serif', label: 'Rain Serif', desc: 'Playfair gold-foil serif', sw: 'linear-gradient(135deg,#ffe27a,#b8860b)' },
  { id: 'script', label: 'Neon Script', desc: 'Caveat neon script title', sw: 'linear-gradient(135deg,#ff7ae0,#7a2d8a)' },
];

export function buildEditor(ctx) {
  const { doc, history, canvas, status } = ctx;
  let selected = -1;
  let pickedPhoto = null;
  let drag = null;

  const $ = (id) => document.getElementById(id);
  const setStatus = (t) => { status.textContent = t; };

  function commit(next, label) {
    history.push(next);
    ctx.doc = history.doc;
    refresh();
    if (label) setStatus(label);
  }

  // ---- Pickers ------------------------------------------------------------
  function buildPickers() {
    const lp = $('layoutPicker');
    lp.innerHTML = '';
    for (const l of LAYOUTS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick' + (ctx.doc.layout === l.id ? ' on' : '');
      b.innerHTML = `<span class="sw" style="background:linear-gradient(135deg,#131b36,#22d3ee)"></span><span>${l.label}<small>${l.desc}</small></span>`;
      b.onclick = () => { const d = cloneDoc(ctx.doc); d.layout = l.id; commit(d, 'Layout: ' + l.label); };
      lp.appendChild(b);
    }
    const gp = $('gradePicker');
    gp.innerHTML = '';
    for (const g of GRADES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick' + (ctx.doc.grade === g.id ? ' on' : '');
      b.innerHTML = `<span class="sw" style="background:${g.sw}"></span><span>${g.label}<small>${g.desc}</small></span>`;
      b.onclick = () => { const d = cloneDoc(ctx.doc); d.grade = g.id; commit(d, 'Grade: ' + g.label); };
      gp.appendChild(b);
    }
    const tp = $('typePicker');
    tp.innerHTML = '';
    for (const t of TYPE_STYLES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick' + (ctx.doc.titleFont === t.id ? ' on' : '');
      b.innerHTML = `<span class="sw" style="background:${t.sw}"></span><span>${t.label}<small>${t.desc}</small></span>`;
      b.onclick = () => { const d = cloneDoc(ctx.doc); d.titleFont = t.id; commit(d, 'Type: ' + t.label); };
      tp.appendChild(b);
    }
  }

  // ---- Photo tray -----------------------------------------------------------
  function buildTray() {
    const tray = $('photoTray');
    tray.innerHTML = '';
    const used = new Set(ctx.doc.panels.map((p) => p.photo));
    for (const p of registry.values()) {
      const img = document.createElement('img');
      // Thumbnail from a small canvas (file photos use revoked blob URLs).
      const tc = document.createElement('canvas');
      tc.width = 60; tc.height = 80;
      const tctx = tc.getContext('2d');
      const s = Math.max(p.img.width / 60, p.img.height / 80);
      tctx.drawImage(p.img, (p.img.width - 60 * s) / 2, (p.img.height - 80 * s) / 2, 60 * s, 80 * s, 0, 0, 60, 80);
      img.src = tc.toDataURL('image/jpeg', 0.7);
      img.alt = p.name;
      img.title = p.name;
      img.className = (pickedPhoto === p.id ? 'sel ' : '') + (used.has(p.name) ? 'used' : '');
      img.onclick = () => {
        pickedPhoto = p.id;
        if (selected >= 0) {
          const d = cloneDoc(ctx.doc);
          d.panels[selected].photo = p.name;
          d.panels[selected].zoom = 1; d.panels[selected].panX = 0; d.panels[selected].panY = 0;
          commit(d, 'Placed ' + p.name + ' in panel ' + (selected + 1));
        }
        buildTray();
      };
      tray.appendChild(img);
    }
  }

  // ---- Captions ---------------------------------------------------------------
  function bindCaption(id, key) {
    const el = $(id);
    el.value = ctx.doc[key] || '';
    el.oninput = () => {
      const d = cloneDoc(ctx.doc);
      d[key] = el.value;
      history.push(d); ctx.doc = history.doc; render();
    };
  }
  function bindCaptions() {
    bindCaption('fTitle', 'title'); bindCaption('fScript', 'script');
    bindCaption('fTagline', 'tagline'); bindCaption('fQuote', 'quote');
    bindCaption('fQuoteSource', 'quoteSource'); bindCaption('fEdition', 'edition');
    bindCaption('fSeal', 'seal'); bindCaption('fRelease', 'release');
    bindCaption('fBilling', 'billing');
  }

  function syncPanelFields() {
    const p = selected >= 0 ? ctx.doc.panels[selected] : null;
    $('fTag').value = p ? p.tag : '';
    $('fLoc').value = p ? p.loc : '';
    $('panelLabel').textContent = p ? `Panel ${selected + 1} — ${p.tag || 'untagged'}` : 'No panel selected';
    $('zoomSlider').value = p ? Math.round((p.zoom || 1) * 100) : 100;
  }
  $('fTag').oninput = () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc); d.panels[selected].tag = $('fTag').value;
    history.push(d); ctx.doc = history.doc; render();
  };
  $('fLoc').oninput = () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc); d.panels[selected].loc = $('fLoc').value;
    history.push(d); ctx.doc = history.doc; render();
  };

  // ---- Preview render + minis ---------------------------------------------------
  function render() {
    const size = SIZES[ctx.doc.size];
    const out = renderCover(ctx.doc, ctx.doc.size);
    canvas.width = size.w; canvas.height = size.h;
    const c2 = canvas.getContext('2d');
    c2.drawImage(out, 0, 0);
    // Selection overlay: magenta outline + number badge on the selected panel.
    if (selected >= 0) {
      const layout = getLayout(ctx.doc.layout, ctx.doc.size);
      const p = layout.panels[selected];
      if (p) {
        const sx = p.x * size.w, sy = p.y * size.h, sw = p.w * size.w, sh = p.h * size.h;
        c2.save();
        c2.strokeStyle = '#ff2e9a'; c2.lineWidth = Math.max(3, size.w * 0.003);
        c2.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        const bs = Math.max(26, size.w * 0.028);
        c2.fillStyle = '#ff2e9a';
        c2.beginPath(); c2.arc(sx + bs * 0.7, sy + bs * 0.7, bs / 2, 0, Math.PI * 2); c2.fill();
        c2.fillStyle = '#fff';
        c2.font = `700 ${Math.round(bs * 0.55)}px sans-serif`;
        c2.textAlign = 'center'; c2.textBaseline = 'middle';
        c2.fillText(String(selected + 1), sx + bs * 0.7, sy + bs * 0.72);
        c2.restore();
      }
    }
    renderMinis();
    $('undoBtn').disabled = !history.canUndo();
    $('redoBtn').disabled = !history.canRedo();
    syncPanelFields();
  }

  function renderMinis() {
    const minis = $('minis');
    minis.innerHTML = '';
    for (const key of Object.keys(SIZES)) {
      const div = document.createElement('div');
      div.className = 'mini' + (ctx.doc.size === key ? ' on' : '');
      const mc = document.createElement('canvas');
      const small = renderCover(ctx.doc, key);
      const scale = 220 / small.width;
      mc.width = 220; mc.height = Math.round(small.height * scale);
      mc.getContext('2d').drawImage(small, 0, 0, mc.width, mc.height);
      const sp = document.createElement('span');
      sp.textContent = SIZES[key].label + ' · ' + SIZES[key].w + '×' + SIZES[key].h;
      div.appendChild(mc); div.appendChild(sp);
      div.onclick = () => { const d = cloneDoc(ctx.doc); d.size = key; commit(d, 'Size: ' + SIZES[key].label); };
      minis.appendChild(div);
    }
  }

  // ---- Panel gestures -------------------------------------------------------------
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    return { px, py };
  }
  canvas.addEventListener('pointerdown', (e) => {
    const { px, py } = canvasPoint(e);
    const idx = panelAt(ctx.doc, ctx.doc.size, px, py);
    selected = idx;
    if (idx >= 0) {
      drag = { idx, startX: px, startY: py, moved: false, panX: ctx.doc.panels[idx].panX || 0, panY: ctx.doc.panels[idx].panY || 0 };
      canvas.setPointerCapture(e.pointerId);
    }
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { px, py } = canvasPoint(e);
    const dx = px - drag.startX, dy = py - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 0.004) drag.moved = true;
    if (drag.moved) {
      const d = cloneDoc(ctx.doc);
      d.panels[drag.idx].panX = drag.panX + dx * 1.4;
      d.panels[drag.idx].panY = drag.panY + dy * 1.4;
      history.push(d); ctx.doc = history.doc; render();
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && drag.moved) setStatus(`Panel ${drag.idx + 1} panned`);
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc);
    const p = d.panels[selected];
    p.zoom = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.12 : 0.89)));
    history.push(d); ctx.doc = history.doc; render();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc);
    const p = d.panels[selected];
    p.zoom = 1; p.panX = 0; p.panY = 0;
    commit(d, 'Panel ' + (selected + 1) + ' reset');
  });
  $('zoomSlider').oninput = () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc);
    d.panels[selected].zoom = Number($('zoomSlider').value) / 100;
    history.push(d); ctx.doc = history.doc; render();
  };

  // ---- Toolbar / topbar ---------------------------------------------------------------
  $('undoBtn').onclick = () => { const d = history.undo(); if (d) { ctx.doc = d; refresh(); } };
  $('redoBtn').onclick = () => { const d = history.redo(); if (d) { ctx.doc = d; refresh(); } };
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      const d = e.shiftKey ? history.redo() : history.undo();
      if (d) { ctx.doc = d; refresh(); }
    }
  });
  $('samplesBtn').onclick = async () => {
    setStatus('Loading samples…');
    await loadSampleCast();
    const heroIndex = getLayout(ctx.doc.layout, ctx.doc.size).hero;
    const d = autoFill(ctx.doc, scoreFace, heroIndex, SAMPLE_CAST.map((s) => s.file));
    commit(d, 'Samples loaded and auto-filled');
    buildTray();
  };
  $('autoBtn').onclick = () => {
    const heroIndex = getLayout(ctx.doc.layout, ctx.doc.size).hero;
    const d = autoFill(ctx.doc, scoreFace, heroIndex, SAMPLE_CAST.map((s) => s.file));
    commit(d, 'Auto-filled panels');
  };
  $('prevPhotoBtn').onclick = () => stepPhoto(-1);
  $('nextPhotoBtn').onclick = () => stepPhoto(1);
  function stepPhoto(dir) {
    if (selected < 0) return;
    const names = [...registry.values()].map((p) => p.name);
    if (!names.length) return;
    const cur = names.indexOf(ctx.doc.panels[selected].photo);
    const d = cloneDoc(ctx.doc);
    d.panels[selected].photo = names[(cur + dir + names.length) % names.length];
    d.panels[selected].zoom = 1; d.panels[selected].panX = 0; d.panels[selected].panY = 0;
    commit(d, 'Panel photo stepped');
  }
  $('flipBtn').onclick = () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc);
    d.panels[selected].flip = !d.panels[selected].flip;
    commit(d, 'Panel flipped');
  };
  $('resetPanelBtn').onclick = () => {
    if (selected < 0) return;
    const d = cloneDoc(ctx.doc);
    const p = d.panels[selected];
    p.zoom = 1; p.panX = 0; p.panY = 0; p.flip = false;
    commit(d, 'Panel ' + (selected + 1) + ' reset');
  };
  document.querySelectorAll('.sizes button').forEach((b) => {
    b.onclick = () => {
      const d = cloneDoc(ctx.doc); d.size = b.dataset.size;
      commit(d, 'Size: ' + SIZES[d.size].label);
    };
  });
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.onclick = async () => {
      setStatus('Exporting…');
      const name = await exportCoverPng(ctx.doc, b.dataset.export);
      setStatus('Saved ' + name);
    };
  });
  $('exportAllBtn').onclick = async () => {
    setStatus('Exporting all 3…');
    const names = await exportAllSizes(ctx.doc);
    setStatus('Saved ' + names.join(', '));
  };
  $('photoInput').addEventListener('change', async (e) => {
    for (const f of e.target.files) await loadPhotoFromFile(f);
    buildTray();
    setStatus(e.target.files.length + ' photo(s) added');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = imageFilesFrom(e.dataTransfer);
    for (const f of files) await loadPhotoFromFile(f);
    if (files.length) { buildTray(); setStatus(files.length + ' photo(s) dropped'); }
  });
  window.addEventListener('paste', async (e) => {
    const files = imageFilesFrom(e.clipboardData);
    for (const f of files) await loadPhotoFromFile(f);
    if (files.length) { buildTray(); setStatus(files.length + ' photo(s) pasted'); }
  });

  function refresh() {
    document.querySelectorAll('.sizes button').forEach((b) => b.classList.toggle('on', b.dataset.size === ctx.doc.size));
    buildPickers();
    buildTray();
    render();
  }

  buildPickers();
  buildTray();
  bindCaptions();
  refresh();
  return { refresh, render, get selected() { return selected; } };
}

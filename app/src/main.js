// NEON RAIN — wires the page: fonts, samples, editor, shot mode, test hook.
// A `?shot=` query sets up a fixed scene for a screenshot instead of the editor.

import { defaultDoc, createHistory, SAMPLE_CAST } from './state.js';
import { buildEditor } from './editor.js';
import { loadSampleCast, autoFill, registry } from './photos.js';
import { scoreFace, findFace } from './face.js';
import { renderCover, renderCoverDataURL } from './render.js';
import { getLayout } from './layouts.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const shotSize = params.get('size') || '16x9';

const history = createHistory(defaultDoc());
const ctx = {
  doc: history.doc,
  history,
  canvas: document.getElementById('cover'),
  status: document.getElementById('status'),
};

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('900 100px "NR Anton"'),
      document.fonts.load('400 60px "NR Caveat"'),
      document.fonts.load('700 60px "NR Playfair"'),
      document.fonts.ready,
    ]);
  } catch { /* fallback fonts if a file fails to load */ }
}

async function loadSamplesAndFill() {
  await loadSampleCast();
  const heroIndex = getLayout(ctx.doc.layout, ctx.doc.size).hero;
  const filled = autoFill(ctx.doc, scoreFace, heroIndex, SAMPLE_CAST.map((s) => s.file));
  history.push(filled);
  ctx.doc = history.doc;
  // Warm the face cache so the first render is fast and deterministic.
  for (const p of registry.values()) findFace(p);
}

if (shot) {
  // Screenshot mode: no editor chrome, fixed deterministic scene.
  document.body.classList.add('shot-cover');
  const shotCanvas = document.getElementById('shot');
  const size = shot === 'cover' ? shotSize : '16x9';
  const layoutParam = params.get('layout');
  if (layoutParam) ctx.doc.layout = layoutParam;
  await waitForFonts();
  await loadSamplesAndFill();
  if (shot === 'editor') {
    // Editor screenshot: show the editor UI with samples loaded.
    document.body.classList.remove('shot-cover');
    const ed = buildEditor(ctx);
    ed.refresh();
    document.title = 'NEON RAIN — editor';
    window.rainStudioReady = true;
  } else {
    const out = renderCover(ctx.doc, size);
    shotCanvas.width = out.width;
    shotCanvas.height = out.height;
    shotCanvas.getContext('2d').drawImage(out, 0, 0);
    document.title = 'NEON RAIN — ' + size;
    window.rainStudioReady = true;
  }
} else {
  await waitForFonts();
  buildEditor(ctx);
}

window.rainStudio = {
  loadSamples: async () => { await loadSamplesAndFill(); return registry.size; },
  setSize: (s) => { ctx.doc.size = s; },
  setLayout: (l) => { ctx.doc.layout = l; },
  setGrade: (g) => { ctx.doc.grade = g; },
  selectPanel: (i) => i,
  renderCoverDataURL: (size) => renderCoverDataURL(ctx.doc, size || ctx.doc.size),
  faceReport: () => [...registry.values()].map((p) => ({ name: p.name, face: findFace(p), score: scoreFace(p) })),
  getDoc: () => JSON.parse(JSON.stringify(ctx.doc)),
};

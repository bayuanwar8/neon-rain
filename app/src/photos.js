// NEON RAIN — photo registry: file intake, sample cast, baked-image cache.
// Photos never leave the device. A photo is {id, name, img, w, h, face, baked, bakedGrade}.

import { SAMPLE_CAST } from './state.js';

let counter = 0;
export const registry = new Map(); // id -> photo

export function registerPhoto(img, name, faceHint = null, faceBox = null) {
  const id = 'p' + (++counter) + '-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const photo = { id, name, img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, face: null, faceHint, faceBox, baked: null, bakedGrade: null };
  registry.set(id, photo);
  return photo;
}

export function photoByFile(file) {
  for (const p of registry.values()) if (p.name === file) return p;
  return null;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + url));
    img.src = url;
  });
}

export async function loadPhotoFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return registerPhoto(img, file.name);
  } finally { URL.revokeObjectURL(url); }
}

export function imageFilesFrom(dataTransfer) {
  const out = [];
  for (const f of dataTransfer.files || []) if (f.type.startsWith('image/')) out.push(f);
  return out;
}

// Loads every sample cast photo once. Returns the list of registered photos.
export async function loadSampleCast() {
  const loaded = [];
  for (const s of SAMPLE_CAST) {
    const existing = photoByFile(s.file);
    if (existing) { loaded.push(existing); continue; }
    try {
      const img = await loadImage('./samples/' + s.file);
      // Sample metadata: the cast knows which files are portraits, and each
      // portrait carries its hand-tagged head box (see state.js).
      loaded.push(registerPhoto(img, s.file, s.face ? 'portrait' : 'scene', s.faceBox || null));
    } catch { /* a missing sample is skipped, the panel stays empty */ }
  }
  return loaded;
}

// Auto-fill: every panel gets a different photo. The tag belongs to the CAST
// MEMBER, not the panel, so when a photo moves, its tag/location/story move
// with it. The cast lead (first preferred name) goes to the HERO panel first;
// remaining panels take the cast in order, then the best-scored leftovers.
// `rank` is a function(photo) -> quality 0..1 (from face.js). Scene photos rank low.
export function autoFill(doc, rank, heroIndex = 0, preferred = []) {
  const photos = [...registry.values()];
  if (!photos.length) return doc;
  const scored = photos.map((p) => ({ p, s: rank(p) })).sort((a, b) => b.s - a.s);
  const byName = new Map(photos.map((p) => [p.name, p]));
  const castByFile = new Map(SAMPLE_CAST.map((s) => [s.file, s]));
  const used = new Set();
  const next = JSON.parse(JSON.stringify(doc));
  const assign = (i, photo) => {
    if (!photo || used.has(photo.id)) return;
    used.add(photo.id);
    const panel = next.panels[i];
    panel.photo = photo.name;
    panel.zoom = 1; panel.panX = 0; panel.panY = 0;
    const cast = castByFile.get(photo.name);
    if (cast) { panel.tag = cast.tag; panel.loc = cast.loc; panel.story = cast.story; }
  };
  // Hero first: the cast lead if present, else the best-scored photo.
  assign(heroIndex, (preferred[0] && byName.get(preferred[0])) || scored[0].p);
  const queue = preferred.slice(1).map((n) => byName.get(n)).filter(Boolean)
    .concat(scored.map((e) => e.p));
  let q = 0;
  for (let i = 0; i < next.panels.length; i++) {
    if (i === heroIndex) continue;
    while (q < queue.length && used.has(queue[q].id)) q++;
    if (q < queue.length) assign(i, queue[q++]);
  }
  return next;
}

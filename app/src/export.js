// NEON RAIN — PNG export at exact pixel sizes.

import { SIZES } from './state.js';
import { renderCover } from './render.js';

function download(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve(filename);
    }, 'image/png');
  });
}

export async function exportCoverPng(doc, sizeKey) {
  const size = SIZES[sizeKey];
  const canvas = renderCover(doc, sizeKey);
  const safe = (doc.title || 'cover').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return download(canvas, `${safe}-${size.w}x${size.h}.png`);
}

export async function exportAllSizes(doc) {
  const out = [];
  for (const key of Object.keys(SIZES)) out.push(await exportCoverPng(doc, key));
  return out;
}

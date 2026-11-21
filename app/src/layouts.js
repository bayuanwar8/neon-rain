// NEON RAIN — six layouts, each composed separately per ratio (never cropped).
// Coordinates are 0..1 of the full cover. The top bar occupies y 0..0.07 and the
// billing strip y 0.94..1. Panels live between them. A layout returns panel rects
// (optional slant = parallelogram offset of the top edge), the hero index, and
// the title / script / tagline zones.

export const LAYOUTS = [
  { id: 'mosaic', label: 'Rain Mosaic', desc: 'Hero top-centre, title band, four below' },
  { id: 'popout', label: 'Hero Pop-Out', desc: 'Hero breaks its frame over the title' },
  { id: 'triptych', label: 'Neon Triptych', desc: 'Three tall panels, title across' },
  { id: 'split', label: 'Alley Split', desc: 'Wide hero, cast column on the right' },
  { id: 'editorial', label: 'Editorial Four', desc: 'Four big panels, title band below' },
  { id: 'premium', label: 'Premium Seven', desc: 'Seven diagonal blades' },
];

const R = (x, y, w, h, extra = {}) => ({ x, y, w, h, ...extra });
const GUT = 0.012; // gutter between panels

function mosaic(ratio) {
  const top = 0.075, bot = 0.935;
  // Dedicated title band (0.42..0.64): no panel sits behind it, so the title,
  // script and tagline can never cover a face. Panels live above and below.
  if (ratio === '16x9') {
    const panels = [
      R(0.015, top, 0.275, 0.42 - top),
      R(0.302, top, 0.396, 0.42 - top),
      R(0.71, top, 0.275, 0.42 - top),
    ];
    const bw = (0.97 - 3 * GUT) / 4, bh = bot - 0.64;
    for (let c = 0; c < 4; c++) panels.push(R(0.015 + c * (bw + GUT), 0.64, bw, bh));
    return { panels, hero: 1, title: R(0.03, 0.42, 0.94, 0.12), script: R(0.03, 0.54, 0.94, 0.05), tagline: R(0.03, 0.59, 0.94, 0.045) };
  }
  // 1:1 and 4:5: same band structure, hero top-centre.
  const panels = [
    R(0.015, top, 0.26, 0.42 - top),
    R(0.285, top, 0.43, 0.42 - top),
    R(0.73, top, 0.255, 0.42 - top),
  ];
  const bw = (0.97 - 3 * GUT) / 4, bh = bot - 0.64;
  for (let c = 0; c < 4; c++) panels.push(R(0.015 + c * (bw + GUT), 0.64, bw, bh));
  return { panels, hero: 1, title: R(0.04, 0.42, 0.92, 0.12), script: R(0.04, 0.54, 0.92, 0.05), tagline: R(0.04, 0.59, 0.92, 0.045) };
}

function popout(ratio) {
  const top = 0.075, bot = 0.935;
  if (ratio === '16x9') {
    const panels = [
      R(0.30, top - 0.02, 0.40, 0.52, { pop: true }),
      R(0.015, top, 0.135, 0.40), R(0.155, top, 0.135, 0.40),
      R(0.71, top, 0.135, 0.40), R(0.85, top, 0.135, 0.40),
      R(0.015, 0.62, 0.475, bot - 0.62), R(0.51, 0.62, 0.475, bot - 0.62),
    ];
    return { panels, hero: 0, title: R(0.06, 0.44, 0.88, 0.15), script: R(0.06, 0.59, 0.88, 0.06), tagline: R(0.06, 0.66, 0.88, 0.045) };
  }
  const panels = [
    R(0.26, top - 0.02, 0.48, 0.42, { pop: true }),
    R(0.015, top, 0.235, 0.40), R(0.75, top, 0.235, 0.40),
  ];
  const bw = (0.97 - 3 * GUT) / 4;
  for (let c = 0; c < 4; c++) panels.push(R(0.015 + c * (bw + GUT), 0.58, bw, bot - 0.58));
  return { panels, hero: 0, title: R(0.04, 0.44, 0.92, 0.13), script: R(0.04, 0.57, 0.92, 0.06), tagline: R(0.04, 0.64, 0.92, 0.045) };
}

function triptych(ratio) {
  const top = 0.075, bot = 0.935;
  const tw = (0.97 - 2 * GUT) / 3;
  const panels = [R(0.015, top, tw, 0.62), R(0.015 + tw + GUT, top, tw, 0.62), R(0.015 + 2 * (tw + GUT), top, tw, 0.62)];
  const bw = (0.97 - 3 * GUT) / 4, by = top + 0.62 + GUT;
  for (let c = 0; c < 4; c++) panels.push(R(0.015 + c * (bw + GUT), by, bw, bot - by));
  return { panels, hero: 1, title: R(0.04, 0.40, 0.92, 0.15), script: R(0.04, 0.55, 0.92, 0.06), tagline: R(0.04, 0.62, 0.92, 0.045) };
}

function split(ratio) {
  const top = 0.075, bot = 0.935;
  if (ratio === '16x9') {
    const panels = [R(0.015, top, 0.50, bot - top)];
    const rx = 0.53, cw = (0.985 - rx - GUT) / 2, ch = (bot - top - 2 * GUT) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
      panels.push(R(rx + c * (cw + GUT), top + r * (ch + GUT), cw, ch));
    return { panels, hero: 0, title: R(0.03, 0.46, 0.94, 0.15), script: R(0.03, 0.61, 0.94, 0.06), tagline: R(0.03, 0.68, 0.94, 0.045) };
  }
  const panels = [R(0.015, top, 0.97, 0.44)];
  const bw = (0.97 - 2 * GUT) / 3, bh = (bot - top - 0.44 - 2 * GUT) / 2;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
    panels.push(R(0.015 + c * (bw + GUT), top + 0.44 + GUT + r * (bh + GUT), bw, bh));
  return { panels, hero: 0, title: R(0.04, 0.42, 0.92, 0.12), script: R(0.04, 0.54, 0.92, 0.06), tagline: R(0.04, 0.61, 0.92, 0.045) };
}

function editorial(ratio) {
  const top = 0.075, bot = 0.935;
  const bw = (0.97 - GUT) / 2, bh = 0.30;
  const panels = [
    R(0.015, top, bw, bh), R(0.015 + bw + GUT, top, bw, bh),
    R(0.015, top + bh + GUT, bw, bh), R(0.015 + bw + GUT, top + bh + GUT, bw, bh),
  ];
  const by = top + 2 * bh + 2 * GUT;
  const sw = (0.97 - 2 * GUT) / 3;
  for (let c = 0; c < 3; c++) panels.push(R(0.015 + c * (sw + GUT), by + 0.10, sw, bot - by - 0.10));
  return { panels, hero: 0, title: R(0.04, by - 0.02, 0.92, 0.11), script: R(0.04, by + 0.085, 0.92, 0.05), tagline: R(0.04, by + 0.135, 0.92, 0.04) };
}

function premium(ratio) {
  const top = 0.075, bot = 0.935;
  const slant = ratio === '16x9' ? 0.05 : 0.035;
  const panels = [];
  const n = 7, w = 0.97 / n;
  for (let i = 0; i < n; i++) {
    panels.push(R(0.015 + i * w, top, w - GUT, bot - top, { slant: (i % 2 === 0 ? slant : -slant) * (i === 3 ? 0.4 : 1) }));
  }
  return { panels, hero: 3, title: R(0.04, 0.44, 0.92, 0.15), script: R(0.04, 0.59, 0.92, 0.06), tagline: R(0.04, 0.66, 0.92, 0.045) };
}

const BUILDERS = { mosaic, popout, triptych, split, editorial, premium };

export function getLayout(id, ratio) {
  const fn = BUILDERS[id] || mosaic;
  return fn(ratio);
}

export function layoutById(id) { return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]; }

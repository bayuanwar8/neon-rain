// NEON RAIN — document state, sample cast, undo/redo history.
// All state is plain JSON-able data; photos live in a separate registry (photos.js).

export const SIZES = {
  '1x1': { w: 1080, h: 1080, label: '1:1' },
  '4x5': { w: 1080, h: 1350, label: '4:5' },
  '16x9': { w: 1920, h: 1080, label: '16:9' },
};

// The demo cast: 6 rain-neon portraits + 2 rain scenes. AI-generated, no real people.
export const SAMPLE_CAST = [
  { file: 'detective.jpg', tag: 'THE DETECTIVE', loc: 'UNDER THE SIGN · 10:15 PM · WAITS IN THE RAIN', face: true, faceBox: { x: 0.36, y: 0.12, w: 0.28, h: 0.46 } },
  { file: 'informant.jpg', tag: 'THE INFORMANT', loc: 'ALLEY 9 · 11:40 PM · TALKS FOR CASH', face: true, faceBox: { x: 0.31, y: 0.13, w: 0.33, h: 0.47 } },
  { file: 'getaway.jpg', tag: 'THE GETAWAY', loc: 'PARKING DECK · 2:15 AM · ENGINE RUNNING', face: true, faceBox: { x: 0.27, y: 0.07, w: 0.24, h: 0.43 } },
  { file: 'bartender.jpg', tag: 'THE BARTENDER', loc: 'THE WET GLASS · 9:05 PM · POURS DOUBLES', face: true, faceBox: { x: 0.18, y: 0.19, w: 0.37, h: 0.36 } },
  { file: 'mechanic.jpg', tag: 'THE MECHANIC', loc: 'GARAGE 7 · 1:20 AM · FIXES ANYTHING', face: true, faceBox: { x: 0.37, y: 0.05, w: 0.26, h: 0.45 } },
  { file: 'cop.jpg', tag: 'THE COP', loc: 'PRECINCT 12 · 6:30 PM · SEES EVERYTHING', face: true, faceBox: { x: 0.36, y: 0.07, w: 0.25, h: 0.48 } },
  { file: 'motel.jpg', tag: 'THE HIDEOUT', loc: 'MOTEL NEON · 12:40 AM · VACANCY', face: false },
  { file: 'taxi.jpg', tag: 'THE GETAWAY', loc: 'FIFTH AVENUE · 11:58 PM · METER RUNNING', face: false },
];

function panel(photo, tag, loc) {
  return { photo, tag, loc, zoom: 1, panX: 0, panY: 0, flip: false, variant: 0 };
}

export function defaultDoc() {
  return {
    size: '16x9',
    layout: 'mosaic',
    grade: 'neon',
    titleFont: 'anton',
    scriptFont: 'caveat',
    title: 'NEON RAIN',
    script: 'Every drop tells',
    tagline: 'SEVEN LIVES · ONE STORM · NO WAY DRY',
    quote: 'A CITY THAT NEVER DRIES',
    quoteSource: 'THE RAIN GAZETTE',
    edition: 'VOL. 1',
    seal: 'ORIGINAL COVER ART',
    release: 'COMING SOON',
    billing: 'A NEON RAIN PICTURE · STARRING YOU AND YOUR CREW · SHOT ON YOUR OWN CAMERA · GRADED IN THE RAIN',
    panels: [
      panel('detective.jpg', 'THE DETECTIVE', 'UNDER THE SIGN · 10:15 PM · WAITS IN THE RAIN'),
      panel('informant.jpg', 'THE INFORMANT', 'ALLEY 9 · 11:40 PM · TALKS FOR CASH'),
      panel('getaway.jpg', 'THE GETAWAY', 'PARKING DECK · 2:15 AM · ENGINE RUNNING'),
      panel('bartender.jpg', 'THE BARTENDER', 'THE WET GLASS · 9:05 PM · POURS DOUBLES'),
      panel('mechanic.jpg', 'THE MECHANIC', 'GARAGE 7 · 1:20 AM · FIXES ANYTHING'),
      panel('cop.jpg', 'THE COP', 'PRECINCT 12 · 6:30 PM · SEES EVERYTHING'),
      panel('motel.jpg', 'THE HIDEOUT', 'MOTEL NEON · 12:40 AM · VACANCY'),
    ],
  };
}

export function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

// Undo/redo over whole-document snapshots. Cheap: the doc is small.
export function createHistory(initial) {
  let past = [];
  let future = [];
  let current = cloneDoc(initial);
  return {
    get doc() { return current; },
    push(next) { past.push(current); if (past.length > 60) past.shift(); future = []; current = cloneDoc(next); },
    undo() {
      if (!past.length) return null;
      future.push(current); current = past.pop(); return cloneDoc(current);
    },
    redo() {
      if (!future.length) return null;
      past.push(current); current = future.pop(); return cloneDoc(current);
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}

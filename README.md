# NEON RAIN — Rain City Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bayuanwar8/neon-rain/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bayuanwar8/neon-rain/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

NEON RAIN turns your own photos into a rainy neon-noir crime poster: one big hero panel
and six framed cast panels in the rain, each cropped on a face by a built-in face finder,
a chunky striped-chrome title with a 3D extrude, a neon script subtitle, a five-star
review bar on top, and a full rain grade. It exports PNGs at 1080×1080, 1080×1350 and
1920×1080 in one click. No sunset, no palms, no snow — only wet asphalt, neon signs,
and rain that never stops.

## Run it

```sh
node serve.ts --port 8083
```

Then open http://localhost:8083 in desktop Chrome. The app is plain static files in
`app/` (HTML, CSS and ES modules, no build step, no libraries, no network requests),
so any static file server works too.

## How to use

1. **Add photos**: choose files, drop them on the page, or paste them. Press
   **Try samples** to load the 8-photo demo cast. The panels fill themselves: every
   panel gets a different person, the cast lead (The Detective) goes in the hero
   panel and the rest of the cast fills the panels in order, each panel's name tag,
   location, time and micro-story travelling with its photo. Extra photos are ranked
   by face quality; with more photos than panels the weakest photo is left out; it
   stays in the photo strip, one click from any panel.
2. **Caption**: edit the title (Anton or Playfair Display), script subtitle (Caveat),
   tagline ribbon, the review quote and source for the top bar, the edition tag
   ("VOL. 1"), billing block (words typed in lower case print small), seal text,
   release line and the per-panel name tags (filled from the photos automatically,
   or typed by hand). Every panel also carries a location, a time and a micro-story
   line under its tag.
3. **Export PNG**: one button per size, or **Export all 3 PNGs**. Each size is
   rendered offscreen at its exact pixel size and saved as
   `<title>-<width>x<height>.png`.

Panel moves in the live preview:

- **Click** a panel to select it (highlighted with handles and its number).
- **Drag** inside it to pan the photo; use the **mouse wheel** or the zoom slider
  to zoom; double-click to reset.
- **Drag a panel's number** onto another panel to swap them.
- **Drop a photo file** (or a thumbnail from the left column) onto a panel to
  fill it.
- The toolbar steps through photos, flips, resets and auto-fills. Undo/redo
  (Ctrl+Z / Ctrl+Shift+Z) covers every change.

The size switch recomposes the layout for 1:1, 4:5 and 16:9 rather than cropping
it, and three live mini previews show all sizes at once.

## Features

- **Layouts** (`app/src/layouts.js`), each composed separately for every ratio:
  - *Rain Mosaic* (the default): one big hero panel with six cast panels around
    it, each close to the shape of a portrait photo so every head stays large and
    whole. The title crosses the middle on the row gutter; the neon script and
    tagline ribbon sit on the hero's lower half, which fades into a rain-streaked
    neon glow. In 4:5 and 1:1 the hero sits between two tall cast panels above
    the title, with four cast panels below.
  - *Hero Pop-Out*: the hero breaks its frame and overlaps the title zone.
  - *Neon Triptych*: three tall panels with the title stacked across them.
  - *Alley Split*: a wide hero on the left, a column of cast panels on the right.
  - *Editorial Four*: four big panels in a clean grid with a title band.
  - *Premium Seven*: seven diagonal blades with the title on the widest blade.
- **Framed stills**: every panel casts a soft drop shadow on a dark rain ground
  and gets a thin cyan-white keyline with a faint matte inside it, drawn after
  the grade so it stays crisp.
- **Review top bar**: five stars, the review quote in quotation marks and its
  source on the left, a boxed edition tag on the right, so no quote sits on the
  photos.
- **Face finder** (`app/src/face.js`): skin likelihood that tolerates neon and
  sodium light, combined with local-detail and upper-frame priors, blurred and
  searched for the largest compact skin blob on a downscaled copy. A detected
  box must be plausible (centred, upper half, face-sized) or the centred
  portrait prior is used instead; known scene photos are marked as faceless.
  A face-quality score (brightness, contrast, sharpness, size and resolution,
  measured inside the face box) ranks extra photos.
- **Smart crop** (`app/src/face.js`): each panel has a face zone that no
  lettering touches. The crop places the whole head, hair to chin, inside it
  with headroom. If a photo cannot cover a panel without cutting the head, it
  extends the photo's own edge instead. With a single photo, the panels show
  distinct crops (close-up, mid shot, wide, background detail, mirrored).
- **Photo finishing** (`app/src/grades.js`), so all eight photos look like one
  shoot: every panel is auto-exposed (levels, face-weighted gamma, dehaze) and
  gets a gentle unsharp mask on the face area; the grade protects skin tones
  (skin keeps its own warm hue, never grey or magenta); one fine film grain
  covers the whole poster.
- **Six rain grades** on pixel data (`app/src/grades.js`): Neon Rain, Midnight
  Blue, Acid Rain, Sodium Night, Noir and Wet Chrome. Each one uses a tone
  curve, split toning, saturation and vibrance, a contrast S-curve, vignette,
  film grain, bloom and rain glow.
- **Lettering drawn in code** (`app/src/lettering.js`): the auto-fitting chrome
  title (gradient fill, thick outline, light rim, offset extrude, stripe cuts,
  gloss, sparkles), the neon script subtitle, tagline ribbon, name tags placed
  in each panel's free area with location/time/micro-story lines, the review top
  bar, round seal, barcode, billing block and release line.
- **Decoration** (`app/src/decor.js`): the dark rain poster ground, wet asphalt
  with neon reflections, falling rain streaks, neon signs, skyline silhouettes,
  lens flare and a title glow.
- **Test hook**: `window.rainStudio` (`loadSamples`, `setSize`, `setLayout`,
  `setGrade`, `selectPanel`, `renderCoverDataURL`, `faceReport`) lets a headless
  browser drive the editor.

## Privacy

Photos never leave this device. Files are read in the browser with
`createImageBitmap` and drawn into canvases. Nothing is uploaded, and the app
makes no network request at all.

## Fonts and licenses

Three font files from the Google Fonts repository, unchanged, in `app/fonts/`:
Anton and Caveat (SIL Open Font License 1.1) and Playfair Display (SIL Open
Font License 1.1). The app is original work: it uses no game logo, wordmark,
font, artwork or character.

## Sample photos

The demo cast is AI-generated and shows no real people. Six rain-neon portraits
(detective, informant, getaway, bartender, mechanic, cop) and two rain scenes
(a red taxi in the rain, a neon motel sign).

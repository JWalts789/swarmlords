# Claude Handoff — Sprite Solid-Alpha Audit

Date: 2026-08-29

## Outcome

The full 11-frame unit roster was rebuilt and published after the user found
transparent eyes on the wasps and a transparent body on the snail. The fixed
build is live at <https://jwalts789.github.io/swarmlords/>.

Commit: `5928484` (`Preserve solid paint in sprite extraction`)

Service-worker cache: `swarmlords-v22`

## Root cause

`tools/extract_unit_sheets.py:keyed_rgba()` previously inferred alpha from
each pixel's brightness and chroma. Near-white enclosed paint could resemble
the generated checker matte closely enough to be partially or completely
removed. That made cream/white areas—especially wasp eyes—and some pale body
paint appear hollow over the battlefield.

## Repair

- Replaced per-pixel alpha inference with edge-connected matte removal.
- Candidate matte pixels are labelled with `cv2.connectedComponents`.
- Only matte-coloured components touching the canvas perimeter are cleared.
- Enclosed paint remains opaque even when its RGB closely matches the matte.
- Restored all 48 untouched raw canvases from commit `c8aac22` and re-ran the
  extractor, avoiding cumulative processing of the flawed sheets.
- Rebuilt all 48 unit sheets at `2816x256`, 11 frames each.
- Bumped `sw.js` from cache v21 to v22 so installed PWAs fetch the repair.

## Audit performed

- Composited every faction contact sheet over saturated blue to expose holes.
- Also produced cream-background contacts to check edge cleanup and dark ink.
- Visually confirmed solid wasp eyes and a solid snail shell/body.
- Confirmed intentional translucency remains on wings, the Ghost Mantis
  dissolve, and magic/effect artwork.
- Automated check covered all 48 sheets / 528 frames:
  - exact `2816x256` dimensions;
  - no empty frames;
  - no occupied pixels touching either 256px cell boundary.
- `git diff --check` passed.
- `node --check js/sprites.js` passed.
- GitHub Pages was polled until it served cache v22.
- Live `wasp_drone_sheet.png` byte size matches local exactly (`359835`).

## Scope discipline

The repair commit contains only:

- 48 rebuilt `assets/sprites/*_sheet.png` files;
- `tools/extract_unit_sheets.py`;
- `sw.js`.

The following pre-existing working-tree edits were deliberately left
uncommitted and untouched by this audit:

- `css/style.css`
- `js/conquest.js`
- `js/main.js`
- `js/sprites.js`

Do not discard those files; they belong to the user's separate UI work.

## Standing extraction rule

Never key a generated matte independently per pixel when the artwork contains
cream or white cel paint. Remove only background regions connected to the
outer canvas edge. Preserve the raw canvases before every extraction pass.

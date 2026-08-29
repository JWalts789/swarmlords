# SWARMLORDS — Codex Art Prompts

The engine ships with placeholder vector bugs and **auto-swaps any sheet it
finds in `assets/sprites/`** — exact filenames below, no code changes needed.
Drop a PNG in, refresh, done. (When deploying, bump `CACHE` in `sw.js`.)

## THE HOUSE STYLE (read before every batch)

Every sheet is **wacky 1930s rubber-hose cartoon** — the Cuphead look:

- Hand-inked, slightly wobbly dark-sepia outlines (`#1b120c`, never pure black)
- Cel-painted flat colors with soft airbrush shading, like old animation cels
- **Pie-cut eyes** (white eye, black pupil with a wedge cut), big grins,
  worn gloves where hands make sense, noodle limbs that curve without joints
- Squash-and-stretch in every pose; nothing stands stiff
- Subtle paper grain in the paint is welcome; NO background — RGBA transparency
- Muted vintage palette; each faction has ONE accent color (below) that
  dominates its bugs

**Faction accents:** ANTS ember red `#d84b2a` · WASPS brass gold `#e0a51e` ·
BEETLES steel blue `#3f7fae` · MANTIDS jade green `#4da05c` · TERMITES bone
`#cfc3a8` · MOTHS dusk violet `#8f6bb8` · WILDS olive drab `#7d8471`.

**Generate one faction per session** so the hand stays consistent.

## DELIVERY PROTOCOL (agreed 2026-08-25, after the beetle batch)

Deliver the generator's **raw RGBA output, untouched**:
- No matte removal, alpha reconstruction, or color un-premultiplication
- No automated background cleanup (a lossy pass ghosted an entire batch once)
- Suspected halos, grid lines, or stray fragments: **document them in the
  delivery note** — QA has non-destructive tooling and fixes them here
- The one thing enforced at generation time: **cell containment** — each
  256px frame contains ONLY its own pose (no neighbor fragments, no art
  crossing cell boundaries), and no baked ground shadows

## UNIT SHEET FORMAT (all unit sheets identical)

`1536×256` PNG, six `256×256` cells, character centered in each cell,
**profile facing RIGHT** (the engine rotates them to march up/down):

| Frame | Pose |
|---|---|
| 1–4 | Walk cycle (contact / down / passing / up — bouncy, cartoony) |
| 5–6 | Attack loop (wind-up / strike — big, readable, jaw or sting or swipe) |

Same character size and position in all six cells. Feet near the cell's
vertical center-line bottom third. The engine scales sheets to ~64px tall in
play, so silhouettes must read TINY: exaggerate heads, jaws, and weapons.

### Per-unit prompt template
```
A single cartoon <SUBJECT> in vintage 1930s rubber-hose animation style,
hand-inked wobbly sepia outlines, cel-painted flat colors with soft airbrush
shading, pie-cut eyes, mischievous personality, dominant accent color
<HEX>, in profile facing right, on a transparent 1536x256 sprite sheet of
six 256x256 frames: frames 1-4 a bouncy walk cycle with squash and
stretch, frames 5-6 an exaggerated attack (wind-up, then strike). Same
character, same size, centered in every frame. No background, no text.
```

---

## PRIORITY 1 — THE WILDS + ANTS + HIVES (every campaign uses these)

### W1 `neu_pillbug_sheet.png` — Pillbug
Subject: a grumpy round pillbug like a walking bank-vault door, olive drab,
segmented armor plates, tiny stubby legs, attack = tucks and rams.
### W2 `neu_slug_sheet.png` — Slug
Subject: a droopy-eyed garden slug like melted taffy, olive drab with a
cream belly, leaves a little shine, attack = a sloppy headbutt slap.
### W3 `neu_orbweaver_sheet.png` — Orb Weaver
Subject: a prim spider spinster with four pie-cut eyes and dainty gloved
legs, olive drab with a cream abdomen pattern, attack = flings a little
white web bundle forward.
### W4 `neu_wolf_sheet.png` — Wolf Spider
Subject: a burly fuzzy spider hooligan, flat cap optional, olive drab,
attack = a lunging double-fist pounce.
### W5 `neu_snail_sheet.png` — Garden Snail
Subject: an enormous weary snail with a chipped spiral shell like an old
kettle, olive drab body, attack = slow crushing shell slam.
### W6 `neu_centipede_sheet.png` — Centipede
Subject: a long vaudeville centipede with dozens of shoes, olive drab
segments, attack = whip-cracks its whole front half forward.
### W7 `neu_sluglet_sheet.png` — Sluglet
Subject: a tiny indignant half-size slug, same taffy look as W2, attack =
angry little bonk.

### A1 `ant_worker_sheet.png` — Worker Ants (draw ONE worker)
Subject: a tiny eager worker ant with an oversized head and a pebble held
like a lunchbox, ember red, attack = frantic nibbling.
### A2 `ant_soldier_sheet.png` — Soldier Ant
Subject: a square-jawed soldier ant with a doughboy helmet, ember red,
attack = big mandible chomp.
### A3 `ant_spitter_sheet.png` — Acid Spitter
Subject: a gangly ant with a trumpet-bell snout, ember red, attack = spits
a glowing green droplet with cheeks puffed.
### A4 `ant_bullet_sheet.png` — Bullet Ant
Subject: a lean mean ant shaped like a zeppelin with clenched teeth, ember
red with dark racing stripe, walk = sprint blur, attack = torpedo headbutt.
### A5 `ant_carpenter_sheet.png` — Carpenter Ant
Subject: a burly carpenter ant with a carpenter's pencil behind one
antenna and a little tool-belt, ember red, attack = two-handed jaw CHOMP
that takes a bite of the air.
### A6 `ant_column_sheet.png` — Army Ant Column (draw ONE marcher)
Subject: a drill-sergeant ant mid-march with a tiny banner pole over one
shoulder, ember red, attack = bayonet-style mandible thrust.
### A7 `ant_queensguard_sheet.png` — Queen's Guard (CHAMPION)
Subject: a colossal ant royal guard in a tiny brass crown and epaulettes,
ember red with gold trim, attack = spinning double-mandible sweep with
motion smears.

### HIVES — `hive_ants.png`, `hive_wasps.png`, `hive_beetles.png`,
### `hive_mantids.png`, `hive_termites.png`, `hive_moths.png`, `hive_neutral.png`
`512×256` each, drawn UPRIGHT sitting on the bottom edge (engine flips it
for the top of the screen). A cartoon fortress-nest in the faction's accent
color with a little flag on top and one dark entrance hole:
ants = pebbly mound; wasps = paper palace with scalloped tiers; beetles =
riveted iron acorn; mantids = topiary chapel of folded leaves; termites =
gothic mud cathedral; moths = a hanging lantern-loft cocoon; neutral = a
mossy old boot. Same rubber-hose inking as the units.
```
A cartoon insect fortress nest in vintage 1930s rubber-hose style,
<DESCRIPTION>, dominant color <HEX>, hand-inked sepia outlines,
cel-painted, sitting on the bottom edge of a transparent 512x256 canvas,
one small triangular flag on top, one dark arched entrance. No background.
```

### T1 `logo_wordmark.png` — 1024×320
```
The word SWARMLORDS hand-lettered in bulging 1930s cartoon title style,
cream letters with ember-red drop shadow and dark sepia ink outline,
slightly arched and rotated a touch anticlockwise, tiny ant silhouettes
marching along the baseline of the letters, on a transparent 1024x320
canvas. No other text, no background.
```

### T2 `icons/icon-512.png` + `icons/icon-192.png`
```
App icon: a grinning rubber-hose cartoon ant head in a tiny brass crown,
pie-cut eyes, ember red on a cream sunburst roundel with dark sepia rim,
1930s cartoon poster style, bold and readable at 48px. Square PNG,
512x512 (and a 192x192 export).
```

---

## PRIORITY 2 — WASPS then BEETLES (first unlocks)

### WA1 `wasp_drone_sheet.png` — Drone: a zippy delivery-boy wasp with a
pillbox hat, brass gold, wings a blur-oval above; attack = quick sting jab.
### WA2 `wasp_paper_sheet.png` — Paper Wasp: a ground wasp archer holding a
rolled-paper pea-shooter, brass gold; attack = puff-cheek pellet shot.
### WA3 `wasp_jacket_sheet.png` — Yellowjackets (draw ONE): a scrappy
flyweight boxer wasp with taped fists, bold black-and-gold stripes;
attack = one-two punch flurry.
### WA4 `wasp_lancer_sheet.png` — Lancer: a jousting wasp with its stinger
extended like a lance and a little pennant, brass gold; attack = full-tilt
charge with speed lines.
### WA5 `wasp_dauber_sheet.png` — Mud Dauber: a stocky mason wasp in a
hod-carrier's cap, brass gold with mud-brown boots; attack = swings a
trowel like a club.
### WA6 `wasp_hornet_sheet.png` — Hornet: a heavyweight bruiser hornet with
a five-o'clock-shadow scowl, deep gold and black; attack = haymaker sting
slam (this one also strafes ground troops — make the strike aim downward-forward).
### WA7 `wasp_queen_sheet.png` — Hornet Queen (CHAMPION): a majestic furious
queen with a tall crown and a fur-trimmed cape, gold and black; attack =
royal scepter-stinger smash with an impact star.

### B1 `btl_ladybird_sheet.png` — Ladybird: a cheery domed ladybug with big
lashes and seven spots, red-orange over steel-blue underparts; attack =
shell-first shoulder check.
### B2 `btl_weevil_sheet.png` — Weevil Gunner: a long-snouted weevil aiming
its own nose like a rifle, steel blue; attack = recoil pellet shot.
### B3 `btl_tortoise_sheet.png` — Tortoise Beetle: a walking manhole-cover
beetle, all dome, steel blue with rivets; attack = hunkers and shrugs
attackers off.
### B4 `btl_stag_sheet.png` — Stag Beetle: a pompous duelist with antler
pincers like fencing sabers, steel blue; attack = scissor-snap.
### B5 `btl_bombardier_sheet.png` — Bombardier: an artillery beetle with a
cannon-shaped abdomen and a match-fuse tail, steel blue; attack = rears up
and fires with a smoke puff.
### B6 `btl_rhino_sheet.png` — Rhino Beetle: a freight-train beetle with a
huge upcurved horn, steel blue; attack = horn uppercut.
### B7 `btl_hercules_sheet.png` — Hercules (CHAMPION): a mountainous
strongman beetle in a striped circus singlet, steel blue, tiny crown on
its horn; attack = ground-shaking overhead slam.

## PRIORITY 3 — MANTIDS, TERMITES, MOTHS

### M1 `man_nymph_sheet.png` — Nymph: a haughty little mantis duckling with
folded arms, jade green; attack = surprisingly fast slap.
### M2 `man_stalker_sheet.png` — Grass Stalker: a lean fencer mantis, jade
green; attack = double scythe lunge with motion smears.
### M3 `man_sickle_sheet.png` — Sickle Guard: a tall palace guard mantis
with halberd-like forearms, jade green with gold trim; attack = upward
snatch (it plucks fliers from the sky).
### M4 `man_ghost_sheet.png` — Ghost Mantis: a raggedy leaf-cloaked mantis,
faded jade, semi-translucent edges; attack = vanishing swipe.
### M5 `man_orchid_sheet.png` — Orchid Mantis: a beautiful deadly mantis
dressed in pink-white petals over jade; attack = petals flare, blades out.
### M6 `man_empress_sheet.png` — The Empress (CHAMPION): a towering regal
mantis in a jade gown-carapace and crown, prayer pose; attack = both
scythes descend like guillotines.

### TE1 `ter_worker_sheet.png` — Termite Worker: a pale humble hardhat
termite, bone white; attack = nibble-nibble-nibble blur.
### TE2 `ter_snapjaw_sheet.png` — Snapjaw: a soldier termite that is 60%
head, bone white with rust helmet-crest; attack = bear-trap jaw snap.
### TE3 `ter_nasute_sheet.png` — Nasute Glueshot: a termite with a funnel
nozzle head, bone white; attack = sprays a sticky amber glob.
### TE4 `ter_rampart_sheet.png` — Mud Rampart: not a bug — a squat mud
turret with two sleepy eyes peeking from arrow slits, earthen brown over
bone; frames 1-4 = idle breathing/settling dust, 5-6 = braces against a hit.
### TE5 `ter_sapper_sheet.png` — Sapper: a scurrying termite hugging a
too-big powder keg with a lit fuse, bone white; attack = winds up to hurl it.
### TE6 `ter_alate_sheet.png` — Alate: a winged termite aviator with a
scarf and goggles, bone white, four long wings; attack = dive-bomb chomp.
### TE7 `ter_king_sheet.png` — The Hollow King (CHAMPION): a bloated pale
monarch termite on tiny legs, wooden crown, bone white with rot-brown
shading; attack = royal jaw crush that splinters the air.

### MO1 `mot_dustling_sheet.png` — Dustling: a tiny round-winged moth like
a flying powder puff, dusk violet, sleepy pie-cut eyes; attack = sneezes
a sparkle of dust.
### MO2 `mot_sister_sheet.png` — Silk Sister: a hooded nun-moth walking on
the ground, robes of folded wings, dusk violet and cream; attack frames =
casts a gentle thread of light forward (she heals).
### MO3 `mot_hawk_sheet.png` — Hawkmoth: a sleek fighter-ace moth with
swept-back wings and a white scarf, dusk violet; attack = strafing dive
slash.
### MO4 `mot_dustcaster_sheet.png` — Dustcaster: a wizardly ground moth
with a staff-like antenna, dusk violet with star-spangled wings; attack =
flings a puff of sleepy dust.
### MO5 `mot_luna_sheet.png` — Luna Moth: an elegant long-tailed luna moth
in pale green over violet, serene; attack = wing-blade sweep.
### MO6 `mot_witch_sheet.png` — White Witch: a huge pale ghost-moth,
almost white with faint violet map-markings; attack = dust shockwave burst.
### MO7 `mot_deathshead_sheet.png` — Death's-head (CHAMPION): a grand
ominous moth with a friendly little skull marking on its thorax and a tiny
crown, deep violet; attack = silent screaming dive with trailing wisps.

---

## QA CHECKLIST (per sheet, before accepting)

1. **Grid test:** six exact 256px cells; character centered and same size
   in all six. Off-center frames jitter in-game.
2. **Facing test:** profile facing RIGHT in every frame.
3. **Loop test:** frames 1→4→1 at speed — no pop. Frames 5→6→5 — reads as
   hitting something to its right.
4. **Thumbnail test:** readable and charming at 64px; the attack must be
   obvious at 64px.
5. **Alpha test:** true transparency, no white halo, no baked shadow (the
   engine draws the ground shadow).
6. **Palette test:** faction accent dominant; sepia outlines, not black.

## DELIVERY TABLE

| Batch | Sheets | Status |
|---|---|---|
| P1 wilds | W1–W7 | **ALL ACCEPTED** 2026-08-23. Fix log — W2: stray frame-6 tail fragment erased from frame 5 locally (watch cell bleed); W3: two eyes instead of four, accepted; W7: baked ground shadow erased from hop frame 4 (NO baked shadows — engine draws them), engine given a sheetScale compensator since the subject is intentionally drawn small in-cell |
| P1 ants | A1–A7 | **ALL ACCEPTED** 2026-08-23/24. Fix log — A1 given sheetScale 1.2 (small-stat units drawn proportionally small in-cell shrink twice; engine compensates in data.js); A2/A4/A5/A6/A7: detached speed lines, dust, bite marks, whirl arcs, and stars in motion frames are intentional and kept |
| P1 hives | 7 × hive_*.png | **ALL 7 ACCEPTED** 2026-08-24/25 (engine preserves hive art aspect ratio; delivered hives draw UPRIGHT on both ends — no mirroring; reserves counter moved to the topbar) |
| P1 brand | logo_wordmark, icon-512/192 | **ALL ACCEPTED** 2026-08-25 (title swap now retries while the image loads at boot; sw.js CACHE bumped to v2 for the icons). **PRIORITY 1 COMPLETE.** |
| P2 wasps | WA1–WA7 | **ALL ACCEPTED** 2026-08-25. Fix log — WA4 (lancer) frames 4–5 and WA6 (hornet) frame 5 had detached pennant/body fragments from a NEIGHBORING pose drawn inside the cell (floating ahead of the unit); erased locally. Watch for this: every frame must contain ONLY its own pose. Kept: jacket punch stars, dauber trowel/mud, hornet+queen impact bursts. Fliers hover above the ground line and wings-as-blur-disc both read great — keep both conventions. |
| P2 beetles | B1–B7 | **ALL ACCEPTED** 2026-08-25 — after local restoration. The delivered batch arrived ghosted (median alpha ~100 vs 255 on prior batches; a background-matte "correction" had crushed alpha and white-matted the colors). Restored by reversing the white-matte premultiplication + rebuilding alpha. Also fixed: ladybird grid-line remnants erased and its undersized frame 1 rescaled. Tortoise/rhino keep a faint chalk fringe — fine at gameplay scale. **CODEX: deliver raw RGBA output; do NOT post-process backgrounds — flag issues instead and QA handles them here.** |
| P3 mantids | M1–M6 | **ALL ACCEPTED** 2026-08-25 — first raw-protocol batch. Generator delivered oversized canvases (2172×724 rows / 1536×1024 spreads, poses on transparency with faint glow); QA extracted, keyed the ambient wash, cut at occupancy valleys (stalker needed manual cuts — uneven spacing), normalized one scale per sheet, ground-anchored at y=220. Erased 5 cross-cut blade/arm fragments; kept all fades, petals, trails. Raw originals preserved in git (commit 6705cce). man_sickle got sheetScale 1.4 (very vertical poses). |
| P3 termites | TE1–TE7 | **ALL ACCEPTED** 2026-08-25 — raw-protocol extraction (valley cuts; sapper needed manual cuts — the gap between thrower and airborne keg fooled the cutter; nasute's brown wash keyed at floor 80; alate kept translucent wings, hover baseline). Raws in git 2d266ac. Rampart idles/braces as briefed. |
| P3 moths | MO1–MO7 | **ALL ACCEPTED** 2026-08-25 — raw-protocol extraction (backdrops keyed per-sheet at floors 60–90; witch gauze kept at floor 25; fliers on the hover baseline). Sister and dustcaster needed manual cuts — long attack effects (healing thread, flung cloud) fooled the valley cutter; the dustcaster's release frame is a QA composite of the cast pose + its living dust cloud. Raws in git 9d77105. |

**🎉 CORE ART COMPLETE 2026-08-25: 48 unit sheets, 7 hives, wordmark, and
icons accepted. SWARMLORDS is placeholder-free.** The swap interface remains
live — any future re-delivery drops in the same way.

---

# PRIORITY 4 — SPELLS, MAP & UI KIT (added 2026-08-26)

The game is now LANDSCAPE (this changed nothing for unit sheets — profile
facing right is now the native marching direction). All P4 assets are
auto-probed by the engine like everything else: exact filenames, drop into
`assets/sprites/`, done. Same rubber-hose house style throughout.

## P4a — SPELL CARDS (9 icons)

One `256×256` RGBA icon per tactic card, filename `<id>_icon.png`. These
appear ON CARDS (in-hand at ~44px, in shop/draft at ~64px) — bold single
emblems, faction accent color + parchment tones, hand-inked, no text, no
background box (transparent; the card frame is behind them).

| File | Subject |
|---|---|
| `ant_pheromone_icon.png` | a winding scent trail of ember-red arrows with little running ant feet along it |
| `ant_tunnel_icon.png` | a burst-open mud hole with two eager antennae poking out |
| `wasp_dive_icon.png` | three gold wasp silhouettes power-diving in formation with speed lines |
| `wasp_frenzy_icon.png` | a gold wing-blur with angry crosshatch sparks around it |
| `btl_shellwall_icon.png` | three overlapping riveted steel-blue shields in a wall |
| `man_lunge_icon.png` | a jade scythe-arm mid-slash leaving a crescent trail |
| `ter_undermine_icon.png` | a bone-white powder keg half-buried under a cracked floor, fuse lit |
| `mot_lullaby_icon.png` | a violet dust cloud with sleepy Z-motes and a tiny crescent moon |
| `mot_cocoon_icon.png` | a silk cocoon wrapped in a glowing thread, one warm sparkle |

(Neutral drafts may later add tactics — the format is established.)

## P4b — CONQUEST MAP ART

| File | Size | Subject |
|---|---|---|
| `map_bg.png` | 1600×800 | A painted garden seen from above at dusk-gold hour: soft parchment ground with faint flowerbeds, a garden path, a pond corner, scattered leaves — MUTED and low-contrast (nodes and ink must read on top of it), rubber-hose etching warmth, vignette edges. Opaque. |
| `map_node.png` | 256×256 | A territory marker: a round parchment clearing / trodden-earth mound seen from above, hand-inked wobbly border, subtle grass tufts around the rim. The engine draws the owner-colored ring ON TOP — keep the rim clean and the center calm (a garrison count and yield sit there). Transparent outside the blob. |
| `map_node_capital.png` | 256×256 | Same language, grander: the clearing ringed with tiny palisade stakes and a banner pole shadow. |
| `map_crown.png` | 128×128 | A small brass crown, tilted jauntily, hand-inked — marks capitals above their node. |

## P4c — UI KIT

| File | Size | Subject |
|---|---|---|
| `ui_panel.png` | 512×512 | A parchment panel with a hand-inked sepia border and stitched/riveted corners, 9-slice friendly: keep a uniform 72px decorative border, plain fillable center. Used for modals, map panel, shop. |
| `ui_icons.png` | 1536×256 (six 256 cells) | Flat hand-inked glyphs, sepia + brass: 1 gold coin with a bug-face stamp · 2 hex territory tile · 3 garrison shield with mandible emblem · 4 energy lightning-drop · 5 deck of cards fanned · 6 crossed scythe & stinger (battle). Readable at 20px. |

Delivery table addendum:

| Batch | Assets | Status |
|---|---|---|
| P4a spells | 9 icons | **ALL ACCEPTED** 2026-08-26 (QA resized 1254→256; style note: icons render a touch more polished than pure cel — future prompts push harder toward flat hand-inked, per the north-star reminder) |
| P4b map | map_bg, map_node, map_node_capital, map_crown | **ALL ACCEPTED** 2026-08-26 (bg optimized to 1400×700; crown content-cropped to 128) |
| P4c UI | ui_panel, ui_icons | **ALL ACCEPTED** 2026-08-26 (panel 9-slices modals + map panel; glyph strip extracted to 1536×256, live in topbar + map yields) |

Total: 48 unit sheets + 7 hives + wordmark + icon. The game is fully
playable on placeholders the whole way — deliver in priority order and the
engine upgrades itself sheet by sheet.

---

# PRIORITY 5 — FACTION TERRITORIES, CURRENCY & MAP GLYPHS (added 2026-08-27)

**STYLE CORRECTION — read this first.** The P4 icons drifted toward polished
modern game-icon rendering: gradient metal, glossy highlights, airbrushed
volume. P5 must swing back hard to the 1930s cel look:

- **Flat cel paint only** — no gradients, no gloss, no metallic sheen, no
  rim-light. Two or three flat tones per object plus ONE hard-edged shadow
  shape.
- **Wobbly dark-sepia ink outlines** (`#1b120c`) of visibly uneven weight,
  as if brushed by hand at speed.
- **Muted, aged palette.** No saturated gold or emerald — brass should look
  like tarnished tin, greens like old bottle glass.
- Slight paper/cel grain is welcome. It should look like a frame from a
  1936 cartoon, **not** a mobile game asset.
- Everything below is small on screen (14–70px). Bold shapes, no fine detail.

All P5 files are auto-probed by the engine — exact filenames, drop into
`assets/sprites/`, no code changes.

## P5a — FACTION TERRITORY GROUND (12 files)

Each kingdom paints its land differently. The engine draws an owner-coloured
ring and a bug emblem ON TOP, so keep the rim clean and the centre calm — a
yield number and garrison pips sit in the middle.

`256×256` RGBA, top-down view of a small patch of ground, transparent
outside the roughly circular patch. Muted so ink and numbers read over it.

| File | The land looks like |
|---|---|
| `map_node_ants.png` | trampled red-earth clearing, scattered pebbles and crumb-piles, faint trail grooves radiating out |
| `map_node_capital_ants.png` | same earth, ringed with pebble cairns and a few chewed leaf-standards |
| `map_node_wasps.png` | dry papery ground, torn grey-gold paper scraps and hexagon fragments half-buried |
| `map_node_capital_wasps.png` | same, ringed with little paper-comb walls |
| `map_node_beetles.png` | packed slate-grey gravel with embedded flat stones, tidy and rectangular |
| `map_node_capital_beetles.png` | same, ringed with riveted iron plates driven into the soil |
| `map_node_mantids.png` | clipped green turf, neat leaf-blades arranged in careful rows |
| `map_node_capital_mantids.png` | same, ringed with a low trimmed hedge and two topiary spires |
| `map_node_termites.png` | pale cracked mud flat, hairline fissures, small bone-white mound stubs |
| `map_node_capital_termites.png` | same, ringed with drip-spire mud turrets |
| `map_node_moths.png` | dusky violet moss with a scatter of pale wing-scales catching moonlight |
| `map_node_capital_moths.png` | same, ringed with hanging silk threads and two tiny lantern posts |

Also useful (optional): `map_node_neutral.png` — wild tangled weeds and
mushrooms on plain dirt, the look of ground nobody has claimed.

## P5b — CURRENCY (2 files)

The shop, topbar, and every territory yield draw these.

| File | Size | Subject |
|---|---|---|
| `ui_coin.png` | 256×256 | A single tarnished brass coin seen face-on, hand-inked, a grinning bug face stamped in relief on it, one flat highlight shape and one flat shadow shape — NOT shiny. Slightly out of round, like it was struck badly. |
| `ui_coin_stack.png` | 256×256 | Three of the same coins in a leaning stack, used for larger prices. |

## P5c — MAP GLYPHS, replacing the emoji (7 files)

These currently render as OS emoji on territories and read wrong against the
hand-painted map. One `256×256` RGBA each, flat cel, bold at 20px.

`ui_boons.png` — deliver as ONE `1536×256` strip of six `256×256` cells, in
this exact order (the engine indexes them positionally):

1. **Sugar Spring** (+battle energy) — a dripping sugar-drop with two tiny motion ticks
2. **Rich Soil** (+unit HP) — a fat heart-shaped seed sprouting one leaf
3. **Thorn Grove** (+unit damage) — two crossed thorn-branches
4. **Waystation** (+starting card) — a rolled leaf-scroll tied with twine
5. **Deep Roots** (+hive HP) — a small hive dome with roots forking beneath it
6. **Trade Trail** (shop discount) — a coin with a winding trail behind it

Plus, standalone:

| File | Subject |
|---|---|
| `map_crown_fallen.png` | 128×128 — a toppled, dented brass crown lying on its side, marking an eliminated kingdom's former capital |

## Delivery table

| Batch | Assets | Status |
|---|---|---|
| P5a faction ground | 13 node files | **ALL ACCEPTED** 2026-08-28 — delivered as full settlements (huts, awnings, banners, forges) rather than bare ground, which is better than spec'd; central plazas left open for the yield readout. `map_node_capital_neutral` is correctly absent: the wilds never hold a capital. |
| P5b currency | ui_coin, ui_coin_stack | **ACCEPTED** 2026-08-28 — a grinning bug struck in tarnished brass. Now drives the topbar gold, every shop price, territory yields, and the wait button; the stack appears for larger sums. |
| P5c map glyphs | ui_boons strip, map_crown_fallen | **ACCEPTED** 2026-08-28 — six boon cells delivered in the exact spec'd order, so they index positionally with no remapping. map_crown_fallen now marks the capital of any kingdom that has been wiped out. |

---

# PRIORITY 6 — PAINTED CARD FRAMES (added 2026-08-27)

Every card in the game (battle hand, recruitment draft, shop market) is
already framed per kingdom — right now with drawn CSS borders. These
replace them with painted frames. The engine swaps each faction's frame in
independently the moment its file appears, so partial deliveries are fine.

**Same flat-cel style correction as P5** — no gradients, no gloss, no
metallic sheen. Flat tones, wobbly sepia ink, muted aged palette, 1936
cartoon cel rather than a game UI asset.

## Format (identical for all seven)

- `384×512` RGBA PNG, portrait 3:4.
- **The centre must be fully transparent.** This is a frame, not a card —
  the game paints the parchment, the bug art, the name plate and the cost
  coin underneath and through it.
- Keep the decorative border within roughly 34px of the edge. Anything
  thicker eats the art window.
- The top ~14% and bottom ~22% sit behind a faction ribbon and a name
  plate, so avoid fine detail there — corners and the long edges are where
  the character should live.
- It gets drawn as small as **72×96**, so shapes must be bold. No hairlines.

## The seven frames

| File | The frame is made of |
|---|---|
| `card_frame_ants.png` | packed red earth and pebbles, the border built from small round stones with grit between them; two crossed leaf-standards at the top corners |
| `card_frame_wasps.png` | torn paper comb — the border is layered papery strips with hexagon cells punched along it, corners clipped at 45° like cut card |
| `card_frame_beetles.png` | riveted steel-blue plate armour, thick and square, a fat rivet at each corner and along the mid-edges, one dent for wear |
| `card_frame_mantids.png` | trimmed green stems and folded leaf-blades, elegant and thin, the top-left and bottom-right corners drawn out into long pointed leaf tips |
| `card_frame_termites.png` | cracked bone-pale mud, the border split by hairline fissures into irregular segments, a couple of tiny drip-spires on the top edge |
| `card_frame_moths.png` | wound silk thread and soft wing-scales, very rounded corners, two thin threads running parallel with a small cocoon knot at the bottom centre |
| `card_frame_neutral.png` | wild tangled weed stems and thorns, uneven and overgrown, one small mushroom sprouting at a bottom corner |

### Prompt template

```
A decorative card frame border in vintage 1930s rubber-hose cartoon style,
made of <MATERIAL>, hand-inked wobbly dark-sepia outlines of uneven weight,
FLAT cel paint with no gradients and no gloss, muted aged palette dominated
by <HEX>, drawn as a border around the outer edge of a 384x512 portrait
canvas with the ENTIRE CENTRE FULLY TRANSPARENT. Border no thicker than
34px. Bold simple shapes readable when shrunk to 72x96. No text, no
background, RGBA transparency.
```

## Delivery table

| Batch | Assets | Status |
|---|---|---|
| P6 card frames | 7 × card_frame_*.png | PENDING |

---

# PRIORITY 7 — FACTION EMBLEMS & NAMEPLATES (added 2026-08-28)

Right now the map legend draws a plain parchment pill with a **reused unit
sprite** standing in for each kingdom's identity, and the node badges do the
same. These give every kingdom a real heraldic mark and a real signboard.

Same flat-cel discipline as P5/P6: **no gradients, no gloss, no metallic
sheen.** Flat tones, wobbly sepia ink of uneven weight, muted aged palette,
a 1936 cartoon cel — not a game UI asset.

## P7a — EMBLEMS (7 files)

`emblem_<faction>.png` — `256×256` RGBA, transparent background, the mark
centred and filling most of the canvas.

These are **heraldry, not portraits.** Do not simply draw the bug again —
draw the sign a kingdom would paint on its banners. They appear at **24px**
on territory badges and **26px** on legend plates, so they must be one bold
silhouette that survives shrinking. One dominant faction colour plus cream
and sepia ink; no more than three tones.

To read as a set, every emblem is a **single mark on a simple ground shape**
(roundel, shield, or diamond) with a heavy sepia outline.

| File | The mark |
|---|---|
| `emblem_ants.png` | Two crossed ant mandibles over a glowing ember, on a pebbled roundel. Ember red. |
| `emblem_wasps.png` | A single honeycomb hexagon with a stinger driven down through its centre, on a paper-torn roundel. Brass gold. |
| `emblem_beetles.png` | A riveted shield split by one upcurved rhino horn, on a square-cornered plate. Steel blue. |
| `emblem_mantids.png` | Two scythe forearms crossed in a praying X above a small crown, on a leaf-shaped ground. Jade green. |
| `emblem_termites.png` | A cracked arch of mud with a pair of blunt jaws set into the keystone, on a diamond ground. Bone white. |
| `emblem_moths.png` | A crescent moon with a moth's antennae rising from its horns, on a silk-draped roundel. Dusk violet. |
| `emblem_neutral.png` | A thorned bramble ring with one wide unblinking eye in the middle, on a rough bark roundel. Olive drab. |

### Prompt template
```
A heraldic faction emblem in vintage 1930s rubber-hose cartoon style:
<MARK>, drawn as one bold flat symbol with a heavy wobbly dark-sepia
outline, FLAT cel paint with no gradients and no gloss, dominant colour
<HEX> with cream and sepia only, centred on a transparent 256x256 canvas
and filling most of it. Simple enough to read clearly at 24 pixels. No
text, no background, RGBA transparency.
```

## P7b — NAMEPLATES (7 files)

`nameplate_<faction>.png` — `512×160` RGBA, transparent outside the plate.
Optionally also `ui_nameplate.png` in the same format as a generic fallback.

These are the signboards behind each kingdom's name in the map legend, and
the engine **3-slices** them: the left 128px and right 128px are drawn at a
fixed size as decorative end caps, and **the middle 256px is stretched** to
fit however long the name is.

That means:
- Put all ornament in the **outer 128px at each end** — end caps, brackets,
  bolts, leaf tips, hanging cords.
- Keep the **middle 256px plain and horizontally uniform** — a flat board
  with no motif that would smear when stretched. Horizontal grain is fine;
  anything vertical or centred is not.
- Keep the middle light enough for dark text to sit on it.

| File | The board is made of |
|---|---|
| `nameplate_ants.png` | a flat slab of packed red earth, pebbles clustered at both ends like cairns |
| `nameplate_wasps.png` | a strip of layered paper comb, torn ragged ends, a hexagon punched at each end |
| `nameplate_beetles.png` | a riveted steel-blue plate, four fat rivets at each end, one dent |
| `nameplate_mantids.png` | a long trimmed leaf blade, pointed tips at both ends, fine veins running lengthwise |
| `nameplate_termites.png` | a slab of cracked bone-pale mud, small drip-spires rising at each end |
| `nameplate_moths.png` | a hanging silk banner, threads and a small cocoon knot at each end |
| `nameplate_neutral.png` | a weathered bark plank, tangled weeds curling round both ends |

### Prompt template
```
A horizontal signboard in vintage 1930s rubber-hose cartoon style, made of
<MATERIAL>, hand-inked wobbly dark-sepia outlines, FLAT cel paint with no
gradients or gloss, muted palette dominated by <HEX>, on a transparent
512x160 canvas. ALL ornament must sit within the left 128 pixels and the
right 128 pixels; the middle 256 pixels must be a plain flat board with no
motif and no centred detail, light enough for dark text to be legible on
it. No text. RGBA transparency.
```

## Delivery table

| Batch | Assets | Status |
|---|---|---|
| P7a emblems | 7 × emblem_*.png | PENDING |
| P7b nameplates | 7 × nameplate_*.png (+ optional ui_nameplate) | PENDING |

---

# PRIORITY 8 — THE BATTLEFIELD (added 2026-08-29)

The combat screen is the last unpainted surface in the game. Everything else
on it is now art: units, hives, cards, frames. The ground they fight on is
still a flat cream gradient.

## Layout the art must respect

Landscape. Each side's **hive stands at the vertical centre**, level with the
middle of three horizontal lanes; troops march between them across the middle
~50% of the width. The engine draws lane bands, dashed lane dividers, unit
shadows and all UI on top.

So the painting is **ground, not scenery**: it must stay quiet enough that
small bugs read against it.

| File | Size | Notes |
|---|---|---|
| `battle_bg.png` | 1600×800 | Opaque. Cover-fitted, so keep anything essential away from the outer 8%. |

```
A vintage 1930s rubber-hose cartoon garden battleground seen from a low
side-on angle, painted in FLAT cel colours with no gradients and no gloss:
a broad strip of bare trodden earth running left to right across the middle
of the frame for armies to march on, bordered above by a soft band of
out-of-focus grass, clover and a few pale flowers, and below by a darker
foreground fringe of grass blades and a fallen leaf or two. Muted warm
parchment and olive palette, hand-inked wobbly sepia outlines, subtle aged
paper grain. The centre of the frame must stay OPEN, LOW-CONTRAST and
UNCLUTTERED — no large objects, no strong shapes, nothing that would
compete with small insect characters standing on it. No text, no
characters, no border. Opaque 1600x800.
```

**Watch for:** anything busy or high-contrast in the middle band will fight
the units. When in doubt, make it plainer — the drama comes from the bugs.

| Batch | Assets | Status |
|---|---|---|
| P8 battlefield | battle_bg + 7 faction grounds | **ALL ACCEPTED** 2026-08-29 — delivered as a generic ground plus one per kingdom, which is better than spec'd: the engine crossfades your soil into the enemy's at the centre, so every matchup is fought on its own frontier. QA converted the set from PNG to JPEG (opaque, no alpha needed): 21.8MB → 2.2MB, a 90% saving. |

## Format note (added 2026-08-29)

Opaque full-screen paintings — `battle_bg*`, `map_bg` — ship as **JPEG**,
not PNG. They carry no transparency, and as PNG the battlefield set alone
was 21.8MB against 2.2MB as quality-86 JPEG. The engine picks the extension
automatically, so deliver whichever is convenient and QA converts.
Everything with transparency (sheets, frames, emblems, plates, glyphs)
stays PNG.

---

# PRIORITY 9 — KINGDOM WORDMARKS (added 2026-08-29)

The map legend still sets each kingdom's name in the system UI font, which
looks pasted onto the hand-painted nameplate banners. These replace it with
hand-lettered art.

## Format (7 files)

`wordmark_<faction>.png` — **512×128** RGBA, fully transparent background.

- The lettering fills the canvas: no framing, no plaque, no background
  shape. The banner behind it is already painted.
- It renders **13px tall** in the legend, so keep the letterforms bold and
  open. No hairlines, no tight counters, no long descenders.
- Single line, all caps, drawn horizontally (no arch — it sits on a flat
  banner middle).
- Trim tight: the engine scales by the image's own aspect, so empty margin
  becomes wasted width.

## The seven

| File | Word | The lettering is |
|---|---|---|
| `wordmark_ants.png` | ANTS | chunky ember-red slab capitals, edges nicked like chewed earth, a couple of pebble specks in the counters |
| `wordmark_wasps.png` | WASPS | sharp brass-gold capitals with clipped 45° corners, thin black hazard striping across the strokes |
| `wordmark_beetles.png` | BEETLES | heavy steel-blue block capitals, riveted at the stroke ends, one dented letter |
| `wordmark_mantids.png` | MANTIDS | tall elegant jade capitals with fine tapered serifs curling like leaf tips |
| `wordmark_termites.png` | TERMITES | bone-pale capitals with hairline cracks running through them, one letter part-eaten |
| `wordmark_moths.png` | MOTHS | soft dusk-violet capitals with faint wing-scale dusting and a hairline of silk trailing off the last letter |
| `wordmark_neutral.png` | WILDS | rough olive capitals overgrown with a few weed sprigs and thorns |

### Prompt template
```
The single word <WORD> hand-lettered in vintage 1930s rubber-hose cartoon
style, <DESCRIPTION>, FLAT cel paint with no gradients and no gloss, heavy
wobbly dark-sepia outlines, muted palette dominated by <HEX>, all capitals
on one horizontal line filling a transparent 512x128 canvas edge to edge.
Bold open letterforms that stay legible when shrunk to 13 pixels tall. No
background, no frame, no plaque, no extra ornament. RGBA transparency.
```

**Watch for:** anything that only reads at full size. Squint at 13px — if a
letter closes up or a stroke disappears, thicken it.

| Batch | Assets | Status |
|---|---|---|
| P9 wordmarks | 7 x wordmark_*.png | **ALL ACCEPTED** 2026-08-29 — QA alpha-trimmed them; the engine sizes each chip from the image's aspect, so transparent margin was becoming wasted banner width. |

---

# PRIORITY 10 — THE FURNITURE (added 2026-08-29)

Everything the player *fights with* is painted. Everything the player
*clicks* is still CSS: buttons, screen grounds, the sunburst behind SPLAT!,
the energy meter, the shop plaques, the kingdom cards. This batch finishes
the game.

**Every hook is already live in the engine.** Drop a file in, refresh, it
swaps itself in. Partial deliveries are fine — each family switches on
independently, and anything missing keeps its current drawn version.

## THE BRIEF FOR THIS BATCH

Nature-inspired 1930s rubber-hose, **wacky and alive**. The difference from
the earlier batches: this is furniture, so it must be characterful without
being loud. Rules:

- **Flat cel paint. No gradients, no gloss, no metallic sheen.** Two or
  three flat tones plus one hard-edged shadow shape.
- **Wobbly dark-sepia ink** (`#1b120c`) of visibly uneven weight.
- Everything is **made of garden**: wood, bark, leaf, petal, pebble, husk,
  chitin, silk, mud. Nothing looks manufactured or moulded.
- **Alive** means asymmetry and imperfection — a knot in the wood, one
  bent nail, a leaf that grew past the frame, a chewed corner. Never a
  clean repeated pattern.
- Muted aged palette: parchment `#f0e3c8`, ink `#2b1d16`, brass `#e0a51e`,
  blood `#d84b2a`. Saturation stays low.
- **These sit behind text.** Anywhere a label goes, keep it quiet and
  light. When in doubt, plainer.

## P10a — BUTTON PLATES (4 files, RGBA)

`512×192` each. **9-slice with a 30px border**: the outer 30px is the
decorated edge, the middle stretches. Keep the centre plain and light — a
label sits on it. Transparent outside the plate.

| File | It is |
|---|---|
| `ui_btn.png` | a plank of pale weathered wood, grain running lengthwise, one knot near a corner, two bent brass tacks at the ends |
| `ui_btn_primary.png` | the same plank in warm brass-tinted wood, a small leaf sprig curling over one corner |
| `ui_btn_danger.png` | the same plank in dark red-stained wood, one corner splintered and a thorn hooked over the edge |
| `ui_pill.png` | `256×96`, 22px border — a smaller rounded bark tag for the map HUD readouts, dark so cream text reads on it |

## P10b — SCREEN GROUNDS (3 files, opaque, JPEG fine)

`1600×900`. These sit behind menus, so the **middle must be calm** —
buttons and lists sit there. Put the interest at the edges.

| File | The view |
|---|---|
| `menu_bg.jpg` | A garden at golden hour seen from insect height: soft out-of-focus grass and clover filling the lower third, tall stems and a few pale flowers framing the left and right edges, warm hazy sky above. Centre open and low-contrast. |
| `select_bg.jpg` | The same garden at dusk, but read as a war council: a broad flat stone or tree stump surface filling the frame like a table top, faint chalk territory scratches on it, a few leaves and pebbles resting at the corners. |
| `shop_bg.jpg` | The inside of a hollow log trading post: curved bark walls, shelves cut into the timber holding jars, seeds and folded leaves, a warm lantern glow from the left. Centre wall plain enough for cards to sit against. |

## P10c — TITLE CARDS (5 files, RGBA)

The loudest moment in the game and currently a CSS gradient.

| File | Size | It is |
|---|---|---|
| `burst_gold.png` | 1024×1024 | A hand-inked cartoon sunburst: uneven wedge rays radiating from centre in brass and cream, wobbly edges, no two wedges the same width. Transparent between the outer ray tips. **Nothing in the middle third** — lettering goes there. |
| `word_splat.png` | 1024×384 | The word **SPLAT!** hand-lettered, bulging cartoon capitals, blood-red with cream highlight and heavy sepia ink, letters at different angles as if hit. |
| `word_victory.png` | 1024×384 | The word **VICTORY!** in triumphant brass capitals with a leaf-sprig flourish under it. |
| `word_squashed.png` | 1024×384 | The word **SQUASHED!** with the letters compressed and drooping, one letter flattened. |
| `word_unlocked.png` | 1024×384 | The word **UNLOCKED!** in bright cream capitals with small sparks flying off. |

All four words: transparent background, no plaque, trimmed tight.

## P10d — BATTLE HUD (2 files, RGBA)

| File | Size | It is |
|---|---|---|
| `ui_energy_frame.png` | 512×48 | A long hollow trough of pale bark with inked ends, empty in the middle — the energy meter's housing. The fill is drawn inside it. |
| `ui_energy_fill.png` | 64×48 | A short **horizontally tileable** slab of glowing amber nectar with a wobbly top edge. It repeats to fill the trough, so left and right edges must match seamlessly. |

## P10e — PLAQUES (3 files, RGBA)

| File | Size | It is |
|---|---|---|
| `ui_card_upgrade.png` | 384×256, 34px 9-slice | A pressed-leaf plaque for shop upgrades: a broad flat leaf with its stem curling round one corner, veins at the edges, plain pale centre for the upgrade name and description. |
| `ui_card_kingdom.png` | 512×256, 34px 9-slice | A carved bark placard for the kingdom-select rows: rough bark border, plain sanded centre, a small nail at each end. |
| `ui_divider.png` | 512×24 | A thin horizontal vine rule: a tendril with two or three tiny leaves, tapering to points at both ends, for under section headings. |

## Delivery table

| Batch | Assets | Status |
|---|---|---|
| P10a buttons | ui_btn, ui_btn_primary, ui_btn_danger, ui_pill | **ACCEPTED** 2026-08-29 |
| P10b grounds | menu_bg, select_bg, shop_bg | **ACCEPTED** 2026-08-29 — all three centres measured calm (stdev 7-28) |
| P10c title cards | burst_gold + 4 words | **ACCEPTED** 2026-08-29 — burst centre 1% opaque, lettering reads |
| P10d battle HUD | ui_energy_frame, ui_energy_fill | **ACCEPTED** 2026-08-29 — nectar tile seam is mathematically perfect (0.0 channel diff) |
| P10e plaques | ui_card_upgrade, ui_card_kingdom, ui_divider | **ACCEPTED** 2026-08-29 — see the 9-slice note below |

**17 files.** With these the game has no programmer art left in it.

## 9-slice note (learned on P10e, 2026-08-29)

Two plaques needed their slice retuned in-engine, worth knowing for future
framed art:

- **Keep ornament inside the slice.** The leaf plaque's stem curls reach
  about 25% into the artwork, past the nominal 34px border, so they were
  being stretched across the middle exactly where the title sits. Fixed by
  slicing deeper (62/34/46) rather than by moving the text.
- **`round` tiles the middle, `stretch` scales it.** The bark placard has
  vertical posts in its middle band; tiled, they repeated across the card
  and cut through the label. Anything with structure in the middle wants
  `stretch`.

The practical rule: **if a motif is not in the corner, it will be repeated
or stretched.** Put ornament in the corners, keep the middle plain.

---

# PRIORITY 11 — FACTION CONSISTENCY CORRECTION (added 2026-08-29)

Side by side, two rosters sit outside the house style. This is measured,
not an impression — sampling every opaque pixel of five units per faction:

| faction | luminance | saturation | near-black ink |
|---|---|---|---|
| **ants (the reference)** | 39 | 60 | **14%** |
| wasps | 46 | 58 | 17% |
| **beetles** | **25** | **38** | **55%** |
| mantids | 37 | 53 | 24% |
| termites | 42 | 58 | 22% |
| moths | 55 | 38 | 9% |

**The ants are the standard.** Solid ember-red bodies, clear cel shading,
cream gloves and shoes, bold but not heavy ink, pie-cut eyes, chunky
readable silhouettes. Everything should sit near their numbers.

## P11a — BEETLES: full re-roll (7 sheets)

Beetles carry **four times the ink coverage of the ants** and are the
darkest, least saturated roster by a wide margin. On the battlefield the
Stag and the Hercules read as black blobs rather than characters.

**This is very likely our fault, not the artwork's.** That batch arrived
with its alpha crushed and was restored here by reversing a white matte and
multiplying alpha — a lossy repair that plainly over-darkened it. So please
**re-generate all seven from scratch and deliver raw**, rather than trying
to correct the files in the repo.

Re-deliver: `btl_ladybird`, `btl_weevil`, `btl_tortoise`, `btl_stag`,
`btl_bombardier`, `btl_rhino`, `btl_hercules` — same subjects and poses as
the accepted originals, same `1536×256` six-frame format.

Corrections to apply while re-rolling:

- **Steel blue must read as blue**, not near-black. Target the mid-tone of
  the Iron Acorn hive, which is correct — the units drifted far darker.
- **Ink is an outline, not a fill.** Carapaces are large flat blue shapes
  with one darker shadow shape; they are not filled with black.
- Keep the cream gloves and shoes at full brightness — they are the value
  contrast that makes the ants read, and the beetles have lost them into
  the dark.
- Aim for roughly **luminance 35–42, saturation 50–60, ink under 25%**.

## P11b — WASPS: wing correction (5 sheets)

The wasps' tone is fine; the problem is compositional. Their wings are
**large flat cream ovals with no interior structure**, so each character
reads as a small body behind two blank paddles — unfinished next to the
other factions.

Re-deliver the winged five: `wasp_drone`, `wasp_jacket`, `wasp_lancer`,
`wasp_hornet`, `wasp_queen`. (`wasp_paper` and `wasp_dauber` are ground
units and are fine as they are.)

Corrections:

- **Smaller wings relative to the body.** The body is the character; wings
  should read as motion, not as the largest shape on the sheet.
- **Give the wing interior structure** — a few dark vein lines and a panel
  break, so it reads as a wing rather than a paddle.
- **Suggest translucency**: let the body's silhouette show faintly through
  where a wing crosses it, the way a real wasp's wing does.
- Keep the brass-gold and black striping strong on the body so the faction
  colour still carries at 64px.

## Delivery table

| Batch | Assets | Status |
|---|---|---|
| P11a beetles re-roll | 7 unit sheets, RAW | PENDING |
| P11b wasp wings | 5 unit sheets, RAW | PENDING |

Deliver raw per the standing protocol — no background cleanup, no alpha
correction. That is exactly what damaged the beetles the first time.

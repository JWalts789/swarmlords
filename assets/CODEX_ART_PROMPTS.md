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
| P3 mantids | M1–M6 | PENDING |
| P3 termites | TE1–TE7 | PENDING |
| P3 moths | MO1–MO7 | PENDING |

Total: 48 unit sheets + 7 hives + wordmark + icon. The game is fully
playable on placeholders the whole way — deliver in priority order and the
engine upgrades itself sheet by sheet.

# SWARMLORDS 🐜👑

A Warlords: Call to Arms–style lane battler × roguelike conquest, set in
warring insect kingdoms, in wacky 1930s rubber-hose cartoon style.
Portrait mobile PWA — vanilla JS + Canvas 2D, zero dependencies.

**Design source of truth:** [DESIGN.md](DESIGN.md)

## The loop

Pick a kingdom → a fresh garden map is generated with three rival kingdoms
and the neutral wilds → each turn: attack, fortify, or wait, while rivals
war with each other for real → battles are 4-lane card-and-energy fights,
chew the enemy hive to zero → conquest recruits the loser's species into
your deck, territories pay gold and boons every turn, the capital shop
sells tiered species and run-long upgrades → lose a battle and you lose the
territory, not the run → **last kingdom standing wins the garden.**

## Run it locally

Any static server from this folder, e.g.:

```
python -m http.server 8080
```

→ http://localhost:8080 (phone-shaped window or device emulation; it's
portrait-first). Opening `index.html` directly via `file://` also works
(the service worker just skips registration).

## Deploy (GitHub Pages, same as Moth)

```
git init
git add -A
git commit -m "SWARMLORDS v1"
gh repo create swarmlords --public --source . --push
```

Then repo Settings → Pages → deploy from `main` / root. The PWA installs
from the Pages URL; it's offline-capable after first load.

**Every deploy after the first: bump `CACHE` in `sw.js`** (v1 → v2 → ...)
or installed players keep the old version.

## Art & music drops

- **Codex art:** see [assets/CODEX_ART_PROMPTS.md](assets/CODEX_ART_PROMPTS.md).
  Drop finished sheets into `assets/sprites/` with the exact filenames —
  the engine probes for them at boot and swaps out its placeholder vectors
  automatically. No code changes, ever.
- **Suno music:** see [assets/MUSIC_PROMPTS.md](assets/MUSIC_PROMPTS.md).
  Drop MP3s into `assets/music/` (`title.mp3`, `map.mp3`, `battle.mp3`,
  `victory.mp3`, `defeat.mp3`). Missing tracks = silence, never errors.

## Code map

| File | What it is |
|---|---|
| `js/data.js` | All content: 6 factions, 48 units, tactics, upgrades, boons, names |
| `js/battle.js` | Lane battle sim + battle AI + renderer |
| `js/conquest.js` | Run state, turn loop, rival map AI, captures, map renderer |
| `js/mapgen.js` | Seeded 20-territory garden generation |
| `js/shop.js` | Species market, upgrades, card removal |
| `js/ui.js` | Screens, modals, drafts, toasts, title cards |
| `js/sprites.js` | Placeholder rubber-hose vector art + PNG sheet auto-swap |
| `js/audio.js` | WebAudio SFX synth + music auto-loader |
| `js/save.js` | localStorage meta (unlocks) + run (campaign) saves |
| `js/main.js` | Boot, canvas loop, input routing |

## Balance notes (v1, from headless sim sweeps)

- Enemy garrison armies are FINITE (their budget builds a one-pass deck);
  the player's deck cycles. Weak garrisons also regen energy slower.
- Heavy fliers with the `strafe` trait can fight ground; plain fliers
  only dogfight and go for the hive.
- Termite hive-damage passive is +50% (2× auto-won every race).
- Rival grudges cap at 3 and losing territory bleeds rival power,
  so rival-vs-rival wars actually END instead of seesawing forever.

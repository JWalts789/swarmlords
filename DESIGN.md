# SWARMLORDS — Design Document (source of truth)

*Locked 2026-08-23 via planning interview. Warlords: Call to Arms–style lane
battler × roguelike conquest, insect kingdoms, wacky Cuphead-style graphics,
mobile portrait PWA. Claude builds all code with placeholder vector art behind
a swap interface; Codex delivers art sheets; Suno delivers music.*

---

## 1. Pitch

You are a Swarmlord — the sovereign of an insect kingdom warring over one
overgrown garden. Each run generates a fresh conquest map of territories held
by rival insect factions. Battles are portrait lane fights: energy trickles
in, you play unit cards from your hand into one of four lanes, your bugs march
up-screen and chew the enemy hive to splinters. Losing a battle loses the
territory, not the run — you're only out when you hold no ground at all.
**Last faction standing wins the garden.**

Tone: 1930s rubber-hose cartoon. Bugs with pie-cut eyes and noodle limbs,
brass-band violence, melodramatic title cards ("A GRUB START!", "SQUASHED!").

## 2. Locked decisions (from interview)

| Decision | Choice |
|---|---|
| Theme | Insect kingdoms |
| Orientation | ~~Portrait, vertical lanes~~ **LANDSCAPE, horizontal lanes (playtest revision 2026-08-26)** — player hive left, units march right in their native sprite facing; enemy mirrors. Map transposed to 5×4. |
| Run structure | **Conquest map generated per run.** Living map: AI factions attack each other too. Lose a battle → lose that territory to the victor. Eliminated at 0 territories. Win = last faction standing. |
| Spawning | Card hand + energy (Clash Royale style) |
| Battle win | Destroy the enemy hive (HP bar each end) |
| Deck growth | Conquest recruitment on victory + territories give passive per-turn benefits (plan a campaign trail toward the resources you need) + gold shop with roguelike upgrades and a tiered species market |
| Defense | Player chooses per attack: fight manually or auto-resolve via garrison |
| Meta | Pick a faction at run start; win/milestones unlock more factions |
| Art | Wacky Cuphead-style (1930s rubber-hose cartoon, full color) |
| Build | Claude codes everything (vanilla JS + Canvas 2D, zero deps, PWA); Codex art via CODEX_ART_PROMPTS.md; Suno music via MUSIC_PROMPTS.md |
| Name | SWARMLORDS |

Out of scope v1: multiplayer, ads/IAP, landscape, daily quests, cloud saves.

## 3. The factions

Six playable kingdoms + a neutral wilds pool. Each faction: accent color,
distinct silhouette language, ~8 cards (6 units, 1 champion, 1–2 tactics),
a faction passive, and a start deck of 10.

| Faction | Kingdom name | Color | Identity | Passive |
|---|---|---|---|---|
| ANTS | The Ember Colony | ember red `#d84b2a` | cheap swarm, numbers, sacrifice | +1 max energy (they out-economy everyone) |
| WASPS | The Gilded Swarm | brass gold `#e0a51e` | fast fliers, glass cannons | Fliers +15% speed |
| BEETLES | The Shellback Legion | steel blue `#3f7fae` | slow heavy armor, unstoppable walls | All units +1 armor |
| MANTIDS | The Sickle Court | jade green `#4da05c` | few, elite, expensive duelists | Units +25% damage while unhurt |
| TERMITES | The Hollow Dominion | bone `#cfc3a8` | siege, hive-chewing, blockers | Units deal +50% hive damage (was 2×; smoke-tested as auto-win) |
| MOTHS | The Veiled Choir | dusk violet `#8f6bb8` | support auras, debuff dust, healing | Hive regenerates 1 HP / 6s |

Unlock order: Ants (start) → Wasps (conquer 5 territories in a run) →
Beetles (win a run) → Mantids (win a run as Wasps or Beetles) → Termites
(eliminate 2 rival factions in one run) → Moths (win a run in ≤ 20 turns).
(Exact triggers live in `data.js`; keep them generous — this is a hook, not a grind.)

**Neutral wilds** (garrison unplayable territories, never playable): Orb
Weaver (webs — slows what it hits), Wolf Spider (fast pouncer), Centipede
(long, high damage), Pillbug (rolls up — armored tank), Snail (huge slow
tank), Slug (splits into two sluglets when killed).

## 4. Battle system

### Field
- Portrait canvas. **4 lanes** (columns). Enemy hive spans the top, your hive
  spans the bottom. Hive HP: **30** each (some territories/upgrades modify).
- Units spawn at your hive edge in the chosen lane, march up at their move
  speed, stop to fight what they meet, and on reaching the enemy hive deal
  their **hive damage** with a chomp and burrow in (unit is consumed).

### Cards, hand, energy
- **Energy:** 10 cap, +1 per 1.5 s, both sides. Battles start at 5.
- **Hand:** 4 cards + next-card preview. Played card cycles to the bottom of
  the draw pile (Clash Royale model). Deck = whatever your run army is
  (start 10 cards; recruitment grows it; shop can trim it).
- **To play:** tap a card to arm it, tap a lane to deploy. Tap the armed card
  again to cancel. Tactic cards target a lane or fire globally per card.

### Unit stat block
`cost, hp, dmg, atkInterval, speed, range (0 melee / px ranged), flying,
canTargetAir, hiveDmg, armor (flat dmg reduction), traits[]`

### Rock–paper–scissors
- **Fliers** pass over ground units (no engagement) and go straight for the
  hive, but have modest hive damage and are shredded by anything with
  `canTargetAir`. Fliers do engage enemy fliers.
- **Swarms** (many cheap bodies) beat single big units, lose to **splash**.
- **Armor** (flat reduction) beats fast weak hits, loses to big slow hits.

### Battle AI
Enemy runs the same energy/hand rules with a deck built from the defending
territory's garrison (faction roster × strength budget). Heuristic: defend
the lane with the scariest incoming push; otherwise reinforce its strongest
attack lane; small random jitter so it doesn't metronome. AI power scales
with garrison strength and run turn count (see §7 difficulty).

### Defense battles
Same layout — you are ALWAYS the bottom hive. When defending, the stakes
banner and title card change ("HOLD THE MOUND!"), and the enemy deck is the
attacker's faction.

## 5. Conquest layer

### Map generation (per run, seeded)
- **20 territories** as an organic node graph filling the portrait screen:
  jittered grid positions, connected to 2–4 near neighbors, no crossings.
- 1 player capital + **3 rival faction capitals** (drawn from the 5 factions
  you didn't pick) in corners; each faction starts with capital + 2 adjacent
  territories. The rest are neutral wilds with fixed garrisons.
- Territory fields: generated name ("Foxglove Rise", "The Rotten Log",
  "Dew Gulch"), terrain flavor, **gold yield** (1–4/turn), optional
  **boon** while held (one of: +1 battle start energy, +5% unit HP, +5% unit
  dmg, +1 starting hand card, hive +5 HP, shop discount 20%), garrison
  strength, owner.
- Capitals: high yield, +10 hive HP when defending them, and losing your
  capital does NOT end the run (only 0 territories does) — but it stings:
  shop access travels with your capital, so if it falls, your cheapest
  remaining territory becomes the new capital at half shop stock.

### Turn loop
1. **Income:** collect gold from all held territories; boons apply.
2. **Player action (pick one):** ATTACK an adjacent enemy/neutral territory
   (→ manual battle), FORTIFY (+garrison on a territory, costs gold), or
   WAIT (+2 gold). Shop is open any time during your turn, no action cost.
3. **Rivals act:** each AI faction attacks a neighbor (player or each other)
   or fortifies. AI-vs-AI resolves off-screen: strength + garrison + noise;
   winner takes the territory. Attacks on YOU → defense choice: **FIGHT**
   (manual battle) or **AUTO** (your garrison + army power vs their attack
   power, weighted roll; result shown).
4. **Check:** factions at 0 territories are eliminated (with an obituary
   toast — "The Sickle Court has fallen."). One faction left → run ends.

### Conquest rewards
- Win an attack → take the territory + gold loot + **recruitment draft:
  pick 1 of 3 cards native to the defender's faction** (neutral territories
  offer neutral mercenary cards — yes, you can recruit the spider). This is
  the main deck engine — a wasp player who wants beetle walls must campaign
  into beetle land.
- Win a defense → gold + small draft chance (1 of 2, 50%).

### Rival AI (map brain)
Each rival: aggression + grudge weights. Prefers weakest adjacent target,
prefers territories with boons, remembers who attacked it (grudge bonus),
gets bolder as its territory count grows. AI factions fight each other for
real — expect runs where a rival eats another and snowballs.

## 6. Economy & shop

- **Gold** from territory yield per turn, battle loot, WAIT action.
- **Shop** (at your capital, open during your turn):
  - **Species market:** 3 rotating unit cards. Tier gate = territories held:
    T1 always; T2 at 4+; T3 at 7+; champions at 10+. Reroll costs gold.
  - **Upgrades (run-persistent, the roguelike sauce):** e.g. Royal Jelly
    (+15% unit HP), Serrated Mandibles (+15% dmg), Rally Pheromones (+1
    battle start energy), Deep Tunnels (5-card start hand), Nectar Cache
    (+2 gold/turn), Silk Stitches (hive regen), Venom Sacs (attacks poison),
    Chitin Plating (+1 armor). Offered 2 at a time; bought ones stay for the
    whole run.
  - **Card removal:** trim your deck for gold (cost scales).
- **Garrisons:** gold → +strength on a territory. Feeds auto-resolve defense
  and deters rival AI (they see strength).

## 7. Difficulty & pacing

- Run target: 30–60 min, ~20–35 turns.
- Rival battle decks scale with `garrison + turn × ramp`. Ramp tuned so early
  neutrals are tutorials and late capitals are bosses.
- Auto-resolve is intentionally a bit worse than playing well — fighting
  matters, but auto saves time on stomps.
- Defeat screen = vintage title card ("SQUASHED!") + run stats + unlock
  progress. Victory = "KING OF THE GARDEN" card + faction win recorded.

## 8. Screens

TITLE → FACTION SELECT (locked ones show unlock hint) → RUN (CONQUEST MAP ⇄
BATTLE ⇄ SHOP ⇄ DRAFT) → RESULTS (victory/defeat) → back to TITLE.
Persistent top bar on map: gold, territories, turn, deck button (view deck).

## 9. Tech

- **Vanilla JS + Canvas 2D, zero dependencies.** DOM overlays for menus,
  hand, shop, drafts; canvas for map and battle rendering.
- Portrait PWA: manifest + service worker cache-first (bump `CACHE` version
  per deploy), installable, offline after first load.
- Seeded RNG (mulberry32) — a run is reproducible from its seed.
- Save: localStorage. `meta` (unlocks, stats, settings) + `run` (seed, map
  state, deck, gold, upgrades, turn) — mid-run resumable, saved every turn
  and after every battle.
- **Art swap interface (MOTH pattern):** `sprites.js` draws every unit/UI
  element as placeholder vector rubber-hose art. On boot it probes
  `assets/sprites/<name>.png` per the manifest; any sheet found replaces the
  placeholder automatically. No code changes per delivery.
- SFX: WebAudio synth (boings, chomps, brass stabs). Music: auto-loads
  `assets/music/*.mp3` when dropped (per MUSIC_PROMPTS.md), silent otherwise.
- Deploy: GitHub Pages, repo `JWalts789/swarmlords` (git init this folder).
- Project home: `C:\Users\gimme\Swarmlords` (outside OneDrive, like Moth).

## 10. Asset pipeline

- `assets/CODEX_ART_PROMPTS.md`: every sheet with exact filename, size, frame
  grid, prompt in Cuphead/rubber-hose language, and a QA checklist. Priority:
  neutrals + Ants (every run needs them) → rival faction rosters in unlock
  order → UI/title cards → capitals/terrain.
- `assets/MUSIC_PROMPTS.md`: Suno prompts — 1930s hot jazz / swing: title
  rag, map stroll, battle stomp, defense variant, victory fanfare stinger,
  defeat dirge stinger.

## 11. Build order

1. Scaffold: PWA shell, screens router, save, RNG, sprites placeholder layer.
2. Battle: sim (lanes, march, combat, fliers, hives), hand/energy UI, battle
   AI, win/lose flow. **Prove the fun here first.**
3. Data: all 6 faction rosters + neutrals + tactics + upgrades.
4. Conquest: mapgen, turn loop, rival map AI, auto-resolve, defense choice.
5. Economy: drafts, shop (market/upgrades/removal), garrisons, boons.
6. Meta: faction select, unlocks, results cards, run save/resume.
7. Polish: title cards, SFX, music hooks, PWA install, icon.
8. Docs: art prompts, music prompts, README deploy steps.

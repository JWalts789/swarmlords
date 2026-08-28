# SWARMLORDS — Suno Music Prompts

**DELIVERED 2026-08-28** — seven tracks are in `assets/music/`, 16:07 total:
`title` (1:24), `map1` (2:23), `map2` (1:39), `battle1` (2:45),
`battle2` (3:01), `victory` (2:48), `defeat` (2:03).

The engine supports **multiple variants per cue**: it picks one of the
`map*` tracks each time you return to the map and one of the `battle*`
tracks each battle, never repeating the same variant twice running, and
crossfades between cues. To add more variety later, just drop in
`map3.mp3` / `battle3.mp3` and add the name to `VARIANTS` in `js/audio.js`.

Filenames must be **lowercase** — GitHub Pages is case-sensitive, so
`Title.mp3` will 404 on the live site even though it works on Windows.

Music is deliberately excluded from the service-worker cache: media uses
HTTP Range requests, which a cache-first full response can break, and it
keeps ~22MB out of the offline quota. The game stays fully playable
offline, just silent.

All tracks loop in-engine. Instrumental only, no vocals. Target one band
across the set: **1930s hot jazz / big-band swing with 78rpm grit** — the
Cuphead sound.

## `title.mp3` — the front porch of the war
```
Instrumental 1930s hot jazz rag, medium swing, muted trumpet lead with
plunger wah, upright bass, brushed drums, tack piano, playful and
mischievous like a cartoon about to start trouble, vintage 78rpm warmth,
seamless loop, no vocals. 90-120 seconds.
```

## `map.mp3` — plotting over the garden map
```
Instrumental 1930s swing stroll, relaxed walking tempo, pizzicato bass
and tiptoe clarinet trading a sneaky theme, occasional xylophone sparkle,
scheming but unhurried, like a general pushing tin soldiers around a map,
vintage big-band recording character, seamless loop, no vocals.
2 minutes.
```

## `battle.mp3` — the lanes are burning
```
Instrumental 1930s cartoon brawl music, frantic hot-jazz ragtime at
breakneck tempo, hammering stride piano and slap upright bass driving
underneath, screaming plunger-muted trumpet and squealing clarinet
trading frantic licks over the top, honking tuba accents, xylophone runs
tumbling down like falling anvils, snare rolls and crash cymbals landing
on every impact, sudden stop-time breaks then straight back into the
chaos, the sound of a cartoon fistfight in a jazz club — reckless,
comedic and relentless, building in waves without ever resolving.
Vintage 78rpm recording grit, no vocals, seamless loop. 2 minutes.
```

## `victory.mp3` — king of the garden
```
Instrumental triumphant big-band fanfare into a short strutting victory
swing, full brass hits, celebratory drum fills, cocky and gleeful,
1930s cartoon finale energy, resolves cleanly so it can loop as a
victory-screen vamp, no vocals. 45-60 seconds.
```

## `defeat.mp3` — squashed
```
Instrumental mournful New Orleans funeral dirge for a cartoon insect,
slow muted trumpet lament over soft snare taps and low tuba, briefly
comic-tragic with a wilting trombone slide, 1930s recording warmth,
loops as a quiet defeat-screen vamp, no vocals. 45-60 seconds.
```

// SWARMLORDS — all game data: factions, cards, upgrades, boons, names.
window.SL = window.SL || {};

(function () {

  const FACTIONS = {
    ants: {
      id: 'ants', name: 'ANTS', kingdom: 'The Ember Colony',
      color: '#d84b2a', dark: '#8c2f19',
      blurb: 'Cheap bodies, endless bodies. Out-economy, out-swarm, overwhelm.',
      passiveDesc: '+1 max energy in battle',
      unlockHint: null, // starter
    },
    wasps: {
      id: 'wasps', name: 'WASPS', kingdom: 'The Gilded Swarm',
      color: '#e0a51e', dark: '#8f6812',
      blurb: 'Fast fliers and glass cannons. Skip the ground war entirely.',
      passiveDesc: 'Fliers +15% speed',
      unlockHint: 'Conquer 5 territories in one campaign',
    },
    beetles: {
      id: 'beetles', name: 'BEETLES', kingdom: 'The Shellback Legion',
      color: '#3f7fae', dark: '#26506f',
      blurb: 'Slow, armored, unstoppable. The wall that walks.',
      passiveDesc: 'All units +1 armor',
      unlockHint: 'Win a campaign',
    },
    mantids: {
      id: 'mantids', name: 'MANTIDS', kingdom: 'The Sickle Court',
      color: '#4da05c', dark: '#2f663a',
      blurb: 'Few, elite, immaculate. Every blade a duelist.',
      passiveDesc: 'Units +25% damage while unhurt',
      unlockHint: 'Win a campaign as Wasps or Beetles',
    },
    termites: {
      id: 'termites', name: 'TERMITES', kingdom: 'The Hollow Dominion',
      color: '#cfc3a8', dark: '#8a8069',
      blurb: 'Siege engineers. Ignore the army — eat the house.',
      passiveDesc: 'Units deal +50% hive damage',
      unlockHint: 'Eliminate 2 rival kingdoms in one campaign',
    },
    moths: {
      id: 'moths', name: 'MOTHS', kingdom: 'The Veiled Choir',
      color: '#8f6bb8', dark: '#5b4179',
      blurb: 'Dust, hymns and mending. Outlast everything.',
      passiveDesc: 'Your hive regenerates 1 HP / 6s',
      unlockHint: 'Win a campaign in 20 turns or fewer',
    },
    neutral: {
      id: 'neutral', name: 'WILDS', kingdom: 'The Wilds',
      color: '#7d8471', dark: '#4d5344',
      blurb: 'Spiders, myriapods and molluscs. They were here first.',
      passiveDesc: null, unlockHint: null,
    },
  };

  const FACTION_ORDER = ['ants', 'wasps', 'beetles', 'mantids', 'termites', 'moths'];

  // ---- passive mods per faction (applied to that side in battle) ----
  const PASSIVES = {
    ants:     { energyMax: 1 },
    wasps:    { flierSpdMult: 1.15 },
    beetles:  { armorAdd: 1 },
    mantids:  { unhurtDmgMult: 1.25 },
    termites: { hiveDmgMult: 1.5 },
    moths:    { hiveRegen: 1 / 6 },
    neutral:  {},
  };

  // ---- unit helper ----
  function U(id, faction, tier, cost, name, s, art, desc) {
    return Object.assign({
      id, faction, tier, cost, name, type: 'unit',
      hp: 30, dmg: 6, atkInt: 1.0, spd: 40, range: 0,
      fly: false, air: false, hiveDmg: 2, armor: 0, traits: {},
      art: art || {}, desc: desc || '',
    }, s);
  }
  function T(id, faction, tier, cost, name, effect, desc, art) {
    return { id, faction, tier, cost, name, type: 'tactic', effect, desc, art: art || {} };
  }

  const C = {}; // all cards by id
  function add(def) { C[def.id] = def; }

  // ================= ANTS — swarm =================
  add(U('ant_worker', 'ants', 1, 1, 'Worker Ants',
    { hp: 14, dmg: 3, atkInt: 0.8, spd: 55, hiveDmg: 1, traits: { swarm: 2 } },
    { shape: 'ant', size: 0.7, sheetScale: 1.2 }, 'Two eager little chompers.'));
  add(U('ant_soldier', 'ants', 1, 2, 'Soldier Ant',
    { hp: 38, dmg: 6, atkInt: 0.9, spd: 45, hiveDmg: 2 },
    { shape: 'ant', size: 1.0 }, 'The dependable line-bug.'));
  add(U('ant_spitter', 'ants', 2, 3, 'Acid Spitter',
    { hp: 24, dmg: 5, atkInt: 1.1, spd: 40, range: 120, air: true, hiveDmg: 1 },
    { shape: 'ant', size: 0.9, snout: true }, 'Sprays formic acid. Hits fliers.'));
  add(U('ant_bullet', 'ants', 2, 3, 'Bullet Ant',
    { hp: 30, dmg: 14, atkInt: 1.3, spd: 70, hiveDmg: 2 },
    { shape: 'ant', size: 1.0, mean: true }, 'Fast. Hits like a freight train.'));
  add(U('ant_carpenter', 'ants', 3, 4, 'Carpenter Ant',
    { hp: 85, dmg: 8, atkInt: 1.2, spd: 32, hiveDmg: 6 },
    { shape: 'ant', size: 1.3 }, 'Chews through hives like pine.'));
  add(U('ant_column', 'ants', 3, 5, 'Army Ant Column',
    { hp: 30, dmg: 5, atkInt: 0.9, spd: 50, hiveDmg: 1, traits: { swarm: 4 } },
    { shape: 'ant', size: 0.85 }, 'Four abreast, no manners.'));
  add(U('ant_queensguard', 'ants', 4, 6, "Queen's Guard",
    { hp: 150, dmg: 16, atkInt: 1.2, spd: 30, armor: 1, hiveDmg: 6, traits: { splash: 40 } },
    { shape: 'ant', size: 1.6, crown: true }, 'Champion. Sweeping mandible splash.'));
  add(T('ant_pheromone', 'ants', 1, 2, 'Pheromone Trail',
    { kind: 'laneBuff', stat: 'spd', mult: 1.6, dur: 5 },
    'Allies in a lane march +60% faster for 5s.', { icon: 'trail' }));
  add(T('ant_tunnel', 'ants', 2, 3, 'Tunnel Up',
    { kind: 'spawn', unit: 'ant_soldier', count: 2, at: 0.45 },
    'Two soldiers pop up mid-lane.', { icon: 'tunnel' }));

  // ================= WASPS — fliers =================
  add(U('wasp_drone', 'wasps', 1, 2, 'Drone',
    { hp: 26, dmg: 7, atkInt: 0.9, spd: 75, fly: true, air: true, hiveDmg: 2 },
    { shape: 'wasp', size: 0.9 }, 'Quick flier. Ignores the ground war.'));
  add(U('wasp_paper', 'wasps', 1, 2, 'Paper Wasp',
    { hp: 22, dmg: 5, atkInt: 1.0, spd: 40, range: 110, air: true, hiveDmg: 1 },
    { shape: 'wasp', size: 0.9, ground: true }, 'Ground sniper. Swats fliers.'));
  add(U('wasp_jacket', 'wasps', 2, 3, 'Yellowjackets',
    { hp: 20, dmg: 8, atkInt: 1.0, spd: 80, fly: true, air: true, hiveDmg: 1, traits: { swarm: 2 } },
    { shape: 'wasp', size: 0.75 }, 'Two angry stripes of spite.'));
  add(U('wasp_lancer', 'wasps', 2, 3, 'Lancer',
    { hp: 30, dmg: 16, atkInt: 1.4, spd: 85, fly: true, air: true, hiveDmg: 2 },
    { shape: 'wasp', size: 1.0, lance: true }, 'A stinger with wings on it.'));
  add(U('wasp_dauber', 'wasps', 3, 4, 'Mud Dauber',
    { hp: 70, dmg: 9, atkInt: 1.1, spd: 35, hiveDmg: 3 },
    { shape: 'wasp', size: 1.2, ground: true }, 'The Swarm’s idea of infantry.'));
  add(U('wasp_hornet', 'wasps', 3, 5, 'Hornet',
    { hp: 90, dmg: 18, atkInt: 1.2, spd: 65, fly: true, air: true, hiveDmg: 4, traits: { strafe: true } },
    { shape: 'wasp', size: 1.35 }, 'Heavy air. Fights sky AND ground.'));
  add(U('wasp_queen', 'wasps', 4, 7, 'Hornet Queen',
    { hp: 160, dmg: 22, atkInt: 1.3, spd: 55, fly: true, air: true, hiveDmg: 5, traits: { splash: 45, strafe: true } },
    { shape: 'wasp', size: 1.6, crown: true }, 'Champion. Royal air superiority.'));
  add(T('wasp_dive', 'wasps', 2, 3, 'Dive Raid',
    { kind: 'laneDamage', dmg: 8, air: true },
    '8 damage to every enemy in a lane.', { icon: 'dive' }));
  add(T('wasp_frenzy', 'wasps', 1, 2, 'Frenzy',
    { kind: 'laneBuff', stat: 'atk', mult: 1.5, dur: 5 },
    'Allies in a lane attack +50% faster for 5s.', { icon: 'frenzy' }));

  // ================= BEETLES — armor =================
  add(U('btl_ladybird', 'beetles', 1, 2, 'Ladybird',
    { hp: 45, dmg: 5, atkInt: 1.0, spd: 40, hiveDmg: 2 },
    { shape: 'beetle', size: 0.9, spots: true }, 'Deceptively adorable line-holder.'));
  add(U('btl_weevil', 'beetles', 1, 2, 'Weevil Gunner',
    { hp: 30, dmg: 6, atkInt: 1.2, spd: 35, range: 100, air: true, hiveDmg: 1 },
    { shape: 'beetle', size: 0.85, snout: true }, 'Pellet snout. Reaches the sky.'));
  add(U('btl_tortoise', 'beetles', 2, 3, 'Tortoise Beetle',
    { hp: 110, dmg: 4, atkInt: 1.4, spd: 25, armor: 2, hiveDmg: 2 },
    { shape: 'beetle', size: 1.15, dome: true }, 'A walking manhole cover.'));
  add(U('btl_stag', 'beetles', 2, 4, 'Stag Beetle',
    { hp: 95, dmg: 12, atkInt: 1.3, spd: 30, armor: 1, hiveDmg: 3 },
    { shape: 'beetle', size: 1.25, horns: true }, 'Pincers first, questions never.'));
  add(U('btl_bombardier', 'beetles', 3, 5, 'Bombardier',
    { hp: 55, dmg: 10, atkInt: 1.6, spd: 30, range: 130, air: true, hiveDmg: 2, traits: { splash: 35 } },
    { shape: 'beetle', size: 1.1, cannon: true }, 'Chemical artillery. Splashes.'));
  add(U('btl_rhino', 'beetles', 3, 6, 'Rhino Beetle',
    { hp: 160, dmg: 18, atkInt: 1.4, spd: 28, armor: 1, hiveDmg: 6 },
    { shape: 'beetle', size: 1.45, horn: true }, 'The Legion’s battering ram.'));
  add(U('btl_hercules', 'beetles', 4, 8, 'Hercules',
    { hp: 260, dmg: 26, atkInt: 1.5, spd: 24, armor: 2, hiveDmg: 8, traits: { splash: 40 } },
    { shape: 'beetle', size: 1.75, horn: true, crown: true }, 'Champion. A one-bug siege.'));
  add(T('btl_shellwall', 'beetles', 1, 2, 'Shell Wall',
    { kind: 'laneBuff', stat: 'armor', add: 2, dur: 6 },
    'Allies in a lane gain +2 armor for 6s.', { icon: 'shield' }));

  // ================= MANTIDS — elites =================
  add(U('man_nymph', 'mantids', 1, 2, 'Nymph',
    { hp: 30, dmg: 8, atkInt: 1.0, spd: 50, hiveDmg: 2 },
    { shape: 'mantis', size: 0.85 }, 'Small. Already judging you.'));
  add(U('man_stalker', 'mantids', 1, 3, 'Grass Stalker',
    { hp: 40, dmg: 12, atkInt: 1.1, spd: 60, hiveDmg: 2 },
    { shape: 'mantis', size: 1.0 }, 'Fast blades in the green.'));
  add(U('man_sickle', 'mantids', 2, 4, 'Sickle Guard',
    { hp: 75, dmg: 17, atkInt: 1.2, spd: 45, air: true, hiveDmg: 3 },
    { shape: 'mantis', size: 1.2 }, 'Snatches fliers out of the air.'));
  add(U('man_ghost', 'mantids', 2, 4, 'Ghost Mantis',
    { hp: 50, dmg: 14, atkInt: 1.1, spd: 55, hiveDmg: 2, traits: { dodge: 0.25 } },
    { shape: 'mantis', size: 1.0, ghost: true }, '25% of hits pass right through.'));
  add(U('man_orchid', 'mantids', 3, 5, 'Orchid Mantis',
    { hp: 60, dmg: 20, atkInt: 1.3, spd: 40, air: true, hiveDmg: 3 },
    { shape: 'mantis', size: 1.15, flower: true }, 'Beautiful. Then it isn’t.'));
  add(U('man_empress', 'mantids', 4, 8, 'The Empress',
    { hp: 190, dmg: 28, atkInt: 1.3, spd: 40, air: true, hiveDmg: 6 },
    { shape: 'mantis', size: 1.6, crown: true }, 'Champion. Court is in session.'));
  add(T('man_lunge', 'mantids', 1, 2, 'Lunge Order',
    { kind: 'laneBuff', stat: 'dmg', mult: 1.5, dur: 5 },
    'Allies in a lane deal +50% damage for 5s.', { icon: 'lunge' }));

  // ================= TERMITES — siege =================
  add(U('ter_worker', 'termites', 1, 1, 'Termite Worker',
    { hp: 20, dmg: 4, atkInt: 1.0, spd: 45, hiveDmg: 2 },
    { shape: 'termite', size: 0.75 }, 'Pale, humble, hungry for architecture.'));
  add(U('ter_snapjaw', 'termites', 1, 3, 'Snapjaw',
    { hp: 55, dmg: 10, atkInt: 1.1, spd: 38, hiveDmg: 2 },
    { shape: 'termite', size: 1.1, jaw: true }, 'Soldier caste. All head.'));
  add(U('ter_nasute', 'termites', 2, 3, 'Nasute Glueshot',
    { hp: 30, dmg: 6, atkInt: 1.1, spd: 35, range: 110, air: true, hiveDmg: 1, traits: { slow: { mult: 0.7, dur: 2 } } },
    { shape: 'termite', size: 0.9, snout: true }, 'Sticky spray slows what it hits.'));
  add(U('ter_rampart', 'termites', 2, 3, 'Mud Rampart',
    { hp: 140, dmg: 0, atkInt: 9, spd: 0, hiveDmg: 0, armor: 1 },
    { shape: 'mound', size: 1.2 }, 'Doesn’t move. Doesn’t care. Blocks the lane.'));
  add(U('ter_sapper', 'termites', 3, 4, 'Sapper',
    { hp: 60, dmg: 6, atkInt: 1.2, spd: 50, hiveDmg: 5 },
    { shape: 'termite', size: 1.0, pack: true }, 'Exists to reach the hive. Massive chomp.'));
  add(U('ter_alate', 'termites', 3, 4, 'Alate',
    { hp: 40, dmg: 8, atkInt: 1.1, spd: 60, fly: true, air: true, hiveDmg: 3 },
    { shape: 'termite', size: 0.95, wings: true }, 'The one day a year termites fly. It’s today.'));
  add(U('ter_king', 'termites', 4, 7, 'The Hollow King',
    { hp: 200, dmg: 16, atkInt: 1.3, spd: 26, armor: 1, hiveDmg: 7 },
    { shape: 'termite', size: 1.6, crown: true }, 'Champion. Eats load-bearing walls.'));
  add(T('ter_undermine', 'termites', 2, 3, 'Undermine',
    { kind: 'hiveDamage', dmg: 4 },
    'Deal 4 damage to the enemy hive directly.', { icon: 'mine' }));

  // ================= MOTHS — support =================
  add(U('mot_dustling', 'moths', 1, 1, 'Dustling',
    { hp: 22, dmg: 6, atkInt: 1.0, spd: 60, fly: true, air: true, hiveDmg: 1 },
    { shape: 'moth', size: 0.7 }, 'A whisper with wings.'));
  add(U('mot_sister', 'moths', 1, 3, 'Silk Sister',
    { hp: 35, dmg: 0, atkInt: 9, spd: 35, hiveDmg: 0, traits: { healer: { amt: 3, int: 1.2, range: 110 } } },
    { shape: 'moth', size: 0.95, ground: true, hood: true }, 'Mends allies ahead of her.'));
  add(U('mot_hawk', 'moths', 2, 4, 'Hawkmoth',
    { hp: 62, dmg: 14, atkInt: 1.1, spd: 80, fly: true, air: true, hiveDmg: 3, traits: { strafe: true } },
    { shape: 'moth', size: 1.1 }, 'Fastest wings in the garden.'));
  add(U('mot_dustcaster', 'moths', 2, 4, 'Dustcaster',
    { hp: 45, dmg: 8, atkInt: 1.2, spd: 35, range: 120, air: true, hiveDmg: 1, traits: { slow: { mult: 0.6, dur: 2.5 } } },
    { shape: 'moth', size: 1.0, ground: true, hood: true }, 'Sleep dust. Slows the rabble.'));
  add(U('mot_luna', 'moths', 3, 5, 'Luna Moth',
    { hp: 95, dmg: 16, atkInt: 1.2, spd: 55, fly: true, air: true, hiveDmg: 3, traits: { strafe: true } },
    { shape: 'moth', size: 1.3, tails: true }, 'Green silk and quiet menace.'));
  add(U('mot_witch', 'moths', 3, 6, 'White Witch',
    { hp: 110, dmg: 16, atkInt: 1.2, spd: 50, fly: true, air: true, hiveDmg: 4, traits: { splash: 40, strafe: true } },
    { shape: 'moth', size: 1.45, pale: true }, 'Dust bursts on every beat.'));
  add(U('mot_deathshead', 'moths', 4, 7, "Death's-head",
    { hp: 150, dmg: 20, atkInt: 1.2, spd: 55, fly: true, air: true, hiveDmg: 5, traits: { strafe: true } },
    { shape: 'moth', size: 1.6, skull: true, crown: true }, 'Champion. The choir goes quiet.'));
  add(T('mot_lullaby', 'moths', 2, 3, 'Lullaby Dust',
    { kind: 'laneSlow', mult: 0.4, dur: 4 },
    'Enemies in a lane are slowed 60% for 4s.', { icon: 'dust' }));
  add(T('mot_cocoon', 'moths', 1, 2, 'Cocoon Mend',
    { kind: 'laneHeal', amt: 20 },
    'Heal every ally in a lane for 20.', { icon: 'cocoon' }));

  // ================= NEUTRAL WILDS =================
  add(U('neu_orbweaver', 'neutral', 2, 4, 'Orb Weaver',
    { hp: 60, dmg: 8, atkInt: 1.1, spd: 30, range: 100, air: true, hiveDmg: 2, traits: { slow: { mult: 0.5, dur: 2 } } },
    { shape: 'spider', size: 1.1 }, 'Webs slow everything they touch.'));
  add(U('neu_wolf', 'neutral', 2, 4, 'Wolf Spider',
    { hp: 80, dmg: 16, atkInt: 1.1, spd: 75, hiveDmg: 3 },
    { shape: 'spider', size: 1.2, fuzzy: true }, 'Doesn’t spin. Chases.'));
  add(U('neu_centipede', 'neutral', 3, 6, 'Centipede',
    { hp: 140, dmg: 20, atkInt: 1.2, spd: 35, hiveDmg: 5 },
    { shape: 'centipede', size: 1.5 }, 'A hundred legs, one bad attitude.'));
  add(U('neu_pillbug', 'neutral', 1, 3, 'Pillbug',
    { hp: 120, dmg: 6, atkInt: 1.3, spd: 25, armor: 2, hiveDmg: 2 },
    { shape: 'pillbug', size: 1.1 }, 'Rolls up. Refuses to die.'));
  add(U('neu_snail', 'neutral', 2, 5, 'Garden Snail',
    { hp: 200, dmg: 8, atkInt: 1.5, spd: 15, armor: 1, hiveDmg: 6 },
    { shape: 'snail', size: 1.4 }, 'Siege at a snail’s pace. Literally.'));
  add(U('neu_slug', 'neutral', 1, 2, 'Slug',
    { hp: 45, dmg: 7, atkInt: 1.1, spd: 30, hiveDmg: 2, traits: { split: 'neu_sluglet' } },
    { shape: 'slug', size: 1.0 }, 'Splits into two when squashed.'));
  add(U('neu_sluglet', 'neutral', 1, 0, 'Sluglet',
    { hp: 15, dmg: 4, atkInt: 1.0, spd: 35, hiveDmg: 1 },
    { shape: 'slug', size: 0.6, sheetScale: 1.6 }, 'Half a slug, all the grudge.'));

  // Neutral garrison pool (sluglet is spawn-only, never dealt)
  const NEUTRAL_POOL = ['neu_pillbug', 'neu_slug', 'neu_orbweaver', 'neu_wolf', 'neu_snail', 'neu_centipede'];

  // ================= START DECKS =================
  const START_DECKS = {
    ants: ['ant_worker', 'ant_worker', 'ant_soldier', 'ant_soldier', 'ant_soldier',
           'ant_spitter', 'ant_spitter', 'ant_bullet', 'ant_carpenter', 'ant_pheromone'],
    wasps: ['wasp_drone', 'wasp_drone', 'wasp_paper', 'wasp_paper', 'wasp_jacket',
            'wasp_jacket', 'wasp_lancer', 'wasp_dauber', 'wasp_hornet', 'wasp_dive'],
    beetles: ['btl_ladybird', 'btl_ladybird', 'btl_weevil', 'btl_weevil', 'btl_tortoise',
              'btl_tortoise', 'btl_stag', 'btl_bombardier', 'btl_rhino', 'btl_shellwall'],
    mantids: ['man_nymph', 'man_nymph', 'man_nymph', 'man_stalker', 'man_stalker',
              'man_sickle', 'man_sickle', 'man_ghost', 'man_orchid', 'man_lunge'],
    termites: ['ter_worker', 'ter_worker', 'ter_snapjaw', 'ter_snapjaw', 'ter_nasute',
               'ter_nasute', 'ter_rampart', 'ter_sapper', 'ter_alate', 'ter_undermine'],
    moths: ['mot_dustling', 'mot_dustling', 'mot_dustling', 'mot_hawk', 'mot_hawk',
            'mot_sister', 'mot_dustcaster', 'mot_luna', 'mot_lullaby', 'mot_cocoon'],
  };

  // ================= UPGRADES (run-persistent) =================
  const UPGRADES = [
    { id: 'royal_jelly', name: 'Royal Jelly', price: 14, desc: 'All your units +15% HP.' },
    { id: 'mandibles', name: 'Serrated Mandibles', price: 14, desc: 'All your units +15% damage.' },
    { id: 'rally', name: 'Rally Pheromones', price: 12, desc: 'Start battles with +1 energy.' },
    { id: 'tunnels', name: 'Deep Tunnels', price: 16, desc: 'Battle hand holds 5 cards.' },
    { id: 'nectar', name: 'Nectar Cache', price: 10, desc: '+2 gold every turn.' },
    { id: 'silk', name: 'Silk Stitches', price: 12, desc: 'Your hive regenerates 1 HP / 5s.' },
    { id: 'venom', name: 'Venom Sacs', price: 18, desc: 'Your melee attacks poison (3 dmg over 3s).' },
    { id: 'chitin', name: 'Chitin Plating', price: 18, desc: 'All your units +1 armor.' },
    { id: 'drums', name: 'War Drums', price: 12, desc: 'All your units +15% move speed.' },
    { id: 'forage', name: 'Forager Caste', price: 10, desc: 'Battle gold loot +50%.' },
  ];

  // ================= TERRITORY BOONS =================
  const BOONS = {
    b_energy: { id: 'b_energy', name: 'Sugar Spring', desc: '+1 battle start energy', icon: '⚡' },
    b_hp: { id: 'b_hp', name: 'Rich Soil', desc: 'Units +5% HP', icon: '❤' },
    b_dmg: { id: 'b_dmg', name: 'Thorn Grove', desc: 'Units +5% damage', icon: '⚔' },
    b_card: { id: 'b_card', name: 'Waystation', desc: '+1 battle start card', icon: '✋' },
    b_hive: { id: 'b_hive', name: 'Deep Roots', desc: 'Hive +5 HP', icon: '⌂' },
    b_shop: { id: 'b_shop', name: 'Trade Trail', desc: 'Shop prices −20%', icon: '◉' },
  };

  // ================= MAP NAMES =================
  const TERR_NAMES = [
    'Foxglove Rise', 'The Rotten Log', 'Dew Gulch', 'Marigold Flats',
    'The Compost Barrows', 'Thistle Reach', 'Pondmirror Shore', 'The Sundial',
    'Old Boot Hollow', 'Sprinkler Line', 'The Trellis', 'Toadstool Ring',
    'Birdbath Bluffs', 'The Gravel Path', 'Hosepipe Bend', 'Nettle Court',
    'The Cold Frame', 'Rosethorn Keep', 'Windfall Orchard', 'Milkweed Meadow',
    'The Gnome’s Shadow', 'Clover Commons', 'Slate Steps', 'The Wheelbarrow',
    'Dandelion Downs', 'The Rain Barrel', 'Fern Gully', 'The Brick Pile',
  ];
  const CAPITAL_NAMES = {
    ants: 'The Ember Mound', wasps: 'The Paper Palace', beetles: 'The Iron Acorn',
    mantids: 'The Prayer Garden', termites: 'The Hollow Stump', moths: 'The Lantern Loft',
  };

  // tier available when player holds >= N territories
  const TIER_GATE = { 1: 0, 2: 4, 3: 7, 4: 10 };

  // ================= FACTION UNLOCKS =================
  // checked against (runStats, run) at capture/elimination/run-end events
  const UNLOCKS = [
    { faction: 'wasps', when: 'any', check: (st) => st.territoriesTaken >= 5 },
    { faction: 'beetles', when: 'win', check: () => true },
    { faction: 'mantids', when: 'win', check: (st, run) => run.faction === 'wasps' || run.faction === 'beetles' },
    { faction: 'termites', when: 'any', check: (st) => st.factionsEliminated >= 2 },
    { faction: 'moths', when: 'win', check: (st, run) => run.turn <= 20 },
  ];

  function cardsOfFaction(fid) {
    return Object.values(C).filter((c) => c.faction === fid && c.cost > 0);
  }

  function statLine(def) {
    if (def.type === 'tactic') return def.desc;
    const bits = [];
    bits.push('HP ' + def.hp);
    if (def.dmg > 0) bits.push('DMG ' + def.dmg);
    if (def.range > 0) bits.push('RANGED');
    if (def.fly) bits.push(def.traits.strafe ? 'FLIER·STRAFES' : 'FLIER');
    else if (def.air) bits.push('ANTI-AIR');
    if (def.armor > 0) bits.push('ARM ' + def.armor);
    if (def.hiveDmg > 2) bits.push('HIVE ' + def.hiveDmg);
    if (def.traits.swarm) bits.push('×' + def.traits.swarm);
    if (def.traits.splash) bits.push('SPLASH');
    if (def.traits.healer) bits.push('HEALER');
    if (def.traits.slow) bits.push('SLOWS');
    if (def.traits.dodge) bits.push('DODGE');
    if (def.traits.split) bits.push('SPLITS');
    return bits.join(' · ');
  }

  SL.DATA = {
    FACTIONS, FACTION_ORDER, PASSIVES, CARDS: C, START_DECKS, NEUTRAL_POOL,
    UPGRADES, BOONS, TERR_NAMES, CAPITAL_NAMES, TIER_GATE, UNLOCKS,
    cardsOfFaction, statLine,
  };
})();

// SWARMLORDS — conquest layer: run state, turn loop, rival kingdoms AI,
// auto-resolve, captures, eliminations, boons, income, map render + input.
window.SL = window.SL || {};

(function () {
  let run = null;
  let selectedId = -1;

  // ---------------- run lifecycle ----------------

  function eventRng() {
    run.rngCounter = (run.rngCounter || 0) + 1;
    return SL.makeRng((run.seed ^ (run.rngCounter * 2654435761)) >>> 0);
  }

  function startRun(factionId) {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const rng = SL.makeRng(seed);
    const gen = SL.mapgen.generate(rng, factionId);
    run = {
      seed, rngCounter: 1,
      faction: factionId,
      turn: 1, gold: 8,
      deck: SL.DATA.START_DECKS[factionId].slice(),
      upgrades: [],
      territories: gen.territories,
      rivals: gen.rivals,
      rivalState: {},
      capitalId: gen.playerCapital,
      stats: { battlesWon: 0, battlesLost: 0, territoriesTaken: 0, factionsEliminated: 0, goldEarned: 0 },
      shopStock: null,
      unlockedThisRun: [],
    };
    gen.rivals.forEach((f, i) => {
      run.rivalState[f] = {
        alive: true,
        power: 3 + i * 0.5,
        aggression: 0.5 + rng.range(0, 0.2),
        grudges: {},
      };
    });
    SL.shop.restock(run, eventRng());
    collectIncome(true);
    SL.save.saveRun(run);
    selectedId = -1;
    SL.ui.showScreen('map');
    SL.ui.updateTopbar();
    SL.ui.turnBanner('TURN 1 — ' + SL.DATA.FACTIONS[factionId].kingdom.toUpperCase());
    SL.audio.music('map');
  }

  function resumeRun(saved) {
    run = saved;
    selectedId = -1;
    SL.ui.showScreen('map');
    SL.ui.updateTopbar();
    SL.ui.turnBanner('TURN ' + run.turn);
    SL.audio.music('map');
  }

  function getRun() { return run; }
  function endRunCleanup() { run = null; SL.save.clearRun(); }

  // ---------------- helpers ----------------

  function terr(id) { return run.territories[id]; }
  function ownedBy(owner) { return run.territories.filter((t) => t.owner === owner); }
  function playerTerrs() { return ownedBy('player'); }

  function factionAlive(fid) {
    return fid === 'player' ? playerTerrs().length > 0 : run.rivalState[fid] && run.rivalState[fid].alive;
  }

  function attackableByPlayer(t) {
    if (t.owner === 'player') return false;
    return t.adj.some((n) => terr(n).owner === 'player');
  }

  function deckPower() {
    return run.deck.reduce((s, id) => s + (SL.DATA.CARDS[id] ? SL.DATA.CARDS[id].cost : 0), 0);
  }

  // Brood Loyalty status for the current deck (see data.js LOYALTY)
  function loyaltyInfo() {
    if (!run) return null;
    const own = run.deck.filter((id) => {
      const c = SL.DATA.CARDS[id];
      return c && c.faction === run.faction;
    }).length;
    const frac = run.deck.length ? own / run.deck.length : 0;
    const tier = frac >= SL.DATA.LOYALTY_DEVOTED ? 2
      : frac >= SL.DATA.LOYALTY_KINDRED ? 1 : 0;
    const power = SL.DATA.LOYALTY[run.faction];
    return {
      frac, tier, power,
      label: tier === 2 ? 'DEVOTED' : tier === 1 ? 'KINDRED' : 'MONGREL',
    };
  }

  function playerBoons() {
    const agg = { b_energy: 0, b_hp: 0, b_dmg: 0, b_card: 0, b_hive: 0, b_shop: 0 };
    for (const t of playerTerrs()) if (t.boon) agg[t.boon]++;
    return agg;
  }

  function playerMods(defTerr) {
    const boons = playerBoons();
    const m = {
      hpMult: 1 + boons.b_hp * 0.05,
      dmgMult: 1 + boons.b_dmg * 0.05,
      armorAdd: 0, spdMult: 1, flierSpdMult: 1,
      startEnergy: boons.b_energy,
      energyMax: 0,
      handSize: boons.b_card > 0 ? 1 : 0,
      hiveRegen: 0, venom: false, hiveDmgMult: 1, unhurtDmgMult: 1,
      lootMult: 1,
      hiveBonus: boons.b_hive * 5,
    };
    for (const u of run.upgrades) {
      if (u === 'royal_jelly') m.hpMult += 0.15;
      else if (u === 'mandibles') m.dmgMult += 0.15;
      else if (u === 'rally') m.startEnergy += 1;
      else if (u === 'tunnels') m.handSize = Math.max(m.handSize, 1);
      else if (u === 'silk') m.hiveRegen += 0.2;
      else if (u === 'venom') m.venom = true;
      else if (u === 'chitin') m.armorAdd += 1;
      else if (u === 'drums') m.spdMult *= 1.15;
      else if (u === 'forage') m.lootMult += 0.5;
    }
    if (defTerr && defTerr.capitalOf === 'player') m.hiveBonus += 10;
    return m;
  }

  function enemyBudgetFor(t) {
    let b = 10 + t.garrison * 3.5 + run.turn * 0.6;
    if (t.capitalOf) b += 10;
    return Math.round(Math.max(10, Math.min(50, b)));
  }

  function enemyFactionFor(t) {
    return t.owner === 'neutral' ? 'neutral' : t.owner;
  }

  // ---------------- player actions ----------------

  function playerAttack(tid) {
    const t = terr(tid);
    if (!attackableByPlayer(t)) return;
    const enemyFaction = enemyFactionFor(t);
    const budget = enemyBudgetFor(t);
    SL.ui.hideTerritoryPanel();
    selectedId = -1;
    launchBattle({
      stakes: 'ASSAULT ON ' + t.name.toUpperCase(),
      enemyFaction, budget,
      defending: false,
      defTerr: t,
      onDone: (won) => resolvePlayerAttack(t, won),
    });
  }

  function resolvePlayerAttack(t, won) {
    if (won) {
      run.stats.battlesWon++;
      const rng = eventRng();
      const loot = Math.round((3 + t.garrison * 2) * playerMods().lootMult);
      run.gold += loot; run.stats.goldEarned += loot;
      const prevOwner = t.owner;
      captureTerritory(t.id, 'player');
      run.stats.territoriesTaken++;
      SL.audio.sfx('coin');
      SL.ui.toast('Captured ' + t.name + '! +' + loot + ' gold');
      checkUnlocks('any');
      // recruitment draft from the defender's species
      const pool = draftPool(prevOwner === 'neutral' ? 'neutral' : prevOwner, rng, 3);
      SL.ui.draftModal(pool, {
        title: 'RECRUITMENT', sub: 'The defeated bend the knee. Enlist one:',
        skippable: true, skipLabel: 'SKIP (+2 gold)',
      }, (picked) => {
        if (picked) { run.deck.push(picked); SL.audio.sfx('draft'); }
        else run.gold += 2;
        afterPlayerAction();
      });
    } else {
      run.stats.battlesLost++;
      SL.ui.toast('The assault on ' + t.name + ' was repelled.', true);
      afterPlayerAction();
    }
  }

  function playerFortify(tid) {
    const t = terr(tid);
    if (t.owner !== 'player') return;
    if (t.garrison >= 6) { SL.ui.toast('Garrison is at maximum (6).', true); return; }
    const cost = fortifyCost(t);
    if (run.gold < cost) { SL.ui.toast('Not enough gold.', true); return; }
    run.gold -= cost;
    t.garrison++;
    SL.audio.sfx('stomp');
    SL.ui.toast(t.name + ' fortified — garrison ' + t.garrison);
    SL.ui.hideTerritoryPanel();
    selectedId = -1;
    afterPlayerAction();
  }

  function fortifyCost(t) { return 4 + t.garrison * 2; }

  function playerWait() {
    run.gold += 2;
    SL.ui.toast('Waited. +2 gold.');
    afterPlayerAction();
  }

  function afterPlayerAction() {
    SL.ui.updateTopbar();
    SL.ui.hideTerritoryPanel();
    selectedId = -1;
    if (checkRunOver()) return;
    rivalPhase();
  }

  // ---------------- draft ----------------

  function draftPool(faction, rng, n) {
    const D = SL.DATA;
    const tierCap = Math.min(4, 1 + Math.floor(run.turn / 7));
    let cards = (faction === 'neutral'
      ? D.NEUTRAL_POOL.map((id) => D.CARDS[id])
      : D.cardsOfFaction(faction));
    cards = cards.filter((c) => c.tier <= Math.max(2, tierCap));
    const picks = [];
    const shuffled = rng.shuffle(cards);
    for (const c of shuffled) {
      if (picks.length >= n) break;
      if (!picks.includes(c.id)) picks.push(c.id);
    }
    return picks;
  }

  // ---------------- rival phase ----------------

  function rivalPhase() {
    const order = eventRng().shuffle(run.rivals.filter((f) => factionAlive(f)));
    processRivals(order, 0);
  }

  function processRivals(order, i) {
    if (checkRunOver()) return;
    if (i >= order.length) { endOfTurn(); return; }
    const fid = order[i];
    if (!factionAlive(fid)) { processRivals(order, i + 1); return; }
    const next = () => processRivals(order, i + 1);

    const rng = eventRng();
    const rs = run.rivalState[fid];
    const mine = ownedBy(fid);
    // candidate targets: adjacent to any owned territory, not owned by self
    const targets = [];
    for (const t of mine) {
      for (const n of t.adj) {
        const tt = terr(n);
        if (tt.owner !== fid && !targets.includes(tt)) targets.push(tt);
      }
    }
    if (!targets.length) { next(); return; }

    const attackChance = Math.min(0.85, rs.aggression + mine.length * 0.03 + run.turn * 0.006);
    if (!rng.chance(attackChance)) {
      // fortify a border territory (garrisons cap out — no eternal turtling)
      const border = mine.filter((t) => t.garrison < 4 && t.adj.some((n) => terr(n).owner !== fid));
      if (border.length) rng.pick(border).garrison++;
      rs.power += 0.35;
      next();
      return;
    }

    // score targets: weak + boons + grudges (capped) + blood in the water
    let best = null, bestScore = -Infinity;
    for (const t of targets) {
      let s = -t.garrison * 1.2 + rng.range(0, 2.5);
      if (t.boon) s += 1.2;
      if (t.yield >= 3) s += 0.8;
      if (t.capitalOf) s -= 1.0; // capitals are scary
      const g = t.owner === 'player' ? (rs.grudges.player || 0) : (rs.grudges[t.owner] || 0);
      s += Math.min(3, g) * 0.8;
      if (t.owner === 'player') s += 0.4; // the player is everyone's problem
      if (t.owner === 'neutral' && mine.length < 5) s += 0.6; // safe expansion first
      // finish off the weak — this is what ends wars
      // (the player gets a short grace period before the sharks circle)
      const ownerHolds = t.owner === 'neutral' ? 99 : ownedBy(t.owner).length;
      if (ownerHolds <= 2 && (t.owner !== 'player' || run.turn > 5)) s += 1.8;
      if (s > bestScore) { bestScore = s; best = t; }
    }
    if (!best) { next(); return; }

    if (best.owner === 'player') {
      rivalAttacksPlayer(fid, best, next);
    } else {
      resolveRivalVsRival(fid, best, rng);
      next();
    }
  }

  function rivalAttacksPlayer(fid, t, next) {
    const rs = run.rivalState[fid];
    const fac = SL.DATA.FACTIONS[fid];
    const budget = Math.round(Math.max(10, Math.min(50, 8 + rs.power * 2.2 + run.turn * 0.6)));
    const defBonus = t.capitalOf === 'player' ? 2 : 0;
    const myScore = t.garrison * 2 + deckPower() / 10 + defBonus;
    const theirScore = rs.power + run.turn * 0.15;
    const oddsHint = myScore > theirScore + 2 ? 'Favorable' : myScore > theirScore - 2 ? 'Even' : 'Grim';

    SL.audio.sfx('alarm');
    SL.ui.defenseModal({
      title: fac.kingdom.toUpperCase() + ' ATTACKS!',
      sub: 'They march on ' + t.name + ' (garrison ' + t.garrison + '). Auto-resolve odds: ' + oddsHint + '.',
    }, (fight) => {
      if (fight) {
        launchBattle({
          stakes: 'HOLD ' + t.name.toUpperCase() + '!',
          enemyFaction: fid, budget,
          defending: true,
          defTerr: t,
          onDone: (won) => {
            const rng = eventRng();
            if (won) {
              run.stats.battlesWon++;
              const loot = Math.round(3 * playerMods().lootMult);
              run.gold += loot; run.stats.goldEarned += loot;
              rs.grudges.player = (rs.grudges.player || 0) + 1;
              rs.power = Math.max(2, rs.power - 0.6);
              SL.ui.toast('Held ' + t.name + '! +' + loot + ' gold');
              if (rng.chance(0.5)) {
                const pool = draftPool(fid, rng, 2);
                SL.ui.draftModal(pool, {
                  title: 'PRISONERS', sub: 'Captured attackers offer service:',
                  skippable: true, skipLabel: 'REFUSE',
                }, (picked) => {
                  if (picked) { run.deck.push(picked); SL.audio.sfx('draft'); }
                  next();
                });
                return;
              }
            } else {
              run.stats.battlesLost++;
              captureTerritory(t.id, fid);
              rs.power += 0.5;
              SL.ui.toast(t.name + ' has fallen to ' + fac.kingdom + '.', true);
            }
            next();
          },
        });
      } else {
        // auto-resolve
        const rng = eventRng();
        const my = myScore + rng.range(0, 4);
        const theirs = theirScore + rng.range(0, 4) + 1; // auto is a bit worse than fighting well
        if (my >= theirs) {
          t.garrison = Math.max(1, t.garrison - 1);
          rs.power = Math.max(2, rs.power - 0.3);
          rs.grudges.player = (rs.grudges.player || 0) + 1;
          SL.ui.toast('Garrison held ' + t.name + ' (auto).');
        } else {
          captureTerritory(t.id, fid);
          rs.power += 0.5;
          SL.ui.toast(t.name + ' has fallen to ' + fac.kingdom + ' (auto).', true);
        }
        SL.ui.updateTopbar();
        next();
      }
    });
  }

  function resolveRivalVsRival(fid, t, rng) {
    const rs = run.rivalState[fid];
    const attScore = rs.power + ownedBy(fid).length * 0.3 + rng.range(0, 3);
    let defScore = t.garrison * 1.5 + rng.range(0, 3);
    if (t.owner !== 'neutral') {
      const ds = run.rivalState[t.owner];
      defScore += ds ? ds.power * 0.7 : 0;
      if (t.capitalOf) defScore += 2;
    } else {
      defScore += 1.2;
    }
    const attFac = SL.DATA.FACTIONS[fid];
    if (attScore >= defScore) {
      const prevOwner = t.owner;
      captureTerritory(t.id, fid);
      rs.power = Math.min(25, rs.power + 0.4);
      if (prevOwner !== 'neutral') {
        const ds = run.rivalState[prevOwner];
        if (ds) {
          ds.grudges[fid] = (ds.grudges[fid] || 0) + 1;
          ds.power = Math.max(2, ds.power - 0.4); // losing ground weakens you
        }
        SL.ui.toast(attFac.kingdom + ' seized ' + t.name + ' from ' + SL.DATA.FACTIONS[prevOwner].kingdom + '.');
      } else {
        SL.ui.toast(attFac.kingdom + ' claimed ' + t.name + '.');
      }
    } else {
      t.garrison = Math.max(1, t.garrison - 1);
      rs.power = Math.max(2, rs.power - 0.2);
    }
  }

  // ---------------- captures & eliminations ----------------

  function captureTerritory(tid, newOwner) {
    const t = terr(tid);
    const prevOwner = t.owner;
    t.owner = newOwner;
    if (newOwner !== 'player') t.garrison = Math.max(1, t.garrison);

    // player capital fell?
    if (prevOwner === 'player' && tid === run.capitalId) {
      const remaining = playerTerrs();
      if (remaining.length) {
        let cheapest = remaining[0];
        for (const r of remaining) if (r.yield < cheapest.yield) cheapest = r;
        run.capitalId = cheapest.id;
        cheapest.capitalOf = 'player';
        t.capitalOf = null;
        SL.shop.halveStock(run);
        SL.ui.toast('Capital fallen! Court flees to ' + cheapest.name + '.', true);
      }
    }
    if (prevOwner === 'player' && terr(tid).capitalOf === 'player' && tid !== run.capitalId) {
      terr(tid).capitalOf = null;
    }

    // eliminations
    if (prevOwner !== 'neutral' && prevOwner !== newOwner && prevOwner !== 'player') {
      if (ownedBy(prevOwner).length === 0 && run.rivalState[prevOwner] && run.rivalState[prevOwner].alive) {
        run.rivalState[prevOwner].alive = false;
        const fac = SL.DATA.FACTIONS[prevOwner];
        SL.ui.toast('☠ ' + fac.kingdom + ' has fallen. The garden forgets them.', true);
        SL.audio.sfx('dirge');
        if (newOwner === 'player') {
          run.stats.factionsEliminated++;
          checkUnlocks('any');
        }
      }
    }
    SL.ui.updateTopbar();
  }

  function checkRunOver() {
    if (!run) return true;
    if (playerTerrs().length === 0) {
      finishRun(false);
      return true;
    }
    const anyRival = run.rivals.some((f) => factionAlive(f));
    if (!anyRival) {
      finishRun(true);
      return true;
    }
    return false;
  }

  function finishRun(won) {
    if (won) checkUnlocks('win');
    const summary = {
      won,
      faction: run.faction,
      turns: run.turn,
      stats: run.stats,
      unlockedThisRun: run.unlockedThisRun.slice(),
    };
    const meta = SL.game.meta;
    meta.runsPlayed++;
    if (won) {
      meta.wins[run.faction] = (meta.wins[run.faction] || 0) + 1;
      if (!meta.bestTurns || run.turn < meta.bestTurns) meta.bestTurns = run.turn;
    }
    SL.save.saveMeta(meta);
    endRunCleanup();
    SL.ui.resultsScreen(summary);
  }

  // ---------------- turn end / income ----------------

  function endOfTurn() {
    run.turn++;
    for (const f of run.rivals) {
      if (factionAlive(f)) run.rivalState[f].power = Math.min(25, run.rivalState[f].power + 0.25);
    }
    collectIncome(false);
    SL.shop.restock(run, eventRng());
    SL.save.saveRun(run);
    SL.ui.updateTopbar();
    SL.ui.turnBanner('TURN ' + run.turn);
    SL.audio.music('map');
  }

  function collectIncome(first) {
    let gold = 0;
    for (const t of playerTerrs()) gold += t.yield;
    if (run.upgrades.includes('nectar')) gold += 2;
    run.gold += gold;
    run.stats.goldEarned += gold;
    if (!first && gold > 0) {
      SL.audio.sfx('coin');
      SL.ui.toast('+' + gold + ' gold from your territories');
    }
  }

  // ---------------- unlocks ----------------

  function checkUnlocks(when) {
    const meta = SL.game.meta;
    for (const u of SL.DATA.UNLOCKS) {
      if (meta.unlocked.includes(u.faction)) continue;
      if (u.when !== when && u.when !== 'any') continue;
      if (u.when === 'win' && when !== 'win') continue;
      let ok = false;
      try { ok = u.check(run.stats, run); } catch (e) {}
      if (ok) {
        meta.unlocked.push(u.faction);
        run.unlockedThisRun.push(u.faction);
        SL.save.saveMeta(meta);
        const fac = SL.DATA.FACTIONS[u.faction];
        SL.ui.titleCard('UNLOCKED!', fac.kingdom.toUpperCase());
        SL.audio.sfx('fanfare');
      }
    }
  }

  // ---------------- battle launcher ----------------

  function launchBattle(opts) {
    const t = opts.defTerr;
    const mods = playerMods(opts.defending ? t : null);
    let playerHive = 30 + mods.hiveBonus;
    let enemyHive = 30;
    if (!opts.defending && t && t.capitalOf) enemyHive += 10;

    SL.ui.showScreen('battle');
    SL.audio.music('battle');
    SL.ui.titleCard(opts.defending ? 'DEFEND!' : 'TO BATTLE!', opts.stakes);

    SL.battle.start({
      playerFaction: run.faction,
      playerDeck: run.deck.slice(),
      playerMods: mods,
      enemyFaction: opts.enemyFaction,
      enemyBudget: opts.budget,
      defending: opts.defending,
      playerHiveMax: playerHive,
      enemyHiveMax: enemyHive,
      seed: (run.seed ^ (run.rngCounter * 7919) ^ (run.turn * 104729)) >>> 0,
      stakes: opts.stakes,
      onEnd: (result) => {
        SL.ui.showScreen('map');
        SL.audio.music('map');
        SL.ui.titleCard(result.won ? 'VICTORY!' : 'SQUASHED!',
          result.won ? '' : 'the survivors limp home');
        setTimeout(() => {
          opts.onDone(result.won);
          SL.ui.updateTopbar();
          SL.save.saveRun(run);
        }, 900);
      },
    });
  }

  // ---------------- map rendering (landscape, pannable world) ----------------

  const MAP_H = 400;                   // logical viewport height
  const WORLD_W = 1260, WORLD_H = 880; // the garden is bigger than the screen
  const PAD = 78;
  const cam = { x: 0, y: 0 };

  function mapLayout(canvasW, canvasH) {
    const scale = canvasH / MAP_H;
    const W = canvasW / scale;
    return {
      scale, W,
      // chrome floats over the map, so the field can breathe
      top: Math.min(96, 34 / scale + 52), // room for the legend strip
      bot: MAP_H - Math.min(92, 52 / scale + 26),
    };
  }

  // grid is generated 4 cols x 5 rows (portrait); transpose for landscape
  function nodePos(t) {
    return {
      x: PAD + t.y * (WORLD_W - PAD * 2),
      y: PAD + t.x * (WORLD_H - PAD * 2),
    };
  }

  function clampCam(L) {
    // a single NaN here would poison ctx.translate and silently blank the
    // whole map, and Math.max(0, NaN) is NaN — so scrub before clamping
    if (!isFinite(cam.x)) cam.x = 0;
    if (!isFinite(cam.y)) cam.y = 0;
    if (!isFinite(L.W) || !isFinite(L.top) || !isFinite(L.bot)) return;
    // clamp against the FULL logical canvas, not just the field band —
    // the world is painted edge to edge, so this stops empty gaps at the ends
    cam.x = WORLD_W <= L.W ? (WORLD_W - L.W) / 2
      : Math.max(0, Math.min(WORLD_W - L.W, cam.x));
    cam.y = WORLD_H <= MAP_H ? (WORLD_H - MAP_H) / 2
      : Math.max(0, Math.min(WORLD_H - MAP_H, cam.y));
  }

  function panBy(dxCss, dyCss, canvasW, canvasH) {
    const L = mapLayout(canvasW, canvasH);
    cam.x -= dxCss / L.scale;
    cam.y -= dyCss / L.scale;
    clampCam(L);
  }

  function centerOn(tid, canvasW, canvasH) {
    if (!run || !(canvasW > 0) || !(canvasH > 0)) return;
    const L = mapLayout(canvasW, canvasH);
    const p = nodePos(terr(tid));
    cam.x = p.x - L.W / 2;
    cam.y = p.y - (L.top + (L.bot - L.top) / 2);
    clampCam(L);
  }

  function centerOnCapital(canvasW, canvasH) {
    if (!run) return;
    const cap = run.territories[run.capitalId];
    const own = playerTerrs();
    const id = (cap && cap.owner === 'player') ? run.capitalId : (own[0] ? own[0].id : 0);
    centerOn(id, canvasW, canvasH);
  }

  function ownerColor(t) {
    if (t.owner === 'player') return SL.DATA.FACTIONS[run.faction].color;
    if (t.owner === 'neutral') return '#7d8471';
    return SL.DATA.FACTIONS[t.owner].color;
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // the faction whose ground-art and emblem a territory wears
  function ownerFaction(t) {
    if (t.owner === 'player') return run.faction;
    if (t.owner === 'neutral') return 'neutral';
    return t.owner;
  }

  // one representative bug per kingdom, for legend chips and node emblems
  const LEGEND_BUG = {
    ants: 'ant_soldier', wasps: 'wasp_drone', beetles: 'btl_ladybird',
    mantids: 'man_stalker', termites: 'ter_snapjaw', moths: 'mot_hawk',
    neutral: 'neu_pillbug',
  };

  // A kingdom's mark: its own emblem when delivered, otherwise a
  // representative bug stands in.
  function factionMark(fid) {
    const em = SL.sprites.sheet('emblem_' + fid);
    if (em) return { img: em, sheet: false };
    const bug = LEGEND_BUG[fid];
    const b = bug ? SL.sprites.sheet(bug + '_sheet') : null;
    return b ? { img: b, sheet: true } : null;
  }

  function drawMark(ctx, fid, x, y, size) {
    const m = factionMark(fid);
    if (!m) return false;
    if (m.sheet) ctx.drawImage(m.img, 0, 0, 256, 256, x, y, size, size);
    else ctx.drawImage(m.img, x, y, size, size);
    return true;
  }

  // each kingdom marks its ground differently, so ownership reads at a glance
  const NODE_STYLE = {
    ants:     { ring: 'solid',  dash: null,    lw: 5 },
    wasps:    { ring: 'double', dash: null,    lw: 4 },
    beetles:  { ring: 'solid',  dash: null,    lw: 7 },
    mantids:  { ring: 'dash',   dash: [10, 6], lw: 5 },
    termites: { ring: 'dash',   dash: [3, 4],  lw: 5 },
    moths:    { ring: 'double', dash: [14, 7], lw: 4 },
    neutral:  { ring: 'dash',   dash: [2, 7],  lw: 3 },
  };

  // Single source of truth for a territory's drawn size. drawNode and
  // tapMap both read this, so the hit target always matches the art.
  function nodeRadii(t) {
    const fid = ownerFaction(t);
    const style = NODE_STYLE[fid] || NODE_STYLE.neutral;
    const r = t.capitalOf ? 34 : 27;
    const townImg = SL.sprites.sheet((t.capitalOf ? 'map_node_capital_' : 'map_node_') + fid);
    const artR = townImg ? r * 1.62 : r * 1.25;
    const ringR = townImg ? artR + style.lw / 2 + 3 : r;
    return { r, artR, ringR, style, townImg };
  }

  function renderMap(ctx, canvasW, canvasH, time) {
    if (!run) return;
    const L = mapLayout(canvasW, canvasH);
    clampCam(L);
    ctx.save();
    ctx.scale(L.scale, L.scale);

    // --- world layer (panned) ---
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    const bg = SL.sprites.sheet('map_bg');
    if (bg) {
      // cover-fit: scale uniformly to fill the world and centre the overflow,
      // rather than squashing the painting to the world's aspect
      const k = Math.max(WORLD_W / bg.width, WORLD_H / bg.height);
      const dw = bg.width * k, dh = bg.height * k;
      ctx.drawImage(bg, (WORLD_W - dw) / 2, (WORLD_H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      g.addColorStop(0, '#e7d9b4');
      g.addColorStop(1, '#cdbd92');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // territory halos: a soft wash of the owner's colour over the ground,
    // kept light so the painted garden still reads underneath
    for (const t of run.territories) {
      const p = nodePos(t);
      const rad = (t.capitalOf ? 34 : 27) * 2.9;
      const g2 = ctx.createRadialGradient(p.x, p.y, rad * 0.15, p.x, p.y, rad);
      g2.addColorStop(0, hexA(ownerColor(t), t.owner === 'neutral' ? 0.13 : 0.3));
      g2.addColorStop(1, hexA(ownerColor(t), 0));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    }

    // roads: tinted from one owner's colour to the other's, so borders and
    // supply lines are legible without hiding the background
    ctx.lineCap = 'round';
    const drawn = new Set();
    for (const t of run.territories) {
      const p1 = nodePos(t);
      for (const n of t.adj) {
        const key = Math.min(t.id, n) + '-' + Math.max(t.id, n);
        if (drawn.has(key)) continue;
        drawn.add(key);
        const o = terr(n);
        const p2 = nodePos(o);
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, hexA(ownerColor(t), 0.62));
        grad.addColorStop(1, hexA(ownerColor(o), 0.62));
        // colour band underneath
        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        // a painted trail is tiled along the connection; otherwise inked
        // dashes keep the hand-drawn character
        const road = SL.sprites.sheet('map_road');
        if (road) {
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          const th = 13;
          ctx.save();
          ctx.translate(p1.x, p1.y);
          ctx.rotate(Math.atan2(dy, dx));
          const step = th * (road.width / road.height);
          for (let d0 = 0; d0 < len; d0 += step) {
            ctx.drawImage(road, d0, -th / 2, Math.min(step, len - d0), th);
          }
          ctx.restore();
        } else {
          ctx.strokeStyle = 'rgba(43,29,22,0.5)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([2, 9]);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
    // roads wanted round caps; rings must not inherit them or every dashed
    // ring paints an extra half-width at each end and closes its own gaps
    ctx.lineCap = 'butt';

    for (const t of run.territories) drawNode(ctx, t, time);

    ctx.restore(); // end world layer

    drawLegend(ctx, L);
    ctx.restore();
  }

  function drawNode(ctx, t, time) {
    const p = nodePos(t);
    const col = ownerColor(t);
    const fid = ownerFaction(t);
    const rad = nodeRadii(t);
    const style = rad.style, r = rad.r, artR = rad.artR, townImg = rad.townImg;

    // per-faction settlement art wins; otherwise generic ground, else a blob
    const img = townImg
      || SL.sprites.sheet(t.capitalOf ? 'map_node_capital' : 'map_node')
      || SL.sprites.sheet('map_node');

    // attackable pulse ring
    if (attackableByPlayer(t)) {
      const pulse = 3 + Math.sin(time * 4 + t.id) * 2;
      ctx.strokeStyle = 'rgba(224,165,30,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, artR + pulse + 3, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 3;
    if (img) {
      const d = artR * 2;
      ctx.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let a = 0; a <= 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const rr = r * (1 + 0.09 * Math.sin(ang * 3 + t.id * 2.1));
        const px = p.x + Math.cos(ang) * rr;
        const py = p.y + Math.sin(ang) * rr;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // owner ring, styled per kingdom — outside the settlement, never across it
    const ringR = rad.ringR;
    const ringArt = SL.sprites.sheet('node_ring_' + fid);
    if (ringArt) {
      const d = (ringR + style.lw) * 2.25;
      ctx.drawImage(ringArt, p.x - d / 2, p.y - d / 2, d, d);
    } else {
    ctx.strokeStyle = col;
    ctx.lineWidth = style.lw;
    ctx.setLineDash(style.dash || []);
    ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2); ctx.stroke();
    if (style.ring === 'double') {
      ctx.lineWidth = Math.max(2, style.lw - 2);
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR - style.lw - 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(27,18,12,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, ringR + style.lw / 2 + 1, 0, Math.PI * 2); ctx.stroke();
    }

    // A heraldic seal on every territory: the settlement shows the culture,
    // the seal shows the crown it answers to, which is what you scan for.
    const emblem = SL.sprites.sheet('emblem_' + fid);
    if (emblem) {
      const sr = t.capitalOf ? 15 : 13;
      const sx = p.x - ringR * 0.70, sy = p.y - ringR * 0.70;
      // The seal wears its kingdom's colour. It is laid over cream rather
      // than used neat: the emblems are themselves faction-coloured, so a
      // fully saturated disc swallowed the mark it was meant to show.
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,235,214,0.96)'; ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = col; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr + 1.5, 0, Math.PI * 2); ctx.stroke();
      ctx.drawImage(emblem, sx - sr + 1, sy - sr + 1, (sr - 1) * 2, (sr - 1) * 2);
    } else if (!townImg) {
      const bx = p.x - r * 0.72, by = p.y - r * 0.72;
      ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,227,200,0.94)'; ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = col; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (!drawMark(ctx, fid, bx - 12, by - 12, 24)) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
      }
    }

    // capital crown — toppled once the kingdom that raised it is gone
    if (t.capitalOf) {
      const fallen = !factionAlive(t.capitalOf);
      const crown = (fallen && SL.sprites.sheet('map_crown_fallen'))
        || SL.sprites.sheet('map_crown');
      if (crown) {
        const cd = r * 1.25;
        ctx.drawImage(crown, p.x - cd / 2, p.y - ringR - cd + 6, cd, cd);
      } else {
        ctx.fillStyle = '#e0a51e';
        ctx.strokeStyle = '#1b120c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x - 9, p.y - r - 2);
        ctx.lineTo(p.x - 8, p.y - r - 11); ctx.lineTo(p.x - 4, p.y - r - 5);
        ctx.lineTo(p.x, p.y - r - 12); ctx.lineTo(p.x + 4, p.y - r - 5);
        ctx.lineTo(p.x + 8, p.y - r - 11); ctx.lineTo(p.x + 9, p.y - r - 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // garrison pips
    ctx.fillStyle = '#1b120c';
    const gp = Math.min(6, t.garrison);
    for (let i = 0; i < gp; i++) {
      ctx.beginPath();
      ctx.arc(p.x - (gp - 1) * 3.5 + i * 7, p.y + ringR + 10, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // yield — a settlement plaza is busy, so give the number a plate to sit on
    // The coin and the number are measured and centred as one group. A fixed
    // left offset put the coin at -15 and the number at +2 whatever the
    // number was, so every two-digit settlement sat off its own plate.
    const coin = SL.sprites.sheet('hud_gold') || SL.sprites.sheet('ui_coin');
    const uiIcons = coin ? null : SL.sprites.sheet('ui_icons');
    const yLabel = String(t.yield);
    ctx.font = '900 14px "Lilita One", "Trebuchet MS", sans-serif';
    const IC = (coin || uiIcons) ? 16 : 0;
    const GAP = IC ? 3 : 0;
    const gw = IC + GAP + ctx.measureText(yLabel).width;

    // a settlement plaza is busy, so the number gets a plate, sized to what
    // it actually has to hold
    if (townImg) {
      const pw = gw + 16, phh = 22;
      ctx.fillStyle = 'rgba(27,18,12,0.66)';
      ctx.strokeStyle = 'rgba(240,227,200,0.55)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, p.x - pw / 2, p.y - phh / 2, pw, phh, phh / 2);
      ctx.fill(); ctx.stroke();
    }

    const gx = p.x - gw / 2;
    if (coin) ctx.drawImage(coin, gx, p.y - IC / 2, IC, IC);
    else if (uiIcons) ctx.drawImage(uiIcons, 0, 0, 256, 256, gx, p.y - IC / 2, IC, IC);
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 3.5;
    ctx.strokeText(yLabel, gx + IC + GAP, p.y + 5);
    ctx.fillStyle = '#f7ecd2';
    ctx.fillText(yLabel, gx + IC + GAP, p.y + 5);
    ctx.textAlign = 'center';

    // boon marker: delivered glyph strip if present, else the text icon
    if (t.boon) {
      const bx2 = p.x + ringR * 0.72, by2 = p.y - ringR * 0.72;
      const boons = SL.sprites.sheet('ui_boons');
      if (boons) {
        const order = ['b_energy', 'b_hp', 'b_dmg', 'b_card', 'b_hive', 'b_shop'];
        const idx = Math.max(0, order.indexOf(t.boon));
        ctx.fillStyle = 'rgba(240,227,200,0.94)';
        ctx.strokeStyle = '#1b120c';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx2, by2, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.drawImage(boons, idx * 256, 0, 256, 256, bx2 - 10, by2 - 10, 20, 20);
      } else {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#f0e3c8';
        ctx.strokeStyle = '#1b120c';
        ctx.lineWidth = 3;
        ctx.strokeText(SL.DATA.BOONS[t.boon].icon, bx2, by2 + 4);
        ctx.fillText(SL.DATA.BOONS[t.boon].icon, bx2, by2 + 4);
      }
    }

    // selection ring
    if (t.id === selectedId) {
      ctx.strokeStyle = '#e0a51e';
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawLegend(ctx, L) {
    // the map pans under a fixed HUD, so seat the legend on a soft band
    const band = ctx.createLinearGradient(0, L.top - 62, 0, L.top - 4);
    band.addColorStop(0, 'rgba(30,20,14,0.42)');
    band.addColorStop(1, 'rgba(30,20,14,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, L.top - 62, L.W, 58);

    const chips = [['player', run.faction]].concat(run.rivals.map((f) => [f, f]));
    const ICON = 24, GAP = 10, H = 32;
    ctx.font = '900 10px "Lilita One", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';

    const plateFor = (fid) => SL.sprites.sheet('nameplate_' + fid)
      || SL.sprites.sheet('ui_nameplate');

    // A 3-sliced plate keeps its ornament in the outer quarter of the source.
    // Content has to start inside that cap or it sits on top of the artwork.
    const ph = H + 10;
    // Several plates carry ornament well past a quarter of their width (the
    // ant scrollwork, the termite skulls), so reserve 30% as fixed cap and
    // leave a real gap after it rather than letting the seal ride the art.
    const CAP_F = 0.30, SEAL_GAP = 9;
    const capOf = (img) => (img ? ph * (img.width * CAP_F) / img.height : 0);
    const padOf = (cap) => (cap ? 5 : 7);

    const meta = chips.map(function (c) {
      const owner = c[0], fid = c[1];
      const alive = factionAlive(owner === 'player' ? 'player' : fid);
      const label = (owner === 'player' ? 'YOU' : SL.DATA.FACTIONS[fid].name)
        + (alive ? '' : ' \u2620');
      const img = plateFor(fid);
      const cap = capOf(img);
      const pad = padOf(cap);
      // hand-lettered kingdom name when delivered; system text is a
      // placeholder that reads badly against a painted banner
      const word = SL.sprites.sheet('wordmark_' + fid);
      // scale the lettering to the plate it sits on, then cap the width so a
      // long name (TERMITES) cannot stretch its banner past its neighbours
      let wordH = Math.round(ph * 0.40);
      let wordW = word ? wordH * (word.width / word.height) : 0;
      const WORD_MAX = 96;
      if (wordW > WORD_MAX) { wordH = Math.round(wordH * WORD_MAX / wordW); wordW = WORD_MAX; }
      const textW = word ? wordW : ctx.measureText(label).width;
      // A hand-lettered plate says which kingdom it is; the seal beside it is
      // redundant and it was the seal crowding the lettering into the end
      // caps. Lettered plates carry the wordmark alone, centred.
      const w = word
        ? cap * 2 + pad * 2 + wordW
        : cap * 2 + pad * 2 + ICON + SEAL_GAP + textW;
      return { owner, fid, alive, label, img, cap, pad, w, word, wordW, wordH };
    });

    let total = meta.reduce((n, m) => n + m.w, 0) + GAP * (meta.length - 1);
    // On a narrow screen four full plates fill the row and the labels press
    // into their end caps. Drop the wordmarks and keep the seals, which are
    // the part that actually identifies a kingdom.
    const budget = L.W * 0.86;
    if (total > budget) {
      meta.forEach(function (m) {
        m.compact = true;
        m.word = null;
        m.w = m.cap * 2 + m.pad * 2 + ICON;
      });
      total = meta.reduce((n, m) => n + m.w, 0) + GAP * (meta.length - 1);
    }
    let lx = Math.max(6, (L.W - total) / 2);
    const cy = L.top - 34;

    meta.forEach(function (m) {
      const fac = SL.DATA.FACTIONS[m.fid];
      ctx.globalAlpha = m.alive ? 1 : 0.45;

      if (m.img) {
        // fixed decorative caps, stretched plain middle
        const sw = m.img.width, sh = m.img.height;
        const capS = sw * CAP_F;
        const py = cy - ph / 2;
        ctx.drawImage(m.img, 0, 0, capS, sh, lx, py, m.cap, ph);
        ctx.drawImage(m.img, capS, 0, sw - capS * 2, sh,
          lx + m.cap, py, Math.max(0, m.w - m.cap * 2), ph);
        ctx.drawImage(m.img, sw - capS, 0, capS, sh, lx + m.w - m.cap, py, m.cap, ph);
      } else {
        ctx.fillStyle = 'rgba(240,227,200,0.92)';
        ctx.strokeStyle = '#1b120c';
        ctx.lineWidth = 2;
        roundRect(ctx, lx, cy - H / 2, m.w, H, 9);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = fac.color;
        roundRect(ctx, lx, cy - H / 2, 5, H, 3); ctx.fill();
      }

      const ix = lx + m.cap + m.pad;
      if (!m.compact && m.word) {
        ctx.drawImage(m.word, lx + (m.w - m.wordW) / 2, cy - m.wordH / 2,
          m.wordW, m.wordH);
        if (!m.alive) {
          ctx.font = '900 13px "Lilita One", "Trebuchet MS", sans-serif';
          ctx.fillStyle = '#d84b2a';
          ctx.fillText('☠', lx + m.cap + 1, cy + 5);
          ctx.font = '900 10px "Lilita One", "Trebuchet MS", sans-serif';
        }
      } else {
      // the plates are faction-coloured and so are the emblems, so the mark
      // sits on a cream seal or it disappears into its own banner
      ctx.beginPath(); ctx.arc(ix + ICON / 2, cy, ICON / 2 + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,235,214,0.95)'; ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = fac.color; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (!drawMark(ctx, m.fid, ix + 1, cy - ICON / 2 + 1, ICON - 2)) {
        ctx.fillStyle = fac.color;
        ctx.beginPath(); ctx.arc(ix + ICON / 2, cy, 7, 0, Math.PI * 2); ctx.fill();
      }

      // the painted plates are saturated and dark, so the label is cream
      // with an ink stroke — legible on plate art or on the drawn fallback
      if (!m.compact) {
        const tx = ix + ICON + SEAL_GAP;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(20,13,9,0.9)';
        ctx.lineWidth = 3;
        ctx.strokeText(m.label, tx, cy + 4);
        ctx.fillStyle = '#f7ecd2';
        ctx.fillText(m.label, tx, cy + 4);
      } else if (!m.alive) {
        ctx.fillStyle = '#d84b2a';
        ctx.fillText('☠', ix + ICON + 2, cy + 4);
      }
      }

      if (!m.alive) {
        ctx.strokeStyle = '#d84b2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx + m.cap, cy); ctx.lineTo(lx + m.w - m.cap, cy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      lx += m.w + GAP;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function tapMap(cssX, cssY, canvasW, canvasH) {
    if (!run) return;
    const L = mapLayout(canvasW, canvasH);
    const lx = cssX / L.scale + cam.x;
    const ly = cssY / L.scale + cam.y;
    let hit = null, hitD = Infinity;
    for (const t of run.territories) {
      const p = nodePos(t);
      const d = Math.hypot(lx - p.x, ly - p.y);
      // tap anywhere on the settlement, its ring, or a little beyond
      const reach = Math.max(nodeRadii(t).ringR + 10, 34);
      if (d < reach && d < hitD) { hit = t; hitD = d; }
    }
    if (hit) {
      selectedId = hit.id;
      SL.audio.sfx('click');
      SL.ui.showTerritoryPanel(hit);
    } else {
      selectedId = -1;
      SL.ui.hideTerritoryPanel();
    }
  }

  SL.conquest = {
    startRun, resumeRun, getRun, endRunCleanup,
    playerAttack, playerFortify, playerWait, fortifyCost,
    attackableByPlayer, playerTerrs, deckPower, playerBoons, factionAlive,
    loyaltyInfo,
    renderMap, tapMap, panBy, centerOn, centerOnCapital,
    terr: (id) => terr(id),
    abandonRun: () => { endRunCleanup(); SL.ui.showScreen('title'); },
  };
})();

// SWARMLORDS — lane battle simulation + battle AI + renderer.
// LANDSCAPE field, 4 horizontal lanes. Player hive LEFT, enemy hive RIGHT.
// Units march toward the far hive, fight what they meet, chomp the hive.
// Sprites are drawn in profile facing right: player units render natively,
// enemy units mirror horizontally.
window.SL = window.SL || {};

(function () {
  const LANES = 3;
  const LOGICAL_H = 400;          // logical height; width derives from aspect
  const MELEE_RANGE = 30;
  const MIN_GAP = 30;
  const SUDDEN_DEATH_AT = 300;    // seconds

  const B = {
    active: false,
    cfg: null,
    rng: null,
    t: 0,
    over: false,
    timeScale: 1,
    endTimer: 0,
    units: [],
    projectiles: [],
    particles: [],
    floaters: [],
    laneEffects: [], // {side, lane, kind:'buff'|'slowzone'|'flash', stat, mult, add, tLeft}
    sides: null,     // [player, enemy]
    armed: -1,       // index into player hand
    layout: null,
    aiTimer: 1.5,
    suddenTick: 0,
    unitSeq: 0,
    stats: null,
    lastReserves: -1,
    speed: 1,
  };

  // ---------------- setup ----------------

  function defaultMods() {
    return {
      hpMult: 1, dmgMult: 1, armorAdd: 0, spdMult: 1, flierSpdMult: 1,
      startEnergy: 0, energyMax: 0, handSize: 0, hiveRegen: 0,
      venom: false, hiveDmgMult: 1, unhurtDmgMult: 1, lootMult: 1,
      hiveBonus: 0,
    };
  }

  function mergePassive(mods, faction, deckIds) {
    const p = SL.DATA.PASSIVES[faction] || {};
    const m = Object.assign(defaultMods(), mods || {});
    if (p.energyMax) m.energyMax += p.energyMax;
    if (p.flierSpdMult) m.flierSpdMult *= p.flierSpdMult;
    if (p.armorAdd) m.armorAdd += p.armorAdd;
    if (p.unhurtDmgMult) m.unhurtDmgMult *= p.unhurtDmgMult;
    if (p.hiveDmgMult) m.hiveDmgMult *= p.hiveDmgMult;
    if (p.hiveRegen) m.hiveRegen += p.hiveRegen;

    // BROOD LOYALTY — deck share of your faction sets the tier
    if (faction !== 'neutral' && deckIds && deckIds.length) {
      const own = deckIds.filter((id) => {
        const c = SL.DATA.CARDS[id];
        return c && c.faction === faction;
      }).length;
      const frac = own / deckIds.length;
      m.loyalFaction = faction;
      m.loyalFrac = frac;
      m.loyalTier = frac >= SL.DATA.LOYALTY_DEVOTED ? 2
        : frac >= SL.DATA.LOYALTY_KINDRED ? 1 : 0;
      if (m.loyalTier >= 1) m.factionStatMult = 1.05;
      if (m.loyalTier === 2) {
        if (faction === 'ants') m.cheapCostDown = true;
        else if (faction === 'wasps') m.flierDmgMult = 1.2;
        else if (faction === 'beetles') m.armorAdd += 1;
        else if (faction === 'mantids') m.factionDodge = 0.10;
        else if (faction === 'termites') m.hiveDmgMult *= 1.75 / 1.5;
        else if (faction === 'moths') { m.hiveRegen *= 2; m.startEnergy += 1; }
      }
    }
    return m;
  }

  // loyalty-discounted card cost
  function effCost(side, def) {
    let c = def.cost;
    if (side.mods.cheapCostDown && def.faction === side.mods.loyalFaction && def.cost <= 2) {
      c = Math.max(1, c - 1);
    }
    return c;
  }

  function buildEnemyDeck(faction, budget, rng) {
    const D = SL.DATA;
    let pool;
    if (faction === 'neutral') pool = D.NEUTRAL_POOL.map((id) => D.CARDS[id]);
    else pool = D.cardsOfFaction(faction).filter((c) => c.type === 'unit');
    const tierCap = budget < 14 ? 2 : budget < 24 ? 3 : 4;
    pool = pool.filter((c) => c.tier <= tierCap);
    const deck = [];
    let power = 0;
    let guard = 0;
    while ((power < budget || deck.length < 8) && guard++ < 200) {
      const c = rng.pick(pool);
      deck.push(c.id);
      power += c.cost;
    }
    return rng.shuffle(deck);
  }

  function makeSide(faction, deckIds, mods, hiveMax, rng, isPlayer) {
    const m = mergePassive(mods, faction, deckIds);
    const draw = rng.shuffle(deckIds.slice());
    const handSize = Math.min(5, 4 + (isPlayer ? m.handSize : 0));
    const hand = [];
    while (hand.length < handSize && draw.length) hand.push(draw.shift());
    return {
      faction, mods: m, isPlayer,
      energy: Math.min(10 + m.energyMax, 5 + m.startEnergy),
      energyMax: 10 + m.energyMax,
      regenInt: isPlayer ? 1.5 : 1.6,
      regenT: 0,
      hand, draw,
      hiveMax: hiveMax + m.hiveBonus,
      hiveHp: hiveMax + m.hiveBonus,
      hiveShakeT: 0,
    };
  }

  // cfg: {playerFaction, playerDeck, playerMods, enemyFaction, enemyBudget,
  //       defending, playerHiveMax, enemyHiveMax, seed, stakes, onEnd}
  function start(cfg) {
    B.cfg = cfg;
    B.rng = SL.makeRng(cfg.seed);
    B.t = 0; B.over = false; B.timeScale = 1; B.endTimer = 0;
    B.units = []; B.projectiles = []; B.particles = []; B.floaters = [];
    B.laneEffects = [];
    B.armed = -1;
    B.aiTimer = 2.0;
    B.suddenTick = 0;
    B.unitSeq = 0;
    B.lastReserves = -1;
    B.stats = { killed: 0, lost: 0 };

    const enemyDeck = buildEnemyDeck(cfg.enemyFaction, cfg.enemyBudget, B.rng);
    B.sides = [
      makeSide(cfg.playerFaction, cfg.playerDeck, cfg.playerMods, cfg.playerHiveMax || 30, B.rng, true),
      makeSide(cfg.enemyFaction, enemyDeck, {}, cfg.enemyHiveMax || 30, B.rng, false),
    ];
    // enemy AI pacing: stronger budgets play faster AND regen faster;
    // weak garrisons are genuinely weak (their army is finite too)
    B.aiDelay = Math.max(0.7, 1.7 - cfg.enemyBudget * 0.022);
    B.sides[1].regenInt = Math.max(1.1, 2.2 - cfg.enemyBudget * 0.025);

    B.active = true;
    renderHand();
    updateEnergyUI();
    document.getElementById('bt-stakes').textContent = cfg.stakes || '';
    updateLoyaltyBadge();
    updateSpeedBtn();
    initHint();
  }

  function stop() { B.active = false; hideInspect(); const h = hintEl(); if (h) h.classList.add('hidden'); }

  // ---------------- layout (landscape) ----------------

  function layout(canvasW, canvasH) {
    const scale = canvasH / LOGICAL_H;
    const W = canvasW / scale;
    // css-fixed chrome converted to logical units
    const topbarL = Math.min(70, 44 / scale + 6);
    const handL = Math.min(170, 128 / scale + 14);
    const fieldTop = topbarL + 26;      // room for hive HP bars
    const fieldBot = LOGICAL_H - handL - 6;
    const laneH = (fieldBot - fieldTop) / LANES;
    // The hive stands level with the middle lane. Its drawn width decides
    // where the marching ground starts, so troops never overlap their base.
    const fieldH = fieldBot - fieldTop;
    // Hive size and field margin are a BALANCE parameter, not just a visual
    // one: the marching corridor was tuned at ~500 logical units, and
    // shrinking it favours melee duelists over ranged and attrition builds.
    const hiveH = Math.min(96, fieldH * 0.46);
    const hiveW = hiveH * 2;              // delivered hive art is 2:1
    // keep the whole base on screen: half its width, plus a margin
    const hiveLX = hiveW * 0.5 + 8;
    B.layout = {
      scale, W,
      fieldTop, fieldBot, laneH,
      hiveH, hiveW,
      hiveLX,
      hiveRX: W - hiveLX,
      hiveCY: fieldTop + fieldH / 2,
      fieldLeft: hiveLX + hiveW * 0.34,
      fieldRight: W - (hiveLX + hiveW * 0.34),
      barY: topbarL + 4,
    };
    return B.layout;
  }

  function laneY(l) {
    const L = B.layout;
    return L.fieldTop + (l + 0.5) * L.laneH;
  }

  // ---------------- cards ----------------

  function cardPlayable(side, idx) {
    const id = side.hand[idx];
    if (!id) return false;
    return effCost(side, SL.DATA.CARDS[id]) <= side.energy;
  }

  function cyclePlayed(side, idx) {
    const id = side.hand[idx];
    if (side.isPlayer) side.draw.push(id); // player army recycles
    // enemy garrison is FINITE — played cards are gone for good
    side.hand[idx] = side.draw.shift() || null;
  }

  function playCard(sideIdx, handIdx, lane) {
    const side = B.sides[sideIdx];
    const id = side.hand[handIdx];
    const def = SL.DATA.CARDS[id];
    if (!def) return false;
    const cost = effCost(side, def);
    if (cost > side.energy) return false;
    side.energy -= cost;

    if (def.type === 'unit') {
      spawnFromCard(sideIdx, def, lane);
      SL.audio.sfx('deploy');
    } else {
      applyTactic(sideIdx, def, lane);
      SL.audio.sfx('tactic');
    }
    cyclePlayed(side, handIdx);
    if (sideIdx === 0) { renderHand(); updateEnergyUI(); }
    return true;
  }

  function spawnFromCard(sideIdx, def, lane, atFrac) {
    const n = (def.traits && def.traits.swarm) || 1;
    for (let i = 0; i < n; i++) {
      spawnUnit(sideIdx, def, lane, atFrac, i * 0.12);
    }
  }

  function spawnUnit(sideIdx, def, lane, atFrac, delayOffset) {
    const L = B.layout;
    const side = B.sides[sideIdx];
    const m = side.mods;
    const span = L.fieldRight - L.fieldLeft;
    let x;
    if (atFrac !== undefined && atFrac !== null) {
      x = sideIdx === 0 ? L.fieldLeft + span * atFrac : L.fieldRight - span * atFrac;
    } else {
      x = sideIdx === 0 ? L.fieldLeft + 8 : L.fieldRight - 8;
    }
    x -= (delayOffset || 0) * 30 * (sideIdx === 0 ? 1 : -1);
    let hpMult = m.hpMult;
    if (m.factionStatMult && def.faction === m.loyalFaction) hpMult *= m.factionStatMult;
    const u = {
      uid: ++B.unitSeq,
      side: sideIdx, def, lane,
      x,
      yJit: B.rng.range(-L.laneH * 0.16, L.laneH * 0.16),
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      armor: def.armor + m.armorAdd,
      state: def.spd === 0 ? 'hold' : 'march',
      walkPhase: B.rng.range(0, 4),   // desynced so a rank does not march in lockstep
      atkCd: def.atkInt * 0.5,
      t: B.rng.range(0, 5),
      slowT: 0, slowMult: 1,
      poisonT: 0, poisonTick: 0,
      chompT: 0,
      dead: false,
    };
    B.units.push(u);
    puff(u.x, laneY(lane) + u.yJit, '#f0e3c8', 5);
    return u;
  }

  function applyTactic(sideIdx, def, lane) {
    const e = def.effect;
    const enemyIdx = 1 - sideIdx;
    if (e.kind === 'laneBuff') {
      B.laneEffects.push({
        side: sideIdx, lane, kind: 'buff', stat: e.stat,
        mult: e.mult || 1, add: e.add || 0, tLeft: e.dur,
      });
    } else if (e.kind === 'laneSlow') {
      B.laneEffects.push({ side: enemyIdx, lane, kind: 'slowzone', mult: e.mult, tLeft: e.dur });
    } else if (e.kind === 'laneDamage') {
      for (const u of B.units) {
        if (u.side === enemyIdx && u.lane === lane && !u.dead) {
          if (u.def.fly && !e.air) continue;
          hurt(u, e.dmg, sideIdx, true);
        }
      }
      flashLane(lane, sideIdx);
    } else if (e.kind === 'laneHeal') {
      for (const u of B.units) {
        if (u.side === sideIdx && u.lane === lane && !u.dead) {
          u.hp = Math.min(u.maxHp, u.hp + e.amt);
          puff(u.x, laneY(u.lane) + u.yJit, '#a8e0a0', 4);
        }
      }
    } else if (e.kind === 'hiveDamage') {
      hurtHive(enemyIdx, e.dmg);
    } else if (e.kind === 'spawn') {
      const u = SL.DATA.CARDS[e.unit];
      for (let i = 0; i < e.count; i++) spawnUnit(sideIdx, u, lane, e.at + i * 0.05);
    }
  }

  function laneEffectFor(u, stat) {
    let mult = 1, add = 0;
    for (const fx of B.laneEffects) {
      if (fx.lane !== u.lane) continue;
      if (fx.kind === 'buff' && fx.side === u.side && fx.stat === stat) { mult *= fx.mult || 1; add += fx.add || 0; }
      if (fx.kind === 'slowzone' && fx.side === u.side && stat === 'spd') mult *= fx.mult;
    }
    return { mult, add };
  }

  // ---------------- combat ----------------

  function unitDmg(u) {
    const m = B.sides[u.side].mods;
    let d = u.def.dmg * m.dmgMult;
    if (m.unhurtDmgMult > 1 && u.hp >= u.maxHp) d *= m.unhurtDmgMult;
    if (m.factionStatMult && u.def.faction === m.loyalFaction) d *= m.factionStatMult;
    if (m.flierDmgMult && u.def.fly) d *= m.flierDmgMult;
    const fx = laneEffectFor(u, 'dmg');
    d *= fx.mult;
    return d;
  }

  function unitSpd(u) {
    const m = B.sides[u.side].mods;
    let s = u.def.spd * m.spdMult;
    if (u.def.fly) s *= m.flierSpdMult;
    if (u.slowT > 0) s *= u.slowMult;
    const fx = laneEffectFor(u, 'spd');
    s *= fx.mult;
    return s;
  }

  function unitAtkInt(u) {
    const fx = laneEffectFor(u, 'atk');
    return u.def.atkInt / (fx.mult || 1);
  }

  function unitArmor(u) {
    const fx = laneEffectFor(u, 'armor');
    return u.armor + fx.add;
  }

  function canAttack(att, tgt) {
    if (tgt.dead) return false;
    if (tgt.lane !== att.lane) return false;
    if (att.def.fly) return !!tgt.def.fly || !!att.def.traits.strafe; // strafers hit ground too
    if (tgt.def.fly) return !!att.def.air;      // ground needs anti-air
    return true;
  }

  function attackRange(att) {
    return att.def.range > 0 ? att.def.range : MELEE_RANGE;
  }

  function findTarget(att) {
    const r = attackRange(att);
    let best = null, bestD = Infinity;
    for (const u of B.units) {
      if (u.side === att.side || u.dead) continue;
      if (!canAttack(att, u)) continue;
      const ahead = att.side === 0 ? (u.x >= att.x - 6) : (u.x <= att.x + 6);
      if (!ahead) continue;
      const d = Math.abs(u.x - att.x);
      if (d <= r && d < bestD) { best = u; bestD = d; }
    }
    return best;
  }

  function findHealTarget(att, range) {
    let best = null, bestD = Infinity;
    for (const u of B.units) {
      if (u.side !== att.side || u.dead || u === att) continue;
      if (u.lane !== att.lane) continue;
      if (u.hp >= u.maxHp) continue;
      const d = Math.abs(u.x - att.x);
      if (d <= range && d < bestD) { best = u; bestD = d; }
    }
    return best;
  }

  function hurt(u, rawDmg, srcSide, isTrue) {
    if (u.dead) return;
    const m = B.sides[u.side].mods;
    let dodge = u.def.traits.dodge || 0;
    if (m.factionDodge && u.def.faction === m.loyalFaction) dodge += m.factionDodge;
    if (dodge > 0 && B.rng.chance(dodge)) {
      floater(u.x, laneY(u.lane) + u.yJit - 14, 'WHIFF', '#9fc3e8', 10);
      return;
    }
    const dmg = Math.max(1, Math.round(rawDmg - (isTrue ? 0 : unitArmor(u))));
    u.hp -= dmg;
    if (u.hp <= 0) {
      u.dead = true;
      B.stats[u.side === 0 ? 'lost' : 'killed']++;
      SL.audio.sfx('splat');
      splat(u.x, laneY(u.lane) + u.yJit, SL.DATA.FACTIONS[u.def.faction].color);
      if (u.def.traits.split) {
        const child = SL.DATA.CARDS[u.def.traits.split];
        const L = B.layout;
        const span = L.fieldRight - L.fieldLeft;
        const frac = u.side === 0 ? (u.x - L.fieldLeft) / span : (L.fieldRight - u.x) / span;
        spawnUnit(u.side, child, u.lane, Math.max(0.02, frac - 0.02));
        spawnUnit(u.side, child, u.lane, Math.max(0.01, frac + 0.02));
      }
    } else {
      SL.audio.sfx('hit');
    }
  }

  function applyOnHit(att, tgt) {
    const m = B.sides[att.side].mods;
    const tr = att.def.traits;
    if (tr.slow) { tgt.slowT = Math.max(tgt.slowT, tr.slow.dur); tgt.slowMult = tr.slow.mult; }
    if (m.venom && att.def.range === 0) { tgt.poisonT = Math.max(tgt.poisonT, 3); }
    if (tr.venom) { tgt.poisonT = Math.max(tgt.poisonT, 3); }
  }

  function doDamageWithSplash(att, tgt) {
    const dmg = unitDmg(att);
    hurt(tgt, dmg, att.side);
    applyOnHit(att, tgt);
    const r = att.def.traits.splash;
    if (r) {
      const tx = tgt.x;
      const ty = laneY(tgt.lane) + tgt.yJit;
      for (const u of B.units) {
        if (u === tgt || u.side === att.side || u.dead) continue;
        if (u.def.fly && !att.def.air && !att.def.fly) continue;
        const dx = u.x - tx;
        const dy = laneY(u.lane) + u.yJit - ty;
        if (dx * dx + dy * dy <= r * r) hurt(u, dmg * 0.6, att.side);
      }
    }
  }

  function hurtHive(sideIdx, dmg) {
    const s = B.sides[sideIdx];
    s.hiveHp = Math.max(0, s.hiveHp - dmg);
    s.hiveShakeT = 0.4;
    SL.audio.sfx('hiveHit');
    const L = B.layout;
    floater(sideIdx === 1 ? L.hiveRX - 20 : L.hiveLX + 20, L.fieldTop + 40, '-' + dmg, '#d84b2a', 18);
    if (s.hiveHp <= 0 && !B.over) endBattle(sideIdx === 1);
  }

  // ---------------- update ----------------

  function update(rawDt) {
    if (!B.active) return;
    if (!B.layout) return; // first render() establishes field geometry
    const dt = Math.min(0.05, rawDt) * B.timeScale;
    B.t += dt;

    if (B.over) {
      B.endTimer -= rawDt;
      if (B.endTimer <= 0) finish();
      return;
    }

    // energy
    for (const s of B.sides) {
      s.regenT += dt;
      if (s.regenT >= s.regenInt) {
        s.regenT -= s.regenInt;
        if (s.energy < s.energyMax) {
          s.energy++;
          if (s.isPlayer) { SL.audio.sfx('energy'); refreshHandState(); }
        }
      }
      if (s.mods.hiveRegen > 0 && s.hiveHp > 0) {
        s.hiveHp = Math.min(s.hiveMax, s.hiveHp + s.mods.hiveRegen * dt);
      }
      s.hiveShakeT = Math.max(0, s.hiveShakeT - dt);
    }
    updateEnergyUI();

    // lane effects
    for (let i = B.laneEffects.length - 1; i >= 0; i--) {
      B.laneEffects[i].tLeft -= dt;
      if (B.laneEffects[i].tLeft <= 0) B.laneEffects.splice(i, 1);
    }

    // AI
    B.aiTimer -= dt;
    if (B.aiTimer <= 0) { aiAct(); B.aiTimer = B.aiDelay * B.rng.range(0.75, 1.3); }

    // sudden death
    if (B.t > SUDDEN_DEATH_AT) {
      B.suddenTick += dt;
      if (B.suddenTick > 3) {
        B.suddenTick = 0;
        hurtHive(0, 1); if (!B.over) hurtHive(1, 1);
      }
    }

    // units
    const L = B.layout;
    for (const u of B.units) {
      if (u.dead) continue;
      u.t += dt;
      if (u.slowT > 0) u.slowT -= dt;
      if (u.poisonT > 0) {
        u.poisonT -= dt;
        u.poisonTick += dt;
        if (u.poisonTick >= 1) { u.poisonTick -= 1; hurt(u, 1, 1 - u.side, true); }
        if (u.dead) continue;
      }

      if (u.state === 'chomp') {
        u.chompT -= dt;
        if (u.chompT <= 0) {
          const m = B.sides[u.side].mods;
          hurtHive(1 - u.side, Math.round(u.def.hiveDmg * m.hiveDmgMult));
          u.dead = true;
          puff(u.x, laneY(u.lane) + u.yJit, '#8a6d4f', 8);
          if (B.over) break;
        }
        continue;
      }

      // healer behavior
      if (u.def.traits.healer) {
        const hl = u.def.traits.healer;
        u.atkCd -= dt;
        const ht = findHealTarget(u, hl.range);
        if (ht) {
          u.state = 'fight';
          if (u.atkCd <= 0) {
            u.atkCd = hl.int;
            ht.hp = Math.min(ht.maxHp, ht.hp + hl.amt);
            puff(ht.x, laneY(ht.lane) + ht.yJit, '#a8e0a0', 3);
          }
          continue;
        }
      }

      // combat
      u.atkCd -= dt;
      const tgt = u.def.dmg > 0 ? findTarget(u) : null;
      if (tgt) {
        u.state = 'fight';
        if (u.atkCd <= 0) {
          u.atkCd = unitAtkInt(u);
          if (u.def.range > 0) {
            B.projectiles.push({
              x: u.x, y: laneY(u.lane) + u.yJit,
              tgt, side: u.side, att: u,
              spd: 340, color: SL.DATA.FACTIONS[u.def.faction].color,
              kind: (u.def.traits && u.def.traits.proj) || 'pellet',
              art: 'proj_' + u.def.id,
              dir: u.side === 0 ? 1 : -1,
            });
          } else {
            doDamageWithSplash(u, tgt);
          }
        }
        continue;
      }

      if (u.def.spd === 0) { u.state = 'hold'; continue; }

      // march (with friendly spacing + enemy body-block)
      u.state = 'march';
      const dir = u.side === 0 ? 1 : -1;
      let nx = u.x + dir * unitSpd(u) * dt;

      // blocked by enemy ground body we can't attack over (non-fliers only)
      if (!u.def.fly) {
        for (const o of B.units) {
          if (o.dead || o.side === u.side || o.lane !== u.lane || o.def.fly) continue;
          const gap = MELEE_RANGE * 0.9;
          if (u.side === 0 && o.x > u.x && nx > o.x - gap) nx = o.x - gap;
          if (u.side === 1 && o.x < u.x && nx < o.x + gap) nx = o.x + gap;
        }
      }
      // friendly spacing
      for (const o of B.units) {
        if (o.dead || o === u || o.side !== u.side || o.lane !== u.lane) continue;
        if (o.def.fly !== u.def.fly) continue;
        const gap = MIN_GAP;
        if (u.side === 0 && o.x > u.x && nx > o.x - gap) nx = o.x - gap;
        if (u.side === 1 && o.x < u.x && nx < o.x + gap) nx = o.x + gap;
      }
      // one full four-frame cycle per ~34px travelled keeps stride and
      // ground speed in agreement for every unit
      u.walkPhase += Math.abs(nx - u.x) / 34 * 4;
      u.x = nx;

      // reached far hive?
      if (u.side === 0 && u.x >= L.fieldRight - 4) { u.state = 'chomp'; u.chompT = 0.35; SL.audio.sfx('chomp'); }
      if (u.side === 1 && u.x <= L.fieldLeft + 4) { u.state = 'chomp'; u.chompT = 0.35; SL.audio.sfx('chomp'); }
    }

    // projectiles
    for (let i = B.projectiles.length - 1; i >= 0; i--) {
      const p = B.projectiles[i];
      if (p.tgt.dead) { B.projectiles.splice(i, 1); continue; }
      const tx = p.tgt.x;
      const ty = laneY(p.tgt.lane) + p.tgt.yJit;
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.spd * dt;
      if (d <= step + 8) {
        doDamageWithSplash(p.att, p.tgt);
        B.projectiles.splice(i, 1);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }

    // cleanup
    if (B.units.length > 220) B.units = B.units.filter((u) => !u.dead);
    else if (B.t % 2 < dt) B.units = B.units.filter((u) => !u.dead);

    // particles / floaters
    for (let i = B.particles.length - 1; i >= 0; i--) {
      const pt = B.particles[i];
      pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt;
      if (pt.t > pt.life) B.particles.splice(i, 1);
    }
    for (let i = B.floaters.length - 1; i >= 0; i--) {
      const f = B.floaters[i];
      f.t += dt; f.y -= 22 * dt;
      if (f.t > 1.2) B.floaters.splice(i, 1);
    }
  }

  // ---------------- battle AI ----------------

  function aiAct() {
    const ai = B.sides[1];
    const affordable = [];
    for (let i = 0; i < ai.hand.length; i++) {
      const c = SL.DATA.CARDS[ai.hand[i]];
      if (c && c.type === 'unit' && effCost(ai, c) <= ai.energy) affordable.push(i);
    }
    if (!affordable.length) return;

    // threat per lane: player units weighted by closeness to enemy hive (right)
    const L = B.layout;
    const span = L.fieldRight - L.fieldLeft;
    const threat = new Array(LANES).fill(0), def = new Array(LANES).fill(0);
    const laneHasFlier = new Array(LANES).fill(false);
    const laneCrowd = new Array(LANES).fill(0);
    for (const u of B.units) {
      if (u.dead) continue;
      if (u.side === 0) {
        const prox = 1.6 - (L.fieldRight - u.x) / span; // 1.6 near enemy hive
        threat[u.lane] += u.def.cost * Math.max(0.4, prox);
        if (u.def.fly) laneHasFlier[u.lane] = true;
        laneCrowd[u.lane]++;
      } else {
        def[u.lane] += u.def.cost;
      }
    }

    let lane = -1, wantAir = false, wantSplash = false;
    let worst = 2.5;
    for (let l = 0; l < LANES; l++) {
      const gap = threat[l] - def[l];
      if (gap > worst) { worst = gap; lane = l; wantAir = laneHasFlier[l]; wantSplash = laneCrowd[l] >= 3; }
    }

    if (lane >= 0) {
      // defend: best matching affordable card
      let pick = -1, score = -1;
      for (const i of affordable) {
        const c = SL.DATA.CARDS[ai.hand[i]];
        let s = c.cost;
        if (wantAir && c.air) s += 6;
        if (wantAir && !c.air && !c.fly) s -= 6;
        if (wantSplash && c.traits.splash) s += 5;
        if (s > score) { score = s; pick = i; }
      }
      if (pick >= 0) playCard(1, pick, lane);
      return;
    }

    // offense: wait for a decent bank, then push weakest player lane
    if (ai.energy < 6 && B.rng.chance(0.6)) return;
    const playerDef = new Array(LANES).fill(0);
    for (const u of B.units) {
      if (!u.dead && u.side === 0) playerDef[u.lane] += u.def.cost;
    }
    let pushLane = 0, least = Infinity;
    for (let l = 0; l < LANES; l++) {
      const v = playerDef[l] + def[l] * -0.3 + B.rng.range(0, 2);
      if (v < least) { least = v; pushLane = l; }
    }
    if (B.rng.chance(0.15)) pushLane = B.rng.int(0, LANES - 1);
    // strongest affordable
    let pick = -1, score = -1;
    for (const i of affordable) {
      const c = SL.DATA.CARDS[ai.hand[i]];
      if (c.cost > score) { score = c.cost; pick = i; }
    }
    if (pick >= 0) playCard(1, pick, pushLane);
  }

  // ---------------- end ----------------

  function endBattle(playerWon) {
    B.over = true;
    B.result = playerWon;
    B.timeScale = 0.25;
    B.endTimer = 1.3;
    SL.audio.sfx(playerWon ? 'win' : 'lose');
  }

  function forfeit() { if (!B.over) endBattle(false); }

  function finish() {
    B.active = false;
    const r = {
      won: !!B.result,
      playerHiveFrac: B.sides[0].hiveHp / B.sides[0].hiveMax,
      killed: B.stats.killed,
      lost: B.stats.lost,
      duration: B.t,
    };
    const cb = B.cfg.onEnd;
    B.cfg = null;
    if (cb) cb(r);
  }

  // ---------------- input ----------------

  function armCard(idx) {
    if (B.armed === idx) B.armed = -1;
    else if (cardPlayable(B.sides[0], idx)) { B.armed = idx; SL.audio.sfx('click'); }
    refreshHandState();
    updateHint();
  }

  function tapField(lx, ly) {
    if (B.over || B.armed < 0) return;
    const L = B.layout;
    if (!L) return;
    if (ly < L.fieldTop - 16 || ly > L.fieldBot + 16) return;
    if (lx < L.fieldLeft - 60 || lx > L.fieldRight + 60) return;
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor((ly - L.fieldTop) / L.laneH)));
    if (playCard(0, B.armed, lane)) {
      B.armed = -1;
      renderHand();
      retireHint();
    }
  }

  // ---------------- DOM: hand + energy ----------------

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }


  // Full rebuild. Anything mid-press is about to be orphaned, so clear it.
  function renderHand() {
    if (!B.sides) return;
    cancelHold();
    hideInspect();
    const side = B.sides[0];
    const wrap = document.getElementById('hand-cards');
    wrap.innerHTML = '';
    handEls = [];
    side.hand.forEach((id, i) => {
      const def = SL.DATA.CARDS[id];
      if (!def) return;
      const c = effCost(side, def);
      const fac = SL.DATA.FACTIONS[def.faction] || SL.DATA.FACTIONS.neutral;
      const el = document.createElement('button');
      el.className = 'hand-card f-' + def.faction + (def.type === 'tactic' ? ' tactic' : '');
      el.style.setProperty('--fc', fac.color);
      el.style.setProperty('--fc-soft', hexA(fac.color, 0.3));
      if (i === B.armed) el.classList.add('armed');
      if (c > side.energy) el.classList.add('unaffordable');
      else el.classList.add('ready');

      const art = document.createElement('div');
      art.className = 'hc-art';
      art.appendChild(SL.sprites.thumb(id, 58));

      const plate = document.createElement('div');
      plate.className = 'hc-plate';
      const nm = document.createElement('div');
      nm.className = 'hc-name';
      nm.textContent = def.name;
      plate.appendChild(nm);

      const cost = document.createElement('div');
      cost.className = 'hc-cost' + (c < def.cost ? ' discount' : '');
      cost.textContent = c;

      const pips = document.createElement('div');
      pips.className = 'hc-pips';
      pips.textContent = def.type === 'tactic' ? '◆' : '★'.repeat(def.tier);

      el.appendChild(art); el.appendChild(pips); el.appendChild(plate); el.appendChild(cost);
      el._cost = cost;
      handEls[i] = el;
      // tap arms the card; press-and-hold inspects it instead
      let held = false;
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        held = false;
        cancelHold();
        holdTimer = setTimeout(() => {
          holdTimer = null; held = true; showInspect(el, id);
        }, 380);
      });
      el.addEventListener('pointerup', (ev) => {
        ev.preventDefault();
        cancelHold();
        if (held) { hideInspect(); return; }
        armCard(i);
      });
      el.addEventListener('pointerleave', () => { cancelHold(); if (held) hideInspect(); });
      el.addEventListener('pointercancel', () => { cancelHold(); hideInspect(); });
      wrap.appendChild(el);
    });
    const nx = document.getElementById('next-thumb');
    nx.innerHTML = '';
    if (side.draw.length) nx.appendChild(SL.sprites.thumb(side.draw[0], 36));
  }

  // first-battle onboarding hint
  function hintEl() { return document.getElementById('battle-hint'); }
  function initHint() {
    const el = hintEl();
    if (!el) return;
    const meta = SL.game && SL.game.meta;
    B.showHint = !!(meta && !meta.seenBattleHint);
    if (!B.showHint) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = '①  TAP A CARD BELOW';
  }
  function updateHint() {
    if (!B.showHint) return;
    const el = hintEl();
    if (!el) return;
    el.textContent = B.armed >= 0 ? '②  NOW TAP A LANE TO DEPLOY' : '①  TAP A CARD BELOW';
  }
  function retireHint() {
    if (!B.showHint) return;
    B.showHint = false;
    const el = hintEl();
    if (el) el.classList.add('hidden');
    const meta = SL.game && SL.game.meta;
    if (meta) { meta.seenBattleHint = true; SL.save.saveMeta(meta); }
  }

  // press-and-hold card inspector
  let inspectEl = null;
  let handEls = [];        // the live card buttons, for in-place restyling
  let holdTimer = null;    // pending press-and-hold, cancellable from anywhere

  function cancelHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }
  function showInspect(anchorEl, cardId) {
    hideInspect();
    const def = SL.DATA.CARDS[cardId];
    if (!def) return;
    // a rebuilt hand leaves detached buttons behind; their bounding rect is
    // all zeros, which would pin the panel to the top-left corner
    if (!anchorEl || anchorEl.isConnected === false) return;
    const side = B.sides && B.sides[0];
    const c = side ? effCost(side, def) : def.cost;
    const box = document.createElement('div');
    box.id = 'card-inspect';
    box.innerHTML =
      '<div class="ci-name">' + def.name + '</div>' +
      '<div class="ci-tier">' + (def.type === 'tactic' ? 'TACTIC' : '★'.repeat(def.tier)) +
      ' · COST ' + c + (c < def.cost ? ' (LOYAL)' : '') + '</div>' +
      '<div class="ci-stats">' + SL.DATA.statLine(def) + '</div>' +
      (def.desc ? '<div class="ci-desc">“' + def.desc + '”</div>' : '');
    document.getElementById('app').appendChild(box);
    const r = anchorEl.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(6, Math.min(window.innerWidth - w - 6, x));
    box.style.left = x + 'px';
    box.style.top = Math.max(6, r.top - h - 8) + 'px';
    inspectEl = box;
    SL.audio.sfx('click');
  }
  function hideInspect() {
    if (inspectEl && inspectEl.parentNode) inspectEl.parentNode.removeChild(inspectEl);
    inspectEl = null;
  }

  // Energy only changes what a card LOOKS like, never which cards are held,
  // so restyle in place. Rebuilding here is what orphaned presses.
  function refreshHandState() {
    if (!B.sides) return;
    const side = B.sides[0];
    for (let i = 0; i < handEls.length; i++) {
      const el = handEls[i];
      const id = side.hand[i];
      if (!el || !id) continue;
      const def = SL.DATA.CARDS[id];
      if (!def) continue;
      const c = effCost(side, def);
      const poor = c > side.energy;
      el.classList.toggle('armed', i === B.armed);
      el.classList.toggle('unaffordable', poor);
      el.classList.toggle('ready', !poor);
      if (el._cost) {
        el._cost.textContent = c;
        el._cost.classList.toggle('discount', c < def.cost);
      }
    }
  }

  function updateEnergyUI() {
    if (!B.sides) return;
    const s = B.sides[0];
    const fill = document.getElementById('energy-fill');
    const num = document.getElementById('energy-num');
    if (fill) fill.style.width = (100 * s.energy / s.energyMax) + '%';
    if (num) num.textContent = Math.floor(s.energy) + '/' + s.energyMax;
  }

  // ---------------- topbar badges ----------------

  function updateLoyaltyBadge() {
    const el = document.getElementById('bt-loyalty');
    if (!el || !B.sides) return;
    const m = B.sides[0].mods;
    if (!m.loyalFaction || m.loyalTier === undefined) { el.classList.add('hidden'); return; }
    const names = ['MONGREL', 'KINDRED', 'DEVOTED'];
    const cls = ['mongrel', 'kindred', 'devoted'];
    el.className = 'bt-badge ' + cls[m.loyalTier];
    const pct = Math.round((m.loyalFrac || 0) * 100);
    const power = SL.DATA.LOYALTY[m.loyalFaction];
    el.textContent = names[m.loyalTier] + ' ' + pct + '%' +
      (m.loyalTier === 2 && power ? ' · ' + power.name : '');
    el.title = m.loyalTier === 2 && power ? power.desc : 'Raise your deck’s faction share for combat bonuses.';
  }

  function updateSpeedBtn() {
    const b = document.getElementById('btn-speed');
    if (!b) return;
    b.textContent = B.speed + '×';
    b.classList.toggle('fast', B.speed > 1);
  }

  function cycleSpeed() {
    B.speed = B.speed >= 3 ? 1 : B.speed + 1;
    updateSpeedBtn();
    const meta = SL.game && SL.game.meta;
    if (meta) { meta.battleSpeed = B.speed; SL.save.saveMeta(meta); }
    SL.audio.sfx('click');
  }

  function setSpeed(n) { B.speed = Math.max(1, Math.min(3, n | 0)); updateSpeedBtn(); }

  // ---------------- fx ----------------

  function splat(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 90;
      B.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, life: 0.5 + Math.random() * 0.3, r: 2 + Math.random() * 3.5, color });
    }
    floater(x, y - 10, ['SPLAT!', 'BONK!', 'POW!', 'SQUISH!'][Math.floor(Math.random() * 4)], '#2b1d16', 11);
  }

  function puff(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 15 + Math.random() * 35;
      B.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0, life: 0.35, r: 2 + Math.random() * 2, color });
    }
  }

  function flashLane(lane, side) {
    B.laneEffects.push({ side, lane, kind: 'flash', tLeft: 0.25 });
  }

  function floater(x, y, text, color, size) {
    B.floaters.push({ x, y, text, color, size: size || 12, t: 0 });
  }

  // ---------------- render ----------------

  function render(ctx, canvasW, canvasH) {
    if (!B.sides) return;
    const L = layout(canvasW, canvasH);
    ctx.save();
    ctx.scale(L.scale, L.scale);
    const W = L.W, H = LOGICAL_H;

    // --- background: painted battlefield if delivered, else garden paper ---
    const bbg = SL.sprites.sheet('battle_bg');
    if (bbg) {
      // cover-fit so the painting is never squashed by the screen's aspect
      const k = Math.max(W / bbg.width, H / bbg.height);
      const dw = bbg.width * k, dh = bbg.height * k;
      ctx.drawImage(bbg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#d9c9a3');
      g.addColorStop(0.5, '#e7d9b4');
      g.addColorStop(1, '#cdbd92');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(43,29,22,0.05)';
      for (let yy = 0; yy < H; yy += 14) {
        for (let xx = (yy / 14) % 2 ? 7 : 0; xx < W; xx += 14) {
          ctx.fillRect(xx, yy, 2, 2);
        }
      }
    }

    // lane bands: alternating tint so the lanes read at a glance
    for (let l = 0; l < LANES; l++) {
      ctx.fillStyle = l % 2 ? 'rgba(43,29,22,0.055)' : 'rgba(240,227,200,0.16)';
      ctx.fillRect(0, L.fieldTop + l * L.laneH, W, L.laneH);
    }
    // lane dividers: dashed vine lines (horizontal)
    ctx.strokeStyle = 'rgba(43,29,22,0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 10]);
    for (let l = 1; l < LANES; l++) {
      const y = L.fieldTop + l * L.laneH;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(W - 8, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // field edges
    ctx.strokeStyle = 'rgba(43,29,22,0.35)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(8, L.fieldTop); ctx.lineTo(W - 8, L.fieldTop);
    ctx.moveTo(8, L.fieldBot); ctx.lineTo(W - 8, L.fieldBot);
    ctx.stroke();

    // armed-card lane highlight
    if (B.armed >= 0 && !B.over) {
      const pulse = 0.12 + Math.sin(B.t * 6) * 0.06;
      for (let l = 0; l < LANES; l++) {
        const y = L.fieldTop + l * L.laneH;
        ctx.fillStyle = 'rgba(224,165,30,' + pulse + ')';
        ctx.fillRect(8, y + 2, W - 16, L.laneH - 4);
        ctx.strokeStyle = 'rgba(224,165,30,0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.strokeRect(9, y + 3, W - 18, L.laneH - 6);
        ctx.setLineDash([]);
        // deploy chevron at the player's edge of each lane
        const cx = L.fieldLeft - 16, cy = y + L.laneH / 2;
        ctx.fillStyle = 'rgba(224,165,30,0.9)';
        ctx.strokeStyle = '#1b120c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - 8); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx - 7, cy + 8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // lane tactic zone tints
    for (const fx of B.laneEffects) {
      const y = L.fieldTop + fx.lane * L.laneH;
      if (fx.kind === 'slowzone') {
        ctx.fillStyle = 'rgba(143,107,184,0.13)';
        ctx.fillRect(L.fieldLeft, y, L.fieldRight - L.fieldLeft, L.laneH);
      } else if (fx.kind === 'flash') {
        ctx.fillStyle = 'rgba(224,165,30,' + (fx.tLeft * 1.8) + ')';
        ctx.fillRect(L.fieldLeft, y, L.fieldRight - L.fieldLeft, L.laneH);
      } else if (fx.kind === 'buff') {
        ctx.fillStyle = fx.side === 0 ? 'rgba(77,160,92,0.08)' : 'rgba(216,75,42,0.08)';
        ctx.fillRect(L.fieldLeft, y, L.fieldRight - L.fieldLeft, L.laneH);
      }
    }

    // --- hives (standing at each side, on the field floor) ---
    const pf = SL.DATA.FACTIONS[B.sides[0].faction];
    const ef = SL.DATA.FACTIONS[B.sides[1].faction];
    const shake0 = B.sides[0].hiveShakeT > 0 ? Math.sin(B.t * 60) * 3 : 0;
    const shake1 = B.sides[1].hiveShakeT > 0 ? Math.sin(B.t * 60) * 3 : 0;
    SL.sprites.drawHive(ctx, B.sides[0].faction, {
      x: L.hiveLX + shake0, y: L.hiveCY, w: L.hiveW, side: 0,
      color: pf.color, maxH: L.hiveH, anchor: 'center',
    });
    SL.sprites.drawHive(ctx, B.sides[1].faction, {
      x: L.hiveRX + shake1, y: L.hiveCY, w: L.hiveW, side: 1,
      color: ef.color, maxH: L.hiveH, anchor: 'center', mirror: true,
    });

    // bars ride above each base, clamped so neither runs off the edge
    const barX0 = Math.max(94, Math.min(W - 94, L.hiveLX));
    const barX1 = Math.max(94, Math.min(W - 94, L.hiveRX));
    drawHiveBar(ctx, B.sides[0], barX0, L.barY, pf.color);
    drawHiveBar(ctx, B.sides[1], barX1, L.barY, ef.color);

    // enemy reserves counter lives in the DOM topbar
    const reserves = B.sides[1].draw.length + B.sides[1].hand.filter(Boolean).length;
    if (reserves !== B.lastReserves) {
      B.lastReserves = reserves;
      const el = document.getElementById('bt-stakes');
      if (el) {
        el.textContent = (B.cfg && B.cfg.stakes ? B.cfg.stakes + '  ·  ' : '') +
          (reserves > 0 ? 'ENEMY RESERVES: ' + reserves : 'RESERVES SPENT!');
      }
    }

    // --- units (sorted by lane depth so lower lanes draw over) ---
    const sorted = B.units.filter((u) => !u.dead)
      .sort((a, b) => (laneY(a.lane) + a.yJit) - (laneY(b.lane) + b.yJit));
    const unitSize = Math.min(52, L.laneH * 0.62);
    const unitMaxH = L.laneH * 1.02;
    for (const u of sorted) {
      SL.sprites.drawUnit(ctx, u.def, {
        x: u.x,
        y: laneY(u.lane) + u.yJit,
        side: u.side,
        t: u.t,
        walkPhase: u.walkPhase,
        // 0 just after a swing, 1 as the next one lands
        atkPhase: 1 - Math.max(0, Math.min(1, u.atkCd / Math.max(0.05, unitAtkInt(u)))),
        state: u.state === 'hold' ? 'march' : u.state,
        color: SL.DATA.FACTIONS[u.def.faction].color,
        size: unitSize,
        maxH: unitMaxH,
        hpFrac: u.hp / u.maxHp,
        slowed: u.slowT > 0,
        poisoned: u.poisonT > 0,
      });
    }

    // projectiles
    for (const p of B.projectiles) SL.sprites.drawProjectile(ctx, p);

    // particles
    for (const pt of B.particles) {
      const a = 1 - pt.t / pt.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // floaters
    for (const f of B.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
      ctx.font = '900 ' + f.size + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#f0e3c8';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // sudden death notice
    if (B.t > SUDDEN_DEATH_AT && !B.over) {
      ctx.font = '900 16px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d84b2a';
      ctx.fillText('SUDDEN DEATH — HIVES CRUMBLING', W / 2, L.fieldTop - 8);
    }

    ctx.restore();
  }

  function drawHiveBar(ctx, side, cx, y, color) {
    const w = 170, h = 13;
    const frac = Math.max(0, side.hiveHp / side.hiveMax);
    ctx.fillStyle = '#1b120c';
    roundRect(ctx, cx - w / 2 - 2, y - 2, w + 4, h + 4, 7); ctx.fill();
    ctx.fillStyle = 'rgba(240,227,200,0.35)';
    roundRect(ctx, cx - w / 2, y, w, h, 5); ctx.fill();
    ctx.fillStyle = color;
    if (frac > 0) { roundRect(ctx, cx - w / 2, y, Math.max(6, w * frac), h, 5); ctx.fill(); }
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0e3c8';
    ctx.fillText(Math.ceil(side.hiveHp) + ' / ' + side.hiveMax, cx, y + h - 3);
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

  // Backstop: whatever happens to the card that opened it, a pointer release
  // anywhere in the document closes the inspector.
  if (typeof document !== 'undefined' && document.addEventListener) {
    const release = () => { cancelHold(); hideInspect(); };
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
  }

  SL.battle = {
    start, stop, update, render, tapField, forfeit,
    cycleSpeed, setSpeed,
    get speed() { return B.speed; },
    get lanes() { return LANES; },
    debugSpawn: (sideIdx, cardId, lane, atFrac) => {
      const def = SL.DATA.CARDS[cardId];
      if (def && B.active && B.layout) spawnUnit(sideIdx, def, lane, atFrac);
    },
    get active() { return B.active; },
    get over() { return B.over; },
    _B: B,
  };
})();

// SWARMLORDS — lane battle simulation + battle AI + renderer.
// Portrait field, 4 vertical lanes. Player hive bottom, enemy hive top.
// Units march toward the far hive, fight what they meet, chomp the hive.
window.SL = window.SL || {};

(function () {
  const LANES = 4;
  const LOGICAL_W = 400;
  const MELEE_RANGE = 30;
  const MIN_GAP = 30;
  const SUDDEN_DEATH_AT = 300; // seconds

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
    laneEffects: [], // {side, lane, kind:'buff'|'slow', stat, mult, add, tLeft}
    sides: null,     // [player, enemy]
    armed: -1,       // index into player hand
    layout: null,
    aiTimer: 1.5,
    suddenTick: 0,
    unitSeq: 0,
    stats: null,
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

  function mergePassive(mods, faction) {
    const p = SL.DATA.PASSIVES[faction] || {};
    const m = Object.assign(defaultMods(), mods || {});
    if (p.energyMax) m.energyMax += p.energyMax;
    if (p.flierSpdMult) m.flierSpdMult *= p.flierSpdMult;
    if (p.armorAdd) m.armorAdd += p.armorAdd;
    if (p.unhurtDmgMult) m.unhurtDmgMult *= p.unhurtDmgMult;
    if (p.hiveDmgMult) m.hiveDmgMult *= p.hiveDmgMult;
    if (p.hiveRegen) m.hiveRegen += p.hiveRegen;
    return m;
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
    const m = mergePassive(mods, faction);
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
  }

  function stop() { B.active = false; }

  // ---------------- layout ----------------

  function layout(canvasW, canvasH, dpr) {
    const scale = canvasW / LOGICAL_W;
    const H = canvasH / scale;
    const safeTop = 46;
    const bottomUI = 168; // hand + energy area in logical px
    const fieldTop = safeTop + 58;
    const fieldBot = H - bottomUI - 30;
    B.layout = {
      scale, H,
      fieldTop, fieldBot,
      laneW: LOGICAL_W / LANES,
      hiveTopY: safeTop + 30,
      hiveBotY: fieldBot + 26,
    };
    return B.layout;
  }

  function laneX(l) { return (l + 0.5) * (LOGICAL_W / LANES); }

  // ---------------- cards ----------------

  function cardPlayable(side, idx) {
    const id = side.hand[idx];
    if (!id) return false;
    return SL.DATA.CARDS[id].cost <= side.energy;
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
    if (!def || def.cost > side.energy) return false;
    side.energy -= def.cost;

    if (def.type === 'unit') {
      spawnFromCard(sideIdx, def, lane);
      SL.audio.sfx(sideIdx === 0 ? 'deploy' : 'deploy');
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
    const span = L.fieldBot - L.fieldTop;
    let y;
    if (atFrac !== undefined && atFrac !== null) {
      y = sideIdx === 0 ? L.fieldBot - span * atFrac : L.fieldTop + span * atFrac;
    } else {
      y = sideIdx === 0 ? L.fieldBot - 8 : L.fieldTop + 8;
    }
    y += (delayOffset || 0) * (sideIdx === 0 ? 30 : -30) * -1;
    const u = {
      uid: ++B.unitSeq,
      side: sideIdx, def, lane,
      y,
      xJit: B.rng.range(-8, 8),
      hp: Math.round(def.hp * m.hpMult),
      maxHp: Math.round(def.hp * m.hpMult),
      armor: def.armor + m.armorAdd,
      state: def.spd === 0 ? 'hold' : 'march',
      atkCd: def.atkInt * 0.5,
      t: B.rng.range(0, 5),
      slowT: 0, slowMult: 1,
      poisonT: 0, poisonTick: 0,
      chompT: 0,
      dead: false,
    };
    B.units.push(u);
    puff(laneX(lane) + u.xJit, u.y, '#f0e3c8', 5);
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
          puff(laneX(u.lane) + u.xJit, u.y, '#a8e0a0', 4);
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
      const ahead = att.side === 0 ? (u.y <= att.y + 6) : (u.y >= att.y - 6);
      if (!ahead) continue;
      const d = Math.abs(u.y - att.y);
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
      const d = Math.abs(u.y - att.y);
      if (d <= range && d < bestD) { best = u; bestD = d; }
    }
    return best;
  }

  function hurt(u, rawDmg, srcSide, isTrue) {
    if (u.dead) return;
    if (u.def.traits.dodge && B.rng.chance(u.def.traits.dodge)) {
      floater(laneX(u.lane) + u.xJit, u.y - 14, 'WHIFF', '#9fc3e8', 10);
      return;
    }
    const dmg = Math.max(1, Math.round(rawDmg - (isTrue ? 0 : unitArmor(u))));
    u.hp -= dmg;
    if (u.hp <= 0) {
      u.dead = true;
      B.stats[u.side === 0 ? 'lost' : 'killed']++;
      SL.audio.sfx('splat');
      splat(laneX(u.lane) + u.xJit, u.y, SL.DATA.FACTIONS[u.def.faction].color);
      if (u.def.traits.split) {
        const child = SL.DATA.CARDS[u.def.traits.split];
        const L = B.layout;
        const frac = u.side === 0 ? (L.fieldBot - u.y) / (L.fieldBot - L.fieldTop) : (u.y - L.fieldTop) / (L.fieldBot - L.fieldTop);
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
      const tx = laneX(tgt.lane) + tgt.xJit;
      for (const u of B.units) {
        if (u === tgt || u.side === att.side || u.dead) continue;
        if (u.def.fly && !att.def.air && !att.def.fly) continue;
        const dx = laneX(u.lane) + u.xJit - tx;
        const dy = u.y - tgt.y;
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
    floater(LOGICAL_W / 2, sideIdx === 1 ? L.hiveTopY + 30 : L.hiveBotY - 30, '-' + dmg, '#d84b2a', 18);
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
          if (s.isPlayer) { SL.audio.sfx('energy'); renderHand(); }
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
          puff(laneX(u.lane) + u.xJit, u.y, '#8a6d4f', 8);
          if (B.over) break;
        }
        continue;
      }

      // healer behavior
      if (u.def.traits.healer) {
        const h = u.def.traits.healer;
        u.atkCd -= dt;
        const ht = findHealTarget(u, h.range);
        if (ht) {
          u.state = 'fight';
          if (u.atkCd <= 0) {
            u.atkCd = h.int;
            ht.hp = Math.min(ht.maxHp, ht.hp + h.amt);
            puff(laneX(ht.lane) + ht.xJit, ht.y, '#a8e0a0', 3);
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
              x: laneX(u.lane) + u.xJit, y: u.y,
              tgt, side: u.side, att: u,
              spd: 340, color: SL.DATA.FACTIONS[u.def.faction].color,
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
      const dir = u.side === 0 ? -1 : 1;
      let ny = u.y + dir * unitSpd(u) * dt;

      // blocked by enemy ground body we can't attack over (non-fliers only)
      if (!u.def.fly) {
        for (const o of B.units) {
          if (o.dead || o.side === u.side || o.lane !== u.lane || o.def.fly) continue;
          const gap = MELEE_RANGE * 0.9;
          if (u.side === 0 && o.y < u.y && ny < o.y + gap) ny = o.y + gap;
          if (u.side === 1 && o.y > u.y && ny > o.y - gap) ny = o.y - gap;
        }
      }
      // friendly spacing
      for (const o of B.units) {
        if (o.dead || o === u || o.side !== u.side || o.lane !== u.lane) continue;
        if (o.def.fly !== u.def.fly) continue;
        const gap = MIN_GAP;
        if (u.side === 0 && o.y < u.y && ny < o.y + gap) ny = o.y + gap;
        if (u.side === 1 && o.y > u.y && ny > o.y - gap) ny = o.y - gap;
      }
      u.y = ny;

      // reached far hive?
      if (u.side === 0 && u.y <= L.fieldTop + 4) { u.state = 'chomp'; u.chompT = 0.35; SL.audio.sfx('chomp'); }
      if (u.side === 1 && u.y >= L.fieldBot - 4) { u.state = 'chomp'; u.chompT = 0.35; SL.audio.sfx('chomp'); }
    }

    // projectiles
    for (let i = B.projectiles.length - 1; i >= 0; i--) {
      const p = B.projectiles[i];
      const tx = p.tgt.dead ? p.x : laneX(p.tgt.lane) + p.tgt.xJit;
      const ty = p.tgt.dead ? p.y - 40 : p.tgt.y;
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.spd * dt;
      if (p.tgt.dead) { B.projectiles.splice(i, 1); continue; }
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
      if (c && c.type === 'unit' && c.cost <= ai.energy) affordable.push(i);
    }
    if (!affordable.length) return;

    // threat per lane: player units weighted by closeness to enemy hive (top)
    const L = B.layout;
    const span = L.fieldBot - L.fieldTop;
    const threat = [0, 0, 0, 0], def = [0, 0, 0, 0];
    const laneHasFlier = [false, false, false, false];
    const laneCrowd = [0, 0, 0, 0];
    for (const u of B.units) {
      if (u.dead) continue;
      if (u.side === 0) {
        const prox = 1.6 - (u.y - L.fieldTop) / span; // 1.6 near top, 0.6 near bottom
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
    const playerDef = [0, 0, 0, 0];
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
    renderHand();
  }

  function tapField(lx, ly) {
    if (B.over || B.armed < 0) return;
    const L = B.layout;
    if (ly < L.fieldTop - 20 || ly > L.fieldBot + 30) return;
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor(lx / (LOGICAL_W / LANES))));
    if (playCard(0, B.armed, lane)) {
      B.armed = -1;
      renderHand();
    }
  }

  // ---------------- DOM: hand + energy ----------------

  function renderHand() {
    if (!B.sides) return;
    const side = B.sides[0];
    const wrap = document.getElementById('hand-cards');
    wrap.innerHTML = '';
    side.hand.forEach((id, i) => {
      const def = SL.DATA.CARDS[id];
      if (!def) return;
      const el = document.createElement('button');
      el.className = 'hand-card' + (def.type === 'tactic' ? ' tactic' : '');
      if (i === B.armed) el.classList.add('armed');
      if (def.cost > side.energy) el.classList.add('unaffordable');
      const art = document.createElement('div');
      art.className = 'hc-art';
      art.appendChild(SL.sprites.thumb(id, 56));
      const nm = document.createElement('div');
      nm.className = 'hc-name';
      nm.textContent = def.name;
      const cost = document.createElement('div');
      cost.className = 'hc-cost';
      cost.textContent = def.cost;
      el.appendChild(art); el.appendChild(nm); el.appendChild(cost);
      el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); armCard(i); });
      wrap.appendChild(el);
    });
    const nx = document.getElementById('next-thumb');
    nx.innerHTML = '';
    if (side.draw.length) nx.appendChild(SL.sprites.thumb(side.draw[0], 36));
  }

  function updateEnergyUI() {
    if (!B.sides) return;
    const s = B.sides[0];
    const fill = document.getElementById('energy-fill');
    const num = document.getElementById('energy-num');
    if (fill) fill.style.width = (100 * s.energy / s.energyMax) + '%';
    if (num) num.textContent = Math.floor(s.energy) + '/' + s.energyMax;
  }

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
    const W = LOGICAL_W, H = L.H;

    // --- background: vintage garden paper ---
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d9c9a3');
    g.addColorStop(0.5, '#e7d9b4');
    g.addColorStop(1, '#cdbd92');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // halftone dots
    ctx.fillStyle = 'rgba(43,29,22,0.05)';
    for (let yy = 0; yy < H; yy += 14) {
      for (let xx = (yy / 14) % 2 ? 7 : 0; xx < W; xx += 14) {
        ctx.fillRect(xx, yy, 2, 2);
      }
    }

    // lane dividers: dashed vine lines
    ctx.strokeStyle = 'rgba(43,29,22,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 10]);
    for (let l = 1; l < LANES; l++) {
      ctx.beginPath();
      ctx.moveTo(l * (W / LANES), L.fieldTop - 6);
      ctx.lineTo(l * (W / LANES), L.fieldBot + 6);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // armed-card lane highlight
    if (B.armed >= 0 && !B.over) {
      const pulse = 0.10 + Math.sin(B.t * 6) * 0.05;
      ctx.fillStyle = 'rgba(224,165,30,' + pulse + ')';
      ctx.fillRect(0, L.fieldTop, W, L.fieldBot - L.fieldTop);
      ctx.strokeStyle = 'rgba(224,165,30,0.7)';
      ctx.lineWidth = 2;
      for (let l = 0; l < LANES; l++) {
        ctx.strokeRect(l * (W / LANES) + 4, L.fieldTop + 4, W / LANES - 8, L.fieldBot - L.fieldTop - 8);
      }
    }

    // lane tactic zone tints
    for (const fx of B.laneEffects) {
      if (fx.kind === 'slowzone') {
        ctx.fillStyle = 'rgba(143,107,184,0.13)';
        ctx.fillRect(fx.lane * (W / LANES), L.fieldTop, W / LANES, L.fieldBot - L.fieldTop);
      } else if (fx.kind === 'flash') {
        ctx.fillStyle = 'rgba(224,165,30,' + (fx.tLeft * 1.8) + ')';
        ctx.fillRect(fx.lane * (W / LANES), L.fieldTop, W / LANES, L.fieldBot - L.fieldTop);
      } else if (fx.kind === 'buff') {
        ctx.fillStyle = fx.side === 0 ? 'rgba(77,160,92,0.08)' : 'rgba(216,75,42,0.08)';
        ctx.fillRect(fx.lane * (W / LANES), L.fieldTop, W / LANES, L.fieldBot - L.fieldTop);
      }
    }

    // --- hives ---
    const pf = SL.DATA.FACTIONS[B.sides[0].faction];
    const ef = SL.DATA.FACTIONS[B.sides[1].faction];
    const shake0 = B.sides[0].hiveShakeT > 0 ? Math.sin(B.t * 60) * 3 : 0;
    const shake1 = B.sides[1].hiveShakeT > 0 ? Math.sin(B.t * 60) * 3 : 0;
    SL.sprites.drawHive(ctx, B.sides[1].faction, { x: W / 2 + shake1, y: L.hiveTopY, w: 190, h: 46, side: 1, color: ef.color });
    SL.sprites.drawHive(ctx, B.sides[0].faction, { x: W / 2 + shake0, y: L.hiveBotY + 20, w: 190, h: 46, side: 0, color: pf.color });

    drawHiveBar(ctx, B.sides[1], W / 2, L.hiveTopY + 12, ef.color);
    drawHiveBar(ctx, B.sides[0], W / 2, L.hiveBotY + 26, pf.color);

    // enemy reserves counter (their garrison army is finite)
    const reserves = B.sides[1].draw.length + B.sides[1].hand.filter(Boolean).length;
    ctx.font = '900 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = reserves > 0 ? 'rgba(43,29,22,0.75)' : '#d84b2a';
    ctx.fillText(reserves > 0 ? 'ENEMY RESERVES: ' + reserves : 'ENEMY RESERVES SPENT!', W / 2, L.hiveTopY + 36);

    // --- units (sorted by y so lower draws over) ---
    const sorted = B.units.filter((u) => !u.dead).sort((a, b) => a.y - b.y);
    for (const u of sorted) {
      SL.sprites.drawUnit(ctx, u.def, {
        x: laneX(u.lane) + u.xJit,
        y: u.y,
        side: u.side,
        t: u.t,
        state: u.state === 'hold' ? 'march' : u.state,
        color: SL.DATA.FACTIONS[u.def.faction].color,
        size: 40,
        hpFrac: u.hp / u.maxHp,
        slowed: u.slowT > 0,
        poisoned: u.poisonT > 0,
      });
    }

    // projectiles
    for (const p of B.projectiles) {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

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
      ctx.fillText('SUDDEN DEATH — HIVES CRUMBLING', W / 2, L.fieldTop + 24);
    }

    ctx.restore();
  }

  function drawHiveBar(ctx, side, cx, y, color) {
    const w = 180, h = 13;
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

  SL.battle = {
    start, stop, update, render, tapField, forfeit,
    debugSpawn: (sideIdx, cardId, lane, atFrac) => {
      const def = SL.DATA.CARDS[cardId];
      if (def && B.active && B.layout) spawnUnit(sideIdx, def, lane, atFrac);
    },
    get active() { return B.active; },
    get over() { return B.over; },
    _B: B,
  };
})();

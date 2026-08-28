// SWARMLORDS — boot, canvas loop, input routing, PWA registration.
window.SL = window.SL || {};

(function () {
  SL.game = { screen: 'title', meta: null };

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let lastT = 0;
  let timeAcc = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }

  let resizeFrame = 0;
  function scheduleResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  }

  // Pointer handling: battles deploy on tap; the map pans on drag and
  // selects on a tap that never moved.
  const drag = { active: false, moved: false, x: 0, y: 0, id: -1 };
  const DRAG_SLOP = 7; // px before a press becomes a pan

  canvas.addEventListener('pointerdown', (e) => {
    SL.audio.ensureCtx();
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (SL.game.screen === 'battle' && SL.battle.active) {
      const s = rect.height / 400; // battle logical height is 400
      SL.battle.tapField(cssX / s, cssY / s);
      return;
    }
    if (SL.game.screen === 'map') {
      drag.active = true; drag.moved = false;
      drag.x = e.clientX; drag.y = e.clientY; drag.id = e.pointerId;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag.active || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    drag.moved = true;
    const rect = canvas.getBoundingClientRect();
    SL.conquest.panBy(dx, dy, rect.width, rect.height);
    drag.x = e.clientX; drag.y = e.clientY;
  });

  function endDrag(e) {
    if (!drag.active || (e && e.pointerId !== drag.id)) return;
    drag.active = false;
    if (canvas.releasePointerCapture && e) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    if (!drag.moved && e && SL.game.screen === 'map') {
      const rect = canvas.getBoundingClientRect();
      SL.conquest.tapMap(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // first interaction anywhere: wake audio + start title music
  let audioWoken = false;
  document.addEventListener('pointerdown', () => {
    if (!audioWoken) {
      audioWoken = true;
      SL.audio.ensureCtx();
      if (SL.game.screen === 'title') SL.audio.music('title');
    }
  }, { capture: true });

  function frame(ms) {
    const dt = Math.min(0.1, (ms - lastT) / 1000) || 0.016;
    lastT = ms;
    timeAcc += dt;

    const cw = canvas.width / dpr;
    const chh = canvas.height / dpr;

    if (SL.game.screen === 'battle' && SL.battle.active) {
      // higher speeds run extra fixed steps rather than a bigger dt,
      // so collision and spacing stay stable
      const steps = SL.battle.speed || 1;
      for (let i = 0; i < steps && SL.battle.active; i++) SL.battle.update(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, chh);
      SL.battle.render(ctx, cw, chh);
    } else if (SL.game.screen === 'map') {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, chh);
      SL.conquest.renderMap(ctx, cw, chh, timeAcc);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    if (location.search.indexOf('noanim') >= 0) document.body.classList.add('no-anim');
    SL.game.meta = SL.save.loadMeta();
    SL.audio.setSfx(SL.game.meta.sfx);
    SL.audio.setMusic(SL.game.meta.music);
    if (SL.game.meta.battleSpeed) SL.battle.setSpeed(SL.game.meta.battleSpeed);
    SL.sprites.init();
    SL.ui.init();
    resize();
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);
    SL.ui.showScreen('title');
    requestAnimationFrame(frame);

    // first-launch nudge into How to Play
    if (!SL.game.meta.seenHowto) {
      SL.game.meta.seenHowto = true;
      SL.save.saveMeta(SL.game.meta);
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // activate delivered UI art once its probe loads (checked a few times)
    [800, 2500, 6000].forEach((ms) => setTimeout(() => {
      if (SL.sprites.hasSheet('ui_panel')) document.body.classList.add('ui-art');
      // painted card frames replace the drawn ones per faction, as they land
      Object.keys(SL.DATA.FACTIONS).forEach((f) => {
        if (SL.sprites.hasSheet('card_frame_' + f)) document.body.classList.add('cf-' + f);
      });
      if (SL.game.screen === 'map') SL.ui.updateTopbar();
    }, ms));

    // dev boot shortcuts: ?demo=map | ?demo=battle | ?demo=shop|deck|draft|results
    const dm = /demo=(shop|deck|draft|results)/.exec(location.search);
    if (dm) {
      SL.conquest.startRun('ants');
      setTimeout(() => {
        if (dm[1] === 'shop') SL.shop.open();
        else if (dm[1] === 'deck') SL.ui.deckViewer(false);
        else if (dm[1] === 'draft') SL.ui.draftModal(['ant_bullet', 'neu_wolf', 'btl_stag'],
          { title: 'RECRUITMENT', sub: 'The defeated bend the knee. Enlist one:', skippable: true, skipLabel: 'SKIP (+2 gold)' }, () => {});
        else if (dm[1] === 'results') SL.ui.resultsScreen({ won: true, faction: 'ants', turns: 24,
          stats: { battlesWon: 12, battlesLost: 3, territoriesTaken: 14, factionsEliminated: 3, goldEarned: 420 },
          unlockedThisRun: ['wasps'] });
      }, 350);
      return;
    }
    // dev boot shortcuts: ?demo=map | ?demo=battle (screenshot/testing aid)
    if (location.search.indexOf('demo=map') >= 0) {
      SL.conquest.startRun('ants');
      // ?demo=map&sel=N opens the territory panel for QA
      const sm = /sel=(\d+)/.exec(location.search);
      if (sm) setTimeout(() => {
        const t = SL.conquest.terr(parseInt(sm[1], 10));
        if (t) SL.ui.showTerritoryPanel(t);
      }, 300);
    } else if (location.search.indexOf('demo=battle') >= 0) {
      SL.ui.showScreen('battle');
      // ?enemy=wasps etc. overrides the demo opponent (art QA for hives/rosters)
      const em = /enemy=([a-z]+)/.exec(location.search);
      SL.battle.start({
        playerFaction: 'ants',
        playerDeck: SL.DATA.START_DECKS.ants.slice(),
        playerMods: null,
        enemyFaction: (em && SL.DATA.FACTIONS[em[1]]) ? em[1] : 'neutral',
        enemyBudget: 20,
        defending: false, playerHiveMax: 30, enemyHiveMax: 30,
        seed: 42, stakes: 'DEMO SKIRMISH',
        onEnd: () => SL.ui.showScreen('title'),
      });
      // ?demo=battle&spawn=<cardId> → drop that unit on the field both ways
      // (art QA: enemy copies face down, player copy faces up)
      const spm = /spawn=([a-z_0-9]+)/.exec(location.search);
      if (spm) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        SL.battle.render(ctx, canvas.width / dpr, canvas.height / dpr); // set layout
        SL.battle.debugSpawn(1, spm[1], 1, 0.35);
        SL.battle.debugSpawn(1, spm[1], 2, 0.5);
        SL.battle.debugSpawn(0, spm[1], 0, 0.4);
      }
      // ?demo=battle&ff=12 → fast-forward N sim-seconds with a scripted player
      const ffm = /ff=(\d+)/.exec(location.search);
      if (ffm) {
        const secs = parseInt(ffm[1], 10);
        const B = SL.battle._B;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        SL.battle.render(ctx, canvas.width / dpr, canvas.height / dpr); // set layout
        for (let s = 0; s < secs * 20; s++) {
          SL.battle.update(0.05);
          if (s % 30 === 0 && B.sides && !B.over && B.layout) {
            for (let i = 0; i < B.sides[0].hand.length; i++) {
              const d = SL.DATA.CARDS[B.sides[0].hand[i]];
              if (d && d.cost <= B.sides[0].energy) {
                B.armed = i;
                const lane = (s / 30) % (SL.battle.lanes || 3);
                SL.battle.tapField(B.layout.W / 2,
                  B.layout.fieldTop + (lane + 0.5) * B.layout.laneH);
                break;
              }
            }
          }
        }
      }
    }
  }

  boot();
})();

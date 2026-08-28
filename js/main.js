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

  canvas.addEventListener('pointerdown', (e) => {
    SL.audio.ensureCtx();
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (SL.game.screen === 'battle' && SL.battle.active) {
      const s = rect.height / 400; // battle logical height is 400
      SL.battle.tapField(cssX / s, cssY / s);
    } else if (SL.game.screen === 'map') {
      SL.conquest.tapMap(cssX, cssY, rect.width, rect.height);
    }
  });

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
      SL.battle.update(dt);
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
                const lane = (s / 30) % 4;
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

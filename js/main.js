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

  function logicalFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 400; // logical width 400 everywhere
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
      cw: canvas.width / dpr,
      ch: canvas.height / dpr,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    SL.audio.ensureCtx();
    const p = logicalFromEvent(e);
    if (SL.game.screen === 'battle' && SL.battle.active) {
      SL.battle.tapField(p.x, p.y);
    } else if (SL.game.screen === 'map') {
      SL.conquest.tapMap(p.x, p.y, p.cw, p.ch);
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
    SL.game.meta = SL.save.loadMeta();
    SL.audio.setSfx(SL.game.meta.sfx);
    SL.audio.setMusic(SL.game.meta.music);
    SL.sprites.init();
    SL.ui.init();
    resize();
    window.addEventListener('resize', resize);
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

    // dev boot shortcuts: ?demo=map | ?demo=battle (screenshot/testing aid)
    if (location.search.indexOf('demo=map') >= 0) {
      SL.conquest.startRun('ants');
    } else if (location.search.indexOf('demo=battle') >= 0) {
      SL.ui.showScreen('battle');
      SL.battle.start({
        playerFaction: 'ants',
        playerDeck: SL.DATA.START_DECKS.ants.slice(),
        playerMods: null,
        enemyFaction: 'neutral', enemyBudget: 20,
        defending: false, playerHiveMax: 30, enemyHiveMax: 30,
        seed: 42, stakes: 'DEMO SKIRMISH',
        onEnd: () => SL.ui.showScreen('title'),
      });
      // ?demo=battle&ff=12 → fast-forward N sim-seconds with a scripted player
      const ffm = /ff=(\d+)/.exec(location.search);
      if (ffm) {
        const secs = parseInt(ffm[1], 10);
        const B = SL.battle._B;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        SL.battle.render(ctx, canvas.width / dpr, canvas.height / dpr); // set layout
        for (let s = 0; s < secs * 20; s++) {
          SL.battle.update(0.05);
          if (s % 30 === 0 && B.sides && !B.over) {
            for (let i = 0; i < B.sides[0].hand.length; i++) {
              const d = SL.DATA.CARDS[B.sides[0].hand[i]];
              if (d && d.cost <= B.sides[0].energy) {
                B.armed = i;
                SL.battle.tapField(((s / 30) % 4) * 100 + 50, 400);
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

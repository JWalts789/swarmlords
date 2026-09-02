// SWARMLORDS -- the spoils chest.
//
// Winning used to be a toast and an immediate draft modal: the reward arrived
// before the player had finished registering that they had won. This is the
// ceremony -- the chest lands, strains, bursts, and pays out one reward at a
// time before the recruits are offered.
//
// Every beat is a scheduled step, and a tap collapses the remaining schedule
// rather than being ignored, so the ceremony never costs a player who has
// seen it a hundred times.
(function () {
  const SL = window.SL = window.SL || {};

  const FRAMES = 6;          // closed, strain, strain, crack, burst, open
  const BEAT = 300;          // the drip: one strain per beat

  function el(cls, parent) {
    const d = document.createElement('div');
    d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  // The chest is a 6-frame strip when the art exists and a drawn stand-in
  // when it does not, so the sequence plays either way.
  function setFrame(chest, i) {
    const n = Math.max(0, Math.min(FRAMES - 1, i));
    chest.dataset.frame = String(n);
    if (chest.classList.contains('has-art')) {
      // one strip, FRAMES cells wide: 0% .. 100% across (FRAMES-1) steps
      chest.style.backgroundPosition = (n * (100 / (FRAMES - 1))) + '% 0';
    }
  }

  function open(opts, cb) {
    const root = document.getElementById('overlay-root');
    if (!root) { cb(null); return; }

    const timers = [];
    let done = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

    const veil = el('spoils-veil', root);
    const stage = el('spoils-stage', veil);
    const burst = el('spoils-burst', stage);
    const chest = el('spoils-chest', stage);
    const rewards = el('spoils-rewards', stage);
    const lower = el('spoils-lower', veil);

    const sheet = SL.sprites.sheet('chest_sheet');
    if (sheet) {
      chest.classList.add('has-art');
      chest.style.backgroundImage = 'url(' + sheet.src + ')';
      chest.style.backgroundSize = (FRAMES * 100) + '% 100%';
    }
    const burstArt = SL.sprites.sheet('burst_gold');
    if (burstArt) burst.style.backgroundImage = 'url(' + burstArt.src + ')';
    setFrame(chest, 0);

    // ---- the payout ----------------------------------------------------
    function popReward(r, i) {
      const chip = el('spoils-chip' + (r.kind ? ' is-' + r.kind : ''), rewards);
      const ic = el('spoils-chip-ic', chip);
      const art = r.kind === 'gold' ? SL.sprites.sheet('hud_gold')
        : r.kind === 'territory' ? SL.sprites.sheet('hud_territory') : null;
      if (art) ic.style.backgroundImage = 'url(' + art.src + ')';
      else ic.classList.add('is-blank');
      const tx = el('spoils-chip-text', chip);
      tx.textContent = r.label;
      // stagger the entrance so rewards land one at a time, not as a block
      chip.style.animationDelay = (i * 90) + 'ms';
      if (!done) SL.audio.sfx(r.kind === 'gold' ? 'coin' : 'click');
    }

    function payOut() {
      rewards.innerHTML = '';
      (opts.rewards || []).forEach(popReward);
    }

    // ---- the recruits --------------------------------------------------
    function offerCards() {
      lower.innerHTML = '';
      // If anything in here throws, the veil must still offer a way out --
      // a reward screen that cannot be dismissed is a soft-lock.
      try {
        offerCardsInner();
      } catch (e) {
        lower.innerHTML = '';
        const go = document.createElement('button');
        go.className = 'big-btn';
        go.textContent = 'ONWARD';
        go.addEventListener('click', () => finish(null));
        lower.appendChild(go);
        lower.classList.add('is-in');
      }
    }

    function offerCardsInner() {
      if (!opts.cards || !opts.cards.length) {
        const go = document.createElement('button');
        go.className = 'big-btn';
        go.textContent = opts.doneLabel || 'ONWARD';
        go.addEventListener('click', () => finish(null));
        lower.appendChild(go);
        lower.classList.add('is-in');
        return;
      }
      const head = el('spoils-sub', lower);
      head.textContent = opts.sub || 'The defeated bend the knee. Enlist one:';
      const row = el('draft-row', lower);
      opts.cards.forEach((id, i) => {
        const c = SL.ui.buildCard(id, { size: 'large' });
        c.classList.add('spoils-card');
        c.style.animationDelay = (i * 80) + 'ms';
        c.addEventListener('click', () => finish(id));
        row.appendChild(c);
      });
      if (opts.skippable) {
        const skip = document.createElement('button');
        skip.className = 'small-btn spoils-skip';
        skip.textContent = opts.skipLabel || 'SKIP';
        skip.addEventListener('click', () => finish(null));
        lower.appendChild(skip);
      }
      lower.classList.add('is-in');
    }

    function finish(picked) {
      if (done) return;
      done = true;
      clearAll();
      veil.classList.add('is-out');
      setTimeout(() => {
        if (veil.parentNode) veil.parentNode.removeChild(veil);
        cb(picked);
      }, 200);
    }

    // ---- the schedule --------------------------------------------------
    let opened = false;
    function openChest() {
      if (opened) return;
      opened = true;
      clearAll();
      chest.classList.remove('is-straining');
      chest.classList.add('is-open');
      setFrame(chest, 4);
      burst.classList.add('is-on');
      SL.audio.sfx('unlock');
      at(160, () => setFrame(chest, 5));
      at(220, payOut);
      at(220 + (opts.rewards || []).length * 90 + 320, offerCards);
    }

    veil.classList.add('is-in');
    // ?noanim=1 freezes CSS, so the ceremony would sit on frame 0 forever.
    // Jump straight to the paid-out state -- the same thing a tap does.
    if (document.body.classList.contains('no-anim')) {
      chest.classList.add('is-landed');
      openChest();
      setFrame(chest, 5);
      payOut();
      offerCards();
      return;
    }
    at(60, () => chest.classList.add('is-landed'));
    for (let i = 1; i <= 3; i++) {
      at(340 + i * BEAT, () => {
        setFrame(chest, i);
        chest.classList.remove('is-straining');
        // reflow so the shake restarts rather than being ignored as a no-op
        void chest.offsetWidth;
        chest.classList.add('is-straining');
        chest.style.setProperty('--strain', String(i));
        SL.audio.sfx('click');
      });
    }
    at(340 + 4 * BEAT, openChest);

    // a tap anywhere skips straight to the payout
    veil.addEventListener('click', (e) => {
      if (opened) return;
      if (e.target.closest('.spoils-card') || e.target.closest('button')) return;
      openChest();
    });
  }

  SL.spoils = { open };
})();

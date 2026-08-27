// SWARMLORDS — DOM UI: screens, modals, drafts, toasts, title cards.
window.SL = window.SL || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const modalStack = [];
  let titleCardTimer = null;
  let bannerTimer = null;

  // ---------------- screens ----------------

  const DOM_SCREENS = { title: 'screen-title', faction: 'screen-faction', howto: 'screen-howto' };

  function showScreen(name) {
    SL.game.screen = name;
    for (const key in DOM_SCREENS) {
      $(DOM_SCREENS[key]).classList.toggle('hidden', key !== name);
    }
    $('map-ui').classList.toggle('hidden', name !== 'map');
    $('battle-ui').classList.toggle('hidden', name !== 'battle');
    if (name === 'title') refreshTitle();
    if (name === 'map') { updateTopbar(); hideTerritoryPanel(); }
  }

  // ---------------- title screen ----------------

  function refreshTitle() {
    const hasRun = !!SL.save.loadRun();
    $('btn-continue').classList.toggle('hidden', !hasRun);
    $('btn-sfx').textContent = 'SFX: ' + (SL.game.meta.sfx ? 'ON' : 'OFF');
    $('btn-music').textContent = 'MUSIC: ' + (SL.game.meta.music ? 'ON' : 'OFF');

    // marching bug parade
    const wrap = $('title-bugs');
    if (!wrap.dataset.built) {
      wrap.dataset.built = '1';
      ['ant_soldier', 'wasp_hornet', 'btl_rhino', 'man_sickle', 'mot_luna'].forEach((id) => {
        wrap.appendChild(SL.sprites.makeMarchingBug(id, 56));
      });
    }
    // codex wordmark swap
    const logo = SL.sprites.logoSheet();
    if (!logo && !$('title-logo').dataset.swapped) {
      // wordmark may still be loading at boot — retry while on the title
      const tries = Number($('title-logo').dataset.tries || 0);
      if (tries < 40) {
        $('title-logo').dataset.tries = tries + 1;
        setTimeout(() => { if (SL.game.screen === 'title') refreshTitle(); }, 400);
      }
    }
    if (logo && !$('title-logo').dataset.swapped) {
      $('title-logo').dataset.swapped = '1';
      $('title-logo').innerHTML = '';
      const img = document.createElement('img');
      img.src = logo.src;
      img.style.maxWidth = '86vw';
      img.style.imageRendering = 'auto';
      $('title-logo').appendChild(img);
      const sub = document.createElement('div');
      sub.className = 'logo-sub';
      sub.textContent = 'A RUCKUS IN THE GARDEN';
      $('title-logo').appendChild(sub);
    }
  }

  // ---------------- faction select ----------------

  let selectedFaction = null;

  function buildFactionSelect() {
    const list = $('faction-list');
    list.innerHTML = '';
    selectedFaction = null;
    $('btn-faction-go').disabled = true;
    const meta = SL.game.meta;
    for (const fid of SL.DATA.FACTION_ORDER) {
      const fac = SL.DATA.FACTIONS[fid];
      const unlocked = meta.unlocked.includes(fid);
      const el = document.createElement('div');
      el.className = 'faction-card' + (unlocked ? '' : ' locked');
      const sw = document.createElement('div');
      sw.className = 'faction-swatch';
      sw.style.background = fac.color;
      const starter = { ants: 'ant_soldier', wasps: 'wasp_hornet', beetles: 'btl_rhino', mantids: 'man_sickle', termites: 'ter_snapjaw', moths: 'mot_luna' }[fid];
      sw.appendChild(SL.sprites.makeMarchingBug(starter, 46));
      const info = document.createElement('div');
      info.className = 'faction-info';
      const loy = SL.DATA.LOYALTY[fid];
      info.innerHTML =
        '<div class="faction-name">' + fac.name + (meta.wins[fid] ? ' 👑×' + meta.wins[fid] : '') + '</div>' +
        '<div class="faction-kingdom">' + fac.kingdom + '</div>' +
        '<div class="faction-desc">' + fac.blurb + '<br><b>' + fac.passiveDesc + '</b>' +
        (loy ? '<br>Devoted: <b>' + loy.name + '</b> — ' + loy.desc : '') + '</div>' +
        (unlocked ? '' : '<div class="faction-lock">🔒 ' + fac.unlockHint + '</div>');
      el.appendChild(sw);
      el.appendChild(info);
      if (unlocked) {
        el.addEventListener('click', () => {
          list.querySelectorAll('.faction-card').forEach((c) => c.classList.remove('selected'));
          el.classList.add('selected');
          selectedFaction = fid;
          $('btn-faction-go').disabled = false;
          SL.audio.sfx('click');
        });
      }
      list.appendChild(el);
    }
  }

  // ---------------- map topbar / panel ----------------

  function updateTopbar() {
    const run = SL.conquest.getRun();
    if (!run) return;
    $('tb-gold').textContent = '◉ ' + run.gold;
    $('tb-terr').textContent = '⬢ ' + SL.conquest.playerTerrs().length;
    $('tb-turn').textContent = 'TURN ' + run.turn;
  }

  function showTerritoryPanel(t) {
    const run = SL.conquest.getRun();
    const panel = $('map-panel');
    panel.classList.remove('hidden');
    $('mp-name').textContent = t.name + (t.capitalOf ? ' 👑' : '');
    const ownerName = t.owner === 'player' ? 'YOURS'
      : t.owner === 'neutral' ? 'THE WILDS'
      : SL.DATA.FACTIONS[t.owner].kingdom.toUpperCase();
    $('mp-owner').textContent = ownerName;
    $('mp-owner').style.color = t.owner === 'player' ? '#4da05c' : t.owner === 'neutral' ? '#5a4432' : SL.DATA.FACTIONS[t.owner].dark;

    const bits = [];
    bits.push('Yield ◉' + t.yield + '/turn');
    bits.push('Garrison ' + t.garrison);
    if (t.boon) {
      const b = SL.DATA.BOONS[t.boon];
      bits.push(b.icon + ' ' + b.name + ' — ' + b.desc);
    }
    if (t.native && t.native !== 'neutral') bits.push('Native: ' + SL.DATA.FACTIONS[t.native].name);
    else if (t.native === 'neutral') bits.push('Native: wild species');
    $('mp-detail').textContent = bits.join(' · ');

    const actions = $('mp-actions');
    actions.innerHTML = '';
    if (SL.conquest.attackableByPlayer(t)) {
      const atk = document.createElement('button');
      atk.className = 'action-btn danger';
      atk.textContent = 'ATTACK';
      atk.addEventListener('click', () => confirmModal(
        'ASSAULT ' + t.name.toUpperCase() + '?',
        'Defended by ' + ownerName + ' (garrison ' + t.garrison + '). This is your action for the turn.',
        'ATTACK', () => SL.conquest.playerAttack(t.id)));
      actions.appendChild(atk);
    }
    if (t.owner === 'player') {
      const cost = SL.conquest.fortifyCost(t);
      const f = document.createElement('button');
      f.className = 'action-btn';
      f.textContent = 'FORTIFY ◉' + cost;
      f.addEventListener('click', () => confirmModal(
        'FORTIFY ' + t.name.toUpperCase() + '?',
        'Garrison ' + t.garrison + ' → ' + (t.garrison + 1) + ' for ◉' + cost + '. This is your action for the turn.',
        'FORTIFY', () => SL.conquest.playerFortify(t.id)));
      actions.appendChild(f);
    }
  }

  function hideTerritoryPanel() {
    $('map-panel').classList.add('hidden');
  }

  // ---------------- banners / cards / toasts ----------------

  function turnBanner(text) {
    const el = $('turn-banner');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.add('hidden'), 1500);
  }

  function titleCard(text, sub) {
    const root = $('titlecard-root');
    $('titlecard-text').textContent = text;
    $('titlecard-sub').textContent = sub || '';
    root.classList.remove('hidden');
    clearTimeout(titleCardTimer);
    titleCardTimer = setTimeout(() => root.classList.add('hidden'), 1300);
  }

  function toast(text, grim) {
    const root = $('toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (grim ? ' grim' : '');
    el.textContent = text;
    root.appendChild(el);
    while (root.children.length > 4) root.removeChild(root.firstChild);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 3200);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3700);
  }

  // ---------------- modals ----------------

  function openModal(contentNode, opts) {
    const veil = document.createElement('div');
    veil.className = 'modal-veil';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.appendChild(contentNode);
    veil.appendChild(box);
    $('overlay-root').appendChild(veil);
    modalStack.push(veil);
    if (opts && opts.dismissable) {
      veil.addEventListener('click', (e) => { if (e.target === veil) closeModal(); });
    }
    return veil;
  }

  function closeModal() {
    const veil = modalStack.pop();
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
  }

  function closeAllModals() { while (modalStack.length) closeModal(); }

  function customModal(node, opts) { return openModal(node, opts); }

  function modal(opts) {
    const wrap = document.createElement('div');
    if (opts.title) {
      const t = document.createElement('div');
      t.className = 'modal-title'; t.textContent = opts.title;
      wrap.appendChild(t);
    }
    if (opts.sub) {
      const s = document.createElement('div');
      s.className = 'modal-sub'; s.innerHTML = opts.sub;
      wrap.appendChild(s);
    }
    if (opts.content) wrap.appendChild(opts.content);
    if (opts.buttons && opts.buttons.length) {
      const row = document.createElement('div');
      row.className = 'modal-buttons';
      for (const b of opts.buttons) {
        const btn = document.createElement('button');
        btn.className = b.big ? 'big-btn' : 'small-btn';
        if (b.danger) btn.classList.add('danger');
        btn.textContent = b.label;
        btn.addEventListener('click', () => {
          if (!b.keepOpen) closeModal();
          if (b.cb) b.cb();
        });
        row.appendChild(btn);
      }
      wrap.appendChild(row);
    }
    return openModal(wrap, opts);
  }

  function confirmModal(title, sub, yesLabel, onYes) {
    modal({
      title, sub,
      buttons: [
        { label: 'CANCEL', cb: null },
        { label: yesLabel, big: true, danger: true, cb: onYes },
      ],
    });
  }

  // ---------------- cards ----------------

  function cardEl(cardId) {
    const def = SL.DATA.CARDS[cardId];
    const el = document.createElement('div');
    el.className = 'draft-card' + (def.type === 'tactic' ? ' tactic' : '');
    const cost = document.createElement('div');
    cost.className = 'dc-cost'; cost.textContent = def.cost;
    const art = document.createElement('div');
    art.className = 'dc-art';
    art.appendChild(SL.sprites.thumb(cardId, 64));
    const name = document.createElement('div');
    name.className = 'dc-name'; name.textContent = def.name;
    const tier = document.createElement('div');
    tier.className = 'dc-tier';
    tier.textContent = def.type === 'tactic' ? 'TACTIC' : '★'.repeat(def.tier);
    const stats = document.createElement('div');
    stats.className = 'dc-stats';
    stats.textContent = SL.DATA.statLine(def);
    el.appendChild(cost); el.appendChild(art); el.appendChild(name);
    el.appendChild(tier); el.appendChild(stats);
    return el;
  }

  function draftModal(cardIds, opts, cb) {
    const wrap = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'modal-title'; t.textContent = opts.title || 'RECRUIT';
    wrap.appendChild(t);
    if (opts.sub) {
      const s = document.createElement('div');
      s.className = 'modal-sub'; s.textContent = opts.sub;
      wrap.appendChild(s);
    }
    const row = document.createElement('div');
    row.className = 'draft-row';
    cardIds.forEach((id) => {
      const el = cardEl(id);
      el.addEventListener('click', () => { closeModal(); cb(id); });
      row.appendChild(el);
    });
    wrap.appendChild(row);
    const loy = SL.conquest.loyaltyInfo();
    if (loy) {
      const ls = document.createElement('div');
      ls.className = 'modal-sub';
      ls.textContent = 'Brood Loyalty: ' + Math.round(loy.frac * 100) + '% (' + loy.label +
        ') — off-faction recruits dilute it.';
      wrap.appendChild(ls);
    }
    if (opts.skippable) {
      const brow = document.createElement('div');
      brow.className = 'modal-buttons';
      const skip = document.createElement('button');
      skip.className = 'small-btn';
      skip.textContent = opts.skipLabel || 'SKIP';
      skip.addEventListener('click', () => { closeModal(); cb(null); });
      brow.appendChild(skip);
      wrap.appendChild(brow);
    }
    openModal(wrap);
  }

  function defenseModal(opts, cb) {
    modal({
      title: opts.title,
      sub: opts.sub,
      buttons: [
        { label: 'AUTO-RESOLVE', cb: () => cb(false) },
        { label: 'FIGHT!', big: true, danger: true, cb: () => cb(true) },
      ],
    });
  }

  // ---------------- deck viewer ----------------

  function deckViewer(removable, cb) {
    const run = SL.conquest.getRun();
    if (!run) return;
    const wrap = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'modal-title';
    t.textContent = removable ? 'MUSTER OUT ONE' : 'YOUR ARMY (' + run.deck.length + ')';
    wrap.appendChild(t);
    const loy = SL.conquest.loyaltyInfo();
    if (loy) {
      const ls = document.createElement('div');
      ls.className = 'modal-sub';
      ls.innerHTML = 'Brood Loyalty: <b>' + Math.round(loy.frac * 100) + '% — ' + loy.label + '</b>' +
        (loy.tier === 2 ? '<br>' + loy.power.name + ': ' + loy.power.desc
          : loy.tier === 1 ? '<br>Your ' + SL.DATA.FACTIONS[run.faction].name.toLowerCase() + ' get +5% HP and damage. Devoted at 75% unlocks ' + loy.power.name + '.'
          : '<br>Kindred at 50% deck share; Devoted at 75% unlocks ' + loy.power.name + '.');
      wrap.appendChild(ls);
    }
    if (removable) {
      const s = document.createElement('div');
      s.className = 'modal-sub';
      s.textContent = 'Tap a card to remove it from your deck.';
      wrap.appendChild(s);
    }
    const list = document.createElement('div');
    list.className = 'deck-list';

    const counts = {};
    run.deck.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    const ids = Object.keys(counts).sort((a, b) => SL.DATA.CARDS[a].cost - SL.DATA.CARDS[b].cost);
    for (const id of ids) {
      const def = SL.DATA.CARDS[id];
      const chip = document.createElement('div');
      chip.className = 'deck-chip' + (removable ? ' removable' : '');
      chip.innerHTML = '<span class="chip-cost">' + def.cost + '</span> ' + def.name +
        (counts[id] > 1 ? ' ×' + counts[id] : '');
      if (removable) {
        chip.addEventListener('click', () => {
          const idx = run.deck.indexOf(id);
          if (idx >= 0) run.deck.splice(idx, 1);
          closeModal();
          if (cb) cb(id);
        });
      }
      list.appendChild(chip);
    }
    wrap.appendChild(list);

    const brow = document.createElement('div');
    brow.className = 'modal-buttons';
    const close = document.createElement('button');
    close.className = 'small-btn';
    close.textContent = removable ? 'CANCEL' : 'CLOSE';
    close.addEventListener('click', () => { closeModal(); if (removable && cb) cb(null); });
    brow.appendChild(close);
    wrap.appendChild(brow);
    openModal(wrap);
  }

  // ---------------- results ----------------

  function resultsScreen(summary) {
    closeAllModals();
    showScreen('title');
    SL.audio.music(summary.won ? 'victory' : 'defeat');
    SL.audio.sfx(summary.won ? 'fanfare' : 'dirge');
    const fac = SL.DATA.FACTIONS[summary.faction];
    const st = summary.stats;
    const content = document.createElement('div');
    content.className = 'results-stats';
    content.innerHTML =
      '<b>' + fac.kingdom + '</b> · ' + summary.turns + ' turns<br>' +
      'Battles won: <b>' + st.battlesWon + '</b> · lost: <b>' + st.battlesLost + '</b><br>' +
      'Territories taken: <b>' + st.territoriesTaken + '</b><br>' +
      'Kingdoms toppled: <b>' + st.factionsEliminated + '</b> · Gold amassed: <b>' + st.goldEarned + '</b>' +
      (summary.unlockedThisRun.length
        ? '<br><br>🔓 Unlocked: <b>' + summary.unlockedThisRun.map((f) => SL.DATA.FACTIONS[f].kingdom).join(', ') + '</b>'
        : '');
    titleCard(summary.won ? 'KING OF THE GARDEN!' : 'SQUASHED!',
      summary.won ? 'last kingdom standing' : 'the colony falls');
    setTimeout(() => {
      modal({
        title: summary.won ? '👑 KING OF THE GARDEN' : '☠ THE COLONY FALLS',
        content,
        buttons: [
          { label: 'TITLE', cb: () => { SL.audio.music('title'); } },
          { label: 'NEW CAMPAIGN', big: true, cb: () => { buildFactionSelect(); showScreen('faction'); } },
        ],
      });
    }, 1400);
  }

  // ---------------- menu ----------------

  function openMenu() {
    const meta = SL.game.meta;
    modal({
      title: 'PARLEY',
      buttons: [
        { label: 'RESUME', big: true, cb: null },
        { label: 'HOW TO PLAY', cb: () => showScreen('howto') },
        { label: 'SFX: ' + (meta.sfx ? 'ON' : 'OFF'), cb: () => { toggleSfx(); } },
        { label: 'MUSIC: ' + (meta.music ? 'ON' : 'OFF'), cb: () => { toggleMusic(); } },
        { label: 'SAVE & TITLE', cb: () => { showScreen('title'); SL.audio.music('title'); } },
        { label: 'ABANDON RUN', danger: true, cb: () => confirmModal('ABANDON THE CAMPAIGN?', 'Your kingdom will be forgotten. No unlock progress is lost.', 'ABANDON', () => { SL.conquest.abandonRun(); SL.audio.music('title'); }) },
      ],
    });
  }

  function toggleSfx() {
    const meta = SL.game.meta;
    meta.sfx = !meta.sfx;
    SL.audio.setSfx(meta.sfx);
    SL.save.saveMeta(meta);
    refreshTitle();
  }

  function toggleMusic() {
    const meta = SL.game.meta;
    meta.music = !meta.music;
    SL.audio.setMusic(meta.music);
    SL.save.saveMeta(meta);
    refreshTitle();
  }

  // ---------------- wiring ----------------

  function init() {
    $('btn-newrun').addEventListener('click', () => {
      SL.audio.sfx('click');
      const run = SL.save.loadRun();
      if (run) {
        confirmModal('START A NEW CAMPAIGN?', 'Your saved campaign will be abandoned.', 'NEW CAMPAIGN', () => {
          SL.save.clearRun();
          buildFactionSelect();
          showScreen('faction');
        });
      } else {
        buildFactionSelect();
        showScreen('faction');
      }
    });
    $('btn-continue').addEventListener('click', () => {
      const run = SL.save.loadRun();
      if (run) { SL.audio.sfx('click'); SL.conquest.resumeRun(run); }
      else refreshTitle();
    });
    $('btn-howto').addEventListener('click', () => { SL.audio.sfx('click'); showScreen('howto'); });
    $('btn-howto-back').addEventListener('click', () => {
      SL.audio.sfx('click');
      showScreen(SL.conquest.getRun() ? 'map' : 'title');
    });
    $('btn-sfx').addEventListener('click', toggleSfx);
    $('btn-music').addEventListener('click', toggleMusic);

    $('btn-faction-back').addEventListener('click', () => { SL.audio.sfx('click'); showScreen('title'); });
    $('btn-faction-go').addEventListener('click', () => {
      if (!selectedFaction) return;
      SL.audio.sfx('fanfare');
      SL.conquest.startRun(selectedFaction);
    });

    $('btn-deck').addEventListener('click', () => { SL.audio.sfx('click'); deckViewer(false); });
    $('btn-menu').addEventListener('click', () => { SL.audio.sfx('click'); openMenu(); });
    $('btn-shop').addEventListener('click', () => { SL.audio.sfx('click'); SL.shop.open(); });
    $('btn-endturn').addEventListener('click', () => {
      confirmModal('WAIT THIS TURN?', 'Take no action and pocket +2 gold. Your rivals will still move.', 'WAIT', () => SL.conquest.playerWait());
    });

    $('btn-forfeit').addEventListener('click', () => {
      confirmModal('FORFEIT THE BATTLE?', 'Your forces retreat. This counts as a loss.', 'FORFEIT', () => SL.battle.forfeit());
    });
  }

  SL.ui = {
    init, showScreen, refreshTitle, buildFactionSelect,
    updateTopbar, showTerritoryPanel, hideTerritoryPanel,
    turnBanner, titleCard, toast,
    modal, customModal, closeModal, closeAllModals, confirmModal,
    cardEl, draftModal, defenseModal, deckViewer, resultsScreen,
  };
})();

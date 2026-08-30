// SWARMLORDS — DOM UI: screens, modals, drafts, toasts, title cards.
window.SL = window.SL || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const modalStack = [];
  let titleCardTimer = null;
  let bannerTimer = null;

  // ---------------- screens ----------------

  const DOM_SCREENS = { title: 'screen-title', faction: 'screen-faction', howto: 'screen-howto', shop: 'screen-shop' };

  function showScreen(name) {
    SL.game.screen = name;
    for (const key in DOM_SCREENS) {
      $(DOM_SCREENS[key]).classList.toggle('hidden', key !== name);
    }
    $('map-ui').classList.toggle('hidden', name !== 'map');
    $('battle-ui').classList.toggle('hidden', name !== 'battle');
    if (name === 'title') refreshTitle();
    if (name === 'map') {
      updateTopbar(); hideTerritoryPanel();
      const cv = document.getElementById('game-canvas');
      if (cv && SL.conquest.getRun()) {
        const r = cv.getBoundingClientRect();
        if (r.width) SL.conquest.centerOnCapital(r.width, r.height);
      }
    }
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
      // one per kingdom, chosen for punchy colour separation at parade size
      ['ant_soldier', 'wasp_drone', 'btl_ladybird', 'man_orchid',
       'mot_deathshead', 'ter_snapjaw'].forEach((id) => {
        wrap.appendChild(SL.sprites.makeMarchingBug(id, 84));
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


  // Ask for the wordmark by path so a slow load cannot freeze the fallback
  // in. onerror is the only thing that decides the art is genuinely absent.
  function wordmarkEl(fid, fallbackText, cls) {
    const img = document.createElement('img');
    img.className = 'faction-word';
    img.alt = fallbackText;
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.textContent = fallbackText;
      if (img.parentNode) {
        img.parentNode.classList.remove('has-word');
        img.parentNode.replaceChild(span, img);
      }
    });
    img.src = 'assets/sprites/wordmark_' + fid + '.png';
    if (cls) img.classList.add(cls);
    return img;
  }



  // Three of the kingdom's own creatures say more about it than any blurb.
  // Cheap ones first: they read as the faction's rank and file.
  function factionRoster(fid, n) {
    return Object.keys(SL.DATA.CARDS)
      .filter((id) => {
        const d = SL.DATA.CARDS[id];
        return d.type === 'unit' && d.faction === fid;
      })
      .sort((a, b) => SL.DATA.CARDS[a].cost - SL.DATA.CARDS[b].cost)
      .slice(0, n);
  }

  function rosterStrip(fid, n, cls) {
    const strip = document.createElement('div');
    strip.className = cls;
    factionRoster(fid, n).forEach((id) => {
      const slot = document.createElement('div');
      slot.className = 'fc-thumb';
      slot.appendChild(SL.sprites.thumb(id, 96));
      strip.appendChild(slot);
    });
    return strip;
  }

  function letterButton(id, word, text) {
    const b = $(id);
    if (!b) return;
    const img = document.createElement('img');
    img.className = 'btn-word';
    img.alt = text;
    img.addEventListener('error', () => { b.textContent = text; });
    img.src = 'assets/sprites/' + word + '.png';
    b.textContent = '';
    b.appendChild(img);
  }

  function buildFactionSelect() {
    const list = $('faction-list');
    list.innerHTML = '';
    selectedFaction = null;
    $('btn-faction-go').disabled = true;
    const meta = SL.game.meta;
    let first = null, firstUnlocked = null;
    for (const fid of SL.DATA.FACTION_ORDER) {
      const fac = SL.DATA.FACTIONS[fid];
      const unlocked = meta.unlocked.includes(fid);
      const el = document.createElement('div');
      el.className = 'faction-card' + (unlocked ? '' : ' locked');
      const sw = document.createElement('div');
      sw.className = 'faction-swatch';
      sw.style.background = fac.color;
      const emblem = SL.sprites.sheet('emblem_' + fid);
      if (emblem) {
        const em = document.createElement('img');
        em.src = emblem.src;
        em.width = 46; em.height = 46;
        sw.appendChild(em);
      } else {
        const starter = { ants: 'ant_soldier', wasps: 'wasp_drone', beetles: 'btl_ladybird', mantids: 'man_orchid', termites: 'ter_snapjaw', moths: 'mot_deathshead' }[fid];
        sw.appendChild(SL.sprites.makeMarchingBug(starter, 46));
      }
      // The placard is a nameplate: emblem, painted name, subtitle. Anything
      // that needs room to read goes in the detail panel, because fitting a
      // blurb, a passive, a Devoted power and an unlock hint inside one
      // placard is what pushed the copy onto the bark border.
      const crown = SL.sprites.sheet('map_crown');
      const wins = meta.wins[fid]
        ? (crown
            ? '<span class="win-crown" style="background-image:url(' + crown.src + ')"></span>\u00d7' + meta.wins[fid]
            : '<span class="win-tally">\u00d7' + meta.wins[fid] + '</span>')
        : '';

      // the kingdom's colour, washed over the timber so no two plates read
      // as the same piece of wood
      el.style.setProperty('--fc', fac.color);
      const wash = document.createElement('div');
      wash.className = 'fc-wash';
      el.appendChild(wash);

      const head = document.createElement('div');
      head.className = 'fc-head';
      head.appendChild(sw);
      const titles = document.createElement('div');
      titles.className = 'fc-titles';
      const nameEl = document.createElement('div');
      nameEl.className = 'faction-name has-word';
      nameEl.appendChild(wordmarkEl(fid, fac.name));
      if (wins) {
        const w = document.createElement('span');
        w.innerHTML = wins;
        nameEl.appendChild(w);
      }
      titles.appendChild(nameEl);
      const sub = document.createElement('div');
      sub.className = 'faction-kingdom';
      sub.textContent = fac.kingdom;
      titles.appendChild(sub);
      head.appendChild(titles);

      el.appendChild(head);
      el.appendChild(rosterStrip(fid, 3, 'fc-roster'));

      // Locked kingdoms preview too -- seeing what a kingdom does is the
      // reason to go and unlock it.
      el.addEventListener('click', () => {
        list.querySelectorAll('.faction-card').forEach((c) => c.classList.remove('selected'));
        el.classList.add('selected');
        showFactionDetail(fid, unlocked);
        if (unlocked) {
          selectedFaction = fid;
          $('btn-faction-go').disabled = false;
        }
        SL.audio.sfx('click');
      });
      if (!first || (unlocked && !firstUnlocked)) {
        first = first || el;
        if (unlocked && !firstUnlocked) firstUnlocked = { el, fid };
      }
      list.appendChild(el);
    }
    // never show an empty panel: open on the first kingdom the player owns
    const boot = firstUnlocked || (first && { el: first, fid: SL.DATA.FACTION_ORDER[0] });
    if (boot) boot.el.click();
  }

  // ---------------- map topbar / panel ----------------

  // Gold readout: the painted coin when available, else the text glyph.
  // big=true swaps in the coin stack for larger sums.
  function coinHTML(n, big) {
    if (big && SL.sprites.hasSheet('ui_coin_stack')) return '<span class="ui-coin stack"></span> ' + n;
    if (SL.sprites.hasSheet('ui_coin')) return '<span class="ui-coin"></span> ' + n;
    return n + ' gold';
  }

  function updateTopbar() {
    const run = SL.conquest.getRun();
    if (!run) return;
    $('btn-endturn').innerHTML = 'WAIT ' + coinHTML(2);
    $('tb-gold').innerHTML = coinHTML(run.gold, run.gold >= 20);
    if (SL.sprites.hasSheet('ui_icons')) {
      $('tb-terr').innerHTML = '<span class="ui-ic ui-ic-terr"></span> ' + SL.conquest.playerTerrs().length;
      $('btn-deck').innerHTML = '<span class="ui-ic ui-ic-deck"></span> DECK';
    } else {
      $('tb-terr').textContent = '⬢ ' + SL.conquest.playerTerrs().length;
    }
    $('tb-turn').innerHTML = (SL.sprites.hasSheet('hud_turn')
      ? '<span class="hud-ic hud-ic-turn"></span> ' : '') + 'TURN ' + run.turn;
  }

  function showTerritoryPanel(t) {
    const run = SL.conquest.getRun();
    const panel = $('map-panel');
    panel.classList.remove('hidden');
    // the capital mark is painted on the map, so match it here
    const mpName = $('mp-name');
    mpName.textContent = t.name;
    if (t.capitalOf) {
      const capCrown = SL.sprites.sheet('map_crown');
      const mark = document.createElement('span');
      if (capCrown) {
        mark.className = 'mp-crown';
        mark.style.backgroundImage = 'url(' + capCrown.src + ')';
      } else {
        mark.className = 'mp-cap';
        mark.textContent = 'CAPITAL';
      }
      mpName.appendChild(mark);
    }
    const ownerName = t.owner === 'player' ? 'YOURS'
      : t.owner === 'neutral' ? 'THE WILDS'
      : SL.DATA.FACTIONS[t.owner].kingdom.toUpperCase();
    $('mp-owner').textContent = ownerName;
    $('mp-owner').style.color = t.owner === 'player' ? '#4da05c' : t.owner === 'neutral' ? '#5a4432' : SL.DATA.FACTIONS[t.owner].dark;

    const bits = [];
    bits.push('Yield ' + t.yield + '/turn');
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
      const maxed = t.garrison >= 6;
      const f = document.createElement('button');
      f.className = 'action-btn';
      f.innerHTML = maxed ? 'GARRISON FULL' : 'FORTIFY ' + coinHTML(cost);
      f.disabled = maxed || run.gold < cost;
      if (!f.disabled) {
        f.addEventListener('click', () => confirmModal(
          'FORTIFY ' + t.name.toUpperCase() + '?',
          'Garrison ' + t.garrison + ' to ' + (t.garrison + 1) + ' for '
            + cost + ' gold. This is your action for the turn.',
          'FORTIFY', () => SL.conquest.playerFortify(t.id)));
      }
      actions.appendChild(f);
    }

    // explain why nothing is on offer, so the map's reach stays legible
    if (!actions.children.length) {
      const why = document.createElement('div');
      why.className = 'mp-why';
      why.textContent = t.owner === 'player'
        ? 'Held and quiet. Nothing to do here this turn.'
        : 'Out of reach — you can only attack territories bordering your own.';
      actions.appendChild(why);
    } else if (t.owner === 'player' && actions.firstChild.disabled) {
      const why = document.createElement('div');
      why.className = 'mp-why';
      why.textContent = t.garrison >= 6 ? 'This garrison is at its maximum.' : 'Not enough gold to fortify.';
      actions.appendChild(why);
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

  // the big moments have lettered art where it exists; anything dynamic
  // (a territory name in the stakes line) stays as type
  const WORD_ART = {
    'SPLAT!': 'word_splat',
    'VICTORY!': 'word_victory',
    'SQUASHED!': 'word_squashed',
    'UNLOCKED!': 'word_unlocked',
  };

  function titleCard(text, sub) {
    const root = $('titlecard-root');
    const el = $('titlecard-text');
    const art = WORD_ART[text] && SL.sprites.sheet(WORD_ART[text]);
    if (art) {
      el.textContent = '';
      el.style.backgroundImage = 'url(' + art.src + ')';
      el.classList.add('word-art');
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('word-art');
    }
    $('titlecard-text').textContent = art ? '' : text;
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
    if (opts && opts.className) box.classList.add(opts.className);
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
    // named so a panel can lay its body out against its own box
    wrap.className = 'modal-body';
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

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }


  // Compact role tags. The long stat sentence never fit inside a frame's
  // window; these do, and they answer the questions that decide a play:
  // can it fly, can it hit fliers, does it outrange me, is it armoured.
  function roleTags(def) {
    const t = [];
    if (def.type === 'tactic') return ['TACTIC'];
    if (def.fly) t.push(def.traits.strafe ? 'FLY+' : 'FLY');
    if (def.range > 0) t.push('RNG');
    if (def.air && !def.fly) t.push('AIR');
    if (def.armor > 0) t.push('ARM');
    if (def.traits.swarm) t.push('x' + def.traits.swarm);
    if (def.traits.splash) t.push('SPL');
    if (def.traits.healer) t.push('MEND');
    if (def.traits.slow) t.push('SLOW');
    if (def.traits.dodge) t.push('DODGE');
    return t.slice(0, 3);
  }

  // size: 'hand' | 'large'. cost may differ from def.cost under loyalty.
  function buildCard(cardId, opts) {
    const o = opts || {};
    const def = SL.DATA.CARDS[cardId];
    const fac = SL.DATA.FACTIONS[def.faction] || SL.DATA.FACTIONS.neutral;
    const large = o.size === 'large';
    const cost = o.cost === undefined ? def.cost : o.cost;

    const el = document.createElement(large ? 'div' : 'button');
    el.className = 'card ' + (large ? 'card--large' : 'card--hand')
      + ' f-' + def.faction + (def.type === 'tactic' ? ' tactic' : '');
    el.style.setProperty('--fc', fac.color);
    el.style.setProperty('--fc-soft', hexA(fac.color, 0.26));

    const win = document.createElement('div');
    win.className = 'card-win';

    const art = document.createElement('div');
    art.className = 'card-art';
    art.appendChild(SL.sprites.thumb(cardId, large ? 76 : 52));

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = def.name;

    const costEl = document.createElement('div');
    costEl.className = 'card-cost' + (cost < def.cost ? ' discount' : '');
    costEl.textContent = cost;

    win.appendChild(art);
    win.appendChild(name);

    const tags = roleTags(def);
    // The row is always present on a large card, empty or not: a card that
    // simply omitted it sat 16px taller in the body, so a draft of three
    // showed its name plates on three different lines.
    if (tags.length || large) {
      const row = document.createElement('div');
      row.className = 'card-tags';
      tags.forEach((t) => {
        const b = document.createElement('span');
        b.className = 'card-tag';
        b.textContent = t;
        row.appendChild(b);
      });
      win.appendChild(row);
    }

    if (large && def.type === 'unit') {
      const st = document.createElement('div');
      st.className = 'card-stats';
      st.innerHTML = '<b>' + def.hp + '</b> hp &nbsp; <b>' + def.dmg + '</b> dmg'
        + (def.hiveDmg > 2 ? ' &nbsp; <b>' + def.hiveDmg + '</b> hive' : '');
      win.appendChild(st);
    }
    if (large && def.type === 'tactic') {
      const st = document.createElement('div');
      st.className = 'card-stats card-desc';
      st.textContent = def.desc;
      win.appendChild(st);
    }

    el.appendChild(win);
    el.appendChild(costEl);
    if (large) {
      const tier = document.createElement('div');
      tier.className = 'card-tier';
      tier.textContent = def.type === 'tactic' ? '\u25c6' : '\u2605'.repeat(def.tier);
      el.appendChild(tier);
    }
    el._costEl = costEl;
    el._def = def;
    return el;
  }

  function cardEl(cardId) {
    return buildCard(cardId, { size: 'large' });
  }


  // The panel is the only place a kingdom is described at length, so it can
  // afford full sentences without crowding anything.
  function showFactionDetail(fid, unlocked) {
    const host = $('faction-detail');
    if (!host) return;
    const fac = SL.DATA.FACTIONS[fid];
    const loy = SL.DATA.LOYALTY[fid];
    host.className = 'faction-detail f-' + fid + (unlocked ? '' : ' is-locked');
    host.innerHTML =
      '<div class="fd-name has-word"></div>' +
      '<div class="fd-kingdom">' + fac.kingdom + '</div>' +
      '<div class="fd-blurb">' + fac.blurb + '</div>' +
      '<div class="fd-perk"><span class="fd-tag">PASSIVE</span> ' + fac.passiveDesc + '</div>' +
      (loy ? '<div class="fd-perk"><span class="fd-tag">DEVOTED</span> <b>' + loy.name
        + '</b> — ' + loy.desc + '</div>' : '') +
      (unlocked ? '' : '<div class="fd-lock"><span class="lock-tag">LOCKED</span> '
        + fac.unlockHint + '</div>');
    host.querySelector('.fd-name').appendChild(wordmarkEl(fid, fac.name));
    host.style.setProperty('--fc', fac.color);
    host.appendChild(rosterStrip(fid, 4, 'fd-roster'));
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
        ? '<br><br><span class="unlock-tag">UNLOCKED</span> <b>' + summary.unlockedThisRun.map((f) => SL.DATA.FACTIONS[f].kingdom).join(', ') + '</b>'
        : '');
    titleCard(summary.won ? 'KING OF THE GARDEN!' : 'SQUASHED!',
      summary.won ? 'last kingdom standing' : 'the colony falls');
    setTimeout(() => {
      modal({
        className: summary.won ? 'results-victory' : 'results-defeat',
        title: summary.won ? 'KING OF THE GARDEN' : 'THE COLONY FALLS',
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

    // The button labels are painted words. Doing this with a background on a
    // pseudo-element meant guessing at box sizes -- font-size:0 collapsed the
    // content box and the art went with it. A real img is measured by the
    // browser, keeps the plate's proportions, and falls back to the label
    // only if the file genuinely is not there.
    letterButton('btn-faction-back', 'word_back', 'BACK');
    letterButton('btn-faction-go', 'word_towar', 'TO WAR');
    $('btn-faction-back').addEventListener('click', () => { SL.audio.sfx('click'); showScreen('title'); });
    $('btn-faction-go').addEventListener('click', () => {
      if (!selectedFaction) return;
      SL.audio.sfx('fanfare');
      SL.conquest.startRun(selectedFaction);
    });

    if (SL.sprites.hasSheet('hud_home')) $('btn-home').innerHTML = '<span class="hud-ic hud-ic-home"></span>';
    if (SL.sprites.hasSheet('hud_menu')) $('btn-menu').innerHTML = '<span class="hud-ic hud-ic-menu"></span>';
    $('btn-home').addEventListener('click', () => {
      SL.audio.sfx('click');
      const cv = $('game-canvas');
      const r = cv.getBoundingClientRect();
      SL.conquest.centerOnCapital(r.width, r.height);
    });
    $('btn-deck').addEventListener('click', () => { SL.audio.sfx('click'); deckViewer(false); });
    $('btn-menu').addEventListener('click', () => { SL.audio.sfx('click'); openMenu(); });
    $('btn-shop').addEventListener('click', () => { SL.audio.sfx('click'); SL.shop.open(); });
    SL.shop.init();
    $('btn-endturn').addEventListener('click', () => {
      confirmModal('WAIT THIS TURN?', 'Take no action and pocket +2 gold. Your rivals will still move.', 'WAIT', () => SL.conquest.playerWait());
    });

    $('btn-speed').addEventListener('click', () => SL.battle.cycleSpeed());

    $('btn-forfeit').addEventListener('click', () => {
      confirmModal('FORFEIT THE BATTLE?', 'Your forces retreat. This counts as a loss.', 'FORFEIT', () => SL.battle.forfeit());
    });
  }

  SL.ui = {
    init, showScreen, refreshTitle, buildFactionSelect,
    updateTopbar, showTerritoryPanel, hideTerritoryPanel,
    turnBanner, titleCard, toast,
    modal, customModal, closeModal, closeAllModals, confirmModal,
    cardEl, buildCard, roleTags, draftModal, defenseModal, deckViewer,
    resultsScreen, coinHTML,
  };
})();

// SWARMLORDS — the capital shop: tiered species market, roguelike upgrades,
// card removal. Stock rotates every turn; Trade Trail boons discount prices.
window.SL = window.SL || {};

(function () {

  function tierCapFor(run) {
    const held = SL.conquest.playerTerrs().length;
    const G = SL.DATA.TIER_GATE;
    let cap = 1;
    for (const tier of [2, 3, 4]) if (held >= G[tier]) cap = tier;
    return cap;
  }

  // factions whose species the market can stock: yours + natives of held land
  function marketFactions(run) {
    const set = new Set([run.faction]);
    for (const t of SL.conquest.playerTerrs()) {
      if (t.native) set.add(t.native);
    }
    return Array.from(set);
  }

  function restock(run, rng) {
    const cap = tierCapFor(run);
    const facs = marketFactions(run);
    let pool = [];
    for (const f of facs) {
      const cards = f === 'neutral'
        ? SL.DATA.NEUTRAL_POOL.map((id) => SL.DATA.CARDS[id])
        : SL.DATA.cardsOfFaction(f);
      pool = pool.concat(cards.filter((c) => c.tier <= cap));
    }
    const units = [];
    const shuffled = rng.shuffle(pool);
    for (const c of shuffled) {
      if (units.length >= 3) break;
      if (!units.includes(c.id)) units.push(c.id);
    }
    const owned = run.upgrades;
    const upool = rng.shuffle(SL.DATA.UPGRADES.filter((u) => !owned.includes(u.id)));
    run.shopStock = {
      units,
      upgrades: upool.slice(0, 2).map((u) => u.id),
      rerolls: 0,
    };
    run.shopRemovals = run.shopRemovals || 0;
  }

  function halveStock(run) {
    if (!run.shopStock) return;
    run.shopStock.units = run.shopStock.units.slice(0, 1);
    run.shopStock.upgrades = run.shopStock.upgrades.slice(0, 1);
  }

  function discount(run) {
    const boons = SL.conquest.playerBoons();
    return Math.pow(0.8, boons.b_shop || 0);
  }

  function cardPrice(run, cardId) {
    const c = SL.DATA.CARDS[cardId];
    return Math.max(2, Math.round((c.cost * 2 + c.tier * 2) * discount(run)));
  }

  function upgradePrice(run, upgId) {
    const u = SL.DATA.UPGRADES.find((x) => x.id === upgId);
    return Math.max(2, Math.round(u.price * discount(run)));
  }

  function removalPrice(run) {
    return Math.round((5 + (run.shopRemovals || 0) * 2) * discount(run));
  }

  function rerollPrice(run) {
    return 2 + (run.shopStock.rerolls || 0);
  }

  // ---------------- shop UI ----------------

  function open() {
    const run = SL.conquest.getRun();
    if (!run) return;
    if (!run.shopStock) restock(run, SL.makeRng(run.seed ^ run.turn));

    const box = document.createElement('div');

    function rebuild() {
      box.innerHTML = '';

      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = 'THE CAPITAL SHOP';
      box.appendChild(title);

      const loy = SL.conquest.loyaltyInfo();
      const goldLine = document.createElement('div');
      goldLine.className = 'modal-sub';
      goldLine.innerHTML = 'Your treasury: <b>◉ ' + run.gold + '</b> · Species tier ' + tierCapFor(run) + ' available (' + SL.conquest.playerTerrs().length + ' territories held)' +
        (loy ? ' · Loyalty <b>' + Math.round(loy.frac * 100) + '% ' + loy.label + '</b>' : '');
      box.appendChild(goldLine);

      // --- species market ---
      const st1 = document.createElement('div');
      st1.className = 'shop-section-title';
      st1.textContent = 'SPECIES MARKET';
      box.appendChild(st1);

      const row = document.createElement('div');
      row.className = 'draft-row';
      if (!run.shopStock.units.length) {
        const empty = document.createElement('div');
        empty.className = 'modal-sub';
        empty.textContent = 'Sold out this turn.';
        row.appendChild(empty);
      }
      run.shopStock.units.forEach((cardId) => {
        const price = cardPrice(run, cardId);
        const el = SL.ui.cardEl(cardId);
        const priceTag = document.createElement('div');
        priceTag.className = 'shop-item-price' + (run.gold < price ? ' cant' : '');
        priceTag.textContent = '◉ ' + price;
        el.appendChild(priceTag);
        el.addEventListener('click', () => {
          if (run.gold < price) { SL.ui.toast('Not enough gold.', true); return; }
          run.gold -= price;
          run.deck.push(cardId);
          run.shopStock.units = run.shopStock.units.filter((id2, i2) =>
            !(id2 === cardId && i2 === run.shopStock.units.indexOf(cardId)));
          SL.audio.sfx('coin');
          SL.ui.toast(SL.DATA.CARDS[cardId].name + ' joins your army.');
          SL.save.saveRun(run);
          SL.ui.updateTopbar();
          rebuild();
        });
        row.appendChild(el);
      });
      box.appendChild(row);

      const rr = document.createElement('div');
      rr.className = 'modal-buttons';
      const rrBtn = document.createElement('button');
      rrBtn.className = 'small-btn';
      rrBtn.textContent = 'REROLL STOCK ◉ ' + rerollPrice(run);
      rrBtn.addEventListener('click', () => {
        const p = rerollPrice(run);
        if (run.gold < p) { SL.ui.toast('Not enough gold.', true); return; }
        run.gold -= p;
        const prevRerolls = (run.shopStock.rerolls || 0) + 1;
        restock(run, SL.makeRng((run.seed ^ (run.turn * 31) ^ (prevRerolls * 977)) >>> 0));
        run.shopStock.rerolls = prevRerolls;
        SL.audio.sfx('click');
        SL.save.saveRun(run);
        SL.ui.updateTopbar();
        rebuild();
      });
      rr.appendChild(rrBtn);
      box.appendChild(rr);

      // --- upgrades ---
      const st2 = document.createElement('div');
      st2.className = 'shop-section-title';
      st2.textContent = 'COLONY UPGRADES';
      box.appendChild(st2);

      const urow = document.createElement('div');
      urow.className = 'shop-row';
      if (!run.shopStock.upgrades.length) {
        const empty = document.createElement('div');
        empty.className = 'modal-sub';
        empty.textContent = 'Nothing on offer this turn.';
        urow.appendChild(empty);
      }
      run.shopStock.upgrades.forEach((upgId) => {
        const u = SL.DATA.UPGRADES.find((x) => x.id === upgId);
        const price = upgradePrice(run, upgId);
        const el = document.createElement('div');
        el.className = 'upg-card';
        el.innerHTML = '<div class="upg-name">' + u.name + '</div><div class="upg-desc">' + u.desc + '</div>';
        const priceTag = document.createElement('div');
        priceTag.className = 'shop-item-price' + (run.gold < price ? ' cant' : '');
        priceTag.textContent = '◉ ' + price;
        el.appendChild(priceTag);
        el.addEventListener('click', () => {
          if (run.gold < price) { SL.ui.toast('Not enough gold.', true); return; }
          run.gold -= price;
          run.upgrades.push(upgId);
          run.shopStock.upgrades = run.shopStock.upgrades.filter((id2) => id2 !== upgId);
          SL.audio.sfx('fanfare');
          SL.ui.toast(u.name + ' — active for the whole campaign!');
          SL.save.saveRun(run);
          SL.ui.updateTopbar();
          rebuild();
        });
        urow.appendChild(el);
      });
      box.appendChild(urow);

      // --- removal ---
      const st3 = document.createElement('div');
      st3.className = 'shop-section-title';
      st3.textContent = 'MUSTER OUT';
      box.appendChild(st3);

      const remRow = document.createElement('div');
      remRow.className = 'modal-buttons';
      const remBtn = document.createElement('button');
      remBtn.className = 'small-btn';
      remBtn.textContent = 'REMOVE A CARD ◉ ' + removalPrice(run);
      remBtn.addEventListener('click', () => {
        const p = removalPrice(run);
        if (run.gold < p) { SL.ui.toast('Not enough gold.', true); return; }
        if (run.deck.length <= 8) { SL.ui.toast('Your army is already at minimum size (8).', true); return; }
        SL.ui.deckViewer(true, (removedId) => {
          if (removedId) {
            run.gold -= p;
            run.shopRemovals = (run.shopRemovals || 0) + 1;
            SL.audio.sfx('splat');
            SL.ui.toast(SL.DATA.CARDS[removedId].name + ' mustered out.');
            SL.save.saveRun(run);
            SL.ui.updateTopbar();
          }
          rebuild();
        });
      });
      remRow.appendChild(remBtn);
      box.appendChild(remRow);

      // --- close ---
      const closeRow = document.createElement('div');
      closeRow.className = 'modal-buttons';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'big-btn';
      closeBtn.textContent = 'DONE';
      closeBtn.addEventListener('click', () => SL.ui.closeModal());
      closeRow.appendChild(closeBtn);
      box.appendChild(closeRow);
    }

    rebuild();
    SL.ui.customModal(box);
  }

  SL.shop = { restock, halveStock, open, cardPrice, removalPrice };
})();

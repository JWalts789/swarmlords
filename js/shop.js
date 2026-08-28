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

  // ---------------- shop UI (dedicated screen) ----------------

  const $ = (id) => document.getElementById(id);

  function open() {
    const run = SL.conquest.getRun();
    if (!run) return;
    if (!run.shopStock) restock(run, SL.makeRng(run.seed ^ run.turn));
    SL.ui.showScreen('shop');
    render();
  }

  function close() {
    SL.ui.showScreen('map');
    SL.ui.updateTopbar();
  }

  function render() {
    const run = SL.conquest.getRun();
    if (!run) return;
    const loy = SL.conquest.loyaltyInfo();

    $('shop-stats').innerHTML =
      'Treasury <b>◉ ' + run.gold + '</b> · Tier <b>' + tierCapFor(run) +
      '</b> unlocked (' + SL.conquest.playerTerrs().length + ' territories)' +
      (loy ? ' · Loyalty <b>' + Math.round(loy.frac * 100) + '% ' + loy.label + '</b>' : '');

    // --- species market ---
    const market = $('shop-market');
    market.innerHTML = '';
    if (!run.shopStock.units.length) {
      const e = document.createElement('div');
      e.className = 'shop-empty';
      e.textContent = 'Sold out this turn. Reroll or come back next turn.';
      market.appendChild(e);
    }
    run.shopStock.units.forEach((cardId, slot) => {
      const price = cardPrice(run, cardId);
      const el = SL.ui.cardEl(cardId);
      const tag = document.createElement('div');
      tag.className = 'shop-item-price' + (run.gold < price ? ' cant' : '');
      tag.textContent = '◉ ' + price;
      el.appendChild(tag);
      el.addEventListener('click', () => {
        if (run.gold < price) { SL.ui.toast('Not enough gold.', true); return; }
        run.gold -= price;
        run.deck.push(cardId);
        run.shopStock.units.splice(slot, 1);
        SL.audio.sfx('coin');
        SL.ui.toast(SL.DATA.CARDS[cardId].name + ' joins your army.');
        SL.save.saveRun(run);
        render();
      });
      market.appendChild(el);
    });

    const rrBtn = $('btn-shop-reroll');
    rrBtn.textContent = 'REROLL ◉' + rerollPrice(run);
    rrBtn.disabled = run.gold < rerollPrice(run);

    // --- upgrades ---
    const urow = $('shop-upgrades');
    urow.innerHTML = '';
    if (!run.shopStock.upgrades.length) {
      const e = document.createElement('div');
      e.className = 'shop-empty';
      e.textContent = 'Nothing on offer this turn.';
      urow.appendChild(e);
    }
    run.shopStock.upgrades.forEach((upgId) => {
      const u = SL.DATA.UPGRADES.find((x) => x.id === upgId);
      const price = upgradePrice(run, upgId);
      const el = document.createElement('div');
      el.className = 'upg-card';
      el.innerHTML = '<div class="upg-name">' + u.name + '</div><div class="upg-desc">' + u.desc + '</div>';
      const tag = document.createElement('div');
      tag.className = 'shop-item-price' + (run.gold < price ? ' cant' : '');
      tag.textContent = '◉ ' + price;
      el.appendChild(tag);
      el.addEventListener('click', () => {
        if (run.gold < price) { SL.ui.toast('Not enough gold.', true); return; }
        run.gold -= price;
        run.upgrades.push(upgId);
        run.shopStock.upgrades = run.shopStock.upgrades.filter((id2) => id2 !== upgId);
        SL.audio.sfx('fanfare');
        SL.ui.toast(u.name + ' — active for the whole campaign!');
        SL.save.saveRun(run);
        render();
      });
      urow.appendChild(el);
    });

    const remBtn = $('btn-shop-remove');
    remBtn.textContent = 'REMOVE A CARD ◉' + removalPrice(run);
    remBtn.disabled = run.gold < removalPrice(run) || run.deck.length <= 8;
  }

  function init() {
    $('btn-shop-close').addEventListener('click', () => { SL.audio.sfx('click'); close(); });
    $('btn-shop-reroll').addEventListener('click', () => {
      const run = SL.conquest.getRun();
      const p = rerollPrice(run);
      if (run.gold < p) { SL.ui.toast('Not enough gold.', true); return; }
      run.gold -= p;
      const n = (run.shopStock.rerolls || 0) + 1;
      restock(run, SL.makeRng((run.seed ^ (run.turn * 31) ^ (n * 977)) >>> 0));
      run.shopStock.rerolls = n;
      SL.audio.sfx('click');
      SL.save.saveRun(run);
      render();
    });
    $('btn-shop-remove').addEventListener('click', () => {
      const run = SL.conquest.getRun();
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
        }
        render();
      });
    });
  }

  SL.shop = { restock, halveStock, open, close, init, render, cardPrice, removalPrice };
})();

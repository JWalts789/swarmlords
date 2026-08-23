// SWARMLORDS — seeded conquest map generation.
// 4x5 jittered grid -> planar node graph, 4 faction corners, neutral wilds.
window.SL = window.SL || {};

(function () {
  const COLS = 4, ROWS = 5;

  function idx(c, r) { return r * COLS + c; }

  function generate(rng, playerFaction) {
    const D = SL.DATA;

    // rivals: 3 of the 5 factions the player didn't pick
    const others = D.FACTION_ORDER.filter((f) => f !== playerFaction);
    const rivals = rng.shuffle(others).slice(0, 3);

    // --- nodes ---
    const terr = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        terr.push({
          id: idx(c, r), gx: c, gy: r,
          x: (c + 0.5) / COLS + rng.range(-0.055, 0.055),
          y: (r + 0.5) / ROWS + rng.range(-0.04, 0.04),
          name: '', owner: 'neutral', native: 'neutral', capitalOf: null,
          yield: rng.int(1, 3),
          boon: null, garrison: 1, adj: [],
        });
      }
    }

    // --- edges: orthogonal grid + at most one diagonal per 2x2 quad ---
    const edges = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c + 1 < COLS) edges.push([idx(c, r), idx(c + 1, r)]);
        if (r + 1 < ROWS) edges.push([idx(c, r), idx(c, r + 1)]);
      }
    }
    for (let r = 0; r + 1 < ROWS; r++) {
      for (let c = 0; c + 1 < COLS; c++) {
        if (rng.chance(0.45)) {
          if (rng.chance(0.5)) edges.push([idx(c, r), idx(c + 1, r + 1)]);
          else edges.push([idx(c + 1, r), idx(c, r + 1)]);
        }
      }
    }

    // drop ~22% of edges, keeping the graph connected (union-find)
    const keep = [];
    const shuffled = rng.shuffle(edges);
    const parent = terr.map((_, i) => i);
    function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
    const dropWanted = Math.floor(edges.length * 0.22);
    let dropped = 0;
    // First pass: tentatively mark drops; second: force-keep anything needed for connectivity.
    const maybeDrop = [];
    for (const e of shuffled) {
      if (dropped < dropWanted && rng.chance(0.5)) { maybeDrop.push(e); dropped++; }
      else { keep.push(e); const ra = find(e[0]), rb = find(e[1]); if (ra !== rb) parent[ra] = rb; }
    }
    for (const e of maybeDrop) {
      const ra = find(e[0]), rb = find(e[1]);
      if (ra !== rb) { keep.push(e); parent[ra] = rb; } // needed — keep after all
    }
    for (const [a, b] of keep) {
      if (!terr[a].adj.includes(b)) terr[a].adj.push(b);
      if (!terr[b].adj.includes(a)) terr[b].adj.push(a);
    }

    // --- capitals in corners ---
    const corners = rng.shuffle([idx(0, 0), idx(COLS - 1, 0), idx(0, ROWS - 1), idx(COLS - 1, ROWS - 1)]);
    const playerCap = corners[0];
    const capOwners = [{ owner: 'player', faction: playerFaction, cap: playerCap }];
    rivals.forEach((f, i) => capOwners.push({ owner: f, faction: f, cap: corners[i + 1] }));

    for (const co of capOwners) {
      const t = terr[co.cap];
      t.owner = co.owner;
      t.native = co.faction;
      t.capitalOf = co.owner;
      t.name = D.CAPITAL_NAMES[co.faction];
      t.yield = 4;
      t.garrison = 2;
      t.boon = null;
      // claim up to 2 unowned neighbors
      const free = rng.shuffle(t.adj.filter((n) => terr[n].owner === 'neutral'));
      free.slice(0, 2).forEach((n) => {
        terr[n].owner = co.owner;
        terr[n].native = co.faction;
        terr[n].garrison = 1;
      });
    }

    // --- names, boons, neutral garrisons ---
    const names = rng.shuffle(D.TERR_NAMES.slice());
    let ni = 0;
    const boonKeys = Object.keys(D.BOONS);

    // BFS distance from player capital for difficulty scaling
    const dist = terr.map(() => Infinity);
    dist[playerCap] = 0;
    const q = [playerCap];
    while (q.length) {
      const cur = q.shift();
      for (const n of terr[cur].adj) {
        if (dist[n] === Infinity) { dist[n] = dist[cur] + 1; q.push(n); }
      }
    }

    for (const t of terr) {
      if (!t.name) t.name = names[ni++ % names.length];
      if (!t.capitalOf && rng.chance(0.38)) t.boon = rng.pick(boonKeys);
      if (t.owner === 'neutral') {
        const d = Math.min(6, dist[t.id] === Infinity ? 3 : dist[t.id]);
        t.garrison = Math.max(1, Math.min(4, Math.round(d * 0.6 + rng.range(0, 1.2))));
      }
    }

    return { territories: terr, rivals, playerCapital: playerCap };
  }

  SL.mapgen = { generate, COLS, ROWS };
})();

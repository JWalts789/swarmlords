// SWARMLORDS — seeded RNG (mulberry32) + helpers. Global namespace: SL.
window.SL = window.SL || {};

SL.hashStr = function (s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

SL.makeRng = function (seed) {
  let a = (seed >>> 0) || 1;
  const next = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next: next,
    range: (a2, b) => a2 + next() * (b - a2),
    int: (a2, b) => Math.floor(a2 + next() * (b - a2 + 1)), // inclusive
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const c = arr.slice();
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = c[i]; c[i] = c[j]; c[j] = t;
      }
      return c;
    },
    state: () => a,
  };
};

// Unseeded convenience rng for visuals/UI (never for game state)
SL.vrng = SL.makeRng((Math.random() * 0xffffffff) >>> 0);

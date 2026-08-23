// SWARMLORDS — persistence. meta = across runs; run = current campaign.
window.SL = window.SL || {};

(function () {
  const META_KEY = 'swarmlords_meta_v1';
  const RUN_KEY = 'swarmlords_run_v1';

  function defaultMeta() {
    return {
      unlocked: ['ants'],
      wins: {},          // factionId -> count
      runsPlayed: 0,
      bestTurns: null,   // fastest winning run
      sfx: true,
      music: true,
      seenHowto: false,
    };
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return defaultMeta();
      return Object.assign(defaultMeta(), JSON.parse(raw));
    } catch (e) { return defaultMeta(); }
  }

  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
  }

  function loadRun() {
    try {
      const raw = localStorage.getItem(RUN_KEY);
      if (!raw) return null;
      const run = JSON.parse(raw);
      if (!run || !run.map || !run.deck) return null;
      return run;
    } catch (e) { return null; }
  }

  function saveRun(run) {
    try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch (e) {}
  }

  function clearRun() {
    try { localStorage.removeItem(RUN_KEY); } catch (e) {}
  }

  SL.save = { loadMeta, saveMeta, loadRun, saveRun, clearRun };
})();

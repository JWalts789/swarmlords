// SWARMLORDS — WebAudio SFX synth + auto-loading music.
// Music: drop MP3s into assets/music/ named title.mp3, map.mp3, battle.mp3,
// victory.mp3, defeat.mp3 (see assets/MUSIC_PROMPTS.md). Missing files are
// silently skipped — the game is fully playable without them.
window.SL = window.SL || {};

(function () {
  let ctx = null;
  let sfxOn = true;
  let musicOn = true;
  let currentTrack = null; // {name, el}
  const MUSIC_VOL = 0.5;
  const trackCache = {};   // name -> HTMLAudioElement | 'missing'

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(gain, t0, a, d, peak) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function tone(freq, dur, type, peak, when, bendTo) {
    const c = ensureCtx(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    const t0 = c.currentTime + (when || 0);
    o.frequency.setValueAtTime(freq, t0);
    if (bendTo) o.frequency.exponentialRampToValueAtTime(bendTo, t0 + dur);
    env(g, t0, 0.008, dur, peak || 0.12);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, peak, when, hp) {
    const c = ensureCtx(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain();
    const t0 = c.currentTime + (when || 0);
    env(g, t0, 0.005, dur, peak || 0.1);
    let node = src;
    if (hp) {
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      src.connect(f); node = f;
    }
    node.connect(g); g.connect(c.destination);
    src.start(t0);
  }

  const SFX = {
    click: () => tone(660, 0.06, 'square', 0.07),
    deploy: () => { tone(220, 0.12, 'square', 0.1, 0, 440); noise(0.05, 0.04, 0, 2000); },
    tactic: () => { tone(520, 0.1, 'triangle', 0.1, 0, 780); tone(780, 0.12, 'triangle', 0.08, 0.08, 1040); },
    hit: () => { noise(0.04, 0.06, 0, 1200); tone(140, 0.05, 'square', 0.05); },
    splat: () => { tone(180, 0.16, 'sawtooth', 0.1, 0, 60); noise(0.1, 0.07, 0, 400); },
    chomp: () => { tone(90, 0.18, 'square', 0.16, 0, 45); noise(0.08, 0.08, 0.02, 300); },
    hiveHit: () => { tone(110, 0.3, 'sawtooth', 0.16, 0, 55); tone(165, 0.25, 'square', 0.1, 0.02, 80); },
    coin: () => { tone(880, 0.07, 'square', 0.08); tone(1320, 0.12, 'square', 0.08, 0.07); },
    draft: () => { tone(523, 0.09, 'triangle', 0.1); tone(659, 0.09, 'triangle', 0.1, 0.09); tone(784, 0.14, 'triangle', 0.1, 0.18); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.09, i * 0.11)); },
    lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.09, i * 0.16)); },
    fanfare: () => { [392, 392, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.14, 'square', 0.1, i * 0.12)); },
    dirge: () => { [330, 311, 294, 262].forEach((f, i) => tone(f, 0.34, 'triangle', 0.1, i * 0.3)); },
    alarm: () => { tone(700, 0.1, 'square', 0.09); tone(500, 0.12, 'square', 0.09, 0.12); tone(700, 0.1, 'square', 0.09, 0.26); },
    stomp: () => { tone(70, 0.12, 'square', 0.14, 0, 50); },
    energy: () => tone(1200, 0.04, 'sine', 0.03),
  };

  function sfx(name) {
    if (!sfxOn) return;
    const f = SFX[name];
    if (f) { try { f(); } catch (e) {} }
  }

  // ---------- music ----------
  // Each cue can have several interchangeable tracks; the engine picks one
  // per cue and avoids playing the same variant twice running. Missing
  // files are dropped from the pool the first time they fail to load, so a
  // partial delivery still works.
  const VARIANTS = {
    title:   ['title'],
    map:     ['map1', 'map2', 'map'],
    battle:  ['battle1', 'battle2', 'battle'],
    victory: ['victory'],
    defeat:  ['defeat'],
  };
  const lastPick = {};
  let currentCue = null;
  let probed = false;

  // Ask the server which tracks are actually present, so a cue never picks
  // a file that was not delivered. Names are tried in VARIANTS order, so
  // numbered variants win and the bare legacy name is only a fallback.
  function probeTracks() {
    const names = [];
    Object.keys(VARIANTS).forEach((cue) => {
      VARIANTS[cue].forEach((n) => { if (names.indexOf(n) < 0) names.push(n); });
    });
    let pending = names.length;
    if (!pending || typeof fetch !== 'function') { probed = true; return; }
    const settle = () => {
      if (--pending > 0) return;
      probed = true;
      // if the cue that is meant to be playing never started, start it now
      if (currentCue && (!currentTrack || !currentTrack.el)) {
        const cue = currentCue; currentCue = null; music(cue);
      }
    };
    names.forEach((n) => {
      fetch('assets/music/' + n + '.mp3', { method: 'HEAD' })
        .then((r) => { if (!r.ok) trackCache[n] = 'missing'; })
        .catch(() => {}) // offline or file://: leave unknown, onerror still covers it
        .then(settle, settle);
    });
  }

  function getTrack(name) {
    if (trackCache[name] === 'missing') return null;
    if (trackCache[name]) return trackCache[name];
    const el = new Audio();
    el.loop = true;
    el.preload = 'none';
    el.volume = 0;
    el.src = 'assets/music/' + name + '.mp3';
    el.onerror = () => {
      // MEDIA_ERR_SRC_NOT_SUPPORTED (4) is the only code that means "this
      // file is not usable". NETWORK (2) and DECODE (3) fire for files that
      // are present — blacklisting on those would retire real tracks for the
      // whole session the first time a phone loses signal.
      const code = el.error && el.error.code;
      const gone = code === 4;
      if (gone) trackCache[name] = 'missing';
      if (currentTrack && currentTrack.name === name) {
        currentTrack = null;
        if (gone) {
          // absent source: fall straight to a sibling
          const cue = currentCue;
          currentCue = null;
          if (cue) music(cue);
        }
        // transient: keep the track in the pool and simply stop claiming it
        // is playing, so the next music(cue) call retries it cleanly
      }
    };
    trackCache[name] = el;
    return el;
  }

  function pickVariant(cue) {
    const cands = (VARIANTS[cue] || [cue]).filter((n) => trackCache[n] !== 'missing');
    if (!cands.length) return null;
    // Before probing settles, take the first declared name rather than
    // gambling on one that may not exist.
    if (!probed) return cands[0];
    if (cands.length === 1) return cands[0];
    const pool = cands.filter((n) => n !== lastPick[cue]);
    const from = pool.length ? pool : cands;
    const chosen = from[Math.floor(Math.random() * from.length)];
    lastPick[cue] = chosen;
    return chosen;
  }

  // Each element owns its fade timer. A single shared timer would let the
  // incoming fade cancel the outgoing one, stranding the old track audible.
  function rampTo(el, target, ms, done) {
    if (!el) { if (done) done(); return; }
    if (el._fade) clearInterval(el._fade);
    const from = el.volume;
    const t0 = Date.now();
    el._fade = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      try { el.volume = Math.max(0, Math.min(1, from + (target - from) * k)); } catch (e) {}
      if (k >= 1) { clearInterval(el._fade); el._fade = null; if (done) done(); }
    }, 40);
  }

  function music(cue) {
    // Holding an element for a cue is not the same as that cue sounding:
    // play() can be rejected (autoplay policy) or the OS can pause us on an
    // app switch. If the current cue is merely paused, resume it in place
    // rather than treating the call as redundant.
    if (currentCue === cue && currentTrack && currentTrack.el) {
      const cur = currentTrack.el;
      if (!cur.paused) return;
      if (!musicOn) return;
      const again = cur.play();
      if (again && again.catch) again.catch(() => {});
      rampTo(cur, MUSIC_VOL, 300);
      return;
    }
    currentCue = cue;
    const prev = currentTrack && currentTrack.el;

    if (!musicOn) { stopEl(prev); currentTrack = { name: null, el: null }; return; }

    const name = pickVariant(cue);
    if (!name) { stopEl(prev); currentTrack = null; return; }
    const el = getTrack(name);
    if (!el) { stopEl(prev); currentTrack = null; return; }

    currentTrack = { name, el };
    // fade the outgoing cue down, bring the new one up
    if (prev && prev !== el) rampTo(prev, 0, 380, () => { try { prev.pause(); } catch (e) {} });
    else if (prev === el && !el.paused) return;

    try { el.currentTime = 0; } catch (e) {}
    el.volume = 0;
    const play = el.play();
    if (play && play.catch) play.catch(() => {});
    setTimeout(() => {
      if (currentTrack && currentTrack.el === el) rampTo(el, MUSIC_VOL, 520);
    }, prev && prev !== el ? 300 : 0);
  }

  function stopEl(el) {
    if (!el) return;
    if (el._fade) { clearInterval(el._fade); el._fade = null; }
    try { el.pause(); } catch (e) {}
  }

  function stopMusic() {
    Object.keys(trackCache).forEach((k) => {
      const t = trackCache[k];
      if (t && t !== 'missing') stopEl(t);
    });
    if (currentTrack && currentTrack.el) stopEl(currentTrack.el);
    currentTrack = null;
    currentCue = null;
  }

  function setSfx(on) { sfxOn = on; }

  function setMusic(on) {
    musicOn = on;
    if (!on) {
      Object.keys(trackCache).forEach((k) => {
        const t = trackCache[k];
        if (t && t !== 'missing') stopEl(t);
      });
    } else if (currentCue) {
      const cue = currentCue;
      currentCue = null;
      music(cue);
    }
  }

  // Coming back from an app switch or screen lock leaves the element paused;
  // nudge the current cue so music returns without waiting for a cue change.
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (!musicOn || !currentCue) return;
      const cue = currentCue;
      if (currentTrack && currentTrack.el && currentTrack.el.paused) music(cue);
    });
  }

  probeTracks();

  SL.audio = { sfx, music, stopMusic, setSfx, setMusic, ensureCtx,
    get sfxOn() { return sfxOn; }, get musicOn() { return musicOn; },
    // QA: which track is actually sounding, and which were found on disk
    get nowPlaying() { return currentTrack && currentTrack.name; },
    get missingTracks() {
      return Object.keys(trackCache).filter((k) => trackCache[k] === 'missing');
    } };
})();

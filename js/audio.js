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
  function getTrack(name) {
    if (trackCache[name] === 'missing') return null;
    if (trackCache[name]) return trackCache[name];
    const el = new Audio();
    el.loop = true;
    el.volume = 0.55;
    el.src = 'assets/music/' + name + '.mp3';
    el.onerror = () => { trackCache[name] = 'missing'; if (currentTrack && currentTrack.name === name) currentTrack = null; };
    trackCache[name] = el;
    return el;
  }

  function music(name) {
    if (currentTrack && currentTrack.name === name) return;
    stopMusic();
    if (!musicOn) { currentTrack = { name, el: null }; return; }
    const el = getTrack(name);
    currentTrack = { name, el };
    if (el) { el.currentTime = 0; el.play().catch(() => {}); }
  }

  function stopMusic() {
    if (currentTrack && currentTrack.el) { currentTrack.el.pause(); }
    currentTrack = null;
  }

  function setSfx(on) { sfxOn = on; }
  function setMusic(on) {
    musicOn = on;
    if (!on) { if (currentTrack && currentTrack.el) currentTrack.el.pause(); }
    else if (currentTrack) { const n = currentTrack.name; currentTrack = null; music(n); }
  }

  SL.audio = { sfx, music, stopMusic, setSfx, setMusic, ensureCtx,
    get sfxOn() { return sfxOn; }, get musicOn() { return musicOn; } };
})();

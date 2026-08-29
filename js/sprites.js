// SWARMLORDS — sprite layer.
// Every unit renders as placeholder rubber-hose vector art. On boot we probe
// assets/sprites/<id>_sheet.png for each card (and hive_<faction>.png); any
// sheet that exists replaces the placeholder automatically. No code changes
// per art delivery. Sheet format: 1536x256, six 256px frames:
// frames 0-3 walk cycle, frames 4-5 attack. Bug drawn in profile FACING RIGHT.
window.SL = window.SL || {};

(function () {
  const sheets = {}; // name -> {img, ready}
  const thumbs = {}; // cardId -> canvas

  // Opaque full-screen paintings ship as JPEG: they need no alpha, and as
  // PNG the battlefield set alone was 21MB.
  const JPEG = /^(battle_bg|map_bg)/;

  function probe(name) {
    if (sheets[name]) return;
    const img = new Image();
    const rec = { img, ready: false };
    img.onload = () => { rec.ready = true; };
    img.onerror = () => {};
    img.src = 'assets/sprites/' + name + (JPEG.test(name) ? '.jpg' : '.png');
    sheets[name] = rec;
  }

  function init() {
    Object.keys(SL.DATA.CARDS).forEach((id) => {
      if (SL.DATA.CARDS[id].type === 'unit') probe(id + '_sheet');
      else probe(id + '_icon'); // tactic/spell card art (256x256)
    });
    Object.keys(SL.DATA.FACTIONS).forEach((f) => probe('hive_' + f));
    probe('logo_wordmark');
    // conquest map + UI kit art (all optional, auto-swapped when delivered)
    ['map_bg', 'map_node', 'map_node_capital', 'map_crown',
     'ui_panel', 'ui_icons', 'ui_coin', 'ui_coin_stack', 'ui_boons',
     'ui_nameplate', 'map_crown_fallen', 'battle_bg'].forEach(probe);
    // a battlefield per kingdom, chosen by whose ground is being fought over
    Object.keys(SL.DATA.FACTIONS).forEach((f) => probe('battle_bg_' + f));
    // per-faction territory art, falls back to the generic node when absent
    Object.keys(SL.DATA.FACTIONS).forEach((f) => {
      probe('map_node_' + f);
      probe('map_node_capital_' + f);
      probe('card_frame_' + f);
      probe('emblem_' + f);
      probe('nameplate_' + f);
      probe('wordmark_' + f);
    });
  }

  function sheet(name) {
    const rec = sheets[name];
    return rec && rec.ready ? rec.img : null;
  }

  // ---------- rubber-hose drawing helpers (local coords, bug faces +x) ----------

  function pieEye(ctx, x, y, r, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fdf6e3';
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = r * 0.35;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // pie-cut pupil: filled wedge
    ctx.fillStyle = '#1b120c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.92, ang - 1.1, ang + 1.1);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function noodleLegs(ctx, cx, cy, count, len, phase, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = len * 0.28;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const lx = cx - len * 0.9 + (i * len * 1.1) / Math.max(1, count - 1);
      const sw = Math.sin(phase * 10 + i * 2.1) * len * 0.45;
      ctx.beginPath();
      ctx.moveTo(lx, cy);
      ctx.quadraticCurveTo(lx + sw * 0.4, cy + len * 0.6, lx + sw, cy + len);
      ctx.stroke();
    }
  }

  function wing(ctx, x, y, w, h, flap, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(flap);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(27,18,12,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Draw one bug in local space, facing right, feet near y=+size*0.5.
  // o: {t, state, attackT, color, size}
  function drawBugLocal(ctx, def, o) {
    const art = def.art || {};
    const S = (o.size || 40) * (art.size || 1);
    const col = o.color;
    const dark = shade(col, 0.55);
    const t = o.t || 0;
    const marching = o.state === 'march';
    const fighting = o.state === 'fight' || o.state === 'chomp';
    const bob = marching ? Math.sin(t * 9) * S * 0.06 : Math.sin(t * 3) * S * 0.03;
    const lunge = fighting ? Math.max(0, Math.sin(t * 8)) * S * 0.18 : 0;
    const phase = t;
    const shape = art.shape || 'ant';
    const ink = '#1b120c';

    ctx.save();
    ctx.translate(lunge, bob);

    // squash & stretch
    const sq = 1 + (marching ? Math.sin(t * 9) * 0.05 : 0);
    ctx.scale(1 / sq, sq);

    const flying = def.fly;
    if (flying) {
      const flap = Math.sin(t * 26) * 0.9;
      // wings behind body
      wing(ctx, -S * 0.05, -S * 0.28, S * 0.5, S * 0.9, -0.5 + flap * 0.4, 'rgba(253,246,227,0.8)');
      if (shape === 'moth') {
        wing(ctx, -S * 0.22, -S * 0.2, S * 0.7, S * 1.0, -0.9 + flap * 0.5, col);
      }
    }

    ctx.fillStyle = col;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, S * 0.07);

    if (shape === 'centipede') {
      // segmented noodle
      for (let i = 4; i >= 0; i--) {
        const sx = -i * S * 0.28;
        const sy = Math.sin(phase * 8 + i) * S * 0.06;
        ctx.beginPath();
        ctx.ellipse(sx, sy, S * 0.2, S * 0.17, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? col : shade(col, 0.8);
        ctx.fill(); ctx.stroke();
        noodleLegs(ctx, sx, sy + S * 0.1, 2, S * 0.16, phase + i, ink);
      }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(S * 0.22, 0, S * 0.22, S * 0.2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      pieEye(ctx, S * 0.3, -S * 0.06, S * 0.09, 0.3);
    } else if (shape === 'snail') {
      // shell + foot
      ctx.beginPath(); ctx.ellipse(S * 0.1, S * 0.18, S * 0.45, S * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(col, 0.85); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-S * 0.08, -S * 0.12, S * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-S * 0.08, -S * 0.12, S * 0.18, 0, Math.PI * 2); ctx.stroke();
      // eye stalks
      ctx.lineWidth = S * 0.06;
      ctx.beginPath(); ctx.moveTo(S * 0.4, S * 0.02); ctx.quadraticCurveTo(S * 0.5, -S * 0.3, S * 0.55, -S * 0.35); ctx.stroke();
      pieEye(ctx, S * 0.55, -S * 0.38, S * 0.08, 0.4);
    } else if (shape === 'slug') {
      ctx.beginPath();
      ctx.ellipse(0, S * 0.08, S * 0.42, S * 0.22 + Math.sin(phase * 6) * S * 0.03, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.lineWidth = S * 0.05;
      ctx.beginPath(); ctx.moveTo(S * 0.3, -S * 0.05); ctx.lineTo(S * 0.42, -S * 0.28); ctx.stroke();
      pieEye(ctx, S * 0.44, -S * 0.3, S * 0.07, 0.4);
    } else if (shape === 'pillbug') {
      ctx.beginPath(); ctx.arc(0, 0, S * 0.36, Math.PI, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, 0, S * 0.36 - i * S * 0.09, Math.PI, 0); ctx.stroke();
      }
      noodleLegs(ctx, 0, S * 0.05, 5, S * 0.14, phase, ink);
      pieEye(ctx, S * 0.28, -S * 0.05, S * 0.08, 0.3);
    } else if (shape === 'mound') {
      // static rampart
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-S * 0.5, S * 0.3);
      ctx.quadraticCurveTo(-S * 0.3, -S * 0.5, 0, -S * 0.5);
      ctx.quadraticCurveTo(S * 0.3, -S * 0.5, S * 0.5, S * 0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(-S * 0.12, -S * 0.05, S * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S * 0.14, -S * 0.18, S * 0.05, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'spider') {
      noodleLegs(ctx, -S * 0.05, S * 0.05, 4, S * 0.3, phase, ink);
      ctx.beginPath(); ctx.ellipse(-S * 0.15, -S * 0.05, S * 0.26, S * 0.22, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(S * 0.18, -S * 0.02, S * 0.17, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      pieEye(ctx, S * 0.2, -S * 0.08, S * 0.07, 0.3);
      pieEye(ctx, S * 0.3, -S * 0.04, S * 0.05, 0.3);
    } else {
      // generic insect: abdomen, thorax, head — ant/wasp/beetle/mantis/termite/moth ground
      const long = shape === 'mantis';
      // abdomen
      ctx.beginPath();
      ctx.ellipse(-S * 0.28, 0, S * 0.26, S * (shape === 'beetle' ? 0.26 : 0.18), long ? 0.2 : 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(col, 0.85); ctx.fill(); ctx.stroke();
      if (art.spots) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(-S * 0.34, -S * 0.08, S * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-S * 0.2, S * 0.04, S * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      if (art.dome) {
        ctx.beginPath(); ctx.arc(-S * 0.15, -S * 0.05, S * 0.34, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = shade(col, 1.1); ctx.fill(); ctx.stroke();
      }
      // thorax
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -S * 0.04, S * 0.18, S * 0.15, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // head
      ctx.beginPath(); ctx.arc(S * 0.24, -S * 0.1, S * (art.jaw ? 0.19 : 0.15), 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // mandibles / snout / horn
      ctx.lineWidth = Math.max(2, S * 0.06);
      if (art.snout || art.cannon) {
        ctx.beginPath(); ctx.moveTo(S * 0.34, -S * 0.12);
        ctx.lineTo(S * 0.52, -S * (art.cannon ? 0.2 : 0.12)); ctx.stroke();
      } else if (art.horn || art.horns) {
        ctx.beginPath(); ctx.moveTo(S * 0.3, -S * 0.2);
        ctx.quadraticCurveTo(S * 0.45, -S * 0.42, S * 0.55, -S * 0.3); ctx.stroke();
        if (art.horns) { ctx.beginPath(); ctx.moveTo(S * 0.32, -S * 0.06); ctx.quadraticCurveTo(S * 0.5, -S * 0.1, S * 0.55, -S * 0.02); ctx.stroke(); }
      } else {
        const jawOpen = fighting ? Math.abs(Math.sin(t * 8)) * 0.25 : 0.08;
        ctx.beginPath(); ctx.moveTo(S * 0.34, -S * 0.14);
        ctx.quadraticCurveTo(S * 0.48, -S * (0.14 + jawOpen), S * 0.5, -S * (0.1 + jawOpen)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(S * 0.34, -S * 0.06);
        ctx.quadraticCurveTo(S * 0.48, -S * (0.06 - jawOpen), S * 0.5, -S * (0.1 - jawOpen)); ctx.stroke();
      }
      // mantis scythes
      if (long) {
        const swing = fighting ? Math.sin(t * 8) * 0.5 : 0.15;
        ctx.beginPath(); ctx.moveTo(S * 0.1, -S * 0.1);
        ctx.quadraticCurveTo(S * 0.34, -S * 0.42 - swing * S * 0.2, S * 0.52, -S * 0.28 - swing * S * 0.3);
        ctx.stroke();
      }
      // antennae
      ctx.lineWidth = Math.max(1.5, S * 0.04);
      ctx.beginPath(); ctx.moveTo(S * 0.28, -S * 0.22);
      ctx.quadraticCurveTo(S * 0.34, -S * 0.42, S * 0.46, -S * 0.44); ctx.stroke();
      if (art.hood) {
        ctx.fillStyle = shade(col, 0.7);
        ctx.beginPath(); ctx.arc(S * 0.24, -S * 0.12, S * 0.19, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      }
      // legs (ground bugs)
      if (!flying) noodleLegs(ctx, -S * 0.05, S * 0.12, shape === 'beetle' ? 3 : 3, S * 0.2, phase, ink);
      // eye
      pieEye(ctx, S * 0.27, -S * 0.12, S * (art.mean ? 0.055 : 0.07), 0.35);
      if (art.skull) {
        ctx.fillStyle = '#fdf6e3';
        ctx.beginPath(); ctx.arc(0, -S * 0.08, S * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(-S * 0.025, -S * 0.1, S * 0.02, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(S * 0.025, -S * 0.1, S * 0.02, 0, Math.PI * 2); ctx.fill();
      }
    }

    // front wings on top for non-moth fliers
    if (flying && shape !== 'moth') {
      const flap = Math.sin(t * 26) * 0.9;
      wing(ctx, S * 0.02, -S * 0.3, S * 0.44, S * 0.8, 0.2 + flap * 0.45, 'rgba(253,246,227,0.85)');
    }

    // crown for champions
    if (art.crown) {
      const cy = -S * (shape === 'beetle' ? 0.45 : 0.35);
      ctx.fillStyle = '#e0a51e';
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.5, S * 0.045);
      ctx.beginPath();
      ctx.moveTo(S * 0.12, cy);
      ctx.lineTo(S * 0.14, cy - S * 0.14); ctx.lineTo(S * 0.2, cy - S * 0.06);
      ctx.lineTo(S * 0.26, cy - S * 0.16); ctx.lineTo(S * 0.32, cy - S * 0.06);
      ctx.lineTo(S * 0.38, cy - S * 0.14); ctx.lineTo(S * 0.4, cy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    ctx.restore();
  }

  // ---------- public draw: world space, horizontal lanes (landscape) ----------
  // o: {x, y, side(0=player marching right, 1=enemy marching left), t, state,
  //     color, size, hpFrac, slowed, poisoned}
  // Sprites are drawn facing RIGHT; enemy units mirror horizontally.
  function drawUnit(ctx, def, o) {
    ctx.save();
    ctx.translate(o.x, o.y);

    // shadow
    ctx.fillStyle = 'rgba(27,18,12,0.25)';
    const S = (o.size || 40) * ((def.art && def.art.size) || 1);
    ctx.beginPath();
    ctx.ellipse(0, S * 0.42, S * 0.34, S * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = sheet(def.id + '_sheet');
    if (o.side === 1) ctx.scale(-1, 1); // enemy faces left
    if (img) {
      const fw = 256;
      let frame;
      if (o.state === 'fight' || o.state === 'chomp') {
        // o.atkPhase runs 0->1 across one attack cycle: wind up, then strike
        const ph = o.atkPhase === undefined ? (Math.floor(o.t * 6) % 2) / 2 : o.atkPhase;
        frame = ph < 0.55 ? 4 : 5;
      } else {
        // o.walkPhase advances with real distance travelled, so a snail
        // shuffles and a bullet ant sprints
        const wp = o.walkPhase === undefined ? o.t * 8 : o.walkPhase;
        frame = Math.floor(wp) % 4;
      }
      // sheetScale compensates sheets whose subject is drawn small in-cell
      // (e.g. sluglet: already drawn half-size AND stat-scaled — see data.js)
      // maxH keeps champions and other big art inside their lane band
      let d = S * 1.6 * ((def.art && def.art.sheetScale) || 1);
      if (o.maxH) d = Math.min(d, o.maxH);
      ctx.drawImage(img, frame * fw, 0, fw, fw, -d / 2, -d / 2, d, d);
    } else {
      drawBugLocal(ctx, def, o);
    }
    ctx.restore();

    // status pips + hp sliver (world-aligned)
    if (o.hpFrac !== undefined && o.hpFrac < 1) {
      const w = S * 0.8;
      ctx.fillStyle = 'rgba(27,18,12,0.7)';
      ctx.fillRect(o.x - w / 2, o.y - S * 0.62, w, 3.5);
      ctx.fillStyle = o.hpFrac > 0.4 ? '#4da05c' : '#d84b2a';
      ctx.fillRect(o.x - w / 2, o.y - S * 0.62, w * o.hpFrac, 3.5);
    }
    if (o.slowed) {
      ctx.fillStyle = '#9fc3e8';
      ctx.beginPath(); ctx.arc(o.x - S * 0.4, o.y - S * 0.55, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (o.poisoned) {
      ctx.fillStyle = '#6fbf4a';
      ctx.beginPath(); ctx.arc(o.x + S * 0.4, o.y - S * 0.55, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // hive: o = {x, y, w, side (0 bottom=player), color, hpFrac, t, name}
  function drawHive(ctx, faction, o) {
    const img = sheet('hive_' + faction);
    const h = o.h || 64;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (img) {
      // Landscape: hives stand upright on the field floor at each side.
      // The enemy hive mirrors horizontally so its entrance faces the field.
      const maxH = o.maxH || 80;
      let dw = o.w;
      let dh = dw * (img.height / img.width);
      if (dh > maxH) { dh = maxH; dw = dh * (img.width / img.height); }
      if (o.mirror) ctx.scale(-1, 1);
      // anchor 'center' plants the hive on a lane line rather than the floor
      ctx.drawImage(img, -dw / 2, o.anchor === 'center' ? -dh / 2 : -dh, dw, dh);
      ctx.restore();
      if (o.report) o.report(dw, dh);
      return;
    }
    {
      const col = o.color;
      const ink = '#1b120c';
      // mound
      ctx.fillStyle = col;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-o.w * 0.48, 0);
      ctx.quadraticCurveTo(-o.w * 0.3, -h * 1.15, 0, -h * 1.2);
      ctx.quadraticCurveTo(o.w * 0.3, -h * 1.15, o.w * 0.48, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // stripes
      ctx.strokeStyle = shade(col, 0.6);
      ctx.lineWidth = 2.5;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-o.w * 0.42 * (1 - i * 0.18), -h * 0.28 * i);
        ctx.quadraticCurveTo(0, -h * 0.32 * i - h * 0.12, o.w * 0.42 * (1 - i * 0.18), -h * 0.28 * i);
        ctx.stroke();
      }
      // entrance
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.25, o.w * 0.09, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // little flag
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -h * 1.2); ctx.lineTo(0, -h * 1.55); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -h * 1.55);
      ctx.lineTo(o.w * 0.14, -h * 1.47);
      ctx.lineTo(0, -h * 1.39);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // static thumbnail for cards / drafts / shop
  function thumb(cardId, size) {
    const key = cardId + '_' + size;
    if (thumbs[key]) return thumbs[key].cloneNode ? cloneCanvas(thumbs[key]) : thumbs[key];
    const def = SL.DATA.CARDS[cardId];
    const cv = document.createElement('canvas');
    cv.width = size * 2; cv.height = size * 2; // retina
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    const fac = SL.DATA.FACTIONS[def.faction];
    if (def.type === 'unit') {
      const img = sheet(def.id + '_sheet');
      if (img) {
        ctx.drawImage(img, 0, 0, 256, 256, 2, 2, size - 4, size - 4);
      } else {
        ctx.save();
        ctx.translate(size / 2, size / 2 + size * 0.08);
        drawBugLocal(ctx, def, { t: 0.4, state: 'march', color: fac.color, size: size * 0.62 });
        ctx.restore();
      }
    } else {
      const icon = sheet(def.id + '_icon');
      if (icon) ctx.drawImage(icon, 2, 2, size - 4, size - 4);
      else drawTacticIcon(ctx, def, size, fac.color);
    }
    thumbs[key] = cv;
    return cv;
  }

  function cloneCanvas(cv) {
    const c2 = document.createElement('canvas');
    c2.width = cv.width; c2.height = cv.height;
    c2.style.width = cv.style.width; c2.style.height = cv.style.height;
    c2.getContext('2d').drawImage(cv, 0, 0);
    return c2;
  }

  function drawTacticIcon(ctx, def, size, color) {
    const ink = '#1b120c';
    const cx = size / 2, cy = size / 2;
    ctx.save();
    // scroll background
    ctx.fillStyle = '#efe4f7';
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const icon = (def.art && def.art.icon) || 'star';
    if (icon === 'trail' || icon === 'lunge') {
      ctx.beginPath(); ctx.moveTo(cx - size * 0.18, cy + size * 0.14);
      ctx.lineTo(cx + size * 0.14, cy + size * 0.14);
      ctx.lineTo(cx + size * 0.02, cy + size * 0.02); ctx.moveTo(cx + size * 0.14, cy + size * 0.14);
      ctx.lineTo(cx + size * 0.02, cy + size * 0.26);
      ctx.moveTo(cx - size * 0.18, cy - size * 0.08);
      ctx.lineTo(cx + size * 0.14, cy - size * 0.08);
      ctx.stroke();
    } else if (icon === 'dive' || icon === 'frenzy') {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.12 + i * size * 0.12, cy - size * 0.2);
        ctx.lineTo(cx - size * 0.2 + i * size * 0.12, cy + size * 0.2);
        ctx.stroke();
      }
    } else if (icon === 'shield') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.2);
      ctx.quadraticCurveTo(cx + size * 0.2, cy - size * 0.14, cx + size * 0.16, cy + size * 0.06);
      ctx.quadraticCurveTo(cx + size * 0.1, cy + size * 0.2, cx, cy + size * 0.24);
      ctx.quadraticCurveTo(cx - size * 0.1, cy + size * 0.2, cx - size * 0.16, cy + size * 0.06);
      ctx.quadraticCurveTo(cx - size * 0.2, cy - size * 0.14, cx, cy - size * 0.2);
      ctx.stroke();
    } else if (icon === 'mine') {
      ctx.beginPath(); ctx.arc(cx, cy + size * 0.06, size * 0.14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + size * 0.08, cy - size * 0.06);
      ctx.quadraticCurveTo(cx + size * 0.2, cy - size * 0.22, cx + size * 0.12, cy - size * 0.26); ctx.stroke();
    } else if (icon === 'dust' || icon === 'cocoon') {
      ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.12, size * 0.2, 0.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - size * 0.2, cy - size * 0.16, 2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + size * 0.2, cy - size * 0.08, 2, 0, Math.PI * 2); ctx.stroke();
    } else if (icon === 'tunnel') {
      ctx.beginPath(); ctx.arc(cx, cy + size * 0.1, size * 0.18, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.06); ctx.lineTo(cx, cy - size * 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - size * 0.07, cy - size * 0.1); ctx.lineTo(cx, cy - size * 0.18); ctx.lineTo(cx + size * 0.07, cy - size * 0.1); ctx.stroke();
    } else {
      // star
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const x1 = cx + Math.cos(a) * size * 0.2, y1 = cy + Math.sin(a) * size * 0.2;
        if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(cx + Math.cos(a2) * size * 0.09, cy + Math.sin(a2) * size * 0.09);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  // animated bug canvas for title screen / faction select decoration.
  // Uses the delivered walk cycle (frames 1-4) as soon as the sheet loads;
  // falls back to placeholder vector art until then.
  function makeMarchingBug(cardId, size) {
    const def = SL.DATA.CARDS[cardId];
    const fac = SL.DATA.FACTIONS[def.faction];
    const cv = document.createElement('canvas');
    cv.width = size * 2; cv.height = size * 2;
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    const ctx = cv.getContext('2d');
    let alive = true;
    let frames = 0;
    function tick(ms) {
      // stop once detached (allow a grace period before first attach)
      if (!alive) return;
      if (!cv.isConnected && frames > 90) { alive = false; return; }
      frames++;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const img = sheet(cardId + '_sheet');
      if (img) {
        const f = Math.floor(ms / 130) % 4;
        ctx.drawImage(img, f * 256, 0, 256, 256, 0, 0, cv.width, cv.height);
      } else {
        ctx.save();
        ctx.scale(2, 2);
        ctx.translate(size / 2, size / 2 + size * 0.1);
        drawBugLocal(ctx, def, { t: ms / 1000, state: 'march', color: fac.color, size: size * 0.6 });
        ctx.restore();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return cv;
  }

  function logoSheet() { return sheet('logo_wordmark'); }

  // ---------- projectiles ----------
  // Each ranged unit throws something recognisable rather than a coloured dot.
  const PROJ = {
    acid:   { fill: '#8fbf3f', ink: '#33501a', shape: 'drop',  r: 5.0 },
    pellet: { fill: '#b9a88a', ink: '#4a4033', shape: 'ball',  r: 3.6 },
    glue:   { fill: '#d8b45c', ink: '#6b501c', shape: 'blob',  r: 5.2 },
    web:    { fill: '#f2ecdd', ink: '#5a5348', shape: 'web',   r: 5.4 },
    dust:   { fill: '#b79ad6', ink: '#4b3866', shape: 'puff',  r: 5.6 },
    seed:   { fill: '#c9762f', ink: '#5c3312', shape: 'ball',  r: 4.2 },
  };

  function drawProjectile(ctx, p) {
    const img = p.art && sheet(p.art);
    if (img) {
      const d = (p.r || 5) * 3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.dir < 0 ? Math.PI : 0);
      ctx.drawImage(img, -d / 2, -d / 2, d, d);
      ctx.restore();
      return;
    }
    const k = PROJ[p.kind] || PROJ.pellet;
    const r = k.r;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir < 0 ? -1 : 1, 1);
    // a short trail sells travel far better than a static dot
    ctx.strokeStyle = k.fill;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = r * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 3.2, 0); ctx.lineTo(-r * 0.6, 0); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = k.fill;
    ctx.strokeStyle = k.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (k.shape === 'drop') {
      ctx.moveTo(r * 1.5, 0);
      ctx.quadraticCurveTo(r * 0.2, -r, -r * 0.9, -r * 0.35);
      ctx.quadraticCurveTo(-r * 1.3, 0, -r * 0.9, r * 0.35);
      ctx.quadraticCurveTo(r * 0.2, r, r * 1.5, 0);
    } else if (k.shape === 'blob') {
      ctx.ellipse(0, 0, r * 1.15, r * 0.8, 0.3, 0, Math.PI * 2);
    } else if (k.shape === 'puff') {
      ctx.arc(-r * 0.5, 0, r * 0.62, 0, Math.PI * 2);
      ctx.arc(r * 0.45, -r * 0.28, r * 0.72, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.42, r * 0.55, 0, Math.PI * 2);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (k.shape === 'web') {
      ctx.strokeStyle = k.ink;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  SL.sprites = {
    init, drawUnit, drawHive, thumb, shade, makeMarchingBug, logoSheet,
    drawProjectile,
    hasSheet: (n) => !!sheet(n),
    sheet, // raw access for map/UI art
  };
})();

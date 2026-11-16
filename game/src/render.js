// EMBERFORGE — all drawing: the forge, the HUD and every screen.
// One job: turn state into pixels. No rules here, only presentation.
// Palette and type come from config.js; game HUD labels use short caps
// (the top-10 entries' convention for game screens), body copy is
// sentence case, numbers are tabular monospace.

import {
  BLADE_TYPES, MATERIALS, PAL, FONT_BODY, FONT_DISPLAY, FONT_MONO,
  VIEW_H, VIEW_W,
} from './config.js';
import { upgradeBlurb, upgradeName } from './upgrades.js';
import { easeOutExpo, easeOutQuart } from './fx.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || PAL.panel;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = PAL.hairline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function label(ctx, text, x, y, size, color, align, spacing) {
  ctx.fillStyle = color || PAL.muted;
  ctx.font = `700 ${size}px ${FONT_BODY}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${spacing || 2}px`; } catch { /* older canvas */ }
  ctx.fillText(text, x, y);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

function heading(ctx, text, x, y, size, color, align) {
  ctx.fillStyle = color || PAL.text;
  ctx.font = `900 ${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.max(1, size * 0.06)}px`; } catch { /* older canvas */ }
  ctx.fillText(text, x, y);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

function body(ctx, text, x, y, size, color, align) {
  ctx.fillStyle = color || PAL.text;
  ctx.font = `400 ${size}px ${FONT_BODY}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function mono(ctx, text, x, y, size, color, align) {
  ctx.fillStyle = color || PAL.text;
  ctx.font = `700 ${size}px ${FONT_MONO}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function heatColor(heat) {
  if (heat >= 70) return PAL.whiteHot;
  if (heat >= 45) return PAL.accent;
  if (heat >= 20) return '#d97706';
  return PAL.steel;
}

function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawBackground(ctx, time) {
  // Stone wall.
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PAL.ground2;
  for (let row = 0; row < 7; row++) {
    const y = 64 + row * 52;
    for (let col = -1; col < 14; col++) {
      const x = col * 100 + (row % 2 ? 50 : 0);
      ctx.fillStyle = `rgba(255, 235, 200, ${0.02 + ((row * 7 + col * 3) % 3) * 0.012})`;
      ctx.fillRect(x + 2, y + 2, 96, 48);
    }
  }
  // Wooden beams.
  ctx.fillStyle = '#241a10';
  ctx.fillRect(0, 56, VIEW_W, 10);
  ctx.fillRect(0, 636, VIEW_W, 10);
  // Night window, right wall, above the quench barrel.
  ctx.fillStyle = '#0b1020';
  rr(ctx, 1000, 275, 125, 125, 8);
  ctx.fill();
  ctx.strokeStyle = PAL.hairlineStrong;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  const stars = [[1015, 295], [1055, 320], [1095, 290], [1025, 350], [1085, 360], [1045, 385]];
  for (const [sx, sy] of stars) {
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + sx);
    ctx.globalAlpha = 0.4 + 0.6 * tw;
    ctx.fillRect(sx, sy, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(1090, 310, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#e7e5e4';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1084, 306, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1020';
  ctx.fill();
  // Hearth, left wall, with flickering fire.
  const flick = 0.85 + 0.15 * Math.sin(time * 9) * Math.sin(time * 5.3);
  const glow = ctx.createRadialGradient(150, 420, 10, 150, 420, 260);
  glow.addColorStop(0, `rgba(249, 115, 22, ${0.35 * flick})`);
  glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 180, 420, 480);
  ctx.fillStyle = '#171009';
  rr(ctx, 60, 300, 190, 180, 8);
  ctx.fill();
  ctx.strokeStyle = PAL.hairlineStrong;
  ctx.stroke();
  // Arched fire mouth.
  ctx.fillStyle = '#0a0603';
  ctx.beginPath();
  ctx.moveTo(80, 470);
  ctx.lineTo(80, 380);
  ctx.arc(155, 380, 75, Math.PI, 0);
  ctx.lineTo(230, 470);
  ctx.closePath();
  ctx.fill();
  // Five flames, uneven heights, wobbling.
  for (let i = 0; i < 5; i++) {
    const fh = 34 + 30 * Math.abs(Math.sin(time * 6 + i * 1.7)) * flick;
    const fx0 = 105 + i * 25;
    ctx.fillStyle = i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#eab308' : '#fde68a';
    ctx.beginPath();
    ctx.ellipse(fx0, 470 - fh / 2, 11, fh / 2, Math.sin(time * 4 + i) * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glowing embers at the base + a log.
  ctx.fillStyle = '#f97316';
  for (let i = 0; i < 7; i++) {
    const ex = 100 + i * 18 + Math.sin(time * 3 + i * 2.4) * 2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 5 + i * 1.3);
    ctx.beginPath();
    ctx.arc(ex, 464, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0f0b07';
  ctx.fillRect(80, 460, 150, 14);
  // Floor planks.
  ctx.fillStyle = '#191209';
  ctx.fillRect(0, 646, VIEW_W, 74);
  ctx.strokeStyle = 'rgba(245, 237, 224, 0.06)';
  for (let x = 0; x < VIEW_W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 646);
    ctx.lineTo(x, 720);
    ctx.stroke();
  }
  // Coal pile near the hearth.
  ctx.fillStyle = '#0c0a08';
  for (let i = 0; i < 9; i++) {
    const cx = 300 + (i % 3) * 26;
    const cy = 640 - Math.floor(i / 3) * 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hanging tools on the wall between hearth and anvil.
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(290, 120);
  ctx.lineTo(290, 210);
  ctx.moveTo(320, 120);
  ctx.lineTo(320, 190);
  ctx.stroke();
  ctx.fillStyle = '#4a3823';
  ctx.fillRect(278, 208, 24, 18);
  ctx.fillRect(310, 188, 20, 14);
}

function drawBlade(ctx, x, y, heat, progress, time) {
  // The blade on the anvil: a wooden grip, a steel edge with a fuller
  // ridge, glowing with its heat. The glow shimmers with time.
  const glow = heat / 100;
  ctx.save();
  ctx.translate(x, y);
  // Grip.
  ctx.fillStyle = '#3a2417';
  rr(ctx, -158, -7, 46, 14, 6);
  ctx.fill();
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-160, -7, 5, 14);
  // Blade shape: straight spine, curved edge, pointed tip.
  const g = ctx.createLinearGradient(0, -14, 0, 14);
  g.addColorStop(0, '#9aa5b1');
  g.addColorStop(0.5, '#6b7280');
  g.addColorStop(1, '#4b5563');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-112, -13);
  ctx.lineTo(78, -13);
  ctx.lineTo(118, 0);
  ctx.lineTo(78, 13);
  ctx.lineTo(-112, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Fuller ridge down the middle.
  ctx.strokeStyle = 'rgba(245, 237, 224, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-104, -3);
  ctx.lineTo(84, -3);
  ctx.stroke();
  // Heat wash: the hotter the blade, the brighter the wash, shimmering.
  if (glow > 0.05) {
    const shimmer = 0.45 + 0.2 * Math.sin(time * 7);
    ctx.globalAlpha = Math.min(0.75, glow * shimmer);
    ctx.fillStyle = heatColor(heat);
    ctx.beginPath();
    ctx.moveTo(-112, -13);
    ctx.lineTo(78, -13);
    ctx.lineTo(118, 0);
    ctx.lineTo(78, 13);
    ctx.lineTo(-112, 13);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Progress ticks along the blade.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let i = 1; i <= 9; i++) {
    const px = -100 + i * 20;
    ctx.fillRect(px, -13, 2, i * 10 <= progress ? 26 : 8);
  }
  ctx.restore();
}

function drawAnvil(ctx, x, y) {
  // A bigger anvil: horn on the left, bright top face, waist, base.
  ctx.fillStyle = '#26262b';
  ctx.beginPath();
  ctx.moveTo(x - 95, y - 18);
  ctx.lineTo(x + 95, y - 18);
  ctx.lineTo(x + 70, y + 6);
  ctx.lineTo(x + 34, y + 6);
  ctx.lineTo(x + 26, y + 46);
  ctx.lineTo(x - 26, y + 46);
  ctx.lineTo(x - 34, y + 6);
  ctx.lineTo(x - 70, y + 6);
  ctx.closePath();
  ctx.fill();
  // Horn.
  ctx.beginPath();
  ctx.moveTo(x - 95, y - 18);
  ctx.lineTo(x - 128, y - 4);
  ctx.lineTo(x - 95, y + 6);
  ctx.closePath();
  ctx.fill();
  // Bright top face + hardy hole.
  ctx.fillStyle = '#4a4a52';
  ctx.fillRect(x - 95, y - 22, 190, 8);
  ctx.fillStyle = '#8a8a94';
  ctx.fillRect(x - 95, y - 22, 190, 2);
  ctx.fillStyle = '#17171a';
  ctx.fillRect(x + 62, y - 22, 10, 8);
  ctx.fillStyle = '#17171a';
  ctx.fillRect(x - 70, y + 46, 140, 10);
}

function drawRing(ctx, x, y, angle, zoneCenter, perfectW, goodW, time) {
  const R = 110;
  ctx.save();
  ctx.translate(x, y);
  // Ring track.
  ctx.strokeStyle = 'rgba(245, 237, 224, 0.18)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  // Good zone (pale steel, clearly lighter than the track).
  ctx.strokeStyle = '#a8b8c4';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, R, ((zoneCenter - goodW / 2) * Math.PI) / 180, ((zoneCenter + goodW / 2) * Math.PI) / 180);
  ctx.stroke();
  // Perfect zone (ember).
  ctx.strokeStyle = PAL.accent;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(0, 0, R, ((zoneCenter - perfectW / 2) * Math.PI) / 180, ((zoneCenter + perfectW / 2) * Math.PI) / 180);
  ctx.stroke();
  // Sweeping marker.
  const a = (angle * Math.PI) / 180;
  const mx = Math.cos(a) * R;
  const my = Math.sin(a) * R;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx, my, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.accent;
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeatBar(ctx, x, y, w, heat, progress) {
  panel(ctx, x - 12, y - 26, w + 24, 62, 'rgba(20, 16, 12, 0.92)');
  label(ctx, 'HEAT', x, y - 6, 12, PAL.muted);
  mono(ctx, `${Math.round(heat)}`, x + 56, y - 6, 14, heatColor(heat));
  // Bar.
  ctx.fillStyle = '#0c0a08';
  rr(ctx, x, y, w, 16, 8);
  ctx.fill();
  const hg = ctx.createLinearGradient(x, 0, x + w, 0);
  hg.addColorStop(0, PAL.steel);
  hg.addColorStop(0.45, '#d97706');
  hg.addColorStop(0.7, PAL.accent);
  hg.addColorStop(1, PAL.whiteHot);
  ctx.fillStyle = hg;
  if (heat > 1) {
    rr(ctx, x, y, (w * heat) / 100, 16, 8);
    ctx.fill();
  }
  // White-hot window markers.
  ctx.strokeStyle = PAL.whiteHot;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + (w * 70) / 100, y - 4);
  ctx.lineTo(x + (w * 70) / 100, y + 20);
  ctx.moveTo(x + (w * 90) / 100, y - 4);
  ctx.lineTo(x + (w * 90) / 100, y + 20);
  ctx.stroke();
  label(ctx, 'WHITE-HOT 70–90', x + w / 2, y + 34, 11, PAL.dim, 'center');
  void progress;
}

function drawHud(ctx, g) {
  const w = g.world;
  // Left rail: gold, day, orders, day gold — a vertical stack, not a row.
  panel(ctx, 12, 12, 150, 252);
  label(ctx, 'GOLD', 30, 40, 11, PAL.muted);
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(38, 62, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', 38, 66);
  mono(ctx, `${w.gold}`, 56, 68, 22, PAL.text);
  ctx.strokeStyle = PAL.hairline;
  ctx.beginPath();
  ctx.moveTo(28, 88);
  ctx.lineTo(146, 88);
  ctx.stroke();
  mono(ctx, `DAY ${w.day}/5`, 30, 118, 15, PAL.text);
  const done = w.stats.delivered;
  const total = w.stats.delivered + w.orders.length;
  mono(ctx, `ORDERS ${done}/${Math.max(done, total)}`, 30, 142, 12, PAL.muted);
  ctx.strokeStyle = PAL.hairline;
  ctx.beginPath();
  ctx.moveTo(28, 162);
  ctx.lineTo(146, 162);
  ctx.stroke();
  label(ctx, 'DAY GOLD', 30, 190, 11, PAL.muted);
  mono(ctx, `${w.dayGold}g`, 30, 218, 20, PAL.gold);
  label(ctx, `BRAKK ${w.brakkDayGold}g`, 30, 242, 11, PAL.dim);
  // Center chip: the objective, alone at the top.
  panel(ctx, 430, 12, 420, 56);
  const winText = w.day === 5 ? 'DELIVER THE DRAGONBLADE' : `DELIVER ${w.orders.length} MORE`;
  label(ctx, `WIN: ${winText}`, 640, 36, 13, PAL.text, 'center');
  label(ctx, `LOSE: 3 RUINED BLADES OR THE CLOCK`, 640, 58, 11, PAL.danger, 'center');
  // Right rail: clock, ruined hearts, rival standings — vertical stack.
  panel(ctx, 1118, 12, 150, 252);
  mono(ctx, fmtClock(w.dayClock), 1193, 62, 26, w.dayClock <= 30 ? PAL.danger : PAL.text, 'center');
  label(ctx, w.day === 5 ? 'ROYAL DEADLINE' : 'DAY CLOCK', 1193, 84, 11, PAL.muted, 'center');
  ctx.strokeStyle = PAL.hairline;
  ctx.beginPath();
  ctx.moveTo(1134, 100);
  ctx.lineTo(1252, 100);
  ctx.stroke();
  label(ctx, 'RUINED', 1193, 128, 11, PAL.muted, 'center');
  for (let i = 0; i < 3; i++) {
    const hx = 1153 + i * 40;
    ctx.fillStyle = i < w.lives ? PAL.danger : 'rgba(239,68,68,0.25)';
    ctx.beginPath();
    ctx.arc(hx, 150, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = PAL.hairline;
  ctx.beginPath();
  ctx.moveTo(1134, 170);
  ctx.lineTo(1252, 170);
  ctx.stroke();
  label(ctx, 'RIVAL', 1193, 196, 11, PAL.muted, 'center');
  const you = w.goldEarned;
  const brakk = w.brakkGold + w.brakkDayGold;
  const tot = Math.max(1, you + brakk);
  label(ctx, `YOU ${you}`, 1136, 220, 11, PAL.text);
  label(ctx, `BRAKK ${brakk}`, 1136, 238, 11, PAL.muted);
  ctx.fillStyle = '#0c0a08';
  rr(ctx, 1136, 248, 114, 8, 4);
  ctx.fill();
  ctx.fillStyle = PAL.accent;
  rr(ctx, 1136, 248, (114 * you) / tot, 8, 4);
  ctx.fill();
}

function drawTicket(ctx, x, y, w, order, cost, afford, selected, time) {
  const h = 118;
  panel(ctx, x, y, w, h, selected ? PAL.panel2 : PAL.panel);
  if (selected) {
    ctx.strokeStyle = PAL.accent;
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 10);
    ctx.stroke();
  }
  const mat = MATERIALS[order.material];
  heading(ctx, order.type, x + 16, y + 30, 18, PAL.text);
  body(ctx, `${mat.name}  •  target ${order.target.toUpperCase()}`, x + 16, y + 54, 13, PAL.muted);
  mono(ctx, `${order.base}g`, x + w - 16, y + 32, 20, PAL.gold, 'right');
  body(ctx, `base ${order.base}g  x${mat.payout} ${mat.name.toLowerCase()}`, x + 16, y + 78, 12, PAL.dim);
  if (order.type === 'DRAGONBLADE') {
    label(ctx, 'ROYAL — 3 STAGES', x + 16, y + 102, 11, PAL.accent);
  } else if (!afford) {
    label(ctx, `NEEDS ${cost}g ${mat.name.toLowerCase()}`, x + 16, y + 102, 11, PAL.danger);
  } else {
    label(ctx, `FORGE ${cost}g — PRESS ${order.key || ''}`, x + 16, y + 102, 11, PAL.muted);
  }
  void time;
}

function drawBoard(ctx, g) {
  const w = g.world;
  ctx.fillStyle = 'rgba(10, 8, 6, 0.55)';
  ctx.fillRect(0, 68, VIEW_W, VIEW_H - 68);
  heading(ctx, w.day === 5 ? 'THE ROYAL COMMISSION' : `DAY ${w.day} — ORDER BOARD`, 640, 150, 30, PAL.text, 'center');
  body(ctx, w.day === 5
    ? 'One blade. Three stages. Beat Brakk to the King\u2019s favour.'
    : 'Pick an order, pay the material, then forge it. The day clock is running.',
  640, 182, 15, PAL.muted, 'center');
  const n = w.orders.length;
  const tw = 250;
  const gap = 20;
  const totalW = n * tw + (n - 1) * gap;
  let x = (VIEW_W - totalW) / 2;
  w.orders.forEach((order, i) => {
    order.key = String(i + 1);
    drawTicket(ctx, x, 220, tw, order, w.orderCost(order), w.canAfford(order), g.selectedOrder === i, g.time);
    x += tw + gap;
  });
  body(ctx, 'Click a ticket or press 1–5  •  Space starts the forge  •  M mute', 640, 400, 14, PAL.dim, 'center');
  // Day summary strip.
  panel(ctx, 390, 440, 500, 74);
  mono(ctx, `DAY GOLD ${w.dayGold}g`, 420, 472, 15, PAL.text);
  mono(ctx, `BRAKK ${w.brakkDayGold}g`, 420, 498, 13, PAL.muted);
  mono(ctx, `RUINED ${w.dayRuined}/3`, 800, 472, 15, w.dayRuined ? PAL.danger : PAL.text, 'right');
  mono(ctx, `SCORE ${w.finalScore()}`, 800, 498, 13, PAL.muted, 'right');
}

function drawForge(ctx, g) {
  const w = g.world;
  const f = w.forge;
  const time = g.time;
  // Quench barrel, right: wooden staves, iron bands, still water, steam.
  const bx = 1150;
  const by = 470;
  ctx.fillStyle = '#2b2118';
  rr(ctx, bx - 55, by - 70, 110, 130, 10);
  ctx.fill();
  ctx.strokeStyle = PAL.hairlineStrong;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  for (const sx of [bx - 28, bx, bx + 28]) {
    ctx.beginPath();
    ctx.moveTo(sx, by - 66);
    ctx.lineTo(sx, by + 56);
    ctx.stroke();
  }
  ctx.fillStyle = '#17171a';
  ctx.fillRect(bx - 55, by - 52, 110, 8);
  ctx.fillRect(bx - 55, by + 34, 110, 8);
  // Water surface.
  ctx.fillStyle = '#3f6b7a';
  ctx.beginPath();
  ctx.ellipse(bx, by - 60, 45, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 237, 224, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(bx, by - 60, 30 + Math.sin(time * 2) * 3, 5, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Steam wisps rising off the water.
  ctx.strokeStyle = 'rgba(231, 229, 228, 0.3)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const sx = bx - 20 + i * 40 + Math.sin(time * 1.5 + i * 2) * 6;
    ctx.beginPath();
    ctx.moveTo(sx, by - 72);
    ctx.quadraticCurveTo(sx + 8, by - 96, sx - 4, by - 116);
    ctx.stroke();
  }
  label(ctx, 'QUENCH [Q]', bx, by + 84, 12, PAL.muted, 'center');
  // Anvil + blade + ring.
  const ax = 640;
  const ay = 440;
  drawAnvil(ctx, ax, ay + 28);
  if (f) {
    drawRing(ctx, ax, ay, f.ringAngle, f.zoneCenter,
      MATERIALS[w.order.material].perfect, MATERIALS[w.order.material].good, time);
    drawBlade(ctx, ax, ay, f.heat, f.progress, time);
    // Progress bar under the anvil.
    ctx.fillStyle = '#0c0a08';
    rr(ctx, ax - 130, ay + 138, 260, 12, 6);
    ctx.fill();
    ctx.fillStyle = PAL.accent;
    rr(ctx, ax - 130, ay + 138, (260 * f.progress) / 100, 12, 6);
    ctx.fill();
    label(ctx, `SHAPED ${Math.round(f.progress)}%`, ax, ay + 166, 12, PAL.muted, 'center');
    // Combo.
    if (f.combo > 1) {
      heading(ctx, `COMBO x${f.combo}`, ax, ay - 200, 26, PAL.gold, 'center');
    }
    // Last strike feedback.
    if (g.lastStrike && g.time - g.lastStrike.at < 1.2) {
      const ls = g.lastStrike;
      const txt = ls.result === 'perfect' ? 'PERFECT' : ls.result === 'good' ? 'GOOD' : 'CLANG';
      const col = ls.result === 'perfect' ? PAL.good : ls.result === 'good' ? PAL.text : PAL.danger;
      heading(ctx, txt + (ls.crit ? '  CRIT' : ''), ax, ay - 160, 24, col, 'center');
    }
  } else {
    body(ctx, 'No blade on the anvil. Pick an order from the board.', ax, ay - 120, 16, PAL.muted, 'center');
  }
  // Heat bar, bottom center.
  if (f) drawHeatBar(ctx, 440, 640, 400, f.heat, f.progress);
  // Strike + quench buttons.
  panel(ctx, 300, 620, 120, 52, PAL.panel2);
  label(ctx, 'STRIKE', 360, 642, 13, PAL.text, 'center');
  label(ctx, 'SPACE / CLICK', 360, 662, 10, PAL.dim, 'center');
  panel(ctx, 860, 620, 120, 52, PAL.panel2);
  label(ctx, 'QUENCH', 920, 642, 13, PAL.text, 'center');
  label(ctx, 'Q / BARREL', 920, 662, 10, PAL.dim, 'center');
  // Current order chip.
  if (w.order) {
    panel(ctx, 16, 620, 250, 52);
    label(ctx, 'FORGING', 32, 642, 11, PAL.muted);
    heading(ctx, w.order.type, 32, 666, 17, PAL.text);
    mono(ctx, `${MATERIALS[w.order.material].name}  ${w.order.base}g`, 250, 648, 13, PAL.gold, 'right');
  }
  // Dragonblade stage pips.
  if (w.order && w.order.type === 'DRAGONBLADE') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < w.order.stage ? PAL.accent : 'rgba(245,237,224,0.2)';
      ctx.beginPath();
      ctx.arc(500 + i * 30, 600, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, `STAGE ${w.order.stage + 1}/3`, 640, 600, 12, PAL.muted, 'center');
  }
  // Particles: embers flicker as they rise, steam softens, rings expand.
  for (const p of g.fx.particles) {
    const t = p.age / p.life;
    if (p.kind === 'ring') {
      ctx.globalAlpha = Math.max(0, (1 - t) * 0.6);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * easeOutQuart(t), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'steam') {
      ctx.globalAlpha = Math.max(0, (1 - t) * 0.35);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + t * 0.8), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = Math.max(0, (1 - t) * (0.6 + 0.4 * Math.sin(p.age * 20 + p.sway)));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
  for (const fl of g.fx.floaters) {
    const t = fl.age / fl.life;
    ctx.globalAlpha = 1 - t;
    mono(ctx, fl.text, fl.x, fl.y - easeOutExpo(t) * 50, 16, fl.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, g) {
  const time = g.time;
  drawBackground(ctx, time);
  // Title block, left-aligned, with an ember rule under it.
  heading(ctx, 'EMBERFORGE', 90, 130, 64, PAL.text);
  body(ctx, 'Forge the realm\u2019s blades. Out-strike your rival. Deliver the Dragonblade.', 90, 168, 17, PAL.muted);
  ctx.strokeStyle = PAL.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 188);
  ctx.lineTo(520, 188);
  ctx.stroke();
  // Left column: how to forge.
  panel(ctx, 90, 210, 530, 250);
  label(ctx, 'HOW TO FORGE', 114, 242, 13, PAL.accent);
  const rows = [
    ['GOAL', 'Fill every order on the board, then the Dragonblade on day 5.'],
    ['STRIKE', 'Space or click when the ring marker is in the ember zone.'],
    ['HEAT', 'Strikes heat the blade. At 100 it is ruined — 3 ruins end the run.'],
    ['QUENCH', 'Q quenches. Quench white-hot (70–90) at full shape for MASTERWORK.'],
    ['WIN', 'Deliver the Dragonblade before the royal deadline.'],
    ['LOSE', '3 ruined blades, or the deadline passes first.'],
  ];
  rows.forEach(([k, v], i) => {
    label(ctx, k, 114, 272 + i * 26, 12, PAL.gold);
    body(ctx, v, 198, 272 + i * 26, 13, PAL.text);
  });
  // Right column, top: feats.
  panel(ctx, 660, 210, 530, 180);
  label(ctx, `FEATS  ${g.featsEarned.size}/6`, 684, 242, 13, PAL.accent);
  g.featList.forEach((f, i) => {
    const got = g.featsEarned.has(f.id);
    body(ctx, got ? '✓' : '·', 684, 268 + i * 22, 13, got ? PAL.good : PAL.dim);
    body(ctx, f.name, 708, 268 + i * 22, 13, got ? PAL.text : PAL.dim);
    body(ctx, f.blurb, 888, 268 + i * 22, 12, PAL.dim);
  });
  // Right column, below: last runs.
  panel(ctx, 660, 402, 530, 86);
  label(ctx, 'LAST RUNS', 684, 434, 13, PAL.accent);
  if (g.runs.length === 0) {
    body(ctx, 'No runs yet — the forge is cold.', 684, 458, 13, PAL.dim);
  } else {
    g.runs.slice(0, 2).forEach((r, i) => {
      mono(ctx, `${r.date}  ${r.difficulty.toUpperCase()}  GRADE ${r.grade}  ${r.score}`, 684, 458 + i * 22, 13, PAL.text);
    });
  }
  // Left column, below: difficulties as a vertical list.
  label(ctx, 'CHOOSE YOUR SMITH', 90, 488, 13, PAL.accent);
  const diffs = g.difficulties;
  diffs.forEach((d, i) => {
    const y = 500 + i * 56;
    const selected = g.selectedDifficulty === i;
    panel(ctx, 90, y, 530, 48, selected ? PAL.panel2 : PAL.panel);
    if (selected) {
      ctx.fillStyle = PAL.accent;
      ctx.fillRect(90, y, 4, 48);
    }
    heading(ctx, `${d.num}  ${d.name}`, 110, y + 21, 16, selected ? PAL.accent : PAL.text);
    body(ctx, d.blurb, 110, y + 41, 12, PAL.muted);
    const best = g.bests[d.id];
    mono(ctx, best ? `BEST ${best}` : 'BEST —', 600, y + 30, 13, PAL.gold, 'right');
  });
  // Start button, right column, wide.
  ctx.fillStyle = PAL.accent;
  rr(ctx, 660, 500, 530, 64, 10);
  ctx.fill();
  heading(ctx, '▶  START FORGING', 925, 539, 20, '#1c1005', 'center');
  body(ctx, 'Press 1 / 2 / 3 to pick a difficulty  •  Space to start  •  P pause  •  M mute', 660, 592, 13, PAL.dim);
}

function drawDraft(ctx, g) {
  const w = g.world;
  ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
  ctx.fillRect(0, 68, VIEW_W, VIEW_H - 68);
  heading(ctx, `DAY ${w.day} DONE — CHOOSE A BOON`, 640, 150, 30, PAL.text, 'center');
  body(ctx, 'The forge rests. Pick one upgrade — it stays for the whole run.', 640, 182, 15, PAL.muted, 'center');
  w.draft.forEach((id, i) => {
    // Boons as full-width rows, not a row of cards.
    const y = 240 + i * 100;
    const selected = g.selectedDraft === i;
    panel(ctx, 190, y, 900, 86, selected ? PAL.panel2 : PAL.panel);
    if (selected) {
      ctx.strokeStyle = PAL.accent;
      ctx.lineWidth = 2;
      rr(ctx, 190, y, 900, 86, 10);
      ctx.stroke();
    }
    ctx.fillStyle = PAL.accent;
    ctx.beginPath();
    ctx.arc(232, y + 43, 18, 0, Math.PI * 2);
    ctx.fill();
    mono(ctx, `${i + 1}`, 232, y + 49, 16, '#1c1005', 'center');
    heading(ctx, upgradeName(id), 268, y + 38, 20, PAL.text);
    body(ctx, upgradeBlurb(id), 268, y + 64, 14, PAL.muted);
    label(ctx, `CHOOSE [${i + 1}]`, 1050, y + 48, 12, PAL.dim, 'right');
  });
  body(ctx, `Reroll for ${20}g — press R  •  Gold ${w.gold}g`, 640, 560, 14, PAL.muted, 'center');
  body(ctx, 'Owned: ' + ([...w.upgrades].map((id) => upgradeName(id)).join(', ') || 'none yet'), 640, 590, 13, PAL.dim, 'center');
}

function drawDayClear(ctx, g) {
  const s = g.daySummary;
  const w = g.world;
  ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
  ctx.fillRect(0, 68, VIEW_W, VIEW_H - 68);
  heading(ctx, `DAY ${w.day - 1} CLEAR`, 640, 190, 40, PAL.text, 'center');
  panel(ctx, 390, 250, 500, 190);
  mono(ctx, `DAY GOLD  ${s.dayGold}g`, 420, 296, 16, PAL.text);
  mono(ctx, `BRAKK     ${s.brakkDayGold}g`, 420, 326, 16, PAL.muted);
  mono(ctx, `TIME BONUS  +${s.timeBonus}`, 420, 356, 16, PAL.text);
  if (s.favour > 0) mono(ctx, `KING'S FAVOUR  +${s.favour}g`, 420, 386, 16, PAL.gold);
  mono(ctx, `SCORE  ${w.finalScore()}`, 420, 416, 16, PAL.text);
  body(ctx, s.favour > 0 ? 'You out-earned Brakk. The King notices.' : 'Brakk out-earned you today. Catch him tomorrow.', 640, 480, 15, PAL.muted, 'center');
  ctx.fillStyle = PAL.accent;
  rr(ctx, 490, 520, 300, 56, 10);
  ctx.fill();
  heading(ctx, '▶  NEXT DAY', 640, 557, 20, '#1c1005', 'center');
  body(ctx, 'Space or click to continue', 640, 606, 13, PAL.dim, 'center');
}

function drawWin(ctx, g) {
  const w = g.world;
  drawBackground(ctx, g.time);
  heading(ctx, 'THE DRAGONBLADE IS DONE', 640, 130, 40, PAL.text, 'center');
  body(ctx, 'The King raises it. The forge sings. Brakk bows — or does he?', 640, 166, 16, PAL.muted, 'center');
  // Grade + score.
  panel(ctx, 90, 200, 300, 150);
  label(ctx, 'GRADE', 116, 232, 13, PAL.muted);
  heading(ctx, w.grade(), 116, 300, 72, PAL.accent);
  mono(ctx, `SCORE ${w.finalScore()}`, 116, 332, 15, PAL.text);
  // Stat strip: one row of six, not a grid.
  panel(ctx, 410, 200, 780, 150);
  label(ctx, 'THE RUN IN NUMBERS', 436, 232, 13, PAL.accent);
  const stats = [
    ['DELIVERED', `${w.stats.delivered}`],
    ['MASTERWORK', `${w.stats.masterworks}`],
    ['BEST COMBO', `x${w.stats.bestCombo}`],
    ['GOLD', `${w.goldEarned}g`],
    ['RUINED', `${w.stats.ruined}`],
    ['STRIKES', `${w.stats.strikes}`],
  ];
  stats.forEach(([k, v], i) => {
    const x = 436 + i * 125;
    label(ctx, k, x, 272, 11, PAL.muted);
    mono(ctx, v, x, 306, 20, PAL.text);
  });
  // Feats + loadout: feats in two columns.
  panel(ctx, 90, 370, 520, 150);
  label(ctx, `FEATS  ${g.featsEarned.size}/6`, 116, 402, 13, PAL.accent);
  g.featList.forEach((f, i) => {
    const got = g.featsEarned.has(f.id);
    const fx0 = 116 + Math.floor(i / 3) * 224;
    const fy = 432 + (i % 3) * 22;
    body(ctx, got ? '✓' : '·', fx0, fy, 13, got ? PAL.good : PAL.dim);
    body(ctx, f.name, fx0 + 24, fy, 13, got ? PAL.text : PAL.dim);
  });
  panel(ctx, 630, 370, 560, 150);
  label(ctx, 'YOUR LOADOUT', 656, 402, 13, PAL.accent);
  body(ctx, [...w.upgrades].map((id) => upgradeName(id)).join('  •  ') || 'No boons taken.', 656, 432, 14, PAL.text);
  label(ctx, 'NEXT GOAL', 656, 466, 12, PAL.gold);
  body(ctx, g.nextGoal, 656, 490, 14, PAL.text);
  // Buttons.
  ctx.fillStyle = PAL.accent;
  rr(ctx, 390, 560, 220, 56, 10);
  ctx.fill();
  heading(ctx, 'RUN AGAIN', 500, 597, 18, '#1c1005', 'center');
  panel(ctx, 670, 560, 220, 56, PAL.panel2);
  heading(ctx, 'TITLE', 780, 597, 18, PAL.text, 'center');
  body(ctx, 'Space runs again  •  T returns to title', 640, 648, 13, PAL.dim, 'center');
}

function drawGameOver(ctx, g) {
  const w = g.world;
  drawBackground(ctx, g.time);
  heading(ctx, 'THE FORGE GOES COLD', 640, 190, 44, PAL.danger, 'center');
  body(ctx, w.overReason, 640, 230, 17, PAL.muted, 'center');
  panel(ctx, 390, 280, 500, 130);
  mono(ctx, `SCORE  ${w.finalScore()}`, 420, 326, 18, PAL.text);
  mono(ctx, `DAY ${w.day}/5  •  DELIVERED ${w.stats.delivered}  •  GOLD ${w.goldEarned}g`, 420, 360, 14, PAL.muted);
  mono(ctx, `BEST COMBO x${w.stats.bestCombo}  •  MASTERWORKS ${w.stats.masterworks}`, 420, 388, 14, PAL.muted);
  ctx.fillStyle = PAL.accent;
  rr(ctx, 390, 460, 220, 56, 10);
  ctx.fill();
  heading(ctx, 'TRY AGAIN', 500, 497, 18, '#1c1005', 'center');
  panel(ctx, 670, 460, 220, 56, PAL.panel2);
  heading(ctx, 'TITLE', 780, 497, 18, PAL.text, 'center');
  body(ctx, 'Space retries  •  T returns to title', 640, 548, 13, PAL.dim, 'center');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 8, 6, 0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  heading(ctx, 'PAUSED', 640, 340, 44, PAL.text, 'center');
  body(ctx, 'P resumes  •  R restarts the day  •  M mutes', 640, 380, 15, PAL.muted, 'center');
}

export function render(ctx, g) {
  ctx.save();
  ctx.translate(g.fx.shakeX, g.fx.shakeY);
  const screen = g.screen;
  if (screen === 'title') {
    drawTitle(ctx, g);
  } else {
    drawBackground(ctx, g.time);
    drawHud(ctx, g);
    if (screen === 'playing') {
      if (g.phase === 'board') drawBoard(ctx, g);
      else drawForge(ctx, g);
    } else if (screen === 'draft') {
      drawForge(ctx, g);
      drawDraft(ctx, g);
    } else if (screen === 'dayclear') {
      drawDayClear(ctx, g);
    } else if (screen === 'win') {
      drawWin(ctx, g);
    } else if (screen === 'gameover') {
      drawGameOver(ctx, g);
    }
    if (g.paused) drawPaused(ctx);
  }
  ctx.restore();
}

export { drawBackground, drawHud, drawForge, drawTitle, drawDraft, drawWin, fmtClock };

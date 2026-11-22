// Ember Court — canvas renderer. All art is drawn procedurally: the felt
// table, the heroes, every card face and back, the title and end screens.
// main.js owns input and hit-testing; it imports the slot geometry below
// so clicks and drawing always agree.

import { CARD_BY_ID, ELEMENT_INFO } from './cards.js';

export const W = 1280;
export const H = 720;

// --- Slot geometry (shared with main.js hit-testing) ---
export const HAND_CARD = { w: 108, h: 150 };
export const BOARD_CARD = { w: 96, h: 134 };
export const HAND_Y = 556;
export const FOE_BOARD_Y = 196;
export const YOU_BOARD_Y = 386;
export const FOE_HAND_Y = 74;
export const FOE_HERO = { x: 28, y: 196, w: 150, h: 132 };
export const YOU_HERO = { x: 28, y: 386, w: 150, h: 132 };
export const END_TURN = { x: 1072, y: 322, w: 180, h: 52 };
export const TITLE_BUTTON = { x: 440, y: 520, w: 400, h: 64 };

export function handCardRect(i, count) {
  const total = count * (HAND_CARD.w + 6) - 6;
  const x = (W - total) / 2 + i * (HAND_CARD.w + 6);
  return { x, y: HAND_Y, w: HAND_CARD.w, h: HAND_CARD.h };
}

export function boardCardRect(side, i, count) {
  const total = count * (BOARD_CARD.w + 12) - 12;
  const x = (W - total) / 2 + i * (BOARD_CARD.w + 12);
  const y = side === 'foe' ? FOE_BOARD_Y : YOU_BOARD_Y;
  return { x, y, w: BOARD_CARD.w, h: BOARD_CARD.h };
}

export function foeHandRect(i, count) {
  const w = 44, h = 62;
  const total = count * (w + 5) - 5;
  const x = (W - total) / 2 + i * (w + 5);
  return { x, y: FOE_HAND_Y, w, h };
}

// --- Drawing helpers ---

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', font = 'bold', family = 'Georgia, serif') {
  ctx.font = `${font} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// Element glyphs, drawn as paths so suits differ by shape AND colour.
export function drawGlyph(ctx, glyph, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.14;
  ctx.lineJoin = 'round';
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.55, -0.35, 0.85, 0.1, 0.6, 0.65);
    ctx.bezierCurveTo(0.4, 1.0, -0.4, 1.0, -0.6, 0.65);
    ctx.bezierCurveTo(-0.85, 0.1, -0.55, -0.35, 0, -1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, -0.1);
    ctx.bezierCurveTo(0.3, 0.25, 0.35, 0.5, 0.15, 0.72);
    ctx.bezierCurveTo(0, 0.9, -0.25, 0.85, -0.2, 0.6);
    ctx.bezierCurveTo(-0.3, 0.3, -0.2, 0.05, 0, -0.1);
    ctx.fill();
  } else if (glyph === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.75, -0.1, 0.8, 0.55, 0, 0.85);
    ctx.bezierCurveTo(-0.8, 0.55, -0.75, -0.1, 0, -1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-0.28, 0.1, 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.9, -0.5, 0.9, 0.6, 0, 1);
    ctx.bezierCurveTo(-0.9, 0.6, -0.9, -0.5, 0, -1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -0.85);
    ctx.quadraticCurveTo(0.1, 0, 0, 0.9);
    ctx.stroke();
  } else { // swirl
    ctx.lineWidth = 0.22;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.85 - k * 0.24, k * 1.1, k * 1.1 + Math.PI * 1.25);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function heart(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0.9);
  ctx.bezierCurveTo(-1.1, 0, -0.9, -1, 0, -0.35);
  ctx.bezierCurveTo(0.9, -1, 1.1, 0, 0, 0.9);
  ctx.fill();
  ctx.restore();
}

function sword(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fillRect(-0.12, -1, 0.24, 1.5);
  ctx.beginPath();
  ctx.moveTo(0, -1.5); ctx.lineTo(0.22, -0.9); ctx.lineTo(-0.22, -0.9); ctx.closePath();
  ctx.fill();
  ctx.fillRect(-0.5, 0.5, 1, 0.18);
  ctx.fillRect(-0.1, 0.68, 0.2, 0.5);
  ctx.restore();
}

// --- Cards ---

export function drawCardBack(ctx, x, y, w, h, small = false) {
  roundRect(ctx, x, y, w, h, 9);
  ctx.fillStyle = '#3d1420';
  ctx.fill();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
  ctx.strokeStyle = 'rgba(212,164,55,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawGlyph(ctx, 'flame', x + w / 2, y + h / 2, small ? 13 : 22, '#e8491d');
}

export function drawCard(ctx, card, rect, opts = {}) {
  const { x, y, w, h } = rect;
  const def = CARD_BY_ID[card.id];
  const el = ELEMENT_INFO[def.element];
  const selected = opts.selected;
  const hovered = opts.hovered;
  const dimmed = opts.dimmed;

  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.45;
  const lift = selected ? -14 : hovered ? -10 : 0;
  ctx.translate(0, lift);

  // Body: parchment face with an element-tinted header band.
  roundRect(ctx, x, y, w, h, 10);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#fdf6e3');
  grad.addColorStop(1, '#e8d9b0');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = selected ? 4 : 2;
  ctx.strokeStyle = selected ? '#ffd94d' : el.dark;
  ctx.stroke();
  if (selected) {
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 18;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.restore();
  }

  // Element band.
  roundRect(ctx, x + 3, y + 3, w - 6, h * 0.42, 8);
  const bg = ctx.createLinearGradient(x, y, x + w, y + h * 0.42);
  bg.addColorStop(0, el.color);
  bg.addColorStop(1, el.dark);
  ctx.fillStyle = bg;
  ctx.fill();

  // Cost gem (top-left) — the card's ember cost, always readable.
  ctx.beginPath();
  ctx.arc(x + 17, y + 17, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#1d4ed8';
  ctx.fill();
  ctx.strokeStyle = '#dbeafe';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, String(def.cost), x + 17, y + 18, 18, '#fff', 'center', 'bold', 'Arial, sans-serif');

  // Element glyph, big and centred in the band.
  drawGlyph(ctx, el.glyph, x + w / 2, y + h * 0.23, 20, el.light);
  text(ctx, el.name.toUpperCase(), x + w / 2, y + h * 0.40, 9, 'rgba(255,255,255,0.9)', 'center', 'bold', 'Arial, sans-serif');

  // Name.
  text(ctx, def.name, x + w / 2, y + h * 0.52, 12, '#241a08', 'center', 'bold', 'Georgia, serif');
  // Flavour / rules line.
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = '#5b4a26';
  ctx.textAlign = 'center';
  wrapText(ctx, def.text, x + w / 2, y + h * 0.62, w - 14, 11);

  if (def.kind === 'creature') {
    // Attack (bottom-left) and health (bottom-right), big and legible.
    sword(ctx, x + 16, y + h - 18, 9, '#b91c1c');
    text(ctx, String(card.atk + card.resonance), x + 30, y + h - 17, 20, '#b91c1c', 'left', 'bold', 'Arial, sans-serif');
    heart(ctx, x + w - 26, y + h - 18, 9, '#dc2626');
    text(ctx, String(card.hp), x + w - 38, y + h - 17, 20, '#991b1b', 'right', 'bold', 'Arial, sans-serif');
    if (opts.onBoard && !card.canAttack) {
      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = 'rgba(20,20,40,0.28)';
      ctx.fill();
      text(ctx, 'RESTING', x + w / 2, y + h - 34, 10, '#fff', 'center', 'bold', 'Arial, sans-serif');
    }
  } else {
    // Spell: its effect, front and centre.
    const effect = def.dmg > 0 && def.heal > 0
      ? `Deal ${def.dmg + card.resonance} · Heal ${def.heal}`
      : def.dmg > 0 ? `Deal ${def.dmg + card.resonance}` : `Heal ${def.heal}`;
    text(ctx, effect, x + w / 2, y + h - 26, 13, '#1e3a8a', 'center', 'bold', 'Arial, sans-serif');
    text(ctx, '✦ SPELL ✦', x + w / 2, y + h - 12, 9, '#7c5a10', 'center', 'bold', 'Arial, sans-serif');
  }
  ctx.restore();
}

function wrapText(ctx, str, x, y, maxW, lineH) {
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

// --- Heroes and the table ---

function drawHero(ctx, side, rect, name, isFoe) {
  const { x, y, w, h } = rect;
  roundRect(ctx, x, y, w, h, 12);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, isFoe ? '#3a1c2e' : '#1c2e3a');
  grad.addColorStop(1, isFoe ? '#1c0d16' : '#0d1a24');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Portrait medallion.
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 34, 25, 0, Math.PI * 2);
  ctx.fillStyle = isFoe ? '#57203a' : '#274b63';
  ctx.fill();
  ctx.strokeStyle = '#e8c766';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawGlyph(ctx, isFoe ? 'flame' : 'drop', x + w / 2, y + 34, 15, isFoe ? '#ff8a5c' : '#7fd4ff');
  text(ctx, name, x + w / 2, y + 70, 13, '#f5e6c4', 'center', 'bold', 'Georgia, serif');
  text(ctx, `EMBER ${side.ember}/${side.maxEmber}`, x + w / 2, y + 86, 9, '#9db8cc', 'center', 'bold', 'Arial, sans-serif');
  // Ember crystals.
  for (let i = 0; i < side.maxEmber; i++) {
    const ex = x + 14 + i * 13;
    const ey = y + 98;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = i < side.ember ? '#38bdf8' : 'rgba(120,130,150,0.35)';
    ctx.fill();
  }
  // Life: hearts + big number.
  heart(ctx, x + 26, y + 118, 11, '#e5484d');
  text(ctx, `${side.life}`, x + 44, y + 119, 24, '#fff', 'left', 'bold', 'Arial, sans-serif');
  text(ctx, 'LIFE', x + w - 12, y + 119, 10, '#c9b48a', 'right', 'bold', 'Arial, sans-serif');
}

function drawTable(ctx) {
  // Felt with a vignette and a gold rim.
  const felt = ctx.createRadialGradient(640, 360, 80, 640, 360, 720);
  felt.addColorStop(0, '#2f6b4f');
  felt.addColorStop(0.6, '#245741');
  felt.addColorStop(1, '#123524');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);
  ctx.strokeStyle = 'rgba(212,164,55,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, W - 32, H - 32);
  // Faint court emblem in the middle band.
  ctx.save();
  ctx.globalAlpha = 0.08;
  drawGlyph(ctx, 'flame', 640, 352, 70, '#fff');
  ctx.restore();
}

// --- Screens ---

function drawScorePanel(ctx, game) {
  const x = 1072, y = 70, w = 180, h = 104;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = 'rgba(10,16,12,0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,164,55,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'SCORE', x + w / 2, y + 16, 11, '#d4a437', 'center', 'bold', 'Arial, sans-serif');
  const s = game.stats;
  const score = s.damageDealt * 10 + s.cardsPlayed * 5 + s.resonanceTriggers * 15 + (game.screen === 'win' ? 500 : 0);
  text(ctx, `${score}`, x + w / 2, y + 46, 30, '#ffe98a', 'center', 'bold', 'Arial, sans-serif');
  text(ctx, `Turn ${game.turnNumber} · ${s.cardsPlayed} cards · ${s.damageDealt} dmg`, x + w / 2, y + 80, 10, '#c9d6c9', 'center', 'bold', 'Arial, sans-serif');
}

function drawLog(ctx, game) {
  ctx.font = 'italic 13px Georgia, serif';
  ctx.fillStyle = 'rgba(245,230,196,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  game.log.slice(0, 2).forEach((line, i) => {
    ctx.globalAlpha = i === 0 ? 1 : 0.55;
    ctx.fillText(line, 640, 348 + i * 18);
  });
  ctx.globalAlpha = 1;
}

function drawEndTurn(ctx, game, ui) {
  const { x, y, w, h } = END_TURN;
  const enabled = game.turn === 'you' && !game.foeBusy && game.screen === 'play';
  const hovered = ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = enabled ? (hovered ? '#e8b91d' : '#c99a1e') : 'rgba(90,90,90,0.5)';
  ctx.fill();
  ctx.strokeStyle = '#f5e6c4';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, game.foeBusy ? 'RIVAL ACTS…' : game.turn === 'you' ? 'END TURN  [E]' : 'RIVAL’S TURN', x + w / 2, y + h / 2 + 1, 15, enabled ? '#241a08' : '#ddd', 'center', 'bold', 'Arial, sans-serif');
}

function drawFloaters(ctx, game) {
  for (const f of game.floaters) {
    const pos = floaterPos(game, f.target);
    if (!pos) continue;
    const alpha = Math.max(0, 1 - f.age / 1.1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(f.text, pos.x, pos.y - f.age * 42);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, pos.x, pos.y - f.age * 42);
    ctx.restore();
  }
}

function floaterPos(game, target) {
  if (target === 'foeHero') return { x: FOE_HERO.x + FOE_HERO.w / 2, y: FOE_HERO.y + 20 };
  if (target === 'youHero') return { x: YOU_HERO.x + YOU_HERO.w / 2, y: YOU_HERO.y + 20 };
  if (target && target.board) {
    const side = target.board === 'foe' ? game.foe : game.you;
    const rect = boardCardRect(target.board, target.index, side.board.length);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }
  return null;
}

function drawPlayScreen(ctx, game, ui) {
  drawTable(ctx);

  // Foe hand: face-down card backs, count visible.
  game.foe.hand.forEach((_, i) => {
    const r = foeHandRect(i, game.foe.hand.length);
    drawCardBack(ctx, r.x, r.y, r.w, r.h, true);
  });
  text(ctx, `RIVAL'S HAND · ${game.foe.hand.length} cards · DECK ${game.foe.deck.length}`, 640, 56, 12, '#d8c9a3', 'center', 'bold', 'Arial, sans-serif');
  text(ctx, `YOUR DECK ${game.you.deck.length} · DISCARD ${game.you.discard.length}`, 30, 690, 11, '#b8a97f', 'left', 'bold', 'Arial, sans-serif');

  // Turn banner pill, between the Rival's hand and its board.
  const banner = game.turn === 'you' ? '◆  YOUR TURN — play a card, then END TURN  ◆' : '◆  THE RIVAL IS THINKING…  ◆';
  ctx.font = 'bold 13px Arial, sans-serif';
  const bw = ctx.measureText(banner).width + 36;
  roundRect(ctx, 640 - bw / 2, 146, bw, 30, 15);
  ctx.fillStyle = 'rgba(10,16,12,0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,164,55,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, banner, 640, 162, 13, game.turn === 'you' ? '#ffe98a' : '#c9b48a', 'center', 'bold', 'Arial, sans-serif');

  drawHero(ctx, game.foe, FOE_HERO, 'ASHEN RIVAL', true);
  drawHero(ctx, game.you, YOU_HERO, 'EMBERLORD', false);
  drawScorePanel(ctx, game);

  // Boards, with a gold pulse on valid targets while a selection is live.
  const targeting = ui.selected !== null;
  game.foe.board.forEach((card, i) => {
    const r = boardCardRect('foe', i, game.foe.board.length);
    drawCard(ctx, card, { x: card.x, y: card.y, w: r.w, h: r.h }, { onBoard: true });
    if (targeting) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(Date.now() / 180);
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      roundRect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 12);
      ctx.stroke();
      ctx.restore();
    }
  });
  game.you.board.forEach((card, i) => {
    const r = boardCardRect('you', i, game.you.board.length);
    const selected = ui.selected && ui.selected.type === 'board' && ui.selected.index === i;
    drawCard(ctx, card, { x: card.x, y: card.y, w: r.w, h: r.h }, { selected, onBoard: true });
  });

  // Player hand: fanned, hovered card lifts, selected card glows.
  game.you.hand.forEach((card, i) => {
    const r = handCardRect(i, game.you.hand.length);
    const hovered = ui.hover && ui.hover.type === 'hand' && ui.hover.index === i;
    const selected = ui.selected && ui.selected.type === 'hand' && ui.selected.index === i;
    const affordable = card.cost <= game.you.ember;
    drawCard(ctx, card, { x: card.x, y: card.y, w: r.w, h: r.h }, { hovered, selected, dimmed: !affordable && game.turn === 'you' });
  });

  drawLog(ctx, game);
  drawEndTurn(ctx, game, ui);

  // Hint line.
  text(ctx, 'Click a card, then a target · 1-7 select · Space confirm · E end turn · M mute', 640, 540, 11, 'rgba(220,205,170,0.75)', 'center', 'normal', 'Arial, sans-serif');
  drawFloaters(ctx, game);
}

// --- Title and end screens ---

function computeScore(game) {
  const s = game.stats;
  return s.damageDealt * 10 + s.cardsPlayed * 5 + s.resonanceTriggers * 15 + (game.screen === 'win' ? 500 : 0);
}

function drawTitle(ctx, game, ui) {
  // Ember-lit dark hall.
  const bg = ctx.createRadialGradient(640, 300, 60, 640, 360, 700);
  bg.addColorStop(0, '#4a2410');
  bg.addColorStop(0.55, '#241207');
  bg.addColorStop(1, '#0d0603');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Rising embers.
  for (let i = 0; i < 40; i++) {
    const t = (Date.now() / 1000 + i * 0.37) % 1;
    const x = ((i * 173) % 1280);
    const y = 700 - t * 700;
    ctx.globalAlpha = 0.25 + 0.45 * (1 - t);
    ctx.fillStyle = i % 3 ? '#ff9a3c' : '#ffd94d';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A fan of four hero cards behind the title.
  const showcase = [
    { id: 'ash-phoenix', atk: 7, hp: 4, resonance: 0, canAttack: true },
    { id: 'deep-leviathan', atk: 6, hp: 6, resonance: 0, canAttack: true },
    { id: 'elder-oakheart', atk: 6, hp: 8, resonance: 0, canAttack: true },
    { id: 'sky-serpent', atk: 8, hp: 5, resonance: 0, canAttack: true },
  ];
  showcase.forEach((card, i) => {
    ctx.save();
    const cx = 640 + (i - 1.5) * 128;
    ctx.translate(cx, 218);
    ctx.rotate((i - 1.5) * 0.1);
    drawCard(ctx, card, { x: -54, y: -75, w: 108, h: 150 });
    ctx.restore();
  });

  text(ctx, 'EMBER COURT', 640, 380, 84, '#f5d76e', 'center', 'bold', 'Georgia, serif');
  ctx.save();
  ctx.shadowColor = '#e8491d';
  ctx.shadowBlur = 24;
  text(ctx, 'EMBER COURT', 640, 380, 84, '#f5d76e', 'center', 'bold', 'Georgia, serif');
  ctx.restore();
  text(ctx, 'An original duel of elemental cards — outwit the Ashen Rival', 640, 438, 20, '#f5e6c4', 'center', 'normal', 'Georgia, serif');
  text(ctx, 'Flame beats Thorn · Thorn beats Tide · Tide beats Gale · Gale beats Flame — +1 attack', 640, 468, 14, '#d8c9a3', 'center', 'normal', 'Georgia, serif');
  text(ctx, 'Play two cards of one element in a turn: the second gains +1 power (Resonance)', 640, 490, 14, '#d8c9a3', 'center', 'normal', 'Georgia, serif');

  // Begin button.
  const b = TITLE_BUTTON;
  const hovered = ui.mouse.x >= b.x && ui.mouse.x <= b.x + b.w && ui.mouse.y >= b.y && ui.mouse.y <= b.y + b.h;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = hovered ? '#e8b91d' : '#c99a1e';
  ctx.fill();
  ctx.strokeStyle = '#f5e6c4';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'BEGIN THE DUEL', b.x + b.w / 2, b.y + b.h / 2 + 1, 22, '#241a08', 'center', 'bold', 'Arial, sans-serif');
  text(ctx, 'Press ENTER or click · Mouse + keyboard · M mute · 30 life each · first to zero loses', 640, 618, 13, 'rgba(220,205,170,0.8)', 'center', 'normal', 'Arial, sans-serif');
  text(ctx, '100% original — art, rules and names invented for this court', 640, 644, 12, 'rgba(220,205,170,0.55)', 'center', 'italic', 'Georgia, serif');
}

function drawEndScreen(ctx, game, ui) {
  const won = game.screen === 'win';
  // Its own backdrop: a dark hall, golden for victory, cold blue for defeat.
  const bg = ctx.createRadialGradient(640, 300, 60, 640, 360, 700);
  if (won) {
    bg.addColorStop(0, '#4a3410');
    bg.addColorStop(0.55, '#241a07');
    bg.addColorStop(1, '#0d0903');
  } else {
    bg.addColorStop(0, '#1c2a44');
    bg.addColorStop(0.55, '#101827');
    bg.addColorStop(1, '#05070d');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Drifting embers (victory) or cold ash (defeat).
  for (let i = 0; i < 36; i++) {
    const t = (Date.now() / 1000 + i * 0.37) % 1;
    const x = ((i * 173) % 1280);
    const y = won ? 700 - t * 700 : t * 700;
    ctx.globalAlpha = 0.2 + 0.4 * (won ? 1 - t : t);
    ctx.fillStyle = won ? (i % 3 ? '#ff9a3c' : '#ffd94d') : '#8fa3c7';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const s = game.stats;
  const seconds = Math.max(1, Math.round((Date.now() - game.startedAt) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');

  if (won) {
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 30;
    text(ctx, '★  VICTORY  ★', 640, 170, 76, '#ffd94d', 'center', 'bold', 'Georgia, serif');
    ctx.restore();
    text(ctx, 'The Ashen Rival bows. The court is yours.', 640, 238, 22, '#f5e6c4', 'center', 'italic', 'Georgia, serif');
  } else {
    text(ctx, 'DEFEAT', 640, 170, 76, '#8fa3c7', 'center', 'bold', 'Georgia, serif');
    text(ctx, 'Your embers scatter on the cold stone.', 640, 238, 22, '#c9d2e0', 'center', 'italic', 'Georgia, serif');
  }
  text(ctx, `EMBERLORD ${game.you.life}  ·  ASHEN RIVAL ${game.foe.life}`, 640, 272, 15, '#d8c9a3', 'center', 'bold', 'Arial, sans-serif');

  // Score card.
  const x = 440, y = 300, w = 400, h = 210;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = 'rgba(12,10,8,0.85)';
  ctx.fill();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'FINAL SCORE', 640, y + 26, 13, '#d4a437', 'center', 'bold', 'Arial, sans-serif');
  text(ctx, `${computeScore(game)}`, 640, y + 72, 46, '#ffe98a', 'center', 'bold', 'Arial, sans-serif');
  const rows = [
    `Turns played: ${game.turnNumber}`,
    `Cards played: ${s.cardsPlayed}   ·   Damage dealt: ${s.damageDealt}`,
    `Resonance combos: ${s.resonanceTriggers}   ·   Time: ${mins}:${secs}`,
  ];
  rows.forEach((row, i) => text(ctx, row, 640, y + 122 + i * 26, 15, '#e8dcc0', 'center', 'normal', 'Georgia, serif'));
  text(ctx, won ? 'Press R to duel again' : 'Press R to challenge again', 640, 566, 18, '#f5e6c4', 'center', 'bold', 'Arial, sans-serif');
}

// --- Main dispatch ---

export function draw(ctx, game, ui) {
  ctx.clearRect(0, 0, W, H);
  if (game.screen === 'title') drawTitle(ctx, game, ui);
  else if (game.screen === 'play') drawPlayScreen(ctx, game, ui);
  else drawEndScreen(ctx, game, ui);
}

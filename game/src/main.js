// Ember Court — wiring: canvas setup, input, game loop, debug hooks.
// The engine owns the rules (engine.js), the renderer owns the pixels
// (render.js); this file only translates mouse/keyboard into engine calls
// and keeps the card-slide animation running.

import { createGame, startGame, playCard, attackWith, endPlayerTurn, damageHero, snapshot } from './engine.js';
import { CARD_BY_ID, makeCardInstance } from './cards.js';
import { draw, W, H, handCardRect, boardCardRect, foeHandRect, FOE_HERO, YOU_HERO, END_TURN, TITLE_BUTTON } from './render.js';
import { sfx, playCue, toggleMute, startDrone, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

export const game = createGame();

// UI state: what the pointer hovers, what is selected, which target the
// keyboard is pointing at.
export const ui = {
  mouse: { x: -1, y: -1 },
  hover: null,    // {type:'hand'|'board'|'foeBoard'|'foeHero'|'youHero'|'endTurn'|'title', index?}
  selected: null, // {type:'hand'|'board', index}
  targetIndex: -1, // keyboard target: -1 = hero, else foe board index
};

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// Keep every card sliding toward its slot (the dealt-hand weight).
function updateCardPositions() {
  const slide = (card, rect) => {
    card.tx = rect.x;
    card.ty = rect.y;
    card.x += (card.tx - card.x) * 0.22;
    card.y += (card.ty - card.y) * 0.22;
    if (Math.abs(card.tx - card.x) < 0.5) card.x = card.tx;
    if (Math.abs(card.ty - card.y) < 0.5) card.y = card.ty;
  };
  game.you.hand.forEach((c, i) => slide(c, handCardRect(i, game.you.hand.length)));
  game.you.board.forEach((c, i) => slide(c, boardCardRect('you', i, game.you.board.length)));
  game.foe.board.forEach((c, i) => slide(c, boardCardRect('foe', i, game.foe.board.length)));
}

function updateFloaters(dt) {
  for (const f of game.floaters) f.age += dt;
  game.floaters = game.floaters.filter((f) => f.age < 1.1);
}

function drainEvents() {
  while (game.events.length) playCue(game.events.shift());
}

let lastTime = performance.now();
let lastAnnounced = '';
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  updateCardPositions();
  updateFloaters(dt);
  drainEvents();
  draw(ctx, game, ui);
  const summary = `${game.screen} turn ${game.turnNumber} life ${game.you.life} vs ${game.foe.life}`;
  if (summary !== lastAnnounced) {
    lastAnnounced = summary;
    announce(`Ember Court: ${summary}.`);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Input ---

function toGameCoords(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
  };
}

function inside(p, rect) {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
}

// What is under the pointer right now (hand first, so overlapping cards pick
// the topmost one the player means).
function pickAt(p) {
  if (game.screen === 'title') {
    if (inside(p, TITLE_BUTTON)) return { type: 'title' };
    return null;
  }
  if (game.screen !== 'play') return { type: 'end' };
  if (inside(p, END_TURN)) return { type: 'endTurn' };
  if (inside(p, FOE_HERO)) return { type: 'foeHero' };
  if (inside(p, YOU_HERO)) return { type: 'youHero' };
  for (let i = game.foe.board.length - 1; i >= 0; i--) {
    if (inside(p, boardCardRect('foe', i, game.foe.board.length))) return { type: 'foeBoard', index: i };
  }
  for (let i = game.you.board.length - 1; i >= 0; i--) {
    if (inside(p, boardCardRect('you', i, game.you.board.length))) return { type: 'board', index: i };
  }
  for (let i = game.you.hand.length - 1; i >= 0; i--) {
    if (inside(p, handCardRect(i, game.you.hand.length))) return { type: 'hand', index: i };
  }
  return null;
}

function currentTarget() {
  if (ui.targetIndex < 0) return { kind: 'hero' };
  return { kind: 'board', index: Math.min(ui.targetIndex, game.foe.board.length - 1) };
}

// Confirm the current selection against its target (keyboard Space/Enter,
// or a mouse click on a target).
function confirmSelection(target) {
  const sel = ui.selected;
  if (!sel) return;
  if (sel.type === 'hand') {
    const res = playCard(game, 'you', sel.index, target);
    if (res.ok) { ui.selected = null; ui.targetIndex = -1; }
    else sfx.click();
    return;
  }
  if (sel.type === 'board') {
    const res = attackWith(game, 'you', sel.index, target);
    if (res.ok) { ui.selected = null; ui.targetIndex = -1; }
    else sfx.click();
  }
}

function onClick(p) {
  const hit = pickAt(p);
  if (game.screen === 'title') {
    startDrone();
    startGame(game);
    sfx.turn();
    ui.selected = null;
    return;
  }
  if (game.screen === 'win' || game.screen === 'loss') {
    startGame(game);
    sfx.turn();
    ui.selected = null;
    return;
  }
  if (game.turn !== 'you' || game.foeBusy) return;
  if (!hit) { ui.selected = null; return; }
  if (hit.type === 'endTurn') {
    sfx.click();
    ui.selected = null;
    endPlayerTurn(game);
    return;
  }
  if (hit.type === 'foeHero' || hit.type === 'foeBoard') {
    if (ui.selected) {
      const target = hit.type === 'foeHero' ? { kind: 'hero' } : { kind: 'board', index: hit.index };
      confirmSelection(target);
    }
    return;
  }
  if (hit.type === 'hand') {
    const card = game.you.hand[hit.index];
    if (!card) return;
    if (ui.selected && ui.selected.type === 'hand' && ui.selected.index === hit.index) {
      ui.selected = null;
      sfx.click();
      return;
    }
    ui.selected = { type: 'hand', index: hit.index };
    ui.targetIndex = -1;
    sfx.select();
    return;
  }
  if (hit.type === 'board') {
    const card = game.you.board[hit.index];
    if (!card || !card.canAttack) { ui.selected = null; return; }
    if (ui.selected && ui.selected.type === 'board' && ui.selected.index === hit.index) {
      ui.selected = null;
      sfx.click();
      return;
    }
    ui.selected = { type: 'board', index: hit.index };
    ui.targetIndex = -1;
    sfx.select();
  }
}

canvas.addEventListener('mousemove', (e) => {
  ui.mouse = toGameCoords(e);
  ui.hover = pickAt(ui.mouse);
});

canvas.addEventListener('click', (e) => {
  ui.mouse = toGameCoords(e);
  onClick(ui.mouse);
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key;
  if (k === 'm' || k === 'M') { toggleMute(); announce(isMuted() ? 'Sound off.' : 'Sound on.'); return; }
  if (game.screen === 'title' && (k === 'Enter' || k === ' ')) {
    startDrone();
    startGame(game);
    sfx.turn();
    e.preventDefault();
    return;
  }
  if ((game.screen === 'win' || game.screen === 'loss') && (k === 'r' || k === 'R' || k === 'Enter' || k === ' ')) {
    startGame(game);
    sfx.turn();
    ui.selected = null;
    e.preventDefault();
    return;
  }
  if (game.screen !== 'play' || game.turn !== 'you' || game.foeBusy) return;
  if (k >= '1' && k <= '7') {
    const i = Number(k) - 1;
    if (game.you.hand[i]) {
      ui.selected = { type: 'hand', index: i };
      ui.targetIndex = -1;
      sfx.select();
    }
    return;
  }
  if (k === 'ArrowLeft' || k === 'ArrowRight') {
    const dir = k === 'ArrowRight' ? 1 : -1;
    if (ui.selected) {
      // Cycle the target: hero, then each rival creature.
      const n = game.foe.board.length + 1;
      ui.targetIndex = ((ui.targetIndex + 1 + dir) % n + n) % n - 1;
      sfx.click();
    } else {
      // Cycle the hand selection.
      const n = game.you.hand.length;
      if (!n) return;
      const cur = ui.selected && ui.selected.type === 'hand' ? ui.selected.index : -1;
      ui.selected = { type: 'hand', index: ((cur + dir) % n + n) % n };
      sfx.select();
    }
    e.preventDefault();
    return;
  }
  if (k === ' ' || k === 'Enter') {
    if (ui.selected) confirmSelection(currentTarget());
    e.preventDefault();
    return;
  }
  if (k === 'e' || k === 'E') {
    ui.selected = null;
    endPlayerTurn(game);
    return;
  }
  if (k === 'Escape') ui.selected = null;
});

// --- Debug / playtest API (window.EC) ---
// The playtest drives the real game through these hooks: real engine calls,
// never poked state — except setLife/setBoard, which stage a position the
// way a long match would reach it, so win/loss paths can be exercised.

function setBoard(side, ids) {
  side.board = ids.map((id) => {
    const def = CARD_BY_ID[id];
    const c = makeCardInstance(def, side.owner);
    c.canAttack = true;
    return c;
  });
}

window.EC = {
  screen: () => game.screen,
  state: () => snapshot(game),
  game: () => game,
  start: () => { startDrone(); startGame(game); },
  newGame: () => startGame(game),
  selectHand: (i) => { ui.selected = { type: 'hand', index: i }; },
  playHand: (i, target) => playCard(game, 'you', i, target ?? { kind: 'hero' }),
  attackBoard: (i, target) => attackWith(game, 'you', i, target ?? { kind: 'hero' }),
  endTurn: () => endPlayerTurn(game),
  setLife: (you, foe) => { game.you.life = you; game.foe.life = foe; },
  setEmber: (n) => { game.you.ember = n; game.you.maxEmber = Math.max(game.you.maxEmber, n); },
  giveCard: (id) => {
    const c = makeCardInstance(CARD_BY_ID[id], 'you');
    game.you.hand.push(c);
    return game.you.hand.length - 1;
  },
  giveCardFoe: (id) => {
    const c = makeCardInstance(CARD_BY_ID[id], 'foe');
    game.foe.hand.push(c);
    return game.foe.hand.length - 1;
  },
  setBoardYou: (ids) => setBoard(game.you, ids),
  setBoardFoe: (ids) => setBoard(game.foe, ids),
  clearBoardYou: () => { game.you.board = []; },
  hurtPlayer: (n) => damageHero(game, 'you', n, 'test'),
  hurtFoe: (n) => damageHero(game, 'foe', n, 'test'),
  // Stage a rich mid-game table for the cover table screenshot.
  setupMidGame: () => {
    game.you.life = 24;
    game.foe.life = 18;
    game.you.ember = 7;
    game.you.maxEmber = 7;
    game.foe.ember = 5;
    game.foe.maxEmber = 6;
    game.turnNumber = 6;
    setBoard(game.you, ['ember-knight', 'thorn-wolf', 'coral-guard']);
    setBoard(game.foe, ['storm-heron', 'flame-imp', 'bramble-sprout']);
    game.you.hand = ['cinder-pup', 'spark-burst', 'gale-kite', 'ember-mend', 'ash-phoenix'].map((id) => makeCardInstance(CARD_BY_ID[id], 'you'));
    game.foe.hand = ['cinder-pup', 'tide-whelp', 'gale-rush', 'thorn-wolf'].map((id) => makeCardInstance(CARD_BY_ID[id], 'foe'));
    game.you.board[0].hp = 3;
    game.foe.board[1].hp = 1;
    game.you.board[1].resonance = 1;
    // A match already in full swing: fresh log lines and earned stats.
    game.log = ['The Rival eyes your Ember Knight...', 'Turn 6 — the court holds its breath.'];
    game.stats = { cardsPlayed: 8, damageDealt: 12, damageTaken: 6, turnsTaken: 5, resonanceTriggers: 2 };
  },
};

// Ember Court — game engine: state, turns, playing cards, combat, AI.
// The engine owns all rules; render.js only draws what it holds, main.js
// only translates input into these calls. Nothing here touches the DOM.

import { CARD_BY_ID, effectiveAtk, elementBeats } from './cards.js';
import { buildDeck, drawCards, takeFromHand, removeFromBoard } from './deck.js';

export const START_LIFE = 30;
export const MAX_BOARD = 5;
export const MAX_HAND = 7;
export const MAX_EMBER = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function newSide(owner) {
  return {
    owner,
    life: START_LIFE,
    ember: 0,
    maxEmber: 0,
    deck: buildDeck(owner),
    hand: [],
    board: [],
    discard: [],
  };
}

export function createGame() {
  return {
    screen: 'title', // title | play | win | loss
    turn: 'you',
    turnNumber: 1,
    you: newSide('you'),
    foe: newSide('foe'),
    log: [],
    events: [],   // sound cues, drained by main.js each frame
    floaters: [], // damage/heal popups: {target, text, color, age}
    stats: { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, turnsTaken: 0, resonanceTriggers: 0 },
    elementsPlayedThisTurn: [],
    winner: null,
    foeBusy: false,
    startedAt: Date.now(),
  };
}

export function pushLog(game, text) {
  game.log.unshift(text);
  if (game.log.length > 5) game.log.length = 5;
}

export function addFloater(game, target, text, color) {
  game.floaters.push({ target, text, color, age: 0 });
  if (game.floaters.length > 12) game.floaters.shift();
}

// Start a fresh match: 3-card opening hands, then the player's first turn.
export function startGame(game) {
  game.you = newSide('you');
  game.foe = newSide('foe');
  game.turn = 'you';
  game.turnNumber = 1;
  game.log = [];
  game.events = [];
  game.floaters = [];
  game.stats = { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, turnsTaken: 0, resonanceTriggers: 0 };
  game.elementsPlayedThisTurn = [];
  game.winner = null;
  game.foeBusy = false;
  game.startedAt = Date.now();
  drawCards(game.you, 3);
  drawCards(game.foe, 3);
  beginTurn(game, 'you');
  game.screen = 'play';
  pushLog(game, 'The court is in session. Your move, Emberlord.');
  game.events.push('turn');
}

// Open a side's turn: +1 max ember (to 10), refill, draw, refresh attacks.
export function beginTurn(game, owner) {
  const side = owner === 'you' ? game.you : game.foe;
  side.maxEmber = Math.min(MAX_EMBER, side.maxEmber + 1);
  side.ember = side.maxEmber;
  for (const c of side.board) { c.canAttack = true; c.justPlayed = false; }
  drawCards(side, 1);
  if (owner === 'you') game.elementsPlayedThisTurn = [];
}

// Deal damage to a hero; returns true if that hero fell.
export function damageHero(game, owner, amount, sourceLabel) {
  const side = owner === 'you' ? game.you : game.foe;
  side.life = Math.max(0, side.life - amount);
  addFloater(game, owner === 'you' ? 'youHero' : 'foeHero', `-${amount}`, '#ff5a4e');
  game.events.push('damage');
  if (owner === 'you') game.stats.damageTaken += amount;
  else game.stats.damageDealt += amount;
  pushLog(game, `${sourceLabel} hits ${owner === 'you' ? 'you' : 'the Rival'} for ${amount}.`);
  return checkEnd(game);
}

export function healHero(game, owner, amount) {
  const side = owner === 'you' ? game.you : game.foe;
  const healed = Math.min(amount, START_LIFE - side.life);
  side.life += healed;
  if (healed > 0) {
    addFloater(game, owner === 'you' ? 'youHero' : 'foeHero', `+${healed}`, '#7dff8a');
    game.events.push('heal');
  }
  return healed;
}

// Has the match ended? Sets the screen and winner, once.
export function checkEnd(game) {
  if (game.screen !== 'play') return game.screen !== 'play';
  if (game.foe.life <= 0) {
    game.screen = 'win';
    game.winner = 'you';
    game.events.push('win');
    pushLog(game, 'The Rival\'s last ember gutters out. Victory!');
    return true;
  }
  if (game.you.life <= 0) {
    game.screen = 'loss';
    game.winner = 'foe';
    game.events.push('loss');
    pushLog(game, 'Your embers scatter on the cold stone. Defeat.');
    return true;
  }
  return false;
}

// --- Playing cards ---

// Play a card from a hand. target is {kind:'hero'} or {kind:'board', index}
// (spells need one; creatures ignore it). Returns {ok, reason?}.
export function playCard(game, owner, handIndex, target) {
  const side = owner === 'you' ? game.you : game.foe;
  const other = owner === 'you' ? game.foe : game.you;
  const card = side.hand[handIndex];
  if (!card) return { ok: false, reason: 'no card there' };
  const def = CARD_BY_ID[card.id];
  if (card.cost > side.ember) return { ok: false, reason: 'not enough ember' };
  if (def.kind === 'creature' && side.board.length >= MAX_BOARD) {
    return { ok: false, reason: 'board is full' };
  }
  if (def.kind === 'spell' && def.dmg > 0 && !target) {
    return { ok: false, reason: 'pick a target' };
  }

  side.ember -= card.cost;
  takeFromHand(side, handIndex);
  game.stats.cardsPlayed += owner === 'you' ? 1 : 0;

  // Resonance: the second card of one element in a turn gains +1 power.
  if (game.elementsPlayedThisTurn.includes(def.element)) {
    card.resonance = 1;
    game.stats.resonanceTriggers += owner === 'you' ? 1 : 0;
    pushLog(game, `Resonance! ${def.name} burns +1.`);
  }
  game.elementsPlayedThisTurn.push(def.element);

  if (def.kind === 'creature') {
    card.canAttack = true;
    card.justPlayed = true;
    side.board.push(card);
    game.events.push('play');
    pushLog(game, `${owner === 'you' ? 'You play' : 'Rival plays'} ${def.name} (${card.atk}/${card.hp}).`);
    return { ok: true };
  }

  // Spell: one-shot, then to the discard pile.
  game.events.push('spell');
  pushLog(game, `${owner === 'you' ? 'You cast' : 'Rival casts'} ${def.name}.`);
  if (def.dmg > 0) {
    if (target.kind === 'hero') {
      damageHero(game, other.owner, def.dmg + card.resonance, def.name);
    } else {
      const victim = other.board[target.index];
      if (victim) damageCreature(game, other, target.index, def.dmg + card.resonance, def.name);
    }
  }
  if (def.heal > 0) healHero(game, owner, def.heal);
  side.discard.push(card);
  checkEnd(game);
  return { ok: true };
}

// Damage one board creature; remove it if it dies.
export function damageCreature(game, side, index, amount, sourceLabel) {
  const card = side.board[index];
  if (!card) return false;
  card.hp -= amount;
  addFloater(game, { board: side.owner, index }, `-${amount}`, '#ff5a4e');
  game.events.push('damage');
  pushLog(game, `${sourceLabel} hits ${CARD_BY_ID[card.id].name} for ${amount}.`);
  if (card.hp <= 0) {
    removeFromBoard(side, index);
    pushLog(game, `${CARD_BY_ID[card.id].name} crumbles to ash.`);
  }
  return true;
}

// --- Combat ---

// A board creature attacks a target: the rival hero or one of its creatures.
// Returns {ok, reason?}.
export function attackWith(game, owner, boardIndex, target) {
  const side = owner === 'you' ? game.you : game.foe;
  const other = owner === 'you' ? game.foe : game.you;
  const attacker = side.board[boardIndex];
  if (!attacker) return { ok: false, reason: 'no attacker there' };
  if (!attacker.canAttack) return { ok: false, reason: 'already attacked' };
  if (target.kind === 'board' && !other.board[target.index]) {
    return { ok: false, reason: 'no target there' };
  }
  attacker.canAttack = false;
  const def = CARD_BY_ID[attacker.id];
  game.events.push('attack');

  if (target.kind === 'hero') {
    const dmg = effectiveAtk(attacker, null);
    pushLog(game, `${def.name} strikes the ${other.owner === 'you' ? 'Emberlord' : 'Rival'} for ${dmg}.`);
    damageHero(game, other.owner, dmg, def.name);
    return { ok: true };
  }

  const defender = other.board[target.index];
  const defDef = CARD_BY_ID[defender.id];
  const atkA = effectiveAtk(attacker, defDef.element);
  const atkD = defender.atk + defender.resonance;
  const advantage = elementBeats(def.element, defDef.element);
  pushLog(game, `${def.name} (${atkA}) clashes with ${defDef.name} (${atkD})${advantage ? ' — element advantage!' : ''}.`);
  defender.hp -= atkA;
  attacker.hp -= atkD;
  addFloater(game, { board: other.owner, index: target.index }, `-${atkA}`, '#ff5a4e');
  addFloater(game, { board: owner, index: boardIndex }, `-${atkD}`, '#ff5a4e');
  // Deaths resolve defender first, then the attacker.
  if (defender.hp <= 0) {
    removeFromBoard(other, target.index);
    pushLog(game, `${defDef.name} crumbles to ash.`);
  }
  if (attacker.hp <= 0) {
    const idx = side.board.indexOf(attacker);
    if (idx >= 0) {
      removeFromBoard(side, idx);
      pushLog(game, `${def.name} crumbles to ash.`);
    }
  }
  checkEnd(game);
  return { ok: true };
}

// --- Turns ---

// The player ends their turn; the Rival acts, then a new player turn opens.
export async function endPlayerTurn(game) {
  if (game.screen !== 'play' || game.turn !== 'you' || game.foeBusy) return;
  game.turn = 'foe';
  game.foeBusy = true;
  game.events.push('turn');
  await foeTakeTurn(game);
  if (game.screen !== 'play') { game.foeBusy = false; return; }
  game.turn = 'you';
  game.turnNumber += 1;
  game.stats.turnsTaken += 1;
  beginTurn(game, 'you');
  game.foeBusy = false;
  game.events.push('turn');
  pushLog(game, `Turn ${game.turnNumber}. ${game.you.ember} ember kindles.`);
}

// --- The Rival AI ---

// The Rival plays its turn in visible steps (with pauses, so the player can
// read its choices): it plays its best affordable cards, then attacks with
// everything it can — preferring kills it can make with element advantage,
// then the weakest creature, then the hero's face when the board is clear.
export async function foeTakeTurn(game) {
  beginTurn(game, 'foe');
  pushLog(game, 'The Rival takes the table...');
  await sleep(550);
  if (game.screen !== 'play') return;

  // Play phase: up to 6 cards, best cost first.
  for (let played = 0; played < 6; played++) {
    if (game.screen !== 'play') return;
    const foe = game.foe;
    const affordable = foe.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.cost <= foe.ember)
      .filter(({ c }) => CARD_BY_ID[c.id].kind === 'spell' || foe.board.length < MAX_BOARD);
    if (affordable.length === 0) break;
    // Lethal first: a damage spell that ends the match.
    const lethal = affordable.find(({ c }) => {
      const d = CARD_BY_ID[c.id];
      return d.kind === 'spell' && d.dmg > 0 && d.dmg + c.resonance >= game.you.life;
    });
    let pick = lethal;
    if (!pick) {
      // Prefer creatures (board presence), then the biggest spell.
      const creatures = affordable.filter(({ c }) => CARD_BY_ID[c.id].kind === 'creature');
      const pool = creatures.length ? creatures : affordable;
      pool.sort((a, b) => b.c.cost - a.c.cost || b.c.atk - a.c.atk);
      pick = pool[0];
      // Heal only when hurt; damage spells go to the face.
      const def = CARD_BY_ID[pick.c.id];
      if (def.kind === 'spell' && def.heal > 0 && !def.dmg && game.foe.life > 24) continue;
    }
    const def = CARD_BY_ID[pick.c.id];
    const target = def.kind === 'spell' && def.dmg > 0 ? { kind: 'hero' } : null;
    playCard(game, 'foe', pick.i, target);
    await sleep(520);
  }

  // Attack phase: every rested creature strikes once.
  for (let i = 0; i < game.foe.board.length; i++) {
    if (game.screen !== 'play') return;
    const attacker = game.foe.board[i];
    if (!attacker || !attacker.canAttack) continue;
    const target = chooseFoeTarget(game, attacker);
    attackWith(game, 'foe', i, target);
    await sleep(520);
  }
  await sleep(350);
}

// Pick the Rival's attack target for one creature.
export function chooseFoeTarget(game, attacker) {
  const atkDef = CARD_BY_ID[attacker.id];
  const victims = game.you.board
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.hp <= effectiveAtk(attacker, CARD_BY_ID[c.id].element));
  if (victims.length) {
    // A kill it can make: prefer the one with element advantage, then weakest.
    victims.sort((a, b) => {
      const advA = elementBeats(atkDef.element, CARD_BY_ID[a.c.id].element) ? 0 : 1;
      const advB = elementBeats(atkDef.element, CARD_BY_ID[b.c.id].element) ? 0 : 1;
      return advA - advB || a.c.hp - b.c.hp;
    });
    return { kind: 'board', index: victims[0].i };
  }
  if (game.you.board.length) {
    // No kill: soften the weakest creature.
    let weakest = 0;
    for (let i = 1; i < game.you.board.length; i++) {
      if (game.you.board[i].hp < game.you.board[weakest].hp) weakest = i;
    }
    return { kind: 'board', index: weakest };
  }
  return { kind: 'hero' };
}

// --- Snapshot (for the UI and the playtest hooks) ---

export function snapshot(game) {
  const slim = (side) => ({
    life: side.life,
    ember: side.ember,
    maxEmber: side.maxEmber,
    deck: side.deck.length,
    hand: side.hand.map((c) => ({ id: c.id, cost: c.cost, atk: c.atk, hp: c.hp, resonance: c.resonance, canAttack: c.canAttack })),
    board: side.board.map((c) => ({ id: c.id, atk: c.atk, hp: c.hp, resonance: c.resonance, canAttack: c.canAttack })),
  });
  return {
    screen: game.screen,
    turn: game.turn,
    turnNumber: game.turnNumber,
    you: slim(game.you),
    foe: slim(game.foe),
    stats: { ...game.stats },
    foeBusy: game.foeBusy,
    winner: game.winner,
    log: [...game.log],
  };
}

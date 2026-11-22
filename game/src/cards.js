// Ember Court — card definitions.
// Every card in the game is defined here: its element, cost, power and art
// identity. The four elements form an advantage cycle: Flame burns Thorn,
// Thorn drinks Tide, Tide drowns Gale, Gale fans Flame. An attacker whose
// element beats its target's deals +1 damage. Suits are told apart by colour
// AND shape, never by text alone.

// Element ids, in advantage-cycle order: each beats the next one.
export const ELEMENTS = ['flame', 'tide', 'thorn', 'gale'];

export const ELEMENT_INFO = {
  flame: { name: 'Flame', color: '#e8491d', dark: '#8f1d05', light: '#ffb347', glyph: 'flame' },
  tide:  { name: 'Tide',  color: '#1d7fe8', dark: '#0a3a75', light: '#7fd4ff', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#3da33d', dark: '#14521c', light: '#9be15d', glyph: 'leaf' },
  gale:  { name: 'Gale',  color: '#e8b91d', dark: '#7a5c05', light: '#ffe98a', glyph: 'swirl' },
};

// The element this one beats (the next in the cycle).
export function elementBeats(a, b) {
  const i = ELEMENTS.indexOf(a);
  const j = ELEMENTS.indexOf(b);
  return (i + 1) % ELEMENTS.length === j;
}

// kind: 'creature' (stays on the table, attacks) or 'spell' (one-shot).
// Creatures: atk = damage it deals, hp = life it can take.
// Spells: dmg = damage to a target, heal = life restored to its owner.
export const CARD_DEFS = [
  // --- 1-cost creatures ---
  { id: 'cinder-pup',    name: 'Cinder Pup',     kind: 'creature', element: 'flame', cost: 1, atk: 2, hp: 1, text: 'A yapping spark.' },
  { id: 'tide-whelp',    name: 'Tide Whelp',     kind: 'creature', element: 'tide',  cost: 1, atk: 1, hp: 2, text: 'Slippery little thing.' },
  { id: 'bramble-sprout',name: 'Bramble Sprout', kind: 'creature', element: 'thorn', cost: 1, atk: 1, hp: 3, text: 'Prickly, patient.' },
  // --- 2-cost creatures ---
  { id: 'gale-kite',     name: 'Gale Kite',      kind: 'creature', element: 'gale',  cost: 2, atk: 3, hp: 2, text: 'Rides the high wind.' },
  { id: 'flame-imp',     name: 'Flame Imp',      kind: 'creature', element: 'flame', cost: 2, atk: 3, hp: 1, text: 'Laughs as it burns.' },
  { id: 'coral-guard',   name: 'Coral Guard',    kind: 'creature', element: 'tide',  cost: 2, atk: 2, hp: 3, text: 'A reef that walks.' },
  // --- 3-cost creatures ---
  { id: 'thorn-wolf',    name: 'Thorn Wolf',     kind: 'creature', element: 'thorn', cost: 3, atk: 4, hp: 3, text: 'Howls through hedges.' },
  { id: 'ember-knight',  name: 'Ember Knight',   kind: 'creature', element: 'flame', cost: 3, atk: 3, hp: 4, text: 'Oathbound to the hearth.' },
  { id: 'storm-heron',   name: 'Storm Heron',    kind: 'creature', element: 'gale',  cost: 4, atk: 5, hp: 4, text: 'Lightning on wings.' },
  // --- big creatures ---
  { id: 'deep-leviathan',name: 'Deep Leviathan', kind: 'creature', element: 'tide',  cost: 5, atk: 6, hp: 6, text: 'The tide, given teeth.' },
  { id: 'ash-phoenix',   name: 'Ash Phoenix',    kind: 'creature', element: 'flame', cost: 5, atk: 7, hp: 4, text: 'Dies bright, returns brighter.' },
  { id: 'elder-oakheart',name: 'Elder Oakheart', kind: 'creature', element: 'thorn', cost: 6, atk: 6, hp: 8, text: 'Older than the court.' },
  { id: 'sky-serpent',   name: 'Sky Serpent',    kind: 'creature', element: 'gale',  cost: 6, atk: 8, hp: 5, text: 'A hurricane with eyes.' },
  // --- spells ---
  { id: 'gale-rush',     name: 'Gale Rush',      kind: 'spell', element: 'gale',  cost: 1, dmg: 2, text: 'A slap of cold wind.' },
  { id: 'spark-burst',   name: 'Spark Burst',    kind: 'spell', element: 'flame', cost: 2, dmg: 3, text: 'Three sparks, one bang.' },
  { id: 'thorn-snare',   name: 'Thorn Snare',    kind: 'spell', element: 'thorn', cost: 2, dmg: 2, heal: 3, text: 'Vines bite, roots mend.' },
  { id: 'ember-mend',    name: 'Ember Mend',     kind: 'spell', element: 'flame', cost: 2, heal: 6, text: 'Warmth knits the wounds.' },
  { id: 'tidal-surge',   name: 'Tidal Surge',    kind: 'spell', element: 'tide',  cost: 3, dmg: 4, text: 'The whole sea, at once.' },
  { id: 'stillwater-blessing', name: 'Stillwater Blessing', kind: 'spell', element: 'tide', cost: 3, heal: 8, text: 'Calm water, calm heart.' },
];

export const CARD_BY_ID = Object.fromEntries(CARD_DEFS.map((c) => [c.id, c]));

// How many copies of each card go into a 30-card deck.
export const DECK_LIST = [
  ['cinder-pup', 2], ['tide-whelp', 2], ['bramble-sprout', 2],
  ['gale-kite', 2], ['flame-imp', 2], ['coral-guard', 2],
  ['thorn-wolf', 2], ['ember-knight', 2], ['storm-heron', 1],
  ['deep-leviathan', 1], ['ash-phoenix', 1], ['elder-oakheart', 1], ['sky-serpent', 1],
  ['gale-rush', 2], ['spark-burst', 2], ['thorn-snare', 1],
  ['ember-mend', 1], ['tidal-surge', 1], ['stillwater-blessing', 1],
];

export function deckSize() {
  return DECK_LIST.reduce((n, [, c]) => n + c, 0);
}

// --- Helpers over the card pool ---

// A fresh card instance: a def plus its live state on the table or in hand.
export function makeCardInstance(def, owner) {
  return {
    uid: `${owner}-${def.id}-${Math.random().toString(36).slice(2, 8)}`,
    id: def.id,
    owner,
    cost: def.cost,
    atk: def.atk ?? 0,
    hp: def.hp ?? 0,
    maxHp: def.hp ?? 0,
    dmg: def.dmg ?? 0,
    heal: def.heal ?? 0,
    // Render position (lerped toward its slot each frame for the slide feel).
    x: 640, y: 360, tx: 640, ty: 360,
    canAttack: false,
    justPlayed: false,
    // Resonance bonus granted this turn (+1 power while it lasts).
    resonance: 0,
  };
}

export function cardDef(card) {
  return CARD_BY_ID[card.id];
}

// Power of a creature right now, including element advantage and resonance.
export function effectiveAtk(card, targetElement) {
  let atk = card.atk + card.resonance;
  if (targetElement && elementBeats(cardDef(card).element, targetElement)) atk += 1;
  return atk;
}

// One-line rules reminder shown on the title screen and the help line.
export const RULES_BLURB = 'Flame beats Thorn · Thorn beats Tide · Tide beats Gale · Gale beats Flame — +1 attack. Play two cards of one element in a turn: the second gains +1 power (Resonance).';

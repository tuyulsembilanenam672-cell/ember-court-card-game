// Ember Court — deck building and drawing.
// A deck is a shuffled stack of card instances; drawing pops from the top.
// When the deck runs out it reshuffles the discard pile (minus nothing —
// every card that left play goes back in, so games always end by life).

import { CARD_BY_ID, DECK_LIST, makeCardInstance } from './cards.js';

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build a fresh 30-card deck for one side, shuffled.
export function buildDeck(owner) {
  const deck = [];
  for (const [id, count] of DECK_LIST) {
    const def = CARD_BY_ID[id];
    for (let i = 0; i < count; i++) deck.push(makeCardInstance(def, owner));
  }
  return shuffleInPlace(deck);
}

// Draw n cards from a side's deck into its hand (max 7 in hand; extras burn).
// Returns the cards actually drawn.
export function drawCards(side, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffleInPlace(side.discard.splice(0));
    }
    const card = side.deck.pop();
    if (side.hand.length < 7) {
      side.hand.push(card);
      drawn.push(card);
    } else {
      side.discard.push(card); // hand full: the card burns.
    }
  }
  return drawn;
}

// Remove a card from a hand by index and return it (or null).
export function takeFromHand(side, index) {
  if (index < 0 || index >= side.hand.length) return null;
  return side.hand.splice(index, 1)[0];
}

// Remove a board creature by index and send it to the discard pile.
export function removeFromBoard(side, index) {
  if (index < 0 || index >= side.board.length) return null;
  const card = side.board.splice(index, 1)[0];
  side.discard.push(card);
  return card;
}

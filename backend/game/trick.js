// backend/game/trick.js

const RANK_PRIORITY = {
  "2":1,"3":2,"4":3,"5":4,"6":5,"7":6,
  "8":7,"9":8,"10":9,"J":10,"Q":11,"K":12,"A":13
};

function getSuit(card) { return card.split("_")[0]; }
function getRank(card) { return card.split("_")[1]; }

// Returns true if the card can legally be played given the current hand and lead suit
function canPlayCard(hand, card, leadSuit) {
  if (!hand.includes(card)) return false;
  if (!leadSuit) return true; // first card of trick — any card allowed

  const cardSuit = getSuit(card);
  const hasLeadSuit = hand.some(c => getSuit(c) === leadSuit);

  // Must follow suit if you have it
  if (hasLeadSuit && cardSuit !== leadSuit) return false;
  return true;
}

// Returns the winning play from a completed trick
function resolveTrick(trick, leadSuit, trumpSuit) {
  // trumpSuit is null in No Trump mode

  if (trumpSuit) {
    const trumpPlays = trick.filter(p => getSuit(p.card) === trumpSuit);
    if (trumpPlays.length > 0) {
      return trumpPlays.reduce((best, curr) =>
        RANK_PRIORITY[getRank(curr.card)] > RANK_PRIORITY[getRank(best.card)] ? curr : best
      );
    }
  }

  // No trump played (or No Trump mode) — highest card of lead suit wins
  const leadPlays = trick.filter(p => getSuit(p.card) === leadSuit);
  return leadPlays.reduce((best, curr) =>
    RANK_PRIORITY[getRank(curr.card)] > RANK_PRIORITY[getRank(best.card)] ? curr : best
  );
}

module.exports = { canPlayCard, resolveTrick };
// backend/game/deck.js
// Card format throughout the entire project: "SUIT_RANK"
// e.g. "SPADES_A", "HEARTS_10", "CLUBS_J", "DIAMONDS_3"

const SUITS = ["SPADES", "HEARTS", "CLUBS", "DIAMONDS"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function getCardPoints(suit, rank) {
  if (suit === "SPADES" && rank === "3") return 30; // Kaari Teedi — highest value card
  if (rank === "5") return 5;
  if (["10","J","Q","K","A"].includes(rank)) return 10;
  return 0;
}

function createSingleDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push(`${suit}_${rank}`);
  return deck;
}

function createGameDeck(decks) {
  let full = [];
  for (let i = 0; i < decks; i++) full = full.concat(createSingleDeck());
  return full;
}

// Remove zero-point cards to make hand sizes equal
function prepareDeck(players, decks) {
  let deck = createGameDeck(decks);
  const remainder = deck.length % players;
  if (remainder === 0) return deck;
  let removed = 0;
  for (let i = deck.length - 1; i >= 0 && removed < remainder; i--) {
    const [suit, rank] = deck[i].split("_");
    if (getCardPoints(suit, rank) === 0) { deck.splice(i, 1); removed++; }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealCards(players, decks) {
  const deck = shuffleDeck(prepareDeck(players, decks));
  const perPlayer = deck.length / players;
  const hands = {};
  for (let p = 1; p <= players; p++)
    hands[`player${p}`] = deck.slice((p - 1) * perPlayer, p * perPlayer);
  return hands;
}

function getCardPointsFromString(card) {
  const [suit, rank] = card.split("_");
  return getCardPoints(suit, rank);
}

module.exports = { dealCards, getCardPoints: getCardPointsFromString };
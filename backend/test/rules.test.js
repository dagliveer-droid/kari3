const test = require("node:test");
const assert = require("node:assert/strict");

const { canPlayCard, resolveTrick } = require("../game/trick");
const { getCardPoints, dealCards } = require("../game/deck");
const { trickPoints } = require("../game/scoring");
const createGameConfig = require("../game/config");

test("canPlayCard - must follow lead suit if held", () => {
  const hand = ["SPADES_10", "HEARTS_A", "CLUBS_5"];

  // First card of trick — any card allowed
  assert.equal(canPlayCard(hand, "HEARTS_A", null), true);

  // Lead suit HEARTS, holds HEARTS — must play HEARTS
  assert.equal(canPlayCard(hand, "HEARTS_A", "HEARTS"), true);
  assert.equal(canPlayCard(hand, "SPADES_10", "HEARTS"), false);

  // Lead suit DIAMONDS, holds no DIAMONDS — can play any card in hand
  assert.equal(canPlayCard(hand, "SPADES_10", "DIAMONDS"), true);
  assert.equal(canPlayCard(hand, "CLUBS_5", "DIAMONDS"), true);

  // Card not in hand — invalid
  assert.equal(canPlayCard(hand, "DIAMONDS_K", null), false);
});

test("resolveTrick - trump beats lead, highest lead-suit wins when no trump, No Trump mode", () => {
  const p1 = { player: "p1", card: "HEARTS_10" };
  const p2 = { player: "p2", card: "HEARTS_K" };
  const p3 = { player: "p3", card: "SPADES_2" }; // trump
  const p4 = { player: "p4", card: "HEARTS_A" };

  // Highest lead suit card when no trump played (lead = HEARTS, trump = CLUBS)
  const trickNoTrumpPlayed = [p1, p2, p4];
  assert.deepEqual(resolveTrick(trickNoTrumpPlayed, "HEARTS", "CLUBS"), p4);

  // Trump card beats lead suit (lead = HEARTS, trump = SPADES)
  const trickWithTrump = [p1, p2, p3, p4];
  assert.deepEqual(resolveTrick(trickWithTrump, "HEARTS", "SPADES"), p3);

  // No Trump mode (trumpSuit = null) — highest lead suit card wins
  assert.deepEqual(resolveTrick(trickWithTrump, "HEARTS", null), p4);
});

test("getCardPoints and trickPoints", () => {
  assert.equal(getCardPoints("SPADES_3"), 30);
  assert.equal(getCardPoints("HEARTS_5"), 5);
  assert.equal(getCardPoints("CLUBS_10"), 10);
  assert.equal(getCardPoints("DIAMONDS_J"), 10);
  assert.equal(getCardPoints("SPADES_Q"), 10);
  assert.equal(getCardPoints("HEARTS_K"), 10);
  assert.equal(getCardPoints("CLUBS_A"), 10);
  assert.equal(getCardPoints("SPADES_2"), 0);
  assert.equal(getCardPoints("DIAMONDS_7"), 0);

  const trick = [
    { player: "p1", card: "SPADES_3" }, // 30
    { player: "p2", card: "HEARTS_5" },  // 5
    { player: "p3", card: "CLUBS_10" },  // 10
    { player: "p4", card: "DIAMONDS_2" } // 0
  ];
  assert.equal(trickPoints(trick), 45);
});

test("createGameConfig for 5..11 players", () => {
  assert.throws(() => createGameConfig(4), /Players must be between 5 and 11/);
  assert.throws(() => createGameConfig(12), /Players must be between 5 and 11/);

  // 5-7 players: 1 deck, minBid 125, totalPoints 250
  assert.deepEqual(createGameConfig(5), { players: 5, decks: 1, minBid: 125, partners: 1, totalPoints: 250 });
  assert.deepEqual(createGameConfig(6), { players: 6, decks: 1, minBid: 125, partners: 1, totalPoints: 250 });
  assert.deepEqual(createGameConfig(7), { players: 7, decks: 1, minBid: 125, partners: 2, totalPoints: 250 });

  // 8-11 players
  assert.deepEqual(createGameConfig(8), { players: 8, decks: 2, minBid: 250, partners: 2, totalPoints: 500 });
  assert.deepEqual(createGameConfig(9), { players: 9, decks: 2, minBid: 250, partners: 2, totalPoints: 500 });
  assert.deepEqual(createGameConfig(10), { players: 10, decks: 2, minBid: 250, partners: 3, totalPoints: 500 });
  assert.deepEqual(createGameConfig(11), { players: 11, decks: 2, minBid: 250, partners: 3, totalPoints: 500 });
});

test("dealCards - equal card counts and deck limit validation", () => {
  for (let numPlayers = 5; numPlayers <= 11; numPlayers++) {
    const config = createGameConfig(numPlayers);
    const hands = dealCards(numPlayers, config.decks);

    const playerKeys = Object.keys(hands);
    assert.equal(playerKeys.length, numPlayers);

    const firstHandSize = hands[playerKeys[0]].length;
    const cardCounts = {};

    for (const key of playerKeys) {
      assert.equal(hands[key].length, firstHandSize);
      for (const card of hands[key]) {
        cardCounts[card] = (cardCounts[card] || 0) + 1;
      }
    }

    for (const card in cardCounts) {
      assert.ok(cardCounts[card] <= config.decks, `Card ${card} count ${cardCounts[card]} exceeds ${config.decks}`);
    }
  }
});

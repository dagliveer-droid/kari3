const createGameConfig = require("./game/config");

console.log(createGameConfig(5));
console.log(createGameConfig(7));
console.log(createGameConfig(9));
console.log(createGameConfig(11));
const { createGameDeck } = require("./game/deck");

// Test 1 deck
const oneDeck = createGameDeck(1);
console.log("1 deck cards:", oneDeck.length);

// Test 2 decks
const twoDecks = createGameDeck(2);
console.log("2 deck cards:", twoDecks.length);

// Check some special cards
const kali3 = oneDeck.find(c => c.suit === "♠" && c.rank === "3");
console.log("Kali 3:", kali3);

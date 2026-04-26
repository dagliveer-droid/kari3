const { dealCards } = require("./game/deck");

const players = 9;
const decks = players <= 7 ? 1 : 2;

const hands = dealCards(players, decks);

for (const player in hands) {
  console.log(player, "has", hands[player].length, "cards");
}

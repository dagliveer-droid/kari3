const { dealCards } = require("./game/deck");

function test(players) {
  const decks = players <= 7 ? 1 : 2;
  const hands = dealCards(players, decks);
  const totalCards = Object.values(hands).reduce((sum, h) => sum + h.length, 0);

  console.log("Players:", players);
  console.log("Total cards:", totalCards);
  console.log("Cards per player:", hands.player1.length);
  console.log("----");
}

test(5);
test(6);
test(7);
test(9);
test(11);


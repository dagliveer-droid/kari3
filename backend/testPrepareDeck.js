const { prepareDeckForPlayers } = require("./game/deck");

function test(players) {
  const decks = players <= 7 ? 1 : 2;
  const deck = prepareDeckForPlayers(players, decks);

  console.log("Players:", players);
  console.log("Total cards:", deck.length);
  console.log("Cards per player:", deck.length / players);
  console.log("----");
}

test(5);
test(6);
test(7);
test(9);
test(11);

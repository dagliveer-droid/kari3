// backend/game/config.js

function createGameConfig(players) {
  if (players < 5 || players > 11) {
    throw new Error("Players must be between 5 and 11");
  }

  const decks = players <= 7 ? 1 : 2;
  const totalPoints = decks === 1 ? 250 : 500;
  const minBid = decks === 1 ? 125 : 250;

  // Number of partner cards the bid winner calls
  let partners;
  if (players <= 6) partners = 1;
  else if (players <= 9) partners = 2;
  else partners = 3;

  return { players, decks, minBid, partners, totalPoints };
}

module.exports = createGameConfig;
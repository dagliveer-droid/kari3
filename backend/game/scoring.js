// backend/game/scoring.js

const { getCardPoints } = require("./deck");

function trickPoints(trick) {
  return trick.reduce((sum, play) => sum + getCardPoints(play.card), 0);
}

module.exports = { trickPoints };
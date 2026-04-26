// frontend/src/constants.js

export const SUIT_SYMBOLS = {
  SPADES: "♠", HEARTS: "♥", CLUBS: "♣", DIAMONDS: "♦",
};

export const SUIT_NAMES = {
  SPADES: "Spades", HEARTS: "Hearts", CLUBS: "Clubs", DIAMONDS: "Diamonds",
};

export const RANK_NAMES = {
  "2":"2","3":"3","4":"4","5":"5","6":"6","7":"7",
  "8":"8","9":"9","10":"10","J":"jack","Q":"queen","K":"king","A":"ace",
};

export const ALL_CARDS = [];
["SPADES","HEARTS","CLUBS","DIAMONDS"].forEach(suit =>
  ["2","3","4","5","6","7","8","9","10","J","Q","K","A"].forEach(rank =>
    ALL_CARDS.push(`${suit}_${rank}`)
  )
);

// Converts internal card string to PNG filename
// e.g. "SPADES_A" → "/public/cards/ace_of_spades.png"
export function cardToImage(card) {
  const [suit, rank] = card.split("_");
  return `/cards/${RANK_NAMES[rank]}_of_${suit.toLowerCase()}.png`;
}

export function formatCard(card) {
  const [suit, rank] = card.split("_");
  return `${rank}${SUIT_SYMBOLS[suit]}`;
}

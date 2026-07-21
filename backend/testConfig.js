const createGameConfig = require("./game/config");
const { dealCards } = require("./game/deck");

console.log("Config 5 players:", createGameConfig(5));
console.log("Config 7 players:", createGameConfig(7));
console.log("Config 9 players:", createGameConfig(9));
console.log("Config 11 players:", createGameConfig(11));

const hands1 = dealCards(5, 1);
console.log("1 deck hands count:", Object.keys(hands1).length);

const hands2 = dealCards(9, 2);
console.log("2 deck hands count:", Object.keys(hands2).length);


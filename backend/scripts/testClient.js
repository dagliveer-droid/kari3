const { io } = require("socket.io-client");

let ROOM = null;

const A = io("http://localhost:3000");
const B = io("http://localhost:3000");
const C = io("http://localhost:3000");
const D = io("http://localhost:3000");
const E = io("http://localhost:3000");

// CREATE ROOM
A.on("connect", () => A.emit("create_room"));

A.on("room_created", (d) => {
  ROOM = d.roomCode;
  console.log("Room:", ROOM);

  setTimeout(() => {
    B.emit("join_room", ROOM);
    C.emit("join_room", ROOM);
    D.emit("join_room", ROOM);
    E.emit("join_room", ROOM);
  }, 300);

  setTimeout(() => {
    A.emit("start_game", ROOM);
    A.emit("start_bidding", ROOM);

    setTimeout(() => A.emit("pass_bid", ROOM), 500);
    setTimeout(() => B.emit("place_bid", { roomCode: ROOM, bid: 135 }), 1000);
    setTimeout(() => C.emit("pass_bid", ROOM), 1500);
    setTimeout(() => D.emit("pass_bid", ROOM), 2000);
    setTimeout(() => E.emit("pass_bid", ROOM), 2500);
    setTimeout(() => A.emit("pass_bid", ROOM), 3000);
  }, 1000);
});

// ONLY WINNER SELECTS PARTNERS
B.on("bidding_ended", (data) => {
  console.log(`🏆 Player${data.winner} won bidding with ${data.bid}`);

  B.emit("choose_partners", {
    roomCode: ROOM,
    cards: ["KARI_A", "LAAL_K"],
  });
});

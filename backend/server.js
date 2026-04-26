const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { dealCards } = require("./game/deck");
const { canPlayCard, resolveTrick } = require("./game/trick");
const { trickPoints } = require("./game/scoring");
const createGameConfig = require("./game/config");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const rooms = {};
const socketSessions = {};
const DISCONNECT_GRACE_MS = 60_000;

app.use(express.static(path.join(__dirname, "../frontend/dist")));

function generateId(prefix = "") {
  return `${prefix}${Math.random().toString(36).substring(2, 10)}`;
}

function generateRoomCode() {
  let roomCode;
  do {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  } while (rooms[roomCode]);
  return roomCode;
}

function sendError(socket, message) {
  socket.emit("game_error", { message });
}

function getSocketForPlayer(room, playerId) {
  const socketId = room.sockets[playerId];
  return socketId ? io.sockets.sockets.get(socketId) : null;
}

function updatePauseState(room) {
  if (room.phase === "waiting" || room.phase === "gameover") {
    room.paused = false;
    room.pauseReason = null;
    return;
  }

  const disconnectedPlayers = room.players.filter(id => room.disconnected.has(id));
  if (disconnectedPlayers.length === 0) {
    room.paused = false;
    room.pauseReason = null;
    return;
  }

  room.paused = true;
  room.pauseReason = `Waiting for ${disconnectedPlayers.map(id => room.names[id]).join(", ")} to reconnect`;
}

function getCurrentTurn(room) {
  if (room.players.length === 0) return null;
  return room.players[(room.leaderIndex + room.trick.length) % room.players.length];
}

function broadcastRoomState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  io.to(roomCode).emit("room_state", {
    players: room.players.map(id => ({
      id,
      name: room.names[id],
      connected: !room.disconnected.has(id),
    })),
    hostId: room.hostId,
    phase: room.phase,
    currentBidder: room.currentBidder,
    highestBid: room.highestBid,
    highestBidder: room.highestBidder,
    trump: room.trump,
    trick: room.trick,
    leadSuit: room.leadSuit,
    scores: room.scores,
    teamScores: room.teamScores,
    currentTurn: getCurrentTurn(room),
    revealedPartners: room.revealedPartners,
    bidTeam: room.bidTeam,
    gameOver: room.gameOver,
    gameResult: room.gameResult,
    config: room.config,
    paused: room.paused,
    pauseReason: room.pauseReason,
  });
}

function sendHands(room) {
  room.players.forEach(playerId => {
    const playerSocket = getSocketForPlayer(room, playerId);
    if (playerSocket) {
      playerSocket.emit("your_hand", room.hands[playerId] || []);
    }
  });
}

function emitPrivateHand(room, playerId) {
  const playerSocket = getSocketForPlayer(room, playerId);
  if (playerSocket) {
    playerSocket.emit("your_hand", room.hands[playerId] || []);
  }
}

function buildGameOverResult(room, message, bidWon) {
  const oppTeam = room.players.filter(id => !room.bidTeam.includes(id));
  return {
    bidTeam: room.bidTeam.map(id => room.names[id]),
    oppTeam: oppTeam.map(id => room.names[id]),
    bidAmount: room.highestBid,
    bidTeamScore: room.teamScores.bidTeam,
    oppTeamScore: room.teamScores.oppTeam,
    bidWon,
    message,
  };
}

function endGame(room, roomCode, messageOverride = null, bidWonOverride = null) {
  room.phase = "gameover";
  room.gameOver = true;
  room.paused = false;
  room.pauseReason = null;

  const bidWon = bidWonOverride ?? (room.teamScores.bidTeam >= room.highestBid);
  const message = messageOverride || (
    bidWon
      ? `Bid team won! Scored ${room.teamScores.bidTeam} vs bid of ${room.highestBid}`
      : `Bid team lost! Scored ${room.teamScores.bidTeam} but needed ${room.highestBid}`
  );

  room.gameResult = buildGameOverResult(room, message, bidWon);
  io.to(roomCode).emit("game_over", room.gameResult);
  broadcastRoomState(roomCode);
}

function clearDisconnectTimer(room, playerId) {
  if (!room.disconnectTimers[playerId]) return;
  clearTimeout(room.disconnectTimers[playerId]);
  delete room.disconnectTimers[playerId];
}

function scheduleDisconnectExpiry(roomCode, playerId) {
  const room = rooms[roomCode];
  if (!room) return;

  clearDisconnectTimer(room, playerId);
  room.disconnectTimers[playerId] = setTimeout(() => {
    const liveRoom = rooms[roomCode];
    if (!liveRoom || !liveRoom.disconnected.has(playerId) || liveRoom.gameOver) return;
    endGame(liveRoom, roomCode, `${liveRoom.names[playerId]} did not reconnect in time. Game ended.`, false);
  }, DISCONNECT_GRACE_MS);
}

function createRoomState(hostPlayerId, hostSocketId, hostName) {
  return {
    players: [hostPlayerId],
    hostId: hostPlayerId,
    names: { [hostPlayerId]: hostName || "Player 1" },
    sockets: { [hostPlayerId]: hostSocketId },
    hands: {},
    phase: "waiting",
    currentBidder: null,
    highestBid: 0,
    highestBidder: null,
    trump: null,
    partnerCardTracker: {},
    trick: [],
    leadSuit: null,
    leaderIndex: 0,
    scores: {},
    teamScores: { bidTeam: 0, oppTeam: 0 },
    bidTeam: [],
    revealedPartners: [],
    gameOver: false,
    gameResult: null,
    config: null,
    passedPlayers: new Set(),
    disconnected: new Set(),
    disconnectTimers: {},
    paused: false,
    pauseReason: null,
    viewingCountdown: 15,
  };
}

function startTrumpSelection(room, roomCode) {
  room.phase = "trump";
  broadcastRoomState(roomCode);

  const bidderSocket = getSocketForPlayer(room, room.highestBidder);
  if (bidderSocket) {
    bidderSocket.emit("select_trump");
  }
}

function advanceBidder(room, roomCode) {
  const activePlayers = room.players.filter(id => !room.passedPlayers.has(id));

  if (activePlayers.length === 1) {
    if (!room.highestBidder) {
      room.highestBidder = room.players[0];
      room.highestBid = room.config.minBid;
    }
    startTrumpSelection(room, roomCode);
    return;
  }

  let idx = room.players.indexOf(room.currentBidder);
  do {
    idx = (idx + 1) % room.players.length;
  } while (room.passedPlayers.has(room.players[idx]));

  room.currentBidder = room.players[idx];
  broadcastRoomState(roomCode);
}

function validatePartnerCards(cards, room) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return "Choose at least one partner card";
  }

  const totalQty = cards.reduce((sum, card) => sum + card.quantity, 0);
  if (totalQty !== room.config.partners) {
    return `Total partner slots must equal ${room.config.partners}`;
  }

  const seenCards = new Set();
  for (const entry of cards) {
    if (!entry || typeof entry.card !== "string" || !Number.isInteger(entry.quantity)) {
      return "Invalid partner selection";
    }
    if (entry.quantity < 1 || entry.quantity > room.config.decks) {
      return `Quantity for ${entry.card} must be 1-${room.config.decks}`;
    }
    if (seenCards.has(entry.card)) {
      return `Duplicate partner card: ${entry.card}`;
    }
    seenCards.add(entry.card);
  }

  return null;
}

function attachSession(socketId, roomCode, playerId) {
  socketSessions[socketId] = { roomCode, playerId };
}

function getSession(socketId) {
  return socketSessions[socketId];
}

function removeWaitingPlayer(roomCode, playerId) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players = room.players.filter(id => id !== playerId);
  delete room.names[playerId];
  delete room.sockets[playerId];
  delete room.hands[playerId];
  delete room.scores[playerId];
  room.passedPlayers.delete(playerId);
  room.bidTeam = room.bidTeam.filter(id => id !== playerId);
  room.revealedPartners = room.revealedPartners.filter(id => id !== playerId);
  clearDisconnectTimer(room, playerId);

  if (room.hostId === playerId) {
    room.hostId = room.players[0] || null;
  }

  if (room.players.length === 0) {
    delete rooms[roomCode];
    return;
  }

  broadcastRoomState(roomCode);
}

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("create_room", ({ name }) => {
    const roomCode = generateRoomCode();
    const playerId = generateId("p_");

    rooms[roomCode] = createRoomState(playerId, socket.id, name);
    attachSession(socket.id, roomCode, playerId);

    socket.join(roomCode);
    socket.emit("room_created", { roomCode, playerId });
    broadcastRoomState(roomCode);
  });

  socket.on("join_room", ({ roomCode, name }) => {
    const room = rooms[roomCode];
    if (!room) return sendError(socket, "Room not found");
    if (room.phase !== "waiting") return sendError(socket, "Game already started");
    if (room.players.length >= 11) return sendError(socket, "Room is full (max 11)");

    const playerId = generateId("p_");
    room.players.push(playerId);
    room.names[playerId] = name || `Player ${room.players.length}`;
    room.sockets[playerId] = socket.id;

    attachSession(socket.id, roomCode, playerId);
    socket.join(roomCode);
    socket.emit("joined_room", { roomCode, playerId });
    broadcastRoomState(roomCode);
  });

  socket.on("reconnect_room", ({ roomCode, playerId, name }) => {
    const room = rooms[roomCode];
    if (!room || !playerId || !room.players.includes(playerId)) {
      socket.emit("reconnect_failed");
      return;
    }

    room.sockets[playerId] = socket.id;
    if (name) room.names[playerId] = name;
    room.disconnected.delete(playerId);
    clearDisconnectTimer(room, playerId);
    updatePauseState(room);

    attachSession(socket.id, roomCode, playerId);
    socket.join(roomCode);
    socket.emit("reconnected_room", { roomCode, playerId });
    emitPrivateHand(room, playerId);
    broadcastRoomState(roomCode);
  });

  socket.on("start_game", ({ roomCode }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode) return;
    if (room.phase !== "waiting") return sendError(socket, "Game already started");
    if (room.hostId !== session.playerId) return sendError(socket, "Only host can start");
    if (room.players.length < 5) return sendError(socket, "Need at least 5 players");

    room.config = createGameConfig(room.players.length);
    const hands = dealCards(room.players.length, room.config.decks);

    room.players.forEach((playerId, index) => {
      room.hands[playerId] = hands[`player${index + 1}`];
      room.scores[playerId] = 0;
      room.disconnected.delete(playerId);
      clearDisconnectTimer(room, playerId);
    });

    room.highestBid = room.config.minBid - 5;
    room.highestBidder = null;
    room.currentBidder = room.players[0];
    room.partnerCardTracker = {};
    room.trump = null;
    room.trick = [];
    room.leadSuit = null;
    room.leaderIndex = 0;
    room.teamScores = { bidTeam: 0, oppTeam: 0 };
    room.bidTeam = [];
    room.revealedPartners = [];
    room.passedPlayers = new Set();
    room.phase = "viewing";
    room.gameOver = false;
    room.gameResult = null;
    room.paused = false;
    room.pauseReason = null;
    room.viewingCountdown = 15;

    sendHands(room);
    broadcastRoomState(roomCode);

    const countdownInterval = setInterval(() => {
      const liveRoom = rooms[roomCode];
      if (!liveRoom) {
        clearInterval(countdownInterval);
        return;
      }
      if (liveRoom.phase !== "viewing") {
        clearInterval(countdownInterval);
        return;
      }
      if (liveRoom.paused) return;

      liveRoom.viewingCountdown -= 1;
      io.to(roomCode).emit("viewing_countdown", { seconds: liveRoom.viewingCountdown });

      if (liveRoom.viewingCountdown <= 0) {
        clearInterval(countdownInterval);
        liveRoom.phase = "bidding";
        broadcastRoomState(roomCode);
      }
    }, 1000);
  });

  socket.on("place_bid", ({ roomCode, bid }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "bidding") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (room.currentBidder !== session.playerId) return;

    const minNext = room.highestBid + 5;
    if (bid < minNext || bid > room.config.totalPoints) {
      return sendError(socket, `Bid must be between ${minNext} and ${room.config.totalPoints}`);
    }
    if (bid % 5 !== 0) {
      return sendError(socket, "Bid must be a multiple of 5");
    }

    room.highestBid = bid;
    room.highestBidder = session.playerId;
    io.to(roomCode).emit("bid_placed", {
      player: session.playerId,
      name: room.names[session.playerId],
      bid,
    });
    advanceBidder(room, roomCode);
  });

  socket.on("pass_bid", ({ roomCode }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "bidding") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (room.currentBidder !== session.playerId) return;

    room.passedPlayers.add(session.playerId);
    io.to(roomCode).emit("bid_passed", {
      player: session.playerId,
      name: room.names[session.playerId],
    });
    advanceBidder(room, roomCode);
  });

  socket.on("choose_trump", ({ roomCode, trump }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "trump") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (session.playerId !== room.highestBidder) return;

    const validTrump = ["SPADES", "HEARTS", "CLUBS", "DIAMONDS", "NONE"];
    if (!validTrump.includes(trump)) return sendError(socket, "Invalid trump choice");

    room.trump = trump === "NONE" ? null : trump;
    io.to(roomCode).emit("trump_chosen", {
      trump: room.trump,
      name: room.names[session.playerId],
    });

    room.phase = "partner";
    room.partnerCardTracker = {};
    broadcastRoomState(roomCode);

    socket.emit("select_partners", {
      count: room.config.partners,
      decks: room.config.decks,
    });
  });

  socket.on("choose_partners", ({ roomCode, cards }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "partner") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (session.playerId !== room.highestBidder) return;

    const partnerError = validatePartnerCards(cards, room);
    if (partnerError) return sendError(socket, partnerError);

    room.partnerCardTracker = {};
    cards.forEach(({ card, quantity }) => {
      room.partnerCardTracker[card] = { needed: quantity, revealed: 0 };
    });

    room.bidTeam = [room.highestBidder];
    room.revealedPartners = [];
    room.phase = "playing";
    room.leaderIndex = room.players.indexOf(room.highestBidder);
    room.trick = [];
    room.leadSuit = null;
    room.teamScores = { bidTeam: 0, oppTeam: 0 };

    io.to(roomCode).emit("partners_set", {
      partnerCards: cards,
      bidderName: room.names[room.highestBidder],
      totalPartners: room.config.partners,
    });
    broadcastRoomState(roomCode);
  });

  socket.on("play_card", ({ roomCode, card }) => {
    const room = rooms[roomCode];
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "playing") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");

    const playerId = session.playerId;
    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return;

    const expectedIndex = (room.leaderIndex + room.trick.length) % room.players.length;
    if (playerIndex !== expectedIndex) {
      return sendError(socket, "Not your turn");
    }

    const hand = room.hands[playerId];
    const leadSuit = room.trick.length === 0 ? null : room.leadSuit;
    if (!canPlayCard(hand, card, leadSuit)) {
      return sendError(socket, "You must follow the lead suit");
    }

    if (room.trick.length === 0) {
      room.leadSuit = card.split("_")[0];
    }

    const cardIndex = hand.indexOf(card);
    hand.splice(cardIndex, 1);
    emitPrivateHand(room, playerId);

    const tracker = room.partnerCardTracker[card];
    if (tracker && tracker.revealed < tracker.needed && !room.revealedPartners.includes(playerId)) {
      tracker.revealed += 1;
      room.revealedPartners.push(playerId);
      if (!room.bidTeam.includes(playerId)) {
        room.bidTeam.push(playerId);
      }

      io.to(roomCode).emit("partner_revealed", {
        player: playerId,
        name: room.names[playerId],
        card,
        revealedSoFar: tracker.revealed,
        totalNeeded: tracker.needed,
        allPartnersRevealed: Object.values(room.partnerCardTracker).every(entry => entry.revealed >= entry.needed),
      });
    }

    room.trick.push({ player: playerId, card, playerIndex });
    io.to(roomCode).emit("card_played", {
      player: playerId,
      name: room.names[playerId],
      card,
      trick: room.trick,
    });

    if (room.trick.length === room.players.length) {
      const winner = resolveTrick(room.trick, room.leadSuit, room.trump);
      const points = trickPoints(room.trick);

      room.scores[winner.player] = (room.scores[winner.player] || 0) + points;
      if (room.bidTeam.includes(winner.player)) room.teamScores.bidTeam += points;
      else room.teamScores.oppTeam += points;

      room.leaderIndex = winner.playerIndex;

      io.to(roomCode).emit("trick_resolved", {
        winner: winner.player,
        winnerName: room.names[winner.player],
        winningCard: winner.card,
        points,
        teamScores: room.teamScores,
      });

      room.trick = [];
      room.leadSuit = null;
      sendHands(room);

      const anyCardsLeft = Object.values(room.hands).some(playerHand => playerHand.length > 0);
      if (!anyCardsLeft) {
        endGame(room, roomCode);
        return;
      }
    }

    broadcastRoomState(roomCode);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    const session = getSession(socket.id);
    delete socketSessions[socket.id];
    if (!session) return;

    const { roomCode, playerId } = session;
    const room = rooms[roomCode];
    if (!room || !room.players.includes(playerId)) return;

    if (room.sockets[playerId] === socket.id) {
      delete room.sockets[playerId];
    }

    if (room.phase === "waiting") {
      const playerName = room.names[playerId];
      removeWaitingPlayer(roomCode, playerId);
      if (rooms[roomCode]) {
        io.to(roomCode).emit("player_left", { name: playerName, disconnected: false });
      }
      return;
    }

    room.disconnected.add(playerId);
    updatePauseState(room);
    io.to(roomCode).emit("player_left", { name: room.names[playerId], disconnected: true });
    broadcastRoomState(roomCode);
    scheduleDisconnectExpiry(roomCode, playerId);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

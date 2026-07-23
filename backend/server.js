const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { dealCards } = require("./game/deck");
const { canPlayCard, resolveTrick } = require("./game/trick");
const { trickPoints } = require("./game/scoring");
const createGameConfig = require("./game/config");
const createRoomStore = require("./roomStore");

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || "*";
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;
const DISCONNECT_GRACE_MS = 10 * 60_000; // 10 minutes grace period
const RESTART_DISCONNECT_GRACE_MS = 10 * 60_000;
const rooms = {};
const socketSessions = {};
const roomStore = createRoomStore();

app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("/health", (_req, res) => {
  res.json({ ok: true, persistentRooms: roomStore.enabled });
});
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

function generateId(prefix = "") {
  return `${prefix}${Math.random().toString(36).substring(2, 10)}`;
}

function createPauseReason(room, fallback = "Waiting for players to reconnect") {
  const disconnectedPlayers = room.players.filter(id => room.disconnected.has(id));
  if (disconnectedPlayers.length === 0) return null;
  return `Waiting for ${disconnectedPlayers.map(id => room.names[id]).join(", ")} to reconnect`;
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
    revealedPartnerCards: {},
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

function serializeRoom(room) {
  return {
    players: room.players,
    hostId: room.hostId,
    names: room.names,
    hands: room.hands,
    phase: room.phase,
    currentBidder: room.currentBidder,
    highestBid: room.highestBid,
    highestBidder: room.highestBidder,
    trump: room.trump,
    partnerCardTracker: room.partnerCardTracker,
    revealedPartnerCards: room.revealedPartnerCards,
    trick: room.trick,
    leadSuit: room.leadSuit,
    leaderIndex: room.leaderIndex,
    scores: room.scores,
    teamScores: room.teamScores,
    bidTeam: room.bidTeam,
    revealedPartners: room.revealedPartners,
    gameOver: room.gameOver,
    gameResult: room.gameResult,
    config: room.config,
    passedPlayers: Array.from(room.passedPlayers),
    disconnected: Array.from(room.disconnected),
    paused: room.paused,
    pauseReason: room.pauseReason,
    viewingCountdown: room.viewingCountdown,
  };
}

function hydrateRoom(snapshot) {
  const room = {
    players: snapshot.players || [],
    hostId: snapshot.hostId || snapshot.players?.[0] || null,
    names: snapshot.names || {},
    sockets: {},
    hands: snapshot.hands || {},
    phase: snapshot.phase || "waiting",
    currentBidder: snapshot.currentBidder || null,
    highestBid: snapshot.highestBid || 0,
    highestBidder: snapshot.highestBidder || null,
    trump: snapshot.trump || null,
    partnerCardTracker: snapshot.partnerCardTracker || {},
    revealedPartnerCards: snapshot.revealedPartnerCards || {},
    trick: snapshot.trick || [],
    leadSuit: snapshot.leadSuit || null,
    leaderIndex: snapshot.leaderIndex || 0,
    scores: snapshot.scores || {},
    teamScores: snapshot.teamScores || { bidTeam: 0, oppTeam: 0 },
    bidTeam: snapshot.bidTeam || [],
    revealedPartners: snapshot.revealedPartners || [],
    gameOver: Boolean(snapshot.gameOver),
    gameResult: snapshot.gameResult || null,
    config: snapshot.config || null,
    passedPlayers: new Set(snapshot.passedPlayers || []),
    disconnected: new Set(snapshot.disconnected || []),
    disconnectTimers: {},
    paused: Boolean(snapshot.paused),
    pauseReason: snapshot.pauseReason || null,
    viewingCountdown: snapshot.viewingCountdown ?? 15,
  };

  if (room.phase !== "waiting" && room.phase !== "gameover") {
    room.disconnected = new Set(room.players);
    room.paused = true;
    room.pauseReason = "Server restarted. Waiting for players to reconnect.";
  }

  return room;
}

async function persistRoom(roomCode) {
  try {
    const room = rooms[roomCode];
    if (!room) return;
    await roomStore.set(roomCode, serializeRoom(room));
  } catch (err) {
    console.error(`Failed to persist room ${roomCode}:`, err);
  }
}

async function deleteRoom(roomCode) {
  try {
    delete rooms[roomCode];
    await roomStore.delete(roomCode);
  } catch (err) {
    console.error(`Failed to delete room ${roomCode}:`, err);
  }
}

function updatePauseState(room) {
  if (room.phase === "waiting" || room.phase === "gameover") {
    room.paused = false;
    room.pauseReason = null;
    return;
  }

  if (room.disconnected.size === 0) {
    room.paused = false;
    room.pauseReason = null;
    return;
  }

  room.paused = true;
  room.pauseReason = createPauseReason(room);
}

function recalculateTeamScores(room) {
  let bidTeam = 0;
  let oppTeam = 0;

  room.players.forEach(playerId => {
    const pScore = room.scores[playerId] || 0;
    if (room.bidTeam.includes(playerId)) {
      bidTeam += pScore;
    } else {
      oppTeam += pScore;
    }
  });

  room.teamScores = { bidTeam, oppTeam };
}

function revealUnplayedPartners(room) {
  if (!room.partnerCardTracker || !room.hands) return;

  Object.entries(room.partnerCardTracker).forEach(([card, tracker]) => {
    if (tracker.revealed < tracker.needed) {
      room.players.forEach(playerId => {
        const hand = room.hands[playerId] || [];
        if (hand.includes(card)) {
          if (!room.revealedPartners.includes(playerId)) {
            room.revealedPartners.push(playerId);
          }
          room.revealedPartnerCards[playerId] = card;
          if (!room.bidTeam.includes(playerId)) {
            room.bidTeam.push(playerId);
          }
        }
      });
    }
  });
}

function getCurrentTurn(room) {
  if (room.players.length === 0) return null;
  return room.players[(room.leaderIndex + room.trick.length) % room.players.length];
}

function sendError(socket, message) {
  socket.emit("game_error", { message });
}

function getSocketForPlayer(room, playerId) {
  const socketId = room.sockets[playerId];
  return socketId ? io.sockets.sockets.get(socketId) : null;
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
    partnerCardTracker: room.partnerCardTracker,
    revealedPartnerCards: room.revealedPartnerCards,
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

async function endGame(room, roomCode, messageOverride = null, bidWonOverride = null) {
  revealUnplayedPartners(room);
  recalculateTeamScores(room);

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
  await persistRoom(roomCode);
  io.to(roomCode).emit("game_over", room.gameResult);
  broadcastRoomState(roomCode);
}

function clearDisconnectTimer(room, playerId) {
  if (!room.disconnectTimers[playerId]) return;
  clearTimeout(room.disconnectTimers[playerId]);
  delete room.disconnectTimers[playerId];
}

function scheduleDisconnectExpiry(roomCode, playerId, isServerRestart = false) {
  const room = rooms[roomCode];
  if (!room) return;

  clearDisconnectTimer(room, playerId);
  const graceMs = isServerRestart ? RESTART_DISCONNECT_GRACE_MS : DISCONNECT_GRACE_MS;
  room.disconnectTimers[playerId] = setTimeout(async () => {
    const liveRoom = rooms[roomCode];
    if (!liveRoom || !liveRoom.disconnected.has(playerId) || liveRoom.gameOver) return;

    if (liveRoom.phase === "waiting") {
      await removeWaitingPlayer(roomCode, playerId);
    } else {
      await endGame(liveRoom, roomCode, `${liveRoom.names[playerId]} did not reconnect in time. Game ended.`, false);
    }
  }, graceMs);
}

function startViewingCountdown(room, roomCode) {
  if (room.viewingTimer) {
    clearInterval(room.viewingTimer);
    room.viewingTimer = null;
  }

  room.viewingTimer = setInterval(async () => {
    const liveRoom = rooms[roomCode] || await getRoom(roomCode);
    if (!liveRoom) {
      if (room.viewingTimer) clearInterval(room.viewingTimer);
      return;
    }
    if (liveRoom.phase !== "viewing") {
      if (liveRoom.viewingTimer) clearInterval(liveRoom.viewingTimer);
      return;
    }
    if (liveRoom.paused) return;

    liveRoom.viewingCountdown -= 1;
    io.to(roomCode).emit("viewing_countdown", { seconds: liveRoom.viewingCountdown });

    if (liveRoom.viewingCountdown <= 0) {
      if (liveRoom.viewingTimer) clearInterval(liveRoom.viewingTimer);
      liveRoom.viewingTimer = null;
      liveRoom.phase = "bidding";
      await persistRoom(roomCode);
      broadcastRoomState(roomCode);
    }
  }, 1000);
}

function attachSession(socketId, roomCode, playerId) {
  socketSessions[socketId] = { roomCode, playerId };
}

function getSession(socketId) {
  return socketSessions[socketId];
}

async function getRoom(roomCode) {
  if (rooms[roomCode]) return rooms[roomCode];

  const snapshot = await roomStore.get(roomCode);
  if (!snapshot) return null;

  const room = hydrateRoom(snapshot);
  rooms[roomCode] = room;

  if (room.phase !== "waiting" && room.phase !== "gameover" && room.disconnected.size > 0) {
    room.players.forEach(playerId => {
      if (room.disconnected.has(playerId)) {
        scheduleDisconnectExpiry(roomCode, playerId, true);
      }
    });
  }

  if (room.phase === "viewing" && !room.viewingTimer) {
    startViewingCountdown(room, roomCode);
  }

  return room;
}

async function roomCodeExists(roomCode) {
  if (rooms[roomCode]) return true;
  return roomStore.has(roomCode);
}

async function generateRoomCode() {
  let roomCode;
  do {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  } while (await roomCodeExists(roomCode));
  return roomCode;
}

async function removeWaitingPlayer(roomCode, playerId) {
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
    await deleteRoom(roomCode);
    return;
  }

  await persistRoom(roomCode);
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

async function startTrumpSelection(room, roomCode) {
  room.phase = "trump";
  await persistRoom(roomCode);
  broadcastRoomState(roomCode);

  const bidderSocket = getSocketForPlayer(room, room.highestBidder);
  if (bidderSocket) {
    bidderSocket.emit("select_trump");
  }
}

async function advanceBidder(room, roomCode) {
  const activePlayers = room.players.filter(id => !room.passedPlayers.has(id));

  if (activePlayers.length <= 1) {
    if (!room.highestBidder) {
      room.highestBidder = activePlayers[0] || room.players[0];
      room.highestBid = room.config.minBid;
    }
    await startTrumpSelection(room, roomCode);
    return;
  }

  let idx = room.players.indexOf(room.currentBidder);
  do {
    idx = (idx + 1) % room.players.length;
  } while (room.passedPlayers.has(room.players[idx]));

  room.currentBidder = room.players[idx];
  await persistRoom(roomCode);
  broadcastRoomState(roomCode);
}


io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("create_room", async ({ name }) => {
    if (getSession(socket.id)) {
      console.log(`create_room ignored for socket ${socket.id} (already has session)`);
      return;
    }

    const roomCode = await generateRoomCode();
    const playerId = generateId("p_");

    rooms[roomCode] = createRoomState(playerId, socket.id, name);
    await persistRoom(roomCode);
    attachSession(socket.id, roomCode, playerId);

    socket.join(roomCode);
    socket.emit("room_created", { roomCode, playerId });
    broadcastRoomState(roomCode);
  });

  socket.on("join_room", async ({ roomCode, name }) => {
    const existing = getSession(socket.id);
    if (existing && existing.roomCode === roomCode) {
      console.log(`Duplicate join_room ignored for socket ${socket.id} in room ${roomCode}`);
      return;
    }

    const room = await getRoom(roomCode);
    if (!room) return sendError(socket, "Room not found");
    if (room.phase !== "waiting") return sendError(socket, "Game already started");
    if (room.players.length >= 11) return sendError(socket, "Room is full (max 11)");

    const playerId = generateId("p_");
    room.players.push(playerId);
    room.names[playerId] = name || `Player ${room.players.length}`;
    room.sockets[playerId] = socket.id;

    await persistRoom(roomCode);
    attachSession(socket.id, roomCode, playerId);
    socket.join(roomCode);
    socket.emit("joined_room", { roomCode, playerId });
    broadcastRoomState(roomCode);
  });

  socket.on("reconnect_room", async ({ roomCode, playerId, name }) => {
    const room = await getRoom(roomCode);
    if (!room || !playerId || !room.players.includes(playerId)) {
      socket.emit("reconnect_failed");
      return;
    }

    const oldSocketId = room.sockets[playerId];
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.emit("session_replaced");
        oldSocket.disconnect(true);
      }
    }

    room.sockets[playerId] = socket.id;
    if (name) room.names[playerId] = name;
    room.disconnected.delete(playerId);
    clearDisconnectTimer(room, playerId);
    updatePauseState(room);

    await persistRoom(roomCode);
    attachSession(socket.id, roomCode, playerId);
    socket.join(roomCode);
    socket.emit("reconnected_room", { roomCode, playerId });
    emitPrivateHand(room, playerId);
    broadcastRoomState(roomCode);
  });

  socket.on("start_game", async ({ roomCode }) => {
    const room = await getRoom(roomCode);
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
    room.revealedPartnerCards = {};
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

    await persistRoom(roomCode);
    sendHands(room);
    broadcastRoomState(roomCode);

    startViewingCountdown(room, roomCode);
  });

  socket.on("place_bid", async ({ roomCode, bid }) => {
    const room = await getRoom(roomCode);
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
    await persistRoom(roomCode);
    io.to(roomCode).emit("bid_placed", {
      player: session.playerId,
      name: room.names[session.playerId],
      bid,
    });
    await advanceBidder(room, roomCode);
  });

  socket.on("pass_bid", async ({ roomCode }) => {
    const room = await getRoom(roomCode);
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "bidding") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (room.currentBidder !== session.playerId) return;

    room.passedPlayers.add(session.playerId);
    await persistRoom(roomCode);
    io.to(roomCode).emit("bid_passed", {
      player: session.playerId,
      name: room.names[session.playerId],
    });
    await advanceBidder(room, roomCode);
  });

  socket.on("choose_trump", async ({ roomCode, trump }) => {
    const room = await getRoom(roomCode);
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "trump") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (session.playerId !== room.highestBidder) return;

    const validTrump = ["SPADES", "HEARTS", "CLUBS", "DIAMONDS", "NONE"];
    if (!validTrump.includes(trump)) return sendError(socket, "Invalid trump choice");

    room.trump = trump === "NONE" ? null : trump;
    room.phase = "partner";
    room.partnerCardTracker = {};

    await persistRoom(roomCode);
    io.to(roomCode).emit("trump_chosen", {
      trump: room.trump,
      name: room.names[session.playerId],
    });
    broadcastRoomState(roomCode);

    socket.emit("select_partners", {
      count: room.config.partners,
      decks: room.config.decks,
    });
  });

  socket.on("choose_partners", async ({ roomCode, cards }) => {
    const room = await getRoom(roomCode);
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode || room.phase !== "partner") return;
    if (room.paused) return sendError(socket, room.pauseReason || "Game is paused");
    if (session.playerId !== room.highestBidder) return;

    const partnerError = validatePartnerCards(cards, room);
    if (partnerError) return sendError(socket, partnerError);

    room.partnerCardTracker = {};
    room.revealedPartnerCards = {};
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

    await persistRoom(roomCode);
    io.to(roomCode).emit("partners_set", {
      partnerCards: cards,
      bidderName: room.names[room.highestBidder],
      totalPartners: room.config.partners,
    });
    broadcastRoomState(roomCode);
  });

  socket.on("play_card", async ({ roomCode, card }) => {
    const room = await getRoom(roomCode);
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
    if (tracker && tracker.revealed < tracker.needed) {
      tracker.revealed += 1;
      if (!room.revealedPartners.includes(playerId)) {
        room.revealedPartners.push(playerId);
      }
      room.revealedPartnerCards[playerId] = card;
      if (!room.bidTeam.includes(playerId)) {
        room.bidTeam.push(playerId);
      }
      recalculateTeamScores(room);

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
      recalculateTeamScores(room);

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
        await endGame(room, roomCode);
        return;
      }
    }

    await persistRoom(roomCode);
    broadcastRoomState(roomCode);
  });

  socket.on("transfer_host", async ({ roomCode, targetPlayerId }) => {
    const room = await getRoom(roomCode);
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode) return;
    if (room.hostId !== session.playerId) return sendError(socket, "Only host can transfer host rights");
    if (!room.players.includes(targetPlayerId)) return sendError(socket, "Target player not found");

    room.hostId = targetPlayerId;
    await persistRoom(roomCode);
    broadcastRoomState(roomCode);
  });

  socket.on("kick_player", async ({ roomCode, targetPlayerId }) => {
    const room = await getRoom(roomCode);
    const session = getSession(socket.id);
    if (!room || !session || session.roomCode !== roomCode) return;
    if (room.hostId !== session.playerId) return sendError(socket, "Only host can kick players");
    if (targetPlayerId === room.hostId) return sendError(socket, "Host cannot kick themselves");
    if (!room.players.includes(targetPlayerId)) return sendError(socket, "Target player not found");

    if (room.phase === "waiting") {
      const targetSocketId = room.sockets[targetPlayerId];
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit("kicked");
          targetSocket.leave(roomCode);
        }
      }
      await removeWaitingPlayer(roomCode, targetPlayerId);
    }
  });

  socket.on("disconnect", async () => {
    console.log("Disconnected:", socket.id);
    const session = getSession(socket.id);
    delete socketSessions[socket.id];
    if (!session) return;

    const { roomCode, playerId } = session;
    const room = await getRoom(roomCode);
    if (!room || !room.players.includes(playerId)) return;

    if (room.sockets[playerId] && room.sockets[playerId] !== socket.id) {
      console.log(`Disconnect ignored for player ${playerId} on socket ${socket.id} (already active on newer socket ${room.sockets[playerId]})`);
      return;
    }

    if (room.sockets[playerId] === socket.id) {
      delete room.sockets[playerId];
    }

    room.disconnected.add(playerId);
    updatePauseState(room);
    await persistRoom(roomCode);
    io.to(roomCode).emit("player_left", { name: room.names[playerId], disconnected: true });
    broadcastRoomState(roomCode);
    scheduleDisconnectExpiry(roomCode, playerId);
  });
});

async function boot() {
  try {
    await roomStore.init();
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

boot();

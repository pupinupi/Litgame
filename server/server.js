const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ──────────────────────────────────────
// Игровые данные
// ──────────────────────────────────────
const MAX_HYPE = 70;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

const rooms = {}; // roomId → { players, turn, board, state }

// 20 клеток твоего поля
const board = [
  { id: 1, type: "start" },
  { id: 2, type: "plus", value: 3 },
  { id: 3, type: "plus", value: 2 },
  { id: 4, type: "scandal" },
  { id: 5, type: "risk" },
  { id: 6, type: "plus", value: 2 },
  { id: 7, type: "scandal" },
  { id: 8, type: "plus", value: 3 },
  { id: 9, type: "plus", value: 5 },
  { id: 10, type: "block", value: -10 },
  { id: 11, type: "minus", value: -8, skip: true },
  { id: 12, type: "plus", value: 3 },
  { id: 13, type: "risk" },
  { id: 14, type: "plus", value: 3 },
  { id: 15, type: "skip" },
  { id: 16, type: "plus", value: 2 },
  { id: 17, type: "scandal" },
  { id: 18, type: "plus", value: 8 },
  { id: 19, type: "block", value: -10 },
  { id: 20, type: "plus", value: 4 }
];

// скандалы
const scandalCards = [
  { text: "Перегрел аудиторию🔥", value: -1 },
  { text: "Громкий заголовок🫣", value: -2 },
  { text: "Это монтаж 😱", value: -3 },
  { text: "Меня взломали #️⃣", value: -3, all: true },
  { text: "Подписчики в шоке 😮", value: -4 },
  { text: "Удаляй пока не поздно🤫", value: -5 },
  { text: "Это контент, вы не понимаете🙄", value: -5, skip: true }
];

// ──────────────────────────────────────
// Создание комнаты автоматически
// ──────────────────────────────────────
function createRoom() {
  const id = nanoid(6).toUpperCase();
  rooms[id] = {
    players: [],
    turn: 0,
    state: "lobby" // lobby → game → end
  };
  return id;
}

// ──────────────────────────────────────
// SOCKET.IO
// ──────────────────────────────────────
io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  // игрок создаёт комнату
  socket.on("createRoom", (callback) => {
    const roomId = createRoom();
    callback({ roomId });
  });

  // игрок входит в комнату
  socket.on("joinRoom", ({ roomId, name, color }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ error: "Комната не найдена" });

    if (room.players.length >= MAX_PLAYERS)
      return callback({ error: "В комнате уже максимум игроков" });

    room.players.push({
      id: socket.id,
      name,
      color,
      hype: 0,
      pos: 1,
      skip: false
    });

    socket.join(roomId);
    callback({ success: true, players: room.players });

    // обновить для всех
    io.to(roomId).emit("roomUpdate", room.players);
  });

  // начало игры
  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players.length < MIN_PLAYERS) return;

    room.state = "game";
    room.turn = 0;

    io.to(roomId).emit("gameStarted", {
      players: room.players,
      turn: room.turn
    });
  });

  // бросок кубика
  socket.on("rollDice", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[room.turn];
    if (!player || player.id !== socket.id) return;

    if (player.skip) {
      player.skip = false;
      io.to(roomId).emit("skipTurn", player.id);
      nextTurn(roomId);
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1;

    io.to(roomId).emit("diceRolled", { playerId: player.id, roll });

    // обновляем позицию
    player.pos += roll;
    if (player.pos > 20) player.pos -= 20;

    const cell = board[player.pos - 1];

    // обрабатываем клетку…
    handleCell(roomId, player, cell);
  });

  // отключение
  socket.on("disconnect", () => {
    for (const [id, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(id).emit("roomUpdate", room.players);
      }
    }
  });
});

// ──────────────────────────────────────
// Обработка клетки
// ──────────────────────────────────────
function handleCell(roomId, player, cell) {
  const room = rooms[roomId];

  if (cell.type === "plus") {
    player.hype += cell.value;
    flash(player, "plus", cell.value);
  }

  if (cell.type === "minus") {
    player.hype += cell.value;
    if (player.hype < 0) player.hype = 0;
    flash(player, "minus", cell.value);
    if (cell.skip) player.skip = true;
  }

  if (cell.type === "block") {
    player.hype -= 10;
    if (player.hype < 0) player.hype = 0;
    io.to(roomId).emit("blockChannel", player.id);
  }

  if (cell.type === "skip") {
    player.skip = true;
    io.to(roomId).emit("skipNextTurn", player.id);
  }

  if (cell.type === "scandal") {
    const card = scandalCards[Math.floor(Math.random() * scandalCards.length)];
    io.to(roomId).emit("scandalCard", { playerId: player.id, card });

    if (card.all) {
      room.players.forEach(p => {
        p.hype += card.value;
        if (p.hype < 0) p.hype = 0;
      });
    } else {
      player.hype += card.value;
      if (player.hype < 0) player.hype = 0;
    }
    if (card.skip) player.skip = true;
  }

  if (cell.type === "risk") {
    io.to(roomId).emit("riskPopup", player.id);
  }

  // победа
  if (player.hype >= MAX_HYPE) {
    io.to(roomId).emit("winner", player);
    room.state = "end";
    return;
  }

  io.to(roomId).emit("updateGame", room.players);
  nextTurn(roomId);
}

function nextTurn(roomId) {
  const room = rooms[roomId];
  room.turn = (room.turn + 1) % room.players.length;
  io.to(roomId).emit("turnChange", room.turn);
}

function flash(player, type, value) {
  io.emit("hypeFlash", {
    playerId: player.id,
    type,
    value
  });
}

// ──────────────────────────────────────
// Server start
// ──────────────────────────────────────
server.listen(3000, () => console.log("Server running on 3000"));

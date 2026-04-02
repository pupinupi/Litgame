const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  // --- ВХОД В КОМНАТУ ---
  socket.on('joinRoom', ({ username, roomCode, color }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], turnIndex: 0 };
    }

    const room = rooms[roomCode];

    // ❌ цвет занят В ЭТОЙ комнате
    if (room.players.find(p => p.color === color)) {
      socket.emit('colorTaken');
      return;
    }

    const player = {
      id: socket.id,
      username,
      color,
      position: 0,
      hype: 0,
      skipNext: false
    };

    room.players.push(player);
    socket.join(roomCode);

    io.to(roomCode).emit('updatePlayers', room.players);
  });

  // --- СТАРТ ---
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;

    room.turnIndex = 0;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });

  // --- КУБИК ---
  socket.on('rollDice', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turnIndex];

    // ❌ не его ход
    if (!player || socket.id !== player.id) return;

    // 🛑 ПРОПУСК
    if (player.skipNext) {
      player.skipNext = false;

      io.to(roomCode).emit('playerSkipped', player.id);

      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    io.to(roomCode).emit('diceRolled', {
      playerId: player.id,
      dice
    });
  });

  // --- ДВИЖЕНИЕ ---
  socket.on('playerMoved', ({ roomCode, position, hype, skipNext }) => {
  const room = rooms[roomCode];
  if (!room) return;

  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  player.position = position;
  player.hype = hype;
  player.skipNext = skipNext;

  // ✅ СНАЧАЛА обновляем всех
  io.to(roomCode).emit('updatePlayers', room.players);

  // ✅ ПОТОМ ход
  nextTurn(roomCode);
});
  // --- ВЫХОД ---
  socket.on('disconnect', () => {
    for (let code in rooms) {
      const room = rooms[code];

      const index = room.players.findIndex(p => p.id === socket.id);

      if (index !== -1) {
        room.players.splice(index, 1);

        io.to(code).emit('updatePlayers', room.players);
      }
    }
  });
});

// --- СЛЕДУЮЩИЙ ХОД ---
function nextTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  room.turnIndex = (room.turnIndex + 1) % room.players.length;

  const player = room.players[room.turnIndex];

  if (!player) return;

  io.to(roomCode).emit('nextTurn', player.id);
}

// --- СТАРТ СЕРВЕРА (ВАЖНО ДЛЯ RENDER) ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

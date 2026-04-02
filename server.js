const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {}; // { roomCode: { players: [], turnIndex: 0 } }

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  // --- ПРИСОЕДИНЕНИЕ ---
  socket.on('joinRoom', ({ username, roomCode, color }) => {
    if (!rooms[roomCode]) rooms[roomCode] = { players: [], turnIndex: 0 };
    const room = rooms[roomCode];

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

  // --- СТАРТ ИГРЫ ---
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;

    room.turnIndex = 0;

    io.to(roomCode).emit('gameStarted');
    sendNextTurn(roomCode);
  });

  // --- БРОСОК КУБИКА ---
  socket.on('rollDice', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turnIndex];
    if (!player || socket.id !== player.id) return;

    // Если пропуск хода
    if (player.skipNext) {
      player.skipNext = false;
      io.to(roomCode).emit('playerSkipped', player.id);

      setTimeout(() => sendNextTurn(roomCode), 1000);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: player.id, dice });
  });

  // --- ХОД ИГРОКА ---
  socket.on('playerMoved', ({ roomCode, position, hype, skipNext }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.position = position;
    player.hype = hype;
    player.skipNext = skipNext;

    io.to(roomCode).emit('updatePlayers', room.players);

    setTimeout(() => sendNextTurn(roomCode), 200); // ждём завершения модалок
  });

  // --- ОТСЛЕЖИВАНИЕ ОТКЛЮЧЕНИЯ ---
  socket.on('disconnect', () => {
    for (let code in rooms) {
      const room = rooms[code];
      const idx = room.players.findIndex(p => p.id === socket.id);

      if (idx !== -1) {
        room.players.splice(idx, 1);

        if (room.turnIndex >= room.players.length) room.turnIndex = 0;

        io.to(code).emit('updatePlayers', room.players);
      }
    }
  });
});

// --- ФУНКЦИЯ ОТПРАВКИ ХОДА ---
function sendNextTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  const player = room.players[room.turnIndex];
  if (!player) return;

  if (player.skipNext) {
    player.skipNext = false;
    io.to(roomCode).emit('playerSkipped', player.id);

    // сразу переход к следующему через 1 сек
    setTimeout(() => sendNextTurn(roomCode), 1000);
    return;
  }

  io.to(roomCode).emit('nextTurn', player.id);
}

// --- СТАРТ СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {

  // --- ПРИСОЕДИНЕНИЕ К ЛОББИ ---
  socket.on('joinRoom', ({ username, roomCode, color }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], turn: 0 };
    }

    const room = rooms[roomCode];

    // ❌ проверка цвета
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
  socket.on('startGame', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;

    room.turn = 0;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });

  // --- БРОСОК КУБИКА ---
  socket.on('rollDice', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turn];

    // ❌ не твой ход
    if (player.id !== socket.id) return;

    // 🛑 ПРОПУСК ХОДА
    if (player.skipNext) {
      io.to(roomCode).emit('playerSkipped', player.id);
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: player.id, dice });
  });

  // --- ИГРОК ПЕРЕМЕСТИЛСЯ ---
  socket.on('playerMoved', ({ roomCode, position, hype, skipNext }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.position = position;
    player.hype = hype;
    player.skipNext = skipNext;

    io.to(roomCode).emit('updatePlayers', room.players);

    // ⚡ Переход хода, если игра не окончена
    if (hype < 70) nextTurn(roomCode);
  });

  function nextTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;

    let nextIndex = (room.turn + 1) % room.players.length;
    const nextPlayer = room.players[nextIndex];

    // Если следующий игрок пропускает ход, сразу передаем дальше
    if (nextPlayer.skipNext) {
      nextPlayer.skipNext = false;
      room.turn = nextIndex;
      nextTurn(roomCode);
      io.to(roomCode).emit('playerSkipped', nextPlayer.id);
      return;
    }

    room.turn = nextIndex;
    io.to(roomCode).emit('nextTurn', nextPlayer.id);
  }

  // --- ОТКЛЮЧЕНИЕ ---
  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(code).emit('updatePlayers', room.players);

        // Если был ход игрока, передаем дальше
        if (room.turn >= room.players.length) room.turn = 0;
        if (room.players.length > 0) io.to(code).emit('nextTurn', room.players[room.turn].id);

        if (room.players.length === 0) delete rooms[code];
      }
    }
  });

});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("🚀 Server started on port " + PORT));

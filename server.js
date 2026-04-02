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

  // --- JOIN ROOM ---
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

  // --- START GAME ---
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;

    room.turnIndex = 0;
    io.to(roomCode).emit('gameStarted');

    // сразу отправляем ход первому игроку
    const currentPlayer = room.players[room.turnIndex];
    io.to(roomCode).emit('nextTurn', currentPlayer.id);
  });

  // --- ROLL DICE ---
  socket.on('rollDice', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turnIndex];
    if (!player) return;

    // только текущий игрок
    if (socket.id !== player.id) return;

    if (player.skipNext) {
      player.skipNext = false;
      io.to(roomCode).emit('playerSkipped', player.id);

      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: player.id, dice });
  });

  // --- PLAYER MOVED ---
  socket.on('playerMoved', ({ roomCode, position, hype, skipNext }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.position = position;
    player.hype = hype;
    player.skipNext = skipNext;

    io.to(roomCode).emit('updatePlayers', room.players);

    // переход хода
    nextTurn(roomCode);
  });

  // --- DISCONNECT ---
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

// --- NEXT TURN FUNCTION ---
function nextTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  const player = room.players[room.turnIndex];
  if (!player) return;

  // если игрок должен пропустить ход
  if (player.skipNext) {
    player.skipNext = false;
    io.to(roomCode).emit('playerSkipped', player.id);

    // через секунду переходим к следующему
    setTimeout(() => nextTurn(roomCode), 1000);
    return;
  }

  io.to(roomCode).emit('nextTurn', player.id);
}

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

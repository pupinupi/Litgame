const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // папка с index.html, app.js, стилями и звуками

const rooms = {}; // { roomCode: { players: [], turnIndex: 0 } }

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  // --- ВЫБОР ЦВЕТА ---
  socket.on('trySelectColor', color => {
    for (let roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.players.find(p => p.color === color)) {
        socket.emit('colorTaken');
        return;
      }
    }
    socket.emit('colorAccepted', color);
  });

  // --- ПРИСОЕДИНЕНИЕ К КОМНАТЕ ---
  socket.on('joinRoom', ({ username, roomCode, color }) => {
    if (!rooms[roomCode]) rooms[roomCode] = { players: [], turnIndex: 0 };
    const room = rooms[roomCode];

    if (room.players.find(p => p.id === socket.id)) return;

    room.players.push({ id: socket.id, username, color, position: 0, hype: 0, skipNext: false });
    socket.join(roomCode);
    io.to(roomCode).emit('updatePlayers', room.players);
  });

  // --- СТАРТ ИГРЫ ---
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room || room.players.length === 0) return;
    room.turnIndex = 0;
    io.to(roomCode).emit('gameStarted');
    const firstPlayer = room.players[room.turnIndex].id;
    io.to(roomCode).emit('nextTurn', firstPlayer);
  });

  // --- ХОД КУБИКА ---
  socket.on('rollDice', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players[room.turnIndex];
    if (socket.id !== player.id) return; // только текущий игрок

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: socket.id, dice });
  });

  // --- ИГРОК ДВИНУЛСЯ ---
  socket.on('playerMoved', ({ roomCode, position, hype, skipNext }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.position = position;
    player.hype = hype;
    player.skipNext = skipNext;

    // --- ПРОВЕРКА ПЕРЕКЛЮЧЕНИЯ ХОДА ---
    nextTurn(roomCode);
    io.to(roomCode).emit('updatePlayers', room.players);
  });

  // --- ПРИСЛУШИВАНИЕ К СЛЕДУЮЩЕМУ ХОДУ ---
  socket.on('nextTurnRequest', roomCode => {
    nextTurn(roomCode);
  });

  socket.on('disconnect', () => {
    for (let code in rooms) {
      const room = rooms[code];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(code).emit('updatePlayers', room.players);
      }
    }
  });
});

// --- ФУНКЦИЯ СЛЕДУЮЩЕГО ХОДА ---
function nextTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  do {
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
  } while (room.players[room.turnIndex].skipNext && !room.players[room.turnIndex].skipNextHandled);

  const currentPlayer = room.players[room.turnIndex];
  if (currentPlayer.skipNext) {
    currentPlayer.skipNextHandled = true;
    io.to(roomCode).emit('playerSkipped', currentPlayer.id);
  } else {
    currentPlayer.skipNextHandled = false;
    io.to(roomCode).emit('nextTurn', currentPlayer.id);
  }
}

server.listen(3000, () => console.log('Server running on port 3000'));

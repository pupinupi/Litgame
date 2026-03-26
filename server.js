const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаём статику из папки public (index.html, app.js, картинки, стили)
app.use(express.static('public'));

let rooms = {};

// --- Подключение игроков ---
io.on('connection', socket => {

  // Игрок заходит в комнату
  socket.on('joinRoom', ({ username, roomCode, color }) => {

    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], turn: 0 };
    }

    const room = rooms[roomCode];

    if (room.players.length >= 4) return; // максимум 4 игрока

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

    // Обновляем список игроков для всех в комнате
    io.to(roomCode).emit('updatePlayers', room.players);
  });

  // Старт игры
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;

    io.to(roomCode).emit('gameStarted');

    // Первый игрок ходит
    const firstPlayer = room.players[0];
    io.to(roomCode).emit('nextTurn', firstPlayer.id);
  });

  // Бросок кубика
  socket.on('rollDice', roomCode => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turn];

    if (player.skipNext) {
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    io.to(roomCode).emit('diceRolled', {
      playerId: player.id,
      dice
    });

    nextTurn(roomCode);
  });

  // Следующий ход
  function nextTurn(roomCode) {
    const room = rooms[roomCode];
    room.turn = (room.turn + 1) % room.players.length;
    const nextPlayer = room.players[room.turn];
    io.to(roomCode).emit('nextTurn', nextPlayer.id);
  }

  // Отключение игрока
  socket.on('disconnect', () => {
    for (let code in rooms) {
      const room = rooms[code];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(code).emit('updatePlayers', room.players);
    }
  });

});

// --- Запуск сервера ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

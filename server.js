const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {}; // {roomCode: {players: [], turnIndex: 0}}

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  socket.on('joinRoom', ({roomCode, username, color}) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], turnIndex: 0 };
    }
    if (rooms[roomCode].players.length >= 4) {
      socket.emit('roomFull');
      return;
    }

    const player = { id: socket.id, username, color, hype: 0, skipNext: false, position: 0 };
    rooms[roomCode].players.push(player);
    socket.join(roomCode);

    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  socket.on('rollDice', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turnIndex];
    if (player.id !== socket.id) return;

    if (player.skipNext) {
      player.skipNext = false;
      room.turnIndex = (room.turnIndex + 1) % room.players.length;
      io.to(roomCode).emit('nextTurn', room.players[room.turnIndex].id);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: socket.id, dice });

    // здесь движение и обработка клеток будут по координатам
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(code).emit('updatePlayers', room.players);
      if (room.players.length === 0) delete rooms[code];
    }
    console.log('Игрок отключился:', socket.id);
  });
});

http.listen(3000, () => console.log('Сервер на http://localhost:3000'));

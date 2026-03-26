const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {}; // { roomCode: { players: [], turnIndex: 0, started: false } }

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  socket.on('joinRoom', ({ roomCode, username, color }) => {
    if (!rooms[roomCode]) rooms[roomCode] = { players: [], turnIndex: 0, started: false };

    const room = rooms[roomCode];
    if (room.players.length >= 4) {
      socket.emit('roomFull');
      return;
    }

    const player = { id: socket.id, username, color, hype: 0, position: 0, skipNext: false };
    room.players.push(player);
    socket.join(roomCode);

    io.to(roomCode).emit('updatePlayers', room.players);
  });

  socket.on('startGame', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.started = true;
    io.to(roomCode).emit('gameStarted', room.players);
    io.to(roomCode).emit('nextTurn', room.players[room.turnIndex].id);
  });

  socket.on('rollDice', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[room.turnIndex];
    if (player.id !== socket.id || player.skipNext) return;

    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomCode).emit('diceRolled', { playerId: player.id, dice });

    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    io.to(roomCode).emit('nextTurn', room.players[room.turnIndex].id);
  });

  socket.on('updateHype', ({ roomCode, playerId, amount }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    player.hype = Math.max(0, player.hype + amount);
    io.to(roomCode).emit('updatePlayers', room.players);
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

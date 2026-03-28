const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRoom', ({username, roomCode, color}) => {

    if(!rooms[roomCode]){
      rooms[roomCode] = { players: [], turn: 0 };
    }

    const player = {
      id: socket.id,
      username,
      color,
      position: 0,
      hype: 0,
      skipNext: false
    };

    rooms[roomCode].players.push(player);
    socket.join(roomCode);

    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  socket.on('startGame', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room || room.players.length === 0) return;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });

  // 🎲 БРОСОК
  socket.on('rollDice', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room) return;

    const player = room.players.find(p=>p.id===socket.id);
    if(!player) return;

    if(player.skipNext){
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random()*6)+1;

    // ❗ НЕ ДВИГАЕМ позицию тут
    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice
    });
  });

  // ✅ КЛИЕНТ СООБЩАЕТ ФИНАЛ
  socket.on('playerMoved', ({roomCode, position, hype, skipNext})=>{
    const room = rooms[roomCode];
    if(!room) return;

    const player = room.players.find(p=>p.id===socket.id);
    if(!player) return;

    player.position = position;
    player.hype = hype;
    player.skipNext = skipNext;

    io.to(roomCode).emit('updatePlayers', room.players);

    nextTurn(roomCode);
  });

  function nextTurn(roomCode){
  const room = rooms[roomCode];
  if(!room || room.players.length === 0) return;

  // 💥 ЕСЛИ 1 ИГРОК — НЕ КРУТИМ ХОДЫ
  if(room.players.length === 1){
    io.to(roomCode).emit('nextTurn', room.players[0].id);
    return;
  }

  room.turn = (room.turn + 1) % room.players.length;

  io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
}
  });

const PORT = process.env.PORT || 3000;

http.listen(PORT, ()=>{
  console.log("🚀 Server started on port " + PORT);
});

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {

  // --- ВХОД В КОМНАТУ ---
  socket.on('joinRoom', ({username, roomCode, color}) => {

    if(!rooms[roomCode]){
      rooms[roomCode] = { players: [], turn: 0 };
    }

    const room = rooms[roomCode];

    // ❗ ПРОВЕРКА ЦВЕТА
    const colorTaken = room.players.some(p => p.color === color);
    if(colorTaken){
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
  socket.on('startGame', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room || room.players.length === 0) return;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });


  // --- БРОСОК КУБИКА ---
  socket.on('rollDice', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room) return;

    const player = room.players.find(p=>p.id===socket.id);
    if(!player) return;

    const dice = Math.floor(Math.random()*6)+1;

    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice
    });
  });


  // --- ПЕРЕМЕЩЕНИЕ ИГРОКА ---
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


  // --- СМЕНА ХОДА (ФИКС ПРОПУСКОВ) ---
  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room || room.players.length === 0) return;

    let nextIndex = room.turn;
    let attempts = 0;

    do{
      nextIndex = (nextIndex + 1) % room.players.length;
      attempts++;

      if(room.players[nextIndex].skipNext){
        room.players[nextIndex].skipNext = false;
      }else{
        room.turn = nextIndex;
        io.to(roomCode).emit('nextTurn', room.players[nextIndex].id);
        return;
      }

    }while(attempts < room.players.length);

    // fallback если все пропускают
    room.turn = 0;
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  }

}); // ❗ ВАЖНО: закрыли io.on

// --- ЗАПУСК ---
const PORT = process.env.PORT || 3000;

http.listen(PORT, ()=>{
  console.log("🚀 Server started on port " + PORT);
});

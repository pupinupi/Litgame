const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public')); // Папка с index.html, app.js, style.css, board.jpg

// ===== СЛОВАРЬ КОМНАТ =====
let rooms = {};

// ===== СОЕДИНЕНИЕ =====
io.on('connection', (socket) => {
  console.log("🔗 Новый игрок: " + socket.id);

  // --- ПРИСОЕДИНЕНИЕ В КОМНАТУ ---
  socket.on('joinRoom', ({username, roomCode, color}) => {

    if(!rooms[roomCode]){
      rooms[roomCode] = { players: [], turn: 0 };
    }

    // Проверка на уникальность игрока
    if(!rooms[roomCode].players.find(p => p.id === socket.id)){
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
    }

    // Отправляем обновление списка игроков
    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  // --- НАЧАЛО ИГРЫ ---
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

    if(player.skipNext){
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random()*6)+1;

    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice
    });
  });

  // --- ОБНОВЛЕНИЕ ПОЗИЦИИ И ХАЙПА ---
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

  // --- СЛЕДУЮЩИЙ ХОД ---
  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room || room.players.length === 0) return;

    // Если 1 игрок — ход не меняем
    if(room.players.length === 1){
      io.to(roomCode).emit('nextTurn', room.players[0].id);
      return;
    }

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  }

  // --- ОТКЛЮЧЕНИЕ ИГРОКА ---
  socket.on('disconnect', () => {
    console.log("❌ Игрок отключился: " + socket.id);
    // Удаляем игрока из всех комнат
    for(const roomCode in rooms){
      const room = rooms[roomCode];
      const index = room.players.findIndex(p=>p.id===socket.id);
      if(index!==-1){
        room.players.splice(index,1);
        io.to(roomCode).emit('updatePlayers', room.players);
      }
    }
  });

});

// ===== ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
http.listen(PORT, ()=>{
  console.log("🚀 Server started on port " + PORT);
});

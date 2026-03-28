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
    if(!room) return;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });

  socket.on('rollDice', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room) return;

    const player = room.players.find(p=>p.id===socket.id);

    if(player.skipNext){
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random()*6)+1;

    io.to(roomCode).emit('diceRolled', {playerId: socket.id, dice});

    // обновляем позицию
    player.position = player.position + dice;
    if(player.position >= 20) player.position = player.position % 20;

    io.to(roomCode).emit('updatePlayers', room.players);
    nextTurn(roomCode);
  });

  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room || room.players.length===0) return;

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomCode).emit('updatePlayers', room.players);
    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  }

});

http.listen(3000, ()=>console.log("Server running on http://localhost:3000"));

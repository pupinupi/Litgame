const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRoom', ({username, roomCode, color}) => {
    if(!rooms[roomCode]){
      rooms[roomCode] = { players: [], turn: 0, started: false, gameEnded: false };
    }

    const room = rooms[roomCode];
    if(room.started){
      socket.emit('errorMessage', 'Игра уже началась!');
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

  socket.on('startGame', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room || room.started) return;

    room.started = true;
    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  });

  socket.on('rollDice', (roomCode)=>{
    const room = rooms[roomCode];
    if(!room || room.gameEnded) return;

    const player = room.players.find(p=>p.id===socket.id);
    if(!player) return;

    if(player.skipNext){
      player.skipNext = false;
      nextTurn(roomCode);
      return;
    }

    const dice = Math.floor(Math.random()*6)+1;

    // Обновляем позицию
    player.position = (player.position + dice) % 20; // 20 клеток, можно сделать динамично
    // Обновляем hype за круг
    if(player.position + dice >= 20) player.hype += 5;

    io.to(roomCode).emit('diceRolled', { playerId: socket.id, dice });
    io.to(roomCode).emit('updatePlayers', room.players);

    // Проверка победы
    if(player.hype >= 70){
      room.gameEnded = true;
      io.to(roomCode).emit('gameEnded', player.username);
      return;
    }

    nextTurn(roomCode);
  });

  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room || room.gameEnded) return;

    room.turn = (room.turn + 1) % room.players.length;
    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  }

  socket.on('disconnect', ()=>{
    for(const roomCode in rooms){
      const room = rooms[roomCode];
      const index = room.players.findIndex(p=>p.id===socket.id);
      if(index !== -1){
        room.players.splice(index,1);
        io.to(roomCode).emit('updatePlayers', room.players);
      }
      // Удаляем пустую комнату
      if(room.players.length === 0){
        delete rooms[roomCode];
      }
    }
  });

});
http.listen(3000, ()=>console.log('Server running on http://localhost:3000'));

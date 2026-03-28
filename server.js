const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

// --- КЛЕТКИ ---
const cells = [
  {type:'start'},
  {type:'plus', value:3},
  {type:'plus', value:2},
  {type:'scandal'},
  {type:'risk'},
  {type:'plus', value:2},
  {type:'scandal'},
  {type:'plus', value:3},
  {type:'plus', value:5},
  {type:'minus', value:10},
  {type:'minusSkip', value:8},
  {type:'plus', value:3},
  {type:'risk'},
  {type:'plus', value:3},
  {type:'skip'},
  {type:'plus', value:2},
  {type:'scandal'},
  {type:'plus', value:8},
  {type:'minus', value:10},
  {type:'plus', value:4}
];

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

    // --- ДВИЖЕНИЕ ---
    player.position = (player.position + dice) % cells.length;

    // --- ПОЛНЫЙ КРУГ ---
    if(player.position === 0){
      player.hype += 5;
    }

    // --- ЛОГИКА КЛЕТКИ ---
    const cell = cells[player.position];

    let event = null;

    if(cell.type==='plus'){
      player.hype += cell.value;
      event = {type:'plus', value:cell.value};
    }

    if(cell.type==='minus'){
      player.hype = Math.max(0, player.hype - cell.value);
      event = {type:'minus', value:cell.value};
    }

    if(cell.type==='skip'){
      player.skipNext = true;
      event = {type:'skip'};
    }

    if(cell.type==='minusSkip'){
      player.hype = Math.max(0, player.hype - cell.value);
      player.skipNext = true;
      event = {type:'minusSkip', value:cell.value};
    }

    if(cell.type==='scandal'){
      const val = - (Math.floor(Math.random()*5)+1);
      player.hype = Math.max(0, player.hype + val);
      event = {type:'scandal', value:val};
    }

    if(cell.type==='risk'){
      const val = Math.random()<0.5 ? -5 : 5;
      player.hype = Math.max(0, player.hype + val);
      event = {type:'risk', value:val};
    }

    // --- ПОБЕДА ---
    if(player.hype >= 70){
      io.to(roomCode).emit('gameEnded', player.username);
    }

    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice,
      event
    });

    io.to(roomCode).emit('updatePlayers', room.players);

    nextTurn(roomCode);
  });

  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room) return;

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  }

});

http.listen(3000);

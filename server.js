const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let rooms = {};

const CELLS = [
  'start','plus','plus','scandal','risk',
  'plus','scandal','plus','plus','minus',
  'minusSkip','plus','risk','plus','skip',
  'plus','scandal','plus','minus','plus'
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
    if(!room || room.players.length === 0) return;

    io.to(roomCode).emit('gameStarted');
    io.to(roomCode).emit('nextTurn', room.players[0].id);
  });

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

    player.position = (player.position + dice) % CELLS.length;

    let event = null;

    switch(CELLS[player.position]){
      case 'plus':
        player.hype += 3;
        event = {type:'plus', value:3};
        break;

      case 'minus':
        player.hype = Math.max(0, player.hype - 5);
        event = {type:'minus', value:5};
        break;

      case 'skip':
        player.skipNext = true;
        event = {type:'skip'};
        break;

      case 'minusSkip':
        player.hype = Math.max(0, player.hype - 8);
        player.skipNext = true;
        event = {type:'minusSkip', value:8};
        break;

      case 'scandal':
        event = {type:'scandal'};
        break;

      case 'risk':
        const val = Math.random()<0.5 ? -5 : 5;
        player.hype = Math.max(0, player.hype + val);
        event = {type:'risk', value:val};
        break;
    }

    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice,
      event,
      players: room.players
    });

    nextTurn(roomCode);
  });

  function nextTurn(roomCode){
    const room = rooms[roomCode];
    if(!room) return;

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomCode).emit('updatePlayers', room.players);
    io.to(roomCode).emit('nextTurn', room.players[room.turn].id);
  }

});

http.listen(3000, ()=>console.log("SERVER RUNNING"));

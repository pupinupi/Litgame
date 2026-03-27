const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {};

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
      rooms[roomCode] = { players: [], turn: 0, started:false, gameEnded:false };
    }

    const room = rooms[roomCode];
    if(room.started) return;

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
    io.to(roomCode).emit('nextTurn', room.players[0].id);
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

    let steps = dice;

    while(steps > 0){
      player.position++;

      if(player.position >= cells.length){
        player.position = 0;
        player.hype += 5;
      }

      steps--;
    }

    // клетка
    const cell = cells[player.position];

    if(cell.type==='plus') player.hype += cell.value;
    if(cell.type==='minus') player.hype = Math.max(0, player.hype - cell.value);
    if(cell.type==='skip') player.skipNext = true;
    if(cell.type==='minusSkip'){
      player.hype = Math.max(0, player.hype - cell.value);
      player.skipNext = true;
    }

    io.to(roomCode).emit('diceRolled', {
      playerId: socket.id,
      dice
    });

    io.to(roomCode).emit('updatePlayers', room.players);

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
      room.players = room.players.filter(p=>p.id !== socket.id);

      if(room.players.length === 0){
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit('updatePlayers', room.players);
      }
    }
  });

});

http.listen(3000, ()=>console.log('Server running on http://localhost:3000'));

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let rooms = {};

const cells = [
  "start","+3","+2","scandal","risk","+2","scandal","+3","+5","-10",
  "-8skip","+3","risk","+3","skip","+2","scandal","+8","-10","+4"
];

io.on("connection", (socket)=>{

  /* --- СОЗДАТЬ --- */
  socket.on("createRoom", ({name, skin})=>{
    const code = Math.random().toString(36).substr(2,5);

    rooms[code] = {
      players: [],
      host: socket.id,
      turn:0
    };

    socket.join(code);

    rooms[code].players.push({
      id: socket.id,
      name,
      skin,
      pos:0,
      hype:0,
      skip:false
    });

    sendRoom(code);
  });

  /* --- ВОЙТИ --- */
  socket.on("joinRoom", ({name, room, skin})=>{
    if(!rooms[room]){
      socket.emit("errorMsg","Комната не найдена");
      return;
    }

    socket.join(room);

    rooms[room].players.push({
      id: socket.id,
      name,
      skin,
      pos:0,
      hype:0,
      skip:false
    });

    sendRoom(room);
  });

  /* --- СТАРТ --- */
  socket.on("startGame", (room)=>{
    if(!rooms[room]) return;

    io.to(room).emit("gameStart");
    io.to(room).emit("turn", rooms[room].players[0].id);
  });

  /* --- КУБИК --- */
  socket.on("rollDice", (room)=>{
    let r = rooms[room];
    if(!r) return;

    let player = r.players[r.turn];
    if(player.id !== socket.id) return;

    if(player.skip){
      player.skip=false;
      nextTurn(r, room);
      return;
    }

    let dice = Math.floor(Math.random()*6)+1;
    let old = player.pos;

    player.pos = (player.pos + dice) % 20;

    handleCell(player, r, room);

    io.to(room).emit("move",{id:player.id,from:old,to:player.pos,dice});
    io.to(room).emit("updatePlayers", r.players);

    if(player.hype >= 70){
      io.to(room).emit("winner", player.name);
      return;
    }

    setTimeout(()=>nextTurn(r, room),1500);
  });

  /* --- ОБРАБОТКА КЛЕТОК --- */
  function handleCell(player, r, room){
    let cell = cells[player.pos];

    if(cell.includes("+")) player.hype += parseInt(cell);
    if(cell === "-10") player.hype -=10;

    if(cell==="skip") player.skip=true;

    if(cell==="risk"){
      io.to(room).emit("riskRule");

      setTimeout(()=>{
        let roll = Math.floor(Math.random()*6)+1;
        let res = roll<=3 ? -5 : 5;

        player.hype += res;

        io.to(room).emit("riskResult",{roll,res});
        io.to(room).emit("updatePlayers", r.players);
      },1500);
    }

    if(cell==="scandal"){
      let cards = [
        ["перегрел аудиторию🔥",-1],
        ["громкий заголовок🫣",-2],
        ["это монтаж😱",-3],
        ["меня взломали #️⃣",-3,"all"],
        ["подписчики в шоке😮",-4],
        ["удаляй пока не поздно🤫",-5],
        ["это контент🙄",-5,"skip"]
      ];

      let c = cards[Math.floor(Math.random()*cards.length)];

      if(c[2]==="all"){
        r.players.forEach(p=>{
          p.hype += c[1];
          if(p.hype < 0) p.hype = 0;
        });
      } else {
        player.hype += c[1];
      }

      if(c[2]==="skip") player.skip=true;

      io.to(room).emit("scandal", c[0]);
    }

    if(player.hype < 0) player.hype = 0;

    io.to(room).emit("hypeEffect",{
      id:player.id,
      value:player.hype,
      pos:player.pos
    });
  }

  /* --- СЛЕДУЮЩИЙ ХОД --- */
  function nextTurn(r, room){
    r.turn = (r.turn + 1) % r.players.length;
    io.to(room).emit("turn", r.players[r.turn].id);
  }

  /* --- ОБНОВЛЕНИЕ ЛОББИ --- */
  function sendRoom(room){
    if(!rooms[room]) return;

    io.to(room).emit("roomData",{
      room,
      players: rooms[room].players,
      isHost: true
    });
  }

});

/* --- СТАРТ СЕРВЕРА --- */
http.listen(3000, ()=>{
  console.log("Server started on 3000");
});

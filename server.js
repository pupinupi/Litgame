const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = [];
let turn = 0;

const cells = [
  "start","+3","+2","scandal","risk","+2","scandal","+3","+5","-10",
  "-8skip","+3","risk","+3","skip","+2","scandal","+8","-10","+4"
];

io.on("connection", (socket) => {

  socket.on("join", (name) => {
    if (players.length >= 4) return;

    players.push({
      id: socket.id,
      name,
      pos: 0,
      hype: 0,
      skip: false
    });

    io.emit("updatePlayers", players);
    io.emit("turn", players[turn]?.id);
  });

  socket.on("rollDice", () => {
    const player = players[turn];
    if (!player || player.id !== socket.id) return;

    if (player.skip) {
      player.skip = false;
      nextTurn();
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    const oldPos = player.pos;

    player.pos = (player.pos + dice) % 20;

    handleCell(player);

    io.emit("move", {
      id: player.id,
      from: oldPos,
      to: player.pos,
      dice
    });

    io.emit("updatePlayers", players);

    if (player.hype >= 70) {
      io.emit("winner", player.name);
      return;
    }

    setTimeout(nextTurn, 1500);
  });

  function handleCell(player) {
    let cell = cells[player.pos];

    if (cell.includes("+")) player.hype += parseInt(cell);
    if (cell === "-10") player.hype -= 10;

    if (cell === "-8skip") {
      player.hype -= 8;
      player.skip = true;
    }

    if (cell === "skip") player.skip = true;

    if (cell === "risk") {
      const roll = Math.floor(Math.random() * 6) + 1;
      const result = roll <= 3 ? -5 : 5;
      player.hype += result;

      io.emit("risk", { roll, result });
    }

    if (cell === "scandal") {
      const cards = [
        { text: "перегрел аудиторию🔥 -1", val: -1 },
        { text: "громкий заголовок🫣 -2", val: -2 },
        { text: "это монтаж 😱 -3", val: -3 },
        { text: "меня взломали #️⃣ -3 всем", val: -3, all: true },
        { text: "подписчики в шоке 😮 -4", val: -4 },
        { text: "удаляй пока не поздно🤫 -5", val: -5 },
        { text: "это контент 🙄 -5 + пропуск", val: -5, skip: true }
      ];

      let c = cards[Math.floor(Math.random() * cards.length)];

      if (c.all) players.forEach(p => p.hype += c.val);
      else player.hype += c.val;

      if (c.skip) player.skip = true;

      io.emit("scandal", c.text);
    }

    if (player.hype < 0) player.hype = 0;
  }

  function nextTurn() {
    turn = (turn + 1) % players.length;
    io.emit("turn", players[turn].id);
  }
});

http.listen(3000, () => console.log("🚀 Server started on 3000"));

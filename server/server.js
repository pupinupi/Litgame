// ----------- НАСТРОЙКА СЕРВЕРА -----------
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 10000;

// Статика (папка game)
app.use(express.static("game"));

// Главная страница → index.html
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/game/index.html");
});

// ----------- ЛОГИКА ИГРЫ И КОМНАТ -----------

const rooms = {}; // { roomCode: { players:[], state:{} } }

// Создать комнату
function createRoom() {
  let code = nanoid(4).toUpperCase();
  rooms[code] = {
    players: [],
    turn: 0,
    state: {},
  };
  return code;
}

// ----------- SOCKET.IO -----------
io.on("connection", (socket) => {
  console.log("Игрок подключился:", socket.id);

  // Создание комнаты
  socket.on("createRoom", () => {
    const code = createRoom();
    socket.join(code);

    rooms[code].players.push({
      id: socket.id,
      name: "Игрок",
      color: "red",
      hype: 0,
      pos: 0,
      skip: false
    });

    socket.emit("roomCreated", code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  // Подключение к комнате
  socket.on("joinRoom", (code) => {
    code = code.toUpperCase();

    if (!rooms[code]) {
      socket.emit("roomError", "Комната не найдена");
      return;
    }
    if (rooms[code].players.length >= 4) {
      socket.emit("roomError", "Комната заполнена");
      return;
    }

    socket.join(code);
    rooms[code].players.push({
      id: socket.id,
      name: "Игрок",
      color: "red",
      hype: 0,
      pos: 0,
      skip: false
    });

    io.to(code).emit("playersUpdate", rooms[code].players);
    socket.emit("joinedRoom", code);
  });

  // Выбор фишки
  socket.on("choosePiece", ({ room, color }) => {
    let r = rooms[room];
    if (!r) return;

    let p = r.players.find((p) => p.id === socket.id);
    if (p) p.color = color;

    io.to(room).emit("playersUpdate", r.players);
  });

  // Старт игры
  socket.on("startGame", (room) => {
    let r = rooms[room];
    if (!r) return;

    r.turn = 0;
    io.to(room).emit("gameStarted", r);
  });

  // Бросок кубика
  socket.on("roll", (room) => {
    let r = rooms[room];
    if (!r) return;

    let currentPlayer = r.players[r.turn];
    if (!currentPlayer) return;

    if (currentPlayer.id !== socket.id) return;

    if (currentPlayer.skip) {
      currentPlayer.skip = false;
      r.turn = (r.turn + 1) % r.players.length;
      io.to(room).emit("nextTurn", r.turn);
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1;

    io.to(room).emit("rolled", {
      player: socket.id,
      number: roll
    });
  });

  // Обновление позиции/хайпа
  socket.on("updateState", ({ room, player }) => {
    let r = rooms[room];
    if (!r) return;

    let p = r.players.find((x) => x.id === player.id);
    if (p) {
      p.pos = player.pos;
      p.hype = player.hype;
      p.skip = player.skip;
    }

    io.to(room).emit("playersUpdate", r.players);
  });

  // Конец хода — след. игрок
  socket.on("endTurn", (room) => {
    let r = rooms[room];
    if (!r) return;

    r.turn = (r.turn + 1) % r.players.length;
    io.to(room).emit("nextTurn", r.turn);
  });

  // Отключение
  socket.on("disconnect", () => {
    console.log("Игрок вышел:", socket.id);

    for (let code in rooms) {
      rooms[code].players = rooms[code].players.filter(
        (p) => p.id !== socket.id
      );

      io.to(code).emit("playersUpdate", rooms[code].players);

      // Если комната пустая — удалить
      if (rooms[code].players.length === 0) {
        delete rooms[code];
      }
    }
  });
});

// ----------- СТАРТ СЕРВЕРА -----------
server.listen(PORT, () => {
  console.log("Сервер запущен на порту " + PORT);
});

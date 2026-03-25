import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;

// Отдаём папку /game
app.use(express.static("game"));

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/game/index.html");
});

// --- Комнаты и игроки ---
const rooms = {};

// Создать комнату
function createRoom() {
  let code = nanoid(4).toUpperCase();
  rooms[code] = {
    players: [],
    turn: 0
  };
  return code;
}

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("Игрок подключился:", socket.id);

  // СОЗДАНИЕ КОМНАТЫ
  socket.on("createRoom", ({ name, color }) => {
    let code = createRoom();
    socket.join(code);

    rooms[code].players.push({
      id: socket.id,
      name,
      color,
      hype: 0,
      pos: 0,
      skip: false
    });

    socket.emit("roomCreated", code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  // ПРИСОЕДИНЕНИЕ КОМНАТЕ
  socket.on("joinRoom", ({ code, name, color }) => {
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
      name,
      color,
      hype: 0,
      pos: 0,
      skip: false
    });

    socket.emit("joinedRoom", code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  // ВЫБОР ФИШКИ
  socket.on("choosePiece", ({ room, color }) => {
    let r = rooms[room];
    if (!r) return;

    let p = r.players.find((x) => x.id === socket.id);
    if (p) p.color = color;

    io.to(room).emit("playersUpdate", r.players);
  });

  // СТАРТ ИГРЫ
  socket.on("startGame", (room) => {
    let r = rooms[room];
    if (!r) return;

    r.turn = 0;
    io.to(room).emit("gameStarted", r);
  });

  // БРОСОК КУБИКА
  socket.on("roll", (room) => {
    let r = rooms[room];
    if (!r) return;

    let player = r.players[r.turn];
    if (!player) return;

    if (player.id !== socket.id) return;

    if (player.skip) {
      player.skip = false;
      r.turn = (r.turn + 1) % r.players.length;
      io.to(room).emit("nextTurn", r.turn);
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    io.to(room).emit("rolled", {
      player: socket.id,
      dice
    });
  });

  // СОХРАНИТЬ СОСТОЯНИЕ
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

  // КОНЕЦ ХОДА
  socket.on("endTurn", (room) => {
    let r = rooms[room];
    if (!r) return;

    r.turn = (r.turn + 1) % r.players.length;
    io.to(room).emit("nextTurn", r.turn);
  });

  // ВЫХОД ИГРОКА
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      rooms[code].players = rooms[code].players.filter(
        (p) => p.id !== socket.id
      );

      io.to(code).emit("playersUpdate", rooms[code].players);

      if (rooms[code].players.length === 0) {
        delete rooms[code];
      }
    });
  });
});

// СТАРТ
server.listen(PORT, () => {
  console.log("Сервер запущен на порту", PORT);
});

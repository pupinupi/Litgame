import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("game"));

const PORT = process.env.PORT || 10000;

const rooms = {}; // { code: { players: [], turn: 0 } }

io.on("connection", (socket) => {
    console.log("Игрок подключился:", socket.id);

    // Создать комнату
    socket.on("createRoom", ({ name, piece }) => {
        const code = nanoid(4).toUpperCase();
        rooms[code] = { players: [], turn: 0 };

        rooms[code].players.push({
            id: socket.id,
            name,
            piece,
            hype: 0,
            pos: 0,
            skip: false
        });

        socket.join(code);
        socket.emit("roomCreated", code);
        io.to(code).emit("roomPlayers", rooms[code].players);
    });

    // Войти в комнату
    socket.on("joinRoom", ({ room, name, piece }) => {
        room = room.toUpperCase();
        if (!rooms[room]) return socket.emit("roomError", "Комната не найдена");
        if (rooms[room].players.length >= 4) return socket.emit("roomError", "Комната заполнена");

        rooms[room].players.push({
            id: socket.id,
            name,
            piece,
            hype: 0,
            pos: 0,
            skip: false
        });

        socket.join(room);
        socket.emit("roomJoined", room);
        io.to(room).emit("roomPlayers", rooms[room].players);
    });

    // Начать игру
    socket.on("startGame", (room) => {
        if (!rooms[room]) return;
        io.to(room).emit("gameStarted");

        // Отправляем начальные данные всех игроков
        io.to(room).emit("gamePlayers", rooms[room].players);

        // Старт хода первого игрока
        nextTurn(room);
    });

    // Бросок кубика
    socket.on("rollDice", (room) => {
        if (!rooms[room]) return;

        const roomData = rooms[room];
        const player = roomData.players[roomData.turn];

        if (player.id !== socket.id) return;

        const number = Math.floor(Math.random() * 6) + 1;
        io.to(room).emit("diceResult", { player: socket.id, number });

        // Следующий ход через 0.5 секунды (после анимации перемещения)
        setTimeout(() => nextTurn(room), 600);
    });

    // Пропуск хода
    socket.on("skipTurn", ({ room, id }) => {
        const roomData = rooms[room];
        const player = roomData.players.find(p => p.id === id);
        if (player) player.skip = true;
    });

    // Победа
    socket.on("win", ({ room, id }) => {
        io.to(room).emit("gameWin", id);
    });

    // Отключение игрока
    socket.on("disconnect", () => {
        Object.keys(rooms).forEach(code => {
            const room = rooms[code];
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                room.players.splice(idx, 1);
                io.to(code).emit("roomPlayers", room.players);
            }
        });
    });

    // Функция перехода хода
    function nextTurn(room) {
        const roomData = rooms[room];
        if (!roomData) return;

        let next = roomData.turn;
        const len = roomData.players.length;

        // Пропускаем игроков с skip
        do {
            next = (next + 1) % len;
        } while (roomData.players[next].skip && roomData.players.some(p => p.skip));

        roomData.turn = next;

        const currentPlayer = roomData.players[roomData.turn];
        io.to(currentPlayer.id).emit("yourTurn");
    }
});

server.listen(PORT, () => console.log("Server running on port", PORT));

const socket = io("https://litgame.onrender.com");

// DOM
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCodeInput");
const playersList = document.getElementById("playersList");

const startBtn = document.getElementById("startGameBtn");

let myName = "";
let myPiece = "";
let roomCode = "";
let isHost = false;

// Выбор фишки
document.querySelectorAll(".piece").forEach(p => {
    p.addEventListener("click", () => {
        document.querySelectorAll(".piece").forEach(x => x.classList.remove("selected"));
        p.classList.add("selected");
        myPiece = p.style.background;
    });
});

// Создать комнату
document.getElementById("createBtn").onclick = () => {
    if (!nameInput.value) return alert("Введите имя!");
    if (!myPiece) return alert("Выберите фишку!");

    myName = nameInput.value;
    isHost = true;

    socket.emit("createRoom", { name: myName, piece: myPiece });
};

// Войти в комнату
document.getElementById("joinBtn").onclick = () => {
    if (!nameInput.value) return alert("Введите имя!");
    if (!myPiece) return alert("Выберите фишку!");
    if (!roomCodeInput.value) return alert("Введите код комнаты!");

    myName = nameInput.value;
    roomCode = roomCodeInput.value.toUpperCase();
    isHost = false;

    socket.emit("joinRoom", { room: roomCode, name: myName, piece: myPiece });
};

// Комната создана
socket.on("roomCreated", code => {
    roomCode = code;
    alert("Комната создана! Код: " + code);
    startBtn.classList.remove("hidden");
});

// Успешный вход в комнату
socket.on("roomJoined", code => {
    roomCode = code;
    alert("Вы вошли в комнату!");
});

// Ошибки комнаты
socket.on("roomError", msg => alert(msg));

// Обновление списка игроков
socket.on("roomPlayers", players => {
    playersList.innerHTML = "";
    players.forEach(p => {
        let div = document.createElement("div");
        div.innerText = p.name + " — ✔";
        playersList.appendChild(div);
    });
});

// Старт игры (только хост может вызвать)
startBtn.onclick = () => {
    if (isHost) socket.emit("startGame", roomCode);
};

// Начало игры
socket.on("gameStarted", () => {
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    // Запуск полной игровой логики
    if (window.initGame) window.initGame(socket, myName, myPiece, roomCode);
});

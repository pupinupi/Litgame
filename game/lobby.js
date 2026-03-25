const socket = io("https://litgame.onrender.com");

// Элементы
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nameInput = document.getElementById("nameInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const playersList = document.getElementById("playersList");

const selectedPieceDisplay = document.getElementById("selectedPieceDisplay");

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

// Создание комнаты
document.getElementById("createBtn").onclick = () => {
    if (!nameInput.value) return alert("Введите имя!");

    if (!myPiece) return alert("Выберите фишку!");

    myName = nameInput.value;
    isHost = true;

    socket.emit("createRoom", { name: myName, piece: myPiece });
};

// Вход в комнату
document.getElementById("joinBtn").onclick = () => {
    if (!nameInput.value) return alert("Введите имя!");
    if (!myPiece) return alert("Выберите фишку!");
    if (!roomCodeInput.value) return alert("Введите код комнаты!");

    myName = nameInput.value;
    roomCode = roomCodeInput.value;

    socket.emit("joinRoom", { name: myName, piece: myPiece, room: roomCode });
};

// Комната создана — показываем код
socket.on("roomCreated", code => {
    roomCode = code;
    selectedPieceDisplay.style.background = myPiece;
    alert("Комната создана! Код: " + code);
});

// Ошибки
socket.on("roomError", msg => {
    alert(msg);
});

// Обновление игроков
socket.on("roomPlayers", players => {
    playersList.innerHTML = "";
    players.forEach(p => {
        let div = document.createElement("div");
        div.innerText = p.name + " — ✔";
        playersList.appendChild(div);
    });
});

// Попали в комнату успешно
socket.on("roomJoined", () => {
    selectedPieceDisplay.style.background = myPiece;
});

// Кнопка «Начать игру» — только у хоста
document.getElementById("startGameBtn").onclick = () => {
    if (isHost) {
        socket.emit("startGame", roomCode);
    }
};

// Сервер сказал начать игру
socket.on("gameStarted", () => {

    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    // Передаём данные в игровую логику
    window.initGame(socket, myName, myPiece, roomCode);
});

const socket = io("https://litgame.onrender.com"); // ЗАМЕНИМ ПОТОМ

let myColor = null;
let myName = "Игрок";
let roomId = null;
let players = [];

const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const pieces = document.querySelectorAll(".piece");
pieces.forEach(p => {
    p.addEventListener("click", () => {
        pieces.forEach(x => x.classList.remove("selected"));
        p.classList.add("selected");
        myColor = p.dataset.color;
    });
});

document.getElementById("createRoom").onclick = () => {
    socket.emit("createRoom", (res) => {
        roomId = res.roomId;
        document.getElementById("roomCode").innerText = "Код комнаты: " + roomId;
    });
};

document.getElementById("joinRoom").onclick = () => {
    const input = document.getElementById("joinInput").value.trim();
    if (!input || !myColor) return alert("Введите код и выберите фишку!");
    joinRoom(input);
};

function joinRoom(id) {
    socket.emit("joinRoom", {
        roomId: id,
        name: myName,
        color: myColor
    }, res => {
        if (res.error) return alert(res.error);
        roomId = id;
        updatePlayers(res.players);
    });
}

socket.on("roomUpdate", (playersList) => {
    updatePlayers(playersList);
});

function updatePlayers(p) {
    players = p;
    const list = document.getElementById("playersList");
    list.innerHTML = "<b>Игроки:</b><br>" + p.map(x =>
        `<div style="color:${x.color}">● ${x.name}</div>`
    ).join("");

    if (players.length >= 2) {
        document.getElementById("startGame").classList.remove("hidden");
    }
}

document.getElementById("startGame").onclick = () => {
    socket.emit("startGame", roomId);
};

socket.on("gameStarted", () => {
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    Game.init(socket, players, roomId);
});

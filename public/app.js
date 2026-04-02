// --- ЗВУКИ ---
const scandalSound = new Audio('scandal.mp3');
scandalSound.volume = 0.6;

const diceSound = new Audio('dice.mp3');
diceSound.volume = 0.9;

const socket = io();

let players = [];
let currentTurnId = null;

let username, roomCode, color;
let isAnimating = false;
let gameOver = false;


// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');
        color = btn.getAttribute('data-color');
    });
});

socket.on('colorTaken', () => {
    alert('Этот цвет уже занят!');
});


// --- ВХОД ---
document.getElementById('joinBtn').onclick = () => {
    username = document.getElementById('username').value.trim();
    roomCode = document.getElementById('roomCode').value.trim();

    if (!username || !roomCode || !color || color === undefined) {
        alert("Заполни всё и выбери фишку");
        return;
    }

    socket.emit('joinRoom', { username, roomCode, color });
};


// --- СТАРТ ---
document.getElementById('startBtn').onclick = () => {
    socket.emit('startGame', roomCode);
};


// --- КУБИК ---
document.getElementById('rollBtn').onclick = () => {
    if (gameOver || isAnimating) return;
    if (currentTurnId !== socket.id) return;

    socket.emit('rollDice', roomCode);
};


// --- СОКЕТЫ ---
socket.on('updatePlayers', pl => {
    players = pl;
    renderPlayers();
    renderHypeBars();
    renderLobbyPlayers();
});

socket.on('playerSkipped', (playerId) => {
    if (playerId === socket.id) {
        showModal('🚨 Пропуск хода!');
    }
});

socket.on('gameStarted', () => {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
});

socket.on('nextTurn', id => {
    currentTurnId = id;
    document.getElementById('rollBtn').disabled = id !== socket.id || gameOver;
    renderPlayers();
});

socket.on('diceRolled', ({ playerId, dice }) => {
    if (playerId !== socket.id) return;

    const diceEl = document.getElementById('diceResult');

    diceSound.currentTime = 0;
    diceSound.play();

    diceEl.innerText = "🎲 " + dice;

    movePlayer(dice);
});

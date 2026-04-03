// --- ПРОВЕРКА ---
alert("JS работает");

// --- SOCKET ---
const socket = io();

// --- ДАННЫЕ ---
let players = [];
let currentTurnId = null;
let username, roomCode, color;

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

// --- JOIN ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if (!username || !roomCode || !color) {
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// --- START ---
document.getElementById('startBtn').onclick = () => {
  socket.emit('startGame', roomCode);
};

// --- GAME START ---
socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

// --- ОБНОВЛЕНИЕ ИГРОКОВ ---
socket.on('updatePlayers', pl => {
  players = pl;
  renderPlayers();
  renderLobbyPlayers();
});

// --- КЛЕТКИ (ПРОСТО) ---
const cells = [
  { x: 100, y: 600 },
  { x: 100, y: 500 },
  { x: 100, y: 400 },
  { x: 100, y: 300 },
  { x: 100, y: 200 },
  { x: 200, y: 100 },
  { x: 400, y: 100 },
  { x: 600, y: 100 },
  { x: 800, y: 100 },
  { x: 900, y: 200 },
  { x: 900, y: 400 },
  { x: 900, y: 600 },
  { x: 700, y: 650 },
  { x: 500, y: 650 },
  { x: 300, y: 650 }
];

// --- РЕНДЕР ФИШЕК (БЕЗ ЛОМАЮЩЕГО КОДА) ---
function renderPlayers() {
  const board = document.getElementById('gameBoard');
  if (!board) return;

  players.forEach((p, i) => {
    let el = document.getElementById(p.id);

    if (!el) {
      el = document.createElement('div');
      el.className = `player ${p.color}`;
      el.id = p.id;
      board.appendChild(el);
    }

    const cell = cells[p.position] || cells[0];

    el.style.left = (cell.x + i * 10) + 'px';
    el.style.top = cell.y + 'px';
  });
}

// --- ЛОББИ СПИСОК ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div>${p.username}</div>`).join('');
}

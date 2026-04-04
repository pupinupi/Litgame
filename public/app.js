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

// --- КУБИК (ПРОСТОЙ) ---
document.getElementById('rollBtn').onclick = () => {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;

  const dice = Math.floor(Math.random() * 6) + 1;

  document.getElementById('diceResult').innerText = "🎲 " + dice;

  me.position = (me.position + dice) % cells.length;

  renderPlayers();

  socket.emit('playerMoved', {
    roomCode,
    position: me.position,
    hype: me.hype || 0,
    skipNext: false
  });
};

// --- КЛЕТКИ (ПОД ТВОЮ КАРТИНКУ) ---
const cells = [
  { x: 82, y: 587 },
  { x: 97, y: 464 },
  { x: 86, y: 348 },
  { x: 93, y: 224 },
  { x: 87, y: 129 },
  { x: 219, y: 101 },
  { x: 364, y: 107 },
  { x: 494, y: 95 },
  { x: 652, y: 96 },
  { x: 815, y: 89 },
  { x: 930, y: 135 },
  { x: 936, y: 247 },
  { x: 936, y: 357 },
  { x: 941, y: 480 },
  { x: 937, y: 610 },
  { x: 794, y: 624 },
  { x: 636, y: 635 },
  { x: 517, y: 627 },
  { x: 355, y: 619 },
  { x: 210, y: 626 }
];

// --- МАСШТАБ ПОД КАРТИНКУ ---
function getScaledPosition(x, y) {
  const board = document.getElementById('gameBoard');

  const scaleX = board.clientWidth / 1024;
  const scaleY = board.clientHeight / 1024;

  return {
    x: x * scaleX,
    y: y * scaleY
  };
}

// --- РЕНДЕР ФИШЕК ---
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
    const pos = getScaledPosition(cell.x, cell.y);

    el.style.left = (pos.x + i * 10) + 'px';
    el.style.top = pos.y + 'px';
  });
}

// --- ЛОББИ СПИСОК ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div>${p.username}</div>`).join('');
}

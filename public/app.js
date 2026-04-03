// --- SAFE SOCKET ---
let socket;
try {
  socket = io();
} catch (e) {
  alert("Ошибка подключения к серверу");
}

// --- SAFE ЗВУКИ ---
let scandalSound = { play: () => {} };
let diceSound = { play: () => {} };

try {
  scandalSound = new Audio('scandal.mp3');
  scandalSound.volume = 0.6;
} catch {}

try {
  diceSound = new Audio('dice.mp3');
  diceSound.volume = 0.9;
} catch {}

let players = [];
let currentTurnId = null;
let username, roomCode, color;
let isAnimating = false;
let gameOver = false;

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

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  const game = document.getElementById('game');
  game.style.display = 'flex';

  // 💥 ждём пока поле появится
  setTimeout(() => {
    renderPlayers();
  }, 500);
});

socket.on('nextTurn', id => {
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id || gameOver;
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;

  diceSound.play();
  document.getElementById('diceResult').innerText = "🎲 " + dice;
  movePlayer(dice);
});

// --- КЛЕТКИ ---
const cells = [
  { x: 82, y: 587 }, { x: 97, y: 464 }, { x: 86, y: 348 },
  { x: 93, y: 224 }, { x: 87, y: 129 }, { x: 219, y: 101 },
  { x: 364, y: 107 }, { x: 494, y: 95 }, { x: 652, y: 96 },
  { x: 815, y: 89 }, { x: 930, y: 135 }, { x: 936, y: 247 },
  { x: 936, y: 357 }, { x: 941, y: 480 }, { x: 937, y: 610 },
  { x: 794, y: 624 }, { x: 636, y: 635 }, { x: 517, y: 627 },
  { x: 355, y: 619 }, { x: 210, y: 626 }
];

// --- FIX SCALE ---
function getScaledPosition(x, y) {
  const board = document.getElementById('gameBoard');

  if (!board || board.clientWidth === 0) {
    return { x, y }; // 💥 fallback
  }

  return {
    x: x * (board.clientWidth / 1000),
    y: y * (board.clientHeight / 700)
  };
}

// --- ДВИЖЕНИЕ ---
function movePlayer(steps) {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;

  isAnimating = true;
  let count = 0;

  function step() {
    if (count >= steps) {
      isAnimating = false;

      socket.emit('playerMoved', {
        roomCode,
        position: me.position,
        hype: me.hype,
        skipNext: false
      });

      return;
    }

    me.position = (me.position + 1) % cells.length;
    renderPlayers();

    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- РЕНДЕР ФИШЕК (УЛЬТРА СТАБИЛЬНЫЙ) ---
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

    const cell = cells[p.position];
    if (!cell) return;

    const pos = getScaledPosition(cell.x, cell.y);

    if (isNaN(pos.x) || isNaN(pos.y)) return; // 💥 защита

    el.style.left = (pos.x + i * 8) + 'px';
    el.style.top = pos.y + 'px';
  });
}

// --- UI ---
function renderHypeBars() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';

  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';

    const fill = document.createElement('div');
    fill.className = 'hypeFill';
    fill.style.width = (p.hype / 70 * 100) + '%';

    bar.innerHTML = `<div>${p.username}: ${p.hype}</div>`;
    bar.appendChild(fill);

    container.appendChild(bar);
  });
}

function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div>${p.username}</div>`).join('');
}

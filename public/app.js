const scandalSound = new Audio('scandal.mp3');
scandalSound.volume = 0.8;

const diceSound = new Audio('dice.mp3');
diceSound.volume = 0.7;

const socket = io();

let players = [];
let currentTurnId = null;
let username, roomCode, color;

let isAnimating = false;
let gameOver = false;

// выбор фишки
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

socket.on('colorTaken', () => {
  alert('Этот цвет уже занят!');
});

// вход
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if (!username || !roomCode || !color) {
    alert("Заполни всё и выбери фишку");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// старт
document.getElementById('startBtn').onclick = () => {
  socket.emit('startGame', roomCode);
};

// кубик
document.getElementById('rollBtn').onclick = () => {
  if (gameOver || isAnimating) return;
  if (currentTurnId !== socket.id) return;

  socket.emit('rollDice', roomCode);
};

// сокеты
socket.on('updatePlayers', pl => {
  players = pl;
  renderPlayers();
  renderHypeBars();
  renderLobbyPlayers();
});

socket.on('nextTurn', id => {
  currentTurnId = id;

  const rollBtn = document.getElementById('rollBtn');
  rollBtn.disabled = id !== socket.id || gameOver;

  rollBtn.style.opacity = rollBtn.disabled ? 0.5 : 1;

  showModal(id === socket.id ? "🎯 Твой ход!" : "⏳ Ход соперника");
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;

  document.getElementById('diceResult').innerText = "🎲 " + dice;
  movePlayer(dice);
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

// --- КЛЕТКИ ---
const cells = [
  { x: 111, y: 596, type: 'start' },
  { x: 114, y: 454, type: 'plus', value: 3 },
  { x: 106, y: 363, type: 'plus', value: 2 },
  { x: 91,  y: 239, type: 'scandal' },
  { x: 101, y: 143, type: 'risk' },
  { x: 226, y: 100, type: 'plus', value: 2 },
  { x: 374, y: 101, type: 'scandal' },
  { x: 509, y: 107, type: 'plus', value: 3 },
  { x: 653, y: 106, type: 'plus', value: 5 },
  { x: 789, y: 103, type: 'minus', value: 10 },
  { x: 933, y: 128, type: 'minusSkip', value: 8 },
  { x: 938, y: 252, type: 'plus', value: 3 },
  { x: 948, y: 356, type: 'risk' },
  { x: 943, y: 480, type: 'plus', value: 3 },
  { x: 923, y: 598, type: 'skip' },
  { x: 794, y: 619, type: 'plus', value: 2 },
  { x: 644, y: 617, type: 'scandal' },
  { x: 513, y: 617, type: 'plus', value: 8 },
  { x: 351, y: 624, type: 'minus', value: 10 },
  { x: 232, y: 620, type: 'plus', value: 4 }
];

// движение
function movePlayer(steps) {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;

  isAnimating = true;
  let count = 0;

  function step() {
    if (count >= steps) {
      isAnimating = false;
      handleCell(me);
      return;
    }

    const prev = me.position;
    me.position = (me.position + 1) % cells.length;

    if (prev === cells.length - 1 && me.position === 0) {
      me.hype += 7;
      showModal('🔁 +7 хайпа за круг');
    }

    renderPlayers();
    count++;
    setTimeout(step, 300);
  }

  step();
}

// клетка
function handleCell(p) {
  const cell = cells[p.position];
  if (!cell) return;

  p.skipNext = false;
  let text = '';

  switch (cell.type) {
    case 'start':
      p.hype += 10;
      text = '🚀 +10 хайпа';
      break;

    case 'plus':
      p.hype += cell.value;
      text = `➕ ${cell.value}`;
      break;

    case 'minus':
      p.hype = Math.max(0, p.hype - cell.value);
      text = `➖ ${cell.value}`;
      break;

    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.value);
      p.skipNext = true;
      text = '🚨 Тюрьма: пропуск';
      break;

    case 'skip':
      p.skipNext = true;
      text = '⚖️ Суд: пропуск';
      break;

    case 'risk':
      showRiskModal(p);
      return;

    case 'scandal':
      showScandalModal(p);
      return;
  }

  renderHypeBars();

  showModal(text, () => {
    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext
    });
  });
}

// модалка
function showModal(text, cb) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(() => {
    m.classList.remove('active');
    if (cb) cb();
  }, 1500);
}

// UI
function renderPlayers() {
  const b = document.getElementById('gameBoard');

  players.forEach((p, i) => {
    let el = document.getElementById(p.id);

    if (!el) {
      el = document.createElement('div');
      el.className = `player ${p.color}`;
      el.id = p.id;
      b.appendChild(el);
    }

    const c = cells[p.position];
    el.style.left = (c.x + i * 8) + 'px';
    el.style.top = c.y + 'px';
  });
}

function renderHypeBars() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';

  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';

    const fill = document.createElement('div');
    fill.className = 'hypeFill';
    fill.style.width = Math.min(p.hype, 70) / 70 * 100 + '%';

    bar.innerHTML = `<div>${p.username}: ${p.hype}/70</div>`;
    bar.appendChild(fill);

    container.appendChild(bar);
  });
}

function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div style="color:${p.color}">${p.username}</div>`).join('');
}

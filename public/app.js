const socket = io();

// --- Звуки ---
const scandalSound = new Audio('scandal.mp3');
const diceSound = new Audio('dice.mp3');

let players = [];
let currentTurnId = null;
let username, roomCode, color;

let isAnimating = false;
let gameOver = false;

// --- DOM ---
const usernameInput = document.getElementById('usernameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const rollBtn = document.getElementById('rollBtn');
const diceResult = document.getElementById('diceResult');
const gameBoard = document.getElementById('gameBoard');
const hypeBars = document.getElementById('hypeBars');
const modal = document.getElementById('modal');

// --- Выбор фишки ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

// --- Вход ---
joinBtn.onclick = () => {
  username = usernameInput.value;
  roomCode = roomCodeInput.value;

  if (!username || !roomCode || !color) {
    alert("Заполни имя, код и выбери фишку");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// --- Старт ---
startBtn.onclick = () => {
  socket.emit('startGame', roomCode);
};

// --- Кубик ---
rollBtn.onclick = () => {
  if (gameOver || isAnimating) return;
  if (currentTurnId !== socket.id) return;

  socket.emit('rollDice', roomCode);
};

// --- Сокеты ---
socket.on('updatePlayers', pl => {
  players = pl;
  renderPlayers();
  renderHypeBars();
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

socket.on('nextTurn', id => {
  currentTurnId = id;
  rollBtn.classList.toggle('disabled', id !== socket.id);
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;

  diceSound.currentTime = 0;
  diceSound.play();

  diceResult.innerText = "🎲 " + dice;

  movePlayer(dice);
});

socket.on('playerSkipped', (playerId) => {
  if (playerId === socket.id) {
    showModal('🛑 Пропуск хода');
  }
});

socket.on('gameOver', name => {
  gameOver = true;
  showModal(`🏆 Победил ${name}`);
});

// --- Клетки под 1024x1024 ---
const cells = [
  { x: 82, y: 950, type: 'start' },
  { x: 120, y: 800, type: 'plus', value: 3 },
  { x: 100, y: 650, type: 'plus', value: 2 },
  { x: 130, y: 500, type: 'scandal' },
  { x: 150, y: 350, type: 'risk' },
  { x: 300, y: 300, type: 'plus', value: 2 },
  { x: 450, y: 320, type: 'scandal' },
  { x: 600, y: 350, type: 'plus', value: 3 },
  { x: 750, y: 400, type: 'plus', value: 5 },
  { x: 880, y: 450, type: 'minus', value: 10 },
  { x: 920, y: 550, type: 'minusSkip', value: 8 },
  { x: 940, y: 650, type: 'plus', value: 3 },
  { x: 950, y: 750, type: 'risk' },
  { x: 940, y: 850, type: 'plus', value: 3 },
  { x: 900, y: 950, type: 'skip' },
  { x: 750, y: 960, type: 'plus', value: 2 },
  { x: 600, y: 970, type: 'scandal' },
  { x: 450, y: 960, type: 'plus', value: 8 },
  { x: 300, y: 950, type: 'minus', value: 10 },
  { x: 150, y: 940, type: 'plus', value: 4 }
];

// --- Движение ---
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

    if (me.position === 0 && prev !== 0) {
      me.hype += 7;
      showModal('🔁 +7 хайпа');
    }

    renderPlayers();
    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- Обработка клетки ---
function handleCell(p) {
  const cell = cells[p.position];

  switch (cell.type) {
    case 'start': p.hype += 10; break;
    case 'plus': p.hype += cell.value; break;
    case 'minus': p.hype -= cell.value; break;
    case 'skip': p.skipNext = true; break;
    case 'minusSkip': p.hype -= cell.value; p.skipNext = true; break;
    case 'risk': return risk(p);
    case 'scandal': return scandal(p);
  }

  p.hype = Math.max(0, p.hype);

  checkWin(p);
  updateServer(p);
}

// --- Риск ---
function risk(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  const val = dice <= 3 ? -5 : 5;

  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 Риск ${val}`);

  checkWin(p);
  updateServer(p);
}

// --- Скандал ---
function scandal(p) {
  scandalSound.currentTime = 0;
  scandalSound.play();

  const val = -3;
  p.hype = Math.max(0, p.hype + val);
  p.skipNext = true;

  showModal(`💥 Скандал ${val}`);

  checkWin(p);
  updateServer(p);
}

// --- Победа ---
function checkWin(p) {
  if (p.hype >= 70) {
    gameOver = true;

    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext,
      win: true
    });
  }
}

// --- Отправка ---
function updateServer(p) {
  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- UI ---
function renderPlayers() {
  players.forEach((p, i) => {
    let el = document.getElementById(p.id);

    if (!el) {
      el = document.createElement('div');
      el.className = 'player';
      el.id = p.id;
      el.style.background = p.color;
      gameBoard.appendChild(el);
    }

    const c = cells[p.position];
    el.style.left = (c.x + i * 10) + 'px';
    el.style.top = (c.y + i * 10) + 'px';
  });
}

function renderHypeBars() {
  hypeBars.innerHTML = '';

  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';

    const fill = document.createElement('div');
    fill.className = 'hypeFill';
    fill.style.width = Math.min(p.hype, 70) / 70 * 100 + '%';

    bar.innerHTML = `<div>${p.username}: ${p.hype}/70</div>`;
    bar.appendChild(fill);

    hypeBars.appendChild(bar);
  });
}

function showModal(text) {
  modal.innerHTML = `<div class="modalContent">${text}</div>`;
  modal.classList.add('active');

  setTimeout(() => modal.classList.remove('active'), 2000);
}

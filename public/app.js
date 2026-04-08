const socket = io();

// --- ЗВУКИ ---
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

// --- СКАНДАЛ ---
const SCANDALS = [
  { text: "перегрел аудиторию🔥", value: -1 },
  { text: "громкий заголовок🫣", value: -2 },
  { text: "это монтаж 😱", value: -3 },
  { text: "меня взломали #️⃣", all: true, value: -3 },
  { text: "подписчики в шоке 😮", value: -4 },
  { text: "удаляй пока не поздно🤫", value: -5 },
  { text: "это контент🙄", value: -5, skip: true }
];

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

// --- ВХОД ---
joinBtn.onclick = () => {
  username = usernameInput.value;
  roomCode = roomCodeInput.value;

  if (!username || !roomCode || !color) {
    alert("Заполни имя, код и выбери фишку");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// --- СТАРТ ---
startBtn.onclick = () => {
  socket.emit('startGame', roomCode);
};

// --- КУБИК ---
rollBtn.onclick = () => {
  if (gameOver || isAnimating) return;
  if (currentTurnId !== socket.id) return;

  socket.emit('rollDice', roomCode);
};

// --- СОКЕТЫ ---
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

// --- КЛЕТКИ (оставь свои координаты если уже есть) ---
const cells = [
  { x: 82, y: 587, type: 'start' },
  { x: 97, y: 464, type: 'plus', value: 3 },
  { x: 86, y: 348, type: 'plus', value: 2 },
  { x: 93, y: 224, type: 'scandal' },
  { x: 87, y: 129, type: 'risk' },
  { x: 219, y: 101, type: 'plus', value: 2 },
  { x: 364, y: 107, type: 'scandal' },
  { x: 494, y: 95, type: 'plus', value: 3 },
  { x: 652, y: 96, type: 'plus', value: 5 },
  { x: 815, y: 89, type: 'minus', value: 10 },
  { x: 930, y: 135, type: 'minusSkip', value: 8 },
  { x: 936, y: 247, type: 'plus', value: 3 },
  { x: 936, y: 357, type: 'risk' },
  { x: 941, y: 480, type: 'plus', value: 3 },
  { x: 937, y: 610, type: 'skip' },
  { x: 794, y: 624, type: 'plus', value: 2 },
  { x: 636, y: 635, type: 'scandal' },
  { x: 517, y: 627, type: 'plus', value: 8 },
  { x: 355, y: 619, type: 'minus', value: 10 },
  { x: 210, y: 626, type: 'plus', value: 4 }
];

// --- ДВИЖЕНИЕ ---
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

// --- ОБРАБОТКА КЛЕТКИ ---
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

// --- РИСК ---
function risk(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  const val = dice <= 3 ? -5 : 5;

  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 Риск ${val}`);

  checkWin(p);
  updateServer(p);
}

// --- СКАНДАЛ ---
function scandal(p) {
  scandalSound.currentTime = 0;
  scandalSound.play();

  const card = SCANDALS[Math.floor(Math.random() * SCANDALS.length)];

  if (card.all) {
    players.forEach(pl => pl.hype = Math.max(0, pl.hype + card.value));
  } else {
    p.hype = Math.max(0, p.hype + card.value);
  }

  if (card.skip) p.skipNext = true;

  showModal(`💥 ${card.text}`);

  checkWin(p);
  updateServer(p);
}

// --- ПОБЕДА ---
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

// --- ОТПРАВКА ---
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
    el.style.top = c.y + 'px';
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

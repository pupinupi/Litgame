// --- ЗВУКИ ---
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

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

// --- ВХОД ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if (!username || !roomCode || !color) {
    alert("Заполни все поля и выбери фишку");
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

socket.on('playerSkipped', playerId => {
  if (playerId === socket.id) {
    showModal('🛑 Пропуск хода!');
    document.getElementById('rollBtn').disabled = true;
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

// --- КЛЕТКИ ---
const cells = [
  { x: 50, y: 550, type: 'start', hype: 0, skipNext: false },
  { x: 150, y: 550, type: 'plus', hype: 3, skipNext: false },
  { x: 250, y: 550, type: 'plus', hype: 2, skipNext: false },
  { x: 350, y: 550, type: 'scandal', skipNext: false },
  { x: 450, y: 550, type: 'risk', skipNext: false },
  { x: 550, y: 550, type: 'plus', hype: 2, skipNext: false },
  { x: 650, y: 550, type: 'scandal', skipNext: false },
  { x: 750, y: 550, type: 'plus', hype: 3, skipNext: false },
  { x: 850, y: 550, type: 'plus', hype: 5, skipNext: false },
  { x: 950, y: 550, type: 'minus', hype: 10, skipNext: false },
  { x: 950, y: 450, type: 'minusSkip', hype: 8, skipNext: true },
  { x: 850, y: 450, type: 'plus', hype: 3, skipNext: false },
  { x: 750, y: 450, type: 'risk', skipNext: false },
  { x: 650, y: 450, type: 'plus', hype: 3, skipNext: false },
  { x: 550, y: 450, type: 'skip', skipNext: true },
  { x: 450, y: 450, type: 'plus', hype: 2, skipNext: false },
  { x: 350, y: 450, type: 'scandal', skipNext: false },
  { x: 250, y: 450, type: 'plus', hype: 8, skipNext: false },
  { x: 150, y: 450, type: 'minus', hype: 10, skipNext: false },
  { x: 50, y: 450, type: 'plus', hype: 4, skipNext: false },
];

// --- ДВИЖЕНИЕ ПО КООРДИНАТАМ ---
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

    me.position = (me.position + 1) % cells.length;
    renderPlayers();
    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- ОБРАБОТКА КЛЕТКИ ---
function handleCell(p) {
  const cell = cells[p.position];
  let text = '';

  switch (cell.type) {
    case 'start':
      text = '🚀 Старт';
      break;
    case 'plus':
      p.hype += cell.hype;
      text = `➕ ${cell.hype} хайпа`;
      break;
    case 'minus':
      p.hype = Math.max(0, p.hype - cell.hype);
      text = `➖ ${cell.hype} хайпа`;
      break;
    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.hype);
      p.skipNext = true;
      text = `🛑 Суд: -${cell.hype} хайпа и пропуск хода`;
      break;
    case 'skip':
      p.skipNext = true;
      text = '🛑 Пропуск хода';
      break;
    case 'risk':
      showRiskModal(p);
      return;
    case 'scandal':
      showScandalModal(p);
      return;
  }

  renderHypeBars();
  if (text) showModal(text);

  if (p.hype >= 70) {
    gameOver = true;
    showModal(`🏆 ${p.username} выиграл!`);
  }

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- РИСК ---
function showRiskModal(p) {
  showModal('🎲 Риск: 1-3 -5, 4-6 +5');
  setTimeout(() => {
    const dice = Math.floor(Math.random() * 6) + 1;
    p.hype += dice <= 3 ? -5 : 5;
    renderHypeBars();
    showModal(dice <= 3 ? '-5 хайпа' : '+5 хайпа');
    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext
    });
  }, 1500);
}

// --- СКАНДАЛ ---
function showScandalModal(p) {
  scandalSound.currentTime = 0;
  scandalSound.play();

  const scandals = [
    { text: 'перегрел аудиторию🔥', hype: -1, skip: false },
    { text: 'громкий заголовок🫣', hype: -2, skip: false },
    { text: 'это монтаж 😱', hype: -3, skip: false },
    { text: 'меня взломали #️⃣', hype: -3, skip: false, all: true },
    { text: 'подписчики в шоке 😮', hype: -4, skip: false },
    { text: 'удаляй пока не поздно 🤫', hype: -5, skip: false },
    { text: 'это контент, вы не понимаете 🙄', hype: -5, skip: true }
  ];

  const s = scandals[Math.floor(Math.random() * scandals.length)];

  if (s.all) {
    players.forEach(pl => pl.hype = Math.max(0, pl.hype + s.hype));
  } else {
    p.hype = Math.max(0, p.hype + s.hype);
    if (s.skip) p.skipNext = true;
  }

  renderHypeBars();
  showModal(`${s.text} (${s.hype > 0 ? '+' : ''}${s.hype} хайпа)`);
  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- UI ---
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
    el.style.left = c.x + 'px';
    el.style.top = c.y + 'px';
    el.style.zIndex = (p.id === currentTurnId ? 10 : 1);
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

function showModal(text) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(() => m.classList.remove('active'), 2000);
}

// --- РЕЖИМ СБОРА КООРДИНАТ (ДЛЯ ТЕЛЕФОНА) ---
let coordMode = true;

if (coordMode) {
  const board = document.getElementById('gameBoard');

  // создаем панель
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '0';
  panel.style.left = '0';
  panel.style.width = '100%';
  panel.style.maxHeight = '40%';
  panel.style.overflowY = 'auto';
  panel.style.background = 'black';
  panel.style.color = '#00eaff';
  panel.style.fontSize = '14px';
  panel.style.padding = '10px';
  panel.style.zIndex = '9999';

  panel.innerHTML = `
    <div style="margin-bottom:5px;">📍 Координаты:</div>
    <textarea id="coordsOutput" style="width:100%; height:120px;"></textarea>
    <button id="copyCoords">📋 Копировать</button>
    <button id="clearCoords">🗑 Очистить</button>
  `;

  document.body.appendChild(panel);

  const output = document.getElementById('coordsOutput');

  // клик по полю
  board.addEventListener('click', (e) => {
    const rect = board.getBoundingClientRect();

    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const line = `{ x: ${x}, y: ${y} },\n`;
    output.value += line;
  });

  // копировать
  document.getElementById('copyCoords').onclick = () => {
    output.select();
    document.execCommand('copy');
    alert('Скопировано!');
  };

  // очистить
  document.getElementById('clearCoords').onclick = () => {
    output.value = '';
  };
}

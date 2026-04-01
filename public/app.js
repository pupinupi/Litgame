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
    socket.emit('trySelectColor', btn.dataset.color);
  };
});

socket.on('colorAccepted', selectedColor => {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  const btn = [...document.querySelectorAll('.chip')].find(c => c.dataset.color === selectedColor);
  if(btn) btn.classList.add('selected');
  color = selectedColor;
});

socket.on('colorTaken', () => {
  alert('Этот цвет уже занят!');
});

// --- ВХОД ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if (!username || !roomCode || !color) {
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

// --- КЛЕТКИ ---
const cells = [
  { x: 111, y: 596, type: 'start' },
  { x: 114, y: 454, type: 'plus', hype: 3 },
  { x: 106, y: 363, type: 'plus', hype: 2 },
  { x: 91,  y: 239, type: 'scandal' },
  { x: 101, y: 143, type: 'risk' },
  { x: 226, y: 100, type: 'plus', hype: 2 },
  { x: 374, y: 101, type: 'scandal' },
  { x: 509, y: 107, type: 'plus', hype: 3 },
  { x: 653, y: 106, type: 'plus', hype: 5 },
  { x: 789, y: 103, type: 'minus', hype: 10 },
  { x: 933, y: 128, type: 'minusSkip', hype: 8 },
  { x: 938, y: 252, type: 'plus', hype: 3 },
  { x: 948, y: 356, type: 'risk' },
  { x: 943, y: 480, type: 'plus', hype: 3 },
  { x: 923, y: 598, type: 'skip' },
  { x: 794, y: 619, type: 'plus', hype: 2 },
  { x: 644, y: 617, type: 'scandal' },
  { x: 513, y: 617, type: 'plus', hype: 8 },
  { x: 351, y: 624, type: 'minus', hype: 10 },
  { x: 232, y: 620, type: 'plus', hype: 4 }
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

    // 🔥 ЗА КРУГ
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

// --- ОБРАБОТКА КЛЕТКИ ---
function handleCell(p) {
  const cell = cells[p.position];
  if (!cell) return;

  p.skipNext = false;
  let text = '';

  switch (cell.type) {
    case 'start':
      p.hype += 10;
      text = '🚀 +10 хайпа (старт)';
      break;

    case 'plus':
      p.hype += cell.hype;
      text = `➕ ${cell.hype}`;
      break;

    case 'minus':
      p.hype = Math.max(0, p.hype - cell.hype);
      text = `➖ ${cell.hype}`;
      break;

    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.hype);
      p.skipNext = true;
      text = '🚨 Тюрьма: пропуск хода';
      break;

    case 'skip':
      p.skipNext = true;
      text = '🚨 Тюрьма: пропуск хода';
      break;

    case 'risk':
      showRiskModal(p);
      return;

    case 'scandal':
      showScandalModal(p);
      return;
  }

  renderHypeBars();

  // 💥 ВАЖНО: ждём модалку
  showModal(text, () => {
    if (p.hype >= 70) {
      gameOver = true;
      showWinScreen(p.username);
      return;
    }

    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext
    });
  });
}

// --- МОДАЛКА С CALLBACK ---
function showModal(text, callback) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(() => {
    m.classList.remove('active');
    if (callback) callback();
  }, 2000);
}

// --- РИСК ---
function showRiskModal(p) {
  const m = document.getElementById('modal');

  m.innerHTML = `
    <div class="riskCard">
      <div class="riskTitle">🎲 РИСК</div>
      <div class="riskText">
        1-3 → -5 хайпа<br>
        4-6 → +5 хайпа
      </div>
    </div>
  `;
  m.classList.add('active');

  setTimeout(() => {
    const dice = Math.floor(Math.random() * 6) + 1;
    const result = dice <= 3 ? -5 : 5;

    p.hype = Math.max(0, p.hype + result);

    m.innerHTML = `
      <div class="riskCard">
        <div class="riskTitle">🎲 Выпало: ${dice}</div>
        <div class="riskValue">${result > 0 ? '+' : ''}${result}</div>
      </div>
    `;

    renderHypeBars();

    setTimeout(() => {
      m.classList.remove('active');

      socket.emit('playerMoved', {
        roomCode,
        position: p.position,
        hype: p.hype,
        skipNext: p.skipNext
      });
    }, 1500);

  }, 1500);
}

// --- СКАНДАЛ ---
function showScandalModal(p) {
  scandalSound.play();

  const effects = [
    { text: 'перегрел аудиторию🔥', hype: -1 },
    { text: 'громкий заголовок🫣', hype: -2 },
    { text: 'это монтаж 😱', hype: -3 },
    { text: 'меня взломали #️⃣', hype: -3, all: true },
    { text: 'подписчики в шоке 😮', hype: -4 },
    { text: 'удаляй пока не поздно 🤫', hype: -5 },
    { text: 'это контент 🙄', hype: -5, skip: true }
  ];

  const s = effects[Math.floor(Math.random() * effects.length)];
  const m = document.getElementById('modal');

  if (s.all) {
    players.forEach(pl => pl.hype = Math.max(0, pl.hype + s.hype));
  } else {
    p.hype = Math.max(0, p.hype + s.hype);
    if (s.skip) p.skipNext = true;
  }

  m.innerHTML = `
    <div class="scandalCard">
      <div class="scandalTitle">💥 СКАНДАЛ</div>
      <div class="scandalText">${s.text}</div>
      <div class="scandalValue">${s.hype}</div>
    </div>
  `;

  m.classList.add('active');
  renderHypeBars();

  setTimeout(() => {
    m.classList.remove('active');

    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext
    });
  }, 2000);
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

function showWinScreen(name) {
  const m = document.getElementById('modal');

  m.innerHTML = `
    <div class="winScreenBox">
      <div class="winTitle">🏆 ПОБЕДА</div>
      <div class="winName">${name}</div>
      <div class="winText">70 хайпа!</div>
      <button class="winBtn" onclick="location.reload()">🔄 Снова</button>
    </div>
  `;

  m.classList.add('active');
}

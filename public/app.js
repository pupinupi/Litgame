// 🔊 звуки
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
  username = document.getElementById('username').value;
  roomCode = document.getElementById('roomCode').value;

  if (!username || !roomCode || !color) {
    alert("Заполни всё");
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

  const me = players.find(p => p.id === socket.id);
  if (!me) return;

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
  if(playerId === socket.id){
    showModal('🛑 Пропуск хода!');
  }
});

// --- НАЧАЛО ИГРЫ ---
socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

// --- ХОД И ПРОПУСК ---
socket.on('nextTurn', id => {
  currentTurnId = id;

  const me = players.find(p => p.id === socket.id);

  if (id === socket.id) {
    if (me && me.skipNext) {
      showModal('🛑 Пропуск хода!');
      document.getElementById('rollBtn').disabled = true;

      // сбрасываем skip
      me.skipNext = false;
      socket.emit('playerMoved', {
        roomCode,
        position: me.position,
        hype: me.hype,
        skipNext: false
      });
    } else {
      document.getElementById('rollBtn').disabled = false;
    }
  } else {
    document.getElementById('rollBtn').disabled = true;
  }

  renderPlayers();
});

// --- КУБИК ---
socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;

  const diceEl = document.getElementById('diceResult');

  diceSound.currentTime = 0;
  diceSound.play();

  diceEl.classList.add('rolling');
  diceEl.innerText = "🎲 ...";

  setTimeout(() => {
    diceEl.classList.remove('rolling');
    diceEl.innerText = "🎲 " + dice;
    movePlayer(dice);
  }, 600);
});

// --- КЛЕТКИ ---
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
  { x: 930, y: 135, type: 'minusSkip', value: 8 }, // 🛑 Суд
  { x: 936, y: 247, type: 'plus', value: 3 },
  { x: 936, y: 357, type: 'risk' },
  { x: 941, y: 480, type: 'plus', value: 3 },
  { x: 937, y: 610, type: 'skip' }, // 🛑 Тюрьма
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

    const prevPosition = me.position;
    me.position = (me.position + 1) % cells.length;

    // 🔁 Прохождение круга
    if (me.position === 0 && prevPosition !== 0) {
      me.hype += 7;
      showModal('🔁 Круг пройден! +7 хайпа');
      renderHypeBars();
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
  let text = '';

  switch (cell.type) {
    case 'start': p.hype += 10; text = '🚀 Старт! +10 хайпа'; break;
    case 'plus': p.hype += cell.value; text = `➕ +${cell.value} хайпа`; break;
    case 'minus': p.hype = Math.max(0, p.hype - cell.value); text = `➖ -${cell.value} хайпа`; break;
    case 'skip': p.skipNext = true; text = '🛑 Пропуск хода!'; break;
    case 'minusSkip': p.hype = Math.max(0, p.hype - cell.value); p.skipNext = true; text = `🛑 -${cell.value} и пропуск`; break;
    case 'risk': showRiskModal(p); return;
    case 'scandal': showScandalModal(p); return;
  }

  renderHypeBars();
  if (text) showModal(text);

  checkWin(p);

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- 💥 Тряска ---
function shakeScreen() {
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 400);
}

// --- ПРОВЕРКА ПОБЕДЫ ---
function checkWin(p) {
  if (p.hype >= 70 && !gameOver) {
    gameOver = true;
    document.getElementById('modal').innerHTML = `
      <div class="winScreenBox">
        <div class="winTitle">🏆 ПОБЕДА</div>
        <div class="winName">${p.username}</div>
        <div class="winText">набрал 70 хайпа!</div>
      </div>`;
    document.getElementById('modal').classList.add('active');
    document.getElementById('rollBtn').disabled = true;
  }
}

// --- РЕНДЕР ---
function renderPlayers() {
  const b = document.getElementById('gameBoard');
  players.forEach((p, i) => {
    let el = document.getElementById(p.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'player ' + p.color;
      el.id = p.id;
      b.appendChild(el);
    }
    const c = cells[p.position];
    if (!c) return;
    el.style.left = (c.x + i * 10) + 'px';
    el.style.top = c.y + 'px';
    el.classList.toggle('active', p.id === currentTurnId);
  });
}

// --- ХАЙП ---
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

// --- ЛОББИ ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div style="color:${p.color}">${p.username}</div>`).join('');
}

// --- МОДАЛКА ---
function showModal(text) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(() => { if (!gameOver) m.classList.remove('active'); }, 2000);
}

// --- РИСК ---
function showRiskModal(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  const val = (dice <= 3 ? -5 : 5);
  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 Риск: ${dice} → ${val > 0 ? '+' : ''}${val}`);
  renderHypeBars();
  checkWin(p);
  socket.emit('playerMoved', { roomCode, position: p.position, hype: p.hype, skipNext: p.skipNext });
}

// --- СКАНДАЛ ---
function showScandalModal(p) {
  shakeScreen();
  scandalSound.currentTime = 0;
  scandalSound.play();

  const options = [
    { text: 'перегрел аудиторию🔥', val: -1 },
    { text: 'громкий заголовок🫣', val: -2 },
    { text: 'это монтаж 😱', val: -3 },
    { text: 'меня взломали #️⃣', val: -3, all: true },
    { text: 'подписчики в шоке 😮', val: -4 },
    { text: 'удаляй пока не поздно🤫', val: -5 },
    { text: 'это контент🙄', val: -5, skip: true }
  ];

  const c = options[Math.floor(Math.random() * options.length)];

  if (c.all) players.forEach(pl => pl.hype = Math.max(0, pl.hype + c.val));
  else p.hype = Math.max(0, p.hype + c.val);

  if (c.skip) p.skipNext = true;

  showModal(`💥 ${c.text} (${c.val})`);
  renderHypeBars();
  checkWin(p);

  socket.emit('playerMoved', { roomCode, position: p.position, hype: p.hype, skipNext: p.skipNext });
}

const socket = io();

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

// --- ВХОД ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value;
  roomCode = document.getElementById('roomCode').value;

  if (!username || !roomCode || !color) {
    alert("Заполни все поля и выбери фишку!");
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
  if (currentTurnId !== socket.id) return;
  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl => {
  players = pl;
  renderPlayers();
  renderHype();
  renderLobbyPlayers();
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
  renderPlayers();
  renderHype();
});

socket.on('nextTurn', id => {
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id;
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;
  document.getElementById('diceResult').innerText = "🎲 " + dice;
  movePlayer(dice);
});

// --- КООРДИНАТЫ И ПОЛЕ ---
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

// --- ДВИЖЕНИЕ ФИШЕК ---
function movePlayer(steps) {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;

  let count = 0;

  function step() {
    if (count >= steps) {
      handleCell(me);
      return;
    }

    me.position = (me.position + 1) % cells.length;
    renderPlayers();

    count++;
    setTimeout(step, 300); // плавное движение
  }

  step();
}

// --- ЛОГИКА КЛЕТКИ ---
function handleCell(p) {
  const cell = cells[p.position];

  if (cell.type === 'start') { p.hype += 10; }
  if (cell.type === 'plus') { p.hype += cell.value; }
  if (cell.type === 'minus') { p.hype = Math.max(0, p.hype - cell.value); }
  if (cell.type === 'skip') { p.skipNext = true; showModal("🛑 Пропуск хода!"); }
  if (cell.type === 'minusSkip') { p.hype = Math.max(0, p.hype - cell.value); p.skipNext = true; showModal(`🛑 -${cell.value} хайпа и пропуск хода`); }
  if (cell.type === 'risk') {
    showRiskModal(p);
  }
  if (cell.type === 'scandal') {
    showScandalModal(p);
  }

  renderHype();

  // Отправляем серверу
  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- РЕНДЕР ---
function renderPlayers() {
  const b = document.getElementById('gameBoard');
  b.querySelectorAll('.player').forEach(e => e.remove());

  players.forEach((p, i) => {
    const c = cells[p.position];
    if (!c) return;

    const el = document.createElement('div');
    el.className = 'player';
    el.style.background = p.color;

    el.style.left = (c.x + i * 10) + 'px';
    el.style.top = c.y + 'px';

    b.appendChild(el);
  });
}

function renderHype() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';
  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';
    bar.innerHTML = `<div class="hypeFill" style="width:${Math.min(p.hype,70)/70*100}%"></div>
                     <div style="position:absolute;width:100%;text-align:center;color:#fff;font-weight:bold;">${p.username}: ${p.hype}/70</div>`;
    container.appendChild(bar);
  });
}

function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = '';
  players.forEach(p => {
    const el = document.createElement('div');
    el.innerText = p.username;
    el.style.color = p.color;
    list.appendChild(el);
  });
}

// --- МОДАЛЬНЫЕ ОКНА ---
function showModal(text) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modalContent">${text}</div>`;
  modal.className = 'modal active';
  setTimeout(() => modal.className = 'modal', 2000);
}

function showRiskModal(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  let val = dice <= 3 ? -5 : 5;
  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 Риск! Выпало ${dice} → ${val > 0 ? '+' : ''}${val} хайпа`);
}

function showScandalModal(p) {
  const scandals = [
    { text: 'перегрел аудиторию🔥', val: -1, all: false },
    { text: 'громкий заголовок🫣', val: -2, all: false },
    { text: 'это монтаж 😱', val: -3, all: false },
    { text: 'меня взломали #️⃣', val: -3, all: true },
    { text: 'подписчики в шоке 😮', val: -4, all: false },
    { text: 'удаляй пока не поздно🤫', val: -5, all: false },
    { text: 'это контент, вы не понимаете🙄', val: -5, all: false, skip: true }
  ];

  const s = scandals[Math.floor(Math.random() * scandals.length)];
  if (s.all) {
    players.forEach(pl => pl.hype = Math.max(0, pl.hype + s.val));
  } else {
    p.hype = Math.max(0, p.hype + s.val);
  }

  if (s.skip) p.skipNext = true;

  showModal(`💥 Скандал! ${s.text} (${s.val > 0 ? '+' : ''}${s.val} хайпа)`);
  renderHype();
}

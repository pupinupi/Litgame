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
  if (currentTurnId !== socket.id) return;
  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl => {
  players = pl;
  renderPlayers();
  renderHype();
  renderPlayersList();
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
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

// --- МОДАЛКА ---
function showModal(text) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modalContent">${text}</div>`;
  modal.classList.add('active');
  modal.style.pointerEvents = 'auto';
  setTimeout(() => {
    modal.classList.remove('active');
    modal.style.pointerEvents = 'none';
  }, 3000);
}

// --- СПИСОК ИГРОКОВ ---
function renderPlayersList() {
  const list = document.getElementById('playersList');
  list.innerHTML = "<h3>Игроки:</h3>";
  players.forEach(p => {
    list.innerHTML += `<div style="color:${p.color}">${p.username} - ${p.hype} хайпа</div>`;
  });
}

// --- ХАЙП ---
function renderHype() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = "";
  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';
    const perc = Math.min(p.hype, 70) / 70 * 100;
    bar.innerHTML = `<div class="hypeFill" style="width:${perc}%"></div>
                     <span style="position:absolute;left:10px;font-weight:bold;">${p.username}: ${p.hype}/70</span>`;
    container.appendChild(bar);
  });
}

// --- КООРДИНАТЫ ---
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

  let count = 0;
  function step() {
    if (count >= steps) {
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

// --- ЛОГИКА КЛЕТОК ---
function handleCell(p) {
  const cell = cells[p.position];
  if (!cell) return;

  if (cell.type === 'start') {
    p.hype += 10;
    showModal("Старт! +10 хайпа");
  }
  if (cell.type === 'plus') {
    p.hype += cell.value;
    showModal(`+${cell.value} хайпа`);
  }
  if (cell.type === 'minus') {
    p.hype = Math.max(0, p.hype - cell.value);
    showModal(`-${cell.value} хайпа`);
  }
  if (cell.type === 'skip') {
    p.skipNext = true;
    showModal("Пропуск хода");
  }
  if (cell.type === 'minusSkip') {
    p.hype = Math.max(0, p.hype - cell.value);
    p.skipNext = true;
    showModal(`-${cell.value} хайпа и пропуск хода`);
  }
  if (cell.type === 'risk') {
    const dice = Math.floor(Math.random() * 6) + 1;
    const val = dice <= 3 ? -5 : 5;
    p.hype = Math.max(0, p.hype + val);
    showModal(`Риск! Выпало ${dice}: ${val > 0 ? '+' : ''}${val} хайпа`);
  }
  if (cell.type === 'scandal') {
    const events = [
      { text: "Перегрел аудиторию🔥", value: -1, skip: false, all: false },
      { text: "Громкий заголовок🫣", value: -2, skip: false, all: false },
      { text: "Это монтаж 😱", value: -3, skip: false, all: false },
      { text: "Меня взломали #️⃣", value: -3, skip: false, all: true },
      { text: "Подписчики в шоке 😮", value: -4, skip: false, all: false },
      { text: "Удаляй пока не поздно🤫", value: -5, skip: false, all: false },
      { text: "Это контент, вы не понимаете🙄", value: -5, skip: true, all: false }
    ];
    const e = events[Math.floor(Math.random() * events.length)];
    if (e.all) {
      players.forEach(pl => pl.hype = Math.max(0, pl.hype + e.value));
    } else {
      p.hype = Math.max(0, p.hype + e.value);
      if (e.skip) p.skipNext = true;
    }
    showModal(`${e.text}: ${e.value} хайпа${e.skip ? " и пропуск хода" : ""}`);
  }

  renderHype();

  // Обновление сервера
  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- РЕНДЕР ФИШЕК ---
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

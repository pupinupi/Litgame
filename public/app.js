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
  const p = players.find(p => p.id === playerId);

  if (playerId === socket.id) {
    showModal('🛑 Пропуск хода!');
  }

  if (p) {
    showTurnMessage(`⚖️ ${p.username} пропускает ход`, 2000);
  }
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

socket.on('nextTurn', id => {
  currentTurnId = id;

  document.getElementById('rollBtn').disabled = id !== socket.id || gameOver;

  const player = players.find(p => p.id === id);
  if (player) {
    showTurnMessage(`🎯 Ходит ${player.username}`);
  }

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

// --- ТВОИ КООРДИНАТЫ (НЕ ТРОГАЕМ) ---
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
      showModal('🔁 +7 хайпа за круг');
    }

    renderPlayers();
    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- ЛОГИКА КЛЕТОК ---
function handleCell(p) {
  const cell = cells[p.position];

  switch (cell.type) {

    case 'start':
      p.hype += 10;
      showTurnMessage(`🚀 +10 хайпа`);
      break;

    case 'plus':
      p.hype += cell.value;
      showTurnMessage(`➕ ${cell.value}`);
      break;

    case 'minus':
      p.hype = Math.max(0, p.hype - cell.value);
      showTurnMessage(`➖ ${cell.value}`);
      break;

    case 'skip':
      p.skipNext = true;
      showModal('🛑 Пропуск хода!');
      showTurnMessage(`⚖️ ${p.username} в тюрьме`, 2000);
      break;

    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.value);
      p.skipNext = true;
      showModal(`🛑 Суд: -${cell.value} и пропуск`);
      showTurnMessage(`⚖️ ${p.username} в тюрьме`, 2000);
      break;

    case 'risk':
      const roll = Math.floor(Math.random()*6)+1;
      const delta = roll <= 3 ? -5 : 5;
      p.hype = Math.max(0, p.hype + delta);

      showModal(`⚠️ Риск!\nВыпало ${roll}\n${delta > 0 ? '+' : ''}${delta} хайпа`);
      break;

    case 'scandal':
      const scandals = [
        {t:"🔥 Перегрел аудиторию", h:-1},
        {t:"🫣 Громкий заголовок", h:-2},
        {t:"😱 Это монтаж", h:-3},
        {t:"#️⃣ Меня взломали", h:-3, all:true},
        {t:"😮 Подписчики в шоке", h:-4},
        {t:"🤫 Удаляй пока не поздно", h:-5},
        {t:"🙄 Это контент", h:-5, skip:true}
      ];

      const s = scandals[Math.floor(Math.random()*scandals.length)];

      scandalSound.currentTime = 0;
      scandalSound.play();

      if (s.all) {
        players.forEach(pl => pl.hype = Math.max(0, pl.hype + s.h));
      } else {
        p.hype = Math.max(0, p.hype + s.h);
      }

      if (s.skip) p.skipNext = true;

      showScandalCard(s.t, s.h);
      break;
  }

  renderPlayers();
  renderHypeBars();

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- РЕНДЕР ФИШЕК ---
function renderPlayers(){
  const board = document.getElementById('gameBoard');

  document.querySelectorAll('.player').forEach(p=>p.remove());

  players.forEach(p=>{
    const div = document.createElement('div');
    div.className = `player ${p.color} ${p.id===currentTurnId?'active':''}`;

    const cell = cells[p.position];
    div.style.left = cell.x + 'px';
    div.style.top = cell.y + 'px';

    board.appendChild(div);
  });
}

// --- ХАЙП ---
function renderHypeBars(){
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';

  players.forEach(p=>{
    const bar = document.createElement('div');
    bar.className = 'hypeBar';

    const fill = document.createElement('div');
    fill.className = 'hypeFill';
    fill.style.width = Math.min(p.hype,70)/70*100 + '%';

    const text = document.createElement('div');
    text.innerText = `${p.username}: ${p.hype}`;

    bar.appendChild(fill);
    bar.appendChild(text);
    container.appendChild(bar);
  });
}

// --- ЛОББИ ---
function renderLobbyPlayers(){
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p=>`<div>${p.username} (${p.color})</div>`).join('');
}

// --- UI ---
function showModal(text){
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modalContent">${text}</div>`;
  modal.classList.add('active');
  setTimeout(()=>modal.classList.remove('active'),2000);
}

function showTurnMessage(msg, duration=1000){
  const el = document.getElementById('turnMessage');
  el.innerText = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), duration);
}

function showScandalCard(text, hype){
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <div class="scandalCard">
      <div class="scandalTitle">💥 Скандал</div>
      <div class="scandalText">${text}</div>
      <div class="scandalValue">${hype}</div>
      <button class="scandalBtn">ОК</button>
    </div>
  `;

  modal.classList.add('active');

  modal.querySelector('.scandalBtn').onclick = () => {
    modal.classList.remove('active');
  };
}

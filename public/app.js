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

// --- КЛЕТКИ С КООРДИНАТАМИ ---
const cells = [
  { x: 82, y: 587, type: 'start', hype: 10, skipNext: false },      
  { x: 97, y: 464, type: 'plus', hype: 3, skipNext: false },         
  { x: 86, y: 348, type: 'plus', hype: 2, skipNext: false },         
  { x: 93, y: 224, type: 'scandal', hype: -3, skipNext: false },     
  { x: 87, y: 129, type: 'risk', skipNext: false },                  
  { x: 219, y: 101, type: 'plus', hype: 2, skipNext: false },        
  { x: 364, y: 107, type: 'scandal', hype: -3, skipNext: false },    
  { x: 494, y: 95, type: 'plus', hype: 3, skipNext: false },         
  { x: 652, y: 96, type: 'plus', hype: 5, skipNext: false },         
  { x: 815, y: 89, type: 'minus', hype: Infinity, skipNext: false }, 
  { x: 930, y: 135, type: 'minusSkip', hypePercent: 50, skipNext: true }, 
  { x: 936, y: 247, type: 'plus', hype: 3, skipNext: false },        
  { x: 936, y: 357, type: 'risk', skipNext: false },                 
  { x: 941, y: 480, type: 'plus', hype: 3, skipNext: false },        
  { x: 937, y: 610, type: 'skip', skipNext: true },                  
  { x: 794, y: 624, type: 'plus', hype: 2, skipNext: false },        
  { x: 636, y: 635, type: 'scandal', hype: -3, skipNext: false },    
  { x: 517, y: 627, type: 'plus', hype: 8, skipNext: false },        
  { x: 355, y: 619, type: 'minus', hype: Infinity, skipNext: false }, 
  { x: 210, y: 626, type: 'plus', hype: 4, skipNext: false }         
];

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  };
});

// --- ВХОД В ЛОББИ ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value;
  roomCode = document.getElementById('roomCode').value;

  if (!username || !roomCode || !color) {
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// --- НАЧАТЬ ИГРУ ---
document.getElementById('startBtn').onclick = () => {
  socket.emit('startGame', roomCode);
};

// --- БРОСОК КУБИКА ---
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
  if(playerId === socket.id){
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

// --- ОБРАБОТКА КЛЕТКИ ---
function handleCell(p) {
  const cell = cells[p.position];
  if (!cell) return;

  let text = '';

  switch (cell.type) {
    case 'start':
      p.hype += cell.hype;
      text = `🚀 +${cell.hype}`;
      break;
    case 'plus':
      p.hype += cell.hype;
      text = `➕ ${cell.hype}`;
      break;
    case 'minus':
      p.hype = 0;
      text = '➖ весь хайп';
      break;
    case 'minusSkip':
      p.hype = Math.floor(p.hype * (1 - cell.hypePercent/100));
      p.skipNext = true;
      text = `🛑 Суд -50%`;
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

  players.forEach((p, i) => {
    let el = document.getElementById(p.id);

    if (!el) {
      el = document.createElement('div');
      el.className = 'player';
      el.id = p.id;
      el.style.background = p.color;
      b.appendChild(el);
    }

    const c = cells[p.position];
    if (!c) return;

    el.style.left = (c.x + i * 10) + 'px';
    el.style.top = c.y + 'px';
  });
}

// --- РЕНДЕР ХАЙПА ---
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

// --- РЕНДЕР ЛОББИ ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div style="color:${p.color}">${p.username}</div>`).join('');
}

// --- МОДАЛКИ ---
function showModal(text) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(() => m.classList.remove('active'), 2000);
}

// --- РИСК ---
function showRiskModal(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  const val = dice <= 3 ? -5 : 5;

  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 ${val}`);

  renderHypeBars();

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- СКАНДАЛ ---
function showScandalModal(p) {
  scandalSound.currentTime = 0;
  scandalSound.play();

  p.hype = Math.max(0, p.hype - 3);
  showModal('💥 Скандал -3');

  renderHypeBars();

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

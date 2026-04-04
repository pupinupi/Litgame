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

// --- ОБРАБОТКА КЛЕТКИ ---
function handleCell(p) {
  const cell = cells[p.position];
  let text = '';

  switch(cell.type) {
    case 'start':
      p.hype += 10; text='🚀 +10'; break;
    case 'plus':
      p.hype += cell.value; text=`➕ ${cell.value}`; break;
    case 'minus':
      p.hype = Math.max(0, p.hype - cell.value); text=`➖ ${cell.value}`; break;
    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.value);
      p.skipNext = true; text=`➖${cell.value} +🛑`; break;
    case 'skip':
      p.skipNext = true; text='🛑 Пропуск'; break;
    case 'risk':
      const r = Math.random() < 0.5 ? -5 : 5;
      p.hype = Math.max(0, p.hype + r); text=`⚠️ ${r>0?'+':'-'}${Math.abs(r)}`; break;
    case 'scandal':
      p.hype = Math.max(0, p.hype - 7);
      text='💥 Скандал -7';
      scandalSound.currentTime=0; scandalSound.play();
      break;
  }

  showModal(text);
  renderPlayers();
  renderHypeBars();

  if (p.hype >= 70) {
    gameOver = true;
    showModal(`🏆 Победа ${p.username}!`, true);
  } else {
    socket.emit('playerMoved', {
      roomCode,
      position: p.position,
      hype: p.hype,
      skipNext: p.skipNext
    });
  }
}

// --- ОТОБРАЖЕНИЕ ---
function renderPlayers() {
  const board = document.getElementById('gameBoard');
  board.querySelectorAll('.player').forEach(el => el.remove());

  players.forEach(p => {
    const el = document.createElement('div');
    el.className = `player ${p.color} ${p.id===currentTurnId?'active':''}`;
    el.style.left = cells[p.position].x + 'px';
    el.style.top = cells[p.position].y + 'px';
    board.appendChild(el);
  });
}

function renderHypeBars() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';
  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className='hypeBar';
    const fill = document.createElement('div');
    fill.className='hypeFill';
    fill.style.width = Math.min(p.hype/70*100,100)+'%';
    bar.appendChild(fill);
    const text = document.createElement('div');
    text.innerText = `${p.username}: ${p.hype}`;
    bar.appendChild(text);
    container.appendChild(bar);
  });
}

function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p=>p.username).join(', ');
}

// --- МОДАЛКА ---
function showModal(text, win=false) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modalContent">${text}</div>`;
  modal.classList.add('active');

  if (win) modal.querySelector('.modalContent').classList.add('winScreenBox');

  setTimeout(()=>modal.classList.remove('active'), 1500);
}

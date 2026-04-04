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
  renderPlayers();
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

// --- ЛОББИ ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = '';
  players.forEach(p => {
    const el = document.createElement('div');
    el.innerText = p.username;
    el.style.color = p.color;
    el.style.fontWeight = 'bold';
    list.appendChild(el);
  });
}

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

// --- РЕНДЕР ФИШЕК ---
function renderPlayers() {
  const board = document.getElementById('gameBoard');
  if(!board) return;

  document.querySelectorAll('.player').forEach(p => p.remove());

  players.forEach(p => {
    const el = document.createElement('div');
    el.className = `player ${p.color}`;
    if(p.id === currentTurnId) el.classList.add('active');
    el.style.left = cells[p.position].x + 'px';
    el.style.top = cells[p.position].y + 'px';
    board.appendChild(el);
  });
}

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
  switch (cell.type) {
    case 'start': p.hype += 10; break;
    case 'plus': p.hype += cell.value; break;
    case 'minus': p.hype = Math.max(0, p.hype - cell.value); break;
    case 'skip': 
      p.skipNext = true;
      showModal('🛑 Пропуск хода!'); 
      break;
    case 'risk':
      handleRisk(p);
      break;
    case 'scandal':
      handleScandal(p);
      break;
    case 'minusSkip':
      p.hype = Math.max(0, p.hype - cell.value);
      p.skipNext = true;
      showModal(`🛑 Суд: пропуск хода и -${cell.value} хайпа`);
      break;
  }

  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });

  renderHypeBars();
}

// --- РИСК ---
function handleRisk(player) {
  const dice = Math.floor(Math.random()*6)+1;
  let delta = (dice <= 3) ? -5 : 5;
  player.hype = Math.max(0, player.hype + delta);
  showModal(`⚠️ Риск! Выпало ${dice}, ${delta>0?'+5':'-5'} хайпа`);
}

// --- СКАНДАЛ ---
function handleScandal(player) {
  scandalSound.currentTime = 0;
  scandalSound.play();

  const scandalList = [
    {text:"🔥 Перегрел аудиторию", value:-1, skip:false},
    {text:"🫣 Громкий заголовок", value:-2, skip:false},
    {text:"😱 Это монтаж", value:-3, skip:false},
    {text:"#️⃣ Меня взломали", value:-3, skip:false, all:true},
    {text:"😮 Подписчики в шоке", value:-4, skip:false},
    {text:"🤫 Удаляй пока не поздно", value:-5, skip:false},
    {text:"🙄 Это контент, вы не понимаете", value:-5, skip:true}
  ];

  const choice = scandalList[Math.floor(Math.random()*scandalList.length)];
  
  if(choice.all){
    players.forEach(p => p.hype = Math.max(0, p.hype + choice.value));
  } else {
    player.hype = Math.max(0, player.hype + choice.value);
  }

  if(choice.skip) player.skipNext = true;

  showModal(`💣 Скандал! ${choice.text} (${choice.value>0?'+':'-'}${Math.abs(choice.value)} хайпа) ${choice.skip?'🛑 Пропуск хода':''}`);
}

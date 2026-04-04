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
  const p = players.find(p=>p.id===playerId);
  if(playerId === socket.id){
    showModal('🛑 Пропуск хода!');
  }
  if(p) showTurnMessage(`⚖️ Игрок ${p.username} пропускает ход`, 2000);
});

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

socket.on('nextTurn', id => {
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id || gameOver;

  const player = players.find(p => p.id === id);
  if(player) showTurnMessage(`🎯 Ходит ${player.username}`);
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

  switch (cell.type) {
    case 'start': 
      p.hype += 10; 
      showTurnMessage(`🚀 +10 хайпа`); 
      break;
    case 'plus': 
      p.hype += cell.value; 
      showTurnMessage(`➕ ${cell.value} хайпа`); 
      break;
    case 'minus': 
      p.hype = Math.max(0, p.hype - cell.value); 
      showTurnMessage(`➖ ${cell.value} хайпа`); 
      break;
    case 'skip': 
      p.skipNext = true; 
      showModal('🛑 Пропуск хода!');
      showTurnMessage(`⚖️ Игрок ${p.username} попал в тюрьму и пропускает ход`, 2000);
      break;
    case 'minusSkip': 
      p.hype=Math.max(0,p.hype-cell.value); 
      p.skipNext=true; 
      showModal(`🛑 Суд: пропуск хода и -${cell.value} хайпа`);
      showTurnMessage(`⚖️ Игрок ${p.username} попал в тюрьму и пропускает ход`, 2000);
      break;
    case 'risk':
      const dice = Math.floor(Math.random()*6)+1;
      const delta = (dice <= 3)? -5 : 5;
      p.hype = Math.max(0, p.hype + delta);
      showModal(`⚠️ Риск! Выпало ${dice}\n${delta>0?'+':'-'}${Math.abs(delta)} хайпа`);
      break;
    case 'scandal':
      const scandals = [
        {text:"🔥 Перегрел аудиторию", hype:-1, skip:false},
        {text:"🫣 Громкий заголовок", hype:-2, skip:false},
        {text:"😱 Это монтаж", hype:-3, skip:false},
        {text:"#️⃣ Меня взломали", hype:-3, skip:false, all:true},
        {text:"😮 Подписчики в шоке", hype:-4, skip:false},
        {text:"🤫 Удаляй пока не поздно", hype:-5, skip:false},
        {text:"🙄 Это контент, вы не понимаете", hype:-5, skip:true},
      ];
      const s = scandals[Math.floor(Math.random()*scandals.length)];
      scandalSound.currentTime=0; scandalSound.play();
      if(s.all) players.forEach(pl=>pl.hype=Math.max(0, pl.hype+s.hype));
      else p.hype=Math.max(0, p.hype+s.hype);
      if(s.skip) p.skipNext=true;
      showScandalCard(s.text, s.hype, s.skip);
      break;
  }

  renderPlayers();
  renderHypeBars();

  // отправляем обновление на сервер
  socket.emit('playerMoved', {
    roomCode,
    position: p.position,
    hype: p.hype,
    skipNext: p.skipNext
  });
}

// --- ФУНКЦИИ СООБЩЕНИЙ ---
function showTurnMessage(msg, duration=1000){
  const el = document.getElementById('turnMessage');
  el.innerText = msg;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); }, duration);
}

function showScandalCard(text, hype, skip){
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="scandalCard">
      <div class="scandalTitle">💥 Скандал!</div>
      <div class="scandalText">${text}</div>
      <div class="scandalValue">${hype>0?'+':'-'}${Math.abs(hype)}</div>
      <button class="scandalBtn">ОК</button>
    </div>`;
  modal.classList.add('active');
  modal.querySelector('.scandalBtn').onclick = ()=>modal.classList.remove('active');
}

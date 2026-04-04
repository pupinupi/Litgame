const scandalSound = new Audio('scandal.mp3');
scandalSound.volume = 0.8;

const diceSound = new Audio('dice.mp3');
diceSound.volume = 0.7;

const socket = io();

let players = [];
let currentTurnId = null;
let username, roomCode, color;

let isAnimating = false;

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
  if (isAnimating) return;
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

socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});

socket.on('nextTurn', id => {
  currentTurnId = id;

  document.getElementById('rollBtn').disabled = id !== socket.id;

  updateTurnUI();
  renderPlayers();
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;

  diceSound.currentTime = 0;
  diceSound.play();

  document.getElementById('diceResult').innerText = "🎲 " + dice;

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

  switch (cell.type) {

    case 'plus':
      p.hype += cell.value;
      showToast(`+${cell.value} хайпа`, "plus");
      break;

    case 'minus':
      p.hype = Math.max(0, p.hype - cell.value);
      showToast(`-${cell.value} хайпа`, "minus");
      break;

    case 'skip':
      p.skipNext = true;
      showToast("🛑 Пропуск хода", "minus");
      break;

    case 'risk':
      const roll = Math.floor(Math.random()*6)+1;
      const delta = roll <= 3 ? -5 : 5;

      p.hype = Math.max(0, p.hype + delta);
      showRisk(roll, delta);
      break;

    case 'scandal':
      const scandals = [
        {text:"🔥 перегрел аудиторию", hype:-1},
        {text:"🫣 громкий заголовок", hype:-2},
        {text:"😱 это монтаж", hype:-3},
        {text:"#️⃣ меня взломали", hype:-3, all:true},
        {text:"😮 подписчики в шоке", hype:-4},
        {text:"🤫 удаляй пока не поздно", hype:-5},
        {text:"🙄 это контент", hype:-5, skip:true}
      ];

      const s = scandals[Math.floor(Math.random()*scandals.length)];

      if(s.all){
        players.forEach(pl => pl.hype = Math.max(0, pl.hype + s.hype));
      } else {
        p.hype = Math.max(0, p.hype + s.hype);
      }

      if(s.skip) p.skipNext = true;

      showScandalCard(s);
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

// --- UI ---
function renderPlayers(){
  const board = document.getElementById('gameBoard');
  document.querySelectorAll('.player').forEach(p=>p.remove());

  players.forEach((p, i)=>{
    const div = document.createElement('div');
    div.className = `player ${p.color} ${p.id===currentTurnId?'active':''}`;

    const cell = cells[p.position];
    div.style.left = (cell.x - 15 + i*5) + 'px';
    div.style.top = (cell.y - 15 + i*5) + 'px';

    board.appendChild(div);
  });
}

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

function renderLobbyPlayers(){
  const list = document.getElementById('playersList');

  list.innerHTML = players.map(p => `
    <div style="color:${p.color}; font-weight:bold;">
      ${p.username}
    </div>
  `).join('');
}

function updateTurnUI(){
  const el = document.getElementById('turnInfo');
  const p = players.find(p=>p.id===currentTurnId);
  if(p) el.innerText = `Ходит: ${p.username}`;
}

// --- ЭФФЕКТЫ ---
function showToast(text, type="plus"){
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerText = text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1500);
}

function showScandalCard(data){
  const modal = document.getElementById('modal');

  scandalSound.currentTime = 0;
  scandalSound.play();

  modal.innerHTML = `
    <div class="scandalCard shake">
      <div class="scandalTitle">💥 СКАНДАЛ</div>
      <div class="scandalText">${data.text}</div>
      <div class="scandalValue">${data.hype}</div>
      <button class="scandalBtn">ОК</button>
    </div>
  `;

  modal.classList.add('active');

  modal.querySelector('button').onclick = () => {
    modal.classList.remove('active');
  };
}

function showRisk(roll, delta){
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <div class="riskCard">
      <div class="riskTitle">⚠️ РИСК</div>
      <div class="riskText">Выпало: ${roll}</div>
      <div class="riskValue">${delta > 0 ? '+' : ''}${delta}</div>
      <button class="scandalBtn">ОК</button>
    </div>
  `;

  modal.classList.add('active');

  modal.querySelector('button').onclick = () => {
    modal.classList.remove('active');
  };
}

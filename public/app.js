const socket = io();
let players = [];
let currentTurnId = null;
let username, roomCode, color;

// --- ВЫБОР ФИШКИ В ЛОББИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;

    socket.on('colorTaken', ()=>{
  alert("❌ Этот цвет уже занят!");
});
    
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

// --- НАЧАЛО ИГРЫ ---
document.getElementById('startBtn').onclick = () => {
  socket.emit('startGame', roomCode);
};

// --- БРОСОК КУБИКА ---
document.getElementById('rollBtn').onclick = () => {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;

  if (currentTurnId !== socket.id) return; // не твой ход

  if (me.skipNext) { // ПРОПУСК ХОДА
    me.skipNext = false;
    showModal('🛑 Пропуск хода!');
    socket.emit('playerMoved', { roomCode, position: me.position, hype: me.hype, skipNext: me.skipNext });
    return;
  }

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

socket.on('nextTurn', id=>{
  currentTurnId = id;

  const btn = document.getElementById('rollBtn');
  btn.disabled = id !== socket.id;

  // 💥 отладка (можешь потом удалить)
  if(id === socket.id){
    console.log("ТВОЙ ХОД");
  }
});

socket.on('diceRolled', ({ playerId, dice }) => {
  if (playerId !== socket.id) return;
  document.getElementById('diceResult').innerText = "🎲 " + dice;
  movePlayer(dice);
});

// --- КЛЕТКИ ПОЛЯ ---
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
  { x: 930, y: 135, type: 'minusSkip', value: 8 }, // Суд
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

// --- ДВИЖЕНИЕ ФИШКИ ---
function movePlayer(steps) {
  const me = players.find(p => p.id === socket.id);
  if (!me) return;
  let count = 0;

  function step() {
    if (count >= steps) { handleCell(me); return; }
    me.position = (me.position + 1) % cells.length;
    renderPlayers();
    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- ОБРАБОТКА КЛЕТОК ---
function handleCell(p) {
  const cell = cells[p.position];
  let modalText = '';

  switch (cell.type) {
    case 'start': p.hype += 10; modalText = '🚀 Старт! +10 хайпа'; break;
    case 'plus': p.hype += cell.value; modalText = `➕ +${cell.value} хайпа`; break;
    case 'minus': p.hype = Math.max(0, p.hype - cell.value); modalText = `➖ -${cell.value} хайпа`; break;
    case 'skip': p.skipNext = true; modalText = '🛑 Пропуск хода!'; break;
    case 'minusSkip': 
      p.hype = Math.max(0, p.hype - cell.value);
      p.skipNext = true;
      modalText = `🛑 -${cell.value} хайпа и пропуск хода!`; 
      break;
    case 'risk': showRiskModal(p); return;
    case 'scandal': showScandalModal(p); return;
  }

  renderHypeBars();
  if (modalText) showModal(modalText);

  socket.emit('playerMoved', { roomCode, position: p.position, hype: p.hype, skipNext: p.skipNext });
}

// --- РЕНДЕР ФИШЕК НА ПОЛЕ ---
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

// --- ШКАЛА ХАЙПА ДЛЯ ВСЕХ ---
function renderHypeBars() {
  const container = document.getElementById('hypeBars');
  container.innerHTML = '';
  players.forEach(p => {
    const bar = document.createElement('div');
    bar.className = 'hypeBar';
    const fill = document.createElement('div');
    fill.className = 'hypeFill';
    fill.style.width = Math.min(p.hype, 70) / 70 * 100 + '%';
    bar.innerHTML = `<div style="text-align:center;font-weight:bold;color:#fff;">${p.username}: ${p.hype}/70</div>`;
    bar.appendChild(fill);
    container.appendChild(bar);
  });
}

// --- ЛОББИ: список игроков ---
function renderLobbyPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p => `<div style="color:${p.color}">${p.username}</div>`).join('');
}

// --- МОДАЛКИ ---
function showModal(text) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(() => { m.classList.remove('active'); }, 1500);
}

// --- РИСК ---
function showRiskModal(p) {
  const dice = Math.floor(Math.random() * 6) + 1;
  const val = (dice <= 3 ? -5 : 5);
  p.hype = Math.max(0, p.hype + val);
  showModal(`🎲 Риск! Выпало ${dice}, ${val > 0 ? '+' : '-'}${Math.abs(val)} хайпа`);
  renderHypeBars();
  socket.emit('playerMoved', { roomCode, position: p.position, hype: p.hype, skipNext: p.skipNext });
}

// --- СКАНДАЛ ---
function showScandalModal(p){
  const options=[
    {text:'перегрел аудиторию🔥', val:-1},
    {text:'громкий заголовок🫣', val:-2},
    {text:'это монтаж 😱', val:-3},
    {text:'меня взломали #️⃣', val:-3, all:true},
    {text:'подписчики в шоке 😮', val:-4},
    {text:'удаляй пока не поздно🤫', val:-5},
    {text:'это контент, вы не понимаете🙄', val:-5, skip:true}
  ];

  const choice=options[Math.floor(Math.random()*options.length)];

  const m=document.getElementById('modal');
  m.style.display = "flex";
  m.innerHTML=`
    <div class="scandalCard">
      <div class="scandalTitle">💥 СКАНДАЛ</div>

      <div class="scandalText">
        ${choice.text}
      </div>

      <div class="scandalValue">
        ${choice.val} ХАЙПА
      </div>

      <button class="scandalBtn">ПРИНЯТЬ</button>
    </div>
  `;

  m.classList.add('active');

  // КНОПКА
  document.querySelector('.scandalBtn').onclick=()=>{

    if(choice.all){
      players.forEach(pl=>{
        pl.hype=Math.max(0, pl.hype+choice.val);
      });
    }else{
      p.hype=Math.max(0, p.hype+choice.val);
    }

    if(choice.skip){
      p.skipNext=true;
    }

    renderHypeBars();

    m.classList.remove('active');

    socket.emit('playerMoved',{
      roomCode,
      position:p.position,
      hype:p.hype,
      skipNext:p.skipNext
    });
  };
}

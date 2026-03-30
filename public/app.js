const diceSound = new Audio('dice.mp3');
const socket = io();

let players = [];
let currentTurnId = null;

let username, roomCode, color;

// --- ОШИБКА ЦВЕТА ---
socket.on('colorTaken', ()=>{
  alert("❌ Этот цвет уже занят!");
});

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

// --- БРОСОК ---
document.getElementById('rollBtn').onclick = () => {
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

socket.on('nextTurn', id=>{
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id;
});

// 🎲 ЗВУК + ДВИЖЕНИЕ
socket.on('diceRolled', ({playerId,dice})=>{

  diceSound.pause();
  diceSound.currentTime = 0;

  diceSound.play().then(()=>{

    if(playerId === socket.id){
      document.getElementById('diceResult').innerText = "🎲 " + dice;
    }

    setTimeout(()=>{
      if(playerId === socket.id){
        movePlayer(dice);
      }
    }, 300);

  }).catch(()=>{
    if(playerId === socket.id){
      document.getElementById('diceResult').innerText = "🎲 " + dice;
      movePlayer(dice);
    }
  });

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
function movePlayer(steps){
  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  let count = 0;

  function step(){
    if(count >= steps){
      handleCell(me);
      return;
    }

    const prevPos = me.position;

    me.position = (me.position + 1) % cells.length;

    // 🔁 ПРОХОД СТАРТА
    if(me.position === 0 && prevPos !== 0){
      me.hype += 7;
      showModal("🔁 КРУГ ПРОЙДЕН<br>+7 ХАЙПА");
    }

    renderPlayers();

    count++;
    setTimeout(step, 300);
  }

  step();
}

// --- ЛОГИКА ---
function handleCell(p){
  const cell = cells[p.position];
  let text = '';

  switch(cell.type){
    case 'start': p.hype += 10; text='🚀 Старт +10'; break;
    case 'plus': p.hype += cell.value; text=`+${cell.value} хайпа`; break;
    case 'minus': p.hype = Math.max(0, p.hype - cell.value); text=`-${cell.value}`; break;
    case 'skip': p.skipNext = true; text='Пропуск хода'; break;
    case 'minusSkip': p.hype = Math.max(0, p.hype - cell.value); p.skipNext = true; text='Штраф + пропуск'; break;
    case 'risk': showRiskModal(p); return;
    case 'scandal': showScandalModal(p); return;
  }

  renderHypeBars();
  if(text) showModal(text);

  // 🏆 ПОБЕДА
  if(p.hype >= 70){
    showWinScreen(p);
    document.getElementById('rollBtn').disabled = true;
    return;
  }

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- РЕНДЕР ФИШЕК ---
function renderPlayers(){
  const b = document.getElementById('gameBoard');
  players.forEach((p,i)=>{
    let el = document.getElementById(p.id);

    if(!el){
      el = document.createElement('div');
      el.className='player';
      el.id=p.id;
      el.style.background=p.color;
      b.appendChild(el);
    }

    const c = cells[p.position];
    if(!c) return;

    el.style.left = (c.x + i*10) + 'px';
    el.style.top = c.y + 'px';
  });
}

// --- ШКАЛА ---
function renderHypeBars(){
  const container = document.getElementById('hypeBars');
  container.innerHTML='';

  players.forEach(p=>{
    const bar = document.createElement('div');
    bar.className='hypeBar';

    const fill = document.createElement('div');
    fill.className='hypeFill';
    fill.style.width = (p.hype/70*100)+'%';

    bar.innerHTML = `<div>${p.username}: ${p.hype}/70</div>`;
    bar.appendChild(fill);

    container.appendChild(bar);
  });
}

// --- ЛОББИ ---
function renderLobbyPlayers(){
  const list = document.getElementById('playersList');
  list.innerHTML = players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join('');
}

// --- МОДАЛ ---
function showModal(text){
  const m=document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(()=>m.classList.remove('active'),1500);
}

// --- РИСК ---
function showRiskModal(p){
  const dice=Math.floor(Math.random()*6)+1;
  const val = dice<=3?-5:5;

  p.hype = Math.max(0, p.hype+val);

  showModal(`🎲 ${dice} → ${val>0?'+':'-'}${Math.abs(val)}`);
  renderHypeBars();

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
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
    {text:'это контент 🙄', val:-5, skip:true}
  ];

  const choice=options[Math.floor(Math.random()*options.length)];

  if(choice.all){
    players.forEach(pl=>pl.hype=Math.max(0,pl.hype+choice.val));
  }else{
    p.hype=Math.max(0,p.hype+choice.val);
  }

  if(choice.skip) p.skipNext=true;

  showModal(`${choice.text}<br>${choice.val} хайпа`);
  renderHypeBars();

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- ПОБЕДА ---
function showWinScreen(winner){
  const m=document.getElementById('modal');

  m.innerHTML=`
    <div class="winScreenBox">
      <div class="winTitle">🏆 ПОБЕДА</div>
      <div class="winName">${winner.username}</div>
    </div>
  `;

  m.classList.add('active');
}

const img = document.getElementById("boardImg");

img.onerror = () => {
  console.error("❌ КАРТИНКА НЕ НАЙДЕНА");
  alert("board.jpg не найден!");
};

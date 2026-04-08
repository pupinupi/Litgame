const socket = io();

const scandalSound = new Audio('scandal.mp3');
const diceSound = new Audio('dice.mp3');

let players = [];
let currentTurnId = null;
let username, roomCode, color;
let isAnimating = false;
let gameOver = false;

// --- СКАНДАЛ ---
const SCANDALS = [
  { text: "перегрел аудиторию🔥", value: -1 },
  { text: "громкий заголовок🫣", value: -2 },
  { text: "это монтаж 😱", value: -3 },
  { text: "меня взломали #️⃣", all: true, value: -3 },
  { text: "подписчики в шоке 😮", value: -4 },
  { text: "удаляй пока не поздно🤫", value: -5 },
  { text: "это контент🙄", value: -5, skip: true }
];

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  }
});

// --- ВХОД ---
document.getElementById('joinBtn').onclick = ()=>{
  username = usernameInput.value;
  roomCode = roomCodeInput.value;

  socket.emit('joinRoom',{username, roomCode, color});
};

// --- СТАРТ ---
startBtn.onclick = ()=>socket.emit('startGame', roomCode);

// --- КУБИК ---
rollBtn.onclick = ()=>{
  if(currentTurnId !== socket.id || isAnimating || gameOver) return;
  socket.emit('rollDice', roomCode);
};

// --- СОКЕТЫ ---
socket.on('updatePlayers', pl=>{
  players = pl;
  renderPlayers();
  renderHypeBars();
});

socket.on('gameOver', name=>{
  gameOver = true;
  showModal(`🏆 Победил ${name}`);
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
  rollBtn.classList.toggle('disabled', id !== socket.id);
});

socket.on('diceRolled', ({playerId,dice})=>{
  if(playerId !== socket.id) return;

  diceSound.play();
  diceResult.innerText = "🎲 "+dice;

  movePlayer(dice);
});

socket.on('playerSkipped', id=>{
  if(id===socket.id) showModal("🛑 Пропуск хода");
});

// --- КЛЕТКИ ---
const cells = [...]; // оставь свои координаты как есть

// --- ДВИЖЕНИЕ ---
function movePlayer(steps){
  const me = players.find(p=>p.id===socket.id);
  let count = 0;
  isAnimating = true;

  function step(){
    if(count>=steps){
      isAnimating=false;
      handleCell(me);
      return;
    }

    const prev = me.position;
    me.position = (me.position+1)%cells.length;

    if(me.position===0 && prev!==0){
      me.hype += 7;
      showModal("🔁 +7 хайпа");
    }

    renderPlayers();
    count++;
    setTimeout(step,300);
  }
  step();
}

// --- КЛЕТКА ---
function handleCell(p){
  const cell = cells[p.position];

  switch(cell.type){
    case 'start': p.hype+=10; break;
    case 'plus': p.hype+=cell.value; break;
    case 'minus': p.hype-=cell.value; break;
    case 'skip': p.skipNext=true; break;
    case 'minusSkip': p.hype-=cell.value; p.skipNext=true; break;
    case 'risk': return risk(p);
    case 'scandal': return scandal(p);
  }

  p.hype = Math.max(0,p.hype);

  checkWin(p);
  updateServer(p);
}

// --- РИСК ---
function risk(p){
  const d = Math.floor(Math.random()*6)+1;
  const val = d<=3 ? -5 : 5;

  p.hype = Math.max(0,p.hype+val);
  showModal(`🎲 Риск ${val}`);

  checkWin(p);
  updateServer(p);
}

// --- СКАНДАЛ ---
function scandal(p){
  scandalSound.play();

  const card = SCANDALS[Math.floor(Math.random()*SCANDALS.length)];

  if(card.all){
    players.forEach(pl=>pl.hype=Math.max(0,pl.hype+card.value));
  } else {
    p.hype = Math.max(0,p.hype+card.value);
  }

  if(card.skip) p.skipNext=true;

  showModal(`💥 ${card.text}`);
  checkWin(p);
  updateServer(p);
}

// --- ПОБЕДА ---
function checkWin(p){
  if(p.hype>=70){
    gameOver=true;
    socket.emit('playerMoved',{
      roomCode,
      position:p.position,
      hype:p.hype,
      skipNext:p.skipNext,
      win:true
    });
  }
}

// --- ОТПРАВКА ---
function updateServer(p){
  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- РЕНДЕР ---
function renderPlayers(){
  const b = gameBoard;

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
    el.style.left = (c.x+i*10)+'px';
    el.style.top = c.y+'px';
  });
}

function renderHypeBars(){
  hypeBars.innerHTML='';

  players.forEach(p=>{
    const bar = document.createElement('div');
    bar.className='hypeBar';

    const fill = document.createElement('div');
    fill.className='hypeFill';
    fill.style.width = Math.min(p.hype,70)/70*100+'%';

    bar.innerHTML=`${p.username}: ${p.hype}/70`;
    bar.appendChild(fill);
    hypeBars.appendChild(bar);
  });
}

function showModal(text){
  modal.innerHTML=`<div class="modalContent">${text}</div>`;
  modal.classList.add('active');
  setTimeout(()=>modal.classList.remove('active'),2000);
}

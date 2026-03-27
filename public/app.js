window.gameEnded = false;

const socket = io();

let players = [];
let currentTurnId = null;

// 👉 ВАЖНО: добавили переменные
let username = "";
let roomCode = "";
let color = null;

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(chip=>{
  chip.onclick = () => {

    // убрать выделение у всех
    document.querySelectorAll('.chip').forEach(c=>{
      c.classList.remove('selected');
    });

    // выделить текущую
    chip.classList.add('selected');

    color = chip.dataset.color;
  };
});

// --- КНОПКА ВОЙТИ ---
document.getElementById('joinBtn').onclick = () => {

  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if(!username || !roomCode || !color){
    alert("Заполни имя, комнату и выбери фишку");
    return;
  }

  socket.emit('joinRoom', {username, roomCode, color});
};

// --- КНОПКА СТАРТ ---
document.getElementById('startBtn').onclick = () => {
  if(!roomCode) return;
  socket.emit('startGame', roomCode);
};

// --- КНОПКА КУБИКА ---
document.getElementById('rollBtn').onclick = () => {
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{

  pl.forEach(newP=>{
    const old = players.find(p=>p.id===newP.id);
    if(old) newP.oldPosition = old.position;
  });

  players = pl;

  updatePlayersUI();
  renderHype();
  renderLobbyPlayers();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  showDice(dice);
  movePlayerSmooth(playerId);
});

// --- ЛОББИ СПИСОК ---
function renderLobbyPlayers(){
  const list = document.getElementById('playersList');

  list.innerHTML = players.map(p=>
    `<div style="color:${p.color}; font-size:20px;">
      ${p.username}
    </div>`
  ).join('');
}

// --- КЛЕТКИ ---
const cells=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},
  {x:219,y:101},{x:364,y:107},{x:494,y:95},{x:652,y:96},{x:815,y:89},
  {x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},{x:937,y:610},
  {x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

// --- ФИШКИ ---
function updatePlayersUI(){
  const board = document.getElementById('gameBoard');

  players.forEach((p,i)=>{
    let el = document.querySelector(`[data-id="${p.id}"]`);

    if(!el){
      el = document.createElement('div');
      el.className = 'player';
      el.dataset.id = p.id;
      el.style.background = p.color;
      board.appendChild(el);
    }

    const c = cells[p.position];
    el.style.left = (c.x + i*15)+'px';
    el.style.top = c.y+'px';
  });
}

// --- ДВИЖЕНИЕ ---
function movePlayerSmooth(id){
  const p = players.find(pl=>pl.id===id);
  if(!p) return;

  let from = p.oldPosition ?? p.position;
  let to = p.position;

  let path=[];
  let cur=from;

  while(cur!==to){
    cur++;
    if(cur>=cells.length) cur=0;
    path.push(cur);
  }

  const el=document.querySelector(`[data-id="${p.id}"]`);
  if(!el) return;

  let i=0;

  function step(){
    if(i>=path.length) return;

    animateMove(el, from, path[i], ()=>{
      from=path[i];
      i++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(el, fromIndex, toIndex, cb){
  const from=cells[fromIndex];
  const to=cells[toIndex];

  let t=0;

  const interval=setInterval(()=>{
    t+=0.08;

    el.style.left = from.x+(to.x-from.x)*t+"px";
    el.style.top  = from.y+(to.y

window.gameEnded = false;

const socket = io();

let players = [];
let currentTurnId = null;

// --- КНОПКИ ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;
  if(currentTurnId !== socket.id) return;

  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{

  pl.forEach(newP=>{
    const old = players.find(p=>p.id===newP.id);
    if(old){
      newP.oldPosition = old.position;
    }
  });

  players = pl;

  updatePlayersUI();
  renderHype();
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
});

socket.on('diceRolled', ({playerId})=>{
  movePlayerSmooth(playerId);
});

socket.on('gameEnded', winner=>{
  window.gameEnded = true;
  showWinScreen(winner);
});

// --- КЛЕТКИ ---
const cells=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},
  {x:219,y:101},{x:364,y:107},{x:494,y:95},{x:652,y:96},{x:815,y:89},
  {x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},{x:937,y:610},
  {x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

// --- СОЗДАНИЕ/ОБНОВЛЕНИЕ ФИШЕК ---
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

    const cell = cells[p.position];

    el.style.left = (cell.x + i*18) + 'px';
    el.style.top = cell.y + 'px';
  });
}

// --- ДВИЖЕНИЕ ---
function movePlayerSmooth(id){
  const p = players.find(pl => pl.id===id);
  if(!p) return;

  let from = p.oldPosition ?? p.position;
  let to = p.position;

  let path = [];
  let cur = from;

  while(cur !== to){
    cur++;
    if(cur >= cells.length) cur = 0;
    path.push(cur);
  }

  let el = document.querySelector(`[data-id="${p.id}"]`);
  if(!el) return;

  let i = 0;

  function step(){
    if(i >= path.length) return;

    let next = path[i];

    animateMove(el, from, next, ()=>{
      from = next;
      i++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(el, fromIndex, toIndex, callback){
  const from = cells[fromIndex];
  const to = cells[toIndex];

  let frames = 20;
  let count = 0;

  const interval = setInterval(()=>{
    count++;

    const progress = count / frames;

    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    if(count >= frames){
      clearInterval(interval);
      callback();
    }
  }, 16);
}

// --- ХАЙП ---
function renderHype(){
  const container = document.getElementById('hypeBars');

  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  const percent = Math.min((me.hype/70)*100,100);

  container.innerHTML = `
    <div class="hypeBig">${me.hype} / 70</div>
    <div class="hypeBarBig">
      <div class="hypeFillBig" style="width:${percent}%"></div>
    </div>
  `;
}

// --- ПОБЕДА ---
function showWinScreen(name){
  const m = document.getElementById('modal');
  m.innerHTML=`<div class="winScreen">🏆 ${name} победил!</div>`;
  m.classList.add('active');
}

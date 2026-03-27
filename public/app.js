window.gameEnded = false;

const socket = io();

let players = [];
let username, roomCode, color;
let currentTurnId = null;

// --- ЛОББИ ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>color=btn.dataset.color;
});

document.getElementById('joinBtn').onclick=()=>{
  username = document.getElementById('username').value;
  roomCode = document.getElementById('roomCode').value;

  if(!username || !roomCode || !color){
    alert("Заполните все поля");
    return;
  }

  socket.emit('joinRoom', {username, roomCode, color});
};

document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame', roomCode);
};

// --- КНОПКА ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;
  if(currentTurnId !== socket.id) return;

  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{

  // сохраняем старые позиции
  pl.forEach(newP=>{
    const old = players.find(p=>p.id===newP.id);
    if(old){
      newP.oldPosition = old.position;
    }
  });

  // показать изменение хайпа
  const meOld = players.find(p=>p.id===socket.id);
  const meNew = pl.find(p=>p.id===socket.id);

  if(meOld && meNew){
    const diff = meNew.hype - meOld.hype;
    if(diff !== 0){
      showModal(`${diff>0?'🔥 +':'💀 '}${diff} хайпа`);
    }
  }

  players = pl;

  renderPlayers();
  renderHype();
  renderLobbyPlayers();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId = id;

  const p = players.find(p=>p.id===id);
  document.getElementById('turnText').innerText=`Ходит: ${p?.username}`;

  const btn = document.getElementById('rollBtn');
  btn.disabled = id !== socket.id;

  // подсветка активного
  document.querySelectorAll('.player').forEach(el=>{
    el.classList.remove('activePlayer');
  });

  const active = document.querySelector(`[data-id="${id}"]`);
  if(active) active.classList.add('activePlayer');
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

  let i = 0;

  function step(){
    if(i >= path.length) return;

    let next = path[i];

    animateMove(p, from, next, ()=>{
      from = next;
      i++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(p, fromIndex, toIndex, callback){
  const el = document.querySelector(`[data-id="${p.id}"]`);
  if(!el){ callback(); return; }

  const from = cells[fromIndex];
  const to = cells[toIndex];

  let frames = 18;
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

// --- РЕНДЕР ---
function renderPlayers(){
  const board = document.getElementById('gameBoard');

  board.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el = document.createElement('div');
    el.className='player';
    el.dataset.id = p.id;
    el.style.background = p.color;

    const cell = cells[p.position];

    el.style.left = (cell.x + i*18) + 'px';
    el.style.top = cell.y + 'px';

    board.appendChild(el);
  });
}

// --- ХАЙП ---
function renderHype(){
  const container = document.getElementById('hypeBars');
  container.innerHTML='';

  const sorted = [...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,index)=>{
    const percent = Math.min((p.hype/70)*100,100);
    const medal = index===0?"🥇":index===1?"🥈":index===2?"🥉":"";

    const div = document.createElement('div');

    div.innerHTML=`
      <div class="hypeName" style="color:${p.color}">
        ${medal} ${p.username}: ${p.hype} / 70
      </div>
      <div class="hypeBar">
        <div class="hypeFill" style="width:${percent}%"></div>
      </div>
    `;

    container.appendChild(div);
  });
}

// --- ЛОББИ ---
function renderLobbyPlayers(){
  const l = document.getElementById('playersList');
  l.innerHTML = players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join("");
}

// --- МОДАЛ ---
function showModal(text){
  const m = document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(()=>m.classList.remove('active'),2000);
}

// --- ПОБЕДА ---
function showWinScreen(name){
  const m = document.getElementById('modal');
  m.innerHTML=`<div class="winScreen">🏆 ${name} победил!</div>`;
  m.classList.add('active');
}

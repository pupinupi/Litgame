window.gameEnded = false;

const socket = io();
let players=[], username, roomCode, color, currentTurnId=null;

// --- Лобби ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>color=btn.dataset.color;
});

document.getElementById('joinBtn').onclick=()=>{
  username=document.getElementById('username').value;
  roomCode=document.getElementById('roomCode').value;
  if(!username||!roomCode||!color){alert("Заполни всё");return;}
  socket.emit('joinRoom',{username,roomCode,color});
};

document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame',roomCode);
};

// --- Игра ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;
  if(currentTurnId===socket.id){
    socket.emit('rollDice',roomCode);
  }
};

// --- Socket ---
socket.on('updatePlayers', pl=>{
  players=pl;
  renderPlayers();
  renderHype();
  renderLobbyPlayers();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId=id;
  const p=players.find(p=>p.id===id);
  document.getElementById('turnText').innerText=`Ходит: ${p.username}`;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerHTML=
  `🎲 Выпало: <span style="font-size:28px;color:#00eaff">${dice}</span>`;
  movePlayerSmooth(playerId,dice);
});

// --- клетки ---
const cells=[
  {name:"Старт",x:82,y:587,type:'start'},
  {name:"+3",x:97,y:464,type:'plus',value:3},
  {name:"+2",x:86,y:348,type:'plus',value:2},
  {name:"Скандал",x:93,y:224,type:'scandal'},
  {name:"Риск",x:87,y:129,type:'risk'},
  {name:"+2",x:219,y:101,type:'plus',value:2},
  {name:"Скандал",x:364,y:107,type:'scandal'},
  {name:"+3",x:494,y:95,type:'plus',value:3},
  {name:"+5",x:652,y:96,type:'plus',value:5},
  {name:"-10",x:815,y:89,type:'minus',value:10},
  {name:"-8 skip",x:930,y:135,type:'minusSkip',value:8},
  {name:"+3",x:936,y:247,type:'plus',value:3},
  {name:"Риск",x:936,y:357,type:'risk'},
  {name:"+3",x:941,y:480,type:'plus',value:3},
  {name:"skip",x:937,y:610,type:'skip'},
  {name:"+2",x:794,y:624,type:'plus',value:2},
  {name:"Скандал",x:636,y:635,type:'scandal'},
  {name:"+8",x:517,y:627,type:'plus',value:8},
  {name:"-10",x:355,y:619,type:'minus',value:10},
  {name:"+4",x:210,y:626,type:'plus',value:4}
];

// --- ПЛАВНОЕ ДВИЖЕНИЕ ---
function movePlayerSmooth(id, steps){
  const p=players.find(p=>p.id===id);

  let stepIndex = 0;

  function step(){
    if(stepIndex >= steps){
      handleCell(p, cells[p.position]);
      return;
    }

    let prev = p.position;
    p.position = (p.position + 1) % cells.length;

    // бонус за круг
    if(prev === cells.length - 1){
      p.hype += 5;
      showModal("🔥 +5 за круг");
    }

    animateMove(p, prev, p.position, () => {
      stepIndex++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(p, fromIndex, toIndex, callback){
  const board=document.getElementById('gameBoard');
  const el=[...board.querySelectorAll('.player')]
    .find(e=>e.style.background===p.color);

  if(!el){ callback(); return; }

  const from=cells[fromIndex];
  const to=cells[toIndex];

  let progress = 0;

  const anim = setInterval(()=>{
    progress += 0.1;

    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    if(progress >= 1){
      clearInterval(anim);
      renderPlayers();
      callback();
    }

  }, 20);
}

// --- логика клеток ---
if(cell.type==='start'){
  p.hype += 10;
  glow(cell,'start');
  showModal("🚀 +10 за старт");
}

if(cell.type==='plus'){
  p.hype+=cell.value;
  glow(cell,'plus');
}

if(cell.type==='minus'){
  p.hype=Math.max(0,p.hype-cell.value);
  glow(cell,'minus');
}

if(cell.type==='skip'){
  p.skipNext=true;
  glow(cell,'minus');
  showModal("Пропуск хода");
}

if(cell.type==='minusSkip'){
  p.hype=Math.max(0,p.hype-cell.value);
  p.skipNext=true;
  glow(cell,'minusSkip');
  showModal("-8 и пропуск");
}

if(cell.type==='scandal'){
  glow(cell,'scandal');
  showScandal(p);
}

if(cell.type==='risk'){
  glow(cell,'risk');
  showRisk(p);
}
// --- остальной код (без изменений) ---

function showModal(text){
  const m=document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(()=>m.classList.remove('active'),3000);
}

function renderPlayers(){
  const b=document.getElementById('gameBoard');
  b.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='player';
    el.style.background=p.color;
    el.style.left=`${cells[p.position].x+i*30}px`;
    el.style.top=`${cells[p.position].y}px`;
    b.appendChild(el);
  });
}

function renderHype(){
  const container=document.getElementById('hypeBars');
  container.innerHTML='';

  let maxHype=Math.max(...players.map(p=>p.hype));

  players.forEach(p=>{
    const percent=Math.min((p.hype/70)*100,100);

    const div=document.createElement('div');
    div.className='hypeContainer';

    if(p.hype===maxHype && maxHype>0){
      div.classList.add('leader');
    }

    div.innerHTML=`
      <div class="hypeLabel" style="color:${p.color}">
        ${p.username}: ${p.hype}/70
      </div>
      <div class="hypeBar">
        <div class="hypeFill" style="width:${percent}%"></div>
      </div>
    `;

    container.appendChild(div);

    if(p.hype>=70 && !window.gameEnded){
      window.gameEnded = true;
      showWinScreen(p.username);
    }
  });
}

function showWinScreen(name){
  const m=document.getElementById('modal');
  m.innerHTML=`
    <div class="winScreen">
      <div class="winTitle">🏆 ПОБЕДА</div>
      <div class="winPlayer">${name}</div>
      <div class="winText">набрал 70 хайпа!</div>
    </div>
  `;
  m.classList.add('active');
}

function renderLobbyPlayers(){
  const l=document.getElementById('playersList');
  l.innerHTML=players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join("");
}

function glow(cell, type){

  let colorClass = 'green';

  if(type === 'minus' || type === 'minusSkip') colorClass = 'red';
  if(type === 'scandal') colorClass = 'red';
  if(type === 'risk') colorClass = 'blue';
  if(type === 'start') colorClass = 'yellow';

  const d = document.createElement('div');
  d.className = `cellGlow ${colorClass}`;

  d.style.left = (cell.x - 10) + 'px';
  d.style.top = (cell.y - 10) + 'px';

  document.getElementById('gameBoard').appendChild(d);

  setTimeout(()=>d.remove(),600);
}

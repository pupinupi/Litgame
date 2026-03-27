window.gameEnded = false;

const socket = io();
let players=[], username, roomCode, color, currentTurnId=null;

// --- ЛОББИ ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>color=btn.dataset.color;
});

document.getElementById('joinBtn').onclick=()=>{
  username=document.getElementById('username').value;
  roomCode=document.getElementById('roomCode').value;

  if(!username||!roomCode||!color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame',roomCode);
};

// --- КУБИК ---
document.getElementById('rollBtn').onclick=()=>{
  const me = players.find(p=>p.id===socket.id);

  if(window.gameEnded) return;

  if(currentTurnId !== socket.id) return;

  if(me && me.skipNext){
    showModal("⛔ Вы пропускаете ход");
    return;
  }

  socket.emit('rollDice',roomCode);
};

// --- SOCKET ---
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

  const me = players.find(pl=>pl.id===socket.id);

  if(id !== socket.id){
    document.getElementById('rollBtn').disabled = true;
    return;
  }

  if(me && me.skipNext){
    showModal("⛔ Вы пропускаете ход");
    document.getElementById('rollBtn').disabled = true;

    setTimeout(()=>{
      document.getElementById('rollBtn').disabled = false;
    },2000);

    return;
  }

  document.getElementById('rollBtn').disabled = false;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerHTML=
  `🎲 Выпало: <span style="font-size:28px;color:#00eaff">${dice}</span>`;
  movePlayerSmooth(playerId,dice);
});

// --- КЛЕТКИ ---
const cells=[ /* твои клетки оставь как есть */ ];

// --- ДВИЖЕНИЕ ---
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

    if(prev === cells.length - 1){
      p.hype += 5;
      showModal("🔥 +5 за круг");
    }

    glow(cells[p.position], 'step');

    animateMove(p, prev, p.position, ()=>{
      stepIndex++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(p, fromIndex, toIndex, callback){
  const el=[...document.querySelectorAll('.player')]
    .find(e=>e.style.background===p.color);

  if(!el){ callback(); return; }

  const from=cells[fromIndex];
  const to=cells[toIndex];

  let progress = 0;

  const anim = setInterval(()=>{
    progress += 0.08;

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

// --- ЛОГИКА ---
function handleCell(p,cell){

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
    glow(cell,'minus');
    showModal("-8 и пропуск");
  }

  if(cell.type==='scandal'){
    showScandal(p);
  }

  if(cell.type==='risk'){
    glow(cell,'risk');
    showRisk(p);
  }

  renderHype();
}

// --- СКАНДАЛ ---
function showScandal(p){

  document.body.classList.add('shake');
  setTimeout(()=>document.body.classList.remove('shake'),400);

  const cards=[
    {text:"Перегрел аудиторию 🔥", value:-1},
    {text:"Громкий заголовок 🫣", value:-2},
    {text:"Это монтаж 😱", value:-3},
    {text:"Меня взломали #️⃣", value:-3, all:true},
    {text:"Подписчики в шоке 😮", value:-4},
    {text:"Удаляй пока не поздно 🤫", value:-5},
    {text:"Это контент 🙄", value:-5, skip:true}
  ];

  const card=cards[Math.floor(Math.random()*cards.length)];

  if(card.all){
    players.forEach(pl=>pl.hype=Math.max(0,pl.hype+card.value));
  } else {
    p.hype=Math.max(0,p.hype+card.value);
  }

  if(card.skip) p.skipNext=true;

  renderHype();
  showModal(`💥 ${card.text} (${card.value})`);
}

// --- РИСК ---
function showRisk(p){
  const dice=Math.floor(Math.random()*6)+1;
  const result = dice<=3 ? -5 : 5;

  p.hype=Math.max(0,p.hype+result);
  renderHype();

  showModal(`🎲 ${dice} → ${result>0?'+':'-'}5`);
}

// --- UI ---
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

    if(p.id === currentTurnId){
      el.classList.add('activePlayer');
    }

    el.style.background=p.color;
    el.style.left=`${cells[p.position].x+i*30}px`;
    el.style.top=`${cells[p.position].y}px`;

    b.appendChild(el);
  });
}

function renderHype(){
  const container=document.getElementById('hypeBars');
  container.innerHTML='';

  const sorted=[...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,index)=>{
    const percent=Math.min((p.hype/70)*100,100);
    const medal = index===0 ? "🥇" : index===1 ? "🥈" : index===2 ? "🥉" : "";

    const div=document.createElement('div');

    div.innerHTML=`
      <div style="color:${p.color};font-weight:900;font-size:26px">
        ${medal} ${p.username}: ${p.hype}/70
      </div>
      <div class="hypeBar">
        <div class="hypeFill" style="width:${percent}%"></div>
      </div>
    `;

    container.appendChild(div);

    if(p.hype>=70 && !window.gameEnded){
      window.gameEnded=true;
      showWinScreen(p.username);
    }
  });
}

function showWinScreen(name){
  const m=document.getElementById('modal');
  m.innerHTML=`<div class="winScreen">🏆 ${name} победил!</div>`;
  m.classList.add('active');
}

function renderLobbyPlayers(){
  const l=document.getElementById('playersList');
  l.innerHTML=players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join("");
}

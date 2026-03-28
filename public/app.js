const socket = io();
let players=[], username, roomCode, color, currentTurnId=null;
window.gameEnded = false;

// --- ЛОББИ ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected');
    color=btn.dataset.color;
  };
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

// --- ИГРА ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;
  if(currentTurnId !== socket.id) return;

  const me = players.find(p=>p.id===socket.id);
  if(me.skipNext){
    showModal("⛔ Вы пропускаете ход");
    me.skipNext=false;
    socket.emit('rollDice', roomCode);
    return;
  }

  socket.emit('rollDice', roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  players = pl;
  renderPlayers();
  renderHype();
  renderLobbyPlayers();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='flex';
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
  const p=players.find(p=>p.id===id);
  document.getElementById('turnText').innerText=`Ходит: ${p.username}`;

  const me = players.find(pl=>pl.id===socket.id);
  const btn = document.getElementById('rollBtn');

  if(id !== socket.id || (me && me.skipNext)){
    btn.disabled = true;
    if(me && me.skipNext){
      showModal("⛔ Пропуск хода");
      me.skipNext=false;
      setTimeout(()=>socket.emit('rollDice', roomCode),1000);
    }
    return;
  }

  btn.disabled = false;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerHTML=
    `🎲 Выпало: <span style="color:#00eaff; font-size:32px">${dice}</span>`;

  movePlayerSmooth(playerId, dice);
});

// --- КЛЕТКИ ---
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
  const p = players.find(pl=>pl.id===id);
  if(!p) return;

  let stepIndex=0;

  function step(){
    if(stepIndex >= steps){
      handleCell(p,cells[p.position]);
      return;
    }

    const nextIndex = (p.position + 1) % cells.length;
    p.position = nextIndex;
    renderPlayers();
    stepIndex++;
    setTimeout(step, 300);
  }

  step();
}

// --- ЛОГИКА КЛЕТОК ---
function handleCell(p,cell){
  if(!cell) return;
  if(cell.type==='start'){p.hype+=10; showModal("🚀 +10 за старт");}
  if(cell.type==='plus'){p.hype+=cell.value; showModal(`+${cell.value} хайпа`);}
  if(cell.type==='minus'){p.hype=Math.max(0,p.hype-cell.value); showModal(`-${cell.value} хайпа`);}
  if(cell.type==='skip'){p.skipNext=true; showModal("⛔ Пропуск хода");}
  if(cell.type==='minusSkip'){p.hype=Math.max(0,p.hype-cell.value); p.skipNext=true; showModal(`-${cell.value} и пропуск`);}
  if(cell.type==='scandal'){showScandal(p);}
  if(cell.type==='risk'){showRisk(p);}
  renderHype();
}

// --- КАРТОЧКИ ---
function showScandal(p){
  const cards=[
    {text:"Перегрел аудиторию 🔥", value:-1},
    {text:"Громкий заголовок 🫣", value:-2},
    {text:"Это монтаж 😱", value:-3},
    {text:"Меня взломали #️⃣", value:-3, all:true},
    {text:"Подписчики в шоке 😮", value:-4},
    {text:"Удаляй пока не поздно 🤫", value:-5},
    {text:"Это контент 🙄", value:-5, skip:true}
  ];
  const card = cards[Math.floor(Math.random()*cards.length)];
  if(card.all) players.forEach(pl=>pl.hype=Math.max(0,pl.hype+card.value));
  else p.hype=Math.max(0,p.hype+card.value);
  if(card.skip) p.skipNext=true;
  showModal(`💥 ${card.text} (${card.value})`);
}

function showRisk(p){
  const dice = Math.floor(Math.random()*6)+1;
  const result = dice <=3 ? -5 : 5;
  p.hype=Math.max(0,p.hype+result);
  showModal(`🎲 Риск: ${dice} → ${result>0?'+':'-'}5`);
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
    const c=cells[p.position];
    if(!c) return;
    const el=document.createElement('div');
    el.className='player';
    el.style.background=p.color;
    el.style.left=(c.x + i*10)+'px';
    el.style.top=c.y+'px';
    b.appendChild(el);
  });
}

function renderHype(){
  const container=document.getElementById('hypeBars');
  container.innerHTML='';

  const sorted=[...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,index)=>{
    const percent = Math.min((p.hype/70)*100,100);
    const medal = index===0?"🥇":index===1?"🥈":index===2?"🥉":"";

    const div=document.createElement('div');
    div.style.marginBottom="12px";
    div.innerHTML=`
      <div style="color:${p.color}; font-weight:900; font-size:28px; text-align:center;">
        ${medal} ${p.username}: ${p.hype}/70
      </div>
      <div class="hypeBar"><div class="hypeFill" style="width:${percent}%"></div></div>
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
  l.innerHTML = players.map(p=>`<div style="color:${p.color}; font-size:22px; text-align:center;">${p.username}</div>`).join('');
}

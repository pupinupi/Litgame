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
  if(!username||!roomCode||!color){alert("Заполни всё");return;}
  socket.emit('joinRoom',{username,roomCode,color});
};

document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame',roomCode);
};

// --- ИГРА ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;
  if(currentTurnId===socket.id){
    socket.emit('rollDice',roomCode);
  }
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
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerHTML=
  `🎲 Выпало: <span style="font-size:28px;color:#00eaff">${dice}</span>`;
  movePlayerSmooth(playerId,dice);
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

    // круг
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
    glow(cell,'scandal');
    showScandal(p);
  }

  if(cell.type==='risk'){
    glow(cell,'risk');
    showRisk(p);
  }

  renderHype();
}

// --- ЭФФЕКТЫ ---
function glow(cell,type){

  let color='#00ff88';

  if(type==='minus') color='#ff3b3b';
  if(type==='scandal') color='#ff0000';
  if(type==='risk') color='#00eaff';
  if(type==='start') color='#ffe600';
  if(type==='step') color='#ffffff';

  const d=document.createElement('div');

  d.style.position='absolute';
  d.style.left=(cell.x-10)+'px';
  d.style.top=(cell.y-10)+'px';
  d.style.width='50px';
  d.style.height='50px';
  d.style.borderRadius='50%';
  d.style.boxShadow=`0 0 30px ${color}`;
  d.style.animation='pulse 0.6s';
  d.style.pointerEvents='none';

  document.getElementById('gameBoard').appendChild(d);

  setTimeout(()=>d.remove(),600);
}

// --- КАРТОЧКИ ---
document.body.classList.add('shake');
setTimeout(()=>document.body.classList.remove('shake'),400);
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

  // сортировка по хайпу
  const sorted=[...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,index)=>{
    const percent=Math.min((p.hype/70)*100,100);

    const medal = index===0 ? "🥇" : index===1 ? "🥈" : index===2 ? "🥉" : "";

    const div=document.createElement('div');

    div.innerHTML=`
      <div style="color:${p.color};font-weight:bold;font-size:20px">
        ${medal} ${p.username}: ${p.hype}/70
      </div>

      <div class="hypeBar">
        <div class="hypeFill" style="width:${percent}%"></div>
      </div>
    `;

    container.appendChild(div);

    // победа
    if(p.hype>=70 && !window.gameEnded){
      window.gameEnded=true;
      showWinScreen(p.username);
    }
  });
}

function showWinScreen(name){
  const m=document.getElementById('modal');

  m.innerHTML=`
    <div class="winScreen">
      🏆 ${name} победил!
    </div>
  `;

  m.classList.add('active');

  document.body.style.background = "radial-gradient(circle, #001f2f, #000)";
}

function renderLobbyPlayers(){
  const l=document.getElementById('playersList');
  l.innerHTML=players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join("");
}

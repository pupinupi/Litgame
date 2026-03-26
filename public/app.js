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
  if(currentTurnId===socket.id){
    socket.emit('rollDice',roomCode);
  }
};

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
  document.getElementById('diceResult').innerText=`Выпало: ${dice}`;
  movePlayer(playerId,dice);
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

// --- движение ---
function movePlayer(id,steps){
  const p=players.find(p=>p.id===id);
  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      p.position=(p.position+1)%cells.length;
      renderPlayers();
      if(i===steps-1) handleCell(p,cells[p.position]);
    },i*400);
  }
}

// --- логика клеток ---
function handleCell(p,cell){
  if(cell.type==='plus'){ p.hype+=cell.value; glow(cell,'green'); }
  if(cell.type==='minus'){ p.hype=Math.max(0,p.hype-cell.value); glow(cell,'red'); }
  if(cell.type==='skip'){ p.skipNext=true; showModal("Пропуск хода"); }
  if(cell.type==='minusSkip'){ p.hype-=cell.value; p.skipNext=true; showModal("-8 и пропуск"); }
  if(cell.type==='scandal'){ showScandal(p); }
  if(cell.type==='risk'){ showRisk(p); }
  renderHype();
}

// --- карточки ---
function showScandal(p){
  const cards=[
    "-1 хайп 🔥",
    "-2 хайп 🫣",
    "-3 хайп 😱",
    "-3 всем #️⃣",
    "-4 хайп 😮",
    "-5 хайп 🤫",
    "-5 хайп и пропуск 🙄"
  ];
  const card=cards[Math.floor(Math.random()*cards.length)];
  showModal("Скандал: "+card);
}

function showRisk(p){
  const dice=Math.floor(Math.random()*6)+1;
  const res=dice<=3?-5:5;
  p.hype=Math.max(0,p.hype+res);
  showModal(`Риск: ${dice} → ${res>0?'+':'-'}${Math.abs(res)}`);
}

// --- UI ---
function showModal(text){
  const m=document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');

  setTimeout(()=>{
    m.classList.remove('active');
  },3000);
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

  // ищем лидера
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

    // 🏆 Победа
    if(p.hype>=70){
      showModal(`🏆 ${p.username} победил!`);
    }
  });
}

function renderLobbyPlayers(){
  const l=document.getElementById('playersList');
  l.innerHTML=players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join("");
}

function glow(cell,color){
  const d=document.createElement('div');
  d.style.position='absolute';
  d.style.left=cell.x+'px';
  d.style.top=cell.y+'px';
  d.style.width='30px';
  d.style.height='30px';
  d.style.border='2px solid '+color;
  d.style.borderRadius='50%';
  document.getElementById('gameBoard').appendChild(d);
  setTimeout(()=>d.remove(),500);
}

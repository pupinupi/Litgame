const socket = io();

let players=[];
let currentTurnId=null;

let username, roomCode, color;

// 🎯 СКАНДАЛЫ
const scandals = [
  {text:"перегрел аудиторию🔥",hype:-1},
  {text:"громкий заголовок🫣",hype:-2},
  {text:"это монтаж 😱",hype:-3},
  {text:"меня взломали #️⃣",hypeAll:-3},
  {text:"подписчики в шоке 😮",hype:-4},
  {text:"удаляй пока не поздно🤫",hype:-5},
  {text:"это контент🙄",hype:-5,skip:true}
];

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected');
    color=btn.dataset.color;
  };
});

// --- ВХОД ---
document.getElementById('joinBtn').onclick=()=>{
  username=document.getElementById('username').value;
  roomCode=document.getElementById('roomCode').value;

  if(!username || !roomCode || !color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// --- СТАРТ ---
document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame',roomCode);
};

// --- КУБИК ---
document.getElementById('rollBtn').onclick=()=>{
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice',roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  players=pl;
  renderPlayers();
  renderHype();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='flex';
});

socket.on('nextTurn', id=>{
  currentTurnId=id;
  document.getElementById('rollBtn').disabled = id !== socket.id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerText = "🎲 " + dice;

  if(playerId !== socket.id) return;
  movePlayer(dice);
});

// --- ПОЛЕ ---
const cells=[ /* твой массив оставь как есть */ ];

// --- ДВИЖЕНИЕ ---
function movePlayer(steps){
  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  let count=0;

  function step(){
    if(count>=steps){
      handleCell(me);
      return;
    }

    me.position = (me.position + 1) % cells.length;
    renderPlayers();

    count++;
    setTimeout(step,250);
  }

  step();
}

// --- ЛОГИКА КЛЕТОК ---
function handleCell(p){
  const cell=cells[p.position];

  if(cell.type==='plus'){p.hype+=cell.value;}
  if(cell.type==='minus'){p.hype=Math.max(0,p.hype-cell.value);}
  if(cell.type==='skip'){p.skipNext=true;}
  if(cell.type==='minusSkip'){
    p.hype=Math.max(0,p.hype-cell.value);
    p.skipNext=true;
  }

  if(cell.type==='scandal'){
    showScandal(p);
    return;
  }

  if(cell.type==='risk'){
    showRisk(p);
    return;
  }

  finishTurn(p);
}

// 🔥 СКАНДАЛ
function showScandal(p){
  const card=scandals[Math.floor(Math.random()*scandals.length)];

  showModal("💥 СКАНДАЛ<br>"+card.text,"red");

  if(card.hypeAll){
    players.forEach(pl=>{
      pl.hype=Math.max(0,pl.hype+card.hypeAll);
    });
  } else {
    p.hype=Math.max(0,p.hype+card.hype);
  }

  if(card.skip) p.skipNext=true;

  setTimeout(()=>{
    finishTurn(p);
  },1500);
}

// ⚡ РИСК
function showRisk(p){
  showModal("⚠️ РИСК<br>1-3: -5 | 4-6: +5","yellow");

  setTimeout(()=>{
    const dice=Math.floor(Math.random()*6)+1;
    const change = dice<=3?-5:5;

    p.hype=Math.max(0,p.hype+change);

    showModal(`🎲 ${dice}<br>${change>0?'+':'-'}5 ХАЙП`,"cyan");

    setTimeout(()=>{
      finishTurn(p);
    },1200);

  },1200);
}

// --- ФИНИШ ХОДА ---
function finishTurn(p){

  if(p.hype>=70){
    showModal("🏆 ПОБЕДА!","gold");
  }

  renderHype();

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- МОДАЛКА ---
function showModal(text,color){
  const m=document.getElementById('modal');

  m.innerHTML=`<div class="modalContent" style="box-shadow:0 0 25px ${color}">
    ${text}
  </div>`;

  m.classList.add('active');

  setTimeout(()=>{
    m.classList.remove('active');
  },1200);
}

// --- РЕНДЕР ---
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

// 🔵 ШКАЛА ХАЙПА
function renderHype(){
  let html="";

  players.forEach(p=>{
    const percent = Math.min(100,(p.hype/70)*100);

    html+=`
    <div>
      ${p.username}: ${p.hype}
      <div class="hypeBar">
        <div class="hypeFill" style="width:${percent}%"></div>
      </div>
    </div>`;
  });

  document.getElementById('hypeBars').innerHTML=html;
}

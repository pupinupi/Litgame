window.gameEnded = false;

const socket = io();
let players=[], username, roomCode, color, currentTurnId=null;

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

// --- ПЛАВНОЕ ДВИЖЕНИЕ ПО КЛЕТКАМ ---
function movePlayerSmooth(id, steps){
  const p = players.find(pl => pl.id===id);
  if(!p) return;

  let stepIndex = 0;

  function step(){
    if(stepIndex >= steps){
      handleCell(p, cells[p.position]);
      return;
    }

    const fromIndex = p.position;
    let nextIndex = p.position + 1;
    if(nextIndex >= cells.length) nextIndex = 0; // полный круг

    animateMove(p, fromIndex, nextIndex, ()=>{
      // Обновляем позицию после каждого шага
      p.position = nextIndex;

      // Добавляем +5 hype за круг
      if(nextIndex === 0) {
        p.hype += 5;
        showModal("🔥 +5 за круг");
      }

      stepIndex++;
      step();
    });
  }

  step();
}

// --- ПУЛЬСИРУЮЩАЯ АНИМАЦИЯ ДВИЖЕНИЯ ---
function animateMove(p, fromIndex, toIndex, callback){
  const el = [...document.querySelectorAll('.player')]
    .find(e=>e.style.background===p.color);
  if(!el){ callback(); return; }

  const from = cells[fromIndex];
  const to = cells[toIndex];
  const frames = 20;
  let count = 0;

  const interval = setInterval(()=>{
    count++;
    const progress = count / frames;

    // Плавное перемещение
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    // Смещаем несколько игроков на одной клетке
    const sameCellCount = players.filter(pl => pl.position === toIndex).length;
    const offset = sameCellCount > 1 ? sameCellCount * 10 : 0;

    el.style.left = (x + offset) + 'px';
    el.style.top = (y + offset) + 'px';

    if(count >= frames){
      clearInterval(interval);
      renderPlayers(); // обновляем всех после каждого шага
      callback();
    }
  }, 20);
}

// --- ИГРА ---
document.getElementById('rollBtn').onclick=()=>{
  if(window.gameEnded) return;

  if(currentTurnId !== socket.id) return;
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
  document.getElementById('game').style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
  const p=players.find(p=>p.id===id);
  document.getElementById('turnText').innerText=`Ходит: ${p.username}`;

  const me = players.find(pl=>pl.id===socket.id);
  const btn = document.getElementById('rollBtn');

  btn.disabled = id !== socket.id || (me && me.skipNext);
  if(me && me.skipNext && id === socket.id){
    showModal("⛔ Вы пропускаете ход");
  }
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerHTML=
    `🎲 Выпало: <span style="font-size:28px;color:#00eaff">${dice}</span>`;
  movePlayerSmooth(playerId, dice);
});

// --- ОБРАБОТКА ПОБЕДЫ ОТ СЕРВЕРА ---
socket.on('gameEnded', winnerName=>{
  window.gameEnded = true;
  showWinScreen(winnerName);
});

// --- МОДАЛКИ ---
function showModal(text){
  const m = document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(()=>m.classList.remove('active'),3000);
}

// --- ОСТАЛЬНЫЕ ФУНКЦИИ ---
function renderPlayers(){
  const b = document.getElementById('gameBoard');
  b.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el = document.createElement('div');
    el.className='player';
    el.style.background = p.color;
    el.style.left = `${cells[p.position].x + i*25}px`;
    el.style.top = `${cells[p.position].y}px`;
    b.appendChild(el);
  });
}

function renderHype(){
  const container = document.getElementById('hypeBars');
  container.innerHTML='';

  const sorted = [...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,index)=>{
    const percent = Math.min((p.hype/70)*100,100);
    const medal = index===0?"🥇":index===1?"🥈":index===2?"🥉":"";

    const div = document.createElement('div');
    div.style.marginBottom="12px";
    div.innerHTML=`
      <div style="color:${p.color}; font-weight:900; font-size:24px; text-shadow:0 0 10px ${p.color}">
        ${medal} ${p.username}: ${p.hype}/70
      </div>
      <div class="hypeBar"><div class="hypeFill" style="width:${percent}%"></div></div>
    `;
    container.appendChild(div);
  });
}

function showWinScreen(name){
  const m = document.getElementById('modal');
  m.innerHTML=`
    <div class="winScreen">
      🏆 ${name} победил!
    </div>
  `;
  m.classList.add('active');
  document.body.style.background = "radial-gradient(circle, #001f2f, #000)";
}

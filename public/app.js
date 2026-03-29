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

  renderPlayers(); // 🔥 фикс старта
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
const cells=[
  {x:82,y:587,type:'start'},
  {x:97,y:464,type:'plus',value:3},
  {x:86,y:348,type:'plus',value:2},
  {x:93,y:224,type:'scandal'},
  {x:87,y:129,type:'risk'},
  {x:219,y:101,type:'plus',value:2},
  {x:364,y:107,type:'scandal'},
  {x:494,y:95,type:'plus',value:3},
  {x:652,y:96,type:'plus',value:5},
  {x:815,y:89,type:'minus',value:10},
  {x:930,y:135,type:'minusSkip',value:8},
  {x:936,y:247,type:'plus',value:3},
  {x:936,y:357,type:'risk'},
  {x:941,y:480,type:'plus',value:3},
  {x:937,y:610,type:'skip'},
  {x:794,y:624,type:'plus',value:2},
  {x:636,y:635,type:'scandal'},
  {x:517,y:627,type:'plus',value:8},
  {x:355,y:619,type:'minus',value:10},
  {x:210,y:626,type:'plus',value:4}
];

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

// --- ЛОГИКА ---
function handleCell(p){
  const cell=cells[p.position];

  if(cell.type==='plus'){p.hype+=cell.value;}
  if(cell.type==='minus'){p.hype=Math.max(0,p.hype-cell.value);}
  if(cell.type==='skip'){p.skipNext=true;}
  if(cell.type==='minusSkip'){
    p.hype=Math.max(0,p.hype-cell.value);
    p.skipNext=true;
  }

  renderHype();

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- РЕНДЕР ---
function renderPlayers(){
  const board=document.getElementById('gameBoard');
  if(board){
    board.querySelectorAll('.player').forEach(e=>e.remove());

    players.forEach((p,i)=>{
      const c=cells[p.position];
      if(!c) return;

      const el=document.createElement('div');
      el.className='player';
      el.style.background=p.color;

      el.style.left=(c.x + i*10)+'px';
      el.style.top=c.y+'px';

      board.appendChild(el);
    });
  }

  // 👇 ЛОББИ СПИСОК
  const list=document.getElementById('playersList');
  if(list){
    list.innerHTML="";
    players.forEach(p=>{
      const div=document.createElement('div');
      div.innerHTML = `🟢 ${p.username}`;
      list.appendChild(div);
    });
  }
}

// --- ШКАЛА ---
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

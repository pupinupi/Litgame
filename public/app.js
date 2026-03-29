const socket = io();

let players = [];
let currentTurnId = null;

let username = "";
let roomCode = "";
let color = "";

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
  const nameInput = document.getElementById('username');
  const roomInput = document.getElementById('roomCode');

  username = nameInput.value;
  roomCode = roomInput.value;

  if(!username || !roomCode || !color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// --- СТАРТ ---
document.getElementById('startBtn').onclick=()=>{
  if(!roomCode) return;
  socket.emit('startGame',roomCode);
};

// --- КУБИК ---
document.getElementById('rollBtn').onclick=()=>{
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice',roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  players = pl;
  renderPlayers();
  renderHype();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='flex';

  renderPlayers(); // 🔥 важно
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('diceResult').innerText = "🎲 " + dice;

  if(playerId !== socket.id) return;
  movePlayer(dice);
});


// --- ТВОЁ ПОЛЕ ---
const cells = [
  {x:82,y:587},
  {x:97,y:464},
  {x:86,y:348},
  {x:93,y:224},
  {x:87,y:129},
  {x:219,y:101},
  {x:364,y:107},
  {x:494,y:95},
  {x:652,y:96},
  {x:815,y:89},
  {x:930,y:135},
  {x:936,y:247},
  {x:936,y:357},
  {x:941,y:480},
  {x:937,y:610},
  {x:794,y:624},
  {x:636,y:635},
  {x:517,y:627},
  {x:355,y:619},
  {x:210,y:626}
];

// --- ДВИЖЕНИЕ ---
function movePlayer(steps){
  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  let count = 0;

  function step(){
    if(count >= steps){
      finishTurn(me);
      return;
    }

    me.position = (me.position + 1) % cells.length;

    renderPlayers();

    count++;
    setTimeout(step,300);
  }

  step();
}

// --- КОНЕЦ ХОДА ---
function finishTurn(p){
  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:p.skipNext
  });
}

// --- РЕНДЕР ФИШЕК + ЛОББИ ---
function renderPlayers(){

  // 👇 ЛОББИ СПИСОК
  const list=document.getElementById('playersList');
  if(list){
    list.innerHTML="";
    players.forEach(p=>{
      const div=document.createElement('div');
      div.innerText="🟢 "+p.username;
      list.appendChild(div);
    });
  }

  // 👇 ПОЛЕ
  const board=document.getElementById('gameBoard');
  if(!board) return;

  board.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const cell=cells[p.position];
    if(!cell) return;

    const el=document.createElement('div');
    el.className='player';
    el.style.background=p.color;

    el.style.left=(cell.x + i*10)+'px';
    el.style.top=cell.y+'px';

    board.appendChild(el);
  });
}

// --- ШКАЛА ХАЙПА ---
function renderHype(){
  let html="";

  players.forEach(p=>{
    html+=`
      <div style="margin:5px;">
        ${p.username}: ${p.hype}
      </div>`;
  });

  document.getElementById('hypeBars').innerHTML=html;
}

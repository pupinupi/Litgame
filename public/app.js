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

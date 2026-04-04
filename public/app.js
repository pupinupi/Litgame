const scandalSound = new Audio('scandal.mp3');
scandalSound.volume = 0.8;
const diceSound = new Audio('dice.mp3');
diceSound.volume = 0.7;

const socket = io();
let players = [], currentTurnId = null, username, roomCode, color;
let isAnimating = false, gameOver = false;

// ВЫБОР ФИШКИ
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick = ()=> {
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected'); color=btn.dataset.color;
  };
});

// ВХОД
document.getElementById('joinBtn').onclick = ()=>{
  username=document.getElementById('username').value;
  roomCode=document.getElementById('roomCode').value;
  if(!username||!roomCode||!color){alert("Заполни всё");return;}
  socket.emit('joinRoom',{username,roomCode,color});
};

// СТАРТ
document.getElementById('startBtn').onclick = ()=>socket.emit('startGame',roomCode);

// БРОСОК
document.getElementById('rollBtn').onclick = ()=>{
  if(gameOver||isAnimating) return;
  if(currentTurnId!==socket.id) return;
  socket.emit('rollDice',roomCode);
};

// СОКЕТЫ
socket.on('updatePlayers', pl=>{players=pl; renderPlayers(); renderHypeBars(); renderLobbyPlayers();});
socket.on('playerSkipped', id=>{
  const p = players.find(p=>p.id===id);
  if(id===socket.id) showModal('🛑 Пропуск хода!');
  if(p) showTurnMessage(`⚖️ Игрок ${p.username} пропускает ход`,2000);
});
socket.on('gameStarted', ()=>{document.getElementById('lobby').style.display='none';document.getElementById('game').style.display='flex';});
socket.on('nextTurn', id=>{
  currentTurnId=id;
  document.getElementById('rollBtn').disabled=id!==socket.id||gameOver;
  const p=players.find(p=>p.id===id); if(p) showTurnMessage(`🎯 Ходит ${p.username}`);
  renderPlayers();
});
socket.on('diceRolled',({playerId,dice})=>{
  if(playerId!==socket.id) return;
  const diceEl=document.getElementById('diceResult');
  diceSound.currentTime=0; diceSound.play();
  diceEl.innerText="🎲 "+dice;
  movePlayer(dice);
});

// --- Функции рендеринга и движения ---
function renderLobbyPlayers(){
  const list=document.getElementById('playersList');
  list.innerHTML=players.map(p=>`<div>${p.username} (${p.color})</div>`).join('');
}
function renderPlayers(){
  const board=document.getElementById('gameBoard');
  board.querySelectorAll('.player').forEach(e=>e.remove());
  players.forEach(p=>{
    const div=document.createElement('div');
    div.className='player '+p.color+(p.id===currentTurnId?' active':'');
    const cell=boardPositions[p.position]||{x:0,y:0};
    div.style.left=cell.x+'px'; div.style.top=cell.y+'px';
    board.appendChild(div);
  });
}
function renderHypeBars(){
  const hb=document.getElementById('hypeBars'); hb.innerHTML='';
  players.forEach(p=>{
    const bar=document.createElement('div'); bar.className='hypeBar';
    const fill=document.createElement('div'); fill.className='hypeFill'; fill.style.width=Math.min(p.hype,70)/70*100+'%';
    bar.appendChild(fill);
    const text=document.createElement('div'); text.innerText=`${p.username}: ${p.hype}`;
    bar.appendChild(text);
    hb.appendChild(bar);
  });
}
const boardPositions=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},{x:219,y:101},{x:364,y:107},
  {x:494,y:95},{x:652,y:96},{x:815,y:89},{x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},
  {x:937,y:610},{x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

function movePlayer(steps){
  const me=players.find(p=>p.id===socket.id); if(!me) return; isAnimating=true;
  let count=0;
  function step(){ if(count>=steps){isAnimating=false; handleCell(me); return;}
    const prev=me.position; me.position=(me.position+1)%boardPositions.length;
    if(me.position===0&&prev!==0){ me.hype+=7; showModal('🔁 +7 хайпа за круг'); }
    renderPlayers(); count++; setTimeout(step,300);
  } step();
}

function handleCell(p){
  const cell=boardPositions[p.position];
  // Логика клеток аналогично прошлому коду (start, plus, minus, risk, scandal, skip)
  // Для краткости вставь предыдущий switch/case с обработкой всех типов
  socket.emit('playerMoved',{roomCode,position:p.position,hype:p.hype,skipNext:p.skipNext});
}

function showModal(text){ const modal=document.getElementById('modal'); modal.innerHTML=`<div class="modalContent">${text}</div>`; modal.classList.add('active'); setTimeout(()=>modal.classList.remove('active'),2000);}
function showTurnMessage(msg,duration=1000){ const el=document.getElementById('turnMessage'); el.innerText=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),duration);}

// --- ЗВУКИ ---
const scandalSound = new Audio('scandal.mp3');
scandalSound.volume = 0.6;
const diceSound = new Audio('dice.mp3');
diceSound.volume = 0.9;

const socket = io();
let players = [];
let currentTurnId = null;
let username, roomCode, color;
let isAnimating = false, gameOver = false;

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.getAttribute('data-color');
  });
});
socket.on('colorTaken', () => alert('Этот цвет уже занят!'));

// --- JOIN ---
document.getElementById('joinBtn').onclick = () => {
  username = document.getElementById('username').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();

  if (!username || !roomCode || !color) {
    alert("Заполни всё и выбери фишку");
    return;
  }

  socket.emit('joinRoom', { username, roomCode, color });
};

// --- START ---
document.getElementById('startBtn').onclick = () => socket.emit('startGame', roomCode);

// --- ROLL DICE ---
document.getElementById('rollBtn').onclick = () => {
  if (gameOver || isAnimating) return;
  if (currentTurnId !== socket.id) return;
  socket.emit('rollDice', roomCode);
};

// --- SOCKET EVENTS ---
socket.on('updatePlayers', pl => { players = pl; renderPlayers(); renderHypeBars(); renderLobbyPlayers(); });
socket.on('playerSkipped', id => { if(id===socket.id) showModal('🚨 Пропуск хода!'); });
socket.on('gameStarted', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
});
socket.on('nextTurn', id => {
  currentTurnId = id;
  document.getElementById('rollBtn').disabled = id !== socket.id || gameOver;
  renderPlayers();
});
socket.on('diceRolled', ({ playerId, dice }) => {
  if(playerId!==socket.id) return;
  diceSound.currentTime=0; diceSound.play();
  document.getElementById('diceResult').innerText="🎲 "+dice;
  movePlayer(dice);
});

// --- КЛЕТКИ ---
const cells = [
  { x: 82, y: 587, type: 'start' },
  { x: 97, y: 464, type: 'plus', value: 3 },
  { x: 86, y: 348, type: 'plus', value: 2 },
  { x: 93, y: 224, type: 'scandal' },
  { x: 87, y: 129, type: 'risk' },
  { x: 219, y: 101, type: 'plus', value: 2 },
  { x: 364, y: 107, type: 'scandal' },
  { x: 494, y: 95, type: 'plus', value: 3 },
  { x: 652, y: 96, type: 'plus', value: 5 },
  { x: 815, y: 89, type: 'minus', value: 10 },
  { x: 930, y: 135, type: 'minusSkip', value: 8 },
  { x: 936, y: 247, type: 'plus', value: 3 },
  { x: 936, y: 357, type: 'risk' },
  { x: 941, y: 480, type: 'plus', value: 3 },
  { x: 937, y: 610, type: 'skip' },
  { x: 794, y: 624, type: 'plus', value: 2 },
  { x: 636, y: 635, type: 'scandal' },
  { x: 517, y: 627, type: 'plus', value: 8 },
  { x: 355, y: 619, type: 'minus', value: 10 },
  { x: 210, y: 626, type: 'plus', value: 4 }
];

// --- MOVE PLAYER ---
function movePlayer(steps){
  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  isAnimating=true;
  let count=0;

  function step(){
    if(count>=steps){
      isAnimating=false;
      handleCell(me);
      return;
    }
    const prev = me.position;
    me.position = (me.position+1) % cells.length;
    if(prev===cells.length-1 && me.position===0){ me.hype+=7; showModal('🔁 +7 хайпа за круг'); }
    renderPlayers();
    count++; setTimeout(step,300);
  }

  step();
}

// --- HANDLE CELL ---
function handleCell(p){
  const cell = cells[p.position];
  if(!cell) return;
  p.skipNext=false;
  let text='';

  switch(cell.type){
    case 'start': p.hype+=10; text='🚀 +10 хайпа (старт)'; break;
    case 'plus': p.hype+=cell.value; text=`➕ ${cell.value}`; break;
    case 'minus': p.hype=Math.max(0,p.hype-cell.value); text=`➖ ${cell.value}`; break;
    case 'minusSkip': p.hype=Math.max(0,p.hype-cell.value); p.skipNext=true; text='🚨 Тюрьма: пропуск хода'; break;
    case 'skip': p.skipNext=true; text='🚨 Тюрьма: пропуск хода'; break;
    case 'risk': showRiskModal(p); return;
    case 'scandal': showScandalModal(p); return;
  }

  renderHypeBars();
  showModal(text, ()=>{
    if(p.hype>=70){ gameOver=true; showWinScreen(p.username); return; }
    socket.emit('playerMoved',{ roomCode, position:p.position, hype:p.hype, skipNext:p.skipNext });
  });
}

// --- SHOW MODAL ---
function showModal(text, callback){
  const m=document.getElementById('modal');
  m.innerHTML=`<div class="modalContent">${text}</div>`;
  m.classList.add('active');
  setTimeout(()=>{ m.classList.remove('active'); if(callback) callback(); },2000);
}

// --- RENDER ---
function renderPlayers(){ const b=document.getElementById('gameBoard'); players.forEach((p,i)=>{ let el=document.getElementById(p.id); if(!el){ el=document.createElement('div'); el.className=`player ${p.color}`; el.id=p.id; b.appendChild(el); } const c=cells[p.position]; el.style.left=(c.x+i*8)+'px'; el.style.top=c.y+'px'; }); }
function renderHypeBars(){ const container=document.getElementById('hypeBars'); container.innerHTML=''; players.forEach(p=>{ const bar=document.createElement('div'); bar.className='hypeBar'; const fill=document.createElement('div'); fill.className='hypeFill'; fill.style.width=Math.min(p.hype,70)/70*100+'%'; bar.innerHTML=`<div>${p.username}: ${p.hype}/70</div>`; bar.appendChild(fill); container.appendChild(bar); }); }
function renderLobbyPlayers(){ const list=document.getElementById('playersList'); list.innerHTML=players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join(''); }
function showWinScreen(name){ const m=document.getElementById('modal'); m.innerHTML=`<div class="winScreenBox"><div class="winTitle">🏆 ПОБЕДА</div><div class="winName">${name}</div><div class="winText">70 хайпа!</div><button class="winBtn" onclick="location.reload()">🔄 Снова</button></div>`; m.classList.add('active'); }

const socket = io();

let players = [];
let currentTurnId = null;
let username, roomCode, color;
let isAnimating = false;

// ВЫБОР ФИШКИ
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected');
    color = btn.dataset.color;
  }
});

// ВХОД
joinBtn.onclick = ()=>{
  username = usernameInput.value;
  roomCode = roomCodeInput.value;
  if(!username || !roomCode || !color) return alert("Заполни всё");
  socket.emit('joinRoom',{username,roomCode,color});
};

// СТАРТ
startBtn.onclick = ()=> socket.emit('startGame',roomCode);

// КУБИК
rollBtn.onclick = ()=>{
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice',roomCode);
};

// СОКЕТЫ
socket.on('updatePlayers', pl=>{
  players = pl;
  renderPlayers();
  renderHype();
});

socket.on('gameStarted', ()=>{
  lobby.style.display='none';
  game.style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
  rollBtn.disabled = id !== socket.id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  if(playerId !== socket.id) return;
  diceResult.innerText = "🎲 "+dice;
  move(dice);
});

// КЛЕТКИ
const cells = [
  {x:80,y:580},{x:90,y:460},{x:80,y:340},{x:90,y:220},{x:90,y:120},
  {x:220,y:100},{x:360,y:100},{x:500,y:100},{x:650,y:100},{x:800,y:100},
  {x:920,y:140},{x:920,y:250},{x:920,y:350},{x:920,y:470},{x:920,y:600},
  {x:780,y:620},{x:630,y:630},{x:500,y:630},{x:350,y:620},{x:200,y:620}
];

// ДВИЖЕНИЕ
function move(steps){
  const me = players.find(p=>p.id===socket.id);
  let i=0;

  function step(){
    if(i>=steps) return send(me);

    me.position = (me.position+1)%cells.length;
    renderPlayers();
    i++;
    setTimeout(step,300);
  }
  step();
}

// РЕНДЕР ФИШЕК (АДАПТИВ)
function renderPlayers(){
  const board = document.getElementById('gameBoard');
  const rect = board.getBoundingClientRect();

  players.forEach((p,i)=>{
    let el = document.getElementById(p.id);

    if(!el){
      el = document.createElement('div');
      el.className='player';
      el.id=p.id;
      el.style.background=p.color;
      board.appendChild(el);
    }

    const c = cells[p.position];

    const scaleX = rect.width / 1000;
    const scaleY = rect.height / 700;

    el.style.left = c.x * scaleX + 'px';
    el.style.top = c.y * scaleY + 'px';
  });
}

// ХАЙП
function renderHype(){
  hypeBars.innerHTML='';
  players.forEach(p=>{
    const bar=document.createElement('div');
    bar.className='hypeBar';

    const fill=document.createElement('div');
    fill.className='hypeFill';
    fill.style.width=(p.hype/70*100)+'%';

    bar.innerHTML=`${p.username}: ${p.hype}`;
    bar.appendChild(fill);
    hypeBars.appendChild(bar);
  });
}

// ОТПРАВКА
function send(p){
  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:false
  });
}

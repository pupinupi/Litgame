const socket = io();

let players=[];
let currentTurn=null;
let username, roomCode, color;

// ВЫБОР ФИШКИ
document.querySelectorAll('.chip').forEach(c=>{
  c.onclick=()=>{
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');
    color=c.dataset.color;
  }
});

// ВХОД
joinBtn.onclick=()=>{
  username=username.value;
  roomCode=roomCode.value;
  if(!username||!roomCode||!color) return alert("Заполни всё");

  socket.emit('joinRoom',{username,roomCode,color});
};

// СТАРТ
startBtn.onclick=()=>socket.emit('startGame',roomCode);

// СОКЕТЫ
socket.on('updatePlayers',pl=>{
  players=pl;
  renderPlayers();
  renderHype();
  playersList.innerHTML=pl.map(p=>p.username).join("<br>");
});

socket.on('gameStarted',()=>{
  lobby.style.display='none';
  game.style.display='block';
});

socket.on('nextTurn',id=>{
  currentTurn=id;
  rollBtn.disabled=id!==socket.id;
});

socket.on('diceRolled',({playerId,dice})=>{
  if(playerId!==socket.id) return;
  diceResult.innerText="🎲 "+dice;
  move(dice);
});

// КЛЕТКИ
const cells=[
{x:80,y:580},{x:90,y:460},{x:80,y:340},{x:90,y:220},{x:90,y:120},
{x:220,y:100},{x:360,y:100},{x:500,y:100},{x:650,y:100},{x:800,y:100},
{x:920,y:140},{x:920,y:250},{x:920,y:350},{x:920,y:470},{x:920,y:600},
{x:780,y:620},{x:630,y:630},{x:500,y:630},{x:350,y:620},{x:200,y:620}
];

// ДВИЖЕНИЕ
function move(steps){
  let me=players.find(p=>p.id===socket.id);
  let i=0;

  function step(){
    if(i>=steps) return handle(me);

    me.position=(me.position+1)%cells.length;
    renderPlayers();
    i++;
    setTimeout(step,300);
  }
  step();
}

// ЛОГИКА КЛЕТОК
function handle(p){

  let r=Math.random();

  if(r<0.2){ showScandal(p); return;}
  if(r<0.3){ showRisk(p); return;}

  p.hype+=3;

  finish(p);
}

// ФИНИШ
function finish(p){

  if(p.hype>=70){
    alert("🏆 Победа!");
    return;
  }

  socket.emit('playerMoved',{
    roomCode,
    position:p.position,
    hype:p.hype,
    skipNext:false
  });
}

// СКАНДАЛ
function showScandal(p){
  modal.innerHTML=`<div class="modalBox scandal">💥 Скандал -3</div>`;
  p.hype=Math.max(0,p.hype-3);

  setTimeout(()=>{
    modal.innerHTML='';
    finish(p);
  },2000);
}

// РИСК
function showRisk(p){
  const val=Math.random()<0.5?-5:5;

  modal.innerHTML=`<div class="modalBox risk">🎲 ${val}</div>`;
  p.hype=Math.max(0,p.hype+val);

  setTimeout(()=>{
    modal.innerHTML='';
    finish(p);
  },2000);
}

// РЕНДЕР
function renderPlayers(){
  const b=gameBoard;
  const rect=b.getBoundingClientRect();

  players.forEach((p,i)=>{
    let el=document.getElementById(p.id);

    if(!el){
      el=document.createElement('div');
      el.className='player';
      el.id=p.id;
      el.style.background=p.color;
      b.appendChild(el);
    }

    const c=cells[p.position];
    const scaleX=rect.width/1000;
    const scaleY=rect.height/700;

    el.style.left=c.x*scaleX+"px";
    el.style.top=c.y*scaleY+"px";
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

    bar.innerHTML=p.username+" "+p.hype;
    bar.appendChild(fill);

    hypeBars.appendChild(bar);
  });
}

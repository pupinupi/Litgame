window.addEventListener('DOMContentLoaded', ()=>{

const socket = io();

let players = [];
let currentTurnId = null;

let username="", roomCode="", color=null;

// --- ЛОББИ ---
document.querySelectorAll('.chip').forEach(chip=>{
  chip.onclick=()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    chip.classList.add('selected');
    color = chip.dataset.color;
  };
});

joinBtn.onclick=()=>{
  username = usernameInput.value;
  roomCode = roomCodeInput.value;

  if(!username || !roomCode || !color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

startBtn.onclick=()=>{
  socket.emit('startGame',roomCode);
};

// --- КУБИК ---
rollBtn.onclick=()=>{
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice',roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  pl.forEach(newP=>{
    const old = players.find(p=>p.id===newP.id);
    if(old) newP.oldPosition = old.position;
  });

  players = pl;
  renderPlayers();
  renderHype();
});

socket.on('gameStarted', ()=>{
  lobby.style.display='none';
  game.style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId=id;
});

socket.on('diceRolled', ({playerId,dice,event})=>{
  diceResult.innerText = "🎲 "+dice;
  movePlayerSmooth(playerId, ()=>{
    if(playerId===socket.id) showEvent(event);
  });
});

// --- ДВИЖЕНИЕ ---
function movePlayerSmooth(id, cb){
  const p = players.find(pl=>pl.id===id);
  if(!p) return;

  let from = p.oldPosition ?? p.position;
  let to = p.position;

  let steps=[];
  let cur=from;

  while(cur!==to){
    cur=(cur+1)%20;
    steps.push(cur);
  }

  const el=document.querySelector(`[data-id="${p.id}"]`);
  if(!el) return;

  let i=0;

  function step(){
    if(i>=steps.length){
      if(cb) cb();
      return;
    }

    animateMove(el, from, steps[i], ()=>{
      from=steps[i];
      i++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(el, from, to, cb){
  const c1=cells[from];
  const c2=cells[to];

  let t=0;

  const int=setInterval(()=>{
    t+=0.1;

    el.style.left = c1.x+(c2.x-c1.x)*t+"px";
    el.style.top  = c1.y+(c2.y-c1.y)*t+"px";

    if(t>=1){
      clearInterval(int);
      cb();
    }
  },16);
}

// --- UI ---
function renderPlayers(){
  const board=gameBoard;

  players.forEach((p,i)=>{
    let el=document.querySelector(`[data-id="${p.id}"]`);

    if(!el){
      el=document.createElement('div');
      el.className='player';
      el.dataset.id=p.id;
      el.style.background=p.color;
      board.appendChild(el);
    }

    const c=cells[p.position];
    el.style.left=(c.x+i*15)+"px";
    el.style.top=c.y+"px";
  });
}

function renderHype(){
  const me=players.find(p=>p.id===socket.id);
  if(!me) return;

  const percent=(me.hype/70)*100;

  hypeBars.innerHTML=`
    <div class="hypeBig">${me.hype} / 70</div>
    <div class="hypeBarBig">
      <div class="hypeFillBig" style="width:${percent}%"></div>
    </div>
  `;
}

// --- СОБЫТИЯ ---
function showEvent(e){
  if(!e) return;

  let text="";

  if(e.type==='plus') text=`+${e.value} хайпа 🔥`;
  if(e.type==='minus') text=`-${e.value} хайпа ❌`;
  if(e.type==='scandal') text=`💥 Скандал ${e.value}`;
  if(e.type==='risk') text=`🎲 Риск ${e.value}`;
  if(e.type==='skip') text=`⛔ Пропуск хода`;
  if(e.type==='minusSkip') text=`-${e.value} + пропуск`;

  showModal(text);
}

function showModal(t){
  modal.innerHTML=`<div class="neonCard">${t}</div>`;
  modal.classList.add('active');

  setTimeout(()=>modal.classList.remove('active'),2000);
}

const cells=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},
  {x:219,y:101},{x:364,y:107},{x:494,y:95},{x:652,y:96},{x:815,y:89},
  {x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},{x:937,y:610},
  {x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

});

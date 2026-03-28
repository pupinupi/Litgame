window.addEventListener('DOMContentLoaded', ()=>{

const socket = io();

let players = [];
let currentTurnId = null;

let username="", roomCode="", color=null;

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(chip=>{
  chip.onclick=()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('selected'));
    chip.classList.add('selected');
    color = chip.dataset.color;
  };
});

// --- ВОЙТИ ---
joinBtn.onclick=()=>{
  username = usernameInput.value;
  roomCode = roomCodeInput.value;

  if(!username || !roomCode || !color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// --- СТАРТ ---
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

  const me = players.find(p=>p.id===socket.id);
  rollBtn.disabled = (id !== socket.id) || (me && me.skipNext);
});

socket.on('diceRolled', ({playerId,dice,event})=>{
  diceResult.innerText="🎲 "+dice;

  movePlayerSmooth(playerId, ()=>{
    if(playerId===socket.id) showEvent(event);
  });
});

// --- КВАДРАТНОЕ ПОЛЕ ---
const cells = [];

for(let i=0;i<4;i++) cells.push({x:100, y:600 - i*120});
for(let i=1;i<=6;i++) cells.push({x:100 + i*140, y:120});
for(let i=1;i<=4;i++) cells.push({x:940, y:120 + i*120});
for(let i=5;i>=0;i--) cells.push({x:100 + i*140, y:600});

// --- ДВИЖЕНИЕ ---
function movePlayerSmooth(id, cb){
  const p = players.find(pl=>pl.id===id);
  if(!p) return;

  let from = p.oldPosition ?? p.position;
  let to = p.position;

  let steps=[];
  let cur=from;

  while(cur!==to){
    cur=(cur+1)%cells.length;
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
  players.forEach((p,i)=>{
    let el=document.querySelector(`[data-id="${p.id}"]`);

    if(!el){
      el=document.createElement('div');
      el.className='player';
      el.dataset.id=p.id;
      el.style.background=p.color;
      gameBoard.appendChild(el);
    }

    const c=cells[p.position];
    el.style.left=(c.x+i*10)+"px";
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

  if(e.type==='scandal'){
    showModal("💥 Скандал!");
    return;
  }

  if(e.type==='risk'){
    showRisk(e.value);
    return;
  }

  let text="";
  if(e.type==='plus') text=`🔥 +${e.value}`;
  if(e.type==='minus') text=`❌ -${e.value}`;
  if(e.type==='skip') text=`⛔ Пропуск`;
  if(e.type==='minusSkip') text=`⛔ -${e.value} + пропуск`;

  showModal(text);
  addLog(text);
}

function showRisk(val){
  modal.innerHTML=`
    <div class="neonCard">
      <h2>⚠️ РИСК</h2>
      <p>Перебросить?</p>
      <button onclick="reroll()">Да</button>
      <button onclick="closeRisk()">Нет</button>
    </div>
  `;
  modal.classList.add('active');

  window.reroll=()=>{
    modal.classList.remove('active');
    socket.emit('rollDice',roomCode);
  };

  window.closeRisk=()=>{
    modal.classList.remove('active');
    addLog("Риск: "+val);
  };
}

function showModal(t){
  modal.innerHTML=`<div class="neonCard">${t}</div>`;
  modal.classList.add('active');
  setTimeout(()=>modal.classList.remove('active'),2000);
}

// --- ЛОГ ---
function addLog(t){
  const el=document.createElement('div');
  el.innerText=t;
  log.prepend(el);
}

});

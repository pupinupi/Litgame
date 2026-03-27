document.addEventListener("DOMContentLoaded", () => {

const socket = io();

let players=[], username, roomCode, color, currentTurnId=null;
window.gameEnded=false;

// выбор цвета
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>color=btn.dataset.color;
});

// вход
joinBtn.onclick=()=>{
  username=usernameInput.value;
  roomCode=roomCodeInput.value;

  if(!username||!roomCode||!color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// старт
startBtn.onclick=()=>socket.emit('startGame',roomCode);

// кубик
rollBtn.onclick=()=>{
  const me=players.find(p=>p.id===socket.id);

  if(currentTurnId!==socket.id) return;

  if(me.skipNext){
    showModal("⛔ Пропуск хода");
    return;
  }

  socket.emit('rollDice',roomCode);
};

// SOCKET
socket.on('updatePlayers', pl=>{
  players=pl;
  renderPlayers();
  renderHype();
  renderLobby();
});

socket.on('gameStarted', ()=>{
  lobby.style.display='none';
  game.style.display='block';
});

socket.on('nextTurn', id=>{
  currentTurnId=id;
  const p=players.find(p=>p.id===id);
  turnText.innerText="Ходит: "+p.username;

  rollBtn.disabled = (id !== socket.id);
});

socket.on('diceRolled', ({playerId,dice})=>{
  diceResult.innerHTML=`🎲 <b>${dice}</b>`;
  move(playerId,dice);
});

// координаты
const cells=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},
  {x:219,y:101},{x:364,y:107},{x:494,y:95},{x:652,y:96},{x:815,y:89},
  {x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},{x:937,y:610},
  {x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

// движение
function move(id,steps){
  const p=players.find(p=>p.id===id);

  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      let prev=p.position;
      p.position=(p.position+1)%cells.length;

      // круг
      if(prev===cells.length-1){
        p.hype+=5;
        showModal("🔥 +5 за круг");
      }

      // старт
      if(p.position===0){
        p.hype+=10;
        showModal("🚀 +10 старт");
      }

      glow(cells[p.position]);
      renderPlayers();

      if(i===steps-1){
        handleCell(p);
      }

    },i*350);
  }
}

// логика клеток
function handleCell(p){

  const pos=p.position;

  const types=[
    "start","plus","plus","scandal","risk","plus","scandal","plus","plus",
    "minus","minusSkip","plus","risk","plus","skip","plus","scandal",
    "plus","minus","plus"
  ];

  const values=[0,3,2,0,0,2,0,3,5,10,8,3,0,3,0,2,0,8,10,4];

  const type=types[pos];
  const val=values[pos];

  if(type==="plus"){
    p.hype+=val;
    showModal("+"+val+" хайпа");
  }

  if(type==="minus"){
    p.hype=Math.max(0,p.hype-val);
    showModal("-"+val+" хайпа");
  }

  if(type==="skip"){
    p.skipNext=true;
    showModal("⛔ Пропуск");
  }

  if(type==="minusSkip"){
    p.hype=Math.max(0,p.hype-val);
    p.skipNext=true;
    showModal("-"+val+" и пропуск");
  }

  if(type==="scandal"){
    showScandal(p);
  }

  if(type==="risk"){
    showRisk(p);
  }

  renderHype();
}

// СКАНДАЛ
function showScandal(p){
  const cards=[
    ["🔥 Перегрел аудиторию",-1],
    ["🫣 Заголовок",-2],
    ["😱 Монтаж",-3],
    ["#️⃣ Взлом",-3,"all"],
    ["😮 В шоке",-4],
    ["🤫 Удаляй",-5],
    ["🙄 Контент",-5,"skip"]
  ];

  const c=cards[Math.floor(Math.random()*cards.length)];

  if(c[2]==="all"){
    players.forEach(pl=>pl.hype=Math.max(0,pl.hype+c[1]));
  } else {
    p.hype=Math.max(0,p.hype+c[1]);
  }

  if(c[2]==="skip") p.skipNext=true;

  showModal("💥 "+c[0]+" ("+c[1]+")");
}

// РИСК
function showRisk(p){
  const d=Math.floor(Math.random()*6)+1;
  const r=d<=3?-5:5;

  p.hype=Math.max(0,p.hype+r);
  showModal("🎲 "+d+" → "+r);
}

// UI
function renderPlayers(){
  gameBoard.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='player';

    el.style.background=p.color;
    el.style.left=(cells[p.position].x+i*25)+'px';
    el.style.top=cells[p.position].y+'px';

    gameBoard.appendChild(el);
  });
}

// 🔥 КРАСИВАЯ ШКАЛА
function renderHype(){
  hypeBars.innerHTML='';

  const sorted=[...players].sort((a,b)=>b.hype-a.hype);

  sorted.forEach((p,i)=>{
    const percent=Math.min((p.hype/70)*100,100);

    const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":"";

    hypeBars.innerHTML+=`
      <div class="hypeContainer">
        <div class="hypeLabel" style="color:${p.color}">
          ${medal} ${p.username}: ${p.hype}/70
        </div>
        <div class="hypeBar">
          <div class="hypeFill" style="width:${percent}%"></div>
        </div>
      </div>
    `;

    if(p.hype>=70 && !gameEnded){
      gameEnded=true;
      showModal("🏆 "+p.username+" победил!");
    }
  });
}

function renderLobby(){
  playersList.innerHTML=players.map(p=>p.username).join("<br>");
}

// эффекты
function glow(cell){
  const d=document.createElement('div');

  d.style.position='absolute';
  d.style.left=(cell.x-10)+'px';
  d.style.top=(cell.y-10)+'px';
  d.style.width='50px';
  d.style.height='50px';
  d.style.borderRadius='50%';
  d.style.boxShadow='0 0 25px #00eaff';

  gameBoard.appendChild(d);
  setTimeout(()=>d.remove(),500);
}

// модалка
function showModal(text){
  modal.innerHTML=`<div class="modalContent">${text}</div>`;
  setTimeout(()=>modal.innerHTML='',2500);
}

});

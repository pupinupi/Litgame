window.gameEnded = false;

const socket = io();

let players = [];
let currentTurnId = null;

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  pl.forEach(newP=>{
    const old = players.find(p=>p.id===newP.id);
    if(old) newP.oldPosition = old.position;
  });

  players = pl;

  updatePlayersUI();
  renderHype();
});

socket.on('nextTurn', id=>{
  currentTurnId = id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  showDice(dice);
  movePlayerSmooth(playerId);
});

socket.on('gameEnded', winner=>{
  showWinScreen(winner);
});

// --- КНОПКА ---
rollBtn.onclick=()=>{
  if(currentTurnId !== socket.id) return;
  socket.emit('rollDice', roomCode);
};

// --- КЛЕТКИ ---
const cells=[
  {x:82,y:587},{x:97,y:464},{x:86,y:348},{x:93,y:224},{x:87,y:129},
  {x:219,y:101},{x:364,y:107},{x:494,y:95},{x:652,y:96},{x:815,y:89},
  {x:930,y:135},{x:936,y:247},{x:936,y:357},{x:941,y:480},{x:937,y:610},
  {x:794,y:624},{x:636,y:635},{x:517,y:627},{x:355,y:619},{x:210,y:626}
];

// --- ФИШКИ ---
function updatePlayersUI(){
  const board = document.getElementById('gameBoard');

  players.forEach((p,i)=>{
    let el = document.querySelector(`[data-id="${p.id}"]`);

    if(!el){
      el = document.createElement('div');
      el.className = 'player';
      el.dataset.id = p.id;
      el.style.background = p.color;
      board.appendChild(el);
    }

    const cell = cells[p.position];
    el.style.left = (cell.x + i*15)+'px';
    el.style.top = cell.y+'px';
  });
}

// --- ДВИЖЕНИЕ ---
function movePlayerSmooth(id){
  const p = players.find(pl=>pl.id===id);
  if(!p) return;

  let from = p.oldPosition ?? p.position;
  let to = p.position;

  let path=[];
  let cur=from;

  while(cur!==to){
    cur++;
    if(cur>=cells.length) cur=0;
    path.push(cur);
  }

  const el=document.querySelector(`[data-id="${p.id}"]`);
  if(!el) return;

  let i=0;

  function step(){
    if(i>=path.length){
      triggerCellEffect(p);
      return;
    }

    animateMove(el, from, path[i], ()=>{
      from=path[i];
      i++;
      step();
    });
  }

  step();
}

// --- АНИМАЦИЯ ---
function animateMove(el, fromIndex, toIndex, cb){
  const from=cells[fromIndex];
  const to=cells[toIndex];

  let t=0;

  const interval=setInterval(()=>{
    t+=0.08;

    el.style.left = from.x+(to.x-from.x)*t+"px";
    el.style.top  = from.y+(to.y-from.y)*t+"px";

    if(t>=1){
      clearInterval(interval);
      cb();
    }
  },16);
}

// --- ЭФФЕКТЫ КЛЕТОК ---
function triggerCellEffect(p){
  const rand = Math.random();

  if(rand < 0.5){
    showScandalCard();
  } else {
    showRiskCard();
  }
}

// --- ТВОИ СКАНДАЛЫ ---
function showScandalCard(){
  const cards=[
    {text:"Перегрел аудиторию 🔥", value:-1},
    {text:"Громкий заголовок 🫣", value:-2},
    {text:"Это монтаж 😱", value:-3},
    {text:"Меня взломали #️⃣", value:-3},
    {text:"Подписчики в шоке 😮", value:-4},
    {text:"Удаляй пока не поздно 🤫", value:-5},
    {text:"Это контент 🙄", value:-5}
  ];

  const c = cards[Math.floor(Math.random()*cards.length)];
  showFancyCard("💥 СКАНДАЛ", c.text, c.value);
}

// --- РИСК ---
function showRiskCard(){
  const dice = Math.floor(Math.random()*6)+1;
  const result = dice <=3 ? -5 : 5;

  showFancyCard("⚠️ РИСК", `Выпало ${dice}`, result);
}

// --- КРАСИВАЯ КАРТОЧКА ---
function showFancyCard(title,text,value){
  const modal=document.getElementById('modal');

  modal.innerHTML=`
    <div class="card neonCard">
      <div class="cardTitle">${title}</div>
      <div class="cardText">${text}</div>
      <div class="cardValue ${value>0?'plus':'minus'}">
        ${value>0?'+':''}${value} хайпа
      </div>
    </div>
  `;

  modal.classList.add('active');

  document.body.classList.add(value>0?'flashGood':'flashBad');

  setTimeout(()=>{
    modal.classList.remove('active');
    document.body.classList.remove('flashGood','flashBad');
  },2500);
}

// --- ХАЙП ---
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

// --- КУБИК ---
function showDice(n){
  diceResult.innerHTML=`🎲 Выпало: ${n}`;
}

// --- ПОБЕДА ---
function showWinScreen(name){
  modal.innerHTML=`<div class="winScreen">${name} победил!</div>`;
  modal.classList.add('active');
}

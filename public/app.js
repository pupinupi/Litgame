const socket = io();
let players=[], username, roomCode, color, currentTurnId=null;
let coordMode=false, coordList=[];

// --- Лобби ---
document.querySelectorAll('.chip').forEach(btn=>{ btn.onclick=()=>color=btn.dataset.color; });
document.getElementById('joinBtn').onclick = ()=>{
  username = document.getElementById('username').value;
  roomCode = document.getElementById('roomCode').value;
  if(!username || !roomCode || !color){ alert("Заполните все поля!"); return;}
  socket.emit('joinRoom',{username,roomCode,color});
};
document.getElementById('startBtn').onclick = ()=>socket.emit('startGame', roomCode);

// --- Игровое поле ---
document.getElementById('rollBtn').onclick = ()=>{ if(currentTurnId===socket.id) socket.emit('rollDice',roomCode); };

// --- Координаты ---
document.getElementById('startCoord').onclick = ()=>{ coordMode=true; alert("Режим координат включен"); };
document.getElementById('stopCoord').onclick = ()=>{ coordMode=false; alert("Режим координат выключен"); };
document.getElementById('showCoord').onclick = ()=>{
  const output=JSON.stringify(coordList,null,2);
  console.log(output);
  document.getElementById('coordList').innerText=output;
  alert("Координаты в консоль и блоке");
};
document.getElementById('gameBoard').addEventListener('click', (e)=>{
  if(!coordMode) return;
  const rect=e.target.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  coordList.push({x:Math.round(x),y:Math.round(y)});
  document.getElementById('coordList').innerText=JSON.stringify(coordList,null,2);
});

// --- Socket events ---
socket.on('updatePlayers', pl=>{ players=pl; renderPlayers(); renderHype(); renderLobbyPlayers(); });
socket.on('roomFull', ()=>alert("Комната полная!"));
socket.on('gameStarted', ()=>{ document.getElementById('lobby').style.display='none'; document.getElementById('game').style.display='block'; });
socket.on('nextTurn', id=>currentTurnId=id);
socket.on('diceRolled', ({playerId,dice})=>{ log(`${players.find(p=>p.id===playerId).username} бросил кубик: ${dice}`); movePlayer(playerId,dice); });

// --- Клетки с твоими координатами ---
const cells=[
  {name:"Старт",x:82,y:587,type:'start'},
  {name:"+3 хайп",x:97,y:464,type:'plus',value:3},
  {name:"+2 хайп",x:86,y:348,type:'plus',value:2},
  {name:"Скандал",x:93,y:224,type:'scandal'},
  {name:"Риск",x:87,y:129,type:'risk'},
  {name:"+2 хайп",x:219,y:101,type:'plus',value:2},
  {name:"Скандал",x:364,y:107,type:'scandal'},
  {name:"+3 хайп",x:494,y:95,type:'plus',value:3},
  {name:"+5 хайп",x:652,y:96,type:'plus',value:5},
  {name:"Блокировка канала",x:815,y:89,type:'minus',value:10},
  {name:"-8 хайп, пропуск хода",x:930,y:135,type:'minusSkip',value:8},
  {name:"+3 хайп",x:936,y:247,type:'plus',value:3},
  {name:"Риск",x:936,y:357,type:'risk'},
  {name:"+3 хайп",x:941,y:480,type:'plus',value:3},
  {name:"Пропусти ход",x:937,y:610,type:'skip'},
  {name:"+2 хайп",x:794,y:624,type:'plus',value:2},
  {name:"Скандал",x:636,y:635,type:'scandal'},
  {name:"+8 хайп",x:517,y:627,type:'plus',value:8},
  {name:"Блокировка канала",x:355,y:619,type:'minus',value:10},
  {name:"+4 хайп",x:210,y:626,type:'plus',value:4}
];

function renderPlayers(){
  const board=document.getElementById('gameBoard');
  board.querySelectorAll('.player').forEach(e=>e.remove());
  players.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='player';
    el.style.background=p.color;
    el.style.left=`${cells[p.position].x + i*35}px`;
    el.style.top=`${cells[p.position].y}px`;
    board.appendChild(el);
  });
}

function movePlayer(playerId,steps){
  const player=players.find(p=>p.id===playerId);
  if(!player) return;
  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      player.position=(player.position+1)%cells.length;
      renderPlayers();
      handleCell(player,cells[player.position]);
    }, i*500);
  }
}

function handleCell(player,cell){
  switch(cell.type){
    case 'plus':
      player.hype+=cell.value;
      highlightCell(cell.x,cell.y,'green');
      log(`${player.username} получил +${cell.value} хайпа`);
      break;
    case 'minus':
      player.hype=Math.max(0,player.hype-cell.value);
      highlightCell(cell.x,cell.y,'red');
      log(`${player.username} потерял ${cell.value} хайпа`);
      break;
    case 'minusSkip':
      player.hype=Math.max(0,player.hype-cell.value);
      player.skipNext=true;
      highlightCell(cell.x,cell.y,'red');
      log(`${player.username} потерял ${cell.value} хайпа и пропускает ход`);
      break;
    case 'scandal':
      player.hype=Math.max(0,player.hype-2);
      highlightCell(cell.x,cell.y,'red');
      log(`${player.username} попал на скандал -2 хайпа`);
      break;
    case 'risk':
      const dice=Math.floor(Math.random()*6)+1;
      const val=dice<=3?-5:5;
      player.hype=Math.max(0,player.hype+val);
      highlightCell(cell.x,cell.y,val>0?'green':'red');
      log(`${player.username} риск: выпало ${dice}, ${val>0?'+':'-'}${Math.abs(val)} хайпа`);
      break;
    case 'skip':
      player.skipNext=true;
      highlightCell(cell.x,cell.y,'orange');
      log(`${player.username} пропускает ход`);
      break;
  }
  renderHype();
}

function renderHype(){
  const container=document.getElementById('hypeBars');
  container.innerHTML='';
  players.forEach(p=>{
    const bar=document.createElement('div');
    bar.style.margin='5px';
    bar.innerHTML=`${p.username}: ${p.hype}/70`;
    container.appendChild(bar);
  });
}

function highlightCell(x,y,color){
  const mark=document.createElement('div');
  mark.style.width='30px';
  mark.style.height='30px';
  mark.style.position='absolute';
  mark.style.left=`${x}px`;
  mark.style.top=`${y}px`;
  mark.style.border='2px solid '+color;
  mark.style.borderRadius='50%';
  mark.style.pointerEvents='none';
  document.getElementById('gameBoard').appendChild(mark);
  setTimeout(()=>mark.remove(),500);
}

function log(msg){
  const logDiv=document.getElementById('log');
  logDiv.innerHTML+=`<div>${msg}</div>`;
  logDiv.scrollTop=logDiv.scrollHeight;
}

function renderLobbyPlayers(){
  const list=document.getElementById('playersList');
  list.innerHTML='<h3>Игроки:</h3>'+players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join('');
}

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

// --- Клетки (пример) ---
const cells=[
  {name:"Старт",x:91,y:583,type:'start'},
  {name:"+3 хайп",x:91,y:442,type:'plus',value:3},
  {name:"+2 хайп",x:86,y:329,type:'plus',value:2},
  {name:"Скандал",x:86,y:218,type:'scandal'},
  {name:"Риск",x:88,y:119,type:'risk'}
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

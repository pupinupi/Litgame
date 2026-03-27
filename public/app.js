document.addEventListener("DOMContentLoaded", () => {

const socket = io();

let players=[], username, roomCode, color, currentTurnId=null;
window.gameEnded=false;

// выбор цвета
document.querySelectorAll('.chip').forEach(btn=>{
  btn.onclick=()=>color=btn.dataset.color;
});

// вход
document.getElementById('joinBtn').onclick=()=>{
  username=document.getElementById('username').value;
  roomCode=document.getElementById('roomCode').value;

  if(!username||!roomCode||!color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// старт
document.getElementById('startBtn').onclick=()=>{
  socket.emit('startGame',roomCode);
};

// кубик
document.getElementById('rollBtn').onclick=()=>{
  const me=players.find(p=>p.id===socket.id);

  if(currentTurnId!==socket.id) return;
  if(me.skipNext){
    show("⛔ пропуск хода");
    return;
  }

  socket.emit('rollDice',roomCode);
};

// события
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
});

socket.on('diceRolled', ({playerId,dice})=>{
  diceResult.innerText="Выпало: "+dice;
  move(playerId,dice);
});

// клетки
const cells=[82,587,97,464,86,348,93,224,87,129,219,101,364,107,494,95,652,96,815,89,930,135,936,247,936,357,941,480,937,610,794,624,636,635,517,627,355,619,210,626];

// движение
function move(id,steps){
  const p=players.find(p=>p.id===id);

  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      p.position=(p.position+1)%20;

      if(p.position===0){
        p.hype+=10;
        show("+10 старт");
      }

      renderPlayers();
    },i*400);
  }
}

// UI
function renderPlayers(){
  gameBoard.querySelectorAll('.player').forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='player';

    el.style.background=p.color;
    el.style.left=cells[p.position*2]+i*20+'px';
    el.style.top=cells[p.position*2+1]+'px';

    gameBoard.appendChild(el);
  });
}

function renderHype(){
  hypeBars.innerHTML='';
  players.forEach(p=>{
    hypeBars.innerHTML+=`${p.username}: ${p.hype}<br>`;
    if(p.hype>=70 && !gameEnded){
      gameEnded=true;
      show("🏆 "+p.username+" победил!");
    }
  });
}

function renderLobby(){
  playersList.innerHTML=players.map(p=>p.username).join("<br>");
}

function show(text){
  modal.innerText=text;
  setTimeout(()=>modal.innerText="",3000);
}

});

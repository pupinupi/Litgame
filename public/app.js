const socket = io();

let players=[];
let currentTurn=null;
let username, roomCode, color;

// выбор цвета
document.querySelectorAll('.chip').forEach(c=>{
  c.onclick=()=>{
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');
    color=c.dataset.color;
  };
});

// вход
joinBtn.onclick=()=>{
  username=username.value;
  roomCode=roomCode.value;

  socket.emit('joinRoom',{username,roomCode,color});
};

// старт
startBtn.onclick=()=>{
  socket.emit('startGame',roomCode);
};

// бросок
rollBtn.onclick=()=>{
  if(currentTurn!==socket.id) return;
  socket.emit('rollDice',roomCode);
};

// SOCKET
socket.on('updatePlayers', pl=>{
  players=pl;
  render();
});

socket.on('gameStarted', ()=>{
  lobby.style.display='none';
  game.style.display='flex';
});

socket.on('nextTurn', id=>{
  currentTurn=id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  dice.innerText="🎲 "+dice;

  if(playerId!==socket.id) return;

  move(dice);
});

// клетки
const cells = Array.from({length:20},(_,i)=>i);

// движение
function move(n){
  const me=players.find(p=>p.id===socket.id);

  let i=0;
  const step=()=>{
    if(i>=n){
      socket.emit('playerMoved',{
        roomCode,
        position:me.position,
        hype:me.hype,
        skipNext:false
      });
      return;
    }

    me.position=(me.position+1)%20;
    render();

    i++;
    setTimeout(step,200);
  };

  step();
}

// рендер
function render(){

  // список игроков
  playersList.innerHTML="";
  players.forEach(p=>{
    playersList.innerHTML+=`<div>${p.username}</div>`;
  });

  // фишки
  board.innerHTML="";
  players.forEach((p,i)=>{
    const el=document.createElement('div');
    el.className='player';
    el.style.background=p.color;

    el.style.left=(p.position*40)+"px";
    el.style.top=(i*40)+"px";

    board.appendChild(el);
  });

  // хайп
  hypeBars.innerHTML="";
  players.forEach(p=>{
    hypeBars.innerHTML+=`${p.username}: ${p.hype}<br>`;
  });
}

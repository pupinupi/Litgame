const socket = io();

let players=[];
let currentTurn=null;

let username="";
let roomCode="";
let color="";

// --- ВЫБОР ФИШКИ ---
document.querySelectorAll('.chip').forEach(c=>{
  c.onclick=()=>{
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');
    color=c.dataset.color;
  };
});

// --- ВХОД ---
document.getElementById('joinBtn').onclick=()=>{
  const nameInput = document.getElementById('username');
  const roomInput = document.getElementById('roomCode');

  username = nameInput.value;
  roomCode = roomInput.value;

  if(!username || !roomCode || !color){
    alert("Заполни всё");
    return;
  }

  socket.emit('joinRoom',{username,roomCode,color});
};

// --- СТАРТ ---
document.getElementById('startBtn').onclick=()=>{
  if(!roomCode) return;
  socket.emit('startGame',roomCode);
};

// --- КУБИК ---
document.getElementById('rollBtn').onclick=()=>{
  if(currentTurn!==socket.id) return;
  socket.emit('rollDice',roomCode);
};

// --- SOCKET ---
socket.on('updatePlayers', pl=>{
  players=pl;
  render();
});

socket.on('gameStarted', ()=>{
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='flex';
});

socket.on('nextTurn', id=>{
  currentTurn=id;
});

socket.on('diceRolled', ({playerId,dice})=>{
  document.getElementById('dice').innerText="🎲 "+dice;

  if(playerId!==socket.id) return;

  move(dice);
});

// --- ДВИЖЕНИЕ ---
function move(n){
  const me=players.find(p=>p.id===socket.id);
  if(!me) return;

  let i=0;

  function step(){
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
  }

  step();
}

// --- РЕНДЕР ---
function render(){

  // список игроков
  const list=document.getElementById('playersList');
  list.innerHTML="";

  players.forEach(p=>{
    const div=document.createElement('div');
    div.innerText=p.username;
    list.appendChild(div);
  });

  // поле
  const board=document.getElementById('board');
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
  const hype=document.getElementById('hypeBars');
  hype.innerHTML="";

  players.forEach(p=>{
    hype.innerHTML+=`${p.username}: ${p.hype}<br>`;
  });
}

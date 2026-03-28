window.onload = function(){

const socket = io();

let players = [];
let currentTurn = null;
let roomCode = "";

// элементы
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const rollBtn = document.getElementById("rollBtn");

const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("roomCode");

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");

const board = document.getElementById("gameBoard");
const hypeBars = document.getElementById("hypeBars");

let selectedColor = null;

// выбор фишки
document.querySelectorAll(".chip").forEach(c=>{
  c.onclick = ()=>{
    document.querySelectorAll(".chip").forEach(x=>x.classList.remove("selected"));
    c.classList.add("selected");
    selectedColor = c.dataset.color;
  };
});

// ВОЙТИ
joinBtn.onclick = ()=>{
  const username = usernameInput.value.trim();
  roomCode = roomInput.value.trim();

  if(!username || !roomCode || !selectedColor){
    alert("Заполни всё");
    return;
  }

  socket.emit("joinRoom",{username, roomCode, color:selectedColor});
};

// СТАРТ
startBtn.onclick = ()=>{
  if(!roomCode) return;
  socket.emit("startGame", roomCode);
};

// КУБИК
rollBtn.onclick = ()=>{
  if(currentTurn !== socket.id) return;
  socket.emit("rollDice", roomCode);
};

const cells = [
  {x:82,y:587},
  {x:97,y:464},
  {x:86,y:348},
  {x:93,y:224},
  {x:87,y:129},

  {x:219,y:101},
  {x:364,y:107},
  {x:494,y:95},
  {x:652,y:96},
  {x:815,y:89},

  {x:930,y:135},
  {x:936,y:247},
  {x:936,y:357},
  {x:941,y:480},
  {x:937,y:610},

  {x:794,y:624},
  {x:636,y:635},
  {x:517,y:627},
  {x:355,y:619},
  {x:210,y:626}
];
  
// SOCKET
socket.on("updatePlayers", (pl)=>{
  players = pl;
  renderPlayers();
  renderHype();
});

socket.on("gameStarted", ()=>{
  lobby.style.display = "none";
  game.style.display = "block";
});

socket.on("nextTurn", (id)=>{
  currentTurn = id;
  rollBtn.disabled = (id !== socket.id);
});

socket.on("diceRolled", ({dice, players:pl})=>{
  players = pl;
  document.getElementById("diceResult").innerText = "🎲 " + dice;

  renderPlayers();
  renderHype();
});

// отрисовка игроков (БЕЗ АНИМАЦИИ — чтобы не лагало)
function renderPlayers(){
  board.querySelectorAll(".player").forEach(e=>e.remove());

  players.forEach((p,i)=>{
    const el = document.createElement("div");
    el.className = "player";
    el.style.background = p.color;

    const c = cells[p.position];

    el.style.left = (c.x + i*10) + "px";
    el.style.top = c.y + "px";

    board.appendChild(el);
  });
}

// хайп
function renderHype(){
  const me = players.find(p=>p.id===socket.id);
  if(!me) return;

  hypeBars.innerHTML = `
    <div style="font-size:40px;font-weight:900;text-align:center;">
      ${me.hype} / 70
    </div>
  `;
}

};

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

// координаты КВАДРАТА
const cells = [];

for(let i=0;i<4;i++) cells.push({x:100, y:600 - i*120});
for(let i=1;i<=6;i++) cells.push({x:100 + i*140, y:120});
for(let i=1;i<=4;i++) cells.push({x:940, y:120 + i*120});
for(let i=5;i>=0;i--) cells.push({x:100 + i*140, y:600});

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

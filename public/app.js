const socket = io();

let room = null;
let myId = null;
let mySkin = "red";
let players = [];

/* --- DOM --- */
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const playersList = document.getElementById("playersList");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");

const board = document.getElementById("gameBoard");
const rollBtn = document.getElementById("rollBtn");
const diceResult = document.getElementById("diceResult");
const hypeBars = document.getElementById("hypeBars");
const modal = document.getElementById("modal");

/* --- КООРДИНАТЫ --- */
const cells = [
  {x:111,y:596},{x:114,y:454},{x:106,y:363},{x:91,y:239},{x:101,y:143},
  {x:226,y:100},{x:374,y:101},{x:509,y:107},{x:653,y:106},{x:789,y:103},
  {x:933,y:128},{x:938,y:252},{x:948,y:356},{x:943,y:480},{x:923,y:598},
  {x:794,y:619},{x:644,y:617},{x:513,y:617},{x:351,y:624},{x:232,y:620}
];

/* --- ВЫБОР ФИШКИ --- */
document.querySelectorAll(".chip").forEach(chip=>{
  chip.onclick = ()=>{
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("selected"));
    chip.classList.add("selected");
    mySkin = chip.dataset.color;
  };
});

/* --- CONNECT --- */
socket.on("connect",()=>{
  myId = socket.id;
});

/* --- JOIN / CREATE --- */
joinBtn.onclick = ()=>{
  const name = nameInput.value.trim();
  const roomCode = roomInput.value.trim();

  if(!name){
    alert("Введите имя");
    return;
  }

  if(!roomCode){
    socket.emit("createRoom",{name, skin: mySkin});
  } else {
    socket.emit("joinRoom",{name, room: roomCode, skin: mySkin});
  }
};

/* --- START --- */
startBtn.onclick = ()=>{
  socket.emit("startGame", room);
};

/* --- LOBBY --- */
socket.on("roomData",(d)=>{
  room = d.room;

  roomInput.value = room;
  roomCodeDisplay.innerHTML = "Код комнаты: " + room;

  playersList.innerHTML =
    "<h3>👥 Игроки:</h3>" +
    d.players.map(p=>`<div>● ${p.name}</div>`).join("");

  startBtn.style.display = d.isHost ? "block" : "none";
});

/* --- GAME START --- */
socket.on("gameStart",()=>{
  lobby.style.display = "none";
  game.style.display = "block";
});

/* --- PLAYERS UPDATE --- */
socket.on("updatePlayers",(p)=>{
  players = p;
  drawTokens();
  updateHype();
});

/* --- TURN --- */
socket.on("turn",(id)=>{
  rollBtn.disabled = id !== myId;
});

/* --- ROLL --- */
rollBtn.onclick = ()=>{
  socket.emit("rollDice", room);
};

/* --- MOVE --- */
socket.on("move",({id,from,to,dice})=>{
  diceResult.innerText = "🎲 " + dice;
  animateMove(id, from, to);
});

/* --- SCANDAL --- */
socket.on("scandal",(text)=>{
  showModal("💥 " + text);
});

/* --- RISK --- */
socket.on("riskRule",()=>{
  showModal("⚠️ 1-3 = -5 | 4-6 = +5");
});

socket.on("riskResult",({roll,res})=>{
  setTimeout(()=>{
    showModal(`🎲 ${roll} → ${res}`);
  },1000);
});

/* --- WIN --- */
socket.on("winner",(name)=>{
  showModal("🏆 " + name);
});

/* --- ERROR --- */
socket.on("errorMsg",(msg)=>{
  alert(msg);
});

/* ================= */
/* --- ФИШКИ --- */
/* ================= */
function drawTokens(){
  // очистка
  document.querySelectorAll(".token").forEach(t=>t.remove());

  players.forEach(p=>{
    const el = document.createElement("div");

    el.className = "token " + p.skin;
    el.id = p.id;

    const pos = cells[p.pos];

    el.style.position = "absolute";
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";

    // подсветка себя
    if(p.id === myId){
      el.style.transform = "scale(1.5)";
      el.style.boxShadow = "0 0 30px white";
    }

    board.appendChild(el);
  });
}

/* ================= */
/* --- АНИМАЦИЯ --- */
/* ================= */
function animateMove(id, from, to){
  const el = document.getElementById(id);
  if(!el) return;

  let steps = (to - from + 20) % 20;
  let i = 0;

  function step(){
    if(i >= steps) return;

    let pos = cells[(from + i + 1) % 20];

    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";

    i++;
    setTimeout(step, 200);
  }

  step();
}

/* ================= */
/* --- ХАЙП --- */
/* ================= */
function updateHype(){
  hypeBars.innerHTML = players.map(p=>{
    return `<div>${p.name}: ${p.hype}</div>`;
  }).join("");
}

/* ================= */
/* --- МОДАЛКА --- */
/* ================= */
function showModal(text){
  modal.innerHTML = `<div class="card">${text}</div>`;
  modal.style.display = "block";

  setTimeout(()=>{
    modal.style.display = "none";
  },2000);
}

const socket = io();

let myId;
let room=null;
let mySkin="red";
let players=[];

/* --- ВАЖНО: ПОЛУЧАЕМ INPUT --- */
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("roomInput");
const playersList = document.getElementById("playersList");
const startBtn = document.getElementById("startBtn");

/* --- ВЫБОР ФИШКИ --- */
function selectSkin(color,el){
  mySkin=color;
  document.querySelectorAll(".skin").forEach(s=>s.classList.remove("selected"));
  el.classList.add("selected");
}

/* --- СОЗДАТЬ --- */
function createRoom(){
  const name = nameInput.value.trim();

  if(!name){
    alert("Введите имя");
    return;
  }

  socket.emit("createRoom",{name,skin:mySkin});
}

/* --- ВОЙТИ --- */
function joinRoom(){
  const name = nameInput.value.trim();
  const roomCode = roomInput.value.trim();

  if(!name){
    alert("Введите имя");
    return;
  }

  if(!roomCode){
    alert("Введите код комнаты");
    return;
  }

  socket.emit("joinRoom",{name,room:roomCode,skin:mySkin});
}

/* --- СТАРТ --- */
function startGame(){
  socket.emit("startGame",room);
}

/* --- ПОДКЛЮЧЕНИЕ --- */
socket.on("connect",()=>myId=socket.id);

/* --- ОБНОВЛЕНИЕ ЛОББИ --- */
socket.on("roomData",(d)=>{
  room=d.room;

  playersList.innerHTML =
    "<h3>👥 Игроки:</h3>" +
    d.players.map(p=>`<div>● ${p.name}</div>`).join("");

  startBtn.style.display = d.isHost ? "block":"none";
});

/* --- СТАРТ ИГРЫ --- */
socket.on("gameStart",()=>{
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
});

/* --- ОШИБКИ --- */
socket.on("errorMsg",(msg)=>{
  alert(msg);
});

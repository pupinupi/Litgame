const socket = io();

let room=null;
let mySkin="red";

/* DOM */
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("roomInput");
const playersList = document.getElementById("playersList");
const startBtn = document.getElementById("startBtn");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");

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
  let roomCode = roomInput.value.trim();

  if(!name){
    alert("Введите имя");
    return;
  }

  // 🔥 ЕСЛИ НЕТ КОДА → СОЗДАЕМ КОМНАТУ
  if(!roomCode){
    socket.emit("createRoom",{name,skin:mySkin});
  } else {
    socket.emit("joinRoom",{name,room:roomCode,skin:mySkin});
  }
}

/* --- СТАРТ --- */
function startGame(){
  socket.emit("startGame",room);
}

/* --- ОБНОВЛЕНИЕ ЛОББИ --- */
socket.on("roomData",(d)=>{
  room = d.room;

  // ВСТАВЛЯЕМ КОД
  roomInput.value = room;
  roomCodeDisplay.innerHTML = "Код комнаты: " + room;

  playersList.innerHTML =
    "<h3>Игроки:</h3>" +
    d.players.map(p=>`<div>● ${p.name}</div>`).join("");

  startBtn.style.display = d.isHost ? "block":"none";
});

/* --- ОШИБКА --- */
socket.on("errorMsg",(msg)=>{
  alert(msg);
});

/* --- СТАРТ ИГРЫ --- */
socket.on("gameStart",()=>{
  document.getElementById("lobby").classList.add("hidden");
});

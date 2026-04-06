const socket = io();

let myId;
let room=null;
let mySkin="red";
let players=[];

const cells = [
  {x:111,y:596},{x:114,y:454},{x:106,y:363},{x:91,y:239},{x:101,y:143},
  {x:226,y:100},{x:374,y:101},{x:509,y:107},{x:653,y:106},{x:789,y:103},
  {x:933,y:128},{x:938,y:252},{x:948,y:356},{x:943,y:480},{x:923,y:598},
  {x:794,y:619},{x:644,y:617},{x:513,y:617},{x:351,y:624},{x:232,y:620}
];

/* --- ВЫБОР ФИШКИ --- */
function selectSkin(color,el){
  mySkin=color;
  document.querySelectorAll(".skin").forEach(s=>s.classList.remove("selected"));
  el.classList.add("selected");
}

/* --- ЛОББИ --- */
function createRoom(){
  if(!name.value) return alert("Введите имя");
  socket.emit("createRoom",{name:name.value,skin:mySkin});
}

function joinRoom(){
  if(!name.value || !roomInput.value) return alert("Имя и код!");
  socket.emit("joinRoom",{name:name.value,room:roomInput.value,skin:mySkin});
}

function startGame(){
  socket.emit("startGame",room);
}

/* --- ИГРА --- */
function roll(){
  socket.emit("rollDice",room);
}

socket.on("connect",()=>myId=socket.id);

/* --- ЛОББИ ОБНОВЛЕНИЕ --- */
socket.on("roomData",(d)=>{
  room=d.room;

  playersList.innerHTML =
    "<h3>Игроки:</h3>" +
    d.players.map(p=>`<div>● ${p.name}</div>`).join("");

  startBtn.style.display = d.isHost ? "block":"none";
});

/* --- СТАРТ --- */
socket.on("gameStart",()=>{
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
});

/* --- ИГРОКИ --- */
socket.on("updatePlayers",(p)=>{
  players=p;
  draw();
  updateHype();
});

socket.on("errorMsg",(msg)=>{
  alert(msg);
});

/* --- ДВИЖЕНИЕ --- */
socket.on("move",({id,from,to,dice})=>{
  animate(id,from,to);
  diceEl.innerText="🎲 "+dice;
});

/* --- ХОД --- */
socket.on("turn",(id)=>{
  turn.innerText=id===myId?"🔥 ТВОЙ ХОД":"⌛ ЖДИ";
});

/* --- СОБЫТИЯ --- */
socket.on("scandal",(t)=>show(t));
socket.on("riskRule",()=>show("1-3 = -5 / 4-6 = +5"));
socket.on("riskResult",({roll,res})=>{
  setTimeout(()=>show(`🎲 ${roll} → ${res}`),1000);
});
socket.on("winner",(n)=>show("🏆 "+n));

socket.on("hypeEffect",({id,value,pos})=>{
  let p=cells[pos];
  floatText(value,p.x,p.y);
});

/* --- РЕНДЕР --- */
function draw(){
  tokens.innerHTML="";
  players.forEach(p=>{
    let el=document.createElement("div");
    el.className="token "+p.skin;
    el.id=p.id;

    el.style.left=cells[p.pos].x+"px";
    el.style.top=cells[p.pos].y+"px";

    if(p.id===myId) el.classList.add("me");

    tokens.appendChild(el);
  });
}

/* --- АНИМАЦИЯ --- */
function animate(id,from,to){
  let el=document.getElementById(id);
  let i=0;
  let steps=(to-from+20)%20;

  function step(){
    if(i>=steps) return;
    let p=cells[(from+i+1)%20];
    el.style.left=p.x+"px";
    el.style.top=p.y+"px";
    i++;
    setTimeout(step,200);
  }
  step();
}

/* --- ХАЙП --- */
function updateHype(){
  hype.innerHTML=players.map(p=>p.name+": "+p.hype).join("<br>");
  let me=players.find(p=>p.id===myId);
  if(me){
    hypeFill.style.width=Math.min(me.hype/70*100,100)+"%";
  }
}

/* --- UI --- */
function show(t){
  modal.innerHTML="<div class='card'>"+t+"</div>";
  modal.classList.remove("hidden");
  setTimeout(()=>modal.classList.add("hidden"),2000);
}

function floatText(v,x,y){
  let el=document.createElement("div");
  el.className="float";
  el.innerText=v;
  el.style.left=x+"px";
  el.style.top=y+"px";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}

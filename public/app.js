const socket = io();

let room=null;
let myId=null;
let mySkin="red";
let players=[];

const nameInput=document.getElementById("name");
const roomInput=document.getElementById("room");
const joinBtn=document.getElementById("join");
const startBtn=document.getElementById("start");

const lobby=document.getElementById("lobby");
const game=document.getElementById("game");

const board=document.getElementById("board");
const rollBtn=document.getElementById("roll");
const dice=document.getElementById("dice");
const hypeBars=document.getElementById("hypeBars");
const modal=document.getElementById("modal");
const winScreen=document.getElementById("winScreen");

/* координаты */
const cells=[
{x:111,y:596},{x:114,y:454},{x:106,y:363},{x:91,y:239},{x:101,y:143},
{x:226,y:100},{x:374,y:101},{x:509,y:107},{x:653,y:106},{x:789,y:103},
{x:933,y:128},{x:938,y:252},{x:948,y:356},{x:943,y:480},{x:923,y:598},
{x:794,y:619},{x:644,y:617},{x:513,y:617},{x:351,y:624},{x:232,y:620}
];

/* выбор фишки */
document.querySelectorAll(".skin").forEach(s=>{
  s.onclick=()=>{
    document.querySelectorAll(".skin").forEach(x=>x.classList.remove("selected"));
    s.classList.add("selected");
    mySkin=[...s.classList].find(c=>c!=="skin" && c!=="selected");
  };
});

socket.on("connect",()=>myId=socket.id);

/* вход */
joinBtn.onclick=()=>{
  let name=nameInput.value.trim();
  let r=roomInput.value.trim();

  if(!name) return alert("Введите имя");

  if(!r){
    socket.emit("createRoom",{name,skin:mySkin});
  }else{
    socket.emit("joinRoom",{name,room:r,skin:mySkin});
  }
};

/* старт */
startBtn.onclick=()=>{
  socket.emit("startGame",room);
};

socket.on("roomData",(d)=>{
  room=d.room;
});

/* старт игры */
socket.on("gameStart",()=>{
  lobby.style.display="none";
  game.style.display="block";
});

/* игроки */
socket.on("updatePlayers",(p)=>{
  players=p;
  draw();
  hype();
});

/* ход */
socket.on("turn",(id)=>{
  rollBtn.disabled=id!==myId;
});

/* бросок */
rollBtn.onclick=()=>{
  socket.emit("rollDice",room);
};

/* движение */
socket.on("move",({id,from,to,dice:roll})=>{
  dice.innerText="🎲 "+roll;
  move(id,from,to);
});

/* события */
socket.on("scandal",(t)=>show(t));
socket.on("riskRule",()=>show("1-3 -5 | 4-6 +5","risk"));
socket.on("riskResult",({roll,res})=>show(roll+" → "+res,"risk"));

socket.on("winner",(n)=>{
  winScreen.style.display="flex";
  winScreen.innerHTML="🏆 "+n+" ПОБЕДИЛ!";
});

/* функции */
function draw(){
  document.querySelectorAll(".token").forEach(t=>t.remove());

  players.forEach(p=>{
    let el=document.createElement("div");
    el.className="token "+p.skin;
    el.id=p.id;

    let pos=cells[p.pos];
    el.style.left=pos.x+"px";
    el.style.top=pos.y+"px";

    board.appendChild(el);
  });
}

function move(id,from,to){
  let el=document.getElementById(id);
  if(!el)return;

  let i=0;
  let steps=(to-from+20)%20;

  function step(){
    if(i>=steps)return;

    let pos=cells[(from+i+1)%20];
    el.style.left=pos.x+"px";
    el.style.top=pos.y+"px";

    i++;
    setTimeout(step,180);
  }
  step();
}

function hype(){
  hypeBars.innerHTML=players.map(p=>{
    return `<div>${p.name}: ${p.hype}
    <div class="bar"><div class="fill" style="width:${p.hype/70*100}%"></div></div>
    </div>`;
  }).join("");
}

function show(t,type="scandal"){
  modal.innerHTML=`<div class="card ${type==="risk"?"risk":""}">${t}</div>`;
  setTimeout(()=>modal.innerHTML="",2000);
}

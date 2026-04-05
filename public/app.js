const socket = io();

let myId;
let players = [];

const cells = [
  { x:111,y:596 },{ x:114,y:454 },{ x:106,y:363 },
  { x:91,y:239 },{ x:101,y:143 },{ x:226,y:100 },
  { x:374,y:101 },{ x:509,y:107 },{ x:653,y:106 },
  { x:789,y:103 },

  { x:933,y:128 },{ x:938,y:252 },{ x:948,y:356 },
  { x:943,y:480 },{ x:923,y:598 },{ x:794,y:619 },
  { x:644,y:617 },{ x:513,y:617 },{ x:351,y:624 },
  { x:232,y:620 }
];

function join(){
  socket.emit("join", document.getElementById("name").value);
  document.getElementById("lobby").style.display="none";
}

function roll(){ socket.emit("rollDice"); }

socket.on("connect",()=> myId = socket.id);

socket.on("move", ({id,from,to,dice})=>{
  animateMove(id, from, to);
  showDice(dice);
});

socket.on("updatePlayers", (p)=>{
  players = p;
  draw();
  updateHype();
});

socket.on("turn", (id)=>{
  document.getElementById("turn").innerText =
    id === myId ? "ТВОЙ ХОД" : "ХОД СОПЕРНИКА";
});

socket.on("scandal", showModal);
socket.on("risk", ({roll,result})=>{
  showModal(`🎲 Риск: ${roll} → ${result>0?"+5":"-5"}`);
});

socket.on("winner",(name)=>{
  showModal("🏆 Победитель: " + name);
});

function animateMove(id, from, to){
  const el = document.getElementById(id);
  let i = 0;
  let steps = (to - from + 20) % 20;

  function step(){
    if(i>=steps) return;

    let pos = cells[(from+i+1)%20];
    el.style.left = pos.x+"px";
    el.style.top = pos.y+"px";

    i++;
    setTimeout(step,250);
  }
  step();
}

function draw(){
  const c = document.getElementById("tokens");
  c.innerHTML="";

  players.forEach((p,i)=>{
    let el = document.createElement("div");
    el.className="token";
    el.id = p.id;

    el.style.left = cells[p.pos].x+"px";
    el.style.top = cells[p.pos].y+"px";

    el.style.background = ["red","cyan","lime","magenta"][i];

    if(p.id===myId) el.classList.add("me");

    c.appendChild(el);
  });
}

function updateHype(){
  let el = document.getElementById("hype");

  el.innerHTML = players.map(p=>`${p.name}: ${p.hype}`).join("<br>");

  let me = players.find(p=>p.id===myId);
  if(me){
    document.getElementById("hypeFill").style.width =
      Math.min(me.hype/70*100,100)+"%";
  }
}

function showDice(n){
  let d = document.getElementById("dice");
  d.innerText = "🎲 "+n;
  new Audio("dice.mp3").play();
}

function showModal(text){
  let m = document.getElementById("modal");
  m.innerHTML = `<div class="card">${text}</div>`;
  m.classList.remove("hidden");

  new Audio("scandal.mp3").play();

  setTimeout(()=>m.classList.add("hidden"),2500);
}

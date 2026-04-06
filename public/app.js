const socket = io();

let myId;
let players = [];
let mySkin = "red";

const cells = [
  {x:111,y:596},{x:114,y:454},{x:106,y:363},{x:91,y:239},{x:101,y:143},
  {x:226,y:100},{x:374,y:101},{x:509,y:107},{x:653,y:106},{x:789,y:103},
  {x:933,y:128},{x:938,y:252},{x:948,y:356},{x:943,y:480},{x:923,y:598},
  {x:794,y:619},{x:644,y:617},{x:513,y:617},{x:351,y:624},{x:232,y:620}
];

function selectSkin(color, el){
  mySkin = color;
  document.querySelectorAll(".skin").forEach(s=>s.classList.remove("selected"));
  el.classList.add("selected");
}

function join(){
  socket.emit("join", {
    name: document.getElementById("name").value,
    skin: mySkin
  });

  
let room = null;

function createRoom(){
  socket.emit("createRoom", {
    name: document.getElementById("name").value,
    skin: mySkin
  });
}

function joinRoom(){
  socket.emit("joinRoom", {
    name: document.getElementById("name").value,
    room: document.getElementById("roomInput").value,
    skin: mySkin
  });
}

function startGame(){
  socket.emit("startGame", room);
}

socket.on("roomData", (data)=>{
  room = data.room;

  document.getElementById("roomCode").innerText =
    "КОД: " + data.room;

  document.getElementById("playersList").innerHTML =
    data.players.map(p=>p.name).join("<br>");

  document.getElementById("startBtn").style.display =
    data.isHost ? "block" : "none";
});

socket.on("gameStart", ()=>{
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
});


  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
}

function roll(){ socket.emit("rollDice"); }

socket.on("connect",()=> myId = socket.id);

socket.on("move", ({id,from,to,dice})=>{
  animateMove(id, from, to);
  showDice(dice);
});

socket.on("hypeChange", ({id, value})=>{
  let p = players.find(p=>p.id===id);
  if(!p) return;

  let pos = cells[p.pos];

  showFloating(`ХАЙП: ${value}`, pos.x+500, pos.y+100);
});

socket.on("updatePlayers", (p)=>{
  players = p;
  draw();
  updateHype();
});

socket.on("riskRule", ()=>{
  showCard("РИСК", "1-3 → -5 хайпа\n4-6 → +5 хайпа", "purple");
});

socket.on("riskResult", ({roll,result})=>{
  setTimeout(()=>{
    showCard(
      "РИСК",
      `🎲 Выпало ${roll}\n${result>0?"+5 хайпа":"-5 хайпа"}`,
      "purple"
    );
  }, 1200);
});

socket.on("turn", (id)=>{
  let t = document.getElementById("turn");

  if(id === myId){
    t.innerText = "🔥 ТВОЙ ХОД";
    t.className = "myTurn";
  } else {
    t.innerText = "⌛ ХОД СОПЕРНИКА";
    t.className = "";
  }
});

socket.on("scandal", txt => showCard("СКАНДАЛ", txt, "red"));
socket.on("risk", ({roll,result})=>{
  showCard("РИСК", `🎲 ${roll} → ${result>0?"+5":"-5"}`, "purple");
});
socket.on("winner", name=>{
  showCard("ПОБЕДА", `🏆 ${name}`, "gold");
});

function animateMove(id, from, to){
  let el = document.getElementById(id);
  let i = 0;
  let steps = (to - from + 20) % 20;

  function step(){
    if(i>=steps) return;

    let pos = cells[(from+i+1)%20];

    el.style.transform = "scale(1.4)";
    el.style.left = pos.x+"px";
    el.style.top = pos.y+"px";

    setTimeout(()=>el.style.transform="scale(1)",150);

    i++;
    setTimeout(step,200);
  }
  step();
}

function draw(){
  let c = document.getElementById("tokens");
  c.innerHTML="";

  players.forEach(p=>{
    let el = document.createElement("div");
    el.className="token neon "+(p.skin||"red");
    el.id = p.id;

    el.style.left = cells[p.pos].x+"px";
    el.style.top = cells[p.pos].y+"px";

    if(p.id===myId) el.classList.add("me");

    c.appendChild(el);
  });
}

function updateHype(){
  let el = document.getElementById("hype");

  el.innerHTML = players.map(p=>`${p.name}: ${p.hype}`).join("<br>");

  let me = players.find(p=>p.id===myId);
  if(me){
    let percent = Math.min(me.hype/70*100,100);
    document.getElementById("hypeFill").style.width = percent+"%";
  }
}

function showDice(n){
  let d = document.getElementById("dice");
  d.innerText = "🎲 "+n;
  d.classList.add("diceAnim");

  new Audio("dice.mp3").play();

  setTimeout(()=>d.classList.remove("diceAnim"),400);
}

function showCard(title, text, color){
  let m = document.getElementById("modal");

  m.innerHTML = `
    <div class="card ${color}">
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
  `;

  m.classList.remove("hidden");

  new Audio("scandal.mp3").play();

  setTimeout(()=>m.classList.add("hidden"),2500);
}

function showFloating(text, x, y){
  let el = document.createElement("div");
  el.className = "floating";
  el.innerText = text;

  el.style.left = x+"px";
  el.style.top = y+"px";

  document.body.appendChild(el);

  setTimeout(()=>el.remove(),1000);
}

// --- РЕЖИМ РАЗМЕТКИ КЛЕТОК ---
let editMode = false;
let generatedCells = [];

document.addEventListener("keydown", (e)=>{
  if(e.key === "e"){ // нажми "E" чтобы включить режим
    editMode = !editMode;
    console.log("EDIT MODE:", editMode);
  }
});

document.getElementById("board").addEventListener("click", (e)=>{
  if(!editMode) return;

  const rect = e.target.getBoundingClientRect();

  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);

  generatedCells.push({x,y});

  console.log("cells =", JSON.stringify(generatedCells, null, 2));
});

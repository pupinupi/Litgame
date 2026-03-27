document.addEventListener("DOMContentLoaded", () => {

  const socket = io();

  let players = [], username, roomCode, color, currentTurnId = null;
  window.gameEnded = false;

  // --- DOM элементы ---
  const joinBtn = document.getElementById('joinBtn');
  const startBtn = document.getElementById('startBtn');
  const usernameInput = document.getElementById('username');
  const roomCodeInput = document.getElementById('roomCode');
  const playersList = document.getElementById('playersList');
  const rollBtn = document.getElementById('rollBtn');
  const gameBoard = document.getElementById('gameBoard');
  const hypeBars = document.getElementById('hypeBars');
  const modal = document.getElementById('modal');
  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  const turnText = document.getElementById('turnText');

  // --- Клетки ---
  const cells=[
    {name:"Старт",x:82,y:587,type:'start'},
    {name:"+3",x:97,y:464,type:'plus',value:3},
    {name:"+2",x:86,y:348,type:'plus',value:2},
    {name:"Скандал",x:93,y:224,type:'scandal'},
    {name:"Риск",x:87,y:129,type:'risk'},
    {name:"+2",x:219,y:101,type:'plus',value:2},
    {name:"Скандал",x:364,y:107,type:'scandal'},
    {name:"+3",x:494,y:95,type:'plus',value:3},
    {name:"+5",x:652,y:96,type:'plus',value:5},
    {name:"-10",x:815,y:89,type:'minus',value:10},
    {name:"-8 skip",x:930,y:135,type:'minusSkip',value:8},
    {name:"+3",x:936,y:247,type:'plus',value:3},
    {name:"Риск",x:936,y:357,type:'risk'},
    {name:"+3",x:941,y:480,type:'plus',value:3},
    {name:"skip",x:937,y:610,type:'skip'},
    {name:"+2",x:794,y:624,type:'plus',value:2},
    {name:"Скандал",x:636,y:635,type:'scandal'},
    {name:"+8",x:517,y:627,type:'plus',value:8},
    {name:"-10",x:355,y:619,type:'minus',value:10},
    {name:"+4",x:210,y:626,type:'plus',value:4}
  ];

  // --- Лобби ---
  document.querySelectorAll('.chip').forEach(btn => {
    btn.onclick = () => color = btn.dataset.color;
  });

  joinBtn.onclick = () => {
    username = usernameInput.value;
    roomCode = roomCodeInput.value;

    if(!username || !roomCode || !color){
      alert("Заполни всё!");
      return;
    }

    socket.emit('joinRoom',{username,roomCode,color});
  };

  startBtn.onclick = () => {
    if(!roomCode) { alert("Введите код комнаты!"); return; }
    socket.emit('startGame',roomCode);
  };

  // --- Кубик ---
  rollBtn.onclick = () => {
    const me = players.find(p=>p.id===socket.id);
    if(window.gameEnded) return;
    if(currentTurnId!==socket.id) return;
    if(me && me.skipNext){
      showModal("⛔ Вы пропускаете ход");
      return;
    }
    socket.emit('rollDice',roomCode);
  };

  // --- Socket события ---
  socket.on('updatePlayers', pl=>{
    players = pl;
    renderPlayers();
    renderHype();
    renderLobbyPlayers();
  });

  socket.on('gameStarted', ()=>{
    lobby.style.display='none';
    game.style.display='block';
  });

  socket.on('nextTurn', id=>{
    currentTurnId=id;
    const p = players.find(pl=>pl.id===id);
    turnText.innerText = `Ходит: ${p.username}`;

    const me = players.find(pl=>pl.id===socket.id);
    rollBtn.disabled = (id !== socket.id) || (me && me.skipNext);
  });

  socket.on('diceRolled', ({playerId,dice})=>{
    document.getElementById('diceResult').innerHTML=
      `🎲 Выпало: <span style="font-size:28px;color:#00eaff">${dice}</span>`;
    movePlayerSmooth(playerId,dice);
  });

  // --- Движение ---
  function movePlayerSmooth(id, steps){
    const p=players.find(pl=>pl.id===id);
    let stepIndex = 0;

    function step(){
      if(stepIndex >= steps){
        handleCell(p, cells[p.position]);
        return;
      }

      let prev = p.position;
      p.position = (p.position + 1) % cells.length;

      if(prev === cells.length-1){
        p.hype += 5;
        showModal("🔥 +5 за круг");
      }

      glow(cells[p.position],'step');

      animateMove(p, prev, p.position, ()=>{
        stepIndex++;
        step();
      });
    }

    step();
  }

  function animateMove(p, fromIndex, toIndex, callback){
    const el=[...document.querySelectorAll('.player')].find(e=>e.style.background===p.color);
    if(!el){callback(); return;}

    const from=cells[fromIndex], to=cells[toIndex];
    let progress=0;

    const anim=setInterval(()=>{
      progress+=0.08;
      el.style.left = (from.x + (to.x - from.x)*progress)+'px';
      el.style.top = (from.y + (to.y - from.y)*progress)+'px';
      if(progress>=1){ clearInterval(anim); renderPlayers(); callback(); }
    },20);
  }

  // --- Логика клеток ---
  function handleCell(p,cell){
    switch(cell.type){
      case 'start': p.hype+=10; glow(cell,'start'); showModal("🚀 +10 за старт"); break;
      case 'plus': p.hype+=cell.value; glow(cell,'plus'); break;
      case 'minus': p.hype=Math.max(0,p.hype-cell.value); glow(cell,'minus'); break;
      case 'skip': p.skipNext=true; glow(cell,'minus'); showModal("⛔ Вы пропускаете ход"); break;
      case 'minusSkip': p.hype=Math.max(0,p.hype-cell.value); p.skipNext=true; glow(cell,'minus'); showModal("-8 и пропуск"); break;
      case 'scandal': glow(cell,'scandal'); showScandal(p); break;
      case 'risk': glow(cell,'risk'); showRisk(p); break;
    }
    renderHype();
  }

  // --- Эффекты подсветки ---
  function glow(cell,type){
    let color='#00ff88';
    if(type==='minus') color='#ff3b3b';
    if(type==='scandal') color='#ff0000';
    if(type==='risk') color='#00eaff';
    if(type==='start') color='#ffe600';
    if(type==='step') color='#ffffff';

    const d=document.createElement('div');
    d.style.position='absolute';
    d.style.left=(cell.x-10)+'px';
    d.style.top=(cell.y-10)+'px';
    d.style.width='50px';
    d.style.height='50px';
    d.style.borderRadius='50%';
    d.style.boxShadow=`0 0 30px ${color}`;
    d.style.animation='pulse 0.6s';
    d.style.pointerEvents='none';
    gameBoard.appendChild(d);
    setTimeout(()=>d.remove(),600);
  }

  // --- Карточки ---
  function showScandal(p){
    const cards=[
      {text:"Перегрел аудиторию 🔥", value:-1},
      {text:"Громкий заголовок 🫣", value:-2},
      {text:"Это монтаж 😱", value:-3},
      {text:"Меня взломали #️⃣", value:-3, all:true},
      {text:"Подписчики в шоке 😮", value:-4},
      {text:"Удаляй пока не поздно 🤫", value:-5},
      {text:"Это контент 🙄", value:-5, skip:true}
    ];
    const card=cards[Math.floor(Math.random()*cards.length)];
    if(card.all) players.forEach(pl=>pl.hype=Math.max(0,pl.hype+card.value));
    else p.hype=Math.max(0,p.hype+card.value);
    if(card.skip) p.skipNext=true;
    renderHype();
    showModal(`💥 ${card.text} (${card.value})`);
  }

  function showRisk(p){
    const dice=Math.floor(Math.random()*6)+1;
    const result=dice<=3?-5:5;
    p.hype=Math.max(0,p.hype+result);
    renderHype();
    showModal(`🎲 ${dice} → ${result>0?'+':'-'}5`);
  }

  // --- UI ---
  function showModal(text){
    modal.innerHTML=`<div class="modalContent">${text}</div>`;
    modal.classList.add('active');
    setTimeout(()=>modal.classList.remove('active'),3000);
  }

  function renderPlayers(){
    gameBoard.querySelectorAll('.player').forEach(e=>e.remove());
    players.forEach((p,i)=>{
      const el=document.createElement('div');
      el.className='player';
      if(p.id===currentTurnId) el.classList.add('activePlayer');
      el.style.background=p.color;
      el.style.left=`${cells[p.position].x+i*30}px`;
      el.style.top=`${cells[p.position].y}px`;
      gameBoard.appendChild(el);
    });
  }

  function renderHype(){
    hypeBars.innerHTML='';
    const sorted=[...players].sort((a,b)=>b.hype-a.hype);
    sorted.forEach((p,index)=>{
      const percent=Math.min((p.hype/70)*100,100);
      const medal=index===0?"🥇":index===1?"🥈":index===2?"🥉":"";
      const div=document.createElement('div');
      div.style.marginBottom="15px";
      div.innerHTML=`
        <div style="
          color:${p.color};
          font-weight:900;
          font-size:26px;
          text-shadow:0 0 10px ${p.color};
        ">
          ${medal} ${p.username}: ${p.hype}/70
        </div>
        <div class="hypeBar">
          <div class="hypeFill" style="width:${percent}%"></div>
        </div>
      `;
      hypeBars.appendChild(div);
      if(p.hype>=70 && !window.gameEnded){
        window.gameEnded=true;
        showWinScreen(p.username);
      }
    });
  }

  function showWinScreen(name){
    modal.innerHTML=`
      <div class="winScreen">
        🏆 ${name} победил!
      </div>
    `;
    modal.classList.add('active');
    document.body.style.background = "radial-gradient(circle, #001f2f, #000)";
  }

  function renderLobbyPlayers(){
    playersList.innerHTML = players.map(p=>`<div style="color:${p.color}">${p.username}</div>`).join('');
  }

});

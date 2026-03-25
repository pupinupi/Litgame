window.initGame = function (socket, myName, myPiece, roomCode) {

    const rollBtn = document.getElementById("rollBtn");
    const diceNumber = document.getElementById("diceNumber");
    const hypeFill = document.getElementById("hypeFill");
    const tokensBox = document.getElementById("tokens");

    const scandalPopup = document.getElementById("scandalPopup");
    const scandalText = document.getElementById("scandalText");
    const closeScandal = document.getElementById("closeScandal");

    const riskPopup = document.getElementById("riskPopup");
    const riskResult = document.getElementById("riskResult");
    const closeRisk = document.getElementById("closeRisk");

    let players = {};
    let myTurn = false;
    let positions = {};
    let hype = {};

    // ---- ПОЛЕ 20 КЛЕТОК ----
    const boardCells = [
        { type: "start" },
        { type: "+", value: 3 },
        { type: "+", value: 2 },
        { type: "scandal" },
        { type: "risk" },
        { type: "+", value: 2 },
        { type: "scandal" },
        { type: "+", value: 3 },
        { type: "+", value: 5 },
        { type: "block", value: -10 },
        { type: "minusSkip", value: -8 },
        { type: "+", value: 3 },
        { type: "risk" },
        { type: "+", value: 3 },
        { type: "skip" },
        { type: "+", value: 2 },
        { type: "scandal" },
        { type: "+", value: 8 },
        { type: "block", value: -10 },
        { type: "+", value: 4 }
    ];

    // Координаты фишек по полю
    const coords = [];

    // Старт → 4 вверх
    for (let i = 0; i < 4; i++) coords.push({ x: 250, y: 400 - i * 80 });

    // 6 вправо
    for (let i = 0; i < 6; i++) coords.push({ x: 250 + (i + 1) * 55, y: 80 });

    // 4 вниз
    for (let i = 0; i < 4; i++) coords.push({ x: 580, y: 80 + (i + 1) * 80 });

    // 6 влево
    for (let i = 0; i < 6; i++) coords.push({ x: 580 - (i + 1) * 55, y: 400 });

    // ---- Получили список игроков ----
    socket.on("gamePlayers", (serverPlayers) => {
        players = serverPlayers;

        tokensBox.innerHTML = "";
        Object.keys(players).forEach(id => {
            hype[id] = 0;
            positions[id] = 0;

            let token = document.createElement("div");
            token.id = "token_" + id;
            token.style.background = players[id].piece;
            tokensBox.appendChild(token);

            updateTokenPosition(id);
        });
    });

    // ---- СИГНАЛ НАЧАЛА ХОДА ----
    socket.on("yourTurn", () => {
        myTurn = true;
        rollBtn.disabled = false;
        rollBtn.style.opacity = 1;
    });

    // ---- БРОСОК КУБИКА ----
    rollBtn.onclick = () => {
        if (!myTurn) return;

        socket.emit("rollDice", roomCode);
        rollBtn.disabled = true;
        rollBtn.style.opacity = 0.5;
    };

    // ---- РЕЗУЛЬТАТ КУБИКА ----
    socket.on("diceResult", ({ player, number }) => {
        diceNumber.innerText = number;
        movePlayer(player, number);
    });

    // ---- ДВИЖЕНИЕ ----
    function movePlayer(id, steps) {
        let stepsDone = 0;

        function moveStep() {
            positions[id] = (positions[id] + 1) % 20;
            updateTokenPosition(id);

            stepsDone++;
            if (stepsDone < steps) {
                setTimeout(moveStep, 300);
            } else {
                applyCellEffect(id);
            }
        }

        moveStep();
    }

    function updateTokenPosition(id) {
        const el = document.getElementById("token_" + id);
        const c = coords[positions[id]];
        el.style.left = c.x + "px";
        el.style.top = c.y + "px";
    }

    // ---- ПРИМЕНЕНИЕ КЛЕТКИ ----
    function applyCellEffect(id) {
        let cell = boardCells[positions[id]];

        if (cell.type === "+") {
            changeHype(id, cell.value);
        }

        if (cell.type === "block") {
            changeHype(id, -10);
        }

        if (cell.type === "minusSkip") {
            changeHype(id, -8);
            socket.emit("skipTurn", { room: roomCode, id });
        }

        if (cell.type === "skip") {
            socket.emit("skipTurn", { room: roomCode, id });
        }

        if (cell.type === "scandal") showScandal(id);

        if (cell.type === "risk") showRisk(id);

        socket.emit("endTurn", roomCode);
    }

    // ---- СКАНДАЛ ----
    function showScandal(id) {

        const cards = [
            { text: "Перегрел аудиторию🔥", v: -1 },
            { text: "Громкий заголовок🫣", v: -2 },
            { text: "Это монтаж 😱", v: -3 },
            { text: "Меня взломали #️⃣ (всем -3)", all: true, v: -3 },
            { text: "Подписчики в шоке 😮", v: -4 },
            { text: "Удаляй пока не поздно🤫", v: -5 },
            { text: "Это контент. Пропусти ход 🙄", v: -5, skip: true }
        ];

        let picked = cards[Math.floor(Math.random() * cards.length)];

        scandalText.innerText = picked.text;

        scandalPopup.classList.remove("hidden");
        scandalPopup.classList.add("scandal-card");

        closeScandal.onclick = () => {
            scandalPopup.classList.add("hidden");

            if (picked.all) {
                Object.keys(hype).forEach(p => changeHype(p, picked.v));
            } else {
                changeHype(id, picked.v);
            }

            if (picked.skip) {
                socket.emit("skipTurn", { room: roomCode, id });
            }
        };
    }

    // ---- РИСК ----
    function showRisk(id) {
        riskPopup.classList.remove("hidden");

        closeRisk.onclick = () => {
            let dice = Math.floor(Math.random() * 6) + 1;

            if (dice <= 3) {
                riskResult.innerText = "1–3 выпало! -5 хайпа";
                changeHype(id, -5);
            } else {
                riskResult.innerText = "4–6 выпало! +5 хайпа";
                changeHype(id, 5);
            }

            setTimeout(() => {
                riskPopup.classList.add("hidden");
                riskResult.innerText = "";
            }, 1500);
        };
    }

    // ---- ИЗМЕНЕНИЕ ХАЙПА ----
    function changeHype(id, amount) {
        hype[id] += amount;
        if (hype[id] < 0) hype[id] = 0;

        if (id === socket.id) {
            hypeFill.style.width = hype[id] + "%";
            hypeFill.classList.remove("hypePlus", "hypeMinus");

            if (amount > 0) hypeFill.classList.add("hypePlus");
            else hypeFill.classList.add("hypeMinus");
        }

        if (hype[id] >= 70) socket.emit("win", { room: roomCode, id });
    }

    // ---- ПОБЕДА ----
    socket.on("gameWin", (playerId) => {
        alert(players[playerId].name + " победил! Набрал 70 хайпа!");
        location.reload();
    });
};

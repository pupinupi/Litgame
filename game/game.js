const Game = {
    socket: null,
    players: [],
    me: null,
    roomId: null,
    turn: 0,

    tokenPositions: [
        {x: 380, y: 730}, // 1
        {x: 380, y: 610}, // 2
        {x: 380, y: 490}, // 3
        {x: 380, y: 370}, // 4
        {x: 500, y: 370}, // 5
        {x: 620, y: 370}, // 6
        {x: 740, y: 370}, // 7
        {x: 860, y: 370}, // 8
        {x: 980, y: 370}, // 9
        {x: 1100, y: 370},// 10
        {x: 1100, y: 490},// 11
        {x: 1100, y: 610},// 12
        {x: 1100, y: 730},// 13
        {x: 980, y: 730}, // 14
        {x: 860, y: 730}, // 15
        {x: 740, y: 730}, // 16
        {x: 620, y: 730}, // 17
        {x: 500, y: 730}, // 18
        {x: 380, y: 730}, // 19
        {x: 260, y: 730}  // 20
    ],

    init(socket, players, roomId) {
        this.socket = socket;
        this.players = players;
        this.roomId = roomId;

        this.me = players.find(x => x.id === socket.id);

        this.createTokens();
        this.bindSocketEvents();

        document.getElementById("rollBtn").onclick = () => {
            socket.emit("rollDice", roomId);
        };
    },

    bindSocketEvents() {
        this.socket.on("diceRolled", ({playerId, roll}) => {
            document.getElementById("diceNumber").innerText = "Выпало: " + roll;
        });

        this.socket.on("updateGame", (players) => {
            this.players = players;
            this.updateTokens();
            this.updateHypeBar();
        });

        this.socket.on("turnChange", (turnIndex) => {
            this.turn = turnIndex;
            const p = this.players[turnIndex];
            document.getElementById("turnName").innerText = p.name;

            // блокировка кнопки
            document.getElementById("rollBtn").disabled = (p.id !== this.socket.id);
        });

        this.socket.on("scandalCard", ({card}) => {
            UI.showScandal(`${card.text} (${card.value})`);
        });

        this.socket.on("riskPopup", () => {
            UI.showRisk();
            document.getElementById("riskRollBtn").onclick = () => {
                let roll = Math.floor(Math.random() * 6) + 1;
                let res = roll <= 3 ? "-5 хайпа" : "+5 хайпа";
                UI.riskResult("Выпало " + roll + " → " + res);
                setTimeout(() => {
                    UI.closeRisk();
                }, 1500);
            };
        });

        this.socket.on("hypeFlash", ({type}) => {
            UI.flashHype(type);
        });
    },

    createTokens() {
        const wrap = document.getElementById("tokens");
        wrap.innerHTML = "";

        this.players.forEach(p => {
            const t = document.createElement("div");
            t.className = "token";
            t.id = "token_" + p.id;
            t.style.background = p.color;
            wrap.appendChild(t);
        });

        this.updateTokens();
    },

    updateTokens() {
        this.players.forEach(p => {
            const t = document.getElementById("token_" + p.id);
            if (!t) return;

            const pos = this.tokenPositions[p.pos - 1];
            t.style.left = pos.x + "px";
            t.style.top = pos.y + "px";
        });
    },

    updateHypeBar() {
        const mePlayer = this.players.find(x => x.id === this.socket.id);
        if (!mePlayer) return;

        let percent = Math.min(100, (mePlayer.hype / 70) * 100);
        document.getElementById("hypeFill").style.width = percent + "%";
        document.getElementById("myHype").innerText = mePlayer.hype;
    }
};

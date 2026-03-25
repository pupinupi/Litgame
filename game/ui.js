window.UI = (function () {

    const scandalPopup = document.getElementById("scandalPopup");
    const riskPopup = document.getElementById("riskPopup");
    const riskResult = document.getElementById("riskResult");
    const rollBtn = document.getElementById("rollBtn");

    return {

        // Закрытие окна скандала
        closeScandal: function () {
            scandalPopup.classList.add("hidden");
        },

        // Показ окна риска
        showRisk: function (callback) {
            riskPopup.classList.remove("hidden");

            const riskRollBtn = document.getElementById("riskRollBtn");
            riskResult.innerText = "";

            const handler = () => {
                const dice = Math.floor(Math.random() * 6) + 1;

                if (dice <= 3) {
                    riskResult.innerText = "1–3 выпало! -5 хайпа";
                    callback(-5);
                } else {
                    riskResult.innerText = "4–6 выпало! +5 хайпа";
                    callback(5);
                }

                setTimeout(() => {
                    riskPopup.classList.add("hidden");
                    riskResult.innerText = "";
                    riskRollBtn.removeEventListener("click", handler);
                }, 1200);
            };

            riskRollBtn.addEventListener("click", handler);
        },

        // Включить кнопку броска кубика
        enableRoll: function () {
            rollBtn.disabled = false;
            rollBtn.style.opacity = 1;
        },

        // Отключить кнопку броска кубика
        disableRoll: function () {
            rollBtn.disabled = true;
            rollBtn.style.opacity = 0.5;
        },

        // Подсветка хайпа при + или -
        hypeFlash: function (el, amount) {
            el.classList.remove("hypePlus", "hypeMinus");
            void el.offsetWidth; // Перезапуск анимации

            if (amount > 0) el.classList.add("hypePlus");
            else el.classList.add("hypeMinus");
        },

        // Показ игрового экрана
        showGameScreen: function () {
            document.getElementById("lobbyScreen").classList.add("hidden");
            document.getElementById("gameScreen").classList.remove("hidden");
        },

        // Показ лобби
        showLobbyScreen: function () {
            document.getElementById("lobbyScreen").classList.remove("hidden");
            document.getElementById("gameScreen").classList.add("hidden");
        }

    };

})();

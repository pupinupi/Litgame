const UI = {
    showScandal(text) {
        const p = document.getElementById("scandalPopup");
        document.getElementById("scandalText").innerText = text;
        p.classList.remove("hidden");
    },

    closeScandal() {
        document.getElementById("scandalPopup").classList.add("hidden");
    },

    showRisk() {
        document.getElementById("riskPopup").classList.remove("hidden");
        document.getElementById("riskResult").innerText = "";
    },

    riskResult(text) {
        document.getElementById("riskResult").innerText = text;
    },

    closeRisk() {
        document.getElementById("riskPopup").classList.add("hidden");
    },

    flashHype(type) {
        const bar = document.getElementById("hypeFill");
        bar.classList.add(type === "plus" ? "flashPlus" : "flashMinus");
        setTimeout(() => bar.classList.remove("flashPlus", "flashMinus"), 500);
    }
};

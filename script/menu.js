const difficulties = ["Easy", "Medium", "Hard", "Huge", "Extreme"]
let currentIndex = 0;
let oldGame = 0; //TODO

const menuScreen = document.getElementById("menu");
const gameScreen = document.getElementById("game-container");
const label = document.getElementById("difficulty-label");
const leftBtn = document.getElementById("left-arrow");
const rightBtn = document.getElementById("right-arrow");
const newGameBtn = document.getElementById("new-game");
const resumeBtn = document.getElementById("resume");


function updateLabel() {
    label.textContent = difficulties[currentIndex];

    leftBtn.hidden = currentIndex === 0;
    rightBtn.hidden = currentIndex === difficulties.length - 1;
}

function updateResumeBtn() {
    resumeBtn.disabled = !oldGame;
}

function getCurrentDifficulty() {
    return difficulties[currentIndex];
}

function initMenu() {
    menuScreen.style.display = "block";
    gameScreen.style.display = "none";
    updateLabel();
    updateResumeBtn();
}


leftBtn.addEventListener("click", () => {
    currentIndex--;
    updateLabel();
});

rightBtn.addEventListener("click", () => {
    currentIndex++;
    updateLabel();
});

newGameBtn.addEventListener("click", () => {
    menuScreen.style.display = "none";
    gameScreen.style.display = "grid";

    // const gameModule = await import('./game.js');
    // gameModule.initGame();
})

resumeBtn.addEventListener("click", () => {
    console.log("Carica partita");
})

initMenu();

/* DEBUG */
// menuScreen.style.display = "none";
// gameScreen.style.display = "grid";
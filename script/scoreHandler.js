const scoreContainer = document.getElementById("score-textbox");

const POINTS_PER_CELL = 100;
const POINTS_PER_BOMB = -500;

let score = 0;

//? dovrei dare punti per le aree di 0?
export function setScore(isBomb) {
    score += isBomb ? POINTS_PER_BOMB : POINTS_PER_CELL;
    scoreContainer.innerHTML = score;
}
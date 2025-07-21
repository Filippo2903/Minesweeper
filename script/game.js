const container = document.getElementById("game-container");
const scoreContainer = document.getElementById("score-textbox");

const BOMB_SPAWN_PROBABILITY = 0.27;

const CELL_SIZE = 40;
const BUFFER = 2;

const POINTS_PER_CELL = 100;
const POINTS_PER_BOMB = 500;

const totalCols = Math.ceil(window.innerWidth / CELL_SIZE) + BUFFER * 2;
const totalRows = Math.ceil(window.innerHeight / CELL_SIZE) + BUFFER * 2;

const bombMap = new Map();
const checkedCells = new Set();
const flaggedCells = new Set();
const checkedZero = new Set();

/** @type {HTMLDivElement[][]} */
const cells = [];

let offsetX = 0;
let offsetY = 0;

let firstClick = true;

let score = 0;

// TODO: DA RIVEDERE PER SCROLL A METÀ CASELLA
// const baseCol = Math.floor(offsetX / CELL_SIZE);
// const baseRow = Math.floor(offsetY / CELL_SIZE);

function getKey(x, y) {
    return `${x},${y}`;
}

function toGlobal(x, y) {
    return [x + offsetX, y + offsetY];
}

function getGlobalKey(x, y) {
    return getKey(...toGlobal(x, y));
}

function allGrid(f) {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            f(x, y);
        }
    }
}

function setScore() {
    scoreContainer.innerHTML = score;
}

//? limited per ora inutile
function surroundings(x, y, f, limited = false) {
    const startY = limited ? Math.max(0, y - 1) : y - 1;
    const endY = limited ? Math.min(y + 1, totalRows - 1) : y + 1;
    const startX = limited ? Math.max(0, x - 1) : x - 1;
    const endX = limited ? Math.min(x + 1, totalCols - 1) : x + 1;

    for (let j = startY; j <= endY; j++) {
        for (let i = startX; i <= endX; i++) {
            f(i, j);
        }
    }
}

function initCell(x, y) {
    const cell = document.createElement("div");
    cell.className = "cell";

    cell.style.left = `${(x - 1) * CELL_SIZE}px`;
    cell.style.top = `${(y - 1) * CELL_SIZE}px`;

    cell.onclick = () => {
        if (firstClick) {
            clearZone(x, y);
            showCell(x, y);
            firstClick = false;
            return;
        }

        const key = getGlobalKey(x, y);

        if (!checkedCells.has(key))
            toggleFlag(x, y);

        else if (!bombMap.get(key))
            completeSurroundings(x, y);
    };

    cell.oncontextmenu = (e) => {
        e.preventDefault();
        const key = getGlobalKey(x, y);
        if (!checkedCells.has(key) && !flaggedCells.has(key)) {
            showCell(x, y);
        }
    };

    container.appendChild(cell);

    (cells[y] ??= []).push(cell);
}

function maybeGenerateBomb(x, y) {
    bombMap.set(getGlobalKey(x, y), Math.random() < BOMB_SPAWN_PROBABILITY);
}

function bombCount(x, y) {
    let count = 0;
    surroundings(x, y, (i, j) => {
        const key = getGlobalKey(i, j);
        if (!bombMap.has(key)) maybeGenerateBomb(i, j);
        if (bombMap.get(key)) {
            count++;
        }
    });

    return count;
}

function writeFlag(x, y) {
    const cell = cells[y][x];

    cell.style.background = "var(--text-color)";

    const img = document.createElement("img");
    img.src = "assets/icon-flag.svg";
    img.width = 35;
    img.height = 35;
    cell.appendChild(img);
}

function toggleFlag(x, y) {
    const key = getGlobalKey(x, y);

    if (flaggedCells.has(key)) {
        eraseCell(x, y);
        flaggedCells.delete(key);
        return;
    }

    flaggedCells.add(key);
    writeFlag(x, y);
}

function revealConnectedZeros(x, y) {
    const queue = [[x, y]];
    const MAX_ITERATIONS = 100000;
    let iterations = 0;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        const [queueX, queueY] = queue.shift();

        const key = getGlobalKey(queueX, queueY);
        if (checkedCells.has(key)) continue;

        checkedCells.add(key);

        const count = bombCount(queueX, queueY);
        iterations++;

        if (count === 0) {
            surroundings(queueX, queueY, (i, j) => {
                const neighborKey = getGlobalKey(i, j);
                if (!checkedCells.has(neighborKey)) {
                    queue.push([i, j]);
                }
            });
        }
    }
}

function showCell(x, y) {
    if (bombMap.get(getGlobalKey(x, y))) {
        score -= POINTS_PER_BOMB;
    } else {
        score += POINTS_PER_CELL;
    }
    setScore();
    
    const count = bombCount(x, y);
    if (count === 0) {
        revealConnectedZeros(x, y);
        renderFrame();
        return;
    }

    const key = getGlobalKey(x, y);
    if (!checkedCells.has(key)) checkedCells.add(key);

    printCell(x, y);
}

// TODO: Capire perchè viene chiamata migliaia di volte al click
function printCell(x, y, count = 0) {
    // console.log("print");
    const key = getGlobalKey(x, y);

    const cell = cells[y][x];

    cell.style.background = "var(--border-color)";
    cell.style.cursor = "default";

    if (bombMap.get(key)) {
        const img = document.createElement("img");
        img.src = "assets/icon-explosion.svg";
        img.width = 35;
        img.height = 35;
        cell.appendChild(img);
        return;
    }

    // if (!checkedCells.has(key)) checkedCells.add(key);
    cell.textContent = bombCount(x, y) || "";
}

function clearZone(x, y) {
    surroundings(...toGlobal(x, y), (i, j) => {
        let key = getKey(i, j);
        if (bombMap.get(key)) bombMap.set(key, false);
    });
}

function completeSurroundings(x, y) {
    let hiddenCellCount = 0;
    let discoveredBombsCount = 0;
    surroundings(x, y, (i, j) => {
        const neighborKey = getGlobalKey(i, j);
        if (!checkedCells.has(neighborKey) && !flaggedCells.has(neighborKey)) {
            hiddenCellCount++;
        }
        if (flaggedCells.has(neighborKey) || (bombMap.get(neighborKey) && checkedCells.has(neighborKey))) {
            discoveredBombsCount++;
        }
    });

    const numBombs = Number(cells[y][x].innerHTML);

    if (discoveredBombsCount >= numBombs) {
        let discoveredCellsCount = 0;
        surroundings(x, y, (i, j) => {
            const neighborKey = getGlobalKey(i, j)

            if (!checkedCells.has(neighborKey) && !flaggedCells.has(neighborKey)) {
                checkedCells.add(neighborKey);
                discoveredCellsCount++;
            }
        });

        renderFrame();

        score += discoveredCellsCount * POINTS_PER_CELL;
        setScore();
    } else if (hiddenCellCount === numBombs - discoveredBombsCount) {
        surroundings(x, y, (i, j) => {
            const key = getGlobalKey(i, j);
            if (!checkedCells.has(key) && !flaggedCells.has(key))
                toggleFlag(i, j);
        });

        renderFrame();
    }
}

function eraseCell(x, y) {
    const cell = cells[y][x];
    cell.innerHTML = "";
    cell.style.background = "var(--accent-color)";
}

function renderCell(x, y) {
    const key = getGlobalKey(x, y);

    if (!bombMap.has(key)) maybeGenerateBomb(x, y);

    if (checkedCells.has(key)) {
        printCell(x, y);
    } else if (flaggedCells.has(key)) {
        writeFlag(x, y);
    }
}

function renderFrame() {
    allGrid(eraseCell);
    //// allGrid(debug);
    requestAnimationFrame(() => allGrid(renderCell));
}

/* DEBUG 
function debug(x, y) {
    const cell = cells[y][x];
    const key = getGlobalKey(x, y);

    cell.style.fontSize = "10px";
    cell.textContent = key;
    // if (bombMap.get(key)) {
    //     cell.textContent = "b";
    //     return;
    // }

    // count = bombCount(...toGlobal(x, y));

    // if (count === 0) {
    //     cell.textContent = "0";
    // }
} */

allGrid(initCell);
allGrid(renderCell);


function move(dx, dy) {
    const erasing = 0.04;

    if (Math.round(dx * erasing) === 0 && Math.round(dy * erasing) === 0) return;

    offsetX += Math.round(dx * erasing);
    offsetY += Math.round(dy * erasing);

    renderFrame();
}

window.addEventListener("keydown", (e) => {
    const step = 25;
    if (e.key === "ArrowRight") move(step, 0);
    if (e.key === "ArrowLeft") move(-step, 0);
    if (e.key === "ArrowUp") move(0, -step);
    if (e.key === "ArrowDown") move(0, step);
}, { passive: false });

let isDragging = false;
let lastX, lastY;

const onStart = (x, y) => {
    isDragging = true;
    lastX = x;
    lastY = y;
};

const onMove = (x, y) => {
    if (!isDragging) return;
    move(lastX - x, lastY - y);
    lastX = x;
    lastY = y;
};

container.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
container.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
container.addEventListener("mouseup", () => (isDragging = false));

container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

container.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
}, { passive: false });

container.addEventListener("touchend", () => (isDragging = false));

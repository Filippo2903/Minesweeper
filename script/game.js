const bombSpawnProbability = 0.27;

const container = document.getElementById("game-container");
const cellSize = 40;
const buffer = 2;

const totalCols = Math.ceil(window.innerWidth / cellSize) + buffer * 2;
const totalRows = Math.ceil(window.innerHeight / cellSize) + buffer * 2;

const bombMap = new Map();
const checkedMap = new Map();
const flagMap = new Map();

const cells = []; //[][]

let offsetX = 0;
let offsetY = 0;

let firstClick = true;

// DA RIVEDERE PER SCROLL A METÀ CASELLA
// const baseCol = Math.floor(offsetX / cellSize);
// const baseRow = Math.floor(offsetY / cellSize);

function getKey(x, y) {
    return `${x},${y}`;
}

function checkSurroundings(x, y, f, limited = false) {
    const startY = limited ? Math.max(0, y - 1) : y - 1;
    const endY = limited ? Math.min(y + 1, totalRows - 1) : y + 1;
    const startX = limited ? Math.max(0, x - 1) : x - 1;
    const endX = limited ? Math.min(x + 1, totalCols - 1) : x + 1;

    for (let j = startY; j <= endY; j++) {
        for (let i = startX; i <= endX; i++) {
            f(cells[j][i], i, j);
        }
    }
}

function toggleFlag(cell, x, y) {
    const key = getKey(x + offsetX, y + offsetY);

    if (flagMap.has(key)) {
        flagMap.delete(key);
        eraseCell(cell);
        return;
    }

    writeFlag(cell, x, y);
}

function revealCell(cell, x, y) {
    const key = getKey(x + offsetX, y + offsetY);

    if (checkedMap.has(key) || flagMap.has(key)) return;

    checkedMap.set(key, true);

    if (firstClick) {
        checkSurroundings(x + offsetX, y + offsetY, (_, i, j) => {
            let key = getKey(i, j);
            if (bombMap.get(key)) bombMap.set(key, false);
        }, limited = true);


        firstClick = false;
    }

    writeCell(cell, x, y);
}

function initCell(x, y) {
    const cell = document.createElement("div");
    cell.className = "cell";

    cell.onclick = () => {
        toggleFlag(cell, x, y);
    };

    cell.oncontextmenu = (e) => {
        e.preventDefault();
        revealCell(cell, x, y);
    };

    container.appendChild(cell);

    if (!cells[y]) cells[y] = [];
    cells[y].push(cell);
}

function maybeGenerateBomb(x, y) {
    if (!bombMap.has(getKey(x, y))) {
        bombMap.set(getKey(x, y), Math.random() < bombSpawnProbability);
    }
}

function bombCount(x, y) {
    let count = 0;
    checkSurroundings(x, y, (_, i, j) => {
        if (bombMap.get(getKey(i, j))) {
            count++;
        }
    });

    return count;
}

/*
function debug(cell, x, y) {
    const key = getKey(x + offsetX, y + offsetY);

    if (bombMap.get(key)) {
        cell.textContent = "b";
        return;
    }

    count = bombCount(x + offsetX, y + offsetY);

    if (count === 0) {
        cell.textContent = "0";
    }
} */

function writeFlag(cell, x, y) {
    const key = getKey(x + offsetX, y + offsetY);

    if (checkedMap.has(key)) return;

    flagMap.set(key, true);

    cell.style.background = "var(--text-color)";

    const img = document.createElement("img");
    img.src = "assets/icon-flag.svg";
    img.width = 35;
    img.height = 35;
    cell.appendChild(img);
}

function writeCell(cell, x, y) {
    eraseCell(cell);

    const key = getKey(x + offsetX, y + offsetY);

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

    const count = bombCount(x + offsetX, y + offsetY);

    if (count === 0) {
        checkSurroundings(x, y, (cell, i, j) => {
            const key = getKey(i + offsetX, j + offsetY);
            if (!checkedMap.has(key)) { // && !bombMap.get(getKey(i + offsetX, j + offsetY))) {
                checkedMap.set(key, true);
                writeCell(cell, i, j);
            }
        }, limited = true);
        return;
    }

    cell.textContent = count;
}

function eraseCell(cell) {
    cell.innerHTML = "";
    cell.textContent = "";
    cell.style.background = "var(--accent-color)";
}

function renderCell(x, y) {
    const cell = cells[y][x];
    cell.style.left = `${(x - 1) * cellSize}px`;
    cell.style.top = `${(y - 1) * cellSize}px`;

    maybeGenerateBomb(x + offsetX, y + offsetY);

    const key = getKey(x + offsetX, y + offsetY);

    if (checkedMap.has(key)) {
        writeCell(cell, x, y);
    }

    if (flagMap.has(key)) {
        writeFlag(cell, x, y);
    }
}

function allGrid(f) {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            f(x, y);
        }
    }
}

function allCells(f) {
    cells.forEach(cellsRow => {
        cellsRow.forEach(cell => f(cell));
    });
}

function renderFrame() {
    allCells(eraseCell);
    allGrid(renderCell);
}

allGrid(initCell);
allGrid(renderCell);


function move(dx, dy) {
    const erasing = 0.04;

    // if (Math.round(dx * erasing) === 0 && Math.round(dy * erasing) === 0) return;

    offsetX += Math.round(dx * erasing);
    offsetY += Math.round(dy * erasing);

    requestAnimationFrame(renderFrame);
}

container.addEventListener("keydown", (e) => {
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

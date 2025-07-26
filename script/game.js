const container = document.getElementById("game-container");
const scoreContainer = document.getElementById("score-textbox");

const BOMB_SPAWN_PROBABILITY = 0.27;

/** @type {HTMLDivElement[][]} */
let cells = [];

let CELL_SIZE = 40;
const BUFFER = 1;
const BUFFER_FOR_DEBUG = 0;


const style = window.getComputedStyle(scoreContainer.parentElement);
let totalCols = Math.ceil(window.innerWidth / CELL_SIZE) + BUFFER;
let totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / CELL_SIZE) + BUFFER;
/* DEBUG */
// let totalCols = Math.ceil(1200 / CELL_SIZE) + BUFFER;
// let totalRows = Math.ceil(840 / CELL_SIZE) + BUFFER;

let offsetX = 0;
let offsetY = 0;

const POINTS_PER_CELL = 100;
const POINTS_PER_BOMB = -500;

let score = 0;

const bombMap = new Map();
const checkedCells = new Set();
const flaggedCells = new Set();
const checkedZero = new Set();

let firstClick = true;

let isDragging = false;
let lastX, lastY;

let scale = 1, currentScale;
let pinchStartDistance = null, pinchStartZoom;

function getKey(x, y) {
    return `${x},${y}`;
}

function toGlobal(x, y) {
    return [Math.floor((x + offsetX)), Math.floor((y + offsetY))];
}

function getGlobalKey(x, y) {
    return getKey(...toGlobal(x, y));
}

function allGrid(f, onlyPrinted = false) {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            if (onlyPrinted) {
                const key = getGlobalKey(x, y);
                if (!checkedCells.has(key) && !flaggedCells.has(key)) {
                    continue;
                }
            }

            f(x, y);
        }
    }
}

//? dovrei dare punti per le aree di 0?
function setScore(points) {
    score += points;
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
    if (cells[y] && cells[y][x] !== undefined) return;

    const cell = document.createElement("div");
    cell.className = "cell";

    cell.style.left = `${(x + BUFFER_FOR_DEBUG) * CELL_SIZE}px`;
    cell.style.top = `${(y + BUFFER_FOR_DEBUG) * CELL_SIZE}px`;

    cell.style.width = `${CELL_SIZE}px`;
    cell.style.height = `${CELL_SIZE}px`;
    cell.style.fontSize = `${CELL_SIZE * 0.6}px`;

    if (!bombMap.has(getGlobalKey(x, y))) maybeGenerateBomb(x, y);

    const key = getGlobalKey(x, y);
    cell.onclick = () => {
        if (isDragging) return;
        if (firstClick) {
            clearZone(x, y);
            showCell(x, y);
            firstClick = false;
            return;
        }

        if (!checkedCells.has(key))
            toggleFlag(x, y);

        else if (!bombMap.get(key))
            completeSurroundings(x, y);
    };

    cell.oncontextmenu = (e) => {
        e.preventDefault();
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
        printCell(queueX, queueY);

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
    setScore(bombMap.get(getGlobalKey(x, y)) ? POINTS_PER_BOMB : POINTS_PER_CELL);

    const count = bombCount(x, y);
    if (count === 0) {
        revealConnectedZeros(x, y);
        return;
    }

    const key = getGlobalKey(x, y);
    if (!checkedCells.has(key)) checkedCells.add(key);

    printCell(x, y);
}

function printCell(x, y) {
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
                showCell(i, j);
                discoveredCellsCount++;
            }
        });
    } else if (hiddenCellCount === numBombs - discoveredBombsCount) {
        surroundings(x, y, (i, j) => {
            const key = getGlobalKey(i, j);
            if (!checkedCells.has(key) && !flaggedCells.has(key))
                toggleFlag(i, j);
        });
    }
}

function eraseCell(x, y) {
    const cell = cells[y][x];
    cell.innerHTML = "";
    cell.style.background = "var(--accent-color)";
}

function updateCellPosition(x, y) {
    const cell = cells[y][x];
    const fractionalOffsetX = (offsetX % 1 + 1) % 1;
    const fractionalOffsetY = (offsetY % 1 + 1) % 1;
    cell.style.left = `${(x - fractionalOffsetX) * CELL_SIZE + BUFFER_FOR_DEBUG * 40}px`;
    cell.style.top = `${(y - fractionalOffsetY) * CELL_SIZE + BUFFER_FOR_DEBUG * 40}px`;
}

function updateGridDimension() {
    const oldTotalCols = totalCols;
    const oldTotalRows = totalRows;

    /* DEBUG */
    // totalCols = Math.ceil(1200 / CELL_SIZE) + BUFFER;
    // totalRows = Math.ceil(840 / CELL_SIZE) + BUFFER;
    totalCols = Math.ceil(window.innerWidth / CELL_SIZE) + BUFFER;
    totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / CELL_SIZE) + BUFFER;

    if (oldTotalCols === totalCols && oldTotalRows === totalRows) return;

    if (oldTotalCols < totalCols || oldTotalRows < totalRows) {
        for (let j = 0; j < oldTotalRows; j++) {
            for (let i = oldTotalCols; i < totalCols; i++) {
                initCell(i, j);
            }
        }

        for (let j = oldTotalRows; j < totalRows; j++) {
            for (let i = 0; i < totalCols; i++) {
                initCell(i, j);
            }
        }
    } else if (oldTotalCols > totalCols || oldTotalRows > totalRows) {
        for (let j = 0; j < totalRows; j++) {
            for (let i = totalCols; i < oldTotalCols; i++) {
                cells[j][i].remove();
            }
        }

        for (let j = totalRows; j < oldTotalRows; j++) {
            for (let i = 0; i < oldTotalCols; i++) {
                cells[j][i].remove();
            }
        }

        cells = cells.slice(0, totalRows).map(row => row.slice(0, totalCols));
    }

    allGrid((x, y) => {
        const cell = cells[y][x];
        cell.style.width = `${CELL_SIZE}px`;
        cell.style.height = `${CELL_SIZE}px`;
        cell.style.fontSize = `${CELL_SIZE * 0.6}px`;

        updateCellPosition(x, y);
    });
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

/* DEBUG */
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
}

function move(dx, dy) {
    allGrid(eraseCell, true);

    offsetX += dx / CELL_SIZE;
    offsetY += dy / CELL_SIZE;

    allGrid(updateCellPosition);
    requestAnimationFrame(() => allGrid(renderCell));
}

window.addEventListener("keydown", (e) => {
    const step = CELL_SIZE;
    if (e.key === "ArrowRight") move(step, 0);
    if (e.key === "ArrowLeft") move(-step, 0);
    if (e.key === "ArrowUp") move(0, step);
    if (e.key === "ArrowDown") move(0, -step);
}, { passive: false });

function onStartDrag(x, y) {
    isDragging = true;
    lastX = x;
    lastY = y;
}

function onMoveDrag(x, y) {
    if (!isDragging) return;
    move(lastX - x, lastY - y);
    lastX = x;
    lastY = y;
}

const getDistance = (x, y) => Math.sqrt(Math.pow(x.clientX - y.clientX, 2) + Math.pow(x.clientY - y.clientY, 2));

let clientX = 0, clientY = 0;

container.addEventListener("mousedown", (e) => onStartDrag(e.clientX, e.clientY));
container.addEventListener("mousemove", (e) => onMoveDrag(clientX = e.clientX, clientY = e.clientY));
container.addEventListener("mouseup", () => (isDragging = false));

/* DEBUG */
container.addEventListener("wheel", (e) => {
    allGrid(eraseCell, true);

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const startX = mouseX / CELL_SIZE + offsetX;
    const startY = mouseY / CELL_SIZE + offsetY;

    if (e.deltaY > 0) {
        scale = Math.min(scale * 1.1, 2);
    } else if (e.deltaY < 0) {
        scale = Math.max(scale * 0.9, 0.5);
    }
    
    //! Capisci se fare così (brutto) o mettendo max/min alla cella (non so se comporta problemi poi con offset e varie, anche se al momento lo uso solo qua)
    CELL_SIZE = Math.max(20, Math.min(80, CELL_SIZE * scale));

    const endX = mouseX / CELL_SIZE;
    const endY = mouseY / CELL_SIZE;

    offsetX = startX - endX;
    offsetY = startY - endY;

    updateGridDimension();
    allGrid(renderCell);
}, { passive: false });

/* DEBUG */
window.addEventListener("keydown", (e) => {
    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const startX = mouseX / CELL_SIZE + offsetX;
    const startY = mouseY / CELL_SIZE + offsetY;

    if (e.key == "d") {
        CELL_SIZE = 60;
    } else if (e.key == "a") {
        CELL_SIZE = 20;
    } else if (e.key == "s") {
        CELL_SIZE = 40;
    } else return;

    allGrid(eraseCell, true);

    const endX = mouseX / CELL_SIZE;
    const endY = mouseY / CELL_SIZE;

    offsetX = startX - endX;
    offsetY = startY - endY;

    updateGridDimension(CELL_SIZE);
    allGrid(renderCell);
}, { passive: false });

container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) onStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) {
        pinchStartDistance = getDistance(e.touches[0], e.touches[1]);

    }
}, { passive: false });

container.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) onMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2 && pinchStartDistance !== null) {
        allGrid(eraseCell, true);

        const rect = container.getBoundingClientRect();
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const startX = centerX / CELL_SIZE + offsetX;
        const startY = centerY / CELL_SIZE + offsetY;

        scale = getDistance(e.touches[0], e.touches[1]) / pinchStartDistance;
        CELL_SIZE = Math.max(10, Math.min(60, CELL_SIZE * scale));

        const endX = centerX / CELL_SIZE;
        const endY = centerY / CELL_SIZE;

        offsetX = startX - endX;
        offsetY = startY - endY;

        updateGridDimension(CELL_SIZE);
        allGrid(renderCell);
    }
}, { passive: false });

container.addEventListener("touchend", (e) => {
    isDragging = false;
    if (e.touches.length < 2) {
        pinchStartDistance = null;
        scale = currentScale;
    }
});

allGrid(initCell);

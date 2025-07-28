const container = document.getElementById("game-container");
const scoreContainer = document.getElementById("score-textbox");
const style = window.getComputedStyle(scoreContainer.parentElement);

const BOMB_SPAWN_PROBABILITY = 0.27;

const CELL_SIZE = 40;

const BUFFER = 1;

const POINTS_PER_CELL = 100;
const POINTS_PER_BOMB = -1000;

let score = 0;

let isDragging = false;
let lastX, lastY;

let scale = 1;
let pinchStartDistance = null;
let pinchStartZoom;

let actualCellSize = CELL_SIZE * scale;

let totalCols = Math.ceil(window.innerWidth / actualCellSize) + BUFFER;
let totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / actualCellSize) + BUFFER;

let offsetX = 0;
let offsetY = 0;

/** @type {HTMLDivElement[][]} */
let cells = [];

const bombMap = new Map();
const checkedCells = new Set();
const flaggedCells = new Set();
const checkedZero = new Set();

let firstClick = true;


//TODO: UX "gameover", esplosione,...
//? Zoom ha degli scatti, problemi all'offset probabilmente
//? Dezoom ricomincia da 0 (pure zoom in)
//? Bordi celle glitchati nello zoom

function getKey(x, y) {
    return `${x},${y}`;
}

function toGlobal(x, y) {
    return [Math.floor((x + offsetX)), Math.floor((y + offsetY))];
}

function getGlobalKey(x, y) {
    return getKey(...toGlobal(x, y));
}

function surroundings(x, y, f) {
    for (let j = y - 1; j <= y + 1; j++) {
        for (let i = x - 1; i <= x + 1; i++) {
            f(i, j);
        }
    }
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

function clearZone(x, y) {
    surroundings(x, y, (i, j) => {
        const key = getGlobalKey(i, j);
        bombMap.set(key, false);
    });
}

function initCell(x, y) {
    if (cells[y]?.[x] !== undefined) return;

    const cell = document.createElement("div");
    cell.className = "cell";

    cell.style.left = `${x * actualCellSize}px`;
    cell.style.top = `${y * actualCellSize}px`;

    cell.style.width = `${actualCellSize}px`;
    cell.style.height = `${actualCellSize}px`;
    cell.style.fontSize = `${actualCellSize * 0.6}px`;

    cell.onclick = () => {
        if (isDragging) return;
        if (firstClick) {
            clearZone(x, y);
            revealCell(x, y);
            firstClick = false;
            return;
        }

        const key = getGlobalKey(x, y);
        if (!checkedCells.has(key)) {
            toggleFlag(x, y);
        } else if (!bombMap.get(key)) {
            completeSurroundings(x, y);
        }
    };

    cell.oncontextmenu = (e) => {
        e.preventDefault();
        const key = getGlobalKey(x, y);
        if (!checkedCells.has(key) && !flaggedCells.has(key)) {
            revealCell(x, y);
        }
    };

    container.appendChild(cell);

    (cells[y] ??= []).push(cell);

    renderCell(x, y);
}

function eraseCell(x, y) {
    const cell = cells[y][x];
    cell.innerHTML = "";
    cell.style.background = "var(--accent-color)";
}

function printCell(x, y) {
    const key = getGlobalKey(x, y);

    const cell = cells[y][x];

    cell.style.cursor = "default";
    
    if (bombMap.get(key)) {
        cell.style.background = "red";
        const img = document.createElement("img");
        img.src = "assets/icon-explosion.svg";
        img.width = actualCellSize * 0.9;
        img.height = actualCellSize * 0.9;
        img.style.pointerEvents = "none";
        if (cell.firstChild) {
            cell.replaceChild(img, cell.firstChild);
        } else {
            cell.appendChild(img);
        }
        return;
    }

    cell.style.background = "var(--border-color)";
    cell.textContent = bombCount(x, y) || "";
}

function revealCell(x, y) {
    const key = getGlobalKey(x, y);

    setScore(bombMap.get(key) ? POINTS_PER_BOMB : POINTS_PER_CELL);

    const count = bombCount(x, y);
    if (count === 0) {
        revealConnectedZeros(x, y);
        return;
    }

    if (!checkedCells.has(key)) checkedCells.add(key);
    if (cells[y]?.[x] !== undefined) printCell(x, y);
}

function writeFlag(x, y) {
    const cell = cells[y][x];

    cell.style.background = "var(--text-color)";

    const img = document.createElement("img");
    img.src = "assets/icon-flag.svg";
    img.width = actualCellSize * 0.9;
    img.height = actualCellSize * 0.9;
    img.style.pointerEvents = "none";
    if (cell.firstChild) {
        cell.replaceChild(img, cell.firstChild);
    } else {
        cell.appendChild(img);
    }
}

function toggleFlag(x, y) {
    const key = getGlobalKey(x, y);

    if (flaggedCells.has(key)) {
        eraseCell(x, y);
        flaggedCells.delete(key);
        return;
    }

    flaggedCells.add(key);
    if (cells[y]?.[x] !== undefined) writeFlag(x, y);
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
        if (cells[queueY]?.[queueX] !== undefined) printCell(queueX, queueY);

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
                revealCell(i, j);
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

function renderCell(x, y) {
    const key = getGlobalKey(x, y);

    if (!bombMap.has(key)) maybeGenerateBomb(x, y);

    if (checkedCells.has(key)) {
        printCell(x, y);
    } else if (flaggedCells.has(key)) {
        writeFlag(x, y);
    }
}

function updateCellPosition(x, y) {
    const cell = cells[y][x];
    const fractionalOffsetX = (offsetX % 1 + 1) % 1;
    const fractionalOffsetY = (offsetY % 1 + 1) % 1;
    cell.style.left = `${(x - fractionalOffsetX) * actualCellSize}px`;
    cell.style.top = `${(y - fractionalOffsetY) * actualCellSize}px`;
}

function updateGridDimension(newCellSize) {
    const oldTotalCols = totalCols;
    const oldTotalRows = totalRows;

    totalCols = Math.ceil(window.innerWidth / newCellSize) + BUFFER;
    totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / newCellSize) + BUFFER;

    if (oldTotalCols === totalCols && oldTotalRows === totalRows) {
        allGrid(updateCellPosition);
        return;
    }

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
        cell.style.width = `${newCellSize}px`;
        cell.style.height = `${newCellSize}px`;
        cell.style.fontSize = `${newCellSize * 0.6}px`;

        updateCellPosition(x, y);
    });
}

//? dovrei dare punti per le aree di 0?
function setScore(points) {
    score += points;
    scoreContainer.innerHTML = score;
}

function move(dx, dy) {
    allGrid(eraseCell, true);

    offsetX += dx / actualCellSize;
    offsetY += dy / actualCellSize;

    allGrid(updateCellPosition);
    requestAnimationFrame(() => allGrid(renderCell));
}

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


/* MOUSE HANDLER */
// Non necessario se si vuole fare completamente mobile
container.addEventListener("mousedown", (e) => onStartDrag(e.clientX, e.clientY));
container.addEventListener("mousemove", (e) => onMoveDrag(e.clientX, e.clientY));
container.addEventListener("mouseup", () => (isDragging = false));

container.addEventListener("wheel", (e) => {
    allGrid(eraseCell, true);

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const startX = mouseX / actualCellSize + offsetX;
    const startY = mouseY / actualCellSize + offsetY;

    if (e.deltaY > 0) {
        scale = Math.min(scale * 1.1, 2);
    } else if (e.deltaY < 0) {
        scale = Math.max(scale * 0.9, 0.5);
    }

    actualCellSize = CELL_SIZE * scale;

    const endX = mouseX / actualCellSize;
    const endY = mouseY / actualCellSize;

    offsetX = startX - endX;
    offsetY = startY - endY;

    updateGridDimension(actualCellSize);
    allGrid(renderCell);
}, { passive: false });
/* MOUSE HANDLER */

//TODO: debounce??
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

        const startX = centerX / actualCellSize + offsetX;
        const startY = centerY / actualCellSize + offsetY;

        scale = Math.min(Math.max(scale * (getDistance(e.touches[0], e.touches[1]) / pinchStartDistance), 0.5), 2);

        actualCellSize = CELL_SIZE * scale;

        const endX = centerX / actualCellSize;
        const endY = centerY / actualCellSize;

        offsetX = startX - endX;
        offsetY = startY - endY;

        updateGridDimension(actualCellSize);
        allGrid(renderCell);
    }
}, { passive: false });

container.addEventListener("touchend", (e) => {
    isDragging = false;
    if (e.touches.length < 2) {
        pinchStartDistance = null;
    }
});


allGrid(initCell);

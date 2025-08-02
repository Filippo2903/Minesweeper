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
let prevX, prevY;
let lastX, lastY;
let velocityX = 0, velocityY = 0;
let momentumRafID = null;
let prevTime;

let scale = 1;
let pinchStartDistance = null;
let pinchStartZoom;

let actualCellSize = CELL_SIZE * scale;

let totalCols = Math.ceil(window.innerWidth / actualCellSize) + BUFFER;
let totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / actualCellSize) + BUFFER;

let offsetX = 0, offsetY = 0;

/** @type {HTMLDivElement[][]} */
let cells = [];

const bombMap = new Map();
const checkedCells = new Set();
const flaggedCells = new Set();
const checkedZero = new Set();

let firstClick = true;


//TODO: UX "gameover", esplosione,...

function isInGrid(x, y) {
    return cells[y]?.[x] !== undefined;
}

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

function allGrid(f) {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
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

function handleExplosion(x, y) {
    const oldCellSize = actualCellSize;
    actualCellSize = window.innerWidth / 4;

    zoom(x * oldCellSize, y * oldCellSize, oldCellSize, actualCellSize);
    // allGrid(eraseCell, true);
    offsetX = x - (totalCols - BUFFER) / 2;
    offsetY = y - (totalRows - BUFFER) / 2;
    allGrid(renderCell);
}

function clearZone(x, y) {
    surroundings(x, y, (i, j) => {
        const key = getGlobalKey(i, j);
        bombMap.set(key, false);
    });
}

function initCell(x, y) {
    if (isInGrid(x, y)) return;

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
}

function eraseCell(x, y) {
    const cell = cells[y][x];
    cell.innerHTML = "";
    cell.style.background = "var(--accent-color)";
}

function addImage(cell, imagePath) {
    const img = document.createElement("img");
    img.src = imagePath;
    img.width = actualCellSize * 0.9;
    img.height = actualCellSize * 0.9;
    img.style.pointerEvents = "none";

    if (cell.firstChild) {
        cell.replaceChild(img, cell.firstChild);
    } else {
        cell.appendChild(img);
    }
}

function printBomb(x, y) {
    const cell = cells[y][x];

    cell.style.background = "red";
    addImage(cell, "assets/icon-explosion.svg");
}

function printFlag(x, y) {
    const cell = cells[y][x];

    cell.style.background = "var(--text-color)";
    addImage(cell, "assets/icon-flag.svg")
}

function printCell(x, y) {
    const cell = cells[y][x];
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
    if (isInGrid(x, y)) {
        if (bombMap.get(key)) {
            printBomb(x, y);
            //TODO: handleExplosion(x, y);
        } else {
            printCell(x, y);
        }
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
    if (isInGrid(x, y)) printFlag(x, y);
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
        if (isInGrid(queueX, queueY)) printCell(queueX, queueY);

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
        if (bombMap.get(key)) {
            printBomb(x, y);
        } else {
            printCell(x, y);
        }
    } else if (flaggedCells.has(key)) {
        printFlag(x, y);
    }
}

function updateCellPosition(x, y) {
    const cell = cells[y][x];
    const fractionalOffsetX = (offsetX % 1 + 1) % 1;
    const fractionalOffsetY = (offsetY % 1 + 1) % 1;
    cell.style.left = `${(x - fractionalOffsetX) * actualCellSize}px`;
    cell.style.top = `${(y - fractionalOffsetY) * actualCellSize}px`;
}

function updateCellDimension(x, y) {
    const cell = cells[y][x];
    cell.style.width = `${actualCellSize}px`;
    cell.style.height = `${actualCellSize}px`;
    cell.style.fontSize = `${actualCellSize * 0.6}px`;
}

function updateGridDimension(oldTotalCols, oldTotalRows) {
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
    }
    
    if (oldTotalCols > totalCols || oldTotalRows > totalRows) {
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

}

//? dovrei dare punti per le aree di 0?
function setScore(points) {
    score += points;
    scoreContainer.innerHTML = score;
}

function panning(dx, dy) {
    const prePanOffsetX = Math.floor(offsetX);
    const prePanOffsetY = Math.floor(offsetY);

    offsetX += dx / actualCellSize;
    offsetY += dy / actualCellSize;

    allGrid(updateCellPosition);

    let deltaX = Math.floor(offsetX - prePanOffsetX);
    let deltaY = Math.floor(offsetY - prePanOffsetY);

    if (deltaX !== 0 || deltaY !== 0) {
        for (let j = -Math.abs(deltaY); j <= totalRows + Math.abs(deltaY) + 1; j++) {
            for (let i = -Math.abs(deltaX); i <= totalCols + Math.abs(deltaX) + 1; i++) {
                const key = getGlobalKey(i, j);
                if (checkedCells.has(key) || flaggedCells.has(key)) {
                    if (isInGrid(i, j)) {
                        renderCell(i, j);
                    }

                    deltaX = Math.floor(offsetX - prePanOffsetX);
                    deltaY = Math.floor(offsetY - prePanOffsetY);
                    const eraseKey = getGlobalKey(i + deltaX, j + deltaY);
                    if (!checkedCells.has(eraseKey) && !flaggedCells.has(eraseKey)) {
                        if (isInGrid(i + deltaX, j + deltaY)) {
                            eraseCell(i + deltaX, j + deltaY);
                        }
                    }
                }
            }
        }
    }
}

function momentumPanning() {
    let friction = 0.90;

    function step() {
        velocityX *= friction;
        velocityY *= friction;
        const deltaX = (velocityX * 0.016);
        const deltaY = (velocityY * 0.016);

        if (Math.abs(deltaX) < 0.01 * actualCellSize && Math.abs(deltaY) < 0.01 * actualCellSize) return;

        panning(deltaX, deltaY);
        momentumRafID = requestAnimationFrame(step);
    }

    momentumRafID = requestAnimationFrame(step);
}

function zoom(centerX, centerY, oldCellSize) {
    allGrid(updateCellDimension);

    const oldTotalCols = totalCols;
    const oldTotalRows = totalRows;

    totalCols = Math.ceil(window.innerWidth / actualCellSize) + BUFFER;
    totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / actualCellSize) + BUFFER;

    if (oldTotalCols !== totalCols || oldTotalRows !== totalRows) updateGridDimension(oldTotalCols, oldTotalRows);

    const deltaX = centerX / oldCellSize * (actualCellSize - oldCellSize);
    const deltaY = centerY / oldCellSize * (actualCellSize - oldCellSize);
    panning(deltaX, deltaY);
}

const getDistanceTouch = (x, y) => Math.sqrt(Math.pow(x.clientX - y.clientX, 2) + Math.pow(x.clientY - y.clientY, 2));


/* COMPUTER HANDLER FOR DEBUG */
container.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velocityX = 0;
    velocityY = 0;
    prevTime = performance.now();
    cancelAnimationFrame(momentumRafID);
});

container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = (now - prevTime) / 1000;
    prevTime = now;

    const dx = lastX - e.clientX;
    const dy = lastY - e.clientY;

    velocityX = Math.max(-2000, Math.min(2000, dx / dt));
    velocityY = Math.max(-2000, Math.min(2000, dy / dt));

    panning(dx, dy, false);

    prevX = lastX;
    prevY = lastY;

    lastX = e.clientX;
    lastY = e.clientY;
});

container.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    const dx = prevX - lastX;
    const dy = prevY - lastY;

    momentumPanning(dx, dy);
});

container.addEventListener("wheel", (e) => {
    if (e.deltaY > 0) {
        scale = Math.min(scale * 1.1, 2);
    } else if (e.deltaY < 0) {
        scale = Math.max(scale * 0.9, 0.5);
    }

    const oldCellSize = actualCellSize;
    actualCellSize = CELL_SIZE * scale;
    const rect = container.getBoundingClientRect();
    zoom(e.clientX - rect.left, e.clientY - rect.top, oldCellSize, actualCellSize);
}, { passive: false });

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") panning(-CELL_SIZE, 0);
    if (e.key === "ArrowLeft") panning(CELL_SIZE, 0);
    if (e.key === "ArrowUp") panning(0, CELL_SIZE);
    if (e.key === "ArrowDown") panning(0, -CELL_SIZE);
});
/* COMPUTER HANDLER FOR DEBUG */

container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        velocityX = 0;
        velocityY = 0;
        prevTime = performance.now();
        cancelAnimationFrame(momentumRafID);
    } else if (e.touches.length === 2) {
        isDragging = false;
        pinchStartDistance = getDistanceTouch(e.touches[0], e.touches[1]);
        pinchStartZoom = scale;
    }
}, { passive: false });

container.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        if (!isDragging) return;
        const now = performance.now();
        const dt = (now - prevTime) / 1000;
        prevTime = now;

        const dx = lastX - e.touches[0].clientX;
        const dy = lastY - e.touches[0].clientY;

        velocityX = Math.max(-2000, Math.min(2000, dx / dt));
        velocityY = Math.max(-2000, Math.min(2000, dy / dt));

        panning(dx, dy);

        prevX = lastX;
        prevY = lastY;

        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && pinchStartDistance !== null) {
        const rect = container.getBoundingClientRect();
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const currentDistance = getDistanceTouch(e.touches[0], e.touches[1]);
        const pinchRatio = currentDistance / pinchStartDistance;
        
        const zoomFactor = Math.pow(pinchRatio, 0.5);
        let newScale = pinchStartZoom * zoomFactor;
        
        newScale = Math.max(0.3, Math.min(3.0, newScale));
        
        const scaleChange = Math.abs(newScale - scale);
        if (scaleChange > 0.02) {
            scale = newScale;
            const oldCellSize = actualCellSize;
            actualCellSize = CELL_SIZE * scale;
            
            zoom(centerX, centerY, oldCellSize);
        }
    }
}, { passive: false });

container.addEventListener("touchend", (e) => {
    if (e.touches.length === 0) {
        isDragging = false;
        pinchStartDistance = null;
        pinchStartZoom = null;

        // Applica momentum solo se non stavamo facendo zoom
        if (prevX !== undefined && prevY !== undefined) {
            const dx = prevX - lastX;
            const dy = prevY - lastY;
            momentumPanning(dx, dy);
        }
    } else if (e.touches.length === 1) {
        pinchStartDistance = null;
        pinchStartZoom = null;
        
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        velocityX = 0;
        velocityY = 0;
        prevTime = performance.now();
    }
});


allGrid(initCell);

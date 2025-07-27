import { cells, bombMap, checkedCells, flaggedCells, getCellSize } from "./constants.js";
import { clearZone, bombCount } from "./game.js";
import { getContainer, eraseCell, printCell, writeFlag, renderCell, updateCellPosition, updateGridDimension } from "./gridHandler.js";
import { setScore } from "./scoreHandler.js";
import { allGrid, getGlobalKey, surroundings } from "./utils.js";

const container = getContainer();

let offsetX = 0, offsetY = 0;
export function getOffset() {
    return [offsetX, offsetY];
}

const CELL_SIZE = getCellSize();

let firstClick = true;

let isDragging = false;
let lastX, lastY;

let scale = 1, currentScale;
let pinchStartDistance = null, pinchStartZoom;

function revealCell(x, y) {
    setScore(bombMap.get(getGlobalKey(x, y)));

    const count = bombCount(x, y);
    if (count === 0) {
        revealConnectedZeros(x, y);
        return;
    }

    const key = getGlobalKey(x, y);
    if (!checkedCells.has(key)) checkedCells.add(key);

    printCell(x, y);
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

export function setEventsCell(cell, x, y) {
    cell.onclick = () => {
        if (isDragging) return;
        if (firstClick) {
            clearZone(x, y);
            revealCell(x, y);
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
            revealCell(x, y);
        }
    };
}

function move(dx, dy) {
    allGrid(eraseCell, true);

    offsetX += dx / (CELL_SIZE * scale);
    offsetY += dy / (CELL_SIZE * scale);

    allGrid(updateCellPosition);
    requestAnimationFrame(() => allGrid(renderCell));
}

window.addEventListener("keydown", (e) => {
    const step = CELL_SIZE * scale;
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

    let actualCellSize = CELL_SIZE * scale;

    const startX = mouseX / actualCellSize + offsetX;
    const startY = mouseY / actualCellSize + offsetY;

    if (e.deltaY > 0) {
        scale = Math.min(scale * 1.1, 2);
    } else if (e.deltaY < 0) {
        scale = Math.max(scale * 0.9, 0.5);
    }

    //! Capisci se fare così (brutto) o mettendo max/min alla cella (non so se comporta problemi poi con offset e varie, anche se al momento lo uso solo qua)
    actualCellSize = Math.max(20, Math.min(80, CELL_SIZE * scale));

    const endX = mouseX / actualCellSize;
    const endY = mouseY / actualCellSize;

    offsetX = startX - endX;
    offsetY = startY - endY;

    updateGridDimension(actualCellSize);
    allGrid(renderCell);
}, { passive: false });

/* DEBUG */
window.addEventListener("keydown", (e) => {
    let actualCellSize = CELL_SIZE * scale;

    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const startX = mouseX / actualCellSize + offsetX;
    const startY = mouseY / actualCellSize + offsetY;

    if (e.key == "d") {
        actualCellSize = 60;
    } else if (e.key == "a") {
        actualCellSize = 20;
    } else if (e.key == "s") {
        actualCellSize = 40;
    } else return;

    allGrid(eraseCell, true);

    const endX = mouseX / actualCellSize;
    const endY = mouseY / actualCellSize;

    offsetX = startX - endX;
    offsetY = startY - endY;

    updateGridDimension(actualCellSize);
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

        let actualCellSize = CELL_SIZE * scale;

        const startX = centerX / actualCellSize + offsetX;
        const startY = centerY / actualCellSize + offsetY;

        scale = getDistance(e.touches[0], e.touches[1]) / pinchStartDistance;
        actualCellSize = Math.max(10, Math.min(60, CELL_SIZE * scale));

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
        scale = currentScale;
    }
});
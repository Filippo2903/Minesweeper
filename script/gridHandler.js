import { setEventsCell, getOffset } from "./eventHandlers.js";
import { cells, bombMap, checkedCells, flaggedCells, getBuffer, getCellSize } from "./constants.js";
import { getGlobalKey, allGrid } from "./utils.js";
import { bombCount } from "./game.js";
import { maybeGenerateBomb } from "./game.js";

export function getContainer() {
    return document.getElementById("game-container");
}
const container = getContainer();

const CELL_SIZE = getCellSize();

const BUFFER = getBuffer();

const scoreContainer = document.getElementById("score-textbox");

const style = window.getComputedStyle(scoreContainer.parentElement);
let totalCols = Math.ceil(window.innerWidth / CELL_SIZE) + BUFFER;
let totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / CELL_SIZE) + BUFFER;
/* DEBUG */
// let totalCols = Math.ceil(1200 / CELL_SIZE) + BUFFER;
// let totalRows = Math.ceil(840 / CELL_SIZE) + BUFFER;

export function getGridDimension() {
    return [totalCols, totalRows];
}

function initCell(x, y) {
    if (cells[y] && cells[y][x] !== undefined) return;

    const cell = document.createElement("div");
    cell.className = "cell";

    cell.style.left = `${x * CELL_SIZE}px`;
    cell.style.top = `${y * CELL_SIZE}px`;

    cell.style.width = `${CELL_SIZE}px`;
    cell.style.height = `${CELL_SIZE}px`;
    cell.style.fontSize = `${CELL_SIZE * 0.6}px`;

    setEventsCell(cell, x, y);

    container.appendChild(cell);

    (cells[y] ??= []).push(cell);

    renderCell(x, y);
}

export function renderCell(x, y) {
    const key = getGlobalKey(x, y);

    if (!bombMap.has(key)) maybeGenerateBomb(x, y);

    if (checkedCells.has(key)) {
        printCell(x, y);
    } else if (flaggedCells.has(key)) {
        writeFlag(x, y);
    }
}

export function eraseCell(x, y) {
    const cell = cells[y][x];
    cell.innerHTML = "";
    cell.style.background = "var(--accent-color)";
}

export function printCell(x, y) {
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

export function writeFlag(x, y) {
    const cell = cells[y][x];

    cell.style.background = "var(--text-color)";

    const img = document.createElement("img");
    img.src = "assets/icon-flag.svg";
    img.width = 35;
    img.height = 35;
    cell.appendChild(img);
}

export function updateCellPosition(x, y) {
    const cell = cells[y][x];
    const [offsetX, offsetY] = getOffset();
    const fractionalOffsetX = (offsetX % 1 + 1) % 1;
    const fractionalOffsetY = (offsetY % 1 + 1) % 1;
    cell.style.left = `${(x - fractionalOffsetX) * getCellSize()}px`;
    cell.style.top = `${(y - fractionalOffsetY) * getCellSize()}px`;
}

export function updateGridDimension(newCellSize) {
    const [oldTotalCols, oldTotalRows] = [totalCols, totalRows];

    /* DEBUG */
    // totalCols = Math.ceil(1200 / newCellSize) + BUFFER;
    // totalRows = Math.ceil(840 / newCellSize) + BUFFER;
    totalCols = Math.ceil(window.innerWidth / newCellSize) + BUFFER;
    totalRows = Math.ceil((window.innerHeight - scoreContainer.parentElement.offsetHeight - parseFloat(style.margin) * 2) / newCellSize) + BUFFER;

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
        cell.style.width = `${newCellSize}px`;
        cell.style.height = `${newCellSize}px`;
        cell.style.fontSize = `${newCellSize * 0.6}px`;

        updateCellPosition(x, y);
    });
}

allGrid(initCell);

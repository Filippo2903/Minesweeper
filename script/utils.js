import { checkedCells, flaggedCells, cells } from "./constants.js";
import { getOffset } from "./eventHandlers.js";
import { getGridDimension } from "./gridHandler.js";

function getKey(x, y) {
    return `${x},${y}`;
}

function toGlobal(x, y) {
    const [offsetX, offsetY] = getOffset();
    return [Math.floor((x + offsetX)), Math.floor((y + offsetY))];
}

export function getGlobalKey(x, y) {
    return getKey(...toGlobal(x, y));
}

//? limited per ora inutile
export function surroundings(x, y, f, limited = false) {
    const [totalCols, totalRows] = getGridDimension();
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

export function allGrid(f, onlyPrinted = false) {
    const [totalCols, totalRows] = getGridDimension();
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

/* DEBUG */
export function debug(x, y) {
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
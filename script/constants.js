export const BOMB_SPAWN_PROBABILITY = 0.27;

/** @type {HTMLDivElement[][]} */
export const cells = [];

const CELL_SIZE = 40;
export function getCellSize() {
    return CELL_SIZE;
}

const BUFFER = 1;
export function getBuffer() {
    return BUFFER;
}

export const bombMap = new Map();
export const checkedCells = new Set();
export const flaggedCells = new Set();
export const checkedZero = new Set();

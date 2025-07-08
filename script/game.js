const container = document.getElementById("game-container");
const cellSize = 40;
const visibleCols = Math.ceil(window.innerWidth / cellSize) + 2;
const visibleRows = Math.ceil(window.innerHeight / cellSize) + 2;
const bombMap = new Map();
const checkedMap = new Map();

let offsetX = 0;
let offsetY = 0;

const cells = [];

for (let y = 0; y < visibleRows; y++) {
    for (let x = 0; x < visibleCols; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", () => {
            if (!checkedMap.has(getKey(x + offsetX, y + offsetY))) {
                writeCell(cell, x, y);
            }
        });
        container.appendChild(cell);
        cells.push(cell);
    }
}

function getKey(x, y) {
    return `${x},${y}`;
}

function maybeGenerateBomb(x, y) {
    if (!bombMap.has(getKey(x, y))) {
        bombMap.set(getKey(x, y), Math.random() < 0.25);
    }
}

function bombCount(x, y) {
    let count = 0;
    for (let j = y - 1; j <= y + 1; j++) {
        for (let i = x - 1; i <= x + 1; i++) {
            if (bombMap.get(getKey(i, j))) {
                count++;
            }
        }
    }
    return count;
}

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
}

function writeCell(cell, x, y) {
    // console.log("writtenCell");

    const key = getKey(x + offsetX, y + offsetY);

    if (!checkedMap.get(key)) checkedMap.set(key, true);

    cell.style.background = "var(--border-color)";

    if (bombMap.get(key)) {
        const img = document.createElement("img");
        img.src = "assets/icon-explosion.svg";
        img.width = 35;
        img.height = 35;
        cell.appendChild(img);
        return;
    }

    count = bombCount(x + offsetX, y + offsetY);

    if (count === 0) {
        startY = Math.max(0, y - 1);
        endY = Math.min(y + 1, visibleRows - 1);
        startX = Math.max(0, x - 1);
        endX = Math.min(x + 1, visibleCols - 1);

        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                if (!checkedMap.has(getKey(i + offsetX, j + offsetY)) && !bombMap.get(getKey(i + offsetX, j + offsetY))) {
                    requestAnimationFrame(() => writeCell(cells[j * visibleCols + i], i, j));

                }
            }
        }
        return;
    }

    cell.textContent = count;
}

function eraseMap() {
    let index = 0;
    for (let y = 0 + offsetY; y < visibleRows + offsetY; y++) {
        for (let x = 0 + offsetX; x < visibleCols + offsetX; x++) {
            const cell = cells[index++];
            cell.children = null;
            cell.textContent = "";
            cell.style.background = "var(--accent-color)";
        }
    }
}

function renderGrid() {
    let index = 0;
    for (let y = 0; y < visibleRows; y++) {
        for (let x = 0; x < visibleCols; x++) {
            const cell = cells[index++];
            cell.style.left = `${(x - 1) * cellSize}px`;
            cell.style.top = `${(y - 1) * cellSize}px`;
            maybeGenerateBomb(x + offsetX, y + offsetY);
            if (checkedMap.has(getKey(x + offsetX, y + offsetY))) {
                writeCell(cell, x, y);
            }
            // cell.style["font-size"] = "10px";
            // cell.textContent = `${getKey(x, y)}`; //Number(bombMap.get(getKey(x, y)))
        }
    }

    // index = 0;
    // for (let y = 0; y < visibleRows; y++) {
    //     for (let x = 0; x < visibleCols; x++) {
    //         const cell = cells[index++];
    //         debug(cell, x, y);
    //     }
    // }
}

renderGrid();

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") offsetX++;
    if (e.key === "ArrowLeft") offsetX--;
    if (e.key === "ArrowUp") offsetY--;
    if (e.key === "ArrowDown") offsetY++;

    eraseMap();
    renderGrid();
});

let isDragging = false;
let lastTouchX = 0;
let lastTouchY = 0;

window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
});

window.addEventListener("touchmove", (e) => {
    // if (!isDragging) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - lastTouchX) * 1;
    const dy = (touch.clientY - lastTouchY) * 1;

    offsetX -= dx / cellSize;
    offsetY -= dy / cellSize;

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    eraseMap();
    renderGrid();

    e.preventDefault();
    console.log(offsetX, offsetY);
}, { passive: false });

window.addEventListener("touchend", () => {
    isDragging = false;
});

const container = document.getElementById("game-container");
const cellSize = 40;
const buffer = 2;

const totalCols = Math.ceil(window.innerWidth / cellSize) + buffer * 2;
const totalRows = Math.ceil(window.innerHeight / cellSize) + buffer * 2;

const bombMap = new Map();
const checkedMap = new Map();

let offsetX = 0;
let offsetY = 0;

// const baseCol = Math.floor(offsetX / cellSize);
// const baseRow = Math.floor(offsetY / cellSize);

const cells = [];

for (let y = 0; y < totalRows; y++) {
    const cellsRow = [];
    for (let x = 0; x < totalCols; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.onclick = () => {
            if (!checkedMap.has(getKey(x + offsetX, y + offsetY))) {
                writeCell(cell, x, y);
            }
        };
        container.appendChild(cell);
        cellsRow.push(cell);
    }

    cells.push(cellsRow);
}

console.log(cells);

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
        endY = Math.min(y + 1, totalRows - 1);
        startX = Math.max(0, x - 1);
        endX = Math.min(x + 1, totalCols - 1);

        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                if (!checkedMap.has(getKey(i + offsetX, j + offsetY)) && !bombMap.get(getKey(i + offsetX, j + offsetY))) {
                    requestAnimationFrame(() => writeCell(cells[j][i], i, j));
                }
            }
        }
        return;
    }

    cell.textContent = count;
}

/* N Per ora inutile */
function eraseGrid() {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            const cell = cells[y][x];
            cell.children = null;
            cell.textContent = "";
            cell.style.background = "var(--accent-color)";
            // cell.style["font-size"] = "10px";
            // cell.textContent = `${getKey(x + offset, y + offset)}`;
        }
    }
}

function renderGrid() {
    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            const cell = cells[y][x];

            cell.style.left = `${(x - 1) * cellSize}px`;
            cell.style.top = `${(y - 1) * cellSize}px`;
            maybeGenerateBomb(x + offsetX, y + offsetY);
            if (checkedMap.has(getKey(x + offsetX, y + offsetY))) {
                writeCell(cell, x, y);
            }
            // cell.style["font-size"] = "10px";
            // cell.textContent = `${getKey(x + offsetX, y + offsetY)}`; //Number(bombMap.get(getKey(x, y)))
        }
    }

    // for (let y = 0; y < totalRows; y++) {
    //     for (let x = 0; x < totalCols; x++) {
    //         const cell = cells[y][x];
    //         debug(cell, x, y);
    //     }
    // }
}

function renderGridChatGPT() {
    const pixelOffsetX = offsetX % cellSize;
    const pixelOffsetY = offsetY % cellSize;

    container.style.transform = `translate(${-pixelOffsetX}px, ${-pixelOffsetY}px)`;

    for (let y = 0; y < totalRows; y++) {
        for (let x = 0; x < totalCols; x++) {
            const cell = cells[y][x];
            const mapX = x + baseCol - buffer;
            const mapY = y + baseRow - buffer;

            const key = getKey(mapX, mapY);
            maybeGenerateBomb(mapX, mapY);

            const left = x * cellSize;
            const top = y * cellSize;

            cell.style.left = `${left}px`;
            cell.style.top = `${top}px`;

            // cell.onclick = () => {
            //     if (!checkedMap.has(key)) {
            //         writeCell(cell, mapX - baseCol + buffer, mapY - baseRow + buffer);
            //     }
            // };

            if (checkedMap.has(key)) {
                writeCell(cell, mapX - baseCol + buffer, mapY - baseRow + buffer);
            } else {
                cell.innerHTML = "";
                cell.style.background = "var(--accent-color)";
            }
        }
    }
}


renderGrid();

function move(dx, dy) {
    const erasing = 0.04;

    offsetX += Math.round(dx * erasing);
    offsetY += Math.round(dy * erasing);

    eraseGrid();
    renderGrid();
}

window.addEventListener("keydown", (e) => {
    const step = 1;
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

window.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
window.addEventListener("mouseup", () => (isDragging = false));

window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
}, { passive: false });

window.addEventListener("touchend", () => (isDragging = false));

/*
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") offsetX += 0.10;
    if (e.key === "ArrowLeft") offsetX--;
    if (e.key === "ArrowUp") offsetY--;
    if (e.key === "ArrowDown") offsetY++;

    eraseMap();
    renderGrid();
});

let isDragging = false;
let lastTouchX = 0;
let lastTouchY = 0;

let targetOffsetX = 0;
let targetOffsetY = 0;

window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
});

window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;

    offsetX -= Math.round(dx / cellSize);
    offsetY -= Math.round(dy / cellSize);

    eraseMap();
    renderGrid();

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    e.preventDefault();
}, { passive: false });

window.addEventListener("touchend", () => {
    isDragging = false;
});

window.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastTouchX;
    const dy = e.clientY - lastTouchY;

    offsetX -= Math.round(dx / cellSize);
    offsetY -= Math.round(dy / cellSize);

    eraseMap();
    renderGrid();

    lastTouchX = e.clientX;
    lastTouchY = e.clientY;

    e.preventDefault();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
}); */

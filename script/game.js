import { surroundings, getGlobalKey } from "./utils.js";
import { BOMB_SPAWN_PROBABILITY, bombMap } from "./constants.js"

//! Si è rotto il click, apre a casos

export function maybeGenerateBomb(x, y) {
    bombMap.set(getGlobalKey(x, y), Math.random() < BOMB_SPAWN_PROBABILITY);
}

export function bombCount(x, y) {
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

export function clearZone(x, y) {
    surroundings(x, y, (i, j) => {
        let key = getGlobalKey(i, j);
        if (bombMap.get(key)) bombMap.set(key, false);
    });
}

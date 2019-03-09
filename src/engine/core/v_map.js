/**
 * @template T
 * @typedef {Map<number, Map<number, T>>} VMap
 */

/**
 * @template T
 */
export function VMap_new() {
    return /** @type {VMap<T>} */(new Map());
}

/**
 * @template T
 * @param {VMap<T>} map
 * @param {number} x
 * @param {number} y
 */
export function VMap_get(map, x, y) {
    const x_array = map.get(x);
    if (!x_array) {
        return undefined;
    }
    return x_array.get(y);
}

/**
 * @template T
 * @param {VMap<T>} map
 * @param {number} x
 * @param {number} y
 * @param {T} value
 */
export function VMap_set(map, x, y, value) {
    let x_array = map.get(x);
    if (!x_array) {
        x_array = new Map();
        map.set(x, x_array);
    }
    x_array.set(y, value);
    return value;
}

/**
 * @template T
 * @param {VMap<T>} map
 * @param {number} x
 * @param {number} y
 */
export function VMap_erase(map, x, y) {
    const x_array = map.get(x);
    if (!x_array) {
        return;
    }
    x_array.delete(y);
    return map;
}

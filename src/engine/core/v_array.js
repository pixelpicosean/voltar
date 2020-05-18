/**
 * @template T
 * @param {T[]} array Array to be shuffled
 * @returns The modified array
 */
export function shuffle(array) {
    const len = array.length - 1;

    for (let i = len; i > 0; i--) {
        const random_index = Math.floor(Math.random() * (i + 1));
        const item_at_index = array[random_index];

        array[random_index] = array[i];
        array[i] = item_at_index;
    }

    return array;
}

/**
 * @param {Array} from
 * @param {Array} to
 */
export function copy_array_values(from, to) {
    for (let i = 0, len = from.length; i < len; i++) {
        to[i] = from[i];
    }
    return to;
}

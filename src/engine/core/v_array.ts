/**
 * @param array Array to be shuffled
 * @returns The modified array
 */
export function shuffle<T>(array: T[]): T[] {
    const len = array.length - 1;

    for (let i = len; i > 0; i--) {
        const random_index = Math.floor(Math.random() * (i + 1));
        const item_at_index = array[random_index];

        array[random_index] = array[i];
        array[i] = item_at_index;
    }

    return array;
}

export function copy_array_values<T>(from: T[], to: T[]): T[] {
    for (let i = 0, len = from.length; i < len; i++) {
        to[i] = from[i];
    }
    return to;
}

function partition<T>(array: T[], left: number, right: number, compareFn: (a: T, b: T) => number): number {
    let pivot: T = array[Math.floor((right + left) / 2)]; // middle
    let i = left, j = right;
    let tmp: T;

    while (i <= j) {
        while (compareFn(array[i], pivot) < 0) {
            i++;
        }
        while (compareFn(array[j], pivot) > 0) {
            j--;
        }
        if (i <= j) {
            // swap
            tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;

            i++;
            j--;
        }
    }

    return i;
}
export function range_sort<T>(array: T[], start: number, end: number, compareFn: (a: T, b: T) => number) {
    let index = 0;
    if (array.length > 1) {
        index = partition(array, start, end, compareFn);
        if (start < index - 1) {
            range_sort(array, start, index - 1, compareFn);
        }
        if (index < end) {
            range_sort(array, index, end, compareFn);
        }
    }
    return array;
}

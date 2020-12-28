export function remove_items<T>(arr: T[], index: number, count = 1): T[] {
    arr.splice(index, count);
    return arr;
}

export function remove_item<T>(arr: T[], index: number) {
    arr.splice(index, 1);
    return arr;
}

export function insert_item<T>(arr: T[], index: number, item: T) {
    arr.splice(index, 0, item);
    return arr;
}

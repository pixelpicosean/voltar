export function remove_items<T>(arr: T[], index: number, count = 1): T[] {
    arr.splice(index, count);
    return arr;
}

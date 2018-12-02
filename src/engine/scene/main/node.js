class GroupData {
    constructor() {
        this.persistent = false;
        /**
         * @type {import('./scene_tree').Group}
         */
        this.group = null;
    }
}

export default class Node {

}

/**
 * @enum {number}
 */
export const PauseMode = {
    INHERIT: 0,
    STOP: 0,
    PROCESS: 0,
}

/**
 * @param {Node} p_a
 * @param {Node} p_b
 */
export const Comparator = (p_a, p_b) => {
    return false;
}

/**
 * @param {Node} p_a
 * @param {Node} p_b
 */
export const ComparatorWithPriority = (p_a, p_b) => {
    return false;
}

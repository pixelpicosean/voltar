import Node2D from "../Node2D";

export default class Viewport extends Node2D {
    constructor() {
        super();

        /**
         * @type {Viewport}
         */
        this.parent = null;
    }
}

/**
 * @enum {number}
 */
export const UpdateMode = {
    DISABLED: 0,
    ONCE: 1,
    WHEN_VISIBLE: 2,
    ALWAYS: 3,
}

/**
 * @enum {number}
 */
export const Usage = {
    '2D': 0,
    '2D_NO_SAMPLING': 1,
    '3D': 2,
    '3D_NO_EFFECTS': 3,
}

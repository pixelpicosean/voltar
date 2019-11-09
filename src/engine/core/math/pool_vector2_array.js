import { Vector2Like } from "./vector2";

export class PoolVector2Array {
    constructor() {
        /** @type {number[]} */
        this.data = [];
    }

    size() { return (this.data.length / 2) | 0 }

    /**
     * @param {number} len
     */
    resize(len) {
        this.data.length = len * 2;
    }

    /**
     * @param {number} index
     * @param {Vector2Like} vec
     */
    set(index, vec) {
        this.data[index * 2] = vec.x;
        this.data[index * 2 + 1] = vec.y;
    }
    /**
     * @param {number} index
     * @param {number} x
     * @param {number} y
     */
    set_n(index, x, y) {
        this.data[index * 2] = x;
        this.data[index * 2 + 1] = y;
    }
    /**
     * @param {Vector2Like} out
     * @param {number} index
     */
    get(out, index) {
        out.x = this.data[index * 2] || 0;
        out.y = this.data[index * 2 + 1] || 0;
        return out;
    }
    /**
     * @param {number[]} out
     * @param {number} index
     */
    get_n(out, index) {
        out[0] = this.data[index * 2] || 0;
        out[1] = this.data[index * 2 + 1] || 0;
        return out;
    }
}

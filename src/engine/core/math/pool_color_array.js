import { ColorLike } from "../color.js";

export class PoolColorArray {
    constructor() {
        /** @type {number[]} */
        this.data = [];
    }

    size() { return (this.data.length / 4) | 0 }

    /**
     * @param {number} len
     */
    resize(len) {
        this.data.length = len * 4;
    }

    /**
     * @param {number} index
     * @param {ColorLike} color
     */
    set(index, color) {
        this.data[index * 2] = color.r;
        this.data[index * 2 + 1] = color.g;
        this.data[index * 2 + 2] = color.b;
        this.data[index * 2 + 3] = color.a;
    }
    /**
     * @param {number} index
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    set_n(index, r, g, b, a) {
        this.data[index * 2] = r;
        this.data[index * 2 + 1] = g;
        this.data[index * 2 + 2] = b;
        this.data[index * 2 + 3] = a;
    }
    /**
     * @param {ColorLike} out
     * @param {number} index
     */
    get(out, index) {
        out.r = this.data[index * 2] || 0;
        out.g = this.data[index * 2 + 1] || 0;
        out.b = this.data[index * 2 + 2] || 0;
        out.a = this.data[index * 2 + 3] || 0;
        return out;
    }
    /**
     * @param {number[]} out
     * @param {number} index
     */
    get_n(out, index) {
        out[0] = this.data[index * 2] || 0;
        out[1] = this.data[index * 2 + 1] || 0;
        out[2] = this.data[index * 2 + 2] || 0;
        out[3] = this.data[index * 2 + 3] || 0;
        return out;
    }
}

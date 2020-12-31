import { Vector2Like } from "./vector2";

export class PoolVector2Array {
    data: number[] = [];

    size() { return (this.data.length / 2) | 0 }

    /**
     * @param {number} len
     */
    resize(len: number) {
        this.data.length = len * 2;
    }

    /**
     * @param {number} index
     * @param {Vector2Like} vec
     */
    set(index: number, vec: Vector2Like) {
        this.data[index * 2] = vec.x;
        this.data[index * 2 + 1] = vec.y;
    }
    /**
     * @param {number} index
     * @param {number} x
     * @param {number} y
     */
    set_n(index: number, x: number, y: number) {
        this.data[index * 2] = x;
        this.data[index * 2 + 1] = y;
    }
    /**
     * @param {Vector2Like} out
     * @param {number} index
     */
    get(out: Vector2Like, index: number) {
        out.x = this.data[index * 2] || 0;
        out.y = this.data[index * 2 + 1] || 0;
        return out;
    }
    /**
     * @param {number[]} out
     * @param {number} index
     */
    get_n(out: number[], index: number) {
        out[0] = this.data[index * 2] || 0;
        out[1] = this.data[index * 2 + 1] || 0;
        return out;
    }
}

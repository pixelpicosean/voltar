import { ColorLike } from "../color";

export class PoolColorArray {
    data: number[] = [];

    size() { return (this.data.length / 4) | 0 }

    resize(len: number) {
        this.data.length = len * 4;
    }

    set(index: number, color: ColorLike) {
        this.data[index * 2] = color.r;
        this.data[index * 2 + 1] = color.g;
        this.data[index * 2 + 2] = color.b;
        this.data[index * 2 + 3] = color.a;
    }
    set_n(index: number, r: number, g: number, b: number, a: number) {
        this.data[index * 2] = r;
        this.data[index * 2 + 1] = g;
        this.data[index * 2 + 2] = b;
        this.data[index * 2 + 3] = a;
    }
    get(out: ColorLike, index: number) {
        out.r = this.data[index * 2] || 0;
        out.g = this.data[index * 2 + 1] || 0;
        out.b = this.data[index * 2 + 2] || 0;
        out.a = this.data[index * 2 + 3] || 0;
        return out;
    }
    get_n(out: number[], index: number) {
        out[0] = this.data[index * 2] || 0;
        out[1] = this.data[index * 2 + 1] || 0;
        out[2] = this.data[index * 2 + 2] || 0;
        out[3] = this.data[index * 2 + 3] || 0;
        return out;
    }
}

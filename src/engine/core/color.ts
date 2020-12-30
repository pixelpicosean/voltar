import { rgb2hex, hex2rgb } from "engine/utils/color";

export interface ColorLike {
    r: number;
    g: number;
    b: number;
    a: number;
}

const int8 = new Int8Array(4)
const int32 = new Int32Array(int8.buffer, 0, 1)
const float32 = new Float32Array(int8.buffer, 0, 1)

const int_bits_to_float = (i: number): number => {
    int32[0] = i;
    return float32[0];
}
const int_to_float_color = (value: number): number => {
    return int_bits_to_float(value & 0xfeffffff);
}

/**
 * Pack float color (1.0, 1.0, 1.0, 1.0) into a float32 number
 */
const pack_color_f = (r: number, g: number, b: number, a: number): number => {
    const bits = (((a * 255) | 0) << 24 | ((b * 255) | 0) << 16 | ((g * 255) | 0) << 8 | ((r * 255) | 0));
    return int_to_float_color(bits);
}
/**
 * Pack uint color (255, 255, 255, 255) into a float32 number
 */
const pack_color_u = (r: number, g: number, b: number, a: number): number => {
    var bits = (a << 24 | b << 16 | g << 8 | r)
    return int_to_float_color(bits)
}

const Color_Pool: Color[] = [];

export class Color {
    static hex(p_hex: number) {
        const rgb = hex2rgb(p_hex);
        return Color.create(rgb[0], rgb[1], rgb[2]);
    }
    /** @param {string} p_color */
    static html(p_color: string) {
        return Color.hex(parseInt(p_color, 16));
    }

    static create(r = 1.0, g = 1.0, b = 1.0, a = 1.0) {
        const c = Color_Pool.pop();
        if (!c) {
            return new Color(r, g, b, a);
        } else {
            return c.set(r, g, b, a);
        }
    }
    /**
     * @param {Color} c
     */
    static free(c: Color) {
        if (c) {
            Color_Pool.push(c);
        }
        return Color;
    }

    _rgb: [number, number, number];
    a = 1.0;
    _array: [number, number, number, number] = [1, 1, 1, 1];

    get r() {
        return this._rgb[0];
    }
    set r(value) {
        this._rgb[0] = value;
    }
    get g() {
        return this._rgb[1];
    }
    set g(value) {
        this._rgb[1] = value;
    }
    get b() {
        return this._rgb[2];
    }
    set b(value) {
        this._rgb[2] = value;
    }
    get alpha() {
        return this.a;
    }
    set alpha(value) {
        this.a = value;
    }

    constructor(r: number = 1.0, g: number = 1.0, b: number = 1.0, a: number = 1.0) {
        this._rgb = [r, g, b];
        this.a = a;
    }

    set(r: number, g: number, b: number, a: number = 1.0) {
        this._rgb[0] = r;
        this._rgb[1] = g;
        this._rgb[2] = b;
        this.a = a;

        return this;
    }
    set_with_hex(hex: number) {
        hex2rgb(hex, this._rgb);

        return this;
    }

    copy(c: ColorLike) {
        this._rgb[0] = c.r;
        this._rgb[1] = c.g;
        this._rgb[2] = c.b;
        this.a = c.a;

        return this;
    }
    clone() {
        return Color.create().copy(this);
    }

    to_linear() {
        let r = this._rgb[0];
        let g = this._rgb[1];
        let b = this._rgb[2];
        return Color.create().set(
            r < 0.04045 ? r * (1.0 / 12.92) : Math.pow((r + 0.055) * (1.0 / (1 + 0.055)), 2.4),
            g < 0.04045 ? g * (1.0 / 12.92) : Math.pow((g + 0.055) * (1.0 / (1 + 0.055)), 2.4),
            b < 0.04045 ? b * (1.0 / 12.92) : Math.pow((b + 0.055) * (1.0 / (1 + 0.055)), 2.4),
            this.a
        );
    }

    to_srgb() {
        let r = this._rgb[0];
        let g = this._rgb[1];
        let b = this._rgb[2];
        return Color.create().set(
            r < 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, 1.0 / 2.4) - 0.055,
            g < 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, 1.0 / 2.4) - 0.055,
            b < 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, 1.0 / 2.4) - 0.055,
            this.a
        );
    }

    multiply(c: ColorLike) {
        this._rgb[0] *= c.r;
        this._rgb[1] *= c.g;
        this._rgb[2] *= c.b;
        this.a *= c.a;

        return this;
    }

    blend(p_over: ColorLike) {
        let res_a = 0;
        let sa = 1 - p_over.a;
        res_a = this.a * sa + p_over.a;
        if (res_a === 0) {
            return this.set(0, 0, 0, 0);
        } else {
            return this.set(
                (this.r * this.a * sa + p_over.r * p_over.a) / res_a,
                (this.g * this.a * sa + p_over.g * p_over.a) / res_a,
                (this.b * this.a * sa + p_over.b * p_over.a) / res_a,
                res_a
            );
        }
    }

    linear_interpolate(p_b: ColorLike, p_t: number, r_out?: Color) {
        if (!r_out) r_out = Color.create();
        r_out.copy(this);

        r_out.r += (p_t * (p_b.r - this.r));
        r_out.g += (p_t * (p_b.g - this.g));
        r_out.b += (p_t * (p_b.b - this.b));
        r_out.a += (p_t * (p_b.a - this.a));
        return r_out;
    }

    as_hex() {
        return rgb2hex(this._rgb);
    }

    as_rgba8() {
        return pack_color_f(this.r, this.g, this.b, this.a);
    }

    as_array(out?: number[]) {
        out = out || this._array;
        out[0] = this.r;
        out[1] = this.g;
        out[2] = this.b;
        out[3] = this.a;
        return out;
    }

    equals(value: ColorLike) {
        return this.r === value.r
            &&
            this.g === value.g
            &&
            this.b === value.b
            &&
            this.a === value.a
    }
};

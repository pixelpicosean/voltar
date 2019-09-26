import { rgb2hex, hex2rgb } from "engine/utils/color";

export class ColorLike {
    constructor() {
        this.r = 1.0;
        this.g = 1.0;
        this.b = 1.0;
        this.a = 1.0;
    }
}

/** @type {Color[]} */
const Color_Pool = [];

export class Color {
    /** @param {number} p_hex */
    static hex(p_hex) {
        const rgb = hex2rgb(p_hex);
        return Color.new(rgb[0], rgb[1], rgb[2]);
    }
    /** @param {string} p_color */
    static html(p_color) {
        return Color.hex(parseInt(p_color, 16));
    }

    static new(r = 1.0, g = 1.0, b = 1.0, a = 1.0) {
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
    static free(c) {
        if (c) {
            Color_Pool.push(c);
        }
        return Color;
    }

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

    /**
     * @param {number} [r]
     * @param {number} [g]
     * @param {number} [b]
     * @param {number} [a]
     */
    constructor(r = 1.0, g = 1.0, b = 1.0, a = 1.0) {
        this._rgb = [r, g, b];
        this.a = a;
    }

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} [a]
     */
    set(r, g, b, a = 1.0) {
        this._rgb[0] = r;
        this._rgb[1] = g;
        this._rgb[2] = b;
        this.a = a;

        return this;
    }
    /**
     * @param {number} hex
     */
    set_with_hex(hex) {
        hex2rgb(hex, this._rgb);

        return this;
    }

    /**
     * @param {ColorLike} c
     */
    copy(c) {
        this._rgb[0] = c.r;
        this._rgb[1] = c.g;
        this._rgb[2] = c.b;
        this.a = c.a;

        return this;
    }
    clone() {
        return Color.new().copy(this);
    }

    /**
     * @param {ColorLike} c
     */
    multiply(c) {
        this._rgb[0] *= c.r;
        this._rgb[1] *= c.g;
        this._rgb[2] *= c.b;
        this.a *= c.a;

        return this;
    }

    /**
     * return new Color
     * @param {ColorLike} p_b
     * @param {number} p_t
     */
    linear_interpolate(p_b, p_t) {
        const res = Color.new(this.r, this.g, this.b, this.a);
        res.r += (p_t * (p_b.r - this.r));
        res.g += (p_t * (p_b.g - this.g));
        res.b += (p_t * (p_b.b - this.b));
        res.a += (p_t * (p_b.a - this.a));
        return res;
    }

    as_hex() {
        return rgb2hex(this._rgb);
    }

    /**
     * @param {ColorLike} value
     */
    equals(value) {
        return this.r === value.r
            &&
            this.g === value.g
            &&
            this.b === value.b
            &&
            this.a === value.a
    }
};

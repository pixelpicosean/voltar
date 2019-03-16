import { rgb2hex, hex2rgb } from "engine/utils/index";

/** @type {Color[]} */
const Color_Pool = [];

export default class Color {
    /** @param {number} p_hex */
    static hex(p_hex) {
        const rgb = hex2rgb(p_hex);
        return Color.new(rgb[0], rgb[1], rgb[2]);
    }
    /** @param {string} p_color */
    static html(p_color) {
        return Color.hex(parseInt(p_color, 16));
    }

    static new(r = 1, g = 1, b = 1, a = 1) {
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
    get a() {
        return this.alpha;
    }
    set a(value) {
        this.alpha = value;
    }

    /**
     * @param {number} [r]
     * @param {number} [g]
     * @param {number} [b]
     * @param {number} [a]
     */
    constructor(r = 1, g = 1, b = 1, a = 1) {
        this._rgb = [r, g, b];
        this.alpha = a;
    }

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} [a]
     */
    set(r, g, b, a) {
        this._rgb[0] = r;
        this._rgb[1] = g;
        this._rgb[2] = b;
        this.alpha = a;

        return this;
    }

    /**
     * @param {Color} c
     */
    copy(c) {
        this._rgb[0] = c.r;
        this._rgb[1] = c.g;
        this._rgb[2] = c.b;
        this.alpha = c.a;

        return this;
    }

    /**
     * @param {Color} c
     */
    multiply(c) {
        this._rgb[0] *= c.r;
        this._rgb[1] *= c.g;
        this._rgb[2] *= c.b;
        this.alpha *= c.a;

        return this;
    }

    as_hex() {
        return rgb2hex(this._rgb);
    }
};

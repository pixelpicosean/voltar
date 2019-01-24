import { rgb2hex } from "./utils/index";

const NOOP = () => {};

export default class Color {
    get r() {
        return this._rgb[0];
    }
    set r(value) {
        this._rgb[0] = value;
        this.cb.call(this.scope, this._rgb);
    }
    get g() {
        return this._rgb[1];
    }
    set g(value) {
        this._rgb[1] = value;
        this.cb.call(this.scope, this._rgb);
    }
    get b() {
        return this._rgb[2];
    }
    set b(value) {
        this._rgb[2] = value;
        this.cb.call(this.scope, this._rgb);
    }
    get a() {
        if (this.scope) {
            this._alpha = this.scope.alpha;
            return this.scope.alpha;
        }
        return this._alpha;
    }
    set a(value) {
        this._alpha = value;
        if (this.scope) {
            this.scope.alpha = value;
            this.cb.call(this.scope, this._rgb);
        }
    }

    /**
     * @param {number} [r]
     * @param {number} [g]
     * @param {number} [b]
     * @param {number} [a]
     * @param {Function} [cb]
     * @param {any} [scope]
     */
    constructor(r = 1, g = 1, b = 1, a = 1, cb = NOOP, scope = null) {
        this._rgb = [r, g, b];
        this._alpha = a;

        this.cb = cb;
        this.scope = scope;

        if (this.scope) {
            this.scope.alpha = a;
        }
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
        this._alpha = a;
        if (a !== undefined && this.scope) {
            this.scope.alpha = a;
        }

        this.cb.call(this.scope, this._rgb);

        return this;
    }

    /**
     * @param {Color} c
     */
    copy(c) {
        this._rgb[0] = c.r;
        this._rgb[1] = c.g;
        this._rgb[2] = c.b;
        this._alpha = c.a;

        this.cb.call(this.scope, this._rgb);

        return this;
    }

    /**
     * @param {Color} c
     */
    multiply(c) {
        this._rgb[0] *= c.r;
        this._rgb[1] *= c.g;
        this._rgb[2] *= c.b;
        this._alpha *= c.a;

        this.cb.call(this.scope, this._rgb);

        return this;
    }

    as_hex() {
        return rgb2hex(this._rgb);
    }
};

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
        return this.scope.alpha;
    }
    set a(value) {
        this.scope.alpha = value;
        this.cb.call(this.scope, this._rgb);
    }

    /**
     * @param {Function} cb
     * @param {any} scope
     * @param {number} [r]
     * @param {number} [g]
     * @param {number} [b]
     * @param {number} [a]
     */
    constructor(cb, scope, r = 1, g = 1, b = 1, a = 1) {
        this._rgb = [r, g, b];

        this.cb = cb;
        this.scope = scope;

        this.scope.alpha = a;
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
        if (a !== undefined) {
            this.scope.alpha = a;
        }

        this.cb.call(this.scope, this._rgb);

        return this;
    }
};

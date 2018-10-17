export const EPSILON = 0.000001;

/**
 * @typedef PointLike
 * @property {number} x
 * @property {number} y
 */

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export default class Point {
    /**
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    constructor(x = 0, y = 0) {
        /**
         * @member {number}
         * @default 0
         */
        this.x = x;

        /**
         * @member {number}
         * @default 0
         */
        this.y = y;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    set(x, y) {
        if (x === undefined) {
            x = 0;
        }
        if (y === undefined) {
            y = x;
        }
        this.x = x;
        this.y = y;
        return this;
    }
    /**
     * Copy value from other Point
     *
     * @param {PointLike} a
     * @returns {PointLike} self for chaining
     */
    copy(a) {
        this.x = a.x;
        this.y = a.y;
        return this;
    }

    /**
     * Clone self
     *
     * @returns {Point}
     */
    clone() {
        return new Point(this.x, this.y);
    }
    random(scale) {
        // TODO: requires random module
    }
    /**
     * Create a normalized clone
     *
     * @returns {PointLike}
     */
    normalized() {
        return this.clone().normalize();
    }
    /**
     * Create a clamped Point
     *
     * @param {number} length
     * @returns {Point}
     */
    clamped(length) {
        const len = this.length();
        const v = this.clone();
        if (len > 0 && length < len) {
            v.scale(length / len);
        }
        return v;
    }
    /**
     * Create a rotated Point
     *
     * @param {number} a
     * @returns {Point}
     */
    rotated(a) {
        return this.clone().rotate(a);
    }
    snapped(by) { }

    /**
     * Whether this equals to another point
     *
     * @param {PointLike} b
     * @returns {boolean}
     */
    equals(b) {
        const a0 = this.x, a1 = this.y;
        const b0 = b.x, b1 = b.y;
        return (Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
    }
    /**
     * Whether this equals to another point(precisely)
     *
     * @param {PointLike} b
     * @returns {boolean}
     */
    exact_equals(b) {
        return (this.x === b.x) && (this.y === b.y);
    }

    /**
     * @param {PointLike|number} x
     * @param {PointLike|number} [y]
     */
    add(x, y) {
        if (y === undefined) {
            // @ts-ignore
            this.x += x.x;
            // @ts-ignore
            this.y += x.y;
        } else {
            // @ts-ignore
            this.x += x;
            // @ts-ignore
            this.y += y;
        }
        return this;
    }

    /**
     * @param {PointLike|number} x
     * @param {PointLike|number} [y]
     */
    subtract(x, y) {
        if (y === undefined) {
            // @ts-ignore
            this.x -= x.x;
            // @ts-ignore
            this.y -= x.y;
        } else {
            // @ts-ignore
            this.x -= x;
            // @ts-ignore
            this.y -= y;
        }
        return this;
    }

    /**
     * @param {PointLike} b
     */
    multiply(b) {
        this.x *= b.x;
        this.y *= b.y;
        return this;
    }

    /**
     * @param {PointLike} b
     */
    divide(b) {
        this.x /= b.x;
        this.y /= b.y;
        return this;
    }

    /**
     * @param {PointLike} b
     */
    dot(b) {
        return this.x * b.x + this.y * b.y;
    }

    /**
     * @param {PointLike} b
     */
    cross(b) {
        return this.x * b.y - this.y * b.x;
    }

    /**
     * @returns {Point}
     */
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    /**
     * @returns {Point}
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    /**
     * @returns {Point}
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    /**
     * @returns {Point}
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    /**
     * @param {number} length
     * @returns {Point}
     */
    clamp(length) {
        const len = this.length();
        if (len > 0 && length < len) {
            this.scale(length / len);
        }
        return this;
    }

    /**
     * @param {number} b
     * @returns {Point}
     */
    scale(b) {
        this.x *= b;
        this.y *= b;
        return this;
    }

    /**
     * @returns {Point}
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * @returns {Point}
     */
    inverse() {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        return this;
    }

    /**
     * @returns {Point}
     */
    normalize() {
        const x = this.x, y = this.y;
        let len = x * x + y * y;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x *= len;
            this.y *= len;
        }
        return this;
    }

    /**
     * @param {number} a
     * @returns {Point}
     */
    rotate(a) {
        const x = this.x, y = this.y;
        const c = Math.cos(a), s = Math.sin(a);
        this.x = x * c - y * s;
        this.y = x * s + y * c;
        return this;
    }

    /**
     * Change this vector to be perpendicular to what it was before. (Effectively
     * roatates it 90 degrees in a clockwise direction)
     *
     * @method perp
     * @return {Point} Self for chaining.
     */
    perp() {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    /**
     * @param {Point} other
     * @returns {Point}
     */
    project(other) {
        const amt = this.dot(other) / other.length_squared();
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /**
     * @param {PointLike} other
     * @returns {Point}
     */
    project_n(other) {
        const amt = this.dot(other);
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /**
     * @param {Point} axis
     * @returns {Point}
     */
    reflect(axis) {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }

    /**
     * @param {PointLike} axis
     * @returns {Point}
     */
    reflect_n(axis) {
        const x = this.x;
        const y = this.y;
        this.project_n(axis).scale(2);
        return this;
    }

    /**
     * @param {Point} axis
     * @returns {Point}
     */
    bounce(axis) {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x = x - this.x;
        this.y = y - this.y;
        return this;
    }

    /**
     * @param {Point} n
     * @returns {Point}
     */
    slide(n) {
        this.subtract(n.scale(this.dot(n)));
        return this;
    }

    /**
     * @returns {number}
     */
    length() {
        const x = this.x;
        const y = this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * @returns {number}
     */
    length_squared() {
        const x = this.x;
        const y = this.y;
        return x * x + y * y;
    }

    /**
     * @returns {number}
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * @param {PointLike} b
     * @returns {number}
     */
    angle_to(b) {
        return Math.atan2(this.cross(b), this.dot(b));
    }

    /**
     * @param {PointLike} b
     * @returns {number}
     */
    angle_to_point(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    }

    /**
     * @param {PointLike} b
     * @returns {number}
     */
    distance_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * @param {PointLike} b
     * @returns {number}
     */
    distance_squared_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return x * x + y * y;
    }

    /**
     * @return {Point}
     */
    tangent() {
        return new Point(this.y, -this.x);
    }
}

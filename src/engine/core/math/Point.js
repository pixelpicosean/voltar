const EPSILON = 0.000001;

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 *
 * @class
 * @memberof v
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
        this.x = x || 0;
        this.y = y || ((y !== 0) ? this.x : 0);
        return this;
    }
    /**
     * Copy value from other Point
     * @param {Point} a
     * @returns {Point} self for chaining
     */
    copy(a) {
        this.x = a.x;
        this.y = a.y;
        return this;
    }

    /**
     * Clone self
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
     * @returns {Point}
     */
    normalized() {
        return this.clone().normalize();
    }
    /**
     * Create a clamped Point
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
     * @param {number} a
     * @returns {Point}
     */
    rotated(a) {
        return this.clone().rotate(a);
    }
    snapped(by) {}

    /**
     * Whether this equals to another point
     * @param {Point} b
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
     * @param {Point} b
     * @returns {boolean}
     */
    exact_equals(b) {
        return (this.x === b.x) && (this.y === b.y);
    }

    add(b) {
        this.x += b.x;
        this.y += b.y;
        return this;
    }
    subtract(b) {
        this.x -= b.x;
        this.y -= b.y;
        return this;
    }
    multiply(b) {
        this.x *= b.x;
        this.y *= b.y;
        return this;
    }
    divide(b) {
        this.x /= b.x;
        this.y /= b.y;
        return this;
    }
    dot(b) {
        return this.x * b.x + this.y * b.y;
    }
    cross(b) {
        return this.x * b.y - this.y * b.x;
    }

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
    clamp(length) {
        const len = this.length();
        if (len > 0 && length < len) {
            this.scale(length / len);
        }
        return this;
    }

    scale(b) {
        this.x *= b;
        this.y *= b;
        return this;
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }
    inverse() {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        return this;
    }
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
     * @method perp
     * @return {Point} Self for chaining.
     */
    perp() {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }
    project(other) {
      const amt = this.dot(other) / other.length_squared();
      this.x = amt * other.x;
      this.y = amt * other.y;
      return this;
    }
    project_n(other) {
        const amt = this.dot(other);
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }
    reflect(axis) {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }
    reflect_n(axis) {
        const x = this.x;
        const y = this.y;
        this.project_n(axis).scale(2);
        return this;
    }
    bounce(axis) {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x = x - this.x;
        this.y = y - this.y;
        return this;
    }
    slide(n) {
        this.subtract(n.scale(this.dot(n)));
        return this;
    }

    length() {
        const x = this.x;
        const y = this.y;
        return Math.sqrt(x * x + y * y);
    }
    length_squared() {
        const x = this.x;
        const y = this.y;
        return x * x + y * y;
    }
    angle() {
        return Math.atan2(this.y, this.x);
    }
    angle_to(b) {
        return Math.atan2(this.cross(b), this.dot(b));
    }
    angle_to_point(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    }
    distance_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return Math.sqrt(x * x + y * y);
    }
    distance_squared_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return x * x + y * y;
    }
    tangent() {
        return new Point(this.y, -this.x);
    }
}

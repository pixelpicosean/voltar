export const EPSILON = 0.000001;

/**
 * @typedef Vector2Like
 * @property {number} x
 * @property {number} y
 */

/**
 * The Vector2 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export default class Vector2 {
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
     * Copy value from other vector
     *
     * @param {Vector2Like} a
     * @returns {Vector2} self for chaining
     */
    copy(a) {
        this.x = a.x;
        this.y = a.y;
        return this;
    }

    /**
     * Clone self
     *
     * @returns {Vector2}
     */
    clone() {
        return new Vector2(this.x, this.y);
    }
    random(scale) {
        // TODO: requires random module
    }
    /**
     * Create a normalized clone
     *
     * @returns {Vector2}
     */
    normalized() {
        return this.clone().normalize();
    }
    /**
     * Create a clamped vector.
     *
     * @param {number} length
     * @returns {Vector2}
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
     * Create a rotated vector.
     *
     * @param {number} a
     * @returns {Vector2}
     */
    rotated(a) {
        return this.clone().rotate(a);
    }
    snapped(by) { }

    /**
     * Whether this equals to another point
     *
     * @param {Vector2Like} b
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
     * @param {Vector2Like} b
     * @returns {boolean}
     */
    exact_equals(b) {
        return (this.x === b.x) && (this.y === b.y);
    }

    /**
     * Add the vector by another vector or number.
     *
     * @param {Vector2Like|number} x
     * @param {Vector2Like|number} [y]
     * @returns this
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
     * Subtract the vector by another vector or number.
     *
     * @param {Vector2Like|number} x
     * @param {Vector2Like|number} [y]
     * @returns this
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
     * Multiply the vector by another vector or number.
     *
     * @param {Vector2Like|number} x
     * @param {Vector2Like|number} [y]
     * @returns this
     */
    multiply(x, y) {
        if (y === undefined) {
            // @ts-ignore
            this.x *= x.x;
            // @ts-ignore
            this.y *= x.y;
        } else {
            // @ts-ignore
            this.x *= x;
            // @ts-ignore
            this.y *= y;
        }
        return this;
    }

    /**
     * Divide x and y by another vector or number.
     *
     * @param {Vector2Like|number} x
     * @param {Vector2Like|number} [y]
     * @returns this
     */
    divide(x, y) {
        if (y === undefined) {
            // @ts-ignore
            this.x /= x.x;
            // @ts-ignore
            this.y /= x.y;
        } else {
            // @ts-ignore
            this.x /= x;
            // @ts-ignore
            this.y /= y;
        }
        return this;
    }

    /**
     * Dot multiply another vector.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    dot(b) {
        return this.x * b.x + this.y * b.y;
    }

    /**
     * Cross multiply another vector.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    cross(b) {
        return this.x * b.y - this.y * b.x;
    }

    /**
     * Change x and y components to their absolute values.
     *
     * @returns {Vector2}
     */
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    /**
     * Ceil x and y components.
     *
     * @returns {Vector2}
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    /**
     * Floor x and y components.
     *
     * @returns {Vector2}
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    /**
     * Round to int vector.
     *
     * @returns {Vector2}
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    /**
     * Clamp the vector to specific length.
     *
     * @param {number} length
     * @returns {Vector2}
     */
    clamp(length) {
        const len = this.length();
        if (len > 0 && length < len) {
            this.scale(length / len);
        }
        return this;
    }

    /**
     * Scale the vector by a number factor.
     *
     * @param {number} b
     * @returns {Vector2}
     */
    scale(b) {
        this.x *= b;
        this.y *= b;
        return this;
    }

    /**
     * Negate x and y components.
     *
     * @returns {Vector2}
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Inverse the x and y components.
     *
     * @returns {Vector2}
     */
    inverse() {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        return this;
    }

    /**
     * Normalize this vector to unit length.
     *
     * @returns {Vector2}
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
     * Rotates the vector by “phi” radians.
     *
     * @param {number} a
     * @returns {Vector2}
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
     * @return {Vector2} Self for chaining.
     */
    perp() {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    /**
     * Project to a vector.
     *
     * @param {Vector2} other
     * @returns {Vector2}
     */
    project(other) {
        const amt = this.dot(other) / other.length_squared();
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /**
     * Project to a vector which is already normalized.
     *
     * @param {Vector2Like} other
     * @returns {Vector2}
     */
    project_n(other) {
        const amt = this.dot(other);
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /**
     * Reflects the vector along the given plane, specified by its normal vector.
     *
     * @param {Vector2} axis
     * @returns {Vector2}
     */
    reflect(axis) {
        const dot = this.dot(axis);
        this.x = 2 * axis.x * dot - this.x;
        this.y = 2 * axis.y * dot - this.y;
        return this;
    }

    /**
     * Bounce returns the vector “bounced off” from the given plane, specified by its normal vector.
     *
     * @param {Vector2} normal
     * @returns {Vector2}
     */
    bounce(normal) {
        return this.reflect(normal)
            .multiply(1, -1)
    }

    /**
     * Slide returns the component of the vector along the given plane, specified by its normal vector.
     *
     * @param {Vector2} normal
     * @returns {Vector2}
     */
    slide(normal) {
        return this.subtract(tmp_point.copy(normal).scale(this.dot(normal)))
    }

    /**
     * Returns the length of the vector.
     *
     * @returns {number}
     */
    length() {
        const x = this.x;
        const y = this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Returns the squared length of the vector. Prefer this function
     * over “length” if you need to sort vectors or need the squared length for some formula.
     *
     * @returns {number}
     */
    length_squared() {
        const x = this.x;
        const y = this.y;
        return x * x + y * y;
    }

    /**
     * Returns the result of atan2 when called with the Vector’s x and y as parameters (Math::atan2(x,y)).
     *
     * @returns {number}
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Returns the angle in radians between the two vectors.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    angle_to(b) {
        return Math.atan2(this.cross(b), this.dot(b));
    }

    /**
     * @param {Vector2Like} b
     * @returns {number}
     */
    angle_to_point(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    }

    /**
     * Returns the distance to vector “b”.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    distance_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Returns the squared distance to vector “b”. Prefer this function
     * over “distance_to” if you need to sort vectors or need the squared distance for some formula.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    distance_squared_to(b) {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return x * x + y * y;
    }

    /**
     * Returns a perpendicular vector.
     *
     * @return {Vector2}
     */
    tangent() {
        return new Vector2(this.y, -this.x);
    }
}

const tmp_point = new Vector2();

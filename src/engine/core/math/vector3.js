import { CMP_EPSILON } from './math_defs';
import { Basis } from './basis';

/**
 * @interface
 */
export class Vector3Like {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}

const basis = new Basis;

/**
 * The Vector3 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export class Vector3 {
    /**
     * @param {number} [p_x]
     * @param {number} [p_y]
     * @param {number} [p_z]
     */
    static new(p_x = 0, p_y = 0, p_z = 0) {
        const vec = pool.pop();
        if (!vec) {
            return new Vector3(p_x, p_y, p_z);
        } else {
            return vec.set(p_x, p_y, p_z);
        }
    }
    /**
     * @param {Vector3} vec
     */
    static free(vec) {
        if (vec && pool.length < 2020) {
            pool.push(vec);
        }
        return Vector3;
    }

    /**
     * @param {number} value
     */
    set_x(value) {
        this.x = value;
    }

    /**
     * @param {number} value
     */
    set_y(value) {
        this.y = value;
    }

    /**
     * @param {number} value
     */
    set_z(value) {
        this.z = value;
    }

    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     * @param {number} [z=0] - position of the point on the z axis
     */
    set(x, y, z) {
        if (x === undefined) {
            x = 0;
        }
        if (y === undefined) {
            y = x;
            z = x;
        }
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    /**
     * Copy value from other vector
     *
     * @param {Vector3Like} p_b
     * @returns {Vector3} self for chaining
     */
    copy(p_b) {
        this.x = p_b.x;
        this.y = p_b.y;
        this.z = p_b.z;
        return this;
    }

    /**
     * Returns new Vector3 with same value.
     */
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    /**
     * Returns new Vector3 but normalized.
     */
    normalized() {
        return this.clone().normalize();
    }

    /**
     * Whether this equals to another point
     *
     * @param {Vector3Like} p_b
     */
    equals(p_b) {
        const a0 = this.x, a1 = this.y, a2 = this.z;
        const b0 = p_b.x, b1 = p_b.y, b2 = p_b.z;
        return (
            Math.abs(a0 - b0) <= CMP_EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0))
            &&
            Math.abs(a1 - b1) <= CMP_EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1))
            &&
            Math.abs(a2 - b2) <= CMP_EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2))
        );
    }
    /**
     * Whether this equals to another point(precisely)
     *
     * @param {Vector3Like} p_b
     */
    exact_equals(p_b) {
        return (this.x === p_b.x) && (this.y === p_b.y) && (this.z === p_b.z);
    }

    /**
     * Add the vector by another vector or number.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    add(x, y, z) {
        if (y === undefined) {
            // @ts-ignore
            this.x += x.x;
            // @ts-ignore
            this.y += x.y;
            // @ts-ignore
            this.z += x.z;
        } else {
            // @ts-ignore
            this.x += x;
            // @ts-ignore
            this.y += y;
            // @ts-ignore
            this.z += z;
        }
        return this;
    }

    /**
     * Subtract the vector by another vector or number.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    subtract(x, y, z) {
        if (y === undefined) {
            // @ts-ignore
            this.x -= x.x;
            // @ts-ignore
            this.y -= x.y;
            // @ts-ignore
            this.z -= x.z;
        } else {
            // @ts-ignore
            this.x -= x;
            // @ts-ignore
            this.y -= y;
            // @ts-ignore
            this.z -= z;
        }
        return this;
    }

    /**
     * Multiply the vector by another vector or number.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    multiply(x, y, z) {
        if (y === undefined) {
            // @ts-ignore
            this.x *= x.x;
            // @ts-ignore
            this.y *= x.y;
            // @ts-ignore
            this.z *= x.z;
        } else {
            // @ts-ignore
            this.x *= x;
            // @ts-ignore
            this.y *= y;
            // @ts-ignore
            this.z *= z;
        }
        return this;
    }

    /**
     * Divide x and y by another vector or number.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    divide(x, y, z) {
        if (y === undefined) {
            // @ts-ignore
            this.x /= x.x;
            // @ts-ignore
            this.y /= x.y;
            // @ts-ignore
            this.z /= x.z;
        } else {
            // @ts-ignore
            this.x /= x;
            // @ts-ignore
            this.y /= y;
            // @ts-ignore
            this.z /= z;
        }
        return this;
    }

    /**
     * Dot multiply another vector.
     *
     * @param {Vector3Like} p_b
     * @returns {number}
     */
    dot(p_b) {
        return this.x * p_b.x + this.y * p_b.y + this.z * p_b.z;
    }

    /**
     * Cross multiply another vector.
     *
     * @param {Vector3Like} p_b
     */
    cross(p_b) {
        return Vector3.new(
            (this.y * p_b.z) - (this.z * p_b.y),
            (this.z * p_b.x) - (this.x * p_b.z),
            (this.x * p_b.y) - (this.y * p_b.x)
        )
    }

    /**
     * Change x and y components to their absolute values.
     *
     * @returns {Vector3}
     */
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        return this;
    }

    /**
     * Ceil x and y components.
     *
     * @returns {Vector3}
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);
        return this;
    }

    /**
     * Floor x and y components.
     *
     * @returns {Vector3}
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    /**
     * Round to int vector.
     *
     * @returns {Vector3}
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
        return this;
    }

    /**
     * Negate x and y components.
     *
     * @returns {Vector3}
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Inverse the x and y components.
     *
     * @returns {Vector3}
     */
    inverse() {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        this.z = 1.0 / this.z;
        return this;
    }

    /**
     * Normalize this vector to unit length.
     *
     * @returns {Vector3}
     */
    normalize() {
        const x = this.x, y = this.y, z = this.z;
        let len = x * x + y * y + z * z;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x *= len;
            this.y *= len;
            this.z *= len;
        }
        return this;
    }

    /**
     * Rotates the vector by “phi” radians.
     *
     * @param {Vector3Like} p_axis
     * @param {number} p_phi
     * @returns {Vector3}
     */
    rotate(p_axis, p_phi) {
        basis.set(p_axis, p_phi);
        basis.xform(this, this);
        return this;
    }
}

/**
 * @type {Vector3[]}
 */
const pool = [];

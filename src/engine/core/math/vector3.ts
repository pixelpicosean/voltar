import { CMP_EPSILON } from './math_defs';

export interface Vector3Like {
    x: number;
    y: number;
    z: number;
}

/**
 * The Vector3 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export class Vector3 {
    static create(p_x: number = 0, p_y: number = 0, p_z: number = 0) {
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
    static free(vec: Vector3) {
        if (vec && pool.length < 2020) {
            pool.push(vec);
        }
        return Vector3;
    }

    /**
     * @param {number} value
     */
    set_x(value: number) {
        this.x = value;
    }

    /**
     * @param {number} value
     */
    set_y(value: number) {
        this.y = value;
    }

    /**
     * @param {number} value
     */
    set_z(value: number) {
        this.z = value;
    }

    x: number;
    y: number;
    z: number;
    _array: [number, number, number];

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;

        this._array = [x, y, z];
    }

    as_array(r_out?: [number, number, number]) {
        r_out = r_out || this._array;
        r_out[0] = this.x;
        r_out[1] = this.y;
        r_out[2] = this.z;
        return r_out;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     * @param {number} [z=0] - position of the point on the z axis
     */
    set(x: number, y: number, z: number) {
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
    copy(p_b: Vector3Like): Vector3 {
        this.x = p_b.x;
        this.y = p_b.y;
        this.z = p_b.z;
        return this;
    }

    /**
     * Returns new Vector3 with same value.
     */
    clone() {
        return Vector3.create(this.x, this.y, this.z);
    }
    /**
     * Returns new Vector3 but normalized.
     */
    normalized() {
        return this.clone().normalize();
    }

    /**
     * @param {Vector3Like} p_b
     * @param {number} p_t
     * @param {Vector3} [r_out]
     */
    linear_interpolate(p_b: Vector3Like, p_t: number, r_out: Vector3) {
        if (!r_out) r_out = Vector3.create();

        return r_out.set(
            this.x + (p_t * (p_b.x - this.x)),
            this.y + (p_t * (p_b.y - this.y)),
            this.z + (p_t * (p_b.z - this.z))
        );
    }

    /**
     * Whether this equals to another point
     *
     * @param {Vector3Like} p_b
     * @param {number} [eps]
     */
    is_equal_approx(p_b: Vector3Like, eps: number = CMP_EPSILON) {
        const a0 = this.x, a1 = this.y, a2 = this.z;
        const b0 = p_b.x, b1 = p_b.y, b2 = p_b.z;
        return (
            Math.abs(a0 - b0) <= eps * Math.max(1.0, Math.abs(a0), Math.abs(b0))
            &&
            Math.abs(a1 - b1) <= eps * Math.max(1.0, Math.abs(a1), Math.abs(b1))
            &&
            Math.abs(a2 - b2) <= eps * Math.max(1.0, Math.abs(a2), Math.abs(b2))
        );
    }
    /**
     * Whether this equals to another point(precisely)
     *
     * @param {Vector3Like} p_b
     */
    exact_equals(p_b: Vector3Like) {
        return (this.x === p_b.x) && (this.y === p_b.y) && (this.z === p_b.z);
    }

    length() {
        return Math.hypot(this.x, this.y, this.z);
    }

    /**
     * Add the vector by another vector or number.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    add(x: Vector3Like | number, y?: number, z?: number): Vector3 {
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
    subtract(x: Vector3Like | number, y?: number, z?: number): Vector3 {
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
     * Multiply the vector by another vector.
     *
     * @param {Vector3Like|number} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3} self for chaining
     */
    multiply(x: Vector3Like | number, y?: number, z?: number): Vector3 {
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
     * @param {number} s
     */
    scale(s: number) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
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
    divide(x: Vector3Like | number, y: number, z: number): Vector3 {
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
    dot(p_b: Vector3Like): number {
        return this.x * p_b.x + this.y * p_b.y + this.z * p_b.z;
    }

    /**
     * Cross multiply another vector.
     *
     * @param {Vector3Like} p_b
     */
    cross(p_b: Vector3Like) {
        return Vector3.create(
            (this.y * p_b.z) - (this.z * p_b.y),
            (this.z * p_b.x) - (this.x * p_b.z),
            (this.x * p_b.y) - (this.y * p_b.x)
        )
    }

    /**
     * @param {Vector3Like} p_b
     */
    distance_to(p_b: Vector3Like) {
        return Math.hypot(p_b.x - this.x, p_b.y - this.y, p_b.z - this.z);
    }

    /**
     * Change x and y components to their absolute values.
     *
     * @returns {Vector3}
     */
    abs(): Vector3 {
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
    ceil(): Vector3 {
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
    floor(): Vector3 {
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
    round(): Vector3 {
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
    negate(): Vector3 {
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
    inverse(): Vector3 {
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
    normalize(): Vector3 {
        const x = this.x, y = this.y, z = this.z;
        let len = x * x + y * y + z * z;
        if (len === 0) {
            this.x = this.y = this.z = 0;
        } else {
            len = 1 / Math.sqrt(len);
            this.x *= len;
            this.y *= len;
            this.z *= len;
        }
        return this;
    }

    static ZERO = new Vector3(0, 0, 0);
    static ONE = new Vector3(1, 1, 1);
    static INF = new Vector3(Infinity, Infinity, Infinity);
    static LEFT = new Vector3(-1, 0, 0);
    static RIGHT = new Vector3(1, 0, 0);
    static UP = new Vector3(0, 1, 0);
    static DOWN = new Vector3(0, -1, 0);
    static FORWARD = new Vector3(0, 0, -1);
    static BACK = new Vector3(0, 0, 1);
}

/**
 * @type {Vector3[]}
 */
const pool: Vector3[] = [];

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
    static new(p_x = 0, p_y = 0, p_z = 0) {
        const vec = pool.pop();
        if (!vec) {
            return new Vector3(p_x, p_y, p_z);
        } else {
            return vec.set(p_x, p_y, p_z);
        }
    }
    static free(vec: Vector3) {
        if (vec && pool.length < 2020) {
            pool.push(vec);
        }
        return Vector3;
    }

    x: number;
    set_x(value: number) {
        this.x = value;
    }

    y: number;
    set_y(value: number) {
        this.y = value;
    }

    z: number;
    set_z(value: number) {
        this.z = value;
    }

    _array: [number, number, number] = null;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    as_array() {
        let out = this._array || (this._array = [0, 0, 0]);
        out[0] = this.x;
        out[1] = this.y;
        out[2] = this.z;
        return out;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     * @param {number} [z=0] - position of the point on the z axis
     */
    set(x: number = 0, y?: number, z?: number) {
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
     */
    copy(p_b: Vector3Like) {
        this.x = p_b.x;
        this.y = p_b.y;
        this.z = p_b.z;
        return this;
    }

    /**
     * Returns new Vector3 with same value.
     */
    clone() {
        return Vector3.new(this.x, this.y, this.z);
    }
    /**
     * Returns new Vector3 but normalized.
     */
    normalized() {
        return this.clone().normalize();
    }

    linear_interpolate(p_b: Vector3Like, p_t: number, r_out?: Vector3) {
        if (!r_out) r_out = Vector3.new();
        return r_out.set(
            this.x + (p_t * (p_b.x - this.x)),
            this.y + (p_t * (p_b.y - this.y)),
            this.z + (p_t * (p_b.z - this.z))
        );
    }
    cubic_interpolate(p2: Vector3Like, p0: Vector3Like, p3: Vector3Like, t: number, r_out?: Vector3) {
        if (!r_out) r_out = Vector3.new();
        const p1 = this;

        const t2 = t * t;
        const t3 = t2 * t;

        return r_out.set(
            0.5 * ((p1.x * 2) +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            ),
            0.5 * ((p1.y * 2) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            )
        );
    }

    /**
     * Whether this equals to another point
     */
    is_equal_approx(p_b: Vector3Like, eps = CMP_EPSILON) {
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
     */
    exact_equals(p_b: Vector3Like) {
        return (this.x === p_b.x) && (this.y === p_b.y) && (this.z === p_b.z);
    }

    length_squared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
        return Math.hypot(this.x, this.y, this.z);
    }

    /**
     * Add the vector by another vector or number.
     */
    add(x: number | Vector3Like, y?: number, z?: number) {
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
     */
    subtract(x: number | Vector3Like, y?: number, z?: number) {
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
     */
    multiply(x: number | Vector3Like, y?: number, z?: number) {
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

    scale(s: number) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    /**
     * Divide x and y by another vector or number.
     */
    divide(x: number | Vector3Like, y?: number, z?: number) {
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
     */
    dot(p_b: Vector3Like) {
        return this.x * p_b.x + this.y * p_b.y + this.z * p_b.z;
    }

    /**
     * Cross multiply another vector.
     */
    cross(p_b: Vector3Like) {
        return Vector3.new(
            (this.y * p_b.z) - (this.z * p_b.y),
            (this.z * p_b.x) - (this.x * p_b.z),
            (this.x * p_b.y) - (this.y * p_b.x)
        )
    }

    distance_squared_to(p_b: Vector3Like) {
        return (p_b.x - this.x) * (p_b.x - this.x) + (p_b.y - this.y) * (p_b.y - this.y) + (p_b.z - this.z) * (p_b.z - this.z);
    }
    distance_to(p_b: Vector3Like) {
        return Math.hypot(p_b.x - this.x, p_b.y - this.y, p_b.z - this.z);
    }

    /**
     * Change x and y components to their absolute values.
     */
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        return this;
    }

    /**
     * Ceil x and y components.
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);
        return this;
    }

    /**
     * Floor x and y components.
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    /**
     * Round to int vector.
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
        return this;
    }

    /**
     * Negate x and y components.
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Inverse the x and y components.
     */
    inverse() {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        this.z = 1.0 / this.z;
        return this;
    }

    /**
     * Normalize this vector to unit length.
     */
    normalize() {
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

const pool: Vector3[] = [];

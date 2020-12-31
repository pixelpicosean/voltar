import { CMP_EPSILON } from './math_defs';

export interface Vector2Like {
    x: number;
    y: number;
}

/**
 * The Vector2 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export class Vector2 {
    static create(p_x: number = 0, p_y: number = 0) {
        const vec = pool.pop();
        if (!vec) {
            return new Vector2(p_x, p_y);
        } else {
            return vec.set(p_x, p_y);
        }
    }
    static free(vec: Vector2) {
        if (vec && pool.length < 2019) {
            pool.push(vec);
        }
        return Vector2;
    }

    x = 0;
    y = 0;
    _array: [number, number] = [0, 0];

    get width() { return this.x }
    set width(value: number) {
        this.x = value;
    }
    set_width(value: number) {
        this.x = value;
    }

    get height() { return this.y }
    set height(value: number) {
        this.y = value;
    }
    set_height(value: number) {
        this.y = value;
    }

    set_x(value: number) {
        this.x = value;
    }

    set_y(value: number) {
        this.y = value;
    }

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    as_array(r_out?: [number, number]) {
        r_out = r_out || this._array;
        r_out[0] = this.x;
        r_out[1] = this.y;
        return r_out;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param [x] - position of the point on the x axis
     * @param [y] - position of the point on the y axis
     */
    set(x: number, y: number): Vector2 {
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
     */
    copy(p_b: Vector2Like): Vector2 {
        this.x = p_b.x;
        this.y = p_b.y;
        return this;
    }

    /**
     * Returns new Vector2 with same value.
     */
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }
    /**
     * Returns new Vector2 but normalized.
     */
    normalized(): Vector2 {
        return this.clone().normalize();
    }
    /**
     * Returns new Vector2 but clamped.
     */
    clamped(p_length: number): Vector2 {
        const len = this.length();
        const v = this.clone();
        if (len > 0 && p_length < len) {
            v.scale(p_length / len);
        }
        return v;
    }
    /**
     * Returns new Vector2 but rotated.
     */
    rotated(p_rotation: number): Vector2 {
        return this.clone().rotate(p_rotation);
    }

    /**
     * Whether this equals to another point
     */
    equals(p_b: Vector2Like): boolean {
        const a0 = this.x, a1 = this.y;
        const b0 = p_b.x, b1 = p_b.y;
        return (Math.abs(a0 - b0) <= CMP_EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= CMP_EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
    }
    /**
     * Whether this equals to another point(precisely)
     */
    exact_equals(p_b: Vector2Like): boolean {
        return (this.x === p_b.x) && (this.y === p_b.y);
    }

    /**
     * Add the vector by another vector or number.
     */
    add(x: Vector2Like | number, y?: number): Vector2 {
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
     */
    subtract(x: Vector2Like | number, y?: number): Vector2 {
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
     */
    multiply(x: Vector2Like | number, y?: number): Vector2 {
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
     */
    divide(x: Vector2Like | number, y?: number): Vector2 {
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
     */
    dot(p_b: Vector2Like): number {
        return this.x * p_b.x + this.y * p_b.y;
    }

    /**
     * Cross multiply another vector.
     */
    cross(p_b: Vector2Like): number {
        return this.x * p_b.y - this.y * p_b.x;
    }

    /**
     * Change x and y components to their absolute values.
     */
    abs(): Vector2 {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    /**
     * Ceil x and y components.
     */
    ceil(): Vector2 {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    /**
     * Floor x and y components.
     */
    floor(): Vector2 {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    /**
     * Round to int vector.
     */
    round(): Vector2 {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    /**
     * Clamp the vector to specific length.
     */
    clamp(p_length: number): Vector2 {
        const len = this.length();
        if (len > 0 && p_length < len) {
            this.scale(p_length / len);
        }
        return this;
    }

    /**
     * Scale the vector by a number factor.
     */
    scale(b: number): Vector2 {
        this.x *= b;
        this.y *= b;
        return this;
    }

    /**
     * Negate x and y components.
     */
    negate(): Vector2 {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Inverse the x and y components.
     */
    inverse(): Vector2 {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        return this;
    }

    /**
     * Normalize this vector to unit length.
     */
    normalize(): Vector2 {
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
     */
    rotate(p_rotation: number): Vector2 {
        const x = this.x, y = this.y;
        const c = Math.cos(p_rotation), s = Math.sin(p_rotation);
        this.x = x * c - y * s;
        this.y = x * s + y * c;
        return this;
    }

    /**
     * Change this vector to be perpendicular to what it was before. (Effectively
     * roatates it 90 degrees in a clockwise direction)
     */
    perp(): Vector2 {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    /**
     * Returns new Vector2.
     */
    plane_project(p_d: number, p_vec: Vector2) {
        const self = this.clone();
        const vec = p_vec.clone().subtract(self.scale(this.dot(p_vec) - p_d));
        Vector2.free(self);
        return vec;
    }

    /**
     * Project to a vector.
     *
     * @param {Vector2} p_b
     * @returns {Vector2}
     */
    project(p_b: Vector2): Vector2 {
        const amt = this.dot(p_b) / p_b.length_squared();
        this.x = amt * p_b.x;
        this.y = amt * p_b.y;
        return this;
    }

    /**
     * Project to a vector which is already normalized.
     */
    project_n(p_b: Vector2Like): Vector2 {
        const amt = this.dot(p_b);
        this.x = amt * p_b.x;
        this.y = amt * p_b.y;
        return this;
    }

    /**
     * Reflects the vector along the given plane, specified by its normal vector.
     */
    reflect(axis: Vector2): Vector2 {
        const dot = this.dot(axis);
        this.x = 2 * axis.x * dot - this.x;
        this.y = 2 * axis.y * dot - this.y;
        return this;
    }

    /**
     * Bounce returns the vector “bounced off” from the given plane, specified by its normal vector.
     */
    bounce(normal: Vector2): Vector2 {
        return this.reflect(normal).negate()
    }

    /**
     * Slide returns the component of the vector along the given plane, specified by its normal vector.
     */
    slide(normal: Vector2Like): Vector2 {
        return this.subtract(tmp_point.copy(normal).scale(this.dot(normal)))
    }

    /**
     * Returns the length of the vector.
     */
    length(): number {
        const x = this.x;
        const y = this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Returns the squared length of the vector. Prefer this function
     * over “length” if you need to sort vectors or need the squared length for some formula.
     */
    length_squared(): number {
        const x = this.x;
        const y = this.y;
        return x * x + y * y;
    }

    /**
     * Returns the result of atan2 when called with the Vector’s x and y as parameters (Math::atan2(x,y)).
     */
    angle(): number {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Returns the angle in radians between the two vectors.
     */
    angle_to(b: Vector2Like): number {
        return Math.atan2(this.cross(b), this.dot(b));
    }

    angle_to_point(b: Vector2Like): number {
        return Math.atan2(this.y - b.y, this.x - b.x);
    }

    /**
     * Returns the distance to vector “b”.
     */
    distance_to(b: Vector2Like): number {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Returns the squared distance to vector “b”. Prefer this function
     * over “distance_to” if you need to sort vectors or need the squared distance for some formula.
     */
    distance_squared_to(b: Vector2Like): number {
        const x = b.x - this.x;
        const y = b.y - this.y;
        return x * x + y * y;
    }

    /**
     * Returns a perpendicular vector.
     */
    tangent(r_out = Vector2.create()): Vector2 {
        return r_out.set(this.y, -this.x);
    }

    aspect(): number {
        return this.x / this.y;
    }

    is_zero(): boolean {
        return this.x === 0 && this.y === 0;
    }

    /**
     * Returns new Vector2.
     */
    linear_interpolate(p_b: Vector2Like, p_t: number): Vector2 {
        const res = this.clone();

        res.x += (p_t * (p_b.x - this.x));
        res.y += (p_t * (p_b.y - this.y));

        return res;
    }

    /**
     * Returns new Vector2.
     */
    cubic_interpolate(p_b: Vector2, p_pre_a: Vector2, p_post_b: Vector2, p_t: number): Vector2 {
        const t2 = p_t * p_t;
        const t3 = t2 * p_t;
        return Vector2.create(
            0.5 * ((this.x * 2) + (-p_pre_a.x + p_b.x) * p_t + (2 * p_pre_a.x - 5 * this.x + 4 * p_b.x - p_post_b.x) * t2 + (-p_pre_a.x + 3 * this.x - 3 * p_b.x + p_post_b.x) * t3),
            0.5 * ((this.y * 2) + (-p_pre_a.y + p_b.y) * p_t + (2 * p_pre_a.y - 5 * this.y + 4 * p_b.y - p_post_b.y) * t2 + (-p_pre_a.y + 3 * this.y - 3 * p_b.y + p_post_b.y) * t3)
        );
    }

    static ZERO = Object.freeze(new Vector2());
    static ONE = Object.freeze(new Vector2(1, 1));
    static INF = Object.freeze(new Vector2(Infinity, Infinity));
    static LEFT = Object.freeze(new Vector2(-1, 0));
    static RIGHT = Object.freeze(new Vector2(1, 0));
    static UP = Object.freeze(new Vector2(0, -1));
    static DOWN = Object.freeze(new Vector2(0, 1));
}

const pool: Vector2[] = [];

const tmp_point = new Vector2();

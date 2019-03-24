import { CMP_EPSILON } from './const';

/**
 * @interface
 */
export class Vector2Like {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
}

/**
 * The Vector2 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 */
export default class Vector2 {
    /**
     * @param {number} [p_x]
     * @param {number} [p_y]
     */
    static new(p_x = 0, p_y = 0) {
        const vec = pool.pop();
        if (!vec) {
            return new Vector2(p_x, p_y);
        } else {
            return vec.set(p_x, p_y);
        }
    }
    /**
     * @param {Vector2} vec
     */
    static free(vec) {
        if (vec && pool.length < 2019) {
            pool.push(vec);
        }
        return Vector2;
    }

    get width() {
        return this.x;
    }
    /**
     * @param {number} value
     */
    set width(value) {
        this.x = value;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_width(value) {
        this.x = value;
        return this;
    }

    get height() {
        return this.y;
    }
    /**
     * @param {number} value
     */
    set height(value) {
        this.y = value;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_height(value) {
        this.y = value;
        return this;
    }

    /**
     * @param {number} value
     * @returns {this}
     */
    set_x(value) {
        this.x = value;
        return this;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_y(value) {
        this.y = value;
        return this;
    }

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
     * @param {Vector2Like} p_b
     * @returns {Vector2} self for chaining
     */
    copy(p_b) {
        this.x = p_b.x;
        this.y = p_b.y;
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
     * @param {number} p_length
     * @returns {Vector2}
     */
    clamped(p_length) {
        const len = this.length();
        const v = this.clone();
        if (len > 0 && p_length < len) {
            v.scale(p_length / len);
        }
        return v;
    }
    /**
     * Create a rotated vector.
     *
     * @param {number} p_rotation
     * @returns {Vector2}
     */
    rotated(p_rotation) {
        return this.clone().rotate(p_rotation);
    }
    snapped(by) { }

    /**
     * Whether this equals to another point
     *
     * @param {Vector2Like} p_b
     * @returns {boolean}
     */
    equals(p_b) {
        const a0 = this.x, a1 = this.y;
        const b0 = p_b.x, b1 = p_b.y;
        return (Math.abs(a0 - b0) <= CMP_EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= CMP_EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
    }
    /**
     * Whether this equals to another point(precisely)
     *
     * @param {Vector2Like} p_b
     * @returns {boolean}
     */
    exact_equals(p_b) {
        return (this.x === p_b.x) && (this.y === p_b.y);
    }

    /**
     * Add the vector by another vector or number.
     *
     * @param {Vector2Like|number} x
     * @param {number} [y]
     * @returns {this}
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
     * @param {number} [y]
     * @returns {this}
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
     * @param {number} [y]
     * @returns {this}
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
     * @param {number} [y]
     * @returns {this}
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
     * @param {Vector2Like} p_b
     * @returns {number}
     */
    dot(p_b) {
        return this.x * p_b.x + this.y * p_b.y;
    }

    /**
     * Cross multiply another vector.
     *
     * @param {Vector2Like} p_b
     * @returns {number}
     */
    cross(p_b) {
        return this.x * p_b.y - this.y * p_b.x;
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
     * @param {number} p_length
     * @returns {Vector2}
     */
    clamp(p_length) {
        const len = this.length();
        if (len > 0 && p_length < len) {
            this.scale(p_length / len);
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
     * @param {number} p_rotation
     * @returns {Vector2}
     */
    rotate(p_rotation) {
        const x = this.x, y = this.y;
        const c = Math.cos(p_rotation), s = Math.sin(p_rotation);
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
     * @param {number} p_d
     * @param {Vector2} p_vec
     */
    plane_project(p_d, p_vec) {
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
    project(p_b) {
        const amt = this.dot(p_b) / p_b.length_squared();
        this.x = amt * p_b.x;
        this.y = amt * p_b.y;
        return this;
    }

    /**
     * Project to a vector which is already normalized.
     *
     * @param {Vector2Like} p_b
     * @returns {Vector2}
     */
    project_n(p_b) {
        const amt = this.dot(p_b);
        this.x = amt * p_b.x;
        this.y = amt * p_b.y;
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
        return this.reflect(normal).negate()
    }

    /**
     * Slide returns the component of the vector along the given plane, specified by its normal vector.
     *
     * @param {Vector2Like} normal
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
    tangent(r_out = Vector2.new()) {
        return r_out.set(this.y, -this.x);
    }

    is_zero() {
        return this.x === 0 && this.y === 0;
    }

    /**
     * @param {Vector2} p_b
     * @param {number} p_t
     */
    linear_interpolate(p_b, p_t) {
        const res = this.clone();

        res.x += (p_t * (p_b.x - this.x));
        res.y += (p_t * (p_b.y - this.y));

        return res;
    }

    /**
     * @param {Vector2} p_b
     * @param {Vector2} p_pre_a
     * @param {Vector2} p_post_b
     * @param {number} p_t
     */
    cubic_interpolate(p_b, p_pre_a, p_post_b, p_t) {
        const t2 = p_t * p_t;
        const t3 = t2 * p_t;
        return Vector2.new(
            0.5 * ((this.x * 2) + (-p_pre_a.x + p_b.x) * p_t + (2 * p_pre_a.x - 5 * this.x + 4 * p_b.x - p_post_b.x) * t2 + (-p_pre_a.x + 3 * this.x - 3 * p_b.x + p_post_b.x) * t3),
            0.5 * ((this.y * 2) + (-p_pre_a.y + p_b.y) * p_t + (2 * p_pre_a.y - 5 * this.y + 4 * p_b.y - p_post_b.y) * t2 + (-p_pre_a.y + 3 * this.y - 3 * p_b.y + p_post_b.y) * t3)
        );
    }
}
Vector2.ZERO = Object.freeze(new Vector2());
Vector2.ONE = Object.freeze(new Vector2(1, 1));
Vector2.INF = Object.freeze(new Vector2(Infinity, Infinity));
Vector2.LEFT = Object.freeze(new Vector2(-1, 0));
Vector2.RIGHT = Object.freeze(new Vector2(1, 0));
Vector2.UP = Object.freeze(new Vector2(0, -1));
Vector2.DOWN = Object.freeze(new Vector2(0, 1));

/**
 * @type {Vector2[]}
 */
const pool = [];

const tmp_point = new Vector2();

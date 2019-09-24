import { CMP_EPSILON } from './math_defs';


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
export class Vector2 {
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

    get width() { return this._x }
    /**
     * @param {number} value
     */
    set width(value) {
        this._x = value;
        this.callback && this.callback();
    }
    /**
     * @param {number} value
     */
    set_width(value) {
        this._x = value;
        this.callback && this.callback();
    }

    get height() { return this._y }
    /**
     * @param {number} value
     */
    set height(value) {
        this._y = value;
        this.callback && this.callback();
    }
    /**
     * @param {number} value
     */
    set_height(value) {
        this._y = value;
        this.callback && this.callback();
    }

    get x() { return this._x }
    set x(value) {
        this._x = value;
        this.callback && this.callback();
    }
    /**
     * @param {number} value
     */
    set_x(value) {
        this._x = value;
        this.callback && this.callback();
    }

    get y() { return this._y }
    set y(value) {
        this._y = value;
        this.callback && this.callback();
    }
    /**
     * @param {number} value
     */
    set_y(value) {
        this._y = value;
        this.callback && this.callback();
    }

    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {Function} [callback]
     */
    constructor(x = 0, y = 0, callback = null) {
        this._x = x;
        this._y = y;
        this.callback = callback;
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
        this._x = x;
        this._y = y;
        this.callback && this.callback();
        return this;
    }
    /**
     * Copy value from other vector
     *
     * @param {Vector2Like} p_b
     * @returns {Vector2} self for chaining
     */
    copy(p_b) {
        this._x = p_b.x;
        this._y = p_b.y;
        this.callback && this.callback();
        return this;
    }

    /**
     * Clone self
     *
     * @returns {Vector2}
     */
    clone() {
        return new Vector2(this._x, this._y);
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
        const a0 = this._x, a1 = this._y;
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
        return (this._x === p_b.x) && (this._y === p_b.y);
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
            this._x += x.x;
            // @ts-ignore
            this._y += x.y;
        } else {
            // @ts-ignore
            this._x += x;
            // @ts-ignore
            this._y += y;
        }
        this.callback && this.callback();
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
            this._x -= x.x;
            // @ts-ignore
            this._y -= x.y;
        } else {
            // @ts-ignore
            this._x -= x;
            // @ts-ignore
            this._y -= y;
        }
        this.callback && this.callback();
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
            this._x *= x.x;
            // @ts-ignore
            this._y *= x.y;
        } else {
            // @ts-ignore
            this._x *= x;
            // @ts-ignore
            this._y *= y;
        }
        this.callback && this.callback();
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
            this._x /= x.x;
            // @ts-ignore
            this._y /= x.y;
        } else {
            // @ts-ignore
            this._x /= x;
            // @ts-ignore
            this._y /= y;
        }
        this.callback && this.callback();
        return this;
    }

    /**
     * Dot multiply another vector.
     *
     * @param {Vector2Like} p_b
     * @returns {number}
     */
    dot(p_b) {
        return this._x * p_b.x + this._y * p_b.y;
    }

    /**
     * Cross multiply another vector.
     *
     * @param {Vector2Like} p_b
     * @returns {number}
     */
    cross(p_b) {
        return this._x * p_b.y - this._y * p_b.x;
    }

    /**
     * Change x and y components to their absolute values.
     *
     * @returns {Vector2}
     */
    abs() {
        this._x = Math.abs(this._x);
        this._y = Math.abs(this._y);
        this.callback && this.callback();
        return this;
    }

    /**
     * Ceil x and y components.
     *
     * @returns {Vector2}
     */
    ceil() {
        this._x = Math.ceil(this._x);
        this._y = Math.ceil(this._y);
        this.callback && this.callback();
        return this;
    }

    /**
     * Floor x and y components.
     *
     * @returns {Vector2}
     */
    floor() {
        this._x = Math.floor(this._x);
        this._y = Math.floor(this._y);
        this.callback && this.callback();
        return this;
    }

    /**
     * Round to int vector.
     *
     * @returns {Vector2}
     */
    round() {
        this._x = Math.round(this._x);
        this._y = Math.round(this._y);
        this.callback && this.callback();
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
        this._x *= b;
        this._y *= b;
        this.callback && this.callback();
        return this;
    }

    /**
     * Negate x and y components.
     *
     * @returns {Vector2}
     */
    negate() {
        this._x = -this._x;
        this._y = -this._y;
        this.callback && this.callback();
        return this;
    }

    /**
     * Inverse the x and y components.
     *
     * @returns {Vector2}
     */
    inverse() {
        this._x = 1.0 / this._x;
        this._y = 1.0 / this._y;
        this.callback && this.callback();
        return this;
    }

    /**
     * Normalize this vector to unit length.
     *
     * @returns {Vector2}
     */
    normalize() {
        const x = this._x, y = this._y;
        let len = x * x + y * y;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this._x *= len;
            this._y *= len;
        }
        this.callback && this.callback();
        return this;
    }

    /**
     * Rotates the vector by “phi” radians.
     *
     * @param {number} p_rotation
     * @returns {Vector2}
     */
    rotate(p_rotation) {
        const x = this._x, y = this._y;
        const c = Math.cos(p_rotation), s = Math.sin(p_rotation);
        this._x = x * c - y * s;
        this._y = x * s + y * c;
        this.callback && this.callback();
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
        const x = this._x;
        this._x = this._y;
        this._y = -x;
        this.callback && this.callback();
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
        this._x = amt * p_b.x;
        this._y = amt * p_b.y;
        this.callback && this.callback();
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
        this._x = amt * p_b.x;
        this._y = amt * p_b.y;
        this.callback && this.callback();
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
        this._x = 2 * axis.x * dot - this._x;
        this._y = 2 * axis.y * dot - this._y;
        this.callback && this.callback();
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
        const x = this._x;
        const y = this._y;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Returns the squared length of the vector. Prefer this function
     * over “length” if you need to sort vectors or need the squared length for some formula.
     *
     * @returns {number}
     */
    length_squared() {
        const x = this._x;
        const y = this._y;
        return x * x + y * y;
    }

    /**
     * Returns the result of atan2 when called with the Vector’s x and y as parameters (Math::atan2(x,y)).
     *
     * @returns {number}
     */
    angle() {
        return Math.atan2(this._y, this._x);
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
        return Math.atan2(this._y - b.y, this._x - b.x);
    }

    /**
     * Returns the distance to vector “b”.
     *
     * @param {Vector2Like} b
     * @returns {number}
     */
    distance_to(b) {
        const x = b.x - this._x;
        const y = b.y - this._y;
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
        const x = b.x - this._x;
        const y = b.y - this._y;
        return x * x + y * y;
    }

    /**
     * Returns a perpendicular vector.
     *
     * @return {Vector2}
     */
    tangent(r_out = Vector2.new()) {
        return r_out.set(this._y, -this._x);
    }

    aspect() {
        return this._x / this._y;
    }

    is_zero() {
        return this._x === 0 && this._y === 0;
    }

    /**
     * @param {Vector2Like} p_b
     * @param {number} p_t
     */
    linear_interpolate(p_b, p_t) {
        const res = this.clone();

        res.x += (p_t * (p_b.x - this._x));
        res.y += (p_t * (p_b.y - this._y));

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
            0.5 * ((this._x * 2) + (-p_pre_a.x + p_b.x) * p_t + (2 * p_pre_a.x - 5 * this._x + 4 * p_b.x - p_post_b.x) * t2 + (-p_pre_a.x + 3 * this._x - 3 * p_b.x + p_post_b.x) * t3),
            0.5 * ((this._y * 2) + (-p_pre_a.y + p_b.y) * p_t + (2 * p_pre_a.y - 5 * this._y + 4 * p_b.y - p_post_b.y) * t2 + (-p_pre_a.y + 3 * this._y - 3 * p_b.y + p_post_b.y) * t3)
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

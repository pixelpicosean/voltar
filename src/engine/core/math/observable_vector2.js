import Vector2 from './vector2';
import { CMP_EPSILON } from './const';

const tmp_point = new Vector2();

/**
 * The Vector2 object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 * An observable point is a point that triggers a callback when the point's position is changed.
 */
export default class ObservableVector2 {
    get width() {
        return this._x;
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
        return this._y;
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
     * @param {Function} cb - callback when changed
     * @param {object} scope - owner of callback
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    constructor(cb, scope, x = 0, y = 0) {
        this._x = x;
        this._y = y;

        this.cb = cb;
        this.scope = scope;
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
        if (x !== this._x || y !== this._y) {
            this._x = x;
            this._y = y;
            this.cb.call(this.scope);
        }
        return this;
    }

    /**
     * Copies the data from another point
     *
     * @param {import('./vector2').Vector2Like|ObservableVector2} point - point to copy from
     */
    copy(point) {
        if (this._x !== point.x || this._y !== point.y) {
            this._x = point.x;
            this._y = point.y;
            this.cb.call(this.scope);
        }

        return this;
    }

    /**
     * The position of the node on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get x() {
        return this._x;
    }

    set x(value) // eslint-disable-line require-jsdoc
    {
        if (this._x !== value) {
            this._x = value;
            this.cb.call(this.scope);
        }
    }

    /**
     * The position of the node on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get y() {
        return this._y;
    }

    set y(value) // eslint-disable-line require-jsdoc
    {
        if (this._y !== value) {
            this._y = value;
            this.cb.call(this.scope);
        }
    }

    clone() {
        return new Vector2(this._x, this._y);
    }
    random(scale) {
        // TODO: requires random module
    }
    normalized() {
        return this.clone().normalize();
    }
    clamped(length) {
        const len = this.length();
        const v = this.clone();
        if (len > 0 && length < len) {
            this.scale(length / len);
        }
        return v;
    }
    rotated(a) {
        return this.clone().rotate(a);
    }
    snapped(by) { }

    /**
     * @param {import('./vector2').Vector2Like} b
     */
    equals(b) {
        const a0 = this._x, a1 = this._y;
        const b0 = b.x, b1 = b.y;
        return (Math.abs(a0 - b0) <= CMP_EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= CMP_EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
    }
    exact_equals(b) {
        return (this._x === b.x) && (this._y === b.y);
    }

    /**
     * Add the vector by another vector or number.
     *
     * @param {import('./vector2').Vector2Like|number} x
     * @param {import('./vector2').Vector2Like|number} [y]
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
     * @param {import('./vector2').Vector2Like|number} x
     * @param {import('./vector2').Vector2Like|number} [y]
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
     * @param {import('./vector2').Vector2Like|number} x
     * @param {import('./vector2').Vector2Like|number} [y]
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
     * @param {import('./vector2').Vector2Like|number} x
     * @param {import('./vector2').Vector2Like|number} [y]
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
     * @param {import('./vector2').Vector2Like} b
     * @returns {number}
     */
    dot(b) {
        return this._x * b.x + this._y * b.y;
    }
    /**
     * Cross multiply another vector.
     *
     * @param {import('./vector2').Vector2Like} b
     * @returns {number}
     */
    cross(b) {
        return this._x * b.y - this._y * b.x;
    }

    abs() {
        this.x = Math.abs(this._x);
        this.y = Math.abs(this._y);
        return this;
    }
    ceil() {
        this.x = Math.ceil(this._x);
        this.y = Math.ceil(this._y);
        return this;
    }
    floor() {
        this.x = Math.floor(this._x);
        this.y = Math.floor(this._y);
        return this;
    }
    round() {
        this.x = Math.round(this._x);
        this.y = Math.round(this._y);
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

    scale(b) {
        this.x *= b;
        this.y *= b;
        return this;
    }
    negate() {
        this.x = -this._x;
        this.y = -this._y;
        return this;
    }
    inverse() {
        this.x = 1.0 / this._x;
        this.y = 1.0 / this._y;
        return this;
    }
    normalize() {
        const x = this._x, y = this._y;
        let len = x * x + y * y;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x *= len;
            this.y *= len;
        }
        return this;
    }
    rotate(a) {
        const x = this._x, y = this._y;
        const c = Math.cos(a), s = Math.sin(a);
        this.x = x * c - y * s;
        this.y = x * s + y * c;
        return this;
    }
    /**
     * Change this vector to be perpendicular to what it was before. (Effectively
     * roatates it 90 degrees in a clockwise direction)
     * @return {ObservableVector2} Self for chaining.
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
        return vec;
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
        const dot = this.dot(axis);
        this.x = 2 * axis.x * dot - this._x;
        this.y = 2 * axis.y * dot - this._y;
        return this;
    }
    bounce(axis) {
        return this.reflect(axis).negate()
    }
    slide(normal) {
        return this.subtract(tmp_point.copy(normal).scale(this.dot(normal)))
    }

    length() {
        const x = this._x;
        const y = this._y;
        return Math.sqrt(x * x + y * y);
    }
    length_squared() {
        const x = this._x;
        const y = this._y;
        return x * x + y * y;
    }
    angle() {
        return Math.atan2(this._y, this._x);
    }
    angle_to(b) {
        return Math.atan2(this.cross(b), this.dot(b));
    }
    angle_to_point(b) {
        return Math.atan2(this._y - b.y, this._x - b.x);
    }
    distance_to(b) {
        const x = b.x - this._x;
        const y = b.y - this._y;
        return Math.sqrt(x * x + y * y);
    }
    distance_squared_to(b) {
        const x = b.x - this._x;
        const y = b.y - this._y;
        return x * x + y * y;
    }
    tangent() {
        return Vector2.new(this._y, -this._x);
    }

    is_zero() {
        return this._x === 0 && this._y === 0;
    }

    /**
     * @param {Vector2} p_b
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

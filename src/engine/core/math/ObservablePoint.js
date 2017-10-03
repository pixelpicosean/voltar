import Point from './Point';


/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 * An observable point is a point that triggers a callback when the point's position is changed.
 *
 * @class
 * @memberof V
 */
export default class ObservablePoint
{
    /**
     * @param {Function} cb - callback when changed
     * @param {object} scope - owner of callback
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    constructor(cb, scope, x = 0, y = 0)
    {
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
    set(x, y)
    {
        const _x = x || 0;
        const _y = y || ((y !== 0) ? _x : 0);

        if (this._x !== _x || this._y !== _y)
        {
            this._x = _x;
            this._y = _y;
            this.cb.call(this.scope);
        }

        return this;
    }

    /**
     * Copies the data from another point
     *
     * @param {V.Point|V.ObservablePoint} point - point to copy from
     */
    copy(point)
    {
        if (this._x !== point.x || this._y !== point.y)
        {
            this._x = point.x;
            this._y = point.y;
            this.cb.call(this.scope);
        }

        return this;
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get x()
    {
        return this._x;
    }

    set x(value) // eslint-disable-line require-jsdoc
    {
        if (this._x !== value)
        {
            this._x = value;
            this.cb.call(this.scope);
        }
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get y()
    {
        return this._y;
    }

    set y(value) // eslint-disable-line require-jsdoc
    {
        if (this._y !== value)
        {
            this._y = value;
            this.cb.call(this.scope);
        }
    }

    clone() {
        return new Point(this._x, this._y);
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
            v.scale(length / len);
        }
        return v;
    }
    rotated(a) {
        return this.clone().rotate(a);
    }
    snapped(by) {}

    equals(b) {
        const a0 = this._x, a1 = this._y;
        const b0 = b.x, b1 = b.y;
        return (Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
    }
    exact_equals(b) {
        return (this._x === b.x) && (this._y === b.y);
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
        return this._x * b.x + this._y * b.y;
    }
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
     * @method perp
     * @memberof Vector#
     * @return {Vector} Self for chaining.
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
        const x = this._x;
        const y = this._y;
        this.project(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }
    reflect_n(axis) {
        const x = this._x;
        const y = this._y;
        this.project_n(axis).scale(2);
        return this;
    }
    bounce(axis) {
        const x = this._x;
        const y = this._y;
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
        return new Point(this._y, -this._x);
    }
}

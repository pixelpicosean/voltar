import Rectangle from './Rectangle';
import { SHAPES } from '../../const';

/**
 * The Circle object can be used to specify a hit area for displayObjects
 *
 * @class
 */
export default class Circle {
    /**
     * @param {number} [x=0] - The X coordinate of the center of this circle
     * @param {number} [y=0] - The Y coordinate of the center of this circle
     * @param {number} [radius=0] - The radius of the circle
     */
    static new(x, y, radius) {
        return new Circle(x, y, radius);
    }

    get radius() {
        return this._radius * this.scale;
    }
    /**
     * @param {number} value
     */
    set radius(value) {
        this._radius = value;
    }
    /**
     * @param {number} value
     */
    set_radius(value) {
        this.radius = value;
    }

    /**
     * @param {number} value
     */
    set_scale(value) {
        this.scale = value;
        return this;
    }

    /**
     * @param {number} [x=0] - The X coordinate of the center of this circle
     * @param {number} [y=0] - The Y coordinate of the center of this circle
     * @param {number} [radius=0] - The radius of the circle
     */
    constructor(x = 0, y = 0, radius = 0) {
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

        /**
         * @member {number}
         * @default 0
         */
        this._radius = radius;

        this.scale = 1;

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @member {number}
         * @readOnly
         * @default SHAPES.CIRC
         * @see SHAPES
         */
        this.type = SHAPES.CIRC;
    }

    /**
     * Creates a clone of this Circle instance
     *
     * @return {Circle} a copy of the Circle
     */
    clone() {
        return new Circle(this.x, this.y, this.radius);
    }

    /**
     * Checks whether the x and y coordinates given are contained within this circle
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     * @return {boolean} Whether the x/y coordinates are within this Circle
     */
    contains(x, y) {
        if (this.radius <= 0) {
            return false;
        }

        const r2 = this.radius * this.radius;
        let dx = (this.x - x);
        let dy = (this.y - y);

        dx *= dx;
        dy *= dy;

        return (dx + dy <= r2);
    }

    /**
    * Returns the framing rectangle of the circle as a Rectangle object
    *
    * @return {Rectangle} the framing rectangle
    */
    get_bounds() {
        return new Rectangle(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
}

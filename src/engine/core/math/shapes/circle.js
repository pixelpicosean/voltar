import Rectangle from './rectangle';
import { SHAPES } from 'engine/const';

/**
 * The Circle object can be used to specify a hit area for displayObjects
 */
export default class Circle {
    /**
     * @param {number} [x] - The X coordinate of the center of this circle
     * @param {number} [y] - The Y coordinate of the center of this circle
     * @param {number} [radius] - The radius of the circle
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
     * @param {number} [x] - The X coordinate of the center of this circle
     * @param {number} [y] - The Y coordinate of the center of this circle
     * @param {number} [radius] - The radius of the circle
     */
    constructor(x = 0, y = 0, radius = 0) {
        /**
         * @type {number}
         * @default 0
         */
        this.x = x;

        /**
         * @type {number}
         * @default 0
         */
        this.y = y;

        /**
         * @type {number}
         * @default 0
         */
        this._radius = radius;

        this.scale = 1;

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @type {number}
         */
        this.type = SHAPES.CIRC;
    }

    /**
     * Creates a clone of this Circle instance
     */
    clone() {
        return new Circle(this.x, this.y, this.radius);
    }

    /**
     * Checks whether the x and y coordinates given are contained within this circle
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
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
    */
    get_bounds() {
        return new Rectangle(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
}
